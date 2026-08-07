/**
 * Regenerate the Kronospan catalogue from Kronospan's own decor pages.
 *
 *   node scripts/scrape-kronospan.mjs
 *   NODE_USE_ENV_PROXY=1 node scripts/scrape-kronospan.mjs   # behind an HTTP proxy
 *
 * Kronospan matters disproportionately on the Bulgarian market: it manufactures
 * in Veliko Tarnovo and Burgas, so its decors are the shortest lead time
 * available and usually the cost-effective alternative to an equivalent EGGER
 * decor.
 *
 * The decor grid is rendered client-side, but each decor's own page is
 * server-rendered and links to related decors, so this crawls outward from a
 * handful of seeds rather than trying to read the index. Colours are the mean
 * of Kronospan's decor photograph in Oklab — representative for palette maths,
 * never a substitute for a physical sample.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'https://kronospan.com/en_EN';
const OUT = new URL('../src/data/sources/kronospan.generated.ts', import.meta.url);

/** Well-known decors to crawl outward from. */
const SEEDS = [
  ['kronodesign', 'K001'],
  ['kronodesign', 'K003'],
  ['kronodesign', 'K005'],
  ['kronodesign', '8681'],
  ['kronoflooring', 'K326'],
];

const MAX_DECORS = 400;
const CONCURRENCY = 6;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function get(url, as = 'text') {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const detailUrl = (collection, code) => `${BASE}/decors/view/${collection}/${code}/`;
const imageUrl = (collection, code) =>
  `https://kronospan.com/public/thumbs/450x0/decors/${collection}/${code[0]}/${code}_450x0_fit_478b24840a.jpg`;

/* ----------------------------------------------------------------- crawl --- */

console.log('Crawling decor pages…');

const found = new Map(); // `${collection}/${code}` -> { collection, code, name }
const queue = [...SEEDS];
const visited = new Set(queue.map(([c, k]) => `${c}/${k}`));

async function visit([collection, code]) {
  const html = await get(detailUrl(collection, code));

  // "<title>K003 Gold Craft Oak - Kronodesign - Decors - Kronospan …</title>"
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  const match = title.match(/^\s*([A-Z0-9]+)\s+(.+?)\s+-\s/);
  if (match && match[1].toUpperCase() === code.toUpperCase()) {
    found.set(`${collection}/${code}`, {
      collection,
      code,
      name: match[2].trim().replace(/^(NEW!?|NEU!?)\s*/i, ''),
    });
  }

  // Related decors appear as thumbnail paths; follow them.
  for (const [, coll, next] of html.matchAll(
    /\/decors\/(kronodesign|kronoflooring)\/[A-Z0-9]\/([A-Z0-9]+)_\d+x\d+/g,
  )) {
    const key = `${coll}/${next}`;
    if (visited.has(key) || visited.size >= MAX_DECORS) continue;
    visited.add(key);
    queue.push([coll, next]);
  }
}

const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const item = queue.shift();
    try {
      await visit(item);
    } catch {
      // A decor page that 404s is simply not in the range any more.
    }
    if (found.size % 25 === 0) process.stdout.write(`\r  ${found.size} decors, ${queue.length} queued`);
  }
});
await Promise.all(workers);

const decors = [...found.values()];
console.log(`\r  ${decors.length} decors discovered${' '.repeat(20)}`);
if (!decors.length) throw new Error('No decors found — the page layout has changed.');

/* ------------------------------------------------------- colour sampling -- */

console.log('Downloading decor images…');
const downloaded = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (decors.length) {
      const decor = decors.shift();
      try {
        const buf = await get(imageUrl(decor.collection, decor.code), 'buffer');
        downloaded.push({ ...decor, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` });
      } catch {
        // No published image means no defensible colour, so drop the decor.
      }
    }
  }),
);
console.log(`  ${downloaded.length} images downloaded`);

console.log('Sampling colours…');
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage();

const sampled = [];
for (let i = 0; i < downloaded.length; i += 40) {
  sampled.push(...(await page.evaluate(meanColours, downloaded.slice(i, i + 40))));
  process.stdout.write(`\r  ${Math.min(i + 40, downloaded.length)}/${downloaded.length}`);
}
await browser.close();

const withColour = sampled.filter((d) => d.hex);
console.log(`\n  ${withColour.length} sampled`);

/** Mean colour in Oklab — see scripts/scrape-egger.mjs for why not sRGB. */
function meanColours(items) {
  const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

  const toOklab = (r, g, b) => {
    const lr = srgbToLinear(r);
    const lg = srgbToLinear(g);
    const lb = srgbToLinear(b);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };

  const toRgb = ([L, A, B]) => {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [
      linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
  };

  const hex = (rgb) =>
    '#' +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return Promise.all(
    items.map(async ({ dataUrl, ...rest }) => {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('decode failed'));
          img.src = dataUrl;
        });

        const w = (canvas.width = Math.min(140, img.naturalWidth || 140));
        const h = (canvas.height = Math.min(140, img.naturalHeight || 140));
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let L = 0;
        let A = 0;
        let B = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const lab = toOklab(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
          L += lab[0];
          A += lab[1];
          B += lab[2];
          n++;
        }
        if (!n) throw new Error('no pixels');
        return { ...rest, hex: hex(toRgb([L / n, A / n, B / n])) };
      } catch {
        return { ...rest, hex: null };
      }
    }),
  );
}

/* ------------------------------------------------------------ classifying -- */

const SPECIES = [
  'oak', 'walnut', 'pine', 'ash', 'beech', 'birch', 'cherry', 'maple', 'teak',
  'wenge', 'acacia', 'elm', 'larch', 'spruce', 'hickory', 'mahogany',
];

// Word boundaries matter: "Cashmere" must not be classified as ash.
const speciesOf = (name) => SPECIES.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(name));

function classify(name) {
  const n = name.toLowerCase();
  if (speciesOf(name) || /wood|oak|timber|craft|rustic/.test(n)) {
    return { pattern: 'woodgrain', sheen: 'textured' };
  }
  if (/concrete|beton|cement/.test(n)) return { pattern: 'concrete', sheen: 'textured' };
  if (/terrazzo/.test(n)) return { pattern: 'terrazzo', sheen: 'textured' };
  if (/metal|steel|alu|copper|brass|inox|chrom/.test(n)) return { pattern: 'metallic', sheen: 'satin' };
  if (/marble|stone|granite|slate|quartz|onyx|travertin|ceramic|calacatta|marmo/.test(n)) {
    return { pattern: 'stone', sheen: 'matt' };
  }
  if (/linen|fabric|textile|jute|canvas/.test(n)) return { pattern: 'fabric', sheen: 'natural' };
  return { pattern: 'solid', sheen: 'matt' };
}

function tagsFor(name, pattern, hex, collection) {
  const tags = ['bulgaria-stock', pattern === 'solid' ? 'uni' : pattern];
  tags.push(collection === 'kronoflooring' ? 'flooring' : 'mfc');
  const species = speciesOf(name);
  if (species) tags.push(species);

  const sum =
    parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  tags.push(sum > 600 ? 'light' : sum > 330 ? 'mid' : 'dark');
  return tags;
}

/* ---------------------------------------------------------------- emitting -- */

function rowsFor(collection) {
  return withColour
    .filter((d) => d.collection === collection)
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((d) => {
      const { pattern, sheen } = classify(d.name);
      const species = speciesOf(d.name);
      return `  {
    code: ${JSON.stringify(d.code)},
    name: ${JSON.stringify(d.name)},
    hex: ${JSON.stringify(d.hex)},
    pattern: ${JSON.stringify(pattern)},
    sheen: ${JSON.stringify(sheen)},${species ? `\n    species: ${JSON.stringify(species)},` : ''}
    tags: ${JSON.stringify(tagsFor(d.name, pattern, d.hex, collection))},
  },`;
    });
}

const boards = rowsFor('kronodesign');
const floors = rowsFor('kronoflooring');

const file = `// Generated by scripts/scrape-kronospan.mjs — do not edit by hand.
// Source: Kronospan Kronodesign and Krono Original decor pages.
// Regenerate with: node scripts/scrape-kronospan.mjs
//
// \`hex\` is the mean of Kronospan's own decor photograph in Oklab: a
// representative colour for palette maths, not a colour-accurate reproduction.
// Always confirm against a physical sample before specifying.

import { define, type Row } from '../define';
import type { Material } from '../../domain/types';

const BOARDS: Row[] = [
${boards.join('\n')}
];

const FLOORS: Row[] = [
${floors.join('\n')}
];

export const KRONOSPAN_BOARDS: Material[] = define(
  {
    brand: 'Kronospan',
    category: 'board',
    provenance: 'manufacturer-decor',
    surfaces: ['furniture', 'wall', 'worktop', 'accent'],
    collection: 'Kronodesign',
    idPrefix: 'kronospan',
    tags: ['melamine'],
  },
  BOARDS,
);

export const KRONOSPAN_FLOORS: Material[] = define(
  {
    brand: 'Kronospan',
    category: 'laminate-floor',
    provenance: 'manufacturer-decor',
    surfaces: ['floor'],
    collection: 'Krono Original',
    idPrefix: 'kronospan-fl',
    tags: ['laminate', 'plank'],
  },
  FLOORS,
);
`;

writeFileSync(OUT, file);
console.log(`\nWrote ${boards.length} board decors and ${floors.length} flooring decors.`);

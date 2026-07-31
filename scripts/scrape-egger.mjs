/**
 * Regenerate the EGGER catalogue from EGGER's own published data.
 *
 *   node scripts/scrape-egger.mjs
 *   NODE_USE_ENV_PROXY=1 node scripts/scrape-egger.mjs   # behind an HTTP proxy
 *
 * Two things are pulled, and both matter:
 *
 *  1. The decor list from EGGER's interactive Design Wall, which carries the
 *     decor code, texture code, name and — crucially — a photograph of the
 *     actual decor. The representative colour is the mean of that photograph in
 *     Oklab rather than a value typed in by hand, so it reflects what the
 *     surface reads as from across a room. It is still not colour-accurate: it
 *     is a photograph, rendered on your screen. Physical samples stay mandatory.
 *
 *  2. EGGER's own recommended decor combinations, taken from each decor's
 *     detail page. A manufacturer's published pairing beats anything the colour
 *     maths can infer, so the engine weights these heavily.
 *
 * HTTP goes through Node so system proxy settings apply; Chromium is used only
 * to decode images, from data: URLs, so it needs no network of its own.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const WALL = 'https://preview.egger.services/laminatedesignwall/';
const DETAIL = (code, texture) =>
  `https://www.egger.com/en/furniture-interior-design/decors/${code}_${texture.replace(/^ST/i, '')}`;
const OUT = new URL('../src/data/sources/egger.generated.ts', import.meta.url);

const CONCURRENCY = 8;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function get(url, as = 'text') {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
}

/** Run `task` over `items` with bounded concurrency. */
async function pool(items, limit, task) {
  const queue = [...items];
  const out = [];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (queue.length) {
        const item = queue.shift();
        try {
          const result = await task(item);
          if (result) out.push(result);
        } catch {
          // One unreachable decor is not worth failing the whole run over.
        }
      }
    }),
  );
  return out;
}

/* ---------------------------------------------------------------- listing -- */

console.log('Fetching decor list…');
// Decors EGGER has withdrawn are left in the markup inside HTML comments, so
// stripping comments is what keeps this to the currently available range.
const wallHtml = (await get(WALL)).replace(/<!--[\s\S]*?-->/g, '');

const decors = [];
const seen = new Set();
const ITEM = /<img src="grid\/([^"]+)\.jpg">[\s\S]{0,300}?<h4>([^<]+)<\/h4>/g;

for (const [, stem, name] of wallHtml.matchAll(ITEM)) {
  // The image filename is the authoritative code_texture pair; the visible
  // label omits the texture for some decors.
  if (seen.has(stem)) continue;
  seen.add(stem);

  const [code, rawTexture = ''] = stem.split('_');
  if (!code) continue;

  // Some filenames carry an image dimension (`F121_310x310`) rather than a
  // texture code. EGGER textures are ST<n> or a two-letter finish like PM/PG.
  const texture = /^(ST\d+|[A-Z]{2})$/i.test(rawTexture) ? rawTexture.toUpperCase() : '';

  decors.push({
    code,
    // Marketing prefixes belong on a website, not in a finish schedule.
    name: name.trim().replace(/^(NEW!?|NEU!?)\s*/i, ''),
    texture,
    src: new URL(`grid/${stem}.jpg`, WALL).href,
  });
}

console.log(`  ${decors.length} decors listed`);
if (!decors.length) throw new Error('Design Wall markup did not match — the page layout has changed.');

/* -------------------------------------------------------- swatch sampling -- */

console.log('Downloading decor images…');
const downloaded = await pool(decors, CONCURRENCY, async (decor) => {
  const buf = await get(decor.src, 'buffer');
  return { ...decor, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` };
});
console.log(`  ${downloaded.length} images downloaded`);

console.log('Sampling colours…');
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage();

const sampled = [];
// Batched so a very large catalogue does not build one enormous evaluate payload.
for (let i = 0; i < downloaded.length; i += 40) {
  const batch = downloaded.slice(i, i + 40);
  sampled.push(...(await page.evaluate(meanColours, batch.map(({ dataUrl, ...rest }) => ({ ...rest, dataUrl })))));
  process.stdout.write(`\r  ${Math.min(i + 40, downloaded.length)}/${downloaded.length}`);
}
await browser.close();

const withColour = sampled.filter((d) => d.hex);
console.log(`\n  ${withColour.length} sampled, ${sampled.length - withColour.length} failed`);

/**
 * Mean colour of each image in Oklab.
 *
 * Averaged perceptually rather than in raw sRGB: the sRGB mean of a woodgrain
 * skews dark and desaturated because the encoding is non-linear, which is
 * exactly the error that makes a generated palette feel muddy.
 */
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

/* -------------------------------------------------------------- pairings --- */

console.log('Fetching published decor combinations…');
const known = new Set(withColour.map((d) => `${d.code}_${d.texture}`));
const pairs = await pool(withColour, CONCURRENCY, async (decor) => {
  const html = await get(DETAIL(decor.code, decor.texture));
  const self = `${decor.code}_${decor.texture}`;

  const related = [
    ...new Set(
      [...html.matchAll(/\/decors\/([A-Z0-9]+)_([0-9A-Za-z]+)/g)].map(([, code, tex]) => `${code}_ST${tex}`),
    ),
  ]
    .filter((key) => key !== self && known.has(key))
    .slice(0, 6);

  return related.length ? [self, related] : null;
});

console.log(`  ${pairs.length} decors with published combinations`);

/* ------------------------------------------------------------ classifying -- */

function classify(name, code) {
  const n = name.toLowerCase();
  // EGGER's own code prefixes: U/W uni colours, H woodgrains, F material decors.
  switch (code[0].toUpperCase()) {
    case 'H':
      return { pattern: 'woodgrain', sheen: 'textured' };
    case 'F':
      if (/concrete|beton/.test(n)) return { pattern: 'concrete', sheen: 'textured' };
      if (/terrazzo/.test(n)) return { pattern: 'terrazzo', sheen: 'textured' };
      if (/chromix|metal|steel|alu|copper|brass|inox/.test(n)) return { pattern: 'metallic', sheen: 'satin' };
      if (/fabric|textile|linen|jute|canvas|tessina|cotton/.test(n)) return { pattern: 'fabric', sheen: 'natural' };
      return { pattern: 'stone', sheen: 'matt' };
    default:
      return { pattern: 'solid', sheen: 'matt' };
  }
}

const SPECIES = [
  'oak', 'walnut', 'pine', 'ash', 'beech', 'birch', 'cherry', 'maple', 'teak',
  'wenge', 'acacia', 'elm', 'larch', 'spruce', 'hickory', 'mahogany', 'zebrano',
];

// Word boundaries matter: "Cashmere Grey" must not be classified as ash.
const speciesOf = (name) => SPECIES.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(name));

function tagsFor(name, pattern, hex) {
  const tags = ['mfc', 'melamine', pattern === 'solid' ? 'uni' : pattern];
  const species = speciesOf(name);
  if (species) tags.push(species);

  const sum =
    parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  tags.push(sum > 600 ? 'light' : sum > 330 ? 'mid' : 'dark');
  return tags;
}

/* ---------------------------------------------------------------- emitting -- */

const rows = withColour
  .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  .map((d) => {
    const { pattern, sheen } = classify(d.name, d.code);
    const species = speciesOf(d.name);
    return `  {
    code: ${JSON.stringify(d.code)},
    texture: ${JSON.stringify(d.texture)},
    name: ${JSON.stringify(d.name)},
    hex: ${JSON.stringify(d.hex)},
    pattern: ${JSON.stringify(pattern)},
    sheen: ${JSON.stringify(sheen)},${species ? `\n    species: ${JSON.stringify(species)},` : ''}
    tags: ${JSON.stringify(tagsFor(d.name, pattern, d.hex))},
  },`;
  });

const idOf = (key) => `egger-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const pairRows = pairs
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, related]) => `  [${JSON.stringify(idOf(key))}, ${JSON.stringify(related.map(idOf))}],`);

const file = `// Generated by scripts/scrape-egger.mjs — do not edit by hand.
// Source: EGGER Decorative Collection Design Wall and decor detail pages.
// Regenerate with: node scripts/scrape-egger.mjs
//
// \`hex\` is the mean of EGGER's own decor photograph in Oklab. It is a
// representative colour for palette maths, not a colour-accurate reproduction:
// a decor is a printed, textured surface and this is a photograph of it.
// Always confirm against a physical sample before specifying.

import { define, type Row } from '../define';
import type { Material } from '../../domain/types';

const ROWS: Row[] = [
${rows.join('\n')}
];

export const EGGER_DECORS: Material[] = define(
  {
    brand: 'EGGER',
    category: 'board',
    provenance: 'manufacturer-decor',
    surfaces: ['furniture', 'wall', 'worktop', 'accent'],
    collection: 'Decorative Collection',
    idPrefix: 'egger',
    tags: [],
  },
  ROWS,
);

/** Combinations EGGER itself publishes on each decor's page. */
export const EGGER_GENERATED_PAIRINGS: [string, string[]][] = [
${pairRows.join('\n')}
];
`;

writeFileSync(OUT, file);
console.log(`\nWrote ${rows.length} decors and ${pairRows.length} pairings.`);

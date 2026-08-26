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
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { processDecors } from './lib/process-decors.mjs';

const BASE = 'https://kronospan.com/en_EN';
const OUT = new URL('../src/data/sources/kronospan.generated.ts', import.meta.url);
const IMAGE_DIR = fileURLToPath(new URL('../public/decors/kronospan', import.meta.url));
const PUBLIC_PREFIX = 'decors/kronospan';

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

console.log('Building tiles and sampling colours…');
// Rebuilt from scratch each run so withdrawn decors do not linger as orphans.
rmSync(IMAGE_DIR, { recursive: true, force: true });
mkdirSync(IMAGE_DIR, { recursive: true });

const idOfDecor = (d) =>
  `${d.collection === 'kronoflooring' ? 'kronospan-fl' : 'kronospan'}-${d.code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

const processed = await processDecors(
  downloaded.map((d) => ({ id: idOfDecor(d), dataUrl: d.dataUrl })),
  { outDir: IMAGE_DIR, publicPrefix: PUBLIC_PREFIX },
);

const withColour = downloaded
  .map((d) => {
    const r = processed.get(idOfDecor(d));
    return r ? { ...d, hex: r.hex, image: r.image, bytes: r.bytes } : null;
  })
  .filter(Boolean);

const totalBytes = withColour.reduce((sum, d) => sum + d.bytes, 0);
console.log(
  `  ${withColour.length} tiles written, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total ` +
    `(${Math.round(totalBytes / withColour.length / 1024)} KB average)`,
);

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
    image: ${JSON.stringify(d.image)},
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

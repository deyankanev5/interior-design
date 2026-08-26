/**
 * Regenerate the EGGER flooring catalogue from EGGER's own published data.
 *
 *   node scripts/scrape-egger-flooring.mjs
 *   NODE_USE_ENV_PROXY=1 node scripts/scrape-egger-flooring.mjs   # behind a proxy
 *
 * Flooring lives in a different part of EGGER's site from the board decors and
 * has its own sitemap, so it needs its own pass. It is worth the trouble: a
 * floor is the largest single surface in most rooms, and until this existed the
 * catalogue carried nine hand-typed floors with estimated colours and no
 * texture at all — which made the one surface that dominates a scheme the one
 * the tool knew least about.
 *
 * Two details differ from the board scraper and matter:
 *
 *  - The first image on a flooring page is a room scene, not the product. The
 *    plank layup is the second, EGGER's own "Detailed view". Averaging the room
 *    scene would describe the photographer's furniture rather than the floor.
 *
 *  - EGGER publishes the same decor in several plank formats (Classic,
 *    Kingsize, Herringbone). Those are fitting choices, not different decors,
 *    so they collapse to one catalogue entry per decor code.
 *
 * HTTP goes through Node so system proxy settings apply; Chromium is used only
 * to decode images, from data: URLs, so it needs no network of its own.
 */
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { processDecors } from './lib/process-decors.mjs';

/** EGGER's building-products sitemap, which is where flooring is indexed. */
const SITEMAP = 'https://www.egger.com/sitemap/s/pimebp-0.xml';
/** As on the board pages, `country` picks the range; GB serves EGGER's EU range in English. */
const DETAIL = (id) => `https://www.egger.com/en/flooring/decors/${id}?country=GB`;
const IMAGE = (asset) => `https://cdn.egger.com/img/pim/${asset}/original.jpg?width=640&srcext=png`;

const OUT = new URL('../src/data/sources/egger-flooring.generated.ts', import.meta.url);
const IMAGE_DIR = fileURLToPath(new URL('../public/decors/egger-flooring', import.meta.url));
const PUBLIC_PREFIX = 'decors/egger-flooring';

const CONCURRENCY = 8;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'text', attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    if (i) await sleep(500 * 2 ** i);
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45_000) });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
    } catch (err) {
      if (err.fatal) throw err;
      last = err;
    }
  }
  throw last;
}

async function pool(items, limit, task) {
  const queue = [...items];
  const out = [];
  let done = 0;
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
        process.stdout.write(`\r  ${++done}/${items.length}`);
      }
    }),
  );
  process.stdout.write('\n');
  return out;
}

const idOf = (code) => `egger-fl-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/* ---------------------------------------------------------------- listing -- */

console.log('Fetching flooring sitemap…');
const xml = await get(SITEMAP);
const pageIds = [...new Set([...xml.matchAll(/\/en\/flooring\/decors\/(\d+)/g)].map(([, id]) => id))];

console.log(`  ${pageIds.length} flooring pages listed`);
if (pageIds.length < 100) {
  throw new Error(`Sitemap yielded only ${pageIds.length} floors — the URL shape has probably changed.`);
}

/* ------------------------------------------------------------ decor pages -- */

console.log('Fetching flooring pages…');
const pages = await pool(pageIds, CONCURRENCY, async (pageId) => {
  const html = await get(DETAIL(pageId));

  // Titles read `EL1028 Grey Avery Oak`.
  const title = (html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '').split('|')[0].trim();
  const [, code, name] = title.match(/^([A-Z]{2,3}\d+)\s+(.+)$/) ?? [];

  // The range and plank format, e.g. `NatureSense 8/32 Herringbone`.
  const format = html.match(/text-xl text-gray-600[^>]*>([^<]+)</)?.[1]?.trim() ?? '';

  // [0] is the room scene, [1] is EGGER's "Detailed view" of the plank layup.
  const assets = [...new Set([...html.matchAll(/img\/pim\/(\d+\/\d+)\/original\.png/g)].map(([, a]) => a))];
  const asset = assets[1];
  if (!code || !name || !asset) return null;

  return { pageId, code, name, format, asset };
});

console.log(`  ${pages.length} flooring pages parsed`);
if (!pages.length) throw new Error('No flooring page matched — the page layout has changed.');

// One entry per decor. Where a decor is published in several plank formats the
// straight-laid one is the honest default; herringbone is a fitting pattern
// applied to the same board.
const RANK = (format) => (/Classic/i.test(format) ? 0 : /Kingsize|Large|Long/i.test(format) ? 1 : 2);
const byCode = new Map();
for (const page of pages.sort((a, b) => RANK(a.format) - RANK(b.format))) {
  if (!byCode.has(page.code)) byCode.set(page.code, page);
}
const decors = [...byCode.values()];
console.log(`  ${decors.length} distinct flooring decors`);

/* -------------------------------------------------------- swatch sampling -- */

console.log('Downloading plank images…');
const downloaded = await pool(decors, CONCURRENCY, async (decor) => {
  const buf = await get(IMAGE(decor.asset), 'buffer');
  return { ...decor, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` };
});
console.log(`  ${downloaded.length} images downloaded`);

console.log('Building tiles and sampling colours…');
rmSync(IMAGE_DIR, { recursive: true, force: true });
mkdirSync(IMAGE_DIR, { recursive: true });

const { results: processed, rejected } = await processDecors(
  downloaded.map((d) => ({ id: idOf(d.code), dataUrl: d.dataUrl })),
  { outDir: IMAGE_DIR, publicPrefix: PUBLIC_PREFIX },
);

// A floor whose image was rejected is dropped rather than kept with an
// estimated colour: the colour and the texture must come from the same pixels.
const withColour = downloaded
  .map((d) => {
    const r = processed.get(idOf(d.code));
    return r ? { ...d, hex: r.hex, image: r.image, bytes: r.bytes } : null;
  })
  .filter(Boolean);

const totalBytes = withColour.reduce((sum, d) => sum + d.bytes, 0);
console.log(
  `  ${withColour.length} tiles written${rejected.length ? ` (${rejected.length} rejected: ${rejected.join(', ')})` : ''}, ` +
    `${(totalBytes / 1024 / 1024).toFixed(1)} MB total ` +
    `(${Math.round(totalBytes / withColour.length / 1024)} KB average)`,
);

/* ------------------------------------------------------------ classifying -- */

const SPECIES = [
  'oak', 'walnut', 'pine', 'ash', 'beech', 'birch', 'cherry', 'maple', 'teak',
  'wenge', 'acacia', 'elm', 'larch', 'spruce', 'hickory', 'mahogany', 'zebrano',
];
const speciesOf = (name) => SPECIES.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(name));

function patternOf(name) {
  const n = name.toLowerCase();
  if (/concrete|beton|screed|estrich/.test(n)) return 'concrete';
  if (/terrazzo/.test(n)) return 'terrazzo';
  if (/slate|stone|marble|granite|travertine|ceramic|tile/.test(n)) return 'stone';
  return 'woodgrain';
}

function tagsFor(name, format, hex) {
  const tags = ['flooring', 'laminate', patternOf(name)];
  const species = speciesOf(name);
  if (species) tags.push(species);
  if (/herringbone/i.test(format)) tags.push('herringbone');
  else tags.push('plank');

  const sum =
    parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  tags.push(sum > 600 ? 'light' : sum > 330 ? 'mid' : 'dark');
  return tags;
}

/* ---------------------------------------------------------------- emitting -- */

const rows = withColour
  .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  .map((d) => {
    const pattern = patternOf(d.name);
    const species = speciesOf(d.name);
    return `  {
    code: ${JSON.stringify(d.code)},
    name: ${JSON.stringify(d.name)},
    hex: ${JSON.stringify(d.hex)},
    image: ${JSON.stringify(d.image)},
    pattern: ${JSON.stringify(pattern)},${d.format ? `\n    collection: ${JSON.stringify(`EGGER Flooring — ${d.format}`)},` : ''}${species ? `\n    species: ${JSON.stringify(species)},` : ''}
    tags: ${JSON.stringify(tagsFor(d.name, d.format, d.hex))},
  },`;
  });

const file = `// Generated by scripts/scrape-egger-flooring.mjs — do not edit by hand.
// Source: EGGER's building-products sitemap and the flooring decor pages it lists.
// Regenerate with: node scripts/scrape-egger-flooring.mjs
//
// \`hex\` is the mean of EGGER's own plank photograph in Oklab. It is a
// representative colour for palette maths, not a colour-accurate reproduction.
// Always confirm against a physical sample before specifying.

import { define, type Row } from '../define';
import type { Material } from '../../domain/types';

const ROWS: Row[] = [
${rows.join('\n')}
];

export const EGGER_FLOORS: Material[] = define(
  {
    brand: 'EGGER',
    category: 'laminate-floor',
    provenance: 'manufacturer-decor',
    pattern: 'woodgrain',
    sheen: 'textured',
    surfaces: ['floor'],
    collection: 'EGGER Flooring',
    idPrefix: 'egger-fl',
    tags: [],
  },
  ROWS,
);
`;

writeFileSync(OUT, file);
console.log(`\nWrote ${rows.length} flooring decors.`);

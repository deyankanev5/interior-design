/**
 * Regenerate the EGGER catalogue from EGGER's own published data.
 *
 *   node scripts/scrape-egger.mjs
 *   NODE_USE_ENV_PROXY=1 node scripts/scrape-egger.mjs   # behind an HTTP proxy
 *
 * The decor list comes from EGGER's sitemap, not from the interactive Design
 * Wall. The Design Wall is a curated subset — it carries around 218 decors and
 * silently omits whole texture families (ST40 Casella Oak, ST7, ST20, the
 * PerfectSense finishes), which is not something you can tell by looking at it.
 * The sitemap is the index EGGER hands to search engines, so it lists every
 * decor page the site publishes.
 *
 * Three things are taken from each decor's page, and all three matter:
 *
 *  1. The decor name, from the page title, which also confirms the texture code.
 *
 *  2. The decor photograph: EGGER's first page asset is a Cruse flatbed scan of
 *     the board itself, straight-on and evenly lit. The representative colour is
 *     the mean of that scan in Oklab rather than a value typed in by hand, so it
 *     reflects what the surface reads as from across a room. It is still not
 *     colour-accurate — it is a photograph, rendered on your screen. Physical
 *     samples stay mandatory.
 *
 *  3. EGGER's own recommended decor combinations, which the page links as
 *     further decor URLs. A manufacturer's published pairing beats anything the
 *     colour maths can infer, so the engine weights these heavily.
 *
 * HTTP goes through Node so system proxy settings apply; Chromium is used only
 * to decode images, from data: URLs, so it needs no network of its own.
 */
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { processDecors, isBackdropShot } from './lib/process-decors.mjs';

/** EGGER's English decor sitemap, reached from robots.txt via sitemap/index.xml. */
const SITEMAP = 'https://www.egger.com/sitemap/s/pimedp-0.xml';
/**
 * `?country=` decides which range the page serves, and it matters more than it
 * looks. The English site defaults to the US catalogue, which stocks barely a
 * quarter of the decors in the sitemap — request a decor it does not carry and
 * you get a 404, not a smaller page. `GB` serves EGGER's European range in
 * English, which is the range a Bulgarian or EU buyer can actually order.
 */
const DETAIL = (slug) => `https://www.egger.com/en/furniture-interior-design/decors/${slug}?country=GB`;
/**
 * The originals are 3000–8000px Cruse scans at several megabytes each. EGGER's
 * CDN resizes on request, which turns a 5 MB fetch into about 100 KB.
 */
const IMAGE = (asset) => `https://cdn.egger.com/img/pim/${asset}/original.jpg?width=640&srcext=png`;

const OUT = new URL('../src/data/sources/egger.generated.ts', import.meta.url);
const IMAGE_DIR = fileURLToPath(new URL('../public/decors/egger', import.meta.url));
const PUBLIC_PREFIX = 'decors/egger';

const CONCURRENCY = 8;
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with retries. A few hundred requests in a row will get throttled or
 * dropped somewhere along the way, and a decor lost to a transient 503 is a
 * decor silently missing from the catalogue — the exact failure this rewrite
 * exists to fix, so it is worth being patient about.
 */
async function get(url, as = 'text', attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    if (i) await sleep(500 * 2 ** i);
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45_000) });
      // A 404 is an answer, not a failure: that decor is not in this range.
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

/** Run `task` over `items` with bounded concurrency. */
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

/**
 * `H1386_40` -> `ST40`; `U702_PM` -> `PM`; `U702` -> ``.
 *
 * EGGER's URLs carry the surface texture as a bare number for the ST range and
 * as letters for everything else (PerfectSense matt/gloss, Feelwood variants).
 */
function textureOf(slug) {
  const suffix = slug.split('_')[1] ?? '';
  if (!suffix) return '';
  return /^\d+$/.test(suffix) ? `ST${suffix}` : suffix.toUpperCase();
}

/**
 * The catalogue id for a decor slug. This has to agree exactly with what
 * `define()` derives from `code` and `texture`, because the pairing table
 * references materials by id: `H1386_40` -> `egger-h1386-st40`.
 */
const idOf = (slug) => {
  const texture = textureOf(slug);
  return `egger-${`${slug.split('_')[0]}${texture ? `-${texture}` : ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
};

/* ---------------------------------------------------------------- listing -- */

console.log('Fetching decor sitemap…');
const xml = await get(SITEMAP);

// The sitemap covers every language EGGER publishes and repeats each decor once
// per collection, tagged with an `?lci=` token. Only the English path is taken,
// and the query is dropped: the plain URL serves the current collection.
const slugs = [
  ...new Set(
    [...xml.matchAll(/\/furniture-interior-design\/decors\/([A-Za-z0-9]+(?:_[A-Za-z0-9]+)?)[?<]/g)].map(
      ([, slug]) => slug,
    ),
  ),
];

console.log(`  ${slugs.length} decor pages listed`);
if (slugs.length < 300) {
  throw new Error(`Sitemap yielded only ${slugs.length} decors — the URL shape has probably changed.`);
}

/* ------------------------------------------------------------ decor pages -- */

console.log('Fetching decor pages…');
const pages = await pool(slugs, CONCURRENCY, async (slug) => {
  const html = await get(DETAIL(slug));

  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  const code = slug.split('_')[0];
  const texture = textureOf(slug);

  // Titles read `H1386 ST40 Brown Casella Oak | EGGER`, sometimes prefixed
  // `NEW!`. Strip the code and the texture, which the slug already gave us, and
  // keep the name; marketing prefixes belong on a website, not in a finish
  // schedule.
  //
  // The prefixes are matched against the known code and texture rather than by
  // shape. A pattern loose enough to cover `ST40`, `PM`, `R1` and `STG4` — EGGER
  // writes that one both ways — is also loose enough to eat the first word of a
  // real name. Driving it from known values cannot.
  const words = title.split('|')[0].trim().split(/\s+/);
  if (/^(NEW!?|NEU!?)$/i.test(words[0] ?? '')) words.shift();
  if (words[0]?.toUpperCase() === code.toUpperCase()) words.shift();
  if (texture && new RegExp(`^(ST)?${texture.replace(/^ST/, '')}$`, 'i').test(words[0] ?? '')) words.shift();
  const name = words.join(' ').trim();

  // The first PIM asset on the page is the flat decor scan; later ones are
  // room scenes and the thumbnails of recommended pairings.
  const asset = html.match(/img\/pim\/(\d+\/\d+)\/original\.png/)?.[1];
  if (!name || !asset) return null;

  // Every other decor this page links to is a pairing EGGER publishes for it.
  const related = [
    ...new Set([...html.matchAll(/\/decors\/([A-Z0-9]+_[0-9A-Za-z]+)/g)].map(([, s]) => s)),
  ].filter((s) => s !== slug);

  return { slug, code, texture, name, asset, related };
});

console.log(`  ${pages.length} decor pages parsed`);
if (!pages.length) throw new Error('No decor page matched — the page layout has changed.');

/* -------------------------------------------------------- swatch sampling -- */

console.log('Downloading decor scans…');
const downloaded = await pool(pages, CONCURRENCY, async (decor) => {
  const buf = await get(IMAGE(decor.asset), 'buffer');
  return { ...decor, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` };
});
console.log(`  ${downloaded.length} scans downloaded`);

console.log('Building tiles and sampling colours…');
// Rebuilt from scratch each run so withdrawn decors do not linger as orphans.
rmSync(IMAGE_DIR, { recursive: true, force: true });
mkdirSync(IMAGE_DIR, { recursive: true });

const { results: processed, rejected } = await processDecors(
  downloaded.map((d) => ({ id: idOf(d.slug), dataUrl: d.dataUrl })),
  {
    outDir: IMAGE_DIR,
    publicPrefix: PUBLIC_PREFIX,
    // A decor scan is square or tall — a board photographed along its length.
    // Anything markedly landscape is a room scene that got through, and its
    // mean colour would describe the room rather than the decor.
    reject: (m) => isBackdropShot(m) || m.w > m.h * 1.3,
  },
);

// A decor whose image was rejected is dropped entirely rather than kept with an
// estimated colour: the whole point of this pipeline is that the colour and the
// texture come from the same measured pixels.
const withColour = downloaded
  .map((d) => {
    const r = processed.get(idOf(d.slug));
    return r ? { ...d, hex: r.hex, image: r.image, bytes: r.bytes } : null;
  })
  .filter(Boolean);

const totalBytes = withColour.reduce((sum, d) => sum + d.bytes, 0);
console.log(
  `  ${withColour.length} tiles written${rejected.length ? ` (${rejected.length} rejected: ${rejected.join(', ')})` : ''}, ` +
    `${(totalBytes / 1024 / 1024).toFixed(1)} MB total ` +
    `(${Math.round(totalBytes / withColour.length / 1024)} KB average)`,
);

/* -------------------------------------------------------------- pairings --- */

const known = new Set(withColour.map((d) => d.slug));
const pairs = withColour
  .map((d) => [d.slug, d.related.filter((s) => known.has(s)).slice(0, 6)])
  .filter(([, related]) => related.length);

console.log(`${pairs.length} decors with published combinations`);

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
  .sort((a, b) => a.slug.localeCompare(b.slug, undefined, { numeric: true }))
  .map((d) => {
    const { pattern, sheen } = classify(d.name, d.code);
    const species = speciesOf(d.name);
    return `  {
    code: ${JSON.stringify(d.code)},
    texture: ${JSON.stringify(d.texture)},
    name: ${JSON.stringify(d.name)},
    hex: ${JSON.stringify(d.hex)},
    image: ${JSON.stringify(d.image)},
    pattern: ${JSON.stringify(pattern)},
    sheen: ${JSON.stringify(sheen)},${species ? `\n    species: ${JSON.stringify(species)},` : ''}
    tags: ${JSON.stringify(tagsFor(d.name, pattern, d.hex))},
  },`;
  });

const pairRows = pairs
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([slug, related]) => `  [${JSON.stringify(idOf(slug))}, ${JSON.stringify(related.map(idOf))}],`);

const file = `// Generated by scripts/scrape-egger.mjs — do not edit by hand.
// Source: EGGER's decor sitemap and the decor detail pages it lists.
// Regenerate with: node scripts/scrape-egger.mjs
//
// \`hex\` is the mean of EGGER's own decor scan in Oklab. It is a representative
// colour for palette maths, not a colour-accurate reproduction: a decor is a
// printed, textured surface and this is a photograph of it. Always confirm
// against a physical sample before specifying.

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

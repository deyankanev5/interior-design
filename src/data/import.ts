import type { Material, MaterialCategory, Pattern, Sheen, Surface } from '../domain/types';
import { isValidHex, normaliseHex } from '../color/convert';

/**
 * Load a supplier's own decor book.
 *
 * The seed catalogue is a starting point, not a substitute for the ranges a
 * studio actually specifies from. This accepts either JSON or CSV so a decor
 * list exported from a supplier portal, a price list, or a spreadsheet a
 * colleague maintains by hand can all be dropped straight in.
 */

const CATEGORIES: MaterialCategory[] = [
  'board',
  'laminate-floor',
  'wood-floor',
  'vinyl-floor',
  'tile',
  'stone',
  'worktop',
  'paint',
  'textile',
  'metal',
];

const PATTERNS: Pattern[] = ['solid', 'woodgrain', 'stone', 'concrete', 'fabric', 'metallic', 'terrazzo'];
const SHEENS: Sheen[] = ['matt', 'supermatt', 'satin', 'gloss', 'textured', 'natural'];
const SURFACES: Surface[] = ['ceiling', 'wall', 'floor', 'furniture', 'worktop', 'textile', 'accent'];

export interface ImportResult {
  materials: Material[];
  warnings: string[];
}

export const CATALOG_TEMPLATE_CSV = [
  'brand,code,texture,name,hex,category,pattern,sheen,surfaces,collection,species,tags',
  'EGGER,U702,ST9,Cashmere Grey,#CFC9C0,board,solid,matt,furniture|wall|accent,Decorative Collection,,uni|grey',
  'EGGER,H3303,ST10,Natural Hamilton Oak,#BE9A72,board,woodgrain,textured,furniture|wall,Decorative Collection,oak,oak|warm',
  'Kronospan,K001,,White Craft Oak,#D8CCBA,board,woodgrain,textured,furniture|wall,Kronodesign,oak,oak|light',
].join('\n');

export function parseCatalog(text: string, filename = ''): ImportResult {
  const trimmed = text.trim();
  const isJson = filename.endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{');
  return isJson ? fromJson(trimmed) : fromCsv(trimmed);
}

function fromJson(text: string): ImportResult {
  const data = JSON.parse(text) as unknown;
  const rows = Array.isArray(data) ? data : (data as { materials?: unknown[] }).materials;
  if (!Array.isArray(rows)) {
    throw new Error('Expected a JSON array of materials, or an object with a "materials" array.');
  }
  return normalise(rows as Record<string, unknown>[]);
}

function fromCsv(text: string): ImportResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error('That CSV has no data rows.');

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const required = ['brand', 'code', 'name', 'hex'];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length) {
    throw new Error(`CSV is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
  }

  const objects = rows.slice(1).map((cells) => {
    const obj: Record<string, unknown> = {};
    header.forEach((key, i) => {
      obj[key] = cells[i]?.trim() ?? '';
    });
    return obj;
  });

  return normalise(objects);
}

function normalise(rows: Record<string, unknown>[]): ImportResult {
  const warnings: string[] = [];
  const materials: Material[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const line = i + 2;
    const brand = str(row.brand);
    const code = str(row.code);
    const name = str(row.name);
    const rawHex = str(row.hex);

    if (!brand || !code || !name) {
      warnings.push(`Row ${line}: skipped — brand, code and name are all required.`);
      return;
    }
    if (!isValidHex(rawHex)) {
      warnings.push(`Row ${line} (${code}): skipped — "${rawHex}" is not a hex colour.`);
      return;
    }

    const category = pickEnum(str(row.category), CATEGORIES, 'board');
    const surfaces = splitList(row.surfaces)
      .map((s) => pickEnum(s, SURFACES, null))
      .filter((s): s is Surface => s !== null);

    const texture = str(row.texture) || undefined;
    const id = `import-${slug(brand)}-${slug(code)}${texture ? `-${slug(texture)}` : ''}`;
    if (seen.has(id)) {
      warnings.push(`Row ${line} (${code}): skipped — duplicate of an earlier row.`);
      return;
    }
    seen.add(id);

    materials.push({
      id,
      brand,
      code,
      texture,
      name,
      hex: normaliseHex(rawHex),
      category,
      pattern: pickEnum(str(row.pattern), PATTERNS, 'solid'),
      sheen: pickEnum(str(row.sheen), SHEENS, 'matt'),
      surfaces: surfaces.length ? surfaces : defaultSurfacesFor(category),
      collection: str(row.collection) || undefined,
      species: str(row.species) || undefined,
      provenance: 'manufacturer-decor',
      tags: splitList(row.tags),
      lrvMeasured: num(row.lrv),
      url: str(row.url) || undefined,
    });
  });

  if (!materials.length) throw new Error('No usable rows found. Check the column names against the template.');
  return { materials, warnings };
}

function defaultSurfacesFor(category: MaterialCategory): Surface[] {
  switch (category) {
    case 'laminate-floor':
    case 'wood-floor':
    case 'vinyl-floor':
      return ['floor'];
    case 'tile':
      return ['floor', 'wall'];
    case 'paint':
      return ['wall', 'ceiling', 'accent', 'furniture'];
    case 'worktop':
      return ['worktop'];
    case 'textile':
      return ['textile', 'accent'];
    case 'metal':
      return ['accent', 'furniture'];
    case 'stone':
      return ['wall', 'floor', 'worktop'];
    default:
      return ['furniture', 'wall', 'accent'];
  }
}

/** Minimal RFC 4180 reader — handles quoted cells, embedded commas and newlines. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && str(v) !== '' ? n : undefined;
};

function splitList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  return str(v)
    .split(/[|;,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function pickEnum<T extends string>(value: string, allowed: T[], fallback: T): T;
function pickEnum<T extends string>(value: string, allowed: T[], fallback: null): T | null;
function pickEnum<T extends string>(value: string, allowed: T[], fallback: T | null): T | null {
  const v = value.trim().toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

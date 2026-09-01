import type { Material, MaterialCategory, MaterialView, Surface } from '../domain/types';
import { hexToOklch, lrv } from '../color/convert';
import { EGGER, EGGER_PAIRINGS } from './sources/egger';
import { KRONOSPAN } from './sources/kronospan';
import { RAL_CLASSIC } from './sources/ral';
import { GENERIC } from './sources/generic';

const SEED: Material[] = [...EGGER, ...KRONOSPAN, ...RAL_CLASSIC, ...GENERIC];

/** Materials loaded by the user on top of the seed catalogue. */
let userMaterials: Material[] = [];

let cache: MaterialView[] | null = null;
let index: Map<string, MaterialView> | null = null;

function build(): MaterialView[] {
  const seen = new Set<string>();
  const out: MaterialView[] = [];
  // User entries win on id collision, so a studio can correct a seed decor.
  for (const m of [...userMaterials, ...SEED]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push({ ...m, lrv: m.lrvMeasured ?? lrv(m.hex) });
  }
  return out;
}

function ensure(): MaterialView[] {
  if (!cache) {
    cache = build();
    index = new Map(cache.map((m) => [m.id, m]));
  }
  return cache;
}

export function allMaterials(): MaterialView[] {
  return ensure();
}

export function getMaterial(id: string | null | undefined): MaterialView | null {
  if (!id) return null;
  ensure();
  return index!.get(id) ?? null;
}

export function setUserMaterials(materials: Material[]): void {
  userMaterials = materials;
  cache = null;
  index = null;
}

export function userMaterialCount(): number {
  return userMaterials.length;
}

export function materialsFor(surface: Surface, categories: MaterialCategory[]): MaterialView[] {
  return ensure().filter((m) => m.surfaces.includes(surface) && categories.includes(m.category));
}

export function brands(): string[] {
  return [...new Set(ensure().map((m) => m.brand))].sort();
}

/** Full decor reference as a specifier would write it, e.g. `EGGER U702 ST9`. */
export function fullCode(m: Material): string {
  return [m.brand, m.code, m.texture].filter(Boolean).join(' ');
}

export function displayName(m: Material): string {
  return `${m.code}${m.texture ? ` ${m.texture}` : ''} ${m.name}`;
}

/**
 * Tolerant search across code, texture, name, brand and tags.
 *
 * Deliberately forgiving about separators so that `u702`, `U 702`, `h3303 st10`
 * and `natural hamilton` all land on the right decor — specifiers type these
 * from memory or read them off a sample edge.
 *
 * Returns the whole ranked list. Callers that show a fixed number of rows slice
 * it; the browsing grid pages through it, which is why this cannot cap itself.
 */
export function rankMaterials(query: string): MaterialView[] {
  const list = ensure();
  const q = query.trim().toLowerCase();
  if (!q) return list;

  const terms = q.split(/\s+/).filter(Boolean);
  const scored: { m: MaterialView; score: number }[] = [];

  for (const m of list) {
    const code = m.code.toLowerCase().replace(/\s+/g, '');
    const texture = (m.texture ?? '').toLowerCase();
    const haystack = [
      m.code,
      m.texture ?? '',
      m.name,
      m.brand,
      m.collection ?? '',
      m.species ?? '',
      ...m.tags,
    ]
      .join(' ')
      .toLowerCase();
    const compact = haystack.replace(/\s+/g, '');

    let score = 0;
    let matchedAll = true;

    for (const t of terms) {
      const tc = t.replace(/\s+/g, '');
      if (code === tc) score += 100;
      else if (texture === tc) score += 40;
      else if (code.startsWith(tc)) score += 55;
      else if (m.name.toLowerCase().startsWith(t)) score += 35;
      else if (haystack.includes(t)) score += 18;
      else if (compact.includes(tc)) score += 12;
      else {
        matchedAll = false;
        break;
      }
    }

    if (!matchedAll) continue;
    // Nudge real, orderable decors above representative finishes.
    if (m.provenance === 'manufacturer-decor') score += 6;
    else if (m.provenance === 'standard') score += 3;
    if (m.tags.includes('bestseller')) score += 4;
    scored.push({ m, score });
  }

  scored.sort((a, b) => b.score - a.score || a.m.code.localeCompare(b.m.code));
  return scored.map((s) => s.m);
}

export function searchMaterials(query: string, limit = 60): MaterialView[] {
  return rankMaterials(query).slice(0, limit);
}

export interface BrowseQuery {
  query?: string;
  /** Restrict to materials a given surface can legitimately take. */
  surface?: Surface;
  categories?: MaterialCategory[];
  brands?: string[] | null;
  realProductsOnly?: boolean;
  /** Only entries with the supplier's own photograph. */
  withImageOnly?: boolean;
}

/**
 * The full list behind the browsing grid.
 *
 * Unbounded on purpose: the grid loads a page at a time as the user scrolls, so
 * capping here would put a floor under how much of a range they can ever see —
 * and with 753 orderable decors, a 60-row cap hides most of the catalogue.
 */
export function browseMaterials(q: BrowseQuery): MaterialView[] {
  let list = rankMaterials(q.query ?? '');
  if (q.surface) list = list.filter((m) => m.surfaces.includes(q.surface!));
  if (q.categories?.length) list = list.filter((m) => q.categories!.includes(m.category));
  if (q.brands?.length) list = list.filter((m) => q.brands!.includes(m.brand));
  if (q.realProductsOnly) list = list.filter((m) => m.provenance !== 'generic');
  if (q.withImageOnly) list = list.filter((m) => !!m.image);
  return list;
}

const PAIRINGS = new Map(EGGER_PAIRINGS.map((p) => [p.decor, p]));

/** Manufacturer-published pairings, keyed by material id. */
export function pairingsFor(materialId: string): { ids: string[]; note: string } | null {
  const hit = PAIRINGS.get(materialId);
  if (!hit) return null;
  return {
    ids: hit.goesWith,
    note: hit.note ?? 'A combination EGGER publishes for this decor.',
  };
}

export interface CatalogStats {
  total: number;
  byProvenance: Record<string, number>;
  byBrand: Record<string, number>;
}

export function catalogStats(): CatalogStats {
  const list = ensure();
  const byProvenance: Record<string, number> = {};
  const byBrand: Record<string, number> = {};
  for (const m of list) {
    byProvenance[m.provenance] = (byProvenance[m.provenance] ?? 0) + 1;
    byBrand[m.brand] = (byBrand[m.brand] ?? 0) + 1;
  }
  return { total: list.length, byProvenance, byBrand };
}

/** Nearest catalogue entries to a colour, restricted to a candidate pool. */
export function nearestIn(pool: MaterialView[], hex: string, limit = 5): MaterialView[] {
  const t = hexToOklch(hex);
  return pool
    .map((m) => {
      const c = hexToOklch(m.hex);
      const dh = Math.min(Math.abs(c.h - t.h), 360 - Math.abs(c.h - t.h)) / 180;
      // Hue matters less on near-neutral colours, where it is numerically unstable.
      const hueWeight = Math.min(c.C, t.C) * 4;
      return {
        m,
        d: Math.hypot((c.L - t.L) * 1.6, (c.C - t.C) * 2.2, dh * hueWeight),
      };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.m);
}

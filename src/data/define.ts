import type { Material, MaterialCategory, Pattern, Provenance, Sheen, Surface } from '../domain/types';

/**
 * Terse builder for catalogue rows. Keeping the source files declarative makes
 * it obvious what a studio has to change when they load their own decor book.
 */
export interface Row {
  code: string;
  texture?: string;
  name: string;
  hex: string;
  image?: string;
  pattern?: Pattern;
  sheen?: Sheen;
  species?: string;
  surfaces?: Surface[];
  tags?: string[];
  collection?: string;
  lrvMeasured?: number;
  url?: string;
}

export interface Defaults {
  brand: string;
  category: MaterialCategory;
  provenance: Provenance;
  pattern?: Pattern;
  sheen?: Sheen;
  surfaces?: Surface[];
  collection?: string;
  tags?: string[];
  idPrefix: string;
}

export function define(defaults: Defaults, rows: Row[]): Material[] {
  return rows.map((r) => {
    const slug = `${r.code}${r.texture ? `-${r.texture}` : ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return {
      id: `${defaults.idPrefix}-${slug}`,
      brand: defaults.brand,
      code: r.code,
      texture: r.texture,
      name: r.name,
      hex: r.hex.toUpperCase(),
      image: r.image,
      category: defaults.category,
      pattern: r.pattern ?? defaults.pattern ?? 'solid',
      sheen: r.sheen ?? defaults.sheen ?? 'matt',
      surfaces: r.surfaces ?? defaults.surfaces ?? ['furniture'],
      collection: r.collection ?? defaults.collection,
      species: r.species,
      provenance: defaults.provenance,
      tags: [...(defaults.tags ?? []), ...(r.tags ?? [])],
      lrvMeasured: r.lrvMeasured,
      url: r.url,
    };
  });
}

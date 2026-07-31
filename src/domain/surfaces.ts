import type { MaterialCategory, Surface } from './types';

/**
 * Per-surface design envelopes.
 *
 * These are the constraints a specifier applies without thinking about them:
 * ceilings are near-white so they disappear, floors sit darker than walls to
 * ground the room, accents are the only place saturated chroma is welcome at
 * scale. The generator treats them as soft targets, not hard limits, so a
 * deliberately dark wall is still reachable via the `dark` mood.
 */
export interface SurfaceRule {
  /** Preferred Oklab lightness band. */
  L: [number, number];
  /** Preferred OkLCh chroma band. */
  C: [number, number];
  /** Share of visible area this surface typically occupies (60-30-10 weighting). */
  areaWeight: number;
  /** Categories a slot of this surface may be filled from. */
  categories: MaterialCategory[];
  description: string;
}

export const SURFACE_RULES: Record<Surface, SurfaceRule> = {
  ceiling: {
    L: [0.9, 0.99],
    C: [0, 0.03],
    areaWeight: 0.2,
    categories: ['paint'],
    description: 'Near-white, minimal chroma. Keeps the room feeling taller and bounces daylight.',
  },
  wall: {
    L: [0.66, 0.95],
    C: [0.005, 0.07],
    areaWeight: 1,
    categories: ['paint', 'board', 'tile', 'stone'],
    description: 'The dominant field. Low chroma at this scale; the colour reads far stronger on 20 m² than on a chip.',
  },
  floor: {
    L: [0.3, 0.72],
    C: [0.01, 0.09],
    areaWeight: 0.85,
    categories: ['laminate-floor', 'wood-floor', 'vinyl-floor', 'tile', 'stone'],
    description: 'Grounds the scheme. Normally the darkest large surface and the hardest element to change later.',
  },
  furniture: {
    L: [0.22, 0.88],
    C: [0.005, 0.11],
    areaWeight: 0.5,
    categories: ['board', 'wood-floor', 'stone', 'paint', 'metal'],
    description: 'Carcases and fronts. Where decorative boards and veneers live.',
  },
  worktop: {
    L: [0.25, 0.9],
    C: [0.005, 0.06],
    areaWeight: 0.15,
    categories: ['worktop', 'stone', 'board'],
    description: 'A narrow, eye-level band. Reads as a line, so contrast against the fronts matters more than its own colour.',
  },
  textile: {
    L: [0.25, 0.85],
    C: [0.01, 0.14],
    areaWeight: 0.35,
    categories: ['textile', 'paint'],
    description: 'Upholstery, curtains, rugs. Carries more chroma than any hard surface can.',
  },
  accent: {
    L: [0.3, 0.78],
    C: [0.07, 0.25],
    areaWeight: 0.1,
    categories: ['paint', 'board', 'textile', 'tile', 'metal', 'stone'],
    description: 'The 10%. One saturated note — joinery detail, a door, a chair, tapware.',
  },
};

/**
 * Default surface assignment for a palette of n slots, in the order a room is
 * normally specified: the big fields first, detail last.
 */
export function defaultSurfaces(count: number): Surface[] {
  const ladder: Surface[] = [
    'wall',
    'floor',
    'furniture',
    'accent',
    'textile',
    'worktop',
    'ceiling',
  ];
  const out: Surface[] = [];
  for (let i = 0; i < count; i++) {
    out.push(ladder[i % ladder.length]);
  }
  // Two slots is a material pairing study, not a room; keep it wall + floor.
  if (count === 2) return ['wall', 'floor'];
  if (count === 3) return ['wall', 'floor', 'furniture'];
  return out.slice(0, count);
}

/**
 * Pairs the analyser checks for readable separation. A room where the floor and
 * the joinery are 3% apart in lightness looks like a printing error.
 */
export const ADJACENCY_CHECKS: [Surface, Surface][] = [
  ['wall', 'floor'],
  ['wall', 'furniture'],
  ['floor', 'furniture'],
  ['furniture', 'worktop'],
  ['wall', 'ceiling'],
];

export function categoriesFor(surface: Surface): MaterialCategory[] {
  return SURFACE_RULES[surface].categories;
}

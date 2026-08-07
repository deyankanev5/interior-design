import type { MaterialView, Palette, Slot } from '../../domain/types';
import { SURFACE_RULES, categoriesFor } from '../../domain/surfaces';
import { hexToOklch } from '../../color/convert';
import { materialsFor, nearestIn } from '../../data/catalog';
import type { ExtractedColour } from './extract';

/**
 * Map colours pulled out of a reference image onto the palette's slots.
 *
 * A moodboard does not label which colour is the floor, so the assignment is
 * driven by the surface envelopes: the extracted colour whose lightness and
 * chroma best fit "floor" becomes the floor. Large-area colours are preferred
 * for large-area surfaces, and the most saturated minority colour is steered to
 * the accent — which is almost always what the image was chosen for.
 */
export interface ApplyOptions {
  /** Bind each slot to the nearest real product instead of a free colour. */
  snapToMaterials: boolean;
  brands?: string[] | null;
  realProductsOnly?: boolean;
}

export function applyExtraction(
  palette: Palette,
  colours: ExtractedColour[],
  options: ApplyOptions = { snapToMaterials: true },
): Palette {
  if (!colours.length) return palette;

  const open = palette.slots.map((s, i) => ({ s, i })).filter((x) => !x.s.locked);
  if (!open.length) return palette;

  const available = [...colours];
  const slots: Slot[] = palette.slots.map((s) => ({ ...s }));

  // Accent first: it is the most specific requirement, so it gets first refusal
  // on the image's saturated minority colour.
  const order = [...open].sort((a, b) => rank(a.s.surface) - rank(b.s.surface));

  for (const { s, i } of order) {
    if (!available.length) break;
    const rule = SURFACE_RULES[s.surface];

    let bestIdx = 0;
    let bestFit = -Infinity;
    for (let c = 0; c < available.length; c++) {
      const fit = fitness(available[c], rule, s.surface === 'accent');
      if (fit > bestFit) {
        bestFit = fit;
        bestIdx = c;
      }
    }

    const [chosen] = available.splice(bestIdx, 1);
    slots[i] = { ...slots[i], hex: chosen.hex, materialId: null };

    if (options.snapToMaterials) {
      let pool: MaterialView[] = materialsFor(s.surface, categoriesFor(s.surface));
      if (options.brands?.length) pool = pool.filter((m) => options.brands!.includes(m.brand));
      if (options.realProductsOnly) pool = pool.filter((m) => m.provenance !== 'generic');
      const match = nearestIn(pool, chosen.hex, 1)[0];
      if (match) slots[i] = { ...slots[i], materialId: match.id, hex: match.hex };
    }
  }

  return { ...palette, slots };
}

function rank(surface: Slot['surface']): number {
  const order: Record<Slot['surface'], number> = {
    accent: 0,
    floor: 1,
    wall: 2,
    furniture: 3,
    worktop: 4,
    textile: 5,
    ceiling: 6,
  };
  return order[surface];
}

/** How well an extracted colour suits a surface envelope. */
function fitness(
  colour: ExtractedColour,
  rule: { L: [number, number]; C: [number, number]; areaWeight: number },
  isAccent: boolean,
): number {
  const { L, C } = hexToOklch(colour.hex);

  const lFit = 1 - bandDistance(L, rule.L) * 3;
  const cFit = 1 - bandDistance(C, rule.C) * 6;

  // A surface that covers a lot of the room should take a colour that covered a
  // lot of the reference image.
  const areaFit = 1 - Math.abs(colour.share - rule.areaWeight * 0.35) * 1.2;

  // The accent wants the punchiest colour in the image, however little of it there is.
  const accentBonus = isAccent ? C * 8 - colour.share * 1.5 : 0;

  return lFit * 1.2 + cFit + areaFit * 0.7 + accentBonus;
}

function bandDistance(v: number, [lo, hi]: [number, number]): number {
  if (v < lo) return lo - v;
  if (v > hi) return v - hi;
  return 0;
}

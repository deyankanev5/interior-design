/** Core domain model: materials, surfaces, palettes. */

/**
 * Where a material can legitimately go in a room. A decorative board is fine on
 * furniture and wall panelling but must never be proposed as a floor; the
 * generator relies on this to stay physically sensible.
 */
export type Surface =
  | 'ceiling'
  | 'wall'
  | 'floor'
  | 'furniture'
  | 'worktop'
  | 'textile'
  | 'accent';

export const SURFACES: Surface[] = [
  'ceiling',
  'wall',
  'floor',
  'furniture',
  'worktop',
  'textile',
  'accent',
];

export const SURFACE_LABEL: Record<Surface, string> = {
  ceiling: 'Ceiling',
  wall: 'Wall',
  floor: 'Floor',
  furniture: 'Furniture',
  worktop: 'Worktop',
  textile: 'Textile',
  accent: 'Accent',
};

/** Product family, drives which supplier catalogues a slot can draw from. */
export type MaterialCategory =
  | 'board' // melamine-faced chipboard / MDF, laminate panels
  | 'laminate-floor'
  | 'wood-floor'
  | 'vinyl-floor'
  | 'tile'
  | 'stone'
  | 'worktop'
  | 'paint'
  | 'textile'
  | 'metal';

export const CATEGORY_LABEL: Record<MaterialCategory, string> = {
  board: 'Decorative board',
  'laminate-floor': 'Laminate flooring',
  'wood-floor': 'Wood flooring',
  'vinyl-floor': 'Vinyl / LVT',
  tile: 'Tile',
  stone: 'Stone / mineral',
  worktop: 'Worktop',
  paint: 'Paint',
  textile: 'Textile',
  metal: 'Metal',
};

/**
 * Visual character of the surface. The generator uses this to avoid palettes
 * that are all woodgrain or all flat colour, which is the single most common
 * way an otherwise-correct colour scheme still looks wrong in a room.
 */
export type Pattern = 'solid' | 'woodgrain' | 'stone' | 'concrete' | 'fabric' | 'metallic' | 'terrazzo';

export const PATTERN_LABEL: Record<Pattern, string> = {
  solid: 'Uni / solid',
  woodgrain: 'Woodgrain',
  stone: 'Stone / marble',
  concrete: 'Concrete',
  fabric: 'Fabric',
  metallic: 'Metallic',
  terrazzo: 'Terrazzo',
};

export type Sheen = 'matt' | 'supermatt' | 'satin' | 'gloss' | 'textured' | 'natural';

/** How much we trust the on-screen colour of a catalogue entry. */
export type Provenance =
  | 'manufacturer-decor' // real, currently published decor code from the supplier's range
  | 'standard' // a published colour standard (RAL, NCS)
  | 'generic'; // a representative finish, not a specific purchasable SKU

export interface Material {
  id: string;
  brand: string;
  /** Supplier decor / colour code, e.g. `U702`, `H3303`, `RAL 7016`. */
  code: string;
  /** Surface texture code where the supplier uses one, e.g. Egger `ST9`. */
  texture?: string;
  name: string;
  /** Approximate on-screen colour. Never a substitute for a physical sample. */
  hex: string;
  category: MaterialCategory;
  pattern: Pattern;
  sheen: Sheen;
  /** Surfaces this material may be applied to. */
  surfaces: Surface[];
  collection?: string;
  /** Wood species / stone type, used to keep timber tones consistent. */
  species?: string;
  provenance: Provenance;
  tags: string[];
  /** Manufacturer-published LRV where known; otherwise derived from `hex`. */
  lrvMeasured?: number;
  url?: string;
}

/** A material as displayed, with derived colour metrics attached. */
export interface MaterialView extends Material {
  lrv: number;
}

export type SlotSource = 'material' | 'colour';

export interface Slot {
  id: string;
  surface: Surface;
  locked: boolean;
  /** Effective colour of the slot — always present, even for material slots. */
  hex: string;
  /** Set when the slot is bound to a real product rather than a free colour. */
  materialId: string | null;
  /** User-supplied note, e.g. "client already owns this sofa". */
  note?: string;
}

export type HarmonyScheme =
  | 'auto'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'monochromatic'
  | 'neutral-accent'
  | 'earthy'
  | 'nordic';

export const SCHEME_LABEL: Record<HarmonyScheme, string> = {
  auto: 'Auto',
  analogous: 'Analogous',
  complementary: 'Complementary',
  'split-complementary': 'Split complementary',
  triadic: 'Triadic',
  monochromatic: 'Monochromatic',
  'neutral-accent': 'Neutral + accent',
  earthy: 'Earthy / warm',
  nordic: 'Nordic / cool',
};

export const SCHEME_HINT: Record<HarmonyScheme, string> = {
  auto: 'Let the engine pick a scheme that suits the locked materials.',
  analogous: 'Neighbouring hues. Calm, low-risk, reads as one family.',
  complementary: 'Opposite hues. High energy — keep one side small.',
  'split-complementary': 'Opposite hue split in two. Contrast without the clash.',
  triadic: 'Three evenly spaced hues. Playful; needs disciplined proportions.',
  monochromatic: 'One hue, varied lightness and chroma. Quiet and architectural.',
  'neutral-accent': 'Greys and beiges carrying a single saturated accent.',
  earthy: 'Warm ochres, clay, timber. The dominant EU residential look.',
  nordic: 'Cool light greys, pale oak, muted blue-greens.',
};

/** Bias applied on top of the harmony scheme. */
export type Mood = 'any' | 'warm' | 'cool' | 'muted' | 'bold' | 'light' | 'dark';

export const MOOD_LABEL: Record<Mood, string> = {
  any: 'No bias',
  warm: 'Warm',
  cool: 'Cool',
  muted: 'Muted',
  bold: 'Bold',
  light: 'Light & airy',
  dark: 'Dark & moody',
};

export interface Palette {
  slots: Slot[];
  scheme: HarmonyScheme;
  mood: Mood;
  /** Scheme actually used by the last generation when `scheme` was `auto`. */
  resolvedScheme?: HarmonyScheme;
}

export interface SavedPalette {
  id: string;
  name: string;
  createdAt: number;
  palette: Palette;
}

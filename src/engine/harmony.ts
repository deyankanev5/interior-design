import type { HarmonyScheme, Mood, Surface } from '../domain/types';
import { SURFACE_RULES } from '../domain/surfaces';
import { clamp } from '../color/convert';

/**
 * Hue offsets, in degrees from the dominant hue, that each scheme is allowed to
 * use. The first entry is always 0 — the dominant hue itself — because every
 * scheme is built outward from one anchor.
 */
const SCHEME_OFFSETS: Record<Exclude<HarmonyScheme, 'auto'>, number[]> = {
  analogous: [0, 22, -22, 40, -40],
  complementary: [0, 180, 12, -12, 190],
  'split-complementary': [0, 150, 210, 18, -18],
  triadic: [0, 120, 240, 15, -15],
  monochromatic: [0, 6, -6, 10, -10],
  'neutral-accent': [0, 0, 0, 180, 0],
  earthy: [0, 18, -14, 34, 200],
  nordic: [0, -16, 14, 190, -30],
};

/** Hue families a scheme prefers to start from, in degrees (Oklab hue). */
const SCHEME_BASE_HUES: Partial<Record<HarmonyScheme, [number, number]>> = {
  earthy: [40, 85], // ochre → clay → olive
  nordic: [200, 265], // cool blue-grey
};

export function schemeOffsets(scheme: Exclude<HarmonyScheme, 'auto'>): number[] {
  return SCHEME_OFFSETS[scheme];
}

/** Mood shifts applied on top of the surface envelope. */
export interface MoodBias {
  /** Multiplier on target chroma. */
  chroma: number;
  /** Additive shift on target lightness. */
  lightness: number;
  /** Preferred hue band; targets are pulled toward it. */
  hueBand?: [number, number];
  /** How strongly to pull toward `hueBand`, 0..1. */
  huePull: number;
}

export const MOOD_BIAS: Record<Mood, MoodBias> = {
  any: { chroma: 1, lightness: 0, huePull: 0 },
  warm: { chroma: 1.05, lightness: 0.01, hueBand: [30, 95], huePull: 0.45 },
  cool: { chroma: 1, lightness: 0, hueBand: [180, 280], huePull: 0.45 },
  muted: { chroma: 0.55, lightness: 0.02, huePull: 0 },
  bold: { chroma: 1.85, lightness: -0.02, huePull: 0 },
  light: { chroma: 0.8, lightness: 0.1, huePull: 0 },
  dark: { chroma: 0.95, lightness: -0.16, huePull: 0 },
};

export interface Target {
  L: number;
  C: number;
  h: number;
}

/**
 * Resolve the target colour for one slot.
 *
 * The surface envelope decides the broad band (a floor is not a ceiling), the
 * scheme decides the hue, the mood nudges both, and `position` spreads slots
 * that share a surface so a five-slot palette does not return five near-identical
 * greys.
 */
export function targetFor(
  surface: Surface,
  hue: number,
  mood: Mood,
  position: number,
  jitter = 0,
): Target {
  const rule = SURFACE_RULES[surface];
  const bias = MOOD_BIAS[mood];

  const spread = position % 1;
  const [lo, hi] = rule.L;
  let L = lo + (hi - lo) * (0.35 + spread * 0.5) + bias.lightness + jitter * 0.06;

  const [clo, chi] = rule.C;
  let C = (clo + (chi - clo) * (0.4 + spread * 0.45)) * bias.chroma + jitter * 0.012;

  let h = hue;
  if (bias.hueBand && bias.huePull > 0) {
    const centre = (bias.hueBand[0] + bias.hueBand[1]) / 2;
    h = pullHue(h, centre, bias.huePull);
  }

  return {
    L: clamp(L, 0.06, 0.985),
    C: Math.max(0, C),
    h: ((h % 360) + 360) % 360,
  };
}

/** Move `hue` a fraction `t` of the way toward `toward`, the short way round. */
export function pullHue(hue: number, toward: number, t: number): number {
  let d = ((toward - hue + 540) % 360) - 180;
  return hue + d * t;
}

/**
 * Pick a scheme when the user leaves it on Auto.
 *
 * If the locked materials already carry real chroma, we build around them
 * rather than fighting them; near-neutral anchors get a neutral-plus-accent
 * treatment, which is what most residential joinery schemes actually are.
 */
export function chooseScheme(anchorChromas: number[], mood: Mood): Exclude<HarmonyScheme, 'auto'> {
  const maxC = anchorChromas.length ? Math.max(...anchorChromas) : 0;

  if (mood === 'warm') return 'earthy';
  if (mood === 'cool') return 'nordic';
  if (mood === 'bold') return pick(['complementary', 'split-complementary', 'triadic']);
  if (mood === 'muted') return pick(['analogous', 'monochromatic', 'neutral-accent']);

  if (maxC < 0.035) return pick(['neutral-accent', 'monochromatic', 'analogous']);
  if (maxC < 0.08) return pick(['analogous', 'neutral-accent', 'split-complementary']);
  return pick(['analogous', 'split-complementary', 'complementary']);
}

export function baseHueFor(scheme: Exclude<HarmonyScheme, 'auto'>, fallback: number): number {
  const band = SCHEME_BASE_HUES[scheme];
  if (!band) return fallback;
  return band[0] + Math.random() * (band[1] - band[0]);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------------------------------------------------------- the accent -- */

/**
 * How an accent relates to the dominant hue, and what that relationship does to
 * a room.
 *
 * The accent is the only place in a scheme where saturated colour is welcome at
 * full strength, precisely because it occupies so little area. Its job is to
 * give the room a point of focus and to declare the scheme's intent — the same
 * greige walls read as "warm minimal" next to brushed brass and as "coastal"
 * next to petrol blue. Everything else in the palette is then tuned *around*
 * that decision: large surfaces drop chroma so they do not compete, and their
 * undertones are pulled into a defined relationship with the accent hue rather
 * than drifting to some unrelated third hue, which is what makes a scheme look
 * muddy.
 */
export type AccentRelation =
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'analogous'
  | 'tonal';

export interface AccentModel {
  relation: AccentRelation;
  /** Hue offset from the dominant, in degrees. */
  offset: number;
  /** Target chroma multiplier relative to the largest surface. */
  chromaRatio: number;
  /** Recommended share of visible surface area, 0..1. */
  areaShare: number;
  headline: string;
  effect: string;
}

export const ACCENT_MODELS: Record<AccentRelation, Omit<AccentModel, 'offset'>> = {
  complementary: {
    relation: 'complementary',
    chromaRatio: 6,
    areaShare: 0.07,
    headline: 'Maximum tension',
    effect:
      'Opposite the dominant hue, so it reads as a deliberate event. Keep it under ~8% of visible surface and let the large fields sit near-neutral, or the room starts to vibrate.',
  },
  'split-complementary': {
    relation: 'split-complementary',
    chromaRatio: 5,
    areaShare: 0.09,
    headline: 'Contrast without the clash',
    effect:
      'Almost as much separation as a straight complement but far more forgiving in artificial light. The safest high-contrast accent for a residential scheme.',
  },
  triadic: {
    relation: 'triadic',
    chromaRatio: 4.5,
    areaShare: 0.08,
    headline: 'Playful, needs discipline',
    effect:
      'Reads as intentional colour, not as a mistake, only if the two non-dominant hues stay small and unequal. Give one clearly more area than the other.',
  },
  analogous: {
    relation: 'analogous',
    chromaRatio: 3,
    areaShare: 0.12,
    headline: 'Emphasis rather than contrast',
    effect:
      'A neighbouring hue at higher chroma. Lifts the scheme without breaking it, so it tolerates a larger area — good where the accent is joinery rather than an object.',
  },
  tonal: {
    relation: 'tonal',
    chromaRatio: 2.2,
    areaShare: 0.15,
    headline: 'Quiet, architectural',
    effect:
      'The dominant hue pushed darker and more saturated. Carries a scheme where texture, not colour, is doing the work — the usual answer for a small or north-facing room.',
  },
};

export function accentModelFor(scheme: Exclude<HarmonyScheme, 'auto'>): AccentModel {
  const map: Record<Exclude<HarmonyScheme, 'auto'>, [AccentRelation, number]> = {
    analogous: ['analogous', 35],
    complementary: ['complementary', 180],
    'split-complementary': ['split-complementary', 155],
    triadic: ['triadic', 120],
    monochromatic: ['tonal', 0],
    'neutral-accent': ['complementary', 180],
    earthy: ['analogous', 40],
    nordic: ['split-complementary', 165],
  };
  const [relation, offset] = map[scheme];
  return { ...ACCENT_MODELS[relation], offset };
}

import type { HarmonyScheme, Palette, Slot } from '../domain/types';
import { SURFACE_LABEL } from '../domain/types';
import { ADJACENCY_CHECKS, SURFACE_RULES } from '../domain/surfaces';
import { deltaEOk, hexToOklch, hueDistance, lrv, meanHue } from '../color/convert';
import { accentModelFor, schemeOffsets } from './harmony';
import { getMaterial } from '../data/catalog';

export type Verdict = 'good' | 'watch' | 'poor';

export interface Check {
  id: string;
  label: string;
  /** 0..1 */
  score: number;
  verdict: Verdict;
  detail: string;
}

export interface PaletteReport {
  /** 0..100 */
  total: number;
  checks: Check[];
}

const verdictOf = (s: number): Verdict => (s >= 0.75 ? 'good' : s >= 0.5 ? 'watch' : 'poor');

interface SlotInfo {
  slot: Slot;
  L: number;
  C: number;
  h: number;
  area: number;
}

function info(slots: Slot[]): SlotInfo[] {
  return slots.map((slot) => {
    const { L, C, h } = hexToOklch(slot.hex);
    return { slot, L, C, h, area: SURFACE_RULES[slot.surface].areaWeight };
  });
}

/** Dominant hue of a palette: chroma-weighted circular mean of its large surfaces. */
export function dominantHue(slots: Slot[]): { hue: number; chroma: number } {
  const s = info(slots);
  const samples = s
    .filter((x) => x.C > 0.012)
    .map((x) => ({ h: x.h, weight: x.C * x.area }));
  if (!samples.length) return { hue: 0, chroma: 0 };
  const total = samples.reduce((a, b) => a + b.weight, 0);
  return { hue: meanHue(samples), chroma: total / samples.length };
}

/* ------------------------------------------------------------------ checks -- */

function checkHarmony(slots: Slot[], scheme: Exclude<HarmonyScheme, 'auto'>): Check {
  const s = info(slots).filter((x) => x.C > 0.02);
  if (s.length < 2) {
    return {
      id: 'harmony',
      label: 'Hue harmony',
      score: 0.85,
      verdict: 'good',
      detail: 'Effectively a neutral scheme — hue relationships are not doing the work here; lightness and texture are.',
    };
  }

  const { hue } = dominantHue(slots);
  const allowed = schemeOffsets(scheme);
  let worst = 0;
  let sum = 0;

  for (const x of s) {
    const rel = ((x.h - hue + 540) % 360) - 180;
    const dev = Math.min(...allowed.map((o) => Math.abs(((rel - o + 540) % 360) - 180)));
    worst = Math.max(worst, dev);
    // 25° of drift is still comfortably "on scheme"; 60° is a different hue.
    sum += Math.max(0, 1 - dev / 60);
  }

  const score = sum / s.length;
  return {
    id: 'harmony',
    label: 'Hue harmony',
    score,
    verdict: verdictOf(score),
    detail:
      score >= 0.75
        ? `Hues sit within the ${scheme.replace('-', ' ')} relationship, worst drift ${Math.round(worst)}°.`
        : `One or more hues drift ${Math.round(worst)}° off the ${scheme.replace('-', ' ')} scheme. That usually reads as an unintended third colour.`,
  };
}

function checkHierarchy(slots: Slot[]): Check {
  const s = info(slots);
  const floors = s.filter((x) => x.slot.surface === 'floor');
  const walls = s.filter((x) => x.slot.surface === 'wall');
  const ceilings = s.filter((x) => x.slot.surface === 'ceiling');

  const issues: string[] = [];
  let score = 1;

  if (floors.length && walls.length) {
    const fl = Math.min(...floors.map((f) => f.L));
    const wl = Math.max(...walls.map((w) => w.L));
    if (fl > wl + 0.02) {
      score -= 0.45;
      issues.push('the floor is lighter than the walls, which makes the room feel unanchored and shows every mark');
    }
  }
  if (ceilings.length && walls.length) {
    const cl = Math.min(...ceilings.map((c) => c.L));
    const wl = Math.max(...walls.map((w) => w.L));
    if (cl < wl - 0.03) {
      score -= 0.25;
      issues.push('the ceiling is darker than the walls, which lowers the room visually — fine if deliberate');
    }
  }

  score = Math.max(0, score);
  return {
    id: 'hierarchy',
    label: 'Light hierarchy',
    score,
    verdict: verdictOf(score),
    detail: issues.length
      ? `Check ${issues.join('; ')}.`
      : 'Ceiling lightest, walls mid, floor grounded — the arrangement that reads as "normal" and lets colour do the talking.',
  };
}

function checkSeparation(slots: Slot[]): Check {
  const s = info(slots);
  const problems: string[] = [];
  let worst = 1;

  for (const [a, b] of ADJACENCY_CHECKS) {
    const sa = s.find((x) => x.slot.surface === a);
    const sb = s.find((x) => x.slot.surface === b);
    if (!sa || !sb) continue;
    const dL = Math.abs(sa.L - sb.L);
    const dE = deltaEOk(sa.slot.hex, sb.slot.hex);
    // Below ~0.05 Oklab lightness the two surfaces merge under artificial light.
    const local = Math.min(1, Math.max(dL / 0.1, dE / 0.14));
    if (local < 0.55) {
      problems.push(
        `${SURFACE_LABEL[a].toLowerCase()} and ${SURFACE_LABEL[b].toLowerCase()} are close enough to blur into one another`,
      );
    }
    worst = Math.min(worst, local);
  }

  return {
    id: 'separation',
    label: 'Surface separation',
    score: worst,
    verdict: verdictOf(worst),
    detail: problems.length
      ? `${problems.join('; ')}. Either widen the lightness gap or lean on a texture change to carry the join.`
      : 'Every adjacent pair separates cleanly, so edges and reveals will still read once the room is lit.',
  };
}

function checkUndertone(slots: Slot[]): Check {
  const s = info(slots).filter((x) => x.C > 0.008);
  if (s.length < 2) {
    return {
      id: 'undertone',
      label: 'Undertone coherence',
      score: 0.9,
      verdict: 'good',
      detail: 'Too near-neutral for undertone conflict to arise.',
    };
  }
  // Warm hues in Oklab sit roughly 20°–110°; cool roughly 180°–300°.
  const warm = s.filter((x) => x.h >= 15 && x.h <= 115);
  const cool = s.filter((x) => x.h >= 175 && x.h <= 305);
  const ratio = Math.max(warm.length, cool.length) / s.length;

  // A mixed palette is fine when the minority side is a deliberate accent.
  const minority = warm.length < cool.length ? warm : cool;
  const minorityIsAccentOnly = minority.every(
    (x) => x.slot.surface === 'accent' || x.slot.surface === 'textile',
  );

  const score = minorityIsAccentOnly ? Math.max(ratio, 0.82) : ratio;
  return {
    id: 'undertone',
    label: 'Undertone coherence',
    score,
    verdict: verdictOf(score),
    detail:
      score >= 0.75
        ? minorityIsAccentOnly && minority.length
          ? 'Warm and cool both present, but the minority temperature is confined to accent and textile — a deliberate counterpoint, not a conflict.'
          : 'Consistent undertone across the scheme, so the neutrals will not fight one another under warm lamps.'
        : 'Warm and cool undertones are competing across large surfaces. This is the most common reason a technically correct palette still looks wrong in the room.',
  };
}

function checkChromaDiscipline(slots: Slot[]): Check {
  const s = info(slots);
  const large = s.filter((x) => x.area >= 0.8);
  if (!large.length) {
    return {
      id: 'chroma',
      label: 'Chroma at scale',
      score: 0.85,
      verdict: 'good',
      detail: 'No dominant surface in this palette to over-saturate.',
    };
  }
  const worstC = Math.max(...large.map((x) => x.C));
  // Beyond ~0.09 chroma a 20 m² wall stops reading as a neutral backdrop.
  const score = worstC <= 0.06 ? 1 : Math.max(0, 1 - (worstC - 0.06) / 0.09);
  return {
    id: 'chroma',
    label: 'Chroma at scale',
    score,
    verdict: verdictOf(score),
    detail:
      score >= 0.75
        ? 'Large surfaces stay low in chroma, which is what keeps a big field of colour from overwhelming the room.'
        : 'A dominant surface is carrying more chroma than it can hold at scale. Colour intensifies dramatically between a sample chip and a whole wall — halve it, or move it to the accent.',
  };
}

function checkAccent(slots: Slot[], scheme: Exclude<HarmonyScheme, 'auto'>): Check {
  const s = info(slots);
  const accents = s.filter((x) => x.slot.surface === 'accent');
  const model = accentModelFor(scheme);

  if (!accents.length) {
    // Not a failure — plenty of good schemes are entirely tonal.
    const maxC = Math.max(...s.map((x) => x.C));
    return {
      id: 'accent',
      label: 'Accent',
      score: maxC > 0.09 ? 0.6 : 0.8,
      verdict: maxC > 0.09 ? 'watch' : 'good',
      detail:
        maxC > 0.09
          ? 'No slot is designated as the accent, yet one colour is carrying real chroma. Assign it the accent role so the engine can protect its dominance and keep the rest restrained.'
          : 'No accent in this scheme. Entirely tonal palettes work, but they put the whole burden on texture and light.',
    };
  }

  const others = s.filter((x) => x.slot.surface !== 'accent');
  const medianOther = median(others.map((x) => x.C)) || 0.01;
  const accent = accents.reduce((a, b) => (a.C > b.C ? a : b));
  const ratio = accent.C / Math.max(medianOther, 0.006);

  // Does it actually stand out against the surface it will sit on?
  const backing = s.find((x) => x.slot.surface === 'wall') ?? others[0];
  const backingContrast = backing ? deltaEOk(accent.slot.hex, backing.slot.hex) : 1;

  let score = Math.min(1, ratio / model.chromaRatio);
  if (backingContrast < 0.12) score = Math.min(score, 0.45);
  if (accents.length > 1) score = Math.min(score, 0.6);

  const parts: string[] = [];
  parts.push(`${model.headline.toLowerCase()} — ${model.relation.replace('-', ' ')} to the dominant hue.`);
  if (ratio < model.chromaRatio * 0.6) {
    parts.push(
      `The accent is only ${ratio.toFixed(1)}× the chroma of the rest, so it will not carry as a focal point. Push it further or accept a tonal scheme.`,
    );
  } else {
    parts.push(`Accent runs ${ratio.toFixed(1)}× the chroma of the other surfaces — enough to lead the eye.`);
  }
  if (backingContrast < 0.12) {
    parts.push('It sits too close to the wall behind it, so it will disappear rather than punctuate.');
  }
  if (accents.length > 1) {
    parts.push('Two accents split the focus. Demote one to a textile or a secondary tone.');
  }
  parts.push(`Keep it to roughly ${Math.round(model.areaShare * 100)}% of visible surface.`);

  return {
    id: 'accent',
    label: 'Accent',
    score,
    verdict: verdictOf(score),
    detail: parts.join(' '),
  };
}

function checkVariety(slots: Slot[]): Check {
  const mats = slots.map((s) => getMaterial(s.materialId)).filter(Boolean);
  if (mats.length < 2) {
    return {
      id: 'variety',
      label: 'Material variety',
      score: 0.8,
      verdict: 'good',
      detail: 'Not enough bound materials yet to judge the mix.',
    };
  }
  const patterns = new Set(mats.map((m) => m!.pattern));
  const woodShare = mats.filter((m) => m!.pattern === 'woodgrain').length / mats.length;

  let score = Math.min(1, patterns.size / 3);
  if (woodShare > 0.6) score = Math.min(score, 0.5);

  // Timber species that do not match are more jarring than any colour error.
  const species = new Set(mats.filter((m) => m!.species).map((m) => m!.species));
  if (species.size > 2) score = Math.min(score, 0.55);

  const notes: string[] = [];
  if (woodShare > 0.6) notes.push('the scheme is mostly woodgrain, so it will read flat despite the colour range');
  if (species.size > 2) notes.push(`${species.size} different timber species are in play — two is normally the limit`);

  return {
    id: 'variety',
    label: 'Material variety',
    score,
    verdict: verdictOf(score),
    detail: notes.length
      ? `Check that ${notes.join(', and that ')}.`
      : `${patterns.size} surface characters in the mix — enough contrast of texture to keep the scheme from flattening out.`,
  };
}

function checkDaylight(slots: Slot[]): Check {
  const s = info(slots);
  const walls = s.filter((x) => x.slot.surface === 'wall');
  if (!walls.length) {
    return {
      id: 'daylight',
      label: 'Daylight & LRV',
      score: 0.85,
      verdict: 'good',
      detail: 'No wall slot to assess.',
    };
  }
  const wallLrv = Math.max(...walls.map((w) => lrv(w.slot.hex)));
  // Below LRV 40 a room needs real daylight or generous artificial light.
  const score = wallLrv >= 55 ? 1 : wallLrv >= 40 ? 0.75 : wallLrv >= 25 ? 0.5 : 0.3;
  return {
    id: 'daylight',
    label: 'Daylight & LRV',
    score,
    verdict: verdictOf(score),
    detail:
      wallLrv >= 55
        ? `Wall LRV ≈ ${wallLrv.toFixed(0)}. Bounces light well; safe for a north-facing or small room.`
        : wallLrv >= 40
          ? `Wall LRV ≈ ${wallLrv.toFixed(0)}. Workable, but budget for good artificial light in a north-facing room.`
          : `Wall LRV ≈ ${wallLrv.toFixed(0)}. This is a deliberately dark scheme — it needs either strong daylight or a properly layered lighting design, not a single ceiling fitting.`,
  };
}

/* ------------------------------------------------------------------ report -- */

const WEIGHTS: Record<string, number> = {
  harmony: 1.15,
  hierarchy: 1,
  separation: 1.2,
  undertone: 1.1,
  chroma: 0.9,
  accent: 0.9,
  variety: 0.7,
  daylight: 0.6,
};

export function reportFor(palette: Palette): PaletteReport {
  const scheme = (palette.resolvedScheme ?? (palette.scheme === 'auto' ? 'analogous' : palette.scheme)) as Exclude<
    HarmonyScheme,
    'auto'
  >;
  const slots = palette.slots;

  const checks: Check[] = [
    checkHarmony(slots, scheme),
    checkHierarchy(slots),
    checkSeparation(slots),
    checkUndertone(slots),
    checkChromaDiscipline(slots),
    checkAccent(slots, scheme),
    checkVariety(slots),
    checkDaylight(slots),
  ];

  let num = 0;
  let den = 0;
  for (const c of checks) {
    const w = WEIGHTS[c.id] ?? 1;
    num += c.score * w;
    den += w;
  }

  return { total: Math.round((num / den) * 100), checks };
}

/** Fast scalar used inside the generator's search loop. */
export function quickScore(palette: Palette): number {
  const r = reportFor(palette);
  return r.total / 100;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Distance from a hue to the nearest allowed scheme offset — used by suggestions. */
export function schemeDeviation(
  hue: number,
  dominant: number,
  scheme: Exclude<HarmonyScheme, 'auto'>,
): number {
  const rel = ((hue - dominant + 540) % 360) - 180;
  return Math.min(...schemeOffsets(scheme).map((o) => hueDistance(((rel % 360) + 360) % 360, ((o % 360) + 360) % 360)));
}

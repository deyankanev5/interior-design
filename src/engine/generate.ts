import type { HarmonyScheme, MaterialView, Palette, Slot, Surface } from '../domain/types';
import { categoriesFor } from '../domain/surfaces';
import { deltaEOk, hexToOklch, oklchToHex } from '../color/convert';
import { accentModelFor, baseHueFor, chooseScheme, pullHue, schemeOffsets, targetFor, type Target } from './harmony';
import { getMaterial, materialsFor, pairingsFor } from '../data/catalog';
import { dominantHue, quickScore } from './score';

export interface GenerateOptions {
  /** How many complete palettes to try before returning the best. */
  attempts?: number;
  /** Restrict to a brand, e.g. only what a client's fabricator stocks. */
  brands?: string[] | null;
  /** Only propose entries that are real, orderable products. */
  realProductsOnly?: boolean;
}

const DEFAULTS: Required<GenerateOptions> = {
  attempts: 14,
  brands: null,
  realProductsOnly: false,
};

/* ------------------------------------------------------------ candidates -- */

function poolFor(surface: Surface, opts: Required<GenerateOptions>): MaterialView[] {
  let pool = materialsFor(surface, categoriesFor(surface));
  if (opts.brands?.length) pool = pool.filter((m) => opts.brands!.includes(m.brand));
  if (opts.realProductsOnly) pool = pool.filter((m) => m.provenance !== 'generic');
  // Never leave a slot unfillable because the filters were too aggressive.
  return pool.length ? pool : materialsFor(surface, categoriesFor(surface));
}

/**
 * Distance from a candidate material to a target colour.
 *
 * Hue is weighted by how chromatic both sides are: on a near-neutral greige the
 * hue angle is numerically unstable and matching it exactly is meaningless,
 * whereas on an accent it is the whole point.
 */
export function targetDistance(m: MaterialView, t: Target): number {
  const c = hexToOklch(m.hex);
  const dL = c.L - t.L;
  const dC = c.C - t.C;
  let dh = Math.abs(c.h - t.h) % 360;
  if (dh > 180) dh = 360 - dh;
  const hueWeight = Math.min(c.C, t.C) * 5;
  return Math.hypot(dL * 1.5, dC * 2.4, (dh / 180) * hueWeight);
}

interface PickContext {
  chosen: { hex: string; materialId: string | null }[];
  lockedMaterialIds: string[];
}

function scoreCandidate(m: MaterialView, t: Target, ctx: PickContext): number {
  let score = 1 / (1 + targetDistance(m, t) * 6);

  // Never repeat a decor inside one palette.
  if (ctx.chosen.some((c) => c.materialId === m.id)) return -1;

  // Two surfaces that are almost-but-not-quite the same colour look like an error.
  const nearest = Math.min(...ctx.chosen.map((c) => deltaEOk(c.hex, m.hex)), 99);
  if (nearest < 0.045) score *= 0.15;
  else if (nearest < 0.08) score *= 0.6;

  // A pairing the manufacturer itself publishes beats anything we can infer.
  for (const lockedId of ctx.lockedMaterialIds) {
    const p = pairingsFor(lockedId);
    if (p?.ids.includes(m.id)) score *= 2.2;
  }

  if (m.provenance === 'manufacturer-decor') score *= 1.12;
  else if (m.provenance === 'standard') score *= 1.05;
  if (m.tags.includes('bestseller')) score *= 1.05;

  return score;
}

/** Weighted pick from the top of the ranked list, so repeat presses vary. */
function pickFrom(pool: MaterialView[], t: Target, ctx: PickContext, topK = 6): MaterialView | null {
  const ranked = pool
    .map((m) => ({ m, s: scoreCandidate(m, t, ctx) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK);

  if (!ranked.length) return null;
  const total = ranked.reduce((a, b) => a + b.s, 0);
  let r = Math.random() * total;
  for (const x of ranked) {
    r -= x.s;
    if (r <= 0) return x.m;
  }
  return ranked[0].m;
}

/* -------------------------------------------------------------- planning -- */

interface Plan {
  scheme: Exclude<HarmonyScheme, 'auto'>;
  baseHue: number;
  /** Hue assigned to each slot index. */
  hues: number[];
}

function planHues(palette: Palette, jitter: number): Plan {
  const locked = palette.slots.filter((s) => s.locked);
  const lockedLch = locked.map((s) => hexToOklch(s.hex));
  const scheme =
    palette.scheme === 'auto'
      ? chooseScheme(lockedLch.map((c) => c.C), palette.mood)
      : palette.scheme;

  // Anchor on the locked materials when there is any chroma to anchor to.
  const chromatic = lockedLch.filter((c) => c.C > 0.02);
  let baseHue: number;
  if (chromatic.length) {
    baseHue = dominantHue(locked).hue;
  } else {
    baseHue = baseHueFor(scheme, Math.random() * 360);
  }
  baseHue += jitter * 18;

  const offsets = schemeOffsets(scheme);
  const accent = accentModelFor(scheme);

  const hues = palette.slots.map((slot, i) => {
    if (slot.surface === 'accent') return baseHue + accent.offset;
    // Walls, floors and ceilings hold the dominant hue; detail surfaces step out.
    if (slot.surface === 'ceiling') return baseHue;
    if (slot.surface === 'wall' || slot.surface === 'floor') {
      return baseHue + offsets[i % 2 === 0 ? 0 : Math.min(2, offsets.length - 1)] * 0.35;
    }
    return baseHue + offsets[i % offsets.length];
  });

  return { scheme, baseHue, hues };
}

/**
 * Order slots are filled in.
 *
 * The accent is resolved first when the scheme has one, because every other
 * surface is then tuned to sit underneath it — reversing that order is how you
 * end up with a wall colour that leaves no room for the accent to breathe.
 */
function fillOrder(slots: Slot[]): number[] {
  const rank: Record<Surface, number> = {
    accent: 0,
    floor: 1,
    wall: 2,
    furniture: 3,
    worktop: 4,
    textile: 5,
    ceiling: 6,
  };
  return slots
    .map((_, i) => i)
    .filter((i) => !slots[i].locked)
    .sort((a, b) => rank[slots[a].surface] - rank[slots[b].surface]);
}

/* ------------------------------------------------------------- generation -- */

function attempt(palette: Palette, opts: Required<GenerateOptions>, jitter: number): Palette {
  const plan = planHues(palette, jitter);
  const slots: Slot[] = palette.slots.map((s) => ({ ...s }));

  const ctx: PickContext = {
    chosen: slots.filter((s) => s.locked).map((s) => ({ hex: s.hex, materialId: s.materialId })),
    lockedMaterialIds: slots.filter((s) => s.locked && s.materialId).map((s) => s.materialId!),
  };

  // How far each same-surface slot is spread within its envelope.
  const seenBySurface = new Map<Surface, number>();

  for (const i of fillOrder(slots)) {
    const slot = slots[i];
    const n = seenBySurface.get(slot.surface) ?? 0;
    seenBySurface.set(slot.surface, n + 1);

    let hue = plan.hues[i];

    // Pull the neutrals' undertone toward the accent so they belong together.
    const accentSlot = slots.find((s) => s.surface === 'accent' && s.materialId);
    if (accentSlot && slot.surface !== 'accent') {
      const ac = hexToOklch(accentSlot.hex);
      if (ac.C > 0.06) hue = pullHue(hue, ac.h, 0.25);
    }

    const t = targetFor(slot.surface, hue, palette.mood, n * 0.37 + Math.random() * 0.3, jitter);
    const pool = poolFor(slot.surface, opts);
    const chosen = pickFrom(pool, t, ctx);

    if (chosen) {
      slot.materialId = chosen.id;
      slot.hex = chosen.hex;
    } else {
      // No product fits — fall back to the raw target so the slot is never blank.
      slot.materialId = null;
      slot.hex = oklchToHex(t);
    }
    ctx.chosen.push({ hex: slot.hex, materialId: slot.materialId });
  }

  return { ...palette, slots, resolvedScheme: plan.scheme };
}

/** Generate a palette, leaving every locked slot exactly as it is. */
export function generatePalette(palette: Palette, options: GenerateOptions = {}): Palette {
  const opts = { ...DEFAULTS, ...options };
  if (palette.slots.every((s) => s.locked)) return palette;

  let best: Palette | null = null;
  let bestScore = -1;

  for (let i = 0; i < opts.attempts; i++) {
    const jitter = (Math.random() - 0.5) * 2;
    const candidate = attempt(palette, opts, jitter);
    const score = quickScore(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best ?? palette;
}

/** A grid of distinct options, so the whole scheme can be compared at a glance. */
export function generateVariations(palette: Palette, count = 6, options: GenerateOptions = {}): Palette[] {
  const opts = { ...DEFAULTS, ...options, attempts: Math.max(4, Math.round(DEFAULTS.attempts / 2)) };
  const out: Palette[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count * 5 && out.length < count; i++) {
    const p = generatePalette(palette, opts);
    const key = p.slots.map((s) => s.materialId ?? s.hex).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------ suggestions -- */

export interface Suggestion {
  material: MaterialView;
  /** 0..100 — the palette score if this material were used. */
  score: number;
  /** Why it works, in the terms a specifier would use. */
  reason: string;
}

/**
 * Ranked alternatives for a single slot, every other slot held fixed.
 *
 * This is the part that beats pressing space repeatedly: rather than resampling
 * the whole scheme to change one element, the engine evaluates the real
 * candidates for that one surface and shows the best of them side by side.
 */
export function suggestForSlot(
  palette: Palette,
  slotId: string,
  count = 12,
  options: GenerateOptions = {},
): Suggestion[] {
  const opts = { ...DEFAULTS, ...options };
  const index = palette.slots.findIndex((s) => s.id === slotId);
  if (index < 0) return [];

  const slot = palette.slots[index];
  const pool = poolFor(slot.surface, opts);
  const others = palette.slots.filter((_, i) => i !== index);

  const lockedMaterialIds = others.filter((s) => s.materialId).map((s) => s.materialId!);
  const scored = pool
    .filter((m) => m.id !== slot.materialId)
    .map((m) => {
      const trial: Palette = {
        ...palette,
        slots: palette.slots.map((s, i) => (i === index ? { ...s, materialId: m.id, hex: m.hex } : s)),
      };
      return { m, score: Math.round(quickScore(trial) * 100) };
    })
    .sort((a, b) => b.score - a.score);

  // Spread the results across the colour space instead of returning twelve
  // near-identical greys that all happen to score 84.
  const picked: typeof scored = [];
  for (const cand of scored) {
    if (picked.length >= count) break;
    const tooClose = picked.some((p) => deltaEOk(p.m.hex, cand.m.hex) < 0.05);
    if (!tooClose) picked.push(cand);
  }
  for (const cand of scored) {
    if (picked.length >= count) break;
    if (!picked.includes(cand)) picked.push(cand);
  }

  return picked.map(({ m, score }) => ({
    material: m,
    score,
    reason: reasonFor(m, palette, lockedMaterialIds),
  }));
}

function reasonFor(m: MaterialView, palette: Palette, lockedIds: string[]): string {
  for (const id of lockedIds) {
    const p = pairingsFor(id);
    if (p?.ids.includes(m.id)) {
      const partner = getMaterial(id);
      return `${partner ? `Published pairing with ${partner.code}. ` : ''}${p.note}`;
    }
  }

  const c = hexToOklch(m.hex);
  const { hue } = dominantHue(palette.slots);
  let rel = Math.abs(((c.h - hue + 540) % 360) - 180);

  if (c.C < 0.025) {
    return `Near-neutral at LRV ${m.lrv.toFixed(0)} — it recedes and lets the rest of the scheme lead.`;
  }
  if (rel < 30) return `Shares the dominant hue family, so it reads as tonal depth rather than a second colour.`;
  if (rel > 150) return `Sits opposite the dominant hue — the strongest available contrast for this scheme.`;
  if (rel > 100) return `A triadic step from the dominant hue: distinct, but still anchored to the scheme.`;
  return `Steps ${Math.round(rel)}° off the dominant hue — enough separation to register, close enough to stay coherent.`;
}

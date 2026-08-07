/**
 * Colour maths for the palette engine.
 *
 * Everything perceptual runs through Oklab / OkLCh rather than HSL, because the
 * engine constantly asks questions like "is this floor decor meaningfully darker
 * than that wall paint?" — HSL lightness lies about that, Oklab does not.
 */

export interface RGB {
  r: number; // 0..1
  g: number;
  b: number;
}

export interface Oklab {
  L: number; // 0..1
  a: number;
  b: number;
}

export interface OkLCh {
  L: number; // 0..1
  C: number; // 0..~0.4 in sRGB
  h: number; // degrees, 0..360
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/* ------------------------------------------------------------------ hex ---- */

export function hexToRgb(hex: string): RGB {
  const h = normaliseHex(hex);
  return {
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Accepts `#abc`, `abc`, `#aabbcc`, `AABBCC`. Returns `#AABBCC`. */
export function normaliseHex(input: string): string {
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Not a hex colour: ${input}`);
  return `#${h.toUpperCase()}`;
}

export function isValidHex(input: string): boolean {
  try {
    normaliseHex(input);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- oklab ---- */

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklab({ r, g, b }: RGB): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToRgb({ L, a, b }: Oklab): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function oklabToOklch({ L, a, b }: Oklab): OkLCh {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function oklchToOklab({ L, C, h }: OkLCh): Oklab {
  const rad = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

export const hexToOklch = (hex: string): OkLCh => oklabToOklch(rgbToOklab(hexToRgb(hex)));
export const hexToOklab = (hex: string): Oklab => rgbToOklab(hexToRgb(hex));

/**
 * OkLCh -> hex, reducing chroma until the colour actually fits in sRGB.
 * Naive clipping shifts hue badly on saturated colours; this keeps hue stable.
 */
export function oklchToHex(lch: OkLCh): string {
  const L = clamp(lch.L, 0, 1);
  const h = ((lch.h % 360) + 360) % 360;

  let lo = 0;
  let hi = Math.max(0, lch.C);
  if (inGamut({ L, C: hi, h })) return rgbToHex(oklabToRgb(oklchToOklab({ L, C: hi, h })));

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ L, C: mid, h })) lo = mid;
    else hi = mid;
  }
  return rgbToHex(oklabToRgb(oklchToOklab({ L, C: lo, h })));
}

function inGamut(lch: OkLCh): boolean {
  const { r, g, b } = oklabToRgb(oklchToOklab(lch));
  const eps = 1e-4;
  return (
    r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps
  );
}

/* ------------------------------------------------------------- distances --- */

/** Perceptual distance in Oklab. ~0.02 is "barely different", ~0.1 is clearly different. */
export function deltaEOk(a: string, b: string): number {
  const A = hexToOklab(a);
  const B = hexToOklab(b);
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

/** Shortest angular distance between two hues, 0..180. */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(((h1 - h2) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** Circular mean of hues weighted by (typically) chroma. */
export function meanHue(samples: { h: number; weight: number }[]): number {
  let x = 0;
  let y = 0;
  for (const s of samples) {
    const rad = (s.h * Math.PI) / 180;
    x += Math.cos(rad) * s.weight;
    y += Math.sin(rad) * s.weight;
  }
  if (x === 0 && y === 0) return 0;
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (h < 0) h += 360;
  return h;
}

/* ------------------------------------------------- luminance & contrast ---- */

/** CIE relative luminance (Y), 0..1. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/**
 * Light Reflectance Value, 0-100, as used on paint fan decks and in daylight
 * calculations. Screen-derived, so treat it as an estimate: a measured LRV from
 * the manufacturer's datasheet always wins.
 */
export function lrv(hex: string): number {
  return Math.round(relativeLuminance(hex) * 1000) / 10;
}

/** WCAG 2.1 contrast ratio, 1..21. Used for label legibility, not for design rules. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white text, whichever is more legible on `hex`. */
export function readableTextOn(hex: string): '#000000' | '#FFFFFF' {
  return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#FFFFFF') ? '#000000' : '#FFFFFF';
}

/* ----------------------------------------------------------- adjustments --- */

export function withLightness(hex: string, L: number): string {
  const c = hexToOklch(hex);
  return oklchToHex({ ...c, L: clamp(L, 0, 1) });
}

export function adjust(hex: string, delta: Partial<OkLCh>): string {
  const c = hexToOklch(hex);
  return oklchToHex({
    L: clamp(c.L + (delta.L ?? 0), 0, 1),
    C: Math.max(0, c.C + (delta.C ?? 0)),
    h: c.h + (delta.h ?? 0),
  });
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToOklab(a);
  const B = hexToOklab(b);
  const k = clamp01(t);
  return rgbToHex(
    oklabToRgb({
      L: A.L + (B.L - A.L) * k,
      a: A.a + (B.a - A.a) * k,
      b: A.b + (B.b - A.b) * k,
    }),
  );
}

/** A soft tint of `hex` suitable for large flat UI areas. */
export const tint = (hex: string, t: number) => mix(hex, '#FFFFFF', t);
export const shade = (hex: string, t: number) => mix(hex, '#000000', t);

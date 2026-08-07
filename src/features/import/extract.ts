import type { Oklab } from '../../color/convert';
import { oklabToRgb, rgbToHex, rgbToOklab } from '../../color/convert';

export interface ExtractedColour {
  hex: string;
  /** Share of sampled pixels in this cluster, 0..1. */
  share: number;
  lab: Oklab;
}

/**
 * Pull the dominant colours out of a reference image.
 *
 * k-means in Oklab rather than RGB: clustering in RGB splits a single painted
 * wall across two clusters as soon as it is unevenly lit, and merges a timber
 * floor with a beige sofa. Oklab groups by how a surface *looks*, which is what
 * a moodboard is communicating in the first place.
 */
export async function extractPalette(
  source: HTMLImageElement | ImageBitmap,
  k = 6,
): Promise<ExtractedColour[]> {
  const pixels = samplePixels(source);
  if (!pixels.length) return [];
  return kmeans(pixels, Math.max(1, Math.min(k, 12)));
}

const SAMPLE_EDGE = 160;

function samplePixels(source: HTMLImageElement | ImageBitmap): Oklab[] {
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!sw || !sh) return [];

  const scale = Math.min(1, SAMPLE_EDGE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // Cross-origin image without CORS headers taints the canvas.
    throw new Error(
      'This image is served without cross-origin permission, so its pixels cannot be read. Download it and drop the file in instead.',
    );
  }

  const out: Oklab[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    out.push(rgbToOklab({ r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255 }));
  }
  return out;
}

function kmeans(points: Oklab[], k: number): ExtractedColour[] {
  const centroids = seedPlusPlus(points, k);
  const assignment = new Array<number>(points.length).fill(0);

  for (let iter = 0; iter < 24; iter++) {
    let moved = false;

    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = dist2(points[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        moved = true;
      }
    }

    const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < points.length; i++) {
      const s = sums[assignment[i]];
      s.L += points[i].L;
      s.a += points[i].a;
      s.b += points[i].b;
      s.n++;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].n === 0) continue;
      centroids[c] = { L: sums[c].L / sums[c].n, a: sums[c].a / sums[c].n, b: sums[c].b / sums[c].n };
    }

    if (!moved) break;
  }

  const counts = new Array<number>(centroids.length).fill(0);
  for (const a of assignment) counts[a]++;

  return centroids
    .map((lab, i) => ({ hex: rgbToHex(oklabToRgb(lab)), share: counts[i] / points.length, lab }))
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** k-means++ seeding — plain random seeding loses small but important accents. */
function seedPlusPlus(points: Oklab[], k: number): Oklab[] {
  const centroids: Oklab[] = [points[Math.floor(Math.random() * points.length)]];

  while (centroids.length < k) {
    const d2 = points.map((p) => Math.min(...centroids.map((c) => dist2(p, c))));
    const total = d2.reduce((a, b) => a + b, 0);
    if (total <= 0) break;
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < d2.length; i++) {
      r -= d2[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    centroids.push(points[idx]);
  }
  return centroids;
}

function dist2(a: Oklab, b: Oklab): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dL * dL + da * da + db * db;
}

/* ------------------------------------------------------------ image loading */

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    img.src = url;
  });
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Could not load that image URL. It may block hotlinking — download it and drop the file in.'));
    img.src = url;
  });
}

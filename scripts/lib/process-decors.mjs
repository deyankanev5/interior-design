/**
 * Shared decor-image pipeline for the supplier scrapers.
 *
 * For each downloaded decor photograph this produces, in one decode:
 *
 *  - the representative colour, as the mean of the image in Oklab
 *  - a square, re-encoded JPEG tile small enough to ship with a static site
 *
 * Both come from the same pixels, so the colour the engine reasons about and
 * the texture the user sees can never drift apart.
 *
 * Chromium does the decoding and re-encoding from data: URLs, which keeps this
 * dependency-free beyond the Playwright already used for the smoke test and
 * needs no network of its own.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

/** Edge length of the emitted tile. Large enough to read as a texture. */
export const TILE = 320;
/** JPEG quality. 0.72 keeps woodgrain legible at roughly 10 KB a tile. */
export const QUALITY = 0.72;

/**
 * Is this a product photographed on a studio backdrop rather than a surface?
 *
 * Some supplier pages lead with a shot of the product on seamless white — an
 * edge band lying on a sweep, say. Those must never become a decor tile, and
 * the reason is not that they look wrong. The mean of such an image is the
 * backdrop: EGGER's `U8921 R1 Doppia Black Matt/Gloss` sampled as `#E7E7E7`,
 * a near-white, which would let the engine drop a black edging onto a wall as
 * if it were a pale neutral. Both the texture and the colour are wrong.
 *
 * The signature is a frame of pixels with *no* variation at all — a synthetic
 * backdrop, not a photographed one — around an interior that differs sharply
 * from it. Measured across the whole catalogue the two populations do not
 * overlap: backdrop shots sit at a border deviation of 0.0000 with 5–8% of the
 * image far from the border colour, while the flattest genuine decor manages
 * 0.0209 with 0.1%. The thresholds sit in the gap, nearer the real decors.
 *
 * A plain white board is deliberately kept: its border is uniform too, but
 * nothing in the interior contrasts with it, because the whole tile is decor.
 */
export const isBackdropShot = ({ borderSd, far }) => borderSd < 0.012 && far > 0.02;

/**
 * @param {{id: string, dataUrl: string}[]} items
 * @param {object} options
 * @param {string} options.outDir
 * @param {string} options.publicPrefix
 * @param {number} [options.batch]
 * @param {(m: {w: number, h: number, borderSd: number, far: number}) => boolean} [options.reject]
 *   Called with the source measurements before anything is written. Return true
 *   to drop the image: nothing lands on disk and the id is absent from the
 *   result, so a caller that keys off it drops the decor too. Defaults to
 *   `isBackdropShot`; a caller that adds its own test should still apply that.
 * @returns {Promise<{results: Map<string, {hex: string, image: string, bytes: number}>, rejected: string[]}>}
 */
export async function processDecors(items, { outDir, publicPrefix, batch = 30, reject = isBackdropShot }) {
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  const page = await browser.newPage();
  const results = new Map();
  const rejected = [];

  try {
    for (let i = 0; i < items.length; i += batch) {
      const slice = items.slice(i, i + batch);
      const processed = await page.evaluate(inBrowser, { items: slice, tile: TILE, quality: QUALITY });

      for (const r of processed) {
        if (!r.hex || !r.jpeg) continue;
        // Rejection happens before the write, so a bad source leaves no orphan
        // tile behind for the payload check to trip over.
        if (reject({ w: r.w, h: r.h, borderSd: r.borderSd, far: r.far })) {
          rejected.push(r.id);
          continue;
        }
        const rel = `${publicPrefix}/${r.id}.jpg`;
        const file = join(outDir, `${r.id}.jpg`);
        const bytes = Buffer.from(r.jpeg, 'base64');
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, bytes);
        results.set(r.id, { hex: r.hex, image: rel, bytes: bytes.length });
      }
      process.stdout.write(`\r  ${Math.min(i + batch, items.length)}/${items.length}`);
    }
  } finally {
    await browser.close();
  }

  process.stdout.write('\n');
  return { results, rejected };
}

/**
 * Runs inside the page.
 *
 * The colour is averaged in Oklab rather than raw sRGB: the sRGB mean of a
 * woodgrain skews dark and desaturated because the encoding is non-linear,
 * which is exactly the error that makes a generated palette feel muddy.
 */
function inBrowser({ items, tile, quality }) {
  const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

  const toOklab = (r, g, b) => {
    const lr = srgbToLinear(r);
    const lg = srgbToLinear(g);
    const lb = srgbToLinear(b);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };

  const toRgb = ([L, A, B]) => {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [
      linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
  };

  const hexOf = (rgb) =>
    '#' +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tile;
  tileCanvas.height = tile;
  const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });

  return Promise.all(
    items.map(async ({ id, dataUrl }) => {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('decode failed'));
          img.src = dataUrl;
        });

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        if (!iw || !ih) throw new Error('empty image');

        // Centre-crop to a square so portrait and square sources tile alike.
        const side = Math.min(iw, ih);
        tileCtx.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, 0, 0, tile, tile);

        const { data } = tileCtx.getImageData(0, 0, tile, tile);
        let L = 0;
        let A = 0;
        let B = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const lab = toOklab(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
          L += lab[0];
          A += lab[1];
          B += lab[2];
          n++;
        }
        if (!n) throw new Error('no pixels');

        // How flat is the outer frame, and how much of the interior departs
        // from it? Together these separate a product on a studio backdrop from
        // a genuine surface — see `isBackdropShot`.
        const px = (p) => [data[p * 4] / 255, data[p * 4 + 1] / 255, data[p * 4 + 2] / 255];
        const edge = Math.max(3, Math.round(tile / 21));
        const frame = [];
        for (let y = 0; y < tile; y++) {
          for (let x = 0; x < tile; x++) {
            if (y < edge || y >= tile - edge || x < edge || x >= tile - edge) frame.push(px(y * tile + x));
          }
        }
        const bm = [0, 1, 2].map((k) => frame.reduce((s, v) => s + v[k], 0) / frame.length);
        const borderSd = Math.sqrt(
          frame.reduce((s, v) => s + (v[0] - bm[0]) ** 2 + (v[1] - bm[1]) ** 2 + (v[2] - bm[2]) ** 2, 0) /
            frame.length,
        );
        let far = 0;
        for (let p = 0; p < tile * tile; p++) {
          const v = px(p);
          if (Math.hypot(v[0] - bm[0], v[1] - bm[1], v[2] - bm[2]) > 0.18) far++;
        }

        return {
          id,
          w: iw,
          h: ih,
          borderSd,
          far: far / (tile * tile),
          hex: hexOf(toRgb([L / n, A / n, B / n])),
          jpeg: tileCanvas.toDataURL('image/jpeg', quality).split(',')[1],
        };
      } catch {
        return { id, hex: null, jpeg: null };
      }
    }),
  );
}

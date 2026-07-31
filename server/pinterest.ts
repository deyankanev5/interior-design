/**
 * Pinterest pin -> image URL resolution.
 *
 * Runs server-side because Pinterest sends no CORS headers, and because reading
 * pixels out of a cross-origin image taints the canvas. Both the resolver and
 * the image proxy are deliberately restricted to Pinterest's own hosts so this
 * endpoint can never be used as a general-purpose open proxy.
 */

const PIN_HOSTS = new Set(['pinterest.com', 'www.pinterest.com', 'pin.it', 'ru.pinterest.com']);
const IMAGE_HOSTS = /(^|\.)pinimg\.com$/;

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export function isPinterestUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return PIN_HOSTS.has(u.hostname) || u.hostname.endsWith('.pinterest.com');
  } catch {
    return false;
  }
}

export function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && IMAGE_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

export interface ResolvedPin {
  imageUrl: string;
  title?: string;
  author?: string;
}

/** Pinterest serves the same asset at several sizes under a path segment. */
function upgradeToOriginal(url: string): string {
  return url.replace(/\/\d+x\d*\//, '/originals/');
}

export async function resolvePin(rawUrl: string): Promise<ResolvedPin> {
  if (!isPinterestUrl(rawUrl)) {
    throw Object.assign(new Error('Not a Pinterest URL.'), { status: 400 });
  }

  // pin.it short links redirect to the canonical pin.
  let url = rawUrl;
  try {
    const head = await fetch(rawUrl, { redirect: 'follow', headers: { 'user-agent': UA } });
    if (head.url) url = head.url;
  } catch {
    // Non-fatal: fall through and try the URL as given.
  }

  // 1. oEmbed is the documented, keyless path.
  try {
    const res = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}`, {
      headers: { 'user-agent': UA, accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as { thumbnail_url?: string; title?: string; author_name?: string };
      if (data.thumbnail_url) {
        return {
          imageUrl: upgradeToOriginal(data.thumbnail_url),
          title: data.title,
          author: data.author_name,
        };
      }
    }
  } catch {
    // Fall through to scraping the meta tag.
  }

  // 2. Fall back to the Open Graph image on the pin page.
  const page = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' } });
  if (!page.ok) {
    throw Object.assign(new Error(`Pinterest returned ${page.status} for that pin.`), { status: 502 });
  }
  const html = await page.text();
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

  if (!og) {
    throw Object.assign(
      new Error('Could not find an image on that pin. Private or deleted pins cannot be read.'),
      { status: 404 },
    );
  }

  const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return { imageUrl: upgradeToOriginal(decodeHtml(og)), title: title ? decodeHtml(title) : undefined };
}

export async function fetchPinImage(imageUrl: string): Promise<{ body: ArrayBuffer; contentType: string }> {
  if (!isAllowedImageUrl(imageUrl)) {
    throw Object.assign(new Error('Only Pinterest image hosts may be proxied.'), { status: 400 });
  }
  const res = await fetch(imageUrl, { headers: { 'user-agent': UA, referer: 'https://www.pinterest.com/' } });
  if (!res.ok) {
    throw Object.assign(new Error(`Image host returned ${res.status}.`), { status: 502 });
  }
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get('content-type') ?? 'image/jpeg',
  };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

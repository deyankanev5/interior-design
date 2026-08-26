/**
 * Pre-flight check for a GitHub Pages build.
 *
 *   npm run build && node scripts/check-pages.mjs
 *
 * Pages has no server and no build step of its own, so the three ways this
 * deployment can silently break are all decided at build time: a base path that
 * does not match the repository, a missing .nojekyll, and a missing 404.html.
 * Each produces a blank page or a dead link rather than an error, which is why
 * they are worth asserting rather than eyeballing.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const base = process.env.BASE_PATH ?? '/interior-design/';

let failures = 0;

function check(label, fn) {
  try {
    const detail = fn();
    console.log(`ok    ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    console.log(`FAIL  ${label} — ${err.message}`);
    failures++;
  }
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

check('dist/index.html exists', () => {
  const file = join(dist, 'index.html');
  if (!existsSync(file)) throw new Error('run "npm run build" first');
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<div id="root">')) throw new Error('no app mount point');
  return kb(Buffer.byteLength(html));
});

check('asset URLs use the Pages base path', () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(https?:|data:|#|mailto:)/.test(u));

  if (!refs.length) throw new Error('no local asset references found');

  const wrong = refs.filter((u) => !u.startsWith(base));
  if (wrong.length) {
    throw new Error(`these do not start with "${base}": ${wrong.join(', ')} — set BASE_PATH to match the repo name`);
  }
  return `${refs.length} references, all under ${base}`;
});

check('referenced assets actually exist', () => {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => u.startsWith(base));

  for (const ref of refs) {
    const rel = ref.slice(base.length);
    if (!existsSync(join(dist, rel))) throw new Error(`${ref} is referenced but not built`);
  }
  return `${refs.length} verified`;
});

check('.nojekyll is present', () => {
  // Without it, Pages runs the output through Jekyll, which discards files and
  // directories whose names begin with an underscore.
  if (!existsSync(join(dist, '.nojekyll'))) {
    throw new Error('missing — keep an empty public/.nojekyll so it is copied into dist');
  }
  return 'Jekyll processing disabled';
});

check('404.html mirrors index.html', () => {
  const fallback = join(dist, '404.html');
  if (!existsSync(fallback)) throw new Error('missing — deep links would return a real 404');

  const a = readFileSync(join(dist, 'index.html'), 'utf8');
  const b = readFileSync(fallback, 'utf8');
  if (a !== b) throw new Error('differs from index.html; it should be a copy');
  return 'deep links fall back to the app';
});

check('no server-side API calls remain in the bundle', () => {
  // Pages cannot host functions. A leftover fetch('/api/...') would fail
  // silently at runtime rather than at build time.
  const assets = join(dist, 'assets');
  const offenders = readdirSync(assets)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => /["'`]\/api\//.test(readFileSync(join(assets, f), 'utf8')));

  if (offenders.length) throw new Error(`${offenders.join(', ')} still calls /api/*`);
  return 'none';
});

check('decor images ship and every reference resolves', () => {
  // The catalogue names its images by path. A renamed or missing tile shows as
  // a flat colour at runtime rather than an error, so assert it at build time.
  const src = join(root, 'src', 'data', 'sources');
  const refs = new Set();
  for (const f of readdirSync(src).filter((n) => n.endsWith('.generated.ts'))) {
    for (const m of readFileSync(join(src, f), 'utf8').matchAll(/image:\s*"([^"]+)"/g)) {
      refs.add(m[1]);
    }
  }
  if (!refs.size) throw new Error('no decor images referenced — did the scrapers run?');

  const missing = [...refs].filter((r) => !existsSync(join(dist, r)));
  if (missing.length) {
    throw new Error(`${missing.length} referenced tile(s) absent from dist, e.g. ${missing[0]}`);
  }

  const dir = join(dist, 'decors');
  const count = existsSync(dir)
    ? readdirSync(dir).reduce((n, sub) => n + readdirSync(join(dir, sub)).length, 0)
    : 0;
  return `${refs.size} referenced, ${count} shipped`;
});

check('total payload is reasonable', () => {
  const walk = (dir) =>
    readdirSync(dir).reduce((sum, name) => {
      const full = join(dir, name);
      const s = statSync(full);
      return sum + (s.isDirectory() ? walk(full) : s.size);
    }, 0);

  const total = walk(dist);
  // Pages allows 1 GB per site; this is a sanity bound, not that limit.
  if (total > 50 * 1024 * 1024) throw new Error(`${kb(total)} is unexpectedly large`);
  return kb(total);
});

console.log();
if (failures) {
  console.log(`${failures} check(s) failed — Pages would serve a broken site.`);
  process.exit(1);
}
console.log(`Ready to publish. Base path: ${base}`);

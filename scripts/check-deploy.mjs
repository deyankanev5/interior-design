/**
 * Pre-flight check for a Static Web Apps deployment.
 *
 *   npm run deploy:check
 *
 * Validates everything that can be validated without contacting Azure: the
 * built artefacts exist and are non-trivial, the Functions bundles registered
 * their handlers, and staticwebapp.config.json is coherent with the deploy
 * scripts. Exits non-zero on anything that would produce a broken deployment.
 *
 * It deliberately does NOT call `swa deploy --dry-run`: that still contacts
 * Azure and fails on a missing token, so it cannot tell you whether your build
 * is sound. To exercise the real upload path once you have a token:
 *
 *   SWA_CLI_DEPLOYMENT_TOKEN=<token> npm run deploy -- --dry-run
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
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

const path = (...p) => join(root, ...p);

function mustExist(rel) {
  const full = path(rel);
  if (!existsSync(full)) throw new Error(`missing ${rel} — run "npm run build" and "npm run build:api"`);
  return full;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/* ------------------------------------------------------------ front end -- */

check('dist/index.html exists', () => {
  const html = readFileSync(mustExist('dist/index.html'), 'utf8');
  if (!html.includes('<div id="root">')) throw new Error('does not contain the app mount point');
  return kb(Buffer.byteLength(html));
});

check('dist assets are built', () => {
  const dir = mustExist('dist/assets');
  const files = readdirSync(dir);
  const js = files.filter((f) => f.endsWith('.js'));
  const css = files.filter((f) => f.endsWith('.css'));
  if (!js.length) throw new Error('no JavaScript bundle');
  if (!css.length) throw new Error('no stylesheet');

  const total = files.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  return `${js.length} js, ${css.length} css, ${kb(total)} uncompressed`;
});

check('index.html references the built bundle', () => {
  const html = readFileSync(path('dist/index.html'), 'utf8');
  const ref = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  if (!ref) throw new Error('no /assets/*.js script tag');
  if (!existsSync(path('dist', ref))) throw new Error(`references ${ref}, which does not exist`);
  return ref;
});

/* ---------------------------------------------------------------- config -- */

const config = check('staticwebapp.config.json is valid', () => {
  const cfg = JSON.parse(readFileSync(mustExist('staticwebapp.config.json'), 'utf8'));
  if (!cfg.navigationFallback?.rewrite) throw new Error('no SPA navigation fallback — deep links will 404');
  if (!cfg.navigationFallback.exclude?.some((p) => p.startsWith('/api'))) {
    throw new Error('navigationFallback does not exclude /api/* — API routes would be swallowed');
  }
  return `apiRuntime ${cfg.platform?.apiRuntime ?? 'unset'}`;
}) ?? {};

check('deploy scripts agree with the declared API runtime', () => {
  const pkg = JSON.parse(readFileSync(path('package.json'), 'utf8'));
  const cfg = JSON.parse(readFileSync(path('staticwebapp.config.json'), 'utf8'));

  const declared = String(cfg.platform?.apiRuntime ?? '').split(':')[1];
  if (!declared) throw new Error('staticwebapp.config.json declares no platform.apiRuntime');

  const scripts = Object.entries(pkg.scripts).filter(([n]) => n.startsWith('deploy'));
  for (const [name, body] of scripts) {
    const used = body.match(/--api-version\s+(\d+)/)?.[1];
    if (!used) continue;
    if (used !== declared) {
      throw new Error(`script "${name}" passes --api-version ${used} but config declares node:${declared}`);
    }
  }
  return `node:${declared} everywhere`;
});

/* -------------------------------------------------------------- functions -- */

check('Functions bundles are built', () => {
  const dir = mustExist('api/dist/functions');
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  if (!files.length) throw new Error('no bundles — run "npm run build:api"');
  return files.join(', ');
});

check('api/package.json main matches the bundle location', () => {
  const pkg = JSON.parse(readFileSync(mustExist('api/package.json'), 'utf8'));
  if (!pkg.main) throw new Error('no "main" — the Functions host will register nothing');
  if (!pkg.main.includes('dist/functions')) {
    throw new Error(`main is "${pkg.main}", but bundles are written to dist/functions`);
  }
  return pkg.main;
});

check('@azure/functions is a runtime dependency', () => {
  const pkg = JSON.parse(readFileSync(path('api/package.json'), 'utf8'));
  if (!pkg.dependencies?.['@azure/functions']) {
    throw new Error('missing from "dependencies" — it must ship, not just build');
  }
  return pkg.dependencies['@azure/functions'];
});

check('host.json declares the v4 extension bundle', () => {
  const host = JSON.parse(readFileSync(mustExist('api/host.json'), 'utf8'));
  if (host.version !== '2.0') throw new Error(`version is "${host.version}", expected "2.0"`);
  if (!host.extensionBundle?.version) throw new Error('no extensionBundle');
  return `bundle ${host.extensionBundle.version}`;
});

/* ------------------------------------------------------------------ done -- */

console.log();
if (failures) {
  console.log(`${failures} check(s) failed — fix these before deploying.`);
  process.exit(1);
}

console.log('Ready to deploy. Next:');
console.log("  export SWA_CLI_DEPLOYMENT_TOKEN='<token from ./infra/deploy.sh>'");
console.log('  npm run deploy');
if (config.platform?.apiRuntime) {
  console.log(`\nAPI will run on ${config.platform.apiRuntime}.`);
}

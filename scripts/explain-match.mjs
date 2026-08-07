/**
 * Explains a single matching decision, step by step, using the real engine.
 *
 *   node scripts/explain-match.mjs
 *
 * Locks EGGER U702 ST9 + H3303 ST10 as furniture — the pairing from the
 * original brief — and prints what the engine computes for the wall slot: the
 * anchor hue it derives, the target colour it aims at, and the ranked real
 * products with the distance that produced the ranking.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENTRY = `
import { hexToOklch, deltaEOk } from '../src/color/convert.ts';
import { SURFACE_RULES } from '../src/domain/surfaces.ts';
import { targetFor } from '../src/engine/harmony.ts';
import { targetDistance } from '../src/engine/generate.ts';
import { materialsFor, getMaterial, pairingsFor } from '../src/data/catalog.ts';
import { dominantHue } from '../src/engine/score.ts';

const u702 = getMaterial('egger-u702-st9');
const h3303 = getMaterial('egger-h3303-st10');

const show = (m) => {
  const c = hexToOklch(m.hex);
  return \`\${m.code} \${m.texture} \${m.name.padEnd(24)} \${m.hex}  L=\${c.L.toFixed(3)} C=\${c.C.toFixed(3)} h=\${c.h.toFixed(0)}deg  LRV=\${m.lrv.toFixed(0)}\`;
};

console.log('LOCKED (furniture)');
console.log('  ' + show(u702));
console.log('  ' + show(h3303));

const locked = [
  { surface: 'furniture', hex: u702.hex, materialId: u702.id, locked: true, id: 'a' },
  { surface: 'furniture', hex: h3303.hex, materialId: h3303.id, locked: true, id: 'b' },
];

const anchor = dominantHue(locked);
console.log(\`\\nANCHOR HUE (chroma-weighted circular mean): \${anchor.hue.toFixed(1)}deg\`);

const rule = SURFACE_RULES.wall;
console.log(\`\\nWALL ENVELOPE: L \${rule.L[0]}-\${rule.L[1]}, C \${rule.C[0]}-\${rule.C[1]}, area weight \${rule.areaWeight}\`);
console.log('  categories: ' + rule.categories.join(', '));

const target = targetFor('wall', anchor.hue, 'any', 0.5, 0);
console.log(\`\\nTARGET for the wall: L=\${target.L.toFixed(3)} C=\${target.C.toFixed(3)} h=\${target.h.toFixed(0)}deg\`);

const pool = materialsFor('wall', rule.categories);
console.log(\`\\nCANDIDATE POOL: \${pool.length} real products valid on a wall\`);

const pairing = pairingsFor(h3303.id);
const preferred = new Set(pairing ? pairing.ids : []);

const ranked = pool
  .map((m) => {
    const d = targetDistance(m, target);
    let score = 1 / (1 + d * 6);
    const nearest = Math.min(deltaEOk(u702.hex, m.hex), deltaEOk(h3303.hex, m.hex));
    if (nearest < 0.045) score *= 0.15;
    else if (nearest < 0.08) score *= 0.6;
    if (preferred.has(m.id)) score *= 2.2;
    if (m.provenance === 'manufacturer-decor') score *= 1.12;
    else if (m.provenance === 'standard') score *= 1.05;
    return { m, d, nearest, score, paired: preferred.has(m.id) };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 8);

console.log('\\nTOP 8 AFTER SCORING');
console.log('  score  dist   dE-to-locked  product');
for (const r of ranked) {
  console.log(
    \`  \${r.score.toFixed(3)}  \${r.d.toFixed(3)}  \${r.nearest.toFixed(3)}\${r.paired ? '  [EGGER-published pairing x2.2]' : '        '}  \${r.m.brand} \${r.m.code} \${r.m.texture ?? ''} \${r.m.name}\`,
  );
}

if (pairing) console.log('\\nPAIRING NOTE: ' + pairing.note);

// What the chroma-weighted hue term actually does.
console.log('\\nWHY HUE IS WEIGHTED BY CHROMA');
const grey = getMaterial('ral-ral-7035');
const green = pool.find((m) => hexToOklch(m.hex).C > 0.1);
for (const m of [grey, green].filter(Boolean)) {
  const c = hexToOklch(m.hex);
  let dh = Math.abs(c.h - target.h) % 360;
  if (dh > 180) dh = 360 - dh;
  const weight = Math.min(c.C, target.C) * 5;
  console.log(
    \`  \${(m.code + ' ' + m.name).padEnd(34)} C=\${c.C.toFixed(3)}  hue off by \${dh.toFixed(0)}deg  ->  hue term contributes \${((dh / 180) * weight).toFixed(4)}\`,
  );
}
console.log('  A near-neutral has almost no hue term: matching its hue angle is meaningless.');
console.log('  A saturated colour has a large one: its hue is the whole point.');
`;

// The entry lives inside the project so its relative imports resolve normally.
const root = fileURLToPath(new URL('..', import.meta.url));
const entryFile = `${root}.explain-entry.ts`;
const outFile = `${root}.explain-out.mjs`;
writeFileSync(entryFile, ENTRY.replaceAll('../src/', './src/'));

try {
  execFileSync(
    'npx',
    ['--yes', 'esbuild', entryFile, '--bundle', '--platform=node', '--format=esm', `--outfile=${outFile}`],
    { stdio: ['ignore', 'ignore', 'inherit'], cwd: root },
  );
  console.log(execFileSync('node', [outFile], { encoding: 'utf8' }));
} finally {
  rmSync(entryFile, { force: true });
  rmSync(outFile, { force: true });
}

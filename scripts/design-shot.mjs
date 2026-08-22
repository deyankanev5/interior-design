#!/usr/bin/env node
/**
 * Render a page and look at it.
 *
 *   node scripts/design-shot.mjs <url> [--out dir] [--dark] [--wait ms]
 *
 * Captures the page at five widths — including the awkward middle sizes that
 * break more often than the named breakpoints — plus light and dark, and
 * reports console errors and failed requests.
 *
 * Reading the resulting PNGs is the point. Code that reads well still produces
 * layouts that collide and rhythm that is invisible in the source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { delimiter } from "node:path";
import { execSync } from "node:child_process";

const VIEWPORTS = [
  { name: "mobile",  width: 390,  height: 844  },
  { name: "phablet", width: 540,  height: 900  }, // where single-column layouts give up
  { name: "tablet",  width: 834,  height: 1112 },
  { name: "laptop",  width: 1280, height: 800  },
  { name: "wide",    width: 1728, height: 1080 },
];

// Global install locations are discovered, not hardcoded: an earlier version
// baked this sandbox's /opt/node22 path into repos driven from Windows Git Bash.
function globalRoots() {
  const roots = [];
  if (process.env.NODE_PATH) roots.push(...process.env.NODE_PATH.split(delimiter));
  try {
    roots.push(execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  } catch {}
  return roots.filter(Boolean);
}

async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  for (const base of globalRoots()) {
    try {
      const require = createRequire(join(base, "noop.js"));
      return await import(require.resolve("playwright"));
    } catch {}
  }
  throw new Error(
    "playwright not found. Install it locally (`npm i -D playwright`) or globally " +
    "(`npm i -g playwright`).\nIf Chromium is already provided by the environment, " +
    "set PLAYWRIGHT_BROWSERS_PATH, or CHROMIUM_PATH to the binary."
  );
}

// Flag VALUES must not be eligible to become the URL: `--wait 800 <url>` used to
// navigate to "800" and then blame the page for ten failed screenshots.
const argv = process.argv.slice(2);
const opts = { out: "design-shots", wait: "400", dark: false };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dark") { opts.dark = true; }
  else if (a === "--out" || a === "--wait") {
    const v = argv[++i];
    if (v === undefined || v.startsWith("--")) {
      console.error(`${a} requires a value`); process.exit(2);
    }
    opts[a.slice(2)] = v;
  }
  else if (a.startsWith("--")) { console.error(`unknown flag: ${a}`); process.exit(2); }
  else positional.push(a);
}
if (positional.length > 1) { console.error(`expected one URL, got: ${positional.join(", ")}`); process.exit(2); }

const url = positional[0] || "http://localhost:3000";
const outDir = opts.out;
const settle = Number.isFinite(Number(opts.wait)) ? Number(opts.wait) : 400;
const schemes = opts.dark ? ["light", "dark"] : ["light"];

if (!/^https?:\/\//i.test(url)) {
  console.error(`not a URL: ${url}\nusage: design-shot.mjs <url> [--out dir] [--wait ms] [--dark]`);
  process.exit(2);
}

const pw = await loadPlaywright();
// A globally-resolved copy is CJS, so its exports arrive under `default`.
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) throw new Error("playwright loaded but exposes no chromium export");

mkdirSync(outDir, { recursive: true });

const problems = [];
let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  // Preinstalled Chromium, when the bundled browser path is not discoverable.
  const explicit = process.env.CHROMIUM_PATH;
  if (!explicit) throw e;
  browser = await chromium.launch({ executablePath: explicit });
}

const shots = [];
for (const scheme of schemes) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: scheme,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`[${scheme}/${vp.name}] console: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`[${scheme}/${vp.name}] pageerror: ${e.message}`));
    page.on("requestfailed", (r) =>
      problems.push(`[${scheme}/${vp.name}] request failed: ${r.url()} — ${r.failure()?.errorText}`));

    try {
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      if (res && res.status() >= 400) problems.push(`[${scheme}/${vp.name}] HTTP ${res.status()}`);
    } catch (e) {
      problems.push(`[${scheme}/${vp.name}] navigation failed: ${e.message}`);
      await ctx.close();
      continue;
    }

    await page.waitForTimeout(settle);

    // Horizontal overflow is the single most common responsive defect and is
    // invisible in a full-page screenshot, so measure it rather than eyeball it.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 0) problems.push(`[${scheme}/${vp.name}] page scrolls horizontally by ${overflow}px`);

    const file = join(outDir, `${scheme}-${vp.name}-${vp.width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
    await ctx.close();
  }
}
await browser.close();

const report =
  `url: ${url}\nshots: ${shots.length}\n\n` +
  shots.map((s) => `  ${s}`).join("\n") +
  `\n\nproblems: ${problems.length}\n` +
  (problems.length ? problems.map((p) => `  - ${p}`).join("\n") : "  none detected") +
  `\n\nNow READ the PNGs. Automated checks catch overflow and errors; they cannot\n` +
  `tell you whether the hierarchy works or the rhythm is accidental.\n`;

writeFileSync(join(outDir, "report.txt"), report);
console.log(report);
process.exit(problems.length ? 1 : 0);

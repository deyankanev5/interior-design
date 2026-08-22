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

const VIEWPORTS = [
  { name: "mobile",  width: 390,  height: 844  },
  { name: "phablet", width: 540,  height: 900  }, // where single-column layouts give up
  { name: "tablet",  width: 834,  height: 1112 },
  { name: "laptop",  width: 1280, height: 800  },
  { name: "wide",    width: 1728, height: 1080 },
];

async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  // Fall back to the globally installed copy.
  for (const base of ["/opt/node22/lib/node_modules", "/usr/lib/node_modules", "/usr/local/lib/node_modules"]) {
    try {
      const require = createRequire(join(base, "noop.js"));
      return await import(require.resolve("playwright"));
    } catch {}
  }
  throw new Error(
    "playwright not found. Install it locally (`npm i -D playwright`) or globally.\n" +
    "Do NOT run `playwright install` here — Chromium is preinstalled at " +
    (process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers") + "."
  );
}

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) || "http://localhost:3000";
const outDir = (args.includes("--out") ? args[args.indexOf("--out") + 1] : null) || "design-shots";
const settle = Number(args.includes("--wait") ? args[args.indexOf("--wait") + 1] : 400);
const schemes = args.includes("--dark") ? ["light", "dark"] : ["light"];

const pw = await loadPlaywright();
// A globally-resolved copy is CJS, so its exports arrive under `default`.
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) throw new Error("playwright loaded but exposes no chromium export");

mkdirSync(outDir, { recursive: true });

const problems = [];
let browser;
try {
  browser = await chromium.launch();
} catch {
  // Preinstalled Chromium, when the bundled browser path is not discoverable.
  browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
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

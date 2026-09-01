/**
 * Screenshot the app at a set of viewports and panel states.
 *
 *   node scripts/design-shot.mjs [outDir]
 *
 * Design work needs to be judged from what the browser actually paints, not
 * from the markup. This drives the built app and writes one PNG per
 * (viewport × view) so a change can be compared side by side.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? './design-shots';
const BASE = process.env.SHOT_URL ?? 'http://localhost:4173/interior-design';

const VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 900, mobile: false },
  { name: 'laptop', width: 1180, height: 800, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

/** Each view is a name plus what to click to get there. */
const VIEWS = [
  { name: 'palette', open: null },
  { name: 'slot', open: 'slot' },
  { name: 'colour', open: 'slot', then: 'Colour' },
  { name: 'browse', open: 'slot', then: 'Browse' },
  { name: 'library', open: 'Library' },
  { name: 'variations', open: 'Variations' },
  { name: 'analysis', open: 'Analysis' },
  { name: 'room', open: 'Room' },
  { name: 'export', open: 'Export' },
  { name: 'import', open: 'Import' },
  { name: 'rooms', open: 'Rooms' },
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});

for (const vp of VIEWPORTS) {
  for (const scheme of ['dark', 'light']) {
    // Light mode is only worth a full sweep on one viewport; the tokens are
    // shared, so a second pass would show the same thing at another width.
    const views = scheme === 'light' ? VIEWS.slice(0, 3) : VIEWS;

    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      // `isMobile` is deliberately not set. It gives Chromium a layout viewport
      // larger than the one the screenshot captures, so anything anchored to
      // the bottom of the viewport lands below the crop and reads as clipped
      // when it is not. `hasTouch` is what actually matters here: it is what
      // makes `hover: none` apply, which is the thing the layout responds to.
      hasTouch: vp.mobile,
      colorScheme: scheme,
    });

    for (const view of views) {
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      if (view.open === 'slot') {
        await page.click('.slot >> nth=0 >> .slot-open');
        await page.waitForTimeout(450);
      } else if (view.open) {
        let btn = page.locator(`.toolbar button:has-text("${view.open}")`).first();
        // On a phone the secondary panels live behind More rather than in the
        // bottom bar, so getting to them takes the same two taps a user makes.
        if (!(await btn.isVisible().catch(() => false))) {
          await page.click('.more-btn');
          await page.waitForTimeout(350);
          btn = page.locator(`.menu-item:has-text("${view.open}")`).first();
        }
        if (await btn.count()) {
          await btn.click();
          await page.waitForTimeout(600);
        }
      }

      if (view.then) {
        await page.click(`.tab:has-text("${view.then}")`);
        await page.waitForTimeout(400);
      }

      // Let lazy decor tiles settle so the shot shows what a user sees.
      await page.waitForTimeout(500);
      const file = join(OUT, `${vp.name}-${scheme}-${view.name}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }

    await page.close();
  }
}

await browser.close();

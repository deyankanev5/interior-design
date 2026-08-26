/**
 * End-to-end smoke test.
 *
 * Drives the built app in a real browser and asserts the behaviours that are
 * easy to break silently: locks surviving generation, presets round-tripping,
 * and the palette encoding in the URL decoding back to the same scheme.
 *
 *   npm run build && npm run preview &   # then, in another shell:
 *   npm run smoke
 */
import { chromium } from 'playwright';

const SHOT = process.env.SMOKE_OUT ?? './.smoke';
const errors = [];
// CHROME_PATH lets CI point at a preinstalled browser; otherwise Playwright's own.
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: 'dark' });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
// A decor tile that 404s degrades to a flat colour rather than erroring, so
// watch the network as well as the console.
page.on('response', (r) => {
  if (r.url().includes('/decors/') && !r.ok()) errors.push(`DECOR ${r.status()}: ${r.url()}`);
});

const readSlots = () =>
  page.$$eval('.slot', (els) =>
    els.map((e) => ({
      hex: e.querySelector('.slot-hex')?.textContent,
      code: e.querySelector('.slot-code')?.textContent ?? null,
      name: e.querySelector('.slot-name')?.textContent,
      role: e.querySelector('.surface-pill span[aria-hidden]')?.textContent,
    })),
  );

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173';
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// ---- the user's stated scenario -------------------------------------------
// Furniture is fixed: EGGER U702 ST9 + H3303 ST10. What do the walls and floor become?
console.log('=== scenario: locked furniture pairing ===');
await page.click('.toolbar button[title*="Browse and import"]');
await page.waitForTimeout(400);

await page.click('.panel .chip:has-text("3 ·")').catch(() => {});
await page.waitForTimeout(200);
await page.fill('.panel input.input', 'u702');
await page.waitForTimeout(400);
await page.click('.panel .mat >> nth=0');
await page.waitForTimeout(300);

await page.click('.panel .chip:has-text("4 ·")').catch(() => {});
await page.waitForTimeout(200);
await page.fill('.panel input.input', 'h3303 st10');
await page.waitForTimeout(400);
await page.click('.panel .mat >> nth=0');
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

await page.selectOption('.slot >> nth=2 >> select', 'furniture');
await page.selectOption('.slot >> nth=3 >> select', 'furniture');
await page.waitForTimeout(200);
await page.keyboard.press('3');
await page.keyboard.press('4');
await page.waitForTimeout(200);
console.log('locked pair:', JSON.stringify((await readSlots()).slice(2, 4)));

for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
}
const scenario = await readSlots();
console.log('resulting scheme:');
for (const s of scenario) console.log('  ', s.role, '|', s.code, s.name, s.hex);
console.log(
  'locked pair survived generation:',
  scenario[2].code?.includes('U702') && scenario[3].code?.includes('H3303'),
);

await page.click('.toolbar button[title*="Design review"]');
await page.waitForTimeout(500);
console.log('review score:', await page.locator('.score b').textContent());
await page.screenshot({ path: `${SHOT}/shot-analysis.png` });
await page.keyboard.press('Escape');

// ---- presets ---------------------------------------------------------------
console.log('\n=== presets ===');
await page.click('.toolbar button[title="Saved rooms"]');
await page.waitForTimeout(300);
await page.fill('.panel input.input', 'Bedroom');
await page.click('.panel button:has-text("Save")');
await page.waitForTimeout(300);
console.log('saved rooms:', await page.locator('.panel .preset').count());
console.log('toolbar shows:', await page.locator('.brand span').textContent());
await page.keyboard.press('Escape');
await page.keyboard.press('Space');
await page.waitForTimeout(300);
await page.click('.toolbar button[title="Saved rooms"]');
await page.waitForTimeout(300);
await page.click('.panel .preset .mat-info');
await page.waitForTimeout(400);
console.log('preset restored same scheme:', JSON.stringify(await readSlots()) === JSON.stringify(scenario));
await page.keyboard.press('Escape');

// ---- variations ------------------------------------------------------------
console.log('\n=== variations ===');
await page.click('.toolbar button[title*="Compare whole"]');
await page.waitForTimeout(1200);
console.log('variation cards:', await page.locator('.variation').count());
const strips = await page.$$eval('.variation-strip', (els) =>
  els.map((s) => [...s.children].map((c) => getComputedStyle(c).backgroundColor)),
);
console.log(
  'locked slots identical across all variations:',
  new Set(strips.map((v) => v[2])).size === 1 && new Set(strips.map((v) => v[3])).size === 1,
);
await page.screenshot({ path: `${SHOT}/shot-variations.png` });
await page.keyboard.press('Escape');

// ---- room preview ----------------------------------------------------------
await page.click('.toolbar button[title*="applied to a room"]');
await page.waitForTimeout(500);
console.log('\nroom svg present:', await page.locator('.panel svg.room').count());
await page.screenshot({ path: `${SHOT}/shot-room.png` });
await page.keyboard.press('Escape');

// ---- real supplier decor photographs render ---------------------------------
console.log('\n=== decor images ===');
{
  const imgs = await page.$$eval('.slot .decor-img', (els) =>
    els.map((e) => ({ src: e.getAttribute('src'), w: e.naturalWidth })),
  );
  console.log('slots showing a supplier photograph:', imgs.length);
  console.log('all decoded:', imgs.length > 0 && imgs.every((i) => i.w > 0));
  console.log('served from the base path:', imgs.every((i) => i.src?.includes('/decors/')));
}

// ---- no AI surface remains --------------------------------------------------
console.log('\n=== AI removed ===');
console.log('brief button absent:', (await page.locator('.toolbar button:has-text("Brief")').count()) === 0);

// ---- import works without a server ------------------------------------------
await page.click('.toolbar button[title*="Import from"]');
await page.waitForTimeout(500);
await page.fill('.panel input.input', 'https://www.pinterest.com/pin/12345/');
await page.click('.panel button:has-text("Fetch")');
await page.waitForTimeout(600);
const pinMsg = await page.locator('.panel .err').first().textContent().catch(() => null);
console.log('pinterest link explained, not silently broken:', /Copy image/.test(pinMsg ?? ''));
console.log('drop zone present:', (await page.locator('.panel .drop').count()) === 1);
await page.keyboard.press('Escape');

// ---- export ----------------------------------------------------------------
console.log('\n=== export ===');
await page.click('.toolbar button[title*="Export the"]');
await page.waitForTimeout(300);
const dl = page.waitForEvent('download', { timeout: 8000 });
await page.click('.panel button:has-text("Finish schedule")');
const file = await dl;
console.log('downloaded:', file.suggestedFilename());
await page.keyboard.press('Escape');

// ---- url round trip --------------------------------------------------------
const url = page.url();
console.log('\nurl length:', url.length);
const page2 = await browser.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: 'dark' });
await page2.goto(url, { waitUntil: 'networkidle' });
await page2.waitForTimeout(500);
const reopened = await page2.$$eval('.slot', (els) => els.map((e) => e.querySelector('.slot-hex')?.textContent));
console.log('url round trip matches:', JSON.stringify(reopened) === JSON.stringify(scenario.map((s) => s.hex)));
await page2.close();

await page.screenshot({ path: `${SHOT}/shot-dark.png` });

console.log('\nERRORS:', errors.length ? errors : 'none');
await browser.close();

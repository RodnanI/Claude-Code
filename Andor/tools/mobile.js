// Mobile layout check: phone portrait, phone landscape, tablet. Taps through
// the boot screen into chapter I and screenshots the play view with controls.
//   node tools/mobile.js outdir
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const outDir = process.argv[2] || '.';
const file = 'file://' + path.resolve(__dirname, '..', 'Andor.html');
const DEVICES = [
  ['phone_portrait', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['phone_landscape', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['tablet', { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
];
(async () => {
  const browser = await pw.chromium.launch();
  for (const [name, opts] of DEVICES) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(file);
    await page.waitForTimeout(500);
    const vp = opts.viewport;
    await page.touchscreen.tap(vp.width / 2, vp.height / 2);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, name + '_title.png') });
    await page.evaluate(() => {
      const A = window.__andor;
      A.Game.save.difficulty = 'adventurer';
    });
    await page.goto('about:blank');
    await page.goto(file + '#level=0');
    await page.waitForTimeout(300);
    // a touch to switch the UI into touch mode, then hold the jump button
    await page.touchscreen.tap(vp.width / 2, 40);
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const A = window.__andor;
      return { S: A.Screen.S, W: A.Screen.W, H: A.Screen.H, vw: A.Screen.vw, vh: A.Screen.vh, portrait: A.Screen.portrait, touch: A.Input.touchMode, controls: A.Input.controls.map((c) => [c.id, Math.round(c.x), Math.round(c.y), Math.round(c.r)]) };
    });
    await page.screenshot({ path: path.join(outDir, name + '_play.png') });
    console.log(name, JSON.stringify(info), errors.length ? errors : 'ok');
    await ctx.close();
  }
  await browser.close();
})();

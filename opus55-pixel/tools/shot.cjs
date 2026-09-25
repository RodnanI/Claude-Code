// Screenshot / smoke test helper.
//   node tools/shot.cjs "<query>" out.png [waitMs] [script.js]
// Loads dist/returning-swallow.html, prints console errors, saves a screenshot.
const path = require('path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const [q = '', out = 'shot.png', wait = '600', script] = process.argv.slice(2);
  const file = 'file://' + path.resolve(__dirname, '../dist/returning-swallow.html') + (q ? '?' + q : '');
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[t]')) console.log('console.' + m.type() + ':', m.text()); });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n')));
  await page.goto(file);
  await page.waitForTimeout(+wait);
  if (script) {
    const fn = require(path.resolve(script));
    await fn(page);
  }
  await page.locator('#screen').screenshot({ path: out });
  await browser.close();
})();

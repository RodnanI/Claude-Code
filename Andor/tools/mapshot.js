// Render a full level via the game's own renderer: node tools/mapshot.js <idx> out.png
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const [idx = '0', out = 'map.png'] = process.argv.slice(2);
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.stack || e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'Andor.html') + '#map=' + idx);
  await page.waitForFunction(() => window.__map, null, { timeout: 20000 }).catch(() => {});
  const data = await page.evaluate(() => window.__map);
  if (data) fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(errs.length ? errs.join('\n') : 'ok');
  await browser.close();
})();

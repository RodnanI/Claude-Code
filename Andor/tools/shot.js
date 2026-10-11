// Screenshot helper. Usage:
//   node tools/shot.js "<hash>" out.png [width] [height] [waitMs] [script.json]
// script.json (optional): [{"t": ms, "down": "KeyX"} | {"t": ms, "up": "KeyX"} | {"t": ms, "shot": "file.png"}]
// Prints console errors and page errors.
const path = require('path');
const fs = require('fs');
let pw;
try {
  pw = require('playwright');
} catch (e) {
  pw = require('/opt/node22/lib/node_modules/playwright');
}
(async () => {
  const [hash = '', out = 'shot.png', w = '1280', h = '720', wait = '1500', scriptFile] = process.argv.slice(2);
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
    else if (process.env.LOG) console.log('[log]', m.text());
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e.stack || e.message)));
  const file = 'file://' + path.resolve(__dirname, '..', 'Andor.html') + (hash ? '#' + hash.replace(/^#/, '') : '');
  await page.goto(file);
  if (scriptFile) {
    const steps = JSON.parse(fs.readFileSync(scriptFile, 'utf8'));
    let t0 = 0;
    for (const s of steps) {
      if (s.t > t0) await page.waitForTimeout(s.t - t0);
      t0 = Math.max(t0, s.t);
      if (s.down) await page.keyboard.down(s.down);
      if (s.up) await page.keyboard.up(s.up);
      if (s.press) await page.keyboard.press(s.press);
      if (s.eval) await page.evaluate(s.eval);
      if (s.shot) await page.screenshot({ path: path.resolve(path.dirname(scriptFile), s.shot) });
    }
  } else {
    await page.waitForTimeout(+wait);
  }
  await page.screenshot({ path: out });
  if (errors.length) console.log(errors.join('\n'));
  else console.log('no console errors');
  await browser.close();
})();

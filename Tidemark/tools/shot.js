// Screenshot helper: node tools/shot.js "<query>" out.png [width height wait]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const q = process.argv[2] || '', out = process.argv[3] || 'shot.png';
  const w = +(process.argv[4] || 1400), h = +(process.argv[5] || 900), wait = +(process.argv[6] || 1500);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text()); });
  await p.goto('file://' + require('path').join(__dirname, '..', 'TIDEMARK.html') + (q ? '?' + q : ''));
  await p.waitForTimeout(wait);
  await p.screenshot({ path: out });
  const perf = await p.evaluate(() => window.__perf || null);
  if (perf) console.log('perf', JSON.stringify(perf));
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();

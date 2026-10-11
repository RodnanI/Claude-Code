// Smoke test: plays each chapter and each boss with semi-random input and
// reports runtime errors plus a few state numbers. Screenshots go to argv[2].
//   node tools/smoke.js /tmp/out
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const outDir = process.argv[2] || '.';
const file = 'file://' + path.resolve(__dirname, '..', 'Andor.html');

async function run(page, hash, ms, label, keysFn) {
  await page.goto('about:blank');
  await page.goto(file + '#' + hash);
  await page.waitForTimeout(300);
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < ms) {
    const k = keysFn(i++);
    for (const [key, dur] of k) {
      await page.keyboard.down(key);
      await page.waitForTimeout(dur);
      await page.keyboard.up(key);
    }
  }
  await page.screenshot({ path: path.join(outDir, label + '.png') });
  return page.evaluate(() => {
    const A = window.__andor;
    const G = A.Game;
    return { state: G.state, hp: G.player && G.player.hp, x: G.player && Math.round(G.player.x / 16), boss: G.boss ? { hp: G.boss.hp, max: G.boss.maxHp, st: G.boss.state, active: G.boss.active } : null, ents: G.entities.length, parts: A.Parts.list.length };
  });
}

(async () => {
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('[pageerror] ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  const runner = (i) => {
    const r = (i * 7919) % 13;
    if (r < 6) return [['ArrowRight', 160], ['Space', 120]];
    if (r < 8) return [['KeyX', 60], ['ArrowRight', 200]];
    if (r < 10) return [['ArrowRight', 80], ['KeyC', 50]];
    if (r < 11) return [['ArrowLeft', 120]];
    return [['Space', 200], ['KeyX', 60]];
  };
  const fighter = (i) => {
    const r = (i * 104729) % 11;
    if (r < 3) return [['KeyX', 60]];
    if (r < 5) return [['Space', 150], ['KeyX', 60]];
    if (r < 7) return [['ArrowLeft', 140], ['KeyX', 60]];
    if (r < 9) return [['ArrowRight', 140], ['KeyX', 60]];
    return [['KeyC', 60]];
  };
  const results = {};
  for (let lv = 0; lv < 4; lv++) results['level' + lv] = await run(page, 'level=' + lv + '&god', 9000, 'smoke_level' + lv, runner);
  const arenas = [[249, 19], [236, 18], [303, 27], [244, 24]];
  for (let lv = 0; lv < 4; lv++) {
    const [x, y] = arenas[lv];
    results['boss' + lv] = await run(page, `level=${lv}&x=${x}&y=${y}&god`, 14000, 'smoke_boss' + lv, fighter);
  }
  console.log(JSON.stringify(results, null, 1));
  console.log(errors.length ? errors.slice(0, 20).join('\n') : 'no errors');
  await browser.close();
})();

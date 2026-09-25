// Scripted play session: node tools/drive.cjs <query> <outPrefix> <scenario>
// Scenarios press real keys through Playwright and capture screenshots.
const path = require('path');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const SCEN = require(path.resolve(__dirname, 'scenarios.cjs'));
(async () => {
  const [q = 'level=0', out = 'drive', name = 'ch1'] = process.argv.slice(2);
  const file = 'file://' + path.resolve(__dirname, '../dist/returning-swallow.html') + '?' + q;
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') { errs.push(m.text()); console.log('console.error:', m.text()); } });
  page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR:', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
  await page.goto(file);
  await page.waitForTimeout(400);
  let n = 0;
  const api = {
    page,
    wait: ms => page.waitForTimeout(ms),
    hold: async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); },
    tap: async (key, gap = 70) => { await page.keyboard.down(key); await page.waitForTimeout(40); await page.keyboard.up(key); await page.waitForTimeout(gap); },
    shot: async label => { n++; const f = `${out}-${String(n).padStart(2, '0')}-${label}.png`; await page.locator('#screen').screenshot({ path: f }); console.log('shot', path.basename(f)); },
    ev: fn => page.evaluate(fn),
    skipTalk: async (max = 40) => { for (let i = 0; i < max; i++) { const act = await page.evaluate(() => !!(window.RS.G.script) || document.hidden); if (!act) break; await page.keyboard.down('Enter'); await page.waitForTimeout(40); await page.keyboard.up('Enter'); await page.waitForTimeout(90); } },
    state: () => page.evaluate(() => { const p = window.RS.G.player; return { x: Math.round(p.x), y: Math.round(p.y), hp: p.hp, st: p.st, anim: p.anim, script: !!window.RS.G.script, ents: window.RS.G.ents.length, boss: window.RS.G.boss ? window.RS.G.boss.hp : null }; }),
  };
  try { await SCEN[name](api); } catch (e) { console.log('SCENARIO ERROR', e.message); }
  console.log('errors:', errs.length);
  await browser.close();
})();

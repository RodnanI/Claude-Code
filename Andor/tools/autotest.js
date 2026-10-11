// Closed-loop section tests driven by an in-page autopilot.
//   node tools/autotest.js <test> outdir
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const [test = 'boulder', outDir = '.'] = process.argv.slice(2);
const file = 'file://' + path.resolve(__dirname, '..', 'Andor.html');

// Each pilot runs inside the page every fixed step, setting held keys.
const PILOTS = {
  // Grab the idol, then run right: jump pits, roll the final slot.
  boulder: `(G, I) => {
    const p = G.player, L = G.level;
    if (!p || G.state !== 'play') return;
    const k = I.kb; k.right = true; k.roll = false;
    window.__hold = Math.max(0, (window.__hold || 0) - 1); k.jump = window.__hold > 0;
    const tx = Math.floor((p.cx + 10) / 16), feetRow = Math.floor((p.y + p.h + 2) / 16);
    const ahead = (dx) => L.tileAt(Math.floor((p.cx + dx) / 16), feetRow);
    const pit = (t) => t === 0 || (t >= 5 && t <= 8);
    if (p.onGround && (pit(ahead(14)) || pit(ahead(20)))) { k.jump = true; I._pend.jump = true; window.__hold = 18; }
    const low = L.tileAt(Math.floor((p.cx + 18) / 16), Math.floor((p.y + 2) / 16));
    if (p.onGround && (low === 1 || low === 2) && p.state === 'normal') I._pend.roll = true;
    window.__log = window.__log || [];
    if (G.time % 0.5 < 0.017) window.__log.push([Math.round(p.x / 16), p.state, p.hp, G.boulders.map(b => b.dead ? 'X' : Math.round(b.x / 16))]);
  }`,
  // Climb the wind-catcher shaft in chapter I by wall jumping.
  shaft: `(G, I) => {
    const p = G.player, L = G.level;
    if (!p || G.state !== 'play') return;
    const k = I.kb;
    window.__t = (window.__t || 0) + 1;
    if (!window.__phase) window.__phase = 'in';
    if (window.__phase === 'in') { k.right = true; if (p.x > 173 * 16) window.__phase = 'climb'; return; }
    // alternate walls: push toward the current wall, jump when sliding
    if (window.__dir === undefined) window.__dir = 1;
    k.right = window.__dir > 0; k.left = window.__dir < 0;
    if (p.wallDir && p.vy > -20) { I._pend.jump = true; window.__dir = -window.__dir; }
    if (p.onGround && window.__t % 20 === 0) I._pend.jump = true;
    window.__log = window.__log || [];
    if (window.__t % 30 === 0) window.__log.push([Math.round(p.x / 16 * 10) / 10, Math.round(p.y / 16 * 10) / 10, p.state, p.wallDir]);
  }`,
};
PILOTS.djinn = `(G, I) => {
    const p = G.player, b = G.boss;
    if (!p || G.state !== 'play') return;
    const k = I.kb; k.left = k.right = false;
    window.__t = (window.__t || 0) + 1;
    if (!b || !b.active) { k.right = true; return; }
    // stand under the action; lash any slammed fist in reach, or the sagging head
    const f = b.fists.find((f) => f.state === 'down' && Math.abs(f.x - p.cx) < 60);
    if (f) { p.face = Math.sign(f.x - p.cx) || 1; if (Math.abs(f.x - p.cx) > 30) (f.x > p.cx ? k.right = true : k.left = true); else if (window.__t % 12 === 0) I._pend.whip = true; }
    else if (b.state === 'tired' && window.__t % 10 === 0) { I.kb.up = true; I._pend.jump = true; I._pend.whip = true; }
    else { const tx = b.cx + Math.sin(window.__t / 60) * 80; if (Math.abs(tx - p.cx) > 10) (tx > p.cx ? k.right = true : k.left = true); }
    if (b.state !== 'tired') I.kb.up = false;
    window.__log = window.__log || [];
    if (window.__t % 60 === 0) window.__log.push([b.hp, b.state, p.hp]);
  }`;
PILOTS.pharaoh = `(G, I) => {
    const p = G.player, b = G.boss, L = G.level;
    if (!p || G.state !== 'play') return;
    const k = I.kb; k.left = k.right = false; k.up = false;
    window.__t = (window.__t || 0) + 1;
    if (!b || !b.active) { k.right = true; return; }
    // get under him, jump and lash upward
    const dx = b.cx - p.cx;
    if (Math.abs(dx) > 14) (dx > 0 ? k.right = true : k.left = true);
    if (p.onGround && Math.abs(dx) < 40 && window.__t % 30 === 0) { I._pend.jump = true; window.__hold = 16; }
    window.__hold = Math.max(0, (window.__hold || 0) - 1); k.jump = window.__hold > 0;
    if (!p.onGround && p.vy > -60 && p.vy < 60) { k.up = true; I._pend.whip = true; }
    window.__log = window.__log || [];
    if (window.__t % 60 === 0) window.__log.push([b.hp, b.state, p.hp]);
  }`;
const SETUP = {
  djinn: 'level=3&x=246&y=24&god',
  pharaoh: 'level=2&x=304&y=27&god',
  boulder: 'level=2&x=210&y=27',
  shaft: 'level=0&x=168&y=11',
};

(async () => {
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack || e.message));
  await page.goto(file + '#' + SETUP[test]);
  await page.waitForTimeout(400);
  await page.evaluate('window.__autopilot = ' + PILOTS[test]);
  for (let i = 0; i < (+process.env.N || 6); i++) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, `${test}_${i}.png`) });
  }
  const log = await page.evaluate(() => window.__log);
  console.log(JSON.stringify(log));
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();

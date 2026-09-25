// Test scenarios. autofight() is a crude autopilot: approach the nearest
// enemy, attack in bursts, jump occasionally, dodge now and then.
global.autofight = autofight;
async function autofight(a, ms, opt = {}) {
  const t0 = Date.now();
  let shots = 0;
  while (Date.now() - t0 < ms) {
    const s = await a.ev(() => {
      const G = window.RS.G, p = G.player;
      const foes = G.ents.filter(e => (e.team === 2 || e.team === 3) && !e.dead && e.hittable);
      foes.sort((x, y) => Math.abs(x.x - p.x) - Math.abs(y.x - p.x));
      const f = foes[0];
      return { px: p.x, py: p.y, fx: f ? f.x : null, fy: f ? f.y : null, n: foes.length, script: !!G.script, dlg: window.RS.G && document.querySelector('canvas') && 0, boss: G.boss ? Math.round(G.boss.hp) : null, dead: p.dead, over: !!(window.RS.Scenes.cur.over) };
    });
    if (s.over) { console.log('player died'); return 'dead'; }
    if (s.script) { await a.tap('Enter', 60); continue; }
    if (s.fx === null) { if (opt.stopWhenClear) return 'clear'; await a.hold('KeyD', 200); continue; }
    const dx = s.fx - s.px;
    if (Math.abs(dx) > 34) await a.hold(dx > 0 ? 'KeyD' : 'KeyA', Math.min(300, Math.abs(dx) * 5));
    else {
      await a.hold(dx > 0 ? 'KeyD' : 'KeyA', 30);
      const r = Math.random();
      if (r < 0.15) { await a.page.keyboard.down('KeyW'); await a.tap('KeyJ', 60); await a.page.keyboard.up('KeyW'); await a.tap('Space', 60); for (let i = 0; i < 3; i++) await a.tap('KeyJ', 110); }
      else if (r < 0.22) await a.tap('KeyI', 150);
      else if (r < 0.3) await a.tap('KeyU', 80);
      else for (let i = 0; i < 4; i++) await a.tap('KeyJ', 100);
    }
    if (opt.shotEvery && Date.now() - t0 > (shots + 1) * opt.shotEvery) { shots++; await a.shot('fight' + shots); console.log(JSON.stringify(s)); }
  }
  return 'timeout';
}

module.exports = {
  async ch1(a) {
    await a.wait(3500);
    await a.skipTalk();
    await a.hold('KeyD', 1500);
    await a.skipTalk();
    await a.hold('KeyD', 2400);
    await a.skipTalk();
    await a.shot('yard');
    console.log(await autofight(a, 12000, { stopWhenClear: false }));
    await a.shot('after');
  },
  async boss(a) {
    await a.wait(1500);
    await a.skipTalk(60);
    await a.hold('KeyD', 900);
    await a.skipTalk(60);
    await a.wait(600);
    await a.shot('intro');
    const r = await autofight(a, 90000, { shotEvery: 12000 });
    console.log('result', r, await a.state());
    await a.shot('end');
    await a.skipTalk(60);
    await a.wait(1500);
    await a.shot('after');
  },
  async arena(a) {
    await a.wait(1500);
    await a.skipTalk(60);
    await a.hold('KeyD', 700);
    await a.skipTalk(60);
    const r = await autofight(a, 40000, { shotEvery: 8000 });
    console.log('result', r, await a.state());
    await a.shot('end');
  },
};
module.exports.tour = async (a) => {
  await a.wait(1200);
  const t0 = Date.now();
  let k = 0;
  while (Date.now() - t0 < 60000) {
    const s = await a.ev(() => {
      const G = window.RS.G, p = G.player;
      const foes = G.ents.filter(e => e.team === 2 && !e.dead && e.hittable && Math.abs(e.x - p.x) < 200 && Math.abs(e.y - p.y) < 80);
      foes.sort((x, y) => Math.abs(x.x - p.x) - Math.abs(y.x - p.x));
      return { px: p.x, fx: foes[0] ? foes[0].x : null, script: !!G.script, lock: !!G.cam.lock, over: !!window.RS.Scenes.cur.over, end: G.map.pw };
    });
    if (s.over) { console.log('died'); break; }
    if (s.script) { await a.tap('Enter', 50); continue; }
    if (s.fx !== null) { const dx = s.fx - s.px; if (Math.abs(dx) > 30) await a.hold(dx > 0 ? 'KeyD' : 'KeyA', 150); else for (let i = 0; i < 4; i++) await a.tap('KeyJ', 90); }
    else { await a.page.keyboard.down('KeyD'); await a.wait(250); if (Math.random() < 0.3) { await a.tap('Space', 200); await a.tap('Space', 60); } await a.page.keyboard.up('KeyD'); }
    if (Date.now() - t0 > k * 7000) { k++; await a.shot('t' + k); console.log(JSON.stringify(await a.state())); }
  }
};
module.exports.flow = async (a) => {
  await a.wait(1200);
  await a.tap('KeyJ', 300);           // press any key: audio init + menu
  await a.shot('menu');
  await a.tap('Enter', 400);          // Begin
  await a.wait(2500);
  await a.shot('prologue-text');
  for (let i = 0; i < 3; i++) { await a.tap('Enter', 600); }
  await a.wait(2500);
  await a.shot('prologue-scene');
  for (let i = 0; i < 40; i++) { await a.tap('Enter', 250); }
  await a.wait(4000);
  await a.shot('after-prologue');
  for (let i = 0; i < 20; i++) { await a.tap('Enter', 200); }
  await a.wait(3000);
  await a.shot('ch1');
  console.log(JSON.stringify(await a.ev(() => ({ scene: window.RS.Scenes.cur.constructor.name, audio: !!window.RS.SFX, t: window.RS.G.time }))));
  await a.tap('Escape', 300);
  await a.shot('pause');
  await a.tap('KeyS', 100); await a.tap('Enter', 300);
  await a.shot('controls');
  await a.tap('Escape', 200); await a.tap('Escape', 300);
  await a.ev(() => { const p = window.RS.G.player; p.hp = 0; p.die(null, null, 1); });
  await a.wait(3000);
  await a.shot('gameover');
  await a.tap('Enter', 1500);
  console.log(JSON.stringify(await a.ev(() => ({ scene: window.RS.Scenes.cur.constructor.name, hp: window.RS.G.player.hp }))));
  await a.shot('retry');
};
module.exports.skills = async (a) => {
  await a.wait(1200);
  await a.skipTalk(60);
  await a.hold('KeyD', 900);
  await a.skipTalk(60);
  await a.wait(1500);
  await a.ev(() => { window.RS.G.player.qi = 100; });
  await a.tap('KeyI', 160); await a.shot('qiwave-a'); await a.wait(120); await a.shot('qiwave-b');
  await a.wait(800);
  await a.ev(() => { window.RS.G.player.qi = 100; });
  await a.tap('KeyO', 50);
  for (const t of [300, 400, 300, 500]) { await a.wait(t); await a.shot('ult'); }
  await a.wait(1500);
  await a.shot('ult-after');
  // parry: wait for a tell, then tap guard
  for (let i = 0; i < 40; i++) {
    const tell = await a.ev(() => window.RS.G.ents.some(e => e.team === 2 && e.move && e.mt >= (e.move.hit ? e.move.hit[0].f0 - 4 : 999) && e.mt < (e.move.hit ? e.move.hit[0].f0 : 0) && Math.abs(e.x - window.RS.G.player.x) < 60));
    if (tell) { await a.tap('KeyU', 20); await a.wait(60); await a.shot('parry'); break; }
    await a.wait(30);
  }
  console.log(JSON.stringify(await a.ev(() => window.RS.G.stats)));
};
module.exports.ending = async (a) => {
  await a.wait(2500); await a.shot('e1');
  for (let i = 0; i < 20; i++) { await a.wait(900); await a.tap('Enter', 100); if (i === 6) await a.shot('e2'); }
  await a.wait(6000); await a.shot('credits');
};
module.exports.audio = async (a) => {
  await a.wait(800);
  await a.tap('KeyJ', 400);
  await a.page.evaluate(() => {
    const { AudioSys } = window.RS, ctx = AudioSys.ctx;
    const an = ctx.createAnalyser(); an.fftSize = 2048;
    AudioSys.master.connect(an);
    const buf = new Float32Array(an.fftSize);
    window.__pk = 0;
    setInterval(() => { an.getFloatTimeDomainData(buf); for (const v of buf) window.__pk = Math.max(window.__pk, Math.abs(v)); }, 30);
  });
  for (let i = 0; i < 12; i++) {
    if (i % 3 === 0) await a.ev(() => window.RS.SFX.play('hit'));
    await a.wait(1000);
    console.log(i, await a.ev(() => { const p = window.__pk; window.__pk = 0; return p.toFixed(3) + ' t=' + window.RS.AudioSys.ctx.currentTime.toFixed(1) + ' step=' + window.RS.Music.step; }));
  }
};
module.exports.perf = async (a) => {
  await a.wait(1500);
  for (let k = 0; k < 3; k++) {
    const r = await a.page.evaluate(() => {
      const S = window.RS.Scenes.cur, c = document.getElementById('screen').getContext('2d');
      let tu = 0, td = 0;
      for (let i = 0; i < 120; i++) { const t0 = performance.now(); window.RS.Input.update(); S.update(); const t1 = performance.now(); S.draw(c); td += performance.now() - t1; tu += t1 - t0; }
      return { update: (tu / 120).toFixed(2), draw: (td / 120).toFixed(2), ents: window.RS.G.ents.length, fx: window.RS.FX.list.length };
    });
    console.log(JSON.stringify(r));
    await a.hold('KeyD', 1500);
  }
};

module.exports.full = async (a) => {
  // run all four chapters with god mode: fight what is on the same level,
  // otherwise push right, jumping pits and walls; nudge only when truly stuck
  const t0 = Date.now();
  let lastLevel = -1, k = 0, best = 0, bestT = Date.now();
  const look = () => a.ev(() => {
    const G = window.RS.G, p = G.player, sc = window.RS.Scenes.cur;
    if (!p || !G.map) return { scene: sc.constructor.name };
    const foes = G.arena ? G.arena.left.filter(e => !e.dead) : G.ents.filter(e => (e.team === 2 || e.team === 3) && !e.dead && e.hittable && Math.abs(e.x - p.x) < 200 && Math.abs(e.y - p.y) < 36);
    foes.sort((x, y) => Math.abs(x.x - p.x) - Math.abs(y.x - p.x));
    if (p.dmgTaken !== 0) p.dmgTaken = 0;
    if (p.hp < 30) p.hp = 100;
    const gap = d => { const x = p.x + d * 22; return G.map.surfaceBelow(x, p.y - 20) - p.y > 30 || !!G.map.hazard(x - 3, p.y - 4, x + 3, p.y + 40) || G.map.solidPx(x, p.y - 20); };
    return { scene: sc.constructor.name, lvl: G.levelIdx, px: p.x, py: p.y, fx: foes[0] ? foes[0].x : null, script: !!G.script, over: !!sc.over, boss: G.boss ? Math.round(G.boss.hp) : null, gapR: gap(1), gapL: gap(-1), g: p.grounded, plats: G.platforms.map(q => [Math.round(q.x), Math.round(q.y), q.w]) };
  });
  while (Date.now() - t0 < 600000) {
    const s = await look();
    if (s.scene === 'EndingScene') { console.log('REACHED ENDING in', Math.round((Date.now() - t0) / 1000), 's'); await a.shot('ending'); return; }
    if (s.scene !== 'GameScene') { await a.tap('Enter', 200); continue; }
    if (s.lvl !== lastLevel) { lastLevel = s.lvl; best = s.px; bestT = Date.now(); console.log('level', s.lvl, 'at', Math.round((Date.now() - t0) / 1000), 's'); await a.shot('level' + s.lvl); }
    if (s.over) { console.log('died?!'); await a.tap('Enter', 500); continue; }
    if (s.script) { await a.tap('Enter', 60); continue; }
    if (s.px > best + 40) { best = s.px; bestT = Date.now(); }
    if (Date.now() - bestT > 15000) { console.log('NUDGE at level', s.lvl, 'tile', Math.round(s.px / 16)); await a.ev(() => { const p = window.RS.G.player; p.x += 80; p.y -= 60; p.vy = 0; }); bestT = Date.now(); continue; }
    if (s.fx !== null) {
      const dx = s.fx - s.px, dir = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > 30) {
        if (dir > 0 ? s.gapR : s.gapL) { await a.page.keyboard.down(dir > 0 ? 'KeyD' : 'KeyA'); await a.tap('Space', 200); await a.tap('Space', 250); await a.page.keyboard.up(dir > 0 ? 'KeyD' : 'KeyA'); }
        else await a.hold(dir > 0 ? 'KeyD' : 'KeyA', 140);
      } else { await a.hold(dir > 0 ? 'KeyD' : 'KeyA', 20); if (Math.random() < 0.1) await a.tap('KeyI', 80); for (let i = 0; i < 4; i++) await a.tap('KeyJ', 85); }
    } else if (s.gapR && s.g) {
      // wait for a moving platform to come close, then leap
      const near = s.plats.some(([x, y, w]) => x - w / 2 < s.px + 70 && x + w / 2 > s.px + 10 && Math.abs(y - s.py) < 40);
      if (s.plats.length && !near && Math.random() < 0.85) { await a.wait(60); continue; }
      await a.page.keyboard.down('KeyD'); await a.tap('Space', 230); await a.tap('Space', 300); await a.page.keyboard.up('KeyD');
    } else {
      await a.hold('KeyD', 200);
    }
    if (++k % 80 === 0) console.log(JSON.stringify({ lvl: s.lvl, tile: Math.round(s.px / 16), boss: s.boss }));
  }
  console.log('timeout');
  await a.shot('timeout');
};
module.exports.platform = async (a) => {
  await a.wait(900);
  for (let i = 0; i < 200; i++) { const plx = await a.ev(() => window.RS.G.platforms[0].x); if (plx < 1830) break; await a.wait(30); }
  await a.page.keyboard.down('KeyD'); await a.tap('Space', 250); await a.page.keyboard.up('KeyD');
  for (let i = 0; i < 12; i++) {
    const s = await a.ev(() => { const p = window.RS.G.player, pl = window.RS.G.platforms[0]; return { x: Math.round(p.x), y: Math.round(p.y), on: !!p.onPlat, plx: Math.round(pl.x), hp: p.hp }; });
    console.log(JSON.stringify(s));
    if (i === 4) await a.shot('riding');
    await a.wait(350);
  }
  await a.page.keyboard.down('KeyD'); await a.tap('Space', 500); await a.page.keyboard.up('KeyD');
  await a.wait(600);
  console.log(JSON.stringify(await a.state()));
  await a.shot('landed');
};

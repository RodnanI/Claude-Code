// ---------------------------------------------------------------------------
// Boot: canvas scaling, the fixed-step main loop and test hooks.
// ---------------------------------------------------------------------------
const screen = document.getElementById('screen');
const ctx = ctxOf(screen);
function fitScreen() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  const k = Math.floor(s) >= 2 && Math.floor(s) / s > 0.84 ? Math.floor(s) : s;
  screen.style.width = Math.floor(VW * k) + 'px';
  screen.style.height = Math.floor(VH * k) + 'px';
}
addEventListener('resize', fitScreen);
fitScreen();
Light.init();
addEventListener('pointerdown', () => AudioSys.init());
addEventListener('keydown', () => { if (AudioSys.ready && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); if (!AudioSys.ready && !(Scenes.cur instanceof TitleScene)) AudioSys.init(); });

const STEP = 1000 / 60;
let last = performance.now(), acc = 0, crashed = null;
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  try {
    while (acc >= STEP) {
      Input.update();
      Scenes.cur.update();
      acc -= STEP;
    }
    Scenes.cur.draw(ctx);
    if (Music.pending && AudioSys.ready) { Music.play(Music.pending); Music.pending = null; }
  } catch (e) {
    if (!crashed) { crashed = e; console.error(e); }
    ctx.fillStyle = '#140404'; ctx.fillRect(0, VH - 30, VW, 30);
    Font.draw(ctx, 'Error: ' + String(e.message).slice(0, 70), 6, VH - 24, '#ff8a6a');
  }
  requestAnimationFrame(frame);
}

if (Debug.params.has('sheet')) {
  Debug.sheet(ctx, Debug.params.get('sheet'), +(Debug.params.get('page') || 0), +(Debug.params.get('zoom') || 1));
} else if (Debug.params.has('ending')) {
  G.resetStats(); Scenes.go(new EndingScene()); requestAnimationFrame(frame);
} else if (Debug.params.has('portraits')) {
  ctx.fillStyle = '#2a1c16'; ctx.fillRect(0, 0, VW, VH);
  Object.keys(PORTRAITS).forEach((id, i) => ctx.drawImage(Portraits.get(id), 8 + (i % 6) * 78, 8 + Math.floor(i / 6) * 90, 64, 64));
} else {
  const lv = Debug.params.get('level');
  if (lv !== null) { G.resetStats(); G.seen = new Set(); Scenes.go(new GameScene(+lv, Debug.params.has('x') ? { x: +Debug.params.get('x') * TS, y: +Debug.params.get('y') * TS, events: (Debug.params.get('ev') || '').split(',').filter(Boolean) } : null)); }
  else Scenes.go(new TitleScene());
  if (Debug.params.has('god') && G.player) G.player.dmgTaken = 0;
  requestAnimationFrame(frame);
}
// hooks for the automated test harness
window.RS = { G, Input, Scenes, startGame, STORY, FX, spawnEnemy, LEVELS, SFX, moveBody, AudioSys, Music, SONGS, SOUNDS };

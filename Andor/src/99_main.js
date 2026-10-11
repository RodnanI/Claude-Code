// ANDOR :: boot.

function debugSheet() {
  resizeScreen(false);
  ctx.fillStyle = '#3a302a';
  ctx.fillRect(0, 0, Screen.W, Screen.H);
  const z = DEBUG.z || 1;
  ctx.save();
  ctx.scale(z, z);
  let x = 2, y = 2, rowH = 0;
  const put = (f) => {
    if (x + f.w > Screen.W / z) {
      x = 2;
      y += rowH + 2;
      rowH = 0;
    }
    ctx.fillStyle = '#4a3f37';
    ctx.fillRect(x, y, f.w, f.h);
    ctx.drawImage(f.c, x, y);
    x += f.w + 2;
    rowH = Math.max(rowH, f.h);
  };
  const which = DEBUG.sheet === true ? 'hero' : DEBUG.sheet;
  if (which === 'hero') {
    for (const n of ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7', 'jump', 'fall', 'land', 'wall', 'hang', 'climb0', 'climb1', 'swingF', 'swingM', 'swingB', 'hurt', 'crouch']) put(heroFrame(n));
    for (const d of ['fwd', 'up', 'down']) for (let ph = 0; ph < 3; ph++) put(heroFrame(d === 'down' ? 'jump' : 'idle0', d, ph));
    heroExtras();
    for (const s of HERO_ROLL_SPR) put(s);
    put(HERO_DEAD_SPR);
  } else if (which === 'skins') {
    for (const sk of ['guard', 'archer', 'bandit', 'captain', 'mummy', 'jackal', 'sentinel']) {
      const poses = sk === 'mummy' ? ['idle0', 'shamble0', 'shamble2', 'shamble4', 'windup', 'slash'] : sk === 'archer' ? ['idle0', 'walk0', 'walk2', 'aim', 'draw', 'hurt'] : sk === 'jackal' ? ['idle0', 'run0', 'run3', 'thrust0', 'thrust1', 'leap'] : ['idle0', 'walk0', 'walk2', 'walk4', 'windup', 'slash', 'slash2', 'guard', 'hurt'];
      for (const p of poses) put(rigFrame(sk, p));
    }
  } else if (which === 'props') {
    const all = [...ART.scorpion, ...ART.cobra, ...ART.vulture, ...ART.bat, ...ART.scarab, ...ART.coin, ART.gem, ART.ruby, ART.pomegranate, ART.scroll, ...Object.values(ART.relics), ART.ring, ...Object.values(ART.pot), ART.brazier, ...ART.lever, ART.torch, ART.lantern, ART.dartFace, ART.skull, ART.camel];
    for (const s of all) put(s);
  }
  ctx.restore();
  if (which === 'hero') {
    drawText(ctx, 'Andor: The Sands Remember 0123456789 !?', 4, Screen.H - 22, PAL.gold2, { shadow: PAL.ink });
    drawText(ctx, 'quick brown fox jumps over the lazy dog, yes.', 4, Screen.H - 11, PAL.cream);
  }
}

// Render a whole level to one canvas and expose it for tools/mapshot.js.
function debugMap(idx) {
  Game.save.difficulty = 'adventurer';
  Game.loadChapter(idx);
  const L = Game.level;
  const c = makeCanvas(L.pw, L.ph);
  const g = c.getContext('2d');
  const cam = { x: 0, y: 0 };
  // tile the backdrop across the whole map
  for (let x = 0; x < L.pw; x += 400)
    for (let y = 0; y < L.ph; y += 240) {
      g.save();
      g.translate(x, y);
      g.beginPath();
      g.rect(0, 0, 400, 240);
      g.clip();
      Game.backdrop.draw(g, { x: x, y: y }, 400, 240, L.horizon - y, 3);
      g.restore();
    }
  L.drawChunks(g, cam, L.pw, L.ph);
  for (const e of Game.entities) e.draw(g, cam);
  Game.player.draw(g, cam);
  L.drawFakes(g, cam, null, 0, L.pw, L.ph);
  window.__map = c.toDataURL('image/png');
}

// Inspection handle for tools and the curious.
window.__andor = { Game, Cam, Input, Screen, LEVELS, Parts, Music, Settings, AudioSys, Sfx, SFX, TRACKS };

if (DEBUG.sheet) debugSheet();
else if (DEBUG.map !== undefined) {
  resizeScreen(false);
  debugMap(+DEBUG.map);
} else boot();

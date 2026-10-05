/* ============================================================
   main.js : boot, fixed-step main loop, pointer / keyboard /
   touch input, resize + visibility handling.
   ============================================================ */
const Main = (() => {
  const STEP = 1 / 240;
  let last = performance.now(), acc = 0, saveT = 0, kx = BW / 2, touchAim = false;

  function loop(now) {
    requestAnimationFrame(loop);
    const dtReal = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!UI.paused) {
      const live = Game.state === 'play' || Game.state === 'intro';
      const dt = dtReal * FX.timeScale() * (live ? GAME_SPEED : 1);
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 60) { Board.step(STEP); acc -= STEP; n++; }
      if (n >= 60) acc = 0;
      Game.update(dt, dtReal);
      Board.update(dt, dtReal);
      Reels.update(dt);
      FX.update(dtReal, dt);
      UI.frame(dtReal);
      Meta.data.stats.playtime += dtReal;
      saveT += dtReal;
      if (saveT > 20) { saveT = 0; Meta.save(); }
    }
    FX.ovUpdate(dtReal);
    Board.render();
    Reels.draw();
    FX.ovDraw();
  }

  function input() {
    const cv = document.getElementById('board');
    cv.addEventListener('pointermove', e => {
      const p = Board.toLocal(e.clientX, e.clientY);
      if (Board.pick) { Board.hover = Board.nearestSlot(p.x, p.y); Board.hoverPocket = Board.pocketAt(p.x, p.y); return; }
      if (e.pointerType === 'mouse' || touchAim) { kx = p.x; Game.aim(p.x); }
    });
    cv.addEventListener('pointerleave', () => { Board.hover = -1; Board.hoverPocket = -1; });
    cv.addEventListener('pointerdown', e => {
      Sound.init();
      const p = Board.toLocal(e.clientX, e.clientY);
      if (Board.pick) {
        const ps = Board.hover, pp = Board.hoverPocket;
        Board.hover = Board.nearestSlot(p.x, p.y); Board.hoverPocket = Board.pocketAt(p.x, p.y);
        const again = Board.pick.kind === 'slot' ? Board.hover >= 0 && Board.hover === ps : Board.hoverPocket >= 0 && Board.hoverPocket === pp;
        if (e.pointerType === 'mouse' || again) Game.boardClick(p.x, p.y);
        else Sound.tick();
        return;
      }
      if (Game.state === 'intro') { UI.dismissIntro(); return; }
      if (Game.state !== 'play' || UI.paused) return;
      kx = p.x; Game.aim(p.x);
      if (e.pointerType === 'mouse') Game.drop();
      else { touchAim = true; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    });
    cv.addEventListener('pointerup', e => {
      if (!touchAim) return;
      touchAim = false;
      const p = Board.toLocal(e.clientX, e.clientY);
      kx = p.x; Game.aim(p.x); Game.drop();
    });
    cv.addEventListener('pointercancel', () => { touchAim = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('pointerdown', () => Sound.init(), true);
    window.addEventListener('keydown', e => {
      Sound.init();
      if (e.target && e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        if (Board.pick && Board.pick.resolve) { Board.pick.resolve(-1); return; }
        if (document.getElementById('modal').classList.contains('on')) return;
        if (Game.state === 'play' || Game.state === 'intro' || Game.state === 'shop') UI.pauseMenu();
        return;
      }
      if (UI.paused) return;
      if (k === ' ' || k === 'enter') { if (Game.state === 'play' || Game.state === 'intro') { e.preventDefault(); Game.drop(); } return; }
      if (k === 'arrowleft' || k === 'a') { kx = clamp(kx - 14, 0, BW); Game.aim(kx); e.preventDefault(); }
      else if (k === 'arrowright' || k === 'd') { kx = clamp(kx + 14, 0, BW); Game.aim(kx); e.preventDefault(); }
      else if (k === 'z' || k === 'q') Game.nudge(-1);
      else if (k === 'x' || k === 'e') Game.nudge(1);
      else if ('1234'.includes(k) && k.length === 1 && Game.run && (Game.state === 'play' || Game.state === 'shop')) Game.useTicket(+k - 1);
      else if (k === 'c') Game.cashOutEarly();
      else if (k === 'f') document.getElementById('btnSpeed').click();
    });
    let rz = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(UI.layout); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Sound.suspend(); Meta.save(); if (Game.state === 'play') UI.pauseMenu(); }
      else Sound.resume();
    });
    window.addEventListener('pagehide', () => Meta.save());
  }

  function boot() {
    Meta.load();
    const st = Meta.data.settings;
    GAME_SPEED = st.speed || 1;
    FX.settings.shake = st.shake;
    Sound.setVol('music', st.music);
    Sound.setVol('sfx', st.sfx);
    Board.init(document.getElementById('board'));
    Reels.init(document.getElementById('reels'));
    FX.ovInit(document.getElementById('fx'));
    Board.cb = { hit: Game.onPinHit, land: Game.onLand, wall: Game.onWall, divider: Game.onDivider, warped: Game.onWarped };
    UI.init();
    input();
    const loads = document.fonts ? ['16px Bungee', '16px Shrikhand', '500 16px "Barlow Condensed"', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f).catch(() => null)) : [];
    Promise.race([Promise.all(loads), sleep(1800)]).then(() => {
      UI.title();
      UI.layout();
      requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
    });
  }
  boot();
  return { loop };
})();

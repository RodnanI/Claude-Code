// SQUEAKBORNE :: game
// State machine, fixed-step loop, stage flow, rendering pipeline and boot.

let pl = null;
const Debug = { boxes: false, god: false, list: [], box(b) { this.list.push(b); } };

const Game = {
  state: 'boot', stateT: 0, frame: 0, acc: 0, last: 0,
  pauseMenu: null, pauseSub: null, subMenu: null, deathInfo: null, seedLabel: null,
  safeT: 0, introT: 0, timers: [], trans: null, bossDone: false, winMsg: '',
  get cine() { return this.safeT > 0 || this.introT > 0 || this.trans !== null; },
  cineFor(n) { this.safeT = max(this.safeT, n); },
  after(fn, ms) { this.timers.push({ t: ceil(ms / 16.67), fn }); },
  setState(s) { this.state = s; this.stateT = 0; },
  init() {
    Save.load();
    Input.init();
    const S = Save.data.settings;
    if (S.binds) Input.setBinds(S.binds); else Input.setBinds(PRESETS[S.preset] || PRESETS.wasd);
    Gfx.init();
    buildFont('5', FONT5_SRC, 5, 7, 4);
    buildFont('3', FONT3_SRC, 3, 5, 2);
    buildCommonSprites();
    buildEnemyArt();
    buildParallax();
    this.setFavicon();
    Title.enter();
    this.setState('title');
    const h = location.hash;
    if (h.includes('god')) Debug.god = true;
    if (h.includes('gallery')) this.setState('gallery');
    const m = /stage=(-?\d+)/.exec(h);
    if (m) this.debugStart(+m[1]);
    requestAnimationFrame((t) => this.loop(t));
  },
  setFavicon() {
    try {
      const m = { x: 0, y: 0, w: 8, h: 14, face: 1, t: 0, hat: 'none', tail: chainInit(7, 4, 10), scarf: chainInit(6, 5, 4), get cx() { return 4; }, get bot() { return 14; } };
      renderMouse(m, { eye: 'o', hand: null });
      const cv = makeCanvas(32, 32), c = ctx2d(cv);
      c.drawImage(POCV, POX - 15, POY - 26, 32, 32, 0, 0, 32, 32);
      const link = document.createElement('link'); link.rel = 'icon'; link.href = cv.toDataURL(); document.head.appendChild(link);
    } catch (e) { /* favicon is optional */ }
  },
  loop(ts) {
    const dt = min(0.1, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    this.acc += dt;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 5) { this.acc -= 1 / 60; this.step(); n++; }
    if (n >= 5) this.acc = 0;
    Music.update();
    try { this.render(); } catch (e) { console.error(e); }
    Gfx.present();
    requestAnimationFrame((t) => this.loop(t));
  },
  step() {
    Input.update();
    this.frame++; this.stateT++;
    Save.data.stats.playTime++;
    switch (this.state) {
      case 'title': Title.update(); break;
      case 'play': this.stepPlay(); break;
      case 'pause':
        if (this.pauseSub) this.pauseSub.update();
        else { this.pauseMenu.update(); if (Input.p('pause') && this.stateT > 3) this.resume(); }
        UI.update();
        break;
      case 'dead':
        this.stepWorldPassive();
        if (this.stateT > 55 && (Input.p('jump') || Input.mpress('ok'))) this.startHub(MR.int(1, 999999999), Save.data.spice);
        else if (this.stateT > 60 && Input.mpress('back')) this.toTitle();
        break;
      case 'win':
        if (this.stateT > 120 && (Input.p('jump') || Input.mpress('ok'))) this.startHub(MR.int(1, 999999999), Save.data.spice);
        break;
    }
  },
  stepPlay() {
    if (UI.modal) { UI.update(); return; }
    if (this.trans) { this.stepTrans(); UI.update(); return; }
    if (Input.p('pause')) { this.pause(); return; }
    if (Input.p('map') && lv.kind === 'biome') { UI.open(new MapView()); return; }
    FX.update();
    UI.update();
    if (FX.hitstop > 0) { FX.hitstop--; return; }
    if (FX.slow < 1) { FX.slowAcc += FX.slow; if (FX.slowAcc < 1) { Parts.update(); return; } FX.slowAcc -= 1; }
    this.updateWorld();
  },
  stepWorldPassive() {
    FX.update();
    if (FX.slow < 1) { FX.slowAcc += FX.slow; if (FX.slowAcc < 1) return; FX.slowAcc -= 1; }
    if (pl && pl.state === 'dead' && pl.st < 100) pl.update();
    for (const e of lv.enemies) e.update();
    for (const p of lv.projs) p.update();
    removeDead(lv.projs);
    Parts.update(); FText.update(); Bubbles.update();
    UI.update();
  },
  updateWorld() {
    if (this.safeT > 0) this.safeT--;
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; if (--tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    if (lv.kind === 'biome' || lv.kind === 'boss') Run.time++;
    lv.time++;
    Debug.list.length = 0;
    if (Debug.god && pl) { pl.hp = pl.maxHp; }
    pl.update();
    garlicTick(pl);
    if (!pl.buffs.comboT) pl.comboStacks = 0;
    for (const e of lv.enemies) e.update();
    for (const p of lv.projs) p.update();
    for (const it of lv.items) it.update();
    for (const f of lv.fx) f.update();
    removeDead(lv.enemies); removeDead(lv.projs); removeDead(lv.items); removeDead(lv.fx);
    updateCrumbles();
    Parts.update(); FText.update(); Bubbles.update();
    if (this.introT > 0) this.stepIntro();
    else Cam.update();
    const r = roomAt(pl.cx, pl.cy);
    if (r && !r.visited) { r.visited = true; }
    this.emitters();
    if (lv.kind === 'boss' && lv.boss && lv.boss.state === 'sleep' && !this.introT && (pl.cx > lv.boss.cx - 200 || lv.time > 240)) this.startIntro();
  },
  emitters() {
    const bk = lv.bk;
    for (const em of lv.emitters) {
      if (abs(em.x - Cam.x - W / 2) > W || abs(em.y - Cam.y - H / 2) > H) continue;
      if (++em.t % (bk === 'cellar' ? 90 : 160) !== 0) continue;
      if (bk === 'cellar' || bk === 'cattree') Parts.add({ k: 7, x: em.x, y: em.y + 1, vy: 0.5, gr: 0.12, c: bk === 'cellar' ? '#6a8a9a' : '#9ab0d0', life: 120, col2: true, dr: 1 });
      else if (bk === 'kitchen') puff(em.x, em.y + 4, 1, C.fu3, { vy: 0.3, a: 0.25, life: 40, s: 3 });
    }
    if (this.frame % 7 === 0) Parts.add({ k: 0, x: Cam.x + rnd(W), y: Cam.y + rnd(H), vx: rnd(-0.15, 0.15), vy: rnd(-0.1, 0.1), s: 1, c: lv.bk === 'cattree' ? '#8a9ac8' : lv.bk === 'kitchen' ? '#c8c0b0' : '#8a7060', life: 200, dr: 1 });
  },
  // ---------------- flow ----------------
  startHub(seed, spice) {
    newRun(seed, spice);
    Save.data.stats.runs++;
    Save.write();
    pl = new Player();
    pl.hat = Save.data.hat;
    pl.slots[0] = makeItem('needle', 1, 0, []);
    pl.slots[1] = makeItem('slingshot', 1, 0, []);
    pl.maxFlasks = flaskCount(); pl.flasks = pl.maxFlasks;
    pl.recalc(); pl.hp = pl.maxHp;
    FX.reset(); Parts.list.length = 0; FText.list.length = 0; Bubbles.list.length = 0; UI.toasts.length = 0; this.timers.length = 0;
    this.loadLevel(genMapLevel('hub', 'cellar', 'hub'));
    lv.name = 'THE MOUSEHOLE';
    Music.play('hub');
    this.setState('play');
    UI.titleCard('THE MOUSEHOLE', 'home sweet hole. the cat is upstairs.');
    if (!Save.data.introSeen) {
      Save.data.introSeen = true; Save.write();
      this.after(() => Bubbles.say(pl, 'today i finally deal with that cat', 200), 900);
    }
  },
  loadLevel(L) {
    lv = L;
    populate(lv);
    Parts.list.length = 0; FText.list.length = 0;
    pl.place(lv.spawn.x, lv.spawn.y);
    pl.inv = 60;
    Cam.lockX = null;
    Cam.snap(pl);
    Light.ambient = lv.kind === 'hub' || lv.kind === 'rest' ? '#a89890' : BIOMES[lv.biome || 0].ambient;
    if (lv.kind === 'hub' || lv.kind === 'rest') Light.ambient = '#9a8a84';
    if (lv.kind === 'boss' && lv.bossSpawn) {
      const S = STAGES[Run.stage];
      lv.boss = spawnBoss(S.b, lv.bossSpawn.x, lv.bossSpawn.y);
      const door = lv.items.find((it) => it instanceof Door);
      if (door) door.locked = true;
      Music.stop();
    }
    this.bossDone = false;
  },
  nextStage() {
    if (this.trans) return;
    this.startTrans(() => {
      Run.stage++;
      if (Run.stage >= STAGES.length) { this.victory(); return; }
      this.loadStage();
    });
  },
  loadStage() {
    const S = STAGES[Run.stage], B = BIOMES[S.b];
    Save.data.stats.bestStage = max(Save.data.stats.bestStage, Run.stage);
    if (S.k === 'biome') {
      const L = genBiomeLevel(S.b, (Run.seed + S.b * 7919) >>> 0, Run.spice);
      this.loadLevel(L);
      Music.play(B.music);
      UI.titleCard(B.name, B.sub);
      if (hasUpg('mapper')) for (const r of lv.rooms) r.visited = r.visited || false;
    } else if (S.k === 'boss') {
      const L = genMapLevel('boss' + S.b, B.key, 'boss');
      L.biome = S.b; L.name = BOSS_INFO[S.b].name;
      if (S.b === 3) for (let y = 0; y < L.th - 4; y++) for (let x = 0; x < L.tw; x++) L.back[y * L.tw + x] = 0;
      if (S.b === 3) bakeLevel(L);
      this.loadLevel(L);
      UI.titleCard(['THE RAT NEST', 'THE CARPET ARENA', 'THE STOVETOP', 'THE TOP OF THE CAT TREE'][S.b], 'something big lives here');
    } else if (S.k === 'rest') {
      const L = genMapLevel('rest', B.key, 'rest');
      L.biome = S.b; L.name = "THE HOARDER'S NOOK";
      this.loadLevel(L);
      pl.maxFlasks = flaskCount(); pl.flasks = pl.maxFlasks;
      pl.heal(pl.maxHp * 0.3, true);
      Music.play('hub');
      UI.titleCard("THE HOARDER'S NOOK", 'cheese refilled. a short nap was had.');
      Bubbles.say(pl, pick(['phew', 'a breather', 'my paws hurt', 'snack time']), 120);
    }
  },
  startIntro() {
    const b = lv.boss;
    this.introT = 150;
    pl.state = 'cine'; pl.act = null;
    sfx('roar');
    UI.banner(b.info.name, b.info.sub, C.rd3);
    Music.play(lv.boss instanceof Mittens ? 'final' : 'boss');
  },
  stepIntro() {
    const b = lv.boss;
    this.introT--;
    const tx = b.cx - W / 2, ty = b.cy - H / 2 - 10;
    Cam.x = lerp(Cam.x, tx, 0.06); Cam.y = lerp(Cam.y, ty, 0.06); Cam.clamp();
    if (this.introT % 30 === 0) FX.shake(0.25);
    if (this.introT === 100) Bubbles.say(b, pick({ ratking: ['who goes there', 'we are ONE normal rat', 'state your business'], vacuum: ['DIRT DETECTED', 'BEEP. BOOP. CRUMBS.', 'INITIATING CLEAN'], roachchef: ['a customer! in MY kitchen', 'you are not on ze menu... yet', 'bonsoir'], mittens: ['...mrrp?', '*stares*', '*knocks something over*'] }[b.type] || ['...']), 120);
    if (this.introT <= 0) { pl.state = 'move'; b.startFight(); }
  },
  startTrans(fn) { this.trans = { t: 0, phase: 0, fn }; sfx('door'); },
  stepTrans() {
    const T = this.trans;
    T.t++;
    if (T.phase === 0 && T.t >= 26) { T.phase = 1; T.t = 0; T.fn(); }
    else if (T.phase === 1 && T.t >= 26) this.trans = null;
    if (T.phase === 1 && lv) { Cam.update(); Parts.update(); }
  },
  pause() {
    if (this.state !== 'play' || (pl && pl.dead)) return;
    this.pauseMenu = pauseMenu(); this.pauseSub = null;
    this.setState('pause');
    AudioSys.muffle(true);
    sfx('select');
  },
  resume() { this.setState('play'); AudioSys.muffle(false); Input.clearAll(); },
  toTitle() { AudioSys.muffle(false); UI.modal = null; this.trans = null; this.introT = 0; lv = null; pl = null; Title.enter(); this.setState('title'); },
  onDeath() {
    const S = Save.data.stats;
    S.deaths++; S.kills += Run.kills; S.parries += Run.parries; S.bonks += Run.bonks; S.billiards += Run.billiards;
    const cause = Run.lastCause || 'mysterious causes';
    S.deathsBy[cause] = (S.deathsBy[cause] || 0) + 1;
    if (cause === 'spikes') S.spikeDeaths++;
    let lost = Run.crumbs;
    if (hasUpg('banker') && lost > 0) { const keep = floor(lost * 0.25); Save.data.crumbs += keep; lost -= keep; }
    const before = Save.data.hats.length;
    checkAchievements(false);
    const unlocks = Save.data.hats.slice(before).map((h) => HATS[h].name.toUpperCase());
    if (Run.blueprints) unlocks.push(Run.blueprints + ' BLUEPRINT' + (Run.blueprints > 1 ? 'S' : ''));
    const st = STAGES[max(0, Run.stage)];
    const where = Run.stage < 0 ? 'THE MOUSEHOLE (IMPRESSIVE)' : st.k === 'boss' ? BOSS_INFO[st.b].name : st.k === 'rest' ? "THE HOARDER'S NOOK" : BIOMES[st.b].name;
    this.deathInfo = { title: pick(DEATH_TITLES), cause, where, lost, tip: pick(DEATH_TIPS), unlocks };
    Save.write();
    Music.play('title');
    this.setState('dead');
  },
  victory() {
    const S = Save.data.stats;
    S.wins++; S.kills += Run.kills; S.parries += Run.parries; S.bonks += Run.bonks; S.billiards += Run.billiards;
    if (!S.bestTime || Run.time < S.bestTime) S.bestTime = Run.time;
    Save.data.crumbs += Run.crumbs; S.crumbsBanked += Run.crumbs; Run.crumbs = 0;
    this.winMsg = '';
    if (Run.spice >= Save.data.spiceMax && Save.data.spiceMax < SPICE.length - 1) { Save.data.spiceMax = Run.spice + 1; this.winMsg = 'NEW SPICE LEVEL UNLOCKED: ' + SPICE[Save.data.spiceMax].name.toUpperCase(); }
    checkAchievements(true);
    Save.write();
    Music.play('title');
    sfx('fanfare');
    if (!Title.mouse) Title.enter();
    Title.mouse.hat = Save.data.hat;
    UI.card = null; UI.bannerD = null;
    this.setState('win');
  },
  debugStart(stage) {
    this.startHub(12345, 0);
    if (stage >= 0) { Run.stage = stage; this.loadStage(); }
  },
  // ---------------- rendering ----------------
  render() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    if (this.state === 'title') { Title.draw(); UI.drawOverlays(); return; }
    if (this.state === 'win') { drawVictory(); UI.drawOverlays(); return; }
    if (this.state === 'gallery') { drawGallery(this.frame); return; }
    if (!lv) { R(g, 0, 0, W, H, '#000'); return; }
    this.renderWorld();
    if (this.state === 'play' || this.state === 'pause' || this.state === 'dead') {
      if (this.state !== 'dead') drawHUD();
      UI.drawOverlays();
    }
    if (UI.modal) UI.modal.draw();
    if (this.state === 'pause') drawPause();
    if (this.state === 'dead') drawDeath();
    if (this.trans) this.drawTrans();
  },
  renderWorld() {
    const cx = Cam.rx, cy = Cam.ry;
    const B = BIOMES[lv.biome || 0];
    R(g, 0, 0, W, H, lv.kind === 'hub' ? '#140d11' : B.bg[1]);
    drawParallax(lv.kind === 'hub' ? 'cellar' : lv.bk, cx, cy);
    g.save();
    g.translate(-cx, -cy);
    if (lv.boss instanceof Mittens && !lv.boss.dead) lv.boss.drawBack();
    const sx = max(0, cx), sy = max(0, cy), sw = min(W, lv.cv.width - sx), sh = min(H, lv.cv.height - sy);
    if (sw > 0 && sh > 0) g.drawImage(lv.cv, sx, sy, sw, sh, sx, sy, sw, sh);
    drawCrumbles(cx, cy);
    // torches
    for (const L of lv.lights) {
      if (L.x < cx - 40 || L.x > cx + W + 40 || L.y < cy - 40 || L.y > cy + H + 40) continue;
      R(g, L.x - 3, L.y + 4, 6, 2, C.ink); R(g, L.x - 2, L.y + 2, 4, 3, C.br1);
      if (lv.bk === 'living') { POLY(g, [L.x - 6, L.y + 2, L.x + 6, L.y + 2, L.x + 3, L.y - 6, L.x - 3, L.y - 6], '#c8a060'); R(g, L.x - 1, L.y - 9, 2, 3, C.yl2); }
      else if (lv.bk === 'kitchen') { R(g, L.x - 5, L.y - 2, 10, 4, C.st3); R(g, L.x - 4, L.y + 2, 8, 2, C.yl2); }
      else if (lv.bk === 'cattree') { DISC(g, L.x, L.y - 3, 4, '#bfe8ff'); DISC(g, L.x, L.y - 3, 2, C.wh); }
      else flame(L.x, L.y - 2, 1);
      const fl = sin(this.frame * 0.13 + L.x) * 6 + sin(this.frame * 0.31 + L.y) * 4;
      Light.add(L.x, L.y - 4, 110 + fl, B.light, 0.85);
    }
    for (const it of lv.items) it.draw();
    for (const f of lv.fx) f.draw();
    Parts.draw(false);
    for (const e of lv.enemies) e.draw();
    if (pl) pl.draw();
    for (const p of lv.projs) p.draw();
    Parts.draw(true);
    this.drawShafts(cx, cy);
    Bubbles.draw();
    FText.draw();
    if (Debug.boxes) for (const b of Debug.list) { g.strokeStyle = '#f00'; g.strokeRect(b.x, b.y, b.w, b.h); }
    // light sources from the player and projectiles
    if (pl) Light.add(pl.cx, pl.cy, 100, '#d8c8b0', 0.6);
    for (const p of lv.projs) if (p.team === 'e' || p.kind === 'fire' || p.kind === 'sauce') Light.add(p.cx, p.cy, 24, p.team === 'e' ? '#ff8060' : '#ffa040', 0.5);
    g.restore();
    Light.render(cx, cy);
    Light.apply();
    this.drawFore(cx, cy);
    g.drawImage(Gfx.vig, 0, 0);
    if (pl && !pl.dead && pl.hp < pl.maxHp * 0.25) {
      const a = 0.12 + 0.08 * sin(this.frame * 0.12);
      g.fillStyle = rgba(C.rd1, a);
      g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6); g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H);
    }
    if (Run && Run.curse > 0) { g.fillStyle = rgba(C.vi1, 0.12); g.fillRect(0, 0, W, H); }
    if (FX.flashA > 0) { g.globalAlpha = FX.flashA; R(g, 0, 0, W, H, FX.flashCol); g.globalAlpha = 1; }
  },
  drawShafts(cx, cy) {
    if (!lv.shafts) return;
    const col = lv.bk === 'cattree' ? '#9ab8ff' : lv.bk === 'kitchen' ? '#fff4d8' : '#ffd890';
    g.globalCompositeOperation = 'lighter';
    for (const s of lv.shafts) {
      if (s.x + 120 < cx || s.x - 120 > cx + W || s.y > cy + H || s.y + s.h < cy) continue;
      const sway = sin(this.frame * 0.01 + s.ph) * 6;
      g.globalAlpha = 0.045 + 0.015 * sin(this.frame * 0.02 + s.ph);
      POLY(g, [s.x, s.y, s.x + s.w, s.y, s.x + s.w + 70 + sway, s.y + s.h, s.x + 40 + sway, s.y + s.h], col);
      g.globalAlpha *= 0.6;
      POLY(g, [s.x + s.w * 0.3, s.y, s.x + s.w * 0.7, s.y, s.x + s.w * 0.7 + 60 + sway, s.y + s.h, s.x + s.w * 0.3 + 50 + sway, s.y + s.h], col);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  },
  drawFore(cx, cy) {
    if (!lv.fore) return;
    const col = lv.bk === 'cattree' ? '#05060c' : '#080406';
    for (const f of lv.fore) {
      const sx = round((f.x - cx - W / 2) * 1.35 + W / 2), sy = round((f.y - cy - H / 2) * 1.15 + H / 2);
      if (sx < -60 || sx > W + 60) continue;
      g.globalAlpha = 0.88;
      const s = f.s;
      switch (f.kind) {
        case 'chain': for (let y = -10; y < sy; y += 9) { RING(g, sx, y, 3, col, 2); R(g, sx - 1, y + 4, 2, 5, col); } DISC(g, sx, sy + 4, 6 * s, col); break;
        case 'pipe': R(g, sx - 6 * s, -10, 12 * s, H + 20, col); for (let y = (sy % 60) - 60; y < H; y += 60) R(g, sx - 8 * s, y, 16 * s, 5, col); break;
        case 'roots': for (let k = 0; k < 5; k++) { let x = sx + k * 5 - 10, y = -5; for (let j = 0; j < 8; j++) { const nx = x + sin(k * 3 + j) * 6, ny = y + 14; LINE(g, x, y, nx, ny, col, 2); x = nx; y = ny; } } break;
        case 'leg': POLY(g, [sx - 14 * s, -10, sx + 14 * s, -10, sx + 9 * s, H + 10, sx - 9 * s, H + 10], col); break;
        case 'cord': for (let y = -10; y < H; y += 6) R(g, sx + round(sin(y * 0.05) * 8), y, 3, 6, col); break;
        case 'pan': LINE(g, sx, -10, sx, sy - 20, col, 2); DISC(g, sx, sy, 22 * s, col); R(g, sx - 3, sy - 22 * s - 26, 6, 26, col); break;
        case 'hook': LINE(g, sx, -10, sx, sy, col, 3); RING(g, sx + 5, sy, 6, col, 3); break;
        case 'rope': R(g, sx - 7 * s, -10, 14 * s, H + 20, col); break;
        case 'feather': LINE(g, sx, sy - 30, sx + 10, sy + 30, col, 2); for (let k = 0; k < 8; k++) LINE(g, sx + k * 1.2, sy - 26 + k * 7, sx - 10 + k, sy - 20 + k * 7, col); break;
      }
    }
    g.globalAlpha = 1;
  },
  drawTrans() {
    const T = this.trans;
    const k = T.phase === 0 ? T.t / 26 : 1 - T.t / 26;
    const ease2 = ease.inOut(clamp(k, 0, 1));
    const px = pl ? pl.cx - Cam.rx : W / 2, py = pl ? pl.cy - Cam.ry : H / 2;
    const r = (1 - ease2) * 560;
    g.fillStyle = '#000';
    for (let y = 0; y < H; y++) {
      const dy = y - py;
      if (abs(dy) >= r) { g.fillRect(0, y, W, 1); continue; }
      const hw = sqrt(r * r - dy * dy);
      g.fillRect(0, y, max(0, floor(px - hw)), 1);
      g.fillRect(ceil(px + hw), y, W, 1);
    }
  },
};

function drawGallery(t) {
  R(g, 0, 0, W, H, '#3a3440');
  let x = 14, y = 22;
  const put = (s, label) => { spr(s, x, y); if (label) txt(label, x, y + 2, C.st4, { a: 'c', f: '3' }); x += max(28, s.w + 6); if (x > W - 30) { x = 14; y += 34; } };
  for (const k in ART) {
    const a = ART[k];
    if (a.img) { put(a, k); continue; }
    if (Array.isArray(a)) { put(a[floor(t / 8) % a.length], k); continue; }
    for (const s in a) { const v = a[s]; if (Array.isArray(v)) put(v[floor(t / 8) % v.length], s); else if (v && v.img) put(v, s); }
  }
  x = 14; y += 40;
  for (const id in ITEMS) { spr(itemIcon(ITEMS[id]), x, y); x += 20; if (x > W - 20) { x = 14; y += 22; } }
  x = 14; y += 26;
  for (const h in HATS) { if (HATS[h].draw) { g.drawImage(makeHatIcon(h), x - 8, y - 14); } x += 20; }
  y += 10;
  const m = Title.mouse || (Title.enter(), Title.mouse);
  const poses = [{}, { curl: true }, { eye: 'x', mouth: 1 }, { eye: 'happy', mouth: 1, earUp: 2 }, { lean: 1, earBack: 1, bf: [2, -1], ff: [-2, 0] }, { hand: [6, -7], eye: 'angry' }];
  poses.forEach((p, i) => { m.x = 30 + i * 40 - 4; m.y = y + 20; renderMouse(m, Object.assign({ t, hand: [3, -6] }, p)); drawMouseAt(m, m.cx, m.bot + 1, 1, 1, 0, false); });
  for (const k of ['cheese', 'bread', 'blueprint', 'plate', 'pedestal', 'sign', 'wardrobe', 'burner']) { spr(SPR[k], 290 + (['cheese', 'bread', 'blueprint', 'plate', 'pedestal', 'sign', 'wardrobe', 'burner'].indexOf(k) % 4) * 44, y + 10 + floor(['cheese', 'bread', 'blueprint', 'plate', 'pedestal', 'sign', 'wardrobe', 'burner'].indexOf(k) / 4) * 36); }
}
// test hooks (harmless in normal play)
window.__sq = { Game, get Run() { return Run; }, get lv() { return lv; }, get pl() { return pl; }, Debug, Save, genBiomeLevel, BIOMES, ROOMS, MAPS, STAGES, Input, ev: (s) => eval(s) };

window.addEventListener('load', () => Game.init());

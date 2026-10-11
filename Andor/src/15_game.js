// ANDOR :: game state, loop, scenes.

const DIFFS = {
  pilgrim: { name: 'PILGRIM', hp: 5, desc: 'A gentler road. More pomegranates of health.' },
  adventurer: { name: 'ADVENTURER', hp: 4, desc: 'The journey as it was meant to be.' },
  legend: { name: 'LEGEND', hp: 3, desc: 'Three blows and the sands take you.' },
};
const SHOP_ITEMS = [
  { id: 'hp', name: 'Pomegranate of Shiraz', desc: 'One more heart of health, for every road ahead.', max: 3, price: [60, 120, 200], icon: 'pom' },
  { id: 'reach', name: 'Braided Lash', desc: 'Your whip reaches a hand further.', max: 1, price: [90], icon: 'whip' },
  { id: 'dmg', name: 'Lion-Hide Grip', desc: 'Every lash strikes twice as hard.', max: 1, price: [150], icon: 'grip' },
  { id: 'magnet', name: 'Lodestone Charm', desc: 'Dinars leap to you from farther away.', max: 1, price: [70], icon: 'magnet' },
  { id: 'compass', name: 'Astrolabe Needle', desc: 'A golden mote points toward hidden relics.', max: 1, price: [110], icon: 'compass' },
  { id: 'feather', name: 'Simurgh Feather', desc: 'Once per chapter, survive a blow that should end you.', max: 1, price: [160], icon: 'feather' },
];

const defaultSave = () => ({
  v: 1, started: false, chapter: 0, unlocked: 0, dinars: 0, difficulty: 'adventurer',
  upgrades: { hp: 0, reach: 0, dmg: 0, magnet: 0, compass: 0, feather: 0 },
  relics: [[false, false, false], [false, false, false], [false, false, false], [false, false, false]],
  best: [null, null, null, null], completed: false, totalDeaths: 0,
});

const Game = {
  state: 'boot',
  scene: null,
  time: 0,
  level: null,
  player: null,
  entities: [],
  pending: [],
  rings: [],
  platforms: [],
  stoppers: [],
  collected: new Set(),
  runRelics: [false, false, false],
  hud: { pulse: 0 },
  run: { coins: 0, time: 0 },
  stats: { deaths: 0, hits: 0, kills: 0 },
  hitstopT: 0,
  slowT: 0,
  slowScale: 1,
  fade: { a: 0, target: 0, speed: 1, cb: null },
  flashA: 0,
  flashCol: '#fff',
  bannerT: 0,
  bannerMax: 1,
  bannerText: '',
  boss: null,
  save: Object.assign(defaultSave(), Store.get('andor_save', {})),
  chapterIdx: 0,

  persist() {
    Store.set('andor_save', this.save);
  },
  upgrades() {
    return this.save.upgrades;
  },
  maxHp() {
    return (DIFFS[this.save.difficulty] || DIFFS.adventurer).hp + this.save.upgrades.hp;
  },
  whipReach() {
    return PHYS.whipReach + (this.save.upgrades.reach ? 14 : 0);
  },
  whipDamage() {
    return 1 + (this.save.upgrades.dmg ? 1 : 0);
  },
  addCoins(n) {
    this.run.coins += n;
    this.save.dinars += n;
  },
  score(n) {},
  spawn(e) {
    this.pending.push(e);
    return e;
  },
  hitstop(t) {
    this.hitstopT = Math.max(this.hitstopT, t);
  },
  slowmo(scale, t) {
    this.slowScale = scale;
    this.slowT = t;
  },
  flash(col, a = 0.5) {
    this.flashCol = col;
    this.flashA = a;
  },
  banner(text, t = 2) {
    this.bannerText = text;
    this.bannerT = t;
    this.bannerMax = t;
  },
  squish() {},
  fadeOut(speed, cb) {
    this.fade.target = 1;
    this.fade.speed = 1 / speed;
    this.fade.cb = cb;
  },
  fadeIn(speed) {
    this.fade.target = 0;
    this.fade.speed = 1 / speed;
    this.fade.cb = null;
  },
  go(state, arg) {
    Input.clear();
    this.state = state;
    this.scene = SCENES[state];
    this.sceneT = 0;
    if (this.scene.enter) this.scene.enter(arg);
    TouchUI.visible = state === 'play';
  },

  // ---- levels --------------------------------------------------------------
  loadChapter(idx) {
    this.chapterIdx = idx;
    const def = LEVELS[idx];
    this.level = new Level(def);
    this.level.prerender();
    this.backdrop = new Backdrop(def.theme);
    this.collected = new Set();
    this.run = { coins: 0, time: 0 };
    this.stats = { deaths: 0, hits: 0, kills: 0 };
    this.runRelics = this.save.relics[idx].slice();
    this.checkpoint = null;
    this.litCheckpoints = new Set();
    this.boss = null;
    this.bossDone = false;
    this.totalCoins = 0;
    for (const s of this.level.spawns) this.totalCoins += s.ch === 'o' ? 1 : s.ch === 'O' ? 10 : s.ch === '$' ? 25 : 0;
    Weather.init();
    Weather.storm = Weather.target = 0;
    this.spawnAll();
    Cam.reset(this.player.cx, this.player.cy, this.level);
    Parts.list.length = 0;
  },
  spawnAll() {
    const L = this.level;
    this.entities = [];
    this.pending = [];
    this.rings = [];
    this.platforms = [];
    this.stoppers = [];
    this.boulders = [];
    this.boss = null;
    this.bossTriggers = [];
    let start = { x: 32, y: 32 };
    let relicI = 0, scrollI = 0, cpI = 0;
    // restore tiles altered by gates and crumbles
    for (const s of L.spawns) if (s.ch === 'G' || s.ch === 'C') L.setTile(s.x, s.y, s.ch === 'G' ? T.GATE : T.CRUMBLE);
    const gateCols = new Set();
    for (const s of L.spawns) {
      const id = s.x + s.y * L.w;
      const px = s.x * TILE, py = s.y * TILE;
      const add = (e) => {
        this.entities.push(e);
        return e;
      };
      switch (s.ch) {
        case '@': start = { x: px + 3, y: py - 4 }; break;
        case 'o': if (!this.collected.has(id)) add(new Coin(px + 8, py + 8, 1, false, id)); break;
        case 'O': if (!this.collected.has(id)) add(new Coin(px + 8, py + 8, 10, false, id)); break;
        case '$': if (!this.collected.has(id)) add(new Coin(px + 8, py + 8, 25, false, id)); break;
        case 'h': if (!this.collected.has(id)) add(new Pomegranate(px + 8, py + 10, false, id)); break;
        case '*': {
          const r = new Relic(px + 8, py + 8, relicI++);
          if (!this.collected.has(id)) add(r).sid = id;
          break;
        }
        case '?': {
          const sc = new Scroll(px + 8, py + 10, scrollI++);
          if (!this.collected.has(id)) add(sc).sid = id;
          break;
        }
        case 'K': {
          const cp = add(new Checkpoint(px, py, cpI++));
          if (this.litCheckpoints.has(cp.idx)) cp.lit = true;
          break;
        }
        case 'E': add(new Exit(px, py)); break;
        case 'R': this.rings.push(add(new Ring(px + 8, py + 4))); break;
        case 'P': if (!this.collected.has(id)) add(new Pot(px, py, id)); break;
        case 'L': add(new Lever(px, py)); break;
        case 'G': {
          if (gateCols.has(id)) break;
          let n = 0;
          while (L.tileAt(s.x, s.y + n) === T.GATE) {
            gateCols.add(s.x + (s.y + n) * L.w);
            n++;
          }
          add(new Gate(px, py, Math.max(1, n)));
          break;
        }
        case 'C': add(new Crumble(px, py)); break;
        case 't': add(new Torch(px, py)); break;
        case 'l': add(new Lantern(px, py)); break;
        case 'M': this.platforms.push(add(new MovingPlatform(px, py + 10, false))); break;
        case 'N': this.platforms.push(add(new MovingPlatform(px, py + 10, true))); break;
        case 'x': this.stoppers.push({ x: px, y: py }); break;
        case 'D': {
          L.setTile(s.x, s.y, T.SOLID);
          const dir = isSolidT(L.tileAt(s.x + 1, s.y)) ? -1 : 1;
          add(new DartTrap(px, py, dir, ((s.x * 7 + s.y * 3) % 10) / 10 * 2.1));
          break;
        }
        case 'Y': add(new SwingBlade(px, py, s.x * 0.9)); break;
        case 'f': add(new FireJet(px, py, ((s.x * 5) % 7) / 7 * 2.6)); break;
        case 'r': add(new FallingRock(px, py)); break;
        case 'B': this.boulders.push(add(new Boulder(px, py - 28))); break;
        case '&': this.boulderTrigger = px; break;
        case 'g': add(new Guard(px, py, 'guard')); break;
        case 'd': add(new Guard(px, py, 'bandit')); break;
        case 'a': add(new Archer(px, py)); break;
        case 's': add(new Scorpion(px, py)); break;
        case 'c': add(new Cobra(px, py)); break;
        case 'u': add(new Vulture(px, py)); break;
        case 'b': add(new Bat(px, py)); break;
        case 'm': add(new Mummy(px, py)); break;
        case 'k': for (let i = 0; i < 3; i++) add(new Scarab(px + i * 7 - 7, py)); break;
        case 'j': add(new Jackal(px, py)); break;
        case 'n': add(new Sentinel(px, py)); break;
        case 'z': add(new Wisp(px, py)); break;
        case '1': case '2': case '3': case '4':
          if (!this.bossDone) this.boss = add(makeBoss(+s.ch, px, py));
          break;
        case 'Q': add(new Decor(px, py + 5, ART.camel)); break;
        case 'Z': add(new Decor(px + 5, py + 11, ART.skull)); break;
      }
    }
    // the player
    const cp = this.checkpoint;
    const p = new Player(cp ? cp.x : start.x, cp ? cp.y : start.y);
    this.player = p;
    p.lastSafe = { x: p.x, y: p.y };
    if (this.checkpointFeatherUsed) p.feather = 0;
  },
  setCheckpoint(cp) {
    if (this.checkpoint && this.checkpoint.idx === cp.idx) return;
    this.checkpoint = { x: cp.cx - 5, y: cp.y - 6, idx: cp.idx };
    this.litCheckpoints.add(cp.idx);
  },
  onRelic(r) {
    const already = this.save.relics[this.chapterIdx][r.idx];
    this.runRelics[r.idx] = true;
    this.save.relics[this.chapterIdx][r.idx] = true;
    if (r.sid !== undefined) this.collected.add(r.sid);
    this.persist();
    Sfx.play('relic');
    Cam.shake(2, 0.3);
    this.hitstop(0.12);
    Parts.burst(r.cx, r.cy, 30, { col: ['#fff1b3', '#f4cf62', '#fff8ea'], speed: 120, g: -30, life: 1 });
    Parts.add({ x: r.cx, y: r.cy, type: 'ring', s: 30, life: 0.6, col: '#f4cf62' });
    const n = this.runRelics.filter(Boolean).length;
    this.banner((already ? 'RELIC (ALREADY KNOWN) ' : 'RELIC FOUND ') + n + '/3: ' + RELIC_NAMES[this.chapterIdx][r.idx], 2.6);
    if (this.chapterIdx === 2 && r.idx === 2 && this.boulders.length) {
      // the golden idol was resting on a pressure plate...
      setTimeout(() => {
        if (this.state === 'play') for (const b of this.boulders) if (!b.active && !b.dead) b.start();
      }, 700);
    }
  },
  onScroll(idx) {
    const L = LEVELS[this.chapterIdx];
    const text = (L.scrolls && L.scrolls[idx]) || '...';
    Sfx.play('magic');
    this.go('scroll', text);
  },
  onExit(ex) {
    const p = this.player;
    p.setState('exit');
    p.face = 1;
    Music.stop(1.2);
    Ambience.stop();
    setTimeout(() => Music.phrase('victory'), 300);
    this.fadeOut(1.4, () => this.completeChapter());
  },
  completeChapter() {
    const idx = this.chapterIdx;
    const L = LEVELS[idx];
    const t = this.run.time;
    const d = this.stats.deaths;
    const coinPct = this.totalCoins ? this.run.coins / this.totalCoins : 1;
    let rank = 'C';
    if (d === 0 && t <= L.par && coinPct >= 0.7) rank = 'S';
    else if (d <= 1 && t <= L.par * 1.35) rank = 'A';
    else if (d <= 4) rank = 'B';
    const res = { time: t, deaths: d, coins: this.run.coins, total: this.totalCoins, relics: this.runRelics.filter(Boolean).length, rank, kills: this.stats.kills };
    const best = this.save.best[idx];
    const order = 'SABC';
    if (!best || order.indexOf(rank) < order.indexOf(best.rank) || (rank === best.rank && t < best.time)) this.save.best[idx] = { rank, time: t };
    this.save.unlocked = Math.max(this.save.unlocked, Math.min(LEVELS.length - 1, idx + 1));
    this.save.chapter = Math.min(LEVELS.length - 1, idx + 1);
    if (idx === LEVELS.length - 1) this.save.completed = true;
    this.persist();
    this.go('results', res);
    this.fadeIn(0.5);
  },
  onPlayerDeath() {
    this.save.totalDeaths++;
    this.persist();
    this.go('dead');
  },
  respawn() {
    // the world resets around you; collected things stay collected
    if (this.boss) this.boss = null;
    Cam.lock = null;
    if (this.arenaSealed) this.unsealArena();
    this.spawnAll();
    const p = this.player;
    p.inv = 1.2;
    Cam.reset(p.cx, p.cy, this.level);
    Parts.list.length = 0;
    Music.play(LEVELS[this.chapterIdx].music);
    this.go('play');
    this.fadeIn(0.4);
  },
  sealArena(A) {
    this.arenaSealed = [];
    for (const [x, y, h] of A.seal || []) {
      for (let i = 0; i < h; i++) {
        this.arenaSealed.push([x, y + i, this.level.tileAt(x, y + i)]);
        this.level.setTile(x, y + i, T.GATE);
      }
      const g = new Gate(x * TILE, y * TILE, h);
      g.arena = true;
      this.entities.push(g);
    }
  },
  unsealArena() {
    for (const [x, y, t] of this.arenaSealed || []) this.level.setTile(x, y, t);
    this.arenaSealed = null;
    for (const e of this.entities) if (e instanceof Gate && e.arena) e.dead = true;
  },
  onBossDefeated(b) {
    this.bossDone = true;
    this.slowmo(0.25, 1.4);
    Cam.shake(6, 1);
    this.flash('#fff8ea', 0.8);
    Music.stop(2);
    setTimeout(() => {
      Music.phrase('victory');
      this.unsealArena();
      Cam.lock = null;
      setTimeout(() => {
        if (this.state === 'play') Music.play(LEVELS[this.chapterIdx].music, 2);
      }, 3000);
    }, 1500);
    this.banner(b.title + ' FALLS', 3);
  },

  // ---- world update --------------------------------------------------------
  stepWorld(dt) {
    const L = this.level, p = this.player;
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      return;
    }
    this.run.time += dt;
    for (const pl of this.platforms) pl.update(dt, L);
    p.update(dt, L);
    for (const e of this.entities) if (!e.dead && !(e instanceof MovingPlatform)) e.update(dt, L);
    if (this.pending.length) {
      for (const e of this.pending) this.entities.push(e);
      this.pending.length = 0;
    }
    this.entities = this.entities.filter((e) => !e.dead);
    Parts.update(dt);
    // weather zones
    const def = LEVELS[this.chapterIdx];
    let storm = 0;
    if (def.storm) for (const [x0, x1, s] of def.storm) if (p.cx >= x0 * TILE && p.cx <= x1 * TILE) storm = s;
    Weather.target = storm;
    Weather.update(dt);
    Ambience.setStorm(Weather.storm);
    Ambience.update(dt);
    // boss arena
    const A = def.arena;
    if (A && this.boss && !this.boss.active && !this.bossDone) {
      const ax = A.x * TILE, ay = A.y * TILE;
      if (p.x > ax + A.trigger * TILE && p.x < ax + A.w * TILE && p.y > ay && p.y < ay + A.h * TILE) {
        Cam.lock = { x: ax, y: ay, w: A.w * TILE, h: A.h * TILE };
        this.sealArena(A);
        this.boss.activate();
        Music.play('boss', 0.3);
      }
    }
    // boulder trigger
    if (this.boulderTrigger !== undefined && p.x > this.boulderTrigger) for (const b of this.boulders) if (!b.active && !b.dead) b.start();
    Cam.update(dt, p, L);
    if (this.bannerT > 0) this.bannerT -= dt;
  },
  drawWorld(g) {
    const vw = Screen.vw, vh = Screen.vh;
    const cam = { x: Cam.rx, y: Cam.ry };
    const L = this.level;
    this.backdrop.draw(g, cam, vw, vh, L.horizon, this.time);
    L.drawChunks(g, cam, vw, vh);
    for (const e of this.entities) if (e.layer === 0 && e.onScreen(48)) e.draw(g, cam);
    Parts.draw(g, cam, false);
    for (const e of this.entities) if (e.layer === 1 && e.onScreen(48)) e.draw(g, cam);
    this.player.draw(g, cam);
    for (const e of this.entities) if (e.layer === 2 && e.onScreen(80)) e.draw(g, cam);
    L.drawFakes(g, cam, this.player, STEP);
    Parts.draw(g, cam, true);
    const def = LEVELS[this.chapterIdx];
    if (def.dark) {
      Lighting.begin(def.dark, def.darkTint);
      const p = this.player;
      Lighting.add(p.cx, p.cy - 2, def.playerLight || 74, '#ffb050', 1);
      for (const e of this.entities) if (e.light && e.onScreen(90)) e.light();
      for (const pt of Parts.list) if (pt.type === 'puff' && (pt.col === '#ffc444' || pt.col === '#fff3b8')) Lighting.add(pt.x, pt.y, 10, null, 0.5);
      Lighting.render(g, cam, vw, vh);
    }
    Weather.draw(g, cam, vw, vh, this.time);
    Vignette.draw(g, vw, vh, def.dark ? 1 : 0.7);
  },
};

// ---------------------------------------------------------------------------
// Scenes
const SCENES = {};

SCENES.boot = {
  enter() {
    this.t = 0;
  },
  update(dt) {
    this.t += dt;
    if (Input.anyKey || Input.taps.length) {
      AudioSys.init();
      Input.anyKey = false;
      Game.go('title');
    }
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const a = Math.min(1, this.t * 0.8);
    g.globalAlpha = a;
    const sc = vw >= 300 ? 3 : 2;
    drawLogo(g, vw / 2, vh * 0.32, sc, this.t);
    g.globalAlpha = a * (0.55 + 0.45 * Math.sin(this.t * 3));
    drawText(g, Input.touchMode || 'ontouchstart' in window ? 'TOUCH TO BEGIN' : 'PRESS ANY KEY', vw / 2, vh * 0.72, '#e9dcc0', { align: 'center' });
    g.globalAlpha = 1;
  },
};

SCENES.title = {
  enter() {
    this.t = 0;
    this.bd = new Backdrop('title');
    this.cam = { x: 0, y: 0 };
    this.mode = 'main';
    Music.play('title', 1.5);
    Ambience.play('desert');
    Ambience.setStorm(0);
    this.buildMenu();
    this.hero = { scarf: [] };
    for (let i = 0; i < 7; i++) this.hero.scarf.push({ x: 0, y: 0, px: 0, py: 0 });
  },
  buildMenu() {
    const S = Game.save;
    const items = [];
    if (S.started) items.push({ label: 'CONTINUE: CHAPTER ' + ROMAN[S.chapter], action: () => startChapterFlow(S.chapter, false) });
    items.push({ label: 'NEW JOURNEY', action: () => Game.go('difficulty') });
    items.push({ label: 'CHAPTERS', action: () => Game.go('chapters'), disabled: !S.started });
    items.push({ label: 'OPTIONS', action: () => Game.go('options', 'title') });
    items.push({ label: 'CREDITS', action: () => Game.go('credits') });
    this.menu = new Menu(items);
  },
  update(dt) {
    this.t += dt;
    this.cam.x += dt * 14;
    this.menu.update(dt);
    Ambience.update(dt);
  },
  draw(g, vw, vh) {
    this.bd.draw(g, this.cam, vw, vh, vh * 0.98, this.t);
    // foreground dune with the wanderer
    const duneY = vh - 30;
    g.fillStyle = '#1d1410';
    for (let x = 0; x < vw; x++) {
      const y = Math.round(duneY - Math.sin((x / vw) * Math.PI * 1.1 + 0.2) * 14);
      g.fillRect(x, y, 1, vh - y);
      if (x % 2 === 0) fillR(g, x, y, 1, 1, '#3a2a1c');
    }
    const hx = Math.round(vw * 0.18), hy = Math.round(duneY - Math.sin((hx / vw) * Math.PI * 1.1 + 0.2) * 14) + 1;
    const f = heroFrame('idle0');
    // scarf in the night wind
    const S = this.hero.scarf;
    S[0].x = hx - 5;
    S[0].y = hy - 20;
    for (let i = 1; i < S.length; i++) {
      const p = S[i];
      if (!p.init) {
        p.x = p.px = S[0].x - i * 2;
        p.y = p.py = S[0].y;
        p.init = true;
      }
      const vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
      p.px = p.x;
      p.py = p.y;
      p.x += vx - 0.35 + Math.sin(this.t * 6 + i) * 0.12;
      p.y += vy + 0.04 + Math.cos(this.t * 4 + i * 0.7) * 0.08;
    }
    for (let k = 0; k < 3; k++)
      for (let i = 1; i < S.length; i++) {
        const a = S[i - 1], b = S[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const m = (d - 2.6) / d;
        b.x -= dx * m;
        b.y -= dy * m;
      }
    for (let i = S.length - 1; i > 0; i--) pxLine(g, S[i - 1].x, S[i - 1].y, S[i].x, S[i].y, i % 2 ? '#c0392b' : '#a8302a', i < 3 ? 2 : 1);
    drawSprite(g, f, hx, hy);
    // blowing sand
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97 + this.t * (60 + (i % 5) * 20)) % (vw + 20)) - 10;
      const sy = vh - 40 + ((i * 53) % 40) + Math.sin(this.t * 2 + i) * 3;
      fillR(g, vw - sx, sy, 2, 1, i % 3 ? '#5a4030' : '#8a6a48');
    }
    Vignette.draw(g, vw, vh, 1);
    const sc = vw >= 330 ? 3 : 2;
    const ly = Math.round(vh * 0.1);
    drawLogo(g, vw / 2, ly, sc, this.t);
    drawText(g, 'THE SANDS REMEMBER', vw / 2, ly + 27 * sc, '#e9dcc0', { align: 'center', shadow: '#0e0805' });
    const my = Math.round(vh * 0.5);
    this.menu.draw(g, vw / 2, my, { width: 170 });
    const hint = Input.touchMode ? 'TAP TO CHOOSE' : Input.usingPad ? 'A: CHOOSE   D-PAD: MOVE' : 'ARROWS: MOVE   ENTER / Z: CHOOSE';
    drawText(g, hint, vw / 2, vh - 12, '#8a7a60', { align: 'center' });
  },
};

SCENES.difficulty = {
  enter() {
    this.t = 0;
    const pickD = (d) => {
      const keepSettings = Game.save.relics;
      Game.save = defaultSave();
      Game.save.relics = keepSettings;
      Game.save.difficulty = d;
      Game.save.started = true;
      Game.persist();
      startChapterFlow(0, true);
    };
    this.menu = new Menu(
      Object.keys(DIFFS).map((k) => ({ label: DIFFS[k].name, action: () => pickD(k), key: k })),
      { onBack: () => Game.go('title') }
    );
    this.menu.sel = 1;
  },
  update(dt) {
    this.t += dt;
    this.menu.update(dt);
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const w = Math.min(260, vw - 16), h = 120;
    drawPanel(g, vw / 2 - w / 2, vh / 2 - h / 2, w, h);
    drawText(g, 'CHOOSE YOUR ROAD', vw / 2, vh / 2 - h / 2 + 12, '#f4cf62', { align: 'center' });
    drawDivider(g, vw / 2, vh / 2 - h / 2 + 25, 90);
    this.menu.draw(g, vw / 2, vh / 2 - 24, { width: 150 });
    const d = DIFFS[this.menu.items[this.menu.sel].key];
    const lines = wrapText(d.desc + ' (' + d.hp + ' hearts)', w - 30);
    lines.forEach((l, i) => drawText(g, l, vw / 2, vh / 2 + 22 + i * 10, '#c9b896', { align: 'center' }));
    drawText(g, 'BACK: ESC / X', vw / 2, vh / 2 + h / 2 - 14, '#6e5a44', { align: 'center' });
  },
};

SCENES.chapters = {
  enter() {
    const S = Game.save;
    this.menu = new Menu(
      LEVELS.map((L, i) => ({ label: ROMAN[i] + '. ' + CHAPTERS[i].name.toUpperCase(), disabled: i > S.unlocked, action: () => startChapterFlow(i, false), i })),
      { onBack: () => Game.go('title') }
    );
  },
  update(dt) {
    this.menu.update(dt);
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const w = Math.min(300, vw - 10), h = Math.min(vh - 10, 150);
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2;
    drawPanel(g, x, y, w, h);
    drawText(g, 'CHAPTERS', vw / 2, y + 10, '#f4cf62', { align: 'center' });
    drawDivider(g, vw / 2, y + 22, 80);
    this.menu.draw(g, vw / 2, y + 32, { width: w - 20, lineH: 24 });
    LEVELS.forEach((L, i) => {
      const yy = y + 32 + i * 24 + 11;
      const rel = Game.save.relics[i];
      for (let k = 0; k < 3; k++) {
        const rx = vw / 2 - 16 + k * 11;
        if (rel[k]) drawSprite(g, ART.relics[L.theme], rx, yy + 9);
        else drawSprite(g, STAR8, rx, yy + 4);
      }
      const b = Game.save.best[i];
      if (b) drawText(g, 'RANK ' + b.rank + '  ' + fmtTime(b.time), vw / 2 + 24, yy, '#8a7a60');
      if (i > Game.save.unlocked) drawText(g, 'SEALED', vw / 2 - 60, yy, '#6e5a44');
    });
  },
};

SCENES.options = {
  enter(from) {
    this.from = from;
    const pct = (v) => Math.round(v * 10) + '/10';
    const back = () => {
      saveSettings();
      if (this.from === 'pause') Game.go('pause', true);
      else Game.go('title');
    };
    this.menu = new Menu(
      [
        { label: 'MUSIC', value: () => pct(Settings.music), adjust: (d) => { Settings.music = clamp(Math.round((Settings.music + d * 0.1) * 10) / 10, 0, 1); AudioSys.applyVolumes(); Sfx.play('menu'); } },
        { label: 'SOUND', value: () => pct(Settings.sfx), adjust: (d) => { Settings.sfx = clamp(Math.round((Settings.sfx + d * 0.1) * 10) / 10, 0, 1); AudioSys.applyVolumes(); Sfx.play('coin'); } },
        { label: 'SCREEN SHAKE', value: () => (Settings.shake ? 'ON' : 'OFF'), adjust: () => { Settings.shake = !Settings.shake; Sfx.play('menu'); } },
        { label: 'REDUCED MOTION', value: () => (Settings.reduceMotion ? 'ON' : 'OFF'), adjust: () => { Settings.reduceMotion = !Settings.reduceMotion; Sfx.play('menu'); } },
        { label: 'TOUCH BUTTONS', value: () => ['SMALL', 'MEDIUM', 'LARGE'][Math.round((Settings.touchSize - 0.85) / 0.15)] || 'MEDIUM', adjust: (d) => { Settings.touchSize = clamp(Math.round((Settings.touchSize + d * 0.15) * 100) / 100, 0.85, 1.15); Sfx.play('menu'); } },
        { label: 'VIBRATION', value: () => (Settings.vibrate ? 'ON' : 'OFF'), adjust: () => { Settings.vibrate = !Settings.vibrate; Sfx.play('menu'); } },
        { label: 'SPEEDRUN TIMER', value: () => (Settings.showTimer ? 'ON' : 'OFF'), adjust: () => { Settings.showTimer = !Settings.showTimer; Sfx.play('menu'); } },
        { label: 'BACK', action: back },
      ],
      { onBack: back }
    );
  },
  update(dt) {
    this.menu.update(dt);
  },
  draw(g, vw, vh) {
    if (this.from === 'pause' && Game.level) {
      Game.drawWorld(g);
      fillR(g, 0, 0, vw, vh, 'rgba(14,8,5,0.7)');
    } else fillR(g, 0, 0, vw, vh, '#0e0907');
    const w = Math.min(250, vw - 10), h = 132;
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2;
    drawPanel(g, x, y, w, h);
    drawText(g, 'OPTIONS', vw / 2, y + 9, '#f4cf62', { align: 'center' });
    drawDivider(g, vw / 2, y + 21, 70);
    this.menu.draw(g, vw / 2, y + 28, { width: w - 20, lineH: 12 });
  },
};

SCENES.story = {
  enter(arg) {
    this.pages = arg.pages;
    this.done = arg.done;
    this.art = arg.art;
    this.i = 0;
    this.t = 0;
    this.chars = 0;
    if (arg.music) Music.play(arg.music);
    this.bd = arg.art ? new Backdrop(arg.art) : null;
    this.cam = { x: 0, y: 0 };
  },
  update(dt) {
    this.t += dt;
    this.cam.x += dt * 10;
    const page = this.pages[this.i];
    const prev = Math.floor(this.chars);
    this.chars = Math.min(page.length, this.chars + dt * 42);
    if (Math.floor(this.chars) !== prev && Math.floor(this.chars) % 3 === 0 && page[Math.floor(this.chars)] !== ' ') Sfx.play('tink', 0.6);
    const adv = Input.takePress('confirm') || Input.takePress('jump') || Input.takePress('whip') || Input.taps.length > 0;
    if (Input.takePress('back') || Input.takePress('pause')) return this.finish();
    if (adv) {
      if (this.chars < page.length) this.chars = page.length;
      else if (this.i < this.pages.length - 1) {
        this.i++;
        this.chars = 0;
        Sfx.play('menu');
      } else this.finish();
    }
  },
  finish() {
    if (this.finished) return;
    this.finished = true;
    Sfx.play('select');
    const d = this.done;
    Game.fadeOut(0.35, () => {
      d();
      Game.fadeIn(0.35);
    });
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const w = Math.min(300, vw - 12);
    const artH = Math.min(86, Math.round(vh * 0.4));
    const x = Math.round(vw / 2 - w / 2);
    const page = this.pages[this.i];
    const lines = wrapText(page, w - 26);
    const textH = lines.length * 11 + 24;
    const h = artH + textH + 12;
    const y = Math.round(vh / 2 - h / 2);
    drawPanel(g, x, y, w, h, { parchment: true });
    // illustration window
    if (this.bd) {
      g.save();
      g.beginPath();
      g.rect(x + 8, y + 8, w - 16, artH);
      g.clip();
      g.translate(x + 8, y + 8);
      this.bd.draw(g, this.cam, w - 16, artH, artH * 1.05, this.t);
      const f = heroFrame('run' + (Math.floor(this.t * 10) % 8));
      if (this.art !== 'tomb') drawSprite(g, f, (w - 16) * 0.3, artH - 6);
      g.restore();
      fillR(g, x + 7, y + 7, w - 14, 1, '#6e3f10');
      fillR(g, x + 7, y + 8 + artH, w - 14, 1, '#6e3f10');
    }
    const shown = page.slice(0, Math.floor(this.chars));
    const sl = wrapText(shown, w - 26);
    sl.forEach((l, i) => drawText(g, l, x + 13, y + artH + 18 + i * 11, '#2d1c13'));
    if (this.chars >= page.length && Math.sin(this.t * 5) > 0) drawSprite(g, STAR8, x + w - 14, y + h - 12);
    drawText(g, this.i + 1 + '/' + this.pages.length, x + 12, y + h - 15, '#8a6a48');
  },
};

SCENES.card = {
  enter(idx) {
    this.idx = idx;
    this.t = 0;
    Sfx.play('banner');
  },
  update(dt) {
    this.t += dt;
    if (this.t > 3.2 || (this.t > 0.6 && (Input.takePress('confirm') || Input.takePress('jump') || Input.taps.length))) {
      if (this.leaving) return;
      this.leaving = true;
      Game.fadeOut(0.4, () => {
        this.leaving = false;
        beginPlay(this.idx);
      });
    }
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const C0 = CHAPTERS[this.idx];
    const a = Math.min(1, this.t * 1.5);
    g.globalAlpha = a;
    drawText(g, 'CHAPTER ' + ROMAN[this.idx], vw / 2, vh * 0.3, '#dea12a', { align: 'center', scale: 2 });
    drawDivider(g, vw / 2, Math.round(vh * 0.3) + 24, 120);
    g.globalAlpha = Math.min(1, Math.max(0, (this.t - 0.4) * 1.5));
    drawText(g, C0.name.toUpperCase(), vw / 2, vh * 0.3 + 34, '#f9edd2', { align: 'center' });
    g.globalAlpha = Math.min(1, Math.max(0, (this.t - 1.0) * 1.2));
    wrapText(C0.epigraph, Math.min(260, vw - 30)).forEach((l, i) => drawText(g, l, vw / 2, vh * 0.3 + 58 + i * 11, '#8a7a60', { align: 'center' }));
    g.globalAlpha = 1;
  },
};

SCENES.play = {
  enter(resume) {},
  update(dt) {
    if (Input.p.pause && Game.player.state !== 'dead') {
      Game.go('pause');
      Sfx.play('pause');
      return;
    }
    Game.stepWorld(dt);
  },
  draw(g, vw, vh) {
    Game.drawWorld(g);
    drawHUD(g, vw, vh, Game.time);
  },
};

SCENES.pause = {
  enter(fromOptions) {
    const resume = () => {
      Game.go('play');
    };
    this.menu = new Menu(
      [
        { label: 'RESUME', action: resume },
        { label: 'RETURN TO THE FLAME', action: () => { Game.fadeOut(0.3, () => { Game.respawn(); }); } },
        { label: 'OPTIONS', action: () => Game.go('options', 'pause') },
        { label: 'ABANDON TO TITLE', action: () => { Game.fadeOut(0.4, () => { Music.stop(); Ambience.stop(); Game.go('title'); Game.fadeIn(0.4); }); } },
      ],
      { onBack: resume }
    );
  },
  update(dt) {
    if (Input.takePress('pause')) return Game.go('play');
    this.menu.update(dt);
  },
  draw(g, vw, vh) {
    Game.drawWorld(g);
    fillR(g, 0, 0, vw, vh, 'rgba(14,8,5,0.62)');
    const w = Math.min(220, vw - 10), h = 92;
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2;
    drawPanel(g, x, y, w, h);
    drawText(g, 'PAUSED', vw / 2, y + 9, '#f4cf62', { align: 'center' });
    drawDivider(g, vw / 2, y + 21, 60);
    this.menu.draw(g, vw / 2, y + 30, { width: w - 20, lineH: 13 });
    drawText(g, CHAPTERS[Game.chapterIdx].name.toUpperCase() + '   ' + fmtTime(Game.run.time), vw / 2, y + h + 6, '#8a7a60', { align: 'center' });
  },
};

SCENES.scroll = {
  enter(text) {
    this.text = text;
    this.t = 0;
  },
  update(dt) {
    this.t += dt;
    if (this.t > 0.4 && (Input.takePress('confirm') || Input.takePress('jump') || Input.takePress('whip') || Input.takePress('back') || Input.taps.length)) {
      Sfx.play('menu');
      Game.go('play');
    }
  },
  draw(g, vw, vh) {
    Game.drawWorld(g);
    drawHUD(g, vw, vh, Game.time);
    const w = Math.min(260, vw - 16);
    const lines = wrapText(this.text, w - 28);
    const h = lines.length * 11 + 30;
    const x = vw / 2 - w / 2, y = Math.round(vh / 2 - h / 2);
    const k = Math.min(1, this.t * 5);
    g.globalAlpha = k;
    drawPanel(g, x, y, w, h, { parchment: true });
    lines.forEach((l, i) => drawText(g, l, x + 14, y + 13 + i * 11, '#2d1c13'));
    g.globalAlpha = 1;
  },
};

SCENES.dead = {
  enter() {
    this.t = 0;
    Music.stop(0.8);
    this.line = pick(['THE SANDS CLAIM ANOTHER.', 'NOT EVERY ROAD IS WALKED IN ONE DAY.', 'THE HAKIM WAITS. RISE.', 'EVEN KINGS STUMBLE IN THE DUNES.']);
  },
  update(dt) {
    this.t += dt;
    Parts.update(dt);
    if (this.t > 1.2 && (Input.takePress('confirm') || Input.takePress('jump') || Input.taps.length || this.t > 3.2)) {
      if (this.going) return;
      this.going = true;
      Game.fadeOut(0.4, () => {
        this.going = false;
        Game.respawn();
      });
    }
  },
  draw(g, vw, vh) {
    Game.drawWorld(g);
    const a = Math.min(0.75, this.t * 0.8);
    fillR(g, 0, 0, vw, vh, `rgba(40,6,6,${a})`);
    g.globalAlpha = Math.min(1, this.t);
    drawText(g, this.line, vw / 2, vh * 0.42, '#f4cf62', { align: 'center', outline: '#0e0805' });
    drawText(g, 'YOU RISE AGAIN BY THE LAST FLAME', vw / 2, vh * 0.42 + 14, '#c9b896', { align: 'center' });
    g.globalAlpha = 1;
  },
};

SCENES.results = {
  enter(res) {
    this.r = res;
    this.t = 0;
    this.stamped = false;
  },
  update(dt) {
    this.t += dt;
    if (this.t > 2.1 && !this.stamped) {
      this.stamped = true;
      Sfx.play('slam');
      Cam.shake(3, 0.3);
    }
    if (this.t > 1.0 && (Input.takePress('confirm') || Input.takePress('jump') || Input.taps.length)) {
      if (this.leaving) return;
      this.leaving = true;
      const next = Game.chapterIdx + 1;
      Game.fadeOut(0.4, () => {
        this.leaving = false;
        if (next >= LEVELS.length) {
          Game.go('story', { pages: STORY.ending, art: 'bazaar', music: 'title', done: () => Game.go('credits', true) });
        } else {
          Game.go('shop', next);
        }
        Game.fadeIn(0.4);
      });
    }
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const w = Math.min(250, vw - 12), h = 150;
    const x = vw / 2 - w / 2, y = vh / 2 - h / 2;
    drawPanel(g, x, y, w, h);
    drawText(g, 'CHAPTER ' + ROMAN[Game.chapterIdx] + ' COMPLETE', vw / 2, y + 10, '#f4cf62', { align: 'center' });
    drawDivider(g, vw / 2, y + 22, 110);
    const r = this.r;
    const rows = [
      ['TIME', fmtTime(r.time)],
      ['DINARS', r.coins + ' / ' + r.total],
      ['RELICS', r.relics + ' / 3'],
      ['FOES BESTED', String(r.kills)],
      ['FALLS', String(r.deaths)],
    ];
    rows.forEach(([k, v], i) => {
      if (this.t < 0.3 + i * 0.25) return;
      drawText(g, k, x + 18, y + 32 + i * 13, '#c9b896');
      drawText(g, v, x + w * 0.62, y + 32 + i * 13, '#f9edd2');
    });
    if (this.t > 2.1) {
      const k = Math.max(1, 3 - (this.t - 2.1) * 12);
      const col = r.rank === 'S' ? '#f4cf62' : r.rank === 'A' ? '#8de0c8' : r.rank === 'B' ? '#e9dcc0' : '#c9a46a';
      drawText(g, 'RANK', x + w - 44, y + 30, '#8a7a60', { align: 'center' });
      drawText(g, r.rank, x + w - 44, y + 46 - (k - 1) * 4, col, { align: 'center', scale: Math.round(k * 3), outline: '#0e0805' });
    }
    if (this.t > 1.0 && Math.sin(this.t * 5) > -0.3) drawText(g, Input.touchMode ? 'TAP TO CONTINUE' : 'PRESS JUMP TO CONTINUE', vw / 2, y + h - 16, '#8a7a60', { align: 'center' });
  },
};

SCENES.shop = {
  enter(next) {
    this.next = next;
    this.t = 0;
    this.msg = pick(['Peace be upon you, traveller. Rest your feet, and lighten your purse.', 'Every road out of here is dangerous. Every road. Buy something.', 'For a friend of the Hakim, honest prices. Mostly honest.']);
    Music.play('shop');
    Ambience.stop();
    this.bd = new Backdrop('desert');
    this.cam = { x: 120, y: 0 };
    const items = SHOP_ITEMS.map((it) => ({
      label: it.name,
      it,
      action: () => this.buy(it),
    }));
    items.push({ label: 'TAKE THE ROAD', action: () => this.leave() });
    this.menu = new Menu(items, { onBack: () => this.leave() });
  },
  price(it) {
    const lvl = Game.save.upgrades[it.id] || 0;
    return lvl >= it.max ? null : it.price[lvl];
  },
  buy(it) {
    const p = this.price(it);
    if (p === null) {
      this.msg = 'You already carry the best I have of that.';
      Sfx.play('denied');
      return;
    }
    if (Game.save.dinars < p) {
      this.msg = 'Ah... the purse is light. Come back with ' + p + ' dinars.';
      Sfx.play('denied');
      return;
    }
    Game.save.dinars -= p;
    Game.save.upgrades[it.id] = (Game.save.upgrades[it.id] || 0) + 1;
    Game.persist();
    this.msg = pick(['A fine choice. May it serve you well.', 'Sold! Your Hakim would approve.', 'Take it, take it. And come back alive.']);
    Sfx.play('buy');
  },
  leave() {
    if (this.leaving) return;
    this.leaving = true;
    Game.fadeOut(0.4, () => {
      this.leaving = false;
      startChapterFlow(this.next, true);
      Game.fadeIn(0.4);
    });
  },
  update(dt) {
    this.t += dt;
    this.cam.x += dt * 4;
    this.menu.update(dt);
  },
  draw(g, vw, vh) {
    this.bd.draw(g, this.cam, vw, vh, vh * 0.9, this.t);
    fillR(g, 0, 0, vw, vh, 'rgba(30,14,6,0.55)');
    const w = Math.min(310, vw - 8), h = Math.min(vh - 8, 176);
    const x = Math.round(vw / 2 - w / 2), y = Math.round(vh / 2 - h / 2);
    drawPanel(g, x, y, w, h);
    drawText(g, 'THE CARAVANSERAI', vw / 2, y + 8, '#f4cf62', { align: 'center' });
    drawDivider(g, vw / 2, y + 20, 100);
    // merchant: a turbaned elder with a lamp
    const mf = rigFrame('archer', 'idle0');
    drawSprite(g, mf, x + 22, y + 52);
    drawFlame(g, x + 34, y + 44, 6, this.t);
    const lines = wrapText('"' + this.msg + '"', w - 56);
    lines.slice(0, 3).forEach((l, i) => drawText(g, l, x + 42, y + 26 + i * 10, '#e9dcc0'));
    // wallet
    drawSprite(g, ART.coin[0], x + w - 52, y + 15);
    drawText(g, String(Game.save.dinars), x + w - 46, y + 8, '#f4cf62');
    // items
    const top = y + 62;
    const lh = Math.min(15, Math.floor((h - 76) / this.menu.items.length));
    this.menu.rects = [];
    this.menu.items.forEach((mi, i) => {
      const yy = top + i * lh;
      const sel = i === this.menu.sel;
      if (sel) fillR(g, x + 6, yy - 2, w - 12, lh - 1, 'rgba(222,161,42,0.16)');
      this.menu.rects.push({ x: x + 6, y: yy - 2, w: w - 12, h: lh - 1 });
      if (mi.it) {
        const pr = this.price(mi.it);
        const lvl = Game.save.upgrades[mi.it.id] || 0;
        drawShopIcon(g, mi.it.icon, x + 16, yy + 3, this.t);
        drawText(g, mi.label + (mi.it.max > 1 ? ' ' + '*'.repeat(lvl) : ''), x + 28, yy, sel ? '#f4cf62' : '#e9dcc0');
        drawText(g, pr === null ? 'OWNED' : pr + ' D', x + w - 14, yy, pr === null ? '#6e8a60' : Game.save.dinars >= pr ? '#f4cf62' : '#8a5a40', { align: 'right' });
      } else drawText(g, mi.label, vw / 2, yy, sel ? '#f4cf62' : '#e9dcc0', { align: 'center' });
    });
    const cur = this.menu.items[this.menu.sel];
    if (cur && cur.it) drawText(g, cur.it.desc, vw / 2, y + h - 13, '#c9b896', { align: 'center' });
  },
};
function drawShopIcon(g, icon, x, y, t) {
  if (icon === 'pom') drawSprite(g, ART.pomegranate, x, y + 5);
  else if (icon === 'whip') {
    for (let i = 0; i < 9; i++) fillR(g, x - 4 + i, y + Math.round(Math.sin(i * 0.8) * 2), 1, 1, '#8b5a34');
    fillR(g, x - 5, y - 1, 2, 3, '#2d1c13');
  } else if (icon === 'grip') {
    fillR(g, x - 3, y - 3, 6, 7, '#c9a052');
    fillR(g, x - 3, y - 3, 6, 1, '#f4cf62');
    fillR(g, x - 1, y - 1, 2, 3, '#6b4024');
  } else if (icon === 'magnet') {
    pxRing(g, x, y, 4, '#c0392b');
    fillR(g, x - 4, y, 2, 3, '#d8d8de');
    fillR(g, x + 3, y, 2, 3, '#d8d8de');
  } else if (icon === 'compass') drawSprite(g, ART.relics.bazaar, x, y + 5);
  else if (icon === 'feather') {
    for (let i = 0; i < 8; i++) fillR(g, x - 3 + i, y + 3 - i, 2, 1, i % 2 ? '#3fb5a3' : '#8de0c8');
    fillR(g, x - 4, y + 4, 2, 1, '#dea12a');
  }
}

SCENES.credits = {
  enter(final) {
    this.final = final;
    this.t = 0;
    if (!final) Music.play('title');
  },
  update(dt) {
    this.t += dt * (Input.held.jump || Input.held.confirm ? 3 : 1);
    if ((Input.takePress('back') || Input.takePress('pause') || this.t > CREDITS.length * 1.6 + 8) && !this.leaving) {
      this.leaving = true;
      Game.fadeOut(0.5, () => {
        this.leaving = false;
        Game.go('title');
        Game.fadeIn(0.5);
      });
    }
  },
  draw(g, vw, vh) {
    fillR(g, 0, 0, vw, vh, '#0e0907');
    const y0 = vh - this.t * 22;
    drawLogo(g, vw / 2, y0, 2, this.t);
    CREDITS.forEach((c, i) => {
      const y = y0 + 70 + i * 16;
      if (y < -10 || y > vh + 10) return;
      drawText(g, c[0], vw / 2, y, c[1] || '#e9dcc0', { align: 'center' });
    });
    if (this.final) {
      const y = y0 + 70 + CREDITS.length * 16 + 20;
      const deaths = Game.save.totalDeaths;
      drawText(g, 'THE JOURNEY TOOK ' + deaths + ' FALLS', vw / 2, y, '#8a7a60', { align: 'center' });
    }
  },
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

function startChapterFlow(idx, withStory) {
  Game.save.chapter = idx;
  Game.save.started = true;
  Game.persist();
  const st = STORY.before[idx];
  if (withStory && st) Game.go('story', { pages: st.pages, art: st.art, music: 'title', done: () => Game.go('card', idx) });
  else Game.go('card', idx);
}
function beginPlay(idx) {
  Game.checkpointFeatherUsed = false;
  Game.loadChapter(idx);
  const L = LEVELS[idx];
  Music.play(L.music, 1);
  Ambience.play(L.ambience || L.theme);
  Game.go('play');
  Game.fadeIn(0.5);
}

// ---------------------------------------------------------------------------
// Main loop
let _last = performance.now(), _acc = 0;
function frame(ts) {
  let dt = Math.min(0.1, Math.max(0, (ts - _last) / 1000));
  _last = ts;
  if (Game.slowT > 0) {
    Game.slowT -= dt;
    dt *= Game.slowScale;
  }
  _acc += dt;
  let steps = 0;
  while (_acc >= STEP && steps < 6) {
    Input.step();
    Game.time += STEP;
    if (Game.scene && Game.scene.update) Game.scene.update(STEP);
    // fade
    const F = Game.fade;
    if (F.a !== F.target) {
      F.a = approach(F.a, F.target, F.speed * STEP);
      if (F.a === F.target && F.cb) {
        const cb = F.cb;
        F.cb = null;
        cb();
      }
    }
    Game.flashA = Math.max(0, Game.flashA - STEP * 3);
    Input.taps.length = 0;
    _acc -= STEP;
    steps++;
  }
  if (steps >= 6) _acc = 0;
  render();
  requestAnimationFrame(frame);
}
function render() {
  const vw = Screen.vw, vh = Screen.vh;
  const g = vctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  if (Game.scene && Game.scene.draw) Game.scene.draw(g, vw, vh);
  if (Game.flashA > 0) {
    g.globalAlpha = Game.flashA;
    fillR(g, 0, 0, vw, vh, Game.flashCol);
    g.globalAlpha = 1;
  }
  if (Game.fade.a > 0) {
    g.globalAlpha = Game.fade.a;
    fillR(g, 0, 0, vw, vh, '#0e0907');
    g.globalAlpha = 1;
  }
  ctx.fillStyle = '#0e0907';
  ctx.fillRect(0, 0, Screen.W, Screen.H);
  ctx.drawImage(VC, Screen.vx, Screen.vy);
  drawTouchControls(ctx, Game.time);
}

function boot() {
  const doResize = () => {
    resizeScreen(Input.touchMode);
    TouchUI.layout();
  };
  doResize();
  window.addEventListener('resize', doResize);
  window.addEventListener('orientationchange', () => setTimeout(doResize, 200));
  Bus.on('resize', doResize);
  Bus.on('pointerdown', () => {
    if (!AudioSys.ctx) AudioSys.init();
    else if (AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume();
    if (Music.pending && AudioSys.ok) {
      const n = Music.pending;
      Music.pending = null;
      Music.play(n);
    }
  });
  Bus.on('key', () => {
    if (!AudioSys.ctx) AudioSys.init();
    if (Music.pending && AudioSys.ok) {
      const n = Music.pending;
      Music.pending = null;
      Music.play(n);
    }
  });
  Bus.on('blur', () => {
    if (Game.state === 'play') Game.go('pause');
  });
  if (DEBUG.level !== undefined) {
    AudioSys.init();
    Game.save.difficulty = Game.save.difficulty || 'adventurer';
    beginPlay(+DEBUG.level);
    if (DEBUG.x !== undefined) {
      Game.player.x = DEBUG.x * TILE;
      Game.player.y = (DEBUG.y || 1) * TILE;
      Game.player.lastSafe = { x: Game.player.x, y: Game.player.y };
      Cam.reset(Game.player.cx, Game.player.cy, Game.level);
    }
  } else if (DEBUG.scene) {
    AudioSys.init();
    Game.go(DEBUG.scene, DEBUG.arg);
  } else Game.go('boot');
  requestAnimationFrame(frame);
}

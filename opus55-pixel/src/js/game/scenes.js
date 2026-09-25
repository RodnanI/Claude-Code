// ---------------------------------------------------------------------------
// Scenes: title, prologue, gameplay (with pause and game over), ending.
// G holds the live world state shared by every module.
// ---------------------------------------------------------------------------
const G = {
  time: 0, hitstop: 0, slow: 0, map: null, ents: [], props: [], fronts: [], player: null, cam: null,
  script: null, seen: new Set(), platforms: [], fade: 1, fadeTo: 0, fadeV: 0.04, fxOn: true, carry: null, moonRage: 0,
  stats: { kills: 0, maxCombo: 0, parries: 0, deaths: 0, hurt: 0, start: 0, frames: 0 },
  dbg: [], debugBoxes: false,
  resetStats() { this.stats = { kills: 0, maxCombo: 0, parries: 0, deaths: 0, hurt: 0, frames: 0 }; },
};

const Scenes = {
  cur: null,
  go(s) { if (this.cur && this.cur.exit) this.cur.exit(); this.cur = s; if (s.enter) s.enter(); Input.flush(); },
};

const SAVE = {
  get() { try { return JSON.parse(localStorage.getItem('returning-swallow') || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem('returning-swallow', JSON.stringify({ ...this.get(), ...o })); } catch (e) { /* storage unavailable */ } },
};

const CONTROLS = [
  ['Move', 'A D  /  Arrows'], ['Jump (twice in air)', 'Space  K  /  Z'], ['Attack', 'J  /  X'], ['Up + Attack', 'Launcher'],
  ['Down + Attack (air)', 'Plunge'], ['Dash', 'L  Shift  /  Shift'], ['Guard, tap to Parry', 'U  /  C'], ['Qi Wave', 'I  /  V'],
  ['Ultimate (full qi)', 'O  /  B'], ['Pause', 'Esc  P'],
];
function drawControls(ctx, y0 = 40) {
  ornateBox(ctx, 80, y0, 320, 176);
  Font.draw(ctx, 'THE WAY OF THE SWALLOW SWORD', VW / 2, y0 + 8, '#d6a53a', { align: 'center' });
  CONTROLS.forEach(([a, b], i) => {
    Font.draw(ctx, a, 96, y0 + 26 + i * 14, '#efe3c8');
    Font.draw(ctx, b, 384, y0 + 26 + i * 14, '#c8a050', { align: 'right' });
  });
  Font.draw(ctx, 'Gamepad supported', VW / 2, y0 + 164, '#8a7a64', { align: 'center' });
}

// ---------------------------------------------------------------------------
class TitleScene {
  enter() {
    G.fade = 1; G.fadeTo = 0; G.fadeV = 0.02;
    const L = LEVELS[0], B = new MapBuilder(L.w, L.h); L.build(B);
    G.map = new TileMap(B.rows());
    this.bd = Backdrop.make('peak', G.map);
    this.t = 0; this.sel = 0; this.mode = 'press'; this.cranes = [];
    for (let i = 0; i < 5; i++) this.cranes.push({ x: rnd(-200, 480), y: rnd(30, 110), s: rnd(0.25, 0.5), ph: rnd(TAU) });
    const save = SAVE.get();
    this.unlocked = save.chapter || 1;
    this.items = ['Begin the Journey', 'Chapters', 'Controls'];
    this.hero = new Actor('hero', 0, 0, -1); this.hero.shadow = false;
    this.cliff = cachedArt('titleCliff', genTitleCliff);
    if (AudioSys.ready) Music.play('title');
  }
  update() {
    this.t++; G.time++;
    FX.update();
    if (this.t % 9 === 0) FX.part({ kind: 'petal', x: rnd(0, VW + 60), y: -4, vx: rnd(-0.5, -0.1), vy: rnd(0.3, 0.6), sway: 0.06, life: 500, cols: ['#f6d6dc', '#e8a0ac'], layer: 1, spin: 0.08 });
    if (this.mode === 'press') {
      if (Input.hit('confirm') || Input.hit('attack') || this.anyKey) { this.anyKey = false; AudioSys.init(); Music.play('title'); SFX.play('select'); this.mode = 'menu'; }
      return;
    }
    if (this.mode === 'controls' || this.mode === 'chapters') {
      if (this.mode === 'chapters') {
        if (Input.hit('down')) { this.csel = Math.min(this.unlocked - 1, this.csel + 1); SFX.play('menu'); }
        if (Input.hit('up')) { this.csel = Math.max(0, this.csel - 1); SFX.play('menu'); }
        if (Input.hit('confirm')) { SFX.play('select'); startGame(this.csel); return; }
      }
      if (Input.hit('back') || (this.mode === 'controls' && Input.hit('confirm'))) { this.mode = 'menu'; SFX.play('menu'); }
      return;
    }
    if (Input.hit('down')) { this.sel = (this.sel + 1) % this.items.length; SFX.play('menu'); }
    if (Input.hit('up')) { this.sel = (this.sel + this.items.length - 1) % this.items.length; SFX.play('menu'); }
    if (Input.hit('confirm')) {
      SFX.play('select');
      if (this.sel === 0) Scenes.go(new PrologueScene());
      else if (this.sel === 1) { this.mode = 'chapters'; this.csel = 0; }
      else this.mode = 'controls';
    }
  }
  draw(ctx) {
    const cam = { x: this.t * 0.25, y: 60 };
    Backdrop.draw(ctx, this.bd, cam, G.map, this.t);
    for (const c of this.cranes) {
      c.x += c.s; if (c.x > VW + 30) { c.x = -30; c.y = rnd(30, 110); }
      drawCrane(ctx, c.x, c.y + Math.sin(this.t * 0.02 + c.ph) * 4, this.t + c.ph * 20);
    }
    // the hero on a cliff, facing the sunrise
    ctx.drawImage(this.cliff, VW - this.cliff.width, VH - this.cliff.height);
    const h = this.hero, hc = { x: 0, y: 0 };
    h.at++; h.x = VW - 96; h.y = VH - 58; h.facing = -1;
    h.frame = frameFor(h.C, 'look', Math.floor(h.at));
    const m = G.map; G.map = null; G.wind = -0.35 + Math.sin(this.t * 0.02) * 0.15; h.updateRibbons(); G.map = m;
    h.draw(ctx, hc);
    FX.draw(ctx, { x: 0, y: 0 }, 1);
    // title block
    inkStroke(ctx, VW / 2, 78, 330, 46, 3, 0.9);
    Font.draw(ctx, 'RETURNING SWALLOW', VW / 2, 62, '#f6ecd6', { align: 'center', scale: 3, outline: '#140c0a' });
    Font.draw(ctx, 'A TALE OF THE MURIM', VW / 2, 98, '#d6a53a', { align: 'center', outline: '#140c0a' });
    seal(ctx, VW / 2 + 166, 70, 1);
    if (this.mode === 'press') {
      if ((this.t >> 5) & 1) Font.draw(ctx, 'PRESS ANY KEY', VW / 2, 190, '#f6ecd6', { align: 'center', outline: '#140c0a' });
    } else if (this.mode === 'menu') {
      this.items.forEach((s, i) => {
        const y = 160 + i * 16, on = i === this.sel;
        if (on) inkStroke(ctx, VW / 2, y + 4, Font.width(s) + 40, 13, i + 1, 0.85);
        Font.draw(ctx, s, VW / 2, y, on ? '#ffe08a' : '#efe3c8', { align: 'center', outline: '#140c0a' });
      });
    } else if (this.mode === 'controls') drawControls(ctx);
    else if (this.mode === 'chapters') {
      ornateBox(ctx, 110, 120, 260, 86);
      LEVELS.forEach((L, i) => {
        const lock = i >= this.unlocked, on = i === this.csel;
        Font.draw(ctx, lock ? '. . .' : `${L.chapter}: ${L.name}`, VW / 2, 130 + i * 17, lock ? '#5a4a3a' : on ? '#ffe08a' : '#efe3c8', { align: 'center' });
      });
    }
    Font.draw(ctx, 'opus55-pixel', VW - 6, VH - 12, '#8a6a4a', { align: 'right' });
  }
}
Input.onKey(() => { if (Scenes.cur instanceof TitleScene && Scenes.cur.mode === 'press') Scenes.cur.anyKey = true; });

function genTitleCliff() {
  const W = 170, H = 96, P = new Paint(W, H);
  const top = x => 38 + Math.max(0, (x - 120) * 0.9) + (pfbm(x / 9, 40, 3, 5) - 0.5) * 8 - (x > 60 && x < 110 ? 4 : 0);
  const T = x => Math.round(top(x) + (x < 40 ? (40 - x) * 1.4 : 0));
  for (let x = 0; x < W; x++) {
    const t = T(x), sunward = T(x + 1) < t || T(x - 1) > t + 1;
    for (let y = Math.max(0, t); y < H; y++) {
      const d = y - t, n = hash2(x >> 1, y >> 1, 7);
      // sunrise rim on edges facing the sun, cooling into the silhouette
      let c = d < 1 ? (sunward ? '#b07a4c' : '#6a4a34') : d < 2 ? (sunward ? '#5e4230' : '#3a2c24') : d < 4 ? '#241c19' : n > 0.93 ? '#2a211d' : '#161110';
      if (d > 4 && Math.abs(Math.sin(x * 0.2 + y * 0.05)) < 0.04) c = '#231b18';
      if (d > 5 && d < 30 && Math.abs(Math.sin(x * 0.2 + y * 0.05)) < 0.04 && bayer(x, y) < 0.3 - d / 100) c = '#3e2e24';
      P.px(x, y, c);
    }
  }
  pineTree(P, 38, 44, 0.95, { trunk: ['#120d0b', '#1c1512', '#2a201b'], leaf: ['#101a10', '#172415', '#20301b', '#2c3f23'] }, new RNG(4));
  return P.done();
}
function drawCrane(ctx, x, y, t) {
  x = Math.round(x); y = Math.round(y);
  const f = Math.floor(t / 10) % 4, wing = [-3, -1, 2, -1][f];
  ctx.fillStyle = '#f6f0e4';
  ctx.fillRect(x - 3, y, 7, 2); ctx.fillRect(x + 4, y - 1, 4, 1); ctx.fillRect(x + 8, y - 2, 2, 1);
  ctx.fillStyle = '#c23a22'; ctx.fillRect(x + 9, y - 3, 1, 1);
  ctx.fillStyle = '#2a2020'; ctx.fillRect(x + 10, y - 2, 2, 1); ctx.fillRect(x - 7, y + 1, 4, 1);
  ctx.fillStyle = '#e8e0d0';
  for (let i = 0; i < 6; i++) ctx.fillRect(x - 2 + i, y + Math.round(wing * (1 - i / 6)) - (wing < 0 ? 1 : 0), 1, 1);
  ctx.fillStyle = '#1a1414'; ctx.fillRect(x - 2, y + wing - (wing < 0 ? 1 : 0), 2, 1);
}

function startGame(idx = 0) {
  G.resetStats(); G.seen = new Set(); G.carry = null; G.persistArenas = [];
  Scenes.go(new GameScene(idx));
}

// ---------------------------------------------------------------------------
class PrologueScene {
  enter() {
    this.lines = [
      'Forty years ago, the Nine Orthodox Sects drove the Crimson Heaven Cult into the western wastes.',
      'The murim called it peace.',
      'Peace, like snow on a plum branch, is lovely. And it does not last.',
    ];
    this.t = 0; this.step = 0; this.stage = 'text';
    Music.play('sorrow');
  }
  update() {
    this.t++; G.time++;
    if (Input.hit('skip') || Input.hit('pause')) { Scenes.go(new GameScene(0)); return; }
    if (this.stage === 'text') {
      if (Input.hit('confirm') && this.t > 30) { this.step++; this.t = 0; SFX.play('menu'); }
      if (this.t > 260) { this.step++; this.t = 0; }
      if (this.step >= this.lines.length) { this.stage = 'scene'; this.setupScene(); }
      return;
    }
    G.time++;
    if (G.script) { const r = G.script.next(); if (r.done) G.script = null; }
    Dialogue.update();
    for (const e of G.ents) e.update();
    for (const p of G.props) p.update();
    FX.update();
    if (G.time % 3 === 0) FX.part({ kind: 'ember', x: G.cam.x + rnd(0, VW), y: G.cam.y + VH + 4, vx: rnd(-0.4, 0.4), vy: rnd(-1.4, -0.6), life: rndi(80, 200), cols: ['#ffd08a', '#ff8a3a', '#e8481a'], layer: 1 });
    G.fade = approach(G.fade, G.fadeTo, G.fadeV);
  }
  setupScene() {
    const L = LEVELS[0], B = new MapBuilder(L.w, L.h); L.build(B);
    G.map = new TileMap(B.rows());
    G.terrain = Terrain.build(G.map, 'peak');
    G.bd = Backdrop.make('burning', G.map);
    G.ents = []; G.props = []; G.platforms = []; FX.clear();
    G.props.push(new Prop('hall', 16 * TS + 8, 18 * TS, { w: 190, h: 112, lit: true }));
    for (const x of [6, 12, 20, 27]) G.props.push(new Prop('fire', x * TS, 18 * TS - rnd(40, 90), { s: 10 }));
    for (const x of [3, 31]) G.props.push(new Prop('fire', x * TS, 18 * TS, { s: 8 }));
    G.player = new Actor('hero', 14 * TS, 18 * TS, 1); G.player.setAnim('kneel');
    const d = new Actor('demon', 19 * TS, 18 * TS, -1);
    G.ents.push(G.player, d);
    G.cam = new Camera(); G.cam.x = 16 * TS - VW / 2; G.cam.y = 18 * TS - VH * 0.62;
    G.fade = 1; G.fadeTo = 0; G.fadeV = 0.02;
    G.script = (function* () {
      yield* Sc.wait(90);
      yield* Sc.say('demon', 'The White Crane Sect. Four hundred years of history, and it burns like any other kindling.');
      yield* Sc.say('lu', '...Master. Senior Sister. Everyone...');
      yield* Sc.say('demon', 'Your Swallow Sword was elegant. It is also finished. Kneel, boy, and I will make it quick.');
      yield* Sc.say('lu', '(The founder\'s sword. Swallow\'s Return. They say it always finds its way home.)');
      yield* Sc.say('lu', '(If I could go back. Only one day. I would change all of it.)');
      for (let i = 0; i < 90; i++) { if (i % 3 === 0) FX.qi(G.player.x + 10, G.player.y - 20, 3, ['#ffffff', '#fff6d0', '#ffd060']); yield; }
      yield* Sc.say('demon', 'That light... what is that light?');
      SFX.play('ultStart'); FX.flash('#ffffff', 90);
      yield* Sc.wait(60);
      G.fadeTo = 1; G.fadeV = 0.05;
      yield* Sc.wait(40);
      G.prologueEnd = 1;
    })();
  }
  draw(ctx) {
    if (this.stage === 'text') {
      ctx.fillStyle = '#0a0706'; ctx.fillRect(0, 0, VW, VH);
      const line = this.lines[this.step];
      if (line) {
        const a = Math.min(1, this.t / 40, (260 - this.t) / 30);
        Font.wrap(line, 360).forEach((l, i) => Font.draw(ctx, l, VW / 2, 120 + i * 13, '#e8dcc4', { align: 'center', alpha: Math.max(0, a) }));
      }
      Font.draw(ctx, 'Tab: skip', VW - 6, VH - 12, '#4a3a2a', { align: 'right' });
      return;
    }
    const cam = G.cam.view();
    Backdrop.draw(ctx, G.bd, cam, G.map, G.time);
    for (const p of G.props) p.draw(ctx, cam);
    ctx.drawImage(G.terrain, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
    FX.draw(ctx, cam, 0);
    for (const e of G.ents) e.draw(ctx, cam);
    FX.draw(ctx, cam, 1);
    Light.begin('#0a0204', 0.45);
    for (const p of G.props) { const out = []; p.lights(cam, out); for (const l of out) Light.hole(l[0], l[1], l[2]); }
    Light.end(ctx);
    for (const p of G.props) { const out = []; p.lights(cam, out); for (const l of out) Light.glow(ctx, l[0], l[1], l[2] * 0.8, l[3], 0.25); }
    Dialogue.draw(ctx);
    FX.drawFlash(ctx);
    drawFade(ctx);
    if (G.prologueEnd && G.fade >= 0.99) {
      Font.draw(ctx, 'A swallow that leaves in autumn always returns.', VW / 2, VH / 2 - 4, '#e8dcc4', { align: 'center' });
      if (++this.endT > 200 || (this.endT > 40 && Input.hit('confirm'))) { G.prologueEnd = 0; Scenes.go(new GameScene(0)); }
    }
  }
}
PrologueScene.prototype.endT = 0;

function drawFade(ctx) {
  if (G.fade <= 0.001) return;
  ctx.save(); ctx.globalAlpha = clamp(G.fade, 0, 1); ctx.fillStyle = '#080505'; ctx.fillRect(0, 0, VW, VH); ctx.restore();
}

// ---------------------------------------------------------------------------
const THEME_FX = {
  peak: { dark: null, water: ['#3e5a4c', '#8ab09a', '#d8e8d8'] },
  bamboo: { dark: null, water: ['#34503b', '#6a9070', '#d8ecc8'] },
  town: { dark: ['#1a0806', 0.32], water: ['#3a1e18', '#7a3a26', '#f8b060'] },
  fort: { dark: ['#050102', 0.55], water: ['#1a0808', '#3a1010', '#8a2a1a'] },
};

class GameScene {
  constructor(idx, cp) { this.idx = idx; this.cp = cp; }
  enter() {
    loadLevel(this.idx, this.cp);
    const L = G.level;
    Hud.reset(); Dialogue.active = false; G.script = null; G.ult = null; G.hitstop = 0; G.slow = 0; G.moonRage = 0;
    G.fade = 1; G.fadeTo = 0; G.fadeV = 0.03;
    Music.play(L.music);
    if (!this.cp) Hud.chapterCard(L.chapter, L.name);
    this.paused = false; this.over = null; this.acc = 0;
    SAVE.set({ chapter: Math.max(SAVE.get().chapter || 1, this.idx + 1) });
    G.nextChapter = () => {
      G.carry = { hp: G.player.hp, qi: G.player.qi };
      G.persistArenas = [];
      if (this.idx + 1 < LEVELS.length) Scenes.go(new GameScene(this.idx + 1));
      else Scenes.go(new EndingScene());
    };
    G.bossDefeated = b => { G.boss = null; Music.stop(1.5); G.script = STORY['ch' + (this.idx + 1) + '_end'](b); };
    G.onBossPhase = b => { if (b.id === 'demon') G.script = STORY.ch4_phase2(b); else FX.text(b.x, b.y - 70, b.id === 'moying' ? 'ENOUGH GAMES' : b.id === 'liu' ? 'NOW I AM ANGRY' : 'AMITABHA', '#ffb08a', { life: 70 }); };
    G.onPlayerDeath = () => { this.over = { t: 0, sel: 0 }; Music.play('sorrow'); };
  }
  update() {
    G.time++;
    Hud.update();
    if (this.over) return this.updateOver();
    if (this.paused) return this.updatePause();
    if (Input.hit('pause') && !Dialogue.active && !G.ult) { this.paused = true; this.psel = 0; this.pmode = 'menu'; SFX.play('menu'); return; }
    Dialogue.update();
    let steps = 1;
    if (G.slow > 0) { G.slow--; this.acc += 0.35; steps = Math.floor(this.acc); this.acc -= steps; }
    for (let i = 0; i < steps; i++) this.tick();
    if (!steps) FX.update();
    G.fade = approach(G.fade, G.fadeTo, G.fadeV);
    G.stats.frames++;
  }
  tick() {
    if (G.script) { const r = G.script.next(); if (r.done) G.script = null; }
    else if (!Hud.card || Hud.card.t > 150) this.checkEvents();
    if (G.ult) { updateUltimate(); FX.update(); G.cam.update(G.player, G.map); return; }
    if (G.hitstop > 0) { G.hitstop--; FX.update(); return; }
    for (const pl of G.platforms) pl.update();
    const E = G.ents;
    for (let i = 0; i < E.length; i++) E[i].update();
    G.ents = G.ents.filter(e => !e.remove);
    for (const p of G.props) { p.update(); if (p.shrine) this.checkShrine(p); }
    for (const p of G.fronts) p.update();
    updateArena();
    if (G.waitDummies && !G.script && !G.ents.some(e => e.kind === 'dummy')) { G.waitDummies = false; G.script = STORY.ch1_qin2(); }
    FX.update();
    this.weather();
    G.cam.update(G.player, G.map);
    if (G.moonRage > 0) G.moonRage = Math.min(1, G.moonRage + 0.01);
    if (G.moonRage < 0) G.moonRage = Math.min(0, G.moonRage + 0.01);
  }
  checkEvents() {
    const p = G.player;
    if (!G.arena) for (const A of G.level.arenas || []) {
      if (A.scripted || G.clearedArenas.has(A.id)) continue;
      if (p.x > (A.x0 + 3) * TS && p.x < A.x1 * TS - 20 && p.grounded) { startArena(A); Hud.banner('AMBUSH', 70); return; }
    }
    for (const [i, ev] of G.level.events.entries()) {
      const key = 'ev' + i;
      if (G.firedEvents.has(key) || p.x < ev.x * TS) continue;
      G.firedEvents.add(key);
      if (ev.run === 'hint') Hud.hint(ev.text);
      else if (STORY[ev.run]) { G.script = STORY[ev.run](); break; }
    }
  }
  checkShrine(s) {
    const p = G.player;
    if (s.active || Math.abs(p.x - s.x) > 20 || Math.abs(p.y - s.y) > 30) return;
    s.active = true;
    p.hp = p.maxHp;
    G.checkpoint = { x: s.x, y: s.y, events: [...G.firedEvents] };
    G.persistArenas = [...G.clearedArenas];
    SFX.play('shrine');
    Hud.banner('SHRINE OF REST: YOUR PATH IS REMEMBERED', 120);
    FX.ring(s.x, s.y - 20, { r0: 4, r1: 50, c: '#ffe08a', life: 30 });
  }
  weather() {
    const th = G.level.theme, cam = G.cam, t = G.time;
    if (th === 'peak' && t % 14 === 0) FX.part({ kind: 'petal', x: cam.x + rnd(0, VW + 80), y: cam.y - 4, vx: rnd(-0.5, -0.1), vy: rnd(0.3, 0.6), sway: 0.06, life: 420, cols: ['#f6d6dc', '#e8a0ac'], layer: 1, spin: 0.08 });
    if (th === 'bamboo' && t % 10 === 0) FX.part({ kind: 'leaf', x: cam.x + rnd(0, VW + 80), y: cam.y - 4, vx: rnd(-0.7, -0.2), vy: rnd(0.4, 0.8), sway: 0.05, life: 400, cols: ['#8fb04a', '#6b8f3c'], c2: '#b4cf6a', layer: 1, spin: 0.05 });
    if (th === 'town' && t % 16 === 0) FX.part({ kind: 'ember', x: cam.x + rnd(0, VW), y: cam.y + VH, vx: rnd(-0.3, 0.3), vy: rnd(-0.8, -0.4), life: 300, cols: ['#ffd08a', '#ff9a3a'], layer: 0 });
    if (th === 'fort') {
      if (t % 5 === 0) FX.part({ kind: 'ember', x: cam.x + rnd(0, VW + 40), y: cam.y + VH + 2, vx: rnd(-0.6, 0.2), vy: rnd(-1.4, -0.5), life: rndi(140, 260), cols: ['#ffd08a', '#ff6a2a', '#c02010'], layer: 1 });
      if (t % 9 === 0) FX.part({ kind: 'px', x: cam.x + rnd(0, VW + 60), y: cam.y - 2, vx: rnd(-0.4, -0.1), vy: rnd(0.2, 0.5), sway: 0.04, life: 400, cols: ['#5a4a48', '#3a302e'], layer: 1 });
      if (Math.random() < 0.002) { FX.flash('#ff3a1a', 5); SFX.play('thunder'); }
    }
  }
  draw(ctx) {
    const cam = G.cam.view();
    Backdrop.draw(ctx, G.bd, cam, G.map, G.time);
    if (G.moonRage) { ctx.save(); ctx.globalAlpha = Math.abs(G.moonRage) * 0.35 * (G.moonRage > 0 ? 1 : 0.5); ctx.fillStyle = '#ff2a0a'; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
    for (const p of G.props) p.draw(ctx, cam);
    const sx = clamp(cam.x, 0, G.map.pw - VW), sy = clamp(cam.y, 0, G.map.ph - VH);
    ctx.drawImage(G.terrain, sx, sy, VW, VH, sx - cam.x, sy - cam.y, VW, VH);
    for (const pl of G.platforms) pl.draw(ctx, cam);
    FX.draw(ctx, cam, 0);
    const list = G.ents.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const e of list) e.draw(ctx, cam);
    this.drawWater(ctx, cam);
    FX.draw(ctx, cam, 1);
    for (const p of G.fronts) p.draw(ctx, cam);
    this.lighting(ctx, cam);
    if (G.debugBoxes) { ctx.strokeStyle = 'rgba(255,0,0,0.8)'; for (const b of G.dbg) ctx.strokeRect(b[0] - cam.x + 0.5, b[1] - cam.y + 0.5, b[2], b[3]); G.dbg.length = 0; for (const e of G.ents) if (e.hittable) { const b = e.box(); ctx.strokeStyle = 'rgba(0,255,0,0.6)'; ctx.strokeRect(b[0] - cam.x + 0.5, b[1] - cam.y + 0.5, b[2], b[3]); } }
    if (G.ult) drawUltimate(ctx, cam);
    Hud.draw(ctx);
    Dialogue.draw(ctx);
    FX.drawFlash(ctx);
    drawFade(ctx);
    if (this.paused) this.drawPause(ctx);
    if (this.over) this.drawOver(ctx);
  }
  drawWater(ctx, cam) {
    const m = G.map, T = THEME_FX[G.level.theme].water;
    const tx0 = Math.floor(cam.x / TS), tx1 = Math.ceil((cam.x + VW) / TS);
    for (let tx = tx0; tx <= tx1; tx++) {
      let top = -1;
      for (let ty = 0; ty < m.h; ty++) { const t = m.get(tx, ty); if (t === T_WTOP) { top = ty; break; } }
      if (top < 0) continue;
      const x = tx * TS - cam.x, y0 = top * TS + 4 - cam.y, y1 = m.ph - cam.y;
      ctx.save(); ctx.globalAlpha = 0.93;
      ctx.fillStyle = T[1]; ctx.fillRect(x, y0, TS, 3);
      ctx.fillStyle = T[0]; ctx.fillRect(x, y0 + 3, TS, y1 - y0 - 3);
      ctx.restore();
      // reflections: drifting horizontal glints
      for (let r = 0; r < 6; r++) {
        const ry = Math.round(y0 + 5 + r * 5 + (r * r) % 3);
        const off = (G.time * (0.12 + r * 0.03) + r * 37 + tx * 11) % 24;
        if (off < 9) { ctx.fillStyle = r < 2 ? T[2] : T[1]; ctx.fillRect(Math.round(x + off + (r % 2) * 5), ry, r < 2 ? 4 : 3, 1); }
      }
      for (let i = 0; i < TS; i++) {
        const wx = tx * TS + i, wv = Math.round(Math.sin(wx * 0.18 + G.time * 0.06) * 1.2 + Math.sin(wx * 0.07 - G.time * 0.03));
        ctx.fillStyle = T[1]; ctx.fillRect(x + i, y0 + wv, 1, 1);
        if ((wx + (G.time >> 3)) % 11 === 0) { ctx.fillStyle = T[2]; ctx.fillRect(x + i, y0 + wv, 2, 1); }
      }
    }
  }
  lighting(ctx, cam) {
    const D = THEME_FX[G.level.theme].dark;
    if (!D) return;
    const lights = [];
    for (const p of G.props) p.lights(cam, lights);
    const pl = G.player;
    lights.push([pl.x - cam.x, pl.y - 26 - cam.y, 60, '#ffe8c0']);
    for (const e of G.ents) if (e.proj && (e.kind === 'wave' || e.kind === 'bloodwave' || e.kind === 'palm' || e.kind === 'spike')) lights.push([e.x - cam.x, e.y - cam.y, 34, e.kind === 'wave' ? '#ffd060' : '#ff4a26']);
    Light.begin(D[0], D[1]);
    for (const l of lights) if (l[0] > -80 && l[0] < VW + 80) Light.hole(l[0], l[1], l[2]);
    Light.end(ctx);
    for (const l of lights) if (l[0] > -80 && l[0] < VW + 80 && l[3] !== '#ffe8c0') Light.glow(ctx, l[0], l[1], l[2] * 0.7, l[3], 0.22);
  }
  updatePause() {
    const items = ['Resume', 'Controls', 'Return to last shrine', 'Quit to title'];
    if (this.pmode === 'controls') { if (Input.hit('back') || Input.hit('confirm') || Input.hit('pause')) this.pmode = 'menu'; return; }
    if (Input.hit('pause') || Input.hit('back')) { this.paused = false; return; }
    if (Input.hit('down')) { this.psel = (this.psel + 1) % items.length; SFX.play('menu'); }
    if (Input.hit('up')) { this.psel = (this.psel + items.length - 1) % items.length; SFX.play('menu'); }
    if (Input.hit('confirm')) {
      SFX.play('select');
      if (this.psel === 0) this.paused = false;
      else if (this.psel === 1) this.pmode = 'controls';
      else if (this.psel === 2) Scenes.go(new GameScene(this.idx, G.checkpoint));
      else Scenes.go(new TitleScene());
    }
  }
  drawPause(ctx) {
    ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#0a0706'; ctx.fillRect(0, 0, VW, VH); ctx.restore();
    if (this.pmode === 'controls') return drawControls(ctx);
    ornateBox(ctx, 160, 80, 160, 96);
    Font.draw(ctx, 'STILLNESS', VW / 2, 88, '#d6a53a', { align: 'center' });
    ['Resume', 'Controls', 'Return to last shrine', 'Quit to title'].forEach((s, i) => Font.draw(ctx, (i === this.psel ? '@ ' : '') + s, VW / 2, 108 + i * 15, i === this.psel ? '#ffe08a' : '#efe3c8', { align: 'center' }));
  }
  updateOver() {
    const o = this.over;
    o.t++;
    if (o.t < 40) return;
    if (Input.hit('down') || Input.hit('up')) { o.sel = 1 - o.sel; SFX.play('menu'); }
    if (Input.hit('confirm')) {
      SFX.play('select');
      if (o.sel === 0) { G.carry = null; Scenes.go(new GameScene(this.idx, G.checkpoint)); }
      else Scenes.go(new TitleScene());
    }
  }
  drawOver(ctx) {
    const o = this.over, a = Math.min(1, o.t / 60);
    ctx.save(); ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#140404'; ctx.fillRect(0, 0, VW, VH); ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    inkStroke(ctx, VW / 2, 104, 300, 40, 9, 0.95);
    Font.draw(ctx, 'THE SWALLOW FALLS', VW / 2, 94, '#e8604a', { align: 'center', scale: 2, outline: '#140404' });
    Font.draw(ctx, 'But a swallow always returns.', VW / 2, 132, '#c8b8a0', { align: 'center' });
    ['Rise again at the last shrine', 'Return to title'].forEach((s, i) => Font.draw(ctx, (i === o.sel ? '@ ' : '') + s, VW / 2, 160 + i * 15, i === o.sel ? '#ffe08a' : '#efe3c8', { align: 'center', outline: '#140404' }));
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
class EndingScene {
  enter() {
    const L = LEVELS[0], B = new MapBuilder(L.w, L.h); L.build(B);
    G.map = new TileMap(B.rows());
    G.terrain = Terrain.build(G.map, 'peak');
    G.bd = Backdrop.make('peak', G.map);
    G.ents = []; G.props = []; G.platforms = []; FX.clear(); G.level = L;
    for (const [type, tx, ty, o = {}] of L.props) if (tx > 30 && tx < 76) G.props.push(new Prop(type, tx * TS + 8, ty * TS, o));
    G.player = new Actor('hero', 26 * TS, 18 * TS, 1);
    const bai = new Actor('bai', 50 * TS, 14 * TS, -1), qin = new Actor('qin', 46 * TS, 14 * TS, -1);
    G.ents.push(G.player, bai, qin);
    G.cam = new Camera(); G.cam.x = 36 * TS - VW / 2; G.cam.y = 16 * TS - VH * 0.62;
    G.fade = 1; G.fadeTo = 0; G.fadeV = 0.01;
    Music.play('dawn');
    this.stage = 'story'; this.t = 0;
    const self = this;
    G.script = (function* () {
      yield* Sc.wait(60);
      G.player.walkTo = 41 * TS; G.player.speed = 1;
      while (G.player.walkTo !== null) yield;
      yield* Sc.say('qin', 'Lu Yan!');
      yield* Sc.say('bai', 'So. The disciple who is always late returns at dawn, having saved his sect before breakfast.');
      yield* Sc.say('lu', 'Master... You are safe.');
      yield* Sc.say('bai', 'Qin Shuang brought me a letter sealed in black wax. The east hall is empty now. Gu Wen fled in the night, and I hear he did not get far.');
      yield* Sc.say('bai', 'You look as if you have lived a whole lifetime since yesterday morning.');
      yield* Sc.say('lu', '...Only a day, Master. Just one day.');
      yield* Sc.say('bai', 'Then rest. Tomorrow you will tell me how you learned the last form of the Swallow Sword. No one has seen it performed in two hundred years.');
      yield* Sc.say('qin', 'And you will tell me why you called me "Senior Sister" as if you were saying goodbye.');
      G.player.setAnim('salute');
      yield* Sc.say('lu', '(Tomorrow. There is a tomorrow now.)');
      yield* Sc.wait(60);
      G.fadeTo = 1; G.fadeV = 0.01;
      yield* Sc.wait(110);
      self.stage = 'credits'; self.t = 0;
    })();
    SAVE.set({ chapter: 4, done: 1 });
  }
  update() {
    G.time++; this.t++;
    if (this.stage === 'story') {
      if (G.script) { const r = G.script.next(); if (r.done) G.script = null; }
      Dialogue.update();
      for (const e of G.ents) e.update();
      for (const p of G.props) p.update();
      FX.update();
      if (G.time % 12 === 0) FX.part({ kind: 'petal', x: G.cam.x + rnd(0, VW + 80), y: G.cam.y - 4, vx: rnd(-0.5, -0.1), vy: rnd(0.3, 0.6), sway: 0.06, life: 420, cols: ['#f6d6dc', '#e8a0ac'], layer: 1, spin: 0.08 });
      G.fade = approach(G.fade, G.fadeTo, G.fadeV);
    } else if (this.t > 200 && Input.hit('confirm')) Scenes.go(new TitleScene());
  }
  draw(ctx) {
    if (this.stage === 'story') {
      const cam = G.cam.view();
      Backdrop.draw(ctx, G.bd, cam, G.map, G.time);
      for (const p of G.props) p.draw(ctx, cam);
      ctx.drawImage(G.terrain, cam.x, cam.y, VW, VH, 0, 0, VW, VH);
      for (const e of G.ents) e.draw(ctx, cam);
      FX.draw(ctx, cam, 1);
      Dialogue.draw(ctx);
      drawFade(ctx);
      return;
    }
    ctx.fillStyle = '#0a0706'; ctx.fillRect(0, 0, VW, VH);
    const s = G.stats, secs = Math.floor(s.frames / 60);
    const lines = [
      ['The swallow returned, and spring came to Heaven\'s Crane Peak.', '#e8dcc4'], ['', ''],
      ['RETURNING SWALLOW', '#d6a53a'], ['', ''], ['A tale of the murim', '#a89a84'], ['', ''],
      [`Time on the road   ${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`, '#efe3c8'],
      [`Foes defeated   ${s.kills}`, '#efe3c8'], [`Longest combo   ${s.maxCombo}`, '#efe3c8'],
      [`Perfect parries   ${s.parries}`, '#efe3c8'], [`Times fallen   ${s.deaths}`, '#efe3c8'], ['', ''],
      [rankOf(s), '#ffe08a'], ['', ''], ['Built as opus55-pixel', '#6a5a4a'],
    ];
    const y0 = Math.max(30, 250 - this.t * 0.6);
    lines.forEach(([l, c], i) => { if (l) Font.draw(ctx, l, VW / 2, y0 + i * 14, c, { align: 'center', scale: i === 2 ? 2 : 1 }); });
    if (this.t > 200) Font.draw(ctx, 'Press ATTACK to return', VW / 2, VH - 16, '#6a5a4a', { align: 'center' });
  }
}
function rankOf(s) {
  const score = s.maxCombo * 2 + s.parries * 5 + s.kills - s.deaths * 15;
  return score > 220 ? 'Rank: Heavenly Sword Saint' : score > 140 ? 'Rank: Peerless Master' : score > 80 ? 'Rank: Crane Elder' : 'Rank: Wandering Disciple';
}

// ---------------------------------------------------------------------------
// Level data. Maps are assembled with a small builder (ground runs, stairs,
// platforms, water, markers) instead of hand typed rows, which keeps jump
// distances honest. Markers: P player, c cultist, k bandit, s spearman,
// a assassin, b brute, r archer, j jiangshi, o jar, O jar with ginseng,
// d dummy, x crate, S shrine. Props and triggers use tile coordinates.
// ---------------------------------------------------------------------------
class MapBuilder {
  constructor(w, h) { this.w = w; this.h = h; this.g = Array.from({ length: h }, () => new Array(w).fill('.')); }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; }
  rect(x, y, w, h, c = '#') { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  ground(x0, x1, top, c = '#') { return this.rect(x0, top, x1 - x0, this.h - top, c); }
  up(x, top, n) { for (let i = 0; i < n; i++) { this.set(x + i, top - 1 - i, '/'); this.rect(x + i, top - i, 1, this.h - (top - i)); } return top - n; }
  down(x, top, n) { for (let i = 0; i < n; i++) { this.set(x + i, top + i, '\\'); this.rect(x + i, top + i + 1, 1, this.h - (top + i + 1)); } return top + n; }
  plat(x0, x1, y, c = '=') { for (let i = x0; i < x1; i++) this.set(i, y, c); return this; }
  water(x0, x1, top) { for (let i = x0; i < x1; i++) { this.set(i, top, '~'); for (let j = top + 1; j < this.h; j++) this.set(i, j, 'w'); } return this; }
  pit(x0, x1) { for (let i = x0; i < x1; i++) for (let j = 0; j < this.h; j++) this.set(i, j, '.'); return this; }
  spikes(x0, x1, top) { for (let i = x0; i < x1; i++) this.set(i, top - 1, '^'); return this; }
  m(x, y, c) { this.set(x, y, c); return this; }
  rows() { return this.g.map(r => r.join('')); }
}

const LEVELS = [];

// ===== Chapter I: Heaven's Crane Peak ======================================
LEVELS.push({
  id: 1, chapter: 'Chapter One', name: 'The Morning Before the Fire', theme: 'peak', music: 'peak', w: 212, h: 22,
  build(B) {
    B.ground(0, 34, 18);
    B.up(34, 18, 4);
    B.ground(38, 74, 14);
    B.plat(46, 52, 10); B.plat(58, 63, 9);
    B.ground(74, 112, 18);
    B.plat(78, 84, 14, '-'); B.plat(88, 93, 12); B.plat(98, 104, 14, '-');
    B.up(112, 18, 6);
    B.ground(118, 142, 12);
    B.plat(124, 130, 8, '-');
    B.pit(142, 158);
    B.plat(142, 148, 12); B.plat(151, 158, 12);
    B.ground(158, 174, 12);
    B.down(174, 12, 4);
    B.ground(178, 212, 16);
    B.plat(184, 189, 12); B.plat(201, 206, 12);
    B.m(10, 17, 'P');
    B.m(55, 13, 'd').m(60, 13, 'd').m(65, 13, 'd');
    B.m(48, 9, 'O').m(60, 8, 'o').m(81, 13, 'o').m(90, 11, 'o').m(101, 13, 'o').m(106, 17, 'o');
    B.m(120, 11, 'S').m(126, 7, 'o').m(128, 7, 'o');
    B.m(163, 11, 's').m(168, 11, 'c');
  },
  props: [
    ['hall', 16, 18, { w: 190, h: 112, lit: false }], ['plum', 4, 18, { s: 1.1 }], ['plum', 29, 18, { s: 0.9 }], ['slantern', 26, 18], ['slantern', 7, 18],
    ['banner', 40, 14, { h: 48 }], ['bell', 44, 14], ['rack', 70, 14], ['banner', 72, 14, { h: 48 }], ['incense', 52, 14], ['lion', 39, 14],
    ['hall', 90, 18, { w: 220, h: 118, cols: 6 }], ['pine', 77, 18, { s: 1 }], ['slantern', 96, 18], ['slantern', 84, 18], ['plum', 108, 18, { s: 1 }],
    ['pine', 123, 12, { s: 1.2 }], ['rock', 134, 12, { w: 30, h: 16 }], ['pine', 139, 12, { s: 0.9 }], ['sign', 118, 12],
    ['pine', 161, 12, { s: 1.1 }], ['rock', 171, 12],
    ['gate', 205, 16, { w: 150, h: 100 }], ['lion', 186, 16], ['lion', 198, 16], ['banner', 181, 16, { h: 52 }], ['slantern', 192, 16],
  ],
  events: [
    { x: 0, run: 'ch1_wake' },
    { x: 33, run: 'hint', text: 'Press JUMP again in mid-air: the Swallow Returns.' },
    { x: 44, run: 'ch1_qin' },
    { x: 80, run: 'ch1_scouts' },
    { x: 114, run: 'hint', text: 'Fighting fills your QI. Press I or V for a Qi Wave. With full qi, O or B unleashes Thousand Swallows Return.' },
    { x: 150, run: 'hint', text: 'DASH through gaps and attacks. Holding DOWN + ATTACK in the air plunges.' },
    { x: 180, run: 'ch1_boss' },
  ],
  arenas: [
    { id: 'a1', scripted: true, x0: 74, x1: 112, waves: [[['c', 84, 'drop'], ['c', 104, 'r']], [['c', 80, 'l'], ['c', 96, 'drop'], ['k', 108, 'r']]] },
  ],
});

// ===== Chapter II: Sea of Whispering Bamboo ================================
LEVELS.push({
  id: 2, chapter: 'Chapter Two', name: 'The Sea of Whispering Bamboo', theme: 'bamboo', music: 'bamboo', w: 236, h: 24,
  build(B) {
    B.ground(0, 26, 19);
    B.water(26, 40, 20);
    B.rect(29, 18, 2, 6).rect(33, 18, 2, 6).rect(37, 18, 1, 6);
    B.ground(40, 92, 19);
    B.plat(46, 51, 16); B.plat(52, 57, 13); B.plat(46, 51, 10); B.plat(56, 90, 10, '-');
    B.spikes(58, 88, 19);
    B.plat(64, 68, 14); B.plat(78, 82, 14);
    B.ground(92, 122, 19);
    B.rect(100, 17, 3, 2, '%');
    let t = B.up(122, 19, 3);
    B.ground(125, 138, t);
    t = B.down(138, t, 3);
    B.ground(141, 162, t);
    B.rect(150, 16, 4, 3, '%');
    B.pit(162, 174);
    B.plat(163, 166, 16); B.plat(169, 172, 14);
    B.ground(174, 236, 19);
    B.plat(180, 186, 15); B.plat(222, 228, 15);
    B.m(8, 18, 'P');
    B.m(20, 18, 'k').m(24, 18, 'k');
    B.m(48, 9, 'o').m(66, 13, 'r').m(80, 13, 'r').m(84, 9, 'a').m(89, 9, 'O');
    B.m(114, 18, 'S');
    B.m(130, 15, 'a').m(133, 15, 'r').m(146, 18, 'k').m(157, 18, 'a').m(152, 15, 'o');
  },
  props: [
    ['fgbamboo', 12, 0, { front: true, f: 1.3, w: 13 }], ['fgbamboo', 70, 0, { front: true, f: 1.3, w: 11 }], ['fgbamboo', 156, 0, { front: true, f: 1.3, w: 14 }], ['fgbamboo', 200, 0, { front: true, f: 1.3, w: 12 }],
    ['rock', 14, 19, { w: 28, h: 14 }], ['sign', 6, 19], ['rock', 44, 19], ['rock', 96, 19, { w: 34, h: 18 }],
    ['shrine', 114, 19], ['incense', 118, 19], ['rock', 145, 19], ['rock', 190, 19, { w: 40, h: 20 }], ['rock', 214, 19, { w: 26, h: 14 }],
  ],
  events: [
    { x: 0, run: 'ch2_start' },
    { x: 58, run: 'hint', text: 'Sharpened stakes below. Keep to the bamboo.' },
    { x: 178, run: 'ch2_boss' },
  ],
  arenas: [
    { id: 'a2', x0: 92, x1: 122, waves: [[['k', 98, 'l'], ['k', 116, 'r'], ['a', 108, 'drop']], [['b', 118, 'r'], ['k', 96, 'l']]] },
  ],
});

// ===== Chapter III: Red Lanterns at Black Tide Ford =======================
LEVELS.push({
  id: 3, chapter: 'Chapter Three', name: 'Red Lanterns at Black Tide Ford', theme: 'town', music: 'town', w: 252, h: 24,
  build(B) {
    B.ground(0, 102, 19);
    B.rect(32, 17, 8, 2, '%').plat(31, 41, 16, '-');
    B.rect(46, 15, 9, 4, '%').plat(45, 56, 14, '-');
    B.rect(62, 17, 7, 2, '%').plat(61, 70, 16, '-');
    B.water(102, 134, 20);
    B.plat(105, 111, 19); B.plat(125, 131, 19);
    B.ground(134, 150, 19);
    B.water(150, 186, 20);
    B.plat(150, 186, 19);
    B.rect(160, 20, 1, 4).rect(172, 20, 1, 4);
    B.plat(155, 160, 13); B.plat(166, 171, 13); B.plat(177, 182, 13);
    B.ground(186, 252, 19);
    B.plat(192, 198, 15); B.plat(240, 246, 15);
    B.m(6, 18, 'P');
    B.m(20, 18, 'c').m(26, 18, 'c');
    B.m(35, 15, 'r').m(50, 13, 'r').m(52, 13, 'o').m(65, 15, 'O');
    B.m(42, 18, 'x').m(43, 18, 'o').m(58, 18, 'x');
    B.m(137, 18, 'S');
    B.m(158, 18, 's').m(168, 18, 'a').m(176, 18, 'c').m(180, 12, 'r').m(157, 12, 'o').m(169, 12, 'x');
  },
  movers: [['boat', 113.5, 19, 5, [9, 0], 300, 0]],
  props: [
    ['gate', 3, 19, { w: 120, h: 92, roof: 'char' }], ['lanterns', 16, 8, { w: 140, sag: 16 }], ['stall', 14, 19], ['stall', 24, 19, { awn: ['#2f6a5e', '#e8d8b8'] }],
    ['lantern', 36, 17], ['lantern', 50, 15], ['lantern', 66, 17], ['well', 58, 19],
    ['lanterns', 80, 7, { w: 180, sag: 20 }], ['stall', 72, 19], ['stall', 84, 19, { awn: ['#d8a53a', '#5a1410'] }], ['stall', 96, 19], ['banner', 78, 19, { h: 56 }], ['banner', 92, 19, { h: 56 }],
    ['lantern', 138, 10, { len: 30 }], ['stall', 143, 19, { awn: ['#e8d8b8', '#8a2016'] }],
    ['lanterns', 168, 6, { w: 160, sag: 18 }],
    ['hall', 222, 19, { w: 200, h: 120, roof: 'char', lit: true }], ['lion', 204, 19], ['lion', 238, 19], ['brazier', 196, 19], ['brazier', 248, 19], ['lanterns', 222, 5, { w: 150, sag: 14 }],
  ],
  events: [
    { x: 0, run: 'ch3_start' },
    { x: 104, run: 'hint', text: 'The ford is deep. Mind the water.' },
    { x: 192, run: 'ch3_boss' },
  ],
  arenas: [
    { id: 'a3', x0: 70, x1: 102, waves: [[['c', 76, 'l'], ['s', 98, 'r'], ['c', 90, 'drop']], [['k', 74, 'l'], ['a', 86, 'drop'], ['s', 100, 'r']]] },
  ],
});

// ===== Chapter IV: Under the Crimson Moon =================================
LEVELS.push({
  id: 4, chapter: 'Chapter Four', name: 'Under the Crimson Moon', theme: 'fort', music: 'fort', w: 256, h: 24,
  build(B) {
    B.ground(0, 30, 19);
    let t = B.up(30, 19, 3);
    B.ground(33, 44, t);
    B.pit(44, 50); B.ground(44, 50, 22); B.spikes(44, 50, 22);
    B.plat(45, 49, 15);
    B.up(50, 16, 3);
    B.ground(53, 64, 13);
    B.rect(64, 13, 38, 11, '%');
    B.pit(70, 76); B.ground(70, 76, 22); B.spikes(70, 76, 22);
    B.pit(86, 94); B.ground(86, 94, 22); B.spikes(86, 94, 22); B.plat(86, 90, 13); B.plat(91, 94, 11);
    B.down(102, 13, 6);
    B.ground(108, 146, 19);
    B.plat(114, 119, 15); B.plat(135, 140, 15);
    B.ground(146, 190, 19);
    B.ground(190, 256, 19);
    B.plat(198, 204, 14); B.plat(242, 248, 14);
    B.m(6, 18, 'P');
    B.m(22, 18, 'j').m(38, 15, 'j').m(58, 12, 'c').m(66, 12, 'r').m(80, 12, 's').m(84, 12, 'j').m(98, 12, 'r');
    B.m(47, 14, 'o').m(92, 10, 'O');
    B.m(148, 18, 'S');
  },
  movers: [['grate', 71, 13, 2, [4, 0], 190, 0]],
  props: [
    ['brazier', 10, 19], ['brazier', 26, 19], ['banner', 18, 19, { h: 60, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }], ['rock', 36, 16, { w: 30, h: 16 }],
    ['brazier', 56, 13], ['banner', 64, 13, { h: 60, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }], ['brazier', 80, 13], ['brazier', 100, 13], ['banner', 96, 13, { h: 60, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }],
    ['brazier', 112, 19], ['brazier', 142, 19], ['banner', 120, 19, { h: 64, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }], ['banner', 132, 19, { h: 64, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }],
    ['hall', 170, 19, { w: 180, h: 112, roof: 'black', lit: true }], ['brazier', 156, 19], ['brazier', 186, 19],
    ['brazier', 196, 19], ['brazier', 252, 19], ['banner', 210, 19, { h: 70, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }], ['banner', 236, 19, { h: 70, pal: ['#0a0404', '#2a0606', '#5a0c0a', '#c8321e'] }],
    ['fire', 170, 19, { s: 7 }],
  ],
  events: [
    { x: 0, run: 'ch4_start' },
    { x: 160, run: 'ch4_traitor' },
    { x: 200, run: 'ch4_boss' },
  ],
  arenas: [
    { id: 'a4', x0: 108, x1: 146, waves: [[['c', 114, 'l'], ['s', 140, 'r'], ['j', 126, 'drop']], [['a', 120, 'drop'], ['b', 142, 'r'], ['c', 110, 'l']], [['s', 112, 'l'], ['a', 136, 'drop'], ['j', 128, 'drop']]] },
  ],
});

// ---------------------------------------------------------------------------
// Runtime loading
// ---------------------------------------------------------------------------
const MARKER_ENEMY = { c: 'cultist', k: 'bandit', s: 'spearman', a: 'assassin', b: 'brute', r: 'archer', j: 'jiangshi' };

function loadLevel(idx, checkpoint) {
  const L = LEVELS[idx];
  const B = new MapBuilder(L.w, L.h);
  L.build(B);
  G.level = L; G.levelIdx = idx;
  G.map = new TileMap(B.rows());
  G.terrain = Terrain.build(G.map, L.theme);
  G.bd = Backdrop.make(L.bg || L.theme, G.map);
  G.ents = []; G.props = []; G.fronts = []; G.arena = null; G.boss = null; G.lock = null;
  G.platforms = (L.movers || []).map(([k, tx, ty, w, to, per, ph]) => new Platform(k, tx * TS, ty * TS, w * TS, [to[0] * TS, to[1] * TS], per, ph));
  FX.clear(); Combat.reset();
  G.firedEvents = new Set(); G.clearedArenas = new Set(G.persistArenas || []);
  G.wind = L.theme === 'bamboo' ? -0.05 : L.theme === 'fort' ? 0.08 : 0.03;
  for (const [type, tx, ty, o = {}] of L.props) {
    const p = new Prop(type, tx * TS + TS / 2, ty * TS, o);
    (p.front ? G.fronts : G.props).push(p);
  }
  let start = null;
  for (const m of G.map.marks) {
    if (m.ch === 'P') start = m;
    else if (MARKER_ENEMY[m.ch]) spawnEnemy(MARKER_ENEMY[m.ch], m.x, m.y);
    else if (m.ch === 'o' || m.ch === 'O') G.ents.push(new Breakable('jar', m.x, m.y, m.ch === 'O' ? 'ginseng' : null));
    else if (m.ch === 'd') G.ents.push(new Breakable('dummy', m.x, m.y, 'qi'));
    else if (m.ch === 'x') G.ents.push(new Breakable('crate', m.x, m.y));
    else if (m.ch === 'S') { const s = new Prop('shrine', m.x, m.y); s.shrine = true; G.props.push(s); }
  }
  const p = G.player = new Player(start.x, start.y);
  if (G.carry) { p.hp = Math.max(60, G.carry.hp); p.qi = G.carry.qi; }
  if (checkpoint) {
    p.x = checkpoint.x; p.y = checkpoint.y; p.safe = { x: p.x, y: p.y };
    for (const e of checkpoint.events || []) G.firedEvents.add(e);
    for (const s of G.props) if (s.shrine && Math.abs(s.x - p.x) < 40) s.active = true;
    // enemies behind the checkpoint are gone
    G.ents = G.ents.filter(e => !(e instanceof Enemy) || e.x > p.x + 100);
  }
  G.ents.push(p);
  G.cam = new Camera();
  G.cam.update(p, G.map, true);
  G.checkpoint = checkpoint || { x: p.x, y: p.y, events: [] };
}

// arena: lock the camera and spawn waves until cleared
function startArena(A, extra = []) {
  G.arena = { A, wave: -1, t: 0, left: [], extra };
  G.cam.lock = [A.x0 * TS, A.x1 * TS];
  G.player.bounds = [A.x0 * TS, A.x1 * TS];
  SFX.play('drum');
  nextWave();
}
function nextWave() {
  const R = G.arena;
  R.wave++;
  if (R.wave >= R.A.waves.length) {
    G.clearedArenas.add(R.A.id);
    G.cam.lock = null; G.player.bounds = null; G.arena = null;
    Hud.banner('THE WAY IS CLEAR', 90);
    SFX.play('gong');
    return;
  }
  R.left = R.wave === 0 ? R.extra.slice() : [];
  for (const e of R.left) e.bounds = [R.A.x0 * TS, R.A.x1 * TS];
  for (const [ch, tx, how] of R.A.waves[R.wave]) {
    const kind = MARKER_ENEMY[ch];
    const x = how === 'l' ? R.A.x0 * TS + 10 : how === 'r' ? R.A.x1 * TS - 10 : tx * TS;
    const y = how === 'drop' ? G.cam.y - 10 : G.map.surfaceBelow(x, G.cam.y + 40);
    const e = spawnEnemy(kind, x, y, { aggro: true, facing: x < G.player.x ? 1 : -1, bounds: [R.A.x0 * TS, R.A.x1 * TS] });
    if (how === 'drop') { e.vy = 2; FX.ink(x, y + 20, 6); }
    else FX.dust(x, y, 6);
    R.left.push(e);
  }
}
function updateArena() {
  const R = G.arena;
  if (!R) return;
  R.left = R.left.filter(e => !e.dead);
  if (R.left.length === 0 && !G.script) { if (++R.t > 50) { R.t = 0; nextWave(); } }
}

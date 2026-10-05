// SQUEAKBORNE :: world
// Tiles, collision, room templates, procedural layout, handcrafted maps and level baking.

const T_EMPTY = 0, T_SOLID = 1, T_PLAT = 2, T_SPIKE = 3, T_BREAK = 4, T_CRUMBLE = 5, T_GONE = 6;
const RW = 32, RH = 18; // room size in tiles (with border)
const isSolidT = (t) => t === T_SOLID || t === T_BREAK || t === T_CRUMBLE;

let lv = null; // current level

class Level {
  constructor(tw, th, bk) {
    this.tw = tw; this.th = th; this.bk = bk;
    this.t = new Uint8Array(tw * th).fill(T_SOLID);
    this.back = new Uint8Array(tw * th);
    this.enemies = []; this.projs = []; this.items = []; this.fx = [];
    this.rooms = []; this.spawns = [];
    this.lights = []; this.emitters = [];
    this.crumble = new Map();
    this.spawn = { x: 64, y: 64 };
    this.cv = null; this.kind = 'biome'; this.time = 0;
    this.camLock = null;
  }
  get(tx, ty) { return tx < 0 || ty < 0 || tx >= this.tw || ty >= this.th ? T_SOLID : this.t[ty * this.tw + tx]; }
  set(tx, ty, v) { if (tx >= 0 && ty >= 0 && tx < this.tw && ty < this.th) this.t[ty * this.tw + tx] = v; }
}

function tileAt(tx, ty) { return lv.get(tx, ty); }
function solidPx(x, y) { return isSolidT(lv.get(floor(x / TS), floor(y / TS))); }
function rectSolid(x, y, w, h) {
  const x0 = floor(x / TS), x1 = floor((x + w - 0.001) / TS), y0 = floor(y / TS), y1 = floor((y + h - 0.001) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidT(lv.get(tx, ty))) return true;
  return false;
}
function platRow(x, w, row) {
  const x0 = floor(x / TS), x1 = floor((x + w - 0.001) / TS);
  for (let tx = x0; tx <= x1; tx++) if (lv.get(tx, row) === T_PLAT) return true;
  return false;
}
function groundBelow(x, w, y) { return rectSolid(x, y, w, 1) || ((y % TS) === 0 && platRow(x, w, y / TS)); }
function moveBody(e) {
  e.hitWall = 0; e.hitCeil = false; e.onGround = false;
  const dx = e.vx;
  if (dx) {
    const n = ceil(abs(dx) / 6), sx = dx / n;
    for (let i = 0; i < n; i++) {
      const nx = e.x + sx;
      if (rectSolid(nx, e.y, e.w, e.h)) {
        e.x = sx > 0 ? floor((nx + e.w) / TS) * TS - e.w : (floor(nx / TS) + 1) * TS;
        e.hitWall = sign(sx); e.vx = 0; break;
      }
      e.x = nx;
    }
  }
  const dy = e.vy;
  if (dy) {
    const n = ceil(abs(dy) / 6), sy = dy / n;
    for (let i = 0; i < n; i++) {
      const ny = e.y + sy;
      if (rectSolid(e.x, ny, e.w, e.h)) {
        if (sy < 0 && e.cornerFix) {
          let fixed = false;
          for (const off of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
            if (!rectSolid(e.x + off, ny, e.w, e.h) && !rectSolid(e.x + off, e.y, e.w, e.h)) { e.x += off; e.y = ny; fixed = true; break; }
          }
          if (fixed) continue;
        }
        if (sy > 0) { e.y = floor((ny + e.h) / TS) * TS - e.h; e.onGround = true; }
        else { e.y = (floor(ny / TS) + 1) * TS; e.hitCeil = true; }
        e.vy = 0; break;
      }
      if (sy > 0 && !(e.dropT > 0) && !e.noPlat) {
        const b0 = e.y + e.h, b1 = ny + e.h, row = floor(b1 / TS), top = row * TS;
        if (b0 <= top + 0.01 && b1 > top && platRow(e.x, e.w, row)) { e.y = top - e.h; e.onGround = true; e.vy = 0; break; }
      }
      e.y = ny;
    }
  }
  if (!e.onGround && e.vy >= 0) {
    const b = e.y + e.h;
    if (rectSolid(e.x, b, e.w, 0.5) || (!(e.dropT > 0) && !e.noPlat && abs(b - round(b / TS) * TS) < 0.02 && platRow(e.x, e.w, round(b / TS)))) e.onGround = true;
  }
}
// line of sight between two points through tiles
function los(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = ceil(d / 6);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solidPx(lerp(x0, x1, t), lerp(y0, y1, t))) return false;
  }
  return true;
}
// is there floor in front of (x,y) going dir? used by walkers to avoid ledges
function floorAhead(e, dir, look = 2) {
  const fx = dir > 0 ? e.x + e.w + look : e.x - look;
  const ty = floor((e.y + e.h + 2) / TS);
  const t = lv.get(floor(fx / TS), ty);
  return isSolidT(t) || t === T_PLAT;
}
function wallAhead(e, dir) {
  const fx = dir > 0 ? e.x + e.w + 2 : e.x - 2;
  return solidPx(fx, e.y + e.h - 4) || lv.get(floor(fx / TS), floor((e.y + e.h - 4) / TS)) === T_SPIKE;
}
function spikeUnder(e) {
  const x0 = floor((e.x + 2) / TS), x1 = floor((e.x + e.w - 2) / TS), ty = floor((e.y + e.h - 3) / TS);
  for (let tx = x0; tx <= x1; tx++) if (lv.get(tx, ty) === T_SPIKE) return true;
  return false;
}

// ---------------- room templates (30x16 interior) ----------------
// # solid  . empty  = platform  ^ spikes  B breakable  C crumbling  1 maybe-solid  2 maybe-platform  3 maybe-spike
// E ground enemy  F flyer  T treasure  L light  S spring  H hazard  P prop  @ special  p pedestal  Y spawn  X exit
const ROOMS = {
  normal: [
    ['..............................', '..............................', '....====............====......', '..............................',
      '..............................', '..L........................L..', '.........=====....=====.......', '..............................',
      '..............................', '..............F...............', '..=====..................=====', '..............................',
      '..............................', '.....E....P....T.......E...H..', '##############################', '##############################'],
    ['..............................', '..............................', '..............................', '...L......................L...',
      '..............................', '..........==========..........', '..............................', '..............................',
      '...=====..............=====...', '..............................', '..............................', '..........F........F..........',
      '............==....==..........', '....E...P................E....', '#########............#########', '#########^^^^^^^^^^^^#########'],
    ['..............................', '..............................', '..L........................L..', '..............................',
      '..............................', '...====................====...', '..............................', '..............................',
      '..............T...............', '...........########...........', '.........############.........', '.......################.......',
      '..E...##################...E..', '.....####################.....', '##############################', '##############################'],
    ['..............................', '..............................', '..L.........................L.', '..............................',
      '......====..........====......', '..............................', '..............................', '..............................',
      '..............F...............', '.....####............####.....', '.....####............####.....', '.....####............####.....',
      '..E..####......E.....####..E..', '.P...####...H........####.....', '##############################', '##############################'],
    ['..............................', '..............................', '..L.......................L...', '...........####...............',
      '..............................', '..............................', '.....####............####.....', '..............................',
      '..............................', '...........####.....F.........', '..............................', '..............................',
      '.....####............####.....', '...E....P.....E.........E.....', '##############################', '##############################'],
    ['..............................', '..............................', '..L......................L....', '..............................',
      '#######....##########....#####', '#######..................#####', '#######..................#####', '#######.......F..........#####',
      '#######..====....====....#####', '#######..................#####', '#######..................#####', '..............................',
      '..............................', '....E...P...E.......E.....H...', '##############################', '##############################'],
    ['..............................', '..............................', '..L...................L.......', '..............................',
      '..............................', '....=====..........=====......', '..............................', '..............................',
      '............====..............', '..................#####.......', '..................#####...F...', '...........###....#####.......',
      '..E........###....#####.##E...', '...P.......###....#####.##....', '##############################', '##############################'],
    ['..............................', '..............................', '..L.......2222222.........L...', '..............................',
      '..............................', '....1111..............1111....', '..............................', '..............................',
      '.........22222...22222........', '..............................', '..............F...............', '...2222..............2222.....',
      '..............................', '....E....P....E.......H..E....', '##############################', '##############################'],
    ['..............................', '..............................', '..L...........................', '.....................=====....',
      '..............................', '..............................', '..............=====...........', '..............................',
      '..............................', '......=====...................', '..............................', '......................F.......',
      '..............................', '..E....P....E....H........E...', '##############################', '##############################'],
    ['..............................', '..............................', '..L........................L..', '..............................',
      '..............................', '........====......====........', '..............................', '..............................',
      '....===..................===..', '...........==....==...........', '..............................', '.......##..........##.........',
      '..E....##..........##....E....', '.......##^^^^^^^^^^##.........', '##############################', '##############################'],
    ['..............................', '..............................', '..L........................L..', '..............................',
      '..............................', '.....=====..........=====.....', '..............................', '..............................',
      '..............................', '..............F...............', '..............................', '..............................',
      '....E...................E.....', '..P...........................', '#######CCCCCCCCCCCCCCCC#######', '#######^^^^^^^^^^^^^^^^#######'],
    ['..............................', '..............................', '..L.........L......L.......L..', '..............................',
      '..............................', '..............................', '....======............======..', '..............................',
      '..............................', '..............................', '.........====....====.........', '..............................',
      '..............................', '...E.....E..P..E.....E....E...', '##############################', '##############################'],
    ['..............................', '..............................', '..L.....................L.....', '..............................',
      '...T................T.........', '.#####............#####.......', '.#####............#####...F...', '..............................',
      '..............................', '..............................', '.......====............====...', '..............................',
      '..............................', '..E....S..P....E........S..E..', '##############################', '##############################'],
    ['..............................', '..............................', '..L...........L.............L.', '..............................',
      '..........1111111111..........', '..............................', '..............................', '....====..............====....',
      '..............................', '..............................', '...........========...........', '..............................',
      '..............................', '....E.....H....E....P.....E...', '###########3333333############', '##############################'],
    ['..............................', '..............................', '..L.........................L.', '..............................',
      '..............................', '......==========..............', '..............................', '..............................',
      '..............................', '...................=========..', '.......####...................', '.......####...................',
      '..E....####....E.......F...E..', '.......####..P.........H......', '##############################', '##############################'],
  ],
  start: [
    ['..............................', '..............................', '..L.........................L.', '..............................',
      '..............................', '......=====........=====......', '..............................', '..............................',
      '..............................', '..........====..====..........', '..............................', '..............................',
      '..............................', '....Y.....P...................', '##############################', '##############################'],
  ],
  exit: [
    ['..............................', '..............................', '..L.........................L.', '..............................',
      '..............................', '.....=====..........=====.....', '..............................', '..............................',
      '..............................', '..............................', '..............................', '....L...L.....................',
      '..............................', '......X...........E......E....', '##############################', '##############################'],
  ],
  treasure: [
    ['..............................', '..............................', '..L.........................L.', '..............................',
      '..............................', '.........====......====.......', '..............................', '..............................',
      '..............................', '..............................', '..............................', '......@.......................',
      '...######.....................', '.##########...................', '##############################', '##############################'],
    ['..............................', '..............................', '..............................', '.....L................L.......',
      '..............................', '..............................', '...====..............====.....', '..............................',
      '..............................', '..........====....====........', '..............................', '..............................',
      '..............................', '...P..@..................P....', '##############################', '##############################'],
  ],
  shop: [
    ['..............................', '..............................', '..L......L..........L......L..', '..............................',
      '..............................', '..............................', '..............................', '..............................',
      '..............................', '..............................', '..............................', '..............................',
      '..............................', '...@...p...p.........p........', '##############################', '##############################'],
  ],
  ambush: [
    ['..............................', '..............................', '..L.........L......L.......L..', '..............................',
      '..............................', '.....=====..........=====.....', '..............................', '..............................',
      '..............................', '...........========...........', '..............................', '..............................',
      '..............................', '.......@......................', '##############################', '##############################'],
  ],
};

// ---------------- handcrafted maps ----------------
const MAPS = {
  hub: [
    '############################################',
    '############################################',
    '####........................................',
    '###.....L..................L...........L....',
    '##..........................................',
    '#..................=====........=======.....',
    '#...........................................',
    '#.....=====..........................====...',
    '#...........................................',
    '#.................======....................',
    '#...........................................',
    '#....................................L......',
    '#...........................................',
    '#..Y..w....g.....d.......h.......k.....X....',
    '############################################',
    '############################################',
    '############################################',
  ],
  rest: [
    '##############################################',
    '##############################################',
    '##..........................................##',
    '##.....L.........L............L.........L...##',
    '##..........................................##',
    '##..........=====..............=====........##',
    '##..........................................##',
    '##..........................................##',
    '##.................=======..................##',
    '##..........................................##',
    '##..........................................##',
    '##..........................................##',
    '##..........................................##',
    '##.Y....h.......q.......m...p...p...p....X..##',
    '##############################################',
    '##############################################',
    '##############################################',
  ],
  boss0: [
    '##################################################',
    '##################################################',
    '##..............................................##',
    '##....L..........L..........L..........L........##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##........======....................======......##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##..................========....................##',
    '##..............................................##',
    '##..............................................##',
    '##.Y.....................B...................X..##',
    '##################################################',
    '##################################################',
    '##################################################',
  ],
  boss1: [
    '####################################################',
    '####################################################',
    '##................................................##',
    '##.....L............L..........L............L.....##',
    '##................................................##',
    '##................................................##',
    '##................................................##',
    '##.......=====..........................=====.....##',
    '##................................................##',
    '##................................................##',
    '##.................=============..................##',
    '##................................................##',
    '##................................................##',
    '##................................................##',
    '##.Y.......................B.....................X##',
    '####################################################',
    '####################################################',
    '####################################################',
  ],
  boss2: [
    '####################################################',
    '####################################################',
    '##................................................##',
    '##.....L..............L..........L............L...##',
    '##................................................##',
    '##................................................##',
    '##.......======......................======.......##',
    '##................................................##',
    '##................................................##',
    '##................................................##',
    '##...................==========...................##',
    '##................................................##',
    '##................................................##',
    '##................................................##',
    '##.Y........................B....................X##',
    '####################################################',
    '####################################################',
    '####################################################',
  ],
  boss3: [
    '##################################################',
    '##################################################',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##......=====......................=====........##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##...................========...................##',
    '##..............................................##',
    '##..............................................##',
    '##..............................................##',
    '##.Y.....................B...................X..##',
    '##################################################',
    '##################################################',
    '##################################################',
  ],
};

// ---------------- generator ----------------
function stampRoom(L, rx, ry, tpl, mirror, rng, room) {
  for (let j = 0; j < 16; j++) {
    const row = tpl[j];
    for (let i = 0; i < 30; i++) {
      const ch = row[mirror ? 29 - i : i] || '.';
      const tx = rx + 1 + i, ty = ry + 1 + j;
      let t = T_EMPTY;
      switch (ch) {
        case '#': t = T_SOLID; break;
        case '=': t = T_PLAT; break;
        case '^': t = T_SPIKE; break;
        case 'B': t = T_BREAK; break;
        case 'C': t = T_CRUMBLE; break;
        case '1': t = rng.chance(0.55) ? T_SOLID : T_EMPTY; break;
        case '2': t = rng.chance(0.55) ? T_PLAT : T_EMPTY; break;
        case '3': t = rng.chance(0.4) ? T_SPIKE : T_SOLID; break;
        default:
          if (ch !== '.') room.marks.push({ ch, tx, ty });
      }
      L.set(tx, ty, t);
    }
  }
}
function carveSide(L, A, B) {
  // A is left of B
  const ax = A.x0 + RW - 1, bx = B.x0, ty0 = A.y0;
  for (let r = 12; r <= 14; r++) { L.set(ax, ty0 + r, T_EMPTY); L.set(ax - 1, ty0 + r, T_EMPTY); L.set(bx, ty0 + r, T_EMPTY); L.set(bx + 1, ty0 + r, T_EMPTY); }
  for (const x of [ax - 1, ax, bx, bx + 1]) { L.set(x, ty0 + 15, T_SOLID); L.set(x, ty0 + 16, T_SOLID); }
  if (A.wide && B.wide) {
    for (let r = 3; r <= 11; r++) {
      if (L.get(ax - 1, ty0 + r) !== T_SOLID && L.get(bx + 1, ty0 + r) !== T_SOLID) { L.set(ax, ty0 + r, T_EMPTY); L.set(bx, ty0 + r, T_EMPTY); }
    }
  }
}
function carveSecret(L, A, B) {
  const ax = A.x0 + RW - 1, bx = B.x0, ty0 = A.y0;
  for (let r = 12; r <= 14; r++) { L.set(ax, ty0 + r, T_BREAK); L.set(bx, ty0 + r, T_BREAK); L.set(ax - 1, ty0 + r, T_EMPTY); L.set(bx + 1, ty0 + r, T_EMPTY); }
  for (const x of [ax - 1, ax, bx, bx + 1]) L.set(x, ty0 + 15, T_SOLID);
}
function carveVert(L, U, D, rng) {
  // U above D
  const x0 = U.x0 + 14;
  for (let i = 0; i < 4; i++) {
    L.set(x0 + i, U.y0 + 17, T_EMPTY); L.set(x0 + i, U.y0 + 16, T_EMPTY); L.set(x0 + i, U.y0 + 15, T_PLAT);
    L.set(x0 + i, D.y0, T_EMPTY);
  }
  // open the upper room's floor mass above the hole so the shaft never dead-ends in a hill
  for (let r = 14; r >= 1; r--) {
    let empty = true;
    for (let i = 0; i < 4; i++) if (L.get(x0 + i, U.y0 + r) !== T_EMPTY && L.get(x0 + i, U.y0 + r) !== T_PLAT) empty = false;
    if (empty) break;
    for (let i = 0; i < 4; i++) L.set(x0 + i, U.y0 + r, T_EMPTY);
  }
  // find the floor mass of the lower room under the shaft
  let gr = 17;
  while (gr - 1 >= 1) {
    let all = true;
    for (let i = 0; i < 4; i++) if (L.get(x0 + i, D.y0 + gr - 1) !== T_SOLID) all = false;
    if (!all) break;
    gr--;
  }
  for (let r = 1; r < gr; r++) for (let i = 0; i < 4; i++) {
    const t = L.get(x0 + i, D.y0 + r);
    if (t === T_SOLID || t === T_SPIKE || t === T_CRUMBLE || t === T_BREAK) L.set(x0 + i, D.y0 + r, T_EMPTY);
  }
  let r = gr - 4, side = rng.chance(0.5) ? -2 : 2;
  while (r >= 3) {
    for (let i = 0; i < 4; i++) {
      const tx = x0 + i + side;
      if (L.get(tx, D.y0 + r) !== T_SOLID) L.set(tx, D.y0 + r, T_PLAT);
    }
    side = -side;
    r -= 4;
  }
  for (let i = 0; i < 4; i++) L.set(x0 + i, D.y0 + 1, T_PLAT);
}
function genBiomeLevel(bi, seed, spice) {
  const B = BIOMES[bi], rng = RNG(seed);
  const GW = B.gw, GH = B.gh;
  const L = new Level(GW * RW, GH * RH, B.key);
  L.kind = 'biome'; L.biome = bi; L.name = B.name;
  const grid = [];
  for (let y = 0; y < GH; y++) { grid.push([]); for (let x = 0; x < GW; x++) grid[y].push(null); }
  const mk = (gx, gy, role) => {
    const r = { gx, gy, x0: gx * RW, y0: gy * RH, role, doors: { l: 0, r: 0, u: 0, d: 0 }, marks: [], visited: false, wide: rng.chance(0.45) };
    grid[gy][gx] = r; L.rooms.push(r); return r;
  };
  // 1. main path
  const path = [];
  let cx, cy;
  if (B.dir === 'right') {
    cx = 0; cy = rng.int(0, GH - 1);
    path.push(mk(cx, cy, 'start'));
    let vrun = 0;
    while (cx < GW - 1) {
      const opts = [['R', 3]];
      if (cy > 0 && !grid[cy - 1][cx] && vrun < 2) opts.push(['U', 1.3]);
      if (cy < GH - 1 && !grid[cy + 1][cx] && vrun < 2) opts.push(['D', 1.3]);
      const m = rng.weighted(opts);
      if (m === 'R') { cx++; vrun = 0; } else { cy += m === 'U' ? -1 : 1; vrun++; }
      path.push(mk(cx, cy, 'normal'));
    }
  } else {
    cy = GH - 1; cx = rng.int(0, GW - 1);
    path.push(mk(cx, cy, 'start'));
    let hrun = 0;
    while (cy > 0) {
      const opts = [['U', 2.2]];
      if (cx > 0 && !grid[cy][cx - 1] && hrun < 2) opts.push(['L', 1.2]);
      if (cx < GW - 1 && !grid[cy][cx + 1] && hrun < 2) opts.push(['R', 1.2]);
      const m = rng.weighted(opts);
      if (m === 'U') { cy--; hrun = 0; } else { cx += m === 'L' ? -1 : 1; hrun++; }
      path.push(mk(cx, cy, 'normal'));
    }
  }
  path[path.length - 1].role = 'exit';
  const link = (a, b) => {
    if (b.gx > a.gx) { a.doors.r = 1; b.doors.l = 1; } else if (b.gx < a.gx) { a.doors.l = 1; b.doors.r = 1; }
    else if (b.gy > a.gy) { a.doors.d = 1; b.doors.u = 1; } else { a.doors.u = 1; b.doors.d = 1; }
  };
  for (let i = 1; i < path.length; i++) link(path[i - 1], path[i]);
  // 2. side rooms
  const bag = rng.shuffle(['snack', 'snack', 'chest', 'shop', 'food', 'curse', 'ambush', 'snack', 'chest', 'secret']);
  if (bi === 0) bag.splice(bag.indexOf('curse'), 1);
  const sides = [];
  for (const p of rng.shuffle(path.slice(1, -1).concat(path.slice(1, -1)))) {
    if (!bag.length) break;
    const dirs = rng.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    for (const [dx, dy] of dirs) {
      const nx = p.gx + dx, ny = p.gy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || grid[ny][nx]) continue;
      const role = bag[0];
      if (role === 'secret' && dy !== 0) continue;
      bag.shift();
      const s = mk(nx, ny, role);
      s.parent = p;
      if (role === 'secret') { s.secret = true; s.hidden = true; } else link(p, s);
      sides.push(s);
      break;
    }
  }
  const leftovers = bag.filter((b) => b === 'snack' || b === 'chest');
  // 3. stamp templates
  for (const r of L.rooms) {
    let pool = ROOMS.normal;
    if (r.role === 'start') pool = ROOMS.start;
    else if (r.role === 'exit') pool = ROOMS.exit;
    else if (r.role === 'shop') pool = ROOMS.shop;
    else if (r.role === 'ambush') pool = ROOMS.ambush;
    else if (r.role !== 'normal') pool = ROOMS.treasure;
    const tpl = rng.pick(pool);
    const mirror = rng.chance(0.5);
    stampRoom(L, r.x0, r.y0, tpl, mirror, rng, r);
    for (let y = r.y0; y < r.y0 + RH; y++) for (let x = r.x0; x < r.x0 + RW; x++) L.back[y * L.tw + x] = vnoise(x * 0.13, y * 0.13, seed & 255) > 0.3 ? 1 : 0;
  }
  // 4. doors
  for (const r of L.rooms) {
    if (r.doors.r) carveSide(L, r, grid[r.gy][r.gx + 1]);
    if (r.doors.d) carveVert(L, r, grid[r.gy + 1][r.gx], rng);
  }
  for (const s of sides) if (s.secret) {
    const p = s.parent;
    if (s.gx > p.gx) carveSecret(L, p, s); else carveSecret(L, s, p);
  }
  // 5. markers -> spawns
  const sp = L.spawns;
  const diff = [0.55, 0.65, 0.72, 0.8][bi] + spice * 0.04;
  const enemyPick = () => rng.weighted(B.enemies.filter((e) => !B.flyers.includes(e[0])));
  const flyerPick = () => rng.pick(B.flyers);
  let leftoverIdx = 0;
  for (const r of L.rooms) {
    let nEnemies = 0;
    for (const m of r.marks) {
      const px = m.tx * TS + TS / 2, py = (m.ty + 1) * TS;
      switch (m.ch) {
        case 'E': if (r.role === 'normal' || r.role === 'exit') { if (rng.chance(diff)) { sp.push({ k: 'enemy', type: enemyPick(), x: px, y: py }); nEnemies++; } } break;
        case 'F': if (r.role === 'normal' && rng.chance(diff * 0.8)) { sp.push({ k: 'enemy', type: flyerPick(), x: px, y: py - 8 }); nEnemies++; } break;
        case 'L': L.lights.push({ x: px, y: py - 8, kind: 'torch' }); break;
        case 'T': {
          const roll = rng();
          if (leftoverIdx < leftovers.length && r.role === 'normal' && roll < 0.5) sp.push({ k: leftovers[leftoverIdx++], x: px, y: py });
          else if (roll < 0.45) sp.push({ k: 'gold', x: px, y: py, n: rng.int(6, 14) });
          else if (roll < 0.6) sp.push({ k: 'bread', x: px, y: py });
          break;
        }
        case 'S': sp.push({ k: 'spring', x: px, y: py }); break;
        case 'H': if (r.role === 'normal' && rng.chance(0.7)) sp.push({ k: 'hazard', x: px, y: py }); break;
        case 'P': if (rng.chance(0.65)) sp.push({ k: 'prop', x: px, y: py }); break;
        case '@': sp.push({ k: r.role, x: px, y: py, room: r }); break;
        case 'p': sp.push({ k: 'pedestal', x: px, y: py }); break;
        case 'Y': L.spawn = { x: px, y: py }; sp.push({ k: 'pipe', x: px, y: py }); break;
        case 'X': sp.push({ k: 'exit', x: px, y: py }); break;
      }
    }
    if (r.role === 'normal') {
      const floors = [];
      for (let y = r.y0 + 2; y < r.y0 + RH - 1; y++) for (let x = r.x0 + 3; x < r.x0 + RW - 3; x++) {
        if (L.get(x, y) === T_EMPTY && L.get(x, y - 1) === T_EMPTY && isSolidT(L.get(x, y + 1))) floors.push([x, y]);
      }
      const want = 2 + (bi >= 2 ? 1 : 0) + (spice >= 2 ? 1 : 0);
      for (let k = nEnemies; k < want && floors.length; k++) {
        const [x, y] = floors.splice(rng.int(0, floors.length - 1), 1)[0];
        sp.push({ k: 'enemy', type: enemyPick(), x: x * TS + 8, y: (y + 1) * TS });
      }
    }
  }
  for (; leftoverIdx < leftovers.length; leftoverIdx++) {
    const r = rng.pick(path.slice(1, -1));
    const spots = [];
    for (let y = r.y0 + 2; y < r.y0 + RH - 1; y++) for (let x = r.x0 + 3; x < r.x0 + RW - 3; x++) {
      if (x >= r.x0 + 12 && x <= r.x0 + 19) continue;
      if (L.get(x, y) === T_EMPTY && L.get(x, y - 1) === T_EMPTY && isSolidT(L.get(x, y + 1))) spots.push([x, y]);
    }
    const [x, y] = spots.length ? rng.pick(spots) : [r.x0 + 6, r.y0 + 14];
    sp.push({ k: leftovers[leftoverIdx], x: x * TS + 8, y: (y + 1) * TS });
  }
  // elites
  const ens = sp.filter((s) => s.k === 'enemy');
  const nElite = min(ens.length, 1 + (bi >= 1 ? 1 : 0) + (spice >= 1 ? 1 : 0));
  for (let i = 0; i < nElite; i++) rng.pick(ens).elite = true;
  L.seed = seed;
  finishLevel(L, rng);
  return L;
}
function genMapLevel(key, bk, kind) {
  const rows = MAPS[key];
  const th = rows.length, tw = rows[0].length;
  const L = new Level(tw, th, bk);
  L.kind = kind;
  const room = { gx: 0, gy: 0, x0: 0, y0: 0, w: tw, h: th, role: kind, doors: {}, marks: [], visited: true };
  L.rooms.push(room);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const ch = rows[y][x] || '#';
    let t = T_EMPTY;
    if (ch === '#') t = T_SOLID; else if (ch === '=') t = T_PLAT; else if (ch === '^') t = T_SPIKE;
    else if (ch !== '.') room.marks.push({ ch, tx: x, ty: y });
    L.set(x, y, t);
    L.back[y * tw + x] = 1;
  }
  for (const m of room.marks) {
    const px = m.tx * TS + TS / 2, py = (m.ty + 1) * TS;
    if (m.ch === 'L') L.lights.push({ x: px, y: py - 8, kind: 'torch' });
    else if (m.ch === 'Y') L.spawn = { x: px, y: py };
    else L.spawns.push({ k: 'm_' + m.ch, x: px, y: py });
  }
  finishLevel(L, RNG(hashStr(key)));
  return L;
}
function finishLevel(L, rng) {
  // emitters for ambient life
  for (let i = 0; i < 40; i++) {
    const x = rng.int(1, L.tw - 2), y = rng.int(1, L.th - 2);
    if (L.get(x, y) === T_EMPTY && isSolidT(L.get(x, y - 1))) L.emitters.push({ x: x * TS + rng.int(2, 14), y: y * TS, kind: 'drip', t: rng.int(0, 200) });
  }
  bakeLevel(L);
}

// ---------------- baking ----------------
function tileMask(L, tx, ty) {
  const air = (x, y) => !isSolidT(L.get(x, y)) && !(x < 0 || y < 0 || x >= L.tw || y >= L.th);
  return (air(tx, ty - 1) ? 1 : 0) | (air(tx + 1, ty) ? 2 : 0) | (air(tx, ty + 1) ? 4 : 0) | (air(tx - 1, ty) ? 8 : 0);
}
function bakeLevel(L) {
  L.cv = makeCanvas(L.tw * TS, L.th * TS);
  const c = ctx2d(L.cv);
  // distance to air for depth darkening
  const D = new Uint8Array(L.tw * L.th).fill(9);
  const q = [];
  for (let y = 0; y < L.th; y++) for (let x = 0; x < L.tw; x++) if (!isSolidT(L.t[y * L.tw + x])) { D[y * L.tw + x] = 0; q.push(x, y); }
  for (let qi = 0; qi < q.length; qi += 2) {
    const x = q[qi], y = q[qi + 1], d = D[y * L.tw + x];
    if (d >= 6) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= L.tw || ny >= L.th) continue;
      const i = ny * L.tw + nx;
      if (D[i] > d + 1) { D[i] = d + 1; q.push(nx, ny); }
    }
  }
  L.depth = D;
  drawTiles(L, c, 0, 0, L.tw - 1, L.th - 1, true);
}
function drawTiles(L, c, x0, y0, x1, y1, decor) {
  const bk = L.bk;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = L.get(tx, ty), x = tx * TS, y = ty * TS;
    if (!isSolidT(t) || t === T_CRUMBLE) {
      if (L.back[ty * L.tw + tx]) tileBack(c, x, y, tx, ty, bk);
    }
  }
  if (decor) {
    const r = RNG(L.tw * 7 + L.th);
    for (let i = 0; i < (L.tw * L.th) / 90; i++) {
      const tx = r.int(1, L.tw - 3), ty = r.int(1, L.th - 3);
      let ok = true;
      for (let a = 0; a < 2 && ok; a++) for (let b = 0; b < 2; b++) if (L.get(tx + a, ty + b) !== T_EMPTY || !L.back[(ty + b) * L.tw + tx + a]) ok = false;
      if (ok) decorWall(c, tx * TS + 2, ty * TS + 2, bk, r());
    }
  }
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = L.get(tx, ty), x = tx * TS, y = ty * TS;
    if (t === T_SOLID) {
      const m = tileMask(L, tx, ty);
      tileSolid(c, x, y, tx, ty, m, bk);
      const d = L.depth ? L.depth[ty * L.tw + tx] : 1;
      if (d >= 2) { c.fillStyle = `rgba(8,4,8,${min(0.82, (d - 1) * 0.2)})`; c.fillRect(x, y, TS, TS); }
    } else if (t === T_PLAT) tilePlat(c, x, y, tx, ty, bk, L.get(tx - 1, ty) === T_PLAT, L.get(tx + 1, ty) === T_PLAT);
    else if (t === T_SPIKE) tileSpike(c, x, y, bk);
    else if (t === T_BREAK) tileBreak(c, x, y, tx, ty, bk);
  }
  if (decor) {
    for (let ty = y0 + 1; ty < y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (L.get(tx, ty) !== T_EMPTY) continue;
      const h = hash2(tx, ty, 77);
      if (isSolidT(L.get(tx, ty + 1)) && L.get(tx, ty + 1) !== T_CRUMBLE) decorFloor(c, tx * TS, ty * TS, bk, h);
      else if (L.get(tx, ty - 1) === T_SOLID) decorCeil(c, tx * TS, ty * TS, bk, h);
    }
  }
}
function redrawTiles(L, tx0, ty0, tx1, ty1) {
  const c = ctx2d(L.cv);
  tx0 = max(0, tx0 - 1); ty0 = max(0, ty0 - 1); tx1 = min(L.tw - 1, tx1 + 1); ty1 = min(L.th - 1, ty1 + 1);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (L.depth) L.depth[ty * L.tw + tx] = isSolidT(L.get(tx, ty)) ? max(1, L.depth[ty * L.tw + tx]) : 0;
  c.clearRect(tx0 * TS, ty0 * TS, (tx1 - tx0 + 1) * TS, (ty1 - ty0 + 1) * TS);
  drawTiles(L, c, tx0, ty0, tx1, ty1, false);
}
function breakTile(tx, ty) {
  if (lv.get(tx, ty) !== T_BREAK) return false;
  lv.set(tx, ty, T_EMPTY);
  lv.back[ty * lv.tw + tx] = 1;
  redrawTiles(lv, tx, ty, tx, ty);
  const x = tx * TS + 8, y = ty * TS + 8;
  const cols = lv.bk === 'cellar' ? [C.st2, C.st3, C.st1] : lv.bk === 'living' ? [C.br2, C.br3] : lv.bk === 'kitchen' ? [C.fu3, C.fu2, C.st2] : [C.br3, C.br4];
  debris(x, y, 10, cols, { sp: 2.5 });
  puff(x, y, 5, C.st3, { sp: 0.8 });
  sfx('bonk', x);
  // reveal the secret room if this opens one
  for (const r of lv.rooms) if (r.hidden && tx >= r.x0 - 2 && tx < r.x0 + RW + 2 && ty >= r.y0 && ty < r.y0 + RH) {
    r.hidden = false;
    sfx('secret');
    FText.add(x, y - 10, 'SECRET!', C.yl1, { sc: 1, life: 70 });
    Run.secrets++;
  }
  return true;
}
function hitTilesInBox(x, y, w, h) {
  const x0 = floor(x / TS), x1 = floor((x + w) / TS), y0 = floor(y / TS), y1 = floor((y + h) / TS);
  let any = false;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (breakTile(tx, ty)) any = true;
  return any;
}
// crumbling tiles are drawn live so they can shake
function updateCrumbles() {
  for (const [i, c] of lv.crumble) {
    c.t--;
    const tx = i % lv.tw, ty = floor(i / lv.tw);
    if (c.state === 0 && c.t <= 0) { c.state = 1; c.t = 240; lv.t[i] = T_GONE; debris(tx * TS + 8, ty * TS + 4, 6, [C.br2, C.br3, C.st3], { sp: 1 }); sfx('pop', tx * TS); }
    else if (c.state === 1 && c.t <= 0) {
      if (pl && boxHit(tx * TS, ty * TS, TS, TS, pl)) { c.t = 30; continue; }
      lv.t[i] = T_CRUMBLE; lv.crumble.delete(i); puff(tx * TS + 8, ty * TS + 8, 4, C.st3);
    }
  }
}
function touchCrumble(e) {
  const ty = floor((e.y + e.h + 1) / TS);
  const x0 = floor(e.x / TS), x1 = floor((e.x + e.w - 0.01) / TS);
  for (let tx = x0; tx <= x1; tx++) {
    if (lv.get(tx, ty) === T_CRUMBLE) {
      const i = ty * lv.tw + tx;
      if (!lv.crumble.has(i)) lv.crumble.set(i, { t: 26, state: 0 });
    }
  }
}
function drawCrumbles(cx, cy) {
  const x0 = max(0, floor(cx / TS)), x1 = min(lv.tw - 1, floor((cx + W) / TS)), y0 = max(0, floor(cy / TS)), y1 = min(lv.th - 1, floor((cy + H) / TS));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (lv.get(tx, ty) !== T_CRUMBLE) continue;
    const c = lv.crumble.get(ty * lv.tw + tx);
    const sh = c && c.state === 0 ? round(rnd(-1, 1)) : 0;
    const x = tx * TS + sh, y = ty * TS;
    R(g, x, y, 16, 6, C.br1); R(g, x, y, 16, 2, C.br3); R(g, x + 1, y + 6, 14, 3, C.br1);
    PX(g, x + 4, y + 3, C.br0); PX(g, x + 11, y + 2, C.br0); LINE(g, x + 7, y + 1, x + 9, y + 5, C.br0);
    R(g, x, y + 9, 16, 1, C.ink); R(g, x, y - 1, 16, 1, C.ink);
  }
}

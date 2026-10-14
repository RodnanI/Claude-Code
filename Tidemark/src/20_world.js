/* =====================================================================
   World state: creation, tiles, building placement, infrastructure.
   All mutation of the world happens through functions in this file and
   is reached only from applyAction(), so every change is recorded.
   ===================================================================== */

function newSim(seed, W, H) {
  const N = W * H;
  return {
    v: 1, seed: seed >>> 0, tick: 0, W, H, rng: seedRng(seed ^ 0x51DE),
    ter: new Uint8Array(N), dep: new Uint8Array(N), tree: new Uint8Array(N),
    road: new Uint8Array(N), rail: new Uint8Array(N), sig: new Uint8Array(N), pow: new Uint8Array(N),
    bld: new Int32Array(N),
    blds: [], vehs: [], cons: [], locks: [], wrecks: [],
    nb: 1, nv: 1, nc: 1, nl: 1,
    led: { start: zr(), ext: zr(), imp: zr(), prod: zr(), use: zr(), exp: zr(), lost: zr() },
    delivered: zr(), lossLog: [], hist: [],
    money: 6000, mled: { tax: 0, exp: 0, imp: 0, build: 0, upkeep: 0, refund: 0 },
    trade: { imp: zr(), exp: zr(), next: 400, every: 1000 },
    wx: { k: W_CLEAR, until: 900 },
    ver: { road: 1, rail: 1, water: 1, power: 1 },
    dirty: { road: 0, rail: 0, water: 0 },
    dec: { h: 2166136261, n: 0, log: [] },
    acts: [], aseq: 0, gate: -1,
    alerts: [], events: [], stats: { day: [] }, scen: null,
    flags: { inf: 0 }, demoOk: 1,
  };
}

/* ---------------- money ---------------- */
function canPay(S, c) { return S.flags.inf || S.money >= c; }
function pay(S, c, cat) { if (S.flags.inf) return; S.money -= c; S.mled[cat] = (S.mled[cat] || 0) + c; }
function earn(S, c, cat) { S.money += c; S.mled[cat] = (S.mled[cat] || 0) + c; }

/* ---------------- building helpers ---------------- */
function bById(S, id) {
  // blds is kept sorted by id; binary search
  const a = S.blds; let lo = 0, hi = a.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, v = a[m].id; if (v === id) return a[m]; if (v < id) lo = m + 1; else hi = m - 1; }
  return null;
}
function vById(S, id) {
  const a = S.vehs; let lo = 0, hi = a.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, v = a[m].id; if (v === id) return a[m]; if (v < id) lo = m + 1; else hi = m - 1; }
  return null;
}
function cById(S, id) {
  const a = S.cons; let lo = 0, hi = a.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, v = a[m].id; if (v === id) return a[m]; if (v < id) lo = m + 1; else hi = m - 1; }
  return null;
}
function footprint(def, rot) { return rot & 1 ? [def.h, def.w] : [def.w, def.h]; }
function bTiles(S, b) {
  const out = [];
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) out.push(y * S.W + x);
  return out;
}
function bRing(S, b) {          // orthogonally adjacent tiles, fixed scan order
  const out = [], W = S.W;
  for (let x = b.x; x < b.x + b.w; x++) if (b.y - 1 >= 0) out.push((b.y - 1) * W + x);
  for (let y = b.y; y < b.y + b.h; y++) if (b.x + b.w < S.W) out.push(y * W + b.x + b.w);
  for (let x = b.x + b.w - 1; x >= b.x; x--) if (b.y + b.h < S.H) out.push((b.y + b.h) * W + x);
  for (let y = b.y + b.h - 1; y >= b.y; y--) if (b.x - 1 >= 0) out.push(y * W + b.x - 1);
  return out;
}
const isStore = b => !!BT[b.type].store;
const isNode = b => !!BT[b.type].node;
function outCap(def, r) { for (const [rr, n] of def.out || []) if (rr === r) return Math.max(20, n * 8); return 0; }
function inTarget(b, r) {
  const def = BT[b.type];
  if (def.inp) for (const [rr, n] of def.inp) if (rr === r) return Math.max(24, n * 12);
  if (def.tools && r === R.tools) return 4;
  if (def.fuel === r) return 36;
  return 0;
}
function trQty(S, b) { let s = 0; if (b.tr) for (const id of b.tr) { const c = cById(S, id); if (c) s += c.q; } return s; }
function storeUsed(S, b) { return sumArr(b.inv) + (b.exp ? sumArr(b.exp) : 0) + trQty(S, b); }

/* ---------------- placement validation ---------------- */
function canPlace(S, type, x, y, rot) {
  const def = BT[type]; if (!def) return { ok: false, why: 'Unknown building' };
  const [w, h] = footprint(def, rot);
  if (x < 0 || y < 0 || x + w > S.W || y + h > S.H) return { ok: false, why: 'Outside the map' };
  const isSt = def.node === 'rail';
  let depCount = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const t = yy * S.W + xx;
    if (S.ter[t] !== T_LAND) return { ok: false, why: 'Needs dry land' };
    if (S.bld[t]) return { ok: false, why: 'Occupied by a building' };
    if (S.road[t]) return { ok: false, why: 'Road in the way' };
    if (S.rail[t]) {
      if (!isSt) return { ok: false, why: 'Railway in the way' };
      const ax = (rot & 1) ? 5 : 10; // N|S or E|W
      if ((S.rail[t] | ax) !== ax || S.sig[t]) return { ok: false, why: 'Station must sit on straight track along its length' };
    }
    if (typeof def.ext === 'number' && S.dep[t] === def.ext) depCount++;
  }
  if (typeof def.ext === 'number' && depCount < 2) return { ok: false, why: 'Needs at least 2 ' + ['', 'coal', 'iron ore', 'clay'][def.ext] + ' deposit tiles' };
  const fake = { x, y, w, h };
  const ring = bRing(S, fake);
  if (def.node === 'water') {
    let berths = 0; for (const t of ring) if (S.ter[t] === def.wt) berths++;
    if (berths < 1) return { ok: false, why: def.wt === T_SEA ? 'Must touch the sea' : 'Must touch a canal' };
  }
  if (def.tidal) { let ok = false; for (const t of ring) if (S.ter[t] === T_SEA) ok = true; if (!ok) return { ok: false, why: 'Must touch tidal water' }; }
  return { ok: true, cost: def.cost };
}

function placeBuilding(S, type, x, y, rot, free) {
  const c = canPlace(S, type, x, y, rot); if (!c.ok) return c;
  const def = BT[type];
  if (!free && !canPay(S, def.cost)) return { ok: false, why: 'Not enough money' };
  if (!free) pay(S, def.cost, 'build');
  const [w, h] = footprint(def, rot);
  const b = {
    id: S.nb++, type, x, y, w, h, rot, inv: zr(), out: zr(), rsv: zr(),
    wk: 0, pwOn: 0, prog: 0, cyc: 0, st: 0, bays: [], yard: [], t0: S.tick,
  };
  if (type === 'house') { b.lvl = 1; b.res = 0; b.needAcc = 0; b.missed = 0; b.growAcc = 0; b.furnAcc = 0; b.disc = 0; b.jobsOk = 0; b.var = (x * 7 + y * 13) % 5; }
  if (def.store) { b.want = zr(); }
  if (def.node) { b.tr = []; b.moor = []; }
  if (type === 'quay') b.exp = zr();
  if (def.gen) { b.load = 0; b.burn = 0; }
  if (type === 'market') b.served = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const t = yy * S.W + xx;
    S.bld[t] = b.id; S.tree[t] = 0; S.pow[t] = 0;
    if (def.node === 'rail') {
      const ax = (rot & 1) ? 5 : 10; S.rail[t] = ax;
    }
  }
  if (def.ext === 'fertile') { let n = 0; for (let yy = y - 2; yy < y + h + 2; yy++) for (let xx = x - 2; xx < x + w + 2; xx++) if (inb(S, xx, yy) && S.dep[yy * S.W + xx] === D_FERTILE) n++; b.ext = Math.min(100, 50 + n * 4); }
  else if (typeof def.ext === 'number') b.ext = 100;
  else if (def.ext === 'trees') b.ext = 0;
  S.blds.push(b);
  bumpVer(S, 'road'); bumpVer(S, 'power'); if (def.node === 'rail') bumpVer(S, 'rail'); if (def.node === 'water') bumpVer(S, 'water');
  return { ok: true, b };
}

function bumpVer(S, k) { S.ver[k]++; if (k in S.dirty) S.dirty[k] = 1; }

/* ---------------- infrastructure ---------------- */
function roadOk(S, t) {
  if (S.bld[t] || S.ter[t] === T_LOCK) return false;
  if (S.rail[t] && S.rail[t] !== 5 && S.rail[t] !== 10) return false;
  if (S.rail[t] && S.sig[t]) return false;
  return true;
}
function buildRoad(S, tiles) {
  let cost = 0; const todo = [];
  for (const t of tiles) { if (t < 0 || S.road[t]) continue; if (!roadOk(S, t)) continue; todo.push(t); cost += isWater(S.ter[t]) ? COST.roadBridge : COST.road; }
  if (!todo.length) return { ok: false, why: 'Nothing to build here' };
  if (!canPay(S, cost)) return { ok: false, why: 'Not enough money (' + cost + ')' };
  pay(S, cost, 'build');
  for (const t of todo) { S.road[t] = 1; S.tree[t] = 0; }
  bumpVer(S, 'road'); if (todo.some(t => isWater(S.ter[t]))) bumpVer(S, 'water');
  return { ok: true, n: todo.length, cost };
}
function railOkTile(S, t) {
  if (S.bld[t]) { const b = bById(S, S.bld[t]); return b && BT[b.type].node === 'rail'; }
  if (S.ter[t] === T_LOCK) return false;
  return true;
}
/* Rail is laid along a path; consecutive tiles get reciprocal connection bits. */
function buildRail(S, path) {
  let cost = 0; const links = [];
  for (let i = 0; i < path.length; i++) {
    const t = path[i]; if (t < 0 || !railOkTile(S, t)) return { ok: false, why: 'Blocked at ' + xy(S, t) };
    if (!S.rail[t]) cost += isWater(S.ter[t]) ? COST.railBridge : COST.rail;
    if (i > 0) { const d = dirTo(S, path[i - 1], t); if (d < 0) return { ok: false, why: 'Path not contiguous' }; links.push([path[i - 1], t, d]); }
  }
  // stations only accept connections along their axis; level crossings stay straight
  const nm = new Map();
  const get = t => nm.has(t) ? nm.get(t) : S.rail[t];
  for (const [a, b, d] of links) { nm.set(a, get(a) | (1 << d)); nm.set(b, get(b) | (1 << opp(d))); }
  for (const [t, m] of nm) {
    if (S.bld[t]) { const st = bById(S, S.bld[t]); const ax = (st.rot & 1) ? 5 : 10; if ((m | ax) !== ax) return { ok: false, why: 'Stations take track only along their platforms' }; }
    if (S.road[t] && m !== 5 && m !== 10) return { ok: false, why: 'Level crossings must be straight' };
    if (S.sig[t] && m !== 5 && m !== 10) return { ok: false, why: 'Remove the signal before branching here' };
  }
  if (!nm.size) return { ok: false, why: 'Drag across tiles to lay track' };
  if (!canPay(S, cost)) return { ok: false, why: 'Not enough money (' + cost + ')' };
  pay(S, cost, 'build');
  for (const [t, m] of nm) { S.rail[t] = m; S.tree[t] = 0; }
  bumpVer(S, 'rail'); if (path.some(t => isWater(S.ter[t]))) bumpVer(S, 'water');
  return { ok: true, cost };
}
function setSignal(S, t, d) {
  if (t < 0 || !S.rail[t]) return { ok: false, why: 'Signals go on track' };
  if (S.bld[t]) return { ok: false, why: 'Not inside a station' };
  if (S.road[t]) return { ok: false, why: 'Not on a level crossing' };
  const m = S.rail[t];
  if (d < 0) { if (!S.sig[t]) return { ok: false, why: 'No signal' }; S.sig[t] = 0; bumpVer(S, 'rail'); return { ok: true }; }
  if (!(m === 5 && (d === 0 || d === 2)) && !(m === 10 && (d === 1 || d === 3))) return { ok: false, why: 'Signals need straight track in that direction' };
  if (!S.sig[t]) { if (!canPay(S, COST.signal)) return { ok: false, why: 'Not enough money' }; pay(S, COST.signal, 'build'); }
  S.sig[t] = d + 1; bumpVer(S, 'rail');
  return { ok: true };
}
function canalOk(S, t) {
  if (S.ter[t] !== T_LAND || S.bld[t]) return false;
  for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.ter[n] === T_SEA) return false; }
  return true;
}
function buildCanal(S, tiles) {
  let cost = 0; const todo = [];
  for (const t of tiles) if (t >= 0 && canalOk(S, t)) { todo.push(t); cost += COST.canal; }
  if (!todo.length) return { ok: false, why: 'Canals need open land, and cannot touch the tidal sea except through a lock' };
  if (!canPay(S, cost)) return { ok: false, why: 'Not enough money (' + cost + ')' };
  pay(S, cost, 'build');
  for (const t of todo) { S.ter[t] = T_CANAL; S.tree[t] = 0; S.pow[t] = 0; S.dep[t] = 0; }
  bumpVer(S, 'water'); if (todo.some(t => S.road[t])) bumpVer(S, 'road'); if (todo.some(t => S.rail[t])) bumpVer(S, 'rail');
  bumpVer(S, 'power');
  return { ok: true, cost };
}
function lockAxis(S, t) {
  for (let d = 0; d < 4; d++) {
    const a = nb(S, t, d), b = nb(S, t, opp(d));
    if (a >= 0 && b >= 0 && S.ter[a] === T_CANAL && S.ter[b] === T_SEA) return d; // d points to the canal (upper) side
  }
  return -1;
}
function buildLock(S, t) {
  if (t < 0 || (S.ter[t] !== T_LAND && S.ter[t] !== T_CANAL) || S.bld[t] || S.road[t] || S.rail[t]) return { ok: false, why: 'Locks need a clear tile' };
  const up = lockAxis(S, t);
  if (up < 0) return { ok: false, why: 'A lock needs canal on one side and tidal sea directly opposite' };
  if (!canPay(S, COST.lock)) return { ok: false, why: 'Not enough money' };
  pay(S, COST.lock, 'build');
  S.ter[t] = T_LOCK; S.tree[t] = 0; S.pow[t] = 0;
  S.locks.push({ id: S.nl++, t, up, lo: opp(up), ph: 'open', g: 1, lvl: tideAt(S.tick), tgt: 1, tm: 0, occ: 0, pass: 0, q: [[], []], served: 0, cycles: 0, empty: 0 });
  bumpVer(S, 'water');
  return { ok: true };
}
function buildPower(S, tiles) {
  let cost = 0; const todo = [];
  for (const t of tiles) if (t >= 0 && !S.pow[t] && !S.bld[t] && S.ter[t] === T_LAND) { todo.push(t); cost += COST.power; }
  if (!todo.length) return { ok: false, why: 'Power lines go on dry land' };
  if (!canPay(S, cost)) return { ok: false, why: 'Not enough money' };
  pay(S, cost, 'build');
  for (const t of todo) S.pow[t] = 1;
  bumpVer(S, 'power');
  return { ok: true, cost };
}

/* ---------------- demolition ---------------- */
/* Returns a list of what happened, for the event log. */
function bulldozeTile(S, t, rep) {
  if (t < 0) return false;
  if (S.bld[t]) { const b = bById(S, S.bld[t]); if (b && b.type !== 'lighthouse') { demolishBuilding(S, b, rep); return true; } }
  if (S.sig[t]) { S.sig[t] = 0; bumpVer(S, 'rail'); rep.push('Removed signal ' + xy(S, t)); return true; }
  if (S.rail[t]) {
    // a neighbour left with no connections at all has no track any more
    const m = S.rail[t], gone = [t];
    for (let d = 0; d < 4; d++) if (m & (1 << d)) { const n = nb(S, t, d); if (n >= 0) { S.rail[n] &= ~(1 << opp(d)); if (!S.rail[n]) { S.sig[n] = 0; gone.push(n); } } }
    S.rail[t] = 0;
    railRemoved(S, gone, rep);
    bumpVer(S, 'rail'); if (gone.some(u => isWater(S.ter[u]))) bumpVer(S, 'water');
    rep.push((isWater(S.ter[t]) ? 'Demolished railway bridge ' : 'Removed track ') + xy(S, t));
    for (const u of gone.slice(1)) rep.push('Track ' + xy(S, u) + ' lost its last connection and was lifted too');
    return true;
  }
  if (S.road[t]) {
    S.road[t] = 0; roadRemoved(S, [t], rep);
    bumpVer(S, 'road'); if (isWater(S.ter[t])) bumpVer(S, 'water');
    rep.push((isWater(S.ter[t]) ? 'Demolished road bridge ' : 'Removed road ') + xy(S, t));
    return true;
  }
  if (S.pow[t]) { S.pow[t] = 0; bumpVer(S, 'power'); rep.push('Removed power line ' + xy(S, t)); return true; }
  if (S.ter[t] === T_CANAL || S.ter[t] === T_LOCK) {
    for (const v of S.vehs) if ((v.k === 'barge' || v.k === 'freighter') && v.t === t) { rep.push('Cannot fill ' + xy(S, t) + ': boat in the way'); return false; }
    if (S.ter[t] === T_LOCK) { const i = S.locks.findIndex(l => l.t === t); if (i >= 0) S.locks.splice(i, 1); }
    S.ter[t] = T_LAND; bumpVer(S, 'water');
    for (const b of S.blds) if (BT[b.type].node === 'water') b._berthV = -1;
    rep.push('Filled in ' + xy(S, t));
    return true;
  }
  if (S.tree[t]) { S.tree[t] = 0; rep.push('Cleared trees ' + xy(S, t)); return true; }
  return false;
}

function demolishBuilding(S, b, rep) {
  const def = BT[b.type];
  // stock inside is destroyed: explicit loss
  for (let r = 0; r < NR; r++) {
    const n = b.inv[r] + b.out[r] + (b.exp ? b.exp[r] : 0);
    if (n > 0) loseUnits(S, r, n, 'Demolition of ' + def.name + ' #' + b.id, b.x + b.y * S.W, 0, 0);
  }
  // consignments in its transit yard are destroyed too
  if (b.tr) for (const cid of b.tr.slice()) { const c = cById(S, cid); if (c) { loseUnits(S, c.r, c.q, 'Demolition of ' + def.name + ' #' + b.id + ' (transit cargo)', b.x + b.y * S.W, 0, c.id); closeCon(S, c, 'lost'); } }
  for (const t of bTiles(S, b)) {
    S.bld[t] = 0;
    if (def.node === 'rail') { /* the track under the platform stays */ }
  }
  const idx = S.blds.indexOf(b); if (idx >= 0) S.blds.splice(idx, 1);
  b.dead = 1;
  buildingGone(S, b, rep);
  bumpVer(S, 'road'); bumpVer(S, 'power'); if (def.node === 'rail') bumpVer(S, 'rail'); if (def.node === 'water') bumpVer(S, 'water');
  rep.push('Demolished ' + def.name + ' #' + b.id);
}

function loseUnits(S, r, q, why, at, vid, cid) {
  if (q <= 0) return;
  S.led.lost[r] += q;
  S.lossLog.push({ t: S.tick, r, q, why, at, v: vid | 0, c: cid | 0 });
  if (S.lossLog.length > 500) S.lossLog.shift();
  dec(S, 19, r, q, vid | 0);
}

/* ---------------- terrain generation ---------------- */
/* Value noise with integer lattice + float interpolation (only + - * /, so
   results are bit-identical across engines). */
function noiseField(gen, W, H, cell) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
  const g = new Float64Array(gw * gh); for (let i = 0; i < g.length; i++) g[i] = gen.int(10000) / 10000;
  const f = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
    let fx = gx - ix, fy = gy - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    f[y * W + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }
  return f;
}

/* opts: {coast: 'sw'|'s', coastAt: fraction, estuary: bool, deposits: [...]} */
function genTerrain(S, opts) {
  const W = S.W, H = S.H, gen = makeGen(S.seed);
  const n1 = noiseField(gen, W, H, 9), n2 = noiseField(gen, W, H, 4), n3 = noiseField(gen, W, H, 6);
  const ca = opts.coastAt || 0.74;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y * W + x;
    // sea occupies the south-west (bottom-left on screen): large y, small x
    const along = (y / H) * 0.78 + ((W - 1 - x) / W) * 0.42;
    const v = along + (n1[t] - 0.5) * 0.18 + (n2[t] - 0.5) * 0.06;
    S.ter[t] = v > ca ? T_SEA : T_LAND;
  }
  if (opts.estuary) {        // a tidal channel running inland, which splits the land
    const ex = opts.estuaryX || Math.floor(W * 0.55);
    let cx = ex;
    for (let y = H - 1; y >= Math.floor(H * (opts.estuaryTop || 0.3)); y--) {
      cx += Math.round((n3[y * W + Math.min(W - 1, cx)] - 0.5) * 2);
      cx = Math.max(8, Math.min(W - 8, cx));
      for (let k = 0; k < (opts.estuaryW || 2); k++) S.ter[y * W + cx + k] = T_SEA;
    }
  }
  // edge water ring along the coast edges guarantees a freighter gate
  let gate = -1;
  for (let i = 0; i < H && gate < 0; i++) { const t = (H - 1) * W + i; if (S.ter[t] === T_SEA) gate = t; }
  if (gate < 0) for (let y = H - 1; y >= 0 && gate < 0; y--) { if (S.ter[y * W] === T_SEA) gate = y * W; }
  S.gate = gate;
  // deposits and forests
  for (let t = 0; t < W * H; t++) {
    if (S.ter[t] !== T_LAND) continue;
    const x = t % W, y = (t / W) | 0;
    let coast = 99;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (inb(S, xx, yy) && S.ter[yy * W + xx] === T_SEA) coast = Math.min(coast, Math.abs(dx) + Math.abs(dy)); }
    if (n3[t] > 0.62 && coast > 3) S.tree[t] = 1 + (gen.int(3));
    else if (n2[t] < 0.33 && coast > 2) S.dep[t] = D_FERTILE;
    if (coast <= 3 && coast >= 2 && n2[t] > 0.58) { S.dep[t] = D_CLAY; S.tree[t] = 0; }
  }
  for (const d of (opts.deposits || [])) stamp(S, d[0], d[1], d[2], d[3], gen);
}
function stamp(S, kind, cx, cy, rad, gen) {
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
    if (!inb(S, x, y)) continue; const t = y * S.W + x;
    if (S.ter[t] !== T_LAND) continue;
    const dd = Math.abs(x - cx) + Math.abs(y - cy);
    if (dd <= rad && (dd < rad || gen.int(3) > 0)) {
      if (kind === 'forest') { S.tree[t] = 2 + gen.int(2); if (S.dep[t] === D_FERTILE) S.dep[t] = 0; }
      else if (kind === 'clear') { S.tree[t] = 0; S.dep[t] = 0; }
      else if (kind === 'fertile') { S.dep[t] = D_FERTILE; S.tree[t] = 0; }
      else { S.dep[t] = kind; S.tree[t] = 0; }
    }
  }
}

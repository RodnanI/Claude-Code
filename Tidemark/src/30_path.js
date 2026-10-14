/* =====================================================================
   Networks and path finding.
   Derived caches live in S._c and are pure functions of serialized state
   keyed by network version counters, so a restored snapshot rebuilds the
   exact same caches and makes the exact same choices.
   ===================================================================== */

function C(S) { return S._c || (S._c = {}); }

/* Deterministic binary heap: ordered by (key, seq). */
class Heap {
  constructor() { this.k = []; this.s = []; this.v = []; this.n = 0; this.seq = 0; }
  push(key, val) {
    let i = this.n++; const seq = this.seq++;
    this.k[i] = key; this.s[i] = seq; this.v[i] = val;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] < key || (this.k[p] === key && this.s[p] < seq)) break;
      this.k[i] = this.k[p]; this.s[i] = this.s[p]; this.v[i] = this.v[p]; i = p;
    }
    this.k[i] = key; this.s[i] = seq; this.v[i] = val;
  }
  pop() {
    const top = this.v[0], lk = this.k[0]; this.lastKey = lk;
    const n = --this.n; if (n === 0) return top;
    const key = this.k[n], seq = this.s[n], val = this.v[n];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1; if (c >= n) break;
      if (c + 1 < n && (this.k[c + 1] < this.k[c] || (this.k[c + 1] === this.k[c] && this.s[c + 1] < this.s[c]))) c++;
      if (key < this.k[c] || (key === this.k[c] && seq < this.s[c])) break;
      this.k[i] = this.k[c]; this.s[i] = this.s[c]; this.v[i] = this.v[c]; i = c;
    }
    this.k[i] = key; this.s[i] = seq; this.v[i] = val;
    return top;
  }
}

/* ---------------- roads ---------------- */
function roadNet(S) {
  const c = C(S);
  if (c.rnV === S.ver.road) return c;
  const N = S.W * S.H, rc = new Int32Array(N).fill(-1), jn = new Uint8Array(N), q = new Int32Array(N);
  let k = 0;
  for (let t = 0; t < N; t++) {
    if (!S.road[t]) continue;
    let deg = 0; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.road[n]) deg++; }
    jn[t] = deg >= 3 ? 1 : 0;
  }
  for (let s = 0; s < N; s++) {
    if (!S.road[s] || rc[s] >= 0) continue;
    let h = 0, e = 0; q[e++] = s; rc[s] = k;
    while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.road[n] && rc[n] < 0) { rc[n] = k; q[e++] = n; } } }
    k++;
  }
  // touching junction tiles form one intersection box, entered as a unit
  const jb = new Int32Array(N).fill(-1);
  for (let s = 0; s < N; s++) {
    if (!jn[s] || jb[s] >= 0) continue;
    let h = 0, e = 0; q[e++] = s; jb[s] = s;
    while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && jn[n] && jb[n] < 0) { jb[n] = s; q[e++] = n; } } }
  }
  c.rc = rc; c.jn = jn; c.jb = jb; c.rcN = k; c.rnV = S.ver.road; c.dist = new Map();
  return c;
}
const rcOf = (S, t) => t < 0 ? -1 : roadNet(S).rc[t];

/* BFS distance map from a road tile (cached per road version). */
function roadDist(S, src) {
  const c = roadNet(S);
  let m = c.dist.get(src); if (m) return m;
  const N = S.W * S.H; m = new Int32Array(N).fill(-1);
  if (src >= 0 && S.road[src]) {
    const q = new Int32Array(N); let h = 0, e = 0; q[e++] = src; m[src] = 0;
    while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.road[n] && m[n] < 0) { m[n] = m[t] + 1; q[e++] = n; } } }
  }
  if (c.dist.size > 400) c.dist.clear();
  c.dist.set(src, m);
  return m;
}
/* Shortest road path from -> to (tiles after 'from', ending at 'to'). */
function roadPath(S, from, to, avoid) {
  if (from === to) return [];
  if (avoid === undefined || avoid < 0) {
    const m = roadDist(S, to); if (m[from] < 0) return null;
    const out = []; let cur = from;
    while (cur !== to) {
      let nx = -1;
      for (let d = 0; d < 4; d++) { const n = nb(S, cur, d); if (n >= 0 && S.road[n] && m[n] === m[cur] - 1) { nx = n; break; } }
      if (nx < 0) return null; out.push(nx); cur = nx;
    }
    return out;
  }
  // detour search with one tile blocked
  const N = S.W * S.H, m = new Int32Array(N).fill(-1), q = new Int32Array(N);
  let h = 0, e = 0; q[e++] = to; m[to] = 0;
  while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && n !== avoid && S.road[n] && m[n] < 0) { m[n] = m[t] + 1; q[e++] = n; } } }
  if (m[from] < 0) return null;
  const out = []; let cur = from;
  while (cur !== to) {
    let nx = -1;
    for (let d = 0; d < 4; d++) { const n = nb(S, cur, d); if (n >= 0 && n !== avoid && S.road[n] && m[n] === m[cur] - 1) { nx = n; break; } }
    if (nx < 0) return null; out.push(nx); cur = nx;
  }
  return out;
}
/* Building entrance: first adjacent road tile in a fixed ring order. */
function bAcc(S, b) {
  if (b._accV === S.ver.road) return b._acc;
  let a = -1; for (const t of bRing(S, b)) if (S.road[t]) { a = t; break; }
  b._acc = a; b._accV = S.ver.road; return a;
}

/* ---------------- rail ---------------- */
const sigDir = (S, t) => S.sig[t] - 1;
function railLink(S, t, d) {           // can a train leave t in direction d into the next tile?
  if (!(S.rail[t] & (1 << d))) return -1;
  const n = nb(S, t, d); if (n < 0 || !(S.rail[n] & (1 << opp(d)))) return -1;
  return n;
}
function railNet(S) {
  const c = C(S);
  if (c.raV === S.ver.rail) return c;
  const N = S.W * S.H, comp = new Int32Array(N).fill(-1), q = new Int32Array(N); let k = 0;
  for (let s = 0; s < N; s++) {
    if (!S.rail[s] || comp[s] >= 0) continue;
    let h = 0, e = 0; q[e++] = s; comp[s] = k;
    while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = railLink(S, t, d); if (n >= 0 && comp[n] < 0) { comp[n] = k; q[e++] = n; } } }
    k++;
  }
  c.raComp = comp; c.raV = S.ver.rail; c.raDist = new Map();
  return c;
}
const railCompOf = (S, t) => t < 0 ? -1 : railNet(S).raComp[t];
function stTileSet(S, st) { if (st._tsV === S.ver.rail && st._ts) return st._ts; st._ts = new Set(bTiles(S, st)); st._tsV = S.ver.rail; return st._ts; }

/* Dijkstra over (tile, heading). starts: [[tile, heading, cost]]. goal(t,h)->bool.
   pen(t)->extra cost (e.g. tiles reserved by other trains). Returns
   {path:[tiles after start tile], start:index, cost} or null. */
function railSearch(S, starts, goal, pen, limit) {
  const N = S.W * S.H * 4, g = new Int32Array(N).fill(0x3fffffff), from = new Int32Array(N).fill(-1), st0 = new Int8Array(N).fill(-1);
  const H = new Heap();
  for (let i = 0; i < starts.length; i++) { const [t, h, c] = starts[i]; const s = t * 4 + h; if (c < g[s]) { g[s] = c; st0[s] = i; H.push(c, s); } }
  let found = -1, pops = 0;
  while (H.n) {
    const s = H.pop(), gc = H.lastKey; if (gc > g[s]) continue;
    const t = s >> 2, h = s & 3;
    if (goal(t, h) && (from[s] >= 0 || (st0[s] >= 0 && starts[st0[s]][3]))) { found = s; break; }
    if (++pops > (limit || 60000)) break;
    for (let d = 0; d < 4; d++) {
      if (d === opp(h)) continue;
      if (S.sig[t] && sigDir(S, t) !== d) continue;
      const n = railLink(S, t, d); if (n < 0) continue;
      if (S.sig[n] && sigDir(S, n) !== d) continue;
      const ns = n * 4 + d, nc = gc + 10 + (d !== h ? 4 : 0) + (pen ? pen(n) : 0);
      if (nc < g[ns]) { g[ns] = nc; from[ns] = s; st0[ns] = st0[s]; H.push(nc, ns); }
    }
  }
  if (found < 0) return null;
  const path = []; let s = found;
  while (from[s] >= 0) { path.push(s >> 2); s = from[s]; }
  path.reverse();
  return { path, start: st0[found], cost: g[found], h: found & 3 };
}
function stationGoal(S, st) {
  const ts = stTileSet(S, st);
  return (t, h) => { if (!ts.has(t)) return false; const n = nb(S, t, h); return n < 0 || !ts.has(n); };
}
/* Starting states for a train standing at a platform: both directions. */
function stationStarts(S, st) {
  const out = [], ax = (st.rot & 1) ? [0, 2] : [1, 3];
  for (const t of bTiles(S, st)) for (const h of ax) out.push([t, h, 0]);
  return out;
}
/* Cached station-to-station rail distance (cost units), -1 if unreachable. */
function railStationDist(S, a, b) {
  const c = railNet(S), key = a.id * 100000 + b.id;
  if (c.raDist.has(key)) return c.raDist.get(key);
  const r = railSearch(S, stationStarts(S, a), stationGoal(S, b), null, 80000);
  const v = r ? r.cost : -1; c.raDist.set(key, v); return v;
}

/* ---------------- water ---------------- */
function lockAt(S, t) { for (const l of S.locks) if (l.t === t) return l; return null; }
function waterPass(S, a, b, kind) {
  const tb = S.ter[b], ta = S.ter[a];
  if (!isWater(tb)) return false;
  if (kind === 'freighter') return tb === T_SEA && !S.road[b] && !S.rail[b];
  if (ta === T_LOCK && tb === T_LOCK) return false;
  if (tb === T_LOCK) { const l = lockAt(S, b); if (!l) return false; const d = dirTo(S, b, a); return (ta === T_CANAL && d === l.up) || (ta === T_SEA && d === l.lo); }
  if (ta === T_LOCK) { const l = lockAt(S, a); if (!l) return false; const d = dirTo(S, a, b); return (tb === T_CANAL && d === l.up) || (tb === T_SEA && d === l.lo); }
  if ((ta === T_CANAL && tb === T_SEA) || (ta === T_SEA && tb === T_CANAL)) return false;
  return true;
}
function waterNet(S) {
  const c = C(S);
  if (c.waV === S.ver.water) return c;
  const N = S.W * S.H, comp = new Int32Array(N).fill(-1), q = new Int32Array(N); let k = 0;
  for (let s = 0; s < N; s++) {
    if (!isWater(S.ter[s]) || comp[s] >= 0) continue;
    let h = 0, e = 0; q[e++] = s; comp[s] = k;
    while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && comp[n] < 0 && waterPass(S, t, n, 'barge')) { comp[n] = k; q[e++] = n; } } }
    k++;
  }
  c.waComp = comp; c.waV = S.ver.water; c.waDist = new Map();
  return c;
}
const waterCompOf = (S, t) => t < 0 ? -1 : waterNet(S).waComp[t];
/* Dijkstra for boats; goalSet: Set of tiles. Returns {path, cost, locks}. */
function waterSearch(S, from, goalSet, kind, limit) {
  const N = S.W * S.H, g = new Int32Array(N).fill(0x3fffffff), pr = new Int32Array(N).fill(-1);
  const H = new Heap(); g[from] = 0; H.push(0, from);
  let found = -1, pops = 0;
  while (H.n) {
    const t = H.pop(), gc = H.lastKey; if (gc > g[t]) continue;
    if (goalSet.has(t)) { found = t; break; }
    if (++pops > (limit || 40000)) break;
    for (let d = 0; d < 4; d++) {
      const n = nb(S, t, d); if (n < 0 || !waterPass(S, t, n, kind)) continue;
      const nc = gc + 10 + (S.ter[n] === T_LOCK ? 60 : 0) + (S.ter[n] === T_SEA && kind !== 'freighter' ? 2 : 0);
      if (nc < g[n]) { g[n] = nc; pr[n] = t; H.push(nc, n); }
    }
  }
  if (found < 0) return null;
  const path = []; let t = found, locks = 0;
  while (t !== from) { path.push(t); if (S.ter[t] === T_LOCK) locks++; t = pr[t]; }
  path.reverse();
  return { path, cost: g[found], locks };
}
function berths(S, b, kind) {
  const key = kind === 'freighter' ? '_bf' : '_bb';
  if (b[key + 'V'] === S.ver.water && b[key]) return b[key];
  const def = BT[b.type], out = [];
  for (const t of bRing(S, b)) {
    if (S.ter[t] !== def.wt) continue;
    if (kind === 'freighter' && (S.road[t] || S.rail[t])) continue;
    out.push(t);
  }
  b[key] = out; b[key + 'V'] = S.ver.water; return out;
}
function dockWaterDist(S, a, b) {
  const c = waterNet(S), key = a.id * 100000 + b.id;
  if (c.waDist.has(key)) return c.waDist.get(key);
  let best = null;
  const gs = new Set(berths(S, b, 'barge'));
  for (const s of berths(S, a, 'barge')) {
    const r = gs.has(s) ? { cost: 0, locks: 0 } : waterSearch(S, s, gs, 'barge', 50000);
    if (r && (!best || r.cost < best.cost)) best = r;
  }
  const v = best ? { cost: best.cost, locks: best.locks } : null;
  c.waDist.set(key, v); return v;
}

/* ---------------- power ---------------- */
function powerNet(S) {
  const c = C(S);
  if (c.pwV === S.ver.power) return c;
  const N = S.W * S.H, comp = new Int32Array(N).fill(-1), q = new Int32Array(N); let k = 0;
  const cond = t => S.bld[t] !== 0 || S.pow[t] === 1;
  for (let s = 0; s < N; s++) {
    if (!cond(s) || comp[s] >= 0) continue;
    let h = 0, e = 0; q[e++] = s; comp[s] = k;
    while (h < e) { const t = q[h++]; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && comp[n] < 0 && cond(n)) { comp[n] = k; q[e++] = n; } } }
    k++;
  }
  c.pwComp = comp; c.pwN = k; c.pwV = S.ver.power;
  return c;
}

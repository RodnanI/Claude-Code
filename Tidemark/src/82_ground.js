/* =====================================================================
   Ground: land, shore, tidal sea, canals, locks, roads, rails.
   ===================================================================== */
const GC = {
  grass: ['#8ea86a', '#94ad6e', '#89a366', '#99b072'], field: '#c8b25a', fieldDark: '#a99447', soil: '#8a6d4c',
  sand: '#d8c69c', wetSand: '#a99a73', bank: '#7d6a4f', stone: '#b5ab97', stoneDark: '#8f8572',
  deep: '#2c565e', shallow: '#5f968c', canal: '#4c7c7b', foam: '#e9efe4',
  road: '#8b8378', roadDark: '#6f685f', walk: '#bbb19f', ballast: '#8b8173', sleeper: '#5a4636', railC: '#cfd4d4',
  coal: '#3a3633', ore: '#9b5238', clay: '#c4804f',
};
/* smooth, stable grass tones from a small value-noise field */
function grassCol(S, t) {
  if (!RV._gn || RV._gn.length !== S.W * S.H) {
    const W = S.W, H = S.H, g = new Float32Array(W * H), cell = 7;
    const lat = (i, j) => rnd01(i * 7919 + j * 104729 + 13);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy); let u = fx - ix, v = fy - iy; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      const a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1);
      g[y * W + x] = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v + (rnd01(y * W + x) - 0.5) * 0.12;
    }
    RV._gn = g; RV._gc = new Array(W * H);
  }
  let c = RV._gc[t];
  if (!c) { const n = Math.max(0, Math.min(1, RV._gn[t])); c = RV._gc[t] = n < 0.5 ? mixHex('#86a263', '#93ac6c', n * 2) : mixHex('#93ac6c', '#a0b676', (n - 0.5) * 2); }
  return c;
}
function seaZ(S) { return -(2 + (124 - tideAt(S.tick)) * 0.085); }   // water surface below ground, in px
const CANAL_Z = -4.5;
/* Distance of each sea tile from land, for colour; cached per water version. */
function seaDepth(S) {
  const c = RV._depth;
  if (c && c.v === S.ver.water && c.n === S.W * S.H) return c.d;
  const N = S.W * S.H, d = new Uint8Array(N).fill(255), q = [];
  for (let t = 0; t < N; t++) if (S.ter[t] === T_LAND) { d[t] = 0; q.push(t); }
  for (let h = 0; h < q.length; h++) { const t = q[h]; for (let k = 0; k < 4; k++) { const n = nb(S, t, k); if (n >= 0 && d[n] === 255) { d[n] = Math.min(254, d[t] + 1); q.push(n); } } }
  RV._depth = { v: S.ver.water, n: N, d }; return d;
}
function nearFarm(S, t) {
  const c = RV._farm; const key = S.blds.length + ':' + S.ver.road;
  if (!c || c.k !== key) {
    const m = new Uint8Array(S.W * S.H);
    for (const b of S.blds) if (b.type === 'farm') for (let y = b.y - 2; y < b.y + b.h + 2; y++) for (let x = b.x - 2; x < b.x + b.w + 2; x++) if (inb(S, x, y)) m[y * S.W + x] = 1;
    RV._farm = { k: key, m };
  }
  return RV._farm.m[t];
}

function drawGroundTile(c, S, t) {
  const x = t % S.W, y = (t / S.W) | 0, ter = S.ter[t], h = rnd01(t * 7 + 3);
  if (ter === T_SEA || ter === T_CANAL || ter === T_LOCK) { drawWater(c, S, t, x, y, ter); return; }
  // land
  let col = grassCol(S, t);
  let coast = false;
  for (let k = 0; k < 4; k++) { const n = nb(S, t, k); if (n >= 0 && S.ter[n] === T_SEA) coast = true; }
  const dep = S.dep[t];
  if (coast && !S.bld[t] && !S.road[t]) col = GC.sand;
  else if (dep === D_FERTILE && nearFarm(S, t) && !S.road[t] && !S.rail[t] && !S.bld[t]) col = (x + y) & 1 ? GC.field : GC.soil;
  const ov = -0.9 / (HW * (RV.chunkZ || 1));
  fillPoly(c, tileQ(x, y, 0, ov), col);
  if (RV.q >= 1 && !S.road[t] && !S.bld[t]) {
    if (dep === D_FERTILE && nearFarm(S, t) && !S.rail[t]) {     // crop rows
      const ax = (x * 3 + y) % 2;
      for (let i = 1; i < 5; i++) { const u = i / 5 - 0.5; const a = ax ? P(x + u, y - 0.45, 0) : P(x - 0.45, y + u, 0), b = ax ? P(x + u, y + 0.45, 0) : P(x + 0.45, y + u, 0); line(c, a, b, (x + y) & 1 ? GC.fieldDark : '#6f5a3e', 1); }
    } else if (dep === D_COAL || dep === D_ORE || dep === D_CLAY) {
      const cc = dep === D_COAL ? GC.coal : dep === D_ORE ? GC.ore : GC.clay;
      for (let i = 0; i < 6; i++) { const p = P(x + rnd01(t * 13 + i) - 0.5, y + rnd01(t * 17 + i * 5) - 0.5, 0); c.fillStyle = cc; c.globalAlpha = 0.55; c.fillRect(p[0] - 2, p[1] - 1, 4, 2); }
      c.globalAlpha = 1;
    } else if (h > 0.55 && RV.q >= 2) {                            // grass tufts
      const p = P(x + h - 0.5, y + rnd01(t + 9) - 0.5, 0);
      c.strokeStyle = shade(col, 0.8); c.lineWidth = 0.8; c.beginPath(); c.moveTo(p[0] - 2, p[1]); c.lineTo(p[0] - 1, p[1] - 3); c.moveTo(p[0], p[1]); c.lineTo(p[0] + 0.5, p[1] - 3.5); c.moveTo(p[0] + 2, p[1]); c.lineTo(p[0] + 2, p[1] - 2.5); c.stroke();
    }
  }
  if (S.road[t]) drawRoad(c, S, t, x, y, 0);
  if (S.rail[t]) drawRail(c, S, t, x, y, 0);
}

function drawWater(c, S, t, x, y, ter) {
  const sz = seaZ(S);
  const z = ter === T_SEA ? sz : ter === T_CANAL ? CANAL_Z : lockZ(S, t);
  // banks on the two far edges (visible from the camera)
  const edge = (k) => { const n = nb(S, t, k); return n >= 0 && S.ter[n] === T_LAND; };
  const wallCol = (k) => { const n = nb(S, t, k); return ter !== T_SEA || (n >= 0 && (S.bld[n] || S.road[n])) ? GC.stoneDark : GC.bank; };
  // base: the bed of the channel at the water surface
  let col;
  if (ter === T_SEA) { const d = seaDepth(S)[t]; col = mixHex(GC.shallow, GC.deep, Math.min(1, (d - 1) / 5)); }
  else col = GC.canal;
  fillPoly(c, tileQ(x, y, z, -0.9 / (HW * (RV.cam.z * RV.dpr || 1))), col);
  if (edge(3)) { // west edge: face toward +x
    fillPoly(c, [P(x - 0.5, y - 0.5, 0), P(x - 0.5, y + 0.5, 0), P(x - 0.5, y + 0.5, z), P(x - 0.5, y - 0.5, z)], shade(wallCol(3), 0.78));
    if (ter === T_SEA) fillPoly(c, [P(x - 0.5, y - 0.5, -2), P(x - 0.5, y + 0.5, -2), P(x - 0.5, y + 0.5, z), P(x - 0.5, y - 0.5, z)], 'rgba(40,50,40,0.28)');
  }
  if (edge(0)) { // north edge: face toward +y
    fillPoly(c, [P(x - 0.5, y - 0.5, 0), P(x + 0.5, y - 0.5, 0), P(x + 0.5, y - 0.5, z), P(x - 0.5, y - 0.5, z)], shade(wallCol(0), 0.92));
    if (ter === T_SEA) fillPoly(c, [P(x - 0.5, y - 0.5, -2), P(x + 0.5, y - 0.5, -2), P(x + 0.5, y - 0.5, z), P(x - 0.5, y - 0.5, z)], 'rgba(40,50,40,0.28)');
  }
  // exposed wet sand at low tide along natural shores
  if (ter === T_SEA) {
    const low = Math.max(0, (70 - tideAt(S.tick)) / 50);
    if (low > 0) for (let k = 0; k < 4; k++) {
      const n = nb(S, t, k); if (n < 0 || S.ter[n] !== T_LAND || S.bld[n] || S.road[n]) continue;
      const w = 0.12 + 0.3 * low, q = tileQ(x, y, z);
      const a = q[k], b = q[(k + 1) & 3], a2 = [a[0] + (q[(k + 3) & 3][0] - a[0]) * w, a[1] + (q[(k + 3) & 3][1] - a[1]) * w], b2 = [b[0] + (q[(k + 2) & 3][0] - b[0]) * w, b[1] + (q[(k + 2) & 3][1] - b[1]) * w];
      fillPoly(c, [a, b, b2, a2], GC.wetSand);
    }
  }
  // coping stones along canals
  if (ter !== T_SEA) for (let k = 0; k < 4; k++) {
    const n = nb(S, t, k); if (n >= 0 && isWater(S.ter[n])) continue;
    const q = tileQ(x, y, 0), a = q[k], b = q[(k + 1) & 3];
    line(c, a, b, GC.stone, 2.2);
  }
  // animated glints
  if (RV.q >= 1) {
    const tt = RV.t, ph = rnd01(t * 31) * 6.28;
    const s = Math.sin(tt * 0.9 + ph), s2 = Math.sin(tt * 0.6 + ph * 1.7);
    const cx = x + 0.25 * s, cy = y + 0.25 * s2;
    const a = P(cx - 0.18, cy + 0.05, z), b = P(cx + 0.12, cy - 0.08, z);
    c.globalAlpha = 0.18 + 0.12 * s2; line(c, a, b, '#dfe9e2', 1.1);
    if (ter === T_SEA && RV.q >= 2) { const a2 = P(cx + 0.3, cy + 0.25, z), b2 = P(cx + 0.45, cy + 0.15, z); line(c, a2, b2, '#dfe9e2', 0.8); }
    c.globalAlpha = 1;
  }
  // foam where the sea meets land
  if (ter === T_SEA && RV.q >= 1) for (let k = 0; k < 4; k++) {
    const n = nb(S, t, k); if (n < 0 || S.ter[n] === T_SEA || S.ter[n] === T_LOCK) continue;
    const q = tileQ(x, y, z), a = q[k], b = q[(k + 1) & 3], m = 0.08 + 0.05 * Math.sin(RV.t * 1.6 + x + y);
    const ia = [a[0] + (q[(k + 3) & 3][0] - a[0]) * m, a[1] + (q[(k + 3) & 3][1] - a[1]) * m], ib = [b[0] + (q[(k + 2) & 3][0] - b[0]) * m, b[1] + (q[(k + 2) & 3][1] - b[1]) * m];
    c.globalAlpha = 0.55; line(c, ia, ib, GC.foam, 1.4); c.globalAlpha = 1;
  }
  if (ter === T_LOCK) drawLockChamber(c, S, t, x, y, z);
}
function lockZ(S, t) {
  const lk = lockAt(S, t); if (!lk) return CANAL_Z;
  const sea = seaZ(S), f = (lk.lvl - tideAt(S.tick)) / Math.max(1, CANAL_LVL - tideAt(S.tick));
  if (Math.abs(CANAL_LVL - tideAt(S.tick)) < 1) return CANAL_Z;
  return sea + (CANAL_Z - sea) * Math.max(-0.2, Math.min(1.2, f));
}
function drawLockChamber(c, S, t, x, y, z) {
  const lk = lockAt(S, t); if (!lk) return;
  // chamber walls along the axis sides
  const ax = lk.up === 0 || lk.up === 2 ? 'ns' : 'ew';
  const q0 = tileQ(x, y, 0);
  if (ax === 'ns') { line(c, q0[3], q0[0], GC.stone, 3); line(c, q0[1], q0[2], GC.stone, 3); }
  else { line(c, q0[0], q0[1], GC.stone, 3); line(c, q0[2], q0[3], GC.stone, 3); }
  // gates: a dark beam at each end; open gates swing back against the wall
  const gate = (side) => {
    const d = side === 0 ? lk.up : lk.lo;
    const open = lk.ph === 'free' || (lk.ph === 'open' && lk.g === side) || (lk.ph === 'opening' && lk.tgt === side && lk.tm < GATE_T / 2);
    const ex = x + DX[d] * 0.45, ey = y + DY[d] * 0.45, px = DY[d] !== 0 ? 0.48 : 0, py = DX[d] !== 0 ? 0.48 : 0;
    if (!open) line(c, P(ex - px, ey - py, 1), P(ex + px, ey + py, 1), '#3b2a1e', 3);
    else { line(c, P(ex - px, ey - py, 1), P(ex - px * 0.3 - DX[d] * 0.3, ey - py * 0.3 - DY[d] * 0.3, 1), '#3b2a1e', 2.5); line(c, P(ex + px, ey + py, 1), P(ex + px * 0.3 - DX[d] * 0.3, ey + py * 0.3 - DY[d] * 0.3, 1), '#3b2a1e', 2.5); }
    // balance beams
    line(c, P(ex - px * 1.1, ey - py * 1.1, 3), P(ex - px * 1.1 + DX[d] * 0.25, ey - py * 1.1 + DY[d] * 0.25, 3), '#e9e1cf', 1.5);
  };
  gate(0); gate(1);
}

/* ---------------- roads ---------------- */
function roadNbMask(S, t) { let m = 0; for (let k = 0; k < 4; k++) { const n = nb(S, t, k); if (n >= 0 && S.road[n]) m |= 1 << k; } return m; }
function drawRoad(c, S, t, x, y, z) {
  const m = roadNbMask(S, t);
  fillPoly(c, tileQ(x, y, z, -0.9 / (HW * (RV.chunkZ || 1))), GC.walk);
  const w = 0.32;           // half-width of the carriageway
  const ctr = [P(x - w, y - w, z), P(x + w, y - w, z), P(x + w, y + w, z), P(x - w, y + w, z)];
  fillPoly(c, ctr, GC.road);
  for (let k = 0; k < 4; k++) {
    if (!(m & (1 << k))) continue;
    const dx = DX[k], dy = DY[k];
    const a = dx !== 0 ? [P(x + dx * w, y - w, z), P(x + dx * 0.5, y - w, z), P(x + dx * 0.5, y + w, z), P(x + dx * w, y + w, z)]
      : [P(x - w, y + dy * w, z), P(x - w, y + dy * 0.5, z), P(x + w, y + dy * 0.5, z), P(x + w, y + dy * w, z)];
    fillPoly(c, a, GC.road);
  }
  if (RV.q >= 1) {
    const straight = m === 5 || m === 10;
    if (straight && !S.rail[t]) {
      const ax = m === 10;
      for (let i = 0; i < 2; i++) { const u = -0.35 + i * 0.5; const a = ax ? P(x + u, y, z) : P(x, y + u, z), b = ax ? P(x + u + 0.2, y, z) : P(x, y + u + 0.2, z); line(c, a, b, '#e9e2cd', 1); }
    }
    if (RV.q >= 2) { c.fillStyle = GC.roadDark; for (let i = 0; i < 5; i++) { const p = P(x + rnd01(t * 3 + i) * 0.6 - 0.3, y + rnd01(t * 5 + i) * 0.6 - 0.3, z); c.fillRect(p[0], p[1], 1.5, 1); } }
  }
}

/* ---------------- rails ---------------- */
function drawRail(c, S, t, x, y, z) {
  const m = S.rail[t];
  const st = S.bld[t] && stationAt(S, t);
  const bits = []; for (let k = 0; k < 4; k++) if (m & (1 << k)) bits.push(k);
  const curve = bits.length === 2 && bits[0] !== opp(bits[1]) ? bits : null;
  if (curve) { railCurve(c, x, y, z, curve[0], curve[1]); }
  else {
    if (m === 5 || m === 10) railStraight(c, x, y, z, m === 10 ? 1 : 0, -0.5, 0.5);
    else for (const k of bits) { const ax = k === 1 || k === 3 ? 1 : 0; const s = k === 1 || k === 2 ? 1 : -1; railStraight(c, x, y, z, ax, s > 0 ? 0 : -0.5, s > 0 ? 0.5 : 0); }
  }
  void st;
}
function railStraight(c, x, y, z, ax, a, b) {
  // ax 1: along x; ax 0: along y. From offset a to b along the axis.
  const pt = (u, v) => ax ? P(x + u, y + v, z) : P(x + v, y + u, z);
  fillPoly(c, [pt(a, -0.3), pt(b, -0.3), pt(b, 0.3), pt(a, 0.3)], GC.ballast);
  const n = Math.round((b - a) * 6);
  for (let i = 0; i < n; i++) { const u = a + (i + 0.5) / n * (b - a); line(c, pt(u, -0.24), pt(u, 0.24), GC.sleeper, 2); }
  line(c, pt(a, -0.13), pt(b, -0.13), GC.railC, 1.1); line(c, pt(a, 0.13), pt(b, 0.13), GC.railC, 1.1);
}
function railCurve(c, x, y, z, d1, d2) {
  // quarter circle around the shared corner
  const cx = x + (DX[d1] + DX[d2]) * 0.5, cy = y + (DY[d1] + DY[d2]) * 0.5;
  const arc = (r) => { const out = []; const a0 = Math.atan2(y + DY[d1] * 0.5 - cy, x + DX[d1] * 0.5 - cx), a1 = Math.atan2(y + DY[d2] * 0.5 - cy, x + DX[d2] * 0.5 - cx); let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; for (let i = 0; i <= 8; i++) { const a = a0 + da * i / 8; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, a]); } return out; };
  const outer = arc(0.8), inner = arc(0.2);
  const pts = outer.map(p => P(p[0], p[1], z)).concat(inner.reverse().map(p => P(p[0], p[1], z)));
  fillPoly(c, pts, GC.ballast);
  const mid = arc(0.5);
  for (let i = 0; i < mid.length; i += 1) { const a = mid[i][2]; const p1 = P(cx + Math.cos(a) * 0.26, cy + Math.sin(a) * 0.26, z), p2 = P(cx + Math.cos(a) * 0.74, cy + Math.sin(a) * 0.74, z); line(c, p1, p2, GC.sleeper, 2); }
  for (const r of [0.37, 0.63]) { const a = arc(r); c.beginPath(); a.forEach((p, i) => { const q = P(p[0], p[1], z); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.strokeStyle = GC.railC; c.lineWidth = 1.1; c.stroke(); }
}

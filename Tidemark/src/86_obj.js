/* =====================================================================
   Vehicles, trees, street furniture, bridges, residents, particles.
   ===================================================================== */
const RIGHT = d => [-DY[d], DX[d]];
/* Continuous tile-space position of a road or water vehicle. */
function laneOff(k) { return k === 'truck' ? 0.17 : k === 'barge' ? 0.12 : 0; }
function vehPos(S, v) {
  if (v.k === 'train') return trainCars(S, v)[0];
  let t = v.t, hd = v.hd, p = v.p + (RV.alpha * (v._adv || 0));
  let path0 = v.path[0];
  if (p >= 256 && path0 !== undefined) { const nh = dirTo(S, t, path0); if (nh >= 0) { p -= 256; hd = nh; t = path0; path0 = v.path[1]; } else p = 255; }
  if (p > 255) p = 255;
  const x = t % S.W, y = (t / S.W) | 0;
  const exitD = path0 !== undefined ? dirTo(S, t, path0) : hd;
  const ed = exitD >= 0 ? exitD : hd;
  let px, py, dir;
  if (p < 128) { const f = p / 128; px = x - DX[hd] * 0.5 * (1 - f); py = y - DY[hd] * 0.5 * (1 - f); dir = hd; }
  else { const f = (p - 128) / 128; px = x + DX[ed] * 0.5 * f; py = y + DY[ed] * 0.5 * f; dir = ed; }
  const lo = laneOff(v.k), r = RIGHT(dir);
  let ang = Math.atan2(DY[dir], DX[dir]);
  if (p >= 128 && ed !== hd) { const r0 = RIGHT(hd); const f = (p - 128) / 128; ang = Math.atan2(DY[hd] * (1 - f) + DY[ed] * f, DX[hd] * (1 - f) + DX[ed] * f); px += (r0[0] * (1 - f) + r[0] * f) * lo - r[0] * lo; py += (r0[1] * (1 - f) + r[1] * f) * lo - r[1] * lo; }
  return { x: px + r[0] * lo, y: py + r[1] * lo, ang, tile: t };
}
function trainCars(S, v) {
  if (!v.tiles || !v.tiles.length) return [];
  const W = S.W, cx = t => t % W, cy = t => (t / W) | 0;
  const chain = v.tiles.slice(); let p = v.p + RV.alpha * (v._adv || 0), ni = 0;
  if (p >= 256 && v.rn > 0 && v.path[0] !== undefined) { chain.unshift(v.path[0]); p -= 256; ni = 1; }
  if (p > 255) p = 255;
  const h = chain[0], prev = chain[1], nxt = v.path[ni], hx = cx(h), hy = cy(h);
  const ex = prev !== undefined ? [(hx + cx(prev)) / 2, (hy + cy(prev)) / 2] : [hx - DX[v.hd] * 0.5, hy - DY[v.hd] * 0.5];
  const xn = nxt !== undefined ? [(hx + cx(nxt)) / 2, (hy + cy(nxt)) / 2] : [hx + (hx - ex[0]), hy + (hy - ex[1])];
  const pts = [];
  if (p < 128) { const f = p / 128; pts.push([ex[0] + (hx - ex[0]) * f, ex[1] + (hy - ex[1]) * f]); }
  else { const f = (p - 128) / 128; pts.push([hx + (xn[0] - hx) * f, hy + (xn[1] - hy) * f], [hx, hy]); }
  pts.push(ex);
  for (let i = 1; i < chain.length; i++) { pts.push([cx(chain[i]), cy(chain[i])]); if (i + 1 < chain.length) pts.push([(cx(chain[i]) + cx(chain[i + 1])) / 2, (cy(chain[i]) + cy(chain[i + 1])) / 2]); }
  const L = chain[chain.length - 1], L2 = chain.length > 1 ? chain[chain.length - 2] : h;
  pts.push([cx(L) + (cx(L) - cx(L2)) * 0.6, cy(L) + (cy(L) - cy(L2)) * 0.6]);
  const at = (dist) => {
    let d = dist;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= len || i === pts.length - 2) { const f = len ? Math.min(1, d / len) : 0; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(a[1] - b[1], a[0] - b[0]), tile: f < 0.5 ? null : null }; }
      d -= len;
    }
    return { x: pts[0][0], y: pts[0][1], ang: 0 };
  };
  const cars = []; for (let i = 0; i < 4; i++) cars.push(at(0.22 + i * 0.47));
  return cars;
}
/* A box rotated by ang in tile space, drawn as an extruded footprint. */
function orientedBox(c, cx, cy, len, wid, ang, z0, h, col, o) {
  const ca = Math.cos(ang), sa = Math.sin(ang), hl = len / 2, hw = wid / 2;
  const cr = [[cx + ca * hl - sa * hw, cy + sa * hl + ca * hw], [cx + ca * hl + sa * hw, cy + sa * hl - ca * hw], [cx - ca * hl + sa * hw, cy - sa * hl - ca * hw], [cx - ca * hl - sa * hw, cy - sa * hl + ca * hw]];
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const a = cr[i], b = cr[(i + 1) & 3], nx = (b[1] - a[1]), ny = -(b[0] - a[0]);
    const vis = (nx + ny) * (i & 1 ? 1 : 1);
    faces.push([vis, a, b, nx, ny]);
  }
  // outward normal check: compare with centre
  for (const f of faces) {
    const mx = (f[1][0] + f[2][0]) / 2 - cx, my = (f[1][1] + f[2][1]) / 2 - cy;
    if (mx + my <= 0.0001) continue;
    const sh = mx - my > 0 ? 0.72 : 0.9;
    fillPoly(c, [P(f[1][0], f[1][1], z0), P(f[2][0], f[2][1], z0), P(f[2][0], f[2][1], z0 + h), P(f[1][0], f[1][1], z0 + h)], shade(col, sh));
  }
  const top = cr.map(q => P(q[0], q[1], z0 + h));
  fillPoly(c, top, (o && o.top) || shade(col, 1.05));
  if (!o || o.ink !== false) strokePoly(c, top, INK, 0.5);
  return cr;
}
function truckShape(c, x, y, dir, z, cargoR, ang) {
  const a = ang !== undefined ? ang : Math.atan2(DY[dir], DX[dir]);
  const ca = Math.cos(a), sa = Math.sin(a);
  orientedBox(c, x - ca * 0.11, y - sa * 0.11, 0.42, 0.25, a, z + 1.5, 5, '#55636a');
  orientedBox(c, x + ca * 0.2, y + sa * 0.2, 0.16, 0.25, a, z + 1.5, 9, '#c7533a');
  orientedBox(c, x + ca * 0.25, y + sa * 0.25, 0.05, 0.21, a, z + 6, 2.5, '#2b3a40', { ink: false });
  if (cargoR >= 0) orientedBox(c, x - ca * 0.11, y - sa * 0.11, 0.36, 0.21, a, z + 6.5, 4, RES[cargoR].col);
}
function drawVehicle(c, S, v, pos, z) {
  if (v.k === 'truck') {
    const con = v.cargo.length ? cById(S, v.cargo[0]) : null;
    truckShape(c, pos.x, pos.y, 0, z, con ? con.r : -1, pos.ang);
    if (dusk(S)) RV.lights.push([P(pos.x + Math.cos(pos.ang) * 0.4, pos.y + Math.sin(pos.ang) * 0.4, z + 3), 9, 0.5]);
  } else if (v.k === 'barge' || v.k === 'freighter') {
    const big = v.k === 'freighter', L = big ? 2.3 : 0.95, Wd = big ? 0.56 : 0.3, hz = z;
    const ca = Math.cos(pos.ang), sa = Math.sin(pos.ang);
    const cr = orientedBox(c, pos.x, pos.y, L, Wd, pos.ang, hz - 1, big ? 6 : 3, big ? '#33414a' : '#5a3e2b', { top: big ? '#7d6f62' : '#8a6a4c' });
    // bow point
    const bow = [pos.x + ca * (L / 2 + (big ? 0.25 : 0.15)), pos.y + sa * (L / 2 + (big ? 0.25 : 0.15))];
    fillPoly(c, [P(cr[0][0], cr[0][1], hz - 1 + (big ? 6 : 3)), P(bow[0], bow[1], hz - 1 + (big ? 6 : 3)), P(cr[1][0], cr[1][1], hz - 1 + (big ? 6 : 3))], big ? '#33414a' : '#5a3e2b');
    let units = 0, rr = -1; for (const id of v.cargo) { const cc = cById(S, id); if (cc) { units += cc.q; rr = cc.r; } }
    for (let r = 0; r < NR; r++) if (v.own[r]) { units += v.own[r]; rr = r; }
    if (dusk(S)) { // navigation lights: red to port, green to starboard, white masthead
      const r = [-sa, ca];
      RV.lights.push([P(pos.x - r[0] * Wd * 0.6, pos.y - r[1] * Wd * 0.6, hz + 4), 6, 0.8, 'r']);
      RV.lights.push([P(pos.x + r[0] * Wd * 0.6, pos.y + r[1] * Wd * 0.6, hz + 4), 6, 0.8, 'g']);
      RV.lights.push([P(pos.x, pos.y, hz + (big ? 24 : 9)), 8, 0.7]);
    }
    if (big) {
      orientedBox(c, pos.x - ca * 0.86, pos.y - sa * 0.86, 0.42, 0.5, pos.ang, hz + 5, 14, '#eae4d8');
      orientedBox(c, pos.x - ca * 0.9, pos.y - sa * 0.9, 0.3, 0.44, pos.ang, hz + 19, 4, '#d9d1c1');
      orientedBox(c, pos.x - ca * 0.8, pos.y - sa * 0.8, 0.12, 0.12, pos.ang, hz + 23, 9, '#b94a35');
      const n = Math.min(8, Math.ceil(units / 15));
      for (let i = 0; i < n; i++) orientedBox(c, pos.x + ca * (0.85 - (i >> 1) * 0.3), pos.y + sa * (0.85 - (i >> 1) * 0.3) + 0, 0.26, 0.2, pos.ang, hz + 5 + (i & 1) * 5, 5, ['#b94a35', '#3f6f68', '#c9a23f', '#5d6a70'][i % 4]);
      if (dusk(S)) RV.lights.push([P(pos.x, pos.y, hz + 14), 12, 0.6]);
    } else if (units > 0) {
      const f = Math.min(1, units / 30);
      orientedBox(c, pos.x, pos.y, 0.6 * f + 0.15, 0.2, pos.ang, hz + 2, 2 + 3 * f, RES[rr].col);
    }
    if (v.st === 'go' && RV.q >= 1 && (v._adv || 0) > 0) { const w1 = P(pos.x - ca * L * 0.6, pos.y - sa * L * 0.6, hz - 1); c.globalAlpha = 0.35; line(c, w1, P(pos.x - ca * L * 1.1 - sa * 0.15, pos.y - sa * L * 1.1 + ca * 0.15, hz - 1), '#e9efe4', 1); line(c, w1, P(pos.x - ca * L * 1.1 + sa * 0.15, pos.y - sa * L * 1.1 - ca * 0.15, hz - 1), '#e9efe4', 1); c.globalAlpha = 1; }
  }
}
function drawTrain(c, S, v, cars, z) {
  const loco = '#2f4a3e', cols = [];
  for (const id of v.cargo) { const cc = cById(S, id); if (cc) cols.push(RES[cc.r].col); }
  for (let i = cars.length - 1; i >= 0; i--) {
    const k = cars[i];
    if (i === 0) {
      orientedBox(c, k.x, k.y, 0.44, 0.24, k.ang, z + 1, 7, loco);
      orientedBox(c, k.x - Math.cos(k.ang) * 0.12, k.y - Math.sin(k.ang) * 0.12, 0.16, 0.24, k.ang, z + 8, 4, '#2a3b33');
      if (dusk(S)) RV.lights.push([P(k.x + Math.cos(k.ang) * 0.3, k.y + Math.sin(k.ang) * 0.3, z + 4), 12, 0.7]);
    } else {
      orientedBox(c, k.x, k.y, 0.42, 0.22, k.ang, z + 1, 5, '#6b5546');
      const cc = cols[(i - 1) % Math.max(1, cols.length)];
      if (cols.length && i - 1 < cols.length) orientedBox(c, k.x, k.y, 0.36, 0.18, k.ang, z + 6, 2.5, cc);
    }
  }
}
/* ---------------- static objects ---------------- */
function drawTrees(c, S, t, x, y) {
  const n = S.tree[t]; if (!n || S.bld[t] || S.road[t] || S.rail[t]) return;
  const k = n >= 3 ? 3 : n;
  for (let i = 0; i < k; i++) {
    const h = rnd01(t * 11 + i * 7), jx = (rnd01(t * 5 + i) - 0.5) * 0.6, jy = (rnd01(t * 19 + i * 3) - 0.5) * 0.6;
    const px = x + jx, py = y + jy, base = P(px, py, 0), scale = (n === 1 ? 0.55 : n === 2 ? 0.8 : 1) * (0.8 + h * 0.4);
    const conifer = rnd01(t * 23 + i) > 0.6;
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(base[0] + 3 * scale, base[1] + 1, 6 * scale, 3 * scale, 0, 0, Math.PI * 2); c.fill();
    line(c, base, [base[0], base[1] - 6 * scale], '#5a4030', 1.6 * scale);
    if (conifer) {
      const g = ['#3f6447', '#4a7350', '#36583e'][i % 3];
      for (let j = 0; j < 3; j++) { const zb = 4 + j * 5, w2 = (8 - j * 2) * scale; fillPoly(c, [[base[0] - w2, base[1] - zb * scale], [base[0] + w2, base[1] - zb * scale], [base[0], base[1] - (zb + 9) * scale]], shade(g, 0.9 + j * 0.08)); }
    } else {
      const g = ['#5f8a4c', '#6b9452', '#577f45'][i % 3];
      c.fillStyle = shade(g, 0.8); c.beginPath(); c.ellipse(base[0] + 1, base[1] - 12 * scale, 8 * scale, 7 * scale, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = g; c.beginPath(); c.ellipse(base[0] - 1, base[1] - 13 * scale, 7 * scale, 6 * scale, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(g, 1.15); c.beginPath(); c.ellipse(base[0] - 3, base[1] - 15 * scale, 3 * scale, 2.5 * scale, 0, 0, Math.PI * 2); c.fill();
    }
  }
}
function powerLive(S) {
  const key = S.tick - S.tick % 10;
  if (RV._pl && RV._pl.k === key && RV._pl.v === S.ver.power) return RV._pl.m;
  const m = new Map(); for (const p of S.pstat || []) m.set(p[0], p[1] > 0);
  RV._pl = { k: key, v: S.ver.power, m }; return m;
}
function lampLit(S, t) { if (!S.pow[t]) return false; const comp = powerNet(S).pwComp[t]; return !!powerLive(S).get(comp); }
function drawStreetFurniture(c, S, t, x, y, night) {
  if (S.road[t] && !isWater(S.ter[t]) && ((x * 7 + y * 13) % 3 === 0) && !roadNet(S).jn[t]) {
    const m = roadNbMask(S, t), ax = (m & 10) ? 1 : 0;
    const px = x + (ax ? 0 : 0.42), py = y + (ax ? 0.42 : 0);
    const b = P(px, py, 0), top = P(px, py, 17);
    line(c, b, top, '#3a3836', 1.2);
    line(c, top, [top[0] + (ax ? -4 : 4), top[1] + 1], '#3a3836', 1.2);
    const lit = night && lampLit(S, t);
    c.fillStyle = lit ? '#ffe2a0' : '#6a6660'; c.fillRect(top[0] + (ax ? -5 : 3), top[1], 2.5, 2);
    if (lit) RV.lights.push([[top[0] + (ax ? -4 : 4), top[1] + 2], 20, 0.85]);
  }
  if (S.pow[t] && !S.road[t] && !S.bld[t] && (x + y) % 2 === 0) {
    const b = P(x, y, 0), top = P(x, y, 22);
    line(c, b, top, '#5a4636', 1.4); line(c, [top[0] - 4, top[1] + 2], [top[0] + 4, top[1] + 2], '#5a4636', 1.2);
    for (const d of [1, 2]) {
      let n = nb(S, t, d), k = 1;
      while (n >= 0 && S.pow[n] && !S.road[n] && (n % S.W + ((n / S.W) | 0)) % 2 !== 0 && k < 3) { n = nb(S, n, d); k++; }
      if (n >= 0 && S.pow[n] && !S.road[n] && !S.bld[n]) { const tt = P(n % S.W, (n / S.W) | 0, 22); c.strokeStyle = 'rgba(40,36,32,0.6)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(top[0], top[1] + 2); c.quadraticCurveTo((top[0] + tt[0]) / 2, (top[1] + tt[1]) / 2 + 6, tt[0], tt[1] + 2); c.stroke(); }
    }
  }
  if (S.sig[t]) {
    const d = sigDir(S, t), r = RIGHT(d), px = x + r[0] * 0.38, py = y + r[1] * 0.38;
    const b = P(px, py, 0), top = P(px, py, 16);
    line(c, b, top, '#2f2f2f', 1.4);
    const green = S._rsv && S._rsv[t] && !trainOn(S, t);
    c.fillStyle = '#1f1f1f'; c.fillRect(top[0] - 2, top[1] - 4, 4, 6);
    c.fillStyle = green ? '#58d27a' : '#e2483b'; c.beginPath(); c.arc(top[0], top[1] - 1, 1.6, 0, Math.PI * 2); c.fill();
    RV.lights.push([[top[0], top[1] - 1], 6, 0.6, green ? 'g' : 'r']);
  }
  if (S.road[t] && S.rail[t]) {             // level crossing barriers
    const closed = S._rsv && S._rsv[t];
    const ax = S.rail[t] === 10 ? 1 : 0;
    for (const s of [-1, 1]) {
      const px = x + (ax ? s * 0.45 : 0.42 * s), py = y + (ax ? 0.42 * s : s * 0.45);
      const b = P(px, py, 0), top = P(px, py, 7); line(c, b, top, '#3a3836', 1.4);
      const end = closed ? P(px + (ax ? 0 : -s * 0.8), py + (ax ? -s * 0.8 : 0), 7) : P(px, py, 20);
      line(c, top, end, '#f2efe6', 1.6); line(c, top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2], '#c9402f', 1.6);
      if (closed && Math.floor(RV.t * 3) % 2) RV.lights.push([top, 8, 0.8, 'r']);
    }
  }
}
function trainOn(S, t) { for (const v of S.vehs) if (v.k === 'train' && v.tiles.indexOf(t) >= 0) return true; return false; }
function drawBridge(c, S, t, x, y) {
  const z = 4, road = S.road[t];
  // piers into the water
  const sea = seaZ(S);
  for (const [ox, oy] of [[-0.3, -0.3], [0.3, 0.3]]) isoBox(c, x + ox - 0.08, y + oy - 0.08, 0.16, 0.16, sea, z - sea, '#9c917c', { ink: true });
  if (road) {
    // stone face with an arch on the visible side, then the deck and parapets
    const ax = (roadNbMask(S, t) & 10) ? 1 : 0;
    const face = ax ? [P(x - 0.5, y + 0.5, z), P(x + 0.5, y + 0.5, z), P(x + 0.5, y + 0.5, sea), P(x - 0.5, y + 0.5, sea)] : [P(x + 0.5, y - 0.5, z), P(x + 0.5, y + 0.5, z), P(x + 0.5, y + 0.5, sea), P(x + 0.5, y - 0.5, sea)];
    fillPoly(c, face, ax ? '#9c917c' : '#857b69');
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const u = -0.38 + 0.76 * i / 12, h = sea + (z - 3 - sea) * Math.sqrt(Math.max(0, 1 - Math.pow(u / 0.38, 2)));
      const p = ax ? P(x + u, y + 0.5, h) : P(x + 0.5, y + u, h);
      if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]);
    }
    c.closePath(); c.fillStyle = 'rgba(20,32,36,0.55)'; c.fill();
    fillPoly(c, [P(x - 0.5, y - 0.5, z), P(x + 0.5, y - 0.5, z), P(x + 0.5, y + 0.5, z), P(x - 0.5, y + 0.5, z)], '#8f877b');
    const d0 = ax ? P(x - 0.3, y, z) : P(x, y - 0.3, z), d1 = ax ? P(x + 0.3, y, z) : P(x, y + 0.3, z);
    line(c, d0, d1, 'rgba(240,235,220,0.7)', 1.2);
    for (const s of [-1, 1]) {
      const a = ax ? P(x - 0.5, y + 0.45 * s, z) : P(x + 0.45 * s, y - 0.5, z), b = ax ? P(x + 0.5, y + 0.45 * s, z) : P(x + 0.45 * s, y + 0.5, z);
      line(c, [a[0], a[1] - 4], [b[0], b[1] - 4], '#5f574d', 1.4);
      for (let i = 0; i <= 4; i++) { const f = i / 4; line(c, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - 4], '#5f574d', 1); }
    }
  } else {
    const m = S.rail[t], ax = m === 10 ? 1 : 0;
    fillPoly(c, [P(x - 0.5, y - 0.5, z), P(x + 0.5, y - 0.5, z), P(x + 0.5, y + 0.5, z), P(x - 0.5, y + 0.5, z)], 'rgba(70,60,52,0.9)');
    c.save(); c.translate(0, -z); drawRail(c, S, t, x, y, 0); c.restore();
    // girder trusses
    for (const s of [-1, 1]) {
      const a = ax ? P(x - 0.5, y + 0.4 * s, z) : P(x + 0.4 * s, y - 0.5, z), b = ax ? P(x + 0.5, y + 0.4 * s, z) : P(x + 0.4 * s, y + 0.5, z);
      line(c, [a[0], a[1] - 9], [b[0], b[1] - 9], '#7d5c48', 1.6); line(c, a, b, '#7d5c48', 1.6);
      for (let i = 0; i < 4; i++) { const f0 = i / 4, f1 = (i + 1) / 4; line(c, [a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0], [a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1 - 9], '#7d5c48', 1); }
    }
  }
}
function drawWreck(c, S, w) {
  const age = S.tick - w.tick; if (age > 6 * TPH || age < 0) return;
  const x = w.t % S.W, y = (w.t / S.W) | 0, z = seaZ(S), f = age / (6 * TPH);
  c.globalAlpha = 1 - f;
  orientedBox(c, x + 0.1, y + 0.1, 0.5, 0.25, 0.7, z - 2, 3 * (1 - f), '#4a3a30');
  for (let i = 0; i < 4; i++) isoBox(c, x - 0.3 + i * 0.18 + Math.sin(RV.t + i) * 0.03, y + 0.2 - i * 0.08, 0.1, 0.1, z, 2, '#c4a066', { ink: false });
  c.globalAlpha = 1;
}

/* ---------------- residents (cosmetic) ---------------- */
function updateWalkers(S, dt) {
  const hr = (S.tick % TPD) / TPH;
  const pop = S.labour ? S.labour.pop : 0;
  let rate = hr < 5 ? 0.05 : hr < 7 ? 0.5 : hr < 9 ? 1 : hr < 16 ? 0.55 : hr < 19 ? 1 : hr < 22 ? 0.4 : 0.1;
  const target = Math.min(220, Math.floor(pop / 4 * rate * RV.walkDensity));
  const W = RV.walkers;
  if (W.length < target && Math.random() < 0.6) spawnWalker(S, hr);
  for (let i = W.length - 1; i >= 0; i--) {
    const w = W[i]; w.f += dt * w.v;
    while (w.f >= 1 && w.i < w.path.length - 1) { w.f -= 1; w.i++; }
    if (w.i >= w.path.length - 1 || (W.length > target + 10 && Math.random() < 0.02)) W.splice(i, 1);
  }
}
function spawnWalker(S, hr) {
  const houses = S.blds.filter(b => b.type === 'house' && b.res > 0); if (!houses.length) return;
  const h = houses[(Math.random() * houses.length) | 0];
  const goals = S.blds.filter(b => (hr > 9 && hr < 16 && Math.random() < 0.5) ? b.type === 'market' : (BT[b.type].jobs > 0 && b.wk > 0));
  if (!goals.length) return;
  const g = goals[(Math.random() * goals.length) | 0];
  const a = bAcc(S, h), z = bAcc(S, g); if (a < 0 || z < 0 || a === z) return;
  const homeward = hr > 15;
  let path = roadPath(S, homeward ? z : a, homeward ? a : z); if (!path || path.length < 2 || path.length > 40) return;
  path = [homeward ? z : a].concat(path);
  const side = Math.random() < 0.5 ? -1 : 1;
  RV.walkers.push({ path, i: 0, f: Math.random() * 0.5, v: 0.35 + Math.random() * 0.25, side, col: ['#2f3a45', '#7a3b2e', '#45603e', '#5a4a6e', '#8a6a3a', '#3b5866'][(Math.random() * 6) | 0] });
}
function walkerPos(S, w) {
  const a = w.path[w.i], b = w.path[Math.min(w.i + 1, w.path.length - 1)];
  const ax = a % S.W, ay = (a / S.W) | 0, bx = b % S.W, by = (b / S.W) | 0;
  const d = dirTo(S, a, b), r = d >= 0 ? RIGHT(d) : [0, 0];
  return { x: ax + (bx - ax) * w.f + r[0] * 0.4 * w.side, y: ay + (by - ay) * w.f + r[1] * 0.4 * w.side, phase: w.f * 8 };
}
function drawWalker(c, w, p) {
  const b = P(p.x, p.y, 0), leg = Math.sin(p.phase * Math.PI) * 1.2;
  line(c, [b[0] - 0.6, b[1]], [b[0] - 0.6 + leg * 0.4, b[1] - 2], '#2b2622', 0.8);
  line(c, [b[0] + 0.6, b[1]], [b[0] + 0.6 - leg * 0.4, b[1] - 2], '#2b2622', 0.8);
  c.fillStyle = w.col; c.fillRect(b[0] - 1.2, b[1] - 5.2, 2.4, 3.4);
  c.fillStyle = '#e8c9a8'; c.beginPath(); c.arc(b[0], b[1] - 6.3, 1.1, 0, Math.PI * 2); c.fill();
}

/* ---------------- particles ---------------- */
function updateParticles(S, dt, speed) {
  const wind = S.wx.k === W_STORM ? 2.2 : S.wx.k === W_RAIN ? 1.2 : 0.6;
  for (const [pos, k] of RV.smoke) {
    if (Math.random() < k * 0.35 * Math.min(1, dt * 30) * (RV.q >= 2 ? 1 : 0.5)) RV.parts.push({ x: pos[0], y: pos[1], vx: wind * 6 + Math.random() * 2, vy: -10 - Math.random() * 5, life: 0, max: 3 + Math.random() * 2 * k, r: 2 });
  }
  for (let i = RV.parts.length - 1; i >= 0; i--) { const p = RV.parts[i]; p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.99; p.r += dt * 3.5; if (p.life > p.max) RV.parts.splice(i, 1); }
  if (RV.parts.length > 600) RV.parts.splice(0, RV.parts.length - 600);
  void speed;
}
function drawParticles(c) {
  for (const p of RV.parts) { const a = 0.32 * (1 - p.life / p.max); c.fillStyle = 'rgba(228,224,216,' + a.toFixed(3) + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
}
function drawGulls(c, S, dt) {
  if (!RV.gulls.length) for (let i = 0; i < 7; i++) RV.gulls.push({ cx: 0, cy: 0, a: Math.random() * 6.28, r: 30 + Math.random() * 50, s: 0.3 + Math.random() * 0.3, z: 40 + Math.random() * 30, init: 0 });
  const q = S.blds.find(b => b.type === 'quay') || S.blds.find(b => b.type === 'lighthouse');
  if (!q) return;
  const base = P(q.x + 1, q.y + 1.5, 0);
  for (const g of RV.gulls) {
    g.a += dt * g.s; const x = base[0] + Math.cos(g.a) * g.r, y = base[1] - g.z + Math.sin(g.a) * g.r * 0.4;
    const flap = Math.sin(RV.t * 8 + g.r) * 2;
    c.strokeStyle = '#f3f1ea'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - 4, y - flap); c.quadraticCurveTo(x - 2, y - 2, x, y); c.quadraticCurveTo(x + 2, y - 2, x + 4, y - flap); c.stroke();
  }
}

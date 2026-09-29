import { SITES, ROUTES } from '../layout.js';

/**
 * Connects sites with A* over a coarse cost grid, smooths the paths and returns road segments.
 * Later routes are cheaper along existing ones so the network shares trunk roads naturally.
 */
export function buildHighways(terrain, access = {}) {
  const G = 200;
  const x0 = -17400, z0 = -13400;
  const nx = Math.ceil(34800 / G), nz = Math.ceil(26800 / G);
  const h = new Float32Array(nx * nz);
  const water = new Uint8Array(nx * nz);
  const o = { h: 0, m: 0, water: NaN };
  // one sample per 200 m is too sparse to be worth filling the cached terrain tiles, so the exact function is used here
  const macro = terrain.macro, macroWas = macro ? macro.enabled : true;
  if (macro) macro.enabled = false;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const s = terrain.sample(x0 + (i + 0.5) * G, z0 + (j + 0.5) * G, 12, o);
      const k = j * nx + i;
      h[k] = s;
      water[k] = o.water === o.water ? (o.hydro === 1 ? 2 : 1) : 0; // 1 blocked, 2 river crossable
    }
  }
  if (macro) macro.enabled = macroWas;
  const used = new Float32Array(nx * nz);
  const idx = (i, j) => j * nx + i;
  const cellOf = (x, z) => [Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / G))), Math.min(nz - 1, Math.max(0, Math.floor((z - z0) / G)))];

  function nearestLand(i, j) {
    for (let r = 0; r < 12; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        if (water[idx(a, b)] !== 1 && h[idx(a, b)] > 0.5) return [a, b];
      }
    }
    return [i, j];
  }

  function astar(si, sj, gi, gj) {
    const n = nx * nz;
    const g = new Float32Array(n).fill(Infinity);
    const from = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    // binary heap of [f, index]
    const heap = [];
    const push = (f, k) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { let l = c * 2 + 1, r = l + 1, m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const s = idx(si, sj), t = idx(gi, gj);
    g[s] = 0; push(0, s);
    while (heap.length) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === t) break;
      const ci = k % nx, cj = (k / nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = ci + di, b = cj + dj;
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const q = idx(a, b);
        if (closed[q]) continue;
        if (water[q] === 1) continue;
        const dist = Math.hypot(di, dj) * G;
        const dh = Math.abs(h[q] - h[k]);
        let cost = dist * (1 + (dh / dist) * 14 + Math.max(0, h[q] - 350) * 0.004);
        if (water[q] === 2) cost += 900;
        if (h[q] < 1.5) cost += 250;
        if (used[q] > 0) cost *= 0.3;
        const ng = g[k] + cost;
        if (ng < g[q]) { g[q] = ng; from[q] = k; push(ng + Math.hypot(gi - a, gj - b) * G * 0.9, q); }
      }
    }
    if (from[t] < 0 && s !== t) return null;
    const path = [];
    for (let k = t; k >= 0; k = from[k]) { path.push([x0 + ((k % nx) + 0.5) * G, z0 + (((k / nx) | 0) + 0.5) * G]); if (k === s) break; }
    return path.reverse();
  }

  function chaikin(p, n) {
    for (let it = 0; it < n; it++) {
      const out = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        out.push([p[i][0] * 0.75 + p[i + 1][0] * 0.25, p[i][1] * 0.75 + p[i + 1][1] * 0.25]);
        out.push([p[i][0] * 0.25 + p[i + 1][0] * 0.75, p[i][1] * 0.25 + p[i + 1][1] * 0.75]);
      }
      out.push(p[p.length - 1]);
      p = out;
    }
    return p;
  }

  const segs = [];
  const routes = [];
  // Routes that share a corridor share its vertices too. Two polylines that run side by side a few meters apart never merge into
  // one intersection in the drivable graph, so a later route snaps to the vertices of the earlier ones and adds only new pieces.
  const VG = 64, vgrid = new Map(), vertices = [];
  const vcell = (i, j) => (i + 4096) * 8192 + (j + 4096);
  const addVertex = (x, z) => {
    const v = [x, z]; v.id = vertices.length; vertices.push(v);
    const k = vcell(Math.floor(x / VG), Math.floor(z / VG));
    (vgrid.get(k) || vgrid.set(k, []).get(k)).push(v);
    return v;
  };
  const nearestVertex = (x, z, R) => {
    let best = null, bd = R * R;
    const ci = Math.floor(x / VG), cj = Math.floor(z / VG);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const list = vgrid.get(vcell(ci + di, cj + dj));
      if (!list) continue;
      for (const v of list) { const d = (v[0] - x) * (v[0] - x) + (v[1] - z) * (v[1] - z); if (d < bd) { bd = d; best = v; } }
    }
    return best;
  };
  const edgeSeen = new Set();
  for (const [a, b, kind] of ROUTES) {
    const sa = access[a] || [SITES[a].x, SITES[a].z], sb = access[b] || [SITES[b].x, SITES[b].z];
    let [si, sj] = cellOf(sa[0], sa[1]);
    let [gi, gj] = cellOf(sb[0], sb[1]);
    [si, sj] = nearestLand(si, sj); [gi, gj] = nearestLand(gi, gj);
    let path = astar(si, sj, gi, gj);
    if (!path || path.length < 2) continue;
    for (const [px, pz] of path) { const [i, j] = cellOf(px, pz); used[idx(i, j)] = 1; }
    path[0] = [sa[0], sa[1]]; path[path.length - 1] = [sb[0], sb[1]];
    path = chaikin(path, 3);
    // resample every ~60 m
    const raw = [path[0]];
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      acc += d;
      if (acc >= 60) { raw.push(path[i]); acc = 0; }
    }
    raw.push(path[path.length - 1]);
    const pts = [];
    for (let i = 0; i < raw.length; i++) {
      const end = i === 0 || i === raw.length - 1;
      let v = nearestVertex(raw[i][0], raw[i][1], end ? 1.5 : 46);
      if (!v) v = addVertex(raw[i][0], raw[i][1]);
      if (pts.length && pts[pts.length - 1] === v) continue;
      if (pts.length >= 2 && pts[pts.length - 2] === v) { pts.pop(); continue; }
      pts.push(v);
    }
    if (pts.length < 2) continue;
    let off = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      const ek = pts[i].id < pts[i + 1].id ? pts[i].id * 65536 + pts[i + 1].id : pts[i + 1].id * 65536 + pts[i].id;
      if (!edgeSeen.has(ek)) {
        edgeSeen.add(ek);
        segs.push({ ax: pts[i][0], az: pts[i][1], bx: pts[i + 1][0], bz: pts[i + 1][1], kind, off });
      }
      off += len;
    }
    routes.push({ a, b, kind, points: pts.map((p) => [p[0], p[1]]) });
  }
  return { segments: segs, routes };
}

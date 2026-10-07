/* Palimpsest / terrain
   Land is raised from blobs and noise, cut by mountain ranges, worn by rain,
   watered by wind off the sea, and drained by rivers that must find a way out. */
'use strict';
(function () {
  const P = window.P;
  const U = P.util;

  const BIOME = { SEA: 0, LAKE: 1, SNOW: 2, MOUNTAIN: 3, TUNDRA: 4, TAIGA: 5, FOREST: 6, JUNGLE: 7, GRASS: 8, STEPPE: 9, DESERT: 10, MARSH: 11, HILLS: 12 };
  const BIOME_NAME = ['sea', 'lake', 'snowfield', 'mountain', 'tundra', 'pine forest', 'forest', 'rainforest', 'grassland', 'steppe', 'desert', 'marsh', 'hills'];
  P.BIOME = BIOME;
  P.BIOME_NAME = BIOME_NAME;

  function makeBlobs(rng, arch, A) {
    const B = [];
    const blob = (x, y, rx, ry, rot, amp) => B.push({ x, y, rx, ry, rot, amp, c: Math.cos(rot), s: Math.sin(rot) });
    const r = (a, b) => rng.range(a, b);
    let landFrac = 0.4, openSide = null;
    switch (arch) {
      case 'continent': {
        const cx = A / 2 + r(-0.12, 0.12), cy = 0.5 + r(-0.07, 0.07);
        blob(cx, cy, r(0.42, 0.52), r(0.3, 0.37), r(-0.5, 0.5), 1);
        blob(cx + r(-0.25, 0.25), cy + r(-0.15, 0.15), r(0.18, 0.28), r(0.15, 0.22), r(0, 3), 0.6);
        const n = rng.int(2, 4);
        for (let i = 0; i < n; i++) {
          const a = r(0, Math.PI * 2), d = r(0.38, 0.55);
          blob(cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.75, r(0.06, 0.14), r(0.05, 0.11), r(0, 3), r(0.7, 1));
        }
        landFrac = 0.42;
        break;
      }
      case 'twin': {
        const d = r(-0.14, 0.14);
        blob(A * r(0.24, 0.32), 0.5 + d, r(0.26, 0.33), r(0.3, 0.38), r(-0.6, 0.6), 1);
        blob(A * r(0.68, 0.76), 0.5 - d, r(0.26, 0.33), r(0.3, 0.38), r(-0.6, 0.6), 1);
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) blob(r(0.35, A - 0.35), r(0.15, 0.85), r(0.05, 0.1), r(0.04, 0.09), r(0, 3), r(0.7, 1));
        landFrac = 0.38;
        break;
      }
      case 'archipelago': {
        const n = rng.int(7, 11);
        for (let i = 0; i < n; i++) blob(r(0.18, A - 0.18), r(0.17, 0.83), r(0.07, 0.17), r(0.06, 0.14), r(0, 3), r(0.8, 1.1));
        landFrac = 0.3;
        break;
      }
      case 'inland': {
        const cx = A / 2 + r(-0.08, 0.08), cy = 0.5 + r(-0.05, 0.05);
        blob(cx, cy, r(0.56, 0.64), r(0.38, 0.43), r(-0.3, 0.3), 1.15);
        blob(cx + r(-0.12, 0.12), cy + r(-0.06, 0.06), r(0.17, 0.26), r(0.1, 0.16), r(-0.8, 0.8), -1.45);
        landFrac = 0.46;
        break;
      }
      case 'coast': {
        openSide = rng.pick(['w', 'e', 'n', 's']);
        const n = rng.int(3, 5);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          let x, y;
          if (openSide === 'w') { x = r(0, 0.32); y = t; }
          else if (openSide === 'e') { x = A - r(0, 0.32); y = t; }
          else if (openSide === 'n') { x = t * A; y = r(0, 0.25); }
          else { x = t * A; y = 1 - r(0, 0.25); }
          blob(x, y, r(0.25, 0.38), r(0.22, 0.32), r(0, 3), r(0.85, 1.05));
        }
        const k = rng.int(1, 3);
        for (let i = 0; i < k; i++) blob(r(0.3, A - 0.3), r(0.25, 0.75), r(0.05, 0.1), r(0.04, 0.08), r(0, 3), r(0.6, 0.9));
        landFrac = 0.48;
        break;
      }
      default: { // peninsulas
        const cx = A / 2 + r(-0.1, 0.1), cy = 0.5 + r(-0.06, 0.06);
        blob(cx, cy, r(0.22, 0.3), r(0.2, 0.26), 0, 1);
        const n = rng.int(3, 5), a0 = r(0, Math.PI * 2);
        for (let i = 0; i < n; i++) {
          const a = a0 + (i / n) * Math.PI * 2 + r(-0.35, 0.35), d = r(0.22, 0.32);
          blob(cx + Math.cos(a) * d * 1.25, cy + Math.sin(a) * d * 0.85, r(0.24, 0.36), r(0.06, 0.1), a, r(0.85, 1));
        }
        landFrac = 0.37;
      }
    }
    return { blobs: B, landFrac, openSide };
  }

  function blobField(B, u, v) {
    let s = 0;
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      const dx = u - b.x, dy = v - b.y;
      const lx = (dx * b.c + dy * b.s) / b.rx, ly = (-dx * b.s + dy * b.c) / b.ry;
      s += b.amp * Math.exp(-(lx * lx + ly * ly) * 1.7);
    }
    return s;
  }

  function makeRanges(rng, B, A) {
    const ranges = [];
    const n = rng.int(2, 4);
    for (let k = 0; k < n; k++) {
      let sx = 0, sy = 0, ok = false;
      for (let t = 0; t < 60 && !ok; t++) {
        sx = rng.range(0.1, A - 0.1); sy = rng.range(0.1, 0.9);
        ok = blobField(B, sx, sy) > 0.55;
      }
      if (!ok) continue;
      const len = rng.range(0.25, 0.65), a = rng.range(0, Math.PI * 2), bend = rng.range(-0.9, 0.9);
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16 - 0.5;
        const ang = a + bend * t;
        pts.push(sx + Math.cos(ang) * len * t, sy + Math.sin(ang) * len * t);
      }
      ranges.push({ pts, w: rng.range(0.035, 0.07), amp: rng.range(0.32, 0.55) });
    }
    return ranges;
  }

  function distToPolyline(pts, u, v) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 2; i += 2) {
      const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
      const dx = bx - ax, dy = by - ay;
      const t = U.clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      const ex = ax + dx * t - u, ey = ay + dy * t - v;
      const d = ex * ex + ey * ey;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  /* droplet hydraulic erosion, after Hans Beyer and Sebastian Lague */
  function erode(h, W, H, rng, drops, sea) {
    const R = 2, bdx = [], bdy = [], bw = [];
    let ws = 0;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y);
      if (d <= R) { const w = 1 - d / R + 0.05; bdx.push(x); bdy.push(y); bw.push(w); ws += w; }
    }
    for (let i = 0; i < bw.length; i++) bw[i] /= ws;
    const inertia = 0.06, capF = 3.2, minCap = 0.002, dep = 0.25, ero = 0.28, evap = 0.018, grav = 6, maxSteps = 55;
    for (let k = 0; k < drops; k++) {
      let x = rng.range(2, W - 3), y = rng.range(2, H - 3);
      if (h[(y | 0) * W + (x | 0)] < sea) continue;
      let dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
      for (let step = 0; step < maxSteps; step++) {
        const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy, idx = iy * W + ix;
        const h00 = h[idx], h10 = h[idx + 1], h01 = h[idx + W], h11 = h[idx + W + 1];
        const gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;
        const gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;
        const hc = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
        dx = dx * inertia - gx * (1 - inertia);
        dy = dy * inertia - gy * (1 - inertia);
        const len = Math.hypot(dx, dy);
        if (len < 1e-10) break;
        dx /= len; dy /= len;
        const nx = x + dx, ny = y + dy;
        if (nx < 2 || nx >= W - 3 || ny < 2 || ny >= H - 3) break;
        const jx = nx | 0, jy = ny | 0, ax = nx - jx, ay = ny - jy, j = jy * W + jx;
        const hn = h[j] * (1 - ax) * (1 - ay) + h[j + 1] * ax * (1 - ay) + h[j + W] * (1 - ax) * ay + h[j + W + 1] * ax * ay;
        const dh = hn - hc;
        const cap = Math.max(-dh * speed * water * capF, minCap);
        if (sed > cap || dh > 0) {
          const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * dep;
          sed -= amt;
          h[idx] += amt * (1 - fx) * (1 - fy); h[idx + 1] += amt * fx * (1 - fy);
          h[idx + W] += amt * (1 - fx) * fy; h[idx + W + 1] += amt * fx * fy;
        } else {
          const amt = Math.min((cap - sed) * ero, -dh);
          for (let b = 0; b < bw.length; b++) {
            const tx = ix + bdx[b], ty = iy + bdy[b];
            if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
            h[ty * W + tx] -= amt * bw[b];
          }
          sed += amt;
        }
        speed = Math.sqrt(Math.max(0, speed * speed - dh * grav));
        water *= 1 - evap;
        x = nx; y = ny;
        if (hn < sea - 0.03) { // reaching the sea, it lets its burden fall: deltas
          const q = (ny | 0) * W + (nx | 0);
          h[q] += sed * 0.5;
          break;
        }
      }
    }
  }

  function components(mask, W, H, diag) {
    const lab = new Int32Array(W * H).fill(-1);
    const sizes = [];
    const stack = [];
    let id = 0;
    for (let i = 0; i < W * H; i++) {
      if (!mask[i] || lab[i] >= 0) continue;
      let n = 0;
      lab[i] = id; stack.push(i);
      while (stack.length) {
        const c = stack.pop(); n++;
        const x = c % W, y = (c / W) | 0;
        for (let k = 0; k < (diag ? 8 : 4); k++) {
          const nx = x + P.N8[k][0], ny = y + P.N8[k][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (mask[j] && lab[j] < 0) { lab[j] = id; stack.push(j); }
        }
      }
      sizes.push(n); id++;
    }
    return { lab, sizes };
  }

  function generate(world) {
    const rng = world.rng.fork('terrain');
    const W = world.W, H = world.H, N = W * H, A = W / H;
    const noise = new P.Noise(rng.fork('noise'));
    const T = (world.terrain = {});

    const arch = rng.weighted([['continent', 3], ['twin', 2], ['archipelago', 2], ['inland', 2], ['coast', 2], ['peninsulas', 2]]);
    const { blobs, landFrac, openSide } = makeBlobs(rng.fork('blobs'), arch, A);
    const ranges = makeRanges(rng.fork('ranges'), blobs, A);
    T.archetype = arch; T.openSide = openSide;

    /* 1. raw height */
    const h = new Float32Array(N);
    const warp = 0.2 + rng.range(0, 0.08);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / H, v = y / H;
        const wu = u + warp * noise.fbm(u * 1.7 + 3.1, v * 1.7 - 7.7, 4);
        const wv = v + warp * noise.fbm(u * 1.7 - 4.4, v * 1.7 + 2.2, 4);
        const b = blobField(blobs, wu, wv);
        // the blobs say where land is; they should not pile it into one dome
        let e = U.smooth(0.1, 0.8, b) * 0.5 + b * 0.12 - 0.32 + 0.3 * noise.fbm(wu * 3.4, wv * 3.4, 6, 2.0, 0.53);
        let m = 0;
        for (const rg of ranges) {
          const d = distToPolyline(rg.pts, wu, wv);
          if (d < rg.w * 3) m = Math.max(m, rg.amp * Math.exp(-(d / rg.w) * (d / rg.w)));
        }
        if (m > 0.001) e += m * (0.45 + 0.75 * noise.ridged(wu * 5.5, wv * 5.5, 5));
        e += 0.13 * noise.ridged(wu * 7 + 40, wv * 7, 4) * U.smooth(0.25, 0.9, b);
        // edges of the sheet belong to the sea, unless this map is a stretch of coast
        const de = {
          w: u, e: A - u, n: v, s: 1 - v,
        };
        let edge = 1e9;
        for (const k in de) if (k !== openSide) edge = Math.min(edge, de[k]);
        const fall = U.smooth(0.0, 0.16, edge);
        e = e * fall - (1 - fall) * 0.45;
        h[y * W + x] = e;
      }
    }

    /* 2. erosion, then kettles for lakes (after, so silt cannot fill them) */
    let sea = U.quantile(h, 1 - landFrac);
    erode(h, W, H, rng.fork('erosion'), Math.round(N * 1.1), sea);
    const hs = U.blur(h, W, H, 1, 1);
    for (let i = 0; i < N; i++) h[i] = h[i] * 0.6 + hs[i] * 0.4;
    sea = U.quantile(h, 1 - landFrac);
    {
      const kr = rng.fork('kettles');
      const want = kr.int(5, 11);
      let hi = -1e9;
      for (let i = 0; i < N; i++) if (h[i] > hi) hi = h[i];
      for (let t = 0, made = 0; t < 400 && made < want; t++) {
        const cx = kr.int(10, W - 11), cy = kr.int(10, H - 11);
        const hc = h[cy * W + cx];
        const rel = (hc - sea) / (hi - sea);
        if (rel < 0.05 || rel > 0.5) continue;
        const sl = Math.abs(h[cy * W + cx + 3] - h[cy * W + cx - 3]) + Math.abs(h[(cy + 3) * W + cx] - h[(cy - 3) * W + cx]);
        if (sl > 0.06 * (hi - sea)) continue;
        const r = kr.range(2.5, 5), depth = kr.range(0.05, 0.1) * (hi - sea);
        for (let y = cy - 9; y <= cy + 9; y++) for (let x = cx - 9; x <= cx + 9; x++) {
          const d = Math.hypot(x - cx, (y - cy) * kr.range(0.9, 1.1));
          h[y * W + x] -= depth * Math.exp(-(d / r) * (d / r));
        }
        made++;
      }
    }

    /* 3. normalise: 0 is the shoreline, 1 the highest summit, -1 the deepest trench */
    let hmax = -1e9, hmin = 1e9;
    for (let i = 0; i < N; i++) { if (h[i] > hmax) hmax = h[i]; if (h[i] < hmin) hmin = h[i]; }
    // land heights are remapped by rank, so lowlands are common and peaks are rare whatever the shape
    const elev = new Float32Array(N);
    const landIx = [];
    for (let i = 0; i < N; i++) {
      if (h[i] > sea) landIx.push(i);
      else elev[i] = -((sea - h[i]) / (sea - hmin));
    }
    landIx.sort((a, b) => h[a] - h[b]);
    const rugged = rng.range(0.85, 1.15);
    for (let k = 0; k < landIx.length; k++) {
      const r = (k + 1) / landIx.length;
      const lin = (h[landIx[k]] - sea) / (hmax - sea);
      const rankE = 0.28 * Math.pow(r, 1.6) + 0.72 * Math.pow(r, 11 / rugged);
      elev[landIx[k]] = Math.max(0.002, 0.8 * rankE + 0.2 * Math.pow(lin, 1.5));
    }
    // specks of land and puddles are tidied away
    {
      const land = new Uint8Array(N);
      for (let i = 0; i < N; i++) land[i] = elev[i] > 0 ? 1 : 0;
      const lc = components(land, W, H, false);
      for (let i = 0; i < N; i++) if (land[i] && lc.sizes[lc.lab[i]] < 5) elev[i] = -0.01;
      const wat = new Uint8Array(N);
      for (let i = 0; i < N; i++) wat[i] = elev[i] <= 0 ? 1 : 0;
      const wc = components(wat, W, H, false);
      for (let i = 0; i < N; i++) if (wat[i] && wc.sizes[wc.lab[i]] < 5) elev[i] = 0.004;
    }
    T.elev = elev;

    /* 4. which water is ocean, which is enclosed */
    const water = new Uint8Array(N);
    for (let i = 0; i < N; i++) water[i] = elev[i] <= 0 ? 1 : 0;
    const wc = components(water, W, H, false);
    const touchesEdge = new Uint8Array(wc.sizes.length);
    for (let x = 0; x < W; x++) { for (const y of [0, H - 1]) { const l = wc.lab[y * W + x]; if (l >= 0) touchesEdge[l] = 1; } }
    for (let y = 0; y < H; y++) { for (const x of [0, W - 1]) { const l = wc.lab[y * W + x]; if (l >= 0) touchesEdge[l] = 1; } }
    const ocean = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (water[i] && touchesEdge[wc.lab[i]]) ocean[i] = 1;
    T.water = water; T.ocean = ocean; T.waterLab = wc.lab; T.waterSizes = wc.sizes; T.waterEdge = touchesEdge;

    /* 5. climate */
    const latTop = rng.range(40, 58), latBot = latTop - rng.range(20, 30);
    T.latTop = latTop; T.latBot = latBot;
    T.lonLeft = rng.int(-40, 60); T.lonRight = T.lonLeft + Math.round((latTop - latBot) * A * 1.25);
    const temp = new Float32Array(N);
    for (let y = 0; y < H; y++) {
      const lat = latTop - (latTop - latBot) * (y / (H - 1));
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        temp[i] = 29 - 0.62 * (lat - 12) - 27 * Math.max(0, elev[i]) + 2.5 * noise.fbm(x * 0.03 + 100, y * 0.03, 3);
      }
    }
    T.temp = temp;

    const windA = rng.chance(0.7) ? rng.range(-0.6, 0.6) : rng.range(0, Math.PI * 2);
    const wcx = Math.cos(windA), wcy = Math.sin(windA);
    T.wind = windA;
    const order = new Uint32Array(N);
    const proj = new Float32Array(N);
    for (let i = 0; i < N; i++) { order[i] = i; proj[i] = (i % W) * wcx + ((i / W) | 0) * wcy; }
    order.sort((a, b) => proj[a] - proj[b]);
    const moist = new Float32Array(N), rain = new Float32Array(N);
    const sample = (arr, x, y) => {
      if (x < 0 || y < 0 || x > W - 1.001 || y > H - 1.001) return -1;
      const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy, i = iy * W + ix;
      return arr[i] * (1 - fx) * (1 - fy) + arr[i + 1] * fx * (1 - fy) + arr[i + W] * (1 - fx) * fy + arr[i + W + 1] * fx * fy;
    };
    for (let k = 0; k < N; k++) {
      const i = order[k], x = i % W, y = (i / W) | 0;
      let m = sample(moist, x - wcx, y - wcy);
      if (m < 0) m = 1;
      if (water[i]) { moist[i] = m + (1 - m) * 0.22; continue; }
      const eu = sample(elev, x - wcx, y - wcy);
      const up = Math.max(0, elev[i] - Math.max(0, eu));
      const warmth = U.clamp((temp[i] + 5) / 30, 0.25, 1.1);
      let r = m * (0.042 + up * 9) * warmth;
      if (r > m) r = m;
      rain[i] = r;
      moist[i] = m - r * 0.92 + 0.004;
    }
    let precip = U.blur(rain, W, H, 2, 2);
    const landVals = [];
    for (let i = 0; i < N; i++) if (!water[i]) landVals.push(precip[i]);
    const pHi = U.quantile(landVals, 0.93) || 1;
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0;
      precip[i] = water[i] ? 1 : U.clamp((precip[i] / pHi) * (0.85 + 0.3 * noise.fbm(x * 0.02 - 50, y * 0.02 + 50, 3)), 0, 1.2);
    }
    T.precip = precip;

    /* 6. hydrology: priority flood, lakes, flow, rivers.
       Water is routed over the land plus a faint undulation, so streams wander and find each other. */
    const route = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0;
      route[i] = elev[i] > 0 ? elev[i] + 0.013 * (noise.fbm(x * 0.075 + 300, y * 0.075 - 300, 3) + 0.6) : elev[i];
    }
    const filled = Float32Array.from(route);
    const closed = new Uint8Array(N);
    const heap = new P.Heap(N);
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i / W) | 0;
      if (water[i]) {
        closed[i] = 1;
        let shore = false;
        for (const d of P.N8) {
          const nx = x + d[0], ny = y + d[1];
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && !water[ny * W + nx]) { shore = true; break; }
        }
        if (shore) heap.push(0, i);
        filled[i] = 0;
      } else if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        closed[i] = 1; heap.push(route[i], i);
      }
    }
    while (heap.size) {
      const c = heap.pop();
      const x = c % W, y = (c / W) | 0, fc = filled[c];
      for (const d of P.N8) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (closed[j]) continue;
        closed[j] = 1;
        filled[j] = Math.max(route[j], fc + 1e-5);
        heap.push(filled[j], j);
      }
    }
    const lakeCand = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (!water[i] && filled[i] - route[i] > 0.006) lakeCand[i] = 1;
    const lc = components(lakeCand, W, H, false);
    const lake = new Int16Array(N).fill(-1);
    const lakes = [];
    {
      const map = new Map();
      for (let i = 0; i < N; i++) {
        if (!lakeCand[i]) continue;
        const l = lc.lab[i];
        if (lc.sizes[l] < 6) continue;
        if (!map.has(l)) { map.set(l, lakes.length); lakes.push({ id: lakes.length, cells: [], level: 0 }); }
        const L = lakes[map.get(l)];
        L.cells.push(i); lake[i] = L.id;
        if (filled[i] > L.level) L.level = filled[i];
      }
    }
    T.lake = lake; T.lakes = lakes; T.filled = filled;

    const down = new Int32Array(N).fill(-1);
    for (let i = 0; i < N; i++) {
      if (water[i]) continue;
      const x = i % W, y = (i / W) | 0;
      let best = -1, bj = -1, wj = -1;
      for (let k = 0; k < 8; k++) {
        const d = P.N8[k];
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (water[j]) { if (wj < 0 || d[2] === 1) wj = j; continue; }
        const drop = filled[i] - filled[j];
        if (drop <= 0) continue;
        const score = (drop / d[2]) * (0.55 + 0.9 * P.hash2(i, k, 77));
        if (score > best) { best = score; bj = j; }
      }
      down[i] = wj >= 0 ? wj : bj;
    }
    const landIdx = [];
    for (let i = 0; i < N; i++) if (!water[i]) landIdx.push(i);
    landIdx.sort((a, b) => filled[b] - filled[a]);
    const acc = new Float32Array(N), ulen = new Uint16Array(N);
    for (const i of landIdx) acc[i] += precip[i] + 0.03;
    for (const i of landIdx) {
      const d = down[i];
      if (d >= 0 && !water[d]) { acc[d] += acc[i]; if (ulen[i] + 1 > ulen[d]) ulen[d] = ulen[i] + 1; }
    }
    T.down = down; T.acc = acc;

    const accVals = landIdx.map((i) => acc[i]);
    const thr = Math.max(U.quantile(accVals, 0.972), 6);
    T.riverThreshold = thr;
    const isRiver = new Uint8Array(N);
    for (const i of landIdx) if (acc[i] >= thr && ulen[i] >= 10 && lake[i] < 0) isRiver[i] = 1;
    const ups = new Map();
    for (const i of landIdx) {
      if (!isRiver[i]) continue;
      const d = down[i];
      if (d >= 0 && isRiver[d]) { if (!ups.has(d)) ups.set(d, []); ups.get(d).push(i); }
    }
    const rivers = [];
    const riverOf = new Int16Array(N).fill(-1);
    const mouths = landIdx.filter((i) => isRiver[i] && (down[i] < 0 || !isRiver[down[i]]));
    mouths.sort((a, b) => acc[b] - acc[a]);
    const queue = mouths.map((m) => ({ start: m, end: down[m], parent: -1 }));
    while (queue.length) {
      const job = queue.shift();
      const cells = [job.start];
      let c = job.start;
      for (;;) {
        const u = ups.get(c);
        if (!u || !u.length) break;
        u.sort((a, b) => acc[b] - acc[a]);
        for (let k = 1; k < u.length; k++) queue.push({ start: u[k], end: c, parent: rivers.length });
        c = u[0]; cells.push(c);
      }
      cells.reverse();
      const end = job.end;
      let endType = 'edge';
      if (end >= 0) endType = water[end] ? 'sea' : lake[end] >= 0 ? 'lake' : 'river';
      const rv = { id: rivers.length, cells, end, endType, parent: job.parent, flow: acc[job.start], length: cells.length };
      for (const cc of cells) riverOf[cc] = rv.id;
      rivers.push(rv);
    }
    // main stems carry the length of everything upstream along them
    T.rivers = rivers; T.riverOf = riverOf; T.isRiver = isRiver;

    /* 7. distances and slope */
    const landMask = new Uint8Array(N), waterMask = new Uint8Array(N);
    for (let i = 0; i < N; i++) { landMask[i] = water[i] ? 0 : 1; waterMask[i] = water[i] || lake[i] >= 0 ? 1 : 0; }
    T.seaDist = U.edt(landMask, W, H);
    T.landDist = U.edt(waterMask, W, H);
    const slope = new Float32Array(N);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      slope[i] = Math.hypot(elev[i + 1] - elev[i - 1], elev[i + W] - elev[i - W]) * 0.5;
    }
    T.slope = slope;

    /* 8. biomes */
    const biome = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (water[i]) { biome[i] = BIOME.SEA; continue; }
      if (lake[i] >= 0) { biome[i] = BIOME.LAKE; continue; }
      const e = elev[i], t = temp[i], p = precip[i];
      let b;
      if (t < -7 || (e > 0.6 && t < 0)) b = BIOME.SNOW;
      else if (e > 0.5) b = BIOME.MOUNTAIN;
      else if (t < -1.5) b = BIOME.TUNDRA;
      else if (p < 0.14) b = t > 12 ? BIOME.DESERT : BIOME.STEPPE;
      else if (p < 0.27) b = t > 14 && p < 0.21 ? BIOME.STEPPE : BIOME.GRASS;
      else if (p > 0.5 && slope[i] < 0.005 && e < 0.07 && (T.landDist[i] < 4 || acc[i] > thr * 0.6)) b = BIOME.MARSH;
      else if (t < 4.5) b = BIOME.TAIGA;
      else if (t > 21 && p > 0.62) b = BIOME.JUNGLE;
      else if (e > 0.3) b = p > 0.55 ? BIOME.FOREST : BIOME.HILLS;
      else b = p > 0.44 ? BIOME.FOREST : BIOME.GRASS;
      biome[i] = b;
    }
    T.biome = biome;

    /* 9. how good a place is to live */
    const FERT = [0, 0, 0, 0.04, 0.08, 0.32, 0.72, 0.55, 1, 0.55, 0.12, 0.3, 0.5];
    const suit = new Float32Array(N);
    const coastal = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (water[i] || lake[i] >= 0) continue;
      const x = i % W, y = (i / W) | 0;
      let nearSea = false, nearLake = false;
      for (const d of P.N8) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (water[j]) nearSea = true; else if (lake[j] >= 0) nearLake = true;
      }
      coastal[i] = nearSea ? 1 : 0;
      let s = FERT[biome[i]] * (1 - U.clamp(slope[i] * 30, 0, 0.7));
      s += 0.55 * U.clamp(acc[i] / (thr * 2.5), 0, 1);
      if (nearSea) s += 0.35;
      if (nearLake) s += 0.25;
      const t = temp[i];
      if (t < 2 || t > 26) s *= 0.55;
      suit[i] = s;
    }
    T.suit = suit; T.coastal = coastal;

    /* 10. named features */
    T.features = findFeatures(world, rng.fork('features'));
  }

  function pca(cells, W) {
    let mx = 0, my = 0;
    for (const c of cells) { mx += c % W; my += (c / W) | 0; }
    mx /= cells.length; my /= cells.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const c of cells) {
      const dx = (c % W) - mx, dy = ((c / W) | 0) - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    let lo = 1e9, hi = -1e9, wlo = 1e9, whi = -1e9;
    for (const c of cells) {
      const dx = (c % W) - mx, dy = ((c / W) | 0) - my;
      const t = dx * ca + dy * sa, s = -dx * sa + dy * ca;
      if (t < lo) lo = t; if (t > hi) hi = t;
      if (s < wlo) wlo = s; if (s > whi) whi = s;
    }
    return { x: mx, y: my, angle: ang, length: hi - lo, width: whi - wlo };
  }

  function findFeatures(world, rng) {
    const T = world.terrain, W = world.W, H = world.H, N = W * H;
    const F = { seas: [], ranges: [], lakes: [], rivers: [], woods: [], wastes: [], fens: [], peaks: [] };

    /* seas: open ocean split into basins by k-means; enclosed water becomes inland seas or lakes */
    const open = [];
    for (let i = 0; i < N; i++) if (T.ocean[i] && T.seaDist[i] >= 3) open.push(i);
    const k = U.clamp(Math.round(open.length / 9000), 1, 4);
    if (open.length) {
      const cent = [];
      for (let c = 0; c < k; c++) { const i = open[Math.floor((c + 0.5) / k * open.length)]; cent.push([i % W, (i / W) | 0]); }
      rng.shuffle(cent);
      const asg = new Int8Array(open.length);
      for (let it = 0; it < 10; it++) {
        const sx = new Float64Array(k), sy = new Float64Array(k), sn = new Float64Array(k);
        for (let q = 0; q < open.length; q++) {
          const x = open[q] % W, y = (open[q] / W) | 0;
          let best = 1e18, bc = 0;
          for (let c = 0; c < k; c++) { const d = (x - cent[c][0]) ** 2 + (y - cent[c][1]) ** 2; if (d < best) { best = d; bc = c; } }
          asg[q] = bc; sx[bc] += x; sy[bc] += y; sn[bc]++;
        }
        for (let c = 0; c < k; c++) if (sn[c]) cent[c] = [sx[c] / sn[c], sy[c] / sn[c]];
      }
      for (let c = 0; c < k; c++) {
        let best = -1, bi = -1, n = 0;
        for (let q = 0; q < open.length; q++) {
          if (asg[q] !== c) continue;
          n++;
          const i = open[q], x = i % W, y = (i / W) | 0;
          const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
          const score = Math.min(T.seaDist[i], 14) + Math.min(edge, 22) * 0.6;
          if (score > best) { best = score; bi = i; }
        }
        if (bi >= 0 && n > 300) F.seas.push({ kind: 'sea', x: bi % W, y: (bi / W) | 0, size: n, open: T.seaDist[bi] });
      }
    }
    for (let l = 0; l < T.waterSizes.length; l++) {
      if (T.waterEdge[l]) continue;
      const size = T.waterSizes[l];
      if (size < 25) continue;
      let best = -1, bi = -1, sx = 0, sy = 0;
      for (let i = 0; i < N; i++) if (T.waterLab[i] === l) {
        sx += i % W; sy += (i / W) | 0;
        if (T.seaDist[i] > best) { best = T.seaDist[i]; bi = i; }
      }
      const f = { kind: size >= 160 ? 'inland' : 'lake', x: bi % W, y: (bi / W) | 0, size, open: best, salt: true };
      if (f.kind === 'inland') F.seas.push(f); else F.lakes.push(f);
    }
    for (const L of T.lakes) {
      if (L.cells.length < 10) continue;
      let sx = 0, sy = 0;
      for (const c of L.cells) { sx += c % W; sy += (c / W) | 0; }
      F.lakes.push({ kind: 'lake', x: sx / L.cells.length, y: sy / L.cells.length, size: L.cells.length, lakeId: L.id });
    }

    /* mountain ranges */
    const mm = new Uint8Array(N);
    for (let i = 0; i < N; i++) mm[i] = T.elev[i] > 0.4 && !T.water[i] ? 1 : 0;
    const mc = components(mm, W, H, true);
    const groups = new Map();
    for (let i = 0; i < N; i++) if (mm[i] && mc.sizes[mc.lab[i]] >= 30) {
      const l = mc.lab[i];
      if (!groups.has(l)) groups.set(l, []);
      groups.get(l).push(i);
    }
    for (const cells of groups.values()) {
      const p = pca(cells, W);
      let peak = cells[0];
      for (const c of cells) if (T.elev[c] > T.elev[peak]) peak = c;
      F.ranges.push({ kind: 'range', x: p.x, y: p.y, angle: p.angle, length: p.length, size: cells.length, peak });
    }
    F.ranges.sort((a, b) => b.size - a.size);
    F.ranges.length = Math.min(F.ranges.length, 5);
    let top = 0;
    for (let i = 0; i < N; i++) if (T.elev[i] > T.elev[top]) top = i;
    F.peaks.push({ kind: 'peak', x: top % W, y: (top / W) | 0, cell: top });

    /* rivers worth a name: long and full */
    const cand = T.rivers.filter((r) => r.cells.length >= 16).sort((a, b) => b.flow * Math.sqrt(b.cells.length) - a.flow * Math.sqrt(a.cells.length));
    for (const r of cand.slice(0, 9)) F.rivers.push({ kind: 'river', river: r.id, size: r.cells.length, x: r.cells[r.cells.length >> 1] % W, y: (r.cells[r.cells.length >> 1] / W) | 0 });

    /* woods, wastes and fens */
    const regions = (pred, min, kind, out, max) => {
      const m = new Uint8Array(N);
      for (let i = 0; i < N; i++) m[i] = pred(T.biome[i]) ? 1 : 0;
      const c = components(m, W, H, true);
      const g = new Map();
      for (let i = 0; i < N; i++) if (m[i] && c.sizes[c.lab[i]] >= min) {
        const l = c.lab[i];
        if (!g.has(l)) g.set(l, []);
        g.get(l).push(i);
      }
      const list = [];
      for (const cells of g.values()) { const p = pca(cells, W); list.push({ kind, x: p.x, y: p.y, angle: p.angle, length: p.length, size: cells.length }); }
      list.sort((a, b) => b.size - a.size);
      for (const f of list.slice(0, max)) out.push(f);
    };
    const B = BIOME;
    regions((b) => b === B.FOREST || b === B.TAIGA || b === B.JUNGLE, 160, 'wood', F.woods, 3);
    regions((b) => b === B.DESERT, 140, 'waste', F.wastes, 2);
    regions((b) => b === B.MARSH, 40, 'fen', F.fens, 2);
    return F;
  }

  P.Terrain = { generate, components };
})();

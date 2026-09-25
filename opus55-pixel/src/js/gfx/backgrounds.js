// ---------------------------------------------------------------------------
// Parallax backgrounds in an ink-wash (shan shui) spirit: dithered skies,
// karst peaks whose tops are dark ink and whose feet dissolve into mist,
// bamboo seas, a dusk river town and a blood-moon fortress. Each layer is a
// tileable strip generated once per chapter.
// ---------------------------------------------------------------------------
const LW = 1024;

function inkRidge(P, rng, o) {
  // o: { base, peaks:[n, hMin, hMax, wMin, wMax], ink, mist, fade, streaks, pines, sharp }
  const H = new Float32Array(LW);
  const [n, h0, h1, w0, w1] = o.peaks;
  for (let k = 0; k < n; k++) {
    const px = rng.r(LW), ph = rng.r(h0, h1), pw = rng.r(w0, w1), sh = o.sharp || 4;
    for (let x = 0; x < LW; x++) {
      let dx = x - px;
      if (dx > LW / 2) dx -= LW; if (dx < -LW / 2) dx += LW;
      const u = Math.abs(dx) / pw;
      if (u >= 1) continue;
      const v = ph * Math.pow(1 - Math.pow(u, sh), 0.45) * (1 + 0.04 * Math.sin(x * 0.2 + k));
      if (v > H[x]) H[x] = v;
    }
  }
  for (let x = 0; x < LW; x++) H[x] += (pfbm(x / 16, LW / 16, 3, o.seed || 1) - 0.5) * (o.rough || 6);
  const ink = o.ink, mist = o.mist;
  for (let x = 0; x < LW; x++) {
    const top = Math.round(o.base - H[x]);
    const slope = H[(x + 1) % LW] - H[(x + LW - 1) % LW];
    const streak = pnoise(x / 3, LW / 3, o.seed * 7 || 7);
    for (let y = Math.max(0, top); y < P.h; y++) {
      const t = (y - top) / o.fade;
      let c;
      if (y === top) c = mix(ink[0], ink[1], 0.5);
      else {
        let k = t + (streak - 0.5) * 0.35 + (slope > 0.4 ? 0.12 : slope < -0.4 ? -0.1 : 0);
        k += (bayer(x, y) - 0.5) * 0.22;
        const stops = [ink[0], ink[1], ink[2] || ink[1], mist];
        c = ramp(stops, clamp(k, 0, 1));
      }
      P.u[y * P.w + x] = col(c);
    }
  }
  if (o.pines) for (let i = 0; i < o.pines; i++) {
    const x = rng.i(0, LW - 1), top = Math.round(o.base - H[x]);
    tinyPine(P, x, top + 1, rng.r(0.6, 1.2) * (o.pineScale || 1), o.pineColor || ink[0]);
  }
  return H;
}

function tinyPine(P, x, y, s, c) {
  const h = Math.round(7 * s);
  for (let j = 0; j < h; j++) P.px(x, y - j, c);
  for (let k = 0; k < 3; k++) {
    const yy = y - h + 1 + k * Math.max(1, Math.round(2 * s)), w = Math.round((2 + k * 1.4) * s);
    for (let i = -w; i <= w; i++) P.px(x + i + (k === 0 ? 1 : 0), yy, c);
  }
}

// detailed pine with layered needle pads, trunk and highlights
function pineTree(P, x, y, s, pal, rng) {
  const h = Math.round(46 * s);
  let tx = x;
  for (let j = 0; j < h; j++) {
    tx += Math.round(Math.sin(j * 0.18 + x) * 0.6);
    const w = Math.max(1, Math.round((3 - j / h * 2) * s));
    for (let i = -w; i <= w; i++) P.px(tx + i, y - j, i === w ? pal.trunk[0] : i === -w ? pal.trunk[2] : pal.trunk[1]);
  }
  const pads = 4 + Math.round(s * 2);
  for (let k = 0; k < pads; k++) {
    const py = y - h * (0.35 + (k / pads) * 0.68);
    const side = k % 2 ? 1 : -1;
    const px = x + side * rng.r(4, 14) * s * (1 - k / pads * 0.5);
    const rx = rng.r(8, 15) * s * (1 - k / pads * 0.45), ry = rx * 0.32;
    // branch
    P.thick(x, py + 2, px, py + 1, Math.max(1, s * 1.5), pal.trunk[0]);
    P.ellipse(px, py, rx, ry, (xx, yy, d, dx, dy) => {
      const edge = hash2(xx, yy, 5) > 0.55 && d > 0.7;
      if (edge && ((xx + yy) & 1)) return null;
      return dy < -0.35 ? pal.leaf[3] : dy < 0.2 ? (hash2(xx, yy, 2) > 0.8 ? pal.leaf[3] : pal.leaf[2]) : dy < 0.6 ? pal.leaf[1] : pal.leaf[0];
    });
  }
}

function mistBand(P, y, h, color, seed, alphaMax = 1) {
  const v = col(color) & 0x00ffffff;
  for (let x = 0; x < P.w; x++) {
    const top = y + (pfbm(x / 40, P.w / 40, 3, seed) - 0.5) * h * 0.9;
    for (let yy = Math.max(0, Math.floor(top)); yy < Math.min(P.h, y + h * 1.2); yy++) {
      const t = clamp((yy - top) / (h * 0.5), 0, 1) * alphaMax;
      if (t > bayer(x, yy) * 0.98) P.u[yy * P.w + x] = (v | 0xff000000) >>> 0;
    }
  }
}

function bambooStalks(P, rng, o) {
  // o: { n, base, top, w:[a,b], pal:[dark, mid, light], leaf, leafy }
  for (let k = 0; k < o.n; k++) {
    const x0 = rng.r(LW), w = Math.round(rng.r(o.w[0], o.w[1])), lean = rng.r(-0.06, 0.06);
    const seg = rng.i(14, 22);
    for (let y = o.top; y < o.base; y++) {
      const x = Math.round(x0 + (o.base - y) * lean);
      const node = (y + k * 7) % seg === 0;
      for (let i = 0; i < w; i++) {
        let c = i === 0 ? o.pal[2] : i === w - 1 ? o.pal[0] : o.pal[1];
        if (node) c = o.pal[0];
        const xx = ((x + i) % LW + LW) % LW;
        P.px(xx, y, c);
      }
      if (node && o.twigs && rng.ch(0.3)) {
        const dir = rng.ch(0.5) ? 1 : -1, L = rng.i(4, 10);
        for (let j = 0; j < L; j++) P.px(((x + (dir > 0 ? w : -1) + dir * j) % LW + LW) % LW, y - Math.floor(j / 2), o.pal[0]);
      }
    }
    if (o.leafy) {
      const clusters = rng.i(2, 5);
      for (let c = 0; c < clusters; c++) {
        const cy = rng.r(o.top, o.top + (o.base - o.top) * 0.55), cx = x0 + (o.base - cy) * lean + rng.r(-10, 10);
        const nl = rng.i(5, 10);
        for (let l = 0; l < nl; l++) {
          const a = rng.r(-0.9, 0.9) + (rng.ch(0.5) ? 0 : Math.PI), L = rng.r(5, 10);
          for (let j = 0; j < L; j++) {
            const xx = Math.round(cx + Math.cos(a) * j), yy = Math.round(cy + Math.sin(a) * j * 0.5 + j * 0.3);
            P.px(((xx % LW) + LW) % LW, yy, j > L * 0.7 ? o.leaf[0] : o.leaf[j % 3 === 0 ? 2 : 1]);
          }
        }
      }
    }
  }
}

function roofShape(P, x, y, w, h, c0, c1, c2, eave = 4) {
  // curved roof with upturned eaves: x,y = left of ridge line
  for (let j = 0; j < h; j++) {
    const t = j / h;
    const spread = eave * Math.pow(t, 2.2);
    const xa = Math.round(x - spread - t * 3), xb = Math.round(x + w + spread + t * 3);
    const yy = y + j;
    for (let xx = xa; xx <= xb; xx++) P.px(((xx % LW) + LW) % LW, yy - (j === h - 1 && (xx === xa || xx === xb) ? 1 : 0), j === 0 ? c2 : (xx - xa) % 3 === 0 ? c0 : c1);
  }
  // upturned tips
  P.px(((x - eave - 4) % LW + LW) % LW, y + h - 2, c1);
  P.px(((x + w + eave + 4) % LW + LW) % LW, y + h - 2, c1);
}

function templeSilhouettes(P, rng, o) {
  for (let k = 0; k < o.n; k++) {
    const x = Math.round(rng.r(LW)), w = rng.i(30, 70), wallH = rng.i(10, 18), base = o.base - rng.i(0, 16);
    const roofH = Math.round(w * 0.22);
    for (let j = 0; j < wallH; j++) for (let i = 0; i < w; i++) {
      const col_ = i % 9 < 2 ? o.pillar : o.wall;
      P.px(((x + i) % LW + LW) % LW, base - j, col_);
    }
    roofShape(P, x, base - wallH - roofH, w, roofH, o.roof[0], o.roof[1], o.roof[2], 5);
    if (rng.ch(0.4)) roofShape(P, x + w * 0.2, base - wallH - roofH * 2 - 3, w * 0.6, roofH * 0.8, o.roof[0], o.roof[1], o.roof[2], 3);
  }
}

function pagoda(P, x, base, tiers, s, pal) {
  let y = base, w = 22 * s;
  for (let t = 0; t < tiers; t++) {
    const bh = Math.round(7 * s), rh = Math.round(4 * s);
    for (let j = 0; j < bh; j++) for (let i = 0; i < w; i++) P.px(Math.round(x - w / 2 + i), y - j, i % 5 === 0 ? pal[0] : pal[1]);
    y -= bh;
    roofShape(P, Math.round(x - w / 2), y - rh, w, rh, pal[0], pal[0], pal[1], 3);
    y -= rh;
    w *= 0.84;
  }
  for (let j = 0; j < 8 * s; j++) P.px(Math.round(x), y - j, pal[0]);
}

function townSkyline(P, rng, o) {
  let x = 0;
  while (x < LW) {
    const w = rng.i(o.w[0], o.w[1]), h = rng.i(o.h[0], o.h[1]);
    const base = o.base;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = o.wall;
      if (o.win && j > 3 && j < h - 3 && (i % 8 === 3 || i % 8 === 4) && (j % 9 === 5 || j % 9 === 6) && hash2(x + i >> 3, j >> 3, 9) > 0.35) c = o.win;
      P.px((x + i) % LW, base - j, c);
    }
    const rh = Math.round(w * 0.18) + 2;
    roofShape(P, x + 2, base - h - rh, w - 4, rh, o.roof[0], o.roof[1], o.roof[2], 4);
    x += w + rng.i(o.gap[0], o.gap[1]);
  }
}

function cliffs(P, rng, o) {
  const H = new Float32Array(LW);
  for (let x = 0; x < LW; x++) {
    const n = pfbm(x / 30, LW / 30, 4, o.seed);
    const spike = Math.pow(Math.abs(Math.sin(x * 0.045 + n * 5)), 6) * o.spike;
    H[x] = o.h * n + spike;
  }
  for (let x = 0; x < LW; x++) {
    const top = Math.round(o.base - H[x]);
    for (let y = Math.max(0, top); y < P.h; y++) {
      let c = o.pal[1];
      if (y - top < 2) c = o.pal[2];
      else if (hash2(x, y >> 2, o.seed) > 0.92) c = o.pal[0];
      else if ((y - top) > o.fade && bayer(x, y) < clamp((y - top - o.fade) / 40, 0, 1)) c = o.pal[3] || o.pal[1];
      P.u[y * P.w + x] = col(c);
    }
  }
  return H;
}

function fortressSil(P, x, base, pal, win) {
  const towers = [[0, 60, 22], [30, 44, 50], [86, 70, 24], [116, 40, 40], [160, 56, 20]];
  for (const [ox, h, w] of towers) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c = pal[0];
      if (j > 6 && (i % 7 === 3) && (j % 12 === 4 || j % 12 === 5)) c = win;
      P.px((x + ox + i) % LW, base - j, c);
    }
    for (let i = 0; i < w; i += 4) { P.px((x + ox + i) % LW, base - h - 1, pal[0]); P.px((x + ox + i + 1) % LW, base - h - 1, pal[0]); P.px((x + ox + i) % LW, base - h - 2, pal[0]); P.px((x + ox + i + 1) % LW, base - h - 2, pal[0]); }
    roofShape(P, x + ox + 2, base - h - 8, w - 4, 6, pal[0], pal[0], pal[1], 3);
    // banner pole
    for (let j = 0; j < 14; j++) P.px((x + ox + (w >> 1)) % LW, base - h - 8 - j, pal[0]);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) P.px((x + ox + (w >> 1) + 1 + i) % LW, base - h - 20 + j + (i > 2 ? 1 : 0), '#6a120c');
  }
}

// ---------------------------------------------------------------------------
const BG_THEMES = {
  peak: {
    sky: ['#b0826f', '#cc9d84', '#e3bd98', '#f0d6ad', '#f8e8c8'],
    sun: { x: 330, y: 150, r: 30, core: '#fff7e0', halo: '#fbe6bf' },
    layers: [
      { f: 0.04, y: 60, h: 200, gen(P, R) { inkRidge(P, R, { base: 190, peaks: [11, 40, 120, 18, 40], ink: ['#8a7a6e', '#a39282', '#bca893'], mist: '#ecd9ba', fade: 70, seed: 3, pines: 40, pineColor: '#7a6a60', sharp: 5 }); } },
      { f: 0.1, y: 80, h: 200, gen(P, R) {
        inkRidge(P, R, { base: 200, peaks: [9, 60, 140, 20, 44], ink: ['#5e5248', '#7b6d60', '#9a8a78'], mist: '#e2cdab', fade: 80, seed: 5, pines: 60, pineColor: '#4a4038', sharp: 6 });
        pagoda(P, 610, 88, 5, 0.8, ['#4a4038', '#5e5248']);
        mistBand(P, 150, 50, '#efe0c4', 7);
      } },
      { f: 0.2, y: 120, h: 160, gen(P, R) {
        inkRidge(P, R, { base: 140, peaks: [14, 20, 70, 40, 90], ink: ['#46473a', '#5d5f4c', '#7b7a62'], mist: '#d9c8a4', fade: 70, seed: 9, pines: 50, pineColor: '#2f3326', pineScale: 1.4, sharp: 2 });
        templeSilhouettes(P, R, { n: 5, base: 120, wall: '#6e5444', pillar: '#5a2a20', roof: ['#2b3430', '#3a4640', '#56625a'] });
        mistBand(P, 118, 40, '#e8d8b8', 11);
      } },
      { f: 0.42, y: 150, h: 130, gen(P, R) {
        const pal = { trunk: ['#2a2018', '#3e3024', '#5a4636'], leaf: ['#223020', '#2e4028', '#3e5534', '#58704a'] };
        inkRidge(P, R, { base: 104, peaks: [10, 16, 40, 60, 120], ink: ['#2e3626', '#3c4632', '#56604a'], mist: '#c9b996', fade: 60, seed: 13, sharp: 2, rough: 3 });
        for (let i = 0; i < 9; i++) pineTree(P, R.r(LW), R.r(70, 96), R.r(0.6, 1), pal, R);
      } },
    ],
    haze: '#f3e4c6',
  },
  bamboo: {
    sky: ['#8c9f7a', '#a7b892', '#c3cfa8', '#d9e0be', '#e8ecd2'],
    layers: [
      { f: 0.06, y: 20, h: 250, gen(P, R) { bambooStalks(P, R, { n: 70, base: 250, top: 0, w: [2, 3], pal: ['#9fae8c', '#b0bf9c', '#c0cdaa'], leafy: true, leaf: ['#98a886', '#a8b894', '#b8c6a2'] }); mistBand(P, 170, 70, '#d9e0be', 3); } },
      { f: 0.16, y: 10, h: 260, gen(P, R) { bambooStalks(P, R, { n: 45, base: 260, top: 0, w: [3, 5], pal: ['#6b8058', '#7f9668', '#96ac7c'], leafy: true, twigs: true, leaf: ['#5f7a4c', '#6f8a58', '#86a068'] }); mistBand(P, 200, 60, '#cfd8b2', 5); } },
      { f: 0.32, y: 0, h: 270, gen(P, R) { bambooStalks(P, R, { n: 26, base: 270, top: 0, w: [5, 8], pal: ['#3a5230', '#4d6a3c', '#6a884e'], leafy: true, twigs: true, leaf: ['#2e4424', '#3e5a30', '#557640'] }); } },
    ],
    haze: '#dfe6c4', shafts: '#fff6c8',
  },
  town: {
    sky: ['#8a2e26', '#b44a2c', '#d8703a', '#eea052', '#f6c872', '#f9dc9a'],
    sun: { x: 150, y: 176, r: 34, core: '#ffe9b0', halo: '#f8c46a' },
    layers: [
      { f: 0.04, y: 60, h: 210, gen(P, R) {
        for (let i = 0; i < 16; i++) { const y = R.r(10, 90), x = R.r(LW), w = R.r(60, 200); for (let xx = 0; xx < w; xx++) for (let t = 0; t < 2; t++) P.px((Math.round(x + xx) % LW), Math.round(y + t + Math.sin(xx * 0.05) * 2), t ? '#c8583a' : '#f0a060'); }
        inkRidge(P, R, { base: 200, peaks: [8, 30, 80, 40, 90], ink: ['#8a3a2c', '#a24a34', '#b85a3a'], mist: '#e89a58', fade: 60, seed: 21, sharp: 3 });
      } },
      { f: 0.12, y: 110, h: 160, gen(P, R) {
        townSkyline(P, R, { base: 120, w: [28, 60], h: [14, 34], gap: [2, 10], wall: '#6a2a22', roof: ['#4a1a16', '#5a2019', '#7a3226'] });
        pagoda(P, 300, 100, 7, 1, ['#4a1a16', '#5a2019']);
        pagoda(P, 820, 104, 5, 0.8, ['#4a1a16', '#5a2019']);
      } },
      { f: 0.3, y: 140, h: 130, gen(P, R) {
        townSkyline(P, R, { base: 110, w: [34, 70], h: [22, 46], gap: [0, 6], wall: '#3e1a17', roof: ['#261010', '#321412', '#4a1e18'], win: '#f6b34a' });
      } },
    ],
    haze: '#f2b46a',
  },
  fort: {
    sky: ['#070404', '#0e0606', '#1a0909', '#2c0d0b', '#46140e', '#5e1c10'],
    moon: { x: 340, y: 78, r: 40 },
    layers: [
      { f: 0.05, y: 90, h: 180, gen(P, R) { cliffs(P, R, { base: 170, h: 70, spike: 50, seed: 3, fade: 50, pal: ['#1a0c0c', '#241010', '#3a1612', '#2e1412'] }); } },
      { f: 0.13, y: 100, h: 170, gen(P, R) { cliffs(P, R, { base: 160, h: 60, spike: 70, seed: 7, fade: 60, pal: ['#0e0707', '#150a0a', '#2a0f0d', '#1c0d0c'] }); fortressSil(P, 380, 118, ['#0b0505', '#1a0a09'], '#ff6a2a'); } },
      { f: 0.3, y: 150, h: 120, gen(P, R) { cliffs(P, R, { base: 110, h: 40, spike: 40, seed: 11, fade: 90, pal: ['#060303', '#0a0505', '#1e0b09', '#0c0606'] }); } },
    ],
    haze: '#3a1210',
  },
};
// the prologue re-uses the peak at night, burning
BG_THEMES.burning = {
  sky: ['#0c0505', '#1c0907', '#3a100a', '#6a200e', '#a8421a', '#d8702a'],
  layers: [
    { f: 0.04, y: 60, h: 200, gen(P, R) { inkRidge(P, R, { base: 190, peaks: [11, 40, 120, 18, 40], ink: ['#1a0c0a', '#2a120e', '#3a1a12'], mist: '#6a2a14', fade: 70, seed: 3, pines: 40, pineColor: '#140806', sharp: 5 }); } },
    { f: 0.1, y: 80, h: 200, gen(P, R) { inkRidge(P, R, { base: 200, peaks: [9, 60, 140, 20, 44], ink: ['#0e0605', '#180a08', '#26100c'], mist: '#8a3a18', fade: 80, seed: 5, pines: 60, pineColor: '#0a0404', sharp: 6 }); pagoda(P, 610, 88, 5, 0.8, ['#0a0404', '#140806']); } },
    { f: 0.2, y: 120, h: 160, gen(P, R) { templeSilhouettes(P, R, { n: 6, base: 130, wall: '#1a0a08', pillar: '#120605', roof: ['#0a0404', '#100606', '#1a0a08'] }); } },
  ],
  haze: '#a8421a',
};

const Backdrop = {
  make(theme, map) {
    const T = BG_THEMES[theme];
    const R = new RNG(theme.length * 977 + 13);
    const sky = new Paint(VW, VH);
    sky.gradV(0, VH, T.sky);
    if (T.sun) {
      const s = T.sun;
      sky.ellipse(s.x, s.y, s.r * 2.4, s.r * 2.4, (x, y, d) => (d > 0.3 && bayer(x, y) < (1 - d) * 0.9 ? s.halo : null));
      sky.ellipse(s.x, s.y, s.r, s.r, (x, y, d) => (d > 0.86 ? s.halo : s.core));
    }
    if (T.moon) {
      const m = T.moon;
      sky.ellipse(m.x, m.y, m.r * 2.2, m.r * 2.2, (x, y, d) => (bayer(x, y) < (1 - d) * 0.55 ? '#5a1a10' : null));
      sky.ellipse(m.x, m.y, m.r, m.r, (x, y, d, dx, dy) => {
        const n = fbm(x * 0.09, y * 0.09, 3, 5);
        const crater = n > 0.58 ? 1 : 0;
        const rim = dx * 0.6 + dy * 0.8 > 0.55 ? 1 : 0;
        return ['#e8603a', '#c8442a', '#a8321e', '#8a2616'][clamp(crater + rim + (d > 0.85 ? 1 : 0), 0, 3)];
      });
    }
    const layers = T.layers.map((L, i) => {
      const P = new Paint(LW, L.h);
      L.gen(P, new RNG(i * 131 + theme.length * 17));
      return { c: P.done(), f: L.f, y: L.y };
    });
    return { theme, T, sky: sky.done(), layers, clouds: makeClouds(theme), t: 0 };
  },
  draw(ctx, bd, cam, map, t) {
    ctx.drawImage(bd.sky, 0, 0);
    const refY = Math.max(0, map.ph - VH);
    const T = bd.T;
    // drifting clouds sit between the sky and the first ridge
    for (const c of bd.clouds) {
      const x = ((c.x - cam.x * c.f + t * c.v) % (LW + 200) + LW + 200) % (LW + 200) - 100;
      if (x > -c.img.width && x < VW) ctx.drawImage(c.img, Math.round(x), Math.round(c.y + (refY - cam.y) * 0.02));
    }
    if (bd.theme === 'town') {
      // paper sky lanterns rising over the festival
      for (let i = 0; i < 16; i++) {
        const f = 0.03 + (i % 4) * 0.02, sp = 0.05 + (i % 5) * 0.012;
        const x = ((i * 97 + Math.sin(t * 0.004 + i) * 12 - cam.x * f) % (VW + 40) + VW + 40) % (VW + 40) - 20;
        const y = 190 - ((t * sp + i * 53) % 220);
        if (y < -6) continue;
        const big = i % 4 === 3;
        ctx.fillStyle = 'rgba(255,190,90,0.25)'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, big ? 5 : 4, big ? 6 : 5);
        ctx.fillStyle = (t >> 3) % 7 === i % 7 ? '#fff0b0' : '#ffc060'; ctx.fillRect(Math.round(x), Math.round(y), big ? 3 : 2, big ? 4 : 3);
        ctx.fillStyle = '#c85a24'; ctx.fillRect(Math.round(x), Math.round(y) + (big ? 3 : 2), big ? 3 : 2, 1);
      }
    }
    for (const L of bd.layers) {
      const ox = -(((cam.x * L.f) % LW) + LW) % LW;
      const y = Math.round(L.y + (refY - cam.y) * L.f * 0.6);
      for (let x = Math.round(ox); x < VW; x += LW) ctx.drawImage(L.c, x, y);
    }
    // a flock of swallows crossing the sky now and then
    const FL = { peak: '#3a2c28', bamboo: '#3f5234', town: '#4a1a14' }[bd.theme];
    const ft = t % 1500;
    if (FL && ft < 700) {
      for (let i = 0; i < 7; i++) {
        const bx = Math.round(-30 + ft * 0.8 - i * 13 - (i % 2) * 6), by = Math.round(46 + Math.sin(ft * 0.02 + i) * 5 + (i % 3) * 7 + (bd.theme.length % 3) * 8);
        const up = ((t >> 2) + i) & 1;
        ctx.fillStyle = FL;
        ctx.fillRect(bx, by, 1, 1); ctx.fillRect(bx - 1, by, 1, 1);
        if (up) { ctx.fillRect(bx - 3, by - 1, 2, 1); ctx.fillRect(bx + 1, by - 1, 2, 1); } else { ctx.fillRect(bx - 3, by + 1, 2, 1); ctx.fillRect(bx + 1, by + 1, 2, 1); }
        ctx.fillRect(bx - 3, by + (up ? 1 : 0), 1, 1);
      }
    }
    if (T.shafts) {
      ctx.save();
      ctx.globalAlpha = 0.1 + 0.03 * Math.sin(t * 0.01);
      ctx.fillStyle = T.shafts;
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 137 - cam.x * 0.25) % 700 + 700) % 700 - 100;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 26, 0); ctx.lineTo(bx - 90, VH); ctx.lineTo(bx - 130, VH); ctx.fill();
      }
      ctx.restore();
    }
  },
};

// stylized auspicious clouds with curled ends
function cloudSprite(w, h, pal, seed) {
  const P = new Paint(w + 8, h + 8);
  const R = new RNG(seed);
  const blobs = [];
  for (let i = 0; i < 4 + R.i(0, 3); i++) blobs.push([R.r(h * 0.6, w - h * 0.6), h * 0.55 + R.r(-h * 0.2, h * 0.1), R.r(h * 0.3, h * 0.55)]);
  const inside = (x, y) => y < h + 2 && blobs.some(([bx, by, r]) => Math.hypot(x - bx, (y - by) * 1.2) < r);
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
    if (!inside(x, y)) continue;
    const below = !inside(x, y + 2);
    P.px(x, y, below ? pal[0] : inside(x - 1, y - 2) && inside(x, y - 2) ? pal[1] : pal[2]);
  }
  // curls
  for (const [bx, by, r] of blobs.slice(0, 2)) {
    for (let a = 0; a < 5.5; a += 0.12) { const rr = r * 0.55 * (1 - a / 7); P.px(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.8, pal[0]); }
  }
  P.outline(pal[3]);
  return P.done();
}
function makeClouds(theme) {
  const pals = {
    peak: ['#e6c9a4', '#f6e6cc', '#fdf6e8', '#c49a74'], bamboo: ['#c8d2b0', '#dde4c8', '#eef2e0', '#a8b490'],
    town: ['#c85a36', '#f09a5a', '#f8c47a', '#8a2e22'], fort: ['#1a0808', '#2a0e0c', '#3a1410', '#0a0404'], burning: ['#3a120a', '#5a1c0e', '#7a2a14', '#1a0806'],
  };
  const pal = pals[theme];
  const out = [];
  for (let i = 0; i < 6; i++) out.push({ img: cloudSprite(40 + (i * 23) % 50, 14 + (i * 7) % 8, pal, i + 3), x: i * 190, y: 20 + (i * 37) % 70, f: 0.02 + (i % 3) * 0.01, v: theme === 'fort' ? 0.12 : 0.05 });
  return out;
}

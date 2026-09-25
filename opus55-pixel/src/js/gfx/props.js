// ---------------------------------------------------------------------------
// Props: static art generated once per parameter set (halls, gates, trees,
// statues) plus animated pieces (banners, lanterns, fires, smoke). Props are
// anchored at their bottom center in world space.
// ---------------------------------------------------------------------------
const PROP_CACHE = new Map();
function cachedArt(key, fn) { let c = PROP_CACHE.get(key); if (!c) { c = fn(); PROP_CACHE.set(key, c); } return c; }

const ROOF_PAL = {
  teal: S_TEAL, char: ['#121212', '#1e1d1c', '#2b2a28', '#3a3836', '#4c4946', '#66625d'],
  black: ['#060404', '#0e0a0a', '#161010', '#201818', '#2c2020', '#3c2a28'],
  gold: ['#3a2408', '#6a4410', '#96661c', '#c28e2c', '#e2b650', '#f6dc8a'],
};

function paintRoof(P, cx, y, halfRidge, halfEave, h, pal, orn = true) {
  for (let j = 0; j < h; j++) {
    const t = j / (h - 1);
    const hw = halfRidge + (halfEave - halfRidge) * Math.pow(t, 1.7);
    const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
    for (let x = xa; x <= xb; x++) {
      let k;
      if (j < 3) k = j === 0 ? 5 : j === 1 ? 2 : 1;
      else if (j >= h - 2) k = (x - xa) % 3 === 1 ? 5 : j === h - 1 ? 1 : 4;
      else { const ch = (x - Math.round(cx)) % 3; k = ch === 0 ? 1 : ch === 1 || ch === -2 ? 4 : 3; if ((j - 3) % 5 === 0) k--; }
      if (x === xa || x === xb) k = 0;
      P.px(x, y + j, pal[clamp(k, 0, 5)]);
    }
  }
  // upturned eave corners
  for (let k = 0; k < 4; k++) {
    P.px(Math.round(cx - halfEave) - k, y + h - 2 - k, pal[k === 3 ? 5 : 1]);
    P.px(Math.round(cx + halfEave) + k, y + h - 2 - k, pal[k === 3 ? 5 : 1]);
    P.px(Math.round(cx - halfEave) - k, y + h - 1 - k, pal[0]);
    P.px(Math.round(cx + halfEave) + k, y + h - 1 - k, pal[0]);
  }
  if (orn) for (const s of [-1, 1]) {
    // ridge-end ornaments curling upward
    const ex = Math.round(cx + s * halfRidge);
    for (let k = 0; k < 6; k++) { P.px(ex + s * (k > 3 ? k - 3 : 0), y - k, pal[k > 4 ? 5 : 1]); P.px(ex - s, y - k + 1, pal[0]); }
    P.px(ex + s * 3, y - 6, pal[1]); P.px(ex + s * 2, y - 6, pal[4]);
  }
}

function genHall(w, h, o = {}) {
  const pad = 16, W = w + pad * 2;
  const P = new Paint(W, h + 8);
  const cx = W / 2, roofH = Math.round(h * 0.33), br = 5, beam = 7, base = 9;
  const top = 8, colTop = top + roofH + br + beam, colBot = top + h - base;
  const nCols = o.cols || Math.max(3, Math.round(w / 34));
  const colX = [];
  for (let i = 0; i < nCols; i++) colX.push(Math.round(pad + 6 + (i * (w - 12)) / (nCols - 1)));
  const lit = !!o.lit;
  // walls / doors between columns
  for (let i = 0; i < nCols - 1; i++) {
    const x0 = colX[i] + 3, x1 = colX[i + 1] - 2;
    for (let y = colTop; y < colBot; y++) for (let x = x0; x < x1; x++) {
      const lx = x - x0, ly = y - colTop, bw = x1 - x0, bh = colBot - colTop;
      let c;
      if (lx === 0 || lx === bw - 1 || ly === 0) c = S_WOOD[1];
      else if (ly > bh * 0.62) c = ly === Math.round(bh * 0.62) + 1 || lx === Math.floor(bw / 2) ? S_WOOD[1] : S_WOOD[(lx + ly) % 9 === 0 ? 2 : 3];
      else if (lx === Math.floor(bw / 2)) c = S_WOOD[1];
      else {
        const grid = (lx % 4 === 0) || (ly % 4 === 0) || ((lx + ly) % 8 === 0 && o.diamond);
        c = grid ? S_WOOD[2] : lit ? (bayer(x, y) > 0.3 ? '#f6c76a' : '#e8a84a') : (ly < 3 ? '#b8a88a' : '#d8c8a2');
      }
      P.px(x, y, c);
    }
  }
  // columns
  for (const x of colX) for (let y = colTop - 2; y < colBot; y++) for (let i = -2; i <= 2; i++) {
    const k = i === -2 ? 0 : i === 2 ? 2 : i === 1 ? 5 : 3;
    P.px(x + i, y, S_LACQ[y > colBot - 4 ? 1 : k]);
  }
  // painted beam
  for (let y = colTop - beam; y < colTop; y++) for (let x = pad - 2; x < W - pad + 2; x++) {
    const ly = y - (colTop - beam);
    let c = ly === 0 || ly === beam - 1 ? S_GOLD[2] : '#2f6a5e';
    const bay = colX.findIndex((cc, k) => k < colX.length - 1 && x >= cc && x < colX[k + 1]);
    if (bay >= 0 && ly > 0 && ly < beam - 1) {
      const mid = (colX[bay] + colX[bay + 1]) / 2, dx = Math.abs(x - mid);
      if (dx < 6 - Math.abs(ly - beam / 2) * 1.2) c = dx < 3 - Math.abs(ly - beam / 2) ? '#c23a22' : S_GOLD[3];
      else if ((x - colX[bay]) < 4 || colX[bay + 1] - x < 4) c = (x + ly) % 2 ? S_GOLD[3] : '#1f4a42';
    }
    P.px(x, y, c);
  }
  // bracket sets
  for (let x = pad; x < W - pad; x += 7) for (let j = 0; j < br; j++) for (let i = 0; i < 5; i++) {
    const on = j === br - 1 ? i > 0 && i < 4 : j === 0 ? true : i === 0 || i === 4 || j === 2;
    if (on) P.px(x + i, colTop - beam - br + j, j === 0 ? S_GOLD[3] : i === 0 || i === 4 ? S_TEAL[1] : S_TEAL[4]);
  }
  paintRoof(P, cx, top, w * 0.36, W / 2 - 1, roofH, ROOF_PAL[o.roof || 'teal']);
  // plaque
  if (o.plaque !== false) {
    const pw = 22, ph = 9, px = Math.round(cx - pw / 2), py = colTop - beam - 2;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) P.px(px + x, py + y, x === 0 || y === 0 || x === pw - 1 || y === ph - 1 ? S_GOLD[2] : '#1a1412');
    for (const gx of [4, 12]) for (let k = 0; k < 5; k++) { P.px(px + gx + (k % 3), py + 2 + (k >> 1), S_GOLD[4]); P.px(px + gx + 4 - (k % 2), py + 2 + k, S_GOLD[3]); }
  }
  // stone base with central stairs
  for (let y = colBot; y < top + h; y++) for (let x = pad - 4; x < W - pad + 4; x++) {
    const ly = y - colBot;
    const stairs = Math.abs(x - cx) < 14;
    let k = ly === 0 ? 6 : ly === base - 1 ? 1 : 4 - ((x + (ly >> 2) * 5) % 12 === 0 ? 2 : 0);
    if (stairs && ly > 0) k = ly % 3 === 0 ? 6 : ly % 3 === 2 ? 2 : 4;
    P.px(x, y, S_STONE[k]);
  }
  return P.done();
}

function genGate(w, h, o = {}) {
  const W = w + 20, P = new Paint(W, h + 10);
  const cx = W / 2, top = 10;
  const posts = [10 + 4, 10 + w * 0.3, 10 + w * 0.7, 10 + w - 4].map(Math.round);
  for (const x of posts) for (let y = top + 18; y < top + h; y++) for (let i = -3; i <= 3; i++) {
    let c = S_LACQ[i === -3 ? 0 : i === 3 ? 1 : i === 2 ? 5 : 3];
    if (y > top + h - 8) c = S_STONE[i === -3 || i === 3 ? 1 : 5 - (y % 3 === 0 ? 1 : 0)];
    P.px(x + i, y, c);
  }
  // cross beams
  for (const [y0, hh] of [[top + 18, 5], [top + 34, 4]]) for (let y = y0; y < y0 + hh; y++) for (let x = 6; x < W - 6; x++) P.px(x, y, y === y0 ? S_GOLD[3] : y === y0 + hh - 1 ? S_LACQ[0] : '#2f6a5e');
  // plaque
  for (let y = top + 23; y < top + 34; y++) for (let x = Math.round(cx - 18); x < Math.round(cx + 18); x++) {
    const e = y === top + 23 || y === top + 33 || x === Math.round(cx - 18) || x === Math.round(cx + 17);
    P.px(x, y, e ? S_GOLD[2] : '#141010');
  }
  // gold glyph strokes (stylized, not real characters)
  const gl = [[-12, 0, 6, 0], [-9, -3, -9, 4], [-12, 4, -6, 4], [2, -3, 10, -3], [6, -3, 6, 5], [3, 1, 9, 1], [2, 5, 10, 5]];
  for (const [a, b, c2, d] of gl) P.line(cx + a, top + 28 + b, cx + c2, top + 28 + d, S_GOLD[4]);
  paintRoof(P, cx, top, w * 0.2, w * 0.36, 16, ROOF_PAL[o.roof || 'teal']);
  paintRoof(P, cx - w * 0.36, top + 8, 6, 14, 10, ROOF_PAL[o.roof || 'teal'], false);
  paintRoof(P, cx + w * 0.36, top + 8, 6, 14, 10, ROOF_PAL[o.roof || 'teal'], false);
  return P.done();
}

function genPlum(s, seed, bloom = ['#f6d6dc', '#e8a0ac', '#c85a6c', '#fff4f4']) {
  const R = new RNG(seed), W = Math.round(90 * s), H = Math.round(80 * s);
  const P = new Paint(W, H);
  const blossoms = [];
  const branch = (x, y, a, len, w, depth) => {
    let px = x, py = y;
    const segs = 3 + R.i(0, 2);
    for (let i = 0; i < segs; i++) {
      a += R.r(-0.5, 0.5);
      const nx = px + Math.cos(a) * len / segs, ny = py + Math.sin(a) * len / segs;
      P.thick(px, py, nx, ny, t => Math.max(1, w * (1 - (i + t) / segs * 0.45)), (xx, yy, d, dx, dy) => (dx > 0.3 ? '#5a4032' : dx < -0.4 ? '#1a1210' : '#33241c'));
      if (depth < 3 && R.ch(0.45)) branch(nx, ny, a + R.r(-1.1, 1.1), len * 0.55, Math.max(1, w * 0.6), depth + 1);
      if (depth >= 1) for (let b = 0; b < 3; b++) if (R.ch(0.55)) blossoms.push([nx + R.r(-3, 3), ny + R.r(-3, 3)]);
      px = nx; py = ny;
    }
    if (depth < 4) branch(px, py, a + R.r(-0.7, 0.7), len * 0.6, Math.max(1, w * 0.55), depth + 1);
  };
  branch(W * 0.5, H - 1, -Math.PI / 2 + R.r(-0.25, 0.25), 44 * s, 4 * s, 0);
  for (const [x, y] of blossoms) {
    const r = R.ch(0.3) ? 2 : 1;
    P.ellipse(x, y, r + 0.5, r + 0.5, (xx, yy, d) => (d < 0.25 ? bloom[2] : d > 0.7 ? bloom[1] : hash2(xx, yy, 3) > 0.6 ? bloom[3] : bloom[0]));
  }
  return P.done();
}

function genLion(s = 1) {
  const W = 30, H = 36, P = new Paint(W, H);
  const st = (x, y, d, dx, dy) => S_STONE[clamp(Math.round(4 - dy * 2 + dx * 1.2 + (hash2(x, y, 2) > 0.85 ? 1 : 0)), 1, 7)];
  for (let y = 26; y < 36; y++) for (let x = 3; x < 27; x++) P.px(x, y, S_STONE[y === 26 ? 7 : y === 35 ? 1 : x === 3 ? 2 : 5 - (y === 31 ? 2 : 0)]);
  P.ellipse(15, 20, 9, 7, st);      // haunches
  P.ellipse(19, 17, 6, 8, st);      // chest
  P.ellipse(20, 9, 7, 7, st);       // head + mane
  for (let a = 0; a < 7; a++) P.ellipse(20 + Math.cos(a * 0.9) * 6, 9 + Math.sin(a * 0.9) * 6, 2.2, 2.2, (x, y, d) => (d > 0.6 ? S_STONE[2] : S_STONE[5]));
  P.ellipse(24, 10, 3, 3, st);      // snout
  P.px(22, 7, S_STONE[0]); P.px(23, 7, S_STONE[0]); P.px(26, 11, S_STONE[1]); P.px(25, 12, S_STONE[0]);
  P.ellipse(24, 23, 3, 3, (x, y, d) => (d > 0.6 ? S_STONE[2] : S_STONE[6])); // ball under paw
  P.ellipse(8, 14, 3, 5, st);       // tail curl
  P.outline(S_STONE[0]);
  return P.done();
}

function genStoneLantern() {
  const P = new Paint(14, 30);
  const blk = (x, y, w, h, lit) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P.px(x + i, y + j, S_STONE[i === 0 ? 3 : i === w - 1 ? 2 : j === 0 ? 7 : lit && i > 1 && i < w - 2 && j > 1 && j < h - 1 ? '#ffd88a' : 5]); };
  blk(3, 24, 8, 6); blk(5, 16, 4, 8); blk(2, 13, 10, 3); blk(3, 7, 8, 6, 0);
  for (let j = 0; j < 4; j++) for (let i = -j - 1; i <= j + 1; i++) P.px(7 + i, 3 + j, S_STONE[j === 0 ? 7 : 4]);
  P.px(7, 1, S_STONE[5]); P.px(7, 2, S_STONE[5]);
  for (let j = 8; j < 12; j++) for (let i = 5; i < 9; i++) P.px(i, j, j === 8 ? '#e8a84a' : '#f6c76a');
  P.outline(S_STONE[0]);
  return P.done();
}

function genBellFrame() {
  const P = new Paint(40, 52);
  for (const x of [4, 34]) for (let y = 8; y < 52; y++) for (let i = 0; i < 3; i++) P.px(x + i, y, S_WOOD[i === 0 ? 4 : i === 2 ? 1 : 3]);
  for (let y = 8; y < 12; y++) for (let x = 1; x < 39; x++) P.px(x, y, S_WOOD[y === 8 ? 5 : y === 11 ? 1 : 3]);
  paintRoof(P, 20, 1, 8, 18, 7, S_TEAL, false);
  // bell
  for (let y = 14; y < 40; y++) {
    const t = (y - 14) / 26, hw = 5 + t * 5 + (y > 37 ? 1 : 0);
    for (let x = Math.round(20 - hw); x <= Math.round(20 + hw); x++) {
      const u = (x - 20) / hw;
      let c = RAMP.bronze[clamp(Math.round(3 + u * 1.5 - (u < -0.7 ? 1 : 0)), 1, 5)];
      if ((y - 14) % 7 === 0 || (y > 30 && y < 32)) c = RAMP.bronze[1];
      if (y > 20 && y < 28 && Math.abs(x - 20 - (hash2(x, y, 3) > 0.5 ? 1 : 0)) % 3 === 0 && Math.abs(u) < 0.6) c = RAMP.bronze[5];
      P.px(x, y, c);
    }
  }
  for (let y = 12; y < 14; y++) for (let x = 18; x < 23; x++) P.px(x, y, RAMP.bronze[2]);
  P.outline('#1a1008');
  return P.done();
}

function genIncense() {
  const P = new Paint(24, 22);
  for (let y = 6; y < 17; y++) { const t = (y - 6) / 11, hw = 10 - t * 2; for (let x = Math.round(12 - hw); x <= Math.round(12 + hw); x++) P.px(x, y, RAMP.bronze[clamp(Math.round(3 + (x - 12) / hw * 1.4 + (y === 6 ? 2 : 0)), 1, 5)]); }
  for (const x of [4, 12, 19]) for (let y = 17; y < 22; y++) P.px(x, y, RAMP.bronze[2]);
  for (const x of [2, 21]) for (let y = 2; y < 7; y++) P.px(x, y, RAMP.bronze[3]);
  for (let x = 2; x < 5; x++) P.px(x, 2, RAMP.bronze[3]); for (let x = 19; x < 22; x++) P.px(x, 2, RAMP.bronze[3]);
  for (const x of [9, 11, 14]) for (let y = 0; y < 7; y++) P.px(x, y, y === 0 ? '#ff7a3a' : '#9a3a2a');
  for (let x = 6; x < 18; x += 2) P.px(x, 10, RAMP.bronze[5]);
  P.outline('#1a1008');
  return P.done();
}

function genRack() {
  const P = new Paint(34, 44);
  for (const y of [12, 32]) for (let x = 0; x < 34; x++) for (let j = 0; j < 3; j++) P.px(x, y + j, S_WOOD[j === 0 ? 4 : j === 2 ? 1 : 3]);
  for (const x of [2, 30]) for (let y = 10; y < 44; y++) for (let i = 0; i < 2; i++) P.px(x + i, y, S_WOOD[i ? 1 : 4]);
  const W = [[7, '#b82a1c'], [13, '#b82a1c'], [19, '#d8a53a'], [25, '#b82a1c']];
  for (const [x, t] of W) {
    for (let y = 6; y < 42; y++) P.px(x, y, S_WOOD[3]);
    for (let y = 0; y < 6; y++) { P.px(x, y, RAMP.steel[4]); if (y > 1 && y < 5) P.px(x + 1, y, RAMP.steel[2]); }
    for (let y = 6; y < 10; y++) { P.px(x - 1, y, t); P.px(x + 1, y, t); }
  }
  P.outline(S_WOOD[0]);
  return P.done();
}

function genStall(o = {}) {
  const P = new Paint(56, 46);
  const awn = o.awn || ['#b82a1c', '#e8d8b8'];
  for (const x of [3, 51]) for (let y = 8; y < 46; y++) { P.px(x, y, S_WOOD[3]); P.px(x + 1, y, S_WOOD[1]); }
  for (let y = 4; y < 14; y++) for (let x = 0; x < 56; x++) {
    const t = y - 4, stripe = Math.floor((x + t * 0.4) / 6) % 2;
    let c = stripe ? awn[1] : awn[0];
    if (t === 9) c = x % 6 < 3 ? awn[0] : null;
    if (t === 0) c = S_WOOD[1];
    if (c) P.px(x, y, c);
  }
  for (let y = 30; y < 46; y++) for (let x = 5; x < 51; x++) P.px(x, y, y === 30 ? S_WOOD[5] : y === 31 ? S_WOOD[4] : (x % 10 === 0 ? S_WOOD[1] : S_WOOD[3 - (y > 42 ? 1 : 0)]));
  const R = new RNG(o.seed || 3);
  const goods = o.goods || ['#e8602a', '#f0a030', '#8ab04a', '#d8c8a0'];
  for (let i = 0; i < 12; i++) { const gx = R.i(8, 46), c = R.pick(goods); P.ellipse(gx, 28, 2, 2, (x, y, d, dx, dy) => (dy < -0.3 ? mix(c, '#ffffff', 0.35) : dy > 0.4 ? mix(c, '#000000', 0.35) : c)); }
  for (let i = 0; i < 3; i++) { const jx = 12 + i * 14; for (let y = 20; y < 29; y++) for (let x = -3; x <= 3; x++) if (Math.abs(x) < 3 + (y > 22 && y < 27 ? 1 : 0)) P.px(jx + x, y, RAMP.earth[clamp(3 + Math.sign(-x), 1, 5)]); }
  P.outline('#1a120c');
  return P.done();
}

function genBoat() {
  const P = new Paint(80, 30);
  for (let y = 16; y < 30; y++) {
    const t = (y - 16) / 14, inset = Math.round(t * t * 14);
    for (let x = inset; x < 80 - inset; x++) P.px(x, y, S_WOOD[y === 16 ? 5 : y === 17 ? 4 : (x + y) % 11 === 0 ? 1 : y > 26 ? 1 : 3]);
  }
  for (let y = 4; y < 16; y++) { const hw = 20 * Math.sqrt(1 - Math.pow((16 - y) / 13, 2)); for (let x = Math.round(40 - hw); x <= Math.round(40 + hw); x++) P.px(x, y, (x % 3 === 0) ? '#6a5430' : y < 7 ? '#c4a86a' : '#a88c52'); }
  for (let y = 0; y < 16; y++) P.px(74, y, S_WOOD[2]);
  P.outline('#140c06');
  return P.done();
}

function genShrine(active) {
  const P = new Paint(30, 38);
  for (let y = 30; y < 38; y++) for (let x = 2; x < 28; x++) P.px(x, y, S_STONE[y === 30 ? 7 : y === 37 ? 1 : 4 - (x % 7 === 0 ? 1 : 0)]);
  for (let y = 14; y < 30; y++) for (let x = 6; x < 24; x++) P.px(x, y, S_STONE[x === 6 ? 3 : x === 23 ? 2 : 5]);
  for (let y = 17; y < 28; y++) for (let x = 10; x < 20; x++) P.px(x, y, active ? (bayer(x, y) > 0.35 ? '#ffd27a' : '#f0a040') : '#2a2420');
  for (let y = 19; y < 26; y++) P.px(15, y, active ? '#fff6d0' : '#6a5a4a');
  paintRoof(P, 15, 4, 6, 14, 10, S_TEAL, true);
  P.outline(S_STONE[0]);
  return P.done();
}

function genWell() {
  const P = new Paint(28, 34);
  for (let y = 18; y < 34; y++) for (let x = 2; x < 26; x++) P.px(x, y, S_STONE[(x + (y >> 2) * 4) % 8 === 0 || y % 4 === 0 ? 2 : y === 18 ? 7 : 5]);
  for (const x of [3, 23]) for (let y = 2; y < 18; y++) { P.px(x, y, S_WOOD[4]); P.px(x + 1, y, S_WOOD[2]); }
  paintRoof(P, 14, 0, 6, 14, 6, ROOF_PAL.char, false);
  for (let y = 8; y < 14; y++) P.px(14, y, '#8a7a5a');
  P.outline('#140c06');
  return P.done();
}

// ---------------------------------------------------------------------------
class Prop {
  constructor(type, x, y, o = {}) {
    this.type = type; this.x = x; this.y = y; this.o = o; this.front = !!o.front; this.f = o.f || 1;
    this.seed = o.seed || ((x * 7 + y * 13) | 0); this.t = rndi(0, 1000);
    const def = PROP_DEFS[type];
    this.def = def;
    if (def.art) this.img = cachedArt(type + JSON.stringify(o), () => def.art(o, this.seed));
    if (def.init) def.init(this);
  }
  update() { this.t++; if (this.def.update) this.def.update(this); }
  draw(ctx, cam) {
    const sx = Math.round(this.x - cam.x * this.f), sy = Math.round(this.y - cam.y * (this.f === 1 ? 1 : lerp(1, this.f, 0.5)));
    if (this.img) {
      if (sx + this.img.width / 2 < -40 || sx - this.img.width / 2 > VW + 40) return;
      ctx.drawImage(this.img, sx - (this.img.width >> 1), sy - this.img.height + (this.def.sink || 0));
    }
    if (this.def.draw) this.def.draw(this, ctx, sx, sy, cam);
  }
  lights(cam, out) { if (this.def.light) this.def.light(this, out, Math.round(this.x - cam.x), Math.round(this.y - cam.y)); }
}

function drawBannerCloth(ctx, x, y, w, h, t, pal, emblem) {
  for (let i = 0; i < w; i++) {
    const wave = Math.round(Math.sin(t * 0.06 + i * 0.35) * (i / w) * 2.2);
    for (let j = 0; j < h + (i === w - 1 ? 0 : 0); j++) {
      const tail = j > h - 5 && (i % 4 === 1 || i % 4 === 2) && j > h - 5 + (i % 2);
      if (j >= h - 4 && !tail && j > h - 2) continue;
      let c = i === 0 || j === 0 ? pal[0] : i === w - 1 ? pal[1] : j > h - 5 ? pal[1] : (i + wave) % 5 === 0 ? pal[1] : pal[2];
      if (emblem && j > 6 && j < 14 && i > 2 && i < w - 3) { const dx = i - w / 2 + 0.5, dy = j - 10; if (dx * dx + dy * dy < 9) c = pal[3]; if (dx * dx + dy * dy < 3) c = pal[2]; }
      ctx.fillStyle = c; ctx.fillRect(x + i, y + j + wave, 1, 1);
    }
  }
}

const PROP_DEFS = {
  hall: { art: o => genHall(o.w || 180, o.h || 110, o) },
  gate: { art: o => genGate(o.w || 140, o.h || 96, o) },
  plum: { art: (o, s) => genPlum(o.s || 1, s, o.bloom), update(p) { if (p.t % 26 === 0 && G.fxOn) FX.part({ kind: 'petal', x: p.x + rnd(-30, 30), y: p.y - rnd(40, 70), vx: rnd(-0.2, 0.3), vy: rnd(0.2, 0.5), g: 0.004, sway: 0.08, life: 240, cols: ['#f6d6dc', '#e8a0ac'], layer: 1, spin: 0.08 }); } },
  pine: { art: (o, s) => { const P = new Paint(80 * (o.s || 1), 70 * (o.s || 1)); pineTree(P, P.w / 2, P.h - 1, (o.s || 1) * 1.3, { trunk: ['#2a1c14', '#46321f', '#66503a'], leaf: ['#1c2a1a', '#2a3e24', '#3c5632', '#587448'] }, new RNG(s)); return P.done(); } },
  lion: { art: () => genLion() },
  slantern: { art: () => genStoneLantern(), light(p, out, x, y) { out.push([x, y - 20, 14, '#ffb050']); } },
  bell: { art: () => genBellFrame() },
  incense: { art: () => genIncense(), update(p) { if (p.t % 14 === 0 && G.fxOn) FX.part({ kind: 'smoke', x: p.x + rnd(-3, 3), y: p.y - 22, vx: rnd(-0.05, 0.05), vy: -0.35, g: 0, drag: 1, grow: 0.03, size: 1, life: 90, sway: 0.05, cols: ['#e8e0d0', '#c8c0b0', '#a8a090'], layer: 0 }); } },
  rack: { art: () => genRack() },
  stall: { art: (o, s) => genStall({ ...o, seed: s }) },
  boat: { art: () => genBoat(), sink: 8, draw(p) { p.y = p.baseY + Math.round(Math.sin(p.t * 0.03) * 1.2); }, init(p) { p.baseY = p.y; } },
  shrine: { art: o => genShrine(false), draw(p, ctx, x, y) { if (p.active) { if (!p.img2) p.img2 = cachedArt('shrineOn', () => genShrine(true)); ctx.drawImage(p.img2, x - 15, y - 38); } }, light(p, out, x, y) { if (p.active) out.push([x, y - 16, 34 + Math.sin(p.t * 0.1) * 2, '#ffc070']); } },
  well: { art: () => genWell() },
  banner: {
    draw(p, ctx, x, y) {
      const h = p.o.h || 44, pal = p.o.pal || ['#3a0a08', '#7a1a12', '#b8301e', '#e8c860'];
      ctx.fillStyle = S_WOOD[1]; ctx.fillRect(x, y - h - 12, 2, h + 12);
      ctx.fillStyle = S_WOOD[3]; ctx.fillRect(x, y - h - 12, 1, h + 12);
      ctx.fillStyle = S_GOLD[3]; ctx.fillRect(x - 1, y - h - 13, 4, 2);
      ctx.fillStyle = S_WOOD[1]; ctx.fillRect(x + 1, y - h - 9, 14, 1);
      drawBannerCloth(ctx, x + 2, y - h - 8, 12, h - 10, p.t + p.seed, pal, true);
    },
  },
  lantern: {
    draw(p, ctx, x, y) {
      const sw = Math.sin(p.t * 0.035 + p.seed) * 1.6, len = p.o.len || 10;
      ctx.fillStyle = '#1a1010'; for (let j = 0; j < len; j++) ctx.fillRect(Math.round(x + sw * j / len), y + j, 1, 1);
      const lx = Math.round(x + sw), ly = y + len;
      const body = p.o.pal || ['#5a0e08', '#9a1c10', '#d8341c', '#f06a3a'];
      ctx.fillStyle = S_GOLD[2]; ctx.fillRect(lx - 3, ly, 7, 2);
      for (let j = 0; j < 10; j++) {
        const hw = Math.round(Math.sqrt(1 - Math.pow((j - 4.5) / 5.2, 2)) * 5);
        for (let i = -hw; i <= hw; i++) { ctx.fillStyle = Math.abs(i) === hw ? body[0] : i % 3 === 0 ? body[1] : i < -1 ? body[2] : body[3]; ctx.fillRect(lx + i, ly + 2 + j, 1, 1); }
      }
      ctx.fillStyle = S_GOLD[2]; ctx.fillRect(lx - 2, ly + 12, 5, 2);
      ctx.fillStyle = body[2]; for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(lx + Math.sin(p.t * 0.05 + j * 0.5) * 0.6), ly + 14 + j, 1, 1);
    },
    light(p, out, x, y) { out.push([x, y + (p.o.len || 10) + 7, 30 + Math.sin(p.t * 0.2) * 1.5, '#ff9a4a']); },
  },
  lanterns: {
    // a string of lanterns hung across a span: o.w width, o.sag
    draw(p, ctx, x, y) {
      const w = p.o.w || 120, sag = p.o.sag || 14, n = Math.floor(w / 22);
      ctx.fillStyle = '#1a1010';
      for (let i = 0; i <= w; i++) { const t = i / w; ctx.fillRect(Math.round(x - w / 2 + i), Math.round(y + Math.sin(t * Math.PI) * sag + Math.sin(p.t * 0.03) * t * (1 - t) * 4), 1, 1); }
      for (let k = 1; k < n; k++) {
        const t = k / n, lx = Math.round(x - w / 2 + t * w), ly = Math.round(y + Math.sin(t * Math.PI) * sag + Math.sin(p.t * 0.03) * t * (1 - t) * 4);
        const pal = k % 3 === 0 ? ['#6a4a08', '#b8861a', '#e8b83a', '#f8dc7a'] : ['#5a0e08', '#9a1c10', '#d8341c', '#f06a3a'];
        for (let j = 0; j < 6; j++) { const hw = Math.round(Math.sqrt(1 - Math.pow((j - 2.5) / 3.2, 2)) * 3); for (let i = -hw; i <= hw; i++) { ctx.fillStyle = Math.abs(i) === hw ? pal[0] : i < 0 ? pal[2] : pal[3]; ctx.fillRect(lx + i, ly + 1 + j, 1, 1); } }
        ctx.fillStyle = pal[1]; ctx.fillRect(lx, ly + 7, 1, 2);
      }
    },
    light(p, out, x, y) { const w = p.o.w || 120, n = Math.floor(w / 22), sag = p.o.sag || 14; for (let k = 1; k < n; k++) { const t = k / n; out.push([x - w / 2 + t * w, y + Math.sin(t * Math.PI) * sag + 4, 18, '#ff8a3a']); } },
  },
  brazier: {
    draw(p, ctx, x, y) {
      ctx.fillStyle = S_IRON[1]; ctx.fillRect(x - 5, y - 10, 1, 10); ctx.fillRect(x + 5, y - 10, 1, 10); ctx.fillRect(x, y - 10, 1, 10);
      for (let j = 0; j < 5; j++) { const hw = 8 - j; ctx.fillStyle = j === 0 ? S_IRON[5] : S_IRON[2 + (j === 1 ? 1 : 0)]; ctx.fillRect(x - hw, y - 16 + j, hw * 2 + 1, 1); }
      drawFire(ctx, x, y - 16, 7, p.t + p.seed, 1);
      if (p.t % 7 === 0 && G.fxOn) FX.part({ kind: 'ember', x: x + rnd(-4, 4), y: y - 22, vx: rnd(-0.3, 0.3), vy: rnd(-1.2, -0.5), g: 0.005, life: rndi(30, 70), cols: ['#ffd08a', '#ff8a3a', '#e8481a'], layer: 1 });
    },
    light(p, out, x, y) { out.push([x, y - 20, 44 + Math.sin(p.t * 0.3) * 3, '#ff7a30']); },
  },
  fire: {
    draw(p, ctx, x, y) { drawFire(ctx, x, y, p.o.s || 12, p.t + p.seed, p.o.s ? p.o.s / 8 : 1.5); if (p.t % 4 === 0 && G.fxOn) FX.part({ kind: 'ember', x: x + rnd(-8, 8), y: y - 10, vx: rnd(-0.4, 0.4), vy: rnd(-1.6, -0.6), g: -0.01, life: rndi(30, 80), cols: ['#ffe0a0', '#ff9a3a', '#e8481a', '#8a1a0a'], layer: 1 }); },
    light(p, out, x, y) { out.push([x, y - 12, (p.o.s || 12) * 5 + Math.sin(p.t * 0.25) * 4, '#ff6a20']); },
  },
  dummy: { draw() {} },
  fgbamboo: {
    // near-camera stalk: dark, with node rings, a sheen and leaf sprays
    draw(p, ctx, x, y) {
      if (x < -60 || x > VW + 60) return;
      const w = p.o.w || 12, cols = ['#0a1109', '#132012', '#1c2e19', '#284024', '#3b5732', '#56753f'];
      for (let j = 0; j < VH; j++) {
        const node = (j + p.seed) % 46;
        const bulge = node === 0 || node === 45 ? 1 : 0;
        for (let i = -bulge; i < w + bulge; i++) {
          const u = (i + 0.5) / w;
          let k = u < 0.08 ? 0 : u > 0.92 ? 1 : u < 0.22 ? 4 : u < 0.32 ? 5 : u < 0.6 ? 3 : 2;
          if (node === 0) k = 0; else if (node === 1 || node === 45) k = Math.min(5, k + 1);
          ctx.fillStyle = cols[k]; ctx.fillRect(x + i, j, 1, 1);
        }
      }
      const R = new RNG(p.seed);
      for (let c = 0; c < 3; c++) {
        const cy = R.r(6, 150), dir = R.ch(0.5) ? 1 : -1;
        for (let l = 0; l < 5; l++) {
          const a = R.r(0.25, 0.95), L = R.r(14, 26);
          for (let t = 0; t < L; t++) {
            const lx = Math.round(x + w / 2 + dir * (6 + t * Math.cos(a))), ly = Math.round(cy + l * 4 + t * Math.sin(a) * 0.9);
            const wd = t < 3 || t > L - 4 ? 1 : 2;
            ctx.fillStyle = t > L - 5 ? cols[1] : cols[3 + (t % 4 === 1 ? 1 : 0)];
            ctx.fillRect(lx, ly, 2, wd);
          }
        }
      }
    },
  },
  fgbranch: {
    draw(p, ctx, x) {
      const R = new RNG(p.seed);
      ctx.fillStyle = '#140e0a';
      let bx = x, by = -2;
      for (let i = 0; i < 40; i++) { bx += R.r(0.4, 1.6); by += R.r(-0.2, 0.9); ctx.fillRect(Math.round(bx), Math.round(by), 2, 2); if (i % 6 === 3) { ctx.fillStyle = '#1c2a18'; ctx.fillRect(Math.round(bx) - 5, Math.round(by) + 1, 11, 3); ctx.fillStyle = '#140e0a'; } }
    },
  },
  rock: { art: (o, s) => { const R = new RNG(s), w = o.w || 26, h = o.h || 16, P = new Paint(w, h); P.ellipse(w / 2, h, w / 2, h, (x, y, d, dx, dy) => S_STONE[clamp(Math.round(4 - dy * 2.5 + dx * 1.4 + (hash2(x, y, s) > 0.85 ? 1 : 0)), 1, 7)]); P.outline(S_STONE[0]); return P.done(); } },
  sign: { art: () => { const P = new Paint(18, 30); for (let y = 8; y < 30; y++) { P.px(8, y, S_WOOD[3]); P.px(9, y, S_WOOD[1]); } for (let y = 0; y < 12; y++) for (let x = 1; x < 17; x++) P.px(x, y, y === 0 || y === 11 || x === 1 || x === 16 ? S_WOOD[1] : S_WOOD[4 - (y % 4 === 0 ? 1 : 0)]); for (const x of [5, 9, 13]) for (let y = 3; y < 9; y++) P.px(x + (y % 3 === 0 ? 1 : 0), y, '#2a1a10'); P.outline('#140c06'); return P.done(); } },
};

function drawFire(ctx, x, y, s, t, k = 1) {
  const cols = ['#8a1a0a', '#e8481a', '#ff8a3a', '#ffd08a', '#fff6d8'];
  for (let i = 0; i < 18; i++) {
    const ph = (t * 0.09 + i * 0.37) % 1;
    const px = x + Math.sin(i * 2.3 + t * 0.07) * s * 0.45 * (1 - ph);
    const py = y - ph * s * 1.6 * k;
    const r = Math.max(0, (1 - ph) * s * 0.35 * (0.6 + (i % 3) * 0.2));
    discPx(ctx, px, py, r, cols[clamp(Math.floor((1 - ph) * 4 + (i % 2)), 0, 4)]);
  }
}

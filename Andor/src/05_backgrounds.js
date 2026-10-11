// ANDOR :: parallax backgrounds, generated once per theme.

// Horizontally-wrapping pixel buffer helpers for tileable layers.
class WrapBuf extends PixBuf {
  setW(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (y < 0 || y >= this.h) return;
    this.d[y * this.w + (((x % this.w) + this.w) % this.w)] = c;
  }
  getW(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (y < 0 || y >= this.h) return 0;
    return this.d[y * this.w + (((x % this.w) + this.w) % this.w)];
  }
  colW(x, y0, y1, c) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) this.setW(x, y, c);
  }
  rectW(x, y, w, h, c) {
    for (let xx = 0; xx < w; xx++) this.colW(x + xx, y, y + h - 1, c);
  }
}

// Silhouette shapes -------------------------------------------------------
function bgDome(b, cx, baseY, r, h, body, rim, accent) {
  for (let y = 0; y <= h; y++) {
    const t = y / h;
    const w = r * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.7))) * (1 + 0.16 * Math.sin(t * Math.PI * 0.9));
    const yy = baseY - y;
    for (let x = -Math.round(w); x <= Math.round(w); x++) {
      let col = body;
      if (x >= Math.round(w) - 1 && w > 1.5) col = rim;
      if (accent && Math.round(x + y * 0.6) % 6 === 0 && y < h - 2 && Math.abs(x) < w - 1) col = accent;
      b.setW(cx + x, yy, col);
    }
  }
  // finial
  b.colW(cx, baseY - h - 6, baseY - h, body);
  b.setW(cx, baseY - h - 4, rim);
  b.setW(cx - 1, baseY - h - 3, body);
  b.setW(cx + 1, baseY - h - 3, body);
}
function bgMinaret(b, cx, baseY, h, w, body, rim, lit) {
  b.rectW(cx - (w >> 1), baseY - h, w, h + 1, body);
  b.colW(cx + (w >> 1) - 1, baseY - h, baseY, rim);
  const bal = baseY - Math.round(h * 0.78);
  b.rectW(cx - (w >> 1) - 2, bal, w + 4, 2, body);
  b.rectW(cx - (w >> 1) - 1, bal + 2, w + 2, 1, body);
  for (let y = 0; y < w + 4; y++) {
    const half = Math.max(0, Math.round(((w + 4 - y) / (w + 4)) * (w / 2 + 0.5)));
    for (let x = -half; x <= half; x++) b.setW(cx + x, baseY - h - y, body);
  }
  b.colW(cx, baseY - h - w - 9, baseY - h - w - 3, body);
  if (lit) b.setW(cx, bal - 4, lit);
}
function bgBlock(b, x, baseY, w, h, body, rim, win, rng) {
  b.rectW(x, baseY - h, w, h + 1, body);
  b.colW(x + w - 1, baseY - h, baseY, rim);
  // parapet notches
  for (let i = 1; i < w - 1; i += 3) b.setW(x + i, baseY - h - 1, body);
  if (win)
    for (let wy = baseY - h + 4; wy < baseY - 3; wy += 6)
      for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rng() < 0.28) { b.setW(wx, wy, win); b.setW(wx, wy + 1, win); }
}
function bgArch(b, cx, baseY, w, h, col) {
  // pointed (Persian) arch opening
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = t < 0.6 ? w / 2 : (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.6) / 0.42, 2)));
    for (let x = -Math.round(half); x <= Math.round(half); x++) b.setW(cx + x, baseY - y, col);
  }
}
function bgPalm(b, x, baseY, h, trunk, frond, rng) {
  const lean = rng() * 6 - 3;
  let tx = x, ty = baseY;
  for (let i = 0; i <= h; i++) {
    const t = i / h;
    tx = x + lean * t * t;
    ty = baseY - i;
    b.setW(tx, ty, trunk);
    b.setW(tx + 1, ty, trunk);
  }
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / (n - 1)) * Math.PI - Math.PI;
    const len = 9 + rng() * 5;
    for (let s = 0; s < len; s++) {
      const u = s / len;
      const fx = tx + Math.cos(a) * s * 1.1;
      const fy = ty + Math.sin(a) * s * 0.5 + u * u * 7;
      b.setW(fx, fy, frond);
      if (s % 2 === 0) b.setW(fx, fy + 1, frond);
    }
  }
}
function bgBadgir(b, x, baseY, w, h, body, rim, slit) {
  b.rectW(x, baseY - h, w, h + 1, body);
  b.colW(x + w - 1, baseY - h, baseY, rim);
  for (let i = 1; i < w - 1; i += 2) b.colW(x + i, baseY - h + 2, baseY - h + 7, slit);
  b.rectW(x - 1, baseY - h - 1, w + 2, 1, body);
}

// Theme backgrounds -------------------------------------------------------
// Each returns { sky: [stops], layers: [{c, fx, fy, yOff, fill}], extras }
const BACKDROPS = {};

BACKDROPS.bazaar = () => {
  const rng = makeRng(1037);
  const far = new WrapBuf(720, 150);
  const body = C('#0f2328'), rim = C('#1f474b'), acc = C('#173a3e'), lit = C('#e8b84a');
  const base = 140;
  for (let x = 0; x < 720; x += 6) bgBlock(far, x, base, 7, 14 + Math.floor(rng() * 16), body, rim, lit, rng);
  for (let i = 0; i < 5; i++) {
    const cx = 60 + i * 140 + Math.floor(rng() * 40);
    const r = 16 + Math.floor(rng() * 12);
    far.rectW(cx - r - 2, base - 26, r * 2 + 5, 27, body);
    bgArch(far, cx, base, 10, 18, C('#0a171b'));
    bgDome(far, cx, base - 26, r, Math.round(r * 1.25), body, rim, acc);
    bgMinaret(far, cx - r - 12, base, 70 + Math.floor(rng() * 20), 5, body, rim, lit);
    if (rng() < 0.6) bgMinaret(far, cx + r + 12, base, 64 + Math.floor(rng() * 20), 5, body, rim, lit);
  }
  const mid = new WrapBuf(560, 130);
  const mb = C('#1c1410'), mr = C('#2e2118'), mw = C('#f0b54a'), slit = C('#0e0a08');
  const mbase = 129;
  for (let x = 0; x < 560; ) {
    const w = 18 + Math.floor(rng() * 26), h = 30 + Math.floor(rng() * 40);
    bgBlock(mid, x, mbase, w, h, mb, mr, mw, rng);
    if (rng() < 0.45) bgBadgir(mid, x + 3 + Math.floor(rng() * (w - 10)), mbase - h, 6, 14 + Math.floor(rng() * 8), mb, mr, slit);
    if (rng() < 0.35) bgPalm(mid, x + w + 2, mbase, 40 + Math.floor(rng() * 20), mb, mb, rng);
    x += w + Math.floor(rng() * 6);
  }
  return {
    sky: ['#06110f', '#0b1c1f', '#112a2d', '#1d3a39', '#3f4a3c', '#8a5e3c', '#c9773f', '#e89a52'],
    skyH: 0.92,
    stars: 90,
    moon: { x: 0.78, y: 0.18, r: 13, col: '#f7e7bd', shade: '#d9c08e' },
    layers: [
      { c: far.toCanvas(), fx: 0.08, fy: 0.04, yOff: -18, fill: '#0f2328' },
      { c: mid.toCanvas(), fx: 0.22, fy: 0.1, yOff: 6, fill: '#1c1410' },
    ],
    lanterns: true,
  };
};

BACKDROPS.desert = () => {
  const rng = makeRng(77);
  const far = new WrapBuf(800, 120);
  const mesa = C('#e0a679'), mesaS = C('#d2946a'), pyrL = C('#ebbd8f'), pyrS = C('#cf9064');
  for (let x = 0; x < 800; x++) {
    const h = 18 + Math.round(fbm(x / 40, 0, 5) * 24 + (fbm(x / 9, 3, 6) > 0.6 ? 4 : 0));
    far.colW(x, 119 - h, 119, fbm(x / 12, 1, 9) > 0.55 ? mesaS : mesa);
  }
  for (const [px, ph] of [[220, 46], [262, 34], [296, 22], [600, 40], [640, 26]]) {
    for (let y = 0; y < ph; y++) {
      const half = Math.round((ph - y) * 1.05);
      for (let x = -half; x <= half; x++) far.setW(px + x, 119 - 12 - y, x < 0 ? pyrL : pyrS);
    }
  }
  const dunes = new WrapBuf(640, 110);
  const dl = C('#e9b46c'), ds = C('#cf9552'), dc = C('#f4cd8a');
  for (let x = 0; x < 640; x++) {
    const ph = (x / 640) * TAU;
    const h = 40 + Math.sin(ph * 2) * 14 + Math.sin(ph * 5 + 1) * 8 + Math.sin(ph * 9 + 2) * 3;
    const slope = Math.cos(ph * 2) * 2 + Math.cos(ph * 5 + 1) * 5 * 0.5;
    const top = Math.round(109 - h);
    dunes.colW(x, top, 109, slope > 0 ? dl : ds);
    dunes.setW(x, top, dc);
  }
  const mid = new WrapBuf(700, 120);
  const ml = C('#dca05a'), ms = C('#b97a3e'), mc = C('#efc27e'), col = C('#a8703f'), colS = C('#7e4f2a');
  for (let x = 0; x < 700; x++) {
    const ph = (x / 700) * TAU;
    const h = 30 + Math.sin(ph * 3 + 0.5) * 12 + Math.sin(ph * 7) * 5;
    const slope = Math.cos(ph * 3 + 0.5) * 36 + Math.cos(ph * 7) * 35;
    const top = Math.round(119 - h);
    mid.colW(x, top, 119, slope > 0 ? ml : ms);
    mid.setW(x, top, mc);
  }
  // half-buried colossus head and broken columns
  const hx = 420, hy = 92;
  for (let y = 0; y < 26; y++)
    for (let x = 0; x < 22; x++) {
      const inside = (x - 11) * (x - 11) / 121 + (y - 14) * (y - 14) / 196 < 1;
      if (inside) mid.setW(hx + x, hy - 14 + y, x > 13 ? colS : col);
    }
  mid.rectW(hx + 2, hy - 30, 18, 8, col);
  mid.rectW(hx + 14, hy - 30, 6, 8, colS);
  for (const cx of [150, 170, 560]) {
    const h = 20 + Math.floor(rng() * 18);
    mid.rectW(cx, 104 - h, 6, h, col);
    mid.colW(cx + 5, 104 - h, 104, colS);
    mid.rectW(cx - 1, 104 - h, 8, 2, col);
  }
  for (const px of [300, 316, 330]) bgPalm(mid, px, 100, 26 + Math.floor(rng() * 10), C('#6e4a2a'), C('#4f6a2a'), rng);
  return {
    sky: ['#d98c52', '#e8a868', '#f0c184', '#f6d7a4', '#fbe7c4', '#fdf0d8'],
    skyH: 1.0,
    sun: { x: 0.24, y: 0.16, r: 11 },
    layers: [
      { c: far.toCanvas(), fx: 0.05, fy: 0.03, yOff: -38, fill: '#e0a679', shimmer: true },
      { c: dunes.toCanvas(), fx: 0.14, fy: 0.08, yOff: -14, fill: '#cf9552', shimmer: true, caravan: true },
      { c: mid.toCanvas(), fx: 0.3, fy: 0.16, yOff: 10, fill: '#b97a3e' },
    ],
  };
};

BACKDROPS.tomb = () => {
  const rng = makeRng(3150);
  const far = new WrapBuf(640, 220);
  const w0 = C('#241b14'), w1 = C('#2c2219'), ln = C('#34281d'), dk = C('#1a130e');
  for (let y = 0; y < 220; y++) for (let x = 0; x < 640; x++) far.setW(x, y, fbm(x / 30, y / 30, 4) > 0.5 ? w1 : w0);
  // registers of giant faint glyphs and two colossal figures
  for (let r = 0; r < 4; r++)
    for (let x = 6; x < 640; x += 14) {
      const gi = Math.floor(rng() * GLYPHS.length);
      const g = GLYPHS[gi];
      for (let gy = 0; gy < g.length; gy++)
        for (let gx = 0; gx < g[gy].length; gx++) if (g[gy][gx] === '#') far.rectW(x + gx * 2, 18 + r * 52 + gy * 2, 2, 2, ln);
    }
  for (const fx0 of [120, 440]) {
    // seated colossus silhouette
    far.rectW(fx0, 60, 60, 160, dk);
    far.rectW(fx0 + 10, 30, 40, 40, dk);
    far.rectW(fx0 + 4, 24, 52, 16, dk);
    far.rectW(fx0 + 22, 70, 16, 40, ln);
    for (let y = 0; y < 30; y++) far.rectW(fx0 + 60, 60 + y * 5, 2, 3, ln);
  }
  const cols = new WrapBuf(384, 240);
  const cb = C('#2a2017'), cbL = C('#3d2f22'), cbS = C('#1c150f'), cap = C('#4a3a29');
  for (const cx of [40, 232]) {
    cols.rectW(cx, 30, 26, 210, cb);
    cols.rectW(cx, 30, 4, 210, cbL);
    cols.rectW(cx + 22, 30, 4, 210, cbS);
    for (let y = 40; y < 240; y += 12) cols.rectW(cx, y, 26, 1, cbS);
    // lotus capital
    for (let y = 0; y < 18; y++) {
      const half = 13 + Math.round(Math.sin((y / 18) * Math.PI) * 9);
      cols.rectW(cx + 13 - half, 12 + y, half * 2, 1, y % 4 === 0 ? cbL : cap);
    }
    cols.rectW(cx - 6, 8, 38, 4, cbL);
  }
  return {
    sky: ['#070504', '#0d0907', '#150f0b', '#1b130d'],
    skyH: 1.0,
    layers: [
      { c: far.toCanvas(), fx: 0.12, fy: 0.12, yOff: 10, fill: '#241b14' },
      { c: cols.toCanvas(), fx: 0.35, fy: 0.3, yOff: 30, fill: '#2a2017' },
    ],
    dust: true,
  };
};

BACKDROPS.andor = () => {
  const rng = makeRng(4040);
  const far = new WrapBuf(720, 170);
  const b = C('#1d1a0e'), r = C('#4a3a16'), l = C('#25b56a'), l2 = C('#d9a12e');
  for (let i = 0; i < 9; i++) {
    const cx = 40 + i * 80 + Math.floor(rng() * 30);
    const tiers = 3 + Math.floor(rng() * 3);
    let w = 50 + Math.floor(rng() * 20), y = 169;
    for (let t = 0; t < tiers; t++) {
      const h = 14 + Math.floor(rng() * 8);
      far.rectW(cx - (w >> 1), y - h, w, h, b);
      far.colW(cx + (w >> 1) - 1, y - h, y, r);
      for (let x = cx - (w >> 1) + 3; x < cx + (w >> 1) - 3; x += 5) if (rng() < 0.4) far.setW(x, y - h + 5, rng() < 0.5 ? l : l2);
      y -= h;
      w = Math.round(w * 0.72);
    }
    bgMinaret(far, cx, y, 20 + Math.floor(rng() * 20), 3, b, r, l);
  }
  const mid = new WrapBuf(600, 200);
  const pipe = C('#3a2a10'), pipeH = C('#6e4a18'), pipeS = C('#221808');
  for (const px of [30, 46, 300, 316, 330]) {
    mid.rectW(px, 0, 6, 200, pipe);
    mid.colW(px + 1, 0, 199, pipeH);
    mid.colW(px + 5, 0, 199, pipeS);
    for (let y = 10; y < 200; y += 40) mid.rectW(px - 1, y, 8, 3, pipeH);
  }
  for (let x = 0; x < 600; x++) mid.setW(x, 150 + Math.round(Math.sin(x / 18) * 3), pipeH);
  return {
    sky: ['#030806', '#06110c', '#0a1b14', '#0e271c', '#123222', '#164028'],
    skyH: 1.0,
    layers: [
      { c: far.toCanvas(), fx: 0.07, fy: 0.05, yOff: -10, fill: '#1d1a0e' },
      { c: mid.toCanvas(), fx: 0.2, fy: 0.15, yOff: 20, fill: null },
    ],
    gears: true,
    sandfalls: true,
  };
};

BACKDROPS.title = () => {
  const rng = makeRng(2024);
  const far = new WrapBuf(640, 120);
  const body = C('#0d1f23'), rim = C('#1a3a3e'), lit = C('#e8b84a');
  // distant pyramids on one side of the world, the domes of Isfahan on the other
  for (const [px, ph] of [[120, 54], [176, 40], [214, 26]])
    for (let y = 0; y < ph; y++) {
      const half = Math.round((ph - y) * 1.1);
      for (let x = -half; x <= half; x++) far.setW(px + x, 119 - y, x > half - 2 ? rim : body);
    }
  for (let i = 0; i < 3; i++) {
    const cx = 380 + i * 80;
    const r = 12 + i * 3;
    far.rectW(cx - r - 2, 119 - 22, r * 2 + 5, 23, body);
    bgDome(far, cx, 119 - 22, r, Math.round(r * 1.3), body, rim, C('#143034'));
    bgMinaret(far, cx + r + 10, 119, 60 + i * 6, 4, body, rim, lit);
  }
  const dunes = new WrapBuf(560, 90);
  const dl = C('#1a1410'), ds = C('#120e0b'), dc = C('#2e2218');
  for (let x = 0; x < 560; x++) {
    const ph = (x / 560) * TAU;
    const h = 30 + Math.sin(ph * 2) * 10 + Math.sin(ph * 5 + 1) * 6;
    const slope = Math.cos(ph * 2) * 2 + Math.cos(ph * 5 + 1) * 3;
    const top = Math.round(89 - h);
    dunes.colW(x, top, 89, slope > 0 ? dl : ds);
    dunes.setW(x, top, dc);
  }
  void rng;
  return {
    sky: ['#040a0b', '#071214', '#0c1c1e', '#132a2a', '#2a3a32', '#5e4a34', '#a8673a', '#d98a4a'],
    skyH: 0.9,
    stars: 120,
    moon: { x: 0.74, y: 0.2, r: 15, col: '#f7e7bd', shade: '#d9c08e' },
    layers: [
      { c: far.toCanvas(), fx: 0.1, fy: 0, yOff: -26, fill: '#0d1f23' },
      { c: dunes.toCanvas(), fx: 0.3, fy: 0, yOff: -6, fill: '#120e0b', caravan: true, caravanCol: '#0a0807' },
    ],
  };
};

// Gear sprite frames (rotational symmetry lets 6 frames loop seamlessly).
function makeGearFrames(R, teeth, col, hi, sh) {
  const frames = [];
  const sz = R * 2 + 6;
  for (let f = 0; f < 6; f++) {
    const pb = new PixBuf(sz, sz);
    const rot = (f / 6) * (TAU / teeth);
    const cx = sz / 2, cy = sz / 2;
    for (let y = 0; y < sz; y++)
      for (let x = 0; x < sz; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        const a = Math.atan2(dy, dx) - rot;
        const tooth = Math.cos(a * teeth) > 0.2 ? 3 : 0;
        if (d > R + tooth || d < R * 0.22) continue;
        let c = col;
        if (d < R * 0.75 && d > R * 0.6) c = sh;
        else if (Math.abs(((a % (TAU / 6)) + TAU) % (TAU / 6) - TAU / 12) < 0.12 && d < R * 0.6) c = sh;
        if (dx + dy < -R * 0.3 && d > R - 2) c = hi;
        pb.set(x, y, c);
      }
    frames.push(pb.toCanvas());
  }
  return frames;
}

// Runtime backdrop renderer --------------------------------------------------
class Backdrop {
  constructor(theme) {
    this.def = (BACKDROPS[theme] || BACKDROPS.bazaar)();
    this.theme = theme;
    this.skyCanvas = null;
    this.skyKey = '';
    const rng = makeRng(9);
    this.stars = [];
    for (let i = 0; i < (this.def.stars || 0); i++)
      this.stars.push({ x: rng(), y: Math.pow(rng(), 1.6) * 0.55, b: rng(), tw: rng() * TAU, big: rng() < 0.08 });
    if (this.def.gears) {
      this.gearA = makeGearFrames(34, 14, C('#2a1e0c'), C('#5a4016'), C('#18110a'));
      this.gearB = makeGearFrames(20, 10, C('#33240e'), C('#6e4a18'), C('#1a120a'));
    }
    this.caravan = [];
    if (this.def.layers.some((l) => l.caravan)) for (let i = 0; i < 7; i++) this.caravan.push(i * 13 + (i % 2) * 3);
  }
  buildSky(w, h) {
    const key = w + 'x' + h;
    if (key === this.skyKey) return;
    this.skyKey = key;
    const pb = new PixBuf(w, h);
    pb.vgrad(0, 0, w, Math.ceil(h * this.def.skyH), this.def.sky);
    if (this.def.skyH < 1) pb.rect(0, Math.ceil(h * this.def.skyH), w, h, C(this.def.sky[this.def.sky.length - 1]));
    this.skyCanvas = pb.toCanvas();
  }
  // horizon: world y of the main ground line (layers sit on it at the reference view)
  draw(g, cam, vw, vh, horizon, t) {
    this.buildSky(vw, vh);
    g.drawImage(this.skyCanvas, 0, 0);
    const d = this.def;
    const refCam = horizon - vh * 0.64;
    const lift = refCam - cam.y;
    // stars
    for (const s of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + s.b * 2) + s.tw);
      if (tw < 0.25) continue;
      const x = Math.round(((s.x * vw * 1.3 - cam.x * 0.02) % vw + vw) % vw), y = Math.round(s.y * vh + lift * 0.01);
      g.fillStyle = tw > 0.8 ? '#fff6dc' : '#bfae88';
      g.fillRect(x, y, 1, 1);
      if (s.big && tw > 0.7) {
        g.fillStyle = 'rgba(255,240,200,0.5)';
        g.fillRect(x - 1, y, 1, 1);
        g.fillRect(x + 1, y, 1, 1);
        g.fillRect(x, y - 1, 1, 1);
        g.fillRect(x, y + 1, 1, 1);
      }
    }
    if (d.moon) {
      const m = d.moon;
      const mx = Math.round(vw * m.x - cam.x * 0.01), my = Math.round(vh * m.y + lift * 0.015);
      g.globalAlpha = 0.35;
      g.drawImage(lightStamp(m.r * 3, '#e9d6a0', 4), mx - m.r * 3, my - m.r * 3);
      g.globalAlpha = 1;
      pxCircle(g, mx, my, m.r, m.col);
      g.fillStyle = m.shade;
      for (const [cx, cy, r] of [[-4, -3, 3], [3, 2, 2], [-1, 5, 2], [5, -5, 1.5]]) pxCircle(g, mx + cx, my + cy, r, m.shade);
    }
    if (d.sun) {
      const s = d.sun;
      const sx = Math.round(vw * s.x - cam.x * 0.01), sy = Math.round(vh * s.y + lift * 0.015);
      g.globalAlpha = 0.5;
      g.drawImage(lightStamp(s.r * 5, '#fff3d0', 5), sx - s.r * 5, sy - s.r * 5);
      g.globalAlpha = 1;
      pxCircle(g, sx, sy, s.r + 2, '#fff2cc');
      pxCircle(g, sx, sy, s.r, '#fffbea');
    }
    if (d.sandfalls) this.drawSandfalls(g, cam, vw, vh, t, 0.06);
    for (let li = 0; li < d.layers.length; li++) {
      const L = d.layers[li];
      const lw = L.c.width, lh = L.c.height;
      const y = Math.round(vh * 0.64 - lh + L.yOff + lift * L.fy);
      let x = -Math.round(cam.x * L.fx) % lw;
      if (x > 0) x -= lw;
      if (L.shimmer && !Settings.reduceMotion) {
        for (let sy = 0; sy < lh; sy += 3) {
          const off = Math.round(Math.sin(t * 2.2 + (y + sy) * 0.21) * 0.8);
          for (let xx = x; xx < vw; xx += lw) g.drawImage(L.c, 0, sy, lw, 3, xx + off, y + sy, lw, 3);
        }
      } else for (let xx = x; xx < vw; xx += lw) g.drawImage(L.c, xx, y);
      if (L.fill && y + lh < vh) fillR(g, 0, y + lh, vw, vh - y - lh, L.fill);
      if (L.caravan) this.drawCaravan(g, cam, L, x, y, t);
      if (d.gears && li === 0) this.drawGears(g, cam, vw, vh, t, lift);
    }
    if (d.lanterns) this.drawLanternString(g, cam, vw, vh, t, lift);
    if (d.sandfalls) this.drawSandfalls(g, cam, vw, vh, t, 0.22);
  }
  drawCaravan(g, cam, L, lx, ly, t) {
    // camels plod along the dune crest, far away
    const lw = L.c.width;
    const base = (t * 4) % lw;
    for (let i = 0; i < this.caravan.length; i++) {
      const wx = (base + this.caravan[i]) % lw;
      const sx = Math.round(lx + wx), stepPh = Math.floor(t * 4 + i) % 2;
      const ph = (wx / lw) * TAU;
      const h = 40 + Math.sin(ph * 2) * 14 + Math.sin(ph * 5 + 1) * 8 + Math.sin(ph * 9 + 2) * 3;
      const sy = Math.round(ly + 109 - h);
      for (let k = -1; k <= 1; k++) {
        const xx = sx + k * lw;
        if (xx < -10 || xx > Screen.vw + 10) continue;
        g.fillStyle = '#7a4a2a';
        g.fillRect(xx - 3, sy - 5, 6, 2);
        g.fillRect(xx - 2, sy - 6, 3, 1);
        g.fillRect(xx + 3, sy - 7, 1, 3);
        g.fillRect(xx + 3, sy - 8, 2, 1);
        g.fillRect(xx - 3 + stepPh, sy - 3, 1, 3);
        g.fillRect(xx + 2 - stepPh, sy - 3, 1, 3);
        if (i % 3 === 0) g.fillRect(xx - 1, sy - 8, 1, 2);
      }
    }
  }
  drawGears(g, cam, vw, vh, t, lift) {
    const spots = [[80, 0.55, 1], [190, 0.35, -1], [330, 0.62, 1], [470, 0.4, -1]];
    for (const [gx, gy, dir] of spots) {
      const frames = gx % 2 ? this.gearB : this.gearA;
      const f = frames[Math.floor(((t * 3 * dir) % 6 + 6) % 6)];
      let x = ((gx - cam.x * 0.12) % 560 + 560) % 560 - 60;
      const y = Math.round(vh * gy + lift * 0.1 - f.height / 2);
      g.drawImage(f, Math.round(x), y);
    }
  }
  drawSandfalls(g, cam, vw, vh, t, f) {
    const xs = f < 0.1 ? [60, 250, 410] : [150, 380];
    for (const fx of xs) {
      let x = Math.round(((fx - cam.x * f) % 520 + 520) % 520 - 40);
      const w = f < 0.1 ? 3 : 6;
      g.globalAlpha = f < 0.1 ? 0.12 : 0.1;
      fillR(g, x - w * 2, 0, w * 5, vh, '#e8d39a');
      g.globalAlpha = f < 0.1 ? 0.5 : 0.75;
      for (let y = 0; y < vh; y += 2) {
        const o = ((y + t * 90) % 7) | 0;
        fillR(g, x + (o % 3) - 1, y, w - 1, 2, o < 3 ? '#e8c47c' : '#c99a52');
      }
      g.globalAlpha = 1;
    }
  }
  drawLanternString(g, cam, vw, vh, t, lift) {
    const span = 150, f = 0.42;
    const ox = -((cam.x * f) % span);
    const y0 = Math.round(vh * 0.2 + lift * 0.2);
    for (let sx = ox - span; sx < vw + span; sx += span) {
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        const x = Math.round(sx + u * span), y = Math.round(y0 + Math.sin(u * Math.PI) * 22);
        g.fillStyle = '#20140e';
        g.fillRect(x, y, 1, 1);
        if (i % 5 === 3) {
          const cols = ['#f4cf62', '#d9482f', '#3fb5a3', '#f07a22'];
          const col = cols[(i + Math.round(sx)) & 3];
          const fl = 0.75 + 0.25 * Math.sin(t * 7 + i + sx);
          g.globalAlpha = 0.25 * fl;
          g.drawImage(lightStamp(6, col, 3), x - 6, y - 3);
          g.globalAlpha = 1;
          g.fillStyle = '#20140e';
          g.fillRect(x, y + 1, 1, 1);
          g.fillStyle = col;
          g.fillRect(x - 1, y + 2, 3, 3);
          g.fillStyle = '#fff1b3';
          g.fillRect(x, y + 3, 1, 1);
        }
      }
    }
  }
}

// SQUEAKBORNE :: art (helpers, the mouse, weapons, hats, props, pickups)
// All art is drawn procedurally into small canvases, auto-outlined and cached.

function outlined(src, col = C.ink) {
  const w = src.width + 2, h = src.height + 2;
  const cv = makeCanvas(w, h), c = ctx2d(cv);
  c.drawImage(src, 0, 1); c.drawImage(src, 2, 1); c.drawImage(src, 1, 0); c.drawImage(src, 1, 2);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  c.drawImage(src, 1, 1);
  return cv;
}
function flipped(src) {
  const cv = makeCanvas(src.width, src.height), c = ctx2d(cv);
  c.translate(src.width, 0); c.scale(-1, 1); c.drawImage(src, 0, 0);
  return cv;
}
function silhouette(src, col = '#fff') {
  const cv = makeCanvas(src.width, src.height), c = ctx2d(cv);
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
function mkSprite(w, h, fn, o = {}) {
  const raw = makeCanvas(w, h), c = ctx2d(raw);
  fn(c, w, h);
  const img = o.noOutline ? raw : outlined(raw, o.ol || C.ink);
  const fl = flipped(img);
  return { img, fl, wh: silhouette(img), whf: silhouette(fl), w: img.width, h: img.height, tints: {} };
}
function mkAnim(w, h, n, fn, o) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(mkSprite(w, h, (c) => fn(c, i, n), o));
  return a;
}
// draw a cached sprite; anchor bottom-center by default
function spr(s, x, y, flip, flash, o) {
  if (!s) return;
  let img = flash ? (flip ? s.whf : s.wh) : flip ? s.fl : s.img;
  if (o && o.tint) {
    const key = o.tint + (flip ? 'f' : '');
    img = s.tints[key] || (s.tints[key] = silhouette(flip ? s.fl : s.img, o.tint));
  }
  const sx = (o && o.sx) || 1, sy = (o && o.sy) || 1;
  const ax = o && o.ax !== undefined ? o.ax : 0.5, ay = o && o.ay !== undefined ? o.ay : 1;
  if (o && o.alpha !== undefined) g.globalAlpha = o.alpha;
  if (o && o.rot) {
    g.save(); g.translate(round(x), round(y)); g.rotate(o.rot);
    g.drawImage(img, round(-s.w * sx * ax), round(-s.h * sy * ay), round(s.w * sx), round(s.h * sy));
    g.restore();
  } else if (sx === 1 && sy === 1) g.drawImage(img, round(x - s.w * ax), round(y - s.h * ay));
  else g.drawImage(img, round(x - s.w * sx * ax), round(y - s.h * sy * ay), round(s.w * sx), round(s.h * sy));
  if (o && o.alpha !== undefined) g.globalAlpha = 1;
}
// shaded ellipse: dark rim on the bottom, base, small highlight
function blob(c, cx, cy, rx, ry, dark, base, light) {
  ELL(c, cx, cy, rx, ry, dark);
  ELL(c, cx, cy - 1, max(0, rx - 1), max(0, ry - 1), base);
  if (light && rx > 2) ELL(c, cx - floor(rx / 3), cy - max(1, floor(ry / 2)), max(0, floor(rx / 3) - 1), max(0, floor(ry / 4)), light);
}
function dither(c, x, y, w, h, col, density = 0.5, seed = 0) {
  c.fillStyle = col;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (hash2(x + i, y + j, seed) < density && ((i + j) & 1) === 0) c.fillRect(x + i, y + j, 1, 1);
}

// ---------------- the mouse ----------------
const PCV = makeCanvas(64, 56), PCX = ctx2d(PCV);
const POCV = makeCanvas(66, 58), POCX = ctx2d(POCV);
const PWCV = makeCanvas(66, 58), PWCX = ctx2d(PWCV);
const POX = 32, POY = 46;
const MF = { sh: '#7a6a68', base: '#b8a7a0', hi: '#e2d5ca', belly: '#f4eadf' };

function chainInit(n, x, y) { const a = []; for (let i = 0; i < n; i++) a.push({ x, y: y + i, px: x, py: y + i }); return a; }
function chainStep(ch, rx, ry, seg, grav, damp, wx, wave, t, shape, k = 0.1) {
  ch[0].x = rx; ch[0].y = ry; ch[0].px = rx; ch[0].py = ry;
  for (let i = 1; i < ch.length; i++) {
    const p = ch[i];
    const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
    p.px = p.x; p.py = p.y;
    p.x += vx + wx + (wave ? sin(t * 0.12 + i * 0.9) * wave : 0);
    p.y += vy + grav;
    if (shape) { const s = shape(i); p.x += (rx + s[0] - p.x) * k; p.y += (ry + s[1] - p.y) * k; }
  }
  for (let k = 0; k < 3; k++) {
    for (let i = 1; i < ch.length; i++) {
      const a = ch[i - 1], b = ch[i];
      const dx = b.x - a.x, dy = b.y - a.y, d = hypot(dx, dy) || 0.001;
      const diff = (d - seg) / d;
      if (i === 1) { b.x -= dx * diff; b.y -= dy * diff; } else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
    }
    if (lv) for (let i = 1; i < ch.length; i++) { const p = ch[i]; if (solidPx(p.x, p.y)) { p.x = p.px; p.y = p.py; } }
  }
}

// pose: {bob, lean, bf:[x,y], ff:[x,y], earBack, earUp, eye, mouth, hand:[x,y]|null, curl, crouch, hatOff, t}
function renderMouse(p, pose) {
  const c = PCX;
  c.clearRect(0, 0, PCV.width, PCV.height);
  const ox = POX, oy = POY + (pose.bob || 0);
  const f = p.face, ax = p.x + p.w / 2, ay = p.y + p.h;
  const L = (q) => [POX + (q.x - ax) * f, POY + (q.y - ay)];
  // tail
  const T = p.tail;
  for (let i = 0; i < T.length - 1; i++) {
    const [x0, y0] = L(T[i]), [x1, y1] = L(T[i + 1]);
    LINE(c, x0, y0, x1, y1, i < 3 ? C.pk1 : C.pk2, i < 2 ? 2 : 1);
  }
  // scarf tails (behind body)
  const S = p.scarf;
  for (let i = 0; i < S.length - 1; i++) {
    const [x0, y0] = L(S[i]), [x1, y1] = L(S[i + 1]);
    LINE(c, x0, y0, x1, y1, i % 2 ? C.rd1 : C.rd2, 2);
  }
  if (pose.curl) {
    const cx = ox, cy = oy - 7;
    blob(c, cx, cy, 6, 6, MF.sh, MF.base, MF.hi);
    DISC(c, cx - 2, cy - 5, 3, MF.sh); DISC(c, cx - 2, cy - 5, 1, C.pk0);
    DISC(c, cx + 3, cy - 4, 3, MF.base); DISC(c, cx + 3, cy - 4, 1, C.pk1);
    R(c, cx - 5, cy + 1, 10, 2, C.rd2);
    R(c, cx + 3, cy - 1, 2, 2, C.ink); PX(c, cx + 3, cy - 1, C.wh);
    R(c, cx + 6, cy, 2, 2, C.pk1);
    drawHat(c, p, cx, cy - 6, pose);
  } else {
    const cr = pose.crouch || 0;
    const lean = pose.lean || 0;
    // back foot
    const bf = pose.bf || [0, 0], ff = pose.ff || [0, 0];
    R(c, ox - 4 + bf[0], oy - 2 + bf[1], 3, 2, C.pk0);
    // body
    blob(c, ox, oy - 5 + floor(cr / 2), 4, 3 - (cr > 1 ? 1 : 0), MF.sh, MF.base, null);
    ELL(c, ox + 1, oy - 4 + floor(cr / 2), 2, 1, MF.belly);
    // front foot
    R(c, ox + 1 + ff[0], oy - 2 + ff[1], 3, 2, C.pk1);
    PX(c, ox + 3 + ff[0], oy - 2 + ff[1], C.pk2);
    // head
    const hx = ox + 1 + lean, hy = oy - 12 + cr;
    const eb = pose.earBack || 0, eu = pose.earUp || 0;
    DISC(c, hx - 4 - eb, hy - 5 - eu, 3, MF.sh);
    DISC(c, hx - 4 - eb, hy - 5 - eu, 1, C.pk0);
    DISC(c, hx, hy, 4, MF.sh);
    DISC(c, hx, hy - 1, 3, MF.base);
    R(c, hx - 2, hy - 3, 2, 1, MF.hi);
    // snout + nose
    ELL(c, hx + 4, hy + 1, 2, 1, MF.base);
    R(c, hx + 3, hy, 3, 1, MF.hi);
    R(c, hx + 6, hy - 1, 2, 2, C.pk1);
    PX(c, hx + 6, hy - 1, C.pk3);
    if (pose.mouth) { R(c, hx + 3, hy + 2, 3, 1, C.pk0); PX(c, hx + 4, hy + 3, C.pk0); }
    // eye
    const ex = hx + 1, ey = hy - 2;
    switch (pose.eye) {
      case 'blink': R(c, ex, ey + 1, 2, 1, C.ink); break;
      case 'x': PX(c, ex, ey, C.ink); PX(c, ex + 2, ey, C.ink); PX(c, ex + 1, ey + 1, C.ink); PX(c, ex, ey + 2, C.ink); PX(c, ex + 2, ey + 2, C.ink); break;
      case 'happy': PX(c, ex, ey + 1, C.ink); PX(c, ex + 1, ey, C.ink); PX(c, ex + 2, ey + 1, C.ink); break;
      case 'angry': R(c, ex, ey, 2, 3, C.ink); PX(c, ex + 1, ey + 1, C.wh); R(c, ex - 1, ey - 1, 3, 1, C.fu0); break;
      case 'wide': R(c, ex, ey - 1, 2, 4, C.ink); PX(c, ex, ey - 1, C.wh); PX(c, ex + 1, ey + 1, C.wh); break;
      default: R(c, ex, ey, 2, 3, C.ink); PX(c, ex, ey, C.wh);
    }
    // scarf band
    R(c, hx - 4, hy + 3, 7, 2, C.rd2);
    R(c, hx - 4, hy + 4, 7, 1, C.rd1);
    PX(c, hx - 1, hy + 3, C.rd3);
    if (!pose.hatOff) drawHat(c, p, hx - 1, hy - 5, pose);
    // front ear sits over the hat brim
    DISC(c, hx + 2 - eb, hy - 6 - eu, 3, MF.base);
    DISC(c, hx + 2 - eb, hy - 6 - eu, 1, C.pk1);
    PX(c, hx + 1 - eb, hy - 8 - eu, MF.hi);
    // arm + hand
    if (pose.hand) {
      const sx = ox + 1, sy = oy - 7 + floor(cr / 2);
      LINE(c, sx, sy, ox + pose.hand[0], oy + pose.hand[1], MF.sh, 1);
      R(c, ox + pose.hand[0] - 1, oy + pose.hand[1] - 1, 2, 2, C.pk1);
    }
  }
  // outline pass
  const o = POCX;
  o.clearRect(0, 0, POCV.width, POCV.height);
  o.drawImage(PCV, 0, 1); o.drawImage(PCV, 2, 1); o.drawImage(PCV, 1, 0); o.drawImage(PCV, 1, 2);
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = C.ink; o.fillRect(0, 0, POCV.width, POCV.height);
  o.globalCompositeOperation = 'source-over';
  o.drawImage(PCV, 1, 1);
  if (!pose.curl) {
    const hx = ox + 1 + (pose.lean || 0) + 1, hy = oy - 12 + (pose.crouch || 0) + 1;
    const wig = floor(sin((pose.t || 0) * 0.2) * 0.8);
    PX(o, hx + 7, hy + 1 + wig, C.fu4); PX(o, hx + 8, hy + 1 + wig, C.fu4); PX(o, hx + 9, hy + wig, C.fu4);
    PX(o, hx + 7, hy + 2, C.fu3); PX(o, hx + 8, hy + 3, C.fu3);
  }
}
function drawMouseAt(p, x, y, sx, sy, rot, flash, alpha, tint) {
  let src = POCV;
  if (flash || tint) {
    PWCX.clearRect(0, 0, PWCV.width, PWCV.height);
    PWCX.drawImage(POCV, 0, 0);
    PWCX.globalCompositeOperation = 'source-in';
    PWCX.fillStyle = flash ? '#fff' : tint; PWCX.fillRect(0, 0, PWCV.width, PWCV.height);
    PWCX.globalCompositeOperation = 'source-over';
    src = PWCV;
  }
  g.save();
  if (alpha !== undefined) g.globalAlpha = alpha;
  if (rot) {
    g.translate(round(x), round(y - 7));
    g.rotate(rot * p.face);
    g.scale(p.face * sx, sy);
    g.drawImage(src, -(POX + 1), -(POY + 1) + 7);
  } else {
    g.translate(round(x), round(y));
    g.scale(p.face * sx, sy);
    g.drawImage(src, -(POX + 1), -(POY + 1));
  }
  g.restore();
}

// ---------------- hats ----------------
const HATS = {
  none: { name: 'Bare Head', desc: 'The wind in your ears.' },
  acorn: { name: 'Acorn Cap', desc: 'Classic. Crunchy. Free.', draw(c, x, y) { ELL(c, x, y - 1, 4, 2, C.br2); R(c, x - 4, y - 1, 9, 2, C.br1); dither(c, x - 3, y - 3, 7, 2, C.br3, 0.7, 3); R(c, x, y - 5, 1, 2, C.br1); } },
  thimble: { name: 'Thimble Helm', desc: 'Took it off the Rat King. It still smells like him.', draw(c, x, y) { R(c, x - 3, y - 5, 7, 6, C.st4); R(c, x - 4, y, 9, 2, C.st3); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) PX(c, x - 2 + i * 2, y - 4 + j * 2, C.st2); R(c, x - 2, y - 6, 5, 1, C.st4); } },
  bottlecap: { name: 'Bottle Cap', desc: 'Fizzy. Defeated a robot vacuum for this.', draw(c, x, y) { R(c, x - 4, y - 2, 9, 3, C.rd2); for (let i = 0; i < 5; i++) PX(c, x - 4 + i * 2, y + 1, C.rd1); R(c, x - 3, y - 3, 7, 1, C.st4); PX(c, x, y - 1, C.yl1); } },
  toque: { name: 'Chef Toque', desc: 'Zis is a very serious hat.', draw(c, x, y) { R(c, x - 3, y - 2, 7, 3, C.fu4); DISC(c, x - 2, y - 5, 2, C.fu4); DISC(c, x + 2, y - 6, 2, C.fu4); DISC(c, x, y - 7, 2, C.wh); R(c, x - 3, y, 7, 1, C.fu3); } },
  crown: { name: 'Tiny Crown', desc: 'Ruler of the house. Technically.', draw(c, x, y) { R(c, x - 3, y - 2, 7, 3, C.yl0); PX(c, x - 3, y - 4, C.yl1); PX(c, x - 3, y - 3, C.yl1); PX(c, x, y - 4, C.yl1); PX(c, x, y - 3, C.yl1); PX(c, x + 3, y - 4, C.yl1); PX(c, x + 3, y - 3, C.yl1); PX(c, x, y - 1, C.rd2); PX(c, x - 2, y - 1, C.tl3); PX(c, x + 2, y - 1, C.tl3); } },
  party: { name: 'Party Hat', desc: 'For dying 10 times. Congratulations?', draw(c, x, y) { POLY(c, [x - 4, y + 1, x + 4, y + 1, x + 1, y - 9, x, y - 9], C.tl2); PX(c, x - 1, y - 2, C.yl1); PX(c, x + 1, y - 5, C.pk2); PX(c, x - 2, y - 1, C.pk2); DISC(c, x, y - 9, 1, C.yl1); } },
  propeller: { name: 'Propeller Beanie', desc: 'Does not help you fly. Spins anyway.', draw(c, x, y, t) { ELL(c, x, y - 1, 4, 2, C.rd2); R(c, x - 4, y - 1, 3, 2, C.yl1); R(c, x + 2, y - 1, 3, 2, C.bl2); R(c, x, y - 4, 1, 2, C.st3); const w = floor(abs(sin(t * 0.5)) * 4) + 1; R(c, x - w + 1, y - 5, w * 2 - 1, 1, C.yl1); } },
  cone: { name: 'Traffic Cone', desc: 'Found in a secret room. Nobody knows why.', draw(c, x, y) { POLY(c, [x - 4, y + 1, x + 5, y + 1, x + 1, y - 8, x, y - 8], C.or1); R(c, x - 2, y - 3, 5, 1, C.fu4); R(c, x - 4, y, 9, 2, C.or0); } },
  pea: { name: 'A Single Pea', desc: 'Balanced perfectly. Do not ask.', draw(c, x, y) { DISC(c, x, y - 2, 2, C.gr3); PX(c, x - 1, y - 3, C.gr4); } },
  viking: { name: 'Viking Helm', desc: 'For 500 enemies flattened.', draw(c, x, y) { ELL(c, x, y - 1, 4, 3, C.st3); R(c, x - 4, y, 9, 2, C.br2); LINE(c, x - 4, y - 1, x - 6, y - 5, C.fu4); LINE(c, x + 4, y - 1, x + 6, y - 5, C.fu4); PX(c, x - 1, y - 3, C.st4); } },
  banana: { name: 'Banana Peel', desc: 'For the spike enthusiasts.', draw(c, x, y) { ELL(c, x, y - 1, 3, 2, C.yl1); LINE(c, x - 3, y - 1, x - 5, y + 3, C.yl1, 2); LINE(c, x + 3, y - 1, x + 5, y + 3, C.yl0, 2); R(c, x, y - 4, 1, 2, C.br1); } },
  catears: { name: 'Cat Ears', desc: 'Know thy enemy. Become thy enemy.', draw(c, x, y) { R(c, x - 4, y - 1, 9, 1, C.dk2); POLY(c, [x - 4, y, x - 1, y, x - 3, y - 5], C.dk2); POLY(c, [x + 1, y, x + 4, y, x + 3, y - 5], C.dk2); PX(c, x - 3, y - 2, C.pk1); PX(c, x + 3, y - 2, C.pk1); } },
  halo: { name: 'Halo', desc: 'Beat the cat without eating cheese.', draw(c, x, y, t) { const by = y - 5 + round(sin(t * 0.08)); R(c, x - 3, by, 7, 1, C.yl1); PX(c, x - 4, by + 1, C.yl1); PX(c, x + 4, by + 1, C.yl1); R(c, x - 3, by + 2, 7, 1, C.yl1); } },
  fez: { name: 'Fez', desc: 'Fezzes are cool. Bought it from a frog.', draw(c, x, y, t) { R(c, x - 3, y - 4, 7, 5, C.rd2); R(c, x - 3, y - 4, 7, 1, C.rd3); R(c, x, y - 5, 1, 1, C.ink); LINE(c, x, y - 5, x - 3 + round(sin(t * 0.1)), y - 1, C.yl1); } },
  wizard: { name: 'Wizard Hat', desc: 'Win with 10+ Cunning.', draw(c, x, y) { POLY(c, [x - 5, y + 1, x + 6, y + 1, x + 2, y - 9, x - 3, y - 4], C.bl1); R(c, x - 5, y, 11, 2, C.bl2); PX(c, x, y - 3, C.yl1); PX(c, x + 2, y - 6, C.yl2); } },
  bucket: { name: 'Bucket', desc: 'Win with 10+ Grit. Ding.', draw(c, x, y) { R(c, x - 4, y - 5, 9, 7, C.st3); R(c, x - 4, y - 5, 9, 1, C.st4); R(c, x - 3, y - 2, 1, 3, C.st2); LINE(c, x - 4, y - 4, x - 6, y + 1, C.st2); } },
  horns: { name: 'Devil Horns', desc: 'Win with 10+ Fury.', draw(c, x, y) { POLY(c, [x - 4, y + 1, x - 1, y + 1, x - 5, y - 5], C.rd2); POLY(c, [x + 2, y + 1, x + 5, y + 1, x + 6, y - 5], C.rd2); } },
};
function drawHat(c, p, x, y, pose) {
  const h = HATS[p.hat];
  if (h && h.draw) h.draw(c, x, y, pose.t || 0);
}

// ---------------- weapon shapes ----------------
// shapes are lists in weapon-axis coords: ['l', d0, p0, d1, p1, col, th] or ['d', d, p, r, col]
const AXP = (x, y, a, d, p) => [x + cos(a) * d - sin(a) * p, y + sin(a) * d + cos(a) * p];
function drawShape(c, x, y, a, shape, sc = 1) {
  for (let pass = 0; pass < 2; pass++) {
    for (const s of shape) {
      if (s[0] === 'l') {
        const [x0, y0] = AXP(x, y, a, s[1] * sc, s[2] * sc), [x1, y1] = AXP(x, y, a, s[3] * sc, s[4] * sc);
        LINE(c, x0, y0, x1, y1, pass ? s[5] : C.ink, (s[6] || 1) + (pass ? 0 : 2));
      } else if (s[0] === 'd') {
        const [dx, dy] = AXP(x, y, a, s[1] * sc, s[2] * sc);
        DISC(c, dx, dy, s[3] * sc + (pass ? 0 : 1), pass ? s[4] : C.ink);
      } else if (s[0] === 'p' && pass) {
        const [dx, dy] = AXP(x, y, a, s[1] * sc, s[2] * sc);
        PX(c, dx, dy, s[3]);
      }
    }
  }
}
const SHAPES = {
  needle: [['l', -3, 0, 16, 0, C.st5, 1], ['p', 16, 0, C.wh], ['l', -3, 0, -6, 2, C.rd2, 1], ['p', -3, 0, C.st3]],
  fork: [['l', -3, 0, 9, 0, C.st4, 1], ['l', 9, -2, 9, 2, C.st4, 1], ['l', 9, -2, 14, -2, C.st5, 1], ['l', 9, 0, 15, 0, C.st5, 1], ['l', 9, 2, 14, 2, C.st5, 1]],
  spoon: [['l', -4, 0, 9, 0, C.br3, 2], ['d', 13, 0, 3, C.br4], ['p', 12, -1, C.br5]],
  toothpick: [['l', -2, 0, 10, 0, C.br5, 1], ['p', 10, 0, C.wh]],
  match: [['l', -3, 0, 10, 0, C.br4, 2], ['d', 11, 0, 2, C.rd2], ['p', 11, -1, C.rd3]],
  tenderizer: [['l', -3, 0, 9, 0, C.br2, 2], ['l', 9, -4, 9, 4, C.st3, 5], ['p', 11, -3, C.st5], ['p', 11, 0, C.st5], ['p', 11, 3, C.st5]],
  baguette: [['l', -6, 0, 13, 0, C.br3, 4], ['l', -5, -1, 12, -1, C.br4, 1], ['l', -2, -2, 0, 1, C.br2, 1], ['l', 3, -2, 5, 1, C.br2, 1], ['l', 8, -2, 10, 1, C.br2, 1]],
  rollingpin: [['l', -2, 0, 2, 0, C.br2, 2], ['l', 2, 0, 15, 0, C.br4, 5], ['l', 3, -2, 14, -2, C.br5, 1], ['l', 15, 0, 19, 0, C.br2, 2]],
  chopsticks: [['l', -2, -2, 14, -1, C.br1, 1], ['l', -2, 2, 14, 1, C.br1, 1], ['p', 14, -1, C.rd2], ['p', 14, 1, C.rd2]],
  corkscrew: [['l', -2, -4, -2, 4, C.br2, 2], ['l', -2, 0, 5, 0, C.st3, 1], ['l', 5, 0, 7, -2, C.st4, 1], ['l', 7, -2, 9, 2, C.st4, 1], ['l', 9, 2, 11, -2, C.st4, 1], ['l', 11, -2, 13, 1, C.st4, 1], ['l', 13, 1, 15, 0, C.st5, 1]],
  paperclip: [['l', -3, 0, 18, 0, C.st5, 1], ['l', 1, -3, 1, 3, C.st4, 1], ['l', -3, 1, -1, 3, C.st4, 1], ['p', 18, 0, C.wh]],
  spaghetti: [['l', -2, 0, 3, 0, C.yl1, 1]],
  slingshot: [['l', -2, 0, 5, 0, C.br2, 2], ['l', 5, 0, 9, -3, C.br2, 1], ['l', 5, 0, 9, 3, C.br2, 1], ['l', 9, -3, 9, 3, C.rd2, 1]],
  crossbow: [['l', -3, 0, 9, 0, C.br2, 2], ['l', 6, -5, 9, 0, C.st3, 1], ['l', 9, 0, 6, 5, C.st3, 1], ['l', 6, -5, 3, 0, C.fu4, 1], ['l', 3, 0, 6, 5, C.fu4, 1]],
  straw: [['l', -2, 0, 12, 0, C.fu4, 2], ['p', 1, 0, C.rd2], ['p', 4, 0, C.rd2], ['p', 7, 0, C.rd2], ['p', 10, 0, C.rd2]],
  boomerang: [['l', 0, 0, 6, -5, C.br4, 2], ['l', 0, 0, 6, 5, C.br4, 2], ['p', 5, -4, C.br5]],
  hotsauce: [['l', -1, 0, 6, 0, C.rd2, 4], ['l', 6, 0, 9, 0, C.rd1, 2], ['l', 9, 0, 10, 0, C.gr2, 2], ['l', 1, -1, 4, -1, C.fu4, 1]],
  cork: [['l', -2, 2, 0, 0, C.or1, 2], ['l', 0, 0, 9, 0, C.yl1, 3], ['l', 9, 0, 11, 0, C.br4, 3]],
  capshield: [['d', 3, 0, 5, C.st4], ['d', 3, 0, 4, C.rd2], ['d', 3, 0, 1, C.yl1]],
  potlid: [['d', 3, 0, 6, C.st3], ['d', 3, 0, 5, C.st4], ['d', 3, 0, 1, C.br2]],
};
const _icons = {};
function iconSprite(key, drawFn) {
  if (_icons[key]) return _icons[key];
  return (_icons[key] = mkSprite(16, 16, drawFn));
}
function weaponIcon(shape, key) {
  return iconSprite('w_' + key, (c) => {
    const s = SHAPES[shape];
    let len = 0;
    for (const e of s) if (e[0] === 'l') len = max(len, e[3], e[1] < 0 ? -e[1] : 0); else if (e[0] === 'd') len = max(len, e[1] + e[3]);
    const sc = len > 14 ? 14 / len : 1;
    drawShape(c, 4, 12, -PI / 4, s, sc);
  });
}

// ---------------- small world sprites ----------------
let SPR = {};
function buildCommonSprites() {
  SPR.coin = mkAnim(6, 6, 4, (c, i) => {
    const w = [3, 2, 1, 2][i];
    ELL(c, 3, 3, w, 2, C.or0); ELL(c, 3, 2, max(0, w - 1), 1, C.yl1);
    if (w > 1) { PX(c, 2, 2, C.or0); PX(c, 4, 2, C.or0); }
  });
  SPR.crumb = mkAnim(5, 5, 2, (c, i) => { R(c, 1, 1, 3, 3, C.br4); PX(c, 1, 1, i ? C.wh : C.br5); PX(c, 3, 3, C.br3); });
  SPR.cheese = mkSprite(12, 10, (c) => {
    POLY(c, [0, 9, 12, 9, 12, 3, 0, 6], C.yl0);
    POLY(c, [0, 6, 12, 3, 12, 1, 1, 5], C.yl1);
    R(c, 0, 8, 12, 2, C.or1); DISC(c, 4, 7, 1, C.or1); PX(c, 9, 5, C.or1); PX(c, 7, 8, C.yl2);
  });
  SPR.bread = mkSprite(12, 8, (c) => { ELL(c, 6, 4, 5, 3, C.br3); ELL(c, 6, 3, 4, 2, C.br4); PX(c, 4, 3, C.br5); LINE(c, 3, 2, 4, 4, C.br2); LINE(c, 7, 2, 8, 4, C.br2); });
  SPR.blueprint = mkSprite(12, 10, (c) => { R(c, 1, 1, 10, 8, C.bl2); R(c, 2, 2, 8, 6, C.bl1); LINE(c, 3, 6, 6, 3, C.bl3); R(c, 6, 3, 3, 3, C.bl3); R(c, 0, 0, 2, 10, C.fu3); R(c, 10, 0, 2, 10, C.fu3); });
  SPR.chest = mkAnim(20, 16, 2, (c, i) => {
    R(c, 1, 6, 18, 10, C.br2); R(c, 1, 6, 18, 2, C.br3); R(c, 1, 14, 18, 2, C.br1);
    R(c, 3, 6, 2, 10, C.yl0); R(c, 15, 6, 2, 10, C.yl0);
    if (i === 0) { R(c, 1, 1, 18, 5, C.br3); R(c, 2, 1, 16, 1, C.br4); R(c, 3, 1, 2, 5, C.yl0); R(c, 15, 1, 2, 5, C.yl0); R(c, 8, 4, 4, 4, C.yl1); PX(c, 9, 5, C.ink); }
    else { R(c, 1, 0, 18, 3, C.br1); R(c, 2, 3, 16, 3, C.ink); }
  });
  SPR.cursed = mkAnim(20, 16, 2, (c, i) => {
    R(c, 1, 6, 18, 10, C.vi1); R(c, 1, 6, 18, 2, C.vi2); R(c, 1, 14, 18, 2, C.vi0);
    R(c, 3, 6, 2, 10, C.st2); R(c, 15, 6, 2, 10, C.st2);
    if (i === 0) { R(c, 1, 1, 18, 5, C.vi2); R(c, 8, 3, 4, 5, C.fu4); PX(c, 9, 4, C.ink); PX(c, 10, 4, C.ink); PX(c, 9, 6, C.ink); }
    else { R(c, 1, 0, 18, 3, C.vi0); R(c, 2, 3, 16, 3, C.ink); }
  });
  SPR.plate = mkSprite(18, 6, (c) => { ELL(c, 9, 3, 8, 2, C.fu3); ELL(c, 9, 2, 6, 1, C.fu4); R(c, 3, 4, 12, 1, C.st4); });
  SPR.pedestal = mkSprite(16, 10, (c) => { R(c, 2, 0, 12, 3, C.st3); R(c, 4, 3, 8, 5, C.st2); R(c, 1, 8, 14, 2, C.st3); R(c, 2, 0, 12, 1, C.st4); });
  SPR.door = mkAnim(26, 34, 2, (c, i) => {
    R(c, 0, 4, 26, 30, C.st2); DISC(c, 13, 13, 12, C.st2); R(c, 2, 4, 22, 30, C.st3);
    DISC(c, 13, 13, 10, C.st3);
    if (i === 0) { R(c, 4, 8, 18, 26, C.br1); DISC(c, 13, 14, 8, C.br1); for (let k = 0; k < 4; k++) R(c, 6 + k * 4, 8, 1, 26, C.br0); R(c, 18, 21, 2, 2, C.yl0); }
    else { R(c, 4, 8, 18, 26, C.ink); DISC(c, 13, 14, 8, C.ink); R(c, 5, 12, 16, 22, C.night); }
  });
  SPR.spring = mkAnim(16, 10, 2, (c, i) => {
    if (i === 0) { R(c, 1, 6, 14, 4, C.st2); for (let k = 0; k < 3; k++) R(c, 3, 2 + k * 2 - 2, 10, 1, C.st4); R(c, 0, 0, 16, 2, C.rd2); }
    else { R(c, 1, 6, 14, 4, C.st2); for (let k = 0; k < 2; k++) R(c, 3, 5 - k, 10, 1, C.st4); R(c, 0, 3, 16, 2, C.rd3); }
  });
  SPR.mousetrap = mkAnim(18, 8, 2, (c, i) => {
    R(c, 0, 5, 18, 3, C.br3); R(c, 0, 5, 18, 1, C.br4);
    if (i === 0) { LINE(c, 2, 4, 9, 4, C.st4); LINE(c, 9, 4, 9, 0, C.st4); R(c, 12, 3, 3, 2, C.yl1); }
    else { LINE(c, 2, 4, 16, 4, C.st5, 2); }
  });
  SPR.burner = mkSprite(28, 5, (c) => { R(c, 0, 1, 28, 4, C.st1); RING(c, 14, 2, 10, C.st3); for (let k = 0; k < 7; k++) PX(c, 3 + k * 4, 2, C.st4); });
  SPR.sign = mkSprite(16, 16, (c) => { R(c, 7, 7, 2, 9, C.br2); R(c, 1, 1, 14, 8, C.br3); R(c, 1, 1, 14, 1, C.br4); R(c, 3, 3, 9, 1, C.br1); R(c, 3, 5, 7, 1, C.br1); });
  SPR.dummy = mkAnim(16, 24, 2, (c, i) => {
    R(c, 7, 12, 2, 12, C.br2); R(c, 2, 22, 12, 2, C.br1);
    blob(c, 8, 10 + i, 5, 5, C.br3, C.br4, C.br5);
    DISC(c, 8, 4 + i, 3, C.br4); PX(c, 7, 3 + i, C.ink); PX(c, 9, 3 + i, C.ink); R(c, 7, 6 + i, 3, 1, C.br2);
    LINE(c, 3, 9 + i, 13, 9 + i, C.br2); PX(c, 8, 8 + i, C.rd2);
  });
  SPR.wardrobe = mkSprite(26, 32, (c) => {
    R(c, 0, 2, 26, 30, C.br1); R(c, 1, 3, 24, 28, C.br2); R(c, 2, 4, 10, 26, C.br3); R(c, 14, 4, 10, 26, C.br3);
    R(c, 10, 15, 2, 4, C.yl0); R(c, 14, 15, 2, 4, C.yl0); R(c, 0, 0, 26, 3, C.br3); R(c, 2, 30, 4, 2, C.br0); R(c, 20, 30, 4, 2, C.br0);
  });
  // rarity beam
  SPR.beam = null;
}

// tiny NPC portraits are drawn live (see entities)

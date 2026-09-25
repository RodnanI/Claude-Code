// ---------------------------------------------------------------------------
// Pixel rig renderer.
// A pose (joint angles) is solved into joint positions; every body part is
// rasterized as a lit primitive into a material buffer; a post pass turns the
// buffer into pixel art with depth separation lines between overlapping
// limbs, a rim light on lit edges and selective (material tinted) outlines.
// Rendered frames are cached per (costume, animation, key, sub-frame).
//
// Angle convention: 0 = down, 90 = forward (+x), 180 = up. Characters are
// authored facing right and mirrored at draw time.
// ---------------------------------------------------------------------------
const LX = 0.45, LY = -0.75, LZ = 0.48; // light from the upper front
const GR = { BARM: 1, BWEAP: 2, BLEG: 3, ROBEB: 4, BODY: 5, FLEG: 6, ROBEF: 7, HEAD: 8, FARM: 9, FWEAP: 10 };
const F_KEEP = 1, F_NOOUT = 2, F_EMIT = 4, F_NOSEP = 8;
const NOSEP = new Set([
  GR.ROBEB * 16 + GR.BODY, GR.BODY * 16 + GR.ROBEF, GR.ROBEB * 16 + GR.ROBEF,
  GR.BARM * 16 + GR.BWEAP, GR.FARM * 16 + GR.FWEAP,
]);
const SH_CLOTH = { dither: 0.55 };
const SH_SKIN = { bias: 0.15 };
const SH_METAL = { shiny: true, bias: 0.3 };
const SH_BLADE = { shiny: true, bias: 0.9, max: 4 };
const SH_FLAT = {};

class PixBuf {
  constructor(w, h, ax, ay) {
    this.w = w; this.h = h; this.ax = ax; this.ay = ay;
    const n = w * h;
    this.m = new Uint8Array(n); this.s = new Int8Array(n); this.g = new Uint8Array(n); this.f = new Uint8Array(n);
  }
  clear() { this.m.fill(0); this.s.fill(0); this.g.fill(0); this.f.fill(0); }
}
const RB = new PixBuf(152, 136, 76, 104);

function bput(B, x, y, m, s, g, f) {
  if (x < 0 || y < 0 || x >= B.w || y >= B.h) return;
  const i = y * B.w + x;
  B.m[i] = m; B.s[i] = s; B.g[i] = g; B.f[i] = f;
}

function lumShade(l, x, y, o) {
  let v = (l + 0.9) * 2 + (o.bias || 0);
  if (o.dither) v += (bayer(x, y) - 0.5) * o.dither;
  let s = Math.floor(v);
  const mx = o.max === undefined ? 3 : o.max;
  if (s > mx) s = mx;
  if (s < 0) s = 0;
  if (o.shiny && l > 0.84) s = 4;
  return s;
}

// Tapered capsule from a to b with radii ra, rb; lit like a cylinder.
// o.band: [[t0, t1, mat, shadeDelta]] material bands along the length
// o.pat(u, v, x, y, t): shade delta pattern (u = px along, v = -1..1 across)
function seg(B, ax, ay, bx, by, ra, rb, mat, grp, o = SH_FLAT) {
  ax += B.ax; ay += B.ay; bx += B.ax; by += B.ay;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
  let nx = 1, ny = 0;
  if (L > 1e-4) { nx = -dy / L; ny = dx / L; }
  const rm = Math.max(ra, rb) + 0.5;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - rm)), x1 = Math.min(B.w - 1, Math.ceil(Math.max(ax, bx) + rm));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - rm)), y1 = Math.min(B.h - 1, Math.ceil(Math.max(ay, by) + rm));
  const flat = o.cap === 'flat', fl = o.flag || 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5 - ax, py = y + 0.5 - ay;
    const t = L2 > 1e-6 ? (px * dx + py * dy) / L2 : 0;
    if (flat && (t < 0 || t > 1)) continue;
    const tc = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - dx * tc, qy = py - dy * tc;
    const r = ra + (rb - ra) * tc;
    const d2 = qx * qx + qy * qy;
    if (d2 > r * r) continue;
    const sv = (qx * nx + qy * ny) / r;
    let Nx, Ny, Nz;
    if (t < 0 || t > 1 || L < 1e-4) { Nx = qx / r; Ny = qy / r; Nz = Math.sqrt(Math.max(0, 1 - d2 / (r * r))); }
    else { Nx = nx * sv; Ny = ny * sv; Nz = Math.sqrt(Math.max(0, 1 - sv * sv)); }
    let s = lumShade(Nx * LX + Ny * LY + Nz * LZ, x, y, o);
    let m = mat;
    if (o.band) for (const b of o.band) if (tc >= b[0] && tc <= b[1]) { m = b[2]; if (b[3]) s += b[3]; }
    if (o.pat) s += o.pat(tc * L, sv, x, y, tc);
    bput(B, x, y, m, s, grp, fl);
  }
}
const disc = (B, x, y, r, mat, grp, o) => seg(B, x, y, x, y, r, r, mat, grp, o);

function inPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) {
    const yi = P[i + 1], yj = P[j + 1];
    if ((yi > y) !== (yj > y) && x < ((P[j] - P[i]) * (y - yi)) / (yj - yi) + P[i]) c = !c;
  }
  return c;
}

// Filled polygon (flat array of local coords).
// o.axis = [ax, ay, bx, by, r]: cylindrical lighting around that axis
// o.hem = [x0, y0, x1, y1, width, mat]: trim band along an edge
function poly(B, pts, mat, grp, o = SH_FLAT) {
  const P = pts.slice();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < P.length; i += 2) {
    P[i] += B.ax; P[i + 1] += B.ay;
    x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]);
  }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(B.w - 1, Math.ceil(x1)); y1 = Math.min(B.h - 1, Math.ceil(y1));
  let ax = 0, ay = 0, dx = 0, dy = 1, L2 = 1, nx = 1, ny = 0, R = 1;
  if (o.axis) {
    ax = o.axis[0] + B.ax; ay = o.axis[1] + B.ay;
    dx = o.axis[2] + B.ax - ax; dy = o.axis[3] + B.ay - ay;
    L2 = dx * dx + dy * dy || 1; const L = Math.sqrt(L2);
    nx = -dy / L; ny = dx / L; R = o.axis[4];
  }
  const hem = o.hem;
  const fl = o.flag || 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const cx = x + 0.5, cy = y + 0.5;
    if (!inPoly(P, cx, cy)) continue;
    let s, u = 0, v = 0;
    if (o.axis) {
      const px = cx - ax, py = cy - ay;
      u = (px * dx + py * dy) / L2;
      v = clamp((px * nx + py * ny) / R, -1, 1);
      s = lumShade(nx * v * LX + ny * v * LY + Math.sqrt(1 - v * v) * LZ, x, y, o);
    } else s = o.sh !== undefined ? o.sh : 2;
    let m = mat;
    if (hem && distSeg(cx, cy, hem[0] + B.ax, hem[1] + B.ay, hem[2] + B.ax, hem[3] + B.ay) < hem[4]) m = hem[5];
    if (o.pat) s += o.pat(u, v, x, y);
    bput(B, x, y, m, s, grp, fl);
  }
}

// 1px line
function bline(B, x0, y0, x1, y1, m, s, g, f = 0) {
  x0 = Math.floor(x0 + B.ax); y0 = Math.floor(y0 + B.ay); x1 = Math.floor(x1 + B.ax); y1 = Math.floor(y1 + B.ay);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let n = 0; n < 200; n++) {
    bput(B, x0, y0, m, s, g, f);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

// Hand drawn sprite (heads) stamped into the buffer, rotatable in 90 degree steps.
function stamp(B, spr, lx, ly, grp, C, rot = 0) {
  const X = Math.floor(lx + B.ax), Y = Math.floor(ly + B.ay);
  for (let sy = 0; sy < spr.h; sy++) for (let sx = 0; sx < spr.w; sx++) {
    const code = spr.d[sy * spr.w + sx];
    if (!code) continue;
    const e = C.hcode[code];
    if (!e) continue;
    let ox = sx - spr.ax, oy = sy - spr.ay;
    for (let r = 0; r < rot; r++) { const t = ox; ox = -oy; oy = t; }
    bput(B, X + ox, Y + oy, e[0], e[1], grp, e[2] | F_KEEP);
  }
}
function rotOff(ox, oy, rot) { for (let r = 0; r < rot; r++) { const t = ox; ox = -oy; oy = t; } return [ox, oy]; }

// ---------------------------------------------------------------------------
// Pose solving
// ---------------------------------------------------------------------------
const JPTS = ['hip', 'neck', 'sF', 'sB', 'eF', 'wF', 'eB', 'wB', 'hF', 'hB', 'kF', 'aF', 'tF', 'kB', 'aB', 'tB', 'head'];
function limb(o, a1, a2, l1, l2) {
  const d1 = dv(a1), d2 = dv(a1 + a2);
  const e = [o[0] + d1[0] * l1, o[1] + d1[1] * l1];
  return [e, [e[0] + d2[0] * l2, e[1] + d2[1] * l2]];
}
function solve(P, C) {
  const S = C.body, J = {};
  const hx = P.x, hy = -S.hip;
  const tr = P.t * DEG, tdx = Math.sin(tr), tdy = -Math.cos(tr);
  J.hip = [hx, hy];
  J.neck = [hx + tdx * S.torso, hy + tdy * S.torso];
  J.td = [tdx, tdy]; J.tn = [-tdy, tdx];
  const shx = J.neck[0] - tdx * S.shDown, shy = J.neck[1] - tdy * S.shDown;
  J.sF = [shx - tdy * S.shOff, shy + tdx * S.shOff];
  J.sB = [shx + tdy * S.shOff * 1.4, shy - tdx * S.shOff * 1.4];
  [J.eF, J.wF] = limb(J.sF, P.a1, P.a2, S.ua, S.fa);
  [J.eB, J.wB] = limb(J.sB, P.b1, P.b2, S.ua, S.fa);
  J.faF = P.a1 + P.a2; J.faB = P.b1 + P.b2;
  J.hF = [hx - tdy * 0.6, hy + tdx * 0.6]; J.hB = [hx + tdy * 0.9, hy - tdx * 0.9];
  [J.kF, J.aF] = limb(J.hF, P.l1, P.l2, S.th, S.sh);
  [J.kB, J.aB] = limb(J.hB, P.m1, P.m2, S.th, S.sh);
  const fa = P.lf !== null ? P.lf : clamp(P.l1 + P.l2 + 90, 48, 128);
  const fb = P.mf !== null ? P.mf : clamp(P.m1 + P.m2 + 90, 48, 128);
  let d = dv(fa); J.tF = [J.aF[0] + d[0] * S.foot, J.aF[1] + d[1] * S.foot];
  d = dv(fb); J.tB = [J.aB[0] + d[0] * S.foot, J.aB[1] + d[1] * S.foot];
  J.head = [J.neck[0] + tdx * S.neck + P.hx, J.neck[1] + tdy * S.neck + P.hy];
  J.w = P.w; J.w2 = P.w2; J.hr = 0; J.rot = P.rot;
  if (P.rot) {
    const r = P.rot * DEG, c = Math.cos(r), s = Math.sin(r);
    const cx = hx + tdx * S.torso * 0.35, cy = hy + tdy * S.torso * 0.35;
    for (const k of JPTS) { const p = J[k]; const x = p[0] - cx, y = p[1] - cy; p[0] = cx + x * c - y * s; p[1] = cy + x * s + y * c; }
    for (const k of ['td', 'tn']) { const p = J[k]; const x = p[0], y = p[1]; p[0] = x * c - y * s; p[1] = x * s + y * c; }
    J.w -= P.rot; J.w2 -= P.rot; J.faF -= P.rot; J.faB -= P.rot;
    J.hr = ((Math.round(P.rot / 90) % 4) + 4) % 4;
  }
  if (P.g) {
    let low = Math.max(J.aF[1] + S.rAnk, J.tF[1] + S.rToe, J.aB[1] + S.rAnk, J.tB[1] + S.rToe);
    if (P.rot) {
      for (const k of ['hip', 'neck', 'kF', 'kB', 'wF', 'wB', 'eF', 'eB']) low = Math.max(low, J[k][1] + 2.2);
      const hc = rotOff(0, -5, J.hr);
      low = Math.max(low, J.head[1] + hc[1] + 4.5);
    }
    const sh = -low - 1 + P.y;
    for (const k of JPTS) J[k][1] += sh;
  } else if (P.y) for (const k of JPTS) J[k][1] += P.y;
  return J;
}

// ---------------------------------------------------------------------------
// Body part drawing
// ---------------------------------------------------------------------------
const PAT = {
  // diagonal cloth wraps (leg bindings, bracers)
  wrap: (u, v) => ((Math.floor(u * 0.75 + v * 1.1) & 1) ? -1 : 0),
  // lamellar armor scales in buffer space
  lamellar: (u, v, x, y) => ((y % 3 === 0) || ((x + (((y / 3) | 0) & 1) * 2) % 4 === 0) ? -1 : 0),
  // quilted cloth
  quilt: (u, v, x, y) => (((x + y) % 4 === 0) ? -1 : 0),
  // fur tufts
  fur: (u, v, x, y) => (hash2(x, y, 3) > 0.72 ? -1 : hash2(x, y, 9) > 0.86 ? 1 : 0),
  // robe folds
  fold: (u, v) => (Math.abs(v - 0.15) < 0.14 || Math.abs(v + 0.55) < 0.1 ? -1 : 0),
  // woven belt
  belt: (u, v, x, y) => ((x + y) % 3 === 0 ? -1 : 0),
};

function torsoPt(J, C, u, v) {
  const L = C.body.torso;
  return [J.hip[0] + J.td[0] * u * L + J.tn[0] * v, J.hip[1] + J.td[1] * u * L + J.tn[1] * v];
}

function drawArm(B, C, s, e, w, fAng, grp, front) {
  const S = C.body, M = C.M, A = C.arms;
  seg(B, s[0], s[1], e[0], e[1], S.rUa[0], S.rUa[1], M[A.upper], grp, C.shC);
  const dx = w[0] - e[0], dy = w[1] - e[1], fl = Math.hypot(dx, dy) || 1;
  if (A.wide) {
    seg(B, e[0], e[1], w[0], w[1], S.rFa[0] + 0.3, S.rFa[1] + 1.3, M[A.fore], grp, { ...C.shC, band: [[0.8, 1.01, M[A.cuff]]] });
    const hang = Math.abs(dx / fl) * A.wide;
    if (hang > 1.2) {
      const bx = w[0] - dx * 0.25, by = w[1] - dy * 0.25;
      poly(B, [e[0], e[1] + 0.5, w[0], w[1] + 1.2, bx, by + hang + 1.2, e[0] + dx * 0.2, e[1] + dy * 0.2 + 2], M[A.fore], grp,
        { sh: 1, hem: [w[0], w[1] + 1.2, bx, by + hang + 1.2, 1.1, M[A.cuff]] });
    }
  } else {
    const band = A.cuff ? [[0, 0.22, M[A.upper]], [0.86, 1.01, M[A.cuff]]] : null;
    seg(B, e[0], e[1], w[0], w[1], S.rFa[0], S.rFa[1], M[A.fore], grp, { ...C.shC, band, pat: A.wrap ? PAT.wrap : null });
  }
  if (!A.noHand) {
    const d = dv(fAng);
    seg(B, w[0] + d[0] * 0.6, w[1] + d[1] * 0.6, w[0] + d[0] * 1.5, w[1] + d[1] * 1.5, S.hand, S.hand * 0.85, M[A.hand || 'skin'], grp, SH_SKIN);
  }
}

function drawLeg(B, C, h, k, a, t, grp) {
  const S = C.body, M = C.M, L = C.legs;
  const band = L.wrap ? [[L.wrapFrom || 0.42, 1.01, M[L.wrap]]] : null;
  seg(B, k[0], k[1], a[0], a[1], S.rSh[0], S.rSh[1], M[L.shin], grp, { ...C.shC, band, pat: L.wrap ? (u, v, x, y, tc) => (tc > (L.wrapFrom || 0.42) ? PAT.wrap(u, v) : 0) : null });
  seg(B, h[0], h[1], k[0], k[1], S.rTh[0], S.rTh[1], M[L.thigh], grp, C.shC);
  const bt = [a[0] + (k[0] - a[0]) * (L.bootH || 0.2), a[1] + (k[1] - a[1]) * (L.bootH || 0.2)];
  seg(B, bt[0], bt[1], a[0], a[1], S.rAnk + 0.1, S.rAnk, M[L.boot], grp, C.shC);
  seg(B, a[0], a[1], t[0], t[1], S.rAnk, S.rToe, M[L.boot], grp, { ...C.shC, bias: -0.2 });
}

function drawTorso(B, C, J, P, grp, A) {
  const T = C.torso, W = C.body.tw, M = C.M;
  const pt = (u, v) => torsoPt(J, C, u, v);
  const sh = [
    pt(-0.06, -W.hipB), pt(0.4, -W.waistB), pt(0.72, -W.chestB), pt(0.93, -W.shB), pt(1.05, -W.nkB),
    pt(1.05, W.nkF), pt(0.9, W.shF), pt(0.7, W.chestF), pt(0.42, W.waistF), pt(-0.06, W.hipF),
  ].flat();
  const R = Math.max(W.chestF, W.chestB) + 0.5;
  const ax = [J.hip[0], J.hip[1], J.neck[0], J.neck[1], R];
  if (T.back) T.back(B, C, J, P, pt, A);
  poly(B, sh, M[T.mat], grp, { ...C.shC, axis: ax });
  if (T.vest) {
    const vs = [pt(0.26, -W.waistB - 0.3), pt(0.7, -W.chestB - 0.3), pt(0.94, -W.shB + 0.2), pt(0.96, W.shF * 0.6), pt(0.7, W.chestF + 0.3), pt(0.26, W.waistF + 0.3)].flat();
    poly(B, vs, M[T.vest], grp, { ...SH_METAL, axis: ax, pat: PAT[T.vestPat] || null });
  }
  if (T.collar) {
    if (T.inner) poly(B, [pt(1.05, -0.4), pt(1.05, W.nkF + 0.3), pt(0.74, W.chestF * 0.7)].flat(), M[T.inner], grp, { sh: 3 });
    const c0 = pt(1.04, -W.nkB * 0.5), c1 = pt(0.4, W.waistF + 0.2);
    seg(B, c0[0], c0[1], c1[0], c1[1], 0.95, 0.85, M[T.collar], grp, C.shC);
  }
  if (T.badge) {
    const c = pt(0.64, W.chestF * 0.25);
    poly(B, [c[0] - 2, c[1] - 2, c[0] + 2.5, c[1] - 2, c[0] + 2.5, c[1] + 2.5, c[0] - 2, c[1] + 2.5], M[T.badge], grp, { sh: 3, pat: (u, v, x, y) => ((x + y) % 2 ? -1 : 0) });
  }
  if (T.beads) {
    for (let i = 0; i <= 6; i++) {
      const u = 0.98 - i * 0.075, v = lerp(-W.nkB * 0.8, W.chestF + 0.6, Math.sin((i / 6) * Math.PI * 0.5));
      const p = pt(u, v);
      disc(B, p[0], p[1], 1.25, M[T.beads], grp, SH_METAL);
    }
  }
  if (T.front) T.front(B, C, J, P, pt, A);
}

function drawBelt(B, C, J, P, grp, A) {
  const T = C.torso, W = C.body.tw, M = C.M;
  const pt = (u, v) => torsoPt(J, C, u, v);
  const [u0, u1] = T.beltU || [0.05, 0.24];
  if (T.belt) {
    poly(B, [pt(u0, -W.hipB - 0.45), pt(u1, -W.waistB - 0.5), pt(u1, W.waistF + 0.5), pt(u0, W.hipF + 0.45)].flat(), M[T.belt], grp,
      { ...C.shC, axis: [J.hip[0], J.hip[1], J.neck[0], J.neck[1], W.waistF + 1], pat: PAT.belt });
    if (T.buckle) { const p = pt((u0 + u1) / 2, W.waistF + 0.2); disc(B, p[0], p[1], 1.2, M[T.buckle], grp, SH_METAL); }
  }
  A.sash = pt((u0 + u1) / 2, W.waistF * 0.5);
  A.sashB = pt((u0 + u1) / 2, -W.waistB * 0.7);
  if (T.pendant) {
    const p = pt(u0 - 0.1, W.waistF * 0.2);
    disc(B, p[0], p[1] + 1.2, 1.3, M[T.pendant], grp, SH_METAL);
    A.pendant = [p[0], p[1] + 2.4];
  }
}

function drawFlap(B, C, J, P, side, grp) {
  const R = C.robe, W = C.body.tw, M = C.M;
  const pt = (u, v) => torsoPt(J, C, u, v);
  const top = side > 0 ? pt(0.14, W.waistF + 0.7) : pt(0.14, -W.waistB - 0.7);
  const inn = side > 0 ? pt(0.14, -W.waistB * (R.overlap || 0.3)) : pt(0.14, W.waistF * (R.overlap || 0.3));
  const hp = side > 0 ? J.hF : J.hB, kn = side > 0 ? J.kF : J.kB;
  let ang = Math.atan2(kn[0] - hp[0], kn[1] - hp[1]) / DEG;
  const rotA = -(J.rot || 0);
  ang = lerp(ang, rotA, R.stiff) + (side > 0 ? P.ff : P.fb);
  const d = dv(ang);
  const ox = side > 0 ? d[1] : -d[1], oy = side > 0 ? -d[0] : d[0];
  const len = R.len * (side > 0 ? 1 : R.backLen || 1);
  const b0 = [top[0] + d[0] * len + ox * R.flare, top[1] + d[1] * len + oy * R.flare];
  const b1 = [inn[0] + d[0] * len * 0.93, inn[1] + d[1] * len * 0.93];
  const mx = (top[0] + inn[0]) / 2, my = (top[1] + inn[1]) / 2;
  poly(B, [...top, ...b0, ...b1, ...inn], M[R.mat], grp, {
    ...C.shC, axis: [mx, my, (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2, (W.waistF + W.waistB) * 0.6],
    hem: R.trim ? [b0[0], b0[1], b1[0], b1[1], R.hemW || 1.5, M[R.trim]] : null, pat: PAT.fold,
  });
  if (R.edge) {
    // vertical trim along the outer opening
    seg(B, top[0], top[1], b0[0], b0[1], 0.55, 0.55, M[R.edge], grp, C.shC);
  }
}

// ---------------------------------------------------------------------------
// Whole character
// ---------------------------------------------------------------------------
function drawChar(B, C, P, J) {
  const A = {};
  const dF = dv(J.faF), dB = dv(J.faB);
  const gF = [J.wF[0] + dF[0] * 1.05, J.wF[1] + dF[1] * 1.05], gB = [J.wB[0] + dB[0] * 1.05, J.wB[1] + dB[1] * 1.05];
  A.gripF = gF; A.gripB = gB;
  if (C.weapon2) WEAPONS[C.weapon2](B, C, gB, J.w2, GR.BWEAP, A, 'b');
  if (C.weapon && P.wh === 'b') WEAPONS[C.weapon](B, C, gB, J.w, GR.BWEAP, A, 'b');
  if (C.backArm !== false) drawArm(B, C, J.sB, J.eB, J.wB, J.faB, GR.BARM, false);
  drawLeg(B, C, J.hB, J.kB, J.aB, J.tB, GR.BLEG);
  if (C.robe) drawFlap(B, C, J, P, -1, GR.ROBEB);
  drawTorso(B, C, J, P, GR.BODY, A);
  drawLeg(B, C, J.hF, J.kF, J.aF, J.tF, GR.FLEG);
  if (C.robe) drawFlap(B, C, J, P, 1, GR.ROBEF);
  drawBelt(B, C, J, P, GR.ROBEF, A);
  const hs = HEADS[C.head][P.h] || HEADS[C.head][0];
  stamp(B, hs, J.head[0], J.head[1], GR.HEAD, C, J.hr);
  for (const k in hs.pts) {
    const o = rotOff(hs.pts[k][0] - hs.ax, hs.pts[k][1] - hs.ay, J.hr);
    A[k] = [Math.floor(J.head[0]) + o[0] + 0.5, Math.floor(J.head[1]) + o[1] + 0.5];
  }
  if (C.weapon && P.wh === 'f') WEAPONS[C.weapon](B, C, gF, J.w, GR.FWEAP, A, 'f');
  drawArm(B, C, J.sF, J.eF, J.wF, J.faF, GR.FARM, true);
  if (C.overlay) C.overlay(B, C, J, P, A);
  return A;
}

// ---------------------------------------------------------------------------
// Post process: separation lines, rim light, selective outline, crop.
// ---------------------------------------------------------------------------
const _sep = new Uint8Array(RB.w * RB.h);
let _img = null;
function finish(B, C) {
  const { w, h, m, s, g, f } = B;
  const pal = C.pal, pmax = C.pmax;
  _sep.fill(0);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!m[i] || (f[i] & (F_EMIT | F_NOSEP))) continue;
    const gi = g[i];
    let best = 0, bm = 0;
    for (let k = 0; k < 4; k++) {
      const j = k === 0 ? i - 1 : k === 1 ? i + 1 : k === 2 ? i - w : i + w;
      const gj = g[j];
      if (m[j] && gj > gi && gj > best && !(f[j] & F_NOSEP) && !NOSEP.has(gi * 16 + gj)) { best = gj; bm = m[j]; }
    }
    if (best) _sep[i] = bm;
  }
  // rim light on the lit (upper, front) silhouette edge
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!m[i] || (f[i] & F_KEEP) || _sep[i]) continue;
    if (!m[i - w] || !m[i + 1]) s[i] = Math.min(s[i] + 1, pmax[m[i]]);
  }
  if (!_img) _img = new ImageData(w, h);
  const d = _img.data;
  d.fill(0);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let c = null;
    if (m[i]) {
      if (_sep[i]) c = pal[_sep[i]][0];
      else c = pal[m[i]][clamp(s[i], -1, 4) + 1];
    } else {
      let bg = 0, bm = 0, lit = false;
      if (x > 0) { const j = i - 1; if (m[j] && !(f[j] & F_NOOUT) && g[j] >= bg) { bg = g[j]; bm = m[j]; lit = false; } }
      if (y < h - 1) { const j = i + w; if (m[j] && !(f[j] & F_NOOUT) && g[j] >= bg) { bg = g[j]; bm = m[j]; lit = true; } }
      if (x < w - 1) { const j = i + 1; if (m[j] && !(f[j] & F_NOOUT) && g[j] >= bg) { bg = g[j]; bm = m[j]; lit = false; } }
      if (y > 0) { const j = i - w; if (m[j] && !(f[j] & F_NOOUT) && g[j] >= bg) { bg = g[j]; bm = m[j]; lit = false; } }
      if (bm) c = lit ? pal[bm][6] : pal[bm][0];
    }
    if (c) {
      const k = i * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { c: mkCanvas(1, 1), ox: 0, oy: 0 };
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const cv = mkCanvas(cw, ch);
  ctxOf(cv).putImageData(_img, -x0, -y0, x0, y0, cw, ch);
  return { c: cv, ox: x0 - B.ax, oy: y0 - B.ay };
}

// ---------------------------------------------------------------------------
// Costumes, animation sampling and the frame cache
// ---------------------------------------------------------------------------
const HEAD_CODES = {
  k: ['hair', 0], j: ['hair', 1], h: ['hair', 2], H: ['hair', 3], I: ['hair', 4], o: ['hair', -1],
  D: ['skin', 0], d: ['skin', 1], s: ['skin', 2], S: ['skin', 3], T: ['skin', 4], e: ['skin', -1], m: ['skin', 0],
  w: ['eyeW', 4],
  y: ['a', 0], a: ['a', 1], A: ['a', 2], '@': ['a', 3], '!': ['a', 4],
  z: ['b', 0], b: ['b', 1], B: ['b', 2], '%': ['b', 3], '^': ['b', 4],
  x: ['c', 0], c: ['c', 1], C: ['c', 2], '&': ['c', 3], '*': ['c', 4],
  E: ['glow', 4, F_EMIT], G: ['glow', 3, F_EMIT],
};
function buildPal(r) {
  const c = r.map(rgb);
  const lo = [lerp(c[0][0], c[1][0], 0.55) | 0, lerp(c[0][1], c[1][1], 0.55) | 0, lerp(c[0][2], c[1][2], 0.55) | 0];
  return [...c, lo];
}
const COSTUME = {};
function defCostume(id, def) {
  const C = Object.assign({ id, shC: SH_CLOTH, anims: 'hero', headMap: {} }, def);
  C.M = {}; C.pal = [null]; C.pmax = [0];
  const shiny = new Set(def.shiny || []);
  let n = 1;
  for (const k in def.mats) { C.M[k] = n++; C.pal.push(buildPal(def.mats[k])); C.pmax.push(shiny.has(k) ? 4 : 3); }
  C.hcode = [];
  for (const ch in HEAD_CODES) {
    const [role, sh, fl] = HEAD_CODES[ch];
    const mat = C.headMap[role] || role;
    if (C.M[mat] !== undefined) C.hcode[ch.charCodeAt(0)] = [C.M[mat], sh, fl || 0];
  }
  COSTUME[id] = C;
  return C;
}

const POSE0 = { x: 0, y: 0, t: 0, a1: 8, a2: 10, b1: -6, b2: 12, l1: 4, l2: -4, m1: -4, m2: -2, w: 150, w2: 150, wh: 'f', h: 0, g: 1, rot: 0, ff: 0, fb: 0, hx: 0, hy: 0, lf: null, mf: null };
function lerpPose(a, b, u) {
  const o = {};
  for (const k in a) {
    const va = a[k], vb = b[k];
    o[k] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * u : u < 0.5 ? va : vb;
  }
  return o;
}
// keys: [pose, duration, ease?, subframes?]
function mkAnim(loop, ...keys) {
  const K = keys.map(([p, d, e, sub]) => ({ p: Object.assign({}, POSE0, p), d, e: e || 'io', sub }));
  return { loop, keys: K, total: K.reduce((s, k) => s + k.d, 0) };
}
function sampleAnim(A, t) {
  const K = A.keys, n = K.length;
  let tt = A.loop ? ((t % A.total) + A.total) % A.total : Math.max(0, Math.min(t, A.total - 0.001));
  let i = 0;
  while (i < n - 1 && tt >= K[i].d) { tt -= K[i].d; i++; }
  const k0 = K[i];
  const last = !A.loop && i === n - 1;
  if (k0.e === 'step' || last || n === 1) return { p: k0.p, k: i + '.0' };
  const k1 = K[(i + 1) % n];
  const sub = k0.sub || clamp(Math.round(k0.d / 3), 1, 5);
  const q = Math.floor((tt / k0.d) * sub);
  return { p: lerpPose(k0.p, k1.p, Ease[k0.e](q / sub)), k: i + '.' + q };
}

const FRAMES = new Map();
function renderFrame(C, P) {
  RB.clear();
  const J = solve(P, C);
  const A = drawChar(RB, C, P, J);
  const fr = finish(RB, C);
  fr.A = A; fr.J = J; fr.tints = null;
  return fr;
}
function frameFor(C, anim, t) {
  const set = ANIMS[C.anims];
  let A = set[anim];
  if (!A) { anim = 'idle'; A = set.idle; }
  const smp = sampleAnim(A, t);
  const key = C.id + '|' + anim + '|' + smp.k;
  let fr = FRAMES.get(key);
  if (!fr) { fr = renderFrame(C, smp.p); FRAMES.set(key, fr); }
  return fr;
}
function animLen(C, anim) { const A = ANIMS[C.anims][anim]; return A ? A.total : 1; }

// Solid color silhouette of a frame (hit flash, afterimages), cached per color.
function frameTint(fr, color) {
  if (!fr.tints) fr.tints = {};
  let c = fr.tints[color];
  if (!c) {
    c = mkCanvas(fr.c.width, fr.c.height);
    const x = ctxOf(c);
    x.drawImage(fr.c, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    fr.tints[color] = c;
  }
  return c;
}

// Draw a frame at world-space feet position (sx, sy are already camera relative).
function blitFrame(ctx, fr, sx, sy, facing, img) {
  img = img || fr.c;
  sx = Math.round(sx); sy = Math.round(sy);
  if (facing >= 0) ctx.drawImage(img, sx + fr.ox, sy + fr.oy);
  else {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, fr.ox, fr.oy);
    ctx.restore();
  }
}

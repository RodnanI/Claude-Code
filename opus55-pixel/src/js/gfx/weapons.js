// ---------------------------------------------------------------------------
// Weapons, drawn from the fist center g along angle a. Each registers anchor
// points (tassels, tips) used by ribbons and slash effects.
// ---------------------------------------------------------------------------
const WEAPONS = {
  // straight double edged sword with gold guard and tassel
  jian(B, C, g, a, grp, A, w, len = 17, blade = 'steel') {
    const M = C.M, d = dv(a), n = [-d[1], d[0]];
    const pm = [g[0] - d[0] * 3.8, g[1] - d[1] * 3.8];
    seg(B, pm[0], pm[1], g[0] + d[0] * 1.2, g[1] + d[1] * 1.2, 0.8, 0.8, M.hilt, grp, C.shC);
    disc(B, pm[0], pm[1], 1.05, M.gold, grp, SH_METAL);
    const gx = g[0] + d[0] * 1.9, gy = g[1] + d[1] * 1.9;
    seg(B, gx - n[0] * 2.1, gy - n[1] * 2.1, gx + n[0] * 2.1, gy + n[1] * 2.1, 0.75, 0.75, M.gold, grp, SH_METAL);
    seg(B, gx + d[0] * 0.8, gy + d[1] * 0.8, gx + d[0] * len, gy + d[1] * len, 0.95, 0.4, M[blade], grp, SH_BLADE);
    A[w + 'Tassel'] = pm;
    A[w + 'Tip'] = [gx + d[0] * len, gy + d[1] * len];
  },
  bloodjian(B, C, g, a, grp, A, w) { WEAPONS.jian(B, C, g, a, grp, A, w, 19, 'blade'); },
  // single edged saber, widening toward the tip, ring pommel
  dao(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a), n = [-d[1], d[0]];
    const pm = [g[0] - d[0] * 3.4, g[1] - d[1] * 3.4];
    seg(B, pm[0], pm[1], g[0] + d[0] * 1.2, g[1] + d[1] * 1.2, 0.8, 0.8, M.hilt, grp, C.shC);
    disc(B, pm[0] - d[0] * 0.8, pm[1] - d[1] * 0.8, 1.2, M.gold, grp, SH_METAL);
    const b = (t, o) => [g[0] + d[0] * t + n[0] * o, g[1] + d[1] * t + n[1] * o];
    seg(B, ...b(1.8, -1.6), ...b(1.8, 2), 0.7, 0.7, M.gold, grp, SH_METAL);
    const P = [b(2.2, -0.7), b(9, -0.8), b(14.5, -0.5), b(16.5, -0.1), b(15.5, 1.6), b(11, 2.1), b(5, 1.5), b(2.2, 1.1)];
    poly(B, P.flat(), M.steel, grp, { ...SH_BLADE, axis: [...b(2, -0.8), ...b(16, -0.6), 2.2] });
    A[w + 'Tassel'] = pm;
    A[w + 'Tip'] = b(16.5, 0);
  },
  // long spear with leaf head; tassel anchor below the head
  spear(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a), n = [-d[1], d[0]];
    const p = t => [g[0] + d[0] * t, g[1] + d[1] * t];
    seg(B, ...p(-12), ...p(21), 0.75, 0.75, M.wood, grp, C.shC);
    seg(B, ...p(20.2), ...p(21.6), 1.2, 1.2, M.gold, grp, SH_METAL);
    const h0 = p(22), h1 = p(28.5);
    poly(B, [h0[0] - n[0] * 1.3, h0[1] - n[1] * 1.3, ...p(24.5).map((v, i) => v + n[i] * 1.8), ...h1, ...p(24.5).map((v, i) => v - n[i] * 1.8), h0[0] + n[0] * 1.3, h0[1] + n[1] * 1.3], M.steel, grp, { ...SH_BLADE, axis: [...h0, ...h1, 1.8] });
    A[w + 'Tassel'] = p(20.6);
    A[w + 'Tip'] = h1;
  },
  // hook sword: blade with a back hooked tip and crescent hand guard
  hook(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a), n = [-d[1], d[0]];
    const p = (t, o = 0) => [g[0] + d[0] * t + n[0] * o, g[1] + d[1] * t + n[1] * o];
    seg(B, ...p(-4.5), ...p(1.2), 0.7, 0.7, M.hilt, grp, C.shC);
    seg(B, ...p(-4.5), ...p(-6.5), 0.8, 0.2, M.steel, grp, SH_BLADE);
    seg(B, ...p(-1, 2.8), ...p(1.6, 3.4), 0.6, 0.6, M.steel, grp, SH_METAL);
    seg(B, ...p(1.6, 3.4), ...p(3.4, 1.4), 0.6, 0.6, M.steel, grp, SH_METAL);
    seg(B, ...p(2), ...p(15), 0.9, 0.75, M.steel, grp, SH_BLADE);
    seg(B, ...p(15), ...p(17, -1.5), 0.75, 0.7, M.steel, grp, SH_BLADE);
    seg(B, ...p(17, -1.5), ...p(16, -3.6), 0.7, 0.6, M.steel, grp, SH_BLADE);
    seg(B, ...p(16, -3.6), ...p(14, -3.4), 0.6, 0.45, M.steel, grp, SH_BLADE);
    A[w + 'Tip'] = p(17, -1.5);
    A[w + 'Tassel'] = p(-4);
  },
  dagger(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a), n = [-d[1], d[0]];
    const p = (t, o = 0) => [g[0] + d[0] * t + n[0] * o, g[1] + d[1] * t + n[1] * o];
    seg(B, ...p(-2.4), ...p(1), 0.7, 0.7, M.hilt, grp, C.shC);
    seg(B, ...p(1.5, -1.3), ...p(1.5, 1.3), 0.55, 0.55, M.gold, grp, SH_METAL);
    seg(B, ...p(2), ...p(8.5), 0.85, 0.3, M.steel, grp, SH_BLADE);
    A[w + 'Tip'] = p(8.5);
  },
  // open steel war fan with painted silk
  fan(B, C, g, a, grp, A, w) {
    const M = C.M;
    const R = 10, span = 55;
    const pts = [g[0], g[1]];
    for (let k = -span; k <= span; k += 11) { const q = dv(a + k); pts.push(g[0] + q[0] * R, g[1] + q[1] * R); }
    poly(B, pts, M.silk, grp, {
      sh: 3,
      pat: (u, v, x, y) => {
        const ang = Math.atan2(x + 0.5 - (g[0] + B.ax), y + 0.5 - (g[1] + B.ay)) / DEG;
        const rr = Math.hypot(x + 0.5 - (g[0] + B.ax), y + 0.5 - (g[1] + B.ay));
        if (rr > R - 1.3) return -3;
        if (hash2(x, y, 11) > 0.93 && rr > 4) return -2;
        return Math.abs(((ang % 11) + 11) % 11 - 5.5) < 0.9 ? -1 : 0;
      },
    });
    for (let k = -span; k <= span; k += span) { const q = dv(a + k); seg(B, g[0], g[1], g[0] + q[0] * R, g[1] + q[1] * R, 0.55, 0.45, M.steel, grp, SH_METAL); }
    const t = dv(a);
    A[w + 'Tip'] = [g[0] + t[0] * R, g[1] + t[1] * R];
    A[w + 'Tassel'] = [g[0] - t[0] * 1.5, g[1] - t[1] * 1.5];
  },
  // iron studded club
  club(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a);
    const p = t => [g[0] + d[0] * t, g[1] + d[1] * t];
    seg(B, ...p(-3), ...p(17), 1.2, 2.6, M.wood, grp, C.shC);
    seg(B, ...p(-0.5), ...p(1.8), 1.5, 1.5, M.leather, grp, C.shC);
    for (const t of [9, 12.5, 16]) { const q = p(t); disc(B, q[0] + d[1] * 1.8, q[1] - d[0] * 1.8, 0.7, M.steel, grp, SH_METAL); disc(B, q[0] - d[1] * 2, q[1] + d[0] * 2, 0.7, M.steel, grp, SH_METAL); }
    A[w + 'Tip'] = p(18);
  },
  // recurve bow held across the aim direction
  bow(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a), n = [-d[1], d[0]];
    const p = (t, o) => [g[0] + d[0] * t + n[0] * o, g[1] + d[1] * t + n[1] * o];
    const pts = [p(-0.5, 0), p(1.2, 3.5), p(1.4, 6.5), p(0.2, 9), p(0.9, 10.5)];
    const pts2 = [p(-0.5, 0), p(1.2, -3.5), p(1.4, -6.5), p(0.2, -9), p(0.9, -10.5)];
    for (const L of [pts, pts2]) for (let i = 0; i < L.length - 1; i++) seg(B, ...L[i], ...L[i + 1], 0.8, 0.8, M.wood, grp, C.shC);
    bline(B, ...pts[4], ...pts2[4], M.white || M.bone, 3, grp, F_NOOUT);
    A[w + 'Tip'] = p(1, 0);
  },
  // taoist horsetail whisk: handle only, the hair is a live ribbon
  whisk(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a);
    seg(B, g[0] - d[0] * 2.5, g[1] - d[1] * 2.5, g[0] + d[0] * 4, g[1] + d[1] * 4, 0.75, 0.75, M.wood, grp, C.shC);
    disc(B, g[0] + d[0] * 4.5, g[1] + d[1] * 4.5, 1.1, M.gold, grp, SH_METAL);
    A[w + 'Whisk'] = [g[0] + d[0] * 5, g[1] + d[1] * 5];
  },
  // scabbard carried in the hand (cutscenes)
  sheath(B, C, g, a, grp, A, w) {
    const M = C.M, d = dv(a);
    seg(B, g[0] - d[0] * 4, g[1] - d[1] * 4, g[0] + d[0] * 1.5, g[1] + d[1] * 1.5, 0.8, 0.8, M.hilt, grp, C.shC);
    seg(B, g[0] + d[0] * 1.8, g[1] + d[1] * 1.8, g[0] + d[0] * 18, g[1] + d[1] * 18, 1.15, 1, M.scab || M.wood, grp, { ...C.shC, band: [[0, 0.08, M.gold], [0.94, 1.01, M.gold]] });
    A[w + 'Tassel'] = [g[0] - d[0] * 4.2, g[1] - d[1] * 4.2];
  },
};

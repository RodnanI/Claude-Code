import { defineAmbient } from '../ambient-def.js';
import { M } from '../../voxel/palette.js';

/* Helicopters and an airship that circle the big cities. Local +x is the nose. The helicopter variant holds the rotor
   phase in its low two bits (the system steps it about sixteen times a second, which the temporal filter smears into a
   disc) and the livery above them. */

const LIVERY = [
  { body: M.AC_WHITE, stripe: M.AC_RED }, { body: M.AC_YELLOW, stripe: M.AC_BLACK },
  { body: M.AC_RED, stripe: M.AC_WHITE }, { body: M.AC_GRAY_LIGHT, stripe: M.AC_ORANGE },
];

const heli = defineAmbient({
  id: 'helicopter', kind: 'aircraft', name: 'Light helicopter', length: 13, variants: 16, rotor: true, maxDist: 6000, cells: [0.1, 0.2, 0.4, 0.8, 1.6, 3.2],
  build(b, v) {
    const phase = v & 3, L = LIVERY[v >> 2];
    // cabin and engine deck
    b.loft('x', [
      { a: 3.7, c1: 0.9, c2: 0, r1: 0.3, r2: 0.25, n: 2 },
      { a: 2.8, c1: 0.95, c2: 0, r1: 0.95, r2: 0.85, n: 2 },
      { a: 0.6, c1: 1.05, c2: 0, r1: 1.3, r2: 1.05, n: 2 },
      { a: -1.6, c1: 1.15, c2: 0, r1: 1.1, r2: 0.85, n: 2 },
      { a: -3.4, c1: 1.35, c2: 0, r1: 0.45, r2: 0.32, n: 2 },
    ], L.body);
    b.box(-8.2, 1.2, -0.14, -3.2, 1.62, 0.14, L.body, { md: 2 });
    b.loft('x', [{ a: -3.3, c1: 1.4, c2: 0, r1: 0.4, r2: 0.3, n: 2 }, { a: -8.3, c1: 1.5, c2: 0, r1: 0.14, r2: 0.12, n: 2 }], L.body);
    b.paint(-8, 1.0, -0.6, 3.6, 1.8, 0.6, (lx, ly, lz) => (Math.abs(lz) > 0.2 && ly < 1.5 && ly > 1.15 ? L.stripe : 0), { md: 1 });
    // windshield and side glass
    b.box(2.1, 0.95, -0.82, 3.3, 1.65, 0.82, M.AC_CANOPY, { md: 0.8 });
    b.box(0.2, 1.1, -1.08, 2.2, 1.7, 1.08, M.AC_CANOPY, { md: 0.8 });
    // tail fin, stabilizer and tail rotor
    b.box(-8.6, 1.2, -0.08, -7.5, 3.1, 0.08, L.stripe, { md: 1 });
    b.box(-8.1, 1.45, -0.9, -7.4, 1.55, 0.9, L.body, { md: 0.8 });
    b.cyl('z', -8.15, 2.45, 0.7, 0.7, 0.14, 0.2, M.STEEL_DARK, { md: 0.35 });
    // skids
    for (const s of [-1, 1]) {
      b.box(-1.9, -0.45, s * 1.0 - 0.06, 2.6, -0.33, s * 1.0 + 0.06, M.STEEL_DARK, { md: 0.9 });
      b.box(-1.0, -0.4, s * 1.0 - 0.05, -0.85, 0.3, s * 0.95 + 0.05, M.STEEL_DARK, { md: 0.9 });
      b.box(1.1, -0.4, s * 1.0 - 0.05, 1.25, 0.3, s * 0.95 + 0.05, M.STEEL_DARK, { md: 0.9 });
    }
    // mast and four blades
    b.cyl('y', 0.4, 0, 0.16, 0.13, 2.3, 3.0, M.STEEL_DARK, { md: 0.8 });
    const th = phase * (Math.PI / 8);
    b.fn(-5.7, 2.98, -5.7, 5.7, 3.08, 5.7, (lx, ly, lz) => {
      const x = lx - 0.4, r = Math.hypot(x, lz);
      if (r > 5.5 || r < 0.25) return 0;
      const a = ((Math.atan2(lz, x) - th) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2);
      return Math.min(a, Math.PI / 2 - a) * r < 0.13 ? M.AC_BLACK : 0;
    }, { thin: true });
    // lights: red left, green right, white strobe on the tail
    b.box(1.6, 0.75, -1.1, 1.85, 0.95, -0.95, M.NAV_RED, { md: 0.5 });
    b.box(1.6, 0.75, 0.95, 1.85, 0.95, 1.1, M.NAV_GREEN, { md: 0.5 });
    b.box(-8.6, 3.1, -0.1, -8.3, 3.3, 0.1, M.STROBE, { md: 0.6 });
  },
});

const airship = defineAmbient({
  id: 'airship', kind: 'aircraft', name: 'Advertising airship', length: 92, variants: 3, maxDist: 20000, cells: [0.4, 0.8, 1.6, 3.2, 6.4, 12.8],
  build(b, v) {
    const R = 12.5, panel = [M.NEON_ORANGE, M.NEON_WHITE, M.NEON_RED][v];
    b.loft('x', [
      { a: -46, c1: 0, c2: 0, r1: 0.4, r2: 0.4, n: 2 },
      { a: -40, c1: 0, c2: 0, r1: 5.2, r2: 5.2, n: 2 },
      { a: -22, c1: 0, c2: 0, r1: R * 0.93, r2: R * 0.93, n: 2 },
      { a: -2, c1: 0, c2: 0, r1: R, r2: R, n: 2 },
      { a: 20, c1: 0, c2: 0, r1: R * 0.93, r2: R * 0.93, n: 2 },
      { a: 36, c1: 0, c2: 0, r1: R * 0.62, r2: R * 0.62, n: 2 },
      { a: 46, c1: 0, c2: 0, r1: 0.5, r2: 0.5, n: 2 },
    ], M.PAINT_WHITE);
    // a lit advertising panel down each flank, which glows at night
    b.paint(-27, -4.5, -R - 1, 21, 6.5, R + 1, (lx, ly, lz) => (Math.abs(lz) > R * 0.62 && Math.abs(ly) < 4.2 ? panel : 0), { md: 3.2 });
    // four tail fins, swept at the tip and reaching well past the hull
    const finH = (lx) => (lx < -36 ? 15.5 - (-36 - lx) * 0.95 : lx > -26 ? Math.max(0, (15.5 * (-22 - lx)) / 4) : 15.5);
    b.fn(-46, -16, -0.35, -22, 16, 0.35, (lx, ly) => (Math.abs(ly) < finH(lx) ? M.PAINT_WHITE : 0), { md: 5 });
    b.fn(-46, -0.35, -16, -22, 0.35, 16, (lx, ly, lz) => (Math.abs(lz) < finH(lx) ? M.PAINT_WHITE : 0), { md: 5 });
    // gondola with a window band, and two engine pods
    b.box(-10, -R - 3.6, -2.6, 9, -R + 0.2, 2.6, M.STEEL, { md: 1 });
    b.box(-9.6, -R - 2.6, -2.7, 8.6, -R - 1.2, 2.7, M.FAC_RIBBON_DARK, { md: 3 });
    for (const s of [-1, 1]) {
      b.cyl('x', -R - 1.6, s * 3.9, 0.9, 0.9, -4, 2, M.STEEL_DARK, { md: 2 });
      b.cyl('x', -R - 1.6, s * 3.9, 1.7, 1.7, 2, 2.3, M.AC_BLACK, { md: 1.5 });
    }
    // lights on the fin tips
    b.box(-32.4, 15.2, -0.3, -31.6, 15.9, 0.3, M.NAV_RED, { md: 1 });
    b.box(-32.4, -15.9, -0.3, -31.6, -15.2, 0.3, M.STROBE, { md: 1 });
    b.box(-32.4, -0.3, -15.9, -31.6, 0.3, -15.2, M.NAV_RED, { md: 1 });
    b.box(-32.4, -0.3, 15.2, -31.6, 0.3, 15.9, M.NAV_GREEN, { md: 1 });
  },
});

export default [heli, airship];

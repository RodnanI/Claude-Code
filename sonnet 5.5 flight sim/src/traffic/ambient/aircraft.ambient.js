import { defineAmbient } from '../ambient-def.js';
import { M } from '../../voxel/palette.js';

/* Airliner for the airport circuit. Variants: 0 gear up, 1 gear down; the tail color is picked by the system through
   the variant offset (variant >> 1). Local +x is the nose. */

const TAILS = [M.AC_RED, M.AC_ORANGE, M.AC_YELLOW, M.TARP_BLUE];

const airliner = defineAmbient({
  id: 'airliner', kind: 'aircraft', name: 'Twin-jet airliner', length: 38, variants: 8, ground: 3.55, maxDist: 14000, cells: [0.25, 0.5, 1, 2, 4, 8],
  build(b, v) {
    const gear = v & 1, tail = TAILS[v >> 1];
    // fuselage
    b.loft('x', [
      { a: 19, c1: 0.5, c2: 0, r1: 0.15, r2: 0.15, n: 2 },
      { a: 17.6, c1: 0.5, c2: 0, r1: 1.3, r2: 1.25, n: 2 },
      { a: 15, c1: 0.2, c2: 0, r1: 1.95, r2: 1.9, n: 2 },
      { a: 10, c1: 0, c2: 0, r1: 2.05, r2: 1.95, n: 2 },
      { a: -9, c1: 0, c2: 0, r1: 2.05, r2: 1.95, n: 2 },
      { a: -14, c1: 0.5, c2: 0, r1: 1.6, r2: 1.5, n: 2 },
      { a: -19, c1: 1.4, c2: 0, r1: 0.55, r2: 0.5, n: 2 },
    ], M.AC_WHITE);
    b.paint(-20, -3, -3, 20, -0.3, 3, () => M.AC_GRAY_LIGHT, { md: 4 });
    b.paint(-14, 0.5, -3, 13, 1.05, 3, (lx) => (Math.floor(lx * 1.25) & 1 ? M.AC_BLACK : 0), { md: 0.6 });
    b.box(16.2, 0.9, -1.15, 17.6, 1.6, 1.15, M.AC_CANOPY, { md: 1.2 });
    // wings, engines
    for (const s of [-1, 1]) {
      b.wing([5, -0.9, s * 1.6], 15.6, 6.8, 1.9, 7.5, 1.1, 0.13, 0.09, s, M.AC_WHITE);
      const z = s * 5.6;
      b.box(2.5, -1.5, z - 0.16, 6, -0.7, z + 0.16, M.AC_WHITE, { md: 1 });
      b.cyl('x', -1.85, z, 1.1, 1.05, 1.8, 7.2, M.AC_WHITE);
      b.cyl('x', -1.85, z, 0.85, 0.85, 6.9, 7.3, M.AC_BLACK, { md: 1 });
      b.cyl('x', -1.85, z, 0.7, 0.4, 1.4, 1.9, M.AC_EXHAUST, { md: 1 });
      b.wing([-14.6, 1.7, s * 0.9], 6.3, 3.6, 1.4, 3, 0.4, 0.1, 0.08, s, M.AC_WHITE);
      b.box(-2.9, 0.1, s * 16.5, -2.2, 0.35, s * 17.1, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 1 });
    }
    // vertical fin in the tail color
    b.fn(-21, 1.5, -0.22, -11, 9.4, 0.22, (lx, ly) => {
      const t = (ly - 1.5) / 7.9;
      const le = -11.6 - t * 4.6, te = le - (7.2 - 4.4 * t);
      return lx <= le && lx >= te ? tail : 0;
    });
    b.box(-17.6, 9.3, -0.15, -16.9, 9.6, 0.15, M.STROBE, { md: 1 });
    if (gear) {
      // nose gear and two main bogies
      b.box(12.6, -3.0, -0.12, 12.85, -1.4, 0.12, M.STEEL, { md: 1 });
      for (const z of [-0.3, 0.3]) b.cyl('z', 12.7, -3.15, 0.42, 0.42, z - 0.12, z + 0.12, M.AC_TIRE);
      for (const s of [-1, 1]) {
        b.box(0.5, -3.0, s * 3.4 - 0.12, 0.8, -0.8, s * 3.4 + 0.12, M.STEEL, { md: 1 });
        for (const dx of [-0.8, 0.8]) for (const dz of [-0.3, 0.3]) b.cyl('z', 0.65 + dx, -3.13, 0.44, 0.44, s * 3.4 + dz - 0.12, s * 3.4 + dz + 0.12, M.AC_TIRE);
      }
    }
  },
});

export default [airliner];

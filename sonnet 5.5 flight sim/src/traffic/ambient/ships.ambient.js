import { defineAmbient } from '../ambient-def.js';
import { M } from '../../voxel/palette.js';

/* Ships and boats. Local +x is the bow, the waterline is y = 0. Hulls are lofted along x with a boxy cross section, the
   wake is a lighter foam layer that only exists at fine detail (a thin foam layer would be a wall at coarse voxels). */

const CONTAINERS = [M.CONTAINER_RED, M.CONTAINER_BLUE, M.CONTAINER_GREEN, M.CONTAINER_ORANGE, M.CONTAINER_GRAY, M.CONTAINER_RED, M.CONTAINER_BLUE, M.PAINT_WHITE];

function hull(b, L, B, keel, deck, bow = 0.26, stern = 0.34, n = 3) {
  const cy = (deck + keel) / 2, ry = (deck - keel) / 2;
  b.loft('x', [
    { a: -L / 2, c1: cy, c2: 0, r1: ry * 0.9, r2: B * stern, n },
    { a: -L * 0.36, c1: cy, c2: 0, r1: ry, r2: B * 0.5, n },
    { a: L * 0.26, c1: cy, c2: 0, r1: ry, r2: B * 0.5, n },
    { a: L * 0.42, c1: cy, c2: 0, r1: ry, r2: B * bow * 1.4, n: 2.4 },
    { a: L / 2, c1: cy + 1.5, c2: 0, r1: ry * 0.8, r2: 0.8, n: 2 },
  ], M.STEEL_DARK);
  // red boot topping at the waterline, then the deck
  b.paint(-L / 2 - 1, keel - 1, -B, L / 2 + 1, 0.5, B, (lx, ly) => (ly < 0.4 ? M.SHIP_RED : 0), { md: 4 });
  b.box(-L * 0.44, deck - 0.5, -B * 0.45, L * 0.46, deck + 0.1, B * 0.45, M.STEEL, { md: 8 });
}

function wake(b, L, B, len = 260) {
  b.fn(-L / 2 - len, 0, -B * 2.2, -L / 2 + 6, 0.5, B * 2.2, (lx, ly, lz) => {
    const back = -L / 2 - lx;
    if (back < -6) return 0;
    const edge = Math.abs(Math.abs(lz) - (B * 0.5 + Math.max(0, back) * 0.17));
    const core = Math.abs(lz) < B * 0.3 && back > 0 && back < len * 0.7;
    return (edge < 1.3 + back * 0.02 || core) && ((lx * 0.37 + lz * 0.61) % 5 > 1.2 || back < 10) ? M.SNOW : 0;
  }, { md: 2.4 });
}

const cargo = defineAmbient({
  id: 'cargo-ship', kind: 'ship', name: 'Container ship', length: 190, variants: 3, maxDist: 20000, cells: [0.6, 1.2, 2.4, 4.8, 9.6, 19],
  build(b, v, rng) {
    const L = 190, B = 30;
    hull(b, L, B, -8, 6);
    wake(b, L, B);
    if (v === 0 || v === 2) {
      // container stacks
      for (let x = -L * 0.3; x < L * 0.4; x += 12.9) {
        for (let z = -B * 0.4; z < B * 0.4; z += 2.85) {
          const n = rng.int(1, v === 2 ? 3 : 5), c = CONTAINERS[rng.int(0, CONTAINERS.length - 1)];
          b.box(x, 6.1, z, x + 12.2, 6.1 + n * 2.5, z + 2.6, c, { md: 4 });
        }
      }
      b.box(-L * 0.3, 6.1, -B * 0.4, L * 0.4 + 12, 6.1 + 7.5, B * 0.4, M.CONTAINER_BLUE, { mn: 4.1 });
    } else {
      // bulk carrier: hatch covers and cranes
      for (let x = -L * 0.32; x < L * 0.38; x += 24) b.box(x, 6.1, -B * 0.36, x + 20, 7.6, B * 0.36, M.MIL_OLIVE);
      for (let x = -L * 0.2; x < L * 0.3; x += 48) { b.box(x, 7.6, -0.4, x + 0.8, 20, 0.4, M.STEEL, { md: 3 }); b.box(x - 10, 19.6, -0.4, x + 10, 20.2, 0.4, M.STEEL, { md: 3 }); }
    }
    // stern superstructure, bridge windows, funnel and mast
    b.box(-L * 0.46, 6, -B * 0.38, -L * 0.33, 25, B * 0.38, M.SHIP_WHITE);
    b.box(-L * 0.331, 20.5, -B * 0.36, -L * 0.325, 23.5, B * 0.36, M.FAC_RIBBON_DARK);
    b.box(-L * 0.46, 25, -B * 0.42, -L * 0.34, 27, B * 0.42, M.STEEL_DARK, { md: 4 });
    b.cyl('y', -L * 0.4, 0, 3.4, 3.2, 25, 34, M.SHIP_RED);
    b.cyl('y', -L * 0.4, 0, 3.5, 3.5, 30, 31.4, M.PAINT_WHITE, { md: 4 });
    b.cyl('y', -L * 0.36, 0, 0.3, 0.2, 27, 40, M.STEEL, { md: 2 });
    b.box(-L * 0.36 - 0.4, 40, -0.4, -L * 0.36 + 0.4, 40.8, 0.4, M.BEACON_RED, { md: 2 });
    b.box(L * 0.32, 6, -0.3, L * 0.34, 12, 0.3, M.STEEL_DARK, { md: 3 });
    b.box(L * 0.46, 6, -0.2, L * 0.47, 10, 0.2, M.NAV_RED, { md: 2 });
  },
});

const tanker = defineAmbient({
  id: 'tanker', kind: 'ship', name: 'Tanker', length: 230, maxDist: 20000, cells: [0.6, 1.2, 2.4, 4.8, 9.6, 19],
  build(b) {
    const L = 230, B = 38;
    hull(b, L, B, -11, 5, 0.22, 0.3, 3.4);
    wake(b, L, B, 320);
    // pipes and manifolds along the deck, tank hatches
    b.box(-L * 0.3, 5, -0.6, L * 0.4, 6.2, 0.6, M.RUST, { md: 6 });
    for (let x = -L * 0.3; x < L * 0.4; x += 17) { b.box(x, 5, -B * 0.4, x + 1.2, 5.9, B * 0.4, M.STEEL, { md: 3 }); b.cyl('y', x + 8, -B * 0.22, 2.2, 2.2, 5, 6.2, M.STEEL_DARK, { md: 4 }); b.cyl('y', x + 8, B * 0.22, 2.2, 2.2, 5, 6.2, M.STEEL_DARK, { md: 4 }); }
    b.box(-L * 0.46, 5, -B * 0.36, -L * 0.36, 26, B * 0.36, M.SHIP_WHITE);
    b.box(-L * 0.361, 21, -B * 0.34, -L * 0.355, 24, B * 0.34, M.FAC_RIBBON_DARK);
    b.cyl('y', -L * 0.42, 0, 3, 2.8, 26, 34, M.SHIP_RED);
    b.box(-L * 0.46, 26, -B * 0.4, -L * 0.37, 27.5, B * 0.4, M.STEEL_DARK, { md: 4 });
    b.box(L * 0.4, 5, -0.3, L * 0.42, 14, 0.3, M.STEEL_DARK, { md: 3 });
  },
});

const ferry = defineAmbient({
  id: 'ferry', kind: 'ship', name: 'Ferry', length: 96, maxDist: 16000, cells: [0.4, 0.8, 1.6, 3.2, 6.4, 12.8],
  build(b) {
    const L = 96, B = 21;
    hull(b, L, B, -3.8, 4, 0.3, 0.42, 2.6);
    wake(b, L, B, 150);
    b.box(-L * 0.42, 4, -B * 0.44, L * 0.34, 12.6, B * 0.44, M.FAC_RIBBON_WHITE);
    b.box(-L * 0.36, 12.6, -B * 0.4, L * 0.24, 17.4, B * 0.4, M.FAC_RIBBON_WHITE);
    b.box(-L * 0.3, 17.4, -B * 0.32, L * 0.1, 21, B * 0.32, M.SHIP_WHITE);
    b.box(L * 0.1, 17.5, -B * 0.32, L * 0.104, 20.4, B * 0.32, M.GLASS_DARK, { md: 4 });
    b.box(-L * 0.42, 12.4, -B * 0.46, L * 0.34, 12.9, B * 0.46, M.SHIP_RED, { md: 4 });
    b.cyl('y', -L * 0.12, 0, 2.4, 2.2, 21, 27, M.SHIP_RED);
    b.cyl('y', -L * 0.12, 0, 2.5, 2.5, 24, 25, M.PAINT_WHITE, { md: 3 });
    b.cyl('y', L * 0.0, 0, 0.2, 0.15, 21, 30, M.STEEL, { md: 2 });
  },
});

const sailboat = defineAmbient({
  id: 'sailboat', kind: 'boat', name: 'Sailing yacht', length: 11, variants: 3, maxDist: 5000, cells: [0.1, 0.2, 0.4, 0.8, 1.6, 3.2],
  build(b, v) {
    const sail = [M.PAINT_WHITE, M.AC_RED, M.PAINT_YELLOW][v];
    b.loft('x', [{ a: -5.5, c1: 0.3, c2: 0, r1: 0.7, r2: 1.5, n: 2.4 }, { a: -1, c1: 0.2, c2: 0, r1: 0.9, r2: 1.9, n: 2.4 }, { a: 3.5, c1: 0.3, c2: 0, r1: 0.7, r2: 1.4, n: 2.4 }, { a: 5.5, c1: 0.6, c2: 0, r1: 0.4, r2: 0.1, n: 2 }], M.PAINT_WHITE);
    b.box(-0.6, 0.9, -0.9, 2.2, 1.6, 0.9, M.SHIP_WHITE, { md: 1.6 });
    b.box(-0.15, 0.6, -0.1, 0.15, 12, 0.1, M.STEEL_BRIGHT, { md: 0.8 });
    b.box(-0.05, 1.6, -0.05, 0.05, 11.4, 0.05, sail, { thin: true, md: 3 });
    b.box(-4.6, 2.2, -0.05, 0.1, 11.4, 0.05, sail, { thin: true, md: 3 });
    b.box(1.2, 1.6, -0.05, 4.8, 8.6, 0.05, sail, { thin: true, md: 3 });
    b.fn(-9, 0, -2, -5, 0.4, 2, (lx, ly, lz) => (Math.abs(lz) < 0.5 + (-5.5 - lx) * 0.2 && lx < -5.5 ? M.SNOW : 0), { md: 0.4 });
  },
});

const tug = defineAmbient({
  id: 'tug', kind: 'boat', name: 'Harbor tug', length: 28, maxDist: 8000, cells: [0.2, 0.4, 0.8, 1.6, 3.2, 6.4],
  build(b) {
    b.loft('x', [{ a: -14, c1: 0.4, c2: 0, r1: 2.4, r2: 3.6, n: 2.6 }, { a: -8, c1: 0.4, c2: 0, r1: 2.6, r2: 4.6, n: 2.6 }, { a: 8, c1: 0.4, c2: 0, r1: 2.6, r2: 4.6, n: 2.6 }, { a: 14, c1: 0.8, c2: 0, r1: 2, r2: 0.6, n: 2 }], M.SHIP_RED);
    b.box(-8, 2.9, -3.2, 3, 6.4, 3.2, M.SHIP_WHITE);
    b.box(-3, 6.4, -2.2, 1.4, 8.6, 2.2, M.SHIP_WHITE);
    b.box(1.35, 6.6, -2.0, 1.45, 8.2, 2.0, M.GLASS_DARK, { md: 1 });
    b.cyl('y', -5.5, 0, 0.9, 0.8, 6.4, 10, M.STEEL_DARK, { md: 1.6 });
    b.box(9, 2.9, -0.5, 10.6, 3.6, 0.5, M.STEEL_DARK, { md: 1.6 });
    b.fn(-40, 0, -8, -14, 0.4, 8, (lx, ly, lz) => (Math.abs(lz) < 2.4 + (-14 - lx) * 0.16 && Math.abs(lz) > 0.5 && (lx * 0.5 + lz) % 4 > 0.6 ? M.SNOW : 0), { md: 0.8 });
  },
});

export default [cargo, tanker, ferry, sailboat, tug];

import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, roofClutter, foundation } from './_util.js';

/* Industry and harbor: warehouses, factories, tanks, silos, water towers, cranes, container yards, piers. */

const CONTAINERS = [M.CONTAINER_RED, M.CONTAINER_BLUE, M.CONTAINER_GREEN, M.CONTAINER_ORANGE, M.CONTAINER_GRAY, M.CONTAINER_RED, M.CONTAINER_BLUE];

const warehouse = defineKit({
  id: 'warehouse',
  build(d, b, rng) {
    const w = d.w, dp = d.d, h = d.h;
    const st = d.style || {};
    const wall = st.wall ?? pick(rng, [M.CLADDING_GRAY, M.SIDING_GRAY, M.CONCRETE_PANEL, M.CLADDING_SAND]);
    const roof = st.roof ?? pick(rng, [M.ROOF_TIN, M.ROOF_FLAT, M.ROOF_GRAVEL]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    // corrugation bands (fine detail)
    for (let y = 2.4; y < h - 0.5; y += 2.4) b.box(-w / 2 - 0.08, y, -dp / 2 - 0.08, w / 2 + 0.08, y + 0.28, dp / 2 + 0.08, M.STEEL, { md: 0.5 });
    b.box(-w / 2 - 0.2, 0, -dp / 2 - 0.2, w / 2 + 0.2, 1.1, dp / 2 + 0.2, M.CONCRETE, { md: 1.5 });
    // clerestory windows
    b.facade(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, { floorH: h, bay: 5, winW: 3.6, winH: 1.3, sill: h - 2.6, glass: [M.GLASS_SLATE, M.GLASS_CLEAR], lit: 0.1, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_LIGHT, top: 0.3, corner: 3 });
    // loading docks on the +z face
    const n = Math.max(2, Math.floor((w - 8) / 9));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 6 + i * ((w - 12) / Math.max(1, n - 1));
      b.box(x - 2.1, 0.0, dp / 2, x + 2.1, 4.4, dp / 2 + 0.25, M.STEEL_DARK, { md: 1 });
      b.box(x - 2.1, 0, dp / 2 + 0.25, x + 2.1, 1.2, dp / 2 + 1.6, M.CONCRETE, { md: 1 });
    }
    // roof: low gable with vents
    b.gable(-w / 2 - 0.4, -dp / 2 - 0.4, w / 2 + 0.4, dp / 2 + 0.4, h, Math.min(3.2, dp * 0.07), 'x', roof);
    for (let i = 0; i < Math.floor(w / 14); i++) b.box(-w / 2 + 7 + i * 14 - 0.7, h + Math.min(3.2, dp * 0.07) - 0.3, -0.7, -w / 2 + 7 + i * 14 + 0.7, h + Math.min(3.2, dp * 0.07) + 0.9, 0.7, M.STEEL, { md: 1 });
    // office annex
    if (rng.chance(0.6)) b.box(-w / 2, 0, dp / 2, -w / 2 + 9, 4.6, dp / 2 + 6, M.CONCRETE_PANEL);
  },
});

const stack = (b, x, z, r, y0, y1, bands) => {
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    const ra = r * (1 - 0.35 * t0), rb = r * (1 - 0.35 * t1);
    b.cyl('y', x, z, ra, rb, y0 + (y1 - y0) * t0, y0 + (y1 - y0) * t1, i % 2 ? M.PAINT_WHITE : M.SMOKE_STACK_RED);
  }
  b.cyl('y', x, z, r * 0.62, r * 0.62, y1 - 0.4, y1 + 0.4, M.STEEL_DARK, { md: 1 });
};

const factory = defineKit({
  id: 'factory',
  build(d, b, rng) {
    const w = d.w, dp = d.d, h = d.h;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    const wall = pick(rng, [M.BRICK_DARK, M.CONCRETE_PANEL, M.CLADDING_GRAY, M.BRICK_BROWN]);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    b.facade(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, { floorH: 5, bay: 5, winW: 3, winH: 2.4, sill: 1.4, glass: [M.GLASS_SLATE, M.GLASS_DARK], lit: 0.14, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 1.5, corner: 2 });
    // sawtooth roof
    const teeth = Math.max(3, Math.floor(w / 9));
    const tw = (w - 1) / teeth;
    for (let i = 0; i < teeth; i++) {
      const x0 = -w / 2 + 0.5 + i * tw;
      b.wedge(x0, h, -dp / 2 + 0.5, x0 + tw, h + 3.6, dp / 2 - 0.5, '+x', M.ROOF_TIN);
      b.box(x0 + tw - 0.25, h, -dp / 2 + 0.5, x0 + tw, h + 3.4, dp / 2 - 0.5, M.GLASS_CLEAR, { md: 1 });
    }
    // chimneys, tanks, pipes
    const nStack = 1 + (d.seed & 1) + (rng.chance(0.4) ? 1 : 0);
    for (let i = 0; i < nStack; i++) stack(b, w / 2 + 6 + i * 7, -dp * 0.2 + i * 5, 2.4 + i * 0.3, 0, 42 + i * 12, 6);
    for (let i = 0; i < 2; i++) {
      b.cyl('y', -w / 2 - 6, -dp / 2 + 6 + i * 11, 4.2, 4.2, 0, 11, M.TANK_GRAY);
      b.cyl('y', -w / 2 - 6, -dp / 2 + 6 + i * 11, 4.4, 0.4, 11, 13.2, M.TANK_GRAY, { md: 1.5 });
    }
    b.box(-w / 2 - 2, 4.4, -dp / 2, -w / 2, 5.0, dp / 2, M.STEEL, { md: 1 });
    b.box(-w / 2 - 2, 0, -dp / 2, -w / 2 - 1.6, 4.4, -dp / 2 + 0.4, M.STEEL_DARK, { md: 1 });
    roofClutter(b, rng, -w / 2 + 1, -dp / 2 + 1, w / 2 - 1, dp / 2 - 1, h + 3.6, 4);
  },
});

const tank = defineKit({
  id: 'tank',
  build(d, b, rng) {
    const r = d.r ?? Math.min(d.w, d.d) / 2, h = d.h;
    const mat = d.style?.mat ?? pick(rng, [M.TANK_WHITE, M.TANK_GRAY, M.TANK_WHITE]);
    b.cyl('y', 0, 0, r + 0.6, r + 0.6, -3, 0.7, M.CONCRETE_DARK);
    b.cyl('y', 0, 0, r, r, 0.7, h, mat);
    for (let y = 3; y < h; y += 3) b.cyl('y', 0, 0, r + 0.12, r + 0.12, y, y + 0.2, M.STEEL, { md: 0.75 });
    b.cyl('y', 0, 0, r + 0.15, 0.4, h, h + r * 0.24, M.TANK_GRAY);
    // ladder and rail ring
    b.box(r - 0.2, 0.7, -0.35, r + 0.35, h, 0.35, M.STEEL_DARK, { md: 0.5 });
    b.cyl('y', 0, 0, r + 0.5, r + 0.5, h - 0.2, h + 0.25, M.STEEL, { md: 0.5 });
    b.cyl('y', 0, 0, r + 0.4, r + 0.4, h - 0.1, h + 0.1, mat, { md: 9 });
  },
});

const silo = defineKit({
  id: 'silo',
  build(d, b, rng) {
    const r = d.r ?? 3.6, h = d.h ?? 26;
    const n = d.n ?? 3;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (r * 2 + 0.6);
      b.cyl('y', x, 0, r + 0.5, r + 0.5, -2.5, 0.6, M.CONCRETE_DARK);
      b.cyl('y', x, 0, r, r, 0.6, h, M.TANK_GRAY);
      for (let y = 2; y < h; y += 2.2) b.cyl('y', x, 0, r + 0.1, r + 0.1, y, y + 0.16, M.STEEL, { md: 0.5 });
      b.ell(x, h, 0, r, r * 0.55, r, M.TANK_GRAY);
    }
    b.box(-(n * r), h + 1, -0.5, n * r, h + 1.8, 0.5, M.STEEL_DARK, { md: 1 });
    b.box(-(n * r) - 2, 0, -1.2, -(n * r) + 1, 6, 1.2, M.CONCRETE_PANEL);
  },
});

const watertower = defineKit({
  id: 'watertower',
  build(d, b) {
    const h = d.h ?? 32, r = 5.2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      b.box(sx * 3.4 - 0.4, -2, sz * 3.4 - 0.4, sx * 3.4 + 0.4, h - 6, sz * 3.4 + 0.4, M.STEEL_DARK);
    }
    for (let y = 6; y < h - 6; y += 8) {
      b.box(-3.8, y, -3.8, 3.8, y + 0.3, -3.2, M.STEEL_DARK, { md: 1 }); b.box(-3.8, y, 3.2, 3.8, y + 0.3, 3.8, M.STEEL_DARK, { md: 1 });
      b.box(-3.8, y, -3.8, -3.2, y + 0.3, 3.8, M.STEEL_DARK, { md: 1 }); b.box(3.2, y, -3.8, 3.8, y + 0.3, 3.8, M.STEEL_DARK, { md: 1 });
    }
    b.cyl('y', 0, 0, r, r, h - 6, h + 2, M.TANK_WHITE);
    b.cyl('y', 0, 0, r, 0.3, h + 2, h + 6, M.TANK_WHITE);
    b.box(-r, h - 1, -0.2, r, h - 0.4, 0.2, M.SIGN_RED, { md: 0.75 });
    b.box(-0.4, h + 6, -0.4, 0.4, h + 8, 0.4, M.BEACON_RED);
  },
});

const crane = defineKit({
  id: 'crane',
  build(d, b) {
    // ship-to-shore gantry crane, boom toward +z
    const red = M.SHIP_RED;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 9 - 0.8, 0, sz * 9 - 0.8, sx * 9 + 0.8, 34, sz * 9 + 0.8, red);
    for (const y of [10, 22, 34]) { b.box(-9.8, y, -9.8, 9.8, y + 1.2, -8.2, red, { md: 1 }); b.box(-9.8, y, 8.2, 9.8, y + 1.2, 9.8, red, { md: 1 }); }
    b.box(-10, 34, -10, 10, 36.5, 10, M.STEEL_DARK);
    b.box(-3, 36, -10, 3, 42, 40, red);
    b.box(-2.2, 36.5, -30, 2.2, 40, -8, red);
    b.box(-1.2, 42, -36, 1.2, 60, -33, M.STEEL, { md: 1 });
    b.box(-1.4, 30, 26, 1.4, 36, 30, M.STEEL_DARK, { md: 1 });
    b.box(-3.5, 36, -9, 3.5, 41, -3, M.SHIP_WHITE);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 9 - 1, -0.4, sz * 9 - 1.2, sx * 9 + 1, 0.6, sz * 9 + 1.2, M.STEEL_DARK, { md: 2 });
    b.box(-0.6, 60, -34.2, 0.6, 61.5, -32.8, M.BEACON_RED);
  },
});

const containers = defineKit({
  id: 'containers',
  build(d, b, rng) {
    const w = d.w, dp = d.d;
    b.box(-w / 2, -0.5, -dp / 2, w / 2, 0.15, dp / 2, M.CONCRETE_DARK);
    const cl = 12.2, cw = 2.5, ch = 2.6;
    for (let x = -w / 2 + 1; x + cl < w / 2; x += cl + 0.5) {
      for (let z = -dp / 2 + 1; z + cw < dp / 2; z += cw + 0.35) {
        const n = rng.int(0, 4);
        for (let k = 0; k < n; k++) {
          const c = pick(rng, CONTAINERS);
          b.box(x, 0.15 + k * ch, z, x + cl, 0.15 + (k + 1) * ch, z + cw, c);
          b.box(x, 0.15 + k * ch, z, x + cl, 0.3 + k * ch, z + cw, M.STEEL_DARK, { md: 1 });
        }
      }
    }
  },
});

const pier = defineKit({
  id: 'pier',
  build(d, b) {
    const L = d.w, W = d.d;
    b.box(-L / 2, 1.0, -W / 2, L / 2, 1.8, W / 2, M.CONCRETE);
    b.box(-L / 2, 1.8, -W / 2, L / 2, 2.5, -W / 2 + 0.4, M.CONCRETE_DARK, { md: 1 });
    b.box(-L / 2, 1.8, W / 2 - 0.4, L / 2, 2.5, W / 2, M.CONCRETE_DARK, { md: 1 });
    for (let x = -L / 2 + 2; x < L / 2; x += 6) for (const z of [-W / 2 + 1, W / 2 - 1]) b.box(x - 0.5, -8, z - 0.5, x + 0.5, 1.0, z + 0.5, M.WOOD_DARK);
    for (let x = -L / 2 + 6; x < L / 2; x += 18) b.cyl('y', x, W / 2 - 0.6, 0.4, 0.4, 2.5, 3.0, M.STEEL_DARK, { md: 1 });
  },
});

export default [warehouse, factory, tank, silo, watertower, crane, containers, pier];

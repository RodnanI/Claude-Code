import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { textBoxes } from '../../voxel/glyphs.js';
import { strut } from '../../aircraft/builders/parts.js';
import { pick } from './_util.js';

/* The homestead beside a farm strip: a windmill, a chicken coop, a woodpile, a still, a school bus somebody lives in, a bonfire
   with lawn chairs, a rusty water tank on stilts, a mailbox, split-rail fence, a pigpen and a half-cannibalized airframe under a
   chain hoist. Everything is weathered wood, tin, tarp and rust. Local +z is the front. */

// Farm windmill: a braced tower, a wheel of slats that faces the wind, a tail vane, a pump rod and a trough.
const windmill = defineKit({
  id: 'windmill',
  conservative: true,
  build(d, b, rng) {
    const H = d.h ?? 12, r0 = 2.3, r1 = 0.85;
    const at = (k, y) => { const t = y / H, r = r0 + (r1 - r0) * t; return [k & 1 ? r : -r, y, k & 2 ? r : -r]; };
    for (let k = 0; k < 4; k++) strut(b, at(k, 0), at(k, H), 0.18, M.STEEL_DARK);
    for (let i = 0; i < 4; i++) {
      const y0 = (i * H) / 4, y1 = ((i + 1) * H) / 4;
      for (const [a, c] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
        strut(b, at(a, y0), at(c, y1), 0.07, M.STEEL, { md: 0.7 });
        strut(b, at(c, y0), at(a, y1), 0.07, M.STEEL, { md: 0.7 });
        strut(b, at(a, y1), at(c, y1), 0.08, M.STEEL, { md: 0.7 });
      }
    }
    const hy = H + 0.5;
    b.box(-r1 - 0.2, H, -r1 - 0.2, r1 + 0.2, H + 0.3, r1 + 0.2, M.STEEL_DARK);
    b.box(-0.5, H + 0.3, -0.35, 1.0, hy + 0.6, 0.35, M.STEEL_DARK);
    // wheel facing -x, tail vane behind it
    const R = 2.5, cy = hy + 0.2;
    b.fn(-1.1, cy - R, -R, -0.5, cy + R, R, (lx, ly, lz) => {
      const r = Math.hypot(ly - cy, lz);
      if (r > R || r < 0.35) return 0;
      if (r > R - 0.16 || r < 0.6) return M.STEEL;
      const a = Math.atan2(ly - cy, lz), k = ((a + Math.PI * 2) / (Math.PI * 2 / 18)) % 1;
      return k < 0.34 ? M.ROOF_TIN : 0;
    });
    b.box(1.0, hy + 0.1, -0.06, 4.3, hy + 0.35, 0.06, M.STEEL_DARK);
    b.fn(3.0, hy - 0.8, -0.05, 4.6, hy + 1.4, 0.05, (lx, ly) => ((ly - (hy - 0.8)) / 2.2 > (lx - 3.0) * 0.12 - 0.01 ? M.ROOF_TIN_RUST : 0), { md: 1 });
    b.box(-0.06, 0.4, -0.06, 0.06, H, 0.06, M.STEEL, { md: 0.5 });
    b.box(-1.8, 0, 1.4, 1.8, 0.55, 2.6, M.WOOD_WEATHERED, { md: 1.5 });
    b.box(-1.65, 0.3, 1.55, 1.65, 0.5, 2.45, M.WATER_POOL, { md: 1.5 });
  },
});

// Chicken coop on legs with a ramp and a wire run, and the chickens themselves.
const chickencoop = defineKit({
  id: 'chickencoop',
  conservative: true,
  build(d, b, rng) {
    b.box(-1.7, 0.7, -1.2, 1.7, 2.6, 1.2, M.WOOD_WEATHERED);
    b.wedge(-2.0, 2.6, -1.5, 2.0, 3.3, 1.5, '-z', M.ROOF_TIN_RUST);
    for (const [x, z] of [[-1.5, -1.0], [1.5, -1.0], [-1.5, 1.0], [1.5, 1.0]]) b.box(x - 0.12, 0, z - 0.12, x + 0.12, 0.75, z + 0.12, M.WOOD_DARK, { md: 1 });
    b.box(-0.35, 0.9, 1.2, 0.35, 1.7, 1.28, M.WOOD_DARK, { md: 0.7 });
    b.wedge(-0.4, 0, 1.3, 0.4, 0.9, 3.2, '-z', M.WOOD_LIGHT, { md: 1 });
    b.box(-1.7, 1.4, -1.55, -0.3, 2.0, -1.2, M.WOOD_LIGHT, { md: 1 });
    // the run: posts and mesh
    for (const [x, z] of [[-2.2, 3.4], [2.8, 3.4], [2.8, -1.4], [-2.2, -1.4]]) b.box(x - 0.08, 0, z - 0.08, x + 0.08, 1.6, z + 0.08, M.WOOD_DARK, { md: 1 });
    b.fn(-2.2, 0, 1.2, 2.8, 1.6, 3.5, (lx, ly, lz, cell) => {
      const edge = Math.abs(lz - 3.4) < 0.1 || (Math.abs(lx + 2.2) < 0.1) || Math.abs(lx - 2.8) < 0.1;
      return edge && (Math.floor(lx / Math.max(cell, 0.25)) + Math.floor(ly / Math.max(cell, 0.25))) & 1 ? M.FENCE : 0;
    }, { md: 1 });
    for (let i = 0; i < 7; i++) {
      const x = -1.6 + rng.range(0, 4), z = 1.5 + rng.range(0, 1.6), c = i % 3 === 0 ? M.RUST : i % 3 === 1 ? M.PAINT_WHITE : M.WOOD_MID;
      b.box(x - 0.15, 0.05, z - 0.1, x + 0.15, 0.4, z + 0.1, c, { md: 0.6 });
      b.box(x + 0.1, 0.3, z - 0.05, x + 0.22, 0.5, z + 0.05, c, { md: 0.4 });
      b.box(x + 0.18, 0.46, z - 0.02, x + 0.24, 0.52, z + 0.02, M.SIGN_RED, { md: 0.25 });
    }
  },
});

// Two stacks of split logs, a chopping block with an axe in it and a tarp thrown over the older stack.
const woodpile = defineKit({
  id: 'woodpile',
  conservative: true,
  build(d, b, rng) {
    const L = d.w ?? 6;
    for (const [z0, tall, tarp] of [[0, 4, true], [1.5, 3, false]]) {
      for (let j = 0; j < tall; j++) for (let i = 0; i < Math.floor(L / 0.34); i++) {
        const x = -L / 2 + 0.2 + i * 0.34, y = 0.17 + j * 0.32;
        b.cyl('z', x, y, 0.16, 0.16, z0, z0 + 1.2, (i + j) & 1 ? M.WOOD_MID : M.WOOD_LIGHT, { md: 0.5 });
      }
      b.box(-L / 2 - 0.1, 0, z0 - 0.05, -L / 2 + 0.05, tall * 0.34, z0 + 1.25, M.WOOD_DARK, { md: 1 });
      b.box(L / 2 - 0.05, 0, z0 - 0.05, L / 2 + 0.1, tall * 0.34, z0 + 1.25, M.WOOD_DARK, { md: 1 });
      if (tarp) b.wedge(-L / 2 + 0.3, tall * 0.34, z0 - 0.1, L / 2 - 0.3, tall * 0.34 + 0.5, z0 + 1.3, '+z', M.TARP_BLUE, { md: 1.5 });
    }
    b.cyl('y', L / 2 + 1.4, 0.4, 0.42, 0.42, 0, 0.6, M.WOOD_DARK, { md: 1.5 });
    b.box(L / 2 + 1.35, 0.6, 0.35, L / 2 + 1.42, 1.0, 0.45, M.WOOD_MID, { md: 0.5 });
    b.box(L / 2 + 1.25, 0.9, 0.3, L / 2 + 1.55, 1.05, 0.5, M.STEEL, { md: 0.5 });
    for (let i = 0; i < 6; i++) b.cyl('y', L / 2 + 0.9 + rng.range(-0.6, 0.9), -0.3 + rng.range(0, 0.6), 0.1, 0.1, 0, 0.2, M.WOOD_LIGHT, { md: 0.5 });
  },
});

// A moonshine still under a tin lean-to: firebox, copper pot, a neck and a coil in a barrel, jugs in a row.
const still = defineKit({
  id: 'still',
  conservative: true,
  build(d, b, rng) {
    for (const [x, z] of [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.4], [1.8, 1.4]]) b.box(x - 0.1, 0, z - 0.1, x + 0.1, z < 0 ? 2.3 : 1.7, z + 0.1, M.WOOD_DARK);
    b.wedge(-2.2, 1.7, -1.8, 2.2, 2.4, 1.8, '+z', M.ROOF_TIN_RUST);
    b.box(-1.0, 0, -0.5, 0.2, 0.9, 0.5, M.BRICK_DARK);
    b.box(-0.9, 0.2, 0.5, -0.2, 0.7, 0.55, M.STEEL_DARK, { md: 0.5 });
    b.cyl('y', -0.4, 0, 0.55, 0.62, 0.9, 1.7, M.ROOF_COPPER);
    b.cyl('y', -0.4, 0, 0.45, 0.1, 1.7, 2.1, M.ROOF_COPPER);
    b.box(-0.35, 1.9, -0.05, 0.9, 2.0, 0.05, M.ROOF_COPPER, { md: 0.5 });
    b.cyl('y', 1.1, 0, 0.5, 0.5, 0, 1.1, M.WOOD_MID);
    b.cyl('y', 1.1, 0, 0.42, 0.42, 1.0, 1.15, M.WATER_POOL, { md: 0.8 });
    for (let k = 0; k < 4; k++) b.cyl('y', 1.1, 0, 0.36 - k * 0.02, 0.36 - k * 0.02, 0.2 + k * 0.22, 0.28 + k * 0.22, M.ROOF_COPPER, { md: 0.5 });
    for (let i = 0; i < 6; i++) { const x = -1.6 + i * 0.36; b.cyl('y', x, -1.1, 0.12, 0.12, 0, 0.36, i & 1 ? M.GLASS_CLEAR : M.PAINT_GREEN, { md: 0.5 }); b.cyl('y', x, -1.1, 0.05, 0.05, 0.36, 0.5, i & 1 ? M.GLASS_CLEAR : M.PAINT_GREEN, { md: 0.4 }); }
    b.cyl('y', -1.7, 0.9, 0.25, 0.25, 0, 0.8, M.PAINT_BARN_RED, { md: 1 });
    b.cyl('y', -1.7, 0.9, 0.08, 0.08, 0.8, 4.4 - 2.3, M.STEEL_DARK, { md: 0.5 });
  },
});

// A yellow school bus with no wheels, a porch with a couch, a tin chimney, a TV aerial and a tire pile.
const busshack = defineKit({
  id: 'busshack',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 11, dp = 2.5, h = 3.0;
    for (let i = 0; i < 4; i++) b.box(-w / 2 + 1 + i * (w - 2) / 3 - 0.3, 0, -dp / 2 + 0.2, -w / 2 + 1 + i * (w - 2) / 3 + 0.3, 0.6, dp / 2 - 0.2, M.CONCRETE, { md: 1.5 });
    b.box(-w / 2, 0.6, -dp / 2, w / 2, 0.9, dp / 2, M.RUST_DARK);
    b.box(-w / 2, 0.9, -dp / 2, w / 2, h, dp / 2, M.PAINT_YELLOW);
    b.box(-w / 2 + 0.2, h, -dp / 2 + 0.2, w / 2 - 0.2, h + 0.25, dp / 2 - 0.2, M.RUST);
    b.box(-w / 2 - 1.2, 0.9, -dp / 2 + 0.2, -w / 2, 2.3, dp / 2 - 0.2, M.PAINT_YELLOW);
    b.box(-w / 2 - 1.25, 1.4, -dp / 2 + 0.3, -w / 2 - 1.1, 2.3, dp / 2 - 0.3, M.GLASS_DARK, { md: 1 });
    for (const s of [-1, 1]) {
      b.box(-w / 2 + 0.6, 1.6, s * dp / 2 - 0.03, w / 2 - 0.6, 2.4, s * dp / 2 + 0.03, M.GLASS_DARK, { md: 1 });
      for (let x = -w / 2 + 1.2; x < w / 2 - 0.8; x += 1.05) b.box(x, 1.6, s * dp / 2 - 0.05, x + 0.1, 2.4, s * dp / 2 + 0.05, M.PAINT_YELLOW, { md: 0.7 });
      b.box(-w / 2, 1.0, s * dp / 2 - 0.02, w / 2, 1.12, s * dp / 2 + 0.02, M.TIRE, { md: 0.6 });
    }
    b.paint(-w / 2, 0.9, -dp / 2, w / 2, h, dp / 2, (x, y, z) => ((Math.sin(x * 2.1) * Math.cos(y * 3.1 + z) + Math.sin(x * 0.7 + y)) > 1.15 ? M.RUST : 0), { md: 2 });
    // porch on the +z side: boards, posts, a couch and a lamp
    b.box(-w * 0.32, 0.5, dp / 2, w * 0.12, 0.72, dp / 2 + 2.6, M.WOOD_LIGHT);
    for (const x of [-w * 0.32 + 0.15, w * 0.12 - 0.15]) b.box(x - 0.08, 0.72, dp / 2 + 2.3, x + 0.08, 2.5, dp / 2 + 2.5, M.WOOD_DARK, { md: 1 });
    b.wedge(-w * 0.32 - 0.2, 2.5, dp / 2, w * 0.12 + 0.2, 3.0, dp / 2 + 2.8, '-z', M.ROOF_TIN, { md: 1.5 });
    b.box(-w * 0.28, 0.72, dp / 2 + 0.7, -w * 0.28 + 1.9, 1.1, dp / 2 + 1.5, M.PATCH_D, { md: 0.8 });
    b.box(-w * 0.28, 1.1, dp / 2 + 1.3, -w * 0.28 + 1.9, 1.5, dp / 2 + 1.5, M.PATCH_D, { md: 0.8 });
    b.box(-w * 0.28 + 2.4, 0.72, dp / 2 + 1.5, -w * 0.28 + 3.0, 1.0, dp / 2 + 2.0, M.TARP_ORANGE, { md: 0.6 });
    b.box(w * 0.05, 2.2, dp / 2 + 2.3, w * 0.05 + 0.3, 2.5, dp / 2 + 2.5, M.LAMP_SODIUM, { md: 0.8 });
    // chimney, aerial, tires
    b.cyl('y', w * 0.3, 0.2, 0.22, 0.22, h + 0.2, h + 2.6, M.STEEL_DARK, { md: 1 });
    b.cyl('y', w * 0.3, 0.2, 0.34, 0.34, h + 2.6, h + 2.8, M.STEEL, { md: 1 });
    b.box(-w * 0.3 - 0.03, h + 0.2, -0.03, -w * 0.3 + 0.03, h + 3.6, 0.03, M.STEEL, { md: 0.5 });
    b.box(-w * 0.3 - 0.9, h + 3.0, -0.02, -w * 0.3 + 0.9, h + 3.06, 0.02, M.STEEL, { md: 0.5 });
    b.box(-w * 0.3 - 0.6, h + 3.4, -0.02, -w * 0.3 + 0.6, h + 3.46, 0.02, M.STEEL, { md: 0.5 });
    for (let k = 0; k < 5; k++) b.cyl('y', w / 2 + 1.3 + (k & 1) * 0.2, -1.3, 0.55, 0.55, k * 0.3, k * 0.3 + 0.3, M.TIRE, { md: 1 });
    b.box(w / 2 - 1.6, 0, dp / 2 + 0.3, w / 2 - 0.4, 0.7, dp / 2 + 1.1, M.CONCRETE_DARK, { md: 1.5 });
  },
});

// A bonfire in a ring of stones, two lawn chairs, a cooler and a folding table. The fire glows day and night.
const bonfire = defineKit({
  id: 'bonfire',
  conservative: true,
  build(d, b, rng) {
    for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; b.blob(Math.cos(t) * 1.25, 0.2, Math.sin(t) * 1.25, 0.28, 0.22, 0.28, M.ROCK, a + 3, 0.25, M.ROCK_DARK, 0.3, { md: 1.5 }); }
    b.cyl('y', 0, 0, 1.15, 1.15, 0, 0.06, M.DIRT_DARK, { md: 2 });
    for (let k = 0; k < 5; k++) { const t = (k / 5) * Math.PI * 2 + 0.3; strut(b, [Math.cos(t) * 0.9, 0.15, Math.sin(t) * 0.9], [Math.cos(t + 0.4) * 0.15, 0.8, Math.sin(t + 0.4) * 0.15], 0.14, M.WOOD_DARK); }
    b.cyl('y', 0, 0, 0.5, 0.05, 0.3, 1.5, M.SIGNAL_AMBER);
    b.cyl('y', 0, 0, 0.3, 0.02, 0.3, 1.1, M.SIGNAL_RED, { md: 1.5 });
    for (const [x, z, a] of [[-2.2, -0.6, 0.3], [-1.6, 1.9, 0.9]]) {
      const c = Math.cos(a), s = Math.sin(a);
      const P = (u, v) => [x + u * c - v * s, z + u * s + v * c];
      for (const [u, v] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const [px, pz] = P(u, v); b.box(px - 0.03, 0, pz - 0.03, px + 0.03, 0.4, pz + 0.03, M.STEEL_BRIGHT, { md: 0.4 }); }
      const [sx, sz] = P(0, 0);
      b.box(sx - 0.34, 0.4, sz - 0.34, sx + 0.34, 0.46, sz + 0.34, M.TARP_BLUE, { md: 0.5 });
      const [bx, bz] = P(-0.3, 0);
      b.box(bx - 0.04, 0.46, bz - 0.34, bx + 0.04, 0.95, bz + 0.34, M.TARP_BLUE, { md: 0.5 });
    }
    b.box(2.0, 0, 0.3, 2.9, 0.5, 0.9, M.PAINT_WHITE, { md: 0.6 });
    b.box(2.0, 0.5, 0.3, 2.9, 0.56, 0.9, M.TARP_BLUE, { md: 0.6 });
    b.box(1.2, 0, -2.2, 2.4, 0.75, -1.6, M.WOOD_MID, { md: 0.6 });
    for (let i = 0; i < 4; i++) b.cyl('y', 1.5 + i * 0.25, -1.9, 0.05, 0.05, 0.75, 0.9, i & 1 ? M.SIGN_RED : M.STEEL_BRIGHT, { md: 0.3 });
  },
});

// Water tank on stilts: a rusty drum with a cone, four braced wooden legs, a ladder and a pipe down to a spigot.
const watertank = defineKit({
  id: 'watertank',
  conservative: true,
  build(d, b, rng) {
    const H = d.h ?? 6.4, r = 1.9;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) strut(b, [sx * 1.9, 0, sz * 1.9], [sx * 1.4, H, sz * 1.4], 0.26, M.WOOD_DARK);
    for (const y of [H * 0.35, H * 0.7]) { const q = 1.9 - (1.9 - 1.4) * (y / H); for (const [a, c] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) strut(b, [a[0] * q, y, a[1] * q], [c[0] * q, y, c[1] * q], 0.1, M.WOOD_MID, { md: 1 }); }
    b.box(-1.7, H, -1.7, 1.7, H + 0.2, 1.7, M.WOOD_DARK);
    b.cyl('y', 0, 0, r, r, H + 0.2, H + 3.2, M.ROOF_TIN_RUST);
    for (let y = H + 0.8; y < H + 3.2; y += 0.8) b.cyl('y', 0, 0, r + 0.06, r + 0.06, y, y + 0.1, M.RUST_DARK, { md: 0.6 });
    b.cyl('y', 0, 0, r + 0.1, 0.25, H + 3.2, H + 4.1, M.ROOF_TIN_RUST);
    for (let y = 0.4; y < H + 3; y += 0.4) b.box(1.35, y, -0.3, 1.45, y + 0.06, 0.3, M.STEEL, { md: 0.4 });
    b.cyl('y', -1.5, 0.3, 0.08, 0.08, 0.6, H, M.STEEL_DARK, { md: 0.6 });
    b.box(-1.7, 0.4, 0.2, -1.3, 0.7, 0.4, M.STEEL, { md: 0.5 });
    b.paint(-2, H, -2, 2, H + 4, 2, (x, y, z) => ((Math.sin(x * 3 + y) + Math.cos(z * 2.4 - y * 2)) > 1.1 ? M.RUST_DARK : 0), { md: 2 });
  },
});

const mailbox = defineKit({
  id: 'mailbox',
  conservative: true,
  build(d, b, rng) {
    b.box(-0.08, 0, -0.08, 0.08, 1.15, 0.08, M.WOOD_WEATHERED);
    b.box(-0.22, 1.15, -0.4, 0.22, 1.5, 0.4, M.STEEL_DARK);
    b.box(0.22, 1.25, -0.05, 0.3, 1.6, 0.05, M.SIGN_RED, { md: 0.4 });
    b.box(-0.5, 1.6, -0.03, 0.5, 1.95, 0.03, M.WOOD_LIGHT, { md: 0.5 });
    textBoxes(b, d.style?.text ?? 'EARL', 0, 1.65, 0.02, 0.05, M.PAINT_WHITE, 0.03, { md: 0.25 });
  },
});

// Split-rail fence with a gap where a rail has fallen. w is the run in meters.
const fencerow = defineKit({
  id: 'fencerow',
  conservative: true,
  maxCell: 2,
  build(d, b, rng) {
    const L = d.w ?? 24;
    for (let x = -L / 2; x <= L / 2 + 0.01; x += 3) {
      b.box(x - 0.09, 0, -0.09, x + 0.09, 1.35, 0.09, M.WOOD_DARK);
      for (const y of [0.35, 0.75, 1.15]) {
        const sag = rng.range(-0.05, 0.05);
        if (x < L / 2 - 0.01 && !(y === 0.75 && Math.abs(x - L * 0.18) < 1.6)) b.box(x, y - 0.06 + sag, -0.06, x + 3, y + 0.06 + sag, 0.06, M.WOOD_WEATHERED);
      }
    }
    b.box(L * 0.18 - 1.3, 0, 0.2, L * 0.18 + 1.6, 0.14, 0.34, M.WOOD_WEATHERED, { md: 1 });
  },
});

// Pigpen: a mud floor, rail fence, a tin shelter, a trough and three pigs.
const pigpen = defineKit({
  id: 'pigpen',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 7, dp = d.d ?? 5.5;
    b.box(-w / 2, 0, -dp / 2, w / 2, 0.06, dp / 2, M.DIRT_DARK, { md: 2 });
    for (const [x0, z0, x1, z1] of [[-w / 2, dp / 2, w / 2, dp / 2], [-w / 2, -dp / 2, w / 2, -dp / 2], [-w / 2, -dp / 2, -w / 2, dp / 2], [w / 2, -dp / 2, w / 2, dp / 2]]) {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.6));
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n; b.box(x - 0.08, 0, z - 0.08, x + 0.08, 1.15, z + 0.08, M.WOOD_DARK, { md: 1.5 }); }
      for (const y of [0.4, 0.75, 1.1]) b.box(Math.min(x0, x1) - 0.05, y - 0.05, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, y + 0.05, Math.max(z0, z1) + 0.05, M.WOOD_WEATHERED, { md: 1.5 });
    }
    b.wedge(-w / 2 + 0.3, 1.5, -dp / 2 + 0.3, -w / 2 + 3.0, 2.3, -dp / 2 + 2.6, '+z', M.ROOF_TIN_RUST);
    for (const [x, z] of [[-w / 2 + 0.4, -dp / 2 + 0.4], [-w / 2 + 2.9, -dp / 2 + 0.4], [-w / 2 + 0.4, -dp / 2 + 2.5], [-w / 2 + 2.9, -dp / 2 + 2.5]]) b.box(x - 0.07, 0, z - 0.07, x + 0.07, 1.6, z + 0.07, M.WOOD_DARK, { md: 1 });
    b.box(w / 2 - 2.2, 0, dp / 2 - 1.0, w / 2 - 0.4, 0.4, dp / 2 - 0.5, M.WOOD_MID, { md: 1 });
    for (let i = 0; i < 3; i++) { const x = -0.5 + i * 1.5, z = rng.range(-0.5, 1.2); b.box(x - 0.5, 0.15, z - 0.28, x + 0.5, 0.65, z + 0.28, M.PLASTER_TERRA, { md: 0.6 }); b.box(x + 0.45, 0.3, z - 0.15, x + 0.65, 0.55, z + 0.15, M.PLASTER_TERRA, { md: 0.4 }); }
  },
});

// A cannibalized airframe: a tube fuselage half covered in cloth, a wing panel against a barrel, an engine on a chain hoist.
const wreck = defineKit({
  id: 'wreck',
  conservative: true,
  build(d, b, rng) {
    const L = 4.8;
    const ring = (x, r) => [[x, 0.7 + r, -r * 0.7], [x, 0.7 + r, r * 0.7], [x, 0.7 - r * 0.2, r * 0.7], [x, 0.7 - r * 0.2, -r * 0.7]];
    const rings = []; for (let i = 0; i <= 6; i++) rings.push(ring(-L / 2 + (i * L) / 6, 0.55 - i * 0.05));
    for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) strut(b, rings[i][k], rings[i + 1][k], 0.07, M.STEEL_DARK);
    for (let i = 0; i <= 6; i++) for (let k = 0; k < 4; k++) strut(b, rings[i][k], rings[i][(k + 1) % 4], 0.05, M.STEEL_DARK, { md: 0.5 });
    for (let i = 0; i < 6; i++) if (i < 3) { b.box(rings[i][0][0], 0.6, -0.4, rings[i + 1][0][0], 1.2, -0.36, M.FABRIC_TAN, { md: 1 }); b.box(rings[i][0][0], 0.9, 0.36, rings[i + 1][0][0], 1.2, 0.4, M.FABRIC_TAN, { md: 1 }); }
    b.box(-L / 2 - 0.05, 0.4, -0.5, -L / 2 + 0.4, 1.3, 0.5, M.PATCH_C, { md: 1 });
    b.box(L / 2, 0.55, -0.3, L / 2 + 0.03, 1.4, 0.3, M.STEEL_DARK, { md: 1 });
    for (const x of [-1.4, 1.2]) b.box(x - 0.3, 0, -0.35, x + 0.3, 0.45, 0.35, M.CONCRETE_DARK, { md: 1 });
    // tail fin skeleton
    strut(b, [-L / 2, 0.9, 0], [-L / 2 - 0.3, 2.1, 0], 0.06, M.STEEL_DARK, { md: 0.7 });
    strut(b, [-L / 2 - 0.9, 0.9, 0], [-L / 2 - 0.3, 2.1, 0], 0.05, M.STEEL_DARK, { md: 0.7 });
    // wing panel leaning on a barrel
    b.cyl('y', 3.4, 2.2, 0.32, 0.32, 0, 0.9, M.PAINT_BARN_RED, { md: 1 });
    b.wedge(2.0, 0.85, 2.4, 3.4, 1.4, 5.4, '+z', M.PATCH_A, { md: 1 });
    // A-frame with a chain hoist and an engine hanging under it
    for (const z of [-2.6, -1.0]) { strut(b, [-3.2, 0, z - 0.3], [-3.2, 2.9, (z + -1.8) * 0.5 - 0.1], 0.14, M.WOOD_DARK); strut(b, [-3.2, 0, z + 0.3], [-3.2, 2.9, (z + -1.8) * 0.5 + 0.1], 0.14, M.WOOD_DARK); }
    b.box(-3.35, 2.85, -3.3, -3.05, 3.05, -0.3, M.STEEL_DARK, { md: 1 });
    for (let y = 1.7; y < 2.85; y += 0.16) b.box(-3.24, y, -1.85, -3.16, y + 0.1, -1.75, M.STEEL, { md: 0.4 });
    b.box(-3.55, 1.0, -2.1, -2.85, 1.7, -1.5, M.STEEL_DARK, { md: 1 });
    for (let i = 0; i < 4; i++) b.cyl('y', -3.4 + (i & 1) * 0.4, -2.0 + (i >> 1) * 0.3, 0.1, 0.1, 1.7, 2.0, M.STEEL, { md: 0.4 });
  },
});

export default [windmill, chickencoop, woodpile, still, busshack, bonfire, watertank, mailbox, fencerow, pigpen, wreck];

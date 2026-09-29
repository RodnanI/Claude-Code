import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Noise } from '../../core/noise.js';
import { textBoxes, textPixels } from '../../voxel/glyphs.js';
import { strut } from '../../aircraft/builders/parts.js';
import { foundation, rails } from './_util.js';
import { Facade } from './_tower.js';

/* Military base structures: earth-covered ammunition bunkers, watchtowers, the main gate with its portal, a lattice communications
   mast, flagpoles, the plinth of a gate guardian aircraft and the headquarters building. Local +z is the front. */

// Ammunition bunker: a concrete barrel arch under a grassed mound, steel doors, blast wall wings and a gravel apron.
const bunker = defineKit({
  id: 'bunker',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 12, dp = d.d ?? 22, r = w / 2;
    const camo = new Noise((d.seed | 0) + 41);
    b.box(-r - 3, -1.5, -dp / 2 - 1, r + 3, 0.12, dp / 2 + 7, M.GRAVEL);
    b.fn(-r, 0, -dp / 2, r, r, dp / 2, (x, y) => (x * x + y * y <= r * r ? M.CONCRETE_PANEL : 0));
    b.fn(-r + 0.8, 0, -dp / 2 + 0.8, r - 0.8, r, dp / 2 - 0.8, (x, y) => (x * x + y * y <= (r - 0.8) * (r - 0.8) ? -1 : 0), { md: 1.5 });
    b.box(-r + 0.8, 0, -dp / 2 + 0.8, r - 0.8, 0.2, dp / 2 - 0.8, M.CONCRETE_DARK, { md: 1.5 });
    b.blob(0, r * 0.55, 0, r * 1.35, r * 0.9, dp * 0.56, M.GRASS, (d.seed | 0) + 5, 0.16, M.DIRT, 0.3);
    b.paint(-r - 1, 0, -dp / 2, r + 1, r + 2, dp / 2, (x, y, z) => (camo.n3(x * 0.4, y * 0.4, z * 0.4) > 0.42 ? M.GRASS_DRY : 0), { md: 3 });
    // front wall with the doors, wing walls to either side, lights and a number
    b.box(-r - 1.4, 0, dp / 2 - 0.9, r + 1.4, r + 0.9, dp / 2, M.CONCRETE);
    const dwid = r * 0.55;
    b.carve(-dwid, 0.15, dp / 2 - 1.2, dwid, r * 0.62, dp / 2 + 0.2, { md: 1.5 });
    b.box(-dwid, 0.15, dp / 2 - 0.35, -dwid * 0.02, r * 0.62, dp / 2 + 0.15, M.STEEL_DARK, { md: 1.5 });
    b.box(dwid * 0.02, 0.15, dp / 2 - 0.35, dwid, r * 0.62, dp / 2 + 0.15, M.STEEL, { md: 1.5 });
    for (const y of [1.0, 2.2]) b.box(-dwid, y, dp / 2 + 0.1, dwid, y + 0.14, dp / 2 + 0.22, M.SIGN_YELLOW, { md: 0.6 });
    for (const s of [-1, 1]) {
      b.box(s * (r + 1.4) - (s > 0 ? 0 : 5), 0, dp / 2 - 0.9, s * (r + 1.4) + (s > 0 ? 5 : 0), 2.9, dp / 2 + 0.2, M.CONCRETE, { md: 2 });
      b.box(s * (r * 0.75) - 0.25, r * 0.66 + 0.2, dp / 2 + 0.0, s * (r * 0.75) + 0.25, r * 0.66 + 0.7, dp / 2 + 0.5, M.LAMP_WHITE, { md: 0.8 });
    }
    textBoxes(b, d.style?.label ?? 'A' + String(1 + ((d.seed | 0) % 30)).padStart(2, '0'), 0, r * 0.62 + 0.4, dp / 2 + 0.2, 0.2, M.PAINT_WHITE, 0.08, { md: 0.4 });
    b.cyl('y', -r * 0.5, 1, 0.07, 0.03, r * 0.9, r * 0.9 + 3, M.STEEL, { md: 0.6 });
    b.cyl('y', r * 0.5, -dp * 0.25, 0.25, 0.25, r * 0.85, r * 0.85 + 1.1, M.STEEL_DARK, { md: 1.5 });
    b.box(-r - 0.5, 0, -1.2, -r, 0.9, 1.2, M.STEEL_DARK, { md: 1.5 });
    for (let x = -r - 2; x <= r + 2; x += 2) b.box(x - 0.1, 0, dp / 2 + 5.4, x + 0.1, 0.9, dp / 2 + 5.6, M.STEEL_DARK, { md: 1.5 });
  },
});

// Watchtower: four raked legs with braces, a cab with a glass band and a hip roof, a searchlight, a ladder, sandbags at the foot.
const watchtower = defineKit({
  id: 'watchtower',
  conservative: true,
  build(d, b, rng) {
    const H = d.h ?? 9, base = 2.4, top = 1.7, st = d.style || {};
    const mat = st.mat ?? M.MIL_OLIVE;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      strut(b, [sx * base, 0, sz * base], [sx * top, H, sz * top], 0.32, mat);
      b.box(sx * base - 0.5, -0.4, sz * base - 0.5, sx * base + 0.5, 0.3, sz * base + 0.5, M.CONCRETE_DARK, { md: 2 });
    }
    for (const t of [0.34, 0.68]) {
      const r0 = base + (top - base) * t, r1 = base + (top - base) * (t + 0.34);
      const y0 = H * t, y1 = H * (t + 0.34);
      for (const [a, c] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) {
        strut(b, [a[0] * r0, y0, a[1] * r0], [c[0] * r1, y1, c[1] * r1], 0.1, M.STEEL_DARK, { md: 1 });
        strut(b, [c[0] * r0, y0, c[1] * r0], [a[0] * r1, y1, a[1] * r1], 0.1, M.STEEL_DARK, { md: 1 });
      }
    }
    // cab
    const cw = top + 0.9;
    b.box(-cw, H, -cw, cw, H + 0.35, cw, M.WOOD_DARK);
    b.box(-cw, H + 0.35, -cw, cw, H + 1.1, cw, mat);
    b.box(-cw + 0.05, H + 1.1, -cw + 0.05, cw - 0.05, H + 2.2, cw - 0.05, M.GLASS_DARK);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(sx * cw - 0.15 - (sx > 0 ? 0.0 : 0), H + 1.1, sz * cw - 0.15, sx * cw + 0.15, H + 2.3, sz * cw + 0.15, M.STEEL_DARK, { md: 1 });
    b.hip(-cw - 0.7, -cw - 0.7, cw + 0.7, cw + 0.7, H + 2.3, 1.0, M.MIL_CAMO_DARK);
    b.box(-0.4, H + 3.2, -0.4, 0.4, H + 3.9, 0.4, M.STEEL_DARK, { md: 1 });
    b.cyl('x', H + 3.55, 0, 0.32, 0.32, -0.2, 0.9, M.LAMP_WHITE, { md: 0.8 });
    b.box(-0.05, H + 3.9, -0.05, 0.05, H + 5.0, 0.05, M.STEEL, { md: 0.6 });
    b.box(-0.1, H + 5.0, -0.1, 0.1, H + 5.3, 0.1, M.BEACON_RED, { md: 1.5 });
    rails(b, -cw - 0.4, cw + 0.4, cw + 0.4, cw + 0.4, H + 0.35, 0.9, M.STEEL, 1.4);
    rails(b, -cw - 0.4, -cw - 0.4, cw + 0.4, -cw - 0.4, H + 0.35, 0.9, M.STEEL, 1.4);
    // ladder on the +x side and a ring of sandbags at the foot
    for (let y = 0.4; y < H; y += 0.45) b.box(base - 0.4, y, -0.4, base - 0.3, y + 0.06, 0.4, M.STEEL_BRIGHT, { md: 0.5 });
    for (let a = 0; a < 18; a++) { const t = (a / 18) * Math.PI * 2, x = Math.cos(t) * (base + 1.6), z = Math.sin(t) * (base + 1.6); b.box(x - 0.55, 0, z - 0.55, x + 0.55, 0.7, z + 0.55, M.MIL_SAND_BAG, { md: 1.5 }); }
  },
});

// Main gate: a portal with the name of the base, two lanes with striped arms, a guard booth behind a sandbag wall, flagpoles.
const guardpost = defineKit({
  id: 'guardpost',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 30, dp = d.d ?? 14, st = d.style || {};
    const text = (st.text ?? 'FORT TALON').toUpperCase(), px = Math.min(0.55, (w - 6) / textPixels(text));
    b.box(-w / 2, 0, -dp / 2, w / 2, 0.1, dp / 2, M.CONCRETE_DARK, { md: 2 });
    // portal
    for (const s of [-1, 1]) {
      b.box(s * (w / 2 - 1.4) - 1.1, 0, -1.1, s * (w / 2 - 1.4) + 1.1, 7.6, 1.1, M.CONCRETE_PANEL);
      b.box(s * (w / 2 - 1.4) - 1.3, 0, -1.3, s * (w / 2 - 1.4) + 1.3, 0.6, 1.3, M.CONCRETE_DARK, { md: 2 });
    }
    b.box(-w / 2 + 0.3, 6.8, -1.3, w / 2 - 0.3, 8.6, 1.3, M.MIL_GRAY);
    b.box(-w / 2 + 0.6, 7.0, 1.3, w / 2 - 0.6, 8.4, 1.4, M.MIL_CAMO_DARK, { md: 3 });
    textBoxes(b, text, 0, 7.15, 1.4, px, M.PAINT_WHITE, 0.15, { md: 1 });
    textBoxes(b, text, 0, 7.15, -1.55, px, M.PAINT_WHITE, 0.15, { md: 1 }, 1, true);
    b.box(-w / 2 + 0.3, 8.6, -1.4, w / 2 - 0.3, 8.9, 1.4, M.CONCRETE_DARK, { md: 2 });
    // booth behind a sandbag wall, in the middle between the lanes
    b.box(-1.6, 0, -dp / 2 + 1, 1.6, 2.9, -dp / 2 + 4.6, M.MIL_TAN);
    b.box(-1.7, 0.9, -dp / 2 + 4.5, 1.7, 2.5, -dp / 2 + 4.7, M.GLASS_DARK, { md: 1 });
    b.box(-1.9, 2.9, -dp / 2 + 0.8, 1.9, 3.2, -dp / 2 + 4.9, M.CONCRETE_DARK);
    for (let i = 0; i < 6; i++) b.box(-3.4 + i * 1.15, 0, -dp / 2 + 5.6, -2.5 + i * 1.15, 0.7, -dp / 2 + 6.5, M.MIL_SAND_BAG, { md: 1.5 });
    // striped arms across the two lanes, chicane barriers, cones
    for (const x of [-w / 4, w / 4]) {
      b.box(x - (x < 0 ? 2.6 : -1.6), 0, -1.0, x - (x < 0 ? 2.6 : -1.6) + 1.0, 1.3, 0.4, M.STEEL_DARK, { md: 1 });
      for (let i = 0; i < 6; i++) b.box(x - 1.6 + i * 0.85 + (x < 0 ? -1.0 : 0), 1.15, -0.8, x - 1.6 + (i + 0.5) * 0.85 + (x < 0 ? -1.0 : 0), 1.3, -0.4, i & 1 ? M.SIGN_RED : M.PAINT_WHITE, { md: 0.6 });
    }
    for (let i = 0; i < 4; i++) { const x = -w / 2 + 4 + i * 6; b.box(x - 1.5, 0, dp / 2 - 3.6 + (i & 1) * 1.6, x + 1.5, 0.85, dp / 2 - 3.0 + (i & 1) * 1.6, M.CONCRETE, { md: 1.5 }); }
    // sign and flagpoles
    b.box(-w / 2 + 2, 2.2, dp / 2 - 0.3, -w / 2 + 5.4, 3.5, dp / 2 - 0.2, M.SIGN_RED, { md: 1 });
    for (const x of [-4.2, 4.2]) { b.box(x - 0.07, 0, dp / 2 - 2, x + 0.07, 9.5, dp / 2 - 1.86, M.STEEL_BRIGHT, { md: 1 }); b.box(x + 0.07, 7.2, dp / 2 - 1.96, x + 2.2, 9.0, dp / 2 - 1.9, x < 0 ? M.SIGN_RED : M.TARP_BLUE, { md: 0.8 }); }
    b.box(-0.4, 8.9, -0.3, 0.4, 9.3, 0.3, M.BEACON_RED, { md: 2 });
  },
});

// Lattice communications mast: three raked legs, rings and diagonals, dishes and panels, guy wires to ground anchors.
const commsmast = defineKit({
  id: 'commsmast',
  conservative: true,
  build(d, b, rng) {
    const H = d.h ?? 46, R0 = 1.9, R1 = 0.55, N = 8;
    const at = (k, y) => { const a = (k / 3) * Math.PI * 2 + 0.5, r = R0 + (R1 - R0) * (y / H); return [Math.cos(a) * r, y, Math.sin(a) * r]; };
    for (let k = 0; k < 3; k++) strut(b, at(k, 0), at(k, H), 0.24, M.STEEL);
    for (let i = 0; i < N; i++) {
      const y0 = (i * H) / N, y1 = ((i + 1) * H) / N;
      for (let k = 0; k < 3; k++) {
        const k2 = (k + 1) % 3;
        strut(b, at(k, y0), at(k2, y1), 0.1, M.STEEL_DARK, { md: 1 });
        strut(b, at(k, y1), at(k2, y0), 0.1, M.STEEL_DARK, { md: 1 });
        strut(b, at(k, y1), at(k2, y1), 0.1, M.STEEL_DARK, { md: 1 });
      }
    }
    // dishes and panels on brackets
    for (const [y, k, s] of [[H * 0.42, 0, 1.5], [H * 0.62, 1, 1.2], [H * 0.8, 2, 0.9]]) {
      const [x, , z] = at(k, y), a = (k / 3) * Math.PI * 2 + 0.5;
      const dx = Math.cos(a), dz = Math.sin(a);
      b.box(x - 0.15, y - 0.15, z - 0.15, x + dx * 1.0 + 0.15, y + 0.15, z + dz * 1.0 + 0.15, M.STEEL_DARK, { md: 1 });
      b.ell(x + dx * 1.4, y, z + dz * 1.4, Math.max(0.3, Math.abs(dx) * 0.3 + s * Math.abs(dz)), s, Math.max(0.3, Math.abs(dz) * 0.3 + s * Math.abs(dx)), M.RADAR_WHITE, { md: 3 });
    }
    for (const y of [H * 0.9, H * 0.96]) b.box(-0.9, y, -0.05, 0.9, y + 1.6, 0.05, M.STEEL_BRIGHT, { md: 1 });
    b.cyl('y', 0, 0, 0.06, 0.03, H, H + 6, M.STEEL, { md: 1 });
    b.box(-0.2, H + 6, -0.2, 0.2, H + 6.6, 0.2, M.BEACON_RED);
    b.box(-0.35, H * 0.5 - 0.1, -0.35, 0.35, H * 0.5 + 0.4, 0.35, M.BEACON_RED, { md: 3 });
    // guy wires from two-thirds height to anchors on the ground
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5 + Math.PI / 3, ax = Math.cos(a) * H * 0.55, az = Math.sin(a) * H * 0.55;
      const [x, y, z] = at(k, H * 0.66);
      strut(b, [x, y, z], [ax, 0.3, az], 0.09, M.STEEL, { md: 0.6 });
      b.box(ax - 0.4, 0, az - 0.4, ax + 0.4, 0.5, az + 0.4, M.CONCRETE_DARK, { md: 2 });
    }
    b.box(-R0 - 3, 0, -3, -R0 - 0.5, 2.6, 2.2, M.CONCRETE_PANEL, { md: 1.5 });
    b.box(-R0 - 3.2, 2.6, -3.2, -R0 - 0.3, 2.8, 2.4, M.CONCRETE_DARK, { md: 1.5 });
    b.box(-R0 - 2.6, 0, 3, -R0 - 0.9, 1.4, 4.6, M.STEEL_DARK, { md: 1.5 });
  },
});

const flagpole = defineKit({
  id: 'flagpole',
  conservative: true,
  build(d, b) {
    const H = d.h ?? 14, st = d.style || {}, c = st.flag ?? [M.SIGN_RED, M.PAINT_WHITE, M.TARP_BLUE];
    b.cyl('y', 0, 0, 0.5, 0.5, 0, 0.35, M.CONCRETE, { md: 2 });
    b.cyl('y', 0, 0, 0.12, 0.06, 0.3, H, M.STEEL_BRIGHT);
    b.ell(0, H + 0.15, 0, 0.2, 0.2, 0.2, M.PAINT_YELLOW, { md: 1 });
    const fw = H * 0.24, fh = fw * 0.62;
    b.fn(0, H - fh - 0.5, -0.06, fw, H - 0.5, 0.06, (lx, ly, lz) => {
      const u = lx / fw, v = (ly - (H - fh - 0.5)) / fh, wave = Math.sin(u * 5.5) * 0.35 * u;
      if (Math.abs(lz - wave) > 0.09) return 0;
      if (u < 0.42 && v > 0.5) return c[2];
      return Math.floor((1 - v) * 7) & 1 ? c[1] : c[0];
    }, { md: 2 });
    b.box(-0.15, 1.2, 0.1, 0.15, 1.6, 0.16, M.SIGN_YELLOW, { md: 0.5 });
  },
});

// Gate guardian pedestal: a stepped base and a column. The aircraft on top is a prop placed by the region.
const plinth = defineKit({
  id: 'plinth',
  conservative: true,
  build(d, b) {
    const H = d.h ?? 6.5;
    b.cyl('y', 0, 0, 6.2, 6.2, -1, 0.35, M.CONCRETE_DARK);
    b.cyl('y', 0, 0, 5.2, 5.2, 0.35, 0.7, M.CONCRETE);
    b.cyl('y', 0, 0, 3.6, 3.6, 0.7, 1.1, M.STONE_LIGHT, { md: 3 });
    b.cyl('y', 0, 0, 1.0, 0.75, 1.1, H, M.CONCRETE_PANEL);
    b.cyl('y', 0, 0, 1.4, 1.4, H, H + 0.3, M.STEEL_DARK, { md: 2 });
    b.box(-1.6, 1.3, 1.05, 1.6, 2.5, 1.2, M.STEEL_BRIGHT, { md: 1 });
    for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; b.box(Math.cos(t) * 4.6 - 0.25, 0.7, Math.sin(t) * 4.6 - 0.25, Math.cos(t) * 4.6 + 0.25, 1.0, Math.sin(t) * 4.6 + 0.25, M.LAMP_WHITE, { md: 1 }); }
  },
});

// Headquarters: two floors, a pedimented porch on columns, wings, flags and a lit sign.
const hq = defineKit({
  id: 'hq',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 40, dp = d.d ?? 18, st = d.style || {};
    const T = new Facade(d, b, st.fac ?? 'FAC_PLASTER_CREAM');
    const yTop = T.Y(2);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    const [x0, z0, x1, z1] = T.wall(-w / 2, -dp / 2, w / 2, dp / 2, 0, yTop);
    b.box(x0 - 0.4, yTop - 0.9, z0 - 0.4, x1 + 0.4, yTop, z1 + 0.4, M.STONE_LIGHT, { md: 1.5 });
    b.hip(x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, yTop, 3.4, st.roof ?? M.ROOF_SLATE);
    // porch: steps, four columns, a pediment and a lit sign
    const pw = 12;
    b.box(-pw / 2 - 1, 0, z1, pw / 2 + 1, 0.45, z1 + 4.8, M.CONCRETE);
    for (let i = 0; i < 3; i++) b.box(-pw / 2 - 1 + i * 0.2, 0.15 * i, z1 + 4.8 + i * 0.3, pw / 2 + 1 - i * 0.2, 0.15 * i + 0.15, z1 + 5.1 + i * 0.3, M.CONCRETE, { md: 1 });
    for (const x of [-pw / 2 + 0.5, -pw / 6, pw / 6, pw / 2 - 0.5]) b.cyl('y', x, z1 + 4.2, 0.45, 0.4, 0.45, yTop - 0.7, M.PLASTER_WHITE);
    b.box(-pw / 2 - 0.4, yTop - 0.7, z1 - 0.1, pw / 2 + 0.4, yTop, z1 + 4.9, M.PLASTER_WHITE);
    b.gable(-pw / 2 - 0.4, z1 - 0.1, pw / 2 + 0.4, z1 + 4.9, yTop, 2.2, 'x', M.PLASTER_WHITE);
    b.box(-pw / 2 + 1, 0.5, z1 - 0.05, pw / 2 - 1, 3.1, z1 + 0.1, M.GLASS_DARK, { md: 1 });
    b.box(-2.4, yTop - 0.5, z1 + 5.0, 2.4, yTop - 0.2, z1 + 5.15, M.MIL_OLIVE, { md: 1 });
    for (const x of [-w / 2 + 3, w / 2 - 3]) { b.box(x - 0.06, 0, z1 + 6.5, x + 0.06, 9, z1 + 6.62, M.STEEL_BRIGHT, { md: 1 }); b.box(x + 0.06, 6.6, z1 + 6.52, x + 1.9, 8.7, z1 + 6.58, x < 0 ? M.SIGN_RED : M.TARP_BLUE, { md: 0.8 }); }
    for (let x = -w / 2 + 6; x < w / 2 - 3; x += 12) if (Math.abs(x) > pw) b.box(x - 0.5, yTop, -0.6 + (z1 + z0) / 2, x + 0.5, yTop + 3.4, 0.6 + (z1 + z0) / 2, M.CHIMNEY_BRICK, { md: 1.5 });
    b.box(x0 + 3, 0, z0 - 3, x0 + 12, 1.0, z0 - 0.5, M.CONCRETE_PANEL, { md: 2 });
  },
});

export default [bunker, watchtower, guardpost, commsmast, flagpole, plinth, hq];

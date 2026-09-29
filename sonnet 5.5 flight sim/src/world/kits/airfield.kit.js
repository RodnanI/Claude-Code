import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Noise } from '../../core/noise.js';
import { textBoxes, textPixels } from '../../voxel/glyphs.js';
import { pick, foundation, roofClutter, rails, leaves } from './_util.js';

/* Airfield structures: arched, gabled and cantilevered hangars and T-hangar rows, the control tower, hardened aircraft shelters,
   radar, security fence, SAM sites and the rotating beacon. Terminals, jet bridges, cargo sheds and the rest of a civil airport are
   in airport.kit.js, the base buildings in military.kit.js. Detail that cannot be seen from afar is gated with md (the largest
   voxel size, in meters, at which an op is still drawn), so the same recipe is a plain mass from the air and a real building close up. */

const oct = (x, z) => Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * 0.7071);

// Arched hangar: a hollow shell of ribs and skin with skylights, doors at both ends, an office annex and a big number.
const hangar = defineKit({
  id: 'hangar',
  conservative: true,
  build(d, b, rng) {
    const w = d.w, dp = d.d, st = d.style || {};
    const r = w / 2;
    const skin = st.skin ?? pick(rng, [M.ROOF_TIN, M.CLADDING_GRAY, M.CLADDING_SAND]);
    const inner = st.inner ?? M.CONCRETE_PANEL;
    const stripe = st.stripe ?? (st.mil ? M.MIL_GRAY : M.SIGN_RED);
    b.box(-r - 0.6, -2, -dp / 2 - 0.6, r + 0.6, 0.15, dp / 2 + 0.6, M.CONCRETE_DARK);
    // arched shell, hollowed so aircraft can be parked inside; a strip of skylights along the crown
    b.fn(-r, 0, -dp / 2, r, r, dp / 2, (x, y, z) => {
      if (x * x + y * y > r * r) return 0;
      if (y > r * 0.9 && Math.abs(x) < 1.2 && Math.floor((z + dp) / 7) % 3 === 1) return M.GLASS_CLEAR;
      return skin;
    });
    b.fn(-r + 0.7, 0, -dp / 2 + 0.7, r - 0.7, r, dp / 2 - 0.7, (x, y) => (x * x + y * y <= (r - 0.7) * (r - 0.7) ? -1 : 0), { md: 1.5 });
    b.box(-r + 0.7, 0, -dp / 2 + 0.7, r - 0.7, 0.2, dp / 2 - 0.7, inner, { md: 1.5 });
    // a band of color around the foot of the shell, and a stripe where the arch springs
    b.paint(-r - 0.1, 0, -dp / 2, r + 0.1, r, dp / 2, (x, y) => (y < 1.5 ? M.CONCRETE_DARK : y > 1.5 && y < 2.3 ? stripe : 0), { md: 4 });
    // door openings at both ends, with track, header and the leaves stacked at the sides
    const dw = w * 0.86, dh = r * 0.78;
    for (const s of [1, -1]) {
      const zf = s * dp / 2;
      b.carve(-dw / 2, 0.2, s > 0 ? zf - 1.2 : zf - 0.4, dw / 2, dh, s > 0 ? zf + 0.4 : zf + 1.2, { md: 1.5 });
      b.box(-dw / 2 - 0.5, 0, zf - 0.2, -dw / 2, dh + 0.5, zf + 0.3, M.STEEL_DARK, { md: 1 });
      b.box(dw / 2, 0, zf - 0.2, dw / 2 + 0.5, dh + 0.5, zf + 0.3, M.STEEL_DARK, { md: 1 });
      b.box(-dw / 2 - 0.5, dh, zf - 0.2, dw / 2 + 0.5, dh + 0.7, zf + 0.3, M.STEEL_DARK, { md: 1 });
      const zz = s > 0 ? zf + 0.3 : zf - 0.9;
      leaves(b, -dw / 2 - 0.4, -dw / 2 + dw * 0.22, 0, dh * 0.93, zz, 0.6, 5);
      leaves(b, dw / 2 - dw * 0.22, dw / 2 + 0.4, 0, dh * 0.93, zz, 0.6, 5);
      b.box(-dw / 2 - 0.5, dh + 0.7, zf - 0.2, dw / 2 + 0.5, dh + 1.0, zf + 0.3, M.SIGN_YELLOW, { md: 1 });
      for (let i = 0; i < 4; i++) b.box(-dw / 2 + 2 + i * (dw - 4) / 3 - 0.3, dh + 1.05, zf - 0.1, -dw / 2 + 2 + i * (dw - 4) / 3 + 0.3, dh + 1.5, zf + 0.5, M.LAMP_WHITE, { md: 0.8 });
    }
    // ribs and vents
    for (let z = -dp / 2 + 3; z < dp / 2; z += 6) b.fn(-r - 0.3, 0, z - 0.25, r + 0.3, r + 0.3, z + 0.25, (x, y) => { const q = x * x + y * y; return q <= (r + 0.3) * (r + 0.3) && q >= (r - 0.2) * (r - 0.2) ? M.STEEL : 0; }, { md: 1 });
    for (let z = -dp / 2 + 8; z < dp / 2 - 4; z += 14) b.box(-0.9, r - 0.3, z - 0.9, 0.9, r + 0.7, z + 0.9, M.STEEL_DARK, { md: 1 });
    // lit interior strip (emissive at night)
    b.box(-0.4, r - 1.2, -dp / 2 + 2, 0.4, r - 0.9, dp / 2 - 2, M.LAMP_WHITE, { md: 1 });
    // an office and stores annex against one long side, with a ribbon of windows and a door
    const ax = r - 1.2;
    b.box(ax, 0, -dp * 0.22, ax + 6.5, 4.4, dp * 0.22, M.CONCRETE_PANEL);
    b.facade(ax, 0, -dp * 0.22, ax + 6.5, 4.4, dp * 0.22, { floorH: 4.4, bay: 3.6, winW: 2.4, winH: 1.5, sill: 1.5, glass: [M.GLASS_SLATE, M.GLASS_CLEAR], lit: 0.25, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.4, corner: 1, sides: ['+x'] });
    b.box(ax - 0.1, 4.4, -dp * 0.22 - 0.2, ax + 6.7, 4.75, dp * 0.22 + 0.2, M.CONCRETE_DARK);
    b.box(ax + 6.4, 0, -1.0, ax + 6.7, 2.4, 1.0, M.WOOD_DARK, { md: 0.8 });
    b.box(ax + 1.5, 4.75, -2.0, ax + 4.5, 5.9, 0.5, M.STEEL, { md: 1 });
    for (const z of [-dp * 0.16, dp * 0.16]) b.box(ax + 6.5, 0, z - 1.5, ax + 6.7, 3.0, z + 1.5, M.STEEL, { md: 1 });
    // the hangar number over the +z door
    if (st.label) textBoxes(b, st.label, 0, dh + 2.4, dp / 2 + 0.1, 0.55, M.PAINT_WHITE, 0.3, { md: 0.9 });
    b.box(-dw / 2, 0, dp / 2, dw / 2, 0.06, dp / 2 + 7, M.CONCRETE, { md: 2 });
    b.box(-dw / 2, 0, -dp / 2 - 7, dw / 2, 0.06, -dp / 2, M.CONCRETE, { md: 2 });
  },
});

// Gable hangar: a steel frame, corrugated walls, a row of high windows, great sliding doors and a lean-to office.
const hangarGable = defineKit({
  id: 'hangar-gable',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 44, dp = d.d ?? 52, h = d.h || 11, st = d.style || {};
    const wall = st.wall ?? M.FAC_CORR_GRAY, roof = st.roof ?? M.ROOF_TIN;
    const pitch = Math.max(2.4, w * 0.11);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    b.box(-w / 2 - 0.15, 0, -dp / 2 - 0.15, w / 2 + 0.15, 1.1, dp / 2 + 0.15, M.CONCRETE, { md: 1.5 });
    // gable ends filled with wall, the roof on top with a ridge vent and ribs
    b.gable(-w / 2 - 0.7, -dp / 2 - 0.9, w / 2 + 0.7, dp / 2 + 0.9, h, pitch, 'z', roof);
    b.fn(-w / 2, h, -dp / 2 - 0.1, w / 2, h + pitch, dp / 2 + 0.1, (x, y, z) => (Math.abs(z) > dp / 2 - 0.5 && y < h + pitch * (1 - Math.abs(x) / (w / 2)) - 0.1 ? wall : 0));
    b.box(-0.7, h + pitch - 0.3, -dp / 2 + 3, 0.7, h + pitch + 0.8, dp / 2 - 3, M.STEEL, { md: 1.2 });
    for (let z = -dp / 2 + 4; z < dp / 2 - 2; z += 6) b.fn(-w / 2 - 0.7, h - 0.2, z - 0.15, w / 2 + 0.7, h + pitch + 0.4, z + 0.15, (x, y) => (Math.abs(y - (h + pitch * (1 - Math.abs(x) / (w / 2 + 0.7)) + 0.15)) < 0.22 ? M.STEEL_DARK : 0), { md: 0.6 });
    // high windows all round and a light band
    for (const s of [-1, 1]) {
      b.box(-w / 2 + 3, h - 2.4, s * (dp / 2) - 0.1, w / 2 - 3, h - 0.9, s * (dp / 2) + 0.1, M.GLASS_CLEAR, { md: 1.5 });
      b.box(s * (w / 2) - 0.1, h - 2.4, -dp / 2 + 3, s * (w / 2) + 0.1, h - 0.9, dp / 2 - 3, M.GLASS_CLEAR, { md: 1.5 });
    }
    // doors on the +z end: a wide opening, leaves stacked either side, a header and hazard corners
    const dw = w * 0.84, dh = h - 1.6;
    b.carve(-dw / 2, 0.15, dp / 2 - 1.4, dw / 2, dh, dp / 2 + 0.4, { md: 1.5 });
    b.box(-dw / 2 - 0.6, 0, dp / 2 - 0.2, -dw / 2, dh + 0.6, dp / 2 + 0.4, M.STEEL_DARK, { md: 1 });
    b.box(dw / 2, 0, dp / 2 - 0.2, dw / 2 + 0.6, dh + 0.6, dp / 2 + 0.4, M.STEEL_DARK, { md: 1 });
    b.box(-dw / 2 - 0.6, dh, dp / 2 - 0.2, dw / 2 + 0.6, dh + 1.0, dp / 2 + 0.6, M.STEEL_DARK, { md: 1 });
    leaves(b, -dw / 2, -dw * 0.12, 0.15, dh - 0.1, dp / 2 + 0.3, 0.55, 5, M.STEEL_BRIGHT, M.STEEL);
    b.box(-dw / 2, 0.15, dp / 2 + 0.85, -dw * 0.12, 0.5, dp / 2 + 0.9, M.SIGN_YELLOW, { md: 0.6 });
    b.box(dw / 2 - 1.2, 0.15, dp / 2 + 0.2, dw / 2, dh - 0.1, dp / 2 + 0.6, M.STEEL_DARK, { md: 1 });
    for (const x of [-dw / 2 - 0.6, dw / 2]) b.box(x, 0, dp / 2 + 0.4, x + 0.6, dh + 1.0, dp / 2 + 0.6, M.SIGN_YELLOW, { md: 0.6 });
    b.box(-dw / 2, dh + 1.05, dp / 2 + 0.05, dw / 2, dh + 1.35, dp / 2 + 0.5, M.STEEL_DARK, { md: 1.2 });
    // lean-to office on the long side, its own little roof and door, a blower and a tank
    b.box(w / 2, 0, -dp * 0.3, w / 2 + 6, 4.6, dp * 0.1, M.CONCRETE_PANEL);
    b.facade(w / 2, 0, -dp * 0.3, w / 2 + 6, 4.6, dp * 0.1, { floorH: 4.6, bay: 3.6, winW: 2.2, winH: 1.5, sill: 1.6, glass: [M.GLASS_SLATE, M.GLASS_CLEAR], lit: 0.25, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.4, corner: 1, sides: ['+x', '+z', '-z'] });
    b.wedge(w / 2 - 0.2, 4.6, -dp * 0.3 - 0.4, w / 2 + 6.5, 5.6, dp * 0.1 + 0.4, '+x', M.ROOF_FLAT);
    b.cyl('y', w / 2 + 3, dp * 0.16, 1.1, 1.1, 0, 2.4, M.TANK_GRAY, { md: 1 });
    b.box(w / 2 + 6.0, 0, -2.6 - dp * 0.1, w / 2 + 6.2, 2.4, -dp * 0.1 + 0.4, M.WOOD_DARK, { md: 1 });
    if (st.label) textBoxes(b, st.label, 0, h - 5.5, dp / 2 + 0.6, 0.7, M.PAINT_WHITE, 0.3, { md: 1.2 });
    for (const z of [dp / 2 - 6, -dp / 2 + 6]) b.box(-w / 2 - 0.3, h - 0.9, z - 0.5, -w / 2 + 0.4, h - 0.2, z + 0.5, M.LAMP_WHITE, { md: 1 });
    roofClutter(b, rng, -w / 2 + 3, -dp / 2 + 3, w / 2 - 3, dp / 2 - 3, h + pitch * 0.4, 0);
  },
});

// Cantilever maintenance hangar: a low box under a huge sloping roof that reaches out over the doors.
const hangarCantilever = defineKit({
  id: 'hangar-cantilever',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 96, dp = d.d ?? 64, h = d.h || 22, st = d.style || {};
    const over = 16, wall = st.wall ?? M.FAC_CORR_TAN;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    // sloped roof plate, high at the door side, thick and finished with a fascia
    b.fn(-w / 2 - 1, h - 1, -dp / 2 - 1, w / 2 + 1, h + 9, dp / 2 + over, (lx, ly, lz, cell) => {
      const t = (lz + dp / 2) / (dp + over);
      const top = h + 1.2 + 6.5 * t;
      const th = Math.max(1.5, cell);
      if (ly > top || ly < top - th) return 0;
      if (lz > dp / 2 + over - 0.9 || Math.abs(lx) > w / 2 + 0.4) return M.STEEL_BRIGHT;
      return ly > top - Math.max(0.3, cell * 1.05) ? M.ROOF_FLAT : M.CONCRETE_PANEL;
    });
    // masts and tie rods holding the cantilever
    for (const x of [-w / 2 + 6, 0, w / 2 - 6]) {
      b.box(x - 0.5, 0, dp / 2 + over - 3.5, x + 0.5, h + 6.6, dp / 2 + over - 2.5, M.STEEL_DARK, { md: 3 });
      for (let k = 0; k < 6; k++) b.box(x - 0.08, h + 6 - k * 1.0, dp / 2 + over - 3.4 - k * (over - 4) / 6, x + 0.08, h + 6.4 - k * 1.0, dp / 2 + over - 2.6 - k * (over - 4) / 6, M.STEEL, { md: 0.6 });
    }
    // the big door: the whole front opens; folded leaves stand at both sides
    const dw = w - 14, dh = h - 3;
    b.carve(-dw / 2, 0.15, dp / 2 - 2, dw / 2, dh, dp / 2 + 0.5, { md: 1.5 });
    b.box(-dw / 2 - 0.8, 0, dp / 2 - 0.4, -dw / 2, dh + 0.8, dp / 2 + 0.6, M.STEEL_DARK, { md: 2 });
    b.box(dw / 2, 0, dp / 2 - 0.4, dw / 2 + 0.8, dh + 0.8, dp / 2 + 0.6, M.STEEL_DARK, { md: 2 });
    b.box(-dw / 2 - 0.8, dh, dp / 2 - 0.4, dw / 2 + 0.8, dh + 1.2, dp / 2 + 0.6, M.STEEL_DARK, { md: 2 });
    leaves(b, -dw / 2 - 6, -dw / 2 - 0.9, 0.15, dh + 0.3, dp / 2 + 0.6, 0.5, 6);
    leaves(b, dw / 2 + 0.9, dw / 2 + 6, 0.15, dh + 0.3, dp / 2 + 0.6, 0.5, 6);
    // a stripe of light at the top of the inside and floor markings you can see through the opening
    b.box(-dw / 2 + 1, dh - 1.2, dp / 2 - 3, dw / 2 - 1, dh - 0.8, dp / 2 - 2.6, M.LAMP_WHITE, { md: 1.2 });
    b.box(-dw / 2, 0.15, dp / 2 - dp * 0.6, dw / 2, 0.22, dp / 2 - 1, M.CONCRETE, { md: 2 });
    // glazed office block on the +x flank, two floors
    b.box(w / 2, 0, -dp * 0.35, w / 2 + 9, 8.6, dp * 0.15, M.FAC_CURTAIN_BLUE);
    b.box(w / 2 - 0.2, 8.6, -dp * 0.35 - 0.3, w / 2 + 9.3, 9.1, dp * 0.15 + 0.3, M.CONCRETE_DARK);
    for (const z of [-dp * 0.3, dp * 0.1]) b.box(w / 2 + 9, 0, z - 1.1, w / 2 + 9.3, 3.2, z + 1.1, M.GLASS_DARK, { md: 1 });
    // the name of the operator along the fascia
    textBoxes(b, st.label ?? 'HANGAR', 0, h + 2.4, dp / 2 + over - 0.85, 0.95, M.PAINT_WHITE, 0.2, { md: 1.2 });
    roofClutter(b, rng, -w / 2 + 3, -dp / 2 + 3, w / 2 - 3, 0, h + 3.8, 4);
    for (const s of [-1, 1]) for (let z = -dp / 2 + 8; z < dp / 2; z += 14) b.box(s * (w / 2 + 0.05), h - 5, z - 1, s * (w / 2 + 0.05) + s * 0.4, h - 2, z + 1, M.GLASS_CLEAR, { md: 1.5 });
  },
});

// A row of small T-hangars under a shared shed roof. Every other door stands open on an empty bay.
const hangarT = defineKit({
  id: 'hangar-t',
  conservative: true,
  build(d, b, rng) {
    const n = d.n ?? 6, uw = 12.6, ud = d.d ?? 14, h = d.h || 4.8, W = n * uw;
    foundation(b, -W / 2, -ud / 2, W / 2, ud / 2, 1.5);
    b.box(-W / 2, 0, -ud / 2, W / 2, h, ud / 2, M.FAC_CORR_TAN);
    b.wedge(-W / 2 - 0.3, h, -ud / 2 - 0.4, W / 2 + 0.3, h + 1.8, ud / 2 + 1.6, '-z', M.ROOF_TIN);
    b.box(-W / 2 - 0.3, h + 1.6, -ud / 2 - 0.4, W / 2 + 0.3, h + 1.9, -ud / 2 - 0.3, M.STEEL_DARK, { md: 1 });
    for (let i = 0; i < n; i++) {
      const x0 = -W / 2 + i * uw, open = (i + (d.seed | 0)) % 2 === 0;
      b.box(x0, 0, -ud / 2, x0 + 0.3, h, ud / 2 + 0.3, M.CONCRETE_PANEL);
      const dx0 = x0 + 1.0, dx1 = x0 + uw - 1.0;
      if (open) {
        b.carve(dx0, 0.1, ud / 2 - 1.5, dx1, h - 0.7, ud / 2 + 0.4, { md: 1.5 });
        b.box(dx0, 0.1, -ud / 2 + 0.6, dx1, 0.16, ud / 2 - 1, M.CONCRETE_DARK, { md: 2 });
        b.box(dx0 - 0.2, 0, ud / 2 + 0.3, dx0, h - 0.6, ud / 2 + 0.5, M.STEEL_DARK, { md: 1 });
        b.box(dx1, 0, ud / 2 + 0.3, dx1 + 0.2, h - 0.6, ud / 2 + 0.5, M.STEEL_DARK, { md: 1 });
        b.box(dx0, h - 0.8, ud / 2 + 0.3, dx1, h - 0.6, ud / 2 + 0.6, M.STEEL_DARK, { md: 1 });
      } else {
        leaves(b, dx0, dx1, 0.1, h - 0.7, ud / 2 + 0.1, 0.4, 8, M.STEEL, M.CLADDING_GRAY);
        b.box(dx0 + (dx1 - dx0) / 2 - 0.4, 1.0, ud / 2 + 0.5, dx0 + (dx1 - dx0) / 2 + 0.4, 1.2, ud / 2 + 0.6, M.SIGN_YELLOW, { md: 0.5 });
      }
      b.box(x0 + uw / 2 - 0.5, h - 0.6, ud / 2 + 0.45, x0 + uw / 2 + 0.5, h - 0.35, ud / 2 + 0.7, M.LAMP_WHITE, { md: 0.5 });
    }
    b.box(W / 2 - 0.3, 0, -ud / 2, W / 2, h, ud / 2 + 0.3, M.CONCRETE_PANEL);
    for (let i = 0; i <= n; i += 2) b.box(-W / 2 + i * uw - 1.2, 0, ud / 2 + 0.2, -W / 2 + i * uw + 1.2, 0.05, ud / 2 + 2.4, M.CONCRETE, { md: 3 });
  },
});

// Control tower: a base building and a tall shaft with slit windows, a flared cab of sloping glass on an octagon, a balcony,
// a visor roof and a rooftop of antennas and a radar. Military towers are gray, carry a radome and a lattice mast.
const tower = defineKit({
  id: 'tower',
  conservative: true,
  build(d, b, rng) {
    const H = d.h ?? 30, mil = !!d.style?.mil;
    const shaft = mil ? M.MIL_GRAY : M.CONCRETE_PANEL, trim = mil ? M.MIL_CAMO_DARK : M.CONCRETE_DARK;
    b.box(-9.5, -2, -8, 9.5, 0.1, 8, M.CONCRETE_DARK);
    // base building with a ribbon of windows and a roof terrace
    b.box(-8.4, 0, -6.4, 8.4, 4.6, 6.4, mil ? M.MIL_TAN : M.CONCRETE_BLDG);
    b.facade(-8.4, 0, -6.4, 8.4, 4.6, 6.4, { floorH: 4.6, bay: 3.5, winW: 2.2, winH: 1.6, sill: 1.5, glass: [M.GLASS_SLATE], lit: 0.25, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.4, corner: 1 });
    b.box(-8.7, 4.6, -6.7, 8.7, 5.0, 6.7, trim);
    rails(b, -8.5, -6.5, 8.5, -6.5, 5.0, 1.0, M.STEEL, 2.8); rails(b, -8.5, 6.5, 8.5, 6.5, 5.0, 1.0, M.STEEL, 2.8);
    b.box(4.5, 5.0, 2.5, 8.0, 7.4, 6.0, M.CONCRETE_PANEL, { md: 1.2 });
    b.box(-0.8, 0, 6.4, 0.8, 2.3, 6.55, M.WOOD_DARK, { md: 0.7 });
    // the shaft: corner fins, slit windows, floor bands
    b.box(-2.7, 4.6, -2.7, 2.7, H, 2.7, shaft);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(sx * 2.7 - 0.45, 4.6, sz * 2.7 - 0.45, sx * 2.7 + 0.45, H, sz * 2.7 + 0.45, trim, { md: 3 });
    b.paint(-3.2, 5.2, -3.2, 3.2, H - 1, 3.2, (lx, ly, lz) => {
      const onX = Math.abs(lx) > 2.4, onZ = Math.abs(lz) > 2.4;
      if (!(onX || onZ)) return 0;
      const c = onX ? lz : lx, band = (ly - 5.2) % 4.4;
      return Math.abs(c) < 0.32 && band > 1.0 && band < 3.4 ? M.GLASS_DARK : 0;
    }, { md: 1.5 });
    for (let y = 5; y < H - 1; y += 4.4) b.box(-2.95, y, -2.95, 2.95, y + 0.22, 2.95, trim, { md: 1.2 });
    // a stair core bulge and an elevator machine box up the side
    b.box(2.7, 4.6, -1.3, 4.0, H - 2, 1.3, shaft, { md: 4 });
    b.box(3.9, 4.6, -0.2, 4.1, H - 2, 0.2, M.STEEL_DARK, { md: 1 });
    // flare from the shaft up to the cab
    const cab0 = H + 4.6, cab1 = cab0 + 4.4;
    b.fn(-6.5, H, -6.5, 6.5, cab0, 6.5, (lx, ly, lz) => {
      const t = (ly - H) / 4.6, r = 2.7 + 3.2 * t * t;
      return oct(lx, lz) <= r ? (t > 0.75 ? M.WINDOW_LIT_DIM : shaft) : 0;
    });
    b.box(-3.6, H + 0.4, -3.6, 3.6, H + 0.6, 3.6, trim, { md: 2 });
    // balcony ring with rails
    b.fn(-8.2, cab0 - 0.5, -8.2, 8.2, cab0 - 0.05, 8.2, (lx, ly, lz, cell) => (oct(lx, lz) <= 7.4 ? M.CONCRETE_DARK : 0));
    const V = 7.4, W2 = 3.06;
    const ring = [[W2, -V], [V, -W2], [V, W2], [W2, V], [-W2, V], [-V, W2], [-V, -W2], [-W2, -V]];
    for (let i = 0; i < 8; i++) { const p = ring[i], q = ring[(i + 1) % 8]; rails(b, p[0], p[1], q[0], q[1], cab0 - 0.05, 1.05, M.STEEL_BRIGHT, 1.7); }
    // the cab: eight faces of glass that lean outward, mullions at the corners, a lit console under the sill
    b.fn(-7.4, cab0, -7.4, 7.4, cab1, 7.4, (lx, ly, lz, cell) => {
      const y = ly - cab0, r = 5.5 + y * 0.33, th = Math.max(0.5, cell * 0.9);
      const o = oct(lx, lz);
      if (o > r || o < r - th) return o < r - th && y < 0.5 ? M.CONCRETE_DARK : 0;
      const ang = ((Math.atan2(lz, lx) + Math.PI * 2) % (Math.PI / 4)), corner = Math.min(ang, Math.PI / 4 - ang) * r < 0.36;
      if (y < 0.9) return M.CONCRETE_PANEL;
      if (corner || (y > 1.9 && y < 2.05)) return M.STEEL_DARK;
      return M.GLASS_DARK;
    });
    b.fn(-5.5, cab0 + 0.9, -5.5, 5.5, cab0 + 1.3, 5.5, (lx, ly, lz) => (oct(lx, lz) < 4.6 ? M.CONCRETE_DARK : 0), { md: 2 });
    b.box(-4.1, cab0 + 1.3, -4.1, 4.1, cab0 + 1.45, 4.1, M.LAMP_WHITE, { md: 1.2 });
    for (let i = 0; i < 4; i++) b.box(-3.6 + i * 1.9, cab0 + 0.3, -4.6, -2.7 + i * 1.9, cab0 + 0.9, -4.0, i % 2 ? M.WINDOW_LIT_COOL : M.WINDOW_LIT_DIM, { md: 0.9 });
    // roof: a thick visor overhanging the glass, a smaller upper deck
    b.fn(-8.6, cab1, -8.6, 8.6, cab1 + 1.3, 8.6, (lx, ly, lz, cell) => {
      const y = ly - cab1, o = oct(lx, lz);
      if (y < Math.max(0.7, cell * 0.8)) return o <= 7.9 ? trim : 0;
      return o <= 6.3 ? M.CONCRETE_PANEL : 0;
    });
    // roof gear: radar on a pedestal, a mast with the red light, whips, a wind vane, an equipment box
    const ry = cab1 + 1.3;
    b.box(-0.8, ry, -0.8, 0.8, ry + 1.6, 0.8, M.CONCRETE_DARK, { md: 1.5 });
    if (mil) {
      b.ell(0, ry + 3.6, 0, 2.6, 2.6, 2.6, M.RADAR_WHITE);
      b.cyl('y', 0, 0, 1.5, 1.5, ry, ry + 1.4, M.RADAR_WHITE, { md: 2 });
    } else {
      b.box(-0.25, ry + 1.6, -0.25, 0.25, ry + 2.3, 0.25, M.STEEL, { md: 1 });
      b.box(-2.6, ry + 2.3, -0.2, 2.6, ry + 3.8, 0.2, M.RADAR_WHITE, { md: 1.5 });
      b.box(-2.7, ry + 3.6, -0.15, 2.7, ry + 3.85, 0.15, M.STEEL_DARK, { md: 1.5 });
    }
    b.cyl('y', 3.4, 3.4, 0.14, 0.05, ry, ry + 6.5, M.STEEL, { md: 1 });
    b.box(3.28, ry + 6.5, 3.28, 3.52, ry + 7.0, 3.52, M.BEACON_RED);
    b.cyl('y', -3.6, 3.2, 0.06, 0.03, ry, ry + 5.0, M.STEEL, { md: 0.8 });
    b.cyl('y', -3.0, -3.6, 0.06, 0.03, ry, ry + 4.2, M.STEEL, { md: 0.8 });
    b.box(-4.5, ry, 2.5, -3.0, ry + 1.1, 4.4, M.STEEL, { md: 1.5 });
    b.cyl('y', -0.2, 4.6, 0.05, 0.05, ry, ry + 3.4, M.STEEL_DARK, { md: 0.6 });
    b.box(-0.9, ry + 3.4, 4.55, 0.5, ry + 3.5, 4.65, M.SIGN_RED, { md: 0.6 });
    if (mil) {
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; b.cyl('y', Math.cos(a) * 5.3, Math.sin(a) * 5.3, 0.06, 0.03, ry - 0.2, ry + 5.5 + k * 0.6, M.STEEL, { md: 0.8 }); }
      b.paint(-3.2, 4.6, -3.2, 3.2, H, 3.2, (lx, ly, lz) => (new Noise(9).n3(lx * 0.5, ly * 0.4, lz * 0.5) > 0.25 ? M.MIL_OLIVE : 0), { md: 3 });
    }
    // steel doors, a plant room and a diesel tank at the foot
    b.box(9.0, 0, -3.5, 11.6, 2.4, 1.0, M.CONCRETE_PANEL, { md: 1.5 });
    b.cyl('z', 10.3, 1.2, 1.0, 1.0, -3.2, 0.8, M.TANK_GRAY, { md: 1.5 });
    b.box(-11.5, 0, -1.6, -9.6, 1.5, 1.6, M.STEEL_DARK, { md: 1.5 });
  },
});

// Hardened aircraft shelter: a reinforced arch under an earth berm, ribbed concrete, camouflage paint, two steel blast doors
// with one leaf drawn aside, a hazard-striped apron, vent stacks and lights over the door.
const shelter = defineKit({
  id: 'shelter',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 17, dp = d.d ?? 26;
    const r = w / 2, hh = r * 0.95, st = d.style || {};
    const camo = new Noise((d.seed | 0) + 5);
    b.box(-r - 2, -2, -dp / 2 - 1, r + 2, 0.15, dp / 2 + 1.5, M.CONCRETE_DARK);
    // shell: outer ellipse of concrete with rib rings, hollowed inside, floor
    b.fn(-r, 0, -dp / 2, r, hh, dp / 2, (x, y, z) => {
      if ((x * x) / (r * r) + (y * y) / (hh * hh) > 1) return 0;
      const rib = ((z + dp) % 3.2) < 0.45;
      return rib ? M.CONCRETE_DARK : M.CONCRETE_PANEL;
    });
    b.fn(-r + 0.9, 0, -dp / 2 + 0.9, r - 0.9, hh, dp / 2 - 0.9, (x, y) => ((x * x) / ((r - 0.9) * (r - 0.9)) + (y * y) / ((hh - 0.9) * (hh - 0.9)) <= 1 ? -1 : 0));
    b.box(-r + 0.9, 0, -dp / 2 + 0.9, r - 0.9, 0.2, dp / 2 - 0.9, M.CONCRETE_DARK);
    b.box(-r + 0.9, 0.2, -dp / 2 + 0.9, r - 0.9, hh, -dp / 2 + 1.3, M.MIL_CAMO_DARK, { md: 3 });
    // earth cover over the crown, a scatter of rock and the paint
    b.blob(0, hh * 0.55, -dp * 0.05, r * 1.25, hh * 0.85, dp * 0.55, M.GRASS, d.seed + 3, 0.18, M.DIRT, 0.25);
    b.blob(r * 0.55, hh * 0.3, dp * 0.1, 2.2, 1.5, 2.6, M.ROCK, d.seed + 9, 0.3, M.ROCK_DARK, 0.3, { md: 3 });
    b.paint(-r - 0.2, 0, -dp / 2, r + 0.2, hh + 2, dp / 2, (x, y, z) => {
      const n = camo.n3(x * 0.32, y * 0.32, z * 0.32);
      return n > 0.28 ? M.MIL_OLIVE : n < -0.3 ? M.MIL_TAN : 0;
    }, { md: 4 });
    // doorway, frame, two blast door leaves (one drawn aside), a header with lamps and the shelter number
    const dwid = r * 0.78, dh = hh * 0.8;
    b.carve(-dwid, 0.2, dp / 2 - 1.4, dwid, dh, dp / 2 + 0.4);
    b.box(-dwid - 0.9, 0, dp / 2 - 0.6, -dwid, dh + 1.1, dp / 2 + 0.7, M.CONCRETE, { md: 1.5 });
    b.box(dwid, 0, dp / 2 - 0.6, dwid + 0.9, dh + 1.1, dp / 2 + 0.7, M.CONCRETE, { md: 1.5 });
    b.box(-dwid - 0.9, dh, dp / 2 - 0.6, dwid + 0.9, dh + 1.1, dp / 2 + 0.7, M.CONCRETE, { md: 1.5 });
    b.box(-dwid * 0.98, 0.2, dp / 2 - 0.5, -dwid * 0.02, dh * 0.98, dp / 2 - 0.05, M.STEEL_DARK, { md: 2 });
    b.box(-dwid * 0.98, 0.2, dp / 2 - 0.05, -dwid * 0.02, dh * 0.98, dp / 2 + 0.05, M.STEEL, { md: 1.5 });
    for (let k = 0; k < 4; k++) b.box(-dwid * 0.98, 0.7 + k * dh * 0.24, dp / 2 + 0.05, -dwid * 0.02, 0.9 + k * dh * 0.24, dp / 2 + 0.15, M.SIGN_YELLOW, { md: 0.8 });
    b.box(dwid * 0.55, 0.2, dp / 2 + 0.1, dwid * 0.98, dh * 0.96, dp / 2 + 0.5, M.STEEL_DARK, { md: 1.5 });
    b.box(dwid * 0.55, 0.2, dp / 2 + 0.5, dwid * 0.98, 0.5, dp / 2 + 0.6, M.SIGN_YELLOW, { md: 0.6 });
    for (const x of [-dwid * 0.75, dwid * 0.75]) b.box(x - 0.3, dh + 1.15, dp / 2, x + 0.3, dh + 1.6, dp / 2 + 0.6, M.LAMP_WHITE, { md: 0.9 });
    textBoxes(b, st.label ?? 'S' + String(1 + ((d.seed | 0) % 90)).padStart(2, '0'), 0, dh + 1.7, dp / 2 + 0.55, 0.28, M.PAINT_WHITE, 0.1, { md: 0.5 });
    // vents on the crown, a generator shed and a fuel connection at one flank
    for (const z of [-dp * 0.28, dp * 0.02]) { b.cyl('y', 0, z, 0.55, 0.55, hh + 0.6, hh + 2.1, M.STEEL_DARK, { md: 2 }); b.cyl('y', 0, z, 0.8, 0.8, hh + 2.1, hh + 2.4, M.STEEL, { md: 1 }); }
    b.box(r + 1.2, 0, -dp * 0.12, r + 4.4, 2.6, dp * 0.12, M.CONCRETE_PANEL, { md: 3 });
    b.box(r + 1.2, 2.6, -dp * 0.12 - 0.2, r + 4.6, 2.8, dp * 0.12 + 0.2, M.CONCRETE_DARK, { md: 3 });
    b.box(r + 4.4, 0.4, -0.8, r + 4.5, 1.9, 0.8, M.STEEL_DARK, { md: 1 });
    b.cyl('z', -r - 1.4, 0.5, 0.3, 0.3, -1.5, 1.5, M.STEEL_DARK, { md: 1 });
    // hazard striping on the apron lip
    for (let i = 0; i < 14; i++) b.box(-dwid - 1 + i * ((dwid * 2 + 2) / 14), 0.02, dp / 2 + 2, -dwid - 1 + (i + 0.5) * ((dwid * 2 + 2) / 14), 0.1, dp / 2 + 3.4, i & 1 ? M.TAXI_LINE : M.TIRE, { md: 1.2 });
  },
});

const radar = defineKit({
  id: 'radar',
  conservative: true,
  build(d, b) {
    b.box(-7, -2, -7, 7, 0.1, 7, M.CONCRETE_DARK);
    b.box(-5, 0, -5, 5, 5, 5, M.MIL_GRAY);
    b.facade(-5, 0, -5, 5, 5, 5, { floorH: 5, bay: 3.2, winW: 1.4, winH: 1.2, sill: 2.0, glass: [M.GLASS_DARK], lit: 0.1, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.4, corner: 1 });
    b.cyl('y', 0, 0, 3.4, 3.0, 5, 15, M.MIL_GRAY);
    for (let y = 6; y < 15; y += 3) b.cyl('y', 0, 0, 3.5, 3.5, y, y + 0.25, M.MIL_CAMO_DARK, { md: 1 });
    b.ell(0, 19, 0, 8, 8, 8, M.RADAR_WHITE);
    b.cyl('y', 0, 0, 6.5, 6.5, 14.4, 15.2, M.STEEL_DARK, { md: 1 });
    for (let a = 0; a < 6; a++) { const x = Math.cos((a / 6) * 6.283) * 7.6, z = Math.sin((a / 6) * 6.283) * 7.6; b.box(x - 0.15, 12, z - 0.15, x + 0.15, 26, z + 0.15, M.STEEL, { md: 1 }); }
    b.box(-0.4, 27, -0.4, 0.4, 28.2, 0.4, M.BEACON_RED);
    b.box(5.4, 0, -2.2, 8.6, 3.0, 2.2, M.CONCRETE_PANEL, { md: 2 });
    b.cyl('z', -9, 1.4, 1.4, 1.4, -1.5, 1.5, M.TANK_GRAY, { md: 2 });
    b.box(-6.8, 0, 2, -3.6, 1.9, 4, M.STEEL_DARK, { md: 2 });
  },
});

// Security fence: mesh in a frame, posts and, in the fine detail, barbed wire on outriggers, a concrete curb and a sign.
const fence = defineKit({
  id: 'fence',
  maxCell: 2,
  build(d, b) {
    const L = d.w ?? 30, H = 2.5;
    const bb = (cell) => [-L / 2, 0, -Math.max(0.12, cell * 0.5), L / 2, H, Math.max(0.12, cell * 0.5)];
    b.fn(-L / 2, 0, -0.5, L / 2, H, 0.5, (lx, ly, lz, cell) => {
      const ix = Math.floor(lx / Math.max(cell, 0.25)), iy = Math.floor(ly / Math.max(cell, 0.25));
      return (ix + iy) & 1 ? M.FENCE : 0;
    }, { bb });
    for (let x = -L / 2; x <= L / 2 + 0.01; x += 3) b.box(x - 0.25, 0, -0.25, x + 0.25, H + 0.4, 0.25, M.STEEL_DARK, { md: 1 });
    b.box(-L / 2, H + 0.1, -0.5, L / 2, H + 0.5, 0.5, M.STEEL_DARK, { md: 0.5 });
    b.box(-L / 2, 0, -0.3, L / 2, 0.25, 0.3, M.CONCRETE, { md: 0.75 });
    for (let x = -L / 2; x <= L / 2 + 0.01; x += 3) for (const s of [-1, 1]) b.box(x - 0.05, H + 0.4, s * 0.55 - 0.05, x + 0.05, H + 0.9, s * 0.55 + 0.05, M.STEEL_DARK, { md: 0.5 });
    for (const k of [0, 0.22, 0.44]) for (const s of [-1, 1]) b.box(-L / 2, H + 0.45 + k, s * 0.55 - 0.02, L / 2, H + 0.49 + k, s * 0.55 + 0.02, M.STEEL, { md: 0.4 });
    if ((d.seed | 0) % 3 === 0) b.box(-0.6, 1.2, 0.5, 0.6, 1.9, 0.56, M.SIGN_RED, { md: 0.5 });
  },
});

const sam = defineKit({
  id: 'sam',
  conservative: true,
  build(d, b) {
    // sandbag berm ring with launchers and a radar trailer
    const R = 9;
    for (let a = 0; a < 28; a++) {
      const t = (a / 28) * 6.283;
      if (Math.abs(t - 1.57) < 0.4) continue;
      const x = Math.cos(t) * R, z = Math.sin(t) * R;
      b.box(x - 1.2, 0, z - 1.2, x + 1.2, 1.5, z + 1.2, M.MIL_SAND_BAG);
      b.box(x - 1.1, 1.5, z - 1.1, x + 1.1, 1.8, z + 1.1, M.MIL_SAND_BAG, { md: 0.8 });
    }
    b.box(-R, -1, -R, R, 0.1, R, M.DIRT_DARK);
    for (const x of [-4, 4]) {
      b.box(x - 1.3, 0.4, -3.5, x + 1.3, 1.6, 3.5, M.MIL_OLIVE);
      for (const zz of [-2.4, -0.8, 0.8, 2.4]) { b.box(x - 0.4, 1.6, zz - 0.4, x + 0.4, 3.4, zz + 0.4, M.MIL_TAN, { md: 0.5 }); b.box(x - 0.3, 3.4, zz - 0.3, x + 0.3, 3.9, zz + 0.3, M.SIGN_RED, { md: 0.4 }); }
      b.box(x - 0.5, 0, -4.5, x + 0.5, 1.2, -3.5, M.TIRE, { md: 1 });
    }
    b.box(-1.4, 0.4, 5, 1.4, 3, 8, M.MIL_OLIVE);
    b.ell(0, 3.8, 6.5, 1.8, 1.0, 0.4, M.RADAR_WHITE, { md: 1 });
    b.box(-6, 0, -8.5, -4.5, 3, -6.5, M.MIL_CAMO_DARK, { md: 1 });
    b.box(-1.0, 0, -1.0, 1.0, 2.0, 1.0, M.MIL_TAN, { md: 1 });
    b.box(-0.9, 2.0, -0.9, 0.9, 2.4, 0.9, M.MIL_OLIVE, { md: 1 });
  },
});

const beacon = defineKit({
  id: 'beacon',
  conservative: true,
  build(d, b) {
    b.box(-0.5, -1, -0.5, 0.5, 14, 0.5, M.STEEL_DARK);
    for (let y = 2; y < 14; y += 3) b.box(-0.9, y, -0.9, 0.9, y + 0.15, 0.9, M.STEEL, { md: 0.8 });
    b.cyl('y', 0, 0, 1.4, 1.4, 14, 15.2, M.STEEL);
    b.cyl('y', 0, 0, 1.0, 1.0, 15.2, 16.8, M.LAMP_WHITE);
    b.box(-0.9, 16.8, -0.9, 0.9, 17.2, 0.9, M.STEEL_DARK);
    b.box(0.9, 15.4, -0.3, 1.5, 16.6, 0.3, M.RWY_LIGHT_GREEN);
    b.box(-1.5, 15.4, -0.3, -0.9, 16.6, 0.3, M.RWY_LIGHT_WHITE);
    b.box(-0.06, 17.2, -0.06, 0.06, 19, 0.06, M.STEEL, { md: 0.6 });
    b.box(-0.2, 19, -0.2, 0.2, 19.4, 0.2, M.BEACON_RED);
  },
});

export default [hangar, hangarGable, hangarCantilever, hangarT, tower, shelter, radar, fence, sam, beacon];

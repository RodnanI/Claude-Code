import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, foundation, roofClutter } from './_util.js';

/* Airfield structures: arched hangars, control towers, terminals, hardened shelters, radar, fences, SAM sites. */

const hangar = defineKit({
  id: 'hangar',
  build(d, b, rng) {
    const w = d.w, dp = d.d;
    const r = w / 2;
    const skin = d.style?.skin ?? pick(rng, [M.ROOF_TIN, M.CLADDING_GRAY, M.CLADDING_SAND]);
    const inner = d.style?.inner ?? M.CONCRETE_PANEL;
    b.box(-r - 0.6, -2, -dp / 2 - 0.6, r + 0.6, 0.15, dp / 2 + 0.6, M.CONCRETE_DARK);
    // arched shell, hollowed so aircraft can be parked inside
    b.fn(-r, 0, -dp / 2, r, r, dp / 2, (x, y, z) => (x * x + y * y <= r * r ? skin : 0));
    b.fn(-r + 0.7, 0, -dp / 2 + 0.7, r - 0.7, r, dp / 2 - 0.7, (x, y, z) => (x * x + y * y <= (r - 0.7) * (r - 0.7) ? -1 : 0));
    b.box(-r + 0.7, 0, -dp / 2 + 0.7, r - 0.7, 0.2, dp / 2 - 0.7, inner);
    // door openings at both ends
    const dw = w * 0.86, dh = r * 0.78;
    b.carve(-dw / 2, 0.2, dp / 2 - 1.2, dw / 2, dh, dp / 2 + 0.4);
    b.carve(-dw / 2, 0.2, -dp / 2 - 0.4, dw / 2, dh, -dp / 2 + 1.2);
    b.box(-dw / 2 - 0.5, 0, dp / 2 - 0.2, -dw / 2, dh + 0.5, dp / 2 + 0.3, M.STEEL_DARK, { md: 1 });
    b.box(dw / 2, 0, dp / 2 - 0.2, dw / 2 + 0.5, dh + 0.5, dp / 2 + 0.3, M.STEEL_DARK, { md: 1 });
    b.box(-dw / 2 - 0.5, dh, dp / 2 - 0.2, dw / 2 + 0.5, dh + 0.6, dp / 2 + 0.3, M.STEEL_DARK, { md: 1 });
    // ribs
    for (let z = -dp / 2 + 3; z < dp / 2; z += 6) b.fn(-r - 0.3, 0, z - 0.25, r + 0.3, r + 0.3, z + 0.25, (x, y) => { const q = x * x + y * y; return q <= (r + 0.3) * (r + 0.3) && q >= (r - 0.2) * (r - 0.2) ? M.STEEL : 0; }, { md: 1 });
    // roof vents
    for (let z = -dp / 2 + 8; z < dp / 2 - 4; z += 14) b.box(-0.9, r - 0.3, z - 0.9, 0.9, r + 0.7, z + 0.9, M.STEEL_DARK, { md: 1 });
    // lit interior strip (emissive at night)
    b.box(-0.4, r - 1.2, -dp / 2 + 2, 0.4, r - 0.9, dp / 2 - 2, M.LAMP_WHITE, { md: 1 });
  },
});

const tower = defineKit({
  id: 'tower',
  build(d, b, rng) {
    const H = d.h ?? 26;
    const mil = !!d.style?.mil;
    const shaft = mil ? M.MIL_GRAY : M.CONCRETE_PANEL;
    b.box(-8, -2, -8, 8, 0.1, 8, M.CONCRETE_DARK);
    b.box(-7, 0, -6, 7, 4.4, 6, mil ? M.MIL_TAN : M.CONCRETE_BLDG);
    b.facade(-7, 0, -6, 7, 4.4, 6, { floorH: 4.4, bay: 3.5, winW: 2, winH: 1.5, sill: 1.6, glass: [M.GLASS_SLATE], lit: 0.2, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.4, corner: 1 });
    b.box(-2.3, 0, -2.3, 2.3, H, 2.3, shaft);
    for (let y = 4; y < H; y += 5) b.box(-2.5, y, -2.5, 2.5, y + 0.3, 2.5, M.CONCRETE_DARK, { md: 1 });
    // cab
    b.box(-5.4, H, -5.4, 5.4, H + 1.2, 5.4, M.CONCRETE_DARK);
    b.box(-5.0, H + 1.2, -5.0, 5.0, H + 5.0, 5.0, M.GLASS_DARK);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(sx * 5 - 0.3, H + 1.2, sz * 5 - 0.3, sx * 5 + 0.3, H + 5, sz * 5 + 0.3, M.STEEL_DARK, { md: 1 });
    for (const x of [-2.5, 0, 2.5]) { b.box(x - 0.15, H + 1.2, -5.1, x + 0.15, H + 5, 5.1, M.STEEL_DARK, { md: 0.75 }); b.box(-5.1, H + 1.2, x - 0.15, 5.1, H + 5, x + 0.15, M.STEEL_DARK, { md: 0.75 }); }
    b.box(-6.2, H + 5, -6.2, 6.2, H + 5.6, 6.2, M.CONCRETE_DARK);
    b.box(-3.5, H + 5.6, -3.5, 3.5, H + 6.4, 3.5, M.CONCRETE_PANEL, { md: 1 });
    b.box(-0.9, H + 6.4, -0.3, 0.9, H + 8.2, 0.3, M.RADAR_WHITE, { md: 1 });
    b.cyl('y', 2.6, 2.6, 0.12, 0.08, H + 6.4, H + 12, M.STEEL, { md: 0.75 });
    b.box(2.3, H + 12, 2.3, 2.9, H + 12.6, 2.9, M.BEACON_RED);
    b.box(-5.0, H + 1.0, -5.0, 5.0, H + 1.2, 5.0, M.LAMP_WHITE, { md: 1 });
  },
});

const terminal = defineKit({
  id: 'terminal',
  build(d, b, rng) {
    const w = d.w ?? 160, dp = d.d ?? 34, h = d.h ?? 13;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, M.CONCRETE_PANEL);
    b.facade(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, { floorH: 6.5, bay: 4, winW: 3.4, winH: 4.4, sill: 0.9, glass: [M.GLASS_TEAL, M.GLASS_SLATE], lit: 0.32, seed: d.seed, style: 'curtain', mullion: 2, frame: M.STEEL_DARK, coarse: M.GLASS_BLEND_DARK, top: 1.2, corner: 2 });
    // sweeping roof canopy
    b.box(-w / 2 - 3, h, -dp / 2 - 4, w / 2 + 3, h + 0.9, dp / 2 + 7, M.CONCRETE_PANEL);
    b.box(-w / 2 - 3, h + 0.9, -dp / 2 - 4, w / 2 + 3, h + 1.5, -dp / 2 - 3.4, M.STEEL_BRIGHT, { md: 1 });
    b.box(-w / 2 - 3, h + 0.9, dp / 2 + 6.4, w / 2 + 3, h + 1.5, dp / 2 + 7, M.STEEL_BRIGHT, { md: 1 });
    // central atrium
    b.box(-24, h + 1, -dp / 2 + 3, 24, h + 9, dp / 2 - 3, M.GLASS_CLEAR);
    b.gable(-26, -dp / 2 + 2, 26, dp / 2 - 2, h + 9, 5, 'x', M.GLASS_TEAL);
    for (let x = -24; x <= 24; x += 6) b.box(x - 0.2, h + 1, -dp / 2 + 2.8, x + 0.2, h + 9.5, -dp / 2 + 3.2, M.STEEL_DARK, { md: 1 });
    // canopy columns
    for (let x = -w / 2 + 6; x < w / 2; x += 12) b.box(x - 0.4, 0, dp / 2 + 5.6, x + 0.4, h, dp / 2 + 6.2, M.STEEL_BRIGHT, { md: 1 });
    // concourse fingers with jet bridges
    const fw = 22, fl = 80;
    for (const fx of [-w * 0.32, w * 0.32]) {
      b.box(fx - fw / 2, 0, dp / 2, fx + fw / 2, 9, dp / 2 + fl, M.CONCRETE_PANEL);
      b.facade(fx - fw / 2, 0, dp / 2, fx + fw / 2, 9, dp / 2 + fl, { floorH: 9, bay: 5, winW: 4, winH: 5, sill: 1.6, glass: [M.GLASS_TEAL, M.GLASS_SLATE], lit: 0.3, seed: d.seed + 4, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.5, corner: 2 });
      b.gable(fx - fw / 2 - 1, dp / 2 - 1, fx + fw / 2 + 1, dp / 2 + fl + 1, 9, 2.2, 'z', M.ROOF_TIN);
      for (const s of [-1, 1]) for (let z = dp / 2 + 12; z < dp / 2 + fl - 6; z += 16) {
        const x0 = fx + s * fw / 2;
        b.box(x0, 4.0, z - 1.6, x0 + s * 16, 6.6, z + 1.6, M.STEEL_BRIGHT);
        b.cyl('y', x0 + s * 16, z, 2.6, 2.6, 3.4, 7.0, M.STEEL_DARK, { md: 1 });
        b.box(x0 + s * 15, 0, z - 0.3, x0 + s * 15.6, 4.0, z + 0.3, M.STEEL, { md: 1 });
      }
    }
    roofClutter(b, rng, -w / 2 + 4, -dp / 2 + 4, w / 2 - 4, dp / 2 - 4, h + 1.5, 8);
    b.box(-6, 0, dp / 2 + 3, 6, 0.2, dp / 2 + 5.6, M.CONCRETE, { md: 1 });
  },
});

const shelter = defineKit({
  id: 'shelter',
  build(d, b, rng) {
    const w = d.w ?? 17, dp = d.d ?? 26;
    const r = w / 2, hh = r * 0.95;
    b.box(-r - 2, -2, -dp / 2 - 1, r + 2, 0.15, dp / 2 + 1.5, M.CONCRETE_DARK);
    b.fn(-r, 0, -dp / 2, r, hh, dp / 2, (x, y) => ((x * x) / (r * r) + (y * y) / (hh * hh) <= 1 ? M.CONCRETE_PANEL : 0));
    b.fn(-r + 0.9, 0, -dp / 2 + 0.9, r - 0.9, hh, dp / 2 - 0.9, (x, y) => ((x * x) / ((r - 0.9) * (r - 0.9)) + (y * y) / ((hh - 0.9) * (hh - 0.9)) <= 1 ? -1 : 0));
    b.box(-r + 0.9, 0, -dp / 2 + 0.9, r - 0.9, 0.2, dp / 2 - 0.9, M.CONCRETE_DARK);
    b.carve(-r * 0.78, 0.2, dp / 2 - 1.4, r * 0.78, hh * 0.78, dp / 2 + 0.4);
    // earth cover
    b.blob(0, hh * 0.55, -dp * 0.05, r * 1.25, hh * 0.85, dp * 0.55, M.GRASS, d.seed + 3, 0.18, M.DIRT, 0.25);
    b.box(-r * 0.78 - 0.4, 0, dp / 2 - 0.5, -r * 0.78, hh * 0.8, dp / 2 + 0.4, M.CONCRETE, { md: 1 });
    b.box(r * 0.78, 0, dp / 2 - 0.5, r * 0.78 + 0.4, hh * 0.8, dp / 2 + 0.4, M.CONCRETE, { md: 1 });
    b.box(-r * 0.78 - 0.4, hh * 0.78, dp / 2 - 0.5, r * 0.78 + 0.4, hh * 0.78 + 0.5, dp / 2 + 0.4, M.CONCRETE, { md: 1 });
  },
});

const radar = defineKit({
  id: 'radar',
  build(d, b) {
    b.box(-6, -2, -6, 6, 0.1, 6, M.CONCRETE_DARK);
    b.box(-5, 0, -5, 5, 5, 5, M.MIL_GRAY);
    b.cyl('y', 0, 0, 3.4, 3.0, 5, 15, M.MIL_GRAY);
    b.ell(0, 19, 0, 8, 8, 8, M.RADAR_WHITE);
    b.cyl('y', 0, 0, 6.5, 6.5, 14.4, 15.2, M.STEEL_DARK, { md: 1 });
    for (let a = 0; a < 6; a++) { const x = Math.cos((a / 6) * 6.283) * 7.6, z = Math.sin((a / 6) * 6.283) * 7.6; b.box(x - 0.15, 12, z - 0.15, x + 0.15, 26, z + 0.15, M.STEEL, { md: 1 }); }
    b.box(-0.4, 27, -0.4, 0.4, 28.2, 0.4, M.BEACON_RED);
  },
});

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
  },
});

const sam = defineKit({
  id: 'sam',
  build(d, b) {
    // sandbag berm ring with launchers and a radar trailer
    const R = 9;
    for (let a = 0; a < 28; a++) {
      const t = (a / 28) * 6.283;
      if (Math.abs(t - 1.57) < 0.4) continue;
      const x = Math.cos(t) * R, z = Math.sin(t) * R;
      b.box(x - 1.2, 0, z - 1.2, x + 1.2, 1.5, z + 1.2, M.MIL_SAND_BAG);
    }
    b.box(-R, -1, -R, R, 0.1, R, M.DIRT_DARK);
    for (const x of [-4, 4]) {
      b.box(x - 1.3, 0.4, -3.5, x + 1.3, 1.6, 3.5, M.MIL_OLIVE);
      for (const zz of [-2.4, -0.8, 0.8, 2.4]) b.box(x - 0.4, 1.6, zz - 0.4, x + 0.4, 3.4, zz + 0.4, M.MIL_TAN, { md: 0.5 });
      b.box(x - 0.5, 0, -4.5, x + 0.5, 1.2, -3.5, M.TIRE, { md: 1 });
    }
    b.box(-1.4, 0.4, 5, 1.4, 3, 8, M.MIL_OLIVE);
    b.ell(0, 3.8, 6.5, 1.8, 1.0, 0.4, M.RADAR_WHITE, { md: 1 });
    b.box(-6, 0, -8.5, -4.5, 3, -6.5, M.MIL_CAMO_DARK, { md: 1 });
  },
});

const beacon = defineKit({
  id: 'beacon',
  build(d, b) {
    b.box(-0.5, -1, -0.5, 0.5, 14, 0.5, M.STEEL_DARK);
    b.cyl('y', 0, 0, 1.4, 1.4, 14, 15.2, M.STEEL);
    b.cyl('y', 0, 0, 1.0, 1.0, 15.2, 16.8, M.LAMP_WHITE);
    b.box(-0.9, 16.8, -0.9, 0.9, 17.2, 0.9, M.STEEL_DARK);
    b.box(0.9, 15.4, -0.3, 1.5, 16.6, 0.3, M.RWY_LIGHT_GREEN);
    b.box(-1.5, 15.4, -0.3, -0.9, 16.6, 0.3, M.RWY_LIGHT_WHITE);
  },
});

export default [hangar, tower, terminal, shelter, radar, fence, sam, beacon];

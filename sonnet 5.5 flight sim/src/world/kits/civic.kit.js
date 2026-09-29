import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, foundation } from './_util.js';

/* Civic and landmark structures: church, stadium, bridge, wind turbine, lighthouse. */

const church = defineKit({
  id: 'church',
  build(d, b, rng) {
    const w = d.w ?? 10, dp = d.d ?? 24;
    const wall = d.style?.wall ?? pick(rng, [M.PLASTER_WHITE, M.STONE_LIGHT, M.BRICK_RED]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    b.box(-w / 2, 0, -dp / 2, w / 2, 8, dp / 2 - 4, wall);
    b.facade(-w / 2, 0, -dp / 2, w / 2, 8, dp / 2 - 4, { floorH: 8, bay: 4.2, winW: 1.5, winH: 4.6, sill: 1.8, glass: [M.GLASS_BRONZE, M.GLASS_TEAL], lit: 0.3, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.3, corner: 1.4, sides: ['+x', '-x'] });
    b.gable(-w / 2 - 0.6, -dp / 2 - 0.6, w / 2 + 0.6, dp / 2 - 3.4, 8, 4.4, 'z', M.ROOF_SLATE);
    // tower and spire at the +z end
    const tw = 5.6;
    b.box(-tw / 2, 0, dp / 2 - 6, tw / 2, 20, dp / 2, wall);
    b.box(-1.0, 0, dp / 2, 1.0, 3.2, dp / 2 + 0.25, M.WOOD_DARK, { md: 0.75 });
    b.box(-1.6, 15, dp / 2 - 6.1, 1.6, 19, dp / 2 + 0.1, M.GLASS_DARK, { md: 1 });
    b.hip(-tw / 2 - 0.4, dp / 2 - 6.4, tw / 2 + 0.4, dp / 2 + 0.4, 20, 11, M.ROOF_SLATE);
    b.box(-0.12, 30.5, dp / 2 - 3.12, 0.12, 33.5, dp / 2 - 2.88, M.STEEL_BRIGHT, { md: 0.75 });
    b.box(-0.9, 32, dp / 2 - 3.12, 0.9, 32.3, dp / 2 - 2.88, M.STEEL_BRIGHT, { md: 0.75 });
  },
});

const stadium = defineKit({
  id: 'stadium',
  build(d, b, rng) {
    const R = d.r ?? Math.min(d.w, d.d) / 2, rf = R * 0.5, top = 22;
    const c1 = pick(rng, [M.SIDING_RED, M.SIDING_BLUE, M.SIDING_GREEN]);
    const c2 = M.PAINT_WHITE;
    b.fn(-R - 3, -1.5, -R - 3, R + 3, top + 2, R + 3, (x, y, z) => {
      const p = Math.sqrt(x * x + z * z);
      if (p > R + 2.5) return 0;
      if (y < 0) return p < R + 1 ? M.CONCRETE_DARK : 0;
      if (p >= R && p <= R + 2.5 && y <= top - 3) return y > 4 && y < top - 5 && ((Math.floor(Math.atan2(z, x) * R / 3.4) & 1) === 0) ? M.GLASS_SLATE : M.CONCRETE_PANEL;
      if (p < rf || p > R) return 0;
      const seat = 1.2 + (p - rf) * 0.62;
      const step = Math.floor(seat / 0.9) * 0.9;
      if (y > step) return 0;
      const a = Math.atan2(z, x);
      if (Math.floor(a * 18 / 3.14159) % 9 === 0) return M.CONCRETE;
      return y > step - 0.4 ? (Math.floor((p - rf) / 1.0) & 1 ? c1 : c2) : M.CONCRETE_DARK;
    });
    // roof canopy ring and floodlight masts
    b.fn(-R - 4, top - 2, -R - 4, R + 4, top + 1.2, R + 4, (x, y, z) => {
      const p = Math.sqrt(x * x + z * z);
      return p > rf + (R - rf) * 0.25 && p < R + 4 && y > top - 1.2 && y < top ? M.STEEL_BRIGHT : 0;
    });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * R * 0.8, z = sz * R * 0.8;
      b.box(x - 0.6, 0, z - 0.6, x + 0.6, top + 18, z + 0.6, M.STEEL_DARK);
      b.box(x - 2.6, top + 18, z - 1.2, x + 2.6, top + 21, z + 1.2, M.LAMP_WHITE);
    }
  },
});

const bridge = defineKit({
  id: 'bridge',
  build(d, b, rng) {
    const L = d.w, W = d.d;
    const y = d.style?.deckY ?? 16;
    const cable = !!d.style?.cable;
    b.box(-L / 2, y - 1.8, -W / 2, L / 2, y, W / 2, M.BRIDGE_DECK);
    b.box(-L / 2, y, -W / 2, L / 2, y + 0.08, W / 2, M.ASPHALT, { md: 2 });
    b.box(-L / 2, y - 3.4, -W / 2 + 1, L / 2, y - 1.8, -W / 2 + 2.4, M.STEEL_DARK, { md: 1 });
    b.box(-L / 2, y - 3.4, W / 2 - 2.4, L / 2, y - 1.8, W / 2 - 1, M.STEEL_DARK, { md: 1 });
    for (const s of [-1, 1]) {
      b.box(-L / 2, y, s * (W / 2 - 0.2) - 0.2, L / 2, y + 1.2, s * (W / 2 - 0.2) + 0.2, M.CONCRETE_PANEL, { md: 1 });
    }
    for (let x = -L / 2; x < L / 2; x += 6) b.box(x, y, -0.15, x + 3, y + 0.05, 0.15, M.ROAD_LINE_Y, { md: 0.5 });
    for (let x = -L / 2 + 30; x < L / 2 - 10; x += 60) {
      b.box(x - 1.4, -9, -W / 2 + 1.6, x + 1.4, y - 1.8, -W / 2 + 4.4, M.CONCRETE_PANEL);
      b.box(x - 1.4, -9, W / 2 - 4.4, x + 1.4, y - 1.8, W / 2 - 1.6, M.CONCRETE_PANEL);
      b.box(x - 1.6, y - 4.6, -W / 2 + 1.6, x + 1.6, y - 3.4, W / 2 - 1.6, M.CONCRETE_PANEL, { md: 1 });
    }
    if (cable) {
      const th = 62;
      for (const tx of [-L * 0.24, L * 0.24]) {
        for (const s of [-1, 1]) {
          b.box(tx - 1.6, -9, s * (W / 2 + 1.4) - 1.4, tx + 1.6, y + th, s * (W / 2 + 1.4) + 1.4, M.CONCRETE_PANEL);
        }
        b.box(tx - 1.6, y + th - 8, -W / 2 - 3, tx + 1.6, y + th - 5, W / 2 + 3, M.CONCRETE_PANEL, { md: 1 });
        b.box(tx - 1.6, y + 14, -W / 2 - 3, tx + 1.6, y + 17, W / 2 + 3, M.CONCRETE_PANEL, { md: 1 });
        b.box(tx - 0.5, y + th, -0.5, tx + 0.5, y + th + 1.4, 0.5, M.BEACON_RED, { md: 2 });
      }
      // main cables as parabolas between the towers and out to the shore anchorages
      const tx0 = -L * 0.24, tx1 = L * 0.24;
      for (const s of [-1, 1]) {
        const z = s * (W / 2 + 1.4);
        b.fn(-L / 2, y, z - 0.6, L / 2, y + th + 1, z + 0.6, (lx, ly, lz, cell) => {
          let cy;
          if (lx >= tx0 && lx <= tx1) { const t = (lx - tx0) / (tx1 - tx0); cy = y + 5 + (th - 4) * Math.pow(Math.abs(2 * t - 1), 2.2); }
          else if (lx < tx0) { const t = (lx - -L / 2) / (tx0 + L / 2); cy = y + 2 + (th - 2) * t * t; }
          else { const t = (L / 2 - lx) / (L / 2 - tx1); cy = y + 2 + (th - 2) * t * t; }
          return Math.abs(ly - cy) < Math.max(0.35, cell * 0.6) ? M.STEEL_BRIGHT : 0;
        }, { md: 2 });
        // hangers
        for (let x = tx0 + 8; x < tx1 - 4; x += 12) {
          const t = (x - tx0) / (tx1 - tx0);
          const cy = y + 5 + (th - 4) * Math.pow(Math.abs(2 * t - 1), 2.2);
          b.box(x - 0.1, y + 1.2, z - 0.1, x + 0.1, cy, z + 0.1, M.STEEL, { md: 0.5 });
        }
      }
    }
  },
});
const windturbine = defineKit({
  id: 'windturbine',
  build(d, b, rng) {
    const H = d.h ?? 72, R = d.r ?? 36;
    b.cyl('y', 0, 0, 3.0, 3.0, -2, 1.5, M.CONCRETE_DARK);
    b.cyl('y', 0, 0, 2.4, 1.3, 0, H, M.PAINT_WHITE);
    b.box(-1.8, H - 0.6, -1.7, 4.6, H + 2.8, 1.7, M.PAINT_WHITE);
    b.ell(4.8, H + 1.1, 0, 1.6, 1.6, 1.6, M.PAINT_WHITE);
    const ph = rng.range(0, 2.1);
    for (let k = 0; k < 3; k++) {
      const a = ph + (k * Math.PI * 2) / 3, ca = Math.cos(a), sa = Math.sin(a);
      b.fn(4.2, H + 1.1 - R, -R, 5.4, H + 1.1 + R, R, (lx, ly, lz) => {
        const dy = ly - (H + 1.1);
        const along = dy * ca + lz * sa, perp = -dy * sa + lz * ca;
        if (along < 1.4 || along > R) return 0;
        const wd = 1.5 * (1 - along / R) + 0.25;
        return Math.abs(perp) <= wd && Math.abs(lx - 4.8) <= 0.3 + wd * 0.08 ? M.BLADE_WHITE : 0;
      });
    }
    b.box(-0.3, H + 2.8, -0.3, 0.3, H + 3.6, 0.3, M.BEACON_RED);
  },
});

const lighthouse = defineKit({
  id: 'lighthouse',
  build(d, b) {
    const H = d.h ?? 32;
    b.cyl('y', 0, 0, 7, 7, -3, 1, M.CONCRETE_DARK);
    const bands = 7;
    for (let i = 0; i < bands; i++) b.cyl('y', 0, 0, 4.4 - (i * 1.8) / bands, 4.4 - ((i + 1) * 1.8) / bands, 1 + (i * H) / bands, 1 + ((i + 1) * H) / bands, i % 2 ? M.PAINT_WHITE : M.SHIP_RED);
    b.cyl('y', 0, 0, 3.7, 3.7, H + 1, H + 1.5, M.STEEL_DARK);
    b.cyl('y', 0, 0, 3.7, 3.7, H + 1.5, H + 2.4, M.STEEL_DARK, { md: 1 });
    b.cyl('y', 0, 0, 3.3, 3.3, H + 1.5, H + 2.6, M.CONCRETE_DARK, { md: 5 });
    b.cyl('y', 0, 0, 1.9, 1.9, H + 1.5, H + 5, M.LAMP_WHITE);
    for (let a = 0; a < 8; a++) { const x = Math.cos((a / 8) * 6.283) * 1.9, z = Math.sin((a / 8) * 6.283) * 1.9; b.box(x - 0.1, H + 1.5, z - 0.1, x + 0.1, H + 5, z + 0.1, M.STEEL_DARK, { md: 0.5 }); }
    b.cyl('y', 0, 0, 2.5, 0.2, H + 5, H + 7.6, M.ROOF_RED_METAL);
    b.box(-6, 0, 3, 6, 3.4, 9, M.PLASTER_WHITE);
    b.gable(-6.5, 2.5, 6.5, 9.5, 3.4, 1.8, 'x', M.ROOF_RED_METAL);
  },
});

export default [church, stadium, bridge, windturbine, lighthouse];

import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, parapet, roofClutter, foundation } from './_util.js';

/* Low buildings: shopfronts, houses, barracks. */

const SIDINGS = [M.SIDING_WHITE, M.SIDING_BLUE, M.SIDING_GREEN, M.SIDING_YELLOW, M.SIDING_RED, M.SIDING_GRAY, M.PLASTER_CREAM, M.BRICK_RED];
const ROOFS = [M.ROOF_SHINGLE_BROWN, M.ROOF_SHINGLE_GRAY, M.ROOF_TERRACOTTA, M.ROOF_SLATE, M.ROOF_SHINGLE_BROWN];

const house = defineKit({
  id: 'house',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d;
    const floors = st.floors ?? (rng.chance(0.55) ? 2 : 1);
    const fh = 3.1;
    const wh = floors * fh;
    const wall = st.wall ?? pick(rng, SIDINGS);
    const roof = st.roof ?? pick(rng, ROOFS);
    const hip = st.hip ?? rng.chance(0.35);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5, M.CONCRETE_DARK);
    b.box(-w / 2, 0, -dp / 2, w / 2, wh, dp / 2, wall);
    b.box(-w / 2 - 0.1, 0, -dp / 2 - 0.1, w / 2 + 0.1, 0.7, dp / 2 + 0.1, M.CONCRETE, { md: 1 });
    b.facade(-w / 2, 0, -dp / 2, w / 2, wh, dp / 2, {
      floorH: fh, bay: 3.2, winW: 1.3, winH: 1.5, sill: 0.85, glass: [M.GLASS_CLEAR, M.GLASS_SLATE], lit: 0.16, seed: d.seed, style: 'punched',
      coarse: M.GLASS_BLEND_LIGHT, top: 0.6, corner: 1.0,
    });
    // roof
    const ridge = w >= dp ? 'x' : 'z';
    const rh = Math.min(w, dp) * (hip ? 0.36 : 0.44);
    if (hip) b.hip(-w / 2 - 0.5, -dp / 2 - 0.5, w / 2 + 0.5, dp / 2 + 0.5, wh, rh, roof);
    else b.gable(-w / 2 - 0.5, -dp / 2 - 0.5, w / 2 + 0.5, dp / 2 + 0.5, wh, rh, ridge, roof);
    if (!hip) {
      // trim board under the gable eaves
      if (ridge === 'x') { b.box(-w / 2 - 0.5, wh - 0.3, dp / 2 + 0.3, w / 2 + 0.5, wh, dp / 2 + 0.55, M.PLASTER_WHITE, { md: 0.6 }); }
      else { b.box(w / 2 + 0.3, wh - 0.3, -dp / 2 - 0.5, w / 2 + 0.55, wh, dp / 2 + 0.5, M.PLASTER_WHITE, { md: 0.6 }); }
    }
    // chimney
    b.box(w * 0.22 - 0.5, wh - 1, -0.5, w * 0.22 + 0.5, wh + rh + 1.3, 0.5, M.CHIMNEY_BRICK, { md: 1.5 });
    b.box(w * 0.22 - 0.65, wh + rh + 1.3, -0.65, w * 0.22 + 0.65, wh + rh + 1.55, 0.65, M.STONE_DARK, { md: 0.6 });
    // door, steps and porch
    b.box(-0.55, 0, dp / 2, 0.55, 2.15, dp / 2 + 0.12, pick(rng, [M.WOOD_DARK, M.PAINT_BARN_RED, M.PAINT_GREEN]), { md: 0.6 });
    b.box(-1.9, 0, dp / 2, 1.9, 0.4, dp / 2 + 1.8, M.CONCRETE, { md: 1 });
    if (rng.chance(0.6)) {
      for (const sx of [-1.7, 1.7]) b.box(sx - 0.12, 0.4, dp / 2 + 1.55, sx + 0.12, 2.6, dp / 2 + 1.79, M.PLASTER_WHITE, { md: 0.5 });
      b.wedge(-2.1, 2.6, dp / 2 - 0.2, 2.1, 3.1, dp / 2 + 1.9, '-z', roof, { md: 1 });
    }
    // attached garage
    if (st.garage ?? rng.chance(0.35)) {
      const gw = 3.6, gd = Math.min(dp, 6.4);
      b.box(-w / 2 - gw, 0, -gd / 2 + (dp - gd) / 2, -w / 2, 2.8, gd / 2 + (dp - gd) / 2, wall);
      b.wedge(-w / 2 - gw - 0.3, 2.8, -gd / 2 + (dp - gd) / 2 - 0.3, -w / 2 + 0.2, 3.5, gd / 2 + (dp - gd) / 2 + 0.3, '-z', roof);
      b.box(-w / 2 - gw + 0.3, 0, gd / 2 + (dp - gd) / 2, -w / 2 - 0.3, 2.3, gd / 2 + (dp - gd) / 2 + 0.1, M.SIDING_GRAY, { md: 0.6 });
    }
  },
});

const lowrise = defineKit({
  id: 'lowrise',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const wall = st.wall ?? pick(rng, [M.BRICK_RED, M.BRICK_BROWN, M.PLASTER_CREAM, M.PLASTER_TERRA, M.CONCRETE_PANEL, M.SIDING_YELLOW]);
    const awn = pick(rng, [M.PAINT_BARN_RED, M.PAINT_GREEN, M.PAINT_YELLOW, M.TARP_BLUE, M.PAINT_ORANGE, M.PAINT_WHITE]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    const bay = st.bay ?? rng.range(3.4, 4.6);
    b.facade(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, {
      floorH: 3.4, bay, winW: bay * 0.5, winH: 1.7, sill: 0.95, glass: [M.GLASS_CLEAR, M.GLASS_SLATE], lit: 0.24, seed: d.seed, style: 'punched',
      ground: 3.6, groundGlass: M.GLASS_CLEAR, coarse: M.GLASS_BLEND_LIGHT, top: 0.8, corner: 1.0, sides: ['+z', '-z', '+x', '-x'],
    });
    // sign band, awning and cornice on the street side
    b.box(-w / 2 - 0.1, 3.6, dp / 2, w / 2 + 0.1, 4.6, dp / 2 + 0.3, M.CONCRETE_PANEL, { md: 1 });
    const signMat = rng.chance(0.4) ? M.NEON_ORANGE : rng.chance(0.5) ? M.SIGN_RED : M.SIGN_GREEN;
    b.box(-w * 0.35, 3.75, dp / 2 + 0.28, w * 0.35, 4.45, dp / 2 + 0.36, signMat, { md: 0.75 });
    b.wedge(-w / 2 + 0.4, 3.0, dp / 2, w / 2 - 0.4, 3.7, dp / 2 + 1.9, '-z', awn, { md: 1 });
    b.box(-w / 2 - 0.3, h - 0.9, -dp / 2 - 0.3, w / 2 + 0.3, h, dp / 2 + 0.3, M.CONCRETE_PANEL, { md: 1.5 });
    parapet(b, -w / 2, -dp / 2, w / 2, dp / 2, h, 0.8, 0.4, wall, { md: 1 });
    roofClutter(b, rng, -w / 2 + 0.8, -dp / 2 + 0.8, w / 2 - 0.8, dp / 2 - 0.8, h, Math.max(1, Math.round((w * dp) / 200)));
    // door
    b.box(-0.9, 0, dp / 2, 0.9, 2.4, dp / 2 + 0.15, M.GLASS_DARK, { md: 0.6 });
  },
});

const barracks = defineKit({
  id: 'barracks',
  build(d, b, rng) {
    const w = d.w, dp = d.d, h = d.h || 7;
    const st = d.style || {};
    const wall = st.wall ?? pick(rng, [M.MIL_TAN, M.PLASTER_GRAY, M.CONCRETE_PANEL]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    b.facade(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, { floorH: 3.4, bay: 3.2, winW: 1.3, winH: 1.5, sill: 0.9, glass: [M.GLASS_SLATE, M.GLASS_DARK], lit: 0.2, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_DARK, top: 0.6, corner: 1.2 });
    b.gable(-w / 2 - 0.5, -dp / 2 - 0.5, w / 2 + 0.5, dp / 2 + 0.5, h, dp * 0.16, 'x', st.roof ?? M.ROOF_GREEN);
    b.box(-1.2, 0, dp / 2, 1.2, 2.3, dp / 2 + 0.15, M.MIL_OLIVE, { md: 0.6 });
    b.box(-2.2, 0, dp / 2, 2.2, 0.3, dp / 2 + 2.0, M.CONCRETE, { md: 1 });
    for (let i = 0; i < 3; i++) b.box(-w * 0.3 + i * w * 0.3 - 0.4, h + dp * 0.16 - 0.2, -0.4, -w * 0.3 + i * w * 0.3 + 0.4, h + dp * 0.16 + 1.0, 0.4, M.CHIMNEY_BRICK, { md: 1 });
  },
});

export default [house, lowrise, barracks];

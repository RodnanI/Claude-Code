import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, foundation } from './_util.js';
import { Facade } from './_tower.js';
import { storefront, flatRoof, legacyFac } from './towers.kit.js';

/* Low buildings: houses in eight shapes, rows of shopfronts, barracks. Walls carry facade materials, so windows and
   siding lines come from the shader on a 3.6 m grid (the structure y is snapped to it by the layout). */

const pickW = (rng, table) => rng.weighted(table);

const HOUSE_FAC = [['FAC_SIDING_WHITE', 5], ['FAC_BRICK_RED', 1.4], ['FAC_BRICK_BROWN', 1.2], ['FAC_PLASTER_CREAM', 1.6], ['FAC_PLASTER_WHITE', 1.2], ['FAC_PLASTER_TERRA', 0.8]];
const ROOFS = [M.ROOF_SHINGLE_BROWN, M.ROOF_SHINGLE_GRAY, M.ROOF_TERRACOTTA, M.ROOF_SLATE, M.ROOF_SHINGLE_BROWN, M.ROOF_SHINGLE_GRAY, M.ROOF_GREEN, M.ROOF_RED_METAL];
const DOORS = [M.WOOD_DARK, M.PAINT_BARN_RED, M.PAINT_GREEN, M.PAINT_BLUEGRAY, M.PAINT_YELLOW];
const TRIMS = [M.PLASTER_WHITE, M.STONE_LIGHT, M.CONCRETE];
const ROW_FAC = [['FAC_BRICK_RED', 3], ['FAC_BRICK_BROWN', 2.4], ['FAC_PLASTER_CREAM', 2.2], ['FAC_PLASTER_TERRA', 1.4], ['FAC_PLASTER_WHITE', 1.6], ['FAC_APT_RIBBON', 0.8]];

function door(b, rng, cx, z, h = 2.3, w = 1.1) {
  b.box(cx - w / 2, 0, z, cx + w / 2, h, z + 0.14, pick(rng, DOORS), { md: 0.6 });
}

function chimney(b, x, z, y0, y1) {
  b.box(x - 0.5, y0, z - 0.5, x + 0.5, y1, z + 0.5, M.CHIMNEY_BRICK, { md: 1.5 });
  b.box(x - 0.65, y1, z - 0.65, x + 0.65, y1 + 0.25, z + 0.65, M.STONE_DARK, { md: 0.6 });
}

const house = defineKit({
  id: 'house',
  build(d, b, rng) {
    const st = d.style || {};
    const type = st.type ?? pickW(rng, [['gable', 4], ['hip', 2], ['cross', 2.4], ['ranch', 2.2], ['modern', 1.2], ['colonial', 1.6], ['cottage', 1.4], ['townhouse', 1]]);
    const T = new Facade(d, b, st.fac ?? legacyFac(st.wall) ?? pickW(rng, HOUSE_FAC));
    const roof = st.roof ?? pick(rng, ROOFS);
    const trim = pick(rng, TRIMS);
    const fh = T.fh;
    const w = Math.max(d.w, 7.2), dp = Math.max(d.d, 7.2);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3.5, M.CONCRETE_DARK);
    const floors = st.floors ?? (type === 'ranch' || type === 'cottage' ? 1 : type === 'townhouse' ? 3 : (rng.chance(0.55) ? 2 : 1));
    const wall = (x0, z0, x1, z1, fl) => {
      const r = T.wall(x0, z0, x1, z1, 0, T.Y(fl));
      b.box(r[0] - 0.12, 0, r[1] - 0.12, r[2] + 0.12, 0.6, r[3] + 0.12, M.CONCRETE, { md: 1 });
      return r;
    };
    const chim = st.chimney ?? rng.chance(0.55);
    switch (type) {
      case 'hip': {
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2, dp / 2, floors);
        const top = T.Y(floors), rh = Math.min(x1 - x0, z1 - z0) * 0.34;
        b.hip(x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, top, rh, roof);
        if (chim) chimney(b, x0 + (x1 - x0) * 0.68, (z0 + z1) / 2, top - 1, top + rh + 0.7);
        door(b, rng, (x0 + x1) / 2, z1);
        break;
      }
      case 'cross': {
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2, dp / 2, floors);
        const top = T.Y(floors), rh = Math.min(x1 - x0, z1 - z0) * 0.4;
        const ridge = x1 - x0 >= z1 - z0 ? 'x' : 'z';
        b.gable(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, top, rh, ridge, roof);
        // front-facing gable wing
        const wx0 = T.X((x0 + x1) / 2 - T.bay * 1.5), wx1 = wx0 + T.bay * 3, wz1 = z1 + T.bay * 0.5;
        const [ax0, az0, ax1, az1] = T.wall(wx0, (z0 + z1) / 2, wx1, wz1, 0, T.Y(floors));
        b.gable(ax0 - 0.4, az0, ax1 + 0.4, az1 + 0.5, top, (ax1 - ax0) * 0.5, 'z', roof);
        if (chim) chimney(b, x0 + 2, z0 + 2.5, top - 1, top + rh + 0.7);
        door(b, rng, (ax0 + ax1) / 2 - 2.2, az1);
        break;
      }
      case 'ranch': {
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2 - T.bay * 2, dp / 2, 1);
        const top = T.Y(1), rh = Math.min(x1 - x0, z1 - z0) * 0.3;
        b.gable(x0 - 0.7, z0 - 0.7, x1 + 0.7, z1 + 0.7, top, rh, 'x', roof);
        // garage wing with a door
        const [gx0, gz0, gx1, gz1] = T.wall(x1, z0 + T.bay, x1 + T.bay * 2, z1, 0, T.Y(1) - 0.4);
        b.gable(gx0 - 0.3, gz0 - 0.5, gx1 + 0.5, gz1 + 0.5, T.Y(1) - 0.4, (gz1 - gz0) * 0.28, 'x', roof);
        b.box(gx0 + 0.6, 0, gz1, gx1 - 0.6, 2.4, gz1 + 0.12, M.SIDING_GRAY, { md: 0.6 });
        if (chim) chimney(b, x0 + (x1 - x0) * 0.3, (z0 + z1) / 2, top - 0.5, top + rh + 0.6);
        door(b, rng, x0 + (x1 - x0) * 0.4, z1);
        break;
      }
      case 'modern': {
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2, dp / 2, 1);
        b.box(x0 - 0.3, T.Y(1), z0 - 0.3, x1 + 0.3, T.Y(1) + 0.45, z1 + 0.3, M.CONCRETE_PANEL);
        // offset upper box, flat roofs, a wood-clad band and a glass corner
        const [ux0, uz0, ux1, uz1] = T.wall(x0 + T.bay, z0, x1 + T.bay * 0.5, z1 - T.bay, T.Y(1) + 0.45, T.Y(2) + 0.45);
        b.box(ux0 - 0.3, T.Y(2) + 0.45, uz0 - 0.3, ux1 + 0.3, T.Y(2) + 0.95, uz1 + 0.3, M.STEEL_DARK);
        b.box(x0, 0.6, z1, x0 + T.bay, T.Y(1) - 0.2, z1 + 0.15, M.GLASS_CLEAR, { md: 0.6 });
        b.box(x0 + T.bay, 0.6, z1 - 0.1, x1 - T.bay, 1.1, z1 + 0.3, M.WOOD_MID, { md: 0.6 });
        if (rng.chance(0.5)) for (let i = 0; i < 3; i++) b.box(ux0 + 1 + i * 2.6, T.Y(2) + 0.95, uz0 + 1.5, ux0 + 3.2 + i * 2.6, T.Y(2) + 1.15, uz1 - 1.5, M.SOLAR_PANEL, { md: 0.75 });
        door(b, rng, x0 + T.bay * 2.5, z1);
        break;
      }
      case 'colonial': {
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2, dp / 2, 2);
        const top = T.Y(2), rh = Math.min(x1 - x0, z1 - z0) * 0.3;
        b.hip(x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, top, rh, roof);
        const cx = (x0 + x1) / 2;
        b.box(cx - 3.4, 0, z1, cx + 3.4, 0.5, z1 + 2.4, M.CONCRETE, { md: 1 });
        for (const px of [cx - 3, cx + 3]) b.box(px - 0.2, 0.5, z1 + 2, px + 0.2, T.Y(1) + 1.2, z1 + 2.4, M.PLASTER_WHITE, { md: 0.5 });
        b.wedge(cx - 3.6, T.Y(1) + 1.2, z1 - 0.1, cx + 3.6, T.Y(1) + 2.1, z1 + 2.6, '-z', roof, { md: 1 });
        if (chim) { chimney(b, x0 + 2, (z0 + z1) / 2, top - 1, top + rh + 1); chimney(b, x1 - 2, (z0 + z1) / 2, top - 1, top + rh + 1); }
        door(b, rng, cx, z1);
        break;
      }
      case 'cottage': {
        const [x0, z0, x1, z1] = wall(-w * 0.42, -dp * 0.42, w * 0.42, dp * 0.42, 1);
        const top = T.Y(1), rh = Math.min(x1 - x0, z1 - z0) * 0.55;
        b.gable(x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, top, rh, x1 - x0 >= z1 - z0 ? 'x' : 'z', roof);
        if (chim) chimney(b, x0 + 1.4, (z0 + z1) / 2, top - 1, top + rh + 0.8);
        door(b, rng, (x0 + x1) / 2 + 1, z1, 2.1, 1.0);
        b.box(x1 + 0.2, 0, z0 + 1, x1 + 1.6, 0.9, z0 + 3, M.WOOD_LIGHT, { md: 0.75 });
        break;
      }
      case 'townhouse': {
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2, dp / 2, floors);
        const top = T.Y(floors);
        if (rng.chance(0.5)) b.gable(x0 - 0.3, z0 - 0.4, x1 + 0.3, z1 + 0.4, top, (x1 - x0) * 0.32, 'z', roof);
        else { flatRoof(b, rng, x0, z0, x1, z1, top, trim, 1); b.box(x0 - 0.4, top - 0.8, z0 - 0.4, x1 + 0.4, top, z1 + 0.4, trim, { md: 1.5 }); }
        door(b, rng, (x0 + x1) / 2, z1);
        b.box(x0 + 0.5, 0, z1, x1 - 0.5, 0.5, z1 + 1.4, M.CONCRETE, { md: 0.75 });
        break;
      }
      default: { // gable
        const [x0, z0, x1, z1] = wall(-w / 2, -dp / 2, w / 2, dp / 2, floors);
        const top = T.Y(floors), rh = Math.min(x1 - x0, z1 - z0) * 0.42;
        const ridge = x1 - x0 >= z1 - z0 ? 'x' : 'z';
        b.gable(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, top, rh, ridge, roof);
        if (ridge === 'x') b.box(x0 - 0.5, top - 0.3, z1 + 0.3, x1 + 0.5, top, z1 + 0.55, M.PLASTER_WHITE, { md: 0.6 });
        if (chim) chimney(b, x0 + (x1 - x0) * 0.22, (z0 + z1) / 2, top - 1, top + rh + 1.2);
        const cx = (x0 + x1) / 2;
        door(b, rng, cx, z1);
        b.box(cx - 1.9, 0, z1, cx + 1.9, 0.4, z1 + 1.8, M.CONCRETE, { md: 1 });
        if (rng.chance(0.6)) {
          for (const sx of [-1.7, 1.7]) b.box(cx + sx - 0.12, 0.4, z1 + 1.55, cx + sx + 0.12, 2.6, z1 + 1.79, M.PLASTER_WHITE, { md: 0.5 });
          b.wedge(cx - 2.1, 2.6, z1 - 0.2, cx + 2.1, 3.1, z1 + 1.9, '-z', roof, { md: 1 });
        }
        if (st.garage ?? rng.chance(0.35)) {
          const [gx0, gz0, gx1, gz1] = T.wall(x0 - T.bay, z0 + T.bay, x0, z1, 0, T.Y(1) - 0.5);
          b.gable(gx0 - 0.3, gz0 - 0.4, gx1 + 0.2, gz1 + 0.4, T.Y(1) - 0.5, (gz1 - gz0) * 0.26, 'x', roof, { md: 3 });
          b.box(gx0 + 0.3, 0, gz1, gx1 - 0.3, 2.4, gz1 + 0.1, M.SIDING_GRAY, { md: 0.6 });
        }
      }
    }
    // rooftop solar on some south-facing sheds happens through the modern type only; a back deck sometimes
    if (type !== 'modern' && rng.chance(0.25)) b.box(-w * 0.3, 0.3, -dp / 2 - 3, w * 0.3, 0.5, -dp / 2, M.WOOD_LIGHT, { md: 0.75 });
  },
});

/** A row of shopfronts: units of two to four 3.6 m bays, each with its own height, color, roof and awning. */
const lowrise = defineKit({
  id: 'lowrise',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h || 10;
    const bayw = 3.6;
    const T0 = new Facade(d, b, 'FAC_BRICK_RED');
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    const facs = st.fac ? [st.fac] : null;
    let x = T0.X(-w / 2);
    const xEnd = T0.X(w / 2);
    const baseFloors = Math.max(1, Math.round(h / T0.fh));
    while (x < xEnd - bayw * 1.5) {
      let nb = rng.int(2, 4);
      if (xEnd - (x + nb * bayw) < bayw * 2) nb = Math.max(2, Math.round((xEnd - x) / bayw));
      const x1 = Math.min(xEnd, x + nb * bayw);
      const T = new Facade(d, b, facs ? facs[0] : legacyFac(st.wall) ?? pickW(rng, ROW_FAC));
      const fl = Math.max(1, Math.min(6, baseFloors + rng.int(-1, 1)));
      const [ux0, uz0, ux1, uz1] = T.wall(x, -dp / 2, x1, dp / 2, 0, T.Y(fl));
      const top = T.Y(fl);
      storefront(b, rng, T, ux0, uz0, ux1, uz1, { awning: true });
      const trim = pick(rng, [M.STONE_LIGHT, M.PLASTER_WHITE, M.CONCRETE_PANEL]);
      b.box(ux0 - 0.35, top - 1.0, uz0 - 0.35, ux1 + 0.35, top, uz1 + 0.35, trim, { md: 1.5 });
      const roofKind = pickW(rng, [['flat', 5], ['gable', 2], ['mansard', 1.4], ['sawtooth', 0.4]]);
      if (roofKind === 'gable') b.gable(ux0 - 0.4, uz0 - 0.4, ux1 + 0.4, uz1 + 0.4, top, (ux1 - ux0) * 0.42, 'z', pick(rng, [M.ROOF_TERRACOTTA, M.ROOF_SLATE, M.ROOF_SHINGLE_BROWN]));
      else if (roofKind === 'mansard') b.hip(ux0 - 0.3, uz0 - 0.3, ux1 + 0.3, uz1 + 0.3, top, Math.min(ux1 - ux0, uz1 - uz0) * 0.22, pick(rng, [M.ROOF_SLATE, M.ROOF_COPPER]));
      else flatRoof(b, rng, ux0, uz0, ux1, uz1, top, trim, 1);
      x = x1;
    }
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

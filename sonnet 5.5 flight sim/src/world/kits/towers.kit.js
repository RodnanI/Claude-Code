import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Facade, roofCap, rooftop, foundation, pick } from './_tower.js';

/* Mid-rise blocks: offices, apartments, hotels, lofts and garages. Descriptor: { w, d, h, rot, seed, style: { fac, accent,
   shape, roof, balconies, awning } }. Local origin is the footprint center at ground level, rot 0 faces +z.
   Walls carry facade materials (windows come from the shader), so the kits place volumes, floors and ornament. */

const pickW = (rng, table) => rng.weighted(table);

const MID_FAC = [['FAC_BRICK_RED', 3], ['FAC_BRICK_BROWN', 2.4], ['FAC_PLASTER_CREAM', 2], ['FAC_PLASTER_WHITE', 1.4], ['FAC_PLASTER_TERRA', 1], ['FAC_APT_RIBBON', 2.6],
  ['FAC_GRID_WHITE', 1], ['FAC_GRID_CONCRETE', 1.2], ['FAC_RIBBON_STONE', 1.2], ['FAC_PUNCH_SAND', 1.2], ['FAC_CURTAIN_BLUE', 0.6], ['FAC_RIBBON_WHITE', 0.8]];

/** Old style keys still used by a few region files: map a plain wall material to the nearest facade. */
const LEGACY = { BRICK_RED: 'FAC_BRICK_RED', BRICK_BROWN: 'FAC_BRICK_BROWN', BRICK_DARK: 'FAC_BRICK_DARK', PLASTER_CREAM: 'FAC_PLASTER_CREAM', PLASTER_WHITE: 'FAC_PLASTER_WHITE',
  PLASTER_TERRA: 'FAC_PLASTER_TERRA', CONCRETE_PANEL: 'FAC_GRID_CONCRETE', CONCRETE_BLDG: 'FAC_GRID_CONCRETE', STONE_LIGHT: 'FAC_RIBBON_STONE', SIDING_WHITE: 'FAC_SIDING_WHITE' };
export function legacyFac(wall) {
  if (wall === undefined) return undefined;
  for (const [k, v] of Object.entries(LEGACY)) if (M[k] === wall) return v;
  return undefined;
}

export const AWNINGS = [M.PAINT_BARN_RED, M.PAINT_GREEN, M.PAINT_YELLOW, M.TARP_BLUE, M.PAINT_ORANGE, M.PAINT_WHITE, M.SIGN_GREEN, M.SIGN_RED];
export const SIGNS = [M.NEON_ORANGE, M.NEON_RED, M.NEON_CYAN, M.NEON_WHITE, M.NEON_MAGENTA];

/** Storefront zone: dark glass band, awnings on the +z side and sign boards. Fine detail only. */
export function storefront(b, rng, T, x0, z0, x1, z1, o = {}) {
  const top = T.Y(1);
  b.box(x0 - 0.2, 0, z0 - 0.2, x1 + 0.2, top, z1 + 0.2, o.mat ?? M.GLASS_DARK);
  b.box(x0 - 0.25, top - 0.7, z0 - 0.25, x1 + 0.25, top + 0.1, z1 + 0.25, o.band ?? M.CONCRETE_PANEL, { md: 2 });
  if (o.awning !== false && x1 - x0 > 6) {
    const n = Math.max(1, Math.floor((x1 - x0) / rng.range(6, 9)));
    const seg = (x1 - x0 - 1) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + 0.5 + i * seg;
      b.wedge(a + 0.2, top - 2.0, z1, a + seg - 0.2, top - 1.2, z1 + 1.9, '-z', pick(rng, AWNINGS), { md: 1.2 });
      if (rng.chance(0.45)) b.box(a + seg * 0.2, top - 0.6, z1 + 0.1, a + seg * 0.8, top - 0.05, z1 + 0.22, pick(rng, SIGNS), { md: 1 });
    }
  }
}

/** Flat roof: cap, equipment, an occasional water tank on stilts, a planted patch. */
export function flatRoof(b, rng, x0, z0, x1, z1, y, accent, n) {
  roofCap(b, x0, z0, x1, z1, y, accent, { ph: 0.9 });
  rooftop(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, y + 0.5, n);
  if (rng.chance(0.4) && x1 - x0 > 10 && z1 - z0 > 10) {
    const tx = rng.range(x0 + 4, x1 - 4), tz = rng.range(z0 + 4, z1 - 4);
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(tx + ax * 1.3 - 0.15, y + 0.5, tz + az * 1.3 - 0.15, tx + ax * 1.3 + 0.15, y + 2.7, tz + az * 1.3 + 0.15, M.WOOD_DARK, { md: 0.5 });
    b.cyl('y', tx, tz, 1.9, 1.9, y + 2.7, y + 5.7, M.WOOD_MID, { md: 3 });
    b.cyl('y', tx, tz, 2.0, 0.3, y + 5.7, y + 6.7, M.ROOF_SLATE, { md: 3 });
  } else if (rng.chance(0.3) && x1 - x0 > 8 && z1 - z0 > 8) {
    b.box(x0 + 2, y + 0.5, z0 + 2, x1 - 2, y + 0.9, z1 - 2, M.GREEN_ROOF, { md: 6 });
  }
}

/** Balconies on the +z face, every second bay from the second floor up. */
function balconies(b, T, x0, z1, x1, floors, mat) {
  for (let f = 2; f < floors; f++) {
    const y = T.Y(f) + 0.02;
    for (let bx = x0 + T.bay * 1.5; bx < x1 - T.bay; bx += T.bay * 2) {
      b.box(bx - 1.2, y - 0.3, z1, bx + 1.2, y, z1 + 1.3, mat, { md: 0.6 });
      b.box(bx - 1.2, y, z1 + 1.18, bx + 1.2, y + 1.0, z1 + 1.3, M.GLASS_CLEAR, { md: 0.6 });
    }
  }
}

/** Wings of a shape as rectangles [x0, z0, x1, z1, floors] in local coordinates. */
function wingsFor(shape, w, dp, total, T) {
  const hw = w / 2, hd = dp / 2, e = T.bay * 3;
  switch (shape) {
    case 'L': {
      const dz = Math.max(e, dp * 0.5);
      return [[-hw, -hd, hw, -hd + dz, total], [-hw, -hd, -hw + Math.max(e, w * 0.45), hd, total]];
    }
    case 'U': {
      const wd = Math.max(e, w * 0.32), dz = Math.max(e, dp * 0.36);
      return [[-hw, -hd, hw, -hd + dz, total], [-hw, -hd, -hw + wd, hd, total], [hw - wd, -hd, hw, hd, total]];
    }
    case 'ring': {
      const t = Math.max(e, Math.min(w, dp) * 0.28);
      return [[-hw, -hd, hw, -hd + t, total], [-hw, hd - t, hw, hd, total], [-hw, -hd + t, -hw + t, hd - t, total], [hw - t, -hd + t, hw, hd - t, total]];
    }
    case 'terrace': {
      const out = [];
      const step = Math.max(2, Math.floor(total / 4));
      for (let i = 0, k = 0; k < total; i++, k += step) {
        const ins = T.bay * 2 * i;
        if (w - 2 * ins < e || dp - 2 * ins < e) break;
        out.push([-hw + ins, -hd + ins * 0.6, hw - ins, hd - ins * 0.6, Math.min(total, k + step)]);
      }
      return out;
    }
    default:
      return [[-hw, -hd, hw, hd, total]];
  }
}

const midrise = defineKit({
  id: 'midrise',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? legacyFac(st.wall) ?? pickW(rng, MID_FAC));
    const accent = st.accent ?? st.trim ?? pick(rng, [M.STONE_LIGHT, M.CONCRETE_PANEL, M.PLASTER_WHITE, M.LIMESTONE, M.STEEL_DARK]);
    const total = T.floors(h);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    const shape = st.shape ?? (w > 26 && dp > 26 ? pickW(rng, [['box', 4], ['L', 1.4], ['U', 1.2], ['terrace', 0.8], ['ring', 0.8]]) : 'box');
    const wings = wingsFor(shape, w, dp, total, T);
    const roof = st.roof ?? pickW(rng, [['flat', 5], ['mansard', 1.4], ['gable', 0.6]]);
    const balc = st.balconies ?? rng.chance(0.3);
    for (const [wx0, wz0, wx1, wz1, fl] of wings) {
      const [x0, z0, x1, z1] = T.wall(wx0, wz0, wx1, wz1, 0, T.Y(fl));
      const top = T.Y(fl);
      storefront(b, rng, T, x0, z0, x1, z1, { awning: st.awning ?? z1 >= dp / 2 - 1, mat: rng.chance(0.5) ? M.GLASS_DARK : M.GLASS_SLATE });
      b.box(x0 - 0.5, top - 1.3, z0 - 0.5, x1 + 0.5, top, z1 + 0.5, accent, { md: 1.5 });
      b.box(x0 - 0.25, T.Y(2) - 0.4, z0 - 0.25, x1 + 0.25, T.Y(2) + 0.1, z1 + 0.25, accent, { md: 1.5 });
      if (balc && z1 >= dp / 2 - 1) balconies(b, T, x0, z1, x1, fl, M.CONCRETE_PANEL);
      const small = Math.min(x1 - x0, z1 - z0) < 26;
      if (roof === 'mansard' && shape === 'box') {
        b.hip(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, top, Math.min(x1 - x0, z1 - z0) * 0.2, pick(rng, [M.ROOF_SLATE, M.ROOF_COPPER, M.ROOF_SHINGLE_GRAY]));
        for (let dx = x0 + T.bay; dx < x1 - T.bay * 0.5; dx += T.bay * 2) b.box(dx - 0.6, top, z1 - 0.2, dx + 0.6, top + 1.8, z1 + 0.3, M.PLASTER_WHITE, { md: 1 });
      } else if (roof === 'gable' && shape === 'box' && small) {
        b.gable(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, top, Math.min(x1 - x0, z1 - z0) * 0.32, x1 - x0 >= z1 - z0 ? 'x' : 'z', pick(rng, [M.ROOF_TERRACOTTA, M.ROOF_SLATE, M.ROOF_SHINGLE_BROWN]));
      } else flatRoof(b, rng, x0, z0, x1, z1, top, accent, Math.max(2, Math.round(((x1 - x0) * (z1 - z0)) / 320)));
    }
    if (shape === 'ring') b.box(-w * 0.18, 0, -dp * 0.18, w * 0.18, 0.3, dp * 0.18, M.LAWN, { md: 6 });
  },
});

/** Hotel: a low base under a slab, a lit crown band, a rooftop sign and a drive-in canopy. */
const hotel = defineKit({
  id: 'hotel',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_APT_RIBBON', 'FAC_GRID_WHITE', 'FAC_RIBBON_WHITE', 'FAC_CURTAIN_SILVER', 'FAC_PUNCH_SAND']));
    const accent = st.accent ?? pick(rng, [M.STEEL_DARK, M.STONE_LIGHT, M.BLACK_METAL]);
    const total = T.floors(h);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    const bf = Math.min(3, Math.floor(total / 3));
    const [bx0, bz0, bx1, bz1] = T.wall(-w / 2, -dp / 2, w / 2, dp / 2, 0, T.Y(bf));
    storefront(b, rng, T, bx0, bz0, bx1, bz1, { awning: false });
    roofCap(b, bx0, bz0, bx1, bz1, T.Y(bf), accent);
    const sx = T.bay * 2, sz = T.bay * 2;
    const [x0, z0, x1, z1] = T.wall(-w / 2 + sx, -dp / 2 + sz, w / 2 - sx, dp / 2 - sz * 0.5, 0, T.Y(total));
    b.box(x0 - 0.3, T.Y(total) - 1.0, z0 - 0.3, x1 + 0.3, T.Y(total), z1 + 0.3, M.NEON_WHITE, { md: 12 });
    flatRoof(b, rng, x0, z0, x1, z1, T.Y(total), accent, 3);
    const sy = T.Y(total) + 0.5, sw = Math.min(14, (x1 - x0) * 0.7), cx = (x0 + x1) / 2;
    b.box(cx - sw / 2, sy + 1.5, z1 - 2, cx + sw / 2, sy + 4.5, z1 - 1.6, M.BLACK_METAL, { md: 3 });
    b.box(cx - sw / 2 + 0.6, sy + 2.1, z1 - 1.6, cx + sw / 2 - 0.6, sy + 3.9, z1 - 1.45, pick(rng, SIGNS), { md: 4 });
    b.box(cx - sw / 2 + 0.5, sy, z1 - 1.9, cx - sw / 2 + 1.0, sy + 1.5, z1 - 1.7, M.STEEL_DARK, { md: 2 });
    b.box(cx + sw / 2 - 1.0, sy, z1 - 1.9, cx + sw / 2 - 0.5, sy + 1.5, z1 - 1.7, M.STEEL_DARK, { md: 2 });
    const ccx = (bx0 + bx1) / 2;
    b.box(ccx - 8, T.Y(1) - 0.6, bz1, ccx + 8, T.Y(1) - 0.2, bz1 + 7, accent, { md: 2 });
    for (const px of [ccx - 7.6, ccx + 7.2]) b.box(px, 0, bz1 + 6.4, px + 0.4, T.Y(1) - 0.6, bz1 + 6.8, M.STEEL, { md: 0.75 });
  },
});

/** Brick loft: big arched windows, a water tank on a frame, the old warehouse district. */
const loft = defineKit({
  id: 'loft',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_BRICK_DARK', 'FAC_BRICK_DARK', 'FAC_BRICK_RED', 'FAC_BRICK_BROWN']));
    const total = T.floors(h);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    const [x0, z0, x1, z1] = T.wall(-w / 2, -dp / 2, w / 2, dp / 2, 0, T.Y(total));
    const top = T.Y(total);
    b.box(x0 - 0.2, 0, z0 - 0.2, x1 + 0.2, T.Y(1), z1 + 0.2, M.GRANITE);
    b.box(x0 - 0.35, top - 1.0, z0 - 0.35, x1 + 0.35, top + 0.3, z1 + 0.35, M.STONE_LIGHT, { md: 1.5 });
    roofCap(b, x0, z0, x1, z1, top, M.STONE_DARK, { ph: 1.4 });
    const tx = (x0 + x1) / 2 + rng.range(-3, 3), tz = (z0 + z1) / 2;
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(tx + ax * 1.7 - 0.15, top + 0.5, tz + az * 1.7 - 0.15, tx + ax * 1.7 + 0.15, top + 3.5, tz + az * 1.7 + 0.15, M.STEEL_DARK, { md: 0.75 });
    b.cyl('y', tx, tz, 2.4, 2.4, top + 3.5, top + 7.5, M.WOOD_MID, { md: 3 });
    b.cyl('y', tx, tz, 2.5, 0.3, top + 7.5, top + 8.6, M.ROOF_SLATE, { md: 3 });
    rooftop(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, top + 0.5, 2);
    if (rng.chance(0.5)) b.cyl('y', x1 - 3, z0 + 3, 1.0, 0.8, top + 0.5, top + 12, M.CHIMNEY_BRICK, { md: 3 });
  },
});

/** Parking structure: open decks read as dark slots between pale slabs. */
const garage = defineKit({
  id: 'garage',
  build(d, b, rng) {
    const w = d.w, dp = d.d;
    const decks = Math.max(3, Math.min(9, Math.round((d.h || 24) / 3.2)));
    const fh = 3.2;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    b.box(-w / 2, 0, -dp / 2, w / 2, decks * fh, dp / 2, M.GLASS_BLEND_DARK);
    for (let k = 0; k <= decks; k++) b.box(-w / 2 - 0.15, k * fh - 0.5, -dp / 2 - 0.15, w / 2 + 0.15, k * fh + (k === decks ? 0.9 : 0.15), dp / 2 + 0.15, M.CONCRETE_PANEL);
    for (let x = -w / 2; x <= w / 2 + 0.1; x += 6) for (const z of [-dp / 2, dp / 2 - 0.5]) b.box(x - 0.2, 0, z, x + 0.2, decks * fh, z + 0.5, M.CONCRETE_PANEL, { md: 1 });
    b.wedge(w / 2, 0, -dp * 0.3, w / 2 + 8, fh, dp * 0.3, '-x', M.CONCRETE_DARK, { md: 2 });
    b.box(-w / 2 + 1, decks * fh + 0.9, -dp / 2 + 1, w / 2 - 1, decks * fh + 1.5, dp / 2 - 1, M.ASPHALT_WORN, { md: 4 });
    for (let x = -w / 2 + 4; x < w / 2 - 4; x += 5.4) for (const z of [-dp * 0.2, dp * 0.2]) if (rng.chance(0.5)) b.box(x, decks * fh + 1.5, z - 0.9, x + 4.2, decks * fh + 2.6, z + 0.9, pick(rng, [M.CAR_TRIM, M.STEEL, M.PAINT_WHITE, M.PAINT_BLUEGRAY]), { md: 0.6 });
  },
});

export default [midrise, hotel, loft, garage];

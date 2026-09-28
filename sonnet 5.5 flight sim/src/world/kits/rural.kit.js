import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, foundation } from './_util.js';

/* Farm buildings and the hillbilly airstrip's makeshift kit: barns, patchwork tin shacks, trailers, junk piles,
   a pallet control tower, a jeans windsock, hay rolls, an outhouse and a clothesline. */

const PATCH = [M.ROOF_TIN, M.ROOF_TIN_RUST, M.WOOD_WEATHERED, M.TARP_BLUE, M.PATCH_A, M.PATCH_B, M.PATCH_C, M.PATCH_D, M.ROOF_TIN, M.WOOD_LIGHT, M.PAINT_GREEN, M.PAINT_BLUEGRAY];

const barn = defineKit({
  id: 'barn',
  build(d, b, rng) {
    const w = d.w ?? 16, dp = d.d ?? 12;
    const wall = d.style?.wall ?? M.PAINT_BARN_RED;
    const roof = d.style?.roof ?? pick(rng, [M.ROOF_TIN_RUST, M.ROOF_GREEN, M.ROOF_RED_METAL]);
    const wh = 5.2;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2);
    b.box(-w / 2, 0, -dp / 2, w / 2, wh, dp / 2, wall);
    // gambrel roof as a per-voxel profile
    const R = wh + dp * 0.44, hb = wh + dp * 0.25, a = dp / 2 + 0.6;
    b.fn(-w / 2 - 0.6, wh - 0.2, -a, w / 2 + 0.6, R + 0.2, a, (lx, ly, lz) => {
      const az = Math.abs(lz);
      if (Math.abs(lx) > w / 2 + 0.6) return 0;
      const top = az <= a * 0.55 ? R - (R - hb) * (az / (a * 0.55)) : hb - (hb - wh) * ((az - a * 0.55) / (a * 0.45));
      return ly <= top && ly >= wh - 0.2 ? roof : 0;
    });
    // gable ends filled with wall color under the roof line
    b.fn(-w / 2, wh, -dp / 2, w / 2, R, dp / 2, (lx, ly, lz) => {
      const az = Math.abs(lz);
      const top = az <= (dp / 2) * 0.55 ? R - (R - hb) * (az / ((dp / 2) * 0.55)) : hb - (hb - wh) * ((az - (dp / 2) * 0.55) / ((dp / 2) * 0.45));
      const edge = Math.abs(lx) > w / 2 - 0.9;
      return edge && ly <= top - 0.4 ? wall : 0;
    });
    // big doors with white trim on the +x end
    const dz = 2.6;
    b.box(w / 2, 0, -dz, w / 2 + 0.2, 4.6, dz, M.PAINT_BARN_RED, { md: 1 });
    for (const t of [[-dz, 0.3], [dz - 0.3, 0.3]]) b.box(w / 2 + 0.2, 0, t[0], w / 2 + 0.35, 4.7, t[0] + t[1], M.PAINT_WHITE, { md: 0.75 });
    b.box(w / 2 + 0.2, 4.4, -dz, w / 2 + 0.35, 4.7, dz, M.PAINT_WHITE, { md: 0.75 });
    b.box(w / 2 + 0.2, 0, -0.1, w / 2 + 0.35, 4.6, 0.1, M.PAINT_WHITE, { md: 0.75 });
    // hay loft door and vane
    b.box(w / 2 + 0.05, wh + 1.2, -0.9, w / 2 + 0.25, wh + 2.6, 0.9, M.WOOD_DARK, { md: 1 });
    b.box(-0.15, R, -0.15, 0.15, R + 1.6, 0.15, M.STEEL_DARK, { md: 0.75 });
    b.box(-0.8, R + 1.3, -0.08, 0.8, R + 1.6, 0.08, M.STEEL_DARK, { md: 0.5 });
    for (let x = -w / 2 + 3; x < w / 2 - 1; x += 4) b.box(x - 0.15, 0, -dp / 2 - 0.1, x + 0.15, wh, -dp / 2, M.PAINT_WHITE, { md: 1 });
  },
});

const tinshack = defineKit({
  id: 'tinshack',
  build(d, b, rng) {
    const w = d.w ?? 8, dp = d.d ?? 6, h = d.h ?? 3.4;
    const open = !!d.open;
    b.box(-w / 2 - 0.3, -1.5, -dp / 2 - 0.3, w / 2 + 0.3, 0.2, dp / 2 + 0.3, M.CONCRETE_DARK);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, M.WOOD_DARK);
    // patchwork wall panels on all four faces
    const ph = 1.2, pw = 1.5;
    const face = (axis, sign) => {
      const len = axis === 'x' ? dp : w;
      const n = Math.max(1, Math.round(len / pw));
      const rows = Math.max(2, Math.round(h / ph));
      for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
        const a0 = -len / 2 + (i * len) / n, a1 = -len / 2 + ((i + 1) * len) / n;
        const y0 = (j * h) / rows, y1 = ((j + 1) * h) / rows;
        const m = pick(rng, PATCH);
        const off = rng.range(0.05, 0.2);
        if (axis === 'x') {
          const x = sign * (w / 2);
          if (sign > 0) b.box(x, y0, a0, x + off, y1, a1, m); else b.box(x - off, y0, a0, x, y1, a1, m);
        } else {
          const z = sign * (dp / 2);
          if (sign > 0) b.box(a0, y0, z, a1, y1, z + off, m); else b.box(a0, y0, z - off, a1, y1, z, m);
        }
      }
    };
    face('x', 1); face('x', -1); face('z', -1);
    if (!open) face('z', 1);
    // lopsided roof from three sheets
    const sheets = 3;
    for (let i = 0; i < sheets; i++) {
      const x0 = -w / 2 - 0.5 + (i * (w + 1)) / sheets, x1 = -w / 2 - 0.5 + ((i + 1) * (w + 1)) / sheets;
      const lift = rng.range(-0.15, 0.35);
      b.wedge(x0, h, -dp / 2 - 0.5, x1, h + 1.3 + lift, dp / 2 + 0.5, '-z', pick(rng, [M.ROOF_TIN, M.ROOF_TIN_RUST, M.ROOF_TIN, M.PATCH_D]));
    }
    b.cyl('y', -w * 0.25, dp * 0.1, 0.5, 0.5, h + 0.6, h + 1.0, M.TIRE, { md: 1 });
    b.cyl('y', w * 0.3, -dp * 0.2, 0.22, 0.22, h + 0.9, h + 3.0, M.STEEL_DARK, { md: 0.75 });
    if (open) {
      // wide opening on the +z face so an aircraft can sit inside
      const ow = Math.min(w - 1.2, 8);
      b.carve(-ow / 2, 0.15, dp / 2 - dp * 0.9, ow / 2, h - 0.4, dp / 2 + 0.4);
      b.box(-ow / 2, 0, -dp / 2 + 0.6, ow / 2, 0.2, dp / 2 + 0.4, M.CONCRETE_DARK);
      b.box(-ow / 2 - 0.25, 0, dp / 2, -ow / 2, h - 0.3, dp / 2 + 0.3, M.WOOD_LIGHT, { md: 1 });
      b.box(ow / 2, 0, dp / 2, ow / 2 + 0.25, h - 0.3, dp / 2 + 0.3, M.WOOD_LIGHT, { md: 1 });
      b.box(-ow / 2 - 0.25, h - 0.5, dp / 2, ow / 2 + 0.25, h - 0.2, dp / 2 + 0.3, M.WOOD_LIGHT, { md: 1 });
      b.box(-ow / 2 + 0.5, 0.2, dp / 2 - 0.1, -ow / 2 + 2.3, 2.6, dp / 2 + 0.6, M.TARP_BLUE, { md: 1 });
    } else {
      b.box(-0.6, 0, dp / 2 + 0.2, 0.6, 2.1, dp / 2 + 0.35, M.WOOD_LIGHT, { md: 0.75 });
    }
  },
});

const trailer = defineKit({
  id: 'trailer',
  build(d, b, rng) {
    const w = d.w ?? 14, dp = d.d ?? 3.7;
    const wall = d.style?.wall ?? pick(rng, [M.SIDING_WHITE, M.PAINT_YELLOW, M.SIDING_BLUE, M.SIDING_GREEN, M.PLASTER_CREAM]);
    b.box(-w / 2, 0.55, -dp / 2, w / 2, 3.1, dp / 2, wall);
    b.box(-w / 2, 0, -dp / 2, w / 2, 0.6, dp / 2, M.SIDING_GRAY);
    b.facade(-w / 2, 0.55, -dp / 2, w / 2, 3.1, dp / 2, { floorH: 2.6, bay: 3, winW: 1.2, winH: 1.0, sill: 0.9, glass: [M.GLASS_CLEAR, M.GLASS_SLATE], lit: 0.2, seed: d.seed, style: 'punched', coarse: M.GLASS_BLEND_LIGHT, top: 0.3, corner: 1 });
    b.gable(-w / 2 - 0.2, -dp / 2 - 0.2, w / 2 + 0.2, dp / 2 + 0.2, 3.1, 0.7, 'x', M.ROOF_TIN);
    b.box(-0.7, 0.55, dp / 2, 0.7, 2.6, dp / 2 + 0.15, M.WOOD_DARK, { md: 0.6 });
    b.box(-1.6, 0, dp / 2, 1.6, 0.6, dp / 2 + 1.4, M.WOOD_MID, { md: 1 });
    b.box(w * 0.3, 3.1, -0.7, w * 0.3 + 1.5, 3.9, 0.7, M.SIDING_GRAY, { md: 1 });
    b.cyl('z', 0.6, w * 0.15, 0.6, 0.15, dp / 2 + 0.6, dp / 2 + 1.0, M.STEEL, { md: 0.75 });
    for (const x of [-w * 0.35, w * 0.35]) b.cyl('z', 0.5, x, 0.5, 0.5, -dp / 2 - 0.25, -dp / 2, M.TIRE, { md: 1 });
  },
});

const junkpile = defineKit({
  id: 'junkpile',
  build(d, b, rng) {
    const w = d.w ?? 14, dp = d.d ?? 10;
    const cols = [M.RUST, M.RUST_DARK, M.PATCH_D, M.PATCH_A, M.PAINT_BLUEGRAY, M.SIDING_GRAY, M.PAINT_WHITE, M.PAINT_GREEN];
    // car hulks
    for (let i = 0; i < 4; i++) {
      const x = rng.range(-w / 2 + 2.4, w / 2 - 2.4), z = rng.range(-dp / 2 + 1.2, dp / 2 - 1.2);
      const y = i > 1 ? 1.3 : 0;
      const c = pick(rng, cols);
      b.box(x - 2.1, y + 0.3, z - 0.85, x + 2.1, y + 1.0, z + 0.85, c);
      b.box(x - 1.1, y + 1.0, z - 0.8, x + 1.0, y + 1.6, z + 0.8, c);
      b.box(x - 0.95, y + 1.05, z - 0.82, x + 0.85, y + 1.5, z + 0.82, M.GLASS_DARK, { md: 0.5 });
      for (const [ax, az] of [[-1.3, -0.85], [1.3, -0.85], [-1.3, 0.85], [1.3, 0.85]]) if (i < 2) b.cyl('z', x + ax, y + 0.35, 0.35, 0.35, z + az - 0.1, z + az + 0.1, M.TIRE, { md: 0.5 });
    }
    // tire stacks, drums, appliances
    for (let i = 0; i < 5; i++) {
      const x = rng.range(-w / 2 + 1, w / 2 - 1), z = rng.range(-dp / 2 + 1, dp / 2 - 1);
      const n = rng.int(2, 5);
      for (let k = 0; k < n; k++) b.cyl('y', x, z, 0.55, 0.55, k * 0.3, k * 0.3 + 0.3, M.TIRE);
    }
    for (let i = 0; i < 6; i++) {
      const x = rng.range(-w / 2 + 1, w / 2 - 1), z = rng.range(-dp / 2 + 1, dp / 2 - 1);
      b.cyl('y', x, z, 0.3, 0.3, 0, 0.9, pick(rng, [M.RUST, M.PAINT_BARN_RED, M.SIGN_YELLOW, M.PAINT_GREEN, M.TARP_BLUE]));
    }
    for (let i = 0; i < 3; i++) {
      const x = rng.range(-w / 2 + 1, w / 2 - 1), z = rng.range(-dp / 2 + 1, dp / 2 - 1);
      b.box(x - 0.4, 0, z - 0.4, x + 0.4, 1.7, z + 0.4, M.PAINT_WHITE, { md: 1 });
    }
    b.blob(0, 0.6, 0, w * 0.35, 0.9, dp * 0.35, M.RUST_DARK, 5, 0.6, M.RUST, 0.4);
  },
});

const pallettower = defineKit({
  id: 'pallettower',
  build(d, b, rng) {
    const H = d.h ?? 7.6;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(sx * 1.6 - 0.16, -1, sz * 1.6 - 0.16, sx * 1.6 + 0.16, H, sz * 1.6 + 0.16, M.WOOD_LIGHT);
    for (let y = 1.4; y < H - 1; y += 1.6) {
      b.box(-1.7, y, -1.7, 1.7, y + 0.14, -1.5, M.WOOD_MID, { md: 0.5 });
      b.box(-1.7, y, 1.5, 1.7, y + 0.14, 1.7, M.WOOD_MID, { md: 0.5 });
      b.box(-1.7, y + 0.7, -1.7, -1.5, y + 0.84, 1.7, M.WOOD_DARK, { md: 0.5 });
      b.box(1.5, y + 0.7, -1.7, 1.7, y + 0.84, 1.7, M.WOOD_DARK, { md: 0.5 });
    }
    b.box(-2.3, H, -2.3, 2.3, H + 0.3, 2.3, M.WOOD_LIGHT);
    // cabin
    b.box(-1.6, H + 0.3, -1.6, 1.6, H + 2.6, 1.6, M.WOOD_WEATHERED);
    b.box(-1.62, H + 1.1, -1.62, 1.62, H + 2.1, 1.62, M.GLASS_CLEAR, { md: 0.5 });
    b.box(-1.9, H + 2.6, -1.9, 1.9, H + 2.9, 1.9, M.TARP_BLUE);
    b.wedge(-2.0, H + 2.9, -2.0, 2.0, H + 3.4, 2.0, '+x', M.ROOF_TIN_RUST, { md: 1 });
    // railing, antenna, flag and a cooler
    for (const z of [-2.25, 2.25]) b.box(-2.3, H + 0.3, z - 0.05, 2.3, H + 1.2, z + 0.05, M.WOOD_MID, { md: 0.4 });
    b.box(2.25, H + 0.3, -2.3, 2.35, H + 1.2, 2.3, M.WOOD_MID, { md: 0.4 });
    b.cyl('y', 1.2, 1.2, 0.07, 0.04, H + 3.4, H + 8.2, M.STEEL, { md: 0.5 });
    b.box(1.2, H + 7.2, 1.2, 2.5, H + 7.9, 1.26, M.SIGN_RED, { md: 0.5 });
    b.box(1.7, H + 0.3, -2.1, 2.2, H + 0.7, -1.7, M.PAINT_WHITE, { md: 0.5 });
    // ladder
    for (let y = 0; y < H; y += 0.5) b.box(-0.5, y, 2.35, 0.5, y + 0.07, 2.42, M.WOOD_MID, { md: 0.3 });
  },
});

const windsock = defineKit({
  id: 'windsock',
  conservative: true,
  maxCell: 3,
  build(d, b) {
    b.cyl('y', 0, 0, 0.09, 0.09, 0, 6, M.STEEL_DARK, { md: 1 });
    const seg = 5;
    for (let i = 0; i < seg; i++) {
      const r0 = 0.62 - i * 0.075, r1 = 0.62 - (i + 1) * 0.075;
      b.cyl('x', 6.2, 0, r0, r1, i * 0.62, (i + 1) * 0.62, i % 2 ? M.PAINT_WHITE : (d.style?.jeans ? M.TARP_BLUE : M.TARP_ORANGE));
    }
    b.cyl('x', 6.2, 0, 0.66, 0.66, -0.06, 0.06, M.STEEL, { md: 0.5 });
  },
});

const hayrolls = defineKit({
  id: 'hayrolls',
  build(d, b, rng) {
    const n = d.n ?? 4;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 2.3, z = rng.range(-0.6, 0.6);
      b.cyl('z', x, 0.9, 0.95, 0.95, z - 0.7, z + 0.7, M.HAY);
      if (i % 2 && n > 2) b.cyl('z', x + 1.15, 2.6, 0.95, 0.95, z - 0.7, z + 0.7, M.HAY);
    }
  },
});

const outhouse = defineKit({
  id: 'outhouse',
  maxCell: 3,
  build(d, b) {
    b.box(-0.65, 0, -0.65, 0.65, 2.2, 0.65, M.WOOD_WEATHERED);
    b.wedge(-0.8, 2.2, -0.8, 0.8, 2.75, 0.8, '-z', M.ROOF_TIN_RUST, { md: 0.75 });
    b.box(-0.4, 0, 0.65, 0.4, 1.9, 0.72, M.WOOD_DARK, { md: 0.5 });
    b.box(-0.12, 1.4, 0.72, 0.12, 1.65, 0.75, M.SIGN_YELLOW, { md: 0.25 });
  },
});

const clothesline = defineKit({
  id: 'clothesline',
  conservative: true,
  maxCell: 1.5,
  build(d, b, rng) {
    const L = d.w ?? 8;
    for (const s of [-1, 1]) b.box(s * L / 2 - 0.08, 0, -0.08, s * L / 2 + 0.08, 2.4, 0.08, M.WOOD_DARK, { md: 0.75 });
    b.box(-L / 2, 2.2, -0.03, L / 2, 2.26, 0.03, M.FENCE, { md: 0.4 });
    for (let i = 0; i < 5; i++) {
      const x = -L / 2 + 0.8 + i * ((L - 1.6) / 4);
      b.box(x - 0.35, 1.2, -0.04, x + 0.35, 2.2, 0.04, pick(rng, [M.TARP_ORANGE, M.PAINT_WHITE, M.TARP_BLUE, M.SIGN_RED, M.PAINT_YELLOW, M.PAINT_GREEN]), { md: 0.5 });
    }
  },
});

export default [barn, tinshack, trailer, junkpile, pallettower, windsock, hayrolls, outhouse, clothesline];

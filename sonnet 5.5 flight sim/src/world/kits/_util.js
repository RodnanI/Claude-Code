import { M } from '../../voxel/palette.js';
import { strut } from '../../aircraft/builders/parts.js';

/** Helpers shared by kits. Files starting with an underscore are never auto-registered. */

export const pick = (rng, list) => list[Math.floor(rng.next() * list.length)];

/** Thin parapet ring around a rectangle at height y. */
export function parapet(b, x0, z0, x1, z1, y, h, t, mat, o) {
  b.box(x0, y, z0, x1, y + h, z0 + t, mat, o);
  b.box(x0, y, z1 - t, x1, y + h, z1, mat, o);
  b.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, mat, o);
  b.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, mat, o);
}

/** Rooftop clutter: AC units, vents, small penthouse. Detail only shows at fine voxel sizes. */
export function roofClutter(b, rng, x0, z0, x1, z1, y, count = 5) {
  const w = x1 - x0, d = z1 - z0;
  for (let i = 0; i < count; i++) {
    const sx = rng.range(1.2, 3.2), sz = rng.range(1.2, 2.6), sy = rng.range(0.8, 1.9);
    const cx = x0 + 1.5 + rng.next() * Math.max(0.1, w - 3 - sx), cz = z0 + 1.5 + rng.next() * Math.max(0.1, d - 3 - sz);
    b.box(cx, y, cz, cx + sx, y + sy, cz + sz, rng.chance(0.6) ? M.STEEL : M.CONCRETE_PANEL, { md: 2 });
    if (rng.chance(0.5)) b.box(cx + 0.2, y + sy, cz + 0.2, cx + sx - 0.2, y + sy + 0.25, cz + sz - 0.2, M.STEEL_DARK, { md: 0.75 });
  }
}

export function foundation(b, x0, z0, x1, z1, depth = 3, mat = M.CONCRETE_DARK) {
  b.box(x0 - 0.4, -depth, z0 - 0.4, x1 + 0.4, 0.05, z1 + 0.4, mat);
}

export const WALLS_CIVIC = [M.CONCRETE_PANEL, M.STONE_LIGHT, M.PLASTER_GRAY, M.CONCRETE_BLDG];
export const WALLS_BRICK = [M.BRICK_RED, M.BRICK_BROWN, M.BRICK_DARK];
export const GLASS_SETS = {
  teal: [M.GLASS_TEAL, M.GLASS_SLATE],
  dark: [M.GLASS_DARK, M.GLASS_SLATE],
  clear: [M.GLASS_CLEAR, M.GLASS_TEAL],
  bronze: [M.GLASS_BRONZE, M.GLASS_DARK],
  green: [M.GLASS_GREEN, M.GLASS_TEAL],
};

/** Handrail along any straight run at height y: posts, a top rail and a mid rail. Fine detail only. */
export function rails(b, x0, z0, x1, z1, y, h = 1.05, mat = M.STEEL, step = 2.4) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    b.box(x - 0.04, y, z - 0.04, x + 0.04, y + h, z + 0.04, mat, { md: 0.6 });
  }
  for (const k of [h, h * 0.5]) strut(b, [x0, y + k, z0], [x1, y + k, z1], 0.07, mat, { md: 0.6 });
}

/** Vertical door leaves in two tones, side by side: a big sliding door part way along its travel. */
export function leaves(b, x0, x1, y0, y1, z, depth, n, a = M.STEEL_BRIGHT, c = M.STEEL) {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) b.box(x0 + i * w, y0, z, x0 + (i + 1) * w - 0.05, y1, z + depth, i & 1 ? a : c, { md: 0.9 });
}

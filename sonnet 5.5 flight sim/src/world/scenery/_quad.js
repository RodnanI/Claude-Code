import { M } from '../../voxel/palette.js';

/**
 * A four-legged animal out of boxes, in meters, facing +x, feet on y = 0. o: { L, W, H, leg, neck, headL, coat, hoof, tail, snout,
 * ear }: body length, width and back height, leg length, and how far the neck and head reach.
 */
export function quadruped(b, o) {
  const { L, W, H, leg } = o;
  const coat = o.coat ?? M.FUR, x0 = -L / 2, x1 = L / 2;
  b.box(x0, leg * 0.92, -W / 2, x1, H, W / 2, coat);
  // shoulders and rump are a little fuller than the belly
  b.box(x0 + L * 0.04, leg * 0.92, -W / 2 - W * 0.04, x0 + L * 0.3, H - 0.02, W / 2 + W * 0.04, coat, { md: L * 0.12 });
  b.box(x1 - L * 0.3, leg * 0.92, -W / 2 - W * 0.04, x1 - L * 0.04, H - 0.02, W / 2 + W * 0.04, coat, { md: L * 0.12 });
  const nk = o.neck, hl = o.headL;
  b.box(x1 - L * 0.12, H - nk * 0.75, -W * 0.28, x1 + nk * 0.55, H + nk * 0.42, W * 0.28, coat);
  const hx = x1 + nk * 0.4, hy = H + nk * 0.08;
  b.box(hx, hy - hl * 0.5, -W * 0.22, hx + hl, hy + hl * 0.28, W * 0.22, coat);
  if (o.snout !== 0) b.box(hx + hl * 0.86, hy - hl * 0.46, -W * 0.18, hx + hl + 0.03, hy - hl * 0.02, W * 0.18, o.snout ?? M.PLASTER_TERRA, { md: L * 0.09 });
  if (o.ear !== 0) for (const s of [-1, 1]) b.box(hx + hl * 0.05, hy + hl * 0.24, s * W * 0.2 - 0.03, hx + hl * 0.3, hy + hl * 0.44, s * W * 0.3 + 0.03, coat, { md: L * 0.08 });
  // legs and hooves
  const lw = Math.max(0.05, W * 0.11);
  for (const px of [x0 + L * 0.13, x1 - L * 0.13]) for (const s of [-1, 1]) {
    b.box(px - lw, 0, s * W * 0.32 - lw, px + lw, leg, s * W * 0.32 + lw, coat);
    b.box(px - lw * 1.05, 0, s * W * 0.32 - lw * 1.05, px + lw * 1.05, leg * 0.1, s * W * 0.32 + lw * 1.05, o.hoof ?? M.TIRE, { md: L * 0.1 });
  }
  const tl = o.tail ?? L * 0.22;
  b.box(x0 - 0.05, H - tl, -0.03, x0 + 0.02, H - 0.05, 0.03, o.tailMat ?? coat, { md: L * 0.09 });
}

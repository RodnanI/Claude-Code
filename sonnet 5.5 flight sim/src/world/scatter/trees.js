/* Trees are not one model each. A tree is a trunk plus a few crowns, every part a shared model drawn many times:
   'trunk' (a tapered post), 'puff' and 'puffb' (voxel balls that the shader rounds and lights as spheres) and 'cone' (a
   conifer tier). Instances of one part from every tree of a node share a single draw, so a forest costs a handful of draws
   however many species stand in it, and each crown is a few hundred triangles instead of thousands.
   A species is a function (emit, t) that places its parts; t carries the scale, the level of detail, the color bank and a set
   of random numbers that belong to this one tree. */

const TAU = Math.PI * 2;

/** The height of a crown above the tree's foot rides in the whole part of the yaw (see the instanced vertex shader). */
export const packYaw = (yaw, h) => (((yaw % TAU) + TAU) % TAU) + 8 * Math.max(0, Math.min(255, Math.round(h * 4)));

/** Crown size multiplier and number of side crowns by level of detail: far trees are fewer, so each one is bigger and simpler. */
export const LEVEL_CROWN = [1.2, 1.4, 1.7, 2.1, 2.6, 3.2, 3.8, 4.5];

/**
 * Broadleaf tree. o: { trunk: [min, max] meters, crown: [min, max] radius, spread (side crown reach as a share of the radius),
 * sides: [count at level 0, 1, 2+], lift (crown center height above the trunk top as a share of the radius), puff, bank }.
 */
export function broadleaf(e, t, o) {
  const s = t.s, lv = Math.min(t.level, 2), cs = LEVEL_CROWN[Math.min(t.level, 7)];
  const H = (o.trunk[0] + (o.trunk[1] - o.trunk[0]) * t.u[0]) * s;
  const R = (o.crown[0] + (o.crown[1] - o.crown[0]) * t.u[1]) * s * cs;
  const puff = o.puff || 'puff';
  const cy = H + R * (o.lift ?? 0.6);
  if (t.level <= 1) e('trunk', 0, 0, 0, 0, t.u[2] * TAU, (H + R * 0.5) * 1.05, o.trunkBank ?? 0);
  e(puff, t.pv, 0, cy, 0, packYaw(t.u[3] * TAU, cy), R, t.bank);
  const n = o.sides[lv];
  for (let k = 0; k < n; k++) {
    const a = t.u[4] * TAU + (k / n) * TAU + (t.u[5] - 0.5) * 0.9;
    const u = ((t.u[6] * 7 + k * 0.618) % 1);
    const r = R * (0.52 + 0.24 * u);
    const d = R * (o.spread ?? 0.66) * (0.85 + 0.3 * ((t.u[7] * 5 + k * 0.37) % 1));
    const y = H + R * ((o.lift ?? 0.6) - 0.28 + 0.62 * u);
    e(puff, (t.pv + k + 1) % 3, Math.cos(a) * d, y, Math.sin(a) * d, packYaw(u * TAU, y), r, t.bank);
  }
  if (t.level === 0 && o.top) e(puff, (t.pv + 2) % 3, (t.u[5] - 0.5) * R * 0.3, cy + R * 0.78, (t.u[6] - 0.5) * R * 0.3, packYaw(t.u[2] * TAU, cy + R * 0.78), R * 0.52, t.bank);
}

/** Conifer: a thin trunk and stacked tiers that shrink toward the tip. o: { trunk, radius, tiers: [count at level 0, 1, 2+], height, bank }. */
export function conifer(e, t, o) {
  const s = t.s, lv = Math.min(t.level, 2), cs = LEVEL_CROWN[Math.min(t.level, 7)];
  const H = (o.height[0] + (o.height[1] - o.height[0]) * t.u[0]) * s * (0.85 + 0.15 * cs);
  const R0 = (o.radius[0] + (o.radius[1] - o.radius[0]) * t.u[1]) * s * cs;
  const base = (o.trunk ?? 1.6) * s;
  const n = o.tiers[lv];
  if (t.level <= 1) e('trunk', 0, 0, 0, 0, t.u[2] * TAU, (base + H * 0.55) * 1.02, o.trunkBank ?? 2);
  for (let k = 0; k < n; k++) {
    const f = n === 1 ? 0 : k / (n - 1);
    const y = base + f * H * 0.62 + 0.45 * R0 * (1 - f * 0.6);
    const r = R0 * (1 - 0.68 * f) * (0.94 + 0.12 * ((t.u[3] * 9 + k * 0.7) % 1));
    e('cone', (t.pv + k) % 3, 0, y, 0, packYaw((t.u[4] + k * 0.31) * TAU, y), r, t.bank);
  }
}

import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';
import { landOK } from '../_shared/zoning.js';

/* Port Halden: harbor city on the south coast. Glass and brick towers around a compact center, old town rows
   and apartments around it, houses on the outskirts, container terminal and piers along the water. */
export default settlement({
  key: 'portHalden', kind: 'city', block: 100, street: 20, i: [-9, 9], j: [-7, 6], maxHeight: 300, tint: M.URBAN_DENSE, blend: 320,
  style: {
    types: { midrise: 3, oldtown: 1.4, lowrise: 2, houses: 2, park: 0.5, tower: 0.5, plaza: 0.4, parking: 0.4, apartments: 0.8, civic: 0.3 },
    mid: [24, 62], low: [9, 18], apt: [14, 34],
    height: (rng, r) => 80 + 150 * Math.max(0, 1 - Math.hypot(r.i, r.j) / 3.4) * rng.range(0.6, 1),
    towerFac: [['FAC_CURTAIN_TEAL', 2], ['FAC_CURTAIN_BLUE', 2], ['FAC_CURTAIN_SILVER', 1.4], ['FAC_RIBBON_WHITE', 1.6], ['FAC_CURTAIN_DARK', 1]],
    midFac: [['FAC_BRICK_RED', 2], ['FAC_PLASTER_CREAM', 2], ['FAC_APT_RIBBON', 2], ['FAC_PLASTER_TERRA', 1.2], ['FAC_GRID_WHITE', 1]],
    midrise: { balconies: true },
  },
  blockFor(r, rng) {
    const d = Math.hypot(r.i, r.j);
    if (r.j >= 4) return rng.chance(0.6) ? 'harbor' : 'industrial';
    if (d < 1.6) return rng.chance(0.7) ? 'tower' : 'plaza';
    if (d < 3.6) return rng.weighted([['midrise', 3], ['oldtown', 2], ['tower', 1.2], ['park', 0.5], ['civic', 0.3]]);
    if (Math.abs(r.i) >= 6) return rng.weighted([['houses', 6], ['park', 0.6], ['apartments', 0.8], ['strip', 0.3]]);
    return rng.weighted([['lowrise', 3], ['midrise', 2], ['houses', 3], ['apartments', 1], ['parking', 0.5]]);
  },
  extras(ctx, { out, lat, rng, blocks }) {
    // piers and cranes where the south blocks meet water
    for (const r of blocks) {
      if (r.j < 4 || !landOK(ctx, r)) continue;
      if (ctx.heightAt(r.cx, r.z1 + 70) < 0.6) {
        const L = rng.range(70, 100);
        for (const ox of [-0.28, 0.28]) put(ctx, out, 'pier', r.cx + r.w * ox, r.z1 + L / 2 - 6, L, 14, 4, 1, rng.int(1, 1e6), undefined, { y: 0 });
        put(ctx, out, 'crane', r.cx, r.z1 - 4, 20, 20, 60, 0, rng.int(1, 1e6));
      }
    }
  },
});

import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';
import { landOK } from '../_shared/zoning.js';

/* Saltmarsh: beach town with bright houses, a boardwalk pier and a lighthouse on the point. */
export default settlement({
  key: 'saltmarsh', kind: 'town', block: 70, street: 16, i: [-3, 3], j: [-2, 2], maxHeight: 40, tint: M.URBAN_LOWRISE, blend: 200,
  streets: () => 'street',
  style: { types: { houses: 5, lowrise: 2, park: 0.8, plaza: 0.5 }, low: [5, 9], house: { wall: M.SIDING_YELLOW, roof: M.ROOF_TERRACOTTA }, lowrise: { wall: M.PLASTER_CREAM } },
  extras(ctx, { out, lat, rng, blocks }) {
    for (const r of blocks) {
      if (!landOK(ctx, r)) continue;
      for (const [dx, dz, rot] of [[1, 0, 1], [-1, 0, 3], [0, 1, 0], [0, -1, 2]]) {
        if (ctx.heightAt(r.cx + dx * (r.w / 2 + 70), r.cz + dz * (r.d / 2 + 70)) < 0.6) {
          const L = 80;
          put(ctx, out, 'pier', r.cx + dx * (r.w / 2 + L / 2 - 4), r.cz + dz * (r.d / 2 + L / 2 - 4), L, 10, 4, rot === 1 || rot === 3 ? 0 : 1, rng.int(1, 1e6), undefined, { y: 0 });
        }
      }
    }
    const e = lat.blockRect(3, 2);
    put(ctx, out, 'lighthouse', e.x1 + 30, e.z1 + 20, 12, 12, 30, 0, 91);
  },
});

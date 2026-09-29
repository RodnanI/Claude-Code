import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';
import { landOK } from '../_shared/zoning.js';

/* Dunmore: small fishing town on the north coast with a church, a working pier and a lighthouse. */
export default settlement({
  key: 'dunmore', kind: 'town', block: 70, street: 16, i: [-3, 3], j: [-3, 2], maxHeight: 40, tint: M.URBAN_LOWRISE, blend: 200,
  streets: () => 'street',
  style: { types: { houses: 5, lowrise: 1.6, park: 0.5 }, low: [6, 11], house: { roof: M.ROOF_SLATE, fac: 'FAC_SIDING_WHITE', bank: 1 }, lowrise: { fac: 'FAC_SIDING_WHITE', bank: 1 } },
  extras(ctx, { out, lat, rng, blocks }) {
    const c = lat.blockRect(1, 0);
    put(ctx, out, 'church', c.cx, c.cz, 11, 26, 30, 0, 71);
    for (const r of blocks) {
      if (r.j !== -3 || !landOK(ctx, r)) continue;
      if (ctx.heightAt(r.cx, r.z0 - 60) < 0.6) put(ctx, out, 'pier', r.cx, r.z0 - 54, 96, 12, 4, 3, rng.int(1, 1e6), undefined, { y: 0 });
    }
    const w = lat.blockRect(-3, -3);
    put(ctx, out, 'lighthouse', w.x0 - 40, w.z0 - 10, 12, 12, 32, 0, 72);
  },
});

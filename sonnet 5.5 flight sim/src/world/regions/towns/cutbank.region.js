import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';

/* Cutbank: farm town in the middle of the island. Grain silos, barns, a church and a water tower stand out
   over the surrounding patchwork fields. */
export default settlement({
  key: 'cutbank', kind: 'town', block: 80, street: 16, i: [-4, 4], j: [-3, 3], maxHeight: 45, tint: M.URBAN_LOWRISE, blend: 240, pad: [200, 40, 40, 40],
  streets: () => 'street',
  style: { types: { houses: 4.5, lowrise: 2, park: 0.5 }, low: [6, 10], lowrise: { wall: M.PLASTER_CREAM }, house: { roof: M.ROOF_SHINGLE_GRAY } },
  extras(ctx, { out, lat }) {
    const c = lat.blockRect(0, 0);
    put(ctx, out, 'church', c.cx, c.cz, 12, 28, 32, 0, 61);
    const s = lat.blockRect(4, 3);
    put(ctx, out, 'silo', s.cx, s.cz, 24, 8, 26, 0, 62, undefined, { n: 4, r: 4, h: 28 });
    put(ctx, out, 'watertower', lat.blockRect(-4, -3).cx, lat.blockRect(-4, -3).cz, 12, 12, 32, 0, 63);
    for (let i = 0; i < 4; i++) put(ctx, out, 'barn', lat.lineX(-4.5 - 0.1 * i) - 60 - i * 34, lat.lineZ(0.5 + i * 0.7), 18, 13, 0, i & 3, 64 + i);
  },
});

import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';

/* Pinecrest: lakeside forest town on the western foothills, with a sawmill and a small church. */
export default settlement({
  key: 'pinecrest', kind: 'town', block: 70, street: 16, i: [-3, 3], j: [-3, 2], maxHeight: 40, tint: M.URBAN_GREEN, blend: 220,
  streets: () => 'street',
  style: { types: { houses: 6, lowrise: 1, park: 1 }, low: [5, 9], house: { roof: M.ROOF_SHINGLE_BROWN, fac: 'FAC_SIDING_WHITE', bank: 2 } },
  extras(ctx, { out, lat }) {
    const c = lat.blockRect(-1, 1);
    put(ctx, out, 'church', c.cx, c.cz, 10, 22, 28, 0, 81, { wall: M.PLASTER_WHITE });
    const m = lat.blockRect(3, 0);
    put(ctx, out, 'warehouse', m.cx, m.cz, 46, 30, 9, 0, 82, { wall: M.WOOD_WEATHERED, roof: M.ROOF_TIN_RUST });
    put(ctx, out, 'tank', m.cx + 40, m.cz + 30, 12, 12, 10, 0, 83);
  },
});

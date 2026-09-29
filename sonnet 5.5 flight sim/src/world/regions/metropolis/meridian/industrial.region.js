import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor } from './_lattice.js';
import { latticeRoads } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -14, I1 = -10, J0 = -16, J1 = 4;

export default defineRegion({
  id: 'metropolis/meridian/industrial',
  name: 'Meridian Works',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 60,
  tint: M.URBAN_INDUSTRIAL,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, (axis, idx) => (Math.round(idx * 2) % 8 === 1 ? 'avenue' : 'street'));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = { types: { industrial: 6, parking: 0.6, harbor: 0.8, lowrise: 0.4 }, low: [8, 12] };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out, { trees: false, step: 60 });
    return out;
  },
});

import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -9, I1 = 4, J0 = 0, J1 = 4;

/* Brick and plaster rows, lofts and courtyards, churches and market squares. */
export default defineRegion({
  id: 'metropolis/meridian/oldtown',
  name: 'Meridian Old Town',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 90,
  tint: M.URBAN_LOWRISE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(4));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { oldtown: 6, midrise: 2.2, plaza: 0.7, park: 0.6, civic: 0.35 },
      mid: [22, 46],
      low: [11, 24],
      midFac: [['FAC_BRICK_RED', 3], ['FAC_BRICK_BROWN', 2.4], ['FAC_BRICK_DARK', 1.2], ['FAC_PLASTER_CREAM', 1.4], ['FAC_PLASTER_TERRA', 1]],
      midrise: { balconies: false },
    };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out, { step: 28 });
    return out;
  },
});

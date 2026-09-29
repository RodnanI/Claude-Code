import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -9, I1 = 4, J0 = 0, J1 = 4;

export default defineRegion({
  id: 'metropolis/meridian/oldtown',
  name: 'Meridian Old Town',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 70,
  tint: M.URBAN_LOWRISE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(4));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { lowrise: 5, midrise: 2.4, plaza: 0.8, park: 0.5 },
      mid: [16, 34],
      low: [8, 16],
      midrise: { wall: M.BRICK_RED, trim: M.STONE_LIGHT, balconies: false },
      lowrise: { wall: M.BRICK_BROWN },
    };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out, { step: 28 });
    return out;
  },
});

import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor, coreHeight } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = 5, I1 = 14, J0 = -7, J1 = -1;

export default defineRegion({
  id: 'metropolis/meridian/midtown',
  name: 'Meridian Midtown',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 160,
  tint: M.URBAN_DENSE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(3));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { midrise: 5, tower: 2.2, lowrise: 1.2, parking: 1, park: 0.5 },
      height: coreHeight(5.5, -4, 4.5, 60, 140, 0.9),
      mid: [22, 70],
      tower: { wall: M.PLASTER_CREAM, lit: 0.28 },
      midrise: { balconies: true },
    };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out);
    return out;
  },
});

import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor, coreHeight } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -4, I1 = 4, J0 = -7, J1 = -1;

export default defineRegion({
  id: 'metropolis/meridian/downtown',
  name: 'Meridian Downtown',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 360,
  tint: M.URBAN_DENSE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(3));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { tower: 7, plaza: 0.9, park: 0.5, midrise: 1.2 },
      height: coreHeight(0, -4, 5.2, 95, 340),
      tower: { lit: 0.32, podium: true },
      midrise: { lit: 0.3 },
    };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out);
    return out;
  },
});

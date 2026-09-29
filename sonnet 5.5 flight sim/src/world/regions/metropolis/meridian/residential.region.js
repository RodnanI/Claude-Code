import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor } from './_lattice.js';
import { latticeRoads } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -14, I1 = 14, J0 = 5, J1 = 12;

export default defineRegion({
  id: 'metropolis/meridian/residential',
  name: 'Meridian Suburbs',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 40,
  tint: M.URBAN_RESIDENTIAL,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, (axis, idx) => (Math.round(idx * 2) % 8 === 1 ? 'avenue' : 'street'));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = { types: { houses: 7, park: 0.7, midrise: 0.4, lowrise: 0.35, parking: 0.2 }, mid: [12, 24], low: [6, 9] };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out, { step: 44 });
    return out;
  },
});

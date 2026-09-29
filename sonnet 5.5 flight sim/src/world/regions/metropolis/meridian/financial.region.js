import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor, coreHeight } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -9, I1 = -5, J0 = -7, J1 = -1;

export default defineRegion({
  id: 'metropolis/meridian/financial',
  name: 'Meridian Financial District',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 260,
  tint: M.URBAN_DENSE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(3));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { tower: 5, midrise: 2.2, plaza: 1, park: 0.4 },
      height: coreHeight(-6, -4, 5, 70, 230, 1.0),
      tower: { glass: [M.GLASS_DARK, M.GLASS_SLATE], facade: 'curtain', wall: M.STEEL, lit: 0.4 },
      midrise: { wall: M.CONCRETE_PANEL, glass: [M.GLASS_TEAL, M.GLASS_SLATE] },
    };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out);
    return out;
  },
});

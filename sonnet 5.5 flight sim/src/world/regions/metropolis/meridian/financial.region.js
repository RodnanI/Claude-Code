import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor, SKY } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -9, I1 = -5, J0 = -7, J1 = -1;

/* Banks and exchanges: dark glass, bronze and stone towers, deco stacks among them. */
const HEROES = [
  { i: -6, j: -4, kind: 'tower-deco', w: 52, d: 52, h: 430 },
  { i: -8, j: -5, kind: 'skyscraper', w: 50, d: 50, h: 360, style: { fac: 'FAC_CURTAIN_DARK', crown: 'spire' } },
];

export default defineRegion({
  id: 'metropolis/meridian/financial',
  name: 'Meridian Financial District',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 560,
  tint: M.URBAN_DENSE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(3));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { tower: 6.5, midrise: 2.2, plaza: 1.1, park: 0.4 },
      height: SKY,
      heroes: HEROES,
      towerKits: [['skyscraper', 5], ['tower-deco', 2.4], ['tower-round', 0.8], ['tower-taper', 0.8], ['tower-twin', 0.7]],
      towerFac: [['FAC_CURTAIN_DARK', 3], ['FAC_CURTAIN_BRONZE', 2.2], ['FAC_CURTAIN_SILVER', 2], ['FAC_RIBBON_STONE', 1.6], ['FAC_RIBBON_DARK', 1.4], ['FAC_CURTAIN_TEAL', 0.8]],
      mid: [40, 95],
      midFac: [['FAC_RIBBON_STONE', 2.4], ['FAC_PIER_LIME', 1.6], ['FAC_PIER_DARK', 1.2], ['FAC_GRID_CONCRETE', 1.4], ['FAC_PUNCH_SAND', 1.4]],
    };
    const isHero = (r) => HEROES.some((h) => h.i === r.i && h.j === r.j);
    fillBlocks(ctx, rng, blocks, style, out, (r, g) => (isHero(r) ? 'hero' : g.weighted(Object.entries(style.types))));
    roadProps(rng, out.roads, out);
    return out;
  },
});

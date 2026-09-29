import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor, SKY } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = -4, I1 = 4, J0 = -7, J1 = -1;

/* The core: glass and steel towers on cut lots, a few supertalls, plazas and pocket parks. */
const HEROES = [
  { i: 0, j: -4, kind: 'supertall', w: 64, d: 64, h: 640, style: { fac: 'FAC_CURTAIN_SILVER' } },
  { i: -2, j: -5, kind: 'tower-taper', w: 42, d: 42, h: 500, style: { fac: 'FAC_CURTAIN_DARK' } },
  { i: 2, j: -3, kind: 'tower-round', w: 56, d: 56, h: 420 },
  { i: 1, j: -6, kind: 'tower-twin', w: 84, d: 44, h: 380, rot: 1 },
  { i: -3, j: -3, kind: 'tower-deco', w: 46, d: 46, h: 350 },
];

export default defineRegion({
  id: 'metropolis/meridian/downtown',
  name: 'Meridian Downtown',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 780,
  tint: M.URBAN_DENSE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(3));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { tower: 8.5, plaza: 0.7, park: 0.5, midrise: 1.2 },
      height: SKY,
      heroes: HEROES,
      towerFac: [['FAC_CURTAIN_TEAL', 2], ['FAC_CURTAIN_BLUE', 2], ['FAC_CURTAIN_SILVER', 2], ['FAC_CURTAIN_DARK', 1.6], ['FAC_CURTAIN_BRONZE', 1], ['FAC_CURTAIN_GREEN', 0.8], ['FAC_RIBBON_WHITE', 1.2], ['FAC_RIBBON_DARK', 1]],
      mid: [40, 110],
      midFac: [['FAC_APT_RIBBON', 2], ['FAC_GRID_WHITE', 1.4], ['FAC_RIBBON_STONE', 1.6], ['FAC_GRID_CONCRETE', 1.2], ['FAC_CURTAIN_BLUE', 0.8], ['FAC_PUNCH_SAND', 1]],
    };
    const isHero = (r) => HEROES.some((h) => h.i === r.i && h.j === r.j);
    fillBlocks(ctx, rng, blocks, style, out, (r, g) => (isHero(r) ? 'hero' : g.weighted(Object.entries(style.types))));
    roadProps(rng, out.roads, out);
    return out;
  },
});

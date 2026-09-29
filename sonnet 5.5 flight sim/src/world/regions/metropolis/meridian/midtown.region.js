import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor, SKY } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps } from '../../_shared/zoning.js';

const I0 = 5, I1 = 14, J0 = -7, J1 = -1;

/* Offices, hotels and apartment towers in lighter colors, garages between them. */
const HEROES = [
  { i: 6, j: -4, kind: 'tower-stagger', w: 54, d: 54, h: 300 },
  { i: 9, j: -3, kind: 'tower-round', w: 50, d: 50, h: 330 },
];

export default defineRegion({
  id: 'metropolis/meridian/midtown',
  name: 'Meridian Midtown',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 480,
  tint: M.URBAN_DENSE,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(3));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { tower: 4, midrise: 4, apartments: 1.2, park: 0.6, plaza: 0.5, parking: 0.5 },
      height: SKY,
      heroes: HEROES,
      towerShare: 0.6,
      towerKits: [['skyscraper', 4], ['tower-stagger', 2.2], ['tower-round', 1.2], ['tower-taper', 0.6]],
      towerFac: [['FAC_RIBBON_WHITE', 2.4], ['FAC_RIBBON_STONE', 1.6], ['FAC_CURTAIN_BLUE', 1.6], ['FAC_GRID_WHITE', 1.6], ['FAC_CURTAIN_TEAL', 1], ['FAC_APT_RIBBON', 1.6], ['FAC_CURTAIN_SILVER', 1]],
      mid: [30, 90],
      apt: [30, 80],
      midFac: [['FAC_APT_RIBBON', 3], ['FAC_GRID_WHITE', 1.6], ['FAC_BRICK_RED', 1.2], ['FAC_PLASTER_CREAM', 1.4], ['FAC_PLASTER_WHITE', 1.2], ['FAC_GRID_CONCRETE', 1]],
    };
    const isHero = (r) => HEROES.some((h) => h.i === r.i && h.j === r.j);
    fillBlocks(ctx, rng, blocks, style, out, (r, g) => (isHero(r) ? 'hero' : g.weighted(Object.entries(style.types))));
    roadProps(rng, out.roads, out);
    return out;
  },
});

import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor } from './_lattice.js';
import { latticeRoads, avenueEvery } from '../../_shared/lattice.js';
import { newOut, fillBlocks, roadProps, landOK, snap } from '../../_shared/zoning.js';

const I0 = -9, I1 = 14, J0 = -16, J1 = -8;

export default defineRegion({
  id: 'metropolis/meridian/harbor',
  name: 'Meridian Harbor',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 70,
  tint: M.URBAN_INDUSTRIAL,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, avenueEvery(4));
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = { types: { harbor: 4, industrial: 2, parking: 0.6, lowrise: 0.8 }, low: [9, 15] };
    fillBlocks(ctx, rng, blocks, style, out);
    roadProps(rng, out.roads, out, { trees: false });
    // piers where the water starts just north of a block
    for (const r of blocks) {
      if (!landOK(ctx, r)) continue;
      const probe = ctx.heightAt(r.cx, r.z0 - 70);
      if (probe < 0.6) {
        const L = rng.range(70, 110);
        for (const ox of [-0.3, 0.3]) out.structures.push(ctx.kit('pier', { x: snap(r.cx + r.w * ox), z: snap(r.z0 - L / 2 + 6), w: L, d: 14, h: 4, rot: 3, seed: rng.int(1, 1e6), y: 0 }));
        out.structures.push(ctx.kit('crane', { x: snap(r.cx), z: snap(r.z0 + 4), w: 20, d: 20, h: 60, rot: 2, seed: rng.int(1, 1e6) }));
      }
    }
    return out;
  },
});

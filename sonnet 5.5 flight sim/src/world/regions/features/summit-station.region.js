import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { newOut, snap } from '../_shared/zoning.js';

/** A radar and radio station on a lower shoulder of Mount Corvus, with a lodge below it. */
const X = SITES.corvus.x + 1250, Z = SITES.corvus.z + 700;
export default defineRegion({
  id: 'feature/summit-station',
  name: 'Corvus Station',
  kind: 'feature',
  bounds: [X - 200, Z - 200, X + 200, Z + 200],
  maxHeight: 60,
  terrain: () => ({ flatten: [{ type: 'circle', x: X, z: Z, r: 45, blend: 90, y: 'auto', order: 6 }] }),
  layout(ctx) {
    const out = newOut();
    out.structures.push(ctx.kit('radar', { x: snap(X), z: snap(Z), w: 14, d: 14, h: 0, rot: 0, seed: 3 }));
    out.structures.push(ctx.kit('lowrise', { x: snap(X + 40), z: snap(Z + 10), w: 24, d: 12, h: 6, rot: 0, seed: 4, style: { wall: M.WOOD_LIGHT } }));
    out.structures.push(ctx.kit('tank', { x: snap(X - 30), z: snap(Z + 20), w: 10, d: 10, h: 6, rot: 0, seed: 5 }));
    return out;
  },
});

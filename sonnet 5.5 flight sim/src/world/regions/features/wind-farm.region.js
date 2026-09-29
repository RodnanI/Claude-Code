import { defineRegion } from '../../region.js';
import { M } from '../../../voxel/palette.js';
import { newOut, snap } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/** A row of wind turbines on the ridge east of Cutbank. */
const CX = 4300, CZ = 700;
export default defineRegion({
  id: 'feature/wind-farm',
  name: 'Corvus Ridge Wind Farm',
  kind: 'feature',
  bounds: [CX - 900, CZ - 900, CX + 900, CZ + 900],
  maxHeight: 130,
  layout(ctx) {
    const out = newOut();
    const rng = new Rng(31);
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7;
      const x = CX + Math.cos(a) * (160 + i * 60), z = CZ + Math.sin(a) * (90 + i * 60);
      if (ctx.heightAt(x, z) < 2) continue;
      out.structures.push(ctx.kit('windturbine', { x: snap(x), z: snap(z), w: 20, d: 20, h: 72, r: 36, rot: 0, seed: rng.int(1, 1e6) }));
    }
    return out;
  },
});
void M;

import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Noise } from '../../core/noise.js';
import { quadruped } from './_quad.js';

/* A cow, 2.3 m nose to tail. The coat takes the instance tint; the first variant is a black and white dairy cow, the others are
   solid. Placed in herds by the scatter. */
const N = new Noise(0x00c0);
export default defineScenery({
  id: 'cow',
  variants: 3,
  unitCells: [0.15, 0.24, 0.4, 0.6, 0.6, 0.6, 0.6, 0.6],
  rules: { unit: true, size: 2.2, herd: 'cattle', maxDist: 340 },
  build(b, v) {
    quadruped(b, { L: 1.75, W: 0.72, H: 1.3, leg: 0.62, neck: 0.32, headL: 0.42, tail: 0.6 });
    b.box(-0.6, 0.52, -0.14, -0.3, 0.68, 0.14, M.PLASTER_TERRA, { md: 0.16 });
    if (v === 0) b.paint(-1.1, 0.4, -0.6, 1.5, 1.5, 0.6, (x, y, z) => (y > 0.5 && N.n3(x * 2.1, y * 2.1, z * 2.1) > 0.1 ? M.TIRE : 0), { md: 0.3 });
    if (v === 2) for (const s of [-1, 1]) b.box(1.02, 1.42, s * 0.2 - 0.02, 1.08, 1.52, s * 0.2 + 0.02, M.PLASTER_WHITE, { md: 0.09 });
  },
});

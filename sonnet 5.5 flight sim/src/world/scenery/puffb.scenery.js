import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Noise } from '../../core/noise.js';

/* The same crown in the light greens of birch and poplar. */
const N = [new Noise(0x7201), new Noise(0x7202), new Noise(0x7203)];

export default defineScenery({
  id: 'puffb',
  variants: 3,
  unitCells: [0.4, 0.5, 0.67, 0.75, 1, 1, 1, 1],
  rules: { unit: true, size: 1 },
  build(b, v) {
    b.ell(0, 0, 0, 1, 1, 1, M.LEAF_BIRCH);
    b.paint(-1.3, -1.3, -1.3, 1.3, 1.3, 1.3, (x, y, z) => (N[v].n3(x * 2.1 + v * 3, y * 2.1, z * 2.1) - y * 0.2 > 0.3 ? M.LEAF_OAK_L : 0));
  },
});

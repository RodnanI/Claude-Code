import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Noise } from '../../core/noise.js';

/* The crown of a broadleaf tree: a ball of radius 1 around its origin. Trees place it many times at their own sizes and the
   shader rounds it and lights it as a sphere, so a few large voxels read as a soft mass of leaves. Two greens, patched by
   noise and lighter toward the top. The variants only differ in the patches. */
const N = [new Noise(0x7101), new Noise(0x7102), new Noise(0x7103)];

export default defineScenery({
  id: 'puff',
  variants: 3,
  unitCells: [0.4, 0.5, 0.67, 0.75, 1, 1, 1, 1],
  rules: { unit: true, size: 1 },
  build(b, v) {
    b.ell(0, 0, 0, 1, 1, 1, M.LEAF_OAK);
    b.paint(-1.3, -1.3, -1.3, 1.3, 1.3, 1.3, (x, y, z) => (N[v].n3(x * 2.3 + v * 5, y * 2.3, z * 2.3) + y * 0.38 > 0.4 ? M.LEAF_OAK_L : 0));
  },
});

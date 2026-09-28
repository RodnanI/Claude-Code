import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'street-tree',
  variants: 3,
  rules: { size: 8, conservative: true },
  build(b, v, rng) {
    b.cyl('y', 0, 0, 0.22, 0.16, -0.3, 3.4, M.TRUNK);
    b.blob(0, 4.6, 0, 2.1 + v * 0.2, 2.2, 2.1 + v * 0.2, v === 1 ? M.LEAF_AUTUMN : M.LEAF_OAK, 121 + v, 0.25, M.LEAF_OAK_L, 0.4);
  },
});

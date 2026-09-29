import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Tall columnar tree for avenues and squares. */
export default defineScenery({
  id: 'poplar',
  variants: 2,
  rules: { size: 10, conservative: true },
  build(b, v) {
    b.cyl('y', 0, 0, 0.2, 0.14, -0.3, 2.6, M.TRUNK);
    b.blob(0, 6.2, 0, 1.5 + v * 0.2, 4.2, 1.5 + v * 0.2, v ? M.LEAF_OAK_L : M.LEAF_OAK, 211 + v, 0.22, M.LEAF_OAK, 0.4);
  },
});

import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'birch',
  variants: 3,
  rules: { habitat: 'forest', weight: 0.7, altMin: 30, altMax: 520, slopeMax: 0.8, size: 10, scale: 1 },
  build(b, v, rng) {
    const H = 8 + rng.range(0, 3);
    b.cyl('y', 0, 0, 0.24, 0.14, -0.5, H * 0.75, M.TRUNK_BIRCH);
    b.blob(0, H * 0.72, 0, 1.9, 2.7, 1.9, M.LEAF_BIRCH, 51 + v, 0.28, M.LEAF_OAK_L, 0.4);
    b.blob(0.6, H * 0.6, 0.4, 1.4, 1.9, 1.4, M.LEAF_BIRCH, 61 + v, 0.28, 0, 0);
  },
});

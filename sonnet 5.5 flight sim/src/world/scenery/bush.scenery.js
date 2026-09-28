import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'bush',
  variants: 3,
  rules: { habitat: 'open', weight: 1, altMax: 700, slopeMax: 0.8, size: 2.2, scale: 1 },
  build(b, v, rng) {
    b.blob(0, 0.55, 0, 1.2 + v * 0.15, 0.85, 1.1 + v * 0.2, M.BUSH, 81 + v, 0.3, M.LEAF_OAK_L, 0.3);
    if (v > 0) b.blob(0.9, 0.4, 0.5, 0.8, 0.6, 0.8, M.BUSH, 91 + v, 0.3, M.FLOWER_YELLOW, v === 2 ? 0.15 : 0);
  },
});

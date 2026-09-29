import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A figure on a stone pedestal. */
export default defineScenery({
  id: 'statue',
  variants: 1,
  rules: { fine: true, size: 4, conservative: true },
  build(b) {
    b.box(-1.3, 0, -1.3, 1.3, 0.5, 1.3, M.STONE_LIGHT);
    b.box(-0.95, 0.5, -0.95, 0.95, 2.6, 0.95, M.STONE_LIGHT);
    b.box(-0.55, 2.6, -0.4, 0.55, 2.9, 0.4, M.STONE_DARK);
    b.box(-0.3, 2.9, -0.2, 0.3, 4.3, 0.2, M.STEEL_DARK);
    b.ell(0, 4.6, 0, 0.28, 0.32, 0.28, M.STEEL_DARK);
    b.box(0.3, 3.6, -0.1, 0.9, 4.9, 0.1, M.STEEL_DARK, { md: 0.5 });
  },
});

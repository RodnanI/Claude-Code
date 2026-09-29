import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A plume of steam or smoke that leans with the wind like foliage. Placed by regions above stacks and cooling towers. */
export default defineScenery({
  id: 'steam',
  variants: 3,
  rules: { size: 34, conservative: true },
  build(b, v) {
    b.blob(0, 3, 0, 6 + v, 4.5, 6 + v, M.STEAM, 301 + v, 0.35, M.STEAM, 0.3);
    b.blob(1.8, 10, 0.6, 7.5 + v, 5.4, 7.5 + v, M.STEAM, 311 + v, 0.4, M.STEAM, 0.3);
    b.blob(-0.8, 18, -0.5, 9 + v, 6.2, 9 + v, M.STEAM, 321 + v, 0.42, M.STEAM, 0.3);
    b.blob(2.5, 27, 1.2, 10 + v, 6, 10 + v, M.STEAM, 331 + v, 0.45, M.STEAM, 0.3);
  },
});

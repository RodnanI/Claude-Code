import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Bus shelter: a glass back, a roof on four posts, a bench and a sign pole. Local +z faces the street. */
export default defineScenery({
  id: 'busstop',
  variants: 1,
  rules: { fine: true, size: 4.4, conservative: true },
  build(b) {
    for (const x of [-1.7, 1.7]) for (const z of [-0.6, 0.6]) b.box(x - 0.06, 0, z - 0.06, x + 0.06, 2.5, z + 0.06, M.STEEL_DARK);
    b.box(-1.9, 2.5, -0.8, 1.9, 2.66, 0.8, M.STEEL_DARK);
    b.box(-1.7, 0.5, -0.62, 1.7, 2.4, -0.55, M.GLASS_CLEAR, { md: 0.5 });
    b.box(-1.5, 0.42, -0.5, 1.5, 0.5, -0.05, M.WOOD_MID);
    b.box(2.3, 0, -0.05, 2.38, 2.9, 0.05, M.STEEL);
    b.box(2.05, 2.5, -0.1, 2.65, 3.1, 0.1, M.SIGN_YELLOW, { md: 0.5 });
  },
});

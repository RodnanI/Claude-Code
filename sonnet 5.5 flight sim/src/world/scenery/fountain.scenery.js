import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Plaza fountain: a stone basin, a pillar and a bowl, with a water jet. */
export default defineScenery({
  id: 'fountain',
  variants: 1,
  rules: { fine: true, size: 12, conservative: true },
  build(b) {
    b.cyl('y', 0, 0, 5.4, 5.4, 0, 0.9, M.STONE_LIGHT);
    b.cyl('y', 0, 0, 4.7, 4.7, 0.3, 1.0, 0);
    b.cyl('y', 0, 0, 4.6, 4.6, 0.3, 0.72, M.WATER_POOL);
    b.cyl('y', 0, 0, 0.8, 0.55, 0.72, 2.6, M.STONE_LIGHT);
    b.cyl('y', 0, 0, 2.1, 1.2, 2.6, 3.0, M.STONE_LIGHT);
    b.cyl('y', 0, 0, 1.7, 1.7, 2.75, 3.05, M.WATER_POOL);
    b.cyl('y', 0, 0, 0.22, 0.1, 3.0, 5.4, M.WATER_POOL, { md: 1 });
  },
});

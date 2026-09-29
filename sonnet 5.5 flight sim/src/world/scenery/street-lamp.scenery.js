import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'street-lamp',
  variants: 1,
  rules: { fine: true, size: 8, conservative: true },
  build(b) {
    b.cyl('y', 0, 0, 0.16, 0.1, 0, 7.4, M.STEEL_DARK);
    b.box(0, 7.1, -0.09, 1.7, 7.35, 0.09, M.STEEL_DARK);
    b.box(1.3, 6.95, -0.22, 2.0, 7.12, 0.22, M.LAMP_SODIUM);
  },
});

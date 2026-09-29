import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Cafe table under a parasol. The canopy takes the instance tint. */
export default defineScenery({
  id: 'parasol',
  variants: 1,
  rules: { fine: true, size: 1.4, conservative: true },
  build(b) {
    b.cyl('y', 0, 0, 0.6, 0.6, 0.7, 0.8, M.WOOD_LIGHT);
    b.cyl('y', 0, 0, 0.05, 0.05, 0, 0.7, M.STEEL_DARK);
    b.cyl('y', 0, 0, 0.05, 0.05, 0.8, 2.6, M.STEEL);
    b.cyl('y', 0, 0, 1.7, 0.1, 2.15, 2.9, M.CAR_PAINT);
    for (const a of [0, 1.57, 3.14, 4.71]) b.box(Math.cos(a) * 1.1 - 0.2, 0.3, Math.sin(a) * 1.1 - 0.2, Math.cos(a) * 1.1 + 0.2, 0.75, Math.sin(a) * 1.1 + 0.2, M.STEEL_DARK, { md: 0.4 });
  },
});

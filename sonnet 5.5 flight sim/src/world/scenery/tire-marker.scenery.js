import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/** Half-buried painted tires marking an improvised strip. */
export default defineScenery({
  id: 'tire-marker',
  variants: 2,
  rules: { fine: true, size: 1.2, conservative: true },
  build(b, v) {
    b.cyl('y', 0, 0, 0.62, 0.62, 0, 0.34, M.TIRE);
    b.cyl('y', 0, 0, 0.44, 0.44, 0.34, 0.38, v ? M.PAINT_WHITE : M.TARP_ORANGE);
    b.cyl('y', 0, 0, 0.62, 0.62, 0.34, 0.4, v ? M.PAINT_WHITE : M.PAINT_WHITE, { md: 0.25 });
  },
});

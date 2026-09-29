import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Park bench. Local +z is the front of the seat. */
export default defineScenery({
  id: 'bench',
  variants: 1,
  rules: { fine: true, size: 1.0, conservative: true },
  build(b) {
    b.box(-0.9, 0.42, -0.25, 0.9, 0.52, 0.25, M.WOOD_MID);
    b.box(-0.9, 0.52, -0.3, 0.9, 0.98, -0.2, M.WOOD_MID);
    for (const x of [-0.75, 0.75]) b.box(x - 0.05, 0, -0.28, x + 0.05, 0.42, 0.25, M.STEEL_DARK);
  },
});

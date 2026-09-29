import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Roadside billboard on two posts. The panel faces +z; two variants glow at night. */
export default defineScenery({
  id: 'billboard',
  variants: 4,
  rules: { size: 16, conservative: true },
  build(b, v) {
    const panel = [M.WINDOW_LIT_COOL, M.WINDOW_LIT, M.SIGN_RED, M.SIGN_YELLOW][v];
    for (const x of [-3.2, 3.2]) b.box(x - 0.25, 0, -0.25, x + 0.25, 8.6, 0.25, M.STEEL_DARK);
    b.box(-6.4, 8.4, -0.4, 6.4, 13.6, 0.0, M.STEEL_DARK);
    b.box(-6.0, 8.8, -0.02, 6.0, 13.2, 0.14, panel);
    b.box(-6.4, 8.0, -0.6, 6.4, 8.5, 0.2, M.STEEL_DARK, { md: 1 });
  },
});

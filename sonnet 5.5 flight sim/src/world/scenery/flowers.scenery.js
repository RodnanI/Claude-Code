import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A clump of wildflowers: stems with a blossom on top. The blossoms take the instance tint, so one model yields yellow, white,
   red, pink and orange patches. */
export default defineScenery({
  id: 'flowers',
  variants: 3,
  unitCells: [0.09, 0.14, 0.2, 0.5, 0.5, 0.5, 0.5, 0.5],
  rules: { unit: true, size: 0.6, noShadow: true, maxDist: 90 },
  build(b, v) {
    const n = 3 + v;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + v * 1.3, r = 0.03 + 0.14 * ((i * 0.7 + v * 0.29) % 1);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.42 + 0.3 * ((i * 0.53 + v * 0.17) % 1);
      b.box(x - 0.022, 0, z - 0.022, x + 0.022, h, z + 0.022, M.LEAF_PINE_L);
      b.box(x - 0.075, h, z - 0.075, x + 0.075, h + 0.06, z + 0.075, M.PETAL);
      b.box(x - 0.025, h + 0.06, z - 0.025, x + 0.025, h + 0.095, z + 0.025, M.FLOWER_YELLOW, { md: 0.06 });
    }
    b.box(-0.09, 0, -0.09, 0.09, 0.14, 0.09, M.MEADOW, { md: 0.12 });
  },
});

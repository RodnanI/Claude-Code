import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A clump of wildflowers: short stems with a round blossom on top, low in the grass. The blossoms take the instance tint, so one
   model yields yellow, white, red, pink and orange patches. A tall stem under a flat cap reads as a little cross from the air, so
   the stems are short and the heads are domes. */
export default defineScenery({
  id: 'flowers',
  variants: 3,
  unitCells: [0.09, 0.14, 0.2, 0.5, 0.5, 0.5, 0.5, 0.5],
  rules: { unit: true, size: 0.6, noShadow: true, maxDist: 90 },
  build(b, v) {
    const n = 4 + v;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + v * 1.3, r = 0.03 + 0.15 * ((i * 0.7 + v * 0.29) % 1);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.16 + 0.2 * ((i * 0.53 + v * 0.17) % 1);
      b.box(x - 0.02, 0, z - 0.02, x + 0.02, h, z + 0.02, M.LEAF_PINE_L);
      b.ell(x, h + 0.02, z, 0.09, 0.06, 0.09, M.PETAL);
      b.ell(x, h + 0.06, z, 0.035, 0.024, 0.035, M.FLOWER_YELLOW, { md: 0.06 });
    }
    b.box(-0.11, 0, -0.11, 0.11, 0.13, 0.11, M.MEADOW, { md: 0.12 });
  },
});

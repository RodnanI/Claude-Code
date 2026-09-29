import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A tapered post of height 1 that trees stretch to their own height, with a fork near the top when the voxels are small enough.
   Color banks make it brown, birch white, dark or weathered. */
export default defineScenery({
  id: 'trunk',
  variants: 1,
  unitCells: [0.04, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08],
  rules: { unit: true, size: 1 },
  build(b) {
    b.cyl('y', 0, 0, 0.07, 0.04, -0.12, 1, M.TRUNK);
    b.cyl('y', 0.035, 0.01, 0.026, 0.016, 0.7, 1, M.TRUNK, { md: 0.06 });
    b.cyl('y', -0.03, -0.02, 0.022, 0.014, 0.76, 1, M.TRUNK, { md: 0.06 });
  },
});

import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Lily pads floating on still water, one with a blossom. */
export default defineScenery({
  id: 'lily',
  variants: 2,
  unitCells: [0.08, 0.14, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5],
  rules: { unit: true, size: 1, noShadow: true, maxDist: 110 },
  build(b, v) {
    b.cyl('y', 0, 0, 0.42, 0.4, 0, 0.05, M.LEAF_PINE_L);
    b.cyl('y', 0.62, 0.3, 0.32, 0.3, 0, 0.05, M.LEAF_PINE_L, { md: 0.15 });
    b.cyl('y', -0.5, -0.4, 0.26, 0.24, 0, 0.05, M.LEAF_PINE_L, { md: 0.15 });
    if (v === 1) b.cyl('y', 0.05, 0.02, 0.13, 0.04, 0.05, 0.16, M.PETAL, { md: 0.09 });
  },
});

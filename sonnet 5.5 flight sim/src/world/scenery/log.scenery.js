import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A fallen log or a piece of driftwood, lying along its local x axis. Length 1 at scale 1. */
export default defineScenery({
  id: 'log',
  variants: 2,
  unitCells: [0.06, 0.09, 0.16, 0.3, 0.3, 0.3, 0.3, 0.3],
  rules: { unit: true, size: 1, noShadow: true, maxDist: 150 },
  build(b, v) {
    b.cyl('x', 0.1, 0, 0.1, 0.085, -0.5, 0.5, M.TRUNK);
    if (v === 1) b.cyl('x', 0.2, 0.04, 0.05, 0.03, 0.3, 0.7, M.TRUNK, { md: 0.06 });
    b.cyl('y', 0.32, 0.03, 0.03, 0.02, 0.1, 0.32, M.TRUNK, { md: 0.06 });
  },
});

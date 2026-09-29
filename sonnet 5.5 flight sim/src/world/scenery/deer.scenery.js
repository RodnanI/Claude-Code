import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { quadruped } from './_quad.js';

/* A deer at the edge of the trees, 1.7 m long. A stag in the second variant carries antlers. */
export default defineScenery({
  id: 'deer',
  variants: 2,
  unitCells: [0.12, 0.2, 0.32, 0.5, 0.5, 0.5, 0.5, 0.5],
  rules: { unit: true, size: 1.8, herd: 'deer', maxDist: 300 },
  build(b, v) {
    quadruped(b, { L: 1.3, W: 0.42, H: 1.0, leg: 0.6, neck: 0.36, headL: 0.34, tail: 0.14, snout: M.TIRE, tailMat: M.PLASTER_WHITE });
    b.box(-0.68, 0.7, -0.14, -0.55, 0.98, 0.14, M.PLASTER_WHITE, { md: 0.09 });
    if (v === 1) for (const s of [-1, 1]) {
      b.box(0.8, 1.42, s * 0.1 - 0.02, 0.86, 1.72, s * 0.1 + 0.02, M.WOOD_LIGHT, { md: 0.06 });
      b.box(0.78, 1.66, s * 0.16 - 0.02, 0.9, 1.72, s * 0.22 + 0.02, M.WOOD_LIGHT, { md: 0.06 });
    }
  },
});

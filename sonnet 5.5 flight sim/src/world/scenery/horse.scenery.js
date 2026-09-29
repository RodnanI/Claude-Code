import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { quadruped } from './_quad.js';

/* A horse, about 2.4 m long and 1.6 m at the withers. The coat is the instance tint; a dark mane and tail. */
export default defineScenery({
  id: 'horse',
  variants: 2,
  unitCells: [0.16, 0.26, 0.4, 0.6, 0.6, 0.6, 0.6, 0.6],
  rules: { unit: true, size: 2.4, herd: 'horse', maxDist: 340 },
  build(b, v) {
    quadruped(b, { L: 1.85, W: 0.62, H: 1.5, leg: 0.86, neck: 0.55, headL: 0.5, tail: 0.78, snout: 0, tailMat: M.TIRE });
    b.box(0.86, 1.55, -0.04, 1.14, 2.0, 0.04, M.TIRE, { md: 0.12 });
    if (v === 1) b.box(1.3, 1.5, -0.1, 1.62, 1.72, 0.1, M.PLASTER_WHITE, { md: 0.12 });
  },
});

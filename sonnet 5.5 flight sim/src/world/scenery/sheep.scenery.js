import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A sheep under a heavy fleece, 1.1 m long. Placed in flocks by the scatter. */
export default defineScenery({
  id: 'sheep',
  variants: 2,
  unitCells: [0.11, 0.18, 0.3, 0.5, 0.5, 0.5, 0.5, 0.5],
  rules: { unit: true, size: 1.2, herd: 'sheep', noShadow: true, maxDist: 260 },
  build(b, v) {
    b.ell(0, 0.5, 0, 0.56, 0.34, 0.33, M.PLASTER_WHITE);
    b.ell(-0.18, 0.62, 0.05, 0.3, 0.26, 0.28, M.PLASTER_WHITE, { md: 0.14 });
    b.ell(0.22, 0.6, -0.04, 0.3, 0.26, 0.26, M.PLASTER_WHITE, { md: 0.14 });
    b.box(0.5, 0.5, -0.1, 0.8, 0.82, 0.1, v ? M.BRICK_DARK : M.TIRE);
    for (const s of [-1, 1]) b.box(0.54, 0.74, s * 0.11 - 0.04, 0.68, 0.84, s * 0.11 + 0.04, v ? M.BRICK_DARK : M.TIRE, { md: 0.07 });
    for (const px of [-0.3, 0.32]) for (const s of [-1, 1]) b.box(px - 0.04, 0, s * 0.15 - 0.04, px + 0.04, 0.34, s * 0.15 + 0.04, M.TIRE);
  },
});

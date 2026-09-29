import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* A boulder of radius 1 around its origin, lumpy along one side. The shader rounds it a little and lights it as a stone. Rocks
   place several at different sizes; color banks make them gray, warm, dark or pale. */
export default defineScenery({
  id: 'boulder',
  variants: 3,
  unitCells: [0.4, 0.5, 0.67, 1, 1, 1, 1, 1],
  rules: { unit: true, size: 1, maxDist: 300 },
  build(b, v) {
    b.blob(0, 0, 0, 1, 0.82, 0.94, M.BOULDER, 401 + v * 13, 0.26);
    if (v === 1) b.blob(0.7, -0.15, 0.3, 0.55, 0.5, 0.5, M.BOULDER, 431, 0.2);
  },
});

import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Noise } from '../../core/noise.js';

/* One tier of a conifer: a cone of radius 1 at the base and 1.2 tall, its origin near the middle so the shader can light it as
   a rounded shape. Trees stack several, shrinking toward the tip. */
const N = [new Noise(0x7301), new Noise(0x7302), new Noise(0x7303)];

export default defineScenery({
  id: 'cone',
  variants: 3,
  unitCells: [0.34, 0.45, 0.6, 0.75, 1, 1, 1, 1],
  rules: { unit: true, size: 1 },
  build(b, v) {
    b.cyl('y', 0, 0, 1, 0, -0.45, 0.75, M.LEAF_PINE);
    b.paint(-1.3, -0.6, -1.3, 1.3, 0.9, 1.3, (x, y, z) => (N[v].n3(x * 2.6 + v * 4, y * 2.6, z * 2.6) + y * 0.3 > 0.22 ? M.LEAF_PINE_L : 0));
  },
});

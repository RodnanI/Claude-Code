import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'oak',
  variants: 4,
  rules: { habitat: 'forest', weight: 1.3, altMax: 420, slopeMax: 0.9, size: 11, scale: 1 },
  build(b, v, rng) {
    const th = 3.6 + rng.range(0, 1.6);
    b.cyl('y', 0, 0, 0.5, 0.32, -0.6, th + 1.6, M.TRUNK);
    const crown = 3.4 + rng.range(0, 1.0);
    b.blob(0, th + crown * 0.55, 0, crown, crown * 0.8, crown, M.LEAF_OAK, 11 + v, 0.3, M.LEAF_OAK_L, 0.4);
    const n = 3 + (v & 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rng.range(0, 1), d = crown * 0.55;
      b.blob(Math.cos(a) * d, th + crown * (0.4 + rng.range(0, 0.4)), Math.sin(a) * d, crown * 0.62, crown * 0.55, crown * 0.62, M.LEAF_OAK, 31 + v * 3 + i, 0.3, M.LEAF_OAK_L, 0.4);
    }
    b.cyl('x', th * 0.6, 0, 0.16, 0.1, 0.3, 1.6, M.TRUNK, { md: 1 });
  },
});

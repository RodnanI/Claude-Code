import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'pine',
  variants: 4,
  rules: { habitat: 'forest', weight: 1.0, altMin: 120, altMax: 800, slopeMax: 1.1, size: 13, scale: 1 },
  build(b, v, rng) {
    const H = 10 + v * 1.6 + rng.range(0, 2.5);
    b.cyl('y', 0, 0, 0.34, 0.16, -0.6, H * 0.85, M.TRUNK);
    const layers = 6 + (v & 1);
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const y0 = H * 0.2 + t * H * 0.66;
      const r = (3.1 - 2.5 * t) * (0.9 + rng.range(0, 0.25));
      b.cyl('y', 0, 0, r, r * 0.22, y0, y0 + H * 0.2, i % 2 ? M.LEAF_PINE : M.LEAF_PINE_L);
    }
    b.cyl('y', 0, 0, 0.55, 0, H * 0.88, H + 0.7, M.LEAF_PINE_L);
  },
});

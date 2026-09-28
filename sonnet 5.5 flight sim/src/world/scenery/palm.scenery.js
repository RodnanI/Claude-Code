import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'palm',
  variants: 3,
  rules: { habitat: 'beach', weight: 1, altMax: 8, slopeMax: 0.5, size: 9, scale: 1 },
  build(b, v, rng) {
    const segs = 8 + v;
    const lean = rng.range(0.15, 0.32) * (v % 2 ? 1 : -1);
    let x = 0;
    for (let i = 0; i < segs; i++) {
      const nx = x + lean * (1 + i * 0.12);
      b.box(Math.min(x, nx) - 0.22, i * 1.0 - (i === 0 ? 0.6 : 0), -0.22, Math.max(x, nx) + 0.22, i + 1.08, 0.22, M.TRUNK);
      x = nx;
    }
    const top = segs;
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.283 + v;
      const dx = Math.cos(a), dz = Math.sin(a);
      for (let s = 0; s < 5; s++) {
        const px = x + dx * (0.5 + s * 0.85), pz = dz * (0.5 + s * 0.85), py = top + 0.6 - s * s * 0.14;
        b.box(px - 0.3, py - 0.14, pz - 0.3, px + 0.3, py + 0.14, pz + 0.3, M.LEAF_PALM);
      }
    }
    b.box(x - 0.3, top - 0.4, -0.3, x + 0.3, top + 0.3, 0.3, M.WOOD_DARK);
  },
});

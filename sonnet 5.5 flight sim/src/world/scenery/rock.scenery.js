import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

export default defineScenery({
  id: 'rock',
  variants: 4,
  rules: { habitat: 'rock', weight: 1, slopeMax: 9, size: 4, scale: 1 },
  build(b, v, rng) {
    const r = [1.1, 1.8, 2.8, 4.2][v];
    b.blob(0, r * 0.45, 0, r, r * 0.62, r * 0.9, v & 1 ? M.ROCK_DARK : M.ROCK, 101 + v, 0.34, M.ROCK_WARM, 0.25);
    if (v > 1) b.blob(r * 0.8, r * 0.25, r * 0.4, r * 0.55, r * 0.4, r * 0.5, M.ROCK, 111 + v, 0.3, 0, 0);
  },
});

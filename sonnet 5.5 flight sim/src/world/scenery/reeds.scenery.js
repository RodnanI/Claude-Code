import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Reeds and a few cattails, for the edges of lakes and rivers. Height 1 is the middle of the clump. */
export default defineScenery({
  id: 'reeds',
  variants: 2,
  unitCells: [0.09, 0.14, 0.22, 0.4, 0.4, 0.4, 0.4, 0.4],
  rules: { unit: true, size: 1, noShadow: true, maxDist: 170 },
  build(b, v) {
    const n = 8 + v * 3;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + v, r = 0.05 + 0.17 * ((i * 0.618 + v * 0.4) % 1);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.75 + 0.5 * ((i * 0.41 + v * 0.13) % 1);
      b.box(x - 0.03, 0, z - 0.03, x + 0.03, h, z + 0.03, i % 4 === 0 ? M.GRASS_DRY : M.LEAF_BIRCH);
      if (i % 5 === 1) b.box(x - 0.045, h - 0.28, z - 0.045, x + 0.045, h + 0.02, z + 0.045, M.TRUNK, { md: 0.1 });
    }
  },
});

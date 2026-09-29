import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/** Runway and taxiway lights. Variants: 0 white edge, 1 green threshold or taxiway centerline, 2 red end, 3 amber caution zone, 4 blue taxiway edge. Always emissive. */
export default defineScenery({
  id: 'runway-light',
  variants: 5,
  rules: { fine: true, size: 1.2, conservative: true },
  build(b, v) {
    const lamp = [M.RWY_LIGHT_WHITE, M.RWY_LIGHT_GREEN, M.RWY_LIGHT_RED, M.RWY_LIGHT_AMBER, M.RWY_LIGHT_BLUE][v];
    b.box(-0.18, 0, -0.18, 0.18, 0.28, 0.18, M.STEEL_DARK);
    b.box(-0.22, 0.28, -0.22, 0.22, 0.6, 0.22, lamp);
  },
});

import { Noise } from '../../core/noise.js';
import { clamp } from '../../core/util.js';
import { LAND_BLOBS, BAYS } from '../layout.js';

const smax = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

/** Land mask: positive on land, negative at sea, about 1 at blob centers. */
export function createIsland(seed, macro = null) {
  const n1 = new Noise(seed ^ 0x101), n2 = new Noise(seed ^ 0x202);
  return {
    mask(x, z, cell = 0) {
      if (macro && macro.enabled && cell < macro.maxCell) return macro.at(x, z).mask;
      let m = -1;
      // Domain warp turns geometric blobs and circular bays into organic coastline.
      const wx = x + 2300 * n1.fbm2(x / 6500 + 11, z / 6500, 3) + 450 * n2.fbm2(x / 1700, z / 1700 + 4, 2);
      const wz = z + 2300 * n2.fbm2(x / 6500 - 5, z / 6500 + 3, 3) + 450 * n1.fbm2(x / 1700 + 9, z / 1700, 2);
      for (const b of LAND_BLOBS) {
        const dx = (wx - b.x) / b.rx, dz = (wz - b.z) / b.rz;
        m = smax(m, 1 - Math.sqrt(dx * dx + dz * dz), 0.35);
      }
      for (const b of BAYS) {
        const dx = (wx - b.x) / b.rx, dz = (wz - b.z) / b.rz;
        m -= clamp(1 - Math.sqrt(dx * dx + dz * dz), 0, 1) * 1.3;
      }
      m += 0.15 * n1.fbm2(x / 9000, z / 9000, 4) + 0.06 * n2.fbm2(x / 2600, z / 2600, 3);
      if (cell < 250) m += 0.018 * n2.fbm2(x / 650 + 4.2, z / 650 - 1.1, 2);
      return m;
    },
  };
}

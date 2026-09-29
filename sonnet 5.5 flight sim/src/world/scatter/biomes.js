import { Noise } from '../../core/noise.js';
import { smoothstep, saturate } from '../../core/util.js';
import { SITES } from '../layout.js';
import { hash2, hashUnit } from '../../core/util.js';

/** The patchwork of fields: a grid of FIELD_W by FIELD_D meter fields whose corner sits at (-FIELD_OX, -FIELD_OZ). */
export const FIELD_W = 210, FIELD_D = 160, FIELD_OX = 7000, FIELD_OZ = 5000;

/** Large-scale ecology fields shared by surface painting and scenery scatter. */
export function createBiomes(seed, macro = null) {
  const nF = new Noise(seed ^ 0x707), nFarm = new Noise(seed ^ 0x808), nG = new Noise(seed ^ 0x909);
  const farmSites = [SITES.cutbank, SITES.saltmarsh, SITES.dunmore, SITES.portHalden].map((s) => ({ x: s.x, z: s.z }));

  return {
    /** 0..1 farmland weight. Patchwork fields around towns. */
    farmland(x, z, h, m) {
      if (h > 260 || m < 0.09) return 0;
      let near = 0;
      for (const s of farmSites) {
        const d = Math.hypot(x - s.x, z - s.z);
        near = Math.max(near, 1 - smoothstep(1100, 3600, d));
      }
      const patch = macro && macro.enabled ? macro.at(x, z).farmP : 0.5 + 0.5 * nFarm.fbm2(x / 1300 + 5, z / 1300, 3);
      return saturate((near * 1.15 - 0.15) * smoothstep(0.3, 0.55, patch));
    },
    /** 0..1 tree density. Zero above the tree line and on beaches. */
    forest(x, z, h, m, farm = 0) {
      if (m < 0.05) return 0;
      const treeline = 780 - Math.max(0, 0) - 0;
      if (h > treeline) return 0;
      const p = macro && macro.enabled ? macro.at(x, z).forestP : 0.5 + 0.5 * nF.fbm2(x / 1700 - 2, z / 1700 + 9, 4);
      const alt = 1 - smoothstep(560, treeline, h);
      const coast = smoothstep(0.05, 0.16, m);
      const up = 0.55 + 0.45 * smoothstep(0.1, 0.6, m);
      return saturate(smoothstep(0.42, 0.62, p) * alt * coast * up * (1 - farm));
    },
    /** The field a point lies in: grid index, position inside it, a random 0..1 that picks its crop, and the direction of its rows. */
    fieldAt(x, z, out = {}) {
      const gx = Math.floor((x + FIELD_OX) / FIELD_W), gz = Math.floor((z + FIELD_OZ) / FIELD_D);
      out.gx = gx; out.gz = gz;
      out.r = hashUnit(hash2(gx, gz, seed));
      out.lx = x + FIELD_OX - gx * FIELD_W; out.lz = z + FIELD_OZ - gz * FIELD_D;
      out.dir = hash2(gx, gz, seed + 9) & 1;
      return out;
    },
    moisture(x, z) { return macro && macro.enabled ? macro.at(x, z).moist : 0.5 + 0.5 * nG.fbm2(x / 2200 + 3, z / 2200 - 8, 3); },
    patch(x, z, scale) { return nG.n2(x / scale, z / scale); },
  };
}

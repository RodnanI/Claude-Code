import { SITES } from '../../../layout.js';
import { makeLattice } from '../../_shared/lattice.js';

/** Shared street lattice for every Meridian district file. Block (0, 0) is centered on the metropolis anchor. */
export const S = SITES.meridian;
export const LAT = makeLattice({ cx: S.x, cz: S.z, block: 110, street: 22 });
export const ELEV = S.elev;

/** World rectangle covering blocks i0..i1 by j0..j1 including the surrounding street corridor. */
export const rectFor = (i0, i1, j0, j1) => [LAT.lineX(i0 - 0.5) - 12, LAT.lineZ(j0 - 0.5) - 12, LAT.lineX(i1 + 0.5) + 12, LAT.lineZ(j1 + 0.5) + 12];

/** Height profile: tallest at the downtown core, falling off with block distance. */
export function coreHeight(ci, cj, reach, hmin, hmax, bias = 1.25) {
  return (rng, r) => {
    const t = Math.max(0, 1 - Math.hypot(r.i - ci, (r.j - cj) * 1.05) / reach);
    return hmin + (hmax - hmin) * Math.pow(t, bias) * rng.range(0.62, 1.0);
  };
}

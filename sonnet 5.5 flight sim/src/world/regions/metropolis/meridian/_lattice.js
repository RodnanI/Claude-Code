import { SITES } from '../../../layout.js';
import { makeLattice } from '../../_shared/lattice.js';
import { skyline } from '../../_shared/urban.js';

/** Shared street lattice for every Meridian district file. Block (0, 0) is centered on the metropolis anchor. */
export const S = SITES.meridian;
export const LAT = makeLattice({ cx: S.x, cz: S.z, block: 110, street: 22 });
export const ELEV = S.elev;

/** World rectangle covering blocks i0..i1 by j0..j1 including the surrounding street corridor. */
export const rectFor = (i0, i1, j0, j1) => [LAT.lineX(i0 - 0.5) - 12, LAT.lineZ(j0 - 0.5) - 12, LAT.lineX(i1 + 0.5) + 12, LAT.lineZ(j1 + 0.5) + 12];

/** Height profile: tallest at the downtown core, a second peak in the financial district and a lower one in midtown. */
export const SKY = skyline([
  { i: 0.5, j: -4, reach: 7.4, amp: 1, sy: 1.1 },
  { i: -6.5, j: -4, reach: 5.2, amp: 0.82 },
  { i: 6.5, j: -3.5, reach: 6, amp: 0.64 },
], 60, 500, { bias: 1.0, noise: 0.34, spike: 0.08 });

/** Older name kept for callers that want a single-core falloff. */
export function coreHeight(ci, cj, reach, hmin, hmax, bias = 1.25) {
  return skyline([{ i: ci, j: cj, reach }], hmin, hmax, { bias, noise: 0.38, spike: 0 });
}

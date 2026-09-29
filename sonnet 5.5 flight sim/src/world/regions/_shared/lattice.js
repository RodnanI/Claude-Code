/* A street lattice: blocks indexed (i, j) with block centers at (cx + i * px, cz + j * pz). Streets run on the half
   indices. Every district of a city builds on the same lattice, so roads meet across region files with matching
   endpoints and the traffic network can connect them. */

export function makeLattice({ cx, cz, block = 110, street = 22 }) {
  const px = block + street, pz = block + street;
  return {
    cx, cz, block, street, px, pz,
    /** World coordinates of the street line between blocks a and a+1 (use a + 0.5 style indices). */
    lineX: (a) => cx + a * px,
    lineZ: (b) => cz + b * pz,
    blockCenter: (i, j) => [cx + i * px, cz + j * pz],
    /** Interior land rectangle of block (i, j), excluding half the street corridor on every side. */
    blockRect(i, j) {
      const x0 = cx + (i - 0.5) * px + street / 2, x1 = cx + (i + 0.5) * px - street / 2;
      const z0 = cz + (j - 0.5) * pz + street / 2, z1 = cz + (j + 0.5) * pz - street / 2;
      return { x0, z0, x1, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, i, j };
    },
  };
}

/**
 * Road segments bounding blocks i0..i1 by j0..j1. Every street is split at each intersection so segment endpoints
 * coincide. kindFor(axis, index) returns the road kind for a line ('x' vertical line index a, 'z' horizontal line index b).
 */
export function latticeRoads(lat, i0, i1, j0, j1, kindFor) {
  const roads = [];
  const xs = [], zs = [];
  for (let a = i0 - 0.5; a <= i1 + 0.5 + 1e-6; a += 1) xs.push(a);
  for (let b = j0 - 0.5; b <= j1 + 0.5 + 1e-6; b += 1) zs.push(b);
  for (const a of xs) {
    const kind = kindFor('x', a);
    if (!kind) continue;
    for (let k = 0; k < zs.length - 1; k++) roads.push({ ax: lat.lineX(a), az: lat.lineZ(zs[k]), bx: lat.lineX(a), bz: lat.lineZ(zs[k + 1]), kind });
  }
  for (const b of zs) {
    const kind = kindFor('z', b);
    if (!kind) continue;
    for (let k = 0; k < xs.length - 1; k++) roads.push({ ax: lat.lineX(xs[k]), az: lat.lineZ(b), bx: lat.lineX(xs[k + 1]), bz: lat.lineZ(b), kind });
  }
  return roads;
}

/** Default street classification: an avenue every n-th line, streets otherwise. */
export const avenueEvery = (n, offset = 0) => (axis, idx) => (Math.round(idx * 2) % (n * 2) === ((offset * 2) % (n * 2) + n * 2) % (n * 2) ? 'avenue' : 'street');

import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';
import { snapY, clearOfHighways } from '../_shared/urban.js';

/* Ironford: inland industrial city. Factories with chimneys, tanks and sheds around a dense brick center, rows of
   workers' houses, cooling towers by the works and a rail yard on the east side. */
export default settlement({
  key: 'ironford', kind: 'city', pad: 60, block: 100, street: 20, i: [-8, 8], j: [-6, 6], maxHeight: 130, tint: M.URBAN_INDUSTRIAL, blend: 300, elev: 46.8,
  style: {
    types: { industrial: 4, midrise: 2, oldtown: 2, lowrise: 1, houses: 2.5, park: 0.4, parking: 0.4, apartments: 0.6 },
    mid: [18, 46], low: [8, 16], apt: [12, 26],
    midFac: [['FAC_BRICK_BROWN', 3], ['FAC_BRICK_RED', 2.4], ['FAC_BRICK_DARK', 1.6], ['FAC_GRID_CONCRETE', 1]],
    lowrise: { fac: 'FAC_BRICK_DARK' },
    house: { fac: 'FAC_BRICK_RED' },
  },
  blockFor(r, rng) {
    const d = Math.hypot(r.i, r.j);
    if (d < 1.5) return rng.weighted([['midrise', 4], ['oldtown', 3], ['plaza', 1]]);
    if (r.i >= 3 && r.i <= 7 && Math.abs(r.j) <= 2) return 'industrial';
    if (Math.abs(r.i) >= 6 || Math.abs(r.j) >= 5) return rng.weighted([['houses', 6], ['park', 0.5], ['apartments', 0.6]]);
    return rng.weighted([['industrial', 3], ['midrise', 2], ['oldtown', 1.6], ['houses', 2], ['parking', 0.4]]);
  },
  extras(ctx, { out, lat }) {
    // rail yard: ballast bed with parallel rails
    const x0 = lat.lineX(8.6), x1 = lat.lineX(11), z0 = lat.lineZ(-5), z1 = lat.lineZ(5);
    out.lots.push({ x0, z0, x1, z1, mat: M.RAIL_BALLAST, over: true });
    for (let k = 0; k < 6; k++) {
      const xx = x0 + 12 + k * 10;
      out.lots.push({ x0: xx, z0, x1: xx + 0.9, z1, mat: M.RAIL, over: true });
      out.lots.push({ x0: xx + 1.5, z0, x1: xx + 2.4, z1, mat: M.RAIL, over: true });
    }
    out.roads.push({ ax: lat.lineX(8.5), az: z0, bx: lat.lineX(8.5), bz: z1, kind: 'road' });
    // the works: factories with chimneys, a power station with cooling towers, water towers
    for (let i = 0; i < 3; i++) put(ctx, out, 'factory', lat.lineX(-3 + i * 3), lat.lineZ(-5.9), 60, 36, 16, 0, 900 + i);
    for (let i = 0; i < 4; i++) put(ctx, out, 'watertower', lat.lineX(6 + i), lat.lineZ(5.7), 12, 12, 30, 0, 950 + i);
    // the power station takes the first spot on the west side that no highway crosses
    const spot = [[-6.2, 3.9], [-6.2, -3.4], [-7.2, 0.4], [6.4, 4.6], [6.4, -4.6], [0.4, 6.4]].map(([i, j]) => [lat.lineX(i), lat.lineZ(j)]).find(([x, z]) => clearOfHighways(ctx, x, z, 75));
    if (spot) {
      const [px, pz] = spot, gy = snapY(ctx.heightAt(px, pz));
      put(ctx, out, 'powerplant', px, pz, 110, 80, 60, 0, 977);
      for (const [ox, oz, oy, sc] of [[-33, -12, 62, 1], [-33, 24, 62, 1], [43, -45.6, 98, 0.7]]) out.props.push({ type: 'steam', x: px + ox, z: pz + oz, y: gy + oy, yaw: 0, scale: sc, variant: (ox + oz) & 1 });
    }
  },
});

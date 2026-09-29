import { M } from '../../../voxel/palette.js';
import { settlement, put } from '../_shared/settlement.js';

/* Ironford: inland industrial city. Factories with chimneys, tanks and sheds around a dense brick center, with
   rows of workers' houses and a rail yard on the east side. */
export default settlement({
  key: 'ironford', kind: 'city', block: 100, street: 20, i: [-8, 8], j: [-6, 6], maxHeight: 90, tint: M.URBAN_INDUSTRIAL, blend: 300,
  style: {
    types: { industrial: 4, midrise: 2, lowrise: 2, houses: 2.5, park: 0.4, parking: 0.4 },
    mid: [14, 38], low: [6, 12],
    midrise: { wall: M.BRICK_BROWN, trim: M.STONE_LIGHT }, lowrise: { wall: M.BRICK_DARK },
    house: { wall: M.BRICK_RED },
  },
  blockFor(r, rng) {
    const d = Math.hypot(r.i, r.j);
    if (d < 1.5) return rng.weighted([['midrise', 4], ['lowrise', 2], ['plaza', 1]]);
    if (r.i >= 3 && r.i <= 7 && Math.abs(r.j) <= 2) return 'industrial';
    if (Math.abs(r.i) >= 6 || Math.abs(r.j) >= 5) return rng.weighted([['houses', 6], ['park', 0.5]]);
    return rng.weighted([['industrial', 3], ['midrise', 2], ['lowrise', 2], ['houses', 2], ['parking', 0.4]]);
  },
  extras(ctx, { out, lat, rng }) {
    // rail yard: ballast bed with parallel rails
    const x0 = lat.lineX(8.6), x1 = lat.lineX(11), z0 = lat.lineZ(-5), z1 = lat.lineZ(5);
    out.lots.push({ x0, z0, x1, z1, mat: M.RAIL_BALLAST, over: true });
    for (let k = 0; k < 6; k++) {
      const xx = x0 + 12 + k * 10;
      out.lots.push({ x0: xx, z0, x1: xx + 0.9, z1, mat: M.RAIL, over: true });
      out.lots.push({ x0: xx + 1.5, z0, x1: xx + 2.4, z1, mat: M.RAIL, over: true });
    }
    out.roads.push({ ax: lat.lineX(8.5), az: z0, bx: lat.lineX(8.5), bz: z1, kind: 'road' });
    // a great tall chimney field
    for (let i = 0; i < 3; i++) put(ctx, out, 'factory', lat.lineX(-3 + i * 3), lat.lineZ(-5.9), 60, 36, 16, 0, 900 + i);
    for (let i = 0; i < 4; i++) put(ctx, out, 'watertower', lat.lineX(6 + i), lat.lineZ(5.7), 12, 12, 30, 0, 950 + i);
    void rng;
  },
});

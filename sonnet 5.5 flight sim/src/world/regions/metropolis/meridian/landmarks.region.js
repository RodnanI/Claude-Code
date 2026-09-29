import { defineRegion } from '../../../region.js';
import { M } from '../../../../voxel/palette.js';
import { LAT, rectFor } from './_lattice.js';
import { latticeRoads } from '../../_shared/lattice.js';
import { newOut, snap, roadProps, fillBlocks } from '../../_shared/zoning.js';

/** Hero structures and civic blocks: stadium, cathedral, museum, station, hospital, central park. */
const I0 = 5, I1 = 14, J0 = 0, J1 = 4;
const CIVIC = { '7,2': 'museum', '10,1': 'station', '12,3': 'hospital', '13,1': 'school' };

export default defineRegion({
  id: 'metropolis/meridian/landmarks',
  name: 'Meridian Landmarks',
  kind: 'metropolis-district',
  bounds: rectFor(I0, I1, J0, J1),
  maxHeight: 90,
  tint: M.URBAN_GREEN,
  layout(ctx) {
    const rng = ctx.rng('layout');
    const out = newOut();
    out.roads = latticeRoads(LAT, I0, I1, J0, J1, (axis, idx) => (Math.round(idx * 2) % 6 === 1 ? 'avenue' : 'street'));
    // stadium fills a 2x2 block area
    const a = LAT.blockRect(8, 2), b = LAT.blockRect(9, 3);
    const sx0 = a.x0, sz0 = a.z0, sx1 = b.x1, sz1 = b.z1;
    const cx = (sx0 + sx1) / 2, cz = (sz0 + sz1) / 2, R = Math.min(sx1 - sx0, sz1 - sz0) / 2 - 8;
    out.structures.push(ctx.kit('stadium', { x: snap(cx), z: snap(cz), w: R * 2, d: R * 2, h: 24, r: R, rot: 0, seed: 4 }));
    out.lots.push({ x0: sx0 - 6, z0: sz0 - 6, x1: sx1 + 6, z1: sz1 + 6, mat: M.CONCRETE });
    out.lots.push({ x0: cx - R * 0.5, z0: cz - R * 0.5, x1: cx + R * 0.5, z1: cz + R * 0.5, mat: 0, fn: (x, z, cell) => {
      const p = Math.hypot(x - cx, z - cz);
      if (p > R * 0.5) return 0;
      if (cell <= 1.5 && (Math.abs(Math.round((x - cx) / 4.6) * 4.6 - (x - cx)) < 0.2 || Math.abs(Math.round((z - cz) / 4.6) * 4.6 - (z - cz)) < 0.2) && Math.abs(x - cx) < R * 0.36 && Math.abs(z - cz) < R * 0.27) return M.PARKING_LINE;
      return (Math.floor((x - cx) / 5) & 1) ? M.MOWN_STRIP : M.LAWN;
    } });
    // cathedral and green on the neighbouring block
    const c = LAT.blockRect(6, 1);
    out.structures.push(ctx.kit('church', { x: snap(c.cx), z: snap(c.cz), w: 12, d: 30, h: 34, rot: 0, seed: 9 }));
    out.lots.push({ x0: c.x0 - 4, z0: c.z0 - 4, x1: c.x1 + 4, z1: c.z1 + 4, mat: M.LAWN });
    for (let i = 0; i < 26; i++) out.props.push({ type: 'oak', x: rng.range(c.x0 + 4, c.x1 - 4), z: rng.range(c.z0 + 4, c.z1 - 4), yaw: rng.range(0, 6.28), scale: rng.range(0.7, 1.1), variant: rng.int(0, 3) });
    const blocks = [];
    for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) blocks.push(LAT.blockRect(i, j));
    const style = {
      types: { midrise: 3, oldtown: 1.2, park: 1.4, apartments: 1, parking: 0.5, civic: 0.5 }, mid: [24, 60], low: [10, 20], apt: [16, 38],
      civicKind: (rng, r) => CIVIC[`${r.i},${r.j}`] || 'school',
    };
    const taken = (r) => ((r.i === 8 || r.i === 9) && (r.j === 2 || r.j === 3)) || (r.i === 6 && r.j === 1);
    fillBlocks(ctx, rng, blocks, style, out, (r, g) => (taken(r) ? 'skip' : CIVIC[`${r.i},${r.j}`] ? 'civic' : g.weighted(Object.entries(style.types))));
    roadProps(rng, out.roads, out);
    return out;
  },
});

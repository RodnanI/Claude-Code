import { M } from '../../../voxel/palette.js';
import { ROAD_KINDS } from '../../roads/network.js';
import { subdivide, faceOf, footprint, snapY, ROT } from './urban.js';

/* Block fillers. Each takes a block rectangle r = { x0, z0, x1, z1, w, d, cx, cz, i, j } and appends kit descriptors,
   props and paint lots to `out`. Descriptor sizes are LOCAL (w along the street frontage). Rotations are quarter turns:
   rot 0 faces +z (south), 2 faces -z (north), 1 faces -x (west), 3 faces +x (east). Blocks are cut into lots (urban.js),
   every lot faces a street, and structure heights are snapped to the 3.6 m floor grid so window rows meet the ground. */

export const snap = (v) => Math.round(v * 2) / 2;

export function newOut() { return { structures: [], props: [], lots: [], roads: [] }; }

export function landOK(ctx, r, min = 1.6) {
  const pts = [[r.cx, r.cz], [r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]];
  for (const p of pts) if (ctx.heightAt(p[0], p[1]) < min) return false;
  return true;
}

function put(ctx, out, kind, cx, cz, w, d, h, rot, seed, style, extra = {}) {
  const bank = style && style.bank !== undefined ? { bank: style.bank } : {};
  out.structures.push(ctx.kit(kind, { x: snap(cx), z: snap(cz), y: snapY(ctx.heightAt(cx, cz)), w, d, h, rot, seed, style, ...bank, ...extra }));
}
const putFp = (ctx, out, kind, fp, h, seed, style, extra) => put(ctx, out, kind, fp.x, fp.z, fp.w, fp.d, h, fp.rot, seed, style, extra);
const lot = (out, x0, z0, x1, z1, mat, fn) => out.lots.push({ x0, z0, x1, z1, mat, fn });
const grow = (r, g) => [r.x0 - g, r.z0 - g, r.x1 + g, r.z1 + g];
const pickW = (rng, table) => rng.weighted(table);
const prop = (out, type, x, z, o = {}) => out.props.push({ type, x, z, yaw: 0, scale: 1, ...o });
const CAR_TINTS = [0xff2a2a2a, 0xffe6e6e6, 0xffa8763a, 0xff2b2bb4, 0xffb0b0b0, 0xff3a6a2a, 0xff2aa0d8, 0xff9a2a2a, 0xff1f2f5a, 0xffd6c070];
const carTint = (rng) => CAR_TINTS[rng.int(0, CAR_TINTS.length - 1)];

/** Ground cover for a residential lot. Neighbouring lots differ, so a suburb is not one flat green. */
const yardMat = (rng) => { const u = rng.range(0, 1); return u < 0.4 ? M.LAWN : u < 0.66 ? M.GRASS : u < 0.86 ? M.MEADOW : M.GRASS_DRY; };

function trees(rng, out, r, n, type = 'street-tree', scale = [0.8, 1.15], pad = 3) {
  for (let i = 0; i < n; i++) {
    prop(out, type, rng.range(r.x0 + pad, r.x1 - pad), rng.range(r.z0 + pad, r.z1 - pad), { yaw: rng.range(0, 6.28), scale: rng.range(scale[0], scale[1]), variant: rng.int(0, 2) });
  }
}

/** Lamps, street trees and now and then a bench or a bus shelter along sidewalked roads. */
export function roadProps(rng, roads, out, { step = 36, trees: withTrees = true, furniture = true } = {}) {
  for (const s of roads) {
    const k = ROAD_KINDS[s.kind];
    if (!k || !k.sw) continue;
    const dx = s.bx - s.ax, dz = s.bz - s.az, len = Math.hypot(dx, dz);
    if (len < 40) continue;
    const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
    const off = k.w / 2 + k.sw * 0.55;
    for (let t = 16; t < len - 16; t += step) {
      for (const side of [-1, 1]) {
        const x = s.ax + ux * t + nx * off * side, z = s.az + uz * t + nz * off * side;
        const yaw = Math.atan2(nz * side, -nx * side);
        out.props.push({ type: 'street-lamp', x, z, yaw, scale: 1 });
        if (withTrees) {
          const tt = t + step / 2;
          if (tt < len - 14) {
            const tx = s.ax + ux * tt + nx * off * side, tz = s.az + uz * tt + nz * off * side;
            if (furniture && rng.chance(0.09)) out.props.push({ type: 'bench', x: tx, z: tz, yaw: Math.atan2(-nz * side, nx * side) + 1.5708, scale: 1 });
            else if (furniture && k.marks === 'avenue' && rng.chance(0.06)) out.props.push({ type: 'busstop', x: tx, z: tz, yaw: Math.atan2(-nz * side, nx * side) + 1.5708, scale: 1 });
            else out.props.push({ type: rng.chance(0.12) ? 'poplar' : 'street-tree', x: tx, z: tz, yaw: (t * 12.9898) % 6.28, scale: 0.85 + ((t * 7.13) % 0.4), variant: Math.floor(t) % 3 });
          }
        }
      }
    }
  }
}

/** Checkered paving that fades to plain pavers when the cells get coarse. */
const checker = (x0, z0, sq = 4.8) => (x, z, cell) => (cell > 2.6 ? M.PAVER : (Math.floor((x - x0) / sq) + Math.floor((z - z0) / sq)) & 1 ? M.PAVER : M.PAVER_DARK);

function parkedCars(rng, out, r, density, rows = false) {
  const stall = 5.2;
  const n = Math.floor((r.x1 - r.x0) / stall);
  for (let i = 0; i < n; i++) {
    for (const zc of rows ? [r.z0 + 3, r.z0 + 8.5, r.z0 + 15, r.z0 + 20.5].filter((z) => z < r.z1 - 2) : [(r.z0 + r.z1) / 2]) {
      if (!rng.chance(density)) continue;
      out.props.push({ type: 'car', x: r.x0 + (i + 0.5) * stall, z: zc, yaw: rows ? 1.5708 : 0, scale: 1, variant: rng.int(0, 4), tint: carTint(rng) });
    }
  }
}

/** Asphalt with stall lines and a scatter of parked cars. */
function parkingLot(rng, out, r, density = 0.55) {
  lot(out, r.x0, r.z0, r.x1, r.z1, M.ASPHALT_WORN);
  lot(out, r.x0 + 2, r.z0 + 2, r.x1 - 2, r.z1 - 2, 0, (x, z, cell) => {
    if (cell > 1.2) return M.ASPHALT_WORN;
    const u = (x - r.x0) % 5.2, row = (z - r.z0) % 26;
    if ((row < 5.5 || (row > 10.5 && row < 16) || row > 21) && u < 0.22) return M.PARKING_LINE;
    return M.ASPHALT_WORN;
  });
  parkedCars(rng, out, { x0: r.x0 + 3, z0: r.z0 + 3, x1: r.x1 - 3, z1: r.z1 - 3 }, density, true);
}

const towerKits = (h, big, st) => {
  if (st.towerKits) return st.towerKits;
  const t = [['skyscraper', 6], ['tower-deco', 1.3], ['tower-round', 1]];
  if (h < 190) t.push(['tower-stagger', 1.0]);
  if (h > 200) t.push(['tower-taper', 0.8]);
  if (big >= 66) t.push(['tower-twin', 0.9]);
  return t;
};

export const BLOCKS = {
  skip() {},

  /** Dense core block: one to four lots, towers on the big ones, mid-rises, garages and plazas on the rest. */
  tower(ctx, rng, r, st, out) {
    const H = st.height ? st.height(rng, r) : rng.range(80, 200);
    lot(out, ...grow(r, 4), M.PAVER);
    const lots = subdivide(rng, r, { min: st.lotMin ?? 46, max: 118, gap: 5, stop: st.lotStop ?? 0.3 });
    lots.forEach((L, idx) => {
      const side = faceOf(rng, r, L);
      const big = Math.min(L.w, L.d);
      const roll = rng.next();
      if (big >= 38 && roll < (st.towerShare ?? 0.78)) {
        const h = Math.max(70, H * (idx === 0 ? 1 : rng.range(0.55, 1.0)));
        const kind = pickW(rng, towerKits(h, Math.max(L.w, L.d), st));
        const size = Math.min(68, Math.max(34, 30 + h * 0.06 + rng.range(-6, 6)));
        let w = Math.min(L.w - 8, size * rng.range(0.9, 1.15)), d = Math.min(L.d - 8, size * rng.range(0.9, 1.15));
        if (kind === 'tower-twin') { w = Math.min(L.w - 6, 84); d = Math.min(L.d - 6, 44); }
        const fp = footprint(L, side, { front: rng.range(3, 9), sides: 3, maxW: w, maxD: d, jitter: 0.6, rng });
        const fac = st.towerFac && kind !== 'tower-deco' ? pickW(rng, st.towerFac) : undefined;
        putFp(ctx, out, kind, fp, h, rng.int(1, 1e6), { ...st.tower, ...(fac ? { fac } : {}) });
        lot(out, L.x0, L.z0, L.x1, L.z1, 0, checker(L.x0, L.z0));
        trees(rng, out, L, Math.max(3, Math.round((L.w * L.d) / 700)), 'street-tree', [0.8, 1.1]);
        if (rng.chance(0.4)) prop(out, 'fountain', L.cx + rng.range(-8, 8), L.z1 - 4, { scale: 0.8 });
      } else if (big >= 24 && roll < 0.9) {
        const h = rng.range(...(st.mid || [28, 80]));
        const fp = footprint(L, side, { front: rng.range(0, 2), sides: 0, maxD: 38, rng });
        putFp(ctx, out, rng.chance(0.07) ? 'hotel' : 'midrise', fp, h, rng.int(1, 1e6), { ...st.midrise, ...(st.midFac ? { fac: pickW(rng, st.midFac) } : {}) });
      } else if (big >= 24 && roll < 0.95) {
        putFp(ctx, out, 'garage', footprint(L, side, { front: 2, sides: 2, maxD: 40 }), rng.range(16, 34), rng.int(1, 1e6), {});
      } else {
        lot(out, L.x0, L.z0, L.x1, L.z1, 0, checker(L.x0, L.z0));
        trees(rng, out, L, Math.max(3, Math.round((L.w * L.d) / 300)), 'street-tree', [0.8, 1.1]);
        prop(out, 'fountain', L.cx, L.cz, { scale: 1 });
        for (let k = 0; k < 4; k++) prop(out, 'bench', L.cx + Math.cos(k * 1.57) * 10, L.cz + Math.sin(k * 1.57) * 10, { yaw: k * 1.57 });
        for (let k = 0; k < 3; k++) prop(out, 'parasol', L.cx + rng.range(-14, 14), L.cz + rng.range(-14, 14), { tint: carTint(rng) });
      }
    });
  },

  /** One landmark tower on the whole block, in a paved plaza with trees, fountains and benches. */
  hero(ctx, rng, r, st, out) {
    const H = st.heroes.find((h) => h.i === r.i && h.j === r.j);
    lot(out, ...grow(r, 4), M.PAVER);
    lot(out, r.x0 + 4, r.z0 + 4, r.x1 - 4, r.z1 - 4, 0, checker(r.x0, r.z0));
    put(ctx, out, H.kind, r.cx, r.cz, H.w, H.d, H.h, H.rot ?? 0, rng.int(1, 1e6), { ...H.style });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = r.cx + sx * (r.w / 2 - 9), pz = r.cz + sz * (r.d / 2 - 9);
      prop(out, 'fountain', px, pz, { scale: 0.7 });
      for (let k = 0; k < 3; k++) prop(out, 'street-tree', px + rng.range(-8, 8), pz + rng.range(-8, 8), { scale: rng.range(0.9, 1.2), variant: rng.int(0, 2) });
    }
    for (let k = 0; k < 10; k++) prop(out, 'bench', r.cx + rng.range(-r.w / 2 + 8, r.w / 2 - 8), r.cz + (k & 1 ? 1 : -1) * (r.d / 2 - 6), { yaw: (k & 1) ? 3.14 : 0 });
  },

  /** Perimeter block of mid-rises around a courtyard. */
  midrise(ctx, rng, r, st, out) {
    const [hmin, hmax] = st.mid || [18, 55];
    lot(out, ...grow(r, 4), M.PAVER);
    const lots = subdivide(rng, r, { min: 26, max: 70, gap: 2, stop: 0.35 });
    let built = 0;
    for (const L of lots) {
      const touches = L.x0 <= r.x0 + 0.6 || L.x1 >= r.x1 - 0.6 || L.z0 <= r.z0 + 0.6 || L.z1 >= r.z1 - 0.6;
      if (!touches) { lot(out, L.x0, L.z0, L.x1, L.z1, M.LAWN); trees(rng, out, L, 3, 'oak', [0.6, 0.85]); continue; }
      const side = faceOf(rng, r, L);
      const h = rng.range(hmin, hmax);
      const fp = footprint(L, side, { front: rng.range(0, 1.5), sides: 0, maxD: rng.range(24, 36), rng });
      putFp(ctx, out, rng.chance(0.05) ? 'hotel' : rng.chance(0.1) ? 'loft' : 'midrise', fp, h, rng.int(1, 1e6), { ...st.midrise, ...(st.midFac ? { fac: pickW(rng, st.midFac) } : {}) });
      lot(out, L.x0, L.z0, L.x1, L.z1, 0, (x, z, cell) => (cell > 3 ? 0 : M.PAVER));
      built++;
    }
    lot(out, r.x0 + 30, r.z0 + 30, r.x1 - 30, r.z1 - 30, M.LAWN);
    trees(rng, out, { x0: r.x0 + 30, z0: r.z0 + 30, x1: r.x1 - 30, z1: r.z1 - 30 }, 8, 'oak', [0.6, 0.9]);
    if (!built) trees(rng, out, r, 6, 'oak');
  },

  /** Rows of shopfronts on every side of the block, a courtyard inside. */
  lowrise(ctx, rng, r, st, out) {
    const [hmin, hmax] = st.low || [8, 18];
    const dep = rng.range(16, 22);
    lot(out, ...grow(r, 4), M.PAVER);
    const row = (kind, zc, xc, w, rot, seed) => put(ctx, out, kind, xc, zc, w, dep - 0.6, rng.range(hmin, hmax), rot, seed, { ...st.lowrise });
    row('lowrise', r.z0 + dep / 2, r.cx, r.w, 2, rng.int(1, 1e6));
    row('lowrise', r.z1 - dep / 2, r.cx, r.w, 0, rng.int(1, 1e6));
    const side = r.d - 2 * dep;
    if (side > 24) {
      put(ctx, out, 'lowrise', r.x0 + dep / 2, r.cz, side, dep - 0.6, rng.range(hmin, hmax), 1, rng.int(1, 1e6), { ...st.lowrise });
      put(ctx, out, 'lowrise', r.x1 - dep / 2, r.cz, side, dep - 0.6, rng.range(hmin, hmax), 3, rng.int(1, 1e6), { ...st.lowrise });
    }
    const inner = { x0: r.x0 + dep, z0: r.z0 + dep, x1: r.x1 - dep, z1: r.z1 - dep };
    if (rng.chance(0.5)) parkingLot(rng, out, inner, 0.5);
    else { lot(out, inner.x0, inner.z0, inner.x1, inner.z1, M.LAWN); trees(rng, out, inner, 6, 'oak', [0.6, 0.85]); }
  },

  /** Old town: narrow shopfront rows, brick, courtyards and now and then a church or a market square. */
  oldtown(ctx, rng, r, st, out) {
    const [hmin, hmax] = st.low || [11, 24];
    const dep = rng.range(15, 20);
    lot(out, ...grow(r, 4), M.PAVER_DARK);
    lot(out, ...grow(r, 4), 0, checker(r.x0, r.z0, 6));
    if (rng.chance(0.1) && r.w > 90) {
      put(ctx, out, 'church', r.cx, r.cz, 12, 30, 34, rng.int(0, 3), rng.int(1, 1e6), {});
      lot(out, r.x0 + 6, r.z0 + 6, r.x1 - 6, r.z1 - 6, M.LAWN);
      trees(rng, out, r, 18, 'oak', [0.7, 1.1], 8);
      return;
    }
    const row = (zc, xc, w, rot) => put(ctx, out, 'lowrise', xc, zc, w, dep - 0.6, rng.range(hmin, hmax), rot, rng.int(1, 1e6), { ...st.lowrise });
    row(r.z0 + dep / 2, r.cx, r.w, 2);
    row(r.z1 - dep / 2, r.cx, r.w, 0);
    const side = r.d - 2 * dep;
    if (side > 20) { put(ctx, out, 'lowrise', r.x0 + dep / 2, r.cz, side, dep - 0.6, rng.range(hmin, hmax), 1, rng.int(1, 1e6), { ...st.lowrise }); put(ctx, out, 'lowrise', r.x1 - dep / 2, r.cz, side, dep - 0.6, rng.range(hmin, hmax), 3, rng.int(1, 1e6), { ...st.lowrise }); }
    const inner = { x0: r.x0 + dep, z0: r.z0 + dep, x1: r.x1 - dep, z1: r.z1 - dep };
    const u = rng.next();
    if (u < 0.5) { lot(out, inner.x0, inner.z0, inner.x1, inner.z1, M.LAWN); trees(rng, out, inner, 5, 'oak', [0.7, 1.0]); }
    else if (u < 0.8) { lot(out, inner.x0, inner.z0, inner.x1, inner.z1, 0, checker(inner.x0, inner.z0, 3.6)); for (let k = 0; k < 6; k++) prop(out, 'parasol', rng.range(inner.x0 + 4, inner.x1 - 4), rng.range(inner.z0 + 4, inner.z1 - 4), { tint: carTint(rng) }); prop(out, 'fountain', (inner.x0 + inner.x1) / 2, (inner.z0 + inner.z1) / 2, { scale: 0.7 }); }
    else parkingLot(rng, out, inner, 0.35);
  },

  /** Suburb: two rows of lots back to back, each with a house, drive, yard, trees and now and then a pool. */
  houses(ctx, rng, r, st, out) {
    const alongX = rng.chance(0.5);
    const depth = Math.min(46, (alongX ? r.d : r.w) / 2 - 2);
    lot(out, ...grow(r, 4), yardMat(rng));
    const rows = alongX
      ? [{ side: 'S', a: r.x0, b: r.x1, z0: r.z1 - depth, z1: r.z1 }, { side: 'N', a: r.x0, b: r.x1, z0: r.z0, z1: r.z0 + depth }]
      : [{ side: 'E', a: r.z0, b: r.z1, x0: r.x1 - depth, x1: r.x1 }, { side: 'W', a: r.z0, b: r.z1, x0: r.x0, x1: r.x0 + depth }];
    for (const row of rows) {
      let c = row.a;
      while (c < row.b - 18) {
        const lw = Math.min(row.b - c, rng.range(22, 32));
        if (row.b - c - lw < 16) { c = row.b; if (lw < 16) break; }
        const L = alongX ? { x0: c, x1: c + lw, z0: row.z0, z1: row.z1 } : { x0: row.x0, x1: row.x1, z0: c, z1: c + lw };
        L.w = L.x1 - L.x0; L.d = L.z1 - L.z0; L.cx = (L.x0 + L.x1) / 2; L.cz = (L.z0 + L.z1) / 2;
        c += lw;
        const side = row.side;
        lot(out, L.x0, L.z0, L.x1, L.z1, yardMat(rng));
        const hw = Math.min(16, lw - 7), hd = rng.range(8, 11);
        const fp = footprint(L, side, { front: rng.range(6, 9), sides: 3.5, maxW: Math.max(9.6, hw * rng.range(0.7, 1)), maxD: hd, jitter: 0.8, rng });
        putFp(ctx, out, 'house', fp, 0, rng.int(1, 1e6), { ...st.house });
        // driveway on one side of the house, walk to the door
        const horiz = side === 'N' || side === 'S';
        const dv = rng.chance(0.5) ? -1 : 1;
        const fx = fp.x + (horiz ? dv * (fp.w / 2 + 1.8) : 0), fz = fp.z + (horiz ? 0 : dv * (fp.w / 2 + 1.8));
        const sx = side === 'W' ? L.x0 : side === 'E' ? L.x1 : fx, sz = side === 'N' ? L.z0 : side === 'S' ? L.z1 : fz;
        if (horiz) lot(out, fx - 1.7, Math.min(sz, fp.z), fx + 1.7, Math.max(sz, fp.z), M.CONCRETE);
        else lot(out, Math.min(sx, fp.x), fz - 1.7, Math.max(sx, fp.x), fz + 1.7, M.CONCRETE);
        if (rng.chance(0.4)) prop(out, 'car', fx, fz + (horiz ? (side === 'S' ? 4 : -4) : 0) + (horiz ? 0 : 0), { yaw: horiz ? 0 : 1.5708, variant: rng.int(0, 4), tint: carTint(rng) });
        // hedge along the front of some lots
        if (rng.chance(0.35)) lot(out, L.x0, L.z0, L.x1, L.z1, 0, (x, z, cell) => (cell > 1.3 ? 0 : Math.min(x - L.x0, L.x1 - x, z - L.z0, L.z1 - z) < 0.7 ? M.HEDGE : 0));
        // trees in front and back yards, planting by the walls
        const back = side === 'S' ? -1 : side === 'N' ? 1 : 0, backX = side === 'E' ? -1 : side === 'W' ? 1 : 0;
        for (let k = 0; k < rng.int(1, 2); k++) prop(out, 'oak', L.cx + rng.range(-lw * 0.38, lw * 0.38) + backX * rng.range(11, 19), L.cz + rng.range(-lw * 0.38, lw * 0.38) + back * rng.range(11, 19), { yaw: rng.range(0, 6.28), scale: rng.range(0.4, 0.66), variant: rng.int(0, 3) });
        if (rng.chance(0.4)) prop(out, 'bush', fp.x + rng.range(-fp.w / 2, fp.w / 2), fp.z + (horiz ? (side === 'S' ? 1 : -1) * (fp.d / 2 + 0.9) : 0), { variant: rng.int(0, 2) });
        // back yard pool
        if (rng.chance(0.1) && lw > 24) {
          const px = L.cx + backX * (depth * 0.28) , pz = L.cz + back * (depth * 0.28);
          lot(out, px - 6.5, pz - 6.5, px + 6.5, pz + 6.5, M.CONCRETE);
          lot(out, px - 4.5, pz - 3, px + 4.5, pz + 3, M.WATER_POOL);
        }
      }
    }
    const mid = alongX ? { x0: r.x0, z0: r.z0 + depth, x1: r.x1, z1: r.z1 - depth } : { x0: r.x0 + depth, z0: r.z0, x1: r.x1 - depth, z1: r.z1 };
    if (mid.x1 - mid.x0 > 4 && mid.z1 - mid.z0 > 4) { lot(out, mid.x0, mid.z0, mid.x1, mid.z1, yardMat(rng)); trees(rng, out, mid, 4, 'oak', [0.6, 0.95], 1); }
  },

  /** Apartment blocks: slabs set among lawns with a parking court. */
  apartments(ctx, rng, r, st, out) {
    const [hmin, hmax] = st.apt || [14, 42];
    lot(out, ...grow(r, 4), M.LAWN);
    const lots = subdivide(rng, r, { min: 34, max: 80, gap: 10, stop: 0.4 });
    let park = null;
    for (const L of lots) {
      if (!park && rng.chance(0.4)) { park = L; parkingLot(rng, out, { x0: L.x0 + 4, z0: L.z0 + 4, x1: L.x1 - 4, z1: L.z1 - 4 }, 0.6); continue; }
      const side = faceOf(rng, r, L);
      const fp = footprint(L, side, { front: rng.range(7, 12), sides: 5, maxW: 58, maxD: 20, jitter: 0.5, rng });
      putFp(ctx, out, 'midrise', fp, rng.range(hmin, hmax), rng.int(1, 1e6), { fac: pickW(rng, [['FAC_APT_RIBBON', 4], ['FAC_GRID_WHITE', 1.5], ['FAC_BRICK_RED', 1.5], ['FAC_PLASTER_CREAM', 1.5]]), balconies: true, shape: 'box', ...st.midrise });
      trees(rng, out, L, 4, 'oak', [0.6, 0.9]);
    }
  },

  /** Strip of shops with a wide parking lot in front. */
  strip(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.CONCRETE);
    const dep = 22;
    put(ctx, out, 'lowrise', r.cx, r.z0 + dep / 2 + 2, r.w - 8, dep - 0.6, rng.range(6, 11), 0, rng.int(1, 1e6), { ...st.lowrise });
    parkingLot(rng, out, { x0: r.x0 + 4, z0: r.z0 + dep + 6, x1: r.x1 - 4, z1: r.z1 - 4 }, 0.5);
    prop(out, 'billboard', r.x1 - 10, r.z1 - 8, { yaw: 0, variant: rng.int(0, 3), scale: 1 });
    trees(rng, out, { x0: r.x0, z0: r.z1 - 10, x1: r.x1, z1: r.z1 }, 5, 'street-tree');
  },

  /** A civic or landmark building on its own grounds. */
  civic(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.LAWN);
    const kind = st.civicKind ? st.civicKind(rng, r) : pickW(rng, [['school', 3], ['hospital', 1.5], ['museum', 1.5], ['mall', 1.5], ['church', 2]]);
    const side = faceOf(rng, r, { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, w: r.w, d: r.d, cx: r.cx, cz: r.cz });
    const L = { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, w: r.w, d: r.d, cx: r.cx, cz: r.cz };
    if (kind === 'church') {
      putFp(ctx, out, 'church', footprint(L, side, { front: 12, sides: 30, maxW: 14, maxD: 34 }), 34, rng.int(1, 1e6), { ...st.church });
      trees(rng, out, r, 12, 'oak', [0.7, 1.0], 6);
    } else if (kind === 'mall') {
      putFp(ctx, out, 'mall', footprint(L, side, { front: r.d * 0.5, sides: 6, maxW: r.w - 12, maxD: r.d * 0.4 }), 12, rng.int(1, 1e6), {});
      parkingLot(rng, out, { x0: r.x0 + 4, z0: r.z1 - r.d * 0.46, x1: r.x1 - 4, z1: r.z1 - 4 }, 0.6);
    } else {
      putFp(ctx, out, kind, footprint(L, side, { front: 14, sides: 8, maxW: r.w - 16, maxD: r.d * 0.55 }), rng.range(10, 24), rng.int(1, 1e6), { ...st.civic });
      trees(rng, out, r, 10, 'oak', [0.7, 1.0], 5);
      parkingLot(rng, out, { x0: r.x0 + 6, z0: r.z0 + 4, x1: r.x0 + 40, z1: r.z0 + 22 }, 0.4);
    }
  },

  park(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.LAWN);
    const kind = pickW(rng, [['garden', 3.5], ['pond', 2.5], ['sports', 1.6], ['grove', 1.6]]);
    const cx = r.cx, cz = r.cz;
    if (kind !== 'grove') {
      lot(out, cx - 1.6, r.z0, cx + 1.6, r.z1, M.PAVER);
      lot(out, r.x0, cz - 1.6, r.x1, cz + 1.6, M.PAVER);
    }
    if (kind === 'garden') {
      lot(out, cx - 14, cz - 14, cx + 14, cz + 14, 0, checker(cx - 14, cz - 14, 4));
      prop(out, 'fountain', cx, cz, { scale: 1.1 });
      for (let k = 0; k < 8; k++) prop(out, 'bench', cx + Math.cos(k * 0.785) * 17, cz + Math.sin(k * 0.785) * 17, { yaw: k * 0.785 + 1.57 });
    } else if (kind === 'pond') {
      const rx = rng.range(20, 28), rz = rng.range(14, 22);
      lot(out, cx - rx - 3, cz - rz - 3, cx + rx + 3, cz + rz + 3, 0, (x, z) => { const e = ((x - cx) / (rx + 3)) ** 2 + ((z - cz) / (rz + 3)) ** 2; return e > 1 ? 0 : e > ((rx / (rx + 3)) ** 2 + 0.08) ? M.SAND : M.WATER_POOL; });
      for (let k = 0; k < 5; k++) prop(out, 'bench', cx + Math.cos(k * 1.3 + 0.4) * (rx + 6), cz + Math.sin(k * 1.3 + 0.4) * (rz + 6), { yaw: k * 1.3 + 0.4 });
    } else if (kind === 'sports') {
      const fx = 46, fz = 30;
      lot(out, cx - fx - 8, cz - fz - 8, cx + fx + 8, cz + fz + 8, M.PLASTER_TERRA);
      lot(out, cx - fx, cz - fz, cx + fx, cz + fz, 0, (x, z, cell) => {
        const line = cell <= 1 && (Math.abs(Math.abs(x - cx) - fx + 0.4) < 0.25 || Math.abs(Math.abs(z - cz) - fz + 0.4) < 0.25 || Math.abs(x - cx) < 0.25 || (Math.hypot(x - cx, z - cz) > 7.6 && Math.hypot(x - cx, z - cz) < 8.1));
        return line ? M.PARKING_LINE : ((Math.floor((x - cx) / 5) & 1) ? M.MOWN_STRIP : M.LAWN);
      });
    }
    const n = kind === 'grove' ? 22 : Math.round((r.w * r.d) / 560);
    trees(rng, out, r, n, 'oak', [0.7, 1.15], 6);
    trees(rng, out, r, 8, 'bush', [0.9, 1.3], 4);
  },

  plaza(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), 0, checker(r.x0, r.z0));
    lot(out, r.cx - 26, r.cz - 26, r.cx + 26, r.cz + 26, M.PAVER_DARK);
    trees(rng, out, r, 10);
    prop(out, 'fountain', r.cx, r.cz, { scale: 1.2 });
    if (rng.chance(0.6)) prop(out, 'statue', r.cx + 16, r.cz + 16, { scale: 1 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prop(out, 'street-lamp', r.cx + sx * 27, r.cz + sz * 27);
    for (let k = 0; k < 6; k++) prop(out, 'bench', r.cx + Math.cos(k * 1.05) * 22, r.cz + Math.sin(k * 1.05) * 22, { yaw: k * 1.05 + 1.57 });
    for (let k = 0; k < 4; k++) prop(out, 'parasol', r.cx + rng.range(-30, 30), r.cz + rng.range(-30, 30), { tint: carTint(rng) });
  },

  parking(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.ASPHALT_WORN);
    parkingLot(rng, out, { x0: r.x0 + 3, z0: r.z0 + 3, x1: r.x1 - 3, z1: r.z1 - 3 }, 0.55);
  },

  /** Works: warehouses and sheds on their own lots, a tank farm or container stack in the yard. */
  industrial(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.CONCRETE_DARK);
    const lots = subdivide(rng, r, { min: 32, max: 70, gap: 8, stop: 0.3 });
    for (const L of lots) {
      const side = faceOf(rng, r, L);
      const u = rng.next();
      if (u < 0.62) {
        const kind = pickW(rng, [['warehouse', 4], ['factory', 1.6]]);
        const fp = footprint(L, side, { front: rng.range(6, 12), sides: 3, maxD: L.d * 0.7, rng });
        putFp(ctx, out, kind, fp, rng.range(9, 16), rng.int(1, 1e6), {});
      } else if (u < 0.78 && st.tanks !== false) {
        put(ctx, out, 'tank', L.cx - 8, L.cz, 22, 22, rng.range(12, 18), 0, rng.int(1, 1e6), {});
        put(ctx, out, 'tank', L.cx + 16, L.cz + 6, 20, 20, rng.range(10, 15), 0, rng.int(1, 1e6), {});
      } else if (u < 0.9) {
        put(ctx, out, 'containers', L.cx, L.cz, Math.min(46, L.w - 4), Math.min(24, L.d - 4), 0, 0, rng.int(1, 1e6), {});
      } else parkingLot(rng, out, L, 0.3);
    }
  },

  harbor(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.CONCRETE);
    const pick = rng.next();
    if (pick < 0.45) put(ctx, out, 'containers', r.cx, r.cz, r.w * 0.86, r.d * 0.62, 0, 0, rng.int(1, 1e6), {});
    else if (pick < 0.75) {
      for (const dz of [-0.24, 0.24]) put(ctx, out, 'warehouse', r.cx, r.cz + r.d * dz, r.w * 0.8, r.d * 0.34, rng.range(10, 14), dz < 0 ? 2 : 0, rng.int(1, 1e6), {});
    } else put(ctx, out, 'loft', r.cx, r.cz, r.w * 0.5, r.d * 0.4, 16, 0, rng.int(1, 1e6), {});
    if (rng.chance(0.4)) put(ctx, out, 'crane', r.cx + r.w * 0.3, r.z0 + 6, 20, 20, 0, 0, rng.int(1, 1e6), {});
  },

  /** Parked cars as tinted instances, either along rows (lot) or scattered. */
  _cars(rng, out, r, density, rows = false) { parkedCars(rng, out, r, density, rows); },
};

/** Weighted block type choice from a style table like { tower: 3, midrise: 2, park: 0.5 }. */
export function fillBlocks(ctx, rng, blocks, style, out, blockFor = null) {
  const table = Object.entries(style.types);
  for (const r of blocks) {
    if (!landOK(ctx, r)) continue;
    const type = blockFor ? blockFor(r, rng) : rng.weighted(table);
    if (!BLOCKS[type]) throw new Error('unknown block type ' + type);
    BLOCKS[type](ctx, rng, r, style, out);
  }
}

export { ROT };

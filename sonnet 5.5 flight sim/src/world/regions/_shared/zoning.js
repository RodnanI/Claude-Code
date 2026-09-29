import { M } from '../../../voxel/palette.js';
import { ROAD_KINDS } from '../../roads/network.js';

/* Block fillers. Each takes a block rectangle r = { x0, z0, x1, z1, w, d, cx, cz } and appends kit descriptors,
   props and paint lots to `out`. Descriptor sizes are LOCAL (w along local x). Rotations are quarter turns:
   rot 0 faces +z (south), 2 faces -z (north), 1 faces -x (west), 3 faces +x (east). */

export const snap = (v) => Math.round(v * 2) / 2;

export function newOut() { return { structures: [], props: [], lots: [], roads: [] }; }

export function landOK(ctx, r, min = 1.6) {
  const pts = [[r.cx, r.cz], [r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]];
  for (const p of pts) if (ctx.heightAt(p[0], p[1]) < min) return false;
  return true;
}

function put(ctx, out, kind, cx, cz, w, d, h, rot, seed, style) {
  out.structures.push(ctx.kit(kind, { x: snap(cx), z: snap(cz), w, d, h, rot, seed, style }));
}
const lot = (out, x0, z0, x1, z1, mat, fn) => out.lots.push({ x0, z0, x1, z1, mat, fn });
const grow = (r, g) => [r.x0 - g, r.z0 - g, r.x1 + g, r.z1 + g];

function trees(ctx, rng, out, r, n, type = 'street-tree', scale = [0.8, 1.15]) {
  for (let i = 0; i < n; i++) {
    out.props.push({ type, x: rng.range(r.x0 + 3, r.x1 - 3), z: rng.range(r.z0 + 3, r.z1 - 3), yaw: rng.range(0, 6.28), scale: rng.range(scale[0], scale[1]), variant: rng.int(0, 2) });
  }
}

/** Lamps and street trees along sidewalked roads. */
export function roadProps(rng, roads, out, { step = 36, trees: withTrees = true } = {}) {
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
          if (tt < len - 14) out.props.push({ type: 'street-tree', x: s.ax + ux * tt + nx * off * side, z: s.az + uz * tt + nz * off * side, yaw: (t * 12.9898) % 6.28, scale: 0.85 + ((t * 7.13) % 0.4), variant: Math.floor(t) % 3 });
        }
      }
    }
  }
}

export const BLOCKS = {
  skip() {},
  tower(ctx, rng, r, st, out) {
    const h = st.height ? st.height(rng, r) : rng.range(80, 200);
    const w = Math.min(64, r.w * rng.range(0.42, 0.56)), d = Math.min(64, r.d * rng.range(0.42, 0.56));
    put(ctx, out, 'skyscraper', r.cx + rng.range(-5, 5), r.cz + rng.range(-5, 5), w, d, h, rng.int(0, 3), rng.int(1, 1e6), { ...st.tower });
    lot(out, ...grow(r, 4), M.PAVER);
    if (rng.chance(0.5)) lot(out, r.cx - w * 0.8, r.cz - d * 0.8, r.cx + w * 0.8, r.cz + d * 0.8, M.PAVER_DARK);
    trees(ctx, rng, out, r, 5);
  },

  midrise(ctx, rng, r, st, out) {
    const sd = 24;
    const [hmin, hmax] = st.mid || [18, 55];
    const row = (x0, x1, zc, rot, faceZ) => {
      let x = x0;
      while (x < x1 - 14) {
        const lw = Math.min(x1 - x, rng.range(20, 34));
        if (x1 - x - lw < 12) { x = x1; break; }
        const h = rng.range(hmin, hmax);
        put(ctx, out, 'midrise', x + lw / 2, zc, lw - 2, sd - 2, h, rot, rng.int(1, 1e6), { ...st.midrise });
        x += lw;
      }
      void faceZ;
    };
    row(r.x0, r.x1, r.z0 + sd / 2, 2);
    row(r.x0, r.x1, r.z1 - sd / 2, 0);
    // east and west columns (local x runs along world z after a quarter turn)
    const col = (xc, rot) => {
      let z = r.z0 + sd;
      while (z < r.z1 - sd - 10) {
        const lz = Math.min(r.z1 - sd - z, rng.range(20, 32));
        if (lz < 14) break;
        put(ctx, out, 'midrise', xc, z + lz / 2, lz - 2, sd - 2, rng.range(hmin, hmax), rot, rng.int(1, 1e6), { ...st.midrise });
        z += lz;
      }
    };
    col(r.x0 + sd / 2, 1);
    col(r.x1 - sd / 2, 3);
    lot(out, ...grow(r, 4), M.PAVER);
    lot(out, r.x0 + sd, r.z0 + sd, r.x1 - sd, r.z1 - sd, M.LAWN);
    trees(ctx, rng, out, { x0: r.x0 + sd, z0: r.z0 + sd, x1: r.x1 - sd, z1: r.z1 - sd }, 6, 'oak', [0.6, 0.85]);
  },

  lowrise(ctx, rng, r, st, out) {
    const dep = 16;
    const [hmin, hmax] = st.low || [7, 14];
    for (const [zc, rot] of [[r.z0 + dep / 2, 2], [r.z1 - dep / 2, 0]]) {
      let x = r.x0;
      while (x < r.x1 - 9) {
        const lw = Math.min(r.x1 - x, rng.range(10, 18));
        if (lw < 8) break;
        put(ctx, out, 'lowrise', x + lw / 2, zc, lw - 0.6, dep - 1, rng.range(hmin, hmax), rot, rng.int(1, 1e6), { ...st.lowrise });
        x += lw;
      }
    }
    lot(out, ...grow(r, 4), M.PAVER);
    lot(out, r.x0, r.z0 + dep, r.x1, r.z1 - dep, M.ASPHALT_WORN);
    if (rng.chance(0.6)) BLOCKS._cars(rng, out, { x0: r.x0 + 4, z0: r.z0 + dep + 2, x1: r.x1 - 4, z1: r.z1 - dep - 2 }, 0.5);
  },

  houses(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.LAWN);
    const n = Math.max(2, Math.floor(r.w / 24));
    const lw = r.w / n;
    const dep = 8 + 10.5;
    const tree = (x, z, sc) => out.props.push({ type: 'oak', x, z, yaw: rng.range(0, 6.28), scale: sc, variant: rng.int(0, 3) });
    for (const [rowZ, rot, dirz] of [[r.z0, 2, 1], [r.z1, 0, -1]]) {
      for (let k = 0; k < n; k++) {
        const w = Math.min(lw - 5, rng.range(9.5, 13)), d = rng.range(8, 10.5);
        const cx = r.x0 + (k + 0.5) * lw;
        const cz = rowZ + dirz * (6.5 + d / 2);
        put(ctx, out, 'house', cx, cz, w, d, 0, rot, rng.int(1, 1e6), { ...st.house });
        lot(out, cx - 2.2, rowZ + (dirz > 0 ? 0 : -9), cx + 2.2, rowZ + (dirz > 0 ? 9 : 0), M.CONCRETE);
        tree(cx + rng.range(-lw * 0.35, lw * 0.35), cz + dirz * rng.range(8, 14), rng.range(0.5, 0.75));
        if (rng.chance(0.4)) out.props.push({ type: 'bush', x: cx + rng.range(-w / 2, w / 2), z: cz - dirz * (d / 2 + 0.8), yaw: 0, scale: 1, variant: rng.int(0, 2) });
      }
    }
    // west and east sides between the two rows, facing outward
    const m = Math.max(0, Math.floor((r.d - 2 * dep - 4) / 24));
    const lz = m ? (r.d - 2 * dep - 4) / m : 0;
    for (const [colX, rot, dirx] of [[r.x0, 1, 1], [r.x1, 3, -1]]) {
      for (let k = 0; k < m; k++) {
        const w = Math.min(lz - 5, rng.range(9.5, 13)), d = rng.range(8, 10.5);
        const cz = r.z0 + dep + 2 + (k + 0.5) * lz;
        const cx = colX + dirx * (6.5 + d / 2);
        put(ctx, out, 'house', cx, cz, w, d, 0, rot, rng.int(1, 1e6), { ...st.house });
        lot(out, colX + (dirx > 0 ? 0 : -9), cz - 2.2, colX + (dirx > 0 ? 9 : 0), cz + 2.2, M.CONCRETE);
        tree(cx + dirx * rng.range(8, 14), cz + rng.range(-lz * 0.3, lz * 0.3), rng.range(0.5, 0.75));
      }
    }
    for (let i = 0; i < 3; i++) tree(rng.range(r.x0 + 30, r.x1 - 30), rng.range(r.z0 + 38, r.z1 - 38), rng.range(0.6, 0.95));
    if (rng.chance(0.5)) BLOCKS._cars(rng, out, { x0: r.x0 + 6, z0: r.cz - 3, x1: r.x1 - 6, z1: r.cz + 3 }, 0.12);
  },

  park(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.LAWN);
    lot(out, r.cx - 1.6, r.z0, r.cx + 1.6, r.z1, M.PAVER);
    lot(out, r.x0, r.cz - 1.6, r.x1, r.cz + 1.6, M.PAVER);
    if (rng.chance(0.6)) lot(out, r.cx - 18, r.cz - 12, r.cx + 18, r.cz + 12, M.WATER_POOL);
    trees(ctx, rng, out, r, Math.round((r.w * r.d) / 450), 'oak', [0.7, 1.1]);
    trees(ctx, rng, out, r, 8, 'bush', [0.9, 1.3]);
  },

  plaza(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.PAVER);
    lot(out, r.cx - 24, r.cz - 24, r.cx + 24, r.cz + 24, M.PAVER_DARK);
    trees(ctx, rng, out, r, 10);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) out.props.push({ type: 'street-lamp', x: r.cx + sx * 26, z: r.cz + sz * 26, yaw: 0, scale: 1 });
  },

  parking(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.ASPHALT_WORN);
    lot(out, r.x0 + 3, r.z0 + 3, r.x1 - 3, r.z1 - 3, 0, (x, z, cell) => {
      if (cell > 1.2) return M.ASPHALT_WORN;
      const u = (x - r.x0) % 5.2;
      const row = ((z - r.z0) % 26);
      if ((row < 5.5 || (row > 10.5 && row < 16) || row > 21) && u < 0.22) return M.PARKING_LINE;
      return M.ASPHALT_WORN;
    });
    BLOCKS._cars(rng, out, { x0: r.x0 + 4, z0: r.z0 + 4, x1: r.x1 - 4, z1: r.z1 - 4 }, 0.55, true);
  },

  industrial(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.CONCRETE_DARK);
    const kinds = ['warehouse', 'warehouse', 'factory', 'warehouse'];
    const rowsZ = [r.z0 + 22, r.z1 - 22];
    for (const zc of rowsZ) {
      let x = r.x0 + 6;
      while (x < r.x1 - 30) {
        const w = rng.range(34, 54), d = rng.range(24, 30);
        const kind = kinds[rng.int(0, kinds.length - 1)];
        if (x + w > r.x1 - 4) break;
        put(ctx, out, kind, x + w / 2, zc, w, d, rng.range(9, 14), zc < r.cz ? 2 : 0, rng.int(1, 1e6), {});
        x += w + rng.range(6, 12);
      }
    }
    if (rng.chance(0.6)) put(ctx, out, 'tank', r.cx, r.cz, 22, 22, rng.range(12, 18), 0, rng.int(1, 1e6), {});
    if (rng.chance(0.5)) put(ctx, out, 'containers', r.cx + 30, r.cz, 46, 20, 0, 0, rng.int(1, 1e6), {});
  },

  harbor(ctx, rng, r, st, out) {
    lot(out, ...grow(r, 4), M.CONCRETE);
    const pick = rng.next();
    if (pick < 0.45) put(ctx, out, 'containers', r.cx, r.cz, r.w * 0.86, r.d * 0.62, 0, 0, rng.int(1, 1e6), {});
    else if (pick < 0.75) {
      for (const dz of [-0.24, 0.24]) put(ctx, out, 'warehouse', r.cx, r.cz + r.d * dz, r.w * 0.8, r.d * 0.34, rng.range(10, 14), dz < 0 ? 2 : 0, rng.int(1, 1e6), {});
    } else put(ctx, out, 'lowrise', r.cx, r.cz, r.w * 0.5, r.d * 0.4, 12, 0, rng.int(1, 1e6), {});
    if (rng.chance(0.4)) put(ctx, out, 'crane', r.cx + r.w * 0.3, r.z0 + 6, 20, 20, 0, 0, rng.int(1, 1e6), {});
  },

  /** Parked cars as tinted instances, either along rows (lot) or scattered. */
  _cars(rng, out, r, density, rows = false) {
    const stall = 5.2;
    const n = Math.floor((r.x1 - r.x0) / stall);
    for (let i = 0; i < n; i++) {
      for (const zc of rows ? [r.z0 + 3, r.z0 + 8.5, r.z0 + 15, r.z0 + 20.5].filter((z) => z < r.z1 - 2) : [(r.z0 + r.z1) / 2]) {
        if (!rng.chance(density)) continue;
        const c = rng.next();
        const tint = c < 0.2 ? 0xff2a2a2a : c < 0.4 ? 0xffe6e6e6 : c < 0.52 ? 0xffa8763a : c < 0.64 ? 0xff2b2bb4 : c < 0.76 ? 0xffb0b0b0 : c < 0.86 ? 0xff3a6a2a : 0xff2aa0d8;
        out.props.push({ type: 'car', x: r.x0 + (i + 0.5) * stall, z: zc, yaw: 1.5708 * (rows ? 1 : 0) + (rows ? 0 : 1.5708), scale: 1, variant: rng.int(0, 4), tint });
      }
    }
  },
};

/** Weighted block type choice from a style table like { tower: 3, midrise: 2, park: 0.5 }. */
export function fillBlocks(ctx, rng, blocks, style, out, blockFor = null) {
  const table = Object.entries(style.types);
  for (const r of blocks) {
    if (!landOK(ctx, r)) continue;
    const type = blockFor ? blockFor(r, rng) : rng.weighted(table);
    BLOCKS[type](ctx, rng, r, style, out);
  }
}

import { kitFor, TRANSIENT } from './instance.js';
import { rasterize } from '../voxel/recipe.js';
import { M } from '../voxel/palette.js';

/* Top and side silhouettes of an aircraft, rasterized from the same part recipes the game draws, so the blueprint in the
   hangar can never disagree with the model. Pure data: no DOM. Cells are `cell` meters; a view is a bit grid whose rows run
   from the nose backward (top view) or from the top down (side view). */

const cache = new WeakMap();

/**
 * { cell, length, span, height, top: { w, h, data }, side: { w, h, data } }. Top view: columns run from the left wing tip
 * to the right, rows from the nose to the tail. Side view: columns run from the tail to the nose, rows from the top down.
 * data holds 0 for air, 1 for airframe and 2 for glass.
 */
export function silhouette(spec, cell = 0.2) {
  const hit = cache.get(spec);
  if (hit && hit.cell === cell) return hit;
  const kit = kitFor(spec);
  const parts = [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of kit.parts) {
    if (p.group !== 'exterior' || TRANSIENT.has(p.visibleWhen)) continue;
    const r = rasterize(p.recipe, { cell, conservative: true, maxCells: 6e6 });
    if (!r) continue;
    const ox = p.local ? Math.round(p.pivot[0] / cell) : 0, oy = p.local ? Math.round(p.pivot[1] / cell) : 0, oz = p.local ? Math.round(p.pivot[2] / cell) : 0;
    parts.push({ r, ox, oy, oz });
    x0 = Math.min(x0, r.i0 + ox); x1 = Math.max(x1, r.i0 + ox + r.vol.nx);
    y0 = Math.min(y0, r.j0 + oy); y1 = Math.max(y1, r.j0 + oy + r.vol.ny);
    z0 = Math.min(z0, r.k0 + oz); z1 = Math.max(z1, r.k0 + oz + r.vol.nz);
  }
  const nx = Math.max(1, x1 - x0), ny = Math.max(1, y1 - y0), nz = Math.max(1, z1 - z0);
  const top = { w: nz, h: nx, data: new Uint8Array(nz * nx) };
  const side = { w: nx, h: ny, data: new Uint8Array(nx * ny) };
  const glass = new Set([M.AC_CANOPY, M.GLASS_CLEAR, M.GLASS_DARK, M.CAR_GLASS]);
  for (const { r, ox, oy, oz } of parts) {
    const v = r.vol;
    for (let k = 0; k < v.nz; k++) {
      for (let j = 0; j < v.ny; j++) {
        for (let i = 0; i < v.nx; i++) {
          const m = v.data[v.index(i, j, k)];
          if (!m) continue;
          const gx = r.i0 + ox + i - x0, gy = r.j0 + oy + j - y0, gz = r.k0 + oz + k - z0;
          const mark = glass.has(m) ? 2 : 1;
          top.data[(nx - 1 - gx) * nz + gz] = Math.max(top.data[(nx - 1 - gx) * nz + gz], mark);   // row: distance from the nose
          side.data[(ny - 1 - gy) * nx + gx] = Math.max(side.data[(ny - 1 - gy) * nx + gx], mark);
        }
      }
    }
  }
  const out = { cell, length: nx * cell, span: nz * cell, height: ny * cell, top, side };
  cache.set(spec, out);
  return out;
}

/** Number of set cells in a view, for tests. */
export const filled = (view) => view.data.reduce((n, v) => n + (v ? 1 : 0), 0);

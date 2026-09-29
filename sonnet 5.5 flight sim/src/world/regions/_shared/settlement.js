import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { makeLattice, latticeRoads } from './lattice.js';
import { newOut, fillBlocks, roadProps, snap } from './zoning.js';

/**
 * Builds a whole town or city region from a compact config. Extend with `extras(ctx, { out, lat, rng, blocks })`
 * for landmarks. Everything a town file does not specify falls back to sensible defaults.
 */
export function settlement(cfg) {
  const S = SITES[cfg.key];
  const lat = makeLattice({ cx: S.x, cz: S.z, block: cfg.block ?? 80, street: cfg.street ?? 18 });
  const [i0, i1] = cfg.i, [j0, j1] = cfg.j;
  const pad = Array.isArray(cfg.pad) ? cfg.pad : [cfg.pad ?? 0, cfg.pad ?? 0, cfg.pad ?? 0, cfg.pad ?? 0];   // room for outlying farms: [west, north, east, south]
  const bounds = [lat.lineX(i0 - 0.5) - 14 - pad[0], lat.lineZ(j0 - 0.5) - 14 - pad[1], lat.lineX(i1 + 0.5) + 14 + pad[2], lat.lineZ(j1 + 0.5) + 14 + pad[3]];
  const flatR = cfg.flatR ?? Math.max(i1 - i0, j1 - j0) * lat.px * 0.42;
  return defineRegion({
    id: `${cfg.kind}/${cfg.key}`,
    name: S.name,
    kind: cfg.kind,
    bounds,
    maxHeight: cfg.maxHeight ?? 40,
    tint: cfg.tint,
    access: { [cfg.key]: [lat.lineX(-0.5), lat.lineZ(-0.5)] },
    terrain: () => ({
      flatten: [{ type: 'circle', x: S.x, z: S.z, r: flatR, blend: cfg.blend ?? 260, y: cfg.elev ?? 'auto', order: 4 }],
    }),
    layout(ctx) {
      const rng = ctx.rng('layout');
      const out = newOut();
      out.roads = latticeRoads(lat, i0, i1, j0, j1, cfg.streets ?? ((axis, idx) => (Math.round(idx * 2) % 8 === 1 ? 'avenue' : 'street')));
      const blocks = [];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) blocks.push(lat.blockRect(i, j));
      fillBlocks(ctx, rng, blocks, cfg.style, out, cfg.blockFor ? (r, g) => cfg.blockFor(r, g, lat) : null);
      roadProps(rng, out.roads, out, { step: cfg.lampStep ?? 40, trees: cfg.trees ?? true });
      if (cfg.extras) cfg.extras(ctx, { out, lat, rng, blocks, S });
      return out;
    },
  });
}

export const put = (ctx, out, kind, x, z, w, d, h, rot, seed, style, extra = {}) =>
  out.structures.push(ctx.kit(kind, { x: snap(x), z: snap(z), w, d, h, rot, seed, style, ...extra }));

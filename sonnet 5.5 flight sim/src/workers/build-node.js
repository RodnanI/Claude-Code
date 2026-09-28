import { ColumnBuf, sampleColumns, meshTerrain, meshOceanTile } from '../lod/terrain-mesher.js';
import { MeshBuilder, meshVolume } from '../voxel/mesher.js';
import { rasterize } from '../voxel/recipe.js';
import { M } from '../voxel/palette.js';
import { scatterNode, placeProps, InstanceBuckets } from '../world/scatter/scatter.js';
import { NODE_CELLS } from '../world/config.js';
import { now } from '../core/perf.js';

/**
 * Builds one LOD node. Everything the node shows is produced here, off the main thread:
 * terrain columns, structures rasterized at this node's cell size, and scenery instances.
 */
export function createNodeBuilder(world) {
  const N = NODE_CELLS;
  const buf = new ColumnBuf(N);

  function isDeepOcean(x0, z0, size, cell) {
    if (size > 20000) return false;
    const n = 6;
    const step = size / n;
    let mx = -9;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const m = world.terrain.island.mask(x0 + i * step, z0 + j * step, cell);
      if (m > mx) mx = m;
    }
    return mx < -0.62;
  }

  return {
    build(level, ix, iz, cfg) {
      const t0 = now();
      const cell = cfg.baseCell * 2 ** level;
      const size = N * cell;
      const x0 = ix * size, z0 = iz * size;
      const builder = new MeshBuilder(2048);
      const buckets = new InstanceBuckets();
      let structures = 0, structQuads = 0;
      let minY = 0, maxY = 0;

      if (isDeepOcean(x0, z0, size, cell)) {
        meshOceanTile(builder, N, M.WATER_5);
      } else {
        sampleColumns(world, x0, z0, cell, N, buf);
        meshTerrain(buf, N, builder);
        minY = buf.minH; maxY = buf.maxH;
        const terrainQuads = builder.quadCount;

        // structures anchored in this node
        const descs = world.structuresIn(x0, z0, x0 + size, z0 + size);
        const off = [Math.round(x0 / cell), 0, Math.round(z0 / cell)];
        for (const d of descs) {
          const ext = Math.max(d.w, d.d, d.h * 0.5);
          if (ext < cell * 1.4) continue;
          const recipe = world.recipeFor(d);
          const anchorY = Math.floor(d.y / cell + 1e-6) * cell;
          const r = rasterize(recipe, { cell, anchor: [d.x, anchorY, d.z], rot: d.rot || 0, conservative: cell >= 3 });
          if (!r) continue;
          const before = builder.quadCount;
          meshVolume(r.vol, { ao: cfg.ao && cell <= 2, builder, offset: [r.i0 - off[0], r.j0, r.k0 - off[2]] });
          structQuads += builder.quadCount - before;
          structures++;
          const top = (r.j0 + r.vol.ny) * cell;
          if (top > maxY) maxY = top;
          if (r.j0 * cell < minY) minY = r.j0 * cell;
        }
        // scenery and props
        scatterNode(world, x0, z0, cell, level, N, buf, cfg, buckets);
        placeProps(world, x0, z0, cell, N, cfg, buckets);
        void terrainQuads;
      }
      const mesh = builder.finish();
      const b = mesh.bounds;
      const bounds = [b[0] * cell, Math.min(minY, b[1] * cell), b[2] * cell, b[3] * cell, Math.max(maxY, b[4] * cell), b[5] * cell];
      const instances = buckets.finish();
      return {
        level, ix, iz, cell,
        vertexData: mesh.vertexData, vertexCount: mesh.vertexCount,
        indexData: mesh.indexData, indexCount: mesh.indexCount,
        bounds,
        instances,
        stats: { ms: now() - t0, quads: mesh.indexCount / 6, structures, structQuads, instances: instances.reduce((s, i) => s + i.count, 0) },
      };
    },
  };
}

export function transferListOf(result) {
  const list = [result.vertexData, result.indexData.buffer];
  for (const i of result.instances) list.push(i.data);
  return list;
}

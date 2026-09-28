import { Recipe, meshRecipe } from '../voxel/recipe.js';
import { Rng } from '../core/rng.js';
import { hashString } from '../core/util.js';

/** GPU model cache: recipes rasterized at a chosen voxel size and uploaded once. */
export class ModelRegistry {
  constructor(renderer, world) {
    this.renderer = renderer;
    this.world = world;
    this.cache = new Map();
    this.pendingFree = [];
  }

  /** Mesh from any recipe. key must uniquely identify (recipe, cell, options). */
  fromRecipe(key, recipe, cell, opts = {}) {
    let m = this.cache.get(key);
    if (m) return m;
    const mesh = meshRecipe(recipe, { cell, conservative: !!opts.conservative, ao: opts.ao !== false, anchor: opts.anchor, rot: 0 });
    if (!mesh || !mesh.indexCount) {
      m = { gpu: null, cell, off: [0, 0, 0], tris: 0, empty: true };
    } else {
      const gpu = this.renderer.uploadMesh(mesh);
      m = { gpu, cell, off: [mesh.i0 * cell, mesh.j0 * cell, mesh.k0 * cell], tris: mesh.indexCount / 3, dims: mesh.dims };
    }
    this.cache.set(key, m);
    return m;
  }

  scenery(type, variant, cell) {
    const key = `s:${type}:${variant}:${cell}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const def = this.world.scenery.get(type);
    const r = new Recipe();
    def.build(r, variant, new Rng(hashString(type) ^ (variant * 7919)));
    return this.fromRecipe(key, r, cell, { conservative: cell >= 3 || !!def.rules?.conservative });
  }

  dispose() {
    for (const m of this.cache.values()) if (m.gpu) this.renderer.freeMesh(m.gpu);
    this.cache.clear();
  }
}

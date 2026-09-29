/** Validates and normalizes a region definition. See PLAN.md section 10 for the contract. */
export function defineRegion(def) {
  const need = ['id', 'name', 'kind', 'bounds'];
  for (const k of need) if (def[k] === undefined) throw new Error(`region missing ${k}: ${def.id || '?'}`);
  const b = def.bounds;
  if (!(b.length === 4 && b[2] > b[0] && b[3] > b[1])) throw new Error(`region ${def.id} has invalid bounds`);
  return Object.freeze({
    maxHeight: 30,
    spawns: [],
    ...def,
  });
}

/** Same idea for kits: build(desc, recipe, rng, ctx) fills a Recipe. */
export function defineKit(def) {
  if (!def.id || typeof def.build !== 'function') throw new Error('kit needs id and build');
  return Object.freeze({ ...def });
}

/**
 * Scenery types: instanced models with placement rules. build(recipe, variant, rng) fills a Recipe in meters.
 * A type may instead (or as well) compose itself from other scenery types: expand(emit, t) calls
 * emit(type, variant, dx, dy, dz, yaw, scale, bank) for every part, which is how one tree becomes a trunk and several crowns
 * that share draws with every other tree. unitCells lists the voxel size, in model units, by level of detail, for models
 * that are drawn at any scale (a crown of radius 1 that the instance scales up) instead of at the node's voxel size.
 */
export function defineScenery(def) {
  if (!def.id || (typeof def.build !== 'function' && typeof def.expand !== 'function')) throw new Error('scenery needs id and build or expand');
  return Object.freeze({ variants: 1, ...def });
}

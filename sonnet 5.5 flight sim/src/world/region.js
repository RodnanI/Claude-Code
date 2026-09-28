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

/** Scenery types: instanced models with placement rules. build(recipe, variant, rng) fills a Recipe in meters. */
export function defineScenery(def) {
  if (!def.id || typeof def.build !== 'function') throw new Error('scenery needs id and build');
  return Object.freeze({ variants: 1, ...def });
}

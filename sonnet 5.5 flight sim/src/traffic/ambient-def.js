/**
 * Ambient actor module contract. One file per family in traffic/ambient/, discovered by the .ambient.js suffix. A file may
 * default-export one definition or an array. build(recipe, variant, rng) draws the actor in meters with local +x forward,
 * +y up and the origin where the actor meets its support: the waterline for ships, the wheel-axle height of an aircraft is
 * given by `ground`, the distance from the origin down to the tires. kind picks the behaviour: 'ship', 'boat' or 'aircraft'.
 */
export function defineAmbient(def) {
  for (const k of ['id', 'kind', 'build', 'length']) if (def[k] === undefined) throw new Error(`ambient ${def.id || '?'} missing ${k}`);
  if (!['ship', 'boat', 'aircraft'].includes(def.kind)) throw new Error(`ambient ${def.id} has unknown kind ${def.kind}`);
  if (!(def.length > 2)) throw new Error(`ambient ${def.id} has implausible length`);
  return Object.freeze({ variants: 1, ground: 0, cells: [0.3, 0.6, 1.2, 2.4, 4.8, 9.6], maxDist: 12000, ...def });
}

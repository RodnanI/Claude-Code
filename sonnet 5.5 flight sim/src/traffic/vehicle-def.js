import { ROAD_KINDS } from '../world/roads/network.js';

/**
 * Vehicle module contract. One file per family in traffic/vehicles/, discovered by the .vehicle.js suffix. A file may
 * default-export a single definition or an array. build(recipe, variant, rng) draws the vehicle in meters with the
 * origin on the ground at its center and local +x pointing forward. Paint uses TINT-flagged materials such as
 * M.CAR_PAINT, so each instance can carry its own color.
 */
export function defineVehicle(def) {
  for (const k of ['id', 'name', 'build', 'length', 'width', 'weight', 'roads']) if (def[k] === undefined) throw new Error(`vehicle ${def.id || '?'} missing ${k}`);
  for (const r of def.roads) if (!ROAD_KINDS[r]) throw new Error(`vehicle ${def.id} lists unknown road kind ${r}`);
  if (!(def.length > 1 && def.width > 0.8 && def.weight >= 0)) throw new Error(`vehicle ${def.id} has implausible dimensions`);
  const out = { variants: 1, accel: 2.2, decel: 3.5, speedFactor: 1, tints: null };
  for (const [k, v] of Object.entries(def)) if (v !== undefined) out[k] = v;
  return Object.freeze(out);
}

/** Paint colors as 0xAABBGGRR (the same packing the scenery instances use). */
export const PAINTS = [0xff2a2a2a, 0xffe6e6e6, 0xffa8763a, 0xff2b2bb4, 0xffb0b0b0, 0xff3a6a2a, 0xff2aa0d8, 0xff7a4a2e, 0xff1e3a8a];

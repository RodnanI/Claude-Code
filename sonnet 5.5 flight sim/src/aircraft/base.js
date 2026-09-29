/* Aircraft module contract. One file per plane exports defineAircraft({...}); the registry finds it by the
   .plane.js suffix. Body axes: +x forward, +y up, +z right wing. Every position is in meters relative to the
   center of gravity, which is the body origin. Angles in radians unless a field says degrees. */

const REQUIRED = ['id', 'name', 'mass', 'inertia', 'wing', 'aero', 'propulsion', 'gear', 'model'];

export function defineAircraft(spec) {
  for (const k of REQUIRED) if (spec[k] === undefined) throw new Error(`aircraft ${spec.id || '?'} missing ${k}`);
  const a = {
    manufacturer: 'Independent',
    role: 'General aviation',
    description: '',
    voxel: 0.125,
    interiorVoxel: 0.05,
    limits: { vne: 90, maxG: 6, flapSpeed: 50, gearSpeed: 90 },
    cameras: { cockpit: [0.6, 0.55, 0], chase: { distance: 16, height: 4.5 } },
    skids: [],
    stations: [],
    weapons: [],
    tags: [],
    order: 99,
    hud: 'none',
    animations: [],
    liveries: [{ id: 'default', name: 'Factory' }],
    fuelDefault: 0.8,
    ...spec,
  };
  a.aero = { CDflap: 0.04, CDgear: 0, CLflap: 0.4, Cmflap: -0.05, CLmaxFlap: 0.3, Cmq: -10, Clb: 0.08, Clp: -0.45, Cnb: 0.06, Cnr: -0.1, Cyb: 0.3, Cnda: 0.015, machCrit: 0.85, ...a.aero };
  a.aero.control = { elevator: 0.55, aileron: 0.07, rudder: 0.035, ...(a.aero.control || {}) };
  validateAircraft(a);
  return Object.freeze(a);
}

export function validateAircraft(a) {
  const err = (m) => { throw new Error(`aircraft ${a.id}: ${m}`); };
  if (!(a.mass.empty > 0)) err('mass.empty must be positive');
  if (a.inertia.length !== 3 || a.inertia.some((v) => !(v > 0))) err('inertia needs three positive values [roll, yaw, pitch]');
  if (!(a.wing.area > 0 && a.wing.span > 0 && a.wing.chord > 0)) err('wing area, span and chord must be positive');
  if (!(a.aero.CLa > 0 && a.aero.CLmax > 0 && a.aero.alphaStall > 0 && a.aero.CD0 > 0 && a.aero.k > 0)) err('aero coefficients are incomplete');
  if (!(a.aero.Cma < 0)) err('aero.Cma must be negative for static pitch stability');
  if (!a.gear.wheels || a.gear.wheels.length < 3) err('gear needs at least three wheels');
  if (typeof a.model !== 'function') err('model must be a function');
  if (a.propulsion.type !== 'prop' && a.propulsion.type !== 'jet') err('propulsion.type must be prop or jet');
  if (Math.abs((a.aero.CLmax - a.aero.CL0) / a.aero.CLa - a.aero.alphaStall) > 0.08) err('alphaStall disagrees with (CLmax - CL0) / CLa');
  const stationIds = new Set();
  for (const s of a.stations) { if (stationIds.has(s.id)) err(`duplicate station ${s.id}`); stationIds.add(s.id); }
  for (const w of a.weapons) {
    if (!w.id || !w.type) err('weapon needs id and type');
    for (const st of w.stations || []) if (!stationIds.has(st)) err(`weapon ${w.id} uses unknown station ${st}`);
  }
  for (const l of a.liveries) if (!l.id || !l.name) err('livery needs id and name');
}

export const totalMass = (a, fuelKg = null, payload = null) => a.mass.empty + (fuelKg ?? a.mass.fuel * a.fuelDefault) + (payload ?? a.mass.payload ?? 0);

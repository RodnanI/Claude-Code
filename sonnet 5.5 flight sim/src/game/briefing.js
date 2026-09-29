import { takeoffSpeeds, simulateTakeoff, windComponents, runwayVerdict } from '../aircraft/flight/takeoff.js';

/* The takeoff briefing shown in the hangar: what the runway gives, what the wind does to it, what this aircraft needs on it.
   Pure data built from the flight model itself, so the numbers agree with the automatic takeoff and the in-flight guidance. */

const SURFACE = { asphalt: 'RUNWAY', concrete: 'CONCRETE', grass: 'MOWN_STRIP' };
const cache = new Map();

/**
 * spec: aircraft, start: a spawn from world.spawns(), ground: { h(x, z) }, wind: { from (deg), speed (m/s) }.
 * Returns { kind: 'runway' | 'taxi', ... }. Runway starts and holding points that name a runway get the full performance
 * figures; every other start says where the runways are.
 */
export function makeBriefing({ spec, start, ground, wind = { from: 0, speed: 0 }, runways = [] }) {
  const elevation = ground.h(start.x, start.z);
  const out = { kind: 'taxi', elevation, wind, runways, speeds: takeoffSpeeds(spec), start };
  const rwy = start.rwy;
  if (!rwy) return out;
  const avail = start.kind === 'runway' ? start.roll : rwy.length;
  const { head, cross } = windComponents(wind.from, wind.speed, rwy.heading);
  const slope = avail > 50 ? (ground.h(rwy.fx, rwy.fz) - ground.h(start.x, start.z)) / (start.kind === 'runway' ? avail : rwy.length) : 0;
  const key = [spec.id, rwy.surface, Math.round(elevation / 10), Math.round(slope * 500), Math.round(head * 2), Math.round(cross * 2)].join('|');
  let sim = cache.get(key);
  if (!sim) { sim = simulateTakeoff(spec, { surface: SURFACE[rwy.surface] || 'RUNWAY', elevation, slope, head, cross }); cache.set(key, sim); }
  const need = sim.ok ? sim.d50 : Infinity;
  return { ...out, kind: 'runway', rwy, avail, head, cross, slope, sim, need, roll: sim.ok ? sim.roll : Infinity, verdict: runwayVerdict(need, avail) };
}

import { FlightModel } from './model.js';
import { solveTrim } from './trim.js';
import { isa, G } from './atmosphere.js';
import { takeoffSpeeds, simulateTakeoff } from './takeoff.js';
import { totalMass } from '../base.js';

/* Numbers that describe an aircraft to a player, worked out from its definition and the flight model instead of written by
   hand: best climb rate, roll rate, takeoff run. The hangar draws the card bars from these, so a change to an aircraft's
   aerodynamics changes its card. */

const NO_GROUND = { h: () => -1e6, surface: () => 'GRASS' };
const cache = new WeakMap();

/** Rate of climb in m/s at a speed, at full power, clean, at the given altitude. */
export function climbRate(spec, { ias, alt = 0 } = {}) {
  const t = solveTrim(spec, { ias, alt, flaps: 0, gear: 0 });
  const m = new FlightModel(spec, NO_GROUND);
  m.c.flap = 0; m.c.gear = 0; m.c.thr = 1; m.rpm = 0;
  const T = m._thrust(isa(alt), t.tas);
  return ((T - t.drag) * t.tas) / (m.mass * G);
}

/** Steady roll rate in degrees per second with full aileron at 60 percent of never-exceed speed. */
export function rollRate(spec) {
  const ae = spec.aero, V = spec.limits.vne * 0.6;
  const q = 0.5 * 1.225 * V * V;
  const auth = ae.control.schedule ? Math.min(1, ae.control.schedule / Math.max(q, 1)) : 1;
  return ((ae.control.aileron * auth) / Math.abs(ae.Clp)) * ((2 * V) / spec.wing.span) * (180 / Math.PI);
}

/** Everything the cards and the briefing need that does not depend on where the aircraft stands. */
export function performanceOf(spec) {
  let p = cache.get(spec);
  if (p) return p;
  const sp = takeoffSpeeds(spec);
  const vy = sp.vs1 * 1.4;
  const run = simulateTakeoff(spec, { surface: 'RUNWAY' });
  p = {
    speeds: sp,
    mass: totalMass(spec),
    vne: spec.limits.vne,
    vy,
    climb: Math.max(0, climbRate(spec, { ias: vy })),
    roll: rollRate(spec),
    run: run.ok ? run.d50 : Infinity,
    liftoff: run.ok ? run.roll : Infinity,
    difficulty: spec.difficulty ?? 3,
  };
  cache.set(spec, p);
  return p;
}

/**
 * Card bars for a whole catalog, each 0 to 1 relative to the best aircraft in it so that the cards compare with each other.
 * Short field is inverted: a shorter run fills more of the bar.
 */
export function catalogBars(specs) {
  const perf = specs.map((s) => [s, performanceOf(s)]);
  const max = (k) => Math.max(...perf.map(([, p]) => (Number.isFinite(p[k]) ? p[k] : 0)), 1e-9);
  const minRun = Math.min(...perf.map(([, p]) => p.run));
  const vmax = max('vne'), cmax = max('climb'), rmax = max('roll');
  const out = new Map();
  for (const [s, p] of perf) {
    out.set(s.id, {
      perf: p,
      speed: Math.sqrt(p.vne / vmax),
      climb: Math.sqrt(Math.max(p.climb, 0) / cmax),
      roll: Math.sqrt(p.roll / rmax),
      field: Number.isFinite(p.run) ? Math.sqrt(minRun / p.run) : 0,
      difficulty: p.difficulty,
    });
  }
  return out;
}

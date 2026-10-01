/* Play tuning applied once to every aircraft as it is defined, so the flight model, the trim solver, the takeoff
   planner, the hangar charts and the HUD all see the same numbers. The airframes were modelled on real aircraft and
   felt sluggish over an island this size. Engine thrust and never-exceed speed rise (props more than jets, which
   were already fast), lift and the G limit rise for tighter turns, and surface authority rises so no aircraft rolls
   slower than ROLL_FLOOR. All 1 means unmodified. */
export const TUNING = {
  prop: { thrust: 2.0, speed: 1.3 },
  jet: { thrust: 1.3, speed: 1.3 },
  lift: 1.3, maxG: 1.2, elevator: 1.7, rudder: 1.7,
  rollFloor: 140,   // deg/s, analytic steady roll rate at 60 percent of never-exceed speed
  rollMaxBoost: 6,
};

export function tuneSpec(a, t = TUNING) {
  const cls = t[a.propulsion.type];
  const p = { ...a.propulsion };
  if (p.type === 'jet') { p.thrust *= cls.thrust; if (p.afterburner) p.afterburner *= cls.thrust; } else p.power *= cls.thrust;
  const ae = { ...a.aero };
  ae.CLa *= t.lift; ae.CL0 *= t.lift; ae.CLmax *= t.lift;
  if (ae.CLmaxFlap) ae.CLmaxFlap *= t.lift;
  if (ae.CLflap) ae.CLflap *= t.lift;
  const limits = { ...a.limits, vne: a.limits.vne * cls.speed, maxG: a.limits.maxG * t.maxG };
  const c = { ...ae.control };
  c.elevator *= t.elevator; c.rudder *= t.rudder;
  // analytic steady roll rate with the new vne, the same estimate the hangar uses
  const V = limits.vne * 0.6;
  const base = (c.aileron / Math.abs(ae.Clp)) * ((2 * V) / a.wing.span) * (180 / Math.PI);
  c.aileron *= Math.min(t.rollMaxBoost, Math.max(1, t.rollFloor / Math.max(base, 1)));
  ae.control = c;
  return { ...a, propulsion: p, aero: ae, limits };
}

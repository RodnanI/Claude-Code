import { FlightModel } from './model.js';
import { isa, G, RHO0 } from './atmosphere.js';
import { clamp } from '../../core/util.js';

const NO_GROUND = { h: () => -1e6, surface: () => 'GRASS' };

/**
 * Steady level flight trim: the angle of attack, elevator deflection and throttle that hold altitude and speed.
 * ias in m/s indicated, alt in meters. Returns { alpha, elevator, trim, throttle, thrust, drag, saturated, tas }.
 * `trim` is the value for input.trim that holds the elevator with a centered stick.
 */
export function solveTrim(spec, { ias, alt = 0, flaps = 0, gear = 1, fuel = null, payload = null } = {}) {
  const m = new FlightModel(spec, NO_GROUND, { fuel, payload });
  const atm = isa(alt);
  const V = ias / Math.sqrt(atm.rho / RHO0);
  const q = 0.5 * atm.rho * V * V, S = spec.wing.area, W = m.mass * G, ae = spec.aero;
  m.c.flap = flaps; m.c.gear = gear; m.rpm = 0;
  const thrustAt = (thr) => { m.c.thr = thr; return m._thrust(atm, V); };
  const solveAlpha = (T) => {
    let lo = -0.35, hi = ae.alphaStall + 0.02;
    for (let i = 0; i < 48; i++) {
      const a = (lo + hi) / 2;
      if (q * S * m.liftCoefficient(a, flaps) + T * Math.sin(a) < W) lo = a; else hi = a;
    }
    return (lo + hi) / 2;
  };
  let T = 0, alpha = solveAlpha(0), D = 0;
  for (let it = 0; it < 6; it++) {
    const CL = m.liftCoefficient(alpha, flaps);
    D = q * S * m.dragCoefficient(CL, alpha, 0, V / atm.a);
    T = D / Math.max(Math.cos(alpha), 0.2);
    alpha = solveAlpha(T);
  }
  // throttle that produces the required thrust
  let lo = 0, hi = 1;
  const saturated = thrustAt(1) < T;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (thrustAt(mid) < T) lo = mid; else hi = mid;
  }
  const throttle = saturated ? 1 : (lo + hi) / 2;
  const auth = ae.control.schedule ? Math.min(1, ae.control.schedule / Math.max(q, 1)) : 1;
  const wash = spec.propulsion.type === 'prop' ? 1 + 0.55 * throttle * Math.max(0, 1 - V / 40) : 1;
  const e = -(ae.Cm0 + ae.Cma * alpha + ae.Cmflap * flaps) / (ae.control.elevator * auth * wash);
  const elevator = clamp(e, -1, 1);
  return { alpha, elevator, trim: clamp(elevator / 0.35, -1, 1), throttle, thrust: T, drag: D, saturated, tas: V, ias, alt, flaps, gear };
}

/** Put a model into trimmed level flight at a place and heading. Returns the trim solution. */
export function startAirborne(model, { x, y, z, heading = 0, ias, flaps = 0, gear = 1 }) {
  const t = solveTrim(model.spec, { ias, alt: y, flaps, gear, fuel: model.fuel, payload: model.payload });
  model.setState({ x, y, z, heading, pitch: t.alpha, speed: t.tas });
  model.vel[0] = Math.sin(heading) * t.tas; model.vel[1] = 0; model.vel[2] = -Math.cos(heading) * t.tas;
  model._preVy = 0;
  const c = model.c, i = model.input;
  i.throttle = c.thr = t.throttle; i.flaps = c.flap = flaps; i.gear = gear; c.gear = gear;
  i.pitch = 0; i.trim = t.trim; c.elev = t.elevator; i.roll = i.yaw = 0;
  model.rpm = model.spec.propulsion.type === 'prop' ? model.spec.propulsion.idleRpm + (model.spec.propulsion.maxRpm - model.spec.propulsion.idleRpm) * t.throttle : 60 + 40 * t.throttle;
  model.onGround = false; model._airborneTime = 5; model._groundTimer = 0;
  return t;
}

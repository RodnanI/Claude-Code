import { clamp, wrapPi } from '../../core/util.js';
import { FlightModel } from './model.js';
import { RHO0 } from './atmosphere.js';
import { totalMass } from '../base.js';

/* Takeoff logic that does not care where it runs: the speeds an aircraft needs, one controller that flies a complete takeoff
   through the normal input channels, and a simulator that runs that controller against the real flight model to answer
   "how much runway does this need". The hangar briefing, the in-flight guidance and the auto takeoff all read the same
   numbers, so what the briefing promises is what the assist delivers. */

export const TAKEOFF_FLAPS = 0.33;         // one notch of three
export const CLEAR_HEIGHT = 15.24;         // 50 ft, the screen height takeoff distances are quoted at
const D2R = Math.PI / 180;

/** Steady stall speed in m/s indicated for an aircraft in a configuration (flaps 0 to 1). */
export function stallSpeed(spec, { flaps = 0, fuel = null, payload = null } = {}) {
  const W = totalMass(spec, fuel, payload) * 9.81;
  const cl = spec.aero.CLmax + (spec.aero.CLmaxFlap || 0) * flaps;
  return Math.sqrt((2 * W) / (RHO0 * spec.wing.area * cl));
}

/** The takeoff reference speeds in m/s indicated: stall speeds, rotation, and the speed to hold in the initial climb. */
export function takeoffSpeeds(spec, opts = {}) {
  const vs1 = stallSpeed(spec, { ...opts, flaps: 0 });
  const vsTo = stallSpeed(spec, { ...opts, flaps: spec.aero.CLmaxFlap > 0.15 ? TAKEOFF_FLAPS : 0 });
  const vr = vsTo * 1.12;
  return { vs1, vsTo, vr, vClimb: vsTo * 1.3, vFlaps: vs1 * 1.28 };
}

/** Components of the wind along and across a runway: head is positive into the wind, cross is positive from the right. */
export function windComponents(fromDeg, speed, headingDeg) {
  const rel = (fromDeg - headingDeg) * D2R;
  return { head: speed * Math.cos(rel), cross: speed * Math.sin(rel) };
}

/** World velocity of the air for a wind from a compass direction (world x east, z south). */
export function windVector(out, fromDeg, speed) {
  const a = (fromDeg + 180) * D2R;
  out[0] = Math.sin(a) * speed; out[1] = 0; out[2] = -Math.cos(a) * speed;
  return out;
}

/** A runway direction as a frame: origin, heading in radians, and the unit vectors along and to the right of it. */
export function makeFrame(x, z, heading, length = 1e9) {
  return { x, z, heading, length, fx: Math.sin(heading), fz: -Math.cos(heading), rx: Math.cos(heading), rz: Math.sin(heading) };
}

/**
 * Flies a takeoff. In 'auto' mode the caller applies `out` to the aircraft every step; in 'guide' mode the pilot only watches the
 * player fly and keeps `cue` up to date with what to do next. Phases: hold (not rolling), roll, rotate, climb, done, abort.
 */
export class TakeoffPilot {
  constructor(model, frame, { mode = 'auto', flaps = true, delay = 0.2 } = {}) {
    this.m = model;
    this.delay = delay;
    this.f = frame;
    this.mode = mode;
    this.useFlaps = flaps && model.spec.aero.CLmaxFlap > 0.15;
    this.sp = takeoffSpeeds(model.spec, { fuel: model.fuel, payload: model.payload });
    this.phase = 'hold';
    this.t = 0;
    this.airT = 0;
    this.pitchT = 0;
    this.iPit = 0;
    this.out = { pitch: 0, roll: 0, yaw: 0, throttle: 1, brake: 0, flapNotch: this.useFlaps ? 1 : 0, gear: 1 };
    this.hold = frame.heading;             // the track flown once airborne; the assist may turn it away from rising ground
    this.turn = 0;                         // -1 left, 0 straight, 1 right: set from outside when terrain closes in
    this.said = new Set();
    this.calls = [];
    this.cue = '';
    this.tone = 'info';
    this.track = { u: 0, v: 0, vv: 0, rem: 0, hErr: 0 };
    this.liftoffAt = null;
  }

  _say(key, text, tone = 'info') {
    if (this.said.has(key)) return;
    this.said.add(key);
    this.calls.push({ key, text, tone });
  }

  /** Callouts queued since the last call. */
  drain() { const c = this.calls; this.calls = []; return c; }

  _locate() {
    const m = this.m, f = this.f, tr = this.track;
    const dx = m.pos[0] - f.x, dz = m.pos[2] - f.z;
    tr.u = dx * f.fx + dz * f.fz;
    tr.v = dx * f.rx + dz * f.rz;
    tr.vv = m.vel[0] * f.rx + m.vel[2] * f.rz;
    tr.rem = f.length - tr.u;
    tr.hErr = wrapPi(f.heading - m.att.heading);
    if (this.u0 === undefined) this.u0 = tr.u;        // where the takeoff began, to report the run from the start and not from the runway end
    return tr;
  }

  step(dt) {
    const m = this.m, sp = this.sp, o = this.out, spec = m.spec, tr = this._locate();
    this.t += dt;
    const ias = m.ias, onGround = m.onGround;
    const auto = this.mode === 'auto';
    const aligned = Math.abs(tr.hErr) < 0.35 && Math.abs(tr.v) < 40;

    // phases follow the aircraft, whoever is flying it
    if (this.phase === 'hold' && onGround && aligned && (m.groundSpeed > 3 || (auto && this.t > this.delay))) this.phase = 'roll';
    // a hop over a bump is not a takeoff: the roll goes on until there is flying speed under the wings
    const flyable = ias > sp.vsTo * 1.03;
    if ((this.phase === 'roll' || this.phase === 'rotate') && !onGround && m.agl > 0.4 && flyable) { this.phase = 'climb'; this.liftoffAt = { u: tr.u, ias, t: this.t }; }
    if (this.phase === 'roll' && ias >= sp.vr && onGround) this.phase = 'rotate';
    if (this.phase === 'climb' && m.agl > 1.5) this.airT += dt;
    if (this.phase === 'climb' && m.agl > 120 && (m.c.gear < 0.05 || !spec.gear.retractable)) this.phase = 'done';
    if (this.phase === 'climb' && (m.agl > 300 || this.airT > 30)) this.phase = 'done';
    // no runway left to get airborne on: stop (auto only, a human decides for themselves)
    if (auto && (this.phase === 'roll') && tr.rem < 60 + m.groundSpeed * m.groundSpeed / 9 && m.groundSpeed > 4 && ias < sp.vr * 0.98) this.phase = 'abort';

    this._callouts(tr);
    this._cue(tr);
    if (auto) this._control(dt, tr);
    return this.phase;
  }

  _callouts(tr) {
    const m = this.m, sp = this.sp, spec = m.spec;
    if (this.phase === 'roll' && m.c.thr > 0.9) this._say('power', 'Takeoff power set');
    if (this.phase === 'roll' && m.ias > sp.vr * 0.4) this._say('alive', 'Airspeed alive');
    if (this.phase === 'roll' && m.ias > sp.vr * 0.8) this._say('vone', 'Approaching rotate');
    if (this.phase === 'rotate') this._say('rotate', 'Rotate', 'good');
    if (this.phase === 'climb' && m.vel[1] > 0.6 && m.agl > 3) {
      this._say('posrate', spec.gear.retractable && m.c.gear > 0.5 ? 'Positive rate, gear up' : 'Positive rate', 'good');
    }
    if (this.phase === 'abort') this._say('abort', 'Abort, out of runway', 'bad');
    if (this.phase === 'done') this._say('done', this.mode === 'auto' ? 'Takeoff complete, you have the controls' : 'Takeoff complete', 'good');
  }

  /** What to do next, for the guidance panel. */
  _cue(tr) {
    const m = this.m, sp = this.sp, spec = m.spec;
    let cue = '', tone = 'info';
    switch (this.phase) {
      case 'hold':
        if (Math.abs(tr.hErr) >= 0.35 || Math.abs(tr.v) >= 40) cue = 'Line up with the runway';
        else cue = m.c.thr < 0.9 ? 'Full throttle to start the roll' : 'Rolling';
        break;
      case 'roll':
        if (Math.abs(tr.v) > 3.5 && m.groundSpeed > 6) { cue = tr.v > 0 ? 'Steer left' : 'Steer right'; tone = 'warn'; }
        else if (m.c.thr < 0.9) { cue = 'Full throttle'; tone = 'warn'; }
        else cue = 'Rotate at Vr';
        break;
      case 'rotate': cue = 'ROTATE'; tone = 'good'; break;
      case 'climb':
        if (spec.gear.retractable && m.c.gear > 0.5 && m.vel[1] > 0.6) { cue = 'Gear up'; tone = 'good'; }
        else if (m.c.flap > 0.05 && m.agl > 40 && m.ias > sp.vFlaps) cue = 'Flaps up';
        else if (m.ias < sp.vClimb * 0.93) { cue = 'Lower the nose, airspeed low'; tone = 'warn'; }
        else cue = 'Climb straight ahead';
        break;
      case 'abort': cue = 'Abort, brakes'; tone = 'bad'; break;
      default: cue = '';
    }
    this.cue = cue; this.tone = tone;
  }

  _control(dt, tr) {
    const m = this.m, sp = this.sp, o = this.out, spec = m.spec, att = m.att;
    const ph = this.phase;
    // ---- lateral: hold the centerline, with the heading corrected for offset and drift
    // on the wheels the heading is held; in the air the ground track is, which puts the nose into a crosswind by itself
    const flying = !m.onGround && m.agl > 1 && m.groundSpeed > 12;
    let err;
    if (flying) {
      if (this.turn) this.hold = wrapPi(this.hold + this.turn * 0.1 * dt);
      const chi = wrapPi(Math.atan2(m.vel[0], -m.vel[2]) - this.hold);
      // the centerline only matters near the ground; higher up the track is simply held
      const off = this.turn === 0 && m.agl < 40 ? clamp(tr.v * 0.015, -0.12, 0.12) : 0;
      err = clamp((-off - chi) * 2.5, -0.4, 0.4);
    } else err = wrapPi(this.f.heading - clamp(tr.v * 0.02 + tr.vv * 0.06, -0.14, 0.14) - att.heading);
    o.yaw = clamp(err * 3 + m.omega[1] * 1.5, -1, 1);
    const rollT = m.onGround ? 0 : clamp(err * 1.6 + (this.turn ? this.turn * 0.12 : 0), -0.4, 0.4);
    o.roll = clamp((rollT - att.roll) * 2.2 - m.omega[0] * 0.55, -1, 1);
    o.brake = 0;
    o.throttle = 1;
    if (ph === 'hold') { o.throttle = 0; o.brake = 1; }
    o.flapNotch = this.useFlaps ? (ph === 'climb' && m.agl > 40 && m.ias > sp.vFlaps ? 0 : ph === 'done' ? 0 : 1) : 0;
    if (ph === 'climb' || ph === 'done') {
      if (spec.gear.retractable && m.agl > 5 && m.vel[1] > 0.5 && m.ias < spec.limits.gearSpeed) o.gear = 0;
    }
    // ---- pitch
    let target = 0;
    if (ph === 'rotate') this.pitchT = Math.min(this.pitchT + 0.1 * dt, 0.16);
    if (ph === 'roll' || ph === 'hold') this.pitchT = 0;
    if (ph === 'climb' || ph === 'done') {
      const want = clamp(0.14 + (m.ias - sp.vClimb) * 0.018, 0.04, 0.24);
      this.pitchT += clamp(want - this.pitchT, -0.06 * dt, 0.06 * dt);
    }
    target = this.pitchT;
    if (ph === 'roll' || ph === 'hold') { o.pitch = 0; this.iPit = 0; }
    else {
      this.iPit = clamp(this.iPit + (target - att.pitch) * dt * 0.25, -0.3, 0.3);
      o.pitch = clamp((target - att.pitch) * 2.4 - m.omega[2] * 0.9 + this.iPit, -1, 1);
    }
    if (ph === 'abort') { o.throttle = 0; o.brake = 1; o.pitch = 0; o.flapNotch = 0; }
  }
}

/**
 * Run the takeoff controller against the flight model on flat ground and report the distances.
 * head and cross are wind components in m/s (cross positive from the right), slope the gradient along the runway (positive uphill).
 * Distances are along the runway from the start.
 */
export function simulateTakeoff(spec, { surface = 'RUNWAY', elevation = 0, slope = 0, head = 0, cross = 0, length = 1e6, fuel = null, payload = null, flaps = true, maxTime = 110 } = {}) {
  const ground = { h: (x) => elevation + slope * x, surface: () => surface };
  const m = new FlightModel(spec, ground, { fuel, payload });
  const heading = Math.PI / 2;
  m.pos[0] = 0; m.pos[1] = elevation + 3; m.pos[2] = 0;
  m.settleOnGround(heading);
  m.wind[0] = -head; m.wind[1] = 0; m.wind[2] = -cross;
  m.turbulence = 0;
  const pilot = new TakeoffPilot(m, makeFrame(m.pos[0], m.pos[2], heading, length), { mode: 'auto', flaps });
  const DT = 1 / 240;
  const res = { ok: false, reason: '', roll: null, d50: null, vLof: null, tLof: null, t50: null, vr: pilot.sp.vr, vClimb: pilot.sp.vClimb, vs: pilot.sp.vsTo, maxOffset: 0, crashed: false };
  const i = m.input;
  let ground0 = true;
  for (let n = 0; n < maxTime / DT; n++) {
    pilot.step(DT);
    const o = pilot.out;
    i.pitch = o.pitch; i.roll = o.roll; i.yaw = o.yaw; i.throttle = o.throttle; i.brake = o.brake; i.flaps = o.flapNotch / 3; i.gear = o.gear;
    m.step(DT);
    res.maxOffset = Math.max(res.maxOffset, Math.abs(pilot.track.v));
    if (m.crashed) { res.crashed = true; res.reason = m.crashReason || 'crashed'; break; }
    if (ground0 && !m.onGround && m.agl > 0.4) { ground0 = false; res.roll = m.pos[0]; res.vLof = m.ias; res.tLof = n * DT; res.offsetLof = Math.abs(pilot.track.v); }
    if (!ground0 && res.d50 === null && m.agl >= CLEAR_HEIGHT) { res.d50 = m.pos[0]; res.t50 = n * DT; res.ok = true; break; }
    if (pilot.phase === 'abort') { res.reason = 'not enough runway'; break; }
    if (m.pos[0] > Math.min(length * 3, 6000)) { res.reason = 'ran out of runway'; break; }
  }
  if (!res.ok && !res.reason) res.reason = res.roll === null ? 'never lifted off' : 'did not climb';
  return res;
}

/** Plain-language verdict for a takeoff that needs `need` meters on a runway of `avail` meters. */
export function runwayVerdict(need, avail) {
  if (!Number.isFinite(need) || need === null) return { level: 'bad', label: 'Not possible', ratio: 0 };
  const ratio = avail / need;
  if (ratio >= 1.8) return { level: 'good', label: 'Plenty of runway', ratio };
  if (ratio >= 1.3) return { level: 'good', label: 'Comfortable', ratio };
  if (ratio >= 1.05) return { level: 'warn', label: 'Tight, no room for mistakes', ratio };
  return { level: 'bad', label: 'Too short', ratio };
}

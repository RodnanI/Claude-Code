import { quat, attitudeOf } from '../../core/math.js';
import { clamp, smoothstep, lerp } from '../../core/util.js';
import { isa, G, RHO0 } from './atmosphere.js';
import { storesMass } from '../munitions.js';

export const KT = 1.94384;
export const FT = 3.28084;

/* Ground friction by surface material name: rolling resistance (crr) and peak tire friction (mu). */
export const SURFACES = {
  default: { crr: 0.03, mu: 0.6 },
  RUNWAY: { crr: 0.018, mu: 0.85 }, RUNWAY_MARK: { crr: 0.018, mu: 0.8 }, ASPHALT: { crr: 0.02, mu: 0.85 }, ASPHALT_WORN: { crr: 0.02, mu: 0.8 },
  CONCRETE: { crr: 0.02, mu: 0.85 }, APRON: { crr: 0.02, mu: 0.85 }, TAXI_LINE: { crr: 0.02, mu: 0.8 },
  MOWN_STRIP: { crr: 0.055, mu: 0.55 }, LAWN: { crr: 0.06, mu: 0.5 }, GRASS: { crr: 0.07, mu: 0.5 }, MEADOW: { crr: 0.07, mu: 0.5 }, GRASS_LUSH: { crr: 0.08, mu: 0.45 },
  DIRT: { crr: 0.06, mu: 0.5 }, DIRT_ROAD: { crr: 0.05, mu: 0.55 }, GRAVEL_ROAD: { crr: 0.05, mu: 0.55 }, SAND: { crr: 0.16, mu: 0.4 }, SNOW: { crr: 0.1, mu: 0.3 },
  WATER: { crr: 0.9, mu: 0.12 },
};

const _surfCache = new Map();
/** Friction properties for a palette material name, with pattern fallbacks for the many natural ground types. */
export function surfaceProps(name) {
  let r = SURFACES[name];
  if (r) return r;
  r = _surfCache.get(name);
  if (r) return r;
  const n = String(name);
  r = /WATER/.test(n) ? SURFACES.WATER
    : /SAND|BEACH/.test(n) ? SURFACES.SAND
    : /SNOW|ICE/.test(n) ? SURFACES.SNOW
    : /ASPHALT|CONCRETE|RUNWAY|APRON|TAXI|ROAD|CURB|SIDEWALK|PAVE/.test(n) ? SURFACES.ASPHALT
    : /DIRT|GRAVEL|SCREE|ROCK|PLOW|FARM_PLOW/.test(n) ? SURFACES.DIRT
    : /GRASS|MEADOW|LAWN|FARM|HEDGE|FOREST|ALPINE|FLOOR|HAY|STUBBLE/.test(n) ? SURFACES.GRASS
    : SURFACES.default;
  _surfCache.set(name, r);
  return r;
}

const SKID = { k: 90000, c: 7000, travel: 0.08, mu: 0.5 };

/**
 * Six degree of freedom rigid body with aerodynamics, propulsion and spring-damper landing gear against a terrain
 * function. Deterministic at a fixed step. World axes: +x east, +y up, +z south. Body axes: +x forward, +y up,
 * +z right. The quaternion q rotates body vectors to world vectors and omega is in body axes
 * (x roll, positive right wing down; y yaw, positive nose left; z pitch, positive nose up).
 */
export class FlightModel {
  /**
   * ground: either a function (x, z) => { h, name } or an object { h(x, z), surface(x, z) } where h is the terrain height
   * in meters (water surface counts as ground) and surface returns a material name such as 'RUNWAY' or 'WATER'.
   * The object form keeps the hot path cheap: the surface name is only asked for a few times a second.
   */
  constructor(spec, ground, opts = {}) {
    this.spec = spec;
    if (typeof ground === 'function') { this._gh = (x, z) => ground(x, z).h; this._gs = (x, z) => ground(x, z).name; } else { this._gh = ground.h; this._gs = ground.surface; }
    this.fuel = opts.fuel ?? spec.mass.fuel * spec.fuelDefault;
    this.payload = opts.payload ?? (spec.mass.payload ?? 0) + storesMass(spec);
    this.pos = new Float64Array([0, 100, 0]);
    this.vel = new Float64Array(3);
    this.q = quat.create();
    this.omega = new Float64Array(3);
    this.wind = new Float64Array(3);
    this.turbulence = 0;
    this.structural = opts.structural ?? true;
    /* Control inputs: pitch positive = pull (nose up), roll and yaw positive = right. gear 1 = down. */
    this.input = { pitch: 0, roll: 0, yaw: 0, throttle: 0, brake: 0, flaps: 0, gear: 1, airbrake: 0, trim: 0 };
    /* Actual surface positions, smoothed toward the inputs. gear is extension (1 = down and locked). */
    this.c = { elev: 0, ail: 0, rud: 0, thr: 0, flap: 0, gear: 1, brake: 0, air: 0 };
    this.time = 0;
    this.onGround = false;
    this.crashed = false;
    this.crashReason = '';
    this.damage = 0;
    this.events = [];
    this.lastTouchdown = null;
    this.wheelAngle = 0; this.propAngle = 0; this.rpm = 0;
    this.stallWarn = 0; this.stallDepth = 0; this.buffet = 0;
    this.gLoad = 1;
    this.alpha = 0; this.beta = 0; this.mach = 0; this.ias = 0; this.tas = 0; this.q_dyn = 0;
    this.thrust = 0; this.afterburner = false;
    this.agl = 1000;
    this.att = { heading: 0, pitch: 0, roll: 0 };
    const mk = (w) => ({ ...w, comp: 0, contact: false, steerAngle: 0, rollSpeed: 0, surf: SURFACES.default, surfTimer: 0, skid: false });
    this.wheels = spec.gear.wheels.map(mk);
    this.skids = (spec.skids || []).map((h) => {
      const p = Array.isArray(h) ? h : h.p;
      return { pos: p, kind: Array.isArray(h) ? 'belly' : h.kind || 'belly', radius: 0, ...SKID, comp: 0, contact: false, surf: SURFACES.default, surfTimer: 0, skid: true };
    });
    this.gearBottom = Math.min(...spec.gear.wheels.map((w) => w.pos[1] - w.radius));
    this.steerWheel = this.wheels.find((w) => w.steer) || null;
    this.channels = {};
    this._vb = new Float64Array(3);
    this._t = new Float64Array(3);
    this._t2 = new Float64Array(3);
    this._qc = new Float64Array(4);
    this._af = new Float64Array(3);
    this._preVy = 0;
    this._airborneTime = 0;
    this._noise = 0;
    this._groundTimer = 0;
    this.updateChannels();
  }

  get mass() { return this.spec.mass.empty + this.fuel + this.payload; }
  get speedKnots() { return this.ias * KT; }
  get vertSpeed() { return this.vel[1]; }
  get groundSpeed() { return Math.hypot(this.vel[0], this.vel[2]); }

  bodyToWorld(out, x, y, z) { this._t2[0] = x; this._t2[1] = y; this._t2[2] = z; return quat.rotate(out, this.q, this._t2); }

  /** Place the aircraft. heading in radians from north, speed along the body x axis. */
  setState({ x, y, z, heading = 0, pitch = 0, roll = 0, speed = 0 }) {
    this.pos[0] = x; this.pos[1] = y; this.pos[2] = z;
    quat.fromHeadingPitchRoll(this.q, heading, pitch, roll);
    this.omega.fill(0);
    const f = this.bodyToWorld(this._t, 1, 0, 0);
    this.vel[0] = f[0] * speed; this.vel[1] = f[1] * speed; this.vel[2] = f[2] * speed;
    this.crashed = false; this.crashReason = ''; this.damage = 0;
    const atm0 = isa(y);
    this.tas = speed; this.ias = speed * Math.sqrt(atm0.rho / RHO0); this.mach = speed / atm0.a;
    this._fbwOut = undefined; this._aCmd = undefined; this._aI = 0;
    this._preVy = this.vel[1];
    this._airborneTime = 1;
    for (const w of this.wheels) { w.comp = 0; w.contact = false; }
    this.att = attitudeOf(this.q, this.att);
  }

  /** Put the wheels on the ground at the current x, z in the aircraft's natural rest attitude and let the springs settle. */
  settleOnGround(heading, pitchOffset = null) {
    let f = this.wheels[0], a = this.wheels[0];
    for (const w of this.wheels) { if (w.pos[0] > f.pos[0]) f = w; if (w.pos[0] < a.pos[0]) a = w; }
    const rest = pitchOffset ?? Math.atan2(a.pos[1] - a.radius - (f.pos[1] - f.radius), f.pos[0] - a.pos[0]);
    this.setState({ x: this.pos[0], y: this.pos[1], z: this.pos[2], heading, pitch: rest, roll: 0, speed: 0 });
    this._airborneTime = 0;
    let lowest = Infinity;
    for (const w of this.wheels) {
      const p = this.bodyToWorld(this._t, w.pos[0], w.pos[1], w.pos[2]);
      const g = this._gh(this.pos[0] + p[0], this.pos[2] + p[2]);
      lowest = Math.min(lowest, this.pos[1] + p[1] - w.radius - g);
    }
    this.pos[1] -= lowest;
    // let the springs find their static compression
    this.c.thr = 0; this.input.throttle = 0; this.input.brake = 1; this.c.brake = 1;
    for (let i = 0; i < 480; i++) this.step(1 / 240);
    this.input.brake = 0; this.c.brake = 0;
    this.vel.fill(0); this.omega.fill(0);
    this.crashed = false; this.time = 0; this.events.length = 0;
    this.lastTouchdown = null;
  }

  // ------------------------------------------------------------------ controls
  _updateControls(dt) {
    const i = this.input, c = this.c, a = this.spec;
    const move = (cur, target, rate) => (cur < target ? Math.min(cur + rate * dt, target) : Math.max(cur - rate * dt, target));
    c.elev = move(c.elev, clamp(i.pitch + i.trim * 0.35, -1, 1), 5);
    c.ail = move(c.ail, clamp(i.roll, -1, 1), 7);
    c.rud = move(c.rud, clamp(i.yaw, -1, 1), 4.5);
    c.thr = move(c.thr, clamp(i.throttle, 0, 1), a.propulsion.spool ?? (a.propulsion.type === 'jet' ? 0.45 : 0.9));
    c.flap = move(c.flap, clamp(i.flaps, 0, 1), 0.22);
    c.brake = move(c.brake, clamp(i.brake, 0, 1), 6);
    c.air = move(c.air, clamp(i.airbrake, 0, 1), 1.2);
    if (a.gear.retractable) c.gear = move(c.gear, i.gear >= 0.5 ? 1 : 0, 0.28);
    else c.gear = 1;
  }

  // ------------------------------------------------------------------ aerodynamics
  /**
   * Lift coefficient with a soft stall. Attached flow is linear from CL0 and rounds off into CLmax; past the peak
   * the curve falls to about three quarters of CLmax and relaxes onto a flat-plate curve. Also sets stallDepth
   * (0 attached, 1 deeply stalled) and the peak angles used for the stall warning.
   */
  liftCoefficient(alpha, flap) {
    const ae = this.spec.aero;
    const CL0 = ae.CL0 + ae.CLflap * flap;
    const hi = ae.CLmax + ae.CLmaxFlap * flap;
    const lo = -0.85 * ae.CLmax;
    const kr = 0.1 * hi;
    const lin = CL0 + ae.CLa * alpha;
    const soft = (x, lim, r) => { const d = x - (lim - r); return d <= 0 ? x : d >= 2 * r ? lim : x - (d * d) / (4 * r); };
    const att = lin >= (hi + lo) / 2 ? soft(lin, hi, kr) : -soft(-lin, -lo, kr * 0.85);
    const aHi = (hi + kr - CL0) / ae.CLa, aLo = (lo - kr * 0.85 - CL0) / ae.CLa;
    this._aHi = aHi; this._aLo = aLo;
    this._stallDepth = 0;
    if (alpha <= aHi && alpha >= aLo) return att;
    const up = alpha > aHi;
    const over = up ? alpha - aHi : aLo - alpha;
    const edge = up ? aHi : aLo;
    const plate = (x) => 1.05 * Math.sin(2 * x);
    const post = plate(alpha) + (0.75 * (up ? hi : lo) - plate(edge)) * Math.exp(-over / 0.28);
    this._stallDepth = smoothstep(0, 0.16, over);
    return lerp(att, post, smoothstep(0, 0.06, over));
  }

  /** Steady-state aero for the trim solver: returns { CL, CD, Cm } at zero rates, no sideslip. */
  coefficients(alpha, flap = 0, elev = 0, wash = 1) {
    const ae = this.spec.aero;
    const CL = this.liftCoefficient(alpha, flap);
    const CD = ae.CD0 + ae.k * CL * CL + ae.CDflap * flap;
    const Cm = ae.Cm0 + ae.Cma * alpha + ae.control.elevator * wash * elev + ae.Cmflap * flap;
    return { CL, CD, Cm };
  }

  /**
   * Fly-by-wire pitch law for aircraft with limits.gLimiter. The stick commands angle of attack between the
   * 1 G reference (which holds the flight path, also in a bank) and a limit set by the structure and the stall.
   * A feedforward finds the elevator that balances the commanded alpha; feedback and pitch damping close the loop.
   * Below about 100 kt the pilot has the plain elevator, with the same alpha limit as a soft stop.
   */
  _fbwElevator(dt, qd, alpha, Qq, auth, CL, liftUp) {
    const a = this.spec, ae = a.aero, lim = a.limits, c = this.c;
    const qS = Math.max(qd * a.wing.area, 500), W = this.mass * G, flap = c.flap;
    const CL0 = ae.CL0 + ae.CLflap * flap;
    const sg = clamp(this.vel[1] / Math.max(this.tas, 20), -0.99, 0.99);
    const cg = Math.sqrt(1 - sg * sg);
    const nzRef = clamp((cg * cg) / Math.max(liftUp, 0.3 * cg), 0.2, lim.maxG * 0.6);
    const stick = clamp(this.input.pitch, -1, 1);
    // slow integrator on load factor error: with a centered stick the aircraft holds its flight path
    const dnz = nzRef - (qS * CL + this.thrust * Math.sin(alpha)) / W;
    if (Math.abs(stick) < 0.15 && this.ias > 60) this._aI = clamp((this._aI ?? 0) + 0.6 * dnz * W / (qS * ae.CLa) * dt, -0.08, 0.08);
    else this._aI = (this._aI ?? 0) * Math.max(0, 1 - 3 * dt);
    const a1 = (nzRef * W / qS - CL0) / ae.CLa + this._aI;
    const aHi = Math.max(a1, Math.min(this._aHi * 0.9, (lim.maxG * W / qS - CL0) / ae.CLa));
    const aLo = Math.min(a1, Math.max(this._aLo * 0.9, (-(lim.minG ?? 3) * W / qS - CL0) / ae.CLa));
    const want = stick >= 0 ? a1 + stick * (aHi - a1) : a1 + stick * (a1 - aLo);
    // shape the command: alpha may change at about 1.2 rad/s, which keeps the response free of overshoot
    const prevCmd = this._aCmd ?? alpha;
    const cmd = prevCmd + clamp(want - prevCmd, -1.2 * dt, 1.2 * dt);
    this._aCmd = cmd;
    const ff = -(ae.Cm0 + ae.Cma * cmd + ae.Cmflap * flap) / (ae.control.elevator * auth);
    const target = clamp(ff + 5 * (cmd - alpha) - 0.55 * Qq, -1, 1);
    const blend = smoothstep(50, 90, this.ias);
    // actuator rate limit on the computed command
    const prev = this._fbwOut ?? c.elev;
    const out = prev + clamp(target - prev, -7 * dt, 7 * dt);
    this._fbwOut = out;
    let direct = c.elev;
    if (direct > 0) direct *= clamp((this._aHi * 0.93 - alpha) / 0.05, 0, 1);
    return lerp(direct, out, blend);
  }

  /** Drag coefficient: parasitic, induced (scaled by ground effect), flaps, gear, airbrake, post-stall plate drag, Mach rise. */
  dragCoefficient(CL, alpha, stallDepth, mach, induced = 1) {
    const ae = this.spec.aero, c = this.c;
    let CD = ae.CD0 + ae.k * induced * CL * CL + ae.CDflap * c.flap + (this.spec.gear.retractable ? ae.CDgear * c.gear : 0) + (ae.CDair ?? 0.05) * c.air;
    CD += 1.15 * Math.sin(alpha) * Math.sin(alpha) * stallDepth;
    if (ae.machDrag) CD += ae.machDrag * smoothstep(ae.machCrit, ae.machCrit + 0.4, mach) * (1 - 0.3 * smoothstep(1.2, 2, mach));
    return CD;
  }

  _gust(dt) {
    // smooth pseudo-random gusts from summed sines, scaled by the turbulence setting and low-altitude roughness
    if (this.turbulence <= 0) { this._gx = this._gy = this._gz = 0; return; }
    this._noise += dt;
    const t = this._noise, s = this.turbulence * (1 + 1.2 * Math.exp(-this.agl / 120)) * 1.6;
    this._gx = s * (Math.sin(t * 0.71) + 0.6 * Math.sin(t * 1.93 + 1.3));
    this._gy = s * 0.7 * (Math.sin(t * 0.83 + 2.1) + 0.6 * Math.sin(t * 2.31 + 0.2));
    this._gz = s * (Math.sin(t * 0.67 + 4.2) + 0.6 * Math.sin(t * 2.07 + 3.1));
  }

  step(dt) {
    if (this.crashed) { this._crashedStep(dt); return; }
    const a = this.spec, ae = a.aero, S = a.wing.area, b = a.wing.span, ch = a.wing.chord;
    const pos = this.pos, vel = this.vel, c = this.c;
    this.time += dt;
    const m = this.mass;
    const atm = isa(pos[1]);
    quat.conjugate(this._qc, this.q);
    this._gust(dt);
    this._t[0] = vel[0] - this.wind[0] - this._gx; this._t[1] = vel[1] - this.wind[1] - this._gy; this._t[2] = vel[2] - this.wind[2] - this._gz;
    const vb = quat.rotate(this._vb, this._qc, this._t);
    const u = vb[0], v = vb[1], w = vb[2];
    const V = Math.max(Math.hypot(u, v, w), 0.5);
    this.tas = V;
    this.ias = V * Math.sqrt(atm.rho / RHO0);
    this.mach = V / atm.a;
    const qd = 0.5 * atm.rho * V * V;
    this.q_dyn = qd;
    this._updateControls(dt);

    // altitude above ground under the CG, refreshed less often when high
    this._groundTimer -= dt;
    if (this._groundTimer <= 0) {
      this.agl = pos[1] - this._gh(pos[0], pos[2]);
      this._groundTimer = this.agl > 300 ? 0.25 : this.agl > 60 ? 0.05 : 0;
    } else this.agl += vel[1] * dt;

    const alpha = Math.atan2(-v, Math.max(u, 0.01));
    const beta = Math.asin(clamp(w / V, -1, 1));
    this.alpha = alpha; this.beta = beta;
    const P = this.omega[0], Rr = this.omega[1], Qq = this.omega[2];

    // lift, drag, side force
    const CL = this.liftCoefficient(alpha, c.flap);
    const sd = this._stallDepth;
    this.stallDepth = sd;
    const aH = this._aHi;
    this.stallWarn = smoothstep(aH - 0.11, aH - 0.03, alpha) * (this.onGround ? 0.4 : 1);
    this.buffet = Math.max(smoothstep(aH - 0.05, aH + 0.02, alpha) * 0.6, sd);
    const wingH = this.agl + (a.wing.y ?? 0.4);
    const ge = (16 * wingH / b) ** 2;
    const CD = this.dragCoefficient(CL, alpha, sd, this.mach, 0.35 + 0.65 * (ge / (1 + ge)));
    const qS = qd * S;
    const vhx = u / V, vhy = v / V, vhz = w / V;
    let lx = -vhy * vhx, ly = 1 - vhy * vhy, lz = -vhy * vhz;
    const ll = Math.hypot(lx, ly, lz) || 1;
    lx /= ll; ly /= ll; lz /= ll;
    this._t2[0] = lx; this._t2[1] = ly; this._t2[2] = lz;
    const liftUp = quat.rotate(this._t, this.q, this._t2)[1];
    let Fx = qS * (CL * lx - CD * vhx);
    let Fy = qS * (CL * ly - CD * vhy);
    let Fz = qS * (CL * lz - CD * vhz - ae.Cyb * beta);

    const T = this._thrust(atm, V);
    this.thrust = T;
    Fx += T;

    // control authority: propwash on props, dynamic pressure scheduling and a G limiter on fly-by-wire jets
    const ce = ae.control;
    const wash = a.propulsion.type === 'prop' ? 1 + 0.55 * c.thr * Math.max(0, 1 - V / 40) : 1;
    const auth = ce.schedule ? Math.min(1, ce.schedule / Math.max(qd, 1)) : 1;
    const elev = a.limits.gLimiter ? this._fbwElevator(dt, qd, alpha, Qq, auth, CL, liftUp) : c.elev;
    const buffet = this.buffet > 0.05 ? (Math.sin(this.time * 47) * 0.6 + Math.sin(this.time * 71) * 0.4) * this.buffet : 0;

    // moments about the CG
    let Mz = qS * ch * (ae.Cm0 + ae.Cma * alpha + ae.Cmq * (Qq * ch) / (2 * V) + ce.elevator * wash * auth * elev + ae.Cmflap * c.flap - (ae.stallPitchDown ?? 0.18) * sd * Math.sign(alpha));
    let Mx = qS * b * (-ae.Clb * beta + ae.Clp * (1 - (ae.spin ?? 0.5) * 2.4 * sd) * (P * b) / (2 * V) + ce.aileron * auth * c.ail * (1 - 0.65 * sd));
    let My = qS * b * (-ae.Cnb * beta + ae.Cnr * (Rr * b) / (2 * V) - ce.rudder * wash * auth * c.rud + ae.Cnda * c.ail * 0.5);
    Mz += qS * ch * 0.012 * buffet;
    Mx += qS * b * 0.006 * buffet * Math.sin(this.time * 33);
    if (a.propulsion.type === 'prop') {
      const pw = a.propulsion.power * c.thr;
      const dir = a.propulsion.spin ?? 1;
      Mx -= dir * pw / Math.max(this.rpm * 0.10472, 80) * 0.8 * (1 - 0.85 * clamp(V / 45, 0, 1));
      My += dir * T * 0.14 * (1 - 0.7 * clamp(V / 55, 0, 1)) + dir * T * 0.3 * Math.sin(clamp(alpha, -0.5, 0.5));
    }

    // world specific force excluding gravity, accumulated over aero, thrust and ground contact
    quat.rotate(this._af, this.q, [Fx, Fy, Fz]);
    let afx = this._af[0] / m, afy = this._af[1] / m, afz = this._af[2] / m;
    let Mgx = 0, Mgy = 0, Mgz = 0;

    // ground contact: wheels then structural skids
    this.gearContactCount = 0;
    const near = this.agl < 40 + Math.abs(this.gearBottom);
    if (near) {
      for (const list of [this.wheels, this.skids]) {
        for (const cp of list) {
          if (!cp.skid && a.gear.retractable && cp.retract !== false && c.gear < 0.85) { cp.contact = false; cp.comp = 0; continue; }
          const r = this._contact(cp, dt, m);
          if (!r) continue;
          afx += r[0] / m; afy += r[1] / m; afz += r[2] / m;
          Mgx += r[3]; Mgy += r[4]; Mgz += r[5];
          if (this.crashed) return;
        }
      }
    } else for (const cp of this.wheels) { cp.contact = false; cp.comp = Math.max(0, cp.comp - dt * 0.8); }
    this.gearContactCount = 0;
    for (const cp of this.wheels) if (cp.contact) this.gearContactCount++;
    const wasGround = this.onGround;
    this.onGround = this.gearContactCount > 0;
    if (this.onGround && !wasGround) this._touchdown();
    if (!this.onGround) { this._preVy = vel[1]; this._airborneTime += dt; } else this._airborneTime = 0;

    // linear integration (semi-implicit Euler)
    vel[0] += afx * dt; vel[1] += (afy - G) * dt; vel[2] += afz * dt;
    pos[0] += vel[0] * dt; pos[1] += vel[1] * dt; pos[2] += vel[2] * dt;
    // load factor: specific force along the body up axis
    const upx = 2 * (this.q[0] * this.q[1] - this.q[3] * this.q[2]), upy = 1 - 2 * (this.q[0] * this.q[0] + this.q[2] * this.q[2]), upz = 2 * (this.q[1] * this.q[2] + this.q[3] * this.q[0]);
    this.gLoad = lerp(this.gLoad, (afx * upx + afy * upy + afz * upz) / G, 1 - Math.exp(-dt * 12));

    // angular dynamics: I dw/dt = M - w x I w
    const Ix = a.inertia[0], Iy = a.inertia[1], Iz = a.inertia[2];
    this.omega[0] += ((Mx + Mgx) - (Iz - Iy) * Rr * Qq) / Ix * dt;
    this.omega[1] += ((My + Mgy) - (Ix - Iz) * Qq * P) / Iy * dt;
    this.omega[2] += ((Mz + Mgz) - (Iy - Ix) * P * Rr) / Iz * dt;
    quat.integrate(this.q, this.omega[0], this.omega[1], this.omega[2], dt);

    // structural limits
    if (this.structural && !this.onGround) {
      if (this.ias > a.limits.vne * 1.22) { this._crash('airframe failure: overspeed'); return; }
      if (this.gLoad > a.limits.maxG * 1.65 || this.gLoad < -a.limits.maxG * 0.85) { this._crash(`airframe failure: ${this.gLoad.toFixed(1)} G`); return; }
    }

    // animation state
    if (this.onGround) {
      let rs = 0, n = 0;
      for (const wh of this.wheels) if (wh.contact) { rs += wh.rollSpeed; n++; }
      this.wheelAngle += (n ? rs / n : 0) * dt / 0.3;
    } else this.wheelAngle *= 1 - dt * 0.25;
    const p = a.propulsion, idle = p.idleRpm ?? (p.type === 'prop' ? 700 : 30);
    const rpmTarget = p.type === 'prop' ? idle + (p.maxRpm - idle) * c.thr * (this.fuel > 0 ? 1 : 0.02) : idle + (100 - idle) * c.thr * (this.fuel > 0 ? 1 : 0);
    this.rpm = lerp(this.rpm, rpmTarget, 1 - Math.exp(-dt * 2));
    this.propAngle = (this.propAngle + (this.rpm / 60) * Math.PI * 2 * dt * 0.3) % (Math.PI * 2);
    if (this.fuel > 0) {
      const burn = p.type === 'prop' ? (p.fuelBurn ?? 0.0105) * (0.12 + 0.88 * c.thr) : (p.fuelBurn ?? 0.6) * (0.08 + 0.92 * c.thr) * (this.afterburner ? 3.4 : 1);
      this.fuel = Math.max(0, this.fuel - burn * dt);
    }
    this.att = attitudeOf(this.q, this.att);
  }

  /** One ground contact (wheel or structural skid). Returns [Fx, Fy, Fz, Mx, My, Mz] (world force, body moment) or null. */
  _contact(cp, dt, m) {
    const pos = this.pos, vel = this.vel, c = this.c, rb = cp.pos;
    const wp = quat.rotate(this._t, this.q, rb);
    const wx = pos[0] + wp[0], wy = pos[1] + wp[1], wz = pos[2] + wp[2];
    const pen = this._gh(wx, wz) - (wy - cp.radius);
    if (pen <= 0) {
      cp.contact = false;
      cp.comp = Math.max(0, cp.comp - dt * 0.8);
      cp.rollSpeed *= 0.995;
      return null;
    }
    cp.surfTimer -= dt;
    if (cp.surfTimer <= 0 || !cp.contact) { cp.surf = surfaceProps(this._gs(wx, wz)); cp.surfTimer = 0.2; }
    if (cp.surf === SURFACES.WATER && !this.spec.amphibious && Math.hypot(vel[0], vel[2]) > 6) { this._crash('ditched in water'); return null; }
    // velocity of the contact point in world
    const o = this.omega;
    this._t2[0] = o[1] * rb[2] - o[2] * rb[1]; this._t2[1] = o[2] * rb[0] - o[0] * rb[2]; this._t2[2] = o[0] * rb[1] - o[1] * rb[0];
    const rv = quat.rotate(this._af, this.q, this._t2);
    const pvx = vel[0] + rv[0], pvy = vel[1] + rv[1], pvz = vel[2] + rv[2];
    const hs = Math.hypot(pvx, pvz);
    if (cp.skid) {
      // structural contact: crash on hard vertical impact, nose and wing tip strikes at speed
      if (!cp.contact && pvy < -4.5) { this._crash('structure strike'); return null; }
      if (!cp.contact && (cp.kind === 'tip' || cp.kind === 'nose') && hs > 12) { this._crash(cp.kind === 'tip' ? 'wing tip strike' : 'nose strike'); return null; }
      if (hs > 1) this.damage = Math.min(1, this.damage + dt * 0.03 * Math.min(hs / 20, 2));
    }
    const travel = cp.travel ?? 0.3;
    const comp = Math.min(pen, travel);
    let N = cp.k * comp - cp.c * Math.min(pvy, 6) * (pvy < 0 ? 1 : 0.6);
    if (pen > travel) N += cp.k * 3 * (pen - travel);
    N = clamp(N, 0, m * G * 7);
    cp.comp = comp;
    cp.contact = true;
    let fx, fz;
    if (cp.skid) {
      // sliding friction opposes the horizontal velocity
      const s = Math.tanh(hs * 2) / (hs || 1);
      fx = -pvx * s * cp.mu * N * (cp.surf.mu / 0.6); fz = -pvz * s * cp.mu * N * (cp.surf.mu / 0.6);
    } else {
      // wheel frame: forward follows steering, lateral is perpendicular in the ground plane
      const steer = cp.steer ? cp.steer * c.rud * (1 - clamp(this.ias / 40, 0, 0.85)) : 0;
      cp.steerAngle = steer;
      const cs = Math.cos(steer), sn = Math.sin(steer);
      const f = quat.rotate(this._t, this.q, [cs, 0, sn]);
      let dx = f[0], dz = f[2];
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const lx = -dz, lz = dx;
      const vf = pvx * dx + pvz * dz, vl = pvx * lx + pvz * lz;
      cp.rollSpeed = vf;
      const surf = cp.surf, mu = surf.mu;
      const sgn = Math.tanh(vf * 3);
      let Ffwd = -sgn * surf.crr * N;
      if (cp.brake) {
        const side = Math.sign(rb[2]) || 0;
        const diff = clamp(1 + side * c.rud * 0.7, 0.3, 1.7);
        Ffwd -= sgn * c.brake * 0.55 * N * (cp.brakeGain ?? 1) * diff;
      }
      let Flat = -clamp(vl * N * 2.4 * (cp.cornering ?? 1), -mu * N, mu * N);
      if (cp.castor) Flat *= cp.castor;
      fx = dx * Ffwd + lx * Flat; fz = dz * Ffwd + lz * Flat;
    }
    // moment about the CG from the world force applied at the contact point, in body axes
    const fb = quat.rotate(this._t2, this._qc, [fx, N, fz]);
    const bx = fb[0], by = fb[1], bz = fb[2];
    return [fx, N, fz, rb[1] * bz - rb[2] * by, rb[2] * bx - rb[0] * bz, rb[0] * by - rb[1] * bx];
  }

  _touchdown() {
    const vs = -this._preVy;
    if (this._airborneTime < 0.4) return;
    this.lastTouchdown = { vs, t: this.time, ias: this.ias, roll: this.att.roll };
    this.events.push({ type: 'touchdown', vs, t: this.time });
    const lim = this.spec.limits.crashVs ?? 7.5;
    if (vs > lim && this.structural) this._crash(`hard landing (${vs.toFixed(1)} m/s)`);
    else if (vs > lim * 0.6) { this.damage = Math.min(1, this.damage + (vs - lim * 0.6) / lim); this.events.push({ type: 'hardLanding', vs }); }
  }

  _thrust(atm, V) {
    const p = this.spec.propulsion, thr = this.c.thr;
    if (this.fuel <= 0) { this.afterburner = false; return 0; }
    const dens = atm.rho / RHO0;
    if (p.type === 'prop') {
      const P = p.power * thr * clamp((dens - 0.12) / 0.88, 0.1, 1);
      const eta = p.efficiency ?? 0.8;
      const disc = Math.PI * (p.propDiameter / 2) ** 2;
      const Ts = Math.cbrt(2 * atm.rho * disc) * Math.pow(Math.max(P, 1), 2 / 3) * (p.staticFactor ?? 0.7);
      const V0 = (eta * Math.max(P, 1)) / Math.max(Ts, 1);
      const windmill = (1 - thr) * 0.5 * atm.rho * V * V * disc * 0.045;
      return (eta * P) / (V + V0 * Math.exp(-V / 45)) - windmill;
    }
    const dry = p.thrust, ab = p.afterburner || 0;
    const abOn = ab > 0 && thr > 0.88;
    this.afterburner = abOn;
    const lvl = Math.min(thr, 0.88) / 0.88;
    let Tm = dry * (0.04 + 0.96 * lvl) * Math.pow(dens, 0.78) * (1 - 0.18 * clamp(V / 320, 0, 1.6) + 0.16 * smoothstep(120, 300, V));
    if (abOn) Tm += ab * ((thr - 0.88) / 0.12) * Math.pow(dens, 0.7) * (1 + 0.15 * smoothstep(150, 350, V));
    return Math.max(0, Tm);
  }

  _crash(reason) {
    if (this.crashed) return;
    this.crashed = true;
    this.crashReason = reason;
    this.events.push({ type: 'crash', reason });
    this.omega.fill(0);
    this.c.thr = 0;
  }

  _crashedStep(dt) {
    const k = 1 - Math.min(1, dt * 1.4);
    this.vel[0] *= k; this.vel[2] *= k; this.vel[1] = 0;
    const g = this._gh(this.pos[0], this.pos[2]);
    this.pos[1] = Math.max(g + 0.3, this.pos[1] - 9 * dt);
    this.pos[0] += this.vel[0] * dt; this.pos[2] += this.vel[2] * dt;
  }

  /** Fill the animation and instrument channels read by the aircraft instance. */
  updateChannels() {
    const ch = this.channels, c = this.c, att = this.att;
    ch.aileron = c.ail; ch.elevator = c.elev; ch.rudder = c.rud; ch.flap = c.flap; ch.throttle = c.thr; ch.gear = c.gear; ch.gearOut = c.gear > 0.02 ? 1 : 0;
    ch.brake = c.brake; ch.airbrake = c.air;
    ch.propAngle = this.propAngle; ch.wheelAngle = this.wheelAngle; ch.rpm = this.rpm; ch.afterburner = this.afterburner ? 1 : 0;
    ch.rudderL = clamp(-c.rud, 0, 1); ch.rudderR = clamp(c.rud, 0, 1);
    ch.iasKnots = this.ias * KT; ch.altFeet = this.pos[1] * FT; ch.vsFpm = this.vel[1] * FT * 60;
    ch.rollGauge = att.roll; ch.pitchGauge = att.pitch; ch.headingDeg = att.heading * 57.29578;
    ch.gLoad = this.gLoad; ch.stall = this.stallWarn; ch.machNumber = this.mach; ch.fuelKg = this.fuel;
    for (let i = 0; i < this.wheels.length; i++) ch['comp' + i] = this.wheels[i].comp;
    ch.steer = this.steerWheel ? this.steerWheel.steerAngle : 0;
    return ch;
  }
}

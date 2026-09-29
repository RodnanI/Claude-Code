import { TakeoffPilot, makeFrame, simulateTakeoff } from '../aircraft/flight/takeoff.js';
import { wrapPi } from '../core/util.js';

export const ASSIST_MODES = ['off', 'guide', 'auto'];
export const ASSIST_LABEL = { off: 'Off', guide: 'Runway guidance', auto: 'Automatic takeoff' };

/**
 * Finds the runway an aircraft is lined up on and runs a TakeoffPilot for it. In guidance mode the pilot only watches and the
 * HUD reads `info`; in automatic mode `apply` writes the pilot's commands onto the aircraft until the climb is established,
 * and any real input from the player hands the controls straight back (the mode falls to guidance).
 */
export class TakeoffAssist {
  constructor(world, ground = null) {
    this.ground = ground;
    this.scanT = 0;
    this.terrainWarn = false;
    this.runways = [];
    for (const r of world.regionsList) {
      for (const rw of r.runways || []) {
        const a = rw.ends[0], b = rw.ends[1];
        this.runways.push({ region: r.id, id: rw.id, length: rw.length, width: rw.width, surface: rw.surface, ends: rw.ends, bounds: [Math.min(a.x, b.x) - 400, Math.min(a.z, b.z) - 400, Math.max(a.x, b.x) + 400, Math.max(a.z, b.z) + 400] });
      }
    }
    this.mode = 'guide';
    this.pilot = null;
    this.info = null;
    this.controlling = false;
    this.lastThr = 0;
    this.done = false;
    this.delay = 0;
    this.quiet = 0;
    this.handedOver = false;
    this.estimate = null;
  }

  /** Begin a flight. `delay` holds an automatic takeoff on the brakes for that many seconds (the intro camera). */
  reset(mode, delay = 0) {
    this.mode = ASSIST_MODES.includes(mode) ? mode : 'guide';
    this.pilot = null; this.info = null; this.controlling = false; this.done = false; this.delay = delay; this.quiet = 0;
    this.lastThr = 0; this.handedOver = false;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'auto') this.controlling = false;
    if (mode === 'off') { this.pilot = null; this.info = null; }
  }

  cycle() {
    this.setMode(ASSIST_MODES[(ASSIST_MODES.indexOf(this.mode) + 1) % ASSIST_MODES.length]);
    return this.mode;
  }

  /** The runway the aircraft is on and lined up with: its frame (origin at the end it started from), or null. */
  lineup(m) {
    const px = m.pos[0], pz = m.pos[2], hd = m.att.heading;
    for (const rw of this.runways) {
      const b = rw.bounds;
      if (px < b[0] || px > b[2] || pz < b[1] || pz > b[3]) continue;
      for (let k = 0; k < 2; k++) {
        const e = rw.ends[k], o = rw.ends[1 - k];
        const heading = Math.atan2(o.x - e.x, -(o.z - e.z));
        if (Math.abs(wrapPi(heading - hd)) > 0.6) continue;
        const f = makeFrame(e.x, e.z, heading, rw.length);
        const dx = px - e.x, dz = pz - e.z;
        const u = dx * f.fx + dz * f.fz, v = dx * f.rx + dz * f.rz;
        if (u < -25 || u > rw.length || Math.abs(v) > rw.width / 2 + 6) continue;
        return { frame: f, rw, end: e.name, opposite: o.name };
      }
    }
    return null;
  }

  /** How much runway this aircraft needs from here to clear 50 ft, from the real flight model on flat ground, against what is left. */
  estimateFor(m, lu) {
    const f = lu.frame, w = m.wind;
    const head = -(w[0] * f.fx + w[2] * f.fz), cross = -(w[0] * f.rx + w[2] * f.rz);
    const surface = lu.rw.surface === 'grass' ? 'MOWN_STRIP' : lu.rw.surface === 'concrete' ? 'CONCRETE' : 'RUNWAY';
    const u = (m.pos[0] - f.x) * f.fx + (m.pos[2] - f.z) * f.fz, rem = Math.max(0, f.length - u);
    let slope = 0;
    if (this.ground && rem > 50) slope = (this.ground.h(f.x + f.fx * f.length, f.z + f.fz * f.length) - this.ground.h(m.pos[0], m.pos[2])) / rem;
    const r = simulateTakeoff(m.spec, { surface, elevation: m.pos[1] - 2, slope, head, cross, fuel: m.fuel, payload: m.payload });
    const need = r.ok ? r.d50 : Infinity;
    return { need, rem, short: need * 1.15 > rem, roll: r.roll, vLof: r.vLof };
  }

  /**
   * Advance the assist for one frame, before the player's inputs are copied to the aircraft. Returns true while an automatic
   * takeoff is flying the aircraft. `inp` is the player's control state, `lever` the throttle lever the aircraft last got.
   */
  update(dt, ent, inp) {
    const m = ent.model;
    if (this.mode === 'off' || m.crashed) { this.info = null; this.controlling = false; return false; }
    // takeoff is over once well above the ground: release everything
    if (this.pilot && this.pilot.phase === 'done') {
      this.quiet += dt;
      if (this.quiet > 5) { this.pilot = null; this.info = null; this.controlling = false; this.done = true; }
    }
    if (this.done && m.onGround && m.groundSpeed < 15) this.done = false;
    if (!this.pilot && !this.done) {
      const lu = m.onGround ? this.lineup(m) : null;
      if (lu) {
        this.pilot = new TakeoffPilot(m, lu.frame, { mode: this.mode === 'auto' ? 'auto' : 'guide', delay: this.delay });
        this.runway = lu;
        this.controlling = this.mode === 'auto';
        this.lastThr = m.input.throttle;
        this.estimate = this.estimateFor(m, lu);
        if (this.estimate.short && this.mode === 'auto') {
          // never start an automatic takeoff the flight model says will not fit: the player decides
          this.mode = 'guide'; this.pilot.mode = 'guide'; this.controlling = false;
          this.pilot.calls.push({ key: 'refuse', text: 'Runway too short for an automatic takeoff', tone: 'bad', need: this.estimate.need });
        }
      }
    }
    if (this.pilot && this.pilot.phase === 'hold' && !m.onGround && m.agl > 30) { this.pilot = null; this.info = null; this.controlling = false; return false; }
    if (!this.pilot) { this.info = null; return false; }
    if (this.mode === 'guide' && this.pilot.mode === 'auto') { this.pilot.mode = 'guide'; this.controlling = false; }
    if (this.mode === 'auto' && this.pilot.mode === 'guide' && this.pilot.phase === 'hold') { this.pilot.mode = 'auto'; this.controlling = true; this.lastThr = m.input.throttle; }
    // the player touching anything takes an automatic takeoff back
    if (this.controlling && this.pilot.phase !== 'hold' && this.pilot.phase !== 'done') {
      if (Math.abs(inp.pitch) > 0.4 || Math.abs(inp.roll) > 0.4 || Math.abs(inp.yaw) > 0.4 || inp.brake > 0.5 || Math.abs(inp.throttle - this.lastThr) > 0.04) {
        this.mode = 'guide'; this.pilot.mode = 'guide'; this.controlling = false;
        this.pilot.calls.push({ key: 'takeover', text: 'You have the controls', tone: 'info' });
      }
    }
    if (this.controlling) this._scanTerrain(dt, m, this.pilot);
    this.pilot.step(dt);
    if (this.pilot.phase === 'abort' && m.groundSpeed < 1.5) {
      // stopped after an abort: back to guidance, and a fresh attempt is possible once lined up again
      this.mode = 'guide'; this.controlling = false; this.pilot = null; this.info = null;
      return false;
    }
    if (this.controlling && this.pilot.phase === 'done') {
      // one automatic takeoff per request: afterwards the mode is plain guidance, and the game trims the aircraft for the handover
      this.controlling = false; this.handedOver = true; this.mode = 'guide';
    }
    const p = this.pilot, t = p.track;
    this.info = {
      mode: this.mode, controlling: this.controlling, phase: p.phase, cue: p.cue, tone: p.tone,
      runway: this.runway.end, length: this.runway.rw.length, width: this.runway.rw.width, surface: this.runway.rw.surface,
      u: t.u, v: t.v, rem: t.rem, hErr: t.hErr, vr: p.sp.vr, vClimb: p.sp.vClimb, frame: p.f, done: p.phase === 'done',
      terrain: this.terrainWarn, need: this.estimate ? this.estimate.need : null, short: !!(this.estimate && this.estimate.short && p.phase === 'hold'),
    };
    return this.controlling;
  }

  /**
   * Terrain ahead of an aircraft that is climbing out: follows the flight path forward and, when ground rises to within a
   * margin of it, turns the pilot toward the lower side. Cheap enough to run four times a second.
   */
  _scanTerrain(dt, m, p) {
    this.scanT -= dt;
    if (this.scanT > 0 || !this.ground || p.phase === 'roll' || p.phase === 'rotate' || p.phase === 'hold' || m.agl < 15) return;
    this.scanT = 0.25;
    const sp = m.groundSpeed;
    if (sp < 8) return;
    const ux = m.vel[0] / sp, uz = m.vel[2] / sp, gamma = Math.max(0, m.vel[1] / sp);
    let worst = Infinity;
    for (const d of [150, 300, 450, 600, 800]) worst = Math.min(worst, m.pos[1] + gamma * d - this.ground.h(m.pos[0] + ux * d, m.pos[2] + uz * d));
    if (worst < 14) {
      if (!p.turn) {
        const side = (k) => {
          const a = Math.atan2(m.vel[0], -m.vel[2]) + k * 0.6, x = Math.sin(a), z = -Math.cos(a);
          return this.ground.h(m.pos[0] + x * 300, m.pos[2] + z * 300) + this.ground.h(m.pos[0] + x * 600, m.pos[2] + z * 600);
        };
        p.turn = side(-1) <= side(1) ? -1 : 1;
        p.calls.push({ key: 'terrain' + Math.floor(p.t), text: 'Terrain ahead, turning away', tone: 'bad' });
      }
      this.terrainWarn = true;
    } else if (worst > 40) { p.turn = 0; this.terrainWarn = false; }
  }

  /** Callouts the pilot has queued (spoken as toasts by the game). */
  drain() { return this.pilot ? this.pilot.drain() : []; }

  /**
   * Write the automatic commands onto the aircraft. `game` supplies the flap notch and the throttle lever, which the assist
   * moves too so the player inherits the same settings at the handover.
   */
  apply(ent, game) {
    if (!this.controlling || !this.pilot) return;
    const m = ent.model, o = this.pilot.out, i = m.input;
    i.pitch = o.pitch; i.roll = o.roll; i.yaw = o.yaw; i.throttle = o.throttle; i.brake = o.brake;
    if (game.flapNotch !== o.flapNotch) game.flapNotch = o.flapNotch;
    i.flaps = game.flapNotch / 3;
    if (ent.spec.gear.retractable && o.gear === 0 && i.gear >= 0.5) i.gear = 0;
    game.input.throttle = o.throttle;
    this.lastThr = o.throttle;
  }
}


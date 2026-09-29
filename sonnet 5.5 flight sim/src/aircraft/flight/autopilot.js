import { clamp } from '../../core/util.js';

/**
 * Attitude, altitude, heading and speed hold. Drives a FlightModel through its normal input channels, so it works
 * for any aircraft that flies sensibly. Used by AI traffic, the test suite and the optional player autopilot.
 * Targets: alt (m), speed (m/s indicated), heading (rad). Any target left null is not held.
 */
export class Autopilot {
  constructor(model) {
    this.m = model;
    this.alt = null; this.speed = null; this.heading = null; this.pitch = null; this.roll = null;
    this.maxBank = 0.5;
    this.maxClimb = 4;
    this.cruiseThrottle = 0.6;
    this._iThr = 0; this._iPit = 0;
  }

  step(dt) {
    const m = this.m, i = m.input, att = m.att;
    let pitchT = this.pitch ?? 0.03;
    if (this.alt !== null) {
      const vsT = clamp((this.alt - m.pos[1]) * 0.12, -this.maxClimb, this.maxClimb);
      pitchT = clamp(0.03 + (vsT - m.vel[1]) * 0.035, -0.25, 0.3);
    }
    if (this.speed !== null) {
      const e = this.speed - m.ias;
      this._iThr = clamp(this._iThr + e * 0.0004 * dt * 60, -0.5, 0.5);
      i.throttle = clamp(this.cruiseThrottle + e * 0.04 + this._iThr, 0, 1);
    }
    const q = m.omega[2], p = m.omega[0];
    this._iPit = clamp(this._iPit + (pitchT - att.pitch) * dt * 0.25, -0.3, 0.3);
    i.pitch = clamp((pitchT - att.pitch) * 2.4 - q * 0.9 + this._iPit, -1, 1);
    let rollT = this.roll ?? 0;
    if (this.heading !== null) {
      let e = this.heading - att.heading;
      e = Math.atan2(Math.sin(e), Math.cos(e));
      rollT = clamp(e * 1.6, -this.maxBank, this.maxBank);
    }
    i.roll = clamp((rollT - att.roll) * 2.2 - p * 0.55, -1, 1);
    i.yaw = clamp(m.beta * 4 + m.omega[1] * 0.3, -1, 1);
  }
}

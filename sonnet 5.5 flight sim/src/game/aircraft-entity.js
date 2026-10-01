import { FlightModel } from '../aircraft/flight/model.js';
import { AircraftInstance } from '../aircraft/instance.js';
import { startAirborne } from '../aircraft/flight/trim.js';
import { quat, mat3 } from '../core/math.js';
import { DEG } from '../core/util.js';

/**
 * One flyable aircraft: flight model, renderable instance and the previous/current physics snapshots that let the
 * renderer interpolate between fixed steps.
 */
export class AircraftEntity {
  constructor(spec, { ground, registry = null, livery = 'default', fuel } = {}) {
    this.spec = spec;
    this.ground = ground;
    this.model = new FlightModel(spec, ground, { fuel });
    this.instance = registry ? new AircraftInstance(spec, registry, { livery }) : null;
    this.prevPos = new Float64Array(3); this.curPos = new Float64Array(3);
    this.prevQ = quat.create(); this.curQ = quat.create();
    this.pos = new Float64Array(3); this.q = quat.create(); this.rot = mat3.create();
    this.livery = livery;
    /** Channels the weapons write (stores left on the stations, bay doors, gun barrels): merged over the flight model's every frame. */
    this.extra = {};
  }

  _snap() {
    const m = this.model;
    this.prevPos.set(m.pos); this.curPos.set(m.pos);
    this.prevQ.set(m.q); this.curQ.set(m.q);
    this.interpolate(1);
  }

  placeOnGround(x, z, headingDeg, engineOff = true) {
    const m = this.model;
    m.pos[0] = x; m.pos[2] = z; m.pos[1] = this.ground.h(x, z) + 6;
    m.settleOnGround(headingDeg * DEG);
    if (engineOff) { m.input.throttle = 0; m.c.thr = 0; }
    m.updateChannels();
    this._snap();
  }

  placeAirborne({ x, y, z, headingDeg = 0, ias, flaps = 0, gear = 1 }) {
    const t = startAirborne(this.model, { x, y, z, heading: headingDeg * DEG, ias, flaps, gear });
    this.model.updateChannels();
    this._snap();
    return t;
  }

  /** One fixed physics step. */
  step(dt) {
    this.prevPos.set(this.curPos); this.prevQ.set(this.curQ);
    this.model.step(dt);
    this.curPos.set(this.model.pos); this.curQ.set(this.model.q);
  }

  interpolate(a) {
    const p = this.pos;
    p[0] = this.prevPos[0] + (this.curPos[0] - this.prevPos[0]) * a;
    p[1] = this.prevPos[1] + (this.curPos[1] - this.prevPos[1]) * a;
    p[2] = this.prevPos[2] + (this.curPos[2] - this.prevPos[2]) * a;
    quat.slerp(this.q, this.prevQ, this.curQ, a);
    mat3.fromQuat(this.rot, this.q);
    return this;
  }

  /** Append draw entries. mode 'cockpit' fills the cockpit list, otherwise the normal model list. */
  emit(models, cockpit, { mode = 'external', camPos, pxPerRad = 900, tint } = {}) {
    if (!this.instance) return;
    const dist = camPos ? Math.hypot(this.pos[0] - camPos[0], this.pos[1] - camPos[1], this.pos[2] - camPos[2]) : 0;
    const ch = this.model.updateChannels();
    Object.assign(ch, this.extra);
    this.instance.update(ch);
    this.instance.emit(models, cockpit, { pos: this.pos, rot: this.rot, mode, dist, pxPerRad, tint });
  }

  /** World position of a body-frame point. */
  worldPoint(out, x, y, z) {
    mat3.mulVec(out, this.rot, x, y, z);
    out[0] += this.pos[0]; out[1] += this.pos[1]; out[2] += this.pos[2];
    return out;
  }
}

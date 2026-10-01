import { ACTIONS, defaultBindings } from './bindings.js';
import { clamp } from '../core/util.js';

/**
 * Keyboard, mouse and gamepad folded into one flight control state. Digital keys ramp toward full deflection and
 * return to center, so keyboard flying feels analog. Mouse flight turns pointer position into a virtual stick.
 */
export class Input {
  constructor(target = window, canvas = null) {
    this.target = target;
    this.canvas = canvas;
    this.bindings = defaultBindings();
    this.down = new Set();          // action ids currently held
    this.edge = new Set();          // action ids pressed since the last consume
    this.codes = new Set();
    this.axes = { pitch: 0, roll: 0, yaw: 0 };
    this.throttle = 0;
    this.trim = 0;
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: 0, inside: false };
    this.look = { x: 0, y: 0, active: false };
    this.pad = null;
    this.enabled = true;
    this.padState = { pitch: 0, roll: 0, yaw: 0, throttleRate: 0, any: false };
    this.padActions = new Set();
    this._h = {};
  }

  attach() {
    const t = this.target;
    this._h.kd = (e) => {
      if (!this.enabled) return;
      if (e.code === 'F3' || e.code === 'F12' || e.code === 'Escape' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
      this.codes.add(e.code);
      const acts = this.bindings.get(e.code);
      if (!acts) return;
      for (const a of acts) { if (!this.down.has(a)) this.edge.add(a); this.down.add(a); }
    };
    this._h.ku = (e) => {
      this.codes.delete(e.code);
      const acts = this.bindings.get(e.code);
      if (!acts) return;
      for (const a of acts) {
        let still = false;
        for (const c of this.codes) { const l = this.bindings.get(c); if (l && l.includes(a)) { still = true; break; } }
        if (!still) this.down.delete(a);
      }
    };
    this._h.blur = () => { this.down.clear(); this.codes.clear(); this.mouse.buttons = 0; };
    this._h.mm = (e) => {
      const w = innerWidth || 1, h = innerHeight || 1;
      this.mouse.x = (e.clientX / w) * 2 - 1; this.mouse.y = (e.clientY / h) * 2 - 1;
      this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0;
      this.mouse.inside = true;
    };
    this._h.md = (e) => { this.mouse.buttons |= 1 << e.button; if (e.button === 2) e.preventDefault(); };
    this._h.mu = (e) => { this.mouse.buttons &= ~(1 << e.button); };
    this._h.cm = (e) => e.preventDefault();
    this._h.wheel = (e) => { this.wheelDelta = (this.wheelDelta || 0) + Math.sign(e.deltaY); };
    t.addEventListener('keydown', this._h.kd);
    t.addEventListener('keyup', this._h.ku);
    t.addEventListener('blur', this._h.blur);
    t.addEventListener('mousemove', this._h.mm);
    t.addEventListener('mousedown', this._h.md);
    t.addEventListener('mouseup', this._h.mu);
    t.addEventListener('contextmenu', this._h.cm);
    t.addEventListener('wheel', this._h.wheel, { passive: true });
    return this;
  }

  detach() {
    const t = this.target, h = this._h;
    t.removeEventListener('keydown', h.kd); t.removeEventListener('keyup', h.ku); t.removeEventListener('blur', h.blur);
    t.removeEventListener('mousemove', h.mm); t.removeEventListener('mousedown', h.md); t.removeEventListener('mouseup', h.mu);
    t.removeEventListener('contextmenu', h.cm); t.removeEventListener('wheel', h.wheel);
  }

  held(action) { return this.down.has(action) || this.padActions.has(action); }
  /** True once per key press. */
  pressed(action) { if (this.edge.has(action)) { this.edge.delete(action); return true; } return false; }
  clearEdges() { this.edge.clear(); }

  _pollPad(dead) {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null;
    for (const g of pads) if (g && g.connected && g.mapping === 'standard') { p = g; break; }
    const s = this.padState;
    if (!p) { this.pad = null; s.any = false; s.pitch = s.roll = s.yaw = s.throttleRate = 0; this.padActions = new Set(); return; }
    const dz = (v) => (Math.abs(v) < dead ? 0 : Math.sign(v) * (Math.abs(v) - dead) / (1 - dead));
    s.roll = dz(p.axes[0]); s.pitch = dz(p.axes[1]); s.yaw = dz(p.axes[2]);
    const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
    s.throttleRate = rt - lt;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const map = { 0: 'brake', 1: 'gear', 2: 'flapsDown', 3: 'flapsUp', 4: 'view', 5: 'airbrake', 9: 'pause', 8: 'map', 10: 'fire', 11: 'weapon', 12: 'trimUp', 13: 'trimDown' };
    const now = new Set();
    for (const [i, act] of Object.entries(map)) if (b(+i)) now.add(act);
    for (const act of now) if (!this.padActions.has(act)) this.edge.add(act);
    this.padActions = now;
    s.any = true;
    this.pad = p;
  }

  /**
   * Advance the control state. opts: { sensitivity, invertPitch, mouseFlight, deadzone }.
   * Returns { pitch, roll, yaw, throttle, brake, airbrake, trim } for the flight model.
   */
  update(dt, opts = {}) {
    const sens = opts.sensitivity ?? 1;
    this._pollPad(opts.deadzone ?? 0.08);
    const ramp = (cur, target, up, down) => {
      const rate = target === 0 ? down : Math.abs(target) > Math.abs(cur) || Math.sign(target) !== Math.sign(cur) ? up : down;
      return cur + (target - cur) * (1 - Math.exp(-rate * dt));
    };
    const key = (neg, pos) => (this.held(pos) ? 1 : 0) - (this.held(neg) ? 1 : 0);
    const kp = key('pitchDown', 'pitchUp'), kr = key('rollLeft', 'rollRight'), ky = key('yawLeft', 'yawRight');
    const s = this.padState;
    let tp = kp, tr = kr, ty = ky;
    if (opts.mouseFlight && this.mouse.inside) {
      const dzn = (v) => (Math.abs(v) < 0.06 ? 0 : (v - Math.sign(v) * 0.06) / 0.94);
      tr += dzn(this.mouse.x) * 1.4; tp += dzn(this.mouse.y) * 1.2;
    }
    if (s.any) { tp += s.pitch; tr += s.roll; ty += s.yaw; }
    const inv = opts.invertPitch ? -1 : 1;
    this.axes.pitch = ramp(this.axes.pitch, clamp(tp * inv, -1, 1), 5 * sens, 9);
    this.axes.roll = ramp(this.axes.roll, clamp(tr, -1, 1), 6 * sens, 10);
    this.axes.yaw = ramp(this.axes.yaw, clamp(ty, -1, 1), 5 * sens, 8);
    // throttle is a lever: it stays where it was left
    if (this.held('throttleUp')) this.throttle += 0.45 * dt;
    if (this.held('throttleDown')) this.throttle -= 0.45 * dt;
    if (s.any) this.throttle += s.throttleRate * 0.6 * dt;
    if (this.pressed('throttleFull')) this.throttle = 1;
    if (this.pressed('throttleIdle')) this.throttle = 0;
    this.throttle = clamp(this.throttle, 0, 1);
    if (this.held('trimUp')) this.trim += 0.35 * dt;
    if (this.held('trimDown')) this.trim -= 0.35 * dt;
    if (this.pressed('trimReset')) this.trim = 0;
    this.trim = clamp(this.trim, -1, 1);
    // free look: right mouse button drag, or arrow keys with Alt
    const look = this.look;
    if (this.mouse.buttons & 2) { look.x = clamp(look.x + this.mouse.dx * 0.004, -2.6, 2.6); look.y = clamp(look.y + this.mouse.dy * 0.004, -1.2, 1.2); look.active = true; }
    else { look.x *= Math.exp(-dt * 4); look.y *= Math.exp(-dt * 4); look.active = Math.abs(look.x) + Math.abs(look.y) > 0.01; }
    this.mouse.dx = this.mouse.dy = 0;
    const click = !!(this.mouse.buttons & 1) && this.mouse.inside;
    const fire = this.held('fire') || click;
    // a missile or a bomb leaves on the press, a gun or a rocket pod while the trigger is held
    const fireEdge = fire && !this._fireHeld;
    this._fireHeld = fire;
    return { pitch: this.axes.pitch, roll: this.axes.roll, yaw: this.axes.yaw, throttle: this.throttle, brake: this.held('brake') ? 1 : 0, airbrake: this.held('airbrake') ? 1 : 0, trim: this.trim, fire, fireEdge };
  }
}

export { ACTIONS };

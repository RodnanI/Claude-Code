import { clamp } from '../core/util.js';
import { KT, FT } from '../aircraft/flight/model.js';

const INK = '#15120e', PAPER = '#ece3cf', DIM = '#b9ae96', ORANGE = '#ff5a1f', AMBER = '#f2c230', GREEN = '#8fe0a8';
const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, "Liberation Mono", monospace';
const COND = '"Bahnschrift", "DIN Condensed", "Arial Narrow", "Roboto Condensed", Arial, sans-serif';

/** Unit conversion for display. */
export function unitsFor(system) {
  return system === 'metric'
    ? { speed: (ms) => ms * 3.6, speedUnit: 'km/h', alt: (m) => m, altUnit: 'm', vs: (ms) => ms, vsUnit: 'm/s', vsDigits: 1 }
    : { speed: (ms) => ms * KT, speedUnit: 'kt', alt: (m) => m * FT, altUnit: 'ft', vs: (ms) => ms * FT * 60, vsUnit: 'fpm', vsDigits: 0 };
}

/**
 * 2D overlay: an instrument strip for light aircraft and a full HUD (pitch ladder, flight path marker, tapes) for
 * aircraft whose spec asks for hud: 'fighter'. Also shows short messages.
 */
export class Hud {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 1; this.h = 1; this.dpr = 1;
    this.toasts = [];
    this.visible = true;
    this.warn = { stall: 0, gear: 0, overspeed: 0, fuel: 0 };
    this.tmp = new Float64Array(3);
  }

  resize(w, h, dpr = 1) {
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(w * dpr)); this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.w = w; this.h = h;
  }

  toast(text, ms = 2600, tone = 'info') { this.toasts.push({ text, t: ms, life: ms, tone }); if (this.toasts.length > 4) this.toasts.shift(); }

  clear() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

  /** Screen position of a world direction, or null when behind the camera. */
  project(cam, dx, dy, dz) {
    const v = cam.view;
    const cx = v[0] * dx + v[4] * dy + v[8] * dz, cy = v[1] * dx + v[5] * dy + v[9] * dz, cz = v[2] * dx + v[6] * dy + v[10] * dz;
    if (cz > -1e-3) return null;
    const t = Math.tan(cam.fov / 2);
    return [this.w / 2 + (cx / -cz / (t * cam.aspect)) * (this.w / 2), this.h / 2 - (cy / -cz / t) * (this.h / 2)];
  }

  /**
   * Draw one frame. s = { ent, cam, view, units, scale, dt, crashed }.
   */
  draw(s) {
    this.clear();
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._toasts(s.dt);
    if (!this.visible || !s.ent) return;
    const m = s.ent.model, spec = s.ent.spec, u = unitsFor(s.units);
    const scale = (s.scale || 1) * clamp(Math.min(this.w / 1280, this.h / 720), 0.7, 1.5);
    this._warnings(m, spec, s, scale);
    if (m.crashed) return;
    if (spec.hud === 'fighter') this._fighter(s, m, spec, u, scale);
    else if (s.view === 'cockpit') this._mini(s, m, u, scale);
    else this._strip(s, m, spec, u, scale);
  }

  _text(str, x, y, size, color = PAPER, align = 'left', font = MONO, weight = '600') {
    const c = this.ctx;
    c.font = `${weight} ${size}px ${font}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle';
    c.fillText(str, x, y);
  }

  _toasts(dt) {
    const c = this.ctx;
    let y = this.h * 0.16;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t -= (dt || 0.016) * 1000;
      if (t.t <= 0) { this.toasts.splice(i, 1); continue; }
    }
    for (const t of this.toasts) {
      const a = clamp(Math.min(t.t / 300, (t.life - t.t) / 150), 0, 1);
      c.globalAlpha = a;
      c.font = `700 17px ${COND}`;
      const w = c.measureText(t.text.toUpperCase()).width + 30;
      c.fillStyle = 'rgba(21,18,14,0.78)'; c.fillRect(this.w / 2 - w / 2, y - 15, w, 30);
      c.fillStyle = t.tone === 'bad' ? ORANGE : t.tone === 'good' ? '#9bd06b' : AMBER; c.fillRect(this.w / 2 - w / 2, y - 15, 4, 30);
      c.fillStyle = PAPER; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t.text.toUpperCase(), this.w / 2 + 2, y + 1);
      y += 36;
    }
    c.globalAlpha = 1;
  }

  _warnings(m, spec, s, k) {
    const c = this.ctx;
    const items = [];
    if (m.stallWarn > 0.5 && !m.onGround) items.push('STALL');
    if (m.ias > spec.limits.vne * 0.97 && !m.onGround) items.push('OVERSPEED');
    if (!m.onGround && spec.gear.retractable && m.c.gear < 0.99 && m.agl < 120 && m.vel[1] < -1 && m.ias < spec.limits.gearSpeed) items.push('GEAR');
    if (m.fuel < m.spec.mass.fuel * 0.08 && m.fuel > 0) items.push('LOW FUEL'); else if (m.fuel <= 0) items.push('NO FUEL');
    if (m.gLoad > spec.limits.maxG * 0.9) items.push('G LIMIT');
    if (!items.length) return;
    const blink = Math.floor(performance.now() / 260) % 2 === 0;
    let y = this.h * 0.3;
    for (const it of items) {
      c.font = `700 ${Math.round(26 * k)}px ${COND}`;
      const w = c.measureText(it).width + 34 * k;
      c.fillStyle = blink ? ORANGE : '#8a2f0e';
      c.fillRect(this.w / 2 - w / 2, y - 18 * k, w, 36 * k);
      c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it, this.w / 2, y + 1);
      y += 44 * k;
    }
  }

  /** Bottom instrument strip: an operations board look, no gradients. */
  _strip(s, m, spec, u, k) {
    const c = this.ctx;
    const cells = [
      ['SPEED', u.speed(m.ias).toFixed(0), u.speedUnit],
      ['ALT', (Math.round(u.alt(m.pos[1]) / 10) * 10).toFixed(0), u.altUnit],
      ['V/S', u.vs(m.vel[1]).toFixed(u.vsDigits), u.vsUnit],
      ['HDG', String(Math.round(m.att.heading * 57.2958) % 360).padStart(3, '0'), 'deg'],
      ['THR', String(Math.round(m.c.thr * 100)), '%'],
      ['FLAP', String(Math.round(m.c.flap * 3)), ''],
    ];
    if (spec.gear.retractable) cells.push(['GEAR', m.c.gear > 0.98 ? 'DOWN' : m.c.gear < 0.02 ? 'UP' : 'MOVING', '']);
    cells.push(['FUEL', Math.round((m.fuel / spec.mass.fuel) * 100).toString(), '%']);
    const cw = 92 * k, ch = 54 * k, gap = 3 * k;
    const total = cells.length * cw + (cells.length - 1) * gap;
    let x = this.w / 2 - total / 2;
    const y = this.h - ch - 20 * k;
    // hazard stripe cap
    c.fillStyle = AMBER; c.fillRect(x, y - 6 * k, total, 4 * k);
    c.fillStyle = INK;
    for (let sx = x; sx < x + total; sx += 16 * k) { c.beginPath(); c.moveTo(sx, y - 6 * k); c.lineTo(sx + 8 * k, y - 6 * k); c.lineTo(sx + 4 * k, y - 2 * k); c.lineTo(sx - 4 * k, y - 2 * k); c.closePath(); c.fill(); }
    for (const [label, val, unit] of cells) {
      c.fillStyle = 'rgba(21,18,14,0.82)'; c.fillRect(x, y, cw, ch);
      c.fillStyle = '#2c271f'; c.fillRect(x, y, cw, 3 * k);
      this._text(label, x + 8 * k, y + 14 * k, 10.5 * k, DIM, 'left', COND, '700');
      this._text(val, x + cw / 2, y + 34 * k, 22 * k, PAPER, 'center');
      if (unit) this._text(unit, x + cw - 6 * k, y + 14 * k, 10 * k, ORANGE, 'right', COND, '700');
      x += cw + gap;
    }
    if (m.onGround && m.groundSpeed < 1 && m.c.thr < 0.05) this._text('THROTTLE UP: SHIFT   BRAKES: SPACE   VIEW: X', this.w / 2, y - 26 * k, 13 * k, DIM, 'center', MONO);
  }

  _mini(s, m, u, k) {
    const line = `${u.speed(m.ias).toFixed(0)} ${u.speedUnit}   ${(Math.round(u.alt(m.pos[1]) / 10) * 10).toFixed(0)} ${u.altUnit}   ${String(Math.round(m.att.heading * 57.2958) % 360).padStart(3, '0')} deg`;
    this.ctx.globalAlpha = 0.75;
    this._text(line, 18 * k, this.h - 22 * k, 13 * k, PAPER, 'left', MONO);
    this.ctx.globalAlpha = 1;
  }

  /** Head-up display with pitch ladder, flight path marker, speed and altitude tapes. */
  _fighter(s, m, spec, u, k) {
    const c = this.ctx, cam = s.cam;
    const col = s.view === 'cockpit' ? GREEN : PAPER;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1.2, 1.6 * k);
    const W = this.w, H = this.h;
    const cx = W / 2, cy = H / 2;
    const hd = m.att.heading;
    // pitch ladder anchored to the world through the camera
    const rows = [];
    for (let p = -30; p <= 60; p += 5) rows.push(p);
    c.save();
    c.beginPath(); c.rect(W * 0.2, H * 0.14, W * 0.6, H * 0.7); c.clip();
    for (const p of rows) {
      const el = (p * Math.PI) / 180;
      const dir = (az) => [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
      const half = p === 0 ? 0.22 : 0.075;
      const a = dir(hd - half), b = dir(hd + half);
      const pa = this.project(cam, a[0], a[1], a[2]), pb = this.project(cam, b[0], b[1], b[2]);
      if (!pa || !pb) continue;
      if (p === 0) { c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(pb[0], pb[1]); c.stroke(); continue; }
      const tick = 10 * k * (p > 0 ? 1 : -1);
      if (p < 0) c.setLineDash([6 * k, 5 * k]);
      c.beginPath(); c.moveTo(pa[0], pa[1] + tick * 0.6); c.lineTo(pa[0], pa[1]); c.lineTo(pa[0] + (pb[0] - pa[0]) * 0.36, pa[1] + (pb[1] - pa[1]) * 0.36);
      c.moveTo(pb[0] - (pb[0] - pa[0]) * 0.36, pb[1] - (pb[1] - pa[1]) * 0.36); c.lineTo(pb[0], pb[1]); c.lineTo(pb[0], pb[1] + tick * 0.6); c.stroke();
      c.setLineDash([]);
      this._text(String(Math.abs(p)), pa[0] - 12 * k, pa[1], 11 * k, col, 'right');
      this._text(String(Math.abs(p)), pb[0] + 12 * k, pb[1], 11 * k, col, 'left');
    }
    // flight path marker
    const sp = Math.hypot(m.vel[0], m.vel[1], m.vel[2]);
    if (sp > 12) {
      const fp = this.project(cam, m.vel[0] / sp, m.vel[1] / sp, m.vel[2] / sp);
      if (fp) {
        const r = 8 * k;
        c.beginPath(); c.arc(fp[0], fp[1], r, 0, Math.PI * 2); c.moveTo(fp[0] - r, fp[1]); c.lineTo(fp[0] - r * 2.2, fp[1]); c.moveTo(fp[0] + r, fp[1]); c.lineTo(fp[0] + r * 2.2, fp[1]); c.moveTo(fp[0], fp[1] - r); c.lineTo(fp[0], fp[1] - r * 1.8); c.stroke();
      }
    }
    // boresight
    c.beginPath(); c.arc(cx, cy, 3 * k, 0, Math.PI * 2); c.stroke();
    c.restore();
    // speed tape (left), altitude tape (right)
    const tape = (x, val, step, dir, label, unit) => {
      const th = 210 * k;
      c.save(); c.beginPath(); c.rect(x - 46 * k, cy - th / 2, 92 * k, th); c.clip();
      for (let v = Math.floor((val - 60) / step) * step; v <= val + 60; v += step) {
        const y = cy - ((v - val) / 60) * (th / 2);
        const major = Math.round(v / step) % 5 === 0;
        c.beginPath(); c.moveTo(x + dir * 30 * k, y); c.lineTo(x + dir * (major ? 44 : 38) * k, y); c.stroke();
        if (major && v >= 0) this._text(String(Math.round(v)), x + dir * 20 * k, y, 11 * k, col, dir > 0 ? 'right' : 'left');
      }
      c.restore();
      c.strokeRect(x - (dir > 0 ? 32 : 4) * k, cy - 12 * k, 62 * k * 0.6 + 4 * k, 24 * k);
      this._text(String(Math.round(val)), x + dir * -4 * k, cy, 15 * k, col, dir > 0 ? 'right' : 'left');
      this._text(label, x, cy - th / 2 - 12 * k, 10 * k, col, 'center', COND);
      this._text(unit, x, cy + th / 2 + 12 * k, 10 * k, col, 'center', COND);
    };
    const xs = cx - W * 0.28, xa = cx + W * 0.28;
    tape(xs, u.speed(m.ias), 10, 1, 'IAS', u.speedUnit);
    tape(xa, u.alt(m.pos[1]), u.altUnit === 'ft' ? 100 : 50, -1, 'ALT', u.altUnit);
    // heading tape
    const hy = H * 0.12;
    c.save(); c.beginPath(); c.rect(cx - 150 * k, hy - 14 * k, 300 * k, 30 * k); c.clip();
    const hdg = m.att.heading * 57.2958;
    for (let d = Math.floor((hdg - 30) / 5) * 5; d <= hdg + 30; d += 5) {
      const x = cx + ((d - hdg) / 30) * 150 * k;
      const major = d % 10 === 0;
      c.beginPath(); c.moveTo(x, hy + 10 * k); c.lineTo(x, hy + (major ? -2 : 3) * k); c.stroke();
      if (major) { const n = ((Math.round(d / 10) * 10) % 360 + 360) % 360; this._text(n === 0 ? 'N' : n === 90 ? 'E' : n === 180 ? 'S' : n === 270 ? 'W' : String(n / 10), x, hy - 8 * k, 11 * k, col, 'center'); }
    }
    c.restore();
    c.beginPath(); c.moveTo(cx, hy + 14 * k); c.lineTo(cx - 5 * k, hy + 21 * k); c.lineTo(cx + 5 * k, hy + 21 * k); c.closePath(); c.fill();
    // side readouts
    const rd = (label, val, x, y, warn) => { this._text(label, x, y, 10 * k, col, 'left', COND); this._text(val, x + 40 * k, y, 14 * k, warn ? ORANGE : col, 'left'); };
    const bx = cx - W * 0.35, by = cy + H * 0.2;
    rd('M', m.mach.toFixed(2), bx, by);
    rd('G', m.gLoad.toFixed(1), bx, by + 22 * k, m.gLoad > spec.limits.maxG * 0.85);
    rd('AOA', (m.ias > 12 ? m.alpha * 57.2958 : 0).toFixed(1), bx, by + 44 * k, m.stallWarn > 0.5); // meaningless at walking pace, where wind alone gives huge angles
    const rx = cx + W * 0.3;
    rd('THR', m.afterburner ? 'AB' : String(Math.round(m.c.thr * 100)), rx, by);
    rd('V/S', u.vs(m.vel[1]).toFixed(u.vsDigits), rx, by + 22 * k);
    rd('FUEL', Math.round(m.fuel) + ' kg', rx, by + 44 * k);
    const cfg = `${m.c.gear > 0.98 ? 'GEAR ' : ''}${m.c.flap > 0.05 ? 'FLAP ' : ''}${m.c.air > 0.3 ? 'BRAKE' : ''}`.trim();
    if (cfg) this._text(cfg, cx, H * 0.87, 13 * k, col, 'center');
  }
}

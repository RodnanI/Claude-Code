import { clamp } from '../core/util.js';
import { KT, FT } from '../aircraft/flight/model.js';

const INK = '#15120e', PAPER = '#ece3cf', DIM = '#b9ae96', ORANGE = '#ff5a1f', AMBER = '#f2c230', GREEN = '#8fe0a8';
const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, "Liberation Mono", monospace';
const COND = '"Bahnschrift", "DIN Condensed", "Arial Narrow", "Roboto Condensed", Arial, sans-serif';

/** Unit conversion for display. */
export function unitsFor(system) {
  return system === 'metric'
    ? { speed: (ms) => ms * 3.6, speedUnit: 'km/h', alt: (m) => m, altUnit: 'm', vs: (ms) => ms, vsUnit: 'm/s', vsDigits: 1, dist: (m) => m, distUnit: 'm' }
    : { speed: (ms) => ms * KT, speedUnit: 'kt', alt: (m) => m * FT, altUnit: 'ft', vs: (ms) => ms * FT * 60, vsUnit: 'fpm', vsDigits: 0, dist: (m) => m * FT, distUnit: 'ft' };
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
    if (s.course) this._course(s.course, s.cam, scale);
    this._warnings(m, spec, s, scale);
    if (s.assist && !m.crashed) { this._runwayPath(s.assist, s, m, scale); this._takeoff(s.assist, m, u, scale, spec.hud === 'fighter'); }
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

  /** Course panel and a pointer to the next gate: a diamond on the gate when it is on screen, else an arrow on the screen edge. */
  _course(c, cam, k) {
    const ctx = this.ctx;
    const x = 22 * k, y = 22 * k, w = 200 * k, h = 88 * k;
    ctx.fillStyle = 'rgba(21,18,14,0.78)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ORANGE; ctx.fillRect(x, y, 4 * k, h);
    this._text(c.name.toUpperCase(), x + 16 * k, y + 16 * k, 11 * k, DIM, 'left', COND, '700');
    this._text(c.finished ? 'COMPLETE' : `GATE ${c.index} / ${c.total}`, x + 16 * k, y + 41 * k, 24 * k, PAPER, 'left', COND, '700');
    this._text(c.timeText, x + 16 * k, y + 68 * k, 16 * k, AMBER);
    if (c.bestText) this._text('BEST ' + c.bestText, x + w - 10 * k, y + 68 * k, 11 * k, DIM, 'right');
    if (c.finished) return;
    const dx = c.x - cam.pos[0], dy = c.y - cam.pos[1], dz = c.z - cam.pos[2];
    const dist = Math.hypot(dx, dy, dz);
    // the area the pointer may use: clear of the panel row above and the instrument strip below
    const x0 = 48 * k, x1 = this.w - 48 * k, y0 = 60 * k, y1 = this.h - 130 * k, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const p = this.project(cam, dx, dy, dz);
    const label = dist < 1000 ? Math.round(dist) + ' m' : (dist / 1000).toFixed(1) + ' km';
    ctx.lineWidth = 3 * k; ctx.strokeStyle = ORANGE; ctx.fillStyle = ORANGE;
    if (p && p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1) {
      const r = 13 * k;
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - r); ctx.lineTo(p[0] + r, p[1]); ctx.lineTo(p[0], p[1] + r); ctx.lineTo(p[0] - r, p[1]); ctx.closePath(); ctx.stroke();
      this._text(label, p[0], p[1] + r + 14 * k, 13 * k, PAPER, 'center');
    } else {
      const v = cam.view, cx = v[0] * dx + v[4] * dy + v[8] * dz, cy = v[1] * dx + v[5] * dy + v[9] * dz;
      const len = Math.hypot(cx, cy) || 1, ux = cx / len, uy = -cy / len;
      const t = 1 / Math.max(Math.abs(ux) / ((x1 - x0) / 2), Math.abs(uy) / ((y1 - y0) / 2), 1e-6);
      const sx = mx + ux * t, sy = my + uy * t, r = 15 * k;
      ctx.beginPath();
      ctx.moveTo(sx + ux * r, sy + uy * r); ctx.lineTo(sx - ux * r * 0.7 - uy * r * 0.8, sy - uy * r * 0.7 + ux * r * 0.8); ctx.lineTo(sx - ux * r * 0.7 + uy * r * 0.8, sy - uy * r * 0.7 - ux * r * 0.8);
      ctx.closePath(); ctx.fill();
      this._text(label, sx - ux * r * 3.2, sy - uy * r * 3.2, 13 * k, PAPER, 'center');
    }
  }

  _warnings(m, spec, s, k) {
    const c = this.ctx;
    const items = [];
    if (m.stallWarn > 0.5 && !m.onGround) items.push('STALL');
    if (m.ias > spec.limits.vne * 0.97 && !m.onGround) items.push('OVERSPEED');
    if (!m.onGround && spec.gear.retractable && m.c.gear < 0.99 && m.agl < 120 && m.vel[1] < -1 && m.ias < spec.limits.gearSpeed) items.push('GEAR');
    if (m.fuel < m.spec.mass.fuel * 0.08 && m.fuel > 0) items.push('LOW FUEL'); else if (m.fuel <= 0) items.push('NO FUEL');
    if (m.gLoad > spec.limits.maxG * 0.9) items.push('G LIMIT');
    if (s.assist && s.assist.terrain && !m.onGround) items.push('TERRAIN');
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

  /** Chevrons along the runway centerline ahead of the aircraft, drawn in perspective: something to steer at during the roll. */
  _runwayPath(a, s, m, k) {
    if (!a.frame || (a.phase !== 'hold' && a.phase !== 'roll' && a.phase !== 'rotate')) return;
    const c = this.ctx, f = a.frame, cam = s.cam;
    const gy = m.pos[1] - Math.max(m.agl, 0) - 0.2;
    c.lineWidth = Math.max(1.5, 2 * k); c.lineCap = 'round'; c.lineJoin = 'round';
    for (let d = 12; d <= 420; d += d < 160 ? 12 : 30) {
      const uu = a.u + d;
      if (uu > f.length - 5) break;
      const dx = f.x + f.fx * uu - cam.pos[0], dy = gy - cam.pos[1], dz = f.z + f.fz * uu - cam.pos[2];
      const p = this.project(cam, dx, dy, dz);
      if (!p || p[0] < 0 || p[0] > this.w || p[1] < 0 || p[1] > this.h) continue;
      const dist = Math.hypot(dx, dy, dz), sz = clamp(700 / dist, 2, 11) * k;
      c.globalAlpha = clamp(0.85 - d / 520, 0.12, 0.85);
      c.strokeStyle = AMBER;
      c.beginPath(); c.moveTo(p[0] - sz, p[1] + sz * 0.3); c.lineTo(p[0], p[1] - sz * 0.3); c.lineTo(p[0] + sz, p[1] + sz * 0.3); c.stroke();
    }
    c.globalAlpha = 1; c.lineCap = 'butt';
  }

  /** The takeoff panel: runway, cross-track offset against the runway width, speed against the rotation speed, what to do next. */
  _takeoff(a, m, u, k, corner = false) {
    const c = this.ctx;
    // the fighter HUD owns the middle and both sides at eye height, so its panel sits in the top corner
    const W = 304 * k, Hh = 128 * k, x = this.w - W - 20 * k, y = corner ? 20 * k : Math.max(96 * k, this.h * 0.27);
    const tone = a.tone === 'bad' ? ORANGE : a.tone === 'good' ? GREEN : AMBER;
    const cue = a.short ? 'Runway is short for this aircraft' : a.cue;
    const cueTone = a.short ? ORANGE : tone;
    c.fillStyle = 'rgba(21,18,14,0.8)'; c.fillRect(x, y, W, Hh);
    c.fillStyle = a.controlling ? ORANGE : '#6b7444'; c.fillRect(x, y, 4 * k, Hh);
    this._text(`RUNWAY ${a.runway}`, x + 16 * k, y + 17 * k, 18 * k, PAPER, 'left', COND, '700');
    this._text(a.controlling ? 'AUTO TAKEOFF' : 'GUIDANCE', x + W - 10 * k, y + 17 * k, 11.5 * k, a.controlling ? ORANGE : DIM, 'right', COND, '700');
    // cross-track: the bar spans the runway, the diamond is the aircraft
    const bx0 = x + 18 * k, bx1 = x + W - 14 * k, bw = bx1 - bx0, by = y + 44 * k, half = Math.max(a.width || 30, 10) / 2;
    c.fillStyle = '#2c271f'; c.fillRect(bx0, by - 4 * k, bw, 8 * k);
    c.fillStyle = '#4a4234';
    for (let i = 0; i <= 4; i++) c.fillRect(bx0 + (bw * i) / 4 - 1 * k, by - 7 * k, 2 * k, 14 * k);
    const off = clamp(a.v / half, -1.15, 1.15), ox = bx0 + bw / 2 + off * (bw / 2);
    const ok = Math.abs(off) < 0.3, close = Math.abs(off) < 0.65;
    c.fillStyle = ok ? PAPER : close ? AMBER : ORANGE;
    c.beginPath(); c.moveTo(ox, by - 8 * k); c.lineTo(ox + 7 * k, by); c.lineTo(ox, by + 8 * k); c.lineTo(ox - 7 * k, by); c.closePath(); c.fill();
    this._text(Math.abs(a.v) < 0.8 ? 'ON THE LINE' : `${a.v < 0 ? 'LEFT' : 'RIGHT'} ${Math.abs(a.v).toFixed(0)} m`, x + 16 * k, y + 62 * k, 10.5 * k, ok ? DIM : cueTone, 'left', COND, '700');
    // speed against the rotation speed
    const sy = y + 84 * k, top = a.vr * 1.2, vx = bx0 + bw * (a.vr / top);
    c.fillStyle = '#2c271f'; c.fillRect(bx0, sy - 4 * k, bw, 8 * k);
    c.fillStyle = m.ias >= a.vr ? GREEN : AMBER; c.fillRect(bx0, sy - 4 * k, bw * clamp(m.ias / top, 0, 1), 8 * k);
    c.fillStyle = PAPER; c.fillRect(vx - 1.5 * k, sy - 9 * k, 3 * k, 18 * k);
    this._text(`VR ${u.speed(a.vr).toFixed(0)}`, vx, sy - 15 * k, 10 * k, PAPER, 'center', COND, '700');
    this._text(`${u.speed(m.ias).toFixed(0)} ${u.speedUnit}`, x + 16 * k, sy + 15 * k, 10.5 * k, DIM, 'left', COND, '700');
    this._text(`${Math.max(0, Math.round(u.dist(a.rem) / 10) * 10)} ${u.distUnit} LEFT`, x + W - 10 * k, sy + 15 * k, 10.5 * k, a.rem < 300 && a.phase !== 'climb' && a.phase !== 'done' ? ORANGE : DIM, 'right', COND, '700');
    if (cue) this._text(cue.toUpperCase(), x + 16 * k, y + Hh - 11 * k, 13 * k, cueTone, 'left', COND, '700');
    // the moments that must not be missed get the middle of the screen
    const big = a.short ? null : a.phase === 'rotate' ? 'ROTATE' : /^Gear up/.test(a.cue) ? 'GEAR UP' : a.phase === 'abort' ? 'ABORT' : null;
    if (big && (Math.floor(performance.now() / 320) % 2 === 0 || big !== 'ROTATE')) {
      c.font = `700 ${Math.round(34 * k)}px ${COND}`;
      const tw = c.measureText(big).width + 40 * k, cy = this.h * 0.24;
      c.fillStyle = 'rgba(21,18,14,0.82)'; c.fillRect(this.w / 2 - tw / 2, cy - 24 * k, tw, 48 * k);
      c.fillStyle = big === 'ABORT' ? ORANGE : GREEN; c.fillRect(this.w / 2 - tw / 2, cy - 24 * k, 5 * k, 48 * k);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(big, this.w / 2 + 2 * k, cy + 2 * k);
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

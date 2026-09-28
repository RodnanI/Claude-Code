import { clamp, smoothstep } from '../core/util.js';
import { skyRadiance, sunTransmittance } from './atmosphere.js';

const RG = 6360000;
/** Sun irradiance used by the atmosphere. Surface lighting divides by pi (Lambert). Slightly boosted sky for a fuller look. */
export const SUN_INTENSITY = 30;
const SURFACE_SUN = 20 / Math.PI;

const RINGS = [
  { el: 0.26, w: 0.16, n: 6 }, { el: 0.70, w: 0.40, n: 6 }, { el: 1.22, w: 0.34, n: 5 }, { el: 1.5708, w: 0.10, n: 1 },
];

/**
 * Time-of-day environment driven by the atmosphere model. Everything the frame needs from the sky (sun light color,
 * ambient, haze, analytic fallback gradient) is computed here on the CPU with no GPU readback.
 * Colors are scene-linear.
 */
export class Environment {
  constructor() {
    this.hour = 10.5;
    this.timeSpeed = 0;
    this.cover = 0.5;
    this.wind = [0.0045, 0.0018];
    this.sunTrue = [0, 1, 0];
    this.sunDir = [0, 1, 0];
    this.sunAz = 0;
    this.sunColor = [1, 1, 1];
    this.zenith = [0, 0, 0]; this.horizon = [0, 0, 0]; this.fog = [0, 0, 0]; this.fogSun = [0, 0, 0];
    this.ambSky = [0, 0, 0]; this.ambGround = [0, 0, 0]; this.haze = [1e-5, 2e-5, 4e-5];
    this.night = 0;
    this.exposure = 0.05;
    this.hazeAmount = 1;
    this._key = '';
    this.compute();
  }
  update(dt) {
    if (this.timeSpeed) this.hour = (this.hour + (dt * this.timeSpeed) / 3600) % 24;
    this.compute();
  }
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.compute(); }

  compute() {
    const key = this.hour.toFixed(3) + '|' + this.hazeAmount.toFixed(2);
    if (key === this._key) return;
    this._key = key;
    const ang = ((this.hour - 6) / 12) * Math.PI;
    let sx = Math.cos(ang), sy = Math.sin(ang), sz = 0.36 * Math.sin(ang);
    const l = Math.hypot(sx, sy, sz);
    sx /= l; sy /= l; sz /= l;
    this.sunTrue[0] = sx; this.sunTrue[1] = sy; this.sunTrue[2] = sz;
    this.sunAz = Math.atan2(sz, sx);
    const e = sy;
    const sun = this.sunTrue;
    const T = sunTransmittance([0, RG + 2, 0], sun);
    const gate = smoothstep(-0.015, 0.02, e);
    let sc = [T[0] * SURFACE_SUN * gate, T[1] * SURFACE_SUN * gate, T[2] * SURFACE_SUN * gate];
    // sky irradiance: cosine-weighted average of the sky over the hemisphere
    const amb = [0, 0, 0];
    let ws = 0;
    for (const ring of RINGS) {
      const acc = [0, 0, 0];
      for (let i = 0; i < ring.n; i++) {
        const az = (i / ring.n) * Math.PI * 2 + 0.4;
        const c = Math.cos(ring.el);
        const rd = [Math.cos(az) * c, Math.sin(ring.el), Math.sin(az) * c];
        const r = skyRadiance(rd, sun, 120, SUN_INTENSITY);
        acc[0] += r[0]; acc[1] += r[1]; acc[2] += r[2];
      }
      amb[0] += (acc[0] / ring.n) * ring.w; amb[1] += (acc[1] / ring.n) * ring.w; amb[2] += (acc[2] / ring.n) * ring.w;
      ws += ring.w;
    }
    const ambSky = [amb[0] / ws, amb[1] / ws, amb[2] / ws];
    const zen = skyRadiance([0, 1, 0], sun, 120, SUN_INTENSITY);
    // horizon color away from the sun, and toward it
    const hs = Math.hypot(sun[0], sun[2]) || 1;
    const away = [-sun[0] / hs, 0.04, -sun[2] / hs];
    const al = Math.hypot(...away);
    const hor = skyRadiance([away[0] / al, away[1] / al, away[2] / al], sun, 120, SUN_INTENSITY);
    const toward = [sun[0] / hs, 0.04, sun[2] / hs];
    const tl = Math.hypot(...toward);
    const horSun = skyRadiance([toward[0] / tl, toward[1] / tl, toward[2] / tl], sun, 120, SUN_INTENSITY);

    // moonlight and night floor
    const moon = smoothstep(-0.02, -0.14, e);
    this.night = clamp((0.05 - e) / 0.22, 0, 1);
    this.sunDir[0] = sx; this.sunDir[1] = sy; this.sunDir[2] = sz;
    if (e < -0.02) {
      this.sunDir[0] = -sx; this.sunDir[1] = -sy; this.sunDir[2] = -sz;
      sc = [0.5 * moon, 0.62 * moon, 0.95 * moon];
    }
    const nf = this.night;
    for (let k = 0; k < 3; k++) {
      this.sunColor[k] = sc[k];
      this.ambSky[k] = ambSky[k] + [0.05, 0.065, 0.11][k] * nf + [0.16, 0.15, 0.13][k] * smoothstep(-0.05, 0.16, e);
      this.zenith[k] = zen[k] + [0.006, 0.008, 0.02][k] * nf;
      this.horizon[k] = hor[k];
      this.fog[k] = hor[k] * 0.92 + ambSky[k] * 0.08;
      this.fogSun[k] = horSun[k] * 0.7 + hor[k] * 0.3;
    }
    const bounceTint = [1.0, 0.9, 0.74];
    const dayLight = Math.max(0, e);
    for (let k = 0; k < 3; k++) this.ambGround[k] = 0.24 * bounceTint[k] * (sc[k] * dayLight * 0.55 + this.ambSky[k] * 0.8) + 0.004;
    // haze extinction per meter: Rayleigh-shaped with a Mie floor, stronger near the horizon sun
    const h = this.hazeAmount;
    this.haze[0] = (5.8e-6 * 2.2 + 1.5e-5 * (0.4 + 0.6 * (1 - dayLight))) * h;
    this.haze[1] = (1.36e-5 * 2.2 + 1.5e-5 * (0.4 + 0.6 * (1 - dayLight))) * h;
    this.haze[2] = (3.31e-5 * 2.0 + 1.5e-5 * (0.4 + 0.6 * (1 - dayLight))) * h;
    // fallback (no post) exposure prior
    const lum = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    this.exposure = clamp(0.42 / (lum(this.sunColor) * Math.max(0.25, e) * 0.5 + lum(this.ambSky) + 0.02), 0.03, 9);
  }
}

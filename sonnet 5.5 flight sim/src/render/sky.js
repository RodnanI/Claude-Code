import { clamp, lerp, smoothstep } from '../core/util.js';

const KEYS = [
  // e = sun elevation (sin), zenith, horizon, sun, ambSky, ambGround, fog
  { e: -0.30, z: [0.010, 0.014, 0.035], h: [0.030, 0.034, 0.060], s: [0, 0, 0], as: [0.020, 0.025, 0.050], ag: [0.010, 0.010, 0.012], f: [0.030, 0.035, 0.060] },
  { e: -0.08, z: [0.045, 0.060, 0.130], h: [0.420, 0.240, 0.190], s: [0.22, 0.08, 0.03], as: [0.070, 0.075, 0.120], ag: [0.035, 0.030, 0.030], f: [0.300, 0.190, 0.170] },
  { e: 0.05, z: [0.120, 0.190, 0.400], h: [0.900, 0.460, 0.270], s: [1.50, 0.70, 0.34], as: [0.210, 0.225, 0.330], ag: [0.120, 0.090, 0.068], f: [0.720, 0.430, 0.300] },
  { e: 0.30, z: [0.120, 0.260, 0.600], h: [0.700, 0.660, 0.620], s: [1.95, 1.50, 1.12], as: [0.300, 0.350, 0.470], ag: [0.190, 0.160, 0.125], f: [0.520, 0.580, 0.650] },
  { e: 0.90, z: [0.090, 0.230, 0.620], h: [0.480, 0.620, 0.780], s: [2.20, 2.00, 1.75], as: [0.320, 0.400, 0.560], ag: [0.210, 0.185, 0.145], f: [0.500, 0.620, 0.760] },
];

/** Time-of-day driven environment: sun, sky palette, ambient light, fog. All colors linear. */
export class Environment {
  constructor() {
    this.hour = 10.5;
    this.timeSpeed = 0; // game seconds per real second, 0 = frozen
    this.cover = 0.55;
    this.wind = [0.004, 0.0015];
    this.sunDir = [0, 1, 0];
    this.sunColor = [1, 1, 1];
    this.zenith = [0, 0, 0]; this.horizon = [0, 0, 0]; this.fog = [0, 0, 0]; this.fogSun = [0, 0, 0];
    this.ambSky = [0, 0, 0]; this.ambGround = [0, 0, 0];
    this.night = 0;
    this.exposure = 1;
    this.compute();
  }
  update(dt) {
    if (this.timeSpeed) this.hour = (this.hour + (dt * this.timeSpeed) / 3600) % 24;
    this.compute();
  }
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.compute(); }
  compute() {
    const ang = ((this.hour - 6) / 12) * Math.PI;
    let sx = Math.cos(ang), sy = Math.sin(ang), sz = 0.36 * Math.sin(ang);
    const l = Math.hypot(sx, sy, sz);
    this.sunDir[0] = sx / l; this.sunDir[1] = sy / l; this.sunDir[2] = sz / l;
    const e = this.sunDir[1];
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = clamp((e - a.e) / (b.e - a.e), 0, 1);
    const mixv = (p, q, out) => { for (let k = 0; k < 3; k++) out[k] = lerp(p[k], q[k], t); };
    mixv(a.z, b.z, this.zenith); mixv(a.h, b.h, this.horizon); mixv(a.s, b.s, this.sunColor);
    mixv(a.as, b.as, this.ambSky); mixv(a.ag, b.ag, this.ambGround); mixv(a.f, b.f, this.fog);
    this.night = clamp((0.04 - e) / 0.20, 0, 1);
    // warm haze toward the sun
    for (let k = 0; k < 3; k++) this.fogSun[k] = Math.min(2, this.fog[k] * 1.15 + this.sunColor[k] * 0.06);
    // moonlight fill at night
    if (e < 0.02) {
      const m = smoothstep(0.02, -0.15, e) * 0.5;
      this.ambSky[0] += 0.03 * m; this.ambSky[1] += 0.04 * m; this.ambSky[2] += 0.07 * m;
      // sun direction switches to a dim moon when the sun is down
      this.sunColor[0] = Math.max(this.sunColor[0], 0.12 * m); this.sunColor[1] = Math.max(this.sunColor[1], 0.15 * m); this.sunColor[2] = Math.max(this.sunColor[2], 0.24 * m);
      if (e < -0.02) { this.sunDir[0] = -this.sunDir[0]; this.sunDir[1] = -this.sunDir[1]; this.sunDir[2] = -this.sunDir[2]; }
    }
    this.exposure = 0.8 + this.night * 0.7;
  }
}

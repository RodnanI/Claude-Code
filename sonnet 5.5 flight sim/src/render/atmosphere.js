/* CPU port of the single-scattering atmosphere in shaders/chunks.js. The GPU renders the full sky; this computes the
   handful of colors the rest of the frame needs (sun light, ambient, haze) without any GPU readback. */

const RG = 6360000, RA = 6420000;
const BR = [5.802e-6, 13.558e-6, 33.1e-6], BMS = 3.996e-6, BME = 4.44e-6, BO = [0.650e-6, 1.881e-6, 0.085e-6];
const HR = 8000, HM = 1200;

function raySphere(ro, rd, r) {
  const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2];
  const c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r;
  let d = b * b - c;
  if (d < 0) return [-1, -1];
  d = Math.sqrt(d);
  return [-b - d, -b + d];
}
function extinction(h, out) {
  const oz = Math.max(0, 1 - Math.abs(h - 25000) / 15000);
  const r = Math.exp(-h / HR), m = BME * Math.exp(-h / HM);
  out[0] = BR[0] * r + m + BO[0] * oz; out[1] = BR[1] * r + m + BO[1] * oz; out[2] = BR[2] * r + m + BO[2] * oz;
}
const _e = [0, 0, 0];

export function sunTransmittance(p, sun) {
  const g = raySphere(p, sun, RG);
  if (g[0] > 0) return [0, 0, 0];
  const a = raySphere(p, sun, RA);
  const len = a[1];
  if (len <= 0) return [1, 1, 1];
  // quadratic spacing, identical to the shader: dense air near p dominates and a low sun crosses hundreds of kilometers
  let o0 = 0, o1 = 0, o2 = 0, tp = 0;
  for (let i = 0; i < 8; i++) {
    const t1 = (len * (i + 1) * (i + 1)) / 64, ds = t1 - tp, t = tp + 0.5 * ds;
    const q = [p[0] + sun[0] * t, p[1] + sun[1] * t, p[2] + sun[2] * t];
    extinction(Math.hypot(q[0], q[1], q[2]) - RG, _e);
    o0 += _e[0] * ds; o1 += _e[1] * ds; o2 += _e[2] * ds;
    tp = t1;
  }
  return [Math.exp(-o0), Math.exp(-o1), Math.exp(-o2)];
}

const phaseR = (c) => (3 / (16 * Math.PI)) * (1 + c * c);
function phaseM(c) {
  const g = 0.8, k = (3 / (8 * Math.PI)) * ((1 - g * g) / (2 + g * g));
  return (k * (1 + c * c)) / Math.pow(1 + g * g - 2 * g * c, 1.5);
}

export function skyRadiance(rd, sun, alt, sunI) {
  const ro = [0, RG + alt, 0];
  const ga = raySphere(ro, rd, RG), at = raySphere(ro, rd, RA);
  let tmax = at[1];
  const hit = ga[0] > 0;
  if (hit) tmax = ga[0];
  if (tmax <= 0) return [0, 0, 0];
  const N = 20;
  let T0 = 1, T1 = 1, T2 = 1, s0 = 0, s1 = 0, s2 = 0, tp = 0;
  const mu = rd[0] * sun[0] + rd[1] * sun[1] + rd[2] * sun[2];
  const pr = phaseR(mu), pm = phaseM(mu);
  const fill = 0.6 / (4 * Math.PI);
  for (let i = 0; i < N; i++) {
    const t1 = (tmax * (i + 1) * (i + 1)) / (N * N), ds = t1 - tp, t = tp + 0.5 * ds;
    tp = t1;
    const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
    const h = Math.hypot(p[0], p[1], p[2]) - RG;
    const dR = Math.exp(-h / HR), dM = Math.exp(-h / HM);
    const sT = sunTransmittance(p, sun); // uses the shared scratch array, so extinction is evaluated after it
    extinction(h, _e);
    const k0 = sT[0] * (BR[0] * dR * pr + BMS * dM * pm + (BR[0] * dR + BMS * dM) * fill);
    const k1 = sT[1] * (BR[1] * dR * pr + BMS * dM * pm + (BR[1] * dR + BMS * dM) * fill);
    const k2 = sT[2] * (BR[2] * dR * pr + BMS * dM * pm + (BR[2] * dR + BMS * dM) * fill);
    const t0 = Math.exp(-_e[0] * ds), t1e = Math.exp(-_e[1] * ds), t2 = Math.exp(-_e[2] * ds);
    s0 += (T0 * k0 * (1 - t0)) / Math.max(_e[0], 1e-9);
    s1 += (T1 * k1 * (1 - t1e)) / Math.max(_e[1], 1e-9);
    s2 += (T2 * k2 * (1 - t2)) / Math.max(_e[2], 1e-9);
    T0 *= t0; T1 *= t1e; T2 *= t2;
  }
  if (hit) {
    const p = [ro[0] + rd[0] * ga[0], ro[1] + rd[1] * ga[0], ro[2] + rd[2] * ga[0]];
    const l = Math.hypot(p[0], p[1], p[2]);
    const nd = Math.max(0, (p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2]) / l);
    const sT = sunTransmittance(p, sun);
    s0 += T0 * sT[0] * nd * 0.2 / Math.PI; s1 += T1 * sT[1] * nd * 0.2 / Math.PI; s2 += T2 * sT[2] * nd * 0.2 / Math.PI;
  }
  // mirrors the horizon tint in the shader (see chunks.js)
  const dw = Math.min(1, Math.max(0, (sun[1] - 0.25) / 0.35)), sw = dw * dw * (3 - 2 * dw);
  const k = sw * Math.exp(-Math.max(rd[1], 0) * 6) * 0.85;
  return [s0 * sunI * (1 + (0.9 - 1) * k), s1 * sunI, s2 * sunI * (1 + (1.16 - 1) * k)];
}

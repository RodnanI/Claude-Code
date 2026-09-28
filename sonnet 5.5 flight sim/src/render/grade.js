/* Color grading. A grade is a set of parameters baked into a 3D lookup table over a log-encoded scene-linear cube
   (2^-10 .. 2^6, exposure already applied). The tone curve lives inside the LUT, so swapping the grade swaps the whole
   look with one texture. Extending to imported .cube files later only needs a different bake source. */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const luma = (r, g, b) => r * 0.2126 + g * 0.7152 + b * 0.0722;

/** Named looks. Values are deliberately restrained. */
export const GRADES = {
  off: { curve: 'aces', wb: 6500, tint: 0, contrast: 1, sat: 1, vibrance: 0, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadowTint: [1, 1, 1], highlightTint: [1, 1, 1], black: 0, fade: 0, chroma: 1 },
  natural: { curve: 'neutral', wb: 6500, tint: 0, contrast: 1.02, sat: 1.04, vibrance: 0.05, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadowTint: [1, 1, 1], highlightTint: [1, 1, 1], black: 0.002, fade: 0, chroma: 1 },
  cinematic: { curve: 'aces', wb: 6350, tint: 0.01, contrast: 1.12, sat: 1.06, vibrance: 0.14, lift: [0.004, 0.005, 0.004], gamma: [1.0, 1.0, 1.02], gain: [1.03, 1.0, 0.95], shadowTint: [0.93, 1.0, 1.0], highlightTint: [1.07, 1.0, 0.9], black: 0.006, fade: 0.012, chroma: 0.8 },
  vivid: { curve: 'aces', wb: 6600, tint: 0, contrast: 1.16, sat: 1.28, vibrance: 0.28, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1.03, 1.01, 0.97], shadowTint: [0.97, 1, 1], highlightTint: [1.05, 1.0, 0.94], black: 0.002, fade: 0, chroma: 0.85 },
  vintage: { curve: 'aces', wb: 5900, tint: 0.02, contrast: 1.06, sat: 0.84, vibrance: 0.05, lift: [0.014, 0.012, 0.006], gamma: [1.02, 1.0, 1.06], gain: [1.05, 1.0, 0.88], shadowTint: [0.9, 1.0, 0.95], highlightTint: [1.1, 1.0, 0.84], black: 0.026, fade: 0.05, chroma: 0.7 },
  noir: { curve: 'aces', wb: 6500, tint: 0, contrast: 1.3, sat: 0.0, vibrance: 0, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadowTint: [1, 1, 1], highlightTint: [1, 1, 1], black: 0.004, fade: 0, chroma: 1 },
};
export const GRADE_ORDER = ['cinematic', 'natural', 'vivid', 'vintage', 'noir', 'off'];

// ACES fit (Stephen Hill) working in AP1-ish space
const IN = [[0.59719, 0.35458, 0.04823], [0.076, 0.90834, 0.01566], [0.0284, 0.13383, 0.83777]];
const OUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
const mul3 = (m, r, g, b) => [m[0][0] * r + m[0][1] * g + m[0][2] * b, m[1][0] * r + m[1][1] * g + m[1][2] * b, m[2][0] * r + m[2][1] * g + m[2][2] * b];
const rrt = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);

function acesCurve(r, g, b, chroma) {
  const c = mul3(IN, r * 0.6, g * 0.6, b * 0.6);
  const t = mul3(OUT, rrt(c[0]), rrt(c[1]), rrt(c[2]));
  // optionally blend toward a luminance-preserving mapping to keep highlights from skewing hue
  const l = luma(r, g, b), lm = luma(t[0], t[1], t[2]);
  const k = l > 1e-6 ? lm / l : 1;
  return [lerp(t[0], r * k, 1 - chroma), lerp(t[1], g * k, 1 - chroma), lerp(t[2], b * k, 1 - chroma)];
}
/** Khronos PBR Neutral tone mapper: keeps base colors intact, compresses only the top end. */
function neutralCurve(r, g, b) {
  const start = 0.8 - 0.04, desat = 0.15;
  const x = Math.min(r, g, b);
  const off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= off; g -= off; b -= off;
  const peak = Math.max(r, g, b);
  if (peak < start) return [r, g, b];
  const d = 1 - start;
  const np = 1 - (d * d) / (peak + d - start);
  const s = np / peak;
  r *= s; g *= s; b *= s;
  const gg = 1 - 1 / (desat * (peak - np) + 1);
  return [lerp(r, np, gg), lerp(g, np, gg), lerp(b, np, gg)];
}

/** Kelvin to a linear RGB gain, normalized to leave 6500K neutral. */
function whiteBalance(k, tint) {
  const t = k / 100;
  const f = (kk) => {
    const tt = kk / 100;
    const r = tt <= 66 ? 255 : 329.698727446 * Math.pow(tt - 60, -0.1332047592);
    const g = tt <= 66 ? 99.4708025861 * Math.log(tt) - 161.1195681661 : 288.1221695283 * Math.pow(tt - 60, -0.0755148492);
    const b = tt >= 66 ? 255 : tt <= 19 ? 0 : 138.5177312231 * Math.log(tt - 10) - 305.0447927307;
    return [Math.min(255, Math.max(0, r)) / 255, Math.min(255, Math.max(0, g)) / 255, Math.min(255, Math.max(0, b)) / 255];
  };
  const src = f(t * 100), ref = f(6500);
  return [ref[0] / src[0], ref[1] / src[1] * (1 - tint * 0.5), ref[2] / src[2]];
}

const srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

export function gradePixel(r, g, b, p) {
  const wb = p._wb || (p._wb = whiteBalance(p.wb, p.tint));
  r *= wb[0]; g *= wb[1]; b *= wb[2];
  // contrast in log space around middle gray
  const piv = 0.18;
  if (p.contrast !== 1) {
    r = piv * Math.pow(Math.max(r, 1e-6) / piv, p.contrast);
    g = piv * Math.pow(Math.max(g, 1e-6) / piv, p.contrast);
    b = piv * Math.pow(Math.max(b, 1e-6) / piv, p.contrast);
  }
  let c;
  c = p.curve === 'neutral' ? neutralCurve(r, g, b) : acesCurve(r, g, b, p.chroma ?? 1);
  r = c[0]; g = c[1]; b = c[2];
  // display-referred grading
  const l0 = luma(r, g, b);
  const sw = 1 - clamp01(l0 * 2.2), hw = clamp01(l0 * 1.6 - 0.35);
  r *= lerp(1, p.shadowTint[0], sw) * lerp(1, p.highlightTint[0], hw);
  g *= lerp(1, p.shadowTint[1], sw) * lerp(1, p.highlightTint[1], hw);
  b *= lerp(1, p.shadowTint[2], sw) * lerp(1, p.highlightTint[2], hw);
  r = r * p.gain[0] + p.lift[0] * (1 - r);
  g = g * p.gain[1] + p.lift[1] * (1 - g);
  b = b * p.gain[2] + p.lift[2] * (1 - b);
  r = Math.pow(Math.max(r, 0), 1 / p.gamma[0]); g = Math.pow(Math.max(g, 0), 1 / p.gamma[1]); b = Math.pow(Math.max(b, 0), 1 / p.gamma[2]);
  // saturation and vibrance
  const l = luma(r, g, b);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const satNow = mx > 1e-5 ? (mx - mn) / mx : 0;
  const s = p.sat + p.vibrance * (1 - satNow);
  r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s;
  // black lift and fade
  const bl = p.black + p.fade * (1 - l);
  r = r * (1 - bl) + bl; g = g * (1 - bl) + bl; b = b * (1 - bl) + bl;
  return [srgb(clamp01(r)), srgb(clamp01(g)), srgb(clamp01(b))];
}

export const LUT_LOG_MIN = -10, LUT_LOG_RANGE = 16;

/** Bake a size^3 RGBA8 LUT. Index order: r fastest, then g, then b (matches texImage3D layout). */
export function bakeLUT(name, size = 48, override = null) {
  const p = { ...(GRADES[name] || GRADES.cinematic), ...(override || {}) };
  p._wb = null;
  const out = new Uint8Array(size * size * size * 4);
  let o = 0;
  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const dec = (i) => Math.pow(2, (i / (size - 1)) * LUT_LOG_RANGE + LUT_LOG_MIN);
        const c = gradePixel(dec(ri), dec(gi), dec(bi), p);
        out[o++] = Math.round(c[0] * 255); out[o++] = Math.round(c[1] * 255); out[o++] = Math.round(c[2] * 255); out[o++] = 255;
      }
    }
  }
  return out;
}

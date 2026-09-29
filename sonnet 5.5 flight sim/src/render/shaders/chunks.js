/* Shared GLSL chunks. Everything here is plain strings concatenated by the shader modules. */

export const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler3D;
precision highp sampler2DArrayShadow;
`;

export const NOISE = `
const float PI = 3.14159265359;
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float hash13(uvec3 v) { return float(pcg(v.x + pcg(v.y + pcg(v.z)))) * (1.0 / 4294967295.0); }
float hash12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float hash11(float p) { return fract(sin(p * 127.1) * 43758.5453123); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

/* Analytic atmosphere used by the sky LUT pass. Distances in meters; the camera sits at (0, RG + altitude, 0). */
export const ATMOS = `
const float RG = 6360000.0;
const float RA = 6420000.0;
const vec3 BR = vec3(5.802e-6, 13.558e-6, 33.1e-6);
const float BMS = 3.996e-6;
const float BME = 4.44e-6;
const vec3 BO = vec3(0.650e-6, 1.881e-6, 0.085e-6);
const float HR = 8000.0;
const float HM = 1200.0;

vec2 raySphere(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float d = b * b - c;
  if (d < 0.0) return vec2(-1.0);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}
float phaseR(float c) { return 3.0 / (16.0 * PI) * (1.0 + c * c); }
float phaseM(float c) {
  const float g = 0.8;
  float k = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + c * c) / pow(1.0 + g * g - 2.0 * g * c, 1.5);
}
vec3 extinctionAt(float h) {
  float ozone = max(0.0, 1.0 - abs(h - 25000.0) / 15000.0);
  return BR * exp(-h / HR) + BME * exp(-h / HM) + BO * ozone;
}
vec3 sunTransmittance(vec3 p, vec3 sun) {
  vec2 g = raySphere(p, sun, RG);
  if (g.x > 0.0) return vec3(0.0);
  vec2 a = raySphere(p, sun, RA);
  float len = a.y;
  if (len <= 0.0) return vec3(1.0);
  // quadratic spacing: dense air near p dominates, and a low sun crosses hundreds of kilometers
  vec3 od = vec3(0.0);
  float tp = 0.0;
  for (int i = 0; i < 8; i++) {
    float t1 = len * float((i + 1) * (i + 1)) / 64.0;
    float ds = t1 - tp;
    vec3 q = p + sun * (tp + 0.5 * ds);
    od += extinctionAt(length(q) - RG) * ds;
    tp = t1;
  }
  return exp(-od);
}
vec3 skyRadiance(vec3 rd, vec3 sun, float alt, float sunI) {
  vec3 ro = vec3(0.0, RG + alt, 0.0);
  vec2 ga = raySphere(ro, rd, RG);
  vec2 at = raySphere(ro, rd, RA);
  float tmax = at.y;
  bool hitGround = ga.x > 0.0;
  if (hitGround) tmax = ga.x;
  if (tmax <= 0.0) return vec3(0.0);
  const int N = 20;
  vec3 T = vec3(1.0);
  vec3 sum = vec3(0.0);
  float mu = dot(rd, sun);
  float pr = phaseR(mu), pm = phaseM(mu);
  float tp = 0.0;
  for (int i = 0; i < N; i++) {
    // quadratic spacing keeps the dense air near the camera finely sampled, which matters for horizon rays that run hundreds of kilometers
    float t1 = tmax * float((i + 1) * (i + 1)) / float(N * N);
    float ds = t1 - tp;
    vec3 p = ro + rd * (tp + 0.5 * ds);
    tp = t1;
    float h = length(p) - RG;
    float dR = exp(-h / HR), dM = exp(-h / HM);
    vec3 ext = extinctionAt(h);
    vec3 sT = sunTransmittance(p, sun);
    // single scattering plus a crude isotropic fill for multiple scattering, integrated analytically over the segment
    vec3 src = sT * (BR * dR * pr + BMS * dM * pm + (BR * dR + BMS * dM) * (0.6 / (4.0 * PI)));
    vec3 Ts = exp(-ext * ds);
    sum += T * src * (vec3(1.0) - Ts) / max(ext, vec3(1e-9));
    T *= Ts;
  }
  if (hitGround) {
    vec3 p = ro + rd * ga.x;
    vec3 n = normalize(p);
    sum += T * sunTransmittance(p, sun) * max(dot(n, sun), 0.0) * 0.2 / PI;
  }
  sum *= sunI;
  // The multiple scattering fill is crude and leaves the daytime horizon greenish. Restore the pale blue of a clear horizon,
  // only while the sun is high so that sunsets keep their warmth.
  float dayW = smoothstep(0.25, 0.6, sun.y);
  sum *= mix(vec3(1.0), vec3(0.9, 1.0, 1.16), dayW * exp(-max(rd.y, 0.0) * 6.0) * 0.85);
  return sum;
}
`;

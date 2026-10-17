// Inside the Rings: the camera floats just above the sheet of a giant planet's
// ring system. Craggy ice boulders tumble in the foreground, the ring sheet
// recedes in ringlets, gaps and density waves to a thin horizon, a shepherd
// moonlet raises a scalloped wake on the edges of its gap, and the banded gas
// giant hangs over the horizon as a fat crescent with the rings' shadow.
(function () {
  // ------------------------------------------------------------ constants
  // camera base yaw (radians, 0 = looking straight at the planet centre)
  const YAW0 = -0.27;
  const fw = [Math.sin(YAW0), 0, Math.cos(YAW0)];
  const rt = [Math.cos(YAW0), 0, -Math.sin(YAW0)];
  const RCAM = 140.0;

  // facet directions for the polyhedral boulders (Fibonacci sphere)
  const NDIR = 14;
  const dirs = [];
  for (let k = 0; k < NDIR; k++) {
    const z = 1 - (2 * k + 1) / NDIR;
    const r = Math.sqrt(1 - z * z);
    const a = k * 2.399963229728653;
    dirs.push([r * Math.cos(a), r * Math.sin(a), z]);
  }
  // small deterministic PRNG for baked per-rock data
  let sd = 12345;
  const rnd = () => ((sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648);

  // rocks: forward, right, height (camera-relative ground frame), radius,
  // tumble axis, whole turns per loop, drift amplitude
  const ROCKS = [
    [3.1, -2.75, 0.85, 0.85, [0.35, 0.85, 0.4], 1, 0.07],
    [1.75, -1.35, 0.3, 0.5, [-0.6, 0.3, 0.75], -1, 0.05],
    [6.0, -0.55, 1.55, 0.34, [0.2, -0.4, 0.9], 1, 0.1],
    [2.4, 0.35, 0.58, 0.13, [0.9, 0.2, -0.3], 2, 0.04],
    [5.2, 2.3, 0.1, 0.3, [0.1, 1.0, 0.1], -1, 0.03],
    [3.6, -0.9, 1.05, 0.09, [0.5, 0.5, -0.7], 3, 0.05],
    [4.4, 1.2, 1.3, 0.07, [-0.3, 0.9, 0.3], -2, 0.06],
  ];
  const NR = ROCKS.length;
  const f3 = (v) => `vec3(${v.map((x) => x.toFixed(5)).join(',')})`;
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return v.map((x) => x / l);
  };
  const rkPos = [], rkAx = [], rkMisc = [], rkH = [];
  for (const [f, r, h, R, ax, k, amp] of ROCKS) {
    rkPos.push(f3([f * fw[0] + r * rt[0], h, -RCAM + f * fw[2] + r * rt[2]]));
    rkAx.push(f3(norm(ax)));
    rkMisc.push(`vec4(${R.toFixed(4)},${k.toFixed(1)},${amp.toFixed(4)},${(rnd() * 6.28).toFixed(4)})`);
    for (let j = 0; j < NDIR; j++) rkH.push((0.66 + 0.34 * Math.pow(rnd(), 0.7)).toFixed(4));
  }

  const GLSL = `
// ================================================================ constants
const float RP = 60.0;          // planet radius
const float RCAM = ${RCAM.toFixed(1)};       // camera orbital radius
const float CAMH = 1.0;         // camera height above the ring plane
const float FOC = 1.9;          // focal length (p units)
const vec3 SUN = vec3(-0.93066, 0.26885, 0.24818);
const float XG = 3.0;           // moonlet gap centre (x = RCAM - r, inward)
const float GW = 0.40;          // gap half width
const float SHEAR = 0.0133;     // 1.5 * Omega (units / s per unit radius)
const float YAW0 = ${YAW0.toFixed(4)};
#define NR ${NR}
const vec3 DIRS[${NDIR}] = vec3[](${dirs.map(f3).join(',')});
const vec3 RK_POS[NR] = vec3[](${rkPos.join(',')});
const vec3 RK_AX[NR] = vec3[](${rkAx.join(',')});
const vec4 RK_M[NR] = vec4[](${rkMisc.join(',')});
const float RK_H[${NR * NDIR}] = float[](${rkH.join(',')});

// ================================================================ helpers
vec2 sphHit(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c; float b = dot(oc, rd); float h = b * b - dot(oc, oc) + r * r;
  if (h < 0.0) return vec2(1e9, -1e9);
  h = sqrt(h); return vec2(-b - h, -b + h);
}
float bandS(float a, float b, float x, float e){ return smoothstep(a - e, a + e, x) - smoothstep(b - e, b + e, x); }
mat3 axisRot(vec3 a, float ang){
  float c = cos(ang), s = sin(ang), ic = 1.0 - c;
  return mat3(c + a.x * a.x * ic, a.y * a.x * ic + a.z * s, a.z * a.x * ic - a.y * s,
              a.x * a.y * ic - a.z * s, c + a.y * a.y * ic, a.z * a.y * ic + a.x * s,
              a.x * a.z * ic + a.y * s, a.y * a.z * ic - a.x * s, c + a.z * a.z * ic);
}

// ================================================================ ring profile
// plateau noise: piecewise flat with sharp-ish steps (ringlets)
float plat(float x, float seed, float sh){
  float i = floor(x), f = x - i;
  float u = smoothstep(0.5 - sh, 0.5 + sh, f);
  return mix(hash11(i + seed), hash11(i + 1.0 + seed), u);
}
float ringlets(float x, float e){
  float s = 0.0, w = 0.0, f = 0.4, a = 1.0;
  for (int i = 0; i < 7; i++) {
    float k = e * f;
    float vis = sat(1.6 - 1.2 * k);
    float sh = clamp(0.04 + 0.6 * k, 0.04, 0.5);
    s += a * mix(0.5, plat(x * f, float(i) * 113.7, sh), vis);
    w += a; f *= 2.31; a *= 0.7;
  }
  return s / w;
}
// optical depth of the ring at inward distance x (= RCAM - r), footprint e
float ringTau(float x, float e, out float alb){
  float n = ringlets(x, e);
  float nc = sat((n - 0.5) * 2.8 + 0.5);
  float A1 = bandS(-2.2, XG - GW, x, e);
  float A2 = bandS(XG + GW, 8.0, x, e);
  float CD = bandS(8.0, 12.0, x, e);
  float B  = bandS(12.0, 38.0, x, e);
  float C  = bandS(38.0, 56.0, x, e);
  float tau = A1 * (0.30 + 0.9 * nc) + A2 * (0.40 + 1.0 * nc) + CD * (0.02 + 0.10 * nc)
            + B * (1.1 + 2.6 * nc) + C * (0.05 + 0.30 * nc);
  tau += 0.9 * bandS(9.1, 9.25, x, e) + 0.6 * bandS(10.4, 10.5, x, e) + 0.5 * bandS(11.2, 11.32, x, e);
  tau += 0.8 * bandS(-4.15, -3.95, x, e);
  tau *= 1.0 - 0.95 * bandS(6.55, 6.72, x, e);
  tau *= 1.0 - 0.90 * bandS(17.0, 17.5, x, e);
  tau *= 1.0 - 0.80 * bandS(26.0, 26.6, x, e);
  tau *= 1.0 - 0.90 * bandS(45.0, 46.5, x, e);
  alb = 0.52 + 0.14 * B - 0.12 * C - 0.08 * CD + 0.10 * (nc - 0.5);
  return tau;
}

// ================================================================ stars
vec3 starField(vec3 rd){
  float az = atan(rd.x, rd.z);
  float el = asin(clamp(rd.y, -1.0, 1.0));
  vec2 g = vec2(az, el) * 95.0;
  vec2 ci = floor(g);
  ivec2 ii = ivec2(ci);
  if (hashi(ii + ivec2(31, 17)) > 0.10) return vec3(0.0);
  vec2 pos = ci + 0.2 + 0.6 * vec2(hashi(ii + ivec2(7, 3)), hashi(ii + ivec2(1, 9)));
  vec2 dd = g - pos; dd.x *= cos(el);
  float mag = 0.10 + 2.2 * pow(hashi(ii + ivec2(5, 91)), 7.0);
  float tint = hashi(ii + ivec2(77, 4));
  return mag * exp(-dot(dd, dd) / 0.05) * mix(vec3(1.0, 0.85, 0.65), vec3(1.0, 0.97, 0.9), tint);
}

// ================================================================ planet
float bandTex(float lon, float latw, float fpl){
  float b = 0.0;
  b += 0.20 * sin(latw * 12.0 + 0.4 + 0.5 * sin(latw * 4.0));
  b += 0.11 * sin(latw * 31.0 + 2.0) * sat(1.5 - fpl * 9.0);
  b += 0.07 * sin(latw * 73.0 + 0.7) * sat(1.5 - fpl * 22.0);
  b += 0.13 * (vnoise(vec2(lon * 10.0, latw * 150.0)) - 0.5) * sat(1.5 - fpl * 75.0);
  b += 0.08 * (vnoise(vec2(lon * 28.0, latw * 420.0)) - 0.5) * sat(1.5 - fpl * 210.0);
  return b;
}
const int NV = 9;
// vortex: lat, lon, half size lon (arc rad), half size lat; spin turns/loop, kind
const vec4 VX_A[NV] = vec4[](
  vec4(0.62, -0.95, 0.105, 0.055), vec4(0.36, -1.12, 0.055, 0.030), vec4(0.80, -0.70, 0.070, 0.040),
  vec4(0.20, -0.78, 0.050, 0.026), vec4(0.48, -1.30, 0.026, 0.018), vec4(0.48, -1.19, 0.026, 0.018),
  vec4(0.48, -1.08, 0.026, 0.018), vec4(0.48, -0.97, 0.026, 0.018), vec4(0.70, -1.25, 0.06, 0.032));
const vec2 VX_B[NV] = vec2[](
  vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0), vec2(2.0, -1.0), vec2(2.0, -1.0),
  vec2(2.0, -1.0), vec2(2.0, -1.0), vec2(-1.0, 1.0));

vec3 planetCol(vec3 P, vec3 rd, float t, float pxA, out float m){
  vec3 n = P / RP;
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lon = atan(n.x, -n.z);
  float mu = max(dot(n, -rd), 0.0);
  float fpl = t * pxA / RP / max(mu, 0.06);
  // vortices: deflect the band lines and paint swirling ovals
  float defl = 0.0, vin = 0.0, vval = 0.0;
  for (int i = 0; i < NV; i++) {
    vec4 a = VX_A[i]; vec2 b = VX_B[i];
    vec2 q = vec2((lon - a.y) * cos(a.x) / a.z, (lat - a.x) / a.w);
    float r2 = dot(q, q);
    if (r2 > 16.0) continue;
    defl -= (lat - a.x) * 0.55 * exp(-r2 * 0.35);
    float r = sqrt(r2);
    float ins = smoothstep(1.05, 0.8, r);
    if (ins > 0.0) {
      vec2 qr = rot(TAU * b.x * uPhase + 2.6 * (1.0 - r)) * q;
      float sw = vnoise(qr * 2.6 + float(i) * 7.3) * 0.6 + 0.4 * (0.5 + 0.5 * sin(atan(qr.y, qr.x) * 2.0 + r * 7.0));
      float v = b.y * (0.20 + 0.18 * sw) - 0.10 * (1.0 - smoothstep(0.0, 0.35, r)) * b.y;
      vval = mix(vval, v, ins); vin = max(vin, ins);
    }
    vval -= 0.10 * exp(-(r - 1.0) * (r - 1.0) / 0.03) * b.y;
  }
  // band flow: two time-offset copies cross-faded (seamless for any jet speed)
  float wv = vnoise(vec2(lon * 7.0, lat * 22.0)) - 0.5;
  float latw = lat + defl + 0.016 * wv * sat(1.4 - fpl * 10.0)
             + 0.012 * sin(lon * 28.0) * exp(-(lat - 0.86) * (lat - 0.86) / 0.0009);
  float jet = 0.22 * sin(lat * 11.0) + 0.10 * sin(lat * 27.0 + 1.3);
  float cyc = uPhase * 12.0;
  float f1 = fract(cyc), f2 = fract(cyc + 0.5);
  float w1 = 1.0 - abs(2.0 * f1 - 1.0);
  float b1 = bandTex(lon + jet * (f1 - 0.5) / 12.0, latw, fpl);
  float b2 = bandTex(lon + jet * (f2 - 0.5) / 12.0, latw, fpl);
  float band = mix(b2, b1, w1);
  band = mix(band, vval, vin);
  vec3 alb = mix(uBandB, uBandA, sat(0.5 + band * 2.2));
  alb = mix(alb, uBandC, sat(-band * 3.0 - 0.3));
  // lighting
  float ndl = dot(n, SUN);
  float diff = max(ndl, 0.0);
  float sunI = diff * (0.72 + 0.28 * mu);
  // shadow of the rings on the northern hemisphere
  float shadow = 1.0;
  if (n.y > 0.0 && ndl > -0.05) {
    float s = P.y / SUN.y;
    vec3 Q = P + vec3(SUN.x, -SUN.y, SUN.z) * s;
    float rr = length(Q.xz);
    float ab;
    float tau = ringTau(RCAM - rr, fpl * RP * 2.5, ab);
    shadow = exp(-tau * 1.5);
  }
  // thin bright rim right at the lit limb
  float rim = smoothstep(0.16, 0.02, mu) * sqrt(diff) * 0.35;
  vec3 c = alb * (uSun * (sunI * shadow * 1.25 + rim * shadow) + uRingLit * 0.035 * (1.0 - 0.6 * n.y));
  m = ndl > 0.02 ? 1.0 : 7.0;
  return c;
}

// ================================================================ rocks
float rockMap(vec3 q, int b){
  float d = -1e9;
  for (int k = 0; k < ${NDIR}; k++) d = max(d, dot(q, DIRS[k]) - RK_H[b * ${NDIR} + k]);
  d = smax(d, length(q) - 0.97, 0.12);
  float sd = RK_M[b].w;
  d += 0.085 * (vnoise(q * 3.4 + sd) - 0.5) + 0.035 * (vnoise(q * 8.1 - sd) - 0.5);
  return d;
}
vec3 rockNormal(vec3 q, int b){
  const vec2 e = vec2(0.004, -0.004);
  return normalize(e.xyy * rockMap(q + e.xyy, b) + e.yyx * rockMap(q + e.yyx, b) +
                   e.yxy * rockMap(q + e.yxy, b) + e.xxx * rockMap(q + e.xxx, b));
}
vec3 rockCenter(int b){
  vec4 m = RK_M[b];
  float ph = uPhase * TAU;
  return RK_POS[b] + m.z * vec3(sin(ph + m.w), 0.5 * sin(2.0 * ph + m.w * 1.7), cos(ph + m.w));
}
mat3 rockRot(int b){
  vec4 m = RK_M[b];
  return axisRot(RK_AX[b], TAU * m.y * uPhase + m.w);
}

// ================================================================ moonlet
vec3 moonPos(){
  float ph = uPhase * TAU;
  float x = XG + 0.06 * cos(ph);
  float v = 0.35 - 0.12 * sin(ph);
  float r = RCAM - x;
  float th = v / r;
  return vec3(r * sin(th), 0.035 * sin(ph + 1.0), -r * cos(th));
}

// ================================================================ ring sheet
// azimuthal arc coordinate relative to the camera meridian
vec3 ringShade(vec3 H, vec3 ro, vec3 rd, float t, float pxA, out float alpha, out float m){
  float rr = length(H.xz);
  float x = RCAM - rr;
  float v = rr * atan(H.x, -H.z);
  // footprints in x and v
  vec2 er = H.xz / rr;
  vec2 d2 = normalize(rd.xz);
  float mu = max(-rd.y, 0.002);
  float cs = abs(dot(er, d2)), sn = abs(er.x * d2.y - er.y * d2.x);
  float fx = t * pxA * (cs / mu + sn);
  float fv = t * pxA * (sn / mu + cs);
  float alb;
  float tau = ringTau(x, fx, alb);

  // moonlet wake: scalloped gap edges
  vec3 mp = moonPos();
  float vm = rr * atan(mp.x, -mp.z);
  float dv = v - vm;
  float lam = 0.85;
  float ph = TAU * 2.0 * uPhase;
  float envO = exp(-max(dv, 0.0) / 2.6) * smoothstep(-0.15, 0.25, dv);
  float envI = exp(-max(-dv, 0.0) / 2.6) * smoothstep(-0.15, 0.25, -dv);
  float eo = XG - GW + 0.13 * envO * sin(TAU * dv / lam - ph);
  float ei = XG + GW - 0.13 * envI * sin(TAU * -dv / lam - ph);
  float gap = bandS(eo, ei, x, max(fx, 0.004));
  tau *= 1.0 - gap;
  // bright crests where the edge bulges into the gap
  float crest = envO * max(sin(TAU * dv / lam - ph), 0.0) * bandS(eo - 0.12, eo, x, max(fx, 0.01))
              + envI * max(sin(TAU * -dv / lam - ph), 0.0) * bandS(ei, ei + 0.12, x, max(fx, 0.01));

  // density waves (tightly wound spirals, exaggerated pitch)
  float th = v / rr;
  for (int i = 0; i < 3; i++) {
    float xw = i == 0 ? 2.25 : (i == 1 ? 5.3 : 14.5);
    float lw = i == 0 ? 0.75 : (i == 1 ? 1.1 : 3.0);
    float k0 = i == 0 ? 3.0 : (i == 1 ? 2.2 : 0.9);
    float xi = xw - x;
    if (xi > 0.0 && xi < lw) {
      float k = k0 + k0 * 4.0 * xi / lw;
      float phs = TAU * (k0 * xi + 2.0 * k0 * xi * xi / lw) + 160.0 * th - TAU * 2.0 * uPhase;
      float amp = smoothstep(0.0, 0.08, xi) * exp(-2.2 * xi / lw) * sat(1.6 - fx * k * 2.2);
      tau *= 1.0 + 0.75 * amp * sin(phs);
    }
  }

  // clumps: lanes with Keplerian shear, each periodic over the loop
  float laneW = 0.11;
  float li = floor(x / laneW);
  float xc = (li + 0.5) * laneW;
  float spd = -SHEAR * (xc - XG);
  float trav = abs(spd) * uLoop;
  float W = max(trav, 2.4);
  float nper = max(1.0, floor(W / 2.4));
  W = W / nper;
  float vt = v - sign(spd) * (W * nper / uLoop) * uTime;
  float cant = 0.45;
  float Nc = max(1.0, floor(W * 7.0 + 0.5));
  float cv = (vt + x * cant) * Nc / W;
  float cl = vnoise(vec2(cv, x * 11.0 + li * 3.1), ivec2(int(Nc), 0));
  float Nc2 = Nc * 3.0;
  float cl2 = vnoise(vec2((vt + x * cant) * Nc2 / W, x * 33.0 + li * 1.7), ivec2(int(Nc2), 0));
  float clv = sat(1.4 - fv * 7.0 * 0.8);
  float clv2 = sat(1.4 - fv * 21.0 * 0.8);
  float clump = 1.0 + clv * 1.1 * (cl - 0.5) + clv2 * 0.8 * (cl2 - 0.5);
  float lane = hash11(li + 0.5);
  clump *= 1.0 + 0.5 * (lane - 0.5) * sat(1.5 - fx / laneW);
  tau *= max(clump, 0.0);

  // illumination: single-scattering-ish brightness, grazing opacity
  float refl = 1.0 - exp(-1.4 * tau);
  alpha = 1.0 - exp(-tau / max(mu, 0.03) * 0.8);
  vec3 col = mix(uRingB, uRingA, sat(alb * 1.6 - 0.3)) * refl * 0.95;
  col += uSun * crest * 0.9;
  m = t < 4.5 ? 3.0 : 2.0;
  return col * uSun;
}

// ================================================================ shading of rocks
vec3 rockShade(vec3 pw, vec3 nw, vec3 rd, int b, out float m){
  float ndl = dot(nw, SUN);
  float diff = max(ndl, 0.0);
  // frost / grime albedo variation
  float fr = vnoise(pw * 9.0 + RK_M[b].w);
  vec3 alb = mix(uRock, uIce, smoothstep(0.35, 0.75, fr));
  float rimv = pow(1.0 - max(dot(nw, -rd), 0.0), 3.0);
  vec3 c = alb * uSun * (diff * 1.25 + rimv * diff * 0.8);
  c += alb * uRingLit * 0.10 * max(-nw.y, 0.0);      // ringshine from below
  c += alb * uSun * 0.012;
  m = 4.0;
  return c;
}

// ================================================================ main
vec3 sceneColor(vec2 p, out float mat, out float depth){
  float ph = uPhase * TAU;
  float yaw = YAW0 + uCamAmt * 0.02 * sin(ph);
  float pitch = -0.075 + uCamAmt * 0.012 * sin(2.0 * ph + 1.0);
  float roll = 0.16 + uCamAmt * 0.01 * sin(ph + 2.0);
  vec3 ro = vec3(uCamAmt * 0.12 * sin(ph + 0.5), CAMH + uCamAmt * 0.05 * sin(2.0 * ph), -RCAM + uCamAmt * 0.08 * cos(ph));
  vec3 fwd = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 rgt = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 upv = cross(fwd, rgt);
  vec2 q = rot(roll) * p;
  vec3 rd = normalize(q.x * rgt + q.y * upv + FOC * fwd);
  float pxA = uPxSize * 2.6 / FOC;

  // ---- opaque: rocks
  float tb = 1e9; int bi = -1; vec3 qh = vec3(0.0); mat3 Mh = mat3(1.0);
  for (int b = 0; b < NR; b++) {
    float R = RK_M[b].x;
    vec3 c = rockCenter(b);
    vec2 hb = sphHit(ro, rd, c, R * 1.12);
    if (hb.y < 0.0 || hb.x > tb) continue;
    mat3 M = rockRot(b);
    vec3 rol = M * (ro - c), rdl = M * rd;
    float t = max(hb.x, 0.0);
    for (int i = 0; i < 56; i++) {
      vec3 qq = (rol + rdl * t) / R;
      float d = rockMap(qq, b) * R;
      if (d < 0.0004 * t) { if (t < tb) { tb = t; bi = b; qh = qq; Mh = M; } break; }
      t += d * 0.8;
      if (t > hb.y) break;
    }
  }
  // ---- moonlet
  vec3 mp = moonPos();
  vec2 hm = sphHit(ro, rd, mp, 0.085);
  float tm = (hm.x > 0.0 && hm.x < tb) ? hm.x : 1e9;

  // ---- planet
  vec2 hp = sphHit(ro, rd, vec3(0.0), RP);
  float tp = hp.x > 0.0 ? hp.x : 1e9;

  float topq = min(min(tb, tm), tp);
  vec3 col = vec3(0.0);
  float T = 1.0;
  mat = 0.0; depth = 1.0;
  float best = 0.0;
  // ---- ring sheet
  if (rd.y < 0.0) {
    float tr = ro.y / -rd.y;
    if (tr < topq) {
      vec3 H = ro + rd * tr;
      float a, m;
      vec3 rc = ringShade(H, ro, rd, tr, pxA, a, m);
      col += rc * a;
      T *= 1.0 - a;
      mat = m; best = luma(rc * a);
      depth = sat(tr / 150.0);
    }
  }
  vec3 oc = vec3(0.0); float om = 0.0;
  if (tb < 1e8 && tb <= tm && tb <= tp) {
    vec3 nw = transpose(Mh) * rockNormal(qh, bi);
    oc = rockShade(ro + rd * tb, nw, rd, bi, om);
    if (T > 0.99) depth = sat(tb / 150.0);
  } else if (tm < 1e8 && tm <= tp) {
    vec3 pw = ro + rd * tm;
    vec3 nw = normalize(pw - mp);
    nw = normalize(nw + 0.25 * (vec3(vnoise(nw * 6.0), vnoise(nw * 6.0 + 3.1), vnoise(nw * 6.0 + 7.7)) - 0.5));
    oc = rockShade(pw, nw, rd, 0, om); om = 5.0;
  } else if (tp < 1e8) {
    oc = planetCol(ro + rd * tp, rd, tp, pxA, om);
    if (T > 0.99) depth = 1.0;
  } else {
    oc = starField(rd) * uStar; om = 6.0;
  }
  col += T * oc;
  if (luma(T * oc) > best) mat = om;
  return col;
}
`;

  ASCII.registerScene({
    id: 'rings',
    name: 'Inside the Rings',
    tagline: 'ice boulders adrift above the ring sheet of a banded giant',
    loop: 120,
    bg: '#0a0908',
    palettes: [
      {
        name: 'Cassini Gold',
        colors: {
          uSun: '#fff3dc', uIce: '#efe2c4', uRock: '#a88a62', uBandA: '#f4e4bd', uBandB: '#d0a666', uBandC: '#9a6f3c',
          uRingA: '#efe0bd', uRingB: '#b8925e', uRingLit: '#e8cf9c', uStar: '#fff4e2',
        },
      },
    ],
    glyphSets: {
      1: { edge: ' .,\'`-_:;~"^=+*!|/\\()<>', tone: ' .`\':-~=+*xo#%' },
      2: { edge: ' .,\'`-_:;~"=', tone: ' .`\'-:~=' },
      3: { edge: ' .,\'`-_:;~"^=+*o()', tone: ' .`\':-~=+*o' },
      4: { edge: ' .,\'`-_:;~"^=+*!|/\\()[]{}<>ilrtcvxzLTJVYXA#%&@', tone: ' .`\':-~=+*xoe#%&@' },
      5: { edge: ' .,\'`-_:;~"^=+*()oO0@#', tone: ' .:-=+*oO#@' },
      6: { edge: ' .\'`,+*', tone: ' .`\'+*' },
      7: { edge: ' .,\'`-_:;~"', tone: ' .`\':-~' },
    },
    look: { exposure: 1.0 },
    defaults: { detail: 1, atmosphere: 0.5, camera: 0.5 },
    glsl: GLSL,
  });
})();

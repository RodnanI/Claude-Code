// wndo :: pipeline shaders
(() => {
  const W = window.W;
  const G = (W.GLSL = W.GLSL || {});
  const S = (W.SH = W.SH || {});

  G.common = /* glsl */ `
#define PI 3.14159265
#define TAU 6.28318531
float sat(float x){ return clamp(x, 0.0, 1.0); }
vec3 sat3(vec3 x){ return clamp(x, 0.0, 1.0); }
float sq(float x){ return x * x; }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float fill(float d, float r, float aa){ return 1.0 - smoothstep(r - aa, r, d); }
float band(float x, float a, float b, float w){ return smoothstep(a - w, a, x) * (1.0 - smoothstep(b, b + w, x)); }
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash21(float p){ vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
vec4 hash42(vec2 p){ vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099)); p4 += dot(p4, p4.wzxy + 33.33); return fract((p4.xxyz + p4.yzzw) * p4.zywx); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
const mat2 FBM_R = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = FBM_R * p + 3.1; a *= 0.5; } return s; }
float fbm3o(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = FBM_R * p + 3.1; a *= 0.5; } return s * 1.143; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec4 bspline(sampler2D t, vec2 uv, vec2 size){
  vec2 st = uv * size - 0.5; vec2 i = floor(st); vec2 f = st - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 p0 = (i - 0.5 + w1 / g0) / size, p1 = (i + 1.5 + w3 / g1) / size;
  return g0.y * (g0.x * texture(t, p0) + g1.x * texture(t, vec2(p1.x, p0.y)))
       + g1.y * (g0.x * texture(t, vec2(p0.x, p1.y)) + g1.x * texture(t, p1));
}
vec4 bsplineLod(sampler2D t, vec2 uv, float lod){
  vec2 size = vec2(textureSize(t, int(lod)));
  vec2 st = uv * size - 0.5; vec2 i = floor(st); vec2 f = st - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 p0 = (i - 0.5 + w1 / g0) / size, p1 = (i + 1.5 + w3 / g1) / size;
  return g0.y * (g0.x * textureLod(t, p0, lod) + g1.x * textureLod(t, vec2(p1.x, p0.y), lod))
       + g1.y * (g0.x * textureLod(t, vec2(p0.x, p1.y), lod) + g1.x * textureLod(t, p1, lod));
}
`;

  G.camera = /* glsl */ `
uniform vec3 uCamPos;
uniform mat3 uCamMat;
uniform vec2 uTanHalf;
uniform vec2 uRes;
uniform float uTime;
vec3 camRay(vec2 fc){
  vec2 p = fc / uRes * 2.0 - 1.0;
  return normalize(uCamMat * vec3(p.x * uTanHalf.x, p.y * uTanHalf.y, 1.0));
}
`;

  S.vert = /* glsl */ `
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

  // 13 tap downsample (Jimenez). Karis weighting on the first level kills sparkle flicker.
  S.down = /* glsl */ `
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uKaris;
vec4 s(vec2 d){ return texture(uSrc, vUv + d * uTexel); }
float kw(vec4 c){ return 1.0 / (1.0 + uKaris * dot(c.rgb, vec3(0.2126, 0.7152, 0.0722))); }
void main(){
  vec4 a = s(vec2(-2, 2)), b = s(vec2(0, 2)), c = s(vec2(2, 2));
  vec4 d = s(vec2(-2, 0)), e = s(vec2(0, 0)), f = s(vec2(2, 0));
  vec4 g = s(vec2(-2, -2)), h = s(vec2(0, -2)), i = s(vec2(2, -2));
  vec4 j = s(vec2(-1, 1)), k = s(vec2(1, 1)), l = s(vec2(-1, -1)), m = s(vec2(1, -1));
  vec4 g0 = (j + k + l + m) * 0.25, g1 = (a + b + d + e) * 0.25, g2 = (b + c + e + f) * 0.25;
  vec4 g3 = (d + e + g + h) * 0.25, g4 = (e + f + h + i) * 0.25;
  float w0 = 0.5 * kw(g0), w1 = 0.125 * kw(g1), w2 = 0.125 * kw(g2), w3 = 0.125 * kw(g3), w4 = 0.125 * kw(g4);
  o = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
}
`;

  S.copy = /* glsl */ `
in vec2 vUv; out vec4 o; uniform sampler2D uSrc;
void main(){ o = vec4(texture(uSrc, vUv).rgb, 1.0); }
`;

  // the outside at the current focus: blend two pyramid levels, plus a little bloom
  S.composite = /* glsl */ `
${G.common}
in vec2 vUv; out vec4 o;
uniform sampler2D uLA, uLB, uBl1, uBl2;
uniform vec2 uSizeA, uSizeB, uSizeBl1, uSizeBl2;
uniform float uMix, uASharp, uBloom;
void main(){
  vec3 a = uASharp > 0.5 ? texture(uLA, vUv).rgb : bspline(uLA, vUv, uSizeA).rgb;
  vec3 b = bspline(uLB, vUv, uSizeB).rgb;
  vec3 c = mix(a, b, uMix);
  c += (bspline(uBl1, vUv, uSizeBl1).rgb * 0.55 + bspline(uBl2, vUv, uSizeBl2).rgb * 0.45) * uBloom;
  o = vec4(c, 1.0);
}
`;

  // bokeh-only mode: a soft gradient instead of the full scene
  S.bokehBg = /* glsl */ `
${G.common}
in vec2 vUv; out vec4 o;
uniform vec3 uTop, uMid, uBot; uniform float uTime;
void main(){
  float y = vUv.y;
  vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.55, y));
  c = mix(c, uTop, smoothstep(0.45, 1.0, y));
  c *= 0.85 + 0.3 * vnoise(vUv * vec2(3.0, 2.0) + uTime * 0.01);
  o = vec4(c, 9000.0);
}
`;

  // light sprites. kind: 0 point, 1 mirrored in y=0 (wet road / water), 2 motion streak, 3 bokeh-only
  S.bokehVS = /* glsl */ `
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aA;
layout(location = 2) in vec4 aB;
layout(location = 3) in vec4 aC;
uniform vec3 uCamPos; uniform mat3 uCamMat; uniform vec2 uTanHalf;
uniform vec2 uTarget;
uniform float uK, uFocusInv, uSharp, uBlurAmt, uGain, uHalo, uReflStretch, uShutter, uNoDepth;
uniform sampler2D uDepth;
out vec2 vL; out vec3 vCol; out vec3 vHaloCol; out float vR; out float vLh; out vec2 vDir; out vec2 vScr; out float vHaloR; out float vSharpF;
vec2 proj(vec3 p, out float z){
  vec3 c = transpose(uCamMat) * (p - uCamPos);
  z = c.z;
  return vec2(c.x / (c.z * uTanHalf.x), c.y / (c.z * uTanHalf.y));
}
void main(){
  float kind = aC.x;
  float z;
  vec2 ndc = proj(aA.xyz, z);
  if (z < 0.25 || (kind > 2.5 && uSharp > 0.5)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float dist = length(aA.xyz - uCamPos);
  float ref = dist;
  bool refl = kind > 0.5 && kind < 1.5;
  if (refl) ref = dist * uCamPos.y / (uCamPos.y - aA.y);
  vec2 suv = ndc * 0.5 + 0.5;
  vec2 dsz = vec2(textureSize(uDepth, 0));
  float vis = 1.0;
  if (uNoDepth < 0.5 && all(greaterThan(suv, vec2(0.0))) && all(lessThan(suv, vec2(1.0)))) {
    float tol = max(0.6, ref * 0.035);
    vis = 0.0;
    for (int i = 0; i < 5; i++) {
      vec2 o = i == 0 ? vec2(0.0) : vec2(i == 1 ? 2.0 : (i == 2 ? -2.0 : 0.0), i == 3 ? 2.0 : (i == 4 ? -2.0 : 0.0));
      float d = texelFetch(uDepth, ivec2(suv * dsz + o), 0).a;
      vis += refl ? step(abs(d - ref), tol * 1.5) : step(ref - tol, d);
    }
    vis *= 0.2;
  }
  float pxPerM = uTarget.y * 0.5 / (z * uTanHalf.y);
  float rP = aA.w * pxPerM;
  float rS = max(rP, 0.75);
  float far = min(1.0, (rP * rP) / 0.5625);
  float coc = uK * abs(uFocusInv - 1.0 / dist) * (1.0 - uSharp);
  float r = max(rS, coc);
  float energy = pow(rS / r, 1.6);
  vec2 dir = vec2(1.0, 0.0);
  float lh = 0.0;
  if (refl) {
    dir = vec2(0.0, 1.0);
    lh = rS * uReflStretch * (1.0 - 0.8 * smoothstep(rS, rS * 6.0 + 4.0, coc)) + coc * 0.12;
  } else if (kind > 1.5 && kind < 2.5) {
    float z2;
    vec2 n2 = proj(aA.xyz + aC.yzw * uShutter, z2);
    vec2 dpx = (n2 - ndc) * 0.5 * uTarget;
    float L = length(dpx);
    if (L > 0.01) { dir = dpx / L; lh = L * 0.5; ndc = (ndc + n2) * 0.5; }
  }
  float spread = r / (r + lh);
  float blurOnly = kind > 2.5 ? smoothstep(0.12, 0.55, uBlurAmt) : 1.0;
  vCol = aB.rgb * uGain * vis * energy * spread * blurOnly * far;
  float haloR = (rS * 7.0 + 14.0) * aB.a * uHalo;
  vHaloR = max(haloR, 1.0);
  vHaloCol = aB.rgb * aB.a * uHalo * vis * 0.0045 * blurOnly * (refl ? 0.4 : 1.0) * sqrt(far);
  float ext = max(r * 1.18 + 1.5, haloR);
  vec2 q = vec2(aCorner.x * (ext + lh), aCorner.y * ext);
  vL = q;
  vec2 off = dir * q.x + vec2(-dir.y, dir.x) * q.y;
  vR = r; vLh = lh; vDir = dir; vScr = ndc;
  vSharpF = 1.0 - smoothstep(1.2, 2.6, r);
  gl_Position = vec4(ndc + off / uTarget * 2.0, 0.0, 1.0);
}
`;

  S.bokehFS = /* glsl */ `
${G.common}
in vec2 vL; in vec3 vCol; in vec3 vHaloCol; in float vR; in float vLh; in vec2 vDir; in vec2 vScr; in float vHaloR; in float vSharpF;
uniform float uBlades, uBladeRot, uRim, uCat, uCA, uSoft;
out vec4 o;
float apert(vec2 p){
  float d = length(p);
  if (uBlades > 2.5) {
    float a = atan(p.y, p.x) + uBladeRot;
    float seg = TAU / uBlades;
    float pd = cos(floor(0.5 + a / seg) * seg - a) * d / mix(1.0, cos(PI / uBlades), 0.35);
    d = mix(pd, d, 0.12);
  }
  return d;
}
void main(){
  float along = sign(vL.x) * max(abs(vL.x) - vLh, 0.0);
  vec2 p = vec2(along, vL.y) / max(vR, 0.001);
  vec2 sp = vDir * p.x + vec2(-vDir.y, vDir.x) * p.y;
  float d = apert(sp);
  float aa = 1.3 / vR + uSoft * 0.3;
  vec2 off = vScr * uCat * 0.55;
  float d2 = length(sp + off) / (1.0 + uCat * 0.08);
  float de = max(d, d2);
  float m = fill(de, 1.0, aa);
  float rim = 1.0 - 0.2 * uRim + uRim * 1.5 * smoothstep(0.5, 0.97, de);
  rim *= 1.0 + 0.035 * sin(de * 31.0);
  float ca = uCA * 0.045;
  vec3 disc = vec3(fill(de, 1.0 + ca, aa), m, fill(de, 1.0 - ca, aa)) * rim;
  float core = exp(-dot(p, p) * 2.2);
  vec3 shape = mix(disc, vec3(core), vSharpF);
  float hd = length(vec2(along, vL.y)) / vHaloR;
  float halo = (exp(-hd * 5.0) + 0.25 / (1.0 + hd * hd * 40.0)) * (1.0 - smoothstep(0.7, 1.0, hd));
  o = vec4(vCol * shape + vHaloCol * halo, 1.0);
}
`;

  // condensation wipe mask (glass space), ping-pong
  S.wipe = /* glsl */ `
in vec2 vUv; out vec4 o;
uniform sampler2D uPrev; uniform vec4 uSeg; uniform float uRad, uDecay, uActive, uAspect;
void main(){
  vec2 tx = 1.0 / vec2(textureSize(uPrev, 0));
  float v = texture(uPrev, vUv).r;
  float n = texture(uPrev, vUv + vec2(tx.x, 0.0)).r + texture(uPrev, vUv - vec2(tx.x, 0.0)).r
          + texture(uPrev, vUv + vec2(0.0, tx.y)).r + texture(uPrev, vUv - vec2(0.0, tx.y)).r;
  v = mix(v, n * 0.25, 0.06) * uDecay;
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 pa = p - uSeg.xy, ba = uSeg.zw - uSeg.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-7), 0.0, 1.0);
  float d = length(pa - ba * h);
  v = max(v, (1.0 - smoothstep(uRad * 0.5, uRad, d)) * uActive);
  o = vec4(v, 0.0, 0.0, 1.0);
}
`;

  // one-off tiling noise for the glass: R condensation, G frost ridges, B micro beads, A smudges
  S.glassTex = /* glsl */ `
${G.common}
in vec2 vUv; out vec4 o;
float pn(vec2 p, float per){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(mod(i, per)), hash12(mod(i + vec2(1, 0), per)), u.x),
             mix(hash12(mod(i + vec2(0, 1), per)), hash12(mod(i + vec2(1, 1), per)), u.x), u.y);
}
float pfbm(vec2 p, float per){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += a * pn(p, per); p *= 2.0; per *= 2.0; a *= 0.5; } return s / 0.984; }
float cells(vec2 p, float per){
  vec2 i = floor(p), f = fract(p); float m = 1.0; float r = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 c = vec2(x, y); vec2 id = mod(i + c, per);
    vec3 h = hash32(id + 7.0);
    float d = length(c + h.xy - f) / (0.25 + 0.5 * h.z);
    if (d < m) { m = d; r = h.z; }
  }
  return (1.0 - smoothstep(0.55, 0.85, m)) * (0.4 + 0.6 * r);
}
void main(){
  vec2 uv = vUv;
  float R = pfbm(uv * 5.0, 5.0);
  vec2 w = vec2(pfbm(uv * 3.0, 3.0), pfbm(uv * 3.0 + 17.0, 3.0));
  vec2 q = uv * 8.0 + w * 2.2;
  float per = 8.0, a = 0.55, rg = 0.0;
  for (int i = 0; i < 6; i++){ float n = pn(q, per); rg += a * pow(1.0 - abs(2.0 * n - 1.0), 3.0); q = q * 2.0; per *= 2.0; a *= 0.62; }
  float B = max(cells(uv * 90.0, 90.0), cells(uv * 160.0 + 3.0, 160.0) * 0.7);
  float A = pfbm(vec2(uv.x * 4.0, uv.y * 4.0) + vec2(pfbm(uv * 2.0, 2.0) * 1.5, 0.0), 4.0);
  o = vec4(R, sat(rg * 0.9), B, A);
}
`;

  // the window: glass (drops, condensation, frost), frame, sill, objects, reflections, then tone mapping
  S.final = /* glsl */ `
${G.common}
in vec2 vUv; out vec4 o;
uniform sampler2D uOut, uDV, uWipe, uNoise;
uniform vec2 uRes; uniform float uTime;
uniform vec2 uHead; uniform float uKp;
uniform float uK, uFocusInv, uGlassBlurK;
uniform float uWet, uRunRate, uDropSize, uFlowAng, uCond, uFrost, uFogT, uSmudge, uSnowGlass, uOutLod, uWipeOn;
uniform float uStyle; uniform vec4 uI3; uniform vec4 uO3; uniform vec4 uZ; uniform float uCorner;
uniform vec4 uBars[6]; uniform float uBarN;
uniform vec3 uMat, uMat2, uWall; uniform float uMatKind;
uniform vec3 uLamp, uLampPos;
uniform vec4 uCandle, uMug, uPlant; uniform float uFlame; uniform vec2 uFlameSway;
uniform float uRefl, uFlash, uTrain; uniform vec3 uFlashCol;
uniform float uExposure, uSat, uContrast, uVig, uGrain, uWarm, uDim;
uniform vec3 uLift, uGain;

vec3 OUTAVG;

vec2 s2uv(vec2 s){ return (s * uRes.y + 0.5 * uRes) / uRes; }
vec4 projRect(vec4 r, float z){ return (r * uKp - uHead.xyxy) / z; }
float sdBox(vec2 p, vec4 r, float rad){
  vec2 c = (r.xy + r.zw) * 0.5, hs = (r.zw - r.xy) * 0.5;
  vec2 q = abs(p - c) - hs + rad;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}
float blurPx(float z){ return uK * abs(uFocusInv - 1.0 / z) * uGlassBlurK; }
// coverage of "inside" with soft edge in pixels
float inside(float sd, float w){ return 1.0 - smoothstep(-w, w, sd * uRes.y); }
vec3 pt3(vec2 s, float z){ return vec3((s * z + uHead) / uKp, z); }

// ---------------- lighting for room-side surfaces ----------------
vec3 flamePos(){ return uCandle.xyz + vec3(uFlameSway.x * 0.004, 0.118, 0.0); }
vec3 flameCol(){ return vec3(1.0, 0.62, 0.28) * uFlame; }
vec3 roomLight(vec3 P, vec3 N, float gloss){
  vec3 c = vec3(0.0);
  vec3 L = uLampPos - P; float d2 = dot(L, L); L *= inversesqrt(d2);
  float lam = max(dot(N, L), 0.0);
  vec3 V = normalize(-P); vec3 H = normalize(L + V);
  c += uLamp * (lam / (0.6 + d2 * 0.5) + gloss * pow(max(dot(N, H), 0.0), 40.0) * 0.4 / (0.6 + d2 * 0.5));
  if (uCandle.w > 0.5) {
    vec3 F = flamePos() - P; float f2 = dot(F, F); F *= inversesqrt(f2);
    c += flameCol() * 0.012 * max(dot(N, F) * 0.85 + 0.15, 0.0) / (0.002 + f2);
  }
  vec3 G = vec3((uI3.x + uI3.z) * 0.5, (uI3.y + uI3.w) * 0.5 + 0.15, uZ.z + 0.6) - P;
  float g2 = dot(G, G); G *= inversesqrt(g2);
  vec3 outL = OUTAVG + uFlashCol * uFlash;
  c += outL * (max(dot(N, G), 0.0) * 0.75 / (0.35 + g2 * 0.8) + 0.42);
  c += uLamp * 0.03;
  return c;
}

// ---------------- materials ----------------
vec3 woodAlb(vec2 uv, float along){
  vec3 base = uMat;
  if (uMatKind < 0.5) { // painted
    float n = vnoise(uv * vec2(3.0, 90.0)) * 0.04 + vnoise(uv * 400.0) * 0.02;
    return base * (0.97 + n);
  } else if (uMatKind < 1.5) { // oak
    float g = fbm(vec2(uv.x * 2.0, uv.y * 38.0) + fbm(uv * vec2(1.0, 6.0)) * 2.0);
    float rings = 0.5 + 0.5 * sin(g * 24.0);
    return base * (0.72 + 0.28 * rings) * (0.9 + 0.2 * vnoise(uv * vec2(4.0, 60.0)));
  } else if (uMatKind < 2.5) { // steel
    return base * (0.9 + 0.1 * vnoise(uv * vec2(2.0, 120.0)));
  }
  return base * (0.96 + 0.04 * vnoise(uv * 300.0));
}

float sillAO(vec3 P){
  float ao = 1.0;
  vec3 objs[3]; objs[0] = uCandle.xyz; objs[1] = uMug.xyz; objs[2] = uPlant.xyz;
  float on[3]; on[0] = uCandle.w; on[1] = uMug.w; on[2] = uPlant.w;
  for (int i = 0; i < 3; i++) {
    if (on[i] < 0.5) continue;
    vec2 dd = P.xz - objs[i].xz; vec2 lo = normalize(objs[i].xz - uLampPos.xz) * 0.035;
    ao *= 1.0 - 0.5 * exp(-dot(dd, dd) / 0.0011) - 0.3 * exp(-dot(dd - lo, dd - lo) / 0.0045);
  }
  return ao;
}

// ---------------- drops ----------------
vec4 beads(vec2 p, float cell, float dens, float seed, float aa){
  vec2 g = p / cell; vec2 id = floor(g); vec2 f = g - id - 0.5;
  vec4 h = hash42(id + seed * 37.0);
  float period = mix(16.0, 42.0, h.z);
  float ph = uTime / period + h.w;
  float cyc = floor(ph), age = fract(ph);
  vec4 k = hash42(id + cyc * 11.7 + seed * 13.0);
  float present = smoothstep(k.x - 0.1, k.x, dens);
  float r = mix(0.12, 0.42, pow(k.y, 1.6)) * present;
  r *= smoothstep(0.0, 0.012, age) * mix(1.0, 0.6, age) * (1.0 - smoothstep(0.88, 1.0, age));
  vec2 c = (k.zw - 0.5) * max(0.0, 1.0 - 2.0 * r) * 0.85;
  vec2 d = f - c;
  d.y *= d.y > 0.0 ? 1.12 : 0.9;
  d.x *= 1.0 + (h.x - 0.5) * 0.2;
  float cov = fill(length(d), r, aa / cell);
  return vec4(d / max(r, 1e-3), cov, r * cell);
}
float wig(float y, vec4 k){ return sin(y * (7.0 + 6.0 * k.z) + k.w * 6.28) * 0.6 + sin(y * (17.0 + 9.0 * k.x) + k.y * 6.28) * 0.4; }
vec4 runs(vec2 p, float cw, float dens, float seed, float aa, out float clr, out float rr){
  float col = floor(p.x / cw);
  float cx = (col + 0.5) * cw;
  vec4 h = hash42(vec2(col, seed * 19.0));
  clr = 0.0; rr = 0.0;
  if (h.x > dens * 0.8) return vec4(0.0);
  float period = mix(6.0, 15.0, h.y);
  float ph = uTime * uRunRate / period + h.z;
  float cyc = floor(ph), tau = fract(ph);
  vec4 k = hash42(vec2(col * 1.37 + seed, cyc));
  float y0 = mix(0.05, 0.62, k.x), y1 = -0.7, L = y0 - y1;
  float mv = mix(0.3, 0.55, k.y);
  float s = clamp(tau / mv, 0.0, 1.0);
  float n = floor(mix(2.0, 6.0, k.z));
  float st = s - sin(TAU * n * s) / (TAU * n) * 0.92;
  st = mix(st, s * s, 0.3);
  float yh = y0 - L * st;
  float amp = cw * 0.2;
  float rh = cw * mix(0.13, 0.21, k.w) * (1.0 - smoothstep(0.92, 1.0, tau));
  vec2 d = p - vec2(cx + amp * wig(yh, k), yh);
  d.y *= d.y > 0.0 ? 0.62 : 1.05;
  float headCov = fill(length(d), rh, aa);
  float inTrail = step(yh, p.y) * step(p.y, y0);
  float tp = mv * clamp((y0 - p.y) / L, 0.0, 1.0);
  float age = max(tau - tp, 0.0) * period / uRunRate;
  float dx = abs(p.x - cx - amp * wig(p.y, k));
  clr = inTrail * (1.0 - smoothstep(rh * 0.35, rh * 0.95, dx)) * exp(-age * 0.035);
  float sp = rh * 1.8;
  float bi = floor(p.y / max(sp, 1e-4));
  vec2 bh = hash22(vec2(bi + cyc * 31.0, col + seed));
  float by = (bi + 0.5 + (bh.x - 0.5) * 0.5) * sp;
  float bx = cx + amp * wig(by, k) + (bh.y - 0.5) * rh * 0.5;
  float btp = mv * clamp((y0 - by) / L, 0.0, 1.0);
  float bage = max(tau - btp, 0.0) * period / uRunRate;
  float ok = step(yh + rh * 1.6, by) * step(by, y0) * step(0.3, bh.y);
  float br = rh * mix(0.22, 0.5, bh.x) * ok * exp(-bage * 0.045) * (1.0 - smoothstep(0.86, 1.0, tau));
  vec2 bd = p - vec2(bx, by);
  float bCov = fill(length(bd), br, aa);
  if (bCov > headCov) { rr = br; return vec4(bd / max(br, 1e-4), bCov, 0.0); }
  rr = rh; return vec4(d / max(rh, 1e-4), headCov, 0.0);
}
// snowflake landing on the glass, melting into a bead
vec4 flakes(vec2 p, float cell, float dens, float aa, out float crystal){
  vec2 g = p / cell; vec2 id = floor(g); vec2 f = g - id - 0.5;
  vec4 h = hash42(id + 91.0);
  float period = mix(10.0, 26.0, h.z);
  float ph = uTime / period + h.w; float cyc = floor(ph), age = fract(ph);
  vec4 k = hash42(id + cyc * 5.1 + 3.0);
  float on = step(k.x, dens);
  vec2 c = (k.zw - 0.5) * 0.4;
  vec2 d = f - c;
  float melt = smoothstep(0.25, 0.6, age);
  float r = mix(0.32, 0.16, melt) * on * smoothstep(0.0, 0.01, age) * (1.0 - smoothstep(0.85, 1.0, age));
  float a = atan(d.y, d.x) + k.y * 6.28;
  float arms = pow(abs(cos(3.0 * a)), 14.0);
  float star = length(d) - r * (0.22 + 0.78 * arms) * (1.0 - melt) - r * melt;
  crystal = (1.0 - melt) * on;
  float cov = fill(star, 0.0, aa / cell * 1.5) * on;
  float rr = max(r, 1e-3);
  return vec4(d / rr, cov, rr * cell);
}

// ---------------- sill objects ----------------
// returns color in rgb, coverage in a
vec4 candle(vec2 s, inout vec3 glowAdd){
  vec3 C = uCandle.xyz; float z = C.z;
  float sc = uKp / z;
  vec2 b = (C.xy * uKp - uHead) / z;
  float w = 0.75 + blurPx(z);
  float px = 1.0 / uRes.y;
  float R = 0.034 * sc, Hh = 0.105 * sc;
  vec2 q = s - b;
  float topY = Hh;
  float ell = R * 0.24;
  float sdBody = max(abs(q.x) - R, max(-q.y, q.y - topY));
  float sdTop = length(vec2(q.x / R, (q.y - topY) / ell)) - 1.0;
  float sd = min(sdBody, sdTop * ell);
  float cov = inside(sd, w);
  float nx = clamp(q.x / R, -1.0, 1.0);
  vec3 N = normalize(vec3(nx, 0.0, -sqrt(max(1.0 - nx * nx, 0.0))));
  vec3 P = vec3((s * z + uHead) / uKp, z);
  vec3 wax = vec3(0.86, 0.79, 0.66);
  vec3 col = wax * roomLight(P, N, 0.25) * 0.85;
  float top = smoothstep(topY - 0.6 * R, topY, q.y);
  col += flameCol() * 0.06 * (0.25 + top * 2.2) * (1.0 - abs(nx) * 0.4) * wax;
  if (sdTop < 0.0) col = wax * (roomLight(P, vec3(0, 1, 0), 0.4) * 0.8 + flameCol() * 0.45);
  // wick + flame
  vec2 fq = q - vec2(uFlameSway.x * 0.004 * sc, topY + 0.004 * sc);
  float wick = (1.0 - smoothstep(0.0, 1.2 * px + blurPx(z) * px, abs(fq.x))) * band(fq.y, -0.002 * sc, 0.012 * sc, px);
  col = mix(col, vec3(0.02), wick * 0.9);
  vec2 f = fq - vec2(0.0, 0.026 * sc);
  f.x -= uFlameSway.x * 0.004 * sc * smoothstep(-0.02 * sc, 0.03 * sc, f.y);
  float fh = 0.024 * sc * (0.9 + 0.2 * uFlameSway.y);
  float fw = 0.0075 * sc;
  float t = clamp((f.y + fh * 0.6) / (fh * 1.9), 0.0, 1.0);
  float width = fw * sqrt(max(t, 0.0)) * (1.0 - t) * 2.6 + fw * 0.1;
  float fl = 1.0 - smoothstep(0.0, width + w * px * 1.5, abs(f.x));
  fl *= smoothstep(-fh * 0.62, -fh * 0.45, f.y) * (1.0 - smoothstep(fh * 1.0, fh * 1.3, f.y));
  float core = fl * (1.0 - smoothstep(0.0, 0.6, t)) * (1.0 - smoothstep(0.0, width * 0.6 + w * px, abs(f.x)));
  vec3 fc = mix(vec3(1.0, 0.42, 0.09), vec3(1.0, 0.86, 0.6), core) * (5.0 + 9.0 * core) * uFlame;
  fc = mix(fc, vec3(0.25, 0.35, 1.0) * 1.5, (1.0 - smoothstep(0.0, 0.12, t)) * 0.6 * fl);
  float fd = length(f / vec2(1.0, 1.6)) / sc;
  glowAdd += flameCol() * 0.00009 / (0.0005 + fd * fd) * (1.0 - smoothstep(0.0, 0.2, fd)) * uCandle.w;
  return vec4(col * cov + fc * fl * uCandle.w, max(cov, fl));
}
vec4 mug(vec2 s, inout vec3 steamAdd){
  vec3 C = uMug.xyz; float z = C.z; float sc = uKp / z;
  vec2 b = (C.xy * uKp - uHead) / z;
  float w = 0.75 + blurPx(z);
  float R = 0.043 * sc, Hh = 0.088 * sc, ell = R * 0.25;
  vec2 q = s - b;
  float sdBody = max(abs(q.x) - R * (1.0 - 0.04 * (1.0 - q.y / Hh)), max(-q.y, q.y - Hh));
  float sdTopE = (length(vec2(q.x / R, (q.y - Hh) / ell)) - 1.0) * ell;
  float sdBot = (length(vec2(q.x / R, q.y / ell)) - 1.0) * ell;
  float sd = min(min(sdBody, sdTopE), sdBot);
  vec2 hq = q - vec2(R * 1.02, Hh * 0.52);
  float hd = abs(length(hq / vec2(1.0, 1.25)) - R * 0.45) - R * 0.11;
  hd = max(hd, -hq.x);
  sd = min(sd, hd);
  float cov = inside(sd, w);
  float nx = clamp(q.x / R, -1.0, 1.0);
  vec3 N = normalize(vec3(nx, 0.0, -sqrt(max(1.0 - nx * nx, 0.0))));
  if (hd < 0.0 && sdBody > 0.0) N = normalize(vec3(0.6, 0.0, -0.8));
  vec3 P = vec3((s * z + uHead) / uKp, z);
  vec3 glaze = vec3(0.30, 0.36, 0.30);
  vec3 col = glaze * roomLight(P, N, 1.0);
  float gl = pow(1.0 - abs(nx - 0.45), 18.0) * 0.5 + pow(1.0 - abs(nx + 0.6), 30.0) * 0.25;
  col += (OUTAVG * 0.7 + uLamp * 0.15) * gl;
  if (sdTopE < 0.0) {
    float inner = length(vec2(q.x / (R * 0.9), (q.y - Hh) / (ell * 0.9)));
    vec3 tea = vec3(0.11, 0.045, 0.012) * (roomLight(P, vec3(0, 1, 0), 0.2) + 0.2);
    tea += (OUTAVG * 0.5 + uLamp * 0.1) * exp(-sq((q.x / R + 0.3) * 4.0)) * 0.6;
    col = mix(glaze * roomLight(P, vec3(0, 1, 0), 0.5), tea, 1.0 - smoothstep(0.82, 0.92, inner));
  }
  // steam
  vec2 sq2 = (q - vec2(0.0, Hh)) / sc;
  if (sq2.y > 0.0 && sq2.y < 0.26) {
    float spread = 0.03 + sq2.y * 0.25;
    float xw = sq2.x + sin(sq2.y * 18.0 - uTime * 1.3) * 0.012 * sq2.y * 6.0;
    float m = exp(-sq(xw / spread) * 2.0);
    float n = fbm(vec2(xw * 30.0, sq2.y * 14.0 - uTime * 1.1)) ;
    float dens = m * smoothstep(0.45, 0.85, n) * smoothstep(0.0, 0.02, sq2.y) * (1.0 - smoothstep(0.08, 0.26, sq2.y));
    steamAdd += (OUTAVG * 0.6 + uLamp * 0.25 + flameCol() * 0.01 + 0.004) * dens * 0.35 * uMug.w;
  }
  return vec4(col, cov);
}
vec4 plant(vec2 s){
  vec3 C = uPlant.xyz; float z = C.z; float sc = uKp / z;
  vec2 b = (C.xy * uKp - uHead) / z;
  float w = 0.75 + blurPx(z);
  vec2 q = (s - b) / sc;
  vec3 P = vec3((s * z + uHead) / uKp, z);
  float potH = 0.075;
  float tw = mix(0.036, 0.045, clamp(q.y / potH, 0.0, 1.0));
  float sdPot = max(abs(q.x) - tw, max(-q.y, q.y - potH));
  sdPot = min(sdPot, max(abs(q.x) - 0.048, abs(q.y - potH + 0.006) - 0.008));
  float cov = inside(sdPot * sc, w);
  float nx = clamp(q.x / 0.045, -1.0, 1.0);
  vec3 N = normalize(vec3(nx, 0.0, -sqrt(max(1.0 - nx * nx, 0.0))));
  vec3 col = vec3(0.42, 0.17, 0.08) * roomLight(P, N, 0.1) * (0.9 + 0.1 * vnoise(q * 300.0));
  float lc = 0.0; vec3 lcol = vec3(0.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float ang = mix(-1.25, 1.25, fi / 8.0) + sin(fi * 7.1) * 0.15 + sin(uTime * 0.4 + fi) * 0.01;
    float len = 0.075 + 0.04 * hash11(fi * 3.7);
    vec2 base = vec2(sin(ang) * 0.012, potH + 0.004);
    vec2 dir = vec2(sin(ang), cos(ang));
    vec2 lq = q - base;
    float along = dot(lq, dir), across = dot(lq, vec2(-dir.y, dir.x));
    along -= across * across * 2.0;
    float t = along / len;
    float wdt = 0.019 * sin(clamp(t, 0.0, 1.0) * PI) * (0.9 + 0.3 * hash11(fi));
    float sdl = max(abs(across) - wdt, max(-along, along - len)) * 0.9;
    float cl = inside(sdl * sc, w);
    if (cl > 0.001) {
      vec3 Nl = normalize(vec3(-dir.y * sign(across) * 0.4, 0.5, -0.8));
      vec3 lc0 = vec3(0.08, 0.2, 0.06) * (0.85 + 0.3 * hash11(fi * 1.3));
      lc0 *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.003, abs(across)));
      vec3 shade = lc0 * roomLight(P, Nl, 0.6) * 1.3;
      shade += (OUTAVG * 0.25 + uLamp * 0.04) * pow(sat(1.0 - abs(across) / max(wdt, 1e-4)), 3.0) * 0.4;
      lcol = mix(lcol, shade, cl); lc = max(lc, cl);
    }
  }
  col = mix(col, lcol, lc);
  return vec4(col, max(cov, lc));
}

vec3 tonemap(vec3 c){
  const mat3 A = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 B = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  c = A * c;
  vec3 a = c * (c + 0.0245786) - 0.000090537;
  vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
  return clamp(B * (a / b), 0.0, 1.0);
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 s = (fc - 0.5 * uRes) / uRes.y;
  vec2 uv = fc / uRes;
  float px = 1.0 / uRes.y;
  OUTAVG = (bsplineLod(uOut, vec2(0.5, 0.6), uOutLod + 1.5).rgb * 2.0 + bsplineLod(uOut, vec2(0.25, 0.4), uOutLod + 1.5).rgb
          + bsplineLod(uOut, vec2(0.75, 0.4), uOutLod + 1.5).rgb) * 0.25;

  float zw = uZ.x, zf = uZ.y, zg = uZ.z, zl = uZ.w;
  bool framed = uStyle > 0.5;
  // glass plane coordinates (fixed to the glass, so drops move with the frame under parallax)
  vec2 g = s + uHead / zg;
  vec3 Pg = pt3(s, zg);

  // ---------- the glass ----------
  float gBlur = blurPx(zg);
  float blurF = smoothstep(0.5, 6.0, gBlur);
  float aa = (1.1 + gBlur) * px;
  vec3 outside = texture(uOut, uv).rgb;
  vec3 col = outside;

  // pane edges for condensation and frost
  float edgeD = 1.0;
  if (framed) {
    edgeD = -sdBox(Pg.xy, uI3, uCorner);
    for (int i = 0; i < 6; i++) { if (float(i) >= uBarN) break; edgeD = min(edgeD, sdBox(Pg.xy, uBars[i], 0.0)); }
  } else {
    edgeD = min(min(0.5 * uRes.x / uRes.y - abs(s.x), 0.5 - abs(s.y)), 1.0) * zg / uKp;
  }
  edgeD = max(edgeD, 0.0);

  vec4 nz = texture(uNoise, g * 0.55);
  vec4 nz2 = texture(uNoise, g * 1.7 + 0.31);
  float wipe = uWipeOn > 0.5 ? texture(uWipe, vec2((g.x + 0.5 * uRes.x / uRes.y) / (uRes.x / uRes.y), g.y + 0.5)).r : 0.0;

  // drops
  float clr = 0.0;
  vec4 D = vec4(0.0); float dR = 0.0;
  float crystal = 0.0;
  if (uWet > 0.001) {
    float ds = uDropSize;
    vec4 b1 = beads(g, 0.028 * ds, uWet, 1.0, aa);
    vec4 b2 = beads(g + 0.37, 0.07 * ds, uWet * 0.75, 2.0, aa);
#if DROPS > 1
    vec4 b3 = beads(g + 0.71, 0.016 * ds, uWet * 1.1, 5.0, aa);
#endif
    vec2 fp = rot(uFlowAng) * g;
    float c1, r1, c2, r2;
    vec4 R1 = runs(fp, 0.075 * ds, uWet, 3.0, aa, c1, r1);
#if DROPS > 1
    vec4 R2 = runs(fp + vec2(0.031, 0.0), 0.11 * ds, uWet * 0.8, 4.0, aa, c2, r2);
#else
    vec4 R2 = vec4(0.0); c2 = 0.0; r2 = 0.0;
#endif
    clr = max(c1, c2);
    b1.z *= 1.0 - clr; b2.z *= 1.0 - clr;
    D = b1; dR = b1.w;
    if (b2.z > D.z) { D = b2; dR = b2.w; }
#if DROPS > 1
    b3.z *= 1.0 - clr;
    if (b3.z > D.z) { D = b3; dR = b3.w; }
#endif
    mat2 back = rot(-uFlowAng);
    if (R1.z > D.z) { D = vec4(back * R1.xy, R1.z, 0.0); dR = r1; }
    if (R2.z > D.z) { D = vec4(back * R2.xy, R2.z, 0.0); dR = r2; }
  }
  if (uSnowGlass > 0.001) {
    float cr;
    vec4 F = flakes(g, 0.06 * uDropSize, uSnowGlass, aa, cr);
    if (F.z > D.z) { D = vec4(F.xy, F.z, 0.0); dR = F.w; crystal = cr; }
  }
  float glassFlash = uFlash;
  if (D.z > 0.002) {
    vec2 q = D.xy;
    float rho = min(length(q), 1.0);
    float lensW = 0.07 + dR * 3.0;
    float k = (1.0 - 0.65 * blurF);
    vec2 so = s - q * (dR + lensW) * (1.0 + 0.5 * rho * rho) * k;
    vec3 refr = texture(uDV, s2uv(so)).rgb;
    float edge = smoothstep(0.5, 1.0, rho);
    float small = smoothstep(0.002, 0.008, dR);
    refr *= 1.0 - 0.78 * edge * edge * (1.0 - 0.8 * blurF) * (0.35 + 0.65 * small);
    vec2 hl = q - vec2(-0.32, 0.42);
    float spec = exp(-dot(hl, hl) * 22.0) * 0.8 + exp(-dot(q - vec2(0.2, -0.55), q - vec2(0.2, -0.55)) * 9.0) * 0.12;
    vec3 sc = OUTAVG * 1.6 + uLamp * 0.05 + uFlashCol * glassFlash * 0.5 + 0.0015;
    refr += sc * spec * (1.0 - 0.7 * blurF);
    vec3 cryst = (texture(uOut, uv, 3.0).rgb * 1.3 + uLamp * 0.06 + OUTAVG * 0.6 + 0.003) * (0.9 + 0.3 * nz2.g);
    refr = mix(refr, cryst, crystal);
    col = mix(col, refr, D.z * (1.0 - 0.45 * blurF));
  }

  // smudges and dust catch bright light behind the glass
  vec3 veil = bsplineLod(uOut, uv, uOutLod).rgb;
  col += veil * (nz.a * nz.a * 0.16 + 0.01) * uSmudge;

  // condensation
  float fog = uCond * (0.45 + 0.55 * nz.r) + uCond * exp(-edgeD / 0.07) * 0.7 + uCond * (1.0 - smoothstep(-0.45, 0.1, g.y)) * 0.25;
  fog = sat(fog) * (1.0 - wipe) * (1.0 - clr * 0.92);
  float tf = smoothstep(nz.r * 0.55 + 0.2, nz.r * 0.55 + 0.45, uFogT * 1.25);
  fog = max(fog, tf);
  vec3 fogCol = veil * 0.88 + uLamp * 0.018 + OUTAVG * 0.05 + uFlashCol * uFlash * 0.08;
  fogCol += veil * (nz2.b - 0.3) * 0.2 * (1.0 - blurF * 0.5);
  col = mix(col, fogCol, fog * 0.94);

  // frost grows from the pane edges
  if (uFrost > 0.001) {
    float grow = uFrost * 0.2 + (nz.g - 0.4) * 0.09 + (nz.r - 0.5) * 0.05;
    float fr = smoothstep(0.0, 0.035, grow - edgeD);
    float ridge = texture(uNoise, g * 2.4).g;
    float dens = fr * (0.55 + 0.45 * ridge) * (1.0 - wipe * 0.4);
    vec3 frostCol = veil * 0.9 + texture(uOut, uv, 2.0).rgb * 0.25 + uLamp * 0.03 + OUTAVG * 0.15 + 0.002;
    frostCol *= 0.85 + 0.6 * ridge;
    float spark = step(0.985, hash12(floor(fc * 0.5) + floor(uHead * 400.0))) * ridge * 2.0;
    frostCol += (OUTAVG + uLamp * 0.2 + 0.01) * spark;
    col = mix(col, frostCol, sat(dens) * 0.92);
  }

  // reflections of the room in the glass: lamp, candle (two panes give two faint images)
  if (uRefl > 0.001) {
    vec3 refl = vec3(0.0);
    vec3 Lv = vec3(uLampPos.xy, 2.0 * zg - uLampPos.z);
    vec2 ls = (Lv.xy * uKp - uHead) / Lv.z;
    float lb = 0.34 * uKp / Lv.z + blurPx(Lv.z) * px * 0.6;
    refl += uLamp * 0.022 * exp(-dot(s - ls, s - ls) / (lb * lb));
    if (uCandle.w > 0.5) {
      for (int i = 0; i < 2; i++) {
        vec3 F = flamePos(); F.z = 2.0 * (zg + float(i) * 0.024) - F.z;
        vec2 fs = (F.xy * uKp - uHead) / F.z;
        float fb = 0.012 * uKp / F.z + blurPx(F.z) * px * 0.5 + 2.0 * px;
        refl += flameCol() * (i == 0 ? 0.05 : 0.03) * exp(-dot(s - fs, s - fs) / (fb * fb));
      }
    }
    refl += uLamp * 0.004 * smoothstep(-0.6, 0.5, s.y);
    col += refl * uRefl;
  }
  // a lit railway carriage seen in its own window: light strip, luggage rack, seat backs
  if (uTrain > 0.0) {
    vec2 q = s + uHead / 1.7;
    float strip = exp(-sq((q.y - 0.355) / 0.03)) * (0.85 + 0.15 * sin(q.x * 2.3));
    float rack = exp(-sq((q.y - 0.25) / 0.01)) * 0.35 + exp(-sq((q.y - 0.21) / 0.008)) * 0.2;
    vec2 sb = vec2(fract(q.x * 0.85 + 0.35) - 0.5, q.y + 0.18);
    float seat = 1.0 - smoothstep(-0.01, 0.02, length(max(abs(sb) - vec2(0.16, 0.13), 0.0)) - 0.07);
    vec3 interior = vec3(1.0, 0.95, 0.86) * strip * 0.7 + vec3(0.7, 0.66, 0.6) * rack + vec3(0.11, 0.09, 0.08) * seat * (1.0 - step(0.1, q.y));
    float soft = 1.0 / (1.0 + blurPx(3.4) * 0.05);
    col += interior * uTrain * 0.05 * soft;
  }

  // ---------- frame and room ----------
  if (framed) {
    float wF = 0.75 + blurPx(zf), wG = 0.75 + blurPx(zg), wW = 0.75 + blurPx(zw);
    vec4 Ig = projRect(uI3, zg), If = projRect(uI3, zf), Of = projRect(uO3, zf), Ow = projRect(uO3, zw);
    float rad = uCorner * uKp;
    float cG = inside(max(sdBox(s, Ig, rad / zg), sdBox(s, If, rad / zf)), wG);
    // glazing bars
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uBarN) break;
      vec4 bf = projRect(uBars[i], zf), bg = projRect(uBars[i], zg);
      vec4 bb = vec4(min(bf.xy, bg.xy), max(bf.zw, bg.zw));
      float cb = inside(sdBox(s, bb, 0.0), wF);
      if (cb > 0.0) {
        bool front = sdBox(s, bf, 0.0) < 0.0;
        vec3 N = vec3(0.0, 0.0, -1.0); vec3 P = pt3(s, zf);
        bool vert = (uBars[i].z - uBars[i].x) < (uBars[i].w - uBars[i].y);
        if (!front) {
          if (vert) { float sx = s.x < (bf.x + bf.z) * 0.5 ? -1.0 : 1.0; N = vec3(sx, 0.0, 0.0); float x3 = sx < 0.0 ? uBars[i].x : uBars[i].z; float zz = (x3 * uKp - uHead.x) / s.x; P = pt3(s, zz); }
          else { float sy = s.y < (bf.y + bf.w) * 0.5 ? -1.0 : 1.0; N = vec3(0.0, sy, 0.0); float y3 = sy < 0.0 ? uBars[i].y : uBars[i].w; float zz = (y3 * uKp - uHead.y) / s.y; P = pt3(s, zz); }
        }
        vec2 muv = vert ? vec2(P.x * 8.0 + P.z * 5.0, P.y) : vec2(P.y * 8.0 + P.z * 5.0, P.x);
        vec3 bc = woodAlb(muv, 0.0) * roomLight(P, N, uMatKind > 1.5 ? 0.8 : 0.5) * (front ? 1.0 : 0.82);
        col = mix(col, bc, cb);
      }
    }
    // inner faces of the frame (between frame front and glass)
    vec3 innerCol;
    {
      float zx = 1e3, zy = 1e3; vec3 N = vec3(0.0, 0.0, -1.0);
      float cx = (Ig.x + Ig.z) * 0.5, cy = (Ig.y + Ig.w) * 0.5;
      float dxs = max(Ig.x - s.x, s.x - Ig.z), dys = max(Ig.y - s.y, s.y - Ig.w);
      vec3 P;
      if (dxs > dys) {
        float x3 = s.x < cx ? uI3.x : uI3.z; N = vec3(s.x < cx ? 1.0 : -1.0, 0.0, 0.0);
        P = pt3(s, clamp((x3 * uKp - uHead.x) / s.x, zf, zg));
        innerCol = woodAlb(vec2(P.y, P.z * 4.0), 0.0);
      } else {
        float y3 = s.y < cy ? uI3.y : uI3.w; N = vec3(0.0, s.y < cy ? 1.0 : -1.0, 0.0);
        P = pt3(s, clamp((y3 * uKp - uHead.y) / s.y, zf, zg));
        innerCol = woodAlb(vec2(P.x, P.z * 4.0), 0.0);
      }
      float ao = 0.55 + 0.45 * smoothstep(0.0, 0.05, zg - P.z);
      innerCol *= roomLight(P, N, 0.4) * ao;
      innerCol += OUTAVG * 0.25 * (1.0 - smoothstep(0.0, 0.02, zg - P.z)) * woodAlb(vec2(P.x + P.y, P.z), 0.0);
      if (uStyle > 5.5) innerCol = vec3(0.012, 0.012, 0.013) * (roomLight(P, N, 0.9) + 0.3);
    }
    col = mix(innerCol, col, cG);
    // frame front face
    {
      vec3 P = pt3(s, zf); vec3 N = vec3(0.0, 0.0, -1.0);
      float dI = sdBox(P.xy, uI3, uCorner);
      bool vert = abs(P.x - (uI3.x + uI3.z) * 0.5) - (uI3.z - uI3.x) * 0.5 > abs(P.y - (uI3.y + uI3.w) * 0.5) - (uI3.w - uI3.y) * 0.5;
      vec2 muv = vert ? vec2(P.x * 6.0, P.y) : vec2(P.y * 6.0, P.x);
      vec3 alb = woodAlb(muv, 0.0);
      // chamfer catching light near the glass
      float ch = 1.0 - smoothstep(0.0, 0.012, dI);
      vec3 Nc = normalize(vec3(-normalize(P.xy - vec2((uI3.x + uI3.z) * 0.5, (uI3.y + uI3.w) * 0.5)) * 0.6, -0.8));
      vec3 fcol = alb * roomLight(P, normalize(mix(N, Nc, ch)), uMatKind > 1.5 ? 0.9 : 0.55);
      float ao = 0.72 + 0.28 * smoothstep(0.0, 0.03, dI);
      if (uStyle > 5.5) {
        float gasket = 1.0 - smoothstep(0.018, 0.02, dI);
        fcol = mix(uMat * roomLight(P, N, 0.3), vec3(0.015) * (roomLight(P, Nc, 1.2) + 0.2), gasket);
      }
      col = mix(fcol * ao, col, inside(sdBox(s, If, rad / zf), wF));
    }
    // reveals (and the sill top between wall and frame)
    {
      float dxs = max(Of.x - s.x, s.x - Of.z), dys = max(Of.y - s.y, s.y - Of.w);
      float cx = (Of.x + Of.z) * 0.5, cy = (Of.y + Of.w) * 0.5;
      vec3 P, N; vec3 alb;
      if (dys > dxs && s.y < cy) {
        P = pt3(s, clamp((uO3.y * uKp - uHead.y) / s.y, zl, zf)); N = vec3(0.0, 1.0, 0.0);
        alb = uMat2 * (0.94 + 0.06 * vnoise(vec2(P.x * 3.0, P.z * 60.0)));
        if (uMatKind > 0.5 && uMatKind < 1.5) alb = uMat2 * (0.75 + 0.25 * sin(fbm(vec2(P.x * 2.0, P.z * 30.0)) * 20.0));
      } else if (dys > dxs) {
        P = pt3(s, clamp((uO3.w * uKp - uHead.y) / s.y, zw, zf)); N = vec3(0.0, -1.0, 0.0);
        alb = uWall;
      } else {
        float x3 = s.x < cx ? uO3.x : uO3.z;
        P = pt3(s, clamp((x3 * uKp - uHead.x) / s.x, zw, zf)); N = vec3(s.x < cx ? 1.0 : -1.0, 0.0, 0.0);
        alb = uWall;
      }
      alb *= 0.96 + 0.08 * vnoise(P.xy * 40.0 + P.z * 30.0);
      float ao = 0.6 + 0.4 * smoothstep(0.0, 0.06, zf - P.z);
      if (N.y > 0.5) ao *= sillAO(P);
      vec3 rc = alb * roomLight(P, N, 0.3) * ao;
      col = mix(rc, col, inside(sdBox(s, Of, rad / zf), wF));
    }
    // wall face (and sill ledge in front of it)
    {
      vec3 P = pt3(s, zw); vec3 N = vec3(0.0, 0.0, -1.0);
      vec3 alb = uWall * (0.95 + 0.07 * fbm(P.xy * 7.0));
      float ao = 0.78 + 0.22 * smoothstep(0.0, 0.05, sdBox(P.xy, uO3, uCorner));
      vec3 wc = alb * roomLight(P, N, 0.15) * ao;
      col = mix(wc, col, inside(sdBox(s, Ow, rad / zw), wW));
      // ledge: top face between zl and zw, front edge below
      float yTopF = (uO3.y * uKp - uHead.y) / zl, yTopW = (uO3.y * uKp - uHead.y) / zw;
      float lx0 = uO3.x - 0.07, lx1 = uO3.z + 0.07;
      float zz = clamp((uO3.y * uKp - uHead.y) / min(s.y, -1e-4), zl, zw);
      float x3 = (s.x * zz + uHead.x) / uKp;
      float wl = 0.75 + blurPx(zl);
      float inX = inside(max(lx0 - x3, x3 - lx1) * uKp / zz, wl);
      float cTop = inX * inside(max(yTopF - s.y, s.y - yTopW), wl);
      vec3 Pt = vec3(x3, uO3.y, zz);
      vec3 alt = uMat2 * (0.94 + 0.06 * vnoise(vec2(Pt.x * 3.0, Pt.z * 60.0)));
      if (uMatKind > 0.5 && uMatKind < 1.5) alt = uMat2 * (0.75 + 0.25 * sin(fbm(vec2(Pt.x * 2.0, Pt.z * 30.0)) * 20.0));
      vec3 tc = alt * roomLight(Pt, vec3(0.0, 1.0, 0.0), 0.3) * sillAO(Pt);
      col = mix(col, tc, cTop);
      float yBot = ((uO3.y - 0.035) * uKp - uHead.y) / zl;
      float xf = (s.x * zl + uHead.x) / uKp;
      float cFront = inside(max(lx0 - xf, xf - lx1) * uKp / zl, wl) * inside(max(yBot - s.y, s.y - yTopF), wl);
      vec3 Pf = pt3(s, zl);
      col = mix(col, uMat2 * 0.92 * roomLight(Pf, vec3(0.0, -0.3, -0.95), 0.2), cFront);
    }
    // objects on the sill
    vec3 glowAdd = vec3(0.0), steamAdd = vec3(0.0);
    if (uPlant.w > 0.5) { vec4 p = plant(s); col = mix(col, p.rgb, p.a); }
    if (uMug.w > 0.5) { vec4 m = mug(s, steamAdd); col = mix(col, m.rgb, m.a); }
    if (uCandle.w > 0.5) { vec4 c = candle(s, glowAdd); col = mix(col, c.rgb, c.a); }
    col += glowAdd + steamAdd;
  }

  // ---------- grading ----------
  col = max(col, 0.0) * exp2(uExposure);
  col = tonemap(col);
  col *= vec3(1.0 + uWarm * 0.07, 1.0 + uWarm * 0.01, 1.0 - uWarm * 0.09);
  col = pow(col, vec3(1.0 / 2.2));
  float l = luma(col);
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5;
  col = col * uGain + uLift * (1.0 - col);
  float vig = length(s * vec2(0.85, 1.0));
  col *= 1.0 - uVig * smoothstep(0.35, 1.05, vig);
  float gr = hash12(fc + fract(uTime * 7.13) * 917.0) - 0.5;
  col += gr * uGrain * 0.07 * (0.4 + 0.6 * (1.0 - l));
  col += (hash12(fc * 1.37 + 3.1) - 0.5) / 255.0;
  o = vec4(clamp(col * uDim, 0.0, 1.0), 1.0);
}
`;
})();

/* ASCII wallpaper engine.
 *
 * Three GPU passes per frame:
 *   1. scene  : the active scene's GLSL is evaluated at sub-cell resolution
 *               (cols*RX*A x rows*RY*A samples), writing linear HDR colour plus
 *               a packed material id / depth value.
 *   2. cells  : one fragment per character cell. The RX x RY sub-cell luminance
 *               pattern is matched against the measured coverage pattern of
 *               every allowed glyph, so glyph strokes follow the shapes in the
 *               scene. Writes glyph colour and glyph index (MRT). The previous
 *               frame's glyph is kept unless a new glyph is clearly better,
 *               which suppresses shimmer.
 *   3. compose: per screen pixel, the glyph atlas is sampled 1:1 and the glyph
 *               colour is blended over one flat background colour. Cells never
 *               receive a fill, so gaps between strokes always stay visible.
 */
(function () {
  'use strict';
  const ASCII = (window.ASCII = window.ASCII || {});
  ASCII.scenes = ASCII.scenes || [];
  ASCII.fonts = ASCII.fonts || [];
  ASCII.registerScene = (def) => ASCII.scenes.push(def);

  const NGLYPH = 95; // printable ASCII 32..126, index = code - 32

  // Default glyph sets. EDGE is used where a cell contains structure, TONE in
  // flat cells. Glyphs that read as words in a fill (most digits, many
  // letters) are left out of the defaults; scenes can opt in per material.
  const EDGE = ' .,\'`-_:;~"^=+*!|/\\()[]{}<>ilrtcvxzoeaunmwLTJVYXA#%&@80O';
  const TONE = ' .`\':-~=+*xoe#%&@';
  ASCII.EDGE = EDGE;
  ASCII.TONE = TONE;

  const QUALITY = {
    live: { rx: 2, ry: 4, aa: 1, label: 'Live' },
    high: { rx: 3, ry: 4, aa: 1, label: 'High' },
    ultra: { rx: 3, ry: 4, aa: 2, label: 'Ultra' },
  };
  ASCII.QUALITY = QUALITY;

  const VS = `#version 300 es
layout(location=0) in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  // ---------------------------------------------------------------- GLSL lib
  const LIB = `
#define PI 3.14159265359
#define TAU 6.28318530718
float sat(float x){ return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x){ return clamp(x, 0.0, 1.0); }
float remap(float x, float a, float b){ return sat((x - a) / (b - a)); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// hashes (integer based, stable across GPUs)
uint _h(uint x){ x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float hash11(float p){ return float(_h(floatBitsToUint(p))) * (1.0 / 4294967296.0); }
float hashi(ivec2 i){ return float(_h(uint(i.x) * 1597334677u ^ _h(uint(i.y) + 0x9e3779b9u))) * (1.0 / 4294967296.0); }
float hashi(ivec3 i){ return float(_h(uint(i.x) * 1597334677u ^ _h(uint(i.y) * 3812015801u ^ _h(uint(i.z) + 0x9e3779b9u)))) * (1.0 / 4294967296.0); }
float hashi(ivec4 i){ return float(_h(uint(i.x) * 1597334677u ^ _h(uint(i.y) * 3812015801u ^ _h(uint(i.z) * 2654435761u ^ _h(uint(i.w) + 0x9e3779b9u))))) * (1.0 / 4294967296.0); }
float hash12(vec2 p){ return hashi(ivec2(floor(p))); }
vec2 hash22(vec2 p){ ivec2 i = ivec2(floor(p)); return vec2(hashi(i), hashi(i + ivec2(1913, 7321))); }
vec3 hash33(vec3 p){ ivec3 i = ivec3(floor(p)); return vec3(hashi(i), hashi(i + ivec3(1913, 7321, 113)), hashi(i + ivec3(5099, 211, 8291))); }

// value noise, optional integer period per axis (0 = not periodic)
float vnoise(vec2 p, ivec2 per){
  ivec2 i = ivec2(floor(p)); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 i1 = i + 1;
  if (per.x > 0) { i.x = ((i.x % per.x) + per.x) % per.x; i1.x = ((i1.x % per.x) + per.x) % per.x; }
  if (per.y > 0) { i.y = ((i.y % per.y) + per.y) % per.y; i1.y = ((i1.y % per.y) + per.y) % per.y; }
  float a = hashi(i), b = hashi(ivec2(i1.x, i.y)), c = hashi(ivec2(i.x, i1.y)), d = hashi(i1);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float vnoise(vec2 p){ return vnoise(p, ivec2(0)); }
float vnoise(vec3 p, ivec3 per){
  ivec3 i = ivec3(floor(p)); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  ivec3 j = i + 1;
  if (per.x > 0) { i.x = ((i.x % per.x) + per.x) % per.x; j.x = ((j.x % per.x) + per.x) % per.x; }
  if (per.y > 0) { i.y = ((i.y % per.y) + per.y) % per.y; j.y = ((j.y % per.y) + per.y) % per.y; }
  if (per.z > 0) { i.z = ((i.z % per.z) + per.z) % per.z; j.z = ((j.z % per.z) + per.z) % per.z; }
  float a = hashi(ivec3(i.x, i.y, i.z)), b = hashi(ivec3(j.x, i.y, i.z));
  float c = hashi(ivec3(i.x, j.y, i.z)), d = hashi(ivec3(j.x, j.y, i.z));
  float e = hashi(ivec3(i.x, i.y, j.z)), f2 = hashi(ivec3(j.x, i.y, j.z));
  float g = hashi(ivec3(i.x, j.y, j.z)), h = hashi(ivec3(j.x, j.y, j.z));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f2, u.x), mix(g, h, u.x), u.y), u.z);
}
float vnoise(vec3 p){ return vnoise(p, ivec3(0)); }

// gradient noise (3D), optional integer period per axis; returns roughly [-1,1]
vec3 _g3(ivec3 i){ float a = hashi(i) * TAU, z = hashi(i + ivec3(17, 59, 113)) * 2.0 - 1.0; float r = sqrt(1.0 - z * z); return vec3(r * cos(a), r * sin(a), z); }
float gnoise(vec3 p, ivec3 per){
  ivec3 i = ivec3(floor(p)); vec3 f = fract(p); vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n[8];
  for (int k = 0; k < 8; k++) {
    ivec3 o = ivec3(k & 1, (k >> 1) & 1, (k >> 2) & 1);
    ivec3 c = i + o;
    if (per.x > 0) c.x = ((c.x % per.x) + per.x) % per.x;
    if (per.y > 0) c.y = ((c.y % per.y) + per.y) % per.y;
    if (per.z > 0) c.z = ((c.z % per.z) + per.z) % per.z;
    n[k] = dot(_g3(c), f - vec3(o));
  }
  return 1.6 * mix(mix(mix(n[0], n[1], u.x), mix(n[2], n[3], u.x), u.y), mix(mix(n[4], n[5], u.x), mix(n[6], n[7], u.x), u.y), u.z);
}
float gnoise(vec3 p){ return gnoise(p, ivec3(0)); }

// 4D value noise, periodic in w (use w = phase * period for seamless time loops)
float vnoise4(vec4 p, int perW){
  ivec4 i = ivec4(floor(p)); vec4 f = fract(p); vec4 u = f * f * (3.0 - 2.0 * f);
  int w0 = perW > 0 ? ((i.w % perW) + perW) % perW : i.w;
  int w1 = perW > 0 ? (((i.w + 1) % perW) + perW) % perW : i.w + 1;
  float r[2];
  for (int k = 0; k < 2; k++) {
    int w = k == 0 ? w0 : w1;
    float a = hashi(ivec4(i.x, i.y, i.z, w)), b = hashi(ivec4(i.x + 1, i.y, i.z, w));
    float c = hashi(ivec4(i.x, i.y + 1, i.z, w)), d = hashi(ivec4(i.x + 1, i.y + 1, i.z, w));
    float e = hashi(ivec4(i.x, i.y, i.z + 1, w)), f2 = hashi(ivec4(i.x + 1, i.y, i.z + 1, w));
    float g = hashi(ivec4(i.x, i.y + 1, i.z + 1, w)), h = hashi(ivec4(i.x + 1, i.y + 1, i.z + 1, w));
    r[k] = mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f2, u.x), mix(g, h, u.x), u.y), u.z);
  }
  return mix(r[0], r[1], u.w);
}

float fbm(vec2 p, int oct){ float s = 0.0, a = 0.5; for (int i = 0; i < 10; i++) { if (i >= oct) break; s += a * vnoise(p); p = rot(0.6) * p * 2.03 + 17.1; a *= 0.5; } return s; }
float fbm(vec3 p, int oct){ float s = 0.0, a = 0.5; for (int i = 0; i < 10; i++) { if (i >= oct) break; s += a * gnoise(p); p = p * 2.02 + vec3(17.1, -3.7, 9.3); a *= 0.5; } return s; }

// SDF helpers
float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float sdBox(vec2 p, vec2 b){ vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - r; }
float sdSegment(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
float smin(float a, float b, float k){ float h = sat(0.5 + 0.5 * (b - a) / k); return mix(b, a, h) - k * h * (1.0 - h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
`;

  // Encoding of the scene buffer. With float render targets the alpha channel
  // packs material id (integer part) and depth (fraction). Without them we fall
  // back to RGBA8 with a compressive colour encoding.
  const ENC_FLOAT = `
// depth is packed into [0, 0.9] so that half-float rounding can never carry
// it into the next material id (spacing is 1/16 at ids up to 110)
vec4 encodeSample(vec3 c, float mat, float depth){ return vec4(max(c, 0.0), floor(mat + 0.5) + clamp(depth, 0.0, 1.0) * 0.9); }
vec3 decodeColor(vec4 s){ return s.rgb; }
float decodeMat(vec4 s){ return floor(s.a + 0.02); }
float decodeDepth(vec4 s){ return min(fract(s.a + 0.02) - 0.02, 0.9) / 0.9; }`;
  const ENC_U8 = `
vec4 encodeSample(vec3 c, float mat, float depth){ c = max(c, 0.0); return vec4(c / (1.0 + c), (floor(mat + 0.5) * 16.0 + floor(clamp(depth, 0.0, 0.999) * 16.0)) / 255.0); }
vec3 decodeColor(vec4 s){ vec3 c = min(s.rgb, vec3(0.996)); return c / (1.0 - c); }
float decodeMat(vec4 s){ return floor(s.a * 255.0 / 16.0 + 0.01); }
float decodeDepth(vec4 s){ return mod(floor(s.a * 255.0 + 0.5), 16.0) / 16.0; }`;

  function sceneFS(scene, enc) {
    const custom = Object.entries(scene.uniforms || {})
      .map(([k, v]) => `uniform ${uniformType(v)} ${k};`)
      .join('\n');
    const palUniforms = paletteUniformNames(scene)
      .filter((k) => !(scene.uniforms && k in scene.uniforms))
      .map((k) => `uniform vec3 ${k};`)
      .join('\n');
    return `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uSceneRes;   // scene buffer size in samples
uniform vec2 uGridPx;     // grid extent in device pixels
uniform vec2 uCanvasPx;   // canvas size in device pixels
uniform vec2 uCellPx;     // cell size in device pixels
uniform float uTime;      // seconds within the loop
uniform float uLoop;      // loop length in seconds
uniform float uPhase;     // uTime / uLoop
uniform float uDetail;    // 0..1
uniform float uAtmos;     // 0..1
uniform float uCamAmt;    // 0..1
uniform float uSeed;
uniform float uPxSize;    // size of one device pixel in scene units
uniform vec4 uView;       // virtual frame: xy = offset of this canvas in it, zw = its size
${custom}
${palUniforms}
out vec4 fragColor;
${LIB}
${enc}
#line 1
${scene.glsl}
void main(){
  vec2 gp = gl_FragCoord.xy / uSceneRes * uGridPx;
  vec2 cp = gp - 0.5 * (uGridPx - uCanvasPx);
  vec2 p = (cp + uView.xy - 0.5 * uView.zw) / (0.5 * uView.zw.y);
  float mat = 0.0, depth = 1.0;
  vec3 c = sceneColor(p, mat, depth);
  fragColor = encodeSample(c, mat, depth);
}`;
  }

  function cellFS(q, enc, S) {
    const nreg = q.rx * q.ry;
    const nvec = Math.ceil(nreg / 4);
    return `#version 300 es
precision highp float;
precision highp int;
#define RX ${q.rx}
#define RY ${q.ry}
#define AA ${q.aa}
#define NREG ${nreg}
#define NVEC ${nvec}
#define S ${S}
uniform sampler2D uScene;
uniform sampler2D uBlock;     // block glyphs of this frame (S == 1 only)
uniform float uBigOn, uBigDepth, uDither;
uniform sampler2D uFeat;      // NVEC x NGLYPH, RGBA32F coverage per region
uniform sampler2D uFeatMean;  // 1 x NGLYPH, r = mean coverage
uniform sampler2D uPrev;      // previous glyph index (R8)
uniform int uNGlyph;
uniform uvec4 uMask[32];   // 0..15 edge sets, 16..31 tone sets (flat regions)
uniform float uEdgeNorm, uEdgeRef;
uniform float uExposure, uCover, uSharp, uHyst, uSat, uBright, uMinCov, uColGamma, uWhite, uHasPrev, uFlat, uMeanW, uFlatShape, uFlatTone;
uniform vec3 uTint;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oGlyph;
${enc}
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
bool allowed(int m, int g){ uvec4 mk = uMask[m]; uint w = g < 32 ? mk.x : (g < 64 ? mk.y : mk.z); return ((w >> uint(g & 31)) & 1u) == 1u; }
// shape error + tone error. Flat cells weight tone heavily: a uniform dim
// area must become sparse glyphs of the right ink coverage, not blank cells
float dist(int g, vec4 T[NVEC], float tm, vec2 w){
  float d = 0.0;
  for (int v = 0; v < NVEC; v++) { vec4 e = T[v] - texelFetch(uFeat, ivec2(v, g), 0); d += dot(e, e); }
  float em = tm - texelFetch(uFeatMean, ivec2(0, g), 0).r;
  return w.x * d + w.y * float(NREG) * em * em;
}
void main(){
  ivec2 cell = ivec2(gl_FragCoord.xy);
#if S == 1
  // cells covered by a large foreground glyph stay empty
  if (uBigOn > 0.5 && texelFetch(uBlock, cell / 2, 0).g > 0.5) { oColor = vec4(0.0); oGlyph = vec4(0.0); return; }
#endif
  float near = 0.0;
  vec4 T[NVEC];
  for (int v = 0; v < NVEC; v++) T[v] = vec4(0.0);
  vec3 csum = vec3(0.0); float wsum = 0.0; float lmax = 0.0; float tmax = 0.0; float tsum = 0.0;
  float mat = 0.0; float best = -1.0;
  for (int ry = 0; ry < RY; ry++) for (int rx = 0; rx < RX; rx++) {
    vec3 c = vec3(0.0);
    for (int ay = 0; ay < AA * S; ay++) for (int ax = 0; ax < AA * S; ax++) {
      vec4 s = texelFetch(uScene, (cell * ivec2(RX, RY) + ivec2(rx, ry)) * (AA * S) + ivec2(ax, ay), 0);
      vec3 sc = decodeColor(s);
      near += decodeDepth(s) < uBigDepth ? 1.0 : 0.0;
      c += sc;
      float sl = luma(sc);
      if (sl > best) { best = sl; mat = decodeMat(s); }
    }
    c *= 1.0 / float(AA * AA * S * S);
    float L = luma(c) * uExposure;
    float w = L + 1e-4;
    csum += c * w; wsum += w;
    lmax = max(lmax, L);
    // glyph rows are stored top-down, the scene buffer is bottom-up
    int k = (RY - 1 - ry) * RX + rx;
    float t = uCover * (1.0 - exp(-L));
    T[k >> 2][k & 3] = t;
    tmax = max(tmax, t); tsum += t;
  }
  int mi = int(mat);
  int forced = mi >= 16 ? mi - 16 : -1;
  int m = forced >= 0 ? 0 : (mi & 15);
  float tmin = 1e9;
  for (int k = 0; k < NREG; k++) tmin = min(tmin, T[k >> 2][k & 3]);
  float tmean = tsum / float(NREG);
  // flat cells (little sub-cell contrast) draw from the material's tone set,
  // cells with structure from its edge set
  bool isFlat = (tmax - tmin) < uFlat * tmax;
  int ms = isFlat ? m + 16 : m;
  vec2 dw = isFlat ? vec2(uFlatShape, uFlatTone) : vec2(1.0, uMeanW);
  // local contrast enhancement: sharpen the pattern towards its brightest
  // region. Edge normalisation: a faint line is matched as if it were at
  // least uEdgeRef bright, so it becomes a crisp line glyph drawn in a dim
  // colour instead of vanishing into a blank cell
  if (tmax > 1e-5 && !isFlat) {
    float gain = mix(1.0, max(1.0, uEdgeRef / tmax), uEdgeNorm);
    for (int k = 0; k < NREG; k++) { float t = T[k >> 2][k & 3]; T[k >> 2][k & 3] = gain * tmax * pow(t / tmax, uSharp); }
    tmean *= gain;
  }
  int bi = 0;
  if (tmax >= uMinCov) {
    if (forced >= 0 && forced < ${NGLYPH}) {
      bi = forced;
    } else {
      float bd = dist(0, T, tmean, dw), bd2 = 1e9;
      int bi2 = 0;
      for (int g = 1; g < ${NGLYPH}; g++) {
        if (!allowed(ms, g)) continue;
        float d = dist(g, T, tmean, dw);
        if (d < bd) { bd2 = bd; bi2 = bi; bd = d; bi = g; }
        else if (d < bd2) { bd2 = d; bi2 = g; }
      }
      // glyph dithering: in flat areas alternate between the two closest tone
      // glyphs with a fixed per-cell pattern, so even tones don't form rows of
      // one repeated character
      if (isFlat && bi2 > 0 && bd2 <= bd * (1.0 + uDither) + 1e-3 * uDither) {
        uint hc = uint(cell.x) * 1597334677u ^ uint(cell.y) * 3812015801u;
        hc ^= hc >> 15; hc *= 0x2c1b3c6du; hc ^= hc >> 12;
        if ((hc & 1u) == 1u) { int tmp = bi; bi = bi2; bi2 = tmp; float tf = bd; bd = bd2; bd2 = tf; }
      }
      if (uHasPrev > 0.5) {
        int pg = int(texelFetch(uPrev, cell, 0).r * 255.0 + 0.5);
        if (pg != bi && pg > 0 && (allowed(m, pg) || allowed(m + 16, pg))) {
          float dp = dist(pg, T, tmean, dw);
          if (dp <= bd * (1.0 + uHyst) + 2e-4 * uHyst) bi = pg;
        }
      }
    }
  }
  vec3 col = wsum > 0.0 ? csum / wsum : vec3(0.0);
  float L = luma(col) * uExposure;
  vec3 chroma = col / max(max(col.r, max(col.g, col.b)), 1e-6);
  chroma = mix(vec3(luma(chroma)), chroma, uSat);
  float tone = 1.0 - exp(-max(L, lmax * 0.6));
  float inten = uBright * pow(tone, uColGamma);
  vec3 g = chroma * inten * uTint;
  // highlights roll towards white rather than clipping a single channel
  float over = max(max(g.r, max(g.g, g.b)) - 1.0, 0.0);
  g = min(g, vec3(1.0)) + over * uWhite;
  g = clamp(g, 0.0, 1.0);
  oColor = vec4(pow(g, vec3(1.0 / 2.2)), 1.0);
#if S == 2
  float big = (uBigOn > 0.5 && near >= 0.5 * float(NREG * AA * AA * S * S)) ? 1.0 : 0.0;
#else
  float big = 0.0;
#endif
  oGlyph = vec4(float(bi) / 255.0, big, 0.0, 1.0);
}`;
  }

  // debug view: the raw scene buffer, tone mapped, without glyph conversion
  const DEBUG_FS = (enc) => `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uSize;
uniform vec2 uCanvas;
out vec4 fragColor;
${enc}
void main(){
  vec4 s = texelFetch(uScene, ivec2(gl_FragCoord.xy / uCanvas * uSize), 0);
  vec3 c = 1.0 - exp(-decodeColor(s));
  fragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;

  const COMPOSE_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uCellColor;
uniform sampler2D uCellGlyph;
uniform sampler2D uAtlas;
uniform ivec2 uCell;      // cell size in px
uniform ivec2 uOffset;    // grid offset in px
uniform int uAtlasCols;
uniform vec3 uBg;         // sRGB
uniform float uGlyphGamma;
uniform sampler2D uBlockColor;
uniform sampler2D uBlockGlyph;
uniform sampler2D uAtlas2;
uniform int uBigOn;
out vec4 fragColor;
void main(){
  ivec2 px = ivec2(gl_FragCoord.xy) + uOffset;
  if (uBigOn == 1) {
    ivec2 bcell = uCell * 2;
    ivec2 bc = px / bcell;
    vec4 bgl = texelFetch(uBlockGlyph, bc, 0);
    if (bgl.g > 0.5) {
      int g = int(bgl.r * 255.0 + 0.5);
      ivec2 lp = px - bc * bcell;
      ivec2 tile = ivec2(g % uAtlasCols, g / uAtlasCols);
      float a = pow(texelFetch(uAtlas2, tile * bcell + ivec2(lp.x, bcell.y - 1 - lp.y), 0).r, uGlyphGamma);
      fragColor = vec4(mix(uBg, texelFetch(uBlockColor, bc, 0).rgb, a), 1.0);
      return;
    }
  }
  ivec2 cell = px / uCell;
  ivec2 lp = px - cell * uCell;
  int g = int(texelFetch(uCellGlyph, cell, 0).r * 255.0 + 0.5);
  vec3 c = texelFetch(uCellColor, cell, 0).rgb;
  ivec2 tile = ivec2(g % uAtlasCols, g / uAtlasCols);
  float a = texelFetch(uAtlas, tile * uCell + ivec2(lp.x, uCell.y - 1 - lp.y), 0).r;
  a = pow(a, uGlyphGamma);
  fragColor = vec4(mix(uBg, c, a), 1.0);
}`;

  function uniformType(v) {
    if (typeof v === 'number') return 'float';
    if (Array.isArray(v)) return ['float', 'vec2', 'vec3', 'vec4'][v.length - 1];
    throw new Error('bad uniform');
  }
  function paletteUniformNames(scene) {
    const s = new Set();
    (scene.palettes || []).forEach((p) => Object.keys(p.colors || {}).forEach((k) => s.add(k)));
    return [...s];
  }
  function hexToRgb(h) {
    if (Array.isArray(h)) return h;
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function srgbToLin(c) {
    return c.map((x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  }
  ASCII.hexToRgb = hexToRgb;

  const DEFAULTS = {
    scene: null,
    palette: 0,
    font: 0,
    glyphPx: 0, // 0 = choose from screen size
    lineHeight: 1.1,
    quality: 'high',
    resScale: 1,
    detail: 1,
    speed: 1,
    exposure: 1,
    saturation: 1,
    brightness: 1,
    sharp: 1.6,
    glyphGamma: 0.85,
    colGamma: 0.75,
    cover: 0.62,
    minCov: 0.02,
    white: 0.35,
    atmosphere: 0.5,
    camera: 0.5,
    stability: 0.25,
    flat: 0.3,
    meanW: 0.5,
    flatShape: 0.25,
    edgeNorm: 1,
    edgeRef: 0.42,
    flatTone: 1.5,
    bigGlyphs: 1,
    dither: 0.6,
    adaptive: 1,
    preset: 0,
  };
  ASCII.DEFAULTS = DEFAULTS;

  class Engine {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: !!opts.preserve,
        powerPreference: 'high-performance',
      });
      if (!gl) throw new Error('WebGL2 is not available in this browser.');
      this.gl = gl;
      this.floatRT = !!gl.getExtension('EXT_color_buffer_float');
      this.enc = this.floatRT ? ENC_FLOAT : ENC_U8;
      this.settings = Object.assign({}, DEFAULTS, opts.settings || {});
      this.fixedSize = opts.fixedSize || null; // [w,h] for captures
      this.time = 0;
      this.paused = false;
      this.frameNo = 0;
      this.cur = 0;
      this.hasPrev = false;
      this.stats = { cols: 0, rows: 0, cells: 0, visible: 0, nonSpace: 0, fps: 0, samples: 0 };
      this._progs = {};
      this._initGeometry();
      this.composeProg = this._program(VS, COMPOSE_FS);
    }

    // -------------------------------------------------------------- GL utils
    _shader(type, src) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        console.error(log, '\n', src.split('\n').map((l, i) => i + 1 + ': ' + l).join('\n'));
        throw new Error('Shader compile failed: ' + log);
      }
      return s;
    }
    _program(vs, fs) {
      const gl = this.gl;
      const p = gl.createProgram();
      gl.attachShader(p, this._shader(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, this._shader(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link failed: ' + gl.getProgramInfoLog(p));
      p._u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const name = info.name.replace(/\[0\]$/, '');
        p._u[name] = gl.getUniformLocation(p, info.name);
      }
      return p;
    }
    _initGeometry() {
      const gl = this.gl;
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    }
    _tex(w, h, ifmt, fmt, type, data = null) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
      t.w = w;
      t.h = h;
      return t;
    }
    _fbo(texs) {
      const gl = this.gl;
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incomplete: ' + st);
      f.texs = texs;
      return f;
    }
    _del(o) {
      if (!o) return;
      const gl = this.gl;
      if (o.texs) {
        o.texs.forEach((t) => gl.deleteTexture(t));
        gl.deleteFramebuffer(o);
      } else gl.deleteTexture(o);
    }

    // ---------------------------------------------------------- scene setup
    get scene() {
      return this._scene;
    }
    setScene(id) {
      const sc = ASCII.scenes.find((s) => s.id === id) || ASCII.scenes[0];
      this._scene = sc;
      this.settings.scene = sc.id;
      const key = sc.id;
      if (!this._progs[key]) this._progs[key] = this._program(VS, sceneFS(sc, this.enc));
      this.sceneProg = this._progs[key];
      this._buildMasks();
      if (this.settings.palette >= (sc.palettes || [1]).length) this.settings.palette = 0;
      this.hasPrev = false;
    }
    _buildMasks() {
      const sets = (this._scene && this._scene.glyphSets) || {};
      const masks = new Uint32Array(128);
      for (let m = 0; m < 32; m++) {
        const def = sets[m & 15] || {};
        const str = typeof def === 'string' ? (m < 16 ? def : def) : m < 16 ? def.edge || EDGE : def.tone || TONE;
        for (let g = 0; g < NGLYPH; g++) {
          const ch = String.fromCharCode(32 + g);
          const ok = str.indexOf(ch) >= 0 || g === 0;
          if (ok && !this._excluded(ch)) masks[m * 4 + (g >> 5)] |= 1 << (g & 31);
        }
      }
      this.masks = masks;
    }
    _excluded(ch) {
      const ex = (this._scene && this._scene.exclude) || '';
      return ex.indexOf(ch) >= 0;
    }

    // ---------------------------------------------------------- font atlas
    _buildAtlas() {
      const a1 = this._renderAtlas(1);
      this.cell = a1.cell;
      this.atlasCols = a1.cols;
      this.atlasCanvas = a1.canvas;
      const gl = this.gl;
      this._del(this.atlasTex);
      this.atlasTex = this._tex(a1.canvas.width, a1.canvas.height, gl.R8, gl.RED, gl.UNSIGNED_BYTE, a1.alpha);
      [this.featTex, this.meanTex] = this._buildFeatures(a1.alpha, a1.canvas.width, a1.cell, [this.featTex, this.meanTex]);
      const a2 = this._renderAtlas(2, a1.cell);
      this._del(this.atlas2Tex);
      this.atlas2Tex = this._tex(a2.canvas.width, a2.canvas.height, gl.R8, gl.RED, gl.UNSIGNED_BYTE, a2.alpha);
      [this.featTex2, this.meanTex2] = this._buildFeatures(a2.alpha, a2.canvas.width, a2.cell, [this.featTex2, this.meanTex2]);
    }
    // Renders the 95 glyphs into a 16-column atlas. scale 2 renders the
    // font at twice the size into cells exactly twice as large, used for
    // the large foreground glyphs.
    _renderAtlas(scale, baseCell) {
      const s = this.settings;
      const font = ASCII.fonts[s.font] || ASCII.fonts[0];
      const px = Math.max(5, Math.round(s.glyphPx || 11)) * scale;
      const cv = document.createElement('canvas');
      let ctx = cv.getContext('2d');
      const fstr = `${font.weight || 400} ${px}px ${font.family}`;
      ctx.font = fstr;
      const m = ctx.measureText('M');
      const adv = m.width;
      const cw = baseCell ? baseCell[0] * scale : Math.max(3, Math.round(adv * (font.advance || 1)));
      const ch = baseCell ? baseCell[1] * scale : Math.max(5, Math.round(px * s.lineHeight));
      const asc = m.fontBoundingBoxAscent || px * 0.8;
      const desc = m.fontBoundingBoxDescent || px * 0.2;
      const base = Math.round((ch - (asc + desc)) / 2 + asc);
      const cols = 16;
      const rows = Math.ceil(NGLYPH / cols);
      cv.width = cols * cw;
      cv.height = rows * ch;
      ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.font = fstr;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      const xoff = (cw - adv) / 2;
      for (let g = 1; g < NGLYPH; g++) {
        const tx = (g % cols) * cw;
        const ty = Math.floor(g / cols) * ch;
        ctx.save();
        ctx.beginPath();
        ctx.rect(tx, ty, cw, ch);
        ctx.clip();
        ctx.fillText(String.fromCharCode(32 + g), Math.round(tx + xoff), ty + base);
        ctx.restore();
      }
      const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const a = new Uint8Array(cv.width * cv.height);
      for (let i = 0; i < a.length; i++) a[i] = img[i * 4 + 3];
      return { canvas: cv, alpha: a, cell: [cw, ch], cols };
    }
    _buildFeatures(alpha, aw, cellSize, old) {
      const q = QUALITY[this.settings.quality] || QUALITY.high;
      const [cw, ch] = cellSize;
      const nreg = q.rx * q.ry;
      const nvec = Math.ceil(nreg / 4);
      const feat = new Float32Array(nvec * 4 * NGLYPH);
      const mean = new Float32Array(4 * NGLYPH);
      const gg = this.settings.glyphGamma;
      for (let g = 0; g < NGLYPH; g++) {
        const tx = (g % 16) * cw;
        const ty = Math.floor(g / 16) * ch;
        const acc = new Float32Array(nreg);
        const cnt = new Float32Array(nreg);
        let tot = 0;
        for (let y = 0; y < ch; y++)
          for (let x = 0; x < cw; x++) {
            // fractional region assignment: each pixel is split across the
            // regions it overlaps so odd cell sizes stay balanced
            const v = g === 0 ? 0 : Math.pow(alpha[(ty + y) * aw + tx + x] / 255, gg);
            tot += v;
            const fx0 = (x * q.rx) / cw, fx1 = ((x + 1) * q.rx) / cw;
            const fy0 = (y * q.ry) / ch, fy1 = ((y + 1) * q.ry) / ch;
            for (let ry = Math.floor(fy0); ry < Math.min(q.ry, Math.ceil(fy1)); ry++)
              for (let rx = Math.floor(fx0); rx < Math.min(q.rx, Math.ceil(fx1)); rx++) {
                const ox = Math.min(fx1, rx + 1) - Math.max(fx0, rx);
                const oy = Math.min(fy1, ry + 1) - Math.max(fy0, ry);
                const w = ox * oy;
                if (w <= 0) continue;
                acc[ry * q.rx + rx] += v * w;
                cnt[ry * q.rx + rx] += w;
              }
          }
        for (let k = 0; k < nreg; k++) feat[g * nvec * 4 + k] = cnt[k] ? acc[k] / cnt[k] : 0;
        mean[g * 4] = tot / (cw * ch);
      }
      const gl = this.gl;
      old.forEach((t) => this._del(t));
      return [this._tex(nvec, NGLYPH, gl.RGBA32F, gl.RGBA, gl.FLOAT, feat), this._tex(1, NGLYPH, gl.RGBA32F, gl.RGBA, gl.FLOAT, mean)];
    }

    // ------------------------------------------------------------- sizing
    resize(force) {
      const s = this.settings;
      const dpr = window.devicePixelRatio || 1;
      let W, H;
      if (this.fixedSize) [W, H] = this.fixedSize;
      else {
        W = Math.max(64, Math.round(this.canvas.clientWidth * dpr * s.resScale));
        H = Math.max(64, Math.round(this.canvas.clientHeight * dpr * s.resScale));
      }
      const key = [W, H, s.glyphPx, s.lineHeight, s.font, s.quality, s.glyphGamma].join('|');
      if (!force && key === this._sizeKey) return;
      this._sizeKey = key;
      this.canvas.width = W;
      this.canvas.height = H;
      this._buildAtlas();
      const [cw, ch] = this.cell;
      const cols = Math.ceil(W / cw);
      const rows = Math.ceil(H / ch);
      const q = QUALITY[s.quality] || QUALITY.high;
      this.q = q;
      const gl = this.gl;
      const sw = cols * q.rx * q.aa;
      const sh = rows * q.ry * q.aa;
      this._del(this.sceneFbo);
      this.sceneFbo = this.floatRT
        ? this._fbo([this._tex(sw, sh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT)])
        : this._fbo([this._tex(sw, sh, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE)]);
      for (let i = 0; i < 2; i++) {
        this._del(this.cellFbo && this.cellFbo[i]);
      }
      this.cellFbo = [0, 1].map(() =>
        this._fbo([this._tex(cols, rows, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE), this._tex(cols, rows, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE)])
      );
      const bcols = Math.ceil(cols / 2), brows = Math.ceil(rows / 2);
      if (this.blockFbo) this.blockFbo.forEach((f) => this._del(f));
      this.blockFbo = [0, 1].map(() =>
        this._fbo([this._tex(bcols, brows, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE), this._tex(bcols, brows, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE)])
      );
      this.bcols = bcols;
      this.brows = brows;
      const qk = s.quality;
      this._cellProgs = this._cellProgs || {};
      if (!this._cellProgs[qk]) this._cellProgs[qk] = [this._program(VS, cellFS(q, this.enc, 1)), this._program(VS, cellFS(q, this.enc, 2))];
      [this.cellProg, this.blockProg] = this._cellProgs[qk];
      this.W = W;
      this.H = H;
      this.cols = cols;
      this.rows = rows;
      this.sceneW = sw;
      this.sceneH = sh;
      this.offset = [Math.floor((cols * cw - W) / 2), Math.floor((rows * ch - H) / 2)];
      this.hasPrev = false;
      Object.assign(this.stats, { cols, rows, cells: cols * rows, samples: sw * sh, cw, ch, W, H });
    }

    // ------------------------------------------------------------- render
    _setUniform(p, name, v) {
      const gl = this.gl;
      const loc = p._u[name];
      if (loc === undefined || loc === null) return;
      if (typeof v === 'number') gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2fv(loc, v);
      else if (v.length === 3) gl.uniform3fv(loc, v);
      else if (v.length === 4) gl.uniform4fv(loc, v);
    }
    render(t) {
      const gl = this.gl;
      const s = this.settings;
      const sc = this._scene;
      this.resize(false);
      const loop = sc.loop || 60;
      t = ((t % loop) + loop) % loop;
      this.lastT = t;
      gl.bindVertexArray(this.vao);
      gl.disable(gl.BLEND);

      // pass 1: scene
      let p = this.sceneProg;
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.viewport(0, 0, this.sceneW, this.sceneH);
      const [cw, ch] = this.cell;
      this._setUniform(p, 'uSceneRes', [this.sceneW, this.sceneH]);
      this._setUniform(p, 'uGridPx', [this.cols * cw, this.rows * ch]);
      this._setUniform(p, 'uCanvasPx', [this.W, this.H]);
      this._setUniform(p, 'uCellPx', [cw, ch]);
      this._setUniform(p, 'uTime', t);
      this._setUniform(p, 'uLoop', loop);
      this._setUniform(p, 'uPhase', t / loop);
      this._setUniform(p, 'uDetail', s.detail);
      this._setUniform(p, 'uAtmos', s.atmosphere);
      this._setUniform(p, 'uCamAmt', s.camera);
      this._setUniform(p, 'uSeed', s.seed || 0);
      // a capture can render a 1:1 window of a larger virtual frame
      const vw = s.viewW || this.W, vh = s.viewH || this.H;
      this._setUniform(p, 'uView', [s.viewX || 0, vh - this.H - (s.viewY || 0), vw, vh]);
      this._setUniform(p, 'uPxSize', 2 / vh);
      for (const [k, v] of Object.entries(sc.uniforms || {})) this._setUniform(p, k, (s.uniforms && s.uniforms[k]) ?? v);
      const pal = (sc.palettes || [])[s.palette];
      if (pal) for (const [k, v] of Object.entries(pal.colors || {})) this._setUniform(p, k, srgbToLin(hexToRgb(v)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (s.debug) {
        if (!this.debugProg) this.debugProg = this._program(VS, DEBUG_FS(this.enc));
        p = this.debugProg;
        gl.useProgram(p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.W, this.H);
        this._bindTex(0, this.sceneFbo.texs[0], p._u.uScene);
        this._setUniform(p, 'uSize', [this.sceneW, this.sceneH]);
        this._setUniform(p, 'uCanvas', [this.W, this.H]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        this.frameNo++;
        return;
      }

      // pass 2: glyph selection (2a: large foreground glyphs on 2x2 blocks, 2b: cells)
      const bigOn = this.bigOn();
      const bdst = this.blockFbo[this.cur];
      if (bigOn) {
        this._glyphPass(this.blockProg, bdst, this.blockFbo[1 - this.cur], this.bcols, this.brows, this.featTex2, this.meanTex2, null, pal, true);
      }
      const dst = this.cellFbo[this.cur];
      this._glyphPass(this.cellProg, dst, this.cellFbo[1 - this.cur], this.cols, this.rows, this.featTex, this.meanTex, bdst, pal, bigOn);

      // pass 3: compose to screen
      p = this.composeProg;
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.W, this.H);
      this._bindTex(0, dst.texs[0], p._u.uCellColor);
      this._bindTex(1, dst.texs[1], p._u.uCellGlyph);
      this._bindTex(2, this.atlasTex, p._u.uAtlas);
      this._bindTex(3, bdst.texs[0], p._u.uBlockColor);
      this._bindTex(4, bdst.texs[1], p._u.uBlockGlyph);
      this._bindTex(5, this.atlas2Tex, p._u.uAtlas2);
      gl.uniform1i(p._u.uBigOn, bigOn ? 1 : 0);
      gl.uniform2i(p._u.uCell, cw, ch);
      gl.uniform2i(p._u.uOffset, this.offset[0], this.offset[1]);
      gl.uniform1i(p._u.uAtlasCols, this.atlasCols);
      this._setUniform(p, 'uBg', hexToRgb((pal && pal.bg) || sc.bg || '#0a0a0b'));
      this._setUniform(p, 'uGlyphGamma', s.glyphGamma);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      this.cur = 1 - this.cur;
      this.hasPrev = true;
      this.frameNo++;
    }
    bigOn() {
      return !!(this._scene.bigDepth > 0 && this.settings.bigGlyphs);
    }
    _glyphPass(p, dst, prev, w, h, feat, mean, block, pal, bigOn) {
      const gl = this.gl;
      const s = this.settings;
      const sc = this._scene;
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0, 0, w, h);
      this._bindTex(0, this.sceneFbo.texs[0], p._u.uScene);
      this._bindTex(1, feat, p._u.uFeat);
      this._bindTex(2, mean, p._u.uFeatMean);
      this._bindTex(3, prev.texs[1], p._u.uPrev);
      this._bindTex(4, block ? block.texs[1] : prev.texs[1], p._u.uBlock);
      this._setUniform(p, 'uBigOn', bigOn ? 1 : 0);
      this._setUniform(p, 'uBigDepth', sc.bigDepth || 0);
      this._setUniform(p, 'uDither', s.dither * ((sc.look && sc.look.dither) ?? 1));
      gl.uniform1i(p._u.uNGlyph, NGLYPH);
      gl.uniform4uiv(p._u.uMask, this.masks);
      const look = Object.assign({}, sc.look || {}, (pal && pal.look) || {});
      const lk = (k) => (s[k] ?? 1) * (look[k] ?? 1);
      this._setUniform(p, 'uFlat', s.flat * (look.flat ?? 1));
      this._setUniform(p, 'uMeanW', s.meanW);
      this._setUniform(p, 'uEdgeNorm', s.edgeNorm * (look.edgeNorm ?? 1));
      this._setUniform(p, 'uEdgeRef', s.edgeRef);
      this._setUniform(p, 'uFlatShape', s.flatShape);
      this._setUniform(p, 'uFlatTone', s.flatTone * (look.flatTone ?? 1));
      this._setUniform(p, 'uExposure', lk('exposure'));
      this._setUniform(p, 'uCover', s.cover * (look.cover ?? 1));
      this._setUniform(p, 'uSharp', s.sharp * (look.sharp ?? 1));
      this._setUniform(p, 'uHyst', s.stability);
      this._setUniform(p, 'uSat', lk('saturation'));
      this._setUniform(p, 'uBright', lk('brightness'));
      this._setUniform(p, 'uMinCov', s.minCov * (look.minCov ?? 1));
      this._setUniform(p, 'uColGamma', s.colGamma * (look.colGamma ?? 1));
      this._setUniform(p, 'uWhite', s.white * (look.white ?? 1));
      this._setUniform(p, 'uHasPrev', this.hasPrev && s.stability > 0 ? 1 : 0);
      this._setUniform(p, 'uTint', look.tint || [1, 1, 1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    _bindTex(unit, tex, loc) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (loc) gl.uniform1i(loc, unit);
    }

    // Count glyphs actually drawn in the last frame. "visible" requires the
    // glyph colour to be bright enough to stand out from the background.
    measure() {
      const gl = this.gl;
      const f = this.cellFbo[1 - this.cur];
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f);
      const n = this.cols * this.rows;
      const col = new Uint8Array(n * 4);
      const gly = new Uint8Array(n * 4);
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, col);
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      gl.readPixels(0, 0, this.cols, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, gly);
      let big = 0, bigVisible = 0;
      if (this.bigOn()) {
        const bf = this.blockFbo[1 - this.cur];
        const bn = this.bcols * this.brows;
        const bcol = new Uint8Array(bn * 4), bgl = new Uint8Array(bn * 4);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, bf);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.readPixels(0, 0, this.bcols, this.brows, gl.RGBA, gl.UNSIGNED_BYTE, bcol);
        gl.readBuffer(gl.COLOR_ATTACHMENT1);
        gl.readPixels(0, 0, this.bcols, this.brows, gl.RGBA, gl.UNSIGNED_BYTE, bgl);
        for (let i = 0; i < bn; i++) {
          if (bgl[i * 4 + 1] < 128 || bgl[i * 4] === 0) continue;
          big++;
          const l = 0.2126 * bcol[i * 4] + 0.7152 * bcol[i * 4 + 1] + 0.0722 * bcol[i * 4 + 2];
          if (l >= 40) bigVisible++;
        }
      }
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      let nonSpace = big,
        visible = bigVisible;
      const hist = new Uint32Array(NGLYPH);
      for (let i = 0; i < n; i++) {
        const g = gly[i * 4];
        if (g === 0) continue;
        nonSpace++;
        hist[g]++;
        const l = 0.2126 * col[i * 4] + 0.7152 * col[i * 4 + 1] + 0.0722 * col[i * 4 + 2];
        if (l >= 40) visible++;
      }
      let distinct = 0;
      for (let g = 1; g < NGLYPH; g++) if (hist[g]) distinct++;
      Object.assign(this.stats, { nonSpace, visible, distinct, big });
      return this.stats;
    }
  }
  ASCII.Engine = Engine;
  ASCII.NGLYPH = NGLYPH;
})();

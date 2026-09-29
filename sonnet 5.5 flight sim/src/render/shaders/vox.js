import { HEAD, NOISE } from './chunks.js';
import { NODE_CELLS } from '../../world/config.js';

/* Voxel geometry shaders. Vertex: ivec4 (x, y, z, w) with w = face | ao << 3 | material << 5 | soft << 13 | bank << 14.
   Defines: INSTANCED, MODEL, DEPTH_ONLY, POST (HDR + MRT outputs), SHADOWS, EDGES, MACRO, WATER_Q, REFLECT,
   SKY_LUT, CLOUD_SHADOWS, REFL_TEX, DETAIL.
   Palette texture rows: 0 albedo + roughness, 1 emissive, 2 metal / variation / translucency / flags, 3 to 5 surface pattern
   parameters (windows, brick, siding, ribs), 6 to 8 albedo of color banks 1 to 3. */

const POS_CHUNK = `
layout(location=0) in ivec4 a_pos;
#ifdef INSTANCED
layout(location=1) in vec4 a_iPos;
layout(location=2) in float a_iScale;
layout(location=3) in vec4 a_iTint;
#endif
uniform mat4 u_vp;
uniform vec3 u_origin;
uniform float u_cell;
uniform vec3 u_modelOff;
uniform mat3 u_rot;
uniform vec3 u_tint;
uniform float u_camY;
uniform float u_time;
uniform sampler2D u_palette;
const vec3 NRM[6] = vec3[6](vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1));
`;

export const voxVert = HEAD + POS_CHUNK + `
#ifndef DEPTH_ONLY
out vec3 v_local;
out vec3 v_rel;
out float v_ao;
flat out int v_face;
flat out int v_mat;
flat out int v_bank;
flat out vec3 v_nrm;
flat out vec3 v_lnrm;
flat out vec3 v_tintc;
flat out float v_seed;
flat out int v_soft;
out vec3 v_sn;
out float v_wy;
#endif
void main() {
  vec3 p = vec3(a_pos.xyz);
  int w = a_pos.w;
  int face = w & 7;
  int ao = (w >> 3) & 3;
  int mat = (w >> 5) & 255;
  vec3 ln = NRM[face];
  vec3 rel;
  vec3 nrm = ln;
  vec3 tint = vec3(1.0);
  float seed = 0.0;
  int soft = 0;
  int bank = (w >> 14) & 3;
  vec3 smn = vec3(0.0);
#if defined(INSTANCED)
  vec3 mp = p * u_cell + u_modelOff;
  int fli = int(texelFetch(u_palette, ivec2(mat, 2), 0).a * 255.0 + 0.5);
  bool fol = (fli & 32) != 0;
  // yaw carries the height of a crown above its tree's foot in the whole part (8 rad steps of a quarter meter), for the sway
  float yawIn = a_iPos.w;
  float hq = floor(yawIn * 0.125);
  float yaw = yawIn - hq * 8.0;
  vec3 sn = ln;
  if ((fli & 2) != 0) {
    // a rounded body: the model is a voxel ball around its origin. Corners are pulled toward the sphere and the normal
    // follows it, so a handful of big voxels reads as a soft mass of leaves (or, less so, a weathered boulder)
    float rl = length(mp);
    mp *= mix(1.0, 1.0 / max(rl, 0.3), (fol ? 0.62 : 0.3) * smoothstep(0.45, 0.85, rl));
    sn = mp / max(length(mp), 1e-4);
    soft = fol ? 1 : 2;
  }
  vec3 m = mp * a_iScale;
  if (fol) {
    float hgt = max(m.y + hq * 0.25, 0.0);
    float ph = a_iPos.x * 0.21 + a_iPos.z * 0.17;
    float sway = 0.6 * sin(u_time * 1.3 + ph) + 0.4 * sin(u_time * 2.9 + ph * 1.7);
    float gust = 0.5 + 0.5 * sin(u_time * 0.35 + a_iPos.x * 0.004);
    m.x += sway * hgt * hgt * 0.0036 * (0.5 + gust);
    m.z += sway * hgt * hgt * 0.0016 * (0.5 + gust);
  }
  float c = cos(yaw), s = sin(yaw);
  mat3 R = mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  rel = u_origin + a_iPos.xyz + R * m;
  nrm = R * ln;
  smn = R * sn;
  tint = a_iTint.rgb;
  bank = (int(a_iTint.a * 255.0 + 0.5) + 1) & 3;
  seed = a_iPos.x * 0.173 + a_iPos.z * 0.291;
#elif defined(MODEL)
  vec3 m = p * u_cell + u_modelOff;
  rel = u_origin + u_rot * m;
  nrm = u_rot * ln;
  tint = u_tint;
#else
  rel = u_origin + p * u_cell;
  soft = (w >> 13) & 1;
  if (soft != 0) nrm = normalize(mix(ln, vec3(0.0, 1.0, 0.0), 0.72));
#endif
#ifdef REFLECT
  float wyr = rel.y + u_camY;
  rel.y = -rel.y - 2.0 * u_camY;
#endif
  gl_Position = u_vp * vec4(rel, 1.0);
#ifndef DEPTH_ONLY
  v_local = p;
  v_rel = rel;
  v_ao = float(ao) * (1.0 / 3.0);
  v_face = face;
  v_mat = mat;
  v_bank = bank;
  v_nrm = nrm;
  v_lnrm = ln;
  v_tintc = tint;
  v_seed = seed;
  v_soft = soft;
  v_sn = smn;
#ifdef REFLECT
  v_wy = wyr;
#else
  v_wy = rel.y + u_camY;
#endif
#endif
}
`;

export const depthFrag = HEAD + `
out vec4 o;
void main() { o = vec4(1.0); }
`;

export const AERIAL = `
uniform vec3 u_fogColor;
uniform vec3 u_fogSun;
uniform float u_fogDensity;
uniform float u_fogHeight;
uniform float u_fogEnd;
uniform vec3 u_haze;
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform float u_night;
#ifdef SKY_LUT
uniform sampler2D u_skyLut;
uniform float u_sunAz;
vec3 skyLutColor(vec3 d) {
  float l = asin(clamp(d.y, -1.0, 1.0));
  float v = 0.5 + 0.5 * sign(l) * sqrt(abs(l) / 1.5707963);
  vec2 h = d.xz;
  float hl = length(h);
  float phi = 0.0;
  if (hl > 1e-4) {
    vec2 s = vec2(cos(u_sunAz), sin(u_sunAz));
    phi = acos(clamp(dot(h / hl, s), -1.0, 1.0));
  }
  return textureLod(u_skyLut, vec2(phi / PI, v), 0.0).rgb;
}
vec3 skyColor(vec3 d) { return skyLutColor(d); }
#else
uniform vec3 u_zenith;
uniform vec3 u_horizon;
vec3 skyColor(vec3 d) {
  float h = d.y;
  vec3 col = mix(u_horizon, u_zenith, pow(clamp(h, 0.0, 1.0), 0.42));
  col = mix(u_fogColor, col, smoothstep(-0.06, 0.02, h));
  float sd = max(dot(d, u_sunDir), 0.0);
  col += u_sunColor * (0.02 * pow(sd, 5.0) + 0.05 * pow(sd, 40.0)) * (1.0 - u_night);
  return col;
}
#endif
/* Aerial perspective: per-channel extinction tints distance toward the sky color in the view direction. */
vec3 aerial(vec3 col, vec3 vdir, float dist, float camY, float ry) {
  float hAvg = max(camY + ry * 0.5, 0.0);
  float hf = exp(-hAvg * u_fogHeight);
  vec3 T = exp(-u_haze * dist * hf);
  vec3 dirC = normalize(vec3(vdir.x, max(vdir.y, 0.015), vdir.z));
#ifdef SKY_LUT
  vec3 inscatter = skyLutColor(dirC);
#else
  vec3 inscatter = mix(u_fogColor, u_fogSun, pow(max(dot(vdir, u_sunDir), 0.0), 5.0) * 0.7 * (1.0 - u_night));
#endif
  col = col * T + inscatter * (vec3(1.0) - T);
  float edge = smoothstep(u_fogEnd * 0.72, u_fogEnd, dist);
  return mix(col, inscatter, edge);
}
`;

export const voxFrag = HEAD + NOISE + AERIAL + `
in vec3 v_local;
in vec3 v_rel;
in float v_ao;
flat in int v_face;
flat in int v_mat;
flat in int v_bank;
flat in vec3 v_nrm;
flat in vec3 v_lnrm;
flat in vec3 v_tintc;
flat in float v_seed;
flat in int v_soft;
in vec3 v_sn;
in float v_wy;
#ifdef POST
layout(location=0) out vec4 outColor;
layout(location=1) out float outDist;
layout(location=2) out vec4 outNormal;
#else
out vec4 outColor;
#endif

uniform vec3 u_ambSky;
uniform vec3 u_ambGround;
uniform float u_time;
uniform float u_cell;
uniform float u_edge;
uniform ivec3 u_cellOrigin;
uniform vec3 u_worldOrigin;
uniform float u_exposure;
uniform float u_aoStrength;
uniform float u_camY;
uniform float u_noPost;
uniform sampler2D u_palette;
uniform vec2 u_res;
#ifdef TNORM
uniform sampler2D u_tnorm;
uniform float u_tnormOn;
#endif
#ifdef CANOPY
uniform sampler2D u_canopy;
uniform float u_canopyNear;
#endif
#ifdef REFL_TEX
uniform sampler2D u_refl;
#endif
uniform vec4 u_cloudCtl; // x cover, y altitude, z thickness, w time
uniform vec2 u_wind;

#ifdef CLOUD_SHADOWS
float cloudShadowAt(vec3 wp) {
  float t = (u_cloudCtl.y + u_cloudCtl.z * 0.4 - wp.y) / max(u_sunDir.y, 0.08);
  vec2 q = (wp.xz + u_sunDir.xz * t) * 0.00042 + u_wind * u_cloudCtl.w;
  float n = vnoise(q) * 0.5 + vnoise(q * 2.03 + 17.0) * 0.3 + vnoise(q * 4.1 + 31.0) * 0.2;
  float c = smoothstep(1.0 - u_cloudCtl.x, 1.0 - u_cloudCtl.x + 0.25, n);
  return mix(1.0, 0.32, c * smoothstep(0.03, 0.2, u_sunDir.y));
}
#endif

#ifdef SHADOWS
uniform sampler2DArrayShadow u_shadowMap;
uniform mat4 u_shadowVP[4];
uniform vec4 u_cascadeSplit;
uniform vec4 u_shadowTexel;
uniform vec3 u_camFwd;
uniform int u_cascades;
uniform float u_shadowSize;
float shadowFactor(vec3 rel, vec3 N, float ndl) {
  float vd = dot(rel, u_camFwd);
  int ci = 0;
  if (u_cascades > 1 && vd > u_cascadeSplit.x) ci = 1;
  if (u_cascades > 2 && vd > u_cascadeSplit.y) ci = 2;
  if (u_cascades > 3 && vd > u_cascadeSplit.z) ci = 3;
  if (vd > u_cascadeSplit[ci]) return 1.0;
  vec3 wp = rel + N * (u_shadowTexel[ci] * 2.2);
  vec4 sc = u_shadowVP[ci] * vec4(wp, 1.0);
  vec3 p = sc.xyz / sc.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float bias = 0.0005 + 0.0011 * (1.0 - ndl);
  float rot = ign(gl_FragCoord.xy + float(int(u_time * 60.0) & 7) * 5.3) * 6.2831853;
  float cs = cos(rot), sn = sin(rot);
  float rad = 1.35 / u_shadowSize;
  // Twelve Vogel taps, but most pixels are fully lit or fully shadowed: four spread taps decide that first and the
  // other eight only run across the penumbra, which cuts the filter cost by more than half on typical frames.
  float s = 0.0;
  for (int i = 0; i < 12; i += 3) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 12.0);
    float th = fi * 2.399963;
    vec2 o = vec2(cos(th), sin(th)) * r;
    o = vec2(o.x * cs - o.y * sn, o.x * sn + o.y * cs) * rad;
    s += texture(u_shadowMap, vec4(p.xy + o, float(ci), p.z - bias));
  }
  if (s > 0.01 && s < 3.99) {
    for (int i = 0; i < 12; i++) {
      if (i % 3 == 0) continue;
      float fi = float(i);
      float r = sqrt((fi + 0.5) / 12.0);
      float th = fi * 2.399963;
      vec2 o = vec2(cos(th), sin(th)) * r;
      o = vec2(o.x * cs - o.y * sn, o.x * sn + o.y * cs) * rad;
      s += texture(u_shadowMap, vec4(p.xy + o, float(ci), p.z - bias));
    }
    s /= 12.0;
  } else s *= 0.25;
  float fade = smoothstep(0.82, 1.0, vd / u_cascadeSplit[ci]);
  return mix(s, 1.0, fade);
}
#endif

vec3 waveNormal(vec2 p, float dist) {
  vec2 g = vec2(0.0);
  float t = u_time;
#if WATER_Q >= 1
  g += vec2(0.8, 0.6) * cos(dot(vec2(0.8, 0.6), p) * 0.35 + t * 0.9) * 0.35 * 0.10;
  g += vec2(-0.5, 0.86) * cos(dot(vec2(-0.5, 0.86), p) * 0.62 + t * 1.3) * 0.62 * 0.07;
#endif
#if WATER_Q >= 2
  g += vec2(0.25, -0.97) * cos(dot(vec2(0.25, -0.97), p) * 1.35 + t * 1.9) * 1.35 * 0.035;
  g += vec2(-0.9, -0.43) * cos(dot(vec2(-0.9, -0.43), p) * 2.9 + t * 2.7) * 2.9 * 0.016;
  g += vec2(0.6, 0.8) * cos(dot(vec2(0.6, 0.8), p) * 6.3 + t * 3.6) * 6.3 * 0.006;
#endif
  g *= exp(-dist * 0.0009);
  return normalize(vec3(-g.x, 1.0, -g.y));
}

float D_GGX(float ndh, float a) { float a2 = a * a; float d = ndh * ndh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d + 1e-6); }
float V_Smith(float ndl, float ndv, float rough) {
  float k = (rough + 1.0) * (rough + 1.0) * 0.125;
  return 1.0 / ((ndl * (1.0 - k) + k) * (ndv * (1.0 - k) + k) + 1e-5);
}

/* Windows, brick courses, siding and ribs, drawn in world space so they read the same at every level of detail.
   Adjusts albedo and roughness in place; returns the window glass coverage, and the light the panes give off at night in wl. */
float surfacePattern(int pat, vec3 wpos, vec3 dW, float dist, inout vec3 albedo, inout float rough, out vec3 wl, out float wOn) {
  wl = vec3(0.0);
  wOn = 0.0;
  bool wallFace = v_face != 2 && v_face != 3;
  if (!wallFace || (pat & 63) == 0) return 0.0;
  vec4 pA = texelFetch(u_palette, ivec2(v_mat, 3), 0);
  vec4 pB = texelFetch(u_palette, ivec2(v_mat, 4), 0);
  vec4 pC = texelFetch(u_palette, ivec2(v_mat, 5), 0);
  int arow = v_bank == 0 ? 0 : 5 + v_bank;
  float bay = max(pA.g * 255.0 * 0.125, 0.25);
  float flh = max(pA.b * 255.0 * 0.0625, 0.25);
  float u = v_face < 2 ? wpos.z : wpos.x;
  float du = v_face < 2 ? dW.z : dW.x;
  float dy = dW.y;
  float y = wpos.y;
  vec3 wall = albedo;
  float glass = 0.0;
  float fadeGrid = 0.0;

  if ((pat & 1) != 0) {
    vec2 cs = vec2(bay, flh);
    vec2 g = vec2(u, y) / cs;
    vec2 cid = floor(g);
    vec2 fr = g - cid;
    vec2 fpx = vec2(du, dy) / cs;
    fadeGrid = smoothstep(0.32, 0.85, max(fpx.x, fpx.y));
    float ww = pB.g, wh = pB.b, sl = pB.a;
    vec2 hs = vec2(ww * bay, wh * flh) * 0.5;
    vec2 pm = (fr - vec2(0.5, sl + wh * 0.5)) * cs;
    vec2 q = abs(pm) - hs;
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    if ((pat & 2) != 0) {
      float cy = hs.y - hs.x;
      if (pm.y > cy) sd = length(vec2(pm.x, pm.y - cy)) - hs.x;
    }
    float aa = length(vec2(du, dy)) * 0.7071 + 1e-4;
    float m = clamp(0.5 - sd / aa, 0.0, 1.0);
    m = mix(m, ww * wh, fadeGrid);
    // frame border and spandrel tone
    float frameW = pC.g * 255.0 * 0.01;
    float frameTone = pC.r * 255.0 / 127.5;
    float spTone = pC.b * 255.0 / 127.5;
    float ring = max(clamp(0.5 - (sd - frameW) / aa, 0.0, 1.0) - m, 0.0) * (1.0 - fadeGrid);
    float spand = step(abs(pm.x), hs.x) * (1.0 - m) * (1.0 - fadeGrid);
    wall *= mix(1.0, spTone, spand);
    wall *= mix(1.0, frameTone, ring);
    // per-pane glass: a little brightness spread so a tower is not one flat sheet
    uvec3 wid = uvec3(ivec3(int(cid.x), int(cid.y), v_face + 8 * v_bank));
    float h1 = hash13(wid);
    vec3 gcol = pow(texelFetch(u_palette, ivec2(int(pA.a * 255.0 + 0.5), arow), 0).rgb, vec3(2.2)) * (0.78 + 0.44 * hash13(wid ^ 0x2f1u));
    albedo = mix(wall, gcol, m);
    rough = mix(rough, 0.1, m);
    glass = m;
    // night: a share of the panes are lit, some floors busier than others, switching on gradually through dusk
    float occ = hash13(uvec3(ivec3(int(cid.y), 3 + v_bank, int(floor(cid.x / 5.0)) + 91)));
    float litFrac = min(pB.r * (0.12 + 1.05 * occ), 0.9);
    float lit = mix(step(h1, litFrac), litFrac, fadeGrid);
    float on = clamp(u_night * 1.8 - hash13(wid ^ 0x51u) * 0.7, 0.0, 1.0);
    // a few windows change state every minute or so
    float flick = step(0.985, hash13(uvec3(wid.x, wid.y ^ uint(floor(u_time / 55.0)), 77u)));
    lit = mix(lit, 1.0 - lit, flick * (1.0 - fadeGrid));
    wOn = m * lit * on;
    float warm = step(0.2, hash13(wid ^ 0x9bu));
    wl = mix(vec3(0.7, 0.82, 1.0), vec3(1.0, 0.64, 0.28), warm) * mix(0.55, 0.85, fadeGrid);
  }
  if ((pat & 4) != 0) {
    // brick courses and mortar joints, fading out where they would alias
    float cH = 0.25, bL = 0.56;
    float row = floor(y / cH);
    float ub = u / bL + 0.5 * mod(row, 2.0);
    vec2 bf = vec2(fract(ub), fract(y / cH));
    vec2 bw = vec2(du / bL, dy / cH);
    float dyb = min(bf.y, 1.0 - bf.y), dxb = min(bf.x, 1.0 - bf.x);
    float mort = max(clamp(0.5 + (0.1 - dyb) / max(bw.y, 1e-3), 0.0, 1.0), clamp(0.5 + (0.035 - dxb) / max(bw.x, 1e-3), 0.0, 1.0));
    float bfade = (1.0 - smoothstep(30.0, 100.0, dist)) * (1.0 - smoothstep(0.25, 0.7, max(bw.x, bw.y)));
    float bs = hash13(uvec3(ivec3(int(floor(ub)), int(row), 7)));
    vec3 w2 = albedo * (0.86 + 0.28 * bs);
    w2 = mix(w2, vec3(0.34, 0.31, 0.28), mort * 0.8);
    albedo = mix(albedo, w2, bfade * (1.0 - glass));
  }
  if ((pat & 8) != 0) {
    float sb = fract(y / 0.34);
    float sw = dy / 0.34;
    float edge = 1.0 - smoothstep(0.0, 0.16 + sw, sb);
    albedo *= 1.0 - 0.2 * edge * (1.0 - smoothstep(0.2, 0.6, sw)) * (1.0 - glass);
  }
  if ((pat & 16) != 0) {
    float rb = 0.5 + 0.5 * cos(u * 25.1327);
    float rw = du * 25.1327;
    albedo *= 0.84 + 0.16 * mix(rb, 0.5, smoothstep(0.6, 2.0, rw));
  }
  if ((pat & 32) != 0) {
    // precast panel joints on a 1.8 m by 3.6 m grid
    vec2 pg = vec2(u / 1.8, y / 3.6);
    vec2 pf = abs(fract(pg) - 0.5);
    vec2 pw = vec2(du / 1.8, dy / 3.6);
    float j = max(clamp(0.5 + (pf.x - 0.5 + 0.012) / max(pw.x, 1e-3), 0.0, 1.0), clamp(0.5 + (pf.y - 0.5 + 0.006) / max(pw.y, 1e-3), 0.0, 1.0));
    albedo *= 1.0 - 0.22 * j * (1.0 - smoothstep(0.3, 0.9, max(pw.x, pw.y))) * (1.0 - glass);
  }
  return glass;
}

void main() {
  int arow = v_bank == 0 ? 0 : 5 + v_bank;
  vec4 p0 = texelFetch(u_palette, ivec2(v_mat, arow), 0);
  vec4 p1 = texelFetch(u_palette, ivec2(v_mat, 1), 0);
  vec4 p2 = texelFetch(u_palette, ivec2(v_mat, 2), 0);
  int pat = int(texelFetch(u_palette, ivec2(v_mat, 3), 0).r * 255.0 + 0.5);
  int fl = int(p2.a * 255.0 + 0.5);
  bool water = (fl & 16) != 0;
  bool foliage = (fl & 32) != 0;
  bool tintf = (fl & 128) != 0;
  bool emitAlways = (fl & 1) != 0;
  float rough = p0.a;
  float metal = p2.r;
  float varAmp = p2.g * 0.5;
  float trans = p2.b;
  float emitI = p1.a * 24.0;

#ifdef REFLECT
  if (v_wy < -0.01 || water) discard;
#endif

  vec3 N = normalize(v_nrm);
  float tcav = 1.0;
  float aoV = v_ao;
#ifdef TNORM
  // ground: light from the smooth normal of the height field, not from the stepped voxel faces
  if (v_soft == 1 && u_tnormOn > 0.5 && !water) {
    vec4 tn = texture(u_tnorm, v_local.xz * (1.0 / ${NODE_CELLS}.0));
    vec3 Ns = vec3(tn.r * 2.0 - 1.0, 0.0, tn.g * 2.0 - 1.0);
    Ns.y = sqrt(max(1.0 - dot(Ns.xz, Ns.xz), 0.04));
    Ns = normalize(Ns);
    // treads take the smooth normal outright; a riser leans on it by how small the step is (its ao value, see the terrain mesher)
    N = v_face == 2 ? Ns : normalize(mix(N, Ns, mix(0.35, 0.97, v_ao)));
    tcav = tn.b;
    aoV = v_face == 2 ? v_ao : 1.0;
  }
#endif
  float roundAO = 1.0;
  bool isRound = false;
#ifdef INSTANCED
  if (v_soft != 0) {
    // rounded crown: light it as the ball it stands for, darker toward its underside where the leaves shade each other;
    // a boulder keeps more of its flat faces
    vec3 sn = normalize(v_sn);
    isRound = v_soft == 1;
    N = normalize(mix(N, sn, isRound ? 0.88 : 0.5));
    roundAO = isRound ? mix(0.56, 1.0, smoothstep(-0.95, 0.3, sn.y)) : mix(0.7, 1.0, smoothstep(-0.9, 0.2, sn.y));
  }
#endif
  vec3 albedo = pow(p0.rgb, vec3(2.2));
  float dist = length(v_rel);
  vec3 V = -v_rel / max(dist, 1e-4);

  vec3 inside = v_local - v_lnrm * 0.5;
  ivec3 vox = ivec3(floor(inside));
  uvec3 vh = uvec3(vox + u_cellOrigin) ^ uvec3(floatBitsToUint(v_seed));
  float vr = hash13(vh);
  albedo *= 1.0 + (vr - 0.5) * 2.0 * varAmp * (isRound ? 0.5 : 1.0);
  if (foliage || tintf) albedo *= v_tintc;
  // real leaves and turf are darker and less saturated than the palette swatches, which read as lime over a whole forest
  if (foliage) albedo = mix(vec3(luma(albedo)), albedo, 0.84) * 0.9;

  vec3 wpos = u_worldOrigin + v_local * u_cell;
  vec3 dW = fwidth(wpos);
#ifdef CANOPY
  // derivatives are taken here, in uniform control flow, and handed to textureGrad below: sampling inside the branch with
  // implicit derivatives smears the mip levels along quad borders
  vec2 wgx = dFdx(wpos.xz), wgy = dFdy(wpos.xz);
#endif
  float glassM = 0.0, winOn = 0.0;
  vec3 winL = vec3(0.0);
  if (pat != 0 && !water) glassM = surfacePattern(pat, wpos, dW, dist, albedo, rough, winL, winOn);
#ifdef DETAIL
  float detailFade = 1.0 - smoothstep(isRound ? 45.0 : 30.0, isRound ? 170.0 : 110.0, dist);
  if (detailFade > 0.0 && varAmp > 0.0 && !water && pat == 0) {
    // sub-voxel grain: thirds of a voxel on ground and props, quarters on leaf crowns, where it stands for the leaves themselves
    float dsub = isRound ? 4.0 : 3.0;
    vec3 sub = floor(inside * dsub);
    uvec3 sh = uvec3(ivec3(sub) + u_cellOrigin * 3) ^ uvec3(floatBitsToUint(v_seed));
    float g = hash13(sh);
    albedo *= 1.0 + (g - 0.5) * (isRound ? 0.34 : 0.16) * detailFade;
    vec3 jn = vec3(hash13(sh ^ 0x9e3779b9u), hash13(sh ^ 0x7f4a7c15u), hash13(sh ^ 0x85ebca6bu)) - 0.5;
    N = normalize(N + jn * (isRound ? 0.34 : 0.16) * detailFade * (foliage && !isRound ? 1.5 : 1.0) * (1.0 - metal * 0.6));
  }
#endif

  bool groundSoft = false;
  vec3 quilt = vec3(1.0);
#ifdef TNORM
  groundSoft = v_soft == 1;
#endif
#ifdef MACRO
  if (foliage && (v_face == 2 || groundSoft)) {
    // beyond a dozen kilometers the patches are far below a pixel and average out to 1, so they are not worth evaluating
    float mvF = 1.0 - smoothstep(6000.0, 13000.0, dist);
    if (mvF > 0.0) {
      float mv = vnoise(wpos.xz * 0.045) * 0.65 + vnoise(wpos.xz * 0.012) * 0.35;
      albedo *= 1.0 + (mv - 0.5) * 0.32 * mvF;
    }
    // broad sun-scorched patches so large fields and lawns are not one flat green
    float dry = vnoise(wpos.xz * 0.0065 + 11.0);
    albedo *= mix(vec3(1.0), vec3(1.16, 1.0, 0.7), smoothstep(0.55, 0.8, dry) * 0.6);
    // patches of lush and of sun-cured ground a few hundred meters across: the quilt seen from a cruising altitude
    float qv = vnoise(wpos.xz * 0.0024 + 17.0) * 0.6 + vnoise(wpos.xz * 0.0071 - 4.0) * 0.4;
    quilt = mix(vec3(0.9, 1.0, 0.92), vec3(1.15, 1.03, 0.8), smoothstep(0.34, 0.72, qv));
    albedo *= quilt;
    // wind running over the grass: broad bands of light and shade that drift downwind
    float wF = 1.0 - smoothstep(250.0, 2200.0, dist);
    if (wF > 0.0) {
      vec2 wdir = normalize(u_wind + vec2(1e-5));
      // the drift is in lattice units: 5.5 and 8.5 m/s of gust, times the frequency of each layer
      float wv = vnoise(wpos.xz * 0.034 - wdir * (u_time * 0.187)) * 0.62 + vnoise(wpos.xz * 0.12 - wdir * (u_time * 1.02) + 5.0) * 0.38;
      albedo *= 1.0 + (wv - 0.5) * 0.3 * wF;
    }
    // blades of grass up close: fine streaks of light and dark, and a rough normal to catch the sun
    float gdn = 1.0 - smoothstep(14.0, 70.0, dist);
    if (gdn > 0.0 && groundSoft) {
      float g1 = vnoise(wpos.xz * vec2(11.0, 9.0) + 3.0), g2 = vnoise(wpos.xz * vec2(27.0, 31.0) - 8.0);
      albedo *= 1.0 + ((g1 * 0.55 + g2 * 0.45) - 0.5) * 0.6 * gdn;
      N = normalize(N + vec3(g2 - 0.5, 0.0, g1 - 0.5) * 0.4 * gdn);
    }
  }
#endif

  float canopyAO = 1.0;
#ifdef CANOPY
  if (v_soft == 1 && (fl & 2) != 0 && !water) {
    // forest ground beyond the reach of the tree models: a canopy of sunlit crowns and dark gaps, lit like the real thing
    float cw = smoothstep(u_canopyNear, u_canopyNear * 2.4 + 1.0, dist);
    if (cw > 0.002) {
      vec4 cp = texelFetch(u_palette, ivec2(v_mat, 3), 0);
      float csc = max(cp.g * 255.0 * (1.0 / 32.0), 0.3);
      bool pineC = cp.b > 0.5;
      float warp = vnoise(wpos.xz * 0.0065);
      vec2 cq = (wpos.xz + vec2(warp, warp * 0.7 + 0.3) * 34.0) * (1.0 / (128.0 * csc));
      float isc = 1.0 / (128.0 * csc);
      vec4 c = textureGrad(u_canopy, cq, wgx * isc, wgy * isc);
      float hh = c.r;
      vec3 Nc = vec3(c.g * 2.0 - 1.0, 0.0, c.b * 2.0 - 1.0);
      Nc.y = sqrt(max(1.0 - dot(Nc.xz, Nc.xz), 0.05));
      vec3 lit = pineC ? vec3(0.04, 0.105, 0.05) : mix(vec3(0.078, 0.19, 0.04), vec3(0.15, 0.27, 0.055), c.a);
      vec3 crownCol = lit * (0.78 + 0.44 * fract(c.a * 7.31)) * mix(vec3(1.0), quilt, 0.75);
      vec3 gapCol = albedo * 0.5;
      float crownM = smoothstep(0.03, 0.26, hh);
      albedo = mix(albedo, mix(gapCol, crownCol, crownM), cw);
      vec3 Nn = normalize(vec3(N.x + Nc.x * 1.25, N.y * 0.9 + 0.25, N.z + Nc.z * 1.25));
      N = normalize(mix(N, Nn, cw * crownM));
      canopyAO = mix(1.0, 0.34 + 0.66 * smoothstep(0.0, 0.5, hh), cw);
      rough = mix(rough, 0.9, cw);
    }
  }
#endif

#ifdef EDGES
  if (u_edge > 0.0 && !water) {
    vec3 fr = fract(inside) - 0.5;
    vec2 e = v_face < 2 ? fr.yz : (v_face < 4 ? fr.xz : fr.xy);
    float ed = smoothstep(0.40, 0.5, max(abs(e.x), abs(e.y)));
    float fade = 1.0 - smoothstep(u_cell * 50.0, u_cell * 130.0, dist);
    albedo *= 1.0 - ed * (foliage ? 0.10 : 0.30) * u_edge * fade;
  }
#endif

  vec3 L = u_sunDir;
  float ndl = max(dot(N, L), 0.0);
  float ndv = max(dot(N, V), 1e-3);
  float shadow = 1.0;
#ifdef SHADOWS
  if (ndl > 0.0) shadow = shadowFactor(v_rel, normalize(v_nrm), ndl);
#endif
#ifdef CLOUD_SHADOWS
  shadow *= cloudShadowAt(vec3(wpos.x, v_wy, wpos.z));
#endif
  float ao = mix(1.0, 0.42 + 0.58 * aoV, u_aoStrength) * tcav * canopyAO * roundAO;
  vec3 irr = mix(u_ambGround, u_ambSky, N.y * 0.5 + 0.5);
  vec3 col;

  if (water) {
    vec3 Nw = normalize(v_nrm);
#if WATER_Q >= 1
    Nw = waveNormal(wpos.xz, dist);
#endif
    float cosv = max(dot(Nw, V), 0.0);
    float fr = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
    vec3 refl = skyColor(reflect(-V, Nw));
#ifdef REFL_TEX
    if (abs(v_wy) < 0.6) {
      vec2 suv = gl_FragCoord.xy / u_res;
      suv += Nw.xz * (0.035 / (1.0 + dist * 0.004));
      vec3 rt = textureLod(u_refl, vec2(suv.x, suv.y), 0.0).rgb;
      refl = rt;
    }
#endif
    vec3 base = albedo * (irr * 1.35 + u_sunColor * max(dot(Nw, L), 0.0) * 0.45 * shadow) * 1.25;
    // subsurface glow in shallow tones and simple foam on the shallowest band
    float band = float(v_mat);
    vec3 H = normalize(L + V);
    float spec = D_GGX(max(dot(Nw, H), 0.0), 0.045) * 0.06 * shadow;
    col = mix(base, refl, clamp(fr * 1.05 + 0.035, 0.0, 0.95)) + u_sunColor * spec * (1.0 - u_night);
#if WATER_Q >= 2
    vec2 fp = wpos.xz * 0.55 + vec2(u_time * 0.35, -u_time * 0.2);
    float crest = smoothstep(0.62, 0.86, vnoise(fp) * 0.6 + vnoise(fp * 2.3 + 5.0) * 0.4);
    float shallow = float(albedo.g > 0.32 && albedo.r > 0.09);
    col += vec3(0.9, 0.95, 1.0) * crest * shallow * (irr.g + u_sunColor.g * 0.12 * shadow) * 0.5;
#endif
  } else {
    vec3 diffC = albedo * (1.0 - metal);
    vec3 F0 = mix(vec3(0.04), albedo, metal);
    F0 = mix(F0, vec3(0.09), glassM);
    vec3 H = normalize(L + V);
    float ndh = max(dot(N, H), 0.0), vdh = max(dot(V, H), 0.0);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - vdh, 5.0);
    float a = max(rough * rough, 0.02);
    float D = D_GGX(ndh, a);
    float Vis = V_Smith(ndl, ndv, rough);
    vec3 specDirect = F * (D * Vis * 0.25) * ndl * PI;
    float ndlw = clamp((dot(N, L) + 0.26) / 1.26, 0.0, 1.0);
    vec3 direct = (diffC * ndlw + specDirect * ndl) * u_sunColor * shadow;
    // ambient diffuse + specular from sky
    vec3 R = reflect(-V, N);
    vec3 Fenv = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - ndv, 5.0);
    vec3 envSpec = mix(skyColor(R), irr, rough * rough * 0.9 + 0.1) * Fenv * (1.0 + 1.6 * glassM);
    float specOcc = clamp(ao * ao + 0.2, 0.0, 1.0);
    vec3 ambient = diffC * irr * ao + envSpec * specOcc * (1.0 - rough * 0.5);
    col = direct + ambient;
    if (trans > 0.0) {
      float back = max(dot(-N, L), 0.0) * trans;
      float fwdS = pow(max(dot(-V, L), 0.0), 4.0) * trans * 0.5;
      col += albedo * u_sunColor * (back + fwdS) * 0.55 * shadow;
    }
    if (emitI > 0.0) {
      float on = emitAlways ? 1.0 : clamp(u_night * 1.6, 0.0, 1.0) * (0.45 + 0.55 * vr);
      if ((pat & 128) != 0) {
        // aviation obstruction light: a short flash about every 1.4 s, in step across one rooftop
        float ph = fract(u_time * 0.72 + hash13(uvec3(ivec3(ivec2(floor(wpos.xz / 8.0)), 3))));
        emitI *= 0.05 + 0.95 * smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.13, 0.3, ph));
      }
      col = mix(col, pow(p1.rgb, vec3(2.2)) * emitI, on);
    }
    if (winOn > 0.0) col = mix(col, winL, winOn);
  }

  vec3 vdir = -V;
  col = aerial(col, vdir, dist, u_camY, v_rel.y);

#if defined(POST)
  outColor = vec4(col, 1.0);
  outDist = dist;
  outNormal = vec4(N * 0.5 + 0.5, u_noPost);
#elif defined(HDR1)
  outColor = vec4(col, 1.0);
#else
  col *= u_exposure;
  float lm = luma(col);
  col = mix(col, vec3(lm) * vec3(0.8, 0.96, 1.2), u_night * (1.0 - smoothstep(0.2, 1.4, lm)) * 0.7);
  vec3 x = col;
  col = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  col = mix(vec3(luma(col)), col, 1.2);
  outColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
#endif
}
`;

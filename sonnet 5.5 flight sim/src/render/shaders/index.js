/* GLSL sources. Defines injected by the renderer: INSTANCED, MODEL, SHADOWS, EDGES, MACRO, WATER_Q (0..2), CLOUDS (0..3 layers),
   CLOUD_OCT, DEPTH_ONLY. All positions are camera relative; the vertex format is documented in voxel/mesher.js. */

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArrayShadow;
`;

const POS_CHUNK = `
layout(location=0) in ivec4 a_pos;
layout(location=1) in uvec4 a_col;
#ifdef INSTANCED
layout(location=2) in vec4 a_iPos;
layout(location=3) in float a_iScale;
layout(location=4) in vec4 a_iTint;
#endif
uniform mat4 u_vp;
uniform vec3 u_origin;
uniform float u_cell;
uniform vec3 u_modelOff;
uniform mat3 u_rot;
uniform vec3 u_tint;
const vec3 NRM[6] = vec3[6](vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1));
`;

export const voxVert = HEAD + POS_CHUNK + `
#ifndef DEPTH_ONLY
out vec3 v_col;
out vec3 v_local;
out vec3 v_rel;
out float v_ao;
flat out int v_face;
flat out int v_flags;
flat out vec3 v_nrm;
flat out vec3 v_lnrm;
flat out vec3 v_tintc;
flat out float v_seed;
#endif
void main() {
  vec3 p = vec3(a_pos.xyz);
  int face = a_pos.w;
  vec3 ln = NRM[face];
  vec3 rel;
  vec3 nrm = ln;
  vec3 tint = vec3(1.0);
  float seed = 0.0;
#if defined(INSTANCED)
  vec3 m = (p * u_cell + u_modelOff) * a_iScale;
  float c = cos(a_iPos.w), s = sin(a_iPos.w);
  mat3 R = mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  rel = u_origin + a_iPos.xyz + R * m;
  nrm = R * ln;
  tint = a_iTint.rgb;
  seed = a_iPos.x * 0.173 + a_iPos.z * 0.291;
#elif defined(MODEL)
  vec3 m = p * u_cell + u_modelOff;
  rel = u_origin + u_rot * m;
  nrm = u_rot * ln;
  tint = u_tint;
#else
  rel = u_origin + p * u_cell;
#endif
  gl_Position = u_vp * vec4(rel, 1.0);
#ifndef DEPTH_ONLY
  int fl = int(a_col.a);
  v_col = vec3(a_col.rgb) * (1.0 / 255.0);
  v_local = p;
  v_rel = rel;
  v_ao = float(fl & 3) * (1.0 / 3.0);
  v_face = face;
  v_flags = fl & 252;
  v_nrm = nrm;
  v_lnrm = ln;
  v_tintc = tint;
  v_seed = seed;
#endif
}
`;

export const depthFrag = HEAD + `
out vec4 o;
void main() { o = vec4(1.0); }
`;

const SKY_COMMON = `
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform vec3 u_zenith;
uniform vec3 u_horizon;
uniform vec3 u_fogColor;
uniform vec3 u_fogSun;
uniform float u_night;
vec3 skyColor(vec3 d) {
  float h = d.y;
  vec3 col = mix(u_horizon, u_zenith, pow(clamp(h, 0.0, 1.0), 0.42));
  col = mix(u_fogColor, col, smoothstep(-0.06, 0.02, h));
  float sd = max(dot(d, u_sunDir), 0.0);
  col += u_sunColor * (0.08 * pow(sd, 5.0) + 0.22 * pow(sd, 40.0)) * (1.0 - u_night);
  return col;
}
`;

export const voxFrag = HEAD + SKY_COMMON + `
in vec3 v_col;
in vec3 v_local;
in vec3 v_rel;
in float v_ao;
flat in int v_face;
flat in int v_flags;
flat in vec3 v_nrm;
flat in vec3 v_lnrm;
flat in vec3 v_tintc;
flat in float v_seed;
out vec4 outColor;

uniform vec3 u_ambSky;
uniform vec3 u_ambGround;
uniform float u_fogDensity;
uniform float u_fogHeight;
uniform float u_fogEnd;
uniform float u_camY;
uniform float u_time;
uniform float u_cell;
uniform float u_edge;
uniform ivec3 u_cellOrigin;
uniform vec3 u_worldOrigin;
uniform float u_exposure;
uniform float u_aoStrength;

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
  vec3 wp = rel + N * (u_shadowTexel[ci] * 2.0);
  vec4 sc = u_shadowVP[ci] * vec4(wp, 1.0);
  vec3 p = sc.xyz / sc.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float bias = 0.0006 + 0.0012 * (1.0 - ndl);
  float t = 0.75 / u_shadowSize;
  float s = texture(u_shadowMap, vec4(p.xy + vec2(-t, -t), float(ci), p.z - bias));
  s += texture(u_shadowMap, vec4(p.xy + vec2(t, -t), float(ci), p.z - bias));
  s += texture(u_shadowMap, vec4(p.xy + vec2(-t, t), float(ci), p.z - bias));
  s += texture(u_shadowMap, vec4(p.xy + vec2(t, t), float(ci), p.z - bias));
  float fade = smoothstep(0.85, 1.0, vd / u_cascadeSplit[ci]);
  return mix(s * 0.25, 1.0, fade);
}
#endif

uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float hash13(uvec3 v) { return float(pcg(v.x + pcg(v.y + pcg(v.z)))) * (1.0 / 4294967295.0); }
float hash12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

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
#endif
  g *= exp(-dist * 0.0009);
  return normalize(vec3(-g.x, 1.0, -g.y));
}

void main() {
  int fl = v_flags;
  bool emissive = (fl & 4) != 0;
  bool glossy = (fl & 8) != 0;
  bool water = (fl & 16) != 0;
  bool foliage = (fl & 32) != 0;
  bool flatc = (fl & 64) != 0;
  bool tintf = (fl & 128) != 0;

  vec3 N = normalize(v_nrm);
  vec3 albedo = pow(v_col, vec3(2.2));
  float dist = length(v_rel);
  vec3 V = -v_rel / max(dist, 1e-4);

  vec3 inside = v_local - v_lnrm * 0.5;
  ivec3 vox = ivec3(floor(inside));
  float vr = hash13(uvec3(vox + u_cellOrigin) ^ uvec3(floatBitsToUint(v_seed)));
  if (!flatc && !water) albedo *= 0.92 + 0.16 * vr + (foliage ? 0.10 * (vr - 0.5) : 0.0);
  if (foliage || tintf) albedo *= v_tintc;

#ifdef MACRO
  vec3 wpos = u_worldOrigin + v_local * u_cell;
  if (foliage && v_face == 2) {
    float mv = vnoise(wpos.xz * 0.045) * 0.65 + vnoise(wpos.xz * 0.012) * 0.35;
    albedo *= 0.86 + 0.28 * mv;
  }
#endif

#ifdef EDGES
  if (u_edge > 0.0 && !water) {
    vec3 fr = fract(inside) - 0.5;
    vec2 e = v_face < 2 ? fr.yz : (v_face < 4 ? fr.xz : fr.xy);
    float ed = smoothstep(0.40, 0.5, max(abs(e.x), abs(e.y)));
    float fade = 1.0 - smoothstep(u_cell * 50.0, u_cell * 130.0, dist);
    albedo *= 1.0 - ed * 0.32 * u_edge * fade;
  }
#endif

  vec3 L = u_sunDir;
  float ndl = max(dot(N, L), 0.0);
  float shadow = 1.0;
#ifdef SHADOWS
  if (ndl > 0.0) shadow = shadowFactor(v_rel, N, ndl);
#endif
  float ao = mix(1.0, 0.45 + 0.55 * v_ao, u_aoStrength);
  vec3 amb = mix(u_ambGround, u_ambSky, N.y * 0.5 + 0.5) * ao;
  vec3 col;

  if (water) {
    vec3 Nw = N;
#if WATER_Q >= 1
    vec3 wpw = u_worldOrigin + v_local * u_cell;
    Nw = waveNormal(wpw.xz, dist);
#endif
    float cosv = max(dot(Nw, V), 0.0);
    float fr = 0.03 + 0.97 * pow(1.0 - cosv, 5.0);
    vec3 refl = skyColor(reflect(-V, Nw));
    vec3 base = albedo * (amb * 0.9 + u_sunColor * max(dot(Nw, L), 0.0) * 0.35 * shadow);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(Nw, H), 0.0), 220.0) * shadow;
    col = mix(base, refl, clamp(fr * 1.1, 0.0, 0.92)) + u_sunColor * spec * 2.2 * (1.0 - u_night);
  } else {
    col = albedo * (u_sunColor * ndl * shadow + amb);
    if (glossy) {
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 60.0) * ndl * shadow;
      float fr = 0.04 + 0.5 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
      col = mix(col, skyColor(reflect(-V, N)), fr) + u_sunColor * spec * 0.6;
    }
    if (emissive) {
      float on = clamp(u_night * (0.45 + 0.55 * vr) * 1.6, 0.0, 1.0);
      col = mix(col, albedo * 4.0, on);
    }
  }

  float hAvg = max(u_camY + v_rel.y * 0.5, 0.0);
  float dens = u_fogDensity * exp(-hAvg * u_fogHeight);
  float f = 1.0 - exp(-pow(dist * dens, 1.25));
  f = max(f, smoothstep(u_fogEnd * 0.72, u_fogEnd, dist));
  vec3 vdir = -V;
  vec3 fogc = mix(u_fogColor, u_fogSun, pow(max(dot(vdir, L), 0.0), 5.0) * 0.7 * (1.0 - u_night));
  col = mix(col, fogc, clamp(f, 0.0, 1.0));

  col = aces(col * u_exposure);
  col = pow(col, vec3(1.0 / 2.2));
  outColor = vec4(col, 1.0);
}
`;

export const skyVert = HEAD + `
out vec2 v_ndc;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_ndc = p * 2.0 - 1.0;
  gl_Position = vec4(v_ndc, 1.0, 1.0);
}
`;

export const skyFrag = HEAD + SKY_COMMON + `
in vec2 v_ndc;
out vec4 outColor;
uniform mat4 u_invVP;
uniform vec3 u_cam;
uniform float u_time;
uniform float u_cover;
uniform vec2 u_wind;
uniform float u_exposure;

float hash12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < CLOUD_OCT; i++) { s += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return s;
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec4 wp = u_invVP * vec4(v_ndc, 1.0, 1.0);
  vec3 d = normalize(wp.xyz / wp.w);
  vec3 col = skyColor(d);
  float sd = dot(d, u_sunDir);
  col += u_sunColor * smoothstep(0.99955, 0.99985, sd) * 6.0 * (1.0 - u_night * 0.9);
  if (u_night > 0.01 && d.y > 0.0) {
    vec2 sp = d.xz / (d.y + 0.35) * 90.0;
    float s = step(0.9965, hash12(floor(sp)));
    col += vec3(0.8, 0.85, 1.0) * s * u_night * smoothstep(0.0, 0.2, d.y) * (0.6 + 0.4 * hash12(floor(sp) + 3.0));
  }
#if CLOUDS > 0
  for (int layer = 0; layer < CLOUDS; layer++) {
    float alt = layer == 0 ? 2600.0 : 6400.0;
    float dy = d.y;
    float t = (alt - u_cam.y) / (abs(dy) < 1e-4 ? 1e-4 : dy);
    if (t > 0.0 && t < 90000.0) {
      vec2 p = (u_cam.xz + d.xz * t) * (layer == 0 ? 0.00042 : 0.0003) + u_wind * u_time * (layer == 0 ? 1.0 : 1.7) + float(layer) * 31.0;
      float n = fbm(p);
      float c = smoothstep(u_cover, u_cover + 0.22, n);
      float horizonFade = smoothstep(0.0, 0.10, abs(dy)) * (1.0 - smoothstep(60000.0, 90000.0, t));
      c *= horizonFade * (layer == 0 ? 0.92 : 0.6);
      float lit = clamp(0.55 + 0.6 * u_sunDir.y - 0.5 * n, 0.15, 1.2);
      vec3 cc = mix(u_horizon * 0.55 + vec3(0.06), (u_sunColor * 0.32 + vec3(0.72)) * lit, 0.7) * (1.0 - u_night * 0.85);
      cc = mix(cc, vec3(0.03, 0.035, 0.05), u_night);
      col = mix(col, cc, c);
    }
  }
#endif
  col = aces(col * u_exposure);
  col = pow(col, vec3(1.0 / 2.2));
  outColor = vec4(col, 1.0);
}
`;

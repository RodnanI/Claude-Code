import { HEAD, NOISE } from './chunks.js';

/* Voxel geometry shaders. Vertex: ivec4 (x, y, z, w) with w = face | ao << 3 | material << 5.
   Defines: INSTANCED, MODEL, DEPTH_ONLY, POST (HDR + MRT outputs), SHADOWS, EDGES, MACRO, WATER_Q, REFLECT,
   SKY_LUT, CLOUD_SHADOWS, REFL_TEX, DETAIL. */

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
flat out vec3 v_nrm;
flat out vec3 v_lnrm;
flat out vec3 v_tintc;
flat out float v_seed;
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
#if defined(INSTANCED)
  vec3 m = (p * u_cell + u_modelOff) * a_iScale;
  float fl = texelFetch(u_palette, ivec2(mat, 2), 0).a * 255.0;
  if ((int(fl + 0.5) & 32) != 0) {
    float hgt = max(m.y, 0.0);
    float ph = a_iPos.x * 0.21 + a_iPos.z * 0.17;
    float sway = 0.6 * sin(u_time * 1.3 + ph) + 0.4 * sin(u_time * 2.9 + ph * 1.7);
    float gust = 0.5 + 0.5 * sin(u_time * 0.35 + a_iPos.x * 0.004);
    m.x += sway * hgt * hgt * 0.0036 * (0.5 + gust);
    m.z += sway * hgt * hgt * 0.0016 * (0.5 + gust);
  }
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
  if (((w >> 13) & 1) != 0) nrm = normalize(mix(ln, vec3(0.0, 1.0, 0.0), 0.72));
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
  v_nrm = nrm;
  v_lnrm = ln;
  v_tintc = tint;
  v_seed = seed;
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
flat in vec3 v_nrm;
flat in vec3 v_lnrm;
flat in vec3 v_tintc;
flat in float v_seed;
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
  float s = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 12.0);
    float th = fi * 2.399963 ;
    vec2 o = vec2(cos(th), sin(th)) * r;
    o = vec2(o.x * cs - o.y * sn, o.x * sn + o.y * cs) * rad;
    s += texture(u_shadowMap, vec4(p.xy + o, float(ci), p.z - bias));
  }
  s /= 12.0;
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

void main() {
  vec4 p0 = texelFetch(u_palette, ivec2(v_mat, 0), 0);
  vec4 p1 = texelFetch(u_palette, ivec2(v_mat, 1), 0);
  vec4 p2 = texelFetch(u_palette, ivec2(v_mat, 2), 0);
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
  vec3 albedo = pow(p0.rgb, vec3(2.2));
  float dist = length(v_rel);
  vec3 V = -v_rel / max(dist, 1e-4);

  vec3 inside = v_local - v_lnrm * 0.5;
  ivec3 vox = ivec3(floor(inside));
  uvec3 vh = uvec3(vox + u_cellOrigin) ^ uvec3(floatBitsToUint(v_seed));
  float vr = hash13(vh);
  albedo *= 1.0 + (vr - 0.5) * 2.0 * varAmp;
  if (foliage || tintf) albedo *= v_tintc;
  // real leaves and turf are darker and less saturated than the palette swatches, which read as lime over a whole forest
  if (foliage) albedo = mix(vec3(luma(albedo)), albedo, 0.84) * 0.9;

  vec3 wpos = u_worldOrigin + v_local * u_cell;
#ifdef DETAIL
  float detailFade = 1.0 - smoothstep(30.0, 110.0, dist);
  if (detailFade > 0.0 && varAmp > 0.0 && !water) {
    vec3 sub = floor(inside * 3.0);
    uvec3 sh = uvec3(ivec3(sub) + u_cellOrigin * 3) ^ uvec3(floatBitsToUint(v_seed));
    float g = hash13(sh);
    albedo *= 1.0 + (g - 0.5) * 0.16 * detailFade;
    vec3 jn = vec3(hash13(sh ^ 0x9e3779b9u), hash13(sh ^ 0x7f4a7c15u), hash13(sh ^ 0x85ebca6bu)) - 0.5;
    N = normalize(N + jn * 0.16 * detailFade * (foliage ? 1.5 : 1.0) * (1.0 - metal * 0.6));
  }
#endif

#ifdef MACRO
  if (foliage && v_face == 2) {
    float mv = vnoise(wpos.xz * 0.045) * 0.65 + vnoise(wpos.xz * 0.012) * 0.35;
    albedo *= 0.84 + 0.32 * mv;
    // broad sun-scorched patches so large fields and lawns are not one flat green
    float dry = vnoise(wpos.xz * 0.0065 + 11.0);
    albedo *= mix(vec3(1.0), vec3(1.16, 1.0, 0.7), smoothstep(0.55, 0.8, dry) * 0.6);
  }
#endif

#ifdef EDGES
  if (u_edge > 0.0 && !water) {
    vec3 fr = fract(inside) - 0.5;
    vec2 e = v_face < 2 ? fr.yz : (v_face < 4 ? fr.xz : fr.xy);
    float ed = smoothstep(0.40, 0.5, max(abs(e.x), abs(e.y)));
    float fade = 1.0 - smoothstep(u_cell * 50.0, u_cell * 130.0, dist);
    albedo *= 1.0 - ed * 0.30 * u_edge * fade;
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
  float ao = mix(1.0, 0.42 + 0.58 * v_ao, u_aoStrength);
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
    vec3 envSpec = mix(skyColor(R), irr, rough * rough * 0.9 + 0.1) * Fenv;
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
      col = mix(col, pow(p1.rgb, vec3(2.2)) * emitI, on);
    }
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

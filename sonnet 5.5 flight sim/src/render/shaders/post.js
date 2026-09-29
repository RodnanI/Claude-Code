import { HEAD, NOISE } from './chunks.js';

/* Fullscreen passes: bloom chain, exposure metering, temporal anti-aliasing with camera reprojection,
   SSAO, and the final composite with 3D LUT color grading. */

export const bloomDownFrag = HEAD + NOISE + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_texel;
uniform float u_first;
vec3 T(vec2 uv, vec2 off) { return textureLod(u_src, uv + off * u_texel, 0.0).rgb; }
void main() {
  vec2 uv = v_uv;
  vec3 a = T(uv, vec2(-2, -2)), b = T(uv, vec2(0, -2)), c = T(uv, vec2(2, -2));
  vec3 d = T(uv, vec2(-2, 0)), e = T(uv, vec2(0, 0)), f = T(uv, vec2(2, 0));
  vec3 g = T(uv, vec2(-2, 2)), h = T(uv, vec2(0, 2)), i = T(uv, vec2(2, 2));
  vec3 j = T(uv, vec2(-1, -1)), k = T(uv, vec2(1, -1)), l = T(uv, vec2(-1, 1)), m = T(uv, vec2(1, 1));
  vec3 res;
  if (u_first > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25, g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25, g4 = (j + k + l + m) * 0.25;
    float w0 = 1.0 / (1.0 + luma(g0)), w1 = 1.0 / (1.0 + luma(g1)), w2 = 1.0 / (1.0 + luma(g2)), w3 = 1.0 / (1.0 + luma(g3)), w4 = 1.0 / (1.0 + luma(g4));
    res = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3) * 0.125 + g4 * w4 * 0.5;
    res /= (w0 + w1 + w2 + w3) * 0.125 + w4 * 0.5;
  } else {
    res = (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + e * 0.125 + (j + k + l + m) * 0.125;
  }
  o = vec4(min(res, vec3(60000.0)), 1.0);
}
`;

export const bloomUpFrag = HEAD + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_low;
uniform vec2 u_texel;
uniform float u_weight;
void main() {
  vec2 t = u_texel;
  vec3 s = textureLod(u_low, v_uv + t * vec2(-1, -1), 0.0).rgb + textureLod(u_low, v_uv + t * vec2(1, -1), 0.0).rgb
         + textureLod(u_low, v_uv + t * vec2(-1, 1), 0.0).rgb + textureLod(u_low, v_uv + t * vec2(1, 1), 0.0).rgb;
  vec3 e = textureLod(u_low, v_uv + t * vec2(0, -1), 0.0).rgb + textureLod(u_low, v_uv + t * vec2(0, 1), 0.0).rgb
         + textureLod(u_low, v_uv + t * vec2(-1, 0), 0.0).rgb + textureLod(u_low, v_uv + t * vec2(1, 0), 0.0).rgb;
  vec3 c = textureLod(u_low, v_uv, 0.0).rgb;
  o = vec4((s + e * 2.0 + c * 4.0) * (1.0 / 16.0) * u_weight, 1.0);
}
`;

/** Center-weighted log-average metering with temporal adaptation; also measures sun visibility for lens flare. */
export const exposureFrag = HEAD + NOISE + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform sampler2D u_prev;
uniform sampler2D u_dist;
uniform ivec2 u_size;
uniform float u_dt;
uniform vec4 u_range;   // min exposure, max exposure, key, bias
uniform vec3 u_sun;     // sun uv.xy, on-screen flag
uniform float u_lock;
void main() {
  float sum = 0.0, wsum = 0.0;
  for (int y = 0; y < u_size.y; y++) {
    for (int x = 0; x < u_size.x; x++) {
      vec3 c = texelFetch(u_src, ivec2(x, y), 0).rgb;
      vec2 p = (vec2(float(x), float(y)) + 0.5) / vec2(u_size) - 0.5;
      vec2 q = p - vec2(0.0, -0.12);
      float w = exp(-dot(q, q) * 4.5);
      sum += log(clamp(luma(c), 1e-4, 12.0)) * w;
      wsum += w;
    }
  }
  float avg = exp(sum / wsum);
  float target = clamp(u_range.z * u_range.w / avg, u_range.x, u_range.y);
  vec4 prev = texelFetch(u_prev, ivec2(0), 0);
  float pe = prev.r > 0.0 ? prev.r : target;
  float rate = target > pe ? 1.1 : 2.4;
  float e = exp(mix(log(pe), log(target), (1.0 - exp(-rate * u_dt)) * (1.0 - u_lock)));
  float vis = 0.0;
  if (u_sun.z > 0.5) {
    for (int i = 0; i < 9; i++) {
      vec2 off = vec2(float(i % 3) - 1.0, float(i / 3) - 1.0) * 0.012;
      vec2 uv = u_sun.xy + off;
      if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) vis += texture(u_dist, uv).r > 90000.0 ? 1.0 : 0.0;
    }
    vis /= 9.0;
  }
  float pv = prev.g;
  o = vec4(e, mix(pv, vis, 0.25), 0.0, 1.0);
}
`;

export const taaFrag = HEAD + NOISE + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_cur;
uniform sampler2D u_hist;
uniform sampler2D u_dist;
uniform sampler2D u_normal;
uniform sampler2D u_cloud;
uniform sampler2D u_ao;
uniform mat4 u_invVP;
uniform mat4 u_prevVP;
uniform vec3 u_camDelta;
uniform vec2 u_res;
uniform float u_blend;
uniform float u_useHist;
uniform float u_aoStrength;
uniform vec4 u_sunAO; // sun elevation weight

const vec2 OFFS[8] = vec2[8](vec2(-1,-1), vec2(0,-1), vec2(1,-1), vec2(-1,0), vec2(1,0), vec2(-1,1), vec2(0,1), vec2(1,1));
vec3 toY(vec3 c) { return vec3(dot(c, vec3(0.25, 0.5, 0.25)), dot(c, vec3(0.5, 0.0, -0.5)), dot(c, vec3(-0.25, 0.5, -0.25))); }
vec3 fromY(vec3 y) { return vec3(y.x + y.y - y.z, y.x + y.z, y.x - y.y - y.z); }
vec3 tmap(vec3 c) { return c / (1.0 + luma(c)); }
vec3 itmap(vec3 c) { return c / max(1.0 - luma(c), 1e-3); }

vec3 fetchCur(vec2 uv) {
  vec3 c = textureLod(u_cur, uv, 0.0).rgb;
#ifdef CLOUDS
  vec4 cl = textureLod(u_cloud, uv, 0.0);
  c = c * cl.a + cl.rgb;
#endif
#ifdef SSAO
  float ao = textureLod(u_ao, uv, 0.0).r;
  c *= mix(1.0, ao, u_aoStrength);
#endif
  return c;
}

void main() {
  vec2 uv = v_uv;
  vec2 px = 1.0 / u_res;
  vec3 cur = fetchCur(uv);
#ifdef TAA
  float d = textureLod(u_dist, uv, 0.0).r;
  vec4 nrm = textureLod(u_normal, uv, 0.0);
  vec4 wp = u_invVP * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(wp.xyz / wp.w);
  vec3 rel = dir * min(d, 2.0e5);
  vec3 relPrev = rel + u_camDelta;
  vec4 pc = u_prevVP * vec4(relPrev, 1.0);
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  if (nrm.a > 0.5) puv = uv;
  bool valid = pc.w > 0.0 && puv.x > 0.0 && puv.x < 1.0 && puv.y > 0.0 && puv.y < 1.0 && u_useHist > 0.5;
  vec3 mn = vec3(1e9), mx = vec3(-1e9);
  vec3 cy = toY(tmap(cur));
  mn = cy; mx = cy;
  for (int i = 0; i < 8; i++) {
    vec2 off = OFFS[i];
    vec3 n = toY(tmap(fetchCur(uv + off * px)));
    mn = min(mn, n); mx = max(mx, n);
  }
  vec3 res = cur;
  if (valid) {
    vec3 h = textureLod(u_hist, puv, 0.0).rgb;
    vec3 hy = toY(tmap(h));
    vec3 c = (mn + mx) * 0.5, e = (mx - mn) * 0.5 + 1e-4;
    vec3 v = hy - c;
    vec3 a = abs(v / e);
    float m = max(a.x, max(a.y, a.z));
    if (m > 1.0) hy = c + v / m;
    float vel = length((puv - uv) * u_res);
    float w = clamp(u_blend - vel * 0.012, 0.35, u_blend);
    res = itmap(fromY(mix(cy, hy, w)));
  }
  o = vec4(max(res, vec3(0.0)), 1.0);
#else
  o = vec4(cur, 1.0);
#endif
}
`;

export const ssaoFrag = HEAD + NOISE + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_dist;
uniform sampler2D u_normal;
uniform mat4 u_invVP;
uniform mat4 u_vp;
uniform vec2 u_res;
uniform float u_frame;
uniform float u_radius;
void main() {
  float d = textureLod(u_dist, v_uv, 0.0).r;
  if (d > 90000.0) { o = vec4(1.0); return; }
  vec3 n = normalize(textureLod(u_normal, v_uv, 0.0).rgb * 2.0 - 1.0);
  vec4 wp = u_invVP * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(wp.xyz / wp.w);
  vec3 P = dir * d;
  float R = clamp(d * 0.018, 0.45, 5.0) * u_radius;
  float ang = ign(gl_FragCoord.xy + u_frame * 7.13) * 6.2831853;
  vec3 t = normalize(abs(n.y) < 0.9 ? cross(n, vec3(0, 1, 0)) : cross(n, vec3(1, 0, 0)));
  vec3 b = cross(n, t);
  float occ = 0.0;
  const int N = 12;
  for (int i = 0; i < N; i++) {
    float fi = (float(i) + 0.5) / float(N);
    float a = ang + fi * 6.2831853 * 3.0;
    float r = sqrt(fi);
    vec3 h = t * cos(a) * r + b * sin(a) * r + n * sqrt(max(0.0, 1.0 - r * r));
    vec3 Q = P + h * R * (0.25 + 0.75 * fi);
    vec4 c = u_vp * vec4(Q, 1.0);
    if (c.w <= 0.0) continue;
    vec2 suv = c.xy / c.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
    float sd = textureLod(u_dist, suv, 0.0).r;
    float qd = length(Q);
    float diff = qd - sd;
    if (diff > 0.03 * R && diff < R * 1.6) occ += 1.0 - smoothstep(R * 0.6, R * 1.6, diff);
  }
  float ao = 1.0 - occ / float(N) * 1.25;
  o = vec4(clamp(ao, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

export const ssaoBlurFrag = HEAD + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_ao;
uniform sampler2D u_dist;
uniform vec2 u_dir;
void main() {
  float cd = textureLod(u_dist, v_uv, 0.0).r;
  float sum = 0.0, ws = 0.0;
  for (int i = -3; i <= 3; i++) {
    vec2 uv = v_uv + u_dir * float(i);
    float sd = textureLod(u_dist, uv, 0.0).r;
    float w = exp(-abs(float(i)) * 0.35) * exp(-abs(sd - cd) / (0.06 * cd + 0.05));
    sum += textureLod(u_ao, uv, 0.0).r * w;
    ws += w;
  }
  o = vec4(sum / ws, 0.0, 0.0, 1.0);
}
`;

export const compositeFrag = HEAD + NOISE + `
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform sampler2D u_exp;
uniform sampler2D u_dist;
uniform sampler3D u_lut;
uniform vec2 u_res;
uniform float u_time;
uniform vec4 u_fx;      // vignette, grain, chromatic aberration, bloom strength
uniform vec4 u_fx2;     // sharpen, flare strength, godray strength, lut size
uniform vec3 u_sun;     // sun uv.xy, on-screen flag
uniform vec3 u_sunColor;
uniform float u_night;
uniform float u_expManual;
uniform sampler2D u_normal;
uniform mat4 u_invVP;
uniform mat4 u_prevVP;
uniform vec3 u_camDelta;
uniform float u_moblur;

vec3 fxaa(vec2 uv) {
  vec2 px = 1.0 / u_res;
  vec3 m = textureLod(u_scene, uv, 0.0).rgb;
  vec3 nw = textureLod(u_scene, uv + vec2(-1, -1) * px, 0.0).rgb, ne = textureLod(u_scene, uv + vec2(1, -1) * px, 0.0).rgb;
  vec3 sw = textureLod(u_scene, uv + vec2(-1, 1) * px, 0.0).rgb, se = textureLod(u_scene, uv + vec2(1, 1) * px, 0.0).rgb;
  float lm = luma(m / (1.0 + luma(m))), lnw = luma(nw / (1.0 + luma(nw))), lne = luma(ne / (1.0 + luma(ne)));
  float lsw = luma(sw / (1.0 + luma(sw))), lse = luma(se / (1.0 + luma(se)));
  float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));
  vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), ((lnw + lsw) - (lne + lse)));
  float dr = max((lnw + lne + lsw + lse) * 0.25 * 0.125, 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + dr);
  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * px;
  vec3 a = 0.5 * (textureLod(u_scene, uv + dir * (1.0 / 3.0 - 0.5), 0.0).rgb + textureLod(u_scene, uv + dir * (2.0 / 3.0 - 0.5), 0.0).rgb);
  vec3 b = a * 0.5 + 0.25 * (textureLod(u_scene, uv + dir * -0.5, 0.0).rgb + textureLod(u_scene, uv + dir * 0.5, 0.0).rgb);
  float lb = luma(b / (1.0 + luma(b)));
  return (lb < lmin || lb > lmax) ? a : b;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 dc = uv - 0.5;
  vec3 ex = texelFetch(u_exp, ivec2(0), 0).rgb;
  float exposure = u_expManual > 0.0 ? u_expManual : ex.r;
  float sunVis = ex.g;

  vec3 col;
#ifdef CHROMA
  float r2 = dot(dc * vec2(aspect, 1.0), dc * vec2(aspect, 1.0));
  vec2 off = dc * r2 * u_fx.z * 0.03;
  col = vec3(textureLod(u_scene, uv - off, 0.0).r, textureLod(u_scene, uv, 0.0).g, textureLod(u_scene, uv + off, 0.0).b);
#elif defined(FXAA)
  col = fxaa(uv);
#else
  col = textureLod(u_scene, uv, 0.0).rgb;
#endif
#ifdef MOBLUR
  if (u_moblur > 0.0) {
    float d = textureLod(u_dist, uv, 0.0).r;
    vec4 nrm = textureLod(u_normal, uv, 0.0);
    if (nrm.a < 0.5) {
      vec4 wp = u_invVP * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
      vec3 rel = normalize(wp.xyz / wp.w) * min(d, 2.0e5);
      vec4 pc = u_prevVP * vec4(rel + u_camDelta, 1.0);
      vec2 vel = (uv - (pc.xy / pc.w * 0.5 + 0.5)) * u_moblur;
      float vl = length(vel * u_res);
      if (pc.w > 0.0 && vl > 1.5) {
        vel *= min(1.0, 28.0 / vl);
        vec3 acc = col;
        float ws = 1.0;
        for (int i = 1; i < 8; i++) {
          float t = float(i) / 8.0 - 0.5;
          vec2 suv = uv + vel * t;
          float w = 1.0 - abs(t) * 0.8;
          acc += textureLod(u_scene, suv, 0.0).rgb * w;
          ws += w;
        }
        col = acc / ws;
      }
    }
  }
#endif
#ifdef SHARPEN
  {
    vec2 px = 1.0 / u_res;
    vec3 n = textureLod(u_scene, uv + vec2(0, -px.y), 0.0).rgb + textureLod(u_scene, uv + vec2(0, px.y), 0.0).rgb
           + textureLod(u_scene, uv + vec2(-px.x, 0), 0.0).rgb + textureLod(u_scene, uv + vec2(px.x, 0), 0.0).rgb;
    vec3 sharp = col * 5.0 - n;
    vec3 lo = min(col, n * 0.25), hi = max(col, n * 0.25);
    col = clamp(mix(col, sharp, u_fx2.x), lo * 0.6, hi * 1.5 + 0.001);
  }
#endif
#ifdef BLOOM
  col += textureLod(u_bloom, uv, 0.0).rgb * u_fx.w;
#endif

  // sun lens flare and glare, gated by measured sun visibility
  if (u_sun.z > 0.5 && u_fx2.y > 0.0 && sunVis > 0.01) {
    vec2 sd = (u_sun.xy - 0.5);
    vec2 pc = dc * vec2(aspect, 1.0);
    vec3 fl = vec3(0.0);
    float edgeFade = 1.0 - smoothstep(0.35, 0.95, length(sd * vec2(aspect, 1.0)) * 1.4);
    for (int i = 0; i < 5; i++) {
      float k = float(i) * 0.42 + 0.35;
      vec2 gp = (-sd * k) * vec2(aspect, 1.0);
      float sz = 0.028 + float(i) * 0.014;
      float g = smoothstep(sz, sz * 0.25, length(pc - gp));
      vec3 tint = i == 0 ? vec3(1.0, 0.75, 0.45) : i == 1 ? vec3(0.55, 0.9, 0.7) : i == 2 ? vec3(1.0, 0.55, 0.35) : i == 3 ? vec3(0.9, 0.85, 0.6) : vec3(0.7, 0.8, 1.0);
      fl += tint * g * (0.06 - float(i) * 0.009);
    }
    float halo = smoothstep(0.012, 0.0, abs(length(pc - (-sd * vec2(aspect, 1.0)) * 0.9) - 0.30)) * 0.012;
    float glare = exp(-length((dc - sd) * vec2(aspect, 1.0)) * 6.5) * 0.22 + exp(-abs(dc.y - sd.y) * 26.0) * exp(-abs(dc.x - sd.x) * 2.2) * 0.12;
    vec3 sc = normalize(u_sunColor + 1e-3) * 1.6;
    col += (fl * edgeFade + sc * glare + sc * halo) * sunVis * u_fx2.y * 9.0 * (1.0 - u_night);
  }
#ifdef GODRAYS
  if (u_sun.z > 0.5 && u_fx2.z > 0.0) {
    vec2 toSun = u_sun.xy - uv;
    float dist = length(toSun);
    vec2 step = toSun / 24.0 * min(1.0, 0.65 / max(dist, 1e-3)) ;
    vec2 p = uv;
    float shafts = 0.0, decay = 1.0;
    for (int i = 0; i < 24; i++) {
      p += step;
      float sky = textureLod(u_dist, p, 0.0).r > 90000.0 ? 1.0 : 0.0;
      if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) sky = 0.5;
      shafts += sky * decay;
      decay *= 0.94;
    }
    shafts /= 24.0;
    float facing = smoothstep(1.4, 0.0, dist * 1.2);
    col += u_sunColor * shafts * facing * u_fx2.z * 0.05 * (1.0 - u_night) * sunVis;
  }
#endif

  col *= exposure;
  // scotopic shift: dim scenes lose saturation and lean blue at night, bright lights keep their color
  float lm = luma(col);
  col = mix(col, vec3(lm) * vec3(0.8, 0.96, 1.2), u_night * (1.0 - smoothstep(0.2, 1.4, lm)) * 0.7);
  float vig = 1.0 - u_fx.x * smoothstep(0.30, 1.15, length(dc * vec2(aspect * 0.85, 1.0)) * 1.6);
  col *= vig;

  vec3 lc = clamp((log2(max(col, vec3(1e-5))) + 10.0) / 16.0, 0.0, 1.0);
  float ls = u_fx2.w;
  vec3 graded = textureLod(u_lut, lc * ((ls - 1.0) / ls) + 0.5 / ls, 0.0).rgb;

#ifdef GRAIN
  float g = hash12(uv * u_res + fract(u_time) * 91.7) + hash12(uv * u_res * 1.7 - fract(u_time) * 33.1) - 1.0;
  float lg = luma(graded);
  graded += g * u_fx.y * 0.06 * (0.35 + 0.65 * (1.0 - abs(lg * 2.0 - 1.0)));
#endif
  graded += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(clamp(graded, 0.0, 1.0), 1.0);
}
`;

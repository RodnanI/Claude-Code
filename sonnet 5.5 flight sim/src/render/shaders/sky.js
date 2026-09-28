import { HEAD, NOISE, ATMOS } from './chunks.js';

export const fullscreenVert = HEAD + `
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 1.0, 1.0);
}
`;

/** Renders the sky-view LUT: radiance for every direction around the camera (azimuth relative to the sun, warped elevation). */
export const skyLutFrag = HEAD + NOISE + ATMOS + `
in vec2 v_uv;
out vec4 o;
uniform float u_alt;
uniform vec3 u_atmSun;
uniform float u_sunI;
uniform float u_sunAz;
void main() {
  float s = 2.0 * (v_uv.y - 0.5);
  float l = sign(s) * s * s * 1.5707963;
  float phi = v_uv.x * PI;
  float ang = u_sunAz + phi;
  vec3 rd = vec3(cos(ang) * cos(l), sin(l), sin(ang) * cos(l));
  o = vec4(skyRadiance(rd, u_atmSun, u_alt, u_sunI), 1.0);
}
`;

/** Sky background. Also writes the distance and normal attachments so post effects can tell sky from geometry. */
export const skyFrag = HEAD + NOISE + `
in vec2 v_uv;
#if defined(POST)
layout(location=0) out vec4 outColor;
layout(location=1) out float outDist;
layout(location=2) out vec4 outNormal;
#else
out vec4 outColor;
#endif
uniform mat4 u_invVP;
uniform vec3 u_cam;
uniform float u_time;
uniform vec3 u_sunDir;
uniform vec3 u_atmSun;
uniform vec3 u_sunColor;
uniform vec3 u_zenith;
uniform vec3 u_horizon;
uniform vec3 u_fogColor;
uniform float u_night;
uniform float u_exposure;
uniform float u_cover;
uniform vec2 u_wind;
#ifdef SKY_LUT
uniform sampler2D u_skyLut;
uniform float u_sunAz;
vec3 skyBase(vec3 d) {
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
#else
vec3 skyBase(vec3 d) {
  float h = d.y;
  vec3 col = mix(u_horizon, u_zenith, pow(clamp(h, 0.0, 1.0), 0.42));
  col = mix(u_fogColor, col, smoothstep(-0.06, 0.02, h));
  float sd = max(dot(d, u_sunDir), 0.0);
  col += u_sunColor * (0.02 * pow(sd, 5.0) + 0.05 * pow(sd, 40.0)) * (1.0 - u_night);
  return col;
}
#endif
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < CLOUD_OCT; i++) { s += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return s;
}
void main() {
  vec4 wp = u_invVP * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = normalize(wp.xyz / wp.w);
#ifdef REFLECT
  d.y = -d.y;
#endif
  vec3 col = skyBase(d);
  // sun
  float sd = dot(d, u_atmSun);
  float disc = smoothstep(0.9999865, 0.9999892, sd);
  if (u_atmSun.y > -0.06) col += u_sunColor * disc * 260.0 * smoothstep(-0.06, 0.02, u_atmSun.y) * step(-0.02, d.y + 0.02);
  // moon opposite the sun
  vec3 md = -u_atmSun;
  float mdot = dot(d, md);
  if (md.y > -0.05 && mdot > 0.99985) {
    vec3 up = abs(md.y) > 0.95 ? vec3(1, 0, 0) : vec3(0, 1, 0);
    vec3 rx = normalize(cross(up, md)), ry = cross(md, rx);
    vec2 mp = vec2(dot(d - md, rx), dot(d - md, ry)) / 0.0105;
    float m = smoothstep(1.0, 0.94, length(mp));
    float crater = 0.72 + 0.28 * vnoise(mp * 6.0 + 3.0);
    col += vec3(0.95, 0.97, 1.05) * m * crater * 5.0 * smoothstep(0.0, 0.25, u_night);
  }
  if (u_night > 0.01 && d.y > -0.02) {
    vec2 sp = d.xz / (abs(d.y) + 0.30) * 110.0;
    float st = step(0.9968, hash12(floor(sp)));
    float tw = 0.6 + 0.4 * sin(u_time * 2.0 + hash12(floor(sp)) * 40.0);
    col += vec3(0.85, 0.9, 1.0) * st * u_night * smoothstep(0.0, 0.2, d.y + 0.02) * tw * 2.4;
  }
#if CLOUDS > 0
  for (int layer = CLOUD_FIRST; layer < CLOUDS; layer++) {
    float alt = layer == 0 ? 2600.0 : 7200.0;
    float dy = d.y;
    float t = (alt - u_cam.y) / (abs(dy) < 1e-4 ? 1e-4 : dy);
    if (t > 0.0 && t < 90000.0) {
      vec2 p = (u_cam.xz + d.xz * t) * (layer == 0 ? 0.00042 : 0.0003) + u_wind * u_time * (layer == 0 ? 1.0 : 1.7) + float(layer) * 31.0;
      float n = fbm(p);
      float c = smoothstep(u_cover, u_cover + 0.22, n);
      float hf = smoothstep(0.0, 0.10, abs(dy)) * (1.0 - smoothstep(60000.0, 90000.0, t));
      c *= hf * (layer == 0 ? 0.92 : 0.55);
      float lit = clamp(0.5 + 0.7 * u_sunDir.y - 0.5 * n, 0.12, 1.3);
      vec3 cc = (u_sunColor * 0.16 + vec3(0.5, 0.52, 0.56)) * lit * (1.0 - u_night * 0.9) + vec3(0.02, 0.025, 0.035) * u_night;
      col = mix(col, cc, c);
    }
  }
#endif
#if defined(POST)
  outColor = vec4(col, 1.0);
  outDist = 1.0e6;
  outNormal = vec4(0.5, 1.0, 0.5, 0.0);
#elif defined(HDR1)
  outColor = vec4(col, 1.0);
#else
  col *= u_exposure;
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
  col = mix(vec3(luma(col)), col, 1.2);
  outColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
#endif
}
`;

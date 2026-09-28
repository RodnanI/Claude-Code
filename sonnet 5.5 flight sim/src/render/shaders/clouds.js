import { HEAD, NOISE } from './chunks.js';

/** Volumetric cloud raymarch at reduced resolution. Output: rgb = in-scattered radiance (premultiplied), a = transmittance.
    Uses the scene distance so terrain and geometry correctly occlude and are occluded by clouds. */
export const cloudFrag = HEAD + NOISE + `
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_dist;
uniform sampler3D u_noise;
uniform sampler2D u_skyLut;
uniform mat4 u_invVP;
uniform vec3 u_cam;
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform vec3 u_ambSky;
uniform vec3 u_fogColor;
uniform float u_time;
uniform vec4 u_cloud;   // x cover, y base altitude, z thickness, w density
uniform vec2 u_wind;
uniform float u_frame;
uniform float u_night;

float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

float weather(vec2 xz) {
  vec2 q = xz * 0.00011 + u_wind * u_time * 0.6;
  return vnoise(q) * 0.55 + vnoise(q * 2.1 + 11.0) * 0.3 + vnoise(q * 4.3 + 23.0) * 0.15;
}

float density(vec3 p, out float h, bool coarse) {
  h = (p.y - u_cloud.y) / u_cloud.z;
  if (h < 0.0 || h > 1.0) return 0.0;
  float w = weather(p.xz);
  float cov = clamp((w - (1.0 - u_cloud.x)) * 3.2, 0.0, 1.0);
  if (cov <= 0.0) return 0.0;
  float hg0 = smoothstep(0.0, 0.14, h) * (1.0 - smoothstep(0.52, 1.0, h * (1.0 + (1.0 - cov) * 0.6)));
  vec3 q = p * 0.00034 + vec3(u_wind.x, 0.0, u_wind.y) * u_time * 1.5;
  vec4 nz = textureLod(u_noise, q, 0.0);
  float shape = nz.r * 0.62 + nz.g * 0.24 + nz.b * 0.14;
  float d = shape * hg0 * cov;
  d = max(0.0, d - 0.30) * 2.4;
  if (!coarse && d > 0.0) {
    vec4 dn = textureLod(u_noise, p * 0.0021 + vec3(0.0, u_time * 0.004, 0.0), 0.0);
    d = max(0.0, d - (dn.b * 0.5 + dn.a * 0.5) * 0.22 * (0.4 + h));
  }
  return d * u_cloud.w;
}

void main() {
  vec4 wp = u_invVP * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(wp.xyz / wp.w);
  float sceneD = textureLod(u_dist, v_uv, 0.0).r;
  float base = u_cloud.y, top = u_cloud.y + u_cloud.z;
  float t0, t1;
  float dy = abs(rd.y) < 1e-4 ? 1e-4 : rd.y;
  float ta = (base - u_cam.y) / dy, tb = (top - u_cam.y) / dy;
  t0 = min(ta, tb); t1 = max(ta, tb);
  if (u_cam.y > base && u_cam.y < top) { t0 = 0.0; t1 = rd.y > 0.0 ? tb : ta; if (t1 < 0.0) t1 = 20000.0; }
  t0 = max(t0, 0.0);
  float tmax = min(min(t1, t0 + 26000.0), sceneD);
  if (t1 <= 0.0 || tmax <= t0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  const int STEPS = CLOUD_STEPS;
  float len = tmax - t0;
  float dt = len / float(STEPS);
  float jitter = ign(gl_FragCoord.xy + vec2(u_frame * 5.588, u_frame * 3.17));
  float t = t0 + dt * jitter;
  float T = 1.0;
  vec3 L = vec3(0.0);
  float mu = dot(rd, u_sunDir);
  float phase = mix(hg(mu, 0.72), hg(mu, -0.25), 0.32);
  vec3 sunC = u_sunColor;
  float depthSum = 0.0, wSum = 0.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = u_cam + rd * t;
    float h;
    float dens = density(p, h, false);
    if (dens > 0.001) {
      // light march toward the sun
      float od = 0.0;
      float ls = 90.0;
      for (int j = 1; j <= 4; j++) {
        float hh;
        od += density(p + u_sunDir * (ls * float(j)), hh, true) * ls;
        ls *= 1.6;
      }
      float sunT = exp(-od * 0.019);
      float powder = 1.0 - exp(-dens * dt * 0.09 * 2.0);
      vec3 sunL = sunC * (sunT * phase * mix(1.0, 2.0 * powder, 0.55)) * 8.0;
      vec3 amb = u_ambSky * (0.55 + 0.75 * h) * 2.4;
      vec3 S = sunL + amb;
      float ext = dens * dt * 0.024;
      float stepT = exp(-ext);
      L += T * (S - S * stepT);
      depthSum += t * T * (1.0 - stepT); wSum += T * (1.0 - stepT);
      T *= stepT;
      if (T < 0.02) break;
    }
    t += dt;
  }
  float cd = wSum > 0.0 ? depthSum / wSum : tmax;
  // aerial perspective toward the horizon color
  vec3 haze = mix(u_fogColor, u_fogColor * 0.9 + sunC * 0.03, 0.3);
  float f = 1.0 - exp(-cd / 42000.0);
  L = mix(L, haze * (1.0 - T), f * 0.85);
  o = vec4(L, T);
}
`;

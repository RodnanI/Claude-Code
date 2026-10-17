// Engine test scene: lit spheres over a checker floor, used to check glyph
// matching, edge rendering and tone reproduction. Not part of the wallpaper.
ASCII.registerScene({
  id: 'test',
  hidden: true,
  name: 'Engine test',
  loop: 20,
  bg: '#0b0b0c',
  palettes: [{ name: 'default', colors: { uKey: '#ffd9a0', uFill: '#5f8f9f' } }],
  glsl: `
float map(vec3 p){
  float d = p.y + 1.0;
  for (int i = 0; i < 5; i++) {
    float a = float(i) * 1.2566 + uPhase * TAU;
    d = min(d, sdSphere(p - vec3(cos(a) * 1.6, -0.3 + 0.25 * sin(a * 2.0), 4.0 + sin(a) * 1.6), 0.55));
  }
  d = min(d, sdTorus((p - vec3(0.0, 0.2, 4.0)).yzx, vec2(0.8, 0.12)));
  return d;
}
vec3 nrm(vec3 p){ vec2 e = vec2(0.001, 0.0); return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx))); }
vec3 sceneColor(vec2 p, out float mat, out float depth){
  vec3 ro = vec3(0.0, 0.6, 0.0), rd = normalize(vec3(p, 1.6));
  rd.yz = rot(-0.18) * rd.yz;
  float t = 0.0;
  for (int i = 0; i < 120; i++) { float h = map(ro + rd * t); if (h < 0.001 || t > 30.0) break; t += h; }
  depth = sat(t / 30.0);
  if (t > 30.0) { mat = 0.0; return vec3(0.02, 0.025, 0.03) * (1.0 + p.y); }
  vec3 pos = ro + rd * t, n = nrm(pos);
  vec3 l = normalize(vec3(-0.6, 0.8, -0.3));
  float dif = max(dot(n, l), 0.0);
  float sh = 1.0; float st = 0.02;
  for (int i = 0; i < 40; i++) { float h = map(pos + l * st); sh = min(sh, 12.0 * h / st); st += clamp(h, 0.02, 0.3); if (sh < 0.01 || st > 8.0) break; }
  vec3 c = uKey * dif * sat(sh) * 1.4 + uFill * (0.5 + 0.5 * n.y) * 0.25;
  if (pos.y < -0.99) { float ck = mod(floor(pos.x * 2.0) + floor(pos.z * 2.0), 2.0); c *= 0.5 + 0.5 * ck; mat = 1.0; }
  float spec = pow(max(dot(reflect(rd, n), l), 0.0), 40.0);
  c += spec * 2.0;
  c *= exp(-0.04 * t);
  return c;
}`,
});

// wndo :: Pine Wind. A birch clearing and dark pines from a cabin window, on a gusty afternoon.
(() => {
  const W = window.W;

  const BG = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform float uSun, uGust, uWind, uRain, uFog, uFlash;
uniform vec3 uSunDir;
out vec4 o;
vec3 sky(vec3 rd){
  float h = max(rd.y, 0.0);
  vec3 base = mix(vec3(0.66, 0.67, 0.68), vec3(0.4, 0.45, 0.52), pow(h, 0.55));
  vec2 cp = rd.xz / (h + 0.08) * 0.55 + vec2(uTime * 0.018 * (0.4 + uWind), uTime * 0.004);
  float n = fbm(cp);
  float n2 = fbm(cp * 2.3 + 4.0);
  base *= 0.72 + 0.5 * n + 0.12 * n2;
  float mu = max(dot(rd, uSunDir), 0.0);
  float gap = smoothstep(0.42, 0.7, n);
  base += vec3(1.0, 0.86, 0.62) * uSun * (pow(mu, 10.0) * 0.5 + pow(mu, 300.0) * 6.0 * gap);
  base *= 1.0 - uRain * 0.35;
  return base * 1.35 + uFlash * 0.4;
}
float treeline(float x, float seed, float hgt){
  float cell = 4.6;
  float i = floor(x / cell), f = fract(x / cell) - 0.5;
  float h = 0.0;
  for (int k = -1; k <= 1; k++) {
    float id = i + float(k);
    vec2 r = hash22(vec2(id, seed));
    float th = hgt * (0.55 + 0.7 * r.x);
    float dx = abs(f - float(k) - (r.y - 0.5) * 0.6) * cell;
    float jag = (vnoise(vec2(x * 2.1, seed + id)) - 0.5) * th * 0.12 * step(0.2, dx);
    h = max(h, th * (1.0 - dx / (th * 0.24)) + jag);
  }
  return h;
}
void main(){
  vec3 ro = uCamPos, rd = camRay(gl_FragCoord.xy);
  float rxz = length(rd.xz);
  float az = atan(rd.x, rd.z);
  vec3 amb = vec3(0.3, 0.32, 0.35) * (1.0 - uRain * 0.3) + uFlash * 0.3;
  vec3 sunC = vec3(1.0, 0.86, 0.66) * uSun * 1.4;
  vec3 fogC = vec3(0.5, 0.53, 0.56) * (1.0 - uRain * 0.3);
  float fogD = 0.003 + uFog * 0.008 + uRain * 0.006;
  vec3 col = sky(rd);
  float dist = 9000.0;
  float tg = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  float hd = tg * rxz;
  // three walls of misty conifers at 110, 210, 380 m
  float D[3]; D[0] = 110.0; D[1] = 210.0; D[2] = 380.0;
  for (int i = 0; i < 3; i++) {
    if (hd < D[i]) break;
    float y = ro.y + D[i] * rd.y / rxz;
    float th = treeline(az * D[i], float(i) * 7.3, 18.0 + float(i) * 8.0) + vnoise(vec2(az * 6.0, float(i))) * 14.0;
    if (y < th) {
      float dd = D[i] / rxz;
      vec3 tc = vec3(0.05, 0.075, 0.06) * (amb + sunC * 0.4) * (0.75 + 0.5 * vnoise(vec2(az * D[i] * 1.5, y * 0.8)));
      col = mix(tc, fogC, 1.0 - exp(-dd * fogD * (1.0 + float(i) * 0.3)));
      dist = dd;
      break;
    }
  }
  if (rd.y < 0.0 && hd < D[0]) {
    vec3 p = ro + rd * tg;
    float edge = smoothstep(32.0, 48.0, p.z + vnoise(p.xz * 0.05) * 14.0);
    vec3 g1 = vec3(0.13, 0.2, 0.05), g2 = vec3(0.28, 0.27, 0.08);
    vec3 alb = mix(g1, g2, vnoise(p.xz * 0.15)) * (0.75 + 0.5 * vnoise(p.xz * 1.3));
    alb = mix(alb, vec3(0.07, 0.07, 0.04), edge);
    // the wind running through the grass as moving bands of light
    float wave = sin(p.x * 0.22 + p.z * 0.35 - uTime * (1.6 + uWind * 2.6) + vnoise(p.xz * 0.08) * 4.0);
    float wv = smoothstep(0.3, 1.0, wave) * (0.15 + uGust * 0.6) * (1.0 - edge);
    alb *= 1.0 + wv * 0.55;
    float cloudSh = 0.55 + 0.45 * smoothstep(0.35, 0.7, fbm(p.xz * 0.01 + vec2(uTime * 0.03, 0.0)));
    col = alb * (amb + sunC * cloudSh * (1.0 - edge * 0.8)) * (1.0 - uRain * 0.25);
    col = mix(col, fogC, 1.0 - exp(-tg * fogD));
    dist = tg;
  }
  o = vec4(col, dist);
}
`;

  // leaves and rain blowing past, a few metres from the glass
  const FG = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform float uGust, uWind, uRain, uSun, uLeaves;
uniform sampler2D uDepth;
uniform vec2 uSunUV;
out vec4 o;
void main(){
  vec3 rd = camRay(gl_FragCoord.xy);
  vec3 shafts = vec3(0.0);
  if (uSun > 0.02) {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 stp = (uSunUV - uv) / 20.0;
    float acc = 0.0, w = 1.0;
    vec2 q = uv + stp * hash12(gl_FragCoord.xy + fract(uTime) * 61.0);
    for (int i = 0; i < 20; i++) {
      vec4 s = texture(uDepth, q);
      acc += step(5000.0, s.a) * w;
      w *= 0.93;
      q += stp;
    }
    float fall = exp(-length((uv - uSunUV) * vec2(uRes.x / uRes.y, 1.0)) * 1.6);
    shafts = vec3(1.0, 0.86, 0.6) * acc * 0.045 * uSun * fall * (0.6 + 0.4 * uGust);
  }
  vec3 R = uCamMat[0], U = uCamMat[1];
  vec4 acc = vec4(0.0);
  float wsp = 1.5 + uWind * 5.0 + uGust * 6.0;
  for (int i = 0; i < 5; i++) {
    float d = 3.0 * pow(1.55, float(i));
    vec2 q = vec2(dot(rd, R), dot(rd, U)) * d;
    vec2 cell = vec2(1.1);
    q.x -= uTime * wsp * (0.8 + 0.1 * float(i));
    q.y += uTime * (0.7 + 0.2 * float(i)) - sin(q.x * 0.3 + uTime) * 0.3;
    vec2 g = q / cell; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    vec4 h = hash42(id + float(i) * 13.0);
    if (h.w > uLeaves * 0.45) continue;
    f -= (h.xy - 0.5) * 0.5;
    float spin = uTime * (1.5 + h.z * 4.0) + h.x * 6.0;
    vec2 lq = rot(spin) * f;
    float flip = cos(spin * 0.7 + h.y * 3.0);
    lq.x /= max(abs(flip), 0.15);
    float sz = 0.055 + h.z * 0.04;
    float leaf = length(lq / vec2(sz, sz * 0.55)) - 1.0 + abs(lq.y) * 2.0;
    float px = 1.5 / (uRes.y * 0.5 / uTanHalf.y) * d / cell.x;
    float cov = 1.0 - smoothstep(-px * 4.0, px * 4.0, leaf * sz);
    if (cov <= 0.0) continue;
    vec3 lc = mix(vec3(0.55, 0.38, 0.06), vec3(0.42, 0.2, 0.04), h.y);
    lc = mix(lc, vec3(0.3, 0.33, 0.08), step(0.75, h.x));
    lc *= (0.35 + 0.25 * flip + uSun * 0.5) * (0.6 + 0.4 * step(0.0, flip));
    acc.rgb = mix(acc.rgb, lc, cov);
    acc.a = max(acc.a, cov);
  }
  if (uRain > 0.01) {
    for (int i = 0; i < 4; i++) {
      float d = 2.0 * pow(1.7, float(i));
      vec2 q = vec2(dot(rd, R), dot(rd, U)) * d;
      q.x += q.y * (0.25 + uGust * 0.5);
      q.y += uTime * 8.0;
      vec2 cell = vec2(0.13, 1.4);
      vec2 g = q / cell; vec2 id = floor(g); vec2 f = fract(g);
      vec3 h = hash32(id + float(i) * 7.0);
      if (h.z > uRain * 0.6) continue;
      float px = 1.0 / (uRes.y * 0.5 / uTanHalf.y) * d / cell.x;
      float s = (1.0 - smoothstep(0.0, px + 0.03, abs(f.x - h.x))) * smoothstep(h.y * 0.5, h.y * 0.5 + 0.1, f.y) * (1.0 - smoothstep(h.y * 0.5 + 0.3, h.y * 0.5 + 0.5, f.y));
      acc.rgb += vec3(0.55, 0.58, 0.6) * s * 0.12 * (1.0 - acc.a);
      acc.a = max(acc.a, s * 0.12);
    }
  }
  o = vec4(acc.rgb + shafts * (1.0 - acc.a), acc.a);
}
`;

  const scene = {
    id: 'forest',
    name: 'Pine Wind',
    sub: 'a cabin, birches, a gusty afternoon',
    audio: 'forest',
    leaves: 1,
    bokehBg: ['#8a9096', '#4c5a46', '#2a3020'],
    defaults: { rain: 0.12, wind: 0.65, fog: 0.2, cond: 0.06, frost: 0, lightning: 0 },
    controls: ['rain', 'wind', 'fog', 'cond', 'lightning'],
    look: {
      frame: 'casement', material: 'oak', wall: '#b9ab96', lamp: 0.35, candle: false, mug: true, plant: true,
      exposure: -0.3, sat: 1.12, contrast: 1.08, lift: [0.01, 0.012, 0.01], gain: [1.0, 1.0, 0.97],
      bloom: 0.04, halo: 0.3, dTyp: 25, reflStretch: 2, refl: 0.4, flowAng: 0,
    },

    init(R) {
      const G = R.G;
      this.bg = G.program(W.SH.vert, BG, 'forestBg');
      this.fg = G.program(W.SH.vert, FG, 'forestFg');
      const specs = [];
      for (let i = 0; i < 5; i++) specs.push({ name: 'pine' + i, kind: 'pine', w: 300, h: 760, seed: 10 + i });
      for (let i = 0; i < 4; i++) specs.push({ name: 'birch' + i, kind: 'birch', w: 440, h: 1000, seed: 30 + i, o: { hue: 58 + i * 7 } });
      for (let i = 0; i < 4; i++) specs.push({ name: 'grass' + i, kind: 'grass', w: 256, h: 190, seed: 50 + i, o: { hue: 70 + i * 5, light: 18, seeds: true, flowers: i % 2 === 0 } });
      specs.push({ name: 'bough', kind: 'bough', w: 1100, h: 520, seed: 77 });
      const at = W.kit.atlas(specs, 2048);
      this.rects = at.rects;
      const bb = (this.bb = new W.kit.Billboards(R, at.canvas));
      const r = W.rng(4);
      for (let i = 0; i < 80; i++) {
        const z = r.range(38, 170), x = r.range(-1, 1) * (40 + z * 0.9);
        bb.add(x, 0, z, this.rects['pine' + r.int(0, 4)], r.range(14, 27), 0.7, r.range(0.8, 1.1));
      }
      this.crowns = [];
      for (let i = 0; i < 20; i++) {
        const z = r.range(11, 44), x = r.range(-1, 1) * (8 + z * 0.75);
        const h = r.range(11, 17);
        bb.add(x, 0, z, this.rects['birch' + r.int(0, 3)], h, 1.6, r.range(0.9, 1.1));
        this.crowns.push([x, h * 0.66, z, h]);
      }
      for (let i = 0; i < 240; i++) {
        const z = 2.6 + Math.pow(r(), 1.8) * 30, x = r.range(-1, 1) * (2 + z * 0.9);
        bb.add(x, -0.02, z, this.rects['grass' + r.int(0, 3)], r.range(0.45, 0.95), 2.2, r.range(0.85, 1.15));
      }
      bb.add(-2.3, 1.75, 3.4, this.rects.bough, 1.85, 0.9, 0.9);
      this.cam = { base: [0, 2.3, -0.5], yaw: 0.04, pitch: 0.035, fovY: 60 };
      bb.upload(this.cam.base);
      this.sunN = W.noise1(21);
      this.spark = [];
      for (let i = 0; i < 70; i++) {
        const c = r.pick(this.crowns);
        this.spark.push([c[0] + r.range(-0.3, 0.3) * c[3] * 0.5, c[1] + r.range(-0.25, 0.35) * c[3], c[2] - 0.5, r() * 10, r.range(0.6, 1.4)]);
      }
      this.gaps = [];
      for (let i = 0; i < 90; i++) {
        const c = r.pick(this.crowns);
        this.gaps.push([c[0] + r.range(-0.45, 0.45) * c[3] * 0.6, c[1] + r.range(-0.1, 0.5) * c[3], c[2] + 0.5, r.range(0.25, 0.9), Math.pow(r(), 2.2) * 1.1 + 0.08]);
      }
    },

    update(dt, t, env, R) {
      const L = R.lights;
      this.sun = W.smoothstep(0.3, 0.68, this.sunN(t * 0.025)) * (1 - env.rain * 0.8) * (1 - env.fog * 0.5);
      // sun glints on fluttering leaves
      if (this.sun > 0.05) {
        for (const s of this.spark) {
          const tw = Math.pow(Math.max(0, Math.sin(t * s[4] * 3 + s[3])), 14) * this.sun;
          if (tw > 0.02) L.add(s[0] + Math.sin(t * 2 + s[3]) * env.gust * 0.3, s[1], s[2], 0.05, 60 * tw, 52 * tw, 36 * tw, 0.2);
        }
      }
      // bright sky through the crowns: soft discs only when blurred
      const sk = 1.1 + this.sun * 0.6;
      for (const g of this.gaps) { const k = sk * g[4] * (0.85 + 0.15 * Math.sin(t * 1.7 + g[3] * 9) * env.gust); L.add(g[0] + Math.sin(t * 0.9 + g[3] * 5) * env.gust * 0.4, g[1], g[2], g[3], k * 0.95, k, k * 0.9, 0, 3); }
    },

    render(R, t, dt, P) {
      const e = P.env;
      const sunDir = W.v3.norm([-0.45, 0.32, 1]);
      this.bg.use().set(R.camUniforms()).set({ uTime: t, uSun: this.sun, uGust: e.gust, uWind: e.wind, uRain: e.rain, uFog: e.fog, uFlash: e.flash, uSunDir: sunDir });
      R.G.drawFS();
      const amb = W.scale3([0.3, 0.32, 0.35], (1 - e.rain * 0.3) + e.flash * 0.6);
      this.bb.draw(t, {
        gust: e.gust, wind: e.wind, flutter: 1,
        amb, sun: W.scale3([1.0, 0.86, 0.66], this.sun * 1.3),
        fogCol: W.scale3([0.5, 0.53, 0.56], 1 - e.rain * 0.3), fogD: 0.003 + e.fog * 0.008 + e.rain * 0.006,
      }, true);
      const dc = R.depthCopy();
      const gl = R.gl;
      const sp = R.cam.project(W.v3.add(R.cam.pos, W.v3.mul(sunDir, 1000)));
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      this.fg.use().set(R.camUniforms()).set({ uTime: t, uGust: e.gust, uWind: e.wind, uRain: e.rain, uSun: this.sun, uLeaves: 0.3 + e.wind * 0.7, uDepth: dc, uSunUV: [sp[0] * 0.5 + 0.5, sp[1] * 0.5 + 0.5] });
      R.G.drawFS();
      gl.disable(gl.BLEND);
    },
  };

  (W.scenes = W.scenes || []).push(scene);
})();

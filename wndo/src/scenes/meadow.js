// wndo :: Fireflies. A farmhouse window over a hay meadow, a June night, the moon up.
(() => {
  const W = window.W;

  const BG = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform vec3 uMoonDir;
uniform float uFog, uWind, uFlash, uRain, uGust;
uniform vec2 uFlashAz;
out vec4 o;
#define FAR 9000.0
vec3 stars(vec3 rd){
  vec3 c = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float sc = i == 0 ? 220.0 : 520.0;
    vec3 p = rd * sc;
    vec3 id = floor(p), f = fract(p) - 0.5;
    vec3 h = hash33(id + float(i) * 13.0);
    float b = pow(h.x, i == 0 ? 18.0 : 40.0);
    float d = length(f - (h - 0.5) * 0.6);
    float tw = 0.75 + 0.25 * sin(uTime * (2.0 + h.y * 5.0) + h.z * 40.0);
    vec3 sc3 = mix(vec3(1.0, 0.82, 0.62), vec3(0.72, 0.82, 1.0), h.z);
    c += sc3 * b * tw * (1.0 - smoothstep(0.03, 0.12, d)) * (i == 0 ? 5.0 : 2.5);
  }
  return c;
}
vec3 milky(vec3 rd){
  vec3 axis = normalize(vec3(0.35, 0.55, 0.75));
  float band = 1.0 - abs(dot(rd, axis));
  float b = pow(band, 14.0);
  vec2 q = vec2(atan(rd.x, rd.z) * 3.0, rd.y * 6.0);
  float n = fbm(q * 1.5);
  float dust = smoothstep(0.45, 0.7, fbm(q * 3.0 + 4.0));
  return vec3(0.12, 0.12, 0.15) * b * (0.4 + n) * (1.0 - dust * 0.7) * 0.5;
}
vec3 sky(vec3 rd){
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.016, 0.022, 0.036), vec3(0.003, 0.005, 0.012), pow(h, 0.5));
  float az = atan(rd.x, rd.z);
  c += vec3(0.05, 0.03, 0.018) * exp(-h * 14.0) * smoothstep(0.2, 1.2, az);
  float mu = max(dot(rd, uMoonDir), 0.0);
  c += vec3(0.25, 0.3, 0.45) * (pow(mu, 30.0) * 0.06 + pow(mu, 300.0) * 0.25);
  float clouds = 0.0;
  if (rd.y > 0.0) {
    c += (stars(rd) * 0.012 + milky(rd)) * smoothstep(0.0, 0.15, h) * (1.0 - uRain);
    vec2 cp = rd.xz / (h + 0.06) * 0.7 + vec2(uTime * 0.006 * (0.5 + uWind), 0.0);
    float d = fbm(cp * 0.6);
    clouds = smoothstep(0.5 - uRain * 0.3, 0.85, d);
    vec3 cc = vec3(0.03, 0.035, 0.05) + vec3(0.2, 0.24, 0.34) * pow(mu, 6.0) * 0.4;
    c = mix(c, cc, clouds * 0.85);
  }
  // the moon
  if (mu > 0.99985) {
    vec3 t = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
    vec3 b = cross(t, uMoonDir);
    vec2 mq = vec2(dot(rd, t), dot(rd, b)) / 0.0173;
    float mare = smoothstep(0.45, 0.7, fbm(mq * 2.5 + 3.0));
    c = mix(c, vec3(0.95, 0.93, 0.88) * (0.55 - mare * 0.18) * 7.0, 1.0 - clouds * 0.9);
  }
  // heat lightning low on the horizon
  float fl = exp(-pow((az - uFlashAz.x) / 0.35, 2.0)) * exp(-h * 9.0);
  c += vec3(0.7, 0.62, 0.8) * uFlash * fl * (0.4 + 1.5 * clouds);
  return c;
}
float hills(float az, float seed, float amp, float base){
  return base + amp * (fbm(vec2(az * 3.0, seed)) - 0.35);
}
void main(){
  vec3 ro = uCamPos, rd = camRay(gl_FragCoord.xy);
  vec3 col = sky(rd);
  float dist = FAR;
  float rxz = length(rd.xz), az = atan(rd.x, rd.z);
  vec3 moonL = vec3(0.42, 0.5, 0.75) * 0.14;
  vec3 amb = vec3(0.012, 0.016, 0.026);
  vec3 fogC = vec3(0.02, 0.026, 0.04) + moonL * 0.15;
  // far ridges, then a line of round trees
  float D[3]; D[0] = 260.0; D[1] = 900.0; D[2] = 2200.0;
  for (int i = 2; i >= 0; i--) {
    float y = ro.y + D[i] * rd.y / rxz;
    float top;
    if (i == 0) {
      float x = az * D[0];
      float cell = 7.0, ci = floor(x / cell);
      top = 1.2 + vnoise(vec2(x * 0.2, 1.0)) * 1.4;
      for (int k = -2; k <= 2; k++) {
        float id = ci + float(k);
        vec3 r = hash32(vec2(id, 3.0));
        if (r.z < 0.3) continue;
        float cx = (id + 0.5 + (r.x - 0.5) * 0.8) * cell;
        float rad = cell * (0.55 + r.y * 0.9);
        float u = (x - cx) / rad;
        float crown = (6.0 + 10.0 * r.y) * sqrt(max(0.0, 1.0 - u * u)) + 2.0;
        top = max(top, crown * (0.85 + 0.3 * fbm(vec2(x * 0.25, id))));
      }
    } else top = hills(az, float(i) * 3.0, 70.0 + float(i) * 60.0, 10.0 * float(i));
    if (y < top) {
      float dd = D[i] / rxz;
      float lit = smoothstep(top - 6.0, top, y) * 0.5;
      vec3 c = vec3(0.012, 0.016, 0.02) * (amb * 18.0 + moonL * (0.6 + lit));
      col = mix(c, fogC, 1.0 - exp(-dd * (0.0006 + uFog * 0.002)));
      dist = dd;
    }
  }
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
    if (t * rxz < D[0]) {
      vec3 p = ro + rd * t;
      vec3 alb = mix(vec3(0.06, 0.07, 0.04), vec3(0.09, 0.08, 0.05), vnoise(p.xz * 0.1)) * (0.7 + 0.6 * vnoise(p.xz * 0.9));
      float wave = smoothstep(0.4, 1.0, sin(p.x * 0.25 + p.z * 0.3 - uTime * (0.6 + uWind * 1.5) + vnoise(p.xz * 0.1) * 3.0)) * uGust;
      col = alb * (amb + moonL * (0.7 + wave * 0.6));
      float mist = smoothstep(40.0, 200.0, t) * (0.4 + uFog);
      col = mix(col, fogC * 1.4, mist * 0.6);
      dist = t;
    }
  }
  col += vec3(0.6, 0.55, 0.7) * uFlash * 0.01;
  o = vec4(col, dist);
}
`;

  const scene = {
    id: 'meadow',
    name: 'Fireflies',
    sub: 'a farmhouse, a hay meadow, june, late',
    audio: 'meadow',
    leaves: 0.35,
    windSound: 0.6,
    bokehBg: ['#05070c', '#0a0d12', '#050605'],
    defaults: { rain: 0, wind: 0.15, fog: 0.3, cond: 0.12, frost: 0, lightning: 1, fireflies: 0.6 },
    controls: ['rain', 'wind', 'fog', 'cond', 'lightning', 'fireflies'],
    look: {
      frame: 'picture', material: 'white', wall: '#cdbfae', lamp: 0.3, open: true, candle: true, mug: false, plant: true,
      exposure: 1.6, sat: 1.0, contrast: 1.04, lift: [0.008, 0.009, 0.014], gain: [0.98, 1.0, 1.03],
      bloom: 0.05, halo: 0.6, dTyp: 40, reflStretch: 2, refl: 1.1, flowAng: 0,
    },

    init(R) {
      this.bg = R.G.program(W.SH.vert, BG, 'meadow');
      this.cam = { base: [0, 2.1, -0.5], yaw: 0.05, pitch: 0.04, fovY: 56 };
      const specs = [];
      for (let i = 0; i < 4; i++) specs.push({ name: 'g' + i, kind: 'grass', w: 256, h: 320, seed: 80 + i, o: { hue: 80 + i * 4, sat: 18, light: 22, n: 120, seeds: i % 2 === 0, flowers: i % 2 === 1 } });
      specs.push({ name: 'oak', kind: 'oak', w: 900, h: 700, seed: 3, o: { hue: 100, sat: 12, light: 7, litK: 0.9, trunk: '#0d0a08' } });
      const at = W.kit.atlas(specs, 2048);
      const bb = (this.bb = new W.kit.Billboards(R, at.canvas));
      const r = W.rng(12);
      bb.add(-38, 0, 120, at.rects.oak, 17, 0.25, 0.8);
      bb.add(64, 0, 230, at.rects.oak, 14, 0.2, 0.7);
      for (let i = 0; i < 300; i++) {
        const z = 3.5 + Math.pow(r(), 1.7) * 55, x = r.range(-1, 1) * (3 + z * 0.85);
        bb.add(x, -0.05, z, at.rects['g' + r.int(0, 3)], r.range(0.7, 1.35), 1.6, r.range(0.8, 1.2));
      }
      bb.upload(this.cam.base);
      this.flies = [];
      for (let i = 0; i < 140; i++) {
        this.flies.push({
          p: [r.range(-30, 30), r.range(0.3, 2.6), r.range(5, 70)],
          ph: r() * 20, per: r.range(1.6, 4), dur: r.range(0.35, 0.8), seed: r() * 100, k: r.range(0.6, 1.2),
        });
      }
      this.n1 = W.noise1(31);
      this.flashAz = 0.3;
    },

    update(dt, t, env, R) {
      const L = R.lights;
      const n = Math.floor(10 + env.fireflies * 130);
      for (let i = 0; i < n; i++) {
        const f = this.flies[i];
        const s = f.seed;
        f.p[0] += (this.n1(t * 0.15 + s) - 0.5) * dt * 1.2 + env.gust * dt * 0.6;
        f.p[1] += (this.n1(t * 0.2 + s + 40) - 0.5) * dt * 0.8;
        f.p[2] += (this.n1(t * 0.13 + s + 80) - 0.5) * dt * 1.2;
        f.p[1] = W.clamp(f.p[1], 0.2, 3.2);
        if (f.p[0] > 34) f.p[0] = -34;
        if (f.p[0] < -34) f.p[0] = 34;
        const u = ((t + f.ph) % f.per) / f.dur;
        if (u > 1.6) continue;
        const b = (u < 1 ? Math.sin(u * Math.PI) ** 2 : Math.exp(-(u - 1) * 6) * 0.15) * f.k * (1 - env.rain * 0.8);
        L.add(f.p[0], f.p[1], f.p[2], 0.04, 110 * b, 160 * b, 30 * b, 1.2);
      }
      // a farmhouse across the fields, and a far road
      const warm = W.kelvin(2400);
      L.add(-120, 3.2, 420, 0.7, warm[0] * 30, warm[1] * 30, warm[2] * 30, 0.5);
      L.add(-112, 2.6, 421, 0.5, warm[0] * 14, warm[1] * 14, warm[2] * 14, 0.2);
      L.add(-104, 6.0, 418, 0.4, 60, 34, 12, 1.0);
      const cx = ((t * 18) % 900) - 450;
      if (Math.sin(t * 0.05) > 0.2) {
        L.add(cx, 1.0, 700, 0.3, 120, 110, 90, 0.4);
        L.add(cx + 1.5, 1.0, 700, 0.3, 120, 110, 90, 0.4);
      }
      if (env.flash > 0.05 && !this.flashing) this.flashAz = (Math.random() - 0.5) * 1.6;
      this.flashing = env.flash > 0.05;
    },

    render(R, t, dt, P) {
      const e = P.env;
      const moonDir = W.v3.norm([0.55, 0.45, 1]);
      this.bg.use().set(R.camUniforms()).set({ uTime: t, uMoonDir: moonDir, uFog: e.fog, uWind: e.wind, uFlash: e.flash * 0.6, uRain: e.rain, uGust: e.gust, uFlashAz: [this.flashAz, 0] });
      R.G.drawFS();
      this.bb.draw(t, {
        gust: e.gust, wind: e.wind, flutter: 0.5,
        amb: [0.02, 0.025, 0.04], sun: [0.07, 0.085, 0.13], fogCol: [0.02, 0.026, 0.04], fogD: 0.002 + e.fog * 0.004,
      }, true);
    },
  };

  (W.scenes = W.scenes || []).push(scene);
})();

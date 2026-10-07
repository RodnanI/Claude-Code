// wndo :: Low Tide. A beach house above the dunes, the sun going down into the sea.
(() => {
  const W = window.W;

  const GLSL = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform vec3 uSunDir;
uniform float uWaves, uWind, uRain, uFog, uFlash, uDusk;
uniform vec4 uBreak[4];   // z position, strength, foam age, 0
uniform float uSwash, uWetLine;
uniform vec4 uGull[6];
uniform float uBeam;      // lighthouse beam angle
out vec4 o;
#define FAR 9000.0

vec3 skyBase(vec3 rd){
  float h = max(rd.y, 0.0);
  float mu = max(dot(rd, uSunDir), 0.0);
  vec3 hor = mix(vec3(0.9, 0.42, 0.17), vec3(0.6, 0.3, 0.24), uDusk);
  vec3 mid = mix(vec3(0.5, 0.32, 0.36), vec3(0.26, 0.18, 0.26), uDusk);
  vec3 zen = mix(vec3(0.09, 0.15, 0.3), vec3(0.04, 0.07, 0.15), uDusk);
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.1, h));
  c = mix(c, zen, smoothstep(0.06, 0.5, h));
  c += vec3(1.0, 0.5, 0.16) * (pow(mu, 4.0) * 0.35 + pow(mu, 30.0) * 1.1 + pow(mu, 500.0) * 5.0) * (1.0 - uDusk * 0.5);
  return c * 0.75 * (1.0 - uRain * 0.45);
}
vec3 sky(vec3 rd, bool full){
  vec3 c = skyBase(rd);
  float h = rd.y;
  float mu = max(dot(rd, uSunDir), 0.0);
  if (mu > 0.99996) c += vec3(1.0, 0.75, 0.45) * 60.0 * (1.0 - uDusk);
  if (h > 0.004) {
    vec2 cp = rd.xz / h * 0.9 + vec2(uTime * 0.008, 0.0);
    cp *= vec2(0.6, 1.4);
    float d = full ? fbm(cp * 0.55) : fbm3o(cp * 0.55);
    float cov = smoothstep(0.42 - uRain * 0.3, 0.75, d);
    float lit = pow(mu, 3.0);
    vec3 cc = mix(vec3(0.24, 0.14, 0.18), vec3(1.0, 0.52, 0.26) * 1.6, lit * (1.0 - smoothstep(0.5, 0.75, d))) * (1.0 - uDusk * 0.6);
    c = mix(c, cc, cov * smoothstep(0.0, 0.05, h) * 0.9);
    float ci = smoothstep(0.55, 0.8, fbm(cp * vec2(0.2, 2.2) + 9.0));
    c += vec3(1.0, 0.6, 0.4) * ci * 0.12 * smoothstep(0.02, 0.3, h) * (1.0 - uDusk);
  }
  return c;
}
float waveH(vec2 p){
  float h = 0.0;
  float amp = 0.28 + uWaves * 0.5;
  h += sin(dot(p, vec2(0.07, 0.25)) + uTime * 1.25) * amp;
  h += sin(dot(p, vec2(-0.12, 0.31)) + uTime * 1.45) * amp * 0.6;
  h += sin(dot(p, vec2(0.33, 0.6)) + uTime * 2.1) * amp * 0.25;
  h += sin(dot(p, vec2(-0.5, 0.9)) + uTime * 2.6) * amp * 0.15;
  return h;
}
vec3 seaNormal(vec2 p, float t){
  float amp = 0.28 + uWaves * 0.5;
  float fp = t * 2.0 * uTanHalf.y / uRes.y;
  vec2 g = vec2(0.0);
  vec4 k1 = vec4(0.07, 0.25, 1.25, 1.0), k2 = vec4(-0.12, 0.31, 1.45, 0.6), k3 = vec4(0.33, 0.6, 2.1, 0.25), k4 = vec4(-0.5, 0.9, 2.6, 0.15);
  g += k1.xy * cos(dot(p, k1.xy) + uTime * k1.z) * k1.w * (1.0 - smoothstep(0.4, 1.5, length(k1.xy) * fp * 3.0));
  g += k2.xy * cos(dot(p, k2.xy) + uTime * k2.z) * k2.w * (1.0 - smoothstep(0.4, 1.5, length(k2.xy) * fp * 3.0));
  g += k3.xy * cos(dot(p, k3.xy) + uTime * k3.z) * k3.w * (1.0 - smoothstep(0.4, 1.5, length(k3.xy) * fp * 3.0));
  g += k4.xy * cos(dot(p, k4.xy) + uTime * k4.z) * k4.w * (1.0 - smoothstep(0.4, 1.5, length(k4.xy) * fp * 3.0));
  g *= amp;
  float fade = 1.0 - smoothstep(0.3, 1.4, fp * 4.0);
  vec2 q = p * 0.9 + vec2(uTime * 0.4, uTime * 0.7);
  float e = 0.15;
  float n0 = fbm3o(q), nx = fbm3o(q + vec2(e, 0.0)), nz = fbm3o(q + vec2(0.0, e));
  g += vec2(nx - n0, nz - n0) / e * (0.25 + uWind * 0.35) * fade;
  vec2 q2 = p * 3.1 + vec2(-uTime * 0.9, uTime * 1.3);
  float m0 = vnoise(q2), mx = vnoise(q2 + vec2(0.1, 0.0)), mz = vnoise(q2 + vec2(0.0, 0.1));
  g += vec2(mx - m0, mz - m0) * 10.0 * (0.12 + uWind * 0.12) * (1.0 - smoothstep(0.1, 0.5, fp * 4.0));
  return normalize(vec3(-g.x, 1.0, -g.y));
}
float foamTex(vec2 p){
  float n = fbm(p * 0.9 + vec2(0.0, uTime * 0.05));
  float m = vnoise(p * 3.7);
  return smoothstep(0.35, 0.75, n * 0.7 + m * 0.4);
}
float gull(vec2 q, float ph){
  float flap = sin(ph) * 0.35;
  q.x = abs(q.x);
  float wing = abs(q.y - (q.x * (0.55 - flap) - q.x * q.x * 0.9)) - 0.05 * (1.0 - q.x);
  return max(wing, q.x - 1.0);
}
void main(){
  vec3 ro = uCamPos, rd = camRay(gl_FragCoord.xy);
  vec3 col = sky(rd, true);
  float dist = FAR;
  vec3 sunCol = vec3(1.0, 0.62, 0.32) * (1.0 - uDusk * 0.7) * (1.0 - uRain * 0.6);
  // headland with a lighthouse on the left
  float rxz = length(rd.xz), az = atan(rd.x, rd.z);
  {
    float D = 2400.0;
    float y = ro.y + D * rd.y / rxz;
    float x = az * D;
    float hl = (90.0 + 60.0 * vnoise(vec2(x * 0.004, 2.0)) + 14.0 * vnoise(vec2(x * 0.03, 5.0))) * (1.0 - smoothstep(-1100.0, -300.0, x));
    if (y < hl && y > 0.0) {
      col = mix(vec3(0.05, 0.035, 0.04), skyBase(vec3(rd.x, 0.02, rd.z)) * 0.75, 0.55 + 0.2 * vnoise(vec2(x * 0.02, y * 0.1)));
      dist = D / rxz;
    }
    vec2 lh = vec2(-1020.0, 0.0);
    float lx = x - lh.x;
    float ty = hl;
    if (abs(lx) < 7.0 && y > 150.0 - 30.0 && y < 182.0 && y > 0.0) {
      float hh = (y - 120.0);
      if (abs(lx) < 5.0 - hh * 0.04) { col = mix(vec3(0.5, 0.45, 0.42), vec3(0.6, 0.12, 0.08), step(0.5, fract(hh / 12.0))) * skyBase(vec3(0.0, 0.05, 1.0)) * 0.9; dist = D / rxz; }
    }
  }
  // the sea and the sand
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
    vec3 p = ro + rd * t;
    float shore = 30.0 + vnoise(vec2(p.x * 0.03, 0.0)) * 5.0;
    float edge = shore - uSwash * 9.0 + vnoise(vec2(p.x * 0.15, uTime * 0.1)) * 1.5;
    vec3 V = -rd;
    if (p.z > edge) {
      vec3 n = seaNormal(p.xz, t);
      float near = 1.0 - smoothstep(shore, shore + 50.0, p.z);
      n = normalize(mix(n, vec3(0.0, 1.0, 0.0), near * 0.3));
      vec3 r = reflect(rd, n);
      r.y = abs(r.y);
      float F = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
      vec3 refl = sky(r, false);
      vec3 deep = mix(vec3(0.002, 0.01, 0.018), vec3(0.02, 0.06, 0.06), near);
      float crest = smoothstep(0.0, 0.6, waveH(p.xz) / (0.28 + uWaves * 0.5));
      vec3 sss = vec3(0.05, 0.16, 0.12) * crest * sunCol * 0.6;
      col = mix(deep + sss, refl, F);
      vec3 H = normalize(uSunDir + V);
      float nh = max(dot(n, H), 0.0);
      col += sunCol * min(pow(nh, 1400.0) * 120.0 + pow(nh, 260.0) * 2.0, 7.0) * smoothstep(-0.02, 0.02, uSunDir.y);
      // breakers and their foam
      float foam = 0.0;
      for (int i = 0; i < 4; i++) {
        vec4 b = uBreak[i];
        if (b.y <= 0.0) continue;
        float dz = p.z - b.x - vnoise(vec2(p.x * 0.04, b.w)) * 4.0;
        float face = exp(-sq(dz / 1.8)) * b.y;
        float trail = smoothstep(0.0, 2.0, dz) * exp(-dz / (6.0 + b.z * 4.0)) * b.y;
        col *= 1.0 - face * 0.35 * (1.0 - b.z);
        col += vec3(0.06, 0.13, 0.11) * face * (1.0 - b.z) * sunCol;
        foam = max(foam, (exp(-sq(dz / 1.4)) * b.z + trail * 0.8) * b.y);
      }
      float wc = smoothstep(0.82, 0.98, crest) * uWaves * smoothstep(80.0, 300.0, p.z) * 0.5;
      foam = max(foam, wc);
      float ft = foamTex(p.xz * vec2(0.6, 1.0));
      float fa = sat(foam * (0.4 + ft));
      vec3 fcol = (skyBase(vec3(0.0, 0.3, 1.0)) * 0.6 + sunCol * 0.7 * max(uSunDir.y + 0.15, 0.0) * 4.0) * 0.8;
      col = mix(col, fcol, fa * smoothstep(0.0, 0.3, 1.0 - exp(-t * 0.02)) + fa * 0.6);
      dist = t;
    } else {
      // sand: dry, then wet and mirror-like near the water
      float wetz = smoothstep(uWetLine - 3.0, uWetLine + 2.0, p.z);
      float film = smoothstep(edge - 2.5, edge, p.z);
      vec3 sand = vec3(0.42, 0.33, 0.22) * (0.85 + 0.25 * vnoise(p.xz * 0.6) + 0.1 * vnoise(p.xz * 6.0));
      float rip = sin(p.z * 3.5 + vnoise(p.xz * 0.5) * 6.0) * 0.5 + 0.5;
      sand *= 0.92 + 0.12 * rip * (1.0 - wetz);
      sand = mix(sand, sand * 0.45, wetz);
      vec3 E = sunCol * 0.55 + skyBase(vec3(0.0, 1.0, 0.0)) * 0.7;
      float ripS = 0.9 + 0.16 * sin(p.z * 3.2 + p.x * 0.9 + vnoise(p.xz * 0.35) * 7.0) * (0.5 + vnoise(p.xz * 0.2));
      col = sand * (E * mix(ripS, 1.0, wetz));
      vec3 n = normalize(vec3((vnoise(p.xz * 2.0) - 0.5) * 0.06 * (1.0 - film), 1.0, (vnoise(p.xz * 2.0 + 3.0) - 0.5) * 0.06));
      vec3 r = reflect(rd, n);
      float F = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
      col = mix(col, sky(r, false), F * (wetz * 0.7 + film * 0.3));
      float swashFoam = exp(-sq((p.z - edge) / 0.5)) * uSwash * (0.5 + foamTex(p.xz * 2.0));
      col = mix(col, vec3(0.8, 0.7, 0.62) * (E * 0.5 + 0.2), sat(swashFoam));
      dist = t;
    }
    // sand fence and its posts
    for (int i = 0; i < 18; i++) {
      float px = -14.0 + float(i) * 1.65;
      vec2 pc = vec2(px, 13.5 + px * 0.1 + sin(float(i) * 1.7) * 0.3);
      vec2 rel = ro.xz - pc;
      float bq = dot(rel, rd.xz), cq = dot(rel, rel) - 0.0064, a = dot(rd.xz, rd.xz);
      float disc = bq * bq - a * cq;
      if (disc < 0.0) continue;
      float tp = (-bq - sqrt(disc)) / a;
      if (tp < 0.0 || tp > dist) continue;
      float hy = ro.y + rd.y * tp;
      float ph = 1.05 + 0.3 * hash11(float(i));
      if (hy > 0.0 && hy < ph) {
        vec3 E = sunCol * 0.6 + skyBase(vec3(0.0, 1.0, 0.0)) * 0.3;
        col = vec3(0.12, 0.09, 0.07) * E * (0.7 + 0.3 * vnoise(vec2(hy * 20.0, float(i))));
        dist = tp;
      }
    }
  }
  // gulls
  for (int i = 0; i < 6; i++) {
    vec4 gq = uGull[i];
    if (gq.w <= 0.0) continue;
    vec3 c = gq.xyz;
    vec3 toC = normalize(c - ro);
    float tc = dot(c - ro, rd);
    if (tc <= 0.0 || tc > dist) continue;
    vec3 q = ro + rd * tc - c;
    vec3 Rr = normalize(cross(vec3(0.0, 1.0, 0.0), toC));
    vec2 l = vec2(dot(q, Rr), q.y) / 0.55;
    float sd = gull(l, gq.w);
    float px = tc * 2.0 * uTanHalf.y / uRes.y / 0.55;
    float cov = 1.0 - smoothstep(-px, px, sd);
    col = mix(col, vec3(0.05, 0.04, 0.045) * (1.0 + sunCol * 0.4), cov);
  }
  // haze over distance, and the lighthouse beam in the air
  float hz = (1.0 - exp(-min(dist, 4000.0) * (0.00025 + uFog * 0.0012 + uRain * 0.0008))) * (dist >= FAR ? 0.25 * uFog : 1.0);
  col = mix(col, skyBase(vec3(rd.x, 0.03, rd.z)) * 0.9, hz);
  vec3 lhp = vec3(-989.6, 172.0, 2186.6);
  vec3 bd = vec3(sin(uBeam), 0.0, cos(uBeam));
  vec3 v = lhp - ro;
  float tc = dot(v, rd);
  vec3 cp = ro + rd * tc - lhp;
  float along = dot(cp, bd);
  float perp = length(cp - bd * along);
  col += vec3(1.0, 0.9, 0.7) * uDusk * 0.12 * exp(-perp / (8.0 + max(along, 0.0) * 0.06)) * step(0.0, along) * exp(-along * 0.0008) * step(tc, dist);
  col += vec3(0.6, 0.65, 0.8) * uFlash * 0.25;
  o = vec4(col, min(dist, FAR));
}
`;

  const scene = {
    id: 'sea',
    name: 'Low Tide',
    sub: 'a beach house, the sun going under',
    audio: 'sea',
    leaves: 0.1,
    windSound: 0.8,
    bokehBg: ['#4a5878', '#c77a4c', '#3a2a24'],
    defaults: { rain: 0, wind: 0.35, fog: 0.15, cond: 0.05, frost: 0, lightning: 0, waves: 0.5 },
    controls: ['rain', 'wind', 'fog', 'cond', 'lightning', 'waves'],
    look: {
      frame: 'picture', material: 'white', wall: '#d8d1c4', lamp: 0.25, candle: false, mug: true, plant: true,
      exposure: 0.05, sat: 1.05, contrast: 1.03, lift: [0.012, 0.01, 0.012], gain: [1.0, 0.98, 0.96],
      bloom: 0.06, halo: 0.25, dTyp: 300, reflStretch: 6, refl: 0.5, flowAng: 0,
    },

    init(R) {
      this.prog = R.G.program(W.SH.vert, GLSL, 'sea');
      this.cam = { base: [0, 3.6, -0.5], yaw: -0.05, pitch: -0.025, fovY: 52 };
      const specs = [];
      for (let i = 0; i < 4; i++) specs.push({ name: 'g' + i, kind: 'grass', w: 256, h: 300, seed: 60 + i, o: { hue: 62 + i * 6, sat: 22, light: 26, n: 70, seeds: true } });
      const at = W.kit.atlas(specs, 1024);
      const bb = (this.bb = new W.kit.Billboards(R, at.canvas));
      const r0 = W.rng(8);
      for (let i = 0; i < 70; i++) {
        const z = 6.5 + Math.pow(r0(), 1.4) * 12, x = r0.range(-1, 1) * (3 + z * 0.75);
        bb.add(x, -0.03, z, at.rects['g' + r0.int(0, 3)], r0.range(0.6, 1.25), 2.4, r0.range(0.8, 1.1));
      }
      bb.upload(this.cam.base);
      this.breaks = [];
      this.nextWave = 2;
      this.swash = 0;
      this.wetLine = 25;
      this.gulls = [];
      const r = (this.r = W.rng(17));
      for (let i = 0; i < 5; i++) this.gulls.push({ x: r.range(-150, 150), y: r.range(14, 60), z: r.range(60, 300), vx: r.range(-5, 5), ph: r() * 6, f: r.range(4, 7), soar: r() });
      this.glint = [];
      for (let i = 0; i < 260; i++) this.glint.push({ t: r() * 2, life: r.range(0.08, 0.35) });
      this.dusk = 0;
    },

    update(dt, t, env, R) {
      const L = R.lights, r = this.r;
      this.dusk = W.clamp(0.15 + env.fog * 0.2 + env.rain * 0.5, 0, 1);
      const sunDir = (this.sunDir = W.v3.norm([-0.36, 0.055 - env.rain * 0.02, 1]));
      // waves roll in, break, and run up the sand
      this.nextWave -= dt;
      if (this.nextWave <= 0) {
        const size = 0.35 + env.waves * 0.65 * r.range(0.6, 1.1);
        this.breaks.push({ z: 100, v: r.range(5.5, 7), s: size, age: 0, broke: false, seed: r() * 50 });
        this.nextWave = r.range(7, 12) * (1.2 - env.waves * 0.4);
        W.bus.emit('wave', { eta: (100 - 52) / 6.2, size });
      }
      for (const b of this.breaks) {
        b.z -= b.v * dt;
        if (b.z < 52) b.broke = true;
        if (b.broke) {
          b.age += dt / 7;
          b.v = Math.max(1.5, b.v - dt * 0.6);
        }
        if (b.z < 34 && !b.ran) {
          b.ran = true;
          this.run = { t: 0, s: b.s };
        }
      }
      this.breaks = this.breaks.filter((b) => b.z > 28 && b.age < 1);
      if (this.run) {
        this.run.t += dt;
        const u = this.run.t / 6;
        this.swash = Math.sin(Math.min(u, 1) * Math.PI) * this.run.s * (u < 1 ? 1 : 0);
        this.wetLine = Math.min(this.wetLine, 30 - this.swash * 9 - 1);
        if (u > 1) this.run = null;
      } else this.swash = 0;
      this.wetLine += dt * 0.15;
      this.wetLine = Math.min(this.wetLine, 28);
      // gulls drift and flap now and then
      for (const g of this.gulls) {
        g.x += g.vx * dt;
        g.ph += dt * (Math.sin(t * 0.3 + g.soar * 10) > 0.3 ? g.f : 0.2);
        g.y += Math.sin(t * 0.4 + g.soar * 6) * dt * 0.8;
        if (g.x > 220) g.x = -220;
        if (g.x < -220) g.x = 220;
      }
      // sun glitter: short-lived sparkles along the sun path, golden bokeh when out of focus
      const sunK = (1 - this.dusk * 0.7) * (1 - env.rain * 0.8);
      if (sunK > 0.05) {
        const az = Math.atan2(sunDir[0], sunDir[2]);
        for (const g of this.glint) {
          g.t += dt;
          if (g.t > g.life) {
            g.life = r.range(0.06, 0.3);
            g.t = r() * g.life * 0.8;
            const d = 45 + Math.pow(r(), 1.5) * 1800;
            const spread = (0.012 + 9 / d) * (0.6 + env.waves);
            const a = az + r.gauss() * spread;
            g.p = [Math.sin(a) * d, 0.05, Math.cos(a) * d];
            g.k = r.range(0.4, 1) * (0.5 + 0.5 * Math.min(1, d / 400));
          }
          if (!g.p) continue;
          const tw = Math.sin((g.t / g.life) * Math.PI) * g.k * sunK;
          L.add(g.p[0], g.p[1], g.p[2], 0.08, 15000 * tw, 8600 * tw, 3000 * tw, 0.12);
        }
      }
      // lighthouse, ship, a village down the coast
      this.beam = t * 0.6;
      const facing = Math.pow(Math.max(0, Math.cos(this.beam - Math.PI + 0.4)), 40);
      const lk = this.dusk * (8 + 600 * facing);
      L.addRefl(-989.6, 172, 2186.6, 1.2, lk, lk * 0.92, lk * 0.75, 0.6, 0.25);
      const sx = 700 - ((t * 2.2) % 1400);
      L.addRefl(sx, 22, 3800, 0.8, 40, 38, 32, 0.3, 0.3);
      L.addRefl(sx + 40, 14, 3800, 0.6, 30, 3, 2, 0.2, 0.3);
      if (!this.village) {
        this.village = [];
        for (let i = 0; i < 26; i++) this.village.push([r.range(500, 1400), r.range(4, 30), r.range(700, 1600), r.pick([2400, 2700, 3000])]);
      }
      for (const v of this.village) {
        const c = W.kelvin(v[3]), k = 25 * (0.3 + this.dusk);
        L.addRefl(v[0], v[1], v[2], 0.9, c[0] * k, c[1] * k, c[2] * k, 0.2, 0.2);
      }
    },

    render(R, t, dt, P) {
      const e = P.env;
      const br = new Float32Array(16);
      this.breaks.slice(0, 4).forEach((b, i) => br.set([b.z, b.s, Math.min(b.age * 1.6, 1), b.seed], i * 4));
      const gl = new Float32Array(24);
      this.gulls.forEach((g, i) => gl.set([g.x, g.y, g.z, g.ph + 0.001], i * 4));
      this.prog.use().set(R.camUniforms()).set({
        uTime: t, uSunDir: this.sunDir, uWaves: e.waves, uWind: e.wind, uRain: e.rain, uFog: e.fog, uFlash: e.flash, uDusk: this.dusk,
        uBreak: br, uSwash: this.swash, uWetLine: this.wetLine, uGull: gl, uBeam: this.beam,
      });
      R.G.drawFS();
      const sunK = (1 - this.dusk * 0.7) * (1 - e.rain * 0.6);
      this.bb.draw(t, {
        gust: e.gust, wind: e.wind, flutter: 0.4,
        amb: [0.16, 0.14, 0.17], sun: [0.95 * sunK, 0.55 * sunK, 0.28 * sunK],
        fogCol: [0.5, 0.33, 0.25], fogD: 0.002,
      }, false);
    },
  };

  (W.scenes = W.scenes || []).push(scene);
})();

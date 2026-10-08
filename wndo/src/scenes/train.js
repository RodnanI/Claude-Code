// wndo :: Night Train. A seat by the window, the country going past in the rain.
(() => {
  const W = window.W;

  const GLSL = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform float uV, uShutter, uRain, uFog, uFlash, uTunnel;
uniform vec4 uFeat[8];   // type (1 crossing, 2 station, 3 tunnel, 4 bridge, 5 town), x0, x1, param
uniform float uFeatN;
uniform float uCross;    // crossing lights phase
out vec4 o;
#define FAR 9000.0
// average of a periodic box pattern over a window, for analytic motion blur
float pbox(float x, float hw, float per, float w){
  float a = x - hw, b = x + hw;
  float fa = floor(a / per) * w + clamp(mod(a, per), 0.0, w);
  float fb = floor(b / per) * w + clamp(mod(b, per), 0.0, w);
  return (fb - fa) / max(b - a, 1e-4);
}
vec3 sky(vec3 rd, float glow){
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.03, 0.024, 0.022), vec3(0.006, 0.007, 0.011), pow(h, 0.6));
  c += vec3(0.08, 0.045, 0.02) * glow * exp(-h * 8.0);
  vec2 cp = rd.xy / (h + 0.1) * 0.6 + vec2(uCamPos.x * 0.00004 + uTime * 0.004, 0.0);
  c *= 0.7 + 0.6 * fbm(cp);
  return c + uFlash * vec3(0.3, 0.32, 0.4) * smoothstep(-0.05, 0.3, h);
}
vec4 feat(int i){ return uFeat[i]; }
void main(){
  vec3 ro = uCamPos, rd = camRay(gl_FragCoord.xy);
  float hw = uV * uShutter * 0.5;
  float camX = ro.x;
  // town glow near towns
  float glow = 0.3;
  int fn = int(uFeatN);
  for (int i = 0; i < 8; i++) { if (i >= fn) break; vec4 f = feat(i); if (f.x > 4.5) glow += 1.0 - smoothstep(0.0, 1500.0, abs(camX + rd.x / max(rd.z, 0.05) * 600.0 - (f.y + f.z) * 0.5)); }
  vec3 col = sky(rd, glow);
  float dist = FAR;
  if (rd.z <= 0.0) { o = vec4(col, dist); return; }
  float slope = rd.x / rd.z, rise = rd.y / rd.z;
  // tunnel: concrete close to the glass, lamps going by
  if (uTunnel > 0.5) {
    float d = 1.6;
    float xw = camX + slope * d, yw = ro.y + rise * d;
    float tl = 0.012 + 0.006 * vnoise(vec2(xw * 0.05, yw * 2.0));
    vec3 c = vec3(tl * 0.6) * (1.0 + 5.0 * pbox(xw, hw + 0.5, 25.0, 0.6) * exp(-abs(yw - 5.6) * 0.8));
    o = vec4(c * (0.6 + 0.4 * smoothstep(-0.5, 2.5, yw)), d / rd.z);
    return;
  }
  // far hills
  {
    float D = 2400.0, x = camX * 0.0 + slope * D, y = ro.y + rise * D;
    float th = 20.0 + 70.0 * fbm(vec2((camX + x) * 0.0006, 1.0));
    if (y < th) { col = mix(vec3(0.006, 0.006, 0.008), sky(vec3(rd.x, 0.02, rd.z), glow), 0.45); dist = D / rd.z; }
  }
  // the ground plane: ballast, verge, fields; motion blur grows as things get closer
  if (rd.y < 0.0) {
    float t = -(ro.y - 3.4) / rd.y;
    vec3 p = ro + rd * t;
    if (p.z > 2.2) { t = -ro.y / rd.y; p = ro + rd * t; p.z = max(p.z, 2.2); }
    float z = p.z;
    if (z > 0.0) {
      float bl = hw;
      vec3 c;
      float n = 0.0;
      for (int k = 0; k < 4; k++) n += vnoise(vec2((p.x + (float(k) - 1.5) * bl * 0.5) * 2.0, z * 3.0));
      n *= 0.25;
      if (z < 2.2) c = vec3(0.07, 0.066, 0.062) * (0.6 + 0.8 * n);
      else if (z < 9.0) c = vec3(0.016, 0.018, 0.013) * (0.6 + 0.8 * n);
      else c = vec3(0.006, 0.0065, 0.006) * (0.6 + 0.8 * vnoise(p.xz * 0.05)) + vec3(0.02, 0.012, 0.006) * glow * exp(-z * 0.004);
      // a road at a level crossing
      for (int i = 0; i < 8; i++) {
        if (i >= fn) break;
        vec4 f = feat(i);
        if (f.x > 0.5 && f.x < 1.5) {
          float rw = 1.0 - smoothstep(3.4, 4.2 + bl, abs(p.x - f.y));
          c = mix(c, vec3(0.03, 0.03, 0.032) * (1.0 + uCross * 0.5 * step(z, 8.0)), rw);
          c += vec3(0.25, 0.13, 0.05) * 0.4 * rw * (0.5 + 0.5 * sin(z * 0.2)) * exp(-z * 0.01) * step(10.0, z) * pbox(z, 0.0001, 40.0, 4.0);
        }
        if (f.x > 3.5 && f.x < 4.5 && p.x > f.y && p.x < f.z && z > 6.0) {
          c = vec3(0.004, 0.006, 0.01) + sky(reflect(rd, vec3(0.0, 1.0, 0.0)), glow) * 0.45;
        }
      }
      // wet light from the train's own windows on the ballast
      c += vec3(0.12, 0.11, 0.09) * exp(-z * 0.8) * (0.4 + 0.6 * pbox(p.x + 1.2, bl, 2.6, 1.6)) * (1.0 - uTunnel);
      c *= 1.0 - uRain * 0.2;
      col = c;
      dist = t;
    }
  }
  // hedgerows and clumps of trees, low and broken, at a few distances
  for (int i = 3; i >= 0; i--) {
    float D = 38.0 * pow(1.9, float(i));
    float xw = camX + slope * D, yw = ro.y + rise * D;
    float seed = float(i) * 11.0;
    float h0 = 1.2 + 1.6 * vnoise(vec2(xw * 0.15, seed));
    float trees = smoothstep(0.62, 0.85, vnoise(vec2(xw * 0.025, seed + 3.0)));
    h0 += trees * (5.0 + 5.0 * vnoise(vec2(xw * 0.3, seed + 5.0)));
    h0 *= step(0.38, vnoise(vec2(xw * 0.01, seed + 9.0)));
    if (yw < h0 && D / rd.z < dist) { col = vec3(0.004, 0.0045, 0.005) + sky(vec3(rd.x, 0.02, rd.z), glow) * 0.08; dist = D / rd.z; }
  }
  // the catenary: poles every 55 m right by the track, a sagging wire on top
  {
    float D = 2.8;
    float xw = camX + slope * D, yw = ro.y + rise * D;
    float cov = pbox(xw, hw + 0.002, 55.0, 0.24);
    if (yw > 3.4 && yw < 10.6 && cov > 0.0) {
      vec3 pc = vec3(0.012, 0.012, 0.013) + vec3(0.1, 0.1, 0.095) * exp(-max(yw - 5.6, 0.0) * 0.5) * (1.0 - uTunnel);
      col = mix(col, pc, min(cov, 1.0));
      if (cov > 0.5) dist = D / rd.z;
    }
    float u = mod(xw, 55.0) / 55.0;
    float wy = 10.5 - 1.1 * 4.0 * u * (1.0 - u);
    float px = D / rd.z * 2.0 * uTanHalf.y / uRes.y;
    float wire = 1.0 - smoothstep(0.0, 0.012 + px * 1.5, abs(yw - wy));
    col = mix(col, vec3(0.006), wire * 0.9);
  }
  // station: a lit platform at rail height, a canopy overhead, pillars flicking by
  for (int i = 0; i < 8; i++) {
    if (i >= fn) break;
    vec4 f = feat(i);
    if (f.x < 1.5 || f.x > 2.5) continue;
    float RAIL = 3.4;
    if (rd.y < 0.0) {
      float tp = (RAIL + 1.1 - ro.y) / rd.y;
      vec3 pp = ro + rd * tp;
      if (pp.z > 0.45 && pp.z < 6.5 && pp.x > f.y && pp.x < f.z && tp < dist) {
        float lampLit = 0.0, tex = 0.0;
        for (int k = 0; k < 4; k++) {
          float xs = pp.x + (float(k) - 1.5) * hw * 0.5;
          lampLit += 0.55 + 0.45 * cos(6.2831 * (xs - 6.0) / 12.0);
          tex += vnoise(vec2(xs * 3.0, pp.z * 3.0));
        }
        lampLit *= 0.25; tex *= 0.25;
        vec3 pc = vec3(0.045, 0.044, 0.042) * (0.75 + 0.5 * tex) * (0.25 + 0.9 * lampLit * exp(-abs(pp.z - 3.0) * 0.25));
        float line = smoothstep(0.62, 0.66, pp.z) * (1.0 - smoothstep(0.78, 0.82, pp.z));
        pc = mix(pc, vec3(0.5, 0.42, 0.06) * (0.5 + lampLit), line);
        pc *= 1.0 - (1.0 - smoothstep(0.45, 0.55, pp.z)) * 0.7;
        col = pc * (1.0 - uRain * 0.15) + vec3(0.06) * uRain * lampLit * 0.5;
        dist = tp;
      }
      // the platform's face below the edge
      float tz = (0.45 - ro.z) / rd.z;
      vec3 pf = ro + rd * tz;
      if (pf.y < RAIL + 1.1 && pf.y > RAIL - 0.3 && pf.x > f.y && pf.x < f.z && tz < dist) { col = vec3(0.012); dist = tz; }
    }
    if (rd.y > 0.0) {
      float tc = (RAIL + 4.3 - ro.y) / rd.y;
      vec3 pc = ro + rd * tc;
      if (pc.z > 0.2 && pc.z < 6.0 && pc.x > f.y && pc.x < f.z && tc < dist) {
        float lamps = pbox(pc.x - 4.0, hw + 0.05, 12.0, 2.4) * (1.0 - smoothstep(0.8, 1.1, abs(pc.z - 3.0)));
        col = vec3(0.025, 0.024, 0.023) + vec3(1.2, 1.15, 1.0) * lamps;
        dist = tc;
      }
    }
    // the far platform across the tracks: surface, pillars, canopy, the lamps under it
    float Df = 13.0;
    float xf = camX + slope * Df, yf = ro.y + rise * Df;
    if (xf > f.y && xf < f.z && Df / rd.z < dist + 4.0) {
      if (yf > RAIL + 0.2 && yf < RAIL + 1.1) { col = vec3(0.02, 0.019, 0.018); dist = Df / rd.z; }
      else if (yf >= RAIL + 1.1 && yf < RAIL + 4.6) {
        float lit = 0.5 + 0.5 * cos(6.2831 * (xf - 6.0) / 12.0);
        vec3 wall = vec3(0.022, 0.021, 0.02) * (0.3 + 1.0 * lit * lit) * (0.8 + 0.4 * vnoise(vec2(xf * 0.4, yf)));
        float sign = step(abs(mod(xf, 36.0) - 18.0), 2.0) * step(abs(yf - RAIL - 3.0), 0.35);
        wall = mix(wall, vec3(0.05, 0.12, 0.3), sign);
        float pil = pbox(xf, hw + 0.01, 12.0, 0.35);
        col = mix(wall, vec3(0.012), min(pil, 1.0));
        dist = Df / rd.z;
      } else if (yf >= RAIL + 4.6 && yf < RAIL + 5.2) { col = vec3(0.025); dist = Df / rd.z; }
    }
  }
  // atmosphere, wet air
  col = mix(col, sky(vec3(rd.x, 0.05, rd.z), glow) * 0.8, (1.0 - exp(-min(dist, 3000.0) * (0.0008 + uFog * 0.003 + uRain * 0.001))) * step(dist, 8999.0));
  o = vec4(col, dist);
}
`;

  const scene = {
    id: 'train',
    name: 'Night Train',
    sub: 'a window seat, rain, the country going by',
    audio: 'train',
    windSound: 0.35,
    rainSound: 0.8,
    bokehBg: ['#0d0c0c', '#120f0d', '#070707'],
    defaults: { rain: 0.45, wind: 0.2, fog: 0.25, cond: 0.12, frost: 0, lightning: 0, speed: 0.6 },
    controls: ['rain', 'fog', 'cond', 'lightning', 'speed'],
    look: {
      frame: 'train', material: 'train', wall: '#a8a397', lamp: 0.55, lampK: 4600, candle: false, mug: true, plant: false,
      exposure: 1.7, sat: 1.0, contrast: 1.04, lift: [0.01, 0.01, 0.012], gain: [1.0, 0.99, 0.97],
      bloom: 0.05, halo: 0.8, dTyp: 60, reflStretch: 3, refl: 1.3, flowAng: 0,
    },

    init(R) {
      this.prog = R.G.program(W.SH.vert, GLSL, 'train');
      this.cam = { base: [0, 6.2, -1.25], yaw: 0, pitch: -0.1, fovY: 52 };
      this.x = 0;
      this.v = 30;
      this.feats = [];
      this.genTo = 0;
      this.r = W.rng(23);
      this.gen(4000);
      this.shakeN = W.noise1(41);
      this.cars = [];
      for (let i = 0; i < 46; i++) this.cars.push({ x: this.r.range(-1600, 1600), dir: this.r.chance(0.5) ? 1 : -1, v: this.r.range(22, 36) });
      this.lane = [];
      for (let i = 0; i < 6; i++) this.lane.push({ x: this.r.range(-900, 900), dir: this.r.chance(0.5) ? 1 : -1, v: this.r.range(14, 22) });
    },

    // lay out the line ahead: crossings, stations, tunnels, bridges, towns
    gen(to) {
      const r = this.r;
      while (this.genTo < to) {
        const x = this.genTo + r.range(500, 1300);
        const k = r();
        let f;
        if (k < 0.32) f = { type: 1, x0: x, x1: x + 9, lamps: Math.floor(r.range(4, 9)) };
        else if (k < 0.5) f = { type: 2, x0: x, x1: x + 220 };
        else if (k < 0.66) f = { type: 3, x0: x, x1: x + r.range(260, 700) };
        else if (k < 0.78) f = { type: 4, x0: x, x1: x + r.range(120, 260) };
        else f = { type: 5, x0: x - 400, x1: x + r.range(600, 1500), lights: [] };
        if (f.type === 5) {
          for (let i = 0; i < 90; i++) f.lights.push([r.range(f.x0, f.x1), r.range(1, 18), r.range(120, 900), r.pick([2000, 2200, 2700, 3200, 4500])]);
        }
        this.feats.push(f);
        this.genTo = f.x1 + 50;
      }
      this.feats = this.feats.filter((f) => f.x1 > this.x - 2000);
    },

    update(dt, t, env, R) {
      const L = R.lights, r = this.r;
      const vt = 8 + env.speed * 34;
      this.v += (vt - this.v) * (1 - Math.exp(-dt * 0.3));
      const v = this.v;
      this.x += v * dt;
      env.speedMs = v;
      // keep coordinates small for float precision on long runs; shift the world while in a tunnel, where nobody sees it
      const inTunnel = this.feats.some((f) => f.type === 3 && this.x > f.x0 + 30 && this.x < f.x1 - 30);
      if ((this.x > 60000 && inTunnel) || this.x > 150000) {
        const d = Math.floor(this.x / 1300) * 1300 - 2600;
        this.x -= d;
        this.genTo -= d;
        for (const f of this.feats) {
          f.x0 -= d; f.x1 -= d;
          if (f.lights) for (const l of f.lights) l[0] -= d;
        }
        for (const c of this.cars) c.x -= d;
        for (const c of this.lane) c.x -= d;
        if (this.towns) this.towns.clear();
      }
      this.gen(this.x + 5000);
      const x = this.x;
      this.cam.base = [x, 6.2, -1.25];
      // ride: rail joints knock the car, a slow sway underneath
      const joint = (x % 25) / v;
      const knock = Math.exp(-joint * 9) * 0.004 * Math.min(1, v / 20);
      this.shake = [(this.shakeN(t * 0.7) - 0.5) * 0.012, knock + (this.shakeN(t * 1.9 + 50) - 0.5) * 0.006];
      // rain streams sideways at speed
      this.flowAng = Math.atan2(v, 14) * 0.95;
      this.runK = 1 + v / 12;
      this.trainRefl = tunnel => (tunnel ? 3.2 : 1);
      // what is around us now
      let tunnel = 0;
      const vis = [];
      for (const f of this.feats) {
        if (f.type === 3 && x > f.x0 + 1 && x < f.x1 - 1) tunnel = 1;
        if (f.x1 > x - 1500 && f.x0 < x + 1500) vis.push(f);
        if (f.type === 1 && !f.rang && f.x0 - x < v * 6 && f.x0 > x) {
          f.rang = true;
          W.bus.emit('crossing', { duration: ((f.x0 - x) / v) * 2 + 2, mid: 0.5 });
        }
      }
      if (tunnel !== this.tunnel) {
        this.tunnel = tunnel;
        W.bus.emit('tunnel', { inside: !!tunnel });
      }
      this.vis = vis;
      const vel = [-v, 0, 0];
      const shutter = 1 / 50;
      if (tunnel) {
        for (let lx = Math.floor((x - 60) / 25) * 25; lx < x + 60; lx += 25) {
          const c = W.kelvin(2300);
          L.add(lx, 5.6, 0.2, 0.15, c[0] * 160, c[1] * 160, c[2] * 160, 0.5, 2, -v, 0, 0);
        }
      } else {
        for (const f of vis) {
          if (f.type === 1) {
            const on = Math.sin(t * Math.PI * 2 * 1.1) > 0;
            for (const [zz, yy, s] of [[1.6, 5.3, 1]]) {
              const k = (on ? 1 : 0.05) * 160;
              L.add(f.x0 - 1.5, yy, zz, 0.12, k, k * 0.04, k * 0.01, 1, 2, -v, 0, 0);
              const k2 = (on ? 0.05 : 1) * 160;
              L.add(f.x0 + 1.5, yy, zz, 0.12, k2, k2 * 0.04, k2 * 0.01, 1, 2, -v, 0, 0);
            }
            const sod = W.kelvin(2000);
            for (let i = 0; i < f.lamps; i++) L.add(f.x0 + 5, 6.5, 14 + i * 40, 0.2, sod[0] * 200, sod[1] * 200, sod[2] * 200, 0.8, 2, -v, 0, 0);
          } else if (f.type === 2) {
            for (let lx = f.x0 + 4; lx < f.x1; lx += 12) if (Math.abs(lx - x) < 160) L.add(lx, 7.7, 11.3, 0.35, 150, 146, 130, 0.7, 2, -v, 0, 0);
          } else if (f.type === 4) {
            for (const tl of [[f.x0 + 40, 300, 2200], [f.x0 + 90, 520, 2700], [f.x0 + 20, 700, 2000]]) {
              const c = W.kelvin(tl[2]);
              L.addRefl(tl[0], 8, tl[1], 0.8, c[0] * 60, c[1] * 60, c[2] * 60, 0.4, 0.3);
            }
          } else if (f.type === 5) {
            for (const l of f.lights) {
              const c = W.kelvin(l[3]);
              L.add(l[0], l[1], l[2], 0.6, c[0] * 70, c[1] * 70, c[2] * 70, 0.4);
            }
          }
        }
        // a motorway out on the plain
        for (const c of this.cars) {
          c.x += c.dir * c.v * dt;
          if (c.x - x > 1600) c.x -= 3200;
          if (c.x - x < -1600) c.x += 3200;
          const z = c.dir > 0 ? 380 : 386;
          const head = c.dir > 0 ? [1, 0.06, 0.03] : [1, 0.93, 0.8];
          const k = c.dir > 0 ? 50 : 140;
          L.add(c.x, 0.8, z, 0.15, head[0] * k, head[1] * k, head[2] * k, 0.3);
          L.add(c.x + 1.6, 0.8, z, 0.15, head[0] * k, head[1] * k, head[2] * k, 0.3);
        }
        // a country road with lit stretches, and its few cars
        const sod = W.kelvin(2050);
        for (let i = -10; i <= 10; i++) {
          const lx = Math.floor(x / 45) * 45 + i * 45;
          if (W.hash(Math.floor(lx / 900)) < 0.45) continue;
          L.add(lx, 6.5, 165, 0.2, sod[0] * 220, sod[1] * 220, sod[2] * 220, 0.7);
        }
        for (const c of this.lane) {
          c.x += c.dir * c.v * dt;
          if (c.x - x > 900) c.x -= 1800;
          if (c.x - x < -900) c.x += 1800;
          const k = c.dir > 0 ? 40 : 150, col = c.dir > 0 ? [1, 0.05, 0.02] : [1, 0.92, 0.78];
          L.add(c.x, 0.8, 158, 0.12, col[0] * k, col[1] * k, col[2] * k, 0.4);
          L.add(c.x + 1.5, 0.8, 158, 0.12, col[0] * k, col[1] * k, col[2] * k, 0.4);
        }
        // towns low on the horizon
        for (let i = -3; i <= 3; i++) {
          const tx = Math.floor(x / 1300) * 1300 + i * 1300;
          if (W.hash(tx + 11) < 0.35) continue;
          if (!this.towns) this.towns = new Map();
          if (!this.towns.has(tx)) {
            const tr = W.rng(tx | 0), pts = [];
            const n = tr.int(20, 60), cz = tr.range(2600, 4200);
            for (let k = 0; k < n; k++) pts.push([tx + tr.gauss() * 220, tr.range(2, 30), cz + tr.gauss() * 140, tr.pick([2000, 2100, 2700, 4000])]);
            this.towns.set(tx, pts);
            if (this.towns.size > 30) this.towns.delete(this.towns.keys().next().value);
          }
          for (const p of this.towns.get(tx)) {
            const c = W.kelvin(p[3]);
            L.add(p[0], p[1], p[2], 2.0, c[0] * 70, c[1] * 70, c[2] * 70, 0.3);
          }
        }
        // wind turbines blinking red on the ridge, farms with one window on
        const tb = Math.sin(t * 2.0) > 0.4 ? 1 : 0.02;
        for (let i = -6; i <= 6; i++) {
          const tx = Math.floor(x / 380) * 380 + i * 380;
          if (W.hash(tx) < 0.45) continue;
          L.add(tx, 110 + W.hash(tx + 1) * 40, 2100 + W.hash(tx + 2) * 300, 3, 160 * tb, 4 * tb, 2 * tb, 0.4);
        }
        for (let i = -8; i <= 8; i++) {
          const fx = Math.floor(x / 210) * 210 + i * 210;
          if (W.hash(fx + 7) < 0.6) continue;
          const c = W.kelvin(2300 + W.hash(fx) * 1000);
          L.add(fx, 3, 90 + W.hash(fx + 3) * 260, 0.6, c[0] * 22, c[1] * 22, c[2] * 22, 0.3);
        }
        // signals by the track
        const sx = Math.floor(x / 900) * 900 + 900;
        const sc = W.hash(sx) < 0.8 ? [0.1, 1, 0.5] : [1, 0.05, 0.02];
        if (sx - x < 200) L.add(sx, 6.6, 2.1, 0.1, sc[0] * 120, sc[1] * 120, sc[2] * 120, 0.8, 2, -v, 0, 0);
      }
      this.crossPhase = Math.sin(t * Math.PI * 2 * 1.1) > 0 ? 1 : 0;
    },

    render(R, t, dt, P) {
      const e = P.env;
      const fe = new Float32Array(32);
      let n = 0;
      for (const f of this.vis || []) {
        if (n >= 8) break;
        fe.set([f.type, f.x0, f.x1, 0], n * 4);
        n++;
      }
      this.prog.use().set(R.camUniforms()).set({
        uTime: t, uV: this.v, uShutter: 1 / 50, uRain: e.rain, uFog: e.fog, uFlash: e.flash, uTunnel: this.tunnel || 0,
        uFeat: fe, uFeatN: n, uCross: this.crossPhase || 0,
      });
      R.G.drawFS();
    },
  };

  (W.scenes = W.scenes || []).push(scene);
})();

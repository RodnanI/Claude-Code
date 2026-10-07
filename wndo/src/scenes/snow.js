// wndo :: First Snow. Blue hour in a small village, snow coming down, a fire behind you.
(() => {
  const W = window.W;

  const BG = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform vec4 uHA[6], uHB[6];
uniform float uHN, uSnow, uWind, uFog, uGust, uFlash;
uniform vec3 uLamp; uniform vec4 uLampP;
out vec4 o;
#define FAR 9000.0
vec3 sky(vec3 rd){
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.085, 0.1, 0.15), vec3(0.016, 0.03, 0.07), pow(h, 0.5));
  float az = atan(rd.x, rd.z);
  c += vec3(0.16, 0.08, 0.06) * exp(-h * 7.0) * (0.5 + 0.5 * sin(az - 0.9));
  vec2 cp = rd.xz / (h + 0.08) * 0.5 + vec2(uTime * 0.004, 0.0);
  c *= 0.82 + 0.3 * fbm(cp);
  return c * (1.0 - uSnow * 0.25) + uFlash * 0.2;
}
vec2 boxT(vec3 ro, vec3 ird, vec3 bmin, vec3 bmax, out vec3 n){
  vec3 t0 = (bmin - ro) * ird, t1 = (bmax - ro) * ird;
  vec3 tmn = min(t0, t1), tmx = max(t0, t1);
  float tn = max(max(tmn.x, tmn.y), tmn.z), tf = min(min(tmx.x, tmx.y), tmx.z);
  n = -sign(ird) * step(tmn.yzx, tmn) * step(tmn.zxy, tmn);
  return vec2(tn, tf);
}
void clipP(vec3 ro, vec3 rd, vec3 n, float d, inout vec2 t, inout vec3 nn){
  float dn = dot(n, rd), on = dot(n, ro);
  if (abs(dn) < 1e-7) { if (on > d) t = vec2(1e9, -1e9); return; }
  float th = (d - on) / dn;
  if (dn < 0.0) { if (th > t.x) { t.x = th; nn = n; } } else t.y = min(t.y, th);
}
// light reaching a surface point: sky dome, the lantern, the glow of windows nearby
vec3 lightAt(vec3 p, vec3 n){
  vec3 amb = vec3(0.07, 0.085, 0.13) * (0.6 + 0.4 * max(n.y, 0.0)) * (1.0 - uSnow * 0.2);
  vec3 lv = uLampP.xyz - p; float d2 = dot(lv, lv);
  amb += uLamp * max(dot(n, lv * inversesqrt(d2)), 0.0) / (d2 + 0.8);
  return amb + uFlash * 0.3;
}
vec3 house(vec3 p, vec3 rd, vec3 n, int i, bool roof){
  vec4 a = uHA[i], b = uHB[i];
  float seed = b.w;
  if (roof) {
    float sn = 0.85 + 0.15 * vnoise(p.xz * 3.0);
    vec3 c = vec3(0.82, 0.86, 0.92) * sn * lightAt(p, n) * 1.4;
    return c;
  }
  if (n.y > 0.5) return vec3(0.8, 0.85, 0.9) * lightAt(p, n);
  vec3 wall = b.z < 0.5 ? vec3(0.3, 0.05, 0.035) : (b.z < 1.5 ? vec3(0.42, 0.28, 0.1) : (b.z < 2.5 ? vec3(0.18, 0.22, 0.26) : vec3(0.22, 0.2, 0.17)));
  bool front = abs(n.z) > 0.5;
  float u = front ? p.x - a.x : p.z - a.y;
  float wd = front ? a.z - a.x : a.w - a.y;
  float board = 0.85 + 0.15 * step(0.08, fract(u * 4.5));
  vec3 col = wall * board * lightAt(p, n);
  // corner trims
  float trim = step(u, 0.15) + step(wd - 0.15, u);
  col = mix(col, vec3(0.75, 0.73, 0.68) * lightAt(p, n), min(trim, 1.0));
  // windows: lit rooms behind small panes
  float nw = max(1.0, floor(wd / 3.2));
  float wi = floor(u / (wd / nw));
  float wx = fract(u / (wd / nw)) * (wd / nw) - (wd / nw) * 0.5;
  vec2 wq = vec2(wx, p.y - b.x * 0.45);
  vec2 ws = vec2(0.55, 0.62);
  float h = hash12(vec2(seed, wi + (front ? 0.0 : 9.0)));
  if (abs(wq.x) < ws.x + 0.1 && abs(wq.y) < ws.y + 0.1) {
    col = vec3(0.72, 0.7, 0.66) * lightAt(p, n);
    if (abs(wq.x) < ws.x && abs(wq.y) < ws.y) {
      float lit = step(h, 0.78);
      vec3 lc = mix(vec3(1.0, 0.6, 0.27), vec3(1.0, 0.72, 0.42), hash12(vec2(seed, wi + 3.0)));
      float grad = 0.7 + 0.5 * smoothstep(-ws.y, ws.y, wq.y) - 0.2 * abs(wq.x / ws.x);
      vec3 ic = lc * grad * 2.4 * lit + vec3(0.03, 0.04, 0.06) * (1.0 - lit);
      float curtain = smoothstep(ws.x * 0.55, ws.x * 0.75, abs(wq.x));
      ic = mix(ic, lc * lit * 0.9 * (0.8 + 0.2 * sin(wq.x * 60.0)), curtain);
      float bars = max(step(abs(wq.x), 0.025), step(abs(wq.y), 0.025));
      ic = mix(ic, vec3(0.5, 0.48, 0.45) * lightAt(p, n), bars);
      col = ic;
    }
  }
  // snow drift against the wall
  col = mix(col, vec3(0.8, 0.84, 0.9) * lightAt(p, vec3(0.0, 1.0, 0.0)), 1.0 - smoothstep(0.15, 0.45 + 0.2 * vnoise(vec2(u * 2.0, seed)), p.y));
  return col;
}
void main(){
  vec3 ro = uCamPos, rd = camRay(gl_FragCoord.xy);
  vec3 ird = 1.0 / mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
  vec3 col = sky(rd);
  float t = FAR; vec3 n = vec3(0.0); int hid = -1; bool roof = false; int kind = 0;
  float rxz = length(rd.xz), az = atan(rd.x, rd.z);
  // a dark forest of snowy firs far behind
  float D = 240.0;
  float y = ro.y + D * rd.y / rxz;
  float x = az * D;
  float cell = 6.0, ci = floor(x / cell), f = fract(x / cell) - 0.5;
  float top = 0.0;
  for (int k = -1; k <= 1; k++) {
    vec2 r = hash22(vec2(ci + float(k), 5.0));
    float th = 14.0 + 16.0 * r.x;
    float dx = abs(f - float(k) - (r.y - 0.5) * 0.6) * cell;
    top = max(top, th * (1.0 - dx / (th * 0.3)) + (vnoise(vec2(x * 1.6, 2.0)) - 0.5) * 2.0);
  }
  if (y < top) {
    float dd = D / rxz;
    float snowy = step(0.45, fract(y * 0.45 + vnoise(vec2(x * 0.9, y)) * 0.8));
    vec3 tc = mix(vec3(0.02, 0.03, 0.035), vec3(0.4, 0.45, 0.55), snowy * 0.5) * lightAt(vec3(0.0, y, dd), vec3(0.0, 1.0, 0.0)) * 1.6;
    col = mix(tc, sky(vec3(rd.x, 0.02, rd.z)), 1.0 - exp(-dd * (0.004 + uFog * 0.008 + uSnow * 0.004)));
    t = dd; kind = 3;
  }
  if (rd.y < 0.0) {
    float tg = -ro.y / rd.y;
    if (tg < t) { t = tg; n = vec3(0.0, 1.0, 0.0); kind = 1; }
  }
  int hn = int(uHN);
  for (int i = 0; i < 6; i++) {
    if (i >= hn) break;
    vec4 a = uHA[i], b = uHB[i];
    vec3 nn;
    vec2 tb = boxT(ro, ird, vec3(a.x, 0.0, a.y), vec3(a.z, b.x, a.w), nn);
    if (tb.x < tb.y && tb.x > 0.0 && tb.x < t) { t = tb.x; n = nn; hid = i; roof = false; kind = 2; }
    float zc = (a.y + a.w) * 0.5, W2 = (a.w - a.y) * 0.5 + 0.45, k = b.y / W2;
    vec2 tp = vec2(0.0, 1e9); vec3 rn = vec3(0.0);
    clipP(ro, rd, vec3(-1.0, 0.0, 0.0), -(a.x - 0.35), tp, rn);
    clipP(ro, rd, vec3(1.0, 0.0, 0.0), a.z + 0.35, tp, rn);
    clipP(ro, rd, vec3(0.0, -1.0, 0.0), -(b.x - 0.05), tp, rn);
    clipP(ro, rd, normalize(vec3(0.0, 1.0, k)), (b.x + b.y + k * zc) / length(vec3(0.0, 1.0, k)), tp, rn);
    clipP(ro, rd, normalize(vec3(0.0, 1.0, -k)), (b.x + b.y - k * zc) / length(vec3(0.0, 1.0, k)), tp, rn);
    if (tp.x < tp.y && tp.x > 0.0 && tp.x < t) { t = tp.x; n = rn; hid = i; roof = true; kind = 2; }
    // chimney
    vec2 tc = boxT(ro, ird, vec3(a.x + (a.z - a.x) * 0.7, b.x, zc - 0.35), vec3(a.x + (a.z - a.x) * 0.7 + 0.7, b.x + b.y + 1.1, zc + 0.35), nn);
    if (tc.x < tc.y && tc.x > 0.0 && tc.x < t) { t = tc.x; n = nn; hid = i; roof = false; kind = 4; }
  }
  // fence posts with snow caps, and the lantern post
  for (int i = 0; i < 20; i++) {
    float z = 6.0 + float(i) * 2.3;
    vec2 pc = vec2(-3.2 - z * 0.08, z);
    vec3 nn;
    vec2 tb = boxT(ro, ird, vec3(pc.x - 0.06, 0.0, pc.y - 0.06), vec3(pc.x + 0.06, 1.15, pc.y + 0.06), nn);
    if (tb.x < tb.y && tb.x > 0.0 && tb.x < t) { t = tb.x; n = nn; kind = 5; }
    tb = boxT(ro, ird, vec3(pc.x - 0.035, 0.75, pc.y), vec3(pc.x + 0.035, 0.84, pc.y + 2.3), nn);
    if (i < 19 && tb.x < tb.y && tb.x > 0.0 && tb.x < t) { t = tb.x; n = nn; kind = 5; }
  }
  {
    vec3 nn;
    vec2 tb = boxT(ro, ird, uLampP.xyz - vec3(0.05, 3.3, 0.05), uLampP.xyz + vec3(0.05, -0.25, 0.05), nn);
    if (tb.x < tb.y && tb.x > 0.0 && tb.x < t) { t = tb.x; n = nn; kind = 5; }
    tb = boxT(ro, ird, uLampP.xyz - vec3(0.17, 0.25, 0.17), uLampP.xyz + vec3(0.17, 0.25, 0.17), nn);
    if (tb.x < tb.y && tb.x > 0.0 && tb.x < t) { t = tb.x; n = nn; kind = 6; }
  }
  vec3 p = ro + rd * t;
  if (kind == 1) {
    float lane = 1.0 - smoothstep(1.6, 2.6, abs(p.x - 1.5 - p.z * 0.06));
    float ruts = lane * (step(abs(abs(p.x - 1.5 - p.z * 0.06) - 0.8), 0.18)) * 0.25;
    vec3 sn = vec3(0.78, 0.83, 0.9) * (0.88 + 0.12 * vnoise(p.xz * 0.8)) * (1.0 - ruts - lane * 0.06);
    col = sn * lightAt(p, n) * 1.25;
    float sp = step(0.996, hash12(floor(p.xz * 40.0))) * (1.0 - smoothstep(0.0, 25.0, t));
    col += sp * (uLamp * 0.25 / (dot(uLampP.xyz - p, uLampP.xyz - p) + 2.0) + 0.06);
    // window glow on the snow in front of the houses
    for (int i = 0; i < 6; i++) {
      if (i >= hn) break;
      vec4 a = uHA[i];
      float dz = a.y - p.z;
      if (dz > 0.0 && dz < 6.0 && p.x > a.x - 1.0 && p.x < a.z + 1.0) col += vec3(1.0, 0.6, 0.3) * 0.1 * exp(-dz * 0.6) * (0.6 + 0.4 * sin(p.x * 1.3));
    }
  } else if (kind == 2) col = house(p, rd, n, hid, roof);
  else if (kind == 4) col = (n.y > 0.5 ? vec3(0.8, 0.84, 0.9) : vec3(0.18, 0.08, 0.06)) * lightAt(p, n);
  else if (kind == 5) col = (n.y > 0.5 ? vec3(0.8, 0.84, 0.9) : vec3(0.1, 0.08, 0.06)) * lightAt(p, n) * 1.2;
  else if (kind == 6) col = vec3(1.0, 0.62, 0.3) * 3.0;
  if (kind != 0 && kind != 3) col = mix(col, sky(vec3(rd.x, 0.02, rd.z)) * 0.95, 1.0 - exp(-t * (0.006 + uFog * 0.012 + uSnow * 0.008)));
  // chimney smoke drifting downwind
  for (int i = 0; i < 6; i++) {
    if (i >= hn) break;
    vec4 a = uHA[i], b = uHB[i];
    if (b.w > 50.0) continue;
    vec3 c0 = vec3(a.x + (a.z - a.x) * 0.7 + 0.35, b.x + b.y + 1.1, (a.y + a.w) * 0.5);
    float tc = dot(c0 - ro, rd);
    if (tc < 0.0 || tc > t) continue;
    vec3 q = ro + rd * tc - c0;
    float hgt = q.y;
    if (hgt < 0.0 || hgt > 14.0) continue;
    float drift = hgt * (0.25 + uWind * 0.9) + sin(hgt * 0.4 - uTime * 0.6) * 0.4;
    float w = 0.35 + hgt * 0.18;
    float dx = q.x - drift;
    float dens = exp(-dx * dx / (w * w)) * smoothstep(0.0, 0.6, hgt) * (1.0 - smoothstep(4.0, 14.0, hgt));
    dens *= smoothstep(0.35, 0.8, fbm(vec2(dx * 0.8, hgt * 0.7 - uTime * 0.5) + float(i)));
    col = mix(col, vec3(0.16, 0.18, 0.22) * (1.0 + uLamp.r * 0.05), dens * 0.6);
  }
  // the lantern's halo in the falling snow
  vec3 lv = uLampP.xyz - ro; float tl = dot(lv, rd);
  if (tl > 0.0 && tl < t + 0.5) {
    float d2 = dot(lv, lv) - tl * tl;
    col += uLamp * (0.004 / (0.05 + d2) + 0.0035 / (0.6 + sqrt(max(d2, 0.0)))) * (0.4 + uSnow);
  }
  o = vec4(col, min(t, FAR));
}
`;

  const FG = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform sampler2D uDepth;
uniform float uSnow, uWind, uGust;
uniform vec3 uLamp; uniform vec4 uLampP;
out vec4 o;
void main(){
  vec3 ro = uCamPos, rd = camRay(gl_FragCoord.xy);
  float depth = texelFetch(uDepth, ivec2(gl_FragCoord.xy), 0).a;
  vec3 R = uCamMat[0], U = uCamMat[1];
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 9; i++) {
    float d = 1.4 * pow(1.42, float(i));
    if (d > depth) break;
    vec3 p = ro + rd * d;
    vec2 q = vec2(dot(rd, R), dot(rd, U)) * d;
    float fall = uTime * (0.9 + 0.08 * float(i));
    q.y += fall;
    q.x -= uTime * (uWind * 1.5 + uGust) * 0.8;
    vec2 cell = vec2(0.32);
    q.x += sin(q.y * 1.3 + float(i)) * 0.15;
    vec2 g = q / cell; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    vec3 h = hash32(id + float(i) * 17.0);
    if (h.z > uSnow * 0.85) continue;
    vec2 c = (h.xy - 0.5) * 0.6;
    c.x += sin(uTime * (1.0 + h.z * 2.0) + h.x * 6.0) * 0.12;
    float px = 1.0 / (uRes.y * 0.5 / uTanHalf.y) * d / cell.x;
    float r = (0.035 + h.y * 0.03) / cell.x * 0.32;
    float s = 1.0 - smoothstep(r * 0.2, r + px * 1.5, length(f - c));
    vec3 lv = uLampP.xyz - p;
    vec3 L = vec3(0.13, 0.15, 0.2) + uLamp * 0.25 / (dot(lv, lv) + 0.6);
    acc.rgb += L * s * (1.0 - acc.a);
    acc.a += s * (1.0 - acc.a) * 0.85;
  }
  o = acc;
}
`;

  const HOUSES = [
    // x0, z0, x1, z1 | wall height, roof height, colour, seed (seed > 50: no smoke)
    [[8.5, 15, 15.5, 21], [4.3, 2.6, 0, 3]],
    [[-17, 30, -9.5, 37], [4.0, 2.4, 1, 7]],
    [[3, 54, 10, 61], [4.6, 2.8, 2, 11]],
    [[-31, 68, -23, 76], [3.8, 2.2, 3, 60]],
    [[24, 92, 38, 106], [5.5, 3.5, 0, 70]],
    [[-8, 120, 0, 127], [4.0, 2.4, 1, 14]],
  ];

  const scene = {
    id: 'snow',
    name: 'First Snow',
    sub: 'a village at blue hour, the fire lit',
    audio: 'snow',
    windSound: 0.6,
    dry: true,
    rainSound: 0,
    bokehBg: ['#1a2234', '#28304a', '#3a3c48'],
    defaults: { rain: 0, wind: 0.2, fog: 0.25, cond: 0.2, frost: 0.38, lightning: 0, snow: 0.6 },
    controls: ['wind', 'fog', 'cond', 'frost', 'snow'],
    snowGlass(e) {
      return e.snow * 0.5;
    },
    look: {
      frame: 'cross', material: 'white', wall: '#cbbca8', lamp: 0.75, candle: true, mug: true, plant: false,
      exposure: 0.85, sat: 1.0, contrast: 1.04, lift: [0.008, 0.009, 0.014], gain: [1.0, 0.99, 1.0],
      bloom: 0.05, halo: 0.9, dTyp: 30, reflStretch: 2, refl: 1, flowAng: 0,
    },

    init(R) {
      this.bg = R.G.program(W.SH.vert, BG, 'snowBg');
      this.fg = R.G.program(W.SH.vert, FG, 'snowFg');
      this.cam = { base: [0, 2.3, -0.5], yaw: 0.12, pitch: 0.0, fovY: 56 };
      const specs = [];
      for (let i = 0; i < 5; i++) specs.push({ name: 'p' + i, kind: 'pine', w: 300, h: 760, seed: 40 + i, o: { snow: 1, hue: 150 } });
      const at = W.kit.atlas(specs, 2048);
      const bb = (this.bb = new W.kit.Billboards(R, at.canvas));
      const r = W.rng(9);
      const free = (x, z) => !HOUSES.some(([a]) => x > a[0] - 4 && x < a[2] + 4 && z > a[1] - 3 && z < a[3] + 6);
      let n = 0;
      while (n < 70) {
        const z = r.range(25, 200), x = r.range(-1, 1) * (20 + z * 0.8);
        if (!free(x, z) || Math.abs(x - 1.5 - z * 0.06) < 4) continue;
        bb.add(x, 0, z, at.rects['p' + r.int(0, 4)], r.range(8, 20), 0.35, r.range(0.85, 1.1));
        n++;
      }
      bb.add(-7.5, 0, 12, at.rects.p1, 9, 0.4, 1);
      bb.add(19, 0, 26, at.rects.p3, 12, 0.4, 1);
      bb.upload(this.cam.base);
      this.HA = new Float32Array(24);
      this.HB = new Float32Array(24);
      HOUSES.forEach(([a, b], i) => {
        this.HA.set(a, i * 4);
        this.HB.set(b, i * 4);
      });
      this.lampP = [3.2, 3.4, 18.5, 1];
      // string lights sagging along the eave of the nearest house
      this.bulbs = [];
      const h = HOUSES[0][0], hb = HOUSES[0][1];
      for (let x = h[0] - 0.2; x <= h[2] + 0.2; x += 0.42) {
        const u = (x - h[0]) / (h[2] - h[0]);
        this.bulbs.push([x, hb[0] - 0.15 - Math.sin(u * Math.PI * 3) ** 2 * 0.25, h[1] - 0.5, r() * 6]);
      }
      const h2 = HOUSES[1][0], hb2 = HOUSES[1][1];
      for (let x = h2[0]; x <= h2[2]; x += 0.5) this.bulbs.push([x, hb2[0] - 0.2 - Math.sin(((x - h2[0]) / (h2[2] - h2[0])) * Math.PI * 2) ** 2 * 0.3, h2[1] - 0.5, r() * 6, 1]);
      this.near = [];
      for (let i = 0; i < 40; i++) this.near.push([r.range(-1.6, 1.6), r.range(0, 3.5), r.range(0.9, 2.2), r() * 10, r.range(0.7, 1.3)]);
    },

    update(dt, t, env, R) {
      const L = R.lights;
      const lk = W.kelvin(2100);
      this.lamp = W.scale3(lk, 14);
      L.add(this.lampP[0], this.lampP[1], this.lampP[2], 0.14, lk[0] * 260, lk[1] * 260, lk[2] * 260, 1.2);
      const warm = W.kelvin(2600);
      const pal = [[1, 0.35, 0.12], [1, 0.75, 0.25], [0.3, 0.75, 0.35], [0.25, 0.45, 1]];
      for (const b of this.bulbs) {
        const tw = 0.85 + 0.15 * Math.sin(t * 1.3 + b[3] * 3);
        const c = b[4] ? pal[Math.floor(b[3]) % 4] : warm;
        L.add(b[0], b[1], b[2], 0.035, c[0] * 70 * tw, c[1] * 70 * tw, c[2] * 70 * tw, 0.5);
      }
      // window light for the blurred view
      HOUSES.forEach(([a, b], i) => {
        const wd = a[2] - a[0], nw = Math.max(1, Math.floor(wd / 3.2));
        for (let k = 0; k < nw; k++) {
          L.add(a[0] + (k + 0.5) * (wd / nw), b[0] * 0.45, a[1] - 0.1, 0.6, 2.6, 1.6, 0.8, 0, 3);
        }
      });
      // big flakes right outside the glass, lit by the room
      const room = 0.6;
      for (const f of this.near) {
        f[1] -= dt * 0.55 * f[4];
        f[0] += Math.sin(t * 0.7 + f[3]) * dt * 0.2 + env.gust * dt * 0.6;
        if (f[1] < -1.2) { f[1] = 3.6; f[0] = (Math.random() - 0.5) * 3.2; }
        if (f[0] > 1.8) f[0] = -1.8;
        const k = room * env.snow * 1.2;
        L.add(f[0] + R.cam.pos[0], f[1] + 0.6, f[2] + 1.2, 0.008, 16 * k, 14.5 * k, 12 * k, 0);
      }
    },

    render(R, t, dt, P) {
      const e = P.env;
      this.bg.use().set(R.camUniforms()).set({
        uTime: t, uHA: this.HA, uHB: this.HB, uHN: HOUSES.length, uSnow: e.snow, uWind: e.wind, uFog: e.fog, uGust: e.gust, uFlash: e.flash,
        uLamp: this.lamp, uLampP: this.lampP,
      });
      R.G.drawFS();
      this.bb.draw(t, {
        gust: e.gust * 0.5, wind: e.wind * 0.5, flutter: 0.2,
        amb: [0.1, 0.12, 0.17], sun: [0.04, 0.05, 0.08], fogCol: [0.075, 0.09, 0.13], fogD: 0.006 + e.fog * 0.012 + e.snow * 0.008,
      }, true);
      const dc = R.depthCopy();
      const gl = R.gl;
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      this.fg.use().set(R.camUniforms()).set({ uTime: t, uDepth: dc, uSnow: e.snow, uWind: e.wind, uGust: e.gust, uLamp: this.lamp, uLampP: this.lampP });
      R.G.drawFS();
      gl.disable(gl.BLEND);
    },
  };

  (W.scenes = W.scenes || []).push(scene);
})();

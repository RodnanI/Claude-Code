// The Orrery Engine: a colossal clockwork orrery suspended in an endless
// rotunda of arcaded galleries. Everything is analytic (ray/plane, ray/cylinder,
// ray/sphere, ray/segment) and composited front to back with box-filtered
// coverage so fine engraving stays stable in motion.
// Timing: every rotation is an integer number of turns (or of tooth pitches
// matching the part's symmetry) per 120 s loop.
ASCII.registerScene({
  id: 'orrery',
  name: 'The Orrery Engine',
  tagline: 'clockwork heavens in an endless hall',
  loop: 120,
  bg: '#0a0806',
  palettes: [
    {
      name: 'Lamplit Brass',
      colors: {
        uBrass: '#d6a248', uBrassHi: '#ffe0a0', uVerd: '#4fa088', uIron: '#8a6440',
        uLamp: '#ffc070', uBeam: '#fff0d0', uStone: '#a08060', uAmb: '#3a2818',
      },
    },
    {
      name: 'Verdigris Vault',
      bg: '#060908',
      colors: {
        uBrass: '#86b894', uBrassHi: '#e8f4cc', uVerd: '#3c9a80', uIron: '#4c6c5c',
        uLamp: '#ffbd6a', uBeam: '#eef6dc', uStone: '#6e8476', uAmb: '#14261f',
      },
    },
    {
      name: 'Sepia Etching',
      bg: '#0e0b08',
      colors: {
        uBrass: '#dcc6a0', uBrassHi: '#fff6e0', uVerd: '#a89070', uIron: '#8a7254',
        uLamp: '#ffe8c4', uBeam: '#fff8ea', uStone: '#c8b290', uAmb: '#2a2218',
      },
      look: { saturation: 0.5 },
    },
  ],
  glyphSets: {
    1: { edge: " .,'-_:;|/\\()[]<>=+*!^~", tone: ' .:-=+*#' },
    2: { edge: " .,'`-_:;|/\\()[]{}<>=+*#%!^~", tone: ' .:-=+*#%' },
    3: { edge: " .,'-_:;|/\\[]=+!^~\"", tone: ' .:-=+' },
    4: { edge: " .'`,*+:", tone: " .'`" },
    5: { edge: " .,'-_|()[]{}<>0oO8=:", tone: ' .:-=o0' },
    6: { edge: " .,'-_|/\\()<>*+=#%@^~", tone: ' .:-=+*#%@' },
    7: { edge: " .,'-_:;|/\\()<>oO0@*+=#%", tone: ' .:-=+*o#%@' },
    8: { edge: " .'*+o", tone: ' .*+' },
  },
  defaults: { detail: 1, atmosphere: 0.5, camera: 0.5 },
  glsl: `
// ------------------------------------------------------------------ globals
vec3 gRo, gF, gR, gU;      // render camera (with drift)
vec3 bRo, bF, bR, bU;      // base camera (no drift) used to place props
float gFoc, gPix;          // focal length, angular size of one sub-cell sample
vec2 gP, gCell;
vec4 Lc0, Lc1, Lc2;        // layer colour + coverage, sorted near to far
vec2 Lt0, Lt1, Lt2;        // layer (t, material)
vec3 LB, gB1, gB2;         // light shaft direction and cross-section basis
vec3 kBrass, kHi, kVerd, kIron, kLamp, kBeam, kStone, kAmb;   // unit-luma palette tints
vec3 tint(vec3 c){ return c / max(luma(c), 1e-4); }

void addL(float t, vec3 c, float a, float m){
  if (a < 0.004 || t <= 0.0) return;
#ifdef DEBUGMAT
  c = m == 1.0 ? vec3(1.0, 0.8, 0.1) : m == 2.0 ? vec3(1.0, 0.1, 0.1) : m == 3.0 ? vec3(0.15) : m == 6.0 ? vec3(2.0) : m == 7.0 ? vec3(0.1, 1.0, 0.2) : vec3(0.2, 0.4, 1.0);
#endif
  vec4 C = vec4(c, min(a, 1.0)); vec2 T = vec2(t, m);
  if (t < Lt0.x) { Lc2 = Lc1; Lt2 = Lt1; Lc1 = Lc0; Lt1 = Lt0; Lc0 = C; Lt0 = T; }
  else if (t < Lt1.x) { Lc2 = Lc1; Lt2 = Lt1; Lc1 = C; Lt1 = T; }
  else if (t < Lt2.x) { Lc2 = C; Lt2 = T; }
}

// box-filtered coverage of the strip |x| < hw for a filter of width fw
float cov1(float x, float hw, float fw){ float lo = max(-hw, x - 0.5 * fw), hi = min(hw, x + 0.5 * fw); return max(hi - lo, 0.0) / fw; }
float aa(float d, float fw){ return sat(0.5 - d / fw); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

vec2 proj(vec3 w){ vec3 v = w - gRo; float z = dot(v, gF); return gFoc * vec2(dot(v, gR), dot(v, gU)) / z; }
vec2 cellOf(vec2 p){ vec2 cp = p * (0.5 * uCanvasPx.y) + 0.5 * uCanvasPx; return floor((cp + 0.5 * (uGridPx - uCanvasPx)) / uCellPx); }
vec3 scr2w(vec2 s, float z){ return bRo + bF * z + (s.x * bR + s.y * bU) * (z / gFoc); }

// ------------------------------------------------------------------ light
// central sun-lamp at the origin, soft linear falloff
vec3 lampL(vec3 P, out vec3 l){ float d = length(P); l = -P / d; return kLamp * (6.5 / (d + 1.0)); }
float beamMask(vec3 P){
  vec3 q = P - vec3(-3.5, 5.0, 2.0);
  vec2 s = vec2(dot(q, gB1), dot(q, gB2));
  vec2 e = vec2(2.9, 2.1) - abs(s);
  float m = sat(min(e.x, e.y) / 0.3);
  vec2 g = abs(fract(s / vec2(1.93, 1.4) + 0.5) - 0.5) * vec2(1.93, 1.4);
  m *= sat((min(g.x, g.y) - 0.06) / 0.05);
  return m;
}
// polished metal: lamp + sky fill + beam + bounce
vec3 shadeMetal(vec3 P, vec3 n, vec3 rd, vec3 alb, float spec, float shin){
  vec3 l; vec3 Li = lampL(P, l);
  float dif = max(dot(n, l), 0.0);
  float sp = pow(max(dot(n, normalize(l - rd)), 0.0), shin);
  vec3 c = Li * (alb * dif + mix(alb, kHi * 0.6, 0.5) * sp * spec);
  float bm = beamMask(P);
  float fd = max(dot(n, -LB), 0.0);
  float fs = pow(max(dot(n, normalize(-LB - rd)), 0.0), shin);
  c += kBeam * (0.22 + 2.2 * bm) * (alb * fd + kHi * fs * spec * 0.4);
  c += alb * kAmb * 0.06;
  return c;
}

// ------------------------------------------------------------------ text
const int ROM[48] = int[48](73,0,0,0, 73,73,0,0, 73,73,73,0, 73,86,0,0, 86,0,0,0, 86,73,0,0,
                            86,73,73,0, 86,73,73,73, 73,88,0,0, 88,0,0,0, 88,73,0,0, 88,73,73,0);
const int ROML[12] = int[12](1,2,3,2,1,2,3,4,2,1,2,3);
int labelLen(int style, int k){
  if (style == 0) { int v = abs(((k * 30 + 90) % 180) - 90); return v < 10 ? 1 : 2; }
  if (style == 1) return ROML[k % 12];
  int v = (k % 12) * 30; return v < 10 ? 1 : (v < 100 ? 2 : 3);
}
int labelChar(int style, int k, int i){
  if (style == 0) { int v = abs(((k * 30 + 90) % 180) - 90); if (v < 10) return 48 + v; return i == 0 ? 48 + v / 10 : 48 + v % 10; }
  if (style == 1) return ROM[(k % 12) * 4 + i];
  int v = (k % 12) * 30; int n = v < 10 ? 1 : (v < 100 ? 2 : 3);
  int dgt = n - 1 - i; int q = v; for (int j = 0; j < 3; j++) { if (j >= dgt) break; q /= 10; }
  return 48 + q % 10;
}
// forced-glyph material when the current sample's cell belongs to the label anchored at A
float labelAt(vec3 A, int style, int k){
  vec2 ac = cellOf(proj(A));
  if (ac.y != gCell.y) return 0.0;
  int n = labelLen(style, k);
  int i = int(gCell.x - ac.x) + (n - 1) / 2;
  if (i < 0 || i >= n) return 0.0;
  return float(16 + labelChar(style, k, i) - 32);
}

// ------------------------------------------------------------------ rings
// washer: flat annulus in the local xz plane of frame M (columns = local axes in world)
// style < 0: ticks only; style >= 0: ticks + numerals every 30 degrees
void washer(vec3 ro, vec3 rd, mat3 M, float rIn, float rOut, float hh, float spin, int style, vec3 alb){
  vec3 o = ro * M, d = rd * M;
  float wdt = rOut - rIn;
  float fy = o.y > 0.0 ? hh : -hh;
  if (abs(d.y) > 1e-5) {
    float t = (fy - o.y) / d.y;
    if (t > 0.0) {
      vec3 h = o + d * t;
      float r = length(h.xz);
      float cosv = abs(d.y);
      float fw = gPix * t / max(cosv, 0.06);
      float a = cov1(r - 0.5 * (rIn + rOut), 0.5 * wdt, fw);
      if (a > 0.004) {
        vec3 P = M * h;
        vec3 n = M * vec3(0.0, sign(fy), 0.0);
        float s = (r - rIn) / wdt;
        float phi = atan(h.z, h.x) - spin;
        float pm = phi / (TAU / 72.0);
        float dm = abs(fract(pm + 0.5) - 0.5) * (TAU / 72.0) * r;
        float pM = phi / (TAU / 12.0);
        float kM = floor(pM + 0.5);
        float dM = abs(pM - kM) * (TAU / 12.0) * r;
        float fwl = gPix * t / max(cosv, 0.25);
        float tick = cov1(dm, 0.02, fwl) * step(0.62, s) * step(s, 0.9);
        tick = max(tick, cov1(dM, 0.028, fwl) * step(0.3, s) * step(s, 0.9));
        float rim = max(cov1(s - 0.9, 0.035, fw / wdt), cov1(s - 0.1, 0.03, fw / wdt));
        float bev = max(cov1(s - 0.985, 0.03, fw / wdt), cov1(s - 0.015, 0.03, fw / wdt));
        float eng = max(tick, rim);
        vec3 base = shadeMetal(P, n, rd, alb, 0.6, 24.0);
        vec3 l; vec3 Li = lampL(P, l);
        float lit = luma(Li) * max(dot(n, l), 0.0);
        vec3 c = base * (1.0 - 0.5 * eng) + kHi * eng * (0.12 + 0.55 * lit);
        c += kHi * bev * (0.08 + 0.3 * lit);
        float mat = 1.0;
        if (style >= 0 && s > 0.12 && s < 0.6 && dM < 0.45) {
          vec3 A = M * (vec3(cos(kM * TAU / 12.0 + spin), 0.0, sin(kM * TAU / 12.0 + spin)) * (rIn + 0.36 * wdt) + vec3(0.0, fy, 0.0));
          float fm = labelAt(A, style, int(mod(kM, 12.0)));
          if (fm > 0.0) { mat = fm; c = kHi * (0.3 + 0.8 * lit) + base * 0.3; }
        }
        addL(t, c, a, mat);
      }
    }
  }
  // outer and inner rims (thin cylinder walls), visible when the ring is near edge-on
  float A2 = dot(d.xz, d.xz), B2 = dot(o.xz, d.xz), oo = dot(o.xz, o.xz);
  float disc = B2 * B2 - A2 * (oo - rOut * rOut);
  if (disc > 0.0) {
    float t = (-B2 - sqrt(disc)) / A2;
    if (t > 0.0) {
      vec3 h = o + d * t;
      float a = cov1(h.y, hh, gPix * t);
      if (a > 0.004) {
        vec3 n = M * vec3(h.x, 0.0, h.z) / rOut;
        addL(t, shadeMetal(M * h, n, rd, alb, 0.9, 30.0), a, 1.0);
      }
    }
    float di = B2 * B2 - A2 * (oo - rIn * rIn);
    if (di > 0.0) {
      float t2 = (-B2 + sqrt(di)) / A2;
      vec3 h = o + d * t2;
      float a = cov1(h.y, hh, gPix * t2);
      if (t2 > 0.0 && a > 0.004) {
        vec3 n = -M * vec3(h.x, 0.0, h.z) / rIn;
        addL(t2, shadeMetal(M * h, n, rd, alb, 0.9, 30.0), a, 1.0);
      }
    }
  }
}

// band: cylindrical strip (axis local y), radius R, half-height hw; numerals on the outside
void band(vec3 ro, vec3 rd, mat3 M, float R, float hw, float spin, int style, vec3 alb){
  vec3 o = ro * M, d = rd * M;
  float A2 = dot(d.xz, d.xz), B2 = dot(o.xz, d.xz), oo = dot(o.xz, o.xz);
  float disc = B2 * B2 - A2 * (oo - R * R);
  if (disc <= 0.0) return;
  float sq = sqrt(disc);
  for (int side = 0; side < 2; side++) {
    float t = side == 0 ? (-B2 - sq) / A2 : (-B2 + sq) / A2;
    if (t <= 0.0) continue;
    vec3 h = o + d * t;
    float a = cov1(h.y, hw, gPix * t);
    if (a < 0.004) continue;
    vec3 nl = vec3(h.x, 0.0, h.z) / R;
    float cosv = abs(dot(d, nl));
    float fw = gPix * t / max(cosv, 0.06);
    vec3 P = M * h;
    vec3 n = M * (side == 0 ? nl : -nl);
    float phi = atan(h.z, h.x) - spin;
    float v = h.y / hw;
    float fwv = gPix * t / hw;
    float pm = phi / (TAU / 72.0);
    float dm = abs(fract(pm + 0.5) - 0.5) * (TAU / 72.0) * R;
    float pM = phi / (TAU / 12.0);
    float dM = abs(pM - floor(pM + 0.5)) * (TAU / 12.0) * R;
    float tick = cov1(dm, 0.02, fw) * step(0.45, v) * step(v, 0.85);
    tick = max(tick, cov1(dM, 0.028, fw) * step(-0.85, v) * step(v, 0.85));
    float rim = max(cov1(v - 0.88, 0.05, fwv), cov1(v + 0.88, 0.05, fwv));
    float eng = max(tick, rim);
    vec3 base = shadeMetal(P, n, rd, alb, 0.7, 20.0);
    vec3 l; vec3 Li = lampL(P, l);
    float lit = luma(Li) * max(dot(n, l), 0.0);
    vec3 c = base * (1.0 - 0.5 * eng) + kHi * eng * (0.12 + 0.55 * lit);
    float mat = 1.0;
    if (side == 0 && style >= 0 && v > -0.75 && v < 0.35 && dM > 0.06) {
      float kk = floor(pM);
      float ak = (kk + 0.5) * TAU / 12.0 + spin;
      vec3 A = M * vec3(cos(ak) * R, -0.2 * hw, sin(ak) * R);
      float fm = labelAt(A, style, int(mod(kk, 12.0)));
      if (fm > 0.0) { mat = fm; c = kHi * (0.3 + 0.8 * lit) + base * 0.3; }
    }
    addL(t, c, a, mat);
  }
}

// ------------------------------------------------------------------ primitives
void sphereL(vec3 ro, vec3 rd, vec3 C, float r, out float tHit, out float a, out vec3 n){
  vec3 oc = C - ro;
  float tc = dot(oc, rd);
  vec3 cp = ro + rd * tc - C;
  float d = length(cp);
  float fw = gPix * max(tc, 0.01);
  a = sat((r + 0.5 * fw - d) / fw);
  float hsq = r * r - d * d;
  tHit = tc - sqrt(max(hsq, 0.0));
  n = hsq > 0.0 ? normalize(ro + rd * tHit - C) : normalize(cp);
}
// closest approach between the ray and segment ab: (distance, t along ray, s along segment)
vec3 raySeg(vec3 ro, vec3 rd, vec3 a, vec3 b){
  vec3 ba = b - a, w = ro - a;
  float bb = dot(ba, ba), bd = dot(ba, rd), dw = dot(rd, w), bw = dot(ba, w);
  float den = max(bb - bd * bd, 1e-6);
  float s = sat((bw - bd * dw) / den);
  float t = dot(a + ba * s - ro, rd);
  vec3 q = ro + rd * t - (a + ba * s);
  return vec3(length(q), t, s);
}
void rod(vec3 ro, vec3 rd, vec3 a, vec3 b, float r, vec3 alb, float mat){
  vec3 q = raySeg(ro, rd, a, b);
  if (q.y <= 0.0) return;
  float cv = cov1(q.x, r, gPix * q.y);
  if (cv < 0.004) return;
  vec3 ba = normalize(b - a);
  vec3 P = ro + rd * q.y;
  vec3 radial = P - (a + (b - a) * q.z); radial -= ba * dot(radial, ba);
  float rl = length(radial);
  vec3 n = rl > 1e-5 ? radial / rl : -rd;
  n = normalize(n * min(rl / r, 1.0) - rd * sqrt(max(1.0 - rl * rl / (r * r), 0.0)));
  addL(q.y - sqrt(max(r * r - q.x * q.x, 0.0)), shadeMetal(P, n, rd, alb, 1.0, 28.0), cv, mat);
}

// ------------------------------------------------------------------ gears
// 2D spur gear: q relative to centre, pitch radius R, N teeth, rotation a, S spokes
float gearSD(vec2 q, float R, float N, float a, float S){
  float r = length(q);
  float ang = atan(q.y, q.x) - a;
  float pitch = TAU / N;
  float al = (fract(ang / pitch + 0.5) - 0.5) * pitch;
  float m = 2.0 * R / N;
  float rTip = R + m, rRoot = R - 1.25 * m;
  float hw = max(0.25 * pitch * R + (R - r) * 0.45, 0.0);
  float d = min(r - rRoot, max(abs(al) * r - hw, r - rTip));
  float rRim = rRoot - 1.8 * m - 0.05 * R;
  float rHub = 0.22 * R;
  float sp = TAU / S;
  float as = (fract(ang / sp + 0.5) - 0.5) * sp;
  float swd = 0.045 * R + 0.06 * (rRim - r);
  float dW = max(max(rHub + 0.04 * R - r, r - rRim), swd - abs(as) * r);
  d = max(d, -dW);
  return max(d, 0.05 * R - r);
}
// extruded gear in plane (centre G, axes U, V, normal W toward camera), thickness th
void gearL(vec3 ro, vec3 rd, vec3 G, vec3 U, vec3 V, vec3 W, float R, float N, float a, float S, float th, vec3 alb){
  vec3 o = ro - G;
  float dz = dot(rd, W);
  if (abs(dz) < 1e-4) return;
  float oz = dot(o, W);
  float tf = (0.5 * th - oz) / dz, tb = (-0.5 * th - oz) / dz;
  if (tf > tb) { float tmp = tf; tf = tb; tb = tmp; }
  if (tb <= 0.0) return;
  vec2 qf = vec2(dot(o + rd * tf, U), dot(o + rd * tf, V));
  vec2 qb = vec2(dot(o + rd * tb, U), dot(o + rd * tb, V));
  float rT = R + 2.0 * R / N + 0.05;
  if (min(length(qf), length(qb)) > rT) return;
  float fw = gPix * tf / max(abs(dz), 0.2);
  float df = gearSD(qf, R, N, a, S);
  float af = aa(df, fw);
  vec3 col = vec3(0.0); float acc = 0.0;
  if (af > 0.004) {
    vec3 P = ro + rd * tf;
    float e = 0.012 + fw;
    vec2 gq = vec2(gearSD(qf + vec2(e, 0.0), R, N, a, S) - df, gearSD(qf + vec2(0.0, e), R, N, a, S) - df);
    vec2 g2 = gq / max(length(gq), 1e-6);
    float bev = sat(1.0 + df / (0.035 + fw));
    vec3 n = normalize(W + (U * g2.x + V * g2.y) * 1.6 * bev);
    float r = length(qf);
    float turn = 0.5 + 0.5 * cos(r * 90.0);
    float fade = sat(1.0 - fw * 18.0);
    col += shadeMetal(P, n, rd, alb * (0.85 + 0.15 * mix(0.5, turn, fade)), 1.3, 18.0) * af;
    acc += af;
  }
  if (acc < 0.996) {
    float dPrev = df;
    for (int i = 1; i <= 3; i++) {
      float f = float(i) / 3.0;
      float dd = gearSD(mix(qf, qb, f), R, N, a, S);
      if (dd < 0.0) {
        float fr = (float(i) - 1.0 + dPrev / max(dPrev - dd, 1e-5)) / 3.0;
        vec2 qs = mix(qf, qb, fr);
        float d0 = gearSD(qs, R, N, a, S);
        vec2 gq = vec2(gearSD(qs + vec2(0.01, 0.0), R, N, a, S) - d0, gearSD(qs + vec2(0.0, 0.01), R, N, a, S) - d0);
        vec2 g2 = gq / max(length(gq), 1e-6);
        vec3 c = shadeMetal(ro + rd * mix(tf, tb, fr), U * g2.x + V * g2.y, rd, alb, 1.5, 14.0);
        float as = (1.0 - acc) * sat(-dd / (fw * 0.5) + 0.5);
        col += c * as; acc += as;
        break;
      }
      dPrev = dd;
    }
  }
  if (acc > 0.004) addL(tf, col / acc, acc, 2.0);
}

// ------------------------------------------------------------------ hall
const float RW = 26.0, RBK = 29.0, NBAY = 28.0, TIER = 7.2;
float cylExit(vec3 o, vec3 d, float R){ vec2 a = o.xz, b = d.xz; float A = dot(b, b), B = dot(a, b), C = dot(a, a) - R * R; return (-B + sqrt(max(B * B - A * C, 0.0))) / A; }
float dOpening(vec2 q){ float uo = abs(q.x), v = q.y; return v < 4.3 ? max(uo - 1.75, 0.3 - v) : length(vec2(uo, v - 4.3)) - 1.75; }

vec3 hall(vec3 ro, vec3 rd, out float tw){
  float bayA = TAU / NBAY;
  float bw = bayA * RW;
  float t1 = cylExit(ro, rd, RW);
  vec3 P = ro + rd * t1;
  tw = t1;
  float th = atan(P.z, P.x);
  float bi = floor(th / bayA + 0.5);
  float ti = floor(P.y / TIER);
  vec2 q = vec2((th - bi * bayA) * RW, P.y - ti * TIER);
  vec3 nW = -vec3(P.x, 0.0, P.z) / RW;
  float fw = gPix * t1 / max(abs(dot(rd, nW)), 0.3);
  float dist = length(vec2(RW, P.y));
  float ly = -P.y / dist;                 // + when the lamp is above this point
  float Lw = 1.5 * exp(-abs(P.y) / 13.0) * (0.35 + 0.65 * RW / dist);
  float beam = beamMask(P) * max(dot(nW, -LB), 0.0);
  float uo = abs(q.x), v = q.y;
  vec3 sAlb = kStone * 0.5;
  // ---- front surface
  float dOpen = dOpening(q);
  float dRail = min(abs(v - 1.27) - 0.08, abs(v - 0.38) - 0.07);
  float bx = (fract(q.x / 0.4 + 0.5) - 0.5) * 0.4;
  float prof = 0.04 + 0.05 * sat(1.0 - abs(v - 0.72) / 0.28);
  float dBal = max(abs(bx) - prof, abs(v - 0.82) - 0.44);
  float dB = max(min(dRail, dBal), uo - 1.75);
  float aOpen = aa(dOpen, fw);
  float aBal = aa(dB, fw);
  float solid = 1.0 - aOpen * (1.0 - aBal);
  float pil = aa(max(abs(uo - 0.5 * bw) - 0.5, max(0.3 - v, v - 4.1)), fw);
  float flute = cov1(abs(fract((uo - 0.5 * bw) / 0.25 + 0.5) - 0.5) * 0.25, 0.03, fw) * pil * step(0.6, v) * step(v, 3.9);
  float imp = aa(max(abs(v - 4.2) - 0.1, 1.75 - uo), fw);
  float rr = length(vec2(uo, v - 4.3));
  float arc = aa(max(abs(rr - 1.95) - 0.2, 4.3 - v), fw);
  float vang = atan(v - 4.3, q.x);
  float vous = cov1(abs(fract(vang / (PI / 11.0) + 0.5) - 0.5) * (PI / 11.0) * rr, 0.025, fw) * arc;
  float key = aa(max(abs(q.x) - 0.24, abs(rr - 2.0) - 0.34), fw) * step(4.3, v);
  float ent = step(TIER - 1.05, v);
  float vt = v - (TIER - 1.05);
  float dent = cov1(abs(fract(q.x / 0.34 + 0.5) - 0.5) * 0.34, 0.08, fw) * step(0.3, vt) * step(vt, 0.55);
  float rel = max(max(pil, imp), max(arc, key));
  rel = max(rel, ent * (0.6 + 0.4 * step(0.68, vt)));
  rel = max(rel, step(v, 0.3) * 0.7);
  // horizontal edges catch the lamp from above (lower tiers) or below (upper tiers)
  float hTop = cov1(v - 4.3, 0.03, fw) * step(1.75, uo) + cov1(v - TIER, 0.04, fw) + cov1(v - (TIER - 0.37), 0.03, fw) + cov1(v - 0.3, 0.03, fw);
  float hBot = cov1(v - 4.1, 0.03, fw) * step(1.75, uo) + cov1(v - (TIER - 1.05), 0.04, fw) + cov1(v - (TIER - 0.37), 0.03, fw);
  float edge = max(ly, 0.0) * hTop + max(-ly, 0.0) * hBot;
  edge += 0.35 * cov1(abs(uo - 0.5 * bw) - 0.5, 0.03, fw) * step(0.3, v) * step(v, 4.1);
  float railTop = cov1(v - 1.35, 0.03, fw) * step(uo, 1.75) * max(ly, 0.15);
  vec3 front = sAlb * kLamp * Lw * (0.12 + 0.45 * rel - 0.12 * flute - 0.12 * vous - 0.15 * dent);
  front += kLamp * sAlb * Lw * 2.0 * edge;
  front += kHi * Lw * railTop * 0.6;
  front += kBeam * sAlb * (0.2 * max(dot(nW, -LB), 0.0) + 2.5 * beam) * (0.5 + 0.5 * rel);
  // ---- inside the opening: recess back wall, reveals, gallery floor
  vec3 inner = vec3(0.0);
  if (aOpen > 0.004) {
    float t2 = cylExit(ro, rd, RBK);
    vec3 P2 = ro + rd * t2;
    float th2 = atan(P2.z, P2.x);
    vec2 q2 = vec2((th2 - bi * bayA) * RW, P2.y - ti * TIER);
    float dIn = dOpening(q2);
    float hb = hashi(ivec2(int(bi) + 64, int(ti) + 64));
    float lampOn = step(hb, 0.22);
    float flick = 0.8 + 0.2 * vnoise(vec2(uPhase * 40.0, hb * 50.0), ivec2(40, 0));
    vec3 lampC = kLamp * lampOn * flick;
    if (dIn < 0.0) {
      float door = aa(max(abs(q2.x) - 0.75, q2.y - 2.7), gPix * t2);
      float ld = length(q2 - vec2(0.0, 2.9));
      inner = sAlb * (kLamp * Lw * 0.06 + lampC * 0.8 / (1.0 + ld * ld * 1.5)) * (1.0 - 0.85 * door);
    } else {
      bool soffit = q2.y > 4.3;
      bool floorG = q2.y < 0.3;
      float lr = soffit ? max(-ly, 0.0) : (floorG ? max(ly, 0.0) : 0.1);
      inner = sAlb * kLamp * Lw * (0.1 + 0.8 * lr) + sAlb * lampC * 0.3;
    }
    vec2 lq = q - vec2(0.0, 2.9);
    float lb = lampOn * aa(length(lq * vec2(1.0, 0.75)) - 0.13, fw);
    float lch = lampOn * cov1(q.x, 0.015, fw) * step(3.0, v) * step(v, 6.0);
    inner += kLamp * flick * 1.5 * lb + kIron * 0.2 * Lw * lch;
  }
  return mix(inner, front, solid);
}

// ------------------------------------------------------------------ orrery
const float PL_R[5] = float[5](4.4, 5.15, 5.95, 6.8, 7.7);
const float PL_S[5] = float[5](0.16, 0.24, 0.27, 0.21, 0.5);
const float PL_N[5] = float[5](8.0, 5.0, 3.0, 2.0, 1.0);
const float PL_O[5] = float[5](0.1, 0.55, 0.3, 0.8, 0.62);

void planets(vec3 ro, vec3 rd){
  vec3 brass = kBrass * 0.55;
  for (int k = 0; k < 5; k++) {
    float ang = TAU * (PL_N[k] * uPhase + PL_O[k]);
    vec3 pc = vec3(cos(ang), 0.0, sin(ang)) * PL_R[k];
    float yArm = -3.75 - 0.32 * float(k);
    vec3 elbow = vec3(pc.x, yArm, pc.z);
    rod(ro, rd, vec3(0.0, yArm, 0.0), elbow, 0.045, brass, 1.0);
    rod(ro, rd, elbow, pc - vec3(0.0, PL_S[k], 0.0), 0.035, brass, 1.0);
    float tH, a; vec3 n;
    sphereL(ro, rd, pc, PL_S[k], tH, a, n);
    if (a > 0.004 && tH > 0.0) {
      vec3 P = ro + rd * tH;
      vec3 l; vec3 Li = lampL(P, l);
      float dif = max(dot(n, l), 0.0);
      float lat = asin(clamp(n.y, -1.0, 1.0));
      float fwl = gPix * tH / PL_S[k];
      float bands = k == 4 ? cov1(abs(fract(lat * 3.2) - 0.5), 0.12, fwl * 3.2) : 0.0;
      vec3 pal = (k == 2 ? kVerd : (k == 3 ? mix(kBrass, vec3(1.6, 0.5, 0.2), 0.5) : kBrass)) * 0.7;
      vec3 c = Li * pal * dif * (1.0 - 0.45 * bands) * 1.6 + pal * kAmb * 0.08;
      c += Li * kHi * pow(max(dot(n, normalize(l - rd)), 0.0), 30.0) * 0.6;
      c += kBeam * pal * (0.2 + 2.0 * beamMask(P)) * max(dot(n, -LB), 0.0);
      addL(tH, c, a, 7.0);
    }
    if (k == 4) washer(ro - pc, rd, rotZ(0.45) * rotX(0.25), PL_S[k] * 1.4, PL_S[k] * 2.15, 0.01, 0.0, -1, brass);
  }
}

void orrery(vec3 ro, vec3 rd){
  vec3 brass = kBrass * 0.55, verd = kVerd * 0.5;
  // sun-lamp: a slotted brass globe with the flame showing through
  float tH, a; vec3 n;
  sphereL(ro, rd, vec3(0.0), 0.85, tH, a, n);
  if (a > 0.004) {
    vec3 ln = n * rotY(TAU * uPhase * 2.0);
    float lat = asin(clamp(ln.y, -1.0, 1.0));
    float lon = atan(ln.z, ln.x);
    float fwl = gPix * tH / 0.85;
    float slit = cov1(abs(fract(lat / 0.22 + 0.5) - 0.5) * 0.22, 0.03, fwl);
    float mer = cov1(abs(fract(lon / (TAU / 16.0) + 0.5) - 0.5) * (TAU / 16.0) * cos(lat), 0.025, fwl);
    float rimv = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
    vec3 c = kLamp * (1.0 * slit + 0.5 * mer) * 2.0 + brass * 0.4 * (1.0 - rimv) + kHi * rimv * 0.35;
    addL(tH, c, a, 6.0);
  }
  // corona rays in screen space
  {
    vec2 dp = gP - proj(vec3(0.0));
    float zs = dot(-gRo, gF);
    float rs = gFoc * 0.85 / zs;
    float dr = length(dp) / rs;
    if (dr > 1.02 && dr < 2.1) {
      float an = atan(dp.y, dp.x) + TAU * uPhase;
      float k = an / (TAU / 24.0);
      float w = abs(fract(k + 0.5) - 0.5) * (TAU / 24.0) * length(dp);
      float len = (fract(floor(k + 0.5) * 0.5) > 0.2) ? 1.55 : 2.0;
      float hwid = 0.006 * (1.0 - (dr - 1.0) / (len - 1.0));
      float ray = cov1(w, max(hwid, 0.0), uPxSize * 2.7) * step(dr, len);
      if (ray > 0.004) addL(zs + 0.2, kLamp * 1.3 * (1.2 - 0.5 * dr / len), ray, 6.0);
    }
  }
  // armillary cage
  mat3 Mm = rotY(0.38) * rotX(PI * 0.5);              // fixed meridian ring
  washer(ro, rd, Mm, 3.08, 3.5, 0.06, 0.0, 0, brass);
  band(ro, rd, mat3(1.0), 3.78, 0.26, 0.0, 1, brass);  // fixed horizon band, roman hours
  mat3 Mp = rotY(0.38) * rotZ(-0.52);                 // polar axis tilted in the meridian plane
  mat3 Rs = Mp * rotY(TAU * uPhase);                  // the sphere turns once per loop
  washer(ro, rd, Rs, 2.62, 2.9, 0.05, 0.0, -1, brass);
  washer(ro, rd, Rs * rotX(PI * 0.5), 2.62, 2.86, 0.05, 0.0, -1, verd);
  band(ro, rd, Rs * rotX(0.41), 2.5, 0.2, 0.0, 2, brass);
  mat3 G1 = rotY(-TAU * uPhase * 2.0) * rotX(1.15);
  washer(ro, rd, G1, 1.55, 1.75, 0.04, 0.0, -1, brass);
  washer(ro, rd, G1 * rotZ(TAU * uPhase * 3.0) * rotX(PI * 0.5), 1.2, 1.36, 0.035, 0.0, -1, verd);
  vec3 ax = Mp * vec3(0.0, 1.0, 0.0);
  rod(ro, rd, -ax * 3.5, ax * 3.5, 0.05, kHi * 0.5, 1.0);
  rod(ro, rd, vec3(0.0, -3.5, 0.0), vec3(0.0, -6.2, 0.0), 0.22, kIron * 0.45, 1.0);
  planets(ro, rd);
}

// ------------------------------------------------------------------ pendulum + escapement
void pendulum(vec3 ro, vec3 rd){
  vec3 Y = vec3(0.0, 1.0, 0.0);
  vec3 Rr = normalize(vec3(bR.x, 0.0, bR.z));
  vec3 Wn = cross(Rr, Y);
  vec3 A = scr2w(vec2(-1.28, 0.9), 12.0);
  float sw = 0.09 * sin(TAU * 20.0 * uPhase);          // 6 s period
  float L = 7.6;
  vec3 dir = -Y * cos(sw) + Rr * sin(sw);
  vec3 perp = Rr * cos(sw) + Y * sin(sw);
  vec3 brass = kBrass * 0.55;
  for (int i = 0; i < 5; i++) {
    float o = (float(i) - 2.0) * 0.11;
    rod(ro, rd, A + perp * o + dir * 0.4, A + perp * o + dir * (L - 0.85), 0.022, i == 2 ? kHi * 0.5 : brass, 1.0);
  }
  vec3 Bc = A + dir * L;
  float dz = dot(rd, Wn);
  float tb = dot(Bc - ro, Wn) / dz;
  if (tb > 0.0) {
    vec3 P = ro + rd * tb;
    vec2 q = vec2(dot(P - Bc, perp), dot(P - Bc, -dir));
    float r = length(q);
    float fw = gPix * tb;
    float ab = aa(r - 0.9, fw);
    if (ab > 0.004) {
      vec3 n = normalize(Wn * 1.0 + (perp * q.x - dir * q.y) * 0.9);
      vec3 c = shadeMetal(P, n, rd, brass, 1.4, 20.0);
      float rings = cov1(abs(fract(r / 0.16 + 0.5) - 0.5) * 0.16, 0.012, fw) * step(r, 0.8);
      c += kHi * rings * 0.2;
      addL(tb, c, ab, 2.0);
    }
  }
  vec3 E = A - Y * 1.3 - Wn * 0.5;
  float ph = uPhase * 40.0 + 0.25;
  float ea = -(floor(ph) + smoothstep(0.0, 0.12, fract(ph))) * (PI / 30.0);
  gearL(ro, rd, E, Rr, Y, Wn, 0.95, 30.0, ea, 6.0, 0.08, brass);
  vec3 pL = E + (-Rr * 0.68 + Y * 0.68);
  vec3 pR = E + (Rr * 0.68 + Y * 0.68);
  vec3 aL = A + (pL - A) * cos(sw) + cross(Wn, pL - A) * sin(sw);
  vec3 aR = A + (pR - A) * cos(sw) + cross(Wn, pR - A) * sin(sw);
  rod(ro, rd, A, aL, 0.06, kIron * 0.45, 2.0);
  rod(ro, rd, A, aR, 0.06, kIron * 0.45, 2.0);
}

// ------------------------------------------------------------------ dust
vec3 motes(vec3 ro, vec3 rd, float tMax, inout float best){
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 10; k++) {
    float zp = -8.0 + float(k) * 2.4;
    if (abs(rd.z) < 1e-3) break;
    float t = (zp - ro.z) / rd.z;
    if (t < 1.0 || t > tMax) continue;
    vec3 P = ro + rd * t;
    float bm = beamMask(P);
    float dens = 0.25 + 0.75 * bm;
    float cs = 0.55;
    vec2 g = P.xy / cs + vec2(-uPhase * 6.0, uPhase * 10.0) + float(k) * 7.31;
    vec2 gi = floor(g);
    float h = hashi(ivec3(ivec2(gi), k));
    if (h > 0.22 * dens) continue;
    vec2 jp = 0.2 + 0.6 * hash22(gi + float(k) * 13.0);
    vec2 dd = (fract(g) - jp) * cs;
    float rr = 0.022 + 0.02 * fract(h * 37.0);
    float fw = gPix * t;
    float s2 = rr * rr + fw * fw * 0.35;
    float I = (rr * rr / s2) * exp(-dot(dd, dd) / s2);
    float tw = 0.55 + 0.45 * sin(TAU * (uPhase * 7.0 + h * 9.0));
    vec3 c = (kBeam * bm * 1.6 + kLamp * 0.15 * (1.0 - bm)) * I * tw * (0.3 + 1.4 * uAtmos);
    acc += c;
    best = max(best, luma(c));
  }
  return acc;
}

// ------------------------------------------------------------------ main
vec3 sceneColor(vec2 p, out float mat, out float depth){
  gP = p; gCell = cellOf(p);
  kBrass = tint(uBrass); kHi = tint(uBrassHi); kVerd = tint(uVerd); kIron = tint(uIron);
  kLamp = tint(uLamp); kBeam = tint(uBeam); kStone = tint(uStone); kAmb = tint(uAmb);
  LB = normalize(vec3(0.62, -0.62, 0.48));
  gB1 = normalize(cross(LB, vec3(0.0, 1.0, 0.0)));
  gB2 = cross(gB1, LB);
  gFoc = 2.0;
  gPix = uPxSize * 2.7 / gFoc;
  float el0 = 0.28, dist = 14.0;
  vec3 tgt = vec3(-2.1, -0.55, 0.0);
  bRo = vec3(0.0, sin(el0), -cos(el0)) * dist;
  bF = normalize(tgt - bRo); bR = normalize(cross(vec3(0.0, 1.0, 0.0), bF)); bU = cross(bF, bR);
  float ph = uPhase * TAU;
  float az = uCamAmt * 0.03 * sin(ph);
  float el = el0 + uCamAmt * 0.01 * sin(2.0 * ph + 1.3);
  gRo = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el)) * dist;
  gF = normalize(tgt - gRo); gR = normalize(cross(vec3(0.0, 1.0, 0.0), gF)); gU = cross(gF, gR);
  vec3 rd = normalize(p.x * gR + p.y * gU + gFoc * gF);
  vec3 ro = gRo;

  Lc0 = Lc1 = Lc2 = vec4(0.0);
  Lt0 = Lt1 = Lt2 = vec2(1e9, 0.0);

  // foreground gears: a meshing pair turned toward the lamp
  vec3 Wg = normalize(-bF + bR * 0.55);
  vec3 Ug = -normalize(cross(vec3(0.0, 1.0, 0.0), Wg));
  vec3 Vg = cross(Wg, Ug);
  vec3 G1 = scr2w(vec2(-1.62, -1.22), 4.6);
  float a1 = -TAU * uPhase;                                   // 60 teeth, 1 turn per loop
  gearL(ro, rd, G1, Ug, Vg, Wg, 1.95, 60.0, a1, 6.0, 0.34, kIron * 0.45);
  float mesh = 0.25;
  vec3 G2 = G1 + (Ug * cos(mesh) + Vg * sin(mesh)) * (1.95 + 0.975);
  float a2 = mesh + PI + PI / 30.0 - (a1 - mesh) * 2.0;         // 30 teeth, 2 turns per loop
  gearL(ro, rd, G2, Ug, Vg, Wg, 0.975, 30.0, a2, 5.0, 0.3, mix(kIron, kVerd, 0.5) * 0.45);

  pendulum(ro, rd);

  {
    vec3 oc = vec3(0.0, -1.0, 0.0) - ro;
    float tc = dot(oc, rd);
    if (dot(oc, oc) - tc * tc < 8.6 * 8.6) orrery(ro, rd);
  }

  float tw;
  vec3 hc = hall(ro, rd, tw);
  addL(tw, hc, 1.0, 3.0);

  vec3 c2 = Lc2.rgb * Lc2.a;
  vec3 c1 = Lc1.rgb * Lc1.a + (1.0 - Lc1.a) * c2;
  vec3 col = Lc0.rgb * Lc0.a + (1.0 - Lc0.a) * c1;
  float w0 = Lc0.a * luma(Lc0.rgb), w1 = (1.0 - Lc0.a) * Lc1.a * luma(Lc1.rgb), w2 = (1.0 - Lc0.a) * (1.0 - Lc1.a) * Lc2.a * luma(Lc2.rgb);
  bool f0 = w0 >= w1 && w0 >= w2;
  mat = f0 ? Lt0.y : (w1 >= w2 ? Lt1.y : Lt2.y);
  float tt = f0 ? Lt0.x : (w1 >= w2 ? Lt1.x : Lt2.x);
  col *= exp(-tt * 0.012);
  float bestM = 0.0;
  vec3 m = motes(ro, rd, min(Lc0.a > 0.99 ? Lt0.x : 1e9, tw), bestM);
  if (bestM > luma(col) * 1.2 && bestM > 0.02) mat = 4.0;
  col += m;
  depth = sat(tt / 60.0);
  return col;
}
`,
});

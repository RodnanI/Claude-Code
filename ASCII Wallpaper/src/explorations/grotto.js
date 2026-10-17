// Glowworm Grotto: a limestone river cave whose ceiling is colonised by
// bioluminescent glowworms. Each worm hangs silk threads beaded with sticky
// droplets; the still river doubles everything; a lantern boat drifts on a
// closed loop and drips from stalactite tips send ripple rings through the
// reflections.
(function () {
  // ---- CPU-side copy of the cave layout, used to place the drip sites exactly
  // on stalactite tips (mirrors tunnel() / stalSDF() and the engine's hashi).
  const _h = (x) => {
    x >>>= 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
    x ^= x >>> 16; return x >>> 0;
  };
  const hashi2 = (x, y) => ((_h((Math.imul(x >>> 0, 1597334677) >>> 0) ^ _h(((y >>> 0) + 0x9e3779b9) >>> 0)) >>> 0) / 4294967296);
  const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const tunnel = (z) => {
    const b = Math.max(z - 14, 0);
    return {
      xc: -0.2 + 0.55 * Math.sin(0.15 * z + 0.3) + 0.0046 * b * b,
      W: 6.3 + 1.3 * ss(2, 10, z) - 3.6 * ss(24, 40, z) + 0.3 * Math.sin(0.31 * z + 0.5),
      C: 3.05 + 2.8 * ss(2.6, 10.5, z) - 1.4 * ss(30, 46, z) + 0.22 * Math.sin(0.47 * z + 1.3),
    };
  };
  const YC = -2.0, CS = 1.8;
  const stal = (cx, cz) => {
    const h0 = hashi2(cx + 31, cz + 7), h1 = hashi2(cx + 5, cz + 91), h2 = hashi2(cx + 77, cz + 13);
    const ax = (cx + 0.3 + 0.4 * h0) * CS, az = (cz + 0.3 + 0.4 * h1) * CS;
    const T = tunnel(az), qx = (ax - T.xc) / T.W;
    const top = YC + (T.C - YC) * Math.sqrt(1 - qx * qx) + 0.1;
    const len = Math.min(0.3 + 2.1 * h2 ** 3, top - 2.6);
    return [ax, top - len, az];
  };
  const DRIP_CELLS = [[-1, 2], [1, 4], [0, 4], [-2, 5], [-2, 7], [0, 9], [1, 9]];
  const f = (v) => v.toFixed(4);
  const DRIPS = 'const vec3 DRIP[7] = vec3[7](' + DRIP_CELLS.map(([x, z]) => stal(x, z)).map((d) => `vec3(${f(d[0])}, ${f(d[1])}, ${f(d[2])})`).join(', ') + ');';

  ASCII.registerScene({
    id: 'grotto',
    name: 'Glowworm Grotto',
    tagline: 'a starry sky underground, doubled in still water',
    loop: 90,
    bg: '#050706',
    palettes: [
      {
        name: 'Waitomo',
        colors: { uGlow: '#38e0a8', uSilk: '#a8f5dc', uLamp: '#ffa846', uStone: '#b48a52' },
        look: { exposure: 1.0 },
      },
      {
        name: 'Moss & ember',
        colors: { uGlow: '#86e266', uSilk: '#d2f7a8', uLamp: '#ff7a30', uStone: '#a26f45' },
        look: { exposure: 1.0 },
      },
      {
        name: 'Jade lantern',
        colors: { uGlow: '#2ad6b4', uSilk: '#c8fff0', uLamp: '#ffd27a', uStone: '#c9a774' },
        look: { exposure: 1.05 },
      },
    ],
    glyphSets: {
      1: { edge: " .'`:|!;,", tone: " .':|" },              // threads (direct)
      2: { edge: ' .,-_~=:\'`^"', tone: ' .-~=:' },          // water surface / reflected rock
      3: { edge: " .,'`-_:;~\"^=+*!|/\\()[]{}<>ilrtcvxzouJLT#%&", tone: " .`':-~=+*xo#%" }, // rock
      4: { edge: " .'`*+:", tone: " .'*+" },                // glowworm lights
      6: { edge: " .'`:|!;,~", tone: " .':|~" },            // threads reflected
      7: { edge: " .'`*+:~-", tone: " .'*+-" },             // glowworm lights reflected
    },
    defaults: { detail: 1, atmosphere: 0.5, camera: 0.5 },
    glsl: `
#define FOC 1.6
#define YC (-2.0)
#define SHELL 0.66
#define NPLMAX 44
#define PZ0 1.3
#define PZ1 60.0
#define LMAXT 1.5
#define ND 7
#define TMAX 80.0
#define STCS 1.8
${DRIPS}

// ------------------------------------------------------------- per-frame state
vec3 gB, gBf, gBr;      // boat waterline centre, forward, right
vec3 gLamp;             // lantern position
float gPxA, gPyA;       // world size of one sample per unit distance (x, y)

// ------------------------------------------------------------- tunnel shape
// centre line x, half width W, vault top C (all functions of depth z)
void tunnel(float z, out float xc, out float W, out float C){
  float b = max(z - 14.0, 0.0);
  xc = -0.2 + 0.55 * sin(0.15 * z + 0.3) + 0.0046 * b * b;
  W = 6.3 + 1.3 * smoothstep(2.0, 10.0, z) - 3.6 * smoothstep(24.0, 40.0, z) + 0.3 * sin(0.31 * z + 0.5);
  C = 3.05 + 2.8 * smoothstep(2.6, 10.5, z) - 1.4 * smoothstep(30.0, 46.0, z) + 0.22 * sin(0.47 * z + 1.3);
}
float prof(vec2 q){ vec2 q2 = q * q; return mix(length(q), sqrt(sqrt(q2.x * q2.x + q2.y * q2.y)), 0.45); }

// low-frequency rock displacement in tunnel surface coords (s = arc, z)
float dispLo(vec2 sz, float th){
  float n1 = vnoise(sz * vec2(0.55, 0.45));
  float n2 = vnoise(sz * vec2(1.4, 1.2) + vec2(11.3, 4.1));
  float wall = smoothstep(0.55, 1.15, abs(th));
  float rib = 1.0 - abs(sin(sz.y * 2.4 + 2.2 * n1 + 0.8 * sz.x));
  return 0.34 * n1 + 0.17 * n2 + wall * 0.14 * rib * rib;
}
// fine detail used for normals only
float dispHi(vec3 p, vec2 sz){
  float d = 0.05 * vnoise(sz * vec2(3.6, 3.1) + 7.7);
  float sy = p.y * 2.7 + 0.7 * vnoise(sz * vec2(0.9, 0.6) + 2.0);
  float f = fract(sy);
  d += 0.035 * smoothstep(0.0, 0.1, f) * (1.0 - f);
  return d;
}

// foreground flowstone column (left) and a low boulder (right)
const vec2 COLP = vec2(-3.5, 3.6);
float columnSDF(vec3 p){
  vec2 d = p.xz - COLP;
  float l = length(d);
  if (l > 2.6) return l - 2.2;
  float y = p.y;
  float r = 0.40 + 0.55 * smoothstep(1.3, -0.8, y) + 0.95 * smoothstep(1.7, 3.4, y);
  float ang = atan(d.y, d.x);
  r += 0.06 * sin(ang * 7.0 + y * 0.9) + 0.035 * sin(ang * 15.0 - y * 1.9) + 0.05 * sin(y * 3.1 + ang * 2.0);
  return (l - r) * 0.7;
}
const vec3 BOUL = vec3(4.2, -0.6, 4.4);
float boulderSDF(vec3 p){
  vec3 d = p - BOUL;
  float l = length(d * vec3(0.8, 1.6, 1.0));
  if (l > 3.0) return (l - 2.6) * 0.6;
  float n = 0.12 * sin(d.x * 3.0 + d.z * 2.0) * sin(d.y * 4.0 - d.x) + 0.06 * sin(d.z * 7.0 + d.y * 5.0);
  return (l - 1.7 + n) * 0.55;
}

float caveSDF(vec3 p, int lod, out float cb, out float qxo, out float Wo){
  float xc, W, C; tunnel(p.z, xc, W, C);
  float H = C - YC;
  float S = min(W, H);
  vec2 q = vec2((p.x - xc) / W, (p.y - YC) / H);
  float qx = clamp(q.x, -1.0, 1.0);
  cb = YC + H * sqrt(1.0 - qx * qx);
  qxo = q.x; Wo = W;
  float d = (1.0 - prof(q)) * S;
  if (lod == 0 && d > SHELL + 0.25) return d - SHELL;
  float th = atan(q.x, q.y);
  vec2 sz = vec2(th * 5.0, p.z);
  d -= dispLo(sz, th);
  if (lod == 2) d -= dispHi(p, sz);
  return d;
}

// displaced vault height above lateral position x at depth z (thread anchors)
float ceilAt(float x, float z, out float qx){
  float xc, W, C; tunnel(z, xc, W, C);
  float H = C - YC, S = min(W, H);
  qx = (x - xc) / W;
  float qy = sqrt(max(1.0 - qx * qx, 0.0));
  float th = atan(qx, qy);
  float e = 1.0 - dispLo(vec2(th * 5.0, z), th) / S;
  return YC + H * sqrt(max(e * e - qx * qx, 0.0));
}

// ------------------------------------------------------------- stalactites
// one cone per 1.8 m cell under the central vault of the chamber (z < 31)
float stalSDF(vec3 p, float qxp, float Wp, out vec4 info){
  info = vec4(0.0);
  float bnd = max(max(2.55 - p.y, (abs(qxp) - 0.6) * Wp - 0.7), max(p.z - 32.0, 0.5 - p.z));
  if (bnd > 0.02) return bnd + 0.02;
  vec2 c = floor(p.xz / STCS);
  vec2 fc = p.xz / STCS - c;
  float dB = (0.5 - max(abs(fc.x - 0.5), abs(fc.y - 0.5))) * STCS;   // to the cell border
  float dN = max(dB + 0.25, 2.6 - p.y);                                // neighbours' cones
  ivec2 ic = ivec2(c);
  float h0 = hashi(ic + ivec2(31, 7));
  float h1 = hashi(ic + ivec2(5, 91));
  float h2 = hashi(ic + ivec2(77, 13));
  vec2 a = (c + 0.3 + 0.4 * vec2(h0, h1)) * STCS;
  float xc, W, C; tunnel(a.y, xc, W, C);
  float qx = (a.x - xc) / W;
  if (abs(qx) > 0.6 || h2 < 0.35 || a.y > 31.0) return dN;
  float top = YC + (C - YC) * sqrt(1.0 - qx * qx) + 0.1;
  float len = min(0.3 + 2.1 * h2 * h2 * h2, top - 2.6);
  if (len < 0.15) return dN;
  float r0 = 0.06 + 0.09 * h0 + 0.06 * len;
  float s = clamp((top - p.y) / len, 0.0, 1.0);
  float r = r0 * pow(1.0 - s, 1.15) + 0.012;
  float d = length(p.xz - a) - r;
  float tip = top - len;
  if (p.y < tip) d = length(p - vec3(a.x, tip, a.y)) - 0.012;
  info = vec4(s, len, top, h1);
  return min(d * 0.75, dN);
}

// ------------------------------------------------------------- boat
vec3 toBoat(vec3 p){ vec3 d = p - gB; return vec3(dot(d, gBf), d.y, dot(d, gBr)); }
float boatSDF(vec3 p, out float part){
  part = 0.0;
  vec3 q = toBoat(p);
  float bound = length(q - vec3(0.1, 0.45, 0.0)) - 1.7;
  if (bound > 0.3) return bound;
  vec3 r = vec3(1.25, 0.42, 0.46);
  float hull = (length(q / r) - 1.0) * 0.4;
  float inner = (length((q - vec3(0.0, 0.06, 0.0)) / (r - vec3(0.06, 0.05, 0.05))) - 1.0) * 0.36;
  float gun = 0.16 - 0.06 * cos(q.x * 2.2);
  hull = max(hull, q.y - gun);
  hull = max(hull, -max(inner, q.y - gun - 0.2));
  float d = hull;
  float pole = sdCapsule(q, vec3(0.92, 0.1, 0.0), vec3(1.02, 1.05, 0.0), 0.02);
  float arm = sdCapsule(q, vec3(1.02, 1.05, 0.0), vec3(1.25, 1.02, 0.0), 0.015);
  d = min(d, min(pole, arm));
  vec3 fq = q - vec3(-0.25, 0.05, 0.0);
  float body = sdCapsule(fq, vec3(0.0, 0.1, 0.0), vec3(0.04, 0.52, 0.0), 0.17 - 0.08 * sat(fq.y / 0.6));
  float head = length(fq - vec3(0.06, 0.66, 0.0)) - 0.11;
  float fig = smin(body, head, 0.06);
  if (fig < d) { d = fig; part = 2.0; }
  float lan = sdBox(q - vec3(1.25, 0.86, 0.0), vec3(0.075, 0.1, 0.075)) - 0.012;
  if (lan < d) { d = lan; part = 1.0; }
  return d;
}

// ------------------------------------------------------------- scene SDF
float mapLo(vec3 p){
  float cb, qx, W; vec4 si;
  float d = caveSDF(p, 0, cb, qx, W);
  d = min(d, stalSDF(p, qx, W, si));
  d = min(d, columnSDF(p));
  d = min(d, boulderSDF(p));
  float bp; d = min(d, boatSDF(p, bp));
  return d;
}
// id: 0 cave wall, 1 stalactite, 0.5 column/boulder, 2+ boat part
float mapId(vec3 p, out float id, out vec4 si){
  float cb, qx, W;
  float d = caveSDF(p, 1, cb, qx, W);
  id = 0.0;
  float ds = stalSDF(p, qx, W, si);
  if (ds < d) { d = ds; id = 1.0; }
  float dc = min(columnSDF(p), boulderSDF(p));
  if (dc < d) { d = dc; id = 0.5; }
  float bp; float db = boatSDF(p, bp);
  if (db < d) { d = db; id = 2.0 + bp; }
  return d;
}
// distance to one component only (for normals)
float mapOne(vec3 p, float id, int lod){
  float cb, qx, W; vec4 si; float bp;
  if (id == 0.0) return caveSDF(p, lod, cb, qx, W);
  if (id == 0.5) return min(columnSDF(p), boulderSDF(p));
  if (id == 1.0) { caveSDF(p, 0, cb, qx, W); return stalSDF(p, qx, W, si); }
  return boatSDF(p, bp);
}
vec3 calcNormal(vec3 p, float id, int lod){
  const vec2 e = vec2(0.006, -0.006);
  return normalize(e.xyy * mapOne(p + e.xyy, id, lod) + e.yyx * mapOne(p + e.yyx, id, lod) +
                   e.yxy * mapOne(p + e.yxy, id, lod) + e.xxx * mapOne(p + e.xxx, id, lod));
}
float march(vec3 ro, vec3 rd, float tmax){
  float t = 0.02;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    float d = mapLo(p);
    if (d < 0.0015 * t + 0.0015) return t;
    t += d * 0.85;
    if (t > tmax) return 1e5;
  }
  return t;
}

#ifdef DEBUGGEO
vec3 debugGeo(vec3 ro, vec3 rd, float tmax){
  float t = march(ro, rd, tmax);
  if (t > tmax) return vec3(0.0);
  vec3 P = ro + rd * t;
  float id; vec4 si; mapId(P, id, si);
  vec3 N = calcNormal(P, id, 2);
  vec3 c = (0.5 + 0.5 * N) * (0.3 + 0.7 * sat(dot(N, -rd))) * exp(-0.025 * t) * (id > 0.9 ? 1.5 : 0.7);
  if (id >= 2.0) c = vec3(2.0, 0.5, 0.1);
  if (id == 0.5) c *= vec3(1.4, 1.4, 0.3);
  for (int i = 0; i < ND; i++) if (length(cross(DRIP[i] - ro, rd)) < 0.02 * length(DRIP[i] - ro)) c = vec3(3.0, 3.0, 3.0);
  return c;
}
#endif

// ------------------------------------------------------------- light helpers
// breathing glow of the colony: slow pulses roll from the depths towards us
float colonyGlow(vec2 xz){
  float ph = TAU * 3.0 * uPhase + 0.30 * xz.y - 0.12 * xz.x + 1.6 * vnoise(xz * 0.13);
  float b = 0.5 + 0.5 * sin(ph);
  return 0.45 + 0.75 * b * b;
}
float lampE(vec3 p){ vec3 d = gLamp - p; return 30.0 / (dot(d, d) + 0.5); }
float atten(float t){ return exp(-0.026 * t); }

// ------------------------------------------------------------- drips
float dripCount(int i){ return float(5 + (i * 3) % 4); }    // drips per loop
float dripOff(int i){ return fract(float(i) * 0.618 + 0.13); }

// water height gradient from drip ripples (+ faint ambient wavelets)
vec2 waterGrad(vec2 xz, out float crest){
  vec2 g = vec2(0.0);
  crest = 0.0;
  for (int i = 0; i < ND; i++) {
    vec3 s = DRIP[i];
    vec2 d = xz - s.xz;
    float r = length(d);
    if (r > 4.5) continue;
    float n = dripCount(i);
    float per = uLoop / n;
    float ph = fract(uPhase * n + dripOff(i));
    float fall = sqrt(2.0 * s.y / 9.81);
    float tau = ph * per - fall;
    if (tau <= 0.0) continue;
    float R = 0.42 * tau;
    float x = r - R;
    float sig = 0.10 + 0.05 * tau;
    float env = exp(-x * x / (sig * sig)) * exp(-tau * 0.28) * (1.0 - smoothstep(0.85, 1.0, ph)) / sqrt(1.0 + 3.0 * R);
    float k = 26.0;
    float dh = env * (k * cos(k * x) - 2.0 * x / (sig * sig) * sin(k * x)) * 0.0045;
    g += dh * d / max(r, 1e-3);
    crest += env * abs(sin(k * x));
  }
  float w1 = TAU * 4.0 * uPhase;
  g += 0.006 * vec2(cos(xz.x * 5.0 + xz.y * 1.3 - w1), 0.4 * cos(xz.y * 7.0 - xz.x * 2.0 + 2.0 * w1));
  return g;
}

// ------------------------------------------------------------- glowworm lights on rock
float wormDots(vec2 sz, float fp){
  float lv = max(0.0, log2(fp / 0.035));
  float l0 = floor(lv);
  float res = 0.0;
  for (int j = 0; j < 2; j++) {
    float L = l0 + float(j);
    float cs = 0.22 * exp2(L);
    vec2 g = sz / cs;
    vec2 c = floor(g);
    ivec3 hc = ivec3(ivec2(c), int(L));
    float h = hashi(hc);
    vec2 o = vec2(hashi(hc + ivec3(7, 3, 0)), hashi(hc + ivec3(1, 9, 0)));
    vec2 d = (fract(g) - (0.2 + 0.6 * o)) * cs;
    float rad = max(0.012, 0.75 * fp);
    float v = exp(-dot(d, d) / (rad * rad)) * (0.4 + 0.6 * h);
    v *= step(0.35, h);
    float tk = float(1 + int(h * 5.0));
    v *= 0.75 + 0.25 * sin(TAU * tk * uPhase + h * 40.0);
    float wgt = j == 0 ? 1.0 - fract(lv) : fract(lv);
    res += v * wgt;
  }
  return res;
}

// ------------------------------------------------------------- threads
float swayAt(float x, float z, float s, float h){
  float ph = TAU * 6.0 * uPhase - 0.9 * x - 0.45 * z + h * 0.7;
  float ph2 = TAU * 2.0 * uPhase - 0.35 * x + 0.25 * z;
  return (0.022 * sin(ph) + 0.012 * sin(ph2)) * pow(s, 1.4);
}

vec3 threadRay(vec3 ro, vec3 rd, float tEnd, inout float bestL, inout float bestM, float mThread){
  vec3 acc = vec3(0.0);
  if (rd.z < 0.03) return acc;
  int npl = int(mix(22.0, float(NPLMAX), uDetail));
  float lr = log(PZ1 / PZ0) / float(npl - 1);
  int k0 = ro.z > PZ0 ? int(ceil(log(ro.z / PZ0) / lr - 1e-4)) : 0;
  float zEnd = ro.z + rd.z * tEnd;
  int k1 = min(npl - 1, int(floor(log(max(zEnd, PZ0) / PZ0) / lr)));
  for (int k = k0; k <= k1; k++) {
    float zk = PZ0 * exp(lr * float(k));
    float t = (zk - ro.z) / rd.z;
    vec3 P = ro + rd * t;
    float xc, W, C; tunnel(zk, xc, W, C);
    float qx0 = (P.x - xc) / W;
    if (abs(qx0) > 0.78) continue;
    float yb = YC + (C - YC) * sqrt(1.0 - qx0 * qx0);
    float sy = yb - P.y;
    if (sy < -0.05 || sy > SHELL + LMAXT) continue;
    float sx = 0.04 * zk + 0.05;
    float fp = t * gPxA, fpy = t * gPyA;
    float cx = P.x / sx;
    float ci = floor(cx);
    float cn = fract(cx) < 0.5 ? ci - 1.0 : ci + 1.0;
    for (int j = 0; j < 2; j++) {
      float c = j == 0 ? ci : cn;
      ivec3 hb = ivec3(int(c), k, 0);
      float h1 = hashi(hb);
      float h3 = hashi(hb + ivec3(0, 0, 31));
      float L = 0.12 + 0.5 * h3 * h3 + (h3 > 0.92 ? 0.85 : 0.0);
      if (sy > SHELL + L + 0.05) continue;
      float xi = (c + 0.2 + 0.6 * h1) * sx;
      float band = 0.036 * pow(L, 1.4) + 0.8 * max(fp, 0.015) + 0.008;
      if (abs(P.x - xi) > band) continue;
      float h2 = hashi(hb + ivec3(0, 0, 23));
      float dens = smoothstep(0.40, 0.62, vnoise(vec2(xi * 0.55, zk * 0.45) + 3.0));
      if (h2 > dens) continue;
      float qx;
      float ytop = ceilAt(xi, zk, qx);
      float s = ytop - P.y;
      if (s < -0.03 || s > L + 0.05) continue;
      float sw = swayAt(xi, zk, max(s, 0.0), h1);
      float dx = P.x - xi - sw;
      float w = max(0.004, 0.6 * fp);
      float inside = step(0.0, s) * step(s, L);
      float silk = exp(-dx * dx / (w * w)) * sqrt(0.004 / w) * inside;
      float h4 = hashi(hb + ivec3(0, 0, 41));
      float B = 0.05 + 0.035 * h4;
      float u = s / B + h1 * 7.0;
      float fu = fract(u) - 0.5;
      float rb = (0.010 + 0.007 * h4) * (0.75 + 0.5 * s / L);
      float rbe = max(rb, 0.7 * max(fp, fpy));
      float dyb = fu * B;
      float bead = exp(-(dx * dx + dyb * dyb) / (rbe * rbe)) * (rb / rbe);
      float aa = smoothstep(2.0, 3.5, B / fpy);
      float beadAvg = exp(-dx * dx / (rbe * rbe)) * (rb / rbe) * 1.77 * rbe / B;
      bead = mix(beadAvg, bead, aa) * inside;
      float re = max(0.016, 0.7 * max(fp, fpy));
      vec2 de = vec2(dx, s - L);
      float drop = exp(-dot(de, de) / (re * re)) * (0.016 / re);
      vec3 Pw = vec3(xi + sw, P.y, zk);
      float G = colonyGlow(Pw.xz);
      float E = lampE(Pw);
      vec3 cs = uGlow * (0.35 * G) + uLamp * (0.05 * E);
      vec3 cbd = uSilk * (1.3 * G) + uLamp * (0.2 * E);
      vec3 col = (cs * silk + cbd * (bead * 1.4 + drop * 1.6)) * atten(t);
      acc += col;
      float l = luma(col);
      if (l > bestL) { bestL = l; bestM = mThread; }
    }
  }
  return acc;
}

// falling drops (bright short streaks) along a ray segment
vec3 dropRay(vec3 ro, vec3 rd, float tEnd, inout float bestL, inout float bestM){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ND; i++) {
    vec3 s = DRIP[i];
    float n = dripCount(i);
    float per = uLoop / n;
    float ph = fract(uPhase * n + dripOff(i));
    float tt = ph * per;
    float fall = sqrt(2.0 * s.y / 9.81);
    vec3 a, b;
    if (tt < fall) {
      float y = s.y - 0.5 * 9.81 * tt * tt;
      float v = 9.81 * tt;
      a = vec3(s.x, y, s.z); b = vec3(s.x, y + min(v * 0.05, 0.4) + 0.02, s.z);
    } else {
      float grow = smoothstep(fall, per, tt);
      a = vec3(s.x, s.y - 0.02 - 0.03 * grow, s.z); b = a + vec3(0.0, 0.01, 0.0);
    }
    vec3 ba = b - a, oa = ro - a;
    float bb = dot(ba, ba), rb = dot(rd, ba), ro2 = dot(rd, oa), bo = dot(ba, oa);
    float den = bb - rb * rb;
    float tr = den > 1e-6 ? (rb * bo - bb * ro2) / den : -ro2;
    tr = clamp(tr, 0.0, tEnd);
    float sb = bb > 1e-6 ? sat((dot(ro + rd * tr - a, ba)) / bb) : 0.0;
    vec3 cp = a + ba * sb;
    float dd = length(ro + rd * tr - cp);
    float fp = tr * gPxA;
    float rr = max(0.008, 0.7 * fp);
    float v = exp(-dd * dd / (rr * rr)) * (0.008 / rr) * step(tr, tEnd - 0.01);
    vec3 col = (uSilk * 1.5 * colonyGlow(s.xz) + uLamp * 0.2 * lampE(cp)) * v * atten(tr);
    acc += col;
    float l = luma(col);
    if (l > bestL) { bestL = l; bestM = 1.0; }
  }
  return acc;
}

// ------------------------------------------------------------- surface shading
vec3 shadeSolid(vec3 P, vec3 rd, float t, float id, vec4 si, inout float bestL, inout float bestM, bool refl){
  vec3 N = calcNormal(P, id, refl ? 1 : 2);
  vec3 V = -rd;
  vec3 Ld = gLamp - P;
  float ld = length(Ld);
  vec3 Ln = Ld / ld;
  float E = 30.0 / (ld * ld + 0.5);
  float fp = t * gPxA;
  vec3 col;
  if (id >= 2.0) {
    float part = id - 2.0;
    if (part > 0.5 && part < 1.5) {
      vec3 q = toBoat(P) - vec3(1.25, 0.86, 0.0);
      float frame = smoothstep(0.05, 0.065, max(abs(q.x), abs(q.z))) + smoothstep(0.07, 0.09, abs(q.y));
      col = uLamp * mix(9.0, 1.2, sat(frame));
      if (luma(col) > bestL) { bestL = luma(col); bestM = 5.0; }
      return col;
    }
    float dif = sat(dot(N, Ln));
    float wood = 0.55 + 0.45 * sin(toBoat(P).y * 60.0);
    col = uLamp * uStone * (E * dif * (part > 1.5 ? 0.35 : 0.6 * wood)) * 0.12 + uGlow * 0.015;
    col += uLamp * pow(sat(dot(reflect(-Ln, N), V)), 12.0) * E * 0.05;
    col *= atten(t);
    if (luma(col) > bestL) { bestL = luma(col); bestM = 5.0; }
    return col;
  }
  float xc, W, C; tunnel(P.z, xc, W, C);
  vec2 q = vec2((P.x - xc) / W, (P.y - YC) / (C - YC));
  float th = atan(q.x, q.y);
  vec2 sz = vec2(th * 5.0, P.z);
  float n3 = vnoise(sz * vec2(2.2, 1.8) + 5.0);
  float n4 = vnoise(vec2(sz.x * 9.0, P.z * 0.8));
  float alb = 0.55 + 0.45 * n3;
  alb *= 0.75 + 0.25 * smoothstep(0.2, 0.6, n4);
  if (id == 1.0) alb *= 0.65 + 0.35 * sin(P.y * 26.0 + si.w * 6.0);
  float G = colonyGlow(P.xz);
  float colonyIrr = (0.12 + 0.55 * sat(0.5 + 0.5 * N.y)) * G;
  float dif = sat(dot(N, Ln));
  vec3 R = reflect(rd, N);
  float spec = pow(sat(dot(R, Ln)), 18.0);
  float wetGl = pow(sat(R.y), 3.0) * (0.3 + 0.7 * n4);
  vec3 glowS = mix(uGlow, vec3(luma(uGlow)), 0.35);
  col = uStone * alb * (glowS * colonyIrr * 4.0 + uLamp * E * dif * 0.9);
  col += uLamp * spec * E * 0.25 + uGlow * wetGl * 0.25 * G;
  float vault = smoothstep(-0.1, -0.5, N.y) * smoothstep(1.3, 0.75, abs(th)) * smoothstep(1.5, 2.6, P.y);
  if (vault > 0.01) {
    float dots = wormDots(vec2(th * 5.0, P.z), fp) * vault;
    vec3 dc = uSilk * dots * 2.2 * G;
    col += dc;
    if (luma(dc * atten(t)) > bestL) { bestL = luma(dc * atten(t)); bestM = refl ? 7.0 : 4.0; }
  }
  col *= atten(t);
  if (luma(col) > bestL) { bestL = luma(col); bestM = refl ? 2.0 : 3.0; }
  return col;
}

vec3 traceCave(vec3 ro, vec3 rd, float tmax, bool refl, out float tHit, inout float bestL, inout float bestM){
#ifdef DEBUGGEO
  tHit = march(ro, rd, tmax);
  return debugGeo(ro, rd, tmax);
#endif
  vec3 col = vec3(0.0);
  float t = march(ro, rd, tmax);
  tHit = t;
  if (t < tmax) {
    vec3 P = ro + rd * t;
    float id; vec4 si;
    mapId(P, id, si);
    col = shadeSolid(P, rd, t, id, si, bestL, bestM, refl);
  }
  float tEnd = min(t, tmax);
  col += threadRay(ro, rd, tEnd, bestL, bestM, refl ? 6.0 : 1.0);
  col += dropRay(ro, rd, tEnd, bestL, bestM);
  return col;
}

vec3 sceneColor(vec2 p, out float mat, out float depth){
  float a = TAU * uPhase;
  float bz = 12.0 + 4.6 * sin(a);
  float bxc, bW, bC; tunnel(bz, bxc, bW, bC);
  gB = vec3(bxc - 0.4 + 2.3 * cos(a), 0.012 * sin(TAU * 9.0 * uPhase), bz);
  vec2 f2 = normalize(vec2(-2.3 * sin(a), 4.6 * cos(a)));
  gBf = vec3(f2.x, 0.0, f2.y);
  gBr = vec3(f2.y, 0.0, -f2.x);
  gLamp = gB + gBf * 1.25 + vec3(0.0, 0.84, 0.0);

  float ca = uCamAmt;
  vec3 ro = vec3(-0.6 + 0.35 * ca * sin(a + 0.4), 0.6 + 0.06 * ca * sin(2.0 * a + 1.0), 0.25 * ca * sin(a + 2.1));
  float yaw = 0.07 + 0.04 * ca * sin(a + 0.9);
  float pitch = 0.11 + 0.015 * ca * sin(2.0 * a + 0.3);
  vec3 rd = normalize(vec3(p, FOC));
  rd.yz = rot(-pitch) * rd.yz;
  rd.xz = rot(-yaw) * rd.xz;
  gPxA = uPxSize * uCellPx.x / 3.0 / FOC;
  gPyA = uPxSize * uCellPx.y / 4.0 / FOC;

  float bestL = 0.0, bestM = 3.0;
  vec3 col = vec3(0.0);
  float tw = rd.y < 0.0 ? (0.0 - ro.y) / rd.y : 1e5;
  float tH;
  col = traceCave(ro, rd, min(tw, TMAX), false, tH, bestL, bestM);
  depth = sat(min(tH, tw) / 60.0);
  if (tw < tH && tw < TMAX) {
    vec3 P = ro + rd * tw;
    float crest;
    vec2 g = waterGrad(P.xz, crest);
    vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 rr = reflect(rd, N);
    rr.y = max(rr.y, 0.01);
    float F = 0.38 + 0.5 * pow(1.0 - abs(rd.y), 5.0);
    float bL = 0.0, bM = 2.0;
    float tR;
    vec3 rc = traceCave(P + vec3(0.0, 0.001, 0.0), rr, TMAX, true, tR, bL, bM);
    vec3 wc = rc * F;
    vec3 Ld = gLamp - P; float ld = length(Ld);
    vec3 Hn = normalize(Ld / ld - rd);
    float sp = pow(sat(dot(N, Hn)), 300.0) * 30.0 / (ld * ld + 0.5) * 0.5;
    float G = colonyGlow(P.xz);
    vec3 rip = uGlow * crest * 0.12 * G + uLamp * crest * 0.04 * lampE(P);
    vec3 wadd = (uLamp * sp + rip) * atten(tw);
    wc += wadd;
    col += wc;
    if (luma(wc) > bestL) { bestL = luma(wc); bestM = (luma(wadd) > luma(rc * F) || bM == 3.0) ? 2.0 : bM; }
    depth = sat(tw / 60.0);
  }
  mat = bestM;
#ifdef DEBUGGEO
  mat = 19.0;
  col = max(col, vec3(0.004));
#endif
  return col;
}
`,
  });
})();

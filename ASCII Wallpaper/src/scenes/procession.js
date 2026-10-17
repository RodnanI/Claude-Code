// "The Procession": colossal stilt-legged shell creatures carrying fragments of
// towns walk across a flooded salt flat at dusk, drawn like an engraving in
// coloured type: contour lines, concentric hatching, radiating sun rays.
//
// Everything is evaluated in screen space with an analytic ground plane:
// creatures are 2D side-view SDF figures placed at their depth, the flat
// mirrors them about their own ground contact line, and the hexagonal salt
// crust is projected in perspective.
//
// Loop: 120 s = 15 gait cycles of 8 s. The camera tracks the procession at
// 1.5 m/s, so the ground scrolls 180 m per loop = 80 periods of the hex crust.
ASCII.registerScene({
  id: 'procession',
  name: 'The Procession',
  tagline: 'walking towns on a mirror of salt',
  loop: 120,
  startAt: 14,
  bg: '#0a0908',
  bigDepth: 0.004,
  look: { exposure: 4.0, colGamma: 0.65, brightness: 1.15 },
  palettes: [
    {
      name: 'Dusk',
      colors: {
        uSun: '#fff0d2', uGlow: '#ffa257', uHigh: '#9a6a52', uZen: '#2c3836', uRim: '#ffd59a', uBody: '#6b5642',
        uWin: '#ffb04a', uSalt: '#efe2c8', uLeaf: '#9fae62', uFlag: '#e0603e',
      },
    },
    {
      name: 'Moonlit',
      colors: {
        uSun: '#f4f6ef', uGlow: '#b9c9bd', uHigh: '#62736c', uZen: '#1f2826', uRim: '#e6efe8', uBody: '#4a5853',
        uWin: '#ffb75e', uSalt: '#dfe7e1', uLeaf: '#8aa58b', uFlag: '#d6ac52',
      },
    },
    {
      name: 'Ember',
      colors: {
        uSun: '#ffe7b8', uGlow: '#f0582e', uHigh: '#7e3826', uZen: '#24181a', uRim: '#ffb878', uBody: '#6e4632',
        uWin: '#ffd884', uSalt: '#f3d4b2', uLeaf: '#bca858', uFlag: '#f2d474',
      },
    },
  ],
  glyphSets: {
    1: { edge: ' .,`\'-_/\\|:;~', tone: ' .,:-~' },                                  // sky: rays, hatching
    2: { edge: ' .,`\'-_()/\\|=:o*+<>^v', tone: ' .:-=+*o' },                         // sun
    3: { edge: ' .,`\'-_:;!|/\\()[]{}<>=+*#iltLTJVYAHIX^v7', tone: ' .:-=+#' },        // contours, linework
    4: { edge: ' .,`\':;*%&@o0eacs(){}~', tone: ' .:;*%&@' },                         // foliage
    5: { edge: ' .,`\'-_/\\|:;~=', tone: ' .-:=' },                                   // salt ridges
    6: { edge: ' .,`\'-_~=:', tone: ' .-~=' },                                        // water strokes
    7: { edge: ' .,`\':;!|+*#=[]', tone: ' .:+*#' },                                  // windows, lamps
    8: { edge: ' .`\'*+^v~-', tone: ' .`\'' },                                        // stars, birds
    9: { edge: ' .,`\'-_=~^v<>/\\|', tone: ' .-=' },                                  // flags, pennants
    11: { edge: ' .,`\'-_~=:()', tone: ' .-~=' },                                     // cloud bands
  },
  glsl: `
const float FOC = 1.55;     // focal length in screen units
const float CAMH = 2.4;     // camera height above the flat (m)
const float VEL = 1.5;      // walking speed (m/s)
const float TG = 8.0;       // gait period (s): 15 cycles per 120 s loop
const float HEXS = 2.25;    // hex crust period (m): 180 m / 80
float HOR = -0.13;          // horizon height on screen
vec2 SUN;
float camX, camDX;
float LW;                   // half width of a drawn line, screen units

// ---------------------------------------------------------------- helpers
float sdTaper(vec2 p, vec2 a, vec2 b, float ra, float rb){
  vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(ra, rb, h);
}
float sdEll(vec2 p, vec2 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-5); }
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2){
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2, v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * sat(dot(v0, e0) / dot(e0, e0));
  vec2 pq1 = v1 - e1 * sat(dot(v1, e1) / dot(e1, e1));
  vec2 pq2 = v2 - e2 * sat(dot(v2, e2) / dot(e2, e2));
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
// pointy hex tiling, period 1 along x; xy = offset from cell centre, zw = cell id
vec4 hexCell(vec2 p){
  const vec2 HS = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / HS.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * HS, p - (hc.zw + 0.5) * HS);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
}
float hexEdge(vec2 h){ h = abs(h); return 0.5 - max(dot(h, vec2(0.5, 0.8660254)), h.x); }

// creature table: screen x, depth (m), gait phase, kind
vec4 creature(int i){
  if (i == 0) return vec4(-1.06, 52.0, 0.00, 0.0);
  if (i == 1) return vec4(-0.16, 104.0, 0.37, 1.0);
  if (i == 2) return vec4(0.44, 178.0, 0.71, 2.0);
  if (i == 3) return vec4(0.84, 300.0, 0.18, 3.0);
  if (i == 4) return vec4(1.22, 520.0, 0.55, 4.0);
  if (i == 5) return vec4(1.50, 860.0, 0.83, 1.0);
  if (i == 6) return vec4(1.78, 1350.0, 0.29, 2.0);
  return vec4(2.05, 2100.0, 0.64, 3.0);
}
#define NCRE 8
float groundY(float z){ return HOR - FOC * CAMH / z; }
float creX(vec4 c){ return c.x - FOC * camDX / c.y; }

// ---------------------------------------------------------------- figures
// Every figure function returns vec4(dist m, emission, linework, material)
// in creature space: metres, origin at the ground below the body centre.
vec2 footAt(float phi, float baseX){
  float S = VEL * TG;
  if (phi < 0.75) { float u = phi / 0.75; return vec2(baseX + S * 0.5 - S * u, 0.0); }
  float u = (phi - 0.75) / 0.25; float e = u * u * (3.0 - 2.0 * u);
  return vec2(baseX - S * 0.5 + S * e, 2.4 * sin(PI * u) * (1.0 - 0.3 * u));
}
vec2 knee(vec2 h, vec2 f, float l1, float l2, float bend){
  vec2 d = f - h; float L = clamp(length(d), abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  vec2 u = normalize(d);
  float a = (l1 * l1 + L * L - l2 * l2) / (2.0 * l1 * L);
  return h + l1 * (a * u + sqrt(max(0.0, 1.0 - a * a)) * vec2(-u.y, u.x) * bend);
}
// one leg: hip h, gait phase, base x; bend sign; returns distance + linework
vec2 leg(vec2 q, vec2 h, float phi, float baseX, float bend, float thick){
  vec2 f = footAt(phi, baseX) + vec2(0.0, 0.55);
  vec2 k = knee(h, f, 10.6, 10.0, bend);
  float d1 = sdTaper(q, h, k, 0.95 * thick, 0.55 * thick);
  float d2 = sdTaper(q, k, f, 0.5 * thick, 0.36 * thick);
  float pad = sdEll(q - f + vec2(0.0, 0.25), vec2(1.05, 0.42) * thick);
  float d = min(min(d1, d2), pad);
  // knee and ankle rings
  float ln = smoothstep(0.12, 0.0, abs(length(q - k) - 0.75 * thick)) + smoothstep(0.1, 0.0, abs(length(q - f) - 0.55 * thick)) * 0.7;
  // longitudinal hatching along the shin
  vec2 kf = f - k; float t = dot(q - k, kf) / dot(kf, kf);
  ln += 0.35 * smoothstep(0.08, 0.0, abs(fract(t * 7.0) - 0.5) - 0.42) * step(0.0, t) * step(t, 1.0);
  return vec2(d, ln);
}

vec4 structTemple(vec2 r, float sway, float seed){
  float d = 1e9, em = 0.0, ln = 0.0, mt = 3.0;
  for (int k = 0; k < 4; k++) {
    float fk = float(k), w = 6.8 - 1.55 * fk, y0 = fk * 2.5;
    float b = sdBox(r - vec2(0.0, y0 + 1.25), vec2(w, 1.25));
    d = min(d, b);
    // ledge line at each tier top and arched windows
    ln += smoothstep(0.09, 0.0, abs(r.y - (y0 + 2.5))) * step(abs(r.x), w);
    float wx = fract(r.x / 1.35 + 0.5) - 0.5;
    float cid = floor(r.x / 1.35 + 0.5);
    float win = step(abs(wx), 0.17) * step(abs(r.y - (y0 + 1.15)), 0.45) * step(abs(r.x), w - 0.5);
    float lit = step(0.42, hash12(vec2(cid, fk + seed * 7.0)));
    float fl = 0.85 + 0.15 * sin(TAU * (uPhase * 3.0 + hash12(vec2(cid, fk)) ));
    em += win * lit * fl;
    ln += win * (1.0 - lit) * 0.6;
  }
  // shrine
  float sh = sdBox(r - vec2(0.0, 11.3), vec2(1.5, 1.3));
  sh = min(sh, sdTri(r, vec2(-2.1, 12.5), vec2(2.1, 12.5), vec2(0.0, 15.6)));
  d = min(d, sh);
  em += step(abs(r.x), 0.35) * step(abs(r.y - 11.0), 0.7) * 1.3;
  ln += smoothstep(0.1, 0.0, abs(r.y - 12.55)) * step(abs(r.x), 2.0);
  // hanging vines from the tier edges, swaying with the gait
  for (int v = 0; v < 6; v++) {
    float fv = float(v);
    float side = v < 3 ? -1.0 : 1.0;
    float tier = mod(fv, 3.0);
    float x0 = side * (6.8 - 1.55 * tier + 0.15);
    float y0 = tier * 2.5 + 2.4;
    float len = 2.5 + 3.5 * hash11(fv + seed * 13.0) + tier * 0.8;
    float yy = y0 - r.y;
    float sx = x0 + side * 0.1 + sway * yy * 0.06 + 0.25 * sin(TAU * (uPhase * 5.0 + fv * 0.21) + yy * 0.7) * (yy / len);
    float dv = abs(r.x - sx) - 0.13;
    dv = max(dv, max(-yy, yy - len));
    if (dv < d) { mt = 4.0; }
    d = min(d, dv);
  }
  // little trees on the tier corners
  for (int t = 0; t < 4; t++) {
    float ft = float(t);
    float side = t < 2 ? -1.0 : 1.0;
    float tier = mod(ft, 2.0) + 1.0;
    vec2 c = vec2(side * (6.8 - 1.55 * tier - 0.7), tier * 2.5 + 1.3);
    float dc = length(r - c) - 1.25 - 0.25 * vnoise(r * 2.3 + seed);
    dc = min(dc, sdBox(r - c + vec2(0.0, 1.0), vec2(0.12, 0.9)));
    if (dc < d) mt = 4.0;
    d = min(d, dc);
  }
  return vec4(d, em, ln, mt);
}

vec4 structTower(vec2 r, float sway, float seed){
  float d = 1e9, em = 0.0, ln = 0.0, mt = 3.0;
  float w = mix(1.7, 1.2, sat(r.y / 19.0));
  d = sdBox(r - vec2(0.0, 9.5), vec2(w, 9.5));
  // storey bands and slit windows
  float fy = fract(r.y / 3.0);
  ln += smoothstep(0.035, 0.0, abs(fy - 0.02)) * step(r.y, 19.0);
  float storey = floor(r.y / 3.0);
  float slit = step(abs(r.x - (hash11(storey + seed) - 0.5) * 0.9), 0.17) * step(abs(fy - 0.55), 0.22) * step(r.y, 18.0);
  em += slit * step(0.35, hash11(storey * 3.1 + seed));
  // balcony and lantern room
  d = min(d, sdBox(r - vec2(0.0, 19.3), vec2(2.4, 0.3)));
  float posts = step(abs(fract(r.x / 0.6) - 0.5), 0.12) * step(abs(r.y - 20.0), 0.6) * step(abs(r.x), 2.35);
  float rail = smoothstep(0.08, 0.0, abs(r.y - 20.6)) * step(abs(r.x), 2.4);
  ln += posts + rail;
  float lr = sdBox(r - vec2(0.0, 21.4), vec2(1.15, 1.6));
  d = min(d, lr);
  float mull = step(abs(fract(r.x / 0.75) - 0.5), 0.1);
  float lamp = (1.0 - mull) * step(abs(r.x), 1.0) * step(abs(r.y - 21.4), 1.35);
  em += lamp * (1.9 + 0.25 * sin(TAU * uPhase * 4.0));
  // roof, finial
  d = min(d, sdTri(r, vec2(-1.9, 22.9), vec2(1.9, 22.9), vec2(0.0, 27.0)));
  d = min(d, sdBox(r - vec2(0.0, 28.0), vec2(0.07, 1.1)));
  ln += smoothstep(0.1, 0.0, abs(r.y - 22.95)) * step(abs(r.x), 1.9);
  // pennant streaming from the finial
  float px = r.x;
  if (px > 0.0 && px < 9.0) {
    float wav = 0.55 * sin(px * 0.9 - TAU * uPhase * 15.0) * (px / 9.0) + sway * 0.3;
    float hw = 0.45 * (1.0 - px / 9.0) + 0.05;
    float dp = abs(r.y - 28.6 - wav) - hw;
    if (dp < d) mt = 9.0;
    d = min(d, dp);
  }
  return vec4(d, em, ln, mt);
}

vec4 structVillage(vec2 r, float sway, float seed){
  float d = 1e9, em = 0.0, ln = 0.0, mt = 3.0;
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float x = -6.0 + fk * 3.0 + (hash11(fk + seed) - 0.5) * 0.8;
    float hw = 1.1 + 0.5 * hash11(fk * 7.3 + seed);
    float hh = 1.6 + 2.2 * hash11(fk * 3.7 + seed) + (2.0 - abs(fk - 2.0)) * 1.1;
    float base = -0.6 * abs(x) / 6.0 * 1.5;
    vec2 c = vec2(x, base + hh);
    d = min(d, sdBox(r - c, vec2(hw, hh)));
    float rf = sdTri(r, vec2(x - hw - 0.45, base + 2.0 * hh), vec2(x + hw + 0.45, base + 2.0 * hh), vec2(x, base + 2.0 * hh + 1.6 + 0.4 * hash11(fk)));
    d = min(d, rf);
    ln += smoothstep(0.08, 0.0, abs(r.y - base - 2.0 * hh)) * step(abs(r.x - x), hw + 0.45);
    float wy = fract((r.y - base) / 1.6) - 0.5, wx = fract((r.x - x) / 1.0) - 0.5;
    float win = step(abs(wx), 0.18) * step(abs(wy), 0.22) * step(abs(r.x - x), hw - 0.3) * step(0.6, r.y - base) * step(r.y - base, 2.0 * hh - 0.4);
    float id = hash12(floor(vec2((r.x - x) / 1.0, (r.y - base) / 1.6)) + vec2(fk * 11.0, seed));
    em += win * step(0.5, id) * (0.8 + 0.2 * sin(TAU * (uPhase * 2.0 + id)));
    ln += win * step(id, 0.5) * 0.5;
  }
  // bell tower
  d = min(d, sdBox(r - vec2(1.6, 7.5), vec2(0.65, 7.5)));
  d = min(d, sdTri(r, vec2(0.7, 15.0), vec2(2.5, 15.0), vec2(1.6, 18.5)));
  em += step(abs(r.x - 1.6), 0.3) * step(abs(r.y - 13.6), 0.5) * 1.2;
  // laundry line with fluttering flags between two roofs
  float lx = (r.x + 4.5) / 6.0;
  if (lx > 0.0 && lx < 1.0) {
    float ly = 6.6 - 1.2 * sin(PI * lx) + sway * 0.2;
    ln += smoothstep(0.07, 0.0, abs(r.y - ly)) * 1.2;
    float fx = fract(lx * 7.0);
    float flag = step(fx, 0.55) * step(r.y, ly) * step(ly - 0.7 - 0.2 * sin(TAU * uPhase * 10.0 + lx * 9.0), r.y);
    if (flag > 0.5) { d = min(d, -0.05); mt = 9.0; }
  }
  return vec4(d, em, ln, mt);
}

vec4 structTree(vec2 r, float sway, float seed){
  float d = 1e9, em = 0.0, ln = 0.0, mt = 3.0;
  d = sdTaper(r, vec2(0.0, -1.0), vec2(0.4 + sway * 0.1, 9.0), 1.7, 0.8);
  d = min(d, sdTaper(r, vec2(0.3, 6.0), vec2(-5.0, 10.5), 0.7, 0.35));
  d = min(d, sdTaper(r, vec2(0.4, 7.5), vec2(5.5, 11.5), 0.65, 0.3));
  ln += 0.6 * smoothstep(0.1, 0.0, abs(fract(r.x * 1.3 + vnoise(r * vec2(0.5, 2.0)) * 1.5) - 0.5) - 0.38) * step(r.y, 9.0) * step(abs(r.x), 1.5);
  // canopy: lobed, leafy edge, moves with the gait and a slow breeze
  vec2 cr = r - vec2(sway * 0.4, 0.0);
  float cn = 1e9;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    vec2 c = vec2(-7.0 + fk * 2.8, 11.5 + 2.4 * sin(fk * 1.7 + seed) + (2.5 - abs(fk - 2.5)) * 1.2);
    cn = min(cn, length(cr - c) - 3.0 - 0.6 * hash11(fk + seed));
  }
  float leaf = gnoise(vec3(cr * 1.3, uPhase * 6.0), ivec3(0, 0, 6));
  cn += 0.55 * leaf + 0.25 * vnoise(cr * 4.0);
  if (cn < d) mt = 4.0;
  d = min(d, cn);
  // aerial roots hanging from the branches past the shell
  for (int v = 0; v < 7; v++) {
    float fv = float(v);
    float x0 = -6.5 + fv * 2.1 + 0.4 * hash11(fv + seed);
    float len = 9.0 + 6.0 * hash11(fv * 3.3 + seed);
    float yy = 10.0 - r.y;
    float sx = x0 + sway * yy * 0.05 + 0.18 * sin(TAU * (uPhase * 4.0 + fv * 0.17) + yy * 0.5) * (yy / len);
    float dv = max(abs(r.x - sx) - 0.09, max(-yy, yy - len));
    if (dv < d) mt = 3.0;
    d = min(d, dv);
  }
  // hanging lamps in the canopy
  for (int l = 0; l < 4; l++) {
    float fl = float(l);
    vec2 c = vec2(-5.0 + fl * 3.4, 9.2 + hash11(fl + seed) * 2.0);
    c.x += 0.25 * sin(TAU * (uPhase * 6.0 + fl * 0.3));
    float dl = length(r - c) - 0.35;
    em += smoothstep(0.1, -0.1, dl) * 2.2;
  }
  return vec4(d, em, ln, mt);
}

vec4 structArch(vec2 r, float sway, float seed){
  float d = 1e9, em = 0.0, ln = 0.0, mt = 3.0;
  d = min(sdBox(r - vec2(-3.6, 4.5), vec2(0.75, 4.5)), sdBox(r - vec2(3.6, 4.5), vec2(0.75, 4.5)));
  vec2 a = r - vec2(0.0, 9.0);
  float ring = max(abs(length(a) - 3.6) - 0.8, -a.y);
  d = min(d, ring);
  d = min(d, sdBox(r - vec2(0.0, 13.2), vec2(0.5, 0.6)));
  ln += smoothstep(0.08, 0.0, abs(fract(r.y / 1.1) - 0.5) - 0.44) * step(r.y, 9.0) * step(abs(abs(r.x) - 3.6), 0.75);
  ln += smoothstep(0.1, 0.0, abs(fract(atan(a.y, a.x) / PI * 9.0) - 0.5) - 0.44) * step(abs(length(a) - 3.6), 0.8) * step(0.0, a.y);
  // the bell swings on its rope
  float ang = 0.32 * sin(TAU * uPhase * 15.0 + 1.3) + sway * 0.05;
  vec2 piv = vec2(0.0, 12.0);
  vec2 bl = rot(-ang) * (r - piv);
  float rope = max(abs(bl.x) - 0.06, max(bl.y, -bl.y - 3.2));
  float bell = sdTri(bl, vec2(-1.3, -5.6), vec2(1.3, -5.6), vec2(0.0, -2.9));
  bell = min(bell, length(bl - vec2(0.0, -3.3)) - 0.75);
  d = min(d, min(rope, bell));
  em += smoothstep(0.2, -0.2, length(bl - vec2(0.0, -5.4)) - 0.35) * 0.6;
  // prayer flags from the arch top down to the shell rim on both sides
  for (int s = 0; s < 2; s++) {
    float side = s == 0 ? -1.0 : 1.0;
    float lx = (r.x * side) / 9.5;
    if (lx > 0.05 && lx < 1.0) {
      float ly = mix(12.5, -0.5, lx) - 2.2 * sin(PI * lx) + sway * 0.2;
      ln += smoothstep(0.06, 0.0, abs(r.y - ly)) * 1.1;
      float fx = fract(lx * 11.0);
      float fl = step(fx, 0.6) * step(r.y, ly) * step(ly - 0.8 - 0.25 * sin(TAU * uPhase * 12.0 + lx * 13.0 + side), r.y);
      if (fl > 0.5) { d = min(d, -0.05); mt = 9.0; }
    }
  }
  return vec4(d, em, ln, mt);
}

// whole creature in creature space (q in metres, ground at y = 0)
vec4 figure(vec2 q, int i, vec4 c){
  float ph = fract(uTime / TG + c.z);
  float bob = 0.4 * cos(TAU * 2.0 * ph);
  float by = 19.4 + bob;
  float d = 1e9, em = 0.0, ln = 0.0, mt = 3.0;
  // quick reject outside the bounding box
  if (q.x < -16.0 || q.x > 18.0 || q.y < -1.0 || q.y > 58.0) return vec4(5.0, 0.0, 0.0, 3.0);
  // legs: near side LH LF, far side RH RF (lateral sequence walk)
  float farFade = 0.0;
  vec2 lg;
  lg = leg(q, vec2(-4.8, by - 2.6), fract(ph + 0.0), -4.8, 1.0, 1.0); d = lg.x; ln += lg.y;
  lg = leg(q, vec2(4.8, by - 2.6), fract(ph + 0.25), 4.8, 1.0, 1.0); if (lg.x < d) { d = lg.x; } ln += lg.y;
  vec2 lf = leg(q - vec2(0.8, 0.0), vec2(-4.8, by - 2.6), fract(ph + 0.5), -4.8, 1.0, 0.85);
  vec2 rf = leg(q - vec2(0.8, 0.0), vec2(4.8, by - 2.6), fract(ph + 0.75), 4.8, 1.0, 0.85);
  float dfar = min(lf.x, rf.x);
  // shell: dome with a flat belly and a scalloped skirt
  vec2 sq = q - vec2(0.0, by + 0.8);
  float shell = max(sdEll(sq, vec2(9.8, 6.3)), -(q.y - (by - 2.3)));
  float scal = (q.y - (by - 2.3)) - 0.35 * abs(sin(q.x * 1.6));
  shell = min(shell, max(abs(sq.x) - 9.9, max(-scal, q.y - (by - 0.6))));
  // neck and head, bobbing with the stride
  float hb = 0.35 * sin(TAU * (2.0 * ph + 0.15));
  vec2 hd = vec2(13.7, by + 2.6 + hb);
  float neck = sdTaper(q, vec2(8.2, by + 0.2), vec2(11.6, by + 2.0 + hb * 0.6), 1.55, 0.95);
  float head = sdEll(q - hd, vec2(2.1, 1.25));
  head = min(head, sdTaper(q, hd + vec2(1.2, -0.6), hd + vec2(2.9, -1.6 + hb * 0.5), 0.35, 0.15));
  float tail = sdTaper(q, vec2(-9.0, by - 0.6), vec2(-11.8, by - 2.8), 0.75, 0.2);
  float body = min(min(shell, neck), min(head, tail));
  // shell scutes: hexagons on the dome, drawn as fine linework
  if (shell < 0.5) {
    vec2 su = vec2(sq.x / (0.6 + 0.4 * sqrt(max(0.0, 1.0 - sq.y * sq.y / 40.0))), sq.y * 1.25) / 3.1;
    vec4 hc = hexCell(su);
    ln += smoothstep(0.07, 0.0, hexEdge(hc.xy)) * 0.9 * step(shell, 0.0);
    ln += smoothstep(0.12, 0.0, abs(q.y - (by - 0.6))) * step(abs(sq.x), 9.9) * 0.8;
  }
  ln += smoothstep(0.12, 0.0, abs(length(q - hd - vec2(0.9, 0.3)) - 0.28)) * 1.5;
  if (body < d) mt = 12.0;
  d = min(d, body);
  // the town on its back sways with the gait
  float sway = sin(TAU * (2.0 * ph + 0.3));
  vec2 r = q - vec2(0.0, by + 6.0);
  r = rot(sway * 0.012) * r;
  vec4 st;
  int kind = int(c.w + 0.5);
  if (r.y > -3.0) {
    if (kind == 0) st = structTemple(r, sway, float(i));
    else if (kind == 1) st = structTower(r, sway, float(i));
    else if (kind == 2) st = structVillage(r, sway, float(i));
    else if (kind == 3) st = structTree(r, sway, float(i));
    else st = structArch(r, sway, float(i));
    if (st.x < d) { mt = st.w; }
    d = min(d, st.x);
    em += st.y; ln += st.z;
  }
  // far legs sit behind everything else: they only show outside the near silhouette
  if (d > 0.0 && dfar < d) { d = dfar; mt = 10.0; ln = (lf.y + rf.y) * 0.5; em = 0.0; }
  return vec4(d, em, ln, mt);
}

// ---------------------------------------------------------------- sky
// slowly drifting noise that still loops: two copies one loop of drift apart,
// cross-faded with the variance held constant
float driftNoise(vec2 x, vec2 wind){
  float a = vnoise(x + wind * uPhase);
  float b = vnoise(x + wind * (uPhase - 1.0));
  float k = uPhase;
  return 0.5 + ((a - 0.5) * (1.0 - k) + (b - 0.5) * k) / sqrt((1.0 - k) * (1.0 - k) + k * k);
}
float lineAt(float d){ return smoothstep(LW + uPxSize * 0.7, LW - uPxSize * 0.7, abs(d)); }

// long stratus bands near the horizon: dark lenses that hide whatever is
// behind them, with a sunlit underside line. x: inside, y: underside line
vec2 stratus(vec2 p, float sd){
  vec2 res = vec2(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float yk = HOR + 0.075 + 0.085 * fk + 0.04 * fk * fk;
    float sc = 1.6 / (1.0 + 0.6 * fk);
    float x = p.x * sc;
    float gap = driftNoise(vec2(x * 0.8, fk * 7.3), vec2(1.1 + 0.3 * fk, 0.0));
    float th = (0.006 + 0.007 * fk) * smoothstep(0.45, 0.62, gap);
    if (th <= 0.0) continue;
    float n1 = driftNoise(vec2(x * 3.1, fk * 3.1 + 40.0), vec2(2.2, 0.0));
    float n2 = driftNoise(vec2(x * 2.4, fk * 5.7 + 80.0), vec2(2.2, 0.0));
    float bot = yk - th * (0.4 + 0.9 * n1);
    float top = yk + th * (0.6 + 1.6 * n2);
    float inside = smoothstep(bot - uPxSize, bot + uPxSize, p.y) * smoothstep(top + uPxSize, top - uPxSize, p.y);
    res.x = max(res.x, inside);
    res.y = max(res.y, lineAt(p.y - bot) * (0.3 + 1.6 * exp(-sd * 1.6)) * smoothstep(0.45, 0.62, gap));
  }
  return res;
}

vec3 skyCol(vec2 p, bool refl, out float mat){
  mat = 1.0;
  float h = p.y - HOR;
  vec2 d = p - SUN;
  float r = length(d);
  float sd = length(d * vec2(0.75, 1.0));
  vec3 col = vec3(0.0);
  // twilight hatching: undulating lines whose spacing widens with height
  // (one per text row at the horizon, several rows apart overhead), brightness
  // following the glow; they break into long dashes as the sky darkens
  float rowH2 = uCellPx.y * uPxSize;
  float h0 = 0.16;
  float A = h0 / rowH2;
  float hh = max(h, 0.0);
  float v = A * log(1.0 + hh / h0) + 0.25 * sin(p.x * 2.1 + hh * 7.0) + 0.12 * sin(p.x * 5.3 - 1.7);
  float spacing = (hh + h0) / A;
  float hl = lineAt((fract(v + 0.5) - 0.5) * spacing);
  float glow = exp(-hh * 2.2) * (0.3 + 1.5 * exp(-sd * 1.4)) + 0.04;
  float dn = vnoise(vec2(p.x / (uCellPx.x * uPxSize) * 0.12, floor(v + 0.5) * 2.3 + 11.0));
  float dash = smoothstep(0.62 - glow * 0.6, 0.7 - glow * 0.6, dn);
  vec3 htint = mix(uZen * 2.0, uHigh * 1.3, sat(glow * 1.5));
  htint = mix(htint, uGlow, sat(exp(-sd * 1.8) * 1.2));
  vec2 st2 = stratus(p, sd);
  float deck = st2.x;
  col += htint * hl * dash * min(glow, 1.4) * 1.1 * (1.0 - deck);
  col += mix(uHigh, uGlow, sat(exp(-sd * 1.5) * 1.3)) * st2.y * 1.2;
  if (deck > 0.3 || st2.y > 0.2) mat = 11.0;
  // a sparse fan of rays from the sun, seen in the gaps of the deck
  float ang = atan(d.y, d.x);
  float N = 72.0;
  float u = ang / PI * N;
  float id = floor(u);
  float hr = hash11(id + 0.37);
  float perp = abs(fract(u) - 0.5 - (hr - 0.5) * 0.4) * (PI / N) * r;
  float h2 = hash11(id + 7.1);
  float len = 0.3 + 2.6 * h2 * h2;
  float str = step(0.35, hash11(id + 3.3)) * (0.55 + 0.45 * sin(TAU * (uPhase * float(1 + int(hr * 3.0)) + hr * 5.0)));
  float ray = lineAt(perp) * smoothstep(len, len * 0.5, r) * smoothstep(0.08, 0.14, r) * step(0.0, d.y);
  col += mix(uHigh, uGlow, exp(-r * 1.5)) * ray * str * (1.3 / (1.0 + 2.5 * r)) * (1.0 - deck);
  // the sun: a disc of fine concentric rings inside a bright limb, short corona
  float R = 0.06;
  if (r < R + LW * 2.0) {
    float limb = lineAt(r - R) * 3.0;
    float ringSp = LW * 2.6;
    float rings = lineAt((fract(r / ringSp + 0.5) - 0.5) * ringSp) * step(r, R);
    vec3 sc = uSun * (limb + rings * 2.0) + uGlow * 0.6 * step(r, R);
    col = mix(col, sc, step(r, R + LW * 2.0));
    mat = 2.0;
  } else if (r < R * 2.0) {
    float a2 = fract(ang / TAU * 40.0) - 0.5;
    float cor = lineAt(a2 * TAU / 40.0 * r) * smoothstep(R * 2.0, R * 1.15, r) * step(0.4, hash11(floor(ang / TAU * 40.0)));
    col += uSun * cor * 1.3 * (1.0 - deck);
    if (cor > 0.1) mat = 2.0;
  }
  // stars in the gaps of the upper sky
  if (!refl && h > 0.4 && deck < 0.1) {
    vec2 g = p * 85.0;
    vec2 gid = floor(g), f = fract(g) - 0.5;
    float hs = hash12(gid + 31.0);
    if (hs > 0.95) {
      vec2 o = (hash22(gid) - 0.5) * 0.6;
      float st = smoothstep(0.18, 0.0, length(f - o)) * (hs - 0.95) * 20.0 * smoothstep(0.4, 0.75, h);
      st *= 0.85 + 0.15 * sin(TAU * (uPhase * 4.0 + hs * 9.0));
      col += mix(uSun, uRim, hs) * st * 0.4;
      if (st > 0.05) mat = 8.0;
    }
  }
  // the far range: low dark silhouette with a lit crest
  float mh = 0.012 + 0.02 * vnoise(vec2(p.x * 3.1 + 2.0, 0.0)) + 0.008 * vnoise(vec2(p.x * 13.0, 1.0));
  if (h < mh) {
    float crest = lineAt(h - mh) * (0.25 + 1.2 * exp(-abs(p.x - SUN.x) * 2.0));
    col = uBody * 0.03 + uRim * crest;
    mat = 3.0;
  }
  return col;
}

// birds circling the towers
vec3 birds(vec2 p, inout float mat){
  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 c = creature(i);
    float s = FOC / c.y;
    vec2 top = vec2(creX(c), groundY(c.y) + 44.0 * s);
    if (abs(p.x - top.x) > 40.0 * s || abs(p.y - top.y) > 16.0 * s) continue;
    for (int b = 0; b < 5; b++) {
      float fb = float(b);
      float ang = TAU * (uPhase * float(3 + b % 3) + fb * 0.27 + float(i) * 0.41);
      vec2 bp = top + vec2(cos(ang) * (9.0 + 4.0 * fb), sin(ang) * 2.0 + 3.0 + fb * 1.4) * s;
      vec2 lp = (p - bp) / s;
      float flap = sin(TAU * (uPhase * 90.0 + fb * 0.37));
      float wing = 0.9 + 0.6 * flap;
      float dw = min(sdSegment(lp, vec2(0.0), vec2(-1.3, wing)), sdSegment(lp, vec2(0.0), vec2(1.3, wing)));
      float w = smoothstep((LW + uPxSize) / s, 0.0, dw);
      if (w > 0.0) { col = max(col, uSun * 0.6 * w); mat = 8.0; }
    }
  }
  return col;
}

// ---------------------------------------------------------------- figures in the image
// Draws the creatures at screen point p as an engraving: dark masses, a
// contour line brighter where it faces the sun, concentric hatching on the
// shells, linework, lit windows. mirror = true reflects each creature about its
// own ground line. Front-to-back premultiplied result; hitZ = nearest hit.
vec4 drawFigures(vec2 p, bool mirror, float minZ, out float hitZ, out float mat){
  vec4 acc = vec4(0.0);
  hitZ = 1e9;
  for (int i = 0; i < NCRE; i++) {
    vec4 c = creature(i);
    if (c.y < minZ) continue;
    float s = FOC / c.y;
    float yg = groundY(c.y);
    vec2 pp = p;
    if (mirror) pp.y = 2.0 * yg - p.y;
    vec2 q = (pp - vec2(creX(c), yg)) / s;
    if (q.x < -17.0 || q.x > 19.0 || q.y < -1.5 || q.y > 60.0) continue;
    vec4 f = figure(q, i, c);
    float pxm = uPxSize / s;
    float lwm = LW / s;
    float cov = smoothstep(pxm, -pxm, f.x);
    float contour = smoothstep(lwm + pxm, lwm - pxm, abs(f.x));
    float a = max(cov, contour);
    if (a <= 0.0) continue;
    vec2 sdir = normalize(SUN - pp + vec2(0.0, 0.2));
    if (mirror) sdir.y = -sdir.y;
    float facing = 0.5;
    if (contour > 0.0) {
      float e = max(pxm, 0.06);
      float dx = figure(q + vec2(e, 0.0), i, c).x - f.x;
      float dy = figure(q + vec2(0.0, e), i, c).x - f.x;
      vec2 n = normalize(vec2(dx, dy) + 1e-6);
      facing = max(0.0, dot(n, sdir));
    }
    float haze = 1.0 - exp(-c.y / 1800.0);
    float far = f.w > 9.5 && f.w < 10.5 ? 0.5 : 1.0;
    vec3 col = uBody * 0.015;
    // concentric hatching inside the shells, densest near the outline
    if (f.w > 11.5) {
      float hs = max(0.9, uCellPx.y * uPxSize * 1.7 / s);
      float t = -f.x / hs;
      float hl = smoothstep(lwm * 0.8 + pxm, lwm * 0.8 - pxm, abs(fract(t) - 0.5) * hs) * step(0.5, t);
      col += uBody * hl * step(t, 1.6) * 0.35;
    }
    col += uBody * 0.22 * sat(f.z) * far * (f.w > 11.5 ? 0.5 : 1.0);    // linework
    if (f.w > 3.5 && f.w < 4.5) {                                       // foliage stipple
      float lv = vnoise(q * 3.0 + float(i)) * 0.6 + vnoise(q * 7.0) * 0.4;
      col = uLeaf * 0.6 * smoothstep(0.5, 0.75, lv);
    }
    if (f.w > 8.5 && f.w < 9.5) col = uFlag * 0.55;                     // flags
    col += uWin * f.y * 1.4 * far;                                      // windows, lamps
    vec3 line = mix(uBody * 2.2, uRim * 2.0, pow(facing, 1.5)) * far;
    col = mix(col, line, contour);
    vec3 hz = mix(uHigh, uGlow, exp(-abs(pp.x - SUN.x) * 1.5)) * 0.4;
    col = mix(col, hz * (0.3 + contour), haze * (0.45 + 0.4 * uAtmos));
    float wgt = (1.0 - acc.a) * a;
    acc.rgb += col * wgt;
    if (wgt > 0.25 && hitZ > 1e8) {
      hitZ = c.y;
      mat = (f.w > 3.5 && f.w < 4.5) ? 4.0 : (f.y > 0.3 ? 7.0 : ((f.w > 8.5 && f.w < 9.5) ? 9.0 : 3.0));
    }
    acc.a += wgt;
    if (acc.a > 0.995) break;
  }
  return acc;
}

vec3 sceneColor(vec2 p, out float mat, out float depth){
  camX = VEL * uTime;
  camDX = uCamAmt * 4.0 * sin(TAU * uPhase);
  SUN = vec2(1.02, HOR + 0.095);
  // a line must be at least one sub-cell sample wide to be caught reliably
  LW = 0.62 * max(uCellPx.x / 3.0, uCellPx.y / 4.0) * uPxSize;
  mat = 1.0; depth = 1.0;
  vec3 col;
  float hz; float fm = 3.0;
  if (p.y >= HOR) {
    float sm;
    col = skyCol(p, false, sm);
    mat = sm;
    col += birds(p, mat);
    vec4 fg = drawFigures(p, false, 0.0, hz, fm);
    col = fg.rgb + (1.0 - fg.a) * col;
    if (fg.a > 0.5) { mat = fm; depth = hz / 3000.0; }
    return col;
  }
  // ---- the flat
  float Z = FOC * CAMH / (HOR - p.y);
  float X = camX + camDX + p.x * Z / FOC;
  depth = sat(Z / 3000.0);
  vec4 fg = drawFigures(p, false, 0.0, hz, fm);
  // footfall ripples of the two nearest creatures
  float rip = 0.0, ring = 0.0;
  float lwz = LW * Z / FOC;            // line half width in metres at this depth
  for (int i = 0; i < 2; i++) {
    vec4 c = creature(i);
    if (abs(Z - c.y) > 16.0) continue;
    float Xc0 = camX + camDX + creX(c) * c.y / FOC;
    float ph = fract(uTime / TG + c.z);
    for (int j = 0; j < 4; j++) {
      float lph = fract(ph + float(j) * 0.25);
      float baseX = (j == 0 || j == 2) ? -4.8 : 4.8;
      float zc = c.y + (j < 2 ? -2.0 : 2.0);
      for (int k = 0; k < 2; k++) {
        if (lph > 0.75 && k == 0) continue;
        float age = lph * TG + float(k) * TG;
        float landX = Xc0 + baseX + VEL * TG * 0.5 + (j < 2 ? 0.0 : 0.8) - VEL * age;
        float dd = length(vec2(X - landX, (Z - zc) * 0.6));
        float rr = 1.0 + 2.4 * age;
        float a = exp(-age / 4.5) * smoothstep(0.0, 0.4, age);
        rip += a * sin((dd - rr) * 4.0) * exp(-pow((dd - rr) / 1.4, 2.0));
        ring = max(ring, a * smoothstep(lwz * 2.5, 0.0, abs(dd - rr)));
      }
    }
  }
  // water strokes: the mirror is read through horizontal streaks of ruffled water
  float sx = X / 6.0;                       // 180 m loop scroll = 30 noise periods
  float wn = vnoise(vec3(sx * 1.0, Z * 2.2, uPhase * 6.0), ivec3(30, 0, 6));
  float wn2 = vnoise(vec3(sx * 4.0, Z * 7.0, uPhase * 6.0 + 3.0), ivec3(120, 0, 6));
  float stroke = smoothstep(0.32, 0.55, wn * 0.7 + wn2 * 0.3 + exp(-Z / 90.0) * -0.25 + 0.12);
  float slope = rip * 0.8 + (wn2 - 0.5) * 0.6;
  // reflection: sky about the horizon, figures about their own feet
  vec2 pr = vec2(p.x, 2.0 * HOR - p.y + slope * 0.006 * (1.0 + 25.0 / Z));
  float sm;
  vec3 rc = skyCol(pr, true, sm);
  float rz, rm;
  vec2 pf = vec2(p.x, p.y - slope * 0.006 * (1.0 + 25.0 / Z));
  vec4 rf = drawFigures(pf, true, Z, rz, rm);
  rc = rf.rgb + (1.0 - rf.a) * rc;
  float R = mix(0.95, 0.35, sat(atan(CAMH / Z) * 3.5));
  vec3 water = rc * R * 0.55 * (0.15 + 0.85 * stroke);
  // the sun's glitter path: bright dashes in a column widening towards us
  float gw = 0.03 + 0.5 * FOC * CAMH / Z * 0.35;
  float gp = exp(-pow((p.x - SUN.x) / gw, 2.0)) * smoothstep(0.55, 0.75, wn2 * 0.5 + wn * 0.5 + 0.1);
  water += uSun * gp * 1.4 * exp(-(HOR - p.y) * 1.2);
  water += uRim * ring * 0.9;
  // salt crust ridges: lines, lit close by, dark far away against the mirror
  float sp = uPxSize * 2.5;
  float fw = max(Z * sp / FOC, Z * Z * sp / (FOC * CAMH)) / HEXS;
  vec4 hc = hexCell(vec2(X, Z) / HEXS);
  float he = hexEdge(hc.xy);
  float rw = max(0.028, lwz / HEXS);
  float ridge = smoothstep(rw + fw, rw - fw * 0.5, he);
  ridge *= sat(1.5 - fw * 1.2);
  float cellv = hash12(hc.zw + 17.0);
  vec3 salt = uSalt * (0.03 + 0.85 * exp(-Z / 12.0)) * (0.65 + 0.35 * cellv);
  col = mix(water, salt, ridge);
  mat = ridge > 0.4 ? 5.0 : (rf.a > 0.5 ? rm : (gp > 0.3 ? 2.0 : 6.0));
  col = fg.rgb + (1.0 - fg.a) * col;
  if (fg.a > 0.5) { mat = fm; depth = hz / 3000.0; }
  return col;
}
`,
});

// "The Procession": colossal stilt-legged shell creatures carrying fragments of
// towns walk across a flooded salt flat at dusk. Everything is evaluated in
// screen space with an analytic ground plane: creatures are 2D side-view SDF
// figures placed at their depth, the flat mirrors them about their own ground
// contact line, and the hexagonal salt crust is projected in perspective.
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
  bigDepth: 0.0,
  look: { exposure: 2.3, colGamma: 0.62, brightness: 1.1 },
  palettes: [
    {
      name: 'Dusk',
      colors: {
        uSun: '#fff0d2', uGlow: '#ff9a4a', uHigh: '#7f5a4a', uZen: '#24302f', uRim: '#ffcf8f', uBody: '#5a4636',
        uWin: '#ffb04a', uSalt: '#efe2c8', uLeaf: '#93a35a', uFlag: '#d8553a',
      },
    },
    {
      name: 'Moonlit',
      colors: {
        uSun: '#f2f4ee', uGlow: '#9fb3a8', uHigh: '#4f5f5a', uZen: '#1a2220', uRim: '#dfe9e2', uBody: '#3d4a46',
        uWin: '#ffb75e', uSalt: '#d9e2dc', uLeaf: '#7d9a7e', uFlag: '#c9a04a',
      },
      look: { exposure: 1.15 },
    },
    {
      name: 'Ember',
      colors: {
        uSun: '#ffe2b0', uGlow: '#e0482a', uHigh: '#6e2f22', uZen: '#1d1412', uRim: '#ffb070', uBody: '#5e3a2a',
        uWin: '#ffd27a', uSalt: '#f0cfae', uLeaf: '#b0a050', uFlag: '#f0d070',
      },
    },
  ],
  glyphSets: {
    1: { edge: ' .,`\'-_~=:', tone: ' .-~=' },                                   // sky streaks
    2: { edge: ' .,`\'-_~=:;+*/\\|()', tone: ' .:-=+*o' },                         // sun, rays
    3: { edge: ' .,`\'-_:;!|/\\()[]{}<>=+*#%&iltrLTJVYAHXZ', tone: ' .:-=+#' },     // stone, shell, legs
    4: { edge: ' .,`\':;~*%&@o0eacsx(){}', tone: ' .:;*%&@' },                     // foliage
    5: { edge: ' .,`\'-_/\\|:;~=', tone: ' .-:=' },                                // salt ridges
    6: { edge: ' .,`\'-_~=:;/\\|()!', tone: ' .-~=:' },                            // water / reflections
    7: { edge: ' .,`\':;!|+*#=[]', tone: ' .:+*#' },                               // lit windows, lanterns
    8: { edge: ' .`\'*+^v~-', tone: ' .`\'' },                                     // stars, birds
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
float streaks(vec2 p, float oct){
  vec2 s = vec2(p.x * 1.2 + uPhase * 6.0, p.y * 38.0);
  float n = vnoise(s, ivec2(6, 0)) * 0.55 + vnoise(vec2(s.x * 2.0, s.y * 1.7 + 7.1), ivec2(12, 0)) * 0.3;
  if (oct > 2.5) n += vnoise(vec2(s.x * 5.0, s.y * 2.9 + 3.3), ivec2(30, 0)) * 0.15;
  return n;
}
// cloudlets on a horizontal plane high above the flat (units: cloudlet cells)
float cloudCells(vec2 w, float oct){
  vec2 g = floor(w), f = fract(w);
  float F1 = 9.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(i, j);
    vec2 r = o + 0.15 + 0.7 * hash22(g + o + 41.0) - f;
    F1 = min(F1, dot(r, r));
  }
  float cell = 1.0 - 1.35 * sqrt(F1);
  float cover = vnoise(w * 0.11 + 5.0) * 0.65 + vnoise(w * 0.27 + 9.0) * 0.35;
  float n = cell * 0.55 + cover * 0.9;
  if (oct > 1.5) n += (vnoise(w * 2.6) - 0.5) * 0.18;
  return n;
}
// seamless drift: two copies offset by one loop of wind, cross-faded with the
// variance kept constant so the sky never thins out mid-loop
float cloudField(vec2 w, float oct){
  vec2 wind = vec2(9.0, 2.0);
  float a = cloudCells(w + wind * uPhase, oct);
  float b = cloudCells(w + wind * (uPhase - 1.0), oct);
  float k = uPhase;
  float m = 0.62;
  return m + ((a - m) * (1.0 - k) + (b - m) * k) / sqrt((1.0 - k) * (1.0 - k) + k * k);
}

vec3 skyCol(vec2 p, bool refl, out float mat){
  mat = 1.0;
  float h = max(p.y - HOR, 0.0);
  vec2 ds = p - SUN; ds.x *= 0.8;
  float sd = length(ds);
  float glow = exp(-h * 2.6) * (0.35 + 1.1 * exp(-sd * 1.9)) + 0.05 * exp(-h * 0.8);
  vec3 col = vec3(0.0);
  // low cirrus streaks along the horizon
  float n = streaks(p, refl ? 2.0 : 3.0);
  float thr = 0.74 - 0.3 * sat(glow);
  float s = smoothstep(thr - 0.04, thr + 0.06, n) * exp(-h * 5.0);
  vec3 tint = mix(uZen, uHigh, sat(glow * 1.6));
  tint = mix(tint, uGlow, sat(exp(-sd * 2.4) * 1.3));
  col += tint * s * glow * 1.4;
  // mackerel sky on a plane 3 km up: big cloudlets overhead shrinking into
  // fine rows at the horizon, lit from below by the sinking sun
  if (h > 0.004) {
    float D = 3000.0 * FOC / h;                       // distance along the plane
    vec2 w = vec2((p.x * D / FOC) / 520.0, D / 260.0);
    w.x += 0.6 * sin(w.y * 0.35);                     // rows bend slightly
    float cf = cloudField(w, refl ? 1.0 : 2.0);
    float fwc = (D / 260.0) * (uPxSize * 3.0) / h;    // footprint of one sample in cells
    float thr2 = 0.80 - 0.25 * uAtmos;
    float cl = smoothstep(thr2 - 0.02 - fwc, thr2 + 0.10 + fwc, cf);
    float lit = 0.18 + 1.15 * exp(-sd * 1.5) + 0.3 * exp(-h * 3.0);
    float edge = smoothstep(thr2 + 0.22, thr2 + 0.02, cf) * cl;   // brighter rims on cloudlets
    vec3 ctint = mix(uHigh, uGlow, sat(exp(-sd * 1.7) * 1.2 + exp(-h * 4.0) * 0.4));
    ctint = mix(ctint, uSun, sat(exp(-sd * 6.0)) * 0.6);
    float fade = smoothstep(0.004, 0.06, h);
    col += ctint * cl * lit * (0.55 + 0.6 * edge) * fade * 1.2;
    if (cl > 0.3) mat = 1.0;
  }
  // a few heavier cloud banks, lit from below near the sun
  float bx = p.x * 0.9 + uPhase * 5.0;
  float bank = vnoise(vec2(bx, p.y * 9.0), ivec2(5, 0)) * 0.7 + vnoise(vec2(bx * 3.0, p.y * 22.0), ivec2(15, 0)) * 0.3;
  float band = smoothstep(0.08, 0.0, abs(p.y - (HOR + 0.36 + 0.05 * sin(p.x * 1.3)))) + smoothstep(0.05, 0.0, abs(p.y - (HOR + 0.17 + 0.03 * sin(p.x * 2.1 + 1.0))));
  float cb = smoothstep(0.52, 0.66, bank) * band;
  float under = smoothstep(0.62, 0.52, bank);
  col += mix(uHigh * 0.5, uGlow * 1.4, sat(exp(-sd * 1.6))) * cb * (0.6 + 0.8 * under);
  // sun: disc with mottled limb, half sunk behind the far range
  float sr = 0.052;
  if (sd < sr) {
    float limb = sqrt(max(0.0, 1.0 - sd * sd / (sr * sr)));
    float gran = 0.75 + 0.25 * vnoise(p * 140.0);
    col = mix(col, uSun * (1.5 + 2.0 * limb) * gran, smoothstep(sr, sr - 0.004, sd));
    mat = 2.0;
  } else {
    // engraved rays: thin radial lines, alternating lengths, slowly turning
    float a = atan(ds.y, ds.x);
    float k = 36.0;
    float rr = fract(a / TAU * k);
    float idx = floor(a / TAU * k);
    float hr = hash11(mod(idx, k) + 0.5);
    float len = sr * (2.0 + 3.5 * hr + 2.0 * mod(idx, 2.0)) * (1.0 + 0.18 * sin(TAU * (uPhase * float(2 + int(hr * 3.0)) + hr)));
    float ray = smoothstep(0.06, 0.0, abs(rr - 0.5) * sd * 7.0) * smoothstep(len, sr * 1.3, sd) * step(sr * 1.25, sd);
    if (ray > 0.01) { col += uGlow * mix(1.0, 1.8, exp(-sd * 9.0)) * ray * 0.9; mat = 2.0; }
  }
  // stars in the darker upper sky
  if (!refl && h > 0.45) {
    vec2 g = p * vec2(90.0, 90.0);
    vec2 id = floor(g), f = fract(g) - 0.5;
    float hs = hash12(id + 31.0);
    if (hs > 0.93) {
      vec2 o = (hash22(id) - 0.5) * 0.6;
      float st = smoothstep(0.16, 0.0, length(f - o)) * (hs - 0.93) * 14.0 * smoothstep(0.45, 0.8, h);
      st *= 0.8 + 0.2 * sin(TAU * (uPhase * 4.0 + hs * 9.0));
      col += mix(uSun, uRim, hs) * st * 0.35;
      if (st > 0.05) mat = 8.0;
    }
  }
  // far ranges on the horizon: low silhouette with lit crest
  float mh = 0.016 + 0.022 * vnoise(vec2(p.x * 3.1 + 2.0, 0.0)) + 0.01 * vnoise(vec2(p.x * 13.0, 1.0));
  if (p.y < HOR + mh) {
    float crest = smoothstep(0.004, 0.0, abs(p.y - HOR - mh));
    col = uBody * 0.12 + uRim * crest * 0.5 * (0.3 + exp(-abs(p.x - SUN.x) * 2.0));
    col += uHigh * 0.15 * smoothstep(0.5, 0.7, vnoise(vec2(p.x * 40.0, p.y * 200.0)));
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
    for (int b = 0; b < 5; b++) {
      float fb = float(b);
      float ang = TAU * (uPhase * float(3 + b % 3) + fb * 0.27 + float(i) * 0.41);
      vec2 bp = top + vec2(cos(ang) * (9.0 + 4.0 * fb), sin(ang) * 2.0 + 3.0 + fb * 1.4) * s;
      vec2 lp = (p - bp) / (s * 1.0);
      float flap = sin(TAU * (uPhase * 90.0 + fb * 0.37));
      float wing = 0.9 + 0.6 * flap;
      lp.x *= sign(cos(ang + PI * 0.5));
      float dw = min(sdSegment(lp, vec2(0.0), vec2(-1.3, wing)), sdSegment(lp, vec2(0.0), vec2(1.3, wing)));
      float w = smoothstep(0.32 + uPxSize / s, 0.0, dw);
      if (w > 0.0) { col = max(col, uSun * 0.45 * w); mat = 8.0; }
    }
  }
  return col;
}

// ---------------------------------------------------------------- figures in the image
// draws all creatures at screen point p; mirror = true reflects each about its
// ground line. Returns rgb in .rgb and coverage in .a; depth of the hit in z.
vec4 drawFigures(vec2 p, bool mirror, float maxZ, float minZ, out float hitZ, out float mat){
  vec4 acc = vec4(0.0);
  hitZ = 1e9;
  for (int i = 0; i < NCRE; i++) {
    vec4 c = creature(i);
    if (c.y > maxZ || c.y < minZ) continue;
    float s = FOC / c.y;
    float yg = groundY(c.y);
    vec2 pp = p;
    if (mirror) pp.y = 2.0 * yg - p.y;
    vec2 q = (pp - vec2(creX(c), yg)) / s;
    if (q.x < -17.0 || q.x > 19.0 || q.y < -1.5 || q.y > 60.0) continue;
    vec4 f = figure(q, i, c);
    float pxm = uPxSize * 1.4 / s;        // one sample in metres at this depth
    float cov = smoothstep(pxm, -pxm, f.x);
    if (cov <= 0.0) continue;
    // 2D normal for rim lighting (backlit by the low sun)
    float e = max(pxm, 0.08);
    float rimW = max(0.5, pxm * 3.0);
    vec3 col;
    vec2 sdir = normalize(SUN - pp + vec2(0.0, 0.25));
    if (mirror) sdir.y = -sdir.y;
    vec2 n = vec2(0.0, 1.0);
    if (f.x > -rimW * 4.0) {
      float dx = figure(q + vec2(e, 0.0), i, c).x - f.x;
      float dy = figure(q + vec2(0.0, e), i, c).x - f.x;
      n = normalize(vec2(dx, dy) + 1e-6);
    }
    float inside = max(-f.x, 0.0);
    float facing = 0.25 + 0.75 * max(0.0, dot(n, sdir));
    float rim = exp(-inside / rimW) * facing;
    float sky = 0.5 + 0.5 * n.y;
    float far = f.w > 9.5 ? 0.55 : 1.0;
    float haze = 1.0 - exp(-c.y / 2600.0);
    col = uBody * (0.10 + 0.12 * sky) * far;
    col += uBody * 1.1 * sat(f.z) * (0.4 + 0.6 * facing) * far;  // linework
    col += uRim * rim * 2.6 * far;
    if (f.w > 3.5 && f.w < 4.5) {       // foliage
      float lv = vnoise(q * 3.0) * 0.6 + vnoise(q * 7.0) * 0.4;
      col = mix(col, uLeaf * (0.08 + 0.5 * smoothstep(0.45, 0.8, lv)) + uRim * rim * 1.2, 0.8);
    }
    if (f.w > 8.5 && f.w < 9.5) col = uFlag * (0.35 + 0.5 * facing) + uRim * rim * 0.8;
    col += uWin * f.y * 1.3 * far;
    // atmosphere: distant figures lose contrast towards the horizon light
    vec3 hz = mix(uHigh, uGlow, exp(-abs(pp.x - SUN.x) * 1.5)) * 0.35;
    col = mix(col, hz, haze * (0.5 + 0.5 * uAtmos));
    // creatures are listed near to far: composite front to back (premultiplied)
    float wgt = (1.0 - acc.a) * cov;
    acc.rgb += col * wgt;
    if (wgt > 0.25 && hitZ > 1e8) { hitZ = c.y; mat = (f.w > 3.5 && f.w < 4.5) ? 4.0 : (f.y > 0.3 ? 7.0 : 3.0); }
    acc.a += wgt;
    if (acc.a > 0.995) break;
  }
  return acc;
}

vec3 sceneColor(vec2 p, out float mat, out float depth){
  camX = VEL * uTime;
  camDX = uCamAmt * 4.0 * sin(TAU * uPhase);
  SUN = vec2(1.02, HOR + 0.075);
  mat = 1.0; depth = 1.0;
  vec3 col;
  float hz; float fm = 3.0;
  if (p.y >= HOR) {
    float sm;
    col = skyCol(p, false, sm);
    mat = sm;
    col += birds(p, mat);
    vec4 fg = drawFigures(p, false, 1e9, 0.0, hz, fm);
    col = fg.rgb + (1.0 - fg.a) * col;
    if (fg.a > 0.5) { mat = fm; depth = hz / 3000.0; }
    return col;
  }
  // ---- the flat
  float Z = FOC * CAMH / (HOR - p.y);
  float X = camX + camDX + p.x * Z / FOC;
  depth = sat(Z / 3000.0);
  // direct view of legs and feet standing on the flat
  vec4 fg = drawFigures(p, false, 1e9, 0.0, hz, fm);
  // salt crust
  float sp = uPxSize * 2.5;                       // ~ sample spacing
  float fw = max(Z * sp / FOC, Z * Z * sp / (FOC * CAMH)) / HEXS;
  vec4 hc = hexCell(vec2(X, Z) / HEXS);
  float he = hexEdge(hc.xy);
  float rw = 0.035 + 0.02 * hash12(hc.zw);
  float ridge = smoothstep(rw + fw, rw - fw * 0.5, he);
  ridge = mix(ridge, rw * 3.0, sat(fw * 1.5 - 0.3));      // far away: average tone
  float cellv = hash12(hc.zw + 17.0);
  // ripples: footfalls of the nearest creatures and a faint breeze
  float rip = 0.0;
  for (int i = 0; i < 2; i++) {
    vec4 c = creature(i);
    if (abs(Z - c.y) > 18.0) continue;
    float s = FOC / c.y;
    float Xc0 = camX + camDX + creX(c) * c.y / FOC;
    float ph = fract(uTime / TG + c.z);
    for (int j = 0; j < 4; j++) {
      float lph = fract(ph + float(j) * 0.25);
      float baseX = (j == 0 || j == 2) ? -4.8 : 4.8;
      float zc = c.y + (j < 2 ? -2.0 : 2.0);
      for (int k = 0; k < 2; k++) {
        float age = lph * TG + float(k) * TG;
        if (lph > 0.75 && k == 0) continue;
        float landX = Xc0 + baseX + VEL * TG * 0.5 + (j < 2 ? 0.0 : 0.8) - VEL * age;
        float dd = length(vec2(X - landX, (Z - zc) * 1.0));
        float r = 1.0 + 2.6 * age;
        float a = exp(-age / 4.0) * smoothstep(0.0, 0.4, age);
        rip += a * sin((dd - r) * 5.0) * exp(-pow((dd - r) / 1.2, 2.0));
      }
    }
  }
  float breeze = gnoise(vec3(X / 3.0, Z * 0.9, uPhase * 8.0), ivec3(60, 0, 8)) * 0.35;
  breeze *= exp(-Z / 40.0);
  float slope = rip * 0.9 + breeze;
  // reflection: sky mirrored about the horizon, figures about their own feet
  vec2 pr = vec2(p.x + slope * 0.004, 2.0 * HOR - p.y + slope * 0.012 * (1.0 + 30.0 / Z));
  float sm;
  vec3 rc = skyCol(pr, true, sm);
  float rz, rm;
  vec2 pf = vec2(p.x + slope * 0.004, p.y - slope * 0.012 * (1.0 + 30.0 / Z));
  vec4 rf = drawFigures(pf, true, 1e9, Z, rz, rm);
  rc = rf.rgb + (1.0 - rf.a) * rc;
  float ang = atan(CAMH / Z);
  float R = mix(0.88, 0.28, sat(ang * 3.0));
  vec3 wet = rc * R + uBody * 0.03;
  wet += uRim * smoothstep(0.55, 0.9, abs(slope)) * 0.25 * exp(-abs(p.x - SUN.x) * 0.8);
  // dry ridges catch the low light; ridge texture is part of the crust
  vec3 salt = uSalt * (0.02 + 0.75 * exp(-Z / 14.0)) * (0.7 + 0.3 * cellv);
  salt += uGlow * 0.05 * exp(-abs(p.x - SUN.x) * 1.2) * exp(-Z / 30.0);
  col = mix(wet, salt, ridge);
  mat = ridge > 0.4 ? 5.0 : (rf.a > 0.5 ? rm : 6.0);
  if (sm > 1.5 && sm < 2.5 && rf.a < 0.5 && ridge < 0.4) mat = 2.0;
  col = fg.rgb + (1.0 - fg.a) * col;
  if (fg.a > 0.5) { mat = fm; depth = hz / 3000.0; }
  return col;
}
`,
});

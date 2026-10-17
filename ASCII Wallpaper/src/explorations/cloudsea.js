// Cloudsea Pillars: sandstone karst towers rising out of a slowly flowing sea
// of cloud at first light. A 2.5D layered world: every layer has a depth z,
// pillars and cloud banks are evaluated front to back in "layer coordinates"
// q = (p - horizon) * z + camera, so parallax and perspective scale fall out.
ASCII.registerScene({
  id: 'cloudsea',
  name: 'Cloudsea Pillars',
  tagline: 'karst towers over a flowing sea of cloud at first light',
  loop: 120,
  bg: '#080a09',
  palettes: [
    {
      name: 'Dawn',
      colors: {
        uSun: '#fff0d2', uLit: '#f2a35c', uRim: '#ffd48c', uShadow: '#2f7466', uDeep: '#163f39',
        uCloud: '#f7e8d8', uRose: '#ec9f8e', uCloudSh: '#53766f', uVeg: '#2f7048', uVegLit: '#d9c46e',
        uWood: '#8a5a3a', uRoof: '#41504c', uLantern: '#ff5a26', uWindow: '#ffb24e', uWater: '#e6f7f0',
        uSky: '#5e9384', uHaze: '#86ab9c', uStar: '#d6e6dc',
      },
    },
  ],
  glyphSets: {
    1: { edge: " .,'`:;!|il/\\_-=#H", tone: ' .,:;!|lH#' },        // rock
    2: { edge: " .,'`\"^*:;!vwmYT&%#@({})", tone: ' .,:;*%&#@' },           // vegetation
    3: { edge: " .,'`-_~^:;=+()coeuonmrsCOQ@", tone: ' .,-~:=+oO@' },     // cloud
    4: { edge: " .,':;!|il", tone: ' .:;!|' },                               // water
    5: { edge: " .,'`-_=+:;!|/\\[]#HI<>TLJ", tone: ' .:-=+#H' },             // wood
    6: { edge: " .,'`-_=~^/\\|()<>AVTn#", tone: ' -=^#' },                   // roof
    7: { edge: " .,'`-_~/\\|+", tone: ' .-~+' },                             // rope
    8: { edge: ' .-_=~:#@%&*oO()', tone: ' .-=#@' },                         // sun
    9: { edge: " .,'`-_~=", tone: ' .-~=' },                                 // sky streaks
    10: { edge: " .,'`-_~^v/\\<>wVY", tone: ' .v^' },                        // birds
    11: { edge: " .,'`:;!|il/\\^-_", tone: ' .:;!|' },                       // far rock
  },
  look: { saturation: 1.25 },
  defaults: { detail: 1, atmosphere: 0.5, camera: 0.5 },
  glsl: `
const float Y0 = -0.05;          // horizon (screen y)
const float HC = 0.8;            // camera height above the cloud sea
const vec2 SUNP = vec2(0.95, 0.06);
const float SUNR = 0.13;

float gPx, gCW, gCH;             // device px, cell width, cell height (screen units)
vec2 gCam;
vec3 gL;
float gDet, gAt;
vec3 cSun, cLit, cRim, cSh, cDeep, cCloud, cRose, cCSh, cVeg, cVegLit, cWood, cRoof, cLan, cWin, cWat, cSky, cHaze, cStar;
vec3 nc(vec3 c){ return c / max(luma(c), 1e-4); }

// front-to-back accumulation
vec3 aCol; float aT; float aMat; float aW; float aDepth;
void put(vec3 c, float a, float m, float z){
  a = sat(a);
  float w = aT * a;
  aCol += c * w;
  float s = w * (luma(c) + 0.003);
  if (s > aW) { aW = s; aMat = m; }
  if (aT > 0.5 && aT * (1.0 - a) <= 0.5) aDepth = min(z / 50.0, 0.95);
  aT *= 1.0 - a;
}

float hs(float k, int s){ return hashi(ivec2(int(k), s)); }
float n1(float x, int s){ float i = floor(x); float f = x - i; f = f * f * (3.0 - 2.0 * f); int k = int(i); return mix(hashi(ivec2(k, s)), hashi(ivec2(k + 1, s)), f); }
vec2 toLayer(vec2 p, float z){ return vec2(p.x, p.y - Y0) * z + gCam; }
float fogOf(float z){ return 1.0 - exp(-max(z - 1.0, 0.0) * 0.07); }
vec3 hazed(vec3 c, float fog, float k){ float l = luma(c); return mix(c, cHaze * l, fog * 0.7) * (1.0 - k * fog); }

// ------------------------------------------------------------------ pillars
// pl: x centre, y half width, z top (all layer coords), w seed. lod 0 far .. 1 near
float pillar(vec2 q, vec4 pl, float z, float lod, out vec3 col, out float m){
  col = vec3(0.0); m = 1.0;
  int s = int(pl.w);
  float w0 = pl.y;
  if (abs(q.x - pl.x) > w0 * 1.8 || q.y > pl.z + w0 * 0.9) return 0.0;
  // bedding planes (horizontal joints), never finer than ~2.4 rows on screen
  float bh = max(0.075, 2.4 * gCH * z) * (0.8 + 0.4 * hs(pl.w, 7));
  float by = q.y / bh + 0.18 * n1(q.x / (bh * 3.0), s + 3);
  float bid = floor(by), bf = by - bid;
  float lean = (hs(pl.w, 8) - 0.5) * 0.10;
  float cx = pl.x + lean * (q.y + HC) + w0 * 0.12 * (n1(q.y / (w0 * 2.2), s + 4) - 0.5);
  float wr = w0 * (1.0 + 0.22 * (n1(q.y / (w0 * 1.6), s + 5) - 0.5) + 0.09 * (hs(bid, s + 6) - 0.5));
  float wl = w0 * (1.0 + 0.22 * (n1(q.y / (w0 * 1.6), s + 9) - 0.5) + 0.09 * (hs(bid, s + 10) - 0.5));
  // rounded shoulders, uneven top
  float top = pl.z + w0 * 0.18 * (n1(q.x / (w0 * 0.5), s + 11) - 0.5);
  float rr = w0 * 0.55;
  float ty = sat((q.y - (top - rr)) / rr);
  float shd = sqrt(max(1.0 - ty * ty * ty, 0.0));
  float xr = cx + wr * shd, xl = cx - wl * shd;
  float mid = 0.5 * (xr + xl), hw = 0.5 * (xr - xl);
  float aa = 0.6 * gCW * z / 3.0;
  float inside = min(xr - q.x, q.x - xl);
  float aRock = (q.y < top) ? smoothstep(-aa, aa, inside) : 0.0;

  // canopy of pines on the top
  float tsp = max(w0 * 0.32, 3.0 * gCW * z);
  float tk0 = floor(q.x / tsp);
  float can = -1e9; float tcx = 0.0, tw = 1.0;
  for (int j = -1; j <= 1; j++) {
    float k = tk0 + float(j);
    float h0 = hs(k, s + 20), h1 = hs(k, s + 21), h2 = hs(k, s + 22);
    float xt = (k + 0.5 + 0.6 * (h0 - 0.5)) * tsp;
    if (abs(xt - pl.x) > w0 * 0.95) continue;
    float wt = tsp * (0.55 + 0.5 * h1);
    float ht = tsp * (0.5 + 0.9 * h2) * (lod > 0.5 ? 1.0 : 0.8);
    float dx = (q.x - xt) / wt;
    if (abs(dx) < 1.0) {
      float base = pl.z - w0 * 0.12;
      float c = base + ht * (1.0 - dx * dx) * (0.75 + 0.25 * cos(dx * 6.0 + h0 * 6.0));
      if (c > can) { can = c; tcx = xt; tw = wt; }
    }
  }
  float aCan = smoothstep(-aa, aa, can - q.y) * step(pl.z - w0 * 0.45, q.y);
  if (aRock <= 0.0 && aCan <= 0.0) return 0.0;

  float fog = fogOf(z);
  if (aCan > 0.0 && (q.y > top - w0 * 0.1 || aRock <= 0.0)) {
    float dTop = (can - q.y) / z;
    float dx = (q.x - tcx) / tw;
    float leaf = vnoise(vec2(q.x, q.y * 1.6) / (z * gCW * 0.9));
    float litv = sat(0.3 + 0.7 * dx) * (0.5 + 0.5 * leaf);
    float rim = exp(-dTop / (0.8 * gCH)) * sat(0.35 + dx);
    vec3 c = cVeg * (0.16 + 0.16 * leaf) + cVegLit * (litv * 0.55 + rim * 1.8);
    col = hazed(c, fog, 0.45);
    m = 2.0;
    return max(aCan, aRock);
  }

  // rock face: facets separated by vertical joints, hatched with vertical striations
  float lx = q.x - mid;
  float u = clamp(lx / hw, -1.0, 1.0);
  float cw = gCW * z;                       // one character cell in layer units
  float fw = max(0.10, 3.4 * cw) * (0.8 + 0.4 * hs(pl.w, 12));
  float fx = lx / fw + 0.3 * n1(q.y / (fw * 2.0), s + 13) + 0.25 * (hs(bid, s + 14) - 0.5) * step(0.6, hs(bid, s + 15));
  float fid = floor(fx), ff = fx - fid;
  float uc = clamp((fid + 0.5) * fw / hw, -1.0, 1.0);
  float tilt = (hs(fid + 50.0, s + 16) - 0.5) * 0.45;
  float nx = clamp(sign(uc) * pow(abs(uc), 1.2) + tilt, -0.98, 0.98);
  nx = mix(nx, u, 0.35);
  float bt = (hs(bid, s + 17) - 0.5) * 0.25;
  vec3 n = normalize(vec3(nx, bt, -sqrt(max(1.0 - nx * nx, 0.0))));
  float dif = max(dot(n, gL), 0.0);
  float h01 = sat((q.y + HC) / 3.2);
  float sunVis = smoothstep(0.08, 0.6, h01 + 0.25 * (n1(q.y * 1.3 / z + pl.w, s + 18) - 0.5));
  // vertical hatching: thin broken striation lines about 1.7 cells apart
  float sp = max(0.02, 2.3 * cw);
  float sx = lx / sp + 0.35 * n1(q.y / (sp * 7.0), s + 30);
  float si = floor(sx);
  float dl = abs(sx - si - 0.5 - 0.3 * (hs(si, s + 31) - 0.5)) * sp;
  float line = smoothstep(0.42 * cw, 0.12 * cw, dl);
  line *= smoothstep(0.3, 0.62, n1(q.y / (sp * (1.0 + 2.5 * hs(si, s + 32))) + si * 3.7, s + 33));
  // joints between facets, grooves on some bedding planes, stains
  float joint = smoothstep(0.0, 0.06, ff) * smoothstep(1.0, 0.94, ff);
  float hb = hs(bid, s + 34);
  float groove = 1.0 - (0.85 * step(0.45, hb)) * (1.0 - smoothstep(0.0, 0.1, bf));
  float lip = step(0.62, hb) * smoothstep(0.88, 0.96, bf) * (1.0 - smoothstep(0.97, 1.0, bf));
  float stain = 0.7 + 0.6 * n1(lx / (fw * 0.7) + 7.0, s + 23) * n1(q.y / (bh * 6.0), s + 24);
  float tex = joint * groove * stain;
  float fv = 0.8 + 0.4 * hs(fid, s + 25);
  // shrubs clinging to some ledges
  if (lod > 0.5 && hb < 0.2) {
    float bump = 0.6 * n1(q.x / (cw * 2.2), s + 40) + 0.4 * n1(q.x / (cw * 0.9), s + 41);
    float pat = smoothstep(0.4, 0.6, n1(q.x / (cw * 7.0), s + 42));
    float hg = (0.15 + 0.45 * bump) * pat;
    if (bf < hg) {
      float leaf = vnoise(vec2(q.x, q.y * 1.5) / (cw * 0.8));
      float tdist = (hg - bf) * bh / z;
      vec3 c = cVeg * (0.10 + 0.14 * leaf) + cVegLit * (sat(u * 1.5 + 0.2) * sunVis * 0.6 * leaf + exp(-tdist / (0.5 * gCH)) * (0.25 + 0.9 * dif * sunVis));
      col = hazed(c, fog, 0.45);
      m = 2.0;
      return aRock;
    }
  }
  // contre-jour: pillars seen against the sun have dark faces and rims on both edges
  vec2 scp = (q - gCam) / z; scp.y += Y0;
  float bl = exp(-length((scp - SUNP) * vec2(1.4, 1.0)) * 4.0);
  float faceK = 1.0 - 0.8 * bl;
  line = mix(line, 0.25, fog * 0.7);
  float Lsh = (0.03 + 0.55 * line) * (0.7 + 0.5 * (1.0 - abs(nx))) * fv * tex * faceK;
  vec3 c = cSh * Lsh;
  c += cLit * dif * sunVis * (0.7 + 1.3 * line) * fv * tex * faceK;
  c += cRose * (0.03 + 0.35 * line) * exp(-(q.y + HC) / 0.45) * tex;
  c += cRim * lip * (0.35 + 1.2 * dif * sunVis);
  float er = (xr - q.x) / z;
  c += cRim * (2.6 + 3.0 * bl) * exp(-er / (0.7 * gCW)) * (0.25 + 0.75 * sunVis) * step(0.0, u);
  float el = (q.x - xl) / z;
  c += mix(cSh * 0.3, cRim * 2.5, bl) * exp(-el / (0.6 * gCW));
  float vis = exp(-max(z - 1.0, 0.0) * 0.05);
  c = mix(c, cHaze * luma(c), fog * 0.8) * vis + cHaze * 0.035 * fog * (1.0 - bl);
  col = c;
  m = lod > 0.5 ? 1.0 : 11.0;
  return aRock;
}

// ------------------------------------------------------------------ clouds
// one bank of drifting, breathing elliptical lobes at depth z.
// S lobe spacing, b base height above the sea, A lobe height, d drift (slots per life), mc lives per loop
float bank(vec2 q, float z, float S, float b, float A, float d, float mc, int s, out vec3 col){
  col = vec3(0.0);
  float base = -HC + b;
  if (q.y > base + A + S * 1.1) return 0.0;
  float xs = q.x / S;
  float k0 = floor(xs);
  float top = base + A * 0.3 * (n1(xs * 0.45 + float(s), s) - 0.2);
  vec4 lb = vec4(0.0, 0.0, -1.0, 1.0);
  float lbest = 1e9;
  int nd = int(ceil(d)) + 1;
  for (int j = -1; j <= 6; j++) {
    if (j > nd) break;
    float k = k0 + float(j);
    float h0 = hs(k, s), h1 = hs(k, s + 1), h2 = hs(k, s + 2), h3 = hs(k, s + 3);
    float age = fract(uPhase * mc + h0);
    float env = sin(PI * age);
    float r = S * (0.8 + 0.7 * h1) * sqrt(env);
    float ry = r * (0.36 + 0.16 * h2);
    float cxk = (k + 0.5 + 0.3 * (h2 - 0.5)) * S - d * S * age;
    float cyk = base + A * (0.1 + 0.9 * h3) - ry * 0.5;
    float dx = (q.x - cxk) / r;
    if (abs(dx) < 1.0) {
      float t = cyk + ry * sqrt(1.0 - dx * dx);
      top = max(top, t);
      float dy = (q.y - cyk) / ry;
      if (dx * dx + dy * dy < 1.0 && cyk < lbest) { lbest = cyk; lb = vec4(cxk, cyk, r, ry); }
    }
  }
  float aa = 0.5 * gCH * z / 4.0;
  float a = smoothstep(-aa, aa, top - q.y);
  if (a <= 0.0) return 0.0;
  float dTop = (top - q.y) / z;
  float fog = fogOf(z);
  vec2 sp = (q - gCam) / z; sp.y += Y0;    // screen position
  // forward scattering: a glow around the sun plus a bright path on the cloud tops below it
  float fwd = exp(-length((sp - SUNP) * vec2(0.6, 1.4)) * 1.8);
  float path = exp(-abs(sp.x - SUNP.x) * (2.2 + 2.5 * sat(SUNP.y - sp.y))) * sat(1.0 - (SUNP.y - sp.y) * 0.6);
  float sunF = 0.5 + 1.4 * fwd + 1.1 * path;
  float shade = 0.12, edge = 1e3, up = 0.0;
  if (lb.z > 0.0) {
    vec2 d2 = (q - lb.xy) / lb.zw;
    float rr = dot(d2, d2);
    vec3 n = normalize(vec3(d2.x, d2.y, -sqrt(max(1.0 - rr, 0.0))));
    shade = sat(0.5 + 0.55 * dot(n, normalize(vec3(0.55, 0.75, 0.1))));
    edge = (1.0 - sqrt(rr)) * lb.w / z;   // distance to the lobe outline, screen units
    up = sat(d2.y * 2.0 + 0.3);
  }
  float tex = 0.7 + 0.6 * vnoise(vec2(q.x / (z * gCW * 7.0), q.y / (z * gCH * 0.9)) + vec2(float(s), 0.0));
  float Lc = (0.04 + 1.3 * pow(shade, 2.5)) * tex * sunF;
  vec3 c = mix(cCSh, mix(cRose, cCloud, shade), shade) * Lc;
  c += cSun * 1.7 * exp(-dTop / (0.28 * gCH)) * sunF;                                  // silver lining
  c += mix(cRose, cCloud, shade) * 0.55 * exp(-edge / (0.3 * gCH)) * up * sunF;       // lobe outlines
  col = hazed(c, fog, 0.35);
  return a;
}

// ------------------------------------------------------------------ sky
vec3 sky(vec2 p, out float m){
  m = 9.0;
  vec3 c = vec3(0.0);
  // sun: banded disc
  vec2 sp = (p - SUNP) * vec2(1.0, 1.16);
  float r = length(sp);
  if (r < SUNR) {
    float band = 1.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float yb = SUNR * (-0.62 + 0.42 * fi) + 0.02 * sin(sp.x * 9.0 + fi * 2.0 + TAU * uPhase);
      float th = max(0.005, 0.32 * gCH) * (1.0 + 0.6 * n1(sp.x * 18.0 + fi * 5.0, 50 + i));
      band *= smoothstep(th * 0.5, th, abs(sp.y - yb));
    }
    float limb = 0.7 + 0.3 * sqrt(max(1.0 - r * r / (SUNR * SUNR), 0.0));
    c = cSun * 3.0 * limb * band;
    m = 8.0;
    return c;
  }
  // thin dawn streaks lit from below
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float yj = 0.14 + 0.075 * fi + 0.03 * hs(fi, 31);
    float xj = -0.5 + 2.0 * hs(fi, 32) + 0.04 * sin(TAU * uPhase + fi);
    float lj = 0.35 + 0.7 * hs(fi, 33);
    float yc = yj + 0.025 * sin((p.x - xj) * 2.2 + fi) + 0.008 * n1(p.x * 9.0, 34 + i);
    float th = max(0.004, 0.3 * gCH) * (0.6 + 0.8 * hs(fi, 35));
    float dy = abs(p.y - yc);
    if (dy < th * 2.0) {
      float along = (p.x - xj) / lj;
      float env = sat(1.0 - along * along);
      float brk = smoothstep(0.3, 0.65, n1(p.x * 14.0 + fi * 7.0, 40 + i));
      float sunk = exp(-length(vec2(p.x - SUNP.x, (p.y - SUNP.y) * 1.5)) * 1.2);
      float k = env * brk * (1.0 - smoothstep(th * 0.5, th * 2.0, dy)) * (0.25 + 2.2 * sunk);
      c += mix(cRose, cRim, sunk) * k;
    }
  }
  // a few stars away from the sun
  vec2 g = p * 18.0;
  vec2 gi = floor(g);
  float hh = hashi(ivec2(gi) + ivec2(500, 900));
  if (hh < 0.035) {
    vec2 o = vec2(hashi(ivec2(gi) + ivec2(3, 7)), hashi(ivec2(gi) + ivec2(11, 5)));
    vec2 d = (g - gi - 0.15 - 0.7 * o) / 18.0;
    float far = smoothstep(0.6, 1.6, length(p - SUNP)) * smoothstep(0.1, 0.5, p.y);
    float tw = 0.6 + 0.4 * sin(TAU * (uPhase * 7.0 + hh * 40.0));
    float s = exp(-dot(d, d) / (gPx * gPx * 4.0)) * far * tw * (0.4 + 6.0 * hh);
    c += cStar * s;
  }
  return c;
}

// ------------------------------------------------------------------ main
vec3 sceneColor(vec2 p, out float mat, out float depth){
  gPx = uPxSize;
  gCW = uCellPx.x * gPx;
  gCH = uCellPx.y * gPx;
  gDet = uDetail; gAt = uAtmos;
  gL = normalize(vec3(1.3, 0.32, 1.0));
  cSun = nc(uSun); cLit = nc(uLit); cRim = nc(uRim); cSh = nc(uShadow); cDeep = nc(uDeep); cCloud = nc(uCloud);
  cRose = nc(uRose); cCSh = nc(uCloudSh); cVeg = nc(uVeg); cVegLit = nc(uVegLit); cWood = nc(uWood); cRoof = nc(uRoof);
  cLan = nc(uLantern); cWin = nc(uWindow); cWat = nc(uWater); cSky = nc(uSky); cHaze = nc(uHaze); cStar = nc(uStar);
  gCam = uCamAmt * vec2(0.07 * sin(TAU * uPhase), 0.012 * sin(TAU * uPhase * 2.0 + 1.0));
  aCol = vec3(0.0); aT = 1.0; aMat = 0.0; aW = 0.0; aDepth = 1.0;
  vec3 c; float m, a; vec2 q; float z;

  // near cloud billows
  z = 0.72; q = toLayer(p, z);
  a = bank(q, z, 0.20, 0.24, 0.20, 3.0, 4.0, 101, c); if (a > 0.0) put(c, a, 3.0, z);
  // foreground pillar
  if (aT > 0.02) {
    z = 1.0; q = toLayer(p, z);
    a = pillar(q, vec4(-1.48, 0.62, 3.0, 7.0), z, 1.0, c, m); if (a > 0.0) put(c, a, m, z);
  }
  if (aT > 0.02) { z = 1.35; q = toLayer(p, z); a = bank(q, z, 0.24, 0.30, 0.22, 3.0, 3.0, 131, c); if (a > 0.0) put(c, a, 3.0, z); }
  if (aT > 0.02) { z = 1.9; q = toLayer(p, z); a = pillar(q, vec4(1.52 * 1.9, 0.42, 1.25, 19.0), z, 1.0, c, m); if (a > 0.0) put(c, a, m, z); }
  if (aT > 0.02) { z = 2.3; q = toLayer(p, z); a = bank(q, z, 0.28, 0.33, 0.20, 2.0, 3.0, 151, c); if (a > 0.0) put(c, a, 3.0, z); }
  if (aT > 0.02) { z = 2.8; q = toLayer(p, z); a = pillar(q, vec4(0.13 * 2.8, 0.42, 1.32, 29.0), z, 1.0, c, m); if (a > 0.0) put(c, a, m, z); }
  if (aT > 0.02) { z = 3.3; q = toLayer(p, z); a = pillar(q, vec4(0.62 * 3.3, 0.33, 1.05, 37.0), z, 1.0, c, m); if (a > 0.0) put(c, a, m, z); }
  if (aT > 0.02) { z = 3.7; q = toLayer(p, z); a = bank(q, z, 0.34, 0.36, 0.20, 2.0, 2.0, 171, c); if (a > 0.0) put(c, a, 3.0, z); }

  // receding field of pillars, each layer with a cloud bank in front of it
  int nf = int(mix(4.0, 8.0, gDet));
  for (int i = 0; i < 8; i++) {
    if (i >= nf || aT < 0.02) break;
    float fi = float(i);
    z = 4.5 * pow(1.36, fi);
    float zb = z * 0.94; q = toLayer(p, zb);
    a = bank(q, zb, 0.12 * zb, 0.30 + 0.1 * hs(fi, 77), 0.16 + 0.005 * zb, 1.0, fi < 3.0 ? 2.0 : 1.0, 200 + i * 17, c);
    if (a > 0.0) put(c, a, 3.0, zb);
    if (aT < 0.02) break;
    q = toLayer(p, z);
    float S = 0.24 * z;
    float k0 = floor(q.x / S);
    float best = 0.0; vec3 bc = vec3(0.0); float bm = 11.0, bpri = -1.0;
    for (int j = -1; j <= 1; j++) {
      float k = k0 + float(j);
      float h = hs(k, 300 + i * 11);
      if (h > 0.62) continue;
      float x = (k + 0.5 + 0.5 * (hs(k, 301 + i * 11) - 0.5)) * S;
      float w = (0.10 + 0.13 * hs(k, 302 + i * 11)) * S;
      float t = -HC + 1.0 + 2.8 * pow(hs(k, 303 + i * 11), 1.4);
      float sx = (x - gCam.x) / z;
      if (abs(sx - SUNP.x) < SUNR * 1.1 + w / z) t = min(t, -HC + (SUNP.y - SUNR * 0.8 - Y0) * z);
      float pa = pillar(q, vec4(x, w, t, k * 7.0 + fi * 131.0 + 1000.0), z, 0.0, c, m);
      if (pa > 0.0 && h > bpri) { bpri = h; best = pa; bc = c; bm = m; }
    }
    if (best > 0.0) put(bc, best, bm, z);
  }
  if (aT > 0.02) { float sm; vec3 sc = sky(p, sm); put(sc, 1.0, sm, 60.0); }
  mat = aMat;
  depth = aDepth;
  return aCol;
}
`,
});

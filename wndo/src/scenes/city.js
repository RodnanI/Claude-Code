// wndo :: City Rain. A street seen from a sixth floor at 2 a.m., raytraced in one pass.
(() => {
  const W = window.W;
  const DW = 128; // data texture width
  const ROWS = 11;

  const GLSL = /* glsl */ `
${W.GLSL.common}
${W.GLSL.camera}
uniform sampler2D uData;
uniform vec4 uN, uN2;
uniform float uRain, uWind, uFlash, uFog, uWet, uLitBias;
uniform vec4 uSig;        // main red, yellow, green, walk
uniform vec3 uWinPal[6];
uniform vec3 uNeonPal[8];
out vec4 o;
#define FAR 9000.0
vec4 D(int x, int y){ return texelFetch(uData, ivec2(x, y), 0); }

vec2 boxT(vec3 ro, vec3 ird, vec3 bmin, vec3 bmax, out vec3 n){
  vec3 t0 = (bmin - ro) * ird, t1 = (bmax - ro) * ird;
  vec3 tmn = min(t0, t1), tmx = max(t0, t1);
  float tn = max(max(tmn.x, tmn.y), tmn.z), tf = min(min(tmx.x, tmx.y), tmx.z);
  n = -sign(ird) * step(tmn.yzx, tmn) * step(tmn.zxy, tmn);
  return vec2(tn, tf);
}

// walk one row of buildings along x, nearest first
void traceRow(vec3 ro, vec3 rd, vec3 ird, int i0, int n, float zMin, float zMax, inout float tB, inout vec3 nB, inout int idB){
  if (n <= 0) return;
  float tz0 = (zMin - ro.z) * ird.z, tz1 = (zMax - ro.z) * ird.z;
  float ta = max(min(tz0, tz1), 0.0), tb = min(max(tz0, tz1), tB);
  if (ta >= tb) return;
  float xa = ro.x + rd.x * ta, xb = ro.x + rd.x * tb;
  int lo = 0, hi = n - 1;
  for (int k = 0; k < 8; k++) { if (lo >= hi) break; int mid = (lo + hi + 1) / 2; if (D(i0 + mid, 0).x <= xa) lo = mid; else hi = mid - 1; }
  int dir = rd.x >= 0.0 ? 1 : -1;
  int idx = lo;
  for (int k = 0; k < 16; k++) {
    if (idx < 0 || idx >= n) break;
    vec4 b = D(i0 + idx, 0); float h = D(i0 + idx, 1).x;
    if ((dir > 0 && b.x > xb + 0.01) || (dir < 0 && b.z < xb - 0.01)) break;
    vec3 nn;
    vec2 t = boxT(ro, ird, vec3(b.x, 0.0, b.y), vec3(b.z, h, b.w), nn);
    if (t.x < t.y && t.y > 0.0 && t.x < tB) { tB = max(t.x, 0.0); nB = nn; idB = i0 + idx; return; }
    idx += dir;
  }
}
void traceCity(vec3 ro, vec3 rd, vec3 ird, inout float tB, inout vec3 nB, inout int idB){
  int nA = int(uN.x), nBr = int(uN.y), nT = int(uN.z);
  traceRow(ro, rd, ird, 0, nA, 17.5, 40.0, tB, nB, idB);
  if (idB >= 0) return;
  traceRow(ro, rd, ird, nA, nBr, 41.0, 160.0, tB, nB, idB);
  if (idB >= 0) return;
  for (int i = 0; i < 24; i++) {
    if (i >= nT) break;
    int j = nA + nBr + i;
    vec4 b = D(j, 0); float h = D(j, 1).x; vec3 nn;
    vec2 t = boxT(ro, ird, vec3(b.x, 0.0, b.y), vec3(b.z, h, b.w), nn);
    if (t.x < t.y && t.y > 0.0 && t.x < tB) { tB = max(t.x, 0.0); nB = nn; idB = j; }
  }
}

vec3 skyCol(vec3 rd){
  float h = rd.y;
  vec3 c = mix(vec3(0.085, 0.05, 0.032), vec3(0.007, 0.008, 0.011), smoothstep(-0.03, 0.35, h));
  if (h > -0.02) {
    vec2 cp = rd.xz / (max(h, 0.0) + 0.06) * 1.1 + vec2(uTime * 0.01 * (0.3 + uWind), uTime * 0.004);
    float n = fbm(cp * 0.7);
    c *= 0.6 + 0.8 * n;
    float fl = fbm(cp * 1.2 + 7.0);
    c += vec3(0.5, 0.56, 0.72) * uFlash * (0.25 + 1.6 * smoothstep(0.35, 0.8, fl)) * smoothstep(-0.02, 0.25, h);
  }
  return c;
}

float lampEmit(vec3 l){ return 0.25 + 0.75 * smoothstep(-0.25, 0.7, -l.y); }
// street lamps + passing headlights, for surfaces
vec3 streetLight(vec3 p, vec3 n){
  vec3 acc = vec3(0.0);
  int nl = int(uN.w);
  for (int i = 0; i < 64; i++) {
    if (i >= nl) break;
    vec4 a = D(i, 2);
    vec3 lv = vec3(a.x, a.y - 0.2, a.z) - p;
    float d2 = dot(lv, lv);
    if (d2 > 900.0) continue;
    vec4 c = D(i, 3);
    vec3 l = lv * inversesqrt(d2);
    acc += c.rgb * c.w * max(dot(n, l), 0.0) * lampEmit(-l) / (d2 + 1.5);
  }
  int nc = int(uN2.z);
  for (int i = 0; i < 40; i++) {
    if (i >= nc) break;
    vec4 a = D(i, 8);
    vec2 f = vec2(cos(a.z), sin(a.z));
    vec2 rel = p.xz - (a.xy + f * 2.2);
    float along = dot(rel, f);
    if (along < 0.0 || along > 40.0) continue;
    float side = abs(dot(rel, vec2(-f.y, f.x)));
    float beam = (1.0 - smoothstep(0.6 + along * 0.18, 1.6 + along * 0.32, side)) * (1.0 / (1.0 + along * along * 0.02));
    acc += vec3(1.0, 0.9, 0.75) * beam * 2.2 * max(n.y, 0.2) * step(p.y, 1.5);
  }
  return acc;
}

// one lit (or dark) room behind a window, entry point e in room space
vec3 room(vec3 e, vec3 d, vec2 cell, float seed, vec3 lc, float on, float tv){
  float fh = cell.y;
  vec3 sz = vec3(cell.x, fh, 4.6);
  vec3 tt = vec3(((d.x > 0.0 ? sz.x : 0.0) - e.x) / d.x, ((d.y > 0.0 ? sz.y : 0.0) - e.y) / d.y, (sz.z - e.z) / d.z);
  float t = min(min(tt.x, tt.y), tt.z);
  vec3 h = e + d * t;
  vec4 r = hash42(vec2(seed, 1.7));
  vec3 alb = vec3(0.55, 0.5, 0.44) * (0.75 + 0.5 * r.x);
  if (t == tt.z) {
    float sofa = step(h.y, 0.85) * step(0.35, r.y) * step(abs(h.x - sz.x * 0.5), sz.x * 0.36);
    alb = mix(alb, vec3(0.2, 0.13, 0.1) * (0.5 + hash32(vec2(seed, 3.0)) * 0.9), sofa);
    vec2 pc = vec2(sz.x * (0.3 + 0.4 * r.z), 1.75);
    float pic = step(abs(h.x - pc.x), 0.35) * step(abs(h.y - pc.y), 0.26) * step(0.5, r.w);
    alb = mix(alb, hash32(vec2(seed, 9.0)) * 0.6 + 0.1, pic);
    float shelf = step(0.7, r.z) * step(fract(h.y * 2.6), 0.08) * step(h.y, 2.0) * step(sz.x * 0.62, h.x);
    alb *= 1.0 - shelf * 0.6;
  } else if (t == tt.y) {
    alb = d.y > 0.0 ? vec3(0.78) : vec3(0.32, 0.2, 0.12) * (0.7 + 0.3 * step(0.5, fract(h.x * 0.8 + h.z * 0.1)));
  } else {
    alb *= 0.85 + 0.3 * r.w;
  }
  vec3 lp = vec3(sz.x * (0.35 + 0.3 * r.y), fh - 0.3, 1.6 + 2.2 * r.x);
  float dl = length(h - lp);
  float L = 2.2 / (1.0 + dl * dl * 0.35);
  if (h.y > fh - 0.02) L = 0.5 + 3.4 / (1.0 + dl * dl * 1.6);
  if (r.z > 0.72) { vec3 lp2 = vec3(0.5, 1.2, 3.5); float d2 = length(h - lp2); L = L * 0.35 + 1.3 / (1.0 + d2 * d2 * 1.2); }
  vec3 c = alb * lc * L * on;
  float flick = 0.45 + 0.55 * vnoise(vec2(uTime * 7.0, seed * 3.0)) * (0.6 + 0.4 * vnoise(vec2(uTime * 0.7, seed)));
  c += tv * vec3(0.35, 0.5, 0.95) * alb * flick * 0.9 / (1.0 + sq(h.z - 0.6) * 0.6);
  return c;
}

float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float glyph(vec2 p, float seed){
  float d = 1e3;
  for (int i = 0; i < 4; i++) {
    vec4 h = hash42(vec2(seed, float(i) * 1.37));
    vec2 a = floor(h.xy * 3.0) * 0.5, b = floor(h.zw * 3.0) * 0.5;
    if (dot(a - b, a - b) < 0.01) b = vec2(1.0) - a;
    d = min(d, segD(p, a * 0.8 + 0.1, b * 0.8 + 0.1));
  }
  return d;
}

// facade parameters by style: floor height, column spacing, window size, sill
void facade(float st, out float fh, out float cs, out vec2 ws, out float sill, out vec3 wall){
  if (st < 0.5)      { fh = 3.1;  cs = 3.0; ws = vec2(1.25, 1.65); sill = 0.85; wall = vec3(0.21, 0.085, 0.055); }
  else if (st < 1.5) { fh = 3.4;  cs = 2.6; ws = vec2(1.05, 2.05); sill = 0.75; wall = vec3(0.3, 0.25, 0.19); }
  else if (st < 2.5) { fh = 2.95; cs = 3.6; ws = vec2(2.3, 1.45);  sill = 0.9;  wall = vec3(0.2, 0.2, 0.19); }
  else if (st < 3.5) { fh = 3.7;  cs = 1.8; ws = vec2(1.68, 2.6); sill = 0.55; wall = vec3(0.05, 0.055, 0.06); }
  else               { fh = 3.8;  cs = 2.3; ws = vec2(1.9, 2.5);  sill = 0.6;  wall = vec3(0.07, 0.07, 0.075); }
}

vec3 shadeBuilding(vec3 p, vec3 rd, vec3 n, int id, float t, bool lite){
  vec4 b = D(id, 0), q = D(id, 1);
  float H = q.x, seed = q.y, st = q.z, shop = q.w;
  float fh, cs, sill; vec2 ws; vec3 wall;
  facade(st, fh, cs, ws, sill, wall);
  if (n.y > 0.5) {
    vec3 c = vec3(0.025) * (0.7 + 0.6 * vnoise(p.xz * 0.5));
    return c + skyCol(reflect(rd, n)) * 0.12 * uWet;
  }
  bool front = abs(n.z) > 0.5;
  float u = front ? p.x - b.x : (n.x < 0.0 ? b.w - p.z : p.z - b.y);
  float width = front ? b.z - b.x : b.w - b.y;
  vec3 tang = front ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, n.x < 0.0 ? -1.0 : 1.0);
  vec3 inw = -n;
  float gh = 4.4;
  float ncol = floor(max(width - 1.2, 0.0) / cs);
  float margin = (width - ncol * cs) * 0.5;
  float ci = floor((u - margin) / cs);
  float fx = u - margin - ci * cs;
  float fl = floor((p.y - gh) / fh);
  float fy = p.y - gh - fl * fh;
  bool inCol = ci >= 0.0 && ci < ncol;
  bool upper = p.y > gh && p.y < H - 1.2 && fl < floor((H - 1.2 - gh) / fh);
  float faceId = front ? 0.0 : (n.x < 0.0 ? 1.0 : 2.0);
  vec3 cid = vec3(seed * 13.1 + faceId * 3.7 + ci, fl, seed);
  float h1 = hash13(cid), h2 = hash13(cid + 11.3), h3 = hash13(cid + 23.9);
  float period = 90.0 + 400.0 * h2;
  float cyc = floor(uTime / period + h3);
  float hl = hash13(cid + cyc * 7.77);
  float litP = st > 2.5 ? (hash12(vec2(seed, fl)) < 0.28 ? 0.85 : 0.04) : 0.22;
  litP *= uLitBias;
  float on = step(hl, litP);
  float tv = (1.0 - on) * step(hl, litP + 0.05);
  vec3 lc = uWinPal[int(h1 * 5.99)] * (0.7 + 0.6 * h2);
  vec2 wc = vec2(cs * 0.5, sill + ws.y * 0.5);
  vec2 wd = abs(vec2(fx, fy) - wc) - ws * 0.5;
  float inWin = (inCol && upper) ? step(max(wd.x, wd.y), 0.0) : 0.0;
  float lamp = 0.0;
  vec3 col;
  float detail = 1.0 - smoothstep(30.0, 140.0, t);
  vec3 sl = lite ? vec3(0.03, 0.02, 0.012) : streetLight(p + n * 0.05, n);
  vec3 amb = vec3(0.016, 0.011, 0.008) + vec3(0.05, 0.03, 0.017) * (1.0 - smoothstep(0.0, 30.0, p.y));
  amb += vec3(0.5, 0.55, 0.7) * uFlash * 0.25;
  if (inWin > 0.5) {
    vec3 e = vec3(fx - (wc.x - ws.x * 0.5), fy - sill, 0.02);
    vec3 dl = vec3(dot(rd, tang), rd.y, dot(rd, inw));
    float ctype = floor(h3 * 12.0);
    vec3 ic;
    if (lite) {
      ic = lc * on * 0.9 + tv * vec3(0.15, 0.22, 0.4);
    } else {
      ic = room(e, dl, vec2(ws.x, fh), seed + ci * 7.0 + fl * 31.0 + faceId, lc, on, tv);
      float zc = 0.14 / max(dl.z, 0.05);
      float cx = e.x + dl.x * zc;
      if (ctype < 1.0) {
        float gap = 0.15 + 0.5 * h2;
        float cov = step(cx, ws.x * (0.5 - gap * 0.5)) + step(ws.x * (0.5 + gap * 0.5), cx);
        float folds = 0.75 + 0.25 * sin(cx * 38.0 + h1 * 6.0);
        vec3 fab = hash32(cid.xy + 4.0) * 0.5 + 0.35;
        ic = mix(ic, (lc * on * 0.55 + tv * vec3(0.1, 0.15, 0.3) + 0.004) * fab * folds, cov);
      } else if (ctype < 1.6) {
        float sy = e.y + dl.y * zc;
        float slat = step(fract(sy * 11.0), 0.62) * step(sy, ws.y * (0.55 + 0.45 * h2));
        ic = mix(ic, (lc * on * 0.32 + 0.003) * vec3(0.95, 0.92, 0.85), slat);
      } else if (ctype < 2.5) {
        ic = mix(ic, lc * on * 0.5 + tv * 0.1 + 0.003, 0.65);
      }
    }
    float mull = step(abs(fx - wc.x), 0.035) + step(abs(fy - sill - ws.y * 0.68), 0.03) * step(st, 1.5);
    vec3 refl = skyCol(reflect(rd, n)) * 0.18 + sl * 0.01;
    float fr = 0.04 + 0.5 * pow(1.0 - abs(dot(rd, n)), 5.0);
    col = mix(ic, refl, fr * (on > 0.5 ? 0.3 : 1.0));
    col = mix(col, wall * (amb + sl) * 0.5, min(mull, 1.0) * detail);
    col += vec3(0.02, 0.03, 0.05) * pow(1.0 - abs(dot(rd, n)), 3.0);
  } else {
    vec3 alb = wall * (0.8 + 0.4 * hash12(vec2(seed, 2.0)));
    if (st < 0.5) {
      vec2 bq = vec2(u * 4.3 + floor(p.y * 13.0) * 0.5, p.y * 13.0);
      float mortar = max(step(0.88, fract(bq.x)), step(0.84, fract(bq.y)));
      alb *= 1.0 - mortar * 0.35 * detail;
      alb *= 0.85 + 0.3 * hash12(floor(bq) + seed) * detail;
    } else if (st < 2.5) {
      alb *= 1.0 - 0.25 * step(fract(p.y / fh), 0.06) * detail;
    }
    float stain = vnoise(vec2(u * 0.7, p.y * 0.08 + seed));
    alb *= 0.85 + 0.25 * stain * detail + 0.1 * (1.0 - detail);
    alb *= 1.0 - 0.25 * uWet;
    if (inCol && upper) {
      float dw = max(max(wd.x, wd.y), 0.0);
      col = alb * (amb + sl) + lc * on * 0.05 * exp(-dw * 5.0) * alb * 6.0;
      float sillL = step(abs(fy - sill + 0.05), 0.05) * step(abs(fx - wc.x), ws.x * 0.55);
      col *= 1.0 + sillL * 0.4;
    } else {
      col = alb * (amb + sl);
    }
    if (p.y > H - 1.0) col *= 0.7 + 0.3 * step(H - 0.25, p.y);
  }
  // ground floor shops, row A front faces only
  if (front && p.y < gh && id < int(uN.x)) {
    float sx = fract(u / 6.0);
    float pillar = step(sx, 0.07);
    bool sign = p.y > 3.35 && p.y < 4.25;
    float open = shop;
    vec3 sc = shop < 1.5 ? vec3(1.0, 0.98, 0.95) : (shop < 2.5 ? vec3(1.0, 0.68, 0.36) : (shop < 3.5 ? vec3(0.9, 0.95, 1.0) : vec3(0.0)));
    if (sign) {
      col = vec3(0.012) + sc * 0.08 * step(0.5, open);
    } else if (p.y > 0.35 && p.y < 3.15 && pillar < 0.5) {
      if (shop > 3.5 || shop < 0.5) {
        float corr = 0.85 + 0.15 * step(0.5, fract(p.y * 9.0)) * detail;
        col = vec3(0.035, 0.035, 0.038) * corr * (amb + sl) + vec3(0.02, 0.013, 0.007) * step(shop, 0.5);
      } else {
        vec3 e = vec3(fract(u / 6.0) * 6.0, p.y, 0.02);
        vec3 dl = vec3(dot(rd, tang), rd.y, max(dot(rd, inw), 0.05));
        vec3 ic = lite ? sc * 1.2 : room(e, dl, vec2(6.0, 4.0), seed * 3.3 + floor(u / 6.0), sc * 1.6, 1.0, 0.0);
        float shelves = step(0.5, fract((e.y + dl.y * 3.0) * 2.2)) * 0.3;
        col = ic * (1.0 - shelves) + skyCol(reflect(rd, n)) * 0.05;
      }
    } else {
      col = vec3(0.04) * (amb + sl) * 3.0;
    }
  }
  // neon signs mounted on the facades
  if (front && !lite) {
    int ns = int(uN2.x);
    for (int i = 0; i < 24; i++) {
      if (i >= ns) break;
      vec4 r = D(i, 4); vec4 m = D(i, 5);
      if (abs(m.x - p.z) > 0.4 || p.x < r.x || p.x > r.z || p.y < r.y || p.y > r.w) continue;
      vec3 nc = uNeonPal[int(m.y)];
      if (m.w < 0.5) {
        float gw = (r.w - r.y);
        float k = (p.x - r.x) / gw;
        float gi = floor(k);
        vec2 gp = vec2(fract(k), (p.y - r.y) / gw);
        float dd = glyph(gp, m.z + gi);
        float faulty = step(fract(m.z * 3.1 + gi * 0.37), 0.07);
        float flick = mix(step(0.01, hash12(vec2(floor(uTime * 6.0), m.z + gi))), step(0.45, vnoise(vec2(uTime * 4.0, gi + m.z))), faulty);
        col = col * 0.4 + nc * ((1.0 - smoothstep(0.0, 0.08, dd)) * 6.0 + exp(-dd * 18.0) * 0.8) * flick;
      } else if (m.w < 1.5) {
        vec2 lp = (p.xy - r.xy) / (r.zw - r.xy);
        float txt = glyph(vec2(fract(lp.x * 5.0), lp.y * 1.2 - 0.1), m.z + floor(lp.x * 5.0));
        col = nc * (1.6 - 1.3 * (1.0 - smoothstep(0.04, 0.09, txt)) * step(0.15, lp.y) * step(lp.y, 0.85));
      } else {
        vec2 lp = (p.xy - (r.xy + r.zw) * 0.5) / (r.w - r.y);
        float cr = max(min(abs(lp.x), abs(lp.y)) - 0.1, max(abs(lp.x), abs(lp.y)) - 0.32);
        col = col * 0.3 + nc * ((1.0 - step(0.0, cr)) * 4.0 + exp(-max(cr, 0.0) * 12.0) * 0.4) * (0.85 + 0.15 * sin(uTime * 2.0));
      }
    }
  }
  return col;
}

// --- street furniture ---------------------------------------------------------
float cylT(vec2 ro, vec2 rd, vec2 c, float r){
  vec2 oc = ro - c; float a = dot(rd, rd), bq = dot(oc, rd), cq = dot(oc, oc) - r * r;
  float disc = bq * bq - a * cq;
  if (disc < 0.0) return -1.0;
  return (-bq - sqrt(disc)) / a;
}
void tracePoles(vec3 ro, vec3 rd, vec3 ird, inout float tB, inout vec3 nB, inout int kind, inout float aux){
  int nl = int(uN.w);
  vec2 rdxz = rd.xz; float l2 = dot(rdxz, rdxz);
  for (int i = 0; i < 64; i++) {
    if (i >= nl) break;
    vec4 a = D(i, 2);
    vec2 pc = vec2(a.x, a.w);
    vec2 mc = vec2(a.x, (a.z + a.w) * 0.5);
    float along = dot(mc - ro.xz, rdxz) / l2;
    vec2 cl = ro.xz + rdxz * along - mc;
    if (dot(cl, cl) > 9.0 || along < 0.0) continue;
    float t = cylT(ro.xz, rdxz, pc, 0.1);
    if (t > 0.0 && t < tB) { float y = ro.y + rd.y * t; if (y > 0.0 && y < a.y + 0.2) { tB = t; vec2 nn = normalize(ro.xz + rdxz * t - pc); nB = vec3(nn.x, 0.0, nn.y); kind = 3; aux = float(i); } }
    vec3 nn;
    vec2 tt = boxT(ro, ird, vec3(a.x - 0.06, a.y + 0.08, min(a.z, a.w)), vec3(a.x + 0.06, a.y + 0.2, max(a.z, a.w)), nn);
    if (tt.x < tt.y && tt.x > 0.0 && tt.x < tB) { tB = tt.x; nB = nn; kind = 3; aux = float(i); }
    tt = boxT(ro, ird, vec3(a.x - 0.32, a.y, a.z - 0.42), vec3(a.x + 0.32, a.y + 0.2, a.z + 0.42), nn);
    if (tt.x < tt.y && tt.x > 0.0 && tt.x < tB) { tB = tt.x; nB = nn; kind = 3; aux = float(i) + (nn.y < -0.5 ? 0.5 : 0.0); }
  }
  // traffic signal poles and mast arm
  vec3 nn;
  for (int i = 0; i < 2; i++) {
    vec2 pc = i == 0 ? vec2(73.6, 16.6) : vec2(56.2, 16.6);
    float t = cylT(ro.xz, rdxz, pc, 0.13);
    if (t > 0.0 && t < tB) { float y = ro.y + rd.y * t; if (y > 0.0 && y < 6.6) { tB = t; vec2 q = normalize(ro.xz + rdxz * t - pc); nB = vec3(q.x, 0.0, q.y); kind = 3; aux = -1.0; } }
  }
  vec2 tt = boxT(ro, ird, vec3(73.5, 6.3, 7.8), vec3(73.7, 6.45, 16.6), nn);
  if (tt.x < tt.y && tt.x > 0.0 && tt.x < tB) { tB = tt.x; nB = nn; kind = 3; aux = -1.0; }
  tt = boxT(ro, ird, vec3(73.35, 5.1, 9.2), vec3(73.6, 6.3, 9.55), nn);
  if (tt.x < tt.y && tt.x > 0.0 && tt.x < tB) { tB = tt.x; nB = nn; kind = 6; aux = (ro.y + rd.y * tt.x - 5.1) / 1.2; }
  tt = boxT(ro, ird, vec3(73.35, 3.3, 16.95), vec3(73.6, 4.5, 17.3), nn);
  if (tt.x < tt.y && tt.x > 0.0 && tt.x < tB) { tB = tt.x; nB = nn; kind = 6; aux = (ro.y + rd.y * tt.x - 3.3) / 1.2; }
}
void traceCars(vec3 ro, vec3 rd, inout float tB, inout vec3 nB, inout int kind, inout float aux, out vec3 lp){
  int nc = int(uN2.z);
  lp = vec3(0.0);
  for (int i = 0; i < 40; i++) {
    if (i >= nc) break;
    vec4 a = D(i, 8);
    float bus = step(1.5, a.w);
    float len = mix(4.5, 12.0, bus), wid = mix(1.82, 2.55, bus);
    vec2 rel = a.xy - ro.xz;
    vec2 rdxz = rd.xz;
    float al = dot(rel, rdxz) / dot(rdxz, rdxz);
    vec2 cl = ro.xz + rdxz * al - a.xy;
    if (al < 0.0 || dot(cl, cl) > sq(len * 0.6 + 1.0)) continue;
    float c = cos(a.z), s = sin(a.z);
    mat2 toL = mat2(c, -s, s, c);
    vec2 o2 = toL * (ro.xz - a.xy), d2 = toL * rd.xz;
    vec3 lo = vec3(o2.x, ro.y, o2.y), ld = vec3(d2.x, rd.y, d2.y);
    vec3 ild = 1.0 / mix(ld, vec3(1e-6), lessThan(abs(ld), vec3(1e-6)));
    vec3 nn;
    vec2 t = boxT(lo, ild, vec3(-len * 0.5, 0.28, -wid * 0.5), vec3(len * 0.5, mix(1.02, 3.1, bus), wid * 0.5), nn);
    vec3 nn2; vec2 t2 = vec2(1e9, 0.0);
    if (bus < 0.5) t2 = boxT(lo, ild, vec3(-1.45, 1.0, -wid * 0.45), vec3(0.85, 1.47, wid * 0.45), nn2);
    if (t2.x < t2.y && t2.x > 0.0 && t2.x < t.x) { t = t2; nn = nn2; }
    if (t.x < t.y && t.x > 0.0 && t.x < tB) {
      tB = t.x;
      mat2 toW = mat2(c, s, -s, c);
      vec2 nw = toW * nn.xz;
      nB = vec3(nw.x, nn.y, nw.y);
      kind = 4; aux = float(i);
      lp = lo + ld * t.x;
    }
  }
}
void tracePeople(vec3 ro, vec3 rd, inout float tB, inout vec3 nB, inout int kind, inout float aux, out vec2 pq){
  int np = int(uN2.w);
  pq = vec2(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= np) break;
    vec4 a = D(i, 10);
    vec3 c = vec3(a.x, 0.0, a.y);
    vec3 nrm = normalize(vec3(ro.x - c.x, 0.0, ro.z - c.z));
    float dn = dot(rd, nrm);
    if (abs(dn) < 1e-4) continue;
    float t = dot(c - ro, nrm) / dn;
    if (t <= 0.0 || t > tB) continue;
    vec3 h = ro + rd * t;
    vec3 side = vec3(-nrm.z, 0.0, nrm.x);
    vec2 q = vec2(dot(h - c, side), h.y);
    float bob = abs(sin(a.z * 6.0)) * 0.04;
    float body = length(max(abs(q - vec2(0.0, 1.0 + bob)) - vec2(0.17, 0.42), 0.0)) - 0.05;
    float head = length(q - vec2(0.0, 1.62 + bob)) - 0.11;
    float legs = min(length(max(abs(q - vec2(0.07 * sin(a.z * 3.0), 0.45)) - vec2(0.05, 0.45), 0.0)), length(max(abs(q - vec2(-0.07 * sin(a.z * 3.0), 0.45)) - vec2(0.05, 0.45), 0.0)));
    vec2 uq = q - vec2(0.05, 1.98 + bob);
    float umb = max(length(uq / vec2(0.62, 0.32)) - 1.0, -uq.y);
    float stick = length(max(abs(q - vec2(0.05, 1.7 + bob)) - vec2(0.012, 0.3), 0.0));
    float sdp = min(min(min(body, head), legs), stick);
    float hasU = step(0.25, a.w);
    if (sdp < 0.0 || (umb < 0.0 && hasU > 0.5)) {
      tB = t; nB = nrm; kind = 5; aux = float(i) + (umb < 0.0 && hasU > 0.5 ? 0.5 : 0.0); pq = q;
    }
  }
}
void traceBlades(vec3 ro, vec3 rd, vec3 ird, inout float tB, inout vec3 nB, inout int kind, inout float aux, out vec3 bp){
  int nb = int(uN2.y);
  bp = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    if (i >= nb) break;
    vec4 a = D(i, 6), m = D(i, 7);
    vec3 nn;
    vec2 t = boxT(ro, ird, vec3(a.x - 0.11, a.z, a.y - m.x), vec3(a.x + 0.11, a.w, a.y), nn);
    if (t.x < t.y && t.x > 0.0 && t.x < tB) { tB = t.x; nB = nn; kind = 7; aux = float(i); bp = ro + rd * t.x; }
  }
}

vec3 shadeGround(vec3 p, vec3 rd, vec3 ird, float t){
  bool crossSt = p.z > 15.5 && ((p.x > 58.0 && p.x < 72.0) || (p.x > 180.0 && p.x < 194.0));
  bool crossRoad = crossSt && ((p.x > 60.0 && p.x < 70.0) || (p.x > 182.0 && p.x < 192.0));
  bool road = (p.z > 3.5 && p.z < 15.5) || crossRoad;
  float detail = 1.0 - smoothstep(25.0, 90.0, t);
  vec3 alb;
  float rough;
  if (road) {
    alb = vec3(0.03, 0.03, 0.032) * (0.75 + 0.5 * vnoise(p.xz * 0.7));
    float dash = step(fract(p.x / 9.0), 0.36) * step(abs(p.z - 9.5), 0.07) * (crossRoad ? 0.0 : 1.0);
    float edge = step(abs(p.z - 3.85), 0.06) + step(abs(p.z - 15.15), 0.06);
    bool inter = (p.x > 55.0 && p.x < 75.0) || (p.x > 177.0 && p.x < 197.0);
    if (inter) { dash = 0.0; edge = 0.0; }
    float zebra = 0.0;
    if ((p.x > 54.8 && p.x < 57.6) || (p.x > 72.4 && p.x < 75.2)) zebra = step(0.5, fract(p.z / 1.1)) * step(3.8, p.z) * step(p.z, 15.2);
    if (crossRoad && p.z > 16.0 && p.z < 18.6) zebra = step(0.5, fract(p.x / 1.1));
    float stopL = step(abs(p.x - 54.4), 0.25) * step(p.z, 9.5) * step(3.8, p.z) + step(abs(p.x - 75.6), 0.25) * step(9.5, p.z) * step(p.z, 15.2);
    float mark = clamp(dash + edge + zebra + stopL, 0.0, 1.0);
    alb = mix(alb, vec3(0.55, 0.54, 0.5) * (0.6 + 0.4 * vnoise(p.xz * 9.0)), mark * 0.85);
    rough = 0.5 + 0.5 * vnoise(p.xz * 0.45);
  } else {
    vec2 tq = fract(p.xz / 1.2);
    float joint = (step(tq.x, 0.025) + step(tq.y, 0.025)) * detail;
    alb = vec3(0.09, 0.088, 0.085) * (0.85 + 0.3 * hash12(floor(p.xz / 1.2))) * (1.0 - 0.4 * min(joint, 1.0));
    float curb = step(abs(p.z - 3.5), 0.18) + step(abs(p.z - 15.5), 0.18);
    alb = mix(alb, vec3(0.14), min(curb, 1.0) * 0.8);
    rough = 0.75;
  }
  float puddle = smoothstep(0.5, 0.6, fbm(p.xz * 0.22 + 3.0)) * uWet * (road ? 1.0 : 0.6);
  float wet = uWet * 0.6 + puddle * 0.4;
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 E = vec3(0.012, 0.009, 0.007) + streetLight(p + vec3(0.0, 0.03, 0.0), n);
  // shop light spilling onto the far pavement
  if (p.z > 14.0 && p.z < 18.0) {
    float sx = fract(p.x / 6.0);
    E += vec3(0.6, 0.48, 0.34) * 0.35 * smoothstep(13.0, 18.0, p.z) * (0.5 + 0.5 * vnoise(vec2(p.x * 0.3, 1.0)));
  }
  E += vec3(0.5, 0.55, 0.7) * uFlash * 0.3;
  vec3 col = alb * E * (1.0 - 0.45 * wet);
  // reflections: ripples from the rain, streaky roughness
  vec2 rip = vec2(0.0);
  if (t < 45.0 && uRain > 0.01) {
    vec2 g = p.xz * 2.2; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    vec3 h = hash32(id);
    float ph = fract(uTime * (0.6 + 0.8 * h.z) + h.x);
    vec2 dv = f - (h.xy - 0.5) * 0.5;
    float r = length(dv);
    float ring = sin((r - ph * 0.5) * 60.0) * (1.0 - smoothstep(0.0, 0.08, abs(r - ph * 0.5))) * (1.0 - ph);
    rip = dv / max(r, 1e-3) * ring * 0.05 * uRain * step(h.z, uRain);
  }
  vec2 jit = (vec2(vnoise(p.xz * vec2(1.3, 9.0)), vnoise(p.xz * vec2(9.0, 1.3) + 5.0)) - 0.5) * 0.09 * (1.0 - puddle * 0.8) * rough;
  vec3 nr = normalize(vec3(jit.x + rip.x, 1.0, jit.y + rip.y));
  vec3 rr = reflect(rd, nr);
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, nr), 0.0), 5.0);
  vec3 rc = skyCol(rr);
  float tr = FAR; vec3 rn = vec3(0.0); int rid = -1;
  vec3 rird = 1.0 / mix(rr, vec3(1e-6), lessThan(abs(rr), vec3(1e-6)));
  traceCity(p + vec3(0.0, 0.01, 0.0), rr, rird, tr, rn, rid);
  if (rid >= 0) rc = shadeBuilding(p + rr * tr, rr, rn, rid, tr + t, true) * exp(-tr * 0.012);
  col += rc * F * (0.25 + 0.75 * wet) * mix(0.6, 1.0, puddle);
  // rain hitting the street
  if (uRain > 0.01 && t < 30.0) {
    vec2 g = p.xz * 6.0; vec2 id = floor(g);
    vec3 h = hash32(id + floor(uTime * 8.0 + hash12(id) * 8.0));
    float sp = step(h.z, 0.08 * uRain) * (1.0 - smoothstep(0.03, 0.09, length(fract(g) - h.xy)));
    col += sp * E * 0.6;
  }
  return col;
}

vec3 shadeCar(vec3 p, vec3 rd, vec3 n, int i, vec3 lp){
  vec4 a = D(i, 8), c = D(i, 9);
  float bus = step(1.5, a.w), taxi = step(0.5, a.w) * (1.0 - bus);
  float len = mix(4.5, 12.0, bus);
  vec3 paint = mix(c.rgb, vec3(0.75, 0.55, 0.06), taxi);
  vec3 E = vec3(0.01) + streetLight(p + n * 0.05, n);
  bool glass = (bus < 0.5 && lp.y > 1.02 && abs(n.y) < 0.5) || (bus > 0.5 && lp.y > 1.25 && lp.y < 2.6 && abs(n.y) < 0.5);
  vec3 col;
  float F = 0.04 + 0.96 * pow(1.0 - abs(dot(rd, n)), 5.0);
  vec3 env = skyCol(reflect(rd, n)) * 1.6 + E * 0.04;
  if (glass) {
    col = vec3(0.01) * E + env * (0.3 + F);
    if (bus > 0.5) {
      float seat = step(0.5, fract(lp.x * 0.9)) * step(lp.y, 1.8);
      col += vec3(1.0, 0.92, 0.8) * (0.9 - seat * 0.6) * (0.85 + 0.15 * step(0.08, fract(lp.x * 0.42)));
    }
  } else {
    col = paint * E * 0.8 + env * (0.08 + 0.6 * F);
    if (lp.y < 0.55) col *= 0.35;
    if (abs(lp.x) > len * 0.5 - 0.02) {
      float front = sign(lp.x);
      float lamps = step(abs(abs(lp.z) - 0.62), 0.16) * step(abs(lp.y - 0.75), 0.07);
      col += lamps * (front > 0.0 ? vec3(1.0, 0.95, 0.85) * 3.0 : vec3(1.0, 0.03, 0.01) * (1.0 + 2.0 * c.w));
    }
  }
  return col;
}

vec3 shadeFurniture(vec3 p, vec3 rd, vec3 n, float aux){
  vec3 E = vec3(0.012) + streetLight(p + n * 0.1, n) * 0.5;
  vec3 col = vec3(0.04, 0.045, 0.045) * E;
  col += skyCol(reflect(rd, n)) * 0.06;
  if (aux >= 0.0 && fract(aux) > 0.25) {
    int i = int(aux);
    vec4 c = D(i, 3);
    col = c.rgb * 2.2;
  }
  return col;
}

vec3 lampHalo(vec3 ro, vec3 rd, float tMax){
  vec3 acc = vec3(0.0);
  int nl = int(uN.w);
  for (int i = 0; i < 64; i++) {
    if (i >= nl) break;
    vec4 a = D(i, 2), c = D(i, 3);
    vec3 v = vec3(a.x, a.y - 0.15, a.z) - ro;
    float tc = dot(v, rd);
    if (tc < 0.0 || tc > tMax + 1.0) continue;
    float d2 = max(dot(v, v) - tc * tc, 0.0);
    float d = sqrt(d2);
    acc += c.rgb * c.w * (0.0016 / (0.06 + d2) + 0.0009 / (0.4 + d)) * exp(-tc * 0.012);
  }
  return acc;
}

vec3 rainLayers(vec3 ro, vec3 rd, float tMax, vec3 halo){
  vec3 acc = vec3(0.0);
  vec3 R = uCamMat[0], U = uCamMat[1];
  float slant = uWind * 0.35;
  for (int i = 0; i < 6; i++) {
    float d = 2.2 * pow(1.65, float(i));
    if (d > tMax) break;
    vec3 p = ro + rd * d;
    vec2 q = vec2(dot(rd, R), dot(rd, U)) * d;
    q.x += q.y * slant;
    q.y += uTime * 9.0;
    vec2 cell = vec2(0.11 + 0.05 * float(i), 1.3);
    vec2 g = q / cell; vec2 id = floor(g); vec2 f = fract(g);
    vec3 h = hash32(id + float(i) * 17.0);
    if (h.z > uRain * 0.55) continue;
    float px = 0.9 / (uRes.y * 0.5 / uTanHalf.y) * d / cell.x;
    float sx = 1.0 - smoothstep(0.0, px + 0.02, abs(f.x - h.x));
    float sy = smoothstep(h.y * 0.5, h.y * 0.5 + 0.1, f.y) * (1.0 - smoothstep(h.y * 0.5 + 0.35, h.y * 0.5 + 0.55, f.y));
    vec3 L = vec3(0.0025, 0.002, 0.0016) + halo * (1.1 - float(i) * 0.14);
    acc += L * sx * sy * (0.35 + 0.65 * h.y);
  }
  return acc;
}

void main(){
  vec3 ro = uCamPos;
  vec3 rd = camRay(gl_FragCoord.xy);
  vec3 ird = 1.0 / mix(rd, vec3(1e-6), lessThan(abs(rd), vec3(1e-6)));
  float t = FAR; vec3 n = vec3(0.0); int kind = 0; float aux = 0.0;
  if (rd.y < 0.0) { t = -ro.y * ird.y; n = vec3(0.0, 1.0, 0.0); kind = 1; }
  int id = -1;
  float tc = t;
  traceCity(ro, rd, ird, tc, n, id);
  if (id >= 0) { t = tc; kind = 2; }
  else if (kind == 1) n = vec3(0.0, 1.0, 0.0);
  vec3 lp; vec2 pq; vec3 bp;
  tracePoles(ro, rd, ird, t, n, kind, aux);
  traceCars(ro, rd, t, n, kind, aux, lp);
  tracePeople(ro, rd, t, n, kind, aux, pq);
  traceBlades(ro, rd, ird, t, n, kind, aux, bp);
  vec3 p = ro + rd * t;
  vec3 col;
  if (kind == 0) col = skyCol(rd);
  else if (kind == 1) col = shadeGround(p, rd, ird, t);
  else if (kind == 2) col = shadeBuilding(p, rd, n, id, t, false);
  else if (kind == 3) col = shadeFurniture(p, rd, n, aux);
  else if (kind == 4) col = shadeCar(p, rd, n, int(aux), lp);
  else if (kind == 5) {
    int i = int(aux); vec4 a = D(i, 10);
    vec3 E = vec3(0.012) + streetLight(p + vec3(0.0, 0.4, 0.0), vec3(0.0, 1.0, 0.0));
    if (fract(aux) > 0.25) {
      vec3 uc = a.w < 0.5 ? vec3(0.02) : (a.w < 0.7 ? vec3(0.5, 0.06, 0.04) : (a.w < 0.85 ? vec3(0.6, 0.5, 0.08) : vec3(0.6, 0.62, 0.65)));
      col = uc * E * 1.2 + uc * E * 0.4 * smoothstep(1.9, 2.25, pq.y) + skyCol(vec3(0.0, 1.0, 0.0)) * 0.05;
    } else {
      col = vec3(0.025, 0.022, 0.02) * E + vec3(0.0) ;
      col += E * 0.04 * smoothstep(0.4, 1.0, pq.y / 1.7) * step(0.0, pq.x);
    }
  } else if (kind == 6) {
    float y = aux;
    float lit = y > 0.66 ? uSig.x : (y > 0.33 ? uSig.y : uSig.z);
    vec3 lc = y > 0.66 ? vec3(1.0, 0.05, 0.02) : (y > 0.33 ? vec3(1.0, 0.45, 0.02) : vec3(0.1, 1.0, 0.55));
    float lens = 1.0 - smoothstep(0.32, 0.4, abs(fract(y * 3.0) - 0.5));
    col = vec3(0.012) + lc * lens * (0.06 + lit * 5.0) * step(0.0, -n.x);
  } else {
    int i = int(aux); vec4 a = D(i, 6), m = D(i, 7);
    vec3 nc = uNeonPal[int(m.y)];
    float gw = 0.6;
    float k = (bp.y - a.z) / gw;
    vec2 gp = vec2((bp.z - (a.y - m.x)) / m.x, fract(k));
    float dd = glyph(gp, m.z + floor(k));
    float on = step(0.03, hash12(vec2(floor(uTime * 5.0), m.z)));
    col = abs(n.x) > 0.5 ? nc * (0.25 + (1.0 - smoothstep(0.03, 0.08, dd)) * 4.0) * on : vec3(0.02);
  }
  // atmosphere
  float fogD = 0.0018 + uFog * 0.006 + uRain * 0.002;
  vec3 fogC = vec3(0.038, 0.027, 0.02) + vec3(0.4, 0.45, 0.6) * uFlash * 0.15;
  float tf = min(t, 3000.0);
  float hf = exp(-max(p.y, 0.0) * 0.012);
  col = mix(col, fogC, (1.0 - exp(-tf * fogD * mix(0.5, 1.0, hf))));
  vec3 halo = lampHalo(ro, rd, t);
  col += halo * (0.4 + uRain * 0.8 + uFog);
  if (uRain > 0.01) col += rainLayers(ro, rd, t, halo);
  o = vec4(col, min(t, FAR));
}
`;

  function makeCity(seed) {
    const r = W.rng(seed);
    const gaps = [[58, 72], [180, 194]];
    const inGap = (x) => gaps.find((g) => x >= g[0] - 0.01 && x < g[1]);
    const A = [], B = [], T = [];
    const styleA = () => r.pick([0, 0, 0, 1, 1, 2, 2, 3]);
    // row A, facing the street
    let x = -90;
    while (x < 900) {
      const g = inGap(x + 0.5);
      if (g) { x = g[1]; continue; }
      let w = r.range(9, 22);
      const ng = gaps.find((gg) => gg[0] > x && gg[0] < x + w);
      if (ng) w = ng[0] - x;
      if (w < 4) { x += w; continue; }
      const st = styleA();
      const set = r.chance(0.3) ? r.range(0.2, 1.4) : 0;
      const h = st === 3 ? r.range(22, 34) : r.range(10, 23);
      const shop = r.pick([1, 1, 2, 2, 2, 3, 4, 0, 4]);
      A.push([x, 18 + set, x + w, 18 + set + r.range(14, 20), h, r() * 100, st, shop]);
      x += w;
    }
    // row B behind, taller, deep blocks next to the cross streets
    x = -100;
    while (x < 920) {
      const g = inGap(x + 0.5);
      if (g) { x = g[1]; continue; }
      let w = r.range(14, 30);
      const ng = gaps.find((gg) => gg[0] > x && gg[0] < x + w);
      if (ng) w = ng[0] - x;
      if (w < 5) { x += w; continue; }
      const st = r.pick([0, 1, 2, 3, 3]);
      const nearGap = gaps.some((gg) => Math.abs(gg[0] - (x + w)) < 0.1 || Math.abs(gg[1] - x) < 0.1);
      B.push([x, 42 + r.range(0, 4), x + w, nearGap ? 150 : 42 + r.range(22, 36), r.range(16, 52), r() * 100, st, 0]);
      x += w;
    }
    // far towers
    for (let i = 0; i < 16; i++) {
      const tx = r.range(-150, 900), tz = r.range(230, 950), w = r.range(22, 44), d = r.range(22, 44);
      T.push([tx, tz, tx + w, tz + d, r.range(70, 230), r() * 100, 4, 0]);
    }
    // lamps: far pavement (sodium) and near pavement (LED), plus the cross street
    const lamps = [];
    const sodium = W.kelvin(2050), led = W.kelvin(3900);
    for (let lx = -60; lx < 420; lx += 26) {
      if (!inGap(lx)) lamps.push({ x: lx, y: 7.2, z: 14.9, zp: 16.9, c: sodium, i: 1.0 });
      const nx = lx + 13;
      if (!inGap(nx)) lamps.push({ x: nx, y: 7.0, z: 3.0, zp: 1.0, c: led, i: 0.85 });
    }
    for (let lz = 30; lz < 150; lz += 26) {
      lamps.push({ x: 59.0, y: 6.8, z: lz, zp: lz, c: sodium, i: 0.8, cross: true });
      lamps.push({ x: 71.0, y: 6.8, z: lz + 13, zp: lz + 13, c: sodium, i: 0.8, cross: true });
    }
    // distant lamps: sprites only
    const farLamps = [];
    for (let lx = 420; lx < 900; lx += 26) {
      farLamps.push([lx, 7.2, 14.9, sodium]);
      farLamps.push([lx + 13, 7.0, 3.0, led]);
    }
    // neon signs on row A shop fronts
    const signs = [];
    const blades = [];
    A.forEach((b, i) => {
      if (b[0] > 330 || b[7] === 0 || b[7] === 4) return;
      if (r.chance(0.55)) {
        const w = Math.min(b[2] - b[0] - 1.5, r.range(2.5, 6));
        const sx = b[0] + r.range(0.7, b[2] - b[0] - w - 0.7);
        const type = r.chance(0.12) ? 2 : r.chance(0.35) ? 1 : 0;
        const h = type === 2 ? 1.1 : type === 1 ? 0.75 : r.range(0.55, 0.8);
        const y0 = type === 2 ? r.range(4.6, 6.2) : 3.4;
        signs.push([sx, y0, type === 2 ? sx + h : sx + w, y0 + h, b[1] - 0.02, type === 2 ? 3 : r.int(0, 7), r() * 50, type]);
      }
      if (r.chance(0.3) && blades.length < 10) {
        const bx = r.range(b[0] + 0.5, b[2] - 0.5);
        blades.push([bx, b[1], r.range(4.5, 6.5), r.range(8.5, 13), 0.85, r.int(0, 7), r() * 50]);
      }
    });
    return { A, B, T, lamps, farLamps, signs, blades };
  }

  const NEON = ['#ff3b30', '#ff5fa2', '#3ef0d0', '#ffb347', '#7dff6a', '#f2f2ff', '#ff2266', '#59c8ff'].map(W.lin);
  const NEON_PAL = new Float32Array(NEON.flat());
  const WIN = [2400, 2700, 2900, 3200, 3700, 4600].map((k) => W.kelvin(k));
  const WIN_PAL = new Float32Array(WIN.map((c) => c.map((v) => v * 1.1)).flat());

  // cars on paths --------------------------------------------------------------
  function polyPath(pts) {
    const seg = [];
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      seg.push([a, b, L, l]);
      L += l;
    }
    return {
      L,
      at(s) {
        s = W.clamp(s, 0, L - 1e-3);
        let k = 0;
        while (k < seg.length - 1 && seg[k][2] + seg[k][3] < s) k++;
        const [a, b, s0, l] = seg[k], u = (s - s0) / l;
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])];
      },
    };
  }
  function bez(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  const PATHS = {
    near: polyPath([[-160, 7.4], [620, 7.4]]),
    far: polyPath([[620, 11.6], [-160, 11.6]]),
    farTurn: polyPath([[620, 11.6], [73, 11.6], ...bez([73, 11.6], [69, 11.6], [67.5, 13.5], [67.5, 17], 8).slice(1), [67.5, 320]]),
    crossIn: polyPath([[62.5, 320], [62.5, 17.5], ...bez([62.5, 17.5], [62.5, 13.8], [61, 11.6], [57, 11.6], 8).slice(1), [-160, 11.6]]),
  };
  // where cars must stop when their light is red (arc length on the path)
  const STOPS = { near: 160 + 54.2, far: 620 - 75.8, farTurn: 620 - 75.8, crossIn: 320 - 19.5 };

  const scene = {
    id: 'city',
    name: 'City Rain',
    sub: 'sixth floor, a wet avenue, 2 a.m.',
    audio: 'city',
    bokehBg: ['#1a1410', '#120e0b', '#07080a'],
    defaults: { rain: 0.7, wind: 0.3, fog: 0.35, cond: 0.22, frost: 0, lightning: 1, traffic: 0.6 },
    controls: ['rain', 'wind', 'fog', 'cond', 'lightning', 'traffic'],
    look: {
      frame: 'cross', material: 'steel', wall: '#cfc6b8', lamp: 2.4, candle: true, mug: true, plant: true,
      exposure: 0.9, sat: 1.05, contrast: 1.04, lift: [0.012, 0.01, 0.012], gain: [1.0, 0.98, 0.95],
      bloom: 0.05, halo: 1.0, dTyp: 35, reflStretch: 3.5, refl: 1, flowAng: 0,
    },

    init(R) {
      const G = R.G, gl = R.gl;
      this.prog = G.program(W.SH.vert, GLSL, 'city');
      this.city = makeCity(7);
      const c = this.city;
      this.data = new Float32Array(DW * ROWS * 4);
      const put = (x, y, v) => this.data.set(v, (y * DW + x) * 4);
      const blds = [...c.A, ...c.B, ...c.T];
      blds.forEach((b, i) => {
        put(i, 0, [b[0], b[1], b[2], b[3]]);
        put(i, 1, [b[4], b[5], b[6], b[7]]);
      });
      c.lamps.forEach((l, i) => {
        put(i, 2, [l.x, l.y, l.z, l.zp]);
        put(i, 3, [l.c[0], l.c[1], l.c[2], l.i * 20]);
      });
      c.signs.forEach((s, i) => {
        put(i, 4, [s[0], s[1], s[2], s[3]]);
        put(i, 5, [s[4], s[5], s[6], s[7]]);
      });
      c.blades.forEach((b, i) => {
        put(i, 6, [b[0], b[1], b[2], b[3]]);
        put(i, 7, [b[4], b[5], b[6], 0]);
      });
      this.tex = G.dataTexture(DW, ROWS, this.data);
      this.N = [c.A.length, c.B.length, c.T.length, c.lamps.length];
      this.cars = [];
      this.people = [];
      this.signal = { t: 0 };
      this.spawnT = { near: 0, far: 3, crossIn: 6 };
      const r = (this.r = W.rng(99));
      for (let i = 0; i < 8; i++) {
        this.people.push({ x: r.range(-20, 140), z: r.chance(0.5) ? 16.6 + r.range(-0.4, 0.6) : 1.6 + r.range(-0.3, 0.5), dir: r.chance(0.5) ? 1 : -1, v: r.range(1.1, 1.5), ph: r() * 10, umb: r.pick([0.1, 0.4, 0.6, 0.75, 0.9, 0.3, 0.5]) });
      }
      // pre-run the traffic so the street is busy on arrival
      for (let i = 0; i < 900; i++) this.sim(1 / 10, 0.6, i / 10);
      this.cam = { base: [0, 17.2, -0.6], yaw: 0.72, pitch: -0.24, fovY: 58 };
    },

    signalState(t) {
      // main green 24s, yellow 3.5s, red 16s (cross street goes)
      const cyc = 43.5, u = t % cyc;
      if (u < 24) return { main: 'g', cross: 'r', walk: 0 };
      if (u < 27.5) return { main: 'y', cross: 'r', walk: 0 };
      if (u < 40) return { main: 'r', cross: 'g', walk: 1 };
      return { main: 'r', cross: 'y', walk: 0 };
    },

    sim(dt, traffic, t) {
      const r = this.r;
      const sig = this.signalState(t);
      // spawn
      for (const k of ['near', 'far', 'crossIn']) {
        this.spawnT[k] -= dt;
        if (this.spawnT[k] <= 0) {
          const rate = k === 'crossIn' ? 0.06 : 0.16;
          this.spawnT[k] = (1 / (rate * (0.2 + traffic * 1.6))) * r.range(0.4, 1.8);
          let path = k;
          if (k === 'far' && r.chance(0.18)) path = 'farTurn';
          const last = this.cars.filter((c) => c.path === path || (k === 'far' && (c.path === 'far' || c.path === 'farTurn'))).reduce((m, c) => Math.min(m, c.s), 1e9);
          if (last > 14) {
            const type = r.chance(0.07) ? 2 : r.chance(0.15) ? 1 : 0;
            const pal = ['#0c0d0f', '#1b1c1f', '#d8d8d4', '#8c8f93', '#5a0c0c', '#13213a', '#2a2f26', '#6b6e70'];
            this.cars.push({ path, s: 0, v: r.range(9, 12.5), vmax: r.range(9.5, 13), type, col: W.lin(r.pick(pal)), brake: 0, ph: r() * 10 });
          }
        }
      }
      // drive: follow the car ahead on the same lane, stop for red
      const lane = (c) => (c.path === 'farTurn' && c.s < 548 ? 'far' : c.path);
      for (const c of this.cars) {
        const P = PATHS[c.path];
        let gap = 1e9;
        for (const o of this.cars) {
          if (o === c) continue;
          const same = lane(o) === lane(c) || (o.path === c.path);
          if (!same) continue;
          const d = o.s - c.s - (o.type === 2 ? 12 : 4.6);
          if (d > -2 && d < gap) gap = d;
        }
        const stop = STOPS[c.path];
        const light = c.path === 'crossIn' ? sig.cross : sig.main;
        const toStop = stop - c.s;
        if (light !== 'g' && toStop > -0.5 && toStop < 60 && !(light === 'y' && toStop < c.v * 1.2)) gap = Math.min(gap, toStop - 0.5);
        const want = gap < 1e8 ? Math.min(c.vmax, Math.sqrt(2 * 4.5 * Math.max(gap - 2.0, 0))) : c.vmax;
        const prev = c.v;
        c.v = want > c.v ? Math.min(want, c.v + 2.4 * dt) : Math.max(want, c.v - 7 * dt, 0);
        c.brake = c.v < prev - 0.002 || c.v < 0.3 ? 1 : 0;
        c.s += c.v * dt;
      }
      this.cars = this.cars.filter((c) => c.s < PATHS[c.path].L - 1);
      // pedestrians wander along the pavements
      for (const p of this.people) {
        p.x += p.dir * p.v * dt;
        p.ph += dt * p.v * 1.2;
        if (p.x > 160) p.x = -30;
        if (p.x < -30) p.x = 160;
      }
    },

    update(dt, t, env, R) {
      const L = R.lights;
      const c = this.city;
      this.sim(Math.min(dt, 0.1), env.traffic, t + 900 / 10);
      const sig = this.signalState(t + 90);
      this.sig = sig;
      const wetRefl = 0.35 + 0.65 * env.wet;
      // street lamps
      for (const l of c.lamps) {
        const k = l.i * 180;
        L.addRefl(l.x, l.y - 0.22, l.z, 0.22, l.c[0] * k, l.c[1] * k, l.c[2] * k, 1.0, l.cross ? 0 : 0.3 * wetRefl);
      }
      for (const f of c.farLamps) L.addRefl(f[0], f[1] - 0.22, f[2], 0.22, f[3][0] * 180, f[3][1] * 180, f[3][2] * 180, 0.8, 0.25 * wetRefl);
      // signals
      const red = [1, 0.04, 0.01], amber = [1, 0.42, 0.02], green = [0.12, 1, 0.55];
      const sc = sig.main === 'r' ? red : sig.main === 'y' ? amber : green;
      const sy = sig.main === 'r' ? 0.8 : sig.main === 'y' ? 0.5 : 0.2;
      for (const [y0, z] of [[5.1, 9.37], [3.3, 17.12]]) {
        L.addRefl(73.3, y0 + sy * 1.2, z, 0.13, sc[0] * 120, sc[1] * 120, sc[2] * 120, 0.6, 0.35 * wetRefl);
      }
      const walk = sig.walk ? [0.9, 0.95, 1.0] : [1.0, 0.45, 0.08];
      L.add(56.3, 2.7, 16.4, 0.12, walk[0] * 40, walk[1] * 40, walk[2] * 40, 0.3);
      L.add(73.7, 2.7, 16.4, 0.12, walk[0] * 40, walk[1] * 40, walk[2] * 40, 0.3);
      // cars
      const carData = new Float32Array(DW * 2 * 4);
      let n = 0;
      for (const car of this.cars) {
        const [x, z, h] = PATHS[car.path].at(car.s);
        if (n < 40) {
          carData.set([x, z, h, car.type], n * 4);
          carData.set([car.col[0], car.col[1], car.col[2], car.brake], (DW + n) * 4);
          n++;
        }
        const fx = Math.cos(h), fz = Math.sin(h), sx = -fz, sz = fx;
        const len = car.type === 2 ? 12 : 4.5, hw = car.type === 2 ? 1.0 : 0.62;
        const g = wetRefl * 0.55;
        for (const s of [-1, 1]) {
          const hx = x + fx * len * 0.5 + sx * hw * s, hz = z + fz * len * 0.5 + sz * hw * s;
          L.addRefl(hx, 0.72, hz, 0.12, 300, 270, 230, 1.0, g * 0.7);
          const tx = x - fx * len * 0.5 + sx * hw * s, tz = z - fz * len * 0.5 + sz * hw * s;
          const tb = car.brake ? 70 : 22;
          L.addRefl(tx, 0.8, tz, 0.1, tb, tb * 0.03, tb * 0.012, 0.8, g);
        }
        if (car.type === 1) L.add(x - fx * 0.3, 1.62, z - fz * 0.3, 0.14, 40, 30, 8, 0.4);
        if (car.type === 2) for (let k = -2; k <= 2; k++) L.add(x + fx * k * 2.2, 2.0, z + fz * k * 2.2, 0.6, 6, 5.5, 4.5, 0, 3);
      }
      this.carCount = n;
      const pd = new Float32Array(DW * 4);
      this.people.forEach((p, i) => pd.set([p.x, p.z, p.ph, p.umb], i * 4));
      const gl = R.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 8, DW, 2, gl.RGBA, gl.FLOAT, carData);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 10, DW, 1, gl.RGBA, gl.FLOAT, pd);
      // neon and shop glow (bokeh only for the big soft shop windows)
      c.signs.forEach((s, i) => {
        const col = NEON[s[5]];
        const k = s[7] === 1 ? 14 : 30;
        const cx = (s[0] + s[2]) * 0.5, cy = (s[1] + s[3]) * 0.5;
        L.addRefl(cx, cy, s[4] - 0.15, Math.min(0.5, (s[2] - s[0]) * 0.2), col[0] * k, col[1] * k, col[2] * k, 0.5, 0.25 * wetRefl);
        if (s[2] - s[0] > 3) L.add(s[0] + 0.6, cy, s[4] - 0.15, 0.3, col[0] * k * 0.6, col[1] * k * 0.6, col[2] * k * 0.6, 0.3);
      });
      c.blades.forEach((b) => {
        const col = NEON[b[5]];
        for (let y = b[2] + 0.6; y < b[3]; y += 1.8) L.add(b[0] - 0.13, y, b[1] - 0.45, 0.25, col[0] * 22, col[1] * 22, col[2] * 22, 0.4);
      });
      c.A.forEach((b) => {
        if (b[0] > 300 || b[7] === 0 || b[7] === 4) return;
        const col = b[7] === 1 ? [1, 0.97, 0.92] : b[7] === 2 ? [1, 0.62, 0.3] : [0.9, 0.95, 1];
        for (let x = b[0] + 3; x < b[2] - 1; x += 6) L.add(x, 1.8, b[1] - 0.3, 1.1, col[0] * 1.6, col[1] * 1.6, col[2] * 1.6, 0, 3);
      });
      // the skyline: aircraft warning lights and a scatter of far windows
      c.T.forEach((b, i) => {
        const on = Math.sin(t * 2.4 + i) > 0.2 ? 1 : 0.04;
        L.add((b[0] + b[2]) / 2, b[4] + 1, b[1], 0.9, 160 * on, 6 * on, 3 * on, 0.5);
      });
      if (!this.far) {
        const r = W.rng(5);
        this.far = [];
        for (const b of c.T) for (let k = 0; k < 14; k++) this.far.push([r.range(b[0], b[2]), r.range(5, b[4] - 4), b[1] - 0.5, r.pick(WIN)]);
        for (const b of c.B) if (r.chance(0.6)) for (let k = 0; k < 4; k++) this.far.push([r.range(b[0], b[2]), r.range(6, b[4] - 3), b[1] - 0.3, r.pick(WIN)]);
        // row A windows on the facade grid, so discs sit where windows are
        const FH = [3.1, 3.4, 2.95, 3.7], CS = [3.0, 2.6, 3.6, 1.8], SILL = [0.85, 0.75, 0.9, 0.55], WH = [1.65, 2.05, 1.45, 2.6];
        for (const b of c.A) {
          if (b[0] > 260) continue;
          const st = b[6], w = b[2] - b[0], nc = Math.floor(Math.max(w - 1.2, 0) / CS[st]), m = (w - nc * CS[st]) / 2;
          const nf = Math.floor((b[4] - 1.2 - 4.4) / FH[st]);
          for (let fl = 0; fl < nf; fl++) for (let ci = 0; ci < nc; ci++) {
            if (!r.chance(st === 3 ? 0.3 : 0.22)) continue;
            this.far.push([b[0] + m + (ci + 0.5) * CS[st], 4.4 + fl * FH[st] + SILL[st] + WH[st] * 0.5, b[1] - 0.1, r.pick(WIN), 0.75]);
          }
        }
      }
      for (const f of this.far) { const s = f[4] || 0.9, k = f[4] ? 2.6 : 2.2; L.add(f[0], f[1], f[2], s, f[3][0] * k, f[3][1] * k, f[3][2] * k, 0, 3); }
      // pedestrians' umbrellas glint
      this.ped = this.people;
    },

    render(R, t, dt, P) {
      const sig = this.sig || { main: 'g', walk: 0 };
      const p = this.prog.use();
      p.set(R.camUniforms());
      p.set({
        uTime: t, uData: this.tex,
        uN: this.N, uN2: [this.city.signs.length, this.city.blades.length, this.carCount || 0, this.people.length],
        uRain: P.env.rain, uWind: P.env.wind, uFlash: P.env.flash, uFog: P.env.fog, uWet: P.env.wet, uLitBias: 1,
        uSig: [sig.main === 'r' ? 1 : 0, sig.main === 'y' ? 1 : 0, sig.main === 'g' ? 1 : 0, sig.walk],
        uWinPal: WIN_PAL, uNeonPal: NEON_PAL,
      });
      R.G.drawFS();
    },
  };

  W.scenes = W.scenes || [];
  W.scenes.push(scene);
})();

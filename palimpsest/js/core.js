/* Palimpsest / core
   Seeded randomness, simplex noise, a binary heap, contour tracing,
   distance transforms and the small geometric chores everything else leans on. */
'use strict';
(function () {
  const P = (window.P = window.P || {});

  /* ---------- hashing and seeded randomness ---------- */

  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  class Rng {
    constructor(seed) {
      this.seed = String(seed);
      const h = cyrb128(this.seed);
      this.a = h[0]; this.b = h[1]; this.c = h[2]; this.d = h[3];
      for (let i = 0; i < 15; i++) this.u32();
    }
    u32() { // sfc32
      let a = this.a | 0, b = this.b | 0, c = this.c | 0, d = this.d | 0;
      const t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      this.a = a; this.b = b; this.c = c; this.d = d;
      return t >>> 0;
    }
    next() { return this.u32() / 4294967296; }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    weighted(entries) {
      let total = 0;
      for (const e of entries) total += e[1];
      let r = this.next() * total;
      for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
      return entries[entries.length - 1][0];
    }
    normal() {
      let u = 0;
      while (u === 0) u = this.next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.next());
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    fork(label) { return new Rng(this.seed + '§' + label); }
  }

  /* integer hash to [0,1); used for jitter that must not depend on draw order */
  function hash2(x, y, s) {
    let h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + 0x7f4a7c15, 0x9e3779b1) ^ Math.imul(s | 0, 0x85ebca6b);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  /* ---------- simplex noise (after Gustavson) ---------- */

  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  const GRAD = new Float32Array([1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1]);

  class Noise {
    constructor(rng) {
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
      this.perm = new Uint8Array(512);
      this.pm12 = new Uint8Array(512);
      for (let i = 0; i < 512; i++) { this.perm[i] = p[i & 255]; this.pm12[i] = this.perm[i] % 12; }
    }
    n2(xin, yin) {
      const perm = this.perm, pm = this.pm12;
      let n0 = 0, n1 = 0, n2 = 0;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) { const g = pm[ii + perm[jj]] * 2; t0 *= t0; n0 = t0 * t0 * (GRAD[g] * x0 + GRAD[g + 1] * y0); }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) { const g = pm[ii + i1 + perm[jj + j1]] * 2; t1 *= t1; n1 = t1 * t1 * (GRAD[g] * x1 + GRAD[g + 1] * y1); }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) { const g = pm[ii + 1 + perm[jj + 1]] * 2; t2 *= t2; n2 = t2 * t2 * (GRAD[g] * x2 + GRAD[g + 1] * y2); }
      return 70 * (n0 + n1 + n2);
    }
    fbm(x, y, oct, lac, gain) {
      lac = lac || 2; gain = gain || 0.5;
      let a = 1, f = 1, sum = 0, norm = 0;
      for (let o = 0; o < oct; o++) {
        sum += a * this.n2(x * f + o * 17.31, y * f - o * 9.73);
        norm += a; a *= gain; f *= lac;
      }
      return sum / norm;
    }
    ridged(x, y, oct) {
      let a = 1, f = 1, sum = 0, norm = 0, prev = 1;
      for (let o = 0; o < oct; o++) {
        let n = 1 - Math.abs(this.n2(x * f + o * 31.7, y * f + o * 11.3));
        n *= n;
        sum += n * a * prev;
        prev = n;
        norm += a; a *= 0.5; f *= 2.03;
      }
      return sum / norm;
    }
  }

  /* ---------- binary min-heap of (float key, int value) ---------- */

  class Heap {
    constructor(cap) {
      cap = cap || 1024;
      this.k = new Float64Array(cap);
      this.v = new Int32Array(cap);
      this.n = 0;
      this.lastKey = 0;
    }
    push(key, val) {
      if (this.n === this.k.length) {
        const k2 = new Float64Array(this.n * 2), v2 = new Int32Array(this.n * 2);
        k2.set(this.k); v2.set(this.v); this.k = k2; this.v = v2;
      }
      const K = this.k, V = this.v;
      let i = this.n++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (K[p] <= key) break;
        K[i] = K[p]; V[i] = V[p]; i = p;
      }
      K[i] = key; V[i] = val;
    }
    pop() {
      const K = this.k, V = this.v;
      const top = V[0];
      this.lastKey = K[0];
      const n = --this.n;
      if (n > 0) {
        const key = K[n], val = V[n];
        let i = 0;
        for (;;) {
          let c = 2 * i + 1;
          if (c >= n) break;
          if (c + 1 < n && K[c + 1] < K[c]) c++;
          if (K[c] >= key) break;
          K[i] = K[c]; V[i] = V[c]; i = c;
        }
        K[i] = key; V[i] = val;
      }
      return top;
    }
    get size() { return this.n; }
  }

  /* ---------- fields ---------- */

  function blur(field, W, H, r, passes) {
    let a = Float32Array.from(field), b = new Float32Array(W * H);
    for (let p = 0; p < (passes || 1); p++) {
      for (let y = 0; y < H; y++) {
        let acc = 0, cnt = 0;
        const row = y * W;
        for (let x = -r; x <= r; x++) if (x >= 0 && x < W) { acc += a[row + x]; cnt++; }
        for (let x = 0; x < W; x++) {
          b[row + x] = acc / cnt;
          const xo = x - r, xi = x + r + 1;
          if (xo >= 0) { acc -= a[row + xo]; cnt--; }
          if (xi < W) { acc += a[row + xi]; cnt++; }
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0, cnt = 0;
        for (let y = -r; y <= r; y++) if (y >= 0 && y < H) { acc += b[y * W + x]; cnt++; }
        for (let y = 0; y < H; y++) {
          a[y * W + x] = acc / cnt;
          const yo = y - r, yi = y + r + 1;
          if (yo >= 0) { acc -= b[yo * W + x]; cnt--; }
          if (yi < H) { acc += b[yi * W + x]; cnt++; }
        }
      }
    }
    return a;
  }

  /* Felzenszwalb-Huttenlocher squared Euclidean distance transform.
     Returns the distance (in cells) from every cell to the nearest cell where mask is truthy. */
  function edt(mask, W, H) {
    const INF = 1e20, n = Math.max(W, H);
    const grid = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) grid[i] = mask[i] ? 0 : INF;
    const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const pass = (len) => {
      let k = 0;
      v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < len; q++) {
        while (z[k + 1] < q) k++;
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
      }
    };
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) f[y] = grid[y * W + x];
      pass(H);
      for (let y = 0; y < H; y++) grid[y * W + x] = d[y];
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) f[x] = grid[y * W + x];
      pass(W);
      for (let x = 0; x < W; x++) grid[y * W + x] = d[x];
    }
    const out = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) out[i] = Math.sqrt(grid[i]);
    return out;
  }

  /* ---------- contour tracing (marching squares) ----------
     field values sit on integer grid points; returns polylines in the same coordinates.
     The field is padded with `pad` so contours of interior regions close cleanly. */
  function contours(field, W, H, level, pad) {
    const PW = W + 2, PH = H + 2;
    const f = new Float32Array(PW * PH).fill(pad);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[(y + 1) * PW + x + 1] = field[y * W + x];
    const NE = PW * PH * 2;
    const s1 = new Int32Array(NE).fill(-1), s2 = new Int32Array(NE).fill(-1);
    const segA = [], segB = [];
    const hId = (x, y) => (y * PW + x) * 2;
    const vId = (x, y) => (y * PW + x) * 2 + 1;
    const add = (e1, e2) => {
      const s = segA.length;
      segA.push(e1); segB.push(e2);
      if (s1[e1] < 0) s1[e1] = s; else s2[e1] = s;
      if (s1[e2] < 0) s1[e2] = s; else s2[e2] = s;
    };
    for (let y = 0; y < PH - 1; y++) {
      for (let x = 0; x < PW - 1; x++) {
        const a = f[y * PW + x], b = f[y * PW + x + 1], c = f[(y + 1) * PW + x + 1], d = f[(y + 1) * PW + x];
        const cs = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (cs === 0 || cs === 15) continue;
        const T = hId(x, y), B = hId(x, y + 1), L = vId(x, y), R = vId(x + 1, y);
        switch (cs) {
          case 1: case 14: add(L, B); break;
          case 2: case 13: add(B, R); break;
          case 3: case 12: add(L, R); break;
          case 4: case 11: add(T, R); break;
          case 6: case 9: add(T, B); break;
          case 7: case 8: add(L, T); break;
          case 5: {
            const ctr = (a + b + c + d) / 4;
            if (ctr > level) { add(L, T); add(B, R); } else { add(T, R); add(L, B); }
            break;
          }
          case 10: {
            const ctr = (a + b + c + d) / 4;
            if (ctr > level) { add(T, R); add(L, B); } else { add(L, T); add(B, R); }
            break;
          }
        }
      }
    }
    const pt = (e, out) => {
      const cell = e >> 1, x = cell % PW, y = (cell / PW) | 0;
      if ((e & 1) === 0) {
        const v1 = f[y * PW + x], v2 = f[y * PW + x + 1];
        const t = v2 === v1 ? 0.5 : (level - v1) / (v2 - v1);
        out.push(x - 1 + t, y - 1);
      } else {
        const v1 = f[y * PW + x], v2 = f[(y + 1) * PW + x];
        const t = v2 === v1 ? 0.5 : (level - v1) / (v2 - v1);
        out.push(x - 1, y - 1 + t);
      }
    };
    const used = new Uint8Array(segA.length);
    const other = (e, s) => (s1[e] === s ? s2[e] : s1[e]);
    const lines = [];
    for (let s0 = 0; s0 < segA.length; s0++) {
      if (used[s0]) continue;
      used[s0] = 1;
      const fwd = [segA[s0], segB[s0]];
      let closed = false;
      let e = segB[s0], s = s0;
      for (;;) {
        const n = other(e, s);
        if (n < 0 || used[n]) { if (n >= 0 && n === s0) closed = true; break; }
        used[n] = 1;
        const ne = segA[n] === e ? segB[n] : segA[n];
        if (ne === fwd[0]) { closed = true; break; }
        fwd.push(ne); e = ne; s = n;
      }
      if (!closed) {
        const back = [];
        e = segA[s0]; s = s0;
        for (;;) {
          const n = other(e, s);
          if (n < 0 || used[n]) break;
          used[n] = 1;
          const ne = segA[n] === e ? segB[n] : segA[n];
          back.push(ne); e = ne; s = n;
        }
        back.reverse();
        for (let i = 0; i < fwd.length; i++) back.push(fwd[i]);
        fwd.length = 0; for (let i = 0; i < back.length; i++) fwd.push(back[i]);
      }
      const pts = [];
      for (let i = 0; i < fwd.length; i++) pt(fwd[i], pts);
      lines.push({ pts, closed });
    }
    return lines;
  }

  /* ---------- polylines ---------- */

  function chaikin(pts, closed, iters) {
    let p = pts;
    for (let it = 0; it < iters; it++) {
      const n = p.length / 2;
      if (n < 3) return p;
      const q = [];
      if (!closed) q.push(p[0], p[1]);
      const lim = closed ? n : n - 1;
      for (let i = 0; i < lim; i++) {
        const j = (i + 1) % n;
        const x0 = p[i * 2], y0 = p[i * 2 + 1], x1 = p[j * 2], y1 = p[j * 2 + 1];
        q.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
      }
      if (!closed) q.push(p[p.length - 2], p[p.length - 1]);
      p = q;
    }
    return p;
  }

  function polyLength(pts, closed) {
    let L = 0;
    const n = pts.length / 2;
    for (let i = 1; i < n; i++) L += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
    if (closed && n > 1) L += Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]);
    return L;
  }

  function polyArea(pts) {
    let a = 0;
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      a += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1];
    }
    return a / 2;
  }

  /* resample a polyline at a fixed spacing; returns flat array */
  function resample(pts, spacing, closed) {
    const src = closed ? pts.concat([pts[0], pts[1]]) : pts;
    const out = [src[0], src[1]];
    let carry = 0;
    for (let i = 2; i < src.length; i += 2) {
      let x0 = src[i - 2], y0 = src[i - 1];
      const x1 = src[i], y1 = src[i + 1];
      let seg = Math.hypot(x1 - x0, y1 - y0);
      let pos = spacing - carry;
      while (pos <= seg) {
        const t = pos / seg;
        out.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        pos += spacing;
      }
      carry = seg - (pos - spacing);
    }
    if (!closed) out.push(src[src.length - 2], src[src.length - 1]);
    return out;
  }

  /* ---------- small numerics ---------- */

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function quantile(values, q) {
    const a = Float32Array.from(values).sort();
    return a[clamp(Math.floor(q * (a.length - 1)), 0, a.length - 1)];
  }

  P.Rng = Rng;
  P.Noise = Noise;
  P.Heap = Heap;
  P.hash2 = hash2;
  P.cyrb128 = cyrb128;
  P.util = { blur, edt, contours, chaikin, polyLength, polyArea, resample, clamp, lerp, smooth, quantile };

  /* neighbour offsets for 8-connectivity, with step costs */
  P.N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]];
})();

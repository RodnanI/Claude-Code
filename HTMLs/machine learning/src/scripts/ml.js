/* =========================================================
   Small, dependency-free ML toolkit used by the demos.
   ========================================================= */
function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
const sigmoid = z => 1 / (1 + Math.exp(-z));
const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

/* ---------- 2D classification datasets in roughly [-1, 1]^2 ---------- */
const Data = {
  blobs(n = 80, seed = 1, noise = 0.3) {
    const r = rng(seed), out = [], sd = 0.14 + noise * 0.25;
    for (let i = 0; i < n; i++) {
      const c = i % 2, cx = c ? 0.42 : -0.42, cy = c ? 0.3 : -0.3;
      out.push({ x: cx + gauss(r) * sd, y: cy + gauss(r) * sd, c });
    }
    return out;
  },
  circles(n = 120, seed = 2, noise = 0.3) {
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const c = i % 2, a = r() * TAU, rad = c ? r() * 0.38 : 0.62 + r() * 0.3, j = noise * 0.12;
      out.push({ x: Math.cos(a) * rad + gauss(r) * j, y: Math.sin(a) * rad + gauss(r) * j, c });
    }
    return out;
  },
  xor(n = 120, seed = 3, noise = 0.3) {
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      let x = r() * 1.8 - 0.9, y = r() * 1.8 - 0.9;
      x += x > 0 ? 0.06 : -0.06; y += y > 0 ? 0.06 : -0.06;
      const c = x * y > 0 ? 1 : 0, j = noise * 0.12;
      out.push({ x: x + gauss(r) * j, y: y + gauss(r) * j, c });
    }
    return out;
  },
  spiral(n = 160, seed = 4, noise = 0.3) {
    const r = rng(seed), out = [], m = n / 2;
    for (let i = 0; i < n; i++) {
      const c = i % 2, k = Math.floor(i / 2), t = k / m * 1.75 * Math.PI, rad = 0.08 + k / m * 0.82, j = noise * 0.06;
      const a = t + c * Math.PI;
      out.push({ x: Math.cos(a) * rad + gauss(r) * j, y: Math.sin(a) * rad + gauss(r) * j, c });
    }
    return out;
  },
  moons(n = 120, seed = 5, noise = 0.3) {
    const r = rng(seed), out = [], j = 0.04 + noise * 0.12;
    for (let i = 0; i < n; i++) {
      const c = i % 2, t = r() * Math.PI;
      const x = c ? 1 - Math.cos(t) : Math.cos(t), y = c ? 0.5 - Math.sin(t) : Math.sin(t);
      out.push({ x: (x - 0.5) * 0.78 + gauss(r) * j, y: (y - 0.25) * 0.78 + gauss(r) * j, c });
    }
    return out;
  }
};
ML.Data = Data;

/* ---------- Linear algebra ---------- */
function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / (M[r][r] || 1e-12);
  }
  return x;
}
/* Ridge-regularised polynomial fit. Intercept is not penalised. */
function polyfit(xs, ys, deg, lambda = 0) {
  const p = deg + 1, A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
  for (let n = 0; n < xs.length; n++) {
    const pw = [1]; for (let k = 1; k < p; k++) pw.push(pw[k - 1] * xs[n]);
    for (let i = 0; i < p; i++) { b[i] += pw[i] * ys[n]; for (let j = 0; j < p; j++) A[i][j] += pw[i] * pw[j]; }
  }
  for (let i = 0; i < p; i++) A[i][i] += (i ? lambda : 0) + 1e-10;
  return solve(A, b);
}
const polyval = (w, x) => { let s = 0; for (let k = w.length - 1; k >= 0; k--) s = s * x + w[k]; return s; };

/* ---------- Decision trees (CART, Gini) ---------- */
function gini(c1, n) { if (!n) return 0; const p = c1 / n; return 2 * p * (1 - p); }
function buildTree(pts, idx, o, depth = 0) {
  const n = idx.length; let c1 = 0;
  for (const i of idx) c1 += pts[i].c;
  const node = { n, c1, p: n ? c1 / n : 0.5, depth };
  if (depth >= o.maxDepth || n < 2 * o.minLeaf || c1 === 0 || c1 === n) return node;
  const feats = o.rand ? [o.rand() < 0.5 ? 0 : 1] : [0, 1];
  let best = null, bestG = gini(c1, n) - 1e-9;
  for (const f of feats) {
    const key = f ? 'y' : 'x';
    const s = idx.slice().sort((a, b) => pts[a][key] - pts[b][key]);
    let l1 = 0;
    for (let k = 0; k < n - 1; k++) {
      l1 += pts[s[k]].c;
      const nl = k + 1, nr = n - nl;
      if (nl < o.minLeaf || nr < o.minLeaf) continue;
      const v = pts[s[k]][key], v2 = pts[s[k + 1]][key];
      if (v2 - v < 1e-12) continue;
      const g = (nl * gini(l1, nl) + nr * gini(c1 - l1, nr)) / n;
      if (g < bestG) { bestG = g; best = { f, t: (v + v2) / 2, s, k }; }
    }
  }
  if (!best) return node;
  node.f = best.f; node.t = best.t; node.gain = gini(c1, n) - bestG;
  node.l = buildTree(pts, best.s.slice(0, best.k + 1), o, depth + 1);
  node.r = buildTree(pts, best.s.slice(best.k + 1), o, depth + 1);
  return node;
}
function treeProb(node, x, y) {
  while (node.l) node = (node.f ? y : x) <= node.t ? node.l : node.r;
  return node.p;
}
function treeStats(node) {
  if (!node.l) return { leaves: 1, depth: node.depth };
  const a = treeStats(node.l), b = treeStats(node.r);
  return { leaves: a.leaves + b.leaves, depth: Math.max(a.depth, b.depth) };
}
function buildForest(pts, nTrees, o, seed = 7) {
  const r = rng(seed), trees = [];
  for (let t = 0; t < nTrees; t++) {
    const idx = pts.map(() => Math.floor(r() * pts.length));
    trees.push(buildTree(pts, idx, Object.assign({}, o, { rand: r })));
  }
  return trees;
}

/* ---------- Multilayer perceptron with backprop, SGD or Adam ---------- */
class MLP {
  constructor(sizes, act = 'tanh', seed = 1) {
    this.sizes = sizes; this.act = act; this.t = 0;
    const r = rng(seed);
    this.W = []; this.b = []; this.mW = []; this.vW = []; this.mb = []; this.vb = [];
    for (let l = 1; l < sizes.length; l++) {
      const nin = sizes[l - 1], nout = sizes[l], sd = Math.sqrt((act === 'relu' ? 2 : 1) / nin);
      const W = [];
      for (let j = 0; j < nout; j++) { const row = new Float64Array(nin); for (let i = 0; i < nin; i++) row[i] = gauss(r) * sd; W.push(row); }
      this.W.push(W);
      this.b.push(new Float64Array(nout).fill(act === 'relu' ? 0.05 : 0));
      this.mW.push(W.map(row => new Float64Array(row.length))); this.vW.push(W.map(row => new Float64Array(row.length)));
      this.mb.push(new Float64Array(nout)); this.vb.push(new Float64Array(nout));
    }
  }
  f(z) {
    switch (this.act) {
      case 'relu': return z > 0 ? z : 0;
      case 'sigmoid': return 1 / (1 + Math.exp(-z));
      case 'linear': return z;
      default: return Math.tanh(z);
    }
  }
  df(a) {
    switch (this.act) {
      case 'relu': return a > 0 ? 1 : 0;
      case 'sigmoid': return a * (1 - a);
      case 'linear': return 1;
      default: return 1 - a * a;
    }
  }
  forward(x) {
    const A = [x], L = this.W.length;
    for (let l = 0; l < L; l++) {
      const W = this.W[l], b = this.b[l], prev = A[l], out = new Float64Array(W.length);
      for (let j = 0; j < W.length; j++) {
        let z = b[j]; const row = W[j];
        for (let i = 0; i < row.length; i++) z += row[i] * prev[i];
        out[j] = l === L - 1 ? 1 / (1 + Math.exp(-z)) : this.f(z);
      }
      A.push(out);
    }
    return A;
  }
  predict(x) { const A = this.forward(x); return A[A.length - 1][0]; }
  loss(X, Y) {
    let s = 0;
    for (let n = 0; n < X.length; n++) { const p = clamp(this.predict(X[n]), 1e-7, 1 - 1e-7); s -= Y[n] * Math.log(p) + (1 - Y[n]) * Math.log(1 - p); }
    return s / (X.length || 1);
  }
  train(X, Y, o) {
    const L = this.W.length;
    const gW = this.W.map(W => W.map(r => new Float64Array(r.length))), gb = this.b.map(b => new Float64Array(b.length));
    let loss = 0;
    for (let n = 0; n < X.length; n++) {
      const A = this.forward(X[n]), y = Y[n], out = A[L][0];
      loss -= y * Math.log(out + 1e-9) + (1 - y) * Math.log(1 - out + 1e-9);
      let delta = [out - y];
      for (let l = L - 1; l >= 0; l--) {
        const W = this.W[l], prev = A[l];
        for (let j = 0; j < W.length; j++) { gb[l][j] += delta[j]; const g = gW[l][j]; for (let i = 0; i < prev.length; i++) g[i] += delta[j] * prev[i]; }
        if (l > 0) {
          const nd = new Array(prev.length);
          for (let i = 0; i < prev.length; i++) { let s = 0; for (let j = 0; j < W.length; j++) s += W[j][i] * delta[j]; nd[i] = s * this.df(prev[i]); }
          delta = nd;
        }
      }
    }
    const N = X.length || 1, lr = o.lr, l2 = o.l2 || 0, adam = o.opt !== 'sgd';
    this.t++;
    const b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, this.t), c2 = 1 - Math.pow(b2, this.t);
    const upd = (arr, g, m, v, i, reg) => {
      const gi = g / N + reg * arr[i];
      if (!adam) { arr[i] -= lr * gi; return; }
      m[i] = b1 * m[i] + (1 - b1) * gi; v[i] = b2 * v[i] + (1 - b2) * gi * gi;
      arr[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-8);
    };
    for (let l = 0; l < L; l++) for (let j = 0; j < this.W[l].length; j++) {
      const row = this.W[l][j];
      for (let i = 0; i < row.length; i++) upd(row, gW[l][j][i], this.mW[l][j], this.vW[l][j], i, l2);
      upd(this.b[l], gb[l][j], this.mb[l], this.vb[l], j, 0);
    }
    return loss / N;
  }
}
ML.MLP = MLP;

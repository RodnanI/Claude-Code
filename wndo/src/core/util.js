// wndo :: shared helpers (math, rng, color, smooth noise, storage, tiny events)
(() => {
  const W = (window.W = window.W || {});

  W.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  W.lerp = (a, b, t) => a + (b - a) * t;
  W.smoothstep = (a, b, x) => {
    const t = W.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  W.fract = (x) => x - Math.floor(x);

  // mulberry32: small, fast, seedable
  W.rng = (seed) => {
    let s = seed >>> 0;
    const r = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v);
    };
    return r;
  };

  // integer hash -> [0,1)
  W.hash = (n) => {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };

  // smooth 1D value noise, deterministic per seed, range ~[0,1]
  W.noise1 = (seed) => {
    const N = 512, tab = new Float32Array(N), r = W.rng(seed);
    for (let i = 0; i < N; i++) tab[i] = r();
    return (x) => {
      const i = Math.floor(x), f = x - i;
      const a = tab[((i % N) + N) % N], b = tab[(((i + 1) % N) + N) % N];
      const u = f * f * (3 - 2 * f);
      return a + (b - a) * u;
    };
  };

  // sRGB 8-bit hex -> linear rgb array
  W.lin = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return c;
  };

  // blackbody approximation, returns linear rgb normalised so max channel = 1
  W.kelvin = (k) => {
    const t = k / 100;
    let r, g, b;
    if (t <= 66) {
      r = 255;
      g = 99.4708025861 * Math.log(t) - 161.1195681661;
      b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    } else {
      r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
      b = 255;
    }
    const c = [r, g, b].map((v) => {
      v = W.clamp(v, 0, 255) / 255;
      return Math.pow(v, 2.2);
    });
    const m = Math.max(c[0], c[1], c[2]);
    return c.map((v) => v / m);
  };

  W.mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  W.scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

  // vector helpers for the camera
  W.v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
  };

  // localStorage that never throws
  W.store = {
    get(key, def) {
      try {
        const v = localStorage.getItem('wndo:' + key);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem('wndo:' + key, JSON.stringify(val));
      } catch (e) {
        /* private mode or blocked storage */
      }
    },
  };

  // minimal event hub, used to sync visuals and sound (thunder, passing cars, waves...)
  W.bus = {
    h: {},
    on(n, f) {
      (this.h[n] = this.h[n] || []).push(f);
    },
    emit(n, d) {
      (this.h[n] || []).forEach((f) => f(d));
    },
  };

  // critically damped spring toward a target, frame-rate independent
  W.spring = (cur, vel, target, omega, dt) => {
    const x = omega * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = cur - target, tmp = (vel + omega * ch) * dt;
    return [target + (ch + tmp) * e, (vel - omega * tmp) * e];
  };
})();

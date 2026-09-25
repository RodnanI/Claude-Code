// ---------------------------------------------------------------------------
// Terrain renderer. The level's solid tiles are rasterized at pixel level
// with per-theme shaders that know each pixel's depth below the surface and
// distance to side edges, so bricks, slabs, soil layers, moss and glowing
// veins flow across tile borders. Then platforms, spikes and surface
// decoration (grass, flowers) are painted on top.
// ---------------------------------------------------------------------------
const S_STONE = ['#221e1a', '#3b362f', '#57514a', '#746c60', '#8f8676', '#aba08c', '#c9bea6', '#e3d9c2'];
const S_MOSS = ['#39502a', '#4f6b33', '#6c8a40', '#8aa851'];
const S_SOIL = ['#1e1611', '#2d2119', '#3d2d21', '#4d3a2a', '#5f4834'];
const S_GRASS = ['#3e5e2c', '#557a34', '#6f9640', '#8bb04e', '#aacb62'];
const S_BAMBOO = ['#2e4420', '#4a6a2e', '#6b8f3c', '#8fb04a', '#b4cf6a', '#d6e89a'];
const S_COBBLE = ['#2e2922', '#4a443a', '#645d50', '#7a7264', '#8f8676', '#a39a88', '#b8ae98'];
const S_BRICK = ['#2e1c16', '#4a2a1e', '#633526', '#7a4230', '#8e5038', '#a36244'];
const S_BASALT = ['#0c0a0b', '#161214', '#1f1a1c', '#2a2426', '#352d2f', '#443a3a', '#5e4644'];
const S_LAVA = ['#6a1008', '#b0200e', '#e8481a', '#ff8a3a', '#ffd08a'];
const S_WOOD = ['#1e120a', '#3a2414', '#5a3a20', '#7a5230', '#9a6c40', '#b88a58'];
const S_LACQ = ['#2a0806', '#5a1410', '#8a2016', '#b0301e', '#d25236', '#e8805a'];
const S_GOLD = ['#3a2408', '#7a5214', '#b8862a', '#e8bd52', '#fbe89c'];
const S_TEAL = ['#0e1c1c', '#1a3130', '#27463f', '#34594f', '#4a7466', '#6a9483'];
const S_PLASTER = ['#4a4238', '#7a7064', '#a89e8c', '#c8bfae', '#ddd4c2', '#ede6d6'];
const S_IRON = ['#0e0f11', '#1c1e21', '#2a2d31', '#3a3e43', '#50555b', '#6e747a'];

const TERRAIN = {
  peak: {
    steps: 4,
    ground(x, y, d, sl, sr, alt) {
      const edge = Math.min(sl, sr);
      if (alt) {
        // temple wall: cinnabar plaster under a grey tiled coping
        if (d < 4) return edge === 0 ? S_TEAL[0] : d === 0 ? S_TEAL[4] : d === 3 ? S_TEAL[1] : S_TEAL[3 - (x % 4 === 0)];
        if (d < 6) return S_STONE[d === 4 ? 6 : 3];
        const n = hash2(x >> 1, y >> 1, 4);
        const base = n > 0.85 ? '#9c4630' : n < 0.1 ? '#6e2a1c' : '#86382a';
        if (edge === 0) return '#3a120c';
        if (d > 70) return '#4a1a12';
        return edge === 1 ? '#6e2a1c' : base;
      }
      if (edge === 0 && d > 0) return S_STONE[1];
      if (d === 0) return edge <= 1 ? S_STONE[5] : S_STONE[7];
      if (d <= 5) {
        const seam = ((x + 5) % 24) === 0;
        if (d === 5) return S_STONE[2];
        if (seam) return S_STONE[2];
        if ((x + 5) % 24 === 1) return S_STONE[6];
        const sv = hash2(Math.floor((x + 5) / 24), 1, 9);
        let k = d === 1 ? 6 : 5 - (sv > 0.7 ? 1 : 0);
        const n = hash2(x, y, 2);
        if (n > 0.93) k++; else if (n < 0.07) k--;
        if (edge === 1) k--;
        return S_STONE[clamp(k, 1, 7)];
      }
      if (d <= 44) {
        const dd = d - 6, r = Math.floor(dd / 9), ly = dd % 9;
        const bw = 15 + Math.floor(hash2(r, 7, 3) * 12), off = Math.floor(hash2(r, 11, 3) * bw);
        const bx = (x + off) % bw, bi = Math.floor((x + off) / bw);
        if (ly === 8 || bx === 0) return S_STONE[1];
        let k = 4 + (hash2(bi, r, 5) > 0.6 ? 1 : 0) - (hash2(bi, r, 6) > 0.8 ? 1 : 0) - Math.floor(dd / 16);
        if (ly === 0 || bx === 1) k++;
        if (ly === 7 || bx === bw - 1) k--;
        if (edge === 1) k--;
        const n = hash2(x, y, 8);
        if (n > 0.95) k++; else if (n < 0.06) k--;
        if (ly < 3 && fbm(x * 0.08, y * 0.15, 3, 21) > 0.62) return S_MOSS[clamp(ly === 0 ? 3 : 2 - (n > 0.5 ? 1 : 0), 0, 3)];
        if (hash2(bi, r, 12) > 0.9 && Math.abs(bx - (bw >> 1) - Math.round(Math.sin(ly * 1.3) * 2)) < 1) return S_STONE[1];
        return S_STONE[clamp(k, 1, 7)];
      }
      const t = Math.min(1, (d - 44) / 40);
      return hash2(x, y, 3) > 0.9 - t * 0.2 ? S_SOIL[0] : bayer(x, y) < t ? S_SOIL[1] : S_SOIL[2];
    },
    decor(P, x, y, R) {
      const n = hash2(x, y, 31);
      if (n > 0.9) { const h = 1 + (n * 40 | 0) % 3; for (let i = 1; i <= h; i++) P.px(x, y - i, S_MOSS[1 + (i === h ? 1 : 0)]); }
      else if (n < 0.012) { P.px(x, y - 1, S_MOSS[1]); P.px(x, y - 2, '#f3e6e8'); P.px(x - 1, y - 2, '#e8b0b8'); }
    },
    platform(P, x, y, alt, L, Rt) {
      if (alt) { // carved stone walkway on corbels
        for (let i = 0; i < TS; i++) for (let j = 0; j < 7; j++) {
          let k = j === 0 ? 7 : j === 1 ? 6 : j === 6 ? 1 : j === 5 ? 2 : j === 4 ? 3 : 5 - (hash2(x + i, j, 3) > 0.85 ? 1 : 0);
          if ((x + i) % 8 === 0 && j > 1 && j < 5) k = 3;
          if ((L && i === 0) || (Rt && i === TS - 1)) k = 1;
          P.px(x + i, y + j, S_STONE[k]);
        }
        if (((x / TS) | 0) % 2 === 0) for (let j = 7; j < 13; j++) { const w = Math.max(1, 5 - (j - 7)); for (let i = 0; i < w; i++) P.px(x + 6 + i, y + j, S_STONE[i === 0 ? 5 : i === w - 1 ? 1 : 3]); }
        return;
      }
      // cinnabar lacquered beam with gold caps and brackets
      for (let i = 0; i < TS; i++) for (let j = 0; j < 6; j++) {
        let c = S_LACQ[j === 0 ? 5 : j === 1 ? 4 : j === 5 ? 0 : j === 4 ? 1 : 3 - ((x + i + j) % 7 === 0 ? 1 : 0)];
        if ((L && i < 3) || (Rt && i > TS - 4)) c = S_GOLD[j === 0 ? 4 : j === 5 ? 0 : j === 4 ? 1 : 3 - (i % 3 === 1 ? 1 : 0)];
        if ((L && i === 0) || (Rt && i === TS - 1)) c = S_GOLD[0];
        P.px(x + i, y + j, c);
      }
      if (((x / TS) | 0) % 3 === 1) for (let j = 6; j < 10; j++) { P.px(x + 7, y + j, S_WOOD[1]); P.px(x + 8, y + j, S_WOOD[3]); P.px(x + 9, y + j, S_WOOD[1]); }
    },
    spike(P, x, y) { spikeRow(P, x, y, S_IRON, 4); },
  },

  bamboo: {
    ground(x, y, d, sl, sr, alt) {
      const edge = Math.min(sl, sr);
      if (alt) {
        // mossy boulder
        const n = fbm(x * 0.09, y * 0.09, 3, 5);
        if (edge === 0) return S_STONE[0];
        if (d < 3) return S_MOSS[d === 0 ? 3 : 2];
        if (d < 6 && n > 0.45) return S_MOSS[1];
        let k = 3 + (n > 0.55 ? 1 : 0) - (n < 0.4 ? 1 : 0) - (edge === 1 ? 1 : 0);
        if (hash2(x, y, 4) > 0.94) k++;
        return S_STONE[clamp(k, 1, 6)];
      }
      if (edge === 0 && d > 3) return S_SOIL[0];
      if (d === 0) return S_GRASS[4];
      if (d <= 2) return S_GRASS[d === 1 ? 3 : 2 - (hash2(x, y, 3) > 0.7 ? 1 : 0)];
      if (d <= 5) return bayer(x, y) * 3 > d - 2 ? S_GRASS[0] : S_SOIL[3];
      const root = Math.abs(Math.sin(x * 0.21 + fbm(x * 0.04, y * 0.06, 2, 8) * 7 + y * 0.05)) < 0.06 && d < 26;
      if (root) return S_SOIL[4];
      if (hash2(x >> 1, y >> 1, 6) > 0.965) return S_STONE[hash2(x, y, 2) > 0.5 ? 4 : 3];
      const t = Math.min(1, d / 60), n = fbm(x * 0.06, y * 0.08, 3, 9);
      let k = 3 - (n < 0.42 ? 1 : 0) + (n > 0.62 ? 1 : 0) - Math.floor(t * 2 + bayer(x, y) * 0.9) - (edge === 1 ? 1 : 0);
      return S_SOIL[clamp(k, 0, 4)];
    },
    decor(P, x, y) {
      const n = hash2(x, y, 41);
      if (n > 0.55) {
        const h = 2 + Math.floor(hash2(x, y, 42) * 5);
        const lean = hash2(x, y, 43) > 0.5 ? 1 : -1;
        for (let i = 1; i <= h; i++) P.px(x + (i > h - 2 ? lean : 0), y - i, S_GRASS[i === h ? 4 : 2 + (i > h / 2 ? 1 : 0)]);
      } else if (n < 0.006) {
        P.px(x, y - 1, '#e8e0c8'); P.px(x, y - 2, '#d23a26'); P.px(x - 1, y - 2, '#d23a26'); P.px(x + 1, y - 2, '#a02418'); P.px(x, y - 3, '#d23a26');
      } else if (n < 0.02) { P.px(x, y - 1, S_GRASS[2]); P.px(x, y - 2, '#f4f0dc'); }
    },
    platform(P, x, y, alt) {
      const pole = (yy, thick) => {
        for (let i = 0; i < TS; i++) {
          const node = (x + i) % 11 === 0;
          for (let j = 0; j < thick; j++) {
            let k = j === 0 ? 5 : j === thick - 1 ? 1 : 3 + (j === 1 ? 1 : 0);
            if (node) k = Math.max(0, k - 2);
            P.px(x + i, yy + j, S_BAMBOO[k]);
          }
        }
      };
      if (alt) { pole(y, 5); return; }
      pole(y, 3); pole(y + 3, 3);
      for (const bx of [3, 11]) for (let j = 0; j < 6; j++) { P.px(x + bx, y + j, j % 2 ? '#9a8458' : '#c4ad78'); P.px(x + bx + 1, y + j, j % 2 ? '#c4ad78' : '#8a7448'); }
    },
    spike(P, x, y) {
      for (let s = 0; s < 4; s++) {
        const bx = x + s * 4 + 1, h = 8 + (s % 2) * 3;
        for (let j = 0; j < h; j++) {
          const w = j < 3 ? 1 : 2;
          for (let i = 0; i < w; i++) P.px(bx + i, y + TS - h + j, j < 2 ? '#e8e0b0' : S_BAMBOO[i ? 2 : 4]);
        }
      }
    },
  },

  town: {
    ground(x, y, d, sl, sr, alt) {
      const edge = Math.min(sl, sr);
      if (alt) {
        // timber framed plaster house wall
        if (edge === 0) return S_WOOD[0];
        const post = (x % 40) < 3 || edge < 3;
        if (d < 3) return S_WOOD[d === 0 ? 4 : 2];
        if (post) return S_WOOD[(x % 40) === 1 || edge === 1 ? 3 : 2];
        if (d % 36 < 3) return S_WOOD[d % 36 === 0 ? 3 : 1];
        const n = hash2(x, y, 3);
        const k = 4 - (n > 0.92 ? 1 : 0) + (n < 0.04 ? 1 : 0) - (d % 36 < 5 ? 1 : 0);
        // lattice window in the middle of each bay
        const wx = x % 40, wy = d % 36;
        if (wx > 12 && wx < 30 && wy > 9 && wy < 26) {
          if (wx === 13 || wx === 29 || wy === 10 || wy === 25) return S_WOOD[1];
          return ((wx - 13) % 4 === 0 || (wy - 10) % 4 === 0) ? S_WOOD[2] : '#e9c77a';
        }
        return S_PLASTER[k];
      }
      if (edge === 0 && d > 0) return S_COBBLE[0];
      if (d === 0) return S_COBBLE[6];
      if (d <= 7) {
        // cobblestones: jittered cells
        const gx = Math.floor(x / 6), gy = Math.floor(d / 4);
        let best = 99, second = 99, bid = 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const cx = (gx + ox) * 6 + hash2(gx + ox, gy + oy, 1) * 6, cy = (gy + oy) * 4 + hash2(gx + ox, gy + oy, 2) * 4;
          const dd = Math.hypot((x - cx) * 0.8, d - cy);
          if (dd < best) { second = best; best = dd; bid = hash2(gx + ox, gy + oy, 3); } else if (dd < second) second = dd;
        }
        if (second - best < 0.9) return S_COBBLE[1];
        let k = 3 + Math.floor(bid * 3) - (best > 2.4 ? 1 : 0);
        if (d === 1) k++;
        return S_COBBLE[clamp(k, 2, 6)];
      }
      if (d <= 9) return S_COBBLE[d === 8 ? 5 : 2];
      const r = Math.floor((d - 10) / 5), ly = (d - 10) % 5, off = r % 2 ? 5 : 0;
      const bx = (x + off) % 10, bi = Math.floor((x + off) / 10);
      if (ly === 4 || bx === 0) return S_BRICK[0];
      let k = 3 + (hash2(bi, r, 4) > 0.6 ? 1 : 0) - (hash2(bi, r, 5) > 0.8 ? 1 : 0) - Math.floor((d - 10) / 30);
      if (ly === 0) k++;
      if (edge === 1) k--;
      return S_BRICK[clamp(k, 1, 5)];
    },
    decor(P, x, y) { const n = hash2(x, y, 51); if (n > 0.965) { P.px(x, y - 1, S_GRASS[1]); P.px(x + 1, y - 1, S_GRASS[2]); } },
    platform(P, x, y, alt) {
      if (alt) {
        // roof ridge: glazed teal tiles with a round ridge cap
        for (let i = 0; i < TS; i++) {
          for (let j = 0; j < 4; j++) P.px(x + i, y + j, S_TEAL[j === 0 ? 5 : j === 3 ? 0 : 3 + (j === 1 ? 1 : 0)]);
          for (let j = 4; j < 9; j++) { const ridge = (x + i) % 4; P.px(x + i, y + j, S_TEAL[ridge === 0 ? 0 : ridge === 1 ? 4 : 2 - (j > 6 ? 1 : 0)]); }
        }
        return;
      }
      for (let i = 0; i < TS; i++) for (let j = 0; j < 5; j++) {
        const gap = (x + i) % 8 === 0;
        P.px(x + i, y + j, gap ? S_WOOD[0] : S_WOOD[j === 0 ? 5 : j === 4 ? 1 : j === 3 ? 2 : 3 + ((x + i) % 8 === 3 && j === 2 ? -2 : 0)]);
      }
      if (((x / TS) | 0) % 2 === 0) for (let j = 5; j < 12; j++) { P.px(x + 6, y + j, S_WOOD[1]); P.px(x + 7, y + j, S_WOOD[3]); }
    },
    spike(P, x, y) { spikeRow(P, x, y, S_IRON, 4); },
  },

  fort: {
    ground(x, y, d, sl, sr, alt) {
      const edge = Math.min(sl, sr);
      if (alt) {
        if (edge === 0) return S_IRON[0];
        const px = x % 24, py = d % 20;
        if (px === 0 || py === 0) return S_IRON[0];
        if ((px === 3 || px === 21) && (py === 3 || py === 17)) return S_IRON[5];
        const rust = fbm(x * 0.07, y * 0.2, 3, 3) > 0.6 && py > 10;
        if (rust) return hash2(x, y, 3) > 0.5 ? '#5a2a1a' : '#4a2216';
        return S_IRON[py === 1 || px === 1 ? 4 : py === 19 || px === 23 ? 1 : 3 - (hash2(x, y, 7) > 0.9 ? 1 : 0)];
      }
      if (edge === 0 && d > 0) return S_BASALT[0];
      if (d === 0) return S_BASALT[6];
      if (d === 1) return S_BASALT[5];
      const n = fbm(x * 0.05, y * 0.05, 3, 13);
      const vein = Math.abs(n - 0.5) < 0.007 + 0.004 * Math.sin(x * 0.3);
      if (vein && d > 6) return S_LAVA[d < 24 ? 3 : 2 - (hash2(x, y, 2) > 0.5 ? 1 : 0)];
      if (Math.abs(n - 0.5) < 0.016 && d > 6) return bayer(x, y) > 0.5 ? S_LAVA[0] : S_BASALT[2];
      const cr = hash2(Math.floor(x / 9 + n * 3), Math.floor(d / 7 + n * 2), 21);
      let k = 3 + (cr > 0.7 ? 1 : 0) - (cr < 0.25 ? 1 : 0) - Math.floor(d / 40);
      if (Math.floor(x / 9 + n * 3) !== Math.floor((x + 1) / 9 + fbm((x + 1) * 0.05, y * 0.05, 3, 13) * 3)) k = 1;
      if (edge === 1) k--;
      return S_BASALT[clamp(k, 0, 5)];
    },
    decor(P, x, y) { const n = hash2(x, y, 61); if (n > 0.97) { P.px(x, y - 1, S_BASALT[4]); P.px(x + 1, y - 1, S_BASALT[3]); } },
    platform(P, x, y, alt) {
      if (alt) {
        for (let i = 0; i < TS; i++) for (let j = 0; j < 5; j++) P.px(x + i, y + j, (x + i) % 8 === 0 ? S_WOOD[0] : S_WOOD[j === 0 ? 4 : j === 4 ? 0 : 2 + (j === 1 ? 1 : 0)]);
        return;
      }
      for (let i = 0; i < TS; i++) for (let j = 0; j < 5; j++) {
        const hole = j > 0 && j < 4 && (x + i) % 4 !== 0;
        P.px(x + i, y + j, hole ? (j === 1 ? S_IRON[0] : null) : S_IRON[j === 0 ? 5 : j === 4 ? 1 : 3]);
      }
    },
    spike(P, x, y) { spikeRow(P, x, y, S_IRON, 4, true); },
  },
};

function spikeRow(P, x, y, R, n, hot) {
  const w = TS / n;
  for (let s = 0; s < n; s++) {
    const bx = x + s * w, h = 9 + (s % 2) * 2;
    for (let j = 0; j < h; j++) {
      const half = Math.max(0, Math.floor(((j + 1) / h) * (w / 2)));
      for (let i = -half; i <= half; i++) {
        let c = R[i < 0 ? 4 : i === 0 ? 3 : 2];
        if (j < 3 && hot) c = j === 0 ? '#ffd08a' : '#e8481a';
        else if (j === 0) c = R[5];
        P.px(bx + w / 2 + i, y + TS - h + j, c);
      }
    }
    P.px(bx + w / 2, y + TS - 1, R[0]);
  }
}

const Terrain = {
  build(map, theme) {
    const TH = TERRAIN[theme];
    const W = map.pw, H = map.ph;
    const mask = new Uint8Array(W * H);
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
      const t = map.get(tx, ty), v = map.var(tx, ty);
      if (t === T_SOLID) {
        for (let ly = 0; ly < TS; ly++) mask.fill(1 + v, (ty * TS + ly) * W + tx * TS, (ty * TS + ly) * W + tx * TS + TS);
      } else if (t === T_SLR || t === T_SLL) {
        for (let ly = 0; ly < TS; ly++) for (let lx = 0; lx < TS; lx++) {
          let top;
          if (TH.steps) { const st = TH.steps, sx = t === T_SLR ? lx : TS - 1 - lx; top = TS - Math.floor(sx / st) * st - st / 2; }
          else top = t === T_SLR ? TS - lx - 0.5 : lx + 0.5;
          if (ly + 0.5 >= top) mask[(ty * TS + ly) * W + tx * TS + lx] = 1;
        }
      }
    }
    const dep = new Uint16Array(W * H);
    for (let x = 0; x < W; x++) {
      let d = 0;
      for (let y = 0; y < H; y++) { const i = y * W + x; if (mask[i]) { d = y > 0 && mask[i - W] ? d + 1 : 0; dep[i] = d; } }
    }
    const sl = new Uint8Array(W * H), sr = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      let d = 0;
      for (let x = 0; x < W; x++) { const i = y * W + x; if (mask[i]) { d = x > 0 && mask[i - 1] ? Math.min(d + 1, 40) : 0; sl[i] = d; } }
      d = 0;
      for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (mask[i]) { d = x < W - 1 && mask[i + 1] ? Math.min(d + 1, 40) : 0; sr[i] = d; } }
    }
    const P = new Paint(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const c = TH.ground(x, y, dep[i], sl[i], sr[i], mask[i] === 2);
      if (c) P.u[i] = col(c);
    }
    // surface decoration
    for (let y = 1; y < H; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (mask[i] === 1 && dep[i] === 0 && !mask[i - W] && TH.decor) TH.decor(P, x, y);
    }
    // platforms and spikes
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
      const t = map.get(tx, ty);
      if (t === T_ONEWAY) TH.platform(P, tx * TS, ty * TS, map.var(tx, ty), map.get(tx - 1, ty) !== T_ONEWAY, map.get(tx + 1, ty) !== T_ONEWAY);
      else if (t === T_SPIKE) TH.spike(P, tx * TS, ty * TS);
    }
    return P.done();
  },
};

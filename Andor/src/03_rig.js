// ANDOR :: humanoid rig. Heads and torsos are hand-pixeled per character;
// arms, legs and weapons are rigged segments rasterised once per pose and
// cached, so every character animates with one consistent anatomy.

// Shared limb raster: thick segments, outlined only onto empty pixels.
class Limb {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  put(x, y, col) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = col;
  }
  seg(x0, y0, x1, y1, w, col) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3) + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const ox = Math.round(x - (w - 1) / 2), oy = Math.round(y - (w - 1) / 2);
      for (let yy = 0; yy < w; yy++) for (let xx = 0; xx < w; xx++) this.put(ox + xx, oy + yy, col);
    }
  }
  compose(pb, outline) {
    const oc = C(outline);
    const { w, h, d } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = d[y * w + x];
        if (v) {
          pb.set(x, y, C(v));
          continue;
        }
        const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[yy * w + xx];
        if ((n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) && (pb.get(x, y) >>> 24) === 0) pb.set(x, y, oc);
      }
  }
}
function _stampRows(pb, rows, ox, oy, pal) {
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.') continue;
      const col = pal[ch];
      if (col) pb.set(ox + x, oy + y, C(col));
    }
  }
}
function _ik(hx, hy, fx, fy, l1, l2) {
  let dx = fx - hx, dy = fy - hy;
  let d = Math.hypot(dx, dy);
  const m = l1 + l2 - 0.001;
  if (d > m) {
    dx *= m / d;
    dy *= m / d;
    d = m;
  }
  d = Math.max(d, 0.6);
  const a = Math.atan2(dy, dx);
  const ang = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ka = a - ang; // knee bends toward +x (the facing side)
  return [hx + Math.cos(ka) * l1, hy + Math.sin(ka) * l1, hx + dx, hy + dy];
}

// ---------------------------------------------------------------------------
// Skins
const HP = {
  k: '#1c120d', t: '#f4ead2', T: '#cdb894', u: '#8f7656', s: '#e0a473', S: '#a8643c', h: '#2d1c13',
  c: '#e9dcc0', C: '#a8977a', v: '#7a3a1e', V: '#4f2414', r: '#c0392b', R: '#7e1b23', g: '#f4cf62',
  p: '#3d5b53', P: '#243832', b: '#6b4024', B: '#3d2416', a: '#9a6a3a', l: '#5a2e18', j: '#3fb5a3', e: '#fff8ea',
};
const SKINS = {
  hero: {
    w: 24, h: 26, pal: HP,
    head: ['...kkkk....', '..kttttk...', '.kttttTTk..', 'kTtttTTjTk.', 'kuTTTTTTuk.', '.khhsssssk.', '.khhsskssk.', '.kShssssssk', '.kShhhssk..', '..khhhhhk..'],
    hurt: ['...kkkk....', '..kttttk...', '.kttttTTk..', 'kTtttTTjTk.', 'kuTTTTTTuk.', '.khhsssssk.', '.khhssksk..', '.kShssssssk', '.kShhkkhk..', '..khhhhhk..'],
    torso: ['.kVvccck.', 'kVvvcccvk', 'kVvvcCcvk', 'kVvvcCvvk', 'kRrrrrgRk', '.kppppPk.'],
    extra: { rows: ['kaak', 'kaal', 'kllk', '.kk.'], dx: -3, dy: 3 },
    L: { sl: 'c', slF: 'C', hd: 's', hdF: 'S', tr: 'p', trF: 'P', bt: 'b', btF: 'B', out: 'k' },
  },
  guard: {
    w: 36, h: 28,
    pal: { k: '#1a1210', g: '#c4c4cc', G: '#74747e', y: '#dea12a', m: '#55555f', h: '#2d1c13', s: '#c98a5e', S: '#8f5636', r: '#c0392b', R: '#8a2622', Y: '#f4cf62', p: '#2e2a2e', P: '#1c1a1e', b: '#5a3a22', B: '#33200f', c: '#b0332b', C: '#7e221e' },
    head: ['....kk.....', '...kggk....', '..kgggGk...', '.kgggGGGk..', 'kyyyyyyyyk.', 'kmmhsssssk.', 'kmmhsskssk.', 'kmmSssssssk', '.kmmhhhhk..', '..kkkkkk...'],
    torso: ['.kRrrrrk.', 'kRrrrYrrk', 'kRrrrYrrk', 'kRrrrYrrk', 'kyyyyyyyk', '.kppppPk.'],
    L: { sl: 'c', slF: 'C', hd: 's', hdF: 'S', tr: 'p', trF: 'P', bt: 'b', btF: 'B', out: 'k' },
    weapon: 'scimitar',
  },
  archer: {
    w: 36, h: 28,
    pal: { k: '#1a1210', t: '#2f8a80', T: '#1b5157', h: '#2d1c13', s: '#d09060', S: '#8f5636', o: '#c9a052', O: '#8a6a30', y: '#dea12a', p: '#3a2a20', P: '#241a14', b: '#5a3a22', B: '#33200f', c: '#c9a052', C: '#8a6a30', q: '#6b4024', f: '#f2e6c8' },
    head: ['...kkkk....', '..kttttk...', '.kttttTTk..', 'kTtttTTTTk.', 'kTTTTTTTTk.', '.khhsssssk.', '.khhsskssk.', '.kShssssssk', '.kShhhssk..', '..khhhhhk..'],
    torso: ['.kOoook..', 'kOooyoook', 'kOooyoook', 'kOooyoook', 'kyyyyyyyk', '.kppppPk.'],
    extra: { rows: ['.ff.', 'kffk', 'kqqk', 'kqqk', 'kqqk', '.kk.'], dx: -2, dy: -2 },
    L: { sl: 'c', slF: 'C', hd: 's', hdF: 'S', tr: 'p', trF: 'P', bt: 'b', btF: 'B', out: 'k' },
    weapon: 'bow',
  },
  bandit: {
    w: 36, h: 28,
    pal: { k: '#140f0e', d: '#34303f', D: '#211e29', s: '#b07240', S: '#7a4628', o: '#6a5640', O: '#47382a', l: '#8b5a34', p: '#47382a', P: '#2e241b', b: '#2e1e12', B: '#1c120a', c: '#6a5640', C: '#47382a', e: '#f2e6c8' },
    head: ['...kkkk....', '..kddddk...', '.kdddDDdk..', 'kdddDDDddk.', 'kDdDDDDDDk.', '.kDDsssskk.', '.kDDsskssk.', '.kDDDDDDDDk', '.kDDDDDDk..', '..kkkkkk...'],
    torso: ['.kOoook..', 'kOooooOok', 'kOoooOOok', 'kOooooOok', 'klllllllk', '.kOoooOk.'],
    L: { sl: 'c', slF: 'C', hd: 's', hdF: 'S', tr: 'p', trF: 'P', bt: 'b', btF: 'B', out: 'k' },
    weapon: 'dagger',
  },
  captain: {
    w: 40, h: 30, headDy: -1,
    pal: { k: '#140d0a', r: '#d9482f', R: '#8a2622', g: '#d8d8de', G: '#86868f', y: '#dea12a', Y: '#fff1b3', m: '#4a4a54', h: '#1c120d', s: '#c98a5e', S: '#8f5636', t: '#2f8a80', T: '#1b5157', p: '#7e1b23', P: '#4f1015', b: '#3a2416', B: '#22140c', c: '#2f8a80', C: '#1b5157' },
    head: ['.rr........', 'rRrk.......', '.rkgk......', '..kgggk....', '.kgggGGk...', 'kyyyyyyyyk.', 'kmmhsssssk.', 'kmmhsskssk.', 'kmmSssssssk', '.kmmhhhhk..', '..kkkkkk...'],
    torso: ['.kTtttTk.', 'kTtYtYtTk', 'kTtYtYtTk', 'kTtYtYtTk', 'kyyyYyyyk', '.kpppPPk.'],
    L: { sl: 'c', slF: 'C', hd: 's', hdF: 'S', tr: 'p', trF: 'P', bt: 'b', btF: 'B', out: 'k' },
    weapon: 'bigsword',
    shield: true,
  },
  mummy: {
    w: 32, h: 28,
    pal: { k: '#1c140e', w: '#d8cdb0', W: '#a89c80', x: '#6e6450', r: '#ff8a2a', y: '#dea12a' },
    head: ['...kkkk....', '..kwWwwk...', '.kwwWwwWk..', 'kwWwwwWwwk.', 'kwwWWwwwWk.', '.kWwwxxxwk.', '.kwwwxrxwk.', '.kwWwwwwwwk', '.kwwWWwk...', '..kkWwwk...'],
    torso: ['.kwWwwk..', 'kwwWwwWwk', 'kWwwWwwwk', 'kwWwwWwWk', 'kxWxWxWxk', '.kwWwWwk.'],
    L: { sl: 'w', slF: 'W', hd: 'W', hdF: 'x', tr: 'w', trF: 'W', bt: 'W', btF: 'x', out: 'k' },
  },
  jackal: {
    w: 40, h: 30, headDy: 0,
    pal: { k: '#0e0a0a', n: '#2a2428', N: '#4a4048', e: '#ff9a2a', y: '#dea12a', Y: '#fff1b3', w: '#e8dcc0', W: '#b8aa88', s: '#4a3028', S: '#33201a' },
    head: ['..kk........', '.kNk........', '.kNnk.......', '.knnnkk.....', 'knnnnnnkk...', 'knnnnnenk...', 'knnnnnnnnkk.', '.knnnnnnnnnk', '.knnnnkkkkk.', '..kyYyyk....'],
    torso: ['.kyYyyk..', 'kNnnnnnnk', 'kNnnYnnnk', 'kNnnnnnnk', 'kyYyYyYyk', '.kwwwwWk.'],
    L: { sl: 'n', slF: 'n', hd: 's', hdF: 'S', tr: 'n', trF: 'n', bt: 'y', btF: 'y', out: 'k' },
    weapon: 'spear',
  },
  merchant: {
    w: 30, h: 28,
    pal: { k: '#1c120d', t: '#f4ead2', T: '#c0392b', s: '#c98a5e', S: '#8f5636', h: '#ece4d4', r: '#7e1b23', R: '#4f1015', y: '#dea12a', b: '#5a3a22', B: '#33200f', e: '#1c120d' },
    head: ['..kkkkkk...', '.kttTTttk..', 'kTttttTTtk.', 'kttTTttTTk.', '.kkkkkkkk..', '.kSssskssk.', '.kSsssssssk', '.khhhhhhhk.', '..khhhhhhk.', '...khhhhk..'],
    torso: ['.kRrrrrk.', 'kRrryrrrk', 'kRrryrrrk', 'kRrryrrrk', 'kyyyyyyyk', '.kRrrrRk.'],
    L: { sl: 'r', slF: 'R', hd: 's', hdF: 'S', tr: 'r', trF: 'R', bt: 'b', btF: 'B', out: 'k' },
  },
  sentinel: {
    w: 36, h: 30,
    pal: { k: '#0d0a08', a: '#a86d16', A: '#6e3f10', g: '#dea12a', G: '#f4cf62', e: '#79f0a5', E: '#25b56a', d: '#3a2a10' },
    head: ['...kkkk....', '..kgGGgk...', '.kgGGggAk..', 'kgGgggAAAk.', 'kAAAAAAAAk.', 'kkeEeEeEkk.', '.kAAAAAAAk.', '.kaaaaaaak.', '.kAAaAaAk..', '..kkkkkk...'],
    torso: ['.kgGgggk.', 'kgGggAAak', 'kgGgEgAak', 'kaggAgAak', 'kAAAAAAAk', '.kAaaaAk.'],
    L: { sl: 'a', slF: 'A', hd: 'g', hdF: 'A', tr: 'a', trF: 'A', bt: 'A', btF: 'd', out: 'k' },
    weapon: 'cannon',
  },
};

// ---------------------------------------------------------------------------
function rigCanvas(skin, p) {
  const W = skin.w, H = skin.h, pal = skin.pal, L = skin.L;
  const pb = new PixBuf(W, H);
  const bx = (W >> 1) - 4 + (p.dx || 0), by = H - 14 + (p.dy || 0);
  const shN = [bx + 5, by + 1], shF = [bx + 3, by + 1];
  const hipN = [bx + 5, by + 5], hipF = [bx + 3, by + 5];
  const col = (k) => pal[k];
  const arm = (sx, sy, ang, far) => {
    const lb = new Limb(W, H);
    const ex = sx + Math.sin(ang[0]) * 3, ey = sy + Math.cos(ang[0]) * 3;
    const hx = ex + Math.sin(ang[1]) * 3, hy = ey + Math.cos(ang[1]) * 3;
    lb.seg(sx, sy, ex, ey, 2, col(far ? L.slF : L.sl));
    lb.seg(ex, ey, hx, hy, 2, col(far ? L.slF : L.sl));
    lb.seg(hx, hy, hx + Math.sin(ang[1]), hy + Math.cos(ang[1]), 2, col(far ? L.hdF : L.hd));
    lb.compose(pb, col(L.out));
    return [Math.round(hx + Math.sin(ang[1])), Math.round(hy + Math.cos(ang[1])), ang[1]];
  };
  const leg = (hx, hy, foot, far) => {
    const lb = new Limb(W, H);
    const [kx, ky, ax, ay] = _ik(hx, hy, hx + foot[0], hy + foot[1], 4, 3.2);
    const tr = col(far ? L.trF : L.tr), bt = col(far ? L.btF : L.bt);
    lb.seg(hx, hy, kx, ky, 3, tr);
    const mx = lerp(kx, ax, 0.35), my = lerp(ky, ay, 0.35);
    lb.seg(kx, ky, mx, my, 2, tr);
    lb.seg(mx, my, ax, ay, 2, bt);
    let sx = ax - kx, sy = ay - ky;
    const sl = Math.hypot(sx, sy) || 1;
    sx /= sl;
    sy /= sl;
    let fx = sy, fy = -sx;
    if (fx < 0.2) {
      fx = 0.2;
      fy = 0.98;
    }
    lb.seg(ax, ay, ax + fx * 2.2, ay + fy * 2.2, 2, bt);
    lb.compose(pb, col(L.out));
  };
  const handF = arm(shF[0], shF[1], p.armF, true);
  if (skin.shield) drawShield(pb, handF[0], handF[1]);
  leg(hipF[0], hipF[1], p.legF, true);
  leg(hipN[0], hipN[1], p.legN, false);
  _stampRows(pb, skin.torso, bx, by, pal);
  if (skin.extra) _stampRows(pb, skin.extra.rows, bx + skin.extra.dx, by + skin.extra.dy, pal);
  const raised = Math.abs(p.armN[0]) > 2.1 && !p.armFront;
  let hand = raised ? arm(shN[0], shN[1], p.armN, false) : null;
  const head = p.hurt && skin.hurt ? skin.hurt : skin.head;
  _stampRows(pb, head, bx - 1 + (p.hx || 0), by - 10 + (p.hy || 0) + (skin.headDy || 0), pal);
  if (!raised) hand = arm(shN[0], shN[1], p.armN, false);
  if (skin.weapon && p.weapon !== false) drawWeapon(pb, skin.weapon, hand[0], hand[1], hand[2] + (p.wa || 0), p);
  return { c: pb.toCanvas(), hand: [hand[0], hand[1]], head: [bx - 1 + (p.hx || 0), by - 7 + (p.hy || 0)] };
}

function drawWeapon(pb, type, hx, hy, ang, p) {
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const px = Math.cos(ang), py = -Math.sin(ang); // perpendicular, toward the back of the blade
  const steel = C('#e6e2d6'), steelD = C('#8e8e98'), gold = C('#dea12a'), wood = C('#6b4024'), out = C('#1a1210');
  if (type === 'scimitar' || type === 'bigsword' || type === 'dagger') {
    const L = type === 'bigsword' ? 12 : type === 'dagger' ? 5 : 9;
    // guard
    for (let k = -1; k <= 1; k++) pb.set(hx + px * k, hy + py * k, gold);
    for (let i = 1; i <= L; i++) {
      const t = i / L;
      const curve = t * t * (type === 'dagger' ? 0.5 : 2.6);
      const x = hx + dx * i + px * curve, y = hy + dy * i + py * curve;
      pb.set(x, y, steel);
      if (i < L - 1) pb.set(x - px, y - py, steelD);
    }
  } else if (type === 'spear') {
    for (let i = -5; i <= 13; i++) {
      const x = hx + dx * i, y = hy + dy * i;
      pb.set(x, y, i > 10 ? gold : wood);
    }
    pb.set(hx + dx * 11 + px, hy + dy * 11 + py, gold);
    pb.set(hx + dx * 11 - px, hy + dy * 11 - py, gold);
  } else if (type === 'bow') {
    // bow held perpendicular to the forearm
    const draw = p.draw || 0;
    for (let i = -7; i <= 7; i++) {
      const t = i / 7;
      const bend = (1 - t * t) * 2.5;
      pb.set(hx + px * i + dx * bend, hy + py * i + dy * bend, wood);
    }
    const sx = hx - dx * draw, sy = hy - dy * draw;
    const tips = [[hx + px * 7, hy + py * 7], [hx - px * 7, hy - py * 7]];
    for (const [tx, ty] of tips) {
      const n = 8;
      for (let i = 0; i <= n; i++) pb.set(lerp(tx, sx, i / n), lerp(ty, sy, i / n), C('#e9dcc0'));
    }
    if (draw > 0) for (let i = 0; i < 9; i++) pb.set(sx + dx * i, sy + dy * i, i > 6 ? steel : C('#a8703f'));
  } else if (type === 'cannon') {
    for (let i = 0; i < 6; i++) {
      pb.set(hx + dx * i, hy + dy * i, C('#a86d16'));
      pb.set(hx + dx * i + px, hy + dy * i + py, C('#6e3f10'));
      pb.set(hx + dx * i - px, hy + dy * i - py, C('#dea12a'));
    }
    pb.set(hx + dx * 6, hy + dy * 6, C('#79f0a5'));
  }
  void out;
}
function drawShield(pb, x, y) {
  const r = 5;
  for (let yy = -r; yy <= r; yy++)
    for (let xx = -r; xx <= r; xx++) {
      const d = Math.hypot(xx, yy);
      if (d > r + 0.3) continue;
      let c = d > r - 1 ? '#dea12a' : d > r - 2.2 ? '#1b5157' : '#2f8a80';
      if (d < 1.3) c = '#fff1b3';
      if (d > r - 0.4) c = '#140d0a';
      pb.set(x + xx - 2, y + yy - 1, C(c));
    }
}

// ---------------------------------------------------------------------------
// Pose library. Feet are IK targets relative to the hip; arm angles are
// measured from straight down, positive toward the facing side.
const POSES = {};
(function definePoses() {
  const base = { dx: 0, dy: 0, armN: [0.15, 0.3], armF: [-0.15, -0.05], legN: [0.6, 7], legF: [-1, 7] };
  const P = (o) => Object.assign({}, base, o);
  POSES.idle0 = P({});
  POSES.idle1 = P({ dy: 1, legN: [0.8, 6], legF: [-1.2, 6], armN: [0.2, 0.35] });
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * TAU;
    const s = Math.sin(th), c = Math.cos(th);
    const dy = Math.abs(s) > 0.7 ? -1 : Math.abs(c) > 0.9 ? 1 : 0;
    const foot = (ph) => [-3.6 * Math.cos(ph) + 0.4, 7 - dy - Math.max(0, 3.2 * Math.sin(ph))];
    POSES['run' + i] = P({ dy, hx: 1, legN: foot(th), legF: foot(th + Math.PI), armN: [1.0 * c + 0.1, 1.0 * c + 0.9], armF: [-1.0 * c + 0.1, -1.0 * c + 0.9] });
    // a slower stride for walkers
    const wfoot = (ph) => [-2.6 * Math.cos(ph) + 0.4, 7 - Math.max(0, 1.6 * Math.sin(ph))];
    POSES['walk' + i] = P({ dy: Math.abs(s) > 0.7 ? -1 : 0, legN: wfoot(th), legF: wfoot(th + Math.PI), armN: [0.5 * c + 0.15, 0.5 * c + 0.45], armF: [-0.5 * c, -0.5 * c + 0.3] });
    // shambling mummy: arms forward, dragging feet
    POSES['shamble' + i] = P({ dy: Math.abs(s) > 0.7 ? 0 : 1, hx: 1, legN: wfoot(th), legF: wfoot(th + Math.PI), armN: [1.45 + s * 0.1, 1.55], armF: [1.3 - s * 0.1, 1.45], armFront: true });
  }
  POSES.jump = P({ dy: -1, legN: [2.4, 4.2], legF: [-1.6, 6.6], armN: [2.5, 2.9], armF: [-0.8, -0.4] });
  POSES.fall = P({ legN: [1.8, 6.2], legF: [-2.2, 5.6], armN: [2.0, 2.5], armF: [-1.6, -1.1] });
  POSES.land = P({ dy: 3, legN: [2.4, 4], legF: [-2.4, 4], armN: [0.7, 1.1], armF: [-0.5, -0.1] });
  POSES.wall = P({ hx: 1, armN: [2.4, 2.9], armF: [1.4, 1.8], legN: [3, 3.6], legF: [-0.4, 7] });
  POSES.hang = P({ legN: [0.4, 7.4], legF: [-0.6, 7.2], armN: [3.0, 3.12], armF: [2.85, 3.0] });
  POSES.climb0 = P({ dy: -2, legN: [2.8, 3.6], legF: [-0.8, 6.4], armN: [2.4, 1.6], armF: [2.2, 1.4] });
  POSES.climb1 = P({ dy: -1, hx: 1, legN: [3.2, 3], legF: [-1.5, 5.5], armN: [1.4, 0.4], armF: [1.2, 0.3] });
  POSES.swingF = P({ legN: [3, 6], legF: [2, 6.6], armN: [3.05, 3.12], armF: [2.9, 3.0] });
  POSES.swingB = P({ legN: [-1.2, 6.8], legF: [-2.4, 6.2], armN: [3.05, 3.12], armF: [2.9, 3.0] });
  POSES.swingM = P({ legN: [0.8, 7], legF: [-0.6, 7], armN: [3.05, 3.12], armF: [2.9, 3.0] });
  POSES.hurt = P({ hurt: true, hx: -1, legN: [2, 6], legF: [-2.4, 6.4], armN: [2.3, 2.7], armF: [-2.2, -2.6] });
  POSES.crouch = P({ dy: 4, legN: [2.4, 3], legF: [-2.4, 3], armN: [0.9, 1.4], armF: [-0.4, 0] });
  // enemy attacks
  POSES.windup = P({ dy: 1, hx: -1, legN: [2.2, 6], legF: [-2.4, 6], armN: [-2.5, -2.9], armF: [0.6, 0.9] });
  POSES.slash = P({ hx: 1, legN: [3.4, 6.2], legF: [-2.6, 6.4], armN: [1.5, 1.7], armF: [-0.8, -0.4] });
  POSES.slash2 = P({ hx: 1, legN: [3.4, 6.2], legF: [-2.6, 6.4], armN: [0.8, 0.5], armF: [-0.8, -0.4] });
  POSES.guard = P({ dy: 1, legN: [2, 6], legF: [-2.2, 6], armN: [0.6, 0.2], armF: [1.4, 1.6] });
  POSES.thrust0 = P({ hx: -1, legN: [1.6, 6.6], legF: [-2.6, 6.2], armN: [1.2, 1.3], armF: [1.0, 1.2], wa: 0.35 });
  POSES.thrust1 = P({ hx: 1, dx: 2, legN: [4, 6], legF: [-3, 6.4], armN: [1.55, 1.57], armF: [1.3, 1.5], wa: 0 });
  POSES.aim = P({ armN: [1.55, 1.57], armF: [1.45, 1.55], draw: 0 });
  POSES.draw = P({ hx: -1, armN: [1.55, 1.57], armF: [1.5, 1.2], draw: 4 });
  POSES.leap = P({ dy: -2, legN: [3.2, 3.4], legF: [-3, 4.6], armN: [1.8, 2.2], armF: [-1.4, -1.0] });
})();
const HERO_POSES = POSES;

// Whip arm overrides by direction and phase (0 windup, 1 strike, 2 follow).
const WHIP_ARMS = {
  fwd: [[-2.4, -2.9], [1.57, 1.6], [1.15, 0.95]],
  up: [[1.2, 0.9], [3.08, 3.12], [2.7, 2.6]],
  down: [[2.5, 2.8], [0.25, 0.1], [0.5, 0.35]],
};

const _rigCache = new Map();
function rigFrame(skinName, pose, over) {
  const key = skinName + ':' + pose + (over ? JSON.stringify(over) : '');
  let f = _rigCache.get(key);
  if (f) return f;
  const skin = SKINS[skinName];
  let p = POSES[pose] || POSES.idle0;
  if (over) p = Object.assign({}, p, over);
  const r = rigCanvas(skin, p);
  f = new Sprite(r.c, skin.w >> 1, skin.h);
  f.hand = r.hand;
  f.head = r.head;
  _rigCache.set(key, f);
  return f;
}
function heroFrame(pose, whipDir, whipPhase) {
  return whipDir ? rigFrame('hero', pose, { armN: WHIP_ARMS[whipDir][whipPhase] }) : rigFrame('hero', pose);
}

const HERO_DEAD = [
  '..........................',
  '..........................',
  '.kkkk.....................',
  'kttTTk...kkkkkkk..........',
  'ktTjTkkkkVvvvvvVkkkkkk....',
  'kTTTuhssskvccccvRkpppPkkk.',
  'kuTTkhhssksccccvRkppppPbbk',
  '.kkkkkkhhkkkkkkkkkkkkkkkkk',
];
let HERO_ROLL_SPR = null, HERO_DEAD_SPR = null;
function heroExtras() {
  if (HERO_ROLL_SPR) return;
  const tuck = rigCanvas(SKINS.hero, Object.assign({}, POSES.idle0, { dy: 6, hx: 2, hy: 3, legN: [3, 1.2], legF: [1.5, 1.6], armN: [1.9, 2.8], armF: [1.2, 2.2] })).c;
  const px = canvasPixels(tuck);
  let x0 = 99, y0 = 99, x1 = 0, y1 = 0;
  for (let y = 0; y < px.h; y++)
    for (let x = 0; x < px.w; x++)
      if (px.d[y * px.w + x] >>> 24) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  const sz = Math.max(x1 - x0, y1 - y0) + 1;
  const base = makeCanvas(sz, sz);
  base.getContext('2d').drawImage(tuck, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.floor((sz - (x1 - x0 + 1)) / 2), Math.floor((sz - (y1 - y0 + 1)) / 2), x1 - x0 + 1, y1 - y0 + 1);
  HERO_ROLL_SPR = [0, 1, 2, 3].map((q) => {
    const c = makeCanvas(sz, sz);
    const g = c.getContext('2d');
    g.translate(sz / 2, sz / 2);
    g.rotate((q * Math.PI) / 2);
    g.drawImage(base, -sz / 2, -sz / 2);
    return new Sprite(c, sz >> 1, sz);
  });
  HERO_DEAD_SPR = mkSprite(HERO_DEAD, HP, 13, 8);
}

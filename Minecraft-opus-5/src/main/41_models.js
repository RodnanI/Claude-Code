// ============================================================================
//  Box models (mobs/player) with procedurally painted skins, item meshes, icons
// ============================================================================
const MODELS = {};
const SKIN_CANVASES = [];
class BoxModel {
  constructor(name, ts) { this.name = name; this.parts = []; this.pi = {}; this.boxes = []; this.ts = ts || 1; this.groups = []; }
  part(name, parent, pivot, rot) { const idx = this.parts.length; this.parts.push({ name, parent: parent ? this.pi[parent] : -1, pivot, rot: rot || [0, 0, 0] }); this.pi[name] = idx; return this; }
  box(part, from, size, paint, group, inflate) { this.boxes.push({ part: this.pi[part], from, size, paint: paint || {}, group: group || 0, inflate: inflate || 0 }); return this; }
}
// face painter context
function facePainter(img, rx, ry, rw, rh) {
  return {
    w: rw, h: rh,
    px(x, y, c, a) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= rw || y >= rh) return; const i = ((ry + y) * 64 + rx + x) * 4; img[i] = (c >> 16) & 255; img[i + 1] = (c >> 8) & 255; img[i + 2] = c & 255; img[i + 3] = a === undefined ? 255 : a; },
    rect(x, y, w, h, c, a) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a); },
  };
}
function buildModel(m) {
  // allocate face rects: order +x,-x,+y,-y,+z,-z
  const rects = [];
  for (const b of m.boxes) {
    const s = b.size, ts = m.ts;
    const W = Math.max(1, Math.round(s[0] * ts)), H = Math.max(1, Math.round(s[1] * ts)), D = Math.max(1, Math.round(s[2] * ts));
    b.faceSize = [[D, H], [D, H], [W, D], [W, D], [W, H], [W, H]];
    b.rects = [];
    for (let f = 0; f < 6; f++) rects.push({ b, f, w: b.faceSize[f][0], h: b.faceSize[f][1] });
  }
  rects.sort((a, c) => c.h - a.h || c.w - a.w);
  let x = 0, y = 0, rowH = 0;
  for (const r of rects) {
    if (x + r.w > 64) { x = 0; y += rowH; rowH = 0; }
    r.x = x; r.y = y; x += r.w; rowH = Math.max(rowH, r.h);
    r.b.rects[r.f] = r;
  }
  if (y + rowH > 64) console.warn('skin atlas overflow for', m.name, y + rowH);
  // paint
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'); const id = g.createImageData(64, 64); const img = id.data;
  const FN = ['right', 'left', 'top', 'bottom', 'back', 'front'];
  let seed = strHash(m.name);
  for (const b of m.boxes) {
    const p = b.paint;
    for (let f = 0; f < 6; f++) {
      const r = b.rects[f]; const fp = facePainter(img, r.x, r.y, r.w, r.h);
      const base = (p[FN[f]] && typeof p[FN[f]] === 'number') ? p[FN[f]] : (p.base !== undefined ? p.base : 0xFF00FF);
      const rng = new RNG(seed++);
      const nz = p.noise === undefined ? 0.1 : p.noise;
      if (base >= 0) for (let yy = 0; yy < r.h; yy++) for (let xx = 0; xx < r.w; xx++) fp.px(xx, yy, csh(base, 1 + (rng.next() - 0.5) * nz * 2 - (f === 3 ? 0.08 : 0)));
      if (p.all) p.all(fp, f, rng, b);
      if (typeof p[FN[f]] === 'function') p[FN[f]](fp, rng, b);
    }
  }
  g.putImageData(id, 0, 0);
  m.layer = SKIN_CANVASES.length; SKIN_CANVASES.push(cv);
  // geometry
  const V = [];
  const groupCounts = new Map();
  const byGroup = [...m.boxes].sort((a, c) => a.group - c.group);
  const CORN = [[1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1], [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0], [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0], [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1], [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1], [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0]];
  const NRM = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  m.boxRanges = [];
  for (const b of byGroup) {
    m.boxRanges[m.boxes.indexOf(b)] = [V.length / 9, 36];
    const inf = b.inflate, x0 = b.from[0] - inf, y0 = b.from[1] - inf, z0 = b.from[2] - inf, x1 = b.from[0] + b.size[0] + inf, y1 = b.from[1] + b.size[1] + inf, z1 = b.from[2] + b.size[2] + inf;
    for (let f = 0; f < 6; f++) {
      const r = b.rects[f], c = CORN[f];
      const uv = [[r.x, r.y + r.h], [r.x + r.w, r.y + r.h], [r.x + r.w, r.y], [r.x, r.y]];
      const pts = [];
      for (let k = 0; k < 4; k++) pts.push([c[k * 3] ? x1 : x0, c[k * 3 + 1] ? y1 : y0, c[k * 3 + 2] ? z1 : z0, uv[k][0] / 64, uv[k][1] / 64]);
      for (const k of [0, 1, 2, 0, 2, 3]) { const q = pts[k]; V.push(q[0], q[1], q[2], q[3], q[4], b.part, NRM[f][0], NRM[f][1], NRM[f][2]); }
      groupCounts.set(b.group, (groupCounts.get(b.group) || 0) + 6);
    }
  }
  m.verts = new Float32Array(V);
  m.groupRanges = [];
  let off = 0;
  for (const [gidx, n] of [...groupCounts.entries()].sort((a, c) => a[0] - c[0])) { m.groupRanges[gidx] = [off, n]; off += n; }
  m.count = off;
  return m;
}
function uploadModel(gl, m) {
  m.vao = gl.createVertexArray(); m.vbo = gl.createBuffer();
  gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, m.verts, gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 12); gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 36, 20); gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 36, 24); gl.enableVertexAttribArray(3);
  gl.bindVertexArray(null);
}
// ------------------------------------------------------------------ painting helpers
const eyes = (col, pupil, y, gap, w) => (fp) => { const cx = fp.w / 2; const ww = w || 2; fp.rect(Math.floor(cx - gap / 2 - ww), y, ww, 1, col); fp.rect(Math.ceil(cx + gap / 2), y, ww, 1, col); if (pupil !== undefined) { fp.px(Math.floor(cx - gap / 2 - 1), y, pupil); fp.px(Math.ceil(cx + gap / 2), y, pupil); } };
function spots(col, n, sz) { return (fp, a, b2) => { const rng = a instanceof RNG ? a : b2; for (let i = 0; i < n * Math.max(1, fp.w * fp.h / 64); i++) { const x = rng.int(fp.w), y = rng.int(fp.h), s = 1 + rng.int(sz || 3); fp.rect(x, y, s, s, col); } }; }
function hooves(c, hgt) { return (fp, f) => { if (f !== 2) fp.rect(0, fp.h - (hgt || 2), fp.w, hgt || 2, c); if (f === 3) fp.rect(0, 0, fp.w, fp.h, c); }; }
// humanoid template
function humanoid(name, skin, o) {
  o = o || {};
  const m = new BoxModel(name, 1);
  m.part('body', null, [0, 0, 0]).part('head', 'body', [0, 24, 0]).part('rarm', 'body', [6, 22, 0]).part('larm', 'body', [-6, 22, 0]).part('rleg', 'body', [2, 12, 0]).part('lleg', 'body', [-2, 12, 0]);
  const aw = o.armW || 4, lw = o.legW || 4;
  m.box('head', [-4, 0, -4], [8, 8, 8], skin.head);
  if (skin.hat) m.box('head', [-4, 0, -4], [8, 8, 8], skin.hat, 1, 0.5);
  m.box('body', [-4, 12, -2], [8, 12, o.bodyD || 4], skin.body, skin.bodyGroup || 0);
  m.box('rarm', [-aw / 2, -10, -aw / 2], [aw, 12, aw], skin.arm, skin.armGroup || 0);
  m.box('larm', [-aw / 2, -10, -aw / 2], [aw, 12, aw], skin.arm, skin.armGroup || 0);
  m.box('rleg', [-lw / 2, -12, -lw / 2], [lw, 12, lw], skin.leg);
  m.box('lleg', [-lw / 2, -12, -lw / 2], [lw, 12, lw], skin.leg);
  m.humanoid = true;
  return m;
}
function defineModels() {
  // ---------------- player (original explorer design)
  const SK = 0xC8946A, HAIR = 0x4A2E1A, SHIRT = 0x2A8A8A, PANTS = 0x2E3A6A, SHOE = 0x4A4A4A;
  MODELS.player = humanoid('player', {
    head: { base: SK, noise: 0.04, top: HAIR, back: (fp) => fp.rect(0, 0, fp.w, 7, HAIR), right: (fp) => { fp.rect(0, 0, fp.w, 3, HAIR); fp.rect(0, 0, 3, 6, HAIR); }, left: (fp) => { fp.rect(0, 0, fp.w, 3, HAIR); fp.rect(fp.w - 3, 0, 3, 6, HAIR); },
      front: (fp) => { fp.rect(0, 0, 8, 2, HAIR); fp.px(0, 2, HAIR); fp.px(7, 2, HAIR); fp.rect(1, 4, 2, 1, 0xFFFFFF); fp.rect(5, 4, 2, 1, 0xFFFFFF); fp.px(2, 4, 0x3A6ACA); fp.px(5, 4, 0x3A6ACA); fp.rect(3, 6, 2, 1, 0x8A4A3A); fp.rect(1, 3, 2, 1, 0x5A3A22); fp.rect(5, 3, 2, 1, 0x5A3A22); } },
    body: { base: SHIRT, noise: 0.06, front: (fp) => { fp.rect(3, 0, 2, 3, 0x1E6A6A); fp.rect(0, 10, 8, 2, 0x3A2A1A); fp.px(3, 10, 0xC8A040); fp.px(4, 10, 0xC8A040); } },
    arm: { base: SHIRT, noise: 0.06, all: (fp, f) => { if (f !== 2) fp.rect(0, fp.h - 4, fp.w, 4, SK); if (f === 3) fp.rect(0, 0, fp.w, fp.h, SK); } },
    leg: { base: PANTS, noise: 0.06, all: (fp, f) => { if (f !== 2) fp.rect(0, fp.h - 2, fp.w, 2, SHOE); if (f === 3) fp.rect(0, 0, fp.w, fp.h, SHOE); } },
  });
  // ---------------- zombie (generic undead)
  const ZS = 0x6E8E5A, ZSH = 0x3A5A6A, ZP = 0x3A3A6A;
  MODELS.zombie = humanoid('zombie', {
    head: { base: ZS, noise: 0.12, front: (fp) => { fp.rect(1, 3, 2, 2, 0x1A1A1A); fp.rect(5, 3, 2, 2, 0x1A1A1A); fp.px(2, 4, 0x8A2A2A); fp.px(5, 4, 0x8A2A2A); fp.rect(2, 6, 4, 1, 0x2A3A22); fp.px(4, 5, 0x4A5A3A); }, top: (fp, r) => { for (let i = 0; i < 10; i++) fp.px(r.int(8), r.int(8), 0x4A6A3A); } },
    body: { base: ZSH, noise: 0.14, all: (fp, f, r) => { for (let i = 0; i < 6; i++) fp.px(r.int(fp.w), fp.h - 1 - r.int(3), ZS); } },
    arm: { base: ZSH, noise: 0.12, all: (fp, f) => { if (f !== 2) fp.rect(0, fp.h - 6, fp.w, 6, ZS); if (f === 3) fp.rect(0, 0, fp.w, fp.h, ZS); } },
    leg: { base: ZP, noise: 0.14, all: (fp, f, r) => { if (f !== 2) fp.rect(0, fp.h - 2, fp.w, 2, 0x2A2A2A); } },
  });
  // ---------------- ghoul (nether zombie variant)
  const GS = 0x7A7470;
  MODELS.ghoul = humanoid('ghoul', {
    head: { base: GS, noise: 0.14, front: (fp) => { fp.rect(1, 3, 2, 1, 0xFF8A1E); fp.rect(5, 3, 2, 1, 0xFFB43A); fp.rect(2, 6, 4, 1, 0x2A1A1A); fp.px(1, 6, 0x3A2A2A); }, top: spots(0x5A5450, 3, 2) },
    body: { base: 0x3A2A26, noise: 0.18, all: spots(GS, 2, 2) },
    arm: { base: 0x3A2A26, noise: 0.14, all: (fp, f) => { if (f !== 2) fp.rect(0, fp.h - 7, fp.w, 7, GS); } },
    leg: { base: 0x2A2020, noise: 0.14, all: spots(0x4A3A34, 1, 2) },
  });
  // ---------------- skeleton & ashen skeleton
  const skel = (name, bone, dark, sword) => {
    const m = humanoid(name, {
      head: { base: bone, noise: 0.08, front: (fp) => { fp.rect(1, 3, 2, 2, dark); fp.rect(5, 3, 2, 2, dark); fp.px(3, 5, dark); fp.px(4, 5, dark); fp.rect(1, 6, 6, 1, dark); fp.px(2, 6, bone); fp.px(4, 6, bone); } },
      body: { base: -1, all: (fp, f) => { if (f === 2 || f === 3) return; for (let y = 0; y < fp.h; y++) { const rib = y % 2 === 0 && y < 9; for (let x = 0; x < fp.w; x++) { const spine = Math.abs(x - fp.w / 2 + 0.5) < 1; if (rib || spine || y >= 10) fp.px(x, y, csh(bone, 0.9 + (x + y) % 3 * 0.05)); } } } },
      arm: { base: bone, noise: 0.08 }, leg: { base: bone, noise: 0.08 },
    }, { armW: 2, legW: 2 });
    return m;
  };
  MODELS.skeleton = skel('skeleton', 0xD8D8D0, 0x2A2A2A);
  MODELS.ashen_skeleton = skel('ashen_skeleton', 0x3A3A3E, 0xFF6A1E);
  // ---------------- villager (original design; clothing tinted per profession)
  const VS = 0xB88A62;
  MODELS.villager = humanoid('villager', {
    head: { base: VS, noise: 0.05, top: 0x5A3A22, back: (fp) => fp.rect(0, 0, fp.w, 5, 0x5A3A22), right: (fp) => fp.rect(0, 0, fp.w, 2, 0x5A3A22), left: (fp) => fp.rect(0, 0, fp.w, 2, 0x5A3A22),
      front: (fp) => { fp.rect(0, 0, 8, 1, 0x5A3A22); fp.rect(1, 3, 2, 1, 0xFFFFFF); fp.rect(5, 3, 2, 1, 0xFFFFFF); fp.px(2, 3, 0x2A5A2A); fp.px(5, 3, 0x2A5A2A); fp.rect(1, 2, 2, 1, 0x4A2E1A); fp.rect(5, 2, 2, 1, 0x4A2E1A); fp.rect(3, 4, 2, 2, 0xA8785A); fp.rect(2, 6, 4, 1, 0x7A4A3A); } },
    body: { base: 0xE0E0E0, noise: 0.08, front: (fp) => { fp.rect(0, 9, 8, 1, 0x7A5A3A); fp.rect(3, 0, 2, 2, 0xC8C8C8); } }, bodyGroup: 1,
    arm: { base: 0xE0E0E0, noise: 0.08, all: (fp, f) => { if (f !== 2) fp.rect(0, fp.h - 3, fp.w, 3, VS); } }, armGroup: 1,
    leg: { base: 0x5A4A3A, noise: 0.08, all: hooves(0x3A2A1A, 2) },
  });
  // ---------------- witch (original)
  const WS = 0x9AAA7A, ROBE = 0x3A1E4A;
  const wm = humanoid('witch', {
    head: { base: WS, noise: 0.08, front: (fp) => { fp.rect(1, 3, 2, 1, 0x1A1A1A); fp.rect(5, 3, 2, 1, 0x1A1A1A); fp.px(2, 3, 0xC8E83A); fp.px(5, 3, 0xC8E83A); fp.rect(3, 4, 2, 3, 0x7A8A5A); fp.rect(2, 7, 4, 1, 0x4A2A2A); fp.px(4, 6, 0x3A5A2A); } },
    body: { base: ROBE, noise: 0.1, front: (fp) => { fp.rect(3, 0, 2, 12, 0x5A2E6A); fp.px(3, 5, 0xC8A040); } },
    arm: { base: ROBE, noise: 0.1, all: (fp, f) => { if (f !== 2) fp.rect(0, fp.h - 3, fp.w, 3, WS); } },
    leg: { base: ROBE, noise: 0.1 },
  });
  wm.part('hat', 'head', [0, 8, 0]);
  wm.box('hat', [-5, 0, -5], [10, 1, 10], { base: 0x1E1E2A, noise: 0.1 });
  wm.box('hat', [-3.5, 1, -3.5], [7, 3, 7], { base: 0x1E1E2A, noise: 0.1, all: (fp, f) => { if (f !== 2 && f !== 3) fp.rect(0, fp.h - 1, fp.w, 1, 0x6A2A8A); } });
  wm.box('hat', [-2.5, 4, -2], [5, 3, 5], { base: 0x1E1E2A, noise: 0.1 });
  wm.box('hat', [-1, 7, 0], [2, 3, 2], { base: 0x1E1E2A, noise: 0.1 });
  MODELS.witch = wm;
  // ---------------- pig
  const PK = 0xEFA3A0;
  MODELS.pig = new BoxModel('pig', 1)
    .part('body', null, [0, 0, 0]).part('head', 'body', [0, 12, -8]).part('leg0', 'body', [3, 6, -5]).part('leg1', 'body', [-3, 6, -5]).part('leg2', 'body', [3, 6, 6]).part('leg3', 'body', [-3, 6, 6])
    .box('body', [-5, 6, -8], [10, 8, 16], { base: PK, noise: 0.05, top: (fp, r) => { for (let i = 0; i < 5; i++) fp.px(r.int(fp.w), r.int(fp.h), 0xE0908C); } })
    .box('head', [-4, -4, -8], [8, 8, 8], { base: PK, noise: 0.04, front: (fp) => { fp.rect(1, 2, 2, 1, 0xFFFFFF); fp.px(1, 2, 0x1A1A1A); fp.rect(5, 2, 2, 1, 0xFFFFFF); fp.px(6, 2, 0x1A1A1A); fp.rect(1, 1, 2, 1, 0xD88A88); fp.rect(5, 1, 2, 1, 0xD88A88); } })
    .box('head', [-2, -3, -9], [4, 3, 1], { base: 0xE88C8C, noise: 0.04, front: (fp) => { fp.px(1, 1, 0x8A4A4A); fp.px(2, 1, 0x8A4A4A); } })
    .box('head', [-4, 3, -6], [2, 2, 1], { base: 0xE0908C }).box('head', [2, 3, -6], [2, 2, 1], { base: 0xE0908C });
  for (let i = 0; i < 4; i++) MODELS.pig.box('leg' + i, [-2, -6, -2], [4, 6, 4], { base: PK, noise: 0.05, all: hooves(0x6A4A3A, 1) });
  // ---------------- cow (original patch pattern)
  const CB = 0x4A3424;
  MODELS.cow = new BoxModel('cow', 1)
    .part('body', null, [0, 0, 0]).part('head', 'body', [0, 18, -9]).part('leg0', 'body', [4, 12, -6]).part('leg1', 'body', [-4, 12, -6]).part('leg2', 'body', [4, 12, 7]).part('leg3', 'body', [-4, 12, 7])
    .box('body', [-6, 12, -9], [12, 10, 18], { base: CB, noise: 0.06, all: spots(0xF2F0EA, 2, 4), bottom: (fp) => { fp.rect(4, 12, 4, 3, 0xE8A8A8); } })
    .box('head', [-4, -3, -6], [8, 8, 6], { base: CB, noise: 0.05, all: spots(0xF2F0EA, 1, 3), front: (fp) => { fp.rect(0, 0, 8, 8, CB); fp.rect(3, 0, 2, 5, 0xF2F0EA); fp.rect(1, 3, 2, 1, 0xFFFFFF); fp.px(1, 3, 0x1A1A1A); fp.rect(5, 3, 2, 1, 0xFFFFFF); fp.px(6, 3, 0x1A1A1A); } })
    .box('head', [-3, -3, -7], [6, 3, 1], { base: 0xC8A898, noise: 0.05, front: (fp) => { fp.px(1, 1, 0x4A3A3A); fp.px(4, 1, 0x4A3A3A); } })
    .box('head', [-6, 3, -4], [2, 1, 1], { base: 0xE8E0C8 }).box('head', [4, 3, -4], [2, 1, 1], { base: 0xE8E0C8 })
    .box('head', [-6, 4, -4], [1, 2, 1], { base: 0xE8E0C8 }).box('head', [5, 4, -4], [1, 2, 1], { base: 0xE8E0C8 });
  for (let i = 0; i < 4; i++) MODELS.cow.box('leg' + i, [-2, -12, -2], [4, 12, 4], { base: CB, noise: 0.06, all: (fp, f) => { if (f !== 2) { fp.rect(0, fp.h - 4, fp.w, 3, 0xF2F0EA); fp.rect(0, fp.h - 1, fp.w, 1, 0x2A2A2A); } } });
  // ---------------- sheep (group 0 base, group 1 wool - tinted)
  const SF = 0xD8C8B0, WL = 0xF0F0F0;
  MODELS.sheep = new BoxModel('sheep', 1)
    .part('body', null, [0, 0, 0]).part('head', 'body', [0, 17, -7]).part('leg0', 'body', [3, 11, -5]).part('leg1', 'body', [-3, 11, -5]).part('leg2', 'body', [3, 11, 6]).part('leg3', 'body', [-3, 11, 6])
    .box('body', [-4, 11, -7], [8, 7, 14], { base: 0xC8B8A0, noise: 0.06 })
    .box('head', [-3, -3, -7], [6, 6, 7], { base: SF, noise: 0.05, front: (fp) => { fp.rect(0, 1, 2, 1, 0xFFFFFF); fp.px(1, 1, 0x1A1A1A); fp.rect(4, 1, 2, 1, 0xFFFFFF); fp.px(4, 1, 0x1A1A1A); fp.rect(2, 4, 2, 1, 0xB08A7A); } })
    .box('head', [-4.5, 1, -6], [2, 1, 3], { base: SF }).box('head', [2.5, 1, -6], [2, 1, 3], { base: SF });
  for (let i = 0; i < 4; i++) MODELS.sheep.box('leg' + i, [-1.5, -11, -1.5], [3, 11, 3], { base: SF, noise: 0.05, all: hooves(0x3A3A3A, 1) });
  MODELS.sheep.box('body', [-4, 11, -7], [8, 7, 14], { base: WL, noise: 0.1, all: (fp, f, r) => { for (let i = 0; i < fp.w * fp.h / 5; i++) fp.px(r.int(fp.w), r.int(fp.h), 0xD8D8D8); } }, 1, 2);
  MODELS.sheep.box('head', [-3, 0, -6], [6, 3, 5], { base: WL, noise: 0.1 }, 1, 0.6);
  for (let i = 0; i < 4; i++) MODELS.sheep.box('leg' + i, [-1.5, -5, -1.5], [3, 5, 3], { base: WL, noise: 0.1 }, 1, 0.6);
  // ---------------- chicken
  MODELS.chicken = new BoxModel('chicken', 1)
    .part('body', null, [0, 0, 0]).part('head', 'body', [0, 9, -4]).part('rwing', 'body', [3, 10, 0]).part('lwing', 'body', [-3, 10, 0]).part('rleg', 'body', [1.5, 5, 1]).part('lleg', 'body', [-1.5, 5, 1])
    .box('body', [-3, 5, -4], [6, 6, 8], { base: 0xF4F4F0, noise: 0.05 })
    .box('head', [-2, 0, -3], [4, 6, 3], { base: 0xF4F4F0, noise: 0.04, front: (fp) => { fp.px(0, 1, 0x1A1A1A); fp.px(3, 1, 0x1A1A1A); } })
    .box('head', [-2, 2, -5], [4, 2, 2], { base: 0xF0A020 }).box('head', [-1, 0, -4], [2, 2, 1], { base: 0xE02020 })
    .box('head', [-1, 6, -2], [2, 1, 2], { base: 0xE02020 })
    .box('rwing', [0, -4, -3], [1, 4, 6], { base: 0xE8E8E4, noise: 0.06 }).box('lwing', [-1, -4, -3], [1, 4, 6], { base: 0xE8E8E4, noise: 0.06 })
    .box('rleg', [-0.5, -5, -0.5], [1, 5, 1], { base: 0xE8A020 }).box('lleg', [-0.5, -5, -0.5], [1, 5, 1], { base: 0xE8A020 })
    .box('rleg', [-1.5, -5, -2.5], [3, 0.5, 3], { base: 0xE8A020 }).box('lleg', [-1.5, -5, -2.5], [3, 0.5, 3], { base: 0xE8A020 });
  // ---------------- spider
  const SPB = 0x2E2622;
  const sp = new BoxModel('spider', 1).part('body', null, [0, 0, 0]).part('head', 'body', [0, 9, -3]);
  sp.box('body', [-3, 6, -3], [6, 6, 6], { base: 0x3A302A, noise: 0.1 });
  sp.box('body', [-5, 5, 3], [10, 8, 12], { base: SPB, noise: 0.14, top: (fp) => { for (let y = 2; y < fp.h - 2; y += 3) fp.rect(3, y, 4, 1, 0x5A1A1A); } });
  sp.box('head', [-4, -4, -8], [8, 8, 8], { base: SPB, noise: 0.12, front: (fp) => { fp.rect(1, 2, 2, 2, 0xE8221E); fp.rect(5, 2, 2, 2, 0xE8221E); fp.px(0, 1, 0xB01A16); fp.px(7, 1, 0xB01A16); fp.px(3, 1, 0xB01A16); fp.px(4, 1, 0xB01A16); fp.rect(2, 6, 1, 2, 0x5A4A3A); fp.rect(5, 6, 1, 2, 0x5A4A3A); } });
  for (let i = 0; i < 8; i++) { const side = i < 4 ? 1 : -1; sp.part('leg' + i, 'body', [side * 3, 9, -2 + (i % 4) * 1.3]); sp.box('leg' + i, side > 0 ? [0, -1, -1] : [-16, -1, -1], [16, 2, 2], { base: 0x2A2220, noise: 0.14 }); }
  MODELS.spider = sp;
  // ---------------- boomcap (original exploding mushroom creature)
  const bc = new BoxModel('boomcap', 1).part('body', null, [0, 0, 0]).part('cap', 'body', [0, 14, 0]);
  for (let i = 0; i < 4; i++) bc.part('leg' + i, 'body', [i & 1 ? -2 : 2, 4, i < 2 ? -2 : 2]);
  bc.box('body', [-3, 4, -3], [6, 10, 6], { base: 0xEDE2C8, noise: 0.06, front: (fp) => { fp.rect(1, 1, 1, 2, 0xFFE24A); fp.rect(4, 1, 1, 2, 0xFFE24A); fp.px(1, 1, 0xFFFFA0); fp.px(4, 1, 0xFFFFA0); fp.rect(2, 5, 2, 1, 0x3A2A1A); fp.px(1, 4, 0x3A2A1A); fp.px(4, 4, 0x3A2A1A); } });
  bc.box('cap', [-7, 0, -7], [14, 6, 14], { base: 0xC8322A, noise: 0.08, all: (fp, f, r) => { if (f === 3) { fp.rect(0, 0, fp.w, fp.h, 0xB8A488); for (let x = 0; x < fp.w; x += 2) fp.rect(x, 0, 1, fp.h, 0x9A8A6A); return; } for (let i = 0; i < Math.max(2, fp.w * fp.h / 24); i++) { const x = r.int(fp.w - 1), y = r.int(fp.h - 1); fp.rect(x, y, 2, 2, 0xF4EEDF); } } });
  bc.box('cap', [-5, 6, -5], [10, 2, 10], { base: 0xC8322A, noise: 0.08, all: spots(0xF4EEDF, 1, 2) });
  for (let i = 0; i < 4; i++) bc.box('leg' + i, [-1.5, -4, -1.5], [3, 4, 3], { base: 0xD8CCB0, noise: 0.08, all: hooves(0x6A5A3A, 1) });
  MODELS.boomcap = bc;
  // ---------------- ember imp (original nether flyer)
  const IMP = 0xD8481A;
  const im = new BoxModel('imp', 1).part('body', null, [0, 0, 0]).part('head', 'body', [0, 14, 0]).part('rwing', 'body', [2, 12, 2]).part('lwing', 'body', [-2, 12, 2]).part('tail', 'body', [0, 6, 2]).part('rarm', 'body', [4, 13, 0]).part('larm', 'body', [-4, 13, 0]);
  im.box('body', [-3, 6, -2], [6, 8, 4], { base: IMP, noise: 0.1, front: (fp) => { fp.rect(2, 2, 2, 4, 0xFF9A3A); } });
  im.box('head', [-3, 0, -3], [6, 6, 6], { base: IMP, noise: 0.08, front: (fp) => { fp.rect(1, 2, 1, 1, 0xFFF08A); fp.rect(4, 2, 1, 1, 0xFFF08A); fp.rect(2, 4, 2, 1, 0x4A0A0A); } });
  im.box('head', [-3, 6, -1], [1, 2, 1], { base: 0x3A1A0A }).box('head', [2, 6, -1], [1, 2, 1], { base: 0x3A1A0A });
  im.box('rwing', [0, -6, 0], [1, 8, 9], { base: 0x7A1A0A, noise: 0.12, all: (fp) => { for (let x = 0; x < fp.w; x += 3) fp.rect(x, 0, 1, fp.h, 0xA83A1A); } });
  im.box('lwing', [-1, -6, 0], [1, 8, 9], { base: 0x7A1A0A, noise: 0.12, all: (fp) => { for (let x = 0; x < fp.w; x += 3) fp.rect(x, 0, 1, fp.h, 0xA83A1A); } });
  im.box('tail', [-0.5, -6, 0], [1, 6, 1], { base: 0xA82A0A }).box('tail', [-1, -7, -0.5], [2, 1, 2], { base: 0xFF8A1E });
  im.box('rarm', [0, -6, -1], [2, 7, 2], { base: IMP, noise: 0.08 }).box('larm', [-2, -6, -1], [2, 7, 2], { base: IMP, noise: 0.08 });
  MODELS.imp = im;
  // ---------------- cinder slime (original)
  const cs = new BoxModel('cinder_slime', 1).part('body', null, [0, 0, 0]);
  cs.box('body', [-4, 0, -4], [8, 8, 8], { base: 0x3A1A0E, noise: 0.15, all: (fp, f, r) => { for (let i = 0; i < 4; i++) { let x = r.int(fp.w), y = r.int(fp.h); for (let k = 0; k < 4; k++) { fp.px(x, y, 0xFF8A1E); x += r.int(3) - 1; y += r.int(3) - 1; } } }, front: (fp) => { fp.rect(1, 2, 2, 2, 0xFFD24A); fp.rect(5, 2, 2, 2, 0xFFD24A); fp.rect(2, 5, 4, 1, 0xFF6A1A); } });
  MODELS.cinder_slime = cs;
  // ---------------- sentinel (original village guardian construct)
  const MT = 0x9EA4AA, BR = 0xB0803A;
  const sn = new BoxModel('sentinel', 0.5).part('body', null, [0, 0, 0]).part('head', 'body', [0, 32, 0]).part('rarm', 'body', [11, 30, 0]).part('larm', 'body', [-11, 30, 0]).part('rleg', 'body', [4, 16, 0]).part('lleg', 'body', [-4, 16, 0]);
  sn.box('body', [-9, 16, -5], [18, 16, 10], { base: MT, noise: 0.08, front: (fp) => { fp.rect(0, 0, fp.w, 1, BR); fp.rect(3, 3, 3, 2, 0x4AC8E8); } });
  sn.box('head', [-4, 0, -4], [8, 9, 8], { base: MT, noise: 0.07, front: (fp) => { fp.rect(0, 1, 4, 1, 0x1A1A1A); fp.rect(1, 1, 2, 1, 0x4AC8E8); } });
  sn.box('rarm', [0, -18, -3], [5, 20, 6], { base: MT, noise: 0.08, all: (fp, f) => { if (f !== 2) fp.rect(0, 0, fp.w, 1, BR); } }).box('larm', [-5, -18, -3], [5, 20, 6], { base: MT, noise: 0.08, all: (fp, f) => { if (f !== 2) fp.rect(0, 0, fp.w, 1, BR); } });
  sn.box('rleg', [-3, -16, -3], [6, 16, 6], { base: 0x8A9096, noise: 0.08 }).box('lleg', [-3, -16, -3], [6, 16, 6], { base: 0x8A9096, noise: 0.08 });
  MODELS.sentinel = sn;
  for (const k in MODELS) buildModel(MODELS[k]);
}

// ------------------------------------------------------------------ item meshes
const ITEM_MESHES = new Map();
function itemMesh(gl, R, id) {
  let m = ITEM_MESHES.get(id);
  if (m) return m;
  const d = ITEMS[id]; if (!d) return null;
  const V = [];
  let src = 0;
  const push = (x, y, z, u, v, l, nx, ny, nz, tint) => V.push(x, y, z, u, v, l, nx, ny, nz, ((tint >> 16) & 255) / 255, ((tint >> 8) & 255) / 255, (tint & 255) / 255);
  const CORN = [[1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1], [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0], [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0], [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1], [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1], [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0]];
  const NRM = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const box = (b, texFn, tintFn) => {
    for (let f = 0; f < 6; f++) {
      const c = CORN[f];
      const x0 = b[0], y0 = b[1], z0 = b[2], x1 = b[3], y1 = b[4], z1 = b[5];
      let uL, uR, vB, vT;
      switch (f) {
        case 0: uL = 1 - z1; uR = 1 - z0; vB = 1 - y0; vT = 1 - y1; break;
        case 1: uL = z0; uR = z1; vB = 1 - y0; vT = 1 - y1; break;
        case 2: uL = x0; uR = x1; vB = z1; vT = z0; break;
        case 3: uL = x0; uR = x1; vB = 1 - z0; vT = 1 - z1; break;
        case 4: uL = x0; uR = x1; vB = 1 - y0; vT = 1 - y1; break;
        default: uL = 1 - x1; uR = 1 - x0; vB = 1 - y0; vT = 1 - y1;
      }
      const uv = [[uL, vB], [uR, vB], [uR, vT], [uL, vT]];
      const L = texFn(f), tint = tintFn(f);
      const pts = []; for (let k = 0; k < 4; k++) pts.push([c[k * 3] ? x1 : x0, c[k * 3 + 1] ? y1 : y0, c[k * 3 + 2] ? z1 : z0, uv[k][0], uv[k][1]]);
      for (const k of [0, 1, 2, 0, 2, 3]) { const q = pts[k]; push(q[0] - 0.5, q[1] - 0.5, q[2] - 0.5, q[3], q[4], L, NRM[f][0], NRM[f][1], NRM[f][2], tint); }
    }
  };
  if (d.block !== undefined && !d.flat) {
    const bid = d.block, sh = SHAPE[bid];
    const texFn = (f) => { if (BLOCKS[bid].facing && f === 5 && TEXF[bid] !== 0xFFFF) return TEXF[bid]; return TEX[bid * 6 + f]; };
    const tn = TINT[bid];
    const tintFn = (f) => { if (!tn) return 0xFFFFFF; if (MASKSIDE[bid] && f !== 2) return 0xFFFFFF; return tn === T_GRASS ? 0x7CBD4A : tn === T_FOLIAGE ? 0x5EAB2E : tn === T_WATER ? 0x3F76E4 : COLOR[bid]; };
    if (sh === R_SLAB) box([0, 0, 0, 1, 0.5, 1], texFn, tintFn);
    else if (sh === R_STAIRS) { box([0, 0, 0, 1, 0.5, 1], texFn, tintFn); box([0, 0.5, 0, 1, 1, 0.5], texFn, tintFn); }
    else if (sh === R_CARPET) box([0, 0, 0, 1, 1 / 16, 1], texFn, tintFn);
    else if (sh === R_SNOW) box([0, 0, 0, 1, 2 / 16, 1], texFn, tintFn);
    else if (sh === R_PLATE) box([1 / 16, 0, 1 / 16, 15 / 16, 1 / 16, 15 / 16], texFn, tintFn);
    else if (sh === R_FENCE) { const f = BLOCKS[bid].fence === 3; box(f ? [0.25, 0, 0.25, 0.75, 1, 0.75] : [6 / 16, 0, 6 / 16, 10 / 16, 1, 10 / 16], texFn, tintFn); box(f ? [0, 0, 5 / 16, 1, 14 / 16, 11 / 16] : [0, 12 / 16, 7 / 16, 1, 15 / 16, 9 / 16], texFn, tintFn); if (!f) box([0, 6 / 16, 7 / 16, 1, 9 / 16, 9 / 16], texFn, tintFn); }
    else if (sh === R_GATE) { box([0, 5 / 16, 7 / 16, 2 / 16, 1, 9 / 16], texFn, tintFn); box([14 / 16, 5 / 16, 7 / 16, 1, 1, 9 / 16], texFn, tintFn); box([0, 6 / 16, 7 / 16, 1, 9 / 16, 9 / 16], texFn, tintFn); box([0, 12 / 16, 7 / 16, 1, 15 / 16, 9 / 16], texFn, tintFn); }
    else if (sh === R_CHEST) box([1 / 16, 0, 1 / 16, 15 / 16, 14 / 16, 15 / 16], texFn, tintFn);
    else if (sh === R_CACTUS) box([1 / 16, 0, 1 / 16, 15 / 16, 1, 15 / 16], texFn, tintFn);
    else if (sh === R_SHORT) box([0, 0, 0, 1, 15 / 16, 1], texFn, tintFn);
    else box([0, 0, 0, 1, 1, 1], texFn, tintFn);
    m = { cube: true };
  } else {
    // extruded sprite
    let tx, layer;
    const flat = d.flat || ('i:' + d.name);
    if (flat.startsWith('b:')) { layer = TEXI[flat.slice(2)]; tx = R.blockTx[layer]; src = 0; }
    else { layer = ITEM_TEXI[flat.slice(2)]; if (layer === undefined) layer = ITEM_TEXI.spawn_egg; tx = R.itemTx[layer]; src = 1; }
    let tint = d.tint || 0xFFFFFF;
    if (d.block !== undefined && TINT[d.block]) { const tn = TINT[d.block]; tint = tn === T_GRASS ? 0x7CBD4A : tn === T_FOLIAGE ? 0x5EAB2E : COLOR[d.block]; }
    const T = 1 / 32;
    const q = (a, b, c, e, u0, v0, u1, v1, n) => {
      const pts = [[...a, u0, v1], [...b, u1, v1], [...c, u1, v0], [...e, u0, v0]];
      for (const k of [0, 1, 2, 0, 2, 3]) { const p = pts[k]; push(p[0] - 0.5, p[1] - 0.5, p[2], p[3], p[4], layer, n[0], n[1], n[2], tint); }
    };
    q([0, 0, T], [1, 0, T], [1, 1, T], [0, 1, T], 0, 0, 1, 1, [0, 0, 1]);
    q([1, 0, -T], [0, 0, -T], [0, 1, -T], [1, 1, -T], 1, 0, 0, 1, [0, 0, -1]);
    const op = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && tx.a(x, y) >= 128;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!op(x, y)) continue;
      const u0 = x / 16, u1 = (x + 1) / 16, v0 = y / 16, v1 = (y + 1) / 16, X0 = x / 16, X1 = (x + 1) / 16, Y1 = 1 - y / 16, Y0 = 1 - (y + 1) / 16;
      if (!op(x - 1, y)) q([X0, Y0, -T], [X0, Y0, T], [X0, Y1, T], [X0, Y1, -T], u0, v0, u1, v1, [-1, 0, 0]);
      if (!op(x + 1, y)) q([X1, Y0, T], [X1, Y0, -T], [X1, Y1, -T], [X1, Y1, T], u0, v0, u1, v1, [1, 0, 0]);
      if (!op(x, y - 1)) q([X0, Y1, T], [X1, Y1, T], [X1, Y1, -T], [X0, Y1, -T], u0, v0, u1, v1, [0, 1, 0]);
      if (!op(x, y + 1)) q([X0, Y0, -T], [X1, Y0, -T], [X1, Y0, T], [X0, Y0, T], u0, v0, u1, v1, [0, -1, 0]);
    }
    m = { cube: false };
  }
  m.src = src;
  m.count = V.length / 12;
  m.vao = gl.createVertexArray(); m.vbo = gl.createBuffer();
  gl.bindVertexArray(m.vao); gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 48, 0); gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, 12); gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 48, 24); gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 48, 36); gl.enableVertexAttribArray(3);
  gl.bindVertexArray(null);
  ITEM_MESHES.set(id, m);
  return m;
}

// ------------------------------------------------------------------ UI icon sheet
const ICONS = { url: '', cols: 0, pos: new Map(), size: 32 };
function txCanvas(t, tint, maskOnly, shade) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'); const id = g.createImageData(16, 16);
  const tr = ((tint >> 16) & 255) / 255, tg = ((tint >> 8) & 255) / 255, tb = (tint & 255) / 255;
  for (let i = 0; i < 1024; i += 4) {
    const a = t.d[i + 3];
    let r = t.d[i], gg = t.d[i + 1], b = t.d[i + 2];
    const apply = tint !== undefined && tint !== 0xFFFFFF && (!maskOnly || (a > 0 && a < 200));
    if (apply) { r *= tr; gg *= tg; b *= tb; }
    const s = shade || 1;
    id.data[i] = r * s; id.data[i + 1] = gg * s; id.data[i + 2] = b * s; id.data[i + 3] = maskOnly && a > 0 ? 255 : a;
  }
  g.putImageData(id, 0, 0);
  return c;
}
function buildIcons(R) {
  const ids = []; for (const k in ITEMS) ids.push(+k);
  const S = 32, cols = 24, rows = Math.ceil(ids.length / cols);
  const cv = document.createElement('canvas'); cv.width = cols * S; cv.height = rows * S;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const P = (x, y, z) => [16 + (x - z) * 15, 1 + (x + z) * 7.5 + (1 - y) * 15];
  ids.forEach((id, i) => {
    const d = ITEMS[id], ox = (i % cols) * S, oy = Math.floor(i / cols) * S;
    ICONS.pos.set(id, [ox, oy]);
    g.save(); g.translate(ox, oy);
    if (d.block !== undefined && !d.flat) {
      const bid = d.block, sh = SHAPE[bid], tn = TINT[bid];
      const tint = (f) => !tn ? 0xFFFFFF : (MASKSIDE[bid] && f !== 2) ? 0x7CBD4A : tn === T_GRASS ? 0x7CBD4A : tn === T_FOLIAGE ? 0x5EAB2E : tn === T_WATER ? 0x3F76E4 : COLOR[bid];
      const texOf = (f) => { if (BLOCKS[bid].facing && f === 4 && TEXF[bid] !== 0xFFFF) return TEXF[bid]; return TEX[bid * 6 + f]; };
      const faceImg = (f, shade) => txCanvas(R.blockTx[texOf(f)], tint(f), MASKSIDE[bid] && f !== 2 && f !== 3, shade);
      const boxes = sh === R_SLAB ? [[0, 0, 0, 1, 0.5, 1]] : sh === R_STAIRS ? [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 1, 1, 0.5]] : sh === R_CARPET ? [[0, 0, 0, 1, 0.07, 1]] : sh === R_SNOW ? [[0, 0, 0, 1, 0.14, 1]] : sh === R_PLATE ? [[0.06, 0, 0.06, 0.94, 0.07, 0.94]] :
        sh === R_FENCE ? (BLOCKS[bid].fence === 3 ? [[0.25, 0, 0.25, 0.75, 1, 0.75]] : [[0.1, 0, 0.4, 0.3, 1, 0.6], [0.7, 0, 0.4, 0.9, 1, 0.6], [0, 0.35, 0.45, 1, 0.5, 0.55], [0, 0.75, 0.45, 1, 0.9, 0.55]]) :
        sh === R_GATE ? [[0, 0.3, 0.45, 0.12, 1, 0.55], [0.88, 0.3, 0.45, 1, 1, 0.55], [0, 0.4, 0.45, 1, 0.55, 0.55], [0, 0.75, 0.45, 1, 0.9, 0.55]] : sh === R_CHEST ? [[0.06, 0, 0.06, 0.94, 0.88, 0.94]] : sh === R_SHORT ? [[0, 0, 0, 1, 0.94, 1]] : [[0, 0, 0, 1, 1, 1]];
      const imgs = [faceImg(2, 1), faceImg(4, 0.8), faceImg(0, 0.62)];
      for (const b of boxes) {
        const [x0, y0, z0, x1, y1, z1] = b;
        const draw = (img, o, eu, ev, sx, sy, sw, sh2) => { g.setTransform(eu[0] / sw, eu[1] / sw, ev[0] / sh2, ev[1] / sh2, ox + o[0], oy + o[1]); g.drawImage(img, sx, sy, sw, sh2, 0, 0, sw, sh2); };
        const sub = (a, b2) => [b2[0] - a[0], b2[1] - a[1]];
        // top (+y)
        let o = P(x0, y1, z0); draw(imgs[0], o, sub(o, P(x1, y1, z0)), sub(o, P(x0, y1, z1)), x0 * 16, z0 * 16, Math.max(0.5, (x1 - x0) * 16), Math.max(0.5, (z1 - z0) * 16));
        // south (+z)
        o = P(x0, y1, z1); draw(imgs[1], o, sub(o, P(x1, y1, z1)), sub(o, P(x0, y0, z1)), x0 * 16, (1 - y1) * 16, Math.max(0.5, (x1 - x0) * 16), Math.max(0.5, (y1 - y0) * 16));
        // east (+x)
        o = P(x1, y1, z1); draw(imgs[2], o, sub(o, P(x1, y1, z0)), sub(o, P(x1, y0, z1)), (1 - z1) * 16, (1 - y1) * 16, Math.max(0.5, (z1 - z0) * 16), Math.max(0.5, (y1 - y0) * 16));
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      const flat = d.flat || ('i:' + d.name);
      let t;
      if (flat.startsWith('b:')) t = R.blockTx[TEXI[flat.slice(2)]]; else t = R.itemTx[ITEM_TEXI[flat.slice(2)] !== undefined ? ITEM_TEXI[flat.slice(2)] : ITEM_TEXI.spawn_egg];
      let tint = d.tint;
      if (d.block !== undefined && TINT[d.block]) { const tn = TINT[d.block]; tint = tn === T_GRASS ? 0x7CBD4A : tn === T_FOLIAGE ? 0x5EAB2E : COLOR[d.block]; }
      g.drawImage(txCanvas(t, tint), 0, 0, 32, 32);
    }
    g.restore();
  });
  ICONS.cols = cols; ICONS.w = cv.width; ICONS.h = cv.height;
  return new Promise(res => cv.toBlob(b => { ICONS.url = URL.createObjectURL(b); res(); }));
}

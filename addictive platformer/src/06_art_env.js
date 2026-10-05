// SQUEAKBORNE :: environment art
// Biome definitions, procedural tiles, back walls, parallax layers and decor.

const BIOMES = [
  {
    key: 'cellar', name: 'THE DAMP CELLAR', sub: 'smells like regret and old cheese', music: 'cellar',
    ambient: '#5f5868', gw: 5, gh: 3, dir: 'right', boss: 0,
    enemies: [['roach', 5], ['slime', 3], ['spider', 2], ['rat', 2], ['fly', 2]], flyers: ['fly'],
    hazard: 'mousetrap', prop: 'barrel', light: '#ffb45a', bg: [C.night, '#170f14'],
  },
  {
    key: 'living', name: 'THE LIVING ROOM', sub: 'nobody has lived here in years', music: 'living',
    ambient: '#6f6460', gw: 6, gh: 3, dir: 'right', boss: 1,
    enemies: [['dust', 4], ['soldier', 3], ['moth', 2], ['monkey', 2], ['worm', 2], ['roach', 1]], flyers: ['moth'],
    hazard: 'tacks', prop: 'books', light: '#ffd88a', bg: ['#1b1d1a', '#121411'],
  },
  {
    key: 'kitchen', name: 'THE KITCHEN', sub: 'everything in here is a weapon', music: 'kitchen',
    ambient: '#77706c', gw: 6, gh: 4, dir: 'right', boss: 2,
    enemies: [['chef', 4], ['meatball', 3], ['wasp', 2], ['knight', 2], ['pepper', 3]], flyers: ['wasp'],
    hazard: 'burner', prop: 'jar', light: '#fff0c8', bg: ['#1c1a1d', '#141215'],
  },
  {
    key: 'cattree', name: 'THE CAT TREE', sub: 'abandon all hope. bring snacks.', music: 'cattree',
    ambient: '#4c4f66', gw: 3, gh: 6, dir: 'up', boss: 3,
    enemies: [['kitten', 4], ['yarn', 3], ['wisp', 2], ['knight', 1], ['chef', 1], ['monkey', 1]], flyers: ['wisp'],
    hazard: 'glass', prop: 'block', light: '#bfe8ff', bg: ['#0e1426', '#0a0d1a'],
  },
];

// ---------- tiles ----------
// mask bits: 1 air above, 2 air right, 4 air below, 8 air left
function tileSolid(c, x, y, tx, ty, m, bk) {
  if (bk === 'cellar') solidCellar(c, x, y, tx, ty, m);
  else if (bk === 'living') solidLiving(c, x, y, tx, ty, m);
  else if (bk === 'kitchen') solidKitchen(c, x, y, tx, ty, m);
  else solidCat(c, x, y, tx, ty, m);
  // shared edge treatment
  if (m & 2) { R(c, x + 15, y, 1, 16, C.ink); R(c, x + 14, y, 1, 16, 'rgba(0,0,0,0.25)'); }
  if (m & 8) R(c, x, y, 1, 16, C.ink);
  if (m & 4) { R(c, x, y + 15, 16, 1, C.ink); R(c, x, y + 13, 16, 2, 'rgba(0,0,0,0.35)'); }
  if ((m & 9) === 9) c.clearRect(x, y, 1, 1);
  if ((m & 3) === 3) c.clearRect(x + 15, y, 1, 1);
  if ((m & 12) === 12) c.clearRect(x, y + 15, 1, 1);
  if ((m & 6) === 6) c.clearRect(x + 15, y + 15, 1, 1);
}
function solidCellar(c, x, y, tx, ty, m) {
  R(c, x, y, 16, 16, C.st1);
  for (let r = 0; r < 4; r++) {
    const gy = ty * 4 + r, off = (gy & 1) * 4;
    for (let b = -1; b < 3; b++) {
      const bx = b * 8 + off, x0 = max(0, bx), x1 = min(16, bx + 8);
      if (x1 <= x0) continue;
      const h = hash2(floor((tx * 16 + bx + 8) / 8), gy, 11);
      R(c, x + x0, y + r * 4, x1 - x0, 3, h < 0.12 ? C.st0 : h < 0.5 ? C.st2 : h < 0.56 ? '#2f3a30' : C.st1);
      if (h > 0.86) PX(c, x + x0 + 1, y + r * 4, C.st3);
      if (bx >= 0 && bx < 16) R(c, x + bx, y + r * 4, 1, 3, C.st0);
    }
    R(c, x, y + r * 4 + 3, 16, 1, C.st0);
  }
  if (m & 1) {
    R(c, x, y, 16, 3, C.gr1);
    for (let i = 0; i < 16; i++) {
      const h = hash2(tx * 16 + i, ty, 5);
      if (h < 0.55) PX(c, x + i, y, C.gr2);
      if (h < 0.18) PX(c, x + i, y, C.gr3);
      if (h > 0.78) R(c, x + i, y + 3, 1, 1 + floor((h - 0.78) * 18), C.gr1);
    }
  }
}
function solidLiving(c, x, y, tx, ty, m) {
  R(c, x, y, 16, 16, C.br1);
  for (let r = 0; r < 4; r++) {
    const gy = ty * 4 + r;
    const h = hash2(tx, gy, 31);
    R(c, x, y + r * 4, 16, 3, h < 0.4 ? C.br2 : h < 0.8 ? '#6b4329' : C.br1);
    R(c, x, y + r * 4 + 3, 16, 1, C.br0);
    const k = floor(hash2(tx, gy, 32) * 16);
    R(c, x + k, y + r * 4, 1, 3, C.br0);
    if (hash2(tx, gy, 33) < 0.4) R(c, x + ((k + 6) % 14), y + r * 4 + 1, 3, 1, C.br1);
  }
  if (m & 1) {
    R(c, x, y, 16, 4, C.rd1);
    R(c, x, y, 16, 1, C.rd2);
    for (let i = 0; i < 16; i += 4) { PX(c, x + i + ((tx + ty) & 1) * 2, y + 1, C.or1); PX(c, x + i + 1 + ((tx + ty) & 1) * 2, y + 2, C.or0); }
    for (let i = 0; i < 16; i += 2) PX(c, x + i, y + 4, C.rd0);
  }
}
function solidKitchen(c, x, y, tx, ty, m) {
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    const dark = ((tx * 2 + a + ty * 2 + b) & 1) === 1;
    R(c, x + a * 8, y + b * 8, 8, 8, dark ? C.st1 : C.fu3);
    R(c, x + a * 8, y + b * 8, 8, 1, dark ? C.st2 : C.fu4);
    R(c, x + a * 8, y + b * 8 + 7, 8, 1, dark ? C.st0 : C.fu2);
  }
  if (hash2(tx, ty, 41) < 0.2) { PX(c, x + 3, y + 10, C.br2); PX(c, x + 4, y + 11, C.br2); }
  if (m & 1) {
    R(c, x, y, 16, 4, C.st4); R(c, x, y, 16, 1, C.st5); R(c, x, y + 3, 16, 1, C.st2);
    PX(c, x + (tx * 5) % 14 + 1, y + 1, C.wh);
  }
}
function solidCat(c, x, y, tx, ty, m) {
  R(c, x, y, 16, 16, C.br3);
  for (let i = -16; i < 16; i += 3) LINE(c, x + max(0, i), y + max(0, -i), x + min(15, i + 15), y + min(15, 15 - i) - (i + 15 > 15 ? i : 0), C.br2);
  for (let i = 0; i < 16; i += 4) R(c, x, y + i + ((tx & 1) ? 2 : 0), 16, 1, C.br4);
  if (m & 1) {
    R(c, x, y, 16, 5, C.fu3);
    R(c, x, y, 16, 1, C.fu4);
    for (let i = 0; i < 16; i++) { const h = hash2(tx * 16 + i, ty, 9); if (h < 0.5) PX(c, x + i, y + 5, C.fu3); if (h < 0.3) PX(c, x + i, y + 2, C.fu4); }
  }
}
function tilePlat(c, x, y, tx, ty, bk, l, r) {
  if (bk === 'cellar') {
    R(c, x, y, 16, 4, C.br2); R(c, x, y, 16, 1, C.br3); R(c, x, y + 3, 16, 1, C.br1);
    PX(c, x + 3, y + 1, C.st3); PX(c, x + 12, y + 1, C.st3);
    if (!l) { R(c, x + 2, y + 4, 2, 4, C.br1); } if (!r) { R(c, x + 12, y + 4, 2, 4, C.br1); }
  } else if (bk === 'living') {
    const cols = [C.rd2, C.tl2, C.yl0, C.br3, C.gr2, C.or1];
    for (let i = 0; i < 4; i++) {
      const col = cols[floor(hash2(tx * 4 + i, ty, 3) * cols.length)];
      R(c, x + i * 4, y, 4, 5, col); R(c, x + i * 4, y, 4, 1, C.fu4); R(c, x + i * 4 + 3, y, 1, 5, C.ink);
    }
  } else if (bk === 'kitchen') {
    R(c, x, y, 16, 3, C.st3); R(c, x, y, 16, 1, C.st5);
    for (let i = 1; i < 16; i += 3) PX(c, x + i, y + 1, C.st1);
    R(c, x, y + 3, 16, 1, C.st2);
  } else {
    R(c, x, y, 16, 5, C.br2); R(c, x, y, 16, 3, C.fu3); R(c, x, y, 16, 1, C.fu4);
    for (let i = 0; i < 16; i += 2) PX(c, x + i + (ty & 1), y + 3, C.fu3);
  }
  R(c, x, y - 1, 16, 1, C.ink);
  R(c, x, y + 5, 16, 1, 'rgba(0,0,0,0.4)');
}
function tileSpike(c, x, y, bk) {
  for (let i = 0; i < 4; i++) {
    const sx = x + i * 4 + 1;
    if (bk === 'cellar') { LINE(c, sx + 1, y + 15, sx + 1, y + 7, C.st3); PX(c, sx + 1, y + 6, C.st5); R(c, sx, y + 11, 3, 1, C.or0); R(c, sx - 1, y + 15, 5, 1, C.st2); }
    else if (bk === 'living') { R(c, sx - 1, y + 12, 5, 3, [C.rd2, C.yl1, C.tl2, C.gr3][i]); LINE(c, sx + 1, y + 11, sx + 1, y + 7, C.st5); }
    else if (bk === 'kitchen') { POLY(c, [sx - 1, y + 16, sx + 3, y + 16, sx + 1, y + 6], C.st4); LINE(c, sx + 1, y + 7, sx + 1, y + 14, C.st5); }
    else { POLY(c, [sx - 1, y + 16, sx + 3, y + 16, sx + 2, y + 7 + (i & 1) * 2], C.tl3); PX(c, sx + 1, y + 10, C.tl4); }
  }
}
function tileBreak(c, x, y, tx, ty, bk) {
  const base = bk === 'cellar' ? C.st2 : bk === 'living' ? C.br3 : bk === 'kitchen' ? C.fu2 : C.br4;
  R(c, x, y, 16, 16, base);
  R(c, x + 1, y + 1, 14, 14, mixc(base, '#ffffff', 0.12));
  LINE(c, x + 3, y + 2, x + 7, y + 8, C.ink); LINE(c, x + 7, y + 8, x + 5, y + 13, C.ink); LINE(c, x + 7, y + 8, x + 12, y + 10, C.ink);
  R(c, x, y, 16, 1, C.ink); R(c, x, y + 15, 16, 1, C.ink); R(c, x, y, 1, 16, C.ink); R(c, x + 15, y, 1, 16, C.ink);
}
function tileBack(c, x, y, tx, ty, bk) {
  if (bk === 'cellar') {
    for (let r = 0; r < 2; r++) {
      const gy = ty * 2 + r, off = (gy & 1) * 8;
      for (let b = -1; b < 2; b++) {
        const bx = b * 16 + off, x0 = max(0, bx), x1 = min(16, bx + 16);
        if (x1 <= x0) continue;
        const h = hash2(floor((tx * 16 + bx + 16) / 16), gy, 21);
        R(c, x + x0, y + r * 8, x1 - x0, 7, h < 0.3 ? '#2a1f26' : h < 0.85 ? '#241920' : '#33252c');
        if (bx >= 0 && bx < 16) R(c, x + bx, y + r * 8, 1, 7, '#181015');
      }
      R(c, x, y + r * 8 + 7, 16, 1, '#181015');
    }
  } else if (bk === 'living') {
    for (let i = 0; i < 16; i += 4) R(c, x + i, y, 4, 16, ((tx * 4 + i / 4) & 1) ? '#24382f' : '#1f312a');
    if (((tx + ty) & 1) === 0) { PX(c, x + 5, y + 5, '#5c4a2a'); PX(c, x + 4, y + 6, '#5c4a2a'); PX(c, x + 6, y + 6, '#5c4a2a'); PX(c, x + 5, y + 7, '#3a5040'); }
    else { PX(c, x + 13, y + 13, '#5c4a2a'); }
  } else if (bk === 'kitchen') {
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      const h = hash2(tx * 4 + a, ty * 4 + b, 51);
      R(c, x + a * 4, y + b * 4, 3, 3, h < 0.85 ? '#3b4440' : '#2d4a44');
    }
    R(c, x, y, 16, 16, 'rgba(10,10,14,0.0)');
  } else {
    R(c, x, y, 16, 16, '#221b2a');
    if (hash2(tx, ty, 61) < 0.15) { LINE(c, x + 4, y + 3, x + 6, y + 12, '#2e2538'); LINE(c, x + 7, y + 3, x + 9, y + 12, '#2e2538'); LINE(c, x + 10, y + 3, x + 12, y + 12, '#2e2538'); }
  }
}

// ---------- parallax ----------
const PARA = {};
function buildParallax() {
  for (const B of BIOMES) PARA[B.key] = makePara(B);
  PARA.hub = PARA.cellar;
}
function vbands(c, w, h, cols) {
  const bh = ceil(h / cols.length);
  cols.forEach((col, i) => R(c, 0, i * bh, w, bh, col));
}
function makePara(B) {
  const w = 640, h = 420;
  const far = makeCanvas(w, h), f = ctx2d(far);
  const near = makeCanvas(w, h), n = ctx2d(near);
  const r = RNG(hashStr(B.key));
  if (B.key === 'cellar') {
    vbands(f, w, h, ['#140d12', '#160f14', '#181016', '#1a1218', '#1c131a', '#1a1218']);
    for (let k = 0; k < 5; k++) {
      const x = k * 128 + 20;
      R(f, x, 120, 90, 300, '#20161d');
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 5; xx++) DISC(f, x + 10 + xx * 17, 140 + yy * 30, 5, '#2a1d26');
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 5; xx++) PX(f, x + 8 + xx * 17, 138 + yy * 30, '#3a2a33');
    }
    for (let k = 0; k < 4; k++) {
      const x = k * 160 + 60;
      DISC(n, x, 330, 46, '#1e1519'); DISC(n, x, 330, 38, '#241a1f');
      R(n, x - 46, 330, 92, 100, '#1e1519');
      R(n, x - 40, 300, 80, 4, '#2c2026'); R(n, x - 44, 350, 88, 4, '#2c2026');
    }
    for (let k = 0; k < 3; k++) { const x = r.int(0, w); LINE(n, x, 0, x, r.int(40, 120), '#2a2026', 1); }
  } else if (B.key === 'living') {
    vbands(f, w, h, ['#151917', '#171c19', '#191e1b', '#1b211d', '#1d231f', '#1b211d']);
    R(f, 60, 90, 120, 90, '#1e2a26'); R(f, 66, 96, 108, 78, '#2a3a52'); DISC(f, 140, 120, 14, '#c9d3dc'); R(f, 119, 96, 2, 78, '#1e2a26'); R(f, 66, 134, 108, 2, '#1e2a26');
    R(f, 300, 180, 280, 120, '#1f1716'); DISC(f, 300, 210, 30, '#1f1716'); DISC(f, 580, 210, 30, '#1f1716'); R(f, 310, 150, 260, 50, '#241b1a');
    R(f, 330, 300, 12, 40, '#1a1312'); R(f, 540, 300, 12, 40, '#1a1312');
    R(n, 520, 60, 6, 300, '#251c18'); POLY(n, [490, 70, 556, 70, 540, 30, 506, 30], '#3a2c22'); DISC(n, 523, 74, 6, '#4a3a2a');
    for (let k = 0; k < 3; k++) { const x = 40 + k * 200; R(n, x, 40, 50, 64, '#2a201b'); R(n, x + 4, 44, 42, 56, '#1c2622'); DISC(n, x + 25, 66, 10, '#2b3530'); }
  } else if (B.key === 'kitchen') {
    vbands(f, w, h, ['#151416', '#171618', '#19181a', '#1b1a1c', '#1d1c1e', '#1b1a1c']);
    R(f, 40, 110, 160, 310, '#232227'); R(f, 46, 116, 148, 120, '#2a292f'); R(f, 46, 244, 148, 170, '#2a292f'); R(f, 180, 160, 6, 50, '#3a3940');
    R(f, 260, 200, 220, 220, '#211f22'); for (let k = 0; k < 4; k++) RING(f, 300 + k * 50, 195, 16, '#2e2c31', 3);
    R(f, 500, 60, 130, 120, '#1f1e22'); R(f, 506, 66, 56, 108, '#26252a'); R(f, 568, 66, 56, 108, '#26252a');
    for (let k = 0; k < 6; k++) { const x = 20 + k * 105; LINE(n, x, 0, x, 50 + (k % 3) * 20, '#2c2a30'); DISC(n, x, 70 + (k % 3) * 20, 14, '#252328'); R(n, x - 14, 70 + (k % 3) * 20, 28, 14, '#252328'); }
  } else {
    vbands(f, w, h, ['#0a0e1d', '#0c1122', '#0e1427', '#10172c', '#121a31', '#141c34']);
    for (let k = 0; k < 90; k++) { const x = r.int(0, w), y = r.int(0, 260); PX(f, x, y, r.chance(0.2) ? '#e8f0ff' : '#6a7aa0'); }
    DISC(f, 470, 90, 34, '#d9e6f5'); DISC(f, 462, 84, 30, '#eef5ff'); DISC(f, 480, 98, 5, '#c5d4e8'); DISC(f, 458, 72, 3, '#c5d4e8');
    for (let k = 0; k < 7; k++) { const x = k * 95, hh = r.int(60, 140); R(f, x, 420 - hh, 80, hh, '#0b0f1c'); POLY(f, [x - 6, 420 - hh, x + 86, 420 - hh, x + 40, 420 - hh - 30], '#0b0f1c'); R(f, x + 20, 430 - hh, 8, 10, r.chance(0.5) ? '#4a4a2a' : '#141a2a'); }
    ELL(n, 140, 360, 120, 50, '#0d1120'); DISC(n, 240, 320, 40, '#0d1120'); POLY(n, [210, 290, 225, 255, 240, 288], '#0d1120'); POLY(n, [250, 288, 262, 252, 275, 292], '#0d1120');
    R(n, 228, 316, 6, 2, '#4a5a3a'); R(n, 248, 316, 6, 2, '#4a5a3a');
  }
  return { far, near, w, h };
}
function drawParallax(key, camx, camy) {
  const P = PARA[key] || PARA.cellar;
  const yoff = (k) => -clamp(camy * k, 0, P.h - H);
  for (const [img, k] of [[P.far, 0.12], [P.near, 0.3]]) {
    const ox = -((camx * k) % P.w);
    const oy = round(yoff(k * 0.6));
    g.drawImage(img, round(ox), oy);
    g.drawImage(img, round(ox + P.w), oy);
  }
}

// ---------- decor (static, baked into the level canvas) ----------
function decorFloor(c, x, y, bk, h) {
  // x,y = top-left of the air tile sitting on the floor (floor surface at y+16)
  const fy = y + 16;
  if (bk === 'cellar') {
    if (h < 0.3) { for (let i = 0; i < 3; i++) LINE(c, x + 4 + i * 3, fy - 1, x + 3 + i * 3 + (i & 1) * 2, fy - 3 - (i & 1), C.gr2); }
    else if (h < 0.4) { R(c, x + 5, fy - 3, 1, 3, C.fu3); DISC(c, x + 5, fy - 4, 2, C.rd1); PX(c, x + 4, fy - 5, C.fu4); }
    else if (h < 0.47) { LINE(c, x + 3, fy - 1, x + 10, fy - 2, C.fu4); PX(c, x + 2, fy - 2, C.fu4); PX(c, x + 11, fy - 3, C.fu4); }
    else if (h < 0.53) { R(c, x + 6, fy - 7, 3, 7, '#2a4a2a'); R(c, x + 7, fy - 9, 1, 2, '#2a4a2a'); PX(c, x + 6, fy - 6, '#4a7a4a'); }
  } else if (bk === 'living') {
    if (h < 0.2) { R(c, x + 4, fy - 2, 2, 2, C.br4); PX(c, x + 9, fy - 1, C.br4); }
    else if (h < 0.3) { R(c, x + 3, fy - 4, 6, 4, [C.rd2, C.yl1, C.tl2][floor(h * 30) % 3]); PX(c, x + 4, fy - 5, C.fu4); PX(c, x + 7, fy - 5, C.fu4); }
    else if (h < 0.36) { ELL(c, x + 8, fy - 1, 4, 1, C.yl0); }
  } else if (bk === 'kitchen') {
    if (h < 0.2) { PX(c, x + 3, fy - 1, C.gr3); PX(c, x + 7, fy - 1, C.gr3); PX(c, x + 6, fy - 2, C.gr3); }
    else if (h < 0.3) { LINE(c, x + 2, fy - 1, x + 12, fy - 1, C.yl1); LINE(c, x + 4, fy - 2, x + 9, fy - 2, C.yl1); }
    else if (h < 0.36) { R(c, x + 4, fy - 6, 5, 6, C.st4); R(c, x + 4, fy - 6, 5, 2, C.rd2); R(c, x + 5, fy - 4, 3, 2, C.fu4); }
  } else {
    if (h < 0.15) { LINE(c, x + 3, fy - 1, x + 10, fy - 4, C.fu4); LINE(c, x + 5, fy - 1, x + 9, fy - 3, C.pk2); }
    else if (h < 0.24) { ELL(c, x + 8, fy - 3, 4, 2, C.fu1); PX(c, x + 11, fy - 4, C.ink); LINE(c, x + 4, fy - 2, x + 1, fy - 3, C.pk1); PX(c, x + 10, fy - 5, C.fu1); }
    else if (h < 0.3) { LINE(c, x + 2, fy - 1, x + 13, fy - 2, C.pk1); }
  }
}
function decorCeil(c, x, y, bk, h) {
  if (bk === 'cellar' || bk === 'cattree') {
    if (h < 0.25) { LINE(c, x + 3, y, x + 4, y + 5, C.br1); LINE(c, x + 4, y + 5, x + 3, y + 8, C.br1); LINE(c, x + 10, y, x + 11, y + 4, C.br1); }
    else if (h < 0.35) { for (let i = 0; i < 4; i++) LINE(c, x, y + i * 3, x + 12 - i * 3, y, 'rgba(220,220,230,0.25)'); }
  } else if (bk === 'kitchen' && h < 0.15) {
    R(c, x + 2, y, 12, 2, C.st2); for (let i = 0; i < 4; i++) PX(c, x + 3 + i * 3, y + 2, C.st3);
  }
}
function decorWall(c, x, y, bk, h) {
  // things hung on the back wall
  if (bk === 'living') {
    if (h < 0.5) {
      R(c, x, y, 22, 18, C.yl0); R(c, x + 2, y + 2, 18, 14, '#2a2a3a');
      DISC(c, x + 11, y + 11, 5, C.or1); POLY(c, [x + 7, y + 8, x + 9, y + 3, x + 10, y + 7], C.or1); POLY(c, [x + 12, y + 7, x + 13, y + 3, x + 15, y + 8], C.or1);
      PX(c, x + 9, y + 10, C.gr4); PX(c, x + 13, y + 10, C.gr4);
    } else {
      DISC(c, x + 8, y + 8, 7, C.br2); DISC(c, x + 8, y + 8, 5, C.fu4); LINE(c, x + 8, y + 8, x + 8, y + 4, C.ink); LINE(c, x + 8, y + 8, x + 11, y + 8, C.ink);
    }
  } else if (bk === 'kitchen') {
    R(c, x, y + 10, 28, 2, C.br2);
    for (let i = 0; i < 4; i++) { const col = [C.rd2, C.yl0, C.gr2, C.or1][i]; R(c, x + 2 + i * 7, y + 2, 5, 8, C.st4); R(c, x + 3 + i * 7, y + 4, 3, 5, col); R(c, x + 2 + i * 7, y + 1, 5, 2, C.br3); }
  } else if (bk === 'cellar') {
    R(c, x + 2, y, 2, 20, '#2a1f26'); R(c, x + 18, y, 2, 20, '#2a1f26'); for (let i = 0; i < 4; i++) R(c, x, y + 2 + i * 5, 22, 2, '#33252c');
    for (let i = 0; i < 3; i++) DISC(c, x + 6 + i * 5, y + 6, 2, ['#3b1d24', '#203a26', '#3b1d24'][i]);
  } else {
    for (let i = 0; i < 3; i++) LINE(c, x + 2 + i * 4, y, x + 5 + i * 4, y + 14, '#3a2e44');
  }
}

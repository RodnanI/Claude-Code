// ANDOR :: UI drawing: logo, ornaments, panels, HUD, touch controls, menus.

// --- Logo: A as an iwan arch, N as twin minarets, D as a dome, O as the
// eight-pointed khatam star, R with a calligraphic tail into the baseline.
const LOGO_LETTERS = {
  A: ['......#......', '.....###.....', '.....###.....', '....#####....', '....##.##....', '...###.###...', '...##...##...', '..###...###..', '..##.....##..', '..##.....##..', '.###.....###.', '.###########.', '.###########.', '.##.......##.', '###.......###', '###.......###', '###.......###', '###.......###'],
  N: ['#.........#..', '##........##.', '###.......###', '###.......###', '####......###', '#####.....###', '###.##....###', '###..##...###', '###...##..###', '###....##.###', '###.....#####', '###......####', '###.......###', '###.......###', '###.......###', '###.......###', '###.......###', '###.......###'],
  D: ['#...........', '##..........', '#######.....', '###...###...', '###.....##..', '###......##.', '###......###', '###.......##', '###.......##', '###.......##', '###.......##', '###......###', '###......##.', '###.....##..', '###....###..', '###..###....', '########....', '######......'],
  R: ['#...........', '##..........', '#######.....', '###...###...', '###....###..', '###.....##..', '###....###..', '###...###...', '#######.....', '######......', '###.###.....', '###..###....', '###...###...', '###....###..', '###.....###.', '###......###', '###.......##', '###........#'],
};
function buildLogo() {
  const W = 92, H = 24;
  const m = new Uint8Array(W * H);
  const set = (x, y) => {
    if (x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = 1;
  };
  const stamp = (rows, ox, oy) => rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && set(ox + x, oy + y)));
  let x = 2;
  stamp(LOGO_LETTERS.A, x, 2);
  x += 16;
  stamp(LOGO_LETTERS.N, x, 2);
  x += 16;
  stamp(LOGO_LETTERS.D, x, 2);
  x += 15;
  // O: eight-pointed star outline with a diamond heart
  const cx = x + 8, cy = 11;
  for (let yy = -9; yy <= 9; yy++)
    for (let xx = -9; xx <= 9; xx++) {
      const sq = Math.max(Math.abs(xx), Math.abs(yy));
      const di = (Math.abs(xx) + Math.abs(yy)) / 1.414;
      const inside = (sq <= 6.6 || di <= 6.9) && !(sq <= 4.4 && di <= 4.6);
      if (inside) set(cx + xx, cy + yy);
      if (Math.abs(xx) + Math.abs(yy) <= 1) set(cx + xx, cy + yy);
    }
  x += 19;
  stamp(LOGO_LETTERS.R, x, 2);
  // kashida baseline swash sweeping from under A to beyond R
  for (let i = 4; i < W - 4; i++) {
    const y = 21 + Math.round(Math.sin((i / (W - 8)) * Math.PI) * 1.2);
    set(i, y);
    if (i > 8 && i < W - 10) set(i, y + 1);
  }
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) set(W - 4 + dx, 21 + dy);
  // diacritic diamonds above N and R
  for (const px of [24, 83]) for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) set(px + dx, 1 + dy - 1 + 1);
  // colour: bevelled gold with an ink outline and drop shadow
  const pb = new PixBuf(W + 2, H + 2);
  const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && m[yy * W + xx];
  const grad = ['#fff1b3', '#f8dd86', '#f4cf62', '#e9b546', '#dea12a', '#c48420', '#a86d16', '#8a5412'];
  for (let yy = 0; yy < H; yy++)
    for (let xx = 0; xx < W; xx++) {
      if (at(xx, yy)) continue;
      if (at(xx - 1, yy - 1)) pb.set(xx + 1, yy + 1, C('#120a05'));
    }
  for (let yy = 0; yy < H; yy++)
    for (let xx = 0; xx < W; xx++) {
      if (!at(xx, yy)) {
        if (at(xx - 1, yy) || at(xx + 1, yy) || at(xx, yy - 1) || at(xx, yy + 1)) pb.set(xx, yy, C('#1c0f08'));
        continue;
      }
      let col = grad[Math.min(grad.length - 1, Math.floor((yy / H) * grad.length))];
      if (!at(xx, yy - 1) || !at(xx - 1, yy)) col = '#fff8e0';
      else if (!at(xx, yy + 1) || !at(xx + 1, yy)) col = '#7a4410';
      pb.set(xx, yy, C(col));
    }
  return pb.toCanvas();
}
let LOGO = null;
function drawLogo(g, cx, y, scale, t) {
  if (!LOGO) LOGO = buildLogo();
  const w = LOGO.width * scale, h = LOGO.height * scale;
  const x = Math.round(cx - w / 2);
  // sweeping sheen, masked to the gold so it never touches the sky
  const sweep = ((t * 0.35) % 1.6) - 0.3;
  if (sweep > 0 && sweep < 1) {
    if (!drawLogo.tmp) drawLogo.tmp = makeCanvas(LOGO.width, LOGO.height);
    const tc = drawLogo.tmp, tg = tc.getContext('2d');
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, tc.width, tc.height);
    tg.drawImage(LOGO, 0, 0);
    tg.globalCompositeOperation = 'source-atop';
    const sx = sweep * LOGO.width;
    tg.fillStyle = 'rgba(255,248,224,0.55)';
    for (let i = 0; i < LOGO.height; i++) tg.fillRect(Math.round(sx + i * 0.5 - LOGO.height * 0.25), i, 3, 1);
    g.drawImage(tc, x, y, w, h);
  } else g.drawImage(LOGO, x, y, w, h);
}

// --- Ornaments -------------------------------------------------------------
const STAR8 = mkSprite(['...k...', '..kyk..', 'kkyYykk', 'kyYwYyk', 'kkyYykk', '..kyk..', '...k...'], { k: '#3a1e06', y: '#dea12a', Y: '#f4cf62', w: '#fff8ea' }, 3, 3);
const STAR8B = mkSprite(['....k....', '...kyk...', 'kkkyYykkk', 'kyyYwYyyk', 'kyYwwwYyk', 'kyyYwYyyk', 'kkkyYykkk', '...kyk...', '....k....'], { k: '#3a1e06', y: '#dea12a', Y: '#f4cf62', w: '#fff8ea' }, 4, 4);

// Illuminated panel: ink field with a faint girih lattice and gilded border.
const _panelCache = new Map();
function drawPanel(g, x, y, w, h, o = {}) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const key = w + 'x' + h + (o.parchment ? 'p' : '') + (o.alpha || '');
  let c = _panelCache.get(key);
  if (!c) {
    const pb = new PixBuf(w, h);
    const base = o.parchment ? ['#e9d5a6', '#dcc391', '#c9ad78'] : ['#1a110c', '#160e0a', '#22160f'];
    const lat = o.parchment ? C('#d2b98a') : C('#2a1c12');
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const v = fbm(xx / 18, yy / 18, o.parchment ? 4 : 2);
        let col = C(v > 0.56 ? base[2] : v > 0.44 ? base[0] : base[1]);
        if (GIRIH[(yy >> 1) & 7][(xx >> 1) & 7] === 't' && !o.parchment) col = lat;
        if (o.parchment && fbm(xx / 6, yy / 6, 9) > 0.7 && bayer(xx, yy) > 0.5) col = lat;
        pb.set(xx, yy, col);
      }
    const gold = C('#dea12a'), goldL = C('#f4cf62'), goldD = C('#8a5412'), ink = C('#0e0805');
    for (let xx = 0; xx < w; xx++) {
      pb.set(xx, 0, ink);
      pb.set(xx, h - 1, ink);
      pb.set(xx, 1, goldD);
      pb.set(xx, h - 2, goldD);
      pb.set(xx, 2, goldL);
      pb.set(xx, h - 3, gold);
      if (xx > 4 && xx < w - 5 && (xx % 4 === 0)) {
        pb.set(xx, 4, gold);
        pb.set(xx, h - 5, gold);
      }
    }
    for (let yy = 0; yy < h; yy++) {
      pb.set(0, yy, ink);
      pb.set(w - 1, yy, ink);
      pb.set(1, yy, goldD);
      pb.set(w - 2, yy, goldD);
      pb.set(2, yy, goldL);
      pb.set(w - 3, yy, gold);
      if (yy > 4 && yy < h - 5 && yy % 4 === 0) {
        pb.set(4, yy, gold);
        pb.set(w - 5, yy, gold);
      }
    }
    c = pb.toCanvas();
    if (_panelCache.size > 40) _panelCache.clear();
    _panelCache.set(key, c);
  }
  if (o.alpha) g.globalAlpha = o.alpha;
  g.drawImage(c, x, y);
  g.globalAlpha = 1;
  for (const [cx, cy] of [[x + 3, y + 3], [x + w - 4, y + 3], [x + 3, y + h - 4], [x + w - 4, y + h - 4]]) drawSprite(g, STAR8, cx + 0.5, cy + 0.5);
}
// Horizontal flourish divider.
function drawDivider(g, cx, y, w, col = '#dea12a') {
  const x0 = Math.round(cx - w / 2);
  fillR(g, x0, y, w, 1, col);
  fillR(g, x0 + 4, y + 1, w - 8, 1, '#6e3f10');
  drawSprite(g, STAR8, cx, y);
  fillR(g, x0 - 2, y - 1, 2, 3, col);
  fillR(g, x0 + w, y - 1, 2, 3, col);
}

// --- Menu widget -------------------------------------------------------------
// items: [{label, action, disabled, value (string), adjust(dir)}]
class Menu {
  constructor(items, o = {}) {
    this.items = items;
    this.sel = 0;
    this.o = o;
    this.rects = [];
    this.t = 0;
    while (this.items[this.sel] && this.items[this.sel].disabled) this.sel++;
  }
  move(d) {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      this.sel = (this.sel + d + n) % n;
      if (!this.items[this.sel].disabled) break;
    }
    Sfx.play('menu');
  }
  update(dt) {
    this.t += dt;
    const it = this.items[this.sel];
    if (Input.takePress('up')) this.move(-1);
    if (Input.takePress('down')) this.move(1);
    if (it && it.adjust) {
      if (Input.takePress('left')) it.adjust(-1);
      if (Input.takePress('right')) it.adjust(1);
    }
    // mouse hover
    if (Input.hover && !Input.touchMode) {
      const p = screenToView(Input.hover);
      this.rects.forEach((r, i) => {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h && !this.items[i].disabled && this.sel !== i) {
          this.sel = i;
          Sfx.play('menu');
        }
      });
    }
    for (const tap of Input.taps) {
      const p = screenToView(tap);
      this.rects.forEach((r, i) => {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 2 && p.y <= r.y + r.h + 2 && !this.items[i].disabled) {
          this.sel = i;
          const item = this.items[i];
          if (item.adjust) item.adjust(p.x < r.x + r.w / 2 ? -1 : 1);
          else this.activate();
        }
      });
    }
    if (Input.takePress('confirm')) {
      if (it && it.adjust && !it.action) it.adjust(1);
      else this.activate();
    }
    if (Input.takePress('back') && this.o.onBack) {
      Sfx.play('back');
      this.o.onBack();
    }
  }
  activate() {
    const it = this.items[this.sel];
    if (!it || it.disabled) return;
    Sfx.play('select');
    if (it.action) it.action();
  }
  draw(g, cx, y, o = {}) {
    const lh = o.lineH || 13;
    this.rects = [];
    const w = o.width || 150;
    this.items.forEach((it, i) => {
      const yy = y + i * lh;
      const sel = i === this.sel;
      const col = it.disabled ? '#6e5a44' : sel ? '#f4cf62' : '#e9dcc0';
      let label = it.label;
      if (it.value !== undefined) label = it.label + '   ' + (typeof it.value === 'function' ? it.value() : it.value);
      drawText(g, label, cx, yy, col, { align: 'center', shadow: '#0e0805' });
      if (sel && !it.disabled) {
        const tw = textWidth(label);
        const bob = Math.round(Math.sin(this.t * 6) * 1);
        drawSprite(g, STAR8, cx - tw / 2 - 8 - bob, yy + 4);
        drawSprite(g, STAR8, cx + tw / 2 + 8 + bob, yy + 4);
        if (it.adjust) {
          drawText(g, '{', cx - tw / 2 - 18, yy, '#dea12a');
          drawText(g, '}', cx + tw / 2 + 13, yy, '#dea12a');
        }
      }
      this.rects.push({ x: cx - w / 2, y: yy - 2, w, h: lh - 1 });
    });
  }
}
function screenToView(p) {
  return { x: p.x - Screen.vx, y: p.y - Screen.vy };
}

// --- HUD -----------------------------------------------------------------
function drawHeart(g, x, y, state, t) {
  // state 2 = full, 1 = bitten, 0 = empty
  const s = ART.pomegranate;
  if (state === 0) {
    g.globalAlpha = 0.35;
    drawSprite(g, s, x, y, false, false);
    g.globalAlpha = 1;
    fillR(g, x - 3, y - 6, 7, 5, 'rgba(14,8,5,0.6)');
    return;
  }
  drawSprite(g, s, x, y);
}
function drawHUD(g, vw, vh, t) {
  const p = Game.player;
  if (!p) return;
  const H = Game.hud;
  H.pulse = Math.max(0, H.pulse - STEP * 2);
  // health
  for (let i = 0; i < p.maxHp; i++) {
    const full = i < p.hp;
    const bob = full && p.hp === 1 ? Math.round(Math.sin(t * 10) * 1) : 0;
    drawHeart(g, 9 + i * 11, 13 + bob - (H.pulse > 0 && full ? 1 : 0), full ? 2 : 0, t);
  }
  if (p.feather) {
    const fx = 9 + p.maxHp * 11 + 2;
    fillR(g, fx, 5, 1, 8, '#3fb5a3');
    fillR(g, fx + 1, 4, 1, 7, '#8de0c8');
    fillR(g, fx - 1, 7, 1, 5, '#dea12a');
  }
  // dinars
  drawSprite(g, ART.coin[0], 7, 27);
  drawText(g, String(Game.run.coins), 13, 20, '#f4cf62', { outline: '#0e0805' });
  // relic slots
  const rs = Game.runRelics;
  for (let i = 0; i < 3; i++) {
    const x = vw - (Input.touchMode && TouchUI.visible ? 28 : 10) - (2 - i) * 11, y = 13;
    if (rs[i]) drawSprite(g, ART.relics[Game.level.theme.name], x, y + 5);
    else {
      fillR(g, x - 3, y - 3, 7, 7, 'rgba(14,8,5,0.5)');
      drawSprite(g, STAR8, x, y);
    }
  }
  if (Settings.showTimer) drawText(g, fmtTime(Game.run.time), vw / 2, 4, '#e9dcc0', { align: 'center', outline: '#0e0805' });
  // compass needle toward the nearest unfound relic
  if (Game.upgrades().compass && Game.level) {
    let best = null, bd = 1e9;
    for (const e of Game.entities) if (e instanceof Relic) {
      const d = dist(e.cx, e.cy, p.cx, p.cy);
      if (d < bd) { bd = d; best = e; }
    }
    if (best && bd > 60) {
      const a = Math.atan2(best.cy - p.cy, best.cx - p.cx);
      const cx = Math.round(p.cx - Cam.rx + Math.cos(a) * 20), cy = Math.round(p.cy - Cam.ry + Math.sin(a) * 20);
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5);
      fillR(g, cx - 1, cy - 1, 3, 3, '#f4cf62');
      fillR(g, cx, cy, 1, 1, '#fff8ea');
      g.globalAlpha = 1;
    }
  }
  // boss bar
  const b = Game.boss;
  if (b && !b.dead && b.introDone) {
    const w = Math.min(180, vw - 40), x = Math.round(vw / 2 - w / 2), y = vh - 16;
    drawText(g, b.title, vw / 2, y - 11, '#f4cf62', { align: 'center', outline: '#0e0805' });
    fillR(g, x - 2, y - 2, w + 4, 8, '#0e0805');
    fillR(g, x - 1, y - 1, w + 2, 6, '#6e3f10');
    fillR(g, x, y, w, 4, '#2a1410');
    const fw = Math.round((w * Math.max(0, b.hp)) / b.maxHp);
    b.shownHp = b.shownHp === undefined ? fw : approach(b.shownHp, fw, 60 * STEP);
    fillR(g, x, y, b.shownHp, 4, '#f4cf62');
    fillR(g, x, y, fw, 4, '#c0392b');
    fillR(g, x, y, fw, 1, '#ef7d52');
    drawSprite(g, STAR8, x - 3, y + 2);
    drawSprite(g, STAR8, x + w + 3, y + 2);
  }
  // banner
  if (Game.bannerT > 0) {
    const a = Math.min(1, Game.bannerT * 3, (Game.bannerMax - Game.bannerT) * 4);
    g.globalAlpha = a;
    const bw = textWidth(Game.bannerText) + 24;
    fillR(g, vw / 2 - bw / 2, 34, bw, 13, 'rgba(14,8,5,0.75)');
    fillR(g, vw / 2 - bw / 2, 34, bw, 1, '#dea12a');
    fillR(g, vw / 2 - bw / 2, 46, bw, 1, '#dea12a');
    drawText(g, Game.bannerText, vw / 2, 37, '#f4cf62', { align: 'center' });
    g.globalAlpha = 1;
  }
}
function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60), cs = Math.floor((s * 100) % 100);
  return m + ':' + String(ss).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
}

// --- Touch controls ----------------------------------------------------------
function drawTouchControls(g, t) {
  if (!Input.touchMode || !TouchUI.visible) return;
  const portrait = Screen.portrait;
  if (portrait) {
    // the handheld deck: carved wood with brass trim
    const y0 = Screen.vh;
    const dh = Screen.H - y0;
    if (!drawTouchControls.deck || drawTouchControls.deck.width !== Screen.W || drawTouchControls.deck.height !== dh) {
      const pb = new PixBuf(Screen.W, dh);
      for (let y = 0; y < dh; y++)
        for (let x = 0; x < Screen.W; x++) {
          const v = fbm(x / 30, y / 8, 31);
          let col = v > 0.55 ? '#3a2416' : v > 0.42 ? '#2f1d12' : '#26170e';
          if (GIRIH[(y >> 2) & 7][(x >> 2) & 7] === 't' && v > 0.5) col = '#432a19';
          pb.set(x, y, C(col));
        }
      for (let x = 0; x < Screen.W; x++) {
        pb.set(x, 0, C('#0e0805'));
        pb.set(x, 1, C('#f4cf62'));
        pb.set(x, 2, C('#a86d16'));
        pb.set(x, 3, C('#6e3f10'));
      }
      drawTouchControls.deck = pb.toCanvas();
    }
    g.drawImage(drawTouchControls.deck, 0, y0);
  }
  const alpha = portrait ? 1 : 0.55;
  const sc = Settings.touchSize || 1;
  for (const c of Input.controls) {
    if (c.id === 'pause') {
      g.globalAlpha = 0.7;
      fillR(g, c.x - 7, c.y - 7, 14, 14, '#1a110c');
      fillR(g, c.x - 7, c.y - 7, 14, 1, '#dea12a');
      fillR(g, c.x - 7, c.y + 6, 14, 1, '#8a5412');
      fillR(g, c.x - 3, c.y - 3, 2, 7, '#f4cf62');
      fillR(g, c.x + 2, c.y - 3, 2, 7, '#f4cf62');
      g.globalAlpha = 1;
      continue;
    }
    const pressed = Input.touch[c.id];
    const r = Math.round(c.r * sc);
    g.globalAlpha = pressed ? Math.min(1, alpha + 0.3) : alpha;
    pxCircle(g, c.x, c.y + 1, r, '#0e0805');
    pxCircle(g, c.x, c.y, r, pressed ? '#6e3f10' : '#2a1a10');
    pxRing(g, c.x, c.y, r, '#dea12a');
    pxRing(g, c.x, c.y, r - 2, pressed ? '#f4cf62' : '#8a5412');
    // eight-point star motif inside
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + (pressed ? 0.2 : 0);
      fillR(g, c.x + Math.cos(a) * (r - 4), c.y + Math.sin(a) * (r - 4), 1, 1, '#6e3f10');
    }
    const ic = pressed ? '#fff8ea' : '#f4cf62';
    if (c.id === 'jump') {
      for (let i = 0; i < 5; i++) fillR(g, c.x - i, c.y - 3 + i, i * 2 + 1, 1, ic);
      fillR(g, c.x - 1, c.y + 2, 3, 4, ic);
    } else if (c.id === 'whip') {
      // a coiled lash
      for (let i = 0; i < 10; i++) {
        const a = i * 0.75;
        fillR(g, c.x + Math.cos(a) * (1 + i * 0.45) - 1, c.y + Math.sin(a) * (1 + i * 0.45), 1, 1, ic);
      }
      fillR(g, c.x + 3, c.y + 3, 3, 1, ic);
      fillR(g, c.x + 5, c.y + 4, 2, 1, ic);
    } else if (c.id === 'roll') {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU * 0.85;
        fillR(g, c.x + Math.cos(a) * 4, c.y + Math.sin(a) * 4, 1, 1, ic);
      }
      fillR(g, c.x + 3, c.y - 2, 3, 1, ic);
      fillR(g, c.x + 4, c.y - 3, 1, 3, ic);
    }
    g.globalAlpha = 1;
  }
  // joystick
  const s = Input.stick;
  const R = TouchUI.stickR;
  const ox = s ? s.ox : TouchUI.stickHome.x, oy = s ? s.oy : TouchUI.stickHome.y;
  g.globalAlpha = s ? 0.85 : portrait ? 0.7 : 0.35;
  pxRing(g, ox, oy, R, '#dea12a');
  pxRing(g, ox, oy, R - 1, '#6e3f10');
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    fillR(g, ox + Math.cos(a) * (R - 4) - 1, oy + Math.sin(a) * (R - 4) - 1, 2, 2, '#8a5412');
  }
  let kx = ox, ky = oy;
  if (s) {
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy);
    const m = Math.min(d, R * 0.7);
    if (d > 0) {
      kx = ox + (dx / d) * m;
      ky = oy + (dy / d) * m;
    }
  }
  pxCircle(g, kx, ky + 1, R * 0.45, '#0e0805');
  pxCircle(g, kx, ky, R * 0.45, '#3a2416');
  pxRing(g, kx, ky, R * 0.45, '#f4cf62');
  drawSprite(g, STAR8, kx + 0.5, ky + 0.5);
  g.globalAlpha = 1;
}

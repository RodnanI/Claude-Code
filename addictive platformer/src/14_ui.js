// SQUEAKBORNE :: UI
// HUD, toasts, banners, modal menus, title, options, rebinding, map, death and victory screens.

const UI = {
  modal: null, toasts: [], bannerD: null, card: null, t: 0,
  open(m) { this.modal = m; Input.clearAll(); sfx('select'); AudioSys.muffle(true); },
  close() { this.modal = null; Input.clearAll(); AudioSys.muffle(Game.state === 'pause'); },
  toast(title, sub, col = C.yl1) { this.toasts.push({ title, sub, col, t: 210 }); if (this.toasts.length > 4) this.toasts.shift(); },
  banner(title, sub, col = C.yl1) { this.bannerD = { title, sub, col, t: 200 }; },
  titleCard(title, sub) { this.card = { title, sub, t: 220 }; },
  update() {
    this.t++;
    for (const t of this.toasts) t.t--;
    this.toasts = this.toasts.filter((t) => t.t > 0);
    if (this.bannerD && --this.bannerD.t <= 0) this.bannerD = null;
    if (this.card && --this.card.t <= 0) this.card = null;
    if (this.modal) this.modal.update();
  },
  drawOverlays() {
    // toasts
    this.toasts.forEach((t, i) => {
      const a = min(1, t.t / 20, (210 - t.t) / 10);
      const w = max(textW(t.title), textW(t.sub, '3')) + 16, x = W / 2 - w / 2, y = 28 + i * 26 - (1 - a) * 10;
      g.globalAlpha = a;
      panel(x, y, w, 22, C.night, t.col);
      txt(t.title, W / 2, y + 4, t.col, { a: 'c' });
      txt(t.sub, W / 2, y + 13, C.st4, { a: 'c', f: '3' });
      g.globalAlpha = 1;
    });
    if (this.bannerD) {
      const b = this.bannerD, k = min(1, (200 - b.t) / 12), out = b.t < 20 ? b.t / 20 : 1;
      g.globalAlpha = out;
      R(g, 0, 98, W, 46 * k, rgba(C.ink, 0.75));
      txt(b.title, W / 2, 106, b.col, { a: 'c', sc: 2, ol: C.ink, wave: 1, t: this.t });
      txt(b.sub, W / 2, 128, C.fu3, { a: 'c', ol: C.ink });
      g.globalAlpha = 1;
    }
    if (this.card && !this.modal) {
      const c = this.card, k = ease.outBack(min(1, (220 - c.t) / 30)), out = c.t < 30 ? c.t / 30 : 1;
      g.globalAlpha = out;
      const y = lerp(30, 58, k);
      const tw = textW(c.title, '5', 2);
      R(g, W / 2 - tw / 2 - 24, y + 22, tw + 48, 1, rgba(C.yl1, 0.6));
      txt(c.title, W / 2, y, C.yl2, { a: 'c', sc: 2, ol: C.ink });
      txt(c.sub.toUpperCase(), W / 2, y + 27, C.fu3, { a: 'c', f: '3', ol: C.ink });
      g.globalAlpha = 1;
    }
  },
};

// ---------------- HUD ----------------
function drawHUD() {
  const p = pl;
  if (!p) return;
  const t = UI.t;
  // health
  const bx = 8, by = 8, bw = 112;
  R(g, bx - 1, by - 1, bw + 2, 11, C.ink);
  R(g, bx, by, bw, 9, C.dk1);
  const hpw = round(bw * max(0, p.hp) / p.maxHp), rw = round(bw * min(p.maxHp, max(0, p.hp) + p.rally) / p.maxHp);
  R(g, bx, by, rw, 9, C.or1);
  const low = p.hp < p.maxHp * 0.25;
  R(g, bx, by, hpw, 9, low && t % 30 < 15 ? C.rd3 : C.rd2);
  R(g, bx, by, hpw, 2, rgba('#ffffff', 0.25));
  R(g, bx, by + 7, hpw, 2, rgba('#000000', 0.25));
  for (let i = 1; i < 8; i++) R(g, bx + round((bw * i) / 8), by, 1, 9, rgba(C.ink, 0.35));
  txt(round(max(0, p.hp)) + '/' + p.maxHp, bx + bw / 2, by + 2, '#fff6ea', { a: 'c', f: '3', ol: C.ink });
  if (Run.curse > 0) { txt('\u2620' + Run.curse, bx + bw + 6, by + 1, C.vi2, { ol: C.ink }); }
  // cheese charges
  for (let i = 0; i < p.maxFlasks; i++) {
    const has = i < p.flasks;
    const x = bx + i * 13, y = by + 13;
    g.globalAlpha = has ? 1 : 0.3;
    spr(SPR.cheese, x + 6, y + 10, false, false);
    g.globalAlpha = 1;
  }
  if (p.healT > 0) txt('NOM', bx + p.maxFlasks * 13 + 4, by + 16, C.yl1, { f: '3', ol: C.ink });
  // currency
  txt('\u25cf ' + Run.gold, bx, by + 30, C.yl1, { ol: C.ink });
  txt('\u25c6 ' + Run.crumbs, bx + 60, by + 30, C.br5, { ol: C.ink });
  // stats
  const st = Run.stats;
  txt('{r}' + st.fury + ' {t}' + st.cunning + ' {y}' + st.grit, bx, by + 42, C.wh, { f: '3', ol: C.ink });
  // buffs
  let bxx = bx + 40;
  for (const [k, lab, col] of [['sass', 'SASS', C.rd3], ['sugar', 'SUGAR', C.fu4], ['garlic', 'STINK', C.gr3], ['bubble', 'BUBBLE', C.tl4], ['slowed', 'WEBBED', C.st4]]) {
    if (p.buffs[k]) { txt(lab, bxx, by + 42, col, { f: '3', ol: C.ink }); bxx += textW(lab, '3') + 6; }
  }
  if (p.comboStacks && p.buffs.comboT) txt('COMBO x' + p.comboStacks, bxx, by + 42, C.or2, { f: '3', ol: C.ink });
  // slots
  const keys = ['atk1', 'atk2', 'skill1', 'skill2'];
  for (let i = 0; i < 4; i++) {
    const it = p.slots[i];
    const x = 8 + i * 27 + (i >= 2 ? 6 : 0), y = H - 30;
    const col = it ? RARITY[it.rar].col : C.dk3;
    panel(x, y, 24, 24, C.night, col);
    if (it) {
      spr(itemIcon(it.def), x + 12, y + 21);
      const cdMax = it.def.kind === 'skill' || it.def.kind === 'ranged' ? cooldownOf(it) : 0;
      if (it.cd > 0 && cdMax > 0) {
        const f = it.cd / cdMax;
        R(g, x + 1, y + 1 + round(22 * (1 - f)), 22, round(22 * f), rgba(C.ink, 0.7));
        if (it.cd > 30) txt(ceil(it.cd / 60), x + 12, y + 9, '#fff6ea', { a: 'c', f: '3', ol: C.ink });
      } else if (it.cd <= 0 && cdMax > 60 && t % 60 < 4) R(g, x + 1, y + 1, 22, 22, rgba('#ffffff', 0.2));
      R(g, x + 1, y + 1, 4, 3, STATS[it.def.stat].col);
    }
    txt(Input.label(keys[i]), x + 12, y - 7, C.st4, { a: 'c', f: '3', ol: C.ink });
  }
  // minimap + timer
  drawMinimap(W - 88, 6);
  if (Save.data.settings.timer) txt(fmtTime(Run.time), W - 8, 62, C.st4, { a: 'r', f: '3', ol: C.ink });
  if (lv && lv.name) txt(lv.name, W - 8, 70, C.st3, { a: 'r', f: '3', ol: C.ink });
  if (Run.spice > 0) txt('SPICE ' + Run.spice, W - 8, 78, C.rd3, { a: 'r', f: '3', ol: C.ink });
  // boss bar
  const b = lv && lv.boss;
  if (b && !b.dead && b.state !== 'sleep') {
    const w = 220, x = W / 2 - w / 2 + 14, y = H - 22;
    txt(b.info.name, W / 2, y - 10, C.yl2, { a: 'c', ol: C.ink });
    R(g, x - 2, y - 2, w + 4, 10, C.ink);
    R(g, x, y, w, 6, C.dk1);
    let shown = b.hp;
    if (b instanceof Mittens) {
      const per = b.barHp, cur = b.hp - per * (2 - b.bar);
      shown = clamp(cur / per, 0, 1) * b.maxHp;
      txt('LIVES x' + b.lives, x + w, y - 10, C.or2, { a: 'r', f: '3', ol: C.ink });
    }
    b.shownHp = b.shownHp === undefined ? shown : lerp(b.shownHp, shown, 0.08);
    R(g, x, y, round(w * clamp(b.shownHp / b.maxHp, 0, 1)), 6, C.yl1);
    R(g, x, y, round(w * clamp(shown / b.maxHp, 0, 1)), 6, C.rd2);
    R(g, x, y, round(w * clamp(shown / b.maxHp, 0, 1)), 1, C.rd3);
  }
  // interaction prompt & item tooltip
  if (!p.dead && Game.state === 'play' && !UI.modal) {
    const it = p.nearInteract();
    if (it) {
      const lab = '[' + Input.label('interact') + '] ' + (it.prompt || 'USE');
      const sx = round(it.cx - Cam.rx), sy = round(it.y - Cam.ry - 14 + sin(t * 0.15) * 1.5);
      txt(lab, sx, sy, C.yl1, { a: 'c', f: '3', ol: C.ink });
      if (it instanceof ItemDrop) drawItemCard(it.it, W / 2 - 100, H - 98, it.price);
    }
  }
}
function drawItemCard(it, x, y, price, noCompare) {
  const lines = itemDesc(it).flatMap((l) => wrapText(l, 188, '3'));
  const h = 30 + lines.length * 7 + 12;
  y = min(y, H - h - 36);
  panel(x, y, 200, h, C.night, RARITY[it.rar].col);
  spr(itemIcon(it.def), x + 12, y + 20);
  txt(it.name, x + 24, y + 4, RARITY[it.rar].col, { f: '3' });
  const kindLab = it.def.kind === 'skill' ? 'SKILL' : it.def.kind === 'shield' ? 'SHIELD' : it.def.kind === 'ranged' ? 'RANGED' : 'MELEE';
  txt(RARITY[it.rar].name.toUpperCase() + ' ' + kindLab + '  LV ' + it.lvl + '  {' + (it.def.stat === 'fury' ? 'r' : it.def.stat === 'cunning' ? 't' : 'y') + '}' + STATS[it.def.stat].name.toUpperCase(), x + 24, y + 12, C.st4, { f: '3' });
  const dlab = it.def.kind === 'melee' ? 'DPS ' + itemDps(it) : it.def.id === 'sugar' ? 'BUFF' : 'DMG ' + itemDps(it);
  txt(dlab, x + 24, y + 20, C.wh, { f: '3' });
  const same = pl.slots.filter((s, i) => s && (it.def.kind === 'skill' ? i >= 2 : i < 2));
  if (same.length && !noCompare) txt('VS ' + same.map((s) => (s.def.kind === 'melee' ? itemDps(s) : itemDps(s))).join(' / '), x + 196, y + 20, C.st3, { f: '3', a: 'r' });
  lines.forEach((l, i) => txt(l, x + 6, y + 30 + i * 7, C.fu3, { f: '3' }));
  if (price) txt('PRICE ' + price + ' \u25cf', x + 196, y + 4, Run.gold >= price ? C.yl1 : C.rd3, { f: '3', a: 'r' });
}
function roomAt(x, y) {
  if (!lv) return null;
  const tx = floor(x / TS), ty = floor(y / TS);
  for (const r of lv.rooms) {
    const w = r.w || RW, h = r.h || RH;
    if (tx >= r.x0 && tx < r.x0 + w && ty >= r.y0 && ty < r.y0 + h) return r;
  }
  return null;
}
function drawMinimap(x, y) {
  if (!lv || lv.kind !== 'biome') return;
  const B = BIOMES[lv.biome], cw = 13, ch = 8;
  const mw = B.gw * cw, mh = B.gh * ch;
  const ox = x + 80 - mw;
  R(g, ox - 2, y - 2, mw + 4, mh + 4, C.ink);
  R(g, ox - 1, y - 1, mw + 2, mh + 2, C.dk1);
  const cur = roomAt(pl.cx, pl.cy);
  for (const r of lv.rooms) {
    if (r.hidden) continue;
    const show = r.visited || hasUpg('mapper');
    if (!show) continue;
    const rx = ox + r.gx * cw, ry = y + r.gy * ch;
    let col = r.visited ? C.st2 : C.dk3;
    if (r.role === 'exit') col = C.yl0; else if (r.role === 'shop') col = C.gr2; else if (r.role === 'snack' || r.role === 'chest' || r.role === 'curse' || r.role === 'food' || r.role === 'secret') col = r.visited ? C.or0 : col;
    R(g, rx, ry, cw - 1, ch - 1, col);
    if (r === cur && UI.t % 30 < 20) R(g, rx + 4, ry + 2, 4, 3, C.wh);
  }
}

// ---------------- generic menu ----------------
class Menu {
  constructor(title, items, o = {}) { this.title = title; this.items = items; this.sel = 0; this.t = 0; this.o = o; this.fixSel(1); }
  fixSel(d) {
    for (let k = 0; k < this.items.length; k++) {
      const it = this.items[this.sel];
      if (it && !it.header && !(it.dis && it.dis())) return;
      this.sel = (this.sel + d + this.items.length) % this.items.length;
    }
  }
  update() {
    this.t++;
    if (Input.mp('up')) { this.sel = (this.sel - 1 + this.items.length) % this.items.length; this.fixSel(-1); sfx('menu'); }
    if (Input.mp('down')) { this.sel = (this.sel + 1) % this.items.length; this.fixSel(1); sfx('menu'); }
    const it = this.items[this.sel];
    if (!it) return;
    if (Input.mp('left') && it.left) { it.left(); sfx('menu'); }
    if (Input.mp('right') && it.right) { it.right(); sfx('menu'); }
    if (Input.mpress('ok') && this.t > 4) { if (it.ok) { it.ok(); sfx('select'); } else if (it.right) { it.right(); sfx('menu'); } }
    else if (Input.mpress('back') && this.t > 4 && this.o.back) { this.o.back(); sfx('back'); }
  }
  draw(cx = W / 2, top = 70) {
    if (this.title) txt(this.title, cx, top - 22, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    let y = top;
    this.items.forEach((it, i) => {
      if (it.header) { txt(it.header, cx, y + 2, C.st3, { a: 'c', f: '3' }); y += 12; return; }
      const s = i === this.sel, dis = it.dis && it.dis();
      const lab = typeof it.label === 'function' ? it.label() : it.label;
      const val = it.value ? it.value() : '';
      const col = dis ? C.dk3 : s ? C.yl1 : C.fu3;
      if (val) { txt(lab, cx - 8, y, col, { a: 'r', ol: C.ink }); txt(val, cx + 8, y, s ? C.wh : C.st4, { ol: C.ink }); }
      else txt(lab, cx, y, col, { a: 'c', ol: C.ink, wave: s ? 1 : 0, t: this.t });
      if (s) { const w = val ? 0 : textW(lab) / 2; txt('\u2192', cx - (val ? textW(lab) + 18 : w + 12), y, C.yl1, { ol: C.ink }); }
      y += it.gap || 13;
    });
    const it = this.items[this.sel];
    if (it && it.desc) {
      const d = typeof it.desc === 'function' ? it.desc() : it.desc;
      wrapText(d, 300, '3').forEach((l, i) => txt(l, cx, y + 8 + i * 7, C.st4, { a: 'c', f: '3', ol: C.ink }));
    }
  }
}
function dimBg(a = 0.7) { R(g, 0, 0, W, H, rgba(C.ink, a)); }

class ChoiceMenu {
  constructor(title, sub, opts) { this.title = title; this.sub = sub; this.opts = opts; this.sel = 0; this.t = 0; }
  update() {
    this.t++;
    if (Input.mp('left')) { this.sel = (this.sel - 1 + this.opts.length) % this.opts.length; sfx('menu'); }
    if (Input.mp('right')) { this.sel = (this.sel + 1) % this.opts.length; sfx('menu'); }
    if (Input.mpress('ok') && this.t > 10) { const o = this.opts[this.sel]; UI.close(); o.fn(); }
    else if (Input.mpress('back') && this.t > 10) UI.close();
  }
  draw() {
    dimBg(0.72);
    txt(this.title, W / 2, 34, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    txt(this.sub, W / 2, 56, C.st4, { a: 'c', ol: C.ink });
    const n = this.opts.length, cw = 120, gap = 14, tot = n * cw + (n - 1) * gap, x0 = W / 2 - tot / 2;
    this.opts.forEach((o, i) => {
      const s = i === this.sel, x = x0 + i * (cw + gap), y = 78 - (s ? 4 : 0);
      panel(x, y, cw, 130, s ? C.dk1 : C.night, s ? o.col : C.dk3);
      if (o.iconSpr) spr(o.iconSpr, x + cw / 2, y + 34);
      else if (o.icon !== false) { DISC(g, x + cw / 2, y + 22, 9, C.ink); DISC(g, x + cw / 2, y + 22, 8, o.col); PX(g, x + cw / 2 - 3, y + 18, C.wh); }
      wrapText(o.label.toUpperCase(), cw - 10).forEach((l, k) => txt(l, x + cw / 2, y + 42 + k * 10, o.col, { a: 'c', ol: C.ink }));
      wrapText(o.desc, cw - 12, '3').forEach((l, k) => txt(l, x + cw / 2, y + 66 + k * 8, C.fu3, { a: 'c', f: '3' }));
    });
    txt('\u2190 \u2192 CHOOSE   [' + keyLabel(MENU_KEYS.ok[0]) + '/' + Input.label('jump') + '] CONFIRM   [ESC] LATER', W / 2, H - 22, C.st3, { a: 'c', f: '3', ol: C.ink });
  }
}
class SwapMenu {
  constructor(drop, slots) { this.drop = drop; this.slots = slots; this.t = 0; }
  update() {
    this.t++;
    for (const i of this.slots) if (Input.p(SLOT_KEYS[i]) && this.t > 6) return this.swap(i);
    if (Input.mpress('left')) return this.swap(this.slots[0]);
    if (Input.mpress('right')) return this.swap(this.slots[1]);
    if ((Input.mpress('back') || Input.p('interact')) && this.t > 6) UI.close();
  }
  swap(i) {
    const old = pl.slots[i];
    pl.equip(i, this.drop.it);
    this.drop.it = old; this.drop.spr = itemIcon(old.def); this.drop.vy = -3; this.drop.noGrav = false; this.drop.price = 0; this.drop.prompt = 'TAKE';
    UI.close();
  }
  draw() {
    dimBg(0.6);
    txt('SWAP WITH WHICH SLOT?', W / 2, 30, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    drawItemCard(this.drop.it, W / 2 - 100, 54);
    this.slots.forEach((s, k) => {
      const it = pl.slots[s], x = k === 0 ? 40 : W - 200;
      txt('[' + Input.label(SLOT_KEYS[s]) + '] or ' + (k ? '\u2192' : '\u2190'), x + 80, 150, C.yl1, { a: 'c', ol: C.ink });
      if (it) drawItemCard(it, x, 162, 0, true);
    });
    txt('[ESC] KEEP CURRENT GEAR', W / 2, H - 12, C.st3, { a: 'c', f: '3', ol: C.ink });
  }
}
class HoarderMenu {
  constructor() { this.tab = 0; this.sel = 0; this.t = 0; }
  list() {
    if (this.tab === 0) return Save.data.found.filter((id) => !Save.data.unlocked.includes(id)).map((id) => ({ id, name: ITEMS[id].name, desc: ITEMS[id].desc, cost: BLUEPRINT_COST[id] || 40, bp: true }));
    return UPGRADES.filter((u) => !hasUpg(u.id) && (!u.req || hasUpg(u.req))).map((u) => ({ id: u.id, name: u.name, desc: u.desc, cost: u.cost, up: true }));
  }
  update() {
    this.t++;
    const L = this.list();
    if (Input.mp('left') || Input.mp('right')) { this.tab = 1 - this.tab; this.sel = 0; sfx('menu'); }
    if (Input.mp('up')) { this.sel = max(0, this.sel - 1); sfx('menu'); }
    if (Input.mp('down')) { this.sel = min(L.length - 1, this.sel + 1); sfx('menu'); }
    if (Input.mpress('ok') && this.t > 8 && L[this.sel]) {
      const e = L[this.sel];
      if (Save.data.crumbs < e.cost) { sfx('deny'); return; }
      Save.data.crumbs -= e.cost;
      if (e.bp) Save.data.unlocked.push(e.id); else Save.data.upg[e.id] = true;
      if (e.id.startsWith('flask') && pl) { pl.maxFlasks = flaskCount(); pl.flasks = pl.maxFlasks; }
      if (e.id === 'thick' && pl && Run) pl.recalc();
      Save.write();
      sfx('buy');
      UI.toast((e.bp ? 'UNLOCKED: ' : 'UPGRADE: ') + e.name.toUpperCase(), e.bp ? 'It can now appear in your runs.' : e.desc, C.yl1);
      this.sel = max(0, min(this.sel, this.list().length - 1));
    }
    if (Input.mpress('back') && this.t > 8) UI.close();
  }
  draw() {
    dimBg(0.78);
    txt("THE HOARDER'S PILE", W / 2, 16, C.br5, { a: 'c', sc: 2, ol: C.ink });
    txt('\u25c6 ' + Save.data.crumbs + ' CRUMBS BANKED', W / 2, 38, C.br5, { a: 'c', ol: C.ink });
    ['BLUEPRINTS', 'UPGRADES'].forEach((tb, i) => txt((this.tab === i ? '\u2192 ' : '') + tb, W / 2 + (i ? 70 : -70), 54, this.tab === i ? C.yl1 : C.st3, { a: 'c', ol: C.ink }));
    const L = this.list();
    if (!L.length) txt(this.tab === 0 ? 'NO BLUEPRINTS FOUND YET. ELITES AND CHESTS DROP THEM.' : 'YOU BOUGHT EVERYTHING. TOUCH GRASS.', W / 2, 110, C.st4, { a: 'c', f: '3' });
    const start = max(0, min(this.sel - 4, L.length - 9));
    L.slice(start, start + 9).forEach((e, k) => {
      const i = start + k, s = i === this.sel, y = 70 + k * 16;
      panel(70, y, W - 140, 14, s ? C.dk1 : C.night, s ? C.yl1 : C.dk2);
      if (e.bp) spr(itemIcon(ITEMS[e.id]), 82, y + 15);
      txt(e.name.toUpperCase(), e.bp ? 94 : 78, y + 4, s ? C.yl1 : C.fu3, { f: '3' });
      txt(e.cost + ' \u25c6', W - 78, y + 4, Save.data.crumbs >= e.cost ? C.br5 : C.rd3, { a: 'r', f: '3' });
    });
    const e = L[this.sel];
    if (e) wrapText(e.desc, 320, '3').forEach((l, i) => txt(l, W / 2, 222 + i * 8, C.st4, { a: 'c', f: '3', ol: C.ink }));
    txt('\u2190 \u2192 TAB   \u2191 \u2193 SELECT   [ENTER] BUY   [ESC] LEAVE', W / 2, H - 12, C.st3, { a: 'c', f: '3', ol: C.ink });
  }
}
class MapView {
  constructor() { this.t = 0; }
  update() { this.t++; if ((Input.p('map') || Input.mpress('back') || Input.p('pause')) && this.t > 4) UI.close(); }
  draw() {
    dimBg(0.85);
    txt('MAP', W / 2, 14, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    if (!lv) return;
    const sc = min((W - 40) / lv.tw, (H - 80) / lv.th, 3);
    const ox = round(W / 2 - (lv.tw * sc) / 2), oy = round(40 + (H - 80 - lv.th * sc) / 2);
    const known = (tx, ty) => { const r = roomAt(tx * TS + 1, ty * TS + 1); return r && !r.hidden && (r.visited || hasUpg('mapper')); };
    for (let ty = 0; ty < lv.th; ty++) for (let tx = 0; tx < lv.tw; tx++) {
      if (!known(tx, ty)) continue;
      const t = lv.get(tx, ty);
      const col = isSolidT(t) ? C.st1 : t === T_PLAT ? C.br2 : t === T_SPIKE ? C.rd1 : C.dk1;
      R(g, ox + tx * sc, oy + ty * sc, ceil(sc), ceil(sc), col);
    }
    for (const it of lv.items) {
      const tx = floor(it.cx / TS), ty = floor(it.cy / TS);
      if (!known(tx, ty) || it.dead) continue;
      let col = null;
      if (it instanceof Door) col = C.yl1; else if (it instanceof Chest && !it.open) col = it.cursed ? C.vi2 : C.or2; else if (it instanceof SnackAltar && !it.used) col = C.rd3; else if (it instanceof Shopkeeper) col = C.gr3; else if (it instanceof Food) col = C.yl0;
      if (col) R(g, ox + it.cx / TS * sc - 1, oy + it.cy / TS * sc - 1, 3, 3, col);
    }
    if (this.t % 30 < 20) R(g, ox + (pl.cx / TS) * sc - 1, oy + (pl.cy / TS) * sc - 2, 3, 4, C.wh);
    txt('{y}\u25a0{/} EXIT  {o}\u25a0{/} CHEST  {r}\u25a0{/} SNACK  {g}\u25a0{/} SHOP  {c}\u25a0{/} FOOD', W / 2, H - 14, C.st4, { a: 'c', f: '3' });
  }
}

// ---------------- title screen ----------------
const Title = {
  t: 0, menu: null, sub: null, mouse: null,
  enter() {
    this.t = 0; this.sub = null;
    Music.play('title');
    this.mouse = { x: 0, y: 0, w: 8, h: 14, face: 1, vx: 0, t: 0, hat: Save.data.hat, tail: chainInit(7, 0, 0), scarf: chainInit(6, 0, 0), get cx() { return this.x + 4; }, get bot() { return this.y + 14; } };
    this.mouse.x = 300; this.mouse.y = 196;
    this.mouse.tail = chainInit(7, 296, 206); this.mouse.scarf = chainInit(6, 297, 200);
    this.build();
  },
  build() {
    const S = Save.data;
    const items = [
      { label: 'START RUN', ok: () => { Game.seedLabel = null; Game.startHub(MR.int(1, 999999999), S.spice); } },
      { label: 'DAILY RUN', ok: () => { const d = new Date(); const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); Game.seedLabel = 'DAILY ' + key; Game.startHub(hashStr('daily' + key), S.spice); }, desc: 'Same levels for everyone today. Compare times with friends.' },
      { label: 'SEEDED RUN', ok: () => { this.sub = new SeedMenu(); } },
    ];
    if (S.spiceMax > 0) items.push({ label: 'SPICE', value: () => S.spice + ' ' + SPICE[S.spice].name.toUpperCase(), left: () => { S.spice = max(0, S.spice - 1); Save.write(); }, right: () => { S.spice = min(S.spiceMax, S.spice + 1); Save.write(); }, desc: () => SPICE[S.spice].desc });
    items.push(
      { label: 'COLLECTION', ok: () => { this.sub = new CollectionMenu(); } },
      { label: 'STATS', ok: () => { this.sub = new StatsMenu(); } },
      { label: 'OPTIONS', ok: () => { this.sub = optionsMenu(() => { this.sub = null; }); } },
      { label: 'CREDITS', ok: () => { this.sub = new CreditsView(); } },
    );
    this.menu = new Menu('', items);
  },
  update() {
    this.t++;
    const m = this.mouse;
    m.t++;
    chainStep(m.tail, m.cx - 4, m.bot - 4, 2.1, 0.03, 0.86, -0.1, 0.12, this.t, (i) => [-i * 2, i * 0.5 - i * i * 0.2], 0.09);
    chainStep(m.scarf, m.cx - 3, m.bot - 10, 1.9, 0.03, 0.85, -0.3 + sin(this.t * 0.05) * 0.15, 0.25, this.t, (i) => [-i * 1.9, i * 0.3], 0.06);
    if (this.sub) { this.sub.update(); return; }
    this.menu.update();
  },
  draw() {
    const t = this.t;
    vbandsScreen(['#140c12', '#160d14', '#190f16', '#1c1119', '#1f121b', '#22131d', '#1c1118']);
    // moon window
    R(g, 372, 70, 84, 92, '#2a1f2c'); R(g, 376, 74, 76, 84, '#1b1426');
    DISC(g, 414, 112, 28, '#e8dcc8'); DISC(g, 405, 104, 6, '#d4c6b0'); DISC(g, 424, 122, 4, '#d4c6b0'); DISC(g, 420, 100, 2, '#d4c6b0');
    R(g, 376, 114, 76, 3, '#2a1f2c'); R(g, 412, 74, 3, 84, '#2a1f2c');
    glow(414, 112, 50, '#c8d0ff', 0.12);
    // the cat, lurking
    ELL(g, 120, 110, 80, 52, '#1d1218'); POLY(g, [48, 96, 70, 40, 96, 74], '#1d1218'); POLY(g, [144, 74, 170, 40, 192, 96], '#1d1218');
    // giant cat eyes in the dark
    const blink = (t % 300) < 8;
    for (const s of [-1, 1]) {
      const ex = 120 + s * 34, ey = 96;
      if (blink) R(g, ex - 12, ey, 24, 2, '#3a2a10');
      else { ELL(g, ex, ey, 13, 8, '#6a5010'); ELL(g, ex, ey, 11, 6, '#c8a020'); R(g, ex - 1 + round(sin(t * 0.01) * 3), ey - 6, 3, 12, C.ink); }
    }
    // floor & ledge
    R(g, 0, 210, W, 60, '#0e080c');
    for (let x = 0; x < W; x += 16) { R(g, x, 210, 15, 4, '#2a1f26'); R(g, x + 8, 214, 15, 4, '#231920'); }
    R(g, 260, 210, 120, 2, C.gr2);
    // candle
    R(g, 350, 196, 6, 14, C.fu4); R(g, 350, 196, 6, 2, C.wh);
    const fl = floor(t / 4) % 3;
    POLY(g, [349, 196, 357, 196, 353 + fl - 1, 186 - fl], C.or2); POLY(g, [351, 196, 355, 196, 353, 190], C.yl1);
    glow(353, 192, 22, C.or1, 0.35 + 0.05 * sin(t * 0.3));
    // the mouse
    const m = this.mouse;
    renderMouse(m, { t, bob: 0, lean: 0, bf: [0, 0], ff: [0, 0], earBack: 0, earUp: 0, eye: (t % 200) < 6 ? 'blink' : 'o', hand: [4, -7], crouch: (t % 80) < 40 ? 0 : 1 });
    drawMouseAt(m, m.cx, m.bot + 1, 2, 2, 0, false);
    drawShape(g, m.cx + 9, m.bot - 12, -1.2, SHAPES.needle, 2);
    // dust motes
    for (let i = 0; i < 26; i++) { const x = (i * 97 + t * (0.2 + (i % 5) * 0.05)) % W, y = (i * 53 + sin(t * 0.01 + i) * 20) % 200; PX(g, x, y, i % 3 ? '#4a3a40' : '#8a7060'); }
    if (this.sub) { dimBg(0.9); this.sub.draw(); return; }
    // logo
    const lx = W / 2, ly = 28;
    txt('SQUEAKBORNE', lx + 2, ly + 3, C.rd1, { a: 'c', sc: 4 });
    txt('SQUEAKBORNE', lx, ly, C.yl1, { a: 'c', sc: 4, ol: C.ink, wave: 1.2, t });
    txt('A ROGUELITE ABOUT A MOUSE WITH A NEEDLE AND A GRUDGE', lx, ly + 34, C.fu3, { a: 'c', f: '3', ol: C.ink });
    {
      this.menu.draw(W / 2, 112);
      txt('\u2191\u2193 NAVIGATE   ENTER / SPACE / J  SELECT', W / 2, H - 22, C.st3, { a: 'c', f: '3', ol: C.ink });
      const S = Save.data.stats;
      txt('RUNS ' + S.runs + '   WINS ' + S.wins + '   CRUMBS ' + Save.data.crumbs + '   HATS ' + Save.data.hats.length + '/' + Object.keys(HATS).length, W / 2, H - 12, C.st3, { a: 'c', f: '3', ol: C.ink });
    }
  },
};
function vbandsScreen(cols) { const bh = ceil(H / cols.length); cols.forEach((c, i) => R(g, 0, i * bh, W, bh, c)); }

class SeedMenu {
  constructor() { this.s = ''; this.t = 0; }
  update() {
    this.t++;
    for (const ch of Input.typed) if (/^[a-z0-9]$/i.test(ch) && this.s.length < 12) { this.s += ch.toUpperCase(); sfx('menu'); }
    if (Input.typedBack && this.s.length) { this.s = this.s.slice(0, -1); sfx('back'); }
    if (Input.typedEnter && this.t > 5) { const seed = this.s ? hashStr(this.s) : MR.int(1, 999999999); Title.sub = null; Game.seedLabel = this.s || null; Game.startHub(seed, Save.data.spice); }
    if (Input.typedEsc) { Title.sub = null; sfx('back'); }
  }
  draw() {
    txt('SEEDED RUN', W / 2, 70, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    txt('TYPE A SEED. SAME SEED, SAME LEVELS. FIGHT YOUR FRIENDS.', W / 2, 96, C.st4, { a: 'c', f: '3', ol: C.ink });
    panel(W / 2 - 90, 112, 180, 22, C.night, C.yl1);
    txt(this.s + (this.t % 40 < 20 ? '_' : ''), W / 2, 120, C.yl1, { a: 'c' });
    txt('[ENTER] START   [BKSP] DELETE   [ESC] BACK', W / 2, 150, C.st3, { a: 'c', f: '3', ol: C.ink });
  }
}
class CollectionMenu {
  constructor() { this.sel = 0; this.t = 0; this.ids = Object.keys(ITEMS).concat(Object.keys(HATS).map((h) => 'hat:' + h)); }
  update() {
    this.t++;
    const cols = 12;
    if (Input.mp('left')) this.sel = max(0, this.sel - 1);
    if (Input.mp('right')) this.sel = min(this.ids.length - 1, this.sel + 1);
    if (Input.mp('up')) this.sel = max(0, this.sel - cols);
    if (Input.mp('down')) this.sel = min(this.ids.length - 1, this.sel + cols);
    if ((Input.mpress('back') || Input.mpress('ok')) && this.t > 5) { Title.sub = null; sfx('back'); }
  }
  draw() {
    txt('COLLECTION', W / 2, 18, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    const cols = 12, cw = 26;
    const x0 = W / 2 - (cols * cw) / 2;
    this.ids.forEach((id, i) => {
      const x = x0 + (i % cols) * cw, y = 44 + floor(i / cols) * 28, s = i === this.sel;
      const isHat = id.startsWith('hat:');
      const have = isHat ? Save.data.hats.includes(id.slice(4)) : STARTER_UNLOCKS.includes(id) || Save.data.unlocked.includes(id);
      const found = !isHat && Save.data.found.includes(id);
      panel(x, y, 22, 22, s ? C.dk1 : C.night, s ? C.yl1 : have ? C.dk3 : C.dk1);
      if (have) { if (isHat) g.drawImage(makeHatIcon(id.slice(4)), x + 3, y + 3); else spr(itemIcon(ITEMS[id]), x + 11, y + 20); }
      else txt(found ? 'BP' : '?', x + 11, y + 8, found ? C.bl3 : C.dk3, { a: 'c', f: '3' });
    });
    const id = this.ids[this.sel], isHat = id.startsWith('hat:');
    const have = isHat ? Save.data.hats.includes(id.slice(4)) : STARTER_UNLOCKS.includes(id) || Save.data.unlocked.includes(id);
    const name = isHat ? HATS[id.slice(4)].name : ITEMS[id].name, desc = isHat ? HATS[id.slice(4)].desc : ITEMS[id].desc;
    txt(have ? name.toUpperCase() : '???', W / 2, H - 40, have ? C.yl1 : C.st3, { a: 'c', ol: C.ink });
    txt(have ? desc : isHat ? 'A hat you have not found yet.' : Save.data.found.includes(id) ? 'Blueprint found. Unlock it with the Hoarder.' : 'Find its blueprint. Elites and chests drop them.', W / 2, H - 28, C.st4, { a: 'c', f: '3', ol: C.ink });
  }
}
class StatsMenu {
  constructor() { this.t = 0; }
  update() { this.t++; if ((Input.mpress('back') || Input.mpress('ok')) && this.t > 5) { Title.sub = null; sfx('back'); } }
  draw() {
    const S = Save.data.stats;
    txt('STATS', W / 2, 30, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    const rows = [
      ['RUNS', S.runs], ['DEATHS', S.deaths], ['WINS', S.wins], ['ENEMIES FLATTENED', S.kills], ['BEST TIME', S.bestTime ? fmtTime(S.bestTime) : '--'],
      ['RAT KING KILLS', S.bossKills[0]], ['VACUUM KILLS', S.bossKills[1]], ['ROACH CHEF KILLS', S.bossKills[2]], ['MITTENS NAPS', S.bossKills[3]],
      ['CRUMBS BANKED', S.crumbsBanked], ['PARRIES', S.parries], ['BONKS', S.bonks], ['ENEMY BOWLING STRIKES', S.billiards], ['TIME PLAYED', fmtTime(S.playTime)],
    ];
    rows.forEach(([k, v], i) => { const y = 56 + i * 12; txt(k, W / 2 - 10, y, C.fu3, { a: 'r', ol: C.ink }); txt(String(v), W / 2 + 10, y, C.yl1, { ol: C.ink }); });
    const worst = Object.entries(S.deathsBy).sort((a, b) => b[1] - a[1])[0];
    if (worst) txt('YOUR NEMESIS: ' + worst[0].toUpperCase() + ' (' + worst[1] + ' DEATHS)', W / 2, 232, C.rd3, { a: 'c', f: '3', ol: C.ink });
  }
}
class CreditsView {
  constructor() { this.t = 0; }
  update() { this.t++; if ((Input.mpress('back') || Input.mpress('ok')) && this.t > 5) { Title.sub = null; sfx('back'); } }
  draw() { drawCredits(this.t, 60); }
}
function drawCredits(t, y0) {
  const lines = [
    ['SQUEAKBORNE', C.yl1, 2], ['', 0, 1], ['A GAME ABOUT A MOUSE', C.fu3, 1], ['AND THE CAT WHO OWNS THE HOUSE', C.fu3, 1], ['', 0, 1],
    ['EVERY PIXEL DRAWN BY CODE', C.st4, 1], ['EVERY SOUND SYNTHESIZED LIVE', C.st4, 1], ['NO IMAGE FILES WERE HARMED', C.st4, 1], ['', 0, 1],
    ['STARRING', C.or2, 1], ['SQUEAK  ...  THE MOUSE', C.fu3, 1], ['GERALD, BARRY AND KEVIN  ...  THE RAT KING', C.fu3, 1], ['VACUUM-TRON 3000  ...  ITSELF', C.fu3, 1],
    ['MONSIEUR ROACH  ...  ZE CHEF', C.fu3, 1], ['MITTENS  ...  A GOOD GIRL', C.fu3, 1], ['', 0, 1], ['NO MICE WERE HARMED', C.gr3, 1], ['(EXCEPT ALL OF THEM, REPEATEDLY)', C.st3, 1],
    ['', 0, 1], ['THANKS FOR PLAYING', C.yl1, 2],
  ];
  let y = y0;
  for (const [s, c, sc] of lines) { if (s) txt(s, W / 2, y, c, { a: 'c', sc, ol: C.ink }); y += sc === 2 ? 22 : 11; }
}

// ---------------- options ----------------
function optionsMenu(back) {
  const S = Save.data.settings;
  const vol = (k) => ({ value: () => '\u25a0'.repeat(round(S[k] * 10)) + '\u25a1'.repeat(10 - round(S[k] * 10)), left: () => { S[k] = max(0, round((S[k] - 0.1) * 10) / 10); AudioSys.applyVolumes(); Save.write(); }, right: () => { S[k] = min(1, round((S[k] + 0.1) * 10) / 10); AudioSys.applyVolumes(); Save.write(); } });
  const tog = (k, after) => ({ value: () => (S[k] ? 'ON' : 'OFF'), ok: () => { S[k] = !S[k]; Save.write(); if (after) after(); }, left: () => { S[k] = !S[k]; Save.write(); if (after) after(); }, right: () => { S[k] = !S[k]; Save.write(); if (after) after(); } });
  const items = [
    Object.assign({ label: 'MUSIC' }, vol('music')),
    Object.assign({ label: 'SOUND' }, vol('sfx')),
    { label: 'SCREEN SHAKE', value: () => round(S.shake * 100) + '%', left: () => { S.shake = max(0, round((S.shake - 0.25) * 4) / 4); Save.write(); }, right: () => { S.shake = min(1.5, round((S.shake + 0.25) * 4) / 4); Save.write(); } },
    Object.assign({ label: 'SCREEN FLASHES' }, tog('flash')),
    Object.assign({ label: 'DAMAGE NUMBERS' }, tog('dmgNums')),
    Object.assign({ label: 'RUN TIMER' }, tog('timer')),
    { label: 'FULLSCREEN', value: () => (document.fullscreenElement ? 'ON' : 'OFF'), ok: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* not allowed here */ } } },
    Object.assign({ label: 'PIXEL PERFECT' }, tog('pixelPerfect', () => Gfx.resize())),
    Object.assign({ label: 'SCANLINES' }, tog('scanlines')),
    { label: 'CONTROLS', ok: () => { Game.subMenu = new ControlsMenu(() => { Game.subMenu = null; }); } },
    { label: 'RESET SAVE', ok: () => { Game.subMenu = new ConfirmMenu('ERASE ALL PROGRESS?', () => { Save.reset(); Input.setBinds(PRESETS.wasd); Game.subMenu = null; UI.toast('SAVE ERASED', 'A fresh mouse. Innocent. Doomed.', C.rd3); }, () => { Game.subMenu = null; }); } },
    { label: 'BACK', ok: back },
  ];
  const m = new Menu('OPTIONS', items, { back });
  const upd = m.update.bind(m), drw = m.draw.bind(m);
  m.update = () => { if (Game.subMenu) return Game.subMenu.update(); upd(); };
  m.draw = () => { if (Game.subMenu) { Game.subMenu.draw(); return; } drw(W / 2, 54); };
  return m;
}
class ConfirmMenu {
  constructor(q, yes, no) { this.q = q; this.yes = yes; this.no = no; this.sel = 1; this.t = 0; }
  update() {
    this.t++;
    if (Input.mp('left') || Input.mp('right') || Input.mp('up') || Input.mp('down')) { this.sel = 1 - this.sel; sfx('menu'); }
    if (Input.mpress('ok') && this.t > 6) (this.sel === 0 ? this.yes : this.no)();
    if (Input.mpress('back') && this.t > 6) this.no();
  }
  draw() {
    txt(this.q, W / 2, 100, C.rd3, { a: 'c', sc: 2, ol: C.ink });
    txt('YES', W / 2 - 40, 140, this.sel === 0 ? C.yl1 : C.st3, { a: 'c', ol: C.ink });
    txt('NO', W / 2 + 40, 140, this.sel === 1 ? C.yl1 : C.st3, { a: 'c', ol: C.ink });
  }
}
class ControlsMenu {
  constructor(back) { this.back = back; this.sel = 0; this.wait = false; this.t = 0; }
  rows() { return ACTIONS.concat(['preset', 'back']); }
  update() {
    this.t++;
    const rows = this.rows();
    if (this.wait) {
      const code = Input.lastCode;
      if (code && this.t > 2) {
        if (code !== 'Escape') {
          const a = rows[this.sel];
          for (const k of ACTIONS) Input.binds[k] = Input.binds[k].filter((c) => c !== code || k === a);
          Input.binds[a] = [code].concat(Input.binds[a].filter((c) => c !== code)).slice(0, 2);
          Save.data.settings.binds = Input.binds; Save.write();
          sfx('select');
        }
        this.wait = false;
      }
      return;
    }
    if (Input.mp('up')) { this.sel = (this.sel - 1 + rows.length) % rows.length; sfx('menu'); }
    if (Input.mp('down')) { this.sel = (this.sel + 1) % rows.length; sfx('menu'); }
    const r = rows[this.sel];
    if (Input.mpress('ok') && this.t > 4) {
      if (r === 'back') { this.back(); sfx('back'); }
      else if (r === 'preset') { const S = Save.data.settings; S.preset = S.preset === 'wasd' ? 'arrows' : 'wasd'; Input.setBinds(PRESETS[S.preset]); S.binds = Input.binds; Save.write(); sfx('select'); }
      else { this.wait = true; this.t = 0; }
    }
    if (Input.mpress('back') && this.t > 4 && !this.wait) { this.back(); sfx('back'); }
  }
  draw() {
    txt('CONTROLS', W / 2, 14, C.yl2, { a: 'c', sc: 2, ol: C.ink });
    this.rows().forEach((r, i) => {
      const y = 38 + i * 12, s = i === this.sel;
      if (r === 'preset') { txt('PRESET: ' + (Save.data.settings.preset === 'wasd' ? 'WASD + J K L' : 'ARROWS + Z X C'), W / 2, y + 2, s ? C.yl1 : C.st4, { a: 'c', ol: C.ink }); return; }
      if (r === 'back') { txt('BACK', W / 2, y + 2, s ? C.yl1 : C.st4, { a: 'c', ol: C.ink }); return; }
      txt(ACTION_NAMES[r].toUpperCase(), W / 2 - 10, y, s ? C.yl1 : C.fu3, { a: 'r', ol: C.ink, f: '3' });
      const keys = this.wait && s ? (this.t % 30 < 15 ? 'PRESS A KEY' : '') : Input.binds[r].map(keyLabel).join('  /  ');
      txt(keys, W / 2 + 10, y, s ? C.wh : C.st4, { ol: C.ink, f: '3' });
    });
  }
}

// ---------------- pause ----------------
function pauseMenu() {
  const back = () => Game.resume();
  const m = new Menu('PAUSED', [
    { label: 'RESUME', ok: back },
    { label: 'OPTIONS', ok: () => { Game.pauseSub = optionsMenu(() => { Game.pauseSub = null; }); } },
    { label: 'ABANDON RUN', ok: () => { Game.pauseSub = new ConfirmMenu('ABANDON THIS RUN?', () => { Game.pauseSub = null; Game.resume(); pl.die(); }, () => { Game.pauseSub = null; }); } },
    { label: 'QUIT TO TITLE', ok: () => { Game.pauseSub = new ConfirmMenu('QUIT? CARRIED CRUMBS ARE LOST.', () => { Game.pauseSub = null; Game.toTitle(); }, () => { Game.pauseSub = null; }); } },
  ], { back });
  return m;
}
function drawPause() {
  dimBg(0.72);
  if (Game.pauseSub) { Game.pauseSub.draw(); return; }
  Game.pauseMenu.draw(W / 2, 64);
  // build summary
  const x = 18, y = 128;
  txt('BUILD', x, y, C.yl1, { ol: C.ink });
  pl.slots.forEach((s, i) => { if (s) { spr(itemIcon(s.def), x + 8, y + 26 + i * 20); txt(s.name, x + 20, y + 14 + i * 20, RARITY[s.rar].col, { f: '3' }); txt(s.def.kind === 'melee' ? 'DPS ' + itemDps(s) : 'DMG ' + itemDps(s), x + 20, y + 21 + i * 20, C.st4, { f: '3' }); } });
  txt('QUIRKS', W - 150, y, C.tl3, { ol: C.ink });
  if (!Run.quirks.length) txt('NONE YET. FIND A SHRINE.', W - 150, y + 14, C.st3, { f: '3' });
  Run.quirks.forEach((q, i) => { txt(QUIRKS[q].name.toUpperCase(), W - 150, y + 14 + i * 16, C.tl3, { f: '3' }); txt(QUIRKS[q].desc, W - 150, y + 21 + i * 16, C.st4, { f: '3' }); });
  txt('SEED ' + (Game.seedLabel || Run.seed) + '   TIME ' + fmtTime(Run.time) + '   KILLS ' + Run.kills, W / 2, H - 12, C.st3, { a: 'c', f: '3', ol: C.ink });
}

// ---------------- death & victory ----------------
function drawDeath() {
  const D = Game.deathInfo, t = Game.stateT;
  const a = min(1, t / 40);
  R(g, 0, 0, W, H, rgba('#0a0507', 0.86 * a));
  if (t < 20) return;
  txt(D.title, W / 2, 26, C.rd3, { a: 'c', sc: 3, ol: C.ink, shake: t < 40 ? 1 : 0 });
  txt('KILLED BY ' + D.cause.toUpperCase(), W / 2, 58, C.fu3, { a: 'c', ol: C.ink });
  const rows = [['REACHED', D.where], ['TIME', fmtTime(Run.time)], ['ENEMIES FLATTENED', Run.kills], ['DAMAGE DEALT', Run.dmgDealt], ['SNACKS EATEN', Run.snacks], ['BUTTONS EARNED', Run.goldEarned], ['CRUMBS LOST', D.lost], ['CRUMBS BANKED', Run.banked]];
  rows.forEach(([k, v], i) => { const y = 82 + i * 12; if (t > 30 + i * 6) { txt(k, W / 2 - 8, y, C.st4, { a: 'r', ol: C.ink }); txt(String(v), W / 2 + 8, y, C.yl1, { ol: C.ink }); } });
  if (t > 90) txt(D.tip, W / 2, 190, C.gr3, { a: 'c', f: '3', ol: C.ink });
  if (t > 100 && D.unlocks.length) txt('NEW THIS RUN: ' + D.unlocks.join(', '), W / 2, 204, C.or2, { a: 'c', f: '3', ol: C.ink });
  if (t > 55 && t % 50 < 36) txt('[' + Input.label('jump') + '] TRY AGAIN       [ESC] TITLE', W / 2, 232, C.yl1, { a: 'c', ol: C.ink });
}
function drawVictory() {
  const t = Game.stateT;
  vbandsScreen(['#0d1324', '#101830', '#131c38', '#161f3c', '#1a2240', '#1d2440']);
  DISC(g, 400, 60, 26, '#eef5ff');
  for (let i = 0; i < 40; i++) PX(g, (i * 113) % W, (i * 37) % 150, i % 4 ? '#6a7aa0' : C.wh);
  // sleeping cat & tiny proud mouse
  const breathe = round(sin(t * 0.04) * 1.5);
  const L = liveSpr('sleepcat', 190, 80, (c) => {
    ELL(c, 84, 56 - breathe, 72, 22 + breathe, C.or0); ELL(c, 84, 53 - breathe, 69, 20 + breathe, C.or1);
    for (let i = 0; i < 6; i++) LINE(c, 38 + i * 16, 36 - breathe, 34 + i * 16, 50, C.or0, 2);
    ELL(c, 70, 72, 46, 5, C.or0); ELL(c, 70, 71, 44, 4, C.or1); for (let i = 0; i < 4; i++) R(c, 34 + i * 18, 69, 3, 5, C.or0);
    POLY(c, [138, 34, 144, 14, 154, 30], C.or1); POLY(c, [160, 30, 170, 14, 176, 36], C.or1); PX(c, 145, 22, C.pk1); PX(c, 169, 22, C.pk1);
    DISC(c, 157, 46, 22, C.or1); ELL(c, 157, 56, 13, 8, C.fu4);
    LINE(c, 145, 44, 151, 46, C.ink); LINE(c, 163, 46, 169, 44, C.ink); POLY(c, [154, 50, 160, 50, 157, 54], C.pk1);
    LINE(c, 134, 52, 120, 50, C.fu4); LINE(c, 134, 55, 120, 57, C.fu4); LINE(c, 180, 52, 188, 50, C.fu4);
    ELL(c, 132, 70, 12, 5, C.fu4); ELL(c, 176, 70, 10, 5, C.fu4);
  });
  drawLive(L, 150, 262, false, false);
  for (let i = 0; i < 3; i++) { const k = ((t + i * 40) % 120) / 120; g.globalAlpha = 1 - k; txt('z', 232 + sin(t * 0.05 + i) * 4 + k * 14, 200 - k * 40, C.fu3, { sc: 1 + (i === 2 ? 1 : 0), ol: C.ink }); g.globalAlpha = 1; }
  if (Title.mouse) {
    const m = Title.mouse;
    m.x = 118; m.y = 214 - 14 - breathe; m.t++;
    chainStep(m.tail, m.cx - 4, m.bot - 4, 2.1, 0.03, 0.86, -0.1, 0.12, t, (i) => [-i * 2, i * 0.5 - i * i * 0.2], 0.09);
    chainStep(m.scarf, m.cx - 3, m.bot - 10, 1.9, 0.03, 0.85, -0.3, 0.25, t, (i) => [-i * 1.9, i * 0.3], 0.06);
    renderMouse(m, { t, eye: 'happy', hand: [3, -13], bob: t % 40 < 20 ? 0 : -1 });
    drawMouseAt(m, m.cx, m.bot + 1, 1, 1, 0, false);
  }
  txt('THE CAT SLEEPS', W / 2, 20, C.yl1, { a: 'c', sc: 3, ol: C.ink, wave: 1, t });
  txt('the house is yours. at least until she wakes up.', W / 2, 50, C.fu3, { a: 'c', ol: C.ink });
  const rows = [['TIME', fmtTime(Run.time)], ['ENEMIES FLATTENED', Run.kills], ['HITS TAKEN', Run.hitsTaken], ['CHEESE EATEN', Run.heals], ['SPICE', Run.spice + ' ' + SPICE[Run.spice].name.toUpperCase()]];
  rows.forEach(([k, v], i) => { const y = 72 + i * 12; txt(k, W / 2 + 60, y, C.st4, { a: 'r', ol: C.ink }); txt(String(v), W / 2 + 76, y, C.yl1, { ol: C.ink }); });
  if (Game.winMsg) txt(Game.winMsg, W / 2 + 70, 140, C.rd3, { a: 'c', f: '3', ol: C.ink });
  if (t > 120 && t % 50 < 36) txt('[' + Input.label('jump') + '] BACK TO THE MOUSEHOLE', W / 2 + 70, 160, C.yl1, { a: 'c', ol: C.ink });
}

// SQUEAKBORNE :: entities
// Base entity, pickups, interactables, hazards, props, NPCs and speech bubbles.

class Ent {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.dead = false; this.onGround = false; this.face = 1; this.t = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bot() { return this.y + this.h; }
  update() { this.t++; }
  draw() {}
}
const nearPlayer = (e, r) => pl && !pl.dead && dist(e.cx, e.cy, pl.cx, pl.cy) < r;

// ---------------- speech bubbles ----------------
const Bubbles = {
  list: [],
  say(ent, text, dur = 110, col = TCOL.w) {
    if (!ent) return;
    this.list = this.list.filter((b) => b.ent !== ent);
    this.list.push({ ent, text: text.toUpperCase(), t: dur, max: dur, col });
    if (this.list.length > 8) this.list.shift();
  },
  update() { for (const b of this.list) b.t--; this.list = this.list.filter((b) => b.t > 0 && !(b.ent.dead && b.ent.removeBubble)); },
  draw() {
    const placed = [];
    for (const b of this.list) {
      const lines = wrapText(b.text, 120, '3');
      const w = max(...lines.map((l) => textW(l, '3'))) + 6, h = lines.length * 7 + 4;
      const x = round(clamp(b.ent.cx - w / 2, Cam.x + 3, Cam.x + W - w - 3));
      let y = round(b.ent.y - h - 10 - (b.ent.bubbleY || 0));
      for (let k = 0; k < 6; k++) { const hit = placed.find((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 4 && y + h + 4 > r.y); if (!hit) break; y = hit.y - h - 5; }
      placed.push({ x, y, w, h });
      const pop = b.max - b.t < 4 ? 1 : 0;
      R(g, x - 1 - pop, y - pop, w + 2 + pop * 2, h + pop * 2, C.ink);
      R(g, x - pop, y - 1 - pop, w + pop * 2, h + 2 + pop * 2, C.ink);
      R(g, x, y, w, h, '#f6efe4');
      R(g, x + 2, y + h, 3, 2, '#f6efe4'); PX(g, x + 2, y + h + 2, '#f6efe4');
      R(g, x + 1, y + h, 1, 3, C.ink); R(g, x + 5, y + h, 1, 2, C.ink);
      lines.forEach((l, i) => txt(l, x + 3, y + 3 + i * 7, b.col === TCOL.w ? C.ink : b.col, { f: '3' }));
    }
  },
};

// ---------------- pickups ----------------
class Coin extends Ent {
  constructor(x, y, val, crumb) {
    super(x - 3, y - 3, 6, 6);
    this.val = val; this.crumb = crumb;
    this.vx = rnd(-2.2, 2.2); this.vy = rnd(-4.5, -2);
    this.life = 1800; this.mag = false;
  }
  update() {
    this.t++;
    if (this.t > 22 && pl && !pl.dead && (this.mag || dist(this.cx, this.cy, pl.cx, pl.cy) < (this.crumb ? 70 : 56) + (Run && Run.quirks.includes('magnet') ? 60 : 0))) this.mag = true;
    if (this.mag) {
      const dx = pl.cx - this.cx, dy = pl.cy - this.cy, d = hypot(dx, dy) || 1;
      const sp = min(7, 1.5 + this.t * 0.02 + (60 / d));
      this.x += (dx / d) * sp; this.y += (dy / d) * sp;
      if (d < 7) this.collect();
      return;
    }
    this.vy = min(this.vy + 0.22, 5);
    this.vx *= this.onGround ? 0.8 : 0.99;
    moveBody(this);
    if (this.onGround && this.vy === 0 && abs(this.vx) > 0.3 && this.t < 60) this.vy = -abs(this.vx) * 0.6;
    if (--this.life <= 0) this.dead = true;
  }
  collect() {
    this.dead = true;
    if (this.crumb) { Run.crumbs += this.val; sfx('crumb', this.cx); }
    else {
      let v = this.val;
      if (Run.quirks.includes('goldtooth')) v = ceil(v * 1.5);
      Run.gold += v; Run.goldEarned += v; sfx('coin', this.cx);
    }
    stars(this.cx, this.cy, 1, this.crumb ? C.br5 : C.yl1);
  }
  draw() {
    const a = this.crumb ? SPR.crumb : SPR.coin;
    const f = this.crumb ? floor(this.t / 12) % 2 : floor(this.t / 5) % 4;
    if (this.life < 120 && this.t % 6 < 3) return;
    spr(a[f], this.cx, this.y + this.h + 1);
    if (!this.crumb && this.val >= 5) glow(this.cx, this.cy, 6, C.yl1, 0.25);
  }
}
function dropCoins(x, y, total) {
  total = round(total);
  while (total > 0) {
    const v = total >= 25 ? 25 : total >= 5 ? 5 : 1;
    total -= v;
    lv.items.push(new Coin(x, y, v, false));
  }
}
function dropCrumbs(x, y, n) { for (let i = 0; i < n; i++) lv.items.push(new Coin(x, y, 1, true)); }

class Food extends Ent {
  constructor(x, y, kind) {
    super(x - 6, y - 10, 12, 10);
    this.kind = kind;
    this.heal = kind === 'cheese' ? 0.4 : kind === 'feast' ? 1 : 0.18;
    this.prompt = 'EAT';
  }
  get canInteract() { return true; }
  update() { this.t++; this.vy = min(this.vy + 0.2, 4); moveBody(this); }
  interact() {
    if (pl.hp >= pl.maxHp) { Bubbles.say(pl, pick(["i'm full", 'saving it for later', 'no room in the tum']), 70); sfx('deny'); return; }
    this.dead = true;
    pl.heal(pl.maxHp * this.heal * (Run.spice >= 3 ? 0.6 : 1), true);
    sfx('nom', this.cx); sfx('heal');
    debris(this.cx, this.cy, 8, [C.yl1, C.yl0, C.br4], { sp: 1.5 });
    FText.add(this.cx, this.y - 6, pick(['NOM', 'CHOMP', 'MUNCH', 'YUM']), C.yl1, { life: 50 });
  }
  draw() {
    const s = this.kind === 'bread' ? SPR.bread : SPR.cheese;
    const by = round(sin(this.t * 0.08));
    spr(s, this.cx, this.bot + by);
    if (this.kind !== 'bread') glow(this.cx, this.cy, 10, C.yl0, 0.2);
  }
}

class ItemDrop extends Ent {
  constructor(x, y, it, price) {
    super(x - 8, y - 16, 16, 16);
    this.it = it; this.price = price || 0;
    this.vy = price ? 0 : -3; this.noGrav = !!price;
    this.prompt = price ? 'BUY' : 'TAKE';
    this.spr = itemIcon(it.def);
  }
  get canInteract() { return true; }
  update() {
    this.t++;
    if (!this.noGrav) { this.vy = min(this.vy + 0.2, 4); this.vx *= 0.9; moveBody(this); }
  }
  interact() {
    if (this.price) {
      if (Run.gold < this.price) { sfx('deny'); Bubbles.say(this, 'not enough buttons', 70); return; }
      Run.gold -= this.price;
      sfx('buy');
      FText.add(this.cx, this.y - 6, '-' + this.price, C.yl1);
      this.price = 0; this.noGrav = false; this.prompt = 'TAKE';
      Run.purchases++;
    }
    pl.offerItem(this);
  }
  draw() {
    const col = RARITY[this.it.rar].col;
    const fy = this.y + round(sin(this.t * 0.06) * 2) - 2;
    if (this.it.rar >= 1 || this.price) {
      g.globalAlpha = 0.18 + 0.06 * sin(this.t * 0.1);
      R(g, this.cx - 3, fy - 60, 6, 70, col);
      R(g, this.cx - 1, fy - 70, 2, 80, col);
      g.globalAlpha = 1;
    }
    glow(this.cx, fy + 8, 12, col, 0.35);
    spr(this.spr, this.cx, fy + 17);
    if (this.price) txt(this.price + '\u25cf', this.cx, this.bot + 4, Run.gold >= this.price ? C.yl1 : C.rd3, { a: 'c', f: '3', ol: C.ink });
  }
}

class Blueprint extends Ent {
  constructor(x, y, id) { super(x - 6, y - 10, 12, 10); this.id = id; this.vy = -4; }
  update() {
    this.t++;
    this.vy = min(this.vy + 0.2, 4); moveBody(this);
    if (this.t > 30 && pl && overlap(this, pl)) {
      this.dead = true;
      if (!Save.data.found.includes(this.id) && !Save.data.unlocked.includes(this.id)) Save.data.found.push(this.id);
      Save.write();
      sfx('secret');
      UI.toast('BLUEPRINT: ' + ITEMS[this.id].name.toUpperCase(), 'Unlock it with the Hoarder', C.bl3);
      Run.blueprints++;
    }
  }
  draw() { spr(SPR.blueprint, this.cx, this.bot + round(sin(this.t * 0.1))); glow(this.cx, this.cy, 10, C.bl3, 0.3); }
}
class HatPickup extends Ent {
  constructor(x, y, hat) { super(x - 6, y - 12, 12, 12); this.hat = hat; }
  update() {
    this.t++;
    if (pl && overlap(this, pl)) {
      this.dead = true;
      unlockHat(this.hat);
    }
  }
  draw() {
    const cv = makeHatIcon(this.hat);
    g.drawImage(cv, round(this.cx - 9), round(this.y - 6 + sin(this.t * 0.08) * 2));
    glow(this.cx, this.cy, 12, C.yl1, 0.3);
  }
}
const _hatIcons = {};
function makeHatIcon(h) {
  if (_hatIcons[h]) return _hatIcons[h];
  const s = mkSprite(16, 16, (c) => { if (HATS[h] && HATS[h].draw) HATS[h].draw(c, 8, 12, 0); });
  return (_hatIcons[h] = s.img);
}

// ---------------- interactables ----------------
class Chest extends Ent {
  constructor(x, y, cursed) {
    super(x - 10, y - 16, 20, 16);
    this.cursed = cursed; this.open = false;
    this.prompt = cursed ? 'OPEN (CURSED)' : 'OPEN';
  }
  get canInteract() { return !this.open; }
  interact() {
    if (this.cursed && !this.confirm) {
      this.confirm = true;
      Bubbles.say(this, 'cursed: one hit kills you until 10 kills. press again', 160, C.vi2);
      sfx('curse');
      return;
    }
    this.open = true;
    sfx('chest', this.cx);
    FX.shake(0.15);
    const lvl = Run.itemLevel();
    const it = rollItem(Run.rng, lvl, null, this.cursed ? 3 : 0.4);
    const d = new ItemDrop(this.cx, this.y, it);
    d.vy = -4;
    lv.items.push(d);
    dropCoins(this.cx, this.y, 10 + Run.biome() * 8);
    confetti(this.cx, this.y, 20);
    if (this.cursed) {
      Run.curse = 10; pl.cursedFx = 60;
      FX.flash(0.4, C.vi1);
      UI.toast('CURSED!', 'Any hit kills you. Kill 10 enemies to lift it.', C.vi2);
      Run.cursedChests++;
    }
    if (chance(0.12) || this.cursed) {
      const bp = rollBlueprint();
      if (bp) lv.items.push(new Blueprint(this.cx, this.y, bp));
    }
  }
  draw() { spr((this.cursed ? SPR.cursed : SPR.chest)[this.open ? 1 : 0], this.cx, this.bot + 1); if (!this.open) glow(this.cx, this.cy, 14, this.cursed ? C.vi2 : C.yl0, 0.2 + 0.08 * sin(this.t * 0.07)); }
  update() { this.t++; }
}
class SnackAltar extends Ent {
  constructor(x, y) {
    super(x - 9, y - 14, 18, 14);
    this.used = false; this.prompt = 'EAT SNACK';
    this.opts = Run.rng.shuffle(['fury', 'cunning', 'grit']).slice(0, 2);
  }
  get canInteract() { return !this.used; }
  interact() {
    UI.open(new ChoiceMenu('A MYSTERIOUS SNACK', 'Pick a flavor. Your body will remember.', this.opts.map((s) => ({
      label: STATS[s].name, col: STATS[s].col, desc: STATS[s].desc, icon: STATS[s].icon,
      fn: () => { this.used = true; pl.addStat(s); },
    }))));
  }
  update() { this.t++; }
  draw() {
    spr(SPR.plate, this.cx, this.bot + 1);
    if (!this.used) {
      const y = this.bot - 6 + round(sin(this.t * 0.07) * 1.5);
      this.opts.forEach((s, i) => {
        const x = this.cx - 4 + i * 8;
        DISC(g, x, y - 2, 3, C.ink); DISC(g, x, y - 2, 2, STATS[s].col); PX(g, x - 1, y - 3, C.wh);
      });
      glow(this.cx, this.cy - 2, 14, C.yl1, 0.25);
    }
  }
}
class GoldPile extends Ent {
  constructor(x, y, n) { super(x - 8, y - 8, 16, 8); this.n = n; }
  update() {
    this.t++;
    if (pl && overlap(this, pl)) { this.dead = true; dropCoins(this.cx, this.y, this.n); sfx('coin'); }
  }
  draw() {
    for (let i = 0; i < 5; i++) spr(SPR.coin[0], this.x + 3 + i * 2.5, this.bot - (i % 2) * 3 + 1);
    if (this.t % 40 < 4) stars(this.x + rnd(16), this.y + rnd(8), 1, C.yl2);
  }
}
class Door extends Ent {
  constructor(x, y, kind) {
    super(x - 12, y - 32, 24, 32);
    this.kind = kind; this.locked = kind === 'bossexit'; this.prompt = 'ENTER';
  }
  get canInteract() { return !this.locked; }
  interact() { sfx('door'); Game.nextStage(); }
  update() {
    this.t++;
    if (!this.locked && this.t % 8 === 0 && nearPlayer(this, 90)) sparks(this.cx + rnd(-8, 8), this.y + 14, 1, C.yl1, { dir: -PI / 2, min: 0.3, max: 0.8, gr: -0.01 });
  }
  draw() {
    spr(SPR.door[this.locked ? 0 : 1], this.cx, this.bot + 1);
    if (!this.locked) {
      glow(this.cx, this.y + 18, 16, C.yl0, 0.25 + 0.1 * sin(this.t * 0.1));
      if (!this.hint) txt('\u2191', this.cx, this.y - 10 + round(sin(this.t * 0.15) * 2), C.yl1, { a: 'c', ol: C.ink });
    } else txt('LOCKED', this.cx, this.y - 8, C.st4, { a: 'c', f: '3', ol: C.ink });
  }
}
class Pipe extends Ent {
  constructor(x, y) { super(x - 10, y - 30, 20, 30); }
  draw() {
    const x = round(this.cx), y = round(this.bot);
    DISC(g, x, y - 15, 12, C.ink); R(g, x - 12, y - 15, 25, 15, C.ink);
    DISC(g, x, y - 15, 11, C.br2); R(g, x - 11, y - 15, 23, 15, C.br2);
    DISC(g, x, y - 15, 9, C.br1); R(g, x - 9, y - 15, 19, 15, C.br1);
    DISC(g, x, y - 14, 7, '#0b0709'); R(g, x - 7, y - 14, 15, 14, '#0b0709');
    PX(g, x - 3, y - 13, C.yl1); PX(g, x + 2, y - 13, C.yl1);
    R(g, x - 11, y - 1, 23, 2, C.rd1); R(g, x - 9, y - 1, 19, 1, C.rd2);
  }
}
class Spring extends Ent {
  constructor(x, y) { super(x - 8, y - 8, 16, 8); this.squish = 0; }
  update() {
    this.t++; if (this.squish > 0) this.squish--;
    const bounce = (e, power) => {
      if (e.vy >= 0 && e.y + e.h <= this.y + 6 && e.x + e.w > this.x + 2 && e.x < this.x + this.w - 2 && e.y + e.h >= this.y - 2) {
        e.vy = power; e.y = this.y - e.h - 1; this.squish = 10;
        sfx('boing', this.cx); puff(this.cx, this.y, 4, C.st4);
        return true;
      }
      return false;
    };
    if (pl && bounce(pl, -9.2)) { pl.jumps = 0; pl.dashUsed = false; pl.sq = { x: 0.7, y: 1.4 }; pl.state = pl.state === 'stomp' ? 'move' : pl.state; }
    for (const e of lv.enemies) if (!e.flying && !e.boss) bounce(e, -7);
  }
  draw() { spr(SPR.spring[this.squish > 0 ? 1 : 0], this.cx, this.bot + 1); }
}
class Hazard extends Ent {
  constructor(x, y, kind) {
    const w = kind === 'burner' ? 28 : 16;
    super(x - w / 2, y - (kind === 'burner' ? 4 : 6), w, kind === 'burner' ? 4 : 6);
    this.kind = kind; this.cd = 0; this.armed = true; this.phase = rndi(0, 200);
  }
  update() {
    this.t++; if (this.cd > 0) this.cd--;
    const k = this.kind;
    if (k === 'mousetrap') {
      if (!this.armed) { if (this.cd <= 0) this.armed = true; return; }
      const hitE = (e) => boxHit(this.x + 2, this.y - 2, this.w - 4, this.h + 2, e);
      let victim = null;
      if (pl && !pl.dead && hitE(pl) && pl.state !== 'dash') victim = pl;
      for (const e of lv.enemies) if (!victim && !e.flying && !e.dead && hitE(e)) victim = e;
      if (victim) {
        this.armed = false; this.cd = 200;
        sfx('snap', this.cx); FX.shake(0.15);
        Bubbles.say(this, 'SNAP', 40);
        if (victim === pl) pl.hurt(dmgScale(12), this, { cause: 'a mousetrap. ironic.' });
        else victim.hurt(40 + Run.biome() * 30, this, { kb: 0, stun: 60 });
      }
    } else if (k === 'burner') {
      const cyc = (this.t + this.phase) % 200;
      this.fire = cyc > 120 && cyc < 180;
      this.warn = cyc > 90 && cyc <= 120;
      if (this.warn && cyc % 6 === 0) puff(this.cx + rnd(-8, 8), this.y, 1, C.or1, { s: 1, vy: -0.5 });
      if (cyc === 121) sfx('fire', this.cx);
      if (this.fire) {
        if (this.t % 2 === 0) Parts.add({ k: 2, x: this.cx + rnd(-10, 10), y: this.y - rnd(0, 6), vy: rnd(-2.5, -1.2), vx: rnd(-0.3, 0.3), s: rnd(2, 3.5), c: pick([C.or2, C.yl1, C.rd3]), life: rndi(12, 22), gr: -0.03, dr: 0.95, a: 0.9 });
        Light.add(this.cx, this.y - 16, 50, '#ff9a3a', 0.6);
        const fb = { x: this.x + 2, y: this.y - 34, w: this.w - 4, h: 36 };
        if (pl && overlap(fb, pl)) pl.hurt(dmgScale(11), this, { cause: 'a stove burner', burn: true });
        for (const e of lv.enemies) if (!e.dead && overlap(fb, e) && this.t % 20 === 0) { e.hurt(10 + Run.biome() * 8, this, { kb: 0 }); e.addStatus('burn', 120); }
      }
    } else {
      // tacks / glass: static floor hazard
      if (pl && !pl.dead && boxHit(this.x + 2, this.y, this.w - 4, this.h, pl) && pl.vy >= 0) pl.hurt(dmgScale(9), this, { cause: k === 'glass' ? 'broken glass. the cat did this.' : 'a thumbtack', kb: 3 });
    }
  }
  draw() {
    const k = this.kind;
    if (k === 'mousetrap') spr(SPR.mousetrap[this.armed ? 0 : 1], this.cx, this.bot + 1);
    else if (k === 'burner') {
      spr(SPR.burner, this.cx, this.bot + 1);
      if (this.warn) for (let i = 0; i < 5; i++) PX(g, this.x + 4 + i * 5, this.y - 1 - (this.t % 4 < 2 ? 1 : 0), C.or2);
      if (this.fire) {
        for (let i = 0; i < 4; i++) {
          const h = 18 + sin(this.t * 0.6 + i * 2) * 8;
          POLY(g, [this.x + 3 + i * 6, this.y, this.x + 9 + i * 6, this.y, this.x + 6 + i * 6 + sin(this.t * 0.4 + i) * 2, this.y - h], i % 2 ? C.or2 : C.rd3);
          POLY(g, [this.x + 5 + i * 6, this.y, this.x + 7 + i * 6, this.y, this.x + 6 + i * 6, this.y - h * 0.6], C.yl1);
        }
        glow(this.cx, this.y - 12, 20, C.or1, 0.5);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const x = this.x + 2 + i * 4;
        if (k === 'glass') { POLY(g, [x, this.bot, x + 3, this.bot, x + 1 + (i & 1), this.bot - 5 - (i % 3)], C.tl3); PX(g, x + 1, this.bot - 3, C.tl4); }
        else { R(g, x - 1, this.bot - 3, 4, 2, [C.rd2, C.yl1, C.tl2, C.gr3][i]); LINE(g, x + 1, this.bot - 3, x + 1, this.bot - 7, C.st5); }
      }
    }
  }
}
class Prop extends Ent {
  constructor(x, y, kind) {
    super(x - 7, y - 15, 14, 15);
    this.kind = kind; this.hp = 3; this.flash = 0;
    this.prop = true;
  }
  update() { this.t++; if (this.flash > 0) this.flash--; this.vy = min(this.vy + 0.25, 5); moveBody(this); }
  hurt() {
    this.hp--; this.flash = 5; sfx('hit2', this.cx);
    if (this.hp <= 0) this.smash();
  }
  smash() {
    this.dead = true;
    const s = ART.props[this.kind];
    gibs(s, this.cx, this.cy, 5);
    debris(this.cx, this.cy, 8, this.kind === 'barrel' ? [C.br2, C.br3] : this.kind === 'books' ? [C.rd1, C.tl1, C.yl0, C.fu4] : this.kind === 'jar' ? [C.st4, C.or1, C.fu4] : [C.tl2, C.tl3], { sp: 2 });
    sfx(this.kind === 'jar' ? 'glass' : 'bonk', this.cx);
    dropCoins(this.cx, this.y, rndi(2, 6) + Run.biome() * 2);
    if (chance(0.12)) lv.items.push(new Food(this.cx, this.y + 4, 'bread'));
    Run.propsSmashed++;
  }
  draw() { spr(ART.props[this.kind], this.cx + (this.flash ? rndi(-1, 1) : 0), this.bot + 1, false, this.flash > 0); }
}

// ---------------- NPCs ----------------
class NPC extends Ent {
  constructor(x, y, w, h) { super(x - w / 2, y - h, w, h); this.talkCd = 0; }
  update() {
    this.t++; if (this.talkCd > 0) this.talkCd--;
    if (pl) this.face = pl.cx < this.cx ? -1 : 1;
    if (this.greet && this.talkCd <= 0 && nearPlayer(this, 70)) { Bubbles.say(this, pick(this.greet), 150); this.talkCd = 600; }
  }
}
class Shopkeeper extends NPC {
  constructor(x, y) { super(x, y, 16, 22); this.greet = ['welcome! everything is 100% legal', 'buttons only. no refunds.', 'ribbit. i mean. hello, customer', 'found most of this in a drain']; this.bubbleY = 4; }
  draw() {
    const x = round(this.cx), y = round(this.bot), b = round(sin(this.t * 0.08));
    const f = this.face;
    g.save(); g.translate(x, y); g.scale(f, 1);
    ELL(g, 0, -7 + b, 8, 7, C.ink); ELL(g, 0, -7 + b, 7, 6, C.gr2); ELL(g, 1, -5 + b, 5, 4, C.gr4);
    DISC(g, -3, -15 + b, 3, C.ink); DISC(g, 3, -15 + b, 3, C.ink); DISC(g, -3, -15 + b, 2, C.gr3); DISC(g, 3, -15 + b, 2, C.gr3);
    R(g, -3, -16 + b, 2, 2, C.ink); R(g, 3, -16 + b, 2, 2, C.ink); PX(g, -3, -16 + b, C.wh); PX(g, 3, -16 + b, C.wh);
    R(g, -4, -9 + b, 9, 1, C.gr1);
    R(g, -3, -22 + b, 6, 5, C.rd2); R(g, -3, -22 + b, 6, 1, C.rd3); LINE(g, 0, -22 + b, -4, -19 + b, C.yl1);
    R(g, -7, -1, 4, 2, C.gr1); R(g, 3, -1, 4, 2, C.gr1);
    g.restore();
  }
}
class Hoarder extends NPC {
  constructor(x, y) { super(x, y, 20, 24); this.prompt = 'TALK'; this.greet = ['crumbs! bring me crumbs!', 'i remember everything you find', 'back in my day we had ONE cheese', 'deposit your crumbs, dearie']; this.bubbleY = 2; }
  get canInteract() { return true; }
  interact() {
    if (Run && Run.crumbs > 0) {
      const n = Run.crumbs;
      Save.data.crumbs += n; Run.banked += n; Run.crumbs = 0; Save.write();
      sfx('levelup');
      FText.add(this.cx, this.y - 10, '+' + n + ' \u25c6 BANKED', C.br5, { life: 80 });
      Bubbles.say(this, pick(['delicious. i mean. safe.', 'into the pile they go', 'ooh, crunchy ones']), 120);
    }
    UI.open(new HoarderMenu());
  }
  draw() {
    const x = round(this.cx), y = round(this.bot), b = round(sin(this.t * 0.05));
    g.save(); g.translate(x, y); g.scale(this.face, 1);
    blob(g, -7, -9, 7, 8, C.ink, C.br2, null); blob(g, -7, -9, 6, 7, C.br1, C.br2, C.br3);
    PX(g, -9, -14, C.br5); PX(g, -5, -10, C.br5); PX(g, -8, -6, C.br5);
    ELL(g, 2, -7 + b, 6, 6, C.ink); ELL(g, 2, -7 + b, 5, 5, C.fu1);
    DISC(g, 3, -16 + b, 5, C.ink); DISC(g, 3, -16 + b, 4, C.fu2);
    DISC(g, -1, -21 + b, 3, C.ink); DISC(g, -1, -21 + b, 2, C.fu2); PX(g, -1, -21 + b, C.pk0);
    R(g, 7, -16 + b, 4, 2, C.ink); PX(g, 10, -17 + b, C.pk1);
    R(g, 4, -18 + b, 2, 1, C.ink); R(g, 3, -16 + b, 4, 2, C.st4); PX(g, 4, -16 + b, C.ink);
    LINE(g, 6, -14 + b, 6, -9 + b, C.fu4); LINE(g, 5, -12 + b, 7, -10 + b, C.fu4);
    LINE(g, 8, -6, 10, 0, C.br2);
    g.restore();
  }
}
class QuirkShrine extends Ent {
  constructor(x, y) { super(x - 10, y - 26, 20, 26); this.used = false; this.prompt = 'PRAY'; }
  get canInteract() { return !this.used; }
  interact() {
    const pool = QUIRK_IDS.filter((q) => !Run.quirks.includes(q) && (QUIRKS[q].unlock ? Save.data.unlocked.includes('q_' + q) : true));
    const opts = Run.rng.shuffle(pool.slice()).slice(0, 3);
    if (!opts.length) { Bubbles.say(this, 'you are quirky enough', 100); return; }
    UI.open(new ChoiceMenu('THE SHRINE OF QUIRKS', 'Choose a quirk. It lasts until you die.', opts.map((q) => ({
      label: QUIRKS[q].name, col: C.tl3, desc: QUIRKS[q].desc,
      fn: () => { this.used = true; Run.quirks.push(q); applyQuirk(q); sfx('levelup'); UI.toast('QUIRK: ' + QUIRKS[q].name.toUpperCase(), QUIRKS[q].desc, C.tl3); },
    }))));
  }
  update() { this.t++; if (!this.used && this.t % 10 === 0) Parts.add({ k: 5, x: this.cx + rnd(-6, 6), y: this.y + 6 + rnd(-4, 4), vy: -0.3, s: 1, c: C.tl3, life: 20 }); }
  draw() {
    const x = round(this.cx), y = round(this.bot);
    R(g, x - 9, y - 4, 18, 4, C.ink); R(g, x - 8, y - 3, 16, 3, C.st3);
    R(g, x - 5, y - 22, 10, 18, C.ink); R(g, x - 4, y - 21, 8, 17, C.st2); R(g, x - 4, y - 21, 8, 1, C.st4);
    const c = this.used ? C.st3 : C.tl3;
    DISC(g, x, y - 14, 3, C.ink); DISC(g, x, y - 14, 2, c); if (!this.used) glow(x, y - 14, 14, C.tl3, 0.4 + 0.1 * sin(this.t * 0.1));
  }
}
class Wardrobe extends Ent {
  constructor(x, y) { super(x - 13, y - 32, 26, 32); this.prompt = 'CHANGE HAT'; }
  get canInteract() { return true; }
  interact() {
    const hs = Object.keys(HATS).filter((h) => Save.data.hats.includes(h));
    const i = hs.indexOf(Save.data.hat);
    Save.data.hat = hs[(i + 1) % hs.length];
    pl.hat = Save.data.hat;
    Save.write();
    sfx('pickup');
    puff(pl.cx, pl.y - 6, 6, C.fu4);
    UI.toast(HATS[pl.hat].name.toUpperCase(), HATS[pl.hat].desc + '  (' + hs.length + '/' + Object.keys(HATS).length + ' found)', C.yl1);
  }
  draw() { spr(SPR.wardrobe, this.cx, this.bot + 1); }
}
class Sign extends Ent {
  constructor(x, y, text) { super(x - 8, y - 16, 16, 16); this.text = text; this.cd = 0; }
  update() { this.t++; if (this.cd > 0) this.cd--; if (this.cd <= 0 && nearPlayer(this, 40)) { Bubbles.say(this, typeof this.text === 'function' ? this.text() : this.text, 240); this.cd = 260; } }
  draw() { spr(SPR.sign, this.cx, this.bot + 1); }
}
class Board extends Ent {
  constructor(x, y) { super(x - 62, y - 70, 124, 64); }
  draw() {
    const x = round(this.x), y = round(this.y), w = this.w, h = this.h;
    R(g, x - 1, y - 1, w + 2, h + 2, C.ink); R(g, x, y, w, h, C.br2); R(g, x + 2, y + 2, w - 4, h - 4, '#e9dcc0');
    for (let i = 0; i < 6; i++) R(g, x + 4, y + 13 + i * 8, w - 8, 1, '#d6c6a6');
    DISC(g, x + 6, y + 5, 1, C.rd2); DISC(g, x + w - 6, y + 5, 1, C.rd2);
    txt('HOW TO SQUEAK', x + w / 2, y + 4, C.rd1, { a: 'c', f: '3' });
    const L = (a) => Input.label(a);
    const rows = [
      ['MOVE', L('left') + ' ' + L('right'), 'JUMP', L('jump')],
      ['ATTACK', L('atk1') + ' ' + L('atk2'), 'DODGE', L('dodge')],
      ['SKILLS', L('skill1') + ' ' + L('skill2'), 'HEAL', L('heal')],
      ['USE', L('interact'), 'SQUEAK', L('taunt')],
      ['MAP', L('map'), 'PAUSE', L('pause')],
    ];
    rows.forEach((r, i) => {
      const yy = y + 15 + i * 8;
      txt(r[0], x + 6, yy, C.br1, { f: '3' }); txt(r[1], x + 38, yy, C.ink, { f: '3' });
      txt(r[2], x + 66, yy, C.br1, { f: '3' }); txt(r[3], x + 94, yy, C.ink, { f: '3' });
    });
    txt('DOWN+JUMP IN AIR = BONK', x + w / 2, y + h - 9, C.rd1, { a: 'c', f: '3' });
  }
}
class Rack extends Ent {
  constructor(x, y) { super(x - 12, y - 24, 24, 24); this.prompt = 'ARMORY'; this.used = false; }
  get canInteract() { return !this.used; }
  interact() {
    if (!Save.data.upg.armory) { Bubbles.say(this, 'locked. ask the hoarder about the armory', 140); sfx('deny'); return; }
    const pool = unlockedItems().filter((id) => ITEMS[id].kind !== 'skill' && id !== 'needle');
    const opts = MR.shuffle(pool.slice()).slice(0, 3);
    UI.open(new ChoiceMenu('THE ARMORY', 'Pick one extra weapon for this run.', opts.map((id) => ({
      label: ITEMS[id].name, col: STATS[ITEMS[id].stat].col, desc: ITEMS[id].desc, iconSpr: itemIcon(ITEMS[id]),
      fn: () => { this.used = true; const d = new ItemDrop(this.cx, this.y, makeItem(id, 1, 0, [])); lv.items.push(d); },
    }))));
  }
  draw() {
    const x = round(this.cx), y = round(this.bot);
    R(g, x - 12, y - 24, 24, 3, C.ink); R(g, x - 11, y - 23, 22, 1, C.br3);
    R(g, x - 11, y - 2, 22, 2, C.br2); R(g, x - 10, y - 22, 2, 20, C.br2); R(g, x + 8, y - 22, 2, 20, C.br2);
    if (!this.used) { drawShape(g, x - 6, y - 4, -PI / 2.2, SHAPES.fork); drawShape(g, x + 1, y - 4, -PI / 1.9, SHAPES.spoon); drawShape(g, x + 5, y - 4, -PI / 2, SHAPES.slingshot); }
  }
}
class Ambush extends Ent {
  constructor(x, y) { super(x - 8, y - 22, 16, 22); this.state = 0; this.prompt = 'RING THE BELL'; this.waves = 2; }
  get canInteract() { return this.state === 0; }
  interact() {
    this.state = 1; sfx('clang', this.cx); FX.shake(0.3);
    Bubbles.say(this, 'AMBUSH! survive two waves', 140, C.rd3);
    this.spawnWave();
  }
  spawnWave() {
    const B = BIOMES[lv.biome || 0];
    const n = 3 + Run.biome();
    this.mine = [];
    for (let i = 0; i < n; i++) {
      const type = Run.rng.weighted(B.enemies);
      const e = makeEnemy(type, this.cx + (i % 2 ? 1 : -1) * rndi(40, 150), this.y - 40, false);
      e.aggro = true; e.spawnFx = 20;
      if (!rectSolid(e.x, e.y, e.w, e.h)) { lv.enemies.push(e); this.mine.push(e); puff(e.cx, e.cy, 8, C.vi2); }
    }
    sfx('spawn', this.cx);
  }
  update() {
    this.t++;
    if (this.state === 1 && this.mine.every((e) => e.dead)) {
      this.waves--;
      if (this.waves > 0) this.spawnWave();
      else {
        this.state = 2;
        sfx('fanfare');
        const c = new Chest(this.cx + 30, this.bot, false);
        lv.items.push(c);
        puff(c.cx, c.cy, 10, C.yl1);
        dropCoins(this.cx, this.y, 30 + Run.biome() * 15);
        Run.ambushes++;
      }
    }
  }
  draw() {
    const x = round(this.cx), y = round(this.bot);
    R(g, x - 1, y - 22, 2, 22, C.br1);
    R(g, x - 8, y - 22, 16, 2, C.br2);
    const sw = this.state === 1 ? round(sin(this.t * 0.4) * 2) : 0;
    POLY(g, [x - 5 + sw, y - 9, x + 5 + sw, y - 9, x + 3 + sw, y - 19, x - 3 + sw, y - 19], C.ink);
    POLY(g, [x - 4 + sw, y - 10, x + 4 + sw, y - 10, x + 2 + sw, y - 18, x - 2 + sw, y - 18], this.state === 2 ? C.st3 : C.yl0);
    PX(g, x - 2 + sw, y - 16, C.yl2);
  }
}

// ---------------- populate ----------------
function snapGround(L, s) {
  // static objects must stand on something: slide down to the first floor below
  let tx = floor(s.x / TS), ty = floor((s.y - 1) / TS);
  for (let k = 0; k < 12 && isSolidT(L.get(tx, ty)); k++) ty--;
  for (let k = 0; k < 40 && ty < L.th - 1; k++) {
    const below = L.get(tx, ty + 1);
    if (isSolidT(below) || below === T_PLAT) break;
    ty++;
  }
  s.y = (ty + 1) * TS;
}
const STATIC_SPAWNS = ['snack', 'chest', 'curse', 'food', 'shop', 'pedestal', 'exit', 'gold', 'ambush', 'secret', 'bread', 'spring', 'hazard', 'prop'];
function populate(L) {
  const biome = L.biome || 0;
  for (const s of L.spawns) if (STATIC_SPAWNS.includes(s.k)) snapGround(L, s);
  for (const s of L.spawns) {
    switch (s.k) {
      case 'enemy': L.enemies.push(makeEnemy(s.type, s.x, s.y, s.elite)); break;
      case 'gold': L.items.push(new GoldPile(s.x, s.y, s.n)); break;
      case 'bread': L.items.push(new Food(s.x, s.y, 'bread')); break;
      case 'food': L.items.push(new Food(s.x, s.y, 'cheese')); break;
      case 'spring': L.items.push(new Spring(s.x, s.y)); break;
      case 'hazard': L.items.push(new Hazard(s.x, s.y, BIOMES[biome].hazard === 'tacks' ? 'tacks' : BIOMES[biome].hazard)); break;
      case 'prop': L.items.push(new Prop(s.x, s.y, BIOMES[biome].prop)); break;
      case 'snack': L.items.push(new SnackAltar(s.x, s.y)); break;
      case 'chest': L.items.push(new Chest(s.x, s.y, false)); break;
      case 'curse': L.items.push(new Chest(s.x, s.y, true)); break;
      case 'shop': L.items.push(new Shopkeeper(s.x, s.y)); break;
      case 'pedestal': case 'm_p': {
        const it = chance(0.18) && s.k === 'pedestal' ? null : rollItem(Run.rng, Run.itemLevel(), null, 0.8);
        if (it) L.items.push(new ItemDrop(s.x, s.y - 12, it, shopPrice(it)));
        else { const f = new Food(s.x, s.y - 10, 'cheese'); L.items.push(f); }
        break;
      }
      case 'ambush': L.items.push(new Ambush(s.x, s.y)); break;
      case 'secret': {
        const hat = SECRET_HATS.find((h) => !Save.data.hats.includes(h));
        if (hat && chance(0.6)) L.items.push(new HatPickup(s.x, s.y - 4, hat));
        else L.items.push(new GoldPile(s.x, s.y, 40 + biome * 20));
        L.items.push(new Food(s.x + 24, s.y, 'cheese'));
        break;
      }
      case 'exit': L.items.push(new Door(s.x, s.y, 'exit')); break;
      case 'pipe': L.items.push(new Pipe(s.x, s.y)); break;
      case 'm_w': L.items.push(new Wardrobe(s.x, s.y)); break;
      case 'm_b': L.items.push(new Board(s.x, s.y)); break;
      case 'm_g': L.items.push(new Sign(s.x, s.y, hubTip)); break;
      case 'm_d': L.enemies.push(makeEnemy('dummy', s.x, s.y, false)); break;
      case 'm_h': L.items.push(new Hoarder(s.x, s.y)); break;
      case 'm_k': L.items.push(new Rack(s.x, s.y)); break;
      case 'm_q': L.items.push(new QuirkShrine(s.x, s.y)); break;
      case 'm_m': L.items.push(new Shopkeeper(s.x, s.y)); break;
      case 'm_X': L.items.push(new Door(s.x, s.y, L.kind === 'boss' ? 'bossexit' : 'exit')); break;
      case 'm_B': L.bossSpawn = { x: s.x, y: s.y }; break;
    }
  }
}
const HUB_TIPS = [
  'tip: press {dodge} to roll through attacks. rolling is free. dying is not.',
  'tip: down + {jump} in the air does a ground pound. great for heads.',
  'tip: hitting enemies right after taking damage wins some health back.',
  'tip: crumbs are lost when you die. bank them with the hoarder.',
  'tip: {taunt} squeaks at enemies. close squeaks make you stronger.',
  'tip: hold toward a wall in the air to slide. jump to wall-jump.',
  'tip: snacks make you stronger. weapons scale with their color.',
  'tip: some walls look cracked. hit them.',
  'tip: the cat is not your friend. the cat is nobody\'s friend.',
];
function hubTip() {
  let t = pick(HUB_TIPS);
  t = t.replace(/\{(\w+)\}/g, (m, a) => '[' + Input.label(a) + ']');
  return t;
}

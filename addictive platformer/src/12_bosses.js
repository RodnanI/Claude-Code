// SQUEAKBORNE :: bosses
// The Rat King, Vacuum-Tron 3000, Monsieur Roach and MITTENS.

Object.assign(ENEMY, {
  ratking: { name: 'The Rat King', hp: 1, dmg: 15, w: 24, h: 52, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  gerald: { name: 'Gerald', hp: 1, dmg: 13, w: 12, h: 16, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  barry: { name: 'Barry', hp: 1, dmg: 15, w: 14, h: 18, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  kevin: { name: 'Kevin', hp: 1, dmg: 18, w: 20, h: 22, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  vacuum: { name: 'Vacuum-Tron 3000', hp: 1, dmg: 16, w: 66, h: 22, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  roachchef: { name: 'Monsieur Roach', hp: 1, dmg: 17, w: 20, h: 40, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  mittens: { name: 'Mittens', hp: 1, dmg: 24, w: 90, h: 70, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
  paw: { name: 'Paw', hp: 1, dmg: 24, w: 30, h: 24, ai: 'none', weight: 99, gold: [0, 0], crumbs: [0, 0] },
});
const BOSS_INFO = [
  { key: 'ratking', name: 'THE RAT KING', sub: 'three rats in a trenchcoat. legally one king.', hp: 1200, hat: 'thimble' },
  { key: 'vacuum', name: 'VACUUM-TRON 3000', sub: 'it hungers. it hums. it has a 4.2 star rating.', hp: 2700, hat: 'bottlecap' },
  { key: 'roachchef', name: 'MONSIEUR ROACH', sub: 'three michelin stars. zero hygiene.', hp: 4300, hat: 'toque' },
  { key: 'mittens', name: 'MITTENS', sub: 'devourer of worlds. knocker of glasses. a good girl.', hp: 7600, hat: 'crown' },
];

// live-drawn sprites get the same ink outline as cached ones
const _live = {};
function liveSpr(key, w, h, fn) {
  let L = _live[key];
  if (!L) { L = _live[key] = { a: makeCanvas(w, h), b: makeCanvas(w + 2, h + 2), c: makeCanvas(w + 2, h + 2) }; L.ac = ctx2d(L.a); L.bc = ctx2d(L.b); L.cc = ctx2d(L.c); }
  L.ac.clearRect(0, 0, w, h);
  fn(L.ac, w, h);
  const o = L.bc;
  o.clearRect(0, 0, w + 2, h + 2);
  o.drawImage(L.a, 0, 1); o.drawImage(L.a, 2, 1); o.drawImage(L.a, 1, 0); o.drawImage(L.a, 1, 2);
  o.globalCompositeOperation = 'source-in'; o.fillStyle = C.ink; o.fillRect(0, 0, w + 2, h + 2);
  o.globalCompositeOperation = 'source-over'; o.drawImage(L.a, 1, 1);
  return L;
}
function drawLive(L, x, y, flip, flash, ax = 0.5, ay = 1, rot = 0) {
  let src = L.b;
  if (flash) { const c = L.cc; c.clearRect(0, 0, L.c.width, L.c.height); c.drawImage(L.b, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, L.c.width, L.c.height); c.globalCompositeOperation = 'source-over'; src = L.c; }
  g.save(); g.translate(round(x), round(y)); if (rot) g.rotate(rot); g.scale(flip ? -1 : 1, 1);
  g.drawImage(src, round(-src.width * ax), round(-src.height * ay));
  g.restore();
}

class Boss extends Enemy {
  constructor(type, x, y, info) {
    super(type, x, y, false);
    this.boss = true; this.info = info;
    this.maxHp = this.hp = round(info.hp * SPICE[Run.spice].hp);
    this.dmg = round(dmgScale(ENEMY[type].dmg) * 1.15);
    this.state = 'sleep'; this.st = 0; this.phase = 1; this.atkCd = 70; this.aggro = true;
    this.name = info.name; this.inv = 0;
  }
  startFight() { this.state = 'idle'; this.st = 0; }
  update() {
    this.t++; this.anim++;
    if (this.flash > 0) this.flash--;
    if (this.inv > 0) this.inv--;
    this.sq += (1 - this.sq) * 0.2;
    this.updStatus();
    if (this.dead) return;
    if (this.state === 'sleep') { this.physics(0.8); return; }
    if (this.atkCd > 0) this.atkCd--;
    this.think();
  }
  hurt(dmg, src, o = {}) {
    if (this.dead || this.intangible || this.state === 'sleep' || this.inv > 0) return 0;
    dmg = max(1, round(dmg * (this.dmgMul || 1)));
    this.hp -= dmg;
    this.flash = 5; this.hitT = this.t;
    if (!o.quiet) FText.add(this.cx + rnd(-10, 10), this.y + rnd(0, 10), o.crit ? dmg + '!' : dmg, o.dot ? o.col || C.or2 : o.crit ? C.yl1 : '#fff6ea', { sc: o.crit ? 2 : 1, dmg: true, f: o.dot ? '3' : '5' });
    if (!o.dot) { sfx(o.crit ? 'crit' : 'hit', this.cx); sparks(o.hx || this.cx, o.hy || this.cy, 5, o.crit ? C.yl1 : C.fu4); }
    if (o.burn) this.addStatus('burn', o.burn);
    Run.dmgDealt += dmg;
    this.onDamage && this.onDamage();
    if (this.hp <= 0) { this.hp = 0; this.die(src, o); }
    return dmg;
  }
  die() {
    if (this.dead) return;
    this.dead = true;
    bossDefeated(this);
  }
  sayBig(t, col) { Bubbles.say(this, t, 140, col); }
  frameSet() { return [null]; }
}

// ---------------- 1. THE RAT KING ----------------
let RATART = null;
function buildRatArt() {
  const rat = (c, cx, by, s, fur, extra, step) => {
    const sh = fur === C.fu1 ? C.fu0 : C.br1;
    LINE(c, cx - s * 4, by - 4, cx - s * 9, by - 1, C.pk1);
    R(c, cx - s * 3 - 1 + step, by - 2, s * 2 + 1, 2, C.pk0); R(c, cx + s - step, by - 2, s * 2 + 1, 2, C.pk1);
    blob(c, cx, by - s * 5, s * 3 + 1, s * 4, sh, fur, null);
    ELL(c, cx + 1, by - s * 4, s * 2, s * 3 - 1, C.fu3);
    const hy = by - s * 9 - 2;
    blob(c, cx + 1, hy, s * 3, s * 3, sh, fur, null);
    ELL(c, cx + s * 3 + 1, hy + 1, s * 2, s, fur); PX(c, cx + s * 5 + 1, hy, C.pk1);
    DISC(c, cx - s, hy - s * 3, s * 2, fur); DISC(c, cx - s, hy - s * 3, max(1, s - 1), C.pk0);
    PX(c, cx + s * 2, hy - 1, C.ink); PX(c, cx + s * 2, hy, C.ink);
    extra(c, cx, hy, s);
  };
  RATART = {
    gerald: mkAnim(26, 22, 2, (c, i) => rat(c, 10, 22, 1, C.fu1, (c, x, y) => { R(c, x - 2, y - 6, 5, 2, C.yl0); PX(c, x - 2, y - 7, C.yl1); PX(c, x, y - 7, C.yl1); PX(c, x + 2, y - 7, C.yl1); }, i)),
    barry: mkAnim(30, 26, 2, (c, i) => rat(c, 13, 26, 1.3, C.br2, (c, x, y) => { R(c, x + 1, y - 2, 5, 2, C.ink); PX(c, x + 2, y - 2, C.st3); }, i)),
    kevin: mkAnim(40, 34, 2, (c, i) => rat(c, 17, 34, 1.8, C.fu1, (c, x, y, s) => { R(c, x - 5, y + 9, 10, 6, C.fu4); R(c, x - 5, y + 9, 10, 1, C.wh); }, i)),
  };
}
class RatKing extends Boss {
  constructor(x, y) { super('ratking', x, y, BOSS_INFO[0]); this.hatGone = false; this.rats = []; this.facePeek = 0; }
  think() {
    const t = pl;
    this.st++;
    if (this.phase === 2) {
      this.intangible = true;
      this.hp = this.rats.reduce((a, r) => a + max(0, r.dead ? 0 : r.hp), 0);
      if (this.rats.every((r) => r.dead)) { this.intangible = false; this.hp = 0; this.die(); }
      return;
    }
    if (this.hp < this.maxHp * 0.5 && this.state !== 'split') { this.state = 'split'; this.st = 0; this.inv = 999; Game.cineFor(110); sfx('roar'); this.sayBig('THE JIG IS UP', C.rd3); }
    switch (this.state) {
      case 'split':
        this.vx = 0;
        if (this.st % 6 === 0) FX.shake(0.2);
        if (this.st === 60) this.splitUp();
        break;
      case 'idle': {
        this.faceTo(t);
        const dx = t.cx - this.cx;
        this.vx = approach(this.vx, sign(dx) * (abs(dx) > 50 ? 0.9 : 0), 0.08);
        if (this.atkCd <= 0) {
          const opts = [['stomp', 2], ['cheese', 2]];
          if (abs(dx) < 70) opts.push(['swing', 5]);
          if (!this.hatGone) opts.push(['hat', 2]);
          this.state = MR.weighted(opts); this.st = 0;
          sfx('tele', this.cx);
        }
        break;
      }
      case 'swing':
        this.vx *= 0.7;
        if (this.st === 26) { sfx('heavy', this.cx); }
        if (this.st >= 26 && this.st < 34) this.strike({ x: this.face > 0 ? this.cx : this.cx - 44, y: this.y + 8, w: 44, h: 40 });
        if (this.st > 50) this.endAtk(40);
        break;
      case 'hat':
        this.vx = 0;
        if (this.st === 22) {
          this.hatGone = true; sfx('whoosh', this.cx);
          const king = this;
          lv.projs.push(new Proj(this.cx, this.y + 4, this.face * 5.5, 0, { team: 'e', kind: 'fedora', dmg: this.dmg * 0.8, life: 150, w: 14, h: 8, noclip: true, breakable: false, cause: 'a flying fedora',
            onDie: () => { king.hatGone = false; }, update0: true }));
          const pr = lv.projs[lv.projs.length - 1];
          pr.ret = false; pr.boom = true;
          const up = pr.update.bind(pr);
          pr.update = () => {
            if (pr.t > 34) { const dx = king.cx - pr.cx, dy = king.y - pr.cy, d = hypot(dx, dy) || 1; pr.vx = lerp(pr.vx, (dx / d) * 6, 0.1); pr.vy = lerp(pr.vy, (dy / d) * 6, 0.1); if (d < 12) pr.kill(); }
            else pr.vx *= 0.975;
            up();
          };
        }
        if (this.st > 40) this.endAtk(30);
        break;
      case 'stomp':
        if (this.st === 16) { this.vy = -7.4; this.vx = clamp((t.cx - this.cx) / 40, -4, 4); sfx('jump', this.cx); }
        if (this.st > 18 && this.onGround) {
          sfx('thud', this.cx); FX.shake(0.5); puff(this.cx, this.bot, 10, C.st4, { sp: 2, s: 2 });
          for (const s of [-1, 1]) lv.projs.push(new Proj(this.cx + s * 12, this.bot - 6, s * 3, 0, { team: 'e', kind: 'wave', dmg: this.dmg * 0.8, life: 90, w: 10, h: 10, ground: true, pierce: 99, cause: 'a rat shockwave' }));
          this.vx = 0; this.endAtk(50);
        }
        break;
      case 'cheese':
        this.vx = 0; this.facePeek = 1;
        if (this.st === 20 || this.st === 30 || this.st === 40) {
          const tx = t.cx + rnd(-50, 50), tt = 40;
          lv.projs.push(new Proj(this.cx, this.y, (tx - this.cx) / tt, -6, { team: 'e', kind: 'cheese', dmg: this.dmg * 0.7, grav: 0.3, life: 120, cause: 'flying cheese' }));
          sfx('shoot', this.cx);
        }
        if (this.st > 56) { this.facePeek = 0; this.endAtk(40); }
        break;
    }
    this.physics(0.85);
  }
  endAtk(cd) { this.state = 'idle'; this.st = 0; this.atkCd = round(cd * (this.hp < this.maxHp * 0.75 ? 0.75 : 1)); }
  splitUp() {
    this.phase = 2; this.inv = 0;
    const left = this.hp;
    const parts = [['gerald', 0.3], ['barry', 0.3], ['kevin', 0.4]];
    for (const [k, f] of parts) {
      const r = new RatMinion(k, this.cx + (k === 'gerald' ? -30 : k === 'barry' ? 0 : 30), this.bot, this, round(left * f));
      r.vy = -5; r.vx = k === 'gerald' ? -3 : k === 'barry' ? 0.5 : 3;
      lv.enemies.push(r); this.rats.push(r);
    }
    const coat = mkSprite(30, 40, (c) => { R(c, 3, 2, 24, 36, C.br2); R(c, 3, 2, 24, 4, C.br3); for (let i = 0; i < 4; i++) DISC(c, 15, 10 + i * 7, 1, C.yl0); });
    gibs(coat, this.cx, this.cy, 6);
    confetti(this.cx, this.cy, 30);
    sfx('pop', this.cx); FX.flash(0.4, '#fff');
    Bubbles.say(this.rats[0], 'we are NOT three rats', 120);
    Bubbles.say(this.rats[2], 'KEVIN SMASH', 120);
  }
  draw() {
    if (this.phase === 2) return;
    const L = liveSpr('ratking', 46, 70, (c) => {
      const x = 23, by = 69, w = round(sin(this.t * 0.08) * 1.5);
      const step = abs(this.vx) > 0.2 ? round(sin(this.t * 0.3) * 2) : 0;
      R(c, x - 8 + step, by - 3, 6, 3, C.pk0); R(c, x + 3 - step, by - 3, 6, 3, C.pk1);
      LINE(c, x - 10, by - 10, x - 18, by - 4, C.pk1); LINE(c, x - 18, by - 4, x - 20, by - 8, C.pk1);
      POLY(c, [x - 12 + w, by - 44, x + 12 + w, by - 44, x + 15, by - 5, x - 15, by - 5], C.br2);
      POLY(c, [x - 12 + w, by - 44, x - 4 + w, by - 44, x - 9, by - 5, x - 15, by - 5], C.br1);
      R(c, x - 2 + w, by - 44, 3, 39, C.br1);
      for (let i = 0; i < 4; i++) DISC(c, x + 4 + w, by - 38 + i * 9, 1, C.yl0);
      POLY(c, [x - 12 + w, by - 46, x + 12 + w, by - 46, x + 6 + w, by - 38, x - 6 + w, by - 38], C.br3);
      if (this.t % 200 < 30) { R(c, x + 1 + w, by - 26, 2, 2, C.ink); PX(c, x + 1 + w, by - 26, C.rd3); R(c, x + 5 + w, by - 26, 2, 2, C.ink); }
      const hy = by - 52 - (this.facePeek ? 3 : 0);
      blob(c, x + 2 + w, hy, 6, 6, C.fu0, C.fu1, C.fu2);
      ELL(c, x + 8 + w, hy + 1, 3, 2, C.fu1); PX(c, x + 11 + w, hy, C.pk1);
      R(c, x + 4 + w, hy - 2, 6, 2, C.ink); PX(c, x + 5 + w, hy - 2, C.st3);
      R(c, x + 5 + w, hy + 3, 6, 1, C.br0); PX(c, x + 4 + w, hy + 4, C.br0); PX(c, x + 11 + w, hy + 4, C.br0);
      if (!this.hatGone) { R(c, x - 9 + w, hy - 6, 22, 2, C.br0); R(c, x - 4 + w, hy - 12, 12, 7, C.br0); R(c, x - 4 + w, hy - 8, 12, 2, C.rd1); }
      DISC(c, x - 4 + w, hy - 7, 3, C.fu1); DISC(c, x - 4 + w, hy - 7, 1, C.pk0);
      const armUp = this.state === 'swing' && this.st < 26;
      const ax = x + 10 + w, ay = by - 34;
      const bx = armUp ? ax - 6 : this.state === 'swing' && this.st < 40 ? ax + 12 : ax + 4, byy = armUp ? ay - 16 : this.state === 'swing' && this.st < 40 ? ay + 6 : ay + 14;
      LINE(c, ax, ay, bx, byy, C.br2, 3);
      R(c, bx - 1, byy, 9, 7, C.br1); R(c, bx - 1, byy, 9, 2, C.br3); R(c, bx + 2, byy - 2, 3, 2, C.yl0);
    });
    if (this.state === 'swing' && this.st < 26 && this.t % 6 < 3) glow(this.cx, this.cy, 30, C.rd3, 0.3);
    drawLive(L, this.cx, this.bot + 1, this.face < 0, this.flash > 0);
  }
}
class RatMinion extends Enemy {
  constructor(kind, x, y, owner, hp) {
    super(kind, x, y, false);
    this.boss = true; this.owner = owner; this.kind = kind;
    this.maxHp = this.hp = hp; this.dmg = round(dmgScale(ENEMY[kind].dmg) * 1.1);
    this.state = 'go'; this.cd = rndi(40, 90); this.aggro = true;
    if (!RATART) buildRatArt();
  }
  update() {
    this.t++; this.anim++;
    if (this.flash > 0) this.flash--;
    this.updStatus();
    if (this.dead) return;
    if (this.status.stun || this.status.freeze) { this.physics(0.7); return; }
    if (this.cd > 0) this.cd--;
    this.st++;
    const t = pl, angry = this.owner.rats.filter((r) => r.dead).length;
    const sp = 1 + angry * 0.35;
    if (this.kind === 'gerald') {
      this.faceTo(t);
      if (this.onGround && this.cd <= 0) {
        this.vy = -6.2; this.vx = rnd(-2.5, 2.5); this.cd = round(70 / sp);
        this.throwAt = this.t + 18;
      }
      if (this.throwAt === this.t) {
        for (let i = 0; i < 2 + angry; i++) {
          const a = atan2(t.cy - this.cy, t.cx - this.cx) + (i - 0.5) * 0.3;
          lv.projs.push(new Proj(this.cx, this.cy, cos(a) * 3.6, sin(a) * 3.6, { team: 'e', kind: 'cheese', dmg: this.dmg * 0.7, grav: 0.06, life: 120, cause: 'Gerald, a rat with a crown' }));
        }
        sfx('shoot', this.cx);
      }
      if (this.onGround) this.vx *= 0.85;
    } else if (this.kind === 'barry') {
      if (this.state === 'go') {
        walkTo(this, t, 1.2 * sp);
        if (this.cd <= 0 && abs(t.cx - this.cx) < 160) { this.state = 'wind'; this.st = 0; this.faceTo(t); sfx('tele', this.cx); }
      } else if (this.state === 'wind') { this.vx *= 0.6; if (this.st > 24) { this.state = 'dash'; this.st = 0; sfx('dash', this.cx); } }
      else if (this.state === 'dash') {
        this.vx = this.face * 5 * min(1.4, sp); this.contactHurt();
        if (this.st % 2 === 0) puff(this.cx - this.face * 6, this.bot - 1, 1, C.st4);
        if (this.hitWall || this.st > 34) { if (this.hitWall) { sfx('bonk', this.cx); FX.shake(0.25); this.status.stun = 50; } this.state = 'go'; this.cd = round(60 / sp); }
      }
    } else {
      if (this.state === 'go') {
        walkTo(this, t, 0.6 * sp);
        if (this.cd <= 0 && abs(t.cx - this.cx) < 120) { this.state = 'wind'; this.st = 0; sfx('tele', this.cx); }
      } else if (this.state === 'wind') { this.vx = 0; if (this.st === 20) { this.vy = -6; } if (this.st > 22 && this.onGround) {
        sfx('quake', this.cx); FX.shake(0.5); puff(this.cx, this.bot, 10, C.st4, { sp: 2, s: 2 });
        for (const s of [-1, 1]) lv.projs.push(new Proj(this.cx + s * 12, this.bot - 6, s * 3.2, 0, { team: 'e', kind: 'wave', dmg: this.dmg * 0.8, life: 90, w: 10, h: 10, ground: true, pierce: 99, cause: 'Kevin, the large rat' }));
        if (abs(t.cx - this.cx) < 30) this.strike({ x: this.x - 8, y: this.y, w: this.w + 16, h: this.h });
        this.state = 'go'; this.cd = round(90 / sp);
      } }
    }
    this.physics(this.kind === 'barry' && this.state === 'dash' ? 1 : 0.8);
  }
  hurt(dmg, src, o = {}) {
    if (this.dead) return 0;
    dmg = max(1, round(dmg));
    this.hp -= dmg; this.flash = 5; this.hitT = this.t;
    FText.add(this.cx + rnd(-4, 4), this.y - 4, o.crit ? dmg + '!' : dmg, o.dot ? o.col || C.or2 : o.crit ? C.yl1 : '#fff6ea', { sc: o.crit ? 2 : 1, dmg: true, f: o.dot ? '3' : '5' });
    if (!o.dot) { sfx(o.crit ? 'crit' : 'hit', this.cx); sparks(this.cx, this.cy, 5, C.fu4); this.vx += (o.dir || 0) * 0.6; }
    if (o.stun) this.stun(o.stun);
    if (o.burn) this.addStatus('burn', o.burn);
    Run.dmgDealt += dmg;
    if (this.hp <= 0) {
      this.dead = true;
      gibs(RATART[this.kind][0], this.cx, this.cy, 6);
      confetti(this.cx, this.cy, 20); sfx('kill', this.cx); FX.shake(0.4); FX.stop(8);
      const alive = this.owner.rats.filter((r) => !r.dead);
      const lines = { gerald: ['GERALD NO', 'he was the brains', 'the crown was fake anyway'], barry: ['BARRY!!', 'barry owed me money', 'avenge barry'], kevin: ['KEVIN!', 'not kevin', 'kevin was the legs'] }[this.kind];
      if (alive.length) Bubbles.say(alive[0], pick(lines), 120);
    }
    return dmg;
  }
  draw() {
    const set = RATART[this.kind];
    const fr = set[abs(this.vx) > 0.3 ? floor(this.anim / 6) % 2 : 0];
    spr(fr, this.cx, this.bot + 1, this.face < 0, this.flash > 0, { sx: this.state === 'wind' && this.t % 4 < 2 ? 1.05 : 1 });
    if (this.state === 'wind') txt('!', this.cx, this.y - 14, C.rd3, { a: 'c', ol: C.ink });
    if (this.status.stun) for (let i = 0; i < 3; i++) { const a = this.t * 0.12 + (i * TAU) / 3; PX(g, this.cx + cos(a) * 7, this.y - 4 + sin(a) * 2, C.yl1); }
    txt(this.d.name.toUpperCase(), this.cx, this.y - 8, C.st4, { a: 'c', f: '3', ol: C.ink });
  }
}

// ---------------- 2. VACUUM-TRON 3000 ----------------
class Vacuum extends Boss {
  constructor(x, y) { super('vacuum', x, y, BOSS_INFO[1]); this.hum = null; this.charges = 0; this.lift = 0; }
  think() {
    const t = pl;
    this.st++;
    const hpF = this.hp / this.maxHp;
    if (this.phase === 1 && hpF < 0.55) { this.phase = 2; this.state = 'turbo'; this.st = 0; this.inv = 80; Game.cineFor(80); this.sayBig('TURBO MODE ENGAGED', C.rd3); sfx('roar'); }
    if (this.phase === 2 && hpF < 0.25) { this.phase = 3; this.state = 'liftoff'; this.st = 0; this.inv = 110; Game.cineFor(110); this.sayBig('VACUUM-TRON HAS ACHIEVED FLIGHT. WARRANTY VOID.', C.yl1); sfx('roar'); }
    const sp = this.phase >= 2 ? 1.3 : 1;
    if (!this.hum) this.hum = loopSound('vac');
    if (this.hum && this.t % 10 === 0) this.hum.set(this.state === 'suck' ? 0.2 : 0.08, this.state === 'suck' ? 90 : this.state === 'charge' ? 80 : 62);
    switch (this.state) {
      case 'turbo': case 'liftoff':
        this.vx = 0; if (this.st % 5 === 0) sparks(this.cx + rnd(-30, 30), this.y, 2, C.yl1);
        if (this.state === 'liftoff') { this.flying = true; this.noPlat = true; this.vy = -0.6; this.lift = min(1, this.st / 60); }
        if (this.st > (this.state === 'liftoff' ? 100 : 70)) { this.state = 'idle'; this.st = 0; this.atkCd = 30; }
        break;
      case 'idle':
        if (this.phase === 3) {
          const ty = lv.th * TS - 3 * TS - 100;
          this.vx = approach(this.vx, clamp((t.cx - this.cx) * 0.03, -2.4, 2.4), 0.08);
          this.vy = approach(this.vy, clamp((ty - this.y) * 0.03, -2, 2) + sin(this.t * 0.06) * 0.6, 0.1);
          if (this.atkCd <= 0) { this.state = MR.weighted([['bombs', 3], ['dive', 2], ['spit', 1]]); this.st = 0; sfx('tele', this.cx); }
        } else {
          this.faceTo(t);
          this.vx = approach(this.vx, this.face * 0.8 * sp, 0.05);
          if (this.atkCd <= 0) { this.state = MR.weighted([['charge', 4], ['suck', 2], ['spit', 2]]); this.st = 0; sfx('tele', this.cx); }
        }
        break;
      case 'charge':
        if (this.st < 40) { this.vx = 0; this.faceTo(t); if (this.st % 4 === 0) puff(this.cx - this.face * 30, this.bot - 6, 2, C.st3, { vx: -this.face * 1.5 }); if (this.st % 8 === 0) sfx('tele', this.cx); }
        else {
          this.vx = this.face * 6.4 * sp;
          this.contactHurt(1.1);
          if (this.phase >= 2 && this.st % 5 === 0) lv.projs.push(new Proj(this.cx - this.face * 30, this.bot - 4, 0, 0, { team: 'e', kind: 'spark', dmg: this.dmg * 0.5, life: 100, w: 6, h: 6, noclip: true, breakable: false, cause: 'electric floor sparks' }));
          if (this.hitWall) {
            sfx('bonk', this.cx); FX.shake(0.6); FX.stop(6); debris(this.cx + this.face * 32, this.cy, 12, [C.st3, C.st4, C.fu3], { sp: 3 });
            FText.add(this.cx, this.y - 16, 'BONK', C.yl1, { sc: 2 });
            this.charges++;
            if (this.phase >= 2 && this.charges % 2 === 1) { this.st = 30; this.face *= -1; }
            else { this.state = 'dazed'; this.st = 0; this.dmgMul = 1.5; }
          }
        }
        break;
      case 'dazed':
        this.vx *= 0.8;
        if (this.st % 10 === 0) stars(this.cx, this.y - 6, 2, C.yl1);
        if (this.st > 80) { this.dmgMul = 1; this.endAtk(40); }
        break;
      case 'suck': {
        this.vx = 0; this.faceTo(t);
        const mouthX = this.cx + this.face * 34, mouthY = this.bot - 8;
        if (this.st > 30 && this.st < 230) {
          const dx = mouthX - pl.cx, d = abs(dx) + 1;
          if (d < 300 && (pl.state === 'move' || pl.state === 'hurt')) pl.vx += sign(dx) * min(0.34, 18 / d) * (this.phase >= 2 ? 1.3 : 1);
          if (this.t % 2 === 0) { const a = rnd(-0.8, 0.8), r = rnd(60, 160); Parts.add({ k: 1, x: mouthX - this.face * cos(a) * r, y: mouthY + sin(a) * r * 0.4, vx: this.face * 5, vy: -sin(a) * 1.5, c: C.fu3, life: 14, len: 1.5 }); }
          if (dist(pl.cx, pl.cy, mouthX, mouthY) < 18) {
            pl.hurt(this.dmg * 1.1, this, { cause: 'being vacuumed', noKb: true });
            pl.vx = -this.face * 7; pl.vy = -5; pl.state = 'hurt'; pl.st = 0;
            FText.add(mouthX, mouthY - 14, 'PTOOEY', C.yl1, { sc: 2 });
            sfx('pop', mouthX);
          }
          if (this.st % 70 === 40) { const e = makeEnemy('dust', this.cx + this.face * 200, this.bot, false); e.aggro = true; if (!rectSolid(e.x, e.y, e.w, e.h)) lv.enemies.push(e); }
          for (const e of lv.enemies) if (e.type === 'dust' && !e.dead) { e.vx += sign(mouthX - e.cx) * 0.25; if (dist(e.cx, e.cy, mouthX, mouthY) < 16) { e.dead = true; sfx('nom', mouthX); FText.add(mouthX, mouthY - 10, 'GULP', C.st4, { f: '3' }); } }
        }
        if (this.st > 250) this.endAtk(50);
        break;
      }
      case 'spit':
        if (this.phase < 3) this.vx = 0; else { this.vx *= 0.9; this.vy *= 0.9; }
        if (this.st >= 24 && this.st <= 48 && this.st % 8 === 0) {
          const tx = t.cx + rnd(-60, 60), tt = 46;
          lv.projs.push(new Proj(this.cx + this.face * 30, this.y + 4, (tx - this.cx) / tt, -6, { team: 'e', kind: 'dust', dmg: this.dmg * 0.75, grav: 0.26, life: 140, w: 8, h: 8, cause: 'a dust ball', onDie: (p) => puff(p.cx, p.cy, 6, C.st4, { sp: 1.2 }) }));
          sfx('pop', this.cx);
        }
        if (this.st > 60) this.endAtk(40);
        break;
      case 'bombs':
        this.vx = approach(this.vx, clamp((t.cx - this.cx) * 0.04, -2.6, 2.6), 0.1);
        this.vy = approach(this.vy, sin(this.t * 0.08) * 0.5, 0.1);
        if (this.st % 22 === 0 && this.st < 110) {
          lv.projs.push(new Proj(this.cx, this.bot, this.vx * 0.5, 1, { team: 'e', kind: 'dust', dmg: this.dmg * 0.8, grav: 0.25, life: 120, w: 8, h: 8, cause: 'a dust bomb', onDie: (p) => explode(p.cx, p.cy, 30, this.dmg * 0.7, { team: 'e', small: true, cause: 'a dust bomb', col: C.st4 }) }));
          sfx('shoot', this.cx);
        }
        if (this.st > 120) this.endAtk(40);
        break;
      case 'dive':
        if (this.st < 40) { this.vx = approach(this.vx, clamp((t.cx - this.cx) * 0.06, -3, 3), 0.15); this.vy = -0.4; }
        else if (this.st < 100) {
          this.vx *= 0.9; this.vy = 7.5; this.contactHurt(1.2);
          if (this.onGround) { sfx('quake', this.cx); FX.shake(0.6); puff(this.cx, this.bot, 14, C.st4, { sp: 2.5, s: 2 }); for (const s of [-1, 1]) lv.projs.push(new Proj(this.cx + s * 30, this.bot - 6, s * 3.4, 0, { team: 'e', kind: 'wave', dmg: this.dmg * 0.7, life: 80, w: 10, h: 10, ground: true, pierce: 99, cause: 'a flying vacuum' })); this.st = 100; this.dmgMul = 1.5; }
        } else if (this.st < 160) { this.vx = 0; this.vy = 0; if (this.st % 10 === 0) stars(this.cx, this.y, 2, C.yl1); }
        else { this.dmgMul = 1; this.vy = -2; this.endAtk(40); }
        break;
    }
    if (this.phase === 3) { const pvx = this.vx; moveBody(this); if (this.hitWall) this.vx = -pvx; }
    else this.physics(1);
  }
  endAtk(cd) { this.state = 'idle'; this.st = 0; this.atkCd = round(cd * (this.phase >= 2 ? 0.7 : 1)); }
  die() { if (this.hum) this.hum.stop(); this.sayBig('LOW BATTERY. RETURNING TO DOCK... DOCK NOT FOUND.', C.st4); super.die(); }
  draw() {
    const L = liveSpr('vac', 80, 40, (c) => {
      const x = 40, by = 39, rage = this.phase >= 2 || this.state === 'charge';
      if (this.phase === 3) {
        for (const s of [-1, 1]) { R(c, x + s * 24 - 1, by - 32, 2, 8, C.st2); const w = floor(abs(sin(this.t * 0.9 + s)) * 12) + 2; R(c, x + s * 24 - w, by - 34, w * 2, 2, C.st4); }
      }
      R(c, x - 32, by - 22, 64, 18, C.st1);
      ELL(c, x, by - 22, 32, 4, C.st2);
      ELL(c, x, by - 23, 28, 3, C.st3);
      R(c, x - 32, by - 12, 64, 3, C.dk1);
      R(c, x + 26, by - 20, 6, 14, C.dk2);
      R(c, x - 20, by - 26, 16, 2, C.st4);
      const led = rage ? (this.t % 10 < 5 ? C.rd3 : C.rd2) : C.tl3;
      R(c, x + 16, by - 18, 6, 3, led); PX(c, x + 16, by - 18, C.wh);
      txt('VT3K', x - 22, by - 19, C.st4, { f: '3', c });
      DISC(c, x - 20, by - 3, 3, C.ink); DISC(c, x + 18, by - 3, 3, C.ink); PX(c, x - 20, by - 3, C.st3); PX(c, x + 18, by - 3, C.st3);
      const br = this.t * (this.state === 'charge' ? 0.8 : 0.3);
      for (let i = 0; i < 4; i++) { const a = br + (i * PI) / 2; LINE(c, x + 30, by - 4, x + 30 + cos(a) * (this.phase >= 2 ? 8 : 5), by - 4 + sin(a) * 2, C.yl1); }
      if (this.state === 'suck' && this.st > 30) { R(c, x + 30, by - 14, 4, 8, C.ink); }
      if (this.state === 'dazed' || (this.state === 'dive' && this.st >= 100)) { R(c, x + 14, by - 19, 9, 1, C.ink); }
    });
    drawLive(L, this.cx, this.bot + 1, this.face < 0, this.flash > 0);
    if (this.state === 'charge' && this.st < 40 && this.t % 6 < 3) glow(this.cx, this.cy, 40, C.rd3, 0.25);
    if (this.dmgMul > 1) txt('WEAK!', this.cx, this.y - 14, C.yl1, { a: 'c', f: '3', ol: C.ink });
    if (this.phase === 3 && !this.onGround) { const fy = lv.th * TS - 3 * TS; g.globalAlpha = 0.35; ELL(g, this.cx, fy - 1, 26, 2, C.ink); g.globalAlpha = 1; }
  }
}

// ---------------- 3. MONSIEUR ROACH ----------------
class RoachChef extends Boss {
  constructor(x, y) { super('roachchef', x, y, BOSS_INFO[2]); this.burners = []; }
  startFight() {
    super.startFight();
    const fy = (lv.th - 3) * TS;
    for (const fx of [0.28, 0.5, 0.72]) { const b = new Hazard(lv.tw * TS * fx, fy, 'burner'); b.controlled = true; b.update = function () { this.t++; if (this.fireT > 0) { this.fireT--; this.fire = this.fireT < 60; this.warn = this.fireT >= 60; if (this.fireT === 59) sfx('fire', this.cx); if (this.fire) { if (this.t % 2 === 0) Parts.add({ k: 2, x: this.cx + rnd(-10, 10), y: this.y - rnd(0, 6), vy: rnd(-3, -1.5), vx: rnd(-0.3, 0.3), s: rnd(2, 4), c: pick([C.or2, C.yl1, C.rd3]), life: rndi(14, 24), gr: -0.03, dr: 0.95, a: 0.9 }); Light.add(this.cx, this.y - 16, 50, '#ff9a3a', 0.6); const fb = { x: this.x + 2, y: this.y - 40, w: this.w - 4, h: 42 }; if (pl && overlap(fb, pl)) pl.hurt(dmgScale(14), this, { cause: 'a stove burner', burn: true }); } } else { this.fire = false; this.warn = false; } }; lv.items.push(b); this.burners.push(b); }
  }
  ignite(pattern) {
    const B = this.burners;
    if (pattern === 'all') B.forEach((b) => (b.fireT = 100));
    else B.forEach((b, i) => (b.fireT = 100 + i * 30 * (pattern === 'rev' ? -1 : 1) + (pattern === 'rev' ? 60 : 0)));
    this.sayBig(pick(['ALLUMEZ!', 'FIRE IN ZE HOLE', 'ze oven is preheated']), C.or2);
  }
  think() {
    const t = pl;
    this.st++;
    if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2; this.state = 'fly'; this.st = 0; this.inv = 120; Game.cineFor(120);
      this.sayBig('ZE ROACH... CAN FLY', C.rd3); sfx('buzz');
      Game.after(() => { if (pl && !pl.dead) Bubbles.say(pl, 'NOPE NOPE NOPE NOPE', 120); }, 900);
    }
    const sp = this.phase === 2 ? 1.25 : 1;
    switch (this.state) {
      case 'fly':
        this.flying = true; this.noPlat = true; this.vy = -1; this.vx = 0;
        if (this.st % 3 === 0) sfx('buzz', this.cx);
        if (this.st > 110) { this.state = 'idle'; this.st = 0; this.atkCd = 20; }
        break;
      case 'idle':
        this.faceTo(t);
        if (this.phase === 2) {
          const ty = (lv.th - 3) * TS - 110 + sin(this.t * 0.05) * 20;
          this.vx = approach(this.vx, clamp((t.cx - this.cx) * 0.03, -2.5, 2.5), 0.1);
          this.vy = approach(this.vy, clamp((ty - this.cy) * 0.05, -2, 2), 0.1);
          if (this.atkCd <= 0) { this.state = MR.weighted([['salt', 3], ['swoop', 3], ['cleavers', 2], ['burners', 1]]); this.st = 0; sfx('tele', this.cx); }
        } else {
          const dx = t.cx - this.cx;
          this.vx = approach(this.vx, abs(dx) > 90 ? sign(dx) * 1.1 : abs(dx) < 50 ? -sign(dx) * 0.9 : 0, 0.1);
          if (this.atkCd <= 0) { this.state = MR.weighted([['cleavers', 3], ['pancakes', 2], ['flambe', 2], ['dash', 2], ['burners', 1]]); this.st = 0; sfx('tele', this.cx); }
        }
        break;
      case 'cleavers':
        if (this.phase === 1) this.vx *= 0.7; else { this.vx *= 0.9; this.vy *= 0.9; }
        if (this.st === 20 || this.st === 30 || this.st === 40) {
          const off = (this.st - 30) * 4, tx = t.cx + off, tt = 36;
          lv.projs.push(new Proj(this.cx, this.y + 6, clamp((tx - this.cx) / tt, -6, 6), this.phase === 2 ? -1 : -6.5, { team: 'e', kind: 'cleaver', dmg: this.dmg * 0.8, grav: 0.32, life: 160, w: 8, h: 8, stick: true, breakable: true, cause: 'a cleaver. zis is cuisine.' }));
          sfx('whoosh', this.cx);
        }
        if (this.st > 60) this.endAtk(40);
        break;
      case 'pancakes':
        this.vx = 0;
        if (this.st === 16) { sfx('whoosh', this.cx); this.sayBig('CREPES!', C.yl1); }
        if (this.st === 70) for (let i = 0; i < 4; i++) {
          const x = clamp(t.cx + (i - 1.5) * 44 + rnd(-10, 10), 3 * TS, (lv.tw - 3) * TS);
          const pr = new Proj(x, Cam.y - 20 - i * 30, 0, 2, { team: 'e', kind: 'pancake', dmg: this.dmg * 0.9, grav: 0.18, life: 220, w: 14, h: 5, noclip: true, breakable: true, cause: 'a scalding pancake' });
          const up = pr.update.bind(pr);
          pr.update = () => { up(); if (pr.y + pr.h > (lv.th - 3) * TS) { pr.kill(); puff(pr.cx, pr.bot, 4, C.br4); sfx('splat', pr.cx); } };
          lv.projs.push(pr);
          lv.fx.push({ dead: false, t: 0, x, update() { if (++this.t > 90 || pr.dead) this.dead = true; }, draw() { const fy = (lv.th - 3) * TS; g.globalAlpha = 0.3 + 0.3 * (this.t / 90); ELL(g, this.x, fy - 1, 8, 1, C.ink); g.globalAlpha = 1; } });
        }
        if (this.st > 90) this.endAtk(40);
        break;
      case 'flambe':
        this.vx = 0; this.faceTo(t);
        if (this.st === 30) {
          this.sayBig('FLAMBE!', C.or2); sfx('fire', this.cx); FX.shake(0.2);
          lv.projs.push(new Proj(this.cx + this.face * 12, this.bot - 8, this.face * 2.6 * sp, 0, { team: 'e', kind: 'fire', dmg: this.dmg * 0.9, life: 200, w: 12, h: 18, ground: true, pierce: 99, breakable: false, burn: true, cause: 'a flambe' }));
        }
        if (this.st > 50) this.endAtk(50);
        break;
      case 'dash':
        if (this.st < 30) { this.vx = 0; this.faceTo(t); if (this.st % 8 === 0) sparks(this.cx + this.face * 10, this.cy, 2, C.wh); }
        else { this.vx = this.face * 6 * sp; this.contactHurt(1.1); if (this.st % 2 === 0) Parts.add({ k: 1, x: this.cx, y: this.cy + rnd(-10, 10), vx: -this.face * 4, vy: 0, c: C.fu4, life: 6, len: 2 }); if (this.hitWall || this.st > 70) { this.vx = 0; this.endAtk(40); } }
        break;
      case 'burners': this.vx *= 0.8; if (this.st === 20) this.ignite(MR.pick(['all', 'seq', 'rev'])); if (this.st > 40) this.endAtk(30); break;
      case 'salt':
        this.vx *= 0.95; this.vy *= 0.95;
        if (this.st === 10) this.sayBig('SEASONING!', C.fu4);
        if (this.st > 20 && this.st < 110 && this.st % 4 === 0) lv.projs.push(new Proj(Cam.x + rnd(20, W - 20), Cam.y - 10, 0, 2.6, { team: 'e', kind: 'salt', dmg: this.dmg * 0.45, life: 160, w: 3, h: 3, cause: 'excessive salt' }));
        if (this.st > 120) this.endAtk(30);
        break;
      case 'swoop':
        if (this.st < 30) { this.vx = approach(this.vx, 0, 0.2); this.vy = -1; this.faceTo(t); }
        else if (this.st === 30) { const a = atan2(t.cy - this.cy, t.cx - this.cx); this.vx = cos(a) * 6; this.vy = sin(a) * 6; sfx('dash', this.cx); }
        else { this.contactHurt(1.1); if (this.onGround || this.hitWall || this.st > 70) { this.vy = -3; this.endAtk(40); } }
        break;
    }
    if (this.phase === 2) { const pvx = this.vx; moveBody(this); if (this.hitWall) this.vx = -pvx * 0.5; }
    else this.physics(0.85);
  }
  endAtk(cd) { this.state = 'idle'; this.st = 0; this.atkCd = round(cd * (this.phase === 2 ? 0.7 : 1)); }
  draw() {
    const fly = this.phase === 2;
    const L = liveSpr('chef', 50, 60, (c) => {
      const x = 22, by = 59;
      const step = !fly && abs(this.vx) > 0.2 ? round(sin(this.t * 0.35) * 2) : 0;
      if (fly) { const w = this.t % 4 < 2 ? 0 : 6; ELL(c, x - 6, by - 32 - w, 12, 5, 'rgba(230,240,255,0.85)'); ELL(c, x + 2, by - 30 + w, 10, 4, 'rgba(230,240,255,0.7)'); }
      LINE(c, x - 3, by - 14, x - 6 + step, by, C.br0); LINE(c, x + 3, by - 14, x + 6 - step, by, C.br0);
      R(c, x - 9 + step, by - 1, 4, 1, C.br0); R(c, x + 4 - step, by - 1, 4, 1, C.br0);
      blob(c, x, by - 22, 8, 12, C.br0, C.br1, C.br2);
      LINE(c, x - 1, by - 32, x - 1, by - 12, C.br0);
      R(c, x - 5, by - 28, 11, 16, C.fu4); R(c, x - 5, by - 28, 11, 2, C.fu3); R(c, x - 2, by - 22, 5, 3, C.rd2);
      const hy = by - 40;
      blob(c, x + 2, hy, 6, 5, C.dk1, C.dk2, C.dk3);
      R(c, x + 3, hy - 2, 3, 2, C.wh); PX(c, x + 4, hy - 2, C.ink); PX(c, x + 7, hy - 2, C.ink);
      LINE(c, x + 2, hy + 3, x + 10, hy + 1, C.ink, 2); LINE(c, x + 2, hy + 3, x - 4, hy + 2, C.ink, 2);
      R(c, x - 4, hy - 12, 13, 6, C.fu4); DISC(c, x - 2, hy - 13, 4, C.fu4); DISC(c, x + 4, hy - 15, 4, C.wh); DISC(c, x + 8, hy - 12, 3, C.fu4); R(c, x - 4, hy - 7, 13, 1, C.fu3);
      LINE(c, x + 6, hy - 5, x + 14, hy - 14, C.br1); LINE(c, x + 4, hy - 5, x + 6, hy - 15, C.br1);
      const raise = this.state === 'cleavers' || (this.state === 'pancakes' && this.st < 30) || (this.state === 'flambe' && this.st < 30);
      const ax = x + 6, ay = by - 26;
      if (this.state === 'pancakes') { LINE(c, ax, ay, ax + 10, ay - (this.st < 16 ? 2 : 10), C.br1); R(c, ax + 8, ay - (this.st < 16 ? 4 : 13), 12, 3, C.st2); }
      else if (this.state === 'flambe') { LINE(c, ax, ay, ax + 8, ay - 4, C.br1); R(c, ax + 7, ay - 9, 5, 9, C.gr1); R(c, ax + 8, ay - 11, 3, 2, C.br3); }
      else if (raise) { LINE(c, ax, ay, ax - 2, ay - 14, C.br1); R(c, ax - 6, ay - 20, 8, 6, C.st4); R(c, ax - 2, ay - 15, 2, 4, C.br1); }
      else { LINE(c, ax, ay, ax + 9, ay + 4, C.br1); OLINE(c, ax + 9, ay + 4, ax + 21, ay + 2, C.st5); }
    });
    drawLive(L, this.cx, this.bot + 1, this.face < 0, this.flash > 0);
    if (this.state === 'dash' && this.st < 30 && this.t % 8 < 4) glow(this.cx + this.face * 14, this.cy, 10, C.wh, 0.5);
  }
}

// ---------------- 4. MITTENS ----------------
class Paw extends Enemy {
  constructor(cat, side) {
    super('paw', 0, 0, false);
    this.cat = cat; this.side = side; this.boss = true;
    this.w = 30; this.h = 24; this.state = 'hold'; this.st = 0;
    this.flying = true; this.intangible = true; this.down = false;
    this.restX = 0; this.restY = 0;
  }
  floorY() { return (lv.th - 3) * TS; }
  update() {
    this.t++; if (this.flash > 0) this.flash--;
    this.st++;
    const fy = this.floorY();
    switch (this.state) {
      case 'hold': {
        this.intangible = true; this.down = false;
        const hx = this.cat.cx + this.side * 150, hy = this.cat.y - 30;
        this.x = lerp(this.x, hx - this.w / 2, 0.08); this.y = lerp(this.y, hy, 0.08);
        break;
      }
      case 'raise':
        this.intangible = true;
        this.x = lerp(this.x, this.tx - this.w / 2, 0.15); this.y = lerp(this.y, fy - 120, 0.12);
        if (this.st >= this.wind) { this.state = 'slam'; this.st = 0; }
        break;
      case 'slam':
        this.y += 14;
        if (this.y + this.h >= fy) {
          this.y = fy - this.h; this.state = 'down'; this.st = 0; this.down = true; this.intangible = false;
          sfx('thud', this.cx); FX.shake(0.45); puff(this.cx, fy, 8, C.fu3, { sp: 2, s: 2 });
          if (pl && overlap({ x: this.x - 2, y: this.y - 4, w: this.w + 4, h: this.h + 4 }, pl)) pl.hurt(this.cat.dmg, this, { cause: 'a giant paw. boop.', kb: 4 });
          if (this.waves) for (const s of [-1, 1]) lv.projs.push(new Proj(this.cx + s * 18, fy - 6, s * 3.2, 0, { team: 'e', kind: 'wave', dmg: this.cat.dmg * 0.6, life: 70, w: 10, h: 10, ground: true, pierce: 99, cause: 'a paw shockwave' }));
        } else if (pl && overlap(this, pl)) pl.hurt(this.cat.dmg, this, { cause: 'a giant paw', kb: 4 });
        break;
      case 'down':
        if (this.st > this.rest) { this.state = 'hold'; this.st = 0; this.intangible = true; this.down = false; }
        break;
      case 'swipe': {
        this.intangible = this.st < 40;
        const startX = this.side < 0 ? 0 : lv.tw * TS;
        if (this.st < 40) { this.x = lerp(this.x, startX - this.w / 2 + this.side * -10, 0.15); this.y = lerp(this.y, fy - this.h, 0.2); }
        else {
          this.x += -this.side * 9; this.y = fy - this.h;
          if (pl && overlap(this, pl)) pl.hurt(this.cat.dmg, this, { cause: 'a paw swipe', kb: 5 });
          if (this.t % 2 === 0) puff(this.cx, fy - 2, 1, C.fu3);
          if ((this.side < 0 && this.x > lv.tw * TS) || (this.side > 0 && this.x < -this.w)) { this.state = 'hold'; this.st = 0; this.y = this.cat.y - 60; this.x = this.cat.cx + this.side * 150; }
        }
        break;
      }
    }
  }
  hurt(dmg, src, o = {}) {
    if (!this.down) return 0;
    this.flash = 5;
    return this.cat.hurt(dmg, src, Object.assign({}, o, { hx: this.cx, hy: this.cy }));
  }
  addStatus() {}
  stun() {}
  draw() {
    const L = liveSpr('paw' + this.side, 40, 34, (c) => {
      const x = 20;
      R(c, x - 10, 0, 20, 18, C.or1); R(c, x - 6, 0, 4, 18, C.or0); R(c, x + 3, 0, 3, 18, C.or0);
      ELL(c, x, 22, 14, 9, C.or1); ELL(c, x - 1, 24, 12, 6, C.fu4);
      for (let i = 0; i < 4; i++) { DISC(c, x - 9 + i * 6, 29, 2, C.pk2); }
      if (this.state === 'slam' || this.state === 'swipe') for (let i = 0; i < 4; i++) LINE(c, x - 9 + i * 6, 31, x - 9 + i * 6, 33, C.wh);
    });
    if (this.state === 'raise') {
      const fy = this.floorY();
      const k = clamp(this.st / this.wind, 0, 1);
      g.globalAlpha = 0.25 + k * 0.4; ELL(g, this.tx, fy - 1, round(8 + 10 * k), 2, C.ink); g.globalAlpha = 1;
      if (this.st > this.wind - 16 && this.t % 6 < 3) txt('!', this.tx, fy - 24, C.rd3, { a: 'c', ol: C.ink, sc: 2 });
    }
    if (this.state === 'swipe' && this.st < 40 && this.t % 8 < 4) txt('!!', clamp(this.cx, Cam.x + 20, Cam.x + W - 20), this.y - 14, C.rd3, { a: 'c', ol: C.ink, sc: 2 });
    drawLive(L, this.cx, this.bot + 6, this.side > 0, this.flash > 0);
    if (this.down) txt('HIT ME', this.cx, this.y - 10, C.yl1, { a: 'c', f: '3', ol: C.ink });
  }
}
class Mittens extends Boss {
  constructor(x, y) {
    super('mittens', x, y, BOSS_INFO[3]);
    this.flying = true; this.noPlat = true;
    this.lives = 9; this.bar = 0; this.barHp = this.maxHp / 3;
    this.headLow = 0; this.mouth = 0; this.lookX = 0; this.blink = 0;
    this.hx = x; this.hy = y;
    this.paws = [new Paw(this, -1), new Paw(this, 1)];
    for (const p of this.paws) { p.x = x + p.side * 150; p.y = y - 40; lv.enemies.push(p); }
    this.laser = null; this.intangible = true;
  }
  floorY() { return (lv.th - 3) * TS; }
  hurt(dmg, src, o = {}) {
    if (this.state === 'trans' || this.dead) return 0;
    const head = this.headLow > 0.6 && src === pl;
    if (head) dmg *= 1.4;
    this.intangible = false;
    const r = super.hurt(dmg, src, o);
    this.intangible = this.headLow < 0.6;
    const bars = 3 - ceil(this.hp / this.barHp);
    if (bars > this.bar && this.hp > 0) this.nextLife();
    return r;
  }
  nextLife() {
    this.bar++;
    this.state = 'trans'; this.st = 0; this.inv = 200; Game.cineFor(170);
    this.laser = null;
    for (const p of this.paws) { p.state = 'hold'; p.st = 0; }
    sfx('hiss');
    if (this.bar === 1) { this.lives = 8; this.sayBig('MITTENS LOST A LIFE', C.yl1); Game.after(() => { if (!this.dead) { this.lives = 3; this.sayBig('...AND 5 MORE IN A CUCUMBER INCIDENT', C.gr3); sfx('meow'); } }, 1300); }
    else { this.lives = 1; this.sayBig('LAST LIFE. ZOOMIES UNLOCKED.', C.rd3); }
  }
  think() {
    const t = pl, fy = this.floorY();
    this.st++;
    this.lookX = lerp(this.lookX, clamp((t.cx - this.hx) / 40, -3, 3), 0.1);
    if (--this.blink < -8) this.blink = rndi(80, 200);
    const sp = 1 + this.bar * 0.25;
    const headTarget = this.state === 'bite' && this.st > 20 ? 1 : 0;
    this.headLow = lerp(this.headLow, headTarget, 0.08);
    this.intangible = this.headLow < 0.6;
    const baseY = this.hy, lowY = fy - 64;
    this.y = lerp(baseY, lowY, this.headLow) + sin(this.t * 0.03) * 3;
    if (this.state !== 'bite') this.x = lerp(this.x, this.hx - this.w / 2 + this.lookX * 6, 0.05);
    if (this.laser) this.updLaser();
    switch (this.state) {
      case 'trans':
        if (this.st % 10 === 0) FX.shake(0.25);
        if (this.st > 160) { this.state = 'idle'; this.st = 0; this.atkCd = 40; }
        break;
      case 'idle':
        if (this.atkCd <= 0) {
          const opts = [['slam', 4], ['swipe', 3], ['hairball', 2], ['knock', 2], ['laser', 2], ['bite', 2]];
          if (this.bar >= 2) opts.push(['zoomies', 3]);
          this.state = MR.weighted(opts); this.st = 0;
        }
        break;
      case 'slam': {
        const n = 1 + (this.bar >= 1 ? 1 : 0);
        if (this.st === 1) { sfx('tele'); }
        if (this.st === 1 || (n > 1 && this.st === 40)) {
          const p = this.paws[this.st === 1 ? (t.cx < this.hx ? 0 : 1) : (t.cx < this.hx ? 1 : 0)];
          if (p.state === 'hold') { p.state = 'raise'; p.st = 0; p.tx = t.cx; p.wind = round(46 / sp); p.rest = 80; p.waves = this.bar >= 1; }
        }
        if (this.st > 110) this.endAtk(30);
        break;
      }
      case 'swipe': {
        if (this.st === 1) { const p = this.paws[MR.int(0, 1)]; p.state = 'swipe'; p.st = 0; sfx('hiss'); this.sayBig(pick(['*hisss*', 'MRRRAW', 'swat.']), C.yl1); }
        if (this.st === 60 && this.bar >= 2) { const p = this.paws.find((q) => q.state === 'hold'); if (p) { p.state = 'swipe'; p.st = 0; } }
        if (this.st > 120) this.endAtk(30);
        break;
      }
      case 'hairball':
        this.mouth = this.st > 50 ? 1 : 0;
        if (this.st === 1) { sfx('hack'); this.sayBig('HACK. HACK. HURK.', C.st4); }
        if (this.st === 60) {
          for (let i = 0; i < 1 + this.bar; i++) lv.projs.push(new Proj(this.cx, this.y + 50, (t.cx > this.cx ? 1 : -1) * (2.5 + i), -3, { team: 'e', kind: 'hairball', dmg: this.dmg * 0.8, grav: 0.22, bouncy: true, life: 300, w: 12, h: 12, breakable: false, cause: 'a hairball. gross.', onBounce: (p) => { sfx('splat', p.cx); FX.shake(0.15); } }));
          sfx('splat');
        }
        if (this.st > 80) { this.mouth = 0; this.endAtk(40); }
        break;
      case 'knock':
        if (this.st === 1) this.sayBig(pick(['*stares at you*', '*pushes glass*', 'oops']), C.yl1);
        if (this.st > 20 && this.st < 100 && this.st % (16 - this.bar * 3) === 0) {
          const x = clamp(t.cx + rnd(-90, 90), 3 * TS, (lv.tw - 3) * TS);
          const pr = new Proj(x, Cam.y - 16, 0, 1, { team: 'e', kind: 'mug', dmg: this.dmg * 0.8, grav: 0.22, life: 200, w: 10, h: 10, noclip: true, breakable: true, cause: 'a mug knocked off a shelf' });
          const up = pr.update.bind(pr);
          pr.update = () => { up(); if (pr.bot > fy) { pr.dead = true; sfx('glass', pr.cx); for (let i = 0; i < 4; i++) lv.projs.push(new Proj(pr.cx, fy - 6, rnd(-3, 3), rnd(-4, -2), { team: 'e', kind: 'shard', dmg: this.dmg * 0.4, grav: 0.25, life: 60, w: 4, h: 4, cause: 'mug shrapnel' })); } };
          lv.projs.push(pr);
          lv.fx.push({ dead: false, t: 0, x, update() { if (++this.t > 60 || pr.dead) this.dead = true; }, draw() { g.globalAlpha = 0.25 + this.t / 120; ELL(g, this.x, fy - 1, 7, 1, C.ink); g.globalAlpha = 1; } });
        }
        if (this.st > 120) this.endAtk(30);
        break;
      case 'laser':
        if (this.st === 1) { this.laser = { x: t.cx + 120 * (chance(0.5) ? 1 : -1), y: fy - 2, n: 5 + this.bar * 2, cd: 50 }; this.sayBig('!!! THE RED DOT !!!', C.rd3); sfx('meow'); }
        if (!this.laser && this.st > 2) this.endAtk(40);
        break;
      case 'bite':
        this.mouth = this.st > 40 && this.st < 70 ? 1 : 0;
        if (this.st < 20) this.x = lerp(this.x, clamp(t.cx, 6 * TS, (lv.tw - 6) * TS) - this.w / 2, 0.1);
        if (this.st === 20) sfx('hiss');
        if (this.st === 56) { sfx('snap', this.cx); FX.shake(0.4); this.strike({ x: this.x + 10, y: this.y + 30, w: this.w - 20, h: 44 }, 1.3); }
        if (this.st === 70) this.sayBig(pick(['*yawn*', 'mrrp', '*grooming*']), C.st4);
        if (this.st > 170) this.endAtk(40);
        break;
      case 'zoomies':
        if (this.st === 1) { this.sayBig('ZOOMIES!!!', C.rd3); sfx('roar'); this.zoomDir = chance(0.5) ? 1 : -1; this.zoomX = this.zoomDir > 0 ? -160 : lv.tw * TS + 160; }
        if (this.st < 50) { if (this.st % 6 === 0) FX.shake(0.2); }
        else {
          this.zoomX += this.zoomDir * 13;
          if (this.st % 3 === 0) puff(this.zoomX, fy - 4, 3, C.fu3, { sp: 2 });
          const box = { x: this.zoomX - 50, y: fy - 40, w: 100, h: 40 };
          if (pl && overlap(box, pl)) pl.hurt(this.dmg * 1.2, { cx: this.zoomX }, { cause: 'the zoomies', kb: 6 });
          if ((this.zoomDir > 0 && this.zoomX > lv.tw * TS + 160) || (this.zoomDir < 0 && this.zoomX < -160)) { this.zoomX = null; this.endAtk(40); }
        }
        break;
    }
  }
  updLaser() {
    const L = this.laser, t = pl;
    L.x = lerp(L.x, t.cx + sin(this.t * 0.07) * 30, 0.035 * (1 + this.bar * 0.3));
    L.x = clamp(L.x, 3 * TS, (lv.tw - 3) * TS);
    if (this.t % 6 === 0) sfx('laser', L.x);
    if (--L.cd <= 0) {
      const p = this.paws.find((q) => q.state === 'hold' || q.state === 'down');
      if (p) { p.state = 'raise'; p.st = 0; p.tx = L.x; p.wind = round(26 / (1 + this.bar * 0.15)); p.rest = 30; p.waves = false; L.n--; L.cd = 36 - this.bar * 4; }
      if (L.n <= 0) this.laser = null;
    }
  }
  endAtk(cd) { this.state = 'idle'; this.st = 0; this.atkCd = round(cd / (1 + this.bar * 0.3)); }
  die() {
    for (const p of this.paws) p.dead = true;
    this.laser = null;
    this.sayBig('*yawns* ...mittens is taking a nap', C.st4);
    super.die();
  }
  drawBack() {
    const x = round(this.hx + this.lookX * 2), y = round(this.y);
    const L = liveSpr('cathead', 150, 110, (c) => {
      const cx = 75, cy = 62, low = this.headLow;
      POLY(c, [cx - 62, cy - 20, cx - 30, cy - 46, cx - 52, cy - 62], C.or1); POLY(c, [cx - 54, cy - 26, cx - 36, cy - 42, cx - 49, cy - 54], C.pk1);
      POLY(c, [cx + 62, cy - 20, cx + 30, cy - 46, cx + 52, cy - 62], C.or1); POLY(c, [cx + 54, cy - 26, cx + 36, cy - 42, cx + 49, cy - 54], C.pk1);
      ELL(c, cx, cy, 64, 46, C.or0); ELL(c, cx, cy - 2, 62, 44, C.or1);
      for (let i = -2; i <= 2; i++) POLY(c, [cx + i * 12 - 3, cy - 46, cx + i * 12 + 3, cy - 46, cx + i * 10, cy - 30], C.or0);
      ELL(c, cx, cy + 22, 34, 18, C.fu4); ELL(c, cx, cy + 12, 22, 10, C.fu4);
      const ex = this.lookX * 2;
      for (const s of [-1, 1]) {
        const eyx = cx + s * 24;
        if (this.blink < 0 || this.state === 'trans' && this.st > 100) R(c, eyx - 10, cy - 8, 20, 2, C.ink);
        else {
          ELL(c, eyx, cy - 8, 11, 9, C.gr4); ELL(c, eyx, cy - 9, 9, 7, C.yl1);
          const pw = this.laser || this.state === 'zoomies' ? 5 : 2;
          R(c, eyx + ex - floor(pw / 2), cy - 16, pw, 16, C.ink); PX(c, eyx + ex - 3, cy - 13, C.wh); R(c, eyx + ex - 4, cy - 14, 2, 2, C.wh);
        }
      }
      POLY(c, [cx - 6, cy + 8, cx + 6, cy + 8, cx, cy + 14], C.pk1); PX(c, cx - 2, cy + 9, C.pk2);
      LINE(c, cx, cy + 14, cx, cy + 18, C.ink); LINE(c, cx, cy + 18, cx - 6, cy + 21, C.ink); LINE(c, cx, cy + 18, cx + 6, cy + 21, C.ink);
      if (this.mouth) { ELL(c, cx, cy + 28, 14, 10, C.rd0); ELL(c, cx, cy + 32, 10, 5, C.pk1); POLY(c, [cx - 10, cy + 19, cx - 6, cy + 19, cx - 8, cy + 26], C.wh); POLY(c, [cx + 6, cy + 19, cx + 10, cy + 19, cx + 8, cy + 26], C.wh); }
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) LINE(c, cx + s * 30, cy + 14 + i * 4, cx + s * 70, cy + 6 + i * 8, C.fu4);
      if (low > 0.6) txt('BOOP', cx, cy + 6, C.yl1, { a: 'c', f: '3', c });
    });
    const sc = 1.6;
    g.save(); g.translate(x, y + 30);
    const src = this.flash > 0 && this.headLow > 0.6 ? null : L.b;
    if (src) g.drawImage(src, round(-src.width * sc / 2), round(-src.height * sc / 2), round(src.width * sc), round(src.height * sc));
    else { drawLive(L, 0, 0, false, true, 0.5, 0.5); }
    g.restore();
  }
  draw() {
    if (this.laser) {
      const L = this.laser;
      DISC(g, L.x, L.y, 3, C.rd2); DISC(g, L.x, L.y, 1, C.wh); glow(L.x, L.y, 10, C.rd3, 0.8);
      Light.add(L.x, L.y, 30, '#ff2020', 0.8);
    }
    if (this.state === 'zoomies' && this.zoomX !== null && this.st >= 50) {
      const fy = this.floorY(), x = this.zoomX, d = this.zoomDir;
      const L = liveSpr('catbody', 130, 56, (c) => {
        ELL(c, 60, 32, 46, 16, C.or1); for (let i = 0; i < 5; i++) LINE(c, 30 + i * 12, 18, 26 + i * 12, 44, C.or0);
        DISC(c, 104, 22, 16, C.or1); POLY(c, [94, 10, 100, 0, 104, 10], C.or1); POLY(c, [108, 10, 114, 0, 116, 12], C.or1);
        R(c, 106, 18, 4, 4, C.yl1); PX(c, 108, 18, C.ink); R(c, 114, 18, 4, 4, C.yl1);
        LINE(c, 14, 30, 2, 12 + (this.t % 6), C.or1, 4);
        const ph = this.t % 4 < 2;
        R(c, 30 + (ph ? 6 : -6), 44, 6, 12, C.or0); R(c, 84 + (ph ? -6 : 6), 44, 6, 12, C.or0);
      });
      drawLive(L, x, fy + 1, d < 0, false);
      for (let i = 0; i < 6; i++) LINE(g, x - d * (70 + i * 10), fy - 10 - i * 5, x - d * (110 + i * 14), fy - 10 - i * 5, C.fu4);
    }
  }
}

// ---------------- boss management ----------------
function spawnBoss(i, x, y) {
  const B = [RatKing, Vacuum, RoachChef, Mittens][i];
  if (i === 3) { const m = new Mittens((lv.tw * TS) / 2, 70); lv.enemies.push(m); return m; }
  const b = new B(x, y);
  lv.enemies.push(b);
  return b;
}
function bossDefeated(b) {
  const i = BOSS_INFO.indexOf(b.info);
  Run.bossKills++;
  FX.slowmo(0.25, 100); FX.flash(0.9, '#fff'); FX.shake(1);
  sfx('bossdie'); Music.stop();
  for (let k = 0; k < 6; k++) Game.after(() => { if (lv && b) explode(b.cx + rnd(-30, 30), b.cy + rnd(-20, 20), 30, 0, { team: 'x', small: k % 2 === 0, confetti: true }); }, k * 220);
  Game.bossDone = true;
  const door = lv.items.find((it) => it instanceof Door);
  Game.after(() => {
    if (!lv || lv.kind !== 'boss') return;
    if (door) { door.locked = false; puff(door.cx, door.cy, 10, C.yl1); }
    dropCoins(b.cx, b.y, 60 + i * 50);
    dropCrumbs(b.cx, b.y, 25 + i * 15);
    lv.items.push(new Food(b.cx - 20, b.bot - 4, 'feast'));
    const altar = new SnackAltar(b.cx + 30, (lv.th - 3) * TS);
    altar.opts = ['fury', 'cunning', 'grit'];
    lv.items.push(altar);
    const bp = rollBlueprint();
    if (bp) lv.items.push(new Blueprint(b.cx, b.y, bp));
    Music.play('hub');
  }, 1500);
  const S = Save.data.stats;
  S.bossKills[i] = (S.bossKills[i] || 0) + 1;
  unlockHat(b.info.hat, true);
  if (i === 3) Game.after(() => Game.victory(), 4200);
  Save.write();
  UI.banner(b.info.name + ' DEFEATED', i === 3 ? 'the house is yours. probably.' : pick(['nice squeaking', 'they had it coming', 'a decisive nibble', 'good mouse']), C.yl1);
}

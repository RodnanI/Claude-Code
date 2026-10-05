// SQUEAKBORNE :: player
// Squeak the mouse: movement, dodges, ground pound, health, healing, taunts and animation.

const PH = {
  run: 2.15, accG: 0.42, accA: 0.3, fricG: 0.48, fricA: 0.12, gHold: 0.21, gUp: 0.5, gFall: 0.38, maxFall: 6.2,
  jump: 5.2, djump: 4.6, slide: 1.25, wjx: 2.9, wjy: 5.0, coyote: 7, jbuf: 8, roll: 3.6, rollT: 22, dash: 4.8, dashT: 12,
};
const SLOT_KEYS = ['atk1', 'atk2', 'skill1', 'skill2'];

class Player extends Ent {
  constructor() {
    super(0, 0, 8, 14);
    this.maxHp = 100; this.hp = 100; this.rally = 0; this.rallyT = 0;
    this.maxFlasks = 2; this.flasks = 2;
    this.slots = [null, null, null, null];
    this.state = 'move'; this.st = 0;
    this.coyote = 0; this.jumps = 0; this.dashUsed = false;
    this.wallDir = 0; this.wallCoyote = 0; this.lockX = 0;
    this.act = null; this.inv = 0; this.flash = 0;
    this.cornerFix = true; this.dropT = 0;
    this.tail = chainInit(7, 0, 0); this.scarf = chainInit(6, 0, 0);
    this.sq = { x: 1, y: 1 };
    this.hat = Save.data.hat; this.blinkT = 120; this.runPh = 0;
    this.healT = 0; this.healAmt = 0;
    this.buffs = {}; this.after = []; this.bufSlot = -1; this.bufT = 0;
    this.flip = 0; this.safe = null; this.safeT = 0; this.hatOff = 0;
    this.fallStart = 0; this.cursedFx = 0; this.lastLand = 0; this.idleT = 0;
    this.lookT = 0; this.dodgeCd = 0; this.dodgeFx = 0; this.squeakCd = 0; this.lastDodge = -999; this.comboStacks = 0;
  }
  place(x, y) {
    this.x = x - this.w / 2; this.y = y - this.h; this.vx = 0; this.vy = 0;
    this.tail = chainInit(7, this.cx - 4, this.bot - 4);
    this.scarf = chainInit(6, this.cx - 3, this.bot - 9);
    this.safe = { x: this.x, y: this.y };
    this.state = 'move'; this.act = null; this.dead = false;
  }
  get maxJumps() { return Run && Run.quirks.includes('triplejump') ? 2 : 1; }
  recalc() {
    const s = Run.stats, tot = s.fury + s.cunning + s.grit;
    let m = 100 * (1 + 0.1 * tot + 0.15 * s.grit);
    if (Save.data.upg.thick) m *= 1.15;
    if (Run.quirks.includes('glass')) m *= 0.6;
    m = round(m);
    if (m > this.maxHp) this.hp += m - this.maxHp;
    this.maxHp = m;
    this.hp = min(this.hp, m);
  }
  addStat(s) {
    Run.stats[s]++;
    this.recalc();
    this.heal(this.maxHp * 0.15, false);
    sfx('levelup');
    FX.flash(0.25, STATS[s].col);
    ringFx(this.cx, this.cy, STATS[s].col, 40, 24, 2);
    confetti(this.cx, this.y, 16);
    FText.add(this.cx, this.y - 12, '+1 ' + STATS[s].name.toUpperCase(), STATS[s].col, { sc: 1, life: 80 });
    Run.snacks++;
  }
  heal(n, show) {
    const before = this.hp;
    this.hp = min(this.maxHp, this.hp + n);
    this.rally = max(0, min(this.rally, this.maxHp - this.hp));
    if (show && this.hp > before) FText.add(this.cx, this.y - 8, '+' + round(this.hp - before), C.gr3);
  }
  // ---------------- update ----------------
  update() {
    this.t++;
    if (this.inv > 0) this.inv--;
    if (this.flash > 0) this.flash--;
    if (this.lockX > 0) this.lockX--;
    if (this.dropT > 0) this.dropT--;
    if (this.hatOff > 0) this.hatOff--;
    if (this.cursedFx > 0) this.cursedFx--;
    for (const k in this.buffs) if (--this.buffs[k] <= 0) delete this.buffs[k];
    if (this.rallyT > 0) this.rallyT--; else this.rally = max(0, this.rally - 0.35);
    this.sq.x += (1 - this.sq.x) * 0.2; this.sq.y += (1 - this.sq.y) * 0.2;
    if (this.flip > 0) this.flip--;
    if (--this.blinkT < -6) this.blinkT = rndi(90, 240);
    for (const a of this.after) a.life--;
    this.after = this.after.filter((a) => a.life > 0);
    for (const s of this.slots) if (s && s.cd > 0) s.cd -= this.buffs.sugar ? 1.6 : 1;

    const L = Input.d('left'), Rr = Input.d('right');
    const dir = (Rr ? 1 : 0) - (L ? 1 : 0);
    this.lookUp = Input.d('up') && this.onGround && !dir && abs(this.vx) < 0.2;
    this.lookDown = Input.d('down') && this.onGround && !dir && abs(this.vx) < 0.2 && this.lookT++ > 25;
    if (!Input.d('down')) this.lookT = 0;

    switch (this.state) {
      case 'move': this.upMove(dir); break;
      case 'roll': this.upRoll(dir); break;
      case 'dash': this.upDash(); break;
      case 'stomp': this.upStomp(); break;
      case 'hurt': this.vy = min(this.vy + PH.gFall, PH.maxFall); this.vx *= 0.9; if (++this.st > 14) this.state = 'move'; break;
      case 'taunt': this.vx *= 0.7; this.vy = min(this.vy + PH.gFall, PH.maxFall); if (++this.st > 30) this.state = 'move'; break;
      case 'dead': this.vx *= 0.92; this.vy = min(this.vy + 0.2, 4); this.st++; if (this.st === 100) Game.onDeath(); break;
      case 'enter': this.vx = 0; this.vy = 0; this.st++; break;
      case 'cine': this.vx *= 0.8; this.vy = min(this.vy + PH.gFall, PH.maxFall); break;
    }
    if (this.act) updateAct(this);

    const wasGround = this.onGround, preVy = this.vy;
    if (this.state !== 'enter') moveBody(this);
    if (this.onGround) {
      if (!wasGround) this.onLand(preVy);
      this.coyote = PH.coyote; this.jumps = 0; this.dashUsed = false;
      touchCrumble(this);
      if (++this.safeT > 20 && !spikeUnder(this) && rectSolid(this.x, this.bot, this.w, 2)) { this.safe = { x: this.x, y: this.y }; this.safeT = 0; }
    } else if (this.coyote > 0) this.coyote--;
    if (this.state !== 'dead' && spikeUnder(this) && this.vy >= 0) this.spiked();
    if (this.y > lv.th * TS + 40) { this.place(this.safe.x + this.w / 2, this.safe.y + this.h); this.hurt(this.maxHp * 0.15, null, { cause: 'the void', unblockable: true, noKb: true }); }
    // ambient chains
    const ax = this.cx, ay = this.bot;
    const bob = this.state === 'roll' ? -7 : 0;
    const f = this.face;
    chainStep(this.tail, ax - 4 * f, ay - 4 + bob, 2.1, 0.03, 0.86, -this.vx * 0.05, 0.1, this.t, (i) => [-f * i * 2, i * 0.5 - i * i * 0.2], 0.09);
    chainStep(this.scarf, ax - 3 * f, ay - 10 + bob, 1.9, 0.03, 0.85, -this.vx * 0.08 - f * 0.08, 0.18, this.t + 30, (i) => [-f * i * 1.9, i * 0.35], 0.07);
    if (this.cursedFx > 0 || (Run && Run.curse > 0 && this.t % 6 === 0)) Parts.add({ k: 2, x: this.cx + rnd(-5, 5), y: this.cy + rnd(-6, 6), vy: -0.6, s: 1.5, c: C.vi2, life: 20, gr: -0.01, a: 0.7 });
    if (this.buffs.sass && this.t % 5 === 0) Parts.add({ k: 5, x: this.cx + rnd(-6, 6), y: this.y + rnd(0, 10), vy: -0.5, s: 1, c: C.rd3, life: 16 });
    if (this.buffs.sugar && this.t % 3 === 0) Parts.add({ k: 0, x: this.cx + rnd(-4, 4), y: this.cy + rnd(-4, 4), vx: -this.vx * 0.3, s: 1, c: C.fu4, life: 14 });
  }
  upMove(dir) {
    const healing = this.healT > 0;
    let spd = PH.run * (this.buffs.sugar ? 1.35 : 1) * (Run.quirks.includes('zoomies') ? 1.15 : 1);
    if (healing) spd *= 0.45;
    if (this.buffs.slowed) spd *= 0.6;
    if (this.act) spd *= this.act.moveMul !== undefined ? this.act.moveMul : 0.25;
    if (this.lockX > 0) dir = 0;
    const want = dir * spd;
    const acc = this.onGround ? (dir ? PH.accG : PH.fricG) : dir ? PH.accA : PH.fricA;
    if (this.lockX <= 0) this.vx = approach(this.vx, want, acc);
    if (dir && (!this.act || this.act.canTurn)) this.face = dir;
    if (this.onGround && abs(this.vx) > 0.5) {
      this.runPh += abs(this.vx) * 0.17;
      if (floor(this.runPh / PI) !== floor((this.runPh - abs(this.vx) * 0.17) / PI)) { sfx('step', this.cx); if (abs(this.vx) > 1.6) puff(this.cx - this.face * 3, this.bot - 1, 1, C.st4, { s: 1.2, sp: 0.3, life: 12 }); }
      this.idleT = 0;
    } else if (this.onGround) this.idleT++;
    // walls
    this.wallDir = 0;
    if (!this.onGround && dir && rectSolid(this.x + dir, this.y + 2, this.w, this.h - 6)) this.wallDir = dir;
    if (this.wallDir && this.vy > 0 && !this.act) {
      this.vy = min(this.vy, PH.slide);
      this.face = this.wallDir;
      this.wallCoyote = 6; this.lastWall = this.wallDir;
      if (this.t % 6 === 0) puff(this.cx + this.wallDir * 4, this.y + 4, 1, C.st4, { s: 1, sp: 0.2, life: 12 });
      this.jumps = 0; this.dashUsed = false;
    } else if (this.wallCoyote > 0) this.wallCoyote--;
    // gravity
    let gr = this.vy < 0 ? (Input.d('jump') ? PH.gHold : PH.gUp) : PH.gFall;
    if (abs(this.vy) < 1 && Input.d('jump')) gr *= 0.55;
    if (this.act && this.act.airHang && !this.onGround) gr *= this.act.airHang;
    this.vy = min(this.vy + gr, Input.d('down') ? PH.maxFall + 1 : PH.maxFall);
    if (this.vy < -1.8 && Input.r('jump')) this.vy = -1.8;
    // jumping
    const jp = Input.buf('jump', PH.jbuf);
    if (jp && !this.act) {
      if (Input.d('down') && this.onGround && platRow(this.x, this.w, round(this.bot / TS)) && !rectSolid(this.x, this.bot, this.w, 2)) {
        this.dropT = 14; this.vy = 1; this.onGround = false; Input.eat('jump');
      } else if (this.onGround || this.coyote > 0) this.doJump();
      else if (this.wallDir || this.wallCoyote > 0) this.wallJump(this.wallDir || this.lastWall);
      else if (Input.d('down') && Input.p('jump')) this.startStomp();
      else if (Input.p('jump') && this.jumps < this.maxJumps) this.doubleJump();
    } else if (jp && this.act && this.act.phase === 'r' && Input.p('jump')) {
      this.act = null;
      if (this.onGround || this.coyote > 0) this.doJump(); else if (this.jumps < this.maxJumps) this.doubleJump();
    }
    // dodge
    if (Input.p('dodge') && !healing) this.startDodge(dir);
    // slots
    for (let i = 0; i < 4; i++) if (Input.p(SLOT_KEYS[i])) { this.bufSlot = i; this.bufT = 12; }
    if (this.bufT > 0 && !healing) {
      this.bufT--;
      if (this.bufSlot === 0 && Input.d('down') && !this.onGround && this.slots[0] && this.slots[0].def.kind === 'melee' && !this.act) { this.startStomp(); this.bufT = 0; }
      else if (tryUse(this, this.bufSlot)) this.bufT = 0;
    }
    for (let i = 0; i < 2; i++) { const s = this.slots[i]; if (s && s.def.kind === 'shield') shieldHold(this, s, i, Input.d(SLOT_KEYS[i])); }
    // heal
    if (Input.p('heal')) this.startHeal();
    if (healing) {
      this.healT--;
      this.heal(this.healAmt / 36, false);
      if (this.healT % 9 === 0) { sfx('nom', this.cx); debris(this.cx + this.face * 5, this.y + 4, 2, [C.yl1, C.yl0], { sp: 1 }); }
      if (this.healT === 0 && Run.quirks.includes('burp')) { sfx('fart', this.cx); FText.add(this.cx, this.y - 8, 'BURRRP', C.gr3); ringFx(this.cx, this.cy, C.gr3, 60, 20); for (const e of lv.enemies) if (dist(e.cx, e.cy, this.cx, this.cy) < 80) e.stun(120); }
    }
    // interact
    if (Input.p('interact') || (Input.p('up') && this.onGround)) this.tryInteract(Input.p('interact'));
    if (Input.p('taunt') && this.onGround && !this.act) this.taunt();
  }
  doJump() {
    this.vy = -PH.jump; this.onGround = false; this.coyote = 0;
    Input.eat('jump');
    this.sq = { x: 0.72, y: 1.32 };
    puff(this.cx, this.bot, 4, C.st4, { s: 1.4, sp: 0.6, life: 14 });
    sfx('jump', this.cx);
  }
  doubleJump() {
    this.jumps++;
    this.vy = -PH.djump;
    Input.eat('jump');
    this.sq = { x: 0.8, y: 1.25 };
    this.flip = 16;
    ringFx(this.cx, this.bot, C.fu4, 10, 10);
    sfx('djump', this.cx);
  }
  wallJump(wd) {
    this.vx = -wd * PH.wjx; this.vy = -PH.wjy; this.face = -wd;
    this.lockX = 9; this.wallCoyote = 0;
    Input.eat('jump');
    this.sq = { x: 0.8, y: 1.2 };
    puff(this.cx + wd * 4, this.cy, 4, C.st4, { s: 1.4, sp: 0.6, life: 14 });
    sfx('walljump', this.cx);
  }
  startDodge(dir) {
    if (this.dodgeCd > this.t) return;
    if (dir) this.face = dir;
    if (this.act) { if (this.act.phase === 'a' && this.act.kind === 'melee') return; this.act = null; }
    this.lastDodge = this.t;
    this.healT = 0;
    if (this.onGround) {
      this.state = 'roll'; this.st = 0; this.vx = this.face * PH.roll;
      sfx('roll', this.cx);
      puff(this.cx, this.bot, 3, C.st4, { s: 1.2 });
    } else {
      if (this.dashUsed) return;
      this.dashUsed = true;
      this.state = 'dash'; this.st = 0; this.vx = this.face * PH.dash; this.vy = 0;
      sfx('dash', this.cx);
    }
    if (Run.quirks.includes('boompersonality')) spawnSkillFx('firecracker', this, true);
    this.passed = new Set();
  }
  upRoll(dir) {
    this.st++;
    const t = this.st / PH.rollT;
    this.vx = this.face * PH.roll * (t > 0.75 ? 1 - (t - 0.75) * 2.4 : 1) * (Run.quirks.includes('zoomies') ? 1.15 : 1);
    this.vy = min(this.vy + PH.gFall, PH.maxFall);
    if (this.st % 3 === 0) this.snapAfter();
    this.passThrough();
    if (Input.p('jump') && this.st > 6 && (this.onGround || this.coyote > 0)) { this.state = 'move'; this.doJump(); this.dodgeCd = this.t + 8; return; }
    if (this.st >= PH.rollT) { this.state = 'move'; this.dodgeCd = this.t + (Run.quirks.includes('zoomies') ? 2 : 6); }
  }
  upDash() {
    this.st++;
    this.vy = 0;
    this.vx = this.face * PH.dash * (this.st > PH.dashT - 4 ? 0.6 : 1);
    if (this.st % 2 === 0) this.snapAfter();
    if (this.st % 2 === 0) Parts.add({ k: 1, x: this.cx - this.face * 4, y: this.cy + rnd(-5, 5), vx: -this.face * 3, vy: 0, c: C.fu4, life: 8, len: 2, top: true });
    this.passThrough();
    if (this.hitWall || this.st >= PH.dashT) { this.state = 'move'; this.vx *= 0.5; this.dodgeCd = this.t + 4; }
  }
  passThrough() {
    for (const e of lv.enemies) {
      if (e.dead || this.passed.has(e) || !overlap(this, e)) continue;
      this.passed.add(e);
      if (Run.quirks.includes('static')) { e.hurt(dmgScale(14) * 1.4, this, { kb: 1, stun: 30 }); sparks(e.cx, e.cy, 6, C.yl1); sfx('zap', e.cx); }
    }
  }
  dodged(src) {
    if (this.dodgeFx > this.t) return;
    this.dodgeFx = this.t + 20;
    FText.add(this.cx, this.y - 8, pick(['DODGED', 'NOPE', 'MISSED', 'WHOOSH']), C.tl3, { life: 30, f: '3' });
    Run.dodges++;
    if (Run.quirks.includes('riposte')) this.buffs.riposte = 120;
  }
  snapAfter() {
    if (this.after.length > 6) return;
    const cv = makeCanvas(POCV.width, POCV.height), c = ctx2d(cv);
    c.drawImage(POCV, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = this.state === 'dash' ? C.tl3 : C.pk2;
    c.fillRect(0, 0, cv.width, cv.height);
    this.after.push({ cv, x: this.cx, y: this.bot, face: this.face, rot: this.state === 'roll' ? (this.st / PH.rollT) * TAU : 0, life: 12 });
  }
  startStomp() {
    if (this.act) this.act = null;
    this.state = 'stomp'; this.st = 0; this.vx = 0; this.vy = -1.5;
    sfx('whoosh', this.cx);
  }
  upStomp() {
    this.st++;
    if (this.st < 8) { this.vy = -0.5; this.vx = 0; return; }
    this.vy = 9.5;
    if (this.st % 2 === 0) Parts.add({ k: 1, x: this.cx + rnd(-4, 4), y: this.y, vx: 0, vy: -4, c: C.fu4, life: 6, len: 2, top: true });
    // head-bonk enemies on the way down
    for (const e of lv.enemies) {
      if (e.dead || e.dummyless || !overlap(this, e) || this.bot > e.y + 10) continue;
      const dmg = stompDamage() * 1.6;
      e.hurt(dmg, this, { kb: 0, stun: 80, crit: true, launchY: -2 });
      this.state = 'move'; this.vy = -6.2; this.jumps = 0; this.dashUsed = false; this.flip = 16;
      FText.add(e.cx, e.y - 6, 'BONK!', C.yl1, { sc: 2, life: 40 });
      sfx('bonk', e.cx); FX.stop(5); FX.shake(0.3);
      Run.bonks++;
      return;
    }
    if (this.onGround) this.stompLand();
  }
  stompLand() {
    this.state = 'move'; this.st = 0;
    this.sq = { x: 1.5, y: 0.6 };
    FX.shake(0.45); FX.stop(4);
    sfx('thud', this.cx);
    ringFx(this.cx, this.bot - 2, C.fu4, 46, 16, 2);
    puff(this.cx, this.bot, 10, C.st4, { s: 2, sp: 1.6, life: 18, spread: 10 });
    debris(this.cx, this.bot - 2, 8, [C.st3, C.st4], { sp: 2.5, vy: -1 });
    const dmg = stompDamage();
    for (const e of lv.enemies) {
      if (e.dead) continue;
      if (abs(e.cx - this.cx) < 46 && abs(e.bot - this.bot) < 22) e.hurt(dmg, this, { kb: 3, stun: 60, launchY: -3.5 });
    }
    for (const it of lv.items) if (it.prop && abs(it.cx - this.cx) < 40 && abs(it.bot - this.bot) < 20) it.hurt();
    hitTilesInBox(this.x - 4, this.bot + 2, this.w + 8, 6);
  }
  onLand(vy) {
    if (this.state === 'stomp') return this.stompLand();
    const f = clamp(vy / 6, 0.2, 1);
    this.sq = { x: 1 + 0.38 * f, y: 1 - 0.32 * f };
    if (vy > 2.5) { puff(this.cx, this.bot, 2 + floor(f * 4), C.st4, { s: 1.4, sp: 0.8, life: 14, spread: 5 }); sfx('land', this.cx); }
  }
  spiked() {
    if (this.inv > 0) { this.vy = -3; return; }
    this.hurt(dmgScale(14), null, { cause: 'spikes', unblockable: true, noKb: true });
    this.vy = -5.5; this.vx = -this.face * 1.5;
    Run.spikeHits++;
  }
  startHeal() {
    if (this.healT > 0 || this.act) return;
    if (this.flasks <= 0) { sfx('deny'); FText.add(this.cx, this.y - 8, 'NO CHEESE', C.st4, { f: '3' }); return; }
    if (this.hp >= this.maxHp) { Bubbles.say(this, 'i am perfectly healthy', 60); return; }
    this.flasks--;
    this.healT = 36;
    this.healAmt = this.maxHp * (Run.quirks.includes('burp') ? 1 : 0.55);
    this.rally = 0;
    sfx('heal');
    Run.heals++;
  }
  taunt() {
    this.state = 'taunt'; this.st = 0;
    sfx('squeak', this.cx);
    FText.add(this.cx, this.y - 10, pick(['SQUEAK!', 'SKREE!', 'EEP!', 'COME AT ME', 'MEEP']), C.pk2, { life: 40 });
    let near = 0;
    for (const e of lv.enemies) {
      if (e.dead || e.dummy) continue;
      const d = dist(e.cx, e.cy, this.cx, this.cy);
      if (d < 200) { e.aggro = true; if (chance(0.4)) Bubbles.say(e, pick(TAUNT_REPLIES), 90); }
      if (d < 70) near++;
    }
    if (near) { this.buffs.sass = 360; FText.add(this.cx, this.y - 20, 'SASSY! +30% DMG', C.rd3, { f: '3', life: 60 }); Run.taunts++; }
    if (Run.quirks.includes('vengeful') && (this.squeakCd || 0) < this.t) {
      this.squeakCd = this.t + 480;
      ringFx(this.cx, this.cy, C.pk2, 70, 18, 2);
      for (const e of lv.enemies) if (!e.boss && dist(e.cx, e.cy, this.cx, this.cy) < 80) e.stun(100);
    }
  }
  tryInteract(explicit) {
    let best = null, bd = 30;
    for (const it of lv.items) {
      if (!it.canInteract || it.dead) continue;
      if (!explicit && !(it instanceof Door)) continue;
      const d = abs(it.cx - this.cx);
      if (d < bd && this.bot > it.y - 6 && this.y < it.bot + 6) { bd = d; best = it; }
    }
    if (best) { best.interact(); Input.eat('interact'); }
    return best;
  }
  nearInteract() {
    let best = null, bd = 30;
    for (const it of lv.items) {
      if (!it.canInteract || it.dead) continue;
      const d = abs(it.cx - this.cx);
      if (d < bd && this.bot > it.y - 6 && this.y < it.bot + 6) { bd = d; best = it; }
    }
    return best;
  }
  offerItem(drop) {
    const kind = drop.it.def.kind;
    const slots = kind === 'skill' ? [2, 3] : [0, 1];
    const empty = slots.find((i) => !this.slots[i]);
    if (empty !== undefined) { this.equip(empty, drop.it); drop.dead = true; return; }
    UI.open(new SwapMenu(drop, slots));
  }
  equip(i, it) {
    this.slots[i] = it;
    it.cd = 0;
    sfx('pickup');
    UI.toast(it.name.toUpperCase(), it.def.desc, RARITY[it.rar].col);
    Run.itemsFound++;
    if (!Save.data.seen.includes(it.def.id)) { Save.data.seen.push(it.def.id); }
  }
  // ---------------- damage ----------------
  hurt(dmg, src, o = {}) {
    if (this.dead || this.state === 'enter' || this.state === 'cine' || Game.cine) return false;
    if (this.inv > 0 && !o.force) return false;
    if (!o.unblockable && ((this.state === 'roll' && this.st < 18) || this.state === 'dash')) { this.dodged(src); return false; }
    if (this.act && this.act.kind === 'block' && src && !o.unblockable) {
      const sx = src.cx !== undefined ? src.cx : src.x;
      if ((sx - this.cx) * this.face > -2 && shieldBlock(this, dmg, src, o)) return false;
    }
    if (this.buffs.bubble) {
      delete this.buffs.bubble;
      sfx('pop', this.cx); ringFx(this.cx, this.cy, C.tl4, 50, 16, 2);
      for (const e of lv.enemies) if (dist(e.cx, e.cy, this.cx, this.cy) < 60) e.hurt(dmgScale(20) * 1.5, this, { kb: 4 });
      this.inv = 40;
      return false;
    }
    dmg *= SPICE[Run.spice].dmgTaken;
    if (Run.quirks.includes('thickfur')) dmg *= 0.8;
    if (Run.quirks.includes('glass')) dmg *= 1.15;
    dmg = max(1, round(dmg));
    if (Run.curse > 0) { dmg = this.hp + 999; o.cause = (o.cause || '') + ' (while cursed)'; }
    this.hp -= dmg;
    this.rally = min(this.rally + dmg * 0.75, this.maxHp - max(0, this.hp));
    this.rallyT = 150;
    this.inv = 50; this.flash = 6;
    this.healT = 0;
    if (this.act && this.act.kind !== 'block') this.act = null;
    Run.hitsTaken++; Run.dmgTaken += dmg;
    if (src && src.type) Run.lastHitBy = src;
    Run.lastCause = o.cause || (src && src.d ? src.d.name : 'something');
    if (!o.noKb) {
      const sx = src && src.cx !== undefined ? src.cx : this.cx - this.face;
      const kd = this.cx >= sx ? 1 : -1;
      this.vx = kd * (o.kb || 2.6); this.vy = -2.8;
      this.state = 'hurt'; this.st = 0;
      this.face = -kd;
    }
    FX.shake(0.35 + min(0.3, dmg / this.maxHp)); FX.stop(5);
    FX.flash(0.22, C.rd2);
    sfx('hurt', this.cx);
    FText.add(this.cx, this.y - 6, '-' + dmg, C.rd3, { sc: 1, dmg: true });
    sparks(this.cx, this.cy, 6, C.rd3);
    puff(this.cx, this.cy, 4, C.fu3, { sp: 1.2 });
    if (dmg > this.maxHp * 0.18 && this.hat !== 'none' && !this.hatOff) {
      this.hatOff = 150;
      const s = makeHatIcon(this.hat);
      Parts.add({ k: 4, img: s, sx: 0, sy: 0, sw: s.width, sh: s.height, x: this.cx, y: this.y - 6, vx: -this.face * 1.5, vy: -4, gr: 0.2, dr: 0.99, vr: 0.3, life: 90, col2: true });
    }
    if (o.burn) this.buffs.burnFx = 30;
    if (Run.quirks.includes('spite')) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; lv.projs.push(new Proj(this.cx, this.cy, cos(a) * 4, sin(a) * 4, { team: 'p', dmg: dmgScale(10) * 1.2, kind: 'tack', life: 30 })); }
    if (this.hp <= 0) this.die();
    else if (this.hp < this.maxHp * 0.25 && chance(0.4)) Bubbles.say(this, pick(LOW_HP_LINES), 80);
    return true;
  }
  die() {
    if (Save.data.upg.revive && !Run.reviveUsed) {
      Run.reviveUsed = true;
      this.hp = round(this.maxHp * 0.5); this.inv = 120;
      FX.flash(0.8, C.yl2); sfx('fanfare');
      FText.add(this.cx, this.y - 16, 'SECOND WIND!', C.yl1, { sc: 2, life: 90 });
      ringFx(this.cx, this.cy, C.yl1, 80, 30, 2);
      for (const e of lv.enemies) if (dist(e.cx, e.cy, this.cx, this.cy) < 100) e.hurt(1, this, { kb: 6 });
      return;
    }
    this.hp = 0; this.dead = true; this.state = 'dead'; this.st = 0; this.act = null;
    this.vy = -4; this.vx = -this.face * 1.5;
    FX.slowmo(0.35, 70); FX.shake(0.6); FX.flash(0.5, '#fff');
    sfx('death');
    Music.stop();
    puff(this.cx, this.cy, 14, C.fu3, { sp: 2, life: 30 });
    confetti(this.cx, this.cy, 10);
  }
  // ---------------- drawing ----------------
  pose() {
    const P = { t: this.t, bob: 0, lean: 0, bf: [0, 0], ff: [0, 0], earBack: 0, earUp: 0, eye: 'o', mouth: 0, hand: [3, -6], crouch: 0, hatOff: this.hatOff > 0 };
    if (this.blinkT < 0) P.eye = 'blink';
    if (this.hp < this.maxHp * 0.25) P.eye = this.t % 90 < 45 ? 'wide' : P.eye;
    if (this.buffs.sass) P.eye = 'angry';
    const st = this.state;
    if (st === 'move' || st === 'stomp') {
      if (this.onGround) {
        if (abs(this.vx) > 0.3) {
          const ph = this.runPh;
          P.bf = [round(sin(ph) * 2), -max(0, round(cos(ph) * 1.5))];
          P.ff = [round(-sin(ph) * 2), -max(0, round(-cos(ph) * 1.5))];
          P.bob = -round(abs(sin(ph)));
          P.lean = 1; P.earBack = 1;
          P.hand = [round(-sin(ph) * 2), -6];
        } else {
          P.crouch = this.idleT % 80 < 40 ? 0 : 1;
          if (this.lookUp) { P.earUp = 1; P.lean = 0; }
          if (this.lookDown) P.crouch = 2;
          if (this.idleT > 600) { P.eye = 'blink'; if (this.t % 60 === 0) FText.add(this.cx + 6, this.y - 6, 'z', C.st4, { f: '3', vy: -0.5, life: 50 }); }
        }
      } else if (this.wallDir && this.vy > 0) {
        P.lean = -1; P.hand = [5, -11]; P.ff = [2, -3]; P.bf = [1, -1];
      } else if (this.vy < 0) {
        P.bf = [-1, -1]; P.ff = [1, -2]; P.earBack = 2;
      } else {
        P.bf = [-1, 1]; P.ff = [1, 1]; P.earUp = 2; P.hand = [3, -9];
      }
      if (st === 'stomp') { P.earUp = 2; P.crouch = 2; P.eye = 'angry'; }
    } else if (st === 'roll') P.curl = true;
    else if (st === 'dash') { P.lean = 2; P.earBack = 2; P.bf = [-3, -1]; P.ff = [-2, -2]; }
    else if (st === 'hurt') { P.eye = 'x'; P.mouth = 1; P.earUp = 2; P.crouch = 1; }
    else if (st === 'taunt') { P.mouth = 1; P.eye = 'happy'; P.earUp = 2; P.bob = this.st < 10 ? -2 : 0; P.hand = [3, -12]; }
    else if (st === 'dead') { P.eye = 'x'; P.mouth = 1; }
    if (this.healT > 0) { P.hand = [6, -9]; P.mouth = this.healT % 10 < 5 ? 1 : 0; P.eye = 'happy'; }
    if (this.act) actPose(this, P);
    return P;
  }
  draw() {
    for (const a of this.after) {
      g.save(); g.globalAlpha = (a.life / 12) * 0.45;
      g.translate(round(a.x), round(a.y - (a.rot ? 7 : 0)));
      if (a.rot) g.rotate(a.rot * a.face);
      g.scale(a.face, 1);
      g.drawImage(a.cv, -(POX + 1), -(POY + 1) + (a.rot ? 7 : 0));
      g.restore();
    }
    if (this.dead && this.st > 30) {
      const gy = this.bot - (this.st - 30) * 0.6;
      g.globalAlpha = max(0, 1 - (this.st - 30) / 70);
      DISC(g, this.cx, gy - 10, 5, '#e8f4ff'); R(g, this.cx - 5, gy - 10, 11, 7, '#e8f4ff');
      for (let i = 0; i < 3; i++) PX(g, this.cx - 4 + i * 4, gy - 3 + (i % 2), '#e8f4ff');
      R(g, this.cx - 2, gy - 12, 1, 2, C.ink); R(g, this.cx + 2, gy - 12, 1, 2, C.ink);
      RING(g, this.cx, gy - 18, 3, C.yl1);
      g.globalAlpha = 1;
    }
    if (this.inv > 0 && !this.dead && this.t % 6 < 2 && this.flash <= 0) return this.drawExtras();
    const P = this.pose();
    renderMouse(this, P);
    let rot = 0;
    if (this.state === 'roll') rot = (this.st / PH.rollT) * TAU;
    else if (this.flip > 0) rot = (1 - this.flip / 16) * TAU;
    else if (this.state === 'dead') rot = -min(1, this.st / 12) * PI / 2;
    const tint = this.buffs.burnFx ? (this.t % 4 < 2 ? C.or2 : null) : null;
    drawMouseAt(this, this.cx, this.bot + 1, this.sq.x, this.sq.y, rot, this.flash > 0, undefined, tint);
    this.drawExtras();
  }
  drawExtras() {
    if (this.act) drawAct(this);
    if (this.state === 'move' && this.slots[0] && !this.act && this.healT <= 0 && !this.dead) drawIdleWeapon(this);
    if (this.healT > 0) spr(SPR.cheese, this.cx + this.face * 7, this.y + 9);
  }
}
const TAUNT_REPLIES = ['how dare you', 'oh it is ON', 'did that mouse just squeak at me', 'rude', 'you will regret that', 'my therapist will hear about this', '>:(', 'squeak yourself'];
const LOW_HP_LINES = ['this is fine', 'ow ow ow', 'i need cheese', 'mama?', 'not like this', 'i regret everything'];

// ---------------------------------------------------------------------------
// Lu Yan: locomotion (coyote time, jump buffering, variable jump, the
// Swallow's double jump, i-frame dash), combo strings, air combos, plunge,
// guard and perfect parry, the qi wave and the ultimate.
// ---------------------------------------------------------------------------
const PL = { run: 2.35, accG: 0.45, decG: 0.55, accA: 0.3, decA: 0.07, jump: 6.6, djump: 6, coyote: 7, buffer: 9, dash: 6, dashT: 12, dashCD: 20 };

class Player extends Fighter {
  constructor(x, y) {
    super('hero', x, y);
    this.team = 1; this.hittable = true; this.hp = this.maxHp = 100; this.qi = 30; this.qiMax = 100;
    this.coyote = 0; this.airJumps = 1; this.airDash = 1; this.dashCD = 0; this.dashT = 0; this.airAtks = 0;
    this.jumpBuf = 0; this.atkBuf = 0; this.dashBuf = 0; this.qiBuf = 0; this.ultBuf = 0; this.guardBuf = 0;
    this.parryT = 0; this.blockT = 0; this.counter = 0; this.landT = 0; this.jumpCut = false; this.lastDash = 99;
    this.combo = 0; this.comboT = 0; this.safe = { x, y }; this.safeT = 0; this.control = true; this.kbMul = 0.8;
    this.slashCols = SLASH_COLS.hero;
  }
  get ctl() { return this.control && !G.script && !G.ult; }
  dirInput() { return this.ctl ? (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0) : 0; }

  update() {
    if (this.ctl) {
      if (Input.hit('jump')) this.jumpBuf = PL.buffer;
      if (Input.hit('attack')) this.atkBuf = PL.buffer;
      if (Input.hit('dash')) this.dashBuf = 7;
      if (Input.hit('qi')) this.qiBuf = 7;
      if (Input.hit('ult')) this.ultBuf = 7;
      if (Input.hit('guard')) this.guardBuf = 7;
    }
    for (const k of ['jumpBuf', 'atkBuf', 'dashBuf', 'qiBuf', 'ultBuf', 'guardBuf', 'dashCD', 'counter']) if (this[k] > 0) this[k]--;
    if (this.comboT > 0 && --this.comboT === 0) this.combo = 0;
    this.lastDash++;
    if (this.grounded) { this.coyote = PL.coyote; this.airJumps = 1; this.airDash = 1; this.airAtks = 0; } else if (this.coyote > 0) this.coyote--;
    if (this.st === 'dash') this.tickDash();
    else if (this.st === 'guard') this.tickGuard();
    else if (this.st === 'move') this.moveInput();
    const wasG = this.grounded, vy0 = this.vy;
    super.update();
    if (!wasG && this.grounded && !this.dead) this.onLandGround(vy0);
    this.checkHazards();
  }

  think() {
    if (this.autoX !== null && this.autoX !== undefined) {
      const d = this.autoX - this.x;
      if (Math.abs(d) < 1.6) { this.autoX = null; this.vx = 0; this.setAnim('idle'); }
      else { this.facing = Math.sign(d); this.vx = this.facing * 1.4; this.setAnim('walk'); }
      return;
    }
    const I = Input, dir = this.dirInput();
    if (this.ctl && this.tryActions()) return;
    const target = dir * PL.run;
    if (this.grounded) this.vx = approach(this.vx, target, dir ? PL.accG : PL.decG);
    else this.vx = approach(this.vx, target, dir ? PL.accA : PL.decA);
    if (dir) this.facing = dir;
    if (this.jumpBuf > 0) {
      if (this.ctl && I.held('down') && this.grounded && this.onPlatform()) { this.drop = 14; this.grounded = false; this.jumpBuf = 0; this.y += 1; }
      else if (this.grounded || this.coyote > 0) this.doJump(false);
      else if (this.airJumps > 0) this.doJump(true);
    }
    if (this.vy < -2 && !I.held('jump') && !this.jumpCut && this.anim !== 'djump' && this.ctl) { this.vy *= 0.5; this.jumpCut = true; }
    if (this.grounded) {
      if (this.landT > 0) { this.landT--; this.setAnim('land'); }
      else if (Math.abs(this.vx) > 0.35) {
        this.setAnim('run');
        const f = Math.floor(this.at) % 32;
        if (f === 0 || f === 16) { SFX.play('step'); if (Math.random() < 0.5) FX.dust(this.x - this.facing * 4, this.y, 2, -this.facing); }
      } else this.setAnim('idle');
    } else if (!(this.anim === 'djump' && !this.animDone())) this.setAnim(this.vy < 0 ? 'jump' : 'fall');
  }
  onPlatform() {
    const tx = Math.floor(this.x / TS), ty = Math.floor(this.y / TS);
    return G.map.get(tx, ty) === T_ONEWAY;
  }
  tryActions() {
    if (this.ultBuf > 0 && this.qi >= this.qiMax) { this.ultBuf = 0; startUltimate(this); return true; }
    if (this.qiBuf > 0) {
      this.qiBuf = 0;
      if (this.qi >= 25) { this.qi -= 25; this.startMove('qi'); return true; }
      FX.text(this.x, this.y - 58, 'NOT ENOUGH QI', '#c8b898', { life: 30 }); SFX.play('deny');
    }
    if (this.dashBuf > 0 && this.dashCD <= 0 && (this.grounded || this.airDash > 0)) { this.dashBuf = 0; this.startDash(); return true; }
    if (this.grounded && (this.guardBuf > 0 || Input.held('guard'))) { this.startGuard(this.guardBuf > 0); this.guardBuf = 0; return true; }
    if (this.atkBuf > 0) { this.atkBuf = 0; return this.startAttack(); }
    return false;
  }
  startAttack() {
    const dir = this.dirInput();
    if (dir) this.facing = dir;
    if (this.grounded) {
      if (this.counter > 0) { this.startMove('counter'); return true; }
      if (this.lastDash < 10) { this.startMove('dashatk'); return true; }
      if (Input.held('up')) { this.jumpUp = true; this.startMove('upatk'); return true; }
      this.jumpUp = false;
      this.startMove('atk1'); return true;
    }
    if (Input.held('down')) { this.startMove('plunge'); return true; }
    if (this.airAtks >= 3) return false;
    this.airAtks++;
    this.startMove('air1');
    return true;
  }
  moveInput() {
    const M = this.move;
    if (!M) return;
    if (M.chain && this.atkBuf > 0 && this.mt >= M.chain.from && this.mt <= M.chain.to) {
      if (M.air && this.grounded) return;
      this.atkBuf = 0;
      const dir = this.dirInput(); if (dir) this.facing = dir;
      this.startMove(M.chain.next);
      return;
    }
    if (M.cancel !== undefined && this.mt >= M.cancel) {
      if (this.dashBuf > 0 && this.dashCD <= 0 && (this.grounded || this.airDash > 0)) { this.cancelMove(); this.dashBuf = 0; this.startDash(); return; }
      if (this.jumpBuf > 0 && (this.grounded || this.airJumps > 0)) { this.cancelMove(); this.st = 'free'; this.doJump(!this.grounded); return; }
      if (this.qiBuf > 0 && this.qi >= 25) { this.cancelMove(); this.qiBuf = 0; this.qi -= 25; this.startMove('qi'); return; }
      if (this.atkBuf > 0 && !M.chain) { this.cancelMove(); this.st = 'free'; this.atkBuf = 0; this.startAttack(); return; }
    }
    if (M.air && this.grounded && this.mt > 2 && !M.land) { this.endMove(); this.landT = 5; }
  }
  doJump(air) {
    this.grounded = false; this.coyote = 0; this.jumpBuf = 0; this.jumpCut = false; this.st = 'free';
    if (air) {
      this.airJumps--; this.vy = -PL.djump; this.setAnim('djump', true); SFX.play('djump');
      for (let i = 0; i < 4; i++) FX.part({ kind: 'feather', x: this.x + rnd(-6, 6), y: this.y - 20 + rnd(-6, 6), vx: rnd(-1.6, 1.6), vy: rnd(-1.4, -0.4), g: -0.01, drag: 0.98, life: rndi(30, 50), cols: ['#2a2426', '#3a3234'], layer: 1 });
      FX.ring(this.x, this.y - 4, { r0: 2, r1: 16, c: '#f8f0dc', flat: 0.4, life: 12, layer: 0 });
    } else {
      this.vy = -PL.jump; this.setAnim('jump', true); SFX.play('jump'); FX.dust(this.x, this.y, 4);
    }
  }
  onLandGround(vy0) {
    if (vy0 > 3) { FX.dust(this.x, this.y, vy0 > 6 ? 8 : 4); SFX.play('land'); if (this.st === 'free') this.landT = vy0 > 6 ? 7 : 4; }
  }
  startDash() {
    const dir = this.dirInput() || this.facing;
    this.facing = dir; this.st = 'dash'; this.dashT = PL.dashT; this.vx = dir * PL.dash; this.vy = 0; this.inv = Math.max(this.inv, 11);
    if (!this.grounded) this.airDash--;
    this.dashCD = PL.dashCD; this.gravMul = 0;
    this.setAnim('dash', true); SFX.play('dash');
    FX.dust(this.x - dir * 6, this.y, 5, -dir);
  }
  tickDash() {
    this.dashT--; this.vy = 0; this.gravMul = 0;
    if (this.dashT % 2 === 0) FX.ghost(this, '#e8c86a', 12);
    if (this.atkBuf > 0 && this.dashT < 9) {
      this.atkBuf = 0; this.gravMul = 1;
      if (this.grounded) { this.startMove('dashatk'); return; }
      this.st = 'free'; this.airAtks++; this.startMove('air1'); return;
    }
    if (this.jumpBuf > 0 && (this.grounded || this.coyote > 0)) { this.gravMul = 1; this.doJump(false); this.vx *= 0.85; return; }
    if (this.dashT <= 0) { this.st = 'free'; this.gravMul = 1; this.lastDash = 0; this.vx *= 0.55; }
  }
  startGuard(fresh) {
    this.st = 'guard'; this.parryT = fresh ? 10 : 0; this.blockT = 0; this.vx *= 0.3;
    this.setAnim('guard', true);
    if (fresh) SFX.play('guard');
  }
  tickGuard() {
    if (this.parryT > 0) this.parryT--;
    const dir = this.dirInput(); if (dir) this.facing = dir;
    if (this.blockT > 0) this.blockT--;
    else if (this.anim !== 'guard') this.setAnim('guard');
    this.vx *= 0.8;
    if (this.atkBuf > 0 && this.counter > 0) { this.atkBuf = 0; this.st = 'free'; this.startMove('counter'); return; }
    if (this.guardBuf > 0 && this.blockT <= 0) { this.guardBuf = 0; this.parryT = 10; SFX.play('guard'); }
    if (!Input.held('guard') && this.blockT <= 0) this.st = 'free';
    if (!this.grounded) this.st = 'free';
  }
  onLand(t, h, dmg) {
    if (t.team === 3) return;
    this.combo++; this.comboT = 100;
    G.stats.maxCombo = Math.max(G.stats.maxCombo, this.combo);
    this.qi = Math.min(this.qiMax, this.qi + (h.knock ? 5 : 3));
    if (this.move && this.move.air) { this.vy = Math.min(this.vy, -1.2); this.airAtks = Math.min(this.airAtks, 2); }
  }
  onHit(att, h, dir, dmg) {
    this.inv = 50; this.combo = 0; this.comboT = 0;
    G.stats.hurt += dmg;
    SFX.play('hurt');
    FX.flash('#8a1010', 3);
    const heavy = h.knock || dmg >= 16;
    super.onHit(att, { ...h, stun: Math.min(h.stun, 16), launch: false, knock: heavy && this.hp > 0 }, dir, dmg);
    if (this.st === 'down') this.downTime = 26;
  }
  die(att, h, dir) {
    super.die(att, h, dir);
    G.stats.deaths++;
    SFX.play('death');
    G.slow = 60;
  }
  afterDeath() { if (this.stT === 110) G.onPlayerDeath(); }
  checkHazards() {
    if (this.dead) return;
    const hz = G.map.hazard(this.x - 4, this.y - 12, this.x + 4, this.y - 1);
    if (hz === 'spike' && this.inv <= 0) {
      this.hp -= 12; this.inv = 60; FX.flash('#8a1010', 4); SFX.play('hurt');
      FX.text(this.x, this.y - 50, 12, '#ff6a4a');
      if (this.hp <= 0) { this.die(null, null, -this.facing); return; }
      this.cancelMove(); this.st = 'air'; this.stT = 16; this.vy = -6; this.vx = -this.facing * 2; this.grounded = false;
      this.setAnim('airhurt', true);
    }
    if (hz === 'water' || this.y > G.map.ph + 30) this.fell(hz === 'water');
    if (this.grounded && !hz && this.st === 'free' && ++this.safeT > 20) {
      this.safeT = 0;
      const ok = G.map.solidPx(this.x - 6, this.y + 2) && G.map.solidPx(this.x + 6, this.y + 2);
      if (ok) this.safe = { x: this.x, y: this.y };
    }
  }
  fell(water) {
    if (water) { FX.burst(this.x, this.y - 4, 14, { kind: 'px', dir: -Math.PI / 2, spread: 1, s0: 1, s1: 3.5, g: 0.2, cols: ['#e8f0e0', '#b8d0c0', '#7aa090'], l0: 16, l1: 30 }); SFX.play('splash'); }
    this.hp -= 15; SFX.play('hurt');
    if (this.hp <= 0) { this.hp = 1; }
    this.x = this.safe.x; this.y = this.safe.y - 2; this.vx = this.vy = 0; this.inv = 80; this.cancelMove(); this.st = 'free';
    for (const r of this.ribbons) r.ok = false;
    G.cam.update(this, G.map, true);
    FX.flash('#000000', 14);
  }
}

// ---------------------------------------------------------------------------
// Ultimate: Thousand Swallows Return. Lu Yan vanishes, cuts through every
// enemy on screen, then sheathes; the cuts land together.
// ---------------------------------------------------------------------------
function startUltimate(p) {
  const cam = G.cam;
  const targets = G.ents.filter(e => e.team === 2 && !e.dead && e.hittable && e.x > cam.x - 20 && e.x < cam.x + VW + 20);
  p.qi = 0; p.inv = 999;
  p.cancelMove(); p.st = 'cut'; p.vx = p.vy = 0; p.setAnim('ult', true);
  G.ult = { t: 0, p, targets, path: [], ox: p.x, oy: p.y };
  SFX.play('ultStart');
  FX.flash('#fff4d8', 10);
}
function updateUltimate() {
  const U = G.ult, p = U.p;
  U.t++;
  if (U.t === 30) { p.visible = false; SFX.play('dash'); }
  if (U.t >= 30 && U.t < 30 + U.targets.length * 8 + 8) {
    const k = Math.floor((U.t - 30) / 8);
    if ((U.t - 30) % 8 === 0) {
      const t = U.targets[k % Math.max(1, U.targets.length)];
      const x = t ? t.x + (k % 2 ? 28 : -28) : U.ox + (k % 2 ? 90 : -90), y = (t ? t.y - 26 : U.oy - 30) + (k % 2 ? -16 : 10);
      U.path.push([x, y, U.t]);
      SFX.play('swing');
      const fr = frameFor(p.C, 'dash', 6), prev = U.path[U.path.length - 2];
      const g = new Ghost(fr, x, y + 30, prev ? (x > prev[0] ? 1 : -1) : 1, '#ffe08a', 26); g.layer = 1; FX.add(g);
      FX.sparks(x, y, rnd(TAU), 6, ['#ffffff', '#fff0a0', '#ffc040']);
    }
  }
  const end = 30 + U.targets.length * 8 + 24;
  if (U.t === end) {
    p.visible = true; p.x = U.ox; p.y = U.oy; p.setAnim('idle', true);
    SFX.play('sheathe');
  }
  if (U.t === end + 20) {
    FX.flash('#ffffff', 12); FX.kick(6); SFX.play('ultHit');
    for (const t of U.targets) {
      if (t.dead) continue;
      const dmg = t.boss ? 90 : 120;
      t.hp -= dmg;
      FX.text(t.x, t.y - t.h - 10, dmg, '#ffe070', { scale: 2, life: 60 });
      for (let i = 0; i < 3; i++) FX.slash(t, { a0: rnd(0, 360), a1: rnd(0, 360) + 200, r: 22 + i * 4, cy: -26, th: 6, cols: SLASH_COLS.heroQi, life: 16 });
      t.onHit(p, { dmg, kb: [4, -4], stun: 40, stop: 12, knock: true }, t.x > p.x ? 1 : -1, dmg);
    }
    G.hitstop = 14;
  }
  if (U.t > end + 40) { p.st = 'free'; p.inv = 30; G.ult = null; }
}
function drawUltimate(ctx, cam) {
  const U = G.ult;
  const k = Math.min(1, U.t / 20);
  ctx.save();
  ctx.globalAlpha = 0.55 * k;
  ctx.fillStyle = '#0a0606';
  ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
  for (let i = 1; i < U.path.length; i++) {
    const a = U.path[i - 1], b = U.path[i];
    const age = U.t - b[2];
    if (age > 40) continue;
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    const w = age < 4 ? 3 : age < 12 ? 2 : 1;
    for (let s = 0; s < n; s++) {
      const t = s / n, x = Math.round(lerp(a[0], b[0], t) - cam.x), y = Math.round(lerp(a[1], b[1], t) - cam.y);
      if (w > 1) { ctx.fillStyle = '#ffc040'; ctx.fillRect(x, y - (w >> 1) - 1, 1, w + 2); }
      ctx.fillStyle = age < 8 ? '#ffffff' : '#ffe08a';
      ctx.fillRect(x, y - (w >> 1), 1, w);
    }
  }
  FX.draw(ctx, cam, 1);
  if (U.t < 60) Font.draw(ctx, 'THOUSAND SWALLOWS RETURN', VW / 2, 40, '#fff4d8', { align: 'center', scale: 2, outline: '#1a0e08', alpha: Math.min(1, U.t / 10) });
}

// ---------------------------------------------------------------------------
// Fighter: shared humanoid logic for the hero, enemies, bosses and NPCs.
// States: free | move | hurt | air (juggled) | down | getup | stagger |
//         guard | dash | dead | cut (scripted)
// ---------------------------------------------------------------------------
class Fighter extends Body {
  constructor(cid, x, y) {
    super(x, y);
    this.setCostume(cid);
    this.anim = 'idle'; this.at = 0; this.facing = 1; this.animSpeed = 1;
    this.hp = this.maxHp = 100; this.st = 'free'; this.stT = 0;
    this.move = null; this.mname = ''; this.mt = 0; this.hitSet = new Set();
    this.inv = 0; this.flash = 0; this.armor = false; this.poise = 0; this.poiseMax = 0;
    this.w = 12; this.h = 40; this.team = 1; this.juggle = 0; this.hitShake = 0;
    this.frame = null; this.alpha = 1; this.visible = true; this.kbMul = 1; this.dmgTaken = 1;
    this.moves = MOVES;
  }
  setCostume(cid) {
    const keep = this.ribbons;
    this.C = COSTUME[cid]; this.cid = cid;
    this.ribbons = (this.C.ribbons || []).map(d => new Ribbon(d, this.C));
    if (keep) this.ribbons.forEach((r, i) => { if (keep[i]) { r.pts = keep[i].pts; r.ok = keep[i].ok; } });
  }
  setAnim(a, restart = false) { if (this.anim !== a || restart) { this.anim = a; this.at = 0; } }
  animDone() { return this.at >= animLen(this.C, this.anim) - 1; }
  face(x) { if (Math.abs(x - this.x) > 1) this.facing = x > this.x ? 1 : -1; }

  startMove(name) {
    const M = this.moves[name];
    if (!M) return;
    this.move = M; this.mname = name; this.mt = -1; this.hitSet.clear();
    this.st = 'move'; this.stT = 0;
    this.setAnim(M.anim, true);
    this.gravMul = M.grav !== undefined ? M.grav : 1;
    this.armor = false;
  }
  cancelMove() {
    if (this.move && this.onMoveEnd) this.onMoveEnd(this.move, true);
    this.move = null; this.mname = ''; this.gravMul = 1; this.armor = false;
  }
  endMove() {
    const M = this.move;
    this.move = null; this.mname = ''; this.gravMul = 1; this.armor = false;
    if (this.onMoveEnd) this.onMoveEnd(M, false);
    if (this.st === 'move') this.st = 'free';
  }
  tickMove() {
    const M = this.move;
    const f = ++this.mt;
    if (M.step) for (const [k, v] of M.step) if (k === f) this.vx = v * this.facing;
    if (M.vy) for (const [k, v] of M.vy) if (k === f) { this.vy = v; this.grounded = false; }
    this.armor = !!(M.armor && f >= M.armor[0] && f <= M.armor[1]);
    if (M.inv && f >= M.inv[0] && f <= M.inv[1]) this.inv = Math.max(this.inv, 1);
    if (M.fx) for (const e of M.fx) if (e.f === f) this.moveFx(e);
    if (M.ev && M.ev[f]) M.ev[f](this);
    if (this.move !== M) return;
    if (M.hit) for (const h of M.hit) if (f >= h.f0 && f <= h.f1) {
      if (h.multi && (f - h.f0) % h.multi === 0) this.hitSet.clear();
      Combat.sweep(this, h);
    }
    if (!M.step || !M.step.some(s => s[0] === f)) this.vx *= this.grounded ? 0.8 : 0.97;
    if (f >= M.len - 1) this.endMove();
  }
  moveFx(e) {
    if (e.slash) FX.slash(this, { ...e.slash, cols: e.slash.cols || this.slashCols || SLASH_COLS.hero });
    if (e.streak) FX.streak(this.x + this.facing * 6, this.y + e.streak.cy, this.facing, e.streak.len, { cols: e.streak.cols || this.slashCols || SLASH_COLS.hero });
    if (e.glint) { const t = this.frame && this.frame.A[(this.C.weapon ? 'f' : 'b') + 'Tip']; const gx = t ? this.x + t[0] * this.facing : this.x + this.facing * 10, gy = t ? this.y + t[1] : this.y - 40; FX.part({ kind: 'glint', x: gx, y: gy, life: 14, cols: ['#ffffff', '#fff0b0'], layer: 1 }); }
    if (e.ring) { FX.ring(this.x + this.facing * 8, this.y - 2, { r0: 4, r1: 34, c: '#fff4d0', flat: 0.35, life: 16 }); FX.kick(3); }
    if (e.dust) { FX.dust(this.x - 8, this.y, 6, -1); FX.dust(this.x + 8, this.y, 6, 1); }
    if (e.charge) for (let i = 0; i < 14; i++) { const a = rnd(TAU), r = rnd(16, 30), cx = this.x, cy = this.y - 30; FX.part({ kind: 'px', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r / 11, vy: -Math.sin(a) * r / 11, life: 11, cols: ['#fff6c8', '#ffd060'], layer: 1 }); }
    if (e.sfx) SFX.play(e.sfx);
  }

  onHit(att, h, dir, dmg) {
    this.flash = 7; this.flashAt = G.time; this.hitShake = h.stop || 4;
    if (this.hp <= 0) { this.die(att, h, dir); return; }
    const pd = h.poise !== undefined ? h.poise : dmg;
    if (this.armor && !h.guardBreak) { this.poise -= pd * 0.5; return; }
    if (this.poiseMax > 0) {
      this.poise -= pd;
      if (this.poise > 0 && !h.guardBreak) return;
      this.poise = this.poiseMax;
    }
    this.cancelMove();
    const kx = h.kb[0] * dir * this.kbMul, ky = h.kb[1] * this.kbMul;
    this.vx = kx;
    if (h.knock || this.juggle > 7) {
      this.st = 'down'; this.stT = 0; this.downFly = true; this.vy = Math.min(ky, -2.6); this.grounded = false; this.juggle = 0;
      this.setAnim('airhurt', true);
      return;
    }
    if (!this.grounded || h.launch || ky < -3.2) {
      this.st = 'air'; this.stT = h.stun; this.juggle++;
      this.vy = h.launch ? Math.min(ky, -5.8) : Math.min(this.vy * 0.3, ky, -2.2);
      this.grounded = false; this.gravMul = 0.72;
      this.setAnim('airhurt', true);
    } else {
      this.st = 'hurt'; this.stT = h.stun;
      this.setAnim(Math.random() < 0.5 ? 'hurt' : 'hurt2', true);
    }
  }
  die(att, h, dir) {
    this.dead = true; this.st = 'dead'; this.stT = 0; this.cancelMove();
    this.vx = (h ? Math.max(2, h.kb[0]) : 2) * dir; this.vy = -3.6; this.grounded = false; this.gravMul = 1;
    this.setAnim('dead', true);
    if (this.onDeath) this.onDeath(att);
  }
  stagger(t = 60) {
    this.cancelMove(); this.st = 'stagger'; this.stT = t; this.vx = -this.facing * 2.2; this.setAnim('stagger', true);
  }

  // per-tick state machine; subclasses provide think() for the 'free' state
  update() {
    if (this.inv > 0) this.inv--;
    if (this.flash > 0) this.flash--;
    if (this.hitShake > 0 && G.hitstop <= 0) this.hitShake = 0;
    switch (this.st) {
      case 'free': this.gravMul = 1; if (this.think) this.think(); break;
      case 'move': this.tickMove(); if (this.move && this.move.land && this.grounded && this.mt > 1) this.startMove(this.move.land); break;
      case 'hurt': if (--this.stT <= 0) { this.st = 'free'; this.juggle = 0; } this.vx *= 0.86; break;
      case 'air':
        this.stT--; this.vx *= 0.97;
        if (this.grounded && this.stT < this.juggleLandT()) { this.st = 'free'; this.juggle = 0; this.gravMul = 1; this.setAnim('land', true); FX.dust(this.x, this.y, 4); }
        break;
      case 'down':
        this.stT++;
        if (this.downFly) {
          if (this.grounded && this.stT > 3) {
            this.downFly = false; this.stT = 0; this.setAnim('down', true);
            FX.dust(this.x, this.y, 8); SFX.play('thud'); FX.kick(1.5);
            if (Math.abs(this.vx) > 1.5) this.vy = -2;
          }
        } else {
          this.vx *= 0.85;
          if (this.stT > (this.downTime || 46)) { this.st = 'getup'; this.stT = 0; this.setAnim('getup', true); this.inv = 30; }
        }
        break;
      case 'getup': this.vx = 0; if (++this.stT >= animLen(this.C, 'getup')) { this.st = 'free'; this.juggle = 0; } break;
      case 'stagger': this.vx *= 0.88; if (--this.stT <= 0) this.st = 'free'; break;
      case 'dead': this.stT++; this.vx *= this.grounded ? 0.85 : 0.99; if (this.afterDeath) this.afterDeath(); break;
      case 'cut': if (this.script) this.script(); break;
    }
    this.physics();
    if (this.st === 'dead' && this.grounded && this.anim === 'dead' && this.stT < 3) FX.dust(this.x, this.y, 6);
    this.at += this.animSpeed;
    this.frame = frameFor(this.C, this.anim, Math.floor(this.at));
    this.updateRibbons();
  }
  juggleLandT() { return 8; }
  updateRibbons() {
    const A = this.frame.A;
    const wind = (G.wind || 0) - this.vx * 0.15;
    for (const r of this.ribbons) {
      const a = A[r.anchor];
      if (!a) { r.visible = false; continue; }
      r.visible = true;
      r.update(this.x + a[0] * this.facing, this.y + a[1], this.facing, wind);
    }
  }
  draw(ctx, cam) {
    if (!this.visible || !this.frame) return;
    const fr = this.frame;
    const shake = this.hitShake && G.hitstop > 0 ? ((G.time & 1) ? 1 : -1) : 0;
    const sx = this.x - cam.x + shake, sy = this.y - cam.y;
    if (this.shadow !== false && this.st !== 'dead') drawShadow(ctx, cam, this.x, this.y, 8);
    const a = this.alpha;
    if (a < 1) { ctx.save(); ctx.globalAlpha = a; }
    for (const r of this.ribbons) if (r.behind) r.draw(ctx, cam);
    if (this.preDraw) this.preDraw(ctx, cam, sx, sy);
    blitFrame(ctx, fr, sx, sy, this.facing);
    const fa = G.time - (this.flashAt || -99);
    if (this.flash > 0 && (fa < 3 || (fa > 5 && fa < 8))) { ctx.save(); ctx.globalAlpha = fa < 3 ? 0.85 : 0.45; blitFrame(ctx, fr, sx, sy, this.facing, frameTint(fr, this.flashColor || '#fff6e8')); ctx.restore(); }
    else if (this.tint) { ctx.save(); ctx.globalAlpha = (a < 1 ? a : 1) * this.tint[1]; blitFrame(ctx, fr, sx, sy, this.facing, frameTint(fr, this.tint[0])); ctx.restore(); }
    for (const r of this.ribbons) if (!r.behind) r.draw(ctx, cam);
    if (this.postDraw) this.postDraw(ctx, cam, sx, sy);
    if (a < 1) ctx.restore();
  }
  // world position of a frame anchor
  anchor(name) { const a = this.frame && this.frame.A[name]; return a ? [this.x + a[0] * this.facing, this.y + a[1]] : [this.x, this.y - this.h * 0.7]; }
}

// Scripted character for cutscenes (no AI)
class Actor extends Fighter {
  constructor(cid, x, y, facing = 1) { super(cid, x, y); this.facing = facing; this.team = 0; this.st = 'cut'; this.walkTo = null; this.speed = 1.2; this.idleAnim = 'idle'; }
  update() {
    if (this.walkTo !== null) {
      const d = this.walkTo - this.x;
      if (Math.abs(d) < this.speed + 0.1) { this.x = this.walkTo; this.walkTo = null; this.vx = 0; this.setAnim(this.idleAnim); }
      else { this.facing = Math.sign(d); this.vx = this.facing * this.speed; this.setAnim(this.speed > 1.8 ? 'run' : 'walk'); }
    } else if (this.st === 'cut') this.vx *= 0.8;
    super.update();
  }
}

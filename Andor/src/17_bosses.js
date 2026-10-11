// ANDOR :: bosses.

class BossBase extends Enemy {
  constructor(x, y, w, h, hp, title) {
    super(x, y, w, h, hp);
    this.title = title;
    this.active = false;
    this.introDone = false;
    this.coins = 0;
    this.knock = 0;
    this.phase = 1;
    this.layer = 1;
  }
  get arena() {
    const A = LEVELS[Game.chapterIdx].arena;
    return { x: A.x * TILE, y: A.y * TILE, w: A.w * TILE, h: A.h * TILE, floor: (A.floor !== undefined ? A.floor : A.y + A.h - 1) * TILE };
  }
  activate() {
    this.active = true;
    this.introT = 0;
    this.setState('intro');
    Game.banner(this.title, 2.4);
    Sfx.play('roar');
    Cam.shake(3, 0.6);
  }
  update(dt, level) {
    this.t += dt;
    if (!this.active) {
      this.idle && this.idle(dt, level);
      if (this.gravity) this.physics(dt, level);
      return;
    }
    this.stT += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (!this.introDone) {
      this.introT += dt;
      if (this.introT > 1.8) {
        this.introDone = true;
        this.setState(this.firstState || 'idle');
      }
      if (this.gravity) this.physics(dt, level);
      return;
    }
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.onPhase2 && this.onPhase2();
    }
    this.think(dt, level);
    if (this.gravity) this.physics(dt, level);
    if (this.hp > 0) this.contactDamage();
  }
  damage(n, srcX, dir) {
    if (!this.introDone || this.hp <= 0) return;
    this.hp -= n;
    this.hurtT = 0.15;
    Game.hitstop(0.06);
    Sfx.play('hit');
    Parts.burst(this.cx, this.cy, 8, { col: ['#fff8ea', '#f4cf62'], speed: 90, g: 100, life: 0.3 });
    if (this.hp <= 0) this.die();
  }
  die() {
    this.dead = true;
    Game.stats.kills++;
    Parts.burst(this.cx, this.cy, 50, { col: this.dustCols || ['#fff1b3', '#f4cf62', '#e6cf9e'], speed: 170, g: 80, type: 'puff', s: 3, life: 1.3 });
    for (let i = 0; i < 20; i++) Game.spawn(new Coin(this.cx, this.cy, 1, true));
    Game.spawn(new Coin(this.cx, this.cy, 25, true));
    Game.spawn(new Pomegranate(this.cx, this.cy, true));
    Game.onBossDefeated(this);
  }
  pickAttack(table) {
    let sum = 0;
    for (const [, w] of table) sum += w;
    let r = Math.random() * sum;
    for (const [n, w] of table) if ((r -= w) <= 0) return n;
    return table[0][0];
  }
}

function makeBoss(n, x, y) {
  if (n === 1) return new Captain(x, y);
  if (n === 2) return new ScorpionKing(x, y);
  if (n === 3) return new Pharaoh(x, y);
  return new Djinn(x, y);
}

// ===========================================================================
// I. CAPTAIN BAHRAM OF THE WATCH: a duel at the city gate.
class Captain extends BossBase {
  constructor(x, y) {
    super(x + 3, y - 4, 11, 20, 16, 'CAPTAIN BAHRAM OF THE WATCH');
    this.face = -1;
    this.cool = 0.8;
    this.combo = 0;
    this.firstState = 'stalk';
    this.dustCols = ['#2f8a80', '#dea12a', '#d9482f'];
  }
  blocks(p, dir) {
    if ((this.state === 'shield' || this.state === 'stalk') && dir === 'fwd' && sgn(p.cx - this.cx) === this.face) {
      if (this.state === 'stalk' && Math.random() < 0.55) return false;
      this.setState('bash');
      this.vx = this.face * 200;
      return true;
    }
    return false;
  }
  onPhase2() {
    this.setState('rally');
    Sfx.play('roar');
  }
  think(dt, level) {
    const p = this.player;
    const dx = p.cx - this.cx, adx = Math.abs(dx);
    const sp = this.phase === 2 ? 1.3 : 1;
    switch (this.state) {
      case 'stalk': {
        this.face = sgn(dx) || this.face;
        let want = 0;
        if (adx > 56) want = this.face;
        else if (adx < 26) want = -this.face;
        const blocked = this.wallAhead(level, want) || this.edgeAhead(level, want);
        this.vx = approach(this.vx, blocked ? 0 : want * 62 * sp, 500 * dt);
        this.cool -= dt;
        if (this.cool <= 0) {
          const atk = this.pickAttack(this.phase === 1 ? [['windup', adx < 70 ? 5 : 1], ['leap', adx > 60 ? 4 : 1], ['shield', 2]] : [['windup', adx < 70 ? 5 : 1], ['leap', 3], ['shield', 1], ['daggers', adx > 50 ? 4 : 1]]);
          this.combo = 0;
          this.setState(atk);
          if (atk === 'leap') {
            this.vy = -360;
            this.vx = clamp(dx * 1.5, -190, 190);
            Sfx.play('whoosh');
          }
        }
        break;
      }
      case 'windup':
        this.vx = approach(this.vx, 0, 900 * dt);
        if (this.stT > (this.combo ? 0.2 : 0.42) / sp) {
          this.setState('slash');
          this.vx = this.face * 170;
          Sfx.play('swish');
        }
        break;
      case 'slash': {
        this.vx = approach(this.vx, 0, 700 * dt);
        const box = { x: this.face > 0 ? this.cx - 2 : this.cx - 30, y: this.y, w: 32, h: 18 };
        if (this.stT < 0.16 && overlap(box, p)) p.hurt(1, this.cx);
        if (this.stT > 0.28) {
          this.combo++;
          if (this.combo < (this.phase === 2 ? 3 : 2)) {
            this.face = sgn(p.cx - this.cx) || this.face;
            this.setState('windup');
          } else this.setState('recover');
        }
        break;
      }
      case 'recover':
        this.vx = approach(this.vx, 0, 900 * dt);
        if (this.stT > 0.75 / sp) this.toStalk();
        break;
      case 'shield':
        this.vx = 0;
        this.face = sgn(dx) || this.face;
        if (this.stT > 1.1) this.toStalk();
        break;
      case 'bash': {
        this.vx = approach(this.vx, 0, 600 * dt);
        if (this.stT < 0.2 && overlap({ x: this.face > 0 ? this.cx : this.cx - 20, y: this.y, w: 20, h: 20 }, p)) p.hurt(1, this.cx);
        if (this.stT > 0.45) this.setState('recover');
        break;
      }
      case 'leap':
        if (this.onGround && this.stT > 0.15) {
          Cam.shake(4, 0.3);
          Sfx.play('slam');
          Parts.dust(this.cx, this.bottom, 14, '#d8c49a');
          for (const d of [-1, 1]) Parts.burst(this.cx + d * 10, this.bottom - 2, 6, { col: '#e6cf9e', speed: 100, angle: d > 0 ? 0 : Math.PI, spread: 0.3, g: 200 });
          if (p.onGround && Math.abs(p.cx - this.cx) < 58 && Math.abs(p.bottom - this.bottom) < 12) p.hurt(1, this.cx);
          this.vx = 0;
          this.setState('stuck');
        }
        break;
      case 'stuck':
        if (this.stT > 0.8 / sp) this.toStalk();
        break;
      case 'daggers':
        this.vx = 0;
        this.face = sgn(dx) || this.face;
        if (this.stT > 0.35 && !this.thrown) {
          this.thrown = true;
          for (const a of [-0.25, 0, 0.25]) {
            const ang = Math.atan2(p.cy - this.cy, dx) + a;
            Game.spawn(new Projectile('dart', this.cx + this.face * 8, this.y + 6, Math.cos(ang) * 190, Math.sin(ang) * 190));
          }
          Sfx.play('swish');
        }
        if (this.stT > 0.8) {
          this.thrown = false;
          this.toStalk();
        }
        break;
      case 'rally':
        this.vx = 0;
        if (this.stT > 0.6 && !this.rallied) {
          this.rallied = true;
          const A = this.arena;
          Game.spawn(new Guard(A.x + 24, A.floor - 20));
          Game.spawn(new Guard(A.x + A.w - 40, A.floor - 20));
          Game.banner('TO ME, MEN OF THE WATCH!', 1.6);
        }
        if (this.stT > 1.3) this.toStalk();
        break;
    }
  }
  toStalk() {
    this.setState('stalk');
    this.cool = rnd(0.5, 1.1) / (this.phase === 2 ? 1.4 : 1);
  }
  draw(g, cam) {
    let pose = 'idle0';
    const s = this.state;
    if (!this.active || s === 'intro') pose = this.introT > 0.4 ? 'windup' : 'idle0';
    else if (s === 'windup' || s === 'rally') pose = 'windup';
    else if (s === 'slash') pose = this.stT < 0.1 ? 'slash' : 'slash2';
    else if (s === 'shield' || s === 'bash') pose = 'guard';
    else if (s === 'leap') pose = this.vy < 0 ? 'jump' : 'fall';
    else if (s === 'stuck') pose = 'land';
    else if (s === 'daggers') pose = this.stT < 0.35 ? 'windup' : 'slash';
    else if (Math.abs(this.vx) > 8) pose = 'walk' + (Math.floor(this.t * 9) % 8);
    const fl = this.hurtT > 0.08 || (s === 'windup' && Math.floor(this.stT * 20) % 2 === 0);
    drawSprite(g, rigFrame('captain', pose), this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, fl);
  }
}

// ===========================================================================
// II. AL-AQRAB, THE GREAT SCORPION
class ScorpionKing extends BossBase {
  constructor(x, y) {
    super(x - 20, y - 10, 56, 26, 22, 'AL-AQRAB, THE GREAT SCORPION');
    this.face = -1;
    this.cool = 1;
    this.firstState = 'walk';
    this.tail = { ang: 0, tx: 0, ty: 0, stuck: false };
    this.tip = { x: 0, y: 0 };
    this.dustCols = ['#7a3a18', '#b8622c', '#f0c040'];
    this.contact = 1;
    this.under = false;
  }
  hurtBox() {
    if (this.under) return { x: -999, y: -999, w: 0, h: 0 };
    if (this.tail.stuck) {
      const r = { x: Math.min(this.x, this.tip.x - 8), y: Math.min(this.y, this.tip.y - 8), w: 0, h: 0 };
      r.w = Math.max(this.x + this.w, this.tip.x + 8) - r.x;
      r.h = Math.max(this.y + this.h, this.tip.y + 8) - r.y;
      return r;
    }
    return { x: this.x, y: this.y - 8, w: this.w, h: this.h + 8 };
  }
  onWhip(p, dir) {
    if (this.hp <= 0 || !this.introDone) return false;
    const box = p.whipBox();
    const tipHit = this.tail.stuck && overlap(box, { x: this.tip.x - 8, y: this.tip.y - 8, w: 16, h: 16 });
    const fromFront = sgn(p.cx - this.cx) === this.face;
    const guarded = this.state === 'walk' && fromFront && dir === 'fwd';
    if (tipHit) this.damage(Game.whipDamage() * 2, p.cx, dir);
    else if (guarded) {
      Sfx.play('clank');
      Parts.burst(this.cx + this.face * 26, this.cy, 6, { col: ['#fff1b3', '#fff'], speed: 90, g: 0 });
      p.vx = -p.face * 110;
    } else this.damage(Game.whipDamage(), p.cx, dir);
    return true;
  }
  onPhase2() {
    Sfx.play('roar');
    Cam.shake(4, 0.6);
    this.setState('burrow');
  }
  idle(dt) {
    this.legPh = (this.legPh || 0) + dt * 2;
  }
  think(dt, level) {
    const p = this.player;
    const dx = p.cx - this.cx, adx = Math.abs(dx);
    const sp = this.phase === 2 ? 1.25 : 1;
    this.legPh = (this.legPh || 0) + dt * (Math.abs(this.vx) > 5 ? 14 : 2);
    switch (this.state) {
      case 'walk': {
        this.face = sgn(dx) || this.face;
        const want = adx > 70 ? this.face : adx < 46 ? -this.face : 0;
        const blocked = this.wallAhead(level, want);
        this.vx = approach(this.vx, blocked ? 0 : want * 50 * sp, 300 * dt);
        this.cool -= dt;
        if (this.cool <= 0) {
          const atk = this.pickAttack(this.phase === 1 ? [['sting', 4], ['pincer', adx < 80 ? 4 : 1]] : [['sting', 3], ['pincer', adx < 80 ? 3 : 1], ['spit', 2], ['burrow', 2]]);
          this.setState(atk);
          this.vx = 0;
          if (atk === 'sting') Sfx.play('hiss');
        }
        break;
      }
      case 'pincer':
        if (this.stT < 0.4) this.vx = approach(this.vx, -this.face * 30, 200 * dt);
        else if (this.stT < 0.75) {
          if (!this.lunged) {
            this.lunged = true;
            this.vx = this.face * 240 * sp;
            Sfx.play('swish');
          }
          this.vx = approach(this.vx, 0, 400 * dt);
          const box = { x: this.face > 0 ? this.x + this.w - 6 : this.x - 22, y: this.y, w: 28, h: this.h };
          if (overlap(box, p)) p.hurt(1, this.cx);
        } else if (this.stT > 1.3) {
          this.lunged = false;
          this.toWalk();
        }
        break;
      case 'sting': {
        // rear back, lock on, strike, stick in the sand
        const T = this.tail;
        if (this.stT < 0.75 / sp) {
          T.tx = p.cx;
          T.ty = Math.min(p.y + p.h - 2, this.arena.floor - 1);
        } else if (!T.struck) {
          T.struck = true;
          T.stuck = true;
          Sfx.play('slam', 0.7);
          Cam.shake(3, 0.25);
          Parts.burst(T.tx, T.ty, 12, { col: ['#e6cf9e', '#c9a46a'], speed: 110, g: 400, angle: -Math.PI / 2, spread: 1.2 });
          if (dist(p.cx, p.cy, T.tx, T.ty) < 18) p.hurt(1, T.tx);
        }
        if (T.stuck && this.stT > (0.75 + 1.4) / sp) {
          T.stuck = false;
          T.struck = false;
          this.toWalk();
        }
        break;
      }
      case 'spit':
        if (this.stT > 0.3 && !this.spat) {
          this.spat = true;
          for (const k of [-1, 0, 1]) {
            const t = 0.8 + k * 0.15;
            const tx = p.cx + k * 30;
            Game.spawn(new Projectile('venom', this.cx + this.face * 24, this.y + 4, (tx - this.cx - this.face * 24) / t, (p.cy - this.y - 4) / t - 0.5 * 300 * t, { grav: 300 }));
          }
          Sfx.play('spit');
        }
        if (this.stT > 1.0) {
          this.spat = false;
          this.toWalk();
        }
        break;
      case 'burrow':
        // dive, travel under the sand toward you, erupt beneath you
        if (this.stT < 0.5) {
          this.vx = 0;
          if (Math.random() < 0.6) Parts.dust(this.cx + rnd(-24, 24), this.bottom, 2, '#e6cf9e');
        } else if (!this.under) {
          this.under = true;
          Sfx.play('rumble', 0.6);
        }
        if (this.under) {
          this.vx = approach(this.vx, sgn(dx) * 120, 300 * dt);
          if (Math.random() < 0.7) Parts.dust(this.cx + rnd(-8, 8), this.bottom, 1, '#e6cf9e');
          if (adx < 10 || this.stT > 3) {
            this.setState('erupt');
            this.vx = 0;
          }
        }
        break;
      case 'erupt':
        if (this.stT < 0.55) {
          if (Math.random() < 0.8) Parts.add({ x: this.cx + rnd(-16, 16), y: this.bottom, vy: rnd(-90, -40), life: 0.4, col: '#e6cf9e', g: 300 });
        } else if (this.under) {
          this.under = false;
          Cam.shake(5, 0.4);
          Sfx.play('boom', 0.6);
          Parts.burst(this.cx, this.bottom, 30, { col: ['#e6cf9e', '#c9a46a', '#f2d7a2'], speed: 160, g: 400, angle: -Math.PI / 2, spread: 1.3, s: 2 });
          if (Math.abs(p.cx - this.cx) < 34 && p.bottom > this.y - 6) {
            p.hurt(1, this.cx);
            p.vy = -260;
          }
        }
        if (this.stT > 1.4) this.toWalk();
        break;
    }
    this.updTail(dt);
  }
  toWalk() {
    this.setState('walk');
    this.cool = rnd(0.7, 1.4) / (this.phase === 2 ? 1.3 : 1);
  }
  updTail(dt) {
    // tail joints: a curve from the body's rear over the back
    const T = this.tail;
    const baseX = this.cx - this.face * 24, baseY = this.y + 6;
    let tipX, tipY;
    if (this.state === 'sting') {
      const k = Math.min(1, this.stT / 0.75);
      if (T.stuck) {
        tipX = T.tx;
        tipY = T.ty;
      } else {
        // reared back, quivering, aimed
        tipX = baseX + this.face * (8 - k * 10) + Math.sin(this.t * 40) * k * 1.5;
        tipY = baseY - 30 - k * 8;
      }
    } else {
      tipX = baseX + this.face * (22 + Math.sin(this.t * 2) * 3);
      tipY = baseY - 26 + Math.cos(this.t * 2.3) * 2;
    }
    this.tip.x = lerp(this.tip.x || tipX, tipX, T.stuck ? 0.6 : 0.25);
    this.tip.y = lerp(this.tip.y || tipY, tipY, T.stuck ? 0.6 : 0.25);
    this.tailBase = [baseX, baseY];
    // stinger contact
    const p = this.player;
    if (!T.stuck && this.state === 'sting' && this.stT > 0.75 && dist(p.cx, p.cy, this.tip.x, this.tip.y) < 12) p.hurt(1, this.tip.x);
  }
  draw(g, cam) {
    if (this.under) {
      // a travelling hump of sand
      const x = Math.round(this.cx - cam.x), y = Math.round(this.bottom - cam.y);
      for (let i = -14; i <= 14; i++) fillR(g, x + i, y - Math.round(Math.cos((i / 14) * Math.PI / 2) * 5), 1, 5, i % 3 ? '#d8b072' : '#c99a5c');
      return;
    }
    const f = this.face;
    const ox = Math.round(this.cx - cam.x), oy = Math.round(this.y - cam.y);
    const fl = this.hurtT > 0.08;
    const body = fl ? '#fff8ea' : '#6e3418', bodyL = fl ? '#fff8ea' : '#9a4a22', bodyD = fl ? '#fff8ea' : '#3e1a0c', gold = '#f0c040';
    // legs
    for (let i = 0; i < 4; i++) {
      for (const side of [0, 1]) {
        const lx = ox + (i - 1.5) * 10 * f + (side ? 2 : -2);
        const ph = (this.legPh || 0) + i * 1.3 + side * Math.PI;
        const lift = Math.max(0, Math.sin(ph)) * 3;
        const kx = lx + f * 3 + Math.cos(ph) * 2, ky = oy + 14 - lift - 4;
        pxLine(g, lx, oy + 16, kx, ky, '#140904', 2);
        pxLine(g, kx, ky, kx + f * 2 + Math.cos(ph) * 2, oy + 26, '#140904', 2);
        pxLine(g, lx, oy + 16, kx, ky, side ? bodyD : body);
        pxLine(g, kx, ky, kx + f * 2 + Math.cos(ph) * 2, oy + 26, side ? bodyD : body);
      }
    }
    // body segments
    for (let i = 0; i < 5; i++) {
      const sx = ox - f * (i * 9 - 14), sy = oy + 12 - (i === 0 ? 1 : 0);
      const r = i === 0 ? 11 : 10 - i * 0.6;
      pxCircle(g, sx, sy + 1, r + 1, '#140904');
      pxCircle(g, sx, sy, r, body);
      pxCircle(g, sx - 2, sy - 3, r * 0.5, bodyL);
      fillR(g, sx - r + 2, sy + r - 3, r * 2 - 4, 1, bodyD);
    }
    // eyes
    fillR(g, ox + f * 20 - 1, oy + 6, 2, 2, '#ff5a2a');
    fillR(g, ox + f * 16 - 1, oy + 5, 2, 2, '#ff5a2a');
    // pincers
    const pinOpen = this.state === 'pincer' && this.stT < 0.4 ? 4 : this.state === 'pincer' ? 0 : 2 + Math.sin(this.t * 3);
    const px = ox + f * (this.state === 'pincer' && this.stT > 0.4 ? 40 : 32), py = oy + 12;
    pxLine(g, ox + f * 20, oy + 14, px - f * 6, py, '#140904', 4);
    pxLine(g, ox + f * 20, oy + 14, px - f * 6, py, body, 2);
    pxCircle(g, px - f * 4, py, 5, '#140904');
    pxCircle(g, px - f * 4, py, 4, bodyL);
    pxLine(g, px - f * 2, py - 2, px + f * 6, py - 3 - pinOpen, bodyL, 2);
    pxLine(g, px - f * 2, py + 2, px + f * 6, py + 2 + pinOpen, body, 2);
    // tail
    const [bx, by] = this.tailBase || [ox, oy];
    const tx = this.tip.x, ty = this.tip.y;
    const n = 8;
    let pxp = bx, pyp = by;
    const ctrlX = bx - f * 6, ctrlY = Math.min(by, ty) - 20;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const qx = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * ctrlX + u * u * tx;
      const qy = (1 - u) * (1 - u) * by + 2 * (1 - u) * u * ctrlY + u * u * ty;
      const r = 5 - u * 2.5;
      pxCircle(g, qx - cam.x, qy - cam.y + 1, r + 1, '#140904');
      pxCircle(g, qx - cam.x, qy - cam.y, r, i % 2 ? body : bodyL);
      pxp = qx;
      pyp = qy;
    }
    // stinger
    const sx = Math.round(tx - cam.x), sy = Math.round(ty - cam.y);
    const glow = this.state === 'sting' && !this.tail.stuck;
    if (glow) {
      g.globalAlpha = 0.5;
      g.drawImage(lightStamp(10, '#f0c040', 3), sx - 10, sy - 10);
      g.globalAlpha = 1;
    }
    for (let i = 0; i < 6; i++) fillR(g, sx - 1 + f * (i > 3 ? 1 : 0), sy + i - 2, 3 - (i > 3 ? 1 : 0), 1, i < 2 ? '#fff1b3' : gold);
    void pxp;
    void pyp;
  }
  light() {
    Lighting.add(this.cx, this.cy, 40, '#f0c040', 0.4);
  }
}

// ===========================================================================
// III. KHEMET-RA, THE UNDYING PHARAOH
class Pharaoh extends BossBase {
  constructor(x, y) {
    super(x - 6, y - 24, 28, 40, 24, 'KHEMET-RA, THE UNDYING');
    this.gravity = false;
    this.contact = 1;
    this.face = -1;
    this.firstState = 'float';
    this.cool = 1.2;
    this.home = { x: this.x, y: this.y };
    this.dustCols = ['#d8cdb0', '#dea12a', '#2b4a7c'];
    this.beam = null;
    this.minions = 0;
  }
  onPhase2() {
    Sfx.play('roar');
    this.setState('slam');
  }
  think(dt, level) {
    const p = this.player;
    const A = this.arena;
    const sp = this.phase === 2 ? 1.25 : 1;
    this.face = sgn(p.cx - this.cx) || this.face;
    const floatTo = (tx, ty, k) => {
      this.x = lerp(this.x, tx - this.w / 2, Math.min(1, k * dt));
      this.y = lerp(this.y, ty - this.h / 2, Math.min(1, k * dt));
    };
    switch (this.state) {
      case 'float': {
        // drift between high stations, bobbing
        if (!this.station || this.stT > 2.4) {
          // low enough to lash from the ledges, high enough to need them
          this.station = { x: A.x + 60 + Math.random() * (A.w - 120), y: A.floor - 178 + Math.random() * 56 };
          this.stT = 0;
        }
        floatTo(this.station.x, this.station.y + Math.sin(this.t * 2) * 6, 1.6);
        this.cool -= dt;
        if (this.cool <= 0) {
          const m = Game.entities.filter((e) => e instanceof Mummy || e instanceof Scarab).length;
          const atk = this.pickAttack(this.phase === 1 ? [['orbs', 4], ['summon', m < 2 ? 2 : 0], ['beam', 3]] : [['orbs', 3], ['summon', m < 3 ? 2 : 0], ['beam', 3], ['slam', 3]]);
          this.setState(atk);
        }
        break;
      }
      case 'orbs':
        floatTo(this.cx, this.cy - 2, 2);
        if (this.stT > 0.5 && !this.fired) {
          this.fired = true;
          const n = this.phase === 2 ? 4 : 3;
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.7;
            Game.spawn(new Projectile('orb', this.cx, this.cy - 6, Math.cos(a) * 80, Math.sin(a) * 80, { homing: 1.6, life: 5 }));
          }
          Sfx.play('magic');
        }
        if (this.stT > 1.2) this.toFloat();
        break;
      case 'summon':
        if (this.stT > 0.6 && !this.fired) {
          this.fired = true;
          Sfx.play('groan');
          const xs = [A.x + 40, A.x + A.w - 56];
          for (const sx of xs) {
            if (Math.random() < 0.5) Game.spawn(new Mummy(sx, A.floor - 20));
            else for (let i = 0; i < 3; i++) Game.spawn(new Scarab(sx + i * 8, A.floor - 16));
            Parts.burst(sx + 8, A.floor - 8, 16, { col: ['#d8cdb0', '#a89c80'], speed: 60, type: 'puff', s: 2, g: -20 });
          }
        }
        if (this.stT > 1.1) this.toFloat();
        break;
      case 'beam': {
        // the Eye of Ra: telegraph a line, then burn it
        if (!this.beam) {
          const low = p.onGround && Math.random() < 0.55;
          this.beam = { y: low ? A.floor - 10 : A.floor - 30, dir: this.cx < A.x + A.w / 2 ? 1 : -1 };
          Sfx.play('laser');
        }
        const B = this.beam;
        floatTo(B.dir > 0 ? A.x + 30 : A.x + A.w - 30, B.y - 4, 3);
        if (this.stT > 0.85 / sp && this.stT < 1.9) {
          const box = { x: A.x, y: B.y - 4, w: A.w, h: 8 };
          if (overlap(box, p) && !(p.state === 'roll' && B.y < A.floor - 20) && !(p.crouch && B.y < A.floor - 20)) p.hurt(1, this.cx);
          if (Math.random() < 0.6) Parts.add({ x: A.x + Math.random() * A.w, y: B.y + rnd(-3, 3), vy: rnd(-30, 30), life: 0.3, col: pick(['#79f0a5', '#fff']), g: 0 });
        }
        if (this.stT > 2.2) {
          this.beam = null;
          this.toFloat();
        }
        break;
      }
      case 'slam': {
        if (this.stT < 0.8) floatTo(p.cx, A.y + 34, 4);
        else if (this.stT < 1.2) {
          this.y = Math.min(A.floor - this.h, this.y + 520 * dt);
          if (this.y >= A.floor - this.h - 1 && !this.slammed) {
            this.slammed = true;
            Cam.shake(6, 0.5);
            Sfx.play('slam');
            for (const d of [-1, 1]) Game.spawn(new Shockwave(this.cx + d * 14, A.floor, d));
            Parts.dust(this.cx, A.floor, 18, '#d8c8a6');
          }
        } else if (this.stT > 2.6 / sp) {
          this.slammed = false;
          this.toFloat();
        }
        break;
      }
    }
  }
  toFloat() {
    this.setState('float');
    this.fired = false;
    this.cool = rnd(0.9, 1.6) / (this.phase === 2 ? 1.3 : 1);
  }
  draw(g, cam) {
    const fl = this.hurtT > 0.08;
    const cx = Math.round(this.cx - cam.x), top = Math.round(this.y - cam.y + Math.sin(this.t * 2.2) * (this.state === 'slam' ? 0 : 1.5));
    const gold = fl ? '#fff8ea' : '#dea12a', goldL = fl ? '#fff8ea' : '#fff1b3', goldD = fl ? '#fff8ea' : '#8a5410';
    const lap = fl ? '#fff8ea' : '#2b4a7c', lapL = fl ? '#fff8ea' : '#3b62a8', wrap = fl ? '#fff8ea' : '#d8cdb0', wrapD = fl ? '#fff8ea' : '#8f8470';
    // emerald aura
    g.globalAlpha = 0.35 + 0.1 * Math.sin(this.t * 4);
    g.drawImage(lightStamp(30, '#25b56a', 3), cx - 30, top + 6);
    g.globalAlpha = 1;
    // tattered lower wraps
    for (let i = 0; i < 6; i++) {
      const x = cx - 8 + i * 3;
      const len = 10 + ((i * 7) % 5) + Math.sin(this.t * 5 + i) * 2;
      for (let k = 0; k < len; k++) fillR(g, x + Math.round(Math.sin(this.t * 4 + i + k * 0.4) * 1), top + 32 + k, 2, 1, k % 4 === 0 ? wrapD : wrap);
    }
    // body (mummy case)
    for (let y = 0; y < 18; y++) {
      const w = 9 - Math.floor(y / 5);
      fillR(g, cx - w - 1, top + 18 + y, w * 2 + 2, 1, '#1c140e');
      fillR(g, cx - w, top + 18 + y, w * 2, 1, (y % 3 === 0 ? wrapD : wrap));
    }
    // broad collar
    for (let r = 0; r < 4; r++) {
      const w = 10 - r;
      fillR(g, cx - w, top + 15 + r, w * 2, 1, [lapL, gold, '#3fb5a3', '#c0392b'][r]);
    }
    // crossed arms with crook and flail
    pxLine(g, cx - 8, top + 20, cx + 3, top + 26, '#1c140e', 3);
    pxLine(g, cx + 8, top + 20, cx - 3, top + 26, '#1c140e', 3);
    pxLine(g, cx - 8, top + 20, cx + 3, top + 26, wrap, 2);
    pxLine(g, cx + 8, top + 20, cx - 3, top + 26, wrap, 2);
    // crook
    for (let i = 0; i < 14; i++) fillR(g, cx - 2 - Math.round(i * 0.5), top + 28 - i, 2, 1, i % 2 ? gold : lap);
    fillR(g, cx - 11, top + 13, 3, 1, gold);
    fillR(g, cx - 12, top + 14, 1, 2, gold);
    // flail
    for (let i = 0; i < 12; i++) fillR(g, cx + 2 + Math.round(i * 0.5), top + 28 - i, 1, 1, i % 2 ? gold : lap);
    for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) fillR(g, cx + 8 + k * 2, top + 16 + i + Math.round(Math.sin(this.t * 5 + k)), 1, 1, i % 2 ? goldL : '#c0392b');
    // nemes headdress
    for (let y = 0; y < 18; y++) {
      const w = y < 4 ? 6 + y : y < 12 ? 10 : 9;
      const col = y % 2 ? lap : gold;
      fillR(g, cx - w - 1, top + y, w * 2 + 2, 1, '#1c140e');
      fillR(g, cx - w, top + y, w * 2, 1, col);
    }
    // death mask face
    fillR(g, cx - 5, top + 4, 10, 12, '#1c140e');
    fillR(g, cx - 4, top + 4, 8, 11, gold);
    fillR(g, cx - 4, top + 4, 2, 11, goldL);
    fillR(g, cx + 3, top + 5, 1, 9, goldD);
    // eyes with kohl and an emerald glare
    const glare = this.state === 'beam' && this.stT < 0.85 ? '#fff' : '#79f0a5';
    fillR(g, cx - 4, top + 7, 3, 1, '#1c140e');
    fillR(g, cx + 1, top + 7, 3, 1, '#1c140e');
    fillR(g, cx - 3, top + 8, 1, 1, glare);
    fillR(g, cx + 2, top + 8, 1, 1, glare);
    fillR(g, cx - 1, top + 10, 2, 1, goldD);
    fillR(g, cx - 2, top + 12, 4, 1, goldD);
    // false beard and uraeus
    fillR(g, cx - 1, top + 15, 3, 4, lap);
    fillR(g, cx - 1, top + 16, 3, 1, gold);
    fillR(g, cx, top - 2, 2, 3, gold);
    fillR(g, cx - 1, top - 3, 1, 1, '#c0392b');
    // the beam itself
    if (this.state === 'beam' && this.beam) {
      const A = this.arena;
      const by = Math.round(this.beam.y - cam.y);
      if (this.stT < 0.85) {
        if (Math.floor(this.stT * 16) % 2 === 0) fillR(g, A.x - cam.x, by, A.w, 1, '#c0392b');
      } else if (this.stT < 1.9) {
        fillR(g, A.x - cam.x, by - 3, A.w, 7, '#25b56a');
        fillR(g, A.x - cam.x, by - 1, A.w, 3, '#a8ffc8');
        fillR(g, A.x - cam.x, by, A.w, 1, '#fff');
      }
    }
  }
  light() {
    Lighting.add(this.cx, this.cy, 70, '#79f0a5', 1);
    if (this.state === 'beam' && this.beam && this.stT > 0.85 && this.stT < 1.9) {
      const A = this.arena;
      for (let x = A.x; x < A.x + A.w; x += 48) Lighting.add(x, this.beam.y, 40, '#79f0a5', 0.9);
    }
  }
}

// A ground shockwave that rolls outward; jump it.
class Shockwave extends Entity {
  constructor(x, floorY, dir) {
    super(x - 5, floorY - 10, 10, 10);
    this.dir = dir;
    this.life = 1.6;
    this.layer = 2;
  }
  update(dt, level) {
    this.t += dt;
    this.life -= dt;
    this.x += this.dir * 170 * dt;
    if (this.life <= 0 || level.rectSolid(this.x, this.y, this.w, this.h - 2)) this.dead = true;
    if (Math.random() < 0.8) Parts.add({ x: this.cx, y: this.y + this.h, vx: -this.dir * 20, vy: rnd(-60, -20), life: 0.3, col: pick(['#d8c8a6', '#9c8b6a']), g: 300 });
    const p = this.player;
    if (p && overlap(this, p)) p.hurt(1, this.cx);
  }
  draw(g, cam) {
    const x = Math.round(this.cx - cam.x), y = Math.round(this.y + this.h - cam.y);
    for (let i = 0; i < 6; i++) fillR(g, x - 4 + i * this.dir, y - 2 - (5 - i), 2, 5 - i + 2, i < 2 ? '#fff1b3' : '#d8c8a6');
  }
}

// ===========================================================================
// IV. THE BRASS DJINN OF ANDOR
class Djinn extends BossBase {
  constructor(x, y) {
    super(x - 16, y - 40, 40, 56, 26, 'THE BRASS DJINN OF ANDOR');
    this.gravity = false;
    this.contact = 0;
    this.face = -1;
    this.firstState = 'hover';
    this.cool = 1.5;
    this.fists = [
      { x: 0, y: 0, state: 'idle', t: 0, side: -1, tx: 0, ty: 0 },
      { x: 0, y: 0, state: 'idle', t: 0, side: 1, tx: 0, ty: 0 },
    ];
    this.headLow = 0;
    this.dustCols = ['#dea12a', '#f4cf62', '#79f0a5'];
    for (const f of this.fists) {
      const r = this.restPos(f);
      f.x = r.x;
      f.y = r.y;
    }
  }
  idle(dt) {
    // dormant above the lamp, breathing smoke, fists resting
    for (const f of this.fists) {
      const r = this.restPos(f);
      f.x = lerp(f.x, r.x, Math.min(1, dt * 5));
      f.y = lerp(f.y, r.y, Math.min(1, dt * 5));
    }
  }
  hurtBox() {
    // union of the head and both fists, wherever they have slammed down
    const boxes = [this.headBox(), ...this.fists.map((f) => ({ x: f.x - 9, y: f.y - 9, w: 18, h: 18 }))];
    const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  headBox() {
    return { x: this.cx - 9, y: this.y - 4 + this.headLow, w: 18, h: 18 };
  }
  onWhip(p, dir) {
    if (this.hp <= 0 || !this.introDone) return false;
    const box = p.whipBox();
    let hit = false;
    if (overlap(box, this.headBox())) {
      this.damage(Game.whipDamage() * (this.state === 'tired' ? 2 : 1), p.cx, dir);
      hit = true;
    }
    for (const f of this.fists)
      if (f.state === 'down' && overlap(box, { x: f.x - 9, y: f.y - 9, w: 18, h: 18 })) {
        this.damage(Game.whipDamage(), p.cx, dir);
        f.state = 'rise';
        f.t = 0;
        hit = true;
      }
    if (!hit) return false;
    return true;
  }
  onPhase2() {
    Sfx.play('roar');
    Cam.shake(5, 0.8);
    Game.banner('THE DJINN BURNS BRIGHTER', 1.8);
    for (let i = 0; i < 3; i++) Game.spawn(new Wisp(this.arena.x + 40 + i * 100, this.arena.y + 40));
  }
  restPos(f) {
    return { x: this.cx + f.side * 34, y: this.y + 34 + Math.sin(this.t * 2 + f.side) * 3 };
  }
  think(dt, level) {
    const p = this.player;
    const A = this.arena;
    const sp = this.phase === 2 ? 1.3 : 1;
    // hover above the lamp at the arena's centre, drifting a little toward you
    const hx = clamp(lerp(A.x + A.w / 2, p.cx, 0.25), A.x + 80, A.x + A.w - 80);
    this.x = lerp(this.x, hx - this.w / 2, Math.min(1, dt * 0.8));
    const hy = A.floor - 120 + Math.sin(this.t * 1.4) * 5;
    this.y = lerp(this.y, hy, Math.min(1, dt * 2));
    this.face = sgn(p.cx - this.cx) || this.face;
    this.headLow = approach(this.headLow, this.state === 'tired' ? 62 : 0, (this.state === 'tired' ? 160 : 90) * dt);
    for (const f of this.fists) this.updFist(f, dt, sp);
    switch (this.state) {
      case 'hover':
        this.cool -= dt;
        if (this.cool <= 0) {
          const atk = this.pickAttack(this.phase === 1 ? [['fist', 5], ['breath', 3], ['rain', 2]] : [['fist', 4], ['breath', 3], ['rain', 2], ['double', 3]]);
          this.setState(atk);
          if (atk === 'fist' || atk === 'double') {
            const free = this.fists.filter((f) => f.state === 'idle');
            const use = atk === 'double' ? free : free.slice(0, 1).concat([]);
            if (!use.length) this.setState('hover');
            use.forEach((f, i) => {
              f.state = 'aim';
              f.t = -i * 0.5;
            });
          }
        }
        break;
      case 'fist':
      case 'double':
        if (this.fists.every((f) => f.state === 'idle') && this.stT > 0.5) this.toHover();
        break;
      case 'breath': {
        if (!this.breath) {
          this.breath = { dir: p.cx < this.cx ? -1 : 1, prog: 0 };
          Sfx.play('roar');
        }
        const B = this.breath;
        if (this.stT > 0.7) {
          B.prog += dt * 0.55 * sp;
          // the flame sweeps from under the djinn outward across the floor zone
          const fx = this.cx + B.dir * B.prog * A.w;
          const fy = A.floor - 22;
          for (let i = 0; i < 3; i++) Parts.add({ x: lerp(this.cx, fx, Math.random()), y: lerp(this.y + 20, fy, Math.random()) + rnd(-5, 5), vx: B.dir * rnd(40, 90), vy: rnd(-20, 20), life: rnd(0.3, 0.5), col: pick(['#fff3b8', '#ffc444', '#f07a22']), type: 'puff', s: rnd(2, 3.5), g: -30 });
          if (Math.abs(p.cx - fx) < 22 && p.bottom > fy - 18 && p.y < fy + 14 && !(p.state === 'roll')) p.hurt(1, fx);
          if (B.prog > 1) {
            this.breath = null;
            this.setState('tired');
            Sfx.play('groan', 0.8);
          }
        }
        break;
      }
      case 'tired':
        if (Math.random() < 0.3) Parts.add({ x: this.cx + rnd(-8, 8), y: this.y + this.headLow, vy: -30, life: 0.6, col: '#5a4a3a', type: 'puff', s: 2, g: -20 });
        if (this.stT > 2.2 / sp) this.toHover();
        break;
      case 'rain':
        if (this.stT > 0.5 && this.stT < 2.5 && Math.random() < dt * (this.phase === 2 ? 7 : 5)) Game.spawn(new FallingCoinHazard(A.x + 16 + Math.random() * (A.w - 32), A.y + 8));
        if (this.stT > 2.9) this.toHover();
        break;
    }
  }
  toHover() {
    this.setState('hover');
    this.cool = rnd(0.8, 1.5) / (this.phase === 2 ? 1.3 : 1);
  }
  updFist(f, dt, sp) {
    const p = this.player;
    const A = this.arena;
    f.t += dt;
    const rest = this.restPos(f);
    if (f.state === 'idle' || f.state === 'rise') {
      f.x = lerp(f.x || rest.x, rest.x, Math.min(1, dt * 5));
      f.y = lerp(f.y || rest.y, rest.y, Math.min(1, dt * 5));
      if (f.state === 'rise' && f.t > 0.6) f.state = 'idle';
    } else if (f.state === 'aim') {
      if (f.t < 0) return;
      f.tx = p.cx;
      f.ty = A.floor - 9;
      f.x = lerp(f.x, f.tx, Math.min(1, dt * 4));
      f.y = lerp(f.y, A.floor - 92, Math.min(1, dt * 4));
      if (f.t > 0.85 / sp) {
        f.state = 'drop';
        f.t = 0;
      }
    } else if (f.state === 'drop') {
      f.y += 600 * dt;
      if (f.y >= f.ty) {
        f.y = f.ty;
        f.state = 'down';
        f.t = 0;
        Cam.shake(5, 0.35);
        Sfx.play('slam');
        Parts.dust(f.x, A.floor, 16, '#c9a46a');
        if (dist(p.cx, p.cy, f.x, f.y) < 22) p.hurt(1, f.x);
        if (this.phase === 2) for (const d of [-1, 1]) Game.spawn(new Shockwave(f.x + d * 12, A.floor, d));
      } else if (dist(p.cx, p.cy, f.x, f.y) < 16) p.hurt(1, f.x);
    } else if (f.state === 'down') {
      if (f.t > 1.5 / sp) {
        f.state = 'rise';
        f.t = 0;
      }
    }
  }
  draw(g, cam) {
    const A = this.arena;
    const fl = this.hurtT > 0.08;
    const cx = Math.round(this.cx - cam.x), top = Math.round(this.y - cam.y);
    const brass = fl ? '#fff8ea' : '#c8902a', brassL = fl ? '#fff8ea' : '#f4cf62', brassD = fl ? '#fff8ea' : '#6e3f10', ink = '#1a0f06';
    // the great lamp on the floor
    const ly = Math.round(A.floor - cam.y);
    const lx = Math.round(A.x + A.w / 2 - cam.x);
    for (let y = 0; y < 14; y++) {
      const w = y < 4 ? 10 + y * 3 : 22 - (y - 4);
      fillR(g, lx - w - 1, ly - 14 + y, w * 2 + 2, 1, ink);
      fillR(g, lx - w, ly - 14 + y, w * 2, 1, y < 2 ? '#fff1b3' : y < 6 ? '#dea12a' : '#a86d16');
    }
    fillR(g, lx + 20, ly - 12, 14, 3, '#a86d16');
    fillR(g, lx + 32, ly - 14, 3, 3, '#dea12a');
    // smoke tail from lamp spout to the waist
    for (let i = 0; i < 18; i++) {
      const u = i / 18;
      const x = lerp(lx + 30, cx, u) + Math.sin(this.t * 3 + i * 0.6) * 4 * (1 - u);
      const y = lerp(ly - 14, top + 46, u);
      pxCircle(g, x, y, 3 + u * 6, i % 2 ? '#2a5a46' : '#1e4636');
    }
    // torso
    for (let y = 0; y < 30; y++) {
      const w = y < 10 ? 13 + y * 0.6 : 19 - (y - 10) * 0.45;
      fillR(g, cx - w - 1, top + 18 + y, w * 2 + 2, 1, ink);
      fillR(g, cx - w, top + 18 + y, w * 2, 1, y % 7 === 0 ? brassL : brass);
      fillR(g, cx + w - 3, top + 18 + y, 3, 1, brassD);
    }
    // emerald runes on the chest
    for (let i = 0; i < 4; i++) fillR(g, cx - 6 + i * 4, top + 26 + (i % 2) * 2, 2, 3, fl ? '#fff' : '#79f0a5');
    // arms to the fists
    for (const f of this.fists) {
      const fx = Math.round(f.x - cam.x), fy = Math.round(f.y - cam.y);
      const sx = cx + f.side * 16, sy = top + 24;
      const ex = lerp(sx, fx, 0.5) + f.side * 8, ey = lerp(sy, fy, 0.5) - 4;
      pxLine(g, sx, sy, ex, ey, ink, 7);
      pxLine(g, ex, ey, fx, fy, ink, 6);
      pxLine(g, sx, sy, ex, ey, brass, 5);
      pxLine(g, ex, ey, fx, fy, brass, 4);
      pxCircle(g, fx, fy, 9, ink);
      pxCircle(g, fx, fy, 8, f.state === 'down' ? brassL : brass);
      fillR(g, fx - 6, fy - 2, 12, 1, brassD);
      fillR(g, fx - 6, fy + 1, 12, 1, brassD);
      if (f.state === 'aim' && f.t >= 0) {
        // shadow telegraph on the floor
        const sw = 10 + f.t * 12;
        g.globalAlpha = 0.5;
        fillR(g, f.tx - cam.x - sw, A.floor - cam.y - 2, sw * 2, 2, '#000');
        g.globalAlpha = 1;
      }
    }
    // head with a crown of flame
    const hy = top + this.headLow;
    drawFlame(g, cx, hy + 2, 16, this.t, 1);
    drawFlame(g, cx - 6, hy + 4, 10, this.t * 1.2, 2);
    drawFlame(g, cx + 6, hy + 4, 10, this.t * 1.1, 3);
    for (let y = 0; y < 18; y++) {
      const w = y < 3 ? 6 + y : y < 13 ? 9 : 9 - (y - 12);
      fillR(g, cx - w - 1, hy + y, w * 2 + 2, 1, ink);
      fillR(g, cx - w, hy + y, w * 2, 1, brass);
    }
    fillR(g, cx - 9, hy + 3, 18, 1, brassL);
    const eye = this.state === 'tired' ? '#3a5a46' : '#a8ffc8';
    fillR(g, cx - 6, hy + 7, 4, 2, ink);
    fillR(g, cx + 2, hy + 7, 4, 2, ink);
    fillR(g, cx - 5, hy + 7, 2, 1, eye);
    fillR(g, cx + 3, hy + 7, 2, 1, eye);
    fillR(g, cx - 1, hy + 2, 2, 3, fl ? '#fff' : '#25b56a');
    fillR(g, cx - 4, hy + 13, 8, 1, ink);
    if (this.state === 'breath' && this.stT > 0.7) fillR(g, cx - 3, hy + 12, 6, 3, '#ffc444');
    // beard of smoke
    for (let i = 0; i < 5; i++) fillR(g, cx - 3 + i * 1.5, hy + 18 + Math.round(Math.sin(this.t * 4 + i) * 1), 1, 3, '#2a5a46');
    if (this.state === 'tired') drawText(g, '!', cx, hy - 14, '#a8ffc8', { align: 'center', outline: ink });
  }
  light() {
    Lighting.add(this.cx, this.y + 10 + this.headLow, 90, '#ffc444', 1);
    for (const f of this.fists) Lighting.add(f.x, f.y, 30, '#f4cf62', 0.6);
  }
}

class FallingCoinHazard extends Entity {
  constructor(x, y) {
    super(x - 4, y, 8, 8);
    this.vy = 30;
    this.layer = 2;
    this.warn = 0.55;
    this.floorY = null;
  }
  update(dt, level) {
    this.t += dt;
    if (this.warn > 0) {
      this.warn -= dt;
      return;
    }
    this.vy = Math.min(380, this.vy + 700 * dt);
    this.y += this.vy * dt;
    const p = this.player;
    if (p && overlap(this, p)) {
      p.hurt(1, this.cx);
      this.dead = true;
    }
    if (level.rectSolid(this.x, this.y, this.w, this.h)) {
      this.dead = true;
      Sfx.play('tink');
      Parts.burst(this.cx, this.y, 6, { col: ['#f4cf62', '#dea12a'], speed: 60, g: 300 });
      if (Math.random() < 0.25) Game.spawn(new Coin(this.cx, this.y - 6, 1, true));
    }
  }
  draw(g, cam) {
    if (this.warn > 0) {
      // glint high above
      if (Math.floor(this.t * 12) % 2) fillR(g, this.cx - cam.x, this.y - cam.y, 1, 1, '#fff1b3');
      return;
    }
    drawSprite(g, ART.coin[Math.floor(this.t * 12) % 4], this.cx - cam.x, this.y + 8 - cam.y);
  }
}

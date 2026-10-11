// ANDOR :: enemies.

class Enemy extends Entity {
  constructor(x, y, w, h, hp) {
    super(x, y, w, h);
    this.hp = hp;
    this.maxHp = hp;
    this.whipable = true;
    this.contact = 1;
    this.coins = 2;
    this.knock = 1;
    this.hurtT = 0;
    this.state = 'patrol';
    this.stT = 0;
    this.face = -1;
    this.alert = 0;
    this.home = { x, y };
    this.gravity = true;
    this.stunT = 0;
  }
  setState(s) {
    this.state = s;
    this.stT = 0;
  }
  // Default reaction to a whip hit.
  onWhip(p, dir) {
    if (this.hp <= 0) return false;
    if (this.blocks && this.blocks(p, dir)) {
      Sfx.play('clank');
      Parts.burst(this.cx + this.face * 6, this.cy - 2, 6, { col: ['#fff1b3', '#fff'], speed: 90, g: 0 });
      p.vx = -p.face * 90;
      return true;
    }
    this.damage(Game.whipDamage(), p.cx, dir);
    return true;
  }
  damage(n, srcX, dir) {
    this.hp -= n;
    this.hurtT = 0.16;
    this.alert = 1;
    Game.hitstop(0.05);
    Sfx.play('hit');
    Parts.burst(this.cx, this.cy, 6, { col: ['#fff8ea', '#f4cf62'], speed: 80, g: 100, life: 0.3 });
    if (this.hp <= 0) return this.die();
    const away = sgn(this.cx - srcX) || 1;
    if (this.knock && dir !== 'down') {
      this.vx = away * 110 * this.knock;
      if (this.gravity) this.vy = -90 * this.knock;
    }
    this.stunT = 0.25 * this.knock;
    this.face = -away;
    this.onHurt && this.onHurt();
  }
  die() {
    this.dead = true;
    Game.stats.kills++;
    Game.score(10 * this.maxHp);
    Sfx.play('enemyDie');
    Cam.shake(1.5, 0.12);
    Parts.burst(this.cx, this.cy, 16, { col: this.dustCols || ['#e6cf9e', '#c9a46a', '#fff8ea'], speed: 90, g: 60, type: 'puff', s: 2.2, life: 0.6 });
    Parts.add({ x: this.cx, y: this.cy, type: 'ring', s: 14, life: 0.3, col: '#fff8ea' });
    for (let i = 0; i < this.coins; i++) Game.spawn(new Coin(this.cx, this.cy, 1, true));
    if (Math.random() < 0.08) Game.spawn(new Pomegranate(this.cx, this.cy, true));
  }
  physics(dt, level) {
    if (this.gravity) this.vy = Math.min(320, this.vy + 900 * dt);
    this.moveX(level, this.vx * dt);
    this.moveY(level, this.vy * dt);
  }
  edgeAhead(level, dir = this.face) {
    const fx = dir > 0 ? this.x + this.w + 2 : this.x - 2;
    const t = level.tileAt(Math.floor(fx / TILE), Math.floor((this.y + this.h + 2) / TILE));
    return !(isSolidT(t) || isOneWayT(t)) || isSpikeT(t);
  }
  wallAhead(level, dir = this.face) {
    const fx = dir > 0 ? this.x + this.w + 1 : this.x - 1;
    return level.rectSolid(fx, this.y + 2, 1, this.h - 4) || isSpikeT(level.tileAt(Math.floor(fx / TILE), Math.floor((this.y + this.h - 4) / TILE)));
  }
  seesPlayer(range, vRange = 28, front = true) {
    const p = this.player;
    if (!p || p.state === 'dead') return false;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    if (Math.abs(dx) > range || Math.abs(dy) > vRange) return false;
    if (front && sgn(dx) !== this.face && Math.abs(dx) > 12 && !this.alert) return false;
    return Game.player.lineClear(this.cx, this.y + 4, p.cx, p.y + 6);
  }
  patrol(dt, level, speed) {
    if (this.wallAhead(level) || this.edgeAhead(level)) {
      this.face *= -1;
      this.vx = 0;
    }
    this.vx = approach(this.vx, this.face * speed, 600 * dt);
  }
  contactDamage() {
    if (this.contact && this.hp > 0 && this.touchesPlayer(-2)) this.player.hurt(this.contact, this.cx);
  }
  update(dt, level) {
    this.t += dt;
    this.stT += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.vx = approach(this.vx, 0, 500 * dt);
      this.physics(dt, level);
      return;
    }
    this.think(dt, level);
    if (this.gravity) this.physics(dt, level);
    this.contactDamage();
    if (this.y > level.ph + 40) this.dead = true;
  }
  think() {}
  drawRig(g, cam, skin, pose, over) {
    const f = rigFrame(skin, pose, over);
    drawSprite(g, f, this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, this.hurtT > 0.08);
    return f;
  }
  drawAlert(g, cam) {
    if (this.alertFlash > 0) {
      drawText(g, '!', this.cx - cam.x, this.y - 12 - cam.y, '#ff8a4a', { align: 'center', outline: PAL.ink });
    }
  }
}

// --- Isfahan watch: patrols, spots, winds up, slashes ----------------------
class Guard extends Enemy {
  constructor(x, y, skin = 'guard') {
    super(x + 3, y - 4, 10, 20, 3);
    this.skin = skin;
    this.coins = 3;
    this.alertFlash = 0;
    this.speed = skin === 'bandit' ? 58 : 38;
  }
  think(dt, level) {
    this.alertFlash = Math.max(0, this.alertFlash - dt);
    const p = this.player;
    const dx = p ? p.cx - this.cx : 0;
    switch (this.state) {
      case 'patrol':
        this.patrol(dt, level, this.speed * 0.6);
        if (this.seesPlayer(110)) {
          this.setState('chase');
          this.alertFlash = 0.6;
          this.alert = 1;
          Sfx.play('alert');
        }
        break;
      case 'chase': {
        this.face = sgn(dx) || this.face;
        const stop = this.wallAhead(level) || this.edgeAhead(level);
        this.vx = stop ? 0 : approach(this.vx, this.face * this.speed * 1.6, 500 * dt);
        if (Math.abs(dx) < (this.skin === 'bandit' ? 46 : 26) && Math.abs(p.cy - this.cy) < 24) this.setState('windup');
        if (!this.seesPlayer(170, 60, false) && this.stT > 1.5) this.setState('patrol');
        break;
      }
      case 'windup':
        this.vx = approach(this.vx, 0, 900 * dt);
        if (this.stT > (this.skin === 'bandit' ? 0.38 : 0.45)) {
          this.setState('slash');
          Sfx.play('swish');
          if (this.skin === 'bandit') this.vx = this.face * 190;
        }
        break;
      case 'slash': {
        if (this.skin === 'bandit') this.vx = approach(this.vx, 0, 500 * dt);
        else this.vx = this.face * 30;
        const box = { x: this.face > 0 ? this.cx : this.cx - 26, y: this.y + 2, w: 26, h: 16 };
        if (this.stT < 0.18 && p && overlap(box, p)) p.hurt(1, this.cx);
        if (this.stT > 0.45) this.setState('chase');
        break;
      }
    }
  }
  draw(g, cam) {
    let pose = 'idle0';
    if (this.state === 'windup') pose = 'windup';
    else if (this.state === 'slash') pose = this.stT < 0.12 ? 'slash' : 'slash2';
    else if (this.hurtT > 0) pose = 'hurt';
    else if (Math.abs(this.vx) > 8) pose = (this.state === 'chase' ? 'run' : 'walk') + (Math.floor(this.t * (this.state === 'chase' ? 12 : 8)) % 8);
    if (this.state === 'windup' && Math.floor(this.stT * 20) % 2 === 0) {
      const f = rigFrame(this.skin, pose);
      drawSprite(g, f, this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, true);
    } else this.drawRig(g, cam, this.skin, pose);
    this.drawAlert(g, cam);
  }
}

// --- Rooftop archer -------------------------------------------------------
class Archer extends Enemy {
  constructor(x, y) {
    super(x + 3, y - 4, 10, 20, 2);
    this.coins = 3;
    this.cool = 1;
    this.alertFlash = 0;
  }
  think(dt, level) {
    this.alertFlash = Math.max(0, this.alertFlash - dt);
    const p = this.player;
    this.vx = 0;
    this.cool -= dt;
    if (this.state === 'patrol') {
      if (p && Math.abs(p.cx - this.cx) < 190 && Math.abs(p.cy - this.cy) < 110 && this.player.lineClear(this.cx, this.y + 4, p.cx, p.cy)) {
        this.face = sgn(p.cx - this.cx) || this.face;
        if (this.cool <= 0) {
          this.setState('draw');
          this.alertFlash = 0.4;
        }
      }
    } else if (this.state === 'draw') {
      if (p) this.face = sgn(p.cx - this.cx) || this.face;
      if (this.stT > 0.7) {
        // lob toward the player's position with a little lead
        const tx = p.cx + p.vx * 0.25, ty = p.cy;
        const dx = tx - this.cx, dy = ty - (this.y + 7);
        const sp = 190;
        const tt = Math.max(0.2, Math.abs(dx) / sp);
        const vy = dy / tt - 0.5 * 160 * tt;
        Game.spawn(new Projectile('arrow', this.cx + this.face * 8, this.y + 7, sgn(dx) * sp, clamp(vy, -220, 220), { grav: 160 }));
        Sfx.play('bow');
        this.setState('patrol');
        this.cool = 1.9;
      }
    }
  }
  draw(g, cam) {
    const pose = this.state === 'draw' ? (this.stT > 0.25 ? 'draw' : 'aim') : this.hurtT > 0 ? 'hurt' : 'aim';
    this.drawRig(g, cam, 'archer', pose, pose === 'draw' ? { draw: Math.min(4, Math.floor(this.stT * 8)) } : null);
    this.drawAlert(g, cam);
  }
}

// --- Scorpion --------------------------------------------------------------
class Scorpion extends Enemy {
  constructor(x, y) {
    super(x + 1, y + 6, 14, 10, 2);
    this.coins = 2;
    this.dustCols = ['#b8622c', '#7a3a18', '#f0c040'];
  }
  think(dt, level) {
    const p = this.player;
    if (this.state === 'patrol') {
      this.patrol(dt, level, 26);
      if (p && Math.abs(p.cy - this.cy) < 20 && Math.abs(p.cx - this.cx) < 40 && sgn(p.cx - this.cx) === this.face) this.setState('wind');
    } else if (this.state === 'wind') {
      this.vx = 0;
      if (this.stT > 0.32) {
        this.setState('strike');
        Sfx.play('hiss', 0.6);
      }
    } else if (this.state === 'strike') {
      const box = { x: this.face > 0 ? this.cx : this.cx - 22, y: this.y - 8, w: 22, h: 14 };
      if (this.stT < 0.2 && p && overlap(box, p)) p.hurt(1, this.cx);
      if (this.stT > 0.5) this.setState('patrol');
    }
  }
  draw(g, cam) {
    const fr = this.state === 'strike' ? 2 : this.state === 'wind' ? 0 : Math.floor(this.t * 8) % 2;
    let ox = this.state === 'wind' ? Math.round(Math.sin(this.stT * 60)) : 0;
    drawSprite(g, ART.scorpion[fr], this.cx - cam.x + ox, this.y + this.h - cam.y + 1, this.face < 0, this.hurtT > 0.08);
  }
}

// --- Cobra: rises, sways, spits --------------------------------------------
class Cobra extends Enemy {
  constructor(x, y) {
    super(x + 3, y + 2, 10, 14, 2);
    this.coins = 2;
    this.cool = rnd(0.5, 1.5);
    this.knock = 0;
    this.dustCols = ['#5a6224', '#d8c070'];
  }
  think(dt, level) {
    const p = this.player;
    this.vx = 0;
    this.cool -= dt;
    if (p && Math.abs(p.cx - this.cx) < 130 && Math.abs(p.cy - this.cy) < 70) {
      this.face = sgn(p.cx - this.cx) || this.face;
      if (this.cool <= 0 && this.state !== 'spit') {
        this.setState('spit');
      }
    }
    if (this.state === 'spit' && this.stT > 0.35 && !this.spat) {
      this.spat = true;
      const dx = p.cx - this.cx;
      const t = clamp(Math.abs(dx) / 120, 0.35, 1.0);
      Game.spawn(new Projectile('venom', this.cx + this.face * 6, this.y + 2, dx / t, (p.cy - this.y - 2) / t - 0.5 * 300 * t, { grav: 300 }));
      Sfx.play('spit');
    }
    if (this.state === 'spit' && this.stT > 0.7) {
      this.setState('patrol');
      this.spat = false;
      this.cool = 2.2;
    }
  }
  draw(g, cam) {
    const fr = this.state === 'spit' ? (this.stT > 0.3 ? 2 : 1) : Math.floor(this.t * 2) % 2;
    drawSprite(g, ART.cobra[fr], this.cx - cam.x, this.y + this.h - cam.y + 1, this.face < 0, this.hurtT > 0.08);
  }
}

// --- Vulture: circles, then dives ------------------------------------------
class Vulture extends Enemy {
  constructor(x, y) {
    super(x, y, 16, 10, 2);
    this.gravity = false;
    this.coins = 2;
    this.baseY = y;
    this.dustCols = ['#4a2e22', '#e8dcc0'];
  }
  think(dt, level) {
    const p = this.player;
    if (this.state === 'patrol') {
      this.vx = approach(this.vx, this.face * 40, 200 * dt);
      this.vy = (this.baseY + Math.sin(this.t * 2) * 8 - this.y) * 3;
      if (Math.abs(this.x - this.home.x) > 70) this.face = sgn(this.home.x - this.x);
      if (p && Math.abs(p.cx - this.cx) < 70 && p.cy > this.cy && p.cy - this.cy < 140 && this.stT > 1) {
        this.setState('dive');
        this.tx = p.cx;
        this.ty = p.cy;
        Sfx.play('screech');
      }
    } else if (this.state === 'dive') {
      const dx = this.tx - this.cx, dy = this.ty - this.cy;
      const d = Math.hypot(dx, dy) || 1;
      this.vx = (dx / d) * 190;
      this.vy = (dy / d) * 190;
      this.face = sgn(dx) || this.face;
      if (d < 8 || this.stT > 1.2 || level.rectSolid(this.x, this.y + 4, this.w, this.h)) this.setState('climb');
    } else if (this.state === 'climb') {
      this.vy = approach(this.vy, -90, 400 * dt);
      this.vx = approach(this.vx, this.face * 50, 200 * dt);
      if (this.y <= this.baseY) this.setState('patrol');
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  draw(g, cam) {
    const fr = this.state === 'dive' ? 1 : Math.floor(this.t * 6) % 2;
    drawSprite(g, ART.vulture[fr], this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, this.hurtT > 0.08);
  }
}

// --- Bat: hangs asleep, swoops in a wobbling line --------------------------
class Bat extends Enemy {
  constructor(x, y) {
    super(x + 2, y + 1, 12, 7, 1);
    this.gravity = false;
    this.state = 'sleep';
    this.coins = 1;
    this.knock = 0;
    this.dustCols = ['#3a2a2e', '#5a4448'];
  }
  think(dt, level) {
    const p = this.player;
    if (this.state === 'sleep') {
      if (p && dist(p.cx, p.cy, this.cx, this.cy) < 80) {
        this.setState('fly');
        Sfx.play('flap', 0.5);
      }
      return;
    }
    if (this.state === 'fly') {
      const dx = p.cx - this.cx, dy = p.cy - 4 - this.cy;
      const d = Math.hypot(dx, dy) || 1;
      this.vx = approach(this.vx, (dx / d) * 95, 300 * dt);
      this.vy = approach(this.vy, (dy / d) * 95 + Math.sin(this.t * 9) * 60, 400 * dt);
      this.face = sgn(this.vx) || this.face;
      if (this.stT > 3.5) this.setState('rest');
    } else if (this.state === 'rest') {
      this.vy = approach(this.vy, -60, 200 * dt);
      this.vx = approach(this.vx, 0, 100 * dt);
      if (this.stT > 1.2) this.setState('fly');
    }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!level.rectSolid(nx, this.y, this.w, this.h)) this.x = nx;
    else this.vx *= -0.5;
    if (!level.rectSolid(this.x, ny, this.w, this.h)) this.y = ny;
    else this.vy *= -0.5;
  }
  draw(g, cam) {
    if (this.state === 'sleep') {
      const s = ART.bat[0];
      g.save();
      g.translate(Math.round(this.cx - cam.x), Math.round(this.y - cam.y + 6));
      g.scale(1, -1);
      g.drawImage(s.c, -s.ax, 0, s.w, s.h);
      g.restore();
      return;
    }
    drawSprite(g, ART.bat[Math.floor(this.t * 12) % 2], this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, this.hurtT > 0.08);
  }
}

// --- Mummy -----------------------------------------------------------------
class Mummy extends Enemy {
  constructor(x, y) {
    super(x + 3, y - 4, 10, 20, 5);
    this.coins = 4;
    this.knock = 0.4;
    this.dustCols = ['#d8cdb0', '#a89c80', '#6e6450'];
    this.groan = rnd(2, 5);
  }
  think(dt, level) {
    const p = this.player;
    this.groan -= dt;
    if (this.groan < 0 && this.onScreen()) {
      this.groan = rnd(4, 7);
      Sfx.play('groan', 0.5);
    }
    const dx = p ? p.cx - this.cx : 0;
    if (this.state === 'patrol') {
      if (p && Math.abs(dx) < 140 && Math.abs(p.cy - this.cy) < 40) {
        this.face = sgn(dx) || this.face;
        const stop = this.wallAhead(level) || this.edgeAhead(level);
        this.vx = stop ? 0 : approach(this.vx, this.face * 24, 200 * dt);
        if (Math.abs(dx) < 30) this.setState('wind');
      } else this.patrol(dt, level, 14);
    } else if (this.state === 'wind') {
      this.vx = 0;
      if (this.stT > 0.55) {
        this.setState('lunge');
        this.vx = this.face * 120;
        Sfx.play('groan', 0.8);
      }
    } else if (this.state === 'lunge') {
      this.vx = approach(this.vx, 0, 300 * dt);
      const box = { x: this.face > 0 ? this.cx : this.cx - 20, y: this.y + 2, w: 20, h: 12 };
      if (p && overlap(box, p)) p.hurt(1, this.cx);
      if (this.stT > 0.5) this.setState('patrol');
    }
  }
  draw(g, cam) {
    let pose = 'shamble' + (Math.floor(this.t * 5) % 8);
    if (Math.abs(this.vx) < 4 && this.state === 'patrol') pose = 'shamble0';
    if (this.state === 'wind') pose = 'windup';
    if (this.state === 'lunge') pose = 'slash';
    const fl = this.hurtT > 0.08 || (this.state === 'wind' && Math.floor(this.stT * 16) % 2 === 0);
    const f = rigFrame('mummy', pose);
    drawSprite(g, f, this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, fl);
  }
  light() {
    Lighting.add(this.cx + this.face * 3, this.y + 3, 10, '#ff8a2a', 0.5);
  }
}

// --- Scarab: skitters along floors toward you ------------------------------
class Scarab extends Enemy {
  constructor(x, y) {
    super(x + 5, y + 10, 6, 6, 1);
    this.coins = 0;
    this.knock = 0;
    this.speed = rnd(55, 75);
    this.dustCols = ['#1f5c4a', '#dea12a'];
  }
  think(dt, level) {
    const p = this.player;
    if (p && Math.abs(p.cx - this.cx) < 150 && Math.abs(p.cy - this.cy) < 40) this.face = sgn(p.cx - this.cx) || this.face;
    if (this.wallAhead(level) || this.edgeAhead(level)) {
      this.face *= -1;
      this.vx = 0;
    }
    this.vx = approach(this.vx, this.face * this.speed, 400 * dt);
  }
  draw(g, cam) {
    drawSprite(g, ART.scarab[Math.floor(this.t * 14) % 2], this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, this.hurtT > 0.08);
  }
}

// --- Jackal warrior: agile spearman that leaps -----------------------------
class Jackal extends Enemy {
  constructor(x, y) {
    super(x + 3, y - 6, 10, 22, 6);
    this.coins = 6;
    this.knock = 0.6;
    this.cool = 0.5;
    this.alertFlash = 0;
    this.dustCols = ['#2a2428', '#dea12a'];
  }
  think(dt, level) {
    const p = this.player;
    this.alertFlash = Math.max(0, this.alertFlash - dt);
    this.cool -= dt;
    const dx = p ? p.cx - this.cx : 0;
    switch (this.state) {
      case 'patrol':
        this.patrol(dt, level, 30);
        if (this.seesPlayer(150, 50)) {
          this.setState('stalk');
          this.alertFlash = 0.6;
          Sfx.play('growl');
        }
        break;
      case 'stalk':
        this.face = sgn(dx) || this.face;
        this.vx = this.edgeAhead(level) || this.wallAhead(level) ? 0 : approach(this.vx, this.face * 85, 500 * dt);
        if (this.cool <= 0 && Math.abs(dx) < 90 && Math.abs(dx) > 40 && this.onGround) {
          this.setState('leap');
          this.vy = -300;
          this.vx = this.face * Math.min(170, Math.abs(dx) * 1.9);
          Sfx.play('growl', 0.7);
        } else if (Math.abs(dx) < 34 && this.cool <= 0) this.setState('wind');
        break;
      case 'leap':
        if (this.onGround && this.stT > 0.1) {
          this.setState('wind');
          this.vx = 0;
        }
        break;
      case 'wind':
        this.vx = approach(this.vx, 0, 900 * dt);
        if (this.stT > 0.3) {
          this.setState('thrust');
          this.vx = this.face * 150;
          Sfx.play('swish');
        }
        break;
      case 'thrust': {
        this.vx = approach(this.vx, 0, 600 * dt);
        const box = { x: this.face > 0 ? this.cx : this.cx - 30, y: this.y + 6, w: 30, h: 10 };
        if (this.stT < 0.22 && p && overlap(box, p)) p.hurt(1, this.cx);
        if (this.stT > 0.55) {
          this.setState('stalk');
          this.cool = rnd(0.6, 1.2);
        }
        break;
      }
    }
  }
  draw(g, cam) {
    let pose = 'idle0';
    if (this.state === 'leap') pose = 'leap';
    else if (this.state === 'wind') pose = 'thrust0';
    else if (this.state === 'thrust') pose = 'thrust1';
    else if (Math.abs(this.vx) > 8) pose = 'run' + (Math.floor(this.t * 12) % 8);
    const fl = this.hurtT > 0.08 || (this.state === 'wind' && Math.floor(this.stT * 20) % 2 === 0);
    drawSprite(g, rigFrame('jackal', pose), this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, fl);
    this.drawAlert(g, cam);
  }
  light() {
    Lighting.add(this.cx + this.face * 4, this.y + 4, 9, '#ff9a2a', 0.5);
  }
}

// --- Brass sentinel: shielded from the front, fires emerald bolts ----------
class Sentinel extends Enemy {
  constructor(x, y) {
    super(x + 3, y - 6, 11, 22, 4);
    this.coins = 5;
    this.knock = 0.3;
    this.cool = rnd(1, 2);
    this.dustCols = ['#dea12a', '#a86d16', '#79f0a5'];
  }
  blocks(p, dir) {
    // the brass faceplate turns aside blows from the front
    return dir === 'fwd' && sgn(p.cx - this.cx) === this.face && this.state !== 'fire';
  }
  think(dt, level) {
    const p = this.player;
    this.cool -= dt;
    if (this.state === 'patrol') {
      this.patrol(dt, level, 18);
      if (p && Math.abs(p.cy - this.cy) < 30 && Math.abs(p.cx - this.cx) < 160) {
        this.face = sgn(p.cx - this.cx) || this.face;
        this.vx = 0;
        if (this.cool <= 0) this.setState('charge');
      }
    } else if (this.state === 'charge') {
      this.vx = 0;
      if (this.stT > 0.6) {
        Game.spawn(new Projectile('bolt', this.cx + this.face * 10, this.y + 10, this.face * 150, 0));
        Sfx.play('bolt');
        this.setState('fire');
      }
    } else if (this.state === 'fire') {
      if (this.stT > 0.5) {
        this.setState('patrol');
        this.cool = 2.4;
      }
    }
  }
  draw(g, cam) {
    let pose = Math.abs(this.vx) > 4 ? 'walk' + (Math.floor(this.t * 6) % 8) : 'idle0';
    if (this.state === 'charge' || this.state === 'fire') pose = 'aim';
    drawSprite(g, rigFrame('sentinel', pose), this.cx - cam.x, this.y + this.h - cam.y, this.face < 0, this.hurtT > 0.08);
    if (this.state === 'charge') {
      g.globalAlpha = Math.min(1, this.stT * 2);
      const x = this.cx - cam.x + this.face * 11, y = this.y + 10 - cam.y;
      pxCircle(g, x, y, 1 + this.stT * 3, '#79f0a5');
      g.globalAlpha = 1;
    }
  }
  light() {
    Lighting.add(this.cx + this.face * 2, this.y + 5, 16, '#79f0a5', 0.7);
  }
}

// --- Djinn wisp: drifts after you through walls ----------------------------
class Wisp extends Enemy {
  constructor(x, y) {
    super(x + 4, y + 4, 8, 8, 1);
    this.gravity = false;
    this.coins = 1;
    this.knock = 0;
    this.dustCols = ['#79f0a5', '#25b56a', '#fff'];
  }
  think(dt, level) {
    const p = this.player;
    if (!p) return;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 130) {
      this.vx = approach(this.vx, (dx / d) * 42, 80 * dt);
      this.vy = approach(this.vy, (dy / d) * 42, 80 * dt);
    } else {
      this.vx = approach(this.vx, 0, 40 * dt);
      this.vy = Math.sin(this.t * 2) * 10;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.random() < 0.6) Parts.add({ x: this.cx + rnd(-2, 2), y: this.cy + rnd(-2, 2), vy: -20, life: 0.4, col: pick(['#79f0a5', '#25b56a', '#a8ffc8']), g: -10, type: 'px' });
  }
  draw(g, cam) {
    const x = Math.round(this.cx - cam.x), y = Math.round(this.cy - cam.y);
    g.globalAlpha = 0.5;
    g.drawImage(lightStamp(10, '#79f0a5', 3), x - 10, y - 10);
    g.globalAlpha = 1;
    pxCircle(g, x, y, 3.5 + Math.sin(this.t * 10) * 0.6, this.hurtT > 0 ? '#fff' : '#25b56a');
    pxCircle(g, x, y - 1, 2, '#a8ffc8');
    fillR(g, x - 2, y - 1, 1, 1, '#0d3a26');
    fillR(g, x + 1, y - 1, 1, 1, '#0d3a26');
  }
  light() {
    Lighting.add(this.cx, this.cy, 30, '#79f0a5', 0.9);
  }
}

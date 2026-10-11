// ANDOR :: entities: pickups, interactables, traps, projectiles.

class Entity extends Body {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.dead = false;
    this.whipable = false;
    this.t = rnd(10);
    this.face = 1;
    this.flashT = 0;
    this.layer = 1; // 0 behind other entities, 2 in front
  }
  get player() {
    return Game.player;
  }
  touchesPlayer(pad = 0) {
    const p = Game.player;
    return p && p.state !== 'dead' && p.x < this.x + this.w + pad && p.x + p.w > this.x - pad && p.y < this.y + this.h + pad && p.y + p.h > this.y - pad;
  }
  onScreen(m = 32) {
    return this.x + this.w > Cam.x - m && this.x < Cam.x + Screen.vw + m && this.y + this.h > Cam.y - m && this.y < Cam.y + Screen.vh + m;
  }
  update(dt, level) {}
  draw(g, cam) {}
  onWhip(p, dir) {
    return false;
  }
}

// --- Pickups ----------------------------------------------------------------
class Coin extends Entity {
  constructor(x, y, value = 1, loose = false, id = null) {
    super(x - 3, y - 3, 7, 7);
    this.value = value;
    this.loose = loose;
    this.id = id;
    this.life = loose ? 9 : Infinity;
    if (loose) {
      this.vx = rnd(-60, 60);
      this.vy = rnd(-180, -100);
    }
    this.magnet = false;
  }
  update(dt, level) {
    this.t += dt;
    const p = this.player;
    if (this.loose) {
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
      if (!this.magnet) {
        this.vy = Math.min(300, this.vy + 700 * dt);
        this.moveX(level, this.vx * dt);
        if (this.hitWall) this.vx *= -0.5;
        const vy = this.vy;
        this.moveY(level, this.vy * dt);
        if (this.onGround) {
          this.vy = vy > 80 ? -vy * 0.45 : 0;
          this.vx *= 0.7;
          if (vy > 80) Sfx.play('tink', 0.4);
        }
      }
    }
    if (p && p.state !== 'dead') {
      const d = dist(p.cx, p.cy, this.cx, this.cy);
      const range = 30 + (Game.upgrades().magnet ? 34 : 0);
      if (d < range && (!this.loose || this.t > 0.35)) this.magnet = true;
      if (this.magnet) {
        const sp = 220 + (range - Math.min(range, d)) * 6;
        this.x += ((p.cx - this.cx) / (d || 1)) * sp * dt;
        this.y += ((p.cy - this.cy) / (d || 1)) * sp * dt;
      }
      if (overlap(this, p)) this.collect();
    }
  }
  collect() {
    this.dead = true;
    Game.addCoins(this.value);
    if (this.id !== null) Game.collected.add(this.id);
    Sfx.play(this.value > 1 ? 'gem' : 'coin');
    Parts.burst(this.cx, this.cy, this.value > 1 ? 10 : 5, { col: this.value > 1 ? ['#a8ffc8', '#25b56a', '#fff'] : ['#fff1b3', '#f4cf62'], speed: 50, g: 0, life: 0.35 });
    if (this.value > 1) Parts.text(this.cx, this.y - 4, '+' + this.value, PAL.emer2);
  }
  draw(g, cam) {
    if (this.loose && this.life < 2 && Math.floor(this.life * 10) % 2) return;
    const bob = this.loose ? 0 : Math.round(Math.sin(this.t * 3) * 1.5);
    if (this.value > 1) {
      drawSprite(g, this.value >= 25 ? ART.ruby : ART.gem, this.cx - cam.x, this.y + 7 - cam.y + bob);
      if (Math.sin(this.t * 4) > 0.9) fillR(g, this.x + 1 - cam.x, this.y - cam.y + bob, 1, 1, '#fff');
      return;
    }
    const fr = [0, 1, 2, 3, 2, 1][Math.floor(this.t * 9) % 6];
    drawSprite(g, ART.coin[fr], this.cx - cam.x, this.y + 7 - cam.y + bob, this.t * 9 % 12 > 6);
  }
}

class Pomegranate extends Entity {
  constructor(x, y, loose = false, id = null) {
    super(x - 4, y - 5, 9, 9);
    this.id = id;
    this.loose = loose;
    if (loose) this.vy = -150;
  }
  update(dt, level) {
    this.t += dt;
    if (this.loose) {
      this.vy = Math.min(300, this.vy + 700 * dt);
      this.moveY(level, this.vy * dt);
    }
    const p = this.player;
    if (p && p.state !== 'dead' && overlap(this, p) && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      this.dead = true;
      if (this.id !== null) Game.collected.add(this.id);
      Sfx.play('heal');
      Parts.burst(this.cx, this.cy, 12, { col: ['#d9443a', '#ffd0c0', '#5a8a3a'], speed: 60, g: -20 });
      Parts.text(this.cx, this.y - 4, '+1', '#ff9a8a');
      Game.hud.pulse = 1;
    }
  }
  draw(g, cam) {
    const bob = this.loose ? 0 : Math.round(Math.sin(this.t * 2.5) * 1.5);
    drawSprite(g, ART.pomegranate, this.cx - cam.x, this.y + 9 - cam.y + bob);
  }
}

class Relic extends Entity {
  constructor(x, y, idx) {
    super(x - 5, y - 6, 11, 11);
    this.idx = idx;
  }
  update(dt, level) {
    this.t += dt;
    if (Math.random() < dt * 6) Parts.add({ x: this.cx + rnd(-7, 7), y: this.cy + rnd(-7, 7), vy: -12, life: 0.6, col: pick(['#fff1b3', '#f4cf62', '#fff']), g: 0 });
    if (this.touchesPlayer()) {
      this.dead = true;
      Game.onRelic(this);
    }
  }
  draw(g, cam) {
    const bob = Math.round(Math.sin(this.t * 2) * 2);
    g.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 3);
    g.drawImage(lightStamp(14, '#f4cf62', 3), Math.round(this.cx - cam.x - 14), Math.round(this.cy - cam.y - 14 + bob));
    g.globalAlpha = 1;
    drawSprite(g, ART.relics[Game.level.theme.name], this.cx - cam.x, this.y + 11 - cam.y + bob);
  }
  light() {
    Lighting.add(this.cx, this.cy, 34, '#f4cf62', 0.8);
  }
}

class Scroll extends Entity {
  constructor(x, y, idx) {
    super(x - 4, y - 3, 9, 6);
    this.idx = idx;
  }
  update(dt) {
    this.t += dt;
    if (this.touchesPlayer(2)) {
      this.dead = true;
      Game.onScroll(this.idx);
    }
  }
  draw(g, cam) {
    const bob = Math.round(Math.sin(this.t * 2.2) * 1.5);
    drawSprite(g, ART.scroll, this.cx - cam.x, this.y + 6 - cam.y + bob);
    if (Math.sin(this.t * 5) > 0.7) fillR(g, this.x + 7 - cam.x, this.y - 2 - cam.y + bob, 1, 1, '#fff8ea');
  }
}

class Checkpoint extends Entity {
  constructor(x, y, idx) {
    super(x + 2, y + 2, 12, 14);
    this.idx = idx;
    this.lit = false;
    this.layer = 0;
  }
  update(dt) {
    this.t += dt;
    if (!this.lit && this.touchesPlayer(4)) this.ignite(true);
    if (this.lit && Math.random() < dt * 10) Parts.add({ x: this.cx + rnd(-3, 3), y: this.y - 6, vx: rnd(-8, 8), vy: rnd(-40, -20), life: rnd(0.4, 0.9), col: pick(['#ffc444', '#f07a22', '#fff3b8']), g: -10, s: 1 });
  }
  ignite(fx) {
    this.lit = true;
    Game.setCheckpoint(this);
    if (fx) {
      const p = this.player;
      p.hp = Math.max(p.hp, p.maxHp);
      Game.hud.pulse = 1;
      Sfx.play('checkpoint');
      Parts.burst(this.cx, this.y - 4, 22, { col: ['#ffc444', '#f07a22', '#fff3b8'], speed: 90, g: -60, life: 0.8 });
      Parts.add({ x: this.cx, y: this.y - 4, type: 'ring', s: 22, life: 0.5, col: '#ffc444' });
      Game.banner('THE FLAME REMEMBERS YOU', 1.6);
    }
  }
  draw(g, cam) {
    const x = this.cx - cam.x, y = this.y + 14 - cam.y;
    drawSprite(g, ART.brazier, x, y + 2);
    if (this.lit) {
      drawFlame(g, x, y - 7, 11, this.t, this.idx);
      drawFlame(g, x - 3, y - 7, 6, this.t * 1.3, 2);
      drawFlame(g, x + 3, y - 7, 7, this.t * 1.1, 5);
    } else {
      fillR(g, x - 3, y - 8, 7, 1, '#3a2a1a');
      if (Math.sin(this.t * 2) > 0.6) fillR(g, x, y - 9, 1, 1, '#c8401a');
    }
  }
  light() {
    if (this.lit) Lighting.add(this.cx, this.y - 6, 70 + Math.sin(this.t * 11) * 3, '#ffb34a', 1);
    else Lighting.add(this.cx, this.y, 16, null, 0.5);
  }
}

class Exit extends Entity {
  constructor(x, y) {
    super(x - 8, y - 16, 32, 32);
    this.layer = 0;
    this.used = false;
  }
  update(dt) {
    this.t += dt;
    const p = this.player;
    if (!this.used && p && p.state === 'normal' && overlap({ x: this.x + 10, y: this.y, w: 12, h: 32 }, p)) {
      this.used = true;
      Game.onExit(this);
    }
    if (Math.random() < dt * 8) Parts.add({ x: this.x + 8 + rnd(16), y: this.y + 30, vy: rnd(-30, -12), vx: rnd(-4, 4), life: rnd(0.6, 1.2), col: pick(['#fff1b3', '#f4cf62']), g: 0 });
  }
  draw(g, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const th = Game.level.theme.name;
    const frame = th === 'andor' ? '#a86d16' : th === 'tomb' ? '#9c8b6a' : th === 'desert' ? '#a8693a' : '#c99659';
    const frameD = th === 'andor' ? '#6e3f10' : th === 'tomb' ? '#6b5d48' : th === 'desert' ? '#6e4024' : '#8d5c30';
    const glow = th === 'andor' ? '#79f0a5' : '#fff1b3';
    // pointed arch frame
    for (let yy = 0; yy < 32; yy++) {
      const t = yy / 32;
      const half = t > 0.4 ? 13 : 13 * Math.sqrt(Math.max(0, 1 - Math.pow((0.4 - t) / 0.42, 2)));
      const hw = Math.round(half);
      fillR(g, x + 16 - hw - 3, y + yy, 3, 1, frame);
      fillR(g, x + 16 + hw, y + yy, 3, 1, frameD);
      g.globalAlpha = 0.55 + 0.25 * Math.sin(this.t * 3 + yy * 0.2);
      fillR(g, x + 16 - hw, y + yy, hw * 2, 1, yy % 3 === 0 ? glow : th === 'andor' ? '#25b56a' : '#f4cf62');
      g.globalAlpha = 1;
    }
    fillR(g, x + 13, y - 3, 6, 3, frame);
    fillR(g, x + 15, y - 5, 2, 2, PAL.gold2);
  }
  light() {
    Lighting.add(this.cx, this.cy, 64, Game.level.theme.name === 'andor' ? '#79f0a5' : '#fff1b3', 1);
  }
}

class Ring extends Entity {
  constructor(x, y) {
    super(x - 4, y - 4, 9, 9);
    this.ax = x;
    this.ay = y;
    this.layer = 0;
    this.pulse = 0;
    this.inRange = false;
  }
  update(dt) {
    this.t += dt;
    this.pulse = Math.max(0, this.pulse - dt * 2);
    const p = this.player;
    this.inRange = false;
    if (p && p.state !== 'swing') {
      const dx = this.ax - p.cx, dy = this.ay - (p.y + 2);
      this.inRange = dy < -8 && Math.hypot(dx, dy) < PHYS.ringRange && dx * p.face > -40;
    }
  }
  draw(g, cam) {
    const x = this.cx - cam.x, y = this.y - cam.y;
    // bracket into the ceiling or a beam
    drawSprite(g, ART.ring, x, y + 4);
    if (this.inRange) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 8);
      g.globalAlpha = 0.6 * a;
      pxRing(g, x, y + 6, 7 + a * 2, '#fff1b3');
      g.globalAlpha = 1;
    }
    if (this.pulse > 0) {
      g.globalAlpha = this.pulse;
      pxRing(g, x, y + 6, 9 + (1 - this.pulse) * 6, '#fff1b3');
      g.globalAlpha = 1;
    }
  }
}

class Pot extends Entity {
  constructor(x, y, id) {
    super(x + 3, y + 5, 10, 11);
    this.whipable = true;
    this.id = id;
    this.layer = 0;
  }
  onWhip(p) {
    this.smash();
    return true;
  }
  smash() {
    this.dead = true;
    if (this.id !== null) Game.collected.add(this.id);
    Sfx.play('pot');
    const th = Game.level.theme.name;
    const cols = th === 'bazaar' ? ['#3fb5a3', '#1f6a60', '#dea12a'] : th === 'tomb' ? ['#e8dcc0', '#b8aa88', '#dea12a'] : th === 'andor' ? ['#dea12a', '#a86d16', '#79f0a5'] : ['#c47a42', '#8a4a26'];
    Parts.burst(this.cx, this.cy, 14, { col: cols, speed: 110, g: 500, life: 0.7, s: 2 });
    const r = hash2(this.id || 0, 7, 3);
    if (r < 0.18) Game.spawn(new Pomegranate(this.cx, this.cy, true));
    else {
      const n = r > 0.85 ? 1 : 3 + Math.floor(r * 3);
      if (r > 0.85) Game.spawn(new Coin(this.cx, this.cy, 10, true));
      else for (let i = 0; i < n; i++) Game.spawn(new Coin(this.cx, this.cy, 1, true));
    }
  }
  draw(g, cam) {
    drawSprite(g, ART.pot[Game.level.theme.name], this.cx - cam.x, this.y + 11 - cam.y);
  }
}

class Lever extends Entity {
  constructor(x, y) {
    super(x + 3, y + 8, 10, 8);
    this.whipable = true;
    this.on = false;
    this.layer = 0;
  }
  onWhip() {
    if (this.on) return false;
    this.on = true;
    Sfx.play('lever');
    Cam.shake(1.5, 0.3);
    for (const e of Game.entities) if (e instanceof Gate && Math.abs(e.cx - this.cx) < 24 * TILE && Math.abs(e.cy - this.cy) < 14 * TILE) e.open();
    Parts.burst(this.cx, this.cy, 6, { col: '#fff1b3', speed: 60, g: 100 });
    return true;
  }
  draw(g, cam) {
    drawSprite(g, ART.lever[this.on ? 1 : 0], this.cx - cam.x, this.y + 8 - cam.y);
  }
}

class Gate extends Entity {
  constructor(x, y, tiles) {
    super(x, y, 16, tiles * 16);
    this.tiles = tiles;
    this.openT = 0;
    this.opening = false;
    this.layer = 2;
  }
  open() {
    if (this.opening) return;
    this.opening = true;
    Sfx.play('gate');
  }
  update(dt, level) {
    if (this.opening && this.openT < 1) {
      this.openT = Math.min(1, this.openT + dt * 0.9);
      Cam.shake(0.8, 0.05);
      if (this.openT > 0.5) for (let i = 0; i < this.tiles; i++) level.setTile(this.x / 16, this.y / 16 + i, T.EMPTY);
      if (Math.random() < 0.4) Parts.dust(this.cx, this.y + this.h * (1 - this.openT), 1, '#9c8b6a');
    }
  }
  draw(g, cam) {
    const lift = Math.round(this.openT * this.h);
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y) - lift;
    const h = this.h;
    g.save();
    g.beginPath();
    g.rect(x - 1, Math.round(this.y - cam.y), 18, h);
    g.clip();
    for (let i = 0; i < 4; i++) {
      fillR(g, x + 1 + i * 4, y, 2, h, '#3a3530');
      fillR(g, x + 1 + i * 4, y, 1, h, '#6e665c');
    }
    for (let yy = 4; yy < h; yy += 10) {
      fillR(g, x, y + yy, 16, 2, '#4a443c');
      fillR(g, x, y + yy, 16, 1, '#7a7268');
    }
    for (let i = 0; i < 4; i++) fillR(g, x + 1 + i * 4, y + h - 3, 2, 3, '#8a8278');
    g.restore();
  }
}

class Crumble extends Entity {
  constructor(x, y) {
    super(x, y, 16, 16);
    this.state = 'idle';
    this.timer = 0;
    this.layer = 0;
    this.tx = x / 16;
    this.ty = y / 16;
  }
  update(dt, level) {
    const p = this.player;
    if (this.state === 'idle') {
      if (p && p.onGround && p.y + p.h <= this.y + 1 && p.y + p.h >= this.y - 1 && p.x + p.w > this.x && p.x < this.x + 16) {
        this.state = 'shake';
        this.timer = 0.42;
        Sfx.play('crumble');
      }
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (Math.random() < 0.3) Parts.add({ x: this.x + rnd(16), y: this.y + 16, vy: 30, life: 0.4, col: '#8a7a60', g: 300 });
      if (this.timer <= 0) {
        this.state = 'gone';
        this.timer = 3.2;
        level.setTile(this.tx, this.ty, T.EMPTY);
        Parts.burst(this.cx, this.cy, 12, { col: this.debrisCols(level), speed: 70, g: 500, life: 0.8, s: 2 });
        Sfx.play('rockfall');
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0 && !(p && overlap(p, this))) {
        this.state = 'idle';
        level.setTile(this.tx, this.ty, T.CRUMBLE);
        Parts.dust(this.cx, this.y + 8, 5, '#d8c8a6');
      }
    }
  }
  debrisCols(level) {
    const th = level.theme.name;
    return th === 'tomb' ? ['#c9b896', '#9c8b6a'] : th === 'andor' ? ['#4a4038', '#dea12a'] : th === 'desert' ? ['#d29659', '#a8693a'] : ['#d1a066', '#9c6a37'];
  }
  draw(g, cam) {
    if (this.state === 'gone') return;
    if (!this.c) {
      const pb = new OffBuf(16, 16, this.x, this.y);
      const n = { u: false, d: false, l: false, r: false };
      Game.level.theme.solid(pb, this.x, this.y, this.tx, this.ty, n);
      // fracture lines
      const crack = C('#1a120c');
      for (const [x0, y0, x1, y1] of [[3, 2, 7, 8], [7, 8, 5, 14], [7, 8, 12, 11], [12, 11, 14, 6]]) pb.line(this.x + x0, this.y + y0, this.x + x1, this.y + y1, crack);
      this.c = pb.toCanvas();
    }
    const sh = this.state === 'shake' ? Math.round(rnd(-1, 1)) : 0;
    g.drawImage(this.c, Math.round(this.x - cam.x + sh), Math.round(this.y - cam.y));
  }
}

class Torch extends Entity {
  constructor(x, y) {
    super(x + 6, y + 4, 4, 8);
    this.layer = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.onScreen() && Math.random() < dt * 6) Parts.add({ x: this.cx + rnd(-1, 1), y: this.y - 6, vx: rnd(-6, 6), vy: rnd(-30, -16), life: rnd(0.3, 0.7), col: pick(['#ffc444', '#f07a22']), g: -5, front: false });
  }
  draw(g, cam) {
    const x = this.cx - cam.x, y = this.y - cam.y;
    drawSprite(g, ART.torch, x, y + 8);
    drawFlame(g, x, y + 1, 8, this.t, this.x);
  }
  light() {
    Lighting.add(this.cx, this.y - 2, 58 + Math.sin(this.t * 13) * 2.5 + Math.sin(this.t * 7.3) * 2, '#ffa040', 1);
  }
}

class Lantern extends Entity {
  constructor(x, y, col) {
    super(x + 5, y, 6, 12);
    this.layer = 0;
    this.col = col || pick(['#f4cf62', '#ff9a4a', '#8de0c8', '#f6ad7b']);
  }
  update(dt) {
    this.t += dt;
  }
  draw(g, cam) {
    const sway = Math.round(Math.sin(this.t * 1.3) * 1);
    const x = this.cx - cam.x, y = this.y - cam.y;
    fillR(g, x, y, 1, 3, '#2a1a0a');
    drawSprite(g, ART.lantern, x + sway, y + 2);
  }
  light() {
    Lighting.add(this.cx, this.y + 8, 44 + Math.sin(this.t * 9) * 1.5, this.col, 0.95);
  }
}

class Decor extends Entity {
  constructor(x, y, spr, front = false) {
    super(x, y, spr.w, spr.h);
    this.spr = spr;
    this.layer = front ? 2 : 0;
  }
  draw(g, cam) {
    drawSprite(g, this.spr, this.x + this.spr.ax - cam.x, this.y + this.spr.ay - cam.y);
  }
}

class MovingPlatform extends Entity {
  constructor(x, y, vertical, wTiles = 3) {
    super(x, y, wTiles * 16, 6);
    this.vertical = vertical;
    this.speed = vertical ? 34 : 42;
    this.dir = 1;
    this.dx = 0;
    this.dy = 0;
    this.layer = 0;
    this.wait = 0;
  }
  update(dt, level) {
    const ox = this.x, oy = this.y;
    if (this.wait > 0) this.wait -= dt;
    else if (this.vertical) {
      this.y += this.dir * this.speed * dt;
      const probe = this.dir > 0 ? this.y + 6 : this.y - 1;
      if (level.rectSolid(this.x + 2, probe, this.w - 4, 1) || this.hitStop(probe, true)) {
        this.dir *= -1;
        this.wait = 0.5;
        this.y = oy;
      }
    } else {
      this.x += this.dir * this.speed * dt;
      const probe = this.dir > 0 ? this.x + this.w : this.x - 1;
      if (level.rectSolid(probe, this.y, 1, 6) || this.hitStop(probe, false)) {
        this.dir *= -1;
        this.wait = 0.4;
        this.x = ox;
      }
    }
    this.dx = this.x - ox;
    this.dy = this.y - oy;
    // carry the rider vertically
    const p = this.player;
    if (p && p.platform === this && this.dy) p.y += this.dy;
  }
  hitStop(probe, vert) {
    for (const s of Game.stoppers) {
      if (vert) {
        if (Math.abs(s.x - this.cx) < this.w / 2 + 8 && probe >= s.y && probe <= s.y + 16) return true;
      } else if (probe >= s.x && probe <= s.x + 16 && Math.abs(s.y - this.y) < 16) return true;
    }
    return false;
  }
  draw(g, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const th = Game.level.theme.name;
    const top = th === 'andor' ? '#f4cf62' : th === 'tomb' ? '#d8c8a6' : '#b07a45';
    const mid = th === 'andor' ? '#a86d16' : th === 'tomb' ? '#9c8b6a' : '#8b5a34';
    const bot = th === 'andor' ? '#6e3f10' : th === 'tomb' ? '#6b5d48' : '#5e3a20';
    fillR(g, x, y, this.w, 6, '#1a120c');
    fillR(g, x + 1, y + 1, this.w - 2, 1, top);
    fillR(g, x + 1, y + 2, this.w - 2, 2, mid);
    fillR(g, x + 1, y + 4, this.w - 2, 1, bot);
    for (let i = 4; i < this.w - 2; i += 8) fillR(g, x + i, y + 2, 1, 2, bot);
    if (th === 'andor') {
      g.globalAlpha = 0.5 + 0.3 * Math.sin(Game.time * 4);
      fillR(g, x + this.w / 2 - 3, y + 6, 6, 1, '#79f0a5');
      g.globalAlpha = 1;
    } else {
      // ropes up out of view
      fillR(g, x + 3, y - 40, 1, 40, '#3a2a1a');
      fillR(g, x + this.w - 4, y - 40, 1, 40, '#3a2a1a');
    }
  }
}

// --- Traps -----------------------------------------------------------------
class DartTrap extends Entity {
  constructor(x, y, dir, phase) {
    super(x, y, 16, 16);
    this.dir = dir;
    this.period = 2.1;
    this.timer = phase;
    this.layer = 0;
  }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.period;
      if (this.onScreen(80)) {
        Game.spawn(new Projectile('dart', this.dir > 0 ? this.x + 16 : this.x - 6, this.y + 7, this.dir * 165, 0));
        Sfx.play('dart', 0.7);
      }
    }
  }
  draw(g, cam) {
    drawSprite(g, ART.dartFace, this.cx - cam.x, this.y + 13 - cam.y, this.dir < 0);
    if (this.timer < 0.35) {
      g.globalAlpha = 1 - this.timer / 0.35;
      fillR(g, this.cx - cam.x - 3, this.y + 6 - cam.y, 2, 1, '#ff8a2a');
      fillR(g, this.cx - cam.x + 2, this.y + 6 - cam.y, 2, 1, '#ff8a2a');
      g.globalAlpha = 1;
    }
  }
}

class SwingBlade extends Entity {
  constructor(x, y, phase) {
    super(x + 8, y + 2, 1, 1);
    this.px = x + 8;
    this.py = y + 2;
    this.len = 52;
    this.phase = phase;
    this.layer = 2;
    this.ang = 0;
  }
  update(dt) {
    this.t += dt;
    this.ang = Math.sin(this.t * 2.6 + this.phase) * 1.15;
    const bx = this.px + Math.sin(this.ang) * this.len, by = this.py + Math.cos(this.ang) * this.len;
    const p = this.player;
    if (p && dist(bx, by, p.cx, p.cy) < 14) p.hurt(1, bx);
    if (Math.abs(Math.cos(this.t * 2.6 + this.phase)) > 0.985 && this.onScreen() && !this.sw) {
      this.sw = true;
      Sfx.play('swish', 0.5);
    }
    if (Math.abs(Math.cos(this.t * 2.6 + this.phase)) < 0.9) this.sw = false;
  }
  draw(g, cam) {
    const a = this.ang;
    const sx = this.px - cam.x, sy = this.py - cam.y;
    const ex = sx + Math.sin(a) * this.len, ey = sy + Math.cos(a) * this.len;
    // chain
    const n = Math.floor(this.len / 4);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      fillR(g, sx + Math.sin(a) * this.len * t, sy + Math.cos(a) * this.len * t, 2, 2, i % 2 ? '#6e665c' : '#3a3530');
    }
    // crescent blade, rasterised in local space
    const ca = Math.cos(a), sa = Math.sin(a);
    g.fillStyle = '#d8d8de';
    for (let ly = -2; ly <= 9; ly++)
      for (let lx = -12; lx <= 12; lx++) {
        const d1 = Math.hypot(lx, ly - 13), d2 = Math.hypot(lx, ly - 19);
        if (d1 > 15 || d2 < 14) continue;
        const wx = ex + lx * ca + ly * sa, wy = ey - lx * sa + ly * ca;
        g.fillStyle = d1 > 13.5 ? '#fff8ea' : ly < 3 ? '#8e8e98' : '#c4c4cc';
        g.fillRect(Math.round(wx), Math.round(wy), 1, 1);
      }
    fillR(g, ex - 2, ey - 2, 4, 4, '#4a443c');
  }
}

class FireJet extends Entity {
  constructor(x, y, phase) {
    super(x + 2, y + 12, 12, 4);
    this.phase = phase;
    this.state = 'off';
    this.timer = phase;
    this.layer = 2;
  }
  update(dt) {
    this.t += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state === 'off') {
        this.state = 'warn';
        this.timer = 0.55;
      } else if (this.state === 'warn') {
        this.state = 'on';
        this.timer = 1.1;
        if (this.onScreen()) Sfx.play('flame');
      } else {
        this.state = 'off';
        this.timer = 1.5;
      }
    }
    if (this.state === 'warn' && Math.random() < 0.5) Parts.add({ x: this.cx + rnd(-4, 4), y: this.y, vy: rnd(-60, -20), life: 0.3, col: '#ffc444', g: 100 });
    if (this.state === 'on') {
      for (let i = 0; i < 3; i++) Parts.add({ x: this.cx + rnd(-4, 4), y: this.y, vx: rnd(-10, 10), vy: rnd(-220, -150), life: rnd(0.2, 0.35), col: pick(['#fff3b8', '#ffc444', '#f07a22', '#c8401a']), g: 0, type: 'puff', s: rnd(1.5, 3) });
      const p = this.player;
      if (p && overlap({ x: this.x, y: this.y - 44, w: this.w, h: 46 }, p)) p.hurt(1, this.cx);
    }
  }
  draw(g, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    fillR(g, x - 1, y, 14, 4, '#2a221c');
    fillR(g, x, y, 12, 1, '#6e665c');
    for (let i = 1; i < 12; i += 3) fillR(g, x + i, y + 1, 2, 2, this.state === 'off' ? '#140c08' : '#ff8a2a');
  }
  light() {
    if (this.state === 'on') Lighting.add(this.cx, this.y - 20, 60, '#ff8a3a', 1);
    else if (this.state === 'warn') Lighting.add(this.cx, this.y, 20, '#ff8a3a', 0.6);
  }
}

class FallingRock extends Entity {
  constructor(x, y) {
    super(x + 4, y, 8, 12);
    this.state = 'hang';
    this.timer = 0;
    this.home = { x: this.x, y: this.y };
    this.layer = 1;
  }
  update(dt, level) {
    const p = this.player;
    if (this.state === 'hang') {
      if (p && Math.abs(p.cx - this.cx) < 18 && p.y > this.y && p.y - this.y < 150) {
        this.state = 'shake';
        this.timer = 0.38;
        Sfx.play('crumble', 0.6);
      }
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'fall';
    } else if (this.state === 'fall') {
      this.vy = Math.min(400, this.vy + 900 * dt);
      this.y += this.vy * dt;
      if (p && overlap(this, p)) {
        p.hurt(1, this.cx);
        this.shatter();
      } else if (level.rectSolid(this.x, this.y, this.w, this.h) || this.y > level.ph) this.shatter();
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'hang';
        this.x = this.home.x;
        this.y = this.home.y;
        this.vy = 0;
      }
    }
  }
  shatter() {
    this.state = 'gone';
    this.timer = 4;
    Cam.shake(1.5, 0.15);
    Sfx.play('rockfall');
    Parts.burst(this.cx, this.y + this.h, 10, { col: ['#9c8b6a', '#6b5d48', '#c9b896'], speed: 80, g: 500, s: 2 });
  }
  draw(g, cam) {
    if (this.state === 'gone') return;
    const sh = this.state === 'shake' ? Math.round(rnd(-1, 1)) : 0;
    const x = Math.round(this.x - cam.x + sh), y = Math.round(this.y - cam.y);
    const rows = [8, 8, 7, 7, 6, 6, 5, 4, 4, 3, 2, 1];
    for (let i = 0; i < rows.length; i++) {
      const w = rows[i], ox = (8 - w) >> 1;
      fillR(g, x + ox, y + i, w, 1, '#6b5d48');
      fillR(g, x + ox, y + i, 1, 1, '#a89878');
    }
  }
}

class Boulder extends Entity {
  constructor(x, y) {
    super(x, y, 44, 44);
    this.active = false;
    this.rot = 0;
    this.layer = 2;
    this.home = { x, y };
  }
  start() {
    this.active = true;
    this.vx = 40;
    Sfx.play('rumble');
    Game.banner('RUN!', 1.2);
    Cam.shake(4, 0.6);
  }
  reset() {
    this.active = false;
    this.x = this.home.x;
    this.y = this.home.y;
    this.vx = this.vy = 0;
  }
  update(dt, level) {
    if (!this.active) return;
    const p = this.player;
    // it gains on you, but a clean run stays ahead
    const target = p ? clamp(PHYS.run * 1.02 + (p.cx - this.cx - 140) * -0.15, 70, 150) : 100;
    this.vx = approach(this.vx, target, 60 * dt);
    this.vy = Math.min(400, this.vy + 900 * dt);
    this.moveX(level, this.vx * dt);
    this.moveY(level, this.vy * dt);
    if (this.hitWall) {
      this.active = false;
      Cam.shake(6, 0.6);
      Sfx.play('boom');
      Parts.burst(this.cx, this.cy, 30, { col: ['#9c8b6a', '#6b5d48', '#c9b896'], speed: 150, g: 500, s: 2 });
      this.dead = true;
      return;
    }
    this.rot += (this.vx * dt) / 22;
    Cam.shake(1.2, 0.1);
    if (Math.random() < 0.6) Parts.dust(this.x + rnd(this.w), this.y + this.h, 1, '#9c8b6a');
    if (p && p.state !== 'dead' && dist(p.cx, p.cy, this.cx, this.cy) < 26) {
      p.hurt(99, this.cx, { force: true });
    }
    if (this.y > level.ph + 60) this.dead = true;
  }
  draw(g, cam) {
    const cx = Math.round(this.cx - cam.x), cy = Math.round(this.cy - cam.y);
    const r = 21;
    if (cx < -30 || cx > Screen.vw + 30) return;
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d > r * r) continue;
        // rotate the texture lookup, keep the shading fixed to the light
        const ux = x * Math.cos(this.rot) - y * Math.sin(this.rot), uy = x * Math.sin(this.rot) + y * Math.cos(this.rot);
        const n = fbm(ux / 7 + 50, uy / 7, 3);
        const lit = (-x - y) / (r * 1.4);
        let v = n * 0.6 + lit * 0.5 + 0.35;
        if (d > (r - 1.5) * (r - 1.5)) v -= 0.4;
        const col = v > 0.85 ? '#c9b896' : v > 0.62 ? '#9c8b6a' : v > 0.4 ? '#7d6e56' : v > 0.2 ? '#5a4e3c' : '#2a221c';
        g.fillStyle = col;
        g.fillRect(cx + x, cy + y, 1, 1);
      }
  }
}

// --- Projectiles -------------------------------------------------------------
class Projectile extends Entity {
  constructor(kind, x, y, vx, vy, opts = {}) {
    const sz = kind === 'orb' ? 8 : kind === 'venom' ? 5 : kind === 'bolt' ? 6 : 4;
    super(x - sz / 2, y - sz / 2, sz, sz);
    this.kind = kind;
    this.vx = vx;
    this.vy = vy;
    this.grav = opts.grav || 0;
    this.life = opts.life || 4;
    this.dmg = opts.dmg || 1;
    this.homing = opts.homing || 0;
    this.whipable = kind !== 'beam';
    this.layer = 2;
    this.face = sgn(vx) || 1;
  }
  onWhip(p) {
    this.dead = true;
    Sfx.play('deflect');
    Parts.burst(this.cx, this.cy, 8, { col: ['#fff1b3', '#fff'], speed: 80, g: 0 });
    Game.score(5);
    return true;
  }
  update(dt, level) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    const p = this.player;
    if (this.homing && p) {
      const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
      const sp = Math.hypot(this.vx, this.vy);
      const cur = Math.atan2(this.vy, this.vx);
      let da = a - cur;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      const na = cur + clamp(da, -this.homing * dt, this.homing * dt);
      this.vx = Math.cos(na) * sp;
      this.vy = Math.sin(na) * sp;
    }
    this.vy += this.grav * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (level.rectSolid(this.x + 1, this.y + 1, this.w - 2, this.h - 2)) {
      this.dead = true;
      Parts.burst(this.cx, this.cy, 5, { col: this.kind === 'venom' ? ['#9ad040', '#5a8a20'] : this.kind === 'bolt' || this.kind === 'orb' ? ['#79f0a5', '#25b56a'] : ['#c9b896', '#6e665c'], speed: 50 });
      if (this.kind === 'dart' || this.kind === 'arrow') Sfx.play('thunk', 0.4);
    }
    if (p && p.state !== 'dead' && overlap(this, p)) {
      if (p.hurt(this.dmg, this.cx)) this.dead = true;
    }
    if (this.kind === 'orb' || this.kind === 'bolt') if (Math.random() < 0.5) Parts.add({ x: this.cx, y: this.cy, life: 0.25, col: pick(['#79f0a5', '#25b56a', '#fff']), g: 0, type: 'px' });
  }
  draw(g, cam) {
    const x = Math.round(this.cx - cam.x), y = Math.round(this.cy - cam.y);
    if (this.kind === 'dart' || this.kind === 'arrow') {
      const L = this.kind === 'arrow' ? 9 : 6;
      const a = Math.atan2(this.vy, this.vx);
      const dx = Math.cos(a), dy = Math.sin(a);
      for (let i = 0; i < L; i++) {
        g.fillStyle = i === L - 1 ? '#d8d8de' : i < 2 ? (this.kind === 'arrow' ? '#f2e6c8' : '#b02a2c') : '#6b4024';
        g.fillRect(Math.round(x - dx * (L / 2 - i)), Math.round(y - dy * (L / 2 - i)), 1, 1);
      }
    } else if (this.kind === 'venom') {
      pxCircle(g, x, y, 2, '#7ab030');
      fillR(g, x - 1, y - 1, 1, 1, '#d8f090');
    } else if (this.kind === 'bolt' || this.kind === 'orb') {
      const r = this.kind === 'orb' ? 4 : 3;
      g.globalAlpha = 0.5;
      g.drawImage(lightStamp(r * 3, '#79f0a5', 3), x - r * 3, y - r * 3);
      g.globalAlpha = 1;
      pxCircle(g, x, y, r, '#25b56a');
      pxCircle(g, x, y, r - 1.5, '#a8ffc8');
    } else if (this.kind === 'rock') {
      pxCircle(g, x, y, 3, '#7d6e56');
      fillR(g, x - 1, y - 2, 2, 1, '#c9b896');
    } else if (this.kind === 'fire') {
      pxCircle(g, x, y, 3, '#f07a22');
      pxCircle(g, x, y, 1.5, '#fff3b8');
    }
  }
  light() {
    if (this.kind === 'bolt' || this.kind === 'orb') Lighting.add(this.cx, this.cy, 26, '#79f0a5', 0.8);
    if (this.kind === 'fire') Lighting.add(this.cx, this.cy, 26, '#ff8a3a', 0.8);
  }
}

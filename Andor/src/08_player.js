// ANDOR :: player controller.

const PHYS = {
  run: 108, accG: 1350, decG: 1800, accA: 980, decA: 420,
  grav: 1000, fallMax: 330, jumpV: 338, jumpCut: 0.45, apexG: 0.55, apexV: 55,
  coyote: 0.1, buffer: 0.14,
  wallSlide: 72, wallJumpX: 168, wallJumpY: 312, wallLock: 0.16,
  rollV: 215, rollT: 0.3, rollCD: 0.22, airRollT: 0.2,
  whipT: 0.3, whipReach: 46, ringRange: 104,
  bounceV: 430,
};

class Player extends Body {
  constructor(x, y) {
    super(x, y, 10, 20);
    this.face = 1;
    this.state = 'normal';
    this.stT = 0;
    this.maxHp = Game.maxHp();
    this.hp = this.maxHp;
    this.inv = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumping = false;
    this.wallDir = 0;
    this.wallGrace = 0;
    this.wallLockT = 0;
    this.airRolls = 1;
    this.rollT = 0;
    this.rollCD = 0;
    this.whipT = -1;
    this.whipDir = 'fwd';
    this.whipHits = new Set();
    this.whipCD = 0;
    this.swing = null;
    this.ringCD = 0;
    this.hang = null;
    this.landT = 0;
    this.animT = 0;
    this.runPh = 0;
    this.lookDown = false;
    this.downT = 0;
    this.crouch = false;
    this.lastSafe = { x, y };
    this.safeT = 0;
    this.sink = 0;
    this.feather = Game.upgrades().feather ? 1 : 0;
    this.deadT = 0;
    this.hazardT = 0;
    this.ledgeIgnore = 0;
    this.platform = null;
    this.fallStartY = y;
    this.stepDust = 0;
    this.scarf = [];
    for (let i = 0; i < 7; i++) this.scarf.push({ x: x, y: y + 4, px: x, py: y + 4 });
  }
  get invulnerable() {
    return this.inv > 0 || this.state === 'dead' || this.state === 'exit' || (this.state === 'roll' && this.rollT < PHYS.rollT - 0.02) || DEBUG.god;
  }
  setState(s) {
    this.state = s;
    this.stT = 0;
  }
  // Standing hitbox restore after roll/crouch, if there is room.
  standUp(level) {
    if (this.h === 20) return true;
    const ny = this.y + this.h - 20;
    if (level.rectSolid(this.x, ny, this.w, 20)) return false;
    this.y = ny;
    this.h = 20;
    return true;
  }
  shrink(h) {
    if (this.h === h) return;
    this.y += this.h - h;
    this.h = h;
  }

  update(dt, level) {
    const I = Input;
    this.stT += dt;
    this.animT += dt;
    this.inv = Math.max(0, this.inv - dt);
    this.rollCD = Math.max(0, this.rollCD - dt);
    this.whipCD = Math.max(0, this.whipCD - dt);
    this.ringCD = Math.max(0, this.ringCD - dt);
    this.wallLockT = Math.max(0, this.wallLockT - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.dropThrough = Math.max(0, this.dropThrough - dt);
    this.ledgeIgnore = Math.max(0, this.ledgeIgnore - dt);
    if (I.p.jump) this.jumpBuf = PHYS.buffer;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);

    switch (this.state) {
      case 'normal': this.updNormal(dt, level); break;
      case 'roll': this.updRoll(dt, level); break;
      case 'hang': this.updHang(dt, level); break;
      case 'climb': this.updClimb(dt, level); break;
      case 'swing': this.updSwing(dt, level); break;
      case 'hurt': this.updHurt(dt, level); break;
      case 'dead': this.updDead(dt, level); break;
      case 'exit': this.updExit(dt, level); break;
      case 'frozen': this.vx = 0; this.applyGravity(dt); this.moveY(level, this.vy * dt); break;
    }
    if (this.whipT >= 0) this.updWhip(dt, level);
    this.checkHazards(level);
    this.updScarf(dt);
  }

  dirX() {
    const I = Input.held;
    return (I.right ? 1 : 0) - (I.left ? 1 : 0);
  }
  applyGravity(dt) {
    let g = PHYS.grav;
    if (this.jumping && Input.held.jump && Math.abs(this.vy) < PHYS.apexV) g *= PHYS.apexG;
    this.vy = Math.min(PHYS.fallMax, this.vy + g * dt);
  }

  updNormal(dt, level) {
    const I = Input;
    let dir = this.dirX();
    const quick = this.inQuicksand(level);
    // crouch / look down
    this.crouch = false;
    if (this.onGround && I.held.down && !dir && this.whipT < 0) {
      this.crouch = true;
      this.downT += dt;
      this.shrink(14);
    } else {
      this.downT = 0;
      if (this.h !== 20 && !this.standUp(level)) {
        this.crouch = true;
        dir = 0;
      }
    }
    this.lookDown = this.downT > 0.45;

    // horizontal
    let max = PHYS.run * (quick ? 0.45 : 1);
    if (this.wallLockT > 0) dir = sgn(this.vx) || dir;
    const acc = this.onGround ? (dir ? PHYS.accG : PHYS.decG) : dir ? PHYS.accA : PHYS.decA;
    if (this.crouch) this.vx = approach(this.vx, 0, PHYS.decG * dt);
    else if (dir) {
      // overspeed (from rolls, swings, bounces) bleeds off gently
      if (Math.abs(this.vx) > max && sgn(this.vx) === dir) this.vx = approach(this.vx, dir * max, (this.onGround ? 500 : 140) * dt);
      else this.vx = approach(this.vx, dir * max, acc * dt);
    } else this.vx = approach(this.vx, 0, acc * dt);
    if (dir && this.whipT < 0 && this.wallLockT <= 0) this.face = dir;
    if (Weather.wind > 0.05 && !this.onGround) this.vx -= Weather.wind * 80 * dt;
    if (Weather.wind > 0.05 && this.onGround && !dir) this.vx -= Weather.wind * 30 * dt;

    // coyote
    if (this.onGround) {
      this.coyote = PHYS.coyote;
      this.airRolls = 1;
    } else this.coyote = Math.max(0, this.coyote - dt);

    // wall contact
    this.wallDir = 0;
    if (!this.onGround && this.h === 20) {
      const probe = (d) => level.rectSolid(d > 0 ? this.x + this.w : this.x - 1, this.y + 4, 1, this.h - 8);
      if (dir && probe(dir) && this.vy > -40) this.wallDir = dir;
      if (this.wallDir) {
        this.wallGrace = 0.09;
        this.lastWall = this.wallDir;
        this.airRolls = 1;
      } else this.wallGrace = Math.max(0, this.wallGrace - dt);
    } else this.wallGrace = 0;

    // ledge grab / mantle
    if (!this.onGround && dir && this.h === 20 && this.vy > -60 && this.whipT < 0 && this.ledgeIgnore <= 0 && this.tryLedge(level, dir)) return;

    // jump
    if (this.jumpBuf > 0) {
      if (this.onGround && I.held.down && this.groundType !== T.SOLID && isOneWayT(this.groundType)) {
        this.dropThrough = 0.22;
        this.y += 1;
        this.onGround = false;
        this.jumpBuf = 0;
        this.coyote = 0;
      } else if (this.coyote > 0 || this.onGround) {
        this.doJump(quick ? 0.72 : 1);
      } else if (this.wallGrace > 0 && this.lastWall) {
        const wd = this.lastWall;
        this.vx = -wd * PHYS.wallJumpX;
        this.vy = -PHYS.wallJumpY;
        this.face = -wd;
        this.wallLockT = PHYS.wallLock;
        this.jumping = true;
        this.jumpBuf = 0;
        this.wallGrace = 0;
        Parts.dust(this.cx + wd * 6, this.y + 12, 5, '#e8d6ae', -wd);
        Sfx.play('walljump');
      }
    }
    if (this.jumping && !I.held.jump && this.vy < 0) {
      this.vy *= PHYS.jumpCut;
      this.jumping = false;
    }
    if (this.vy >= 0) this.jumping = false;

    // roll / dash
    if (I.p.roll && this.rollCD <= 0 && this.whipT < 0) {
      if (this.onGround) return this.startRoll(false);
      if (this.airRolls > 0) return this.startRoll(true);
    }
    // whip
    if (I.p.whip && this.whipCD <= 0 && this.whipT < 0) this.startWhip(level);
    if (this.state !== 'normal') return;

    // gravity + wall slide
    const wasGround = this.onGround;
    const vyBefore = this.vy;
    this.applyGravity(dt);
    if (this.wallDir && this.vy > PHYS.wallSlide) {
      this.vy = approach(this.vy, PHYS.wallSlide, 2400 * dt);
      if (Math.random() < 0.3) Parts.add({ x: this.wallDir > 0 ? this.x + this.w : this.x, y: this.y + 6, vx: -this.wallDir * 10, vy: -10, life: 0.3, col: '#e8d6ae', g: 30 });
      if (this.stT % 0.18 < dt) Sfx.play('slide');
    }
    if (quick) {
      this.vy = Math.min(this.vy, 22);
      this.sink += dt;
    } else this.sink = 0;

    this.moveX(level, this.vx * dt);
    this.moveY(level, this.vy * dt);
    this.ridePlatforms(dt, level);
    if (this.hitCeil) {
      this.vy = Math.max(this.vy, 20);
      this.jumping = false;
    }
    if (this.hitWall) this.vx = 0;

    if (!wasGround && this.onGround) this.onLand(vyBefore, level);
    if (wasGround && !this.onGround && this.vy >= 0) this.fallStartY = this.y;
    if (this.onGround && this.groundType === T.AWNING && vyBefore > 60) this.bounce(level, vyBefore);

    // footstep dust
    if (this.onGround && Math.abs(this.vx) > 60) {
      this.stepDust -= dt;
      if (this.stepDust <= 0) {
        this.stepDust = 0.22;
        Parts.dust(this.cx - this.face * 3, this.bottom, 2, level.theme.name === 'tomb' ? '#9c8b6a' : '#e6cf9e', -this.face * 0.5);
        Sfx.play('step');
      }
    }
    this.updSafe(dt, level);
  }

  doJump(mult = 1) {
    this.vy = -PHYS.jumpV * mult;
    this.jumping = true;
    this.jumpBuf = 0;
    this.coyote = 0;
    this.onGround = false;
    Parts.dust(this.cx, this.bottom, 4);
    Sfx.play('jump');
  }
  bounce(level, vyIn) {
    this.vy = -Math.max(PHYS.bounceV, vyIn * 1.02) * (Input.held.jump ? 1.12 : 1);
    this.onGround = false;
    this.jumping = false;
    this.airRolls = 1;
    Parts.burst(this.cx, this.bottom, 6, { col: ['#f2e6c8', '#b02a2c'], speed: 70, g: 300 });
    Sfx.play('bounce');
    Game.squish(this.cx, this.bottom);
  }
  onLand(vy, level) {
    this.landT = vy > 250 ? 0.12 : 0.06;
    if (vy > 160) {
      Parts.dust(this.cx, this.bottom, vy > 280 ? 8 : 4);
      Sfx.play('land', Math.min(1, vy / 330));
    }
    if (vy > 320) Cam.shake(1.5, 0.12);
  }
  inQuicksand(level) {
    return level.rectTileType(this.x + 2, this.y + this.h - 4, this.w - 4, 4, (t) => t === T.QUICK);
  }
  updSafe(dt, level) {
    if (!this.onGround || this.platform) return;
    const gt = this.groundType;
    if (gt !== T.SOLID && gt !== T.ALT && gt !== T.ONEWAY) return;
    // ground under both edges and no spikes adjacent
    const by = Math.floor((this.bottom + 1) / TILE);
    const tl = level.tileAt(Math.floor(this.x / TILE), by), tr = level.tileAt(Math.floor((this.x + this.w - 1) / TILE), by);
    const ok = (t) => t === T.SOLID || t === T.ALT || t === T.ONEWAY;
    if (!ok(tl) || !ok(tr)) return;
    const tx = Math.floor(this.cx / TILE), ty = Math.floor((this.bottom - 1) / TILE);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (isSpikeT(level.tileAt(tx + dx, ty + dy))) return;
    this.lastSafe.x = this.x;
    this.lastSafe.y = this.y + this.h - 20;
  }

  tryLedge(level, dir) {
    const fx = dir > 0 ? this.x + this.w + 1 : this.x - 1;
    const tx = Math.floor(fx / TILE);
    // find a ledge top near hand height or near the feet (mantle)
    const handY = this.y + 1;
    const ty = Math.floor((handY + 4) / TILE);
    for (const cand of [ty, ty + 1]) {
      if (!isSolidT(level.tileAt(tx, cand))) continue;
      if (level.tileAt(tx, cand) === T.CRUMBLE) continue;
      if (isSolidT(level.tileAt(tx, cand - 1)) || isSolidT(level.tileAt(tx, cand - 2))) continue;
      const top = cand * TILE;
      // the player's own column must be clear above, to pull up
      if (level.rectSolid(this.x, top - 20, this.w, 20)) continue;
      const feet = this.y + this.h;
      if (feet - top >= 0 && feet - top <= 11 && this.vy > -40) {
        // low ledge: quick mantle straight onto it
        this.startClimb(level, dir, top, true);
        return true;
      }
      if (Math.abs(handY - top) <= 6 && this.vy >= 0) {
        this.hang = { dir, top, tx };
        this.setState('hang');
        this.x = dir > 0 ? tx * TILE - this.w : (tx + 1) * TILE;
        this.y = top - 1;
        this.vx = this.vy = 0;
        this.face = dir;
        this.airRolls = 1;
        Sfx.play('grab');
        return true;
      }
    }
    return false;
  }
  updHang(dt, level) {
    const I = Input;
    const h = this.hang;
    this.vx = this.vy = 0;
    this.coyote = 0;
    if (!isSolidT(level.tileAt(h.tx, Math.floor(h.top / TILE)))) {
      this.setState('normal');
      return;
    }
    const dir = this.dirX();
    if (this.stT > 0.08 && (I.p.jump || I.held.up || (dir === h.dir && this.stT > 0.25)) && !(dir === -h.dir)) {
      this.jumpBuf = 0;
      this.startClimb(level, h.dir, h.top, false);
    } else if (I.p.jump && dir === -h.dir) {
      this.setState('normal');
      this.vx = -h.dir * PHYS.wallJumpX;
      this.vy = -PHYS.wallJumpY * 0.95;
      this.face = -h.dir;
      this.wallLockT = PHYS.wallLock;
      this.jumping = true;
      this.jumpBuf = 0;
      Sfx.play('walljump');
    } else if (I.p.down || (I.p.roll && false)) {
      this.setState('normal');
      this.y += 3;
      this.vy = 40;
      this.wallGrace = 0;
      this.ledgeIgnore = 0.25;
    }
  }
  startClimb(level, dir, top, quick) {
    this.setState('climb');
    this.climb = { x0: this.x, y0: this.y, x1: dir > 0 ? this.x + this.w * 0.9 : this.x - this.w * 0.9, y1: top - 20, dur: quick ? 0.12 : 0.24, dir };
    this.face = dir;
    this.vx = this.vy = 0;
    Sfx.play('climb');
  }
  updClimb(dt, level) {
    const c = this.climb;
    const t = Math.min(1, this.stT / c.dur);
    const ty = lerp(c.y0, c.y1, easeOut(Math.min(1, t * 1.4)));
    const tx = lerp(c.x0, c.x1, easeIn(t));
    this.y = ty;
    this.x = tx;
    if (t >= 1) {
      // settle onto the ledge; nudge if the target spot is blocked
      if (level.rectSolid(this.x, this.y, this.w, this.h)) {
        for (let k = 1; k < 12; k++) {
          if (!level.rectSolid(this.x - c.dir * k, this.y, this.w, this.h)) { this.x -= c.dir * k; break; }
        }
      }
      this.setState('normal');
      this.vx = c.dir * 30;
      this.vy = 0;
      this.onGround = true;
      this.landT = 0.05;
    }
  }

  startRoll(air) {
    this.setState('roll');
    this.rollAir = air;
    this.rollT = air ? PHYS.airRollT : PHYS.rollT;
    const dir = this.dirX() || this.face;
    this.face = dir;
    this.vx = dir * PHYS.rollV * (air ? 1.08 : 1);
    if (air) {
      this.airRolls--;
      this.vy = Math.min(this.vy, -40);
    }
    this.shrink(12);
    this.jumping = false;
    Sfx.play('roll');
    Parts.dust(this.cx, this.bottom, 4, '#e8d6ae', -dir);
  }
  updRoll(dt, level) {
    this.rollT -= dt;
    const air = this.rollAir;
    if (air) this.vy = Math.min(this.vy + PHYS.grav * 0.18 * dt, 60);
    else this.applyGravity(dt);
    if (Math.random() < 0.5) Parts.add({ x: this.cx - this.face * 4, y: this.y + 6, vx: -this.face * 20, life: 0.18, col: air ? '#f2e6c8' : '#cdb894', type: 'puff', s: 1.5, g: 0 });
    this.moveX(level, this.vx * dt);
    const vyB = this.vy;
    this.moveY(level, this.vy * dt);
    this.ridePlatforms(dt, level);
    if (this.hitWall) this.vx = 0;
    if (this.onGround && air && vyB > 60) this.onLand(vyB, level);
    if (this.onGround) this.coyote = PHYS.coyote;
    // jump out of a ground roll keeps a little extra momentum
    if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0) && !level.rectSolid(this.x, this.y - 8, this.w, 8)) {
      if (this.standUp(level)) {
        this.setState('normal');
        this.vx = this.face * PHYS.run * 1.35;
        this.doJump(1);
        return;
      }
    }
    if (Input.p.whip && this.whipCD <= 0) {
      if (this.standUp(level)) {
        this.setState('normal');
        this.startWhip(level);
        return;
      }
    }
    if (this.rollT <= 0) {
      if (this.standUp(level)) {
        this.setState('normal');
        this.rollCD = PHYS.rollCD;
        this.vx = this.face * Math.min(Math.abs(this.vx), PHYS.run * 1.1);
        if (air) this.vy = 0;
      } else {
        // stuck under a low ceiling: keep crawling forward
        this.rollT = 0.05;
        this.vx = this.face * 60;
      }
    }
    if (this.onGround) this.updSafe(dt, level);
  }

  startWhip(level) {
    const I = Input.held;
    // Ring latch takes priority when a ring is in reach.
    if (this.ringCD <= 0 && !I.down) {
      const ring = this.findRing();
      if (ring) return this.startSwing(ring);
    }
    this.whipDir = I.up ? 'up' : I.down && !this.onGround ? 'down' : 'fwd';
    this.whipT = 0;
    this.whipHits.clear();
    this.whipCracked = false;
    Sfx.play('whoosh');
  }
  whipPhase() {
    const t = this.whipT;
    return t < 0.07 ? 0 : t < 0.17 ? 1 : 2;
  }
  whipBox() {
    const R = Game.whipReach();
    const cx = this.cx;
    if (this.whipDir === 'up') return { x: cx - 9, y: this.y - R + 6, w: 18, h: R };
    if (this.whipDir === 'down') return { x: cx - 9, y: this.y + this.h - 6, w: 18, h: R - 8 };
    return { x: this.face > 0 ? cx : cx - R, y: this.y + 1, w: R, h: 13 };
  }
  updWhip(dt, level) {
    this.whipT += dt;
    const ph = this.whipPhase();
    if (ph >= 1 && this.whipT < 0.22) {
      if (!this.whipCracked) {
        this.whipCracked = true;
        Sfx.play('crack');
        const tip = this.whipTip();
        Parts.add({ x: tip.x, y: tip.y, type: 'ring', s: 6, life: 0.18, col: '#fff1b3' });
      }
      const box = this.whipBox();
      let pogo = false;
      for (const e of Game.entities) {
        if (e.dead || !e.whipable || this.whipHits.has(e)) continue;
        const hb = e.hurtBox ? e.hurtBox() : e;
        if (overlap(box, hb)) {
          this.whipHits.add(e);
          const r = e.onWhip(this, this.whipDir);
          if (r !== false && this.whipDir === 'down') pogo = true;
        }
      }
      if (this.whipDir === 'down' && !pogo && level.rectTileType(box.x, box.y, box.w, box.h, (t) => isSpikeT(t))) pogo = true;
      if (pogo && !this.pogoed) {
        this.pogoed = true;
        this.vy = -315;
        this.airRolls = 1;
        this.jumping = false;
        Sfx.play('pogo');
      }
    }
    if (this.whipT >= PHYS.whipT) {
      this.whipT = -1;
      this.pogoed = false;
      this.whipCD = 0.06;
    }
  }
  // Whip tip position for the current frame (world coords).
  whipTip() {
    const R = Game.whipReach();
    const f = this.currentFrame();
    const hx = this.handX(f), hy = this.handY(f);
    const t = clamp((this.whipT - 0.07) / 0.1, 0, 1);
    const ext = easeOut(t) * (R - 4);
    if (this.whipDir === 'up') return { x: hx, y: hy - ext };
    if (this.whipDir === 'down') return { x: hx, y: hy + ext };
    return { x: hx + this.face * ext, y: hy + (1 - t) * -6 };
  }
  handX(f) {
    return this.cx + (f.hand[0] - 12) * this.face + (this.face < 0 ? -1 : 0);
  }
  handY(f) {
    return this.y + this.h - 26 + f.hand[1];
  }

  findRing() {
    let best = null, bd = 1e9;
    const hx = this.cx, hy = this.y + 2;
    for (const r of Game.rings) {
      const dx = r.ax - hx, dy = r.ay - hy;
      if (dy > -8) continue;
      const d = Math.hypot(dx, dy);
      if (d > PHYS.ringRange) continue;
      if (dx * this.face < -40) continue;
      const score = d - (dx * this.face > 0 ? 18 : 0);
      if (score < bd && this.lineClear(hx, hy, r.ax, r.ay)) {
        bd = score;
        best = r;
      }
    }
    return best;
  }
  lineClear(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (Game.level.isSolidPx(lerp(x0, x1, t), lerp(y0, y1, t))) return false;
    }
    return true;
  }
  startSwing(ring) {
    if (this.h !== 20 && !this.standUp(Game.level)) return;
    this.setState('swing');
    const hx = this.cx, hy = this.y + 2;
    const len = clamp(Math.hypot(ring.ax - hx, ring.ay - hy), 26, 96);
    this.swing = { r: ring, len, px: hx, py: hy, t: 0 };
    // keep momentum, project onto the tangent
    const dx = hx - ring.ax, dy = hy - ring.ay, d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    const radial = this.vx * nx + this.vy * ny;
    this.vx -= radial * nx;
    this.vy -= radial * ny;
    this.whipT = -1;
    this.airRolls = 1;
    this.jumping = false;
    ring.pulse = 1;
    Sfx.play('latch');
    Parts.add({ x: ring.ax, y: ring.ay, type: 'ring', s: 8, life: 0.25, col: '#fff1b3' });
  }
  updSwing(dt, level) {
    const I = Input;
    const s = this.swing;
    s.t += dt;
    const dir = this.dirX();
    const a = s.r;
    // tangential push
    const dx = s.px - a.ax, dy = s.py - a.ay;
    const d = Math.hypot(dx, dy) || 1;
    const tx = -dy / d, ty = dx / d; // tangent
    if (dir) {
      // push along whichever tangent points the way the stick does
      const st = tx >= 0 ? 1 : -1;
      this.vx += tx * st * dir * 620 * dt;
      this.vy += ty * st * dir * 620 * dt;
      this.face = dir;
    }
    if (I.held.up) s.len = Math.max(24, s.len - 55 * dt);
    if (I.held.down) s.len = Math.min(100, s.len + 70 * dt);
    this.vy += PHYS.grav * 0.92 * dt;
    // integrate and constrain
    const ox = s.px, oy = s.py;
    s.px += this.vx * dt;
    s.py += this.vy * dt;
    let ex = s.px - a.ax, ey = s.py - a.ay;
    const el = Math.hypot(ex, ey) || 1;
    if (el > s.len) {
      s.px = a.ax + (ex / el) * s.len;
      s.py = a.ay + (ey / el) * s.len;
      const nx = ex / el, ny = ey / el;
      const rv = this.vx * nx + this.vy * ny;
      if (rv > 0) {
        this.vx -= rv * nx;
        this.vy -= rv * ny;
      }
    }
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 380) {
      this.vx *= 380 / sp;
      this.vy *= 380 / sp;
    }
    this.vx *= 1 - 0.12 * dt;
    // collide the body against the world
    const nxp = s.px - this.w / 2, nyp = s.py - 2;
    if (level.rectSolid(nxp, nyp, this.w, this.h)) {
      s.px = ox;
      s.py = oy;
      this.vx *= -0.2;
      this.vy *= 0.2;
    } else {
      this.x = nxp;
      this.y = nyp;
    }
    if (Math.abs(this.vx) > 20 && !dir) this.face = sgn(this.vx);
    if (I.p.jump || I.p.whip) {
      this.setState('normal');
      this.vy = Math.min(this.vy - 150, -230);
      this.vx *= 1.12;
      this.jumping = false;
      this.ringCD = 0.22;
      this.swing = null;
      this.jumpBuf = 0;
      Sfx.play('release');
      Parts.burst(this.cx, this.y + 4, 4, { col: '#fff1b3', speed: 40, g: 0 });
    } else if (I.p.down || I.p.roll) {
      this.setState('normal');
      this.ringCD = 0.3;
      this.swing = null;
    }
  }

  hurt(dmg = 1, srcX = null, opts = {}) {
    if (this.invulnerable && !opts.force) return false;
    if (this.state === 'dead') return false;
    this.hp -= dmg;
    Game.stats.hits++;
    Cam.shake(3, 0.25);
    Game.hitstop(0.08);
    Game.flash('#d9482f', 0.18);
    Sfx.play('hurt');
    Parts.burst(this.cx, this.cy, 10, { col: ['#f2e6c8', '#c0392b', '#e8d6ae'], speed: 90 });
    if (navigator.vibrate && Settings.vibrate) navigator.vibrate(60);
    if (this.hp <= 0 && this.feather > 0) {
      this.feather = 0;
      this.hp = 1;
      Parts.burst(this.cx, this.cy, 24, { col: ['#f4cf62', '#fff1b3', '#3fb5a3'], speed: 120, g: -40, life: 1 });
      Parts.text(this.cx, this.y - 8, 'SIMURGH FEATHER!', PAL.turq2);
      Sfx.play('relic');
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    this.inv = 1.2;
    this.swing = null;
    this.whipT = -1;
    if (this.h !== 20) this.standUp(Game.level);
    this.setState('hurt');
    const away = srcX === null ? -this.face : sgn(this.cx - srcX) || -this.face;
    this.vx = away * 130;
    this.vy = -200;
    return true;
  }
  // Spikes, pits, drowning in sand: hurt and return to the last safe footing.
  hazard(kind) {
    if (this.state === 'dead' || this.state === 'exit' || this.hazardT > 0) return;
    if (DEBUG.god) {
      this.respawnSafe();
      return;
    }
    this.hp -= 1;
    Game.stats.hits++;
    Cam.shake(3, 0.2);
    Game.flash('#d9482f', 0.2);
    Sfx.play(kind === 'pit' ? 'fall' : 'spike');
    Parts.burst(this.cx, this.cy, 10, { col: ['#f2e6c8', '#c0392b'], speed: 90 });
    if (this.hp <= 0 && this.feather > 0) {
      this.feather = 0;
      this.hp = 1;
      Parts.text(this.cx, this.y - 8, 'SIMURGH FEATHER!', PAL.turq2);
    }
    if (this.hp <= 0) return this.die();
    this.hazardT = 0.5;
    this.setState('frozen');
    this.vx = 0;
    this.vy = kind === 'pit' ? 0 : -120;
    Game.fadeOut(0.25, () => {
      this.respawnSafe();
      Game.fadeIn(0.25);
    });
  }
  respawnSafe() {
    this.x = this.lastSafe.x;
    this.y = this.lastSafe.y;
    this.h = 20;
    this.vx = this.vy = 0;
    this.setState('normal');
    this.inv = 1.0;
    this.hazardT = 0;
    this.swing = null;
    this.whipT = -1;
    for (const s of this.scarf) { s.x = s.px = this.cx; s.y = s.py = this.y + 4; }
    Cam.reset(this.cx, this.cy, Game.level);
  }
  checkHazards(level) {
    if (this.hazardT > 0) this.hazardT -= STEP;
    if (this.state === 'dead' || this.state === 'exit' || this.state === 'frozen' || this.state === 'climb') return;
    if (this.y > level.ph + 24) return this.hazard('pit');
    // spikes: inner boxes so grazing a tile edge is forgiven
    const hit = level.rectTileType(this.x + 2, this.y + 3, this.w - 4, this.h - 3, (t, tx, ty) => {
      if (!isSpikeT(t)) return false;
      const px = tx * TILE, py = ty * TILE;
      let b;
      if (t === T.SPIKE_U) b = { x: px + 1, y: py + 8, w: 14, h: 8 };
      else if (t === T.SPIKE_D) b = { x: px + 1, y: py, w: 14, h: 8 };
      else if (t === T.SPIKE_L) b = { x: px + 8, y: py + 1, w: 8, h: 14 };
      else b = { x: px, y: py + 1, w: 8, h: 14 };
      if (t === T.SPIKE_U && this.vy < -10) return false;
      return overlap({ x: this.x + 2, y: this.y + 3, w: this.w - 4, h: this.h - 3 }, b);
    });
    if (hit) return this.hazard('spike');
    if (this.sink > 2.2) return this.hazard('sand');
  }
  die() {
    this.hp = 0;
    this.setState('dead');
    this.vx = -this.face * 60;
    this.vy = -220;
    this.swing = null;
    this.whipT = -1;
    Game.stats.deaths++;
    Sfx.play('death');
    Game.slowmo(0.4, 0.6);
  }
  updDead(dt, level) {
    this.applyGravity(dt);
    this.vx = approach(this.vx, 0, 200 * dt);
    this.moveX(level, this.vx * dt);
    this.moveY(level, this.vy * dt);
    if (this.stT > 1.6 && !this.deadNotified) {
      this.deadNotified = true;
      Game.onPlayerDeath();
    }
  }
  updHurt(dt, level) {
    this.applyGravity(dt);
    this.vx = approach(this.vx, 0, 300 * dt);
    this.moveX(level, this.vx * dt);
    this.moveY(level, this.vy * dt);
    if (this.stT > 0.28 || (this.onGround && this.stT > 0.12)) this.setState('normal');
  }
  updExit(dt, level) {
    this.applyGravity(dt);
    this.vx = this.face * 40;
    this.moveX(level, this.vx * dt);
    this.moveY(level, this.vy * dt);
  }
  ridePlatforms(dt, level) {
    this.platform = null;
    if (this.vy < 0) return;
    for (const p of Game.platforms) {
      if (this.x + this.w <= p.x + 1 || this.x >= p.x + p.w - 1) continue;
      const feet = this.y + this.h;
      if (feet >= p.y - 1 && feet <= p.y + 6 && (feet - this.vy * dt <= p.y + 2 || this.onGround)) {
        this.y = p.y - this.h;
        this.vy = 0;
        if (!this.onGround && this.state === 'normal') this.onLand(60, level);
        this.onGround = true;
        this.groundType = T.SOLID;
        this.platform = p;
        this.moveX(level, p.dx);
        break;
      }
    }
  }

  updScarf(dt) {
    const f = this.currentFrame();
    const flip = this.face < 0;
    let ax = this.cx + (f.head[0] + 1 - 12) * (flip ? -1 : 1) + (flip ? -1 : 0);
    let ay = this.y + this.h - 26 + f.head[1];
    if (this.state === 'roll') {
      ax = this.cx - this.face * 2;
      ay = this.y + 4;
    }
    const S = this.scarf;
    S[0].x = ax;
    S[0].y = ay;
    const t = Game.time;
    for (let i = 1; i < S.length; i++) {
      const p = S[i];
      const vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
      p.px = p.x;
      p.py = p.y;
      p.x += vx - this.face * 0.06 - Weather.wind * 0.5 + Math.sin(t * 9 + i * 1.3) * 0.08;
      p.y += vy + 0.09;
    }
    for (let k = 0; k < 3; k++)
      for (let i = 1; i < S.length; i++) {
        const a = S[i - 1], b = S[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const rest = 2.4;
        const m = (d - rest) / d;
        b.x -= dx * m;
        b.y -= dy * m;
      }
  }

  currentFrame() {
    const st = this.state;
    let pose = 'idle0';
    if (st === 'hang') pose = 'hang';
    else if (st === 'climb') pose = this.stT < this.climb.dur * 0.5 ? 'climb0' : 'climb1';
    else if (st === 'swing') {
      const rel = this.vx * this.face;
      pose = rel > 40 ? 'swingF' : rel < -40 ? 'swingB' : 'swingM';
    } else if (st === 'hurt' || (st === 'frozen' && this.hazardT > 0)) pose = 'hurt';
    else if (st === 'dead') pose = 'hurt';
    else if (this.crouch) pose = 'crouch';
    else if (!this.onGround) {
      if (this.wallDir && this.vy > 0) pose = 'wall';
      else pose = this.vy < -30 ? 'jump' : 'fall';
    } else if (this.landT > 0) pose = 'land';
    else if (Math.abs(this.vx) > 12 || st === 'exit') {
      this.runPh += (Math.abs(this.vx) / PHYS.run) * STEP * 13;
      pose = 'run' + (Math.floor(this.runPh) % 8);
    } else pose = Math.floor(this.animT * 1.6) % 2 ? 'idle1' : 'idle0';
    if (this.whipT >= 0) {
      const ph = this.whipPhase();
      const legs = pose.startsWith('run') ? pose : this.onGround ? 'idle0' : this.whipDir === 'down' ? 'jump' : pose === 'wall' ? 'fall' : pose;
      return heroFrame(legs, this.whipDir, ph);
    }
    return heroFrame(pose);
  }

  draw(g, cam) {
    if (this.state === 'dead' && this.stT > 0.5 && this.onGround) {
      heroExtras();
      drawSprite(g, HERO_DEAD_SPR, this.cx - cam.x, this.y + this.h - cam.y, this.face < 0);
      return;
    }
    if (this.inv > 0 && this.state !== 'hurt' && Math.floor(this.inv * 16) % 2 === 0) return;
    const flash = this.state === 'hurt' && this.stT < 0.08;
    // scarf behind the body
    this.drawScarf(g, cam);
    if (this.state === 'roll') {
      heroExtras();
      const q = Math.floor((PHYS.rollT - this.rollT) * 26) % 4;
      const fr = HERO_ROLL_SPR[this.face > 0 ? q : (4 - q) % 4];
      drawSprite(g, fr, this.cx - cam.x, this.y + this.h - cam.y + 1, this.face < 0, flash);
      return;
    }
    if (this.state === 'swing' && this.swing) {
      const s = this.swing;
      const f = this.currentFrame();
      const hx = this.handX(f), hy = this.handY(f);
      this.drawRope(g, cam, hx, hy, s.r.ax, s.r.ay + 4, 0);
    }
    const f = this.currentFrame();
    let oy = 0;
    if (this.state === 'normal' && this.inQuicksand(Game.level)) oy = Math.min(10, this.sink * 5);
    drawSprite(g, f, this.cx - cam.x + (this.face < 0 ? -1 : 0), this.y + this.h - cam.y + oy, this.face < 0, flash);
    if (this.whipT >= 0) this.drawWhip(g, cam, f);
  }
  drawScarf(g, cam) {
    const S = this.scarf;
    for (let i = S.length - 1; i > 0; i--) {
      const a = S[i - 1], b = S[i];
      const w = i < 3 ? 2 : 1;
      pxLine(g, a.x - cam.x, a.y - cam.y + 1, b.x - cam.x, b.y - cam.y + 1, '#6e1820', w);
      pxLine(g, a.x - cam.x, a.y - cam.y, b.x - cam.x, b.y - cam.y, i % 2 ? '#c0392b' : '#a8302a', w);
    }
  }
  drawRope(g, cam, x0, y0, x1, y1, slack) {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    let lx = x0, ly = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = lerp(x0, x1, t), y = lerp(y0, y1, t) + Math.sin(t * Math.PI) * slack;
      pxLine(g, lx - cam.x, ly - cam.y, x - cam.x, y - cam.y, '#3d2416');
      lx = x;
      ly = y;
    }
  }
  drawWhip(g, cam, f) {
    const ph = this.whipPhase();
    const hx = this.handX(f), hy = this.handY(f);
    const R = Game.whipReach();
    const pts = [];
    const n = 12;
    const fc = this.face;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      let x, y;
      if (ph === 0) {
        // trailing behind, curling
        const k = this.whipT / 0.07;
        if (this.whipDir === 'fwd') {
          x = hx - fc * u * 14 * (0.6 + k * 0.4);
          y = hy - u * 6 + Math.sin(u * 3) * 5 * k;
        } else if (this.whipDir === 'up') {
          x = hx + fc * u * 12;
          y = hy + u * 8;
        } else {
          x = hx - fc * u * 6;
          y = hy - u * 14;
        }
      } else {
        const t = clamp((this.whipT - 0.07) / 0.1, 0, 1);
        const ext = easeOut(t) * (R - 4);
        const droop = ph === 2 ? (this.whipT - 0.17) * 120 : 0;
        const wave = Math.sin(u * Math.PI * 2 - t * 8) * (1 - t) * 4;
        if (this.whipDir === 'fwd') {
          x = hx + fc * u * ext;
          y = hy + wave + u * u * droop - (1 - t) * u * 8;
        } else if (this.whipDir === 'up') {
          x = hx + wave + fc * u * u * droop * 0.5;
          y = hy - u * ext + u * u * droop;
        } else {
          x = hx + wave;
          y = hy + u * ext * 0.85;
        }
      }
      pts.push([x, y]);
    }
    for (let i = 1; i < pts.length; i++) {
      const col = i < 3 ? '#4a2a14' : i % 2 ? '#7a4a24' : '#5e3a1c';
      pxLine(g, pts[i - 1][0] - cam.x, pts[i - 1][1] - cam.y, pts[i][0] - cam.x, pts[i][1] - cam.y, col);
    }
    // handle
    fillR(g, hx - cam.x - 1, hy - cam.y - 1, 2, 2, '#2d1c13');
    if (ph === 1) {
      const [tx, ty] = pts[pts.length - 1];
      g.fillStyle = '#fff1b3';
      g.fillRect(Math.round(tx - cam.x), Math.round(ty - cam.y), 1, 1);
      if (this.whipT < 0.13) {
        g.fillStyle = '#fff8ea';
        g.fillRect(Math.round(tx - cam.x) - 1, Math.round(ty - cam.y), 3, 1);
        g.fillRect(Math.round(tx - cam.x), Math.round(ty - cam.y) - 1, 1, 3);
      }
    }
  }
}

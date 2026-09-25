// ---------------------------------------------------------------------------
// Enemies: roster data and a shared brain (aggro, spacing, attack tokens,
// guarding, ledge awareness, hopping corpses, fleeing archers).
// moves: [moveName, minRange, maxRange, weight]
// ---------------------------------------------------------------------------
const ENEMY_TYPES = {
  cultist: { cid: 'cultist', hp: 42, speed: 1.05, pref: 24, moves: [['chop', 0, 36, 2], ['slash', 0, 40, 2]], guard: 0.22, cd: [40, 90], aggro: 210, drops: 2 },
  bandit: { cid: 'bandit', hp: 34, speed: 1.2, pref: 24, moves: [['chop', 0, 36, 1], ['slash', 0, 40, 2]], guard: 0.08, cd: [45, 100], aggro: 190, drops: 1 },
  spearman: { cid: 'spearman', hp: 58, speed: 0.95, pref: 46, moves: [['thrust', 18, 66, 3], ['sweep', 0, 46, 1]], guard: 0.3, cd: [50, 100], aggro: 230, drops: 2 },
  assassin: { cid: 'assassin', hp: 38, speed: 2.1, pref: 32, moves: [['twin', 0, 36, 3], ['darts', 70, 230, 2], ['dive', 50, 150, 1]], guard: 0.25, cd: [30, 70], aggro: 250, drops: 2, w: 11 },
  brute: { cid: 'brute', hp: 140, speed: 0.72, pref: 30, moves: [['smash', 0, 44, 2], ['swing', 0, 46, 2]], guard: 0, cd: [60, 110], aggro: 210, poise: 34, drops: 4, w: 18, h: 52, kb: 0.45 },
  archer: { cid: 'archer', hp: 28, speed: 1, pref: 150, moves: [['shoot', 50, 300, 3], ['lob', 90, 260, 1]], guard: 0, cd: [70, 130], aggro: 290, ranged: true, drops: 1 },
  jiangshi: { cid: 'jiangshi', hp: 74, speed: 1.4, pref: 22, moves: [['lunge', 0, 42, 1]], guard: 0, cd: [50, 90], aggro: 220, hopper: true, poise: 16, drops: 2, bleeds: false },
};
MOVES.diveLand = { anim: 'land', len: 16 };
MOVES.dive.ev = { 0(e) { e.vy = -5.8; e.vx = e.facing * 3.4; e.grounded = false; SFX.play('jump'); } };

class Enemy extends Fighter {
  constructor(kind, x, y) {
    const T = ENEMY_TYPES[kind];
    super(T.cid, x, y);
    this.kind = kind; this.T = T; this.team = 2; this.hittable = true;
    this.hp = this.maxHp = T.hp; this.poiseMax = this.poise = T.poise || 0;
    this.w = T.w || 12; this.h = T.h || 40; this.kbMul = T.kb || 1; this.bleeds = T.bleeds !== false;
    this.cd = rndi(30, 80); this.aggro = false; this.hasToken = false; this.guardT = 0;
    this.guardHP = this.guardMax = 26; this.hopT = rndi(10, 40); this.patrolT = rndi(60, 200); this.home = x;
    this.slashCols = SLASH_COLS.enemy; this.facing = -1;
  }
  think() {
    const p = G.player, T = this.T;
    if (!p || p.dead || G.script || G.ult) { this.vx *= 0.8; this.setAnim('idle'); return; }
    const dx = p.x - this.x, adx = Math.abs(dx), dy = p.y - this.y;
    if (!this.aggro) {
      if ((adx < T.aggro && Math.abs(dy) < 110) || this.hp < this.maxHp) {
        this.aggro = true; FX.text(this.x, this.y - this.h - 16, '!', '#ff5a3a', { life: 30 }); SFX.play('alert');
      } else { this.patrol(); return; }
    }
    if (this.guardT > 0) {
      this.guardT--; this.vx *= 0.8; this.face(p.x);
      if (this.st !== 'guard') { this.st = 'guard'; this.setAnim('guard', true); }
      return;
    }
    this.face(p.x);
    if (this.cd > 0) this.cd--;
    if (T.guard && p.st === 'move' && adx < 60 && Math.random() < T.guard * 0.06 && this.grounded) { this.guardT = rndi(26, 50); return; }
    if (this.cd <= 0 && Math.abs(dy) < 48 && this.grounded) {
      const opts = T.moves.filter(m => adx >= m[1] && adx <= m[2]);
      if (opts.length && (Combat.tokens > 0 || T.ranged)) {
        let w = opts.reduce((s, m) => s + m[3], 0) * Math.random(), pickM = opts[0];
        for (const m of opts) { w -= m[3]; if (w <= 0) { pickM = m; break; } }
        if (!T.ranged) { Combat.tokens--; this.hasToken = true; }
        this.startMove(pickM[0]);
        this.cd = rndi(T.cd[0], T.cd[1]);
        return;
      }
    }
    let want = 0;
    if (T.ranged) { if (adx < T.pref - 50) want = -this.facing; else if (adx > T.pref + 60) want = this.facing; }
    else if (adx > T.pref + 6) want = this.facing;
    else if (adx < T.pref - 14) want = -this.facing * 0.6;
    if (want && this.ledgeAhead(Math.sign(want))) want = 0;
    // don't crowd other enemies
    for (const o of G.ents) if (o !== this && o.team === 2 && !o.dead && Math.abs(o.x - this.x) < 14 && Math.abs(o.y - this.y) < 20) this.vx += Math.sign(this.x - o.x || 1) * 0.12;
    if (T.hopper) return this.hop(want);
    this.vx = approach(this.vx, want * T.speed, 0.25);
    if (this.grounded && dy < -44 && adx < 70 && Math.random() < 0.02 && !T.ranged) { this.vy = -6.4; this.grounded = false; }
    if (this.grounded && dy > 40 && adx < 60 && !T.ranged && G.map.get(Math.floor(this.x / TS), Math.floor(this.y / TS)) === T_ONEWAY) { this.drop = 14; this.y += 1; this.grounded = false; }
    if (!this.grounded) this.setAnim(this.vy < 0 ? 'jump' : 'fall');
    else this.setAnim(Math.abs(this.vx) > 0.2 ? (Math.abs(this.vx) > 1.6 ? 'run' : 'walk') : 'idle');
  }
  hop(want) {
    if (this.grounded) {
      this.vx *= 0.6;
      if (--this.hopT <= 0 && want) { this.vy = -3.8; this.vx = Math.sign(want) * this.T.speed * 1.4; this.grounded = false; this.hopT = rndi(18, 30); this.setAnim('hop', true); }
      else if (this.anim !== 'hop' || this.animDone()) this.setAnim('idle');
    }
  }
  patrol() {
    this.setAnim(Math.abs(this.vx) > 0.2 ? 'walk' : 'idle');
    if (this.T.hopper) { this.vx *= 0.8; return; }
    if (--this.patrolT <= 0) { this.patrolT = rndi(90, 220); this.pdir = Math.random() < 0.4 ? 0 : (this.x < this.home ? 1 : -1); }
    const want = this.pdir || 0;
    if (want && !this.ledgeAhead(want) && Math.abs(this.x - this.home) < 70) { this.vx = want * 0.5; this.facing = want; } else this.vx *= 0.8;
  }
  ledgeAhead(dir) {
    const px = this.x + dir * (this.w / 2 + 6);
    if (G.map.solidPx(px, this.y - 8)) return true;
    const s = G.map.surfaceBelow(px, this.y - 6);
    if (this.bounds && (px < this.bounds[0] + 4 || px > this.bounds[1] - 4)) return true;
    if (G.map.hazard(px - 2, s - 6, px + 2, s + 2)) return true;
    // step off a ledge when the target is down there and the fall is survivable
    const p = G.player, below = p && p.y - this.y > 24 && Math.abs(s - p.y) < 20;
    return s - this.y > (below ? 120 : 22);
  }
  update() {
    if (this.st === 'guard' && this.guardT <= 0 && !this.blockT) this.st = 'free';
    if (this.blockT > 0) this.blockT--;
    const wasG = this.grounded;
    super.update();
    if (this.T.hopper && !wasG && this.grounded && this.st === 'free') { FX.dust(this.x, this.y, 3); SFX.play('thud'); }
    if (this.y > G.map.ph + 60 && !this.dead) { this.hp = 0; this.die(null, null, 1); this.remove = true; }
    if (!this.dead && G.map.hazard(this.x - 3, this.y - 8, this.x + 3, this.y - 1) === 'spike') { this.hp = 0; this.die(null, null, 1); }
  }
  onMoveEnd() { if (this.hasToken) { Combat.tokens++; this.hasToken = false; } }
  onHit(att, h, dir, dmg) {
    this.aggro = true; this.guardT = 0;
    if (this.st === 'guard') this.st = 'free';
    super.onHit(att, h, dir, dmg);
  }
  onDeath() {
    if (this.hasToken) { Combat.tokens++; this.hasToken = false; }
    G.stats.kills++;
    SFX.play('kill');
    const n = this.T.drops || 1;
    for (let i = 0; i < n; i++) G.ents.push(new Pickup('qi', this.x + rnd(-6, 6), this.y - 20));
    if (Math.random() < 0.12) G.ents.push(new Pickup('bun', this.x, this.y - 20));
    if (G.onEnemyDeath) G.onEnemyDeath(this);
  }
  afterDeath() {
    if (this.stT > 50) {
      this.alpha = Math.max(0, 1 - (this.stT - 50) / 30);
      if (this.stT % 3 === 0) FX.ink(this.x + rnd(-10, 10), this.y - 8, 2);
    }
    if (this.stT > 80) this.remove = true;
  }
}

function spawnEnemy(kind, x, y, o = {}) {
  const e = new Enemy(kind, x, y);
  if (o.aggro) e.aggro = true;
  if (o.facing) e.facing = o.facing;
  if (o.bounds) e.bounds = o.bounds;
  G.ents.push(e);
  return e;
}

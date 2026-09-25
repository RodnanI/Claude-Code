// ---------------------------------------------------------------------------
// Bosses. Each has a move set (frame data like MOVES) and a brain that picks
// moves by distance and phase. Bosses use poise: they only flinch when it
// breaks, so the player earns openings through parries and pressure.
// ---------------------------------------------------------------------------
const BOSS_MOVES = {
  // ---- Mo Ying ----------------------------------------------------------
  my_cross: {
    anim: 'cross', len: 41, step: [[16, 4], [19, 0.2]],
    fx: [{ f: 4, glint: 1, sfx: 'tell' }, { f: 16, slash: { a0: 200, a1: 45, r: 28, cy: -32, cx: 2, th: 8 }, sfx: 'swing2' }, { f: 17, slash: { a0: 210, a1: 30, r: 23, cy: -30, cx: 4, th: 6 } }],
    hit: [{ f0: 16, f1: 19, box: [0, -54, 40, 54], dmg: 12, kb: [3, -1.8], stun: 24, stop: 7, shake: 2 }],
  },
  my_dash: {
    anim: 'dashslash', len: 36, inv: [0, 10],
    fx: [{ f: 2, glint: 1, sfx: 'tell' }, { f: 11, streak: { cy: -30, len: 70 }, sfx: 'dash' }],
    ev: { 11(e) { e.vx = e.facing * 7.6; e.noSlow = 10; }, 21(e) { e.vx *= 0.3; } },
    hit: [{ f0: 11, f1: 21, box: [-8, -46, 40, 46], dmg: 10, kb: [3.4, -1.6], stun: 22, stop: 6, shake: 2 }],
  },
  my_spin: {
    anim: 'spin', len: 36, grav: 0.55,
    ev: { 0(e) { e.vy = -6.4; e.vx = e.facing * 2.6; e.grounded = false; SFX.play('spin'); } },
    fx: [{ f: 3, slash: { a0: 95, a1: -265, r: 24, cy: -26, th: 6, sweep: 20, life: 26 } }],
    hit: [{ f0: 3, f1: 28, box: [-18, -52, 50, 52], dmg: 5, kb: [2, -1.4], stun: 18, stop: 3, multi: 6 }],
  },
  my_throw: {
    anim: 'throw', len: 35, fx: [{ f: 3, glint: 1, sfx: 'tell' }],
    ev: { 13(e) { for (const a of [-0.28, -0.1, 0.1, 0.28]) spawnProj('knife', e, 10, -34, 5.2, a * 5.2); SFX.play('throw'); } },
  },
  my_vanish: {
    anim: 'vanish', len: 46, inv: [0, 46],
    ev: {
      1(e) { SFX.play('vanish'); FX.ink(e.x, e.y - 20, 18); },
      4(e) { e.visible = false; },
      22(e) { const p = G.player; const side = p.facing > 0 ? -1 : 1; e.x = clamp(p.x + side * 30, G.cam.lock[0] + 20, G.cam.lock[1] - 20); e.face(p.x); FX.ink(e.x, e.y - 20, 12); SFX.play('vanish'); e.visible = true; },
      45(e) { e.chain = 'my_cross'; },
    },
  },
  // ---- Silver Needle Liu ------------------------------------------------
  liu_slash: {
    anim: 'slash', len: 33, step: [[12, 3.4], [15, 0.2]],
    fx: [{ f: 3, glint: 1, sfx: 'tell' }, { f: 12, slash: { a0: -70, a1: 140, r: 26, cy: -30, cx: 4, th: 7, cols: SLASH_COLS.jade }, sfx: 'swing' }],
    hit: [{ f0: 12, f1: 15, box: [0, -48, 38, 44], dmg: 11, kb: [2.8, -1.6], stun: 22, stop: 6, shake: 1.5 }],
  },
  liu_throw: {
    anim: 'throw', len: 37, fx: [{ f: 4, glint: 1, sfx: 'tell' }],
    ev: { 15(e) { const n = e.phase > 1 ? 7 : 5; for (let i = 0; i < n; i++) { const a = -0.36 + (0.72 * i) / (n - 1); spawnProj('needle', e, 10, -36, Math.cos(a) * 5.4, Math.sin(a) * 5.4); } SFX.play('throw'); } },
  },
  liu_twirl: {
    anim: 'twirl', len: 30, step: [[0, 3.2], [20, 0.4]],
    fx: [{ f: 0, slash: { a0: 90, a1: 450, r: 22, cy: -28, th: 6, sweep: 18, life: 22, cols: SLASH_COLS.jade }, sfx: 'spin' }],
    hit: [{ f0: 1, f1: 21, box: [-16, -48, 44, 48], dmg: 5, kb: [2, -1], stun: 16, stop: 3, multi: 5 }],
  },
  liu_leap: {
    anim: 'jump', len: 70, grav: 0.8, land: 'diveLand',
    ev: {
      0(e) { const L = G.cam.lock; const tx = e.x < (L[0] + L[1]) / 2 ? L[1] - 40 : L[0] + 40; e.vx = (tx - e.x) / 48; e.vy = -7.6; e.grounded = false; SFX.play('djump'); },
      20(e) { e.setAnim('throw', true); e.at = 12; },
      23(e) { const p = G.player; for (const o of [-18, 0, 18]) { const dx = p.x + o - e.x, dy = p.y - 20 - (e.y - 34), d = Math.hypot(dx, dy); const pr = spawnProj('needle', e, 0, -34, 0, 0); pr.vx = (dx / d) * 5.4; pr.vy = (dy / d) * 5.4; } SFX.play('throw'); },
      30(e) { e.setAnim('fall', true); },
    },
  },
  liu_rain: {
    anim: 'jump', len: 150, grav: 0, inv: [0, 150],
    ev: {
      0(e) { e.vy = -9; e.vx = 0; e.grounded = false; SFX.play('djump'); },
      18(e) { e.vy = 0; e.visible = false; },
      ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [24 + i * 7, e => { const x = clamp(G.player.x + rnd(-70, 70), G.cam.lock[0] + 10, G.cam.lock[1] - 10); const p = new Proj('needle', x, G.cam.y - 6, 0, 0, e); p.D = { ...PROJ.needle, update(q) { if (q.t < 26) { q.vy = 0; if (q.t % 6 === 0) FX.part({ kind: 'glint', x: q.x, y: G.cam.y + 12, life: 8, cols: ['#ffffff'], layer: 1 }); } else q.vy = 6.5; }, ghost: true }; p.life = 120; G.ents.push(p); }])),
      130(e) { e.visible = true; e.x = clamp(G.player.x + (Math.random() < 0.5 ? -80 : 80), G.cam.lock[0] + 30, G.cam.lock[1] - 30); e.y = G.cam.y - 10; e.vy = 3; e.gravMul = 1; },
    },
  },
  // ---- Tie Fo -------------------------------------------------------------
  tf_palm: {
    anim: 'palm', len: 42, step: [[16, 4], [19, 0]],
    fx: [{ f: 4, glint: 1, sfx: 'tell' }, { f: 16, sfx: 'swing2' }],
    hit: [{ f0: 16, f1: 20, box: [4, -52, 38, 34], dmg: 14, kb: [4.6, -2.4], stun: 26, stop: 8, shake: 3, fx: 'blunt' }],
  },
  tf_dpalm: {
    anim: 'dpalm', len: 58, fx: [{ f: 6, glint: 1, sfx: 'qicharge' }],
    ev: { 26(e) { const p = spawnProj('palm', e, 26, -34, 3.4, 0); p.big = e.phase > 1; if (p.big) { p.w = 38; p.h = 44; } SFX.play('wave'); FX.kick(2); } },
  },
  tf_stomp: {
    anim: 'stomp', len: 57, armor: [0, 30],
    fx: [{ f: 6, glint: 1, sfx: 'tell' }, { f: 27, ring: 1, dust: 1, sfx: 'slam' }],
    ev: { 27(e) { for (const d of [1, -1]) { const p = new Proj('shock', e.x + d * 22, e.y - 8, d * 3.6, 0, e); G.ents.push(p); if (e.phase > 1) { const q = new Proj('shock', e.x + d * 22, e.y - 8, d * 2.2, 0, e); G.ents.push(q); } } FX.kick(5); } },
    hit: [{ f0: 27, f1: 29, box: [-30, -24, 60, 24], dmg: 12, kb: [3, -4], stun: 24, stop: 6, radial: true }],
  },
  tf_charge: {
    anim: 'charge', len: 80, armor: [0, 80],
    fx: [{ f: 0, glint: 1, sfx: 'tell' }],
    ev: { 14(e) { e.vx = e.facing * 4.8; SFX.play('dash'); } },
    hit: [{ f0: 14, f1: 78, box: [0, -48, 30, 46], dmg: 13, kb: [5, -3], stun: 28, stop: 8, shake: 3, fx: 'blunt' }],
  },
  tf_bell: {
    anim: 'pray', len: 70, inv: [0, 70],
    ev: { 10(e) { SFX.play('bell'); FX.ring(e.x, e.y - 30, { r0: 6, r1: 60, c: '#ffe08a', life: 30 }); }, 40(e) { e.golden(); } },
  },
  // ---- Xue Tianmo -------------------------------------------------------
  dm_combo: {
    anim: 'combo', len: 64, step: [[12, 3.2], [15, 0.3], [26, 3.2], [29, 0.3], [42, 6], [46, 0.3]],
    fx: [{ f: 3, glint: 1, sfx: 'tell' }, { f: 12, slash: { a0: 225, a1: 55, r: 29, cy: -33, cx: 1, th: 8 }, sfx: 'swing2' }, { f: 26, slash: { a0: 10, a1: 200, r: 29, cy: -32, cx: 3, th: 8 }, sfx: 'swing2' }, { f: 42, streak: { cy: -34, len: 60 }, sfx: 'thrust' }],
    hit: [
      { f0: 12, f1: 15, box: [0, -50, 38, 46], dmg: 11, kb: [2.4, -1], stun: 22, stop: 6 },
      { f0: 26, f1: 29, box: [0, -58, 36, 54], dmg: 11, kb: [2.4, -1.4], stun: 22, stop: 6 },
      { f0: 42, f1: 46, box: [6, -40, 50, 16], dmg: 14, kb: [4.4, -1.8], stun: 26, stop: 8, shake: 2, fx: 'pierce' },
    ],
  },
  dm_thrust: {
    anim: 'thrust', len: 41, step: [[16, 7.4], [22, 0.4]],
    fx: [{ f: 4, glint: 1, sfx: 'tell' }, { f: 16, streak: { cy: -34, len: 80 }, sfx: 'thrust' }],
    hit: [{ f0: 16, f1: 22, box: [0, -42, 52, 18], dmg: 15, kb: [4.6, -2], stun: 26, stop: 8, shake: 2, fx: 'pierce' }],
  },
  dm_wave: {
    anim: 'wave', len: 43, fx: [{ f: 4, glint: 1, sfx: 'qicharge' }, { f: 19, slash: { a0: -150, a1: 110, r: 32, cy: -33, cx: 2, th: 10 }, sfx: 'wave' }],
    ev: { 19(e) { spawnProj('bloodwave', e, 16, -32, 5.4, 0); if (e.phase > 1) { const p = spawnProj('bloodwave', e, 16, -60, 4.6, 0); p.life = 60; } } },
  },
  dm_palm: {
    anim: 'palm', len: 55, fx: [{ f: 6, glint: 1, sfx: 'qicharge' }],
    ev: { 24(e) { const p = spawnProj('palm', e, 28, -36, 2.8, 0); p.big = true; p.w = 40; p.h = 46; p.dmg = 20; p.cols = ['#ffd0c0', '#ff4a26', '#b8140c', '#5a0606']; SFX.play('wave'); FX.kick(3); } },
  },
  dm_blink: {
    anim: 'vanish', len: 30, inv: [0, 30],
    ev: {
      1(e) { SFX.play('vanish'); FX.burst(e.x, e.y - 24, 18, { kind: 'px', s0: 0.5, s1: 2.5, drag: 0.92, cols: ['#ff5a36', '#b8140c', '#3a0404'], l0: 16, l1: 30 }); e.visible = false; },
      16(e) { const p = G.player; const side = p.facing > 0 ? -1 : 1; e.x = clamp(p.x + side * 44, G.cam.lock[0] + 20, G.cam.lock[1] - 20); e.face(p.x); e.visible = true; FX.burst(e.x, e.y - 24, 14, { kind: 'px', s0: 0.5, s1: 2, drag: 0.9, cols: ['#ff5a36', '#b8140c'], l0: 12, l1: 24 }); SFX.play('vanish'); },
      29(e) { e.chain = 'dm_thrust'; },
    },
  },
  dm_rain: {
    anim: 'levitate', len: 130, grav: 0, armor: [0, 130],
    ev: {
      0(e) { e.vy = -2.4; e.vx = 0; e.grounded = false; SFX.play('whoosh'); },
      20(e) { e.vy = 0; },
      ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [26 + i * 8, e => { const x = clamp(G.player.x + rnd(-60, 60) + (i % 2 ? 0 : G.player.vx * 20), G.cam.lock[0] + 12, G.cam.lock[1] - 12); const p = new Proj('blade', x, G.cam.y + 18, 0, 0, e); G.ents.push(p); SFX.play('tell'); }])),
      112(e) { e.gravMul = 1; },
    },
  },
  dm_spikes: {
    anim: 'cast', len: 70, fx: [{ f: 2, sfx: 'qicharge' }],
    ev: { 8(e) { const p = G.player; for (const o of [-56, 0, 56]) { const x = clamp(p.x + o, G.cam.lock[0] + 10, G.cam.lock[1] - 10); const s = new Proj('spike', x, G.map.surfaceBelow(x, p.y - 30) - 22, 0, 0, e); G.ents.push(s); } } },
  },
};
MOVES.stagger = { anim: 'stagger', len: 40 };

const BOSS_DEFS = {
  moying: {
    cid: 'moying', name: 'MO YING', title: 'THE FACELESS BLADE', hp: 440, poise: 55, slash: SLASH_COLS.bone,
    brain(b, p, adx) {
      const o = [];
      if (adx < 52) o.push(['my_cross', 4]);
      if (adx > 56) o.push(['my_dash', 3], ['my_throw', 2]);
      if (adx < 130) o.push(['my_spin', 1]);
      if (b.phase > 1) o.push(['my_vanish', 3]);
      return o;
    },
    cd: [[36, 70], [18, 42]],
  },
  liu: {
    cid: 'liu', name: 'SILVER NEEDLE LIU', title: 'HUNTER OF THE BAMBOO SEA', hp: 470, poise: 50, slash: SLASH_COLS.jade,
    brain(b, p, adx) {
      const o = [];
      if (adx < 46) o.push(['liu_slash', 4], ['liu_twirl', 2]);
      if (adx > 50) o.push(['liu_throw', 3]);
      if (adx > 30) o.push(['liu_leap', 2]);
      if (b.phase > 1 && !b.rainCD) o.push(['liu_rain', 3]);
      return o;
    },
    cd: [[38, 70], [22, 46]],
  },
  tiefo: {
    cid: 'tiefo', name: 'TIE FO', title: 'THE IRON BUDDHA', hp: 620, poise: 90, w: 20, h: 54, slash: SLASH_COLS.enemy,
    brain(b, p, adx) {
      const o = [];
      if (adx < 50) o.push(['tf_palm', 4], ['tf_stomp', 2]);
      if (adx > 60) o.push(['tf_dpalm', 3], ['tf_charge', 2]);
      if (adx < 110) o.push(['tf_stomp', 1]);
      if (!b.gold && b.bellCD <= 0 && b.hp < b.maxHp * 0.85) o.push(['tf_bell', b.phase > 1 ? 5 : 3]);
      return o;
    },
    cd: [[44, 80], [28, 54]],
  },
  demon: {
    cid: 'demon', name: 'XUE TIANMO', title: 'THE CRIMSON HEAVEN DEMON', hp: 900, poise: 80, w: 13, h: 44, slash: SLASH_COLS.demon,
    brain(b, p, adx) {
      const o = [];
      if (adx < 50) o.push(['dm_combo', 4]);
      if (adx > 40 && adx < 140) o.push(['dm_thrust', 2]);
      if (adx > 70) o.push(['dm_wave', 3], ['dm_palm', 1]);
      o.push(['dm_blink', 1 + b.phase]);
      if (b.phase > 1) o.push(['dm_rain', b.rainCD > 0 ? 0 : 3], ['dm_spikes', 2]);
      return o;
    },
    cd: [[34, 60], [16, 36]],
  },
};

class Boss extends Fighter {
  constructor(id, x, y) {
    const D = BOSS_DEFS[id];
    super(D.cid, x, y);
    this.id = id; this.D = D; this.team = 2; this.hittable = true; this.boss = true;
    this.hp = this.maxHp = D.hp; this.poiseMax = this.poise = D.poise;
    this.w = D.w || 12; this.h = D.h || 42; this.kbMul = 0.3; this.phase = 1; this.cd = 50; this.active = false;
    this.moves = { ...MOVES, ...BOSS_MOVES }; this.slashCols = D.slash; this.facing = -1;
    this.bellCD = 300; this.rainCD = 0; this.gold = false; this.downTime = 30;
  }
  think() {
    const p = G.player;
    if (!this.active || !p || p.dead || G.script || G.ult) { this.vx *= 0.8; if (this.grounded) this.setAnim('idle'); return; }
    if (this.chain) { const c = this.chain; this.chain = null; this.startMove(c); return; }
    const dx = p.x - this.x, adx = Math.abs(dx);
    this.face(p.x);
    if (this.bellCD > 0) this.bellCD--;
    if (this.rainCD > 0) this.rainCD--;
    if (this.cd > 0) {
      this.cd--;
      const want = adx > 90 ? 1 : adx < 34 ? -0.6 : 0;
      const sp = this.id === 'tiefo' ? 0.8 : 1.2;
      this.vx = approach(this.vx, want * sp * this.facing, 0.2);
      if (this.grounded) this.setAnim(Math.abs(this.vx) > 0.2 ? 'walk' : 'idle');
      else this.setAnim('fall');
      return;
    }
    if (!this.grounded) return;
    const opts = this.D.brain(this, p, adx).filter(o => o[1] > 0);
    let w = opts.reduce((s, o) => s + o[1], 0) * Math.random(), pickM = opts[0];
    for (const o of opts) { w -= o[1]; if (w <= 0) { pickM = o; break; } }
    if (!pickM) return;
    if (pickM[0] === 'liu_rain' || pickM[0] === 'dm_rain') this.rainCD = 600;
    if (pickM[0] === 'tf_bell') this.bellCD = 900;
    this.startMove(pickM[0]);
    const cr = this.D.cd[this.phase - 1];
    this.cd = rndi(cr[0], cr[1]);
  }
  update() {
    if (this.st === 'move' && this.mname === 'tf_charge') {
      this.vx = this.mt >= 14 ? this.facing * 4.8 : 0;
      if (this.mt > 16 && (this.wallL || this.wallR || this.x < G.cam.lock[0] + 20 || this.x > G.cam.lock[1] - 20)) {
        this.cancelMove(); this.stagger(80); FX.kick(6); SFX.play('slam'); FX.dust(this.x + this.facing * 10, this.y - 20, 10);
        FX.text(this.x, this.y - 70, 'STUNNED', '#ffd060');
      }
    }
    if (this.gold) {
      if (--this.goldT <= 0) this.ungold();
      else if (G.time % 3 === 0) FX.part({ kind: 'px', x: this.x + rnd(-14, 14), y: this.y - rnd(0, 50), vx: 0, vy: -0.6, life: 20, cols: ['#fff2a8', '#f0ca5a', '#d4a232'], layer: 1 });
    }
    if (this.phase === 2 && this.id === 'demon' && G.time % 2 === 0) FX.part({ kind: 'px', x: this.x + rnd(-10, 10), y: this.y - rnd(0, 46), vx: rnd(-0.2, 0.2), vy: -rnd(0.4, 1.2), life: rndi(14, 26), cols: ['#ff8a5a', '#d4200f', '#6a0808'], layer: 0 });
    super.update();
    if (this.st === 'stagger' && G.time % 8 === 0) FX.part({ kind: 'glint', x: this.x + rnd(-8, 8), y: this.y - this.h - 6, life: 10, cols: ['#fff0a0'], layer: 1 });
  }
  golden() { this.gold = true; this.goldT = 420; this.setCostume('tiefoGold'); this.dmgTaken = 0.25; this.armorAll = true; this.goldHits = 0; FX.flash('#fff2a8', 6); }
  ungold() { this.gold = false; this.setCostume('tiefo'); this.dmgTaken = 1; this.armorAll = false; FX.ring(this.x, this.y - 30, { r0: 10, r1: 50, c: '#f0ca5a', life: 20 }); }
  onHit(att, h, dir, dmg) {
    if (this.gold) {
      this.flash = 6; this.flashColor = '#fff2a8';
      SFX.play('clang');
      if ((att.proj && att.kind === 'wave') || h.dmg >= 20) { this.goldHits += 2; } else this.goldHits++;
      if (this.goldHits >= 6) { this.ungold(); this.stagger(70); FX.text(this.x, this.y - 70, 'BELL SHATTERED', '#ffd060'); }
      return;
    }
    this.flashColor = null;
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) this.enterPhase2();
    super.onHit(att, h, dir, dmg);
    if (this.st === 'hurt') this.stT = Math.min(this.stT, 16);
    if (this.st === 'air') { this.stT = Math.min(this.stT, 14); this.juggle += 3; }
  }
  enterPhase2() {
    this.phase = 2;
    FX.flash('#ffffff', 8); FX.kick(4); SFX.play('gong');
    if (G.onBossPhase) G.onBossPhase(this);
  }
  die(att, h, dir) {
    this.hp = 0; this.hittable = false; this.cancelMove(); this.st = 'cut'; this.vx = dir * 2; this.visible = true; this.alpha = 1;
    this.setAnim('stagger', true);
    G.slow = 90; FX.flash('#ffffff', 16); FX.kick(6); SFX.play('ultHit');
    if (this.gold) this.ungold();
    G.bossDefeated(this);
  }
  preDraw(ctx, cam, sx, sy) {
    if (this.gold) { const r = 30 + Math.sin(G.time * 0.2) * 2; ringPx(ctx, sx, sy - 28, r, 'rgba(255,220,120,0.55)'); }
  }
}

// ---------------------------------------------------------------------------
// Move table (frame data). Frames are 60 Hz ticks from the start of a move.
//   len      total length              anim      animation to play
//   step     [[frame, vx]] forward velocity keys (relative to facing)
//   vy       [[frame, vy]] vertical velocity keys
//   hit      [{ f0, f1, box:[x,y,w,h], dmg, kb:[x,y], stun, stop, ... }]
//            flags: launch, knock, unblock, multi (rehit interval), poise
//   fx       [{ f, slash:{...} | streak:{...} | glint | sfx }]
//   chain    { from, to, next }  attack input inside the window continues
//   cancel   frame after which jump / dash may interrupt
//   grav     gravity multiplier while the move runs (air moves hang)
//   armor    [f0, f1] super armor window        inv [f0, f1] invulnerable
//   ev       { frame: fn(self) } custom events
// ---------------------------------------------------------------------------
const MOVES = {
  // ---- Lu Yan -----------------------------------------------------------
  atk1: {
    anim: 'atk1', len: 22, step: [[0, 1], [5, 2.8], [8, 0.3]],
    fx: [{ f: 5, slash: { a0: 225, a1: 55, r: 27, cy: -31, cx: 1, th: 8 }, sfx: 'swing' }],
    hit: [{ f0: 5, f1: 8, box: [0, -48, 36, 44], dmg: 8, kb: [2.4, -1], stun: 20, stop: 5, shake: 1.2 }],
    chain: { from: 8, to: 21, next: 'atk2' }, cancel: 11,
  },
  atk2: {
    anim: 'atk2', len: 22, step: [[0, 1.4], [3, 2.6], [6, 0.3]],
    fx: [{ f: 3, slash: { a0: 10, a1: 200, r: 27, cy: -30, cx: 3, th: 8 }, sfx: 'swing' }],
    hit: [{ f0: 3, f1: 7, box: [0, -56, 34, 52], dmg: 8, kb: [2.2, -1.6], stun: 20, stop: 5, shake: 1.2 }],
    chain: { from: 7, to: 21, next: 'atk3' }, cancel: 10,
  },
  atk3: {
    anim: 'atk3', len: 24, step: [[0, -0.6], [6, 4.6], [9, 0.4]],
    fx: [{ f: 6, streak: { cy: -32, len: 46 }, sfx: 'thrust' }],
    hit: [{ f0: 6, f1: 10, box: [6, -38, 46, 14], dmg: 10, kb: [3.2, -1], stun: 22, stop: 6, shake: 1.6, fx: 'pierce' }],
    chain: { from: 10, to: 23, next: 'atk4' }, cancel: 12,
  },
  atk4: {
    anim: 'atk4', len: 34, step: [[5, 1.8], [17, 0.6]], vy: [[5, -3.9]], grav: 0.8,
    fx: [{ f: 6, slash: { a0: 185, a1: -170, r: 26, cy: -26, cx: 0, th: 7, sweep: 10, life: 18 }, sfx: 'spin' }, { f: 17, ring: 1, sfx: 'heavy' }],
    hit: [
      { f0: 7, f1: 15, box: [-16, -58, 50, 58], dmg: 5, kb: [1, -2.2], stun: 22, stop: 3, multi: 5 },
      { f0: 17, f1: 19, box: [-6, -40, 48, 40], dmg: 14, kb: [5.2, -3.4], stun: 30, stop: 9, shake: 3.5, knock: true },
    ],
    cancel: 26,
  },
  upatk: {
    anim: 'upatk', len: 26, step: [[0, 0.6], [4, 1.2]], grav: 0.9,
    fx: [{ f: 4, slash: { a0: -35, a1: 190, r: 27, cy: -32, cx: 2, th: 8 }, sfx: 'swing' }],
    hit: [{ f0: 4, f1: 8, box: [-2, -66, 36, 64], dmg: 9, kb: [0.8, -6.8], stun: 34, stop: 6, shake: 1.6, launch: true }],
    cancel: 12,
    ev: { 4(e) { e.vy = e.jumpUp ? -6.9 : -2.4; e.grounded = false; } },
  },
  air1: {
    anim: 'air1', len: 18, grav: 0.18, air: true,
    fx: [{ f: 3, slash: { a0: 220, a1: 55, r: 26, cy: -30, cx: 1, th: 7 }, sfx: 'swing' }],
    hit: [{ f0: 3, f1: 6, box: [-2, -50, 36, 50], dmg: 7, kb: [1.6, -2.6], stun: 26, stop: 4, shake: 1 }],
    chain: { from: 6, to: 17, next: 'air2' }, cancel: 9,
  },
  air2: {
    anim: 'air2', len: 18, grav: 0.18, air: true,
    fx: [{ f: 3, slash: { a0: 15, a1: 200, r: 26, cy: -30, cx: 2, th: 7 }, sfx: 'swing' }],
    hit: [{ f0: 3, f1: 6, box: [-2, -56, 36, 56], dmg: 7, kb: [1.6, -2.8], stun: 26, stop: 4, shake: 1 }],
    chain: { from: 6, to: 17, next: 'air3' }, cancel: 9,
  },
  air3: {
    anim: 'air3', len: 22, grav: 0.3, air: true, step: [[0, 1.6]],
    fx: [{ f: 1, slash: { a0: 95, a1: -265, r: 25, cy: -26, cx: 0, th: 7, sweep: 11, life: 17 }, sfx: 'spin' }],
    hit: [{ f0: 2, f1: 14, box: [-14, -50, 46, 48], dmg: 6, kb: [4.6, -2.4], stun: 30, stop: 5, shake: 2, multi: 6, knock: true }],
    cancel: 16,
  },
  plunge: {
    anim: 'plunge', len: 999, grav: 0, air: true, land: 'plungeLand',
    ev: { 0(e) { e.vy = -2.2; e.vx *= 0.3; }, 7(e) { e.vy = 8.5; e.gravMul = 1; SFX.play('dive'); } },
    hit: [{ f0: 7, f1: 999, box: [-10, -30, 26, 34], dmg: 10, kb: [1.2, 3], stun: 20, stop: 4, multi: 12 }],
  },
  plungeLand: {
    anim: 'plungeLand', len: 20,
    fx: [{ f: 0, ring: 1, dust: 1, sfx: 'slam' }],
    hit: [{ f0: 0, f1: 3, box: [-40, -26, 80, 28], dmg: 12, kb: [3.6, -4.4], stun: 30, stop: 7, shake: 3.2, knock: true, radial: true }],
    cancel: 12,
  },
  dashatk: {
    anim: 'dashatk', len: 24, step: [[0, 6.2], [5, 2.4], [10, 0.2]],
    fx: [{ f: 3, streak: { cy: -32, len: 52 }, sfx: 'thrust' }],
    hit: [{ f0: 3, f1: 8, box: [0, -40, 44, 20], dmg: 11, kb: [4.4, -1.6], stun: 26, stop: 6, shake: 2, fx: 'pierce' }],
    cancel: 12,
  },
  qi: {
    anim: 'qi', len: 30, step: [[10, 1.4]], grav: 0.2,
    fx: [{ f: 1, charge: 1, sfx: 'qicharge' }, { f: 10, slash: { a0: -150, a1: 110, r: 30, cy: -32, cx: 2, th: 10, cols: SLASH_COLS.heroQi }, sfx: 'wave' }],
    ev: { 10(e) { spawnWave(e); } },
    cancel: 20,
  },
  counter: {
    anim: 'atk3', len: 24, step: [[0, 3], [6, 5.4], [9, 0.4]],
    fx: [{ f: 6, streak: { cy: -32, len: 60 }, sfx: 'thrust' }],
    hit: [{ f0: 5, f1: 10, box: [4, -42, 52, 22], dmg: 22, kb: [5.4, -2.2], stun: 40, stop: 10, shake: 3, knock: true, fx: 'pierce' }],
    cancel: 14,
  },

  // ---- saber cultists / bandits ------------------------------------------
  chop: {
    anim: 'atk', len: 46, step: [[22, 3], [25, 0.2]],
    fx: [{ f: 8, glint: 1, sfx: 'tell' }, { f: 22, slash: { a0: 225, a1: 45, r: 27, cy: -31, cx: 2, th: 7, cols: SLASH_COLS.enemy }, sfx: 'swing2' }],
    hit: [{ f0: 22, f1: 25, box: [2, -50, 34, 48], dmg: 12, kb: [3, -1.6], stun: 24, stop: 6, shake: 2 }],
  },
  slash: {
    anim: 'atk2', len: 36, step: [[14, 3.2], [17, 0.3]],
    fx: [{ f: 5, glint: 1, sfx: 'tell' }, { f: 14, slash: { a0: -95, a1: 128, r: 27, cy: -30, cx: 1, th: 7, cols: SLASH_COLS.enemy }, sfx: 'swing2' }],
    hit: [{ f0: 14, f1: 17, box: [0, -42, 36, 36], dmg: 10, kb: [2.6, -1.2], stun: 22, stop: 5, shake: 1.5 }],
  },
  // ---- spear ------------------------------------------------------------
  thrust: {
    anim: 'atk', len: 42, step: [[18, 3.6], [21, 0.2]],
    fx: [{ f: 6, glint: 1, sfx: 'tell' }, { f: 18, streak: { cy: -33, len: 58, cols: SLASH_COLS.enemy }, sfx: 'thrust' }],
    hit: [{ f0: 18, f1: 22, box: [8, -40, 54, 14], dmg: 13, kb: [3.4, -1], stun: 24, stop: 6, shake: 2, fx: 'pierce' }],
  },
  sweep: {
    anim: 'atk2', len: 46, step: [[20, 2], [24, 0.2]],
    fx: [{ f: 8, glint: 1, sfx: 'tell' }, { f: 20, slash: { a0: 200, a1: 35, r: 36, cy: -30, cx: 2, th: 7, cols: SLASH_COLS.enemy }, sfx: 'swing2' }],
    hit: [{ f0: 20, f1: 24, box: [0, -52, 48, 52], dmg: 12, kb: [3.2, -2.4], stun: 26, stop: 6, shake: 2 }],
  },
  // ---- assassin -----------------------------------------------------------
  twin: {
    anim: 'atk', len: 34, step: [[10, 4.2], [13, 0.6], [16, 3], [19, 0.3]],
    fx: [{ f: 3, glint: 1, sfx: 'tell' }, { f: 10, slash: { a0: -40, a1: 130, r: 22, cy: -26, cx: 2, th: 6, cols: SLASH_COLS.bone }, sfx: 'swing' }, { f: 16, slash: { a0: 140, a1: 20, r: 22, cy: -24, cx: 4, th: 6, cols: SLASH_COLS.bone }, sfx: 'swing' }],
    hit: [{ f0: 10, f1: 12, box: [0, -40, 30, 36], dmg: 7, kb: [1.4, -0.8], stun: 18, stop: 4 }, { f0: 16, f1: 18, box: [0, -40, 32, 36], dmg: 7, kb: [2.8, -1.4], stun: 22, stop: 5 }],
  },
  darts: {
    anim: 'atk2', len: 31,
    fx: [{ f: 4, glint: 1, sfx: 'tell' }],
    ev: { 13(e) { for (const a of [-0.12, 0, 0.12]) spawnProj('dart', e, 10, -34, 4.6, a * 4.6); SFX.play('throw'); } },
  },
  dive: {
    anim: 'dive', len: 999, grav: 1, air: true, land: 'land',
    hit: [{ f0: 0, f1: 999, box: [-6, -36, 30, 36], dmg: 10, kb: [2.4, -2], stun: 24, stop: 5 }],
  },
  // ---- brute ------------------------------------------------------------
  smash: {
    anim: 'atk', len: 60, armor: [0, 32], step: [[26, 2.4], [29, 0]],
    fx: [{ f: 8, glint: 1, sfx: 'tell' }, { f: 26, slash: { a0: 205, a1: 30, r: 30, cy: -34, cx: 2, th: 9, cols: SLASH_COLS.enemy }, sfx: 'swing2' }, { f: 29, ring: 1, dust: 1, sfx: 'slam' }],
    hit: [{ f0: 26, f1: 30, box: [0, -54, 40, 54], dmg: 18, kb: [4.4, -3.4], stun: 30, stop: 9, shake: 4, knock: true }],
    ev: { 29(e) { spawnProj('shock', e, 30, 0, 3.4, 0); } },
  },
  swing: {
    anim: 'atk2', len: 46, armor: [0, 24], step: [[18, 2.6], [22, 0]],
    fx: [{ f: 6, glint: 1, sfx: 'tell' }, { f: 18, slash: { a0: -100, a1: 135, r: 30, cy: -32, cx: 2, th: 9, cols: SLASH_COLS.enemy }, sfx: 'swing2' }],
    hit: [{ f0: 18, f1: 22, box: [0, -46, 42, 40], dmg: 15, kb: [4.6, -2], stun: 26, stop: 8, shake: 3 }],
  },
  // ---- archer -----------------------------------------------------------
  shoot: { anim: 'atk', len: 60, fx: [{ f: 12, glint: 1, sfx: 'draw' }], ev: { 38(e) { spawnProj('arrow', e, 12, -33, 5.4, -0.05); SFX.play('bow'); } } },
  lob: { anim: 'up', len: 60, fx: [{ f: 12, glint: 1, sfx: 'draw' }], ev: { 38(e) { const p = G.player; const dx = Math.abs(p.x - e.x); spawnProj('arrow', e, 10, -40, clamp(dx / 38, 1.8, 4.6), -4.2); SFX.play('bow'); } } },
  // ---- jiangshi ---------------------------------------------------------
  lunge: {
    anim: 'atk', len: 41, step: [[16, 3.4], [20, 0]],
    fx: [{ f: 4, glint: 1, sfx: 'tell' }],
    hit: [{ f0: 16, f1: 20, box: [4, -44, 26, 22], dmg: 12, kb: [2.6, -1.4], stun: 24, stop: 6, shake: 2, fx: 'blunt' }],
  },
};

// Qi wave from Lu Yan's sword
function spawnWave(e) {
  const p = spawnProj('wave', e, 14, -32, 6.4, 0);
  p.dmg = e.counter > 0 ? 34 : 22;
}

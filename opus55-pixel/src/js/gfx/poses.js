// ---------------------------------------------------------------------------
// Pose and animation library.
// Pose keys: x hip shift | t torso lean | a1,a2 front arm (abs, rel) |
// b1,b2 back arm | l1,l2 front leg | m1,m2 back leg | w,w2 weapon angles |
// wh weapon hand | h head variant | g ground lock | rot body spin | ff,fb flaps
// Durations are in 60 Hz ticks and line up with move timings in moves.js.
// ---------------------------------------------------------------------------
const P_ = (...o) => Object.assign({}, ...o);
const LEGS = {
  stance: { l1: 22, l2: -26, m1: -24, m2: -8 },
  stance2: { l1: 24, l2: -33, m1: -26, m2: -13 },
  lunge: { l1: 44, l2: -52, m1: -38, m2: -4 },
  deep: { l1: 58, l2: -64, m1: -46, m2: 0 },
  crouch: { l1: 48, l2: -92, m1: -20, m2: -66 },
  tuck: { l1: 70, l2: -112, m1: -8, m2: -40 },
  airy: { l1: 30, l2: -58, m1: -12, m2: -32 },
  stand: { l1: 6, l2: -5, m1: -5, m2: -3 },
};
const AIR = { g: 0 };

function runCycle(base, s = 1, dur = 4) {
  const k = [
    [36, -18, -34, -34, 44, 64], [22, -42, -12, -96, 30, 60], [2, -24, 28, -112, 0, 50], [-24, -24, 52, -72, -30, 40],
    [-34, -34, 36, -18, -44, 34], [-12, -96, 22, -42, -30, 40], [28, -112, 2, -24, 0, 50], [52, -72, -24, -24, 30, 60],
  ];
  return mkAnim(true, ...k.map(([l1, l2, m1, m2, b1, b2], i) => [P_(base, { l1: l1 * s, l2: l2 * s, m1: m1 * s, m2: m2 * s, b1: base.b1 !== undefined ? base.b1 : b1 * s, b2: base.b2 !== undefined ? base.b2 : b2, y: 0 }), dur, 'lin', 1]));
}
function walkCycle(base, dur = 7, armSwing = 1) {
  const k = [
    [22, -10, -20, -14], [12, -24, -8, -40], [0, -8, 14, -52], [-14, -6, 24, -20],
    [-20, -14, 22, -10], [-8, -40, 12, -24], [14, -52, 0, -8], [24, -20, -14, -6],
  ];
  return mkAnim(true, ...k.map(([l1, l2, m1, m2], i) => {
    const sw = Math.sin((i / 8) * TAU) * 16 * armSwing;
    return [P_(base, { l1, l2, m1, m2, b1: (base.b1 || 0) + sw, a1: (base.a1 || 0) - sw * (base.armLock ? 0 : 0.6) }), dur, 'lin', 1];
  }));
}
// reaction set shared by every humanoid; o overrides weapon posture
function reactions(o = {}) {
  const hurt = P_({ t: -18, x: -2, a1: -25, a2: 40, w: 230, b1: -35, b2: 45, l1: 22, l2: -14, m1: -22, m2: -22, h: 2 }, o);
  const lie = P_({ rot: -90, t: 0, a1: 172, a2: 4, w: 185, b1: 160, b2: 12, l1: 8, l2: -8, m1: -4, m2: 0, h: 2, ff: 0, fb: 0 }, o, { rot: -90, g: 1 });
  const fly = P_({ rot: -35, t: -10, a1: -70, a2: 30, b1: -90, b2: 20, l1: 40, l2: -30, m1: 18, m2: -40, h: 2, w: 230, g: 0 }, o, { g: 0 });
  return {
    hurt: mkAnim(false, [hurt, 5, 'out'], [P_(hurt, { t: -10, x: -1 }), 12]),
    hurt2: mkAnim(false, [P_(hurt, { t: 16, a1: 60, b1: 40, h: 2 }), 5, 'out'], [P_(hurt, { t: 8, a1: 40, x: -1 }), 12]),
    airhurt: mkAnim(false, [fly, 6], [P_(fly, { rot: -20 }), 30]),
    down: mkAnim(false, [P_(fly, { rot: -70, g: 1 }), 5, 'out'], [lie, 60]),
    lie: mkAnim(false, [lie, 60]),
    getup: mkAnim(false,
      [lie, 5],
      [P_(lie, { rot: -50, a1: 120, a2: 40, b1: 150, b2: 20, l1: 70, l2: -120, m1: 40, m2: -120, h: 0 }), 8],
      [P_(o, { rot: 0, t: 30, a1: 60, a2: 40, w: 100, l1: 60, l2: -110, m1: -20, m2: -100, h: 0, g: 1 }), 7],
      [P_(o, { t: 8, l1: 30, l2: -40, m1: -24, m2: -20, h: 0, g: 1 }), 4]),
    dead: mkAnim(false, [P_(fly, { rot: -70, g: 1 }), 6, 'out'], [P_(lie, { h: 1 }), 600]),
  };
}

const ANIMS = {};

// ===== Lu Yan (also used by Qin Shuang) ===================================
{
  const idle = { t: 5, a1: 38, a2: 44, w: 104, b1: 22, b2: 118, ...LEGS.stance };
  const idle2 = { ...idle, t: 6, a1: 40, a2: 42, w: 102, b2: 114, ...LEGS.stance2 };
  const run = { t: 16, a1: -58, a2: 30, w: -98, ff: -8, fb: -28 };
  const rise = { t: 8, a1: -40, a2: 30, w: -120, b1: 60, b2: 70, ...LEGS.tuck, ff: 25, fb: -12, ...AIR };
  const fall = { t: 2, a1: 108, a2: 22, w: 150, b1: 95, b2: 30, l1: 28, l2: -55, m1: -14, m2: -30, ff: 40, fb: -45, ...AIR };
  const tuck = { t: 20, a1: 100, a2: 70, w: 190, b1: 90, b2: 80, l1: 95, l2: -140, m1: 80, m2: -130, ff: 30, fb: 30, ...AIR };
  const land = { t: 16, a1: 55, a2: 30, w: 100, b1: 40, b2: 60, ...LEGS.crouch };
  const dash = { t: 32, a1: -72, a2: 12, w: -96, b1: 70, b2: 16, l1: 55, l2: -70, m1: -48, m2: -24, ff: -40, fb: -60 };
  const guard = { t: 2, a1: 58, a2: 76, w: 178, b1: 40, b2: 100, l1: 30, l2: -44, m1: -30, m2: -16 };
  const back = { b1: -30, b2: 40 };

  // attacks
  const a1w = { t: -4, a1: 165, a2: 25, w: 215, b1: 30, b2: 80, ...LEGS.stance };
  const a1s = { t: 18, a1: 85, a2: 5, w: 75, x: 3, ...LEGS.lunge, ...back };
  const a2w = { t: 16, a1: 45, a2: -25, w: 15, x: 3, ...LEGS.lunge, b1: -20, b2: 40 };
  const a2s = { t: -8, a1: 160, a2: 15, w: 170, x: 5, l1: 28, l2: -24, m1: -38, m2: -20, b1: -40, b2: 30, h: 3 };
  const a3w = { t: -8, a1: -35, a2: 115, w: 88, x: -2, l1: 20, l2: -40, m1: -30, m2: -10, b1: 60, b2: 60 };
  const a3s = { t: 24, a1: 90, a2: -2, w: 90, x: 9, ...LEGS.deep, b1: -60, b2: 10, h: 3 };
  const spin = { t: 10, a1: 150, a2: 0, w: 170, l1: 60, l2: -100, m1: 10, m2: -60, ...AIR };
  const a4i = { t: 34, a1: 70, a2: 0, w: 40, x: 4, l1: 60, l2: -80, m1: -40, m2: -40, h: 3 };
  const upw = { t: 18, a1: 30, a2: -20, w: -30, ...LEGS.crouch };
  const ups = { t: -6, a1: 172, a2: 5, w: 182, l1: 70, l2: -100, m1: -10, m2: -20, h: 3, ...AIR };
  const airw = { t: -2, a1: 160, a2: 20, w: 210, l1: 50, l2: -80, m1: -10, m2: -40, ...AIR };
  const airs = { t: 16, a1: 80, a2: 5, w: 70, l1: 40, l2: -60, m1: -20, m2: -40, ...AIR, h: 3 };
  const air2w = { t: 12, a1: 40, a2: -30, w: 20, l1: 45, l2: -70, m1: -15, m2: -40, ...AIR };
  const air2s = { t: -8, a1: 160, a2: 10, w: 172, l1: 30, l2: -50, m1: -25, m2: -30, ...AIR, h: 3 };
  const hspin = { t: 12, a1: 95, a2: 0, w: 92, b1: -80, b2: 10, ...LEGS.tuck, ...AIR };
  const plr = { t: -10, a1: 170, a2: 10, w: 180, l1: 80, l2: -120, m1: 60, m2: -110, ...AIR };
  const pld = { t: 10, a1: 30, a2: -10, w: 2, b1: 60, b2: 60, l1: 70, l2: -110, m1: 20, m2: -80, ff: 60, fb: -60, ...AIR };
  const pli = { t: 30, a1: 40, a2: -10, w: 10, l1: 60, l2: -100, m1: -30, m2: -70 };
  const qiw = { t: -12, a1: -120, a2: 20, w: -140, b1: 80, b2: 40, l1: 30, l2: -40, m1: -30, m2: -10 };
  const qis = { t: 24, a1: 95, a2: 0, w: 95, x: 5, ...LEGS.deep, b1: -70, b2: 10, h: 3 };
  const salute = { t: 6, a1: 32, a2: 112, b1: 36, b2: 106, wh: 'b', w: 200, ...LEGS.stand, hy: 1 };

  ANIMS.hero = {
    idle: mkAnim(true, [idle, 36], [idle2, 36], [idle, 36], [idle2, 30], [P_(idle2, { h: 1 }), 6, 'step']),
    run: runCycle(run),
    walk: walkCycle({ t: 4, a1: 12, a2: 14, w: -20, b1: 0, b2: 20 }),
    jump: mkAnim(false, [rise, 10], [P_(rise, { t: 4, l1: 50, l2: -90, a1: -10, w: -150 }), 14]),
    fall: mkAnim(true, [fall, 12], [P_(fall, { a1: 118, b1: 104, ff: 50, fb: -55 }), 12]),
    djump: mkAnim(false, [P_(tuck, { rot: 0 }), 3, 'lin', 2], [P_(tuck, { rot: 90 }), 3, 'lin', 2], [P_(tuck, { rot: 180 }), 3, 'lin', 2], [P_(tuck, { rot: 270 }), 3, 'lin', 2], [P_(tuck, { rot: 360 }), 4], [fall, 1]),
    land: mkAnim(false, [land, 7, 'out'], [idle, 5]),
    dash: mkAnim(false, [P_(dash, { t: 24 }), 3], [dash, 30]),
    guard: mkAnim(false, [guard, 1]),
    parry: mkAnim(false, [P_(guard, { a1: 70, w: 160 }), 2], [P_(guard, { a1: 84, a2: 40, w: 118, t: 12, h: 3 }), 8], [guard, 10]),
    blockhit: mkAnim(false, [P_(guard, { t: -6, x: -2 }), 4], [guard, 8]),
    atk1: mkAnim(false, [a1w, 5, 'out'], [a1s, 2, 'lin', 2], [P_(a1s, { t: 20, a1: 70, a2: 0, w: 50 }), 5], [idle, 10]),
    atk2: mkAnim(false, [a2w, 3, 'out'], [a2s, 2, 'lin', 2], [P_(a2s, { t: -10, a1: 170, a2: 20, w: 195 }), 6], [idle, 11]),
    atk3: mkAnim(false, [a3w, 6, 'out'], [a3s, 2, 'lin'], [P_(a3s, { x: 10 }), 6], [idle, 10]),
    atk4: mkAnim(false,
      [{ t: 20, a1: -40, a2: 60, w: -80, ...LEGS.crouch }, 5],
      [P_(spin, { rot: 0 }), 3, 'lin', 2], [P_(spin, { rot: 90 }), 3, 'lin', 2], [P_(spin, { rot: 180 }), 3, 'lin', 2], [P_(spin, { rot: 270 }), 3, 'lin', 2],
      [a4i, 4], [P_(a4i, { t: 30 }), 6], [idle, 7]),
    upatk: mkAnim(false, [upw, 4, 'out'], [ups, 3, 'lin'], [P_(ups, { a1: 178, w: 188 }), 8], [fall, 11]),
    air1: mkAnim(false, [airw, 3, 'out'], [airs, 2, 'lin', 2], [P_(airs, { w: 50, a1: 70 }), 5], [fall, 8]),
    air2: mkAnim(false, [air2w, 3, 'out'], [air2s, 2, 'lin', 2], [P_(air2s, { w: 190, a1: 170 }), 5], [fall, 8]),
    air3: mkAnim(false, [P_(hspin, { rot: 0 }), 3, 'lin', 2], [P_(hspin, { rot: 90 }), 3, 'lin', 2], [P_(hspin, { rot: 180 }), 3, 'lin', 2], [P_(hspin, { rot: 270 }), 3, 'lin', 2], [P_(hspin, { rot: 360 }), 4], [fall, 6]),
    plunge: mkAnim(false, [plr, 7, 'out'], [pld, 600]),
    plungeLand: mkAnim(false, [pli, 8], [P_(pli, { t: 22 }), 6], [idle, 6]),
    dashatk: mkAnim(false, [P_(a3w, { t: 20, x: 0 }), 3], [a3s, 2], [P_(a3s, { x: 12 }), 9], [idle, 10]),
    qi: mkAnim(false, [qiw, 10, 'out'], [qis, 2, 'lin'], [P_(qis, { w: 70, a1: 80 }), 8], [idle, 10]),
    ult: mkAnim(false, [P_(qiw, { w: 180, a1: 175, a2: 0, t: -4 }), 30], [qis, 600]),
    salute: mkAnim(true, [salute, 40], [P_(salute, { t: 8 }), 40]),
    bow: mkAnim(false, [salute, 10], [P_(salute, { t: 30, hy: 2 }), 30], [salute, 20]),
    kneel: mkAnim(true, [{ t: 24, a1: 30, a2: -20, w: 4, b1: 10, b2: 10, l1: 84, l2: -84, m1: 10, m2: -100, h: 2 }, 40], [{ t: 28, a1: 28, a2: -18, w: 4, b1: 12, b2: 10, l1: 84, l2: -84, m1: 10, m2: -100, h: 2 }, 40]),
    wake: mkAnim(false, [{ t: 30, a1: 30, a2: 40, w: 4, b1: 10, b2: 30, l1: 84, l2: -84, m1: 10, m2: -100, h: 1 }, 50], [{ t: 10, a1: 30, a2: 40, w: 60, l1: 60, l2: -90, m1: 10, m2: -100 }, 12], [idle, 12]),
    look: mkAnim(true, [P_(idle, { t: -2, hy: 0, a1: 20, a2: 20, w: 20, b1: 10, b2: 10, ...LEGS.stand }), 60]),
    ...reactions({ w: 230 }),
  };
}

// ===== NPC set (Master Bai, Elder Gu, villagers) ============================
{
  const stand = { t: 2, a1: 20, a2: 70, w: 120, b1: -20, b2: 60, ...LEGS.stand };
  ANIMS.npc = {
    idle: mkAnim(true, [stand, 50], [P_(stand, { t: 3, a2: 74 }), 50]),
    walk: walkCycle({ t: 3, a1: 20, a2: 70, w: 120, b1: -10, b2: 30, armLock: 1 }, 8, 0.4),
    run: runCycle({ t: 14, a1: -40, a2: 60, w: 100 }),
    talk: mkAnim(true, [P_(stand, { a1: 45, a2: 60, w: 100 }), 20], [P_(stand, { a1: 55, a2: 40, w: 90 }), 20]),
    point: mkAnim(false, [P_(stand, { a1: 100, a2: 0, w: 95 }), 200]),
    beg: mkAnim(true, [{ t: 30, a1: 70, a2: 60, b1: 70, b2: 60, ...LEGS.crouch, h: 2 }, 20], [{ t: 34, a1: 75, a2: 55, b1: 75, b2: 55, ...LEGS.crouch, h: 2 }, 20]),
    cower: mkAnim(true, [{ t: 30, a1: 140, a2: 60, b1: 150, b2: 50, ...LEGS.crouch, h: 1 }, 30], [{ t: 32, a1: 140, a2: 62, b1: 150, b2: 52, ...LEGS.crouch, h: 1 }, 30]),
    salute: mkAnim(true, [{ t: 6, a1: 32, a2: 112, b1: 36, b2: 106, w: 160, ...LEGS.stand }, 60]),
    ...reactions({ w: 150 }),
  };
}

// ===== Saber cultists and bandits ==========================================
{
  const idle = { t: 8, a1: 60, a2: 50, w: 140, b1: 20, b2: 60, ...LEGS.stance };
  const cw = { t: -10, a1: 175, a2: 30, w: 220, b1: 150, b2: 40, l1: 20, l2: -30, m1: -30, m2: -10, h: 3 };
  const cs = { t: 26, a1: 80, a2: 0, w: 60, x: 4, ...LEGS.lunge, b1: -20, b2: 30 };
  const hw = { t: -6, a1: -70, a2: 50, w: -95, b1: 60, b2: 40, ...LEGS.stance2 };
  const hs = { t: 20, a1: 100, a2: 0, w: 108, x: 4, ...LEGS.lunge, b1: -40, b2: 20, h: 3 };
  ANIMS.saber = {
    idle: mkAnim(true, [idle, 30], [P_(idle, { ...LEGS.stance2, w: 136, a1: 62 }), 30]),
    walk: walkCycle({ t: 8, a1: 55, a2: 50, w: 135, b1: 10, b2: 40, armLock: 1 }, 7, 0.7),
    run: runCycle({ t: 18, a1: -40, a2: 40, w: -60 }),
    atk: mkAnim(false, [P_(idle, { t: 2 }), 4], [cw, 18, 'out'], [cs, 3, 'lin', 2], [P_(cs, { w: 40, a1: 66 }), 8], [idle, 13]),
    atk2: mkAnim(false, [hw, 14, 'out'], [hs, 3, 'lin', 2], [P_(hs, { w: 128 }), 6], [idle, 13]),
    guard: mkAnim(false, [{ t: 0, a1: 70, a2: 70, w: 175, b1: 60, b2: 90, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: -8, x: -2, a1: 70, a2: 70, w: 172, b1: 60, b2: 90, ...LEGS.stance2 }, 4], [{ t: 0, a1: 70, a2: 70, w: 175, b1: 60, b2: 90, ...LEGS.stance2 }, 10]),
    jump: mkAnim(false, [{ t: 6, a1: 120, a2: 30, w: 200, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ t: 2, a1: 100, a2: 30, w: 150, b1: 80, b2: 30, ...LEGS.airy, ...AIR }, 20]),
    land: mkAnim(false, [{ t: 16, a1: 55, a2: 30, w: 100, ...LEGS.crouch }, 8], [idle, 4]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 150, a2: 40, w: 250, b1: -30, b2: 40, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 50]),
    ...reactions({ w: 230 }),
  };
}

// ===== Spear ===============================================================
{
  const idle = { t: 6, a1: 58, a2: 34, w: 86, b1: 36, b2: 52, ...LEGS.stance };
  const tw = { t: -8, a1: -12, a2: 100, w: 86, x: -3, b1: -30, b2: 90, ...LEGS.stance2, h: 0 };
  const ts = { t: 22, a1: 88, a2: 0, w: 88, x: 8, b1: 70, b2: 10, ...LEGS.deep, h: 3 };
  const sw = { t: -10, a1: 150, a2: 30, w: 200, b1: 120, b2: 40, ...LEGS.stance2 };
  const ss = { t: 26, a1: 60, a2: 0, w: 55, x: 4, b1: 40, b2: 10, ...LEGS.lunge, h: 3 };
  ANIMS.spear = {
    idle: mkAnim(true, [idle, 32], [P_(idle, { ...LEGS.stance2, w: 84 }), 32]),
    walk: walkCycle({ t: 6, a1: 58, a2: 34, w: 86, b1: 36, b2: 52, armLock: 1 }, 7, 0),
    run: runCycle({ t: 18, a1: 40, a2: 40, w: 70, b1: 30, b2: 50 }),
    atk: mkAnim(false, [tw, 18, 'out'], [ts, 3, 'lin'], [P_(ts, { x: 9 }), 8], [idle, 13]),
    atk2: mkAnim(false, [sw, 20, 'out'], [ss, 4, 'lin', 2], [P_(ss, { w: 40 }), 8], [idle, 14]),
    guard: mkAnim(false, [{ t: 0, a1: 80, a2: 60, w: 160, b1: 70, b2: 60, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: -8, x: -2, a1: 80, a2: 60, w: 158, b1: 70, b2: 60, ...LEGS.stance2 }, 12]),
    jump: mkAnim(false, [{ t: 6, a1: 70, a2: 20, w: 80, b1: 50, b2: 40, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ t: 2, a1: 70, a2: 20, w: 80, b1: 50, b2: 40, ...LEGS.airy, ...AIR }, 20]),
    land: mkAnim(false, [{ t: 16, a1: 58, a2: 34, w: 86, b1: 36, b2: 52, ...LEGS.crouch }, 8], [idle, 4]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 150, a2: 30, w: 220, b1: 130, b2: 30, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 50]),
    ...reactions({ w: 220 }),
  };
}

// ===== Twin daggers (assassin) =============================================
{
  const idle = { t: 24, a1: 70, a2: 50, w: 110, b1: 30, b2: 100, w2: 60, ...LEGS.crouch };
  const s1w = { t: 10, a1: -40, a2: 80, w: -60, b1: 80, b2: 60, w2: 100, ...LEGS.stance2 };
  const s1s = { t: 30, a1: 100, a2: 10, w: 110, x: 6, b1: -40, b2: 60, w2: 40, ...LEGS.deep, h: 3 };
  const s2s = { t: 20, a1: 30, a2: 10, w: 40, x: 8, b1: 110, b2: 10, w2: 100, ...LEGS.deep };
  const thr = { t: 10, a1: 120, a2: -10, w: 120, b1: 30, b2: 90, w2: 80, ...LEGS.stance2 };
  ANIMS.dual = {
    idle: mkAnim(true, [idle, 20], [P_(idle, { t: 26, ...LEGS.crouch, l2: -96 }), 20]),
    walk: runCycle({ t: 28, a1: -50, a2: 30, w: -80, b1: -40, b2: 30, w2: -70 }, 0.8, 5),
    run: runCycle({ t: 30, a1: -60, a2: 20, w: -90, b1: -50, b2: 20, w2: -80 }),
    atk: mkAnim(false, [s1w, 10, 'out'], [s1s, 2, 'lin'], [P_(s1s, { w: 130 }), 4], [s2s, 3, 'lin'], [P_(s2s, { w: 30 }), 5], [idle, 10]),
    atk2: mkAnim(false, [P_(thr, { a1: -60, a2: 60, w: -40 }), 12, 'out'], [thr, 3, 'lin'], [P_(thr, { a1: 100 }), 6], [idle, 10]),
    jump: mkAnim(false, [{ t: 20, a1: 100, a2: 40, w: 150, b1: 90, b2: 40, w2: 140, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ t: 10, a1: 110, a2: 30, w: 150, b1: 90, b2: 30, w2: 140, ...LEGS.airy, ...AIR }, 20]),
    dive: mkAnim(false, [{ t: 40, a1: 110, a2: 0, w: 110, b1: 80, b2: 0, w2: 100, ...LEGS.tuck, ...AIR }, 600]),
    land: mkAnim(false, [{ ...idle, t: 30, ...LEGS.crouch }, 8], [idle, 4]),
    vanish: mkAnim(false, [P_(idle, { t: 30 }), 30]),
    guard: mkAnim(false, [{ t: 10, a1: 90, a2: 80, w: 170, b1: 70, b2: 90, w2: 170, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: 0, x: -2, a1: 90, a2: 80, w: 168, b1: 70, b2: 90, w2: 168, ...LEGS.stance2 }, 12]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 150, a2: 40, w: 250, b1: -30, b2: 40, w2: 200, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 50]),
    ...reactions({ w: 230, w2: 200 }),
  };
}

// ===== Brute ===============================================================
{
  const idle = { t: 10, a1: 40, a2: 55, w: 128, b1: 30, b2: 50, ...LEGS.stance };
  const smw = { t: -16, a1: 178, a2: 10, w: 200, b1: 160, b2: 20, ...LEGS.stance2, h: 3 };
  const sms = { t: 34, a1: 70, a2: 0, w: 40, x: 5, b1: 60, b2: 10, ...LEGS.deep, h: 3 };
  const swg = { t: -6, a1: -80, a2: 40, w: -100, b1: 50, b2: 40, ...LEGS.stance2 };
  const sws = { t: 18, a1: 100, a2: 0, w: 110, x: 4, b1: -30, b2: 30, ...LEGS.lunge, h: 3 };
  ANIMS.brute = {
    idle: mkAnim(true, [idle, 40], [P_(idle, { ...LEGS.stance2, a2: 64 }), 40]),
    walk: walkCycle({ t: 12, a1: 40, a2: 55, w: 128, b1: 20, b2: 30, armLock: 1 }, 9, 0.6),
    run: runCycle({ t: 20, a1: 30, a2: 60, w: 120, b1: -20, b2: 40 }, 0.8, 5),
    atk: mkAnim(false, [smw, 26, 'out'], [sms, 4, 'lin', 2], [P_(sms, { w: 30 }), 14], [idle, 16]),
    atk2: mkAnim(false, [swg, 18, 'out'], [sws, 4, 'lin', 2], [P_(sws, { w: 130 }), 10], [idle, 14]),
    jump: mkAnim(false, [{ ...idle, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ ...idle, ...LEGS.airy, ...AIR }, 20]),
    land: mkAnim(false, [{ ...idle, ...LEGS.crouch }, 10], [idle, 4]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 170, a2: 30, w: 250, b1: -30, b2: 40, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 50]),
    ...reactions({ w: 250 }),
  };
}

// ===== Archer ==============================================================
{
  const idle = { t: 4, a1: 70, a2: 20, w: 90, b1: 50, b2: 40, ...LEGS.stance };
  const draw = { t: -2, a1: 88, a2: 0, w: 90, b1: 70, b2: 150, ...LEGS.stance2 };
  ANIMS.archer = {
    idle: mkAnim(true, [idle, 36], [P_(idle, { ...LEGS.stance2 }), 36]),
    walk: walkCycle({ t: 4, a1: 70, a2: 20, w: 90, b1: 20, b2: 40, armLock: 1 }, 7, 0.6),
    run: runCycle({ t: 16, a1: 60, a2: 20, w: 90 }),
    atk: mkAnim(false, [P_(idle, { b1: 80, b2: 60 }), 10], [draw, 28, 'out'], [P_(draw, { b1: 40, b2: 40, h: 3 }), 4, 'lin'], [idle, 18]),
    up: mkAnim(false, [P_(idle, { b1: 80, b2: 60, a1: 130, w: 130 }), 10], [P_(draw, { a1: 130, w: 130, b1: 120, b2: 150 }), 28, 'out'], [P_(draw, { a1: 130, w: 130, b1: 80, b2: 40, h: 3 }), 4, 'lin'], [idle, 18]),
    jump: mkAnim(false, [{ ...idle, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ ...idle, ...LEGS.airy, ...AIR }, 20]),
    land: mkAnim(false, [{ ...idle, ...LEGS.crouch }, 8], [idle, 4]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 120, a2: 30, w: 150, b1: -30, b2: 40, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 50]),
    ...reactions({ w: 150 }),
  };
}

// ===== Jiangshi (hopping corpse) ===========================================
{
  const stiff = { t: 0, a1: 90, a2: 0, b1: 88, b2: 0, l1: 3, l2: -3, m1: -3, m2: -1 };
  const squat = { ...stiff, t: 6, l1: 22, l2: -42, m1: 18, m2: -40 };
  const air = { ...stiff, t: -4, l1: 0, l2: 0, m1: 0, m2: 0, lf: 105, mf: 105, ...AIR };
  ANIMS.hopper = {
    idle: mkAnim(true, [stiff, 40], [P_(stiff, { t: 2, a1: 92, b1: 90 }), 40]),
    hop: mkAnim(false, [squat, 7, 'out'], [air, 26], [squat, 7]),
    walk: mkAnim(true, [squat, 7], [air, 20], [squat, 7]),
    run: mkAnim(true, [squat, 5], [air, 16], [squat, 5]),
    jump: mkAnim(false, [air, 20]),
    fall: mkAnim(true, [air, 20]),
    land: mkAnim(false, [squat, 8], [stiff, 4]),
    atk: mkAnim(false, [P_(stiff, { t: -14, a1: 130, b1: 128 }), 16, 'out'], [P_(stiff, { t: 26, a1: 80, b1: 76, x: 6, l1: 30, l2: -20, m1: -30, m2: 0, h: 2 }), 3, 'lin'], [P_(stiff, { t: 22, x: 6 }), 10], [stiff, 12]),
    stagger: mkAnim(false, [P_(stiff, { t: -20, x: -2 }), 50]),
    ...reactions({ a1: 90, a2: 0, b1: 88, b2: 0 }),
  };
}

// ===== Mo Ying (twin hook swords) ==========================================
{
  const idle = { t: 20, a1: 60, a2: 60, w: 120, b1: 20, b2: 90, w2: 80, ...LEGS.crouch, l2: -80, m2: -50 };
  const x1 = { t: 8, a1: 170, a2: 10, w: 190, b1: 150, b2: 20, w2: 200, ...LEGS.stance2 };
  const x2 = { t: 34, a1: 70, a2: 0, w: 60, b1: 60, b2: 0, w2: 40, x: 8, ...LEGS.deep, h: 2 };
  const dash = { t: 40, a1: -80, a2: 10, w: -100, b1: -70, b2: 10, w2: -90, ...LEGS.lunge, ff: -50, fb: -70 };
  const dashs = { t: 30, a1: 100, a2: 0, w: 100, b1: 80, b2: 20, w2: 80, x: 6, ...LEGS.deep };
  const spin = { t: 10, a1: 100, a2: 0, w: 95, b1: -80, b2: 0, w2: -85, ...LEGS.tuck, ...AIR };
  ANIMS.moying = {
    idle: mkAnim(true, [idle, 28], [P_(idle, { t: 22, l2: -86 }), 28]),
    walk: walkCycle({ t: 16, a1: 60, a2: 60, w: 120, b1: 20, b2: 90, w2: 80, armLock: 1 }, 7, 0.3),
    run: runCycle({ t: 30, a1: -70, a2: 20, w: -100, b1: -60, b2: 20, w2: -90 }),
    cross: mkAnim(false, [x1, 16, 'out'], [x2, 3, 'lin', 2], [P_(x2, { w: 40, w2: 20 }), 10], [idle, 12]),
    dashslash: mkAnim(false, [dash, 12], [dashs, 3, 'lin'], [P_(dashs, { x: 8 }), 10], [idle, 10]),
    spin: mkAnim(false, [P_(spin, { rot: 0 }), 3, 'lin', 2], [P_(spin, { rot: 90 }), 3, 'lin', 2], [P_(spin, { rot: 180 }), 3, 'lin', 2], [P_(spin, { rot: 270 }), 3, 'lin', 2], [P_(spin, { rot: 360 }), 3, 'lin', 2], [P_(spin, { rot: 450 }), 3, 'lin', 2], [P_(spin, { rot: 540 }), 3, 'lin', 2], [P_(spin, { rot: 630 }), 3, 'lin', 2], [P_(spin, { rot: 720 }), 4], [idle, 8]),
    throw: mkAnim(false, [P_(idle, { a1: -60, a2: 60, w: -40 }), 12, 'out'], [{ t: 16, a1: 110, a2: -10, w: 120, b1: 30, b2: 90, w2: 80, ...LEGS.stance2 }, 3, 'lin'], [{ t: 16, a1: 100, a2: -10, w: 110, b1: 30, b2: 90, w2: 80, ...LEGS.stance2 }, 10], [idle, 10]),
    vanish: mkAnim(false, [P_(idle, { t: 30, h: 2 }), 60]),
    jump: mkAnim(false, [{ ...idle, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ ...idle, t: 10, ...LEGS.airy, ...AIR }, 20]),
    land: mkAnim(false, [{ ...idle, t: 30 }, 8], [idle, 4]),
    guard: mkAnim(false, [{ t: 10, a1: 90, a2: 80, w: 170, b1: 70, b2: 90, w2: 170, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: 0, x: -2, a1: 90, a2: 80, w: 165, b1: 70, b2: 90, w2: 165, ...LEGS.stance2 }, 10]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 150, a2: 40, w: 250, b1: -30, b2: 40, w2: 200, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 70]),
    ...reactions({ w: 230, w2: 200 }),
  };
}

// ===== Silver Needle Liu (war fan) =========================================
{
  const idle = { t: 4, a1: 110, a2: 50, w: 150, b1: 20, b2: 100, ...LEGS.stance, l1: 16, m1: -18 };
  const fw = { t: -10, a1: -60, a2: 40, w: -60, b1: 100, b2: 40, ...LEGS.stance2 };
  const fs = { t: 22, a1: 110, a2: -10, w: 110, x: 5, b1: -40, b2: 20, ...LEGS.lunge };
  const thr = { t: 6, a1: 100, a2: 10, w: 100, b1: 60, b2: 30, ...LEGS.stance2 };
  const twirl = { t: 6, a1: 150, a2: 10, w: 160, b1: -60, b2: 20, l1: 50, l2: -80, m1: -20, m2: -60 };
  ANIMS.liu = {
    idle: mkAnim(true, [idle, 36], [P_(idle, { a1: 114, w: 156, ...LEGS.stance2 }), 36]),
    walk: walkCycle({ t: 4, a1: 110, a2: 50, w: 150, b1: 10, b2: 80, armLock: 1 }, 7, 0.4),
    run: runCycle({ t: 18, a1: -50, a2: 30, w: -60 }),
    slash: mkAnim(false, [fw, 12, 'out'], [fs, 3, 'lin', 2], [P_(fs, { w: 130 }), 8], [idle, 10]),
    throw: mkAnim(false, [P_(thr, { a1: 40, w: 30 }), 14, 'out'], [thr, 3, 'lin'], [P_(thr, { a1: 110 }), 10], [idle, 10]),
    twirl: mkAnim(false, [P_(twirl, { rot: 0 }), 4, 'lin', 2], [P_(twirl, { rot: -90 }), 4, 'lin', 2], [P_(twirl, { rot: -180 }), 4, 'lin', 2], [P_(twirl, { rot: -270 }), 4, 'lin', 2], [P_(twirl, { rot: -360 }), 4], [idle, 10]),
    jump: mkAnim(false, [{ ...idle, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ ...idle, t: 0, ...LEGS.airy, ...AIR, ff: 40, fb: -50 }, 20]),
    land: mkAnim(false, [{ ...idle, ...LEGS.crouch }, 8], [idle, 4]),
    guard: mkAnim(false, [{ t: 0, a1: 90, a2: 30, w: 110, b1: 40, b2: 90, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: -8, x: -2, a1: 90, a2: 30, w: 108, b1: 40, b2: 90, ...LEGS.stance2 }, 10]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 150, a2: 40, w: 250, b1: -30, b2: 40, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 70]),
    ...reactions({ w: 200 }),
  };
}

// ===== Tie Fo, the Iron Buddha (palms) =====================================
{
  const idle = { t: 10, a1: 70, a2: 80, b1: 40, b2: 90, ...LEGS.stance, l1: 26, m1: -28 };
  const pw = { t: -10, a1: -30, a2: 120, b1: 80, b2: 60, ...LEGS.stance2 };
  const ps = { t: 26, a1: 92, a2: -4, b1: 20, b2: 60, x: 6, ...LEGS.deep, h: 3 };
  const dp = { t: 20, a1: 95, a2: -4, b1: 88, b2: -4, x: 6, ...LEGS.deep, h: 3 };
  const lift = { t: -6, a1: 150, a2: 40, b1: 150, b2: 40, l1: 100, l2: -60, m1: -4, m2: -4, h: 3 };
  const stomp = { t: 20, a1: 60, a2: 30, b1: 50, b2: 30, ...LEGS.deep, h: 3 };
  const pray = { t: 0, a1: 40, a2: 110, b1: 44, b2: 104, ...LEGS.stance2 };
  ANIMS.tiefo = {
    idle: mkAnim(true, [idle, 40], [P_(idle, { ...LEGS.stance2, a2: 84 }), 40]),
    walk: walkCycle({ t: 10, a1: 60, a2: 80, b1: 30, b2: 80, armLock: 1 }, 9, 0.3),
    run: runCycle({ t: 26, a1: -30, a2: 90, b1: 60, b2: 60 }, 0.9, 5),
    palm: mkAnim(false, [pw, 16, 'out'], [ps, 3, 'lin'], [P_(ps, { x: 7 }), 10], [idle, 13]),
    dpalm: mkAnim(false, [P_(pw, { b1: -30, b2: 120 }), 24, 'out'], [dp, 3, 'lin'], [P_(dp, { x: 7 }), 16], [idle, 15]),
    stomp: mkAnim(false, [lift, 24, 'out'], [stomp, 3, 'lin'], [P_(stomp, { t: 16 }), 16], [idle, 14]),
    charge: mkAnim(true, [{ t: 34, a1: 20, a2: 60, b1: 30, b2: 60, l1: 50, l2: -60, m1: -40, m2: -20 }, 5], [{ t: 34, a1: 20, a2: 60, b1: 30, b2: 60, l1: -20, l2: -40, m1: 30, m2: -60 }, 5]),
    pray: mkAnim(true, [pray, 30], [P_(pray, { t: 2 }), 30]),
    jump: mkAnim(false, [{ ...idle, ...LEGS.tuck, ...AIR }, 20]),
    fall: mkAnim(true, [{ ...idle, ...LEGS.airy, ...AIR, a1: 130, b1: 130 }, 20]),
    land: mkAnim(false, [{ ...idle, ...LEGS.crouch }, 10], [idle, 4]),
    guard: mkAnim(false, [{ t: 4, a1: 80, a2: 90, b1: 70, b2: 100, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: -6, x: -2, a1: 80, a2: 90, b1: 70, b2: 100, ...LEGS.stance2 }, 10]),
    stagger: mkAnim(false, [{ t: -20, x: -3, a1: 140, a2: 40, b1: -30, b2: 40, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 80]),
    ...reactions({}),
  };
}

// ===== Xue Tianmo, the Crimson Heaven Demon ================================
{
  const idle = { t: 2, a1: 20, a2: 10, w: 20, b1: 10, b2: 120, ...LEGS.stand, l1: 12, m1: -12 };
  const c1w = { t: -6, a1: 170, a2: 20, w: 210, b1: 40, b2: 80, ...LEGS.stance };
  const c1s = { t: 22, a1: 85, a2: 5, w: 70, x: 4, ...LEGS.lunge, b1: -30, b2: 40 };
  const c2w = { t: 18, a1: 40, a2: -25, w: 15, x: 4, ...LEGS.lunge, b1: -20, b2: 40 };
  const c2s = { t: -8, a1: 160, a2: 15, w: 170, x: 6, l1: 28, l2: -24, m1: -38, m2: -20, b1: -40, b2: 30, h: 3 };
  const th = { t: 26, a1: 90, a2: -2, w: 90, x: 10, ...LEGS.deep, b1: -60, b2: 10, h: 3 };
  const palmw = { t: -10, a1: 20, a2: 10, w: 20, b1: -40, b2: 130, ...LEGS.stance2 };
  const palms = { t: 20, a1: 10, a2: 10, w: 10, b1: 92, b2: -6, x: 5, ...LEGS.lunge, h: 3 };
  const lev = { t: -4, a1: 120, a2: 10, w: 160, b1: 130, b2: 10, l1: 10, l2: -30, m1: -6, m2: -20, ...AIR, ff: 20, fb: -30 };
  const wavew = { t: -14, a1: -130, a2: 20, w: -150, b1: 90, b2: 40, ...LEGS.stance2 };
  const waves = { t: 26, a1: 96, a2: 0, w: 96, x: 6, ...LEGS.deep, b1: -70, b2: 10, h: 3 };
  ANIMS.demon = {
    idle: mkAnim(true, [idle, 44], [P_(idle, { t: 3, b2: 124 }), 44]),
    walk: walkCycle({ t: 2, a1: 20, a2: 10, w: 20, b1: 10, b2: 120, armLock: 1 }, 9, 0),
    run: runCycle({ t: 20, a1: -60, a2: 20, w: -100, b1: 60, b2: 90 }),
    combo: mkAnim(false, [c1w, 12, 'out'], [c1s, 2, 'lin', 2], [P_(c1s, { w: 50 }), 6], [c2w, 6, 'out'], [c2s, 2, 'lin', 2], [P_(c2s, { w: 195 }), 6], [P_(th, { x: 2, a1: -30, a2: 110, w: 90, t: -6 }), 8, 'out'], [th, 2, 'lin'], [P_(th, { x: 12 }), 8], [idle, 12]),
    thrust: mkAnim(false, [P_(th, { x: -3, a1: -30, a2: 110, w: 90, t: -8 }), 16, 'out'], [th, 3, 'lin'], [P_(th, { x: 11 }), 10], [idle, 12]),
    palm: mkAnim(false, [palmw, 22, 'out'], [palms, 3, 'lin'], [P_(palms, { x: 6 }), 16], [idle, 14]),
    wave: mkAnim(false, [wavew, 18, 'out'], [waves, 3, 'lin'], [P_(waves, { w: 70 }), 10], [idle, 12]),
    levitate: mkAnim(true, [lev, 30], [P_(lev, { a1: 128, b1: 138 }), 30]),
    cast: mkAnim(true, [{ t: -6, a1: 20, a2: 10, w: 20, b1: 150, b2: 10, ...LEGS.stance2, h: 3 }, 20], [{ t: -8, a1: 20, a2: 10, w: 20, b1: 160, b2: 8, ...LEGS.stance2, h: 3 }, 20]),
    vanish: mkAnim(false, [P_(idle, { t: 20 }), 60]),
    jump: mkAnim(false, [{ ...lev }, 20]),
    fall: mkAnim(true, [{ ...lev, ...LEGS.airy }, 20]),
    land: mkAnim(false, [{ ...idle, ...LEGS.crouch }, 8], [idle, 4]),
    guard: mkAnim(false, [{ t: 2, a1: 58, a2: 76, w: 178, b1: 40, b2: 100, ...LEGS.stance2 }, 1]),
    blockhit: mkAnim(false, [{ t: -6, x: -2, a1: 58, a2: 76, w: 175, b1: 40, b2: 100, ...LEGS.stance2 }, 10]),
    stagger: mkAnim(false, [{ t: -22, x: -3, a1: 150, a2: 40, w: 250, b1: -30, b2: 40, l1: 30, l2: -10, m1: -30, m2: -30, h: 2 }, 70]),
    ...reactions({ w: 230 }),
  };
}

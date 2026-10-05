// SQUEAKBORNE :: enemy art
// Each creature is built from shaded blobs and lines, cached per frame (auto-outlined, flipped, flash).

const ART = {};
function buildEnemyArt() {
  // ---- Cellar ----
  ART.roach = {
    walk: mkAnim(25, 13, 4, (c, i) => roachBody(c, i, 0)),
    wind: [mkSprite(25, 13, (c) => roachBody(c, 0, 1))],
    dash: mkAnim(25, 13, 2, (c, i) => roachBody(c, i, 2)),
  };
  function roachBody(c, i, st) {
    const lift = st === 1 ? -1 : 0, ph = i % 2;
    for (let k = 0; k < 3; k++) {
      const x0 = 8 + k * 4, off = (k + ph) % 2 ? 2 : -2;
      LINE(c, x0, 8, x0 + (st === 2 ? -3 : off), 12, C.br0);
    }
    blob(c, 11, 7 + lift, 8, 3, C.br0, C.br1, C.br2);
    LINE(c, 5, 5 + lift, 15, 5 + lift, C.br3);
    LINE(c, 4, 7 + lift, 16, 7 + lift, C.br0);
    blob(c, 19, 8, 2, 2, C.br0, C.dk2);
    PX(c, 20, 7, C.yl1);
    PX(c, 19, 6, C.ink);
    const wig = st === 1 ? 2 : ph;
    LINE(c, 20, 6, 24, 1 + wig, C.br1);
    LINE(c, 19, 6, 21, wig, C.br1);
  }
  ART.slime = {
    idle: mkAnim(20, 16, 3, (c, i) => slimeBody(c, [[7, 5], [7, 6], [8, 5]][i])),
    jump: [mkSprite(20, 16, (c) => slimeBody(c, [5, 7]))],
    land: [mkSprite(20, 16, (c) => slimeBody(c, [9, 4]))],
  };
  function slimeBody(c, [rx, ry]) {
    const cx = 10, cy = 15 - ry;
    blob(c, cx, cy, rx, ry, C.yl0, C.yl1, C.yl2);
    DISC(c, cx - 3, cy + 1, 1, C.or2); PX(c, cx + 3, cy - 2, C.or2); PX(c, cx + 4, cy + 2, C.or2);
    dither(c, cx - rx + 1, cy - ry, rx + 2, 3, C.gr3, 0.7, rx);
    DISC(c, cx + 3, cy - ry + 2, 1, C.gr2);
    R(c, cx - 2, cy - 1, 1, 2, C.ink); R(c, cx + 2, cy - 1, 1, 2, C.ink);
    PX(c, cx, cy + 2, C.ink); PX(c, cx - 1, cy + 1, C.ink); PX(c, cx + 1, cy + 1, C.ink);
  }
  ART.spider = { walk: mkAnim(20, 14, 4, (c, i) => spiderBody(c, i)), hang: [mkSprite(20, 14, (c) => spiderBody(c, 0, true))] };
  function spiderBody(c, i, hang) {
    for (let k = 0; k < 4; k++) {
      const bx = 7 + k * 2, ph = (k + i) % 2;
      const kx = bx - 4 + k, ky = hang ? 8 : 3 + ph;
      LINE(c, bx, 8, kx, ky, C.dk1); LINE(c, kx, ky, kx - 2 + k, 13, C.dk1);
      const kx2 = bx + 5 + k, ky2 = hang ? 8 : 4 - ph;
      LINE(c, bx + 2, 8, kx2, ky2, C.dk1); LINE(c, kx2, ky2, min(19, kx2 + 2), 13, C.dk1);
    }
    blob(c, 8, 7, 5, 4, C.dk1, C.dk2, C.dk3);
    PX(c, 8, 5, C.rd2); PX(c, 8, 7, C.rd2); PX(c, 7, 6, C.rd2); PX(c, 9, 6, C.rd2);
    blob(c, 14, 9, 3, 2, C.dk1, C.dk2);
    PX(c, 15, 8, C.rd3); PX(c, 16, 9, C.rd3); PX(c, 14, 8, C.rd2);
  }
  ART.rat = {
    walk: mkAnim(26, 26, 4, (c, i) => ratBody(c, i, 0)),
    wind: [mkSprite(26, 26, (c) => ratBody(c, 0, 1))],
    smash: [mkSprite(26, 26, (c) => ratBody(c, 0, 2))],
  };
  function ratBody(c, i, st) {
    const step = i % 2 ? 1 : -1;
    LINE(c, 7, 19, 2, 22, C.pk1); LINE(c, 2, 22, 0, 19, C.pk1);
    R(c, 7 + step, 23, 4, 2, C.pk0); R(c, 13 - step, 23, 4, 2, C.pk1);
    blob(c, 12, 17, 5, 6, C.fu0, C.fu1, C.fu2);
    ELL(c, 13, 18, 3, 4, C.fu2);
    R(c, 8, 13, 3, 7, C.dk2); R(c, 14, 13, 3, 7, C.dk2);
    blob(c, 14, 9, 4, 4, C.fu0, C.fu1, C.fu2);
    ELL(c, 18, 10, 2, 1, C.fu1); PX(c, 20, 9, C.pk1);
    DISC(c, 11, 4, 2, C.fu1); PX(c, 11, 4, C.pk0);
    R(c, 11, 6, 7, 1, C.rd2); PX(c, 10, 7, C.rd2); PX(c, 9, 8, C.rd1);
    PX(c, 16, 8, C.rd3); LINE(c, 15, 7, 17, 7, C.ink);
    if (st === 0) { LINE(c, 13, 13, 7, 3, C.br3, 3); PX(c, 7, 2, C.br4); R(c, 12, 12, 2, 2, C.pk1); }
    if (st === 1) { LINE(c, 12, 12, 9, 1, C.br3, 3); DISC(c, 9, 1, 2, C.br3); R(c, 11, 11, 2, 2, C.pk1); }
    if (st === 2) { LINE(c, 16, 14, 24, 20, C.br3, 3); DISC(c, 24, 21, 2, C.br3); R(c, 16, 13, 2, 2, C.pk1); }
  }
  ART.fly = { fly: mkAnim(13, 11, 2, (c, i) => {
    if (i === 0) ELL(c, 5, 2, 3, 2, C.fu3); else ELL(c, 4, 6, 3, 1, C.fu3);
    blob(c, 6, 6, 4, 3, C.gr0, C.gr1, C.gr2);
    DISC(c, 10, 5, 2, C.dk1); R(c, 10, 4, 2, 2, C.rd2); PX(c, 10, 4, C.rd3);
    LINE(c, 5, 9, 4, 10, C.ink); LINE(c, 8, 9, 8, 10, C.ink);
  }) };
  // ---- Living room ----
  ART.dust = { idle: mkAnim(18, 15, 3, (c, i) => dustBody(c, [[6, 5], [6, 6], [7, 4]][i])) };
  function dustBody(c, [rx, ry]) {
    const cx = 9, cy = 14 - ry;
    for (let a = 0; a < 18; a++) {
      const an = (a / 18) * TAU, r = 1 + hash2(a, rx, 7) * 1.8;
      PX(c, cx + cos(an) * (rx + r), cy + sin(an) * (ry + r * 0.8), C.st3);
    }
    ELL(c, cx, cy, rx, ry, C.st3); ELL(c, cx - 1, cy - 1, rx - 2, ry - 2, C.st4); PX(c, cx - 3, cy - 3, C.st5);
    R(c, cx - 3, cy - 1, 2, 2, C.ink); R(c, cx + 2, cy - 1, 2, 2, C.ink); PX(c, cx - 3, cy - 1, C.wh); PX(c, cx + 2, cy - 1, C.wh);
    R(c, cx - 3, 14, 2, 1, C.st2); R(c, cx + 2, 14, 2, 1, C.st2);
  }
  ART.soldier = {
    walk: mkAnim(20, 24, 4, (c, i) => soldierBody(c, i, 0)),
    aim: [mkSprite(20, 24, (c) => soldierBody(c, 0, 1))],
    fire: [mkSprite(20, 24, (c) => soldierBody(c, 1, 2))],
  };
  function soldierBody(c, i, st) {
    const lu = st === 0 && i % 2 ? 1 : 0, ru = st === 0 && i % 2 === 0 ? 1 : 0;
    R(c, 7, 16, 2, 6 - lu, C.bl1); R(c, 10, 16, 2, 6 - ru, C.bl1);
    R(c, 6, 21 - lu, 3, 2, C.ink); R(c, 10, 21 - ru, 3, 2, C.ink);
    R(c, 6, 9, 7, 8, C.rd2); R(c, 6, 9, 7, 1, C.rd3); R(c, 6, 15, 7, 1, C.rd1);
    LINE(c, 6, 9, 12, 15, C.fu4); LINE(c, 12, 9, 6, 15, C.fu4);
    R(c, 7, 6, 5, 3, C.pk3); PX(c, 10, 7, C.ink); PX(c, 8, 8, C.pk2);
    R(c, 6, 0, 7, 6, C.dk1); R(c, 7, 0, 5, 1, C.dk2); R(c, 6, 5, 7, 1, C.yl0);
    const kl = [3, 1, 3, 1][i % 4];
    R(c, 5 - kl, 11, kl, 1, C.yl0); R(c, 4 - kl, 10, 1, 3, C.yl0);
    if (st === 0) { LINE(c, 13, 15, 15, 4, C.br2, 1); PX(c, 15, 3, C.st4); R(c, 12, 12, 2, 2, C.pk3); }
    else { LINE(c, 9, 11, 19, 11, C.br2, 2); PX(c, 19, 11, C.st4); R(c, 11, 11, 2, 2, C.pk3); if (st === 2) { PX(c, 19, 10, C.yl1); } }
  }
  ART.moth = { fly: mkAnim(22, 16, 3, (c, i) => {
    const wy = [3, 6, 10][i], wr = [3, 4, 2][i];
    ELL(c, 8, wy, 7, wr, C.br3); ELL(c, 8, wy, 5, max(1, wr - 1), C.br4);
    DISC(c, 6, wy, 1, C.dk1); PX(c, 6, wy, C.fu4); PX(c, 11, wy, C.br2);
    blob(c, 11, 9, 5, 2, C.br2, C.br4, C.br5);
    DISC(c, 16, 8, 2, C.br4); R(c, 16, 7, 2, 2, C.ink); PX(c, 16, 7, C.wh);
    LINE(c, 17, 6, 20, 2, C.br2); LINE(c, 16, 6, 17, 2, C.br2); PX(c, 19, 3, C.br3); PX(c, 21, 2, C.br3);
  }) };
  ART.monkey = {
    idle: mkAnim(26, 22, 2, (c, i) => monkeyBody(c, i, 0)),
    wind: [mkSprite(26, 22, (c) => monkeyBody(c, 0, 1))],
    clap: [mkSprite(26, 22, (c) => monkeyBody(c, 0, 2))],
  };
  function monkeyBody(c, i, st) {
    R(c, 10, 18, 2, 4, C.br1); R(c, 14, 18 + i, 2, 4 - i, C.br1);
    blob(c, 13, 14, 5, 5, C.br1, C.br2, C.br3);
    R(c, 9, 11, 9, 5, C.rd2); R(c, 12, 11, 3, 5, C.yl0);
    blob(c, 13, 6, 5, 4, C.br1, C.br2);
    ELL(c, 14, 7, 3, 2, C.br4);
    DISC(c, 8, 6, 1, C.br4); DISC(c, 18, 6, 1, C.br4);
    PX(c, 12, 6, C.ink); PX(c, 15, 6, C.ink); R(c, 12, 8, 4, 1, C.wh); PX(c, 13, 8, C.ink);
    R(c, 12, 0, 3, 3, C.rd2); PX(c, 15, 0, C.yl1);
    const sep = st === 2 ? 1 : st === 1 ? 11 : 7 + i;
    const yy = st === 1 ? 9 : 13;
    LINE(c, 11, 13, 13 - sep, yy, C.br2); LINE(c, 16, 13, 14 + sep, yy, C.br2);
    ELL(c, 13 - sep, yy, 1, 4, C.yl0); PX(c, 13 - sep, yy - 2, C.yl2);
    ELL(c, 14 + sep, yy, 1, 4, C.yl0); PX(c, 14 + sep, yy - 2, C.yl2);
  }
  ART.worm = {
    up: mkAnim(16, 20, 3, (c, i) => wormBody(c, [6, 12, 18][i], false)),
    idle: mkAnim(16, 20, 2, (c, i) => wormBody(c, 18, false, i)),
    bite: [mkSprite(16, 20, (c) => wormBody(c, 18, true))],
  };
  function wormBody(c, hgt, open, sway = 0) {
    const top = 20 - hgt;
    for (let y = 19; y > top + 4; y -= 3) DISC(c, 7 + (y < 12 ? sway : 0), y, 3, (y / 3) % 2 < 1 ? C.gr2 : C.gr3);
    if (hgt >= 12) {
      const hx = 8 + sway, hy = top + 4;
      blob(c, hx, hy, 4, 4, C.gr2, C.gr3, C.gr4);
      R(c, hx - 2, hy - 2, 3, 3, C.st4); R(c, hx + 2, hy - 2, 3, 3, C.st4);
      PX(c, hx - 1, hy - 1, C.ink); PX(c, hx + 3, hy - 1, C.ink); PX(c, hx + 1, hy - 1, C.st4);
      if (open) { R(c, hx - 1, hy + 2, 5, 2, C.rd1); PX(c, hx, hy + 2, C.wh); PX(c, hx + 2, hy + 2, C.wh); }
      else R(c, hx, hy + 2, 3, 1, C.gr1);
    }
    R(c, 1, 18, 14, 2, C.br2); PX(c, 3, 17, C.br2); PX(c, 12, 17, C.br3);
  }
  // ---- Kitchen ----
  ART.chef = {
    walk: mkAnim(22, 26, 4, (c, i) => chefBody(c, i, 0)),
    wind: [mkSprite(22, 26, (c) => chefBody(c, 0, 1))],
    throw: [mkSprite(22, 26, (c) => chefBody(c, 0, 2))],
  };
  function chefBody(c, i, st) {
    const ph = i % 2;
    LINE(c, 7, 19, 5 + ph * 2, 25, C.br0); LINE(c, 10, 19, 12 - ph * 2, 25, C.br0);
    blob(c, 9, 15, 4, 6, C.br0, C.br1, C.br2);
    R(c, 7, 13, 5, 7, C.fu4); R(c, 7, 13, 5, 1, C.fu3);
    blob(c, 10, 8, 3, 3, C.dk1, C.dk2);
    PX(c, 11, 7, C.yl1);
    LINE(c, 10, 10, 14, 11, C.ink); LINE(c, 11, 10, 7, 11, C.ink);
    R(c, 7, 3, 7, 3, C.fu4); DISC(c, 8, 2, 2, C.fu4); DISC(c, 12, 2, 2, C.wh);
    LINE(c, 12, 5, 16, 0, C.br1); LINE(c, 11, 5, 13, 0, C.br1);
    if (st === 0) { LINE(c, 12, 14, 15, 17, C.br1); R(c, 15, 15, 4, 4, C.st4); PX(c, 15, 15, C.wh); }
    if (st === 1) { LINE(c, 8, 13, 4, 6, C.br1); R(c, 1, 3, 4, 4, C.st4); PX(c, 1, 3, C.wh); }
    if (st === 2) { LINE(c, 12, 13, 18, 10, C.br1); }
  }
  ART.meatball = { roll: mkAnim(18, 18, 4, (c, i) => {
    blob(c, 9, 10, 7, 6, C.br1, C.br2, C.br3);
    for (let k = 0; k < 4; k++) { const a = i * 0.6 + k * 1.57; DISC(c, 9 + cos(a) * 4, 10 + sin(a) * 3, 1, C.br1); }
    ELL(c, 9, 5, 5, 2, C.rd1); ELL(c, 8, 4, 3, 1, C.rd2); PX(c, 4, 7, C.rd1); PX(c, 13, 7, C.rd1);
    PX(c, 7, 3, C.gr2); PX(c, 11, 4, C.gr3);
    R(c, 6, 9, 2, 1, C.ink); R(c, 11, 9, 2, 1, C.ink); PX(c, 6, 10, C.wh); PX(c, 12, 10, C.wh);
  }) };
  ART.wasp = { fly: mkAnim(17, 13, 2, (c, i) => waspBody(c, i, false)), dive: [mkSprite(17, 13, (c) => waspBody(c, 0, true))] };
  function waspBody(c, i, dive) {
    if (i === 0) ELL(c, 9, 2, 3, 2, C.fu4); else ELL(c, 8, 6, 4, 1, C.fu3);
    blob(c, 5, 8, 4, 3, C.yl0, C.yl1);
    R(c, 3, 5, 1, 6, C.ink); R(c, 6, 5, 1, 6, C.ink);
    LINE(c, 1, 9, dive ? -1 : 0, dive ? 11 : 10, C.ink);
    ELL(c, 10, 7, 2, 2, C.yl0);
    DISC(c, 13, 7, 2, C.dk2); R(c, 13, 6, 2, 2, C.rd2); LINE(c, 12, 5, 14, 6, C.ink);
    LINE(c, 9, 9, 8, 12, C.ink); LINE(c, 11, 9, 11, 12, C.ink);
  }
  ART.knight = {
    walk: mkAnim(30, 24, 4, (c, i) => knightBody(c, i, 0)),
    wind: [mkSprite(30, 24, (c) => knightBody(c, 0, 1))],
    thrust: [mkSprite(30, 24, (c) => knightBody(c, 0, 2))],
  };
  function knightBody(c, i, st) {
    const ph = i % 2;
    R(c, 9, 18 + ph, 2, 5 - ph, C.st2); R(c, 13, 19 - ph, 2, 4 + ph, C.st2);
    blob(c, 12, 14, 5, 5, C.st2, C.st3, C.st4);
    R(c, 8, 3, 8, 8, C.st4); R(c, 8, 3, 8, 1, C.st5);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) PX(c, 9 + a * 2, 4 + b * 2, C.st3);
    R(c, 11, 7, 5, 1, C.ink); PX(c, 14, 7, C.rd3);
    R(c, 11, 1, 2, 2, C.rd2); PX(c, 10, 0, C.rd2);
    const sp = st === 1 ? -7 : st === 2 ? 8 : 0;
    LINE(c, 1 + sp, 13, 21 + sp, 13, C.st3);
    LINE(c, 21 + sp, 11, 21 + sp, 15, C.st4); LINE(c, 21 + sp, 11, 25 + sp, 11, C.st5); LINE(c, 21 + sp, 13, 26 + sp, 13, C.st5); LINE(c, 21 + sp, 15, 25 + sp, 15, C.st5);
    ELL(c, 17, 13, 2, 5, C.st4); ELL(c, 17, 13, 1, 4, C.st5); PX(c, 18, 11, C.wh);
  }
  ART.pepper = { hop: mkAnim(13, 19, 2, (c, i) => pepperBody(c, i, false)), lit: [mkSprite(13, 19, (c) => pepperBody(c, 0, true))] };
  function pepperBody(c, i, lit) {
    const sq = i ? 1 : 0;
    ELL(c, 6, 10 + sq, 4, 6 - sq, lit ? C.rd3 : C.rd2);
    POLY(c, [4, 14, 9, 14, 5, 18], lit ? C.rd3 : C.rd2);
    LINE(c, 4, 7, 4, 12, lit ? C.yl1 : C.rd3);
    R(c, 6, 1, 2, 3, C.gr2); ELL(c, 6, 4 + sq, 3, 1, C.gr3);
    PX(c, 5, 9, C.ink); PX(c, 8, 9, C.ink); LINE(c, 4, 7, 5, 8, C.ink); LINE(c, 9, 7, 8, 8, C.ink);
    R(c, 6, 12, 2, 1, C.ink);
  }
  // ---- Cat tree ----
  ART.kitten = {
    idle: mkAnim(24, 17, 2, (c, i) => kittenBody(c, i, 0)),
    run: mkAnim(24, 17, 4, (c, i) => kittenBody(c, i, 1)),
    wiggle: mkAnim(24, 17, 2, (c, i) => kittenBody(c, i, 2)),
    pounce: [mkSprite(24, 17, (c) => kittenBody(c, 0, 3))],
  };
  function kittenBody(c, i, st) {
    const by = st === 2 ? -1 + i : 0, bt = st === 3 ? -2 : 0;
    const legs = st === 1 ? [[-2, 1], [2, -1], [1, 2], [-1, -2]][i] : [0, 0];
    LINE(c, 5, 10 + by, 1, 3 + (st === 2 ? i * 2 : 0), C.or1, 2); PX(c, 1, 3, C.or2);
    R(c, 6 + legs[0], 13, 2, 4 - (st === 3 ? 2 : 0), C.or0); R(c, 13 + legs[1], 13, 2, 4 - (st === 3 ? 2 : 0), C.or0);
    blob(c, 11, 10 + by + bt, 7, 4, C.or0, C.or1, C.or2);
    LINE(c, 8, 7 + by, 8, 10 + by, C.or0); LINE(c, 11, 7 + by, 11, 10 + by, C.or0); LINE(c, 14, 7, 14, 9, C.or0);
    ELL(c, 12, 12 + bt, 4, 1, C.yl2);
    const hx = 18, hy = 7 + bt;
    POLY(c, [hx - 4, hy - 2, hx - 1, hy - 3, hx - 3, hy - 7], C.or1); POLY(c, [hx + 1, hy - 3, hx + 4, hy - 2, hx + 3, hy - 7], C.or1);
    PX(c, hx - 3, hy - 4, C.pk1); PX(c, hx + 3, hy - 4, C.pk1);
    blob(c, hx, hy, 4, 4, C.or0, C.or1, C.or2);
    R(c, hx - 1, hy - 1, 2, 2, C.gr4); R(c, hx + 2, hy - 1, 2, 2, C.gr4);
    PX(c, hx, hy - 1, C.ink); PX(c, hx + 3, hy - 1, C.ink);
    PX(c, hx + 2, hy + 1, C.pk1); PX(c, hx + 4, hy + 1, C.fu4);
  }
  ART.yarn = { roll: mkAnim(15, 15, 4, (c, i) => {
    blob(c, 7, 8, 6, 6, C.pk0, C.pk1, C.pk2);
    for (let k = 0; k < 3; k++) { const a = i * 0.5 + k * 1.05; LINE(c, 7 + cos(a) * 5, 8 + sin(a) * 5, 7 - cos(a) * 5, 8 - sin(a) * 5, C.pk0); }
    PX(c, 5, 5, C.pk3);
  }) };
  ART.wisp = { fly: mkAnim(14, 16, 3, (c, i) => {
    const fl = [0, 1, -1][i];
    POLY(c, [7 + fl, 0, 12, 9, 7, 15, 2, 9], C.gr3);
    POLY(c, [7 + fl, 3, 10, 9, 7, 13, 4, 9], C.gr4);
    R(c, 5, 8, 1, 2, C.ink); R(c, 8, 8, 1, 2, C.ink); PX(c, 6, 11, C.ink);
    PX(c, 3, 3 + i, C.gr3); PX(c, 11, 2 + i, C.gr4);
  }) };
  // ---- props ----
  ART.props = {
    barrel: mkSprite(14, 16, (c) => { ELL(c, 7, 8, 6, 7, C.br1); R(c, 1, 2, 12, 12, C.br2); R(c, 3, 2, 2, 12, C.br3); R(c, 1, 4, 12, 1, C.st2); R(c, 1, 11, 12, 1, C.st2); R(c, 2, 1, 10, 1, C.br3); }),
    books: mkSprite(16, 15, (c) => { R(c, 1, 11, 14, 4, C.rd1); R(c, 2, 7, 12, 4, C.tl1); R(c, 0, 3, 13, 4, C.yl0); R(c, 3, 0, 10, 3, C.br2); R(c, 1, 12, 14, 1, C.fu4); R(c, 2, 8, 12, 1, C.fu4); R(c, 0, 4, 13, 1, C.fu4); }),
    jar: mkSprite(12, 15, (c) => { R(c, 2, 0, 8, 3, C.rd2); R(c, 1, 3, 10, 12, C.st4); R(c, 2, 5, 8, 9, C.or1); R(c, 3, 6, 1, 6, C.yl2); R(c, 2, 8, 8, 3, C.fu4); }),
    block: mkSprite(14, 14, (c) => { R(c, 0, 0, 14, 14, C.tl2); R(c, 1, 1, 12, 12, C.tl3); txt('A', 4, 3, C.yl1, { c }); }),
  };
  // ---- skill gadgets & minions ----
  ART.teeth = mkAnim(12, 10, 2, (c, i) => {
    R(c, 1, 6, 10, 3, C.pk1); R(c, 1, 1 + (i ? 2 : 0), 10, 3, C.pk1);
    for (let k = 0; k < 4; k++) { R(c, 2 + k * 2, 3 + (i ? 2 : 0), 1, 2, C.wh); R(c, 2 + k * 2, 5, 1, 1, C.wh); }
    R(c, 3, 9, 2, 1, C.st3); R(c, 8, 9, 2, 1, C.st3); R(c, 11, 4, 1, 2, C.yl0);
  });
  ART.duck = mkAnim(13, 12, 2, (c, i) => {
    blob(c, 6, 8, 5, 3, C.yl0, C.yl1, C.yl2); blob(c, 8, 4 - i, 3, 3, C.yl0, C.yl1);
    R(c, 11, 4 - i, 2, 1, C.or1); PX(c, 9, 3 - i, C.ink);
  });
  ART.cushion = mkAnim(16, 9, 2, (c, i) => { ELL(c, 8, 5 - i, 7, 4 - i * 2, C.pk1); ELL(c, 7, 4 - i, 5, 2 - i, C.pk2); R(c, 13, 5, 3, 2, C.pk0); });
  ART.brick = mkSprite(7, 5, (c) => { R(c, 0, 2, 7, 3, C.rd2); R(c, 1, 0, 2, 2, C.rd2); R(c, 4, 0, 2, 2, C.rd2); PX(c, 1, 0, C.rd3); PX(c, 4, 0, C.rd3); });
  ART.ptrap = SPR.mousetrap;
}

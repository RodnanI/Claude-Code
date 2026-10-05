/* ============================================================
   run.js : the Game object. Run setup, rounds, the scoring
   pipeline (pins -> pocket -> charms), jackpots, FEVER, nudges,
   cash-out, shop, capsules, tickets, saving and the attract demo.
   ============================================================ */
const Game = (() => {
  const G = { state: 'boot', run: null, rd: null, rng: null, timers: [], demoT: 0, focus: null, busy: false, bulbBase: 'idle', bulbHold: 0 };
  let uid = 1;
  const ROUND_NAMES = ['ROUND A', 'ROUND B', 'BOSS ROUND'];
  const CAPSULES = {
    charm: { name: 'Charm Capsule', cost: 6, color: '#c3261a', desc: 'Pick 1 of 3 charms. Better odds of rare ones.' },
    pin: { name: 'Pin Capsule', cost: 4, color: '#d7ad55', desc: 'Pick 1 of 3 special pins.' },
    ball: { name: 'Ball Capsule', cost: 4, color: '#27c4b0', desc: 'Pick 1 of 3 special balls.' },
    ticket: { name: 'Ticket Capsule', cost: 3, color: '#efe2c2', desc: 'Pick 1 of 3 tickets.' },
    mega: { name: 'Mega Capsule', cost: 9, color: '#ff8a2a', desc: 'Pick 1 of 4 charms. A Rare or better is guaranteed.' },
  };

  /* ---------------- helpers ---------------- */
  const active = () => { const r = G.run; if (!r) return []; return G.rd && G.rd.rules.thief ? r.charms.slice(1) : r.charms; };
  function has(id) { const a = active(); for (let i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  const vcount = id => (G.run ? G.run.vouchers.filter(v => v === id).length : 0);
  function luckK(ball) {
    let k = 1;
    if (has('rabbit')) k *= 2;
    if (ball ? ball.type === 'clover' : Board.balls.some(b => b.alive && b.type === 'clover')) k *= 2;
    return k;
  }
  const chance = (n, d, ball) => Math.random() < Math.min(1, (n * luckK(ball)) / d);
  const after = (t, fn) => G.timers.push({ t, fn });
  const pan = x => clamp((x / BW) * 2 - 1, -0.8, 0.8);
  const buzz = p => { try { if (Meta.data.settings.shake && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* unsupported */ } };
  const pocketX = p => p * PW + PW / 2;
  function bulbs(mode, hold = 0) { if (hold) { Board.bulbMode = mode; G.bulbHold = hold; Board.bulbT = 0; } else { G.bulbBase = mode; if (G.bulbHold <= 0) Board.bulbMode = mode; } }
  const KC = { p: '#4fe3cf', m: '#ff6a4a', d: '#ffd34a', k: '#fff3d6' };
  function boardText(x, y, s, kind, big) {
    if (kind === 'x') FX.text(x, y - 12, s, '#fff6e0', big ? 15 : 12, { box: '#c3261a', dur: 0.95, rise: 28, pop: 1.15 });
    else if (kind === 'm') FX.text(x, y - 9, s, KC.m, big ? 13 : 10.5, { dur: 0.85 });
    else if (kind === 'd') FX.text(x, y - 9, s, KC.d, 12, { dur: 0.95 });
    else if (kind === 'k') FX.text(x, y - 12, s, KC.k, 11, { dur: 0.9 });
    else FX.text(x + rand(-4, 4), y - 7, s, KC.p, 9, { dur: 0.6, rise: 24 });
  }
  function sellPrice(c) { const d = CHARMS[c.id]; return Math.max(1, Math.floor((d.cost + (c.ed ? EDITIONS[c.ed].cost : 0)) / 2)) + (c.id === 'piggy' ? c.s.v || 0 : 0); }
  function charmSlotsUsed() { return G.run.charms.filter(c => c.ed !== 'phantom').length; }
  const emptyCharmSlots = () => Math.max(0, G.run.charmSlots - charmSlotsUsed());
  function pinTypes() { const s = new Set(); for (const p of G.run.pins) if (p && p.t !== 'basic') s.add(p.t); return s.size; }
  const ballsInPlay = () => Board.balls.filter(b => b.alive && !b.demo);
  function proc(c, text, kind, quiet) { UI.proc(c, text, kind, quiet); }
  function procId(id, text, kind) { const c = has(id); if (c) UI.proc(c, text, kind); }
  function cash(n, src, x, y) {
    if (!G.run || !n) return;
    G.run.money += n;
    if (x != null) {
      boardText(x, y, '+$' + n, 'd');
      FX.coins(x, y, Math.min(6, 1 + n), 150);
      const sp = Board.toScreen(x, y), t = UI.moneyTarget();
      if (t) FX.stream(sp.x, sp.y, t.x, t.y, Math.min(6, n + 1), '#ffd34a', () => UI.money(true), { coin: true, dur: 0.6 });
      else UI.money(true);
    } else UI.money(true);
    if (src && src.id) proc(src, '+$' + n, 'd');
    Sound.coin(x != null ? pan(x) : 0);
    if (G.run.money >= 100) Meta.ach('rich');
  }

  /* ---------------- run setup ---------------- */
  function mkCharm(id, ed = null) { return { id, ed, s: {}, uid: uid++ }; }
  function newRun({ cab = 'classic', stake = 0, daily = null, seed = null } = {}) {
    const C = CABINETS[cab] || CABINETS.classic;
    seed = seed || (daily ? 'daily-' + daily : Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    const rng = new RNG(seed);
    const run = {
      v: 1, seed, rs: null, cab, stake, daily, endless: false,
      floor: 1, ri: 0, money: C.money, phase: 'round',
      charms: [], charmSlots: 5, tickets: [], ticketSlots: 2, bag: [], baseBalls: C.balls || 10,
      pins: Board.slots.map(() => ({ t: 'basic', l: 1 })),
      pockets: [3, 2, 1, 1, 'F', 1, 1, 2, 3].map(m => (m === 'F' ? { m: 1, fever: true, gold: 0 } : { m, gold: 0 })),
      vouchers: [], oil: 0, kindling: 0, freeCaps: 0, bosses: [], shop: null, pendingVoucher: null,
      stats: { jackpots: 0, fevers: 0, best: 0, total: 0, rounds: 0, spins: 0, donWins: 0, maxHits: 0, start: Date.now(), drops: 0 },
    };
    if (C.sparse) { const idx = rng.shuffle(run.pins.map((_, i) => i)).slice(0, Math.floor(run.pins.length / 3)); idx.forEach(i => { run.pins[i] = null; }); }
    if (C.pins) for (const t in C.pins) for (let k = 0; k < C.pins[t]; k++) { const c = run.pins.map((p, i) => (p && p.t === 'basic' && Board.slots[i].r >= 2 && Board.slots[i].r <= 10 ? i : -1)).filter(i => i >= 0); if (c.length) run.pins[rng.pick(c)] = { t, l: 1 }; }
    run.bag = Array(run.baseBalls).fill('steel');
    if (C.bag) for (const t in C.bag) for (let k = 0; k < C.bag[t]; k++) { const i = run.bag.indexOf('steel'); if (i >= 0) run.bag[i] = t; }
    (C.charms || []).forEach(id => run.charms.push(mkCharm(id)));
    (C.tickets || []).forEach(id => run.tickets.push({ id }));
    const used = new Set();
    for (let f = 1; f <= 7; f++) {
      let pool = Object.keys(BOSSES).filter(k => (BOSSES[k].min || 1) <= f && !used.has(k));
      if (!pool.length) pool = Object.keys(BOSSES).filter(k => (BOSSES[k].min || 1) <= f);
      const b = rng.pick(pool); used.add(b); run.bosses.push([b]);
    }
    const h = rng.shuffle(Object.keys(BOSSES).filter(b => b !== 'counter'));
    run.bosses.push([h[0], h[1]]);
    G.run = run; G.rng = rng;
    Meta.data.stats.runs++;
    (C.charms || []).forEach(id => Meta.discover('charm', id));
    if (daily) Meta.dailyPlayed(daily);
    startRound();
  }
  function bossRules(floor) {
    const r = G.run;
    if (floor <= r.bosses.length) return r.bosses[floor - 1];
    const keys = Object.keys(BOSSES).filter(b => b !== 'counter');
    return [keys[(floor * 7) % keys.length], keys[(floor * 11 + 3) % keys.length]].filter((v, i, a) => a.indexOf(v) === i);
  }
  function continueRun() {
    const saved = Meta.data.run;
    if (!saved) return false;
    G.run = saved; G.rng = new RNG(saved.rs || saved.seed);
    uid = Math.max(uid, ...saved.charms.map(c => c.uid || 0)) + 1;
    if (saved.phase === 'shop' && saved.shop) openShop(true);
    else if (saved.phase === 'voucher' && saved.pendingVoucher) voucherStep();
    else startRound();
    return true;
  }
  function save() {
    const r = G.run;
    if (!r) return;
    r.rs = G.rng.s.slice();
    Meta.data.run = JSON.parse(JSON.stringify(r));
    Meta.save();
  }

  /* ---------------- rounds ---------------- */
  function startRound() {
    const run = G.run;
    run.phase = 'round';
    const isBoss = run.ri === 2;
    const ruleIds = isBoss ? bossRules(run.floor) : [];
    const rules = {}; ruleIds.forEach(k => { rules[k] = true; });
    let balls = run.baseBalls + (has('spare') ? 1 : 0) + vcount('v_ball') - (run.stake >= 4 ? 1 : 0) - (rules.counter ? 3 : 0);
    balls = Math.max(3, balls);
    const queue = G.rng.shuffle(run.bag.slice());
    while (queue.length < balls) queue.push('steel');
    queue.length = balls;
    G.rd = {
      quota: quotaFor(run.floor, run.ri, run.stake), score: 0, queue, total: balls, dropped: 0,
      rules, ruleIds, boss: isBoss, hot: [], heat: 0, bells: 0, lastPocket: -1, pocketBonus: 0,
      nudges: rules.mime ? 0 : 3 + (has('loose') ? 2 : 0) + vcount('v_springs') * 2, nudgeT: 0,
      fever: null, met: false, ended: false, cooldown: 0, t: 0, real: 0, endT: 0, unused: 0, cashing: false,
      coal: false, wind: 0, elev: 0, windUsed: false, clutch: false, lastScore: 0, maxCrowd: 0,
    };
    G.timers.length = 0;
    Board.balls.length = 0; FX.clear();
    Board.setPins(run.pins); Board.magnetK = has('magnetism') ? 2 : 1; Board.refresh();
    Board.pocketBonus = 0;
    Board.setPockets(run.pockets.map(p => Object.assign({}, p, { sealed: !!(rules.jammer && p.fever) })));
    Board.gravK = rules.gravity ? 1.45 : 1;
    Board.wind = 0; Board.fog = !!rules.fog; Board.fever = 0;
    Board.launcher.show = true; Board.aim = true;
    Board.nextBall = queue[0];
    Reels.reset();
    rollHot();
    for (const c of active()) { const d = CHARMS[c.id]; if (d.roundStart) d.roundStart(c, G); }
    G.state = 'intro';
    bulbs('play');
    Sound.music('lounge');
    UI.enterRound();
    save();
    const info = { floor: run.floor, round: ROUND_NAMES[run.ri], quota: G.rd.quota, balls, boss: isBoss ? ruleIds.map(k => BOSSES[k]) : null, house: isBoss && run.floor === 8, ri: run.ri };
    UI.roundIntro(info).then(() => {
      if (G.state !== 'intro') return;
      G.state = 'play';
      UI.hint('aim');
      if (isBoss) UI.hint('boss');
      if (run.floor === 1 && run.ri === 1) UI.hint('nudge');
    });
  }
  function rollHot() {
    const rd = G.rd;
    Board.hot = []; Board.hotGold = false;
    if (!rd || rd.rules.cold) return;
    const n = 1 + vcount('v_twin');
    const c = [];
    G.run.pins.forEach((p, i) => { const r = Board.slots[i].r; if (p && p.t === 'basic' && r >= 2 && r <= 8) c.push(i); });
    for (let k = 0; k < n && c.length; k++) { const j = Math.floor(Math.random() * c.length); Board.hot.push(c[j]); c.splice(j, 1); }
    Board.hotGold = Math.random() < 0.08;
    rd.hot = Board.hot;
  }
  function playerInFlight() { let n = 0; for (const b of Board.balls) if (b.alive && b.player) n++; return n; }
  function aim(lx) {
    if (!G.rd) { Board.launcher.tx = clamp(lx, 24, BW - 24); return; }
    Board.launcher.tx = clamp(G.rd.rules.mirror ? BW - lx : lx, 24, BW - 24);
  }
  function drop() {
    if (G.state === 'intro') { UI.dismissIntro(); return false; }
    if (G.state !== 'play' || G.busy) return false;
    const rd = G.rd, run = G.run;
    if (!rd.queue.length || rd.cashing) return false;
    if (rd.cooldown > 0 || playerInFlight() >= 3) { return false; }
    const type = rd.queue.shift();
    let x = Board.launcher.x;
    if (rd.rules.fumble) { x = rand(40, BW - 40); Board.launcher.x = x; }
    const b = Board.spawn(x, LAUNCH_Y, type);
    b.player = true; b.startX = x; b.first = rd.dropped === 0;
    rd.dropped++; run.stats.drops++;
    initBall(b);
    if (has('infinity') && rd.dropped % 3 === 0) after(0.28, () => { const d = Board.spawn(x + rand(-3, 3), LAUNCH_Y, type, { bonus: true }); d.player = false; initBall(d); FX.ring(x, LAUNCH_Y, '#fff3d6', 4, 24, 0.4); procId('infinity', 'AGAIN!', 'k'); });
    if (rd.rules.wind) { rd.wind = rd.dropped % 2 ? 1 : -1; Board.wind = rd.wind * 240; UI.wind(rd.wind); }
    const L = Board.launcher; L.open = 1; L.recoil = 1; L.load = 0;
    Board.nextBall = rd.queue[0] || null;
    rd.cooldown = 0.38;
    G.focus = b;
    Sound.drop();
    Meta.ach('first'); Meta.data.stats.drops++;
    UI.ballsLeft(); UI.calc(b.points, b.mult, true);
    return true;
  }
  function initBall(b) {
    const d = BALLS[b.type];
    if (d && d.start) d.start(b);
    const S = ctx(b, -1, 0, false, 'start');
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.start) cd.start(c, S); }
    if (G.run.kindling > 0 && b.player) { G.run.kindling--; b.kindle = true; }
  }

  /* ---------------- scoring context ---------------- */
  function ctx(b, si, depth, remote, phase) {
    const s = si >= 0 ? Board.slots[si] : null;
    const S = {
      G, run: G.run, rd: G.rd, ball: b, slot: si, pin: si >= 0 ? G.run.pins[si] : null, depth, remote, phase,
      x: s ? s.x : b.x, y: s ? s.y : b.y, quietText: false, pIdx: -1, pocket: null,
      pts(n, src, quiet) {
        if (b.type === 'lead' && !src && phase === 'pin') n *= 2;
        n = Math.round(n); if (!n) return;
        b.points += n; out(this, '+' + fmt(n), 'p', src, quiet);
      },
      mult(n, src, quiet) { if (!n) return; b.mult += n; out(this, '+' + fmtM(n) + ' MULT', 'm', src, quiet); },
      xm(f, src, quiet, label) { b.mult *= f; out(this, (label ? label + ' ' : '') + 'x' + fmtM(f), 'x', src, quiet); },
      cash(n, src) { cash(n, src && src.id ? src : null, this.x, this.y); },
      chance: (n, d) => chance(n, d, b),
      once(tag) { const k = tag + ':' + si; if (b.once.has(k)) return false; b.once.add(k); return true; },
      has,
      spin() { Reels.add(1, {}); boardText(this.x, this.y - 6, 'SPIN!', 'k'); },
      bell() {
        G.rd.bells++;
        const need = has('belltower') ? 4 : 8;
        if (G.rd.bells >= need) { G.rd.bells = 0; Reels.add(1, {}); boardText(this.x, this.y - 8, 'BELLS!', 'k'); FX.ring(this.x, this.y, '#ffd36b', 6, 40, 0.5, 2.5); }
      },
      explode(R) { explodeAt(si, R * (has('fuse') ? 1.5 : 1), b, depth); if (has('fuse')) this.mult(4, has('fuse')); },
      clone(n) { for (let i = 0; i < n; i++) spawnClone(b, this.x, this.y, i, n); },
      warp() {
        if (b.warped || remote) return;
        b.warped = true; b.warpT = 0.38; G.rd.elev++;
        if (G.rd.elev >= 6) Meta.ach('elevator');
        FX.ring(this.x, this.y, '#3fe8d0', 26, 2, 0.4, 2.5); FX.dots(this.x, this.y, 10, '#3fe8d0', 60, 6, 0.5);
        boardText(this.x, this.y - 6, 'GOING UP', 'k');
      },
      zap(n) {
        const f = Board.fx[si];
        if (depth > 3 || f.zap > B_T()) return;
        f.zap = B_T() + 0.45;
        n += has('tesla') ? 2 : 0;
        const s0 = Board.slots[si], cands = [];
        G.run.pins.forEach((p, i) => { if (p && i !== si) { const d = Math.hypot(Board.slots[i].x - s0.x, Board.slots[i].y - s0.y); if (d < 170) cands.push(i); } });
        for (let k = 0; k < n && cands.length; k++) {
          const j = Math.floor(Math.random() * cands.length), ti = cands.splice(j, 1)[0], t = Board.slots[ti];
          FX.bolt(s0.x, s0.y, t.x, t.y);
          pinHit(b, ti, depth + 1, true);
          if (has('tesla')) { b.mult += 1; }
        }
        Sound.pin(0, 'rod', pan(s0.x));
        FX.shake(0.12);
      },
      echo(L) {
        const last = b.lastSpecial;
        if (last < 0 || last === si || depth > 3 || !G.run.pins[last]) return;
        const t = Board.slots[last];
        FX.bolt(Board.slots[si].x, Board.slots[si].y, t.x, t.y, '#fff0c8');
        for (let k = 0; k < L; k++) pinHit(b, last, depth + 1, true);
      },
      face(r) { Board.fx[si].face = clamp(r, 1, 6); Board.pinsDirty = true; boardText(this.x, this.y - 4, 'ROLLED ' + r, 'k'); },
      flip() { Board.fx[si].flip = 1; Board.pinsDirty = true; },
      grow(p) { Board.pinsDirty = true; if ((p.g || 1) >= 50) Meta.ach('sprout50'); if (Math.random() < 0.3) FX.leaves(this.x, this.y, 2); },
      sparkle() { FX.leaves(this.x, this.y, 7); FX.stars(this.x, this.y, 4, '#b8ff9a', 90); },
    };
    return S;
  }
  const B_T = () => Board.t;
  function out(S, text, kind, src, quiet) {
    const isCharm = src && typeof src === 'object' && src.id;
    if (S.phase === 'land') { S.steps.push({ text, kind, src: isCharm ? src : null }); return; }
    if (isCharm) proc(src, text, kind, quiet);
    if (quiet && isCharm) return;
    if (S.phase === 'start') return;
    boardText(S.x, S.y, text, kind === 'x' ? 'x' : kind, false);
  }

  /* ---------------- pins ---------------- */
  function onPinHit(b, si, imp) {
    if (b.demo) { demoHit(b, si); return; }
    if (!G.run || !G.rd) return;
    if (Board.fx[si].off > 0) { Sound.wall(pan(Board.slots[si].x)); return; }
    pinHit(b, si, 0, false, imp);
  }
  function pinHit(b, si, depth, remote) {
    const run = G.run, rd = G.rd, pin = run.pins[si];
    if (!pin || !rd) return;
    const f = Board.fx[si];
    if (f.off > 0) return;
    const def = PINS[pin.t], s = Board.slots[si];
    b.hits++;
    if (pin.t !== 'basic') b.special++;
    const S = ctx(b, si, depth, remote, 'pin');
    let reps = b.type === 'comet' ? 2 : 1;
    if (pin.t !== 'basic' && !b.echoFirst && has('echochamber')) { b.echoFirst = true; reps *= 2; procId('echochamber', 'TWICE', 'k'); }
    for (let k = 0; k < reps; k++) {
      def.hit(S, pin.l, pin);
      if (b.type === 'rubber') S.pts(2);
      for (const c of active()) { const cd = CHARMS[c.id]; if (cd.pin) cd.pin(c, S); }
    }
    if (pin.t !== 'basic' && pin.t !== 'echo') b.lastSpecial = si;
    if (rd.hot.includes(si) && S.once('hot')) hotHit(b, si, S);
    rd.heat += (pin.t === 'basic' ? 1 : 2.5) * (vcount('v_furnace') ? 1.5 : 1);
    if (rd.heat >= 100) { rd.heat -= 100; Reels.add(1, { boost: 2.5 }); Sound.heat(); UI.heatFull(); boardText(s.x, s.y - 10, 'HEAT SPIN!', 'k'); }
    if (b.type === 'cluster' && !b.burst && b.r >= BALL_R) { b.burst = true; burstCluster(b); }
    if (b.type === 'bomb' && b.hits >= 8 && !b.bombed) { b.bombed = true; explodeAt(-1, 115, b, depth, b.x, b.y); }
    if (b.hits > run.stats.maxHits) run.stats.maxHits = b.hits;
    if (b.hits === 25) Meta.ach('combo25');
    if (b.hits === 50) Meta.ach('combo50');
    // juice
    f.fl = 1; f.sq = Math.max(f.sq, 0.85);
    if (!remote || Math.random() < 0.5) Sound.pin(b.hits, PIN_SOUND[pin.t], pan(s.x));
    const col = Art.PIN_GLOW[pin.t] || '#ffd98a';
    if (pin.t === 'basic') { FX.sparks(s.x, s.y, 3, '#fff1c8', 130); FX.ring(s.x, s.y, '#ffe6a8', 4, 13, 0.22, 1.2); }
    else {
      FX.sparks(s.x, s.y, 7, col, 190); FX.ring(s.x, s.y, col, 5, pin.t === 'bumper' ? 34 : 20, 0.32, 1.8);
      if (pin.t === 'bumper') FX.shake(0.08);
      if (pin.t === 'gold') FX.coins(s.x, s.y, 2);
      if (pin.t === 'prism') FX.stars(s.x, s.y, 5, pickR(['#9ff5e8', '#ffeaa8', '#ffb08a']));
    }
    if (b.hits >= 10 && b.hits % 5 === 0 && !b.bonus) {
      const words = ['NICE', 'GREAT', 'HOT', 'WILD', 'INSANE', 'UNREAL', 'GODLIKE'];
      FX.text(b.x, b.y - 18, b.hits + ' HITS ' + words[Math.min(words.length - 1, b.hits / 5 - 2)], '#fff3d6', 10 + Math.min(6, b.hits / 10), { dur: 0.9, rise: 30 });
    }
    if (b === G.focus) UI.calc(b.points, b.mult);
  }
  function hotHit(b, si, S) {
    const gold = Board.hotGold, s = Board.slots[si];
    S.mult(3); S.pts(10);
    if (G.rd.coal) S.xm(2);
    if (gold) { S.xm(1.5); S.cash(2); }
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.hot) cd.hot(c, S); }
    FX.embers(s.x, s.y, 16, gold ? '#ffd84a' : '#ff7a1c'); FX.sparks(s.x, s.y, 16, gold ? '#ffe680' : '#ff9a3a', 260);
    FX.ring(s.x, s.y, gold ? '#ffd84a' : '#ff7a1c', 6, 48, 0.5, 3);
    FX.text(s.x, s.y - 22, gold ? 'GOLDEN!' : 'HOT!', gold ? '#ffd84a' : '#ff8a3a', 15, { dur: 1, rise: 36, pop: 1.3 });
    FX.shake(0.18); FX.stop(0.035); buzz(15);
    Sound.hot(gold);
  }
  function explodeAt(si, R, b, depth, ex, ey) {
    const s = si >= 0 ? Board.slots[si] : { x: ex, y: ey };
    if (si >= 0) { Board.fx[si].off = 3; Board.pinsDirty = true; }
    b.kegs++;
    if (b.kegs >= 3) Meta.ach('chain3');
    FX.dots(s.x, s.y, 14, '#ff9a3a', 140, 16, 0.5); FX.sparks(s.x, s.y, 34, '#ffd27a', 360, { life: 1.4 }); FX.smoke(s.x, s.y, 9);
    FX.ring(s.x, s.y, '#ffb43a', 8, R, 0.45, 4); FX.ring(s.x, s.y, '#fff3d6', 4, R * 0.6, 0.3, 2);
    FX.shake(0.5); FX.stop(0.06); buzz(40);
    Sound.boom(1);
    boardText(s.x, s.y - 14, 'KABOOM', 'k');
    for (const bb of Board.balls) { if (!bb.alive) continue; const dx = bb.x - s.x, dy = bb.y - s.y, d = Math.hypot(dx, dy); if (d < R && d > 1) { bb.vx += (dx / d) * 260 * (1 - d / R); bb.vy += (dy / d) * 260 * (1 - d / R); } }
    if (depth > 4) return;
    G.run.pins.forEach((p, i) => {
      if (!p || i === si) return;
      const t = Board.slots[i];
      if (Math.hypot(t.x - s.x, t.y - s.y) < R) pinHit(b, i, depth + 1, true);
    });
  }
  function spawnClone(b, x, y, i, n) {
    if (Board.balls.length > 60) return;
    if (b.clone && !has('matryoshka')) return;
    if (b.gen >= 3) return;
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.7 + rand(-0.25, 0.25) + (n === 1 ? rand(-0.8, 0.8) : 0);
    const c = Board.spawn(x, y, b.type === 'cluster' ? 'steel' : b.type, { vx: Math.cos(a) * 220, vy: Math.sin(a) * 160, clone: true, bonus: true, gen: b.gen + 1 });
    c.player = false;
    if (has('mitosis')) { c.points = b.points; c.mult = b.mult; }
    if (has('matryoshka')) c.mult += 2;
    c.once = new Set(b.once);
    FX.ring(x, y, '#6fffd2', 4, 30, 0.35, 2); FX.sparks(x, y, 10, '#6fffd2', 200);
    crowdCheck();
  }
  function burstCluster(b) {
    for (let i = 0; i < 2; i++) {
      const a = -Math.PI / 2 + (i ? 0.8 : -0.8);
      const c = Board.spawn(b.x, b.y, 'steel', { vx: Math.cos(a) * 200, vy: Math.sin(a) * 120, clone: true, bonus: true, gen: b.gen + 1, r: 6 });
      c.player = false;
    }
    b.r = 6;
    FX.sparks(b.x, b.y, 14, '#f0d8a0', 220); FX.ring(b.x, b.y, '#f0d8a0', 4, 28, 0.35, 2); Sound.pin(0, 'split', pan(b.x));
    crowdCheck();
  }
  function crowdCheck() { const n = Board.ballsAlive(); if (G.rd && n > G.rd.maxCrowd) G.rd.maxCrowd = n; if (n >= 12) Meta.ach('crowd'); }
  function onWall(b) {
    if (b.demo || !G.rd) return;
    Sound.wall(pan(b.x));
    const S = ctx(b, -1, 0, false, 'pin'); S.x = b.x; S.y = b.y;
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.wall) cd.wall(c, S); }
  }
  function onDivider(b, px) { if (b.demo) return; Sound.wall(pan(px)); FX.sparks(px, DIV_TOP, 3, '#ffe6a8', 120); }
  function onWarped(b) { FX.ring(b.x, b.y, '#3fe8d0', 2, 26, 0.4, 2.5); FX.dots(b.x, b.y, 8, '#3fe8d0', 70, 6, 0.4); Sound.pin(0, 'warp', pan(b.x)); }

  /* ---------------- landing ---------------- */
  function onLand(b, p) {
    if (b.demo) { demoLand(b, p); return; }
    const run = G.run, rd = G.rd;
    if (!run || !rd || rd.ended) return;
    if (has('ouro') && !b.looped && chance(1, 3, b)) {
      b.looped = true; b.alive = true; b.warpT = 0.45; b.y = LAND_Y - 2;
      FX.ring(pocketX(p), DIV_TOP + 30, '#3fe8d0', 30, 4, 0.4, 3); procId('ouro', 'LOOP!', 'k'); Sound.pin(0, 'warp', pan(pocketX(p)));
      return;
    }
    const P = run.pockets[p], sealed = !!(rd.rules.jammer && P.fever);
    const S = ctx(b, -1, 0, false, 'land');
    S.steps = []; S.pIdx = p; S.pocket = P; S.x = pocketX(p); S.y = DIV_TOP + 18;
    if (b.player) b.last = rd.queue.length === 0 && !Board.balls.some(o => o.alive && o.player && o !== b);
    for (const c of active()) {
      const cd = CHARMS[c.id];
      if (cd.pre) cd.pre(c, S);
      if (c.ed === 'holo') S.mult(8, c);
      if (c.ed === 'foil') S.pts(40, c);
    }
    let pm = P.m;
    if (!P.fever) pm += rd.pocketBonus;
    if (rd.rules.tight && (p === 0 || p === NPOCK - 1)) pm = 0.5;
    if (has('whale')) pm *= 2;
    if (rd.fever) pm *= 2;
    S.xm(pm, 'pocket');
    if (P.gold) S.cash(P.gold);
    let spun = false;
    if (P.fever && !sealed) { Reels.add(1, {}); spun = true; UI.hint('fever'); }
    if (b.type === 'glass') {
      S.xm(has('glassjaw') ? 5 : 3);
      if (Math.random() < 0.25 && b.player) {
        const i = run.bag.indexOf('glass'); if (i >= 0) run.bag[i] = 'steel';
        FX.shards(S.x, S.y - 10, 22); Sound.boom(0.4); boardText(S.x, S.y - 30, 'SHATTERED', 'k'); UI.bag();
      }
    }
    if (b.type === 'gold') S.cash(1);
    if (b.type === 'eight' && !spun) { Reels.add(1, {}); spun = true; }
    if (b.type === 'echo' && !b.bonus) after(0.2, () => { const e = Board.spawn(b.startX || pocketX(p), LAUNCH_Y, 'steel', { bonus: true }); e.player = false; initBall(e); FX.ring(e.x, e.y, '#5fd8c8', 4, 22, 0.4); });
    if (b.kindle) S.xm(2);
    for (const c of active()) {
      const cd = CHARMS[c.id];
      if (cd.land) cd.land(c, S);
      if (c.ed === 'gilded') S.xm(1.5, c);
    }
    if (rd.rules.taxman) S.xm(0.5, 'boss');
    const score = Math.max(0, Math.round(b.points * b.mult));
    rd.score += score; run.stats.total += score; rd.lastScore = score;
    if (score > run.stats.best) run.stats.best = score;
    Meta.statMax('bestBall', score);
    if (score >= 1000) Meta.ach('ball1k');
    if (score >= 1e5) Meta.ach('ball100k');
    if (score >= 1e7) Meta.ach('ball10m');
    rd.lastPocket = p;
    landFX(b, p, score, S, spun);
    if (b.player) { rollHot(); if (G.focus === b) G.focus = null; }
    if (!rd.met && rd.score >= rd.quota) quotaMet(b);
    UI.hint('score');
  }
  function landFX(b, p, score, S, spun) {
    const rd = G.rd, x = pocketX(p), lvl = clamp(Math.log10(1 + score) / Math.log10(1 + rd.quota), 0, 1.3);
    Board.pocketLight[p] = 1.2;
    const big = score >= rd.quota * 0.25;
    FX.sparks(x, DIV_TOP + 20, 10 + Math.round(lvl * 22), S.pocket.fever ? '#ff6a4a' : '#ffd98a', 260 + lvl * 200, { dir: -Math.PI / 2, spread: 0.9, g: 500 });
    FX.dots(x, DIV_TOP + 30, 6, S.pocket.fever ? '#ff4a2a' : '#ffcf4a', 80, 10, 0.4);
    if (big) { FX.shake(0.25 + Math.min(0.4, lvl * 0.3)); FX.stars(x, DIV_TOP + 10, 10, '#fff3c0', 220); }
    Sound.land(Math.min(1, lvl), pan(x));
    if (spun) FX.text(x, DIV_TOP - 14, 'SPIN!', '#ff8a6a', 13, { dur: 0.9, rise: 26, pop: 1.2 });
    // charm procs on land, staggered
    let i = 0;
    for (const st of S.steps) if (st.src) { const d = i++ * 90; setTimeout(() => proc(st.src, st.text, st.kind), d / GAME_SPEED); }
    const pocketStep = S.steps.find(s => s.kind === 'x' && !s.src);
    FX.text(x, DIV_TOP - 4, fmt(score), score >= rd.quota * 0.1 ? '#fff3d6' : '#efe2c2', clamp(11 + lvl * 9, 11, 22), { dur: 1.2, rise: 46, pop: 1.25 });
    if (pocketStep) FX.text(x, DIV_TOP + 26, pocketStep.text, '#ffd84a', 10, { dur: 0.7, rise: 10 });
    UI.calc(b.points, b.mult, false, score);
    const from = Board.toScreen(x, DIV_TOP), to = UI.scoreTarget();
    if (to) FX.stream(from.x, from.y, to.x, to.y, clamp(Math.round(3 + lvl * 9), 3, 14), score >= rd.quota * 0.2 ? '#ffd84a' : '#4fe3cf', () => UI.scoreBump(score), { dur: 0.55 });
    else UI.scoreBump(score);
  }
  function quotaMet(b) {
    const rd = G.rd;
    rd.met = true;
    const clutch = rd.queue.length === 0 && !Board.balls.some(o => o.alive && o.player);
    UI.stamp(clutch ? 'CLUTCH!' : 'QUOTA MET', clutch ? 'gold' : 'green');
    if (clutch) Meta.ach('clutch');
    Sound.quota(); buzz([40, 60, 80]);
    bulbs('win', 2.2);
    FX.confetti(clutch ? 140 : 70);
    FX.shake(0.35);
    if (rd.real < 25) Meta.ach('speed');
    UI.cashoutBtn(rd.queue.length > 0);
  }
  function cashOutEarly() {
    const rd = G.rd;
    if (!rd || !rd.met || rd.cashing || G.state !== 'play') return;
    rd.cashing = true; rd.unused = rd.queue.length; rd.queue.length = 0;
    Board.nextBall = null; UI.cashoutBtn(false); UI.ballsLeft();
    Sound.click();
  }

  /* ---------------- reels / jackpots / fever ---------------- */
  function jackpotOdds(opts = {}) {
    let p = 0.2;
    if (Meta.data.stats.jackpots === 0) p *= 3;
    if (has('rigged')) p *= 2;
    p *= Math.pow(1.5, vcount('v_reels'));
    if (G.run && G.run.oil > 0) { p *= 2; G.run.oil--; }
    if (opts.boost) p *= opts.boost;
    return p;
  }
  const canSpin = () => G.state === 'play' || G.state === 'intro';
  function onSpinStart() {
    G.run.stats.spins++;
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.spin) cd.spin(c, G); }
  }
  function onReach(tier) { bulbs('reach', 0); Board.bulbMode = 'reach'; if (tier >= 3) Meta.ach('premium'); }
  function restoreBulbs() { Board.bulbMode = G.rd && G.rd.fever ? 'fever' : G.bulbBase; }
  function jackpot(sym) {
    const run = G.run, rd = G.rd;
    if (!rd) return;
    run.stats.jackpots++;
    Meta.ach('jackpot'); Meta.data.stats.jackpots++;
    const big = sym === 'seven';
    Sound.jackpot(big);
    UI.jackpot(sym); buzz(big ? [60, 40, 60, 40, 160] : [30, 50, 30, 50, 90]);
    FX.shake(big ? 0.7 : 0.4); FX.stop(big ? 0.12 : 0.06);
    if (big) FX.confetti(200); else FX.confetti(50);
    bulbs('win', 2);
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.jackpot) cd.jackpot(c, G, sym); }
    const t = UI.reelsTarget();
    switch (sym) {
      case 'cherry': cash(3); if (t) FX.screenBurst(t.x, t.y, 20, '#ff4a3a'); break;
      case 'bell':
        rd.pocketBonus += 1; Board.pocketBonus = rd.pocketBonus; Board.bgDirty = true;
        for (let i = 0; i < NPOCK; i++) Board.pocketLight[i] = 1.5;
        break;
      case 'clover': rd.queue.push('steel', 'steel'); rd.total += 2; if (!Board.nextBall) Board.nextBall = rd.queue[0]; rd.cashing = false; UI.ballsLeft(); break;
      case 'bar': {
        const idx = G.run.pins.map((p, i) => (p ? i : -1)).filter(i => i >= 0);
        for (let k = 0; k < 3 && idx.length; k++) {
          const i = idx.splice(Math.floor(Math.random() * idx.length), 1)[0], p = G.run.pins[i], s = Board.slots[i];
          if (p.t === 'basic') { p.t = 'copper'; p.l = 1; } else p.l = Math.min(5, p.l + 1);
          after(0.15 * k, () => { FX.ring(s.x, s.y, '#ffd84a', 4, 30, 0.5, 2.5); FX.stars(s.x, s.y, 6, '#ffd84a'); boardText(s.x, s.y, 'UPGRADE', 'k'); Board.fx[i].fl = 1; Board.fx[i].sq = 1; });
        }
        Board.refresh();
        break;
      }
      case 'diamond': run.freeCaps++; break;
      case 'seven': startFever(); break;
    }
    after(2.2, restoreBulbs);
  }
  function reachFail() {
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.reachFail) cd.reachFail(c, G); }
    Sound.miss();
    UI.soClose();
    after(0.6, restoreBulbs);
  }
  function startFever() {
    const rd = G.rd;
    rd.fever = { left: 7 + (has('feverdream') ? 5 : 0), t: 1.2 };
    G.run.stats.fevers++;
    Meta.ach('fever'); Meta.data.stats.fevers++;
    Sound.fever(); Sound.music('fever', true);
    bulbs('fever'); Board.bulbMode = 'fever';
    UI.fever(true);
  }
  function feverTick(dt) {
    const rd = G.rd, f = rd.fever;
    Board.fever = Math.min(1, Board.fever + dt * 2);
    if (f.left > 0) {
      f.t -= dt;
      if (f.t <= 0) {
        f.t = 0.24; f.left--;
        const b = Board.spawn(rand(30, BW - 30), LAUNCH_Y - 10, 'steel', { bonus: true, vx: rand(-40, 40) });
        b.player = false; b.fever = true; initBall(b);
        FX.sparks(b.x, b.y, 6, '#ffd84a', 120);
      }
    } else if (!Board.balls.some(b => b.alive && b.fever)) {
      rd.fever = null; Board.fever = 0;
      UI.fever(false); Sound.music('lounge');
      G.bulbBase = 'play'; restoreBulbs();
    }
  }

  /* ---------------- nudge ---------------- */
  function nudge(dir) {
    if (G.state !== 'play') return;
    const rd = G.rd;
    if (rd.nudges <= 0) { Sound.deny(); UI.nudges(true); return; }
    if (rd.nudgeT > 0) return;
    rd.nudges--; rd.nudgeT = 0.3;
    let n = 0;
    for (const b of Board.balls) if (b.alive && b.warpT <= 0 && b.y > 40) { b.vx += dir * 230; b.vy -= 70; n++; }
    FX.shake(0.35); Sound.nudge(); UI.cabShake(dir); UI.nudges(); buzz(25);
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.nudge) cd.nudge(c, G); }
    Meta.data.stats.nudges++;
    if (Meta.data.stats.nudges >= 50) Meta.ach('nudge');
  }

  /* ---------------- round end ---------------- */
  function checkEnd(dtReal) {
    const rd = G.rd;
    if (!rd || rd.ended || G.state !== 'play') return;
    const waiting = (rd.queue.length > 0 && !rd.cashing) || Board.ballsAlive() > 0 || !Reels.idle() || (rd.fever && rd.fever.left > 0) || G.timers.length > 0;
    if (waiting) { rd.endT = 0; return; }
    rd.endT += dtReal;
    if (rd.endT < 0.65) return;
    if (rd.score >= rd.quota) { endRound(true); return; }
    const sw = has('secondwind');
    if (sw && !rd.windUsed) {
      rd.windUsed = true;
      G.run.charms.splice(G.run.charms.indexOf(sw), 1);
      rd.queue.push('steel', 'steel', 'steel'); rd.total += 3; Board.nextBall = 'steel';
      UI.banner('SECOND WIND', '+3 BALLS', 'gold'); UI.charms(); UI.ballsLeft(); Sound.whoosh();
      return;
    }
    endRound(false);
  }
  function endRound(win) {
    const rd = G.rd, run = G.run;
    rd.ended = true;
    UI.cashoutBtn(false);
    if (!win) { gameOver(); return; }
    run.stats.rounds++;
    Meta.data.stats.rounds++;
    if (rd.score >= rd.quota * 5) Meta.ach('overkill');
    const R = [];
    const reward = run.stake >= 1 && run.ri === 2 ? 0 : [3, 4, 5][run.ri];
    R.push([['Round A', 'Round B', 'Boss round'][run.ri] + ' cleared', reward]);
    if (rd.unused) R.push(['Unused balls x' + rd.unused, rd.unused * (has('pincher') ? 2 : 1)]);
    if (!CABINETS[run.cab].noInterest) {
      const cap = 5 + (has('compound') ? 5 : 0) + vcount('v_vault') * 5, i = Math.min(cap, Math.floor(Math.max(0, run.money) / 5));
      if (i > 0) R.push(['Interest ($1 per $5, max $' + cap + ')', i]);
    }
    for (const c of active()) { const cd = CHARMS[c.id]; if (cd.roundEnd) cd.roundEnd(c, G, R); }
    const total = R.reduce((a, l) => a + l[1], 0);
    G.state = 'cashout';
    bulbs('idle');
    Board.hot = [];
    Sound.music('shop');
    UI.cashout({ lines: R, total, score: rd.score, quota: rd.quota, ratio: rd.score / rd.quota }).then(amount => afterCashout(amount));
  }
  function afterCashout(amount) {
    const run = G.run;
    run.money += amount;
    UI.money(true);
    const wasBoss = run.ri === 2;
    run.ri++;
    if (run.ri > 2) { run.ri = 0; run.floor++; }
    if (run.floor >= 4) Meta.ach('floor4');
    if (run.floor >= 12) Meta.ach('floor12');
    if (wasBoss && run.floor === 9 && !run.endless) { victory(); return; }
    if (wasBoss) {
      const pool = Object.keys(VOUCHERS).filter(v => !(v === 'v_twin' && run.vouchers.includes('v_twin')));
      G.rng.shuffle(pool);
      run.pendingVoucher = pool.slice(0, 2);
      run.phase = 'voucher';
      save();
      voucherStep();
    } else openShop();
  }
  function voucherStep() {
    const run = G.run;
    G.state = 'voucher';
    UI.voucherPick(run.pendingVoucher).then(id => {
      if (id) { run.vouchers.push(id); applyVoucher(id); Meta.discover('voucher', id); }
      run.pendingVoucher = null;
      openShop();
    });
  }
  function applyVoucher(id) {
    const run = G.run;
    if (id === 'v_slot') run.charmSlots++;
    if (id === 'v_pocket') run.ticketSlots++;
  }
  function gameOver() {
    const run = G.run;
    G.state = 'over';
    bulbs('fail'); Board.bulbT = 0; Board.hot = [];
    Sound.fail(); Sound.music('off'); buzz(220);
    const xp = calcXP(false);
    const res = Meta.endRun(run, false, xp);
    UI.gameOver({ run, rd: G.rd, xp, res });
  }
  function victory() {
    const run = G.run;
    G.state = 'victory';
    if (!run.won) { run.won = true; Meta.data.stats.wins++; Meta.save(); }
    Meta.ach('win');
    if (run.stake >= 2) Meta.ach('stake3');
    Meta.winCab(run.cab, run.stake);
    bulbs('win'); Sound.jackpot(true); Sound.music('fever', true);
    FX.confetti(260);
    UI.victory({ run }).then(choice => {
      if (choice === 'endless') {
        run.endless = true; Sound.music('shop');
        const pool = Object.keys(VOUCHERS).filter(v => !(v === 'v_twin' && run.vouchers.includes('v_twin')));
        G.rng.shuffle(pool); run.pendingVoucher = pool.slice(0, 2); run.phase = 'voucher'; save(); voucherStep();
      }
      else {
        const xp = calcXP(true);
        const res = Meta.endRun(run, true, xp);
        UI.gameOver({ run, rd: G.rd, xp, res, won: true });
      }
    });
  }
  function calcXP(won) {
    const s = G.run.stats;
    return Math.round(50 + s.rounds * 32 + s.jackpots * 12 + s.fevers * 30 + (won || G.run.won ? 450 : 0) + Math.log10(Math.max(1, s.best)) * 14);
  }
  function abandon() {
    if (!G.run) return;
    const xp = Math.round(calcXP(false) * 0.5);
    const res = Meta.endRun(G.run, false, xp);
    G.state = 'over';
    UI.gameOver({ run: G.run, rd: G.rd, xp, res, abandoned: true });
  }

  /* ---------------- shop ---------------- */
  function price(base) { let p = base; if (vcount('v_sale')) p = Math.ceil(p * 0.75); if (G.run.stake >= 3) p += 1; return Math.max(1, p); }
  function rollEdition() {
    const r = G.rng.next() * 100;
    if (r < 0.4) return 'phantom';
    if (r < 1.3) return 'gilded';
    if (r < 3.5) return 'holo';
    if (r < 7) return 'foil';
    return null;
  }
  function charmPool(exclude) {
    const owned = new Set(G.run.charms.map(c => c.id));
    return CHARM_LIST.filter(c => !owned.has(c.id) && !exclude.has(c.id) && Meta.unlocked('charm', c.id));
  }
  function rollCharm(exclude, weights = [[1, 66], [2, 26], [3, 7.4], [4, 0.6]], minRar = 1) {
    const pool = charmPool(exclude);
    if (!pool.length) return null;
    const rar = G.rng.weighted(weights.filter(w => w[0] >= minRar));
    let c = pool.filter(d => d.rar === rar);
    if (!c.length) c = pool.filter(d => d.rar >= minRar);
    if (!c.length) c = pool;
    const d = G.rng.pick(c);
    exclude.add(d.id);
    const ed = rollEdition();
    return { kind: 'charm', id: d.id, ed, price: price(d.cost + (ed ? EDITIONS[ed].cost : 0)) };
  }
  function rollPin() {
    const pool = Object.keys(PINS).filter(t => t !== 'basic' && Meta.unlocked('pin', t));
    const rar = G.rng.weighted([[1, 48], [2, 36], [3, 16]]);
    let c = pool.filter(t => PINS[t].rar === rar); if (!c.length) c = pool;
    const t = G.rng.pick(c);
    return { kind: 'pin', id: t, price: price(PINS[t].cost) };
  }
  function rollBall() {
    const pool = Object.keys(BALLS).filter(t => t !== 'steel' && Meta.unlocked('ball', t));
    const rar = G.rng.weighted([[1, 45], [2, 38], [3, 17]]);
    let c = pool.filter(t => BALLS[t].rar === rar); if (!c.length) c = pool;
    const t = G.rng.pick(c);
    return { kind: 'ball', id: t, price: price(BALLS[t].cost) };
  }
  function rollTicket(ex) {
    const pool = Object.keys(TICKETS).filter(t => Meta.unlocked('ticket', t) && !(ex && ex.has(t)));
    const t = G.rng.pick(pool); if (ex) ex.add(t);
    return { kind: 'ticket', id: t, price: price(TICKETS[t].cost) };
  }
  function rollGood() { const k = G.rng.weighted([['pin', 44], ['ball', 24], ['ticket', 32]]); return k === 'pin' ? rollPin() : k === 'ball' ? rollBall() : rollTicket(); }
  function rollCaps() {
    const caps = [];
    const keys = ['charm', 'pin', 'ball', 'ticket'];
    const a = G.rng.weighted([['charm', 40], ['pin', 30], ['ball', 15], ['ticket', 15]]);
    caps.push(a);
    let b = G.rng.chance(0.12) ? 'mega' : G.rng.pick(keys);
    if (b === a) b = keys[(keys.indexOf(a) + 1) % keys.length];
    caps.push(b);
    return caps.map(k => ({ kind: 'cap', id: k, price: price(CAPSULES[k].cost) }));
  }
  function genShop() {
    const run = G.run, ex = new Set();
    const n = 2 + vcount('v_shelf');
    const shop = { charms: [], goods: [], caps: rollCaps(), rerolls: 0, free: vcount('v_reroll') > 0, quip: G.rng.pick(QUIPS) };
    for (let i = 0; i < n; i++) { const c = rollCharm(ex); if (c) shop.charms.push(c); }
    if (run.floor === 1 && run.ri === 1 && shop.charms.length) {
      const owned = new Set(run.charms.map(c => c.id)), core = ['die', 'cushion', 'penny', 'hands', 'opener'].filter(id => !owned.has(id) && !ex.has(id));
      if (core.length) { const id = G.rng.pick(core); shop.charms[0] = { kind: 'charm', id, ed: null, price: price(CHARMS[id].cost) }; }
    }
    shop.goods = [rollGood(), rollGood()];
    if (CABINETS[run.cab].scratch) shop.goods.push({ kind: 'ticket', id: 'scratch', price: price(TICKETS.scratch.cost) });
    while (run.freeCaps > 0) { run.freeCaps--; shop.caps.unshift({ kind: 'cap', id: G.rng.pick(['charm', 'pin', 'ball']), price: 0, free: true }); }
    run.shop = shop;
  }
  function openShop(resume) {
    const run = G.run;
    if (!resume || !run.shop) genShop();
    run.phase = 'shop';
    G.state = 'shop';
    G.rd = null;
    Board.balls.length = 0; Board.hot = []; Board.fog = false; Board.wind = 0; Board.gravK = 1; Board.fever = 0;
    Board.setPins(run.pins); Board.pocketBonus = 0; Board.setPockets(run.pockets);
    Board.launcher.show = false;
    Reels.reset();
    bulbs('idle');
    Sound.music('shop');
    save();
    UI.openShop();
    UI.hint('shop');
  }
  function rerollCost() { const s = G.run.shop; if (s.free && s.rerolls === 0) return 0; return Math.max(0, 2 + s.rerolls - (has('coupon') ? 1 : 0) - (s.free ? 1 : 0)); }
  function reroll() {
    const run = G.run, s = run.shop, cost = rerollCost();
    if (run.money < cost) { Sound.deny(); return false; }
    run.money -= cost; s.rerolls++;
    const ex = new Set();
    s.charms = s.charms.map(() => rollCharm(ex)).filter(Boolean);
    s.goods = [rollGood(), rollGood()];
    if (CABINETS[run.cab].scratch) s.goods.push({ kind: 'ticket', id: 'scratch', price: price(TICKETS.scratch.cost) });
    Sound.reroll(); save();
    UI.refreshShop(true); UI.money();
    return true;
  }
  function addCharm(id, ed) {
    const c = mkCharm(id, ed);
    G.run.charms.push(c);
    Meta.discover('charm', id);
    const d = CHARMS[id];
    if (d.buy) d.buy(c, G);
    if (d.rar === 4) Meta.ach('legend');
    if (ed === 'gilded' || ed === 'phantom') Meta.ach('shiny');
    if (charmSlotsUsed() >= G.run.charmSlots) Meta.ach('fullhouse');
    if (id === 'magnetism') Board.magnetK = 2;
    UI.charms(c.uid);
    return c;
  }
  async function buy(kind, idx) {
    const run = G.run, s = run.shop;
    if (G.state !== 'shop' || G.busy) return;
    const list = kind === 'charm' ? s.charms : kind === 'cap' ? s.caps : s.goods;
    const it = list[idx];
    if (!it || it.sold) return;
    if (run.money < it.price) { Sound.deny(); UI.toast('Not enough cash', 'bad'); return; }
    if (it.kind === 'cap') {
      if ((it.id === 'charm' || it.id === 'mega') && emptyCharmSlots() <= 0) { Sound.deny(); UI.toast('Charm slots full. Sell a charm first.', 'bad'); return; }
      if (it.id === 'ticket' && run.tickets.length >= run.ticketSlots) { Sound.deny(); UI.toast('Ticket slots full. Use one first.', 'bad'); return; }
      openCapsule(idx, it.id); return;
    }
    if (it.kind === 'charm' && it.ed !== 'phantom' && emptyCharmSlots() <= 0) { Sound.deny(); UI.toast('Charm slots full. Sell one first.', 'bad'); return; }
    if (it.kind === 'ticket' && run.tickets.length >= run.ticketSlots) { Sound.deny(); UI.toast('Ticket slots full. Use one first.', 'bad'); return; }
    G.busy = true;
    run.money -= it.price; it.sold = true;
    Sound.buy(); UI.money();
    UI.flyFromShop(kind, idx);
    let ok = true;
    if (it.kind === 'charm') addCharm(it.id, it.ed);
    else if (it.kind === 'ticket') { run.tickets.push({ id: it.id }); Meta.discover('ticket', it.id); UI.tickets(); }
    else if (it.kind === 'pin') ok = await placePin(it.id);
    else if (it.kind === 'ball') ok = await addBall(it.id);
    if (!ok) { run.money += it.price; it.sold = false; UI.money(); }
    G.busy = false;
    save();
    UI.refreshShop();
  }
  function placePin(type) {
    return new Promise(resolve => {
      Meta.discover('pin', type);
      UI.hint('place');
      pickSlot(`Place your ${PINS[type].name}`, i => true, type).then(i => {
        if (i < 0) { resolve(false); return; }
        const cur = G.run.pins[i], s = Board.slots[i];
        if (cur && cur.t === type) { cur.l = Math.min(5, cur.l + 1); boardText(s.x, s.y, 'LEVEL ' + cur.l, 'k'); }
        else G.run.pins[i] = { t: type, l: 1 };
        Board.refresh();
        Board.fx[i].fl = 1; Board.fx[i].sq = 1;
        FX.ring(s.x, s.y, '#ffd84a', 4, 34, 0.5, 2.5); FX.stars(s.x, s.y, 8, '#ffe6a8'); FX.sparks(s.x, s.y, 12, '#ffd84a', 180);
        Sound.pin(8, PIN_SOUND[type], pan(s.x)); Sound.clunk();
        resolve(true);
      });
    });
  }
  function pickSlot(text, filter, ghost) {
    return new Promise(resolve => {
      UI.hideShop();
      Board.pick = { kind: 'slot', filter, ghost, resolve: i => { Board.pick = null; UI.placeBar(null); UI.showShop(); resolve(i); } };
      UI.placeBar(text, () => Board.pick && Board.pick.resolve(-1));
    });
  }
  function pickPocket(text, filter) {
    return new Promise(resolve => {
      UI.hideShop();
      Board.pick = { kind: 'pocket', filter, resolve: i => { Board.pick = null; UI.placeBar(null); UI.showShop(); resolve(i); } };
      UI.placeBar(text, () => Board.pick && Board.pick.resolve(-1));
    });
  }
  function boardClick(lx, ly) {
    const P = Board.pick;
    if (!P) return false;
    if (P.kind === 'slot') { const i = Board.nearestSlot(lx, ly); if (i >= 0 && P.filter(i)) { Sound.click(); P.resolve(i); } }
    else { const i = Board.pocketAt(lx, ly); if (i >= 0 && (!P.filter || P.filter(i))) { Sound.click(); P.resolve(i); } }
    return true;
  }
  async function addBall(type) {
    const run = G.run;
    Meta.discover('ball', type);
    let i = run.bag.indexOf('steel');
    if (i < 0) { i = await UI.pickBag('Your bag is full of specials. Replace which ball?'); if (i < 0) return false; }
    run.bag[i] = type;
    UI.bag(i);
    return true;
  }
  function sell(uidv) {
    const run = G.run, i = run.charms.findIndex(c => c.uid === uidv);
    if (i < 0) return;
    const c = run.charms[i];
    if (CHARMS[c.id].nosell) { Sound.deny(); UI.toast('The Loan Shark does not let go.', 'bad'); return; }
    if (G.state === 'play' && G.rd && Board.ballsAlive() > 0) { Sound.deny(); UI.toast('Wait for the balls to land.', 'bad'); return; }
    const p = sellPrice(c);
    run.charms.splice(i, 1);
    run.money += p;
    if (c.id === 'magnetism') Board.magnetK = 1;
    Sound.sell(); UI.charms(); UI.money(true); UI.toast(`Sold ${CHARMS[c.id].name} for $${p}`);
    save();
  }
  function moveCharm(from, to) {
    const a = G.run.charms;
    if (from === to || from < 0 || to < 0 || from >= a.length || to >= a.length) return;
    const [c] = a.splice(from, 1); a.splice(to, 0, c);
    UI.charms(); save();
  }
  async function openCapsule(idx, kind) {
    const run = G.run, it = run.shop.caps[idx];
    if (G.busy || !it || it.sold) return;
    if (run.money < it.price) { Sound.deny(); return; }
    G.busy = true;
    run.money -= it.price; it.sold = true; UI.money();
    const n = (kind === 'mega' ? 4 : 3) + vcount('v_capsule');
    const ex = new Set(), choices = [];
    for (let i = 0; i < n; i++) {
      let c = null;
      if (kind === 'charm') c = rollCharm(ex, [[1, 48], [2, 36], [3, 14], [4, 2]]);
      else if (kind === 'mega') c = rollCharm(ex, [[1, 30], [2, 40], [3, 25], [4, 5]], i === 0 ? 3 : 1);
      else if (kind === 'pin') { let g = 0; do { c = rollPin(); } while (choices.some(o => o.id === c.id) && g++ < 12); }
      else if (kind === 'ball') { let g = 0; do { c = rollBall(); } while (choices.some(o => o.id === c.id) && g++ < 12); }
      else c = rollTicket(ex);
      if (c) choices.push(c);
    }
    const best = Math.max(...choices.map(c => (c.kind === 'charm' ? CHARMS[c.id].rar : c.kind === 'pin' ? PINS[c.id].rar : c.kind === 'ball' ? BALLS[c.id].rar : 1)));
    UI.hideShop();
    const pick = await UI.capsule({ kind, cap: CAPSULES[kind], choices, best, canCharm: emptyCharmSlots() > 0, canTicket: run.tickets.length < run.ticketSlots });
    let ok = true;
    if (pick >= 0) {
      const c = choices[pick];
      if (c.kind === 'charm') addCharm(c.id, c.ed);
      else if (c.kind === 'ticket') { run.tickets.push({ id: c.id }); Meta.discover('ticket', c.id); UI.tickets(); }
      else if (c.kind === 'pin') ok = await placePin(c.id);
      else if (c.kind === 'ball') ok = await addBall(c.id);
    }
    UI.showShop();
    G.busy = false;
    save();
    UI.refreshShop();
    return ok;
  }
  function nextRound() {
    if (G.state !== 'shop' || G.busy) return;
    G.run.shop = null;
    UI.closeShop();
    startRound();
  }

  /* ---------------- tickets ---------------- */
  async function useTicket(i) {
    const run = G.run, t = run.tickets[i];
    if (!t || G.busy) return;
    const def = TICKETS[t.id];
    if (def.round && G.state !== 'play') { UI.toast('Use this one during a round.', 'bad'); Sound.deny(); return; }
    if (def.target && G.state !== 'shop') { UI.toast('Use this one in the shop.', 'bad'); Sound.deny(); return; }
    if (G.state !== 'shop' && G.state !== 'play') return;
    G.busy = true;
    let used = true;
    const special = k => run.pins[k] && run.pins[k].t !== 'basic';
    switch (t.id) {
      case 'polish': {
        const k = await pickSlot('Polish which pin?', k2 => !!run.pins[k2] && run.pins[k2].l < 5, null);
        if (k < 0) { used = false; break; }
        const p = run.pins[k];
        if (p.t === 'basic') { p.t = 'copper'; p.l = 1; } else p.l++;
        fxSlot(k, 'POLISHED'); break;
      }
      case 'pliers': {
        const k = await pickSlot('Pull which pin?', k2 => !!run.pins[k2], null);
        if (k < 0) { used = false; break; }
        run.pins[k] = null; const s = Board.slots[k]; FX.sparks(s.x, s.y, 10, '#ffe6a8', 160); FX.smoke(s.x, s.y, 3); Sound.clunk(); break;
      }
      case 'wrench': {
        const a = await pickSlot('Pick a special pin to move', special, null);
        if (a < 0) { used = false; break; }
        const b = await pickSlot('Move it where?', k2 => k2 !== a, run.pins[a].t);
        if (b < 0) { used = false; break; }
        const tmp = run.pins[b]; run.pins[b] = run.pins[a]; run.pins[a] = tmp;
        fxSlot(b, 'MOVED'); break;
      }
      case 'copy': {
        const a = await pickSlot('Pick a special pin to copy', special, null);
        if (a < 0) { used = false; break; }
        const b = await pickSlot('Copy it onto which Brass Pin?', k2 => run.pins[k2] && run.pins[k2].t === 'basic', run.pins[a].t);
        if (b < 0) { used = false; break; }
        run.pins[b] = { t: run.pins[a].t, l: run.pins[a].l, g: run.pins[a].g };
        fxSlot(b, 'COPIED'); break;
      }
      case 'chalk': {
        const p = await pickPocket('Chalk which pocket? (+1x)', null);
        if (p < 0) { used = false; break; }
        run.pockets[p].m += 1; Board.setPockets(run.pockets); Board.pocketLight[p] = 1.5; Sound.buy(); break;
      }
      case 'gild': {
        const p = await pickPocket('Gild which pocket? (+$1 per ball)', null);
        if (p < 0) { used = false; break; }
        run.pockets[p].gold += 1; Board.setPockets(run.pockets); Board.pocketLight[p] = 1.5; Sound.coin(); break;
      }
      case 'oil': run.oil += 3; UI.toast('Next 3 spins: double jackpot odds'); Sound.sparkle(); break;
      case 'spare': G.rd.queue.push('steel', 'steel'); G.rd.total += 2; G.rd.cashing = false; if (!Board.nextBall) Board.nextBall = 'steel'; UI.ballsLeft(); Sound.clunk(); break;
      case 'kindling': run.kindling += 3; UI.toast('Next 3 balls: x2 Mult'); Sound.hot(false); break;
      case 'cookie': { const v = randi(1, 8); cash(v); UI.toast(pickR(['A stranger owes you money.', 'Luck is a lady tonight.', 'The reels are listening.', 'Fortune favours the loud.', 'You will drop a ball soon.']) + '  +$' + v); Sound.pop(); break; }
      case 'scratch': { const prize = await UI.scratch(); if (prize > 0) cash(prize); break; }
      case 'crucible': {
        const k = run.bag.indexOf('steel');
        if (k < 0) { UI.toast('No Steel Balls to melt.', 'bad'); used = false; break; }
        const pool = Object.keys(BALLS).filter(b => b !== 'steel' && Meta.unlocked('ball', b));
        run.bag[k] = pickR(pool); Meta.discover('ball', run.bag[k]); UI.bag(k); UI.toast('Melted into a ' + BALLS[run.bag[k]].name); Sound.hot(false); break;
      }
      case 'wild': {
        if (emptyCharmSlots() <= 0) { UI.toast('No free charm slot.', 'bad'); used = false; break; }
        const c = rollCharm(new Set(), [[1, 50], [2, 38], [3, 12]]);
        if (!c) { used = false; break; }
        addCharm(c.id, null); UI.toast('Conjured ' + CHARMS[c.id].name); Sound.sparkle(); break;
      }
      case 'mint': {
        const c = run.pins.map((p, k) => (p && p.t === 'basic' ? k : -1)).filter(k => k >= 0);
        for (let n = 0; n < 4 && c.length; n++) { const k = c.splice(Math.floor(Math.random() * c.length), 1)[0]; run.pins[k] = { t: 'copper', l: 1 }; fxSlot(k, ''); }
        Sound.buy(); break;
      }
      case 'coal': G.rd.coal = true; UI.toast('The Hot Peg burns hotter this round'); Sound.hot(true); break;
    }
    if (used) { run.tickets.splice(i, 1); Meta.discover('ticket', t.id); }
    Board.refresh();
    G.busy = false;
    UI.tickets(); UI.money();
    if (G.state === 'shop') save();
  }
  function fxSlot(k, txt) {
    const s = Board.slots[k];
    Board.refresh(); Board.fx[k].fl = 1; Board.fx[k].sq = 1;
    FX.ring(s.x, s.y, '#ffd84a', 4, 30, 0.45, 2.5); FX.stars(s.x, s.y, 6, '#ffe6a8');
    if (txt) boardText(s.x, s.y, txt, 'k');
    Sound.sparkle();
  }

  /* ---------------- attract demo ---------------- */
  let demoPins = null;
  function enterTitle() {
    G.state = 'title';
    G.rd = null;
    if (!demoPins) {
      demoPins = Board.slots.map(() => ({ t: 'basic', l: 1 }));
      const types = ['ruby', 'gold', 'bumper', 'prism', 'clover', 'copper', 'bomb', 'split', 'bell', 'rod', 'magnet', 'warp'];
      for (let i = 0; i < 16; i++) { const k = randi(14, demoPins.length - 12); demoPins[k] = { t: types[i % types.length], l: 1 + (i % 3 === 0 ? 1 : 0) }; }
    }
    Board.balls.length = 0; Board.hot = []; Board.fog = false; Board.wind = 0; Board.gravK = 1; Board.fever = 0; Board.pick = null;
    Board.setPins(demoPins);
    Board.setPockets([3, 2, 1, 1, 'F', 1, 1, 2, 3].map(m => (m === 'F' ? { m: 1, fever: true, gold: 0 } : { m, gold: 0 })));
    Board.launcher.show = false; Board.nextBall = null;
    Reels.reset();
    bulbs('idle');
  }
  function demoHit(b, si) {
    const p = Board.pins[si], s = Board.slots[si];
    if (!p) return;
    Board.fx[si].fl = 1; Board.fx[si].sq = 0.8;
    const col = Art.PIN_GLOW[p.t] || '#ffd98a';
    FX.sparks(s.x, s.y, p.t === 'basic' ? 2 : 6, col, 150);
    if (p.t !== 'basic') FX.ring(s.x, s.y, col, 4, 20, 0.3, 1.5);
    if (p.t === 'bomb' && Board.fx[si].off <= 0) { Board.fx[si].off = 3; Board.pinsDirty = true; FX.dots(s.x, s.y, 10, '#ff9a3a', 120, 14, 0.45); FX.sparks(s.x, s.y, 20, '#ffd27a', 300); FX.ring(s.x, s.y, '#ffb43a', 6, 70, 0.4, 3); }
  }
  function demoLand(b, p) { Board.pocketLight[p] = 1; FX.sparks(pocketX(p), DIV_TOP + 20, 8, '#ffd98a', 220, { dir: -Math.PI / 2, spread: 0.8 }); }

  /* ---------------- frame ---------------- */
  function update(dt, dtReal) {
    if (G.bulbHold > 0) { G.bulbHold -= dtReal; if (G.bulbHold <= 0) restoreBulbs(); }
    for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }
    if (G.state === 'title' || G.state === 'over') {
      G.demoT -= dtReal;
      if (G.demoT <= 0 && Board.balls.length < 14) {
        G.demoT = rand(0.35, 0.8);
        Board.spawn(rand(30, BW - 30), LAUNCH_Y, pickR(['steel', 'steel', 'steel', 'gold', 'ruby', 'glass', 'comet', 'pearl', 'eight']), { demo: true });
      }
    }
    const rd = G.rd;
    if (rd && (G.state === 'play' || G.state === 'intro')) {
      rd.t += dt; rd.real += dtReal; rd.cooldown -= dt; rd.nudgeT -= dtReal;
      if (rd.fever) feverTick(dt);
      crowdCheck();
      if (rd.queue.length === 0 && !rd.met) {
        const last = Board.balls.filter(b => b.alive && b.player);
        if (last.length === 1 && G.timers.length === 0 && Reels.idle() && !rd.fever) {
          const b = last[0], pot = rd.score + b.points * b.mult * 3;
          if (b.y > DIV_TOP - 110 && b.y < LAND_Y && pot >= rd.quota) { FX.slowmo(0.4, 0.06); if (!rd.clutch) { rd.clutch = true; Sound.heartbeat(); UI.clutch(); } }
        }
      }
      if (G.focus && !G.focus.alive) G.focus = null;
      checkEnd(dtReal);
      UI.heat(rd.heat / 100);
    }
  }

  Object.assign(G, {
    CAPSULES, ROUND_NAMES, has, vcount, chance: (n, d) => chance(n, d, null), cash, proc, procId, sellPrice, emptyCharmSlots, pinTypes, ballsInPlay,
    newRun, continueRun, startRound, aim, drop, nudge, cashOutEarly, jackpotOdds, canSpin, onSpinStart, onReach, jackpot, reachFail,
    onPinHit, onLand, onWall, onDivider, onWarped, buy, reroll, rerollCost, sell, moveCharm, nextRound, useTicket, boardClick, abandon,
    enterTitle, update, save, price, charmSlotsUsed, bossRules,
  });
  return G;
})();

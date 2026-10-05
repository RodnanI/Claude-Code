/* ============================================================
   ui.js : every DOM surface. HUD, charm tokens (drag to
   reorder, tap to sell), tickets, bag, shop, receipt + coin
   flip, vouchers, capsule gacha, scratch cards, title / run
   select / game over / collection / records / settings, hints.
   ============================================================ */
const UI = (() => {
  const U = { mobile: false, paused: false, scoreShown: 0, scoreGoal: 0, heatShown: -1, introFinish: null, hintQ: [], hintOn: null, lastTick: 0 };
  const E = {};
  const RCOL = [null, '#efe2c2', '#c9d2d6', '#ffc23a', '#ff6a2a'];
  const bumpEl = (el, s = 1.16) => el && el.animate && el.animate([{ transform: `scale(${s}) rotate(-2deg)`, filter: 'brightness(1.35)' }, { transform: 'none', filter: 'none' }], { duration: 260, easing: 'ease-out' });
  const center = el => { if (!el || !el.offsetParent) return null; const r = el.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; };
  const titleCase = s => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

  function init() {
    ['app', 'stage', 'left', 'cab', 'right', 'board', 'rcFloor', 'rcRound', 'rcQuota', 'qBar', 'qFill', 'qText', 'bossTag', 'cPts', 'cMult', 'lastScore', 'reelBox', 'reachBanner', 'holds', 'heat', 'heatFill', 'ballsRow', 'ballsLeft', 'queue',
      'money', 'interest', 'charms', 'charmCount', 'tickets', 'bag', 'btnSpeed', 'btnMenu', 'nudgeL', 'nudgeR', 'cabOverlay', 'placeBar', 'cashBtn', 'shop', 'shCharms', 'shGoods', 'shCaps', 'btnReroll', 'btnNext', 'screen', 'modal', 'toasts', 'flash', 'tip']
      .forEach(id => { E[id] = document.getElementById(id); });
    E.nudgeL.innerHTML = Art.icon('left') + 'NUDGE<div class="pips"></div>';
    E.nudgeR.innerHTML = Art.icon('right') + 'NUDGE<div class="pips"></div>';
    E.nudgeL.addEventListener('pointerdown', e => { e.preventDefault(); Game.nudge(-1); });
    E.nudgeR.addEventListener('pointerdown', e => { e.preventDefault(); Game.nudge(1); });
    E.cashBtn.addEventListener('click', () => Game.cashOutEarly());
    E.btnSpeed.addEventListener('click', () => { const sp = [1, 1.5, 2, 3], i = (sp.indexOf(Meta.data.settings.speed) + 1) % sp.length; setSpeed(sp[i]); Sound.click(); });
    E.btnMenu.addEventListener('click', () => { Sound.click(); pauseMenu(); });
    E.ballsRow.addEventListener('click', () => { if (Game.run) bagModal(); });
    E.btnReroll.addEventListener('click', () => { if (!Game.busy) Game.reroll(); });
    E.btnNext.addEventListener('click', () => { Sound.click(); Game.nextRound(); });
    E.placeBar.querySelector('button').addEventListener('click', () => { Sound.click(); if (U.placeCancel) U.placeCancel(); });
    document.addEventListener('pointerdown', e => { if (E.tip.classList.contains('pop') && !E.tip.contains(e.target) && !e.target.closest('.charm,.ticket')) hideTip(); }, true);
    setSpeed(Meta.data.settings.speed, true);
  }
  function setSpeed(s, quiet) {
    Meta.data.settings.speed = s; GAME_SPEED = s; Meta.save();
    E.btnSpeed.textContent = 'SPEED ' + s + 'x';
    if (!quiet) toast('Game speed ' + s + 'x');
  }

  /* ---------------- layout ---------------- */
  function layout() {
    const W = innerWidth, H = innerHeight, app = E.app;
    U.mobile = W < 1000 || (H > W && W < 1200);
    app.classList.toggle('m', U.mobile);
    const title = app.classList.contains('title');
    let cw, ch;
    if (!U.mobile) {
      const availW = title ? W - 40 : W - (288 * 2 + 36 + 28 + 70), availH = H - 28;
      ch = Math.min(availH, availW * CH / CW);
    } else {
      if (E.nudgeL.parentElement !== E.right) { E.right.appendChild(E.nudgeL); E.right.appendChild(E.nudgeR); }
      const top = title ? 0 : E.left.offsetHeight + 7, bot = title ? 0 : E.right.offsetHeight + 7;
      const availH = H - top - bot - 16, availW = W - 12;
      ch = Math.min(availH, availW * CH / CW);
    }
    ch = Math.max(200, Math.floor(ch)); cw = Math.floor(ch * CW / CH);
    E.cab.style.width = cw + 'px'; E.cab.style.height = ch + 'px';
    const home = U.mobile ? E.cab : E.left;
    if (E.cashBtn.parentElement !== home) home.appendChild(E.cashBtn);
    const nh = U.mobile ? E.right : E.cab;
    if (E.nudgeL.parentElement !== nh) { nh.appendChild(E.nudgeL); nh.appendChild(E.nudgeR); }
    Board.resize(cw, ch);
    Reels.resize();
    FX.ovResize();
    positionShop();
  }
  function positionShop() {
    const s = E.shop;
    if (s.hidden) return;
    if (U.mobile) {
      const rb = E.right.getBoundingClientRect();
      Object.assign(s.style, { left: '6px', top: '6px', width: (innerWidth - 12) + 'px', height: Math.max(260, rb.top - 13) + 'px' });
    } else {
      const lb = E.left.getBoundingClientRect(), cb = E.cab.getBoundingClientRect(), top = Math.min(lb.top, cb.top), bot = Math.max(lb.bottom, cb.bottom);
      Object.assign(s.style, { left: lb.left + 'px', top: top + 'px', width: (cb.right - lb.left) + 'px', height: (bot - top) + 'px' });
    }
    s.classList.toggle('narrow', s.getBoundingClientRect().width < 700);
  }
  function setMode(mode) {
    E.app.classList.toggle('title', mode === 'title');
    E.app.classList.toggle('shopping', mode === 'shop');
    requestAnimationFrame(layout);
  }

  /* ---------------- HUD ---------------- */
  function enterRound() {
    closeScreen(); setMode('game');
    const rd = Game.rd;
    U.scoreShown = 0; U.scoreGoal = 0;
    E.qBar.classList.remove('met');
    E.qFill.style.width = '0%';
    hud();
    calc(0, 1, true);
    holds(0); heat(0); nudges();
    E.cashBtn.hidden = true;
    const old = document.getElementById('windTag'); if (old) old.remove();
    if (rd.rules.wind) wind(1);
  }
  function hud() {
    const run = Game.run, rd = Game.rd;
    if (!run) return;
    E.rcFloor.textContent = 'FLOOR ' + run.floor + (run.stake ? ' · ' + STAKES[run.stake].name.toUpperCase() : '');
    E.rcRound.textContent = Game.ROUND_NAMES[run.ri];
    E.rcRound.classList.toggle('boss', run.ri === 2);
    E.rcQuota.textContent = fmt(rd ? rd.quota : quotaFor(run.floor, run.ri, run.stake));
    const ruleIds = rd ? (rd.boss ? rd.ruleIds : null) : run.ri === 2 ? Game.bossRules(run.floor) : null;
    if (ruleIds) {
      const bs = ruleIds.map(k => BOSSES[k]);
      E.bossTag.hidden = false;
      E.bossTag.innerHTML = Art.icon(run.floor === 8 ? HOUSE.icon : bs[0].icon) + '<div>' + bs.map(b => rich(b.rule)).join('<br>') + '</div>';
    } else E.bossTag.hidden = true;
    scoreText();
    money(); charms(); tickets(); bag(); ballsLeft();
  }
  function scoreText() {
    const rd = Game.rd;
    E.qText.textContent = rd ? (U.mobile ? fmt(Math.round(U.scoreShown)) + ' / ' + fmt(rd.quota) : fmt(Math.round(U.scoreShown))) : 'UP NEXT';
  }
  function frame(dt) {
    const rd = Game.rd;
    if (rd && (Game.state === 'play' || Game.state === 'intro')) {
      if (U.scoreShown !== U.scoreGoal) {
        const d = U.scoreGoal - U.scoreShown;
        U.scoreShown = Math.abs(d) < 0.5 ? U.scoreGoal : U.scoreShown + d * Math.min(1, dt * 8);
        scoreText();
        E.qFill.style.width = clamp(U.scoreShown / rd.quota, 0, 1) * 100 + '%';
        if (U.scoreShown >= rd.quota) E.qBar.classList.add('met');
        if (performance.now() - U.lastTick > 45) { U.lastTick = performance.now(); Sound.tick(); }
      }
    }
  }
  function scoreBump(score) {
    U.scoreGoal += score;
    bumpEl(E.qBar, 1.05);
    const c = center(E.qBar);
    if (c) FX.screenBurst(c.x, c.y, 6, '#ffd84a', 120);
  }
  function calc(p, m, reset, final) {
    const tp = fmt(p), tm = fmtM(m);
    if (E.cPts.textContent !== tp) { E.cPts.textContent = tp; if (!reset) bumpEl(E.cPts.parentElement); }
    if (E.cMult.textContent !== tm) { E.cMult.textContent = tm; if (!reset) bumpEl(E.cMult.parentElement); }
    if (final != null) {
      E.lastScore.textContent = '= ' + fmt(final);
      E.lastScore.classList.remove('pop'); void E.lastScore.offsetWidth; E.lastScore.classList.add('pop');
    } else if (reset) E.lastScore.innerHTML = '&nbsp;';
  }
  function ballsLeft() {
    const rd = Game.rd;
    if (!rd) { E.ballsLeft.textContent = Game.run ? Game.run.bag.length : 0; E.queue.innerHTML = ''; return; }
    const n = rd.queue.length;
    E.ballsLeft.textContent = n;
    E.ballsLeft.classList.toggle('low', n > 0 && n <= 2);
    E.queue.innerHTML = rd.queue.slice(0, 7).map(t => `<img src="${Art.ballURL(t)}" alt="">`).join('') + (n > 7 ? `<span class="more">+${n - 7}</span>` : '');
    if (!E.cashBtn.hidden) cashoutBtn(true);
  }
  function money(bump) {
    const run = Game.run;
    if (!run) return;
    E.money.textContent = run.money;
    E.money.classList.toggle('neg', run.money < 0);
    if (bump) bumpEl(E.money, 1.25);
    if (CABINETS[run.cab].noInterest) E.interest.textContent = 'NO INTEREST';
    else {
      const cap = 5 + (Game.has('compound') ? 5 : 0) + Game.vcount('v_vault') * 5, i = Math.min(cap, Math.floor(Math.max(0, run.money) / 5));
      E.interest.innerHTML = 'INTEREST<br>+$' + i;
    }
    if (!E.shop.hidden) updateAfford();
  }
  const moneyTarget = () => center(E.money) || center(E.right);
  const scoreTarget = () => center(E.qBar);
  const reelsTarget = () => center(E.reelBox);
  function holds(n) { [...E.holds.children].forEach((h, i) => h.classList.toggle('on', i < n)); }
  function heat(v) { if (Math.abs(v - U.heatShown) < 0.004) return; U.heatShown = v; E.heatFill.style.width = clamp(v, 0, 1) * 100 + '%'; }
  function heatFull() { E.heat.classList.remove('full'); void E.heat.offsetWidth; E.heat.classList.add('full'); }
  function nudges(deny) {
    const rd = Game.rd, n = rd ? rd.nudges : 0;
    [E.nudgeL, E.nudgeR].forEach(b => {
      b.querySelector('.pips').innerHTML = '<i></i>'.repeat(Math.min(n, 6));
      b.classList.toggle('empty', n <= 0);
      if (deny) { b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); }
    });
  }
  function cabShake(dir) { E.cab.classList.remove('shake-l', 'shake-r'); void E.cab.offsetWidth; E.cab.classList.add(dir < 0 ? 'shake-l' : 'shake-r'); }
  function wind(dir) {
    let t = document.getElementById('windTag');
    if (!t) { t = el('div'); t.id = 'windTag'; E.cabOverlay.appendChild(t); }
    t.innerHTML = dir < 0 ? Art.icon('left') + Art.icon('left') + ' WIND' : 'WIND ' + Art.icon('right') + Art.icon('right');
  }
  function cashoutBtn(show) {
    const rd = Game.rd;
    E.cashBtn.hidden = !show || !rd || !rd.queue.length;
    if (!E.cashBtn.hidden) E.cashBtn.textContent = 'CASH OUT  +$' + rd.queue.length * (Game.has('pincher') ? 2 : 1);
  }

  /* ---------------- charms ---------------- */
  function charmHTML(c, cls = '') {
    const d = CHARMS[c.id];
    return `<div class="charm r${d.rar}${c.ed ? ' ed-' + c.ed : ''} ${cls}"><div class="tok"></div><div class="face">${Art.icon(d.icon)}</div></div>`;
  }
  function charmTip(c, id) {
    const d = CHARMS[id || c.id], desc = typeof d.desc === 'function' ? d.desc(c) : d.desc;
    let h = `<h4>${d.name}</h4><span class="t-tag r${d.rar}">${RAR[d.rar].name.toUpperCase()} CHARM</span>`;
    if (c && c.ed) h += `<span class="t-ed">${EDITIONS[c.ed].name.toUpperCase()}</span>`;
    h += `<p>${rich(desc)}</p>`;
    if (c && c.ed) h += `<p style="margin-top:6px">${rich(EDITIONS[c.ed].desc)}</p>`;
    return h;
  }
  function charmVal(c) {
    const v = c.s.v || 0;
    if (c.id === 'snowball' && v) return '+' + v;
    if (c.id === 'soreloser' && v) return '+' + v;
    if (c.id === 'jar' && v) return 'x' + fmtM(1 + 0.5 * v);
    if (c.id === 'piggy') return '$' + Game.sellPrice(c);
    if (c.id === 'calf' && Game.run) return 'x' + fmtM(1 + 0.1 * Math.max(0, Game.run.money));
    return '';
  }
  function charms(newUid) {
    const run = Game.run;
    if (!run) return;
    const used = Game.charmSlotsUsed();
    E.charmCount.textContent = used + '/' + run.charmSlots;
    E.charms.innerHTML = '';
    const thief = Game.rd && Game.rd.rules.thief;
    run.charms.forEach((c, i) => {
      const w = el('div', '', charmHTML(c, (c.uid === newUid ? 'new' : '') + (thief && i === 0 ? ' off' : ''))).firstChild;
      w.dataset.uid = c.uid;
      const v = charmVal(c); if (v) w.insertAdjacentHTML('beforeend', `<div class="cval">${v}</div>`);
      bindCharm(w, c);
      E.charms.appendChild(w);
    });
    for (let i = used; i < run.charmSlots; i++) E.charms.appendChild(el('div', 'slot-empty'));
  }
  function bindCharm(w, c) {
    let sx = 0, sy = 0, down = false, drag = null, from = -1;
    w.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !E.tip.classList.contains('pop')) showTip(w, charmTip(c)); });
    w.addEventListener('pointerleave', () => { if (!E.tip.classList.contains('pop')) hideTip(); });
    w.addEventListener('pointerdown', e => {
      down = true; sx = e.clientX; sy = e.clientY; from = Game.run.charms.indexOf(c);
      w.setPointerCapture(e.pointerId);
    });
    w.addEventListener('pointermove', e => {
      if (!down) return;
      if (!drag && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
        drag = el('div', 'drag-ghost', charmHTML(c)); document.body.appendChild(drag); w.classList.add('dragging'); hideTip();
      }
      if (drag) { drag.style.left = e.clientX + 'px'; drag.style.top = e.clientY + 'px'; }
    });
    const up = e => {
      if (!down) return; down = false;
      if (drag) {
        drag.remove(); drag = null; w.classList.remove('dragging');
        const t = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList && n.classList.contains('charm') && n.dataset.uid);
        if (t) { const to = Game.run.charms.findIndex(o => String(o.uid) === t.dataset.uid); Game.moveCharm(from, to); Sound.clunk(); }
        return;
      }
      if (e.type === 'pointercancel') return;
      Sound.click();
      const canSell = !CHARMS[c.id].nosell;
      showTip(w, charmTip(c) + `<div class="t-row">${canSell ? `<button class="btn gold" data-a="sell">SELL $${Game.sellPrice(c)}</button>` : ''}<button class="btn dark" data-a="x">CLOSE</button></div>`, true);
      E.tip.querySelector('[data-a=x]').onclick = () => hideTip();
      const sb = E.tip.querySelector('[data-a=sell]'); if (sb) sb.onclick = () => { hideTip(); Game.sell(c.uid); };
    };
    w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
  }
  function proc(c, text, kind, quiet) {
    const w = E.charms.querySelector(`.charm[data-uid="${c.uid}"]`);
    if (!w) return;
    if (quiet) {
      const now = performance.now();
      if (now - (w._wt || 0) < 140) return;
      w._wt = now;
      w.animate([{ transform: 'scale(1.1) rotate(5deg)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
      return;
    }
    w.classList.remove('proc'); void w.offsetWidth; w.classList.add('proc');
    const old = w.querySelector('.bubble'); if (old) old.remove();
    const b = el('div', 'bubble ' + kind, text); w.appendChild(b);
    setTimeout(() => b.remove(), 950);
    const v = charmVal(c), cv = w.querySelector('.cval');
    if (v) { if (cv) cv.textContent = v; else w.insertAdjacentHTML('beforeend', `<div class="cval">${v}</div>`); }
  }

  /* ---------------- tickets & bag ---------------- */
  function tickets() {
    const run = Game.run;
    if (!run) return;
    E.tickets.innerHTML = '';
    run.tickets.forEach((t, i) => {
      const d = TICKETS[t.id], w = el('div', 'ticket', Art.icon(d.icon));
      w.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !E.tip.classList.contains('pop')) showTip(w, ticketTip(t.id)); });
      w.addEventListener('pointerleave', () => { if (!E.tip.classList.contains('pop')) hideTip(); });
      w.addEventListener('click', () => {
        Sound.click();
        showTip(w, ticketTip(t.id) + `<div class="t-row"><button class="btn gold" data-a="use">USE</button><button class="btn dark" data-a="x">CLOSE</button></div>`, true);
        E.tip.querySelector('[data-a=x]').onclick = () => hideTip();
        E.tip.querySelector('[data-a=use]').onclick = () => { hideTip(); Game.useTicket(i); };
      });
      E.tickets.appendChild(w);
    });
    for (let i = run.tickets.length; i < run.ticketSlots; i++) E.tickets.appendChild(el('div', 'ticket-empty'));
  }
  const ticketTip = id => { const d = TICKETS[id]; return `<h4>${d.name}</h4><span class="t-tag">TICKET</span><p>${rich(d.desc)}</p>`; };
  const ballTip = id => { const d = BALLS[id]; return `<h4>${d.name}</h4><span class="t-tag r${d.rar}">${d.rar ? RAR[d.rar].name.toUpperCase() + ' ' : ''}BALL</span><p>${rich(d.desc)}</p>`; };
  const pinTip = (id, L = 1, p = null) => { const d = PINS[id]; return `<h4>${d.name}${L > 1 ? ' Lv' + L : ''}</h4><span class="t-tag r${d.rar}">${d.rar ? RAR[d.rar].name.toUpperCase() + ' ' : ''}PIN</span><p>${rich(d.desc(L, p))}</p>${d.rar ? '<p style="margin-top:6px;font-size:14px;opacity:.75">Place another on top to level it up (max 5).</p>' : ''}`; };
  function bag(newIdx) {
    const run = Game.run;
    if (!run) return;
    E.bag.innerHTML = '';
    run.bag.forEach((t, i) => {
      const img = el('img'); img.src = Art.ballURL(t); img.alt = BALLS[t].name;
      if (i === newIdx) img.className = 'new';
      img.addEventListener('pointerenter', () => showTip(img, ballTip(t)));
      img.addEventListener('pointerleave', hideTip);
      E.bag.appendChild(img);
    });
  }

  /* ---------------- tooltip ---------------- */
  function showTip(anchor, html, pop) {
    const t = E.tip;
    t.innerHTML = html; t.hidden = false; t.classList.toggle('pop', !!pop);
    const r = anchor.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2, y = r.top - th - 12;
    if (y < 8) y = r.bottom + 12;
    x = clamp(x, 8, innerWidth - tw - 8); y = clamp(y, 8, innerHeight - th - 8);
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { E.tip.hidden = true; E.tip.classList.remove('pop'); }

  /* ---------------- overlays on the cabinet ---------------- */
  function roundIntro(info) {
    return new Promise(res => {
      const e = el('div', 'intro' + (info.boss ? ' boss' : ''));
      const q = `<div class="i-quota"><small>QUOTA</small><b>${fmt(info.quota)}</b></div><div class="i-balls">${info.balls} BALLS</div>`;
      if (info.boss) {
        const b0 = info.house ? HOUSE : info.boss[0];
        e.innerHTML = `<div class="i-floor">FLOOR ${info.floor}${info.house ? ' · FINAL' : ''} · BOSS</div><div class="boss-ico">${Art.icon(b0.icon)}</div><div class="boss-name">${b0.name}</div><div class="boss-rule">${info.boss.map(b => rich(b.rule)).join('<br>')}</div>${q}<div class="i-tap">CLICK TO ACCEPT</div>`;
        Sound.stamp();
      } else {
        e.innerHTML = `<div class="i-floor">FLOOR ${info.floor}</div><div class="i-round">${titleCase(info.round)}</div>${q}<div class="i-tap">CLICK TO DROP</div>`;
        Sound.whoosh();
      }
      E.cabOverlay.appendChild(e);
      let done = false;
      const fin = () => { if (done) return; done = true; U.introFinish = null; e.classList.add('out'); setTimeout(() => e.remove(), 320); res(); };
      U.introFinish = fin;
      e.addEventListener('pointerdown', ev => { ev.stopPropagation(); Sound.click(); fin(); });
      setTimeout(fin, info.boss ? 6500 : 2000);
    });
  }
  function dismissIntro() { if (U.introFinish) U.introFinish(); }
  function banner(main, sub, cls = '', rays = false) {
    const b = el('div', 'banner ' + cls, `${rays ? '<div class="rays"></div>' : ''}<div class="b-main">${main}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`);
    E.cabOverlay.appendChild(b);
    setTimeout(() => b.remove(), 1750);
  }
  function stamp(text, cls = '') {
    const s = el('div', 'stamp ' + cls, text);
    E.cabOverlay.appendChild(s);
    setTimeout(() => Sound.stamp(), 120);
    setTimeout(() => s.remove(), 2500);
  }
  function flash() { if (!Meta.data.settings.flash) return; E.flash.classList.remove('go'); void E.flash.offsetWidth; E.flash.classList.add('go'); }
  function jackpot(sym) {
    const J = JACKPOTS[sym];
    if (sym !== 'seven') banner('Jackpot!', J.name + ' · ' + J.desc, 'jack', true);
    else banner('777', 'JACKPOT · FEVER INCOMING', 'jack', true);
    flash();
    const c = reelsTarget();
    if (c) { FX.screenBurst(c.x, c.y, 40, '#ffd84a', 420); FX.confetti(30, c.x, c.y); }
    if (sym === 'diamond') toast('Free capsule waiting in the next shop');
  }
  function fever(on) {
    E.app.classList.toggle('fever', on);
    if (on) setTimeout(() => { banner('FEVER!', 'BALLS INCOMING · POCKETS x2', 'fever', true); flash(); }, 1100);
  }
  function reach(tier) {
    const b = E.reachBanner;
    b.className = 't' + tier;
    b.textContent = ['', 'REACH!', 'SUPER REACH!', 'PREMIUM REACH!!'][tier];
    void b.offsetWidth; b.classList.add('on');
    if (tier >= 2) flash();
    hint('fever');
  }
  function reachEnd() { E.reachBanner.className = ''; }
  function reelOmen() { E.reelBox.animate([{ boxShadow: '0 0 0 0 rgba(255,216,74,0)' }, { boxShadow: '0 0 40px 10px rgba(255,216,74,.95)' }, { boxShadow: '0 0 0 0 rgba(255,216,74,0)' }], { duration: 750 }); }
  function soClose() { const s = el('div', 'soclose', pickR(['SO CLOSE...', 'ALMOST!', 'NEXT TIME...', 'ARGH!'])); E.reelBox.appendChild(s); setTimeout(() => s.remove(), 1250); }
  function clutch() { const v = el('div'); v.id = 'clutchV'; E.cabOverlay.appendChild(v); setTimeout(() => v.remove(), 1900); }
  function placeBar(text, onCancel) {
    if (!text) { E.placeBar.hidden = true; U.placeCancel = null; return; }
    E.placeBar.querySelector('span').textContent = text + (matchMedia('(pointer: coarse)').matches ? ' (tap twice)' : '');
    E.placeBar.hidden = false; U.placeCancel = onCancel;
  }
  const toastQ = [];
  let toastN = 0;
  function pumpToasts() {
    while (toastN < (U.mobile ? 1 : 2) && toastQ.length) {
      const [node, life] = toastQ.shift();
      toastN++; E.toasts.appendChild(node);
      setTimeout(() => { node.remove(); toastN--; pumpToasts(); }, life);
    }
  }
  function toast(text, kind = '') { toastQ.push([el('div', 'toast ' + kind, text), 2900]); pumpToasts(); }
  function achToast(d) { toastQ.push([el('div', 'ach-toast', `<div class="a-ico">${Art.icon(d.icon)}</div><div><small>ACHIEVEMENT</small><b>${d.name}</b></div>`), 4000]); pumpToasts(); }

  /* ---------------- modal helpers ---------------- */
  let modalTok = 0;
  function modal(html) {
    E.modal.innerHTML = html;
    E.modal.classList.add('on');
    hideTip();
    const m = E.modal.firstElementChild;
    m._tok = ++modalTok;
    return m;
  }
  function closeModal(m) {
    if (m && m._tok !== modalTok) return;
    E.modal.classList.remove('on'); E.modal.innerHTML = '';
  }

  /* ---------------- cash out ---------------- */
  function cashout(info) {
    return new Promise(res => {
      const m = modal(`<div class="mcard"><h3>ROUND CLEARED</h3>
        <div class="receipt"><div class="r-head">FEVER PARLOR &middot; RECEIPT</div>
        <div class="r-score">Score ${fmt(info.score)} vs quota ${fmt(info.quota)} &middot; ${info.ratio >= 10 ? fmt(info.ratio) + 'x' : Math.round(info.ratio * 100) + '%'}</div>
        <div class="r-lines"></div><div class="r-total" hidden><span>TOTAL</span><b>$${info.total}</b></div></div>
        <div class="mrow" hidden></div><div class="don-note" hidden></div></div>`);
      const lines = m.querySelector('.r-lines'), row = m.querySelector('.mrow'), note = m.querySelector('.don-note'), tot = m.querySelector('.r-total');
      let i = 0;
      const step = () => {
        if (i < info.lines.length) {
          const [label, v] = info.lines[i++];
          lines.insertAdjacentHTML('beforeend', `<div class="r-line${v < 0 ? ' neg' : ''}"><span>${label}</span><i></i><b>${v < 0 ? '-$' + -v : '$' + v}</b></div>`);
          Sound.print();
          setTimeout(step, 230 / GAME_SPEED);
          return;
        }
        tot.hidden = false; Sound.buy();
        const total = info.total;
        const odds = Game.has('hustler') ? 0.6 : 0.5;
        row.hidden = false;
        row.innerHTML = `<button class="btn gold big" data-a="c">COLLECT $${Math.max(0, total)}</button>` + (total > 0 ? `<button class="btn big" data-a="d">DOUBLE OR NOTHING</button>` : '');
        if (total > 0) { note.hidden = false; note.textContent = `${Math.round(odds * 100)}% chance to win $${total * 2}. Or walk away with nothing.`; }
        row.querySelector('[data-a=c]').onclick = () => {
          Sound.buy();
          const c = center(row.querySelector('[data-a=c]')), t = moneyTarget();
          if (c && t && total > 0) FX.stream(c.x, c.y, t.x, t.y, Math.min(14, total + 2), '#ffd34a', null, { coin: true });
          closeModal(); res(Math.max(0, total));
        };
        const d = row.querySelector('[data-a=d]');
        if (d) d.onclick = () => coinFlip(m, total, odds).then(v => { closeModal(); res(v); });
      };
      setTimeout(step, 350);
    });
  }
  function coinFlip(m, amount, odds) {
    return new Promise(res => {
      Game.run.stats.dons = (Game.run.stats.dons || 0) + 1;
      const win = Math.random() < odds;
      m.innerHTML = `<h3>DOUBLE OR NOTHING</h3><h2>$${amount} on the line</h2><p>Heads you win. Skull you lose.</p>
        <div class="coinStage"><div class="coinWrap"><div class="coin3d"><div class="cf front">7</div><div class="cf back">${Art.icon('skull')}</div></div></div></div><div class="coin-shadow" style="margin:0 auto"></div>
        <div class="mrow" hidden><button class="btn gold big" data-a="ok">CONTINUE</button></div>`;
      const coin = m.querySelector('.coin3d'), wrap = m.querySelector('.coinWrap');
      const turns = 7 + Math.floor(Math.random() * 3), endY = turns * 360 + (win ? 0 : 180);
      Sound.flipSpin(); Sound.whoosh();
      wrap.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-110px)', offset: 0.45 }, { transform: 'translateY(0)', offset: 0.85 }, { transform: 'translateY(-14px)', offset: 0.93 }, { transform: 'translateY(0)' }], { duration: 1700, easing: 'cubic-bezier(.3,.7,.4,1)' });
      const a = coin.animate([{ transform: 'rotateY(0deg) rotateX(12deg)' }, { transform: `rotateY(${endY}deg) rotateX(12deg)` }], { duration: 1600, easing: 'cubic-bezier(.15,.6,.25,1)', fill: 'forwards' });
      a.onfinish = () => {
        Sound.clunk();
        const st = el('div', 'stamp stay ' + (win ? 'green' : ''), win ? 'DOUBLED!' : 'BUSTED');
        st.style.position = 'absolute'; st.style.top = '50%';
        m.appendChild(st); Sound.stamp();
        if (win) {
          Sound.jackpot(false); FX.confetti(90);
          Game.run.stats.donWins = (Game.run.stats.donWins || 0) + 1;
          if (Game.run.stats.donWins >= 3) Meta.ach('don3');
        } else { Sound.fail(); if (amount >= 15) Meta.ach('badbeat'); }
        const row = m.querySelector('.mrow'); row.hidden = false;
        row.querySelector('button').onclick = () => { Sound.click(); res(win ? amount * 2 : 0); };
      };
    });
  }

  /* ---------------- vouchers ---------------- */
  function voucherPick(ids) {
    return new Promise(res => {
      Sound.unlock();
      const m = modal(`<div class="mcard"><h3>BOSS DEFEATED</h3><h2>The House offers a deal</h2><p>Pick one. It lasts the whole run.</p><div class="vouchers">${ids.map((id, i) => {
        const v = VOUCHERS[id];
        return `<div class="voucher" data-i="${i}" style="animation-delay:${i * 0.12}s"><div class="v-ico">${Art.icon(v.icon)}</div><h4>${v.name}</h4><p>${rich(v.desc)}</p></div>`;
      }).join('')}</div></div>`);
      let done = false;
      m.querySelectorAll('.voucher').forEach(v => v.addEventListener('click', () => {
        if (done) return;
        done = true;
        const i = +v.dataset.i;
        Sound.buy();
        m.querySelectorAll('.voucher').forEach(o => o.classList.add(o === v ? 'chosen' : 'gone'));
        setTimeout(() => { closeModal(m); toast(VOUCHERS[ids[i]].name + ' acquired'); res(ids[i]); }, 650);
      }));
    });
  }

  /* ---------------- shop ---------------- */
  function openShop() {
    closeScreen();
    setMode('shop');
    E.shop.hidden = false; E.shop.classList.remove('out');
    E.shop.querySelector('.quip').textContent = '"' + Game.run.shop.quip + '"';
    const run = Game.run, nx = E.shop.querySelector('.shop-next');
    const q = fmt(quotaFor(run.floor, run.ri, run.stake));
    if (run.ri === 2) {
      const rules = Game.bossRules(run.floor).map(k => BOSSES[k]);
      nx.className = 'shop-next boss';
      nx.innerHTML = `${Art.icon(run.floor === 8 ? HOUSE.icon : rules[0].icon)} NEXT: ${run.floor === 8 ? HOUSE.name : rules[0].name.toUpperCase()} &middot; QUOTA <b>${q}</b> &middot; ${rules.map(r => rich(r.rule)).join(' ')}`;
    } else { nx.className = 'shop-next'; nx.innerHTML = `NEXT: FLOOR ${run.floor} &middot; ${Game.ROUND_NAMES[run.ri]} &middot; QUOTA <b>${q}</b>`; }
    E.qFill.style.width = '0%'; E.qBar.classList.remove('met'); E.cashBtn.hidden = true;
    hud();
    E.shop.querySelector('.shop-body').scrollTop = 0;
    requestAnimationFrame(() => { positionShop(); refreshShop(true); });
  }
  function showShop() { if (Game.state !== 'shop') return; E.shop.hidden = false; positionShop(); refreshShop(); }
  function hideShop() { E.shop.hidden = true; hideTip(); }
  function closeShop() { E.shop.classList.add('out'); setTimeout(() => { E.shop.hidden = true; E.shop.classList.remove('out'); }, 300); hideTip(); }
  function cardArt(item) {
    if (item.kind === 'charm') return charmHTML(item);
    if (item.kind === 'pin') return `<img src="${Art.pinURL(item.id, PINS[item.id].r)}" alt="">`;
    if (item.kind === 'ball') return `<img src="${Art.ballURL(item.id)}" alt="">`;
    if (item.kind === 'ticket') return `<div class="ticket">${Art.icon(TICKETS[item.id].icon)}</div>`;
    return `<div class="capsule-ico" style="--cc:${Game.CAPSULES[item.id].color}"></div>`;
  }
  function cardInfo(item) {
    if (item.kind === 'charm') {
      const d = CHARMS[item.id], desc = typeof d.desc === 'function' ? d.desc(null) : d.desc;
      return { name: d.name, tag: `<span class="c-tag r${d.rar}">${RAR[d.rar].name.toUpperCase()}</span>${item.ed ? ` <span class="c-ed">${EDITIONS[item.ed].name.toUpperCase()}</span>` : ''}`, desc: rich(desc) + (item.ed ? '<br><br>' + rich(EDITIONS[item.ed].desc) : '') };
    }
    if (item.kind === 'pin') {
      const d = PINS[item.id], n = Game.run.pins.filter(p => p && p.t === item.id).length;
      return { name: d.name, tag: `<span class="c-tag r${d.rar}">${RAR[d.rar].name.toUpperCase()} PIN</span>`, desc: rich(d.desc(1, null)) + (n ? `<br><small>(${n} on your board)</small>` : '') };
    }
    if (item.kind === 'ball') { const d = BALLS[item.id]; return { name: d.name, tag: `<span class="c-tag r${d.rar}">${RAR[d.rar].name.toUpperCase()} BALL</span>`, desc: rich(d.desc) }; }
    if (item.kind === 'ticket') { const d = TICKETS[item.id]; return { name: d.name, tag: '<span class="c-tag">TICKET</span>', desc: rich(d.desc) }; }
    const d = Game.CAPSULES[item.id];
    return { name: d.name, tag: '<span class="c-tag r3">GACHA</span>', desc: d.desc };
  }
  function shopCard(item, kind, i, anim) {
    const inf = cardInfo(item), e = el('div', 'card' + (item.sold ? ' sold' : '') + (item.kind === 'cap' ? ' cap' : ''));
    e.innerHTML = `<div class="c-art">${cardArt(item)}</div><div class="c-name">${inf.name}</div><div>${inf.tag}</div><div class="c-desc"><span>${inf.desc}</span></div><button class="btn gold">${item.price ? '$' + item.price : 'FREE'}</button>`;
    if (!anim) e.style.animation = 'none'; else e.style.animationDelay = i * 0.07 + 's';
    e._item = item;
    e.querySelector('.btn').addEventListener('click', () => Game.buy(kind, i));
    return e;
  }
  function refreshShop(anim) {
    const s = Game.run && Game.run.shop;
    if (!s) return;
    E.shCharms.innerHTML = ''; E.shGoods.innerHTML = ''; E.shCaps.innerHTML = '';
    s.charms.forEach((it, i) => E.shCharms.appendChild(shopCard(it, 'charm', i, anim)));
    if (!s.charms.length) E.shCharms.innerHTML = '<p style="opacity:.6">Sold out. You own every charm we stock.</p>';
    s.goods.forEach((it, i) => E.shGoods.appendChild(shopCard(it, 'good', i, anim)));
    s.caps.forEach((it, i) => E.shCaps.appendChild(shopCard(it, 'cap', i, anim)));
    updateAfford();
  }
  function updateAfford() {
    const run = Game.run;
    if (!run || !run.shop) return;
    E.shop.querySelectorAll('.card').forEach(c => { const b = c.querySelector('.btn'); if (b && c._item) { const ok = run.money >= c._item.price; b.className = 'btn ' + (ok ? 'gold' : 'dark dis'); } });
    const rc = Game.rerollCost();
    E.btnReroll.textContent = rc === 0 ? 'REROLL FREE' : 'REROLL $' + rc;
    E.btnReroll.classList.toggle('dis', run.money < rc);
  }
  function flyFromShop(kind, idx) {
    const shelf = kind === 'charm' ? E.shCharms : kind === 'cap' ? E.shCaps : E.shGoods;
    const card = shelf.children[idx];
    if (!card) return;
    const art = card.querySelector('.c-art > *');
    if (!art) return;
    const r = art.getBoundingClientRect(), it = card._item;
    const dest = it.kind === 'charm' ? E.charms : it.kind === 'ticket' ? E.tickets : it.kind === 'ball' ? E.bag : E.board;
    const d = center(dest) || { x: innerWidth / 2, y: innerHeight / 2 };
    const g = art.cloneNode(true);
    Object.assign(g.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: 89, pointerEvents: 'none', margin: 0 });
    document.body.appendChild(g);
    const dx = d.x - (r.left + r.width / 2), dy = d.y - (r.top + r.height / 2);
    const a = g.animate([{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(1.3) rotate(-20deg)`, offset: 0.45 }, { transform: `translate(${dx}px, ${dy}px) scale(.5) rotate(10deg)`, opacity: 0.2 }], { duration: 620, easing: 'cubic-bezier(.4,0,.2,1)' });
    a.onfinish = () => { g.remove(); FX.screenBurst(d.x, d.y, 14, '#ffd84a', 200); };
  }
  function pickBag(text) {
    return new Promise(res => {
      const run = Game.run;
      const m = modal(`<div class="mcard"><h3>BALL BAG</h3><h2>Swap a ball</h2><p>${text}</p><div class="bagpick">${run.bag.map((t, i) => `<button data-i="${i}" title="${BALLS[t].name}"><img src="${Art.ballURL(t)}" alt=""></button>`).join('')}</div><div class="mrow"><button class="btn dark" data-a="x">CANCEL</button></div></div>`);
      m.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { Sound.click(); closeModal(); res(+b.dataset.i); }));
      m.querySelector('[data-a=x]').onclick = () => { closeModal(); res(-1); };
    });
  }
  function bagModal() {
    const run = Game.run, rd = Game.rd;
    if (E.modal.classList.contains('on')) return;
    const wasPaused = U.paused; U.paused = true;
    const m = modal(`<div class="mcard"><h3>BALL BAG</h3><h2>${run.bag.length} balls</h2>
      <div class="bagpick">${run.bag.map(t => `<button title="${BALLS[t].name}" data-t="${t}"><img src="${Art.ballURL(t)}" alt=""></button>`).join('')}</div>
      <p id="bagDesc" style="min-height:44px">Tap a ball to read it.</p>${rd ? `<p>${rd.queue.length} left to drop this round.</p>` : ''}
      <div class="mrow"><button class="btn dark" data-a="x">CLOSE</button></div></div>`);
    m.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { const d = BALLS[b.dataset.t]; m.querySelector('#bagDesc').innerHTML = `<b>${d.name}</b>: ${rich(d.desc)}`; }));
    m.querySelector('[data-a=x]').onclick = () => { closeModal(); U.paused = wasPaused; };
  }

  /* ---------------- capsule gacha ---------------- */
  function capsule(info) {
    return new Promise(res => {
      const m = modal(`<div class="mcard"><h3>${info.cap.name.toUpperCase()}</h3><h2>Turn the crank</h2><div class="capWrap"><canvas id="capCanvas"></canvas><div class="choices" hidden></div>
        <div class="mrow cap-act"><button class="btn gold big" data-a="turn">TURN</button></div><p style="font-size:13px;margin:8px 0 0;opacity:.6">Tap the machine to skip the show</p></div></div>`);
      const cv = m.querySelector('#capCanvas'), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = 260 * dpr; cv.height = 300 * dpr;
      const x = cv.getContext('2d');
      const caps = [];
      for (let row = 0; row < 4; row++) {
        const y = 166 - row * 21, half = Math.sqrt(Math.max(0, 84 * 84 - (y - 98) * (y - 98))) - 16;
        for (let cx0 = 130 - half + (row % 2) * 9; cx0 <= 130 + half; cx0 += 26) caps.push({ x: cx0 + rand(-2, 2), y: y + rand(-2, 2), c: pickR(['#c3261a', '#d7ad55', '#27c4b0', '#efe2c2', '#ff8a2a', '#6fe36a']), rot: rand(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI) });
      }
      const glowC = RCOL[clamp(info.best, 1, 4)];
      let phase = 'idle', t = 0, last = performance.now(), raf = 0, crankA = 0, cx = 130, cy = 234, rot = 0, open = 0;
      const shake = () => rand(-1, 1) * (phase === 'crank' ? 2.2 : 0.3);
      function drawCap(px, py, r, a, top, sep = 0) {
        x.save(); x.translate(px, py); x.rotate(a);
        x.save(); x.translate(0, -sep); x.beginPath(); x.arc(0, 0, r, Math.PI, 0); x.closePath(); x.fillStyle = top; x.fill(); x.restore();
        x.save(); x.translate(0, sep); x.beginPath(); x.arc(0, 0, r, 0, Math.PI); x.closePath(); x.fillStyle = '#f6efe0'; x.fill(); x.restore();
        if (!sep) { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-r, 0); x.lineTo(r, 0); x.stroke(); }
        x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(-r * 0.35, -r * 0.45 - sep, r * 0.28, r * 0.16, -0.5, 0, TAU); x.fill();
        x.restore();
      }
      function draw() {
        x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, 260, 300);
        // base
        Art.rrect(x, 40, 172, 180, 118, 14); const bg = x.createLinearGradient(40, 0, 220, 0); bg.addColorStop(0, '#5e1010'); bg.addColorStop(0.4, '#b8321f'); bg.addColorStop(1, '#4a0c0a'); x.fillStyle = bg; x.fill();
        x.strokeStyle = '#d7ad55'; x.lineWidth = 3; x.stroke();
        Art.rrect(x, 102, 216, 56, 40, 10); x.fillStyle = '#140806'; x.fill(); x.strokeStyle = '#7d5a1e'; x.lineWidth = 2; x.stroke();
        x.fillStyle = '#d7ad55'; x.font = '10px Bungee, Impact'; x.textAlign = 'center'; x.fillText(info.cap.name.split(' ')[0].toUpperCase(), 130, 202);
        // crank
        x.save(); x.translate(196, 238); x.rotate(crankA);
        x.fillStyle = '#c9ced3'; x.beginPath(); x.arc(0, 0, 14, 0, TAU); x.fill(); x.strokeStyle = '#4a5257'; x.lineWidth = 2; x.stroke();
        x.fillStyle = '#e8eef2'; x.fillRect(-3, -24, 6, 24); x.fillStyle = '#c3261a'; x.beginPath(); x.arc(0, -24, 6, 0, TAU); x.fill();
        x.restore();
        // dome
        x.save(); x.beginPath(); x.arc(130, 98, 84, 0, TAU); x.clip();
        x.fillStyle = 'rgba(255,240,220,.06)'; x.fillRect(40, 10, 180, 180);
        for (const c of caps) drawCap(c.x + shake(), c.y + shake(), 13, c.rot + shake() * 0.1, c.c);
        x.restore();
        x.strokeStyle = 'rgba(255,240,220,.5)'; x.lineWidth = 2.5; x.beginPath(); x.arc(130, 98, 84, 0, TAU); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 4; x.beginPath(); x.arc(130, 98, 72, Math.PI * 1.1, Math.PI * 1.4); x.stroke();
        Art.rrect(x, 100, 6, 60, 14, 6); x.fillStyle = '#d7ad55'; x.fill();
        // prize capsule
        if (phase === 'drop' || phase === 'wobble' || phase === 'open') {
          if (phase !== 'drop' || t > 0.05) {
            const glowA = phase === 'wobble' ? Math.min(1, t * 1.2) : phase === 'open' ? 1 - open : 0;
            if (glowA > 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = glowA; const g = 60 + info.best * 14; x.drawImage(Art.glow(glowC), cx - g, cy - g, g * 2, g * 2); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
            if (phase === 'open') {
              x.save(); x.translate(cx, cy); x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.max(0, 1 - open * 0.8);
              for (let i = 0; i < 14; i++) { x.rotate(TAU / 14); x.fillStyle = glowC; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 150 * Math.min(1, open * 2), -0.07, 0.07); x.closePath(); x.fill(); }
              x.restore(); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
            }
            drawCap(cx, cy, 20, rot, info.cap.color, phase === 'open' ? open * 60 : 0);
          }
        }
      }
      function tick(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        if (phase === 'crank') { crankA = Ease.inOutCubic(Math.min(1, t / 0.8)) * TAU; if (t >= 0.8) { phase = 'drop'; t = 0; } }
        else if (phase === 'drop') {
          const k = Math.min(1, t / 0.5); cy = 236 + Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * -26; cx = 130; rot = k * 2;
          if (t >= 0.5) { phase = 'wobble'; t = 0; Sound.clunk(); }
        } else if (phase === 'wobble') {
          const dur = 0.35 + info.best * 0.22, amp = 0.15 + t * (0.3 + info.best * 0.14);
          rot = Math.sin(t * (18 + info.best * 4)) * amp; cx = 130 + Math.sin(t * 31) * info.best * 0.8;
          if (info.best >= 3 && Math.random() < 0.3) { Sound.sparkle(); }
          if (t >= dur) { phase = 'open'; t = 0; Sound.pop(); Sound.rarity(info.best - 1); const c = center(cv); if (c) { FX.screenBurst(c.x, c.y + 80, 30, glowC, 360); if (info.best >= 3) FX.confetti(60, c.x, c.y + 80); } }
        } else if (phase === 'open') { open = Math.min(1, t / 0.6); if (t >= 0.3 && !m._shown) { m._shown = true; showChoices(); } }
        draw();
        if (E.modal.contains(cv)) raf = requestAnimationFrame(tick);
      }
      function showChoices() {
        m.querySelector('h2').textContent = 'Choose one';
        const box = m.querySelector('.choices'); box.hidden = false;
        info.choices.forEach((c, i) => {
          const inf = cardInfo(c), dis = (c.kind === 'charm' && !info.canCharm && c.ed !== 'phantom') || (c.kind === 'ticket' && !info.canTicket);
          const e = el('div', 'card' + (dis ? ' dim' : ''), `<div class="c-art">${cardArt(c)}</div><div class="c-name">${inf.name}</div><div>${inf.tag}</div><div class="c-desc"><span>${inf.desc}</span></div><button class="btn ${dis ? 'dark dis' : 'gold'}">${dis ? 'NO ROOM' : 'TAKE'}</button>`);
          e.style.animationDelay = i * 0.09 + 's';
          if (!dis) e.addEventListener('click', () => { Sound.buy(); cancelAnimationFrame(raf); closeModal(); res(i); });
          box.appendChild(e);
        });
        const act = m.querySelector('.cap-act');
        act.innerHTML = '<button class="btn dark" data-a="skip">SKIP</button>';
        act.querySelector('button').onclick = () => { Sound.click(); cancelAnimationFrame(raf); closeModal(); res(-1); };
      }
      m.querySelector('[data-a=turn]').onclick = e => { if (phase !== 'idle') return; e.target.classList.add('dis'); phase = 'crank'; t = 0; Sound.crank(); };
      cv.addEventListener('click', () => {
        if (phase === 'idle') { m.querySelector('[data-a=turn]').click(); return; }
        if (phase !== 'open') { phase = 'open'; t = 0.29; cy = 236; Sound.pop(); Sound.rarity(info.best - 1); }
      });
      raf = requestAnimationFrame(tick);
    });
  }

  /* ---------------- scratch card ---------------- */
  function scratch() {
    const pausing = Game.state === 'play' && !U.paused;
    if (pausing) U.paused = true;
    return new Promise(res0 => {
      const res = v => { if (pausing) U.paused = false; res0(v); };
      const PRIZE = { cherry: 4, bell: 6, clover: 8, bar: 12, diamond: 15, seven: 25 };
      const syms = Object.keys(PRIZE);
      let cells;
      const win = Math.random() < 0.42;
      const W = { cherry: 34, bell: 26, clover: 18, bar: 12, diamond: 6, seven: 4 };
      if (win) {
        let tot = 0; for (const k in W) tot += W[k]; let r = Math.random() * tot, s = 'cherry'; for (const k in W) { r -= W[k]; if (r <= 0) { s = k; break; } }
        const others = syms.filter(o => o !== s); cells = [s, s, s];
        const cnt = {}; while (cells.length < 6) { const o = pickR(others); if ((cnt[o] || 0) < 2) { cnt[o] = (cnt[o] || 0) + 1; cells.push(o); } }
      } else {
        cells = []; const cnt = {}; while (cells.length < 6) { const o = pickR(syms); if ((cnt[o] || 0) < 2) { cnt[o] = (cnt[o] || 0) + 1; cells.push(o); } }
      }
      for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      const counts = {}; cells.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      const winSym = Object.keys(counts).find(k => counts[k] >= 3), prize = winSym ? PRIZE[winSym] : 0;
      const m = modal(`<div class="mcard"><h3>SCRATCH CARD</h3><h2>Three of a kind wins</h2><p>Cherries $4 &middot; Bells $6 &middot; Clovers $8 &middot; Bars $12 &middot; Diamonds $15 &middot; Sevens $25</p>
        <div class="scratchWrap"><canvas class="under"></canvas><canvas class="foil"></canvas></div><div class="scratch-res"></div>
        <div class="mrow"><button class="btn dark" data-a="rev">REVEAL ALL</button></div></div>`);
      const wrap = m.querySelector('.scratchWrap'), cu = m.querySelector('.under'), cf = m.querySelector('.foil'), dpr = Math.min(2, devicePixelRatio || 1);
      [cu, cf].forEach(c => { c.width = 300 * dpr; c.height = 230 * dpr; });
      const u = cu.getContext('2d'), f = cf.getContext('2d');
      u.scale(dpr, dpr); f.scale(dpr, dpr);
      const ug = u.createLinearGradient(0, 0, 0, 230); ug.addColorStop(0, '#fbf5e6'); ug.addColorStop(1, '#ead9b2'); u.fillStyle = ug; u.fillRect(0, 0, 300, 230);
      u.fillStyle = '#c3261a'; u.fillRect(0, 0, 300, 34); u.fillStyle = '#fff3d6'; u.font = '16px Bungee, Impact'; u.textAlign = 'center'; u.textBaseline = 'middle'; u.fillText('LUCKY SCRATCH', 150, 18);
      const cellRect = i => ({ x: 14 + (i % 3) * 92, y: 46 + Math.floor(i / 3) * 90, w: 82, h: 80 });
      cells.forEach((s, i) => { const r = cellRect(i); Art.rrect(u, r.x, r.y, r.w, r.h, 8); u.fillStyle = '#fff'; u.fill(); u.strokeStyle = 'rgba(42,22,8,.25)'; u.lineWidth = 1.5; u.stroke(); u.drawImage(Art.sym(s), r.x + 9, r.y + 6, 64, 64); });
      const fg = f.createLinearGradient(0, 0, 300, 230); fg.addColorStop(0, '#d9dde0'); fg.addColorStop(0.5, '#9aa3a8'); fg.addColorStop(1, '#e4e7ea');
      f.fillStyle = fg; cells.forEach((s, i) => { const r = cellRect(i); Art.rrect(f, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 9); f.fill(); });
      f.globalAlpha = 0.25; f.strokeStyle = '#fff'; f.lineWidth = 2; for (let i = -300; i < 300; i += 14) { f.beginPath(); f.moveTo(i, 230); f.lineTo(i + 230, 0); f.stroke(); }
      f.globalAlpha = 0.6; f.fillStyle = '#5a6268'; f.font = '11px Bungee, Impact'; f.textAlign = 'center'; cells.forEach((s, i) => { const r = cellRect(i); f.fillText('SCRATCH', r.x + r.w / 2, r.y + r.h / 2 + 4); });
      f.globalAlpha = 1;
      let down = false, lx = 0, ly = 0, done = false, lastCheck = 0;
      const pos = e => { const r = cf.getBoundingClientRect(); return { x: (e.clientX - r.left) * 300 / r.width, y: (e.clientY - r.top) * 230 / r.height }; };
      const scr = (a, b) => { f.globalCompositeOperation = 'destination-out'; f.lineCap = 'round'; f.lineWidth = 26; f.beginPath(); f.moveTo(a.x, a.y); f.lineTo(b.x, b.y); f.stroke(); f.globalCompositeOperation = 'source-over'; };
      cf.addEventListener('pointerdown', e => { if (done) return; down = true; cf.setPointerCapture(e.pointerId); const p = pos(e); lx = p.x; ly = p.y; scr(p, { x: p.x + 0.1, y: p.y }); Sound.scratchOn(); });
      cf.addEventListener('pointermove', e => {
        if (!down || done) return; const p = pos(e), d = Math.hypot(p.x - lx, p.y - ly);
        scr({ x: lx, y: ly }, p); lx = p.x; ly = p.y; Sound.scratchSet(Math.min(1, d / 14));
        if (Math.random() < 0.3) { const r = cf.getBoundingClientRect(); FX.screenBurst(r.left + p.x * r.width / 300, r.top + p.y * r.height / 230, 2, '#d9dde0', 80); }
        const now = performance.now(); if (now - lastCheck > 180) { lastCheck = now; if (revealed() > 0.62) finish(); }
      });
      const stop = () => { down = false; Sound.scratchSet(0); Sound.scratchOff(); };
      cf.addEventListener('pointerup', stop); cf.addEventListener('pointercancel', stop);
      function revealed() {
        const id = f.getImageData(0, 0, cf.width, cf.height).data; let tot = 0, clear = 0;
        cells.forEach((s, i) => { const r = cellRect(i); for (let yy = r.y + 6; yy < r.y + r.h - 6; yy += 8) for (let xx = r.x + 6; xx < r.x + r.w - 6; xx += 8) { tot++; if (id[((Math.floor(yy * dpr) * cf.width + Math.floor(xx * dpr)) << 2) + 3] < 40) clear++; } });
        return clear / tot;
      }
      function finish() {
        if (done) return; done = true; stop();
        cf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
        const resEl = m.querySelector('.scratch-res');
        if (prize) {
          resEl.innerHTML = `<span style="color:var(--gold)">${JACKPOTS[winSym].name}! YOU WIN $${prize}</span>`;
          Sound.jackpot(winSym === 'seven'); FX.confetti(prize >= 12 ? 120 : 50);
          if (winSym === 'seven') Meta.ach('scratch');
          cells.forEach((s, i) => { if (s === winSym) { const r = cellRect(i); u.strokeStyle = '#ffc23a'; u.lineWidth = 4; Art.rrect(u, r.x, r.y, r.w, r.h, 8); u.stroke(); } });
        } else { resEl.innerHTML = '<span style="color:var(--cream-d)">No luck. The house thanks you.</span>'; Sound.miss(); }
        const row = m.querySelector('.mrow'); row.innerHTML = `<button class="btn gold big">${prize ? 'COLLECT $' + prize : 'OKAY'}</button>`;
        row.querySelector('button').onclick = () => { Sound.click(); closeModal(); res(prize); };
      }
      m.querySelector('[data-a=rev]').onclick = () => finish();
      wrap.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    });
  }

  /* ---------------- screens ---------------- */
  function screen(html, cls = '') { E.screen.innerHTML = `<div class="scr ${cls}">${html}</div>`; E.screen.classList.add('on'); E.screen.scrollTop = 0; hideTip(); return E.screen.firstElementChild; }
  function closeScreen() { E.screen.classList.remove('on'); E.screen.innerHTML = ''; }
  function rankBox() {
    const d = Meta.data, need = xpForRank(d.rank), next = UNLOCKS.find(u => u[0] > d.rank);
    const nx = next ? next[1].map(k => unlockName(k)).join(', ') : 'Everything unlocked';
    return `<div class="rankbox"><div class="rk"><span>RANK ${d.rank}</span><span>${d.xp} / ${need} XP</span></div><div class="xpbar"><i style="width:${(d.xp / need) * 100}%"></i></div><div style="margin-top:6px;font-size:14px;color:var(--cream-d)">${next ? 'Rank ' + next[0] + ' unlocks: ' + nx : nx}</div></div>`;
  }
  function unlockName(k) {
    const [kind, id] = k.split(':');
    if (kind === 'pin') return PINS[id].name;
    if (kind === 'ball') return BALLS[id].name;
    if (kind === 'charm') return CHARMS[id].name;
    if (kind === 'ticket') return TICKETS[id].name;
    if (kind === 'cab') return CABINETS[id].name + ' cabinet';
    return id;
  }
  function title() {
    Game.enterTitle();
    setMode('title');
    E.shop.hidden = true; closeModal();
    Sound.music('lounge');
    const saved = Meta.data.run, d = Meta.data, daily = Meta.dailyInfo();
    const first = d.stats.runs === 0;
    const s = screen(`<div class="logo"><div class="marquee"></div><span class="l1">Fever</span><span class="l2">PARLOR</span></div>
      <div class="tagline">A PACHINKO ROGUELIKE &middot; OPEN ALL NIGHT</div>
      <div class="menu">
        ${saved ? `<button class="btn huge gold pulse" data-a="cont">CONTINUE<div style="font-size:12px;letter-spacing:.1em;margin-top:4px">FLOOR ${saved.floor} &middot; ${Game.ROUND_NAMES[saved.ri]}</div></button>` : ''}
        <button class="btn ${saved ? 'big' : 'huge pulse'}" data-a="new">${first ? 'PLAY' : 'NEW RUN'}</button>
        <div class="row"><button class="btn gold" data-a="daily">DAILY${daily.streak ? ` <span class="daily-chip">x${daily.streak}</span>` : ''}${daily.played ? '' : '<span class="newdot"></span>'}</button><button class="btn dark" data-a="coll">COLLECTION</button></div>
        <div class="row"><button class="btn dark" data-a="rec">RECORDS</button><button class="btn dark" data-a="set">SETTINGS</button></div>
      </div>${rankBox()}`, 'tdim');
    s.querySelectorAll('[data-a]').forEach(b => b.addEventListener('pointerenter', () => Sound.hover()));
    s.querySelector('[data-a=new]').onclick = () => {
      Sound.click();
      if (saved && !confirmOnce(s.querySelector('[data-a=new]'), 'ABANDON SAVED RUN?')) return;
      if (first || !Object.keys(CABINETS).some(k => k !== 'classic' && Meta.unlocked('cab', k)) && d.maxStake === 0) { Meta.data.run = null; Game.newRun({ cab: 'classic' }); }
      else runSelect();
    };
    const c = s.querySelector('[data-a=cont]'); if (c) c.onclick = () => { Sound.click(); Game.continueRun(); };
    s.querySelector('[data-a=daily]').onclick = () => { Sound.click(); dailyScreen(); };
    s.querySelector('[data-a=coll]').onclick = () => { Sound.click(); collection(); };
    s.querySelector('[data-a=rec]').onclick = () => { Sound.click(); records(); };
    s.querySelector('[data-a=set]').onclick = () => { Sound.click(); settings(); };
  }
  function confirmOnce(btn, text) {
    if (btn._armed) return true;
    btn._armed = true; const old = btn.innerHTML; btn.innerHTML = text;
    setTimeout(() => { btn._armed = false; btn.innerHTML = old; }, 2600);
    return false;
  }
  function backBtn(fn) { const b = el('button', 'btn dark back', Art.icon('left') + 'BACK'); b.onclick = () => { Sound.click(); fn(); }; E.screen.appendChild(b); }
  function runSelect() {
    const d = Meta.data;
    let cab = d.lastCab && Meta.unlocked('cab', d.lastCab) ? d.lastCab : 'classic', stake = Math.min(d.lastStake || 0, d.maxStake);
    const s = screen(`<h3 style="font-family:var(--fd);letter-spacing:.25em;color:var(--brass);margin:30px 0 0">CHOOSE YOUR CABINET</h3>
      <div class="cabs">${Object.keys(CABINETS).map(k => {
        const c = CABINETS[k], lock = !Meta.unlocked('cab', k), won = d.cabWins[k];
        return `<div class="cabcard${lock ? ' locked' : ''}" data-c="${k}"><div class="mini"></div><h4>${c.name}</h4><p>${lock ? 'Unlocks at Rank ' + Meta.unlockRank('cab', k) : c.desc}</p>${won != null && won >= 0 ? `<div class="wonmark">WON ON ${STAKES[won].name.toUpperCase()}</div>` : ''}</div>`;
      }).join('')}</div>
      <h3 style="font-family:var(--fd);letter-spacing:.25em;color:var(--brass);margin:4px 0 0">STAKES</h3>
      <div class="stakes">${STAKES.map((st, i) => `<button class="stake" data-s="${i}" ${i > d.maxStake ? 'disabled' : ''}>${st.name.toUpperCase()}</button>`).join('')}</div>
      <div class="stake-desc"></div>
      <button class="btn huge pulse" data-a="go">OPEN THE CABINET</button>`, 'dim');
    const upd = () => {
      s.querySelectorAll('.cabcard').forEach(c => c.classList.toggle('sel', c.dataset.c === cab));
      s.querySelectorAll('.stake').forEach(b => b.classList.toggle('sel', +b.dataset.s === stake));
      s.querySelector('.stake-desc').textContent = STAKES.slice(1, stake + 1).map(x => x.desc).join(' ') || STAKES[0].desc;
    };
    s.querySelectorAll('.cabcard').forEach(c => c.onclick = () => { if (c.classList.contains('locked')) { Sound.deny(); return; } cab = c.dataset.c; Sound.click(); upd(); });
    s.querySelectorAll('.stake').forEach(b => b.onclick = () => { stake = +b.dataset.s; Sound.click(); upd(); });
    s.querySelector('[data-a=go]').onclick = () => { Sound.buy(); d.lastCab = cab; d.lastStake = stake; Meta.data.run = null; Meta.save(); Game.newRun({ cab, stake }); };
    upd();
    backBtn(title);
  }
  function dailyScreen() {
    const info = Meta.dailyInfo(), c = CABINETS[info.cab];
    const s = screen(`<h3 style="font-family:var(--fd);letter-spacing:.25em;color:var(--brass);margin:0">DAILY RUN &middot; ${info.date}</h3>
      <h2 style="font-family:var(--fs);font-weight:400;font-size:44px;margin:0">${c.name}</h2>
      <p style="font-size:18px;color:var(--cream-d);max-width:420px;margin:0">${c.desc}<br>Stakes: ${STAKES[info.stake].name}. Same seed for everyone today.</p>
      <div class="statgrid"><div class="stat"><small>STREAK</small><b>${info.streak}</b></div><div class="stat"><small>TODAY'S BEST</small><b>${info.best ? 'F' + (Math.floor(info.best / 3) + 1) + ' R' + (info.best % 3 + 1) : '-'}</b></div><div class="stat"><small>PLAYED</small><b>${info.played ? 'YES' : 'NO'}</b></div></div>
      <button class="btn huge pulse" data-a="go">${info.played ? 'PLAY AGAIN' : 'PLAY TODAY'}</button>`, 'dim');
    s.querySelector('[data-a=go]').onclick = () => { Sound.buy(); Meta.data.run = null; Game.newRun({ cab: info.cab, stake: info.stake, daily: info.date }); };
    backBtn(title);
  }
  function collection(tab = 'charm') {
    const d = Meta.data, disc = d.discovered;
    const tabs = [['charm', 'CHARMS'], ['pin', 'PINS'], ['ball', 'BALLS'], ['ticket', 'TICKETS'], ['voucher', 'VOUCHERS'], ['boss', 'BOSSES']];
    let items = '';
    if (tab === 'charm') items = CHARM_LIST.map(c => {
      const lock = !Meta.unlocked('charm', c.id), known = disc.charm.includes(c.id);
      if (lock) return `<div class="ci" data-tip="${encodeURIComponent('<h4>Locked</h4><p>Unlocks at Rank ' + Meta.unlockRank('charm', c.id) + '.</p>')}"><div class="unk">${Art.icon('lock')}</div><small>RANK ${Meta.unlockRank('charm', c.id)}</small></div>`;
      if (!known) return `<div class="ci" data-tip="${encodeURIComponent('<h4>Undiscovered</h4><p>Buy it once to learn its secrets. ' + RAR[c.rar].name + '.</p>')}"><div class="unk">?</div><small>???</small></div>`;
      return `<div class="ci" data-tip="${encodeURIComponent(charmTip(null, c.id))}">${charmHTML({ id: c.id })}<small>${c.name}</small></div>`;
    }).join('');
    else if (tab === 'pin') items = Object.keys(PINS).filter(k => k !== 'basic').map(k => {
      const lock = !Meta.unlocked('pin', k), known = disc.pin.includes(k);
      if (lock) return `<div class="ci"><div class="unk">${Art.icon('lock')}</div><small>RANK ${Meta.unlockRank('pin', k)}</small></div>`;
      return `<div class="ci" data-tip="${encodeURIComponent(known ? pinTip(k) : '<h4>Undiscovered</h4><p>Place one on your board.</p>')}">${known ? `<img src="${Art.pinURL(k, PINS[k].r)}">` : '<div class="unk">?</div>'}<small>${known ? PINS[k].name : '???'}</small></div>`;
    }).join('');
    else if (tab === 'ball') items = Object.keys(BALLS).filter(k => k !== 'steel').map(k => {
      const lock = !Meta.unlocked('ball', k), known = disc.ball.includes(k);
      if (lock) return `<div class="ci"><div class="unk">${Art.icon('lock')}</div><small>RANK ${Meta.unlockRank('ball', k)}</small></div>`;
      return `<div class="ci" data-tip="${encodeURIComponent(known ? ballTip(k) : '<h4>Undiscovered</h4><p>Add one to your bag.</p>')}">${known ? `<img src="${Art.ballURL(k)}">` : '<div class="unk">?</div>'}<small>${known ? BALLS[k].name : '???'}</small></div>`;
    }).join('');
    else if (tab === 'ticket') items = Object.keys(TICKETS).map(k => {
      const lock = !Meta.unlocked('ticket', k), known = disc.ticket.includes(k);
      if (lock) return `<div class="ci"><div class="unk">${Art.icon('lock')}</div><small>RANK ${Meta.unlockRank('ticket', k)}</small></div>`;
      return `<div class="ci" data-tip="${encodeURIComponent(known ? ticketTip(k) : '<h4>Undiscovered</h4>')}">${known ? `<div class="ticket">${Art.icon(TICKETS[k].icon)}</div>` : '<div class="unk">?</div>'}<small>${known ? TICKETS[k].name : '???'}</small></div>`;
    }).join('');
    else if (tab === 'voucher') items = Object.keys(VOUCHERS).map(k => { const v = VOUCHERS[k], known = disc.voucher.includes(k); return `<div class="ci" data-tip="${encodeURIComponent(known ? `<h4>${v.name}</h4><span class="t-tag">VOUCHER</span><p>${rich(v.desc)}</p>` : '<h4>Undiscovered</h4><p>Beat bosses to be offered vouchers.</p>')}"><div class="unk" style="${known ? 'color:var(--gold)' : ''}">${known ? Art.icon(v.icon) : '?'}</div><small>${known ? v.name : '???'}</small></div>`; }).join('');
    else items = Object.keys(BOSSES).map(k => { const b = BOSSES[k]; return `<div class="ci" data-tip="${encodeURIComponent(`<h4>${b.name}</h4><span class="t-tag r4">BOSS</span><p>${rich(b.rule)}</p>`)}"><div class="unk" style="color:var(--mult)">${Art.icon(b.icon)}</div><small>${b.name}</small></div>`; }).join('');
    const total = CHARM_LIST.length, got = disc.charm.length;
    const s = screen(`<h2 style="font-family:var(--fs);font-weight:400;font-size:46px;margin:34px 0 0">Collection</h2>
      <div class="tagline">${got} / ${total} CHARMS DISCOVERED</div>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="tab${k === tab ? ' sel' : ''}" data-t="${k}">${n}</button>`).join('')}</div>
      <div class="coll">${items}</div>`, 'dim');
    s.querySelectorAll('.tab').forEach(b => b.onclick = () => { Sound.click(); collection(b.dataset.t); });
    s.querySelectorAll('[data-tip]').forEach(n => {
      n.addEventListener('pointerenter', () => showTip(n, decodeURIComponent(n.dataset.tip)));
      n.addEventListener('pointerleave', hideTip);
      n.addEventListener('click', () => showTip(n, decodeURIComponent(n.dataset.tip)));
    });
    backBtn(title);
  }
  function records() {
    const d = Meta.data, st = d.stats, got = ACH.filter(a => d.ach[a.id]).length;
    const hrs = Math.floor(st.playtime / 3600), mins = Math.floor((st.playtime % 3600) / 60);
    const s = screen(`<h2 style="font-family:var(--fs);font-weight:400;font-size:46px;margin:34px 0 0">Records</h2>
      <div class="statgrid">
        <div class="stat"><small>RUNS</small><b>${st.runs}</b></div><div class="stat"><small>WINS</small><b>${st.wins}</b></div><div class="stat"><small>BEST FLOOR</small><b>${st.bestFloor}</b></div>
        <div class="stat"><small>BEST BALL</small><b>${fmt(st.bestBall)}</b></div><div class="stat"><small>JACKPOTS</small><b>${st.jackpots}</b></div><div class="stat"><small>FEVERS</small><b>${st.fevers}</b></div>
        <div class="stat"><small>BALLS DROPPED</small><b>${fmt(st.drops)}</b></div><div class="stat"><small>ROUNDS WON</small><b>${st.rounds}</b></div><div class="stat"><small>TIME HERE</small><b>${hrs}h ${mins}m</b></div>
      </div>
      <h3 style="font-family:var(--fd);letter-spacing:.25em;color:var(--brass);margin:10px 0 0">ACHIEVEMENTS ${got} / ${ACH.length}</h3>
      <div class="achs">${ACH.map(a => `<div class="ach${d.ach[a.id] ? ' got' : ''}"><div class="a-ico">${Art.icon(a.icon)}</div><div><b>${a.name}</b><span>${a.desc}</span></div></div>`).join('')}</div>`, 'dim');
    backBtn(title);
    return s;
  }
  function settingsHTML() {
    const st = Meta.data.settings;
    return `<div class="settings">
      <div class="set-row"><span>MUSIC</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-k="music"></div>
      <div class="set-row"><span>SOUND FX</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-k="sfx"></div>
      <div class="set-row"><span>GAME SPEED</span><div class="seg">${[1, 1.5, 2, 3].map(v => `<button data-sp="${v}" class="${st.speed === v ? 'sel' : ''}">${v}x</button>`).join('')}</div></div>
      <div class="set-row"><span>SCREEN SHAKE</span><button class="toggle${st.shake ? ' on' : ''}" data-tg="shake"></button></div>
      <div class="set-row"><span>FLASHES</span><button class="toggle${st.flash ? ' on' : ''}" data-tg="flash"></button></div>
      <div class="keys"><b>MOUSE</b> aim + click &middot; <b>TOUCH</b> drag + release<br><b>SPACE</b> drop &middot; <b>A</b>/<b>D</b> aim &middot; <b>Z</b>/<b>X</b> nudge &middot; <b>1</b>-<b>4</b> tickets &middot; <b>C</b> cash out &middot; <b>F</b> speed &middot; <b>ESC</b> menu</div>
      <button class="btn dark" data-a="reset" style="align-self:flex-start">RESET ALL PROGRESS</button>
    </div>`;
  }
  function bindSettings(root) {
    const st = Meta.data.settings;
    root.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { st[r.dataset.k] = +r.value; Sound.setVol(r.dataset.k, +r.value); Meta.save(); });
    root.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { setSpeed(+b.dataset.sp, true); root.querySelectorAll('[data-sp]').forEach(o => o.classList.toggle('sel', o === b)); Sound.click(); });
    root.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const k = b.dataset.tg; st[k] = st[k] ? 0 : 1; b.classList.toggle('on', !!st[k]); FX.settings.shake = st.shake; Meta.save(); Sound.click(); });
    root.querySelector('[data-a=reset]').onclick = e => { if (confirmOnce(e.currentTarget, 'TAP AGAIN TO WIPE EVERYTHING')) { Meta.reset(); toast('Progress wiped. Fresh start.'); title(); } };
  }
  function settings() {
    const s = screen(`<h2 style="font-family:var(--fs);font-weight:400;font-size:46px;margin:0">Settings</h2>${settingsHTML()}`, 'dim');
    bindSettings(s);
    backBtn(title);
  }
  function pauseMenu() {
    if (Game.state === 'title' || E.modal.classList.contains('on')) return;
    U.paused = true;
    const m = modal(`<div class="mcard"><h3>THE PARLOR WAITS</h3><h2>Paused</h2><div class="mcol">
      <button class="btn big" data-a="res">RESUME</button>
      <button class="btn dark" data-a="set">SETTINGS</button>
      <button class="btn dark" data-a="menu">SAVE &amp; QUIT TO TITLE</button>
      <button class="btn dark" data-a="ab">ABANDON RUN</button></div></div>`);
    const resume = () => { closeModal(); U.paused = false; };
    m.querySelector('[data-a=res]').onclick = () => { Sound.click(); resume(); };
    m.querySelector('[data-a=set]').onclick = () => {
      Sound.click();
      m.innerHTML = `<h2>Settings</h2>${settingsHTML()}<div class="mrow"><button class="btn big" data-a="back">BACK</button></div>`;
      bindSettings(m);
      m.querySelector('[data-a=back]').onclick = () => { closeModal(); U.paused = false; pauseMenu(); };
    };
    m.querySelector('[data-a=menu]').onclick = () => { Sound.click(); U.paused = false; closeModal(); E.shop.hidden = true; Board.pick = null; placeBar(null); title(); };
    m.querySelector('[data-a=ab]').onclick = e => { if (!confirmOnce(e.currentTarget, 'TAP AGAIN TO ABANDON')) return; U.paused = false; closeModal(); E.shop.hidden = true; Board.pick = null; placeBar(null); Game.abandon(); };
  }
  function gameOver(info) {
    const { run, xp, res, won, abandoned } = info, rd = info.rd;
    setMode('title');
    E.shop.hidden = true; closeModal();
    const sub = rd ? `FLOOR ${run.floor} &middot; ${Game.ROUND_NAMES[run.ri]} &middot; ${fmt(rd.score)} / ${fmt(rd.quota)}` : `FLOOR ${run.floor}`;
    const legend = !won && run.won;
    const s = screen(`<div class="over-title${won || legend ? ' win' : ''}">${won ? 'HOUSE BROKEN' : legend ? 'LEGEND' : abandoned ? 'WALKED OUT' : 'BUSTED'}</div>
      <div class="tagline">${won ? 'YOU BEAT ALL EIGHT FLOORS' : legend ? 'BROKE THE HOUSE, THEN WENT DEEPER &middot; ' + sub : sub}</div>
      <div class="statgrid">
        <div class="stat" style="animation-delay:.1s"><small>FLOOR</small><b>${run.floor}</b></div><div class="stat" style="animation-delay:.15s"><small>ROUNDS WON</small><b>${run.stats.rounds}</b></div><div class="stat" style="animation-delay:.2s"><small>BEST BALL</small><b>${fmt(run.stats.best)}</b></div>
        <div class="stat" style="animation-delay:.25s"><small>JACKPOTS</small><b>${run.stats.jackpots}</b></div><div class="stat" style="animation-delay:.3s"><small>FEVERS</small><b>${run.stats.fevers}</b></div><div class="stat" style="animation-delay:.35s"><small>TOTAL SCORE</small><b>${fmt(run.stats.total)}</b></div>
      </div>
      <div class="rankbox"><div class="rk"><span class="rkn">RANK ${res.oldRank}</span><span>+${xp} XP</span></div><div class="xpbar"><i></i></div></div>
      <div class="unlocks"></div>
      <div class="menu"><button class="btn huge pulse" data-a="again">${run.daily ? 'TITLE' : 'PLAY AGAIN'}</button><button class="btn dark" data-a="menu">MAIN MENU</button></div>`, 'dim');
    const bar = s.querySelector('.xpbar i'), rkn = s.querySelector('.rkn'), ul = s.querySelector('.unlocks');
    let rank = res.oldRank, from = res.oldXP;
    bar.style.transition = 'none'; bar.style.width = (from / xpForRank(rank)) * 100 + '%';
    const animRank = () => {
      void bar.offsetWidth; bar.style.transition = '';
      if (rank < res.newRank) {
        bar.style.width = '100%';
        setTimeout(() => {
          rank++; rkn.textContent = 'RANK ' + rank + '  RANK UP!'; Sound.unlock(); FX.confetti(60);
          const u = UNLOCKS.find(x => x[0] === rank);
          if (u) u[1].forEach((k, j) => ul.insertAdjacentHTML('beforeend', `<div class="unlock" style="animation-delay:${j * 0.15}s"><small>UNLOCKED</small><b>${unlockName(k)}</b></div>`));
          bar.style.transition = 'none'; bar.style.width = '0%';
          setTimeout(animRank, 80);
        }, 1250);
      } else bar.style.width = (res.xpNow / res.need) * 100 + '%';
    };
    setTimeout(animRank, 600);
    s.querySelector('[data-a=again]').onclick = () => { Sound.buy(); if (run.daily) title(); else Game.newRun({ cab: run.cab, stake: run.stake }); };
    s.querySelector('[data-a=menu]').onclick = () => { Sound.click(); title(); };
  }
  function victory() {
    return new Promise(res => {
      setMode('title');
      const s = screen(`<div class="over-title win">HOUSE BROKEN</div><div class="tagline">ALL EIGHT FLOORS CLEARED</div>
        <p style="font-size:19px;color:var(--cream-d);max-width:440px;margin:0">The pit boss is weeping. The lights are still on. You could leave rich... or see how deep the night goes.</p>
        <div class="menu"><button class="btn huge gold pulse" data-a="end">KEEP PLAYING (ENDLESS)</button><button class="btn dark" data-a="out">CASH IN &amp; RETIRE</button></div>`, 'dim');
      s.querySelector('[data-a=end]').onclick = () => { Sound.buy(); closeScreen(); setMode('shop'); res('endless'); };
      s.querySelector('[data-a=out]').onclick = () => { Sound.click(); res('cashin'); };
    });
  }

  /* ---------------- hints ---------------- */
  const HINT_ANCHOR = { aim: () => E.board, score: () => E.left.querySelector('#calc'), hot: () => E.board, fever: () => E.reelBox, nudge: () => E.nudgeR, shop: () => E.shop.querySelector('.shop-head'), boss: () => E.bossTag, place: () => E.placeBar };
  function hint(id) {
    if (!Meta.data || Meta.data.hints[id]) return;
    if (U.hintOn === id || U.hintQ.includes(id)) return;
    U.hintQ.push(id);
    if (!U.hintOn) nextHint();
  }
  function nextHint() {
    const id = U.hintQ.shift();
    if (!id) { U.hintOn = null; return; }
    if (Meta.data.hints[id]) { nextHint(); return; }
    U.hintOn = id;
    setTimeout(() => {
      const a = HINT_ANCHOR[id] && HINT_ANCHOR[id]();
      if (!a || !a.offsetParent) { U.hintOn = null; U.hintQ.unshift(id); setTimeout(nextHint, 2500); return; }
      Meta.hint(id);
      const h = el('div', 'hintb', `<div class="h-top">TIP</div>${rich(HINTS[id])}<button class="btn gold h-ok">GOT IT</button>`);
      document.body.appendChild(h);
      const r = a.getBoundingClientRect(), hw = h.offsetWidth, hh = h.offsetHeight;
      let x = r.left + r.width / 2 - hw / 2, y = id === 'aim' || id === 'hot' ? r.top + r.height * 0.32 : r.bottom + 10;
      if (y + hh > innerHeight - 8) y = r.top - hh - 10;
      h.style.left = clamp(x, 8, innerWidth - hw - 8) + 'px'; h.style.top = clamp(y, 8, innerHeight - hh - 8) + 'px';
      let gone = false;
      const kill = () => { if (gone) return; gone = true; h.remove(); U.hintOn = null; setTimeout(nextHint, 400); };
      h.querySelector('.h-ok').onclick = () => { Sound.click(); kill(); };
      setTimeout(kill, 9000);
    }, 500);
  }

  return Object.assign(U, {
    E, init, layout, setMode, enterRound, hud, frame, scoreBump, calc, ballsLeft, money, moneyTarget, scoreTarget, reelsTarget, holds, heat, heatFull, nudges, cabShake, wind, cashoutBtn,
    charms, proc, tickets, bag, roundIntro, dismissIntro, banner, stamp, flash, jackpot, fever, reach, reachEnd, reelOmen, soClose, clutch, placeBar, toast, achToast,
    cashout, voucherPick, openShop, showShop, hideShop, closeShop, refreshShop, flyFromShop, pickBag, capsule, scratch,
    title, gameOver, victory, hint, pauseMenu, closeModal, hideTip,
  });
})();

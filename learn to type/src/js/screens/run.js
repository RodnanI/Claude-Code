/* Runs a plan (lesson, practice or test): steps one after another with a short card in between. */

Screens.run = {
  render(plan) {
    this.plan = plan;
    this.course = App.course;
    this.stepIdx = 0;
    this.results = [];
    this.misses = {};
    this.conf = {};
    this.notices = {};
    this.mism = 0;
    this.stop = Settings.get('errors') === 'stop' && !plan.test;
    this.tape = new Tape();
    return h('div', null,
      h('header', { class: 'bar' },
        h('div', { class: 'bar-l' }, h('div', { class: 'bar-title' }, plan.title), this.subEl = h('div', { class: 'bar-sub' })),
        this.dotsEl = h('div', { class: 'dots' }),
        h('div', { class: 'live' }, this.spdEl = h('span'), this.accEl = h('span'), this.clockEl = h('span', { class: 'clock' }))),
      this.stageEl = h('main', { class: 'stage' },
        this.noticeEl = h('div', { class: 'notice' }),
        plan.focus && plan.focus.length ? h('div', { class: 'focus-keys' }, t('focusOn', { keys: plan.focus.map(keyLabel).join(' ') })) : null,
        this.tape.el,
        this.hintEl = h('div', { class: 'fhint' }),
        this.progEl = h('div', { class: 'prog' }, h('i')),
        this.cardEl = h('div', { class: 'card hidden' })),
      this.kbWrap = h('div', { class: 'kbwrap' }),
      hintBar([['Esc', t('kPause')], !this.stop ? ['⌫', t('kBack')] : null]));
  },

  learned() { return this.plan.lesson ? this.plan.lesson.learned : this.course.learnedNow(); },

  mounted() {
    KB.mount(this.kbWrap);
    KB.scope(this.learned(), this.plan.newKeys);
    this.startStep();
  },

  leave() { clearInterval(this.timer); clearTimeout(this.hintTimer); KB.show(null); },

  onResize() { if (this.run) this.tape.moveTo(this.run.pos); },

  startStep() {
    clearInterval(this.timer);
    const st = this.step = this.plan.steps[this.stepIdx];
    this.run = new TypingRun(st.make(), this.stop);
    this.missedHere = false;
    this.state = 'typing';
    this.cardEl.classList.add('hidden');
    this.stageEl.classList.remove('carded');
    this.tape.el.classList.remove('hidden');
    this.tape.set(this.run.text);
    const n = this.plan.steps.length;
    this.subEl.textContent = t('s_' + st.label) + (n > 1 ? ' · ' + t('exerciseOf', { a: this.stepIdx + 1, b: n }) : '');
    this.dotsEl.replaceChildren(...(n > 1 ? this.plan.steps.map((_, i) => h('i', { class: i < this.stepIdx ? 'done' : i === this.stepIdx ? 'cur' : '' })) : []));
    this.clockEl.textContent = st.time ? fmtClock(st.time) : '';
    if (st.time) this.timer = setInterval(() => this.tick(), 200);
    this.updateLive();
    this.updateProgress();
    this.hintAt(0);
  },

  onChar(ch, e) {
    if (this.state !== 'typing' || (e && e.repeat)) return;
    if (e) this.checkEnv(e);
    const res = this.run.type(ch, performance.now());
    if (!res) return;
    const L = this.course.layout;
    if (res.first) Stats.key(this.course.prog, res.exp, res.ok, res.ms, res.got);
    const code = e && e.code && L.box[e.code] ? e.code : (L.chars[res.ok ? res.exp : ch] || {}).code;
    if (code) KB.flash(code, res.ok);
    if (res.ok) {
      Sound.click();
      this.tape.state(res.i, 'done');
      if (!res.first) this.tape.state(res.i, 'err');
      this.missedHere = false;
    } else {
      Sound.error();
      if (res.first) {
        this.misses[res.exp] = (this.misses[res.exp] || 0) + 1;
        const id = res.exp + '\u0001' + ch;
        this.conf[id] = (this.conf[id] || 0) + 1;
      }
      if (this.stop) { this.tape.miss(res.i, ch); this.missedHere = true; }
      else { this.tape.state(res.i, 'wrong'); this.tape.state(res.i, 'done'); }
    }
    if (this.step.time && this.run.text.length - this.run.pos < 90) {
      this.run.extend(this.step.more());
      this.tape.sync(this.run.text);
    }
    this.tape.moveTo(this.run.pos);
    this.updateLive();
    this.updateProgress();
    if (this.run.done) return this.finishStep();
    this.hintAt(this.run.pos);
  },

  backspace() {
    if (!this.run.back()) return;
    const i = this.run.pos;
    this.tape.state(i, 'wrong', false);
    this.tape.state(i, 'done', false);
    this.tape.moveTo(i);
    this.hintAt(i);
  },

  onKey(e) {
    const k = e.key, now = performance.now();
    if (this.guard && now < this.guard) return true;
    if (this.state === 'typing') {
      if (k === 'Escape') { this.pause(); return true; }
      if (k === 'Backspace') { this.backspace(); return true; }
      return false;
    }
    const go = k === ' ' || k === 'Enter', again = k === 'r' || k === 'R';
    if (this.state === 'paused') {
      if (go) this.resume();
      else if (again) { this.commit(this.run.result(), this.step.label, false); this.startStep(); }
      else if (k === 'Escape') this.quit();
      return true;
    }
    if (this.state === 'between') {
      if (go) { this.stepIdx++; this.startStep(); }
      else if (again) { this.results.pop(); this.startStep(); }
      else if (k === 'Escape') App.go('home');
      return true;
    }
    return true;
  },

  /* ----- hints: key highlight, finger overlay and the finger line under the tape ----- */

  hintMode(ch) {
    const m = Settings.get('hints');
    if (this.missedHere || m === 'always') return 'now';
    if (m === 'off') return 'never';
    if (this.plan.newKeys.includes(ch)) return 'now';
    const k = this.course.prog.keys[ch];
    return !k || k.n < 25 || k.er > 0.08 ? 'now' : 'delay';
  },

  hintAt(pos) {
    clearTimeout(this.hintTimer);
    const ch = this.run.text[pos];
    const mode = this.hintMode(ch);
    if (mode === 'now') return this.showHint(ch);
    this.showHint(null);
    if (mode === 'delay') this.hintTimer = setTimeout(() => {
      if (this.state === 'typing' && this.run.pos === pos) this.showHint(ch);
    }, 900);
  },

  showHint(ch) {
    KB.show(ch);
    if (ch == null) { this.hintEl.textContent = ''; return; }
    const L = this.course.layout, f = L.fingerOf(ch);
    const detail = this.missedHere || this.plan.newKeys.includes(ch);
    this.hintEl.textContent = detail ? `${charName(ch)}  ·  ${explainKey(L, ch)}` : f ? t('f_' + f) : '';
    this.hintEl.dataset.f = f ? f[1] : '';
  },

  /* ----- status ----- */

  checkEnv(e) {
    const caps = e.getModifierState && e.getModifierState('CapsLock');
    this.setNotice('caps', caps ? t('capsLock') : null);
    const lab = this.course.layout.keys[e.code];
    if (lab && /^(Key[A-Z]|Semicolon|Quote|BracketLeft)$/.test(e.code) && !e.altKey) {
      if (e.key === lab[0] || e.key === lab[1]) this.mism = 0;
      else if (++this.mism >= 3) this.setNotice('layout', t('layoutWarn'));
    }
  },

  setNotice(id, text) {
    if (text) this.notices[id] = text; else delete this.notices[id];
    this.noticeEl.textContent = Object.values(this.notices).join('   ·   ');
  },

  updateLive() {
    const r = this.run.result();
    const show = this.run.pos >= 5;
    this.spdEl.textContent = show ? fmtSpeed(r.wpm) : '';
    this.accEl.textContent = show ? fmtAcc(r.acc) : '';
  },

  updateProgress() {
    const f = this.step.time ? this.run.elapsed() / this.step.time : this.run.pos / this.run.text.length;
    this.progEl.firstChild.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + '%';
  },

  tick() {
    if (this.state !== 'typing') return;
    const left = this.step.time - this.run.elapsed();
    this.clockEl.textContent = fmtClock(left);
    this.updateProgress();
    if (left <= 0 && this.run.first) this.finishStep();
  },

  pause() {
    this.state = 'paused';
    this.pausedAt = performance.now();
    clearTimeout(this.hintTimer);
    this.card(t('paused'), null, null, [['Space', t('kResume')], ['R', t('kRestart')], ['Esc', t('kQuit')]]);
  },

  resume() {
    if (this.run.first) this.run.last += performance.now() - this.pausedAt;
    this.state = 'typing';
    this.cardEl.classList.add('hidden');
    this.stageEl.classList.remove('carded');
    this.tape.el.classList.remove('hidden');
    this.hintAt(this.run.pos);
  },

  quit() {
    clearInterval(this.timer);
    const r = this.run.result();
    if (r.chars) this.commit(r, this.step.label, false);
    App.go('home');
  },

  card(title, nums, msg, keys) {
    KB.show(null);
    this.hintEl.textContent = '';
    put(this.cardEl,
      h('div', { class: 'card-title' }, title),
      nums ? h('div', { class: 'metrics' }, nums) : null,
      msg ? h('p', { class: 'card-msg' }, msg) : null,
      hintBar(keys));
    this.cardEl.classList.remove('hidden');
    this.stageEl.classList.add('carded');
    this.tape.el.classList.add('hidden');
  },

  commit(r, label, complete) {
    const prog = this.course.prog;
    Stats.addTime(prog, r.ms, r.chars);
    if (complete && r.chars >= 10) Stats.addHist(prog, label, r);
    Coach.addActive(r.ms);
    Stats.pruneConf(prog);
    Store.save();
  },

  finishStep() {
    if (this.state !== 'typing') return;
    clearInterval(this.timer);
    clearTimeout(this.hintTimer);
    this.state = 'between';
    this.guard = performance.now() + 450;
    const r = this.run.result();
    this.commit(r, this.step.label, true);
    this.results.push(r);
    if (this.stepIdx >= this.plan.steps.length - 1) return this.finishPlan();
    const msg = r.acc < 90 ? 'm_stepBad' : r.acc >= 97 ? 'm_stepGreat' : 'm_stepOk';
    this.card(t('exerciseDone', { a: this.stepIdx + 1, b: this.plan.steps.length }),
      [metric(fmtSpeed(r.wpm, false), speedUnit()), metric(fmtAcc(r.acc), t('accuracy'))],
      t(msg), [['Space', t('kContinue')], ['R', t('kRepeat')], ['Esc', t('kQuit')]]);
  },

  finishPlan() {
    const rs = this.results, sum = k => rs.reduce((s, r) => s + r[k], 0);
    const chars = sum('chars'), ms = sum('ms'), errors = sum('errors'), unc = sum('uncorrected');
    const agg = {
      chars, ms, errors,
      wpm: Math.max(0, chars - unc) / 5 / (Math.max(ms, 1000) / 60000),
      acc: chars ? ((chars - errors) / chars) * 100 : 100
    };
    Sound.done();
    const plan = this.plan, prog = this.course.prog;
    let rec = {};
    if (plan.kind === 'lesson') rec = recordLesson(this.course, plan.idx, agg);
    else if (plan.kind === 'test') {
      const prev = prog.tests[plan.minutes] || 0;
      rec = { prev, newBest: agg.acc >= 90 && agg.wpm > prev };
      if (rec.newBest) prog.tests[plan.minutes] = +agg.wpm.toFixed(1);
      Store.save();
    }
    Coach.finished(plan, this.course, rec);
    App.go('result', { plan, agg, rec, misses: this.misses, conf: this.conf });
  }
};

/* Results after a lesson, practice round or test, with the coach's verdict and the next step on Space. */

Screens.result = {
  render({ plan, agg, rec, misses, conf }) {
    const c = this.course = App.course;
    this.plan = plan;
    this.guard = performance.now() + 900;
    this.next = Coach.next(c);
    const nd = Coach.describe(this.next, c);
    const extra = [];
    let head, stars = null, coach;

    if (plan.kind === 'lesson') {
      const L = plan.lesson, s = rec.stars, w2 = fmtSpeed(L.tgt[0]), w3 = fmtSpeed(L.tgt[1]);
      head = s >= 1 ? t('resultLesson', { n: plan.idx + 1 }) : t('failed');
      stars = starRow(s, 'stars big');
      coach = s === 0 ? t('c_fail') : s === 3 ? t('c_three') : s === 2 ? t('c_two', { w3 }) : agg.acc < 94 ? t('c_pass', { w2 }) : t('c_slow', { w2 });
      extra.push(h('div', { class: 'req' }, t('starsNeed', { w2, w3 })));
      if (rec.newBest) extra.push(h('div', { class: 'best' }, t('newBest')));
    } else if (plan.kind === 'test') {
      head = `${t('titleTest')} · ${plan.minutes} ${LANG === 'de' ? 'Min.' : 'min'}`;
      coach = t('c_test');
      if (rec.newBest) extra.push(h('div', { class: 'best' }, t('newBest')));
      else if (rec.prev) extra.push(h('div', { class: 'req' }, t('testBest', { d: plan.minutes, v: fmtSpeed(rec.prev) })));
    } else {
      head = plan.title;
      coach = t('c_practice');
    }

    const worst = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const typedFor = ch => {
      let best = null, n = 0;
      for (const id in conf) {
        const [e, g] = id.split('\u0001');
        if (e === ch && conf[id] > n) { best = g; n = conf[id]; }
      }
      return n >= 2 ? best : null;
    };
    const watch = worst.length
      ? h('div', { class: 'watch' }, h('div', { class: 'eyebrow' }, t('watchKeys')), worst.map(([ch, n]) => {
          const g = typedFor(ch);
          return h('div', { class: 'wk' },
            h('span', { class: 'cap', 'data-f': (c.layout.fingerOf(ch) || ' ')[1] }, keyLabel(ch)),
            h('span', null, [t('errCount', n), fingerName(c.layout, ch), g ? t('oftenTyped', { c: keyLabel(g) }) : ''].filter(Boolean).join('  ·  ')));
        }))
      : h('div', { class: 'watch clean' }, t('noErrors'));

    return h('div', null,
      h('main', { class: 'res' },
        h('div', { class: 'eyebrow' }, plan.title),
        h('h1', null, head),
        stars,
        h('div', { class: 'metrics' },
          metric(fmtSpeed(agg.wpm, false), speedUnit()), metric(fmtAcc(agg.acc), t('accuracy')), metric(fmtClock(agg.ms), t('time'))),
        extra,
        h('p', { class: 'coach' }, coach),
        watch),
      hintBar([['Space', nd.title], ['R', t('kRepeat')], ['Esc', t('kMenu')]]));
  },

  repeat() {
    const p = this.plan, c = this.course;
    if (p.kind === 'lesson') App.go('run', lessonPlan(c, p.idx));
    else if (p.kind === 'test') App.go('run', testPlan(c, p.minutes, p.source));
    else App.go('run', practicePlan(c, 'weak'));
  },

  onKey(e) {
    if (performance.now() < this.guard) return true;
    const k = e.key;
    if (k === ' ' || k === 'Enter') Coach.start(this.next, this.course);
    else if (k === 'r' || k === 'R') this.repeat();
    else if (k === 'Escape') App.go('home');
    return true;
  }
};

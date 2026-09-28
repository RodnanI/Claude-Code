/* The coach decides what comes next, so the learner can simply keep pressing Space.
   Order of priorities: breaks, a daily warm-up, a second attempt for weak passes,
   reviews every three new lessons, the next lesson, then free practice once the course is done. */

const Coach = {
  sess: { warm: {}, sinceBreak: 0, last: null, tries: {}, rot: 0 },

  addActive(ms) { this.sess.sinceBreak += ms; },

  next(course) {
    const S = this.sess, prog = course.prog;
    const brk = Settings.get('breaks');
    if (brk && S.sinceBreak >= brk * 60000) return { type: 'break' };
    if (!S.warm[course.lang] && course.lastPassed() >= 4 && Stats.today(prog) < 60000) return { type: 'practice', mode: 'warmup' };
    if (S.last && S.last.lang === course.lang) {
      const i = S.last.idx;
      if (course.stars(i) === 1 && (S.tries[course.lang + i] || 0) < 3) return { type: 'lesson', idx: i, repeat: true };
    }
    if (prog.review >= 3) return { type: 'practice', mode: 'review' };
    const fu = course.firstUnpassed();
    if (fu >= 0) return { type: 'lesson', idx: fu };
    const r = S.rot % 3;
    if (r === 0) return { type: 'practice', mode: 'weak' };
    if (r === 1) return { type: 'test', minutes: 1 };
    let best = -1;
    course.lessons.forEach((_, i) => { if (course.stars(i) < 3 && (best < 0 || course.stars(i) < course.stars(best))) best = i; });
    return best >= 0 ? { type: 'lesson', idx: best, polish: true } : { type: 'practice', mode: 'weak' };
  },

  describe(a, course) {
    switch (a.type) {
      case 'break':
        return { title: t('titleBreak'), sub: t('n_break', { min: Math.round(this.sess.sinceBreak / 60000) }) };
      case 'practice': {
        const w = Stats.weak(course, course.learnedNow());
        const keys = w.focus.map(keyLabel).join(' ');
        if (a.mode === 'warmup') return { title: t('titleWarmup'), sub: t('n_warmup', { keys }) };
        if (a.mode === 'review') return { title: t('titleReview'), sub: t('n_review', { keys }) };
        return { title: t('titlePractice'), sub: t('n_practice') };
      }
      case 'test':
        return { title: t('titleTest'), sub: t('n_test') };
      case 'lesson': {
        const L = course.lessons[a.idx];
        const title = `${t('lessonN', { n: a.idx + 1 })} · ${lessonTitle(L)}`;
        if (a.repeat) return { title, sub: t('n_repeat', { req: `${pct(94)} · ${fmtSpeed(L.tgt[0])}` }) };
        if (a.polish) return { title, sub: t('n_polish', { n: a.idx + 1 }) };
        return { title, sub: lessonDesc(L, course.layout) };
      }
    }
    return { title: '', sub: '' };
  },

  start(a, course) {
    switch (a.type) {
      case 'break': return App.go('pause');
      case 'practice': return App.go('run', practicePlan(course, a.mode));
      case 'test': return App.go('run', testPlan(course, a.minutes || 1, 'sentences'));
      case 'lesson': return startLesson(course, a.idx);
    }
  },

  go(course) { this.start(this.next(course), course); },

  /* Called after every finished plan. */
  finished(plan, course, res) {
    const S = this.sess;
    if (plan.kind === 'lesson') {
      S.last = { lang: course.lang, idx: plan.idx };
      const k = course.lang + plan.idx;
      S.tries[k] = (S.tries[k] || 0) + 1;
      if (res.stars >= 2) S.tries[k] = 99;
    } else {
      S.last = null;
      if (plan.mode === 'warmup') S.warm[course.lang] = true;
      if (plan.mode === 'review') course.prog.review = 0;
    }
    if (course.firstUnpassed() < 0 && plan.kind !== 'lesson') S.rot++;
    else if (course.firstUnpassed() < 0 && plan.kind === 'lesson') S.rot = 0;
  }
};

/* Lessons with new keys (or the very first lesson) open with an introduction screen. */
function startLesson(course, idx) {
  const plan = lessonPlan(course, idx);
  const L = course.lessons[idx];
  if (!course.passed(idx) && (L.type === 'new' || L.type === 'shiftL' || L.type === 'shiftR')) {
    return App.go('intro', { plan, onboarding: idx === 0 && !course.rec(0) });
  }
  App.go('run', plan);
}

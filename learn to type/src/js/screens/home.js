/* Course home: the coach's next step on top, then the menu. Space always does the recommended thing. */

Screens.home = {
  render() {
    const c = this.course = App.course, prog = c.prog;
    this.action = Coach.next(c);
    const d = Coach.describe(this.action, c);
    const todayMin = Math.floor(Stats.today(prog) / 60000), goal = Settings.get('goal');
    const streak = Stats.streak(prog);
    const recent = Stats.recentSpeed(prog);
    const fu = c.firstUnpassed();

    const next = h('section', { class: 'next item', onclick: () => this.activate(0) },
      h('div', { class: 'eyebrow' }, t('next')),
      h('div', { class: 'next-title' }, d.title),
      h('div', { class: 'next-sub' }, d.sub),
      h('div', { class: 'next-go' }, kbd('Space'), t('kStart')));

    let lastStage = null;
    const ticks = h('div', { class: 'ticks' }, c.lessons.map((l, i) => {
      const gap = lastStage && l.stage !== lastStage;
      lastStage = l.stage;
      const s = c.stars(i);
      return h('i', {
        class: ['s' + Math.max(0, s), gap ? 'gap' : '', i === fu ? 'cur' : '', c.unlocked(i) ? '' : 'locked'].join(' '),
        title: `${i + 1} · ${lessonTitle(l)}`
      });
    }));

    const menu = [
      ['1', 'menuLessons', 'menuLessonsSub', () => App.go('lessons')],
      ['2', 'menuPractice', 'menuPracticeSub', () => App.go('run', practicePlan(c, 'weak'))],
      ['3', 'menuTest', 'menuTestSub', () => App.go('test')],
      ['4', 'menuStats', 'menuStatsSub', () => App.go('stats')],
      ['5', 'menuSettings', 'menuSettingsSub', () => App.go('settings')]
    ];
    this.actions = [() => Coach.start(this.action, c), ...menu.map(m => m[3])];
    const items = menu.map(([k, label, sub], i) => h('div', { class: 'item mi', onclick: () => this.activate(i + 1) },
      h('span', { class: 'mk' }, k), h('span', { class: 'ml' }, t(label)), h('span', { class: 'ms' }, t(sub))));
    this.itemEls = [next, ...items];
    this.focus = 0;

    return h('div', null,
      h('header', { class: 'top' },
        h('div', { class: 'brand' }, h('div', { class: 'app' }, t('appName')), h('div', { class: 'course' }, `${t('course')} · ${t('layoutName')}`)),
        h('div', { class: 'today' },
          h('div', { class: 'streak' }, streak ? t('streak', streak) : t('noStreak')),
          h('div', { class: 'goal' + (todayMin >= goal ? ' done' : '') },
            h('div', { class: 'goal-bar' }, h('i', { style: `width:${Math.min(100, (todayMin / goal) * 100)}%` })),
            h('span', null, todayMin >= goal ? t('goalDone') : t('todayGoal', { a: todayMin, b: goal }))))),
      h('main', { class: 'home-main' },
        next,
        h('div', { class: 'course-line' },
          ticks,
          h('div', { class: 'course-meta' },
            h('span', null, fu < 0 ? t('completed') : t('progressOf', { a: fu + 1, b: c.lessons.length })),
            recent ? h('span', null, `${fmtSpeed(recent)} · ${t('st_recent')}`) : null)),
        h('nav', { class: 'menu' }, items)),
      hintBar([['↑ ↓', t('kSelect')], ['Space', t('kStart')], ['F', t('kFullscreen')], ['Esc', t('kLanguage')]]));
  },

  mounted() { this.mark(); },

  mark() { this.itemEls.forEach((el, i) => el.classList.toggle('focus', i === this.focus)); },

  activate(i) { this.actions[i](); },

  onKey(e) {
    const k = e.key;
    const m = listMove(e, this.focus, this.itemEls.length);
    if (m >= 0) { this.focus = m; this.mark(); }
    else if (k === ' ' || k === 'Enter') this.activate(this.focus);
    else if (k >= '1' && k <= '5') this.activate(+k);
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'Escape') App.go('select');
    return true;
  }
};

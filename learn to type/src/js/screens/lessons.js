/* Lesson overview grouped by stage. Arrows move, Space starts, the side panel explains the selection. */

Screens.lessons = {
  render() {
    const c = this.course = App.course;
    const fu = c.firstUnpassed();
    this.sel = fu < 0 ? c.lessons.length - 1 : fu;
    this.tiles = [];
    const stages = STAGES.map(s => ({ s, ls: c.lessons.filter(l => l.stage === s) })).filter(x => x.ls.length);
    this.rows = stages.map(x => x.ls.map(l => l.idx));
    const body = h('div', { class: 'stages' }, stages.map(x => h('section', { class: 'stage-row' },
      h('h3', null, t('stage_' + x.s)),
      h('div', { class: 'tiles' }, x.ls.map(l => (this.tiles[l.idx] = this.tile(l, fu)))))));
    this.detail = h('aside', { class: 'detail' });
    return h('div', null,
      h('header', { class: 'bar' },
        h('div', { class: 'bar-l' }, h('div', { class: 'bar-title' }, t('menuLessons')),
          h('div', { class: 'bar-sub' }, `${c.passedCount()} / ${c.lessons.length}`))),
      h('main', { class: 'lessons-main' }, body, this.detail),
      hintBar([['← → ↑ ↓', t('kChoose')], ['Space', t('kStart')], ['Esc', t('kBack')]]));
  },

  tile(l, fu) {
    const c = this.course, s = c.stars(l.idx);
    const cls = ['tile', c.unlocked(l.idx) ? '' : 'locked', s >= 1 ? 'passed' : '', l.idx === fu ? 'current' : ''];
    return h('div', { class: cls.join(' '), onclick: () => { this.select(l.idx); this.start(); } },
      h('span', { class: 'tn' }, l.idx + 1),
      h('span', { class: 'tg' }, lessonGlyph(l)),
      starRow(Math.max(0, s), 'tst'));
  },

  mounted() { this.select(this.sel); },

  select(i) {
    this.tiles[this.sel].classList.remove('focus');
    this.sel = i;
    const el = this.tiles[i];
    el.classList.add('focus');
    el.scrollIntoView({ block: 'nearest' });
    const c = this.course, L = c.lessons[i], r = c.rec(i);
    put(this.detail,
      h('div', { class: 'eyebrow' }, `${t('lessonN', { n: i + 1 })} · ${t('stage_' + L.stage)}`),
      h('h2', null, lessonTitle(L)),
      h('p', null, lessonDesc(L, c.layout)),
      reqRows(L.tgt),
      r ? h('p', { class: 'muted' }, `${t('bestLine', { wpm: fmtSpeed(r.wpm), acc: fmtAcc(r.acc) })} · ${t('playedN', r.runs)}`)
        : h('p', { class: 'muted' }, t('never')),
      c.unlocked(i) ? h('div', { class: 'next-go' }, kbd('Space'), t('kStart')) : h('p', { class: 'locked-note' }, t('locked')));
  },

  start() { if (this.course.unlocked(this.sel)) startLesson(this.course, this.sel); },

  onKey(e) {
    const k = e.key, n = this.course.lessons.length;
    const row = this.rows.findIndex(r => r.includes(this.sel)), col = this.rows[row].indexOf(this.sel);
    if (k === 'ArrowRight') this.select(Math.min(n - 1, this.sel + 1));
    else if (k === 'ArrowLeft') this.select(Math.max(0, this.sel - 1));
    else if (k === 'ArrowDown' && row < this.rows.length - 1) { const r = this.rows[row + 1]; this.select(r[Math.min(col, r.length - 1)]); }
    else if (k === 'ArrowUp' && row > 0) { const r = this.rows[row - 1]; this.select(r[Math.min(col, r.length - 1)]); }
    else if (k === ' ' || k === 'Enter') this.start();
    else if (k === 'Escape') App.go('home');
    return true;
  }
};

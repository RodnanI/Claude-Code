/* Speed test setup: duration and text source. The test itself runs on the run screen without error stops. */

const TEST_DUR = [1, 2, 3, 5];
const TEST_SRC = ['sentences', 'words'];

Screens.test = {
  render() {
    this.row = 0;
    this.d = TEST_DUR.indexOf(this.lastD || 1);
    this.s = TEST_SRC.indexOf(this.lastS || 'sentences');
    this.body = h('div', { class: 'settings narrow' });
    return h('div', null,
      h('header', { class: 'bar' }, h('div', { class: 'bar-l' }, h('div', { class: 'bar-title' }, t('testTitle')))),
      this.body,
      h('p', { class: 'shelp' }, t('testInfo')),
      hintBar([['↑ ↓', t('kSelect')], ['← →', t('kAdjust')], ['Space', t('kStart')], ['Esc', t('kBack')]]));
  },

  mounted() { this.draw(); },

  draw() {
    const prog = App.course.prog, min = TEST_DUR[this.d];
    const unit = LANG === 'de' ? 'Min.' : 'min';
    const rows = [
      [t('testDuration'), `${min} ${unit}`],
      [t('testSource'), t('v_' + TEST_SRC[this.s])]
    ];
    put(this.body,
      ...rows.map(([l, v], i) => h('div', { class: 'srow' + (i === this.row ? ' focus' : '') }, h('span', { class: 'sl' }, l), h('span', { class: 'sv' }, v))),
      h('p', { class: 'muted center' }, prog.tests[min] ? t('testBest', { d: min, v: fmtSpeed(prog.tests[min]) }) : ''));
  },

  onKey(e) {
    const k = e.key;
    const m = listMove(e, this.row, 2);
    if (m >= 0) this.row = m;
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const dir = k === 'ArrowRight' ? 1 : -1;
      if (this.row === 0) this.d = (this.d + dir + TEST_DUR.length) % TEST_DUR.length;
      else this.s = (this.s + dir + TEST_SRC.length) % TEST_SRC.length;
    } else if (k === ' ' || k === 'Enter') {
      this.lastD = TEST_DUR[this.d];
      this.lastS = TEST_SRC[this.s];
      return App.go('run', testPlan(App.course, this.lastD, this.lastS)), true;
    } else if (k === 'Escape') return App.go('home'), true;
    this.draw();
    return true;
  }
};

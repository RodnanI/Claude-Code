/* Break reminder with a five minute countdown. Space skips it at any time. */

Screens.pause = {
  render() {
    this.end = Date.now() + 5 * 60000;
    this.clock = h('div', { class: 'clock' }, '5:00');
    this.note = h('p', { class: 'muted' });
    return h('div', null,
      h('main', { class: 'brk' },
        h('div', { class: 'eyebrow' }, t('titleBreak')),
        h('h1', null, t('breakTitle')),
        this.clock,
        h('ul', null, t('breakTips').map(s => h('li', null, s))),
        this.note),
      hintBar([['Space', t('kContinue')], ['Esc', t('kMenu')]]));
  },

  mounted() {
    this.timer = setInterval(() => {
      const left = this.end - Date.now();
      this.clock.textContent = fmtClock(left);
      if (left <= 0) {
        clearInterval(this.timer);
        this.note.textContent = t('breakDone');
        Sound.done();
      }
    }, 250);
  },

  leave() { clearInterval(this.timer); Coach.sess.sinceBreak = 0; },

  onKey(e) {
    if (e.key === ' ' || e.key === 'Enter') { Coach.sess.sinceBreak = 0; Coach.go(App.course); }
    else if (e.key === 'Escape') App.go('home');
    return true;
  }
};

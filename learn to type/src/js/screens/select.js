/* Start screen: pick the English (QWERTY) or German (QWERTZ) course. */

Screens.select = {
  render() {
    this.sel = Store.data.lastLang === 'de' ? 1 : 0;
    const card = (lang, word) => {
      const prog = Store.data.courses[lang];
      const done = id => !!(prog && prog.lessons && prog.lessons[id] && prog.lessons[id].stars >= 1);
      const ids = COURSE_DEFS[lang].map(lessonId), total = ids.length;
      const passed = ids.filter(done).length, fu = ids.findIndex(id => !done(id));
      const streak = prog ? Stats.streak(Store.progress(lang)) : 0;
      return h('div', { class: 'lang-card', onclick: () => this.open(lang) },
        h('div', { class: 'lang-word' }, word.slice(0, -1), h('em', null, word.slice(-1))),
        h('div', { class: 'lang-name' }, tIn(lang, 'course')),
        h('div', { class: 'lang-sub' }, tIn(lang, 'layoutName')),
        h('div', { class: 'lang-prog' },
          h('div', { class: 'lang-bar' }, h('i', { style: `width:${(passed / total) * 100}%` })),
          h('span', null, !passed ? tIn(lang, 'notStarted') : fu < 0 ? tIn(lang, 'completed') : tIn(lang, 'progressOf', { a: fu + 1, b: total })),
          streak ? h('span', null, tIn(lang, 'streak', streak)) : null));
    };
    this.cards = [card('en', 'QWERTY'), card('de', 'QWERTZ')];
    return h('div', null,
      h('div', { class: 'sel' },
        h('h1', { class: 'sel-title' }, 'Learn to type', h('em', null, 'Tippen lernen')),
        h('div', { class: 'cards' }, this.cards)),
      hintBar([['← →', 'choose · wählen'], ['Space', 'start · starten'], ['F', 'fullscreen · Vollbild']]));
  },

  mounted() { this.mark(); },

  mark() { this.cards.forEach((c, i) => c.classList.toggle('on', i === this.sel)); },

  open(lang) {
    App.course = openCourse(lang);
    KB.build(App.course.layout);
    App.go('home');
  },

  onKey(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Tab') { this.sel = 1 - this.sel; this.mark(); }
    else if (k === '1' || k === 'e' || k === 'E') { this.sel = 0; this.mark(); }
    else if (k === '2' || k === 'd' || k === 'D') { this.sel = 1; this.mark(); }
    else if (k === ' ' || k === 'Enter') this.open(this.sel ? 'de' : 'en');
    else if (k === 'f' || k === 'F') toggleFullscreen();
    return true;
  }
};

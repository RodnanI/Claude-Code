/* Introduction before a lesson: onboarding pages for the very first lesson, then the new keys
   with the hands demonstrating each reach in a loop. */

Screens.intro = {
  render({ plan, onboarding }) {
    this.plan = plan;
    this.course = App.course;
    this.pages = onboarding ? t('ob').map(([title, paras], i) => ({ ob: true, title, paras, i })) : [];
    this.pages.push({ ob: false });
    this.page = 0;
    this.body = h('div', { class: 'intro-body' });
    this.kbWrap = h('div', { class: 'kbwrap' });
    this.foot = h('div', { class: 'foot' });
    return h('div', null, this.body, this.kbWrap, this.foot);
  },

  mounted() { KB.mount(this.kbWrap); this.draw(); },

  leave() { this.stopDemo(); KB.show(null); },

  stopDemo() { clearInterval(this.anim); clearTimeout(this.animT); },

  demo(keys) {
    let i = 0;
    const beat = () => {
      KB.show(keys[i++ % keys.length]);
      this.animT = setTimeout(() => KB.show(null), 850);
    };
    beat();
    this.anim = setInterval(beat, 1400);
  },

  draw() {
    this.stopDemo();
    KB.show(null);
    const pg = this.pages[this.page], L = this.plan.lesson, lay = this.course.layout;
    if (pg.ob) {
      const home = Object.values(HOME_KEY).filter(c => c !== 'Space').map(c => lay.keys[c][0]);
      KB.scope(new Set(home), pg.i === 1 ? home : []);
      put(this.body,
        h('div', { class: 'eyebrow' }, `${t('appName')} · ${pg.i + 1} / ${this.pages.length - 1}`),
        h('h1', null, pg.title),
        h('ul', { class: 'ob' }, pg.paras.map(p => h('li', null, p))));
      if (pg.i === 1) this.demo([' ']);
    } else {
      const shift = L.type === 'shiftL' || L.type === 'shiftR';
      const keys = shift ? L.keys.slice(0, 5) : this.plan.newKeys;
      KB.scope(L.learned, keys);
      put(this.body,
        h('div', { class: 'eyebrow' }, `${t('lessonN', { n: L.idx + 1 })} · ${t('newKeys')}`),
        h('div', { class: 'bigkeys' }, (shift ? ['⇧'] : []).concat(keys.map(keyLabel)).map(c => h('span', { class: 'cap' }, c))),
        shift ? h('p', { class: 'lead' }, lessonDesc(L, lay)) : null,
        h('ul', { class: 'explain' }, keys.map(k => h('li', null,
          h('b', { 'data-f': (lay.fingerOf(k) || ' ')[1] }, keyLabel(k)), h('span', null, explainKey(lay, k))))),
        h('p', { class: 'tip' }, t('introTip')));
      this.demo(keys);
    }
    const last = this.page === this.pages.length - 1;
    this.foot.replaceChildren(hintBar([['Space', last ? t('kStart') : t('kContinue')], this.page > 0 ? ['←', t('kBack')] : null, ['Esc', t('kMenu')]]));
  },

  onKey(e) {
    const k = e.key;
    if (k === ' ' || k === 'Enter' || k === 'ArrowRight') {
      if (this.page < this.pages.length - 1) { this.page++; this.draw(); } else App.go('run', this.plan);
    } else if ((k === 'ArrowLeft' || k === 'Backspace') && this.page > 0) { this.page--; this.draw(); }
    else if (k === 'Escape') App.go('home');
    return true;
  }
};

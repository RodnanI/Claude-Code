/* Typing engine: keystroke accounting for one exercise, plus the scrolling tape that displays it. */

const IDLE_CAP = 5000;

class TypingRun {
  constructor(text, stop) {
    this.text = text;
    this.stop = stop;
    this.pos = 0;
    this.errs = new Set();
    this.wrong = {};
    this.first = 0;
    this.last = 0;
    this.active = 0;
    this.lastOk = true;
    this.strokes = 0;
  }

  get done() { return this.pos >= this.text.length; }

  /* Active time: pauses longer than IDLE_CAP only count as IDLE_CAP. */
  elapsed(now = performance.now()) {
    return this.first ? this.active + Math.min(now - this.last, IDLE_CAP) : 0;
  }

  type(ch, now) {
    if (this.done) return null;
    if (!this.first) this.first = this.last = now;
    const gap = now - this.last;
    this.active += Math.min(gap, IDLE_CAP);
    this.last = now;
    this.strokes++;
    const i = this.pos, exp = this.text[i], first = !this.errs.has(i);
    if (ch === exp) {
      const ms = first && this.lastOk && this.strokes > 1 && gap < 3000 ? gap : 0;
      this.pos++;
      this.lastOk = first;
      return { ok: true, i, exp, first, ms };
    }
    this.errs.add(i);
    this.lastOk = false;
    if (!this.stop) { this.wrong[i] = ch; this.pos++; }
    return { ok: false, i, exp, got: ch, first };
  }

  back() {
    if (this.stop || this.pos === 0) return false;
    this.pos--;
    delete this.wrong[this.pos];
    return true;
  }

  extend(more) { this.text += ' ' + more; }

  result() {
    const n = this.pos;
    let errors = 0, uncorrected = 0;
    for (const i of this.errs) if (i < n) errors++;
    for (const i in this.wrong) if (+i < n) uncorrected++;
    const ms = Math.max(this.active, 1000);
    return {
      wpm: Math.max(0, n - uncorrected) / 5 / (ms / 60000),
      acc: n ? ((n - errors) / n) * 100 : 100,
      ms: this.active, chars: n, errors, uncorrected
    };
  }
}

class Tape {
  constructor() {
    this.strip = h('div', { class: 'strip' });
    this.ghosts = h('div', { class: 'ghosts' });
    this.el = h('div', { class: 'tape' }, this.strip, this.ghosts);
    this.spans = [];
    this.pos = -1;
  }

  add(text, from) {
    const frag = document.createDocumentFragment();
    for (let i = from; i < text.length; i++) {
      const ch = text[i];
      const sp = document.createElement('span');
      sp.className = ch === ' ' ? 'c sp' : 'c';
      sp.textContent = ch === ' ' ? '·' : ch;
      frag.append(sp);
      this.spans.push(sp);
    }
    this.strip.append(frag);
  }

  set(text) {
    this.strip.textContent = '';
    this.spans = [];
    this.pos = -1;
    this.add(text, 0);
    this.strip.style.transition = 'none';
    this.moveTo(0);
    void this.strip.offsetWidth;
    this.strip.style.transition = '';
  }

  sync(text) { if (text.length > this.spans.length) this.add(text, this.spans.length); }

  moveTo(pos) {
    const old = this.spans[this.pos];
    if (old) old.classList.remove('cur', 'bad');
    this.pos = pos;
    const sp = this.spans[pos];
    if (sp) sp.classList.add('cur');
    const lastSp = this.spans[this.spans.length - 1];
    const x = sp ? sp.offsetLeft : lastSp ? lastSp.offsetLeft + lastSp.offsetWidth : 0;
    this.strip.style.transform = `translateX(${-x}px)`;
  }

  state(i, cls, on = true) { const sp = this.spans[i]; if (sp) sp.classList.toggle(cls, on); }

  miss(i, got) {
    const sp = this.spans[i];
    if (!sp) return;
    sp.classList.remove('bad');
    void sp.offsetWidth;
    sp.classList.add('bad');
    const g = h('span', { class: 'ghost' }, got === ' ' ? '␣' : got);
    this.ghosts.append(g);
    setTimeout(() => g.remove(), 700);
  }
}

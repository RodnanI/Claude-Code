/* Text generation. Everything produced here only uses characters the learner already knows. */

const LANGDATA = {};

function prepLang(lang) {
  if (LANGDATA[lang]) return LANGDATA[lang];
  const D = lang === 'de' ? DATA_DE : DATA_EN;
  const seen = new Set(), words = [];
  for (const w of D.words) {
    if (!w || seen.has(w)) continue;
    seen.add(w);
    words.push({ w, r: words.length });
  }
  // Letter models of order 2 and 1 for pronounceable pseudo-words.
  const m2 = new Map(), m1 = new Map();
  const add = (m, ctx, ch) => {
    let t = m.get(ctx);
    if (!t) m.set(ctx, t = new Map());
    t.set(ch, (t.get(ch) || 0) + 1);
  };
  for (const { w } of words) {
    const s = '^^' + w.toLowerCase() + '$';
    for (let i = 2; i < s.length; i++) { add(m2, s.slice(i - 2, i), s[i]); add(m1, s[i - 1], s[i]); }
  }
  return (LANGDATA[lang] = { D, words, m2, m1, lower: new Set(words.map(x => x.w.toLowerCase())) });
}

const isDigit = c => c >= '0' && c <= '9';
const PUNCT = new Set([...',.;:!?"\'-/']);

class TextGen {
  constructor(lang, layout, learned, opts = {}) {
    this.L = prepLang(lang);
    this.lang = lang;
    this.layout = layout;
    this.learned = learned;
    this.letters = [...learned].filter(c => isLetter(c) && !isUpper(c));
    this.focus = opts.focus || [];
    this.fset = new Set(this.focus);
    this.weights = opts.weights || null;
    this.recent = [];
    this.pool = [];
    for (const { w, r } of this.L.words) {
      const f = this.form(w);
      if (f) this.pool.push({ w: f, r });
    }
  }

  ok(s) {
    if (s == null) return false;
    for (const c of s) if (!this.learned.has(c)) return false;
    return true;
  }

  form(w) {
    if (this.ok(w)) return w;
    const lw = w.toLowerCase();
    return lw !== w && this.ok(lw) ? lw : null;
  }

  focusCount(w, fset = this.fset) {
    let n = 0;
    for (const c of w) if (fset.has(c) || fset.has(c.toLowerCase())) n++;
    return n;
  }

  /* ---------- words ---------- */

  pickWord({ focus = this.focus, pool = this.pool } = {}) {
    if (!pool.length) return null;
    const fset = new Set(focus);
    const W = this.weights;
    const w = pickWeighted(pool, it => {
      let v = 1 / Math.sqrt(1 + it.r / 60);
      if (fset.size) { const n = this.focusCount(it.w, fset); v *= n ? 1 + 2.5 * Math.min(n, 2) : 0.3; }
      if (W) { let s = 0; for (const c of it.w) s += W[c.toLowerCase()] || 0; v *= 1 + 4 * Math.min(s, 1.5); }
      if (this.recent.includes(it.w)) v *= 0.04;
      return v;
    }).w;
    this.recent.push(w);
    if (this.recent.length > 10) this.recent.shift();
    return w;
  }

  focusPoolSize(focus) {
    const fset = new Set(focus);
    return this.pool.filter(it => this.focusCount(it.w, fset) > 0).length;
  }

  /* ---------- pseudo-words ---------- */

  nextLetter(w, allowed, fset, canEnd, wantEnd) {
    const c2 = ('^^' + w).slice(-2), c1 = ('^' + w).slice(-1);
    for (const [m, ctx] of [[this.L.m2, c2], [this.L.m1, c1]]) {
      const tbl = m.get(ctx);
      if (!tbl) continue;
      const opts = [];
      for (const [ch, n] of tbl) {
        if (ch === '$') { if (canEnd) opts.push([ch, n * (wantEnd ? 5 : 0.6)]); }
        else if (allowed.has(ch)) opts.push([ch, n * (fset.has(ch) ? 2.5 : 1)]);
      }
      if (opts.length) return pickWeighted(opts, o => o[1])[0];
    }
    return canEnd ? '$' : pick([...allowed]);
  }

  pseudo(focus = this.focus, start = '') {
    const letters = this.letters;
    if (!letters.length) return start;
    const allowed = new Set(letters);
    const fset = new Set(focus.filter(c => allowed.has(c)));
    for (let a = 0; a < 30; a++) {
      let w = start;
      const target = 3 + rand(4);
      while (w.length < 9) {
        const ch = this.nextLetter(w, allowed, fset, w.length >= 2, w.length >= target);
        if (ch === '$') break;
        w += ch;
      }
      if (w.length < 2 || /(.)\1\1/.test(w)) continue;
      if (fset.size && ![...w].some(c => fset.has(c))) continue;
      if (this.recent.includes(w)) continue;
      this.recent.push(w);
      if (this.recent.length > 10) this.recent.shift();
      return w;
    }
    const f = [...fset];
    let w = '';
    const L = 2 + rand(3);
    for (let i = 0; i < L; i++) w += f.length && Math.random() < 0.5 ? pick(f) : pick(letters);
    return w;
  }

  /* ---------- assembly ---------- */

  join(tokens) { return tokens.filter(Boolean).join(' '); }

  fill(n, make) {
    const out = [];
    let len = 0, guard = 0;
    while (len < n && guard++ < 500) {
      const s = make();
      if (!s) continue;
      out.push(s);
      len += s.length + 1;
    }
    return out;
  }

  /* Turn a word list into sentences using whatever punctuation and capitals are known. */
  punctuate(tokens) {
    const L = this.learned;
    if (!L.has('.') && !L.has(',')) return this.join(tokens);
    const out = [];
    let i = 0;
    while (i < tokens.length) {
      const len = 4 + rand(6);
      const sent = tokens.slice(i, i + len);
      i += len;
      if (L.has('.')) {
        const c = cap(sent[0]);
        if (this.ok(c)) sent[0] = c;
      }
      for (let k = 1; k < sent.length - 1; k++) if (L.has(',') && Math.random() < 0.12) sent[k] += ',';
      if (L.has('.')) {
        const r = Math.random();
        sent[sent.length - 1] += r < 0.07 && L.has('?') ? '?' : r < 0.13 && L.has('!') ? '!' : '.';
      }
      out.push(sent.join(' '));
    }
    return out.join(' ');
  }

  /* ---------- drills ---------- */

  anchor(k) {
    const m = this.layout.chars[k];
    if (!m) return k;
    const base = this.layout.keys[m.code] ? this.layout.keys[m.code][0] : null;
    if ((m.shift || m.altgr) && base && base !== k && this.learned.has(base)) return base;
    const f = FINGER_OF[m.code];
    if (!f || f[1] === 't') return k;
    const home = this.layout.homeChar(f);
    return home && this.learned.has(home) && home !== k ? home : k;
  }

  drill(keys, n) {
    const list = keys.filter(k => this.learned.has(k));
    if (!list.length) return this.mix(n);
    const start = [];
    for (const k of list) {
      const a = this.anchor(k);
      if (a !== k) start.push(a + k + a, k + k + k, a + k + k);
      else start.push(k + k + k, k + k);
    }
    const pats = ['kk', 'kkk', 'aka', 'kak', 'akk', 'kka', 'akak'];
    const rest = this.fill(Math.max(0, n - start.join(' ').length), () => {
      if (list.length > 1 && Math.random() < 0.45) {
        let g = '';
        const L = 2 + rand(3);
        for (let i = 0; i < L; i++) g += pick(list);
        return g;
      }
      const k = pick(list), a = this.anchor(k);
      return [...pick(pats)].map(p => (p === 'k' ? k : a)).join('');
    });
    return this.join([...start, ...rest]);
  }

  pairs(keys, n) {
    const news = keys.filter(k => this.learned.has(k) && isLetter(k));
    if (!news.length) return this.drill(keys, n);
    const olds = this.letters.filter(c => !news.includes(c));
    const m1 = this.L.m1;
    const affinity = (k, o) => ((m1.get(k) && m1.get(k).get(o)) || 0) + ((m1.get(o) && m1.get(o).get(k)) || 0) + 2;
    const pats = ['ko', 'ok', 'kok', 'oko', 'kko', 'okk', 'koko', 'okko'];
    return this.join(this.fill(n, () => {
      const k = pick(news);
      const o = olds.length ? pickWeighted(olds, x => affinity(k, x)) : pick(news);
      return [...pick(pats)].map(p => (p === 'k' ? k : o)).join('');
    }));
  }

  rowdrill(keys, n) {
    const list = keys.filter(k => this.learned.has(k));
    if (!list.length) return this.mix(n);
    const groups = [];
    for (const k of list) { const a = this.anchor(k); groups.push(a !== k ? a + k + a : k + k); }
    const x = k => { const m = this.layout.chars[k]; return m ? this.layout.center[m.code][0] : 0; };
    const side = k => { const m = this.layout.chars[k]; return m ? this.layout.side(m.code) : 'r'; };
    const byX = list.slice().sort((p, q) => x(p) - x(q));
    for (const s of ['l', 'r']) {
      const run = byX.filter(k => side(k) === s);
      if (run.length > 1) groups.push(run.join(''), run.slice().reverse().join(''));
    }
    return this.join(this.fill(n, () => pick(groups)));
  }

  shiftdrill(uppers, n) {
    const ups = uppers.filter(u => this.learned.has(u));
    if (!ups.length) return this.mix(n);
    return this.join(this.fill(n, () => {
      const U = pick(ups), l = U.toLowerCase(), o = pick(this.letters);
      if (Math.random() < 0.35) return U + this.pseudo([], l).slice(1);
      return pick([U + l, U + l + l, l + U, U + o, U + o + l, U + l + o]);
    }));
  }

  /* ---------- word based ---------- */

  pseudoText(focus, n) {
    return this.join(this.fill(n, () => this.pseudo(focus)));
  }

  /* Only words that contain at least one focus key. */
  words(n, focus = this.focus) {
    const fset = new Set(focus);
    const pool = this.pool.filter(it => this.focusCount(it.w, fset) > 0);
    if (pool.length < 6) return this.pseudoText(focus, n);
    return this.join(this.fill(n, () => this.pickWord({ focus, pool })));
  }

  mix(n, focus = this.focus) {
    const small = this.pool.length < 40;
    const tokens = this.fill(n, () =>
      small && Math.random() < 0.45 || !this.pool.length ? this.pseudo(focus) : this.pickWord({ focus }));
    return this.punctuate(tokens);
  }

  capwords(uppers, n) {
    const set = new Set(uppers);
    let cands = [];
    for (const it of this.pool) {
      if (set.has(it.w[0])) cands.push({ w: it.w, r: it.r, nat: true });
      else {
        const c = cap(it.w);
        if (set.has(c[0]) && this.ok(c)) cands.push({ w: c, r: it.r + 150 });
      }
    }
    for (const nm of this.L.D.names) if (set.has(nm[0]) && this.ok(nm)) cands.push({ w: nm, r: 40, nat: true });
    // German capitalises nouns, so real nouns and names teach better than capitalised verbs.
    const natural = cands.filter(x => x.nat);
    if (this.lang === 'de' && natural.length >= 15) cands = natural;
    if (cands.length < 4) return this.shiftdrill(uppers, n);
    const tokens = this.fill(n, () => (Math.random() < 0.55 ? this.pickWord({ pool: cands, focus: [] }) : this.pickWord({ focus: [] })));
    return this.join(tokens);
  }

  top(n, N) {
    const pool = N ? this.pool.filter(it => it.r < N) : this.pool;
    return this.join(this.fill(n, () => this.pickWord({ pool, focus: [] })));
  }

  groupsDrill(list, n) {
    const groups = list.filter(g => this.ok(g));
    if (!groups.length) return this.mix(n);
    return this.join(this.fill(n, () => {
      const g = pick(groups);
      const w = this.pickWord({ focus: [], pool: this.pool.filter(it => it.w.toLowerCase().includes(g)).slice(0, 60) });
      return `${g} ${g} ${w || g}`;
    }));
  }

  groupWords(list, n) {
    const groups = list.filter(g => this.ok(g));
    const pool = this.pool.filter(it => groups.some(g => it.w.toLowerCase().includes(g)));
    if (pool.length < 10) return this.mix(n);
    return this.punctuate(this.fill(n, () => this.pickWord({ pool, focus: [] })));
  }

  /* ---------- sentences ---------- */

  adapt(s) {
    const L = this.learned;
    let r = '';
    for (const c of s) {
      if (L.has(c)) { r += c; continue; }
      if (isLetter(c)) {
        const l = c.toLowerCase();
        if (l !== c && L.has(l)) { r += l; continue; }
        return null;
      }
      if (isDigit(c) || c === '\'') return null;
      if (c === '-' || c === '/') { r += ' '; continue; }
      if (c === '?' || c === '!') { if (L.has('.')) r += '.'; continue; }
      if (c === ':' || c === ';') { if (L.has(',')) r += ','; continue; }
      if (c === '"' || c === '(' || c === ')' || c === ',' || c === '.') continue;
      return null;
    }
    r = r.replace(/\s+/g, ' ').replace(/ ([,.])/g, '$1').replace(/([,.]){2,}/g, '$1').trim();
    return r.length > 10 ? r : null;
  }

  sentences(filter) {
    if (!this._sent) this._sent = this.L.D.sentences.map(s => this.adapt(s)).filter(Boolean);
    return filter ? this._sent.filter(filter) : this._sent;
  }

  sentenceText(n, filter) {
    let pool = this.sentences(filter);
    if (pool.length < 6) pool = this.sentences();
    if (pool.length < 6) return this.mix(n);
    const used = new Set();
    return this.join(this.fill(n, () => {
      let s, tries = 0;
      do s = pick(pool); while (used.has(s) && tries++ < 20);
      used.add(s);
      return s;
    }));
  }

  /* ---------- numbers and symbols ---------- */

  digits() { return [...this.learned].filter(isDigit); }

  num(maxLen = 3) {
    const ds = this.digits();
    if (!ds.length) return '\u0000';
    const L = 1 + rand(maxLen);
    let s = '';
    for (let i = 0; i < L; i++) s += pickWeighted(ds, d => (this.fset.has(d) ? 3 : 1));
    return s.length > 1 && s[0] === '0' ? s.slice(1) : s;
  }

  numbers(n) { return this.join(this.fill(n, () => this.num(4))); }

  numctx(n) {
    const tokens = this.fill(n, () => (Math.random() < 0.45 ? this.num(3) : this.pickWord({ focus: [] }) || this.num(2)));
    return this.punctuate(tokens);
  }

  helpers() {
    const two = v => String(v).padStart(2, '0');
    const digitsOnly = s => (this.ok(s) ? s : '\u0000');
    return {
      w: () => this.pickWord({ focus: [] }) || '\u0000',
      W: () => cap(this.pickWord({ focus: [] }) || '\u0000'),
      n: () => this.num(3),
      d: () => this.num(1),
      y: () => digitsOnly(String(1900 + rand(126))),
      h: () => digitsOnly(String(1 + rand(23))),
      m: () => digitsOnly(two(rand(12) * 5)),
      c: () => pick(this.L.D.contractions),
      q: () => pick(this.L.D.qwords)
    };
  }

  context(keys, n) {
    const focus = keys.filter(k => this.learned.has(k));
    const T = this.helpers();
    const tpl = this.L.D.tpl;
    const sents = this.sentences(s => focus.some(c => s.includes(c)));
    const out = [], used = new Set();
    let len = 0, fails = 0;
    while (len < n && fails < 300) {
      let s = null;
      const fresh = sents.filter(x => !used.has(x));
      if (fresh.length && Math.random() < 0.3) { s = pick(fresh); used.add(s); }
      else {
        const c = pick(focus), list = tpl[c];
        s = list ? pick(list)(T) : this.anchor(c) + c + this.anchor(c);
      }
      if (!this.ok(s)) { fails++; continue; }
      out.push(s);
      len += s.length + 1;
      if (Math.random() < 0.3) { const w = this.pickWord({ focus: [] }); if (w) { out.push(w); len += w.length + 1; } }
    }
    return out.length ? this.join(out) : this.drill(focus, n);
  }

  /* ---------- adaptive ---------- */

  /* Weighted towards weak letters; weak digits or symbols (extra) appear in short contexts. */
  adaptive(n, extra = []) {
    const T = extra.length ? this.helpers() : null;
    const tokens = this.fill(n, () => {
      if (T && Math.random() < 0.15) {
        const c = pick(extra), list = this.L.D.tpl[c];
        const s = isDigit(c) ? this.num(3) : list ? pick(list)(T) : null;
        if (this.ok(s)) return s;
      }
      return Math.random() < 0.22 || this.pool.length < 30 ? this.pseudo(this.focus) : this.pickWord({ focus: this.focus });
    });
    return this.punctuate(tokens);
  }

  speedText(n) {
    return Math.random() < 0.5 ? this.top(n, 200) : this.sentenceText(n);
  }
}

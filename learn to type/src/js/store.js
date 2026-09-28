/* Persistence (localStorage), settings, per-course progress and per-key statistics. */

const STORE_KEY = 'learn-to-type.v1';
const DEFAULT_SETTINGS = {
  theme: 'auto', hints: 'adaptive', errors: 'stop', keyboard: true, hands: true, colors: true,
  sound: 'errors', size: 2, length: 'normal', goal: 60, breaks: 30, unit: 'auto', unlock: false
};

const Store = {
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { d = null; }
    this.data = this.normalize(d);
  },
  normalize(d) {
    if (!d || typeof d !== 'object') d = {};
    d.v = 1;
    d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    d.courses = d.courses && typeof d.courses === 'object' ? d.courses : {};
    return d;
  },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
  },
  progress(lang) {
    const c = this.data.courses[lang] || (this.data.courses[lang] = {});
    c.lessons = c.lessons || {};
    c.keys = c.keys || {};
    c.conf = c.conf || {};
    c.hist = c.hist || [];
    c.days = c.days || {};
    c.tests = c.tests || {};
    c.review = c.review || 0;
    return c;
  },
  reset(lang) { delete this.data.courses[lang]; this.save(); }
};

const Settings = {
  get(k) { return Store.data.settings[k]; },
  set(k, v) { Store.data.settings[k] = v; Store.save(); applySettings(); }
};

function starsFor(acc, wpm, tgt) {
  if (acc < 90) return 0;
  if (acc >= 97 && wpm >= tgt[1]) return 3;
  if (acc >= 94 && wpm >= tgt[0]) return 2;
  return 1;
}

function openCourse(lang) {
  LANG = lang;
  document.documentElement.lang = lang;
  Store.data.lastLang = lang;
  Store.save();
  const layout = makeLayout(lang);
  const lessons = buildCourse(lang, layout);
  return {
    lang, layout, lessons,
    get prog() { return Store.progress(lang); },
    rec(i) { return this.prog.lessons[lessons[i].id]; },
    stars(i) { const r = this.rec(i); return r ? r.stars : -1; },
    passed(i) { return this.stars(i) >= 1; },
    firstUnpassed() { return lessons.findIndex((_, i) => !this.passed(i)); },
    lastPassed() { for (let i = lessons.length - 1; i >= 0; i--) if (this.passed(i)) return i; return -1; },
    passedCount() { return lessons.filter((_, i) => this.passed(i)).length; },
    unlocked(i) { return i === 0 || Settings.get('unlock') || this.passed(i - 1); },
    learnedNow() { return lessons[Math.max(0, this.lastPassed())].learned; }
  };
}

const Stats = {
  /* One keystroke at a text position. ms is the flow time since the previous correct key. */
  key(prog, ch, ok, ms, got) {
    const k = prog.keys[ch] || (prog.keys[ch] = { n: 0, e: 0, er: 0, ms: 0 });
    k.n++;
    if (!ok) k.e++;
    k.er = k.er * 0.9 + (ok ? 0 : 0.1);
    if (ok && ms) k.ms = k.ms ? k.ms * 0.85 + ms * 0.15 : ms;
    if (!ok && got != null && got !== ch) {
      const id = ch + '\u0001' + got;
      prog.conf[id] = (prog.conf[id] || 0) + 1;
    }
  },

  pruneConf(prog) {
    const e = Object.entries(prog.conf);
    if (e.length < 300) return;
    prog.conf = Object.fromEntries(e.sort((a, b) => b[1] - a[1]).slice(0, 150));
  },

  addTime(prog, ms, chars) {
    const k = dayKey();
    const d = prog.days[k] || (prog.days[k] = { ms: 0, ch: 0, nl: 0 });
    d.ms += ms;
    d.ch += chars;
  },

  addHist(prog, label, r) {
    prog.hist.push([Date.now(), label, +r.wpm.toFixed(1), +r.acc.toFixed(1), Math.round(r.ms), r.chars]);
    if (prog.hist.length > 500) prog.hist.splice(0, prog.hist.length - 500);
  },

  today(prog) { return (prog.days[dayKey()] || { ms: 0 }).ms; },

  totalMs(prog) { return Object.values(prog.days).reduce((s, d) => s + d.ms, 0); },

  streak(prog) {
    const d = new Date();
    const has = x => (prog.days[dayKey(x)] || { ms: 0 }).ms >= 60000;
    if (!has(d)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (has(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },

  /* Average speed over recent exercises with real words (drills excluded). */
  recentSpeed(prog) {
    const real = new Set(['words', 'mix', 'sentences', 'text', 'top', 'practice', 'test', 'warmup', 'review', 'weak', 'capwords', 'groupwords']);
    const r = prog.hist.filter(h => real.has(h[1]) && h[4] > 15000).slice(-10);
    return r.length ? r.reduce((s, h) => s + h[2], 0) / r.length : 0;
  },

  /* Weakness per learned letter from error rate and hesitation; top three become the focus. */
  weak(course, learned, restrict) {
    const prog = course.prog;
    const src = (restrict && restrict.length ? restrict : [...learned]).filter(c => learned.has(c) && c !== ' ');
    const letters = src.filter(c => isLetter(c) && !isUpper(c));
    const others = src.filter(c => !isLetter(c));
    const known = src.map(c => prog.keys[c]).filter(k => k && k.n >= 8 && k.ms).map(k => k.ms).sort((a, b) => a - b);
    const median = known.length ? known[known.length >> 1] : 0;
    const score = c => {
      const k = prog.keys[c];
      if (!k || k.n < 8) return 0.5;
      return clamp(k.er * 4 + (median && k.ms ? Math.max(0, k.ms / median - 1) : 0), 0, 1.5);
    };
    const weights = {};
    for (const c of letters) weights[c] = score(c);
    const focus = letters.slice().sort((a, b) => weights[b] - weights[a]).slice(0, 3);
    const extra = others.filter(c => score(c) > 0.45).sort((a, b) => score(b) - score(a)).slice(0, 2);
    return { focus, weights, extra };
  },

  /* Per physical key: merged error rate and reaction time for the heatmap. */
  perCode(course) {
    const out = {};
    const keys = course.prog.keys;
    for (const ch in keys) {
      const m = course.layout.chars[ch];
      if (!m) continue;
      const k = keys[ch], o = out[m.code] || (out[m.code] = { n: 0, e: 0, er: 0, ms: 0, w: 0 });
      o.n += k.n;
      o.e += k.e;
      o.er += k.er * k.n;
      if (k.ms) { o.ms += k.ms * k.n; o.w += k.n; }
    }
    for (const c in out) { const o = out[c]; o.er /= o.n || 1; o.ms = o.w ? o.ms / o.w : 0; }
    return out;
  },

  topConfusions(prog, n = 6) {
    return Object.entries(prog.conf).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, c]) => {
      const [exp, got] = id.split('\u0001');
      return { exp, got, c };
    });
  }
};

function recordLesson(course, idx, res) {
  const L = course.lessons[idx], prog = course.prog;
  const r = prog.lessons[L.id] || (prog.lessons[L.id] = { stars: 0, wpm: 0, acc: 0, runs: 0 });
  const stars = starsFor(res.acc, res.wpm, L.tgt);
  const prevStars = r.runs ? r.stars : -1;
  const firstPass = !(r.stars >= 1 && r.runs) && stars >= 1;
  const newBest = r.runs > 0 && res.wpm > r.wpm && stars >= 1;
  r.runs++;
  r.last = Date.now();
  if (stars > r.stars) r.stars = stars;
  if (res.wpm > r.wpm && stars >= 1) r.wpm = +res.wpm.toFixed(1);
  if (res.acc > r.acc) r.acc = +res.acc.toFixed(1);
  if (firstPass) {
    prog.review++;
    const d = prog.days[dayKey()];
    if (d) d.nl++;
  }
  Store.save();
  return { stars, prevStars, firstPass, newBest };
}

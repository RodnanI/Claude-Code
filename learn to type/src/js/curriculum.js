/* Course structure: stages, lessons, step plans and star targets. */

const COURSE_DEFS = {
  en: [
    ['home', 'new', 'fj'], ['home', 'new', 'dk'], ['home', 'new', 'sl'], ['home', 'new', 'a;'], ['home', 'new', 'gh'], ['home', 'review'],
    ['top', 'new', 'ei'], ['top', 'new', 'ru'], ['top', 'new', 'ty'], ['top', 'new', 'wo'], ['top', 'new', 'qp'], ['top', 'review'],
    ['bottom', 'new', 'nv'], ['bottom', 'new', 'mc'], ['bottom', 'new', 'b,'], ['bottom', 'new', 'x.'], ['bottom', 'new', 'z/'], ['bottom', 'review'],
    ['caps', 'shiftL'], ['caps', 'shiftR'], ['caps', 'caps'],
    ['punct', 'new', '\'"'], ['punct', 'new', '?:'],
    ['num', 'new', '4567'], ['num', 'new', '38'], ['num', 'new', '29'], ['num', 'new', '10-'], ['num', 'review'],
    ['sym', 'new', '!@#$'], ['sym', 'new', '%^&*'], ['sym', 'new', '()_+='], ['sym', 'new', '[]{}\\|'], ['sym', 'new', '`~<>'], ['sym', 'review'],
    ['flow', 'words', 100], ['flow', 'words', 400], ['flow', 'words', 0], ['flow', 'groups'], ['flow', 'sent1'], ['flow', 'sent2'],
    ['flow', 'text'], ['flow', 'speed', 30], ['flow', 'speed', 38], ['flow', 'speed', 46], ['flow', 'speed', 55]
  ],
  de: [
    ['home', 'new', 'fj'], ['home', 'new', 'dk'], ['home', 'new', 'sl'], ['home', 'new', 'aö'], ['home', 'new', 'gh'], ['home', 'review'],
    ['top', 'new', 'ei'], ['top', 'new', 'ru'], ['top', 'new', 'tz'], ['top', 'new', 'wo'], ['top', 'new', 'qp'], ['top', 'new', 'üä'], ['top', 'review'],
    ['bottom', 'new', 'nv'], ['bottom', 'new', 'mc'], ['bottom', 'new', 'b,'], ['bottom', 'new', 'x.'], ['bottom', 'new', 'y-'], ['bottom', 'new', 'ß'], ['bottom', 'review'],
    ['caps', 'shiftL'], ['caps', 'shiftR'], ['caps', 'caps'],
    ['num', 'new', '4567'], ['num', 'new', '38'], ['num', 'new', '29'], ['num', 'new', '10'], ['num', 'review'],
    ['punct', 'new', ':;?'], ['punct', 'new', '!"\''],
    ['sym', 'new', '#+*'], ['sym', 'new', '§$%&'], ['sym', 'new', '/()='], ['sym', 'new', '@€'], ['sym', 'new', '<>|'], ['sym', 'new', '{}[]\\~'], ['sym', 'review'],
    ['flow', 'words', 100], ['flow', 'words', 400], ['flow', 'words', 0], ['flow', 'groups'], ['flow', 'sent1'], ['flow', 'sent2'],
    ['flow', 'text'], ['flow', 'speed', 30], ['flow', 'speed', 38], ['flow', 'speed', 46], ['flow', 'speed', 55]
  ]
};

const STAGES = ['home', 'top', 'bottom', 'caps', 'punct', 'num', 'sym', 'flow'];
const STAGE_TGT = { home: [8, 14], top: [10, 16], bottom: [12, 18], caps: [12, 18], punct: [12, 18], num: [9, 14], sym: [7, 12] };
const FLOW_TGT = { 'words:100': [24, 32], 'words:400': [22, 30], 'words:0': [20, 28], groups: [20, 28], sent1: [20, 28], sent2: [18, 26], text: [20, 28] };

/* Keycap style label: letters upper case, except ß whose upper case would be "SS". */
const keyLabel = c => (c === ' ' ? '␣' : isLetter(c) && c.toUpperCase().length === 1 ? c.toUpperCase() : c);

const lessonId = ([stage, type, arg]) =>
  type === 'new' ? 'new:' + arg : type === 'review' ? 'review:' + stage : arg != null ? `${type}:${arg}` : type;

function buildCourse(lang, layout) {
  const learned = new Set([' ']);
  const lessons = [];
  COURSE_DEFS[lang].forEach(([stage, type, arg], idx) => {
    let keys = [];
    if (type === 'new') keys = [...arg];
    else if (type === 'shiftL' || type === 'shiftR') {
      const want = type === 'shiftL' ? 'r' : 'l';
      keys = [...learned]
        .filter(c => isLetter(c) && !isUpper(c) && layout.chars[c.toUpperCase()] && layout.side(layout.chars[c].code) === want)
        .map(c => c.toUpperCase());
    }
    for (const k of keys) learned.add(k);
    const id = lessonId([stage, type, arg]);
    const tgt = type === 'speed' ? [arg - 8, arg] : stage === 'flow' ? FLOW_TGT[id] : STAGE_TGT[stage];
    const stageKeys = type === 'review' ? lessons.filter(l => l.stage === stage).flatMap(l => l.keys) : null;
    lessons.push({ id, idx, stage, type, arg, keys, stageKeys, learned: new Set(learned), tgt });
  });
  return lessons;
}

/* Punctuation is spoken ("B and comma"), since a bare "," inside a sentence is hard to read. */
const keyWord = c => t('keyNames')[c] || keyLabel(c);

function lessonTitle(L) {
  switch (L.type) {
    case 'new': return L.keys.length === 2 ? cap(`${keyWord(L.keys[0])} ${t('and')} ${keyWord(L.keys[1])}`) : L.keys.map(keyLabel).join(' ');
    case 'review': return t('t_review', { stage: t('stage_' + L.stage) });
    case 'shiftL': return t('t_shiftL');
    case 'shiftR': return t('t_shiftR');
    case 'caps': return t('t_caps');
    case 'words': return L.arg ? t('t_words', { n: L.arg }) : t('t_wordsAll');
    case 'groups': return t('t_groups');
    case 'sent1': return t('t_sent1');
    case 'sent2': return t('t_sent2');
    case 'text': return t('t_text');
    case 'speed': return t('t_speed', { w: fmtSpeed(L.arg) });
  }
  return '';
}

/* Short label for lesson tiles. */
function lessonGlyph(L) {
  switch (L.type) {
    case 'new': return L.keys.map(keyLabel).join(' ');
    case 'review': return '↺';
    case 'shiftL': return '⇧ ' + L.keys[0];
    case 'shiftR': return L.keys[0] + ' ⇧';
    case 'caps': return 'Aa.';
    case 'words': return L.arg ? String(L.arg) : 'abc';
    case 'groups': return LANG === 'de' ? 'sch' : 'th';
    case 'sent1': return 'Ab.';
    case 'sent2': return 'Ab, 1!';
    case 'text': return '¶';
    case 'speed': return '» ' + fmtSpeed(L.arg, false);
  }
  return '';
}

function lessonDesc(L, layout) {
  switch (L.type) {
    case 'new': return t('d_new', { list: L.keys.map(k => `${t('keyNames')[k] ? `${t('keyNames')[k]} ${k}` : keyLabel(k)} (${fingerName(layout, k)})`).join('  ·  ') });
    case 'review': return t('d_review');
    case 'shiftL': return t('d_shiftL');
    case 'shiftR': return t('d_shiftR');
    case 'caps': return t('d_caps');
    case 'words': return t('d_words');
    case 'groups': return t('d_groups');
    case 'sent1': return t('d_sent1');
    case 'sent2': return t('d_sent2');
    case 'text': return t('d_text');
    case 'speed': return t('d_speed', { w: fmtSpeed(L.arg) });
  }
  return '';
}

function fingerName(layout, ch) {
  const f = layout.fingerOf(ch);
  return f ? t('f_' + f) : '';
}

/* How to type a character: finger, movement from the home key, modifier keys. */
function explainKey(layout, ch) {
  const st = layout.strokes(ch);
  if (!st) return '';
  const main = st[0], f = main.finger;
  if (f === 'thumbs') return `${t('f_thumbs')}, ${t('dir_thumb')}`;
  const home = HOME_KEY[f];
  let dir = 'home';
  if (main.code !== home && f[1] !== 't') {
    const [hx, hy] = layout.center[home], [x, y] = layout.center[main.code];
    const dx = x - hx, dy = y - hy;
    const v = dy <= -1.5 ? 'up2' : dy <= -0.5 ? 'up' : dy >= 0.5 ? 'down' : '';
    const hz = dx >= 0.7 ? 'R' : dx <= -0.7 ? 'L' : '';
    dir = v ? v + hz : hz === 'R' ? 'right' : 'left';
  }
  let out = `${t('f_' + f)}, ${t('dir_' + dir, { home: keyLabel(layout.keys[home][0]) })}`;
  for (const m of st.slice(1)) out += ', ' + t(m.code === 'AltRight' ? 'modAltGr' : m.code === 'ShiftLeft' ? 'modShiftL' : 'modShiftR');
  return out;
}

function lengthFactor() {
  return { short: 0.7, normal: 1, long: 1.5 }[Settings.get('length')] || 1;
}

/* A plan is a titled list of steps; each step produces fresh text every time it is (re)started. */
function lessonPlan(course, idx) {
  const L = course.lessons[idx];
  const D = prepLang(course.lang).D;
  const gen = new TextGen(course.lang, course.layout, L.learned, { focus: L.keys });
  const f = lengthFactor();
  const S = (label, n, make) => ({ label, make: () => make(Math.round(n * f)) });
  const K = L.keys;
  const steps = [];

  switch (L.type) {
    case 'new': {
      const letters = K.filter(isLetter), digits = K.filter(isDigit), other = K.filter(c => !isLetter(c) && !isDigit(c));
      steps.push(S('drill', 60, n => gen.drill(K, n)));
      if (letters.length) {
        if (gen.letters.length < 7) {
          steps.push(S('pairs', 70, n => gen.pairs(letters, n)), S('drill', 70, n => gen.drill(K, n)), S('pairs', 90, n => gen.pairs(letters, n)));
        } else {
          steps.push(S('pairs', 70, n => gen.pairs(letters, n)), S('pseudo', 90, n => gen.pseudoText(letters, n)));
          if (gen.focusPoolSize(letters) >= 6) steps.push(S('words', 110, n => gen.words(n, letters)));
        }
      }
      if (digits.length) steps.push(S('numbers', 70, n => gen.numbers(n)), S('numctx', 110, n => gen.numctx(n)));
      if (other.length) {
        const label = other.every(c => PUNCT.has(c)) ? 'punct' : 'symctx';
        steps.push(S(label, 110, n => gen.context(other, n)));
        if (!letters.length && !digits.length) steps.push(S(label, 130, n => gen.context(other, n)));
      }
      if (letters.length) steps.push(S('mix', 140, n => gen.mix(n)));
      else if (!other.length) steps.push(S('numctx', 140, n => gen.numctx(n)));
      else steps.push(S('mix', 150, n => gen.join([gen.context(other, n * 0.5), digits.length ? gen.numctx(n * 0.5) : gen.mix(n * 0.5)])));
      break;
    }
    case 'review': {
      const SK = L.stageKeys;
      const weak = n => {
        const w = Stats.weak(course, L.learned, SK);
        return new TextGen(course.lang, course.layout, L.learned, { focus: w.focus, weights: w.weights }).adaptive(n);
      };
      steps.push(S('rowdrill', 80, n => gen.rowdrill(SK, n)));
      if (L.stage === 'num') steps.push(S('numbers', 90, n => gen.numbers(n)), S('numctx', 120, n => gen.numctx(n)), S('numctx', 150, n => gen.numctx(n)));
      else if (L.stage === 'sym') steps.push(S('symctx', 120, n => gen.context(SK, n)), S('symctx', 140, n => gen.context(SK, n)), S('weak', 150, weak));
      else {
        const letters = SK.filter(isLetter);
        steps.push(S('words', 120, n => gen.words(n, letters)), S('pseudo', 100, n => gen.pseudoText(letters, n)), S('weak', 120, weak), S('mix', 180, n => gen.mix(n, letters)));
      }
      break;
    }
    case 'shiftL':
    case 'shiftR':
      steps.push(S('shiftdrill', 60, n => gen.shiftdrill(K, n)), S('capwords', 100, n => gen.capwords(K, n)),
        S('capwords', 120, n => gen.capwords(K, n)), S('mix', 150, n => gen.mix(n)));
      break;
    case 'caps': {
      const U = [...L.learned].filter(isUpper);
      steps.push(S('capwords', 100, n => gen.capwords(U, n)), S('sentences', 150, n => gen.sentenceText(n)),
        S('sentences', 180, n => gen.sentenceText(n)), S('mix', 180, n => gen.mix(n)));
      break;
    }
    case 'words':
      for (let i = 0; i < 5; i++) steps.push(S('top', 150, n => gen.top(n, L.arg)));
      break;
    case 'groups':
      steps.push(S('bigrams', 100, n => gen.groupsDrill(D.bigrams, n)), S('trigrams', 100, n => gen.groupsDrill(D.trigrams, n)),
        S('groupwords', 140, n => gen.groupWords(D.bigrams.concat(D.trigrams), n)), S('groupwords', 160, n => gen.groupWords(D.trigrams, n)));
      break;
    case 'sent1':
      for (let i = 0; i < 4; i++) steps.push(S('sentences', 170, n => gen.sentenceText(n, s => s.length <= 64 && !/[0-9]/.test(s))));
      break;
    case 'sent2':
      for (let i = 0; i < 4; i++) steps.push(S('sentences', 200, n => gen.sentenceText(n)));
      break;
    case 'text':
      for (let i = 0; i < 3; i++) steps.push(S('text', 330, n => gen.sentenceText(n)));
      break;
    case 'speed':
      for (let i = 0; i < 4; i++) steps.push(S('mix', 200, n => gen.speedText(n)));
      break;
  }
  return {
    kind: 'lesson', idx, lesson: L, title: `${t('lessonN', { n: idx + 1 })} · ${lessonTitle(L)}`,
    newKeys: L.type === 'review' ? [] : K, steps
  };
}

function practicePlan(course, mode) {
  const learned = course.learnedNow();
  let restrict = null;
  if (mode === 'review') {
    const last = course.lastPassed();
    restrict = course.lessons.slice(Math.max(0, last - 2), last + 1).flatMap(l => l.keys);
    if (!restrict.length) restrict = null;
  }
  const w = Stats.weak(course, learned, restrict);
  const gen = new TextGen(course.lang, course.layout, learned, { focus: w.focus, weights: w.weights });
  const secs = mode === 'warmup' ? 90 : mode === 'review' ? 150 : Math.round(120 * lengthFactor());
  const title = t(mode === 'warmup' ? 'titleWarmup' : mode === 'review' ? 'titleReview' : 'titlePractice');
  return {
    kind: 'practice', mode, title, focus: w.focus, newKeys: [],
    steps: [{
      label: mode === 'warmup' ? 'warmup' : mode === 'review' ? 'review' : 'practice', time: secs * 1000,
      make: () => gen.adaptive(700, w.extra), more: () => gen.adaptive(300, w.extra)
    }]
  };
}

function testPlan(course, minutes, source) {
  const gen = new TextGen(course.lang, course.layout, course.learnedNow(), {});
  const make = n => (source === 'words' ? gen.top(n, 300) : gen.sentenceText(n));
  return {
    kind: 'test', minutes, source, title: t('titleTest'), newKeys: [], test: true,
    steps: [{ label: 'test', time: minutes * 60000, make: () => make(minutes * 500), more: () => make(500) }]
  };
}

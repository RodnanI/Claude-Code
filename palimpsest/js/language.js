/* Palimpsest / language
   Every people gets a sound system, a lexicon of roots, a way of spelling itself
   in Latin letters, and a sequence of sound changes that wear its words down
   over the centuries. Names are stored as sounds, not letters, so a town founded
   as Kelavarna can be called Kelvarn four hundred years later without anyone
   deciding it should. */
'use strict';
(function () {
  const P = window.P;

  /* ---------- the phoneme table ---------- */
  const C = (m, p, v) => ({ t: 'C', m, p, v });
  const V = (h, b, r, L) => ({ t: 'V', h, b, r, L: L || 0 });
  const PH = {
    p: C('stop', 'lab', 0), b: C('stop', 'lab', 1), t: C('stop', 'alv', 0), d: C('stop', 'alv', 1),
    k: C('stop', 'vel', 0), g: C('stop', 'vel', 1), q: C('stop', 'uvu', 0), 'ʔ': C('stop', 'glot', 0),
    m: C('nasal', 'lab', 1), n: C('nasal', 'alv', 1), 'ɲ': C('nasal', 'pal', 1), 'ŋ': C('nasal', 'vel', 1),
    f: C('fric', 'lab', 0), v: C('fric', 'lab', 1), 'θ': C('fric', 'dent', 0), 'ð': C('fric', 'dent', 1),
    s: C('fric', 'alv', 0), z: C('fric', 'alv', 1), 'ʃ': C('fric', 'post', 0), 'ʒ': C('fric', 'post', 1),
    x: C('fric', 'vel', 0), 'ɣ': C('fric', 'vel', 1), h: C('fric', 'glot', 0),
    ts: C('affr', 'alv', 0), dz: C('affr', 'alv', 1), 'tʃ': C('affr', 'post', 0), 'dʒ': C('affr', 'post', 1),
    r: C('liquid', 'alv', 1), l: C('lateral', 'alv', 1), j: C('glide', 'pal', 1), w: C('glide', 'lab', 1),
    i: V(0, 0, 0), y: V(0, 0, 1), 'ɨ': V(0, 1, 0), u: V(0, 2, 1),
    e: V(1, 0, 0), 'ø': V(1, 0, 1), 'ə': V(1.5, 1, 0), o: V(1, 2, 1),
    'ɛ': V(2, 0, 0), 'ɔ': V(2, 2, 1), a: V(3, 1, 0), 'ɑ': V(3, 2, 0),
    'iː': V(0, 0, 0, 1), 'eː': V(1, 0, 0, 1), 'aː': V(3, 1, 0, 1), 'oː': V(1, 2, 1, 1), 'uː': V(0, 2, 1, 1),
    'yː': V(0, 0, 1, 1), 'øː': V(1, 0, 1, 1), 'ɛː': V(2, 0, 0, 1), 'ɔː': V(2, 2, 1, 1),
  };
  const PLACES = ['lab', 'dent', 'alv', 'post', 'pal', 'vel', 'uvu', 'glot'];
  const MANNER_GROUP = { stop: 0, affr: 0.5, fric: 1, nasal: 2, liquid: 3, lateral: 3.2, glide: 4 };
  const isV = (p) => !!PH[p] && PH[p].t === 'V';
  const isC = (p) => !!PH[p] && PH[p].t === 'C';
  const LONG = { a: 'aː', e: 'eː', i: 'iː', o: 'oː', u: 'uː', y: 'yː', 'ø': 'øː', 'ɛ': 'ɛː', 'ɔ': 'ɔː' };
  const SHORT = {}; for (const k in LONG) SHORT[LONG[k]] = k;
  const FRONT = new Set(['i', 'e', 'ɛ', 'y', 'ø', 'iː', 'eː', 'ɛː', 'yː', 'øː']);
  const VOICE = { p: 'b', t: 'd', k: 'g', f: 'v', s: 'z', 'ʃ': 'ʒ', 'θ': 'ð', x: 'ɣ', ts: 'dz', 'tʃ': 'dʒ' };
  const DEVOICE = {}; for (const k in VOICE) DEVOICE[VOICE[k]] = k;

  /* ---------- spelling: only letters the bundled IM Fell faces can draw ---------- */
  const ORTH_STYLES = {
    plain: { 'ŋ': 'ng', 'ɲ': 'ny', 'θ': 'th', 'ð': 'dh', 'ʃ': 'sh', 'ʒ': 'zh', x: 'kh', 'ɣ': 'gh', ts: 'ts', dz: 'dz', 'tʃ': 'ch', 'dʒ': 'j', j: 'y', w: 'w', 'ʔ': "'", q: 'q', 'ə': 'e', 'ɛ': 'e', 'ɔ': 'o', y: 'ü', 'ø': 'ö', 'ɨ': 'y', 'ɑ': 'a', long: 'double' },
    northern: { 'ŋ': 'ng', 'ɲ': 'nj', 'θ': 'þ', 'ð': 'ð', 'ʃ': 'sj', 'ʒ': 'zj', x: 'ch', 'ɣ': 'gh', ts: 'ts', dz: 'dz', 'tʃ': 'tj', 'dʒ': 'dj', j: 'j', w: 'v', 'ʔ': "'", q: 'q', 'ə': 'e', 'ɛ': 'æ', 'ɔ': 'å', y: 'y', 'ø': 'ø', 'ɨ': 'î', 'ɑ': 'a', long: 'acute' },
    central: { 'ŋ': 'ng', 'ɲ': 'gn', 'θ': 'th', 'ð': 'dh', 'ʃ': 'sch', 'ʒ': 'sj', x: 'ch', 'ɣ': 'gh', ts: 'z', dz: 'ds', 'tʃ': 'tch', 'dʒ': 'dj', j: 'j', w: 'w', 'ʔ': "'", q: 'qu', 'ə': 'ë', 'ɛ': 'ä', 'ɔ': 'o', y: 'ü', 'ø': 'ö', 'ɨ': 'ui', 'ɑ': 'a', long: 'h' },
    southern: { 'ŋ': 'n', 'ɲ': 'ñ', 'θ': 'z', 'ð': 'd', 'ʃ': 'x', 'ʒ': 'j', x: 'kh', 'ɣ': 'g', ts: 'tz', dz: 'dz', 'tʃ': 'ch', 'dʒ': 'g', j: 'y', w: 'u', 'ʔ': "'", q: 'q', 'ə': 'e', 'ɛ': 'è', 'ɔ': 'ò', y: 'u', 'ø': 'eu', 'ɨ': 'i', 'ɑ': 'á', long: 'circ' },
    eastern: { 'ŋ': 'ng', 'ɲ': 'ny', 'θ': 'th', 'ð': 'dh', 'ʃ': 'sh', 'ʒ': 'zh', x: 'kh', 'ɣ': 'ğ', ts: 'ts', dz: 'dz', 'tʃ': 'ç', 'dʒ': 'c', j: 'y', w: 'w', 'ʔ': "'", q: 'q', 'ə': 'ë', 'ɛ': 'e', 'ɔ': 'o', y: 'ü', 'ø': 'ö', 'ɨ': 'ı', 'ɑ': 'a', long: 'double' },
  };
  // ğ is outside Latin-1; eastern falls back to gh
  ORTH_STYLES.eastern['ɣ'] = 'gh';
  const LONG_MARK = {
    double: (v) => v + v,
    acute: (v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', 'ø': 'ǿ' }[v] || v + v),
    circ: (v) => ({ a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' }[v] || v + v),
    h: (v) => v + 'h',
  };
  const SAFE = /^[a-zA-Z'À-ÿıœ’]*$/;

  /* ---------- the lexicon every language is given roots for ---------- */
  const CONCEPTS = {
    place: ['town', 'fort', 'hall', 'market', 'farm', 'gate', 'tower', 'temple', 'house', 'well'],
    terrain: ['ford', 'bridge', 'port', 'bay', 'shore', 'cape', 'hill', 'mount', 'vale', 'field', 'wood', 'marsh', 'spring', 'rock', 'river', 'lake', 'sea', 'isle', 'land', 'realm', 'waste', 'pass'],
    adj: ['white', 'black', 'red', 'green', 'grey', 'gold', 'silver', 'high', 'low', 'old', 'new', 'great', 'little', 'holy', 'cold', 'warm', 'far', 'deep', 'bright', 'still', 'long', 'broad', 'fair', 'dark', 'first', 'last', 'hidden', 'broken'],
    nature: ['oak', 'ash', 'birch', 'pine', 'willow', 'reed', 'salt', 'iron', 'stone', 'sand', 'snow', 'sun', 'moon', 'star', 'wind', 'fire', 'water', 'rain', 'mist', 'wolf', 'bear', 'horse', 'crow', 'swan', 'eagle', 'bee', 'fish', 'boar', 'deer', 'serpent', 'hawk', 'elk', 'barley', 'apple', 'rose', 'thorn', 'honey', 'amber', 'cloud', 'ice'],
    dir: ['north', 'south', 'east', 'west'],
    people: ['king', 'queen', 'lord', 'god', 'people', 'kin', 'child', 'mother', 'father', 'smith', 'shepherd', 'priest', 'singer', 'stranger', 'son', 'daughter', 'friend', 'enemy', 'guest'],
    abstract: ['war', 'peace', 'death', 'plague', 'flood', 'famine', 'birth', 'crown', 'fall', 'year', 'ship', 'battle', 'siege', 'book', 'end', 'begin', 'night', 'day', 'song', 'blood', 'grain', 'gift', 'oath', 'sword', 'shield', 'hope', 'grief', 'luck', 'word', 'speech', 'law', 'faith', 'fear', 'walk', 'burn', 'come', 'go', 'die', 'build', 'take', 'flee', 'sail', 'rise', 'many', 'all', 'none', 'is', 'and', 'not', 'remember', 'forget', 'sky', 'dust', 'bone', 'heart', 'eye', 'hand', 'road'],
  };
  const ALL_CONCEPTS = [].concat(...Object.values(CONCEPTS));
  const SHORT_CONCEPTS = new Set(['town', 'fort', 'hall', 'gate', 'ford', 'port', 'bay', 'hill', 'mount', 'vale', 'wood', 'rock', 'river', 'lake', 'sea', 'isle', 'land', 'kin', 'white', 'black', 'red', 'old', 'new', 'high', 'low', 'is', 'and', 'not', 'all', 'sun', 'oak', 'ash', 'salt', 'stone', 'wolf', 'well', 'field', 'pass', 'god', 'king', 'day', 'year', 'go', 'die']);

  /* ---------- sound changes ---------- */
  function ctxPrev(ph, i) { for (let j = i - 1; j >= 0; j--) { if (ph[j] === '-') continue; if (ph[j] === ' ') return '#'; return ph[j]; } return '#'; }
  function ctxNext(ph, i) { for (let j = i + 1; j < ph.length; j++) { if (ph[j] === '-') continue; if (ph[j] === ' ') return '#'; return ph[j]; } return '#'; }
  function prevIdx(ph, i) { for (let j = i - 1; j >= 0; j--) { if (ph[j] === '-') continue; if (ph[j] === ' ') return -1; return j; } return -1; }
  function nextIdx(ph, i) { for (let j = i + 1; j < ph.length; j++) { if (ph[j] === '-') continue; if (ph[j] === ' ') return -1; return j; } return -1; }
  function tidy(out) {
    const r = [];
    for (let i = 0; i < out.length; i++) {
      const p = out[i];
      if (p === '-' || p === ' ') {
        if (!r.length || r[r.length - 1] === '-' || r[r.length - 1] === ' ') continue;
        r.push(p);
        continue;
      }
      // geminates collapse: two of the same consonant, even across a hyphen
      let k = r.length - 1;
      if (k >= 0 && r[k] === '-') k--;
      if (k >= 0 && isC(p) && r[k] === p) continue;
      if (isV(p) && r.length && isV(r[r.length - 1])) {
        const a = SHORT[r[r.length - 1]] || r[r.length - 1], b = SHORT[p] || p;
        if (a === b) { r[r.length - 1] = LONG[a] || r[r.length - 1]; continue; } // a + a fuse into a long vowel
        if (r.length > 1 && isV(r[r.length - 2])) continue; // never three vowels running
      }
      r.push(p);
    }
    while (r.length && (r[r.length - 1] === '-' || r[r.length - 1] === ' ')) r.pop();
    return r;
  }
  function mapPh(ph, fn) {
    const out = [];
    for (let i = 0; i < ph.length; i++) {
      const p = ph[i];
      if (p === '-' || p === ' ') { out.push(p); continue; }
      const r = fn(p, i);
      if (r === null || r === undefined) continue;
      if (Array.isArray(r)) for (const x of r) out.push(x); else out.push(r);
    }
    return tidy(out);
  }
  /* split into words, and inside each word list vowel positions */
  function words(ph) {
    const ws = [];
    let cur = [];
    for (let i = 0; i <= ph.length; i++) {
      if (i === ph.length || ph[i] === ' ') { if (cur.length) ws.push(cur); cur = []; continue; }
      cur.push(i);
    }
    return ws.map((idx) => ({ idx, vowels: idx.filter((i) => isV(ph[i])) }));
  }

  const RULES = {
    lenition: {
      note: 'p t k > b d g between vowels', desc: 'voiceless stops softened to voiced between vowels', w: 3,
      needs: ['p', 't', 'k'], adds: ['b', 'd', 'g'],
      apply: (ph) => mapPh(ph, (p, i) => (p === 'p' || p === 't' || p === 'k') && isV(ctxPrev(ph, i)) && isV(ctxNext(ph, i)) ? VOICE[p] : p),
    },
    spirant: {
      note: 'b d g > v ð ɣ between vowels', desc: 'voiced stops became fricatives between vowels', w: 2,
      needs: ['b', 'd', 'g'], adds: ['v', 'ð', 'ɣ'],
      apply: (ph) => mapPh(ph, (p, i) => {
        const m = { b: 'v', d: 'ð', g: 'ɣ' }[p];
        return m && isV(ctxPrev(ph, i)) && isV(ctxNext(ph, i)) ? m : p;
      }),
    },
    apocope: {
      note: 'final vowels lost', desc: 'final vowels fell silent in words of more than one syllable', w: 3,
      apply: (ph) => {
        const del = new Set();
        for (const w of words(ph)) {
          if (w.vowels.length < 2) continue;
          const last = w.idx[w.idx.length - 1];
          if (!isV(ph[last]) || SHORT[ph[last]] !== undefined) continue; // long vowels survive
          const c = prevIdx(ph, last);
          if (c < 0 || !isC(ph[c])) continue;
          const v = prevIdx(ph, c);
          if (v >= 0 && isV(ph[v])) del.add(last);
        }
        return mapPh(ph, (p, i) => (del.has(i) ? null : p));
      },
    },
    palatal: {
      note: 'k g > ch j before front vowels', desc: 'k and g turned to ch and j before front vowels', w: 3,
      needs: ['k'], adds: ['tʃ', 'dʒ'],
      apply: (ph) => mapPh(ph, (p, i) => (p === 'k' || p === 'g') && FRONT.has(ctxNext(ph, i)) ? (p === 'k' ? 'tʃ' : 'dʒ') : p),
    },
    hloss: {
      note: 'h lost', desc: 'h ceased to be spoken anywhere', w: 2,
      needs: ['h'], removes: ['h'],
      apply: (ph) => mapPh(ph, (p) => (p === 'h' ? null : p)),
    },
    devoice: {
      note: 'final b d g z v > p t k s f', desc: 'voiced consonants hardened at the ends of words', w: 2,
      needs: ['b', 'd', 'g', 'z', 'v'],
      apply: (ph) => mapPh(ph, (p, i) => DEVOICE[p] && ctxNext(ph, i) === '#' ? DEVOICE[p] : p),
    },
    debucc: {
      note: 's > h at the start of words', desc: 'an initial s weakened into a breath, h', w: 1.5,
      needs: ['s'], adds: ['h'],
      apply: (ph) => mapPh(ph, (p, i) => p === 's' && ctxPrev(ph, i) === '#' && isV(ctxNext(ph, i)) ? 'h' : p),
    },
    umlaut: {
      note: 'a o u > e ö ü before i', desc: 'back vowels were pulled forward by an i in the next syllable', w: 2,
      adds: ['e', 'ø', 'y'],
      apply: (ph) => {
        const rep = new Map();
        for (const w of words(ph)) {
          for (let k = 0; k < w.vowels.length - 1; k++) {
            const nv = ph[w.vowels[k + 1]];
            if (nv === 'i' || nv === 'iː') {
              const m = { a: 'e', o: 'ø', u: 'y', 'aː': 'eː', 'oː': 'øː', 'uː': 'yː' }[ph[w.vowels[k]]];
              if (m) rep.set(w.vowels[k], m);
            }
          }
        }
        return mapPh(ph, (p, i) => (rep.has(i) ? rep.get(i) : p));
      },
    },
    raising: {
      note: 'e o > i u in the last syllable', desc: 'e and o rose to i and u in final syllables', w: 1.5,
      apply: (ph) => {
        const rep = new Map();
        for (const w of words(ph)) {
          if (w.vowels.length < 2) continue;
          const v = w.vowels[w.vowels.length - 1];
          const m = { e: 'i', o: 'u', 'ɛ': 'e', 'ɔ': 'o' }[ph[v]];
          if (m) rep.set(v, m);
        }
        return mapPh(ph, (p, i) => (rep.has(i) ? rep.get(i) : p));
      },
    },
    reduction: {
      note: 'unstressed vowels > ə', desc: 'vowels after the stressed first syllable dulled to a murmur', w: 2,
      adds: ['ə'], stress: 'initial',
      apply: (ph) => {
        const rep = new Set();
        for (const w of words(ph)) for (let k = 1; k < w.vowels.length; k++) {
          const v = ph[w.vowels[k]];
          if (SHORT[v] === undefined && v !== 'ə') rep.add(w.vowels[k]);
        }
        return mapPh(ph, (p, i) => (rep.has(i) ? 'ə' : p));
      },
    },
    syncope: {
      note: 'middle vowels lost', desc: 'the middle vowel of long words dropped out', w: 2,
      apply: (ph) => {
        const del = new Set();
        for (const w of words(ph)) {
          if (w.vowels.length < 3) continue;
          const v = w.vowels[1];
          if (SHORT[ph[v]] !== undefined) continue;
          const a = prevIdx(ph, v), b = nextIdx(ph, v);
          if (a < 0 || b < 0 || !isC(ph[a]) || !isC(ph[b])) continue;
          const a2 = prevIdx(ph, a), b2 = nextIdx(ph, b);
          if (a2 >= 0 && b2 >= 0 && isV(ph[a2]) && isV(ph[b2])) del.add(v);
        }
        return mapPh(ph, (p, i) => (del.has(i) ? null : p));
      },
    },
    nasal: {
      note: 'n > m before p b f v', desc: 'n became m before lip sounds', w: 1,
      needs: ['n'],
      apply: (ph) => mapPh(ph, (p, i) => p === 'n' && ['p', 'b', 'f', 'v'].includes(ctxNext(ph, i)) ? 'm' : p),
    },
    clusters: {
      note: 'stop + stop > stop', desc: 'clusters of two stops were simplified, the first giving way', w: 1.5,
      apply: (ph) => mapPh(ph, (p, i) => PH[p] && PH[p].m === 'stop' && PH[ctxNext(ph, i)] && PH[ctxNext(ph, i)].m === 'stop' ? null : p),
    },
    wfort: {
      note: 'w > v', desc: 'w hardened into v', w: 1.5,
      needs: ['w'], adds: ['v'], removes: ['w'],
      apply: (ph) => mapPh(ph, (p) => (p === 'w' ? 'v' : p)),
    },
    thstop: {
      note: 'th dh > t d', desc: 'the soft th sounds became plain t and d', w: 1.5,
      needs: ['θ', 'ð'], adds: ['t', 'd'], removes: ['θ', 'ð'],
      apply: (ph) => mapPh(ph, (p) => (p === 'θ' ? 't' : p === 'ð' ? 'd' : p)),
    },
    lvoc: {
      note: 'l > w before consonants', desc: 'l melted into w before consonants and at the ends of words', w: 1,
      needs: ['l'], adds: ['w'],
      apply: (ph) => mapPh(ph, (p, i) => p === 'l' && isV(ctxPrev(ph, i)) && !isV(ctxNext(ph, i)) ? 'w' : p),
    },
    rhotacism: {
      note: 's z > r between vowels', desc: 's buzzed into r between vowels', w: 1.5,
      needs: ['s'], adds: ['r'],
      apply: (ph) => mapPh(ph, (p, i) => (p === 's' || p === 'z') && isV(ctxPrev(ph, i)) && isV(ctxNext(ph, i)) ? 'r' : p),
    },
    prothesis: {
      note: 'e- before initial s + consonant', desc: 'words beginning with s and a consonant grew a vowel in front', w: 1,
      apply: (ph, L) => mapPh(ph, (p, i) => p === 's' && ctxPrev(ph, i) === '#' && isC(ctxNext(ph, i)) ? [L.linker, 's'] : p),
    },
    rounding: {
      note: 'a > o before n m', desc: 'a darkened to o before nasals', w: 1.5,
      adds: ['o'],
      apply: (ph) => mapPh(ph, (p, i) => (p === 'a' && PH[ctxNext(ph, i)] && PH[ctxNext(ph, i)].m === 'nasal' ? 'o' : p)),
    },
    grimm: {
      note: 'p t k > f th kh', desc: 'the hard stops loosened into breathy fricatives', w: 0.8,
      needs: ['p', 't', 'k'], adds: ['f', 'θ', 'x'],
      apply: (ph) => mapPh(ph, (p, i) => {
        const m = { p: 'f', t: 'θ', k: 'x' }[p];
        return m && ctxPrev(ph, i) !== 's' ? m : p;
      }),
    },
    lengthen: {
      note: 'vowels lengthened before r', desc: 'vowels stretched long before r, and the r was swallowed at word end', w: 1,
      needs: ['r'],
      apply: (ph) => mapPh(ph, (p, i) => {
        if (p === 'r' && isV(ctxPrev(ph, i)) && ctxNext(ph, i) === '#') return null;
        if (LONG[p] && ctxNext(ph, i) === 'r' && ctxNext(ph, i + 1) === '#') return LONG[p];
        return p;
      }),
    },
  };
  /* ---------- languages ---------- */
  const CFREQ = { p: 0.85, t: 0.95, k: 0.95, b: 0.6, d: 0.62, g: 0.55, q: 0.06, 'ʔ': 0.1, m: 0.95, n: 0.97, 'ɲ': 0.15, 'ŋ': 0.32, f: 0.45, v: 0.35, 'θ': 0.08, 'ð': 0.07, s: 0.9, z: 0.3, 'ʃ': 0.4, 'ʒ': 0.12, x: 0.25, 'ɣ': 0.06, h: 0.55, ts: 0.16, dz: 0.03, 'tʃ': 0.33, 'dʒ': 0.2, r: 0.75, l: 0.82, j: 0.75, w: 0.62 };
  const VSYS = [
    [['a', 'i', 'u'], 1], [['a', 'e', 'i', 'o', 'u'], 6], [['a', 'ɛ', 'i', 'ɔ', 'u'], 1], [['a', 'e', 'i', 'o', 'u', 'ə'], 2],
    [['a', 'e', 'ɛ', 'i', 'o', 'ɔ', 'u'], 1], [['a', 'e', 'i', 'o', 'u', 'y'], 1.5], [['a', 'e', 'i', 'o', 'u', 'y', 'ø'], 1], [['a', 'e', 'i', 'o', 'u', 'ɨ'], 1], [['a', 'e', 'i', 'o'], 0.5],
  ];

  class Language {
    constructor(rng, id) {
      this.id = id;
      this.rng = rng;
      const r = rng.fork('phonology');
      /* consonants */
      const bias = r.range(0.75, 1.15);
      let cons = Object.keys(CFREQ).filter((c) => r.next() < CFREQ[c] * bias);
      const must = [['m', 'n'], ['t', 'k'], ['s', 'h'], ['r', 'l']];
      for (const grp of must) if (!grp.some((c) => cons.includes(c))) cons.push(r.pick(grp));
      for (const c of ['n', 't', 'k', 'm', 's', 'l', 'r', 'p', 'j', 'd']) if (cons.length < 11 && !cons.includes(c)) cons.push(c);
      this.cons = cons;
      /* vowels */
      this.vows = r.weighted(VSYS).slice();
      if (r.chance(0.28)) {
        const n = r.int(1, 3);
        for (const v of r.shuffle(this.vows.filter((v) => LONG[v])).slice(0, n)) this.vows.push(LONG[v]);
      }
      /* frequencies */
      const sc = r.shuffle(this.cons.slice());
      this.cw = sc.map((c, k) => [c, (CFREQ[c] + 0.25) / Math.pow(k + 1, 0.65)]);
      const sv = r.shuffle(this.vows.slice());
      this.vw = sv.map((v, k) => [v, (v === 'a' ? 2 : 1) * (SHORT[v] !== undefined ? 0.35 : 1) / Math.pow(k + 1, 0.5)]);
      /* syllable shape */
      this.onsetP = r.range(0.72, 0.97);
      this.codaP = r.weighted([[0, 2], [r.range(0.08, 0.25), 3], [r.range(0.25, 0.5), 3]]);
      const sonor = this.cons.filter((c) => ['nasal', 'liquid', 'lateral'].includes(PH[c].m));
      const codaPool = sonor.concat(this.cons.filter((c) => c === 's' || (PH[c].m === 'stop' && c !== 'ʔ' && r.chance(0.35)) || (PH[c].m === 'fric' && r.chance(0.25))));
      this.codas = [...new Set(codaPool)];
      if (!this.codas.length) this.codas = ['n'];
      const clCand = [];
      const liq = this.cons.filter((c) => c === 'r' || c === 'l');
      for (const s of this.cons.filter((c) => PH[c].m === 'stop' && c !== 'ʔ' && c !== 'q')) for (const l of liq) clCand.push([s, l]);
      if (this.cons.includes('s')) for (const s of this.cons.filter((c) => ['p', 't', 'k'].includes(c))) clCand.push(['s', s]);
      for (const f of this.cons.filter((c) => ['f', 'ʃ', 'θ', 'v'].includes(c))) for (const l of liq) clCand.push([f, l]);
      for (const s of this.cons.filter((c) => ['k', 'g', 't', 'd'].includes(c))) for (const g of this.cons.filter((c) => c === 'w' || c === 'j')) clCand.push([s, g]);
      this.clusters = r.shuffle(clCand).slice(0, r.chance(0.3) ? 0 : r.int(1, Math.min(8, clCand.length)));
      this.clusterP = r.range(0.1, 0.32);
      this.sylW = r.pick([[1, 3, 2], [2, 4, 1], [1, 2, 2], [3, 3, 1], [1, 4, 3], [2, 3, 2]]);
      this.stress = r.weighted([['initial', 3], ['penult', 3], ['final', 1]]);
      this.order = r.chance(0.6) ? 'mod-head' : 'head-mod';
      this.join = r.weighted([['fuse', 7], ['hyphen', 1.2], ['space', 1.3]]);
      this.linker = r.pick(this.vows.filter((v) => SHORT[v] === undefined && v !== 'ɨ'));
      this.wordOrder = r.weighted([['SOV', 4], ['SVO', 3], ['VSO', 1]]);
      /* spelling */
      const style = r.weighted([['plain', 3], ['northern', 2], ['central', 2], ['southern', 2], ['eastern', 2]]);
      this.orthStyle = style;
      const base = Object.assign({}, ORTH_STYLES[style]);
      for (const k of Object.keys(base)) if (k !== 'long' && r.chance(0.12)) base[k] = ORTH_STYLES[r.pick(Object.keys(ORTH_STYLES))][k];
      this.orth = {};
      for (const p of Object.keys(PH)) {
        if (SHORT[p] !== undefined) continue;
        this.orth[p] = base[p] !== undefined ? base[p] : p;
        if (!SAFE.test(this.orth[p])) this.orth[p] = ORTH_STYLES.plain[p] || p;
      }
      const lm = LONG_MARK[base.long] || LONG_MARK.double;
      for (const L of Object.keys(SHORT)) {
        const sv = this.orth[SHORT[L]];
        const m = sv.length === 1 ? lm(sv) : sv + sv.slice(-1);
        this.orth[L] = SAFE.test(m) ? m : sv + sv;
      }
      // two sounds must never share a spelling within one tongue
      const seen = new Map();
      const order = this.cons.concat(this.vows);
      for (const p of Object.keys(PH)) if (!order.includes(p)) order.push(p);
      for (const p of order) {
        const o = this.orth[p];
        if (isV(p)) continue; // vowels may share letters, as they do in most real spellings
        if (seen.has(o) && seen.get(o) !== p) {
          const alt = SHORT[p] !== undefined ? this.orth[SHORT[p]] + this.orth[SHORT[p]] : (ORTH_STYLES.plain[p] || p);
          this.orth[p] = seen.has(alt) ? alt + (SHORT[p] !== undefined ? '' : 'h') : alt;
        }
        seen.set(this.orth[p], p);
      }
      /* roots for every concept, made in a fixed order so the lexicon never depends on who asks first */
      this.roots = new Map();
      const used = new Set();
      for (const c of ALL_CONCEPTS) {
        const rr = rng.fork('root:' + c);
        let ph, tries = 0;
        do {
          const heavy = this.codaP > 0.2 || this.clusters.length > 2;
          const ns = SHORT_CONCEPTS.has(c) ? rr.weighted(heavy ? [[1, 5], [2, 1]] : [[1, 1], [2, 3]]) : rr.weighted([[1, heavy ? 2 : 0.5], [2, 3], [3, 0.4]]);
          ph = this.word(rr, ns);
          tries++;
        } while ((used.has(ph.join('')) || ph.length < 3 - (SHORT_CONCEPTS.has(c) ? 1 : 0)) && tries < 30);
        used.add(ph.join(''));
        this.roots.set(c, ph);
      }
      this.changes = [];
      this._inv = new Map();
    }

    pickC(r) { return r.weighted(this.cw); }
    pickV(r) { return r.weighted(this.vw); }
    pickCoda(r) { return r.pick(this.codas); }

    syllables(r) { return r.weighted([[1, this.sylW[0]], [2, this.sylW[1]], [3, this.sylW[2]]]); }

    word(r, nSyl) {
      const ph = [];
      for (let k = 0; k < nSyl; k++) {
        const prevV = ph.length > 0 && isV(ph[ph.length - 1]);
        let onset = [];
        const want = k === 0 ? r.chance(this.onsetP) : prevV || r.chance(0.8);
        if (want) {
          if (this.clusters.length && (k === 0 || prevV) && r.chance(this.clusterP)) onset = r.pick(this.clusters).slice();
          else onset = [this.pickC(r)];
          if (ph.length && ph[ph.length - 1] === onset[0]) onset = [this.pickC(r)];
        }
        let v = this.pickV(r);
        if (ph.length && isV(ph[ph.length - 1]) && !onset.length) onset = [this.pickC(r)];
        for (const o of onset) ph.push(o);
        ph.push(v);
        if (this.codaP && r.chance(this.codaP * (k === nSyl - 1 ? 1.15 : 0.75))) {
          const c = this.pickCoda(r);
          if (c !== ph[ph.length - 2]) ph.push(c);
        }
      }
      return ph;
    }

    /* the phonemes in use at a given year: base inventory reshaped by every change before it */
    inventory(year) {
      let k = 0;
      while (k < this.changes.length && this.changes[k].year <= year) k++;
      if (this._inv.has(k)) return this._inv.get(k);
      const set = new Set(this.cons.concat(this.vows));
      for (let i = 0; i < k; i++) {
        const R = RULES[this.changes[i].rule];
        for (const a of R.adds || []) set.add(a);
        for (const a of R.removes || []) set.delete(a);
      }
      this._inv.set(k, set);
      return set;
    }

    /* run a form through every sound change in (from, to] */
    evolve(ph, from, to) {
      let out = ph;
      for (const ch of this.changes) {
        if (ch.year <= from) continue;
        if (ch.year > to) break;
        out = RULES[ch.rule].apply(out, this);
      }
      return out;
    }

    root(concept, year) {
      if (!this.roots.has(concept)) {
        const rr = this.rng.fork('root:' + concept);
        this.roots.set(concept, this.word(rr, rr.weighted([[1, 2], [2, 3]])));
      }
      return this.evolve(this.roots.get(concept), 0, year || 0);
    }

    /* a fresh word, born as if it had always been in the language */
    coin(r, year, nSyl) { return this.evolve(this.word(r, nSyl || this.syllables(r)), 0, year); }

    /* join two forms according to the habits of the tongue */
    joinForms(a, b, style) {
      style = style || this.join;
      const solid = (f) => f.filter((p) => p !== '-' && p !== ' ').length;
      if (style !== 'fuse' && (solid(a) < 3 || solid(b) < 3)) style = 'fuse';
      if (style === 'space') return a.concat([' '], b);
      if (style === 'hyphen') return a.concat(['-'], b);
      const la = a[a.length - 1], fb = b[0];
      if (isV(la) && isV(fb)) return a.slice(0, -1).concat(b);
      if (isC(la) && isC(fb)) {
        const la2 = a[a.length - 2], fb2 = b[1];
        if (isC(la2) || isC(fb2) || (this.codaP < 0.15)) return a.concat([this.linker], b);
      }
      return a.concat(b);
    }

    romanize(ph) {
      let s = '';
      for (const p of ph) s += p === '-' || p === ' ' ? p : (this.orth[p] !== undefined ? this.orth[p] : p);
      return s;
    }

    display(ph) { return capitalize(this.romanize(ph)); }

    /* schedule the changes this tongue will undergo between two years */
    scheduleChanges(r, from, to) {
      const n = r.int(3, 5);
      const pool = Object.keys(RULES).filter((k) => {
        const R = RULES[k];
        if (R.stress && R.stress !== this.stress) return false;
        if (R.needs && !R.needs.some((x) => this.cons.includes(x))) return false;
        return true;
      });
      const chosen = [];
      for (let t = 0; t < 40 && chosen.length < n; t++) {
        const cand = pool.filter((x) => !chosen.includes(x));
        if (!cand.length) break;
        const k = r.weighted(cand.map((x) => [x, RULES[x].w]));
        // a change must touch at least a few roots or nobody would notice it
        const sample = ALL_CONCEPTS.slice(0, 80);
        let hits = 0;
        for (const c of sample) {
          const a = this.roots.get(c), b = RULES[k].apply(a, this);
          if (a.join('') !== b.join('')) hits++;
        }
        if (hits >= 4) chosen.push(k);
      }
      const span = to - from;
      const years = [];
      for (let i = 0; i < chosen.length; i++) years.push(Math.round(from + span * (i + 0.5 + r.range(-0.3, 0.3)) / chosen.length));
      years.sort((a, b) => a - b);
      for (let i = 0; i < chosen.length; i++) this.changes.push({ year: years[i], rule: chosen[i], note: RULES[chosen[i]].note, desc: RULES[chosen[i]].desc });
      this.changes.sort((a, b) => a.year - b.year);
      this._inv.clear();
    }
  }

  function capitalize(s) {
    return s.split(' ').map((w) => {
      for (let i = 0; i < w.length; i++) {
        const ch = w[i];
        if (ch === "'" || ch === '’' || ch === '-') continue;
        return w.slice(0, i) + ch.toUpperCase() + w.slice(i + 1);
      }
      return w;
    }).join(' ');
  }

  /* ---------- names ---------- */
  let NAME_ID = 0;
  class Name {
    /* parts: [{concept, ph}] or [{name: Name}] for etymology; gloss: english sense */
    constructor(lang, ph, born, opts) {
      opts = opts || {};
      this.id = NAME_ID++;
      this.lang = lang;
      this.ph = ph;
      this.born = born;
      this.gloss = opts.gloss || null;
      this.parts = opts.parts || null;
      this.kind = opts.kind || 'name';
      this.loan = opts.loan || null; // {from: Name, year}
      this._cache = new Map();
    }
    stage(year) {
      const ch = this.lang.changes;
      let k = 0;
      while (k < ch.length && ch[k].year <= year) k++;
      return k;
    }
    form(year) {
      if (year === undefined) year = 1e9;
      if (year < this.born) year = this.born;
      const k = this.stage(year);
      if (this._cache.has(k)) return this._cache.get(k);
      const f = this.lang.evolve(this.ph, this.born, year);
      this._cache.set(k, f);
      return f;
    }
    text(year) { return capitalize(this.lang.romanize(this.form(year))); }
    /* every distinct spelling this name has had up to a year */
    history(upTo) {
      const out = [];
      let last = null;
      const ys = [this.born].concat(this.lang.changes.filter((c) => c.year > this.born && c.year <= upTo).map((c) => c.year));
      for (const y of ys) {
        const t = this.text(y);
        if (t !== last) { out.push({ year: y, text: t }); last = t; }
      }
      return out;
    }
  }

  /* compose roots (or whole names) into a new name, in the order and fashion of the tongue */
  function compose(lang, items, year, opts) {
    opts = opts || {};
    const forms = items.map((it) => (typeof it === 'string' ? lang.root(it, year) : it.form(year)));
    const parts = items.map((it, k) => (typeof it === 'string' ? { concept: it, ph: forms[k] } : { name: it, ph: forms[k] }));
    let order = forms.map((f, k) => k);
    if (items.length === 2 && lang.order === 'head-mod' && !opts.fixedOrder) order = [1, 0];
    let ph = forms[order[0]];
    for (let k = 1; k < order.length; k++) ph = lang.joinForms(ph, forms[order[k]], opts.join);
    return new Name(lang, ph, year, { gloss: opts.gloss || null, parts: order.map((k) => parts[k]), kind: opts.kind });
  }

  /* borrow a name into another tongue: nearest sounds, then repairs to fit its habits */
  function nearest(p, inv) {
    if (inv.has(p)) return p;
    const a = PH[p];
    if (!a) return p;
    let best = null, bd = 1e9;
    for (const q of inv) {
      const b = PH[q];
      if (!b || b.t !== a.t) continue;
      let d;
      if (a.t === 'C') {
        d = Math.abs(PLACES.indexOf(a.p) - PLACES.indexOf(b.p)) * 0.6 + Math.abs(MANNER_GROUP[a.m] - MANNER_GROUP[b.m]) * 1.1 + (a.v !== b.v ? 0.5 : 0);
      } else {
        d = Math.abs(a.h - b.h) + Math.abs(a.b - b.b) * 0.8 + (a.r !== b.r ? 0.6 : 0) + (a.L !== b.L ? 0.3 : 0);
      }
      if (d < bd) { bd = d; best = q; }
    }
    return best || p;
  }

  function adapt(name, target, year) {
    const src = name.form(year).filter((p) => p !== '-');
    const inv = target.inventory(year);
    let ph = src.map((p) => (p === ' ' ? ' ' : nearest(p, inv)));
    // repairs
    const out = [];
    const clusterOK = (a, b) => target.clusters.some((c) => c[0] === a && c[1] === b);
    for (let i = 0; i < ph.length; i++) {
      const p = ph[i];
      if (p === ' ') { out.push(p); continue; }
      out.push(p);
      const nx = ph[i + 1];
      if (isC(p) && (nx === undefined || nx === ' ')) {
        if (!target.codaP || !target.codas.includes(p)) out.push(target.linker);
      } else if (isC(p) && isC(nx)) {
        const prev = out.length > 1 ? out[out.length - 2] : '#';
        const startOfWord = prev === '#' || prev === ' ';
        if (startOfWord ? !clusterOK(p, nx) : !(target.codaP && target.codas.includes(p)) && !clusterOK(p, nx)) out.push(target.linker);
      } else if (isV(p) && isV(nx) && target.onsetP > 0.88) {
        const glide = inv.has('j') ? 'j' : inv.has('w') ? 'w' : inv.has('h') ? 'h' : null;
        if (glide) out.push(glide);
      }
    }
    const n = new Name(target, tidy(out), year, { gloss: name.gloss, parts: name.parts, kind: name.kind, loan: { from: name, year } });
    return n;
  }

  /* a person's name: half the time two meaningful roots, half the time an old opaque word */
  const NAME_STOCK_A = ['wolf', 'bear', 'eagle', 'hawk', 'iron', 'stone', 'gold', 'bright', 'high', 'fair', 'sun', 'moon', 'star', 'oak', 'ash', 'fire', 'wind', 'swan', 'elk', 'rose', 'amber', 'silver', 'raven'];
  const NAME_STOCK_B = ['friend', 'king', 'shield', 'sword', 'song', 'gift', 'oath', 'heart', 'hand', 'child', 'guest', 'peace', 'hope', 'luck', 'law', 'faith', 'word'];
  function personName(lang, r, year) {
    if (r.chance(0.5)) {
      const a = r.pick(NAME_STOCK_A), b = r.pick(NAME_STOCK_B);
      const n = compose(lang, [a, b], year, { join: 'fuse', fixedOrder: true, gloss: a + '-' + b, kind: 'person' });
      if (n.ph.length <= 9) return n;
    }
    const ph = lang.coin(r, year, r.weighted([[2, 4], [3, 1]]));
    return new Name(lang, ph, year, { kind: 'person' });
  }

  /* read an ordinary spelling (the seed word) as sounds, roughly as an English speaker would */
  function fromSpelling(str) {
    const s = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const out = [];
    const V = 'aeiou';
    for (let i = 0; i < s.length; i++) {
      const c = s[i], n = s[i + 1] || '', two = c + n;
      if (c === ' ' || c === '-') { if (out.length && out[out.length - 1] !== ' ') out.push(' '); continue; }
      if (two === 'sh') { out.push('ʃ'); i++; continue; }
      if (two === 'ch') { out.push('tʃ'); i++; continue; }
      if (two === 'th') { out.push('θ'); i++; continue; }
      if (two === 'ph') { out.push('f'); i++; continue; }
      if (two === 'kh') { out.push('x'); i++; continue; }
      if (two === 'zh') { out.push('ʒ'); i++; continue; }
      if (two === 'ck') { out.push('k'); i++; continue; }
      if (two === 'qu') { out.push('k', 'w'); i++; continue; }
      if (two === 'ng' && !V.includes(s[i + 2] || '')) { out.push('ŋ'); i++; continue; }
      if (two === 'ee' || two === 'ea') { out.push('iː'); i++; continue; }
      if (two === 'oo') { out.push('uː'); i++; continue; }
      if (two === 'aa') { out.push('aː'); i++; continue; }
      if (two === 'ou' || two === 'ow') { out.push('a', 'u'); i++; continue; }
      if (c === n && !V.includes(c)) continue;
      const m = { a: 'a', b: 'b', c: 'eiy'.includes(n) ? 's' : 'k', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'dʒ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', q: 'k', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', y: V.includes(n) ? 'j' : 'i', z: 'z' }[c];
      if (c === 'x') { out.push('k', 's'); continue; }
      if (m) out.push(m);
    }
    while (out.length && out[out.length - 1] === ' ') out.pop();
    return out.length ? out : ['a'];
  }

  P.Lang = { PH, RULES, CONCEPTS, ALL_CONCEPTS, Language, Name, compose, adapt, personName, capitalize, fromSpelling, isV, isC, LONG, SHORT };
})();

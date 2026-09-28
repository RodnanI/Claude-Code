/* Physical keyboard geometry (ANSI for English, ISO for German), key labels and finger zones.
   Positions are in key units: x from the left edge, y = row index (0 = number row). */

const ROWS = {
  ansi: [
    'Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace:2',
    'Tab:1.5 KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash:1.5',
    'CapsLock:1.75 KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote Enter:2.25',
    'ShiftLeft:2.25 KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight:2.75',
    'ControlLeft:1.25 MetaLeft:1.25 AltLeft:1.25 Space:6.25 AltRight:1.25 MetaRight:1.25 ContextMenu:1.25 ControlRight:1.25'
  ],
  iso: [
    'Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace:2',
    'Tab:1.5 KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Enter:1.5',
    'CapsLock:1.75 KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote Backslash Enter:1.25',
    'ShiftLeft:1.25 IntlBackslash KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight:2.75',
    'ControlLeft:1.25 MetaLeft:1.25 AltLeft:1.25 Space:6.25 AltRight:1.25 MetaRight:1.25 ContextMenu:1.25 ControlRight:1.25'
  ]
};

const LAYOUTS = {
  en: {
    geom: 'ansi',
    keys: {
      Backquote: '`~', Digit1: '1!', Digit2: '2@', Digit3: '3#', Digit4: '4$', Digit5: '5%', Digit6: '6^',
      Digit7: '7&', Digit8: '8*', Digit9: '9(', Digit0: '0)', Minus: '-_', Equal: '=+',
      KeyQ: 'qQ', KeyW: 'wW', KeyE: 'eE', KeyR: 'rR', KeyT: 'tT', KeyY: 'yY', KeyU: 'uU', KeyI: 'iI',
      KeyO: 'oO', KeyP: 'pP', BracketLeft: '[{', BracketRight: ']}', Backslash: '\\|',
      KeyA: 'aA', KeyS: 'sS', KeyD: 'dD', KeyF: 'fF', KeyG: 'gG', KeyH: 'hH', KeyJ: 'jJ', KeyK: 'kK',
      KeyL: 'lL', Semicolon: ';:', Quote: '\'"',
      KeyZ: 'zZ', KeyX: 'xX', KeyC: 'cC', KeyV: 'vV', KeyB: 'bB', KeyN: 'nN', KeyM: 'mM',
      Comma: ',<', Period: '.>', Slash: '/?'
    },
    altgr: {},
    dead: [],
    names: {
      Backspace: '⌫', Tab: '⇥', CapsLock: '⇪', Enter: '↵', ShiftLeft: '⇧', ShiftRight: '⇧',
      ControlLeft: 'ctrl', ControlRight: 'ctrl', AltLeft: 'alt', AltRight: 'alt'
    }
  },
  de: {
    geom: 'iso',
    keys: {
      Backquote: '^°', Digit1: '1!', Digit2: '2"', Digit3: '3§', Digit4: '4$', Digit5: '5%', Digit6: '6&',
      Digit7: '7/', Digit8: '8(', Digit9: '9)', Digit0: '0=', Minus: 'ß?', Equal: '´`',
      KeyQ: 'qQ', KeyW: 'wW', KeyE: 'eE', KeyR: 'rR', KeyT: 'tT', KeyY: 'zZ', KeyU: 'uU', KeyI: 'iI',
      KeyO: 'oO', KeyP: 'pP', BracketLeft: 'üÜ', BracketRight: '+*',
      KeyA: 'aA', KeyS: 'sS', KeyD: 'dD', KeyF: 'fF', KeyG: 'gG', KeyH: 'hH', KeyJ: 'jJ', KeyK: 'kK',
      KeyL: 'lL', Semicolon: 'öÖ', Quote: 'äÄ', Backslash: '#\'',
      IntlBackslash: '<>', KeyZ: 'yY', KeyX: 'xX', KeyC: 'cC', KeyV: 'vV', KeyB: 'bB', KeyN: 'nN', KeyM: 'mM',
      Comma: ',;', Period: '.:', Slash: '-_'
    },
    altgr: {
      KeyQ: '@', KeyE: '€', Digit2: '²', Digit3: '³', Digit7: '{', Digit8: '[', Digit9: ']', Digit0: '}',
      Minus: '\\', BracketRight: '~', IntlBackslash: '|', KeyM: 'µ'
    },
    dead: ['Backquote', 'Equal'],
    names: {
      Backspace: '⌫', Tab: '⇥', CapsLock: '⇪', Enter: '↵', ShiftLeft: '⇧', ShiftRight: '⇧',
      ControlLeft: 'Strg', ControlRight: 'Strg', AltLeft: 'Alt', AltRight: 'Alt Gr'
    }
  }
};

/* Finger ids: l/r = hand, p r m i t = pinky, ring, middle, index, thumb. */
const FINGERS = ['lp', 'lr', 'lm', 'li', 'lt', 'rt', 'ri', 'rm', 'rr', 'rp'];
const FINGER_KEYS = {
  lp: 'Backquote Digit1 Tab KeyQ CapsLock KeyA ShiftLeft IntlBackslash KeyZ ControlLeft MetaLeft',
  lr: 'Digit2 KeyW KeyS KeyX',
  lm: 'Digit3 KeyE KeyD KeyC',
  li: 'Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB',
  lt: 'AltLeft',
  rt: 'Space AltRight',
  ri: 'Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM',
  rm: 'Digit8 KeyI KeyK Comma',
  rr: 'Digit9 KeyO KeyL Period',
  rp: 'Digit0 Minus Equal Backspace KeyP BracketLeft BracketRight Backslash Semicolon Quote Enter Slash ShiftRight MetaRight ContextMenu ControlRight'
};
const FINGER_OF = {};
for (const f in FINGER_KEYS) for (const c of FINGER_KEYS[f].split(' ')) FINGER_OF[c] = f;
const HOME_KEY = { lp: 'KeyA', lr: 'KeyS', lm: 'KeyD', li: 'KeyF', lt: 'Space', rt: 'Space', ri: 'KeyJ', rm: 'KeyK', rr: 'KeyL', rp: 'Semicolon' };

function makeLayout(id) {
  const L = LAYOUTS[id];
  const rows = ROWS[L.geom].map(r => r.split(' ').map(s => {
    const [code, w] = s.split(':');
    return { code, w: +(w || 1) };
  }));
  const geo = [], center = {}, box = {};
  rows.forEach((row, y) => {
    let x = 0;
    for (const k of row) {
      geo.push({ ...k, x, y });
      if (!center[k.code]) { center[k.code] = [x + k.w / 2, y + 0.5]; box[k.code] = [x, y, k.w]; }
      x += k.w;
    }
  });

  const chars = {};
  for (const code in L.keys) {
    if (L.dead.includes(code)) continue;
    const [b, s] = [...L.keys[code]];
    if (!(b in chars)) chars[b] = { code, shift: false, altgr: false };
    if (s && !(s in chars)) chars[s] = { code, shift: true, altgr: false };
  }
  for (const code in L.altgr) chars[L.altgr[code]] = { code, shift: false, altgr: true };
  chars[' '] = { code: 'Space', shift: false, altgr: false };

  const side = code => (FINGER_OF[code] || 'r')[0];

  return {
    id, ...L, rows, geo, center, box, chars,
    side,
    fingerOf(ch) {
      const m = chars[ch];
      if (!m) return null;
      return ch === ' ' ? 'thumbs' : FINGER_OF[m.code];
    },
    /* Keys that must be pressed for a character; the first entry is the main key. */
    strokes(ch) {
      const m = chars[ch];
      if (!m) return null;
      const out = [{ code: m.code, finger: ch === ' ' ? 'thumbs' : FINGER_OF[m.code] }];
      if (m.shift) {
        const left = side(m.code) === 'l';
        out.push({ code: left ? 'ShiftRight' : 'ShiftLeft', finger: left ? 'rp' : 'lp' });
      }
      if (m.altgr) out.push({ code: 'AltRight', finger: 'rt' });
      return out;
    },
    homeChar(f) { return L.keys[HOME_KEY[f]][0]; },
    label(code) { return L.keys[code] || ''; }
  };
}

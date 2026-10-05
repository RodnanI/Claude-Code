// SQUEAKBORNE :: input
// Keyboard only. Actions are rebindable; menus use a fixed, forgiving key set.

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'atk1', 'atk2', 'dodge', 'skill1', 'skill2', 'heal', 'interact', 'taunt', 'map', 'pause'];
const ACTION_NAMES = {
  left: 'Move left', right: 'Move right', up: 'Look up / Doors', down: 'Down / Drop',
  jump: 'Jump', atk1: 'Weapon 1', atk2: 'Weapon 2', dodge: 'Dodge roll', skill1: 'Skill 1', skill2: 'Skill 2',
  heal: 'Eat cheese (heal)', interact: 'Interact', taunt: 'Squeak (taunt)', map: 'Map', pause: 'Pause',
};
const PRESETS = {
  wasd: {
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
    jump: ['Space'], atk1: ['KeyJ'], atk2: ['KeyK'], dodge: ['KeyL', 'ShiftLeft'], skill1: ['KeyU'], skill2: ['KeyI'],
    heal: ['KeyQ'], interact: ['KeyE'], taunt: ['KeyT'], map: ['Tab', 'KeyM'], pause: ['Escape', 'KeyP'],
  },
  arrows: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    jump: ['KeyZ'], atk1: ['KeyX'], atk2: ['KeyC'], dodge: ['KeyV', 'ShiftLeft'], skill1: ['KeyA'], skill2: ['KeyS'],
    heal: ['KeyD'], interact: ['KeyF'], taunt: ['KeyQ'], map: ['Tab'], pause: ['Escape', 'KeyP'],
  },
};
const MENU_KEYS = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  ok: ['Enter', 'Space', 'KeyJ', 'KeyZ', 'KeyE'], back: ['Escape', 'Backspace', 'KeyK', 'KeyX'],
};
const KEY_LABELS = {
  Space: 'SPACE', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'SHIFT',
  ShiftRight: 'RSHIFT', ControlLeft: 'CTRL', ControlRight: 'RCTRL', AltLeft: 'ALT', AltRight: 'RALT', Escape: 'ESC',
  Enter: 'ENTER', Backspace: 'BKSP', Tab: 'TAB', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', CapsLock: 'CAPS',
};
function keyLabel(code) {
  if (!code) return '?';
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'N' + code.slice(6);
  return code.toUpperCase().slice(0, 6);
}

const Input = {
  held: new Set(),
  queue: [],
  binds: null,
  a: {},
  m: {},
  lastCode: null,
  anyPressed: false,
  typedQ: [], typed: [], typedBack: false, typedEnter: false, typedEsc: false,
  init() {
    this.setBinds(PRESETS.wasd);
    const block = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace']);
    window.addEventListener('keydown', (e) => {
      if (block.has(e.code) || (!e.ctrlKey && !e.metaKey && e.code !== 'F11' && e.code !== 'F12' && e.code !== 'F5')) e.preventDefault();
      AudioSys.unlock();
      if (!e.repeat) this.queue.push(e.code);
      if (e.key && e.key.length === 1) this.typedQ.push(e.key);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.held.delete(e.code); });
    window.addEventListener('blur', () => { this.held.clear(); if (Game.state === 'play') Game.pause(); });
  },
  setBinds(b) {
    this.binds = {};
    for (const k of ACTIONS) this.binds[k] = (b[k] || []).slice();
  },
  update() {
    const q = this.queue;
    this.lastCode = q.length ? q[q.length - 1] : null;
    this.anyPressed = q.length > 0;
    this.typed = this.typedQ.slice(); this.typedQ.length = 0;
    this.typedBack = q.includes('Backspace'); this.typedEnter = q.includes('Enter') || q.includes('NumpadEnter'); this.typedEsc = q.includes('Escape');
    const step = (st, codes) => {
      let p = false, d = false;
      for (const c of codes) { if (q.includes(c)) p = true; if (this.held.has(c)) d = true; }
      d = d || p;
      st.pressed = p;
      st.released = !d && st.down;
      st.down = d;
      st.t = d ? st.t + 1 : 0;
      st.buf = p ? 0 : st.buf + 1;
    };
    for (const k in this.binds) step(this.a[k] || (this.a[k] = { down: false, pressed: false, released: false, t: 0, buf: 999 }), this.binds[k]);
    for (const k in MENU_KEYS) {
      const st = this.m[k] || (this.m[k] = { down: false, pressed: false, released: false, t: 0, buf: 999 });
      step(st, MENU_KEYS[k]);
      st.rep = st.pressed || (st.t > 20 && st.t % 5 === 0);
    }
    q.length = 0;
  },
  p(a) { const s = this.a[a]; return !!(s && s.pressed); },
  d(a) { const s = this.a[a]; return !!(s && s.down); },
  r(a) { const s = this.a[a]; return !!(s && s.released); },
  buf(a, n) { const s = this.a[a]; return !!(s && s.buf <= n); },
  eat(a) { const s = this.a[a]; if (s) { s.buf = 999; s.pressed = false; } },
  mp(k) { const s = this.m[k]; return !!(s && s.rep); },
  mpress(k) { const s = this.m[k]; return !!(s && s.pressed); },
  label(a) { const b = this.binds[a]; return b && b.length ? keyLabel(b[0]) : '-'; },
  clearAll() { for (const k in this.a) { this.a[k].pressed = false; this.a[k].buf = 999; } for (const k in this.m) { this.m[k].pressed = false; this.m[k].rep = false; } },
};

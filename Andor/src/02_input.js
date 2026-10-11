// ANDOR :: input (keyboard, gamepad, pointer/touch with on-screen controls).

const BUTTONS = ['left', 'right', 'up', 'down', 'jump', 'whip', 'roll', 'pause', 'confirm', 'back'];
const KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump', 'confirm'], KeyZ: ['jump', 'confirm'], KeyK: ['jump'],
  KeyX: ['whip', 'back'], KeyJ: ['whip', 'confirm'],
  KeyC: ['roll'], KeyL: ['roll'], ShiftLeft: ['roll'], ShiftRight: ['roll'],
  Escape: ['pause', 'back'], KeyP: ['pause'], Backspace: ['back'],
  Enter: ['confirm'], NumpadEnter: ['confirm'],
};

const Input = {
  held: {}, // combined held state, refreshed each step
  p: {}, // pressed this step
  _pend: {},
  kb: {},
  pad: {},
  padPrev: {},
  touch: {},
  touchMode: false,
  usingPad: false,
  taps: [], // pointer taps in main-canvas coords not consumed by controls
  hover: null, // mouse position (main-canvas coords)
  pointers: new Map(),
  stick: null, // {id, ox, oy, x, y}
  controls: [], // on-screen buttons {id, x, y, r}
  anyKey: false,
  enabled: true,

  press(b) {
    this._pend[b] = true;
    this.anyKey = true;
  },
  step() {
    this.pollPad();
    for (const b of BUTTONS) this.held[b] = !!(this.kb[b] || this.pad[b] || this.touch[b]);
    for (const b of BUTTONS) if (this.pad[b] && !this.padPrev[b]) this._pend[b] = true;
    this.padPrev = Object.assign({}, this.pad);
    this.p = this._pend;
    this._pend = {};
  },
  // Consume a press from this step (menus use this so one press acts once).
  takePress(b) {
    if (this.p[b]) {
      this.p[b] = false;
      return true;
    }
    return false;
  },
  clear() {
    this._pend = {};
    this.p = {};
    this.taps.length = 0;
  },
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const g of pads) if (g && g.connected) { gp = g; break; }
    const P = {};
    if (gp) {
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      P.left = b(14) || ax < -0.4;
      P.right = b(15) || ax > 0.4;
      P.up = b(12) || ay < -0.5;
      P.down = b(13) || ay > 0.5;
      P.jump = b(0);
      P.whip = b(2) || b(3);
      P.roll = b(1) || b(5) || b(7) || b(4) || b(6);
      P.pause = b(9);
      P.confirm = b(0);
      P.back = b(1);
      let any = false;
      for (const k in P) if (P[k]) any = true;
      if (any && !this.usingPad) {
        this.usingPad = true;
        this.setTouchMode(false);
      }
    }
    this.pad = P;
  },
  setTouchMode(on) {
    if (this.touchMode === on) return;
    this.touchMode = on;
    if (document.body) document.body.classList.toggle('hide-cursor', on);
    Bus.emit('resize');
  },
};

window.addEventListener('keydown', (e) => {
  const m = KEYMAP[e.code];
  if (m) {
    e.preventDefault();
    if (!e.repeat) for (const b of m) Input.press(b);
    for (const b of m) Input.kb[b] = true;
  }
  if (!e.repeat) {
    Input.anyKey = true;
    Input.usingPad = false;
    Input.setTouchMode(false);
    Bus.emit('key', e.code);
  }
});
window.addEventListener('keyup', (e) => {
  const m = KEYMAP[e.code];
  if (m) for (const b of m) Input.kb[b] = false;
});
// Drop every held touch: the stick and buttons go neutral.
function _releaseAllTouch() {
  Input.touch = {};
  Input.pointers.clear();
  Input.stick = null;
}
window.addEventListener('blur', () => {
  Input.kb = {};
  _releaseAllTouch();
  Bus.emit('blur');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Input.kb = {};
    _releaseAllTouch();
  }
});

// ---------------------------------------------------------------------------
// On-screen controls. Layout lives in main-canvas pixels and is rebuilt on resize.
const TouchUI = {
  visible: false, // game decides when gameplay controls are shown
  layout() {
    const W = Screen.W, H = Screen.H;
    const c = [];
    if (Screen.portrait) {
      const top = Screen.vh, deckH = H - top;
      const cy = top + deckH * 0.5;
      const r = clamp(Math.round(W * 0.1), 15, 24);
      c.push({ id: 'jump', x: W - r * 1.6, y: cy + r * 0.7, r: r * 1.15 });
      c.push({ id: 'whip', x: W - r * 3.9, y: cy + r * 1.05, r: r });
      c.push({ id: 'roll', x: W - r * 2.5, y: cy - r * 1.35, r: r * 0.9 });
      this.stickHome = { x: r * 2.6, y: cy + r * 0.5 };
      this.stickZone = { x: 0, y: top, w: W * 0.5, h: deckH };
      this.stickR = Math.round(r * 1.25);
    } else {
      const r = clamp(Math.round(H * 0.085), 13, 20);
      c.push({ id: 'jump', x: W - r * 1.7, y: H - r * 1.7, r: r * 1.15 });
      c.push({ id: 'whip', x: W - r * 4.1, y: H - r * 1.25, r: r });
      c.push({ id: 'roll', x: W - r * 2.55, y: H - r * 4.0, r: r * 0.9 });
      this.stickHome = { x: r * 3, y: H - r * 2.6 };
      this.stickZone = { x: 0, y: H * 0.3, w: W * 0.42, h: H * 0.7 };
      this.stickR = Math.round(r * 1.2);
    }
    c.push({ id: 'pause', x: W - 11, y: 11, r: 8, small: true });
    Input.controls = c;
  },
  stickHome: { x: 40, y: 150 },
  stickZone: { x: 0, y: 0, w: 100, h: 100 },
  stickR: 18,
};

function _ctrlAt(x, y) {
  let best = null, bd = 1e9;
  for (const c of Input.controls) {
    if (c.id === 'pause' && !TouchUI.visible) continue;
    const d = Math.hypot(x - c.x, y - c.y);
    const lim = c.r * (c.small ? 1 : Settings.touchSize || 1) + (c.small ? 6 : 9);
    if (d < lim && d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}
function _recomputeTouch() {
  const T = {};
  for (const p of Input.pointers.values()) if (p.ctrl) T[p.ctrl] = true;
  const s = Input.stick;
  if (s) {
    const dx = s.x - s.ox, dy = s.y - s.oy;
    const dz = TouchUI.stickR * 0.28;
    if (dx < -dz) T.left = true;
    if (dx > dz) T.right = true;
    if (dy > TouchUI.stickR * 0.5) T.down = true;
    if (dy < -TouchUI.stickR * 0.55) T.up = true;
  }
  for (const b of ['jump', 'whip', 'roll', 'pause', 'left', 'right', 'up', 'down'])
    if (T[b] && !Input.touch[b]) Input.press(b);
  Input.touch = T;
}

// Touch-first devices start with on-screen controls; any touch anywhere
// (even on the letterbox) switches modes and unlocks audio.
try {
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) Input.touchMode = true;
} catch (e) {}
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') Input.setTouchMode(true);
  if (e.target !== cv) {
    Bus.emit('pointerdown');
    Input.anyKey = true;
  }
});

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
  if (isTouch) Input.setTouchMode(true);
  Bus.emit('pointerdown');
  const p = clientToScreen(e.clientX, e.clientY);
  const rec = { x: p.x, y: p.y, sx: p.x, sy: p.y, ctrl: null, stick: false, t: performance.now(), touch: isTouch };
  if (TouchUI.visible && isTouch) {
    const c = _ctrlAt(p.x, p.y);
    const z = TouchUI.stickZone;
    if (c) rec.ctrl = c.id;
    else if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
      // The newest thumb in the zone owns the stick, so a stale stick whose
      // release got lost can never keep the hero walking.
      for (const o of Input.pointers.values()) o.stick = false;
      rec.stick = true;
      Input.stick = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
    }
  }
  Input.pointers.set(e.pointerId, rec);
  _recomputeTouch();
});
cv.addEventListener('pointermove', (e) => {
  const p = clientToScreen(e.clientX, e.clientY);
  if (e.pointerType === 'mouse') Input.hover = p;
  const rec = Input.pointers.get(e.pointerId);
  if (!rec) return;
  e.preventDefault();
  rec.x = p.x;
  rec.y = p.y;
  if (rec.stick && Input.stick) {
    const s = Input.stick;
    s.x = p.x;
    s.y = p.y;
    // Drag the origin along when the thumb wanders far, so reversing is quick.
    const R = TouchUI.stickR * 1.4;
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy);
    if (d > R) {
      s.ox = s.x - (dx / d) * R;
      s.oy = s.y - (dy / d) * R;
    }
  } else if (rec.ctrl && rec.ctrl !== 'pause') {
    const c = _ctrlAt(p.x, p.y);
    if (c && c.id !== 'pause') rec.ctrl = c.id;
  }
  _recomputeTouch();
});
function _pointerEnd(e) {
  const rec = Input.pointers.get(e.pointerId);
  if (!rec) return;
  Input.pointers.delete(e.pointerId);
  if (rec.stick) Input.stick = null;
  // A short press that didn't land on a control is a tap (menus use these).
  if (!rec.ctrl && !rec.stick && e.type === 'pointerup') {
    Input.taps.push({ x: rec.x, y: rec.y, touch: rec.touch });
  }
  _recomputeTouch();
}
cv.addEventListener('pointerup', _pointerEnd);
cv.addEventListener('pointercancel', _pointerEnd);
cv.addEventListener('lostpointercapture', _pointerEnd);

// iOS Safari: a held finger triggers its own long-press UI (the share/copy
// callout, text selection, drag previews). Pointer events can't veto those,
// touch events can, so swallow them here. Pointer events still fire.
// When the OS steals a touch it may never send pointerup, which used to leave
// the stick latched in one direction; touch events give us a second source of
// truth: once no finger is on the glass, nothing can be held.
const _noTouchDefault = (e) => {
  if (e.cancelable) e.preventDefault();
};
const _touchEnd = (e) => {
  _noTouchDefault(e);
  if (!e.touches || e.touches.length === 0) {
    if (Input.pointers.size || Input.stick) {
      _releaseAllTouch();
      _recomputeTouch();
    }
  }
  // touchend is the gesture iOS trusts for starting audio
  Bus.emit('pointerdown');
};
document.addEventListener('touchstart', _noTouchDefault, { passive: false });
document.addEventListener('touchmove', _noTouchDefault, { passive: false });
document.addEventListener('touchend', _touchEnd, { passive: false });
document.addEventListener('touchcancel', _touchEnd, { passive: false });
for (const ev of ['gesturestart', 'gesturechange', 'contextmenu', 'selectstart', 'dragstart'])
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerleave', () => (Input.hover = null));

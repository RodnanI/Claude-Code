// ---------------------------------------------------------------------------
// Keyboard and gamepad input with per-tick edge detection. Two keyboard
// layouts are live at once: WASD + J/K/L/U/I/O and arrows + Z/X/C/V/B.
// ---------------------------------------------------------------------------
const Input = (() => {
  const B = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyK', 'KeyZ'], attack: ['KeyJ', 'KeyX'], dash: ['KeyL', 'ShiftLeft', 'ShiftRight'],
    guard: ['KeyU', 'KeyC'], qi: ['KeyI', 'KeyV'], ult: ['KeyO', 'KeyB'],
    pause: ['Escape', 'KeyP'], confirm: ['Enter', 'Space', 'KeyJ', 'KeyZ', 'KeyX'], back: ['Escape', 'Backspace'],
    skip: ['Tab'],
  };
  const PAD = {
    jump: [0], attack: [2], dash: [1, 5], qi: [3], guard: [4, 6], ult: [7], pause: [9], confirm: [0, 9], back: [1],
    up: [12], down: [13], left: [14], right: [15], skip: [8],
  };
  const block = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab']);
  const down = new Set(), tapped = new Set(), listeners = [];
  const held = {}, hit = {}, rel = {}, virt = {};
  let lastDevice = 'key';

  addEventListener('keydown', e => {
    if (block.has(e.code)) e.preventDefault();
    if (!e.repeat) tapped.add(e.code);
    down.add(e.code);
    lastDevice = 'key';
    for (const f of listeners) f(e);
  });
  addEventListener('keyup', e => down.delete(e.code));
  addEventListener('blur', () => down.clear());

  function pad() {
    const out = {};
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (!gp) continue;
      for (const a in PAD) for (const b of PAD[a]) if (gp.buttons[b] && gp.buttons[b].pressed) { out[a] = true; lastDevice = 'pad'; }
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.45) out.left = true;
      if (ax > 0.45) out.right = true;
      if (ay < -0.6) out.up = true;
      if (ay > 0.6) out.down = true;
    }
    return out;
  }

  function update() {
    const p = pad();
    for (const a in B) {
      const k = B[a].some(c => down.has(c)) || !!p[a] || !!virt[a];
      const t = B[a].some(c => tapped.has(c));
      hit[a] = !held[a] && (k || t);
      rel[a] = !!held[a] && !k;
      held[a] = k;
    }
    tapped.clear();
  }
  function flush() { for (const a in B) hit[a] = false; tapped.clear(); }

  return {
    update, flush, B,
    held: a => !!held[a], hit: a => !!hit[a], rel: a => !!rel[a],
    onKey: f => listeners.push(f),
    // used by the automated test harness to drive the game
    setVirtual: (a, v) => { virt[a] = v; },
    device: () => lastDevice,
  };
})();

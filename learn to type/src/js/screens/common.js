/* Screen registry and small pieces shared by several screens. */

const Screens = {};

const metric = (value, label) => h('div', { class: 'metric' }, h('b', null, value), h('span', null, label));

function starRow(n, cls = 'stars') {
  return h('div', { class: cls }, [0, 1, 2].map(i => h('span', { class: i < n ? 'on' : '' }, '★')));
}

/* The three star thresholds of a lesson as a small table. */
function reqRows(tgt) {
  const rows = [[1, pct(90)], [2, `${pct(94)} · ${fmtSpeed(tgt[0])}`], [3, `${pct(97)} · ${fmtSpeed(tgt[1])}`]];
  return h('div', { class: 'reqs' }, rows.map(([n, txt]) => h('div', null, starRow(n, 'tst'), h('span', null, txt))));
}

/* Translate in a specific language regardless of the active course. */
function tIn(lang, key, vars) {
  const prev = LANG;
  LANG = lang;
  try { return t(key, vars); } finally { LANG = prev; }
}

/* Vertical list navigation used by menus: returns the new index or -1 if the key is not a move. */
function listMove(e, i, n) {
  if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) return (i + 1) % n;
  if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) return (i - 1 + n) % n;
  return -1;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    // Keyboard Lock (Chromium) lets Esc reach the app for pausing; holding Esc still leaves fullscreen.
    if (r && r.then) r.then(() => navigator.keyboard && navigator.keyboard.lock && navigator.keyboard.lock(['Escape'])).catch(() => {});
  } else if (document.exitFullscreen) document.exitFullscreen();
}

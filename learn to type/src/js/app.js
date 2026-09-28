/* Screen switching, global settings and start-up. */

const App = {
  screen: null,
  course: null,
  go(name, params) {
    if (this.screen && this.screen.leave) this.screen.leave();
    const s = Screens[name];
    const el = s.render(params);
    el.classList.add('screen', 'scr-' + name);
    $('#app').replaceChildren(el);
    this.screen = s;
    if (s.mounted) s.mounted(params);
  }
};

function applySettings() {
  const r = document.documentElement, S = Store.data.settings;
  if (S.theme === 'auto') delete r.dataset.theme;
  else r.dataset.theme = S.theme;
  r.style.setProperty('--tape-scale', [0.8, 1, 1.18, 1.36][S.size - 1] || 1);
  r.classList.toggle('no-kb', !S.keyboard);
  r.classList.toggle('no-hands', !S.hands);
  r.classList.toggle('no-colors', !S.colors);
}

/* One key unit, sized so the keyboard and the space below it fit the viewport. */
function sizeUnits() {
  const u = clamp(Math.min((innerWidth - 48) / 15.6, (innerHeight * 0.4) / 5.4), 20, 62);
  document.documentElement.style.setProperty('--ug', u.toFixed(2) + 'px');
}

Store.load();
applySettings();
sizeUnits();
Input.init();
addEventListener('resize', () => {
  sizeUnits();
  if (App.screen && App.screen.onResize) App.screen.onResize();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) Store.save(); });
App.go('select');

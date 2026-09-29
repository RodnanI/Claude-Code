import { h, clear } from './dom.js';
import { SettingsPanel } from './settings-panel.js';
import { IslandMap } from './map.js';
import { ACTIONS } from '../input/bindings.js';
import { Hangar } from './hangar.js';

export { planeFacts } from './hangar.js';

const KEYNAMES = { ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', Space: 'Space', Escape: 'Esc', Period: '.', Comma: ',', Slash: '/', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', PageUp: 'PgUp', PageDown: 'PgDn' };
const keyName = (c) => KEYNAMES[c] || c.replace(/^Key/, '').replace(/^Digit/, '');

/** Menu, hangar, pause, crash, controls and map screens around the running game. */
export class App {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    const home = game.starts.find((s) => s.id === 'airport-09R') || game.starts[0];
    this.sel = { plane: game.planes.find((p) => p.id === 'skylark')?.id || game.planes[0].id, start: home.id, livery: 'default', airborne: false };
    this.screens = {};
    this.modal = null;
    this._build();
    game.on('state', (s) => this._onState(s));
    game.on('crash', (reason) => setTimeout(() => this._showCrash(reason), 1300));
    game.on('map', () => this.openMap());
    game.on('stats', (on) => this.stats.classList.toggle('on', on));
    addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.modal) { e.stopImmediatePropagation(); e.preventDefault(); this.closeModal(); } }, true);
    setInterval(() => this._tickStats(), 250);
  }

  _screen(name) {
    const el = h('div', { class: 'screen', id: 'screen-' + name });
    this.root.append(el);
    this.screens[name] = el;
    return el;
  }

  show(name) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('on', k === name);
    this.current = name;
    if (this.hangar && name !== 'hangar') this.hangar.close();
  }

  hideAll() { this.show(null); }

  // ------------------------------------------------------------------ build
  _build() {
    const g = this.game;
    // main menu
    const menu = this._screen('menu');
    menu.append(h('div', { class: 'menu-panel' },
      h('div', null, h('h1', { class: 'menu-title' }, 'Fly', h('span', null, 'High')), h('p', { class: 'menu-sub' }, 'One island. Three runways. A jet, a trainer and a barn-built taildragger. Every voxel in the world is really there.')),
      h('div', { class: 'stripe' }),
      h('div', { class: 'menu-list' },
        h('button', { class: 'btn primary', onclick: () => this.showHangar() }, 'Fly'),
        h('button', { class: 'btn', onclick: () => this.openSettings() }, 'Settings'),
        h('button', { class: 'btn', onclick: () => this.openControls() }, 'Controls'),
        h('button', { class: 'btn', onclick: () => this.toggleFullscreen() }, 'Fullscreen')),
      h('div', { class: 'menu-foot', id: 'menu-foot' })));
    // hangar: aircraft cards, airfield chart, briefing and conditions (see hangar.js)
    this.hangar = new Hangar(this, this._screen('hangar'));
    // pause
    const pause = this._screen('pause');
    pause.append(h('div', { class: 'center-card' }, h('h1', null, 'Paused'), h('p', null, 'The aircraft is holding still. The island is not.'),
      h('div', { class: 'stack' },
        h('button', { class: 'btn primary', onclick: () => g.resume() }, 'Resume'),
        h('button', { class: 'btn', onclick: () => g.restart() }, 'Restart flight'),
        h('button', { class: 'btn', onclick: () => this.openMap() }, 'Island map'),
        h('button', { class: 'btn', onclick: () => this.openSettings() }, 'Settings'),
        h('button', { class: 'btn', onclick: () => this.openControls() }, 'Controls'),
        h('button', { class: 'btn', onclick: () => { g.toMenu(); this.showHangar(); } }, 'Change aircraft'),
        h('button', { class: 'btn', onclick: () => { g.toMenu(); this.showMenu(); } }, 'Main menu'))));
    // crash
    const crash = this._screen('crash');
    this.crashTitle = h('h1', null, 'Crashed');
    this.crashText = h('p', null, '');
    crash.append(h('div', { class: 'center-card bad' }, this.crashTitle, this.crashText,
      h('div', { class: 'stack' },
        h('button', { class: 'btn primary', onclick: () => g.restart() }, 'Try again (R)'),
        h('button', { class: 'btn', onclick: () => { g.toMenu(); this.showHangar(); } }, 'Change aircraft or start'),
        h('button', { class: 'btn', onclick: () => { g.toMenu(); this.showMenu(); } }, 'Main menu'))));
    // modal layer
    this.modalLayer = this._screen('modal');
    this.modalLayer.style.zIndex = 40;
    this.settings = new SettingsPanel(g.store, { onClose: () => this.closeModal() });
    this.controls = this._controlsSheet();
    this.map = new IslandMap(g, () => this.closeModal());
    // overlays
    this.stats = h('div', { id: 'stats' });
    this.hint = h('div', { class: 'hint off' }, 'Shift: throttle   W S: pitch   A D: roll   Q E: rudder   Space: brakes   G: gear   F V: flaps   X: camera   M: map');
    document.body.append(this.stats, this.hint);
  }

  _controlsSheet() {
    const rows = ACTIONS.map((a) => h('div', { class: 'keyrow' }, h('span', null, a.label), h('span', null, a.keys.filter((k, i, arr) => arr.findIndex((x) => keyName(x) === keyName(k)) === i).map((k) => h('span', { class: 'kbd' }, keyName(k))))));
    return h('div', { class: 'modal', onclick: (e) => { if (e.target.classList.contains('modal')) this.closeModal(); } },
      h('div', { class: 'sheet' },
        h('div', { class: 'sheet-head' }, h('h1', null, 'Controls'), h('button', { class: 'btn small', onclick: () => this.closeModal() }, 'Done')),
        h('div', { class: 'pane', style: { padding: '16px 24px' } },
          h('div', { class: 'keys' }, rows),
          h('p', { class: 'label', style: { marginTop: '22px' } }, 'Mouse'),
          h('p', null, 'Hold the right button and drag to look around. The wheel zooms the chase and orbit cameras. Turn on Mouse flight in Settings to steer with the pointer.'),
          h('p', { class: 'label' }, 'Gamepad'),
          h('p', null, 'Left stick pitch and roll, right stick rudder, triggers throttle, A brakes, B gear, X and Y flaps, LB camera, RB airbrake, View map, Menu pause, D-pad trim.'))));
  }

  // ------------------------------------------------------------------ flow
  showMenu() {
    this.game.showFlyover();
    this.show('menu');
    const foot = document.getElementById('menu-foot');
    const g = this.game, p = g.probe;
    foot.textContent = `${g.renderer.info.renderer || 'GPU'}\nquality: ${g.store.get('preset')}${p ? '  (detected ' + p.tier + ')' : ''}   workers: ${g.nodes.stats.mode}\nF3 performance overlay   F12 screenshot`;
    foot.style.whiteSpace = 'pre-line';
  }

  showHangar() {
    this.show('hangar');
    this.hangar.open();
  }

  fly() {
    this.hideAll();
    this.game.startFlight({ planeId: this.sel.plane, startId: this.sel.start, livery: this.sel.livery, airborne: this.sel.airborne });
    this.hint.classList.remove('off');
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => this.hint.classList.add('off'), 9000);
  }

  _onState(s) {
    if (s === 'flying') { this.hideAll(); this.closeModal(); }
    else if (s === 'paused') this.show('pause');
    else if (s === 'menu' && !this.current) this.showMenu();
  }

  _showCrash(reason) {
    if (this.game.state !== 'flying') return;
    this.crashText.textContent = reason ? reason.charAt(0).toUpperCase() + reason.slice(1) + '.' : 'The flight is over.';
    this.show('crash');
    this.game.pause();
    this.show('crash');
  }

  openModal(el, then) {
    this._prevScreen = this.current;
    if (this.current && this.screens[this.current]) this.screens[this.current].style.display = 'none';
    clear(this.modalLayer).append(el);
    this.modalLayer.classList.add('on');
    this.modal = el;
    if (then) then();
  }

  closeModal() {
    if (!this.modal) return;
    if (this.modal === this.map.root) this.map.close();
    this.modalLayer.classList.remove('on');
    clear(this.modalLayer);
    this.modal = null;
    for (const el of Object.values(this.screens)) el.style.display = '';
  }

  openSettings() { this.openModal(this.settings.root); }
  openControls() { this.openModal(this.controls); }
  openMap() { this.openModal(this.map.root, () => this.map.open()); }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }

  _tickStats() {
    if (!this.stats.classList.contains('on')) return;
    const s = this.game.getStats();
    const n = (v, d = 0) => v.toFixed(d);
    this.stats.textContent =
      `${n(s.fps)} fps   ${n(s.frameMs, 1)} ms   p95 ${n(s.p95, 1)}   cpu ${n(s.cpuMs, 1)} ms\n` +
      `preset ${s.preset}   scale ${n(s.scale, 2)}   view ${n(s.viewKm)} km\n` +
      `draws ${s.draws}   tris ${(s.tris / 1000).toFixed(0)}k   nodes ${s.nodesDrawn}\n` +
      `terrain loaded ${s.loaded}   pending ${s.pending}   gpu ${n(s.gpuMB)} MB   ${s.workers}   build ${n(s.buildMs, 1)} ms\n` +
      `traffic ${s.traffic}   alt ${n(s.alt)} m   agl ${n(s.agl)} m   ias ${n(s.ias * 1.944)} kt`;
  }
}


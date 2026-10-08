// wndo :: interface. a tuning dial for places, four tools, a settings drawer
(() => {
  const W = window.W;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const ICONS = {
    focus: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.2"/><path d="M10 2.8v3M10 14.2v3M2.8 10h3M14.2 10h3"/><circle cx="10" cy="10" r="1.6"/></svg>',
    focusFar: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.2"/><path d="M5.5 12.5l3-3 2 2 4-4.5"/></svg>',
    sound: '<svg viewBox="0 0 20 20"><path d="M3.5 8v4h3l4 3.2V4.8l-4 3.2z"/><path d="M13.3 7.4a3.6 3.6 0 010 5.2M15.4 5.3a6.6 6.6 0 010 9.4"/></svg>',
    mute: '<svg viewBox="0 0 20 20"><path d="M3.5 8v4h3l4 3.2V4.8l-4 3.2z"/><path d="M13.5 8l4 4M17.5 8l-4 4"/></svg>',
    set: '<svg viewBox="0 0 20 20"><path d="M3 5.5h14M3 10h14M3 14.5h14"/><rect x="5.5" y="4" width="2.4" height="3" rx=".4"/><rect x="11.8" y="8.5" width="2.4" height="3" rx=".4"/><rect x="7.6" y="13" width="2.4" height="3" rx=".4"/></svg>',
    full: '<svg viewBox="0 0 20 20"><path d="M3.5 7.5v-4h4M12.5 3.5h4v4M16.5 12.5v4h-4M7.5 16.5h-4v-4"/></svg>',
  };

  const UI = (W.UI = {
    tab: 'View',
    idle: 0,
    fpsAcc: [],
    sleepAt: 0,
    cycleAt: 0,
  });

  UI.init = function (app) {
    this.app = app;
    const S = app.S;
    // dial
    const dial = $('#dial');
    this.needle = el('div', null);
    this.needle.id = 'needle';
    dial.appendChild(this.needle);
    app.scenes.forEach((sc, i) => {
      const b = el('button', 'stn', '<span class="num">0' + (i + 1) + '</span><span class="lbl">' + sc.name + '</span>');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => app.setScene(i));
      dial.appendChild(b);
    });
    // tools
    $('#t-set').innerHTML = ICONS.set;
    $('#t-full').innerHTML = ICONS.full;
    this.paintTools();
    $('#t-focus').addEventListener('click', () => {
      app.toggleFocus();
      this.paintTools();
    });
    $('#t-sound').addEventListener('click', () => this.toggleSound());
    $('#t-set').addEventListener('click', () => this.panel(!$('#panel').classList.contains('open')));
    $('#p-close').addEventListener('click', () => this.panel(false));
    $('#t-full').addEventListener('click', () => this.fullscreen());
    $('#reset-scene').addEventListener('click', () => {
      S.resetScene(app.scene);
      this.toast('this place is back to how it was');
    });
    $('#reset-all').addEventListener('click', () => {
      S.resetAll();
      app.applyQuality();
      this.toast('everything reset');
    });
    // tabs
    const tabs = $('#tabs');
    W.SCHEMA.forEach((t) => {
      const b = el('button', 'tab', t.tab);
      b.type = 'button';
      b.addEventListener('click', () => {
        this.tab = t.tab;
        this.renderPanel();
      });
      tabs.appendChild(b);
    });
    S.on((key) => this.onSetting(key));
    W.bus.on('scene', () => {
      this.paintPlace();
      if ($('#panel').classList.contains('open')) this.renderPanel();
    });
    W.bus.on('leaving', (sc) => this.paintPlace(sc));
    this.bindInput();
    this.paintPlace();
    // intro: needs a gesture before sound can start
    const intro = $('#intro');
    const open = () => {
      if (this.opened) return;
      this.opened = true;
      intro.classList.add('gone');
      $('#hud').classList.remove('hidden');
      if (W.audio) W.audio.start(app);
      this.wake();
      this.poke();
    };
    $('#open').addEventListener('click', open);
    intro.addEventListener('click', (e) => {
      if (e.target === intro) open();
    });
    this.onSetting('clock');
    this.onSetting('sleep');
    this.onSetting('cycle');
    this.onSetting('showFps');
  };

  UI.paintPlace = function (sc) {
    const app = this.app;
    sc = sc || app.scene;
    if (!sc) return;
    const i = app.scenes.indexOf(sc);
    $('.place-name').textContent = sc.name;
    $('.place-sub').textContent = sc.sub;
    const stns = document.querySelectorAll('.stn');
    stns.forEach((b, k) => b.classList.toggle('on', k === i));
    requestAnimationFrame(() => {
      const b = stns[i];
      if (b) this.needle.style.left = b.offsetLeft + b.offsetWidth / 2 - 1 + 'px';
    });
  };

  UI.paintTools = function () {
    const app = this.app;
    const far = app.focusTarget > 0.5;
    const f = $('#t-focus');
    f.innerHTML = far ? ICONS.focusFar : ICONS.focus;
    f.classList.toggle('active', far);
    f.title = far ? 'Looking outside. Back to the glass (space)' : 'Looking at the glass. Look outside (space)';
    const muted = W.audio && W.audio.muted;
    $('#t-sound').innerHTML = muted ? ICONS.mute : ICONS.sound;
  };

  UI.toggleSound = function () {
    if (!W.audio) return;
    if (!W.audio.ctx) W.audio.start(this.app);
    W.audio.setMuted(!W.audio.muted);
    this.paintTools();
    this.toast(W.audio.muted ? 'sound off' : 'sound on');
  };

  UI.fullscreen = function () {
    const d = document, e = d.documentElement;
    const fs = d.fullscreenElement || d.webkitFullscreenElement;
    if (fs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (e.requestFullscreen) e.requestFullscreen().catch(() => {});
    else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen();
  };

  UI.panel = function (open) {
    const p = $('#panel');
    p.classList.toggle('open', open);
    p.setAttribute('aria-hidden', open ? 'false' : 'true');
    $('#t-set').classList.toggle('active', open);
    if (open) this.renderPanel();
    this.poke();
  };

  UI.renderPanel = function () {
    const app = this.app, S = app.S, sc = app.scene;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.textContent === this.tab));
    const pane = $('#pane');
    pane.innerHTML = '';
    const tab = W.SCHEMA.find((t) => t.tab === this.tab);
    for (const it of tab.items) {
      if (it.only && !it.only.includes(sc.id)) continue;
      if (it.scope === 'scene' && sc.controls && !sc.controls.includes(it.key) && !it.only) continue;
      const row = el('div', 'row');
      const top = el('div', 'row-top');
      const lab = el('label', null, it.label + (it.scope === 'scene' ? '<span class="scope">this place</span>' : ''));
      top.appendChild(lab);
      const v = S.get(it.key, sc);
      if (it.type === 'range') {
        const out = el('span', 'val', fmt(v, it));
        top.appendChild(out);
        row.appendChild(top);
        const inp = document.createElement('input');
        inp.type = 'range';
        inp.min = it.min;
        inp.max = it.max;
        inp.step = it.step;
        inp.value = v;
        inp.setAttribute('aria-label', it.label);
        const paint = () => inp.style.setProperty('--p', ((inp.value - it.min) / (it.max - it.min)) * 100 + '%');
        paint();
        inp.addEventListener('input', () => {
          S.set(it.key, +inp.value, sc);
          out.textContent = fmt(+inp.value, it);
          paint();
        });
        if (it.hint) row.appendChild(el('div', 'hint', it.hint));
        row.appendChild(inp);
      } else if (it.type === 'toggle') {
        const t = el('button', 'tog' + (v ? ' on' : ''));
        t.type = 'button';
        t.setAttribute('aria-label', it.label);
        t.setAttribute('aria-pressed', v ? 'true' : 'false');
        t.addEventListener('click', () => {
          const nv = !S.get(it.key, sc);
          S.set(it.key, nv, sc);
          t.classList.toggle('on', nv);
          t.setAttribute('aria-pressed', nv ? 'true' : 'false');
        });
        top.appendChild(t);
        row.appendChild(top);
        if (it.hint) row.appendChild(el('div', 'hint', it.hint));
      } else {
        row.appendChild(top);
        if (it.hint) row.appendChild(el('div', 'hint', it.hint));
        const seg = el('div', 'seg');
        for (const [val, name] of it.options) {
          const b = el('button', String(v) === val ? 'on' : '', name);
          b.type = 'button';
          b.addEventListener('click', () => {
            S.set(it.key, val, sc);
            seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            if (it.key === 'parallax' && val === 'motion') this.askMotion();
          });
          seg.appendChild(b);
        }
        row.appendChild(seg);
      }
      pane.appendChild(row);
    }
  };

  function fmt(v, it) {
    if (it.key === 'exposure') return (v > 0 ? '+' : '') + v.toFixed(1) + ' ev';
    if (it.key === 'warm') return (v > 0 ? '+' : '') + Math.round(v * 100);
    return Math.round(((v - it.min) / (it.max - it.min)) * 100) + '';
  }

  UI.askMotion = function () {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      D.requestPermission().then((r) => {
        if (r !== 'granted') this.toast('tilt needs motion access');
      }).catch(() => this.toast('tilt needs motion access'));
    }
    this.app.tilt0 = null;
  };

  UI.onSetting = function (key) {
    const app = this.app, S = app.S;
    if (key === 'quality' || key === '*') {
      app.dyn = 1;
      app.applyQuality();
    }
    if (key === 'clock' || key === '*') $('#clock').hidden = S.g.clock === 'off';
    if (key === 'showFps' || key === '*') $('#fps').hidden = !S.g.showFps;
    if (key === 'awake') this.wake();
    if (key === 'sleep' || key === '*') {
      const m = +S.g.sleep;
      this.sleepAt = m ? performance.now() + m * 60000 : 0;
      app.dim = 1;
      if (m && key === 'sleep') this.toast('sleeping in ' + m + ' min');
    }
    if (key === 'cycle' || key === '*') {
      const m = +S.g.cycle;
      this.cycleAt = m ? performance.now() + m * 60000 : 0;
    }
    if (W.audio && W.audio.ctx) W.audio.settings(S);
  };

  // screen wake lock: re-requested whenever the page comes back into view
  UI.wake = function () {
    const S = this.app.S;
    if (!navigator.wakeLock || !S.g.awake || !this.opened) {
      if (this.lock) { this.lock.release().catch(() => {}); this.lock = null; }
      return;
    }
    if (this.lock || document.hidden) return;
    navigator.wakeLock.request('screen').then((l) => {
      this.lock = l;
      l.addEventListener('release', () => (this.lock = null));
    }).catch(() => {});
  };

  UI.toast = function (msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('show'), 1800);
  };

  UI.poke = function () {
    this.idle = 0;
    document.body.classList.remove('idle');
  };

  UI.bindInput = function () {
    const app = this.app, canvas = $('#view');
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => this.poke(), { passive: true }));
    // draw in the condensation
    let last = null;
    const toGlass = (e) => {
      const R = app.R, c = R.cam;
      const a = innerWidth / innerHeight;
      const sx = (e.clientX / innerWidth - 0.5) * a, sy = 0.5 - e.clientY / innerHeight;
      const hx = (c.head[0] + c.shake[0]) * c.kp / 1.16, hy = (c.head[1] + c.shake[1]) * c.kp / 1.16;
      return [sx + hx + a / 2, sy + hy + 0.5];
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (!app.S.g.wipe) return;
      canvas.setPointerCapture(e.pointerId);
      last = toGlass(e);
      app.R.addWipe(last[0], last[1], last[0] + 0.001, last[1]);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = toGlass(e);
      app.R.addWipe(last[0], last[1], p[0], p[1]);
      last = p;
    });
    let tapT = 0, tapX = 0, tapY = 0, downX = 0, downY = 0;
    canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
    const end = (e) => {
      last = null;
      if (!e || e.pointerType !== 'touch') return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) return;
      const now = performance.now();
      if (now - tapT < 320 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 40) {
        app.toggleFocus();
        this.paintTools();
        tapT = 0;
      } else {
        tapT = now; tapX = e.clientX; tapY = e.clientY;
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', () => {
      app.toggleFocus();
      this.paintTools();
    });
    // the wheel racks focus by hand
    window.addEventListener('wheel', (e) => {
      if (e.target.closest && e.target.closest('#panel')) return;
      app.focusTarget = W.clamp(app.focusTarget - e.deltaY * 0.0012, 0, 1);
      this.paintTools();
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); app.toggleFocus(); this.paintTools(); }
      else if (k === 'arrowright') app.next(1);
      else if (k === 'arrowleft') app.next(-1);
      else if (k === 'm') this.toggleSound();
      else if (k === 's') this.panel(!$('#panel').classList.contains('open'));
      else if (k === 'f') this.fullscreen();
      else if (k === 'h') { document.body.classList.add('idle'); this.idle = 1e9; }
      else if (k === 'escape') this.panel(false);
      else if (/^[1-9]$/.test(k) && +k <= app.scenes.length) app.setScene(+k - 1);
      else if (k === 'enter' && !this.opened) $('#open').click();
    });
    document.addEventListener('visibilitychange', () => this.wake());
  };

  UI.tick = function (dt, t, ms) {
    const app = this.app, S = app.S, now = performance.now();
    this.idle += dt;
    const open = $('#panel').classList.contains('open');
    if (this.opened && !open && this.idle > +S.g.hideDelay) document.body.classList.add('idle');
    if (S.g.clock !== 'off') {
      const d = new Date();
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      let suf = '';
      if (S.g.clock === '12') {
        suf = '<small>' + (h < 12 ? 'am' : 'pm') + '</small>';
        h = h % 12 || 12;
      }
      const txt = (S.g.clock === '24' ? String(h).padStart(2, '0') : h) + ':' + m + suf;
      if (txt !== this.clockTxt) $('#clock').innerHTML = this.clockTxt = txt;
    }
    if (S.g.showFps) {
      this.fpsAcc.push(ms);
      if (this.fpsAcc.length > 30) this.fpsAcc.shift();
      if ((this.fpsN = (this.fpsN || 0) + 1) % 15 === 0) {
        const a = this.fpsAcc.reduce((x, y) => x + y, 0) / this.fpsAcc.length;
        const c = app.R.canvas;
        $('#fps').textContent = Math.round(1000 / a) + ' fps  ' + c.width + 'x' + c.height + (app.dyn < 1 ? '  adaptive ' + Math.round(app.dyn * 100) + '%' : '');
      }
    }
    // sleep timer: the last minute fades sound and picture to nothing
    if (this.sleepAt) {
      const left = (this.sleepAt - now) / 1000;
      app.dim = W.clamp(left / 60, 0, 1);
      if (left <= 0) {
        this.sleepAt = 0;
        S.g.sleep = '0';
        app.dim = 0;
        app.paused = true;
        if (W.audio) W.audio.setMuted(true, true);
        const wake = () => {
          app.paused = false;
          app.dim = 1;
          if (W.audio) W.audio.setMuted(false, true);
          window.removeEventListener('pointerdown', wake);
          window.removeEventListener('keydown', wake);
        };
        window.addEventListener('pointerdown', wake);
        window.addEventListener('keydown', wake);
      }
    }
    if (this.cycleAt && now > this.cycleAt) {
      this.cycleAt = now + +S.g.cycle * 60000;
      app.next(1);
    }
  };
})();

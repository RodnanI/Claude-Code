// wndo :: boot, environment, camera, loop
(() => {
  const W = window.W;
  const $ = (s) => document.querySelector(s);

  const app = (W.app = {
    scene: null,
    sceneIdx: 0,
    t: 0,
    env: { rain: 0, wind: 0, fog: 0, wet: 0, gust: 0, flash: 0, traffic: 0.6 },
    focus: 0,
    focusTarget: 0,
    head: [0, 0, 0, 0],
    pointer: [0, 0],
    tilt: null,
    fogT: 0,
    dyn: 1,
    frameTimes: [],
    started: false,
  });

  const gustN = W.noise1(11), gustN2 = W.noise1(12), flickN = W.noise1(13), flickN2 = W.noise1(14), driftN = W.noise1(15), driftN2 = W.noise1(16);
  let pulses = [];
  let nextStrike = 20;

  function boot() {
    const canvas = $('#view');
    try {
      app.R = new W.Renderer(canvas);
    } catch (e) {
      showError(e);
      return;
    }
    app.S = new W.Settings();
    app.scenes = W.scenes;
    const last = W.store.get('scene', 'city');
    app.sceneIdx = Math.max(0, app.scenes.findIndex((s) => s.id === last));
    applyQuality();
    if (W.UI) W.UI.init(app);
    setScene(app.sceneIdx, true);
    window.addEventListener('resize', () => applyQuality());
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      showError(new Error('The graphics context was lost. Reload the page to bring the window back.'));
    });
    document.addEventListener('pointermove', (e) => {
      app.pointer = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1];
    });
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      if (!app.tilt0) app.tilt0 = [e.gamma, e.beta];
      app.tilt = [W.clamp((e.gamma - app.tilt0[0]) / 25, -1, 1), W.clamp((e.beta - app.tilt0[1]) / 25, -1, 1)];
    });
    app.last = performance.now();
    app.paused = !!window.__still;
    requestAnimationFrame(loop);
  }

  function showError(e) {
    console.error(e);
    const el = $('#error');
    if (el) {
      el.hidden = false;
      el.querySelector('p').textContent = e.message || String(e);
    }
  }

  // canvas resolution from quality preset, device pixels and adaptive scale
  function applyQuality() {
    const S = app.S, q = W.QUALITY[S.g.quality] || W.QUALITY.high;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let scale = q.scale * app.dyn;
    let w = innerWidth * dpr * scale, h = innerHeight * dpr * scale;
    if (h > q.maxH) {
      w *= q.maxH / h;
      h = q.maxH;
    }
    app.R.setDropQuality(q.drops);
    app.R.resize(Math.round(w), Math.round(h), q.scene, q.out);
    app.q = q;
  }
  app.applyQuality = applyQuality;

  function setScene(i, instant) {
    const n = app.scenes.length;
    i = ((i % n) + n) % n;
    const go = () => {
      const sc = app.scenes[i];
      if (!sc.ready) {
        try {
          sc.init(app.R);
          sc.ready = true;
        } catch (e) {
          showError(e);
          return;
        }
      }
      app.scene = sc;
      app.sceneIdx = i;
      W.store.set('scene', sc.id);
      const S = app.S;
      app.env.wet = S.get('rain', sc) * 0.9;
      app.R.lights.clear();
      W.bus.emit('scene', sc);
    };
    if (instant || !app.scene) {
      go();
      app.fogT = 0;
      return;
    }
    app.transition = { t: 0, go, done: false };
    W.bus.emit('leaving', app.scenes[i]);
  }
  app.setScene = setScene;
  app.next = (d) => setScene(app.sceneIdx + d);

  app.toggleFocus = () => {
    app.focusTarget = app.focusTarget > 0.5 ? 0 : 1;
    W.bus.emit('focus', app.focusTarget);
  };

  // ---- environment: weather values, gusts, lightning, wetness of the glass ----
  function updateEnv(dt, t) {
    const S = app.S, sc = app.scene, e = app.env;
    const target = {
      rain: S.get('rain', sc), wind: S.get('wind', sc), fog: S.get('fog', sc), cond: S.get('cond', sc),
      frost: S.get('frost', sc), traffic: S.get('traffic', sc), snow: S.get('snow', sc), waves: S.get('waves', sc),
      fireflies: S.get('fireflies', sc), speed: S.get('speed', sc),
    };
    const k = 1 - Math.exp(-dt * 1.5);
    for (const key in target) {
      const v = target[key] == null ? 0 : +target[key];
      e[key] = e[key] == null ? v : e[key] + (v - e[key]) * k;
    }
    const wantWet = sc.dry ? 0 : e.rain;
    const tau = wantWet > e.wet ? 6 : 60;
    e.wet += (wantWet - e.wet) * (1 - Math.exp(-dt / tau));
    // gusts: slow swell plus sharper bursts, shared with the sound
    const g = gustN(t * 0.11) * 0.65 + gustN2(t * 0.37) * 0.35;
    e.gust = e.wind * (0.35 + 0.9 * W.smoothstep(0.35, 0.85, g));
    // lightning
    const level = +S.get('lightning', sc);
    if (level > 0 && t > nextStrike) {
      const strike = { t, power: 0.4 + Math.random() * 0.6, dist: 1.5 + Math.random() * 9 };
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) pulses.push([t + i * (0.07 + Math.random() * 0.16), strike.power * (i === 0 ? 1 : 0.5 + Math.random() * 0.6)]);
      W.bus.emit('thunder', { delay: strike.dist, power: strike.power });
      nextStrike = t + (level > 1 ? 9 + Math.random() * 25 : 35 + Math.random() * 70);
    }
    if (level === 0) nextStrike = Math.max(nextStrike, t + 8);
    let f = 0;
    pulses = pulses.filter((p) => t - p[0] < 2);
    for (const p of pulses) {
      const dtp = t - p[0];
      if (dtp >= 0) f += p[1] * (Math.exp(-dtp / 0.06) * 1.6 + Math.exp(-dtp / 0.5) * 0.25);
    }
    e.flash = f;
  }

  // ---- camera: scene base, head parallax, drift ----
  function updateCamera(dt, t) {
    const S = app.S, R = app.R, c = R.cam, sc = app.scene;
    c.base = sc.cam.base;
    c.yaw = sc.cam.yaw;
    c.pitch = sc.cam.pitch;
    c.fovY = sc.cam.fovY;
    const amt = S.g.parallaxAmt;
    let tx = 0, ty = 0;
    if (S.g.parallax === 'mouse') {
      tx = app.pointer[0] * 0.075 * amt;
      ty = -app.pointer[1] * 0.045 * amt;
    } else if (S.g.parallax === 'motion' && app.tilt) {
      tx = app.tilt[0] * 0.075 * amt;
      ty = -app.tilt[1] * 0.045 * amt;
    }
    if (S.g.drift) {
      tx += (driftN(t * 0.05) - 0.5) * 0.03;
      ty += (driftN2(t * 0.04) - 0.5) * 0.018;
    }
    const hx = W.spring(app.head[0], app.head[2], tx, 3.2, dt);
    const hy = W.spring(app.head[1], app.head[3], ty, 3.2, dt);
    app.head = [hx[0], hy[0], hx[1], hy[1]];
    c.head = [app.head[0], app.head[1]];
    if (sc.shake) c.shake = sc.shake;
    else c.shake = [0, 0];
    c.update(R.aspect);
  }

  function lookOf(sc) {
    const S = app.S, L = sc.look;
    const pick = (k, d) => (S.g[k] && S.g[k] !== 'auto' ? S.g[k] : d);
    const on = (k, d) => (S.g[k] === 'on' ? true : S.g[k] === 'off' ? false : d);
    return {
      frame: pick('frame', L.frame),
      material: pick('material', L.material),
      candle: on('candle', L.candle),
      mug: on('mug', L.mug),
      plant: on('plant', L.plant),
    };
  }
  app.lookOf = lookOf;

  function params(dt, t) {
    const S = app.S, g = S.g, sc = app.scene, L = sc.look, e = app.env;
    // rack focus between the glass (1.16 m) and far away
    const k = 1 - Math.exp(-dt * 2.6);
    app.focus += (app.focusTarget - app.focus) * k;
    const f = app.focus * app.focus * (3 - 2 * app.focus);
    const focusInv = W.lerp(1 / 1.16, 1 / 600, f);
    const fl = flickN(t * 7) * 0.7 + flickN2(t * 19) * 0.3;
    const lampK = W.kelvin(L.lampK || 2750);
    const lamp = W.scale3(lampK, L.lamp * g.roomLight);
    const look = lookOf(sc);
    app.R.windowFor(look.frame, look.material, look);
    const shapes = { 0: 0, 5: 5, 6: 6, 8: 8 };
    return {
      env: e,
      K: 58 * g.aperture,
      focusInv,
      dTyp: L.dTyp,
      bloom: L.bloom,
      bokehOnly: g.bokehOnly,
      bokehGain: 1,
      bokehBoost: g.bokehBright,
      halo: g.halo * L.halo * (0.6 + e.fog * 0.5 + e.rain * 0.4),
      reflStretch: L.reflStretch,
      shutter: 1 / 50,
      blades: shapes[g.blades] || 0,
      rim: g.rim, cat: g.cat, ca: g.ca, soft: 0.05,
      wet: e.wet * g.drops * (sc.dry ? 0 : 1),
      runRate: (0.5 + e.rain * 0.9) * (sc.runK || 1),
      dropSize: g.dropSize,
      flowAng: sc.flowAng != null ? sc.flowAng : L.flowAng,
      cond: e.cond,
      frost: e.frost,
      fogT: app.fogT,
      smudge: 0.7,
      snowGlass: sc.snowGlass ? sc.snowGlass(e) : 0,
      wipeOn: g.wipe,
      refog: +g.refog,
      wall: W.lin(L.wall),
      lamp,
      flame: 1 + (fl - 0.5) * 0.35,
      flameSway: [(flickN2(t * 1.3) - 0.5) * 2, fl],
      refl: g.refl * L.refl,
      train: sc.id === 'train' ? (sc.tunnel ? 3.2 : 1) * g.refl : 0,
      flash: e.flash,
      flashCol: [0.75, 0.82, 1.0],
      exposure: L.exposure + g.exposure,
      sat: L.sat * g.sat,
      contrast: L.contrast,
      vignette: g.vignette,
      grain: g.grain,
      warm: g.warm,
      dim: app.dim == null ? 1 : app.dim,
      lift: L.lift,
      gain: L.gain,
    };
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (app.paused) return;
    if (document.hidden) {
      app.last = now;
      return;
    }
    const cap = +app.S.g.fps;
    const elapsed = now - app.last;
    if (cap > 0 && elapsed < 1000 / cap - 2) return;
    let dt = Math.min(elapsed / 1000, 0.1);
    app.last = now;
    app.t += dt;
    const t = app.t;
    // scene transition: the glass fogs over, the place changes, the fog lifts
    if (app.transition) {
      const tr = app.transition;
      tr.t += dt;
      if (!tr.done) {
        app.fogT = Math.min(1, tr.t / 0.9);
        if (tr.t >= 0.95) {
          tr.go();
          tr.done = true;
          tr.t = 0;
        }
      } else {
        app.fogT = Math.max(0, 1 - tr.t / 2.2);
        if (app.fogT <= 0) app.transition = null;
      }
    }
    const sc = app.scene;
    if (!sc) return;
    try {
      updateEnv(dt, t);
      updateCamera(dt, t);
      app.R.lights.clear();
      sc.update(dt, t, app.env, app.R, app);
      const P = params(dt, t);
      app.R.frame(t, dt, sc, P);
    } catch (e) {
      showError(e);
      app.scene = null;
      return;
    }
    if (W.audio && W.audio.ctx) W.audio.update(dt, t, app);
    if (W.UI) W.UI.tick(dt, t, elapsed);
    adapt(elapsed);
  }

  // for automated stills: step the simulation without drawing, then draw one frame
  app.still = (seconds, steps = 30) => {
    app.paused = true;
    const dt = seconds / steps;
    for (let i = 0; i < steps; i++) {
      app.t += dt;
      updateEnv(dt, app.t);
      updateCamera(dt, app.t);
      app.R.lights.clear();
      app.scene.update(dt, app.t, app.env, app.R, app);
      if (i === steps - 1) app.R.frame(app.t, dt, app.scene, params(dt, app.t));
    }
    app.R.gl.finish();
  };

  // adaptive resolution: watch the frame time against the cap
  let adaptT = 0;
  function adapt(ms) {
    if (!app.S.g.autoRes) return;
    const ft = app.frameTimes;
    ft.push(ms);
    if (ft.length > 90) ft.shift();
    adaptT += ms;
    if (adaptT < 2500 || ft.length < 60) return;
    adaptT = 0;
    const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
    const cap = +app.S.g.fps || 60;
    const target = 1000 / Math.min(cap, 60);
    if (avg > target * 1.35 && app.dyn > 0.55) {
      app.dyn = Math.max(0.55, app.dyn - 0.1);
      applyQuality();
      ft.length = 0;
    } else if (avg < target * 1.08 && app.dyn < 1) {
      app.dyn = Math.min(1, app.dyn + 0.05);
      applyQuality();
      ft.length = 0;
    }
  }

  window.addEventListener('DOMContentLoaded', boot);
})();

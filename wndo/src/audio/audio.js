// wndo :: sound. Everything is synthesised: noise, filters, a little DSP for the textures.
// Outside sounds pass through "the window" (a lowpass that opens when the window is cracked open).
(() => {
  const W = window.W;
  const A = (W.audio = { ctx: null, muted: false, scape: null, layers: {}, timers: [] });
  const rnd = Math.random;
  const R = (a, b) => a + (b - a) * rnd();

  // ---------- offline DSP helpers ----------
  function biquad(type, f, q, sr) {
    const w = (2 * Math.PI * f) / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w);
    let b0, b1, b2;
    if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; }
    else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    const a0 = 1 + al;
    return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - al) / a0];
  }
  function filt(x, co) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const y = co[0] * x[i] + co[1] * x1 + co[2] * x2 - co[3] * y1 - co[4] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
    }
    return x;
  }
  function norm(x, peak) {
    let m = 0;
    for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
    if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
    return x;
  }
  // mix a mono grain into a stereo buffer with constant-power pan, wrapping around the loop end
  function place(L, Rr, g, at, gain, pan) {
    const a = ((pan + 1) * Math.PI) / 4, gl = Math.cos(a) * gain, gr = Math.sin(a) * gain, n = L.length;
    for (let i = 0; i < g.length; i++) {
      const j = (at + i) % n;
      L[j] += g[i] * gl;
      Rr[j] += g[i] * gr;
    }
  }

  // ---------- grains ----------
  function tapGrain(sr) {
    const n = Math.floor(sr * R(0.012, 0.03)), g = new Float32Array(n);
    const dec = R(0.0012, 0.004) * sr;
    for (let i = 0; i < n; i++) g[i] = (rnd() * 2 - 1) * Math.exp(-i / dec);
    filt(g, biquad('bp', R(1800, 6500), R(3, 9), sr));
    const thud = R(0, 0.6), f = R(140, 420);
    for (let i = 0; i < n; i++) g[i] += thud * Math.sin((2 * Math.PI * f * i) / sr) * Math.exp(-i / (0.006 * sr)) * 0.3;
    return norm(g, 1);
  }
  function plinkGrain(sr) {
    const n = Math.floor(sr * 0.25), g = new Float32Array(n);
    const f0 = R(520, 1300), tau = R(0.035, 0.09) * sr;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, f = f0 * (1 + 0.7 * (1 - Math.exp(-t / 0.014)));
      ph += (2 * Math.PI * f) / sr;
      g[i] = Math.sin(ph) * Math.exp(-i / tau) * Math.min(1, i / (0.001 * sr));
    }
    for (let i = 0; i < 90; i++) g[i] += (rnd() * 2 - 1) * 0.3 * (1 - i / 90);
    return norm(g, 1);
  }
  function crackleGrain(sr, big) {
    const n = Math.floor(sr * (big ? 0.06 : 0.02)), g = new Float32Array(n);
    const dec = (big ? R(0.004, 0.012) : R(0.0008, 0.004)) * sr;
    for (let i = 0; i < n; i++) g[i] = (rnd() * 2 - 1) * Math.exp(-i / dec);
    filt(g, biquad('bp', R(1500, 7000), R(1.2, 5), sr));
    if (big) for (let i = 0; i < n; i++) g[i] += Math.sin((2 * Math.PI * 110 * i) / sr) * Math.exp(-i / (0.01 * sr)) * 0.6;
    return norm(g, 1);
  }
  function clackGrain(sr) {
    const n = Math.floor(sr * 0.16), g = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      ph += (2 * Math.PI * (95 - 40 * t * 8)) / sr;
      g[i] = Math.sin(ph) * Math.exp(-t / 0.05) * 0.9;
    }
    const nz = new Float32Array(n);
    for (let i = 0; i < n; i++) nz[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.012 * sr));
    filt(nz, biquad('bp', R(1800, 2800), 6, sr));
    const lo = new Float32Array(n);
    for (let i = 0; i < n; i++) lo[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.02 * sr));
    filt(lo, biquad('lp', 400, 0.7, sr));
    for (let i = 0; i < n; i++) g[i] += nz[i] * 0.35 + lo[i] * 0.8;
    return norm(g, 1);
  }
  function bellGrain(sr) {
    const n = Math.floor(sr * 1.2), g = new Float32Array(n);
    const P = [[1, 1, 0.9], [2.0, 0.35, 0.6], [2.76, 0.6, 0.45], [3.9, 0.22, 0.35], [5.4, 0.18, 0.22]], f0 = 930;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let s = 0;
      for (const [m, a, d] of P) s += a * Math.sin(2 * Math.PI * f0 * m * t) * Math.exp(-t / d);
      g[i] = s * Math.min(1, i / 40);
    }
    return norm(g, 1);
  }
  function tickGrain(sr, f) {
    const n = Math.floor(sr * 0.03), g = new Float32Array(n);
    for (let i = 0; i < n; i++) g[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.0015 * sr));
    filt(g, biquad('bp', f, 12, sr));
    return norm(g, 1);
  }

  // ---------- buffers ----------
  function noiseBuf(ctx, sec, color) {
    const sr = ctx.sampleRate, n = Math.floor(sec * sr), fade = Math.floor(0.08 * sr);
    const buf = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = new Float32Array(n + fade);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < n + fade; i++) {
        const w = rnd() * 2 - 1;
        if (color === 'white') d[i] = w * 0.5;
        else if (color === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        d[i] = d[i] * k + d[n + i] * (1 - k);
      }
      buf.getChannelData(ch).set(d.subarray(0, n));
    }
    return buf;
  }
  // dense textures pre-rendered into loops, so they keep going in a background tab
  function grainLoop(ctx, sec, rate, make, opts = {}) {
    const sr = ctx.sampleRate, n = Math.floor(sec * sr);
    const buf = ctx.createBuffer(2, n, sr), L = buf.getChannelData(0), Rr = buf.getChannelData(1);
    const pool = [];
    for (let i = 0; i < (opts.pool || 40); i++) pool.push(make(sr));
    const count = Math.floor(sec * rate);
    for (let i = 0; i < count; i++) {
      const g = pool[Math.floor(rnd() * pool.length)];
      const amp = opts.amp ? opts.amp() : Math.pow(rnd(), 2.2) * 0.9 + 0.1;
      place(L, Rr, g, Math.floor(rnd() * n), amp, opts.pan ? opts.pan() : R(-0.9, 0.9));
    }
    return buf;
  }
  function cricketLoop(ctx, f, period, pulses, prate, pan) {
    const sr = ctx.sampleRate, reps = Math.max(2, Math.round(2.6 / period)), n = Math.floor(period * reps * sr);
    const buf = ctx.createBuffer(2, n, sr), L = buf.getChannelData(0), Rr = buf.getChannelData(1);
    const a = ((pan + 1) * Math.PI) / 4, gl = Math.cos(a), gr = Math.sin(a);
    const plen = 0.55 / prate;
    for (let r = 0; r < reps; r++) {
      const amp = 0.75 + rnd() * 0.25, t0 = r * period;
      for (let p = 0; p < pulses; p++) {
        const s0 = Math.floor((t0 + p / prate) * sr), m = Math.floor(plen * sr);
        for (let i = 0; i < m; i++) {
          const env = Math.sin((Math.PI * i) / m) ** 2 * amp * (p === pulses - 1 ? 0.7 : 1);
          const v = Math.sin((2 * Math.PI * f * (s0 + i)) / sr) * env;
          const j = (s0 + i) % n;
          L[j] += v * gl;
          Rr[j] += v * gr;
        }
      }
    }
    return buf;
  }
  function trillLoop(ctx, f, rate, pan) {
    const sr = ctx.sampleRate, n = Math.floor(3 * sr);
    const buf = ctx.createBuffer(2, n, sr), L = buf.getChannelData(0), Rr = buf.getChannelData(1);
    const a = ((pan + 1) * Math.PI) / 4, gl = Math.cos(a), gr = Math.sin(a);
    const cyc = Math.round(rate * 3) / 3;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const am = Math.pow(Math.max(0, Math.sin(Math.PI * cyc * t)), 2.5);
      const v = Math.sin(2 * Math.PI * f * t) * am * (0.85 + 0.15 * Math.sin(2 * Math.PI * t / 3));
      L[i] = v * gl;
      Rr[i] = v * gr;
    }
    return buf;
  }
  function modLoop(ctx, sec, hz, power) {
    // a positive, wobbly control signal for rustling leaves and fire
    const sr = ctx.sampleRate, n = Math.floor(sec * sr), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    const kn = Math.floor(sec * hz) + 1, knots = [];
    for (let i = 0; i < kn; i++) knots.push(rnd());
    knots[kn - 1] = knots[0];
    for (let i = 0; i < n; i++) {
      const x = (i / n) * (kn - 1), k = Math.floor(x), f = x - k, u = f * f * (3 - 2 * f);
      d[i] = Math.pow(knots[k] + (knots[Math.min(k + 1, kn - 1)] - knots[k]) * u, power);
    }
    return buf;
  }
  function impulse(ctx, sec, tau) {
    const sr = ctx.sampleRate, n = Math.floor(sec * sr), buf = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, k = 0.65 - 0.55 * (t / sec);
        lp += ((rnd() * 2 - 1) - lp) * k;
        d[i] = lp * Math.exp(-t / tau) * Math.min(1, i / (0.01 * sr));
      }
    }
    return buf;
  }

  // ---------- engine ----------
  A.start = function (app) {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) { /* not supported */ }
    this.app = app;
    this.build(new AC({ latencyHint: 'playback' }));
    this.settings(app.S);
    W.bus.on('scene', (sc) => this.setScene(sc));
    W.bus.on('leaving', () => this.fadeScene());
    W.bus.on('thunder', (e) => this.thunder(e));
    W.bus.on('carpass', (e) => this.carPass(e));
    W.bus.on('wave', (e) => this.wave(e));
    W.bus.on('crossing', (e) => this.crossing(e));
    W.bus.on('tunnel', (e) => this.tunnel(e));
    this.setScene(app.scene);
    // sparse events are scheduled from a timer with a long look-ahead, so a hidden tab still sounds right
    this.timer = setInterval(() => this.schedule(), 250);
  };

  A.build = function (ctx) {
    this.ctx = ctx;
    const out = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.008; comp.release.value = 0.35;
    this.mute = ctx.createGain();
    out.connect(comp).connect(this.mute).connect(ctx.destination);
    this.out = out;
    this.win = ctx.createBiquadFilter();
    this.win.type = 'lowpass';
    this.win.Q.value = 0.4;
    this.winGain = ctx.createGain();
    this.win.connect(this.winGain).connect(out);
    this.verb = ctx.createConvolver();
    this.verb.buffer = impulse(ctx, 3.2, 0.7);
    this.verbIn = ctx.createGain();
    this.verbIn.connect(this.verb).connect(this.win);
    this.bus = {};
    for (const k of ['rain', 'wind', 'life', 'thunder']) {
      this.bus[k] = ctx.createGain();
      this.bus[k].connect(this.win);
    }
    this.bus.room = ctx.createGain();
    this.bus.room.connect(out);
    this.bus.glass = ctx.createGain();
    this.bus.glass.connect(out);
    const sr = ctx.sampleRate;
    this.buf = {
      white: noiseBuf(ctx, 6, 'white'),
      pink: noiseBuf(ctx, 7, 'pink'),
      brown: noiseBuf(ctx, 8, 'brown'),
      taps1: grainLoop(ctx, 9.7, 26, tapGrain),
      taps2: grainLoop(ctx, 11.3, 70, tapGrain),
      rustle: modLoop(ctx, 7.9, 22, 3),
      flick: modLoop(ctx, 9.1, 7, 2),
    };
    this.grains = {
      plink: Array.from({ length: 10 }, () => plinkGrain(sr)),
      crackle: Array.from({ length: 24 }, () => crackleGrain(sr, false)),
      pop: Array.from({ length: 6 }, () => crackleGrain(sr, true)),
      clack: Array.from({ length: 6 }, () => clackGrain(sr)),
      bell: [bellGrain(sr)],
      tick: [tickGrain(sr, 2900), tickGrain(sr, 2300)],
    };
    this.buildWeather();
  };

  A.monoBuffer = function (g) {
    const b = this.ctx.createBuffer(1, g.length, this.ctx.sampleRate);
    b.getChannelData(0).set(g);
    return b;
  };
  A.loopSrc = function (buf, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(this.ctx.currentTime, rnd() * buf.duration);
    return s;
  };
  A.filter = function (type, f, q = 0.7) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };
  A.gain = function (v = 0) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  };
  A.chain = function (...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  };
  A.ramp = function (param, v, tc = 0.4) {
    param.setTargetAtTime(v, this.ctx.currentTime, tc);
  };
  // fire a pre-rendered grain once
  A.grain = function (g, when, gain, pan, dest, rate = 1) {
    const ctx = this.ctx;
    const key = g;
    this._gb = this._gb || new Map();
    let b = this._gb.get(key);
    if (!b) {
      b = this.monoBuffer(g);
      this._gb.set(key, b);
    }
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    const gn = this.gain(gain);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    this.chain(s, gn, p, dest);
    s.start(when);
    s.onended = () => p.disconnect();
    return s;
  };

  // rain and wind are shared by every place and driven by the weather
  A.buildWeather = function () {
    const L = this.layers, b = this.buf;
    L.rainBed = this.gain();
    this.chain(this.loopSrc(b.pink), this.filter('highpass', 380), this.filter('lowpass', 7000), L.rainBed, this.bus.rain);
    L.rainLow = this.gain();
    this.chain(this.loopSrc(b.brown), this.filter('lowpass', 520), L.rainLow, this.bus.rain);
    L.taps1 = this.gain();
    this.chain(this.loopSrc(b.taps1), this.filter('highpass', 900), L.taps1, this.bus.glass);
    L.taps2 = this.gain();
    this.chain(this.loopSrc(b.taps2), this.filter('highpass', 700), L.taps2, this.bus.glass);
    L.windBP = this.filter('bandpass', 400, 0.55);
    L.wind = this.gain();
    this.chain(this.loopSrc(b.pink, 0.9), L.windBP, L.wind, this.bus.wind);
    L.windLow = this.gain();
    this.chain(this.loopSrc(b.brown, 0.8), this.filter('lowpass', 170), L.windLow, this.bus.wind);
    L.whistleBP = this.filter('bandpass', 900, 22);
    L.whistle = this.gain();
    this.chain(this.loopSrc(b.white), L.whistleBP, L.whistle, this.bus.wind);
    // leaves: high noise whose loudness is driven by a wobbling control signal
    L.leaves = this.gain();
    const mod = this.gain(0);
    this.loopSrc(b.rustle).connect(mod.gain);
    this.chain(this.loopSrc(b.white, 1.1), this.filter('highpass', 2200), this.filter('lowpass', 9000), mod, L.leaves, this.bus.wind);
    L.roomTone = this.gain();
    this.chain(this.loopSrc(b.brown, 0.6), this.filter('lowpass', 110), L.roomTone, this.bus.room);
    for (const k in L) L[k].gain && (L[k].gain.value = 0);
  };

  A.settings = function (S) {
    if (!this.ctx) return;
    const g = S.g;
    this.ramp(this.out.gain, g.volume * 0.9, 0.2);
    this.ramp(this.bus.rain.gain, g.vRain, 0.2);
    this.ramp(this.bus.glass.gain, g.vRain * 0.8, 0.2);
    this.ramp(this.bus.wind.gain, g.vWind, 0.2);
    this.ramp(this.bus.life.gain, g.vLife, 0.2);
    this.ramp(this.bus.room.gain, g.vRoom, 0.2);
    this.ramp(this.bus.thunder.gain, g.vThunder, 0.2);
    const sc = this.app && this.app.scene;
    this.open = g.open === 'open' || (g.open !== 'closed' && !!(sc && sc.look && sc.look.open));
    this.ramp(this.win.frequency, this.open ? 14000 : 5200, 0.5);
    this.ramp(this.winGain.gain, this.open ? 1.1 : 0.85, 0.5);
  };

  A.setMuted = function (m, slow) {
    this.muted = m;
    if (!this.ctx) return;
    this.ramp(this.mute.gain, m ? 0 : 1, slow ? 1.5 : 0.15);
  };
  A.suspend = function () {};

  // ---------- per-frame: weather follows the picture ----------
  A.update = function (dt, t, app) {
    const e = app.env, L = this.layers, sc = app.scene;
    const ctx = this.ctx;
    if (!ctx || !sc) return;
    const rain = sc.dry ? 0 : e.rain * (sc.rainSound != null ? sc.rainSound : 1);
    const gust = e.gust;
    const tc = 0.25;
    this.ramp(L.rainBed.gain, Math.pow(rain, 1.3) * 0.32, tc);
    this.ramp(L.rainLow.gain, Math.pow(rain, 2.2) * 0.5, tc);
    this.ramp(L.taps1.gain, W.smoothstep(0.02, 0.4, rain) * 0.5, tc);
    this.ramp(L.taps2.gain, W.smoothstep(0.35, 1, rain) * 0.42, tc);
    const wscale = sc.windSound != null ? sc.windSound : 1;
    this.ramp(L.wind.gain, (e.wind * 0.06 + gust * 0.32) * wscale, 0.3);
    this.ramp(L.windBP.frequency, 260 + gust * 520, 0.4);
    this.ramp(L.windLow.gain, gust * 0.5 * wscale, 0.4);
    this.ramp(L.whistle.gain, W.smoothstep(0.45, 0.95, gust) * 0.03 * (this.open ? 0.2 : 1) * wscale, 0.6);
    this.ramp(L.whistleBP.frequency, 760 + 260 * Math.sin(t * 0.13), 1);
    this.ramp(L.leaves.gain, (sc.leaves || 0) * (0.02 + gust * 0.42), 0.25);
    this.ramp(L.roomTone.gain, 0.05, 1);
    if (this.scape && this.scape.update) this.scape.update(dt, t, app);
  };

  // sparse events with a 2 s horizon
  A.schedule = function () {
    const ctx = this.ctx;
    if (!ctx || !this.scape || !this.scape.events) return;
    const now = ctx.currentTime, horizon = now + 2.2;
    for (const ev of this.scape.events) {
      if (ev.next == null) ev.next = now + ev.first();
      while (ev.next < horizon) {
        if (ev.next > now - 0.05) ev.fire(ev.next);
        ev.next += ev.gap();
      }
    }
  };

  A.fadeScene = function () {
    const s = this.scape;
    if (!s) return;
    this.ramp(s.out.gain, 0, 0.5);
    setTimeout(() => s.stop && s.stop(), 3000);
    this.scape = null;
  };

  A.setScene = function (sc) {
    if (!this.ctx || !sc) return;
    if (this.scape && this.scape.id === sc.id) return;
    this.settings(this.app.S);
    if (this.scape) this.fadeScene();
    const make = SCAPES[sc.audio];
    if (!make) return;
    const out = this.gain(0);
    out.connect(this.bus.life);
    const s = make(this, out);
    s.id = sc.id;
    s.out = out;
    this.scape = s;
    this.ramp(out.gain, 1, 1.2);
  };

  // ---------- events from the picture ----------
  A.thunder = function (e) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + e.delay * 0.9, dur = R(5, 9);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buf.brown;
    const lp = this.filter('lowpass', 900, 0.5);
    lp.frequency.setValueAtTime(900 - e.delay * 60, t0);
    lp.frequency.exponentialRampToValueAtTime(90, t0 + dur);
    const g = this.gain(0);
    const n = 64, curve = new Float32Array(n);
    const bumps = [[0, 1], [R(0.08, 0.2), R(0.5, 0.9)], [R(0.25, 0.45), R(0.3, 0.7)], [R(0.5, 0.7), R(0.2, 0.4)]];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      let v = 0;
      for (const [c, a] of bumps) v += a * Math.exp(-Math.pow((x - c) / 0.09, 2)) * (x < c ? 1 : Math.exp(-(x - c) * 3));
      curve[i] = v * e.power * (1.3 - e.delay * 0.08) * 0.9 * (1 - x);
    }
    g.gain.setValueCurveAtTime(curve, t0, dur);
    const pan = ctx.createStereoPanner();
    pan.pan.value = R(-0.6, 0.6);
    this.chain(src, lp, g, pan, this.bus.thunder);
    const send = this.gain(0.6);
    pan.connect(send).connect(this.verbIn);
    src.start(t0, rnd() * 4);
    src.stop(t0 + dur + 0.1);
    if (e.delay < 3.5) {
      const c = ctx.createBufferSource();
      c.buffer = this.buf.white;
      const hp = this.filter('highpass', 1200, 0.6);
      const cg = this.gain(0);
      cg.gain.setValueAtTime(0, t0 - 0.05);
      cg.gain.linearRampToValueAtTime(0.5 * e.power, t0);
      cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      this.chain(c, hp, cg, pan);
      c.start(t0 - 0.05);
      c.stop(t0 + 0.8);
    }
  };

  // a car on wet asphalt: the hiss swells, slides across, and fades
  A.carPass = function (e) {
    const ctx = this.ctx;
    if (!ctx || !this.scape || this.scape.id !== 'city') return;
    const t0 = ctx.currentTime, T = e.eta, len = T + R(2.5, 4);
    const src = ctx.createBufferSource();
    src.buffer = this.buf.white;
    const bp = this.filter('bandpass', 1400, 0.45);
    const lp = this.filter('lowpass', 1500, 0.5);
    lp.frequency.setValueAtTime(1200, t0);
    lp.frequency.linearRampToValueAtTime(5200 + e.wet * 2000, t0 + T);
    lp.frequency.linearRampToValueAtTime(1400, t0 + len);
    const g = this.gain(0);
    const peak = (0.05 + 0.1 * e.wet) * e.near;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + T);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.8 * e.dir, t0);
    pan.pan.linearRampToValueAtTime(0.85 * e.dir, t0 + len);
    this.chain(src, bp, lp, g, pan, this.scape.out);
    const eng = ctx.createBufferSource();
    eng.buffer = this.buf.brown;
    const el = this.filter('lowpass', 140, 0.8);
    const eg = this.gain(0);
    eg.gain.setValueAtTime(0.0001, t0);
    eg.gain.exponentialRampToValueAtTime(peak * (e.bus ? 4 : 1.6), t0 + T);
    eg.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    this.chain(eng, el, eg, pan);
    src.start(t0, rnd() * 4);
    src.stop(t0 + len + 0.1);
    eng.start(t0, rnd() * 4);
    eng.stop(t0 + len + 0.1);
  };

  // one breaking wave: it gathers, crashes, and fizzes back down the sand
  A.wave = function (e) {
    const ctx = this.ctx;
    if (!ctx || !this.scape || this.scape.id !== 'sea') return;
    const t0 = ctx.currentTime + Math.max(0, e.eta - 1.6), crash = t0 + 1.6, end = crash + R(4, 6.5);
    const s = ctx.createBufferSource();
    s.buffer = this.buf.pink;
    const lp = this.filter('lowpass', 300, 0.6);
    lp.frequency.setValueAtTime(260, t0);
    lp.frequency.exponentialRampToValueAtTime(2600 + e.size * 1800, crash);
    lp.frequency.exponentialRampToValueAtTime(500, end);
    const g = this.gain(0);
    const pk = 0.22 + e.size * 0.35;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(pk * 0.5, crash - 0.2);
    g.gain.exponentialRampToValueAtTime(pk, crash + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    const pan = ctx.createStereoPanner();
    pan.pan.value = R(-0.4, 0.4);
    this.chain(s, lp, g, pan, this.scape.out);
    const f = ctx.createBufferSource();
    f.buffer = this.buf.white;
    const hp = this.filter('highpass', 2600, 0.5);
    const fg = this.gain(0);
    fg.gain.setValueAtTime(0.0001, crash);
    fg.gain.exponentialRampToValueAtTime(0.07 + e.size * 0.08, crash + 0.6);
    fg.gain.exponentialRampToValueAtTime(0.0001, end + 1.5);
    this.chain(f, hp, fg, pan);
    s.start(t0, rnd() * 5);
    s.stop(end + 0.1);
    f.start(crash, rnd() * 4);
    f.stop(end + 1.6);
  };

  // level crossing: a bell that slides past with the doppler drop
  A.crossing = function (e) {
    const ctx = this.ctx;
    if (!ctx || !this.scape || this.scape.id !== 'train') return;
    const t0 = ctx.currentTime, len = e.duration;
    for (let k = 0; k * 0.48 < len; k++) {
      const tt = t0 + k * 0.48, x = (k * 0.48) / len;
      const near = Math.exp(-Math.pow((x - e.mid) / 0.22, 2));
      const rate = 1.06 - 0.12 / (1 + Math.exp(-(x - e.mid) * 14));
      this.grain(this.grains.bell[0], tt, 0.05 + near * 0.28, W.lerp(0.85, -0.85, x), this.scape.out, rate);
    }
  };
  A.tunnel = function (e) {
    if (!this.scape || !this.scape.tunnel) return;
    this.scape.tunnel(e.inside);
  };

  // ---------- places ----------
  const SCAPES = {
    city(a, out) {
      const hum = a.gain(0.0);
      a.chain(a.loopSrc(a.buf.brown, 0.7), a.filter('lowpass', 210), hum, out);
      const drip = { last: 0 };
      return {
        update(dt, t, app) {
          a.ramp(hum.gain, 0.08 + app.env.traffic * 0.22, 1);
        },
        events: [
          { // a gutter dripping into a puddle, almost regular
            first: () => R(0.5, 2),
            gap: () => (drip.period = drip.period && rnd() > 0.04 ? drip.period : R(0.45, 1.6)) * R(0.92, 1.08),
            fire: (t) => {
              const r = a.app.env.wet;
              if (r < 0.08) return;
              const g = a.grains.plink[Math.floor(rnd() * a.grains.plink.length)];
              a.grain(g, t, 0.05 + r * 0.1, -0.55, a.verbIn, R(0.95, 1.05));
              a.grain(g, t, 0.04 + r * 0.08, -0.55, a.bus.rain, R(0.95, 1.05));
            },
          },
        ],
        stop() { out.disconnect(); },
      };
    },

    forest(a, out) {
      const call = (t) => {
        const ctx = a.ctx, sp = Math.floor(rnd() * 4);
        const pan = R(-0.8, 0.8), dist = R(0.3, 1);
        const lp = a.filter('lowpass', 7000 - dist * 3500, 0.5);
        const pn = ctx.createStereoPanner();
        pn.pan.value = pan;
        const vol = a.gain(0.05 * (1.2 - dist) * (1 - a.app.env.gust * 0.7));
        a.chain(lp, vol, pn, out);
        pn.connect(a.gain(0.4)).connect(a.verbIn);
        const note = (t0, f0, f1, dur, amp, type = 'sine') => {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.setValueAtTime(f0, t0);
          o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
          const g = a.gain(0);
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(amp, t0 + Math.min(0.02, dur * 0.25));
          g.gain.setValueAtTime(amp, t0 + dur * 0.7);
          g.gain.linearRampToValueAtTime(0, t0 + dur);
          a.chain(o, g, lp);
          o.start(t0);
          o.stop(t0 + dur + 0.02);
        };
        let tt = t;
        if (sp === 0) { // two clear whistles, the second lower
          const f = R(3000, 4200);
          note(tt, f, f * 0.98, 0.32, 1);
          note(tt + 0.42, f * 0.84, f * 0.82, 0.38, 0.9);
        } else if (sp === 1) { // a trill
          const n = Math.floor(R(8, 16)), f = R(3500, 5200);
          for (let i = 0; i < n; i++) note(tt + i * 0.055, f * (1 - i * 0.012), f * 0.9 * (1 - i * 0.012), 0.04, 0.7);
        } else if (sp === 2) { // a wandering phrase
          let f = R(2200, 3200);
          for (let i = 0; i < 5; i++) {
            const f1 = f * R(0.8, 1.3);
            note(tt, f, f1, R(0.08, 0.18), 0.8);
            tt += R(0.12, 0.24);
            f = f1;
          }
        } else { // a wood pigeon, far off
          const f = R(430, 520);
          [0, 0.5, 0.75, 1.4, 1.9].forEach((d, i) => note(t + d, f * (i === 2 ? 0.9 : 1), f * 0.95, i === 0 || i === 3 ? 0.42 : 0.22, 1.4));
        }
      };
      const creak = (t) => {
        const ctx = a.ctx;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        const f = R(70, 140);
        o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(f * R(1.1, 1.5), t + 0.9);
        const bp = a.filter('bandpass', R(500, 900), 6);
        const g = a.gain(0);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.012 * a.app.env.gust, t + 0.3);
        g.gain.linearRampToValueAtTime(0, t + 1.1);
        a.chain(o, bp, g, out);
        o.start(t);
        o.stop(t + 1.2);
      };
      return {
        events: [
          { first: () => R(2, 6), gap: () => R(4, 14) * (1 + a.app.env.gust * 2), fire: call },
          { first: () => R(5, 12), gap: () => R(6, 18), fire: (t) => a.app.env.gust > 0.3 && creak(t) },
        ],
        stop() { out.disconnect(); },
      };
    },

    snow(a, out) {
      // the fire behind you, and a clock
      const roar = a.gain(0);
      const mod = a.gain(0);
      a.loopSrc(a.buf.flick).connect(mod.gain);
      a.chain(a.loopSrc(a.buf.brown, 0.9), a.filter('lowpass', 320), mod, roar, a.bus.room);
      const hiss = a.gain(0.004);
      a.chain(a.loopSrc(a.buf.white), a.filter('highpass', 4500), hiss, a.bus.room);
      a.ramp(roar.gain, 0.6, 2);
      let burst = 0;
      return {
        events: [
          {
            first: () => 0.2,
            gap: () => (burst > 0 ? R(0.02, 0.09) : R(0.08, 0.7)),
            fire: (t) => {
              if (burst > 0) burst--;
              else if (rnd() < 0.08) burst = Math.floor(R(3, 9));
              const big = rnd() < 0.05;
              const g = big ? a.grains.pop : a.grains.crackle;
              a.grain(g[Math.floor(rnd() * g.length)], t, big ? 0.24 : R(0.025, 0.14), R(-0.35, 0.05), a.bus.room, R(0.8, 1.25));
            },
          },
          {
            first: () => 0.5,
            gap: () => 1,
            fire: (t) => {
              a.tickN = (a.tickN || 0) + 1;
              a.grain(a.grains.tick[a.tickN % 2], t, 0.022, 0.45, a.bus.room);
            },
          },
        ],
        stop() {
          a.ramp(roar.gain, 0, 0.6);
          a.ramp(hiss.gain, 0, 0.6);
          setTimeout(() => { roar.disconnect(); hiss.disconnect(); }, 3000);
          out.disconnect();
        },
      };
    },

    sea(a, out) {
      const surf = a.gain(0.0);
      a.chain(a.loopSrc(a.buf.pink, 0.7), a.filter('lowpass', 650), surf, out);
      const surf2 = a.gain(0.0);
      a.chain(a.loopSrc(a.buf.brown), a.filter('lowpass', 300), surf2, out);
      const gull = (t) => {
        const ctx = a.ctx;
        const pan = ctx.createStereoPanner();
        pan.pan.value = R(-0.9, 0.9);
        const lp = a.filter('lowpass', R(3500, 6000), 0.5);
        const vol = a.gain(R(0.012, 0.03));
        a.chain(lp, vol, pan, out);
        pan.connect(a.gain(0.5)).connect(a.verbIn);
        const n = Math.floor(R(1, 4));
        for (let i = 0; i < n; i++) {
          const t0 = t + i * R(0.4, 0.6);
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          const f = R(1100, 1500);
          o.frequency.setValueAtTime(f * 0.9, t0);
          o.frequency.linearRampToValueAtTime(f * 1.2, t0 + 0.08);
          o.frequency.exponentialRampToValueAtTime(f * 0.62, t0 + 0.42);
          const bp = a.filter('bandpass', 1900, 2.5);
          const g = a.gain(0);
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(1, t0 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
          a.chain(o, bp, g, lp);
          o.start(t0);
          o.stop(t0 + 0.5);
        }
      };
      return {
        update(dt, t, app) {
          a.ramp(surf.gain, 0.08 + app.env.waves * 0.1, 1);
          a.ramp(surf2.gain, 0.16 + app.env.waves * 0.22, 1);
        },
        events: [{ first: () => R(3, 9), gap: () => R(9, 30), fire: gull }],
        stop() { out.disconnect(); },
      };
    },

    meadow(a, out) {
      const nodes = [];
      for (let i = 0; i < 6; i++) {
        const b = cricketLoop(a.ctx, R(3900, 4900), R(0.32, 0.72), Math.floor(R(3, 6)), R(26, 40), R(-0.9, 0.9));
        const g = a.gain(R(0.08, 0.19));
        a.chain(a.loopSrc(b), a.filter('lowpass', 7000), g, out);
        nodes.push(g);
      }
      for (let i = 0; i < 2; i++) {
        const b = trillLoop(a.ctx, R(2700, 3400), R(38, 55), R(-0.7, 0.7));
        const g = a.gain(0.04);
        a.chain(a.loopSrc(b), g, out);
        nodes.push(g);
      }
      const owl = (t) => {
        const ctx = a.ctx, f = R(330, 400);
        const pan = ctx.createStereoPanner();
        pan.pan.value = R(-0.8, 0.8);
        const vol = a.gain(0.03);
        a.chain(vol, pan, out);
        pan.connect(a.gain(0.8)).connect(a.verbIn);
        const pat = rnd() < 0.5 ? [[0, 0.5], [0.85, 0.3], [1.25, 0.9]] : [[0, 0.7], [1.1, 0.7]];
        for (const [d, len] of pat) {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(f, t + d);
          o.frequency.linearRampToValueAtTime(f * 0.92, t + d + len);
          const g = a.gain(0);
          g.gain.setValueAtTime(0, t + d);
          g.gain.linearRampToValueAtTime(1, t + d + 0.12);
          g.gain.linearRampToValueAtTime(0, t + d + len);
          a.chain(o, a.filter('lowpass', 900), g, vol);
          o.start(t + d);
          o.stop(t + d + len + 0.05);
        }
      };
      const peeper = (t) => {
        const ctx = a.ctx, f = R(2500, 2900);
        const pan = ctx.createStereoPanner();
        pan.pan.value = R(-0.9, 0.9);
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(f * 1.15, t + 0.09);
        const g = a.gain(0);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.02, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.1);
        a.chain(o, g, pan, out);
        o.start(t);
        o.stop(t + 0.12);
      };
      return {
        events: [
          { first: () => R(8, 20), gap: () => R(25, 70), fire: owl },
          { first: () => R(0.2, 1), gap: () => R(0.25, 1.4), fire: peeper },
        ],
        stop() { out.disconnect(); },
      };
    },

    train(a, out) {
      const rumble = a.gain(0);
      a.chain(a.loopSrc(a.buf.brown), a.filter('lowpass', 190), rumble, a.bus.room);
      const body = a.gain(0);
      a.chain(a.loopSrc(a.buf.pink), a.filter('bandpass', 75, 3), body, a.bus.room);
      const air = a.gain(0);
      const airBP = a.filter('bandpass', 700, 0.6);
      a.chain(a.loopSrc(a.buf.pink, 1.1), airBP, air, out);
      const hum = a.ctx.createOscillator();
      hum.frequency.value = 100;
      const hg = a.gain(0.004);
      a.chain(hum, hg, a.bus.room);
      hum.start();
      let speed = 0, inTunnel = 0, nextClack = 0;
      const S = {
        update(dt, t, app) {
          speed = app.env.speedMs || 0;
          const k = speed / 33;
          a.ramp(rumble.gain, (0.08 + k * 0.26) * (1 + inTunnel * 1.2), 0.3);
          a.ramp(body.gain, (0.05 + k * 0.25) * (1 + inTunnel), 0.3);
          a.ramp(air.gain, k * 0.06 * (1 + inTunnel * 2.5), 0.3);
          a.ramp(airBP.frequency, 500 + k * 500 + inTunnel * 400, 0.5);
        },
        tunnel(inside) {
          inTunnel = inside ? 1 : 0;
          a.ramp(a.winGain.gain, inside ? 0.25 : (a.open ? 1.1 : 0.85), 0.25);
        },
        events: [
          {
            first: () => 0.3,
            gap: () => 0.1,
            fire: (t) => {
              // joints every 25 m of rail: two bogies, two axles each
              if (speed < 1) return;
              if (t < nextClack) return;
              const per = 25 / speed;
              const pat = [0, 2.6, 17.4, 20.0];
              for (const d of pat) {
                const tt = t + d / speed;
                const g = a.grains.clack[Math.floor(rnd() * a.grains.clack.length)];
                a.grain(g, tt, (0.1 + Math.min(speed / 33, 1) * 0.16) * R(0.75, 1), R(-0.15, 0.15), a.bus.room, R(0.9, 1.1));
              }
              nextClack = t + per;
            },
          },
        ],
        stop() {
          [rumble, body, air, hg].forEach((g) => a.ramp(g.gain, 0, 0.5));
          setTimeout(() => { try { hum.stop(); } catch (e) { /* stopped */ } rumble.disconnect(); body.disconnect(); hg.disconnect(); }, 3000);
          a.ramp(a.winGain.gain, a.open ? 1.1 : 0.85, 0.3);
          out.disconnect();
        },
      };
      return S;
    },
  };
  A.SCAPES = SCAPES;
})();

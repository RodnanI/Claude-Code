/* ============================================================
   audio.js : every sound is synthesised, nothing is sampled.
   SFX bus + music bus + shared convolution "parlor" reverb.
   Music: generative lounge jazz (play/shop) and a fever loop.
   ============================================================ */
const Sound = (() => {
  let ac = null, master, comp, sfxBus, musBus, rev, noiseBuf, scratchSrc = null, scratchGain = null;
  const vol = { sfx: 0.8, music: 0.5 };
  let lastPin = 0, lastTick = 0, lastCoin = 0;
  const PENTA = [0, 2, 4, 7, 9];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const ok = () => ac && ac.state === 'running';
  const now = () => ac.currentTime;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.18;
    master = ac.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = vol.music * 0.5; musBus.connect(master);
    rev = ac.createConvolver(); rev.buffer = makeIR(2.4, 2.8);
    const ro = ac.createGain(); ro.gain.value = 0.32; rev.connect(ro); ro.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(tickMusic, 25);
    if (M.want) applyMode();
  }
  function makeIR(dur, decay) {
    const len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 90 ? i / 90 : 1);
    }
    return b;
  }
  function env(g, t, a, dur, v) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function out(node, o) {
    let n = node;
    if (o.pan) { const p = ac.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); n.connect(p); n = p; }
    n.connect(o.dest || sfxBus);
    if (o.rev) { const s = ac.createGain(); s.gain.value = o.rev; n.connect(s); s.connect(rev); }
  }
  function tone(type, f, t, dur, v, o = {}) {
    const osc = ac.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.glide || dur));
    if (o.det) osc.detune.value = o.det;
    const g = ac.createGain(); env(g, t, o.a || 0.003, dur, v);
    let n = osc;
    if (o.filter) { const fl = ac.createBiquadFilter(); fl.type = o.filter; fl.frequency.value = o.ff || 1000; fl.Q.value = o.q || 1; osc.connect(fl); n = fl; }
    n.connect(g); out(g, o);
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }
  function nz(t, dur, v, o = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q == null ? 1 : o.q;
    const g = ac.createGain(); env(g, t, o.a || 0.002, dur, v);
    s.connect(f); f.connect(g); out(g, o);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function brass(t, f, dur, v, dest) {
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.5;
    fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(3800, t + 0.06); fl.frequency.exponentialRampToValueAtTime(1100, t + dur);
    const g = ac.createGain(); env(g, t, 0.012, dur, v);
    [1, 1.006, 0.497].forEach((r, i) => { const o = ac.createOscillator(); o.type = i === 2 ? 'square' : 'sawtooth'; o.frequency.value = f * r; o.connect(fl); o.start(t); o.stop(t + dur + 0.1); });
    fl.connect(g); out(g, { dest: dest || sfxBus, rev: 0.3 });
  }
  function bellT(t, f, v, pan, dest) {
    [1, 2.76, 5.4, 8.93].forEach((r, i) => tone('sine', f * r, t, 1.4 / (i + 1), v / (i * 1.4 + 1), { pan, rev: 0.4, dest }));
  }
  function coinT(t, pan = 0, v = 1) {
    tone('sine', 2093, t, 0.09, 0.07 * v, { pan });
    tone('sine', 2794, t + 0.055, 0.35, 0.075 * v, { pan, rev: 0.25 });
    tone('sine', 4186, t + 0.055, 0.2, 0.025 * v, { pan });
  }
  function zapT(t, pan) {
    for (let i = 0; i < 7; i++) tone('sawtooth', 300 + Math.random() * 2400, t + i * 0.016, 0.03, 0.045, { pan, filter: 'bandpass', ff: 2600, q: 2 });
    nz(t, 0.18, 0.1, { f: 4200, q: 1.5, pan });
  }
  function duck(sec) {
    if (!musBus) return;
    const t = now(), g = musBus.gain, base = vol.music * 0.5;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(base * 0.25, t + 0.08); g.setValueAtTime(base * 0.25, t + sec); g.linearRampToValueAtTime(base, t + sec + 0.8);
  }

  /* ---------------- SFX catalogue ---------------- */
  const S = {
    init, mtof,
    get ready() { return ok(); },
    setVol(k, v) {
      vol[k] = v;
      if (!ac) return;
      if (k === 'sfx') sfxBus.gain.value = v;
      if (k === 'music') musBus.gain.value = v * 0.5;
    },
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state === 'suspended') ac.resume(); },
    pin(n, kind = 'basic', pan = 0) {
      if (!ok()) return;
      const t = now();
      if (t - lastPin < 0.013) return;
      lastPin = t;
      const st = Math.min(n, 17), m = 62 + Math.floor(st / 5) * 12 + PENTA[st % 5], f = mtof(m);
      switch (kind) {
        case 'ruby': tone('triangle', f * 2, t, 0.42, 0.085, { pan, rev: 0.35 }); tone('sine', f * 4.02, t, 0.18, 0.035, { pan }); break;
        case 'gold': coinT(t, pan, 1); break;
        case 'bumper': tone('sine', 560, t, 0.17, 0.2, { f2: 150, pan }); tone('square', 280, t, 0.06, 0.035, { f2: 90, pan, filter: 'lowpass', ff: 1400 }); nz(t, 0.05, 0.1, { f: 900, q: 0.8, pan }); break;
        case 'clover': [0, 4, 7].forEach((d, i) => tone('sine', mtof(m + 12 + d), t + i * 0.035, 0.24, 0.06, { pan, rev: 0.3 })); break;
        case 'bell': bellT(t, f, 0.09, pan); break;
        case 'dice': for (let i = 0; i < 4; i++) nz(t + i * 0.032 + Math.random() * 0.012, 0.025, 0.09, { f: 2400 + Math.random() * 1600, q: 3, pan }); break;
        case 'prism': [0, 7, 12, 19].forEach((d, i) => tone('triangle', mtof(m + 12 + d), t + i * 0.028, 0.34, 0.045, { pan, rev: 0.45 })); break;
        case 'magnet': tone('sawtooth', 98, t, 0.2, 0.05, { filter: 'lowpass', ff: 650, pan }); tone('sine', f, t, 0.22, 0.08, { pan }); break;
        case 'split': tone('sine', 420, t, 0.2, 0.09, { f2: 1500, pan }); tone('sine', 640, t + 0.04, 0.2, 0.05, { f2: 2000, pan }); break;
        case 'warp': tone('sine', 900, t, 0.42, 0.09, { f2: 150, pan, rev: 0.4 }); tone('triangle', 260, t + 0.22, 0.36, 0.06, { f2: 1300, pan, rev: 0.4 }); break;
        case 'seven': [0, 4, 7, 12].forEach((d, i) => tone('square', mtof(72 + d), t + i * 0.05, 0.12, 0.035, { pan, filter: 'lowpass', ff: 3000 })); break;
        case 'rod': zapT(t, pan); break;
        case 'gamble': tone('sine', 1320, t, 0.55, 0.05, { pan, rev: 0.3 }); tone('sine', 1327, t, 0.55, 0.05, { pan }); break;
        case 'echo': for (let i = 0; i < 3; i++) tone('sine', f, t + i * 0.09, 0.16, 0.07 * (1 - i * 0.3), { pan, rev: 0.3 }); break;
        case 'sprout': tone('sine', f, t, 0.22, 0.09, { f2: f * 1.5, pan }); tone('sine', f * 2, t + 0.03, 0.12, 0.03, { pan }); break;
        case 'copper': tone('sine', f, t, 0.3, 0.11, { pan, rev: 0.15 }); tone('sine', f * 2.76, t, 0.09, 0.045, { pan }); tone('sine', f * 1.5, t, 0.16, 0.035, { pan }); break;
        case 'bomb': break;
        default:
          tone('sine', f, t, 0.27, 0.1, { pan, rev: 0.15 }); tone('sine', f * 2.76, t, 0.07, 0.035, { pan }); nz(t, 0.018, 0.045, { f: 7000, q: 0.7, pan });
      }
    },
    hot(golden) {
      if (!ok()) return; const t = now();
      nz(t, 0.35, 0.09, { type: 'highpass', f: 4500, q: 0.5 });
      tone('sine', 1760, t, 0.45, 0.08, { rev: 0.45 }); tone('sine', 2637, t + 0.06, 0.45, 0.05, { rev: 0.45 });
      if (golden) [0, 4, 7, 12, 16].forEach((d, i) => tone('triangle', mtof(84 + d), t + 0.1 + i * 0.05, 0.4, 0.04, { rev: 0.5 }));
    },
    boom(big = 1) {
      if (!ok()) return; const t = now();
      nz(t, 0.75 * big, 0.45, { type: 'lowpass', f: 2200, f2: 50, q: 0.7 });
      tone('sine', 130, t, 0.55, 0.45, { f2: 32 });
      nz(t, 0.1, 0.25, { f: 3200, q: 0.5 });
    },
    coin(pan = 0) { if (!ok()) return; const t = now(); if (t - lastCoin < 0.03) return; lastCoin = t; coinT(t, pan, 0.9); },
    drop() { if (!ok()) return; const t = now(); tone('sine', 520, t, 0.07, 0.07, { f2: 220 }); nz(t, 0.03, 0.06, { f: 2600, q: 1.5 }); },
    wall(pan) { if (!ok()) return; const t = now(); if (t - lastTick < 0.02) return; lastTick = t; tone('sine', 240, t, 0.05, 0.035, { pan }); },
    land(level, pan = 0) {
      if (!ok()) return; const t = now();
      tone('sine', 170, t, 0.2, 0.22, { f2: 55, pan }); nz(t, 0.05, 0.1, { f: 520, q: 1, pan });
      const base = 60 + Math.round(clamp(level, 0, 1) * 12);
      [0, 4, 7, 12].forEach((d, i) => tone('triangle', mtof(base + d), t + 0.04 + i * 0.032, 0.5, 0.04 + level * 0.035, { pan, rev: 0.35 }));
    },
    tick() { if (!ok()) return; const t = now(); if (t - lastTick < 0.03) return; lastTick = t; tone('square', 1900, t, 0.018, 0.012, { filter: 'lowpass', ff: 4200 }); },
    hover() { if (!ok()) return; tone('sine', 2500, now(), 0.03, 0.018); },
    click() { if (!ok()) return; const t = now(); tone('sine', 880, t, 0.06, 0.07, { f2: 560 }); nz(t, 0.02, 0.04, { f: 3000 }); },
    deny() { if (!ok()) return; const t = now(); tone('square', 160, t, 0.12, 0.05, { filter: 'lowpass', ff: 900 }); tone('square', 120, t + 0.1, 0.16, 0.05, { filter: 'lowpass', ff: 900 }); },
    buy() {
      if (!ok()) return; const t = now();
      nz(t, 0.06, 0.13, { f: 1300, q: 0.6 }); tone('square', 180, t, 0.05, 0.05, { filter: 'lowpass', ff: 800 });
      tone('sine', 2093, t + 0.08, 0.55, 0.08, { rev: 0.4 }); tone('sine', 2637, t + 0.08, 0.55, 0.06, { rev: 0.4 }); tone('sine', 3136, t + 0.15, 0.7, 0.05, { rev: 0.45 });
    },
    sell() { if (!ok()) return; const t = now(); [3136, 2637, 2093].forEach((f, i) => tone('sine', f, t + i * 0.06, 0.3, 0.05, { rev: 0.3 })); },
    reroll() { if (!ok()) return; const t = now(); for (let i = 0; i < 6; i++) nz(t + i * 0.042, 0.04, 0.09, { f: 1400 + i * 320, q: 1.2 }); },
    reelStart() { if (!ok()) return; const t = now(); tone('sawtooth', 60, t, 0.45, 0.06, { f2: 150, filter: 'lowpass', ff: 600 }); nz(t, 0.2, 0.05, { f: 900 }); },
    reelTick() { if (!ok()) return; const t = now(); nz(t, 0.012, 0.04, { f: 3600, q: 4 }); },
    reelStop(i) { if (!ok()) return; const t = now(); tone('sine', 240 - i * 25, t, 0.13, 0.2, { f2: 90 }); nz(t, 0.04, 0.12, { f: 1300, q: 1 }); },
    reach(tier) {
      if (!ok()) return; const t = now();
      tone('sawtooth', 180, t, 1.3, 0.05, { f2: 700 + tier * 250, filter: 'lowpass', ff: 1600 });
      for (let i = 0; i < 26; i++) nz(t + i * 0.045, 0.04, 0.03 + i * 0.003, { f: 1700, q: 0.6 });
      if (tier >= 2) brass(t + 0.05, mtof(55 + tier * 2), 0.9, 0.05);
      duck(2.5);
    },
    heartbeat() { if (!ok()) return; const t = now(); tone('sine', 64, t, 0.16, 0.45, { f2: 40 }); tone('sine', 58, t + 0.2, 0.16, 0.35, { f2: 38 }); },
    omen() { if (!ok()) return; const t = now(); bellT(t, 523, 0.12); bellT(t + 0.12, 784, 0.1); nz(t, 0.8, 0.05, { type: 'highpass', f: 6000 }); },
    miss() { if (!ok()) return; const t = now(); tone('triangle', 330, t, 0.25, 0.07, { f2: 220 }); tone('triangle', 247, t + 0.18, 0.35, 0.07, { f2: 160 }); },
    jackpot(big) {
      if (!ok()) return; const t = now();
      const seq = big ? [60, 64, 67, 72, 76, 79, 84] : [67, 72, 76, 79];
      seq.forEach((m, i) => brass(t + i * 0.07, mtof(m), 0.3, 0.06));
      const tc = t + seq.length * 0.07;
      [48, 60, 64, 67, 72].forEach(m => brass(tc, mtof(m), 1.3, 0.05));
      bellT(tc, mtof(84), 0.08);
      for (let i = 0; i < (big ? 26 : 10); i++) coinT(tc + Math.random() * 1.3, rand(-0.8, 0.8), 0.55);
      duck(big ? 3 : 1.6);
    },
    fever() {
      if (!ok()) return; const t = now();
      nz(t, 1.1, 0.18, { type: 'highpass', f: 400, f2: 9000, q: 0.5 });
      [36, 48, 55, 60, 64, 67, 72].forEach(m => brass(t + 0.9, mtof(m), 1.6, 0.05));
      bellT(t + 0.9, 220, 0.2);
      duck(2);
    },
    quota() {
      if (!ok()) return; const t = now();
      [60, 64, 67, 72, 76].forEach((m, i) => tone('triangle', mtof(m), t + i * 0.07, 0.4, 0.08, { rev: 0.4 }));
      [60, 64, 67, 72].forEach(m => brass(t + 0.38, mtof(m), 1.4, 0.045));
      bellT(t + 0.38, mtof(84), 0.07);
      duck(2);
    },
    fail() {
      if (!ok()) return; const t = now();
      [55, 54, 53, 52].forEach((m, i) => {
        const d = i === 3 ? 1.3 : 0.32, tt = t + i * 0.36;
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
        if (i === 3) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = 5; l.connect(lg); lg.connect(o.frequency); l.start(tt); l.stop(tt + d + 0.1); }
        const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; fl.Q.value = 3;
        const g = ac.createGain(); env(g, tt, 0.03, d, 0.09);
        o.connect(fl); fl.connect(g); out(g, { rev: 0.3 }); o.start(tt); o.stop(tt + d + 0.1);
      });
      duck(3);
    },
    stamp() { if (!ok()) return; const t = now(); tone('sine', 95, t, 0.28, 0.42, { f2: 38 }); nz(t, 0.09, 0.28, { f: 760, q: 0.5 }); },
    print() { if (!ok()) return; const t = now(); for (let i = 0; i < 3; i++) nz(t + i * 0.03, 0.02, 0.06, { f: 2600, q: 2 }); },
    whoosh() { if (!ok()) return; nz(now(), 0.32, 0.1, { f: 380, f2: 3200, q: 0.8 }); },
    nudge() {
      if (!ok()) return; const t = now();
      tone('sine', 82, t, 0.22, 0.38, { f2: 44 }); nz(t, 0.14, 0.18, { f: 620, q: 0.7 });
      for (let i = 0; i < 5; i++) nz(t + 0.03 + i * 0.025, 0.015, 0.05, { f: 3800, q: 3 });
    },
    tilt() { if (!ok()) return; const t = now(); tone('square', 110, t, 0.7, 0.07, { filter: 'lowpass', ff: 900 }); tone('square', 116, t, 0.7, 0.06, { filter: 'lowpass', ff: 900 }); },
    heat() { if (!ok()) return; const t = now(); tone('sawtooth', 280, t, 0.6, 0.05, { f2: 1300, filter: 'lowpass', ff: 2200 }); nz(t, 0.5, 0.06, { type: 'highpass', f: 3000, f2: 9000 }); },
    unlock() { if (!ok()) return; const t = now(); [72, 76, 79, 83, 86, 91].forEach((m, i) => tone('sine', mtof(m), t + i * 0.07, 0.7, 0.06, { rev: 0.6 })); },
    ach() { if (!ok()) return; const t = now(); bellT(t, mtof(79), 0.07); bellT(t + 0.13, mtof(86), 0.07); },
    flipSpin() { if (!ok()) return; const t = now(); for (let i = 0; i < 14; i++) tone('sine', 1500 + i * 60, t + i * 0.07, 0.05, 0.025, { rev: 0.2 }); },
    crank() { if (!ok()) return; const t = now(); for (let i = 0; i < 4; i++) { nz(t + i * 0.11, 0.025, 0.12, { f: 1800, q: 3 }); tone('square', 300, t + i * 0.11, 0.02, 0.03, { filter: 'lowpass', ff: 1200 }); } },
    clunk() { if (!ok()) return; const t = now(); tone('sine', 620, t, 0.12, 0.14, { f2: 300 }); nz(t, 0.05, 0.12, { f: 1500, q: 1 }); },
    pop() { if (!ok()) return; const t = now(); tone('sine', 950, t, 0.12, 0.16, { f2: 190 }); nz(t, 0.04, 0.12, { f: 2400 }); },
    sparkle() { if (!ok()) return; const t = now(); for (let i = 0; i < 6; i++) tone('sine', 2000 + Math.random() * 3000, t + i * 0.05, 0.25, 0.025, { rev: 0.5 }); },
    rarity(r) {
      if (!ok()) return; const t = now();
      const sets = [[72, 76], [72, 76, 79], [72, 76, 79, 84], [72, 76, 79, 84, 88, 91]];
      sets[clamp(r, 0, 3)].forEach((m, i) => tone('triangle', mtof(m), t + i * 0.06, 0.5, 0.06, { rev: 0.5 }));
      if (r >= 3) [48, 55, 60, 64].forEach(m => brass(t + 0.3, mtof(m), 1.2, 0.04));
    },
    scratchOn() {
      if (!ok() || scratchSrc) return;
      scratchSrc = ac.createBufferSource(); scratchSrc.buffer = noiseBuf; scratchSrc.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.9;
      scratchGain = ac.createGain(); scratchGain.gain.value = 0;
      scratchSrc.connect(f); f.connect(scratchGain); scratchGain.connect(sfxBus); scratchSrc.start();
    },
    scratchSet(v) { if (scratchGain) scratchGain.gain.setTargetAtTime(clamp(v, 0, 1) * 0.16, now(), 0.02); },
    scratchOff() { if (scratchSrc) { try { scratchSrc.stop(); } catch (e) { /* already stopped */ } scratchSrc = null; scratchGain = null; } },
    music(mode, immediate) { M.want = mode; if (!ac) return; if (immediate || !M.mode || M.mode === 'off') applyMode(); },
  };

  /* ---------------- MUSIC ---------------- */
  const M = { mode: null, want: null, bar: 0, step: 0, next: 0, bpm: 96 };
  // lounge: ii-V-I-vi in C, then IV-III7-vi-VI7 back to ii
  const LCH = [
    { b: 38, t: [0, 3, 7, 10], v: [53, 57, 60, 64], s: [62, 65, 69, 72, 76] },
    { b: 43, t: [0, 4, 7, 10], v: [53, 59, 64, 57], s: [67, 71, 74, 76] },
    { b: 36, t: [0, 4, 7, 11], v: [52, 55, 59, 62], s: [64, 67, 71, 72, 74] },
    { b: 45, t: [0, 3, 7, 10], v: [55, 59, 60, 64], s: [69, 72, 76, 79] },
    { b: 41, t: [0, 4, 7, 11], v: [57, 60, 64, 67], s: [65, 69, 72, 76] },
    { b: 40, t: [0, 4, 7, 10], v: [56, 59, 62, 65], s: [64, 68, 71, 74] },
    { b: 45, t: [0, 3, 7, 10], v: [55, 59, 60, 64], s: [69, 72, 76] },
    { b: 45, t: [0, 4, 7, 10], v: [55, 58, 61, 65], s: [69, 73, 76] },
  ];
  const FCH = [{ r: 48, v: [60, 64, 67, 71] }, { r: 45, v: [60, 64, 67, 69] }, { r: 41, v: [60, 65, 69, 72] }, { r: 43, v: [62, 67, 71, 74] }];
  const HOOK = [
    [72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 79, 0],
    [81, 0, 0, 79, 0, 76, 0, 72, 74, 0, 76, 0, 0, 0, 0, 0],
    [77, 0, 81, 0, 84, 0, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0],
    [79, 0, 79, 0, 81, 0, 83, 0, 86, 0, 0, 0, 84, 0, 83, 0],
  ];
  function applyMode() { M.mode = M.want; M.bpm = M.mode === 'fever' ? 132 : M.mode === 'shop' ? 86 : 96; M.step = 0; M.bar = 0; M.next = ac.currentTime + 0.06; }
  function tickMusic() {
    if (!ac || ac.state !== 'running') return;
    if (!M.mode || M.mode === 'off') { if (M.want && M.want !== M.mode) applyMode(); return; }
    const s16 = 60 / M.bpm / 4;
    if (M.next < ac.currentTime - 0.5) M.next = ac.currentTime + 0.05;
    let guard = 0;
    while (M.next < ac.currentTime + 0.2 && guard++ < 32) {
      if (M.step === 0 && M.want !== M.mode) { applyMode(); if (M.mode === 'off') return; }
      if (vol.music > 0.001) (M.mode === 'fever' ? fever : lounge)(M.bar, M.step, M.next, s16);
      M.next += s16; M.step++;
      if (M.step >= 16) { M.step = 0; M.bar++; }
    }
  }
  const mb = () => musBus;
  function mt(type, f, t, dur, v, o = {}) { o.dest = mb(); return tone(type, f, t, dur, v, o); }
  function mn(t, dur, v, o = {}) { o.dest = mb(); nz(t, dur, v, o); }
  function rhodes(t, f, dur, v) {
    const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    c.type = 'sine'; m.type = 'sine'; c.frequency.value = f; m.frequency.value = f;
    mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.45);
    m.connect(mg); mg.connect(c.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    c.connect(g); out(g, { dest: mb(), rev: 0.28 });
    c.start(t); m.start(t); c.stop(t + dur + 0.4); m.stop(t + dur + 0.4);
  }
  function chord(t, notes, dur, v) { notes.forEach((n, i) => rhodes(t + i * 0.007, mtof(n), dur, v)); }
  function bass(t, f, dur, v) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.value = 650;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(v * 0.45, t + 0.16); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(mb());
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function lounge(bar, st, t, s16) {
    const ch = LCH[bar % 8], sw = st % 4 === 2 ? s16 * 0.42 : 0, tt = t + sw, shop = M.mode === 'shop';
    if (st % 4 === 0) mn(t, 0.32, 0.028, { type: 'highpass', f: 7000, q: 0.4 });
    if (st === 6 || st === 14) mn(tt, 0.18, 0.018, { type: 'highpass', f: 7500, q: 0.4 });
    if (st === 4 || st === 12) { mn(t, 0.04, 0.018, { type: 'highpass', f: 8000 }); mn(t, 0.18, 0.03, { f: 2100, q: 0.7, a: 0.012 }); }
    if (!shop && st === 0) mt('sine', 92, t, 0.15, 0.1, { f2: 46 });
    if (!shop && st === 8 && Math.random() < 0.45) mt('sine', 92, t, 0.15, 0.06, { f2: 46 });
    if (st % 4 === 0) {
      const beat = st / 4, nb = LCH[(bar + 1) % 8].b;
      let n;
      if (beat === 0) n = ch.b;
      else if (beat === 3) n = nb + (Math.random() < 0.5 ? 1 : -1);
      else n = ch.b + ch.t[1 + Math.floor(Math.random() * 3)];
      if (n > 52) n -= 12;
      bass(t, mtof(n), s16 * 3.7, 0.15);
    }
    if (st === 0 && Math.random() < 0.85) chord(t + 0.01, ch.v, s16 * 5, 0.04);
    if (st === 6 && Math.random() < 0.55) chord(tt, ch.v, s16 * 2.5, 0.03);
    if (st === 10 && Math.random() < 0.2) chord(t, ch.v, s16 * 2, 0.025);
    if ((st === 2 || st === 8 || st === 14 || st === 4) && Math.random() < (shop ? 0.3 : 0.18)) {
      const f = mtof(pickR(ch.s));
      mt('sine', f, tt, 1.1, 0.03, { rev: 0.5 }); mt('sine', f * 4, tt, 0.25, 0.008);
    }
  }
  function fever(bar, st, t, s16) {
    const ch = FCH[bar % 4];
    if (st % 4 === 0) { mt('sine', 150, t, 0.17, 0.3, { f2: 44 }); mn(t, 0.012, 0.06, { f: 3000 }); }
    if (st === 4 || st === 12) for (let i = 0; i < 3; i++) mn(t + i * 0.011, 0.09, 0.07, { f: 1500, q: 0.8 });
    mn(t, st % 4 === 2 ? 0.12 : 0.035, st % 4 === 2 ? 0.03 : 0.016, { type: 'highpass', f: 8000 });
    if (st % 2 === 0) {
      const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(ch.r - 12 + (st % 4 === 2 ? 12 : 0));
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(1400, t); fl.frequency.exponentialRampToValueAtTime(260, t + s16 * 1.6); fl.Q.value = 4;
      env(g, t, 0.004, s16 * 1.8, 0.09); o.connect(fl); fl.connect(g); g.connect(mb()); o.start(t); o.stop(t + s16 * 2);
    }
    const an = ch.v[st % 4] + 12 * ((st >> 2) % 2);
    mt('square', mtof(an), t, s16 * 0.8, 0.014, { filter: 'lowpass', ff: 2600 });
    const h = HOOK[bar % 4][st];
    if (h) { mt('square', mtof(h), t, s16 * 1.7, 0.032, { filter: 'lowpass', ff: 3600, rev: 0.2 }); mt('triangle', mtof(h + 12), t, s16 * 1.2, 0.012); }
    if (st === 0 || st === 10) ch.v.forEach(n => mt('sawtooth', mtof(n), t, 0.2, 0.012, { filter: 'lowpass', ff: 2200 }));
  }
  return S;
})();

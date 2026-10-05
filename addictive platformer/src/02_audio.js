// SQUEAKBORNE :: audio
// Everything is synthesized with WebAudio: sound effects and a tiny chiptune tracker.

const AudioSys = {
  ctx: null, master: null, comp: null, sfxBus: null, musBus: null, musFilter: null, noiseBuf: null,
  delay: null, delayIn: null, waves: {}, last: {}, loops: [],
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(c.destination);
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.ratio.value = 4; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
      this.comp.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.comp);
      this.musFilter = c.createBiquadFilter(); this.musFilter.type = 'lowpass'; this.musFilter.frequency.value = 19000;
      this.musBus = c.createGain(); this.musBus.connect(this.musFilter); this.musFilter.connect(this.comp);
      this.delay = c.createDelay(1); this.delay.delayTime.value = 0.26;
      const fb = c.createGain(); fb.gain.value = 0.3;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.musBus);
      this.delayIn = c.createGain(); this.delayIn.gain.value = 0.32; this.delayIn.connect(this.delay);
      const len = c.sampleRate * 1.5;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.waves.p25 = this.pulse(0.25);
      this.waves.p12 = this.pulse(0.125);
      this.applyVolumes();
      Music.next = c.currentTime + 0.1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  pulse(duty) {
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      re[i] = sin(TAU * i * duty) / (PI * i);
      im[i] = (1 - cos(TAU * i * duty)) / (PI * i);
    }
    return this.ctx.createPeriodicWave(re, im);
  },
  applyVolumes() {
    if (!this.ctx) return;
    const s = Save.data.settings;
    this.sfxBus.gain.value = s.sfx;
    this.musBus.gain.value = s.music * 0.75;
  },
  muffle(on) {
    if (!this.ctx) return;
    this.musFilter.frequency.setTargetAtTime(on ? 700 : 19000, this.ctx.currentTime, 0.08);
  },
};

function _dest(pan) {
  const a = AudioSys;
  if (pan && a.ctx.createStereoPanner) {
    const p = a.ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    p.connect(a.sfxBus);
    return p;
  }
  return a.sfxBus;
}
// tone({w: wave, f: freq, f1: end freq, d: duration, v: volume, t: delay, vib: depth Hz, vibf: rate, lp: lowpass, pan})
function tone(o) {
  const a = AudioSys, c = a.ctx;
  if (!c) return;
  const t = c.currentTime + (o.t || 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  if (o.w === 'p25' || o.w === 'p12') osc.setPeriodicWave(a.waves[o.w]);
  else osc.type = o.w || 'square';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(max(20, o.f1), t + o.d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.v, t + (o.a || 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
  let node = osc;
  if (o.vib) {
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = o.vibf || 12; lg.gain.value = o.vib;
    l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.d + 0.05);
  }
  if (o.lp) {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp;
    osc.connect(f); node = f;
  }
  node.connect(g);
  g.connect(_dest(o.pan));
  osc.start(t);
  osc.stop(t + o.d + 0.05);
}
// noise({d, v, f: filter freq, f1, type, q, t, pan})
function noise(o) {
  const a = AudioSys, c = a.ctx;
  if (!c) return;
  const t = c.currentTime + (o.t || 0);
  const src = c.createBufferSource();
  src.buffer = a.noiseBuf;
  const f = c.createBiquadFilter();
  f.type = o.type || 'lowpass';
  f.frequency.setValueAtTime(o.f || 1000, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.d);
  f.Q.value = o.q || 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.v, t + (o.a || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
  src.connect(f); f.connect(g); g.connect(_dest(o.pan));
  src.start(t, Math.random() * 1.0);
  src.stop(t + o.d + 0.05);
}
const arp = (notes, step, o) => notes.forEach((f, i) => tone(Object.assign({ f, t: (o.t || 0) + i * step }, o, { t: (o.t || 0) + i * step })));

const SFX = {
  jump: (p) => tone({ w: 'p25', f: 380, f1: 760, d: 0.08, v: 0.09, pan: p }),
  djump: (p) => { tone({ w: 'p25', f: 560, f1: 1150, d: 0.09, v: 0.07, pan: p }); tone({ w: 'triangle', f: 280, f1: 560, d: 0.12, v: 0.12, pan: p }); },
  walljump: (p) => { tone({ w: 'p25', f: 500, f1: 900, d: 0.07, v: 0.08, pan: p }); noise({ d: 0.06, v: 0.1, f: 2000, pan: p }); },
  land: (p) => noise({ d: 0.07, v: 0.13, f: 450, pan: p }),
  step: (p) => noise({ d: 0.025, v: 0.035, f: 1800, pan: p }),
  roll: (p) => noise({ d: 0.2, v: 0.12, f: 1100, f1: 300, type: 'bandpass', q: 1.5, pan: p }),
  dash: (p) => { noise({ d: 0.16, v: 0.14, f: 3000, f1: 600, type: 'bandpass', q: 1, pan: p }); tone({ w: 'sine', f: 900, f1: 300, d: 0.12, v: 0.06, pan: p }); },
  swing: (p) => noise({ d: 0.1, v: 0.13, f: 3200 * rnd(0.9, 1.1), f1: 900, type: 'bandpass', q: 1.4, pan: p }),
  swing2: (p) => noise({ d: 0.12, v: 0.13, f: 2400, f1: 1200, type: 'bandpass', q: 1.8, pan: p }),
  heavy: (p) => noise({ d: 0.24, v: 0.18, f: 1400, f1: 250, type: 'bandpass', q: 1.1, pan: p }),
  thrust: (p) => noise({ d: 0.09, v: 0.13, f: 5000, f1: 2000, type: 'bandpass', q: 2, pan: p }),
  whip: (p) => { noise({ d: 0.12, v: 0.12, f: 1500, f1: 6000, type: 'bandpass', q: 3, pan: p }); noise({ d: 0.03, v: 0.18, f: 7000, type: 'highpass', t: 0.1, pan: p }); },
  hit: (p) => { noise({ d: 0.07, v: 0.22, f: 1600, pan: p }); tone({ w: 'sine', f: 190 * rnd(0.9, 1.1), f1: 55, d: 0.11, v: 0.28, pan: p }); },
  hit2: (p) => { noise({ d: 0.06, v: 0.18, f: 2400, pan: p }); tone({ w: 'triangle', f: 260, f1: 90, d: 0.08, v: 0.2, pan: p }); },
  crit: (p) => { noise({ d: 0.1, v: 0.26, f: 2600, pan: p }); tone({ w: 'sine', f: 160, f1: 40, d: 0.16, v: 0.34, pan: p }); tone({ w: 'p25', f: 1300, f1: 2600, d: 0.08, v: 0.06, pan: p }); },
  kill: (p) => { tone({ w: 'p25', f: 260, f1: 900, d: 0.09, v: 0.08, pan: p }); noise({ d: 0.14, v: 0.16, f: 900, pan: p }); },
  splat: (p) => { noise({ d: 0.16, v: 0.2, f: 600, f1: 150, pan: p }); tone({ w: 'sine', f: 120, f1: 60, d: 0.1, v: 0.2, pan: p }); },
  hurt: (p) => { tone({ w: 'square', f: 1500, f1: 1900, d: 0.06, v: 0.08, pan: p }); tone({ w: 'square', f: 1900, f1: 1100, d: 0.12, v: 0.08, t: 0.06, pan: p }); noise({ d: 0.1, v: 0.2, f: 1200, pan: p }); },
  squeak: (p) => { tone({ w: 'p25', f: 1700, f1: 2300, d: 0.08, v: 0.07, pan: p, vib: 40, vibf: 30 }); tone({ w: 'p25', f: 2300, f1: 1600, d: 0.14, v: 0.07, t: 0.08, pan: p }); },
  coin: (p) => { tone({ w: 'p25', f: 1318, d: 0.05, v: 0.045, pan: p }); tone({ w: 'p25', f: 1975, d: 0.09, v: 0.045, t: 0.045, pan: p }); },
  crumb: (p) => tone({ w: 'triangle', f: 1900 * rnd(0.95, 1.1), f1: 2500, d: 0.05, v: 0.06, pan: p }),
  pickup: () => arp([784, 988, 1175, 1568], 0.05, { w: 'p25', d: 0.08, v: 0.05 }),
  chest: () => { noise({ d: 0.2, v: 0.15, f: 700 }); arp([523, 659, 784, 1046, 1318], 0.06, { w: 'p25', d: 0.12, v: 0.05, t: 0.1 }); },
  door: () => { noise({ d: 0.35, v: 0.15, f: 400, f1: 150 }); tone({ w: 'triangle', f: 110, f1: 70, d: 0.3, v: 0.2 }); },
  explode: (p) => { noise({ d: 0.6, v: 0.36, f: 1300, f1: 80, pan: p }); tone({ w: 'sine', f: 90, f1: 28, d: 0.5, v: 0.45, pan: p }); },
  pop: (p) => { noise({ d: 0.12, v: 0.2, f: 2000, f1: 300, pan: p }); tone({ w: 'sine', f: 400, f1: 120, d: 0.1, v: 0.18, pan: p }); },
  shoot: (p) => tone({ w: 'p25', f: 900, f1: 260, d: 0.07, v: 0.07, pan: p }),
  twang: (p) => { tone({ w: 'triangle', f: 320, f1: 180, d: 0.12, v: 0.15, pan: p }); noise({ d: 0.04, v: 0.08, f: 3000, pan: p }); },
  pea: (p) => tone({ w: 'sine', f: 700, f1: 1100, d: 0.05, v: 0.1, pan: p }),
  block: (p) => { tone({ w: 'square', f: 1800, d: 0.05, v: 0.05, pan: p }); noise({ d: 0.05, v: 0.15, f: 4000, type: 'highpass', pan: p }); },
  parry: (p) => { arp([2093, 2637, 3136], 0.02, { w: 'p25', d: 0.2, v: 0.05, pan: p }); noise({ d: 0.08, v: 0.2, f: 5000, type: 'highpass', pan: p }); },
  heal: () => { [0, 1, 2].forEach((i) => tone({ w: 'sine', f: 300 + i * 60, f1: 500 + i * 60, d: 0.1, v: 0.15, t: i * 0.1 })); arp([1046, 1318, 1568], 0.05, { w: 'triangle', d: 0.15, v: 0.06, t: 0.3 }); },
  nom: (p) => { noise({ d: 0.05, v: 0.15, f: 900, pan: p }); noise({ d: 0.05, v: 0.12, f: 700, t: 0.09, pan: p }); },
  levelup: () => arp([523, 659, 784, 1046, 784, 1046, 1318], 0.07, { w: 'p25', d: 0.1, v: 0.06 }),
  boing: (p) => tone({ w: 'sine', f: 180, f1: 720, d: 0.25, v: 0.2, vib: 40, vibf: 25, pan: p }),
  fart: (p) => { tone({ w: 'sawtooth', f: 95, f1: 70, d: 0.55, v: 0.18, vib: 18, vibf: 28, lp: 700, pan: p }); noise({ d: 0.5, v: 0.08, f: 300, pan: p }); },
  snap: (p) => { noise({ d: 0.05, v: 0.3, f: 3500, type: 'highpass', pan: p }); tone({ w: 'square', f: 220, f1: 110, d: 0.05, v: 0.12, pan: p }); },
  ice: (p) => { arp([2637, 3520, 2960], 0.03, { w: 'triangle', d: 0.15, v: 0.05, pan: p }); noise({ d: 0.15, v: 0.1, f: 6000, type: 'highpass', pan: p }); },
  fire: (p) => noise({ d: 0.3, v: 0.12, f: 900, f1: 2000, type: 'bandpass', q: 0.7, pan: p }),
  zap: (p) => { tone({ w: 'sawtooth', f: 1400, f1: 200, d: 0.12, v: 0.06, pan: p }); noise({ d: 0.08, v: 0.1, f: 5000, type: 'highpass', pan: p }); },
  menu: () => tone({ w: 'p25', f: 660, d: 0.035, v: 0.05 }),
  select: () => { tone({ w: 'p25', f: 880, d: 0.05, v: 0.06 }); tone({ w: 'p25', f: 1320, d: 0.08, v: 0.06, t: 0.05 }); },
  back: () => tone({ w: 'p25', f: 520, f1: 330, d: 0.08, v: 0.05 }),
  deny: () => tone({ w: 'square', f: 180, f1: 140, d: 0.15, v: 0.07 }),
  buy: () => { SFX.coin(); arp([659, 880, 1318], 0.06, { w: 'p25', d: 0.1, v: 0.05, t: 0.1 }); },
  roar: (p) => { tone({ w: 'sawtooth', f: 140, f1: 60, d: 0.9, v: 0.2, vib: 12, vibf: 9, lp: 900, pan: p }); noise({ d: 0.8, v: 0.15, f: 600, f1: 200, pan: p }); },
  meow: () => { tone({ w: 'sawtooth', f: 420, f1: 820, d: 0.25, v: 0.12, lp: 1800 }); tone({ w: 'sawtooth', f: 820, f1: 380, d: 0.45, v: 0.12, t: 0.22, lp: 1600, vib: 10, vibf: 7 }); },
  hiss: () => noise({ d: 0.8, v: 0.18, f: 5000, type: 'highpass' }),
  bonk: (p) => { tone({ w: 'square', f: 300, f1: 120, d: 0.12, v: 0.12, pan: p }); noise({ d: 0.1, v: 0.2, f: 800, pan: p }); },
  clang: (p) => { noise({ d: 0.7, v: 0.2, f: 3000, type: 'highpass', pan: p }); arp([1480, 2217, 2960], 0.0, { w: 'square', d: 0.5, v: 0.03, pan: p }); },
  tele: (p) => tone({ w: 'p25', f: 1250, d: 0.05, v: 0.045, pan: p }),
  buzz: (p) => tone({ w: 'sawtooth', f: 180, f1: 220, d: 0.2, v: 0.04, vib: 30, vibf: 40, lp: 1500, pan: p }),
  achoo: (p) => { tone({ w: 'triangle', f: 600, f1: 900, d: 0.2, v: 0.08, pan: p }); noise({ d: 0.25, v: 0.25, f: 3000, t: 0.22, pan: p }); },
  ow: (p) => { tone({ w: 'square', f: 1000, f1: 650, d: 0.12, v: 0.05, pan: p }); },
  thud: (p) => { tone({ w: 'sine', f: 110, f1: 40, d: 0.25, v: 0.4, pan: p }); noise({ d: 0.15, v: 0.2, f: 400, pan: p }); },
  quake: (p) => { tone({ w: 'sine', f: 70, f1: 30, d: 0.6, v: 0.45, pan: p }); noise({ d: 0.5, v: 0.25, f: 500, f1: 100, pan: p }); },
  whoosh: (p) => noise({ d: 0.35, v: 0.15, f: 400, f1: 2400, type: 'bandpass', q: 1, pan: p }),
  glass: (p) => { arp([3136, 4186, 3520, 4699], 0.025, { w: 'triangle', d: 0.12, v: 0.04, pan: p }); noise({ d: 0.15, v: 0.15, f: 6000, type: 'highpass', pan: p }); },
  laser: (p) => tone({ w: 'square', f: 2400, f1: 2300, d: 0.08, v: 0.025, pan: p }),
  hack: () => { noise({ d: 0.12, v: 0.2, f: 800, type: 'bandpass', q: 2 }); noise({ d: 0.12, v: 0.2, f: 900, type: 'bandpass', q: 2, t: 0.2 }); noise({ d: 0.25, v: 0.25, f: 500, type: 'bandpass', q: 2, t: 0.45 }); },
  bossdie: () => { SFX.explode(); arp([523, 494, 440, 392, 349, 330, 294, 262], 0.09, { w: 'p25', d: 0.14, v: 0.06, t: 0.2 }); },
  death: () => arp([784, 659, 523, 392, 262], 0.16, { w: 'p25', d: 0.24, v: 0.07 }),
  fanfare: () => { arp([523, 523, 523, 659, 784, 659, 784, 1046], 0.11, { w: 'p25', d: 0.14, v: 0.07 }); arp([262, 330, 392, 523], 0.22, { w: 'triangle', d: 0.25, v: 0.12 }); },
  curse: () => { tone({ w: 'sawtooth', f: 200, f1: 70, d: 0.8, v: 0.12, vib: 8, vibf: 6, lp: 800 }); arp([466, 440, 415], 0.2, { w: 'p12', d: 0.3, v: 0.05 }); },
  secret: () => arp([392, 494, 587, 784, 988, 1175], 0.06, { w: 'triangle', d: 0.18, v: 0.08 }),
  spawn: (p) => { noise({ d: 0.3, v: 0.12, f: 300, f1: 1800, type: 'bandpass', q: 1, pan: p }); },
};
function sfx(name, x) {
  const a = AudioSys;
  if (!a.ctx || !SFX[name]) return;
  const now = a.ctx.currentTime;
  if (a.last[name] && now - a.last[name] < 0.035) return;
  a.last[name] = now;
  let pan = 0;
  if (x !== undefined) pan = clamp((x - (Cam.x + W / 2)) / (W * 0.75), -0.75, 0.75);
  try { SFX[name](pan); } catch (e) { /* ignore audio hiccups */ }
}
// Looping hum used by the vacuum boss.
function loopSound(kind) {
  const a = AudioSys, c = a.ctx;
  if (!c) return { stop() {}, set() {} };
  const g = c.createGain(); g.gain.value = 0.0001; g.connect(a.sfxBus);
  const o = c.createOscillator(); o.type = kind === 'vac' ? 'sawtooth' : 'triangle'; o.frequency.value = kind === 'vac' ? 62 : 120;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const n = c.createBufferSource(); n.buffer = a.noiseBuf; n.loop = true;
  const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6;
  o.connect(f); f.connect(g); n.connect(nf); nf.connect(g);
  o.start(); n.start();
  g.gain.setTargetAtTime(0.13, c.currentTime, 0.2);
  return {
    set(v, pitch) { g.gain.setTargetAtTime(v, c.currentTime, 0.1); if (pitch) o.frequency.setTargetAtTime(pitch, c.currentTime, 0.2); },
    stop() { g.gain.setTargetAtTime(0.0001, c.currentTime, 0.15); setTimeout(() => { try { o.stop(); n.stop(); } catch (e) {} }, 600); },
  };
}

// ---------------- music ----------------
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteMidi(tok) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return null;
  let n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + 12 * (+m[3] + 1);
}
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
function chordTones(sym) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(sym);
  let root = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const q = m[3];
  const iv = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus4: [0, 5, 7], 5: [0, 7] }[q] || [0, 4, 7];
  return { root, iv };
}
function parseSong(S) {
  const bars = S.chords.length, len = bars * 16;
  const lead = new Array(len).fill(null);
  S.lead.forEach((bar, b) => {
    const toks = bar.trim().split(/\s+/);
    let lastIdx = -1;
    for (let i = 0; i < 16; i++) {
      const tk = toks[i] || '.';
      const idx = b * 16 + i;
      if (tk === '-') { if (lastIdx >= 0) lead[lastIdx].len++; continue; }
      if (tk === '.') { lastIdx = -1; continue; }
      const mi = noteMidi(tk);
      if (mi !== null) { lead[idx] = { m: mi, len: 1 }; lastIdx = idx; }
    }
  });
  return { S, len, lead, chords: S.chords.map(chordTones) };
}
const Music = {
  name: '', cur: null, step: 0, next: 0, loop: 0,
  play(name) {
    if (this.name === name) return;
    this.name = name;
    this.cur = SONGS[name] ? parseSong(SONGS[name]) : null;
    this.step = 0; this.loop = 0;
    if (AudioSys.ctx) this.next = AudioSys.ctx.currentTime + 0.12;
  },
  stop() { this.play(''); },
  update() {
    const a = AudioSys;
    if (!a.ctx || !this.cur || a.ctx.state !== 'running') return;
    const now = a.ctx.currentTime;
    if (this.next < now - 0.25) this.next = now + 0.05;
    const S = this.cur.S;
    const spb = 60 / S.bpm / 4;
    let guard = 0;
    while (this.next < now + 0.14 && guard++ < 16) {
      const sw = S.swing ? (this.step % 2 === 0 ? 1 + S.swing : 1 - S.swing) : 1;
      this.playStep(this.step, this.next, spb);
      this.next += spb * sw;
      this.step = (this.step + 1) % this.cur.len;
      if (this.step === 0) this.loop++;
    }
  },
  playStep(i, t, spb) {
    const P = this.cur, S = P.S;
    const bar = floor(i / 16), s = i % 16;
    const ch = P.chords[bar];
    const v = S.vol || 1;
    const ln = P.lead[i];
    // loop variation: every other pass lifts the first half an octave, every fourth pass drops the lead for a breakdown
    const lp = this.loop % 4, half = bar < P.chords.length / 2;
    const lift = lp === 1 && half ? 12 : 0, mute = lp === 3 && !half;
    if (ln && !mute) mNote(t, ln.m + (S.leadOct || 0) + lift, ln.len * spb * 0.95, lift ? 'p12' : S.leadWave || 'p25', 0.055 * v, true);
    // bass
    const bassRoot = 36 + ch.root + (ch.root > 6 ? -12 : 0);
    const bs = S.bass;
    let bn = null;
    if (bs === 'eighth' && s % 2 === 0) bn = bassRoot;
    else if (bs === 'octave' && s % 2 === 0) bn = bassRoot + (s % 4 === 2 ? 12 : 0);
    else if (bs === 'walk' && s % 4 === 0) bn = bassRoot + [0, ch.iv[1], 7, ch.iv[1] === 3 ? 10 : 9][s / 4];
    else if (bs === 'gallop' && [0, 2, 3].includes(s % 4)) bn = bassRoot;
    else if (bs === 'half' && s % 8 === 0) bn = bassRoot + (s === 8 ? 7 : 0);
    else if (bs === 'polka' && s % 4 === 0) bn = bassRoot + (s % 8 === 4 ? 7 : 0);
    else if (bs === 'sixteen') bn = bassRoot + (s % 8 === 7 ? 12 : 0);
    if (bn !== null) mNote(t, bn, spb * (bs === 'half' ? 7 : bs === 'walk' ? 3.5 : 1.6), 'triangle', 0.16 * v, false);
    // arpeggio
    const as = S.arp;
    if (as && as !== 'none') {
      const tones = [];
      for (let o = 0; o < 2; o++) for (const x of ch.iv) tones.push(60 + ch.root + x + o * 12 + (S.arpOct || 0));
      let an = null;
      if (as === 'up') an = tones[s % tones.length];
      else if (as === 'updown') { const k = s % (tones.length * 2 - 2); an = tones[k < tones.length ? k : tones.length * 2 - 2 - k]; }
      else if (as === 'stab' && (s % 4 === 2)) { for (const x of ch.iv) mNote(t, 60 + ch.root + x, spb * 0.8, 'p12', 0.022 * v, false); }
      else if (as === 'slow' && s % 2 === 0) an = tones[(s / 2) % tones.length];
      if (an !== null) mNote(t, an, spb * 0.9, 'p12', 0.022 * v, false);
    }
    // drums
    if (S.drums) {
      const pat = S.drums[bar % S.drums.length];
      const k = pat[s];
      if (k && k !== '.') mDrum(t, k, v);
    }
  },
};
function mNote(t, midi, dur, wave, vol, delay) {
  const c = AudioSys.ctx;
  const o = c.createOscillator(), g = c.createGain();
  if (wave === 'p25' || wave === 'p12') o.setPeriodicWave(AudioSys.waves[wave]);
  else o.type = wave;
  o.frequency.value = mtof(midi);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.setTargetAtTime(vol * 0.55, t + 0.03, 0.12);
  g.gain.setTargetAtTime(0.0001, t + max(0.03, dur - 0.02), 0.025);
  if (dur > 0.3 && delay) {
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(mtof(midi) * 0.012, t + 0.3);
    l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.2);
  }
  o.connect(g); g.connect(AudioSys.musBus);
  if (delay) g.connect(AudioSys.delayIn);
  o.start(t); o.stop(t + dur + 0.2);
}
function mDrum(t, k, v) {
  const c = AudioSys.ctx, bus = AudioSys.musBus;
  const kick = () => {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.42 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
  };
  const nz = (f, type, d, vol) => {
    const s = c.createBufferSource(); s.buffer = AudioSys.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(vol * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + d + 0.02);
  };
  const snare = () => {
    nz(1900, 'bandpass', 0.13, 0.32);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 190;
    g.gain.setValueAtTime(0.18 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.1);
  };
  if (k === 'k' || k === 'x' || k === 'c') kick();
  if (k === 's' || k === 'y') snare();
  if (k === 'h' || k === 'x' || k === 'y') nz(7500, 'highpass', 0.035, 0.11);
  if (k === 'o') nz(6500, 'highpass', 0.16, 0.1);
  if (k === 'c') nz(4200, 'highpass', 0.9, 0.16);
  if (k === 't') nz(1200, 'bandpass', 0.08, 0.16);
}

const SONGS = {
  title: {
    bpm: 92, bass: 'half', arp: 'updown', leadWave: 'p25',
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
    lead: [
      'A4 - - C5 E5 - D5 C5 B4 - C5 - A4 - - -',
      'F4 - A4 C5 F5 - E5 D5 C5 - A4 - F4 - - .',
      'E4 - G4 C5 E5 - D5 C5 D5 - E5 - G5 - - -',
      'D5 - - B4 G4 - A4 B4 D5 - C5 B4 A4 - G4 .',
      'A4 - - E5 A5 - G5 E5 C5 - D5 - E5 - - -',
      'F5 - E5 D5 C5 - A4 - C5 - D5 - C5 - A4 -',
      'D5 - F5 - A5 - G5 F5 E5 - D5 - C5 - B4 -',
      'E5 - - - G#4 - B4 - E5 - D5 - B4 - G#4 -',
    ],
    drums: ['k.......s.......', 'k.......s...k...'],
  },
  hub: {
    bpm: 84, bass: 'half', arp: 'slow', leadWave: 'triangle', leadOct: 0, vol: 0.9,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm7', 'G7'],
    lead: [
      'E5 - - - G5 - - - E5 - D5 - C5 - - -',
      'C5 - - - E5 - - - A4 - - - - - - -',
      'A4 - C5 - F5 - - - E5 - D5 - C5 - - -',
      'B4 - - - D5 - - - G4 - - - - - - -',
      'E5 - - - G5 - - - C6 - B5 - G5 - - -',
      'A5 - - - E5 - - - C5 - - - - - - -',
      'D5 - F5 - A5 - - - G5 - F5 - D5 - - -',
      'G5 - - - F5 - - - D5 - - - B4 - - -',
    ],
    drums: ['h.......h.......'],
  },
  cellar: {
    bpm: 116, bass: 'walk', arp: 'none', leadWave: 'p25',
    chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Gm', 'A'],
    lead: [
      'D4 . F4 . A4 . F4 . D4 . E4 . F4 . E4 .',
      'D4 . F4 . A4 . D5 . C5 . A4 . G4 . A4 .',
      'Bb4 . A4 . G4 . F4 . G4 . A4 . Bb4 . D5 .',
      'C#5 . A4 . E4 . A4 . C#5 . E5 . C#5 . A4 .',
      'D5 . . D5 C5 . A4 . F4 . . G4 A4 . . .',
      'D5 . . F5 E5 . D5 . C5 . A4 . F4 . E4 .',
      'G4 . Bb4 . D5 . G5 . F5 . D5 . Bb4 . G4 .',
      'A4 . C#5 . E5 . A5 . G5 . E5 . C#5 . A4 .',
    ],
    drums: ['k...s.k.k...s...', 'k...s.k.k...s.hh'],
  },
  living: {
    bpm: 104, swing: 0.18, bass: 'walk', arp: 'stab', leadWave: 'p25',
    chords: ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7', 'Gm7', 'C7'],
    lead: [
      'A4 - C5 - E5 - - D5 C5 - A4 - G4 - F4 -',
      'F4 - A4 - C5 - - B4 A4 - F4 - D4 - - .',
      'D4 - F4 - Bb4 - - A4 G4 - F4 - D4 - - .',
      'E4 - G4 - Bb4 - C5 - D5 - C5 - Bb4 - G4 -',
      'A4 - C5 - F5 - - E5 C5 - A4 - C5 - - .',
      'D5 - F5 - A5 - - G5 F5 - D5 - Bb4 - - .',
      'G4 - Bb4 - D5 - F5 - E5 - D5 - C5 - Bb4 -',
      'A4 - G4 - E4 - C4 - E4 - G4 - Bb4 - C5 -',
    ],
    drums: ['k.h.s.h.k.h.s.hh', 'k.h.s.h.k.hks.h.'],
  },
  kitchen: {
    bpm: 150, bass: 'polka', arp: 'stab', leadWave: 'p25',
    chords: ['G', 'D7', 'G', 'D7', 'C', 'G', 'D7', 'G'],
    lead: [
      'D5 . B4 . G4 . B4 . D5 . G5 . F#5 . E5 .',
      'D5 . C5 . A4 . F#4 . A4 . C5 . B4 . A4 .',
      'B4 . D5 . G5 . D5 . B4 . G4 . A4 . B4 .',
      'C5 . A4 . F#4 . D4 . F#4 . A4 . C5 . A4 .',
      'E5 . G5 . E5 . C5 . G4 . C5 . E5 . G5 .',
      'D5 . B4 . G4 . B4 . D5 - - . B4 . D5 .',
      'C5 . A4 . D5 . C5 . A4 . F#4 . A4 . C5 .',
      'B4 . G4 . D4 . G4 . B4 - D5 - G5 - - .',
    ],
    drums: ['k.s.k.s.k.s.k.ss', 'k.s.k.s.k.s.kkss'],
  },
  cattree: {
    bpm: 128, bass: 'eighth', arp: 'up', leadWave: 'p25',
    chords: ['Em', 'C', 'D', 'Bm', 'Em', 'C', 'Am', 'B'],
    lead: [
      'E5 - - - B4 - E5 - G5 - F#5 - E5 - D5 -',
      'E5 - - - C5 - E5 - G5 - A5 - G5 - E5 -',
      'F#5 - - - D5 - F#5 - A5 - G5 - F#5 - D5 -',
      'F#5 - - - D5 - B4 - D5 - E5 - F#5 - - -',
      'G5 - - - E5 - B4 - E5 - G5 - B5 - A5 -',
      'G5 - - - E5 - C5 - E5 - G5 - E5 - C5 -',
      'A4 - C5 - E5 - A5 - G5 - F#5 - E5 - C5 -',
      'B4 - - - D#5 - - - F#5 - - - B5 - - -',
    ],
    drums: ['k.h.s.h.k.k.s.h.', 'k.h.s.h.k.k.s.ss'],
  },
  boss: {
    bpm: 140, bass: 'gallop', arp: 'none', leadWave: 'p25',
    chords: ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'G'],
    lead: [
      'C5 . C5 . Eb5 . C5 . G5 . F5 . Eb5 . D5 .',
      'C5 . C5 . Eb5 . G5 . C6 - - . Bb5 . G5 .',
      'Ab4 . C5 . Eb5 . Ab5 . G5 . Eb5 . C5 . Eb5 .',
      'Bb4 . D5 . F5 . Bb5 . Ab5 . F5 . D5 . F5 .',
      'G5 - - . Eb5 . C5 . G5 - - . Ab5 . G5 .',
      'F5 - - . Eb5 . D5 . C5 - - . D5 . Eb5 .',
      'Ab5 . G5 . F5 . Eb5 . F5 . G5 . Ab5 . C6 .',
      'B5 - - . G5 . D5 . B4 . D5 . G5 . B5 .',
    ],
    drums: ['k.hsk.hsk.hsk.ss', 'c.hsk.hsk.hsk.st'],
  },
  final: {
    bpm: 156, bass: 'sixteen', arp: 'up', arpOct: 12, leadWave: 'p25',
    chords: ['Dm', 'Eb', 'Dm', 'Eb', 'Bb', 'C', 'Dm', 'A7'],
    lead: [
      'D5 . A4 . D5 . F5 . E5 . D5 . A4 . D5 .',
      'Eb5 . Bb4 . Eb5 . G5 . F5 . Eb5 . Bb4 . Eb5 .',
      'F5 . D5 . A5 . F5 . D6 - - . C6 . A5 .',
      'G5 . Eb5 . Bb5 . G5 . Eb6 - - . D6 . Bb5 .',
      'F5 - D5 - Bb4 - D5 - F5 - Bb5 - A5 - F5 -',
      'G5 - E5 - C5 - E5 - G5 - C6 - Bb5 - G5 -',
      'A5 - - - F5 - D5 - A5 - D6 - C6 - A5 -',
      'C#6 - - - A5 - E5 - C#5 - E5 - G5 - A5 -',
    ],
    drums: ['x.hyx.hyx.hyx.yy', 'c.hyx.hyxkhyx.yt'],
  },
};

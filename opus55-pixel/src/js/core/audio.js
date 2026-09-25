// ---------------------------------------------------------------------------
// Audio engine: every sound is synthesized with WebAudio (no samples).
// Sword swishes are swept band-passed noise, parries are inharmonic metal
// partials, drums are pitch-dropping sines, plucked strings use
// Karplus-Strong buffers rendered at startup.
// ---------------------------------------------------------------------------
const AudioSys = {
  ctx: null, ready: false, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.75; this.sfx.connect(this.master);
    this.mus = ctx.createGain(); this.mus.gain.value = 0.42; this.mus.connect(this.master);
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.6, 2.4);
    this.verbOut = ctx.createGain(); this.verbOut.gain.value = 0.32;
    this.verb.connect(this.verbOut); this.verbOut.connect(this.master);
    const n = ctx.sampleRate * 2, nb = ctx.createBuffer(1, n, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.ready = true;
    Music.prepare();
  },
  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  },
  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.85; },
};

// ---- synth helpers --------------------------------------------------------
function aEnv(g, t, a, d, peak, sustain = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
}
function aOsc(type, f0, t, dur, peak, o = {}) {
  const A = AudioSys, ctx = A.ctx;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.fT || dur));
  if (o.detune) osc.detune.value = o.detune;
  aEnv(g, t, o.a || 0.004, dur, peak);
  osc.connect(g);
  let out = g;
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
  out.connect(o.dest || A.sfx);
  if (o.verb) out.connect(A.verb);
  osc.start(t); osc.stop(t + (o.a || 0.004) + dur + 0.05);
  return osc;
}
function aNoise(t, dur, peak, type, f0, o = {}) {
  const A = AudioSys, ctx = A.ctx;
  const src = ctx.createBufferSource(); src.buffer = A.noiseBuf;
  src.playbackRate.value = o.rate || 1;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.Q.value = o.q || 1;
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.fT || dur));
  const g = ctx.createGain();
  aEnv(g, t, o.a || 0.003, dur, peak);
  src.connect(f); f.connect(g); g.connect(o.dest || A.sfx);
  if (o.verb) g.connect(A.verb);
  src.start(t, Math.random() * 1.5); src.stop(t + (o.a || 0.003) + dur + 0.05);
}
function aMetal(t, base, parts, dur, peak, o = {}) {
  for (let i = 0; i < parts.length; i++) aOsc(i % 2 ? 'triangle' : 'sine', base * parts[i], t, dur * (1 - i * 0.12), peak / (1 + i * 0.7), { verb: o.verb, f1: o.bend ? base * parts[i] * o.bend : undefined });
}

const SOUNDS = {
  swing(A, t) { aNoise(t, 0.13, 0.32, 'bandpass', rnd(2600, 3400), { f1: 700, q: 1.6 }); },
  swing2(A, t) { aNoise(t, 0.2, 0.34, 'bandpass', 1600, { f1: 420, q: 1.3 }); },
  spin(A, t) { aNoise(t, 0.12, 0.26, 'bandpass', 3000, { f1: 900, q: 1.5 }); aNoise(t + 0.09, 0.14, 0.26, 'bandpass', 2600, { f1: 700, q: 1.5 }); },
  thrust(A, t) { aNoise(t, 0.09, 0.3, 'highpass', 1800, { f1: 5000 }); aOsc('sine', 2600, t + 0.04, 0.12, 0.05); },
  hit(A, t) { aNoise(t, 0.07, 0.5, 'lowpass', 2600); aOsc('sine', 170, t, 0.12, 0.6, { f1: 48 }); aNoise(t, 0.02, 0.3, 'highpass', 3000); },
  hitHeavy(A, t) { aNoise(t, 0.16, 0.6, 'lowpass', 1800); aOsc('sine', 130, t, 0.26, 0.8, { f1: 34 }); aOsc('square', 60, t, 0.1, 0.12, { f1: 30, lp: 400 }); },
  hitBlunt(A, t) { aNoise(t, 0.08, 0.4, 'lowpass', 900); aOsc('sine', 120, t, 0.18, 0.7, { f1: 40 }); },
  block(A, t) { aMetal(t, 720, [1, 2.31, 3.92], 0.16, 0.2); aNoise(t, 0.03, 0.35, 'highpass', 2500); },
  clang(A, t) { aMetal(t, 520, [1, 2.4, 3.9, 5.3], 0.4, 0.3, { verb: 1 }); aNoise(t, 0.05, 0.4, 'highpass', 2000); },
  parry(A, t) { aMetal(t, 1180, [1, 2.76, 5.4, 8.93], 0.9, 0.34, { verb: 1 }); aNoise(t, 0.05, 0.5, 'highpass', 3000); aOsc('sine', 90, t, 0.3, 0.4, { f1: 40 }); },
  clink(A, t) { aMetal(t, 1900, [1, 2.7], 0.08, 0.08); },
  guard(A, t) { aNoise(t, 0.05, 0.14, 'highpass', 4200); },
  jump(A, t) { aNoise(t, 0.12, 0.12, 'bandpass', 600, { f1: 1600, q: 1.2 }); },
  djump(A, t) { aNoise(t, 0.2, 0.16, 'bandpass', 1200, { f1: 3400, q: 2 }); aOsc('sine', 620, t, 0.16, 0.06, { f1: 1240 }); },
  land(A, t) { aNoise(t, 0.07, 0.25, 'lowpass', 500); aOsc('sine', 90, t, 0.08, 0.3, { f1: 50 }); },
  step(A, t) { aNoise(t, 0.025, 0.07, 'lowpass', 1400); },
  dash(A, t) { aNoise(t, 0.22, 0.28, 'bandpass', 500, { f1: 2600, q: 1.1, fT: 0.12 }); },
  dive(A, t) { aNoise(t, 0.3, 0.26, 'bandpass', 3000, { f1: 500, q: 1.5 }); },
  slam(A, t) { aNoise(t, 0.25, 0.6, 'lowpass', 700); aOsc('sine', 80, t, 0.5, 0.9, { f1: 28, verb: 1 }); },
  heavy(A, t) { aNoise(t, 0.18, 0.5, 'lowpass', 900); aOsc('sine', 100, t, 0.3, 0.7, { f1: 34 }); },
  qicharge(A, t) { aOsc('sine', 300, t, 0.35, 0.12, { f1: 900 }); aOsc('triangle', 600, t, 0.35, 0.05, { f1: 1800 }); },
  wave(A, t) { aNoise(t, 0.3, 0.4, 'bandpass', 900, { f1: 3200, q: 1 }); for (const f of [880, 1320, 1760]) aOsc('sine', f, t, 0.6, 0.06, { verb: 1 }); },
  tell(A, t) { aOsc('sine', 2500, t, 0.09, 0.08); aOsc('sine', 3750, t, 0.06, 0.03); },
  alert(A, t) { aOsc('sine', 190, t, 0.1, 0.25, { f1: 120 }); },
  hurt(A, t) { aNoise(t, 0.1, 0.4, 'lowpass', 1500); aOsc('sawtooth', 280, t, 0.18, 0.12, { f1: 110, lp: 900 }); },
  kill(A, t) { aNoise(t, 0.2, 0.35, 'bandpass', 1400, { f1: 300 }); aOsc('sine', 70, t + 0.02, 0.4, 0.5, { f1: 30 }); aMetal(t + 0.02, 330, [1, 2.4], 0.5, 0.05, { verb: 1 }); },
  death(A, t) { aMetal(t, 110, [1, 1.48, 1.93, 2.53], 2.6, 0.3, { verb: 1, bend: 0.94 }); },
  throw(A, t) { aNoise(t, 0.1, 0.18, 'bandpass', 2400, { f1: 1200, q: 2 }); },
  draw(A, t) { aOsc('sawtooth', 70, t, 0.35, 0.05, { f1: 95, lp: 500 }); },
  bow(A, t) { aOsc('triangle', 220, t, 0.14, 0.2, { f1: 90 }); aNoise(t, 0.08, 0.15, 'bandpass', 1800); },
  crack(A, t) { aNoise(t, 0.04, 0.3, 'highpass', 2000); },
  shatter(A, t) { for (let i = 0; i < 4; i++) aNoise(t + i * 0.03, 0.06, 0.28 - i * 0.05, 'highpass', 2400 + i * 500); aOsc('sine', 180, t, 0.08, 0.2, { f1: 90 }); },
  wood(A, t) { aOsc('sine', 420, t, 0.06, 0.3, { f1: 230 }); aNoise(t, 0.04, 0.2, 'bandpass', 900); },
  woodBreak(A, t) { SOUNDS.wood(A, t); aNoise(t + 0.03, 0.15, 0.3, 'bandpass', 700, { f1: 300 }); },
  qiPick(A, t) { aOsc('sine', rnd(1700, 1900), t, 0.14, 0.06); aOsc('sine', 2700, t + 0.02, 0.1, 0.03); },
  heal(A, t) { [0, 0.07, 0.14].forEach((d, i) => aOsc('sine', [880, 1109, 1319][i], t + d, 0.4, 0.09, { verb: 1 })); },
  splash(A, t) { aNoise(t, 0.4, 0.4, 'lowpass', 2400, { f1: 400 }); },
  spike(A, t) { aNoise(t, 0.2, 0.4, 'bandpass', 1600, { f1: 500 }); aMetal(t, 900, [1, 2.2, 3.7], 0.3, 0.1); },
  thud(A, t) { aNoise(t, 0.08, 0.3, 'lowpass', 350); aOsc('sine', 75, t, 0.12, 0.35, { f1: 40 }); },
  deny(A, t) { aOsc('square', 140, t, 0.05, 0.05, { lp: 800 }); aOsc('square', 110, t + 0.07, 0.07, 0.05, { lp: 800 }); },
  ultStart(A, t) { SOUNDS.gong(A, t); aNoise(t, 0.6, 0.3, 'bandpass', 300, { f1: 4000, q: 1 }); },
  sheathe(A, t) { aNoise(t, 0.35, 0.2, 'highpass', 1500, { f1: 6000 }); aMetal(t + 0.36, 1600, [1, 2.7], 0.2, 0.15); },
  ultHit(A, t) { aNoise(t, 0.5, 0.8, 'lowpass', 1600); aOsc('sine', 90, t, 0.9, 1, { f1: 26, verb: 1 }); for (const f of [220, 330, 440]) aOsc('sawtooth', f, t, 0.8, 0.04, { lp: 1200, verb: 1 }); },
  gong(A, t) { aMetal(t, 98, [1, 1.48, 1.93, 2.53, 3.02, 4.1], 3.2, 0.42, { verb: 1, bend: 0.96 }); aNoise(t, 0.05, 0.3, 'lowpass', 800); },
  bell(A, t) { aMetal(t, 196, [1, 2, 2.76, 5.4], 4, 0.3, { verb: 1 }); },
  drum(A, t) { aOsc('sine', 95, t, 0.4, 0.8, { f1: 45 }); aNoise(t, 0.06, 0.3, 'lowpass', 600); },
  text(A, t, o) { aOsc('square', o.pitch || 520, t, 0.025, 0.018, { lp: 1800 }); },
  menu(A, t) { aOsc('triangle', 660, t, 0.05, 0.08); },
  select(A, t) { aOsc('triangle', 880, t, 0.08, 0.1); aOsc('triangle', 1320, t + 0.06, 0.12, 0.08); },
  shrine(A, t) { SOUNDS.bell(A, t); SOUNDS.heal(A, t + 0.1); },
  fire(A, t) { aNoise(t, 0.3, 0.1, 'bandpass', 800, { f1: 300 }); },
  thunder(A, t) { aNoise(t, 1.6, 0.6, 'lowpass', 500, { f1: 120 }); aOsc('sine', 50, t, 1.2, 0.5, { f1: 28, verb: 1 }); },
  whoosh(A, t) { aNoise(t, 0.5, 0.2, 'bandpass', 400, { f1: 1800, q: 0.8 }); },
  vanish(A, t) { aNoise(t, 0.3, 0.25, 'highpass', 1200, { f1: 300 }); aOsc('sine', 900, t, 0.2, 0.05, { f1: 300 }); },
};

const SFX = {
  last: {},
  play(name, o = {}) {
    const A = AudioSys;
    if (!A.ready || A.muted) return;
    const t = A.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < 0.035) return;
    this.last[name] = t;
    const f = SOUNDS[name];
    if (f) try { f(A, t + 0.005, o); } catch (e) { /* audio node limits: drop the sound */ }
  },
};

/* Soft synthesized sounds: a muted tick per key and a low thud for mistakes. Nothing is loaded from files. */

const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type, gain, when = 0) {
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(freq * 0.8, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },
  click() {
    if (Settings.get('sound') !== 'all') return;
    const c = this.ensure();
    if (!c) return;
    if (!this.noise) {
      const len = Math.floor(c.sampleRate * 0.03);
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    f.type = 'bandpass';
    f.frequency.value = 1800 + Math.random() * 500;
    f.Q.value = 1.2;
    g.gain.value = 0.5;
    s.connect(f).connect(g).connect(c.destination);
    s.start();
  },
  error() { if (Settings.get('sound') !== 'off') this.tone(140, 0.14, 'triangle', 0.22); },
  done() {
    if (Settings.get('sound') === 'off') return;
    this.tone(523, 0.2, 'sine', 0.07);
    this.tone(784, 0.35, 'sine', 0.06, 0.11);
  }
};

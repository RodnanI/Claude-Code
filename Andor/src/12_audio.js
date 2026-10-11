// ANDOR :: audio. Everything is synthesised: Karplus-Strong oud and qanun,
// a breathy ney, darbuka/riq/daf/zills, drones; music follows real maqamat
// (with quarter tones), scheduled ahead on the audio clock.

const Settings = Object.assign(
  { music: 0.7, sfx: 0.8, shake: true, vibrate: true, reduceMotion: false, touchSize: 1, showTimer: false },
  Store.get('andor_settings', {})
);
function saveSettings() {
  Store.set('andor_settings', Settings);
}

const AudioSys = {
  ctx: null,
  ok: false,
  bufs: {},
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      return;
    }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.comp);
    this.comp.connect(c.destination);
    this.music = c.createGain();
    this.sfx = c.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeIR(2.6, 2.4);
    this.revSend = c.createGain();
    this.revSend.gain.value = 0.28;
    this.revSend.connect(this.reverb);
    this.reverb.connect(this.master);
    this.applyVolumes();
    this.makeBuffers();
    this.ok = true;
    if (c.state === 'suspended') c.resume();
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  },
  applyVolumes() {
    if (!this.ctx) return;
    this.music.gain.value = Settings.music * 0.55;
    this.sfx.gain.value = Settings.sfx * 0.8;
  },
  makeIR(dur, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 300 ? i / 300 : 1);
      }
    }
    return b;
  },
  buffer(len, fn) {
    const c = this.ctx, sr = c.sampleRate, n = Math.max(1, Math.floor(len * sr));
    const b = c.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    fn(d, sr, n);
    return b;
  },
  // Karplus-Strong plucked string at freq f; bright (0..1) shapes the excitation.
  pluckBuf(f, dur, bright, damp) {
    return this.buffer(dur, (d, sr, n) => {
      const N = Math.max(2, Math.round(sr / f));
      const ring = new Float32Array(N);
      let lp = 0;
      for (let i = 0; i < N; i++) {
        const w = Math.random() * 2 - 1;
        lp = lp + (w - lp) * (0.25 + bright * 0.7);
        ring[i] = lp;
      }
      let idx = 0, prev = 0;
      for (let i = 0; i < n; i++) {
        const cur = ring[idx];
        const v = (cur + prev) * 0.5 * damp;
        prev = cur;
        ring[idx] = v;
        d[i] = cur;
        idx = (idx + 1) % N;
      }
      // gentle fade at the tail
      const fade = Math.floor(sr * 0.05);
      for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
    });
  },
  makeBuffers() {
    const B = this.bufs;
    // oud and qanun references; playbackRate covers the rest of the range
    B.oud = [110, 220, 440].map((f) => ({ f, b: this.pluckBuf(f, 2.2, 0.55, 0.996) }));
    B.qanun = [220, 440, 880].map((f) => ({ f, b: this.pluckBuf(f, 1.6, 0.9, 0.9975) }));
    B.bass = [55, 110].map((f) => ({ f, b: this.pluckBuf(f, 2.0, 0.35, 0.997) }));
    B.noise = this.buffer(2, (d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    });
    B.doum = this.buffer(0.5, (d, sr) => {
      let ph = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const f = 62 + 90 * Math.exp(-t * 28);
        ph += (TAU * f) / sr;
        d[i] = Math.sin(ph) * Math.exp(-t * 7) * 0.95 + (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.25;
      }
    });
    B.tek = this.buffer(0.12, (d, sr) => {
      let lp = 0, ph = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * 0.6;
        ph += (TAU * 760) / sr;
        d[i] = (w - lp) * Math.exp(-t * 70) * 0.9 + Math.sin(ph) * Math.exp(-t * 55) * 0.4;
      }
    });
    B.ka = this.buffer(0.08, (d, sr) => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * 0.35;
        d[i] = lp * Math.exp(-t * 80) * 0.8;
      }
    });
    B.riq = this.buffer(0.25, (d, sr) => {
      const fs = [5200, 6800, 7900, 9400, 11200];
      const ph = fs.map(() => Math.random() * TAU);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let v = 0;
        for (let k = 0; k < fs.length; k++) v += Math.sin(ph[k] + (TAU * fs[k] * i) / sr);
        d[i] = (v / fs.length) * Math.exp(-t * 22) * (0.7 + 0.3 * Math.sin(t * 380)) + (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.3;
      }
    });
    B.daf = this.buffer(0.9, (d, sr) => {
      let ph = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        ph += (TAU * (48 + 40 * Math.exp(-t * 20))) / sr;
        d[i] = Math.sin(ph) * Math.exp(-t * 4.5) + (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.35;
      }
    });
    B.zill = this.buffer(1.4, (d, sr) => {
      const fs = [2630, 3770, 5110, 6720];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let v = 0;
        for (let k = 0; k < fs.length; k++) v += Math.sin((TAU * fs[k] * i) / sr) * Math.exp(-t * (2.4 + k * 0.9));
        d[i] = v * 0.22;
      }
    });
    B.crack = this.buffer(0.22, (d, sr) => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * 0.5;
        const env = t < 0.002 ? 1 : Math.exp(-(t - 0.002) * 55);
        d[i] = (w - lp * 0.6) * env * (t < 0.0012 ? 1.6 : 1);
      }
    });
  },
};

// Play a buffer with rate/gain/filter; returns the source.
function playBuf(buf, o = {}) {
  const A = AudioSys;
  if (!A.ok || !buf) return null;
  const c = A.ctx;
  const t = o.t || c.currentTime;
  const s = c.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = o.rate || 1;
  if (o.loop) s.loop = true;
  let node = s;
  if (o.lp || o.hp || o.bp) {
    const f = c.createBiquadFilter();
    f.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass';
    f.frequency.value = o.lp || o.hp || o.bp;
    f.Q.value = o.q || 0.8;
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + (o.sweepT || 0.2));
    node.connect(f);
    node = f;
  }
  const g = c.createGain();
  g.gain.value = o.gain === undefined ? 1 : o.gain;
  if (o.decay) {
    g.gain.setValueAtTime(o.gain === undefined ? 1 : o.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + o.decay);
  }
  node.connect(g);
  if (o.pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p);
    p.connect(o.bus || A.sfx);
    if (o.rev) p.connect(A.revSend);
  } else {
    g.connect(o.bus || A.sfx);
    if (o.rev) {
      const rg = c.createGain();
      rg.gain.value = o.rev;
      g.connect(rg);
      rg.connect(A.revSend);
    }
  }
  s.start(t, o.offset || 0, o.dur);
  return s;
}
function nearestRef(list, f) {
  let best = list[0];
  for (const r of list) if (Math.abs(Math.log(r.f / f)) < Math.abs(Math.log(best.f / f))) best = r;
  return best;
}
function pluck(inst, f, o = {}) {
  const refs = AudioSys.bufs[inst];
  if (!refs) return;
  const r = nearestRef(refs, f);
  return playBuf(r.b, Object.assign({ rate: f / r.f, lp: inst === 'oud' ? 2600 : inst === 'bass' ? 900 : 6000, q: 0.5 }, o));
}
// Oscillator tone with an envelope and optional pitch sweep.
function tone(type, f0, f1, dur, o = {}) {
  const A = AudioSys;
  if (!A.ok) return;
  const c = A.ctx;
  const t = o.t || c.currentTime;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  if (o.vib) {
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = o.vib;
    lg.gain.value = o.vibDepth || f0 * 0.03;
    l.connect(lg);
    lg.connect(osc.frequency);
    l.start(t);
    l.stop(t + dur + 0.05);
  }
  const g = c.createGain();
  const vol = o.gain === undefined ? 0.3 : o.gain;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (o.lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(o.bus || A.sfx);
  if (o.rev) {
    const rg = c.createGain();
    rg.gain.value = o.rev;
    g.connect(rg);
    rg.connect(A.revSend);
  }
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
function noise(dur, o = {}) {
  return playBuf(AudioSys.bufs.noise, Object.assign({ dur: dur + 0.02, decay: dur, offset: Math.random() * 1.5 }, o));
}

// ---------------------------------------------------------------------------
// Maqamat in cents from the tonic. Quarter tones are real here.
const MAQAM = {
  hijaz: [0, 112, 386, 498, 702, 794, 996],
  bayati: [0, 150, 294, 498, 702, 792, 996],
  saba: [0, 150, 294, 384, 702, 792, 996],
  rast: [0, 204, 350, 498, 702, 906, 1050],
  nahawand: [0, 204, 294, 498, 702, 792, 1088],
  kurd: [0, 112, 294, 498, 702, 792, 996],
};
function degFreq(root, scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return root * Math.pow(2, oct + scale[i] / 1200);
}

// Rhythms on a 16-step bar: D doum, T tek, k ka, R riq, B daf, Z zill
const IQA = {
  maqsum: 'D.T.k.T.D.k.T.k.',
  baladi: 'D.D.k.T.D.k.T.k.',
  saidi: 'D.T.k.D.D.k.T.k.',
  malfuf: 'D.kTk.T.D.kTk.T.',
  ayyub: 'D.kTD.kTD.kTD.kT',
  wahda: 'B.......k...T...',
  none: '................',
};

// Melodies: "deg:len" tokens in sixteenths, 'r' rests, '|' bar marks ignored.
// Suffix '~' = oud tremolo, '^' = grace from above.
const TRACKS = {
  title: {
    bpm: 64, maqam: 'hijaz', root: 146.83, iqa: 'wahda', lead: 'ney', rev: 0.5, drone: [0, 4],
    mel: '4:12 5:4 | 4:8 3:4 2:4 | 1:8 2:4 1:4 | 0:16 | 0:4 1:4 2:4 3:4 | 4:8 5:4 6:4 | 5:4 4:4 3:4 2:2 1:2 | 0:16',
    acc: 'arp', accEvery: 8,
  },
  bazaar: {
    bpm: 104, maqam: 'bayati', root: 146.83, iqa: 'maqsum', lead: 'oud', rev: 0.22, riq: true,
    mel: '3:2 2:2 1:2 2:2 3:4 4:4 | 3:2 2:2 1:2 0:2 1:4 0:4 | 0:2 1:2 2:4 2:2 3:2 4:4 | 5:2 4:2 3:2 2:2 3:8~ | 4:4 5:2 4:2 3:4 4:4 | 7:4 6:2 5:2 4:8~ | 3:2 4:2 3:2 2:2 1:2 2:2 3:4 | 2:2 1:2 0:12~ |' +
      '4:4 4:2 5:2 6:4 5:4 | 4:2 5:2 4:2 3:2 4:8~ | 7:4 7:2 6:2 5:4 4:4 | 3:2 4:2 5:2 4:2 3:8~ | 2:2 3:2 4:4 3:2 2:2 1:4 | 2:4 3:4 2:2 1:2 0:4 | 0:2 1:2 2:2 3:2 4:4 3:4 | 2:2 1:2 0:12~',
    acc: 'bass', counter: 'qanun',
  },
  desert: {
    bpm: 96, maqam: 'hijaz', root: 164.81, iqa: 'baladi', lead: 'oud', rev: 0.3, riq: true, drone: [0],
    mel: '4:6 5:2 4:4 3:4 | 2:4 3:2 2:2 1:4 0:4 | 0:2 1:2 2:4 3:4 4:4 | 5:4 4:2 3:2 4:8~ | 7:6 6:2 5:4 4:4 | 5:2 4:2 3:2 2:2 3:8~ | 2:4 1:4 2:2 3:2 2:4 | 1:2 2:2 1:2 0:10~',
    acc: 'bass', ney: '4:16 | 3:8 2:8 | 1:16 | 0:16 | 7:16 | 5:8 4:8 | 2:16 | 0:16',
  },
  tomb: {
    bpm: 68, maqam: 'saba', root: 146.83, iqa: 'wahda', lead: 'ney', rev: 0.7, drone: [0, -3],
    mel: '2:8 3:4 2:4 | 1:8 0:8 | r:8 2:4 3:4 | 4:12 3:4 | 2:4 3:4 2:4 1:4 | 0:16 | r:16 | -1:4 0:12',
    acc: 'sparse',
  },
  andor: {
    bpm: 112, maqam: 'nahawand', root: 130.81, iqa: 'saidi', lead: 'oud', rev: 0.38, riq: true, drone: [0, 4],
    mel: '0:4 2:4 4:4 5:4 | 4:6 3:2 2:8~ | 3:4 4:4 5:4 6:4 | 7:12~ 6:4 | 5:4 4:4 5:2 4:2 3:4 | 4:8 2:8~ | 1:4 2:4 3:4 1:4 | 0:16~',
    acc: 'bass', counter: 'qanun', ney: '7:16 | 6:8 5:8 | 4:16 | 7:16 | 9:8 8:8 | 7:16 | 6:8 5:8 | 4:16',
  },
  boss: {
    bpm: 138, maqam: 'hijaz', root: 146.83, iqa: 'malfuf', lead: 'oud', rev: 0.25, riq: true, daf: true,
    mel: '0:2 1:2 2:2 1:2 0:2 1:2 2:2 3:2 | 4:4 3:2 2:2 1:4 0:4 | 0:2 1:2 2:2 3:2 4:2 5:2 4:2 3:2 | 2:4 1:4 0:8~ | 7:2 6:2 5:2 4:2 5:2 4:2 3:2 2:2 | 3:4 2:2 1:2 2:8~ | 4:2 5:2 4:2 3:2 2:2 3:2 2:2 1:2 | 0:4 -1:4 0:8~',
    acc: 'bass',
  },
  shop: {
    bpm: 84, maqam: 'rast', root: 130.81, iqa: 'maqsum', lead: 'oud', rev: 0.3, soft: true,
    mel: '0:4 1:4 2:4 3:4 | 4:8~ 3:4 2:4 | 3:4 2:2 1:2 2:4 0:4 | 1:16~ | 4:4 5:4 4:4 3:4 | 2:4 3:4 4:8~ | 3:2 2:2 1:4 2:2 1:2 0:4 | 0:16~',
    acc: 'bass',
  },
};
function parseMel(s) {
  const out = [];
  let pos = 0;
  for (const tok of s.split(/[\s|]+/)) {
    if (!tok) continue;
    const m = /^(r|-?\d+):(\d+)([~^]*)$/.exec(tok);
    if (!m) continue;
    const len = +m[2];
    if (m[1] !== 'r') out.push({ pos, deg: +m[1], len, trem: m[3].includes('~'), grace: m[3].includes('^') });
    pos += len;
  }
  return { notes: out, len: pos };
}

const Music = {
  cur: null,
  name: '',
  step: 0,
  next: 0,
  gain: null,
  timer: null,
  intensity: 1,
  play(name, fade = 0.6) {
    if (!AudioSys.ok) {
      this.pending = name;
      return;
    }
    if (this.name === name && this.cur) return;
    this.stop(fade);
    const tr = TRACKS[name];
    if (!tr) return;
    const c = AudioSys.ctx;
    this.name = name;
    this.cur = Object.assign({}, tr, { m: parseMel(tr.mel), n: tr.ney ? parseMel(tr.ney) : null });
    this.scale = MAQAM[tr.maqam];
    this.gain = c.createGain();
    this.gain.gain.setValueAtTime(0.0001, c.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(1, c.currentTime + fade + 0.3);
    this.gain.connect(AudioSys.music);
    this.revG = c.createGain();
    this.revG.gain.value = tr.rev || 0.25;
    this.gain.connect(this.revG);
    this.revG.connect(AudioSys.revSend);
    this.step = 0;
    this.next = c.currentTime + 0.12;
    if (tr.drone) this.startDrone(tr);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  },
  stop(fade = 0.5) {
    if (!this.cur || !AudioSys.ok) {
      this.cur = null;
      this.name = '';
      return;
    }
    const c = AudioSys.ctx;
    const g = this.gain;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + fade);
    setTimeout(() => g.disconnect(), fade * 1000 + 200);
    if (this.drone) {
      for (const o of this.drone) try { o.stop(c.currentTime + fade); } catch (e) {}
      this.drone = null;
    }
    this.cur = null;
    this.name = '';
  },
  startDrone(tr) {
    const c = AudioSys.ctx;
    this.drone = [];
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 1.2;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.09;
    lg.gain.value = 180;
    lfo.connect(lg);
    lg.connect(lp.frequency);
    lfo.start();
    this.drone.push(lfo);
    const dg = c.createGain();
    dg.gain.value = 0.05;
    lp.connect(dg);
    dg.connect(this.gain);
    for (const d of tr.drone)
      for (const det of [-3, 3]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = degFreq(tr.root / 2, MAQAM[tr.maqam], d);
        o.detune.value = det;
        o.connect(lp);
        o.start();
        this.drone.push(o);
      }
  },
  tick() {
    if (!this.cur || !AudioSys.ok) return;
    const c = AudioSys.ctx;
    const tr = this.cur;
    const sixteenth = 60 / tr.bpm / 4;
    while (this.next < c.currentTime + 0.15) {
      this.schedule(this.step, this.next, sixteenth);
      this.step++;
      this.next += sixteenth;
    }
  },
  schedule(step, t, dt16) {
    const tr = this.cur;
    const out = this.gain;
    const bar = Math.floor(step / 16), s = step % 16;
    const iqa = IQA[tr.iqa] || IQA.none;
    const ch = iqa[s];
    const soft = tr.soft ? 0.6 : 1;
    const B = AudioSys.bufs;
    const hum = 1 + (Math.random() - 0.5) * 0.05;
    if (ch === 'D') playBuf(B.doum, { t, gain: 0.85 * soft, bus: out, rate: hum });
    if (ch === 'T') playBuf(B.tek, { t, gain: 0.35 * soft, bus: out, rate: hum, pan: 0.15 });
    if (ch === 'k') playBuf(B.ka, { t, gain: 0.22 * soft, bus: out, rate: hum, pan: -0.1 });
    if (ch === 'B') playBuf(B.daf, { t, gain: 0.7, bus: out });
    if (tr.riq && (s % 4 === 2 || (s % 2 === 1 && Math.random() < 0.3))) playBuf(B.riq, { t, gain: (s % 4 === 2 ? 0.12 : 0.05) * soft, bus: out, pan: -0.3 });
    if (tr.daf && s === 0) playBuf(B.daf, { t, gain: 0.6, bus: out });
    if (s === 0 && bar % 4 === 0) playBuf(B.zill, { t, gain: 0.25, bus: out, pan: 0.35 });
    // melody
    const m = tr.m;
    const pos = step % m.len;
    const scale = this.scale;
    for (const n of m.notes) {
      if (n.pos !== pos) continue;
      const f = degFreq(tr.root, scale, n.deg);
      const dur = n.len * dt16;
      if (tr.lead === 'ney') this.ney(f, t, dur, out);
      else {
        if (n.grace || (n.len >= 4 && Math.random() < 0.25)) pluck('oud', degFreq(tr.root, scale, n.deg + 1), { t: t - 0.035, gain: 0.25, bus: out, decay: 0.2 });
        pluck('oud', f, { t, gain: 0.5, bus: out, decay: Math.min(2, dur + 0.4) });
        if (n.trem) for (let k = 1; k < n.len; k++) pluck('oud', f, { t: t + k * dt16 * 0.5 + (k % 2) * dt16 * 0.5 - dt16 * 0.25 * (k % 2), gain: 0.18 + 0.12 * (k % 2), bus: out, decay: dt16 * 2 });
      }
    }
    if (tr.n) {
      const np = step % tr.n.len;
      for (const n of tr.n.notes) if (n.pos === np) this.ney(degFreq(tr.root, scale, n.deg), t, n.len * dt16, out, 0.06);
    }
    // accompaniment
    if (tr.acc === 'bass' && (ch === 'D' || (ch === 'T' && s === 8))) {
      const deg = bar % 4 === 3 && s >= 8 ? 4 : bar % 8 === 5 ? 3 : 0;
      pluck('bass', degFreq(tr.root / 2, scale, deg), { t, gain: 0.55 * soft, bus: out, decay: 0.8 });
    }
    if (tr.acc === 'arp' && s % tr.accEvery === 0) pluck('oud', degFreq(tr.root / 2, scale, [0, 4, 7, 4][(step / tr.accEvery) % 4 | 0]), { t, gain: 0.3, bus: out, decay: 1.6 });
    if (tr.acc === 'sparse' && s === 0 && bar % 2 === 0) pluck('bass', degFreq(tr.root / 2, scale, 0), { t, gain: 0.5, bus: out, decay: 2 });
    if (tr.counter === 'qanun' && s % 2 === 0 && bar % 2 === 1 && Math.random() < 0.55) {
      const deg = 7 + [0, 2, 4, 2, 1, 3, 5, 4][(s / 2) | 0];
      pluck('qanun', degFreq(tr.root, scale, deg), { t, gain: 0.12, bus: out, decay: 0.5, pan: 0.4 });
    }
  },
  // Breathy ney: sine + triangle partial, delayed vibrato, breath noise, glide in.
  ney(f, t, dur, out, vol = 0.12) {
    const c = AudioSys.ctx;
    const o = c.createOscillator(), o2 = c.createOscillator();
    o.type = 'sine';
    o2.type = 'triangle';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    o2.frequency.setValueAtTime(f * 2 * 0.985, t);
    o2.frequency.exponentialRampToValueAtTime(f * 2, t + 0.09);
    const vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 5.2;
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.6, dur * 0.6));
    vib.connect(vg);
    vg.connect(o.frequency);
    const g = c.createGain(), g2 = c.createGain();
    g2.gain.value = 0.12;
    const end = t + dur;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
    g.gain.setValueAtTime(vol * 0.85, Math.max(t + 0.08, end - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(out);
    // breath
    const nb = AudioSys.bufs.noise;
    const ns = c.createBufferSource();
    ns.buffer = nb;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2.2;
    bp.Q.value = 2.5;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.0001, end + 0.1);
    ns.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    for (const n of [o, o2, vib]) {
      n.start(t);
      n.stop(end + 0.2);
    }
    ns.start(t, Math.random());
    ns.stop(end + 0.2);
  },
  // One-shot musical phrases (victory, death, relic).
  phrase(kind) {
    if (!AudioSys.ok) return;
    const c = AudioSys.ctx;
    const t = c.currentTime + 0.02;
    const root = 146.83;
    const sc = kind === 'death' ? MAQAM.saba : MAQAM.hijaz;
    if (kind === 'victory') {
      [0, 1, 2, 3, 4, 5, 6, 7].forEach((d, i) => pluck('qanun', degFreq(root * 2, sc, d), { t: t + i * 0.07, gain: 0.3, decay: 0.8, rev: 0.4 }));
      [0, 4, 7].forEach((d) => pluck('oud', degFreq(root, sc, d), { t: t + 0.6, gain: 0.45, decay: 2, rev: 0.4 }));
      playBuf(AudioSys.bufs.zill, { t: t + 0.6, gain: 0.5, rev: 0.5 });
      playBuf(AudioSys.bufs.daf, { t: t + 0.6, gain: 0.7 });
    } else if (kind === 'death') {
      [4, 3, 2, 1, 0].forEach((d, i) => pluck('oud', degFreq(root, sc, d), { t: t + i * 0.22, gain: 0.45, decay: 1.2, rev: 0.6 }));
      playBuf(AudioSys.bufs.daf, { t, gain: 0.8, rev: 0.5 });
    } else if (kind === 'relic') {
      [0, 2, 4, 7, 9, 11, 14].forEach((d, i) => pluck('qanun', degFreq(root * 2, sc, d), { t: t + i * 0.05, gain: 0.25, decay: 1, rev: 0.6 }));
      playBuf(AudioSys.bufs.zill, { t: t + 0.3, gain: 0.45, rev: 0.6 });
    }
  },
};

// ---------------------------------------------------------------------------
// Sound effects
const Sfx = {
  last: {},
  coinCombo: 0,
  coinT: 0,
  play(name, vol = 1) {
    if (!AudioSys.ok) return;
    const c = AudioSys.ctx;
    const now = c.currentTime;
    // rate-limit identical sounds
    if (this.last[name] && now - this.last[name] < 0.03) return;
    this.last[name] = now;
    const fn = SFX[name];
    if (fn) fn(vol, now);
  },
};
const SFX = {
  jump: (v) => {
    tone('triangle', 260, 520, 0.09, { gain: 0.12 * v });
    noise(0.08, { bp: 1200, sweep: 3000, gain: 0.08 * v });
  },
  walljump: (v) => {
    tone('triangle', 330, 640, 0.08, { gain: 0.12 * v });
    noise(0.04, { lp: 1800, gain: 0.25 * v });
  },
  land: (v) => {
    tone('sine', 140, 55, 0.1, { gain: 0.35 * v });
    noise(0.06, { lp: 700, gain: 0.25 * v });
  },
  step: (v) => noise(0.03, { lp: 900, gain: 0.07 * v, rate: rnd(0.8, 1.2) }),
  slide: (v) => noise(0.12, { bp: 1600, gain: 0.05 * v }),
  grab: (v) => {
    pluck('bass', 98, { gain: 0.25 * v, decay: 0.3 });
    noise(0.05, { bp: 2500, gain: 0.08 * v });
  },
  climb: (v) => noise(0.06, { lp: 1200, gain: 0.12 * v }),
  roll: (v) => noise(0.24, { bp: 600, sweep: 2400, sweepT: 0.24, q: 1.4, gain: 0.22 * v }),
  whoosh: (v) => noise(0.08, { bp: 900, sweep: 2600, sweepT: 0.08, q: 1.2, gain: 0.14 * v }),
  crack: (v) => {
    playBuf(AudioSys.bufs.crack, { hp: 1400, gain: 0.55 * v, rev: 0.15, rate: rnd(0.95, 1.08) });
    tone('square', 1800, 900, 0.015, { gain: 0.08 * v });
  },
  hit: (v) => {
    noise(0.08, { lp: 2200, gain: 0.45 * v });
    tone('sine', 220, 90, 0.1, { gain: 0.35 * v });
  },
  pogo: (v) => {
    SFX.hit(v * 0.7);
    tone('triangle', 400, 900, 0.1, { gain: 0.12 * v });
  },
  latch: (v) => {
    tone('sine', 1800, 1750, 0.12, { gain: 0.12 * v });
    tone('sine', 2710, 2700, 0.09, { gain: 0.08 * v });
    tone('sawtooth', 110, 90, 0.12, { gain: 0.05 * v, lp: 600 });
  },
  release: (v) => noise(0.15, { bp: 800, sweep: 3200, sweepT: 0.15, gain: 0.15 * v }),
  bounce: (v) => tone('sine', 180, 420, 0.22, { gain: 0.3 * v, vib: 18, vibDepth: 30 }),
  hurt: (v) => {
    tone('sawtooth', 220, 70, 0.25, { gain: 0.25 * v, lp: 900 });
    noise(0.12, { lp: 1500, gain: 0.35 * v });
  },
  spike: (v) => {
    tone('square', 900, 300, 0.08, { gain: 0.1 * v });
    SFX.hurt(v);
  },
  fall: (v) => tone('sine', 900, 160, 0.45, { gain: 0.2 * v }),
  death: () => Music.phrase('death'),
  coin: (v) => {
    const now = AudioSys.ctx.currentTime;
    Sfx.coinCombo = now - Sfx.coinT < 0.45 ? Math.min(Sfx.coinCombo + 1, 14) : 0;
    Sfx.coinT = now;
    const f = degFreq(880, MAQAM.hijaz, Sfx.coinCombo);
    tone('sine', f, f, 0.22, { gain: 0.12 * v });
    tone('sine', f * 1.5, f * 1.5, 0.12, { gain: 0.06 * v });
  },
  gem: (v) => [0, 2, 4].forEach((d, i) => tone('sine', degFreq(1046, MAQAM.hijaz, d), 0, 0.3, { gain: 0.1 * v, t: AudioSys.ctx.currentTime + i * 0.05, rev: 0.3 })),
  tink: (v) => tone('sine', 3200, 3000, 0.04, { gain: 0.05 * v }),
  heal: (v) => {
    tone('sine', 420, 660, 0.3, { gain: 0.15 * v, attack: 0.05, rev: 0.4 });
    tone('sine', 1320, 1320, 0.25, { gain: 0.05 * v, t: AudioSys.ctx.currentTime + 0.1 });
  },
  relic: () => Music.phrase('relic'),
  checkpoint: (v) => {
    noise(0.5, { lp: 300, sweep: 3000, sweepT: 0.4, gain: 0.3 * v });
    const t = AudioSys.ctx.currentTime + 0.1;
    [0, 4, 7].forEach((d, i) => pluck('oud', degFreq(146.83, MAQAM.hijaz, d), { t: t + i * 0.04, gain: 0.35 * v, decay: 1.6, rev: 0.4 }));
  },
  pot: (v) => {
    for (let i = 0; i < 4; i++) noise(0.05, { hp: 2500 + i * 900, gain: 0.18 * v, t: AudioSys.ctx.currentTime + i * 0.025 });
    tone('sine', 2600, 2400, 0.08, { gain: 0.05 * v });
  },
  lever: (v) => {
    noise(0.1, { lp: 600, gain: 0.4 * v });
    tone('square', 160, 120, 0.12, { gain: 0.08 * v, lp: 800 });
  },
  gate: (v) => {
    noise(1.0, { lp: 260, gain: 0.45 * v });
    tone('sawtooth', 55, 50, 1.0, { gain: 0.06 * v, lp: 200 });
  },
  crumble: (v) => {
    for (let i = 0; i < 5; i++) noise(0.04, { bp: 900 + Math.random() * 800, gain: 0.15 * v, t: AudioSys.ctx.currentTime + i * 0.06 });
  },
  rockfall: (v) => {
    noise(0.25, { lp: 900, gain: 0.45 * v });
    tone('sine', 90, 40, 0.25, { gain: 0.3 * v });
  },
  dart: (v) => {
    tone('sine', 2200, 1600, 0.12, { gain: 0.06 * v });
    noise(0.05, { hp: 3000, gain: 0.1 * v });
  },
  swish: (v) => noise(0.12, { bp: 1200, sweep: 4200, sweepT: 0.1, q: 2, gain: 0.2 * v }),
  flame: (v) => noise(0.6, { lp: 400, sweep: 1600, sweepT: 0.3, gain: 0.3 * v }),
  rumble: (v) => noise(1.8, { lp: 140, gain: 0.8 * v }),
  boom: (v) => {
    noise(1.0, { lp: 500, gain: 0.7 * v });
    tone('sine', 70, 30, 1.0, { gain: 0.5 * v });
  },
  deflect: (v) => {
    tone('sine', 2500, 2400, 0.1, { gain: 0.12 * v });
    tone('sine', 3700, 3650, 0.08, { gain: 0.07 * v });
  },
  thunk: (v) => {
    tone('sine', 320, 140, 0.06, { gain: 0.2 * v });
    noise(0.02, { lp: 2000, gain: 0.15 * v });
  },
  clank: (v) => [810, 1330, 2120].forEach((f) => tone('triangle', f, f * 0.98, 0.18, { gain: 0.08 * v })),
  enemyDie: (v) => {
    noise(0.28, { bp: 1500, sweep: 250, sweepT: 0.28, q: 1, gain: 0.35 * v });
    tone('sine', 160, 60, 0.18, { gain: 0.25 * v });
  },
  alert: (v) => {
    tone('square', 620, 620, 0.05, { gain: 0.05 * v, lp: 2000 });
    tone('square', 930, 930, 0.07, { gain: 0.05 * v, lp: 2000, t: AudioSys.ctx.currentTime + 0.06 });
  },
  bow: (v) => {
    pluck('bass', 82, { gain: 0.3 * v, decay: 0.25 });
    noise(0.1, { bp: 1800, gain: 0.08 * v });
  },
  hiss: (v) => noise(0.3, { hp: 4000, gain: 0.12 * v }),
  spit: (v) => noise(0.08, { bp: 700, gain: 0.25 * v }),
  screech: (v) => tone('sawtooth', 1100, 700, 0.35, { gain: 0.06 * v, vib: 30, vibDepth: 80, lp: 2500 }),
  flap: (v) => {
    noise(0.05, { lp: 900, gain: 0.12 * v });
    noise(0.05, { lp: 900, gain: 0.1 * v, t: AudioSys.ctx.currentTime + 0.1 });
  },
  groan: (v) => tone('sawtooth', 92, 76, 0.7, { gain: 0.1 * v, lp: 420, vib: 4, vibDepth: 5, attack: 0.1 }),
  growl: (v) => {
    tone('sawtooth', 70, 60, 0.45, { gain: 0.12 * v, lp: 380, vib: 22, vibDepth: 6 });
    noise(0.3, { lp: 500, gain: 0.08 * v });
  },
  bolt: (v) => {
    tone('square', 1200, 260, 0.18, { gain: 0.08 * v, lp: 3000 });
    noise(0.1, { bp: 2000, gain: 0.08 * v });
  },
  menu: (v) => pluck('qanun', 1174.66, { gain: 0.16 * v, decay: 0.25 }),
  select: (v) => {
    pluck('oud', 293.66, { gain: 0.4 * v, decay: 0.8 });
    pluck('oud', 440, { gain: 0.25 * v, decay: 0.8, t: AudioSys.ctx.currentTime + 0.03 });
  },
  back: (v) => pluck('oud', 196, { gain: 0.35 * v, decay: 0.5 }),
  pause: (v) => {
    pluck('qanun', 880, { gain: 0.15 * v, decay: 0.3 });
    pluck('qanun', 587, { gain: 0.15 * v, decay: 0.4, t: AudioSys.ctx.currentTime + 0.07 });
  },
  banner: (v) => {
    playBuf(AudioSys.bufs.zill, { gain: 0.35 * v, rev: 0.4 });
    playBuf(AudioSys.bufs.daf, { gain: 0.6 * v });
  },
  buy: (v) => {
    SFX.coin(v);
    SFX.gem(v);
  },
  denied: (v) => tone('square', 180, 140, 0.15, { gain: 0.08 * v, lp: 800 }),
  roar: (v) => {
    tone('sawtooth', 120, 50, 1.1, { gain: 0.22 * v, lp: 600, vib: 12, vibDepth: 10, attack: 0.05 });
    noise(1.0, { lp: 700, gain: 0.35 * v });
  },
  slam: (v) => {
    tone('sine', 80, 30, 0.5, { gain: 0.5 * v });
    noise(0.4, { lp: 800, gain: 0.5 * v });
  },
  laser: (v) => tone('sawtooth', 300, 320, 1.2, { gain: 0.07 * v, lp: 1600, vib: 40, vibDepth: 20 }),
  magic: (v) => [0, 3, 7, 10].forEach((d, i) => tone('sine', degFreq(660, MAQAM.saba, d), 0, 0.3, { gain: 0.07 * v, t: AudioSys.ctx.currentTime + i * 0.04, rev: 0.5 })),
};

// Level ambience beds.
const Ambience = {
  nodes: null,
  play(kind) {
    this.stop();
    if (!AudioSys.ok || !kind) return;
    const c = AudioSys.ctx;
    const src = c.createBufferSource();
    src.buffer = AudioSys.bufs.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const lfo = c.createOscillator(), lg = c.createGain();
    f.type = kind === 'desert' ? 'bandpass' : 'lowpass';
    f.frequency.value = kind === 'desert' ? 500 : kind === 'bazaar' ? 700 : 180;
    f.Q.value = kind === 'desert' ? 0.7 : 0.5;
    g.gain.value = kind === 'desert' ? 0.1 : kind === 'bazaar' ? 0.035 : 0.06;
    lfo.frequency.value = 0.13;
    lg.gain.value = kind === 'desert' ? 300 : 60;
    lfo.connect(lg);
    lg.connect(f.frequency);
    src.connect(f);
    f.connect(g);
    g.connect(AudioSys.sfx);
    src.start();
    lfo.start();
    this.nodes = { src, lfo, g, f, kind };
    this.kind = kind;
    this.evT = 1;
  },
  setStorm(s) {
    if (!this.nodes || this.kind !== 'desert') return;
    const c = AudioSys.ctx;
    this.nodes.g.gain.setTargetAtTime(0.1 + s * 0.35, c.currentTime, 0.4);
  },
  update(dt) {
    if (!this.nodes) return;
    this.evT -= dt;
    if (this.evT > 0) return;
    this.evT = rnd(0.6, 2.5);
    if (this.kind === 'tomb') {
      const f = rnd(1800, 3200);
      tone('sine', f, f * 0.7, 0.08, { gain: 0.03, rev: 0.9 });
    } else if (this.kind === 'andor') {
      tone('sine', rnd(400, 800), 0, 1.2, { gain: 0.012, attack: 0.4, rev: 0.8 });
    } else if (this.kind === 'bazaar' && Math.random() < 0.5) {
      // distant voices: vowel-like formant blips
      tone('sawtooth', rnd(160, 240), rnd(140, 220), rnd(0.15, 0.35), { gain: 0.012, lp: 900, attack: 0.03 });
    }
  },
  stop() {
    if (!this.nodes) return;
    try {
      this.nodes.src.stop();
      this.nodes.lfo.stop();
    } catch (e) {}
    this.nodes = null;
  },
};

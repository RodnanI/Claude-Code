// ---------------------------------------------------------------------------
// Music: a look-ahead sequencer playing patterns written in jianpu (Chinese
// numbered notation). 1..7 are scale degrees, ' raises and , lowers an
// octave, - holds, 0 rests. Drum lanes use x (hit), X (accent), . (rest).
// Instruments: guzheng and pipa (Karplus-Strong), dizi, erhu, bass, taiko,
// woodblock, small cymbal, gong.
// ---------------------------------------------------------------------------
const Music = {
  bufs: {}, cur: null, timer: null, step: 0, next: 0, vol: 1, ready: false,
  prepare() {
    const A = AudioSys, ctx = A.ctx;
    // Karplus-Strong plucks rendered once per MIDI note
    const sr = 22050;
    for (let m = 38; m <= 91; m++) {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      for (const kind of ['zheng', 'pipa']) {
        const dur = kind === 'zheng' ? 2.2 : 0.9, len = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / f));
        const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
        const decay = kind === 'zheng' ? 0.996 : 0.985, bright = kind === 'zheng' ? 0.5 : 0.62;
        const dl = new Float32Array(N);
        for (let i = 0; i < N; i++) dl[i] = (Math.random() * 2 - 1) * (i < N * 0.5 ? 1 : 0.6);
        let p = 0, prev = 0;
        for (let i = 0; i < len; i++) {
          const nx = (p + 1) % N;
          const v = dl[p];
          dl[p] = decay * (bright * v + (1 - bright) * dl[nx]);
          d[i] = v * 0.5 + prev * 0.5; prev = v;
          p = nx;
        }
        this.bufs[kind + m] = b;
      }
    }
    this.ready = true;
  },
  play(name) {
    if (!AudioSys.ready) { this.pending = name; return; }
    if (this.cur && this.cur.name === name) return;
    this.stop(0.6);
    const S = SONGS[name];
    if (!S) return;
    const A = AudioSys;
    this.bus = A.ctx.createGain();
    this.bus.gain.setValueAtTime(0.0001, A.ctx.currentTime);
    this.bus.gain.exponentialRampToValueAtTime(1, A.ctx.currentTime + 1.2);
    this.bus.connect(A.mus);
    this.cur = { name, S, seq: expandSong(S) };
    this.step = 0; this.next = A.ctx.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 25);
  },
  stop(fade = 0.8) {
    clearInterval(this.timer); this.timer = null;
    if (this.bus && AudioSys.ctx) {
      const b = this.bus, t = AudioSys.ctx.currentTime;
      b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value || 0.001, t); b.gain.exponentialRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => b.disconnect(), fade * 1000 + 100);
    }
    this.bus = null; this.cur = null;
  },
  tick() {
    const A = AudioSys, C = this.cur;
    if (!C) return;
    const spb = 60 / C.S.bpm / 2;
    while (this.next < A.ctx.currentTime + 0.15) {
      const st = this.step % C.seq.len;
      const swing = C.S.swing && st % 2 ? spb * C.S.swing : 0;
      for (const tr of C.seq.tracks) {
        const ev = tr.steps[st];
        if (ev) playInst(tr.inst, ev, this.next + swing, spb, tr.vol, C.S.key, this.bus);
      }
      this.next += spb; this.step++;
    }
  },
};

const SCALE = [0, 2, 4, 5, 7, 9, 11];
function parseTok(tok, key) {
  const deg = parseInt(tok[0], 10);
  if (!deg) return null;
  let oct = 0;
  for (const c of tok.slice(1)) { if (c === "'") oct++; if (c === ',') oct--; }
  const sharp = tok.includes('#') ? 1 : 0;
  return key + SCALE[deg - 1] + oct * 12 + sharp;
}
// song -> flat per-step events with note lengths resolved from holds
function expandSong(S) {
  const tracks = [];
  let len = 0;
  for (const tr of S.tracks) {
    const toks = [];
    for (const sec of S.order) for (const bar of (tr.parts[sec] || tr.parts.A)) toks.push(...bar.trim().split(/\s+/));
    len = Math.max(len, toks.length);
    const steps = new Array(toks.length).fill(null);
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t === '-' || t === '0' || t === '.') continue;
      if (/^[xXoO]$/.test(t)) { steps[i] = { hit: t }; continue; }
      let hold = 1;
      while (toks[i + hold] === '-') hold++;
      steps[i] = { note: t, hold };
    }
    tracks.push({ inst: tr.inst, vol: tr.vol || 1, steps });
  }
  for (const t of tracks) while (t.steps.length < len) t.steps.push(...t.steps.slice(0, len - t.steps.length));
  return { tracks, len };
}

function playInst(inst, ev, t, spb, vol, key, bus) {
  const A = AudioSys, ctx = A.ctx;
  if (ev.hit) {
    const acc = ev.hit === 'X' || ev.hit === 'O' ? 1.4 : 1;
    const g = (peak) => peak * vol * acc;
    if (inst === 'taiko') { aOsc('sine', 90, t, 0.45, g(0.7), { f1: 42, dest: bus }); aNoise(t, 0.05, g(0.25), 'lowpass', 500, { dest: bus }); }
    else if (inst === 'tom') aOsc('sine', 190, t, 0.18, g(0.35), { f1: 110, dest: bus });
    else if (inst === 'wood') { aOsc('sine', 1100, t, 0.05, g(0.22), { f1: 900, dest: bus }); aNoise(t, 0.015, g(0.1), 'bandpass', 2000, { dest: bus }); }
    else if (inst === 'bo') aNoise(t, 0.2, g(0.1), 'highpass', 6000, { dest: bus });
    else if (inst === 'gong') aMetal(t, 98, [1, 1.48, 1.93, 2.53], 2.4, g(0.2), { verb: 1 });
    return;
  }
  const m = parseTok(ev.note, key);
  if (m === null) return;
  const f = 440 * Math.pow(2, (m - 69) / 12), dur = ev.hold * spb;
  if (inst === 'zheng' || inst === 'pipa' || inst === 'tremolo') {
    const b = Music.bufs[(inst === 'zheng' ? 'zheng' : 'pipa') + clamp(m, 38, 91)];
    if (!b) return;
    const reps = inst === 'tremolo' ? Math.max(1, Math.round(dur / 0.07)) : 1;
    for (let r = 0; r < reps; r++) {
      const s = ctx.createBufferSource(); s.buffer = b;
      const g = ctx.createGain(); g.gain.value = 0.9 * vol * (r ? 0.6 : 1);
      s.connect(g); g.connect(bus); if (inst === 'zheng') g.connect(A.verb);
      const tt = t + r * 0.07;
      s.start(tt);
      if (inst === 'zheng' && ev.hold >= 3) { s.playbackRate.setValueAtTime(1, tt + 0.25); s.playbackRate.linearRampToValueAtTime(1.012, tt + 0.5); s.playbackRate.linearRampToValueAtTime(0.996, tt + 0.8); }
      s.stop(tt + (inst === 'zheng' ? 2.2 : 0.9));
    }
    return;
  }
  const osc = ctx.createOscillator(), g = ctx.createGain(), flt = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  osc.frequency.value = f;
  lfo.frequency.value = inst === 'erhu' ? 5.6 : 5; lg.gain.value = 0;
  lfo.connect(lg); lg.connect(osc.frequency);
  osc.connect(flt); flt.connect(g); g.connect(bus); g.connect(A.verb);
  let peak = 0.12 * vol, a = 0.03, rel = 0.12;
  if (inst === 'erhu') { osc.type = 'sawtooth'; flt.type = 'bandpass'; flt.frequency.value = f * 2.2; flt.Q.value = 0.9; a = 0.09; peak = 0.16 * vol; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.5)); }
  else if (inst === 'dizi') { osc.type = 'triangle'; flt.type = 'lowpass'; flt.frequency.value = f * 4; a = 0.04; peak = 0.14 * vol; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(dur, 0.4)); aNoise(t, Math.min(dur, 0.12), 0.02 * vol, 'bandpass', f * 2, { q: 2, dest: bus }); }
  else if (inst === 'bass') { osc.type = 'triangle'; flt.type = 'lowpass'; flt.frequency.value = 400; peak = 0.22 * vol; a = 0.01; }
  else if (inst === 'drone') { osc.type = 'sawtooth'; flt.type = 'lowpass'; flt.frequency.value = 300; peak = 0.07 * vol; a = 0.4; rel = 0.6; }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  osc.start(t); lfo.start(t);
  osc.stop(t + dur + rel + 0.05); lfo.stop(t + dur + rel + 0.05);
}

// key: MIDI root of degree 1
const SONGS = {
  title: {
    bpm: 66, key: 62, order: ['A', 'B'],
    tracks: [
      { inst: 'zheng', vol: 0.7, parts: {
        A: ['1, 5, 1 3 5 3 1 5,', '6,, 3, 6, 1 3 1 6, 3,', '2, 6, 2 5 6 5 2 6,', '5,, 2, 5, 6, 2 6, 5, 2,'],
        B: ['1, 5, 1 3 5 3 1 5,', '3, 1 3 5 6 5 3 1', '6,, 3, 6, 1 2 1 6, 3,', '1, 5, 1 3 1 - - -'] } },
      { inst: 'dizi', vol: 0.8, parts: {
        A: ['0 0 0 0 3 - 5 6', "1' - 6 5 3 - - -", "2 - 3 5 6 - 1' 6", '5 - - - - - - -'],
        B: ["3' - 2' 1' 6 - 5 6", "1' - - - 6 5 3 5", '6 - 5 3 2 - 3 2', '1 - - - - - - -'] } },
      { inst: 'bass', vol: 0.6, parts: { A: ['1,, - - - - - - -', '6,,, - - - - - - -', '2,, - - - - - - -', '5,,, - - - - - - -'], B: ['1,, - - - - - - -', '3,, - - - - - - -', '6,,, - - - - - - -', '1,, - - - - - - -'] } },
    ],
  },
  peak: {
    bpm: 92, key: 62, order: ['A', 'A', 'B', 'A'],
    tracks: [
      { inst: 'zheng', vol: 0.55, parts: {
        A: ['1, 5, 1 3 5 3 1 5,', '6,, 3, 6, 1 3 1 6, 3,', '2, 6, 2 5 6 5 2 6,', '5,, 2, 5, 6, 2 6, 5, 2,'],
        B: ['6,, 3, 6, 1 3 1 6, 3,', '5,, 2, 5, 6, 2 6, 5, 2,', '1, 5, 1 3 5 3 1 5,', '2, 6, 2 5 6 5 2 6,'] } },
      { inst: 'dizi', vol: 0.8, parts: {
        A: ["3 - 5 6 1' - 6 5", '3 - 2 3 5 - - -', "6 - 1' 2' 3' - 2' 1'", "6 - 5 6 1' - - -"],
        B: ['5 - 3 5 6 - 5 3', '2 - 1 2 3 - - -', '5 6 1\' 6 5 3 2 3', '1 - - - 0 0 0 0'] } },
      { inst: 'bass', vol: 0.55, parts: { A: ['1,, - - - 1,, - 5,, -', '6,,, - - - 6,,, - 3,, -', '2,, - - - 2,, - 6,,, -', '5,,, - - - 5,,, - 2,, -'], B: ['6,,, - - - 6,,, - 3,, -', '5,,, - - - 5,,, - 2,, -', '1,, - - - 1,, - 5,, -', '2,, - - - 2,, - 6,,, -'] } },
      { inst: 'taiko', vol: 0.5, parts: { A: ['X . . . x . . .', 'X . . . x . x .', 'X . . . x . . .', 'X . . x x . x .'] } },
      { inst: 'wood', vol: 0.5, parts: { A: ['. . x . . . x .', '. . x . . x x .', '. . x . . . x .', '. . x . . x . x'] } },
    ],
  },
  bamboo: {
    bpm: 84, key: 57, order: ['A', 'B', 'A', 'B'],
    tracks: [
      { inst: 'zheng', vol: 0.5, parts: {
        A: ['6,, 3, 6, - 1 - 6, -', '5,, 2, 5, - 6, - 5, -', '6,, 3, 6, - 1 - 3 -', '5,, 2, 5, - 3, - 2, -'],
        B: ['3, 7,, 3, - 5, - 3, -', '2, 6,, 2, - 5, - 2, -', '6,, 3, 6, - 1 - 6, -', '3, - - - 6,, - - -'] } },
      { inst: 'dizi', vol: 0.75, parts: {
        A: ['6 - - 5 3 - - -', '2 - 3 5 3 - 2 -', "1 - 2 3 6 - 5 -", '3 - - - - - 0 0'],
        B: ["6 - 1' - 2' - 1' 6", '5 - 6 - 5 3 2 -', '3 - 5 3 2 1 6, -', '6, - - - - - - -'] } },
      { inst: 'wood', vol: 0.4, parts: { A: ['x . . . . . x .', '. . x . . . . .', 'x . . . . . x .', '. . x . x . . .'] } },
      { inst: 'drone', vol: 0.8, parts: { A: ['6,, - - - - - - -', '5,, - - - - - - -', '6,, - - - - - - -', '3,, - - - - - - -'] } },
    ],
  },
  town: {
    bpm: 116, key: 55, order: ['A', 'A', 'B', 'B'], swing: 0.12,
    tracks: [
      { inst: 'pipa', vol: 0.6, parts: {
        A: ['1 3 5 3 6 5 3 5', '2 3 5 6 5 3 2 3', '1 3 5 6 1\' 6 5 3', '2 3 2 1 6, 1 2 -'],
        B: ['5 6 1\' 2\' 1\' 6 5 6', '3 5 6 5 3 2 1 2', '5 6 1\' 6 5 3 2 3', '1 - 5, - 1 - - -'] } },
      { inst: 'erhu', vol: 0.7, parts: {
        A: ['5 - - 6 1\' - 6 5', '3 - 5 - 2 - - -', '5 - 6 1\' 2\' - 1\' 6', '5 - - - 3 - - -'],
        B: ['1\' - 2\' 3\' 2\' - 1\' 6', '5 - 6 5 3 - - -', '6 - 5 3 2 - 3 5', '1 - - - - - - -'] } },
      { inst: 'bass', vol: 0.6, parts: { A: ['1,, - 5,, - 1,, - 5,, -', '2,, - 6,,, - 2,, - 5,, -', '1,, - 5,, - 6,,, - 3,, -', '2,, - 5,, - 1,, - - -'] } },
      { inst: 'taiko', vol: 0.45, parts: { A: ['X . . x . . x .', 'X . . x . x . .', 'X . . x . . x .', 'X . x . X . . .'] } },
      { inst: 'bo', vol: 0.6, parts: { A: ['. . x . . . x .', '. . x . . . x .', '. . x . . . x .', '. . x . x x . .'] } },
      { inst: 'wood', vol: 0.4, parts: { A: ['x . x x . x x .', 'x . x x . x x .', 'x . x x . x x .', 'x . x x x . x .'] } },
    ],
  },
  fort: {
    bpm: 70, key: 52, order: ['A', 'B'],
    tracks: [
      { inst: 'erhu', vol: 0.8, parts: {
        A: ['6, - - - 7, - 1 -', '7, - - 6, 5, - - -', '6, - 1 - 2 - 3 -', '2 - 1 7, 6, - - -'],
        B: ['3 - - - 4# - 3 -', '2 - - 1 7, - - -', '6, - 7, 1 2 - 1 7,', '6, - - - - - - -'] } },
      { inst: 'drone', vol: 1, parts: { A: ['6,, - - - - - - -', '6,, - - - - - - -', '4,, - - - - - - -', '3,, - - - - - - -'] } },
      { inst: 'taiko', vol: 0.7, parts: { A: ['X . . . . . . .', 'x . . . X . . .', 'X . . . . . . .', 'x . . x X . . .'] } },
      { inst: 'pipa', vol: 0.35, parts: { A: ['6,, 0 0 0 6,, 0 0 0', '0 0 0 0 6,, 0 7,, 0', '4,, 0 0 0 4,, 0 0 0', '3,, 0 0 0 3,, 0 3,, 0'] } },
    ],
  },
  boss: {
    bpm: 138, key: 52, order: ['A', 'A', 'B', 'A'],
    tracks: [
      { inst: 'taiko', vol: 0.8, parts: { A: ['X . x . X . x x', 'X . x . X x . x', 'X . x . X . x x', 'X x X x X . X .'] } },
      { inst: 'tom', vol: 0.6, parts: { A: ['. x . x . x . .', '. x . x . . x .', '. x . x . x . .', '. . . . x x x x'] } },
      { inst: 'tremolo', vol: 0.4, parts: { A: ['6, - - - 6, - - -', '5, - - - 5, - - -', '4, - - - 4, - - -', '3, - - - 3, - 5, -'], B: ['1 - - - 1 - - -', '7, - - - 7, - - -', '6, - - - 6, - - -', '3, - - - 7, - - -'] } },
      { inst: 'erhu', vol: 0.75, parts: {
        A: ['6 - 7 1\' 7 - 6 5', '6 - - - 3 - - -', '4 - 5 6 5 - 4 3', '2 - 3 - 3 - - -'],
        B: ['1\' - 2\' 3\' 2\' - 1\' 7', '1\' - 7 6 7 - - -', '6 - 7 1\' 3\' - 2\' 1\'', '7 - - - 7 - 6 5'] } },
      { inst: 'bass', vol: 0.7, parts: { A: ['6,,, 6,,, 0 6,,, 6,,, 0 6,,, 0', '5,,, 5,,, 0 5,,, 5,,, 0 5,,, 0', '4,,, 4,,, 0 4,,, 4,,, 0 4,,, 0', '3,,, 3,,, 0 3,,, 7,,, 0 7,,, 0'] } },
      { inst: 'bo', vol: 0.5, parts: { A: ['x . . . x . . .', 'x . . . x . . .', 'x . . . x . . .', 'x . x . x . x .'] } },
    ],
  },
  final: {
    bpm: 126, key: 50, order: ['A', 'B', 'A', 'C'],
    tracks: [
      { inst: 'taiko', vol: 0.85, parts: { A: ['X . . x X . . x', 'X . . x X . x x', 'X . . x X . . x', 'X . X . X X X X'] } },
      { inst: 'gong', vol: 0.6, parts: { A: ['X . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'], C: ['X . . . . . . .', '. . . . . . . .', 'X . . . . . . .', '. . . . . . . .'] } },
      { inst: 'tremolo', vol: 0.4, parts: { A: ['6, - - - 6, - - -', '6, - - - 5, - - -', '4, - - - 4, - - -', '3, - - - 3, - - -'], B: ['2 - - - 2 - - -', '1 - - - 1 - - -', '7, - - - 7, - - -', '3, - - - 3, - - -'] } },
      { inst: 'erhu', vol: 0.85, parts: {
        A: ['6 - - 7 1\' - 7 6', '3\' - - 2\' 1\' - - -', '7 - 6 5 4 - 5 6', '3 - - - - - - -'],
        B: ['2\' - 3\' - 4\' - 3\' 2\'', '1\' - 7 - 6 - - -', '7 - 1\' 2\' 1\' 7 6 5', '6 - - - 7 - - -'],
        C: ['6\' - 5\' 3\' 2\' - 1\' 7', '6 - 7 1\' 3\' - - -', '2\' - 1\' 7 6 - 5 3', '6 - - - - - - -'] } },
      { inst: 'drone', vol: 0.9, parts: { A: ['6,, - - - - - - -', '6,, - - - - - - -', '4,, - - - - - - -', '3,, - - - - - - -'], B: ['2, - - - - - - -', '1, - - - - - - -', '7,, - - - - - - -', '3,, - - - - - - -'] } },
    ],
  },
  sorrow: {
    bpm: 58, key: 52, order: ['A'],
    tracks: [
      { inst: 'erhu', vol: 0.85, parts: { A: ['3 - - - 2 - 1 -', '6, - - - - - 7, 1', '2 - - 3 2 - 1 7,', '6, - - - - - - -'] } },
      { inst: 'drone', vol: 0.8, parts: { A: ['6,, - - - - - - -', '4,, - - - - - - -', '5,, - - - - - - -', '6,, - - - - - - -'] } },
      { inst: 'gong', vol: 0.5, parts: { A: ['X . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . . . . .'] } },
    ],
  },
  dawn: {
    bpm: 72, key: 62, order: ['A', 'B'],
    tracks: [
      { inst: 'zheng', vol: 0.6, parts: {
        A: ['1, 5, 1 3 5 3 1 5,', '4, 1 4 6 1\' 6 4 1', '6,, 3, 6, 1 3 1 6, 3,', '5,, 2, 5, 6, 2 6, 5, 2,'],
        B: ['1, 5, 1 3 5 3 1 5,', '4, 1 4 6 1\' 6 4 1', '5,, 2, 5, 6, 2 6, 5, 2,', '1, 5, 1 3 5 - - -'] } },
      { inst: 'dizi', vol: 0.8, parts: {
        A: ['5 - 6 1\' 2\' - 1\' 6', '1\' - - - 6 - 5 -', '6 - 5 3 2 - 3 5', '2 - - - - - - -'],
        B: ['3\' - 2\' 1\' 6 - 5 6', '1\' - - - 2\' 3\' 2\' 1\'', '6 - 5 6 2 - 3 2', '1 - - - - - - -'] } },
      { inst: 'bass', vol: 0.5, parts: { A: ['1,, - - - - - - -', '4,, - - - - - - -', '6,,, - - - - - - -', '5,,, - - - - - - -'], B: ['1,, - - - - - - -', '4,, - - - - - - -', '5,,, - - - - - - -', '1,, - - - - - - -'] } },
    ],
  },
};

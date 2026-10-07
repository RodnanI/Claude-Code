/* Palimpsest / music
   Every people has a mode, a pulse and an instrument, grown from the same seed
   as its words. While the years pass you hear whoever holds the most land;
   when the land changes hands, the music does too. Wars, plagues and the
   falls of realms leave their own sounds. Nothing is sampled: plucked strings
   are Karplus-Strong, reeds and bells are oscillators, the hall is noise. */
'use strict';
(function () {
  const P = window.P;

  const MODES = [
    { name: 'a five-note mode with a minor heart', cents: [0, 300, 500, 700, 1000] },
    { name: 'a bright five-note mode', cents: [0, 200, 400, 700, 900] },
    { name: 'a seven-note mode with a raised sixth', cents: [0, 200, 300, 500, 700, 900, 1000] },
    { name: 'a dark mode with a low second', cents: [0, 100, 300, 500, 700, 800, 1000] },
    { name: 'a mode with a wide step of three half-tones', cents: [0, 100, 400, 500, 700, 800, 1000] },
    { name: 'five nearly equal steps', cents: [0, 240, 480, 720, 960] },
    { name: 'seven unequal steps, none of them ours', cents: [0, 120, 270, 540, 670, 790, 950] },
    { name: 'seven steps with neutral thirds', cents: [0, 200, 350, 500, 700, 850, 1050] },
    { name: 'a mode tuned by pure ratios', cents: [1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 5 / 3, 15 / 8].map((r) => 1200 * Math.log2(r)) },
  ];
  const INSTR_DESC = { pluck: 'a plucked string', reed: 'a double reed', bell: 'struck bronze', flute: 'a cane flute' };

  function voice(c) {
    if (c.music) return c.music;
    const r = c.rng.fork('music');
    const mode = r.pick(MODES);
    const m = {
      mode, tonic: r.range(98, 150), bpm: r.range(54, 96), meter: r.pick([3, 4, 4, 5, 6, 7]),
      instr: r.weighted([['pluck', 4], ['reed', 2], ['bell', 1.5], ['flute', 2]]), drone: r.chance(0.7),
      motif: [], rng: r,
    };
    let d = 0;
    const len = r.int(6, 10);
    for (let k = 0; k < len; k++) {
      d += r.weighted([[0, 1], [1, 3], [-1, 3], [2, 1.5], [-2, 1.5], [3, 0.5], [-3, 0.5]]);
      d = Math.max(-3, Math.min(mode.cents.length + 2, d));
      m.motif.push({ deg: d, dur: r.weighted([[1, 5], [2, 2], [0.5, 2]]) });
    }
    m.desc = `${mode.name}, played on ${INSTR_DESC[m.instr]} at ${Math.round(m.bpm)} beats a minute, ${m.meter} to the measure${m.drone ? ', over a drone' : ''}`;
    c.music = m;
    return m;
  }

  const A = {
    ctx: null, out: null, rev: null, on: false, world: null, cur: null, next: 0, timer: null, phrase: 0, step: 0,
    buffers: new Map(), droneNodes: null, lastEvent: 0,
  };

  function freq(m, deg) {
    const n = m.mode.cents.length;
    const oct = Math.floor(deg / n), k = ((deg % n) + n) % n;
    return m.tonic * 2 * Math.pow(2, oct + m.mode.cents[k] / 1200);
  }

  function setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    const out = ctx.createGain(); out.gain.value = 0.0;
    const rev = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 400 ? i / 400 : 1);
    }
    rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.42;
    const dry = ctx.createGain(); dry.gain.value = 0.75;
    out.connect(dry); out.connect(rev); rev.connect(wet);
    dry.connect(comp); wet.connect(comp); comp.connect(ctx.destination);
    A.ctx = ctx; A.out = out; A.rev = rev;
    return true;
  }

  function pluckBuffer(f) {
    const key = Math.round(f * 4);
    if (A.buffers.has(key)) return A.buffers.get(key);
    const sr = A.ctx.sampleRate, n = Math.floor(sr * 2.6);
    const buf = A.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / f));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0, prev = 0;
    for (let i = 0; i < n; i++) {
      const v = ring[idx];
      const nv = 0.4985 * (v + prev);
      prev = v;
      ring[idx] = nv;
      d[i] = v * (i < 30 ? i / 30 : 1);
      idx = (idx + 1) % period;
    }
    A.buffers.set(key, buf);
    return buf;
  }

  function note(m, f, t, dur, vel) {
    const ctx = A.ctx;
    const g = ctx.createGain();
    g.connect(A.out);
    if (m.instr === 'pluck') {
      const s = ctx.createBufferSource();
      s.buffer = pluckBuffer(f);
      s.connect(g);
      g.gain.setValueAtTime(0.5 * vel, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(2.5, dur * 3 + 0.8));
      s.start(t); s.stop(t + 2.6);
      return;
    }
    if (m.instr === 'reed') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 1.6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2;
      const lg = ctx.createGain(); lg.gain.value = f * 0.006;
      lfo.connect(lg); lg.connect(o.frequency);
      o.connect(bp); bp.connect(g);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.06);
      g.gain.setValueAtTime(0.14 * vel, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.25);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.3); lfo.stop(t + dur + 0.3);
      return;
    }
    if (m.instr === 'bell') { bell(f, t, vel * 0.8, g); return; }
    // flute: a sine with breath
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * 2;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
    const mix = ctx.createGain(); mix.gain.value = 0.3;
    o2.connect(mix); mix.connect(g); o.connect(g);
    const nb = ctx.createBufferSource();
    nb.buffer = noiseBuffer();
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = f * 4; nf.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    nb.connect(nf); nf.connect(ng); ng.connect(g);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.12);
    g.gain.setValueAtTime(0.11 * vel, t + dur * 0.85);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.35);
    o.start(t); o2.start(t); nb.start(t);
    o.stop(t + dur + 0.4); o2.stop(t + dur + 0.4); nb.stop(t + dur + 0.4);
  }

  let NOISE = null;
  function noiseBuffer() {
    if (NOISE) return NOISE;
    const n = A.ctx.sampleRate * 2;
    NOISE = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
    const d = NOISE.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return NOISE;
  }

  function bell(f, t, vel, dest) {
    const ctx = A.ctx;
    const g = ctx.createGain();
    g.connect(dest || A.out);
    for (const [ratio, amp, decay] of [[1, 1, 3.5], [2.76, 0.45, 2.2], [5.4, 0.25, 1.4], [8.93, 0.12, 0.8]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * ratio;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.18 * amp * vel, t);
      og.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + decay + 0.1);
    }
  }

  function drum(t, f, vel) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(g); g.connect(A.out);
    o.start(t); o.stop(t + 0.75);
  }

  function setDrone(m) {
    const ctx = A.ctx;
    if (A.droneNodes) {
      const old = A.droneNodes;
      old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
      setTimeout(() => { try { old.o1.stop(); old.o2.stop(); } catch (e) { /* already stopped */ } }, 4000);
      A.droneNodes = null;
    }
    if (!m || !m.drone) return;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = m.tonic; o2.frequency.value = m.tonic * 1.4983 * 1.002;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(A.out);
    g.gain.setTargetAtTime(0.045, ctx.currentTime, 1.2);
    o1.start(); o2.start();
    A.droneNodes = { o1, o2, g };
  }

  function schedule() {
    if (!A.on || !A.cur) return;
    const ctx = A.ctx;
    const m = voice(A.cur);
    const beat = 60 / m.bpm;
    while (A.next < ctx.currentTime + 0.35) {
      const phraseLen = m.motif.length;
      const k = A.step % phraseLen;
      const ph = Math.floor(A.step / phraseLen);
      // each pass through the motif is varied a little: transposed, ornamented, or answered on the tonic
      const shape = ph % 4;
      let deg = m.motif[k].deg + (shape === 1 ? 2 : shape === 2 ? -1 : 0);
      if (shape === 3 && k === phraseLen - 1) deg = 0;
      const dur = m.motif[k].dur * beat;
      const accent = (A.step % m.meter) === 0 ? 1 : 0.72;
      if (!(shape === 2 && k % 3 === 2)) note(m, freq(m, deg), A.next, dur, accent);
      if (k === phraseLen - 1) A.next += beat * (m.meter > 4 ? 2 : 1.5);
      A.next += dur;
      A.step++;
    }
  }

  P.Music = {
    describe: (c) => voice(c).desc,
    get on() { return A.on; },
    start(world) {
      A.world = world;
      if (!A.ctx && !setup()) return false;
      if (A.ctx.state === 'suspended') A.ctx.resume();
      A.on = true;
      A.out.gain.setTargetAtTime(0.9, A.ctx.currentTime, 0.4);
      A.next = A.ctx.currentTime + 0.1;
      if (A.cur) setDrone(voice(A.cur));
      if (!A.timer) A.timer = setInterval(schedule, 60);
      return true;
    },
    stop() {
      A.on = false;
      if (A.ctx) {
        A.out.gain.setTargetAtTime(0, A.ctx.currentTime, 0.25);
        setDrone(null);
      }
      if (A.timer) { clearInterval(A.timer); A.timer = null; }
    },
    /* the people that holds the most land is the one we hear */
    follow(world, year) {
      A.world = world;
      const tot = new Map();
      for (const s of world.settlements) {
        const p = s.popY[year];
        if (p > 0) { const c = s.cultY[year]; tot.set(c, (tot.get(c) || 0) + p); }
      }
      let best = null, bv = -1;
      for (const [c, v] of tot) if (v > bv) { bv = v; best = c; }
      const c = best === null ? null : world.cultures[best];
      if (c && c !== A.cur) {
        A.cur = c;
        A.step = 0;
        if (A.on) { setDrone(voice(c)); A.next = Math.max(A.next, A.ctx.currentTime + 0.4); }
      }
      return c;
    },
    event(type) {
      if (!A.on || !A.ctx) return;
      const t = A.ctx.currentTime + 0.05;
      if (t - A.lastEvent < 0.6) return;
      A.lastEvent = t;
      const m = A.cur ? voice(A.cur) : null;
      const base = m ? m.tonic : 110;
      if (type === 'war') { drum(t, 52, 1); drum(t + 0.32, 50, 0.8); drum(t + 0.64, 48, 0.9); }
      else if (type === 'battle') drum(t, 58, 0.7);
      else if (type === 'plague') { bell(base * 0.75, t, 1.2); bell(base * 0.75, t + 2.4, 0.9); }
      else if (type === 'fall') { bell(base * 2, t, 0.8); bell(base * 1.68, t + 0.5, 0.8); bell(base * 1.33, t + 1, 0.9); }
      else if (type === 'invasion') { drum(t, 44, 1); drum(t + 0.25, 44, 1); bell(base * 0.5, t + 0.3, 1.3); }
      else if (type === 'crowned' || type === 'empire') { bell(base * 2, t, 0.6); bell(base * 2.5, t + 0.18, 0.6); bell(base * 3, t + 0.36, 0.7); }
      else if (type === 'death') bell(base * 1.5, t, 0.5);
    },
  };
})();

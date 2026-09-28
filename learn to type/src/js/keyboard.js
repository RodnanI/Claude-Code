/* On-screen keyboard: finger zones, the next key, key presses and the statistics heatmap.
   One instance is moved between screens. */

const KB = {
  el: null, layout: null, keyEls: {}, lit: [],

  build(layout) {
    if (this.layout === layout && this.el) return this.el;
    this.layout = layout;
    this.keyEls = {};
    const keys = h('div', { class: 'kb-keys' });
    let enterSeen = false;
    for (const k of layout.geo) {
      const f = FINGER_OF[k.code] || 'rt';
      const lab = layout.keys[k.code];
      const alt = layout.altgr[k.code];
      const kids = [];
      if (lab) {
        const [b, s] = [...lab];
        if (isLetter(b) && s === b.toUpperCase()) kids.push(h('span', { class: 'm' }, s));
        else kids.push(h('span', { class: 's' }, s), h('span', { class: 'b' }, b));
        if (alt) kids.push(h('span', { class: 'a' }, alt));
      } else if (!(k.code === 'Enter' && enterSeen)) {
        kids.push(h('span', { class: 'n' }, layout.names[k.code] || ''));
      }
      const cls = ['k', 'f' + f[1]];
      if (k.code === 'KeyF' || k.code === 'KeyJ') cls.push('bump');
      if (!lab) cls.push('mod');
      if (layout.dead.includes(k.code)) cls.push('dead');
      if (k.code === 'Enter') { cls.push(enterSeen ? 'enter-bot' : 'enter-top'); enterSeen = true; }
      const el = h('div', { class: cls.join(' '), style: `--x:${k.x};--y:${k.y};--w:${k.w}` }, kids);
      (this.keyEls[k.code] = this.keyEls[k.code] || []).push(el);
      keys.append(el);
    }
    this.el = h('div', { class: 'kb' }, keys, Hands.build(layout));
    if (layout.geom === 'iso') this.el.classList.add('iso');
    return this.el;
  },

  mount(parent, small) {
    this.el.classList.toggle('small', !!small);
    this.heat(null);
    this.show(null);
    parent.append(this.el);
  },

  each(code, fn) { (this.keyEls[code] || []).forEach(fn); },

  /* Dim keys that are not part of the course yet and mark the keys this lesson introduces. */
  scope(learned, newKeys = []) {
    const L = this.layout;
    const on = new Set(['Space']);
    for (const ch of learned) {
      const m = L.chars[ch];
      if (!m) continue;
      on.add(m.code);
      if (m.shift) { on.add('ShiftLeft'); on.add('ShiftRight'); }
      if (m.altgr) on.add('AltRight');
    }
    const fresh = new Set(newKeys.map(c => L.chars[c] && L.chars[c].code).filter(Boolean));
    for (const code in this.keyEls) this.each(code, el => {
      el.classList.toggle('off', !on.has(code));
      el.classList.toggle('new', fresh.has(code));
    });
  },

  /* Highlight the keys for the next character (null clears). */
  show(ch) {
    for (const [code, cls] of this.lit) this.each(code, el => el.classList.remove(cls));
    this.lit = [];
    const st = ch != null && this.layout ? this.layout.strokes(ch) : null;
    if (st) st.forEach((s, i) => {
      const cls = i === 0 ? 'tgt' : 'hold';
      this.each(s.code, el => el.classList.add(cls));
      this.lit.push([s.code, cls]);
    });
    Hands.point(st);
  },

  flash(code, ok) {
    this.each(code, el => {
      el.classList.remove('hit', 'miss');
      void el.offsetWidth;
      el.classList.add(ok ? 'hit' : 'miss');
    });
  },

  /* values: code -> 0..1 intensity, or null to clear. */
  heat(values, label) {
    for (const code in this.keyEls) this.each(code, el => {
      const v = values ? values[code] : undefined;
      el.style.removeProperty('--heat');
      el.classList.toggle('heat', v !== undefined);
      if (v !== undefined) el.style.setProperty('--heat', Math.round(clamp(v, 0, 1) * 100) + '%');
      if (label && v !== undefined) el.title = label(code) || '';
      else el.removeAttribute('title');
    });
    this.el.classList.toggle('heatmap', !!values);
  }
};

/* Stylised hands drawn as outlines over the keyboard, fingertips on the home row.
   Units are key widths, matching the keyboard geometry. */

const HAND_L = {
  lp: { tip: [2.25, 2.82], base: [2.78, 5.05], w: 0.56 },
  lr: { tip: [3.25, 2.74], base: [3.47, 4.9], w: 0.62 },
  lm: { tip: [4.25, 2.7], base: [4.2, 4.84], w: 0.66 },
  li: { tip: [5.25, 2.78], base: [4.93, 4.9], w: 0.66 },
  lt: { tip: [6.35, 4.6], base: [5.1, 5.5], w: 0.72 }
};
const PALM_L = [[2.5, 5.1], [3.3, 4.92], [4.2, 4.86], [5.05, 4.92], [5.5, 5.35], [5.4, 6.2], [4.9, 6.9], [3.1, 6.95], [2.5, 6.1]];
const HAND_EDGE = 0.03;
const HAND_FADE = [4.85, 6.1];

const Hands = {
  svg: null, fingers: {}, hands: {}, raf: 0, layout: null,

  build(layout) {
    this.layout = layout;
    const box = { x: -1, y: -0.5, width: 17, height: 10 };
    const s = svg('svg', { class: 'hands', viewBox: '-1 -0.5 17 10', 'aria-hidden': 'true' });
    const grad = svg('linearGradient', { id: 'hfade', gradientUnits: 'userSpaceOnUse', x1: 0, y1: HAND_FADE[0], x2: 0, y2: HAND_FADE[1] },
      svg('stop', { offset: 0, 'stop-color': '#fff' }), svg('stop', { offset: 1, 'stop-color': '#000' }));
    const outer = svg('g', { fill: 'url(#hfade)', stroke: 'url(#hfade)', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const inner = svg('g', { fill: '#000', stroke: '#000', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const mask = svg('mask', { id: 'hmask', maskUnits: 'userSpaceOnUse', ...box }, outer, inner);
    const fade = svg('mask', { id: 'hfade2', maskUnits: 'userSpaceOnUse', ...box }, svg('rect', { ...box, fill: 'url(#hfade)' }));
    const skin = svg('g', { class: 'skin', mask: 'url(#hfade2)', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const hl = svg('g', { class: 'hl', mask: 'url(#hfade2)', 'stroke-linecap': 'round' });
    s.append(svg('defs', null, grad, mask, fade), skin, hl, svg('rect', { class: 'outline', ...box, mask: 'url(#hmask)' }));

    this.fingers = {};
    this.hands = {};
    for (const side of ['l', 'r']) {
      const mir = side === 'r' ? p => [13.5 - p[0], p[1]] : p => p.slice();
      const gO = svg('g'), gI = svg('g'), gH = svg('g'), gS = svg('g');
      outer.append(gO); inner.append(gI); hl.append(gH); skin.append(gS);
      const palm = PALM_L.map(mir).map(p => p.join(',')).join(' ');
      gO.append(svg('polygon', { points: palm, 'stroke-width': 0.5 + 2 * HAND_EDGE }));
      gI.append(svg('polygon', { points: palm, 'stroke-width': 0.5 }));
      gS.append(svg('polygon', { points: palm, 'stroke-width': 0.5 }));
      this.hands[side] = { groups: [gO, gI, gH, gS], cur: [0, 0], tgt: [0, 0] };
      for (const f of ['p', 'r', 'm', 'i', 't']) {
        const d = HAND_L['l' + f];
        const tip = mir(d.tip), base = mir(d.base);
        const o = svg('line', { 'stroke-width': d.w + 2 * HAND_EDGE });
        const i = svg('line', { 'stroke-width': d.w });
        const hlLine = svg('line', { 'stroke-width': d.w, class: 'f' + f });
        const sk = svg('line', { 'stroke-width': d.w });
        gO.append(o); gI.append(i); gH.append(hlLine); gS.append(sk);
        const F = { els: [o, i, hlLine, sk], hl: hlLine, home: tip, base, cur: tip.slice(), tgt: tip.slice(), side };
        this.fingers[side + f] = F;
        this.setLine(F);
      }
    }
    this.svg = s;
    return s;
  },

  setLine(F) {
    for (const el of F.els) {
      el.setAttribute('x1', F.base[0]);
      el.setAttribute('y1', F.base[1]);
      el.setAttribute('x2', F.cur[0].toFixed(3));
      el.setAttribute('y2', F.cur[1].toFixed(3));
    }
  },

  reachPoint(code) {
    const [x, y, w] = this.layout.box[code];
    if (code === 'ShiftLeft') return [x + w - 0.55, y + 0.72];
    if (code === 'ShiftRight') return [x + 0.6, y + 0.72];
    const c = this.layout.center[code];
    return [c[0], c[1] + (code === 'AltRight' ? 0.1 : 0.28)];
  },

  /* strokes: result of layout.strokes(ch), or null to return to the home row. */
  point(strokes) {
    if (!this.svg) return;
    for (const id in this.fingers) { const F = this.fingers[id]; F.tgt = F.home.slice(); F.hl.classList.remove('on'); }
    for (const s in this.hands) this.hands[s].tgt = [0, 0];
    if (strokes) strokes.forEach((k, idx) => {
      if (k.finger === 'thumbs') {
        this.fingers.lt.hl.classList.add('on');
        this.fingers.rt.hl.classList.add('on');
        return;
      }
      const F = this.fingers[k.finger];
      if (!F) return;
      const H = this.hands[F.side];
      const p = this.reachPoint(k.code);
      // Each hand drifts a little towards the first key its fingers must reach (main key or modifier).
      const first = !strokes.slice(0, idx).some(s => this.fingers[s.finger] && this.fingers[s.finger].side === F.side);
      if (first && k.finger[1] !== 't') H.tgt = [(p[0] - F.home[0]) * 0.28, (p[1] - F.home[1]) * 0.28];
      F.tgt = [p[0] - H.tgt[0], p[1] - H.tgt[1]];
      F.hl.classList.add('on');
    });
    this.animate();
  },

  lerp(a, b, k) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) { a[0] = b[0]; a[1] = b[1]; return false; }
    a[0] += dx * k;
    a[1] += dy * k;
    return true;
  },

  animate() {
    if (this.raf) return;
    let last = performance.now();
    const step = now => {
      const k = 1 - Math.exp(-Math.min(50, now - last) / 55);
      last = now;
      let moving = false;
      for (const s in this.hands) {
        const H = this.hands[s];
        if (this.lerp(H.cur, H.tgt, k)) moving = true;
        const tr = `translate(${H.cur[0].toFixed(3)} ${H.cur[1].toFixed(3)})`;
        for (const g of H.groups) g.setAttribute('transform', tr);
      }
      for (const id in this.fingers) {
        const F = this.fingers[id];
        if (this.lerp(F.cur, F.tgt, k)) moving = true;
        this.setLine(F);
      }
      this.raf = moving ? requestAnimationFrame(step) : 0;
    };
    this.raf = requestAnimationFrame(step);
  }
};

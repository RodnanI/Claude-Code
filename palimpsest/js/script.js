/* Palimpsest / script
   Each literate people invents letters. A script is grown from a handful of
   stroke components on a small lattice, so its letters share a family face,
   and then written with a pen: a broad nib held at an angle, a stylus, or a brush.
   Four kinds are possible: alphabets, abjads (consonants only), abugidas
   (consonants carrying vowel marks) and syllabaries whose letters turn to show the vowel. */
'use strict';
(function () {
  const P = window.P;
  const L = () => P.Lang;

  const TYPE_DESC = {
    alphabet: 'an alphabet, one letter for every sound',
    abjad: 'an abjad: only consonants are written, and the reader supplies the vowels',
    abugida: 'an abugida: each consonant carries a vowel, changed by small marks',
    syllabary: 'a syllabary of turning letters: the shape gives the consonant, its turn gives the vowel',
  };

  function sampleQuad(p0, c, p1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
      out.push(a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]);
    }
    return out;
  }

  class Script {
    constructor(rng, lang) {
      const r = rng.fork('script');
      this.lang = lang;
      this.type = r.weighted([['alphabet', 4], ['abugida', 3], ['abjad', 2], ['syllabary', 2]]);
      this.dir = r.chance(0.28) ? 'rtl' : 'ltr';
      const headline = r.chance(0.2);
      this.style = {
        curvy: Math.pow(r.next(), 0.8),
        headline,
        cursive: !headline && r.chance(0.18),
        stem: r.range(0.1, 0.7),
        dot: r.range(0, 0.18),
        loop: r.range(0, 0.22),
        slant: r.chance(0.55) ? 0 : r.range(-0.1, 0.22),
        aspect: r.range(0.55, 0.92),
        strokesMax: r.int(2, 3),
        rows: r.pick([3, 4]),
        pen: r.weighted([['broad', 4], ['mono', 2], ['brush', 2]]),
        nib: r.range(15, 60) * Math.PI / 180,
        weight: r.range(0.085, 0.15),
        gap: r.range(0.14, 0.3),
        sep: r.pick(['space', 'dot', 'bar', 'colon']),
        pointing: r.chance(0.5),
      };
      this.vocab = [];
      for (let k = 0; k < 9; k++) this.vocab.push(this.makeStroke(r));
      this.glyphs = new Map();
      this.marks = new Map();
      this.build(r.fork('glyphs'));
    }

    node(c, ro) {
      const s = this.style;
      return [(c / 2) * s.aspect, ro / (s.rows - 1)];
    }

    randNode(r) { return this.node(r.int(0, 2), r.int(0, this.style.rows - 1)); }

    makeStroke(r, start) {
      const s = this.style;
      const kind = r.weighted([
        ['stem', s.stem], ['line', 1.1 * (1 - s.curvy) + 0.25], ['curve', 1.4 * s.curvy + 0.2],
        ['arc', 0.9 * s.curvy + 0.1], ['hook', 0.45], ['bar', 0.5 * (1 - s.curvy) + 0.15], ['loop', s.loop],
      ]);
      const A = s.aspect, rows = s.rows;
      if (kind === 'stem') {
        const c = r.pick([0, 1, 2]);
        return { pts: [this.node(c, 0)[0], 0, this.node(c, 0)[0], 1] };
      }
      if (kind === 'bar') {
        const ro = r.int(0, rows - 1);
        return { pts: [0, ro / (rows - 1), A, ro / (rows - 1)] };
      }
      const p0 = start || this.randNode(r);
      let p1;
      for (let t = 0; t < 20; t++) {
        p1 = this.randNode(r);
        if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) >= 0.45) break;
      }
      if (kind === 'line') return { pts: [p0[0], p0[1], p1[0], p1[1]] };
      if (kind === 'curve' || kind === 'hook') {
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
        const bulge = r.range(0.25, 0.65) * (r.chance(0.5) ? 1 : -1);
        const c = [mx - (dy / len) * bulge * len, my + (dx / len) * bulge * len];
        const pts = sampleQuad(p0, kind === 'hook' ? [mx, my] : c, p1, kind === 'hook' ? 4 : 12);
        if (kind === 'hook') {
          const ang = Math.atan2(dy, dx) + (bulge > 0 ? 1 : -1) * Math.PI / 2;
          const rr = 0.13;
          for (let i = 1; i <= 6; i++) {
            const a = ang + (bulge > 0 ? 1 : -1) * (i / 6) * Math.PI * 0.9;
            pts.push(p1[0] + Math.cos(ang) * -rr + Math.cos(a) * rr, p1[1] + Math.sin(ang) * -rr + Math.sin(a) * rr);
          }
        }
        return { pts };
      }
      if (kind === 'arc') {
        const rad = r.range(0.22, 0.45);
        const a0 = r.range(0, Math.PI * 2), sweep = r.range(Math.PI * 0.6, Math.PI * 1.6) * (r.chance(0.5) ? 1 : -1);
        const cx = p0[0], cy = p0[1];
        const pts = [];
        for (let i = 0; i <= 14; i++) {
          const a = a0 + sweep * (i / 14);
          pts.push(cx + Math.cos(a) * rad * A, cy + Math.sin(a) * rad);
        }
        return { pts };
      }
      // loop
      const rad = r.range(0.1, 0.16), pts = [];
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(p0[0] + Math.cos(a) * rad, p0[1] + Math.sin(a) * rad); }
      return { pts };
    }

    /* fit strokes into the letter box, measure width */
    finish(strokes) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const st of strokes) for (let i = 0; i < st.pts.length; i += 2) {
        x0 = Math.min(x0, st.pts[i]); x1 = Math.max(x1, st.pts[i]);
        y0 = Math.min(y0, st.pts[i + 1]); y1 = Math.max(y1, st.pts[i + 1]);
      }
      const h = Math.max(y1 - y0, 0.001), w = Math.max(x1 - x0, 0.001);
      const k = Math.min(1 / h, this.style.aspect * 1.25 / w, 1.6);
      const ty = y1 - y0 < 0.6 ? 0.5 - ((y0 + y1) / 2) * k : -y0 * k;
      const out = strokes.map((st) => {
        const pts = [];
        for (let i = 0; i < st.pts.length; i += 2) pts.push((st.pts[i] - x0) * k, st.pts[i + 1] * k + ty);
        return { pts, dot: st.dot };
      });
      return { strokes: out, w: Math.max(w * k, 0.28) };
    }

    raster(g) {
      const set = new Set();
      for (const st of g.strokes) {
        const pts = st.pts;
        for (let i = 0; i < pts.length - 2 || i === 0; i += 2) {
          const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2] !== undefined ? pts[i + 2] : ax, by = pts[i + 3] !== undefined ? pts[i + 3] : ay;
          const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.04));
          for (let k = 0; k <= n; k++) {
            const x = ax + (bx - ax) * (k / n), y = ay + (by - ay) * (k / n);
            set.add(Math.min(7, Math.max(0, Math.floor((x / Math.max(g.w, 0.3)) * 8))) + 8 * Math.min(9, Math.max(0, Math.floor(y * 10))));
          }
          if (pts.length <= 2) break;
        }
      }
      return set;
    }

    similar(a, b) {
      let inter = 0;
      for (const v of a) if (b.has(v)) inter++;
      return inter / (a.size + b.size - inter);
    }

    newGlyph(r, existing, maxStrokes) {
      let best = null, bestSim = 2;
      for (let t = 0; t < 45; t++) {
        const n = r.int(1, maxStrokes || this.style.strokesMax);
        const strokes = [];
        let ends = [];
        for (let k = 0; k < n; k++) {
          let st;
          if (r.chance(0.7)) {
            st = { pts: this.vocab[r.int(0, this.vocab.length - 1)].pts.slice() };
            if (r.chance(0.3)) for (let i = 0; i < st.pts.length; i += 2) st.pts[i] = this.style.aspect - st.pts[i];
            if (r.chance(0.15)) for (let i = 1; i < st.pts.length; i += 2) st.pts[i] = 1 - st.pts[i];
          } else {
            st = this.makeStroke(r, ends.length && r.chance(0.6) ? r.pick(ends) : null);
          }
          strokes.push(st);
          ends.push([st.pts[0], st.pts[1]], [st.pts[st.pts.length - 2], st.pts[st.pts.length - 1]]);
        }
        if (r.chance(this.style.dot)) {
          const p = this.randNode(r);
          strokes.push({ pts: [p[0], p[1]], dot: true });
        }
        const g = this.finish(strokes);
        const ras = this.raster(g);
        if (ras.size < 6) continue;
        let maxSim = 0;
        for (const e of existing) { const sm = this.similar(ras, e); if (sm > maxSim) maxSim = sm; if (maxSim > 0.6) break; }
        if (maxSim < bestSim) { bestSim = maxSim; best = g; best.ras = ras; }
        if (maxSim < 0.5) break;
      }
      existing.push(best.ras);
      return best;
    }

    newMark(r) {
      const kind = r.weighted([['tick', 3], ['dot', 2], ['hook', 1.5], ['arc', 1.5], ['double', 1]]);
      let strokes;
      if (kind === 'dot') strokes = [{ pts: [0, 0], dot: true }];
      else if (kind === 'double') strokes = [{ pts: [0, 0], dot: true }, { pts: [0.22, 0], dot: true }];
      else if (kind === 'tick') { const a = r.range(-0.6, 0.6); strokes = [{ pts: [0, 0, Math.sin(a) * 0.25, Math.cos(a) * 0.25] }]; }
      else if (kind === 'hook') strokes = [{ pts: sampleQuad([0, 0], [0.25, 0], [0.2, 0.22], 6) }];
      else { const pts = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); pts.push(Math.cos(a) * 0.14, -Math.sin(a) * 0.12); } strokes = [{ pts }]; }
      return { strokes, pos: r.weighted([['top', 3], ['bottom', 2], ['right', 2], ['left', 1]]), kind };
    }

    build(r) {
      const Lg = L();
      const own = this.lang.cons.concat(this.lang.vows.map((v) => Lg.SHORT[v] || v));
      const order = [];
      for (const p of own) if (!order.includes(p)) order.push(p);
      for (const p of Object.keys(Lg.PH)) if (!order.includes(p) && Lg.SHORT[p] === undefined) order.push(p);
      const cons = order.filter((p) => Lg.isC(p)), vows = order.filter((p) => Lg.isV(p));
      const existing = [];
      if (this.type === 'alphabet') {
        for (const p of order) this.glyphs.set(p, this.newGlyph(r, existing));
      } else if (this.type === 'abjad') {
        for (const p of cons) this.glyphs.set(p, this.newGlyph(r, existing));
        this.glyphs.set('#V', this.newGlyph(r, existing, 1));
        for (const v of vows) this.marks.set(v, this.newMark(r));
      } else if (this.type === 'abugida') {
        for (const p of cons) this.glyphs.set(p, this.newGlyph(r, existing));
        for (const v of vows) this.glyphs.set('V:' + v, this.newGlyph(r, existing));
        this.inherent = this.lang.vows.includes('a') ? 'a' : this.lang.vows[0];
        for (const v of vows) if (v !== this.inherent) this.marks.set(v, this.newMark(r));
        this.marks.set('#kill', { strokes: [{ pts: [0, 0, 0.18, 0.2] }], pos: 'bottom', kind: 'kill' });
      } else {
        for (const p of cons) this.glyphs.set(p, this.newGlyph(r, existing, 2));
        this.glyphs.set('#0', this.newGlyph(r, existing, 2));
        const turns = [0, 1, 2, 3, 4, 5, 6, 7];
        this.turn = new Map();
        const vs = this.lang.vows.map((v) => Lg.SHORT[v] || v).filter((v, i, a) => a.indexOf(v) === i);
        for (const v of vows) if (!vs.includes(v)) vs.push(v);
        vs.forEach((v, k) => this.turn.set(v, turns[k % 8]));
      }
      this.longMark = { strokes: [{ pts: [0, 0, 0.3, 0] }], pos: 'top', kind: 'long' };
    }

    /* turn phonemes into positioned tokens */
    tokens(ph) {
      const Lg = L();
      const T = [];
      const base = (v) => Lg.SHORT[v] || v;
      const isLong = (v) => Lg.SHORT[v] !== undefined;
      const push = (g, marks, opt) => T.push(Object.assign({ g, marks: marks || [] }, opt || {}));
      for (let i = 0; i < ph.length; i++) {
        const p = ph[i];
        if (p === ' ') { T.push({ sep: true }); continue; }
        if (p === '-') { T.push({ joint: true }); continue; }
        const nx = ph[i + 1];
        if (this.type === 'alphabet') {
          if (Lg.isV(p)) push(this.glyphs.get(base(p)), isLong(p) ? [this.longMark] : []);
          else push(this.glyphs.get(p));
        } else if (this.type === 'abjad') {
          if (Lg.isC(p)) {
            const marks = [];
            if (this.style.pointing && nx && Lg.isV(nx) && this.marks.get(base(nx))) marks.push(this.marks.get(base(nx)));
            push(this.glyphs.get(p), marks);
            if (nx && Lg.isV(nx)) {
              if (isLong(nx)) push(this.glyphs.get(['i', 'e', 'y'].includes(base(nx)) ? 'j' : ['u', 'o'].includes(base(nx)) ? 'w' : 'ʔ'));
              i++;
            }
          } else {
            const marks = this.style.pointing && this.marks.get(base(p)) ? [this.marks.get(base(p))] : [];
            push(this.glyphs.get('#V'), marks);
          }
        } else if (this.type === 'abugida') {
          if (Lg.isC(p)) {
            if (nx && Lg.isV(nx)) {
              const v = base(nx);
              const marks = v !== this.inherent && this.marks.get(v) ? [this.marks.get(v)] : [];
              if (isLong(nx)) marks.push(this.longMark);
              push(this.glyphs.get(p), marks);
              i++;
            } else push(this.glyphs.get(p), [this.marks.get('#kill')]);
          } else push(this.glyphs.get('V:' + base(p)), isLong(p) ? [this.longMark] : []);
        } else {
          if (Lg.isC(p)) {
            if (nx && Lg.isV(nx)) {
              push(this.glyphs.get(p), isLong(nx) ? [this.longMark] : [], { turn: this.turn.get(base(nx)) || 0 });
              i++;
            } else push(this.glyphs.get(p), [], { small: true });
          } else push(this.glyphs.get('#0'), isLong(p) ? [this.longMark] : [], { turn: this.turn.get(base(p)) || 0 });
        }
      }
      return T.filter((t) => t.sep || t.joint || t.g);
    }

    tokenWidth(t) {
      if (t.sep) return this.style.sep === 'space' ? 0.55 : 0.5;
      if (t.joint) return 0.25;
      let w = t.small ? t.g.w * 0.5 : t.g.w;
      if (t.turn === 1 || t.turn === 3 || t.turn === 5 || t.turn === 7) w = 1 * (t.small ? 0.5 : 1);
      return w;
    }

    measure(ph, size) {
      const T = this.tokens(ph);
      let w = 0;
      T.forEach((t, k) => { w += this.tokenWidth(t) + (k < T.length - 1 ? this.style.gap : 0); });
      return (w + Math.abs(this.style.slant)) * size;
    }

    /* draw with the baseline at y; x is the left edge whatever the writing direction */
    draw(ctx, ph, x, y, size, color) {
      const T = this.tokens(ph);
      const s = this.style;
      const total = this.measure(ph, size);
      ctx.save();
      ctx.fillStyle = color; ctx.strokeStyle = color;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let cursor = 0;
      const placed = [];
      for (let k = 0; k < T.length; k++) {
        const t = T[k], w = this.tokenWidth(t);
        const left = this.dir === 'ltr' ? x + cursor * size : x + total - (cursor + w) * size;
        placed.push({ t, left, w });
        cursor += w + s.gap;
      }
      const top = y - size;
      // headlines run across whole words
      if (s.headline || s.cursive) {
        let run = [];
        const flush = () => {
          if (!run.length) return;
          const a = Math.min(...run.map((p) => p.left)), b = Math.max(...run.map((p) => p.left + p.w * size));
          const yy = s.headline ? top : y;
          this.pen(ctx, [a - size * 0.05, yy, b + size * 0.05, yy], size);
          run = [];
        };
        for (const p of placed) { if (p.t.sep || p.t.joint) flush(); else run.push(p); }
        flush();
      }
      for (const p of placed) {
        const t = p.t;
        if (t.sep) {
          const cx = p.left + p.w * size / 2;
          if (s.sep === 'dot') this.dot(ctx, cx, y - size * 0.45, size);
          else if (s.sep === 'colon') { this.dot(ctx, cx, y - size * 0.7, size); this.dot(ctx, cx, y - size * 0.25, size); }
          else if (s.sep === 'bar') this.pen(ctx, [cx, top + size * 0.15, cx, y - size * 0.05], size);
          continue;
        }
        if (t.joint) { this.dot(ctx, p.left + p.w * size / 2, y - size * 0.45, size * 0.7); continue; }
        const sc = t.small ? 0.5 : 1;
        const gw = t.g.w;
        const tf = (gx, gy) => {
          // turning letters of a syllabary rotate inside their box
          let u = gx, v = gy;
          const turn = t.turn || 0;
          if (turn) {
            const cx = gw / 2, cy = 0.5;
            let dx = u - cx, dy = v - cy;
            if (turn >= 4) dx = -dx;
            const q = turn % 4;
            for (let i = 0; i < q; i++) { const ndx = -dy, ndy = dx; dx = ndx; dy = ndy; }
            u = dx + (this.tokenWidth(t) / sc) / 2; v = dy + cy;
          }
          if (this.dir === 'rtl' && !turn) u = gw - u;
          const yy = t.small ? top + v * size * sc : top + v * size;
          return [p.left + (u + (1 - v) * s.slant) * size * sc, yy];
        };
        for (const st of t.g.strokes) {
          const pts = [];
          for (let i = 0; i < st.pts.length; i += 2) { const q = tf(st.pts[i], st.pts[i + 1]); pts.push(q[0], q[1]); }
          if (st.dot || pts.length === 2) this.dot(ctx, pts[0], pts[1], size * sc);
          else this.pen(ctx, pts, size * sc);
        }
        for (const m of t.marks) {
          let mx, my;
          const w = p.w * size;
          if (m.pos === 'top') { mx = p.left + w * 0.5 - size * 0.08; my = top - size * 0.28; }
          else if (m.pos === 'bottom') { mx = p.left + w * 0.5 - size * 0.08; my = y + size * 0.14; }
          else if (m.pos === 'right') { mx = p.left + w + size * 0.04; my = y - size * 0.55; }
          else { mx = p.left - size * 0.18; my = y - size * 0.55; }
          for (const st of m.strokes) {
            const pts = [];
            for (let i = 0; i < st.pts.length; i += 2) pts.push(mx + st.pts[i] * size, my + st.pts[i + 1] * size);
            if (st.dot || pts.length === 2) this.dot(ctx, pts[0], pts[1], size * 0.8);
            else this.pen(ctx, pts, size * 0.7);
          }
        }
      }
      ctx.restore();
      return total;
    }

    dot(ctx, x, y, size) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.6, this.style.weight * size * 0.62), 0, Math.PI * 2);
      ctx.fill();
    }

    pen(ctx, pts, size) {
      const s = this.style;
      const W = Math.max(0.7, s.weight * size);
      if (s.pen === 'mono') {
        ctx.lineWidth = W * 0.8;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.stroke();
        return;
      }
      if (s.pen === 'broad') {
        const nx = Math.cos(s.nib) * W * 0.62, ny = Math.sin(s.nib) * W * 0.62;
        ctx.beginPath();
        for (let i = 0; i < pts.length - 2; i += 2) {
          const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
          ctx.moveTo(ax + nx, ay + ny); ctx.lineTo(bx + nx, by + ny); ctx.lineTo(bx - nx, by - ny); ctx.lineTo(ax - nx, ay - ny); ctx.closePath();
        }
        ctx.fill();
        ctx.lineWidth = W * 0.22;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.stroke();
        return;
      }
      // brush: thick in the middle, thin at the ends
      const n = pts.length / 2;
      for (let i = 0; i < n - 1; i++) {
        const t = (i + 0.5) / (n - 1);
        ctx.lineWidth = W * (0.3 + 0.95 * Math.pow(Math.sin(Math.PI * t), 0.6));
        ctx.beginPath();
        ctx.moveTo(pts[i * 2], pts[i * 2 + 1]);
        ctx.lineTo(pts[i * 2 + 2], pts[i * 2 + 3]);
        ctx.stroke();
      }
    }

    describe() {
      const dir = this.dir === 'ltr' ? 'from left to right' : 'from right to left';
      const pen = { broad: 'with a broad reed held at a slant', mono: 'with a stylus of even weight', brush: 'with a soft brush' }[this.style.pen];
      return `It is ${TYPE_DESC[this.type]}, written ${dir}, ${pen}.`;
    }
  }

  P.Script = Script;
})();

/* SQUAWK charts: small canvas charts with hover. Single y-axis each, 2px lines, rounded data-ends, recessive grid. */
(function () {
  'use strict';
  const SQ = window.SQ, U = SQ.u;
  let tokens = null, tokTheme = '';
  function tok() {
    const th = document.documentElement.dataset.theme;
    if (tokens && tokTheme === th) return tokens;
    const cs = getComputedStyle(document.documentElement);
    const g = (v) => cs.getPropertyValue(v).trim();
    tokTheme = th;
    return (tokens = { line: g('--line'), line2: g('--line2'), ink: g('--ink'), ink2: g('--ink2'), ink3: g('--ink3'), surf: g('--panel2'), mono: '"B612 Mono", ui-monospace, monospace' });
  }
  function setup(cv) {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 300, h = cv.clientHeight || 80;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function nice(v, up) {
    if (!v) return 0;
    const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v)))), n = v / p;
    const s = up ? (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) : (n >= 5 ? 5 : n >= 2 ? 2 : 1);
    return s * p;
  }
  function label(ctx, T, x, y, txt, w) {
    ctx.font = '700 10px ' + T.mono;
    const tw = ctx.measureText(txt).width + 10;
    const bx = U.clamp(x - tw / 2, 0, w - tw);
    ctx.fillStyle = T.surf; ctx.strokeStyle = T.line2; ctx.lineWidth = 1;
    ctx.fillRect(bx, y, tw, 16); ctx.strokeRect(bx + 0.5, y + 0.5, tw - 1, 15);
    ctx.fillStyle = T.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(txt, bx + 5, y + 8);
  }

  /* line/area chart. spec: {xs, ys, color, fill, yFmt, xFmt, zero, hoverX} */
  function series(cv, spec) {
    const { ctx, w, h } = setup(cv);
    const T = tok();
    const xs = spec.xs, ys = spec.ys;
    const padL = spec.padL == null ? 40 : spec.padL, padR = 8, padT = 8, padB = spec.noX ? 4 : 16;
    const pw = w - padL - padR, ph = h - padT - padB;
    let lo = Infinity, hi = -Infinity;
    for (const v of ys) if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!isFinite(lo) || xs.length < 2) {
      ctx.fillStyle = T.ink3; ctx.font = '10px ' + T.mono; ctx.textBaseline = 'middle';
      ctx.fillText(spec.empty || 'Collecting data...', padL, h / 2);
      cv._spec = null;
      return;
    }
    const span = spec.minSpan || 1;
    if (spec.zero) { lo = Math.min(0, lo); if (hi - lo < span) hi = lo + span; }
    else if (hi - lo < span) { const m = (hi + lo) / 2; lo = m - span / 2; hi = m + span / 2; }
    const step = nice((hi - lo) / 3, true);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const x0 = xs[0], x1 = xs[xs.length - 1];
    const X = (v) => padL + ((v - x0) / Math.max(1, x1 - x0)) * pw, Y = (v) => padT + ph - ((v - lo) / Math.max(1e-9, hi - lo)) * ph;
    /* grid */
    ctx.font = '9px ' + T.mono; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (let v = lo; v <= hi + step / 2; v += step) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.strokeStyle = T.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      if (padL) { ctx.fillStyle = T.ink3; ctx.fillText((spec.yFmt || String)(v), padL - 5, y); }
    }
    if (!spec.noX) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = T.ink3;
      const xf = spec.xFmt || ((t) => SQ.fmt.local(new Date(t)));
      ctx.fillText(xf(x0), padL, h - 3);
      ctx.textAlign = 'right'; ctx.fillText(xf(x1), w - padR, h - 3);
    }
    /* area then line, broken at gaps */
    const path = new Path2D();
    let open = false, firstX = 0, lastX = 0;
    const area = new Path2D();
    for (let i = 0; i < xs.length; i++) {
      const v = ys[i];
      if (!isFinite(v)) { if (open && spec.fill) { area.lineTo(lastX, Y(lo)); area.lineTo(firstX, Y(lo)); area.closePath(); } open = false; continue; }
      const x = X(xs[i]), y = Y(v);
      if (!open) { path.moveTo(x, y); if (spec.fill) { area.moveTo(x, Y(lo)); area.lineTo(x, y); } firstX = x; open = true; }
      else { path.lineTo(x, y); if (spec.fill) area.lineTo(x, y); }
      lastX = x;
    }
    if (open && spec.fill) { area.lineTo(lastX, Y(lo)); area.lineTo(firstX, Y(lo)); area.closePath(); }
    if (spec.fill) { ctx.fillStyle = spec.color; ctx.globalAlpha = 0.14; ctx.fill(area); ctx.globalAlpha = 1; }
    ctx.strokeStyle = spec.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(path);
    cv._spec = spec;
    cv._geom = { X, Y, padL, padR, pw, x0, x1, w };
    /* hover crosshair */
    if (spec.hoverX != null && spec.hoverX >= x0 && spec.hoverX <= x1) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < xs.length; i++) { const d = Math.abs(xs[i] - spec.hoverX); if (d < bd && isFinite(ys[i])) { bd = d; bi = i; } }
      const x = X(xs[bi]), y = Y(ys[bi]);
      ctx.strokeStyle = T.ink3; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, padT); ctx.lineTo(Math.round(x) + 0.5, padT + ph); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = spec.color; ctx.strokeStyle = T.surf; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      label(ctx, T, x, 0, (spec.tipFmt || spec.yFmt || String)(ys[bi], xs[bi]), w);
    }
  }
  /* attach hover once; onHover(xValue|null) lets callers sync several charts */
  function hover(cv, onHover) {
    if (cv._hov) return;
    cv._hov = true;
    const move = (e) => {
      const g = cv._geom;
      if (!g || !cv._spec) return;
      const r = cv.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const f = U.clamp((px - g.padL) / g.pw, 0, 1);
      onHover(g.x0 + f * (g.x1 - g.x0));
    };
    cv.addEventListener('mousemove', move);
    cv.addEventListener('touchmove', move, { passive: true });
    cv.addEventListener('touchstart', move, { passive: true });
    cv.addEventListener('mouseleave', () => onHover(null));
    cv.addEventListener('touchend', () => setTimeout(() => onHover(null), 1200));
  }

  /* vertical bars with rounded data-ends and 2px gaps. spec: {bins:[{v, c, label}], hover} */
  function bars(cv, spec) {
    const { ctx, w, h } = setup(cv);
    const T = tok();
    const bins = spec.bins, n = bins.length;
    const padL = 4, padR = 4, padT = 20, padB = 16, ph = h - padT - padB;
    const max = Math.max(1, ...bins.map((b) => b.v));
    const bw = (w - padL - padR) / n;
    ctx.strokeStyle = T.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT + ph + 0.5); ctx.lineTo(w - padR, padT + ph + 0.5); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const b = bins[i], bh = Math.round((b.v / max) * ph);
      const x = padL + i * bw + 1, ww = Math.max(1, bw - 2), y = padT + ph - bh;
      ctx.globalAlpha = spec.hover == null || spec.hover === i ? 1 : 0.45;
      ctx.fillStyle = b.c;
      if (bh > 0) {
        const r = Math.min(4, ww / 2, bh);
        ctx.beginPath();
        ctx.moveTo(x, padT + ph); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + ww - r, y); ctx.quadraticCurveTo(x + ww, y, x + ww, y + r); ctx.lineTo(x + ww, padT + ph); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = T.ink3; ctx.font = '9px ' + T.mono; ctx.textBaseline = 'alphabetic';
    (spec.ticks || []).forEach(([i, t]) => { ctx.textAlign = i === 0 ? 'left' : i >= n ? 'right' : 'center'; ctx.fillText(t, padL + i * bw, h - 3); });
    if (spec.hover != null && bins[spec.hover]) {
      const b = bins[spec.hover];
      label(ctx, T, padL + (spec.hover + 0.5) * bw, 0, b.label + ': ' + b.v, w);
    }
    cv._bars = { n, bw, padL };
  }
  function barsHover(cv, onHover) {
    if (cv._hovb) return;
    cv._hovb = true;
    const move = (e) => {
      const g = cv._bars;
      if (!g) return;
      const r = cv.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const i = Math.floor((px - g.padL) / g.bw);
      onHover(i >= 0 && i < g.n ? i : null);
    };
    cv.addEventListener('mousemove', move);
    cv.addEventListener('touchstart', move, { passive: true });
    cv.addEventListener('touchmove', move, { passive: true });
    cv.addEventListener('mouseleave', () => onHover(null));
  }

  SQ.charts = { series, hover, bars, barsHover, tok: () => tok() };
  SQ.on('setting:style', () => { tokens = null; });
})();

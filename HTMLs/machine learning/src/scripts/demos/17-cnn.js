{
  const N = 16;
  const KERNELS = {
    'Vertical edges': [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    'Horizontal edges': [-1, -2, -1, 0, 0, 0, 1, 2, 1],
    Outline: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    Sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    Blur: [1, 1, 1, 1, 1, 1, 1, 1, 1].map(v => +(v / 9).toFixed(3)),
    Identity: [0, 0, 0, 0, 1, 0, 0, 0, 0]
  };
  const strokes = segs => {
    const g = new Float64Array(N * N);
    for (const [x0, y0, x1, y1] of segs) for (let t = 0; t <= 1; t += 0.01) {
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const d = Math.hypot(i - x, j - y); if (d < 1.1) g[j * N + i] = Math.max(g[j * N + i], d < 0.6 ? 1 : 0.6); }
    }
    return g;
  };
  const IMAGES = {
    Digit: () => strokes([[10, 2, 10, 14], [10, 2, 3, 10], [3, 10, 13, 10]]),
    Letter: () => strokes([[3, 14, 8, 2], [8, 2, 13, 14], [5, 9.5, 11, 9.5]]),
    Square: () => { const g = new Float64Array(N * N); for (let j = 4; j < 12; j++) for (let i = 4; i < 12; i++) g[j * N + i] = 1; return g; },
    Circle: () => { const g = new Float64Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) g[j * N + i] = Math.hypot(i - 7.5, j - 7.5) < 5.5 ? 1 : 0; return g; },
    Blank: () => new Float64Array(N * N)
  };
  ML.demo('conv', (body, fig) => {
    let img = IMAGES.Digit(), K = KERNELS['Vertical edges'].slice(), relu = false, pool = false, sel = null, out = null;
    const at = (g, i, j) => i < 0 || j < 0 || i >= N || j >= N ? 0 : g[j * N + i];
    const convolve = () => {
      out = new Float64Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        let s = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += at(img, i + a, j + b) * K[(b + 1) * 3 + a + 1];
        out[j * N + i] = relu ? Math.max(0, s) : s;
      }
    };
    const cols = h('div', { class: 'fig-cols three' }); body.append(cols);
    const c1 = h('div'), c2 = h('div'), c3 = h('div'); cols.append(c1, c2, c3);
    c1.append(h('div', { class: 'sub-lbl', text: 'Input image (draw on it)' }));
    c2.append(h('div', { class: 'sub-lbl', text: '3 × 3 kernel (edit the numbers)' }));
    const outLbl = h('div', { class: 'sub-lbl', text: 'Feature map (hover a cell)' }); c3.append(outLbl);
    const opts = { aspect: 1, maxH: 280, minH: 180, pad: { l: 0, r: 0, t: 0, b: 0 } };
    const I = new Plot(c1, opts), O = new Plot(c3, Object.assign({ scroll: true }, opts));
    const kgrid = h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-width:210px' }); c2.append(kgrid);
    const kin = K.map((v, idx) => { const e = h('input', { type: 'number', step: '0.1', value: v, 'aria-label': 'kernel weight ' + (idx + 1), style: 'width:100%;height:40px;text-align:center;font-family:var(--f-mono);font-size:14px;border:1px solid var(--line);background:var(--surface-2);border-radius:3px' }); e.addEventListener('input', () => { K[idx] = +e.value || 0; ksel.set(null); run(); }); kgrid.append(e); return e; });
    const calc = h('div', { class: 'hint', style: 'margin-top:12px;line-height:1.6;min-height:6.5em' }); c2.append(calc);
    const cellPx = P => P.W / N;
    const paint = (P, g, mode) => {
      const c = P.begin(), s = cellPx(P); let m = 1e-9;
      if (mode === 'div') for (const v of g) m = Math.max(m, Math.abs(v));
      const ink = rgb('ink'), a1 = rgb('c1'), a2 = rgb('c2');
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const v = g[j * N + i];
        if (mode === 'div') { const t = v / m, cc = t >= 0 ? a2 : a1; c.fillStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${Math.abs(t).toFixed(3)})`; }
        else c.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${v.toFixed(3)})`;
        c.fillRect(i * s, j * s, s + 0.5, s + 0.5);
      }
      c.strokeStyle = col('line-2'); c.lineWidth = 1; c.beginPath();
      for (let k = 0; k <= N; k++) { c.moveTo(Math.round(k * s) + .5, 0); c.lineTo(Math.round(k * s) + .5, P.H); c.moveTo(0, Math.round(k * s) + .5); c.lineTo(P.W, Math.round(k * s) + .5); }
      c.stroke();
    };
    const box = (P, i, j, n, color) => { const s = cellPx(P), c = P.ctx; c.strokeStyle = color; c.lineWidth = 2.5; c.strokeRect(i * s + 1, j * s + 1, n * s - 2, n * s - 2); };
    const pooled = () => { const p = new Float64Array(N * N); for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) { const m = Math.max(out[j * N + i], out[j * N + i + 1], out[(j + 1) * N + i], out[(j + 1) * N + i + 1]); p[j * N + i] = p[j * N + i + 1] = p[(j + 1) * N + i] = p[(j + 1) * N + i + 1] = m; } return p; };
    const draw = () => {
      paint(I, img, 'gray');
      paint(O, pool ? pooled() : out, 'div');
      if (sel) {
        const [i, j] = sel;
        box(I, i - 1, j - 1, 3, col('accent'));
        box(O, pool ? i - i % 2 : i, pool ? j - j % 2 : j, pool ? 2 : 1, col('accent'));
        let rows = '', s = 0;
        for (let b = -1; b <= 1; b++) { const r = []; for (let a = -1; a <= 1; a++) { const v = at(img, i + a, j + b), k = K[(b + 1) * 3 + a + 1]; s += v * k; r.push(`${v.toFixed(1)}×${k}`); } rows += r.join('  ') + '<br>'; }
        calc.innerHTML = `${rows}sum = <b style="color:var(--ink)">${s.toFixed(2)}</b>${relu ? `, after ReLU ${Math.max(0, s).toFixed(2)}` : ''}`;
      } else calc.textContent = 'Hover or tap a feature map cell to see the 9 multiplications behind it.';
      outLbl.textContent = pool ? 'After 2 × 2 max pooling (8 × 8 blocks)' : 'Feature map (hover a cell)';
    };
    I.draw = O.draw = draw;
    const run = () => { convolve(); draw(); };
    const cellOf = (P, p) => [clamp(Math.floor(p.px / cellPx(P)), 0, N - 1), clamp(Math.floor(p.py / cellPx(P)), 0, N - 1)];
    let penVal = 1;
    I.pointer({
      down(p) { const [i, j] = cellOf(I, p); penVal = img[j * N + i] > 0.5 ? 0 : 1; img[j * N + i] = penVal; sel = [i, j]; run(); },
      move(p, d) { if (!d) return; const [i, j] = cellOf(I, p); img[j * N + i] = penVal; sel = [i, j]; run(); }
    });
    O.pointer({ down(p) { sel = cellOf(O, p); anim.stop(); draw(); }, move(p) { sel = cellOf(O, p); draw(); } });
    let k = 0;
    const anim = ML.loop(fig, (() => { let acc = 0; return dt => { acc += dt; if (acc < 0.06) return; acc = 0; sel = [k % N, Math.floor(k / N)]; draw(); k++; if (k >= N * N) { k = 0; return false; } }; })());
    anim.onchange = on => slide.textContent = on ? 'Stop' : 'Slide the kernel';
    const r1 = UI.row(body);
    const slide = UI.btn(r1, 'Slide the kernel', () => { if (!anim.running) k = 0; anim.toggle(); }, 'primary');
    UI.tgl(r1, 'ReLU', false, v => { relu = v; run(); });
    UI.tgl(r1, '2 × 2 max pool', false, v => { pool = v; draw(); });
    const r2 = UI.row(body);
    const ksel = UI.seg(r2, { label: 'Kernel', options: Object.keys(KERNELS).map(n => [n, n]), value: 'Vertical edges', on: n => { K = KERNELS[n].slice(); kin.forEach((e, i) => e.value = K[i]); run(); } });
    const r3 = UI.row(body);
    UI.seg(r3, { label: 'Image', options: Object.keys(IMAGES).map(n => [n, n]), value: 'Digit', on: n => { img = IMAGES[n](); run(); } });
    UI.legend(body, [['c2', 'positive response'], ['c1', 'negative response'], ['accent', 'receptive field', 'sq']]);
    run();
  });
}

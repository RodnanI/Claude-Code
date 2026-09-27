{
  /* ---------- Activation functions ---------- */
  const ACT = {
    sigmoid: { f: sigmoid, note: 'Squashes to (0, 1). Its slope is at most 0.25 and nearly 0 for large |z|, so gradients shrink layer after layer: the vanishing gradient problem. Still used for binary outputs and gates.' },
    tanh: { f: Math.tanh, note: 'Squashes to (-1, 1) and is centered at zero, which trains better than sigmoid in hidden layers. Still saturates at the ends.' },
    relu: { f: z => Math.max(0, z), note: 'max(0, z). Cheap, does not saturate for positive inputs, and made deep networks practical. Downside: a neuron stuck with negative inputs outputs 0 with 0 gradient ("dead ReLU").' },
    leaky: { f: z => z > 0 ? z : 0.1 * z, note: 'Like ReLU but with a small slope for negative inputs, so neurons never fully die.' },
    gelu: { f: z => 0.5 * z * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z ** 3))), note: 'A smooth ReLU that lets small negative values through. The default in transformers such as GPT and BERT.' }
  };
  ML.demo('activations', body => {
    let cur = 'relu', deriv = true, all = false;
    const P = new Plot(body, { x: [-4, 4], y: [-1.4, 3], aspect: 0.5, maxH: 340, minH: 220, pad: { l: 8, r: 8, t: 8, b: 8 } });
    const ex = UI.explain(body);
    P.draw = () => {
      P.begin(); P.grid(1, 1); P.axes({ zero: true, dx: 1, dy: 1 });
      if (all) for (const k in ACT) if (k !== cur) P.fn(ACT[k].f, rgba('ink-2', 0.3), 1.5);
      const f = ACT[cur].f;
      if (deriv) P.fn(z => (f(z + 1e-4) - f(z - 1e-4)) / 2e-4, col('accent'), 2, [6, 4]);
      P.fn(f, col('ink'), 3);
      ex.innerHTML = '<b>' + cur + '.</b> ' + ACT[cur].note;
    };
    const r = UI.row(body);
    UI.seg(r, { label: 'Function', options: [['sigmoid', 'Sigmoid'], ['tanh', 'Tanh'], ['relu', 'ReLU'], ['leaky', 'Leaky ReLU'], ['gelu', 'GELU']], value: cur, on: v => { cur = v; P.draw(); } });
    const r2 = UI.row(body);
    UI.tgl(r2, 'Show derivative (slope)', true, v => { deriv = v; P.draw(); });
    UI.tgl(r2, 'Compare with the others', false, v => { all = v; P.draw(); });
    UI.legend(body, [['ink', 'activation f(z)', 'ln'], ['accent', "derivative f'(z)", 'ln']]);
    body.append(ex);
    P.draw();
  });

  /* ---------- Backprop step-through on a computational graph ---------- */
  ML.demo('backprop', body => {
    const v = { x: 1.5, w: 0.8, b: -0.4, y: 1 }, lr = 0.5;
    let step = 0, n = {};
    const compute = () => {
      const u = v.w * v.x, z = u + v.b, a = sigmoid(z), L = (a - v.y) ** 2;
      const dA = 2 * (a - v.y), dZ = dA * a * (1 - a);
      n = { x: [v.x, dZ * v.w], w: [v.w, dZ * v.x], b: [v.b, dZ], u: [u, dZ], z: [z, dZ], a: [a, dA], y: [v.y, null], L: [L, 1] };
    };
    const STEPS = [
      ['', 'Press "Next step" to run the network forward, then backward.'],
      ['u', () => `<b>Forward.</b> Multiply: u = w · x = ${f(v.w)} × ${f(v.x)} = <b>${f(n.u[0])}</b>`],
      ['z', () => `<b>Forward.</b> Add the bias: z = u + b = ${f(n.u[0])} + ${f(v.b)} = <b>${f(n.z[0])}</b>`],
      ['a', () => `<b>Forward.</b> Activation: a = σ(z) = <b>${f(n.a[0])}</b>. This is the prediction.`],
      ['L', () => `<b>Forward.</b> Loss: L = (a − y)² = (${f(n.a[0])} − ${f(v.y)})² = <b>${f(n.L[0])}</b>. Now go backward.`],
      ['La', () => `<b>Backward.</b> ∂L/∂a = 2(a − y) = <b>${f(n.a[1])}</b>. How the loss reacts to the prediction.`],
      ['az', () => `<b>Backward, chain rule.</b> ∂L/∂z = ∂L/∂a · σ′(z) = ${f(n.a[1])} × ${f(n.a[0] * (1 - n.a[0]))} = <b>${f(n.z[1])}</b>. Local slope times the gradient arriving from above.`],
      ['zb', () => `<b>Backward.</b> Addition passes gradients through unchanged: ∂L/∂u = ∂L/∂b = <b>${f(n.z[1])}</b>.`],
      ['uw', () => `<b>Backward.</b> Multiplication swaps inputs: ∂L/∂w = ∂L/∂u · x = <b>${f(n.w[1])}</b>, and ∂L/∂x = ∂L/∂u · w = ${f(n.x[1])}.`],
      ['done', () => `<b>Done.</b> Every parameter now has a gradient. A gradient step with η = ${lr} would set w to ${f(v.w - lr * n.w[1])} and b to ${f(v.b - lr * n.b[1])}. Press "Apply update" and run again: the loss drops.`]
    ];
    const f = x => x == null ? '' : (Math.abs(x) < 0.0005 ? '0.000' : x.toFixed(3));
    const holder = h('div', { class: 'static', style: 'margin:0' }); body.append(holder);
    const ex = UI.explain(body);
    const LAY = {
      wide: { vb: '0 0 680 250', x: [50, 50], w: [50, 140], b: [200, 210], u: [200, 95], z: [340, 150], a: [470, 150], y: [470, 225], L: [610, 150] },
      tall: { vb: '0 0 340 520', x: [70, 40], w: [220, 40], u: [145, 130], b: [285, 130], z: [190, 225], a: [190, 320], y: [300, 320], L: [245, 420] }
    };
    const NODES = [['x', 'x', 'input'], ['w', 'w', 'weight'], ['b', 'b', 'bias'], ['u', '×', 'u = w·x'], ['z', '+', 'z = u + b'], ['a', 'σ', 'a = σ(z)'], ['y', 'y', 'target'], ['L', '(a−y)²', 'loss L']];
    const EDGES = [['x', 'u'], ['w', 'u'], ['u', 'z'], ['b', 'z'], ['z', 'a'], ['a', 'L'], ['y', 'L']];
    const fwdAt = { u: 1, z: 2, a: 3, L: 4, x: 0, w: 0, b: 0, y: 0 };
    const bwdAt = { L: 5, a: 5, z: 6, u: 7, b: 7, w: 8, x: 8 };
    const render = () => {
      const lay = body.clientWidth < 520 ? LAY.tall : LAY.wide, active = STEPS[step][0];
      let s = `<svg class="dg" viewBox="${lay.vb}" role="img" aria-label="Computational graph of one neuron with a squared error loss">`;
      for (const [a, b] of EDGES) {
        const [x1, y1] = lay[a], [x2, y2] = lay[b];
        const back = step >= 5 && bwdAt[b] <= step && bwdAt[a] <= step;
        s += `<path class="${back ? 'ln-a' : 'ln'}" d="M${x1} ${y1} L${x2} ${y2}" ${back ? 'marker-start="url(#aha)"' : 'marker-end="url(#ah)"'} opacity=".8"/>`;
      }
      for (const [k, sym, lbl] of NODES) {
        const [x, y] = lay[k], showF = fwdAt[k] <= step, showB = n[k][1] != null && bwdAt[k] <= step;
        const hot = active.includes(k) || (active === 'La' && k === 'a') || (active === 'done' && (k === 'w' || k === 'b'));
        s += `<g transform="translate(${x} ${y})"><rect x="-44" y="-28" width="88" height="56" rx="4" class="${hot ? 'bx-a' : 'bx'}"/>`;
        s += `<text y="-10" text-anchor="middle" class="t-ser">${sym}</text>`;
        s += `<text y="7" text-anchor="middle" class="t-ink">${showF ? f(n[k][0]) : ''}</text>`;
        s += `<text y="22" text-anchor="middle" class="t-acc">${showB ? '∇ ' + f(n[k][1]) : ''}</text>`;
        s += `<text y="-34" text-anchor="middle" class="t-mut halo">${lbl}</text></g>`;
      }
      holder.innerHTML = s + '</svg>';
      const e = STEPS[step][1]; ex.innerHTML = typeof e === 'function' ? e() : e;
      st.set('L', f(n.L[0])); st.set('s', `${step} / ${STEPS.length - 1}`);
    };
    const reset = () => { step = 0; compute(); render(); };
    const r1 = UI.row(body);
    UI.btn(r1, 'Next step', () => { step = Math.min(STEPS.length - 1, step + 1); render(); }, 'primary');
    UI.btn(r1, 'Back', () => { step = Math.max(0, step - 1); render(); });
    UI.btn(r1, 'Apply update', () => { compute(); v.w -= lr * n.w[1]; v.b -= lr * n.b[1]; sw.set(v.w); sb.set(v.b); reset(); });
    const r2 = UI.row(body);
    const sw = UI.slider(r2, { label: 'w', min: -3, max: 3, step: 0.01, value: v.w, fmt: x => x.toFixed(2), on: x => { v.w = x; reset(); } });
    const sb = UI.slider(r2, { label: 'b', min: -3, max: 3, step: 0.01, value: v.b, fmt: x => x.toFixed(2), on: x => { v.b = x; reset(); } });
    UI.slider(r2, { label: 'x', min: -3, max: 3, step: 0.01, value: v.x, fmt: x => x.toFixed(2), on: x => { v.x = x; reset(); } });
    UI.seg(r2, { label: 'target y', options: [[0, '0'], [1, '1']], value: 1, on: x => { v.y = x; reset(); } });
    const st = UI.stats(body, [['L', 'loss'], ['s', 'step']]);
    new ResizeObserver(() => render()).observe(body);
    reset();
  });
}

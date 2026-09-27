{
  ML.demo('teach', body => {
    let pts = Data.blobs(14, 11, 0.1), cls = 0;
    const P = classPlot(body, { scroll: false });
    const prob = (x, y) => {
      if (!pts.length) return 0.5;
      const d = pts.map(p => [Math.hypot(p.x - x, p.y - y), p.c]).sort((a, b) => a[0] - b[0]).slice(0, 5);
      let s = 0, w = 0;
      for (const [dd, c] of d) { const k = 1 / (dd + 0.06); s += k * c; w += k; }
      return s / w;
    };
    P.draw = () => {
      P.begin();
      if (pts.length) P.field((x, y) => probPx(prob(x, y), 0.3), 7);
      frame(P);
      drawPts(P, pts, 6);
      if (!pts.length) P.text('Tap anywhere to add examples', P.W / 2, P.H / 2, { align: 'center', color: col('muted'), size: 12 });
      st.set('n', pts.length);
      st.set('a', pts.filter(p => !p.c).length + ' / ' + pts.filter(p => p.c).length);
    };
    const r = UI.row(body);
    classPicker(r, v => cls = v);
    UI.btn(r, 'Clear', () => { pts = []; P.draw(); });
    UI.btn(r, 'New sample', () => { pts = Data.blobs(14, (Math.random() * 1e6) | 0, 0.2); P.draw(); });
    UI.legend(body, [['c1', 'Class A'], ['c2', 'Class B'], ['c1', 'Shading: what the model predicts there', 'sq']]);
    const st = UI.stats(body, [['n', 'examples'], ['a', 'A / B'], ['m', 'model']]);
    st.set('m', '5 nearest');
    editPoints(P, () => pts, () => cls, () => P.draw());
    P.draw();
  });
}

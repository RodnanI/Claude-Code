{
  const MAP = ['........', '.###....', '...#.PP.', 'S..#...G', '.....PP.', '........'];
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  ML.demo('gridworld', (body, fig) => {
    const C = 8, R = 6;
    let grid = MAP.map(r => r.split('')), Q, pos, ep = 0, epRet = 0, epLen = 0, rets = [], wins = [], total = 0;
    let eps = 0.2, alpha = 0.5, gamma = 0.95, speed = 20, tool = '#', path = true;
    const start = () => { for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (grid[y][x] === 'S') return [x, y]; return [0, 0]; };
    const resetQ = () => { Q = Array.from({ length: R * C }, () => [0, 0, 0, 0]); pos = start(); ep = 0; epRet = 0; epLen = 0; rets = []; wins = []; total = 0; };
    const best = s => { const q = Q[s]; let b = 0; for (let a = 1; a < 4; a++) if (q[a] > q[b]) b = a; return b; };
    const step = () => {
      const s = pos[1] * C + pos[0];
      let a = Math.random() < eps ? Math.floor(Math.random() * 4) : best(s);
      if (Q[s].every(v => v === Q[s][0]) && Math.random() >= eps) a = Math.floor(Math.random() * 4);
      let nx = pos[0] + DIRS[a][0], ny = pos[1] + DIRS[a][1];
      if (nx < 0 || ny < 0 || nx >= C || ny >= R || grid[ny][nx] === '#') { nx = pos[0]; ny = pos[1]; }
      const cell = grid[ny][nx], term = cell === 'G' || cell === 'P', r = cell === 'G' ? 1 : cell === 'P' ? -1 : -0.04;
      const s2 = ny * C + nx, target = r + (term ? 0 : gamma * Math.max(...Q[s2]));
      Q[s][a] += alpha * (target - Q[s][a]);
      epRet += r; epLen++; total++;
      if (term || epLen >= 100) {
        rets.push(epRet); wins.push(cell === 'G' ? 1 : 0); if (rets.length > 300) { rets.shift(); wins.shift(); }
        ep++; epRet = 0; epLen = 0; pos = start();
      } else pos = [nx, ny];
    };
    const cols = h('div', { class: 'fig-cols' }); body.append(cols);
    const a = h('div'), b = h('div'); cols.append(a, b);
    const G = new Plot(a, { height: w => w * R / C, pad: { l: 0, r: 0, t: 0, b: 0 } });
    b.append(h('div', { class: 'sub-lbl', text: 'Return per episode (moving average of 20)' }));
    const Rp = new Plot(b, { x: [0, 300], y: [-1.5, 1], aspect: 0.6, maxH: 200, minH: 130, pad: { l: 30, r: 8, t: 8, b: 18 }, scroll: true });
    const expl = h('div', { class: 'explain', html: 'Each cell shows four triangles, one per action (up, right, down, left). Teal means the agent has learned that moving that way leads to reward, orange that it leads to a pit. The small mark shows the current best action.' });
    b.append(expl);
    const draw = () => {
      const c = G.begin(), s = G.W / C, ink = col('ink'), a1 = rgb('c1'), a2 = rgb('c2');
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        const X = x * s, Y = y * s, t = grid[y][x];
        if (t === '#') { c.fillStyle = col('ink-2'); c.fillRect(X, Y, s, s); continue; }
        if (t === 'G' || t === 'P') { c.fillStyle = col(t === 'G' ? 'c2' : 'c1'); c.fillRect(X, Y, s, s); G.text(t === 'G' ? '+1' : '−1', X + s / 2, Y + s / 2 + 5, { align: 'center', color: col('surface'), size: 14 }); continue; }
        const q = Q[y * C + x], cx = X + s / 2, cy = Y + s / 2, corners = [[X, Y], [X + s, Y], [X + s, Y + s], [X, Y + s]];
        for (let k = 0; k < 4; k++) {
          const v = clamp(q[k], -1, 1), cc = v >= 0 ? a2 : a1;
          const p1 = corners[k], p2 = corners[(k + 1) % 4];
          c.fillStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${(Math.abs(v) * 0.85).toFixed(3)})`;
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.fill();
        }
        if (q.some(v => v !== 0)) { const d = DIRS[best(y * C + x)]; c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - d[0] * s * 0.12, cy - d[1] * s * 0.12); c.lineTo(cx + d[0] * s * 0.22, cy + d[1] * s * 0.22); c.stroke(); c.fillStyle = ink; c.beginPath(); c.arc(cx + d[0] * s * 0.22, cy + d[1] * s * 0.22, 2.6, 0, TAU); c.fill(); }
        if (t === 'S') G.text('start', X + 4, Y + 12, { color: col('ink'), size: 10 });
      }
      c.strokeStyle = col('line'); c.lineWidth = 1; c.beginPath();
      for (let x = 0; x <= C; x++) { c.moveTo(Math.round(x * s) + .5, 0); c.lineTo(Math.round(x * s) + .5, G.H); }
      for (let y = 0; y <= R; y++) { c.moveTo(0, Math.round(y * s) + .5); c.lineTo(G.W, Math.round(y * s) + .5); }
      c.stroke();
      if (path && ep > 0) {
        let p = start(); const seen = new Set(); c.strokeStyle = col('accent'); c.lineWidth = 3; c.beginPath(); c.moveTo((p[0] + .5) * s, (p[1] + .5) * s);
        for (let i = 0; i < 40; i++) {
          const si = p[1] * C + p[0]; if (seen.has(si)) break; seen.add(si);
          const d = DIRS[best(si)]; let nx = p[0] + d[0], ny = p[1] + d[1];
          if (nx < 0 || ny < 0 || nx >= C || ny >= R || grid[ny][nx] === '#') break;
          p = [nx, ny]; c.lineTo((nx + .5) * s, (ny + .5) * s); if ('GP'.includes(grid[ny][nx])) break;
        }
        c.stroke();
      }
      c.fillStyle = col('ink'); c.strokeStyle = col('surface'); c.lineWidth = 2; c.beginPath(); c.arc((pos[0] + .5) * s, (pos[1] + .5) * s, s * 0.2, 0, TAU); c.fill(); c.stroke();
      Rp.begin(); Rp.grid(50, 0.5); Rp.axes({ dx: 100, dy: 0.5, zero: true, xl: 'episodes (latest 300)' });
      const ma = rets.map((_, i) => { const w = rets.slice(Math.max(0, i - 19), i + 1); return [i, mean(w)]; });
      Rp.path(ma, col('ink'), 2);
      const recent = wins.slice(-50);
      st.set('ep', ep); st.set('st', total); st.set('w', recent.length ? Math.round(100 * mean(recent)) + '%' : '-');
    };
    G.draw = Rp.draw = draw;
    const loop = ML.loop(fig, () => { for (let i = 0; i < speed; i++) step(); draw(); });
    loop.onchange = on => run.textContent = on ? 'Pause' : 'Run';
    G.pointer({
      down(p) {
        const x = Math.floor(p.px / (G.W / C)), y = Math.floor(p.py / (G.W / C));
        if (x < 0 || y < 0 || x >= C || y >= R || 'SG'.includes(grid[y][x])) return;
        grid[y][x] = grid[y][x] === tool ? '.' : tool;
        if (pos[0] === x && pos[1] === y) pos = start();
        draw();
      }
    });
    const r1 = UI.row(body);
    const run = UI.btn(r1, 'Run', () => loop.toggle(), 'primary');
    UI.btn(r1, 'Step', () => { loop.stop(); step(); draw(); });
    UI.btn(r1, 'Reset learning', () => { resetQ(); draw(); });
    UI.seg(r1, { label: 'Tap a cell to toggle', options: [['#', 'Wall'], ['P', 'Pit']], value: tool, on: v => tool = v });
    const r2 = UI.row(body);
    UI.slider(r2, { label: 'exploration ε', min: 0, max: 0.6, step: 0.01, value: eps, fmt: v => fmt(v, 2), on: v => eps = v });
    UI.slider(r2, { label: 'learning rate α', min: 0.05, max: 1, step: 0.05, value: alpha, fmt: v => fmt(v, 2), on: v => alpha = v });
    UI.slider(r2, { label: 'discount γ', min: 0.5, max: 0.99, step: 0.01, value: gamma, fmt: v => fmt(v, 2), on: v => gamma = v });
    UI.slider(r2, { label: 'speed (steps per frame)', min: 1, max: 200, step: 1, value: speed, on: v => speed = v });
    const r3 = UI.row(body);
    UI.tgl(r3, 'Show greedy path from start', true, v => { path = v; draw(); });
    const st = UI.stats(body, [['ep', 'episodes'], ['st', 'steps'], ['w', 'goal rate (last 50)']]);
    resetQ(); draw();
  });
}

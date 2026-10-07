/* Palimpsest / political
   What changes from year to year: who holds which land, where the roads run,
   which towns stand and what they are called. Borders are grown outward from
   each town by the cost of walking there, then washed in pigment along their
   inner edge. Borders of earlier centuries stay on the sheet, faint, like lines
   scraped off a reused page; renamed towns keep their old names, struck through. */
'use strict';
(function () {
  const P = window.P;
  const U = P.util;
  const R = () => P.Render;

  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const darken = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.round(v * k);
    return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  function create(world, g, terr) {
    const T = world.terrain, W = world.W, H = world.H;
    const W2 = W >> 1, H2 = H >> 1;
    const cost = new Float32Array(W2 * H2);
    const B = P.BIOME;
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      let land = 0, e = 0, extra = 0, lake = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = (y * 2 + dy) * W + x * 2 + dx;
        if (T.water[i]) continue;
        if (T.lake[i] >= 0) { lake++; continue; }
        land++;
        e += T.elev[i];
        const b = T.biome[i];
        extra += (b === B.FOREST || b === B.TAIGA || b === B.JUNGLE ? 0.3 : 0) + (b === B.MARSH ? 0.8 : 0) + (b === B.DESERT ? 0.5 : 0) + (T.isRiver[i] ? 0.5 : 0);
      }
      const k = y * W2 + x;
      if (!land) { cost[k] = Infinity; continue; }
      e /= land;
      cost[k] = 1 + (e > 0.45 ? 2.6 : e > 0.3 ? 0.9 : 0) + extra / land + lake * 0.8;
    }
    return { world, g, terr, W2, H2, cost, cache: new Map(), order: [], roads: new Map(), measures: new Map(), keepOut: [], labelPref: new Map(), ghosts: new Map() };
  }

  const radius = (pop) => (5 + 3.2 * Math.log2(1 + pop / 250)) / 2;

  function territory(st, y) {
    if (st.pinned && st.pinned.has(y)) return st.pinned.get(y);
    if (st.cache.has(y)) return st.cache.get(y);
    const { world, W2, H2, cost } = st;
    const S = world.settlements, PS = world.polities;
    const N2 = W2 * H2;
    const best = new Float32Array(N2).fill(Infinity);
    const own = new Int16Array(N2).fill(-1);
    const heap = new P.Heap(4096);
    for (const s of S) {
      const pop = s.popY[y];
      if (!(pop > 0)) continue;
      const c = (s.y >> 1) * W2 + (s.x >> 1);
      const r = radius(pop);
      if (-r < best[c]) { best[c] = -r; own[c] = s.id; heap.push(-r, c); }
    }
    while (heap.size) {
      const c = heap.pop(), k = heap.lastKey;
      if (k > best[c]) continue;
      const x = c % W2, yy = (c / W2) | 0;
      for (let d = 0; d < 8; d++) {
        const D = P.N8[d];
        const nx = x + D[0], ny = yy + D[1];
        if (nx < 0 || ny < 0 || nx >= W2 || ny >= H2) continue;
        const n = ny * W2 + nx;
        const cc = cost[n];
        if (cc === Infinity) continue;
        const nk = k + D[2] * cc;
        if (nk >= 0 || nk >= best[n]) continue;
        best[n] = nk; own[n] = own[c]; heap.push(nk, n);
      }
    }
    const pol = new Int16Array(N2).fill(-1);
    for (let i = 0; i < N2; i++) if (own[i] >= 0) pol[i] = S[own[i]].ownerY[y];
    const res = { y, own, pol, polys: outlines(st, pol) };
    if (y % 50 === 0) {
      // the snapshots that ghost borders are drawn from are kept for good
      if (!st.pinned) st.pinned = new Map();
      st.pinned.set(y, res);
      return res;
    }
    st.cache.set(y, res);
    st.order.push(y);
    if (st.order.length > 48) st.cache.delete(st.order.shift());
    return res;
  }

  function outlines(st, pol) {
    const { world, g, W2, H2 } = st;
    const T = world.terrain, W = world.W;
    const N2 = W2 * H2;
    // one pass to find every realm's extent, so the heavy work runs on a small window
    const box = new Map();
    for (let i = 0; i < N2; i++) {
      const q = pol[i];
      if (q < 0) continue;
      const x = i % W2, y = (i / W2) | 0;
      let b = box.get(q);
      if (!b) { b = { x0: x, y0: y, x1: x, y1: y, n: 0 }; box.set(q, b); }
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      b.n++;
    }
    const wob = st.wob || (st.wob = R().wobbler(world.seed + 'borders'));
    const polys = new Map();
    for (const [pid, bb] of box) {
      const area = bb.n;
      if (area < 3) continue;
      const ox = Math.max(0, bb.x0 - 3), oy = Math.max(0, bb.y0 - 3);
      const bw = Math.min(W2, bb.x1 + 4) - ox, bh = Math.min(H2, bb.y1 + 4) - oy;
      const mask = new Float32Array(bw * bh);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) mask[y * bw + x] = pol[(y + oy) * W2 + x + ox] === pid ? 1 : 0;
      const field = U.blur(mask, bw, bh, 1, 1);
      const loops = U.contours(field, bw, bh, 0.5, 0).filter((l) => l.closed && l.pts.length >= 6);
      const path = new Path2D();
      const parts = [];
      for (const l of loops) {
        const sm = U.chaikin(l.pts, true, 2);
        const px = [];
        const flags = new Uint8Array(sm.length / 2);
        for (let i = 0; i < sm.length; i += 2) {
          const u = sm[i] + ox, v = sm[i + 1] + oy;
          px.push(g.M + (2 * u + 1) * g.S, g.M + (2 * v + 1) * g.S);
          const gx = Math.round(2 * u + 0.5), gy = Math.round(2 * v + 0.5);
          let coastal = true;
          if (gx >= 0 && gy >= 0 && gx < W && gy < world.H) coastal = T.landDist[gy * W + gx] < 1.6;
          if (coastal) { flags[i / 2] = 0; continue; }
          let other = -2;
          for (const ux of [Math.floor(u), Math.ceil(u)]) for (const vy of [Math.floor(v), Math.ceil(v)]) {
            if (ux < 0 || vy < 0 || ux >= W2 || vy >= H2) continue;
            const q = pol[vy * W2 + ux];
            if (q !== pid) other = Math.max(other, q);
          }
          flags[i / 2] = other >= 0 ? (pid < other ? 1 : 0) : other === -1 ? 2 : 1;
        }
        const w = wob(px, 1.3, 0.05);
        path.moveTo(w[0], w[1]);
        for (let i = 2; i < w.length; i += 2) path.lineTo(w[i], w[i + 1]);
        path.closePath();
        parts.push({ pts: w, flags });
      }
      // a place to write the realm's name: the point deepest inside it
      const inside = U.edt(mask.map((v) => 1 - v), bw, bh);
      let bi = -1, bd = 0, cx = 0, cy = 0;
      for (let i = 0; i < bw * bh; i++) if (mask[i]) { cx += i % bw; cy += (i / bw) | 0; if (inside[i] > bd) { bd = inside[i]; bi = i; } }
      cx /= area; cy /= area;
      let sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < bw * bh; i++) if (mask[i]) { const dx = (i % bw) - cx, dy = ((i / bw) | 0) - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const spread = Math.sqrt((sxx + syy) / area);
      polys.set(pid, { path, parts, area, label: { x: g.M + (2 * ((bi % bw) + ox) + 1) * g.S, y: g.M + (2 * (((bi / bw) | 0) + oy) + 1) * g.S, depth: bd, angle: ang, spread } });
    }
    return polys;
  }

  function ghostOf(st, p) {
    let gh = st.ghosts.get(p.id);
    if (gh !== undefined) return gh;
    const t = territory(st, Math.max(0, p.ended - 1));
    const poly = t.polys.get(p.id);
    gh = null;
    if (poly && poly.area >= 70 && poly.label.depth >= 2.2) {
      const f = formAt(p, p.ended - 1);
      const raw = f === 'tribe' ? st.world.cultures[p.culture].plural : polityName(p, p.ended - 1).text(p.ended - 1);
      gh = { x: poly.label.x, y: poly.label.y, angle: U.clamp(poly.label.angle, -0.45, 0.45), fs: U.clamp(Math.sqrt(poly.area) * 1.7, 22, 46), text: raw.toUpperCase() };
    }
    st.ghosts.set(p.id, gh);
    return gh;
  }

  /* work that can be done before it is needed: a list of small jobs */
  function prepareJobs(st) {
    const jobs = [];
    const W = st.world;
    for (let y = 0; y <= W.years; y += 50) jobs.push(() => territory(st, y));
    for (const rd of W.roads) jobs.push(() => roadPath(st, W.settlements[rd.a], W.settlements[rd.b]));
    for (const p of W.polities) if (p.ended !== null && p.ended - p.founded >= 40) jobs.push(() => ghostOf(st, p));
    return jobs;
  }

  function strokeRuns(ctx, part, want) {
    const pts = part.pts, fl = part.flags, n = fl.length;
    let open = false;
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const i = k % n;
      const on = fl[i] === want;
      if (on) {
        if (!open) { ctx.moveTo(pts[i * 2], pts[i * 2 + 1]); open = true; }
        else ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      } else open = false;
    }
    ctx.stroke();
  }

  /* A* along the land for roads, cached for good */
  function roadPath(st, a, b) {
    const key = a.id + ':' + b.id;
    if (st.roads.has(key)) return st.roads.get(key);
    const { world, g } = st;
    const T = world.terrain, W = world.W, H = world.H;
    const start = a.y * W + a.x, goal = b.y * W + b.x;
    const gs = new Float32Array(W * H).fill(Infinity);
    const from = new Int32Array(W * H).fill(-1);
    const heap = new P.Heap(2048);
    gs[start] = 0;
    heap.push(0, start);
    const h = (i) => Math.hypot((i % W) - b.x, ((i / W) | 0) - b.y);
    let found = false, guard = 0;
    while (heap.size && guard++ < 60000) {
      const c = heap.pop();
      if (c === goal) { found = true; break; }
      const x = c % W, y = (c / W) | 0;
      for (const D of P.N8) {
        const nx = x + D[0], ny = y + D[1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (T.water[n] || T.lake[n] >= 0) continue;
        const e = T.elev[n];
        const cst = D[2] * (1 + e * 6 + T.slope[n] * 120 + (T.isRiver[n] ? 2.5 : 0));
        const ng = gs[c] + cst;
        if (ng < gs[n]) { gs[n] = ng; from[n] = c; heap.push(ng + h(n), n); }
      }
    }
    let pts = null;
    if (found) {
      const cells = [];
      for (let c = goal; c >= 0; c = from[c]) cells.push(c);
      cells.reverse();
      const raw = [];
      for (let k = 0; k < cells.length; k += 2) raw.push(cells[k] % W, (cells[k] / W) | 0);
      raw.push(b.x, b.y);
      pts = R().toPx(g, U.chaikin(raw, false, 2));
    }
    st.roads.set(key, pts);
    return pts;
  }

  function capitalAt(p, y) {
    let c = p.capitals[0].s;
    for (const e of p.capitals) if (e.year <= y) c = e.s;
    return c;
  }
  function formAt(p, y) { let f = p.forms[0].form; for (const e of p.forms) if (e.year <= y) f = e.form; return f; }
  function polityName(p, y) { let n = p.names[0].name; for (const e of p.names) if (e.year <= y) n = e.name; return n; }

  function tierOf(world, s, y) {
    const pid = s.ownerY[y];
    if (pid >= 0) {
      const p = world.polities[pid];
      if (capitalAt(p, y) === s.id) return formAt(p, y) === 'tribe' ? 'seat' : 'capital';
    }
    const pop = s.popY[y];
    return pop > 6500 ? 'city' : pop > 1800 ? 'town' : 'village';
  }

  const FONTS = () => {
    const F = R().FONT;
    return {
      capital: [`35px ${F.sc}`, 35], seat: [`29px ${F.sc}`, 29], city: [`29px ${F.roman}`, 29], town: [`25px ${F.roman}`, 25], village: [`italic 21px ${F.roman}`, 21],
    };
  };

  function measure(st, ctx, font, text) {
    const k = font + '|' + text;
    let w = st.measures.get(k);
    if (w === undefined) { ctx.font = font; w = ctx.measureText(text).width; st.measures.set(k, w); }
    return w;
  }

  function spacedText(ctx, halo, text, x, y, angle, fs, spacing, curv, fill, haloW) {
    const chars = text.split('');
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let s = -total / 2;
    const place = (fn) => {
      let pos = s;
      for (let k = 0; k < chars.length; k++) {
        const mid = pos + widths[k] / 2;
        const u = total > 0 ? (2 * mid) / total : 0;
        const a = angle + curv * u;
        const off = curv * u * u * total * 0.25;
        const px = x + Math.cos(angle) * mid - Math.sin(angle) * off;
        const py = y + Math.sin(angle) * mid + Math.cos(angle) * off;
        fn(chars[k], px, py, a);
        pos += widths[k] + spacing;
      }
    };
    if (halo) {
      halo.font = ctx.font; halo.lineWidth = haloW || 8; halo.lineJoin = 'round';
      halo.textAlign = 'center'; halo.textBaseline = 'middle';
      place((c, px, py, a) => { halo.save(); halo.translate(px, py); halo.rotate(a); halo.strokeText(c, 0, 0); halo.fillText(c, 0, 0); halo.restore(); });
    }
    ctx.fillStyle = fill;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    place((c, px, py, a) => { ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.fillText(c, 0, 0); ctx.restore(); });
    return total;
  }

  function sword(ctx, x, y, s, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#7d2617'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (const d of [1, -1]) {
      ctx.save();
      ctx.rotate((d * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.35); ctx.lineTo(0, s * 1.3);
      ctx.moveTo(-s * 0.5, s * 0.72); ctx.lineTo(s * 0.5, s * 0.72);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function ruinSpan(s, y) {
    for (const sp of s.spans) if (sp.from <= y && (sp.to === null || sp.to > y)) return sp;
    return null;
  }

  function render(st, y, ctx, halo, opts) {
    opts = opts || {};
    const { world, g } = st;
    const S = world.settlements, PS = world.polities, T = world.terrain;
    const F = R().FONT, INK = R().INK;
    ctx.clearRect(0, 0, g.CW, g.CH);
    halo.clearRect(0, 0, g.CW, g.CH);
    halo.fillStyle = '#000'; halo.strokeStyle = '#000';
    const terr = territory(st, opts.borderYear !== undefined ? opts.borderYear : y);
    const land = st.terr.dryPath;

    /* faint lines left by earlier centuries */
    for (const [back, alpha] of [[150, 0.5], [330, 0.32]]) {
      const gy = Math.floor((y - back) / 50) * 50;
      if (gy < 20) continue;
      const old = territory(st, gy);
      ctx.save();
      ctx.strokeStyle = hexA('#8f6f50', alpha);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 5]);
      for (const poly of old.polys.values()) for (const part of poly.parts) { strokeRuns(ctx, part, 1); strokeRuns(ctx, part, 2); }
      ctx.restore();
    }

    /* pigment along the inside of every border */
    for (const [pid, poly] of terr.polys) {
      const pig = PS[pid].pigment.ink;
      ctx.save();
      ctx.clip(land, 'evenodd');
      ctx.clip(poly.path, 'evenodd');
      ctx.fillStyle = hexA(pig, 0.075);
      ctx.fill(poly.path, 'evenodd');
      ctx.lineJoin = 'round';
      for (const [w, a] of [[26, 0.09], [16, 0.11], [8, 0.15]]) {
        ctx.strokeStyle = hexA(pig, a);
        ctx.lineWidth = w;
        ctx.stroke(poly.path);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const poly of terr.polys.values()) for (const part of poly.parts) {
      ctx.strokeStyle = '#4b3021'; ctx.lineWidth = 1.7; ctx.setLineDash([11, 4, 2, 4]);
      strokeRuns(ctx, part, 1);
      ctx.strokeStyle = '#8a6c4c'; ctx.lineWidth = 1.1; ctx.setLineDash([3, 6]);
      strokeRuns(ctx, part, 2);
    }
    ctx.restore();

    /* roads */
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const rd of world.roads) {
      if (rd.year > y) continue;
      const a = S[rd.a], b = S[rd.b];
      if (a.founded > y || b.founded > y) continue;
      const pts = roadPath(st, a, b);
      if (!pts) continue;
      const live = a.popY[y] > 0 && b.popY[y] > 0;
      ctx.strokeStyle = live ? '#6d5236' : '#b49c7e';
      ctx.lineWidth = live ? 1.25 : 1;
      ctx.setLineDash(live ? [4, 3] : [2, 5]);
      ctx.beginPath(); R().trace(ctx, pts, false); ctx.stroke();
    }
    ctx.restore();

    /* battles of living memory */
    for (const w of world.wars) {
      if (w.start > y || w.start < y - 70) continue;
      for (const b of w.battles) {
        if (b.year > y || b.year < y - 45) continue;
        sword(ctx, g.X(b.x), g.Y(b.y), 5.5, 0.25 + 0.75 * (1 - (y - b.year) / 45));
      }
    }

    /* realms that have fallen leave their names on the sheet for a while, scraped thin */
    for (const p of PS) {
      if (p.ended === null || p.ended >= y || y - p.ended > 220 || p.ended - p.founded < 40) continue;
      const gh = ghostOf(st, p);
      if (!gh) continue;
      const fade = 1 - (y - p.ended) / 220;
      ctx.font = `${Math.round(gh.fs)}px ${F.sc}`;
      const tw = spacedText(ctx, null, gh.text, gh.x, gh.y, gh.angle, gh.fs, gh.fs * 0.45, 0.06, `rgba(128,100,72,${0.34 * fade})`);
      ctx.save();
      ctx.translate(gh.x, gh.y); ctx.rotate(gh.angle);
      ctx.strokeStyle = `rgba(128,100,72,${0.3 * fade})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-tw / 2 - 6, 1); ctx.lineTo(tw / 2 + 6, -2); ctx.stroke();
      ctx.restore();
    }

    /* realm names, broad and pale, under everything else */
    for (const [pid, poly] of terr.polys) {
      if (poly.area < 70 || poly.label.depth < 2.2) continue;
      const p = PS[pid];
      const f = formAt(p, y);
      const c = world.cultures[p.culture];
      const raw = f === 'tribe' ? c.plural : polityName(p, y).text(y);
      const text = raw.toUpperCase();
      let fs = U.clamp(Math.sqrt(poly.area) * 2.2, 24, 58);
      const ang = U.clamp(poly.label.angle, -0.45, 0.45);
      ctx.font = `${Math.round(fs)}px ${F.sc}`;
      const maxLen = poly.label.spread * 2 * 2 * g.S * 1.6;
      let spacing = fs * 0.55;
      let total = ctx.measureText(text).width + spacing * (text.length - 1);
      while (total > maxLen && fs > 20) { fs -= 2; spacing = fs * 0.4; ctx.font = `${Math.round(fs)}px ${F.sc}`; total = ctx.measureText(text).width + spacing * (text.length - 1); }
      spacedText(ctx, null, text, poly.label.x, poly.label.y, ang, fs, spacing, 0.12, hexA(p.pigment.ink, 0.72));
      if (f === 'empire' || f === 'city') {
        ctx.font = `italic ${Math.round(fs * 0.42)}px ${F.roman}`;
        spacedText(ctx, null, f === 'empire' ? 'the empire of' : 'the free city of', poly.label.x - Math.sin(ang) * -fs * 0.85, poly.label.y - Math.cos(ang) * fs * 0.85, ang, fs * 0.42, 2, 0, hexA(p.pigment.ink, 0.7));
      }
    }

    /* towns, their symbols and their names */
    const boxes = st.keepOut.slice();
    const overl = (b) => boxes.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const items = [];
    const cover = st.keepOut[0];
    for (const s of S) {
      if (s.founded > y) continue;
      const alive = s.popY[y] > 0;
      const x = g.X(s.x), yy = g.Y(s.y);
      if (cover && x > cover.x && x < cover.x + cover.w && y > 0 && yy > cover.y && yy < cover.y + cover.h) continue;
      if (!alive) {
        const sp = ruinSpan(s, y);
        if (!sp) continue;
        items.push({ s, x, y: yy, tier: 'ruin', pri: s.peak > 1500 ? 1.5 : 0.2, span: sp });
        continue;
      }
      const tier = tierOf(world, s, y);
      const pri = { capital: 6, seat: 5, city: 4, town: 3, village: 1 }[tier] + s.popY[y] / 100000;
      items.push({ s, x, y: yy, tier, pri });
    }
    items.sort((a, b) => b.pri - a.pri);
    const rad = { capital: 7.5, seat: 6.5, city: 6.5, town: 5, village: 3.6, ruin: 4 };
    for (const it of items) {
      const r = rad[it.tier];
      boxes.push({ x: it.x - r - 1, y: it.y - r - 1, w: 2 * r + 2, h: 2 * r + 2 });
      halo.beginPath(); halo.arc(it.x, it.y, r + 2.5, 0, Math.PI * 2); halo.fill();
    }
    const F2 = FONTS();
    for (const it of items) {
      const { s, x } = it;
      const yy = it.y;
      const r = rad[it.tier];
      // symbol
      ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.fillStyle = INK;
      if (it.tier === 'ruin') {
        ctx.save(); ctx.strokeStyle = '#94785a'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, yy, r, 0.3, 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, yy, r, 2.5, 4.1); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, yy, r, 4.7, 5.9); ctx.stroke();
        ctx.restore();
      } else if (it.tier === 'capital' || it.tier === 'seat') {
        const p = PS[s.ownerY[y]];
        ctx.fillStyle = hexA(p.pigment.ink, 0.9);
        ctx.beginPath(); ctx.arc(x, yy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#efe2c4';
        ctx.beginPath(); ctx.arc(x, yy, r * 0.32, 0, Math.PI * 2); ctx.fill();
        if (it.tier === 'capital') {
          ctx.beginPath(); ctx.moveTo(x, yy - r); ctx.lineTo(x, yy - r - 11); ctx.stroke();
          ctx.fillStyle = hexA(p.pigment.ink, 0.95);
          ctx.beginPath(); ctx.moveTo(x, yy - r - 11); ctx.lineTo(x + 9, yy - r - 8.5); ctx.lineTo(x, yy - r - 6); ctx.closePath(); ctx.fill(); ctx.lineWidth = 0.8; ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.arc(x, yy, r, 0, Math.PI * 2); ctx.stroke();
        if (it.tier !== 'village') { ctx.beginPath(); ctx.arc(x, yy, 1.5, 0, Math.PI * 2); ctx.fill(); }
        if (it.tier === 'city') { ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, yy, r - 2.6, 0, Math.PI * 2); ctx.stroke(); }
      }
      // name
      const nm = world.nameAt(s, y);
      let text = nm.text(y), font, fs, color = INK;
      if (it.tier === 'ruin') {
        if (s.peak < 1500) continue;
        text = 'ruins of ' + world.nameAt(s, it.span.from).text(it.span.from);
        font = `italic 16px ${F.roman}`; fs = 16; color = '#8c7256';
      } else {
        [font, fs] = F2[it.tier];
        if (it.tier === 'capital' || it.tier === 'seat') color = darken(PS[s.ownerY[y]].pigment.ink, 0.62);
      }
      const w = measure(st, ctx, font, text);
      const cands = [[x + r + 5, yy + fs * 0.33, 'left'], [x - r - 5, yy + fs * 0.33, 'right'], [x, yy - r - 6, 'center'], [x, yy + r + fs * 0.85, 'center'], [x + r + 3, yy - r - 2, 'left'], [x + r + 3, yy + r + fs * 0.7, 'left']];
      let placed = null;
      // a town keeps the side its name was written on last year, if it still fits
      const pref = st.labelPref.get(s.id);
      const order = pref !== undefined ? [pref].concat(cands.map((c, k) => k).filter((k) => k !== pref)) : cands.map((c, k) => k);
      for (const k of order) {
        const [cx, cy, al] = cands[k];
        const bx = al === 'left' ? cx : al === 'right' ? cx - w : cx - w / 2;
        const b = { x: bx - 2, y: cy - fs * 0.8, w: w + 4, h: fs * 1.02 };
        if (b.x < g.map[0] || b.x + b.w > g.map[2] || b.y < g.map[1] || b.y + b.h > g.map[3]) continue;
        if (!overl(b)) { placed = { cx, cy, al, b }; st.labelPref.set(s.id, k); break; }
      }
      if (!placed && (it.tier === 'capital' || it.tier === 'seat')) {
        // a capital is always named, even if it has to crowd its neighbours
        const [cx, cy, al] = cands[0];
        placed = { cx, cy, al, b: { x: cx - 2, y: cy - fs * 0.8, w: w + 4, h: fs * 1.02 } };
      }
      if (!placed) continue;
      boxes.push(placed.b);
      ctx.font = font; ctx.textAlign = placed.al; ctx.textBaseline = 'alphabetic';
      halo.font = font; halo.textAlign = placed.al; halo.textBaseline = 'alphabetic'; halo.lineWidth = 7; halo.lineJoin = 'round';
      halo.strokeText(text, placed.cx, placed.cy);
      ctx.fillStyle = color;
      ctx.fillText(text, placed.cx, placed.cy);
      it.label = placed;
      // the old name, struck through: a palimpsest's one honest line
      if (it.tier !== 'ruin' && s.names.length > 1) {
        let cur = 0;
        for (let k = 0; k < s.names.length; k++) if (s.names[k].year <= y) cur = k;
        if (cur > 0) {
          const prev = s.names[cur - 1], now = s.names[cur];
          const oldText = prev.name.text(now.year - 1);
          if (oldText !== text && y - now.year < 400) {
            const ofs = Math.round(fs * 0.74);
            const of = `italic ${ofs}px ${F.roman}`;
            const ow = measure(st, ctx, of, oldText);
            const ox = placed.al === 'left' ? placed.cx : placed.al === 'right' ? placed.cx - ow : placed.cx - ow / 2;
            const top = placed.b.y + placed.b.h + 1;
            const oy = top + ofs * 0.78;
            const ob = { x: ox - 2, y: top, w: ow + 4, h: ofs * 0.95 };
            if (!overl(ob)) {
              boxes.push(ob);
              ctx.font = of; ctx.textAlign = 'left';
              const fade = U.clamp(1 - (y - now.year) / 400, 0.5, 1);
              ctx.fillStyle = `rgba(104,76,50,${0.88 * fade})`;
              ctx.fillText(oldText, ox, oy);
              ctx.strokeStyle = `rgba(104,76,50,${0.8 * fade})`;
              ctx.lineWidth = 1.3;
              ctx.beginPath(); ctx.moveTo(ox - 1, oy - ofs * 0.3); ctx.lineTo(ox + ow + 1, oy - ofs * 0.34); ctx.stroke();
            }
          }
        }
      }
    }

    /* the names of seas, mountains, rivers, woods: given when the first people came near */
    const feat = (f, kind) => {
      if (!f.name || y < f.year) return;
      const text = f.name.text(y);
      let x = g.X(f.x), yy = g.Y(f.y), ang = 0, fs, spacing, color, curv = 0;
      if (kind === 'sea') { fs = f.kind === 'inland' ? 28 : 34; spacing = fs * 0.32; color = '#5b4632'; curv = 0.08; }
      else if (kind === 'range') { fs = 21; spacing = fs * 0.42; color = '#4a3828'; ang = U.clamp(f.angle, -0.6, 0.6); }
      else if (kind === 'lake') { fs = 16; spacing = 2; color = '#4a3a2a'; }
      else { fs = 19; spacing = fs * 0.38; color = '#7a6247'; ang = U.clamp(f.angle || 0, -0.5, 0.5); }
      ctx.font = `italic ${fs}px ${F.roman}`;
      const tw = ctx.measureText(text).width + spacing * (text.length - 1);
      const b = { x: x - tw / 2 - 4, y: yy - fs * 0.7, w: tw + 8, h: fs * 1.4 };
      if (overl(b)) {
        if (kind !== 'sea') return;
        yy += fs * 1.6; b.y += fs * 1.6;
        if (overl(b)) return;
      }
      boxes.push(b);
      spacedText(ctx, kind === 'range' || kind === 'wood' ? null : halo, text, x, yy, ang, fs, spacing, curv, color, kind === 'sea' ? 12 : 8);
      if (kind === 'sea' && f.name.gloss) {
        ctx.font = `italic 17px ${F.roman}`;
        const gl = '(the ' + f.name.gloss.replace(/^the /, '') + ')';
        ctx.fillStyle = '#7b6650'; ctx.textAlign = 'center';
        halo.font = ctx.font; halo.lineWidth = 7; halo.textAlign = 'center'; halo.strokeText(gl, x, yy + fs * 0.95);
        ctx.fillText(gl, x, yy + fs * 0.95);
      }
    };
    for (const f of T.features.seas) feat(f, 'sea');
    for (const f of T.features.ranges) feat(f, 'range');
    for (const f of T.features.lakes) feat(f, 'lake');
    for (const f of T.features.woods.concat(T.features.wastes, T.features.fens)) feat(f, 'wood');
    // rivers carry their names along their middle reach
    for (const f of T.features.rivers) {
      const rv = T.rivers[f.river];
      if (!rv.name || y < f.year) continue;
      const n = rv.cells.length;
      const a = rv.cells[Math.floor(n * 0.35)], b = rv.cells[Math.floor(n * 0.6)];
      const ax = g.X(a % world.W), ay = g.Y((a / world.W) | 0), bx = g.X(b % world.W), by = g.Y((b / world.W) | 0);
      let ang = Math.atan2(by - ay, bx - ax);
      if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      if (Math.abs(ang) > 1.1) continue;
      const text = rv.name.text(y);
      ctx.font = `italic 17px ${F.roman}`;
      const tw = ctx.measureText(text).width + 3 * (text.length - 1);
      const mx = (ax + bx) / 2 - Math.sin(ang) * 10, my = (ay + by) / 2 + Math.cos(ang) * -10;
      const bb = { x: mx - tw / 2, y: my - 10, w: tw, h: 20 };
      if (overl(bb)) continue;
      boxes.push(bb);
      spacedText(ctx, halo, text, mx, my, ang, 17, 3, 0, '#3f3022', 6);
    }
    return terr;
  }

  /* what is under the pointer */
  function pick(st, y, px, py) {
    const { world, g } = st;
    let best = null, bd = 18;
    for (const s of world.settlements) {
      if (s.founded > y) continue;
      const d = Math.hypot(g.X(s.x) - px, g.Y(s.y) - py);
      if (d < bd) { bd = d; best = { kind: 'settlement', id: s.id }; }
    }
    if (best) return best;
    for (const w of world.wars) {
      if (w.start > y || w.start < y - 70) continue;
      for (const b of w.battles) {
        if (b.year > y || b.year < y - 45) continue;
        const d = Math.hypot(g.X(b.x) - px, g.Y(b.y) - py);
        if (d < 12) return { kind: 'battle', battle: b, war: w };
      }
    }
    const t = st.cache.get(y);
    if (t) {
      const [gx, gy] = g.toGrid(px, py);
      const u = Math.floor((gx + 0.5) / 2), v = Math.floor((gy + 0.5) / 2);
      if (u >= 0 && v >= 0 && u < st.W2 && v < st.H2) {
        const pid = t.pol[v * st.W2 + u];
        if (pid >= 0) return { kind: 'realm', id: pid };
      }
    }
    return null;
  }

  P.Political = { create, territory, render, pick, prepareJobs, capitalAt, formAt, polityName, tierOf };
})();

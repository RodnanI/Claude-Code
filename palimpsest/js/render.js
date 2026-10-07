/* Palimpsest / render
   Paper first, then ink. The terrain is not painted, it is drawn: every coast
   segment, ripple, river, mountain and tree is a small operation that can be
   replayed in order, so the map can be watched as it is made. Everything is
   drawn in opaque ink on its own sheet, which is laid over the paper by
   multiplication, the way iron-gall ink sits in parchment. */
'use strict';
(function () {
  const P = window.P;
  const U = P.util;

  const INK = '#2a1d13', INK2 = '#3b2a1c', SEPIA = '#6e5236';
  const RIPPLE = ['#5f4b36', '#7d6850', '#968269', '#ab9a82', '#bdae98'];
  const FONT = {
    roman: '"IM Fell English", "Palatino Linotype", Georgia, serif',
    sc: '"IM Fell English SC", "IM Fell English", Georgia, serif',
    pica: '"IM Fell DW Pica", "IM Fell English", Georgia, serif',
    primer: '"IM Fell Great Primer", "IM Fell English", Georgia, serif',
  };

  function geometry(world) {
    const S = 7.5, M = 72;
    const g = { S, M, W: world.W, H: world.H, CW: Math.round(world.W * S + 2 * M), CH: Math.round(world.H * S + 2 * M) };
    g.X = (gx) => M + (gx + 0.5) * S;
    g.Y = (gy) => M + (gy + 0.5) * S;
    g.toGrid = (px, py) => [(px - M) / S - 0.5, (py - M) / S - 0.5];
    g.map = [M, M, M + world.W * S, M + world.H * S];
    return g;
  }

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function wobbler(seed) {
    const n = new P.Noise(new P.Rng(seed + '§wobble'));
    return function (pts, amp, freq) {
      const out = new Array(pts.length);
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i], y = pts[i + 1];
        out[i] = x + amp * n.n2(x * freq, y * freq);
        out[i + 1] = y + amp * n.n2(x * freq + 31.7, y * freq - 17.3);
      }
      return out;
    };
  }

  function trace(ctx, pts, closed) {
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    if (closed) ctx.closePath();
  }

  function toPx(g, pts) {
    const out = new Array(pts.length);
    for (let i = 0; i < pts.length; i += 2) { out[i] = g.X(pts[i]); out[i + 1] = g.Y(pts[i + 1]); }
    return out;
  }

  /* ---------- paper ---------- */
  function paper(world, g) {
    const rng = world.rng.fork('paper');
    const noise = new P.Noise(rng.fork('n'));
    const c = canvas(g.CW, g.CH), ctx = c.getContext('2d');
    // the sheet's own outline is ragged
    const edge = [];
    const pad = 14;
    const per = 2 * (g.CW + g.CH);
    const steps = 420;
    for (let k = 0; k < steps; k++) {
      const d = (k / steps) * per;
      let x, y, nx, ny;
      if (d < g.CW) { x = d; y = 0; nx = 0; ny = 1; }
      else if (d < g.CW + g.CH) { x = g.CW; y = d - g.CW; nx = -1; ny = 0; }
      else if (d < 2 * g.CW + g.CH) { x = g.CW - (d - g.CW - g.CH); y = g.CH; nx = 0; ny = -1; }
      else { x = 0; y = g.CH - (d - 2 * g.CW - g.CH); nx = 1; ny = 0; }
      const j = pad + 6 * noise.fbm(d * 0.004, 3.3, 3) + 2.2 * noise.n2(d * 0.08, 9.1);
      edge.push(x + nx * j, y + ny * j);
    }
    ctx.save();
    ctx.beginPath(); trace(ctx, edge, true); ctx.clip();
    // blotchy base, computed small and spread wide
    const sw = Math.ceil(g.CW / 8), sh = Math.ceil(g.CH / 8);
    const small = canvas(sw, sh), sc = small.getContext('2d');
    const img = sc.createImageData(sw, sh);
    const base = [236, 224, 196], dark = [214, 192, 150];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      let n = 0.5 + 0.55 * noise.fbm(x * 0.018, y * 0.018, 4) + 0.25 * noise.n2(x * 0.07 + 40, y * 0.07);
      const ex = Math.min(x, sw - 1 - x) / sw, ey = Math.min(y, sh - 1 - y) / sh;
      n += Math.max(0, 0.11 - Math.min(ex, ey * 1.3)) * 5.5;
      n = U.clamp(n, 0, 1.25);
      const i = (y * sw + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = U.clamp(base[k] + (dark[k] - base[k]) * n, 0, 255);
      img.data[i + 3] = 255;
    }
    sc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, g.CW, g.CH);
    // grain
    const tile = canvas(192, 192), tc = tile.getContext('2d');
    const ti = tc.createImageData(192, 192);
    for (let i = 0; i < 192 * 192; i++) {
      const v = rng.next();
      const dk = v < 0.5;
      ti.data[i * 4] = dk ? 90 : 255; ti.data[i * 4 + 1] = dk ? 66 : 250; ti.data[i * 4 + 2] = dk ? 40 : 238;
      ti.data[i * 4 + 3] = Math.floor(Math.pow(rng.next(), 3) * (dk ? 34 : 28));
    }
    tc.putImageData(ti, 0, 0);
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, g.CW, g.CH);
    // fibres
    for (let k = 0; k < 1500; k++) {
      const x = rng.range(0, g.CW), y = rng.range(0, g.CH), a = rng.range(0, Math.PI), L = rng.range(6, 34);
      ctx.strokeStyle = rng.chance(0.6) ? `rgba(120,86,48,${rng.range(0.03, 0.08)})` : `rgba(255,251,236,${rng.range(0.05, 0.12)})`;
      ctx.lineWidth = rng.range(0.5, 1.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + rng.range(-3, 3), y + Math.sin(a) * L * 0.5 + rng.range(-3, 3), x + Math.cos(a) * L, y + Math.sin(a) * L);
      ctx.stroke();
    }
    // a tide-line stain, and sometimes the ring of a cup
    const stain = (cx, cy, r, alpha) => {
      const pts = [];
      for (let k = 0; k < 90; k++) {
        const a = (k / 90) * Math.PI * 2;
        const rr = r * (1 + 0.28 * noise.fbm(Math.cos(a) * 1.4 + cx * 0.01, Math.sin(a) * 1.4 + cy * 0.01, 3));
        pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
      }
      ctx.fillStyle = `rgba(170,128,72,${alpha * 0.45})`;
      ctx.beginPath(); trace(ctx, pts, true); ctx.fill();
      ctx.strokeStyle = `rgba(140,98,52,${alpha})`;
      ctx.lineWidth = rng.range(1.5, 3.5);
      ctx.stroke();
    };
    const ns = rng.int(1, 3);
    for (let k = 0; k < ns; k++) stain(rng.range(150, g.CW - 150), rng.range(150, g.CH - 150), rng.range(90, 260), rng.range(0.05, 0.1));
    if (rng.chance(0.6)) {
      const cx = rng.chance(0.5) ? rng.range(170, 420) : rng.range(g.CW - 420, g.CW - 170);
      const cy = rng.chance(0.5) ? rng.range(170, 380) : rng.range(g.CH - 380, g.CH - 170);
      const r = rng.range(70, 95);
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `rgba(120,78,38,${rng.range(0.05, 0.11)})`;
        ctx.lineWidth = rng.range(2, 6);
        const a0 = rng.range(0, Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(cx + rng.range(-3, 3), cy + rng.range(-3, 3), r + rng.range(-2, 2), r * 0.97, 0, a0, a0 + rng.range(4.2, 6.2));
        ctx.stroke();
      }
    }
    // foxing
    const nf = rng.int(25, 70);
    for (let k = 0; k < nf; k++) {
      const x = rng.range(20, g.CW - 20), y = rng.range(20, g.CH - 20), r = rng.range(1.5, 9);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(150,96,44,${rng.range(0.12, 0.3)})`);
      gr.addColorStop(1, 'rgba(150,96,44,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // the edges are browner, handled for centuries
    const burn = (x0, y0, x1, y1, w) => {
      const gr = ctx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(112,74,36,0.36)');
      gr.addColorStop(1, 'rgba(112,74,36,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || g.CW, Math.abs(y1 - y0) || g.CH);
    };
    burn(0, 0, 0, 90); burn(0, g.CH, 0, g.CH - 90); burn(0, 0, 90, 0); burn(g.CW, 0, g.CW - 90, 0);
    ctx.restore();
    ctx.strokeStyle = 'rgba(96,64,32,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); trace(ctx, edge, true); ctx.stroke();
    return c;
  }

  /* ---------- shapes shared by the terrain and the decorations ---------- */
  function erase(ctx, fn) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    fn();
    ctx.restore();
  }

  function mountain(ctx, x, y, w, h, rnd, snowy) {
    const skew = (rnd() - 0.5) * w * 0.25;
    const px = x + skew, py = y - h;
    const L = [x - w / 2, y], R = [x + w / 2, y];
    const left = [L[0], L[1]];
    const n = 5;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const bow = Math.sin(t * Math.PI) * w * 0.05;
      left.push(L[0] + (px - L[0]) * t - bow + (rnd() - 0.5) * w * 0.04, L[1] + (py - L[1]) * Math.pow(t, 0.9) + (rnd() - 0.5) * h * 0.05);
    }
    left.push(px, py);
    const right = [px, py];
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const bow = Math.sin(t * Math.PI) * w * 0.06;
      right.push(px + (R[0] - px) * t + bow + (rnd() - 0.5) * w * 0.04, py + (R[1] - py) * Math.pow(t, 1.1) + (rnd() - 0.5) * h * 0.05);
    }
    right.push(R[0], R[1]);
    erase(ctx, () => {
      ctx.beginPath();
      trace(ctx, left.concat(right.slice(2)), false);
      ctx.quadraticCurveTo(x, y + h * 0.08, L[0], L[1]);
      ctx.fill();
    });
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 1.7;
    ctx.beginPath(); trace(ctx, left, false); ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath(); trace(ctx, right, false); ctx.stroke();
    // shade the side away from the light
    const hatch = Math.max(3, Math.round(w / 4.2));
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = INK2;
    ctx.beginPath();
    for (let k = snowy ? 2 : 1; k <= hatch; k++) {
      const t = k / (hatch + 1);
      const i = Math.min(right.length / 2 - 1, Math.floor(t * (right.length / 2 - 1)));
      const sx = right[i * 2] - 1, sy = right[i * 2 + 1] + 1.5;
      const len = (y - sy) * 0.75;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - len * 0.45, sy + len * 0.85);
    }
    ctx.stroke();
    if (snowy) {
      ctx.lineWidth = 1;
      ctx.beginPath();
      const sy = py + h * 0.3;
      ctx.moveTo(px - w * 0.16, sy);
      ctx.lineTo(px - w * 0.08, sy - h * 0.06);
      ctx.lineTo(px, sy + h * 0.03);
      ctx.lineTo(px + w * 0.08, sy - h * 0.05);
      ctx.lineTo(px + w * 0.17, sy + h * 0.02);
      ctx.stroke();
    }
  }

  function hill(ctx, x, y, w, h, rnd) {
    erase(ctx, () => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y - h * 2, x + w / 2, y); ctx.closePath(); ctx.fill(); });
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y - h * 2, x + w / 2, y); ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const sx = x + w * (0.08 + 0.13 * k) + (rnd() - 0.5), sy = y - h * (0.62 - 0.17 * k);
      ctx.moveTo(sx, sy); ctx.lineTo(sx - 1.2, sy + h * 0.45);
    }
    ctx.stroke();
  }

  function tree(ctx, x, y, r, kind, rnd) {
    if (kind === 'conifer') {
      const h = r * 3, w = r * 1.7;
      const pts = [x, y - h];
      const tiers = 3;
      for (let k = 1; k <= tiers; k++) { const t = k / tiers; pts.push(x + w * 0.5 * t, y - h + h * 0.82 * t, x + w * 0.18 * t, y - h + h * 0.82 * t - h * 0.1); }
      const right = pts.slice();
      const left = [];
      for (let i = 2; i < right.length; i += 2) left.push(2 * x - right[i], right[i + 1]);
      const outline = right.concat(reversePts(left));
      erase(ctx, () => { ctx.beginPath(); trace(ctx, outline, true); ctx.fill(); ctx.fillRect(x - 1, y - h * 0.2, 2, h * 0.3); });
      ctx.strokeStyle = INK; ctx.lineWidth = 1.05; ctx.lineJoin = 'round';
      ctx.beginPath(); trace(ctx, outline, true); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - h * 0.18); ctx.lineTo(x, y + r * 0.35); ctx.stroke();
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x + w * 0.12, y - h * 0.35); ctx.lineTo(x + w * 0.3, y - h * 0.24); ctx.stroke();
      return;
    }
    const cy = y - r * 1.15;
    const bumps = kind === 'jungle' ? 9 : 7, ph = rnd() * 6.28;
    const pts = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const rr = r * (1 + 0.13 * Math.sin(a * bumps + ph));
      pts.push(x + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92);
    }
    erase(ctx, () => { ctx.beginPath(); trace(ctx, pts, true); ctx.fill(); ctx.fillRect(x - 1, cy, 2, r * 1.6); });
    ctx.strokeStyle = INK; ctx.lineWidth = 1.05;
    ctx.beginPath(); trace(ctx, pts, true); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, cy + r * 0.92); ctx.lineTo(x, y + r * 0.25); ctx.stroke();
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(x + r * 0.1, cy + r * 0.05, r * 0.62, 0.15, 1.35);
    ctx.stroke();
  }
  function reversePts(a) { const o = []; for (let i = a.length - 2; i >= 0; i -= 2) o.push(a[i], a[i + 1]); return o; }

  function tuft(ctx, x, y, s, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.7); ctx.lineTo(x - s * 0.15, y);
    ctx.moveTo(x, y - s); ctx.lineTo(x, y);
    ctx.moveTo(x + s * 0.5, y - s * 0.7); ctx.lineTo(x + s * 0.15, y);
    ctx.stroke();
  }

  /* ---------- the terrain, as operations to be replayed ---------- */
  function terrainOps(world, g) {
    const T = world.terrain, W = world.W, H = world.H, N = W * H;
    const wob = wobbler(world.seed);
    const rng = world.rng.fork('ink');
    const ops = [];
    const origin = (() => {
      const s0 = world.settlements[0];
      return s0 ? [g.X(s0.x), g.Y(s0.y)] : [g.CW / 2, g.CH / 2];
    })();
    const maxD = Math.hypot(g.CW, g.CH) * 0.75;
    const sweep = (x, y) => U.clamp(Math.hypot(x - origin[0], y - origin[1]) / maxD, 0, 1);
    const add = (t0, t1, x, y, f) => ops.push({ t: t0 + (t1 - t0) * sweep(x, y) + rng.range(0, 0.012), f });

    /* coastline and the land path used to clip rivers and washes */
    const coast = U.contours(T.elev, W, H, 0, -1).filter((l) => l.closed && l.pts.length >= 8).map((l) => {
      let p = U.chaikin(l.pts, true, 2);
      return wob(toPx(g, p), 1.1, 0.045);
    });
    const lakeMask = new Float32Array(N);
    for (let i = 0; i < N; i++) lakeMask[i] = T.lake[i] >= 0 ? 1 : 0;
    const lakeField = U.blur(lakeMask, W, H, 1, 1);
    const lakes = U.contours(lakeField, W, H, 0.45, 0).filter((l) => l.closed && l.pts.length >= 6).map((l) => wob(toPx(g, U.chaikin(l.pts, true, 2)), 0.8, 0.05));
    const landPath = new Path2D();
    for (const c of coast) { landPath.moveTo(c[0], c[1]); for (let i = 2; i < c.length; i += 2) landPath.lineTo(c[i], c[i + 1]); landPath.closePath(); }
    const dryPath = new Path2D(landPath);
    for (const c of lakes) { dryPath.moveTo(c[0], c[1]); for (let i = 2; i < c.length; i += 2) dryPath.lineTo(c[i], c[i + 1]); dryPath.closePath(); }
    const seaPath = new Path2D();
    seaPath.rect(g.map[0], g.map[1], g.map[2] - g.map[0], g.map[3] - g.map[1]);
    seaPath.addPath(landPath);

    /* a pale wash hugging the shore, as a colourist would lay it */
    ops.push({ t: 0.0, f: (ctx) => {
      ctx.save();
      ctx.clip(seaPath, 'evenodd');
      ctx.lineJoin = 'round';
      for (const [w, a] of [[46, 0.05], [32, 0.06], [20, 0.07], [10, 0.08]]) {
        ctx.strokeStyle = `rgba(92,130,118,${a})`;
        ctx.lineWidth = w;
        ctx.stroke(landPath);
      }
      ctx.restore();
    } });

    /* ripples off the coast */
    const sd = U.blur(T.seaDist, W, H, 1, 2);
    const levels = [1.05, 2.0, 3.1, 4.4, 5.9];
    levels.forEach((lv, k) => {
      const lines = U.contours(sd, W, H, lv, 99).filter((l) => l.pts.length >= 10);
      for (const l of lines) {
        const pts = wob(toPx(g, U.chaikin(l.pts, l.closed, 2)), 0.9 + k * 0.25, 0.04);
        const chunk = 40;
        for (let i = 0; i < pts.length - 2; i += chunk) {
          const seg = pts.slice(i, Math.min(pts.length, i + chunk + 2));
          if (l.closed && i + chunk >= pts.length - 2) seg.push(pts[0], pts[1]);
          if (seg.length < 4) continue;
          add(0.08 + k * 0.03, 0.34 + k * 0.03, seg[0], seg[1], (ctx) => {
            ctx.strokeStyle = RIPPLE[k]; ctx.lineWidth = k === 0 ? 1.1 : 0.95; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath(); trace(ctx, seg, false); ctx.stroke();
          });
        }
      }
    });

    /* the coast itself */
    for (const c of coast) {
      const chunk = 30;
      for (let i = 0; i < c.length; i += chunk) {
        const seg = c.slice(i, Math.min(c.length, i + chunk + 2));
        if (i + chunk >= c.length) seg.push(c[0], c[1]);
        if (seg.length < 4) continue;
        add(0.0, 0.26, seg[0], seg[1], (ctx) => {
          ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.beginPath(); trace(ctx, seg, false); ctx.stroke();
        });
      }
    }

    /* lakes: tinted water, a shore line, and a ripple inside */
    const lakeIn = U.edt(lakeMask.map((v) => 1 - v), W, H);
    const lakeRip = U.contours(U.blur(lakeIn, W, H, 1, 1), W, H, 1.6, 0).filter((l) => l.closed && l.pts.length >= 10).map((l) => wob(toPx(g, U.chaikin(l.pts, true, 2)), 0.7, 0.05));
    for (const c of lakes) {
      add(0.2, 0.36, c[0], c[1], (ctx) => {
        ctx.fillStyle = '#dcdccc';
        ctx.beginPath(); trace(ctx, c, true); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
        ctx.stroke();
      });
    }
    for (const c of lakeRip) add(0.3, 0.4, c[0], c[1], (ctx) => { ctx.strokeStyle = RIPPLE[1]; ctx.lineWidth = 0.9; ctx.beginPath(); trace(ctx, c, true); ctx.stroke(); });

    /* rivers, from the spring down, swelling as they go */
    let maxFlow = 1;
    for (const r of T.rivers) maxFlow = Math.max(maxFlow, T.acc[r.cells[r.cells.length - 1]]);
    for (const r of T.rivers) {
      const pts = [];
      const fl = [];
      for (const c of r.cells) { pts.push(c % W, (c / W) | 0); fl.push(T.acc[c]); }
      if (r.end >= 0) { pts.push(r.end % W, (r.end / W) | 0); fl.push(fl[fl.length - 1]); }
      if (pts.length < 6) continue;
      const sm = U.chaikin(pts, false, 2);
      const px = wob(toPx(g, sm), 0.9, 0.06);
      const n = px.length / 2;
      const widths = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const f = fl[Math.min(fl.length - 1, Math.floor((i / (n - 1)) * (fl.length - 1)))];
        widths[i] = 0.55 + 2.6 * Math.sqrt(f / maxFlow);
      }
      const chunk = 12;
      for (let i = 0; i < n - 1; i += chunk) {
        const a = i, b = Math.min(n - 1, i + chunk);
        add(0.3, 0.52, px[a * 2], px[a * 2 + 1], (ctx) => {
          ctx.save();
          ctx.clip(dryPath, 'evenodd');
          ctx.strokeStyle = INK2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let k = a; k < b; k++) {
            ctx.lineWidth = widths[k];
            ctx.beginPath(); ctx.moveTo(px[k * 2], px[k * 2 + 1]); ctx.lineTo(px[k * 2 + 2], px[k * 2 + 3]); ctx.stroke();
          }
          ctx.restore();
        });
      }
    }

    /* relief and growth, placed on a jittered lattice and drawn back to front */
    const glyphs = [];
    const B = P.BIOME;
    const at = (px, py) => {
      const gx = Math.round((px - g.M) / g.S - 0.5), gy = Math.round((py - g.M) / g.S - 0.5);
      if (gx < 0 || gy < 0 || gx >= W || gy >= H) return -1;
      return gy * W + gx;
    };
    const lattice = (step, jitter, fn) => {
      for (let y = g.map[1] + step / 2; y < g.map[3]; y += step * 0.866) {
        const row = Math.round(y / step);
        for (let x = g.map[0] + (row % 2 ? step / 2 : 0); x < g.map[2]; x += step) {
          const jx = x + (P.hash2(x * 7, y * 3, 11) - 0.5) * step * jitter, jy = y + (P.hash2(x * 5, y * 9, 13) - 0.5) * step * jitter;
          const i = at(jx, jy);
          if (i >= 0) fn(jx, jy, i);
        }
      }
    };
    const nearWater = (i) => T.landDist[i] < 1.3 || T.isRiver[i];
    lattice(15, 0.55, (x, y, i) => {
      const e = T.elev[i];
      if (T.water[i] || T.lake[i] >= 0 || e < 0.36 || nearWater(i)) return;
      const k = (e - 0.36) / 0.64;
      if (P.hash2(i, 3, 5) > 0.35 + k * 1.5) return;
      const w = 15 + 26 * Math.pow(k, 0.8) + P.hash2(i, 4, 6) * 6;
      glyphs.push({ y, t: 0, f: (ctx) => mountain(ctx, x, y, w, w * (0.62 + 0.25 * P.hash2(i, 7, 8)), seeded(i), T.temp[i] < -1 || e > 0.78) });
    });
    lattice(17, 0.6, (x, y, i) => {
      const e = T.elev[i], b = T.biome[i];
      if (T.water[i] || T.lake[i] >= 0 || e < 0.2 || e >= 0.36 || nearWater(i)) return;
      if (b === B.FOREST || b === B.TAIGA || b === B.JUNGLE) return;
      if (P.hash2(i, 8, 9) > 0.62) return;
      glyphs.push({ y, t: 0, f: (ctx) => hill(ctx, x, y, 12 + P.hash2(i, 1, 2) * 5, 4.2 + P.hash2(i, 2, 3) * 1.6, seeded(i)) });
    });
    lattice(8.6, 0.7, (x, y, i) => {
      const b = T.biome[i];
      if (!(b === B.FOREST || b === B.TAIGA || b === B.JUNGLE) || nearWater(i) || T.elev[i] > 0.42) return;
      if (P.hash2(i, 21, Math.round(x)) > 0.35 + 0.6 * T.precip[i]) return;
      const kind = b === B.TAIGA || T.temp[i] < 3 ? 'conifer' : b === B.JUNGLE ? 'jungle' : 'leaf';
      const r = 3.1 + P.hash2(i, 5, Math.round(y)) * 1.1;
      glyphs.push({ y, t: 0, f: (ctx) => tree(ctx, x, y, r, kind, seeded(i + Math.round(x))) });
    });
    glyphs.sort((a, b) => a.y - b.y);
    const gy0 = g.map[1], gy1 = g.map[3];
    for (const gl of glyphs) ops.push({ t: 0.44 + 0.42 * ((gl.y - gy0) / (gy1 - gy0)), f: gl.f });

    lattice(11, 0.6, (x, y, i) => {
      if (T.biome[i] !== B.MARSH || nearWater(i) && T.landDist[i] < 1) return;
      add(0.7, 0.88, x, y, (ctx) => {
        ctx.strokeStyle = SEPIA; ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
        ctx.moveTo(x - 3, y + 2.6); ctx.lineTo(x + 2, y + 2.6);
        ctx.stroke();
        tuft(ctx, x, y - 0.5, 3.4, SEPIA);
      });
    });
    lattice(19, 0.7, (x, y, i) => {
      const b = T.biome[i];
      const p = b === B.STEPPE ? 0.5 : b === B.GRASS ? 0.22 : b === B.TUNDRA ? 0.3 : 0;
      if (!p || nearWater(i) || P.hash2(i, 31, 7) > p) return;
      add(0.72, 0.9, x, y, (ctx) => tuft(ctx, x, y, b === B.TUNDRA ? 2.6 : 3.4, b === B.TUNDRA ? '#8d7b63' : '#6e5c42'));
    });
    // desert stipple, in rows
    const stip = [];
    for (let i = 0; i < N; i++) {
      if (T.biome[i] !== B.DESERT) continue;
      const x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 3; k++) stip.push(g.X(x + P.hash2(i, k, 1) - 0.5), g.Y(y + P.hash2(i, k, 2) - 0.5), 0.6 + P.hash2(i, k, 3) * 0.7);
    }
    for (let i = 0; i < stip.length; i += 120) {
      const part = stip.slice(i, i + 120);
      add(0.72, 0.9, part[0], part[1], (ctx) => {
        ctx.fillStyle = '#86683f';
        ctx.beginPath();
        for (let k = 0; k < part.length; k += 3) { ctx.moveTo(part[k] + part[k + 2], part[k + 1]); ctx.arc(part[k], part[k + 1], part[k + 2], 0, Math.PI * 2); }
        ctx.fill();
      });
    }

    ops.sort((a, b) => a.t - b.t);
    return { ops, landPath, dryPath, seaPath, coast, lakes };
  }

  function seeded(i) {
    let s = (i * 2654435761) >>> 0;
    return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; };
  }

  /* ---------- decorations ---------- */

  function findSpots(world, g) {
    const T = world.terrain, W = world.W, H = world.H;
    // the corner with the most open sea gets the title
    const cw = 74, ch = 33;
    const mx = Math.round((W - cw) / 2), my = Math.round((H - ch) / 2);
    const cands = [[6, 5, 0], [W - cw - 6, 5, 0], [6, H - ch - 5, 0], [W - cw - 6, H - ch - 5, 0], [mx, 5, 0.06], [mx, H - ch - 5, 0.06], [6, my, 0.08], [W - cw - 6, my, 0.08]];
    let best = 0, bs = -1e9;
    cands.forEach((c, k) => {
      let n = 0;
      for (let y = c[1]; y < c[1] + ch; y++) for (let x = c[0]; x < c[0] + cw; x++) if (T.water[y * W + x]) n++;
      let towns = 0;
      for (const st of world.settlements) if (st.x >= c[0] - 2 && st.x <= c[0] + cw + 2 && st.y >= c[1] - 2 && st.y <= c[1] + ch + 2) towns += 1 + Math.min(4, st.peak / 3000);
      const sc = n / (cw * ch) - 0.06 * towns - c[2];
      if (sc > bs) { bs = sc; best = k; }
    });
    const cc = cands[best];
    const cart = { x: g.X(cc[0]), y: g.Y(cc[1]), w: cw * g.S, h: ch * g.S, corner: best };
    const avoid = (x, y, r) => {
      const px = g.X(x), py = g.Y(y);
      return px + r > cart.x - 30 && px - r < cart.x + cart.w + 30 && py + r > cart.y - 30 && py - r < cart.y + cart.h + 30;
    };
    // compass: open water far from the title and from the edge
    let comp = null, cb = -1;
    for (let y = 22; y < H - 22; y += 2) for (let x = 22; x < W - 22; x += 2) {
      const i = y * W + x;
      if (!T.ocean[i] || avoid(x, y, 120)) continue;
      const sc = Math.min(T.seaDist[i], 16) + P.hash2(x, y, 3) * 2;
      if (sc > cb) { cb = sc; comp = { x: g.X(x), y: g.Y(y), open: T.seaDist[i] }; }
    }
    if (!comp) comp = { x: g.X(W - 30), y: g.Y(H - 30), open: 0 };
    // the serpent: open water away from both
    let serp = null, sb = -1;
    for (let y = 16; y < H - 16; y += 2) for (let x = 20; x < W - 20; x += 2) {
      const i = y * W + x;
      if (!T.water[i] || avoid(x, y, 90)) continue;
      const d = Math.hypot(g.X(x) - comp.x, g.Y(y) - comp.y);
      if (d < 330) continue;
      const sc = Math.min(T.seaDist[i], 12) + P.hash2(x, y, 4) * 1.5;
      if (sc > sb) { sb = sc; serp = { x: g.X(x), y: g.Y(y), open: T.seaDist[i] }; }
    }
    // the scale goes in a bottom corner the title does not use
    const leftFree = !(cart.x < g.map[0] + 600 && cart.y + cart.h > g.map[3] - 200);
    const sx = leftFree ? g.map[0] + 50 : g.map[2] - 470;
    const scale = { x: sx, y: g.map[3] - 62, w: 430, h: 100 };
    return { cart, comp, serp: serp && serp.open >= 6 ? serp : null, scale };
  }

  function worldName(world) {
    const c0 = world.cultures[0];
    const raw = world.seed.replace(/[^a-zA-ZÀ-ÿ ]/g, '').trim() || 'world';
    const ph = P.Lang.fromSpelling(raw.toLowerCase());
    const src = new P.Lang.Name(c0.lang, ph, 0, { gloss: null });
    const n = P.Lang.adapt(src, c0.lang, 0);
    n.kind = 'world';
    return n;
  }

  function compass(ctx, x, y, R, world, northWord) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    // rings
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.98, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      const r0 = R * 0.9, r1 = R * (k % 4 === 0 ? 0.98 : 0.94);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
    }
    // points: eight long, eight short, each split light and dark
    const point = (a, len, wdt) => {
      const tip = [Math.cos(a) * len, Math.sin(a) * len];
      const l = [Math.cos(a - Math.PI / 2) * wdt, Math.sin(a - Math.PI / 2) * wdt];
      const r = [Math.cos(a + Math.PI / 2) * wdt, Math.sin(a + Math.PI / 2) * wdt];
      erase(ctx, () => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(r[0], r[1]); ctx.closePath(); ctx.fill(); });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(r[0], r[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(r[0], r[1]); ctx.stroke();
    };
    for (let k = 0; k < 8; k++) point(-Math.PI / 2 + Math.PI / 8 + (k * Math.PI) / 4, R * 0.55, R * 0.07);
    for (let k = 0; k < 8; k++) point(-Math.PI / 2 + (k * Math.PI) / 4, k % 2 ? R * 0.72 : R * 0.9, R * 0.1);
    ctx.fillStyle = '#a8381f';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
    // the north is named in the first people's own word and letters
    const c0 = world.cultures.find((c) => c.script) || world.cultures[0];
    if (c0 && c0.script) {
      const ph = c0.lang.root('north', 0);
      const size = R * 0.16;
      const wd = c0.script.measure(ph, size);
      c0.script.draw(ctx, ph, -wd / 2, -R * 1.06, size, INK);
    }
    ctx.font = `italic ${Math.round(R * 0.13)}px ${FONT.roman}`;
    ctx.fillStyle = SEPIA; ctx.textAlign = 'center';
    ctx.fillText(northWord, 0, -R * 1.06 - R * 0.28);
    ctx.restore();
  }

  function rhumbs(ctx, x, y, g, seaPath) {
    ctx.save();
    ctx.clip(seaPath, 'evenodd');
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      ctx.strokeStyle = k % 4 === 0 ? '#c2b092' : k % 2 === 0 ? '#cdbfa4' : '#d6cab2';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 100, y + Math.sin(a) * 100); ctx.lineTo(x + Math.cos(a) * 3000, y + Math.sin(a) * 3000); ctx.stroke();
    }
    ctx.restore();
  }

  function serpent(ctx, x, y, s, flip) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const humps = 3;
    const hw = 34, hh = 26, th = 8.5;
    const x0 = -((humps * hw) / 2) - 10;
    // water first, so the coils sit in it
    ctx.strokeStyle = RIPPLE[1]; ctx.lineWidth = 1;
    for (let k = -1; k <= humps; k++) {
      const wx = x0 + k * hw + hw * 0.5 + 12;
      ctx.beginPath();
      for (let j = 0; j < 3; j++) { ctx.moveTo(wx - 14 + j * 9, 3 + j * 3); ctx.quadraticCurveTo(wx - 10 + j * 9, 0 + j * 3, wx - 6 + j * 9, 3 + j * 3); }
      ctx.stroke();
    }
    const coil = (cx) => {
      const outer = (t) => [cx - hw / 2 + hw * t, -Math.sin(Math.PI * t) * hh];
      const inner = (t) => [cx - hw / 2 + th + (hw - 2 * th) * t, -Math.sin(Math.PI * t) * (hh - th)];
      const path = () => {
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const p = outer(i / 16); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        for (let i = 16; i >= 0; i--) { const p = inner(i / 16); ctx.lineTo(p[0], p[1]); }
        ctx.closePath();
      };
      erase(ctx, () => { path(); ctx.fill(); });
      path();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
      // scales and a belly shadow
      ctx.lineWidth = 0.7;
      for (let i = 2; i < 15; i += 2) {
        const p = outer(i / 16), q = inner(i / 16);
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        ctx.beginPath(); ctx.arc(mx, my, 2.2, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      }
      ctx.beginPath();
      for (let i = 1; i < 16; i += 1.5) { const q = inner(i / 16); ctx.moveTo(q[0], q[1] - 0.5); ctx.lineTo(q[0] + 1, q[1] - 3.5); }
      ctx.stroke();
    };
    for (let k = 0; k < humps; k++) coil(x0 + k * hw + hw / 2 + 12 + (k ? 6 * k : 0));
    // head and neck rising from the first coil
    const hx = x0 - 6;
    const neck = () => {
      ctx.beginPath();
      ctx.moveTo(hx + 8, 0);
      ctx.bezierCurveTo(hx + 6, -22, hx - 6, -40, hx - 22, -46);
      ctx.lineTo(hx - 40, -44);
      ctx.lineTo(hx - 47, -38);
      ctx.lineTo(hx - 34, -36);
      ctx.lineTo(hx - 44, -31);
      ctx.lineTo(hx - 30, -30);
      ctx.bezierCurveTo(hx - 18, -26, hx - 8, -16, hx, 0);
      ctx.closePath();
    };
    erase(ctx, () => { neck(); ctx.fill(); });
    neck();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(hx - 27, -41, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.beginPath(); // crest
    for (let k = 0; k < 5; k++) { const bx = hx - 12 + k * 3.5, by = -42 + k * 7.5; ctx.moveTo(bx, by); ctx.lineTo(bx + 6, by - 4); ctx.lineTo(bx + 4, by + 2); }
    ctx.stroke();
    ctx.beginPath(); // a forked tongue
    ctx.moveTo(hx - 46, -34); ctx.lineTo(hx - 55, -35); ctx.moveTo(hx - 52, -35); ctx.lineTo(hx - 56, -32); ctx.stroke();
    // tail, curling out of the last coil
    const tx = x0 + humps * hw + 12 + 6 * (humps - 1) + 4;
    ctx.lineWidth = 1.3;
    erase(ctx, () => { ctx.beginPath(); ctx.moveTo(tx - 4, 0); ctx.bezierCurveTo(tx + 4, -18, tx + 22, -24, tx + 26, -12); ctx.bezierCurveTo(tx + 20, -16, tx + 8, -12, tx + 2, 0); ctx.closePath(); ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(tx - 4, 0); ctx.bezierCurveTo(tx + 4, -18, tx + 22, -24, tx + 26, -12); ctx.bezierCurveTo(tx + 20, -16, tx + 8, -12, tx + 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx + 26, -12); ctx.lineTo(tx + 33, -19); ctx.lineTo(tx + 31, -9); ctx.closePath();
    erase(ctx, () => { ctx.fill(); });
    ctx.stroke();
    ctx.restore();
  }

  function ship(ctx, x, y, s, flip) {
    ctx.save();
    ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const hull = () => { ctx.beginPath(); ctx.moveTo(-20, -6); ctx.quadraticCurveTo(-16, 4, 0, 4); ctx.quadraticCurveTo(16, 4, 22, -8); ctx.lineTo(14, -5); ctx.lineTo(-14, -5); ctx.closePath(); };
    const sail = () => { ctx.beginPath(); ctx.moveTo(-11, -30); ctx.quadraticCurveTo(-1, -25, 10, -30); ctx.quadraticCurveTo(13, -19, 10, -9); ctx.quadraticCurveTo(-1, -12, -11, -9); ctx.quadraticCurveTo(-8, -19, -11, -30); ctx.closePath(); };
    erase(ctx, () => { hull(); ctx.fill(); sail(); ctx.fill(); });
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    hull(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(-1, -38); ctx.stroke();
    sail(); ctx.stroke();
    ctx.lineWidth = 0.7;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(4 + k * 1.5, -27 + k * 0.5); ctx.lineTo(5 + k * 1.5, -12 + k * 0.2); } ctx.stroke();
    ctx.fillStyle = '#a8381f';
    ctx.beginPath(); ctx.moveTo(-1, -38); ctx.lineTo(9, -36); ctx.lineTo(-1, -34); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = RIPPLE[1];
    ctx.beginPath(); ctx.moveTo(-26, 6); ctx.quadraticCurveTo(-20, 3, -14, 6); ctx.moveTo(14, 7); ctx.quadraticCurveTo(20, 4, 26, 7); ctx.stroke();
    ctx.restore();
  }

  function frame(ctx, world, g) {
    const T = world.terrain;
    const [x0, y0, x1, y1] = g.map;
    const b = 22;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6; ctx.strokeRect(x0 - b - 8, y0 - b - 8, x1 - x0 + 2 * (b + 8), y1 - y0 + 2 * (b + 8));
    ctx.lineWidth = 1.2; ctx.strokeRect(x0 - b, y0 - b, x1 - x0 + 2 * b, y1 - y0 + 2 * b);
    ctx.lineWidth = 1.6; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // degree bands: latitude down the sides, longitude along the top and bottom
    ctx.fillStyle = INK;
    ctx.font = `italic 15px ${FONT.roman}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fillOn = true;
    for (let d = Math.ceil(T.latBot); d <= Math.floor(T.latTop); d++) {
      const py = y0 + ((T.latTop - d) / (T.latTop - T.latBot)) * (y1 - y0);
      const py2 = y0 + ((T.latTop - (d - 1)) / (T.latTop - T.latBot)) * (y1 - y0);
      if (fillOn && py2 <= y1) for (const xx of [x0 - b + 5, x1 + 5]) ctx.fillRect(xx, Math.min(py, py2), b - 10, Math.abs(py2 - py));
      fillOn = !fillOn;
      ctx.beginPath(); ctx.moveTo(x0 - b, py); ctx.lineTo(x0, py); ctx.moveTo(x1, py); ctx.lineTo(x1 + b, py); ctx.lineWidth = 0.8; ctx.stroke();
      if (d % 5 === 0) {
        ctx.save();
        ctx.fillStyle = SEPIA;
        ctx.fillText(d + '°', x0 - b - 26, py);
        ctx.fillText(d + '°', x1 + b + 26, py);
        ctx.restore();
      }
    }
    fillOn = true;
    for (let d = Math.ceil(T.lonLeft); d <= Math.floor(T.lonRight); d++) {
      const px = x0 + ((d - T.lonLeft) / (T.lonRight - T.lonLeft)) * (x1 - x0);
      const px2 = x0 + ((d + 1 - T.lonLeft) / (T.lonRight - T.lonLeft)) * (x1 - x0);
      if (fillOn && px2 <= x1) for (const yy of [y0 - b + 5, y1 + 5]) ctx.fillRect(px, yy, px2 - px, b - 10);
      fillOn = !fillOn;
      ctx.beginPath(); ctx.moveTo(px, y0 - b); ctx.lineTo(px, y0); ctx.moveTo(px, y1); ctx.lineTo(px, y1 + b); ctx.lineWidth = 0.8; ctx.stroke();
      if (d % 5 === 0) {
        ctx.save(); ctx.fillStyle = SEPIA;
        ctx.fillText(Math.abs(d) + '°', px, y0 - b - 22);
        ctx.fillText(Math.abs(d) + '°', px, y1 + b + 22);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function cartouche(ctx, world, g, spot, name) {
    const { x, y, w, h } = spot;
    const c0 = world.cultures.find((c) => c.script) || world.cultures[0];
    ctx.save();
    const pad = 10;
    erase(ctx, () => ctx.fillRect(x - pad, y - pad, w + 2 * pad, h + 2 * pad));
    ctx.fillStyle = 'rgba(214,196,160,0.35)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4; ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 1; ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
    // corner knots
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      erase(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill(); });
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#a8381f'; ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // scrolls on the long sides
    ctx.lineWidth = 1.1;
    for (const sx of [x + w * 0.5]) {
      for (const [sy, dir] of [[y, -1], [y + h, 1]]) {
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * Math.PI * 3.2, r = 12 * (1 - t * 0.8); const px = sx - 40 + t * 18 + Math.cos(a) * r * 0.3; const py = sy + dir * (Math.sin(a) * r * 0.5 + 3); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * Math.PI * 3.2, r = 12 * (1 - t * 0.8); const px = sx + 40 - t * 18 - Math.cos(a) * r * 0.3; const py = sy + dir * (Math.sin(a) * r * 0.5 + 3); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
    }
    // the title: the world's name in its first letters, then in ours
    const contentH = (c0.script ? 52 : 0) + 64 + 10 + 72;
    let ty = y + Math.max(18, (h - contentH) / 2);
    if (c0.script) {
      const ph = name.form(0);
      const size = 30;
      const sw = c0.script.measure(ph, size);
      c0.script.draw(ctx, ph, x + (w - sw) / 2, ty + size, size, INK);
      ty += size + 22;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    const title = name.text(0).toUpperCase();
    let fs = 64;
    ctx.font = `${fs}px ${FONT.sc}`;
    const spaced = title.split('').join(' ');
    while (ctx.measureText(spaced).width > w - 60 && fs > 30) { fs -= 2; ctx.font = `${fs}px ${FONT.sc}`; }
    ctx.fillText(spaced, x + w / 2, ty + fs * 0.78);
    ty += fs * 0.9 + 10;
    ctx.font = `italic 22px ${FONT.roman}`;
    ctx.fillStyle = INK2;
    const seaF = world.terrain.features.seas.find((f) => f.name);
    const line1 = 'or, a Description of the Lands' + (seaF ? ' about the ' + seaF.name.text(world.years) : '');
    ctx.fillText(line1, x + w / 2, ty + 8);
    ctx.fillText('with their Peoples, Tongues & Histories', x + w / 2, ty + 36);
    ctx.font = `17px ${FONT.roman}`;
    ctx.fillStyle = SEPIA;
    ctx.fillText(`from the First Reckoning to the Year ${world.years}`, x + w / 2, ty + 62);
    ctx.restore();
  }

  function scaleBar(ctx, world, g, spot) {
    const T = world.terrain;
    const latMid = (T.latTop + T.latBot) / 2;
    const kmPerCell = ((T.lonRight - T.lonLeft) * 111 * Math.cos((latMid * Math.PI) / 180)) / world.W;
    const dayPx = (32 / kmPerCell) * g.S;
    let per = [1, 2, 3, 5, 10, 20].find((k) => k * dayPx >= 55) || 20;
    let n = 5;
    while (n > 2 && per * dayPx * n > 360) n--;
    const seg = per * dayPx;
    const c0 = world.cultures[0];
    const unit = c0.lang.display(c0.lang.root('walk', 0));
    const { x, y } = spot;
    ctx.save();
    erase(ctx, () => ctx.fillRect(x - 18, y - 52, seg * n + 64, 92));
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.2;
    ctx.font = `italic 21px ${FONT.roman}`; ctx.textAlign = 'left';
    ctx.fillText(`Scale of ${unit}`, x, y - 24);
    for (let k = 0; k < n; k++) {
      ctx.strokeRect(x + k * seg, y - 10, seg, 9);
      if (k % 2 === 0) ctx.fillRect(x + k * seg, y - 10, seg, 9);
    }
    ctx.font = `15px ${FONT.roman}`; ctx.textAlign = 'center';
    for (let k = 0; k <= n; k++) ctx.fillText(String(k * per), x + k * seg, y + 12);
    ctx.font = `italic 15px ${FONT.roman}`; ctx.textAlign = 'left'; ctx.fillStyle = SEPIA;
    ctx.fillText(`a ${unit.toLowerCase()} being the walk of one day`, x, y + 32);
    ctx.restore();
  }

  function decorOps(world, g, terr) {
    const spots = findSpots(world, g);
    const rng = world.rng.fork('decor');
    const ops = [];
    const name = worldName(world);
    world.worldName = name;
    ops.push({ t: 0.04, f: (ctx) => rhumbs(ctx, spots.comp.x, spots.comp.y, g, terr.seaPath) });
    const c0 = world.cultures.find((c) => c.script) || world.cultures[0];
    ops.push({ t: 0.9, f: (ctx) => compass(ctx, spots.comp.x, spots.comp.y, 92, world, c0.lang.display(c0.lang.root('north', 0))) });
    const sflip = rng.chance(0.5);
    if (spots.serp) ops.push({ t: 0.93, f: (ctx) => serpent(ctx, spots.serp.x, spots.serp.y, 1.65, sflip) });
    // a ship or two along the coasts
    const T = world.terrain;
    let ships = 0;
    for (let k = 0; k < 400 && ships < 2; k++) {
      const x = rng.int(20, world.W - 20), y = rng.int(20, world.H - 20);
      const i = y * world.W + x;
      if (!T.ocean[i] || T.seaDist[i] < 5 || T.seaDist[i] > 12) continue;
      const px = g.X(x), py = g.Y(y);
      if (Math.hypot(px - spots.comp.x, py - spots.comp.y) < 200) continue;
      if (spots.serp && Math.hypot(px - spots.serp.x, py - spots.serp.y) < 220) continue;
      if (px > spots.cart.x - 60 && px < spots.cart.x + spots.cart.w + 60 && py > spots.cart.y - 60 && py < spots.cart.y + spots.cart.h + 60) continue;
      const flip = rng.chance(0.5);
      ops.push({ t: 0.94, f: (ctx) => ship(ctx, px, py, 1.05, flip) });
      ships++;
    }
    ops.push({ t: 0.96, f: (ctx) => scaleBar(ctx, world, g, spots.scale) });
    ops.push({ t: 0.97, f: (ctx) => cartouche(ctx, world, g, spots.cart, name) });
    ops.push({ t: 0.99, f: (ctx) => frame(ctx, world, g) });
    return { ops, spots };
  }

  /* areas the political layer must not write over */
  function spotBoxes(spots) {
    const b = [];
    const c = spots.cart;
    b.push({ x: c.x - 24, y: c.y - 24, w: c.w + 48, h: c.h + 48 });
    b.push({ x: spots.comp.x - 112, y: spots.comp.y - 150, w: 224, h: 262 });
    b.push({ x: spots.scale.x - 16, y: spots.scale.y - 46, w: spots.scale.w, h: 84 });
    if (spots.serp) b.push({ x: spots.serp.x - 150, y: spots.serp.y - 90, w: 300, h: 110 });
    return b;
  }

  P.Render = { geometry, spotBoxes, canvas, paper, terrainOps, decorOps, wobbler, trace, toPx, erase, FONT, INK, INK2, SEPIA, RIPPLE };
})();

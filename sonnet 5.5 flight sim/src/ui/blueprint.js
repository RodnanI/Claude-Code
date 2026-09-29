import { silhouette } from '../aircraft/silhouette.js';

/* Blueprint drawing of an aircraft for its card: the top and side silhouettes rasterized from the real model, at one scale for
   every aircraft so wingspans compare, with the two main dimensions called out. Flat paper lines on the ink background. */

const PAPER = '#ece3cf', DIM = '#b9ae96', ORANGE = '#ff5a1f', AMBER = '#f2c230', FILL = 'rgba(236,227,207,0.10)';

/** Draw into a canvas whose pixel size is already set. pxPerM is the scale in canvas pixels per meter. */
export function drawBlueprint(canvas, spec, { pxPerM = 9, metric = false } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, dpr = W / Math.max(1, canvas.clientWidth || W);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const sil = silhouette(spec);
  const k = pxPerM * dpr, cell = sil.cell * k;
  // faint sheet grid every 5 meters
  ctx.strokeStyle = 'rgba(236,227,207,0.06)'; ctx.lineWidth = dpr;
  for (let x = 0; x < W; x += 5 * k) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 5 * k) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // top view, nose to the right: columns of the grid become rows
  const topW = sil.length * k, topH = sil.span * k;
  const tx = 16 * dpr, ty = 17 * dpr;
  const t = sil.top;
  const tile = (view, i, j) => (i < 0 || j < 0 || i >= view.w || j >= view.h ? 0 : view.data[j * view.w + i]);
  const paint = (view, px, py, transposed) => {
    for (let j = 0; j < view.h; j++) {
      for (let i = 0; i < view.w; i++) {
        const v = view.data[j * view.w + i];
        if (!v) continue;
        const edge = !tile(view, i - 1, j) || !tile(view, i + 1, j) || !tile(view, i, j - 1) || !tile(view, i, j + 1);
        // top view: row j runs from the nose backward and column i across the span; drawn with the nose to the right
        const x = transposed ? px + (view.h - 1 - j) * cell : px + i * cell;
        const y = transposed ? py + i * cell : py + j * cell;
        ctx.fillStyle = v === 2 ? AMBER : edge ? PAPER : FILL;
        ctx.fillRect(x, y, cell + 0.6, cell + 0.6);
      }
    }
  };
  paint(t, tx, ty, true);
  // side view to the right of it, nose to the right as well
  const sx = tx + topW + 26 * dpr, sy = ty + (topH - sil.height * k) / 2;
  paint(sil.side, sx, sy, false);

  // dimension lines
  ctx.strokeStyle = ORANGE; ctx.fillStyle = ORANGE; ctx.lineWidth = dpr;
  ctx.font = `700 ${Math.round(9.5 * dpr)}px "Bahnschrift", "Arial Narrow", Arial, sans-serif`; ctx.textBaseline = 'middle';
  const dim = (x0, y0, x1, y1) => {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    for (const [x, y, s] of [[x0, y0, 1], [x1, y1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * Math.cos(a + 0.4) * 6 * dpr, y + s * Math.sin(a + 0.4) * 6 * dpr); ctx.moveTo(x, y); ctx.lineTo(x + s * Math.cos(a - 0.4) * 6 * dpr, y + s * Math.sin(a - 0.4) * 6 * dpr); ctx.stroke(); }
  };
  const m = (v) => (metric ? `${v.toFixed(1)} m` : `${(v * 3.28084).toFixed(0)} ft`);
  dim(tx - 8 * dpr, ty, tx - 8 * dpr, ty + topH);
  ctx.save(); ctx.translate(tx - 11 * dpr, ty + topH / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(`SPAN ${m(sil.span)}`, 0, 0); ctx.restore();
  dim(tx, ty + topH + 7 * dpr, tx + topW, ty + topH + 7 * dpr);
  ctx.textAlign = 'center'; ctx.fillText(`LENGTH ${m(sil.length)}`, tx + topW / 2, ty + topH + 18 * dpr);
  ctx.fillStyle = DIM; ctx.textAlign = 'left';
  ctx.fillText('TOP', tx, 10 * dpr); ctx.fillText('SIDE', sx, 10 * dpr);
  return sil;
}

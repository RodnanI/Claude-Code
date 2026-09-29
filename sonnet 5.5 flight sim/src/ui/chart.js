/* The airfield chart in the hangar: pavement, runways, structures and every start position of one airfield, drawn north up from
   the region's chart data. Flat colors on the ink background, like the rest of the board. */

const COL = {
  bg: '#171410', grid: '#211d17', grass: '#1d2114', dirt: '#4a3826', pave: '#5b5444', apron: '#4a4234', taxi: '#7d7563', runway: '#d9cfb6', runwayGrass: '#6f7a45',
  mark: '#171410', struct: '#2c271f', structLine: '#8a8068', big: '#3a352b', text: '#ece3cf', dim: '#b9ae96', orange: '#ff5a1f', amber: '#f2c230', olive: '#8a9a55',
};

const KIND_LABEL = { runway: 'RWY', hold: 'HOLD', apron: 'RAMP', hangar: 'HGR', gate: 'GATE' };
export const kindLabel = (k) => KIND_LABEL[k] || 'START';

/** Chart geometry in world coordinates: local (u, v) of the airfield frame to world (x, z). */
function localToWorld(fr, u, v) { return [fr.cx + u * fr.s + v * fr.c, fr.cz - u * fr.c + v * fr.s]; }

function extent(info, spawns) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const add = (x, z) => { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); };
  const fr = info.chart.frame;
  for (const r of info.chart.runways) for (const [u, v] of [[r.u0, r.v - r.w / 2], [r.u1, r.v + r.w / 2]]) add(...localToWorld(fr, u, v));
  for (const a of [...info.chart.aprons, ...info.chart.pads.filter((p) => p.mat === 'paved')]) for (const [u, v] of [[a.u0, a.v0], [a.u1, a.v1], [a.u0, a.v1], [a.u1, a.v0]]) add(...localToWorld(fr, u, v));
  for (const s of spawns) add(s.x, s.z);
  for (const d of info.structures) if (d.w < 120) add(d.x, d.z);
  const padX = Math.max(60, (x1 - x0) * 0.06), padZ = Math.max(60, (z1 - z0) * 0.08);
  return [x0 - padX, z0 - padZ, x1 + padX, z1 + padZ];
}

/** Height over width of the area the chart wants, clamped so a long thin airfield still gets a readable chart. */
export function chartAspect(info, spawns) {
  const [x0, z0, x1, z1] = extent(info, spawns);
  return Math.max(0.4, Math.min(0.8, (z1 - z0) / (x1 - x0)));
}

/**
 * Draw the chart into a canvas that already has its pixel size set. Returns { hits, project } where hits lists the start markers
 * ({ id, x, y, r }) in canvas pixels for picking.
 */
export function drawChart(canvas, info, spawns, selectedId, hoverId = null) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
  if (!info) return { hits: [], project: () => [0, 0] };
  const fr = info.chart.frame;
  const [bx0, bz0, bx1, bz1] = extent(info, spawns);
  const sc = Math.min(W / (bx1 - bx0), H / (bz1 - bz0));
  const ox = (W - (bx1 - bx0) * sc) / 2, oy = (H - (bz1 - bz0) * sc) / 2;
  const P = (x, z) => [ox + (x - bx0) * sc, oy + (z - bz0) * sc];
  const L = (u, v) => P(...localToWorld(fr, u, v));
  const poly = (pts, fill, stroke, lw = 1) => {
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw * dpr; ctx.stroke(); }
  };
  const rect = (u0, v0, u1, v1, fill, stroke) => poly([L(u0, v0), L(u1, v0), L(u1, v1), L(u0, v1)], fill, stroke);

  // a faint grid every 250 m
  ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
  const g = 250;
  for (let x = Math.ceil(bx0 / g) * g; x < bx1; x += g) { const [px] = P(x, 0); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke(); }
  for (let z = Math.ceil(bz0 / g) * g; z < bz1; z += g) { const [, py] = P(0, z); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); }

  const c = info.chart;
  for (const p of c.pads) rect(p.u0, p.v0, p.u1, p.v1, p.mat === 'dirt' ? COL.dirt : COL.apron, null);
  for (const a of c.aprons) rect(a.u0, a.v0, a.u1, a.v1, COL.apron, COL.structLine);
  // taxiways: routes as thick strokes, straight ones as rectangles around their centerline
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (const t of c.taxiways) {
    const horiz = t.u1 - t.u0 >= t.v1 - t.v0, cu = (t.u0 + t.u1) / 2, cv = (t.v0 + t.v1) / 2, hw = t.w / 2;
    if (horiz) rect(t.u0, cv - hw, t.u1, cv + hw, COL.taxi, null); else rect(cu - hw, t.v0, cu + hw, t.v1, COL.taxi, null);
  }
  for (const r of c.routes) {
    ctx.strokeStyle = COL.taxi; ctx.lineWidth = Math.max(1.5 * dpr, r.w * sc);
    ctx.beginPath(); r.poly.forEach(([u, v], i) => { const [x, y] = L(u, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
  }
  for (const f of c.fillets) { const [x, y] = L(f.cu + f.sx * f.r * 0.5, f.cv + f.sz * f.r * 0.5); ctx.fillStyle = COL.taxi; ctx.beginPath(); ctx.arc(x, y, Math.max(1, f.r * 0.55 * sc), 0, 7); ctx.fill(); }
  for (const l of c.lots) rect(l.u0, l.v0, l.u1, l.v1, COL.apron, null);
  // runways with a dashed centerline and their numbers
  for (const r of c.runways) {
    rect(r.u0, r.v - r.w / 2, r.u1, r.v + r.w / 2, r.surface === 'grass' ? COL.runwayGrass : COL.runway, null);
    const [ax, ay] = L(r.u0 + 8, r.v), [bx, by] = L(r.u1 - 8, r.v);
    ctx.strokeStyle = COL.mark; ctx.lineWidth = Math.max(1, dpr); ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    if (r.marks) {
      ctx.fillStyle = COL.mark; ctx.font = `700 ${Math.round(11 * dpr)}px "Bahnschrift", "Arial Narrow", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const [wx, wy] = L(r.u0 + 60, r.v), [ex, ey] = L(r.u1 - 60, r.v);
      ctx.fillText(r.marks.west, wx, wy); ctx.fillText(r.marks.east, ex, ey);
    }
  }
  // structures
  for (const d of info.structures) {
    const ca = Math.cos(d.ang), sa = Math.sin(d.ang), hw = d.w / 2, hd = d.d / 2;
    const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, lz]) => P(d.x + lx * ca - lz * sa, d.z + lx * sa + lz * ca));
    poly(pts, d.w * d.d > 900 ? COL.big : COL.struct, COL.structLine, 1);
  }
  for (const s of c.stands) { const [x, y] = L(s.u, s.v); ctx.fillStyle = COL.dim; ctx.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr); }

  // start markers
  const hits = [];
  const kindOf = (s) => s.kind;
  const marker = (s, sel, hov, px, py, legend = false) => {
    const [x, y] = legend ? [px, py] : P(s.x, s.z);
    const r = (sel ? 8 : hov ? 7 : 5.2) * dpr, a = (s.heading * Math.PI) / 180;
    ctx.fillStyle = sel ? COL.orange : hov ? COL.amber : COL.text; ctx.strokeStyle = COL.bg; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    const k = kindOf(s);
    if (k === 'runway') { // arrowhead pointing along the heading
      ctx.moveTo(x + Math.sin(a) * r * 1.5, y - Math.cos(a) * r * 1.5);
      ctx.lineTo(x + Math.sin(a + 2.5) * r * 1.2, y - Math.cos(a + 2.5) * r * 1.2);
      ctx.lineTo(x + Math.sin(a + Math.PI) * r * 0.4, y - Math.cos(a + Math.PI) * r * 0.4);
      ctx.lineTo(x + Math.sin(a - 2.5) * r * 1.2, y - Math.cos(a - 2.5) * r * 1.2);
    } else if (k === 'hold') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); }
    else if (k === 'hangar') { ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); }
    else ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (sel && k !== 'runway') { ctx.strokeStyle = COL.orange; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * r * 2.6, y - Math.cos(a) * r * 2.6); ctx.stroke(); }
    if (!legend) hits.push({ id: s.id, x: x / dpr, y: y / dpr, r: 11 });
  };
  for (const s of spawns) if (s.id !== selectedId) marker(s, false, s.id === hoverId);
  const sel = spawns.find((s) => s.id === selectedId);
  if (sel) marker(sel, true, false);

  // legend: the marker shapes
  ctx.font = `700 ${Math.round(9 * dpr)}px "Bahnschrift", Arial, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let lx = 12 * dpr;
  const ly = 14 * dpr;
  for (const k of ['runway', 'hold', 'apron', 'hangar']) {
    marker({ x: 0, z: 0, heading: 90, kind: k, id: '_' }, false, false, lx + 5 * dpr, ly, true);
    ctx.fillStyle = COL.dim; ctx.fillText({ runway: 'RUNWAY', hold: 'HOLD SHORT', apron: 'RAMP OR GATE', hangar: 'HANGAR' }[k], lx + 14 * dpr, ly);
    lx += ctx.measureText({ runway: 'RUNWAY', hold: 'HOLD SHORT', apron: 'RAMP OR GATE', hangar: 'HANGAR' }[k]).width + 26 * dpr;
  }

  // north arrow and scale bar
  ctx.fillStyle = COL.dim; ctx.strokeStyle = COL.dim; ctx.lineWidth = dpr;
  const nx = W - 22 * dpr, ny = 30 * dpr;
  ctx.beginPath(); ctx.moveTo(nx, ny - 14 * dpr); ctx.lineTo(nx + 5 * dpr, ny + 2 * dpr); ctx.lineTo(nx, ny - 2 * dpr); ctx.lineTo(nx - 5 * dpr, ny + 2 * dpr); ctx.closePath(); ctx.fill();
  ctx.font = `700 ${Math.round(10 * dpr)}px "Bahnschrift", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('N', nx, ny + 6 * dpr);
  const bar = [100, 200, 250, 500, 1000].find((m) => m * sc > 60 * dpr) || 1000;
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.beginPath(); ctx.moveTo(12 * dpr, H - 16 * dpr); ctx.lineTo(12 * dpr + bar * sc, H - 16 * dpr); ctx.stroke();
  ctx.fillText(`${bar} m`, 12 * dpr, H - 20 * dpr);
  return { hits, project: (x, z) => P(x, z) };
}

/** The start marker nearest to a point in CSS pixels, or null. */
export function pickStart(hits, x, y) {
  let best = null, bd = 1e9;
  for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < h.r && d < bd) { best = h.id; bd = d; } }
  return best;
}

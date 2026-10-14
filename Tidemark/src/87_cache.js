/* =====================================================================
   Drawing caches. Buildings are drawn once into sprites keyed by every
   input that changes their look; dry land is drawn into 4x4-tile chunks
   re-rendered only when the tiles under them change. Water, locks, piles
   that animate and every vehicle stay live.
   ===================================================================== */
const LIVE_TYPES = new Set(['coalmine', 'oremine', 'quay', 'wharf', 'tidemill', 'lighthouse']);
const HMARGIN = { house: 36, lighthouse: 86, steelworks: 80, powerplant: 90, brickworks: 70, mill: 58, warehouse: 60, market: 40, farm: 46 };
function zoomBucket() { return Math.max(0.5, Math.round(RV.cam.z * RV.dpr * 4) / 4); }
function stockSig(b) { let s = ''; for (let r = 0; r < NR; r++) { const n = b.inv[r] + b.out[r] + (b.exp ? b.exp[r] : 0); if (n > 0) s += r + ':' + Math.min(8, Math.ceil(n / 6)) + ','; } return s; }
function bldKey(S, b, night) {
  let k = b.id + '|' + b.type + '|' + b.rot + '|' + b.x + ',' + b.y;
  if (b.type === 'house') return k + '|' + b.lvl + '|' + (night ? 1 : 0) + (b.pwOn ? 1 : 0) + (b.res > 0 ? 1 : 0);
  k += '|' + stockSig(b) + '|' + b.st + '|' + (night ? 1 : 0) + (b.pwOn ? 1 : 0) + (b.load > 0 ? 1 : 0) + (b.wk > 0 ? 1 : 0) + (dusk(S) ? 1 : 0);
  if (b.type === 'depot') { let n = 0; for (const v of S.vehs) if (v.k === 'truck' && v.st === 'depot' && v.at === b.id) n++; k += '|' + Math.min(3, n); }
  return k;
}
/* Drop sprites of buildings that no longer exist (demolished, or gone after a rewind). */
function pruneSprites(S) {
  if (!RV.spriteOf) return;
  const live = new Set(); for (const b of S.blds) live.add(b.id);
  for (const [id, key] of RV.spriteOf) if (!live.has(id)) { RV.sprites && RV.sprites.delete(key); RV.spriteOf.delete(id); }
}
function drawBuilding(c, S, b, night) {
  const f = DRAWB[b.type]; if (!f) return;
  if (RV.q === 0 || LIVE_TYPES.has(b.type) || typeof document === 'undefined') { f(c, S, b, night); return; }
  const zb = zoomBucket();
  if (RV.spriteZ !== zb || !RV.sprites) { RV.sprites = new Map(); RV.spriteZ = zb; }
  const key = bldKey(S, b, night);
  let e = RV.sprites.get(key);
  if (!e) {
    const hm = (HMARGIN[b.type] || 50) + (b.type === 'house' ? (b.lvl || 1) * 13 : 0);
    const a = P(b.x - 0.7, b.y - 0.7, 0), bb = P(b.x + b.w - 0.3, b.y - 0.7, 0), cc2 = P(b.x + b.w - 0.3, b.y + b.h - 0.3, 0), d = P(b.x - 0.7, b.y + b.h - 0.3, 0);
    const minX = Math.min(a[0], d[0]) - 10, maxX = Math.max(bb[0], cc2[0]) + 10, minY = a[1] - hm, maxY = cc2[1] + 14;
    const W = Math.ceil((maxX - minX) * zb), H = Math.ceil((maxY - minY) * zb);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.setTransform(zb, 0, 0, zb, -minX * zb, -minY * zb);
    const l0 = RV.lights.length, s0 = RV.smoke.length;
    f(ctx, S, b, night);
    e = { cv, x: minX, y: minY, w: W / zb, h: H / zb, lights: RV.lights.splice(l0), smoke: RV.smoke.splice(s0) };
    // forget the previous look of this building
    const old = RV.spriteOf && RV.spriteOf.get(b.id); if (old && old !== key) RV.sprites.delete(old);
    if (!RV.spriteOf) RV.spriteOf = new Map(); RV.spriteOf.set(b.id, key);
    RV.sprites.set(key, e);
  }
  c.drawImage(e.cv, e.x, e.y, e.w, e.h);
  for (const L of e.lights) RV.lights.push(L);
  for (const s of e.smoke) RV.smoke.push(s);
}

/* ---------------- land chunks ---------------- */
const CHK = 4;
/* Cheap fingerprint of the building layout (ids, places, which are houses), once per frame. */
function bldHash(S) {
  if (RV._bhT === RV.t && RV._bhS === S) return RV._bh;
  let h = 5; for (const b of S.blds) h = hmix(h, b.id * 4099 + b.x * 61 + b.y * 7 + (b.type === 'house' ? 1 : 0));
  RV._bhT = RV.t; RV._bhS = S; RV._bh = h; return h;
}
function landSigKey(S) { return S.ver.road + '/' + S.ver.rail + '/' + S.ver.water + '/' + bldHash(S) + '/' + S.W + 'x' + S.H; }
function chunkSig(S, cx, cy) {
  let h = 7;
  for (let y = cy * CHK; y < Math.min(S.H, cy * CHK + CHK); y++) for (let x = cx * CHK; x < Math.min(S.W, cx * CHK + CHK); x++) {
    const t = y * S.W + x;
    h = hmix(h, S.ter[t] | (S.road[t] << 2) | (S.rail[t] << 3) | (S.dep[t] << 7) | ((S.bld[t] ? 1 : 0) << 10) | (nearFarm(S, t) << 11) | (S.road[t] ? roadNbMask(S, t) << 12 : 0) | (gardenOf(S, t) << 16));
  }
  return h;
}
function drawLandChunk(c, S, cx, cy) {
  for (let s = 0; s < CHK * 2 - 1; s++) for (let i = 0; i < CHK; i++) {
    const x = cx * CHK + i, y = cy * CHK + (s - i);
    if (s - i < 0 || s - i >= CHK || !inb(S, x, y)) continue;
    const t = y * S.W + x;
    if (S.ter[t] === T_LAND) drawGroundTile(c, S, t);
  }
  if (RV.q >= 1) for (let s = 0; s < CHK * 2 - 1; s++) for (let i = 0; i < CHK; i++) {
    const x = cx * CHK + i, y = cy * CHK + (s - i);
    if (s - i >= 0 && s - i < CHK && inb(S, x, y)) drawHedge(c, S, y * S.W + x);
  }
}
function landPass(c, S, vis) {
  const zb = zoomBucket(), nx = Math.ceil(S.W / CHK), ny = Math.ceil(S.H / CHK);
  if (!RV.chunks || RV.chunkZ !== zb || RV.chunkN !== nx * ny) { RV.chunks = new Map(); RV.chunkZ = zb; RV.chunkN = nx * ny; RV.chunkSigs = null; }
  const key = landSigKey(S);
  if (RV.chunkKey !== key || !RV.chunkSigs) {
    RV.chunkKey = key; const sigs = new Array(nx * ny);
    for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) sigs[cy * nx + cx] = chunkSig(S, cx, cy);
    RV.chunkSigs = sigs;
  }
  let budget = 10;
  const order = [];
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    const mx = cx * CHK + CHK / 2 - 0.5, my = cy * CHK + CHK / 2 - 0.5;
    if (!vis(mx, my) && !vis(cx * CHK, cy * CHK) && !vis(cx * CHK + CHK - 1, cy * CHK + CHK - 1) && !vis(cx * CHK + CHK - 1, cy * CHK) && !vis(cx * CHK, cy * CHK + CHK - 1)) continue;
    order.push([cx + cy, cx, cy]);
  }
  order.sort((a, b) => a[0] - b[0]);
  for (const [, cx, cy] of order) {
    const id = cy * nx + cx, sig = RV.chunkSigs[id];
    let e = RV.chunks.get(id);
    if (!e || e.sig !== sig) {
      if (budget-- <= 0 || typeof document === 'undefined') { drawLandChunk(c, S, cx, cy); continue; }
      const a = P(cx * CHK - 0.5, cy * CHK - 0.5, 0), b = P(cx * CHK + CHK - 0.5, cy * CHK - 0.5, 0), d = P(cx * CHK - 0.5, cy * CHK + CHK - 0.5, 0), f = P(cx * CHK + CHK - 0.5, cy * CHK + CHK - 0.5, 0);
      const minX = d[0] - 2, maxX = b[0] + 2, minY = a[1] - 8, maxY = f[1] + 3;
      const W = Math.ceil((maxX - minX) * zb), H = Math.ceil((maxY - minY) * zb);
      const cv = e && e.cv.width === W && e.cv.height === H ? e.cv : document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d'); ctx.setTransform(zb, 0, 0, zb, -minX * zb, -minY * zb);
      drawLandChunk(ctx, S, cx, cy);
      e = { cv, x: minX, y: minY, w: W / zb, h: H / zb, sig, used: 0 };
      RV.chunks.set(id, e);
    }
    e.used = RV.t;
    c.drawImage(e.cv, e.x, e.y, e.w, e.h);
  }
  // drop chunks unseen for a while (memory at high zoom)
  if (RV.chunks.size > 140) for (const [id, e] of RV.chunks) if (RV.t - e.used > 3) RV.chunks.delete(id);
}

/* trees: one small sprite per tile and growth stage */
function drawTreesCached(c, S, t) {
  if (RV.q === 0 || typeof document === 'undefined') { drawTrees(c, S, t, t % S.W, (t / S.W) | 0); return; }
  const zb = zoomBucket();
  if (RV.treeZ !== zb || !RV.trees) { RV.trees = new Map(); RV.treeZ = zb; }
  const key = t * 4 + S.tree[t];
  let e = RV.trees.get(key);
  if (!e) {
    const x = t % S.W, y = (t / S.W) | 0, a = P(x, y, 0);
    const minX = a[0] - 30, minY = a[1] - 40, W = Math.ceil(60 * zb), H = Math.ceil(56 * zb);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.setTransform(zb, 0, 0, zb, -minX * zb, -minY * zb);
    drawTrees(ctx, S, t, x, y);
    e = { cv, x: minX, y: minY, w: W / zb, h: H / zb };
    RV.trees.set(key, e);
    if (RV.trees.size > 4000) RV.trees.clear();
  }
  c.drawImage(e.cv, e.x, e.y, e.w, e.h);
}

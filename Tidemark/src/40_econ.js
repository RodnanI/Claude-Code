/* =====================================================================
   Economy: production, households, markets, labour, electricity, trade
   scheduling, weather, forestry, taxes. Every unit created or destroyed
   here is booked in S.led in the same statement that moves it.
   ===================================================================== */

/* ---------------- production ---------------- */
// status codes shown in the inspector
const PST = ['Working', 'No workers', 'No power', 'Waiting for input', 'Output full', 'Nothing to extract'];

function stepProduction(S) {
  const rain = S.wx.k === W_RAIN;
  for (const b of S.blds) {
    const def = BT[b.type];
    if (!def.out) continue;
    const staff = def.jobs ? Math.floor(b.wk * 100 / def.jobs) : 100;
    if (staff <= 0) { b.st = 1; continue; }
    if (def.pw && !b.pwOn) { b.st = 2; continue; }
    let miss = -1;
    if (def.inp) for (const [r, n] of def.inp) if (b.inv[r] < n) { miss = r; break; }
    if (miss >= 0) { b.st = 3; b.stR = miss; continue; }
    let full = -1;
    for (const [r, n] of def.out) if (b.out[r] + n > outCap(def, r)) { full = r; break; }
    if (full >= 0) { b.st = 4; b.stR = full; continue; }
    const ext = def.ext !== undefined ? b.ext : 100;
    if (ext <= 0) { b.st = 5; continue; }
    const boost = def.tools && b.inv[R.tools] > 0 ? 50 : 0;
    let rate = Math.floor(staff * ext * (100 + boost) / 10000);
    if (rain && b.type === 'farm') rate = Math.floor(rate * 110 / 100);
    if (rate < 1) rate = 1;
    b.st = 0;
    b.prog += rate;
    if (b.prog >= def.dur * 100) {
      b.prog -= def.dur * 100;
      if (def.inp) for (const [r, n] of def.inp) { b.inv[r] -= n; S.led.use[r] += n; }
      for (const [r, n] of def.out) { b.out[r] += n; if (def.cat === 'extract') S.led.ext[r] += n; else S.led.prod[r] += n; }
      b.cyc++; b.lp = S.tick;
      if (boost && b.cyc % 8 === 0) { b.inv[R.tools]--; S.led.use[R.tools]++; }
      if (def.ext === 'trees') harvestTree(S, b);
    }
  }
}

function forestTiles(S, b) {
  const out = [], r = 3;
  for (let y = b.y - r; y <= b.y + r; y++) for (let x = b.x - r; x <= b.x + r; x++) {
    if (!inb(S, x, y)) continue; const t = y * S.W + x;
    if (S.ter[t] === T_LAND && !S.bld[t] && !S.road[t] && !S.rail[t]) out.push(t);
  }
  return out;
}
function harvestTree(S, b) {
  const ts = forestTiles(S, b);
  for (const t of ts) if (S.tree[t] >= 2) { S.tree[t]--; break; }
  // replant one empty plot so the forest renews itself
  const k = b.cyc % 7;
  let seen = 0;
  for (const t of ts) if (S.tree[t] === 0 && S.dep[t] !== D_FERTILE) { if (seen++ >= k) { S.tree[t] = 1; break; } }
}
function stepForests(S) {
  if (S.tick % 100 === 17) {
    for (const b of S.blds) if (b.type === 'forester') {
      let m = 0; for (const t of forestTiles(S, b)) if (S.tree[t] >= 2) m++;
      b.ext = Math.min(100, m * 12);
    }
  }
  if (S.tick % 600 === 300) {
    const ph = Math.floor(S.tick / 600) % 3;
    for (let t = 0; t < S.W * S.H; t++) if (S.tree[t] > 0 && S.tree[t] < 3 && (t + ph) % 3 === 0 && !S.bld[t]) S.tree[t]++;
  }
}

/* ---------------- households ---------------- */
function houseWants(b) {        // construction materials wanted by a house now
  if (b.lvl >= 3 || !b.pwOn || b.res < HCAP[b.lvl] - 2 || b.inv[R.bread] <= 0) return null;
  return UPG[b.lvl];
}
function stepHouses(S) {
  for (const b of S.blds) {
    if (b.type !== 'house') continue;
    const acc = bAcc(S, b) >= 0;
    b.needAcc += b.res * 10;
    while (b.needAcc >= MEAL) {
      b.needAcc -= MEAL;
      if (b.inv[R.bread] > 0) { b.inv[R.bread]--; S.led.use[R.bread]++; b.missed = 0; }
      else { b.missed++; if (b.missed >= 3 && b.res > 0) { b.res--; b.missed = 0; } }
    }
    const cap = HCAP[b.lvl];
    const fed = b.inv[R.bread] > 0;
    if (acc && b.pwOn && (fed || b.res < 2) && b.res < cap && b.jobsOk) {
      b.growAcc += 10;
      if (b.growAcc >= 150) { b.growAcc = 0; b.res++; }
    }
    if (b.lvl < 3 && b.res >= cap && b.pwOn && fed) {
      const need = UPG[b.lvl];
      let ok = true; for (const [r, n] of need) if (b.inv[r] < n) ok = false;
      if (ok) { for (const [r, n] of need) { b.inv[r] -= n; S.led.use[r] += n; } b.lvl++; dec(S, 16, b.id, b.lvl, 0); }
    }
    if (b.lvl === 3) {
      b.furnAcc += 10;
      if (b.furnAcc >= 3 * TPD) {
        b.furnAcc = 0;
        if (b.inv[R.furniture] > 0) { b.inv[R.furniture]--; S.led.use[R.furniture]++; b.disc = 0; }
        else if (++b.disc >= 2) { b.lvl = 2; b.disc = 0; if (b.res > HCAP[2]) b.res = HCAP[2]; }
      }
    }
  }
}

/* Markets: residents walk in and carry goods home (internal transfer). */
function housesNear(S, m) {
  if (m._hnV === S.ver.road && m._hn) return m._hn;
  const a = bAcc(S, m), out = [];
  if (a >= 0) {
    const dm = roadDist(S, a), rng = BT.market.range;
    for (const h of S.blds) {
      if (h.type !== 'house') continue;
      const ha = bAcc(S, h); if (ha < 0 || dm[ha] < 0 || dm[ha] > rng) continue;
      out.push([dm[ha], h.id]);
    }
    out.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  }
  m._hn = out.map(p => p[1]); m._hnV = S.ver.road; return m._hn;
}
function furnWant(h) { if (h.lvl === 2 && h.res >= HCAP[2] - 2) return 2; if (h.lvl === 3) return 2; return 0; }
function stepMarkets(S) {
  for (const m of S.blds) {
    if (m.type !== 'market') continue;
    if (m.wk < 1) { m.st = 1; continue; }
    if (!m.pwOn) { m.st = 2; continue; }
    m.st = 0; let served = 0;
    for (const hid of housesNear(S, m)) {
      const h = bById(S, hid); if (!h) continue;
      if (h.inv[R.bread] < 4 && m.inv[R.bread] > 0) {
        const n = Math.min(2, m.inv[R.bread], 4 - h.inv[R.bread]); m.inv[R.bread] -= n; h.inv[R.bread] += n; served++;
      }
      const fw = furnWant(h);
      if (h.inv[R.furniture] < fw && m.inv[R.furniture] > 0) { m.inv[R.furniture]--; h.inv[R.furniture]++; served++; }
    }
    m.served = served;
  }
}

/* ---------------- labour ---------------- */
function workPrio(b) { const t = b.type; if (t === 'powerplant') return 0; if (t === 'market' || t === 'bakery' || t === 'mill' || t === 'farm' || BT[t].node) return 1; return 2; }
/* Loading speed at staffed facilities: unstaffed yards work at a third of the pace. */
function handleMul(b) { const j = BT[b.type].jobs; if (!j || b.type === 'house') return 100; return Math.max(34, Math.floor(b.wk * 100 / j)); }
function stepLabour(S) {
  const rn = roadNet(S); const pool = new Map(), tot = new Map();
  for (const b of S.blds) if (b.type === 'house') {
    const a = bAcc(S, b); if (a < 0) continue; const k = rn.rc[a];
    const w = Math.floor(b.res * WORK_PCT / 100);
    pool.set(k, (pool.get(k) || 0) + w); tot.set(k, (tot.get(k) || 0) + w);
  }
  const work = S.blds.filter(b => BT[b.type].jobs > 0).sort((a, b) => workPrio(a) - workPrio(b) || a.id - b.id);
  const open = new Map(); let jobs = 0, emp = 0;
  for (const b of work) {
    const j = BT[b.type].jobs; jobs += j;
    const a = bAcc(S, b); if (a < 0) { b.wk = 0; continue; }
    const k = rn.rc[a], p = pool.get(k) || 0, n = Math.min(j, p);
    b.wk = n; emp += n; pool.set(k, p - n);
    if (n < j) open.set(k, (open.get(k) || 0) + j - n);
  }
  let pop = 0;
  for (const b of S.blds) if (b.type === 'house') {
    pop += b.res;
    const a = bAcc(S, b); if (a < 0) { b.jobsOk = 0; continue; }
    const k = rn.rc[a], un = pool.get(k) || 0, all = tot.get(k) || 0;
    b.jobsOk = ((open.get(k) || 0) > 0 || un * 100 <= all * 15 + 400) ? 1 : 0;
  }
  let wf = 0; for (const v of tot.values()) wf += v;
  S.labour = { pop, jobs, emp, wf, unemp: wf - emp };
  let h = 0; for (const b of work) h = hmix(h, b.wk); dec(S, 13, emp, pop, h);
}

/* ---------------- electricity ---------------- */
function powNeed(S, b, eve) {
  if (b.type === 'house') return eve ? Math.ceil(HPOW[b.lvl] * 3 / 2) : HPOW[b.lvl];
  return BT[b.type].pw || 0;
}
function powPrio(b) { const t = b.type; if (t === 'market' || t === 'mill' || t === 'bakery') return 0; if (t === 'house') return 2; return 1; }
function genCap(S, p) {
  const def = BT[p.type];
  if (def.tidal) { let c = Math.floor(def.gen * Math.abs(tideFlow(S.tick)) / 1000); if (S.wx.k === W_STORM) c = Math.floor(c * 13 / 10); return c; }
  if (def.fuel !== undefined) { if (p.inv[def.fuel] <= 0 || !def.jobs) return 0; return Math.floor(def.gen * p.wk / def.jobs); }
  return 0;
}
function stepPower(S) {
  const pn = powerNet(S), comp = pn.pwComp, hr = hourOf(S.tick), eve = hr >= 18 && hr < 23;
  const groups = new Map();
  for (const b of S.blds) {
    const def = BT[b.type], k = comp[b.y * S.W + b.x];
    let g = groups.get(k); if (!g) { g = { gens: [], cons: [] }; groups.set(k, g); }
    if (def.gen) g.gens.push(b);
    if (powNeed(S, b, eve) > 0) g.cons.push(b);
  }
  const stat = []; let ph = 0;
  for (const [k, g] of groups) {
    const caps = g.gens.map(p => genCap(S, p));
    let supply = 0; for (const c of caps) supply += c;
    const cons = g.cons.slice().sort((a, b) => powPrio(a) - powPrio(b) || a.id - b.id);
    let rem = supply, dem = 0;
    for (const c of cons) { const n = powNeed(S, c, eve); dem += n; if (rem >= n) { c.pwOn = 1; rem -= n; } else c.pwOn = 0; ph = hmix(ph, c.id * 2 + c.pwOn); }
    let used = supply - rem;
    // free tidal power first, then coal plants in id order
    const order = g.gens.map((p, i) => i).sort((a, b) => (BT[g.gens[a].type].tidal ? 0 : 1) - (BT[g.gens[b].type].tidal ? 0 : 1) || g.gens[a].id - g.gens[b].id);
    for (const i of order) {
      const p = g.gens[i], take = Math.min(caps[i], used); used -= take; p.load = take; p.cap = caps[i];
      const def = BT[p.type];
      if (def.fuel !== undefined) {
        p.burn += take * 10;
        while (p.burn >= BURN && p.inv[def.fuel] > 0) { p.inv[def.fuel]--; S.led.use[def.fuel]++; p.burn -= BURN; }
        if (p.inv[def.fuel] <= 0 && p.burn > BURN) p.burn = BURN;
      }
    }
    if (g.gens.length || g.cons.length) stat.push([k, supply, dem, supply - rem]);
    if (dem > supply && g.cons.length) S.stats.lastBrown = S.tick;
  }
  S.pstat = stat;
  dec(S, 14, stat.length, ph, 0);
}

/* ---------------- trade, weather, money ---------------- */
const impPrice = r => Math.ceil(RES[r].price * 3 / 2);
function mainQuay(S) { for (const b of S.blds) if (b.type === 'quay') return b; return null; }
function stepTrade(S) {
  if (S.tick < S.trade.next) return;
  S.trade.next = S.tick + S.trade.every;
  const q = mainQuay(S); if (!q || S.gate < 0) return;
  let expWanted = 0; for (let r = 0; r < NR; r++) expWanted += S.trade.exp[r];
  let wantImp = false; for (let r = 0; r < NR; r++) if (S.trade.imp[r] > q.inv[r] - q.rsv[r]) wantImp = true;
  const hasExp = sumArr(q.exp) > 0;
  if (!wantImp && !hasExp) return;
  for (const v of S.vehs) if (v.k === 'freighter' && v.job && v.job.ph !== 'out') return; // one call at a time
  const bs = berths(S, q, 'freighter');
  if (!bs.length) { pushAlert(S, 'trade', 'The harbour quay has no berth a freighter can use (bridges or no deep water)', q.id); return; }
  const p = waterSearch(S, S.gate, new Set(bs), 'freighter', 60000);
  if (!p) { pushAlert(S, 'trade', 'Freighters cannot reach the quay from open sea (a low bridge blocks the channel?)', q.id); return; }
  const own = zr(); let tot = 0;
  for (let r = 0; r < NR; r++) {
    // standing order: top the quay up to the target stock level
    let n = Math.min(Math.max(0, S.trade.imp[r] - q.inv[r] + q.rsv[r]), VT.freighter.cap - tot);
    const pr = impPrice(r);
    if (!S.flags.inf) n = Math.min(n, Math.floor(Math.max(0, S.money) / pr));
    if (n > 0) { own[r] = n; tot += n; pay(S, n * pr, 'imp'); S.led.imp[r] += n; }
  }
  if (!tot && !hasExp && !expWanted) return;
  spawnFreighter(S, q, own);
}

function stepWeather(S) {
  if (S.tick < S.wx.until) return;
  const r = rngInt(S, 100), hr = hourOf(S.tick), cur = S.wx.k;
  let k;
  if (cur === W_STORM) k = r < 60 ? W_RAIN : W_CLOUD;
  else if (r < 38) k = W_CLEAR;
  else if (r < 64) k = W_CLOUD;
  else if (r < 80) k = W_RAIN;
  else if (r < 95) k = hr < 10 || hr > 20 ? W_FOG : W_CLOUD;
  else k = W_STORM;
  S.wx.k = k;
  S.wx.until = S.tick + (k === W_STORM ? 2 + rngInt(S, 4) : 3 + rngInt(S, 9)) * TPH;
}

function stepDaily(S) {
  let tax = 0, pop = 0;
  for (const b of S.blds) if (b.type === 'house') { tax += b.res * TAX[b.lvl]; pop += b.res; }
  earn(S, tax, 'tax');
  let up = 0; for (const v of S.vehs) up += VT[v.k].upkeep || 0;
  if (!S.flags.inf) { S.money -= up; S.mled.upkeep += up; }
  const day = { d: Math.floor(S.tick / TPD), pop, money: S.money, del: S.delivered.slice(), tax };
  S.stats.day.push(day); if (S.stats.day.length > 60) S.stats.day.shift();
}

function pushAlert(S, kind, text, ref) {
  for (const a of S.alerts) if (a.kind === kind && a.text === text) { a.t = S.tick; return; }
  S.alerts.push({ kind, text, ref: ref | 0, t: S.tick });
  if (S.alerts.length > 30) S.alerts.shift();
}

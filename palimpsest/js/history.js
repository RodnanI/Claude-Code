/* Palimpsest / history
   A thousand years, one at a time. Peoples arrive and build, towns grow and
   send out daughters, chiefs become kings, kings die badly, borders are argued
   over with spears, sickness walks the roads, and a ship-borne people comes out
   of the west. Everything that happens is written down as a plain event; the
   chronicler decides later what was worth a line. */
'use strict';
(function () {
  const P = window.P;
  const U = P.util;
  const B = () => P.BIOME;

  const FORM_LEVEL = { tribe: 0, city: 1, kingdom: 1, empire: 2 };
  const PIGMENTS = [
    { name: 'vermilion', ink: '#a8381f' }, { name: 'verdigris', ink: '#3f7a5e' }, { name: 'yellow ochre', ink: '#b8862b' },
    { name: 'rose madder', ink: '#a24a5a' }, { name: 'indigo', ink: '#3d5a7a' }, { name: 'sap green', ink: '#6a7a2a' },
    { name: 'burnt sienna', ink: '#8a4a26' }, { name: 'lamp black', ink: '#4a4440' }, { name: 'orpiment', ink: '#c09a2a' },
    { name: 'malachite', ink: '#2f6a6a' },
  ];

  function simulate(world) {
    const rng = world.rng.fork('history');
    const T = world.terrain, W = world.W, H = world.H, N = W * H;
    const Lg = P.Lang;
    const BI = B();
    const Y = (world.years = 1000 + 50 * rng.int(0, 6));
    const cultures = (world.cultures = []);
    const settlements = (world.settlements = []);
    const polities = (world.polities = []);
    const events = (world.events = []);
    const wars = (world.wars = []);
    const roads = (world.roads = []);
    const rulers = (world.rulers = []);
    const plagues = [];
    let year = 0;
    const ev = (type, o) => { const e = Object.assign({ y: year, type }, o); events.push(e); return e; };

    let landCells = 0;
    for (let i = 0; i < N; i++) if (!T.water[i] && T.lake[i] < 0) landCells++;
    const maxSettlements = U.clamp(Math.round(landCells / 230), 40, 170);

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const alive = (s) => s.ruined === null;
    const liveSettlements = () => settlements.filter(alive);
    const owned = (p) => settlements.filter((s) => alive(s) && s.owner === p.id);
    const totalPop = (p) => { let t = 0; for (const s of settlements) if (alive(s) && s.owner === p.id) t += s.pop; return t; };
    const strength = (p) => totalPop(p) * (1 + 0.25 * FORM_LEVEL[p.form]) * (p.crisis ? 0.7 : 1);
    const reach = (p) => 18 + 9 * Math.log2(1 + totalPop(p) / 1500);
    const ruler = (p) => p.rulers[p.rulers.length - 1];
    const cultureOf = (p) => cultures[p.culture];

    /* water between two places? */
    function crossesWater(a, b) {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let k = 1; k < n; k++) {
        const x = Math.round(a.x + (b.x - a.x) * (k / n)), y = Math.round(a.y + (b.y - a.y) * (k / n));
        const i = y * W + x;
        if (T.water[i] || T.lake[i] >= 0) return true;
      }
      return false;
    }
    function nearRiver(cell) {
      const x = cell % W, y = (cell / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (T.riverOf[ny * W + nx] >= 0) return T.riverOf[ny * W + nx];
      }
      return -1;
    }
    function nearLake(cell) {
      const x = cell % W, y = (cell / W) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (T.lake[ny * W + nx] >= 0) return true;
      }
      return false;
    }
    function dirName(from, to) {
      const a = Math.atan2(to.y - from.y, to.x - from.x);
      const k = Math.round(a / (Math.PI / 2));
      return ['east', 'south', 'west', 'north', 'west'][(k + 4) % 4] || 'east';
    }

    /* ---------- peoples ---------- */
    function englishForms(R, r) {
      const low = R.toLowerCase();
      const last = low[low.length - 1];
      const vowelEnd = 'aeiouyäöüëèéáíóúâêîôûåøæıàò'.includes(last);
      const stem = R.replace(/['’]/g, '');
      const opts = vowelEnd
        ? [[stem + 'ns', stem + 'n'], [stem + 'r', stem + 'ric'], [stem + 'ni', stem + 'nic'], [stem + 's', stem + 'n']]
        : [[stem + 'i', stem + 'ic'], [stem + 'ar', stem + 'ari'], [stem + 'en', stem + 'ish'], [stem + 'ites', stem + 'ite'], [stem + 'ans', stem + 'an'], [stem + 'ings', stem + 'ing']];
      const f = r.pick(opts);
      return { plural: f[0], adj: f[1] };
    }

    const GOD_DOMAINS = ['the sea', 'the harvest', 'the dead', 'the sky', 'fire', 'the hunt', 'the river', 'storms', 'the hearth', 'the moon', 'the crossroads', 'the forge', 'oaths', 'the mountain', 'the wind', 'bees and honey', 'the threshold', 'wolves', 'salt'];

    function makeCulture(r, origin, arrived) {
      const id = cultures.length;
      const cr = r.fork('culture' + id);
      const lang = new Lg.Language(cr.fork('lang'), id);
      lang.scheduleChanges(cr.fork('changes'), arrived + 90, Y - 25);
      const literate = origin !== 'sea' ? cr.chance(0.85) : cr.chance(0.4);
      const script = literate ? new P.Script(cr.fork('script'), lang) : null;
      let endPh;
      for (let t = 0; t < 10; t++) { endPh = lang.coin(cr.fork('endonym' + t), arrived, cr.weighted([[1, 1], [2, 3]])); if (endPh.length >= 3 && endPh.length <= 6) break; }
      const endonym = new Lg.Name(lang, endPh, arrived, { kind: 'people', gloss: cr.pick(['the people', 'the speakers', 'those who stayed', 'the first-born', 'the free', 'the kin', 'the ones who came over the water', 'the people of the morning']) });
      const ex = englishForms(endonym.text(arrived), cr);
      const gods = [];
      const ng = cr.int(1, 3);
      const doms = cr.shuffle(GOD_DOMAINS.slice());
      for (let k = 0; k < ng; k++) {
        let ph;
        for (let t = 0; t < 12; t++) { ph = lang.coin(cr.fork('god' + k + ':' + t), arrived, cr.int(1, 2)); if (ph.length >= 3 && ph.length <= 7) break; }
        gods.push({ name: new Lg.Name(lang, ph, arrived, { kind: 'god' }), domain: doms[k] });
      }
      const c = {
        id, lang, script, endonym, plural: ex.plural, adj: ex.adj, origin, arrived,
        gods, scriptFrom: script ? id : null,
        temper: { aggr: cr.range(0.5, 1.5) * (origin === 'sea' ? 1.4 : 1), expand: cr.range(0.7, 1.4), piety: cr.next(), trade: cr.next(), sea: origin === 'sea' ? 1 : cr.range(0, 0.8) },
        rng: cr,
        homeland: null,
      };
      cultures.push(c);
      return c;
    }

    /* ---------- names of places ---------- */
    const usedNames = new Set();
    function nameSettlement(c, cell, yr, r, ctx) {
      const lang = c.lang;
      const b = T.biome[cell], riv = nearRiver(cell) >= 0, coast = T.coastal[cell] === 1, lake = nearLake(cell), elev = T.elev[cell], temp = T.temp[cell];
      const heads = [['town', 2], ['fort', 1.1], ['hall', 0.7], ['farm', 0.8], ['market', 0.5], ['gate', 0.3], ['tower', 0.4], ['house', 0.5], ['field', 0.6], ['vale', elev < 0.15 ? 0.9 : 0.3], ['spring', 0.5]];
      if (riv) heads.push(['ford', 3], ['bridge', 1.8]);
      if (coast) heads.push(['port', 3], ['bay', 1.4], ['shore', 1], ['cape', 0.7]);
      if (lake) heads.push(['lake', 2], ['shore', 0.8]);
      if (elev > 0.18) heads.push(['hill', 2.4], ['rock', 1], ['mount', 0.6]);
      if (b === BI.FOREST || b === BI.TAIGA || b === BI.JUNGLE) heads.push(['wood', 2]);
      if (b === BI.MARSH) heads.push(['marsh', 2.2]);
      if (b === BI.DESERT || b === BI.STEPPE) heads.push(['well', 2.4], ['spring', 1]);
      const mods = [['white', 1], ['black', 0.8], ['red', 0.9], ['green', 0.8], ['grey', 0.7], ['old', 0.7], ['great', 0.6], ['little', 0.6], ['fair', 0.6], ['bright', 0.5], ['still', 0.4], ['long', 0.5], ['broad', 0.5], ['dark', 0.4], ['gold', 0.4], ['silver', 0.3], ['hidden', 0.2], ['first', 0.15]];
      if (elev > 0.2) mods.push(['high', 2]); else mods.push(['low', 0.5]);
      if (temp < 4) mods.push(['cold', 1.5]);
      if (temp > 18) mods.push(['warm', 1]);
      if (riv || coast || lake) mods.push(['deep', 0.8]);
      const natPool = {
        forest: ['oak', 'ash', 'birch', 'willow', 'deer', 'boar', 'wolf', 'bear', 'hawk', 'honey'],
        taiga: ['pine', 'elk', 'wolf', 'bear', 'snow', 'crow'],
        grass: ['horse', 'barley', 'apple', 'rose', 'bee', 'honey', 'crow', 'thorn'],
        steppe: ['horse', 'wind', 'eagle', 'crow', 'thorn'],
        desert: ['salt', 'sand', 'sun', 'serpent', 'star'],
        marsh: ['reed', 'willow', 'mist', 'fish', 'swan'],
        coast: ['salt', 'fish', 'swan', 'amber', 'wind', 'mist'],
        mount: ['stone', 'iron', 'eagle', 'snow', 'ice', 'cloud'],
        cold: ['snow', 'ice', 'wolf', 'elk', 'star'],
      };
      let pool = natPool.grass;
      if (b === BI.FOREST || b === BI.JUNGLE) pool = natPool.forest;
      else if (b === BI.TAIGA) pool = natPool.taiga;
      else if (b === BI.STEPPE) pool = natPool.steppe;
      else if (b === BI.DESERT) pool = natPool.desert;
      else if (b === BI.MARSH) pool = natPool.marsh;
      else if (elev > 0.3) pool = natPool.mount;
      else if (temp < 2) pool = natPool.cold;
      if (coast && r.chance(0.5)) pool = natPool.coast;
      for (let attempt = 0; attempt < 8; attempt++) {
        const pat = r.weighted([['modhead', 4], ['nathead', 3.2], ['founder', ctx.founder ? 1.1 : 0], ['new', ctx.parent ? 0.8 : 0], ['opaque', 1.5], ['head', 0.6], ['dir', ctx.capital ? 0.5 : 0], ['holy', 0.35]]);
        let n;
        const head = r.weighted(heads);
        if (pat === 'modhead') { const m = r.weighted(mods); n = Lg.compose(lang, [m, head], yr, { gloss: m + ' ' + head }); }
        else if (pat === 'nathead') { const m = r.pick(pool); n = Lg.compose(lang, [m, head], yr, { gloss: m + ' ' + head }); }
        else if (pat === 'founder') { n = Lg.compose(lang, [ctx.founder, head], yr, { gloss: ctx.founder.text(yr) + "'s " + head, join: 'fuse' }); }
        else if (pat === 'new') { n = Lg.compose(lang, ['new', ctx.parent], yr, { gloss: 'new ' + ctx.parent.text(yr) }); }
        else if (pat === 'opaque') { n = new Lg.Name(lang, lang.coin(r, yr, r.weighted([[2, 5], [3, 1]])), yr, { gloss: null }); }
        else if (pat === 'head') { n = Lg.compose(lang, [head], yr, { gloss: 'the ' + head }); }
        else if (pat === 'dir') { const d = dirName(ctx.capital, { x: cell % W, y: (cell / W) | 0 }); n = Lg.compose(lang, [d, head], yr, { gloss: d + ' ' + head }); }
        else { const h2 = r.pick(['spring', 'hill', 'well', 'rock', 'temple', 'wood']); n = Lg.compose(lang, ['holy', h2], yr, { gloss: 'holy ' + h2 }); }
        n.kind = 'place';
        const t = n.text(yr);
        const solid = n.ph.filter((p) => p !== ' ' && p !== '-').length;
        if (usedNames.has(t) || solid < 3 || solid > 10 || t.length > 13) continue;
        usedNames.add(t);
        return n;
      }
      const n = new Lg.Name(lang, lang.coin(r, yr, 2).concat(lang.coin(r, yr, 1)), yr, { gloss: null, kind: 'place' });
      usedNames.add(n.text(yr));
      return n;
    }

    /* ---------- settlements ---------- */
    function found(cell, c, owner, yr, pop, parent, r) {
      const p = polities[owner];
      const s = {
        id: settlements.length, cell, x: cell % W, y: (cell / W) | 0,
        culture: c.id, owner, founded: yr, ruined: null, ruinCause: null,
        pop, peak: pop, parent: parent ? parent.id : null,
        port: T.coastal[cell] === 1, river: nearRiver(cell),
        names: [], works: [], near: [], roadDone: false, spans: [],
        popY: new Float32Array(Y + 1), ownerY: new Int16Array(Y + 1).fill(-1), cultY: new Int8Array(Y + 1).fill(-1),
      };
      const nm = nameSettlement(c, cell, yr, r, { founder: p && r.chance(0.5) ? ruler(p) && ruler(p).name : null, parent: parent ? currentName(parent) : null, capital: p ? settlements[p.capital] : null });
      s.names.push({ year: yr, name: nm, why: 'founded' });
      for (const o of settlements) if (dist(o, s) < 13) { o.near.push(s.id); s.near.push(o.id); }
      settlements.push(s);
      return s;
    }
    const currentName = (s) => s.names[s.names.length - 1].name;
    function nameAt(s, yr) {
      let n = s.names[0];
      for (const e of s.names) if (e.year <= yr) n = e;
      return n.name;
    }
    world.nameAt = nameAt;

    function goodSite(from, c, r, rmin, rmax) {
      let best = -1, bestScore = -1e9;
      const live = liveSettlements();
      for (let t = 0; t < 60; t++) {
        const a = r.range(0, Math.PI * 2), d = r.range(rmin, rmax);
        const x = Math.round(from.x + Math.cos(a) * d), y = Math.round(from.y + Math.sin(a) * d);
        if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue;
        const i = y * W + x;
        if (T.water[i] || T.lake[i] >= 0 || T.suit[i] < 0.22) continue;
        let ok = true;
        for (const o of settlements) {
          const dd = Math.hypot(o.x - x, o.y - y);
          if (dd < (alive(o) ? 6.5 : 3)) { ok = false; break; }
        }
        if (!ok) continue;
        const to = { x, y };
        if (crossesWater(from, to) && !(c.temper.sea > 0.45 && T.coastal[i] && from.port)) continue;
        const score = T.suit[i] + 0.25 * T.coastal[i] + (nearRiver(i) >= 0 ? 0.3 : 0) - 0.012 * d + r.range(0, 0.15);
        if (score > bestScore) { bestScore = score; best = i; }
      }
      return best;
    }

    /* ---------- polities and rulers ---------- */
    function crown(p, yr, r, opts) {
      opts = opts || {};
      const c = cultureOf(p);
      const prev = ruler(p);
      let name = opts.name;
      if (!name) {
        const ancestors = p.rulers.filter((x) => x.dynasty === (opts.dynasty || p.dynasty));
        if (ancestors.length && r.chance(0.32)) name = r.pick(ancestors).name;
        else name = Lg.personName(c.lang, r, yr);
      }
      const female = opts.female !== undefined ? opts.female : r.chance(0.3);
      const age = opts.age !== undefined ? opts.age : r.int(17, 46);
      const R = {
        id: rulers.length, name, female, born: yr - age, from: yr, to: null, death: null, epithet: null,
        polity: p.id, dynasty: opts.dynasty || p.dynasty, relation: opts.relation || null, prev: prev ? prev.id : null,
        deeds: { wars: 0, won: 0, lost: 0, built: 0, conquered: 0, plague: 0 }, ordinal: 1, child: age < 15,
      };
      const same = rulers.filter((x) => x.polity === p.id && x.name.text(yr) === name.text(yr)).length;
      R.ordinal = same + 1;
      if (!p.dynasty) p.dynasty = R.id;
      if (!R.dynasty) R.dynasty = p.dynasty;
      rulers.push(R);
      p.rulers.push(R);
      return R;
    }

    function realmName(c, capital, yr, r) {
      const cap = currentName(capital);
      const pat = r.weighted([['capital', 5], ['people', 2.5], ['land', 1.5]]);
      if (pat === 'capital') return cap;
      if (pat === 'people') { const n = Lg.compose(c.lang, [c.endonym, 'land'], yr, { gloss: 'land of the ' + c.plural, join: 'fuse' }); n.kind = 'realm'; return n; }
      const m = r.pick(['high', 'green', 'broad', 'fair', 'old', 'white', 'red', 'far']);
      const n = Lg.compose(c.lang, [m, 'land'], yr, { gloss: m + ' land' });
      n.kind = 'realm';
      return n;
    }

    function makePolity(c, capital, yr, form, r, opts) {
      opts = opts || {};
      const p = {
        id: polities.length, culture: c.id, capital: capital.id, capitals: [{ year: yr, s: capital.id }],
        founded: yr, ended: null, endCause: null, endBy: null,
        form, forms: [{ year: yr, form }], name: null, rulers: [], dynasty: null,
        aggr: c.temper.aggr * r.range(0.7, 1.3), war: null, truce: new Map(), grudge: new Map(), crisis: null,
        parent: opts.parent !== undefined ? opts.parent : null, color: null,
      };
      polities.push(p);
      p.name = opts.name || realmName(c, capital, yr, r);
      p.names = [{ year: yr, name: p.name }];
      crown(p, yr, r, opts.ruler || {});
      return p;
    }

    function setOwner(s, p) { s.owner = p.id; }

    function endPolity(p, cause, by) {
      if (p.ended !== null) return;
      p.ended = year; p.endCause = cause; p.endBy = by !== undefined ? by : null;
      const R = ruler(p);
      if (R && R.to === null) { R.to = year; R.death = R.death || 'deposed'; }
      if (p.war) endWar(p.war, by !== undefined && by !== null ? by : null, true);
    }

    /* ---------- wars ---------- */
    function neighbours(p) {
      const mine = owned(p);
      const out = new Map();
      for (const q of polities) {
        if (q === p || q.ended !== null) continue;
        const theirs = owned(q);
        let best = 1e9;
        for (const a of mine) for (const b of theirs) {
          const d = dist(a, b);
          if (d < best) {
            const sea = crossesWater(a, b);
            if (!sea || (a.port && b.port && cultureOf(p).temper.sea > 0.5 && d < 45)) best = d;
          }
        }
        if (best < 30 || (best < 45 && cultureOf(p).temper.sea > 0.5)) out.set(q.id, best);
      }
      return out;
    }

    function endWar(w, winnerId, quiet) {
      if (w.end !== null) return;
      w.end = year;
      const A = polities[w.a], Bp = polities[w.b];
      A.war = null; Bp.war = null;
      const until = year + rng.int(14, 40);
      A.truce.set(Bp.id, until); Bp.truce.set(A.id, until);
      if (winnerId === null || winnerId === undefined) {
        w.result = 'stalemate';
        if (!quiet) ev('peace', { p: A.id, q: Bp.id, war: w.id, stalemate: true, ceded: w.captured.slice() });
      } else {
        const loser = winnerId === A.id ? Bp : A;
        w.result = winnerId;
        loser.grudge.set(winnerId, (loser.grudge.get(winnerId) || 0) + 1);
        const RW = ruler(polities[winnerId]), RL = ruler(loser);
        if (RW) RW.deeds.won++;
        if (RL) RL.deeds.lost++;
        if (!quiet) ev('peace', { p: winnerId, q: loser.id, war: w.id, ceded: w.captured.filter((sid) => settlements[sid].owner === winnerId) });
      }
    }

    function capitalCheck(p, r) {
      const cap = settlements[p.capital];
      if (alive(cap) && cap.owner === p.id) return;
      const mine = owned(p);
      if (!mine.length) return;
      mine.sort((a, b) => b.pop - a.pop);
      const old = p.capital;
      p.capital = mine[0].id;
      p.capitals.push({ year, s: p.capital });
      ev('capital', { p: p.id, from: old, to: p.capital });
    }

    function capture(s, winner, loser, r, w) {
      const prevCult = s.culture;
      setOwner(s, winner);
      if (w) w.captured.push(s.id);
      const RW = ruler(winner);
      if (RW) RW.deeds.conquered++;
      const wc = cultureOf(winner);
      if (prevCult !== wc.id && r.chance(0.3) && s.pop > 300) {
        const old = currentName(s);
        const nm = nameSettlement(wc, s.cell, year, r, { founder: RW ? RW.name : null, capital: settlements[winner.capital] });
        s.names.push({ year, name: nm, why: 'conquest', by: winner.id });
        ev('rename', { s: s.id, old, nw: nm, c: wc.id, p: winner.id, why: 'conquest' });
      }
    }

    function ruin(s, cause) {
      if (!alive(s)) return;
      s.ruined = year; s.ruinCause = cause;
      s.spans.push({ from: year, to: null, cause });
      if (s.peak > 1200 || cause !== 'abandoned') ev('ruin', { s: s.id, cause, p: s.owner });
      for (const p of polities) if (p.ended === null && p.capital === s.id) capitalCheck(p, rng);
    }

    /* ---------- the people arrive ---------- */
    const nFounders = U.clamp(Math.round(landCells / 7500) + rng.int(1, 2), 3, 5);
    const candidates = [];
    for (let i = 0; i < N; i++) if (T.suit[i] > 0.6 && !T.water[i] && T.lake[i] < 0) candidates.push(i);
    candidates.sort((a, b) => T.suit[b] - T.suit[a]);
    const top = candidates.slice(0, Math.max(40, Math.floor(candidates.length * 0.35)));
    // peoples settle near enough to meet within a few generations, far enough to grow apart first
    const homes = [];
    if (top.length) homes.push(top[rng.int(0, Math.min(top.length - 1, 30))]);
    const minSep = rng.range(38, 52);
    for (let t = 0; t < 4000 && homes.length < nFounders && top.length; t++) {
      const c = top[rng.int(0, top.length - 1)];
      let dmin = 1e9;
      for (const h of homes) dmin = Math.min(dmin, Math.hypot((c % W) - (h % W), ((c / W) | 0) - ((h / W) | 0)));
      const limit = t < 2500 ? minSep * 2.1 : 1e9;
      if (dmin >= minSep && dmin <= limit) homes.push(c);
    }
    const arrivals = homes.map((h, k) => ({ year: k === 0 ? 0 : rng.int(5, 110), cell: h }));
    arrivals.sort((a, b) => a.year - b.year);

    // the sea-people, if this world has room for them
    let invasion = null;
    const openSea = T.features.seas.filter((s) => s.kind === 'sea');
    if (openSea.length && rng.chance(0.68)) invasion = { year: Math.round(Y * rng.range(0.33, 0.7)) };

    /* ---------- one year ---------- */
    const yr = rng.fork('years');

    function stepRulers(p) {
      const R = ruler(p);
      if (!R || R.to !== null) return;
      const age = year - R.born;
      let hz = age < 30 ? 0.009 : age < 45 ? 0.015 : age < 60 ? 0.032 : age < 70 ? 0.07 : 0.15;
      if (p.war) hz += 0.006;
      const cap = settlements[p.capital];
      if (cap && cap.plagueUntil >= year) hz += 0.06;
      if (!yr.chance(hz)) return;
      let cause = yr.weighted([['fever', 3], ['old age', age > 62 ? 6 : 0], ['a fall from a horse', 1], ['poison', 0.35], ['childbed', R.female && age < 40 ? 0.6 : 0], ['drowning', cultureOf(p).temper.sea > 0.6 ? 0.6 : 0.15], ['murder', 0.3], ['grief', 0.15], ['a wasting sickness', 1.2], ['in battle', p.war ? 2 : 0], ['plague', cap && cap.plagueUntil >= year ? 6 : 0]]);
      die(p, R, cause);
    }

    function epithet(R, p) {
      const reign = R.to - R.from;
      const d = R.deeds;
      const opts = [];
      if (reign >= 38) opts.push(['the Old', 3], ['the Long-Lived', 1]);
      if (d.conquered >= 3) opts.push(['the Conqueror', 3], ['the Great', 2]);
      if (d.won >= 2 && d.lost === 0) opts.push(['the Victorious', 2], ['the Lion', 1]);
      if (d.lost >= 2) opts.push(['the Unlucky', 2], ['the Hapless', 1]);
      if (d.built >= 2) opts.push(['the Builder', 4]);
      if (reign <= 2) opts.push(['the Brief', 2]);
      if (R.child) opts.push(['the Child', 1.5]);
      if (d.plague) opts.push(['the Grey', 1]);
      if (R.death === 'poison') opts.push(['the Poisoned', 1.5]);
      if (R.death === 'murder') opts.push(['the Betrayed', 1.2]);
      if (opts.length === 0 || yr.chance(0.25)) {
        if (yr.chance(0.55)) opts.push(['the Fair', 1], ['the Pious', 1], ['the Cruel', 1], ['the Silent', 1], ['the Lame', 0.8], ['the Bald', 0.7], ['the Wise', 1], ['the Fat', 0.6], ['the Red', 0.8], ['the Stammerer', 0.5], ['the Good', 1], ['the Mad', 0.4], ['the Just', 0.8], ['the Proud', 0.8], ['the Gentle', 0.6], ['the Hunter', 0.7]);
      }
      return opts.length ? yr.weighted(opts) : null;
    }

    function die(p, R, cause) {
      R.to = year; R.death = cause;
      R.epithet = epithet(R, p);
      const mine = owned(p);
      const e = ev('death', { p: p.id, r: R.id, cause, age: year - R.born, reign: year - R.from });
      // succession
      const heirP = p.form === 'city' ? 0 : p.form === 'tribe' ? 0.72 : 0.84;
      if (p.form === 'city') {
        const nR = crown(p, year, yr, { relation: 'elected', dynasty: R.dynasty });
        e.next = nR.id; e.relation = 'elected';
        return;
      }
      if (yr.chance(heirP)) {
        const rel = yr.weighted([['son', 5], ['daughter', 2.2], ['brother', 1.4], ['sister', 0.6], ['nephew', 0.9], ['niece', 0.4], ['grandson', 0.8], ['granddaughter', 0.35], ['cousin', 0.5]]);
        const female = ['daughter', 'sister', 'niece', 'granddaughter'].includes(rel);
        const pa = year - R.born;
        let age;
        if (rel === 'son' || rel === 'daughter') age = U.clamp(pa - yr.int(18, 36), 2, 50);
        else if (rel === 'grandson' || rel === 'granddaughter') age = U.clamp(pa - yr.int(40, 60), 1, 30);
        else age = U.clamp(pa + yr.int(-12, 6), 12, 60);
        const nR = crown(p, year, yr, { relation: rel, female, age, dynasty: R.dynasty });
        e.next = nR.id; e.relation = rel;
        if (nR.child) ev('regency', { p: p.id, r: nR.id });
        return;
      }
      if (mine.length >= 4 && p.form !== 'tribe' && yr.chance(0.6)) {
        const rivals = mine.filter((s) => s.id !== p.capital).sort((a, b) => b.pop - a.pop);
        const seat = rivals[0];
        const a = crown(p, year, yr, { relation: 'cousin', dynasty: R.dynasty });
        const bName = Lg.personName(cultureOf(p).lang, yr, year);
        p.crisis = { until: year + yr.int(1, 4), a: a.id, bName, seat: seat.id };
        e.next = a.id; e.relation = 'disputed';
        ev('crisis', { p: p.id, a: a.id, bName, seat: seat.id });
        return;
      }
      const seat = mine.length ? mine.slice().sort((a, b) => b.pop - a.pop)[mine.length > 1 ? 1 : 0] : null;
      const nR = crown(p, year, yr, { dynasty: null });
      nR.dynasty = nR.id;
      p.dynasty = nR.id;
      e.next = nR.id; e.relation = 'none';
      ev('dynasty', { p: p.id, r: nR.id, seat: seat ? seat.id : p.capital, origin: yr.pick(['a lord', 'a general', 'a priest', 'a steward', 'a merchant prince', 'a captain of the guard']) });
    }

    function resolveCrisis(p) {
      const c = p.crisis;
      p.crisis = null;
      const seat = settlements[c.seat];
      if (!alive(seat) || seat.owner !== p.id) { ev('crisis-end', { p: p.id, a: c.a, bName: c.bName, how: 'vanished' }); return; }
      if (yr.chance(0.45)) {
        const cap = settlements[p.capital];
        const mine = owned(p).filter((s) => s.id !== p.capital);
        const q = makePolity(cultureOf(p), seat, year, p.form === 'empire' ? 'kingdom' : p.form, yr, { parent: p.id, name: currentName(seat), ruler: { name: c.bName, dynasty: null } });
        q.dynasty = ruler(q).id; ruler(q).dynasty = q.dynasty;
        for (const s of mine) if (dist(s, seat) < dist(s, cap) * 0.9) setOwner(s, q);
        setOwner(seat, q);
        ev('split', { p: p.id, q: q.id, seat: seat.id, bName: c.bName, a: c.a });
        p.truce.set(q.id, year + 20); q.truce.set(p.id, year + 20);
      } else {
        ev('crisis-end', { p: p.id, a: c.a, bName: c.bName, how: yr.pick(['beheaded', 'blinded and sent to a monastery', 'fled over the sea', 'drowned in a marsh', 'reconciled', 'starved in a tower']) });
      }
    }

    function stepGrowth(s) {
      const p = polities[s.owner];
      const tech = 0.55 + 2.5 * Math.pow(year / Y, 1.4);
      let crowd = 0;
      for (const id of s.near) if (alive(settlements[id])) crowd++;
      let cap = 950 * (0.25 + T.suit[s.cell]) * tech / (1 + 0.12 * crowd);
      if (p && p.capital === s.id) cap *= 1.5 + 0.4 * FORM_LEVEL[p.form];
      if (s.port) cap *= 1.25;
      if (p && p.war) cap *= 0.97;
      s.cap = cap;
      s.pop += s.pop * 0.024 * (1 - s.pop / cap) + s.pop * yr.range(-0.007, 0.007);
      if (s.pop > s.peak) s.peak = s.pop;
      if (!s.roadDone && s.pop > 1100 && p) {
        s.roadDone = true;
        let best = null, bd = 1e9;
        for (const o of owned(p)) {
          if (o === s || o.pop < s.pop * 0.7) continue;
          const d = dist(o, s);
          if (d < bd && d < 34 && !crossesWater(o, s)) { bd = d; best = o; }
        }
        if (best && !roads.some((rd) => (rd.a === s.id && rd.b === best.id) || (rd.b === s.id && rd.a === best.id))) roads.push({ a: s.id, b: best.id, year });
      }
    }

    function refound(o, c, p, from) {
      o.ruined = null;
      o.spans[o.spans.length - 1].to = year;
      o.culture = c.id; o.owner = p.id; o.pop = 140 + from.pop * 0.06; o.roadDone = false;
      from.pop -= o.pop;
      const old = currentName(o);
      let nm;
      if (old.lang === c.lang && yr.chance(0.5)) nm = old;
      else nm = nameSettlement(c, o.cell, year, yr, { capital: settlements[p.capital], founder: ruler(p) ? ruler(p).name : null });
      if (nm !== old) o.names.push({ year, name: nm, why: 'refounded', by: p.id });
      ev('refound', { s: o.id, from: from.id, c: c.id, p: p.id, old, nw: nm, idle: year - o.spans[o.spans.length - 1].from });
    }

    function stepColonise(s) {
      const c = cultures[s.culture];
      if (s.pop < 420 || s.pop < 0.45 * (s.cap || 1e9)) return;
      if (!yr.chance(0.012 * c.temper.expand)) return;
      // an empty ruin with good fields is the easiest place to start again
      if (yr.chance(0.45)) {
        for (const o of settlements) {
          if (alive(o) || year - o.ruined < 25) continue;
          const d = dist(o, s);
          if (d < 6 || d > 28 || (crossesWater(s, o) && !(c.temper.sea > 0.45 && o.port && s.port))) continue;
          if (settlements.some((q) => q !== o && alive(q) && dist(q, o) < 5.5)) continue;
          refound(o, c, polities[s.owner], s);
          return;
        }
      }
      if (settlements.length >= maxSettlements) return;
      const cell = goodSite(s, c, yr, 6.5, 25);
      if (cell < 0) return;
      const p = polities[s.owner];
      const moved = 110 + s.pop * 0.07;
      s.pop -= moved;
      const capS = settlements[p.capital];
      const far = Math.hypot((cell % W) - capS.x, ((cell / W) | 0) - capS.y) > reach(p);
      let owner = p.id;
      const ns = found(cell, c, owner, year, moved, s, yr);
      if (far && yr.chance(0.55)) {
        const q = makePolity(c, ns, year, 'tribe', yr, { parent: p.id });
        ns.owner = q.id;
        ev('polity', { p: q.id, s: ns.id, from: s.id, q: p.id });
      }
      ev('found', { s: ns.id, from: s.id, c: c.id, p: ns.owner });
    }

    function stepWar(p) {
      if (p.war || p.ended !== null || year - p.founded < 8) return;
      const lvl = FORM_LEVEL[p.form];
      if (!yr.chance(0.024 * p.aggr * (0.6 + 0.4 * lvl))) return;
      const nb = neighbours(p);
      const sp = strength(p);
      const opts = [];
      for (const [qid] of nb) {
        const q = polities[qid];
        if (q.war) continue;
        if ((p.truce.get(qid) || -1) > year) continue;
        const sq = strength(q);
        const g = p.grudge.get(qid) || 0;
        if (sp < sq * 0.45 && !g) continue;
        const w = Math.pow(sp / Math.max(sq, 1), 0.7) * (1 + g) * (q.culture === p.culture ? 0.45 : 1.7);
        opts.push([q, w]);
      }
      if (!opts.length) return;
      const q = yr.weighted(opts);
      const g = p.grudge.get(q.id) || 0;
      const cause = g ? 'revenge' : yr.weighted([['border', 3], ['tribute', 1.5], ['insult', 1.2], ['faith', cultureOf(p).temper.piety > 0.6 ? 1.5 : 0.3], ['plunder', 1.5], ['marriage', 0.8], ['river', 1], ['salt', 0.6], ['unknown', 1]]);
      const w = { id: wars.length, a: p.id, b: q.id, start: year, end: null, score: 0, battles: [], cause, captured: [], result: null };
      wars.push(w);
      p.war = w; q.war = w;
      const RA = ruler(p), RB = ruler(q);
      if (RA) RA.deeds.wars++;
      if (RB) RB.deeds.wars++;
      ev('war', { p: p.id, q: q.id, war: w.id, cause });
    }

    function stepWarProgress(w) {
      const A = polities[w.a], Bp = polities[w.b];
      if (A.ended !== null || Bp.ended !== null) { endWar(w, A.ended === null ? A.id : Bp.id, true); return; }
      if (yr.chance(0.62)) {
        const sa = strength(A), sb = strength(Bp);
        const pa = Math.pow(sa, 1.15) / (Math.pow(sa, 1.15) + Math.pow(sb, 1.15)) - 0.05;
        const aWins = yr.chance(pa);
        const win = aWins ? A : Bp, lose = aWins ? Bp : A;
        // the fighting happens on the loser's side of the line, at the place nearest the enemy
        const ls = owned(lose), wsS = owned(win);
        if (!ls.length || !wsS.length) { endWar(w, win.id); return; }
        let at = null, bd = 1e9;
        for (const a of ls) for (const b of wsS) { const d = dist(a, b); if (d < bd) { bd = d; at = a; } }
        w.score += aWins ? 1 : -1;
        const b = { year, at: at.id, winner: win.id, loser: lose.id, war: w.id, x: at.x, y: at.y };
        if (bd > 4) { const near = wsS.reduce((m, o) => (dist(o, at) < dist(m, at) ? o : m), wsS[0]); b.x = at.x + (near.x - at.x) * 0.3; b.y = at.y + (near.y - at.y) * 0.3; }
        w.battles.push(b);
        const e = ev('battle', { p: win.id, q: lose.id, s: at.id, war: w.id });
        if (at.id !== lose.capital || yr.chance(0.5)) {
          if (yr.chance(0.5)) {
            e.capture = true;
            capture(at, win, lose, yr, w);
            if (yr.chance(0.25)) { at.pop *= 0.6; e.sack = true; }
            if (yr.chance(0.035) && at.id !== lose.capital) { e.raze = true; ruin(at, 'razed'); }
            capitalCheck(lose, yr);
          }
        }
        at.pop *= 0.94;
        const RL = ruler(lose);
        if (RL && RL.to === null && yr.chance(0.045)) { e.killed = RL.id; die(lose, RL, 'in battle'); }
        if (!owned(lose).length) {
          ev('fall', { p: lose.id, q: win.id, s: at.id });
          endPolity(lose, 'conquered', win.id);
          return;
        }
      }
      const len = year - w.start;
      if (Math.abs(w.score) >= 3 + yr.int(0, 2) || len > yr.int(6, 14) || yr.chance(0.07)) {
        const winner = w.score > 0 ? A.id : w.score < 0 ? Bp.id : null;
        const loser = winner === null ? null : winner === A.id ? Bp : A;
        if (loser && owned(loser).length <= 2 && settlements[loser.capital] && settlements[loser.capital].owner !== loser.id) {
          for (const s of owned(loser)) setOwner(s, polities[winner]);
          ev('fall', { p: loser.id, q: winner, s: loser.capital });
          endPolity(loser, 'annexed', winner);
          return;
        }
        endWar(w, winner);
      }
    }

    function stepRevolt(p) {
      if (p.ended !== null) return;
      const cap = settlements[p.capital];
      const rch = reach(p);
      for (const s of owned(p)) {
        if (s.id === p.capital || s.pop < 1300) continue;
        const far = dist(s, cap) > rch * 0.9;
        const foreign = s.culture !== p.culture;
        let pr = 0.0006 + (far ? 0.0022 : 0) + (foreign ? 0.0022 : 0) + (p.crisis ? 0.008 : 0) + (p.war && ((p.war.a === p.id ? 1 : -1) * p.war.score) < 0 ? 0.003 : 0);
        if (!yr.chance(pr)) continue;
        const c = cultures[s.culture];
        const q = makePolity(c, s, year, s.pop > 2500 ? 'kingdom' : 'tribe', yr, { parent: p.id });
        setOwner(s, q);
        for (const o of owned(p)) if (o.id !== p.capital && dist(o, s) < 14 && (o.culture === s.culture || dist(o, cap) > rch * 0.8) && yr.chance(0.6)) setOwner(o, q);
        ev('revolt', { p: q.id, q: p.id, s: s.id });
        if (yr.chance(0.5) && !p.war) {
          const w = { id: wars.length, a: p.id, b: q.id, start: year, end: null, score: 0, battles: [], cause: 'rebellion', captured: [], result: null };
          wars.push(w); p.war = w; q.war = w;
          ev('war', { p: p.id, q: q.id, war: w.id, cause: 'rebellion' });
        }
        return;
      }
    }

    function stepUnion(p) {
      if (p.ended !== null || p.war || p.form === 'tribe' || !yr.chance(0.0035)) return;
      for (const [qid] of neighbours(p)) {
        const q = polities[qid];
        if (q.culture !== p.culture || q.war || q.form === 'tribe' || q.form === 'empire') continue;
        if (strength(q) > strength(p)) continue;
        for (const s of owned(q)) setOwner(s, p);
        ev('union', { p: p.id, q: q.id, ra: ruler(p) ? ruler(p).id : null, rb: ruler(q) ? ruler(q).id : null });
        endPolity(q, 'union', p.id);
        return;
      }
    }

    function stepForm(p) {
      if (p.ended !== null) return;
      const mine = owned(p);
      if (!mine.length) { endPolity(p, 'vanished'); return; }
      const pop = totalPop(p);
      const cults = new Set(mine.map((s) => s.culture));
      let nf = p.form;
      if (p.form === 'tribe' && mine.length >= 3 && pop >= 2600) nf = 'kingdom';
      else if (p.form === 'tribe' && mine.length <= 2 && settlements[p.capital].pop > 3500 && cultureOf(p).temper.trade > 0.6) nf = 'city';
      else if (p.form === 'kingdom' && mine.length >= 9 && pop >= 40000 && cults.size >= 2) nf = 'empire';
      else if (p.form === 'empire' && mine.length < 5) nf = 'kingdom';
      else if (p.form === 'city' && mine.length >= 5) nf = 'kingdom';
      if (nf !== p.form) {
        const was = p.form;
        p.form = nf;
        p.forms.push({ year, form: nf });
        if (nf === 'kingdom' && was === 'tribe') {
          if (p.name.kind === 'people' || p.name.ph.filter((x) => x !== ' ' && x !== '-').length < 4 || yr.chance(0.4)) {
            p.name = realmName(cultureOf(p), settlements[p.capital], year, yr);
            p.names.push({ year, name: p.name });
          }
          ev('crowned', { p: p.id, r: ruler(p) ? ruler(p).id : null });
        }
        else if (nf === 'empire') ev('empire', { p: p.id, r: ruler(p) ? ruler(p).id : null });
        else if (nf === 'city') ev('republic', { p: p.id, s: p.capital });
        else if (was === 'empire') ev('decline', { p: p.id });
      }
    }

    function stepCulture(s) {
      const p = polities[s.owner];
      if (!p || s.culture === p.culture) return;
      const cap = settlements[p.capital];
      const pr = 0.003 + (dist(s, cap) < 22 ? 0.004 : 0);
      if (!yr.chance(pr)) return;
      const old = currentName(s);
      const oldC = s.culture;
      s.culture = p.culture;
      const c = cultures[p.culture];
      if (yr.chance(0.42)) {
        const nm = nameSettlement(c, s.cell, year, yr, { capital: cap, founder: ruler(p) ? ruler(p).name : null });
        s.names.push({ year, name: nm, why: 'renamed', by: p.id });
        ev('rename', { s: s.id, old, nw: nm, c: c.id, p: p.id, why: 'assimilation', from: oldC });
      } else {
        const nm = Lg.adapt(old, c.lang, year);
        if (nm.text(year) !== old.text(year)) {
          s.names.push({ year, name: nm, why: 'borrowed', by: p.id });
          ev('adapt', { s: s.id, old, nw: nm, c: c.id, from: oldC });
        }
      }
    }

    function stepDisasters() {
      const live = liveSettlements();
      if (!live.length) return;
      // pestilence
      if (year > 120 && yr.chance(1 / 140)) {
        const src = yr.weighted(live.map((s) => [s, s.pop * (s.port ? 2 : 1)]));
        const mort = yr.range(0.14, 0.45);
        const hit = [src.id];
        const queue = [src];
        const seen = new Set([src.id]);
        while (queue.length) {
          const a = queue.shift();
          for (const b of live) {
            if (seen.has(b.id)) continue;
            const d = dist(a, b);
            const pr = d < 22 ? 0.75 : d < 38 ? 0.4 : (a.port && b.port && d < 70) ? 0.3 : 0;
            if (pr && yr.chance(pr)) { seen.add(b.id); hit.push(b.id); queue.push(b); }
          }
        }
        for (const id of hit) {
          const s = settlements[id];
          s.pop *= 1 - mort * yr.range(0.6, 1.2);
          s.plagueUntil = year + 2;
          const p = polities[s.owner];
          if (p && p.capital === id && ruler(p)) ruler(p).deeds.plague++;
        }
        const pname = yr.pick(['the Grey Death', 'the Sweating Sickness', 'the Red Cough', 'the Long Fever', 'the Black Tide', 'the Weeping Pox', 'the Silent Fever', 'the Sleeping Sickness', 'the Burning Rash', 'the Blue Lips', 'the Shaking']);
        plagues.push({ year, src: src.id, hit, mort, pname });
        ev('plague', { s: src.id, list: hit, mort, pname });
      }
      if (yr.chance(1 / 95)) {
        const c = yr.pick(live);
        const hit = live.filter((s) => dist(s, c) < 40 && T.suit[s.cell] < 1.1);
        const mort = yr.range(0.06, 0.18);
        for (const s of hit) s.pop *= 1 - mort;
        if (hit.length) ev('famine', { s: c.id, list: hit.map((s) => s.id), mort });
      }
      if (yr.chance(1 / 65)) {
        const riv = live.filter((s) => s.river >= 0 && T.rivers[s.river].flow > T.riverThreshold * 3);
        if (riv.length) { const s = yr.pick(riv); s.pop *= 0.9; ev('flood', { s: s.id, river: s.river }); }
      }
      if (yr.chance(1 / 210)) {
        const mtn = live.filter((s) => { for (const f of T.features.ranges) if (Math.hypot(s.x - f.x, s.y - f.y) < f.length / 2 + 14) return true; return false; });
        if (mtn.length) {
          const c = yr.pick(mtn);
          const hit = live.filter((s) => dist(s, c) < 22);
          for (const s of hit) s.pop *= 0.92;
          const walls = hit.filter((s) => s.works.some((w) => w.kind === 'walls'));
          ev('quake', { s: c.id, list: hit.map((s) => s.id), walls: walls.map((s) => s.id) });
        }
      }
      if (yr.chance(1 / 55)) {
        const big = live.filter((s) => s.pop > 2500);
        if (big.length) {
          const s = yr.pick(big);
          s.pop *= 0.95;
          const lib = s.works.find((w) => w.kind === 'library' && !w.lost);
          if (lib && yr.chance(0.5)) lib.lost = year;
          ev('fire', { s: s.id, library: lib && lib.lost === year });
        }
      }
      if (yr.chance(1 / 330)) { for (const s of live) s.pop *= 0.93; ev('winter', {}); }
      if (yr.chance(1 / 110)) ev('comet', { s: yr.pick(live).id });
    }

    const WORKS = ['temple', 'walls', 'bridge', 'harbour', 'library', 'palace', 'tower', 'aqueduct'];
    function stepWorks(p) {
      if (p.ended !== null) return;
      const c = cultureOf(p);
      for (const s of owned(p)) {
        if (s.pop < 3200) continue;
        if (!yr.chance(s.id === p.capital ? 0.004 : 0.0015)) continue;
        const opts = [['temple', 1 + 2 * c.temper.piety], ['walls', p.war ? 3 : 0.8 * p.aggr], ['library', 0.4 + 1.5 * c.temper.trade], ['tower', 0.5], ['aqueduct', T.biome[s.cell] === BI.STEPPE || T.biome[s.cell] === BI.DESERT ? 1.5 : 0.2]];
        if (s.river >= 0) opts.push(['bridge', 1.5]);
        if (s.port) opts.push(['harbour', 1.5]);
        if (s.id === p.capital && p.form !== 'tribe') opts.push(['palace', 1.2]);
        const kind = yr.weighted(opts.filter((o) => !s.works.some((w) => w.kind === o[0] && !w.lost)));
        if (!kind) continue;
        const god = kind === 'temple' ? yr.int(0, c.gods.length - 1) : null;
        const w = { kind, year, god, culture: c.id };
        s.works.push(w);
        const R = ruler(p);
        if (R) R.deeds.built++;
        ev('work', { s: s.id, p: p.id, r: R ? R.id : null, kind, god, c: c.id });
        return;
      }
    }

    function invade() {
      // the side of the map with the most open sea
      const sides = { w: 0, e: 0, n: 0, s: 0 };
      for (let i = 0; i < N; i++) {
        if (!T.ocean[i]) continue;
        const x = i % W, y = (i / W) | 0;
        if (x < W * 0.2) sides.w++; if (x > W * 0.8) sides.e++;
        if (y < H * 0.2) sides.n++; if (y > H * 0.8) sides.s++;
      }
      const side = Object.keys(sides).sort((a, b) => sides[b] - sides[a])[0];
      const edgeD = (s) => side === 'w' ? s.x : side === 'e' ? W - s.x : side === 'n' ? s.y : H - s.y;
      const coastTowns = liveSettlements().filter((s) => s.port).sort((a, b) => (edgeD(a) - edgeD(b)) - (b.pop - a.pop) * 0.002);
      const c = makeCulture(rng, 'sea', year);
      c.side = side;
      let landing;
      const r = rng.fork('invasion');
      if (coastTowns.length) {
        landing = coastTowns[0];
        const prevOwner = polities[landing.owner];
        const p = makePolity(c, landing, year, 'kingdom', r, {});
        const prev = currentName(landing);
        setOwner(landing, p);
        landing.culture = c.id;
        if (r.chance(0.55)) {
          const nm = nameSettlement(c, landing.cell, year, r, { founder: ruler(p).name });
          landing.names.push({ year, name: nm, why: 'conquest', by: p.id });
          ev('rename', { s: landing.id, old: prev, nw: nm, c: c.id, p: p.id, why: 'conquest' });
        }
        ev('invasion', { c: c.id, p: p.id, s: landing.id, q: prevOwner ? prevOwner.id : null, side });
        if (prevOwner) capitalCheck(prevOwner, r);
        // they build a second hold nearby
        const cell = goodSite(landing, c, r, 6, 16);
        if (cell >= 0) {
          const ns = found(cell, c, p.id, year, 600, landing, r);
          ev('found', { s: ns.id, from: landing.id, c: c.id, p: p.id });
        }
        if (prevOwner && prevOwner.ended === null && !prevOwner.war) {
          if (!owned(prevOwner).length) endPolity(prevOwner, 'conquered', p.id);
          else {
            const w = { id: wars.length, a: p.id, b: prevOwner.id, start: year, end: null, score: 1, battles: [], cause: 'invasion', captured: [landing.id], result: null };
            wars.push(w); p.war = w; prevOwner.war = w;
          }
        }
        landing.pop = Math.max(landing.pop * 0.7, 800);
      }
      return c;
    }

    /* ---------- run ---------- */
    let nextArrival = 0;
    for (year = 0; year <= Y; year++) {
      while (nextArrival < arrivals.length && arrivals[nextArrival].year === year) {
        const a = arrivals[nextArrival++];
        const c = makeCulture(rng, 'native', year);
        c.homeland = a.cell;
        const r = c.rng.fork('first');
        // a placeholder polity is needed for naming; the first town names itself
        const s0 = {
          id: settlements.length, cell: a.cell, x: a.cell % W, y: (a.cell / W) | 0, culture: c.id, owner: polities.length,
          founded: year, ruined: null, ruinCause: null, pop: 500, peak: 500, parent: null, port: T.coastal[a.cell] === 1, river: nearRiver(a.cell),
          names: [], works: [], near: [], roadDone: false, spans: [],
          popY: new Float32Array(Y + 1), ownerY: new Int16Array(Y + 1).fill(-1), cultY: new Int8Array(Y + 1).fill(-1),
        };
        s0.names.push({ year, name: nameSettlement(c, a.cell, year, r, {}), why: 'founded' });
        for (const o of settlements) if (dist(o, s0) < 13) { o.near.push(s0.id); s0.near.push(o.id); }
        settlements.push(s0);
        const p = makePolity(c, s0, year, 'tribe', r, { name: c.endonym });
        s0.owner = p.id;
        ev('arrive', { c: c.id, s: s0.id, p: p.id });
      }
      if (invasion && year === invasion.year) invasion.culture = invade();

      const live = liveSettlements();
      const pols = polities.filter((p) => p.ended === null);
      yr.shuffle(pols);
      for (const p of pols) if (p.ended === null) stepRulers(p);
      for (const p of pols) if (p.ended === null && p.crisis && p.crisis.until <= year) resolveCrisis(p);
      for (const s of live) stepGrowth(s);
      for (const s of live) if (alive(s)) stepColonise(s);
      for (const p of pols) if (p.ended === null) stepWar(p);
      for (const w of wars) if (w.end === null) stepWarProgress(w);
      for (const p of pols) if (p.ended === null) stepRevolt(p);
      for (const p of pols) if (p.ended === null) stepUnion(p);
      stepDisasters();
      for (const p of pols) if (p.ended === null) stepWorks(p);
      for (const s of liveSettlements()) stepCulture(s);
      for (const s of liveSettlements()) if (s.pop < 70) ruin(s, 'abandoned');
      for (const p of polities) if (p.ended === null) { capitalCheck(p, yr); stepForm(p); }
      // sound changes are noticed, eventually, by someone
      for (const c of cultures) for (const ch of c.lang.changes) if (ch.year === year) ev('sound', { c: c.id, change: ch });
      // a lettered people teaches its letters to an unlettered one that lives among it
      for (const c of cultures) {
        if (c.script || year - c.arrived < 40 || !yr.chance(0.02)) continue;
        const mine = liveSettlements().filter((s) => s.culture === c.id);
        let teacher = null, bd = 1e9;
        for (const s of mine) for (const o of liveSettlements()) {
          if (o.culture === c.id || !cultures[o.culture].script) continue;
          const d = dist(s, o);
          if (d < bd) { bd = d; teacher = cultures[o.culture]; }
        }
        if (teacher && bd < 40) {
          c.script = teacher.script; c.scriptFrom = teacher.id; c.scriptYear = year;
          ev('letters', { c: c.id, from: teacher.id });
        }
      }
      // record the year
      for (const s of settlements) {
        if (!alive(s)) continue;
        s.popY[year] = s.pop;
        s.ownerY[year] = s.owner;
        s.cultY[year] = s.culture;
      }
      for (const p of polities) if (p.ended === null && !owned(p).length) endPolity(p, 'vanished');
    }
    year = Y;
    for (const p of polities) {
      const R = ruler(p);
      if (p.ended === null && R && R.to === null && !R.epithet && R.from < Y - 20 && yr.chance(0.3)) R.epithet = null;
    }

    nameFeatures(world, rng.fork('features'));
    colourPolities(world);
    world.plagues = plagues;
    world.invasion = invasion;
    world.stats = {
      settlements: settlements.length, polities: polities.length, wars: wars.length, events: events.length,
      cultures: cultures.length, renames: events.filter((e) => e.type === 'rename').length, plagues: plagues.length,
    };
  }

  /* ---------- rivers, seas and mountains take the name the first people near them gave ---------- */
  function nameFeatures(world, rng) {
    const T = world.terrain, W = world.W;
    const S = world.settlements;
    const Lg = P.Lang;
    const used = new Set();
    function namer(x, y, radius) {
      let best = null;
      for (const s of S) {
        const d = Math.hypot(s.x - x, s.y - y);
        if (d > radius) continue;
        if (!best || s.founded < best.founded) best = s;
      }
      if (!best) {
        let bd = 1e9;
        for (const s of S) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
      }
      return best;
    }
    function make(c, yr, heads, mods, r, kind) {
      for (let t = 0; t < 8; t++) {
        let n;
        const pat = r.weighted([['plain', 1], ['mod', 2.2], ['opaque', 1.6]]);
        const head = r.pick(heads);
        if (pat === 'plain') n = Lg.compose(c.lang, [head], yr, { gloss: 'the ' + head });
        else if (pat === 'mod') { const m = r.pick(mods); n = Lg.compose(c.lang, [m, head], yr, { gloss: m + ' ' + head }); }
        else n = new Lg.Name(c.lang, c.lang.coin(r, yr, r.int(1, 2)), yr, { gloss: null });
        n.kind = kind;
        const txt = n.text(yr);
        if (used.has(txt) || n.ph.filter((p) => p !== ' ' && p !== '-').length < 3) continue;
        used.add(txt);
        return n;
      }
      return new Lg.Name(c.lang, c.lang.coin(r, yr, 2), yr, { gloss: null, kind });
    }
    const F = T.features;
    for (const f of F.seas) {
      const s = namer(f.x, f.y, 70);
      if (!s) continue;
      const c = world.cultures[S[s.id].cultY.find((v) => v >= 0) ?? s.culture];
      f.culture = c.id; f.year = s.founded + 10;
      f.name = make(c, f.year, ['sea'], ['grey', 'deep', 'still', 'cold', 'warm', 'bright', 'dark', 'west', 'east', 'north', 'south', 'broad', 'green', 'salt', 'wind', 'serpent', 'mist', 'amber'], rng.fork('sea' + f.x), 'sea');
    }
    for (const f of F.lakes) {
      const s = namer(f.x, f.y, 30);
      if (!s) continue;
      const c = world.cultures[s.cultY.find((v) => v >= 0) ?? s.culture];
      f.culture = c.id; f.year = s.founded + 5;
      f.name = make(c, f.year, ['lake'], ['still', 'deep', 'black', 'white', 'reed', 'swan', 'mist', 'cold', 'long', 'hidden'], rng.fork('lake' + f.x), 'lake');
    }
    for (const f of F.ranges) {
      const s = namer(f.x, f.y, 50);
      if (!s) continue;
      const c = world.cultures[s.cultY.find((v) => v >= 0) ?? s.culture];
      f.culture = c.id; f.year = s.founded + 15;
      f.name = make(c, f.year, ['mount', 'rock', 'hill'], ['white', 'high', 'black', 'grey', 'iron', 'snow', 'cloud', 'ice', 'wolf', 'eagle', 'broken', 'cold', 'far'], rng.fork('range' + f.x), 'range');
    }
    for (const f of F.rivers) {
      const rv = T.rivers[f.river];
      const mouth = rv.cells[rv.cells.length - 1];
      const s = namer(mouth % W, (mouth / W) | 0, 40);
      if (!s) continue;
      const c = world.cultures[s.cultY.find((v) => v >= 0) ?? s.culture];
      f.culture = c.id; f.year = s.founded;
      f.name = make(c, f.year, ['river', 'water'], ['white', 'black', 'red', 'green', 'grey', 'still', 'long', 'broad', 'deep', 'cold', 'bright', 'willow', 'salmon', 'swan', 'reed', 'alder'].filter((m) => P.Lang.ALL_CONCEPTS.includes(m)), rng.fork('river' + f.river), 'river');
      rv.name = f.name;
    }
    for (const list of [F.woods, F.wastes, F.fens]) for (const f of list) {
      const s = namer(f.x, f.y, 50);
      if (!s) continue;
      const c = world.cultures[s.cultY.find((v) => v >= 0) ?? s.culture];
      f.culture = c.id; f.year = s.founded + 20;
      const heads = f.kind === 'wood' ? ['wood'] : f.kind === 'waste' ? ['waste', 'sand'] : ['marsh'];
      f.name = make(c, f.year, heads, ['dark', 'old', 'deep', 'still', 'grey', 'red', 'hidden', 'long', 'wolf', 'bear', 'mist', 'black'], rng.fork(f.kind + f.x), f.kind);
    }
  }

  /* neighbouring realms get different pigments, and a realm keeps its colour all its life */
  function colourPolities(world) {
    const S = world.settlements, PS = world.polities, Y = world.years;
    const near = PS.map(() => new Map());
    for (let y = 0; y <= Y; y += 10) {
      const live = S.filter((s) => s.ownerY[y] >= 0);
      for (const a of live) for (const b of live) {
        const pa = a.ownerY[y], pb = b.ownerY[y];
        if (pa === pb || pa < 0 || pb < 0) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 45) { near[pa].set(pb, 1); }
      }
    }
    const order = PS.slice().sort((a, b) => a.founded - b.founded);
    const use = new Array(PIGMENTS.length).fill(0);
    for (const p of order) {
      const taken = new Set();
      for (const q of near[p.id].keys()) if (PS[q].color !== null) taken.add(PS[q].color);
      let best = -1;
      for (let k = 0; k < PIGMENTS.length; k++) if (!taken.has(k) && (best < 0 || use[k] < use[best])) best = k;
      if (best < 0) best = p.id % PIGMENTS.length;
      p.color = best; use[best]++;
      p.pigment = PIGMENTS[best];
    }
  }

  P.History = { simulate, PIGMENTS };
})();

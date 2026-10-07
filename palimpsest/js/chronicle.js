/* Palimpsest / chronicle
   The events are facts; the chronicle is a person. It is kept in one house of
   scribes after another, by hands that age and die, that favour their own lords,
   that hear of distant things late and half-wrong, that see omens after the fact,
   and that sometimes lose whole quires to fire and mice. */
'use strict';
(function () {
  const P = window.P;
  const U = P.util;

  const ORD = (n) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const ROMAN = (n) => {
    const t = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
    let o = '';
    for (const [r, v] of t) while (n >= v) { o += r; n -= v; }
    return o;
  };
  const NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const num = (n) => (n < NUMW.length ? NUMW[n] : String(n));
  const cap1 = (s) => s.replace(/^(\s*(?:<[^>]+>)*)([a-z])/, (m, a, b) => a + b.toUpperCase());
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function list(items) {
    if (items.length <= 1) return items.join('');
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function write(world) {
    const rng = world.rng.fork('chronicle');
    const W = world.W, T = world.terrain;
    const S = world.settlements, PS = world.polities, C = world.cultures, RS = world.rulers;
    const Y = world.years;
    const entries = [];
    const margins = [];

    /* ---------- naming helpers that know what year it is ---------- */
    const nameAt = world.nameAt;
    const sN = (id, y) => {
      const s = S[id];
      const n = nameAt(s, y);
      return `<span class="nm" data-s="${id}">${esc(n.text(y))}</span>`;
    };
    const polityName = (p, y) => {
      let n = p.names[0].name;
      for (const e of p.names) if (e.year <= y) n = e.name;
      return n;
    };
    const formAt = (p, y) => { let f = p.forms[0].form; for (const e of p.forms) if (e.year <= y) f = e.form; return f; };
    const pN = (id, y, mode) => {
      const p = PS[id];
      const c = C[p.culture];
      const nm = esc(polityName(p, y).text(y));
      const f = formAt(p, y);
      const span = (t) => `<span class="pn" data-p="${id}">${t}</span>`;
      if (f === 'tribe') {
        const sameCult = PS.filter((q) => q.culture === p.culture && q.founded <= y && (q.ended === null || q.ended > y)).length;
        return span(sameCult > 1 && mode !== 'people' ? `the ${esc(c.plural)} of ${esc(nameAt(S[p.capitals[0].s], y).text(y))}` : `the ${esc(c.plural)}`);
      }
      if (mode === 'short') return span(nm);
      if (f === 'empire') return span(rng.chance(0.5) ? `the ${esc(c.adj)} Empire` : `the Empire of ${nm}`);
      if (f === 'city') return span(`the City of ${nm}`);
      return span(`the Kingdom of ${nm}`);
    };
    const cP = (id) => `the ${esc(C[id].plural)}`;
    const cA = (id) => esc(C[id].adj);
    const title = (R, y) => {
      const p = PS[R.polity];
      const f = formAt(p, y);
      if (f === 'tribe') return R.female ? 'chieftain' : 'chief';
      if (f === 'empire') return R.female ? 'empress' : 'emperor';
      if (f === 'city') return 'steward';
      return R.female ? 'queen' : 'king';
    };
    const rName = (R, y) => esc(R.name.text(y)) + (R.ordinal > 1 ? ' ' + ROMAN(R.ordinal) : '');
    const rN = (id, y, opts) => {
      const R = RS[id];
      opts = opts || {};
      const nm = `<span class="rn" data-r="${id}">${rName(R, y)}</span>`;
      if (opts.bare) return nm;
      const t = title(R, y);
      if (t === 'chief' || t === 'chieftain') return `${nm}, ${t} of ${pN(R.polity, y, 'people')}`;
      if (t === 'steward') return `${nm}, steward of ${pN(R.polity, y)}`;
      return `${t[0].toUpperCase() + t.slice(1)} ${nm}`;
    };
    const rNs = (id, y) => { const t = rN(id, y); return /, (chief|chieftain|steward) of /.test(t) ? t + ',' : t; };
    const he = (R) => (R.female ? 'she' : 'he');
    const his = (R) => (R.female ? 'her' : 'his');
    const him = (R) => (R.female ? 'her' : 'him');
    const fname = (f, y) => f && f.name ? `<span class="fn">${esc(f.name.text(y))}</span>` : null;
    const riverN = (rid, y) => {
      const rv = T.rivers[rid];
      if (!rv) return 'the river';
      let r = rv;
      let guard = 0;
      while (!r.name && r.parent >= 0 && guard++ < 30) r = T.rivers[r.parent];
      return r.name ? `the <span class="fn">${esc(r.name.text(y))}</span>` : 'the river';
    };
    const seaNear = (s, y) => {
      let best = null, bd = 1e9;
      for (const f of T.features.seas) { const d = Math.hypot(f.x - s.x, f.y - s.y); if (d < bd && f.name) { bd = d; best = f; } }
      return best ? `the <span class="fn">${esc(best.name.text(y))}</span>` : 'the sea';
    };
    const godN = (cid, k, y) => {
      const g = C[cid].gods[k || 0];
      return `<span class="gn">${esc(g.name.text(y))}</span>`;
    };
    const godDom = (cid, k) => C[cid].gods[k || 0].domain;
    const gloss = (n) => n.gloss ? `‘${esc(n.gloss)}’` : null;

    /* ---------- the house of scribes and the hands that keep it ---------- */
    const literate = (cid) => !!C[cid].script;
    function pickHouse(y, avoid) {
      let best = null, bs = -1;
      for (const s of S) {
        if (s.founded > y || (s.ruined !== null && s.ruined <= y + 15) || s.id === avoid) continue;
        const cu = s.cultY[y] >= 0 ? s.cultY[y] : s.culture;
        if (!literate(cu)) continue;
        const sc = (s.popY[y] || 300) * (1 + 0.3 * (s.works.filter((w) => w.year <= y).length)) * (0.7 + 0.6 * rng.next());
        if (sc > bs) { bs = sc; best = s; }
      }
      return best;
    }
    const hands = [];
    const first = world.events.find((e) => e.type === 'arrive' && literate(e.c)) || world.events.find((e) => e.type === 'arrive');
    let houseS = S[first.s];
    let y0 = Math.max(8, first.y + rng.int(10, 40));
    const TITLES = ['brother', 'sister', 'the scribe', 'the priest', 'the priestess', 'the keeper of the book', 'the old scribe', 'the lector'];
    let fontIx = 0;
    while (y0 < Y) {
      const cu = houseS.cultY[y0] >= 0 ? houseS.cultY[y0] : houseS.culture;
      const c = C[literate(cu) ? cu : (C.find((x) => x.script) || C[0]).id];
      const len = rng.int(36, 78);
      let to = Math.min(Y, y0 + len);
      let endHow = 'died';
      if (houseS.ruined !== null && houseS.ruined < to) { to = houseS.ruined; endHow = 'ruin'; }
      else {
        for (let y = y0 + 1; y < to; y++) {
          if (houseS.ownerY[y] !== houseS.ownerY[y0] && houseS.ownerY[y] >= 0 && PS[houseS.ownerY[y]].culture !== cu) { to = y; endHow = 'conquest'; break; }
        }
      }
      const hr = rng.fork('hand' + hands.length);
      const tt = hr.pick(TITLES);
      const female = tt === 'sister' || tt === 'the priestess' ? true : tt === 'brother' || tt === 'the priest' ? false : hr.chance(0.4);
      hands.push({
        id: hands.length, name: P.Lang.personName(c.lang, hr, y0), title: tt, female, culture: c.id, script: c.script ? c.id : (c.scriptFrom ?? c.id),
        house: houseS.id, from: y0, to, endHow, font: fontIx % 3, ink: ['#2b1d14', '#3a2616', '#1f1a17', '#40271a', '#2a2420'][hands.length % 5],
      });
      fontIx += hr.int(1, 2);
      if (to >= Y) break;
      const nh = endHow === 'died' && rng.chance(0.75) ? houseS : pickHouse(to, endHow === 'died' ? -1 : houseS.id);
      if (!nh) break;
      hands[hands.length - 1].next = nh.id;
      houseS = nh;
      y0 = to + (endHow === 'died' ? rng.int(0, 3) : rng.int(2, 12));
    }
    const handAt = (y) => { for (const h of hands) if (y >= h.from && y <= h.to) return h; return null; };
    const ourPolity = (y) => { const h = handAt(y); if (!h) return -1; return S[h.house].ownerY[y]; };
    const houseAt = (y) => { const h = handAt(y); return h ? S[h.house] : null; };

    /* lost leaves */
    const gaps = [];
    const ng = rng.int(1, 3);
    for (let k = 0; k < ng; k++) {
      const a = rng.int(Math.round(Y * 0.15), Math.round(Y * 0.9));
      const b = a + rng.int(18, 55);
      if (gaps.some((g) => !(b < g.a - 30 || a > g.b + 30))) continue;
      gaps.push({ a, b, why: rng.pick(['cut out', 'gnawed by mice', 'burned along the edge', 'stained past reading', 'torn out', 'scraped and written over']) });
    }
    const inGap = (y) => gaps.some((g) => y >= g.a && y <= g.b);

    /* ---------- selection ---------- */
    const IMP = { arrive: 10, invasion: 10, empire: 8, fall: 7, crowned: 6, split: 6, union: 6, revolt: 5, plague: 6, war: 3.4, battle: 2.2, peace: 2.4, rename: 5, refound: 4.5, death: 3, crisis: 4, dynasty: 3, work: 2.6, famine: 3, flood: 2, quake: 4, fire: 2, winter: 4, comet: 2, ruin: 3, capital: 3, letters: 5, regency: 2, polity: 2.2, 'crisis-end': 3, decline: 4, republic: 5, found: 0, adapt: 0, sound: 0 };
    function locOf(e) {
      if (e.s !== undefined && e.s !== null && S[e.s]) return S[e.s];
      if (e.p !== undefined && e.p !== null && PS[e.p]) return S[PS[e.p].capital];
      return null;
    }
    function weight(e) {
      let w = IMP[e.type] || 0;
      if (e.type === 'battle' && (e.capture || e.killed !== undefined)) w += 1.5;
      if (e.type === 'battle' && e.raze) w += 3;
      if (e.type === 'fall') {
        const p = PS[e.p];
        const n = S.filter((s) => s.ownerY[Math.max(0, e.y - 1)] === p.id).length;
        if (formAt(p, e.y - 1) === 'tribe' && n <= 2) w -= 4;
      }
      if (e.type === 'death') {
        const p = PS[e.p], R = RS[e.r];
        const f = formAt(p, e.y);
        w = 1 + (f === 'empire' ? 2 : f === 'kingdom' ? 0.8 : f === 'city' ? 0.3 : -0.5) + (R.epithet ? 0.7 : 0) + (e.reign > 25 ? 0.6 : 0) + (['murder', 'poison', 'in battle', 'drowning'].includes(e.cause) ? 1 : 0) + (e.relation === 'disputed' ? 1 : 0);
      }
      if (e.type === 'plague') w += Math.min(3, e.list.length / 4);
      if (e.type === 'fire' && e.library) w += 3;
      const house = houseAt(e.y);
      const ours = ourPolity(e.y);
      if ([e.p, e.q].includes(ours) && ours >= 0) w += e.type === 'battle' ? 1.2 : 2.5;
      const loc = locOf(e);
      if (house && loc) {
        const d = Math.hypot(house.x - loc.x, house.y - loc.y);
        w *= d < 35 ? 1.15 : d < 70 ? 0.9 : 0.65;
      }
      return w * rng.range(0.75, 1.25);
    }

    /* ---------- templates ---------- */
    const pick = (a) => rng.pick(a);
    const siteOf = (s, y) => {
      if (s.river >= 0 && rng.chance(0.6)) return pick([` by the ford of ${riverN(s.river, y)}`, ` on the banks of ${riverN(s.river, y)}`, ` where ${riverN(s.river, y)} bends`]);
      if (s.port && rng.chance(0.6)) return pick([` on the shore of ${seaNear(s, y)}`, ` by ${seaNear(s, y)}`]);
      if (T.elev[s.cell] > 0.22 && rng.chance(0.6)) return pick([' on a hill', ' in the high country', ' under the mountains']);
      return '';
    };
    const means = (n, y) => {
      if (!n.gloss) return rng.chance(0.5) ? ', a name whose meaning is forgotten' : '';
      return pick([`, which in their tongue is ${gloss(n)}`, `, that is, ${gloss(n)}`, `, which means ${gloss(n)}`]);
    };
    const dirFrom = (a, b) => {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const k = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
      return ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][k];
    };
    const CAUSE = {
      fever: () => 'of a fever', 'old age': () => pick(['full of years', 'in great age', 'old and blind', 'in bed, very old']),
      'a fall from a horse': (R) => `of a fall from ${his(R)} horse`, poison: () => pick(['by poison, and it is not known whose hand', 'after eating at a feast, and some say it was poison']),
      childbed: () => 'in childbed', drowning: () => pick(['in the water, crossing a river in winter', 'at sea, when a ship went down']),
      murder: (R, y, p) => pick([`by a knife, in ${his(R)} own hall at ${sN(p.capital, y)}`, `by the hand of a kinsman, at ${sN(p.capital, y)}`]), grief: () => 'of grief', 'a wasting sickness': () => 'of a wasting sickness',
      'in battle': () => 'in battle', plague: () => 'of the pestilence', deposed: () => 'deposed',
    };
    const REL = { son: (R) => `${his(R)} son`, daughter: (R) => `${his(R)} daughter`, brother: (R) => `${his(R)} brother`, sister: (R) => `${his(R)} sister`, nephew: (R) => `${his(R)} nephew`, niece: (R) => `${his(R)} niece`, grandson: (R) => `${his(R)} grandson`, granddaughter: (R) => `${his(R)} granddaughter`, cousin: (R) => `${his(R)} cousin` };
    const OMENS = [
      (y, s) => `A calf was born at ${sN(s.id, y)} with two heads, and the priests would not say what it meant.`,
      (y, s) => `A star with a tail stood over ${sN(s.id, y)} for forty nights.`,
      (y, s) => s.river >= 0 ? `${cap1(riverN(s.river, y))} ran red for a day and a night at ${sN(s.id, y)}.` : `It rained red at ${sN(s.id, y)}, and the wells tasted of iron.`,
      (y, s) => `Crows gathered on the roofs of ${sN(s.id, y)} in such numbers that the beams cracked.`,
      (y, s) => `The sun went dark at midday over ${sN(s.id, y)}, and came back.`,
      (y, s) => `At ${sN(s.id, y)} a well filled with blood. So it was said.`,
      (y, s) => `A woman of ${sN(s.id, y)} dreamed three nights of a burning ship, and told everyone.`,
    ];

    const T_ = {};
    T_.arrive = (e, y, first) => {
      const s = S[e.s], n = nameAt(s, y), c = e.c;
      const from = pick(['down from the hills', 'out of the east', 'over the water', 'out of the forests', 'from the far side of the mountains', 'up the river in boats', 'out of the south with their herds']);
      if (first) return `Here begins the reckoning of years. ${cap1(cP(c))} came ${from} and built their first hall at ${sN(s.id, y)}${siteOf(s, y)}${means(n, y)}.`;
      const own = handAt(y);
      const strange = own && own.culture !== c ? pick([' Their speech was not like ours.', ' Their speech was strange, and they would not trade at first.', ' They wore their hair long and their speech was not ours.']) : '';
      return `In this year another people came into the land, ${cP(c)}, and settled at ${sN(s.id, y)}${siteOf(s, y)}.${strange}`;
    };
    T_.found = (group, y) => {
      const c = group[0].c;
      const towns = group.map((e) => sN(e.s, y));
      if (towns.length === 1) {
        const e = group[0];
        const s = S[e.s];
        return pick([
          `Men of ${sN(e.from, y)} went out and built ${towns[0]}${siteOf(s, y)}.`,
          `${cap1(cP(c))} built ${towns[0]}${siteOf(s, y)}${means(nameAt(s, y), y)}.`,
          `A new town was made at ${towns[0]}, by settlers from ${sN(e.from, y)}.`,
        ]);
      }
      const first = S[group[0].s];
      const where = first.river >= 0 && rng.chance(0.5) ? ` along ${riverN(first.river, y)}` : '';
      return pick([
        `In these years ${cP(c)} spread${where} and built ${list(towns)}.`,
        `${cap1(cP(c))} were many now, and their young men went out and built ${list(towns)}.`,
        `In these years were founded ${list(towns)}, ${towns.length === 2 ? 'both' : 'all'} by ${cP(c)}.`,
      ]);
    };
    T_.polity = (e, y) => pick([
      `The people of ${sN(e.s, y)} would not send their tithe to ${pN(e.q, y)}, and chose a chief of their own.`,
      `${cap1(sN(e.s, y))} lay far from ${sN(PS[e.q].capital, y)}, and its people went their own way.`,
    ]);
    T_.crowned = (e, y) => {
      const p = PS[e.p], R = RS[e.r];
      if (!R) return null;
      return pick([
        `${rName(R, y)} of ${sN(p.capital, y)} took the title of ${R.female ? 'queen' : 'king'}, and the ${cA(p.culture)} lands became ${pN(p.id, y)}.`,
        `In this year ${rName(R, y)} was raised on a shield at ${sN(p.capital, y)} and named ${R.female ? 'queen' : 'king'} over all ${cP(p.culture)}.`,
        `The chiefs of ${cP(p.culture)} met at ${sN(p.capital, y)} and swore to one ${R.female ? 'queen' : 'king'}, ${rName(R, y)}. So began ${pN(p.id, y)}.`,
      ]);
    };
    T_.empire = (e, y) => {
      const p = PS[e.p], R = RS[e.r];
      const mine = S.filter((s) => s.ownerY[y] === p.id);
      const peoples = new Set(mine.map((s) => s.cultY[y])).size;
      const far = mine.slice().sort((a, b) => Math.hypot(b.x - S[p.capital].x, b.y - S[p.capital].y) - Math.hypot(a.x - S[p.capital].x, a.y - S[p.capital].y))[0];
      return `${R ? rName(R, y) : 'The king'} was crowned ${R && R.female ? 'empress' : 'emperor'} at ${sN(p.capital, y)}. Now ${pN(p.id, y, 'short')} ruled ${num(peoples)} peoples${far ? `, and its writ ran as far as ${sN(far.id, y)}` : ''}.`;
    };
    T_.republic = (e, y) => `The great families of ${sN(e.s, y)} put away their lord and ruled the city themselves, by council and by lot.`;
    T_.decline = (e, y) => `${cap1(pN(e.p, y - 1))} was an empire in name only now; its provinces went their own way.`;
    T_.death = (e, y) => {
      const p = PS[e.p], R = RS[e.r];
      const ours = ourPolity(y) === p.id;
      const cause = (CAUSE[e.cause] || (() => 'of ' + e.cause))(R, y, p);
      const who = ours && rng.chance(0.6) ? pick([`Our ${title(R, y)}, ${rName(R, y)},`, `${rName(R, y)}, our ${title(R, y)},`, `Our lord ${rName(R, y)}`]) : rNs(R.id, y);
      let t = `${cap1(who)} died ${cause}${e.reign >= 2 ? `, in the ${ORD(e.reign + 1)} year of ${his(R)} reign` : ''}.`;
      if (R.epithet && rng.chance(0.85)) t += pick([` Men called ${him(R)} ${R.epithet}.`, ` ${cap1(he(R))} was called ${R.epithet}, and not without reason.`, ` After ${his(R)} death ${he(R)} was remembered as ${rName(R, y)} ${R.epithet}.`]);
      if (e.next !== undefined && e.relation && RS[e.next]) {
        const N2 = RS[e.next];
        const age = y - N2.born;
        if (e.relation === 'disputed') t += '';
        else if (e.relation === 'none') t += '';
        else if (e.relation === 'elected') t += ` The council chose ${rName(N2, y)} in ${his(R)} place.`;
        else if (N2.child) t += ` ${cap1(REL[e.relation](R))} ${rName(N2, y)}, a child of ${num(age)}, was made ${title(N2, y)}, and the great men of the realm ruled for ${him(N2)}.`;
        else t += pick([` ${cap1(REL[e.relation](R))} ${rName(N2, y)} succeeded ${him(R)}.`, ` ${rName(N2, y)}, ${REL[e.relation](R)}, was made ${title(N2, y)} at ${sN(p.capital, y)}.`]);
      }
      return t;
    };
    T_.crisis = (e, y) => {
      const p = PS[e.p];
      const A = RS[e.a];
      return `There was no heir, and the great men of ${pN(p.id, y)} could not agree. Some swore to ${rName(A, y)} at ${sN(p.capital, y)}; others to ${esc(e.bName.text(y))}, lord of ${sN(e.seat, y)}. The realm was divided in its heart.`;
    };
    T_.split = (e, y) => `So ${pN(e.p, y - 1)} was broken in two. ${esc(e.bName.text(y))} held ${sN(e.seat, y)} and the lands about it, and called it ${pN(e.q, y)}.`;
    T_['crisis-end'] = (e, y) => {
      if (e.how === 'vanished') return `The quarrel over the crown of ${pN(e.p, y)} ended when every friend of the pretender ${esc(e.bName.text(y))} had gone over to the other side.`;
      if (e.how === 'reconciled') return `${esc(e.bName.text(y))} knelt to ${rName(RS[e.a], y)} at last, and was forgiven, and given a seat at the high table.`;
      return `${esc(e.bName.text(y))}, who had claimed the crown of ${pN(e.p, y)}, was ${e.how}. ${rName(RS[e.a], y)} reigned alone.`;
    };
    T_.dynasty = (e, y) => {
      const R = RS[e.r];
      const seatWord = formAt(PS[e.p], y) === 'tribe' ? 'chief’s seat' : 'crown';
      const house = esc(R.name.text(y));
      return pick([
        `No kin of the old line was left. ${cap1(e.origin)} of ${sN(e.seat, y)}, ${rName(R, y)}, took the ${seatWord}, and so began the house of ${house}.`,
        `The old house had died out. The great men chose ${rName(R, y)}, ${e.origin} of ${sN(e.seat, y)}, to rule them.`,
        `With no heir of the blood living, ${rName(R, y)} of ${sN(e.seat, y)}, who had been ${e.origin}, took the ${seatWord}.`,
        `So the old line ended. ${cap1(e.origin)} named ${rName(R, y)} came up from ${sN(e.seat, y)} and was given the ${seatWord}, and many grumbled.`,
      ]);
    };
    T_.regency = () => null;
    const WARCAUSE = {
      border: (p, q, y) => `${cap1(pN(p, y))} made war on ${pN(q, y)} over the lands between them.`,
      tribute: (p, q, y) => `${cap1(pN(q, y))} refused the tribute, and ${pN(p, y)} came against them.`,
      insult: (p, q, y) => pick([`An envoy of ${pN(p, y)} was shaved and sent home on a donkey by ${pN(q, y)}. So the war began.`, `An envoy of ${pN(p, y)} was mocked at the court of ${pN(q, y)}, and the war came of it.`]),
      faith: (p, q, y) => `The priests of ${godN(PS[p].culture, 0, y)} called for war against ${pN(q, y)}, who would not honour that god.`,
      plunder: (p, q, y) => `${cap1(pN(p, y))} raided the herds of ${pN(q, y)}, and it became a war.`,
      marriage: (p, q, y) => `A marriage between ${pN(p, y)} and ${pN(q, y)} was promised and then broken, and war came of it.`,
      river: (p, q, y) => { const s = S[PS[q].capital]; return `${cap1(pN(p, y))} and ${pN(q, y)} quarrelled over the fords of ${riverN(s.river >= 0 ? s.river : -1, y)}, and then fought.`; },
      salt: (p, q, y) => `${cap1(pN(p, y))} and ${pN(q, y)} went to war over salt.`,
      unknown: (p, q, y) => `War again, between ${pN(p, y)} and ${pN(q, y)}. Why, the book does not say.`,
      revenge: (p, q, y) => `${cap1(pN(p, y))} had not forgotten the last war, and made war on ${pN(q, y)} again.`,
      rebellion: (p, q, y) => `${cap1(pN(p, y))} sent an army to bring ${pN(q, y)} back under its rule.`,
      invasion: (p, q, y) => `${cap1(pN(p, y))} made war on ${pN(q, y)}.`,
    };
    T_.war = (e, y) => {
      const ours = ourPolity(y);
      if (ours === e.p && rng.chance(0.55)) {
        const R = PS[e.p].rulers.filter((r) => r.from <= y).slice(-1)[0];
        return pick([
          `We went to war against ${pN(e.q, y)}${e.cause === 'revenge' ? ', to repay the last war' : ''}. May the gods forgive whoever began it.`,
          `${R ? `Our ${title(R, y)} ${rName(R, y)}` : 'Our lord'} took the host out against ${pN(e.q, y)}.`,
          `War with ${pN(e.q, y)}. The young men were called up from every village, and the harvest was brought in by women and the old.`,
          `The banners went out from ${sN(PS[e.p].capital, y)} against ${pN(e.q, y)}.`,
        ]);
      }
      if (ours === e.q && rng.chance(0.55)) return pick([`${cap1(pN(e.p, y))} came against us with an army.`, `${cap1(pN(e.p, y))} crossed into our lands, burning as they came.`, `Word came that ${pN(e.p, y)} had gathered an army against us. It was true.`]);
      return (WARCAUSE[e.cause] || WARCAUSE.unknown)(e.p, e.q, y);
    };
    T_.battle = (e, y) => {
      const s = S[e.s];
      const ours = ourPolity(y);
      const where = s.river >= 0 && rng.chance(0.35) ? `at the crossing of ${riverN(s.river, y)} near ${sN(s.id, y)}` : `at ${sN(s.id, y)}`;
      let t;
      if (ours === e.p) t = pick([`Our host met ${pN(e.q, y)} ${where} and had the victory, praise to ${godN(PS[e.p].culture, 0, y)}.`, `${cap1(where)} we beat ${pN(e.q, y)}.`, `${cap1(where)} our men held the field against ${pN(e.q, y)}. Many good men are dead.`]);
      else if (ours === e.q) t = pick([`Our host was beaten ${where} by ${pN(e.p, y)}.`, `${cap1(where)} we were beaten, and ran.`, `Bad news from ${where.replace(/^at /, '')}: ${pN(e.p, y)} had the victory, and our dead were left on the field.`]);
      else t = pick([
        `${cap1(where)} the host of ${pN(e.p, y)} met the host of ${pN(e.q, y)}, and ${pN(e.p, y, 'short')} had the victory.`,
        `${cap1(pN(e.p, y))} beat ${pN(e.q, y)} ${where}.`,
        `There was a battle ${where}. ${cap1(pN(e.q, y))} fled the field.`,
        `${cap1(where)} ${pN(e.q, y)} stood all day against ${pN(e.p, y)}, and broke at evening.`,
        `The armies of ${pN(e.p, y)} and ${pN(e.q, y)} met ${where}. It rained, the field was mud, and ${pN(e.p, y, 'short')} won it.`,
      ]);
      if (e.raze) t += pick([` ${cap1(sN(s.id, y - 1))} was burned, and nothing was left standing.`, ` They burned ${sN(s.id, y - 1)} and sowed its fields with salt.`]);
      else if (e.capture) t += e.sack ? pick([` ${cap1(sN(s.id, y))} was taken and plundered.`, ` They took ${sN(s.id, y)} and plundered it for three days.`]) : pick([` ${cap1(sN(s.id, y))} was taken.`, ` After a siege of ${num(rng.int(2, 9))} months ${sN(s.id, y)} opened its gates.`, ` ${cap1(sN(s.id, y))} surrendered.`]);
      if (e.killed !== undefined && RS[e.killed]) t += ` ${rNs(e.killed, y)} was killed there.`;
      return t;
    };
    T_.peace = (e, y) => {
      const ceded = [...new Set(e.ceded || [])].filter((id) => S[id].ownerY[y] === e.p).slice(0, 4).map((id) => sN(id, y));
      if (e.stalemate) return pick([`Peace was made between ${pN(e.p, y)} and ${pN(e.q, y)}. Neither had the better of it, and many were dead for nothing.`, `${cap1(pN(e.p, y))} and ${pN(e.q, y)} were tired of the war, and made peace.`]);
      const w = world.wars[e.war];
      const nb = w ? w.battles.length : 0;
      const after = w && y - w.start >= 3 ? pick([` after ${num(y - w.start)} years of war`, ` after ${nb > 3 ? num(nb) + ' battles' : num(y - w.start) + ' years'}`]) : '';
      const after2 = w && y - w.start >= 3 ? ` after ${num(y - w.start)} years` : '';
      let t = pick([`Peace between ${pN(e.p, y)} and ${pN(e.q, y)}${after}.`, `${cap1(pN(e.q, y))} sued for peace${after}, and ${pN(e.p, y, 'short')} granted it.`, `The war ended${after2}. ${cap1(pN(e.p, y, 'short'))} had the better of it.`]);
      if (ceded.length) t += ` ${cap1(pN(e.q, y, 'short'))} gave up ${list(ceded)}.`;
      return t;
    };
    T_.fall = (e, y) => {
      const p = PS[e.p];
      const age = y - p.founded;
      if (formAt(p, y - 1) === 'tribe') return pick([
        `${cap1(pN(p.id, y - 1))} were scattered by ${pN(e.q, y)}, and their name was not heard again.`,
        `${cap1(pN(e.q, y))} took the last towns of ${pN(p.id, y - 1)}. Those who would not bow went into the hills.`,
      ]);
      return pick([
        `So ended ${pN(p.id, y - 1)}, which had stood ${age} years. ${cap1(pN(e.q, y))} took what was left.`,
        `${cap1(sN(e.s, y))} fell to ${pN(e.q, y)}, and with it ${pN(p.id, y - 1)}, after ${age} years.`,
        `${cap1(pN(p.id, y - 1))} is no more. ${cap1(pN(e.q, y))} rules there now.`,
      ]);
    };
    T_.revolt = (e, y) => pick([
      `${cap1(sN(e.s, y))} rose against ${pN(e.q, y)}. They chose ${rN(PS[e.p].rulers[0].id, y)}, and kept their own law after.`,
      `The people of ${sN(e.s, y)} threw out the governor of ${pN(e.q, y)} and made ${rName(PS[e.p].rulers[0], y)} their lord.`,
    ]);
    T_.union = (e, y) => {
      const Ra = e.ra !== null ? RS[e.ra] : null, Rb = e.rb !== null ? RS[e.rb] : null;
      if (Ra && Rb) return `${rNs(Ra.id, y)} and ${rNs(Rb.id, y)} were joined in marriage, and the two realms became one, under ${pN(e.p, y, 'short')}.`;
      return `${cap1(pN(e.q, y - 1))} was joined to ${pN(e.p, y)}, by marriage and by treaty.`;
    };
    T_.invasion = (e, y) => {
      const side = { w: 'west', e: 'east', n: 'north', s: 'south' }[e.side] || 'west';
      const sail = pick(['striped', 'black', 'red', 'patched', 'white', 'oxblood']);
      const t1 = `In this year ships came out of the ${side}, with ${sail} sails, more than anyone could count. The men in them called themselves ${cP(e.c)}, and their speech was like no speech heard here.`;
      const t2 = ` They took ${sN(e.s, y - 1)}${e.q !== null && e.q !== undefined ? ` from ${pN(e.q, y - 1)}` : ''} and made it theirs.`;
      return t1 + t2;
    };
    T_.plague = (e, y) => {
      const src = S[e.s];
      const others = e.list.filter((id) => id !== e.s).slice(0, 3).map((id) => sN(id, y));
      const more = e.list.length > 4 ? ' and to many other places' : '';
      const mort = e.mort < 0.2 ? 'Many died.' : e.mort < 0.32 ? pick(['A third of the people died.', 'One in three died.']) : pick(['Half the people died, and there were not enough living to bury the dead.', 'Half the people died. The dead were burned in the fields.']);
      const how = src.port ? 'by ship' : 'by the roads';
      const house = houseAt(y);
      const here = house && e.list.includes(house.id) ? pick([' It came here also.', ' It came to us here, and I have buried my brothers.', ' It came here too; of the scribes only I am left.']) : '';
      return `${e.pname[0].toUpperCase() + e.pname.slice(1)} came ${how} to ${sN(src.id, y)}${others.length ? `, and went from there to ${list(others)}${more}` : ''}. ${mort}${here}`;
    };
    T_.famine = (e, y) => `The harvest failed around ${sN(e.s, y)}${rng.chance(0.4) ? ' for three years together' : ''}. ${pick(['Men ate bark and acorns.', 'Grain was sold for silver, weight for weight.', 'The poor went south to beg, and few came back.', 'Many died, the old and the young first.'])}`;
    T_.flood = (e, y) => `${cap1(riverN(e.river, y))} rose in the spring and drowned the low town of ${sN(e.s, y)}.`;
    T_.quake = (e, y) => {
      let t = `The earth shook under ${sN(e.s, y)}${e.list.length > 1 ? ` and ${list(e.list.filter((id) => id !== e.s).slice(0, 2).map((id) => sN(id, y)))}` : ''}.`;
      if (e.walls.length) t += ` The walls of ${sN(e.walls[0], y)} fell down.`;
      return t;
    };
    T_.fire = (e, y) => {
      let t = `Fire took half of ${sN(e.s, y)}.`;
      if (e.library) t += pick([' The house of books burned, and with it more books than one man could read in a life. I grieve for them more than for the houses.', ' The library burned. Whatever was in it is lost. The scribes stood in the street and wept.']);
      return t;
    };
    T_.winter = (e, y) => {
      const s = houseAt(y);
      return `A great winter. ${s ? cap1(seaNear(s, y)) + ' froze along the shore' : 'The rivers froze to the bottom'}, and birds fell out of the air.`;
    };
    T_.comet = (e, y) => `A star with a tail was seen over ${sN(e.s, y)} for ${pick(['forty', 'thirty', 'many'])} nights.`;
    const WORK = {
      temple: (e, y) => `${e.r !== null ? rNs(e.r, y) : 'The king'} raised a temple to ${godN(e.c, e.god, y)}, god of ${godDom(e.c, e.god)}, at ${sN(e.s, y)}.`,
      walls: (e, y) => `${cap1(sN(e.s, y))} was walled in stone.`,
      bridge: (e, y) => `A bridge of stone was built over ${riverN(S[e.s].river, y)} at ${sN(e.s, y)}.`,
      harbour: (e, y) => `A harbour mole was built at ${sN(e.s, y)}, and ships no longer had to be dragged up the beach.`,
      library: (e, y) => `A house of books was founded at ${sN(e.s, y)}.`,
      palace: (e, y) => `${e.r !== null ? rNs(e.r, y) : 'The king'} built a palace at ${sN(e.s, y)}, with a hall a hundred paces long.`,
      tower: (e, y) => `A tower was built at ${sN(e.s, y)}, so high that ${S[e.s].port ? 'ships could see its fire a day out' : 'the whole valley could be seen from it'}.`,
      aqueduct: (e, y) => `Water was brought to ${sN(e.s, y)} from the hills, in a stone channel on arches.`,
    };
    T_.work = (e, y) => WORK[e.kind] ? WORK[e.kind](e, y) : null;
    T_.rename = (e, y) => {
      const old = esc(e.old.text(y - 1)), nw = esc(e.nw.text(y));
      const g = e.nw.gloss ? `, which in their tongue means ‘${esc(e.nw.gloss)}’` : '';
      const span = `<span class="nm" data-s="${e.s}">${nw}</span>`;
      if (e.why === 'conquest') return pick([`${cap1(pN(e.p, y))} would not use the old name of ${old}, and called it ${span}${g}.`, `The new masters of ${old} renamed it ${span}${g}.`]);
      return pick([`In these years men stopped calling ${old} by that name, and began to say ${span}${g}. Only the old people still say ${old}.`, `${old} has a new name now: ${span}${g}. The ${cA(e.c)} speech has taken it over.`]);
    };
    T_.refound = (e, y) => {
      const old = esc(e.old.text(y - 1));
      const nwSpan = sN(e.s, y);
      const lapse = e.idle > 120 ? pick([' Nobody had lived there for longer than anyone could remember.', ` It had stood empty ${e.idle} years.`]) : '';
      if (e.old === e.nw) return `Settlers from ${sN(e.from, y)} went to the ruins of ${old} and built it again, under its old name.${lapse}`;
      const g = e.nw.gloss ? `, which means ‘${esc(e.nw.gloss)}’` : '';
      return pick([`${cap1(cP(e.c))} built a new town on the ruins of ${old}, and called it ${nwSpan}${g}.${lapse}`, `Men from ${sN(e.from, y)} cleared the thorns from the old stones of ${old} and settled there. They call the place ${nwSpan}${g}.${lapse}`]);
    };
    T_.ruin = (e, y) => {
      if (e.cause === 'razed') return null;
      return pick([`${cap1(sN(e.s, y - 1))} is empty now. The last families left it this year, and the fields have gone to thorn.`, `No one lives at ${sN(e.s, y - 1)} any more. Its stones are being carted away to build elsewhere.`]);
    };
    T_.capital = (e, y) => {
      const p = PS[e.p];
      const R = p.rulers.filter((r) => r.from <= y).slice(-1)[0];
      return `${R ? rNs(R.id, y) : 'The court'} moved ${R ? his(R) : 'its'} seat to ${sN(e.to, y)}.`;
    };
    T_.letters = (e, y) => `${cap1(cP(e.c))}, who had no letters, learned to write in the manner of ${cP(e.from)}.`;

    /* the native headline over an entry: a few words in the house tongue */
    const HEAD = {
      arrive: (e) => [['s', e.s], 'begin'], found: (e) => [['s', e.s], 'build'], war: (e) => [['p', e.p], ['p', e.q], 'war'],
      battle: (e) => [['s', e.s], 'battle'], peace: (e) => [['p', e.p], ['p', e.q], 'peace'], death: (e) => [['r', e.r], 'die'],
      plague: (e) => [['s', e.s], 'plague'], famine: () => ['grain', 'none'], flood: (e) => [['s', e.s], 'flood'], fire: (e) => [['s', e.s], 'burn'],
      rename: (e) => [['n', e.nw]], refound: (e) => [['n', e.nw], 'build'], invasion: () => ['ship', 'many', 'come'], crowned: (e) => [['r', e.r], 'crown'], empire: (e) => [['r', e.r], 'crown', 'great'],
      fall: (e) => [['p', e.p], 'fall'], comet: () => ['star', 'fire'], winter: () => ['ice', 'night'], quake: (e) => [['s', e.s], 'fall'],
      work: (e) => [['s', e.s], 'build'], union: (e) => [['p', e.p], ['p', e.q], 'oath'], revolt: (e) => [['s', e.s], 'rise'], split: (e) => [['p', e.q], 'rise'],
      crisis: () => ['crown', 'none'], 'crisis-end': () => ['crown', 'oath'], dynasty: (e) => [['r', e.r], 'crown'], ruin: (e) => [['s', e.s], 'dust'],
      capital: (e) => [['s', e.to], 'king'], letters: () => ['word', 'hand'], polity: (e) => [['s', e.s], 'law'], republic: (e) => [['s', e.s], 'law'],
      decline: (e) => [['p', e.p], 'fall'], omen: () => ['fear'], lost: () => ['book', 'fire'], hand: () => ['word', 'hand'],
    };
    function headline(e, y, h) {
      const f = HEAD[e.type];
      if (!f || !h) return null;
      const c = C[h.culture];
      const items = f(e);
      const forms = [], glosses = [];
      for (const it of items) {
        if (typeof it === 'string') { forms.push(c.lang.root(it, y)); glosses.push(it); continue; }
        let n = null;
        if (it[0] === 's') n = nameAt(S[it[1]], y);
        else if (it[0] === 'p') n = polityName(PS[it[1]], y);
        else if (it[0] === 'r') n = RS[it[1]] ? RS[it[1]].name : null;
        else if (it[0] === 'n') n = it[1];
        if (!n) continue;
        forms.push(n.form(y).filter((p) => p !== ' ' && p !== '-'));
        glosses.push(n.text(y));
      }
      if (!forms.length) return null;
      // a verb goes where the tongue puts verbs
      let order = forms.map((f2, i) => i);
      if (c.lang.wordOrder === 'VSO' && forms.length > 1) order = [order[order.length - 1]].concat(order.slice(0, -1));
      const ph = [];
      for (const i of order) { if (ph.length) ph.push(' '); for (const p of forms[i]) ph.push(p); }
      return { ph, gloss: order.map((i) => glosses[i]).join(' · '), translit: c.lang.romanize(ph), script: h.script };
    }

    /* ---------- assemble ---------- */
    const E = world.events;
    const chosen = [];
    // foundings are gathered into one line per people per generation
    const foundGroups = new Map();
    for (const e of E) {
      if (e.type !== 'found') continue;
      const k = e.c + ':' + Math.floor(e.y / 30);
      if (!foundGroups.has(k)) foundGroups.set(k, []);
      foundGroups.get(k).push(e);
    }
    for (const g of foundGroups.values()) {
      const ours = g.some((e) => ourPolity(e.y) === e.p);
      if (rng.chance(ours ? 0.6 : 0.32) || g.length >= 4) {
        const y = g[g.length - 1].y;
        chosen.push({ y, type: 'found', group: g.slice(0, 4), w: 2 + g.length * 0.4, idx: g[g.length - 1].idx });
      }
    }
    E.forEach((e, i) => { e.idx = i; });
    let firstArrive = true;
    for (const e of E) {
      if (e.type === 'found' || e.type === 'adapt' || e.type === 'sound') continue;
      const w = weight(e);
      const must = e.type === 'arrive' || e.type === 'invasion' || e.type === 'empire' || (e.type === 'fall' && w > 4 && rng.chance(0.85));
      if (must || w >= 3.6) chosen.push({ y: e.y, type: e.type, e, w, idx: e.idx, first: e.type === 'arrive' && firstArrive });
      if (e.type === 'arrive') firstArrive = false;
    }
    // a war gets at most two battles in the book, the ones that mattered
    const byWar = new Map();
    for (const c of chosen) if (c.type === 'battle') { const k = c.e.war; if (!byWar.has(k)) byWar.set(k, []); byWar.get(k).push(c); }
    const drop = new Set();
    for (const lst of byWar.values()) { lst.sort((a, b) => b.w - a.w); for (const c of lst.slice(2)) drop.add(c); }
    for (let i = chosen.length - 1; i >= 0; i--) if (drop.has(chosen[i])) chosen.splice(i, 1);
    // thin out crowded years: at most three lines a year, the weightiest
    chosen.sort((a, b) => a.y - b.y || b.w - a.w);
    const perYear = new Map();
    const kept = [];
    for (const c of chosen) {
      const n = perYear.get(c.y) || 0;
      if (n >= 3 && c.w < 7) continue;
      perYear.set(c.y, n + 1);
      kept.push(c);
    }
    // omens, seen afterwards
    for (const c of kept.slice()) {
      if (!['fall', 'plague', 'invasion', 'empire'].includes(c.type) || !rng.chance(0.35)) continue;
      const y = Math.max(1, c.y - rng.int(1, 3));
      const h = handAt(y);
      const s = h ? S[h.house] : null;
      if (!s || s.founded > y) continue;
      kept.push({ y, type: 'omen', omen: pick(OMENS), s, w: 3, idx: -1 });
    }
    kept.sort((a, b) => a.y - b.y || a.idx - b.idx);

    for (const c of kept) {
      const y = c.y;
      if (inGap(y)) continue;
      const h = handAt(y);
      let html = null;
      try {
        if (c.type === 'found') html = T_.found(c.group, y);
        else if (c.type === 'omen') html = c.omen(y, c.s);
        else if (T_[c.type]) html = T_[c.type](c.e, y, c.first);
      } catch (err) {
        html = null;
        if (window.console) console.warn('chronicle template failed', c.type, err);
      }
      if (!html) continue;
      // things far away arrive as hearsay
      const loc = c.e ? locOf(c.e) : null;
      const house = h ? S[h.house] : null;
      const oursHere = c.e && ourPolity(y) >= 0 && (c.e.p === ourPolity(y) || c.e.q === ourPolity(y));
      if (loc && house && !oursHere && c.type !== 'arrive' && c.type !== 'invasion' && Math.hypot(loc.x - house.x, loc.y - house.y) > 75 && rng.chance(0.55)) {
        html += ' ' + pick([`So the merchants of ${sN(loc.id, y)} told it.`, 'This news came late, and I do not know all of it.', `It was told here by a man from the ${dirFrom(house, loc)}.`, 'So it is said; I was not there.']);
      }
      const ent = { y, type: c.type, html: cap1(html), hand: h ? h.id : -1, w: c.w, ord: c.idx, s: loc ? loc.id : (c.s ? c.s.id : null), p: c.e ? c.e.p : undefined };
      ent.native = headline(c.type === 'found' ? c.group[0] : c.e || { type: c.type }, y, h);
      if (c.e && c.e.type === 'death' && RS[c.e.r] && RS[c.e.r].epithet && y < Y) ent.r = c.e.r;
      entries.push(ent);
    }

    // the hands themselves
    for (const h of hands) {
      const house = S[h.house];
      const c = C[h.culture];
      const ownerP = house.ownerY[h.from];
      const R = ownerP >= 0 ? PS[ownerP].rulers.filter((r) => r.from <= h.from && (r.to === null || r.to >= h.from)).slice(-1)[0] : null;
      const intro = h.id === 0
        ? `I, ${esc(h.name.text(h.from))}, ${h.title} at ${sN(house.id, h.from)}, have written down what the old people remember, and from this year I write what I see.`
        : (() => {
          const prev = hands[h.id - 1];
          const nm = esc(h.name.text(h.from));
          const moved = prev && prev.house !== h.house;
          const foreign = prev && prev.culture !== h.culture;
          const opts = [
            `I, ${nm}, ${h.title} at ${sN(house.id, h.from)}, take up this book${R ? ` in the ${ORD(h.from - R.from + 1)} year of ${rN(R.id, h.from)}` : ''}.`,
            `Here begins the hand of ${nm}, ${h.title} at ${sN(house.id, h.from)}.`,
            `${nm} writes from here on. ${cap1(h.female ? 'she' : 'he')} was taught letters by the one who wrote before.`,
            `A new hand, rounder and smaller: ${nm}, ${h.title}.`,
          ];
          if (moved) opts.push(`The book was carried to ${sN(house.id, h.from)}, and ${nm}, ${h.title} there, took it up.`, `The book came to ${sN(house.id, h.from)} in a merchant's chest, wrapped in oilcloth. I, ${nm}, will go on with it.`);
          if (foreign) opts.push(`The book came into the hands of ${cP(h.culture)}. I, ${nm}, write in the ${cA(h.culture)} manner, but I keep the old reckoning of years.`);
          return pick(moved || foreign ? opts.slice(4) : opts.slice(0, 4));
        })();
      if (!inGap(h.from)) entries.push({ y: h.from, type: 'hand', html: intro, hand: h.id, w: 5, intro: true, native: headline({ type: 'hand' }, h.from, h) });
      if (h.to < Y && !inGap(h.to)) {
        let outro;
        if (h.endHow === 'ruin') outro = `The writing breaks off here. Below, in another ink: <i>this book was found in the ashes of ${sN(house.id, h.to - 1)}.</i>`;
        else if (h.endHow === 'conquest') outro = `Here the hand of ${esc(h.name.text(h.to))} ends. ${cap1(sN(house.id, h.to))} has new masters, and the scribes have been sent away.`;
        else outro = pick([`Here ends the hand of ${esc(h.name.text(h.to))}, who kept this book ${h.to - h.from} years. Remember ${h.female ? 'her' : 'him'}.`, `${esc(h.name.text(h.to))} wrote this far, and no further. ${h.female ? 'She' : 'He'} died in the winter.`, `My eyes are failing and my hand shakes. Someone younger must go on. ${esc(h.name.text(h.to))}.`]);
        entries.push({ y: h.to, type: 'hand-end', html: outro, hand: h.id, w: 5 });
      }
    }
    for (const g of gaps) entries.push({ y: g.a, type: 'lost', html: `Here the leaves for the years ${g.a} to ${g.b} are ${g.why}. Nothing can be read.`, hand: -1, w: 5, gap: g });

    // margin notes: sound changes heard, names borrowed, a later reader's quarrels
    for (const e of E) {
      if (e.type === 'sound' && !inGap(e.y)) {
        const c = C[e.c];
        const ex = S.filter((s) => s.founded < e.y - 20 && (s.ruined === null || s.ruined > e.y)).map((s) => nameAt(s, e.y)).filter((n) => n.lang === c.lang && n.text(e.y - 1) !== n.text(e.y));
        if (!ex.length) continue;
        const n = ex[rng.int(0, ex.length - 1)];
        margins.push({ y: e.y + rng.int(2, 25), html: `In these days ${cP(c.id)} began to say <b>${esc(n.text(e.y))}</b> where their fathers said <b>${esc(n.text(e.y - 1))}</b>.`, kind: 'sound', c: c.id, change: e.change });
      }
      if (e.type === 'adapt' && rng.chance(0.5) && !inGap(e.y)) {
        margins.push({ y: e.y, html: `${cap1(cP(e.c))} say <b>${esc(e.nw.text(e.y))}</b> for <b>${esc(e.old.text(e.y))}</b>.`, kind: 'adapt', s: e.s });
      }
    }
    for (const ent of entries) {
      if (ent.type === 'death' && ent.r !== undefined && rng.chance(0.18)) {
        const R = RS[ent.r];
        margins.push({ y: ent.y, html: pick([`A later hand: <i>${R.epithet}? Not so.</i>`, `A later hand: <i>this is a lie.</i>`, `A later hand: <i>pray for ${him(R)}.</i>`]), kind: 'later' });
      }
      if (ent.type === 'battle' && rng.chance(0.06)) margins.push({ y: ent.y, html: 'A small drawing of a sword, badly done.', kind: 'doodle' });
    }

    // before the years: a myth told by the first people
    const fc = C[first.c];
    const riv = T.features.rivers.find((f) => f.name);
    const rng0 = T.features.ranges.find((f) => f.name);
    const sea0 = T.features.seas.find((f) => f.name);
    const myths = [];
    const fN = (f) => (f ? `<span class="fn">${esc(f.name.text(0))}</span>` : null);
    const g0 = `<span class="gn">${esc(fc.gods[0].name.text(0))}</span>`;
    if (rng0 && riv) myths.push(`Before the counting of years, ${cP(fc.id)} say, the land was the body of a giant who lay down to sleep. ${cap1(fN(rng0))} are his bones, and ${fN(riv)} is the last breath going out of him.`);
    if (sea0) myths.push(`${cap1(cP(fc.id))} tell that ${fN(sea0)} was once a field of barley, and that ${g0} drowned it in a fit of grief. That is why the sea is salt.`);
    if (riv) myths.push(`Of the time before years nothing is known but a song, and the song says only this: that ${fN(riv)} was the first road, and the dead still walk along it, upstream.`);
    if (riv) myths.push(`${cap1(cP(fc.id))} say they were made out of the mud of ${fN(riv)} by ${g0}, who was lonely, and who has regretted it since.`);
    myths.push(`${cap1(cP(fc.id))} say they followed a white ${pick(['elk', 'mare', 'hound', 'heron'])} for forty days, and where it lay down they built their first hall.`);
    myths.push(`Before the years, the elders say, there was no sea and no sky, only ${g0}, sitting in the dark and counting. When the counting was done the world began, and so did the years.`);
    const myth = { y: -1, type: 'myth', html: pick(myths), hand: -1, w: 10 };

    const rank = (e) => (e.type === 'hand-end' ? 0 : e.type === 'lost' ? 1 : e.type === 'hand' ? 2 : 3);
    entries.sort((a, b) => a.y - b.y || rank(a) - rank(b) || (a.ord ?? 1e9) - (b.ord ?? 1e9));
    entries.unshift(myth);
    const last = hands[hands.length - 1];
    entries.push({ y: Y, type: 'end', html: last && last.to >= Y ? pick([`Here the book ends. The rest of the leaves are ruled for lines that were never written.`, `I have come to the last leaf. Whoever finds this book, begin another.`, `The ink is gone, and the year is ending. I stop here.`]) : 'Here the record breaks off.', hand: last ? last.id : -1, w: 10 });
    margins.sort((a, b) => a.y - b.y);
    world.chronicle = { entries, margins, hands, gaps };
  }

  P.Chronicle = { write, ROMAN, ORD };
})();

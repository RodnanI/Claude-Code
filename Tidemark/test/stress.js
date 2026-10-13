// The requested stress test: delete bridges under loaded vehicles, account for
// every unit, replay the deletion from a snapshot and compare.
const { loadSim } = require('./load');
const T = loadSim();
const S = T.newSim(7, 56, 56);
T.shapeTidemark(S); T.buildTidemark(S, 'canal');
for (let i = 0; i < T.TPD; i++) T.step(S);
const groups = T.bridgeGroups(S);
console.log('bridges:', groups.map((g, i) => i + ':' + g.kind + '[' + g.tiles.map(t => T.xy(S, t)).join(' ') + ']').join('  '));
const rep = T.runToEnd(T.stressTest(S, { pick: groups.map((g, i) => i).filter(i => groups[i].kind === 'road' || groups[i].kind === 'rail'), after: 600 }));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
for (const ev of rep.events) {
  console.log('--', ev.kind, 'bridge demolished at', T.clockStr(ev.tick), 'after waiting', ev.waited, 'ticks');
  for (const x of ev.onBridge) console.log('   on bridge:', T.VT[x.k].name, '#' + x.id, x.units + ' units', x.cargo.map(c => c.q + ' ' + T.RES[c.r].name + ' (' + c.from + ' > ' + c.to + ')').join(', '));
  for (const l of ev.lines) console.log('   ', l);
  ok(ev.lostUnits === ev.aboardDestroyed, 'units booked as lost (' + ev.lostUnits + ') equal units aboard destroyed vehicles (' + ev.aboardDestroyed + ')');
  for (const s of ev.survivors) console.log('   survivor', s.k, '#' + s.id, s.units, 'units:', s.st, s.ob);
}
for (const n of rep.notes) console.log('note:', n);
console.log('rerouted', rep.rerouted.length, rep.rerouted.slice(0, 4).map(x => '#' + x.con + ' ' + x.note));
console.log('diverted', rep.diverted.length);
ok(rep.before.ok, 'ledger balanced before demolition');
ok(rep.after.ok, 'ledger balanced ' + (rep.endTick - rep.snapTick) + ' ticks after demolition: ' + rep.after.issues.join('; '));
for (const r of rep.after.rows) if (r.lost || r.inT) console.log('   ', T.RES[r.r].name.padEnd(10), 'start', r.start, 'ext', r.ext, 'imp', r.imp, 'prod', r.prod, '| used', r.use, 'exp', r.exp, 'lost', r.lost, '| bldg', r.inB, 'store', r.inS, 'transit', r.inT, '| disc', r.disc);
ok(rep.same, 'replay from snapshot: state ' + T.hex(rep.liveHash) + ' vs ' + T.hex(rep.replayHash) + ', decisions ' + rep.liveDecN + '/' + rep.replayDecN);
ok(rep.diffs.length === 0, 'no per-resource, consignment or vehicle differences (' + rep.diffs.length + ')');
process.exit(fails ? 1 : 0);

const { loadSim } = require('./load');
const dump = require('/tmp/claude-0/-home-user-Claude-Code/dc3b36f1-93a6-5d1a-b62d-7627ae19139b/scratchpad/mapview.js');
const T = loadSim();
const S = T.newSim(7, 56, 56);
T.shapeTidemark(S); const fails = T.buildTidemark(S, process.argv[2] || 'canal');
console.log('fails', fails);
console.log(dump(T, S));
console.log('blds', S.blds.length, 'houses', S.blds.filter(b => b.type === 'house').length, 'vehs', S.vehs.length);

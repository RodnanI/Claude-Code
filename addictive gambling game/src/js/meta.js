/* ============================================================
   meta.js : persistence (localStorage), rank / XP, unlocks,
   discovery, achievements, daily streaks, settings.
   ============================================================ */
const Meta = (() => {
  const KEY = 'feverParlor.save.v1';
  const M = { data: null, ok: true };
  function defaults() {
    return {
      v: 1, xp: 0, rank: 1, unlocked: [],
      discovered: { charm: [], pin: [], ball: [], ticket: [], voucher: [] },
      ach: {},
      stats: { runs: 0, wins: 0, drops: 0, rounds: 0, jackpots: 0, fevers: 0, nudges: 0, bestBall: 0, bestFloor: 0, playtime: 0 },
      cabWins: {}, maxStake: 0,
      daily: { last: null, streak: 0, best: {} },
      hints: {},
      settings: { music: 0.5, sfx: 0.8, speed: 1, shake: 1, flash: 1 },
      run: null,
    };
  }
  function merge(d, s) {
    for (const k in s) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) merge(d[k], s[k]);
      else d[k] = s[k];
    }
    return d;
  }
  function load() {
    try { const s = localStorage.getItem(KEY); M.data = s ? merge(defaults(), JSON.parse(s)) : defaults(); }
    catch (e) { M.ok = false; M.data = defaults(); }
  }
  function save() { if (!M.ok) return; try { localStorage.setItem(KEY, JSON.stringify(M.data)); } catch (e) { M.ok = false; } }
  function reset() { const keep = M.data.settings; M.data = defaults(); M.data.settings = keep; save(); }
  const unlocked = (kind, id) => !LOCKED.has(kind + ':' + id) || M.data.unlocked.includes(kind + ':' + id);
  function unlockRank(kind, id) { const k = kind + ':' + id; const u = UNLOCKS.find(x => x[1].includes(k)); return u ? u[0] : 0; }
  function discover(kind, id) {
    const l = M.data.discovered[kind];
    if (l && !l.includes(id)) { l.push(id); if (kind === 'charm' && l.length >= 30) ach('collect30'); }
  }
  function ach(id) {
    if (!M.data || M.data.ach[id]) return;
    const d = ACH.find(a => a.id === id);
    if (!d) return;
    M.data.ach[id] = Date.now();
    save();
    UI.achToast(d);
    Sound.ach();
  }
  function statMax(k, v) { if (v > (M.data.stats[k] || 0)) M.data.stats[k] = v; }
  function endRun(run, won, xp) {
    const d = M.data, oldRank = d.rank, oldXP = d.xp;
    d.xp += xp;
    const unlocks = [];
    let g = 0;
    while (d.xp >= xpForRank(d.rank) && g++ < 50) {
      d.xp -= xpForRank(d.rank); d.rank++;
      const u = UNLOCKS.find(x => x[0] === d.rank);
      if (u) u[1].forEach(k => { if (!d.unlocked.includes(k)) { d.unlocked.push(k); unlocks.push(k); } });
    }
    statMax('bestFloor', run.floor);
    if (run.daily) { const prev = d.daily.best[run.daily] || 0; d.daily.best[run.daily] = Math.max(prev, (run.floor - 1) * 3 + run.ri); }
    d.run = null;
    save();
    return { oldRank, newRank: d.rank, oldXP, xp, unlocks, xpNow: d.xp, need: xpForRank(d.rank) };
  }
  function winCab(cab, stake) {
    const d = M.data;
    d.cabWins[cab] = Math.max(d.cabWins[cab] == null ? -1 : d.cabWins[cab], stake);
    d.maxStake = Math.max(d.maxStake, Math.min(STAKES.length - 1, stake + 1));
    save();
  }
  function dailyPlayed(date) {
    const d = M.data.daily;
    if (d.last === date) return;
    const y = todayStr(new Date(Date.now() - 864e5));
    d.streak = d.last === y ? d.streak + 1 : 1;
    d.last = date;
    if (d.streak >= 3) ach('streak3');
    save();
  }
  function dailyInfo() {
    const date = todayStr(), r = new RNG('daily-cab-' + date), cabs = Object.keys(CABINETS);
    const d = M.data.daily, y = todayStr(new Date(Date.now() - 864e5));
    return { date, cab: r.pick(cabs), stake: r.i(0, 2), played: d.last === date, streak: d.last === date || d.last === y ? d.streak : 0, best: d.best[date] || 0 };
  }
  function hint(id) { if (M.data.hints[id]) return false; M.data.hints[id] = 1; save(); return true; }
  return Object.assign(M, { load, save, reset, unlocked, unlockRank, discover, ach, statMax, endRun, winCab, dailyPlayed, dailyInfo, hint });
})();

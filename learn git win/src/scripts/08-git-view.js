/* Git simulator, part 5: what you see. The three areas, the transit-map commit
   graph, pretend GitHub panels, the Notepad-style editor, and the mission runner. */
(function () {
  'use strict';
  var LG = window.LG, G = LG.git, esc = LG.esc, keys = G.keys, short = G.short;

  /* ---------------- commit graph as a transit map ---------------- */
  var KORD = { remote: 0, server: 0, tag: 1, branch: 2, cur: 3, head: 4 };
  function lw(t) { return Math.round(t.length * 6.9 + 16); }
  function trunc(s, n) { s = G.firstLine(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  LG.graphSVG = function (r, refs, opt) {
    opt = opt || {};
    var C = r.commits, seen = {}, stack = refs.map(function (x) { return x.id; }).filter(Boolean);
    while (stack.length) {
      var id = stack.pop();
      if (seen[id] || !C[id]) continue;
      seen[id] = 1;
      stack.push.apply(stack, C[id].parents);
    }
    var list = Object.keys(seen).sort(function (a, b) { return C[a].n - C[b].n; });
    if (!list.length) return '<p class="g-empty">' + (opt.empty || 'No commits yet.') + '</p>';
    // Each commit keeps its branch's lane unless an unrelated line already occupies it
    // (you and a teammate both committed on main): then it moves to its own row.
    var tip = {}, laneOf = {}, lanes = [];
    list.forEach(function (x) {
      var c = C[x], L = c.lane;
      if (tip[L] != null && !r.isAncestor(tip[L], x)) {
        var p = c.parents[0], pl = p != null ? laneOf[p] : null;
        if (pl != null && tip[pl] === p) L = pl;
        else { L = 0; while (tip[L] != null) L++; }
      }
      laneOf[x] = L;
      tip[L] = x;
      if (lanes.indexOf(L) < 0) lanes.push(L);
    });
    lanes.sort(function (a, b) { return a - b; });
    var lab = {}, maxW = 0;
    refs.forEach(function (ref) { if (ref.id && seen[ref.id]) (lab[ref.id] = lab[ref.id] || []).push(ref); });
    Object.keys(lab).forEach(function (x) {
      lab[x].sort(function (a, b) { return KORD[a.kind] - KORD[b.kind]; });
      lab[x].forEach(function (l) { maxW = Math.max(maxW, lw(l.text)); });
    });
    // each row only reserves height for the tallest label stack that sits on it
    var stackOf = lanes.map(function () { return 0; }), rowY = [], pos = {};
    list.forEach(function (x) { var k = lanes.indexOf(laneOf[x]); stackOf[k] = Math.max(stackOf[k], lab[x] ? lab[x].length : 0); });
    stackOf.forEach(function (st, k) { rowY[k] = k ? rowY[k - 1] + 56 + st * 21 : 26 + st * 21; });
    var DX = Math.max(80, Math.min(160, maxW + 10)), X0 = Math.max(46, maxW / 2 + 8);
    list.forEach(function (x, i) { var row = lanes.indexOf(laneOf[x]); pos[x] = { x: Math.round(X0 + i * DX), y: rowY[row], row: row }; });
    var W = Math.round(X0 * 2 + (list.length - 1) * DX), H = rowY[rowY.length - 1] + 50;
    var s = '<svg class="g" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.label || 'Commit map') + '">';
    list.forEach(function (x) {
      var c = C[x], b = pos[x];
      c.parents.forEach(function (pid) {
        var a = pos[pid];
        if (!a) return;
        var lane = a.row > b.row ? C[pid].lane : c.lane, d;
        if (a.y === b.y) d = 'M' + a.x + ' ' + a.y + 'H' + b.x;
        else {
          var run = Math.min(Math.abs(b.y - a.y), b.x - a.x - 14);
          d = b.row > a.row ? 'M' + a.x + ' ' + a.y + 'L' + (a.x + run) + ' ' + b.y + 'H' + b.x
            : 'M' + a.x + ' ' + a.y + 'H' + (b.x - run) + 'L' + b.x + ' ' + b.y;
        }
        s += '<path class="g-e ln' + (lane % 6) + '" d="' + d + '"/>';
      });
    });
    list.forEach(function (x) {
      var c = C[x], p = pos[x];
      s += '<g class="g-node' + (opt.fresh && x === opt.fresh ? ' g-fresh' : '') + '"><title>' + esc(short(x) + ' "' + G.firstLine(c.msg) + '" by ' + c.author) + '</title>';
      if (x === opt.headId) s += '<circle class="g-head" cx="' + p.x + '" cy="' + p.y + '" r="17"/>';
      s += c.parents.length > 1
        ? '<circle class="g-st g-mst" cx="' + p.x + '" cy="' + p.y + '" r="11"/><circle cx="' + p.x + '" cy="' + p.y + '" r="4" style="fill:var(--edge)"/>'
        : '<circle class="g-st" cx="' + p.x + '" cy="' + p.y + '" r="9"/>';
      s += '<text class="g-id" x="' + p.x + '" y="' + (p.y + 28) + '">' + short(x) + '</text><text class="g-msg" x="' + p.x + '" y="' + (p.y + 42) + '">' +
        esc(trunc(c.msg, 13)) + '</text></g>';
    });
    Object.keys(lab).forEach(function (x) {
      var p = pos[x];
      s += '<line class="g-conn" x1="' + p.x + '" y1="' + (p.y - 12) + '" x2="' + p.x + '" y2="' + (p.y - 21) + '"/>';
      lab[x].forEach(function (l, k) {
        var w = lw(l.text), y = p.y - 30 - k * 21, lane = l.lane != null ? l.lane : C[x].lane;
        var fill = l.kind === 'branch' || l.kind === 'cur' ? ' class="lf' + (lane % 6) + '"' : '';
        s += '<g class="g-l g-l-' + l.kind + '"><rect x="' + (p.x - w / 2) + '" y="' + (y - 9) + '" width="' + w + '" height="18" rx="' + (l.kind === 'head' ? 9 : 4) + '"' + fill +
          '/><text x="' + p.x + '" y="' + (y + 4) + '">' + esc(l.text) + '</text></g>';
      });
    });
    return s + '</svg>';
  };

  function conflictsResolved(text, pick) {
    var out = text.replace(/<{7}[^\n]*\n([\s\S]*?)={7}\n([\s\S]*?)>{7}[^\n]*(\n|$)/g, function (m, a, b) {
      return pick === 'ours' ? a : pick === 'theirs' ? b : a + b;
    });
    return /\n$/.test(text) ? out : out.replace(/\n$/, '');
  }

  /* ---------------- the simulator widget ---------------- */
  function View(host, mission) {
    this.host = host;
    this.m = mission;
    this.prevKeys = {};
    var v = this;
    host.classList.add('gs');
    this.start();
    document.addEventListener('lg:stop', function () { if (host.offsetParent) v.render(); });
  }
  View.prototype.start = function () {
    var v = this, M = this.m, h = this.host;
    var r = this.r = new G.Repo({ name: M.name, base: M.base, inRepo: M.inRepo, exists: M.exists });
    if (M.setup) M.setup(r, this);
    r.seen = {};
    r.fresh = null;
    r.canLeave = !!M.canLeave;
    this.prevKeys = {};
    h.innerHTML = '<div class="gs-top"></div><div class="gs-main"><div class="gs-left"></div><div class="gs-vis"><div class="gs-areas"></div>' +
      '<div class="gpanel"><div class="gpanel-head">Your repository: the commit map <span class="gs-where"></span></div><div class="gscroll gs-local"></div>' +
      '<p class="g-legend">Circles are commits (stations). Coloured lines are branches. HEAD marks where you are. Dashed labels are your PC\'s last-known copy of GitHub\'s branches.</p></div>' +
      '<div class="gs-remotes"></div></div></div>' +
      '<div class="ed" hidden><div class="ed-win" role="dialog" aria-modal="true" aria-label="Edit a file"><div class="ed-bar"><span class="ed-title"></span>' +
      '<button class="ed-x" type="button" aria-label="Close without saving">&times;</button></div>' +
      '<div class="ed-name"><label>File name <input type="text" spellcheck="false" placeholder="about.html"></label></div>' +
      '<div class="ed-conf">This file has a merge conflict. Edit it by hand, or pick a side:<br>' +
      '<button type="button" class="btn sm" data-pick="ours">Keep current (HEAD)</button><button type="button" class="btn sm" data-pick="theirs">Keep incoming</button>' +
      '<button type="button" class="btn sm" data-pick="both">Keep both</button></div><textarea spellcheck="false" aria-label="File contents"></textarea>' +
      '<div class="ed-foot"><small>Ctrl+S saves, Esc cancels</small><button type="button" class="btn sm ed-cancel">Cancel</button><button type="button" class="btn sm primary ed-save">Save</button></div></div></div>';
    this.tasks = new LG.Tasks(h.querySelector('.gs-top'), {
      title: M.title, intro: M.intro, steps: M.steps || [], win: M.win, compact: true,
      onHint: function (hint) { v.term.fill(hint); },
      ctx: function (extra) { return { r: v.r, ev: extra || {}, view: v }; },
      onAction: function () { v.render(); }
    });
    var left = h.querySelector('.gs-left');
    this.term = new LG.Term(left, {
      prompt: function () { return 'PS ' + v.r.cwd() + '>'; },
      exec: function (line, t) {
        if (LG.ampCheck(line, t)) return;
        LG.splitCmds(line).forEach(function (part) { v.after(G.exec(v.r, part, t, v)); });
      },
      complete: function (w, b) { return v.complete(w, b); },
      banner: M.banner || 'Practice terminal. Real Git commands, pretend files: experiment freely.\nType help for the non-Git commands it knows.\n'
    });
    var tools = LG.h('div', 'gs-tools');
    tools.style.marginTop = '10px';
    tools.innerHTML = '<button type="button" class="btn sm">Start this simulator over</button>';
    tools.firstChild.addEventListener('click', function () { v.start(); });
    left.appendChild(tools);
    this.wireEditor();
    if (M.steps && M.steps[0] && M.steps[0].on) M.steps[0].on({ r: r, ev: {}, view: this });
    this.render();
  };
  View.prototype.after = function (ev) {
    this.render();
    this.tasks.check({ r: this.r, ev: ev || {}, view: this });
  };
  View.prototype.complete = function (word, before) {
    var r = this.r, b = before.trim().split(/\s+/), lw = word.toLowerCase().replace(/^\.[\\/]/, '');
    function pre(x) { return x.toLowerCase().replace(/^\.[\\/]/, '').indexOf(lw) === 0; }
    if (!before.trim()) return ['git', 'ls', 'cat', 'notepad', 'cls', 'cd'].filter(pre);
    if (b.length === 1 && b[0].toLowerCase() === 'git') return G.ALL.filter(pre);
    var pool = [];
    if (b[0] === 'git' && /^(switch|checkout|merge|branch|rebase|push|pull|log|diff|reset|revert|show|tag|fetch|remote)$/.test(b[1])) {
      pool = keys(r.branches).concat(keys(r.tracking), keys(r.remotes), keys(r.tags));
    }
    pool = pool.concat(r.inRepo ? keys(r.work).map(function (f) { return '.\\' + f; }) : r.exists ? ['.\\' + r.name + '\\'] : []);
    return pool.filter(function (x, i) { return pool.indexOf(x) === i && pre(x); });
  };

  /* ---------------- rendering ---------------- */
  View.prototype.card = function (key, name, badgeCls, badge, editable, del) {
    var fresh = !this.prevKeys[key] && this.rendered ? ' fresh' : '';
    this.nextKeys[key] = 1;
    return '<li class="fc' + (del ? ' del' : '') + fresh + '"><span class="fc-n" title="' + esc(name) + '">' + esc(name) + '</span><span class="fc-b ' + badgeCls + '">' + badge + '</span>' +
      (editable ? '<button type="button" class="fc-e" data-edit="' + esc(name) + '" aria-label="Edit ' + esc(name) + '">edit</button>' : '') + '</li>';
  };
  View.prototype.render = function () {
    var v = this, r = this.r, h = this.host, st = r.initialized && r.inRepo ? r.status() : null;
    this.nextKeys = {};
    var work = '', stage = '', repo = '';
    if (!r.inRepo) {
      work = '<p class="empty">Your terminal is in <b>' + esc(r.base) + '</b>, not inside a project.' + (r.exists ? ' The project folder <b>' + esc(r.name) + '</b> is here: <code>cd ' + esc(r.name) + '</code>' : '') + '</p>';
    } else {
      keys(r.work).forEach(function (f) {
        var b = ['dim', 'saved'];
        if (!st) b = ['dim', 'file'];
        else if (st.conflicts.indexOf(f) >= 0) b = ['bad', 'conflict'];
        else if (st.untracked.indexOf(f) >= 0) b = ['red', 'untracked'];
        else if (st.unstaged.some(function (x) { return x.f === f; })) b = ['red', 'modified'];
        else if (st.staged.some(function (x) { return x.f === f; })) b = ['grn', 'staged'];
        work += v.card('w:' + f + ':' + b[1] + ':' + r.work[f].length, f, b[0], b[1], true);
      });
      if (st) st.unstaged.forEach(function (x) { if (x.k === 'deleted') work += v.card('w:' + x.f + ':del', x.f, 'red', 'deleted', false, true); });
      work = work ? '<ul>' + work + '</ul>' : '<p class="empty">No files.</p>';
      work += '<div class="add-file"><button type="button" class="fc-e gs-new">+ new file</button></div>';
    }
    if (st) {
      st.staged.forEach(function (x) { stage += v.card('s:' + x.f + ':' + x.k + ':' + (r.index[x.f] || '').length, x.f, 'grn', x.k === 'new file' ? 'new' : x.k, false, x.k === 'deleted'); });
      st.conflicts.forEach(function (f) { stage += v.card('s:' + f + ':c', f, 'bad', 'unmerged', false); });
    }
    stage = stage ? '<ul>' + stage + '</ul>' : '<p class="empty">' + (st ? 'Empty. <code>git add</code> puts changes here.' : 'Appears once this folder is a repository.') + '</p>';
    if (!r.initialized || !r.inRepo) repo = '<p class="empty">' + (r.inRepo ? 'Not a repository yet. <code>git init</code> creates the hidden <code>.git</code> folder.' : 'Nothing here.') + '</p>';
    else {
      var id = r.headId(), rows = [], total = id ? Object.keys(r.ancestors(id)).length : 0;
      while (id && rows.length < 4) { rows.push('<div class="cm-row"><b>' + short(id) + '</b> ' + esc(G.firstLine(r.commits[id].msg)) + '</div>'); id = r.commits[id].parents[0]; }
      repo = rows.length ? '<div style="display:grid;gap:4px;margin-top:8px">' + rows.join('') + '</div><p class="empty">' + total + ' commit' + (total === 1 ? '' : 's') +
        ' behind HEAD' + (r.stash.length ? ', ' + r.stash.length + ' stashed' : '') + '</p>' : '<p class="empty">No commits yet. <code>git commit</code> saves one.</p>';
    }
    h.querySelector('.gs-areas').innerHTML =
      '<div class="area a-work"><h4>Working folder<small>files on your disk</small></h4>' + work + '</div>' +
      '<div class="area a-stage"><h4>Staging area<small>queued for the next commit</small></h4>' + stage + '</div>' +
      '<div class="area a-repo"><h4>Repository<small>saved commits in .git</small></h4>' + repo + '</div>';
    this.prevKeys = this.nextKeys;
    this.rendered = true;
    var where = !r.initialized || !r.inRepo ? '' : r.detached ? 'HEAD is detached at ' + short(r.detached) : 'HEAD is on ' + r.head + (r.merging ? ' (merging)' : '');
    h.querySelector('.gs-where').textContent = where;
    var loc = h.querySelector('.gs-local');
    loc.innerHTML = r.initialized ? LG.graphSVG(r, r.refs(), { headId: r.headId(), fresh: r.fresh, empty: 'No commits yet. Your first commit becomes the first station.' })
      : '<p class="g-empty">No repository yet.</p>';
    loc.scrollLeft = loc.scrollWidth;
    var urls = [], rem = '';
    keys(r.remotes).forEach(function (n) { var s = r.server(n); if (s && urls.indexOf(s) < 0) urls.push(s); });
    (this.m.showServers || []).forEach(function (u) { var s = r.serverByUrl(u); if (s && urls.indexOf(s) < 0) urls.push(s); });
    urls.forEach(function (s) {
      var nick = keys(r.remotes).filter(function (n) { return r.server(n) === s; });
      rem += '<div class="gpanel remote"><div class="gpanel-head">On GitHub: ' + esc(s.url.replace(/^https:\/\/github\.com\//i, '').replace(/\.git$/i, '')) +
        ' <span>' + (nick.length ? 'your PC calls it ' + esc(nick.join(', ')) : 'not connected to your PC yet') + (s.label ? ' &middot; ' + esc(s.label) : '') + '</span></div>' +
        '<div class="gscroll">' + LG.graphSVG(r, r.serverRefs(s), { empty: 'Empty repository. Nothing has been pushed here yet.', label: 'Commits on GitHub' }) + '</div></div>';
    });
    var rw = h.querySelector('.gs-remotes');
    rw.innerHTML = rem;
    LG.$$('.gscroll', rw).forEach(function (el) { el.scrollLeft = el.scrollWidth; });
    this.term.extra.innerHTML = r.initialized && r.inRepo ? '<span class="term-pill">' + esc(r.detached ? 'HEAD detached' : r.head) + (r.merging ? ' | MERGING' : '') + '</span>' : '';
    this.term.setPrompt();
    r.fresh = null;
    LG.$$('[data-edit]', h).forEach(function (b) { b.addEventListener('click', function () { v.openEditor(b.getAttribute('data-edit')); }); });
    var nb = h.querySelector('.gs-new');
    if (nb) nb.addEventListener('click', function () { v.openEditor(null); });
  };

  /* ---------------- the editor ---------------- */
  View.prototype.wireEditor = function () {
    var v = this, ed = this.host.querySelector('.ed');
    this.ed = ed;
    var ta = ed.querySelector('textarea'), nameIn = ed.querySelector('.ed-name input');
    ed.querySelector('.ed-x').addEventListener('click', function () { v.closeEditor(); });
    ed.querySelector('.ed-cancel').addEventListener('click', function () { v.closeEditor(); });
    ed.querySelector('.ed-save').addEventListener('click', function () { v.saveEditor(); });
    LG.$$('[data-pick]', ed).forEach(function (b) {
      b.addEventListener('click', function () { ta.value = conflictsResolved(ta.value, b.getAttribute('data-pick')); v.syncConflictBar(); ta.focus(); });
    });
    ta.addEventListener('input', function () { v.syncConflictBar(); });
    ed.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); v.closeEditor(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); v.saveEditor(); }
    });
    nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ta.focus(); } });
  };
  View.prototype.syncConflictBar = function () {
    this.ed.querySelector('.ed-conf').hidden = !/^<{7}/m.test(this.ed.querySelector('textarea').value);
  };
  View.prototype.openEditor = function (name) {
    var r = this.r, ed = this.ed, ta = ed.querySelector('textarea'), nameRow = ed.querySelector('.ed-name');
    if (!r.inRepo) { this.term.line('Go into the project folder first: cd ' + r.name, 'note'); return; }
    this.editing = name;
    nameRow.hidden = !!name;
    ed.querySelector('.ed-name input').value = '';
    ed.querySelector('.ed-title').textContent = (name || 'Untitled') + ' - Notepad';
    ta.value = name && r.work[name] != null ? r.work[name] : '';
    this.syncConflictBar();
    ed.hidden = false;
    (name ? ta : ed.querySelector('.ed-name input')).focus();
  };
  View.prototype.closeEditor = function () { this.ed.hidden = true; this.term.input.focus({ preventScroll: true }); };
  View.prototype.saveEditor = function () {
    var r = this.r, ed = this.ed, name = this.editing, nameIn = ed.querySelector('.ed-name input');
    if (!name) {
      name = nameIn.value.trim();
      if (!name || /[\\/:*?"<>|]/.test(name)) { nameIn.focus(); nameIn.style.borderColor = 'var(--red)'; return; }
      name = r.findFile(name, r.work) || name;
    }
    var existed = name in r.work;
    r.work[name] = ed.querySelector('textarea').value.replace(/\r/g, '');
    this.ed.hidden = true;
    this.term.line('(saved ' + name + (existed ? '' : ', a new file') + ')', 'dim');
    this.term.scroll();
    this.term.input.focus({ preventScroll: true });
    this.after({ cmd: 'edit', file: name, ok: true });
  };

  LG.GitView = View;
  LG.widgets.gitsim = function (el) {
    var m = LG.missions && LG.missions[el.getAttribute('data-mission')];
    if (!m) throw new Error('Unknown mission ' + el.getAttribute('data-mission'));
    return new View(el, m);
  };
})();

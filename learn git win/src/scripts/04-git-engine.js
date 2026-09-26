/* Git simulator, part 1: the model. Files on disk, the staging area, commits,
   branches, remotes ("servers" standing in for GitHub), plus diff and merge helpers. */
(function () {
  'use strict';
  var LG = window.LG, esc = LG.esc;
  var G = LG.git = { cmds: {} };

  function hex(n) { var s = ''; while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); return s; }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function keys(o) { return Object.keys(o || {}).sort(); }
  function union() {
    var s = {};
    for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) s[k] = 1;
    return keys(s);
  }
  G.hex = hex; G.copy = copy; G.keys = keys; G.union = union;
  G.lines = function (s) { return s == null || s === '' ? [] : String(s).split('\n'); };
  G.short = function (id) { return id ? id.slice(0, 7) : ''; };
  G.fmtDate = function (t) {
    var d = new Date(t), D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-';
    off = Math.abs(off);
    return D[d.getDay()] + ' ' + M[d.getMonth()] + ' ' + d.getDate() + ' ' + LG.pad2(d.getHours()) + ':' + LG.pad2(d.getMinutes()) + ':' +
      LG.pad2(d.getSeconds()) + ' ' + d.getFullYear() + ' ' + sign + LG.pad2(Math.floor(off / 60)) + LG.pad2(off % 60);
  };

  /* Line diff via longest common subsequence. Returns [{t: ' ' | '-' | '+', s: line}]. */
  G.diffLines = function (a, b) {
    var A = G.lines(a), B = G.lines(b), n = A.length, m = B.length, i, j, L = [];
    for (i = 0; i <= n; i++) L.push(new Array(m + 1).fill(0));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ t: ' ', s: A[i] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: '-', s: A[i++] });
      else out.push({ t: '+', s: B[j++] });
    }
    while (i < n) out.push({ t: '-', s: A[i++] });
    while (j < m) out.push({ t: '+', s: B[j++] });
    return out;
  };

  /* Changed regions of `other` relative to `base`: {s, e} is the replaced base range, add the new lines. */
  function hunks(base, other, side) {
    var out = [], bi = 0, cur = null;
    G.diffLines(base, other).forEach(function (op) {
      if (op.t === ' ') { if (cur) { out.push(cur); cur = null; } bi++; return; }
      if (!cur) cur = { s: bi, e: bi, add: [], side: side };
      if (op.t === '-') { bi++; cur.e = bi; } else cur.add.push(op.s);
    });
    if (cur) out.push(cur);
    return out;
  }
  function applyHunks(B, s, e, hs) {
    var r = [], p = s;
    hs.forEach(function (h) { r.push.apply(r, B.slice(p, h.s)); r.push.apply(r, h.add); p = h.e; });
    r.push.apply(r, B.slice(p, e));
    return r;
  }
  /* Three-way merge of one file. undefined content means "file does not exist". */
  G.merge3 = function (base, ours, theirs, theirName) {
    if (ours === theirs) return { c: ours };
    if (base === ours) return { c: theirs };
    if (base === theirs) return { c: ours };
    if (ours == null || theirs == null) return { c: ours == null ? theirs : ours, conflict: true, kind: 'modify/delete' };
    var B = G.lines(base), H = hunks(base || '', ours, 'o').concat(hunks(base || '', theirs, 't'));
    H.sort(function (x, y) { return x.s - y.s || x.e - y.e; });
    var out = [], pos = 0, conflict = false, k = 0;
    while (k < H.length) {
      var g = [H[k]], gs = H[k].s, ge = H[k].e;
      k++;
      while (k < H.length && H[k].s <= ge) { g.push(H[k]); ge = Math.max(ge, H[k].e); k++; }
      out.push.apply(out, B.slice(pos, gs));
      var os = g.filter(function (h) { return h.side === 'o'; }), ts = g.filter(function (h) { return h.side === 't'; });
      if (!os.length || !ts.length) out.push.apply(out, applyHunks(B, gs, ge, os.length ? os : ts));
      else {
        var ov = applyHunks(B, gs, ge, os), tv = applyHunks(B, gs, ge, ts);
        if (ov.join('\n') === tv.join('\n')) out.push.apply(out, ov);
        else {
          conflict = true;
          out.push('<<<<<<< HEAD');
          out.push.apply(out, ov);
          out.push('=======');
          out.push.apply(out, tv);
          out.push('>>>>>>> ' + theirName);
        }
      }
      pos = ge;
    }
    out.push.apply(out, B.slice(pos));
    return { c: out.join('\n'), conflict: conflict };
  };
  /* Merge whole trees. Returns {tree, conflicts: [files], touched: [files merged line by line]} */
  G.mergeTrees = function (bt, ot, tt, theirName) {
    var tree = {}, conflicts = [], touched = [];
    union(bt, ot, tt).forEach(function (f) {
      var m = G.merge3(bt[f], ot[f], tt[f], theirName);
      if (ot[f] !== bt[f] && tt[f] !== bt[f] && ot[f] !== tt[f]) touched.push(f);
      if (m.conflict) conflicts.push(f);
      if (m.c != null) tree[f] = m.c;
    });
    return { tree: tree, conflicts: conflicts, touched: touched };
  };

  G.stats = function (A, B) {
    var s = { files: 0, ins: 0, del: 0, created: [], deleted: [], per: [] };
    union(A, B).forEach(function (f) {
      if (A[f] === B[f]) return;
      var ins = 0, del = 0;
      G.diffLines(A[f], B[f]).forEach(function (op) { if (op.t === '+') ins++; else if (op.t === '-') del++; });
      s.files++; s.ins += ins; s.del += del;
      if (!(f in A)) s.created.push(f); else if (!(f in B)) s.deleted.push(f);
      s.per.push({ f: f, ins: ins, del: del });
    });
    return s;
  };
  G.printStats = function (o, s, perFile) {
    if (perFile) {
      var w = Math.max.apply(null, s.per.map(function (p) { return p.f.length; }).concat([1]));
      s.per.forEach(function (p) {
        o.html(' ' + esc(LG.padEnd(p.f, w)) + ' | ' + LG.padStart(p.ins + p.del, 2) + ' <span class="g">' +
          new Array(Math.min(p.ins, 24) + 1).join('+') + '</span><span class="r">' + new Array(Math.min(p.del, 24) + 1).join('-') + '</span>');
      });
    }
    o.l(' ' + s.files + ' file' + (s.files === 1 ? '' : 's') + ' changed' +
      (!s.ins && !s.del ? ', 0 insertions(+), 0 deletions(-)' : '') +
      (s.ins ? ', ' + s.ins + ' insertion' + (s.ins === 1 ? '' : 's') + '(+)' : '') +
      (s.del ? ', ' + s.del + ' deletion' + (s.del === 1 ? '' : 's') + '(-)' : ''));
    s.created.forEach(function (f) { o.l(' create mode 100644 ' + f); });
    s.deleted.forEach(function (f) { o.l(' delete mode 100644 ' + f); });
  };
  G.normUrl = function (u) { return String(u || '').trim().replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase(); };

  /* ---------------- the repository ---------------- */
  function Repo(o) {
    o = o || {};
    this.base = o.base || 'C:\\Users\\you';
    this.name = o.name || 'my-site';
    this.inRepo = o.inRepo !== false;     // is the terminal standing inside the project folder?
    this.exists = o.exists !== false;     // does the project folder exist yet?
    this.initialized = false;
    this.work = {};
    this.index = {};
    this.commits = {};
    this.n = 0;
    this.branches = {};
    this.head = 'main';
    this.detached = null;
    this.prevBranch = null;
    this.lanes = {};
    this.tags = {};
    this.remotes = {};
    this.tracking = {};
    this.upstream = {};
    this.world = {};
    this.merging = null;
    this.stash = [];
    this.reflog = [];
    this.seen = {};
    this.config = { 'user.name': 'You', 'user.email': 'you@example.com', 'init.defaultbranch': 'main' };
    this.clock = Date.now() - 5 * 3600 * 1000;
  }
  G.Repo = Repo;
  var R = Repo.prototype;

  R.dirPath = function () { return this.base + '\\' + this.name; };
  R.cwd = function () { return this.inRepo ? this.dirPath() : this.base; };
  R.headId = function () { return this.detached || this.branches[this.head] || null; };
  R.tree = function (id) { return id && this.commits[id] ? this.commits[id].tree : {}; };
  R.headTree = function () { return this.tree(this.headId()); };
  R.once = function (k) { if (this.seen[k]) return false; this.seen[k] = 1; return true; };

  R.resolve = function (ref) {
    if (!ref) return null;
    var rl = ref.match(/^HEAD@\{(\d+)\}$/);
    if (rl) return this.reflog[+rl[1]] ? this.reflog[+rl[1]].id : null;
    var m = ref.match(/^(.*?)((?:[~^]\d*)*)$/), b = m[1] || 'HEAD', id = null, self = this;
    if (b === 'HEAD' || b === '@') id = this.headId();
    else if (this.branches[b]) id = this.branches[b];
    else if (this.tracking[b]) id = this.tracking[b];
    else if (this.tracking[b.replace(/^remotes\//, '')]) id = this.tracking[b.replace(/^remotes\//, '')];
    else if (this.tags[b]) id = this.tags[b];
    else if (/^[0-9a-f]{4,40}$/i.test(b)) {
      var hits = Object.keys(this.commits).filter(function (c) { return c.indexOf(b.toLowerCase()) === 0 && self.commits[c]; });
      if (hits.length === 1) id = hits[0];
    }
    if (!id) return null;
    var re = /([~^])(\d*)/g, s;
    while ((s = re.exec(m[2]))) {
      var n = s[2] === '' ? 1 : parseInt(s[2], 10);
      if (s[1] === '~') {
        for (var i = 0; i < n && id; i++) id = this.commits[id].parents[0];
      } else if (n > 0) id = this.commits[id].parents[n - 1];
      if (!id) return null;
    }
    return id;
  };
  R.ancestors = function (id) {
    var seen = {}, st = id ? [id] : [];
    while (st.length) {
      var c = st.pop();
      if (seen[c] || !this.commits[c]) continue;
      seen[c] = 1;
      st.push.apply(st, this.commits[c].parents);
    }
    return seen;
  };
  R.isAncestor = function (a, b) { return !!(a && b && this.ancestors(b)[a]); };
  R.mergeBase = function (a, b) {
    var A = this.ancestors(a), B = this.ancestors(b), best = null, self = this;
    Object.keys(A).forEach(function (c) { if (B[c] && (!best || self.commits[c].n > self.commits[best].n)) best = c; });
    return best;
  };
  /* number of commits reachable from `to` but not from `from` */
  R.countBetween = function (from, to) {
    var A = this.ancestors(from), B = this.ancestors(to);
    return Object.keys(B).filter(function (c) { return !A[c]; }).length;
  };
  R.findFile = function (name, where) {
    var n = String(name).replace(/^\.[\\/]/, '').replace(/\\/g, '/').toLowerCase();
    var pool = union(where || this.work, this.index);
    for (var i = 0; i < pool.length; i++) if (pool[i].toLowerCase() === n) return pool[i];
    return null;
  };

  R.status = function () {
    var H = this.headTree(), I = this.index, W = this.work, un = this.merging ? this.merging.unresolved : [];
    var st = { staged: [], unstaged: [], untracked: [], conflicts: un.slice() };
    union(H, I).forEach(function (f) {
      if (un.indexOf(f) >= 0) return;
      if (!(f in H)) st.staged.push({ f: f, k: 'new file' });
      else if (!(f in I)) st.staged.push({ f: f, k: 'deleted' });
      else if (H[f] !== I[f]) st.staged.push({ f: f, k: 'modified' });
    });
    keys(I).forEach(function (f) {
      if (un.indexOf(f) >= 0) return;
      if (!(f in W)) st.unstaged.push({ f: f, k: 'deleted' });
      else if (W[f] !== I[f]) st.unstaged.push({ f: f, k: 'modified' });
    });
    keys(W).forEach(function (f) { if (!(f in I) && un.indexOf(f) < 0) st.untracked.push(f); });
    return st;
  };
  R.isClean = function () { var s = this.status(); return !s.staged.length && !s.unstaged.length && !s.conflicts.length; };

  R.laneFor = function (name) {
    if (!(name in this.lanes)) {
      var used = {}, n = 0;
      for (var k in this.lanes) used[this.lanes[k]] = 1;
      while (used[n]) n++;
      this.lanes[name] = n;
    }
    return this.lanes[name];
  };
  R.makeCommit = function (msg, parents, tree, opt) {
    opt = opt || {};
    var id;
    do { id = hex(40); } while (this.commits[id]);
    this.clock += (4 + Math.floor(Math.random() * 9)) * 60000 + Math.floor(Math.random() * 60000);
    var c = {
      id: id, msg: msg, parents: parents.filter(Boolean), tree: copy(tree), n: ++this.n, time: this.clock,
      author: opt.author || this.config['user.name'], email: opt.email || this.config['user.email'],
      lane: opt.lane != null ? opt.lane : this.laneFor(opt.branch || (this.detached ? '(detached)' : this.head))
    };
    this.commits[id] = c;
    this.fresh = id;
    return c;
  };
  R.log = function (id, why) { this.reflog.unshift({ id: id, why: why }); };
  /* move whatever HEAD points at (a branch, or HEAD itself when detached) */
  R.moveTo = function (id, why) {
    if (this.detached) this.detached = id; else this.branches[this.head] = id;
    this.log(id, why);
  };
  /* Update the staging area + files to another commit, carrying uncommitted changes when safe (like real Git). */
  R.checkoutTree = function (targetId) {
    var cur = this.headTree(), tgt = this.tree(targetId), st = this.status(), dirty = {}, bad = [], self = this;
    st.staged.concat(st.unstaged).forEach(function (x) { dirty[x.f] = 1; });
    Object.keys(dirty).forEach(function (f) { if (cur[f] !== tgt[f]) bad.push(f); });
    if (bad.length) return { files: bad.sort(), kind: 'local' };
    var ut = st.untracked.filter(function (f) { return (f in tgt) && tgt[f] !== self.work[f]; });
    if (ut.length) return { files: ut, kind: 'untracked' };
    var I = copy(tgt), W = copy(tgt);
    Object.keys(dirty).forEach(function (f) {
      if (f in self.index) I[f] = self.index[f]; else delete I[f];
      if (f in self.work) W[f] = self.work[f]; else delete W[f];
    });
    st.untracked.forEach(function (f) { W[f] = self.work[f]; });
    this.index = I;
    this.work = W;
    return null;
  };
  G.printBlocked = function (o, b, verb) {
    var what = verb === 'checkout' ? 'switch branches' : verb;
    o.err(b.kind === 'local' ? 'error: Your local changes to the following files would be overwritten by ' + verb + ':'
      : 'error: The following untracked working tree files would be overwritten by ' + verb + ':');
    b.files.forEach(function (f) { o.err('\t' + f); });
    o.err(b.kind === 'local' ? 'Please commit your changes or stash them before you ' + what + '.' : 'Please move or remove them before you ' + what + '.');
    o.err('Aborting');
  };

  /* ---------------- remotes and pretend GitHub servers ---------------- */
  R.addServer = function (url, o) {
    o = o || {};
    var s = { url: url, branches: {}, def: o.def || 'main', readonly: !!o.readonly, label: o.label || '', tags: {}, prs: 0 };
    this.world[G.normUrl(url)] = s;
    return s;
  };
  R.serverByUrl = function (url) { return this.world[G.normUrl(url)] || null; };
  R.server = function (remote) { return this.remotes[remote] ? this.serverByUrl(this.remotes[remote]) : null; };
  R.serverCommit = function (s, branch, msg, changes, author) {
    var tip = s.branches[branch] || null, tree = copy(this.tree(tip));
    for (var f in changes) { if (changes[f] === null) delete tree[f]; else tree[f] = changes[f]; }
    var c = this.makeCommit(msg, tip ? [tip] : [], tree, { branch: branch, author: author || 'sam', email: (author || 'sam') + '@example.com' });
    s.branches[branch] = c.id;
    return c;
  };
  R.serverMerge = function (s, from, into, msg) {
    var a = s.branches[into], b = s.branches[from], base = this.mergeBase(a, b);
    var m = G.mergeTrees(this.tree(base), this.tree(a), this.tree(b), from);
    var c = this.makeCommit(msg, [a, b], m.tree, { branch: into });
    s.branches[into] = c.id;
    return c;
  };
  R.cloneFrom = function (s, url, name) {
    var self = this, def = s.def;
    this.initialized = true;
    this.exists = true;
    this.name = name;
    this.remotes = { origin: url };
    this.tracking = {};
    this.branches = {};
    this.upstream = {};
    Object.keys(s.branches).forEach(function (b) { self.tracking['origin/' + b] = s.branches[b]; });
    if (s.branches[def]) { this.branches[def] = s.branches[def]; this.upstream[def] = 'origin/' + def; }
    this.head = def;
    this.detached = null;
    this.index = copy(this.tree(this.branches[def]));
    this.work = copy(this.index);
    this.log(this.branches[def], 'clone: from ' + url);
  };

  /* ---------------- helpers for building mission starting points ---------------- */
  R.seed = function (branch, list, from) {
    var tip = from !== undefined ? from : (this.branches[branch] || null), self = this;
    var tree = copy(this.tree(tip));
    list.forEach(function (item) {
      var ch = item[1] || {};
      for (var f in ch) { if (ch[f] === null) delete tree[f]; else tree[f] = ch[f]; }
      tip = self.makeCommit(item[0], tip ? [tip] : [], tree, { branch: branch, author: item[2] }).id;
      self.log(tip, 'commit: ' + item[0]);
    });
    this.branches[branch] = tip;
    this.initialized = true;
    return tip;
  };
  R.checkoutClean = function (branch) {
    this.head = branch;
    this.detached = null;
    this.index = copy(this.tree(this.branches[branch]));
    this.work = copy(this.index);
  };
  R.publish = function (remote, branch) {
    var s = this.server(remote);
    s.branches[branch] = this.branches[branch];
    this.tracking[remote + '/' + branch] = this.branches[branch];
    this.upstream[branch] = remote + '/' + branch;
  };

  /* refs to draw on the local graph */
  R.refs = function () {
    var out = [], self = this;
    Object.keys(this.tracking).forEach(function (k) { out.push({ id: self.tracking[k], text: k, kind: 'remote' }); });
    Object.keys(this.tags).forEach(function (k) { out.push({ id: self.tags[k], text: k, kind: 'tag' }); });
    Object.keys(this.branches).forEach(function (k) {
      out.push({ id: self.branches[k], text: k, kind: !self.detached && self.head === k ? 'cur' : 'branch', lane: self.lanes[k] });
    });
    var h = this.headId();
    if (h) out.push({ id: h, text: this.detached ? 'HEAD (detached)' : 'HEAD', kind: 'head' });
    return out;
  };
  R.serverRefs = function (s) {
    var self = this;
    return Object.keys(s.branches).map(function (b) { return { id: s.branches[b], text: b, kind: 'server', lane: self.lanes[b] }; });
  };

  /* An output helper handed to every command. */
  G.out = function (term) {
    var o = { ev: {}, failed: false };
    o.l = function (t, c) { term.print(t, c); };
    o.html = function (h, c) { term.html(h, c); };
    o.err = function (t) { o.failed = true; term.print(t, 'err'); };
    o.note = function (t) { term.line(t, 'note'); };
    return o;
  };
})();

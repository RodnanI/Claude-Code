/*
  The git simulator: a small but honest model of git, a bash-like shell and a fake GitHub.
  Pure logic, no DOM, so it can be tested in Node.

  World  = one pretend computer (a file system, a cwd, git config) plus pretend GitHub.
  Repo   = one repository: commits (full snapshots), branches, HEAD, index, remotes...
  Output = lines, where a line is an array of [text, cssClass] segments.
*/
(function (LG) {
  'use strict';

  const short = (h) => (h ? h.slice(0, 7) : '0000000');
  const firstLine = (msg) => String(msg || '').split('\n')[0];
  const blob = (content) => LG.fakeSha('blob ' + content).slice(0, 7);
  const treesEqual = (a, b) => {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) if (b.get(k) !== v) return false;
    return true;
  };
  const unionKeys = (...maps) => [...new Set(maps.flatMap((m) => [...m.keys()]))].sort();

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad2 = (n) => String(n).padStart(2, '0');
  function fmtDate(t) {
    const d = new Date(t * 1000);
    return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} ${d.getUTCFullYear()} +0000`;
  }
  function fmtShortDate(t) {
    const d = new Date(t * 1000);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  LG.fmtDate = fmtDate;

  // ---------- output ----------
  class Out {
    constructor() { this.lines = []; this.code = 0; this.editor = null; }
    p(text, cls) {
      String(text).split('\n').forEach((t) => this.lines.push([[t, cls || '']]));
      return this;
    }
    seg(...parts) {
      this.lines.push(parts.map((x) => (Array.isArray(x) ? x : [String(x), ''])));
      return this;
    }
    fail(text) { this.code = 1; if (text) this.p(text, 'err'); return this; }
    guide(text) { return this.p(text, 'guide'); }
  }
  LG.Out = Out;

  // ---------- paths ----------
  function normPath(p, cwd, home) {
    if (!p || p === '~') return home;
    if (p.startsWith('~/')) p = home + p.slice(1);
    else if (!p.startsWith('/')) p = (cwd === '/' ? '' : cwd) + '/' + p;
    const out = [];
    for (const part of p.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') out.pop();
      else out.push(part);
    }
    return '/' + out.join('/');
  }
  const dirname = (p) => { const i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); };
  const basename = (p) => p.slice(p.lastIndexOf('/') + 1);
  const join = (dir, name) => (dir === '/' ? '/' + name : dir + '/' + name);

  // ---------- shell-ish tokenizer ----------
  function tokenize(line) {
    const tokens = [];
    let cur = null, quote = null;
    const push = () => { if (cur !== null) { tokens.push({ w: cur }); cur = null; } };
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === quote) { quote = null; continue; }
        if (c === '\\' && quote === '"' && (line[i + 1] === '"' || line[i + 1] === '\\')) { cur += line[++i]; continue; }
        cur += c;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; if (cur === null) cur = ''; continue; }
      if (c === ' ' || c === '\t') { push(); continue; }
      if (c === '&' && line[i + 1] === '&') { push(); tokens.push({ op: '&&' }); i++; continue; }
      if (c === '|' && line[i + 1] === '|') { push(); tokens.push({ op: '||' }); i++; continue; }
      if (c === '|') { push(); tokens.push({ op: '|' }); continue; }
      if (c === ';') { push(); tokens.push({ op: ';' }); continue; }
      if (c === '>') {
        push();
        if (line[i + 1] === '>') { tokens.push({ op: '>>' }); i++; } else tokens.push({ op: '>' });
        continue;
      }
      if (c === '\\' && i + 1 < line.length) { cur = (cur || '') + line[++i]; continue; }
      cur = (cur || '') + c;
    }
    if (quote) return { error: true };
    push();
    return { tokens };
  }
  LG.tokenize = tokenize;

  // ---------- argument parsing ----------
  function parse(args, valueFlags) {
    const flags = {}, multi = {}, pos = [], paths = [];
    const setV = (k, v) => { flags[k] = v; (multi[k] = multi[k] || []).push(v); };
    let dd = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (dd) { paths.push(a); continue; }
      if (a === '--') { dd = true; continue; }
      if (/^-\d+$/.test(a)) { flags['-n'] = a.slice(1); continue; }
      if (a.startsWith('--') && a.includes('=')) { setV(a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)); continue; }
      if (valueFlags.includes(a)) { const v = args[++i]; setV(a, v === undefined ? null : v); continue; }
      if (/^-[a-zA-Z]{2,}$/.test(a)) {
        const letters = a.slice(1).split('');
        for (let k = 0; k < letters.length; k++) {
          const f = '-' + letters[k];
          if (valueFlags.includes(f)) {
            const rest = a.slice(2 + k);
            setV(f, rest || (args[i + 1] !== undefined ? args[++i] : null));
            break;
          }
          flags[f] = true;
        }
        continue;
      }
      if (a.startsWith('-') && a.length > 1) { flags[a] = true; continue; }
      pos.push(a);
    }
    return { flags, multi, pos, paths };
  }

  function validName(n) {
    return !!n && n !== 'HEAD' && n !== '@' &&
      !/[\s~^:?*[\\]|\.\.|@\{|^[-/.]|[/.]$|\.lock$|\/\//.test(n);
  }

  function closest(word, list) {
    let best = null, bestD = Infinity;
    for (const c of list) {
      const d = LG.levenshtein(word, c);
      if (d < bestD) { best = c; bestD = d; }
    }
    return bestD <= Math.max(1, Math.min(3, Math.floor(word.length / 2))) ? best : null;
  }

  // ---------- 3-way merge of whole trees ----------
  function mergeTrees(base, ours, theirs, lo, lt) {
    const tree = new Map(), conflicts = [], notes = [];
    for (const p of unionKeys(base, ours, theirs)) {
      const b = base.get(p), o = ours.get(p), t = theirs.get(p);
      if (o === t) { if (o !== undefined) tree.set(p, o); continue; }
      if (b === o) { if (t !== undefined) tree.set(p, t); continue; }
      if (b === t) { if (o !== undefined) tree.set(p, o); continue; }
      if (o === undefined || t === undefined) {
        conflicts.push(p);
        tree.set(p, o !== undefined ? o : t);
        notes.push(`CONFLICT (modify/delete): ${p} deleted in ${o === undefined ? lo : lt} and modified in ${o === undefined ? lt : lo}.`);
        continue;
      }
      notes.push('Auto-merging ' + p);
      const m = LG.merge3(b || '', o, t, lo, lt);
      tree.set(p, m.text);
      if (m.conflict) {
        conflicts.push(p);
        notes.push(`CONFLICT (${b === undefined ? 'add/add' : 'content'}): Merge conflict in ${p}`);
      }
    }
    return { tree, conflicts, notes };
  }
  LG.mergeTrees = mergeTrees;

  function copyCommits(from, to, tip) {
    const stack = [tip];
    let n = 0;
    while (stack.length) {
      const h = stack.pop();
      if (!h || to.commits.has(h)) continue;
      const c = from.commits.get(h);
      if (!c) continue;
      to.commits.set(h, c);
      n++;
      stack.push(...c.parents);
    }
    return n;
  }

  // =====================================================================
  // Repo
  // =====================================================================
  class Repo {
    constructor(world, opts) {
      this.w = world;
      this.root = opts.root || null;
      this.bare = !!opts.bare;
      this.url = opts.url || null;
      this.name = opts.name || '';
      this.commits = new Map();
      this.branches = new Map();
      this.head = { type: 'branch', name: opts.branch || 'main' };
      this.index = new Map();
      this.unmerged = new Set();
      this.remotes = new Map();
      this.remoteRefs = new Map();
      this.upstream = new Map();
      this.tags = new Map();
      this.stash = [];
      this.reflog = [];
      this.merging = null;
      this.prevBranch = null;
      this.laneColors = new Map();
    }

    headHash() { return this.head.type === 'branch' ? (this.branches.get(this.head.name) || null) : this.head.hash; }
    headCommit() { const h = this.headHash(); return h ? this.commits.get(h) : null; }
    headTree() { const c = this.headCommit(); return c ? c.tree : new Map(); }
    branchName() { return this.head.type === 'branch' ? this.head.name : null; }
    lane() { return this.head.type === 'branch' ? this.head.name : 'detached'; }
    treeOf(h) { const c = h && this.commits.get(h); return c ? c.tree : new Map(); }

    wd() {
      const out = new Map();
      if (this.bare) return out;
      const pre = this.root + '/';
      for (const [p, e] of this.w.fs) {
        if (e.type !== 'file' || !p.startsWith(pre)) continue;
        const r = p.slice(pre.length);
        if (r === '.git' || r.startsWith('.git/')) continue;
        out.set(r, e.content);
      }
      return out;
    }
    writeWd(rel, content) { this.w.writeFile(this.root + '/' + rel, content); }
    deleteWd(rel) {
      const abs = this.root + '/' + rel;
      this.w.fs.delete(abs);
      let d = dirname(abs);
      while (d !== this.root && d.startsWith(this.root + '/') && this.w.children(d).length === 0 &&
             this.w.cwd !== d && !this.w.cwd.startsWith(d + '/')) {
        this.w.fs.delete(d);
        d = dirname(d);
      }
    }

    ignoreRules() {
      const e = this.w.fs.get(this.root + '/.gitignore');
      return e && e.type === 'file' ? LG.ignore.compile(e.content) : [];
    }
    isIgnored(rel, rules) {
      rules = rules || this.ignoreRules();
      return rules.length > 0 && LG.ignore.test(rules, rel).ignored;
    }

    status() {
      const head = this.headTree(), idx = this.index, wd = this.wd();
      const staged = [], unstaged = [], untracked = [], ignored = [];
      for (const p of unionKeys(head, idx)) {
        if (this.unmerged.has(p)) continue;
        if (idx.get(p) !== head.get(p)) staged.push({ p, k: !head.has(p) ? 'new file' : !idx.has(p) ? 'deleted' : 'modified' });
      }
      for (const p of [...idx.keys()].sort()) {
        if (this.unmerged.has(p)) continue;
        if (!wd.has(p)) unstaged.push({ p, k: 'deleted' });
        else if (wd.get(p) !== idx.get(p)) unstaged.push({ p, k: 'modified' });
      }
      const rules = this.ignoreRules();
      for (const p of [...wd.keys()].sort()) {
        if (idx.has(p) || this.unmerged.has(p)) continue;
        if (this.isIgnored(p, rules)) ignored.push(p);
        else untracked.push(p);
      }
      return { staged, unstaged, untracked, ignored, unmerged: [...this.unmerged].sort() };
    }

    // "node_modules/" instead of 500 files, like git status does for untracked folders
    collapse(p) {
      const parts = p.split('/');
      for (let k = 1; k < parts.length; k++) {
        const d = parts.slice(0, k).join('/');
        let tracked = false;
        for (const q of this.index.keys()) if (q.startsWith(d + '/')) { tracked = true; break; }
        if (!tracked) return d + '/';
      }
      return p;
    }

    resolve(spec) {
      if (!spec) return null;
      const m = String(spec).match(/^(.*?)((?:[~^]\d*)*)$/);
      let h = this.resolveBase(m[1]);
      if (!h) return null;
      const re = /([~^])(\d*)/g;
      let s;
      while ((s = re.exec(m[2]))) {
        const n = s[2] === '' ? 1 : parseInt(s[2], 10);
        const walk = (idx) => { const c = this.commits.get(h); return c && c.parents[idx] ? c.parents[idx] : null; };
        if (s[1] === '~') { for (let k = 0; k < n && h; k++) h = walk(0); }
        else if (n > 0) h = walk(n - 1);
        if (!h) return null;
      }
      return h;
    }
    resolveBase(b) {
      if (b === 'HEAD' || b === '@') return this.headHash();
      const rl = b.match(/^(?:HEAD|@)?@\{(\d+)\}$/);
      if (rl) { const e = this.reflog[this.reflog.length - 1 - parseInt(rl[1], 10)]; return e ? e.hash : null; }
      if (b === 'ORIG_HEAD') return this.origHead || null;
      if (this.branches.has(b)) return this.branches.get(b);
      if (this.tags.has(b)) return this.tags.get(b).hash;
      if (this.remoteRefs.has(b)) return this.remoteRefs.get(b);
      if (b.startsWith('refs/heads/')) return this.branches.get(b.slice(11)) || null;
      if (b.startsWith('remotes/')) return this.remoteRefs.get(b.slice(8)) || null;
      if (/^[0-9a-f]{4,40}$/.test(b)) {
        const hits = [...this.commits.keys()].filter((k) => k.startsWith(b));
        if (hits.length === 1) return hits[0];
      }
      return null;
    }

    ancestors(h) {
      const seen = new Set();
      const stack = h ? [h] : [];
      while (stack.length) {
        const x = stack.pop();
        if (seen.has(x)) continue;
        seen.add(x);
        const c = this.commits.get(x);
        if (c) stack.push(...c.parents);
      }
      return seen;
    }
    isAncestor(a, b) { return !!a && !!b && this.ancestors(b).has(a); }
    mergeBase(a, b) {
      const A = this.ancestors(a);
      let best = null;
      for (const x of this.ancestors(b)) {
        if (!A.has(x)) continue;
        const c = this.commits.get(x);
        if (!best || c.seq > best.seq) best = c;
      }
      return best ? best.hash : null;
    }
    between(base, tip) {
      const ex = this.ancestors(base);
      return [...this.ancestors(tip)].filter((x) => !ex.has(x)).map((x) => this.commits.get(x)).filter(Boolean).sort((p, q) => p.seq - q.seq);
    }
    refTips() {
      const tips = [...this.branches.values(), ...this.remoteRefs.values(), ...[...this.tags.values()].map((t) => t.hash)];
      return tips;
    }

    // Paths that would lose uncommitted work if we moved to `target`
    blockers(target) {
      const cur = this.headTree(), idx = this.index, wd = this.wd();
      const bad = [];
      for (const p of unionKeys(cur, target)) {
        if (cur.get(p) === target.get(p)) continue;
        if (!cur.has(p) && !idx.has(p)) {
          if (wd.has(p) && wd.get(p) !== target.get(p)) bad.push(p);
          continue;
        }
        if (idx.get(p) !== cur.get(p) || wd.get(p) !== idx.get(p)) bad.push(p);
      }
      return bad;
    }
    // Carry over uncommitted work, only touch paths that differ between HEAD and target
    moveTo(target) {
      const cur = this.headTree();
      for (const p of unionKeys(cur, target)) {
        if (cur.get(p) === target.get(p)) continue;
        if (target.has(p)) { this.index.set(p, target.get(p)); this.writeWd(p, target.get(p)); }
        else { this.index.delete(p); this.deleteWd(p); }
      }
    }
    hardReset(target) {
      const tracked = new Set([...this.index.keys(), ...this.headTree().keys(), ...this.unmerged]);
      for (const p of tracked) if (!target.has(p)) this.deleteWd(p);
      for (const [p, c] of target) this.writeWd(p, c);
      this.index = new Map(target);
      this.unmerged.clear();
    }

    setHead(hash, msg) {
      if (this.head.type === 'branch') this.branches.set(this.head.name, hash);
      else this.head = { type: 'detached', hash };
      this.log(hash, msg);
    }
    log(hash, msg) { this.reflog.push({ hash, msg }); }

    newCommit(parents, tree, message, lane, author) {
      const w = this.w;
      w.seq++;
      w.clock += 97 + ((w.seq * 131) % 1800);
      const name = author ? author.name : w.cfg('user.name');
      const email = author ? author.email : w.cfg('user.email');
      const flat = [...tree].map((e) => e.join('\u0000')).join('\u0001');
      const hash = LG.fakeSha([parents.join(','), flat, message, name, w.clock, w.seq].join('|'));
      const c = { hash, parents: parents.slice(), tree: new Map(tree), message, author: name, email, time: w.clock, seq: w.seq, lane };
      this.commits.set(hash, c);
      return c;
    }
  }
  LG.Repo = Repo;

  // =====================================================================
  // World
  // =====================================================================
  const GIT_COMMANDS = ['init', 'clone', 'config', 'status', 'add', 'commit', 'log', 'show', 'diff', 'restore', 'reset',
    'rm', 'mv', 'branch', 'switch', 'checkout', 'merge', 'rebase', 'remote', 'push', 'fetch', 'pull', 'stash', 'tag',
    'revert', 'reflog', 'cherry-pick', 'blame', 'clean'];
  const EDITORS = ['nano', 'code', 'vim', 'vi', 'edit', 'notepad', 'emacs', 'micro'];
  const SHELL = ['help', 'clear', 'pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'mv', 'cp', 'tree', 'history',
    'whoami', 'date', 'exit', 'sudo', 'open', 'start', 'explorer', 'man'];
  const WINDOWS_CMD = { dir: 'ls', cls: 'clear', type: 'cat', copy: 'cp', del: 'rm', move: 'mv', md: 'mkdir', ren: 'mv' };

  class World {
    constructor(opts) {
      opts = opts || {};
      this.fs = new Map();
      this.repos = new Map();
      this.hosted = new Map();
      this.home = '/home/you';
      this.cwd = this.home;
      this.prevCwd = null;
      this.config = {};
      if (opts.identity !== false) { this.config['user.name'] = 'You'; this.config['user.email'] = 'you@example.com'; }
      if (opts.defaults !== false) { this.config['init.defaultbranch'] = 'main'; this.config['pull.rebase'] = 'false'; }
      this.seq = 0;
      this.clock = Date.UTC(2026, 8, 14, 9, 12, 5) / 1000;
      this.prs = [];
      this.history = [];
      this.teamCount = 0;
      ['/', '/home', this.home].forEach((d) => this.fs.set(d, { type: 'dir' }));
    }

    cfg(key) { return this.config[String(key).toLowerCase()]; }

    // ---------- file system ----------
    abs(p) { return normPath(p, this.cwd, this.home); }
    tilde(p) { return p === this.home ? '~' : p.startsWith(this.home + '/') ? '~' + p.slice(this.home.length) : p; }
    isDir(p) { const e = this.fs.get(p); return !!e && e.type === 'dir'; }
    isFile(p) { const e = this.fs.get(p); return !!e && e.type === 'file'; }
    read(p) { const e = this.fs.get(this.abs(p)); return e && e.type === 'file' ? e.content : null; }
    children(dir) {
      const pre = dir === '/' ? '/' : dir + '/';
      const out = [];
      for (const k of this.fs.keys()) {
        if (k !== dir && k.startsWith(pre) && !k.slice(pre.length).includes('/')) out.push(k.slice(pre.length));
      }
      return out.sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''), 'en', { sensitivity: 'base' }));
    }
    mkdirp(p) {
      let cur = '';
      for (const part of p.split('/').filter(Boolean)) {
        cur += '/' + part;
        if (!this.fs.has(cur)) this.fs.set(cur, { type: 'dir' });
      }
    }
    writeFile(p, content) { this.mkdirp(dirname(p)); this.fs.set(p, { type: 'file', content }); }
    removeTree(p) {
      for (const k of [...this.fs.keys()]) if (k === p || k.startsWith(p + '/')) this.fs.delete(k);
      for (const root of [...this.repos.keys()]) if (root === p || root.startsWith(p + '/')) this.repos.delete(root);
      if (basename(p) === '.git') this.repos.delete(dirname(p));
    }
    // scenario helpers
    put(path, content) { this.writeFile(this.abs(path), content); return this; }
    sh(...lines) {
      for (const l of lines) {
        const r = this.exec(l, true);
        if (r.code) throw new Error(`scenario step failed: ${l}\n` + r.lines.map((x) => x.map((s) => s[0]).join('')).join('\n'));
      }
      return this;
    }
    as(name, email, fn) {
      const n = this.config['user.name'], e = this.config['user.email'];
      this.config['user.name'] = name; this.config['user.email'] = email;
      try { fn(); } finally { this.config['user.name'] = n; this.config['user.email'] = e; }
      return this;
    }

    findRepo(from) {
      let p = from || this.cwd;
      for (;;) {
        if (this.repos.has(p)) return this.repos.get(p);
        if (p === '/') return null;
        p = dirname(p);
      }
    }
    repoAt(path) { return this.repos.get(this.abs(path)) || null; }

    // ---------- fake GitHub ----------
    canon(url) {
      const m = String(url || '').match(/^(?:https?:\/\/github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
      return m ? `https://github.com/${m[1]}/${m[2]}.git` : null;
    }
    hostedRepo(url) { const c = this.canon(url); return c ? this.hosted.get(c) || null : null; }
    host(slug) {
      const url = `https://github.com/${slug}.git`;
      const r = new Repo(this, { bare: true, url, name: slug });
      this.hosted.set(url, r);
      return r;
    }
    webUrl(url) { const c = this.canon(url); return c ? c.replace(/\.git$/, '') : url; }

    teammatePush(opts) {
      opts = opts || {};
      const repo = this.findRepo() || [...this.repos.values()][0];
      const url = opts.url || (repo && repo.remotes.get('origin'));
      const hosted = url ? this.hostedRepo(url) : [...this.hosted.values()][0];
      if (!hosted) return { error: "There's no GitHub repository to push to yet. Connect one with git remote add origin <url> and push first." };
      const branch = opts.branch || hosted.head.name;
      const tip = hosted.branches.get(branch);
      if (!tip) return { error: `The GitHub repository has no ${branch} branch yet. Push yours first.` };
      const tree = new Map(hosted.commits.get(tip).tree);
      let message;
      if (opts.edit) {
        if (!tree.has(opts.edit)) return { error: `${opts.edit} doesn't exist on GitHub's ${branch} branch.` };
        const lines = LG.splitLines(tree.get(opts.edit));
        lines[opts.line || 0] = opts.text;
        tree.set(opts.edit, lines.join('\n') + '\n');
        message = opts.message || `Update ${opts.edit}`;
      } else if (opts.put) {
        tree.set(opts.put.path, opts.put.content);
        message = opts.message || `Add ${opts.put.path}`;
      } else {
        this.teamCount++;
        const prev = tree.get('team-notes.md') || '# Team notes\n';
        tree.set('team-notes.md', prev + `- Sam: note number ${this.teamCount}\n`);
        message = opts.message || `Add team note ${this.teamCount}`;
      }
      const c = hosted.newCommit([tip], tree, message, branch, opts.author || { name: 'Sam', email: 'sam@example.com' });
      hosted.branches.set(branch, c.hash);
      return { hosted, commit: c, branch };
    }

    // ---------- running commands ----------
    prompt() {
      const repo = this.findRepo();
      let branch = null;
      if (repo) {
        branch = repo.branchName() || `(${short(repo.headHash())}...)`;
        if (repo.merging) branch += '|MERGING';
      }
      return { user: 'you', host: 'laptop', path: this.tilde(this.cwd), branch };
    }

    exec(line, silent) {
      const res = new Out();
      line = String(line).trim();
      if (!line) return res;
      if (/^\$\s+/.test(line)) {
        line = line.replace(/^\$\s+/, '');
        res.guide("(You don't type the $. It's just the prompt saying \"ready\". I ran the rest for you.)");
      }
      if (!silent) this.history.push(line);
      const t = tokenize(line);
      if (t.error) return res.fail('bash: unexpected end of file').guide('You opened a quote (" or \') and never closed it.');
      const cmds = [];
      let cur = { words: [], redirect: null, next: null };
      for (let k = 0; k < t.tokens.length; k++) {
        const tok = t.tokens[k];
        if (tok.op === '>' || tok.op === '>>') {
          const target = t.tokens[k + 1];
          if (!target || target.w === undefined) return res.fail("bash: syntax error near unexpected token `newline'");
          cur.redirect = { append: tok.op === '>>', path: target.w };
          k++;
          continue;
        }
        if (tok.op === '|') return res.fail('').guide("Pipes (|) aren't supported in this practice terminal. Run the commands one at a time.");
        if (tok.op) { cur.next = tok.op; cmds.push(cur); cur = { words: [], redirect: null, next: null }; continue; }
        cur.words.push(tok.w);
      }
      if (cur.words.length || cur.redirect) cmds.push(cur);
      let last = 0;
      for (let k = 0; k < cmds.length; k++) {
        if (k > 0) {
          const op = cmds[k - 1].next;
          if (op === '&&' && last !== 0) break;
          if (op === '||' && last === 0) break;
        }
        const r = this.runOne(cmds[k].words, cmds[k].redirect);
        if (r.clear) { res.clear = true; res.lines = []; }
        res.lines.push(...r.lines);
        last = r.code || 0;
        if (r.editor) { res.editor = r.editor; break; }
      }
      res.code = last;
      return res;
    }

    runOne(words, redirect) {
      if (!words.length) return new Out();
      const [cmd, ...args] = words;
      let r;
      if (cmd === 'git') r = this.git(args);
      else if (cmd === 'gh') r = this.gh(args);
      else if (cmd === 'sim') r = this.simCmd(args);
      else if (EDITORS.includes(cmd)) r = this.sh_editor(args, cmd);
      else if (SHELL.includes(cmd)) r = this['sh_' + cmd](args);
      else if (cmd === 'll') r = this.sh_ls(['-la', ...args]);
      else {
        r = new Out().fail(`bash: ${cmd}: command not found`);
        const low = cmd.toLowerCase();
        if (WINDOWS_CMD[low]) r.guide(`That's a Windows Command Prompt command. In Git Bash, macOS and Linux the equivalent is ${WINDOWS_CMD[low]}.`);
        else if (/^git[a-z]/i.test(cmd)) r.guide(`Missing a space? Try: git ${cmd.slice(3)}`);
        else {
          const best = closest(low, [...SHELL, 'git', 'gh', 'nano', 'ls']);
          if (best) r.guide(`Did you mean ${best}?`);
        }
      }
      if (redirect && r.code === 0 && !r.editor) {
        const abs = this.abs(redirect.path);
        if (this.isDir(abs)) return new Out().fail(`bash: ${redirect.path}: Is a directory`);
        if (!this.isDir(dirname(abs))) return new Out().fail(`bash: ${redirect.path}: No such file or directory`);
        const keep = r.lines.filter((l) => !(l.length === 1 && l[0][1] === 'guide'));
        const text = keep.map((l) => l.map((s) => s[0]).join('')).join('\n');
        const prev = redirect.append && this.isFile(abs) ? this.fs.get(abs).content : '';
        this.fs.set(abs, { type: 'file', content: prev + (keep.length ? text + (r.noNewline ? '' : '\n') : '') });
        r.lines = r.lines.filter((l) => l.length === 1 && l[0][1] === 'guide');
      }
      return r;
    }

    // ---------- editor support ----------
    saveEditor(ed, text) {
      if (ed.kind === 'commit') return ed.onSave(text);
      this.writeFile(ed.path, text === '' || text.endsWith('\n') ? text : text + '\n');
      return new Out().guide(`Saved ${ed.name}.`);
    }
    cancelEditor(ed) {
      if (ed.kind === 'commit') return new Out().fail('Aborting commit due to empty commit message.');
      return new Out().guide(`Closed ${ed.name} without saving.`);
    }

    // ---------- completion ----------
    complete(line) {
      const m = line.match(/^(.*?)(\S*)$/);
      const before = m[1], partial = m[2];
      const words = before.trim() ? before.trim().split(/\s+/) : [];
      let cands = [];
      if (!words.length) cands = [...SHELL, ...EDITORS, 'git', 'gh', 'sim'];
      else if (words[0] === 'git' && words.length === 1) cands = GIT_COMMANDS.slice();
      else if (words[0] === 'gh' && words.length === 1) cands = ['auth', 'repo', 'pr'];
      else if (words[0] === 'gh' && words.length === 2) cands = ({ auth: ['login', 'status'], repo: ['create', 'clone', 'list'], pr: ['create', 'list', 'view', 'merge', 'checkout'] })[words[1]] || [];
      else if (words[0] === 'sim' && words.length === 1) cands = ['teammate'];
      else {
        const slash = partial.lastIndexOf('/');
        const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : '';
        const dirAbs = this.abs(dirPart || '.');
        if (this.isDir(dirAbs)) {
          cands = this.children(dirAbs)
            .filter((n) => n !== '.git')
            .map((n) => dirPart + n + (this.isDir(join(dirAbs, n)) ? '/' : ''));
        }
        if (words[0] === 'git') {
          const repo = this.findRepo();
          if (repo) cands.push(...repo.branches.keys(), ...repo.remoteRefs.keys(), ...repo.tags.keys(), ...repo.remotes.keys());
        }
      }
      const hits = [...new Set(cands)].filter((c) => c.startsWith(partial)).sort();
      if (!hits.length) return { line, options: [] };
      if (hits.length === 1) return { line: before + hits[0] + (hits[0].endsWith('/') ? '' : ' '), options: [] };
      let pre = hits[0];
      for (const h of hits) while (!h.startsWith(pre)) pre = pre.slice(0, -1);
      return { line: before + pre, options: hits };
    }

    // =================================================================
    // shell commands
    // =================================================================
    sh_help() {
      return new Out().p([
        "This is a practice terminal. Nothing here touches your real computer.",
        '',
        'Shell:        pwd  ls  cd  mkdir  touch  cat  echo  rm  mv  cp  tree  clear  history',
        'Editors:      nano <file>   (code, vim and edit open the same simple editor)',
        'Git:          git <command>          type  git help  for the list',
        'GitHub CLI:   gh repo create | gh repo clone | gh pr create | gh pr list | gh pr merge',
        'Simulator:    sim teammate           a teammate pushes a commit to GitHub',
        '',
        'Keys:         Up/Down = earlier commands, Tab = finish a word, Ctrl+L = clear'
      ].join('\n'));
    }
    sh_clear() { const o = new Out(); o.clear = true; return o; }
    sh_pwd() { return new Out().p(this.cwd); }
    sh_whoami() { return new Out().p('you'); }
    sh_date() { return new Out().p(fmtDate(this.clock).replace(' +0000', ' UTC')); }
    sh_exit() { return new Out().guide("There's nowhere to exit to: this terminal lives inside the page. (In a real one, exit closes the window.)"); }
    sh_sudo() { return new Out().guide("No sudo needed here. In real life sudo runs a command as the administrator, so only use it when an install guide tells you to."); }
    sh_open() { return new Out().guide('On a real computer this would open the folder or file in your normal apps.'); }
    sh_start() { return this.sh_open(); }
    sh_explorer() { return this.sh_open(); }
    sh_man() { return new Out().guide('Manual pages open in a pager in a real terminal (press q to quit one). Here, try help or git help.'); }
    sh_history() {
      const o = new Out();
      this.history.forEach((h, i) => o.p(`${String(i + 1).padStart(4)}  ${h}`));
      return o;
    }

    sh_ls(args) {
      const o = new Out();
      const a = parse(args, []);
      const all = a.flags['-a'] || a.flags['-A'];
      const long = a.flags['-l'];
      const targets = a.pos.length ? a.pos : ['.'];
      targets.forEach((t, ti) => {
        const abs = this.abs(t);
        const e = this.fs.get(abs);
        if (!e) { o.fail(`ls: cannot access '${t}': No such file or directory`); return; }
        if (e.type === 'file') { o.p(t); return; }
        if (targets.length > 1) o.p(`${t}:`);
        let items;
        if (e.git) {
          items = ['HEAD', 'config', 'description', 'hooks/', 'index', 'info/', 'logs/', 'objects/', 'refs/'].map((n) => ({ n, d: n.endsWith('/') }));
          o.guide("This is git's private storage. You never need to edit anything in here by hand.");
        } else {
          items = this.children(abs).filter((n) => all || !n.startsWith('.')).map((n) => ({ n: n + (this.isDir(join(abs, n)) ? '/' : ''), d: this.isDir(join(abs, n)) }));
        }
        if (all && !e.git) items = [{ n: './', d: true }, { n: '../', d: true }, ...items];
        if (long) items.forEach((it) => o.seg([it.d ? 'drwxr-xr-x  you  ' : '-rw-r--r--  you  ', 'dim'], [it.n, it.d ? 'dir' : '']));
        else if (items.length) o.seg(...items.flatMap((it, i) => [[i ? '   ' : '', ''], [it.n, it.d ? 'dir' : '']]));
        if (targets.length > 1 && ti < targets.length - 1) o.p('');
      });
      return o;
    }

    sh_cd(args) {
      const o = new Out();
      if (args.length > 1) return o.fail('bash: cd: too many arguments').guide(`Folder names with spaces need quotes: cd "${args.join(' ')}"`);
      let t = args[0];
      if (t === '-') {
        if (!this.prevCwd) return o.fail('bash: cd: OLDPWD not set');
        t = this.prevCwd;
        o.p(t);
      }
      const abs = this.abs(t || '~');
      if (!this.fs.has(abs)) return o.fail(`bash: cd: ${t}: No such file or directory`);
      if (!this.isDir(abs)) return o.fail(`bash: cd: ${t}: Not a directory`);
      this.prevCwd = this.cwd;
      this.cwd = abs;
      return o;
    }

    sh_mkdir(args) {
      const o = new Out();
      const a = parse(args, []);
      if (!a.pos.length) return o.fail('mkdir: missing operand');
      for (const t of a.pos) {
        const abs = this.abs(t);
        if (this.fs.has(abs)) { if (!a.flags['-p']) o.fail(`mkdir: cannot create directory '${t}': File exists`); continue; }
        if (!a.flags['-p'] && !this.isDir(dirname(abs))) { o.fail(`mkdir: cannot create directory '${t}': No such file or directory`); continue; }
        this.mkdirp(abs);
      }
      if (a.pos.length > 1 && !o.code) o.guide(`That made ${a.pos.length} separate folders. If you wanted one folder with spaces in its name, wrap it in quotes.`);
      return o;
    }

    sh_touch(args) {
      const o = new Out();
      if (!args.length) return o.fail('touch: missing file operand');
      for (const t of args) {
        const abs = this.abs(t);
        if (this.fs.has(abs)) continue;
        if (!this.isDir(dirname(abs))) { o.fail(`touch: cannot touch '${t}': No such file or directory`); continue; }
        this.fs.set(abs, { type: 'file', content: '' });
      }
      return o;
    }

    sh_cat(args) {
      const o = new Out();
      if (!args.length) return o.fail('cat: missing file operand').guide('Give it a file name, like: cat notes.txt');
      for (const t of args) {
        const abs = this.abs(t);
        const parent = this.fs.get(dirname(abs));
        if (basename(abs) === 'HEAD' && parent && parent.git) {
          const repo = this.repos.get(dirname(dirname(abs)));
          o.p(repo.head.type === 'branch' ? `ref: refs/heads/${repo.head.name}` : repo.head.hash);
          continue;
        }
        const e = this.fs.get(abs);
        if (!e) { o.fail(`cat: ${t}: No such file or directory`); continue; }
        if (e.type === 'dir') { o.fail(`cat: ${t}: Is a directory`); continue; }
        LG.splitLines(e.content).forEach((l) => o.p(l, /^(<{7}|={7}$|>{7})/.test(l) ? 'r' : ''));
      }
      return o;
    }

    sh_echo(args) {
      const o = new Out();
      let e = false, n = false;
      const words = [];
      for (const w of args) {
        if (!words.length && w === '-e') { e = true; continue; }
        if (!words.length && w === '-n') { n = true; continue; }
        words.push(w);
      }
      let text = words.join(' ');
      if (e) text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      o.p(text);
      o.noNewline = n;
      return o;
    }

    sh_rm(args) {
      const o = new Out();
      const a = parse(args, []);
      const rec = a.flags['-r'] || a.flags['-R'] || a.flags['--recursive'];
      const force = a.flags['-f'] || a.flags['--force'];
      if (!a.pos.length) return o.fail('rm: missing operand');
      for (const t of a.pos) {
        const abs = this.abs(t);
        const e = this.fs.get(abs);
        if (!e) { if (!force) o.fail(`rm: cannot remove '${t}': No such file or directory`); continue; }
        if (e.type === 'dir' && !rec) { o.fail(`rm: cannot remove '${t}': Is a directory`).guide('Folders need -r (recursive): rm -r ' + t); continue; }
        if (abs === '/' || abs === this.home || this.cwd === abs || this.cwd.startsWith(abs + '/')) {
          o.fail(`rm: refusing to remove '${t}'`).guide("You're standing inside that folder (or it's your home). cd somewhere else first.");
          continue;
        }
        const wasGit = !!e.git;
        this.removeTree(abs);
        if (wasGit) o.guide('You deleted the .git folder, which WAS the repository: every commit and branch is gone. Your files are still here, but git no longer knows about them.');
      }
      return o;
    }

    sh_mv(args) {
      const o = new Out();
      const [src, dst] = args.filter((x) => !x.startsWith('-'));
      if (!src || !dst) return o.fail(src ? `mv: missing destination file operand after '${src}'` : 'mv: missing file operand');
      const sa = this.abs(src);
      let da = this.abs(dst);
      if (!this.fs.has(sa)) return o.fail(`mv: cannot stat '${src}': No such file or directory`);
      if (this.isDir(da)) da = join(da, basename(sa));
      if (!this.isDir(dirname(da))) return o.fail(`mv: cannot move '${src}' to '${dst}': No such file or directory`);
      if (da === sa) return o;
      if (da.startsWith(sa + '/')) return o.fail(`mv: cannot move '${src}' to a subdirectory of itself`);
      const moves = [...this.fs.entries()].filter(([k]) => k === sa || k.startsWith(sa + '/'));
      moves.forEach(([k]) => this.fs.delete(k));
      moves.forEach(([k, v]) => this.fs.set(da + k.slice(sa.length), v));
      for (const [root, repo] of [...this.repos]) {
        if (root === sa || root.startsWith(sa + '/')) {
          this.repos.delete(root);
          repo.root = da + root.slice(sa.length);
          this.repos.set(repo.root, repo);
        }
      }
      if (this.cwd === sa || this.cwd.startsWith(sa + '/')) this.cwd = da + this.cwd.slice(sa.length);
      return o;
    }

    sh_cp(args) {
      const o = new Out();
      const a = parse(args, []);
      const [src, dst] = a.pos;
      if (!src || !dst) return o.fail('cp: missing file operand');
      const sa = this.abs(src);
      let da = this.abs(dst);
      const e = this.fs.get(sa);
      if (!e) return o.fail(`cp: cannot stat '${src}': No such file or directory`);
      if (this.isDir(da)) da = join(da, basename(sa));
      if (!this.isDir(dirname(da))) return o.fail(`cp: cannot create regular file '${dst}': No such file or directory`);
      if (e.type === 'dir') {
        if (!a.flags['-r'] && !a.flags['-R']) return o.fail(`cp: -r not specified; omitting directory '${src}'`);
        for (const [k, v] of [...this.fs.entries()]) {
          if ((k === sa || k.startsWith(sa + '/')) && !k.includes('/.git')) this.fs.set(da + k.slice(sa.length), { ...v, git: false });
        }
        return o;
      }
      this.fs.set(da, { type: 'file', content: e.content });
      return o;
    }

    sh_tree(args) {
      const o = new Out();
      const t = args.filter((x) => !x.startsWith('-'))[0] || '.';
      const root = this.abs(t);
      if (!this.isDir(root)) return o.fail(`${t}  [error opening dir]`);
      o.seg([t, 'dir']);
      let dirs = 0, files = 0;
      const walk = (dir, prefix) => {
        const kids = this.children(dir).filter((n) => n !== '.git');
        kids.forEach((n, i) => {
          const last = i === kids.length - 1;
          const p = join(dir, n);
          const d = this.isDir(p);
          o.seg([prefix + (last ? '└── ' : '├── '), 'dim'], [n + (d ? '/' : ''), d ? 'dir' : '']);
          if (d) { dirs++; walk(p, prefix + (last ? '    ' : '│   ')); } else files++;
        });
      };
      walk(root, '');
      o.p('').p(`${LG.plural(dirs, 'directory', 'directories')}, ${LG.plural(files, 'file')}`);
      return o;
    }

    sh_editor(args, cmd) {
      const o = new Out();
      const t = args.filter((x) => !x.startsWith('-'))[0];
      if (!t) return o.fail(`${cmd}: give it a file name, like: ${cmd} notes.txt`);
      const abs = this.abs(t);
      if (this.isDir(abs)) return o.fail(`${cmd}: ${t} is a directory`);
      if (!this.isDir(dirname(abs))) return o.fail(`${cmd}: the folder for ${t} doesn't exist`);
      const exists = this.isFile(abs);
      if (cmd === 'vim' || cmd === 'vi') o.guide("Relax, this is a friendly stand-in, not real vim. (Real vim: press i to type, then Esc, then type :wq and Enter to save and quit.)");
      o.editor = { kind: 'file', title: `${cmd} ${t}${exists ? '' : '  (new file)'}`, path: abs, name: t, content: exists ? this.fs.get(abs).content : '' };
      return o;
    }

    // =================================================================
    // sim helpers
    // =================================================================
    simCmd(args) {
      const o = new Out();
      if (args[0] === 'teammate') {
        let opts = {};
        if (args[1] === 'conflict') {
          if (!args[2]) return o.fail('usage: sim teammate conflict <file>');
          opts = { edit: args[2], line: 0, text: "Sam's version of this line", message: `Rewrite the first line of ${args[2]}` };
        }
        const r = this.teammatePush(opts);
        if (r.error) return o.fail(r.error);
        return o.guide(`Sam, a teammate, just pushed a commit to ${r.branch} on GitHub: "${firstLine(r.commit.message)}". Your computer doesn't know yet. Try git fetch or git pull.`);
      }
      return o.p('Simulator helpers:\n  sim teammate                   a teammate pushes a new commit to GitHub\n  sim teammate conflict <file>   a teammate rewrites line 1 of <file> and pushes');
    }

    // =================================================================
    // git
    // =================================================================
    git(args) {
      const o = new Out();
      if (!args.length || ['help', '--help', '-h'].includes(args[0])) return this.gitHelp(o, args[1]);
      if (['--version', 'version', '-v'].includes(args[0])) return o.p('git version 2.51.0');
      const sub = args[0];
      if (!GIT_COMMANDS.includes(sub)) {
        const alias = this.cfg('alias.' + sub);
        if (alias) {
          const t = tokenize(alias);
          if (!t.error && !alias.startsWith('!')) return this.git([...t.tokens.filter((x) => x.w !== undefined).map((x) => x.w), ...args.slice(1)]);
        }
        o.fail(`git: '${sub}' is not a git command. See 'git --help'.`);
        const best = closest(sub, GIT_COMMANDS);
        if (best) o.p('').p('The most similar command is').p('\t' + best);
        return o;
      }
      let repo = null;
      if (!['init', 'clone', 'config'].includes(sub)) {
        repo = this.findRepo();
        if (!repo) {
          o.fail('fatal: not a git repository (or any of the parent directories): .git');
          o.guide(`You're in ${this.tilde(this.cwd)}, which isn't inside a repository. cd into your project folder, or run git init to turn this folder into one.`);
          return o;
        }
      }
      return this['git_' + sub.replace(/-/g, '_')](repo, args.slice(1), o) || o;
    }

    gitHelp(o, topic) {
      const desc = {
        clone: 'Clone a repository into a new directory', init: 'Create an empty Git repository or reinitialize an existing one',
        add: 'Add file contents to the index', mv: 'Move or rename a file, a directory, or a symlink', restore: 'Restore working tree files',
        rm: 'Remove files from the working tree and from the index', diff: 'Show changes between commits, commit and working tree, etc',
        log: 'Show commit logs', show: 'Show various types of objects', status: 'Show the working tree status',
        branch: 'List, create, or delete branches', commit: 'Record changes to the repository', merge: 'Join two or more development histories together',
        rebase: 'Reapply commits on top of another base tip', reset: 'Reset current HEAD to the specified state', switch: 'Switch branches',
        tag: 'Create, list, delete or verify a tag object', fetch: 'Download objects and refs from another repository',
        pull: 'Fetch from and integrate with another repository or a local branch', push: 'Update remote refs along with associated objects',
        stash: 'Stash the changes in a dirty working directory away', revert: 'Revert some existing commits', reflog: 'Manage reflog information',
        'cherry-pick': 'Apply the changes introduced by some existing commits', blame: 'Show what revision and author last modified each line of a file',
        clean: 'Remove untracked files from the working tree', checkout: 'Switch branches or restore working tree files',
        config: 'Get and set repository or global options', remote: 'Manage set of tracked repositories'
      };
      if (topic) {
        if (!desc[topic]) return o.fail(`No manual entry for git-${topic}`);
        return o.p(`git-${topic} - ${desc[topic]}`).guide(`A real terminal opens the full manual for git ${topic} here. The chapters and the cheat sheet in this guide cover the parts you need.`);
      }
      const groups = [
        ['start a working area', ['clone', 'init']],
        ['work on the current change', ['add', 'mv', 'restore', 'rm']],
        ['examine the history and state', ['diff', 'log', 'show', 'status']],
        ['grow, mark and tweak your common history', ['branch', 'commit', 'merge', 'rebase', 'reset', 'switch', 'tag']],
        ['collaborate', ['fetch', 'pull', 'push']]
      ];
      o.p('usage: git [-v | --version] [-h | --help] <command> [<args>]').p('').p('These are common Git commands used in various situations:');
      for (const [title, cmds] of groups) {
        o.p('').p(title);
        cmds.forEach((c) => o.p(`   ${c.padEnd(10)}${desc[c]}`));
      }
      o.p('').guide('Also working in this simulator: stash, revert, reflog, cherry-pick, blame, remote, config, checkout, clean.');
      return o;
    }

    decoSegs(repo, hash, noHead) {
      const parts = [];
      const hh = repo.headHash();
      const onBranch = repo.head.type === 'branch';
      if (hash === hh && !noHead) parts.push(onBranch ? [['HEAD -> ', 'c'], [repo.head.name, 'g']] : [['HEAD', 'c']]);
      for (const [n, h] of repo.branches) if (h === hash && !(onBranch && n === repo.head.name && hash === hh && !noHead)) parts.push([[n, 'g']]);
      for (const [n, h] of repo.remoteRefs) if (h === hash) parts.push([[n, 'r']]);
      for (const [n, t] of repo.tags) if (t.hash === hash) parts.push([['tag: ' + n, 'y']]);
      if (!parts.length) return [];
      const segs = [[' (', 'y']];
      parts.forEach((p, i) => { if (i) segs.push([', ', 'y']); segs.push(...p); });
      segs.push([')', 'y']);
      return segs;
    }

    relSpec(repo, spec) {
      const abs = this.abs(spec);
      if (abs === repo.root) return '';
      if (!abs.startsWith(repo.root + '/')) return null;
      return abs.slice(repo.root.length + 1);
    }
    matchSpec(p, rel) { return rel === '' || p === rel || p.startsWith(rel + '/'); }

    statLines(o, a, b, createModes) {
      const paths = unionKeys(a, b).filter((p) => a.get(p) !== b.get(p));
      if (!paths.length) return;
      const rows = paths.map((p) => {
        const ops = LG.diffLines(a.get(p) || '', b.get(p) || '');
        return { p, ins: ops.filter((x) => x.t === '+').length, del: ops.filter((x) => x.t === '-').length };
      });
      const w = Math.max(...rows.map((r) => r.p.length));
      const max = Math.max(...rows.map((r) => r.ins + r.del));
      const nw = String(max).length;
      const scale = max > 40 ? 40 / max : 1;
      rows.forEach((r) => o.seg(
        [` ${r.p.padEnd(w)} | ${String(r.ins + r.del).padStart(nw)} `],
        ['+'.repeat(Math.round(r.ins * scale)), 'g'],
        ['-'.repeat(Math.round(r.del * scale)), 'r']
      ));
      const ins = rows.reduce((s, r) => s + r.ins, 0), del = rows.reduce((s, r) => s + r.del, 0);
      let sum = ` ${LG.plural(rows.length, 'file')} changed`;
      if (ins || !del) sum += `, ${LG.plural(ins, 'insertion')}(+)`;
      if (del) sum += `, ${LG.plural(del, 'deletion')}(-)`;
      o.p(sum);
      if (createModes) paths.forEach((p) => { if (!a.has(p)) o.p(` create mode 100644 ${p}`); else if (!b.has(p)) o.p(` delete mode 100644 ${p}`); });
    }

    diffOut(o, a, b, only) {
      const paths = unionKeys(a, b)
        .filter((p) => a.get(p) !== b.get(p))
        .filter((p) => !only || !only.length || only.some((r) => this.matchSpec(p, r)));
      for (const p of paths) {
        const av = a.get(p), bv = b.get(p);
        o.p(`diff --git a/${p} b/${p}`, 'b');
        if (av === undefined) o.p('new file mode 100644', 'b').p(`index 0000000..${blob(bv)}`, 'b').p('--- /dev/null', 'b').p(`+++ b/${p}`, 'b');
        else if (bv === undefined) o.p('deleted file mode 100644', 'b').p(`index ${blob(av)}..0000000`, 'b').p(`--- a/${p}`, 'b').p('+++ /dev/null', 'b');
        else o.p(`index ${blob(av)}..${blob(bv)} 100644`, 'b').p(`--- a/${p}`, 'b').p(`+++ b/${p}`, 'b');
        for (const h of LG.hunks(LG.diffLines(av || '', bv || ''))) {
          o.p(h.header, 'c');
          h.lines.forEach((l) => o.p(l.t + l.s, l.t === '+' ? 'g' : l.t === '-' ? 'r' : ''));
        }
      }
    }

    aheadBehind(repo, a, b) { return [repo.between(b, a).length, repo.between(a, b).length]; }

    trackingInfo(repo, o) {
      const br = repo.branchName();
      const up = br && repo.upstream.get(br);
      if (!up) return;
      const ut = repo.remoteRefs.get(up);
      if (!ut) { o.p(`Your branch is based on '${up}', but the upstream is gone.\n  (use "git branch --unset-upstream" to fixup)`); return; }
      const [ah, bh] = this.aheadBehind(repo, repo.headHash(), ut);
      if (!ah && !bh) o.p(`Your branch is up to date with '${up}'.`);
      else if (ah && !bh) o.p(`Your branch is ahead of '${up}' by ${LG.plural(ah, 'commit')}.\n  (use "git push" to publish your local commits)`);
      else if (!ah && bh) o.p(`Your branch is behind '${up}' by ${LG.plural(bh, 'commit')}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)`);
      else o.p(`Your branch and '${up}' have diverged,\nand have ${ah} and ${bh} different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)`);
    }

    overwriteErr(o, paths, op) {
      o.fail(`error: Your local changes to the following files would be overwritten by ${op}:\n${paths.map((p) => '\t' + p).join('\n')}\nPlease commit your changes or stash them before you ${op === 'checkout' ? 'switch branches' : op}.\nAborting`);
      return o.guide('Git refuses rather than destroy work you have not committed. Commit it, or park it with git stash, then try again.');
    }

    // ---------- init / config ----------
    git_init(_, args, o) {
      const a = parse(args, ['-b', '--initial-branch']);
      const dir = a.pos[0] ? this.abs(a.pos[0]) : this.cwd;
      if (this.isFile(dir)) return o.fail(`fatal: cannot mkdir ${a.pos[0]}: File exists`);
      if (this.repos.has(dir)) return o.p(`Reinitialized existing Git repository in ${dir}/.git/`);
      const outer = this.findRepo(dir);
      const configured = this.cfg('init.defaultBranch');
      const chosen = a.flags['-b'] || a.flags['--initial-branch'];
      const branch = chosen || configured || 'master';
      if (!chosen && !configured) {
        ["Using 'master' as the name for the initial branch. This default branch name",
          'is subject to change. To configure the initial branch name to use in all',
          'of your new repositories, which will suppress this warning, call:', '',
          '\tgit config --global init.defaultBranch <name>', '',
          "Names commonly chosen instead of 'master' are 'main', 'trunk' and",
          "'development'. The just-created branch can be renamed via this command:", '',
          '\tgit branch -m <name>'].forEach((h) => o.p('hint: ' + h, 'y'));
      }
      this.mkdirp(dir);
      const repo = new Repo(this, { root: dir, branch });
      this.repos.set(dir, repo);
      this.fs.set(dir + '/.git', { type: 'dir', git: true });
      o.p(`Initialized empty Git repository in ${dir}/.git/`);
      if (outer) o.guide(`Careful: this folder is inside another repository (${this.tilde(outer.root)}). A repo inside a repo is almost never what you want.`);
      return o;
    }

    git_config(_, args, o) {
      const a = parse(args, ['--unset', '--get']);
      if (a.flags['--list'] || a.flags['-l']) {
        const keys = Object.keys(this.config).sort();
        keys.forEach((k) => o.p(`${k}=${this.config[k]}`));
        return o;
      }
      if (a.flags['--unset']) { delete this.config[String(a.flags['--unset']).toLowerCase()]; return o; }
      const key = a.flags['--get'] || a.pos[0];
      if (!key) return o.fail('error: no action specified').guide('Try: git config --global user.name "Your Name"');
      if (!/^[a-z][\w-]*(\.[^\s]+)?\.[a-z][\w-]*$/i.test(key)) return o.fail(`error: key does not contain a section: ${key}`);
      const vals = a.flags['--get'] ? [] : a.pos.slice(1);
      if (!vals.length) {
        const v = this.cfg(key);
        if (v === undefined) { o.code = 1; return o; }
        return o.p(v);
      }
      this.config[key.toLowerCase()] = vals[0];
      if (vals.length > 1) o.guide(`Only "${vals[0]}" was saved. Values with spaces need quotes: git config --global ${key} "${vals.join(' ')}"`);
      return o;
    }

    // ---------- status ----------
    git_status(repo, args, o) {
      const a = parse(args, []);
      const st = repo.status();
      const untrackedShown = [...new Set(st.untracked.map((p) => repo.collapse(p)))].sort();
      if (a.flags['-s'] || a.flags['--short']) {
        const sc = { 'new file': 'A', modified: 'M', deleted: 'D' };
        const paths = [...new Set([...st.staged, ...st.unstaged].map((x) => x.p))].sort();
        for (const p of paths) {
          const s = st.staged.find((x) => x.p === p), u = st.unstaged.find((x) => x.p === p);
          o.seg([s ? sc[s.k] : ' ', 'g'], [u ? sc[u.k] : ' ', 'r'], [' ' + p]);
        }
        st.unmerged.forEach((p) => o.seg(['UU', 'r'], [' ' + p]));
        untrackedShown.forEach((p) => o.seg(['??', 'r'], [' ' + p]));
        return o;
      }
      const br = repo.branchName();
      if (br) o.p(`On branch ${br}`);
      else o.p(`HEAD detached at ${short(repo.headHash())}`, 'r');
      this.trackingInfo(repo, o);
      if (!repo.headHash()) o.p('').p('No commits yet');
      if (repo.merging) {
        o.p('');
        if (st.unmerged.length) o.p('You have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)');
        else o.p('All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
      }
      if (st.staged.length) {
        o.p('').p('Changes to be committed:').p(repo.headHash() ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)');
        st.staged.forEach((s) => o.p(`\t${(s.k + ':').padEnd(12)}${s.p}`, 'g'));
      }
      if (st.unmerged.length) {
        o.p('').p('Unmerged paths:').p('  (use "git add <file>..." to mark resolution)');
        st.unmerged.forEach((p) => o.p(`\tboth modified:   ${p}`, 'r'));
      }
      if (st.unstaged.length) {
        o.p('').p('Changes not staged for commit:').p('  (use "git add <file>..." to update what will be committed)').p('  (use "git restore <file>..." to discard changes in working directory)');
        st.unstaged.forEach((s) => o.p(`\t${(s.k + ':').padEnd(12)}${s.p}`, 'r'));
      }
      if (untrackedShown.length) {
        o.p('').p('Untracked files:').p('  (use "git add <file>..." to include in what will be committed)');
        untrackedShown.forEach((p) => o.p('\t' + p, 'r'));
      }
      o.p('');
      if (!st.staged.length && !st.unstaged.length && !untrackedShown.length && !st.unmerged.length) {
        o.p(repo.headHash() ? 'nothing to commit, working tree clean' : 'nothing to commit (create/copy files and use "git add" to track)');
      } else if (!st.staged.length && st.unstaged.length) {
        o.p('no changes added to commit (use "git add" and/or "git commit -a")');
      } else if (!st.staged.length && !st.unstaged.length && untrackedShown.length && !st.unmerged.length) {
        o.p('nothing added to commit but untracked files present (use "git add" to track)');
      } else if (o.lines.length) o.lines.pop();
      return o;
    }

    // ---------- add ----------
    git_add(repo, args, o) {
      const a = parse(args, []);
      const force = a.flags['-f'] || a.flags['--force'];
      let specs = [...a.pos, ...a.paths];
      if ((a.flags['-A'] || a.flags['--all']) && !specs.length) specs = [repo.root];
      if (a.flags['-p'] || a.flags['--patch']) o.guide('git add -p lets you pick individual chunks of a file. The simulator stages whole files instead.');
      if (!specs.length) return o.fail("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?");
      const wd = repo.wd();
      const rules = repo.ignoreRules();
      const candidates = unionKeys(wd, repo.index);
      for (const p of repo.unmerged) if (!candidates.includes(p)) candidates.push(p);
      const ignoredHits = [];
      const resolved = [];
      for (const spec of specs) {
        const rel = this.relSpec(repo, spec);
        if (rel === null) return o.fail(`fatal: ${spec}: '${spec}' is outside repository at '${repo.root}'`);
        const re = /[*?]/.test(rel) ? LG.globRe(rel) : null;
        const matches = candidates.filter((p) => (re ? re.test(p) : this.matchSpec(p, rel)));
        if (!matches.length) {
          if (this.isDir(this.abs(spec))) continue;
          return o.fail(`fatal: pathspec '${spec}' did not match any files`);
        }
        let added = 0, skipped = 0;
        for (const p of matches) {
          if (!repo.index.has(p) && !repo.unmerged.has(p) && !force && repo.isIgnored(p, rules)) { skipped++; continue; }
          if (wd.has(p)) repo.index.set(p, wd.get(p));
          else repo.index.delete(p);
          if (repo.unmerged.delete(p)) resolved.push(p);
          added++;
        }
        if (!added && skipped) ignoredHits.push(rel || '.');
      }
      if (ignoredHits.length) {
        o.p('The following paths are ignored by one of your .gitignore files:');
        ignoredHits.forEach((p) => o.p(p));
        o.p('hint: Use -f if you really want to add them.', 'y');
        o.code = 1;
      }
      for (const p of resolved) {
        if (/^(<{7}|>{7}) /m.test(wd.get(p) || '')) o.guide(`Heads up: ${p} still contains conflict markers (<<<<<<< or >>>>>>>). Git will happily commit them, so open the file and clean it up first.`);
      }
      return o;
    }

    // ---------- commit ----------
    git_commit(repo, args, o) {
      const a = parse(args, ['-m', '--message', '-F', '-C']);
      const msgs = [...(a.multi['-m'] || []), ...(a.multi['--message'] || [])].filter((x) => x !== null);
      const amend = !!a.flags['--amend'];
      if (!this.cfg('user.name') || !this.cfg('user.email')) {
        return o.fail("Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email \"you@example.com\"\n  git config --global user.name \"Your Name\"\n\nto set your account's default identity.\nOmit --global to set the identity only in this repository.\n\nfatal: unable to auto-detect email address (got 'you@laptop.(none)')");
      }
      if (repo.unmerged.size) {
        return o.fail("error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.");
      }
      const headC = repo.headCommit();
      if (amend && !headC) return o.fail('fatal: You have nothing to amend.');
      if (amend && repo.merging) return o.fail('fatal: You are in the middle of a merge -- cannot amend.');
      if (a.flags['-a'] || a.flags['--all']) {
        const wd = repo.wd();
        for (const p of [...repo.index.keys()]) { if (wd.has(p)) repo.index.set(p, wd.get(p)); else repo.index.delete(p); }
      }
      const tree = new Map(repo.index);
      const parents = amend ? headC.parents.slice() : headC ? [headC.hash] : [];
      if (repo.merging) parents.push(repo.merging.theirs);
      const compare = amend ? repo.treeOf(headC.parents[0]) : repo.headTree();
      if (!amend && !repo.merging && !a.flags['--allow-empty'] && treesEqual(tree, repo.headTree())) {
        const st = repo.status();
        const br = repo.branchName();
        o.p(br ? `On branch ${br}` : `HEAD detached at ${short(repo.headHash())}`);
        this.trackingInfo(repo, o);
        if (st.unstaged.length) {
          o.p('Changes not staged for commit:');
          st.unstaged.forEach((s) => o.p(`\t${(s.k + ':').padEnd(12)}${s.p}`, 'r'));
          o.p('').p('no changes added to commit (use "git add" and/or "git commit -a")');
        } else if (st.untracked.length) {
          o.p('Untracked files:');
          [...new Set(st.untracked.map((p) => repo.collapse(p)))].forEach((p) => o.p('\t' + p, 'r'));
          o.p('').p('nothing added to commit but untracked files present (use "git add" to track)');
        } else o.p('nothing to commit, working tree clean');
        o.code = 1;
        if (st.unstaged.length || st.untracked.length) o.guide('Nothing is staged yet. git add the files you want in this commit first.');
        return o;
      }
      const wasMerging = repo.merging;
      const finish = (raw) => {
        const out = new Out();
        const msg = String(raw).split('\n').filter((l) => !l.startsWith('#')).join('\n').trim();
        if (!msg) return out.fail('Aborting commit due to empty commit message.');
        const author = amend ? { name: headC.author, email: headC.email } : null;
        const c = repo.newCommit(parents, tree, msg, amend ? headC.lane : repo.lane(), author);
        const root = parents.length === 0;
        repo.setHead(c.hash, (amend ? 'commit (amend): ' : root ? 'commit (initial): ' : wasMerging ? 'commit (merge): ' : 'commit: ') + firstLine(msg));
        repo.merging = null;
        out.p(`[${repo.branchName() || 'detached HEAD'}${root ? ' (root-commit)' : ''} ${short(c.hash)}] ${firstLine(msg)}`);
        if (amend) out.p(` Date: ${fmtDate(headC.time)}`);
        if (!wasMerging) this.statLines(out, compare, tree, true);
        return out;
      };
      let message = msgs.length ? msgs.join('\n\n') : null;
      if (amend && a.flags['--no-edit']) message = headC.message;
      if (message !== null) return finish(message);
      // No -m: real git opens your editor with a template. So do we.
      const st = repo.status();
      const tpl = [
        amend ? headC.message : wasMerging ? wasMerging.msg : '',
        '',
        '# Please enter the commit message for your changes. Lines starting',
        "# with '#' will be ignored, and an empty message aborts the commit.",
        '#',
        `# On branch ${repo.branchName() || '(detached HEAD)'}`,
        ...(st.staged.length ? ['# Changes to be committed:', ...st.staged.map((s) => `#\t${(s.k + ':').padEnd(12)}${s.p}`)] : []),
        '#'
      ].join('\n');
      o.editor = { kind: 'commit', title: 'COMMIT_EDITMSG  (git opened your editor for the commit message)', name: 'COMMIT_EDITMSG', content: tpl, onSave: finish, cursorTop: true };
      return o;
    }

    // ---------- log / show / diff ----------
    git_log(repo, args, o) {
      const a = parse(args, ['-n', '--max-count', '--author', '--grep']);
      const oneline = a.flags['--oneline'];
      const limit = a.flags['-n'] || a.flags['--max-count'] ? parseInt(a.flags['-n'] || a.flags['--max-count'], 10) : Infinity;
      let starts = [], exclude = new Set(), paths = a.paths.slice();
      if (a.flags['--all']) starts = [repo.headHash(), ...repo.refTips()].filter(Boolean);
      for (const spec of a.pos) {
        if (spec.includes('..')) {
          const [x, y] = spec.split(/\.\.\.?/);
          const hx = repo.resolve(x || 'HEAD'), hy = repo.resolve(y || 'HEAD');
          if (!hx || !hy) return o.fail(`fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.`);
          exclude = repo.ancestors(hx);
          starts.push(hy);
          continue;
        }
        const h = repo.resolve(spec);
        if (h) starts.push(h);
        else if (this.relSpec(repo, spec) !== null && (repo.headTree().has(this.relSpec(repo, spec)) || repo.wd().has(this.relSpec(repo, spec)))) paths.push(spec);
        else return o.fail(`fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'`);
      }
      if (!starts.length) {
        if (!repo.headHash()) return o.fail(`fatal: your current branch '${repo.branchName()}' does not have any commits yet`);
        starts = [repo.headHash()];
      }
      const seen = new Set();
      for (const s of starts) for (const h of repo.ancestors(s)) if (!exclude.has(h)) seen.add(h);
      let list = [...seen].map((h) => repo.commits.get(h)).filter(Boolean).sort((x, y) => y.seq - x.seq);
      const rels = paths.map((p) => this.relSpec(repo, p)).filter((x) => x !== null);
      if (rels.length) list = list.filter((c) => rels.some((r) => { const pt = repo.treeOf(c.parents[0]); return unionKeys(c.tree, pt).some((p) => this.matchSpec(p, r) && c.tree.get(p) !== pt.get(p)); }));
      if (a.flags['--author']) list = list.filter((c) => c.author.toLowerCase().includes(String(a.flags['--author']).toLowerCase()));
      if (a.flags['--grep']) list = list.filter((c) => c.message.toLowerCase().includes(String(a.flags['--grep']).toLowerCase()));
      list = list.slice(0, limit);
      list.forEach((c, i) => {
        if (oneline) { o.seg([short(c.hash), 'y'], ...this.decoSegs(repo, c.hash), [' ' + firstLine(c.message)]); return; }
        if (i) o.p('');
        o.seg(['commit ' + c.hash, 'y'], ...this.decoSegs(repo, c.hash));
        if (c.parents.length > 1) o.p('Merge: ' + c.parents.map(short).join(' '));
        o.p(`Author: ${c.author} <${c.email}>`);
        o.p(`Date:   ${fmtDate(c.time)}`);
        o.p('');
        c.message.split('\n').forEach((l) => o.p('    ' + l));
        if (a.flags['--stat'] && c.parents.length <= 1) { o.p(''); this.statLines(o, repo.treeOf(c.parents[0]), c.tree, false); }
      });
      if (a.flags['--graph']) o.guide('The simulator draws the graph as a picture in the panel instead of ASCII art. Real git prints * | / characters down the left side.');
      return o;
    }

    git_show(repo, args, o) {
      const a = parse(args, []);
      const spec = a.pos[0] || 'HEAD';
      const h = repo.resolve(spec);
      if (!h) return o.fail(repo.headHash() ? `fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.` : `fatal: your current branch '${repo.branchName()}' does not have any commits yet`);
      const tag = repo.tags.get(spec);
      if (tag && tag.annotated) o.p(`tag ${spec}`, 'y').p(`Tagger: ${tag.tagger} <${this.cfg('user.email')}>`).p(`Date:   ${fmtDate(tag.time)}`).p('').p(tag.message).p('');
      const c = repo.commits.get(h);
      o.seg(['commit ' + c.hash, 'y'], ...this.decoSegs(repo, c.hash));
      if (c.parents.length > 1) o.p('Merge: ' + c.parents.map(short).join(' '));
      o.p(`Author: ${c.author} <${c.email}>`).p(`Date:   ${fmtDate(c.time)}`).p('');
      c.message.split('\n').forEach((l) => o.p('    ' + l));
      if (c.parents.length <= 1) { o.p(''); if (a.flags['--stat']) this.statLines(o, repo.treeOf(c.parents[0]), c.tree); else this.diffOut(o, repo.treeOf(c.parents[0]), c.tree); }
      return o;
    }

    git_diff(repo, args, o) {
      const a = parse(args, []);
      const staged = a.flags['--staged'] || a.flags['--cached'];
      const refs = [], paths = a.paths.slice();
      for (const r of a.pos) { if (r.includes('..') || repo.resolve(r)) refs.push(r); else paths.push(r); }
      const rels = paths.map((p) => this.relSpec(repo, p)).filter((x) => x !== null);
      const tree = (spec) => { const h = repo.resolve(spec); return h ? repo.treeOf(h) : null; };
      const wdTracked = () => {
        const wd = repo.wd(), m = new Map();
        for (const p of [...repo.index.keys(), ...repo.unmerged]) if (wd.has(p)) m.set(p, wd.get(p));
        return m;
      };
      let from, to;
      if (refs.length === 1 && refs[0].includes('..')) {
        const [x, y] = refs[0].split(/\.\.\.?/);
        from = tree(x || 'HEAD'); to = tree(y || 'HEAD');
      } else if (refs.length >= 2) { from = tree(refs[0]); to = tree(refs[1]); }
      else if (refs.length === 1) { from = tree(refs[0]); to = staged ? new Map(repo.index) : wdTracked(); }
      else if (staged) { from = repo.headTree(); to = new Map(repo.index); }
      else { from = new Map(repo.index); to = wdTracked(); }
      if (!from || !to) return o.fail('fatal: bad revision');
      if (a.flags['--stat']) { this.statLines(o, from, to); return o; }
      this.diffOut(o, from, to, rels);
      if (!o.lines.length && !refs.length) {
        const st = repo.status();
        if (!staged && st.staged.length) o.guide('No output: your changes are already staged. git diff --staged shows staged changes.');
        else if (!staged && st.untracked.length) o.guide("No output: git diff doesn't show brand new (untracked) files. git add them, then use git diff --staged.");
        else if (staged && st.unstaged.length) o.guide('No output: nothing is staged yet. Plain git diff shows your unstaged changes.');
      }
      return o;
    }

    // ---------- restore / reset / rm / mv / clean ----------
    restorePaths(repo, specs, opt, o) {
      let src = null;
      if (opt.source) {
        const h = repo.resolve(opt.source);
        if (!h) return o.fail(`fatal: could not resolve ${opt.source}`);
        src = repo.treeOf(h);
      }
      const head = repo.headTree();
      const known = unionKeys(repo.index, head, src || new Map());
      let touched = false;
      for (const spec of specs) {
        const rel = this.relSpec(repo, spec);
        if (rel === null) return o.fail(`fatal: ${spec}: '${spec}' is outside repository at '${repo.root}'`);
        const re = /[*?]/.test(rel) ? LG.globRe(rel) : null;
        const matches = known.filter((p) => (re ? re.test(p) : this.matchSpec(p, rel)));
        if (!matches.length) return o.fail(`error: pathspec '${spec}' did not match any file(s) known to git`);
        for (const p of matches) {
          if (opt.staged) {
            const from = src || head;
            if (from.has(p)) repo.index.set(p, from.get(p)); else repo.index.delete(p);
            repo.unmerged.delete(p);
          }
          if (opt.worktree) {
            const from = src || repo.index;
            const before = repo.wd().get(p);
            if (from.has(p)) repo.writeWd(p, from.get(p));
            else if (src) repo.deleteWd(p);
            if (repo.wd().get(p) !== before) touched = true;
          }
        }
      }
      if (touched && !src) o.guide('Those edits are gone for good: they were never committed, so git has no copy of them.');
      return o;
    }

    git_restore(repo, args, o) {
      const a = parse(args, ['--source', '-s']);
      const staged = !!(a.flags['--staged'] || a.flags['-S']);
      const worktree = !!(a.flags['--worktree'] || a.flags['-W']) || !staged;
      const specs = [...a.pos, ...a.paths];
      if (!specs.length) return o.fail('fatal: you must specify path(s) to restore');
      if (staged && !repo.headHash() && !a.flags['--source']) return o.fail('fatal: could not resolve HEAD').guide("There are no commits yet, so there's nothing to restore from. To unstage a file in a brand new repo use: git rm --cached <file>");
      return this.restorePaths(repo, specs, { source: a.flags['--source'] || a.flags['-s'], staged, worktree }, o);
    }

    git_reset(repo, args, o) {
      const a = parse(args, []);
      const mode = a.flags['--soft'] ? 'soft' : a.flags['--hard'] ? 'hard' : 'mixed';
      let refArg = a.pos[0] || null;
      let paths = a.paths.slice();
      if (refArg && !repo.resolve(refArg)) {
        const rel = this.relSpec(repo, refArg);
        if (rel !== null && (repo.index.has(rel) || repo.headTree().has(rel) || [...repo.index.keys()].some((p) => p.startsWith(rel + '/')))) { paths = a.pos.slice(); refArg = null; }
      } else if (a.pos.length > 1) paths.push(...a.pos.slice(1));
      if (paths.length) {
        const src = refArg ? repo.treeOf(repo.resolve(refArg)) : repo.headTree();
        for (const spec of paths) {
          const rel = this.relSpec(repo, spec);
          for (const p of unionKeys(repo.index, src).filter((q) => this.matchSpec(q, rel))) {
            if (src.has(p)) repo.index.set(p, src.get(p)); else repo.index.delete(p);
            repo.unmerged.delete(p);
          }
        }
        const st = repo.status();
        if (st.unstaged.length) { o.p('Unstaged changes after reset:'); st.unstaged.forEach((s) => o.p(`${s.k === 'deleted' ? 'D' : 'M'}\t${s.p}`)); }
        return o;
      }
      const target = refArg ? repo.resolve(refArg) : repo.headHash();
      if (!target) {
        if (!refArg) { if (mode === 'hard') repo.hardReset(new Map()); else repo.index = new Map(); return o; }
        return o.fail(`fatal: ambiguous argument '${refArg}': unknown revision or path not in the working tree.`);
      }
      if (mode === 'soft' && repo.merging) return o.fail('fatal: Cannot do a soft reset in the middle of a merge.');
      const tc = repo.commits.get(target);
      repo.origHead = repo.headHash();
      if (mode === 'hard') repo.hardReset(tc.tree);
      else if (mode === 'mixed') { repo.index = new Map(tc.tree); repo.unmerged.clear(); }
      repo.setHead(target, `reset: moving to ${refArg || 'HEAD'}`);
      repo.merging = null;
      if (mode === 'hard') o.p(`HEAD is now at ${short(target)} ${firstLine(tc.message)}`);
      else if (mode === 'mixed') {
        const st = repo.status();
        if (st.unstaged.length) { o.p('Unstaged changes after reset:'); st.unstaged.forEach((s) => o.p(`${s.k === 'deleted' ? 'D' : 'M'}\t${s.p}`)); }
      }
      return o;
    }

    git_rm(repo, args, o) {
      const a = parse(args, []);
      const cached = a.flags['--cached'], rec = a.flags['-r'], force = a.flags['-f'] || a.flags['--force'];
      const specs = [...a.pos, ...a.paths];
      if (!specs.length) return o.fail('usage: git rm [<options>] [--] <file>...');
      const wd = repo.wd(), head = repo.headTree();
      const todo = [];
      for (const spec of specs) {
        const rel = this.relSpec(repo, spec);
        const matches = [...repo.index.keys()].filter((p) => this.matchSpec(p, rel)).sort();
        if (!matches.length || rel === null) return o.fail(`fatal: pathspec '${spec}' did not match any files`);
        if (matches.some((p) => p !== rel) && !rec) return o.fail(`fatal: not removing '${spec}' recursively without -r`);
        todo.push(...matches);
      }
      if (!cached && !force) {
        const dirty = todo.filter((p) => (wd.has(p) && wd.get(p) !== repo.index.get(p)) || (head.has(p) && repo.index.get(p) !== head.get(p)));
        if (dirty.length) return o.fail(`error: the following file${dirty.length > 1 ? 's have' : ' has'} local modifications:\n${dirty.map((p) => '    ' + p).join('\n')}\n(use --cached to keep the file, or -f to force removal)`);
      }
      for (const p of todo) {
        repo.index.delete(p);
        if (!cached) repo.deleteWd(p);
        o.p(`rm '${p}'`);
      }
      if (cached) o.guide("The file stays on your disk, but git stops tracking it once you commit. Add it to .gitignore so it can't sneak back in.");
      return o;
    }

    git_mv(repo, args, o) {
      const a = parse(args, []);
      const [src, dst] = a.pos;
      if (!src || !dst) return o.fail('usage: git mv [<options>] <source>... <destination>');
      const rs = this.relSpec(repo, src);
      let rd = this.relSpec(repo, dst);
      if (rs === null || rd === null) return o.fail('fatal: bad source or destination');
      if (!repo.index.has(rs)) return o.fail(`fatal: not under version control, source=${rs}, destination=${rd}`);
      if (this.isDir(this.abs(dst))) rd = rd ? rd + '/' + basename(rs) : basename(rs);
      const content = repo.wd().get(rs);
      if (content === undefined) return o.fail(`fatal: bad source, source=${rs}, destination=${rd}`);
      repo.deleteWd(rs);
      repo.writeWd(rd, content);
      repo.index.set(rd, repo.index.get(rs));
      repo.index.delete(rs);
      return o;
    }

    git_clean(repo, args, o) {
      const a = parse(args, []);
      const dry = a.flags['-n'] || a.flags['--dry-run'];
      const force = a.flags['-f'] || a.flags['--force'];
      if (!dry && !force) return o.fail('fatal: clean.requireForce is true and -f not given: refusing to clean').guide('git clean deletes untracked files for good. Preview with git clean -n, then run git clean -f (add -d to include folders).');
      const rules = repo.ignoreRules();
      const done = new Set();
      for (const p of [...repo.wd().keys()].sort()) {
        if (repo.index.has(p)) continue;
        if (!a.flags['-x'] && repo.isIgnored(p, rules)) continue;
        const label = repo.collapse(p);
        if (label !== p && !a.flags['-d']) continue;
        if (done.has(label)) continue;
        done.add(label);
        o.p(`${dry ? 'Would remove' : 'Removing'} ${label}`);
        if (!dry) { if (label.endsWith('/')) this.removeTree(repo.root + '/' + label.slice(0, -1)); else repo.deleteWd(p); }
      }
      return o;
    }

    // ---------- branches ----------
    git_branch(repo, args, o) {
      const a = parse(args, ['--set-upstream-to', '-u']);
      const cur = repo.branchName();
      if (a.flags['-d'] || a.flags['-D'] || a.flags['--delete']) {
        if (!a.pos.length) return o.fail('fatal: branch name required');
        for (const name of a.pos) {
          if (a.flags['-r']) {
            const h = repo.remoteRefs.get(name);
            if (!h) { o.fail(`error: remote-tracking branch '${name}' not found`); continue; }
            repo.remoteRefs.delete(name);
            o.p(`Deleted remote-tracking branch ${name} (was ${short(h)}).`);
            continue;
          }
          if (!repo.branches.has(name)) { o.fail(`error: branch '${name}' not found`); continue; }
          if (name === cur) { o.fail(`error: cannot delete branch '${name}' used by worktree at '${repo.root}'`).guide(`You're standing on ${name}. Switch to another branch first (git switch main), then delete it.`); continue; }
          const tip = repo.branches.get(name);
          const up = repo.upstream.get(name);
          const upTip = up ? repo.remoteRefs.get(up) : null;
          const merged = repo.isAncestor(tip, repo.headHash()) || (upTip && repo.isAncestor(tip, upTip));
          if (!merged && !a.flags['-D'] && !a.flags['-f']) {
            o.fail(`error: the branch '${name}' is not fully merged\nhint: If you are sure you want to delete it, run 'git branch -D ${name}'`);
            o.guide(`That branch has commits that aren't on ${cur || 'this branch'}. Deleting it would orphan them. -D forces it anyway.`);
            continue;
          }
          repo.branches.delete(name);
          repo.upstream.delete(name);
          o.p(`Deleted branch ${name} (was ${short(tip)}).`);
        }
        return o;
      }
      if (a.flags['-m'] || a.flags['-M']) {
        const [from, to] = a.pos.length >= 2 ? a.pos : [cur, a.pos[0]];
        if (!to) return o.fail('fatal: branch name required');
        if (!validName(to)) return o.fail(`fatal: '${to}' is not a valid branch name`);
        if (repo.branches.has(to) && !a.flags['-M']) return o.fail(`fatal: a branch named '${to}' already exists`);
        if (from === cur && !repo.branches.has(from)) { repo.head = { type: 'branch', name: to }; return o; }
        if (!repo.branches.has(from)) return o.fail(`error: refname refs/heads/${from} not found\nfatal: branch rename failed`);
        const h = repo.branches.get(from);
        repo.branches.delete(from);
        repo.branches.set(to, h);
        if (repo.upstream.has(from)) { repo.upstream.set(to, repo.upstream.get(from)); repo.upstream.delete(from); }
        if (cur === from) repo.head = { type: 'branch', name: to };
        return o;
      }
      const upArg = a.flags['--set-upstream-to'] || a.flags['-u'];
      if (upArg) {
        if (!repo.remoteRefs.has(upArg)) return o.fail(`error: the requested upstream branch '${upArg}' does not exist`);
        const b = a.pos[0] || cur;
        repo.upstream.set(b, upArg);
        return o.p(`branch '${b}' set up to track '${upArg}'.`);
      }
      if (a.pos.length) {
        const name = a.pos[0];
        if (!validName(name)) return o.fail(`fatal: '${name}' is not a valid branch name`).guide('Branch names cannot contain spaces or characters like ~ ^ : ? * [. Use dashes: my-new-idea');
        if (repo.branches.has(name)) return o.fail(`fatal: a branch named '${name}' already exists`);
        const start = a.pos[1] || 'HEAD';
        const h = repo.resolve(start);
        if (!h) {
          o.fail(`fatal: not a valid object name: '${a.pos[1] || cur}'`);
          if (!repo.headHash()) o.guide("A branch points at a commit, and this repository doesn't have any commits yet. Make your first commit, then create branches.");
          return o;
        }
        repo.branches.set(name, h);
        if (repo.remoteRefs.has(start)) { repo.upstream.set(name, start); o.p(`branch '${name}' set up to track '${start}'.`); }
        o.guide(`Created ${name}, but you're still on ${cur || 'a detached HEAD'}. git switch ${name} moves you onto it.`);
        return o;
      }
      const showRemote = a.flags['-r'] || a.flags['--remotes'];
      const showAll = a.flags['-a'] || a.flags['--all'];
      const verbose = a.flags['-v'] || a.flags['--verbose'];
      if (!showRemote) {
        if (repo.head.type === 'detached') o.seg(['* ', 'g'], [`(HEAD detached at ${short(repo.headHash())})`, 'g']);
        for (const n of [...repo.branches.keys()].sort()) {
          const isCur = n === cur;
          const segs = [[isCur ? '* ' : '  ', isCur ? 'g' : ''], [n, isCur ? 'g' : '']];
          if (verbose) {
            const h = repo.branches.get(n);
            const up = repo.upstream.get(n);
            let track = '';
            if (up && repo.remoteRefs.get(up)) {
              const [ah, bh] = this.aheadBehind(repo, h, repo.remoteRefs.get(up));
              const bits = [ah ? `ahead ${ah}` : '', bh ? `behind ${bh}` : ''].filter(Boolean).join(', ');
              track = ` [${up}${bits ? ': ' + bits : ''}]`;
            }
            segs.push([' ' + short(h), 'y'], [track, 'c'], [' ' + firstLine(repo.commits.get(h).message)]);
          }
          o.seg(...segs);
        }
      }
      if (showRemote || showAll) for (const n of [...repo.remoteRefs.keys()].sort()) o.seg(['  '], [(showAll ? 'remotes/' : '') + n, 'r']);
      if (!o.lines.length && !repo.headHash()) o.guide(`No branches to list yet. '${cur}' will show up after your first commit.`);
      return o;
    }

    createAndSwitch(repo, name, start, o, force) {
      if (typeof name !== 'string' || !name) return o.fail("error: option requires a value (the new branch name)");
      if (!validName(name)) return o.fail(`fatal: '${name}' is not a valid branch name`).guide('Branch names cannot contain spaces or characters like ~ ^ : ? * [. Use dashes: my-new-idea');
      if (repo.branches.has(name) && !force) return o.fail(`fatal: a branch named '${name}' already exists`);
      const startSpec = start || 'HEAD';
      const h = repo.resolve(startSpec);
      if (!h) {
        if (!repo.headHash() && !start) { repo.head = { type: 'branch', name }; return o.p(`Switched to a new branch '${name}'`); }
        return o.fail(`fatal: invalid reference: ${startSpec}`);
      }
      const tc = repo.commits.get(h);
      const bl = repo.blockers(tc.tree);
      if (bl.length) return this.overwriteErr(o, bl, 'checkout');
      const from = repo.branchName() || short(repo.headHash());
      repo.moveTo(tc.tree);
      repo.branches.set(name, h);
      if (repo.branchName()) repo.prevBranch = repo.branchName();
      repo.head = { type: 'branch', name };
      repo.log(h, `checkout: moving from ${from} to ${name}`);
      if (repo.remoteRefs.has(startSpec)) { repo.upstream.set(name, startSpec); o.p(`branch '${name}' set up to track '${startSpec}'.`); }
      o.p(`Switched to a new branch '${name}'`);
      return o;
    }

    switchBranch(repo, name, o) {
      if (repo.head.type === 'branch' && repo.head.name === name) { o.p(`Already on '${name}'`); this.trackingInfo(repo, o); return o; }
      if (repo.unmerged.size) return o.fail(`error: you need to resolve your current index first\n${[...repo.unmerged].map((p) => p + ': needs merge').join('\n')}`);
      const h = repo.branches.get(name);
      const tc = repo.commits.get(h);
      const bl = repo.blockers(tc.tree);
      if (bl.length) return this.overwriteErr(o, bl, 'checkout');
      const leaving = repo.head.type === 'detached' ? repo.headHash() : null;
      const from = repo.branchName() || short(repo.headHash());
      repo.moveTo(tc.tree);
      if (repo.branchName()) repo.prevBranch = repo.branchName();
      repo.head = { type: 'branch', name };
      repo.log(h, `checkout: moving from ${from} to ${name}`);
      if (leaving) {
        const kept = new Set();
        for (const t of repo.refTips()) for (const x of repo.ancestors(t)) kept.add(x);
        const lost = [...repo.ancestors(leaving)].filter((x) => !kept.has(x));
        if (lost.length) {
          const lc = repo.commits.get(leaving);
          o.p(`Warning: you are leaving ${LG.plural(lost.length, 'commit')} behind, not connected to\nany of your branches:\n\n  ${short(leaving)} ${firstLine(lc.message)}\n\nIf you want to keep it by creating a new branch, this may be a good time\nto do so with:\n\n git branch <new-branch-name> ${short(leaving)}\n`, 'y');
        }
      }
      const st = repo.status();
      [...st.staged, ...st.unstaged].forEach((s) => o.p(`${s.k === 'deleted' ? 'D' : s.k === 'new file' ? 'A' : 'M'}\t${s.p}`));
      o.p(`Switched to branch '${name}'`);
      this.trackingInfo(repo, o);
      return o;
    }

    detachTo(repo, h, spec, o) {
      const tc = repo.commits.get(h);
      const bl = repo.blockers(tc.tree);
      if (bl.length) return this.overwriteErr(o, bl, 'checkout');
      const from = repo.branchName() || short(repo.headHash());
      repo.moveTo(tc.tree);
      if (repo.branchName()) repo.prevBranch = repo.branchName();
      repo.head = { type: 'detached', hash: h };
      repo.log(h, `checkout: moving from ${from} to ${spec}`);
      o.p(`Note: switching to '${spec}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n  git switch -c <new-branch-name>\n\nOr undo this operation with:\n\n  git switch -\n`, 'y');
      o.p(`HEAD is now at ${short(h)} ${firstLine(tc.message)}`);
      return o;
    }

    git_switch(repo, args, o) {
      const a = parse(args, ['-c', '-C', '--create']);
      const create = a.flags['-c'] !== undefined ? a.flags['-c'] : a.flags['-C'] !== undefined ? a.flags['-C'] : a.flags['--create'];
      if (create !== undefined) return this.createAndSwitch(repo, create, a.pos[0], o, a.flags['-C'] !== undefined);
      if (a.flags['--detach'] || a.flags['-d']) {
        const spec = a.pos[0] || 'HEAD';
        const h = repo.resolve(spec);
        if (!h) return o.fail(`fatal: invalid reference: ${spec}`);
        return this.detachTo(repo, h, spec, o);
      }
      let target = a.pos[0];
      if (!target) return o.fail('fatal: missing branch or commit argument');
      if (target === '-') {
        target = repo.prevBranch;
        if (!target) return o.fail('fatal: invalid reference: @{-1}');
      }
      if (repo.branches.has(target)) return this.switchBranch(repo, target, o);
      if (repo.remoteRefs.has('origin/' + target)) return this.createAndSwitch(repo, target, 'origin/' + target, o);
      if (!repo.headHash() && target === repo.branchName()) return o.p(`Already on '${target}'`);
      if (repo.resolve(target)) return o.fail(`fatal: a branch is expected, got commit '${target}'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.`);
      return o.fail(`fatal: invalid reference: ${target}`).guide(`There's no branch called ${target}. To create it and switch to it in one go: git switch -c ${target}`);
    }

    git_checkout(repo, args, o) {
      const a = parse(args, ['-b', '-B']);
      if (a.flags['-b'] !== undefined || a.flags['-B'] !== undefined) {
        return this.createAndSwitch(repo, a.flags['-b'] !== undefined ? a.flags['-b'] : a.flags['-B'], a.pos[0], o, a.flags['-B'] !== undefined);
      }
      const first = a.pos[0];
      const isRef = (s) => s === '-' || repo.branches.has(s) || repo.remoteRefs.has('origin/' + s) || !!repo.resolve(s);
      if (a.paths.length || (first && !isRef(first))) {
        const src = a.paths.length && first ? first : null;
        const paths = a.paths.length ? a.paths : a.pos;
        return this.restorePaths(repo, paths, { source: src, worktree: true, staged: !!src }, o);
      }
      if (!first) { this.trackingInfo(repo, o); return o; }
      if (first === '-') { if (!repo.prevBranch) return o.fail("error: pathspec '-' did not match any file(s) known to git"); return this.switchBranch(repo, repo.prevBranch, o); }
      if (repo.branches.has(first)) return this.switchBranch(repo, first, o);
      if (repo.remoteRefs.has('origin/' + first)) return this.createAndSwitch(repo, first, 'origin/' + first, o);
      return this.detachTo(repo, repo.resolve(first), first, o);
    }

    // ---------- merge / rebase / cherry-pick / revert ----------
    mergeMsg(repo, name) {
      const cur = repo.branchName();
      let m = repo.remoteRefs.has(name) ? `Merge remote-tracking branch '${name}'` : `Merge branch '${name}'`;
      if (cur && cur !== 'main' && cur !== 'master') m += ` into ${cur}`;
      return m;
    }

    git_merge(repo, args, o) {
      const a = parse(args, ['-m']);
      if (a.flags['--abort']) {
        if (!repo.merging) return o.fail('fatal: There is no merge to abort (MERGE_HEAD missing).');
        repo.hardReset(repo.headTree());
        repo.merging = null;
        return o;
      }
      if (a.flags['--continue']) return this.git_commit(repo, [], o);
      if (repo.merging || repo.unmerged.size) return o.fail("error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.");
      const name = a.pos[0];
      if (!name) return o.fail('fatal: No remote for the current branch.').guide('Tell git which branch to merge in, like: git merge feature');
      const theirs = repo.resolve(name);
      if (!theirs) return o.fail(`merge: ${name} - not something we can merge`);
      return this.doMerge(repo, theirs, name, o, { noff: a.flags['--no-ff'], ffOnly: a.flags['--ff-only'], msg: a.flags['-m'], squash: a.flags['--squash'] });
    }

    doMerge(repo, theirs, name, o, opt) {
      opt = opt || {};
      const ours = repo.headHash();
      const tC = repo.commits.get(theirs);
      const verb = opt.reflogVerb || `merge ${name}`;
      if (!ours) {
        repo.moveTo(tC.tree);
        repo.setHead(theirs, `${verb}: Fast-forward`);
        return o;
      }
      if (repo.isAncestor(theirs, ours)) return o.p('Already up to date.');
      const oC = repo.commits.get(ours);
      if (repo.isAncestor(ours, theirs) && !opt.noff && !opt.squash) {
        const bl = repo.blockers(tC.tree);
        if (bl.length) return this.overwriteErr(o, bl, 'merge');
        o.p(`Updating ${short(ours)}..${short(theirs)}`).p('Fast-forward');
        this.statLines(o, oC.tree, tC.tree, true);
        repo.moveTo(tC.tree);
        repo.setHead(theirs, `${verb}: Fast-forward`);
        return o;
      }
      if (opt.ffOnly) return o.fail('fatal: Not possible to fast-forward, aborting.');
      const baseH = repo.mergeBase(ours, theirs);
      const mt = mergeTrees(repo.treeOf(baseH), oC.tree, tC.tree, 'HEAD', name);
      const bl = repo.blockers(mt.tree).filter((p) => oC.tree.get(p) !== mt.tree.get(p));
      if (bl.length) return this.overwriteErr(o, bl, 'merge');
      mt.notes.forEach((n) => o.p(n, n.startsWith('CONFLICT') ? 'err' : ''));
      for (const p of unionKeys(oC.tree, mt.tree)) {
        if (oC.tree.get(p) === mt.tree.get(p)) continue;
        if (mt.conflicts.includes(p)) { repo.writeWd(p, mt.tree.get(p)); continue; }
        if (mt.tree.has(p)) { repo.index.set(p, mt.tree.get(p)); repo.writeWd(p, mt.tree.get(p)); }
        else { repo.index.delete(p); repo.deleteWd(p); }
      }
      if (opt.squash) {
        o.p('Squash commit -- not updating HEAD').guide('All their changes are now staged as one lump. Run git commit to make them a single new commit.');
        return o;
      }
      if (mt.conflicts.length) {
        mt.conflicts.forEach((p) => repo.unmerged.add(p));
        repo.merging = { theirs, name, msg: opt.msg || opt.defaultMsg || this.mergeMsg(repo, name) };
        o.fail('Automatic merge failed; fix conflicts and then commit the result.');
        o.guide(`Nothing is broken. Open ${mt.conflicts.join(', ')} (for example: nano ${mt.conflicts[0]}), keep the lines you want, delete the <<<<<<< ======= >>>>>>> markers, save, then git add ${mt.conflicts[0]} and git commit.`);
        return o;
      }
      const c = repo.newCommit([ours, theirs], mt.tree, opt.msg || opt.defaultMsg || this.mergeMsg(repo, name), repo.lane());
      repo.setHead(c.hash, `${verb}: Merge made by the 'ort' strategy.`);
      o.p("Merge made by the 'ort' strategy.");
      this.statLines(o, oC.tree, mt.tree, true);
      return o;
    }

    git_rebase(repo, args, o) {
      const a = parse(args, []);
      if (a.flags['--continue'] || a.flags['--abort'] || a.flags['--skip']) return o.fail('fatal: No rebase in progress?');
      if (a.flags['-i'] || a.flags['--interactive']) return o.fail('').guide('Interactive rebase (git rebase -i) opens a to-do list in your editor where you reorder, squash, reword or drop commits. The simulator skips it; the Rebase chapter walks through it.');
      const br = repo.branchName();
      const upSpec = a.pos[0] || (br && repo.upstream.get(br));
      if (!upSpec) return o.fail('There is no tracking information for the current branch.\nPlease specify which branch you want to rebase against.');
      const up = repo.resolve(upSpec);
      if (!up) return o.fail(`fatal: invalid upstream '${upSpec}'`);
      return this.doRebase(repo, up, upSpec, o);
    }

    doRebase(repo, up, upSpec, o) {
      const st = repo.status();
      if (st.staged.length || st.unstaged.length || repo.merging) return o.fail('error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.');
      const head = repo.headHash();
      const br = repo.branchName();
      if (!head) return o.fail('fatal: no commits to rebase');
      if (repo.isAncestor(up, head)) return o.p(`Current branch ${br || 'HEAD'} is up to date.`);
      const finish = (tip) => {
        repo.moveTo(repo.commits.get(tip).tree);
        repo.setHead(tip, `rebase (finish): returning to refs/heads/${br}`);
        return o.p(`Successfully rebased and updated refs/heads/${br}.`);
      };
      if (repo.isAncestor(head, up)) return finish(up);
      const base = repo.mergeBase(head, up);
      const todo = repo.between(base, head).filter((c) => c.parents.length === 1);
      let cur = repo.commits.get(up);
      const made = [];
      for (const c of todo) {
        const mt = mergeTrees(repo.treeOf(c.parents[0]), cur.tree, c.tree, 'HEAD', `${short(c.hash)} (${firstLine(c.message)})`);
        if (mt.conflicts.length) {
          made.forEach((m) => repo.commits.delete(m.hash));
          o.fail(`CONFLICT (content): Merge conflict in ${mt.conflicts[0]}\nerror: could not apply ${short(c.hash)}... ${firstLine(c.message)}`);
          return o.guide(`Real git would pause here so you can fix the file, git add it and run git rebase --continue (or git rebase --abort to back out). The simulator can't pause a rebase, so nothing changed. git merge ${upSpec} handles conflicts fully here.`);
        }
        cur = repo.newCommit([cur.hash], mt.tree, c.message, br || 'detached', { name: c.author, email: c.email });
        made.push(cur);
      }
      return finish(cur.hash);
    }

    git_cherry_pick(repo, args, o) {
      const a = parse(args, []);
      if (!a.pos.length) return o.fail('usage: git cherry-pick <commit>...');
      const st = repo.status();
      if (st.staged.length || st.unstaged.length) return o.fail('error: your local changes would be overwritten by cherry-pick.\nhint: commit your changes or stash them to proceed.\nfatal: cherry-pick failed');
      for (const spec of a.pos) {
        const h = repo.resolve(spec);
        if (!h) return o.fail(`fatal: bad revision '${spec}'`);
        const c = repo.commits.get(h);
        if (c.parents.length > 1) return o.fail(`error: commit ${h} is a merge but no -m option was given.\nfatal: cherry-pick failed`);
        const head = repo.headCommit();
        const mt = mergeTrees(repo.treeOf(c.parents[0]), repo.headTree(), c.tree, 'HEAD', `${short(h)} (${firstLine(c.message)})`);
        if (mt.conflicts.length) return o.fail(`error: could not apply ${short(h)}... ${firstLine(c.message)}`).guide("That change clashes with this branch. Real git would stop so you can resolve it (git add, then git cherry-pick --continue). The simulator only does clean cherry-picks, so nothing changed.");
        if (treesEqual(mt.tree, repo.headTree())) return o.fail('The previous cherry-pick is now empty, possibly due to conflict resolution.').guide('This branch already has that change.');
        repo.moveTo(mt.tree);
        const n = repo.newCommit(head ? [head.hash] : [], mt.tree, c.message, repo.lane(), { name: c.author, email: c.email });
        repo.setHead(n.hash, `cherry-pick: ${firstLine(c.message)}`);
        o.p(`[${repo.branchName() || 'detached HEAD'} ${short(n.hash)}] ${firstLine(c.message)}`).p(` Date: ${fmtDate(c.time)}`);
        this.statLines(o, head ? head.tree : new Map(), mt.tree, true);
      }
      return o;
    }

    git_revert(repo, args, o) {
      const a = parse(args, ['-m']);
      if (a.flags['--abort'] || a.flags['--continue']) return o.fail('error: no cherry-pick or revert in progress');
      if (!a.pos.length) return o.fail('usage: git revert <commit>...');
      const st = repo.status();
      if (st.staged.length || st.unstaged.length) return o.fail('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed');
      for (const spec of a.pos) {
        const h = repo.resolve(spec);
        if (!h) return o.fail(`fatal: bad revision '${spec}'`);
        const c = repo.commits.get(h);
        let pi = 0;
        if (c.parents.length > 1) {
          if (!a.flags['-m']) return o.fail(`error: commit ${h} is a merge but no -m option was given.\nfatal: revert failed`).guide('Reverting a merge needs you to say which side is the "main line": usually git revert -m 1 <hash>');
          pi = parseInt(a.flags['-m'], 10) - 1;
        }
        const head = repo.headCommit();
        const mt = mergeTrees(c.tree, head.tree, repo.treeOf(c.parents[pi]), 'HEAD', `parent of ${short(h)} (${firstLine(c.message)})`);
        if (mt.conflicts.length) return o.fail(`error: could not revert ${short(h)}... ${firstLine(c.message)}`).guide('Later commits changed the same lines, so undoing this one conflicts. Real git would stop for you to resolve it; the simulator only does clean reverts, so nothing changed.');
        const msg = `Revert "${firstLine(c.message)}"\n\nThis reverts commit ${h}.`;
        repo.moveTo(mt.tree);
        const n = repo.newCommit([head.hash], mt.tree, msg, repo.lane());
        repo.setHead(n.hash, `revert: ${firstLine(msg)}`);
        o.p(`[${repo.branchName() || 'detached HEAD'} ${short(n.hash)}] ${firstLine(msg)}`);
        this.statLines(o, head.tree, mt.tree, true);
      }
      if (!a.flags['--no-edit']) o.guide('Real git opens your editor so you can tweak the "Revert ..." message first. Save and close it to finish.');
      return o;
    }

    // ---------- remotes ----------
    git_remote(repo, args, o) {
      const a = parse(args, []);
      const [sub, ...rest] = a.pos;
      const verbose = a.flags['-v'] || a.flags['--verbose'];
      if (!sub) {
        for (const [n, url] of repo.remotes) {
          if (verbose) o.p(`${n}\t${url} (fetch)`).p(`${n}\t${url} (push)`);
          else o.p(n);
        }
        if (!repo.remotes.size) o.guide('No remotes yet. Connect one with: git remote add origin <url>');
        return o;
      }
      if (sub === 'add') {
        const [name, url] = rest;
        if (!name || !url) return o.fail('usage: git remote add <name> <url>');
        if (repo.remotes.has(name)) return o.fail(`error: remote ${name} already exists.`).guide(`To change where ${name} points: git remote set-url ${name} <new-url>`);
        repo.remotes.set(name, url);
        if (!this.hostedRepo(url)) o.guide(`Heads up: in this simulation there's no repository at ${url}, so pushing to it will fail. Check the spelling.`);
        return o;
      }
      if (sub === 'remove' || sub === 'rm') {
        const [name] = rest;
        if (!repo.remotes.has(name)) return o.fail(`error: No such remote: '${name}'`);
        repo.remotes.delete(name);
        for (const k of [...repo.remoteRefs.keys()]) if (k.startsWith(name + '/')) repo.remoteRefs.delete(k);
        for (const [b, up] of [...repo.upstream]) if (up.startsWith(name + '/')) repo.upstream.delete(b);
        return o;
      }
      if (sub === 'rename') {
        const [from, to] = rest;
        if (!repo.remotes.has(from)) return o.fail(`error: No such remote: '${from}'`);
        if (!to || repo.remotes.has(to)) return o.fail(`error: remote ${to} already exists.`);
        repo.remotes.set(to, repo.remotes.get(from));
        repo.remotes.delete(from);
        for (const [k, v] of [...repo.remoteRefs]) if (k.startsWith(from + '/')) { repo.remoteRefs.delete(k); repo.remoteRefs.set(to + k.slice(from.length), v); }
        for (const [b, up] of [...repo.upstream]) if (up.startsWith(from + '/')) repo.upstream.set(b, to + up.slice(from.length));
        return o;
      }
      if (sub === 'set-url') {
        const [name, url] = rest;
        if (!repo.remotes.has(name)) return o.fail(`error: No such remote '${name}'`);
        if (!url) return o.fail('usage: git remote set-url <name> <newurl>');
        repo.remotes.set(name, url);
        return o;
      }
      if (sub === 'get-url') {
        const [name] = rest;
        if (!repo.remotes.has(name)) return o.fail(`error: No such remote '${name}'`);
        return o.p(repo.remotes.get(name));
      }
      if (sub === 'show') {
        const [name] = rest;
        const url = repo.remotes.get(name);
        if (!url) return o.fail(`error: No such remote '${name}'`);
        const hosted = this.hostedRepo(url);
        o.p(`* remote ${name}`).p(`  Fetch URL: ${url}`).p(`  Push  URL: ${url}`);
        if (hosted) {
          o.p(`  HEAD branch: ${hosted.head.name}`).p('  Remote branches:');
          for (const b of hosted.branches.keys()) o.p(`    ${b.padEnd(14)}${repo.remoteRefs.has(name + '/' + b) ? 'tracked' : 'new (next fetch will store in remotes/' + name + ')'}`);
        }
        return o;
      }
      return o.fail(`error: unknown subcommand: \`${sub}'`).guide('Common ones: git remote -v, git remote add <name> <url>, git remote remove <name>, git remote set-url <name> <url>');
    }

    fetchRemote(repo, remote, o, prune) {
      const url = repo.remotes.get(remote);
      if (!url) {
        o.fail(`fatal: '${remote}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`);
        return null;
      }
      const hosted = this.hostedRepo(url);
      if (!hosted) { o.fail(`remote: Repository not found.\nfatal: repository '${url}' not found`); return null; }
      const updates = [];
      for (const [b, tip] of hosted.branches) {
        const key = `${remote}/${b}`;
        const old = repo.remoteRefs.get(key);
        if (old === tip) continue;
        copyCommits(hosted, repo, tip);
        repo.remoteRefs.set(key, tip);
        if (!old) updates.push(` * [new branch]      ${b.padEnd(10)} -> ${key}`);
        else if (repo.isAncestor(old, tip)) updates.push(`   ${short(old)}..${short(tip)}  ${b.padEnd(10)} -> ${key}`);
        else updates.push(` + ${short(old)}...${short(tip)} ${b.padEnd(10)} -> ${key}  (forced update)`);
      }
      if (prune) {
        for (const k of [...repo.remoteRefs.keys()]) {
          if (k.startsWith(remote + '/') && !hosted.branches.has(k.slice(remote.length + 1))) {
            repo.remoteRefs.delete(k);
            updates.push(` - [deleted]         (none)     -> ${k}`);
          }
        }
      }
      for (const [t, v] of hosted.tags) {
        if (repo.tags.has(t)) continue;
        copyCommits(hosted, repo, v.hash);
        repo.tags.set(t, { ...v });
        updates.push(` * [new tag]         ${t.padEnd(10)} -> ${t}`);
      }
      if (updates.length) { o.p(`From ${this.webUrl(url)}`); updates.forEach((u) => o.p(u)); }
      return updates.length > 0;
    }

    git_fetch(repo, args, o) {
      const a = parse(args, []);
      if (!repo.remotes.size) return o.fail("fatal: 'origin' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.").guide('This repository has no remote yet. Add one with: git remote add origin <url>');
      const br = repo.branchName();
      const up = br && repo.upstream.get(br);
      const remotes = a.flags['--all'] ? [...repo.remotes.keys()] : [a.pos[0] || (up ? up.split('/')[0] : 'origin')];
      let any = false;
      for (const r of remotes) {
        const res = this.fetchRemote(repo, r, o, a.flags['-p'] || a.flags['--prune']);
        if (res === null) return o;
        if (res) any = true;
      }
      if (!any) o.guide('No output means there was nothing new to download.');
      return o;
    }

    git_pull(repo, args, o) {
      const a = parse(args, []);
      const br = repo.branchName();
      if (!br) return o.fail('You are not currently on a branch.\nPlease specify which branch you want to merge with.');
      const up = repo.upstream.get(br);
      let [remote, rbranch] = a.pos;
      if (!remote) {
        if (!up) {
          if (!repo.remotes.size) return o.fail("fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.");
          return o.fail(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=origin/<branch> ${br}\n`).guide(`Usually this means the branch was never pushed with -u. Try: git pull origin ${br === 'main' ? 'main' : br}  (or push once with git push -u origin ${br})`);
        }
        remote = up.split('/')[0];
        rbranch = up.slice(remote.length + 1);
      } else if (!rbranch) {
        rbranch = up && up.startsWith(remote + '/') ? up.slice(remote.length + 1) : null;
        if (!rbranch) return o.fail(`You asked to pull from the remote '${remote}', but did not specify\na branch. Because this is not the default configured remote\nfor your current branch, you must specify a branch on the command line.`);
      }
      if (this.fetchRemote(repo, remote, o, false) === null) return o;
      const key = `${remote}/${rbranch}`;
      const theirs = repo.remoteRefs.get(key);
      if (!theirs) return o.fail(`fatal: couldn't find remote ref ${rbranch}`);
      const ours = repo.headHash();
      if (ours && repo.isAncestor(theirs, ours)) return o.p('Already up to date.');
      const cfgRebase = this.cfg('pull.rebase');
      const rebase = a.flags['--rebase'] || a.flags['-r'] || (cfgRebase === 'true' && !a.flags['--no-rebase']);
      const ffOnly = a.flags['--ff-only'] || this.cfg('pull.ff') === 'only';
      const diverged = ours && !repo.isAncestor(ours, theirs);
      if (diverged && !rebase && !ffOnly && !a.flags['--no-rebase'] && cfgRebase === undefined) {
        o.p("hint: You have divergent branches and need to specify how to reconcile them.\nhint: You can do so by running one of the following commands sometime before\nhint: your next pull:\nhint:\nhint:   git config pull.rebase false  # merge\nhint:   git config pull.rebase true   # rebase\nhint:   git config pull.ff only       # fast-forward only\nhint:\nhint: You can replace \"git config\" with \"git config --global\" to set a default\nhint: preference for all repositories.", 'y');
        o.fail('fatal: Need to specify how to reconcile divergent branches.');
        return o.guide('Both you and GitHub have new commits. Pick "merge" (the beginner-friendly choice): git config --global pull.rebase false, then git pull again.');
      }
      if (diverged && ffOnly) return o.fail('fatal: Not possible to fast-forward, aborting.');
      if (rebase && diverged) return this.doRebase(repo, theirs, key, o);
      return this.doMerge(repo, theirs, key, o, { defaultMsg: `Merge branch '${rbranch}' of ${this.webUrl(repo.remotes.get(remote))}`, reflogVerb: 'pull' });
    }

    git_push(repo, args, o) {
      const a = parse(args, []);
      const setUp = a.flags['-u'] || a.flags['--set-upstream'];
      const force = a.flags['-f'] || a.flags['--force'];
      const lease = a.flags['--force-with-lease'];
      const del = a.flags['-d'] || a.flags['--delete'];
      const br = repo.branchName();
      let [remote, ref] = a.pos;
      if (!remote) {
        const up = br && repo.upstream.get(br);
        if (up) { remote = up.split('/')[0]; ref = up.slice(remote.length + 1); }
        else if (!repo.remotes.size) return o.fail('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>\n');
        else if (!br) return o.fail('fatal: You are not currently on a branch.\nTo push the history leading to the current (detached HEAD)\nstate now, use\n\n    git push origin HEAD:<name-of-remote-branch>\n');
        else if (!setUp && !a.flags['--tags']) {
          o.fail(`fatal: The current branch ${br} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${br}\n`);
          return o.guide(`Translation: git doesn't know where to send '${br}' yet. The short version: git push -u origin ${br}`);
        } else remote = 'origin';
      }
      const url = repo.remotes.get(remote);
      if (!url) return o.fail(`fatal: '${remote}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`);
      const hosted = this.hostedRepo(url);
      if (!hosted) return o.fail(`remote: Repository not found.\nfatal: repository '${url}' not found`);
      if (a.flags['--tags']) {
        const fresh = [...repo.tags].filter(([t]) => !hosted.tags.has(t));
        if (!fresh.length) return o.p('Everything up-to-date');
        o.p(`To ${url}`);
        for (const [t, v] of fresh) { copyCommits(repo, hosted, v.hash); hosted.tags.set(t, { ...v }); o.p(` * [new tag]         ${t} -> ${t}`); }
        return o;
      }
      if (del) {
        const target = ref;
        if (!target) return o.fail('fatal: --delete doesn\'t make sense without any refs');
        if (!hosted.branches.has(target)) return o.fail(`error: unable to delete '${target}': remote ref does not exist\nerror: failed to push some refs to '${url}'`);
        hosted.branches.delete(target);
        repo.remoteRefs.delete(`${remote}/${target}`);
        return o.p(`To ${url}`).p(` - [deleted]         ${target}`);
      }
      ref = ref || br;
      let src = ref, dst = ref;
      if (ref.includes(':')) [src, dst] = ref.split(':');
      if (src === 'HEAD') src = br;
      if (!src) return o.fail('fatal: You are not currently on a branch.');
      if (repo.tags.has(src) && !repo.branches.has(src)) {
        if (hosted.tags.has(src)) return o.p('Everything up-to-date');
        const v = repo.tags.get(src);
        copyCommits(repo, hosted, v.hash);
        hosted.tags.set(src, { ...v });
        return o.p(`To ${url}`).p(` * [new tag]         ${src} -> ${src}`);
      }
      const local = repo.branches.get(src);
      if (!local) {
        o.fail(`error: src refspec ${src} does not match any\nerror: failed to push some refs to '${url}'`);
        if (!repo.headHash()) o.guide("You don't have any commits yet, so there's nothing to push. Commit first.");
        else o.guide(`There's no local branch called ${src}. Check the name with git branch.`);
        return o;
      }
      const remoteTip = hosted.branches.get(dst);
      if (remoteTip === local) {
        o.p('Everything up-to-date');
        if (setUp) { repo.upstream.set(src, `${remote}/${dst}`); repo.remoteRefs.set(`${remote}/${dst}`, local); o.p(`branch '${src}' set up to track '${remote}/${dst}'.`); }
        return o;
      }
      const ff = !remoteTip || repo.isAncestor(remoteTip, local);
      if (!ff && lease && repo.remoteRefs.get(`${remote}/${dst}`) !== remoteTip) {
        o.p(`To ${url}`).p(` ! [rejected]        ${src} -> ${dst} (stale info)`, 'err');
        return o.fail(`error: failed to push some refs to '${url}'`).guide("--force-with-lease refused: GitHub has commits you haven't even seen yet. Fetch first and look at them before overwriting anything.");
      }
      if (!ff && !force && !lease) {
        const known = repo.commits.has(remoteTip);
        o.p(`To ${url}`).p(` ! [rejected]        ${src} -> ${dst} (${known ? 'non-fast-forward' : 'fetch first'})`, 'err');
        o.fail(`error: failed to push some refs to '${url}'`);
        o.p(known
          ? "hint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart. If you want to integrate the remote changes,\nhint: use 'git pull' before pushing again."
          : "hint: Updates were rejected because the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref. If you want to integrate the remote changes, use\nhint: 'git pull' before pushing again.", 'y');
        return o.guide('Someone else pushed first. Run git pull to bring their work in (fixing any conflicts), then push again. Do NOT reach for --force.');
      }
      if (!hosted.branches.size) hosted.head = { type: 'branch', name: dst };
      const n = copyCommits(repo, hosted, local);
      hosted.branches.set(dst, local);
      repo.remoteRefs.set(`${remote}/${dst}`, local);
      const objs = Math.max(3, n * 3);
      o.p(`Enumerating objects: ${objs}, done.`).p(`Counting objects: 100% (${objs}/${objs}), done.`).p(`Writing objects: 100% (${objs}/${objs}), ${objs * 97} bytes | ${objs * 97} bytes/s, done.`).p(`Total ${objs} (delta 0), reused 0 (delta 0), pack-reused 0`);
      if (!remoteTip && dst !== hosted.head.name) {
        o.p('remote:').p(`remote: Create a pull request for '${dst}' on GitHub by visiting:`).p(`remote:      ${this.webUrl(url)}/pull/new/${dst}`).p('remote:');
      }
      o.p(`To ${url}`);
      if (!remoteTip) o.p(` * [new branch]      ${src} -> ${dst}`);
      else if (!ff) o.p(` + ${short(remoteTip)}...${short(local)} ${src} -> ${dst} (forced update)`, 'y');
      else o.p(`   ${short(remoteTip)}..${short(local)}  ${src} -> ${dst}`);
      if (setUp) { repo.upstream.set(src, `${remote}/${dst}`); o.p(`branch '${src}' set up to track '${remote}/${dst}'.`); }
      return o;
    }

    git_clone(_, args, o) {
      const a = parse(args, ['-b', '--branch']);
      const url = a.pos[0];
      if (!url) return o.fail('fatal: You must specify a repository to clone.\n\nusage: git clone [<options>] [--] <repo> [<dir>]');
      const dirArg = a.pos[1] || String(url).replace(/\/+$/, '').replace(/\.git$/, '').split(/[/:]/).pop();
      const dir = this.abs(dirArg);
      if (this.fs.has(dir) && (this.isFile(dir) || this.children(dir).length)) return o.fail(`fatal: destination path '${dirArg}' already exists and is not an empty directory.`);
      o.p(`Cloning into '${dirArg}'...`);
      const hosted = this.hostedRepo(url);
      if (!hosted) {
        o.fail(`remote: Repository not found.\nfatal: repository '${url}' not found`);
        return o.guide('Copy the URL from the green Code button on the repository page. It looks like https://github.com/owner/name.git');
      }
      const branch = a.flags['-b'] || a.flags['--branch'] || hosted.head.name;
      if (hosted.branches.size && !hosted.branches.has(branch)) return o.fail(`fatal: Remote branch ${branch} not found in upstream origin`);
      this.mkdirp(dir);
      const repo = new Repo(this, { root: dir, branch });
      this.repos.set(dir, repo);
      this.fs.set(dir + '/.git', { type: 'dir', git: true });
      repo.remotes.set('origin', url);
      let count = 0;
      for (const [b, h] of hosted.branches) { count += copyCommits(hosted, repo, h); repo.remoteRefs.set('origin/' + b, h); }
      for (const [t, v] of hosted.tags) { copyCommits(hosted, repo, v.hash); repo.tags.set(t, { ...v }); }
      if (hosted.branches.has(branch)) {
        const h = hosted.branches.get(branch);
        repo.branches.set(branch, h);
        repo.upstream.set(branch, 'origin/' + branch);
        const tree = repo.commits.get(h).tree;
        for (const [p, c] of tree) repo.writeWd(p, c);
        repo.index = new Map(tree);
        repo.log(h, `clone: from ${url}`);
        const n = count * 3;
        o.p(`remote: Enumerating objects: ${n}, done.`).p(`remote: Counting objects: 100% (${n}/${n}), done.`).p(`remote: Total ${n} (delta 0), reused ${n} (delta 0), pack-reused 0`).p(`Receiving objects: 100% (${n}/${n}), done.`);
      } else {
        o.p('warning: You appear to have cloned an empty repository.', 'y');
      }
      return o.guide(`The project is now in the folder ${dirArg}. Step inside with: cd ${dirArg}`);
    }

    // ---------- stash / tag / reflog / blame ----------
    git_stash(repo, args, o) {
      const a = parse(args, ['-m', '--message']);
      const subs = ['list', 'pop', 'apply', 'drop', 'clear', 'show', 'push', 'save'];
      const sub = subs.includes(a.pos[0]) ? a.pos[0] : 'push';
      const br = repo.branchName();
      const pick = () => {
        const ref = a.pos[1];
        if (!ref) return 0;
        const m = ref.match(/^(?:stash@\{)?(\d+)\}?$/);
        return m ? parseInt(m[1], 10) : -1;
      };
      if (sub === 'list') { repo.stash.forEach((s, i) => o.seg([`stash@{${i}}`, 'y'], [': ' + s.label])); return o; }
      if (sub === 'clear') { repo.stash = []; return o; }
      if (sub === 'drop') {
        const i = pick();
        const s = repo.stash[i];
        if (!s) return o.fail(repo.stash.length ? `error: stash@{${i}} is not a valid reference` : 'No stash entries found.');
        repo.stash.splice(i, 1);
        return o.p(`Dropped stash@{${i}} (${s.hash})`);
      }
      if (sub === 'show') {
        const s = repo.stash[pick()];
        if (!s) return o.fail('No stash entries found.');
        this.statLines(o, s.baseTree, s.wd);
        return o;
      }
      if (sub === 'pop' || sub === 'apply') {
        if (!repo.stash.length) return o.fail('No stash entries found.');
        const i = pick();
        const s = repo.stash[i];
        if (!s) return o.fail(`error: stash@{${i}} is not a valid reference`);
        const head = repo.headTree(), wd = repo.wd();
        const changed = unionKeys(s.wd, s.baseTree).filter((p) => s.wd.get(p) !== s.baseTree.get(p));
        const dirty = changed.filter((p) => wd.get(p) !== repo.index.get(p) || repo.index.get(p) !== head.get(p));
        const inWay = [...s.untracked.keys()].filter((p) => wd.has(p));
        if (dirty.length || inWay.length) return this.overwriteErr(o, [...dirty, ...inWay], 'merge');
        const conflicts = [];
        for (const p of changed) {
          const base = s.baseTree.get(p), mine = head.get(p), theirs = s.wd.get(p);
          let result;
          if (mine === base) result = theirs;
          else if (theirs === mine) result = mine;
          else if (theirs === undefined || mine === undefined) { result = mine !== undefined ? mine : theirs; conflicts.push(p); }
          else { const m = LG.merge3(base || '', mine, theirs, 'Updated upstream', 'Stashed changes'); result = m.text; if (m.conflict) conflicts.push(p); }
          if (result === undefined) repo.deleteWd(p); else repo.writeWd(p, result);
          if (!head.has(p) && s.index.has(p) && result !== undefined && !conflicts.includes(p)) repo.index.set(p, result);
        }
        for (const [p, c] of s.untracked) repo.writeWd(p, c);
        if (conflicts.length) {
          conflicts.forEach((p) => { repo.unmerged.add(p); o.p(`CONFLICT (content): Merge conflict in ${p}`, 'err'); });
          o.p('The stash entry is kept in case you need it again.');
          o.code = 1;
          return o;
        }
        this.git_status(repo, [], o);
        if (sub === 'pop') { repo.stash.splice(i, 1); o.p(`Dropped refs/stash@{${i}} (${s.hash})`); }
        return o;
      }
      // push / save
      const withUntracked = a.flags['-u'] || a.flags['--include-untracked'];
      const st = repo.status();
      if (repo.unmerged.size) return o.fail(`${[...repo.unmerged].map((p) => p + ': needs merge').join('\n')}\nerror: could not write index`);
      if (!st.staged.length && !st.unstaged.length && !(withUntracked && st.untracked.length)) {
        o.p('No local changes to save');
        if (st.untracked.length) o.guide('Brand new (untracked) files are not stashed by default. Use git stash -u to include them.');
        return o;
      }
      const headC = repo.headCommit();
      if (!headC) return o.fail('You do not have the initial commit yet');
      const wd = repo.wd();
      const tracked = new Map();
      for (const p of unionKeys(repo.index, headC.tree)) if (wd.has(p)) tracked.set(p, wd.get(p));
      const untracked = new Map();
      if (withUntracked) for (const p of st.untracked) untracked.set(p, wd.get(p));
      const msg = a.flags['-m'] || a.flags['--message'] || (sub === 'save' && a.pos.slice(1).join(' ')) || null;
      const label = msg ? `On ${br || '(no branch)'}: ${msg}` : `WIP on ${br || '(no branch)'}: ${short(headC.hash)} ${firstLine(headC.message)}`;
      const s = { hash: LG.fakeSha(label + this.seq + repo.stash.length + JSON.stringify([...tracked])), label, baseTree: headC.tree, index: new Map(repo.index), wd: tracked, untracked };
      repo.stash.unshift(s);
      repo.hardReset(headC.tree);
      for (const p of untracked.keys()) repo.deleteWd(p);
      return o.p(`Saved working directory and index state ${label}`);
    }

    git_tag(repo, args, o) {
      const a = parse(args, ['-m']);
      if (a.flags['-d'] || a.flags['--delete']) {
        for (const name of a.pos) {
          const t = repo.tags.get(name);
          if (!t) { o.fail(`error: tag '${name}' not found.`); continue; }
          repo.tags.delete(name);
          o.p(`Deleted tag '${name}' (was ${short(t.hash)})`);
        }
        return o;
      }
      if (!a.pos.length || a.flags['-l'] || a.flags['--list']) {
        [...repo.tags.keys()].sort((x, y) => x.localeCompare(y, 'en', { numeric: true })).forEach((t) => o.p(t));
        return o;
      }
      const [name, target] = a.pos;
      if (repo.tags.has(name) && !a.flags['-f']) return o.fail(`fatal: tag '${name}' already exists`);
      if (!validName(name)) return o.fail(`fatal: '${name}' is not a valid tag name.`);
      const h = repo.resolve(target || 'HEAD');
      if (!h) return o.fail(`fatal: Failed to resolve '${target || 'HEAD'}' as a valid ref.`);
      if (a.flags['-a'] && !a.flags['-m']) return o.fail('').guide('An annotated tag needs a message. Real git would open your editor; here, add -m "message".');
      repo.tags.set(name, { hash: h, annotated: !!(a.flags['-a'] || a.flags['-m']), message: a.flags['-m'] || '', tagger: this.cfg('user.name'), time: this.clock });
      return o;
    }

    git_reflog(repo, args, o) {
      const entries = repo.reflog.slice().reverse();
      if (!entries.length) return o.fail(`fatal: your current branch '${repo.branchName()}' does not have any commits yet`);
      entries.forEach((e, i) => o.seg([short(e.hash), 'y'], ...(i === 0 ? this.decoSegs(repo, e.hash) : []), [` HEAD@{${i}}: ${e.msg}`]));
      return o;
    }

    git_blame(repo, args, o) {
      const a = parse(args, []);
      const spec = a.pos[0] || a.paths[0];
      if (!spec) return o.fail('usage: git blame <file>');
      const rel = this.relSpec(repo, spec);
      const head = repo.headCommit();
      if (!head || !head.tree.has(rel)) return o.fail(`fatal: no such path '${rel}' in HEAD`);
      const lines = LG.splitLines(head.tree.get(rel));
      const owner = new Array(lines.length).fill(null);
      let map = lines.map((_, i) => i);
      let cur = head;
      while (cur) {
        const parent = cur.parents[0] ? repo.commits.get(cur.parents[0]) : null;
        const pText = parent ? parent.tree.get(rel) : undefined;
        if (pText === undefined) { map.forEach((idx, k) => { if (owner[k] === null && idx !== -1) owner[k] = cur; }); break; }
        const m = LG.lcsMatch(LG.splitLines(cur.tree.get(rel)), LG.splitLines(pText));
        const c = cur;
        map = map.map((idx, k) => {
          if (owner[k] !== null || idx === -1) return -1;
          if (m[idx] === -1) { owner[k] = c; return -1; }
          return m[idx];
        });
        if (owner.every((x) => x !== null)) break;
        cur = parent;
      }
      const w = Math.max(...owner.map((c) => (c ? c.author.length : 3)));
      lines.forEach((line, k) => {
        const c = owner[k] || head;
        o.seg([short(c.hash), 'y'], [` (${c.author.padEnd(w)} ${fmtShortDate(c.time)} ${String(k + 1).padStart(2)}) `, 'dim'], [line]);
      });
      return o;
    }

    // =================================================================
    // gh (GitHub CLI), the parts beginners use
    // =================================================================
    gh(args) {
      const o = new Out();
      const [area, sub, ...rest] = args;
      if (!area || area === 'help' || area === '--help') {
        return o.p('Work seamlessly with GitHub from the command line.\n\nUSAGE\n  gh <command> <subcommand> [flags]\n\nCORE COMMANDS\n  auth:        Authenticate gh and git with GitHub\n  pr:          Manage pull requests\n  repo:        Manage repositories');
      }
      if (area === 'auth') {
        if (sub === 'login') {
          o.p('? Where do you use GitHub? GitHub.com').p('? What is your preferred protocol for Git operations on this host? HTTPS').p('? Authenticate Git with your GitHub credentials? Yes').p('? How would you like to authenticate GitHub CLI? Login with a web browser').p('')
            .p('! First copy your one-time code: 4F2A-9C1D').p('Press Enter to open https://github.com/login/device in your browser...').p('- Authentication complete.').p('- gh config set -h github.com git_protocol https').p('- Configured git protocol').p('- Logged in as you');
          return o.guide('Simulated. For real, a browser tab opens, you paste the code and click Authorize. After that, git push just works.');
        }
        if (sub === 'status') return o.p('github.com\n  - Logged in to github.com account you (keyring)\n  - Active account: true\n  - Git operations protocol: https');
        return o.fail(`unknown command "${sub || ''}" for "gh auth"`);
      }
      if (area === 'browse') return o.guide('Would open this repository on github.com in your browser.');
      if (area === 'repo') return this.ghRepo(sub, rest, o);
      if (area === 'pr') return this.ghPr(sub, rest, o);
      return o.fail(`unknown command "${area}" for "gh"`);
    }

    ghRepo(sub, rest, o) {
      if (sub === 'create') {
        const a = parse(rest, ['--source', '--remote', '-s', '-r']);
        const name = a.pos[0];
        if (!name) return o.fail('[sim] give the new repository a name: gh repo create my-project --public');
        const slug = name.includes('/') ? name : `you/${name}`;
        if (this.hosted.has(`https://github.com/${slug}.git`)) return o.fail('GraphQL: Name already exists on this account (createRepository)');
        this.host(slug);
        o.p(`- Created repository ${slug} on GitHub`).p(`  https://github.com/${slug}`);
        const source = a.flags['--source'] || a.flags['-s'];
        if (source) {
          const repo = this.findRepo(this.abs(source === true ? '.' : source));
          if (!repo) return o.fail(`${source} is not a git repository`);
          const rn = a.flags['--remote'] || a.flags['-r'] || 'origin';
          const url = `https://github.com/${slug}.git`;
          repo.remotes.set(rn, url);
          o.p(`- Added remote ${url}`);
          if (a.flags['--push']) {
            const br = repo.branchName();
            const saved = this.cwd;
            this.cwd = repo.root;
            const r = this.git(['push', '-u', rn, br]);
            this.cwd = saved;
            o.lines.push(...r.lines);
            o.code = r.code;
          }
        } else o.guide('Connect it to a local project with: git remote add origin https://github.com/' + slug + '.git');
        return o;
      }
      if (sub === 'clone') {
        if (!rest[0]) return o.fail('cannot clone: repository argument required');
        return this.git_clone(null, [`https://github.com/${rest[0]}.git`, ...rest.slice(1)], o);
      }
      if (sub === 'list') {
        const mine = [...this.hosted.values()].filter((r) => r.name.startsWith('you/'));
        if (!mine.length) return o.p('no repositories found');
        o.p('').p(`Showing ${LG.plural(mine.length, 'repository', 'repositories')} in @you`).p('');
        mine.forEach((r) => o.p(`${r.name.padEnd(24)}public`));
        return o;
      }
      return o.fail(`unknown command "${sub || ''}" for "gh repo"`);
    }

    ghPr(sub, rest, o) {
      const repo = this.findRepo();
      if (!repo) return o.fail('fatal: not a git repository (or any of the parent directories): .git');
      const originUrl = repo.remotes.get('origin');
      const hosted = originUrl && this.hostedRepo(originUrl);
      if (!hosted) return o.fail('none of the git remotes configured for this repository point to a known GitHub host. To tell gh about a new GitHub host, please use `gh auth login`');
      const prs = this.prs.filter((p) => p.url === hosted.url);
      const br = repo.branchName();
      const findPr = (arg) => {
        if (arg) { const n = parseInt(String(arg).replace('#', ''), 10); return prs.find((p) => p.n === n) || null; }
        return prs.find((p) => p.head === br && p.state === 'open') || null;
      };
      if (sub === 'create') {
        const a = parse(rest, ['--title', '-t', '--body', '-b', '--base', '-B']);
        const base = a.flags['--base'] || a.flags['-B'] || hosted.head.name;
        if (!br) return o.fail('could not determine the current branch');
        if (br === base) return o.fail(`must be on a branch named differently than "${base}"`).guide(`Pull requests go from a branch INTO ${base}. Make one first: git switch -c my-change`);
        if (!hosted.branches.has(br)) return o.fail('aborted: you must first push the current branch to a remote, or use the --head flag').guide(`Push it first: git push -u origin ${br}`);
        const exists = prs.find((p) => p.head === br && p.base === base && p.state === 'open');
        if (exists) return o.fail(`a pull request for branch "${br}" into branch "${base}" already exists:\nhttps://github.com/${hosted.name}/pull/${exists.n}`);
        let title = a.flags['--title'] || a.flags['-t'];
        let body = a.flags['--body'] || a.flags['-b'] || '';
        if (a.flags['--fill'] || a.flags['-f']) {
          const commits = hosted.between(hosted.branches.get(base), hosted.branches.get(br));
          title = title || firstLine(commits.length ? commits[commits.length - 1].message : br);
          body = body || commits.map((c) => '- ' + firstLine(c.message)).join('\n');
        }
        if (!title) return o.fail('must provide `--title` and `--body` (or `--fill`) when not running interactively').guide('Try: gh pr create --title "Add taco recipe" --body "Adds tacos to the book"');
        const n = this.prs.filter((p) => p.url === hosted.url).length + 1;
        this.prs.push({ n, url: hosted.url, slug: hosted.name, head: br, base, title, body, state: 'open', draft: !!(a.flags['--draft'] || a.flags['-d']) });
        o.p('').p(`Creating pull request for ${br} into ${base} in ${hosted.name}`).p('').p(`https://github.com/${hosted.name}/pull/${n}`);
        if (repo.branches.get(br) !== hosted.branches.get(br)) o.guide('Note: you have local commits that are not pushed yet, so they are not in the pull request. git push adds them.');
        return o;
      }
      if (sub === 'list') {
        const open = prs.filter((p) => p.state === 'open');
        if (!open.length) return o.p(`no open pull requests in ${hosted.name}`);
        o.p('').p(`Showing ${open.length} of ${open.length} open pull request${open.length > 1 ? 's' : ''} in ${hosted.name}`).p('');
        open.forEach((p) => o.seg([`#${p.n}`.padEnd(5), 'g'], [p.title.padEnd(28)], [p.head, 'c'], [p.draft ? '  DRAFT' : '', 'dim']));
        return o;
      }
      if (sub === 'view') {
        const pr = findPr(rest[0]);
        if (!pr) return o.fail(`no pull requests found for branch "${br}"`);
        const commits = hosted.branches.has(pr.head) ? hosted.between(hosted.branches.get(pr.base), hosted.branches.get(pr.head)).length : 0;
        o.p(`${pr.title} #${pr.n}`, 'b').p(`${pr.state === 'open' ? 'Open' : 'Merged'} • you wants to merge ${LG.plural(commits, 'commit')} into ${pr.base} from ${pr.head}`).p('').p(pr.body || 'No description provided.').p('').p(`View this pull request on GitHub: https://github.com/${pr.slug}/pull/${pr.n}`, 'dim');
        return o;
      }
      if (sub === 'checkout') {
        const pr = findPr(rest[0]);
        if (!pr) return o.fail(`could not find pull request #${rest[0] || ''}`);
        this.fetchRemote(repo, 'origin', o, false);
        if (repo.branches.has(pr.head)) return this.switchBranch(repo, pr.head, o);
        return this.createAndSwitch(repo, pr.head, 'origin/' + pr.head, o);
      }
      if (sub === 'merge') {
        const a = parse(rest, []);
        const pr = findPr(a.pos[0]);
        if (!pr) return o.fail(a.pos[0] ? `could not find pull request #${a.pos[0]}` : `no pull requests found for branch "${br}"`);
        if (pr.state !== 'open') return o.fail(`Pull request #${pr.n} was already merged`);
        const method = a.flags['--squash'] || a.flags['-s'] ? 'squash' : a.flags['--rebase'] || a.flags['-r'] ? 'rebase' : a.flags['--merge'] || a.flags['-m'] ? 'merge' : null;
        if (!method) return o.fail('--merge, --rebase, or --squash required when not running interactively').guide(`Pick how to land it: gh pr merge ${pr.n} --merge   (or --squash, or --rebase)`);
        const baseTip = hosted.branches.get(pr.base), headTip = hosted.branches.get(pr.head);
        if (!headTip) return o.fail(`the head branch ${pr.head} no longer exists`);
        if (hosted.isAncestor(headTip, baseTip)) return o.fail(`Pull request #${pr.n} has no new commits to merge`);
        const mt = mergeTrees(hosted.treeOf(hosted.mergeBase(baseTip, headTip)), hosted.treeOf(baseTip), hosted.treeOf(headTip), pr.base, pr.head);
        if (mt.conflicts.length) {
          o.fail(`X Pull request #${pr.n} is not mergeable: the merge commit cannot be cleanly created.`);
          return o.guide(`GitHub can't merge it because it conflicts with ${pr.base}. Fix it locally: git pull origin ${pr.base} (on your branch), resolve the conflict, commit, push, then merge again.`);
        }
        let tip;
        if (method === 'merge') tip = hosted.newCommit([baseTip, headTip], mt.tree, `Merge pull request #${pr.n} from ${pr.slug.split('/')[0]}/${pr.head}\n\n${pr.title}`, pr.base).hash;
        else if (method === 'squash') tip = hosted.newCommit([baseTip], mt.tree, `${pr.title} (#${pr.n})`, pr.base).hash;
        else {
          let cur = hosted.commits.get(baseTip);
          for (const c of hosted.between(baseTip, headTip).filter((x) => x.parents.length === 1)) {
            const t = mergeTrees(hosted.treeOf(c.parents[0]), cur.tree, c.tree, pr.base, pr.head).tree;
            cur = hosted.newCommit([cur.hash], t, c.message, pr.base, { name: c.author, email: c.email });
          }
          tip = cur.hash;
        }
        hosted.branches.set(pr.base, tip);
        pr.state = 'merged';
        o.p(`- ${method === 'squash' ? 'Squashed and merged' : method === 'rebase' ? 'Rebased and merged' : 'Merged'} pull request #${pr.n} (${pr.title})`);
        if (a.flags['--delete-branch'] || a.flags['-d']) {
          hosted.branches.delete(pr.head);
          o.p(`- Deleted branch ${pr.head} on GitHub`);
        }
        return o.guide(`Merged on GitHub, not on your computer. Catch up with: git switch ${pr.base} && git pull` + (repo.branches.has(pr.head) ? `, then tidy up with git branch -d ${pr.head}` : ''));
      }
      return o.fail(`unknown command "${sub || ''}" for "gh pr"`);
    }
  }

  LG.World = World;
  LG.GIT_COMMANDS = GIT_COMMANDS;
  LG.short = short;
  LG.firstLine = firstLine;
})(window.LG = window.LG || {});

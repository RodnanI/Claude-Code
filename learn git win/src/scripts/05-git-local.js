/* Git simulator, part 2: the command dispatcher, PowerShell basics inside the
   simulator, and the "local" Git commands (init, status, add, commit, log, diff...). */
(function () {
  'use strict';
  var LG = window.LG, G = LG.git, C = G.cmds, esc = LG.esc;
  var keys = G.keys, union = G.union, short = G.short;

  function has(a, f) { return a.indexOf(f) >= 0; }
  function optVal(a, names) {
    for (var i = 0; i < a.length; i++) if (names.indexOf(a[i]) >= 0) return a[i + 1] != null ? a[i + 1] : '';
    return null;
  }
  /* arguments that are not flags; `takes` lists flags that swallow the next argument */
  function plain(a, takes) {
    var out = [];
    for (var i = 0; i < a.length; i++) {
      if (takes && takes.indexOf(a[i]) >= 0) { i++; continue; }
      if ((a[i][0] === '-' && a[i] !== '-') || a[i] === '--') continue;
      out.push(a[i]);
    }
    return out;
  }
  function fwd(p) { return p.replace(/\\/g, '/'); }
  function firstLine(s) { return String(s).split('\n')[0]; }
  function lev(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  function globRe(spec) {
    return new RegExp('^' + spec.replace(/^\.[\\/]/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  }
  G.has = has; G.optVal = optVal; G.plain = plain; G.firstLine = firstLine;

  G.ALL = ['init', 'status', 'add', 'commit', 'log', 'diff', 'show', 'restore', 'rm', 'mv', 'branch', 'switch', 'checkout', 'merge',
    'remote', 'push', 'pull', 'fetch', 'clone', 'stash', 'reset', 'revert', 'tag', 'reflog', 'rebase', 'config', 'help'];
  var NO_REPO = { init: 1, clone: 1, config: 1, help: 1 };

  /* Run one command line (no semicolons). Returns an event object the missions look at. */
  G.exec = function (r, line, term, view) {
    var o = G.out(term), ev = o.ev;
    o.view = view;
    ev.raw = line;
    if (/(^|\s)[^\s'"]*@\{/.test(line)) {
      o.err('PowerShell reads @{ as the start of its own syntax, so this line breaks before Git even sees it.');
      o.note("Wrap that part in single quotes, for example: git stash apply 'stash@{0}'");
      ev.cmd = 'quote';
      return ev;
    }
    var tk = LG.tokens(line), name = (tk[0] || '').toLowerCase();
    ev.cmd = name;
    if (name !== 'git') { G.shell(r, name, tk, line, o); ev.ok = !o.failed; return ev; }
    var a = tk.slice(1).filter(function (x) { return x !== '--no-pager' && x !== '-P'; });
    var sub = a.shift();
    if (!sub) { C.help(r, [], o); return ev; }
    if (sub === '--version' || sub === '-v' || sub === 'version') { o.l('git version 2.51.0.windows.1'); ev.git = 'version'; ev.ok = true; return ev; }
    if (sub === '--help') sub = 'help';
    ev.git = sub;
    ev.args = a;
    if (!C[sub]) {
      o.err("git: '" + sub + "' is not a git command. See 'git --help'.");
      var close = G.ALL.filter(function (c) { return lev(c, sub) <= 2; });
      if (close.length) {
        o.l('');
        o.l('The most similar command' + (close.length > 1 ? 's are' : ' is'));
        close.forEach(function (c) { o.l('\t' + c); });
      }
      return ev;
    }
    if (has(a, '-h')) { o.note('Real Git prints a short usage summary for "git ' + sub + '" here. Worth trying on your own PC.'); return ev; }
    if (!NO_REPO[sub] && (!r.inRepo || !r.initialized)) {
      o.err('fatal: not a git repository (or any of the parent directories): .git');
      if (!r.inRepo && r.exists) o.note('You are standing in ' + r.cwd() + '. The project is one folder deeper: cd ' + r.name);
      else if (!r.initialized) o.note('This folder is not a repository yet. git init turns it into one.');
      return ev;
    }
    C[sub](r, a, o);
    ev.ok = !o.failed;
    return ev;
  };

  /* ---------------- PowerShell basics inside the Git simulator ---------------- */
  var SH = {
    ls: 'ls', dir: 'ls', gci: 'ls', 'get-childitem': 'ls', cat: 'cat', type: 'cat', gc: 'cat', 'get-content': 'cat',
    notepad: 'edit', code: 'edit', edit: 'edit', start: 'edit', ii: 'edit', 'notepad++': 'edit',
    ni: 'ni', 'new-item': 'ni', touch: 'ni', echo: 'echo', 'write-output': 'echo', rm: 'rm', del: 'rm', 'remove-item': 'rm',
    cls: 'cls', clear: 'cls', pwd: 'pwd', 'get-location': 'pwd', cd: 'cd', 'set-location': 'cd', 'cd..': 'cd..', sl: 'cd',
    mkdir: 'mkdir', md: 'mkdir', ren: 'ren', 'rename-item': 'ren', mv: 'ren', move: 'ren', help: 'help', explorer: 'explorer'
  };
  function fileErr(o, cmd, r, n) { o.err(cmd + " : Cannot find path '" + r.cwd() + '\\' + n.replace(/^\.[\\/]/, '') + "' because it does not exist."); }
  G.shell = function (r, name, tk, line, o) {
    var redirect = null, m = line.match(/^(.*?)\s*(>>?)\s*([^\s>]+)\s*$/);
    if (m && /^(echo|write-output|["'])/i.test(line)) { redirect = { mode: m[2], file: m[3].replace(/^\.[\\/]/, '') }; tk = LG.tokens(m[1]); }
    var cmd = SH[name] || (/^["']/.test(line) ? 'echo' : null), args = tk.slice(1), p = args.filter(function (x) { return x[0] !== '-'; });
    var f;
    switch (cmd) {
      case 'pwd': o.l('\nPath\n----\n' + r.cwd() + '\n'); break;
      case 'ls':
        if (!r.inRepo) {
          if (r.exists) o.l(LG.psListing(r.base, [{ name: r.name, dir: true }]).join('\n'));
          else o.note('This folder is empty. PowerShell prints nothing for an empty folder.');
          break;
        }
        var ents = keys(r.work).map(function (n) { return { name: n, len: r.work[n].length }; });
        if (r.initialized && /-force|-h/i.test(args.join(' '))) ents.unshift({ name: '.git', dir: true });
        if (ents.length) o.l(LG.psListing(r.cwd(), ents).join('\n').replace('d----- ', 'd--h-- '));
        else o.note('The folder is empty' + (r.initialized ? ' apart from the hidden .git folder (ls -Force shows it)' : '') + '.');
        if (r.initialized && !/-force|-h/i.test(args.join(' ')) && r.once('hiddengit')) o.note('The .git folder is hidden, so ls skips it. ls -Force shows hidden items too.');
        break;
      case 'cat':
        if (!p[0]) { o.err('Say which file, for example: cat index.html'); break; }
        f = r.inRepo && r.findFile(p[0], r.work);
        if (!f || !(f in r.work)) { fileErr(o, name, r, p[0]); break; }
        if (r.work[f]) o.l(r.work[f]);
        break;
      case 'edit':
        if (!r.inRepo) { o.note('Go into the project folder first: cd ' + r.name); break; }
        if (!p[0] || p[0] === '.') { o.note('Say which file to open, for example: notepad index.html (or click a file\'s edit button).'); break; }
        o.view.openEditor(r.findFile(p[0], r.work) || p[0].replace(/^\.[\\/]/, ''));
        break;
      case 'ni':
        if (!p[0]) { o.err('Say what to create, for example: ni about.html'); break; }
        if (!r.inRepo) { o.note('Go into the project folder first: cd ' + r.name); break; }
        f = p[0].replace(/^\.[\\/]/, '');
        if (/[\\/]/.test(f)) { o.note('Subfolders are switched off in this simulator to keep the pictures simple.'); break; }
        if (r.findFile(f, r.work) && r.findFile(f, r.work) in r.work) { o.err(name + " : The file '" + r.cwd() + '\\' + f + "' already exists."); break; }
        r.work[f] = '';
        o.l(LG.psListing(r.cwd(), [{ name: f, len: 0 }]).join('\n'));
        if (name === 'touch') o.note('"touch" is a Linux / Git Bash command. It happens to work here, but in real PowerShell use: ni ' + f);
        break;
      case 'echo':
        var text = args.join(' ');
        if (!SH[name]) text = tk.join(' ');
        if (!redirect) { o.l(text); break; }
        if (!r.inRepo) { o.note('Go into the project folder first: cd ' + r.name); break; }
        f = r.findFile(redirect.file, r.work) || redirect.file;
        r.work[f] = redirect.mode === '>>' && r.work[f] != null ? (r.work[f] ? r.work[f] + '\n' : '') + text : text;
        if (r.once('utf16')) o.note('On a real PC, > in Windows PowerShell 5.1 saves the file as UTF-16, which Git treats as binary. Editing files in an editor is the safer habit.');
        break;
      case 'rm':
        if (!p[0]) { o.err('Say what to delete, for example: rm notes.txt'); break; }
        f = r.inRepo && r.findFile(p[0], r.work);
        if (!f || !(f in r.work)) { fileErr(o, name, r, p[0]); break; }
        delete r.work[f];
        break;
      case 'ren':
        if (p.length < 2) { o.err('Say old and new name, for example: ren notes.txt ideas.txt'); break; }
        f = r.inRepo && r.findFile(p[0], r.work);
        if (!f || !(f in r.work)) { fileErr(o, name, r, p[0]); break; }
        var to = p[1].replace(/^\.[\\/]/, '');
        if (to.toLowerCase() === f.toLowerCase()) {
          o.note('Windows treats ' + f + ' and ' + to + ' as the same name, so Git on Windows does not notice a case-only rename. Use: git mv ' + f + ' ' + to);
          break;
        }
        r.work[to] = r.work[f];
        delete r.work[f];
        break;
      case 'cls': o.view.term.clear(); break;
      case 'mkdir': o.note('Subfolders are switched off in this simulator to keep the pictures simple.'); break;
      case 'explorer': o.note('On a real PC this opens File Explorer in this folder.'); break;
      case 'cd..': p = ['..']; /* falls through */
      case 'cd':
        var t = (p[0] || '').replace(/^\.[\\/]/, '').replace(/[\\/]+$/, '').toLowerCase();
        if (!r.inRepo && r.exists && t === r.name.toLowerCase()) { r.inRepo = true; break; }
        if (r.inRepo && t === '..') {
          if (r.canLeave) { r.inRepo = false; break; }
          o.note('This mission keeps you inside the project folder.');
          break;
        }
        if (!t) break;
        o.err("cd : Cannot find path '" + r.cwd() + '\\' + p[0] + "' because it does not exist.");
        break;
      case 'help':
        o.l('This simulator understands every git command in the guide, plus these PowerShell basics:\n' +
          '  ls            list files          cat <file>     show a file\n' +
          '  notepad <f>   edit a file         ni <file>      create an empty file\n' +
          '  rm <file>     delete a file       ren <a> <b>    rename a file\n' +
          '  cd <folder>   change folder       cls            clear the screen\n' +
          'Keys: Up/Down recall earlier commands, Tab completes file and branch names.');
        break;
      default:
        LG.notRecognized(tk[0], o.view.term);
        o.failed = true;
    }
  };

  /* ---------------- local git commands ---------------- */
  C.init = function (r, a, o) {
    if (!r.inRepo) { o.note('Go into your project folder first, then run git init there.'); o.failed = true; return; }
    if (r.initialized) { o.l('Reinitialized existing Git repository in ' + fwd(r.dirPath()) + '/.git/'); return; }
    r.initialized = true;
    r.head = optVal(a, ['-b', '--initial-branch']) || r.config['init.defaultbranch'] || 'master';
    o.l('Initialized empty Git repository in ' + fwd(r.dirPath()) + '/.git/');
  };

  G.printStatus = function (r, o) {
    var st = r.status(), hid = r.headId();
    if (r.detached) o.html('<span class="r">HEAD detached at ' + short(r.detached) + '</span>');
    else o.l('On branch ' + r.head);
    var up = !r.detached && hid && r.upstream[r.head];
    if (up) {
      var rid = r.tracking[up];
      if (!rid) o.l("Your branch is based on '" + up + "', but the upstream is gone.");
      else {
        var ahead = r.countBetween(rid, hid), behind = r.countBetween(hid, rid), s = function (n) { return n + ' commit' + (n > 1 ? 's' : ''); };
        if (!ahead && !behind) o.l("Your branch is up to date with '" + up + "'.");
        else if (!behind) o.l("Your branch is ahead of '" + up + "' by " + s(ahead) + '.\n  (use "git push" to publish your local commits)');
        else if (!ahead) o.l("Your branch is behind '" + up + "' by " + s(behind) + ', and can be fast-forwarded.\n  (use "git pull" to update your local branch)');
        else o.l("Your branch and '" + up + "' have diverged,\nand have " + ahead + ' and ' + behind + ' different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)');
      }
    }
    if (r.merging) {
      o.l('');
      if (st.conflicts.length) o.l('You have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)');
      else o.l('All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
    }
    if (!hid) { o.l(''); o.l('No commits yet'); }
    o.l('');
    function list(items, cls) { items.forEach(function (x) { o.html('\t<span class="' + cls + '">' + esc(x) + '</span>'); }); o.l(''); }
    if (st.staged.length) {
      o.l('Changes to be committed:\n' + (hid ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)'));
      list(st.staged.map(function (x) { return LG.padEnd(x.k + ':', 12) + x.f; }), 'g');
    }
    if (st.conflicts.length) {
      o.l('Unmerged paths:\n  (use "git add <file>..." to mark resolution)');
      list(st.conflicts.map(function (f) { return 'both modified:   ' + f; }), 'r');
    }
    if (st.unstaged.length) {
      o.l('Changes not staged for commit:\n  (use "git add' + (st.unstaged.some(function (x) { return x.k === 'deleted'; }) ? '/rm' : '') +
        ' <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)');
      list(st.unstaged.map(function (x) { return LG.padEnd(x.k + ':', 12) + x.f; }), 'r');
    }
    if (st.untracked.length) {
      o.l('Untracked files:\n  (use "git add <file>..." to include in what will be committed)');
      list(st.untracked, 'r');
    }
    if (!st.staged.length && !st.conflicts.length) {
      if (st.unstaged.length) o.l('no changes added to commit (use "git add" and/or "git commit -a")');
      else if (st.untracked.length) o.l('nothing added to commit but untracked files present (use "git add" to track)');
      else if (!r.merging) o.l(hid ? 'nothing to commit, working tree clean' : 'nothing to commit (create/copy files and use "git add" to track)');
    }
    return st;
  };
  C.status = function (r, a, o) {
    if (!has(a, '-s') && !has(a, '--short')) { G.printStatus(r, o); return; }
    var st = r.status(), X = {}, Y = {};
    st.staged.forEach(function (x) { X[x.f] = x.k === 'new file' ? 'A' : x.k[0].toUpperCase(); });
    st.unstaged.forEach(function (x) { Y[x.f] = x.k[0].toUpperCase(); });
    st.conflicts.forEach(function (f) { o.html('<span class="r">UU</span> ' + esc(f)); });
    union(X, Y).forEach(function (f) {
      o.html('<span class="g">' + (X[f] || ' ') + '</span><span class="r">' + (Y[f] || ' ') + '</span> ' + esc(f));
    });
    st.untracked.forEach(function (f) { o.html('<span class="r">??</span> ' + esc(f)); });
  };

  C.add = function (r, a, o) {
    var p = plain(a), all = has(a, '-A') || has(a, '--all') || p.indexOf('.') >= 0, upd = has(a, '-u') || has(a, '--update');
    if (!p.length && !all && !upd) {
      o.l('Nothing specified, nothing added.');
      o.html('<span class="y">hint: Maybe you wanted to say \'git add .\'?</span>');
      return;
    }
    var targets = [];
    if (all) targets = union(r.work, r.index);
    else if (upd) targets = keys(r.index);
    else {
      for (var i = 0; i < p.length; i++) {
        if (/[*?]/.test(p[i])) {
          var re = globRe(p[i]), hits = union(r.work, r.index).filter(function (f) { return re.test(f); });
          if (!hits.length) { o.err("fatal: pathspec '" + p[i] + "' did not match any files"); return; }
          targets = targets.concat(hits);
        } else {
          var f = r.findFile(p[i]);
          if (!f) { o.err("fatal: pathspec '" + p[i] + "' did not match any files"); return; }
          targets.push(f);
        }
      }
    }
    var marked = [];
    targets.forEach(function (f) {
      if (f in r.work) r.index[f] = r.work[f]; else delete r.index[f];
      if (r.merging) {
        var k = r.merging.unresolved.indexOf(f);
        if (k >= 0) {
          r.merging.unresolved.splice(k, 1);
          if (/^(<{7}|={7}|>{7})/m.test(r.work[f] || '')) marked.push(f);
        }
      }
    });
    if (marked.length) o.note(marked.join(', ') + ' still contains conflict markers (<<<<<<< ======= >>>>>>>). Git lets you add it anyway, so always check the file first.');
    var real = targets.filter(function (f) { return f in r.work; });
    if (real.length && r.once('crlf')) {
      o.l("warning: in the working copy of '" + real[0] + "', LF will be replaced by CRLF the next time Git touches it");
      o.note('That warning is normal on Windows and harmless. Stop 16 explains line endings.');
    }
    o.ev.added = targets;
  };

  G.stageTracked = function (r) {
    keys(r.index).forEach(function (f) { if (f in r.work) r.index[f] = r.work[f]; else delete r.index[f]; });
  };
  C.commit = function (r, a, o) {
    var msg = optVal(a, ['-m', '--message', '-am']), amend = has(a, '--amend'), noEdit = has(a, '--no-edit');
    if (msg === '') { o.err("error: switch `m' requires a value"); return; }
    if (has(a, '-a') || has(a, '--all') || has(a, '-am')) G.stageTracked(r);
    var where = r.detached ? 'detached HEAD' : r.head;
    if (r.merging) {
      if (r.merging.unresolved.length) {
        o.err('error: Committing is not possible because you have unmerged files.');
        o.html('<span class="y">hint: Fix them up in the work tree, and then use \'git add/rm &lt;file&gt;\'</span>');
        o.html('<span class="y">hint: as appropriate to mark resolution and make a commit.</span>');
        o.err('fatal: Exiting because of an unresolved conflict.');
        return;
      }
      if (msg == null) o.note('In a real terminal your editor opens here with "' + r.merging.msg + '" already filled in. Save and close it to finish the merge.');
      var mc = r.makeCommit(msg || r.merging.msg, [r.headId(), r.merging.theirs], r.index);
      r.moveTo(mc.id, 'commit (merge): ' + mc.msg);
      r.merging = null;
      o.l('[' + where + ' ' + short(mc.id) + '] ' + mc.msg);
      o.ev.commit = mc.id;
      o.ev.merge = true;
      return;
    }
    if (amend) {
      var old = r.commits[r.headId()];
      if (!old) { o.err('fatal: You have nothing to amend.'); return; }
      if (msg == null && !noEdit) o.note('In a real terminal your editor opens with the old message so you can change it. Here the old message is kept; use -m "new message" to replace it.');
      var nc = r.makeCommit(msg || old.msg, old.parents, r.index, { lane: old.lane });
      r.moveTo(nc.id, 'commit (amend): ' + nc.msg);
      o.l('[' + where + ' ' + short(nc.id) + '] ' + nc.msg);
      o.l(' Date: ' + G.fmtDate(old.time));
      G.printStats(o, G.stats(r.tree(old.parents[0]), nc.tree));
      o.ev.commit = nc.id;
      o.ev.amend = true;
      return;
    }
    if (msg == null) {
      o.note('Without -m, Git opens your text editor and waits for you to write a message, save, and close it. ' +
        '(If that editor turns out to be Vim: press i, type, press Esc, then type :wq and Enter.) Here, add the message directly: git commit -m "Describe the change"');
      o.failed = true;
      return;
    }
    if (!r.status().staged.length) { G.printStatus(r, o); o.failed = true; return; }
    var parent = r.headId(), c = r.makeCommit(msg, parent ? [parent] : [], r.index);
    r.moveTo(c.id, 'commit' + (parent ? '' : ' (initial)') + ': ' + msg);
    o.l('[' + where + (parent ? '' : ' (root-commit)') + ' ' + short(c.id) + '] ' + msg);
    G.printStats(o, G.stats(r.tree(parent), c.tree));
    o.ev.commit = c.id;
  };

  G.decorations = function (r) {
    var d = {};
    function add(id, h) { if (id) (d[id] = d[id] || []).push(h); }
    if (r.detached) add(r.detached, '<span class="y b">HEAD</span>');
    else if (r.branches[r.head]) add(r.branches[r.head], '<span class="y b">HEAD -&gt; </span><span class="g b">' + esc(r.head) + '</span>');
    keys(r.branches).forEach(function (b) { if (r.detached || b !== r.head) add(r.branches[b], '<span class="g b">' + esc(b) + '</span>'); });
    keys(r.tracking).forEach(function (k) { add(r.tracking[k], '<span class="r b">' + esc(k) + '</span>'); });
    keys(r.tags).forEach(function (t) { add(r.tags[t], '<span class="y b">tag: ' + esc(t) + '</span>'); });
    var out = {};
    Object.keys(d).forEach(function (id) { out[id] = d[id].join('<span class="y">, </span>'); });
    return out;
  };
  function header(r, o, id, deco) {
    var c = r.commits[id];
    o.html('<span class="y">commit ' + id + '</span>' + (deco[id] ? ' <span class="y">(</span>' + deco[id] + '<span class="y">)</span>' : ''));
    if (c.parents.length > 1) o.l('Merge: ' + c.parents.map(short).join(' '));
    o.l('Author: ' + c.author + ' <' + c.email + '>');
    o.l('Date:   ' + G.fmtDate(c.time));
    o.l('');
    c.msg.split('\n').forEach(function (l) { o.l('    ' + l); });
    o.l('');
  }
  C.log = function (r, a, o) {
    var one = has(a, '--oneline'), all = has(a, '--all'), nMax = null, starts = [];
    a.forEach(function (x, i) { var m = x.match(/^-(\d+)$/); if (m) nMax = +m[1]; if (x === '-n') nMax = +a[i + 1]; });
    var refs = plain(a, ['-n']);
    if (all) {
      keys(r.branches).forEach(function (b) { starts.push(r.branches[b]); });
      keys(r.tracking).forEach(function (k) { starts.push(r.tracking[k]); });
      keys(r.tags).forEach(function (k) { starts.push(r.tags[k]); });
      if (r.headId()) starts.push(r.headId());
    } else if (refs.length) {
      for (var i = 0; i < refs.length; i++) {
        var id = r.resolve(refs[i]);
        if (!id) { o.err("fatal: ambiguous argument '" + refs[i] + "': unknown revision or path not in the working tree."); return; }
        starts.push(id);
      }
    } else {
      if (!r.headId()) { o.err("fatal: your current branch '" + r.head + "' does not have any commits yet"); return; }
      starts.push(r.headId());
    }
    var seen = {};
    starts.forEach(function (s) { var an = r.ancestors(s); for (var k in an) seen[k] = 1; });
    var list = Object.keys(seen).sort(function (x, y) { return r.commits[y].n - r.commits[x].n; });
    if (nMax != null) list = list.slice(0, nMax);
    var deco = G.decorations(r);
    list.forEach(function (id) {
      if (!one) { header(r, o, id, deco); return; }
      o.html((has(a, '--graph') ? '* ' : '') + '<span class="y">' + short(id) + '</span>' +
        (deco[id] ? ' <span class="y">(</span>' + deco[id] + '<span class="y">)</span>' : '') + ' ' + esc(firstLine(r.commits[id].msg)));
    });
    if (has(a, '--graph') && r.once('graphnote')) o.note('Real Git draws the branch lines with * | / \\ characters. The map next to this terminal shows the same thing.');
    if (!one && list.length > 2 && r.once('pager')) o.note('On a real PC, long output like this opens in a "pager": Space scrolls, q quits and gives you the prompt back.');
  };

  G.printDiff = function (o, f, A, B) {
    o.html('<span class="b">diff --git a/' + esc(f) + ' b/' + esc(f) + '</span>');
    if (A == null) o.html('<span class="b">new file mode 100644</span>');
    if (B == null) o.html('<span class="b">deleted file mode 100644</span>');
    o.html('<span class="b">--- ' + (A == null ? '/dev/null' : 'a/' + esc(f)) + '</span>');
    o.html('<span class="b">+++ ' + (B == null ? '/dev/null' : 'b/' + esc(f)) + '</span>');
    var la = G.lines(A).length, lb = G.lines(B).length;
    o.html('<span class="y">@@ -' + (la ? '1,' + la : '0,0') + ' +' + (lb ? '1,' + lb : '0,0') + ' @@</span>');
    G.diffLines(A, B).forEach(function (op) {
      o.html(op.t === '+' ? '<span class="g">+' + esc(op.s) + '</span>' : op.t === '-' ? '<span class="r">-' + esc(op.s) + '</span>' : ' ' + esc(op.s));
    });
  };
  C.diff = function (r, a, o) {
    var staged = has(a, '--staged') || has(a, '--cached'), p = plain(a), from, to, files = [], two = false;
    if (!staged && p.length && r.resolve(p[0]) && !r.findFile(p[0])) {
      from = r.tree(r.resolve(p.shift()));
      to = r.work;
      if (p.length && r.resolve(p[0]) && !r.findFile(p[0])) { to = r.tree(r.resolve(p.shift())); two = true; }
    } else if (staged) { from = r.headTree(); to = r.index; }
    else { from = r.index; to = r.work; }
    p.forEach(function (x) { files.push(r.findFile(x) || x); });
    var shown = 0;
    union(from, to).forEach(function (f) {
      if (files.length && files.indexOf(f) < 0) return;
      if (!two && to === r.work && !(f in r.index)) return;
      if (from[f] === to[f]) return;
      shown++;
      G.printDiff(o, f, from[f], to[f]);
    });
    if (!shown) o.note(staged ? 'No output means nothing is staged right now.' : 'No output means no differences. (Changes that are already staged show up with git diff --staged.)');
    o.ev.shown = shown;
  };
  C.show = function (r, a, o) {
    var ref = plain(a)[0] || 'HEAD', id = r.resolve(ref);
    if (!id) { o.err("fatal: ambiguous argument '" + ref + "': unknown revision or path not in the working tree."); return; }
    var c = r.commits[id];
    header(r, o, id, G.decorations(r));
    if (c.parents.length > 1) { o.note('This is a merge commit. Real git show prints a special "combined diff" here, which is often empty.'); return; }
    var P = r.tree(c.parents[0]);
    union(P, c.tree).forEach(function (f) { if (P[f] !== c.tree[f]) G.printDiff(o, f, P[f], c.tree[f]); });
  };

  C.restore = function (r, a, o) {
    var staged = has(a, '--staged') || has(a, '-S'), src = optVal(a, ['--source', '-s']), p = plain(a, ['--source', '-s']);
    if (!p.length) { o.err('fatal: you must specify path(s) to restore'); return; }
    var srcId = src ? r.resolve(src) : null;
    if (src && !srcId) { o.err('fatal: could not resolve ' + src); return; }
    var H = r.headTree(), targets = [];
    if (p.indexOf('.') >= 0) targets = staged ? union(r.index, H) : keys(r.index);
    else {
      for (var i = 0; i < p.length; i++) {
        var f = r.findFile(p[i], staged ? H : r.index);
        if (!f || (!staged && !srcId && !(f in r.index)) || (staged && !(f in r.index) && !(f in H))) {
          o.err("error: pathspec '" + p[i] + "' did not match any file(s) known to git");
          return;
        }
        targets.push(f);
      }
    }
    targets.forEach(function (f) {
      if (staged) { if (f in H) r.index[f] = H[f]; else delete r.index[f]; }
      else {
        var S = srcId ? r.tree(srcId) : r.index;
        if (f in S) r.work[f] = S[f];
      }
      if (r.merging && r.merging.unresolved.indexOf(f) >= 0 && !staged) o.note('Restoring a conflicted file is tricky in real Git. Resolving it in the editor is the normal route.');
    });
    o.ev.restored = targets;
  };
  C.rm = function (r, a, o) {
    var cached = has(a, '--cached'), p = plain(a), fs = [];
    if (!p.length) { o.err('usage: git rm [<options>] [--] <file>...'); return; }
    for (var i = 0; i < p.length; i++) {
      var f = r.findFile(p[i]);
      if (!f || !(f in r.index)) { o.err("fatal: pathspec '" + p[i] + "' did not match any files"); return; }
      fs.push(f);
    }
    fs.forEach(function (f) { delete r.index[f]; if (!cached) delete r.work[f]; o.l("rm '" + f + "'"); });
  };
  C.mv = function (r, a, o) {
    var p = plain(a);
    if (p.length !== 2) { o.err('usage: git mv [<options>] <source>... <destination>'); return; }
    var src = r.findFile(p[0]), dst = p[1].replace(/^\.[\\/]/, '');
    if (!src || !(src in r.index)) { o.err('fatal: not under version control, source=' + p[0] + ', destination=' + dst); return; }
    var clash = r.findFile(dst);
    if (clash && clash.toLowerCase() !== src.toLowerCase()) { o.err('fatal: destination exists, source=' + src + ', destination=' + dst); return; }
    if (dst === src) return;
    r.work[dst] = r.work[src];
    r.index[dst] = r.index[src];
    delete r.work[src];
    delete r.index[src];
  };
  C.config = function (r, a, o) {
    var p = plain(a);
    if (has(a, '--list') || has(a, '-l')) { keys(r.config).forEach(function (k) { o.l(k + '=' + r.config[k]); }); return; }
    if (!p.length) { o.err('usage: git config [<options>]'); return; }
    var key = p[0].toLowerCase();
    if (p.length === 1) { if (r.config[key] != null) o.l(r.config[key]); else o.failed = true; return; }
    r.config[key] = p.slice(1).join(' ');
    o.ev.config = key;
  };
  C.reflog = function (r, a, o) {
    var deco = G.decorations(r);
    r.reflog.forEach(function (e, i) {
      o.html('<span class="y">' + short(e.id) + '</span> ' + (i === 0 && deco[e.id] ? '<span class="y">(</span>' + deco[e.id] + '<span class="y">)</span> ' : '') +
        'HEAD@{' + i + '}: ' + esc(e.why));
    });
    if (!r.reflog.length) o.note('Empty: nothing has happened in this repository yet.');
  };
  C.tag = function (r, a, o) {
    var p = plain(a, ['-m']);
    if (!p.length) { keys(r.tags).forEach(function (t) { o.l(t); }); return; }
    if (has(a, '-d') || has(a, '--delete')) {
      p.forEach(function (t) {
        if (!r.tags[t]) { o.err("error: tag '" + t + "' not found."); return; }
        o.l("Deleted tag '" + t + "' (was " + short(r.tags[t]) + ')');
        delete r.tags[t];
      });
      return;
    }
    var target = p[1] ? r.resolve(p[1]) : r.headId();
    if (!target) { o.err("fatal: Failed to resolve '" + (p[1] || 'HEAD') + "' as a valid ref."); return; }
    if (r.tags[p[0]]) { o.err("fatal: tag '" + p[0] + "' already exists"); return; }
    r.tags[p[0]] = target;
    o.ev.tag = p[0];
  };
  C.help = function (r, a, o) {
    var p = plain(a);
    if (p[0]) { o.note('On Windows, git help ' + p[0] + ' opens the full manual for "' + p[0] + '" in your web browser. git ' + p[0] + ' -h prints a short summary in the terminal instead.'); return; }
    o.l('usage: git [-v | --version] [-h | --help] <command> [<args>]\n\nThese are common Git commands used in various situations:\n\n' +
      'start a working area\n   clone     Clone a repository into a new directory\n   init      Create an empty Git repository\n\n' +
      'work on the current change\n   add       Add file contents to the index\n   mv        Move or rename a file\n   restore   Restore working tree files\n   rm        Remove files from the working tree and from the index\n\n' +
      'examine the history and state\n   diff      Show changes between commits, commit and working tree, etc\n   log       Show commit logs\n   show      Show various types of objects\n   status    Show the working tree status\n\n' +
      'grow, mark and tweak your common history\n   branch    List, create, or delete branches\n   commit    Record changes to the repository\n   merge     Join two or more development histories together\n' +
      '   rebase    Reapply commits on top of another base tip\n   reset     Reset current HEAD to the specified state\n   switch    Switch branches\n   tag       Create, list, delete tags\n\n' +
      'collaborate\n   fetch     Download objects and refs from another repository\n   pull      Fetch from and integrate with another repository or a local branch\n   push      Update remote refs along with associated objects');
  };
})();

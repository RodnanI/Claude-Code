/* Terminal UI shared by both simulators, the mission checklist, and the
   "pretend PC" PowerShell practice widget used in the terminal stop. */
(function () {
  'use strict';
  var LG = window.LG, esc = LG.esc;

  LG.padStart = function (s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; };
  LG.padEnd = function (s, n) { s = String(s); while (s.length < n) s += ' '; return s; };

  /* Split "a; b" into commands, ignoring semicolons inside quotes. */
  LG.splitCmds = function (s) {
    var parts = [], cur = '', q = null;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { if (c === q) q = null; cur += c; }
      else if (c === '"' || c === "'") { q = c; cur += c; }
      else if (c === ';') { parts.push(cur); cur = ''; }
      else cur += c;
    }
    parts.push(cur);
    return parts.map(function (x) { return x.trim(); }).filter(Boolean);
  };
  /* PowerShell-ish word splitting: quotes group words, quotes are removed. */
  LG.tokens = function (s) {
    var out = [], re = /"([^"]*)"|'([^']*)'|(\S+)/g, m;
    while ((m = re.exec(s))) out.push(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]);
    return out;
  };
  /* Windows PowerShell 5.1 (the one preinstalled) rejects &&. Worth seeing once in a safe place. */
  LG.ampCheck = function (line, t) {
    var at = line.indexOf('&&');
    if (at < 0) return false;
    t.line('At line:1 char:' + (at + 1), 'err');
    t.line('+ ' + line, 'err');
    t.line('+ ' + LG.padStart('', at) + '~~', 'err');
    t.line("The token '&&' is not a valid statement separator in this version.", 'err');
    t.line('Windows PowerShell 5.1 does not understand &&. Run the commands one at a time, or separate them with ; instead. (PowerShell 7 does understand &&.)', 'note');
    return true;
  };
  LG.notRecognized = function (name, t) {
    t.line(name + " : The term '" + name + "' is not recognized as the name of a cmdlet, function, script file, or operable program. " +
      'Check the spelling of the name, or if a path was included, verify that the path is correct and try again.', 'err');
  };

  /* ---------------- Term: a fake Windows Terminal tab ---------------- */
  function Term(host, o) {
    this.o = o || {};
    this.hist = [];
    this.hi = 0;
    this.cyc = null;
    var el = this.el = LG.h('div', 'term');
    el.innerHTML = '<div class="term-bar"><span class="term-tab"><i class="ps-ico"></i>' + esc(this.o.title || 'Windows PowerShell') + '</span>' +
      '<span class="term-extra"></span><span class="term-win" aria-hidden="true"><i></i><i></i><i></i></span></div>' +
      '<div class="term-body"><div class="term-out" role="log" aria-live="polite"></div>' +
      '<form class="term-line" autocomplete="off"><span class="term-prompt"></span>' +
      '<input class="term-in" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Type a command, then press Enter">' +
      '<button class="term-run" type="submit">Run</button></form></div>';
    host.appendChild(el);
    this.out = el.querySelector('.term-out');
    this.input = el.querySelector('.term-in');
    this.promptEl = el.querySelector('.term-prompt');
    this.body = el.querySelector('.term-body');
    this.extra = el.querySelector('.term-extra');
    var self = this;
    el.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); self.submit(); });
    this.input.addEventListener('keydown', function (e) { self.key(e); });
    this.body.addEventListener('mouseup', function (e) {
      if (e.target.closest('button, a')) return;
      if (!String(window.getSelection())) self.input.focus({ preventScroll: true });
    });
    this.setPrompt();
    if (this.o.banner) this.print(this.o.banner, 'dim');
  }
  Term.prototype.setPrompt = function () {
    this.promptText = this.o.prompt ? this.o.prompt() : 'PS C:\\>';
    this.promptEl.textContent = this.promptText;
  };
  Term.prototype.line = function (text, cls) {
    var d = LG.h('div', 'tl' + (cls ? ' ' + cls : ''));
    d.textContent = text;
    this.out.appendChild(d);
    return d;
  };
  Term.prototype.html = function (html, cls) {
    var d = LG.h('div', 'tl' + (cls ? ' ' + cls : ''), html);
    this.out.appendChild(d);
    return d;
  };
  Term.prototype.print = function (text, cls) {
    var self = this;
    String(text).split('\n').forEach(function (l) { self.line(l, cls); });
  };
  Term.prototype.clear = function () { this.out.innerHTML = ''; };
  Term.prototype.scroll = function () { this.body.scrollTop = this.body.scrollHeight; };
  Term.prototype.fill = function (text) {
    this.input.value = text;
    this.input.focus({ preventScroll: true });
    this.scroll();
  };
  Term.prototype.submit = function () {
    var v = this.input.value;
    this.input.value = '';
    this.cyc = null;
    this.html('<span class="tp">' + esc(this.promptText) + '</span> ' + esc(v), 'cmdline');
    if (v.trim() && this.hist[this.hist.length - 1] !== v) this.hist.push(v);
    this.hi = this.hist.length;
    if (v.trim() && this.o.exec) this.o.exec(v, this);
    this.setPrompt();
    this.scroll();
  };
  Term.prototype.key = function (e) {
    if (e.key === 'ArrowUp') {
      if (this.hi > 0) { this.hi--; this.input.value = this.hist[this.hi]; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (this.hi < this.hist.length) { this.hi++; this.input.value = this.hist[this.hi] || ''; }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.complete(e.shiftKey);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      this.clear();
    } else if (e.key === 'c' && e.ctrlKey && !String(window.getSelection())) {
      // Like PowerShell: Ctrl+C with nothing selected abandons the line you were typing.
      e.preventDefault();
      this.html('<span class="tp">' + esc(this.promptText) + '</span> ' + esc(this.input.value) + '^C', 'cmdline');
      this.input.value = '';
      this.scroll();
    } else if (e.key !== 'Shift') {
      this.cyc = null;
    }
  };
  /* PowerShell-style Tab: completes, and pressing Tab again cycles through matches. */
  Term.prototype.complete = function (back) {
    if (!this.o.complete) return;
    if (!this.cyc || this.input.value !== this.cyc.last) {
      var v = this.input.value, m = v.match(/^(.*?)([^\s"']*)$/);
      var list = this.o.complete(m[2], m[1]) || [];
      if (!list.length) return;
      this.cyc = { before: m[1], list: list, i: 0 };
    } else {
      var n = this.cyc.list.length;
      this.cyc.i = (this.cyc.i + (back ? n - 1 : 1)) % n;
    }
    this.input.value = this.cyc.before + this.cyc.list[this.cyc.i];
    this.cyc.last = this.input.value;
  };
  LG.Term = Term;

  /* ---------------- Tasks: the mission checklist next to a terminal ---------------- */
  function Tasks(host, o) {
    this.o = o;
    this.steps = o.steps || [];
    this.i = 0;
    this.el = LG.h('div', 'tasks');
    host.appendChild(this.el);
    this.render();
  }
  Tasks.prototype.render = function () {
    var self = this, n = this.steps.length;
    var html = '<div class="tasks-head"><h3>' + esc(this.o.title || 'Your mission') + '</h3><span class="tasks-count">' +
      (n ? Math.min(this.i, n) + ' of ' + n + ' done' : 'Free play') + '</span></div>';
    if (this.o.intro) html += '<p class="tasks-intro">' + this.o.intro + '</p>';
    var lo = 0, hi = n, cp = this.o.compact && n > 6;
    if (cp) { lo = Math.max(0, Math.min(this.i - 1, n - 5)); hi = Math.min(n, lo + 5); }
    if (cp && lo > 0) html += '<p class="tk-more">' + lo + ' earlier step' + (lo === 1 ? '' : 's') + ' done</p>';
    html += '<ol class="task-list" start="' + (lo + 1) + '">' + this.steps.map(function (s, i) {
      if (i < lo || i >= hi) return '';
      var st = i < self.i ? 'done' : i === self.i ? 'now' : 'todo', btns = '';
      if (i === self.i) {
        if (s.hint) btns += '<button class="btn sm tk-hint" type="button">Type it for me</button>';
        if (s.btn) btns += '<button class="btn sm primary tk-act" type="button">' + esc(s.btn.label) + '</button>';
      }
      return '<li class="' + st + '"><span class="tk-dot"></span><div class="tk-t">' + s.t + '</div>' +
        (btns ? '<div class="tk-btns">' + btns + '</div>' : '') + '</li>';
    }).join('') + '</ol>';
    if (cp && hi < n) html += '<p class="tk-more">' + (n - hi) + ' more step' + (n - hi === 1 ? '' : 's') + ' after these</p>';
    if (n && this.i >= n) html += '<div class="tk-win">' + (this.o.win || 'Mission complete.') + '</div>';
    this.el.innerHTML = html;
    var cur = this.steps[this.i];
    var hb = this.el.querySelector('.tk-hint');
    if (hb) hb.addEventListener('click', function () {
      if (self.o.onHint) self.o.onHint(typeof cur.hint === 'function' ? cur.hint(self.o.ctx ? self.o.ctx({}) : {}) : cur.hint);
    });
    var ab = this.el.querySelector('.tk-act');
    if (ab) ab.addEventListener('click', function () {
      var ctx = self.o.ctx ? self.o.ctx({ action: true }) : { action: true };
      cur.btn.run(ctx);
      if (self.o.onAction) self.o.onAction();
      self.check(ctx);
    });
  };
  /* Steps with ev:1 are "run this command" steps; they never chain off an earlier step's command. */
  Tasks.prototype.check = function (ctx) {
    var moved = false;
    while (this.i < this.steps.length) {
      var s = this.steps[this.i], ok = false;
      if (moved && s.ev) break;
      try { ok = !!s.check(ctx); } catch (e) { ok = false; }
      if (!ok) break;
      this.i++;
      moved = true;
      var nx = this.steps[this.i];
      if (nx && nx.on) nx.on(ctx);
    }
    if (moved) this.render();
    return moved;
  };
  LG.Tasks = Tasks;

  /* ---------------- The pretend PC for practising PowerShell ---------------- */
  var HOME = ['Users', 'you'];
  function dir(k) { return { d: true, k: k || {} }; }
  function file(b) { return { d: false, b: b || '' }; }
  function mkfs() {
    return dir({
      Users: dir({ you: dir({
        Desktop: dir({ 'shopping-list.txt': file('eggs\nbread\ncoffee') }),
        Documents: dir({ 'notes.txt': file('Things to learn:\n- the terminal\n- Git\n- GitHub'), 'cv.docx': file('(a Word document)') }),
        Downloads: dir({ 'cat-video.mp4': file('(a video)'), 'Git-Setup.exe': file('(an installer)') }),
        Music: dir({}),
        Pictures: dir({ 'holiday.jpg': file('(a photo)') })
      }) }),
      'Program Files': dir({}),
      Windows: dir({ System32: dir({}) })
    });
  }
  function findKey(node, name) {
    var lk = name.toLowerCase();
    for (var k in node.k) if (k.toLowerCase() === lk) return k;
    return null;
  }
  function walk(root, parts) {
    var node = root, real = [];
    for (var i = 0; i < parts.length; i++) {
      if (!node.d) return null;
      var k = findKey(node, parts[i]);
      if (k === null) return null;
      node = node.k[k];
      real.push(k);
    }
    return { node: node, parts: real };
  }
  function parsePath(cwd, p) {
    p = String(p).replace(/\//g, '\\');
    var parts;
    if (/^[a-z]:/i.test(p)) { parts = []; p = p.slice(2); }
    else if (p[0] === '\\') parts = [];
    else if (p === '~' || p.indexOf('~\\') === 0) { parts = HOME.slice(); p = p.slice(1); }
    else parts = cwd.slice();
    p.split('\\').forEach(function (s) {
      if (!s || s === '.') return;
      if (s === '..') parts.pop(); else parts.push(s);
    });
    return parts;
  }
  function showPath(parts) { return 'C:\\' + parts.join('\\'); }
  function stamp() {
    var d = new Date(), h = d.getHours();
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' +
      LG.padStart((h % 12 || 12) + ':' + LG.pad2(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM'), 8);
  }
  /* Output shaped like PowerShell's Get-ChildItem table. entries: [{name, dir, len}] */
  LG.psListing = function (where, entries) {
    var ts = stamp(), lines = ['', '    Directory: ' + where, '', 'Mode                 LastWriteTime         Length Name',
      '----                 -------------         ------ ----'];
    entries.forEach(function (e) {
      lines.push((e.dir ? 'd-----' : '-a----') + LG.padStart(ts, 28) + LG.padStart(e.dir ? '' : String(e.len), 15) + ' ' + e.name);
    });
    lines.push('');
    return lines;
  };
  function sortedEntries(node) {
    return Object.keys(node.k).sort(function (a, b) {
      var da = node.k[a].d, db = node.k[b].d;
      if (da !== db) return da ? -1 : 1;
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
    });
  }
  var ALIAS = {
    pwd: 'pwd', 'get-location': 'pwd', gl: 'pwd', ls: 'ls', dir: 'ls', gci: 'ls', 'get-childitem': 'ls',
    cd: 'cd', chdir: 'cd', sl: 'cd', 'set-location': 'cd', 'cd..': 'cd..', 'cd\\': 'cd\\',
    mkdir: 'mkdir', md: 'mkdir', ni: 'ni', 'new-item': 'ni', touch: 'touch',
    cat: 'cat', type: 'cat', gc: 'cat', 'get-content': 'cat',
    rm: 'rm', del: 'rm', erase: 'rm', rmdir: 'rm', rd: 'rm', ri: 'rm', 'remove-item': 'rm',
    cls: 'cls', clear: 'cls', 'clear-host': 'cls', echo: 'echo', 'write-output': 'echo',
    help: 'help', whoami: 'whoami', exit: 'exit', explorer: 'explorer', ii: 'explorer', 'invoke-item': 'explorer',
    start: 'explorer', code: 'code', notepad: 'notepad', git: 'git', winget: 'winget'
  };
  var NAMES = ['cd', 'ls', 'dir', 'pwd', 'mkdir', 'ni', 'cat', 'cls', 'rm', 'echo', 'help', 'git', 'notepad', 'explorer',
    'Get-ChildItem', 'Get-Content', 'Get-Location', 'Set-Location', 'New-Item', 'Remove-Item', 'Clear-Host'];

  var SHELL_STEPS = function (home) {
    return [
      { t: 'Ask where you are: type <code>pwd</code> and press <kbd>Enter</kbd>. It means "print working directory".', hint: 'pwd', ev: 1,
        check: function (c) { return c.cmd === 'pwd'; } },
      { t: 'List what is in this folder: <code>ls</code>', hint: 'ls', ev: 1,
        check: function (c) { return c.cmd === 'ls' && c.where === home; } },
      { t: 'Walk into the Documents folder: <code>cd Documents</code>', hint: 'cd Documents',
        check: function (c) { return c.where === home + '\\Documents'; } },
      { t: 'Look around in there: <code>ls</code>', hint: 'ls', ev: 1,
        check: function (c) { return c.cmd === 'ls'; } },
      { t: 'Read a file without opening it: <code>cat notes.txt</code>', hint: 'cat notes.txt', ev: 1,
        check: function (c) { return c.cmd === 'cat' && c.ok; } },
      { t: 'Go back up one level: <code>cd ..</code> (two dots mean "the folder above this one")', hint: 'cd ..',
        check: function (c) { return c.where === home; } },
      { t: 'Make a folder for your projects: <code>mkdir projects</code>', hint: 'mkdir projects',
        check: function (c) { return c.exists(home + '\\projects'); } },
      { t: 'Go into it. Type <code>cd pro</code>, press <kbd>Tab</kbd> to auto-complete the name, then <kbd>Enter</kbd>.', hint: 'cd .\\projects\\',
        check: function (c) { return c.where === home + '\\projects'; } },
      { t: 'Create an empty file: <code>ni hello.txt</code> (short for New-Item)', hint: 'ni hello.txt',
        check: function (c) { return c.exists(home + '\\projects\\hello.txt'); } },
      { t: 'Check that it is there: <code>ls</code>', hint: 'ls', ev: 1,
        check: function (c) { return c.cmd === 'ls' && c.where === home + '\\projects'; } },
      { t: 'Try <code>git --version</code>. It fails on purpose: this pretend PC has no Git yet. Read the error, you will meet it again.', hint: 'git --version', ev: 1,
        check: function (c) { return c.cmd === 'git'; } },
      { t: 'Wipe the screen clean: <code>cls</code>', hint: 'cls', ev: 1,
        check: function (c) { return c.cmd === 'cls'; } }
    ];
  };

  LG.widgets.shellsim = function (host) {
    var wrap = LG.h('div', 'shs'), left = LG.h('div'), right = LG.h('div');
    wrap.appendChild(left);
    wrap.appendChild(right);
    host.appendChild(wrap);
    var root, cwd, term, tasks, home = showPath(HOME);

    function start() {
      root = mkfs();
      cwd = HOME.slice();
      left.innerHTML = '';
      right.innerHTML = '';
      tasks = new Tasks(left, {
        title: 'Practice run', steps: SHELL_STEPS(home),
        win: 'You just navigated folders, created a folder and a file, and read an error message calmly. That is 90% of the terminal skill Git needs.',
        onHint: function (h) { term.fill(h); }
      });
      var again = LG.h('button', 'btn sm', 'Start over with a fresh pretend PC');
      again.type = 'button';
      again.style.marginTop = '12px';
      again.addEventListener('click', start);
      left.appendChild(again);
      term = new Term(right, {
        prompt: function () { return 'PS ' + showPath(cwd) + '>'; },
        exec: run, complete: complete,
        banner: 'Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.\n\n' +
          'This is a pretend PC inside the page. Nothing you type here touches your real files.\n'
      });
    }
    function complete(word, before) {
      if (!before.trim()) {
        var lw = word.toLowerCase();
        return NAMES.filter(function (n) { return n.toLowerCase().indexOf(lw) === 0; });
      }
      var i = Math.max(word.lastIndexOf('\\'), word.lastIndexOf('/'));
      var dirPart = i >= 0 ? word.slice(0, i + 1) : '', pre = word.slice(i + 1).toLowerCase();
      var w = walk(root, parsePath(cwd, dirPart || '.'));
      if (!w || !w.node.d) return [];
      return sortedEntries(w.node).filter(function (n) { return n.toLowerCase().indexOf(pre) === 0; }).map(function (n) {
        var full = (dirPart || '.\\') + n + (w.node.k[n].d ? '\\' : '');
        return /\s/.test(full) ? "'" + full + "'" : full;
      });
    }
    function run(line, t) {
      if (LG.ampCheck(line, t)) return;
      LG.splitCmds(line).forEach(function (one) { runOne(one, t); });
    }
    function runOne(line, t) {
      var redirect = null, m = line.match(/^(.*?)\s*(>>?)\s*([^\s>]+)\s*$/);
      if (m && /^(echo|write-output|["'])/i.test(line)) { redirect = { mode: m[2], file: m[3] }; line = m[1]; }
      var tk = LG.tokens(line), name = (tk[0] || '').toLowerCase(), cmd = ALIAS[name];
      if (!cmd && /^["']/.test(line)) cmd = 'echo';
      var args = tk.slice(1), ok = true;
      function err(msg) { t.line(name + ' : ' + msg, 'err'); ok = false; }
      function target(p) { return walk(root, parsePath(cwd, p)); }
      var plain = args.filter(function (a) { return a[0] !== '-'; });

      switch (cmd) {
        case 'pwd':
          t.print('\nPath\n----\n' + showPath(cwd) + '\n');
          break;
        case 'ls': {
          var w = target(plain[0] || '.');
          if (!w) { err("Cannot find path '" + showPath(parsePath(cwd, plain[0])) + "' because it does not exist."); break; }
          if (!w.node.d) { t.print(LG.psListing(showPath(w.parts.slice(0, -1)), [{ name: w.parts[w.parts.length - 1], len: w.node.b.length }]).join('\n')); break; }
          var ents = sortedEntries(w.node).map(function (n) { var x = w.node.k[n]; return { name: n, dir: x.d, len: x.d ? 0 : x.b.length }; });
          if (ents.length) t.print(LG.psListing(showPath(w.parts), ents).join('\n'));
          else t.line('(This folder is empty, so PowerShell prints nothing at all.)', 'note');
          break;
        }
        case 'cd..': plain = ['..']; /* falls through */
        case 'cd\\': if (cmd === 'cd\\') plain = ['\\']; /* falls through */
        case 'cd': {
          if (plain.length > 1) {
            t.line("Set-Location : A positional parameter cannot be found that accepts argument '" + plain[1] + "'.", 'err');
            t.line('A name with a space must be wrapped in quotes, for example: cd \'C:\\Program Files\'', 'note');
            ok = false;
            break;
          }
          if (!plain.length) { cwd = HOME.slice(); break; }
          var d = target(plain[0]);
          if (!d) { err("Cannot find path '" + showPath(parsePath(cwd, plain[0])) + "' because it does not exist."); t.line('Check the spelling, or press Tab to let PowerShell complete names for you.', 'note'); break; }
          if (!d.node.d) { err("Cannot find path '" + showPath(d.parts) + "' because it is a file, not a folder."); break; }
          cwd = d.parts;
          break;
        }
        case 'mkdir':
        case 'ni':
        case 'touch': {
          var isDir = cmd === 'mkdir' || /^dir/i.test(args[args.indexOf('-ItemType') + 1] || args[args.indexOf('-Type') + 1] || '');
          var nm = plain.filter(function (a) { return !/^(directory|file)$/i.test(a); })[0];
          if (!nm) { err('Please give a name, for example: ' + (isDir ? 'mkdir projects' : 'ni hello.txt')); break; }
          var parts = parsePath(cwd, nm), leaf = parts.pop(), parent = walk(root, parts);
          if (!parent || !parent.node.d) { err("Could not find a part of the path '" + showPath(parts) + "'."); break; }
          if (findKey(parent.node, leaf) !== null) {
            err(isDir ? 'An item with the specified name ' + showPath(parts.concat(leaf)) + ' already exists.' : "The file '" + showPath(parts.concat(leaf)) + "' already exists.");
            break;
          }
          parent.node.k[leaf] = isDir ? dir() : file('');
          t.print(LG.psListing(showPath(parent.parts), [{ name: leaf, dir: isDir, len: 0 }]).join('\n'));
          if (cmd === 'touch') t.line('Real PowerShell has no "touch" (that is a Linux/Git Bash command). The PowerShell way is: ni ' + leaf, 'note');
          break;
        }
        case 'cat': {
          if (!plain[0]) { err('Please give a file name, for example: cat notes.txt'); break; }
          var f = target(plain[0]);
          if (!f) { err("Cannot find path '" + showPath(parsePath(cwd, plain[0])) + "' because it does not exist."); break; }
          if (f.node.d) { err("Unable to get content because it is a directory: '" + showPath(f.parts) + "'. Please use 'Get-ChildItem' instead."); break; }
          if (f.node.b) t.print(f.node.b);
          break;
        }
        case 'rm': {
          if (!plain[0]) { err('Please say what to remove, for example: rm hello.txt'); break; }
          var r = target(plain[0]);
          if (!r) { err("Cannot find path '" + showPath(parsePath(cwd, plain[0])) + "' because it does not exist."); break; }
          if (r.node.d && Object.keys(r.node.k).length && !/-r/i.test(args.join(' '))) {
            t.print('Confirm\nThe item at ' + showPath(r.parts) + ' has children and the Recurse parameter was not specified. If you continue, all children will be removed with the item. Are you sure you want to continue?');
            t.line('Real PowerShell waits for Y or N here. The pretend PC answers No for you. Add -Recurse if you really mean it.', 'note');
            break;
          }
          if (!r.parts.length) { err('Nice try. The pretend PC refuses to delete C:\\.'); break; }
          var par = walk(root, r.parts.slice(0, -1));
          delete par.node.k[r.parts[r.parts.length - 1]];
          if (cwd.join('\\').toLowerCase().indexOf(r.parts.join('\\').toLowerCase()) === 0) cwd = r.parts.slice(0, -1);
          t.line('(Removed. The terminal says nothing when things go right, and there is no Recycle Bin here.)', 'note');
          break;
        }
        case 'echo': {
          var text = args.join(' ') || (tk[0] && /^["']/.test(line) ? tk[0] : '');
          if (cmd === 'echo' && /^["']/.test(line)) text = tk.join(' ');
          if (!redirect) { t.print(text); break; }
          var fp = parsePath(cwd, redirect.file), fl = fp.pop(), fd = walk(root, fp);
          if (!fd || !fd.node.d) { err("Could not find a part of the path '" + showPath(fp) + "'."); break; }
          var key = findKey(fd.node, fl);
          if (key && fd.node.k[key].d) { err("Access to the path '" + showPath(fp.concat(fl)) + "' is denied."); break; }
          if (key && redirect.mode === '>>') fd.node.k[key].b += (fd.node.k[key].b ? '\n' : '') + text;
          else fd.node.k[key || fl] = file(text);
          break;
        }
        case 'cls': t.clear(); break;
        case 'whoami': t.line('desktop-7f3k2q\\you'); break;
        case 'exit': t.line('On a real PC this closes the terminal window.', 'note'); break;
        case 'explorer': t.line('On a real PC this opens File Explorer showing ' + (plain[0] === '.' || !plain[0] ? 'the current folder' : plain[0]) + '.', 'note'); break;
        case 'code': t.line('If VS Code is installed, this opens it. "code ." opens the current folder in VS Code.', 'note'); break;
        case 'notepad': t.line('On a real PC this opens Notepad' + (plain[0] ? ' with ' + plain[0] : '') + '. Handy for editing files later.', 'note'); break;
        case 'winget': t.line('winget installs software. You will use it for real in the next stop.', 'note'); break;
        case 'git':
          LG.notRecognized(tk[0], t);
          t.line('That is the exact error a real PC shows before Git is installed (or when the terminal was opened before installing). The next stop fixes it.', 'note');
          ok = false;
          break;
        case 'help':
          t.print('Commands this pretend PC understands:\n  pwd          where am I?\n  ls / dir     list files and folders\n  cd <folder>  go into a folder (cd .. goes up)\n' +
            '  mkdir <name> make a folder\n  ni <name>    make an empty file\n  cat <file>   show what is inside a file\n  rm <name>    delete\n' +
            '  echo "hi" > file.txt   write text into a file\n  cls          clear the screen\nKeys: Tab completes names, Up/Down arrows recall earlier commands.');
          break;
        default:
          LG.notRecognized(tk[0], t);
          ok = false;
      }
      tasks.check({
        cmd: cmd || name, ok: ok, where: showPath(cwd),
        exists: function (p) { return !!walk(root, parsePath([], p.replace(/^C:/i, ''))); }
      });
    }
    start();
  };
})();

/* Widgets, part A: the three-areas demo, the Git installer walkthrough,
   the git config builder, and the line-ending demo. */
(function () {
  'use strict';
  var LG = window.LG, esc = LG.esc;

  /* ---------------- three areas: working folder, staging area, repository ---------------- */
  LG.widgets.areas = function (el) {
    var files, snaps, say, freshKey;
    function reset() {
      files = [{ n: 'recipe.txt', v: 1, st: 0, sv: 0 }, { n: 'shopping.txt', v: 1, st: 0, sv: 0 }];
      snaps = [];
      say = 'Two new files sit in your working folder. Git sees them, but nothing is tracked yet. Try the buttons in any order.';
      freshKey = null;
      draw();
    }
    function state(f) {
      if (!f.sv && !f.st) return f.v ? 'untracked' : '';
      if (f.v !== (f.st || f.sv)) return 'modified';
      if (f.st && f.st !== f.sv) return 'staged';
      return 'unchanged';
    }
    function draw() {
      var w = '', s = '', r = '';
      files.forEach(function (f) {
        var k = 'w' + f.n + f.v + state(f);
        w += '<div class="ad-card' + (k === freshKey ? ' fresh' : '') + '"><span>' + f.n + ' <span class="ad-arrow">v' + f.v + '</span></span><small>' + state(f) + '</small></div>';
        if (f.st && f.st !== f.sv) s += '<div class="ad-card' + ('s' + f.n + f.st === freshKey ? ' fresh' : '') + '"><span>' + f.n + ' <span class="ad-arrow">v' + f.st + '</span></span><small>ready</small></div>';
      });
      snaps.slice().reverse().forEach(function (sn, i) {
        r += '<div class="ad-card snap' + (i === 0 && freshKey === 'c' ? ' fresh' : '') + '"><span>Commit ' + sn.n + '</span><small>' + esc(sn.what) + '</small></div>';
      });
      el.innerHTML = '<div class="ad-track">' +
        '<div class="ad-col"><h4>1. Working folder</h4><p>Your real files. Editing happens here.</p>' + w + '</div>' +
        '<div class="ad-col"><h4>2. Staging area</h4><p>What goes into the next commit.</p>' + (s || '<p><i>Nothing waiting.</i></p>') + '</div>' +
        '<div class="ad-col"><h4>3. Repository</h4><p>Commits, saved for good.</p>' + (r || '<p><i>No commits yet.</i></p>') + '</div></div>' +
        '<div class="ad-ctrl">' + files.map(function (f, i) {
          return '<button type="button" class="btn sm" data-edit="' + i + '">Edit ' + f.n + '</button><button type="button" class="btn sm" data-add="' + i + '">git add ' + f.n + '</button>';
        }).join('') + '<button type="button" class="btn sm primary" data-commit>git commit</button><button type="button" class="btn sm ghost" data-reset>Start over</button></div>' +
        '<p class="ad-say" aria-live="polite">' + say + '</p>';
      LG.$$('[data-edit]', el).forEach(function (b) { b.addEventListener('click', function () { act('edit', +b.getAttribute('data-edit')); }); });
      LG.$$('[data-add]', el).forEach(function (b) { b.addEventListener('click', function () { act('add', +b.getAttribute('data-add')); }); });
      el.querySelector('[data-commit]').addEventListener('click', function () { act('commit'); });
      el.querySelector('[data-reset]').addEventListener('click', reset);
    }
    function act(what, i) {
      var f = files[i];
      if (what === 'edit') {
        f.v++;
        freshKey = 'w' + f.n + f.v + state(f);
        say = 'You changed ' + f.n + ' (now version ' + f.v + '). Only your working folder knows. ' +
          (f.st ? 'Notice the staging area still holds version ' + f.st + ': staging takes a copy at the moment you run git add.' : 'Git calls it "' + state(f) + '".');
      } else if (what === 'add') {
        if (state(f) === 'unchanged' || state(f) === 'staged') { say = 'git add ' + f.n + ' does nothing new: there is no unstaged change in it. Edit it first.'; draw(); return; }
        f.st = f.v;
        freshKey = 's' + f.n + f.st;
        say = 'git add copied version ' + f.v + ' of ' + f.n + ' into the staging area. Think of it as putting it in the box for the next snapshot.';
      } else {
        var ready = files.filter(function (x) { return x.st && x.st !== x.sv; });
        if (!ready.length) { say = 'Nothing is staged, so there is nothing to commit. Real Git would say: "nothing added to commit". Stage something first.'; draw(); return; }
        ready.forEach(function (x) { x.sv = x.st; });
        snaps.push({ n: snaps.length + 1, what: ready.map(function (x) { return x.n + ' v' + x.sv; }).join(', ') });
        freshKey = 'c';
        var left = files.filter(function (x) { return state(x) === 'modified' || state(x) === 'untracked'; });
        say = 'Commit ' + snaps.length + ' saved ' + ready.map(function (x) { return x.n; }).join(' and ') + ' for good.' +
          (left.length ? ' ' + left.map(function (x) { return x.n; }).join(' and ') + ' had changes that were not staged, so they were left out. That is the point of staging: you choose.' : ' The staging area is empty again.');
      }
      draw();
    }
    el.classList.add('ad');
    reset();
  };

  /* ---------------- Git for Windows installer walkthrough ---------------- */
  var SCREENS = [
    { h: 'Information', sub: 'Please read the following important information before continuing.',
      text: 'GNU General Public License, Version 2, June 1991. Copyright (C) 1989, 1991 Free Software Foundation, Inc. Everyone is permitted to copy and distribute verbatim copies of this license document...',
      title: 'The license', pick: 'Click Next', why: 'Git is free, open source software. This screen is its license. Nothing to choose.' },
    { h: 'Select Destination Location', sub: 'Where should Git be installed?', field: 'C:\\Program Files\\Git',
      title: 'Install location', pick: 'Keep C:\\Program Files\\Git', why: 'Keep the default. Moving it gains nothing and can confuse other tools that look for Git there.' },
    { h: 'Select Components', sub: 'Which components should be installed?',
      checks: [['Additional icons', 0], ['On the Desktop', 0], ['Windows Explorer integration', 1], ['Open Git Bash here', 1], ['Open Git GUI here', 1], ['Git LFS (Large File Support)', 1],
        ['Associate .git* configuration files with the default text editor', 1], ['Associate .sh files to be run with Bash', 1], ['Check daily for Git for Windows updates', 0],
        ['(NEW!) Add a Git Bash Profile to Windows Terminal', 0, 1]],
      title: 'Extras', pick: 'Defaults, plus the Windows Terminal profile', why: 'The defaults are fine. Worth ticking: "Add a Git Bash Profile to Windows Terminal", so Git Bash shows up in Windows Terminal\'s tab menu. The exact list shifts a little between versions.' },
    { h: 'Select Start Menu Folder', sub: 'Where should Setup place the program\'s shortcuts?', field: 'Git',
      title: 'Start menu', pick: 'Keep the default', why: 'Where the shortcuts go in the Start menu. Nobody needs to change this.' },
    { h: 'Choosing the default editor used by Git', sub: 'Which editor would you like Git to use?',
      radios: ['Use Vim (the ubiquitous text editor) as Git\'s default editor', 'Use Notepad as Git\'s default editor', 'Use Visual Studio Code as Git\'s default editor', 'Use Notepad++ as Git\'s default editor', 'Use Nano as Git\'s default editor'],
      def: 0, rec: 2, title: 'The editor: this one matters', pick: 'Visual Studio Code, or Notepad',
      why: 'The default is Vim, a powerful editor that traps almost every beginner (you cannot even quit it without knowing to type <code>:q!</code>). Pick Visual Studio Code if you have it installed, otherwise Notepad. You can change this later with one command.' },
    { h: 'Adjusting the name of the initial branch in new repositories', sub: 'What would you like Git to name the initial branch after "git init"?',
      radios: ['Let Git decide', 'Override the default branch name for new repositories'], def: 0, rec: 1, field2: 'main',
      title: 'Name of the first branch', pick: 'Override, and type main', why: 'GitHub and most projects call the main branch <code>main</code>. Plain Git still says <code>master</code>. Choosing main now avoids a mismatch later.' },
    { h: 'Adjusting your PATH environment', sub: 'How would you like to use Git from the command line?',
      radios: ['Use Git from Git Bash only', 'Git from the command line and also from 3rd-party software (Recommended)', 'Use Git and optional Unix tools from the Command Prompt'], def: 1, rec: 1,
      title: 'Where the git command works', pick: 'The recommended middle option', why: 'This is what lets you type <code>git</code> in PowerShell, Command Prompt and VS Code. The third option also replaces some Windows commands (like <code>find</code> and <code>sort</code>) with Unix ones, which surprises people.' },
    { h: 'Choosing the SSH executable', sub: 'Which Secure Shell client program would you like Git to use?',
      radios: ['Use bundled OpenSSH', 'Use external OpenSSH'], def: 0, rec: 0, title: 'SSH program', pick: 'Use bundled OpenSSH', why: 'Keep the default. SSH is an optional way to connect to GitHub; this guide uses HTTPS, which does not need it.' },
    { h: 'Choosing HTTPS transport backend', sub: 'Which SSL/TLS library would you like Git to use for HTTPS connections?',
      radios: ['Use the OpenSSL library', 'Use the native Windows Secure Channel library'], def: 0, rec: 0, title: 'HTTPS library', pick: 'Default is fine at home',
      why: 'Either works on a home PC. On a company network that inspects traffic with its own certificates, "native Windows Secure Channel" usually avoids certificate errors.' },
    { h: 'Configuring the line ending conversions', sub: 'How should Git treat line endings in text files?',
      radios: ['Checkout Windows-style, commit Unix-style line endings', 'Checkout as-is, commit Unix-style line endings', 'Checkout as-is, commit as-is'], def: 0, rec: 0,
      title: 'Line endings', pick: 'The first option (default)', why: 'Windows ends lines differently from Mac and Linux. This setting converts automatically so mixed teams do not see every line as changed. Stop 16 has a demo.' },
    { h: 'Configuring the terminal emulator to use with Git Bash', sub: 'Which terminal emulator do you want to use with your Git Bash?',
      radios: ['Use MinTTY (the default terminal of MSYS2)', 'Use Windows\' default console window'], def: 0, rec: 0, title: 'Git Bash window', pick: 'Keep MinTTY', why: 'Only affects the separate Git Bash window. You will mostly use Windows Terminal anyway.' },
    { h: 'Choose the default behavior of `git pull`', sub: 'What should `git pull` do by default?',
      radios: ['Fast-forward or merge', 'Rebase', 'Only ever fast-forward'], def: 0, rec: 0, title: 'What git pull does', pick: 'Fast-forward or merge', why: 'Matches everything in this guide. Rebase is fine too once you understand it (Stop 15), but it is not a beginner default.' },
    { h: 'Choose a credential helper', sub: 'Which credential helper should be configured?',
      radios: ['Git Credential Manager', 'None'], def: 0, rec: 0, title: 'Signing in to GitHub', pick: 'Git Credential Manager', why: 'This is what turns "log in to GitHub from the terminal" into a single browser click, and stores the login safely in Windows. Keep it.' },
    { h: 'Configuring extra options', sub: 'Which features would you like to enable?',
      checks: [['Enable file system caching', 1], ['Enable symbolic links', 0]], title: 'Extras', pick: 'Defaults', why: 'Caching makes Git faster on Windows. Symbolic links are a niche feature.' },
    { h: 'Configuring experimental options', sub: 'These features are developed actively. Would you like to try them?',
      checks: [['Enable experimental support for pseudo consoles.', 0], ['Enable experimental built-in file system monitor', 0]], title: 'Experimental', pick: 'Leave everything unticked', why: 'Experimental means "may break". Recent versions sometimes skip this screen entirely.' },
    { h: 'Completing the Git Setup Wizard', sub: 'Setup has finished installing Git on your computer.',
      checks: [['Launch Git Bash', 0], ['View Release Notes', 0]], last: 1, title: 'Done', pick: 'Untick both, click Finish',
      why: 'Then the important part: <b>close every open terminal window and open a new one.</b> Terminals only learn about newly installed programs when they start. Test with <code>git --version</code>.' }
  ];
  LG.widgets.installer = function (el) {
    var i = 0;
    el.classList.add('inst');
    function draw() {
      var s = SCREENS[i], body = '';
      if (s.text) body += '<p style="font-size:.8rem;color:#444;border:1px solid #ccc;background:#fff;padding:8px;height:150px;overflow:auto">' + esc(s.text) + '</p>';
      if (s.field) body += '<input class="inst-field" style="margin-left:0;width:100%" value="' + esc(s.field) + '" readonly aria-label="Folder">';
      if (s.radios) s.radios.forEach(function (t, k) {
        body += '<label class="inst-opt' + (k === s.rec ? ' rec' : '') + '"><input type="radio" name="inst' + i + '"' + (k === s.def ? ' checked' : '') + '><span>' + esc(t) +
          (k === s.rec ? '<small>Pick this one</small>' : k === s.def ? '<small>the installer\'s default</small>' : '') + '</span></label>';
        if (s.field2 && k === 1) body += '<input class="inst-field" value="' + esc(s.field2) + '" aria-label="Branch name">';
      });
      if (s.checks) s.checks.forEach(function (c) {
        body += '<label class="inst-opt' + (c[2] ? ' rec' : '') + '"' + (/^(On the|Open Git)/.test(c[0]) ? ' style="margin-left:22px"' : '') + '><input type="checkbox"' + (c[1] ? ' checked' : '') + '><span>' + esc(c[0]) +
          (c[2] ? '<small>Worth ticking</small>' : '') + '</span></label>';
      });
      el.innerHTML = '<div class="inst-win" role="group" aria-label="Mock-up of the Git for Windows installer"><div class="inst-bar"><b>Git Setup</b><i aria-hidden="true">_ &#9633; &#215;</i></div>' +
        '<div class="inst-head"><div><h4>' + esc(s.h) + '</h4><p>' + esc(s.sub) + '</p></div>' +
        '<svg class="inst-logo" viewBox="0 0 40 40" aria-hidden="true"><rect x="8" y="8" width="24" height="24" rx="4" transform="rotate(45 20 20)" style="fill:var(--red)"/><circle cx="20" cy="14" r="3" fill="#fff"/><circle cx="20" cy="26" r="3" fill="#fff"/><path d="M20 14v12" stroke="#fff" stroke-width="2.5"/></svg></div>' +
        '<div class="inst-body">' + body + '</div><div class="inst-foot"><span>Screen ' + (i + 1) + ' of ' + SCREENS.length + '</span>' +
        '<button type="button" data-go="-1"' + (i ? '' : ' disabled') + '>&lt; Back</button><button type="button" class="def" data-go="1">' + (s.last ? 'Finish' : 'Next &gt;') + '</button>' +
        '<button type="button" disabled>Cancel</button></div></div>' +
        '<div class="inst-why" aria-live="polite"><span class="pick">' + esc(s.pick) + '</span><h4>' + esc(s.title) + '</h4><p>' + s.why + '</p>' +
        '<div class="inst-dots">' + SCREENS.map(function (x, k) { return '<button type="button" data-to="' + k + '" class="' + (k === i ? 'on' : '') + '" aria-label="Screen ' + (k + 1) + ': ' + esc(x.title) + '"></button>'; }).join('') + '</div></div>';
      LG.$$('[data-go]', el).forEach(function (b) {
        b.addEventListener('click', function () { i = Math.max(0, Math.min(SCREENS.length - 1, i + +b.getAttribute('data-go'))); draw(); });
      });
      LG.$$('[data-to]', el).forEach(function (b) { b.addEventListener('click', function () { i = +b.getAttribute('data-to'); draw(); }); });
    }
    draw();
  };

  /* ---------------- git config builder ---------------- */
  function psQuote(v) { return /[$`"]/.test(v) ? "'" + v.replace(/'/g, "''") + "'" : '"' + v + '"'; }
  LG.widgets.config = function (el) {
    el.classList.add('cfg');
    el.innerHTML = '<div class="cfg-form">' +
      '<label>Your name<input data-k="name" value="" placeholder="Ada Lovelace" autocomplete="name"><small>Shown on every commit. Real name or nickname, your call.</small></label>' +
      '<label>Your email<input data-k="email" value="" placeholder="ada@example.com" autocomplete="email"><small>Use the email of your GitHub account (Stop 11 shows a private alternative).</small></label>' +
      '<label>Editor for messages<select data-k="editor"><option value="code">Visual Studio Code</option><option value="notepad">Notepad</option><option value="npp">Notepad++</option><option value="vim">Vim (only if you know it)</option></select><small>Opens when Git needs a longer message from you.</small></label>' +
      '<label>First branch name<input data-k="branch" value="main"><small>main is the modern standard.</small></label></div>' +
      '<div class="cfg-out"></div>';
    var out = el.querySelector('.cfg-out');
    function val(k) { return el.querySelector('[data-k="' + k + '"]').value.trim(); }
    function draw() {
      var ed = { code: '"code --wait"', notepad: 'notepad', npp: "\"'C:/Program Files/Notepad++/notepad++.exe' -multiInst -notabbar -nosession -noPlugin\"", vim: 'vim' }[val('editor')];
      var lines = [
        '# Paste these into PowerShell one at a time, or all at once. Nothing prints when they work.',
        'git config --global user.name ' + psQuote(val('name') || 'Ada Lovelace'),
        'git config --global user.email ' + psQuote(val('email') || 'ada@example.com'),
        'git config --global init.defaultBranch ' + (val('branch').replace(/\s+/g, '-') || 'main'),
        'git config --global core.editor ' + ed,
        'git config --global pull.rebase false',
        '# Check the result:',
        'git config --global --list'
      ];
      out.innerHTML = '<pre class="sh"></pre>';
      out.firstChild.textContent = lines.join('\n');
      LG.initCode(out);
    }
    LG.$$('[data-k]', el).forEach(function (i) { i.addEventListener('input', draw); i.addEventListener('change', draw); });
    draw();
  };

  /* ---------------- line endings demo ---------------- */
  LG.widgets.eol = function (el) {
    var mode = 'true';
    el.classList.add('eol');
    function show(kind) {
      var mark = kind === 'crlf' ? '<i class="cr">CR</i><i class="lf">LF</i>' : '<i class="lf">LF</i>';
      return '<pre>Hello' + mark + '\nWorld' + mark + '</pre>';
    }
    function draw() {
      var stored = mode === 'false' ? 'crlf' : 'lf', checkout = mode === 'true' ? 'crlf' : stored;
      var verdict = {
        'true': 'Recommended on Windows (the installer\'s default). Your editors get CRLF, the repository stores LF, Mac and Linux teammates get LF. Everyone is happy.',
        input: 'The repository stays clean (LF), but files you check out stay LF on your PC. Modern editors cope fine; old Notepad (before 2018) showed everything on one line.',
        'false': 'Git changes nothing. Your CRLF goes into the repository as-is, and a Mac teammate who saves the file with LF makes Git think every single line changed.'
      }[mode];
      el.innerHTML = '<div class="seg" role="radiogroup" aria-label="core.autocrlf setting" style="max-width:520px">' + ['true', 'input', 'false'].map(function (m) {
        return '<button type="button" role="radio" aria-checked="' + (m === mode) + '" data-m="' + m + '">core.autocrlf ' + m + '</button>';
      }).join('') + '</div><div class="eol-cols">' +
        '<div class="eol-box"><h4>1. You save a file in Notepad</h4>' + show('crlf') + '</div>' +
        '<div class="eol-box"><h4>2. What the repository stores</h4>' + show(stored) + '</div>' +
        '<div class="eol-box"><h4>3. What a fresh clone on your PC gets</h4>' + show(checkout) + '</div>' +
        '<div class="eol-box"><h4>4. What a Mac teammate gets</h4>' + show(stored) + '</div></div><p style="margin:12px 0 0">' + verdict + '</p>';
      LG.$$('[data-m]', el).forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-m'); draw(); }); });
    }
    draw();
  };
})();

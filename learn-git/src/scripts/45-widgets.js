/* Small interactive widgets. Each registers with LG.widget(name, init) and is mounted when its chapter opens. */
(function (LG) {
  'use strict';
  const esc = LG.esc;

  function termBlock(lines, label) {
    const pre = document.createElement('pre');
    pre.className = 'term';
    if (label) pre.dataset.label = label;
    pre.textContent = lines.join('\n');
    return LG.enhanceTerm ? LG.enhanceTerm(pre) : pre;
  }
  LG.termBlock = termBlock;

  // ------------------------------------------------------------------
  // anatomy: hover or tap parts of a command (content lives in the HTML)
  // ------------------------------------------------------------------
  LG.widget('anatomy', (host) => {
    const desc = host.querySelector('.anatomy-desc');
    const parts = LG.$$('.part', host);
    const show = (p) => {
      parts.forEach((x) => x.classList.toggle('is-active', x === p));
      desc.innerHTML = `<b>${esc(p.dataset.name || p.textContent)}</b> ${p.dataset.desc}`;
    };
    parts.forEach((p) => {
      p.tabIndex = 0;
      p.setAttribute('role', 'button');
      p.addEventListener('mouseenter', () => show(p));
      p.addEventListener('focus', () => show(p));
      p.addEventListener('click', () => show(p));
    });
  });

  // ------------------------------------------------------------------
  // chaos: the "final_FINAL_v2.docx" folder next to a git history
  // ------------------------------------------------------------------
  LG.widget('chaos', (host) => {
    const names = ['essay.docx', 'essay_v2.docx', 'essay_final.docx', 'essay_final_2.docx', 'essay_FINAL_fixed.docx', 'essay_final_REALLY_final.docx', 'essay_final_REALLY_final (1).docx', 'essay_USE_THIS_ONE.docx', 'essay_final_teacher_comments.docx', 'essay_final_final_final_ok.docx', 'essay_ACTUAL_final_v3_june.docx'];
    const msgs = ['Write the first draft', 'Add a conclusion', 'Fix spelling mistakes', 'Rewrite the intro', 'Apply the teacher\'s feedback', 'Shorten paragraph 3', 'Add sources', 'Final polish', 'Fix one last typo', 'Swap paragraphs 2 and 4', 'Add a title page'];
    const days = ['Mon 09:14', 'Mon 16:40', 'Tue 11:02', 'Wed 19:25', 'Thu 08:51', 'Thu 21:10', 'Fri 10:33', 'Fri 23:58', 'Sat 12:15', 'Sun 17:44', 'Sun 23:01'];
    let n = 3;
    host.classList.add('chaos');
    host.innerHTML =
      '<div class="chaos-grid">' +
      '<section class="chaos-side chaos-bad"><h4>Without git</h4><p class="chaos-sub">Every save is a new copy with a hopeful name.</p><ul class="chaos-folder"></ul></section>' +
      '<section class="chaos-side chaos-good"><h4>With git</h4><p class="chaos-sub">One file. Every version is a labeled station in its history.</p><div class="chaos-file">essay.docx</div><ol class="chaos-line"></ol></section>' +
      '</div><div class="chaos-foot"><button type="button" class="btn primary" data-act="save">Save a new version</button><button type="button" class="btn ghost" data-act="reset">Reset</button><p class="chaos-q"></p></div>';
    const folder = host.querySelector('.chaos-folder');
    const line = host.querySelector('.chaos-line');
    const q = host.querySelector('.chaos-q');
    const render = () => {
      folder.innerHTML = names.slice(0, n).map((f, i) => `<li style="--r:${((i * 37) % 7) - 3}deg"><span class="doc-ico"></span>${esc(f)}</li>`).join('');
      line.innerHTML = msgs.slice(0, n).map((m, i) => `<li${i === n - 1 ? ' class="is-head"' : ''}><span class="st"></span><span class="m">${esc(m)}</span><span class="d">${days[i]} &middot; ${LG.fakeSha(m).slice(0, 7)}</span></li>`).reverse().join('');
      q.innerHTML = n >= 5
        ? 'Quick: which version has the teacher\'s feedback? On the left you would open files one by one and hope. On the right, the history tells you, and git can bring back any of them.'
        : 'Keep clicking. Watch which side stays readable.';
      host.querySelector('[data-act="save"]').disabled = n >= names.length;
    };
    host.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'save' && n < names.length) n++;
      if (a.dataset.act === 'reset') n = 3;
      render();
    });
    render();
  });

  // ------------------------------------------------------------------
  // snapshots: slide through the history of one file
  // ------------------------------------------------------------------
  LG.widget('snapshots', (host) => {
    const snaps = [
      { m: 'Write the basic recipe', a: 'You', t: '5 days ago', f: 'Pancakes\n2 cups flour\n2 eggs\n1 cup milk\n' },
      { m: 'Add a pinch of salt', a: 'You', t: '4 days ago', f: 'Pancakes\n2 cups flour\n2 eggs\n1 cup milk\n1 pinch of salt\n' },
      { m: 'Double everything for guests', a: 'Sam', t: '3 days ago', f: 'Pancakes\n4 cups flour\n4 eggs\n2 cups milk\n2 pinches of salt\n' },
      { m: 'Add the cooking steps', a: 'You', t: 'yesterday', f: 'Pancakes\n4 cups flour\n4 eggs\n2 cups milk\n2 pinches of salt\n\nSteps:\n1. Whisk everything together\n2. Fry in a hot buttered pan\n' },
      { m: 'Back to normal amounts', a: 'You', t: '2 hours ago', f: 'Pancakes\n2 cups flour\n2 eggs\n1 cup milk\n1 pinch of salt\n\nSteps:\n1. Whisk everything together\n2. Fry in a hot buttered pan\n' }
    ];
    let cur = snaps.length - 1;
    host.classList.add('snap');
    host.innerHTML =
      '<div class="snap-rail" role="tablist"></div>' +
      `<input class="snap-range" type="range" min="0" max="${snaps.length - 1}" value="${cur}" aria-label="Pick a snapshot">` +
      '<div class="snap-body"><div class="snap-meta"></div><div class="file-block"><div class="file-name">pancakes.txt</div><pre class="file snap-file"></pre></div></div>';
    const rail = host.querySelector('.snap-rail');
    const range = host.querySelector('.snap-range');
    const meta = host.querySelector('.snap-meta');
    const file = host.querySelector('.snap-file');
    rail.innerHTML = snaps.map((s, i) => `<button type="button" class="snap-stop" data-i="${i}" role="tab"><span class="snap-dot"></span><span class="snap-label">${esc(s.m)}</span></button>`).join('');
    const render = () => {
      const s = snaps[cur];
      range.value = cur;
      rail.querySelectorAll('.snap-stop').forEach((b, i) => { b.classList.toggle('is-on', i === cur); b.classList.toggle('is-past', i < cur); b.setAttribute('aria-selected', String(i === cur)); });
      meta.innerHTML = `<span class="snap-hash">${LG.fakeSha(s.m).slice(0, 7)}</span><strong>${esc(s.m)}</strong><span>by ${s.a}, ${s.t}</span>` +
        (cur === snaps.length - 1 ? '<span class="snap-head">HEAD (latest)</span>' : `<span class="snap-old">snapshot ${cur + 1} of ${snaps.length}</span>`);
      const prev = cur ? snaps[cur - 1].f : '';
      file.innerHTML = LG.diffLines(prev, s.f).map((op) =>
        op.t === '+' ? `<span class="ln-add">+ ${esc(op.s) || ' '}</span>` : op.t === '-' ? `<span class="ln-del">- ${esc(op.s)}</span>` : `<span class="ln-dim">  ${esc(op.s)}</span>`
      ).join('\n');
    };
    range.addEventListener('input', () => { cur = +range.value; render(); });
    rail.addEventListener('click', (e) => { const b = e.target.closest('.snap-stop'); if (b) { cur = +b.dataset.i; render(); } });
    render();
  });

  // ------------------------------------------------------------------
  // config: fill in a form, get your setup commands
  // ------------------------------------------------------------------
  LG.widget('config', (host) => {
    const editors = {
      'VS Code': 'code --wait',
      'Notepad (Windows)': 'notepad',
      'Notepad++ (Windows)': "'C:/Program Files/Notepad++/notepad++.exe' -multiInst -notabbar -nosession -noPlugin",
      'Sublime Text': 'subl -n -w',
      'nano (simple, in the terminal)': 'nano',
      'Vim (only if you know it)': 'vim'
    };
    const os = /Win/i.test(navigator.platform || navigator.userAgent) ? 'win' : /Mac/i.test(navigator.platform || '') ? 'mac' : 'linux';
    host.classList.add('cfg');
    host.innerHTML =
      '<div class="cfg-fields">' +
      '<label>Your name<input type="text" name="name" placeholder="Ada Lovelace" autocomplete="name"></label>' +
      '<label>Email (the one on your GitHub account)<input type="email" name="email" placeholder="ada@example.com" autocomplete="email"></label>' +
      `<label>Editor for commit messages<select name="editor">${Object.keys(editors).map((k) => `<option>${esc(k)}</option>`).join('')}</select></label>` +
      `<label>Your computer<select name="os"><option value="win"${os === 'win' ? ' selected' : ''}>Windows</option><option value="mac"${os === 'mac' ? ' selected' : ''}>macOS</option><option value="linux"${os === 'linux' ? ' selected' : ''}>Linux</option></select></label>` +
      '</div><div class="cfg-out"></div><p class="cfg-note small muted">Paste these into your terminal one at a time (or all at once). They only need to run once per computer.</p>';
    const out = host.querySelector('.cfg-out');
    const q = (s) => String(s).replace(/(["\\$`])/g, '\\$1');
    const render = () => {
      const v = (n) => host.querySelector(`[name="${n}"]`).value.trim();
      const lines = [
        `git config --global user.name "${q(v('name') || 'Your Name')}"`,
        `git config --global user.email "${q(v('email') || 'you@example.com')}"`,
        'git config --global init.defaultBranch main',
        'git config --global pull.rebase false',
        `git config --global core.editor "${editors[v('editor')].replace(/"/g, '\\"')}"`,
        `git config --global core.autocrlf ${v('os') === 'win' ? 'true' : 'input'}`
      ];
      out.innerHTML = '';
      out.append(termBlock(lines.map((l) => '$ ' + l), 'Your setup commands'));
    };
    host.addEventListener('input', render);
    host.addEventListener('change', render);
    render();
  });

  // ------------------------------------------------------------------
  // areas: click your way through working directory -> staging -> repository
  // ------------------------------------------------------------------
  LG.widget('areas', (host) => {
    let w, log, newCount, editCount;
    host.classList.add('aw');
    host.innerHTML =
      '<div class="aw-cols">' +
      '<section class="aw-col aw-wd"><header><h5>1. Working directory</h5><small>the files in your folder</small></header><ul class="aw-list" data-zone="wd"></ul><button type="button" class="btn small ghost aw-new" data-act="new">+ New file</button></section>' +
      '<section class="aw-col aw-st"><header><h5>2. Staging area</h5><small>what the next commit will contain</small></header><ul class="aw-list" data-zone="st"></ul>' +
      '<form class="aw-commit"><input type="text" aria-label="Commit message" placeholder="Describe the change"><button type="submit" class="btn small primary">Commit</button></form></section>' +
      '<section class="aw-col aw-repo"><header><h5>3. Repository</h5><small>saved snapshots (commits)</small></header><ol class="aw-commits"></ol></section>' +
      '</div>' +
      '<div class="aw-log"><div class="aw-log-head"><span>The git commands your clicks just ran</span><button type="button" class="aw-reset" data-act="reset">Start over</button></div><div class="aw-log-body" aria-live="polite"></div></div>';
    const wdList = host.querySelector('[data-zone="wd"]');
    const stList = host.querySelector('[data-zone="st"]');
    const commits = host.querySelector('.aw-commits');
    const logBox = host.querySelector('.aw-log-body');
    const form = host.querySelector('.aw-commit');
    const msg = form.querySelector('input');

    function start() {
      w = new LG.World();
      w.sh('mkdir website', 'cd website', 'git init');
      w.put('index.html', '<h1>Welcome</h1>\n');
      w.put('style.css', 'h1 { color: black; }\n');
      w.sh('git add .', 'git commit -m "Create the website"');
      log = [];
      newCount = 0;
      editCount = 0;
      logBox.innerHTML = '<div class="tl c-dim">Click Edit on a file to change it, then Stage it, then Commit.</div>';
      render();
    }
    function run(cmd) {
      const r = w.exec(cmd);
      const html = `<div class="tl tl-cmd"><span class="ps-dollar">$</span> ${esc(cmd)}</div>` + r.lines.map((l) => `<div class="tl">${LG.lineHTML(l)}</div>`).join('');
      if (!log.length) logBox.innerHTML = '';
      log.push(cmd);
      logBox.insertAdjacentHTML('beforeend', html);
      logBox.scrollTop = logBox.scrollHeight;
      render();
    }
    function render() {
      const repo = w.findRepo();
      const s = repo.status();
      const wd = repo.wd();
      const unst = new Map(s.unstaged.map((x) => [x.p, x.k]));
      const rows = [];
      for (const p of [...wd.keys()].sort()) {
        const state = s.untracked.includes(p) ? ['u', 'new, untracked'] : unst.get(p) === 'modified' ? ['m', 'modified'] : ['clean', 'unchanged'];
        const btns = [`<button type="button" data-act="edit" data-f="${esc(p)}">Edit</button>`];
        if (state[0] !== 'clean') btns.push(`<button type="button" class="go" data-act="add" data-f="${esc(p)}">Stage</button>`);
        if (state[0] === 'm') btns.push(`<button type="button" class="warn" data-act="discard" data-f="${esc(p)}">Discard</button>`);
        rows.push(`<li class="aw-file st-${state[0]}"><span class="aw-name">${esc(p)}</span><span class="aw-state">${state[1]}</span><span class="aw-btns">${btns.join('')}</span></li>`);
      }
      wdList.innerHTML = rows.join('');
      stList.innerHTML = s.staged.length
        ? s.staged.map((x) => `<li class="aw-file st-${x.k === 'new file' ? 'a' : 'm'}"><span class="aw-name">${esc(x.p)}</span><span class="aw-state">${x.k === 'new file' ? 'new file' : 'changed'}</span><span class="aw-btns"><button type="button" data-act="unstage" data-f="${esc(x.p)}">Unstage</button></span></li>`).join('')
        : '<li class="aw-empty">Empty. Stage a change to put it here.</li>';
      form.querySelector('button').disabled = !s.staged.length;
      if (!msg.value && s.staged.length) msg.value = s.staged.length === 1 ? `Update ${s.staged[0].p}` : 'Update the website';
      const list = [...repo.ancestors(repo.headHash())].map((h) => repo.commits.get(h)).sort((a, b) => b.seq - a.seq);
      commits.innerHTML = list.map((c, i) => `<li${i === 0 ? ' class="is-head"' : ''}><span class="st"></span><span class="m">${esc(c.message)}</span><span class="h">${LG.short(c.hash)}${i === 0 ? ' &middot; HEAD' : ''}</span></li>`).join('');
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const f = b.dataset.f;
      const act = b.dataset.act;
      if (act === 'edit') {
        editCount++;
        const prev = w.read(f) || '';
        const line = f.endsWith('.css') ? `p { margin: ${editCount}px; }` : f.endsWith('.html') ? `<p>Edit number ${editCount}</p>` : `edit ${editCount}`;
        w.put(f, prev + line + '\n');
        logBox.insertAdjacentHTML('beforeend', `<div class="tl c-dim"># you edited ${esc(f)} in your editor (no git command involved)</div>`);
        logBox.scrollTop = logBox.scrollHeight;
        render();
      }
      if (act === 'add') run(`git add ${f}`);
      if (act === 'unstage') run(`git restore --staged ${f}`);
      if (act === 'discard') run(`git restore ${f}`);
      if (act === 'new') { newCount++; w.put(`page${newCount}.html`, `<h1>Page ${newCount}</h1>\n`); logBox.insertAdjacentHTML('beforeend', `<div class="tl c-dim"># you created page${newCount}.html</div>`); render(); }
      if (act === 'reset') start();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const m = msg.value.trim() || 'Update the website';
      msg.value = '';
      run(`git commit -m "${m.replace(/"/g, "'")}"`);
    });
    start();
  });

  // ------------------------------------------------------------------
  // gitignore: type patterns and paths, see what gets ignored and why
  // ------------------------------------------------------------------
  LG.widget('gitignore', (host) => {
    host.classList.add('gi');
    host.innerHTML =
      '<div class="gi-grid">' +
      '<label class="gi-col"><span>.gitignore</span><textarea class="gi-patterns" rows="12" spellcheck="false"></textarea></label>' +
      '<label class="gi-col"><span>Files in your project</span><textarea class="gi-paths" rows="12" spellcheck="false"></textarea></label>' +
      '<div class="gi-col"><span>Result</span><ul class="gi-results" aria-live="polite"></ul></div></div>';
    const pat = host.querySelector('.gi-patterns');
    const paths = host.querySelector('.gi-paths');
    const out = host.querySelector('.gi-results');
    pat.value = '# secrets\n.env\n\n# dependencies\nnode_modules/\n\n# log files anywhere\n*.log\n\n# only the build folder at the top\n/build\n\n# ...but keep this one log\n!important.log';
    paths.value = '.env\nconfig/.env\nsrc/app.js\nnode_modules/react/index.js\ndebug.log\nlogs/today.log\nimportant.log\nbuild/app.min.js\nsrc/build/helper.js\nREADME.md';
    const render = () => {
      const rules = LG.ignore.compile(pat.value);
      out.innerHTML = paths.value.split('\n').map((s) => s.trim()).filter(Boolean).map((p) => {
        const r = LG.ignore.test(rules, p);
        let why = 'no rule matches, so git tracks it';
        if (r.ignored && r.via) why = `inside the ignored folder ${esc(r.via)} (line ${r.rule.line}: <code>${esc(r.rule.raw)}</code>)`;
        else if (r.ignored) why = `line ${r.rule.line}: <code>${esc(r.rule.raw)}</code>`;
        else if (r.rule && r.rule.negate) why = `re-included by line ${r.rule.line}: <code>${esc(r.rule.raw)}</code>`;
        return `<li class="gi-row ${r.ignored ? 'is-ign' : 'is-keep'}"><span class="gi-badge">${r.ignored ? 'ignored' : 'tracked'}</span><code class="gi-path">${esc(p)}</code><span class="gi-why">${why}</span></li>`;
      }).join('');
    };
    pat.addEventListener('input', render);
    paths.addEventListener('input', render);
    render();
  });

  // ------------------------------------------------------------------
  // conflict: resolve conflicts the way VS Code shows them
  // ------------------------------------------------------------------
  LG.widget('conflict', (host) => {
    const files = {
      'salsa.txt': [
        { t: ['Salsa', '- 4 ripe tomatoes', '- 1 onion'] },
        { ours: ['- half a jalapeno (mild)'], theirs: ['- 3 jalapenos (hot!)'], ol: 'HEAD', tl: 'spicy' },
        { t: ['- juice of 1 lime'] }
      ],
      'README.md': [
        { t: ['# Recipe book', ''] },
        { ours: ['Family recipes, tested every Sunday.'], theirs: ['Our favorite recipes, shared with friends.'], ol: 'HEAD', tl: 'new-intro' },
        { t: ['', '## Contributors'] },
        { ours: ['- You'], theirs: ['- You', '- Sam'], ol: 'HEAD', tl: 'new-intro' }
      ]
    };
    let name, blocks;
    host.classList.add('cf');
    host.innerHTML =
      `<div class="cf-tabs" role="tablist">${Object.keys(files).map((f) => `<button type="button" class="cf-tab" data-file="${f}">${f}</button>`).join('')}</div>` +
      '<div class="cf-status"></div><div class="cf-file"></div>' +
      '<details class="cf-raw"><summary>What the raw file looks like right now</summary><pre class="file cf-rawtext"></pre></details>' +
      '<div class="cf-next"></div>';
    const body = host.querySelector('.cf-file');
    const status = host.querySelector('.cf-status');
    const raw = host.querySelector('.cf-rawtext');
    const next = host.querySelector('.cf-next');
    const MARK = /^(<{7}|={7}$|>{7})/;

    function load(f) {
      name = f;
      blocks = files[f].map((b) => ({ ...b, done: null, editing: false }));
      host.querySelectorAll('.cf-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.file === f)));
      render();
    }
    function rawLines() {
      const out = [];
      for (const b of blocks) {
        if (b.t) out.push(...b.t);
        else if (b.done) out.push(...b.done);
        else out.push(`<<<<<<< ${b.ol}`, ...b.ours, '=======', ...b.theirs, `>>>>>>> ${b.tl}`);
      }
      return out;
    }
    function render() {
      const left = blocks.filter((b) => !b.t && !b.done).length;
      status.innerHTML = left
        ? `<span class="cf-count bad">${LG.plural(left, 'conflict')} left</span> in <code>${esc(name)}</code>. Choose a version for each highlighted block.`
        : `<span class="cf-count ok">All conflicts resolved</span> in <code>${esc(name)}</code>.`;
      body.innerHTML = blocks.map((b, i) => {
        if (b.t) return b.t.map((l) => `<div class="cf-line">${esc(l) || '&nbsp;'}</div>`).join('');
        if (b.done) return `<div class="cf-resolved">${b.done.map((l) => `<div class="cf-line">${esc(l) || '&nbsp;'}</div>`).join('')}<button type="button" class="cf-undo" data-i="${i}" data-act="undo">undo</button></div>`;
        if (b.editing) {
          return `<div class="cf-block is-editing"><textarea class="cf-edit" data-i="${i}" rows="${b.ours.length + b.theirs.length + 3}" spellcheck="false">${esc([`<<<<<<< ${b.ol}`, ...b.ours, '=======', ...b.theirs, `>>>>>>> ${b.tl}`].join('\n'))}</textarea>` +
            `<div class="cf-edit-bar"><span class="cf-edit-msg">Edit into the final text and delete the three marker lines.</span><button type="button" class="btn small primary" data-act="finish" data-i="${i}">Done</button></div></div>`;
        }
        return '<div class="cf-block">' +
          `<div class="cf-actions"><button type="button" data-act="ours" data-i="${i}">Accept current change</button><button type="button" data-act="theirs" data-i="${i}">Accept incoming change</button><button type="button" data-act="both" data-i="${i}">Accept both</button><button type="button" data-act="edit" data-i="${i}">Edit by hand</button></div>` +
          `<div class="cf-line cf-mark">&lt;&lt;&lt;&lt;&lt;&lt;&lt; ${esc(b.ol)} <em>(current change: your branch)</em></div>` +
          b.ours.map((l) => `<div class="cf-line cf-ours">${esc(l) || '&nbsp;'}</div>`).join('') +
          '<div class="cf-line cf-mark">=======</div>' +
          b.theirs.map((l) => `<div class="cf-line cf-theirs">${esc(l) || '&nbsp;'}</div>`).join('') +
          `<div class="cf-line cf-mark">&gt;&gt;&gt;&gt;&gt;&gt;&gt; ${esc(b.tl)} <em>(incoming change: the branch you are merging in)</em></div></div>`;
      }).join('');
      raw.textContent = rawLines().join('\n');
      next.innerHTML = '';
      if (!left) {
        next.append(LG.el('p', {}, 'The file is clean. Now tell git it is resolved and finish the merge:'));
        next.append(termBlock([`$ git add ${name}`, '$ git commit'], 'Finish the merge'));
      }
    }
    host.addEventListener('click', (e) => {
      const tab = e.target.closest('.cf-tab');
      if (tab) { load(tab.dataset.file); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const blk = blocks[+b.dataset.i];
      const act = b.dataset.act;
      if (act === 'ours') blk.done = blk.ours.slice();
      if (act === 'theirs') blk.done = blk.theirs.slice();
      if (act === 'both') blk.done = [...blk.ours, ...blk.theirs.filter((l) => !blk.ours.includes(l))];
      if (act === 'edit') blk.editing = true;
      if (act === 'undo') blk.done = null;
      if (act === 'finish') {
        const ta = body.querySelector(`.cf-edit[data-i="${b.dataset.i}"]`);
        const lines = ta.value.split('\n');
        if (lines.some((l) => MARK.test(l))) {
          b.closest('.cf-block').querySelector('.cf-edit-msg').innerHTML = '<b>Markers still there.</b> Delete every &lt;&lt;&lt;&lt;&lt;&lt;&lt;, ======= and &gt;&gt;&gt;&gt;&gt;&gt;&gt; line.';
          return;
        }
        blk.done = lines;
        blk.editing = false;
      }
      render();
    });
    load(Object.keys(files)[0]);
  });

  // ------------------------------------------------------------------
  // rescue: "oh no, I messed up" helper
  // ------------------------------------------------------------------
  LG.widget('rescue', (host) => {
    const all = [];
    host.classList.add('rescue');
    host.innerHTML = '<div class="rescue-list"></div><div class="rescue-detail" aria-live="polite"></div>';
    const list = host.querySelector('.rescue-list');
    const detail = host.querySelector('.rescue-detail');
    list.innerHTML = LG.rescue.map((g) => `<div class="rescue-group"><h5>${esc(g.group)}</h5>` +
      g.items.map((it) => { all.push(it); return `<button type="button" class="rescue-item d-${it.danger}" data-i="${all.length - 1}">${esc(it.title)}</button>`; }).join('') + '</div>').join('');
    const badge = { safe: 'Safe: nothing is lost', rewrites: 'Rewrites history: fine for commits nobody else has', destroys: 'Can lose work for good: read before running' };
    const show = (i) => {
      const it = all[i];
      list.querySelectorAll('.rescue-item').forEach((b) => b.classList.toggle('is-on', +b.dataset.i === i));
      detail.innerHTML = `<h4>${esc(it.title)}</h4><span class="danger-badge d-${it.danger}">${badge[it.danger]}</span>`;
      detail.append(termBlock(it.cmds.map((c) => (c.startsWith('#') ? c : '$ ' + c)), 'Run this'));
      detail.insertAdjacentHTML('beforeend', `<p>${it.text}</p>${it.tip ? `<p class="rescue-tip">${it.tip}</p>` : ''}`);
    };
    list.addEventListener('click', (e) => {
      const b = e.target.closest('.rescue-item');
      if (!b) return;
      show(+b.dataset.i);
      if (window.matchMedia('(max-width: 760px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    show(0);
  });

  // ------------------------------------------------------------------
  // cheatsheet: searchable command list
  // ------------------------------------------------------------------
  LG.widget('cheatsheet', (host) => {
    const cats = [...new Set(LG.cheats.map((c) => c[0]))];
    let cat = 'All';
    host.classList.add('cs');
    host.innerHTML =
      '<div class="cs-tools"><input type="search" class="cs-search" placeholder="Search, for example: undo, branch, push" aria-label="Search commands">' +
      `<div class="cs-cats">${['All', ...cats].map((c) => `<button type="button" class="cs-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` +
      '<p class="cs-count small muted"></p><div class="cs-list"></div>';
    const search = host.querySelector('.cs-search');
    const listBox = host.querySelector('.cs-list');
    const countBox = host.querySelector('.cs-count');
    const fmt = (cmd) => esc(cmd).replace(/&lt;([a-z-]+)&gt;/g, '<span class="ph">&lt;$1&gt;</span>');
    const render = () => {
      const q = search.value.trim().toLowerCase();
      host.querySelectorAll('.cs-cat').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
      const rows = LG.cheats.filter((c) => (cat === 'All' || c[0] === cat) && (!q || (c[1] + ' ' + c[2]).toLowerCase().includes(q)));
      countBox.textContent = `${LG.plural(rows.length, 'command')}. Click a command to copy it.`;
      const groups = [...new Set(rows.map((r) => r[0]))];
      listBox.innerHTML = groups.map((g) => `<section class="cs-group"><h3>${esc(g)}</h3>` +
        rows.filter((r) => r[0] === g).map((r) => `<div class="cs-row"><button type="button" class="cs-cmd" data-cmd="${esc(r[1])}" title="Copy">${fmt(r[1])}</button><span class="cs-desc">${esc(r[2])}${r[3] ? ' <span class="cs-flag">careful</span>' : ''}</span></div>`).join('') +
        '</section>').join('') || '<p class="muted">Nothing matches. Try a simpler word.</p>';
    };
    host.addEventListener('click', (e) => {
      const c = e.target.closest('.cs-cat');
      if (c) { cat = c.dataset.cat; render(); return; }
      const b = e.target.closest('.cs-cmd');
      if (b) {
        LG.copy(b.dataset.cmd);
        b.classList.add('copied');
        setTimeout(() => b.classList.remove('copied'), 1100);
      }
    });
    search.addEventListener('input', render);
    host.lgSearch = (q) => { search.value = q; cat = 'All'; render(); };
    render();
  });

  // ------------------------------------------------------------------
  // glossary: every term, searchable
  // ------------------------------------------------------------------
  LG.widget('glossary', (host) => {
    const items = Object.entries(LG.glossary).sort((a, b) => a[1][0].replace(/^\./, '').localeCompare(b[1][0].replace(/^\./, ''), 'en', { sensitivity: 'base' }));
    host.classList.add('gl');
    host.innerHTML = '<input type="search" class="gl-search" placeholder="Search the glossary" aria-label="Search the glossary"><dl class="gl-list"></dl>';
    const search = host.querySelector('.gl-search');
    const dl = host.querySelector('.gl-list');
    const render = () => {
      const q = search.value.trim().toLowerCase();
      dl.innerHTML = items.filter(([, v]) => !q || (v[0] + ' ' + v[1]).toLowerCase().includes(q)).map(([k, v]) => {
        const ch = LG.chapterTitle ? LG.chapterTitle(v[2]) : '';
        return `<div class="gl-item" id="g-${k}"><dt>${esc(v[0])}</dt><dd>${esc(v[1])}${ch ? ` <a href="#${v[2]}" class="gl-more">Learn more: ${esc(ch)}</a>` : ''}</dd></div>`;
      }).join('') || '<p class="muted">No matching words.</p>';
    };
    search.addEventListener('input', render);
    host.lgSearch = (q) => { search.value = q; render(); };
    render();
  });

  // ------------------------------------------------------------------
  // markdown: live README preview
  // ------------------------------------------------------------------
  function md(src) {
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const lines = src.replace(/\r/g, '').split('\n');
    let html = '';
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) {
        const code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        html += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
      } else if (/^#{1,6}\s/.test(l)) {
        const n = l.match(/^#+/)[0].length;
        html += `<h${n}>${inline(l.slice(n).trim())}</h${n}>`;
        i++;
      } else if (/^(-{3,}|\*{3,})\s*$/.test(l)) { html += '<hr>'; i++; }
      else if (/^>\s?/.test(l)) {
        const q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
        html += `<blockquote>${inline(q.join(' '))}</blockquote>`;
      } else if (/^\s*[-*]\s+/.test(l)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
        html += '<ul>' + items.map((it) => {
          const t = it.match(/^\[( |x|X)\]\s+(.*)$/);
          return t ? `<li class="task"><input type="checkbox" disabled${t[1] !== ' ' ? ' checked' : ''}> ${inline(t[2])}</li>` : `<li>${inline(it)}</li>`;
        }).join('') + '</ul>';
      } else if (/^\s*\d+\.\s+/.test(l)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
        html += '<ol>' + items.map((it) => `<li>${inline(it)}</li>`).join('') + '</ol>';
      } else if (!l.trim()) i++;
      else {
        const p = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i])) p.push(lines[i++]);
        html += `<p>${inline(p.join(' '))}</p>`;
      }
    }
    return html;
  }
  LG.widget('markdown', (host) => {
    host.classList.add('mdw');
    host.innerHTML = '<label class="mdw-col"><span>README.md (type here)</span><textarea class="mdw-src" rows="18" spellcheck="false"></textarea></label><div class="mdw-col"><span>How GitHub shows it</span><div class="mdw-out"></div></div>';
    const src = host.querySelector('.mdw-src');
    const out = host.querySelector('.mdw-out');
    src.value = '# Recipe Book\n\nA collection of **family recipes**, tracked with git.\n\n## How to use it\n\n1. Pick a recipe file\n2. Cook it, then open an issue if something went wrong\n\n## Recipes\n\n- [x] Pancakes\n- [x] Salsa\n- [ ] Tacos (coming soon)\n\n> Tip: every recipe lives in its own `.txt` file.\n\n```\ngit clone https://github.com/you/recipes.git\n```\n\nMore formatting tricks: [GitHub Docs](https://docs.github.com/en/get-started/writing-on-github)';
    const render = () => { out.innerHTML = md(src.value); };
    src.addEventListener('input', render);
    render();
  });

  // ------------------------------------------------------------------
  // commitlint: grade a commit message as you type
  // ------------------------------------------------------------------
  LG.widget('commitlint', (host) => {
    const fixes = { added: 'Add', adds: 'Add', adding: 'Add', fixed: 'Fix', fixes: 'Fix', fixing: 'Fix', updated: 'Update', updates: 'Update', updating: 'Update', removed: 'Remove', removes: 'Remove', removing: 'Remove', changed: 'Change', changes: 'Change', changing: 'Change', created: 'Create', creating: 'Create', deleted: 'Delete', deleting: 'Delete', improved: 'Improve', improving: 'Improve', refactored: 'Refactor', made: 'Make', wrote: 'Write', moved: 'Move', renamed: 'Rename', implemented: 'Implement', tweaked: 'Tweak' };
    const vague = ['fix', 'fixes', 'fixed', 'update', 'updates', 'updated', 'changes', 'change', 'stuff', 'wip', 'asdf', 'test', 'testing', 'commit', 'misc', 'minor', 'tweaks', 'more stuff', 'final', 'done', 'work', 'oops', 'fixed it', 'small fix', 'bug fix', 'bugfix', 'fixed stuff', 'updated files', 'update files', 'changes made', 'save', 'progress', 'idk'];
    host.classList.add('cl');
    host.innerHTML =
      '<div class="cl-row"><div class="cl-signal" aria-hidden="true"><i class="r"></i><i class="y"></i><i class="g"></i></div>' +
      '<label class="cl-field"><span>Type a commit message</span><input type="text" class="cl-input" value="fixed stuff" spellcheck="true"></label></div>' +
      '<ul class="cl-checks" aria-live="polite"></ul>' +
      '<div class="cl-examples"><span>Try:</span>' +
      ['WIP', 'Updated files.', 'add login button', 'Fix crash when the cart is empty', 'Add dark mode toggle to settings', 'Remove unused images from the homepage'].map((x) => `<button type="button" class="chip">${esc(x)}</button>`).join('') + '</div>';
    const input = host.querySelector('.cl-input');
    const checks = host.querySelector('.cl-checks');
    const sig = host.querySelector('.cl-signal');
    const render = () => {
      const raw = input.value;
      const m = raw.trim();
      const res = [];
      const add = (level, text) => res.push([level, text]);
      if (!m) add('bad', 'Empty. Git refuses empty commit messages.');
      else {
        const prefix = m.match(/^(feat|fix|docs|style|refactor|test|chore|perf|build|ci)(\([^)]*\))?!?:\s*/i);
        const body = prefix ? m.slice(prefix[0].length) : m;
        const first = (body.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
        if (m.length <= 50) add('ok', `${m.length} characters: short enough to read at a glance.`);
        else if (m.length <= 72) add('warn', `${m.length} characters. Aim for 50 or less; tools start to cut it off after 72.`);
        else add('bad', `${m.length} characters. Too long: GitHub truncates it. Put details in a second paragraph (a blank line, then more text).`);
        if (vague.includes(m.toLowerCase().replace(/[.!]+$/, '')) || body.split(/\s+/).length < 2) add('bad', 'Too vague. Future you will not know what this did. Say what changed and where: "Fix crash when the cart is empty".');
        else add('ok', 'Specific enough to understand without opening the code.');
        if (fixes[first]) add('warn', `Write it as a command: "${fixes[first]} ..." instead of "${body.split(/\s+/)[0]} ...". Read it as "If applied, this commit will ${fixes[first].toLowerCase()} ...".`);
        else if (/(ed|ing)$/.test(first) && first.length > 4) add('warn', `"${body.split(/\s+/)[0]}" looks like past tense. Git convention is the command form: "Add", "Fix", "Remove".`);
        else add('ok', 'Uses the command form ("Add", "Fix", "Remove"), like git itself does.');
        if (!prefix && /^[a-z]/.test(body)) add('warn', 'Start with a capital letter.');
        if (/\.$/.test(m)) add('warn', 'Drop the period at the end. It is a title, not a sentence.');
        if (prefix) add('ok', `Uses a Conventional Commits prefix (${prefix[1].toLowerCase()}:). Some teams require these.`);
      }
      checks.innerHTML = res.map(([lv, t]) => `<li class="cl-${lv}">${esc(t)}</li>`).join('');
      const worst = res.some((r) => r[0] === 'bad') ? 'r' : res.some((r) => r[0] === 'warn') ? 'y' : 'g';
      sig.dataset.state = worst;
    };
    input.addEventListener('input', render);
    host.querySelector('.cl-examples').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) { input.value = b.textContent; render(); } });
    render();
  });
})(window.LG = window.LG || {});

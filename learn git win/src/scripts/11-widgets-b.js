/* Widgets, part B: the pull request walkthrough, the undo finder, the
   .gitignore tester, the searchable cheat sheet, and the glossary list. */
(function () {
  'use strict';
  var LG = window.LG, esc = LG.esc;

  /* ---------------- pull request walkthrough (simplified mock of GitHub's pages) ---------------- */
  var METHODS = {
    merge: ['Create a merge commit', 'Confirm merge', 'Keeps every commit from the branch and adds a merge commit that ties the two lines together. Full history, slightly busier map.'],
    squash: ['Squash and merge', 'Confirm squash and merge', 'Combines all the branch\'s commits into one single new commit on main. Tidy history: one pull request, one commit. Very popular.'],
    rebase: ['Rebase and merge', 'Confirm rebase and merge', 'Copies each commit onto the tip of main, one after another, with no merge commit. A perfectly straight line.']
  };
  LG.widgets.prflow = function (el) {
    var step, method, log;
    el.classList.add('pr');
    function reset() { step = 0; method = 'squash'; log = []; draw(); }
    function ev(cls, html) { return '<div class="pr-ev ' + (cls || '') + '">' + html + '</div>'; }
    function tabs(on) {
      return '<div class="pr-tabs">' + ['Conversation', 'Commits ' + (step >= 4 ? 2 : 1), 'Checks 1', 'Files changed 1'].map(function (t, k) {
        return '<span class="' + (k === on ? 'on' : '') + '">' + t + '</span>';
      }).join('') + '</div>';
    }
    function draw() {
      var page = '', side = '', url = 'github.com/you/my-site';
      var head = '<div class="pr-top"><span class="mark" aria-hidden="true"></span>you / my-site<span class="url">' + url + (step >= 2 ? '/pull/1' : step === 1 ? '/compare/main...fix-typo' : '') + '</span></div>';
      if (step === 0) {
        page = '<h5>you / my-site</h5><div class="pr-banner"><span><b>fix-typo</b> had recent pushes 1 minute ago</span><button type="button" class="btn sm go pr-pulse" data-next>Compare &amp; pull request</button></div>' +
          '<div class="pr-files"><div>main &middot; 3 commits</div><div>about.html</div><div>index.html</div><div>style.css</div></div>';
        side = ['After <code>git push</code>', 'GitHub noticed your new branch and shows this yellow banner on the repository page for a while. Click <b>Compare &amp; pull request</b>.<br><br>No banner? Go to the <b>Pull requests</b> tab, click <b>New pull request</b>, and pick your branch.'];
      } else if (step === 1) {
        page = '<h5>Open a pull request</h5><div class="pr-refs">base: <span class="pr-ref">main</span> &larr; compare: <span class="pr-ref">fix-typo</span><span class="pr-ok">Able to merge.</span></div>' +
          '<label>Title<input class="pr-field" value="Fix typo in heading"></label><label>Description<textarea class="pr-field" rows="4">Changes "Welcom" to "Welcome" on the homepage.\n\nCloses #3</textarea></label>' +
          '<button type="button" class="btn sm go pr-pulse" data-next>Create pull request</button> <small>(its arrow menu also offers "Create draft pull request")</small>';
        side = ['Describe the change', '<b>base</b> is where the change should go (main). <b>compare</b> is your branch. Write a title a stranger understands, and say what and why in the description.<br><br><code>Closes #3</code> links issue number 3 and closes it automatically when this pull request is merged.'];
      } else {
        var merged = step >= 6;
        page = '<h5>Fix typo in heading <span style="color:var(--ink-3)">#1</span></h5><span class="pr-state' + (merged ? ' merged' : '') + '">' + (merged ? 'Merged' : 'Open') + '</span> ' +
          '<small>you ' + (merged ? 'merged' : 'wants to merge') + ' ' + (step >= 4 ? 2 : 1) + ' commit' + (step >= 4 ? 's' : '') + ' into <span class="pr-ref">main</span> from <span class="pr-ref">fix-typo</span></small>' + tabs(0) +
          '<div class="pr-tl">' + ev('', '<b>you</b> opened this pull request<br>Changes "Welcom" to "Welcome" on the homepage. Closes #3') +
          ev('good', 'Commit <code>7c2e9a1</code> Fix typo in heading') + ev('good', 'All checks have passed <small>(1 successful check: build)</small>') + log.join('') + '</div>';
        if (step === 2) {
          page += '<div class="pr-merge blocked">Review required. <button type="button" class="btn sm pr-pulse" data-next>Request review from sam</button></div>';
          side = ['The pull request page', 'Everything about the change lives here. <b>Conversation</b> is the discussion, <b>Commits</b> lists them, <b>Checks</b> shows automatic tests, <b>Files changed</b> shows the diff.<br><br>Many projects require a teammate\'s approval before merging. Ask for one.'];
        } else if (step === 3) {
          page += '<div class="pr-merge blocked"><b>Changes requested.</b> Push another commit to this branch to update the pull request.<br><button type="button" class="btn sm pr-pulse" data-next style="margin-top:8px">Fix it and push (git commit, then git push)</button></div>';
          side = ['A review came back', 'Reviewers can <b>Comment</b>, <b>Approve</b>, or <b>Request changes</b>. Sam asked for one more tweak.<br><br>You do not open a new pull request. Fix it on your PC, commit, and <code>git push</code> to the same branch: the pull request updates by itself.'];
        } else if (step === 4) {
          page += '<div class="pr-merge"><b>This branch has no conflicts with the base branch.</b><br><div style="margin-top:8px"><select aria-label="Merge method" data-method>' +
            Object.keys(METHODS).map(function (k) { return '<option value="' + k + '"' + (k === method ? ' selected' : '') + '>' + METHODS[k][0] + '</option>'; }).join('') +
            '</select><button type="button" class="btn sm go pr-pulse" data-next>' + METHODS[method][0] + '</button></div></div>';
          side = ['Merging: three flavours', '<b>' + METHODS[method][0] + ':</b> ' + METHODS[method][2] + '<br><br>Try the dropdown. The project owner often decides which ones are allowed.'];
        } else if (step === 5) {
          page += '<div class="pr-merge"><label>Commit message<input class="pr-field" value="Fix typo in heading (#1)"></label><button type="button" class="btn sm go pr-pulse" data-next>' + METHODS[method][1] + '</button> <button type="button" class="btn sm" data-back>Cancel</button></div>';
          side = ['Last check', 'GitHub proposes a commit message. Edit it if you like, then confirm. This is the moment the change lands on main.'];
        } else if (step === 6) {
          page += '<div class="pr-merge">Pull request successfully merged and closed. The <b>fix-typo</b> branch can be safely deleted. <button type="button" class="btn sm pr-pulse" data-next>Delete branch</button></div>';
          side = ['Merged', 'main on GitHub now contains the fix and issue #3 is closed. Delete the branch on GitHub (it is merged, nothing is lost), then tidy up your PC:<pre class="sh">git switch main\ngit pull\ngit branch -d fix-typo</pre>'];
        } else {
          page += '<div class="pr-merge">Branch deleted. <button type="button" class="btn sm" disabled>Restore branch</button></div>';
          side = ['That is a pull request', 'Branch, push, open, review, fix, merge, delete. Same flow whether it is your own project or a stranger\'s open source project (Stop 13).<br><br><button type="button" class="btn sm" data-reset>Walk through it again</button>'];
        }
      }
      el.innerHTML = '<div class="pr-page" aria-label="Simplified mock-up of a GitHub pull request page">' + head + '<div class="pr-body">' + page + '</div></div>' +
        '<div class="pr-side" aria-live="polite"><span class="pr-n">Step ' + (step + 1) + ' of 8</span><h4>' + side[0] + '</h4><p>' + side[1] + '</p></div>';
      LG.initCode(el);
      var nx = el.querySelector('[data-next]');
      if (nx) nx.addEventListener('click', next);
      var bk = el.querySelector('[data-back]');
      if (bk) bk.addEventListener('click', function () { step = 4; draw(); });
      var rs = el.querySelector('[data-reset]');
      if (rs) rs.addEventListener('click', reset);
      var sel = el.querySelector('[data-method]');
      if (sel) sel.addEventListener('change', function () { method = sel.value; draw(); });
    }
    function next() {
      if (step === 2) {
        log.push(ev('', '<b>you</b> requested a review from <b>sam</b>'));
        log.push(ev('bad', '<b>sam</b> requested changes<div class="pr-diff"><div class="h">index.html</div><div class="m">-&lt;p&gt;hello, world!&lt;/p&gt;</div><div class="p">+&lt;p&gt;Hello, world!&lt;/p&gt;</div>' +
          '<div class="pr-cmt"><b>sam:</b> Nice catch! While you are here, could you capitalise "Hello" too?</div></div>'));
      }
      if (step === 3) {
        log.push(ev('good', 'Commit <code>e41b0d7</code> Capitalise greeting'));
        log.push(ev('good', '<b>sam</b> approved these changes'));
      }
      step++;
      draw();
      var b = el.querySelector('[data-next]');
      if (b) b.focus({ preventScroll: true });
    }
    reset();
  };

  /* ---------------- undo finder ---------------- */
  var U = {
    start: { q: 'What do you want to undo?', o: [
      ['Edits to a file that I have not staged', 'restore'], ['A file I staged by mistake', 'unstage'], ['My last commit', 'last'], ['An older commit', 'old'],
      ['I committed on the wrong branch', 'wrongbranch'], ['Something got "lost": a deleted branch or a bad reset', 'reflog'],
      ['A merge full of conflicts that I want out of', 'abort'], ['Everything: make my folder match GitHub exactly', 'nuke']] },
    last: { q: 'Is that commit already on GitHub (pushed)?', o: [['No, it only exists on my PC', 'lastlocal'], ['Yes, I pushed it', 'revert']] },
    lastlocal: { q: 'What is wrong with it?', o: [['Typo in the message', 'amendmsg'], ['I forgot to include a file', 'amendfile'],
      ['I want to un-commit, but keep my changes', 'soft'], ['I want it gone, changes and all', 'hard']] },
    old: { q: 'Is it pushed?', o: [['Yes', 'revertold'], ['No, but other commits came after it', 'revertold']] },
    restore: { risk: 'careful', t: 'Throw away unstaged edits', a: 'Puts the file back to how it was at the last <code>git add</code> or commit. Discarded edits do not go to the Recycle Bin; they are gone.', c: 'git restore index.html\n# every file in the folder:\ngit restore .' },
    unstage: { risk: 'safe', t: 'Unstage a file', a: 'Takes it out of the staging area. Your edits stay in the file.', c: 'git restore --staged passwords.txt' },
    amendmsg: { risk: 'safe', t: 'Fix the last commit message', a: 'Replaces the last commit with an identical one carrying the new message. Only before pushing.', c: 'git commit --amend -m "Better message"' },
    amendfile: { risk: 'safe', t: 'Add a forgotten file to the last commit', a: '<code>--no-edit</code> keeps the message as it was. Only before pushing.', c: 'git add forgotten.txt\ngit commit --amend --no-edit' },
    soft: { risk: 'safe', t: 'Un-commit, keep the work', a: 'The branch steps back one commit. Everything that commit changed is still there, staged and ready to recommit.', c: 'git reset --soft HEAD~1' },
    hard: { risk: 'danger', t: 'Delete the last commit completely', a: 'The commit disappears from the branch and every uncommitted change in your folder is wiped too. The reflog can rescue the commit for a while, but not uncommitted edits.', c: 'git status\n# make sure nothing uncommitted matters, then:\ngit reset --hard HEAD~1' },
    revert: { risk: 'safe', t: 'Revert it', a: 'Pushed history is shared history: never rewrite it. <code>git revert</code> makes a new commit that does the exact opposite, then you push that.', c: 'git revert HEAD\ngit push' },
    revertold: { risk: 'safe', t: 'Revert that specific commit', a: 'Find its ID, then revert it. Git builds an opposite commit on top of everything else; if later commits touched the same lines, you resolve a conflict like in Stop 10.', c: 'git log --oneline\n# copy the ID of the bad commit, for example a1b2c3d:\ngit revert a1b2c3d\ngit push' },
    wrongbranch: { risk: 'careful', t: 'Move the commit to a new branch', a: 'Only if not pushed yet. First give your commit a branch name so it is safe, then move main back one step, then switch to the new branch. Use <code>HEAD~2</code> for two commits.', c: 'git branch my-feature\ngit reset --hard HEAD~1\ngit switch my-feature' },
    reflog: { risk: 'safe', t: 'Find it in the reflog', a: 'The reflog lists everywhere HEAD has been for the last months. Find the line from before the accident, then put a branch on that commit. In PowerShell, anything with <code>@{ }</code> needs quotes.', c: "git reflog\n# found it at a1b2c3d? rescue it on a new branch:\ngit branch rescued a1b2c3d\n# or jump back one move:\ngit reset --hard 'HEAD@{1}'" },
    abort: { risk: 'safe', t: 'Abort the merge', a: 'Everything goes back to exactly how it was before you ran <code>git merge</code> (or <code>git pull</code>).', c: 'git merge --abort' },
    nuke: { risk: 'danger', t: 'Match GitHub exactly', a: 'Throws away every local commit that is not on GitHub and every uncommitted change. <code>git clean</code> also deletes untracked files; <code>-n</code> previews first.', c: 'git fetch origin\ngit reset --hard origin/main\ngit clean -n\n# if that list is OK to delete:\ngit clean -fd' }
  };
  LG.widgets.undo = function (el) {
    var path = ['start'], picks = [];
    el.classList.add('ut');
    function draw() {
      var id = path[path.length - 1], n = U[id], html = '<p class="ut-path">' + (picks.length ? picks.map(esc).join(' &rsaquo; ') : 'Undo finder') + '</p>';
      if (n.q) {
        html += '<p class="ut-q">' + n.q + '</p><div class="ut-opts">' + n.o.map(function (o, k) { return '<button type="button" class="opt" data-k="' + k + '">' + esc(o[0]) + '</button>'; }).join('') + '</div>';
      } else {
        html += '<div class="ut-a"><span class="ut-risk ' + n.risk + '">' + { safe: 'Safe', careful: 'Careful: loses edits', danger: 'Dangerous: deletes work' }[n.risk] + '</span><h4>' + n.t + '</h4><p>' + n.a + '</p><pre class="sh"></pre></div>';
      }
      if (path.length > 1) html += '<p style="margin:12px 0 0"><button type="button" class="btn sm" data-back>&larr; Back</button> <button type="button" class="btn sm ghost" data-restart>Start over</button></p>';
      el.innerHTML = html;
      if (!n.q) { el.querySelector('pre').textContent = n.c; LG.initCode(el); }
      LG.$$('[data-k]', el).forEach(function (b) {
        b.addEventListener('click', function () { var o = n.o[+b.getAttribute('data-k')]; picks.push(o[0]); path.push(o[1]); draw(); });
      });
      var bk = el.querySelector('[data-back]');
      if (bk) bk.addEventListener('click', function () { path.pop(); picks.pop(); draw(); });
      var rs = el.querySelector('[data-restart]');
      if (rs) rs.addEventListener('click', function () { path = ['start']; picks = []; draw(); });
    }
    draw();
  };

  /* ---------------- .gitignore tester ---------------- */
  function globRe(p, anchored) {
    var s = '', i = 0;
    while (i < p.length) {
      var c = p[i];
      if (c === '*' && p[i + 1] === '*') {
        if (p[i + 2] === '/') { s += '(?:.*/)?'; i += 3; } else { s += '.*'; i += 2; }
        continue;
      }
      if (c === '*') { s += '[^/]*'; i++; continue; }
      if (c === '?') { s += '[^/]'; i++; continue; }
      if (c === '[') {
        var j = p.indexOf(']', i + 1);
        if (j > i) { s += '[' + p.slice(i + 1, j).replace(/^!/, '^').replace(/\\/g, '\\\\') + ']'; i = j + 1; continue; }
      }
      s += c.replace(/[.+^${}()|\\\]]/g, '\\$&');
      i++;
    }
    return new RegExp((anchored ? '^' : '(?:^|/)') + s + '$', 'i');
  }
  LG.ignoreRules = function (text) {
    var rules = [];
    text.split('\n').forEach(function (line, n) {
      var p = line.replace(/\r/g, '').replace(/\s+$/, '');
      if (!p || p[0] === '#') return;
      var neg = false, dirOnly = false;
      if (p[0] === '!') { neg = true; p = p.slice(1); }
      if (p[0] === '\\') p = p.slice(1);
      if (p.slice(-1) === '/') { dirOnly = true; p = p.slice(0, -1); }
      var anchored = p.indexOf('/') >= 0;
      if (p[0] === '/') p = p.slice(1);
      if (p) rules.push({ n: n + 1, raw: line.trim(), neg: neg, dirOnly: dirOnly, re: globRe(p, anchored) });
    });
    return rules;
  };
  LG.ignoreCheck = function (rules, path) {
    path = path.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
    function last(p, isDir) { var hit = null; rules.forEach(function (r) { if ((!r.dirOnly || isDir) && r.re.test(p)) hit = r; }); return hit; }
    var parts = path.split('/');
    for (var k = 1; k < parts.length; k++) {
      var m = last(parts.slice(0, k).join('/'), true);
      if (m && !m.neg) return { ignored: true, rule: m, via: parts.slice(0, k).join('/') + '/' };
    }
    var m2 = last(path, false);
    return { ignored: !!(m2 && !m2.neg), rule: m2 };
  };
  LG.widgets.ignore = function (el) {
    el.classList.add('ig');
    el.innerHTML = '<label>Your .gitignore<textarea class="ig-rules" spellcheck="false"># Windows junk\nThumbs.db\ndesktop.ini\n\n# Secrets: never commit these\n.env\n*.key\n\n' +
      '# Installed packages and build output\nnode_modules/\ndist/\n\n# Log files...\n*.log\n# ...except this one\n!keep.log</textarea></label>' +
      '<label>Files in your project<textarea class="ig-files" spellcheck="false">index.html\nstyle.css\n.env\nThumbs.db\nsecrets/api.key\nnode_modules/lodash/index.js\ndist/app.js\ndebug.log\nkeep.log\nsrc/app.js\nphotos/Desktop.ini</textarea></label>' +
      '<div><b style="font:700 1rem var(--f-head);letter-spacing:.03em">What Git does with each file</b><div class="ig-res" aria-live="polite" style="margin-top:6px"></div></div>';
    var rulesEl = el.querySelector('.ig-rules'), filesEl = el.querySelector('.ig-files'), res = el.querySelector('.ig-res');
    function draw() {
      var rules = LG.ignoreRules(rulesEl.value);
      res.innerHTML = filesEl.value.split('\n').filter(function (x) { return x.trim(); }).map(function (f) {
        var r = LG.ignoreCheck(rules, f);
        var why = r.rule ? 'line ' + r.rule.n + ': ' + r.rule.raw + (r.via ? ' (folder ' + r.via + ')' : '') : 'no rule matches';
        return '<div class="ig-row' + (r.ignored ? ' out' : '') + '"><span class="ig-p">' + esc(f.trim()) + '</span><span><span class="fc-b ' + (r.ignored ? 'dim' : 'grn') + '">' +
          (r.ignored ? 'ignored' : 'tracked') + '</span><br><small>' + esc(why) + '</small></span></div>';
      }).join('');
    }
    rulesEl.addEventListener('input', draw);
    filesEl.addEventListener('input', draw);
    draw();
  };

  /* ---------------- cheat sheet ---------------- */
  var CHEATS = [
    ['Setup', [['git --version', 'Is Git installed? Which version?'], ['git config --global user.name "Your Name"', 'The name stamped on your commits.'],
      ['git config --global user.email "you@example.com"', 'The email stamped on your commits. Use your GitHub email.'], ['git config --global init.defaultBranch main', 'New repositories start on a branch called main.'],
      ['git config --global core.editor "code --wait"', 'Use VS Code when Git needs a message (or: notepad).'], ['git config --global --list', 'Show all your settings.']]],
    ['Start a project', [['git init', 'Turn the current folder into a repository.'], ['git clone https://github.com/owner/repo.git', 'Download a repository into a new folder.'],
      ['git clone https://github.com/owner/repo.git .', 'Clone into the current, empty folder instead.']]],
    ['Everyday loop', [['git status', 'What changed? What is staged? Run it constantly.'], ['git add index.html', 'Stage one file.'], ['git add .', 'Stage everything in this folder.'],
      ['git commit -m "Describe the change"', 'Save what is staged as a commit.'], ['git commit -am "Describe the change"', 'Stage all tracked files and commit. New files are not included.'],
      ['git diff', 'Show changes that are not staged.'], ['git diff --staged', 'Show changes that are staged.'], ['git log --oneline', 'Compact history.'],
      ['git log --oneline --graph --all', 'History of every branch, with lines.'], ['git show HEAD', 'What did the last commit change?']]],
    ['Branches', [['git branch', 'List branches. * marks yours.'], ['git switch -c new-branch', 'Create a branch and switch to it.'], ['git switch main', 'Switch to an existing branch.'],
      ['git switch -', 'Back to the branch you were on before.'], ['git merge feature', 'Merge feature into the branch you are on.'], ['git merge --abort', 'Back out of a conflicted merge.'],
      ['git branch -d feature', 'Delete a merged branch.'], ['git branch -D feature', 'Force-delete a branch, merged or not.', 1], ['git branch -M main', 'Rename the current branch to main.']]],
    ['GitHub and remotes', [['git remote add origin https://github.com/you/repo.git', 'Connect your repository to one on GitHub.'], ['git remote -v', 'Show connected remotes.'],
      ['git push -u origin main', 'First push of a branch: upload it and remember the link.'], ['git push', 'Upload new commits.'], ['git pull', 'Download new commits and merge them.'],
      ['git fetch', 'Download without merging. Always safe.'], ['git push -u origin my-branch', 'Publish a branch, for a pull request.'],
      ['git remote add upstream https://github.com/owner/repo.git', 'On a fork: connect the original repository.'], ['git fetch upstream', 'Download the original\'s updates.'],
      ['git merge upstream/main', 'Bring those updates into your branch.']]],
    ['GitHub CLI (gh)', [['winget install --id GitHub.cli', 'Install the GitHub command line tool.'], ['gh auth login', 'Sign in: GitHub.com, HTTPS, log in with a web browser.'],
      ['gh repo create my-site --public --source=. --remote=origin --push', 'Create a GitHub repository from this folder and push it.'], ['gh pr create --fill', 'Open a pull request for the current branch.'],
      ['gh pr list', 'List open pull requests.'], ['gh pr checkout 12', 'Download pull request #12 to try it.'], ['gh pr merge --squash --delete-branch', 'Merge the current pull request and clean up.']]],
    ['Undo', [['git restore index.html', 'Throw away unstaged edits to a file.', 1], ['git restore --staged index.html', 'Unstage a file. The edits stay.'],
      ['git commit --amend -m "Better message"', 'Replace the last commit. Only before pushing.'], ['git reset --soft HEAD~1', 'Undo the last commit, keep its changes staged.'],
      ['git reset --hard HEAD~1', 'Delete the last commit AND all uncommitted changes.', 1], ['git revert HEAD', 'New commit that undoes the last one. Safe after pushing.'],
      ['git reflog', 'Everywhere HEAD has been. Finds "lost" commits.'], ["git reset --hard 'HEAD@{1}'", 'Jump back one move. Quotes needed in PowerShell.', 1]]],
    ['Stash, tags, rebase', [['git stash', 'Shelve uncommitted changes.'], ['git stash -u', 'Shelve, including untracked files.'], ['git stash list', 'See the shelf.'],
      ['git stash pop', 'Take the latest shelved changes back.'], ['git tag v1.0', 'Label the current commit.'], ['git push origin v1.0', 'Publish a tag.'],
      ['git rebase main', 'Replay your branch on top of main. Never on branches others use.', 1]]],
    ['Windows extras', [['winget install --id Git.Git -e --source winget', 'Install Git.'], ['git config --global core.autocrlf true', 'CRLF on your PC, LF in the repository.'],
      ['git config --global core.longpaths true', 'Allow very long file paths.'], ['git mv readme.md README.md', 'Change only the capitalisation of a file name.'],
      ['q', 'Leave the pager (the screen with : at the bottom after git log).'], [':q!', 'Escape Vim without saving (press Esc first, then Enter after).']]]
  ];
  LG.widgets.cheats = function (el) {
    var cat = 'All', q = '';
    el.classList.add('cs');
    el.innerHTML = '<input type="search" class="cs-search" placeholder="Search commands, e.g. undo, branch, push" aria-label="Search the cheat sheet"><div class="cs-bar" role="group" aria-label="Filter by topic">' +
      ['All'].concat(CHEATS.map(function (g) { return g[0]; })).map(function (c) { return '<button type="button" class="chip" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div><div class="cs-list"></div>';
    var list = el.querySelector('.cs-list');
    function draw() {
      var html = '';
      LG.$$('.chip', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-c') === cat)); });
      CHEATS.forEach(function (g, gi) {
        if (cat !== 'All' && cat !== g[0]) return;
        var rows = g[1].filter(function (x) { return !q || (x[0] + ' ' + x[1] + ' ' + g[0]).toLowerCase().indexOf(q) >= 0; });
        if (!rows.length) return;
        html += '<div class="cs-group"><h3>' + esc(g[0]) + '</h3>' + rows.map(function (x) {
          return '<div class="cs-row"><div class="cs-cmd"><code>' + esc(x[0]) + '</code><button type="button" class="btn sm" data-copy="' + esc(x[0]) + '">Copy</button></div><p>' +
            (x[2] ? '<span class="cs-danger">Careful: </span>' : '') + esc(x[1]) + '</p></div>';
        }).join('') + '</div>';
      });
      list.innerHTML = html || '<p>Nothing matches "' + esc(q) + '". Try a shorter word.</p>';
      LG.$$('[data-copy]', list).forEach(function (b) { b.addEventListener('click', function () { LG.copyText(b.getAttribute('data-copy'), b); }); });
    }
    el.querySelector('.cs-search').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
    LG.$$('.chip', el).forEach(function (b) { b.addEventListener('click', function () { cat = b.getAttribute('data-c'); draw(); }); });
    draw();
  };

  /* ---------------- glossary list ---------------- */
  LG.widgets.glossary = function (el) {
    el.classList.add('gl');
    el.innerHTML = '<input type="search" class="gl-search" placeholder="Search the glossary" aria-label="Search the glossary"><dl></dl>';
    var dl = el.querySelector('dl'), items = (LG.glossary || []).slice().sort(function (a, b) { return a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1; });
    function draw(q) {
      var html = items.filter(function (g) { return !q || (g.term + ' ' + (g.alias || []).join(' ') + ' ' + g.def).toLowerCase().indexOf(q) >= 0; })
        .map(function (g) { return '<dt>' + esc(g.term) + '</dt><dd>' + g.def + '</dd>'; }).join('');
      dl.innerHTML = html || '<dd>No match.</dd>';
    }
    el.querySelector('input').addEventListener('input', function (e) { draw(e.target.value.trim().toLowerCase()); });
    draw('');
  };
})();

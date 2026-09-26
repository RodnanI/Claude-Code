/* The guided missions for each simulator: a starting state plus steps.
   Steps with ev:1 wait for a command to be run; the others check the repository state. */
(function () {
  'use strict';
  var LG = window.LG, G = LG.git;
  var URL = 'https://github.com/you/my-site.git';
  var INDEX = '<h1>Welcom to my site</h1>\n<p>Hello, world!</p>';
  var STYLE = 'body {\n  background: white;\n  font-family: sans-serif;\n}';
  var ABOUT = '<h1>About me</h1>\n<p>I am learning Git.</p>';

  function count(r) { return r.headId() ? Object.keys(r.ancestors(r.headId())).length : 0; }
  function arg(c, f) { return (c.ev.args || []).indexOf(f) >= 0; }
  function ran(sub) { return function (c) { return c.ev.git === sub; }; }
  function srv(c, url) { return c.r.serverByUrl(url || URL); }
  function base(r) { r.seed('main', [['Add homepage', { 'index.html': INDEX }], ['Add stylesheet', { 'style.css': STYLE }]]); }
  function addOrCommit(msg, file) {
    return function (c) { return c.r.status().staged.length ? 'git commit -m "' + msg + '"' : 'git add ' + (file || '.'); };
  }
  var M = LG.missions = {};

  M['first-commit'] = {
    title: 'Mission: your first commit',
    intro: 'The folder <b>my-site</b> holds two files but no Git yet. Type in the terminal and watch the three boxes and the map react.',
    setup: function (r) { r.work = { 'index.html': INDEX, 'style.css': STYLE }; },
    steps: [
      { t: 'Turn this folder into a repository: <code>git init</code>', hint: 'git init', check: function (c) { return c.r.initialized; } },
      { t: 'Ask Git what it sees: <code>git status</code>. Both files show up as <em>untracked</em>: Git sees them but is not tracking them yet.', hint: 'git status', ev: 1, check: ran('status') },
      { t: 'Stage one file: <code>git add index.html</code>. It appears in the Staging area.', hint: 'git add index.html', check: function (c) { return 'index.html' in c.r.index; } },
      { t: 'Run <code>git status</code> again. index.html is green now (staged), style.css is still red.', hint: 'git status', ev: 1, check: ran('status') },
      { t: 'Stage the rest: <code>git add .</code> (the dot means "everything in this folder").', hint: 'git add .', check: function (c) { return 'style.css' in c.r.index; } },
      { t: 'Save the snapshot with a message: <code>git commit -m "First version of my site"</code>', hint: 'git commit -m "First version of my site"', check: function (c) { return !!c.r.headId(); } },
      { t: 'Look at your history: <code>git log</code>', hint: 'git log', ev: 1, check: ran('log') },
      { t: 'Change something: click <b>edit</b> next to index.html (or type <code>notepad index.html</code>), fix "Welcom" or write anything, then Save.',
        check: function (c) { return c.r.work['index.html'] !== c.r.headTree()['index.html']; } },
      { t: 'See exactly what changed: <code>git diff</code>. Red lines were removed, green lines added.', hint: 'git diff', ev: 1, check: ran('diff') },
      { t: 'Stage it: <code>git add index.html</code>', hint: 'git add index.html', check: function (c) { return c.r.status().staged.length > 0; } },
      { t: 'Commit it: <code>git commit -m "Change the greeting"</code>', hint: 'git commit -m "Change the greeting"', check: function (c) { return count(c.r) >= 2; } }
    ],
    win: 'Two commits, two save points. Edit, add, commit: that loop is most of everyday Git.'
  };

  M.history = {
    title: 'Mission: read the history',
    intro: 'This repository already has four commits, and about.html has an edit that is not saved in a commit yet.',
    setup: function (r) {
      r.seed('main', [['Add homepage', { 'index.html': INDEX }], ['Add stylesheet', { 'style.css': STYLE }], ['Add about page', { 'about.html': ABOUT }],
        ['Make headings red', { 'style.css': STYLE + '\nh1 {\n  color: red;\n}' }]]);
      r.checkoutClean('main');
      r.work['about.html'] = ABOUT.replace('learning Git.', 'learning Git and GitHub.');
    },
    steps: [
      { t: 'Show the full history: <code>git log</code>. Newest commit first.', hint: 'git log', ev: 1, check: function (c) { return c.ev.git === 'log' && !arg(c, '--oneline'); } },
      { t: 'Now the compact view: <code>git log --oneline</code>. One commit per line: short ID, then message.', hint: 'git log --oneline', ev: 1, check: function (c) { return c.ev.git === 'log' && arg(c, '--oneline'); } },
      { t: 'Look inside one commit: <code>git show HEAD~1</code>. <code>HEAD~1</code> means "one commit before where I am". You can also paste an ID from the list.', hint: 'git show HEAD~1', ev: 1, check: function (c) { return c.ev.git === 'show' && c.ev.ok; } },
      { t: 'See your unsaved edit: <code>git diff</code>', hint: 'git diff', ev: 1, check: function (c) { return c.ev.git === 'diff' && c.ev.shown; } },
      { t: 'Stage it: <code>git add about.html</code>', hint: 'git add about.html', check: function (c) { return c.r.status().staged.length > 0; } },
      { t: 'Run <code>git diff</code> again. Empty! Plain git diff only shows changes that are <em>not</em> staged.', hint: 'git diff', ev: 1, check: function (c) { return c.ev.git === 'diff' && !c.ev.shown; } },
      { t: 'Show what is staged instead: <code>git diff --staged</code>', hint: 'git diff --staged', ev: 1, check: function (c) { return c.ev.git === 'diff' && (arg(c, '--staged') || arg(c, '--cached')); } },
      { t: 'Commit it: <code>git commit -m "Mention GitHub on the about page"</code>', hint: 'git commit -m "Mention GitHub on the about page"', check: function (c) { return count(c.r) >= 5; } }
    ],
    win: 'You can read any project\'s history now: what changed, when, by whom, and exactly how.'
  };

  M.undo = {
    title: 'Mission: undo things safely',
    intro: 'A cat walked across the keyboard and index.html is ruined. Also, passwords.txt must never end up in a commit.',
    setup: function (r) {
      base(r);
      r.checkoutClean('main');
      r.work['index.html'] = INDEX + '\njjjjjjjjjjjjjjjjjjjjj;;;;;;;;;;;;;;;;;';
      r.work['passwords.txt'] = 'email password: hunter2';
    },
    steps: [
      { t: 'See the damage: <code>git diff</code>', hint: 'git diff', ev: 1, check: ran('diff') },
      { t: 'Throw that edit away and go back to the last saved version: <code>git restore index.html</code>. In real life, discarded edits are gone for good.', hint: 'git restore index.html',
        check: function (c) { return c.r.work['index.html'] === c.r.index['index.html']; } },
      { t: 'Oops, on purpose: <code>git add .</code> stages everything, passwords.txt included. Look at the Staging box.', hint: 'git add .', check: function (c) { return 'passwords.txt' in c.r.index; } },
      { t: 'Take it back out: <code>git restore --staged passwords.txt</code>. The file stays on disk; it just is not queued any more.', hint: 'git restore --staged passwords.txt',
        check: function (c) { return !('passwords.txt' in c.r.index) && 'passwords.txt' in c.r.work; } },
      { t: 'Make a real change: edit style.css (click edit), save, then <code>git add style.css</code>', hint: 'git add style.css',
        check: function (c) { return c.r.index['style.css'] !== c.r.headTree()['style.css']; } },
      { t: 'Commit with a typo, on purpose: <code>git commit -m "Updte colors"</code>', hint: 'git commit -m "Updte colors"', check: function (c) { return count(c.r) >= 3; } },
      { t: 'Fix the message: <code>git commit --amend -m "Update colors"</code>. On the map, the commit is replaced by a new one with a new ID.', hint: 'git commit --amend -m "Update colors"', ev: 1,
        check: function (c) { return !!c.ev.amend; } },
      { t: 'Pretend that commit was already pushed and turned out bad. Undo it the safe way: <code>git revert HEAD</code>', hint: 'git revert HEAD', ev: 1, check: function (c) { return !!c.ev.revert; } },
      { t: 'Check: <code>git log --oneline</code>. The bad commit is still there, plus a new one that cancels it. Nothing was erased.', hint: 'git log --oneline', ev: 1, check: ran('log') }
    ],
    win: 'Discard an edit, unstage a file, fix a message, undo a published commit without rewriting history. That covers most "oh no" moments.'
  };

  M.branches = {
    title: 'Mission: make and switch branches',
    intro: 'You want to try a dark theme without risking the working site on main.',
    setup: function (r) { base(r); r.checkoutClean('main'); },
    steps: [
      { t: 'List the branches: <code>git branch</code>. The <code>*</code> marks the one you are on.', hint: 'git branch', ev: 1, check: function (c) { return c.ev.git === 'branch' && !(c.ev.args || []).length; } },
      { t: 'Create a branch: <code>git branch dark-mode</code>. Nothing else moves: a new name tag appears on the same commit.', hint: 'git branch dark-mode', check: function (c) { return 'dark-mode' in c.r.branches; } },
      { t: 'Switch to it: <code>git switch dark-mode</code>. Watch HEAD move to the new label.', hint: 'git switch dark-mode', check: function (c) { return c.r.head === 'dark-mode' && !c.r.detached; } },
      { t: 'Edit style.css (click edit): change <code>white</code> to <code>black</code> and Save.', check: function (c) { return c.r.work['style.css'] !== c.r.headTree()['style.css']; } },
      { t: 'Stage and commit: <code>git add style.css</code>, then <code>git commit -m "Try a dark background"</code>', hint: addOrCommit('Try a dark background', 'style.css'),
        check: function (c) { return c.r.branches['dark-mode'] !== c.r.branches.main; } },
      { t: 'Go back: <code>git switch main</code>. Open style.css: it says white again. The dark version is safe on its own branch.', hint: 'git switch main', check: function (c) { return c.r.head === 'main'; } },
      { t: 'Create and switch in one go: <code>git switch -c footer</code>', hint: 'git switch -c footer', check: function (c) { return c.r.head === 'footer'; } },
      { t: 'Add a footer line to index.html (click edit), then <code>git add .</code> and <code>git commit -m "Add footer"</code>', hint: addOrCommit('Add footer'),
        check: function (c) { return c.r.branches.footer && c.r.branches.footer !== c.r.branches.main; } },
      { t: 'See every branch at once: <code>git log --oneline --all</code>, and look at the map.', hint: 'git log --oneline --all', ev: 1, check: function (c) { return c.ev.git === 'log' && arg(c, '--all'); } }
    ],
    win: 'Two experiments on their own lines, main untouched. Next stop: bringing them back together.'
  };

  M.merging = {
    title: 'Mission: merge, then survive a conflict',
    intro: 'main plus two finished branches: typo-fix, and new-colors (which changed the same line as main did).',
    setup: function (r) {
      var b = r.seed('main', [['Add homepage', { 'index.html': INDEX }], ['Add stylesheet', { 'style.css': STYLE }]]);
      r.seed('new-colors', [['Make the page green', { 'style.css': STYLE.replace('white', 'palegreen') }]], b);
      r.seed('main', [['Make the page orange', { 'style.css': STYLE.replace('white', 'orange') }]]);
      r.seed('typo-fix', [['Fix typo in heading', { 'index.html': INDEX.replace('Welcom ', 'Welcome ') }]], r.branches.main);
      r.checkoutClean('main');
    },
    steps: [
      { t: 'Get the overview: <code>git log --oneline --all</code>, and study the map.', hint: 'git log --oneline --all', ev: 1, check: function (c) { return c.ev.git === 'log'; } },
      { t: 'Bring in the typo fix: <code>git merge typo-fix</code>. main has nothing new since typo-fix started, so Git simply slides main forward (a fast-forward).', hint: 'git merge typo-fix',
        check: function (c) { return c.r.isAncestor(c.r.branches['typo-fix'], c.r.branches.main); } },
      { t: 'Now merge the colours: <code>git merge new-colors</code>. Both sides changed the same line of style.css, so expect a conflict.', hint: 'git merge new-colors',
        check: function (c) { return !!c.r.merging || c.r.isAncestor(c.r.branches['new-colors'], c.r.branches.main); } },
      { t: 'Ask Git: <code>git status</code>. style.css is listed under "Unmerged paths".', hint: 'git status', ev: 1, check: ran('status') },
      { t: 'Click <b>edit</b> on style.css. Read the conflict markers, then choose a side with the buttons (or hand-edit until no marker lines remain) and Save.',
        check: function (c) { return !/^(<{7}|={7}|>{7})/m.test(c.r.work['style.css'] || ''); } },
      { t: 'Tell Git the conflict is resolved: <code>git add style.css</code>', hint: 'git add style.css', check: function (c) { return !c.r.merging || !c.r.merging.unresolved.length; } },
      { t: 'Finish the merge: <code>git commit -m "Merge new-colors"</code>. Without -m, Git would open your editor with a ready-made message.', hint: 'git commit -m "Merge new-colors"',
        check: function (c) { return !c.r.merging && c.r.commits[c.r.headId()].parents.length > 1; } },
      { t: 'Both branches are merged, so their labels can go: <code>git branch -d typo-fix new-colors</code>', hint: 'git branch -d typo-fix new-colors',
        check: function (c) { return !c.r.branches['typo-fix'] && !c.r.branches['new-colors']; } }
    ],
    win: 'A fast-forward, a real merge commit, and a resolved conflict. Conflicts are not errors: Git is asking you a question.'
  };

  M.remote = {
    title: 'Mission: put your project on GitHub',
    intro: 'Your repository has two commits. On github.com you already created an empty repository called my-site (the black panel). Connect the two.',
    showServers: [URL],
    setup: function (r) { base(r); r.checkoutClean('main'); r.addServer(URL); },
    steps: [
      { t: 'Tell your repo where GitHub is, under the nickname <code>origin</code>: <code>git remote add origin https://github.com/you/my-site.git</code>',
        hint: 'git remote add origin ' + URL, check: function (c) { return c.r.remotes.origin && G.normUrl(c.r.remotes.origin) === G.normUrl(URL); } },
      { t: 'Check it: <code>git remote -v</code>', hint: 'git remote -v', ev: 1, check: ran('remote') },
      { t: 'Upload main and remember the link: <code>git push -u origin main</code>', hint: 'git push -u origin main',
        check: function (c) { return srv(c).branches.main === c.r.branches.main && !!c.r.upstream.main; } },
      { t: 'Edit index.html, then <code>git add .</code> and <code>git commit -m "Update homepage"</code>', hint: addOrCommit('Update homepage'),
        check: function (c) { return c.r.countBetween(c.r.tracking['origin/main'], c.r.headId()) >= 1; } },
      { t: 'Run <code>git status</code>: you are "ahead of origin/main by 1 commit". GitHub does not have it yet.', hint: 'git status', ev: 1, check: ran('status') },
      { t: 'Upload it. Thanks to <code>-u</code> earlier, plain <code>git push</code> is enough now.', hint: 'git push',
        check: function (c) { return srv(c).branches.main === c.r.branches.main && count(c.r) >= 3; } },
      { t: 'Meanwhile your teammate Sam pushed to GitHub (see the black panel). Without pulling first, edit style.css, then <code>git add .</code> and <code>git commit -m "Change font"</code>',
        hint: addOrCommit('Change font'),
        on: function (c) {
          c.r.serverCommit(srv(c), 'main', 'Add contact page', { 'contact.html': '<h1>Contact</h1>\n<p>sam@example.com</p>' }, 'sam');
          c.view.render();
          c.view.term.line('Meanwhile on GitHub: Sam pushed a commit called "Add contact page".', 'note');
        },
        check: function (c) { return c.r.countBetween(srv(c).branches.main, c.r.headId()) >= 1; } },
      { t: 'Try <code>git push</code>. It gets rejected. Read the message: GitHub has work you do not have.', hint: 'git push', ev: 1, check: function (c) { return !!c.ev.rejected; } },
      { t: 'Download Sam\'s work and merge it with yours: <code>git pull</code>', hint: 'git pull', check: function (c) { return c.r.isAncestor(srv(c).branches.main, c.r.headId()); } },
      { t: 'Push again: <code>git push</code>', hint: 'git push', check: function (c) { return srv(c).branches.main === c.r.branches.main; } }
    ],
    win: 'That rejected push is the most common GitHub "error" there is, and now you know it only means: pull first.'
  };

  M.pr = {
    title: 'Mission: the terminal half of a pull request',
    intro: 'You have a clone of my-site. The homepage says "Welcom". Fix it the way teams do: on a branch, through a pull request.',
    showServers: [URL],
    setup: function (r) {
      r.addServer(URL);
      r.seed('main', [['Add homepage', { 'index.html': INDEX }], ['Add stylesheet', { 'style.css': STYLE }], ['Add about page', { 'about.html': ABOUT }]]);
      r.checkoutClean('main');
      r.remotes.origin = URL;
      r.publish('origin', 'main');
    },
    steps: [
      { t: 'Start a branch for the fix: <code>git switch -c fix-typo</code>', hint: 'git switch -c fix-typo', check: function (c) { return c.r.head === 'fix-typo'; } },
      { t: 'Edit index.html: change "Welcom" to "Welcome". Then <code>git add .</code> and <code>git commit -m "Fix typo in heading"</code>', hint: addOrCommit('Fix typo in heading'),
        check: function (c) { return c.r.branches['fix-typo'] && c.r.branches['fix-typo'] !== c.r.branches.main; } },
      { t: 'Upload with plain <code>git push</code>. It fails on purpose: a brand-new branch has no upstream yet. Read what Git suggests.', hint: 'git push', ev: 1,
        check: function (c) { return !!c.ev.noUpstream || !!srv(c).branches['fix-typo']; } },
      { t: 'Do what Git said: <code>git push --set-upstream origin fix-typo</code>. Spot the "Create a pull request" link in the output.', hint: 'git push --set-upstream origin fix-typo',
        check: function (c) { return srv(c).branches['fix-typo'] === c.r.branches['fix-typo']; } },
      { t: 'Now, on GitHub, you would open the pull request, get it reviewed, and click Merge. The walkthrough below this simulator shows every click. For now, let the button do it.',
        btn: { label: 'Merge the pull request on GitHub', run: function (c) {
          var s = srv(c);
          if (s.branches.main !== c.r.tracking['origin/main']) return;
          c.r.serverMerge(s, 'fix-typo', 'main', 'Merge pull request #1 from you/fix-typo\n\nFix typo in heading');
          c.view.term.line('On GitHub: pull request #1 was merged into main.', 'note');
        } },
        check: function (c) { var id = srv(c).branches.main; return c.r.commits[id].parents.length > 1; } },
      { t: 'Back on your PC, go to main: <code>git switch main</code>', hint: 'git switch main', check: function (c) { return c.r.head === 'main'; } },
      { t: 'Your main is behind GitHub now. Download the merged result: <code>git pull</code>', hint: 'git pull', check: function (c) { return c.r.branches.main === srv(c).branches.main; } },
      { t: 'The branch did its job. Delete it: <code>git branch -d fix-typo</code>', hint: 'git branch -d fix-typo', check: function (c) { return !c.r.branches['fix-typo']; } }
    ],
    win: 'Branch, commit, push, pull request, merge, pull, clean up. That is the full team workflow.'
  };

  var UP = 'https://github.com/zoe/cool-game.git', FORK = 'https://github.com/you/cool-game.git';
  var GAME = 'let speed = 2;\nlet score = 0;\nfunction loop() {\n  moveEnemies(speed);\n  score++;\n}';
  M.fork = {
    title: 'Mission: contribute through a fork',
    intro: 'Zoe\'s game <b>cool-game</b> is public. You pressed Fork on GitHub, so you own a copy: you/cool-game. Your terminal is in C:\\Users\\you\\projects.',
    base: 'C:\\Users\\you\\projects', name: 'cool-game', inRepo: false, exists: false, canLeave: true,
    showServers: [FORK, UP],
    setup: function (r) {
      var up = r.addServer(UP, { readonly: true, label: 'the original' }), fk = r.addServer(FORK, { label: 'your fork' });
      r.serverCommit(up, 'main', 'Start the game', { 'game.js': 'let speed = 2;\nfunction loop() {\n  moveEnemies(speed);\n}' }, 'zoe');
      r.serverCommit(up, 'main', 'Add a score counter', { 'game.js': GAME, 'README.md': '# Cool game\nPull requests welcome!' }, 'zoe');
      fk.branches.main = up.branches.main;
    },
    steps: [
      { t: 'Download your fork: <code>git clone https://github.com/you/cool-game.git</code>', hint: 'git clone ' + FORK, check: function (c) { return c.r.initialized; } },
      { t: 'Step into the new folder: <code>cd cool-game</code>', hint: 'cd cool-game', check: function (c) { return c.r.inRepo; } },
      { t: 'Your clone calls your fork <code>origin</code>. Also connect Zoe\'s original, by convention named <code>upstream</code>: <code>git remote add upstream https://github.com/zoe/cool-game.git</code>',
        hint: 'git remote add upstream ' + UP, check: function (c) { return !!c.r.remotes.upstream; } },
      { t: 'List both: <code>git remote -v</code>', hint: 'git remote -v', ev: 1, check: ran('remote') },
      { t: 'Try pushing straight to Zoe\'s repository: <code>git push upstream main</code>. Refused: you have no permission there. That is why forks exist.', hint: 'git push upstream main', ev: 1,
        check: function (c) { return !!c.ev.denied; } },
      { t: 'Meanwhile Zoe added sound to the original. Download it: <code>git fetch upstream</code>', hint: 'git fetch upstream',
        on: function (c) {
          c.r.serverCommit(srv(c, UP), 'main', 'Add sound effects', { 'sound.js': 'function beep() {\n  // plays a sound\n}' }, 'zoe');
          c.view.render();
          c.view.term.line('Meanwhile on GitHub: Zoe pushed "Add sound effects" to the original repository.', 'note');
        },
        check: function (c) { return c.r.tracking['upstream/main'] === srv(c, UP).branches.main; } },
      { t: 'Merge it into your main: <code>git merge upstream/main</code>', hint: 'git merge upstream/main', check: function (c) { return c.r.isAncestor(srv(c, UP).branches.main, c.r.branches.main); } },
      { t: 'Update your fork on GitHub too: <code>git push</code>', hint: 'git push', check: function (c) { return srv(c, FORK).branches.main === c.r.branches.main; } },
      { t: 'Your own change goes on a branch: <code>git switch -c faster-enemies</code>, edit game.js (speed 2 to 3), then add and commit.',
        hint: function (c) { return c.r.head !== 'faster-enemies' ? 'git switch -c faster-enemies' : c.r.status().staged.length ? 'git commit -m "Make enemies faster"' : 'git add .'; },
        check: function (c) { return c.r.branches['faster-enemies'] && c.r.branches['faster-enemies'] !== c.r.branches.main; } },
      { t: 'Push the branch to your fork: <code>git push -u origin faster-enemies</code>. Next you would open a pull request on GitHub: from your fork\'s branch into Zoe\'s main.',
        hint: 'git push -u origin faster-enemies', check: function (c) { return !!srv(c, FORK).branches['faster-enemies']; } }
    ],
    win: 'Clone your fork, track the original as upstream, stay in sync, push branches to your fork. Every open source contribution works like this.'
  };

  M.stash = {
    title: 'Mission: park unfinished work',
    intro: 'You are halfway through a redesign of style.css on main when an urgent fix is needed on the hotfix branch.',
    setup: function (r) {
      var b = r.seed('main', [['Add homepage', { 'index.html': INDEX }], ['Add stylesheet', { 'style.css': STYLE }]]);
      r.seed('hotfix', [['Use Arial', { 'style.css': STYLE.replace('sans-serif', 'Arial, sans-serif') }]], b);
      r.checkoutClean('main');
      r.work['style.css'] = STYLE.replace('white', 'beige') + '\n/* half-finished redesign */';
    },
    steps: [
      { t: 'See your unfinished work: <code>git status</code>', hint: 'git status', ev: 1, check: ran('status') },
      { t: 'Try to switch: <code>git switch hotfix</code>. Git refuses, because it would overwrite your unsaved edit to style.css.', hint: 'git switch hotfix', ev: 1,
        check: function (c) { return c.ev.git === 'switch' && !c.ev.ok; } },
      { t: 'Put the unfinished work on the shelf: <code>git stash</code>. Your files jump back to the last commit.', hint: 'git stash', check: function (c) { return c.r.stash.length > 0; } },
      { t: 'Now switching works: <code>git switch hotfix</code>', hint: 'git switch hotfix', check: function (c) { return c.r.head === 'hotfix'; } },
      { t: 'Make the urgent fix: edit index.html, then <code>git add .</code> and <code>git commit -m "Urgent fix"</code>', hint: addOrCommit('Urgent fix'),
        check: function (c) { return c.r.countBetween(c.r.branches.main, c.r.branches.hotfix) >= 2; } },
      { t: 'Back to main: <code>git switch main</code>', hint: 'git switch main', check: function (c) { return c.r.head === 'main'; } },
      { t: 'Take your work back off the shelf: <code>git stash pop</code>', hint: 'git stash pop',
        check: function (c) { return !c.r.stash.length && (c.r.work['style.css'] || '').indexOf('half-finished') >= 0; } },
      { t: 'Confirm the shelf is empty: <code>git stash list</code> prints nothing.', hint: 'git stash list', ev: 1, check: ran('stash') }
    ],
    win: 'Stash is the "hold that thought" button. Use it for short interruptions; for anything longer, commit on a branch instead.'
  };

  M.sandbox = {
    title: 'Sandbox: anything goes',
    intro: 'Branches, a GitHub remote, and no instructions. Try <code>git rebase main</code> on feature, <code>git tag v1.0</code>, <code>git reflog</code>, <code>git reset --hard HEAD~1</code>, <code>git switch --detach HEAD~2</code>... Start over any time.',
    showServers: [URL],
    setup: function (r) {
      r.addServer(URL);
      var b = r.seed('main', [['Add homepage', { 'index.html': INDEX }], ['Add stylesheet', { 'style.css': STYLE }], ['Add about page', { 'about.html': ABOUT }]]);
      r.remotes.origin = URL;
      r.publish('origin', 'main');
      r.seed('feature', [['Add contact page', { 'contact.html': '<h1>Contact</h1>' }], ['Link the contact page', { 'index.html': INDEX + '\n<a href="contact.html">Contact</a>' }]], b);
      r.seed('main', [['Tweak colors', { 'style.css': STYLE.replace('white', 'ivory') }]]);
      r.checkoutClean('main');
    },
    steps: []
  };
})();

/* The pull request walkthrough: a simplified mock of the GitHub pull request pages. */
(function (LG) {
  'use strict';
  const esc = LG.esc;

  const STEPS = [
    { k: 'Push', t: 'You push your branch',
      h: '<p>You made a branch called <code>add-tacos</code>, committed a recipe, and pushed it. GitHub noticed a new branch and shows a yellow banner on the repository page.</p><p><b>Click "Compare &amp; pull request"</b> in the mock browser (or press Next).</p>',
      term: ['$ git switch -c add-tacos', '$ git add tacos.txt', '$ git commit -m "Add taco recipe"', '$ git push -u origin add-tacos'] },
    { k: 'Describe', t: 'Fill in the pull request',
      h: '<p><b>base</b> is the branch you want to merge <em>into</em> (main). <b>compare</b> is your branch. GitHub already checked that they can merge without conflicts.</p><p>Give it a clear <b>title</b> and explain <em>why</em> in the description. Writing <code>Closes #4</code> links issue #4 and closes it automatically when this is merged.</p><p>Edit the text if you like, then <b>click "Create pull request"</b>.</p>' },
    { k: 'Checks', t: 'The pull request page',
      h: '<p>This page is where the discussion happens. The tabs show the conversation, the commits, automated checks and every changed line (<b>Files changed</b>). Click around.</p><p>At the bottom, <b>checks</b> are running: robots (GitHub Actions) testing your change. The Merge button stays locked until a reviewer approves, because this repository protects main.</p>' },
    { k: 'Review', t: 'A teammate reviews it',
      h: '<p>Sam opened <b>Files changed</b> and left a comment on a specific line, with a suggested fix. Their verdict is <b>Request changes</b>.</p><p>Reviews have three flavors: <b>Comment</b> (just thoughts), <b>Approve</b> (ship it) and <b>Request changes</b> (not yet). A good review is specific and kind, and it is about the code, never the person.</p>' },
    { k: 'Fix', t: 'You push a fix to the same branch',
      h: '<p>No need to open a new pull request. Fix the file on your computer, commit, and push to the same branch. The pull request updates itself with the new commit.</p><p>Sam looks again and <b>approves</b>. Checks are green, there are no conflicts: the Merge button unlocks.</p>',
      term: ['$ nano tacos.txt', '$ git commit -am "Fix tortilla typo and add servings"', '$ git push'] },
    { k: 'Merge', t: 'Choose how to merge',
      h: '<p>GitHub offers three ways to land the branch. Pick one to see what it does to main\'s history, then <b>click "Confirm merge"</b>.</p><p>Not sure? Many teams use <b>Squash and merge</b>: one tidy commit per pull request.</p>' },
    { k: 'Clean up', t: 'Merged',
      h: '<p>Done: your change is in main on GitHub, and issue #4 closed itself.</p><p>The branch has served its purpose. <b>Delete it</b> with the button. This is safe: its commits are already part of main (and GitHub can restore it).</p>' },
    { k: 'Sync', t: 'Back on your computer',
      h: '<p>Your laptop still has the old main. Catch up and remove your local copy of the branch. Then start the next change from a fresh branch.</p><p>That is the whole loop: <b>branch, commit, push, pull request, review, merge, pull</b>. You will do it hundreds of times.</p>',
      term: ['$ git switch main', '$ git pull', '$ git branch -d add-tacos'] }
  ];

  const METHODS = {
    merge: ['Create a merge commit', 'All commits from this branch are added to main with a merge commit. Full detail, busier history.'],
    squash: ['Squash and merge', 'The 2 commits are combined into one new commit on main. Clean history, one commit per pull request.'],
    rebase: ['Rebase and merge', 'The 2 commits are replayed onto main one by one. Straight line, no merge commit.']
  };

  LG.widget('pr', (host) => {
    const s = { step: 0, visited: 0, title: 'Add taco recipe', body: '## What does this change?\nAdds a taco recipe to the book.\n\n## How to test\nCook it, eat it, report back.\n\nCloses #4', checks: 'running', tab: 'conversation', method: 'squash', deleted: false, timer: null };
    host.classList.add('pr');
    host.innerHTML =
      '<ol class="pr-progress"></ol>' +
      '<div class="pr-grid"><div class="pr-explain"></div>' +
      '<div class="pb"><div class="pb-bar"><span class="pb-lock"></span><span class="pb-url"></span></div><div class="pb-page"></div></div></div>';
    const prog = host.querySelector('.pr-progress');
    const explain = host.querySelector('.pr-explain');
    const url = host.querySelector('.pb-url');
    const page = host.querySelector('.pb-page');

    const repoHead = (tab) =>
      '<div class="gh-repohead"><span class="gh-book"></span><span>you</span><span class="gh-slash">/</span><b>recipes</b><span class="gh-pill">Public</span></div>' +
      `<nav class="gh-tabs">${['Code', 'Issues', 'Pull requests', 'Actions', 'Settings'].map((t) => `<span class="${t === tab ? 'on' : ''}">${t}${t === 'Issues' ? ' <i>1</i>' : t === 'Pull requests' && s.step >= 2 && s.step < 6 ? ' <i>1</i>' : ''}</span>`).join('')}</nav>`;

    const avatar = (who) => `<span class="gh-av av-${who}">${who[0].toUpperCase()}</span>`;
    const diffLines = (fixed) => (fixed
      ? [['+', 'Tacos (serves 4)'], ['+', '- 8 small tortillas'], ['+', '- 1 can of black beans'], ['+', '- salsa (see salsa.txt)']]
      : [['+', 'Tacos'], ['+', '- 8 small tortila'], ['+', '- 1 can of black beans'], ['+', '- salsa (see salsa.txt)']]);

    function prHeader() {
      const merged = s.step >= 6;
      return `<div class="gh-prhead"><h4>${esc(s.title || 'Untitled')} <span class="gh-num">#1</span></h4>` +
        `<div class="gh-prmeta"><span class="gh-state ${merged ? 'merged' : 'open'}">${merged ? 'Merged' : 'Open'}</span>` +
        `<span><b>you</b> ${merged ? 'merged' : 'wants to merge'} ${s.step >= 4 ? 2 : 1} commit${s.step >= 4 ? 's' : ''} into <code>main</code> from <code>add-tacos</code></span></div></div>` +
        `<nav class="gh-prtabs">${[['conversation', 'Conversation'], ['commits', `Commits <i>${s.step >= 4 ? 2 : 1}</i>`], ['checks', 'Checks'], ['files', 'Files changed <i>1</i>']].map(([k, l]) => `<button type="button" data-act="tab" data-tab="${k}" class="${s.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
    }

    function conversation() {
      let t = `<div class="gh-comment">${avatar('you')}<div class="gh-cbody"><div class="gh-chead"><b>you</b> commented</div><div class="gh-md">${esc(s.body).replace(/^## (.*)$/gm, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div></div></div>`;
      t += '<div class="gh-event"><span class="gh-evdot"></span><b>you</b> added a commit <code>Add taco recipe</code> <span class="gh-sha">7a70f28</span></div>';
      t += '<div class="gh-event"><span class="gh-evdot"></span><b>you</b> requested a review from <b>sam</b></div>';
      if (s.step >= 3) t += `<div class="gh-event ${s.step >= 4 ? '' : 'bad'}"><span class="gh-evdot"></span><b>sam</b> requested changes <span class="gh-muted">(1 comment on tacos.txt)</span></div>`;
      if (s.step >= 4) {
        t += '<div class="gh-event"><span class="gh-evdot"></span><b>you</b> added a commit <code>Fix tortilla typo and add servings</code> <span class="gh-sha">c3d91e0</span></div>';
        t += `<div class="gh-comment">${avatar('sam')}<div class="gh-cbody"><div class="gh-chead"><b>sam</b> approved these changes</div><div class="gh-md">Looks great now. Thanks for adding the servings!</div></div></div>`;
      }
      if (s.step >= 6) t += `<div class="gh-event merged"><span class="gh-evdot"></span><b>you</b> merged this pull request (${esc(METHODS[s.method][0].toLowerCase())})</div>`;
      if (s.step >= 6 && s.deleted) t += '<div class="gh-event"><span class="gh-evdot"></span><b>you</b> deleted the <code>add-tacos</code> branch <button type="button" class="gh-link" data-act="restore">Restore branch</button></div>';
      return t + mergeBox();
    }

    function mergeBox() {
      if (s.step >= 6) {
        return `<div class="gh-mergebox merged"><div class="gh-mrow"><span class="gh-ico m"></span><div><b>Pull request successfully merged and closed</b><p>You are all set. The <code>add-tacos</code> branch can be safely deleted.</p></div>` +
          (s.deleted ? '<span class="gh-muted">Branch deleted</span>' : '<button type="button" class="gh-btn pulse" data-act="delete">Delete branch</button>') + '</div></div>';
      }
      const approved = s.step >= 4;
      const checks = s.step >= 3 || s.checks === 'passed'
        ? '<div class="gh-mrow ok"><span class="gh-ico ok"></span><div><b>All checks have passed</b><p>1 successful check: build / test</p></div></div>'
        : '<div class="gh-mrow run"><span class="gh-ico run"></span><div><b>Some checks haven\'t completed yet</b><p>build / test: in progress...</p></div></div>';
      const review = approved
        ? '<div class="gh-mrow ok"><span class="gh-ico ok"></span><div><b>Changes approved</b><p>1 approving review by sam</p></div></div>'
        : s.step >= 3
          ? '<div class="gh-mrow bad"><span class="gh-ico bad"></span><div><b>Changes requested</b><p>sam requested changes</p></div></div>'
          : '<div class="gh-mrow bad"><span class="gh-ico bad"></span><div><b>Review required</b><p>At least 1 approving review is required by reviewers with write access.</p></div></div>';
      const conflicts = '<div class="gh-mrow ok"><span class="gh-ico ok"></span><div><b>This branch has no conflicts with the base branch</b><p>Merging can be performed automatically.</p></div></div>';
      let btn = '<div class="gh-mfoot"><button type="button" class="gh-btn" disabled>Merge pull request</button><span class="gh-muted">Merging is blocked</span></div>';
      if (approved && s.step === 4) btn = '<div class="gh-mfoot"><button type="button" class="gh-btn pulse" data-act="next">Merge pull request</button></div>';
      if (s.step === 5) {
        btn = '<div class="gh-methods">' + Object.entries(METHODS).map(([k, [l, d]]) => `<label class="gh-method${s.method === k ? ' on' : ''}"><input type="radio" name="m" value="${k}" data-act="method"${s.method === k ? ' checked' : ''}><b>${l}</b><span>${d}</span></label>`).join('') +
          `</div><div class="gh-preview"><p class="gh-muted">main on GitHub after "${esc(METHODS[s.method][0])}":</p><div class="graph-scroll">${previewGraph()}</div></div>` +
          '<div class="gh-mfoot"><button type="button" class="gh-btn pulse" data-act="confirm">Confirm merge</button></div>';
      }
      return `<div class="gh-mergebox">${review}${checks}${conflicts}${btn}</div>`;
    }

    function previewGraph() {
      const d = LG.demos['pr-' + s.method];
      const w = new LG.World();
      d.setup(w);
      w.exec(d.steps[0].cmd);
      return LG.renderGraph(w.hostedRepo('you/recipes'));
    }

    function files() {
      const fixed = s.step >= 4;
      let t = `<div class="gh-file"><div class="gh-fhead"><code>tacos.txt</code><span class="gh-add">+4</span></div><table class="gh-diff">`;
      diffLines(fixed).forEach(([sign, l], i) => {
        t += `<tr class="add"><td class="n">${i + 1}</td><td class="s">${sign}</td><td>${esc(l)}</td></tr>`;
        if (i === 1 && s.step >= 3) {
          t += `<tr class="gh-review"><td colspan="3"><div class="gh-comment in">${avatar('sam')}<div class="gh-cbody"><div class="gh-chead"><b>sam</b> ${fixed ? '<span class="gh-muted">(outdated) </span>' : ''}commented on line 2</div>` +
            '<div class="gh-md">Typo: tortila should be tortilla. Also, how many people does this feed?</div>' +
            '<div class="gh-suggest"><div class="gh-muted">Suggested change</div><div class="del">- 8 small tortila</div><div class="add">- 8 small tortillas</div></div>' +
            `${fixed ? '<div class="gh-resolved">Resolved</div>' : ''}</div></div></td></tr>`;
        }
      });
      return t + '</table></div>';
    }

    function commitsTab() {
      const list = [['Add taco recipe', '7a70f28']];
      if (s.step >= 4) list.push(['Fix tortilla typo and add servings', 'c3d91e0']);
      return '<ul class="gh-commits">' + list.map(([m, h]) => `<li><span class="gh-evdot"></span><b>${m}</b><span class="gh-sha">${h}</span></li>`).join('') + '</ul>';
    }

    function checksTab() {
      const done = s.step >= 3 || s.checks === 'passed';
      return `<div class="gh-checks"><div class="gh-mrow ${done ? 'ok' : 'run'}"><span class="gh-ico ${done ? 'ok' : 'run'}"></span><div><b>build / test</b><p>${done ? 'Successful in 41s. 12 tests passed.' : 'Running: installing dependencies, running tests...'}</p></div></div>` +
        '<p class="gh-muted">Checks come from GitHub Actions: a file in <code>.github/workflows/</code> tells GitHub what to run on every push.</p></div>';
    }

    function pageHTML() {
      const step = s.step;
      if (step === 0) {
        url.textContent = 'github.com/you/recipes';
        return repoHead('Code') +
          '<div class="gh-banner"><span><b>add-tacos</b> had recent pushes less than a minute ago</span><button type="button" class="gh-btn pulse" data-act="next">Compare &amp; pull request</button></div>' +
          fileList(false);
      }
      if (step === 1) {
        url.textContent = 'github.com/you/recipes/compare/main...add-tacos';
        return repoHead('Pull requests') +
          '<h4 class="gh-h">Open a pull request</h4>' +
          '<div class="gh-compare"><span class="gh-branch">base: <b>main</b></span><span class="gh-arrow">&larr;</span><span class="gh-branch">compare: <b>add-tacos</b></span><span class="gh-able">Able to merge. These branches can be automatically merged.</span></div>' +
          `<label class="gh-label">Title<input type="text" class="gh-input" data-field="title" value="${esc(s.title)}"></label>` +
          `<label class="gh-label">Description<textarea class="gh-input" data-field="body" rows="7">${esc(s.body)}</textarea></label>` +
          '<div class="gh-mfoot"><button type="button" class="gh-btn pulse" data-act="create">Create pull request</button><span class="gh-muted">1 commit, 1 file changed</span></div>';
      }
      if (step === 7) {
        url.textContent = 'github.com/you/recipes';
        return repoHead('Code') + fileList(true);
      }
      url.textContent = 'github.com/you/recipes/pull/1' + (s.tab === 'files' ? '/files' : s.tab === 'commits' ? '/commits' : s.tab === 'checks' ? '/checks' : '');
      const body = s.tab === 'files' ? files() : s.tab === 'commits' ? commitsTab() : s.tab === 'checks' ? checksTab() : conversation();
      return repoHead('Pull requests') + prHeader() + `<div class="gh-tabbody">${body}</div>`;
    }

    function fileList(after) {
      const latest = after
        ? (s.method === 'squash' ? `${s.title} (#1)` : s.method === 'merge' ? 'Merge pull request #1 from you/add-tacos' : 'Fix tortilla typo and add servings')
        : 'Add salsa recipe';
      const rows = [['README.md', 'Start the recipe book'], ['pancakes.txt', 'Add pancake recipe'], ['salsa.txt', 'Add salsa recipe']];
      if (after) rows.push(['tacos.txt', latest]);
      return `<div class="gh-files"><div class="gh-fbar"><span class="gh-branch"><b>main</b></span><span class="gh-muted">${after ? '6' : '3'} commits</span></div>` +
        `<div class="gh-latest">${avatar('you')}<b>you</b> ${esc(latest)}</div>` +
        rows.map(([f, m]) => `<div class="gh-frow"><span class="gh-fico"></span><span>${f}</span><span class="gh-muted">${esc(m)}</span></div>`).join('') + '</div>';
    }

    function render() {
      clearTimeout(s.timer);
      prog.innerHTML = STEPS.map((st, i) => `<li class="${i === s.step ? 'is-on' : i < s.step ? 'is-done' : ''}"><button type="button" data-act="goto" data-step="${i}"${i > s.visited ? ' disabled' : ''}><span class="pp-dot"></span><span class="pp-label">${st.k}</span></button></li>`).join('');
      const st = STEPS[s.step];
      explain.innerHTML = `<p class="pr-kicker">Step ${s.step + 1} of ${STEPS.length}</p><h4>${st.t}</h4>${st.h}`;
      if (st.term) explain.append(LG.termBlock(st.term, 'On your computer'));
      explain.insertAdjacentHTML('beforeend', `<div class="pr-nav"><button type="button" class="btn small ghost" data-act="back"${s.step ? '' : ' disabled'}>Back</button>` +
        `<button type="button" class="btn small primary" data-act="next"${s.step === STEPS.length - 1 ? ' disabled' : ''}>${s.step === STEPS.length - 1 ? 'Finished' : 'Next'}</button></div>`);
      page.innerHTML = pageHTML();
      if (s.step === 2 && s.checks === 'running') {
        s.timer = setTimeout(() => { s.checks = 'passed'; if (s.step === 2) render(); }, 2200);
      }
    }

    function go(n) {
      s.step = Math.max(0, Math.min(STEPS.length - 1, n));
      s.visited = Math.max(s.visited, s.step);
      s.tab = s.step === 3 ? 'files' : 'conversation';
      if (s.step < 2) s.checks = 'running';
      if (s.step < 6) s.deleted = false;
      render();
      if (s.step === STEPS.length - 1 && LG.progress) LG.progress.mission('pr-walkthrough');
    }

    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const a = b.dataset.act;
      if (a === 'next' || a === 'create' || a === 'confirm') go(s.step + 1);
      if (a === 'back') go(s.step - 1);
      if (a === 'goto') go(+b.dataset.step);
      if (a === 'tab') { s.tab = b.dataset.tab; render(); }
      if (a === 'delete') { s.deleted = true; render(); }
      if (a === 'restore') { s.deleted = false; render(); }
    });
    host.addEventListener('change', (e) => {
      if (e.target.dataset.act === 'method') { s.method = e.target.value; render(); }
    });
    host.addEventListener('input', (e) => {
      const f = e.target.dataset.field;
      if (f) s[f] = e.target.value;
    });
    render();
  });
})(window.LG = window.LG || {});

/* Practice-terminal scenarios (with missions) and step-through demos. */
(function (LG) {
  'use strict';

  // ---------- helpers ----------
  const repo = (w) => w.findRepo();
  const st = (w) => { const r = repo(w); return r ? r.status() : { staged: [], unstaged: [], untracked: [], unmerged: [], ignored: [] }; };
  const headMsg = (w) => { const r = repo(w); const c = r && r.headCommit(); return c ? c.message : ''; };
  const count = (w) => { const r = repo(w); return r && r.headHash() ? r.ancestors(r.headHash()).size : 0; };
  const onBranch = (w, name) => { const r = repo(w); return !!r && r.head.type === 'branch' && (name ? r.head.name === name : true); };
  const wdFile = (w, p) => { const r = repo(w); return r ? r.wd().get(p) : undefined; };
  const headFile = (w, p) => { const r = repo(w); return r ? r.headTree().get(p) : undefined; };
  const MARKERS = /^(<{7}|={7}$|>{7})/m;

  const RECIPES = [
    ['README.md', '# Recipe book\nFamily recipes, tracked with git.\n', 'Start the recipe book'],
    ['pancakes.txt', 'Pancakes\n- 2 cups flour\n- 2 eggs\n- 1 cup milk\n', 'Add pancake recipe'],
    ['salsa.txt', 'Salsa\n- 4 tomatoes\n- 1 onion\n- 1 jalapeno\n', 'Add salsa recipe'],
    ['pancakes.txt', 'Pancakes\n- 2 cups flour\n- 2 eggs\n- 1 cup milk\n- 1 pinch of salt\n', 'Add salt to pancakes'],
    ['guacamole.txt', 'Guacamole\n- 3 avocados\n- 1 lime\n- salt\n', 'Add guacamole recipe']
  ];
  function recipes(w, dir, n) {
    w.sh(`mkdir -p ${dir}`, `cd ${dir}`, 'git init');
    RECIPES.slice(0, n).forEach(([f, c, m]) => commit(w, f, c, m));
    return w;
  }
  function commit(w, file, content, msg) {
    w.put(file, content);
    w.sh(`git add ${file}`, `git commit -m "${msg}"`);
  }
  function published(w, slug, dir, n) {
    w.host(slug);
    recipes(w, dir, n);
    w.sh(`git remote add origin https://github.com/${slug}.git`, 'git push -u origin main');
    return w;
  }

  LG.scenarios = {
    // ------------------------------------------------------------------
    shell: {
      title: 'Practice terminal: moving around',
      panels: ['files'],
      intro: "You're in your home folder (that's what ~ means). Follow the mission above, or type help.",
      setup(w) {
        w.put('Documents/essay.txt', 'My essay about owls.\nOwls can turn their heads 270 degrees.\n');
        w.put('Documents/notes.txt', 'Shopping: eggs, flour, milk\nCall grandma on Sunday\n');
        w.put('Pictures/cat.png', '(pretend this is a photo of a cat)\n');
        w.mkdirp('/home/you/Desktop');
        w.mkdirp('/home/you/projects');
        w.put('todo.txt', '1. Learn the terminal\n2. Learn git\n');
      },
      chips: ['pwd', 'ls', 'cd Documents', 'cat notes.txt', 'cd ..', 'mkdir projects/recipes', 'cd projects/recipes', 'tree ~'],
      missions: [
        { text: 'Ask the terminal where you are: type <code>pwd</code> and press <kbd>Enter</kbd>.', hint: 'pwd means "print working directory". Just those three letters.', check: (w, c) => c.ran(/^pwd$/) },
        { text: 'List what is in this folder: <code>ls</code>', hint: 'That is a lowercase L, not the number one.', check: (w, c) => c.ran(/^ll?(\s|$)|^ls(\s|$)/) },
        { text: 'Move into the Documents folder: <code>cd Documents</code>', hint: 'Capital D. Names are case-sensitive on macOS and Linux.', check: (w) => w.cwd === '/home/you/Documents' },
        { text: 'Read what is inside the notes: <code>cat notes.txt</code>', hint: 'Tip: type <code>cat no</code> and press <kbd>Tab</kbd> to auto-complete.', check: (w, c) => c.ran(/^cat\s+\S*notes\.txt$/) },
        { text: 'Go back up one level: <code>cd ..</code> (two dots mean "the folder above this one").', check: (w) => w.cwd === w.home },
        { text: 'Make a folder for your first project: <code>mkdir projects/recipes</code>', hint: 'This creates recipes inside the existing projects folder.', check: (w) => w.isDir('/home/you/projects/recipes') },
        { text: 'Jump straight into it with <code>cd projects/recipes</code>, then confirm with <code>pwd</code>.', check: (w, c) => w.cwd === '/home/you/projects/recipes' && c.ran(/^pwd$/) }
      ],
      done: 'You just moved around a computer without touching the mouse.'
    },

    // ------------------------------------------------------------------
    setup: {
      title: 'Practice terminal: a fresh install',
      world: { identity: false, defaults: false },
      intro: "Git was just installed on this pretend computer and it knows nothing about you yet.",
      chips: ['git --version', 'git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"', 'git config --global init.defaultBranch main', 'git config --global pull.rebase false', 'git config --list'],
      missions: [
        { text: 'Check git is installed: <code>git --version</code>', check: (w, c) => c.ran(/^git (--version|version|-v)$/) },
        { text: 'Tell git your name: <code>git config --global user.name "Your Name"</code>', hint: 'Keep the quotes. Without them, a name with a space gets cut off at the space.', check: (w) => !!w.cfg('user.name') && w.cfg('user.name').length > 1 },
        { text: 'Tell git your email: <code>git config --global user.email "you@example.com"</code>', hint: 'Use the same email as your GitHub account (or GitHub\'s private noreply address).', check: (w) => /@/.test(w.cfg('user.email') || '') },
        { text: 'Name the first branch of new projects "main": <code>git config --global init.defaultBranch main</code>', check: (w) => w.cfg('init.defaultBranch') === 'main' },
        { text: 'Choose the beginner-friendly pull behavior: <code>git config --global pull.rebase false</code>', check: (w) => w.cfg('pull.rebase') === 'false' },
        { text: 'Review everything you set: <code>git config --list</code>', check: (w, c) => c.ran(/^git config (--global )?(--list|-l)$/) }
      ],
      done: 'Git is configured. You only ever do this once per computer.'
    },

    // ------------------------------------------------------------------
    'first-repo': {
      title: 'Practice terminal: your first repository',
      panels: ['areas', 'graph'],
      intro: "You're in ~/projects, an empty folder. Time to make a recipe book that git keeps track of.",
      setup(w) { w.mkdirp('/home/you/projects'); w.cwd = '/home/you/projects'; },
      chips: ['mkdir recipes', 'cd recipes', 'git init', 'echo "Pancakes: flour, eggs, milk" > pancakes.txt', 'git status', 'git add pancakes.txt', 'git commit -m "Add pancake recipe"', 'git log', 'echo "Add a pinch of salt" >> pancakes.txt', 'git commit -m "Add salt to pancakes"'],
      missions: [
        { text: 'Make a folder called <code>recipes</code> and step into it: <code>mkdir recipes</code>, then <code>cd recipes</code>', check: (w) => /\/recipes$/.test(w.cwd) },
        { text: 'Turn this folder into a repository: <code>git init</code>', check: (w) => !!repo(w) },
        { text: 'Write your first recipe into a file: <code>echo "Pancakes: flour, eggs, milk" &gt; pancakes.txt</code>', hint: 'The <code>&gt;</code> sends the text into a file instead of printing it.', check: (w) => !!repo(w) && repo(w).wd().size > 0 },
        { text: 'Ask git what it sees: <code>git status</code>. Your file is listed as <em>untracked</em>.', check: (w, c) => c.ran(/^git status/) },
        { text: 'Stage it (put it in the next snapshot): <code>git add pancakes.txt</code>', check: (w) => st(w).staged.length > 0 || count(w) > 0 },
        { text: 'Take the snapshot: <code>git commit -m "Add pancake recipe"</code>', hint: 'The text after -m is the commit message. Keep the quotes.', check: (w) => count(w) >= 1 },
        { text: 'Read your history: <code>git log</code>', check: (w, c) => c.ran(/^git log/) },
        { text: 'Edit the recipe, <code>echo "Add a pinch of salt" &gt;&gt; pancakes.txt</code>, then run <code>git status</code> again.', hint: '<code>&gt;&gt;</code> adds a line to the end of the file. A single <code>&gt;</code> would replace the whole file.', check: (w, c) => st(w).unstaged.length > 0 && c.ran(/^git status/) },
        { text: 'Stage and commit that change: <code>git add pancakes.txt</code>, then <code>git commit -m "Add salt to pancakes"</code>', check: (w) => count(w) >= 2 && !st(w).unstaged.length }
      ],
      done: 'That loop (change, add, commit) is most of what you will ever do with git.'
    },

    // ------------------------------------------------------------------
    areas: {
      title: 'Practice terminal: the three areas',
      panels: ['areas', 'graph'],
      intro: 'Two things changed in this website: style.css was edited and about.html is brand new. You will commit them separately.',
      setup(w) {
        w.sh('mkdir site', 'cd site', 'git init');
        w.put('index.html', '<h1>My site</h1>\n');
        w.put('style.css', 'body { color: black; }\n');
        w.sh('git add .', 'git commit -m "First version of the site"');
        w.put('style.css', 'body { color: tomato; }\n');
        w.put('about.html', '<h1>About me</h1>\n');
      },
      chips: ['git status', 'git add about.html', 'git commit -m "Add about page"', 'git add style.css', 'git restore --staged style.css', 'git restore style.css', 'git diff'],
      missions: [
        { text: 'See what changed: <code>git status</code>', check: (w, c) => c.ran(/^git status/) },
        { text: 'Stage only the new page: <code>git add about.html</code>', check: (w) => st(w).staged.some((x) => x.p === 'about.html') || headFile(w, 'about.html') !== undefined },
        { text: 'Commit just that one: <code>git commit -m "Add about page"</code>', hint: 'If style.css sneaked in too, that is fine for now, but watch the Staging area panel next time.', check: (w) => headFile(w, 'about.html') !== undefined },
        { text: 'Stage the CSS change: <code>git add style.css</code>', check: (w) => st(w).staged.some((x) => x.p === 'style.css') || headFile(w, 'style.css') === 'body { color: tomato; }\n' },
        { text: 'Changed your mind? Unstage it (your edit stays on disk): <code>git restore --staged style.css</code>', check: (w) => !st(w).staged.length && wdFile(w, 'style.css') !== headFile(w, 'style.css') },
        { text: 'You hate tomato red after all. Throw the edit away: <code>git restore style.css</code>', check: (w) => wdFile(w, 'style.css') === headFile(w, 'style.css') },
        { text: 'Confirm everything is clean: <code>git status</code>', check: (w, c) => c.ran(/^git status/) && !st(w).staged.length && !st(w).unstaged.length }
      ],
      done: 'You controlled exactly what went into a commit, and undid an edit on purpose.'
    },

    // ------------------------------------------------------------------
    history: {
      title: 'Practice terminal: reading history',
      panels: ['graph'],
      intro: 'This recipe book already has five commits. Time to read them.',
      setup(w) {
        recipes(w, 'recipes', 3);
        w.as('Sam', 'sam@example.com', () => commit(w, RECIPES[3][0], RECIPES[3][1], RECIPES[3][2]));
        commit(w, RECIPES[4][0], RECIPES[4][1], RECIPES[4][2]);
      },
      chips: ['git log', 'git log --oneline', 'git show HEAD~2', 'echo "Serve with lime" >> salsa.txt', 'git diff', 'git add salsa.txt', 'git diff --staged', 'git switch --detach HEAD~2', 'git switch main'],
      missions: [
        { text: 'Show the full history: <code>git log</code>', check: (w, c) => c.ran(/^git log/) },
        { text: 'Now the compact version: <code>git log --oneline</code>', check: (w, c) => c.ran(/^git log.*--oneline/) },
        { text: 'Open one commit. Copy the 7-character code next to "Add salsa recipe" and run <code>git show &lt;code&gt;</code>', hint: 'For example <code>git show 1a2b3c4</code>. <code>git show HEAD~2</code> works too.', check: (w, c) => c.ran(/^git show \S+/) },
        { text: 'Change a file with <code>echo "Serve with lime" &gt;&gt; salsa.txt</code>, then see exactly what changed: <code>git diff</code>', check: (w, c) => c.ran(/^git diff$/) && st(w).unstaged.length > 0 },
        { text: 'Stage it (<code>git add salsa.txt</code>). Plain <code>git diff</code> now shows nothing, so use <code>git diff --staged</code>', check: (w, c) => c.ran(/^git diff --(staged|cached)/) && st(w).staged.length > 0 },
        { text: 'Commit it: <code>git commit -m "Serve salsa with lime"</code>', check: (w) => /lime/i.test(headMsg(w)) },
        { text: 'Time travel two commits back: <code>git switch --detach HEAD~2</code>', check: (w) => !!repo(w) && repo(w).head.type === 'detached' },
        { text: 'Look around (<code>cat salsa.txt</code>), then return to the present: <code>git switch main</code>', check: (w) => onBranch(w, 'main') }
      ],
      done: 'You can read, compare and visit any moment of a project.'
    },

    // ------------------------------------------------------------------
    ignore: {
      title: 'Practice terminal: .gitignore',
      panels: ['areas'],
      intro: 'This app folder is full of things that should never be committed. One of them is a secret key.',
      setup(w) {
        w.sh('mkdir app', 'cd app', 'git init');
        commit(w, 'app.js', 'console.log("hello")\n', 'Start the app');
        w.put('.env', 'API_KEY=sk_live_do_not_share_this\n');
        w.put('node_modules/left-pad/index.js', 'module.exports = leftPad;\n');
        w.put('node_modules/react/index.js', '/* thousands of lines */\n');
        w.put('debug.log', 'error at line 12\n');
        w.put('README.md', '# My app\n');
      },
      chips: ['git status', 'echo "node_modules/" > .gitignore', 'echo ".env" >> .gitignore', 'echo "*.log" >> .gitignore', 'cat .gitignore', 'git add .', 'git commit -m "Add gitignore and readme"'],
      missions: [
        { text: 'Run <code>git status</code>. Notice <code>.env</code> in the list? It holds a secret key.', check: (w, c) => c.ran(/^git status/) },
        { text: 'Create a .gitignore that ignores the node_modules folder: <code>echo "node_modules/" &gt; .gitignore</code>', check: (w) => repo(w).isIgnored('node_modules/react/index.js') },
        { text: 'Also ignore the secret and every log file: <code>echo ".env" &gt;&gt; .gitignore</code> and <code>echo "*.log" &gt;&gt; .gitignore</code>', check: (w) => repo(w).isIgnored('.env') && repo(w).isIgnored('debug.log') },
        { text: 'Check again with <code>git status</code>. Only .gitignore and README.md should be left.', check: (w, c) => c.ran(/^git status/) && st(w).untracked.join(',') === '.gitignore,README.md' },
        { text: 'Commit them: <code>git add .</code>, then <code>git commit -m "Add gitignore and readme"</code>', check: (w) => headFile(w, '.gitignore') !== undefined && headFile(w, '.env') === undefined }
      ],
      done: 'Secrets and junk can no longer be committed by accident.'
    },

    // ------------------------------------------------------------------
    branches: {
      title: 'Practice terminal: branches',
      panels: ['graph'],
      intro: 'A recipe book with two commits on main. Time to try an idea on the side.',
      setup(w) { recipes(w, 'recipes', 2); },
      chips: ['git branch', 'git switch -c desserts', 'echo "Chocolate cake" > cake.txt', 'git add cake.txt', 'git commit -m "Add chocolate cake"', 'git switch main', 'ls', 'git switch desserts', 'echo "Salsa" > salsa.txt', 'git add salsa.txt', 'git commit -m "Add salsa"'],
      missions: [
        { text: 'List the branches: <code>git branch</code>. The <code>*</code> marks the one you are on.', check: (w, c) => c.ran(/^git branch$/) },
        { text: 'Create a branch for a new idea and hop onto it: <code>git switch -c desserts</code>', check: (w) => onBranch(w, 'desserts') },
        { text: 'Commit on this branch: <code>echo "Chocolate cake" &gt; cake.txt</code>, <code>git add cake.txt</code>, <code>git commit -m "Add chocolate cake"</code>', check: (w) => { const r = repo(w); return r.branches.has('desserts') && r.treeOf(r.branches.get('desserts')).has('cake.txt'); } },
        { text: 'Go back to main (<code>git switch main</code>), then run <code>ls</code>. Where did cake.txt go?', check: (w, c) => onBranch(w, 'main') && c.ran(/^ls/) },
        { text: 'It lives on the other branch. Check: <code>git switch desserts</code>, then <code>ls</code>', check: (w, c) => onBranch(w, 'desserts') && c.ran(/^ls/) },
        { text: 'Go back to main and commit something there too (for example <code>echo "Salsa" &gt; salsa.txt</code>, add, commit).', check: (w) => { const r = repo(w); return onBranch(w, 'main') && r.between(r.mergeBase(r.branches.get('main'), r.branches.get('desserts')), r.branches.get('main')).length > 0; } }
      ],
      done: 'See the graph: two lines leaving the same station. That is branching.'
    },

    // ------------------------------------------------------------------
    merging: {
      title: 'Practice terminal: merging',
      panels: ['graph'],
      intro: 'Someone finished a branch with two soup recipes. Main also moved on. Bring the soups into main.',
      setup(w) {
        recipes(w, 'recipes', 2);
        w.sh('git switch -c add-soups');
        commit(w, 'tomato-soup.txt', 'Tomato soup\n- 6 tomatoes\n- 1 onion\n', 'Add tomato soup');
        commit(w, 'miso-soup.txt', 'Miso soup\n- 2 tbsp miso\n- tofu\n', 'Add miso soup');
        w.sh('git switch main');
        commit(w, 'README.md', '# Recipe book\nFamily recipes, tracked with git. Dinner ideas welcome.\n', 'Update the readme');
        w.sh('git switch add-soups');
      },
      chips: ['git switch main', 'git merge add-soups', 'git log --oneline --graph', 'git branch -d add-soups'],
      missions: [
        { text: 'You are on <code>add-soups</code>. A merge brings changes INTO the branch you are on, so go to main first: <code>git switch main</code>', check: (w) => onBranch(w, 'main') },
        { text: 'Merge the soups in: <code>git merge add-soups</code>', check: (w) => { const r = repo(w); return !!r.branches.get('add-soups') ? r.isAncestor(r.branches.get('add-soups'), r.headHash()) : count(w) > 4; } },
        { text: 'Look at the result: <code>git log --oneline --graph</code>', check: (w, c) => c.ran(/^git log/) },
        { text: 'The branch did its job. Delete its label: <code>git branch -d add-soups</code>', check: (w) => !repo(w).branches.has('add-soups') }
      ],
      done: 'The soup commits are part of main now. Only the branch label is gone.'
    },

    // ------------------------------------------------------------------
    conflict: {
      title: 'Practice terminal: a merge conflict',
      panels: ['areas', 'graph'],
      intro: 'You made the salsa mild on main. Your friend made it hot on the "spicy" branch. Same line, two opinions.',
      setup(w) {
        recipes(w, 'recipes', 3);
        w.sh('git switch -c spicy');
        commit(w, 'salsa.txt', 'Salsa\n- 4 ripe tomatoes\n- 1 onion\n- 3 jalapenos (hot!)\n', 'Make the salsa hot');
        w.sh('git switch main');
        commit(w, 'salsa.txt', 'Salsa\n- 4 tomatoes\n- 1 onion\n- half a jalapeno (mild)\n', 'Make the salsa mild');
      },
      chips: ['git merge spicy', 'git status', 'cat salsa.txt', 'nano salsa.txt', 'git add salsa.txt', 'git commit', 'git merge --abort'],
      missions: [
        { text: 'You are on main. Merge the spicy branch: <code>git merge spicy</code>', check: (w) => !!repo(w).merging || repo(w).headCommit().parents.length > 1 },
        { text: 'Conflict! Nothing is broken. Ask git what is going on: <code>git status</code>', check: (w, c) => c.tried(/^git status/) },
        { text: 'Look at the file: <code>cat salsa.txt</code>. Find the <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code> and <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> lines.', hint: 'Notice line 2 says "4 ripe tomatoes" already. Git merged that part by itself because only one side changed it.', check: (w, c) => c.ran(/^cat\s+salsa\.txt/) },
        { text: 'Open it in the editor: <code>nano salsa.txt</code>. Keep the jalapeno line you want (or write a new one), delete the three marker lines, then save.', hint: 'The finished file should look like a normal recipe again: no &lt;&lt;&lt;, === or &gt;&gt;&gt; lines left.', check: (w) => { const t = wdFile(w, 'salsa.txt') || ''; return !MARKERS.test(t) && t.length > 0; } },
        { text: 'Tell git the file is fixed: <code>git add salsa.txt</code>', check: (w) => !repo(w).unmerged.size },
        { text: 'Finish the merge: <code>git commit</code> (an editor opens with a ready-made message, just save it)', check: (w) => !repo(w).merging && repo(w).headCommit().parents.length > 1 }
      ],
      done: 'You resolved a merge conflict. Plenty of people avoid those for years.'
    },

    // ------------------------------------------------------------------
    remote: {
      title: 'Practice terminal: pushing to GitHub',
      panels: ['graph', 'remote'],
      intro: 'You created an empty repository called "recipes" on GitHub. Its URL is https://github.com/you/recipes.git. Connect your project to it.',
      setup(w) { w.host('you/recipes'); recipes(w, 'recipes', 3); },
      chips: ['git remote add origin https://github.com/you/recipes.git', 'git remote -v', 'git push -u origin main', 'echo "Waffles" > waffles.txt', 'git add waffles.txt', 'git commit -m "Add waffles"', 'git push', 'sim teammate', 'git fetch', 'git status', 'git pull'],
      missions: [
        { text: 'Connect your project to GitHub: <code>git remote add origin https://github.com/you/recipes.git</code>', hint: '"origin" is just a nickname for that URL. Everyone uses origin by convention.', check: (w) => !!repo(w) && repo(w).remotes.has('origin') && !!w.hostedRepo(repo(w).remotes.get('origin')) },
        { text: 'Check it: <code>git remote -v</code>', check: (w, c) => c.ran(/^git remote -v/) },
        { text: 'Upload your commits: <code>git push -u origin main</code>', hint: '-u remembers origin/main as the default, so next time plain git push is enough.', check: (w) => { const h = w.hostedRepo('you/recipes'); return h.branches.get('main') === repo(w).branches.get('main'); } },
        { text: 'Make one more commit (<code>echo "Waffles" &gt; waffles.txt</code>, add, commit), then just <code>git push</code>', check: (w) => { const h = w.hostedRepo('you/recipes'); return count(w) >= 4 && h.branches.get('main') === repo(w).branches.get('main'); } },
        { text: 'A teammate pushes something to GitHub. Make it happen: <code>sim teammate</code>', check: (w) => w.teamCount > 0 },
        { text: 'Download their work without touching your files: <code>git fetch</code>. Then <code>git status</code>.', check: (w, c) => { const h = w.hostedRepo('you/recipes'); return repo(w).remoteRefs.get('origin/main') === h.branches.get('main') && c.ran(/^git status/); } },
        { text: 'Bring it into your branch: <code>git pull</code>', check: (w) => { const r = repo(w), h = w.hostedRepo('you/recipes'); return r.isAncestor(h.branches.get('main'), r.headHash()); } }
      ],
      done: 'Push, fetch and pull: the whole collaboration loop.'
    },

    // ------------------------------------------------------------------
    pr: {
      title: 'Practice terminal: a pull request from the command line',
      panels: ['graph', 'remote'],
      intro: 'Your recipe book is on GitHub (you/recipes). Propose a new recipe the way teams do it: branch, push, pull request, merge.',
      setup(w) { published(w, 'you/recipes', 'recipes', 3); },
      chips: ['git pull', 'git switch -c add-tacos', 'echo "Tacos: tortillas, beans, salsa" > tacos.txt', 'git add tacos.txt', 'git commit -m "Add taco recipe"', 'git push -u origin add-tacos', 'gh pr create --title "Add taco recipe" --body "Adds tacos to the book"', 'gh pr list', 'gh pr merge 1 --merge --delete-branch', 'git switch main', 'git branch -d add-tacos'],
      missions: [
        { text: 'Start from the latest main: <code>git pull</code>', check: (w, c) => c.ran(/^git pull/) },
        { text: 'Create a branch for your change: <code>git switch -c add-tacos</code>', check: (w) => onBranch(w) && repo(w).head.name !== 'main' },
        { text: 'Add the recipe and commit it: <code>echo "Tacos: tortillas, beans, salsa" &gt; tacos.txt</code>, <code>git add tacos.txt</code>, <code>git commit -m "Add taco recipe"</code>', check: (w) => { const r = repo(w); return r.head.name !== 'main' && r.between(r.branches.get('main'), r.headHash()).length > 0; } },
        { text: 'Push the branch: <code>git push -u origin add-tacos</code>. Read the output: GitHub suggests opening a pull request.', check: (w) => { const r = repo(w), h = w.hostedRepo('you/recipes'); return [...h.branches.keys()].some((b) => b !== 'main' && h.branches.get(b) === r.branches.get(b)); } },
        { text: 'Open the pull request: <code>gh pr create --title "Add taco recipe" --body "Adds tacos to the book"</code>', hint: 'On the website you would click "Compare &amp; pull request" instead. Same result.', check: (w) => w.prs.length > 0 },
        { text: 'Imagine your team reviewed and approved it. Merge it on GitHub: <code>gh pr merge 1 --merge --delete-branch</code>', check: (w) => w.prs.some((p) => p.state === 'merged') },
        { text: 'Your laptop does not know about the merge yet. <code>git switch main</code>, then <code>git pull</code>', check: (w) => { const r = repo(w), h = w.hostedRepo('you/recipes'); return onBranch(w, 'main') && r.headHash() === h.branches.get('main'); } },
        { text: 'Tidy up the finished branch: <code>git branch -d add-tacos</code>', check: (w) => repo(w).branches.size === 1 }
      ],
      done: 'That is the exact workflow used by most companies and open source projects.'
    },

    // ------------------------------------------------------------------
    fork: {
      title: 'Practice terminal: keeping a fork up to date',
      panels: ['graph', 'remote'],
      intro: 'You forked open-kitchen/cookbook to your account and cloned your fork. Since then, the original project got new recipes.',
      setup(w) {
        published(w, 'open-kitchen/cookbook', 'seed', 3);
        w.sh('cd ~', 'rm -rf seed');
        const orig = w.hostedRepo('open-kitchen/cookbook');
        const fork = w.host('you/cookbook');
        for (const [k, c] of orig.commits) fork.commits.set(k, c);
        fork.branches = new Map(orig.branches);
        w.sh('git clone https://github.com/you/cookbook.git', 'cd cookbook');
        w.teammatePush({ url: orig.url, put: { path: 'ramen.txt', content: 'Ramen\n- noodles\n- broth\n- egg\n' }, message: 'Add ramen', author: { name: 'Maintainer', email: 'maintainer@example.com' } });
        w.teammatePush({ url: orig.url, put: { path: 'curry.txt', content: 'Curry\n- potatoes\n- carrots\n- curry paste\n' }, message: 'Add curry', author: { name: 'Maintainer', email: 'maintainer@example.com' } });
      },
      chips: ['git remote -v', 'git remote add upstream https://github.com/open-kitchen/cookbook.git', 'git fetch upstream', 'git merge upstream/main', 'git push'],
      missions: [
        { text: 'See where your copy came from: <code>git remote -v</code>. Only origin (your fork) is there.', check: (w, c) => c.ran(/^git remote -v/) },
        { text: 'Add the original project as a second remote named upstream: <code>git remote add upstream https://github.com/open-kitchen/cookbook.git</code>', check: (w) => { const u = repo(w).remotes.get('upstream'); return !!u && w.canon(u) === 'https://github.com/open-kitchen/cookbook.git'; } },
        { text: 'Download what is new in the original: <code>git fetch upstream</code>', check: (w) => repo(w).remoteRefs.get('upstream/main') === w.hostedRepo('open-kitchen/cookbook').branches.get('main') },
        { text: 'Merge it into your main: <code>git merge upstream/main</code>', check: (w) => repo(w).isAncestor(w.hostedRepo('open-kitchen/cookbook').branches.get('main'), repo(w).headHash()) },
        { text: 'Update your fork on GitHub too: <code>git push</code>', check: (w) => w.hostedRepo('you/cookbook').branches.get('main') === repo(w).headHash() }
      ],
      done: 'Your fork matches the original again. The "Sync fork" button on GitHub does the same thing in one click.'
    },

    // ------------------------------------------------------------------
    undo: {
      title: 'Practice terminal: undoing things',
      panels: ['areas', 'graph'],
      intro: 'This repository has a few problems to fix. Take them one at a time.',
      setup(w) {
        recipes(w, 'recipes', 2);
        commit(w, 'pizza.txt', 'Pizza\n- dough\n- tomato sauce\n- pineapple\n', 'Add pineapple pizza');
        commit(w, 'cake.txt', 'Chocolate cake\n- 200g dark chocolate\n- 4 eggs\n', 'Add chocolat cake');
        w.put('pancakes.txt', 'asdfghjkl;;;;;;\nzzzzzzzzzzzzzzzzzz\n');
      },
      chips: ['git log --oneline', 'git commit --amend -m "Add chocolate cake"', 'cat pancakes.txt', 'git restore pancakes.txt', 'git revert HEAD~1', 'git reset --hard HEAD~1', 'git reflog', 'git reset --hard HEAD@{1}'],
      missions: [
        { text: 'The last commit message says "chocolat". Fix it: <code>git commit --amend -m "Add chocolate cake"</code>', check: (w) => /chocolate cake/i.test(headMsg(w)) },
        { text: 'Your cat walked across the keyboard (see <code>cat pancakes.txt</code>). Get the real recipe back: <code>git restore pancakes.txt</code>', check: (w) => wdFile(w, 'pancakes.txt') === headFile(w, 'pancakes.txt') },
        { text: 'Pineapple pizza was a mistake, and your team already has it. Undo it safely with <code>git revert</code> plus its hash (find it with <code>git log --oneline</code>).', hint: 'It is the commit just before the cake, so <code>git revert HEAD~1</code> also works.', check: (w) => /^Revert "Add pineapple pizza"/.test(headMsg(w)) },
        { text: 'Now the dangerous one. Erase that revert commit completely: <code>git reset --hard HEAD~1</code>', check: (w) => /chocolate cake/i.test(headMsg(w)) && /^reset/.test(repo(w).reflog[repo(w).reflog.length - 1].msg) },
        { text: 'Oh no, you wanted it! Look at git\'s safety net: <code>git reflog</code>', check: (w, c) => c.ran(/^git reflog/) },
        { text: 'Bring it back: <code>git reset --hard HEAD@{1}</code>', hint: 'HEAD@{1} means "where HEAD was one move ago", straight from the reflog list.', check: (w) => /^Revert/.test(headMsg(w)) }
      ],
      done: 'Amend, restore, revert, reset and reflog: you can undo almost anything now.'
    },

    // ------------------------------------------------------------------
    extras: {
      title: 'Practice terminal: stash, tags and blame',
      panels: ['areas', 'graph'],
      intro: 'You are halfway through rewriting menu.txt when someone asks for an urgent change.',
      setup(w) {
        w.sh('mkdir cafe', 'cd cafe', 'git init');
        commit(w, 'menu.txt', 'Menu\nCoffee 3.00\nTea 2.50\n', 'Start the menu');
        w.as('Sam', 'sam@example.com', () => commit(w, 'menu.txt', 'Menu\nCoffee 3.00\nTea 2.50\nCroissant 2.75\n', 'Add croissants'));
        commit(w, 'menu.txt', 'Menu\nCoffee 3.20\nTea 2.50\nCroissant 2.75\n', 'Raise coffee price');
        w.put('menu.txt', 'Menu\nCoffee 3.20\nTea 2.50\nCroissant 2.75\nBrownie 3.00 (work in progress)\n');
      },
      chips: ['git status', 'git stash', 'git stash list', 'echo "Open daily 9 to 5" > hours.txt', 'git add hours.txt', 'git commit -m "Add opening hours"', 'git stash pop', 'git tag v1.0', 'git blame menu.txt'],
      missions: [
        { text: 'Park your unfinished work: <code>git stash</code>', check: (w) => repo(w).stash.length > 0 && !st(w).unstaged.length },
        { text: 'Peek at the stash drawer: <code>git stash list</code>', check: (w, c) => c.ran(/^git stash list/) },
        { text: 'Do the urgent change: <code>echo "Open daily 9 to 5" &gt; hours.txt</code>, then add and commit it.', check: (w) => headFile(w, 'hours.txt') !== undefined },
        { text: 'Get your half-done work back: <code>git stash pop</code>', check: (w) => !repo(w).stash.length && /Brownie/.test(wdFile(w, 'menu.txt') || '') },
        { text: 'Mark the current commit as a release: <code>git tag v1.0</code>', check: (w) => repo(w).tags.has('v1.0') },
        { text: 'Find out who wrote each line of the menu: <code>git blame menu.txt</code>', check: (w, c) => c.ran(/^git blame/) }
      ],
      done: 'Stash, tag and blame are small tools you will reach for constantly.'
    },

    // ------------------------------------------------------------------
    final: {
      title: 'Final challenge: a real collaboration mess',
      panels: ['graph', 'remote'],
      intro: 'Sam started a team cookbook on GitHub and gave you access. Clone it, change the menu, and push. Sam happens to be working at the same time.',
      setup(w) {
        w.host('sam/cookbook');
        w.as('Sam', 'sam@example.com', () => {
          w.sh('mkdir -p /srv/seed', 'cd /srv/seed', 'git init');
          commit(w, 'README.md', '# Team cookbook\n', 'Start the cookbook');
          commit(w, 'menu.txt', "Today's special: tomato soup\nDessert: apple pie\n", 'Add the menu');
          w.sh('git remote add origin https://github.com/sam/cookbook.git', 'git push -u origin main', 'cd ~', 'rm -rf /srv/seed');
        });
      },
      chips: ['git clone https://github.com/sam/cookbook.git', 'cd cookbook', 'nano menu.txt', 'git commit -am "Change the special"', 'git push', 'git pull', 'git status', 'git add menu.txt', 'git commit'],
      missions: [
        { text: 'Clone the team project: <code>git clone https://github.com/sam/cookbook.git</code>', check: (w) => !!w.repoAt('~/cookbook') },
        { text: 'Step inside: <code>cd cookbook</code>', check: (w) => w.cwd === '/home/you/cookbook' },
        { text: 'Change the FIRST line of menu.txt (<code>nano menu.txt</code>) to a special of your choice, save, then commit: <code>git commit -am "Change the special"</code>', check: (w) => { const r = repo(w); return !!r && r.between(r.remoteRefs.get('origin/main'), r.headHash()).length > 0 && LG.splitLines(headFile(w, 'menu.txt') || '')[0] !== "Today's special: tomato soup"; },
          after: (w) => { w.teammatePush({ url: 'https://github.com/sam/cookbook.git', edit: 'menu.txt', line: 0, text: "Today's special: mushroom risotto", message: "Change today's special" }); return "Meanwhile, Sam pushed a change to the very same line of menu.txt. You don't know that yet."; } },
        { text: 'Push your commit: <code>git push</code> (brace yourself)', check: (w, c) => c.tried(/^git push/) },
        { text: 'Rejected, because GitHub has work you do not. Bring it in: <code>git pull</code>', check: (w) => !!repo(w).merging || repo(w).headCommit().parents.length > 1 },
        { text: 'Conflict. Fix it: <code>nano menu.txt</code>, decide on one special, remove the markers, save. Then <code>git add menu.txt</code> and <code>git commit</code>', check: (w) => !repo(w).merging && repo(w).headCommit().parents.length > 1 && !MARKERS.test(headFile(w, 'menu.txt') || '') },
        { text: 'Push again: <code>git push</code>', check: (w) => w.hostedRepo('sam/cookbook').branches.get('main') === repo(w).headHash() }
      ],
      done: 'Clone, commit, rejected push, pull, conflict, resolve, push. That is the messiest everyday situation, and you handled it.'
    },

    // ------------------------------------------------------------------
    sandbox: {
      title: 'Sandbox: do anything',
      panels: ['graph', 'remote'],
      intro: 'No rules here. There is an empty GitHub repo at https://github.com/you/sandbox.git and a project to clone at https://github.com/sam/cookbook.git. Type help for commands.',
      setup(w) {
        w.host('you/sandbox');
        w.host('sam/cookbook');
        w.as('Sam', 'sam@example.com', () => {
          w.sh('mkdir -p /srv/seed', 'cd /srv/seed', 'git init');
          commit(w, 'README.md', '# Team cookbook\n', 'Start the cookbook');
          commit(w, 'menu.txt', "Today's special: tomato soup\nDessert: apple pie\n", 'Add the menu');
          w.sh('git remote add origin https://github.com/sam/cookbook.git', 'git push -u origin main', 'cd ~', 'rm -rf /srv/seed');
        });
        w.mkdirp('/home/you/projects');
      },
      chips: ['help', 'git help', 'mkdir projects/demo && cd projects/demo && git init', 'git clone https://github.com/sam/cookbook.git', 'sim teammate', 'git log --oneline --all']
    }
  };

  // =====================================================================
  // Demos: fixed sequences you step through
  // =====================================================================
  function forked(w, mainMoves) {
    recipes(w, 'recipes', 2);
    w.sh('git switch -c feature');
    commit(w, 'waffles.txt', 'Waffles\n- flour\n- eggs\n', 'Add waffles');
    commit(w, 'syrup.txt', 'Maple syrup\n', 'Add syrup');
    w.sh('git switch main');
    if (mainMoves) commit(w, 'README.md', '# Recipe book\nFamily recipes. Now with brunch.\n', 'Update the readme');
  }
  function prSetup(w) {
    published(w, 'you/recipes', 'recipes', 2);
    w.sh('git switch -c add-tacos');
    commit(w, 'tacos.txt', 'Tacos\n- tortillas\n', 'Add taco recipe');
    commit(w, 'tacos.txt', 'Tacos\n- tortillas\n- beans\n- salsa\n', 'Add taco fillings');
    w.sh('git push -u origin add-tacos', 'gh pr create --title "Add tacos" --body "Two taco commits"');
  }

  LG.demos = {
    ff: {
      title: 'Fast-forward merge',
      intro: 'main has not moved since feature branched off. Watch the <b>main</b> label.',
      setup: (w) => forked(w, false),
      steps: [
        { cmd: 'git merge feature', why: 'We are on main (see the HEAD label).', note: 'main had no new commits of its own, so git simply slid the main label forward. No new commit was needed. That is a <b>fast-forward</b>.' },
        { cmd: 'git branch -d feature', note: 'The feature label is gone, but its commits stay: they are part of main now.' }
      ]
    },
    threeway: {
      title: 'Three-way merge',
      intro: 'This time main got a new commit of its own after feature branched off.',
      setup: (w) => forked(w, true),
      steps: [
        { cmd: 'git merge feature', why: 'Both lines have moved on, so a simple slide is impossible.', note: 'Git created a brand-new <b>merge commit</b> (the white interchange) with two parents, one from each line. Your history now shows exactly when the two lines joined.' },
        { cmd: 'git branch -d feature', note: 'Branch label removed. The commits live on inside main.' }
      ]
    },
    rebase: {
      title: 'Rebase, then merge',
      intro: 'Same starting point as the three-way merge. This time we replay feature on top of main first.',
      setup: (w) => forked(w, true),
      steps: [
        { cmd: 'git switch feature', note: 'We are on feature now.' },
        { cmd: 'git rebase main', why: 'Rebase means "pretend I started my work from the latest main".', note: 'Git copied the two feature commits onto the tip of main as <b>brand-new commits</b> with new hashes. The faded grey stations are the old originals, no longer on any branch.' },
        { cmd: 'git switch main', note: 'Back on main.' },
        { cmd: 'git merge feature', note: 'Now it is a simple fast-forward. Result: one straight line, no merge commit.' }
      ]
    },
    detached: {
      title: 'Visiting an old commit',
      intro: 'HEAD normally points at a branch. Watch what happens when you point it at a commit instead.',
      setup: (w) => recipes(w, 'recipes', 4),
      steps: [
        { cmd: 'git switch --detach HEAD~2', note: 'HEAD now points straight at an old commit: "detached HEAD". Your files show the project as it was back then. Nothing is lost.' },
        { cmd: 'git switch main', note: 'Back to the present. HEAD sits on main again and your files are up to date.' }
      ]
    },
    amend: {
      title: 'Amend the last commit',
      intro: 'The last commit message has a typo.',
      setup: (w) => { recipes(w, 'recipes', 1); commit(w, 'pancakes.txt', 'Pancakes\n', 'Add pancaks'); },
      steps: [
        { cmd: 'git commit --amend -m "Add pancakes"', note: 'Amend does not edit the old commit. It builds a replacement with a new hash, and the branch moves to it. The faded station is the old version.' }
      ]
    },
    'reset-soft': {
      title: 'reset --soft',
      panels: ['areas', 'graph'],
      intro: 'Undo the last commit ("Add salsa recipe") but keep its changes staged.',
      setup: (w) => recipes(w, 'recipes', 3),
      steps: [{ cmd: 'git reset --soft HEAD~1', note: 'The branch moved back one commit. salsa.txt is still <b>staged</b>, ready to be committed again (maybe with a better message).' }]
    },
    'reset-mixed': {
      title: 'reset (mixed, the default)',
      panels: ['areas', 'graph'],
      intro: 'Undo the last commit and unstage its changes, but keep your files as they are.',
      setup: (w) => recipes(w, 'recipes', 3),
      steps: [{ cmd: 'git reset HEAD~1', note: 'The branch moved back, and the change is no longer staged. salsa.txt is still on disk, now untracked (red). Nothing lost.' }]
    },
    'reset-hard': {
      title: 'reset --hard',
      panels: ['areas', 'graph'],
      intro: 'Undo the last commit and throw its changes away completely.',
      setup: (w) => recipes(w, 'recipes', 3),
      steps: [{ cmd: 'git reset --hard HEAD~1', note: 'Branch moved back, staging cleared, and <b>salsa.txt is gone from your folder</b>. The commit itself still exists (faded), and git reflog can bring it back. Uncommitted work would be gone for good.' }]
    },
    revert: {
      title: 'Revert a commit',
      panels: ['areas', 'graph'],
      intro: 'The commit "Add pineapple pizza" is already on GitHub. You want it undone without rewriting history.',
      setup: (w) => { recipes(w, 'recipes', 2); commit(w, 'pizza.txt', 'Pizza\n- pineapple\n', 'Add pineapple pizza'); commit(w, 'salsa.txt', RECIPES[2][1], 'Add salsa recipe'); },
      steps: [{ cmd: 'git revert HEAD~1', note: 'Instead of erasing anything, git added a <b>new commit</b> that does the exact opposite (deletes pizza.txt). History stays honest, so it is safe on shared branches.' }]
    },
    fetchpull: {
      title: 'fetch vs pull',
      panels: ['graph', 'remote'],
      intro: 'Your computer and GitHub are in sync. Then a teammate pushes.',
      setup: (w) => published(w, 'you/recipes', 'recipes', 3),
      steps: [
        { cmd: 'sim teammate', note: 'Sam pushed a commit to GitHub (right panel). Your computer (left) has no idea yet.' },
        { cmd: 'git fetch', note: 'Fetch downloaded Sam\'s commit and moved <b>origin/main</b>, your computer\'s memory of GitHub. Your own main label and your files did not change.' },
        { cmd: 'git status', note: 'Now git can tell you are behind, because it knows what GitHub has.' },
        { cmd: 'git merge origin/main', note: 'Your main catches up (a fast-forward). <b>git pull</b> does fetch + merge in a single command.' }
      ]
    },
    'pr-merge': {
      title: 'Create a merge commit',
      panels: ['remote'],
      intro: 'Pull request #1 wants to merge add-tacos (2 commits) into main. The GitHub side is shown.',
      setup: prSetup,
      steps: [{ cmd: 'gh pr merge 1 --merge', note: 'A merge commit joins the branch into main. Every individual commit from the branch is kept in history.' }]
    },
    'pr-squash': {
      title: 'Squash and merge',
      panels: ['remote'],
      intro: 'Same pull request, different button.',
      setup: prSetup,
      steps: [{ cmd: 'gh pr merge 1 --squash', note: 'Both branch commits were squashed into <b>one</b> new commit on main. Tidy, but the individual steps are gone from main.' }]
    },
    'pr-rebase': {
      title: 'Rebase and merge',
      panels: ['remote'],
      intro: 'Same pull request, third option.',
      setup: prSetup,
      steps: [{ cmd: 'gh pr merge 1 --rebase', note: 'Each commit was copied onto main one by one, in a straight line with no merge commit. Note the new hashes.' }]
    },
    cherry: {
      title: 'Cherry-pick one commit',
      intro: 'The experiments branch has one commit you want on main (the typo fix) and one you do not.',
      setup: (w) => {
        recipes(w, 'recipes', 2);
        w.sh('git switch -c experiments');
        commit(w, 'style.txt', 'font: Comic Sans\n', 'Try a new font');
        commit(w, 'README.md', '# Recipe book\nFamily recipes, tracked with git!\n', 'Fix typo in readme');
        w.sh('git switch main');
      },
      steps: [{ cmd: 'git cherry-pick experiments', note: 'Git copied only the tip commit ("Fix typo in readme") onto main as a new commit. The font experiment stays behind on its branch.' }]
    }
  };
})(window.LG = window.LG || {});

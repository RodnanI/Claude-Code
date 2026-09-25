# Learn Git

An interactive, visual guide to git and GitHub for people who have never used either. It is laid out like a metro map: 23 stops on 6 colored lines, from "what is a terminal" to pull requests, forks, rebasing and undoing mistakes.

**To read it, open [`dist/learn-git.html`](dist/learn-git.html) in a browser.** It is one self-contained file: no server, no install, works offline (it asks Google Fonts for nicer typefaces and falls back to system fonts without a connection).

## What is inside

- **Practice terminals** with a simulated git, a bash-like shell and a fake GitHub. They support 29 git subcommands (init, add, commit, branch, switch, merge with real line-level conflicts, rebase, reset, revert, stash, reflog, cherry-pick, blame, push/fetch/pull, clone...), plus `gh repo`/`gh pr` and a built-in editor. Nothing touches the real computer.
- **Missions** on most terminals that check your progress as you type, with hints.
- **Live commit graphs** drawn as metro lines, for your computer and for GitHub side by side.
- **Step-through demos** for fast-forward vs three-way merges, rebase, reset modes, revert, amend, fetch vs pull, and the three GitHub merge buttons.
- **Widgets**: a clickable three-areas model, a pull request walkthrough in a mock browser, a merge conflict resolver, a .gitignore tester, an "oh no" rescue helper, a commit message checker, a Markdown preview, a config generator.
- Quizzes, a searchable cheat sheet, a glossary with hover definitions everywhere, search (`Ctrl+K` or `/`), progress tracking, light and dark themes.

## Folder layout

```
learn-git/
  build.js              zero-dependency build script
  package.json          npm run build / npm run watch
  src/
    template.html       page skeleton with three placeholders
    styles/             CSS, concatenated in filename order
    chapters/           one HTML file per stop, in filename order
    scripts/            JS, concatenated in filename order
      00-util.js        helpers: DOM, storage, diff, 3-way merge, .gitignore matcher
      10-gitsim.js      the git + shell + GitHub simulator (pure logic, Node-testable)
      20-graph.js       metro-map commit graph, areas and file-tree renderers
      30-terminal.js    practice terminal and step-through demo widgets
      35-scenarios.js   terminal scenarios with missions, and demo scripts
      40-data.js        glossary, cheat sheet, rescue situations
      45-widgets.js     the smaller interactive widgets
      50-pr.js          pull request walkthrough
      90-app.js         routing, route map, progress, tooltips, quizzes, search
  dist/
    learn-git.html      the compiled, standalone result
```

## Building

Needs Node.js 18 or newer. No packages to install.

```
node build.js           # writes dist/learn-git.html
node build.js --watch   # rebuilds on every change in src/
```

## Adding things

- **A chapter**: add `src/chapters/NN-name.html` containing `<section class="chapter" data-id="..." data-line="a-f" data-title="...">`. The route map, numbering and next/previous signs are generated from the sections.
- **A practice terminal**: add a scenario to `LG.scenarios` in `35-scenarios.js` (a `setup(world)` that runs commands, optional `missions` with `check(world, ctx)` functions), then drop `<div data-widget="terminal" data-scenario="name"></div>` into a chapter.
- **A demo**: add an entry to `LG.demos` and use `<div data-widget="demo" data-demos="name"></div>`.

# The Git Line: Git and GitHub from zero, on Windows 10 and 11

An interactive guide that teaches Git, GitHub and pull requests to people who have never opened a terminal. Everything compiles into **one standalone file: `learn-git-win.html`**. Double-click it; it runs offline in any modern browser (Google Fonts load when online, with system-font fallbacks otherwise).

## What is inside

20 stops on 5 "lines" of a transit map:

| Line | Stops |
| --- | --- |
| Getting on board | welcome, Git vs GitHub, the terminal, installing Git, first-time setup |
| Git on your PC | the three areas, first commit, reading history, undoing mistakes, branches, merging and conflicts |
| GitHub | push / pull / clone and signing in, pull requests, forks |
| Power tools | .gitignore, stash / tags / rebase / reflog, Windows gotchas |
| Reference | cheat sheet, glossary, final exam |

Interactive parts:

- **Git simulator**: a pretend PowerShell terminal running a real-behaving Git engine (init, status, add, commit, log, diff, show, restore, branch, switch, checkout, merge with real conflicts, reset, revert, stash, rebase, tag, reflog, remote, push, pull, fetch, clone). It draws the three areas and the commit graph as a transit map, and simulates GitHub repositories, teammates who push, rejected pushes, forks and permission errors. Nine guided missions plus a free sandbox.
- **PowerShell practice PC** with a fake file system, Tab completion and history.
- Git for Windows **installer walkthrough**, a `git config` **command builder**, a **pull request walkthrough** on a GitHub-like mock page, an **undo finder**, a live **.gitignore tester**, a **line-ending demo**, a searchable **cheat sheet**, glossary tooltips and quizzes.
- A **Windows 10 / Windows 11 switch** that swaps every OS-specific instruction (auto-detected in Chromium browsers), light and dark themes, and progress saved in the browser.

## Editing and rebuilding

Edit files in `src/`, then rebuild `learn-git-win.html`:

- **Windows, nothing installed:** double-click `build.cmd` (runs `build.ps1` with the PowerShell that ships with Windows).
- **Any OS with Python 3:** `python build.py` (or `py build.py` on Windows).

Both scripts do the same thing: they paste every file from `src/styles`, `src/chapters` and `src/scripts` into `src/template.html`, **in file-name order**, so the number prefix decides the order.

```
learn git win/
  learn-git-win.html        compiled output (open this)
  build.py / build.ps1 / build.cmd
  src/
    template.html           page shell: sidebar, placeholders for CSS, chapters, JS
    styles/                 01 tokens + layout, 02 content, 03 terminal + simulator, 04 other widgets
    chapters/               00-welcome.html ... 19-final.html, one <section class="stop"> each
    scripts/
      01-core.js            routing, route-map nav, progress, OS + theme switch, code blocks, tabs, quizzes, tooltips
      02-glossary.js        glossary data (tooltips + glossary stop)
      03-term.js            terminal UI, mission checklist, PowerShell practice PC
      04-git-engine.js      simulator model: files, index, commits, branches, remotes, diff, 3-way merge
      05-git-local.js       dispatcher, PowerShell basics, init/status/add/commit/log/diff/show/restore/rm/mv/config/tag/reflog
      06-git-branch.js      branch/switch/checkout/merge/reset/revert/stash/rebase
      07-git-remote.js      remote/push/pull/fetch/clone
      08-git-view.js        simulator UI: areas, transit-map graph, GitHub panels, editor
      09-missions.js        guided missions (starting state + steps)
      10-widgets-a.js       three-areas demo, installer walkthrough, config builder, line-ending demo
      11-widgets-b.js       pull request walkthrough, undo finder, .gitignore tester, cheat sheet, glossary
```

### Authoring conventions

- A chapter is `<section class="stop" id="..." data-line="1-5" data-short="Nav title" data-time="10 min">` with an `<h1>` and a `<p class="lead">`. Headers, numbering and footers are generated.
- `<pre class="sh">` becomes a copyable PowerShell block (`data-label="Git Bash"` changes the label and prompt); `<pre class="out">` is terminal output.
- `data-os="10"` / `data-os="11"` on any element shows it only for that Windows version.
- `<dfn>word</dfn>` gets a tooltip from `02-glossary.js` (the console warns if a term is missing).
- Widgets are `<div data-widget="name">`: `gitsim` (with `data-mission`), `shellsim`, `areas`, `installer`, `config`, `prflow`, `undo`, `ignore`, `eol`, `cheats`, `glossary`, `tabs`, `quiz`.
- In SVG figures, set colours through CSS classes (`s-red`, `f-card`, ...) or `style`, never presentation attributes, so dark mode works.

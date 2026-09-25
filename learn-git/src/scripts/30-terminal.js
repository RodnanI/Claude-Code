/* The practice terminal widget and the step-through demo widget. Both drive LG.World. */
(function (LG) {
  'use strict';
  const esc = LG.esc;

  LG.lineHTML = (line) => line.map(([t, c]) => (c ? `<span class="c-${c}">${esc(t)}</span>` : esc(t))).join('');

  function panel(title, sub, body, key) {
    return `<section class="panel"${key ? ` data-key="${esc(key)}"` : ''}><header class="panel-head"><h5>${title}</h5>${sub ? `<span>${sub}</span>` : ''}</header><div class="panel-body">${body}</div></section>`;
  }

  // Draw repo panels (files / areas / local graph / remote graphs) into a container. Used by terminal and demos.
  function drawPanels(box, world, panels, seen, fallbackRepoPath) {
    const repo = world.findRepo() || (fallbackRepoPath ? world.repoAt(fallbackRepoPath) : null) || [...world.repos.values()][0] || null;
    const repoName = repo ? repo.root.split('/').pop() : '';
    let html = '';
    const graphs = [];
    for (const p of panels) {
      if (p === 'files') html += panel('Files and folders', 'what your file explorer would show', LG.renderFiles(world));
      if (p === 'areas') html += panel('Where your changes are', repo ? `inside ${esc(repoName)}/` : '', LG.renderAreas(repo));
      if (p === 'graph') {
        graphs.push({ key: 'local', repo });
        html += panel(repo ? `History of ${esc(repoName)}` : 'History', 'on your computer', `<div class="graph-scroll">${LG.renderGraph(repo, { prev: seen.get('local') })}</div><div class="graph-info">Tip: click a station (commit) for details.</div>`, 'local');
      }
      if (p === 'remote') {
        const targets = [];
        if (repo && repo.remotes.size) {
          for (const [name, url] of repo.remotes) { const h = world.hostedRepo(url); if (h) targets.push({ name, h }); }
        } else {
          for (const h of world.hosted.values()) targets.push({ name: null, h });
        }
        if (!targets.length) html += panel('GitHub', '', '<div class="graph-empty">Not connected to GitHub yet.</div>');
        for (const t of targets) {
          graphs.push({ key: t.h.url, repo: t.h });
          html += panel(`GitHub: ${esc(t.h.name)}`, t.name ? `remote "${esc(t.name)}"` : 'on the internet', `<div class="graph-scroll">${LG.renderGraph(t.h, { prev: seen.get(t.h.url), empty: 'Empty repository. Nothing has been pushed here yet.' })}</div><div class="graph-info"></div>`, t.h.url);
        }
      }
    }
    box.innerHTML = html;
    box.querySelectorAll('.graph-scroll').forEach((s) => { s.scrollLeft = s.scrollWidth; });
    for (const g of graphs) if (g.repo) seen.set(g.key, new Set(g.repo.commits.keys()));
    return { repo, graphs };
  }

  function wireGraphClicks(box, getRepoFor) {
    const pick = (e) => {
      const node = e.target.closest('.g-node');
      if (!node) return;
      const sec = node.closest('.panel');
      const repo = getRepoFor(sec && sec.dataset.key);
      const info = sec && sec.querySelector('.graph-info');
      if (repo && info) info.innerHTML = LG.commitInfo(repo, node.dataset.hash);
      box.querySelectorAll('.g-node.is-picked').forEach((n) => n.classList.remove('is-picked'));
      node.classList.add('is-picked');
    };
    box.addEventListener('click', pick);
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.target.closest('.g-node')) { e.preventDefault(); pick(e); } } });
  }

  // =====================================================================
  // Terminal
  // =====================================================================
  class Terminal {
    constructor(host) {
      this.host = host;
      this.name = host.dataset.scenario;
      this.sc = LG.scenarios[this.name];
      if (!this.sc) { host.textContent = `Unknown scenario: ${this.name}`; return; }
      this.panels = (host.dataset.panels ? host.dataset.panels.split(/[\s,]+/) : this.sc.panels || []).filter(Boolean);
      this.build();
      this.reset();
    }

    build() {
      const sc = this.sc;
      const h = this.host;
      h.classList.add('tw');
      h.innerHTML =
        `<div class="tw-top"><span class="tw-title">${esc(sc.title || 'Practice terminal')}</span>` +
        '<span class="tw-badge">simulated: nothing here touches your real computer</span>' +
        '<button type="button" class="tw-btn" data-act="reset">Reset</button></div>' +
        (sc.missions ? '<div class="tw-missions"></div>' : '') +
        `<div class="tw-grid${this.panels.length ? '' : ' solo'}">` +
        '<div class="tw-term"><div class="tw-screen" role="log" aria-live="polite"></div>' +
        '<form class="tw-input"><label class="tw-ps"></label><input class="tw-field" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Type a command, then press Enter"></form>' +
        '<div class="tw-editor" hidden><div class="ed-bar"><span class="ed-title"></span><span class="ed-keys">Ctrl+S saves, Esc cancels</span></div>' +
        '<textarea class="ed-area" spellcheck="false" aria-label="File contents"></textarea>' +
        '<div class="ed-foot"><span class="ed-hint"></span><button type="button" class="btn small ghost" data-act="ed-cancel">Cancel</button><button type="button" class="btn small primary" data-act="ed-save">Save and close</button></div></div>' +
        '</div>' +
        (this.panels.length ? '<div class="tw-side"></div>' : '') +
        '</div>' +
        (sc.chips ? '<div class="tw-chips"><span class="tw-chips-label">Tap to type:</span></div>' : '');

      this.screen = h.querySelector('.tw-screen');
      this.form = h.querySelector('.tw-input');
      this.ps = h.querySelector('.tw-ps');
      this.input = h.querySelector('.tw-field');
      this.side = h.querySelector('.tw-side');
      this.editor = h.querySelector('.tw-editor');
      this.area = h.querySelector('.ed-area');
      this.msBox = h.querySelector('.tw-missions');

      const chips = h.querySelector('.tw-chips');
      if (chips) {
        for (const c of sc.chips) {
          chips.append(LG.el('button', { type: 'button', class: 'chip', onclick: () => { this.input.value = c; this.input.focus(); } }, c));
        }
      }

      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const cmd = this.input.value;
        this.input.value = '';
        if (cmd.trim()) { this.hist.push(cmd); this.histIdx = this.hist.length; }
        this.run(cmd);
      });
      this.input.addEventListener('keydown', (e) => this.onKey(e));
      this.screen.addEventListener('mouseup', () => {
        const sel = window.getSelection && window.getSelection();
        if (!sel || !sel.toString()) this.input.focus({ preventScroll: true });
      });
      h.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'reset') { this.reset(); this.input.focus({ preventScroll: true }); }
        if (a === 'hint') { const hint = act.nextElementSibling; hint.hidden = !hint.hidden; act.textContent = hint.hidden ? 'Show hint' : 'Hide hint'; }
        if (a === 'ed-save') this.saveEditor();
        if (a === 'ed-cancel') this.cancelEditor();
      });
      this.area.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.saveEditor(); }
        if (e.key === 'Escape') { e.preventDefault(); this.cancelEditor(); }
      });
      if (this.side) {
        wireGraphClicks(this.side, (key) => (key === 'local' ? this.world.findRepo() || [...this.world.repos.values()][0] : this.world.hostedRepo(key)));
      }
    }

    reset() {
      const sc = this.sc;
      this.world = new LG.World(sc.world || {});
      if (sc.setup) sc.setup(this.world);
      this.world.history = [];
      this.missionIdx = 0;
      this.ctxCmds = [];
      this.hist = this.hist || [];
      this.histIdx = this.hist.length;
      this.seen = new Map();
      this.screen.innerHTML = '';
      this.closeEditor();
      if (sc.intro) this.print(new LG.Out().guide(sc.intro).lines);
      this.update();
      this.renderMissions();
    }

    onKey(e) {
      if (e.key === 'ArrowUp') {
        if (!this.hist.length) return;
        e.preventDefault();
        this.histIdx = Math.max(0, this.histIdx - 1);
        this.input.value = this.hist[this.histIdx] || '';
        requestAnimationFrame(() => this.input.setSelectionRange(this.input.value.length, this.input.value.length));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.histIdx = Math.min(this.hist.length, this.histIdx + 1);
        this.input.value = this.hist[this.histIdx] || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const r = this.world.complete(this.input.value);
        this.input.value = r.line;
        if (r.options.length > 1) {
          this.echo(this.input.value, true);
          this.print([[[r.options.join('   '), 'dim']]]);
        }
      } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
        e.preventDefault();
        this.screen.innerHTML = '';
      } else if (e.key.toLowerCase() === 'c' && e.ctrlKey && !this.input.value.slice(this.input.selectionStart, this.input.selectionEnd)) {
        e.preventDefault();
        this.echo(this.input.value + '^C', true);
        this.input.value = '';
      }
    }

    promptHTML() {
      const p = this.world.prompt();
      return `<span class="ps-user">${p.user}@${p.host}</span> <span class="ps-path">${esc(p.path)}</span>` +
        (p.branch ? ` <span class="ps-branch">(${esc(p.branch)})</span>` : '') + ' <span class="ps-dollar">$</span>';
    }

    echo(cmd, raw) {
      const d = document.createElement('div');
      d.className = 'tl tl-cmd';
      d.innerHTML = this.promptHTML() + ' ' + esc(cmd);
      this.screen.appendChild(d);
      if (raw) this.scroll();
    }

    print(lines) {
      const frag = document.createDocumentFragment();
      for (const l of lines) {
        const d = document.createElement('div');
        d.className = 'tl' + (l.length === 1 && l[0][1] === 'guide' ? ' tl-guide' : '');
        d.innerHTML = LG.lineHTML(l);
        frag.appendChild(d);
      }
      this.screen.appendChild(frag);
      while (this.screen.childElementCount > 700) this.screen.firstElementChild.remove();
      this.scroll();
    }

    scroll() { this.screen.scrollTop = this.screen.scrollHeight; }

    run(cmd) {
      this.echo(cmd);
      const res = this.world.exec(cmd);
      if (res.clear) this.screen.innerHTML = '';
      this.print(res.lines);
      if (res.editor) this.openEditor(res.editor);
      this.update();
      if (cmd.trim()) this.checkMissions(cmd.trim(), res);
    }

    update() {
      this.ps.innerHTML = this.promptHTML();
      if (this.side) drawPanels(this.side, this.world, this.panels, this.seen, this.sc.repoPath);
    }

    // ---------- the pretend text editor ----------
    openEditor(ed) {
      this.ed = ed;
      this.editor.hidden = false;
      this.form.hidden = true;
      this.editor.querySelector('.ed-title').textContent = ed.title;
      this.editor.querySelector('.ed-hint').textContent = ed.kind === 'commit'
        ? 'Type your message on the first line. Lines starting with # are ignored.'
        : 'Edit freely. This stands in for nano, VS Code or any editor.';
      this.area.value = ed.content;
      this.area.focus({ preventScroll: true });
      const at = ed.kind === 'commit' ? 0 : this.area.value.length;
      this.area.setSelectionRange(at, at);
    }
    closeEditor() {
      this.ed = null;
      this.editor.hidden = true;
      this.form.hidden = false;
    }
    saveEditor() {
      if (!this.ed) return;
      const ed = this.ed;
      const out = this.world.saveEditor(ed, this.area.value);
      this.closeEditor();
      this.print(out.lines);
      this.update();
      this.checkMissions(`(saved ${ed.name})`, out);
      this.input.focus({ preventScroll: true });
    }
    cancelEditor() {
      if (!this.ed) return;
      const out = this.world.cancelEditor(this.ed);
      this.closeEditor();
      this.print(out.lines);
      this.input.focus({ preventScroll: true });
    }

    // ---------- missions ----------
    renderMissions() {
      const box = this.msBox;
      if (!box) return;
      const ms = this.sc.missions;
      const done = this.missionIdx;
      const pct = Math.round((Math.min(done, ms.length) / ms.length) * 100);
      box.innerHTML =
        `<div class="ms-head"><span class="ms-title">Mission</span><span class="ms-count">${Math.min(done, ms.length)} of ${ms.length}</span><span class="ms-bar"><span style="width:${pct}%"></span></span></div>` +
        '<ol class="ms-list">' + ms.map((m, i) => {
          const state = i < done ? ' is-done' : i === done ? ' is-current' : '';
          const hint = i === done && m.hint ? `<button type="button" class="ms-hint-btn" data-act="hint">Show hint</button><div class="ms-hint" hidden>${m.hint}</div>` : '';
          return `<li class="ms${state}"><span class="ms-dot"></span><div class="ms-body"><div class="ms-text">${m.text}</div>${hint}</div></li>`;
        }).join('') + '</ol>' +
        (done >= ms.length ? `<div class="ms-complete"><b>Mission complete.</b> ${this.sc.done || 'Nice work.'} Keep experimenting, or press Reset to run it again.</div>` : '');
      const cur = box.querySelector('.ms.is-current');
      if (cur && box.scrollHeight > box.clientHeight) box.scrollTop = cur.offsetTop - box.offsetTop - 40;
    }

    checkMissions(cmd, res) {
      const ms = this.sc.missions;
      if (!ms) return;
      this.ctxCmds.push({ cmd, code: res ? res.code : 0 });
      let advanced = false;
      while (this.missionIdx < ms.length) {
        const m = ms[this.missionIdx];
        const cmds = this.ctxCmds;
        const ctx = { cmds, ran: (re) => cmds.some((x) => re.test(x.cmd) && x.code === 0), tried: (re) => cmds.some((x) => re.test(x.cmd)), last: cmd };
        let ok = false;
        try { ok = !!m.check(this.world, ctx); } catch (err) { ok = false; }
        if (!ok) break;
        this.missionIdx++;
        this.ctxCmds = [];
        advanced = true;
        if (m.after) {
          const extra = m.after(this.world);
          if (extra) { this.print(new LG.Out().guide(extra).lines); this.update(); }
        }
      }
      if (advanced) {
        this.renderMissions();
        if (this.missionIdx >= ms.length && LG.progress) LG.progress.mission(this.name);
      }
    }
  }
  LG.Terminal = Terminal;
  LG.widget('terminal', (host) => new Terminal(host));

  // =====================================================================
  // Demo: run a fixed list of commands one step at a time and watch the graph change
  // =====================================================================
  LG.widget('demo', function (host) {
    const names = host.dataset.demos.split(',').map((s) => s.trim()).filter((n) => LG.demos[n]);
    if (!names.length) return;
    let cur, world, step, seen;
    host.classList.add('demo');
    host.innerHTML =
      (names.length > 1
        ? `<div class="demo-tabs" role="tablist">${names.map((n) => `<button type="button" role="tab" class="demo-tab" data-demo="${n}">${esc(LG.demos[n].title)}</button>`).join('')}</div>`
        : `<div class="demo-head">${esc(LG.demos[names[0]].title)}</div>`) +
      '<p class="demo-intro"></p><div class="demo-stage"></div>' +
      '<div class="demo-bottom"><ol class="demo-steps"></ol><div class="demo-out" aria-live="polite"></div></div>' +
      '<div class="demo-controls"><button type="button" class="btn small ghost" data-act="restart">Start over</button><button type="button" class="btn small primary" data-act="next">Run the next command</button></div>';
    const intro = host.querySelector('.demo-intro');
    const stage = host.querySelector('.demo-stage');
    const steps = host.querySelector('.demo-steps');
    const out = host.querySelector('.demo-out');
    const nextBtn = host.querySelector('[data-act="next"]');

    function load(name) {
      cur = name;
      const d = LG.demos[name];
      world = new LG.World(d.world || {});
      d.setup(world);
      world.history = [];
      step = 0;
      seen = new Map();
      out.innerHTML = '<div class="tl c-dim">Press "Run the next command" to run step 1.</div>';
      render();
    }
    function render() {
      const d = LG.demos[cur];
      intro.innerHTML = d.intro || '';
      host.querySelectorAll('.demo-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.demo === cur)));
      steps.innerHTML = d.steps.map((s, i) => {
        const state = i < step ? ' is-done' : i === step ? ' is-next' : '';
        const note = i < step ? s.note : i === step && s.why ? s.why : '';
        return `<li class="demo-step${state}"><code>$ ${esc(s.cmd)}</code>${note ? `<span class="demo-note">${note}</span>` : ''}</li>`;
      }).join('');
      drawPanels(stage, world, d.panels || ['graph'], seen, d.repoPath);
      nextBtn.disabled = step >= d.steps.length;
      nextBtn.textContent = step >= d.steps.length ? 'All steps done' : `Run step ${step + 1}`;
    }
    host.addEventListener('click', (e) => {
      const tab = e.target.closest('.demo-tab');
      if (tab) { load(tab.dataset.demo); return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'restart') load(cur);
      if (act.dataset.act === 'next') {
        const d = LG.demos[cur];
        if (step >= d.steps.length) return;
        const s = d.steps[step];
        const res = world.exec(s.cmd);
        out.innerHTML = `<div class="tl tl-cmd"><span class="ps-dollar">$</span> ${esc(s.cmd)}</div>` + res.lines.map((l) => `<div class="tl">${LG.lineHTML(l)}</div>`).join('');
        step++;
        render();
      }
    });
    wireGraphClicks(stage, (key) => (key === 'local' ? world.findRepo() || [...world.repos.values()][0] : world.hostedRepo(key)));
    load(names[0]);
  });
})(window.LG = window.LG || {});

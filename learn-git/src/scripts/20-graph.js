/* Renders repository state: the commit graph (drawn like a metro map), the three areas, and the file tree. */
(function (LG) {
  'use strict';
  const esc = LG.esc;
  const DX = 88, DY = 92, PADX = 48, PADBOTTOM = 52;
  const CH = 7; // approx width of one monospace label character

  function laneColor(repo, key) {
    if (key.startsWith('~')) return 'var(--g-ghost)';
    if (key === 'main' || key === 'master') return 'var(--g0)';
    const map = repo.w.laneColors || (repo.w.laneColors = new Map());
    if (!map.has(key)) map.set(key, 1 + (map.size % 6));
    return `var(--g${map.get(key)})`;
  }
  const inkOn = (color) => (color === 'var(--g2)' || color === 'var(--g5)' ? '#1e1b16' : '#fff');

  function pathFor(p, q) {
    if (p.y === q.y) return `M${p.x} ${p.y}H${q.x}`;
    const d = Math.min(Math.abs(q.y - p.y), (q.x - p.x) * 0.8);
    if (q.li > p.li) return `M${p.x} ${p.y}L${p.x + d} ${q.y}H${q.x}`; // branching out: bend right after the parent
    return `M${p.x} ${p.y}H${q.x - d}L${q.x} ${q.y}`; // merging back: bend just before the child
  }

  LG.renderGraph = function (repo, opts) {
    opts = opts || {};
    if (!repo || !repo.commits.size) return `<div class="graph-empty">${opts.empty || 'No commits yet. Your first commit will appear here as a station.'}</div>`;
    const reach = new Set();
    const tips = repo.refTips();
    const hh = repo.bare ? null : repo.headHash();
    if (hh) tips.push(hh);
    for (const t of tips) for (const x of repo.ancestors(t)) reach.add(x);
    let commits = [...repo.commits.values()].sort((a, b) => a.seq - b.seq);
    if (opts.ghosts === false) commits = commits.filter((c) => reach.has(c.hash));
    if (commits.length > 36) commits = commits.slice(-36);

    const keyOf = (c) => (reach.has(c.hash) ? '' : '~') + (c.lane || 'main');
    const first = new Map();
    commits.forEach((c, i) => { const k = keyOf(c); if (!first.has(k)) first.set(k, i); });
    const rank = (k) => {
      const base = k.replace(/^~/, '');
      return (k.startsWith('~') ? 10000 : 0) + (base === 'main' || base === 'master' ? -1 : first.get(k));
    };
    const lanes = [...first.keys()].sort((a, b) => rank(a) - rank(b));

    // room above the top lane for however many labels are stacked there
    const labelCount = new Map();
    const bump = (h) => labelCount.set(h, (labelCount.get(h) || 0) + 1);
    if (hh && repo.head.type === 'detached') bump(hh);
    for (const h of repo.branches.values()) bump(h);
    for (const h of repo.remoteRefs.values()) bump(h);
    for (const t of repo.tags.values()) bump(t.hash);
    const topStack = Math.max(1, ...commits.filter((c) => keyOf(c) === lanes[0]).map((c) => labelCount.get(c.hash) || 0));
    const PADTOP = 42 + topStack * 23;
    const pos = new Map();
    commits.forEach((c, i) => {
      const li = lanes.indexOf(keyOf(c));
      pos.set(c.hash, { x: PADX + i * DX, y: PADTOP + li * DY, li, c, ghost: !reach.has(c.hash) });
    });
    const W = PADX * 2 + (commits.length - 1) * DX + 40;
    const H = PADTOP + (lanes.length - 1) * DY + PADBOTTOM;
    const prev = opts.prev;
    const isNew = (h) => prev && prev.size > 0 && !prev.has(h);

    // edges
    let edges = '';
    for (const c of commits) {
      const q = pos.get(c.hash);
      for (const ph of c.parents) {
        const p = pos.get(ph);
        if (!p) continue;
        const colorKey = p.li > q.li ? keyOf(p.c) : keyOf(c);
        edges += `<path class="g-edge${q.ghost ? ' ghost' : ''}${isNew(c.hash) ? ' is-new' : ''}" d="${pathFor(p, q)}" pathLength="1" style="stroke:${laneColor(repo, colorKey)}"/>`;
      }
    }

    // stations
    let nodes = '';
    for (const c of commits) {
      const q = pos.get(c.hash);
      const merge = c.parents.length > 1;
      const col = laneColor(repo, keyOf(c));
      const msg = LG.firstLine(c.message);
      const shortMsg = msg.length > 13 ? msg.slice(0, 12).trimEnd() + '…' : msg;
      const here = c.hash === hh;
      nodes += `<g class="g-node${q.ghost ? ' ghost' : ''}${merge ? ' merge' : ''}${here ? ' here' : ''}${isNew(c.hash) ? ' is-new' : ''}" data-hash="${c.hash}" transform="translate(${q.x} ${q.y})" tabindex="0" role="button" aria-label="Commit ${LG.short(c.hash)}: ${esc(msg)}">` +
        `<title>${esc(LG.short(c.hash) + '  ' + msg + '  (' + c.author + ')')}</title>` +
        (here ? '<circle class="g-here" r="17"/>' : '') +
        (merge ? `<rect class="g-dot" x="-13" y="-10" width="26" height="20" rx="10"/>` : `<circle class="g-dot" r="10" style="stroke:${col}"/>`) +
        `<text class="g-hash" y="28">${LG.short(c.hash)}</text>` +
        `<text class="g-msg" y="43">${esc(shortMsg)}</text></g>`;
    }

    // labels (branches, HEAD, remote-tracking branches, tags), stacked above each station
    const stacks = new Map();
    const add = (h, l) => { if (!pos.has(h)) return; if (!stacks.has(h)) stacks.set(h, []); stacks.get(h).push(l); };
    if (hh && repo.head.type === 'detached') add(hh, { kind: 'head', text: 'HEAD' });
    const branchNames = [...repo.branches.keys()].sort((a, b) => (b === repo.branchName()) - (a === repo.branchName()));
    for (const n of branchNames) add(repo.branches.get(n), { kind: 'branch', text: n, head: !repo.bare && repo.head.type === 'branch' && repo.head.name === n, color: laneColor(repo, n) });
    for (const [n, h] of repo.remoteRefs) add(h, { kind: 'remote', text: n, color: laneColor(repo, n.slice(n.indexOf('/') + 1)) });
    for (const [n, t] of repo.tags) add(t.hash, { kind: 'tag', text: n });

    let labels = '';
    for (const [h, list] of stacks) {
      const { x, y } = pos.get(h);
      list.forEach((l, k) => {
        const top = y - 36 - k * 23;
        const tw = l.text.length * CH + 14;
        if (l.kind === 'branch' && l.head) {
          const hw = 4 * CH + 12, total = hw + tw, x0 = x - total / 2;
          labels += `<g class="g-label is-head"><rect x="${x0}" y="${top}" width="${hw + 6}" height="19" rx="4" class="lb-head"/>` +
            `<rect x="${x0 + hw}" y="${top}" width="${tw}" height="19" rx="4" style="fill:${l.color}"/>` +
            `<text x="${x0 + hw / 2}" y="${top + 13.5}" class="lb-t lb-headt">HEAD</text>` +
            `<text x="${x0 + hw + tw / 2}" y="${top + 13.5}" class="lb-t" style="fill:${inkOn(l.color)}">${esc(l.text)}</text></g>`;
        } else if (l.kind === 'branch') {
          labels += `<g class="g-label"><rect x="${x - tw / 2}" y="${top}" width="${tw}" height="19" rx="4" style="fill:${l.color}"/><text x="${x}" y="${top + 13.5}" class="lb-t" style="fill:${inkOn(l.color)}">${esc(l.text)}</text></g>`;
        } else if (l.kind === 'head') {
          labels += `<g class="g-label"><rect x="${x - tw / 2}" y="${top}" width="${tw}" height="19" rx="4" class="lb-head"/><text x="${x}" y="${top + 13.5}" class="lb-t lb-headt">HEAD</text></g>`;
        } else if (l.kind === 'remote') {
          labels += `<g class="g-label"><rect x="${x - tw / 2}" y="${top}" width="${tw}" height="19" rx="4" class="lb-remote" style="stroke:${l.color}"/><text x="${x}" y="${top + 13.5}" class="lb-t lb-remotet">${esc(l.text)}</text></g>`;
        } else {
          const x0 = x - (tw + 6) / 2, x1 = x0 + tw + 6;
          labels += `<g class="g-label"><path class="lb-tag" d="M${x0} ${top + 9.5}L${x0 + 8} ${top}H${x1}V${top + 19}H${x0 + 8}Z"/><circle cx="${x0 + 8}" cy="${top + 9.5}" r="2" class="lb-hole"/><text x="${x + 3}" y="${top + 13.5}" class="lb-t lb-tagt">${esc(l.text)}</text></g>`;
        }
      });
    }

    return `<svg class="graph-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Commit graph">` +
      `<g class="g-edges">${edges}</g><g class="g-nodes">${nodes}</g><g class="g-labels">${labels}</g></svg>`;
  };

  LG.commitInfo = function (repo, hash) {
    const c = repo.commits.get(hash);
    if (!c) return '';
    const parentTree = c.parents[0] && repo.commits.get(c.parents[0]) ? repo.commits.get(c.parents[0]).tree : new Map();
    const changed = [...new Set([...parentTree.keys(), ...c.tree.keys()])].filter((p) => parentTree.get(p) !== c.tree.get(p)).sort();
    const tag = (p) => (!parentTree.has(p) ? 'added' : !c.tree.has(p) ? 'deleted' : 'changed');
    return `<b>${LG.short(c.hash)}</b> <span class="gi-msg">${esc(LG.firstLine(c.message))}</span>` +
      `<span class="gi-meta">by ${esc(c.author)} &middot; ${c.parents.length ? (c.parents.length > 1 ? 'merge of ' : 'parent ') + c.parents.map(LG.short).join(' + ') : 'first commit, no parent'}</span>` +
      (c.parents.length <= 1 && changed.length ? `<span class="gi-meta">${changed.map((p) => `${esc(p)} <i>${tag(p)}</i>`).join(', ')}</span>` : '');
  };

  const chip = (p, s, letter, title) => `<li class="fchip st-${s}" title="${esc(title)}"><b>${letter}</b><span>${esc(p)}</span></li>`;

  LG.renderAreas = function (repo) {
    if (!repo) return '<div class="areas-empty">This folder is not a repository yet, so git is not watching it. <code>git init</code> changes that.</div>';
    const st = repo.status();
    const wd = repo.wd();
    const unst = new Map(st.unstaged.map((x) => [x.p, x.k]));
    const wdItems = [];
    for (const p of [...wd.keys()].sort()) {
      if (repo.unmerged.has(p)) wdItems.push(chip(p, 'c', '!', 'conflict: fix this file, then git add it'));
      else if (st.untracked.includes(p)) wdItems.push(chip(p, 'u', 'U', 'untracked: git has never saved this file'));
      else if (st.ignored.includes(p)) wdItems.push(chip(p, 'i', 'I', 'ignored by .gitignore'));
      else if (unst.get(p) === 'modified') wdItems.push(chip(p, 'm', 'M', 'modified since it was last staged'));
      else wdItems.push(chip(p, 'clean', '', 'unchanged'));
    }
    for (const x of st.unstaged) if (x.k === 'deleted') wdItems.push(chip(x.p, 'd', 'D', 'deleted from disk, not staged yet'));
    const code = { 'new file': ['a', 'A', 'new file, staged'], modified: ['m', 'M', 'changed, staged'], deleted: ['d', 'D', 'deletion, staged'] };
    const stItems = st.staged.map((x) => chip(x.p, code[x.k][0], code[x.k][1], code[x.k][2]));
    const c = repo.headCommit();
    let repoHtml = '<p class="area-empty">No commits yet</p>';
    if (c) {
      const files = [...c.tree.keys()].sort();
      const shown = files.slice(0, 7).map((p) => chip(p, 'saved', '', 'saved in the latest commit')).join('');
      repoHtml = `<div class="area-commit"><span class="ac-hash">${LG.short(c.hash)}</span><span class="ac-msg">${esc(LG.firstLine(c.message))}</span></div>` +
        `<div class="area-meta">${LG.plural(repo.ancestors(c.hash).size, 'commit')} of history</div>` +
        `<ul class="area-list">${shown}${files.length > 7 ? `<li class="area-more">and ${files.length - 7} more</li>` : ''}</ul>`;
    }
    return '<div class="areas">' +
      `<section class="area area-wd"><h5>Working directory<small>your files on disk</small></h5><div class="area-body"><ul class="area-list">${wdItems.join('') || '<li class="area-empty">no files</li>'}</ul></div></section>` +
      `<div class="area-arrow" aria-hidden="true"><span>git add</span></div>` +
      `<section class="area area-stage"><h5>Staging area<small>goes into the next commit</small></h5><div class="area-body"><ul class="area-list">${stItems.join('') || '<li class="area-empty">nothing staged</li>'}</ul></div></section>` +
      `<div class="area-arrow" aria-hidden="true"><span>git commit</span></div>` +
      `<section class="area area-repo"><h5>Repository<small>latest commit (HEAD)</small></h5><div class="area-body">${repoHtml}</div></section>` +
      '</div>';
  };

  LG.renderFiles = function (w) {
    const rows = [];
    const here = (p) => (p === w.cwd ? '<em>you are here</em>' : '');
    rows.push(`<li class="ft ft-dir ft-root${w.cwd === w.home ? ' ft-here' : ''}" style="--d:0"><span>~ <small>(${esc(w.home)})</small></span>${here(w.home)}</li>`);
    const walk = (dir, depth) => {
      for (const n of w.children(dir)) {
        if (n === '.git') continue;
        const p = dir + '/' + n;
        const d = w.isDir(p);
        rows.push(`<li class="ft ${d ? 'ft-dir' : 'ft-file'}${p === w.cwd ? ' ft-here' : ''}" style="--d:${depth}"><span>${esc(n)}${d ? '/' : ''}</span>${w.repos.has(p) ? '<i>git repo</i>' : ''}${here(p)}</li>`);
        if (d && depth < 5) walk(p, depth + 1);
      }
    };
    walk(w.home, 1);
    return `<ul class="ftree">${rows.join('')}</ul>`;
  };
})(window.LG = window.LG || {});

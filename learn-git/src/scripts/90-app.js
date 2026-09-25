/* App shell: chapters, route map, routing, progress, tooltips, quizzes, tabs, search, theme. Runs last. */
(function (LG) {
  'use strict';
  const { $, $$, esc } = LG;

  const LINES = {
    a: { name: 'Foundations', color: 'var(--line-a)' },
    b: { name: 'Everyday git', color: 'var(--line-b)' },
    c: { name: 'Branching', color: 'var(--line-c)' },
    d: { name: 'GitHub', color: 'var(--line-d)' },
    e: { name: 'Rescue and habits', color: 'var(--line-e)' },
    f: { name: 'Terminus', color: 'var(--line-f)' }
  };

  LG.os = (() => {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '';
    return /Win/i.test(p) ? 'windows' : /Mac|iPhone|iPad/i.test(p) ? 'mac' : 'linux';
  })();

  // ---------- progress ----------
  const blank = () => ({ visited: {}, missions: {}, quizzes: {} });
  LG.progress = {
    d: Object.assign(blank(), LG.store.get('lg-progress-v1', {})),
    save() { LG.store.set('lg-progress-v1', this.d); LG.emit('progress'); },
    visit(id) { if (!this.d.visited[id]) { this.d.visited[id] = 1; this.save(); } },
    mission(id) { if (!this.d.missions[id]) { this.d.missions[id] = 1; this.save(); } },
    quiz(id) { if (!this.d.quizzes[id]) { this.d.quizzes[id] = 1; this.save(); } },
    reset() { this.d = blank(); this.save(); }
  };

  // ---------- chapters ----------
  const chapters = $$('section.chapter').map((el, i) => ({
    el, i, id: el.dataset.id, line: el.dataset.line || 'a',
    title: el.dataset.title || $('h1', el).textContent, short: el.dataset.short || el.dataset.title
  }));
  const byId = Object.fromEntries(chapters.map((c) => [c.id, c]));
  LG.chapters = chapters;
  LG.chapterTitle = (id) => (byId[id] ? byId[id].title : '');

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  chapters.forEach((ch, i) => {
    const L = LINES[ch.line];
    ch.el.style.setProperty('--line', L.color);
    ch.el.hidden = true;
    const head = $('.ch-head', ch.el);
    const stopOnLine = chapters.filter((c) => c.line === ch.line).indexOf(ch) + 1;
    head.insertAdjacentHTML('afterbegin', `<p class="ch-kicker"><span class="bullet">${ch.line.toUpperCase()}</span>Line ${ch.line.toUpperCase()}: ${L.name}<span class="sep"></span>Stop ${i + 1} of ${chapters.length}</p>`);
    $$('h2', ch.el).forEach((h) => { if (!h.id) h.id = `${ch.id}--${slug(h.textContent)}`; });

    const prev = chapters[i - 1], next = chapters[i + 1];
    let foot = '<footer class="ch-foot"><p class="visited-note">You reached the end of this stop. It is marked as visited on the map.</p><div class="ch-foot-row">';
    foot += prev
      ? `<a class="stop-sign prev" href="#${prev.id}" style="--to-line:${LINES[prev.line].color}"><span class="ss-label">Previous stop</span><span class="ss-title">${esc(prev.title)}</span></a>`
      : '<span></span>';
    if (next) {
      const change = next.line !== ch.line ? `<span class="ss-change"><i></i>Change here for Line ${next.line.toUpperCase()}: ${LINES[next.line].name}</span>` : '';
      foot += `<a class="stop-sign" href="#${next.id}" style="--to-line:${LINES[next.line].color}"><span class="ss-label">Next stop</span><span class="ss-title">${esc(next.title)}</span>${change}<span class="ss-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>`;
    }
    foot += '</div></footer>';
    ch.el.insertAdjacentHTML('beforeend', foot);
  });

  // mark a stop visited once its footer scrolls into view
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) LG.progress.visit(en.target.closest('.chapter').dataset.id); });
  }, { threshold: 0.4 }) : null;
  chapters.forEach((ch) => io && io.observe($('.ch-foot', ch.el)));

  // ---------- route map ----------
  const map = $('#routemap');
  let current = null;
  function renderMap() {
    const v = LG.progress.d.visited;
    let html = '<p class="rm-title">Route map</p>';
    for (const [key, L] of Object.entries(LINES)) {
      const list = chapters.filter((c) => c.line === key);
      if (!list.length) continue;
      const done = list.filter((c) => v[c.id]).length;
      html += `<div class="rm-line" style="--line:${L.color}"><div class="rm-head"><span class="rm-badge">${key.toUpperCase()}</span><span class="rm-name">${L.name}</span><span class="rm-count">${done}/${list.length}</span></div><ol class="rm-stops">` +
        list.map((c) => `<li class="rm-stop${v[c.id] ? ' is-done' : ''}${current === c ? ' is-current' : ''}"><a href="#${c.id}"${current === c ? ' aria-current="page"' : ''}><span class="rm-dot"></span><span class="rm-label">${esc(c.short)}</span>${current === c ? '<span class="rm-here">you are here</span>' : ''}</a></li>`).join('') +
        '</ol></div>';
    }
    const m = Object.keys(LG.progress.d.missions).length, q = Object.keys(LG.progress.d.quizzes).length;
    html += `<p class="rm-stats">${LG.plural(m, 'mission')} completed, ${LG.plural(q, 'quiz', 'quizzes')} answered.</p><button type="button" class="rm-reset">Reset my progress</button>`;
    map.innerHTML = html;
    const n = chapters.filter((c) => v[c.id]).length;
    const pct = (n / chapters.length) * 100;
    $('.trip-fill').style.width = pct + '%';
    $('.trip-train').style.left = pct + '%';
    $('.trip-count').textContent = `${n} / ${chapters.length} stops`;
  }
  map.addEventListener('click', (e) => {
    if (e.target.closest('.rm-reset')) {
      if (window.confirm('Forget which stops, missions and quizzes you have done?')) LG.progress.reset();
      return;
    }
    if (e.target.closest('a')) document.body.classList.remove('nav-open');
  });
  LG.on('progress', renderMap);

  // ---------- lazy widgets ----------
  function mount(root) {
    $$('[data-widget]', root).forEach((el) => {
      if (el.dataset.mounted) return;
      el.dataset.mounted = '1';
      const fn = LG.widgets[el.dataset.widget];
      if (!fn) { el.textContent = `Missing widget: ${el.dataset.widget}`; return; }
      try { fn(el); } catch (err) { console.error(err); el.innerHTML = '<p class="muted">This interactive part failed to load. Try reloading the page.</p>'; }
    });
  }

  // ---------- routing ----------
  function show(id, target) {
    const ch = byId[id] || chapters[0];
    if (current !== ch) {
      chapters.forEach((c) => { c.el.hidden = c !== ch; });
      current = ch;
      mount(ch.el);
      renderMap();
      document.title = `${ch.title} | Learn Git`;
      LG.store.set('lg-last', ch.id);
      const here = $('.rm-stop.is-current', map);
      if (here && map.scrollHeight > map.clientHeight) map.scrollTop = here.offsetTop - map.clientHeight / 3;
    }
    document.body.classList.remove('nav-open');
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    else window.scrollTo(0, 0);
  }
  LG.show = show;
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  // ---------- terminal snippets ----------
  LG.enhanceTerm = function (pre) {
    if (pre.dataset.done) return pre.closest('.term-block') || pre;
    pre.dataset.done = '1';
    const lines = pre.textContent.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
    const cmds = [];
    pre.innerHTML = lines.map((l) => {
      if (/^\$ /.test(l)) { cmds.push(l.slice(2)); return `<span class="t-cmd"><span class="t-ps">$ </span>${esc(l.slice(2))}</span>`; }
      if (/^#( |$)/.test(l) && !pre.hasAttribute('data-plain')) return `<span class="t-com">${esc(l)}</span>`;
      return `<span class="t-out">${esc(l)}</span>`;
    }).join('\n');
    const block = document.createElement('div');
    block.className = 'term-block';
    block.innerHTML = `<div class="term-bar"><span>${esc(pre.dataset.label || (cmds.length ? 'Terminal' : 'Output'))}</span>${cmds.length ? '<button type="button" class="term-copy">Copy</button>' : ''}</div>`;
    if (pre.parentNode) pre.parentNode.insertBefore(block, pre);
    block.appendChild(pre);
    const btn = $('.term-copy', block);
    if (btn) btn.addEventListener('click', () => LG.copy(cmds.join('\n'), btn));
    return block;
  };
  $$('pre.term').forEach(LG.enhanceTerm);

  // ---------- quizzes ----------
  chapters.forEach((ch) => $$('.quiz', ch.el).forEach((q, qi) => {
    const id = `${ch.id}-${qi}`;
    const explain = $('.quiz-explain', q);
    q.insertAdjacentHTML('afterbegin', '<p class="quiz-tag">Quick check</p>');
    if (explain) explain.hidden = true;
    $$('.quiz-choices > button', q).forEach((b, i) => {
      b.type = 'button';
      b.classList.add('quiz-choice');
      b.innerHTML = `<span class="qc-key">${'ABCDEF'[i]}</span><span>${b.innerHTML}</span>`;
      b.addEventListener('click', () => {
        if (q.classList.contains('is-solved')) return;
        if (b.hasAttribute('data-correct')) {
          b.classList.add('is-right');
          q.classList.add('is-solved');
          if (explain) explain.hidden = false;
          LG.progress.quiz(id);
        } else {
          b.classList.remove('is-wrong');
          void b.offsetWidth;
          b.classList.add('is-wrong');
        }
      });
    });
  }));

  // ---------- tabs ----------
  $$('.tabs').forEach((t) => {
    const btns = $$('.tab-list > button', t);
    const panels = $$('.tab-panel', t);
    $('.tab-list', t).setAttribute('role', 'tablist');
    const select = (k) => {
      btns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
      panels.forEach((p) => { p.hidden = p.dataset.panel !== k; });
    };
    btns.forEach((b) => { b.type = 'button'; b.classList.add('tab-btn'); b.setAttribute('role', 'tab'); b.addEventListener('click', () => select(b.dataset.tab)); });
    let first = btns[0] && btns[0].dataset.tab;
    if (t.hasAttribute('data-os') && btns.some((b) => b.dataset.tab === LG.os)) first = LG.os;
    select(first);
  });

  // ---------- glossary tooltips ----------
  const tip = $('.tooltip');
  let tipFor = null;
  function showTip(el) {
    const g = LG.glossary[el.dataset.g];
    if (!g) return;
    tipFor = el;
    tip.innerHTML = `<b>${esc(g[0])}</b>${esc(g[1])}`;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    let y = r.top - th - 10;
    if (y < 64) y = r.bottom + 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  const hideTip = () => { tip.hidden = true; tipFor = null; };
  $$('[data-g]').forEach((el) => {
    el.tabIndex = 0;
    if (!LG.glossary[el.dataset.g]) console.warn('glossary term missing:', el.dataset.g);
  });
  document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-g]'); if (el && el !== tipFor) showTip(el); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-g]') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-g]'))) hideTip(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-g]'); if (el) showTip(el); else hideTip(); });
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-g]'); if (el) { if (tipFor === el) hideTip(); else showTip(el); } else if (tipFor) hideTip(); });
  window.addEventListener('scroll', () => { if (tipFor) hideTip(); }, { passive: true });

  // ---------- theme ----------
  const root = document.documentElement;
  const savedTheme = LG.store.get('lg-theme', null);
  if (savedTheme) root.dataset.theme = savedTheme;
  $('.theme-btn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    LG.store.set('lg-theme', root.dataset.theme);
  });

  // ---------- mobile menu ----------
  const menuBtn = $('.menu-btn');
  const scrim = $('.scrim');
  menuBtn.addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
  });
  scrim.addEventListener('click', () => { document.body.classList.remove('nav-open'); scrim.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); });
  new MutationObserver(() => { if (!document.body.classList.contains('nav-open')) scrim.hidden = true; }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // ---------- search palette ----------
  const pal = $('.palette');
  const palInput = $('.palette-input');
  const palList = $('.palette-list');
  let palItems = [], palSel = 0, index = null;
  function buildIndex() {
    const items = [];
    chapters.forEach((c) => {
      items.push({ kind: 'Stop', title: c.title, sub: `Line ${c.line.toUpperCase()}: ${LINES[c.line].name}`, go: () => { location.hash = c.id; } });
      $$('h2', c.el).forEach((h) => items.push({ kind: 'Section', title: h.textContent, sub: c.title, go: () => { if (location.hash.slice(1) !== c.id) history.pushState(null, '', '#' + c.id); show(c.id, h); } }));
    });
    Object.entries(LG.glossary).forEach(([k, g]) => items.push({ kind: 'Word', title: g[0], sub: g[1], go: () => { location.hash = 'glossary'; setTimeout(() => { const el = document.getElementById('g-' + k); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } }, 60); } }));
    LG.cheats.forEach((c) => items.push({ kind: 'Command', title: c[1], sub: c[2], go: () => { location.hash = 'cheatsheet'; setTimeout(() => { const w = $('.chapter[data-id="cheatsheet"] [data-widget="cheatsheet"]'); if (w && w.lgSearch) w.lgSearch(c[1]); }, 60); } }));
    return items;
  }
  function renderPalette() {
    const q = palInput.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    let res = index;
    if (words.length) {
      res = index.map((it) => {
        const t = it.title.toLowerCase(), all = t + ' ' + it.sub.toLowerCase();
        if (!words.every((w) => all.includes(w))) return null;
        const score = (t.startsWith(q) ? 0 : t.includes(q) ? 1 : 2) + (it.kind === 'Stop' ? -0.5 : it.kind === 'Section' ? 0 : 0.3);
        return { it, score };
      }).filter(Boolean).sort((a, b) => a.score - b.score).map((x) => x.it);
    } else res = index.filter((it) => it.kind === 'Stop');
    palItems = res.slice(0, 14);
    palSel = 0;
    palList.innerHTML = palItems.length
      ? palItems.map((it, i) => `<li role="option" data-i="${i}" class="${i === 0 ? 'is-active' : ''}"><span class="pl-kind k-${it.kind.toLowerCase()}">${it.kind}</span><span class="pl-title">${esc(it.title)}</span><span class="pl-sub">${esc(it.sub.length > 90 ? it.sub.slice(0, 88) + '…' : it.sub)}</span></li>`).join('')
      : '<li class="pl-none">Nothing found. Try one word, like "undo" or "branch".</li>';
  }
  function openPalette() {
    if (!index) index = buildIndex();
    pal.hidden = false;
    palInput.value = '';
    renderPalette();
    palInput.focus();
  }
  function closePalette() { pal.hidden = true; }
  function pick(i) { const it = palItems[i]; if (!it) return; closePalette(); it.go(); }
  $('.search-btn').addEventListener('click', openPalette);
  palInput.addEventListener('input', renderPalette);
  palInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % Math.max(1, palItems.length);
      $$('li', palList).forEach((li, i) => li.classList.toggle('is-active', i === palSel));
      const act = $('li.is-active', palList);
      if (act) act.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { e.preventDefault(); pick(palSel); }
    else if (e.key === 'Escape') closePalette();
  });
  palList.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) pick(+li.dataset.i); });
  pal.addEventListener('mousedown', (e) => { if (e.target === pal) closePalette(); });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (pal.hidden) openPalette(); else closePalette(); }
    else if (e.key === '/' && !typing && pal.hidden) { e.preventDefault(); openPalette(); }
    else if (e.key === 'Escape' && !pal.hidden) closePalette();
  });

  // ---------- go ----------
  const start = location.hash.slice(1);
  const initial = byId[start] ? start : (byId[LG.store.get('lg-last', '')] ? LG.store.get('lg-last', '') : chapters[0].id);
  if (start !== initial) history.replaceState(null, '', '#' + initial);
  show(initial);
})(window.LG = window.LG || {});

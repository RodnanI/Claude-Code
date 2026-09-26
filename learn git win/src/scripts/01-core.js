/* Core: helpers, routing between stops, route-map nav, progress, Windows version
   switch, theme, terminal-style code blocks, tabs, quizzes, glossary tooltips. */
(function () {
  'use strict';
  var LG = window.LG = { widgets: {} };

  LG.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('lgw.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('lgw.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  LG.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  LG.h = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  LG.$ = function (sel, root) { return (root || document).querySelector(sel); };
  LG.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  LG.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = LG.esc;

  LG.copyText = function (text, btn) {
    function done(ok) {
      if (!btn) return;
      var old = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', old);
      btn.textContent = ok ? 'Copied' : 'Select + Ctrl+C';
      btn.classList.toggle('ok', ok);
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = old; btn.classList.remove('ok'); }, 1500);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else fallback();
  };

  /* ---------- code blocks: <pre class="sh"> becomes a copyable terminal card ---------- */
  function hiLine(line, prompt) {
    if (/^\s*#/.test(line)) return '<span class="c">' + esc(line) + '</span>';
    if (!line.trim()) return '';
    var out = '', first = true;
    line.replace(/("[^"]*"?|'[^']*'?|\s+|<[^>\s]+>|[^\s"'<]+|<)/g, function (tok) {
      var e = esc(tok), blank = /^\s+$/.test(tok);
      if (blank) out += e;
      else if (tok[0] === '"' || tok[0] === "'") out += '<span class="s">' + e + '</span>';
      else if (/^<[^>\s]+>$/.test(tok)) out += '<span class="ph">' + e + '</span>';
      else if (first) out += '<span class="k">' + e + '</span>';
      else if (tok[0] === '-') out += '<span class="f">' + e + '</span>';
      else out += e;
      if (!blank) first = false;
      return tok;
    });
    return '<span class="pp">' + prompt + '</span>' + out;
  }
  LG.initCode = function (root) {
    LG.$$('pre.sh, pre.out', root).forEach(function (pre) {
      if (pre.parentNode.classList.contains('cb')) return;
      var isOut = pre.classList.contains('out');
      var label = pre.getAttribute('data-label') || (isOut ? 'What you will see' : 'PowerShell');
      var wrap = LG.h('div', 'cb' + (isOut ? ' out' : ''));
      var head = LG.h('div', 'cb-head', '<span>' + esc(label) + '</span>');
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head);
      wrap.appendChild(pre);
      if (isOut) return;
      var raw = pre.textContent.replace(/^\n+/, '').replace(/\s+$/, '');
      var prompt = /bash/i.test(label) ? '$ ' : /command prompt|cmd/i.test(label) ? '&gt; ' : 'PS&gt; ';
      pre.innerHTML = raw.split('\n').map(function (l) { return hiLine(l, prompt); }).join('\n');
      var cmds = raw.split('\n').filter(function (l) { return l.trim() && !/^\s*#/.test(l); }).join('\n');
      var b = LG.h('button', 'copy', 'Copy');
      b.type = 'button';
      b.setAttribute('aria-label', 'Copy ' + (cmds.indexOf('\n') > 0 ? 'these commands' : 'this command'));
      b.addEventListener('click', function () { LG.copyText(cmds, b); });
      head.appendChild(b);
    });
  };

  /* ---------- tabs: <div data-widget="tabs"><div data-tab="Name">...</div></div> ---------- */
  LG.widgets.tabs = function (el) {
    el.classList.add('tabs');
    var panes = Array.prototype.filter.call(el.children, function (c) { return c.hasAttribute('data-tab'); });
    var bar = LG.h('div', 'tab-bar');
    bar.setAttribute('role', 'tablist');
    panes.forEach(function (p, i) {
      var b = LG.h('button', 'tab-btn', esc(p.getAttribute('data-tab')));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { select(i); });
      bar.appendChild(b);
      p.setAttribute('role', 'tabpanel');
    });
    el.insertBefore(bar, el.firstChild);
    function select(i) {
      panes.forEach(function (p, j) {
        p.hidden = j !== i;
        bar.children[j].setAttribute('aria-selected', String(j === i));
      });
    }
    select(0);
  };

  /* ---------- quizzes ---------- */
  LG.widgets.quiz = function (el) {
    if (!el._orig) el._orig = el.innerHTML;
    el.classList.add('quiz');
    var qs = LG.$$('.q', el), score = 0, answered = 0;
    var head = LG.h('div', 'quiz-head', '<span class="quiz-t">' + esc(el.getAttribute('data-title') || 'Check yourself') +
      '</span><span class="quiz-score"></span>');
    el.insertBefore(head, el.firstChild);
    var scoreEl = head.querySelector('.quiz-score');
    function upd() {
      scoreEl.textContent = answered ? score + ' of ' + answered + ' right' + (answered === qs.length ? ' (finished)' : '') : qs.length + ' questions';
    }
    qs.forEach(function (q) {
      var why = LG.$('.why', q), list = LG.$('ul, ol', q);
      if (why) why.hidden = true;
      var box = LG.h('div', 'opts');
      LG.$$('li', list).forEach(function (li) {
        var b = LG.h('button', 'opt', li.innerHTML);
        b.type = 'button';
        if (li.hasAttribute('data-ok')) b.setAttribute('data-ok', '1');
        b.addEventListener('click', function () {
          if (q.classList.contains('done')) return;
          q.classList.add('done');
          answered++;
          var right = b.hasAttribute('data-ok');
          if (right) score++;
          b.classList.add(right ? 'right' : 'wrong');
          LG.$$('.opt', box).forEach(function (o) { o.disabled = true; if (o.hasAttribute('data-ok')) o.classList.add('right'); });
          var v = LG.h('p', 'verdict ' + (right ? 'yes' : 'no'), right ? 'Correct' : 'Not quite');
          box.parentNode.insertBefore(v, box.nextSibling);
          if (why) { v.parentNode.insertBefore(why, v.nextSibling); why.hidden = false; }
          upd();
        });
        box.appendChild(b);
      });
      list.parentNode.replaceChild(box, list);
    });
    var foot = LG.h('div', 'quiz-foot', '<button type="button" class="btn sm">Reset quiz</button>');
    foot.firstChild.addEventListener('click', function () { el.innerHTML = el._orig; LG.widgets.quiz(el); });
    el.appendChild(foot);
    upd();
  };

  /* ---------- glossary tooltips on <dfn> ---------- */
  var gIndex = {};
  LG.gloss = function (key) {
    key = String(key).toLowerCase().replace(/\s+/g, ' ').trim();
    return gIndex[key] || gIndex[key.replace(/es$/, '')] || gIndex[key.replace(/s$/, '')] || null;
  };
  function buildGloss() {
    // First entry wins, so "Path" (file path) keeps "path" and "PATH" is reached via its aliases.
    (LG.glossary || []).forEach(function (e) {
      [e.term].concat(e.alias || []).forEach(function (a) {
        var k = a.toLowerCase();
        if (!gIndex[k]) gIndex[k] = e;
      });
    });
  }
  var tip;
  function showTip(d) {
    var g = LG.gloss(d.getAttribute('data-g') || d.textContent);
    if (!g) return;
    tip.innerHTML = '<b>' + esc(g.term) + '</b>' + g.def;
    tip.hidden = false;
    var r = d.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
    var y = r.top - th - 10;
    if (y < 8) y = r.bottom + 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  function initTips() {
    tip = document.getElementById('gtip');
    document.addEventListener('mouseover', function (e) { var d = e.target.closest && e.target.closest('dfn'); if (d) showTip(d); });
    document.addEventListener('mouseout', function (e) {
      var d = e.target.closest && e.target.closest('dfn');
      if (d && !d.contains(e.relatedTarget)) hideTip();
    });
    document.addEventListener('focusin', function (e) { if (e.target.tagName === 'DFN') showTip(e.target); });
    document.addEventListener('focusout', function (e) { if (e.target.tagName === 'DFN') hideTip(); });
    document.addEventListener('click', function (e) { var d = e.target.closest && e.target.closest('dfn'); if (d) showTip(d); else hideTip(); });
    window.addEventListener('scroll', hideTip, { passive: true });
    LG.$$('dfn').forEach(function (d) {
      d.tabIndex = 0;
      if (!LG.gloss(d.getAttribute('data-g') || d.textContent)) console.warn('No glossary entry for:', d.textContent);
    });
  }

  /* ---------- stops, route map, progress ---------- */
  var LINES = {
    '1': { name: 'Getting on board', c: 'var(--red)' },
    '2': { name: 'Git on your PC', c: 'var(--green)' },
    '3': { name: 'GitHub', c: 'var(--amber)' },
    '4': { name: 'Power tools', c: 'var(--rust)' },
    '5': { name: 'Reference', c: 'var(--ink-2)' }
  };
  var stops = [], nav, side;
  function isDone(id) { return LG.store.get('done', []).indexOf(id) >= 0; }
  function setDone(id, on) {
    var d = LG.store.get('done', []), i = d.indexOf(id);
    if (on && i < 0) d.push(id);
    if (!on && i >= 0) d.splice(i, 1);
    LG.store.set('done', d);
    refreshProgress();
  }
  function refreshProgress() {
    var d = LG.store.get('done', []);
    var n = stops.filter(function (s) { return d.indexOf(s.id) >= 0; }).length;
    var pct = stops.length ? Math.round(100 * n / stops.length) : 0;
    document.getElementById('progFill').style.width = pct + '%';
    document.getElementById('progText').textContent = n + ' of ' + stops.length + ' stops done';
    document.getElementById('mProg').textContent = pct + '%';
    LG.$$('.station', nav).forEach(function (a) { a.classList.toggle('done', d.indexOf(a.getAttribute('data-id')) >= 0); });
    LG.$$('.done-btn').forEach(function (b) {
      var on = d.indexOf(b.closest('.stop').id) >= 0;
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'Done (click to undo)' : 'Mark this stop as done';
    });
  }
  function buildNav() {
    var html = '', last = null;
    stops.forEach(function (s, i) {
      var ln = s.getAttribute('data-line') || '1', L = LINES[ln];
      if (ln !== last) {
        html += '<p class="route-line" style="--seg:' + L.c + '">Line ' + ln + ' &middot; ' + esc(L.name) + '</p>';
        last = ln;
      }
      html += '<a class="station" href="#' + s.id + '" data-id="' + s.id + '" style="--seg:' + L.c + '">' +
        '<span class="dot" aria-hidden="true"></span><span class="lbl"><small>Stop ' + LG.pad2(i) + '</small>' +
        '<span class="t">' + esc(s.getAttribute('data-short')) + '</span></span></a>';
    });
    nav.innerHTML = html;
  }
  function decorate(s, i) {
    var ln = s.getAttribute('data-line') || '1', L = LINES[ln];
    s.style.setProperty('--line-c', L.c);
    var h1 = s.querySelector('h1'), head = LG.h('header', 'stop-head');
    head.innerHTML = '<div class="roundel" aria-hidden="true">' + LG.pad2(i) + '</div><p class="kicker"><b>Stop ' + LG.pad2(i) +
      '</b> &middot; Line ' + ln + ': ' + esc(L.name) + (s.getAttribute('data-time') ? ' &middot; ' + esc(s.getAttribute('data-time')) : '') + '</p>';
    s.insertBefore(head, h1);
    head.appendChild(h1);
    var prev = stops[i - 1], next = stops[i + 1], foot = LG.h('footer', 'stop-foot');
    foot.innerHTML = '<button type="button" class="btn done-btn" aria-pressed="false">Mark this stop as done</button><div class="nav-pair">' +
      (prev ? '<a class="btn" href="#' + prev.id + '">&larr; ' + esc(prev.getAttribute('data-short')) + '</a>' : '') +
      (next ? '<a class="btn primary next-btn" href="#' + next.id + '">Next: ' + esc(next.getAttribute('data-short')) + ' &rarr;</a>' : '') + '</div>';
    s.appendChild(foot);
    foot.querySelector('.done-btn').addEventListener('click', function () { setDone(s.id, !isDone(s.id)); });
    var nb = foot.querySelector('.next-btn');
    if (nb) nb.addEventListener('click', function () { setDone(s.id, true); });
  }
  function closeNav() {
    side.classList.remove('open');
    document.getElementById('navToggle').setAttribute('aria-expanded', 'false');
  }
  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    var target = id ? document.getElementById(id) : null;
    var sec = target ? (target.classList.contains('stop') ? target : target.closest('.stop')) : null;
    if (!sec) sec = document.getElementById(LG.store.get('last', '')) || stops[0];
    if (!sec || !sec.classList.contains('stop')) sec = stops[0];
    stops.forEach(function (s) { s.hidden = s !== sec; });
    LG.$$('.station', nav).forEach(function (a) {
      var on = a.getAttribute('data-id') === sec.id;
      a.classList.toggle('here', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    LG.store.set('last', sec.id);
    document.title = sec.getAttribute('data-short') + ' · The Git Line';
    closeNav();
    if (target && target !== sec) setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 30);
    else window.scrollTo(0, 0);
    var here = nav.querySelector('.here');
    if (here && window.matchMedia('(min-width: 901px)').matches) side.scrollTop = Math.max(0, here.offsetTop - side.clientHeight / 2);
    document.dispatchEvent(new CustomEvent('lg:stop', { detail: sec.id }));
  }
  LG.currentStop = function () { return stops.filter(function (s) { return !s.hidden; })[0]; };

  /* ---------- Windows version + theme ---------- */
  function setOS(v, how) {
    document.body.classList.toggle('os-10', v === '10');
    document.body.classList.toggle('os-11', v === '11');
    LG.os = v;
    LG.$$('[data-set-os]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-set-os') === v)); });
    if (how === 'user') LG.store.set('os', v);
    document.getElementById('osNote').textContent = how === 'auto'
      ? 'Your browser says this PC runs Windows ' + v + '. Instructions below match it.'
      : 'Instructions below are for Windows ' + v + '. Switch if that is wrong.';
    document.dispatchEvent(new CustomEvent('lg:os', { detail: v }));
  }
  function initOS() {
    LG.$$('[data-set-os]').forEach(function (b) {
      b.addEventListener('click', function () { setOS(b.getAttribute('data-set-os'), 'user'); });
    });
    var saved = LG.store.get('os', null);
    setOS(saved || '11', saved ? 'user' : 'default');
    var ua = navigator.userAgentData;
    if (!saved && ua && ua.platform === 'Windows' && ua.getHighEntropyValues) {
      // Microsoft documents this: platformVersion 13+ means Windows 11, 1 to 10 means Windows 10.
      ua.getHighEntropyValues(['platformVersion']).then(function (v) {
        var major = parseInt(String(v.platformVersion || '0').split('.')[0], 10);
        if (major >= 13) setOS('11', 'auto'); else if (major > 0) setOS('10', 'auto');
      }).catch(function () {});
    }
  }
  function initTheme() {
    var btn = document.getElementById('themeBtn'), root = document.documentElement;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : mq.matches; }
    function paint() {
      var dark = isDark();
      btn.textContent = dark ? 'Day' : 'Night';
      btn.setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
    }
    var saved = LG.store.get('theme', null);
    if (saved) root.setAttribute('data-theme', saved);
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      LG.store.set('theme', next);
      paint();
    });
    if (mq.addEventListener) mq.addEventListener('change', paint);
    paint();
  }

  function boot() {
    buildGloss();
    nav = document.getElementById('route');
    side = document.getElementById('sidebar');
    stops = LG.$$('section.stop');
    buildNav();
    stops.forEach(decorate);
    LG.initCode(document);
    LG.$$('[data-widget]').forEach(function (el) {
      var fn = LG.widgets[el.getAttribute('data-widget')];
      if (!fn) { console.warn('Unknown widget', el.getAttribute('data-widget')); return; }
      try { fn(el); } catch (e) {
        console.error(e);
        el.innerHTML = '<div class="co warn"><h4>Oops</h4><p>This interactive part failed to load. The text around it still explains everything.</p></div>';
      }
    });
    initTips();
    initOS();
    initTheme();
    refreshProgress();
    var tog = document.getElementById('navToggle');
    tog.addEventListener('click', function () {
      var open = !side.classList.contains('open');
      side.classList.toggle('open', open);
      tog.setAttribute('aria-expanded', String(open));
    });
    document.getElementById('main').addEventListener('click', closeNav);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeNav(); hideTip(); } });
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', boot);
})();

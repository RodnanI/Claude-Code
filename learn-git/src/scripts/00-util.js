/* Shared helpers. Everything in this guide hangs off one global: window.LG */
(function (LG) {
  'use strict';

  // ---------- DOM ----------
  LG.$ = (sel, root) => (root || document).querySelector(sel);
  LG.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  LG.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // tiny element builder: LG.el('button', { class: 'btn', onclick: fn }, 'Label')
  LG.el = function (tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  };

  // ---------- storage (never assume it works) ----------
  LG.store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode etc. */ }
    }
  };

  // ---------- events ----------
  const handlers = {};
  LG.on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); };
  LG.emit = (name, data) => { (handlers[name] || []).forEach((fn) => fn(data)); };

  // ---------- widgets register themselves here; the app mounts them lazily ----------
  LG.widgets = {};
  LG.widget = (name, init) => { LG.widgets[name] = init; };

  // ---------- clipboard ----------
  LG.copy = function (text, btn) {
    const done = () => {
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 1300);
    };
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, () => fallback());
        return;
      }
    } catch (e) { /* fall through */ }
    fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* nothing else to try */ }
      ta.remove();
    }
  };

  // ---------- text diffing (used by the simulator, the diff views and the time machine) ----------
  LG.splitLines = function (text) {
    if (text == null || text === '') return [];
    const lines = String(text).split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  };

  // Longest-common-subsequence alignment. Returns m where m[i] is the index in b matched to a[i], or -1.
  LG.lcsMatch = function (a, b) {
    const n = a.length, m = b.length;
    const dp = [];
    for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const match = new Array(n).fill(-1);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { match[i] = j; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    return match;
  };

  // A list of ops: {t: ' ' | '-' | '+', s: line, an: line number in a, bn: line number in b}
  LG.diffLines = function (aText, bText) {
    const a = LG.splitLines(aText), b = LG.splitLines(bText);
    const m = LG.lcsMatch(a, b);
    const ops = [];
    let j = 0;
    for (let i = 0; i < a.length; i++) {
      if (m[i] === -1) { ops.push({ t: '-', s: a[i] }); continue; }
      while (j < m[i]) ops.push({ t: '+', s: b[j++] });
      ops.push({ t: ' ', s: a[i] });
      j++;
    }
    while (j < b.length) ops.push({ t: '+', s: b[j++] });
    let an = 1, bn = 1;
    for (const op of ops) {
      op.an = an; op.bn = bn;
      if (op.t !== '+') an++;
      if (op.t !== '-') bn++;
    }
    return ops;
  };

  // Group diff ops into unified-diff hunks with `ctx` lines of context.
  LG.hunks = function (ops, ctx) {
    ctx = ctx == null ? 3 : ctx;
    const changed = [];
    ops.forEach((op, i) => { if (op.t !== ' ') changed.push(i); });
    if (!changed.length) return [];
    const ranges = [];
    let s = Math.max(0, changed[0] - ctx), e = Math.min(ops.length - 1, changed[0] + ctx);
    for (const ci of changed.slice(1)) {
      if (ci - ctx <= e + 1) e = Math.min(ops.length - 1, ci + ctx);
      else { ranges.push([s, e]); s = Math.max(0, ci - ctx); e = Math.min(ops.length - 1, ci + ctx); }
    }
    ranges.push([s, e]);
    return ranges.map(([from, to]) => {
      const lines = ops.slice(from, to + 1);
      const aCount = lines.filter((o) => o.t !== '+').length;
      const bCount = lines.filter((o) => o.t !== '-').length;
      const aStart = aCount ? lines.find((o) => o.t !== '+').an : lines[0].an - 1;
      const bStart = bCount ? lines.find((o) => o.t !== '-').bn : lines[0].bn - 1;
      return { header: `@@ -${aStart},${aCount} +${bStart},${bCount} @@`, lines };
    });
  };

  // Three-way line merge (the classic diff3 idea). Returns {text, conflict}.
  LG.merge3 = function (baseText, oursText, theirsText, oursLabel, theirsLabel) {
    const O = LG.splitLines(baseText), A = LG.splitLines(oursText), B = LG.splitLines(theirsText);
    const ma = LG.lcsMatch(O, A), mb = LG.lcsMatch(O, B);
    const out = [];
    let conflict = false;
    let i = 0, a = 0, b = 0;
    const same = (p, q) => p.length === q.length && p.every((s, k) => s === q[k]);
    const flush = (oEnd, aEnd, bEnd) => {
      const o = O.slice(i, oEnd), x = A.slice(a, aEnd), y = B.slice(b, bEnd);
      if (!o.length && !x.length && !y.length) return;
      if (same(x, y)) out.push(...x);
      else if (same(o, x)) out.push(...y);
      else if (same(o, y)) out.push(...x);
      else {
        conflict = true;
        out.push('<<<<<<< ' + oursLabel, ...x, '=======', ...y, '>>>>>>> ' + theirsLabel);
      }
    };
    for (;;) {
      let j = i;
      while (j < O.length && !(ma[j] >= a && mb[j] >= b)) j++;
      if (j >= O.length) { flush(O.length, A.length, B.length); break; }
      flush(j, ma[j], mb[j]);
      out.push(O[j]);
      i = j + 1; a = ma[j] + 1; b = mb[j] + 1;
    }
    return { text: out.length ? out.join('\n') + '\n' : '', conflict };
  };

  // ---------- .gitignore matching (the parts people actually use) ----------
  function globToRegex(glob) {
    let re = '';
    for (let i = 0; i < glob.length; i++) {
      const c = glob[i];
      if (c === '*') {
        if (glob[i + 1] === '*') {
          const before = i === 0 || glob[i - 1] === '/';
          if (before && glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; continue; }
          re += '.*'; i += 1; continue;
        }
        re += '[^/]*';
      } else if (c === '?') {
        re += '[^/]';
      } else if (c === '[') {
        const end = glob.indexOf(']', i + 1);
        if (end > i + 1) {
          let cls = glob.slice(i + 1, end);
          if (cls[0] === '!') cls = '^' + cls.slice(1);
          re += '[' + cls.replace(/\\/g, '\\\\') + ']';
          i = end;
        } else re += '\\[';
      } else {
        re += c.replace(/[.+^${}()|\\]/g, '\\$&');
      }
    }
    return new RegExp('^' + re + '$');
  }

  LG.globRe = globToRegex;

  LG.ignore = {
    compile(text) {
      const rules = [];
      String(text || '').split('\n').forEach((raw, idx) => {
        let line = raw.replace(/\s+$/, '');
        if (!line || line.startsWith('#')) return;
        let negate = false;
        if (line.startsWith('!')) { negate = true; line = line.slice(1); }
        else if (line.startsWith('\\#') || line.startsWith('\\!')) line = line.slice(1);
        let dirOnly = false;
        if (line.endsWith('/')) { dirOnly = true; line = line.slice(0, -1); }
        if (!line) return;
        const anchored = line.includes('/');
        if (line.startsWith('/')) line = line.slice(1);
        rules.push({ raw: raw.trim(), line: idx + 1, negate, dirOnly, anchored, re: globToRegex(line) });
      });
      return rules;
    },
    // path like "src/app.js", or "build/" for a folder. Returns {ignored, rule, via}
    test(rules, path) {
      const isDirPath = path.endsWith('/');
      const parts = path.split('/').filter(Boolean);
      let cur = '';
      for (let k = 0; k < parts.length; k++) {
        cur = cur ? cur + '/' + parts[k] : parts[k];
        const isDir = k < parts.length - 1 || isDirPath;
        let verdict = null;
        for (const r of rules) {
          if (r.dirOnly && !isDir) continue;
          if (r.re.test(r.anchored ? cur : parts[k])) verdict = r;
        }
        if (verdict && !verdict.negate) {
          return { ignored: true, rule: verdict, via: k < parts.length - 1 ? cur + '/' : null };
        }
        if (k === parts.length - 1) return { ignored: false, rule: verdict, via: null };
      }
      return { ignored: false, rule: null, via: null };
    }
  };

  // ---------- misc ----------
  LG.levenshtein = function (a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
    return dp[a.length][b.length];
  };

  // Deterministic fake SHA-1 looking hash (40 hex chars). Same input, same hash.
  LG.fakeSha = function (input) {
    let out = '';
    for (let k = 0; k < 5; k++) {
      let h = (0x811c9dc5 ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
      for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
      out += (h >>> 0).toString(16).padStart(8, '0');
    }
    return out;
  };

  LG.plural = (n, word, many) => `${n} ${n === 1 ? word : (many || word + 's')}`;
})(window.LG = window.LG || {});

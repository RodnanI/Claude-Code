/* Git simulator, part 3: branches, switching, merging, and the undo tools
   (reset, revert, stash) plus a conflict-free rebase. */
(function () {
  'use strict';
  var LG = window.LG, G = LG.git, C = G.cmds, esc = LG.esc;
  var copy = G.copy, keys = G.keys, union = G.union, short = G.short, has = G.has, plain = G.plain, optVal = G.optVal;
  var NAME_OK = /^(?!-)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._\/-]+$/;

  function badName(o, n) {
    o.err("fatal: '" + n + "' is not a valid branch name");
    o.note('Branch names cannot contain spaces or most symbols. Use dashes: fix-typo, dark-mode, add-footer.');
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  G.trackLine = function (r, o) {
    var up = r.upstream[r.head], hid = r.headId();
    if (r.detached || !up || !r.tracking[up] || !hid) return;
    var ahead = r.countBetween(r.tracking[up], hid), behind = r.countBetween(hid, r.tracking[up]);
    if (!ahead && !behind) o.l("Your branch is up to date with '" + up + "'.");
    else if (!behind) o.l("Your branch is ahead of '" + up + "' by " + plural(ahead, 'commit') + '.\n  (use "git push" to publish your local commits)');
    else if (!ahead) o.l("Your branch is behind '" + up + "' by " + plural(behind, 'commit') + ', and can be fast-forwarded.\n  (use "git pull" to update your local branch)');
    else o.l("Your branch and '" + up + "' have diverged,\nand have " + ahead + ' and ' + behind + ' different commits each, respectively.');
  };

  C.branch = function (r, a, o) {
    var p = plain(a);
    if (has(a, '-d') || has(a, '-D') || has(a, '--delete')) {
      if (!p.length) { o.err('fatal: branch name required'); return; }
      p.forEach(function (b) {
        if (!(b in r.branches)) { o.err("error: branch '" + b + "' not found"); return; }
        if (!r.detached && b === r.head) { o.err("error: cannot delete branch '" + b + "' used by worktree at '" + r.dirPath().replace(/\\/g, '/') + "'"); o.note('You cannot delete the branch you are standing on. Switch to another branch first.'); return; }
        var tip = r.branches[b], up = r.upstream[b];
        var merged = r.isAncestor(tip, r.headId()) || (up && r.isAncestor(tip, r.tracking[up]));
        if (!merged && !has(a, '-D')) {
          o.err("error: the branch '" + b + "' is not fully merged.");
          o.html('<span class="y">hint: If you are sure you want to delete it, run \'git branch -D ' + esc(b) + '\'.</span>');
          return;
        }
        delete r.branches[b];
        delete r.upstream[b];
        o.l('Deleted branch ' + b + ' (was ' + short(tip) + ').');
        o.ev.deleted = (o.ev.deleted || []).concat(b);
      });
      return;
    }
    if (has(a, '-m') || has(a, '-M')) {
      var from = p.length > 1 ? p[0] : r.head, to = p.length > 1 ? p[1] : p[0];
      if (!to) { o.err('fatal: branch name required'); return; }
      if (!NAME_OK.test(to)) { badName(o, to); return; }
      if (r.branches[to] && to !== from && !has(a, '-M')) { o.err("fatal: a branch named '" + to + "' already exists"); return; }
      var isCur = !r.detached && from === r.head;
      if (!(from in r.branches) && !isCur) { o.err('error: refname refs/heads/' + from + ' not found\nfatal: Branch rename failed'); return; }
      if (from in r.branches) { r.branches[to] = r.branches[from]; if (to !== from) delete r.branches[from]; }
      if (from in r.lanes && !(to in r.lanes)) r.lanes[to] = r.lanes[from];
      if (r.upstream[from]) { r.upstream[to] = r.upstream[from]; if (to !== from) delete r.upstream[from]; }
      if (isCur) r.head = to;
      o.ev.renamed = to;
      return;
    }
    var remotes = has(a, '-r') || has(a, '--remotes'), all = has(a, '-a') || has(a, '--all');
    if (!p.length || remotes || all) {
      if (!remotes) {
        if (r.detached) o.html('* <span class="g">(HEAD detached at ' + short(r.detached) + ')</span>');
        keys(r.branches).forEach(function (b) {
          var cur = !r.detached && b === r.head;
          o.html(cur ? '* <span class="g">' + esc(b) + '</span>' : '  ' + esc(b));
        });
        if (!keys(r.branches).length && !r.detached) o.note('Nothing listed yet: "' + r.head + '" only really exists once it has its first commit.');
      }
      if (remotes || all) keys(r.tracking).forEach(function (k) { o.html('  <span class="r">' + (all ? 'remotes/' : '') + esc(k) + '</span>'); });
      return;
    }
    var name = p[0], start = p[1] ? r.resolve(p[1]) : r.headId();
    if (!NAME_OK.test(name)) { badName(o, name); return; }
    if (r.branches[name]) { o.err("fatal: a branch named '" + name + "' already exists"); return; }
    if (!start) {
      o.err("fatal: not a valid object name: '" + (p[1] || r.head) + "'");
      if (p[1]) o.note('Branch names cannot contain spaces. Did you mean ' + p.join('-') + '?');
      else o.note('You need at least one commit before you can make a branch.');
      return;
    }
    r.branches[name] = start;
    o.ev.created = name;
  };

  function leaving(r, o) {
    if (!r.detached) return;
    var reach = {};
    keys(r.branches).forEach(function (b) { var an = r.ancestors(r.branches[b]); for (var k in an) reach[k] = 1; });
    if (reach[r.detached]) return;
    o.l('Warning: you are leaving 1 commit behind, not connected to\nany of your branches:\n\n  ' + short(r.detached) + ' ' + G.firstLine(r.commits[r.detached].msg) +
      '\n\nIf you want to keep it by creating a new branch, this may be a good time\nto do so with:\n\n git branch <new-branch-name> ' + short(r.detached) + '\n');
  }
  function enter(r, o, name, id, from) {
    var bl = r.checkoutTree(id);
    if (bl) { G.printBlocked(o, bl, 'checkout'); return false; }
    leaving(r, o);
    if (!r.detached) r.prevBranch = r.head;
    r.head = name;
    r.detached = null;
    r.log(id, 'checkout: moving from ' + from + ' to ' + name);
    return true;
  }
  function switchOrCheckout(r, a, o, cmd) {
    var flags = cmd === 'switch' ? ['-c', '--create', '-C'] : ['-b', '-B'], newName = optVal(a, flags), p = plain(a, flags);
    var from = r.detached ? short(r.detached) : r.head;
    if (cmd === 'checkout' && newName == null && (a.indexOf('--') >= 0 || (p[0] && !(p[0] in r.branches) && !r.resolve(p[0]) && r.findFile(p[0])))) {
      var n = 0;
      p.forEach(function (x) { var f = r.findFile(x); if (f && f in r.index) { r.work[f] = r.index[f]; n++; } });
      o.l('Updated ' + plural(n, 'path') + ' from the index');
      o.note('That is the old way to throw away edits. The modern command is git restore <file>.');
      return;
    }
    if (newName != null) {
      if (!newName) { o.err('error: switch `' + (cmd === 'switch' ? 'c' : 'b') + "' requires a value"); return; }
      if (!NAME_OK.test(newName)) { badName(o, newName); return; }
      if (r.branches[newName] && !has(a, '-C') && !has(a, '-B')) { o.err("fatal: a branch named '" + newName + "' already exists"); return; }
      var startId = p[0] ? r.resolve(p[0]) : r.headId();
      if (p[0] && !startId) { o.err('fatal: invalid reference: ' + p[0]); return; }
      if (!startId) { r.head = newName; o.l("Switched to a new branch '" + newName + "'"); o.ev.switched = newName; return; }
      var bl = r.checkoutTree(startId);
      if (bl) { G.printBlocked(o, bl, 'checkout'); return; }
      r.branches[newName] = startId;
      if (!r.detached) r.prevBranch = r.head;
      r.head = newName;
      r.detached = null;
      r.log(startId, 'checkout: moving from ' + from + ' to ' + newName);
      if (p[0] && r.tracking[p[0]]) { r.upstream[newName] = p[0]; o.l("branch '" + newName + "' set up to track '" + p[0] + "'."); }
      o.l("Switched to a new branch '" + newName + "'");
      o.ev.switched = newName;
      o.ev.created = newName;
      return;
    }
    var t = p[0];
    if (!t) { o.err(cmd === 'switch' ? 'fatal: missing branch or commit argument' : 'fatal: you must specify a branch to switch to'); return; }
    if (t === '-') {
      if (!r.prevBranch) { o.err('fatal: invalid reference: @{-1}'); return; }
      t = r.prevBranch;
    }
    if (t in r.branches) {
      if (!r.detached && t === r.head) { o.l("Already on '" + t + "'"); o.ev.switched = t; return; }
      if (!enter(r, o, t, r.branches[t], from)) return;
      o.l("Switched to branch '" + t + "'");
      G.trackLine(r, o);
      o.ev.switched = t;
      return;
    }
    var rem = keys(r.remotes).map(function (n) { return n + '/' + t; }).filter(function (k) { return r.tracking[k]; })[0];
    if (rem) {
      var id0 = r.tracking[rem];
      r.branches[t] = id0;
      if (!enter(r, o, t, id0, from)) { delete r.branches[t]; return; }
      r.upstream[t] = rem;
      o.l("branch '" + t + "' set up to track '" + rem + "'.");
      o.l("Switched to a new branch '" + t + "'");
      o.ev.switched = t;
      return;
    }
    var id = r.resolve(t);
    if (id) {
      if (cmd === 'switch' && !has(a, '--detach') && !has(a, '-d')) {
        o.err("fatal: a branch is expected, got commit '" + t + "'");
        o.html('<span class="y">hint: If you want to detach HEAD at the commit, try again with the --detach option.</span>');
        return;
      }
      var b2 = r.checkoutTree(id);
      if (b2) { G.printBlocked(o, b2, 'checkout'); return; }
      if (!r.detached) r.prevBranch = r.head;
      r.detached = id;
      r.log(id, 'checkout: moving from ' + from + ' to ' + t);
      o.l("Note: switching to '" + t + "'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\n" +
        'state without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n' +
        '  git switch -c <new-branch-name>\n\nOr undo this operation with:\n\n  git switch -\n');
      o.l('HEAD is now at ' + short(id) + ' ' + G.firstLine(r.commits[id].msg));
      o.ev.detached = id;
      return;
    }
    o.err(cmd === 'switch' ? 'fatal: invalid reference: ' + t : "error: pathspec '" + t + "' did not match any file(s) known to git");
  }
  C.switch = function (r, a, o) { switchOrCheckout(r, a, o, 'switch'); };
  C.checkout = function (r, a, o) { switchOrCheckout(r, a, o, 'checkout'); };

  /* Shared by merge and pull. Returns 'uptodate' | 'ff' | 'merged' | 'conflict' | 'blocked'. */
  G.doMerge = function (r, o, theirs, label, msg, noFF) {
    var ours = r.headId();
    if (ours && r.isAncestor(theirs, ours)) { o.l('Already up to date.'); return 'uptodate'; }
    if (!ours || (r.isAncestor(ours, theirs) && !noFF)) {
      var before = r.headTree(), bl = r.checkoutTree(theirs);
      if (bl) { G.printBlocked(o, bl, 'merge'); return 'blocked'; }
      r.moveTo(theirs, 'merge ' + label + ': Fast-forward');
      o.l('Updating ' + short(ours || theirs) + '..' + short(theirs));
      o.l('Fast-forward');
      G.printStats(o, G.stats(before, r.tree(theirs)), true);
      return 'ff';
    }
    var ot = r.tree(ours), m = G.mergeTrees(r.tree(r.mergeBase(ours, theirs)), ot, r.tree(theirs), label), st = r.status();
    var dirty = st.staged.concat(st.unstaged).map(function (x) { return x.f; }).filter(function (f) { return ot[f] !== m.tree[f] || m.conflicts.indexOf(f) >= 0; });
    if (dirty.length) { G.printBlocked(o, { files: dirty, kind: 'local' }, 'merge'); return 'blocked'; }
    var ut = st.untracked.filter(function (f) { return (f in m.tree) && !(f in ot); });
    if (ut.length) { G.printBlocked(o, { files: ut, kind: 'untracked' }, 'merge'); return 'blocked'; }
    var saved = { work: copy(r.work), index: copy(r.index) };
    union(ot, m.tree).forEach(function (f) {
      if (ot[f] === m.tree[f]) return;
      if (f in m.tree) { r.work[f] = m.tree[f]; if (m.conflicts.indexOf(f) < 0) r.index[f] = m.tree[f]; }
      else { delete r.work[f]; delete r.index[f]; }
    });
    m.touched.forEach(function (f) { o.l('Auto-merging ' + f); });
    if (m.conflicts.length) {
      m.conflicts.forEach(function (f) { o.l('CONFLICT (content): Merge conflict in ' + f); });
      o.l('Automatic merge failed; fix conflicts and then commit the result.');
      r.merging = { theirs: theirs, label: label, msg: msg, unresolved: m.conflicts.slice(), saved: saved };
      o.ev.conflict = m.conflicts.slice();
      o.failed = true;
      return 'conflict';
    }
    var c = r.makeCommit(msg, [ours, theirs], m.tree);
    r.moveTo(c.id, 'merge ' + label + ": Merge made by the 'ort' strategy.");
    if (r.once('mergeeditor')) o.note('On a real PC your editor may pop up here with the message "' + msg + '". Just save and close it. (Stuck in Vim? Type :wq and press Enter.)');
    o.l("Merge made by the 'ort' strategy.");
    G.printStats(o, G.stats(ot, c.tree), true);
    o.ev.commit = c.id;
    return 'merged';
  };
  C.merge = function (r, a, o) {
    if (has(a, '--abort')) {
      if (!r.merging) { o.err('fatal: There is no merge to abort (MERGE_HEAD missing).'); return; }
      r.work = r.merging.saved.work;
      r.index = r.merging.saved.index;
      r.merging = null;
      o.ev.aborted = true;
      o.note('Merge cancelled. Your files are back to how they were before git merge.');
      return;
    }
    if (has(a, '--continue')) {
      if (!r.merging) { o.err('fatal: There is no merge in progress (MERGE_HEAD missing).'); return; }
      C.commit(r, [], o);
      return;
    }
    if (r.merging) {
      o.err('error: Merging is not possible because you have unmerged files.');
      o.html('<span class="y">hint: Fix them up in the work tree, and then use \'git add/rm &lt;file&gt;\'</span>');
      o.err('fatal: Exiting because of an unresolved conflict.');
      return;
    }
    var name = plain(a, ['-m'])[0] || r.upstream[r.head];
    if (!name) { o.err('fatal: No remote for the current branch.'); return; }
    var theirs = r.resolve(name);
    if (!theirs) { o.err('merge: ' + name + ' - not something we can merge'); return; }
    var remote = !!r.tracking[name] && !r.branches[name];
    var msg = optVal(a, ['-m']) || (remote ? "Merge remote-tracking branch '" + name + "'" : "Merge branch '" + name + "'") +
      (r.detached || r.head === 'main' || r.head === 'master' ? '' : ' into ' + r.head);
    o.ev.result = G.doMerge(r, o, theirs, name, msg, has(a, '--no-ff'));
  };

  C.reset = function (r, a, o) {
    var mode = has(a, '--hard') ? 'hard' : has(a, '--soft') ? 'soft' : 'mixed', p = plain(a);
    if (!r.headId()) { r.index = {}; return; }
    var target = p[0] || 'HEAD', id = r.resolve(target), files = [];
    if (!id) files = p; else if (p.length > 1) files = p.slice(1);
    if (files.length) {
      var T = r.tree(id || r.headId()), bad = files.filter(function (x) { return !r.findFile(x, T); });
      if (bad.length) {
        o.err("fatal: ambiguous argument '" + bad[0] + "': unknown revision or path not in the working tree.");
        return;
      }
      files.forEach(function (x) { var f = r.findFile(x, T); if (f in T) r.index[f] = T[f]; else delete r.index[f]; });
      var u = r.status().unstaged;
      if (u.length) { o.l('Unstaged changes after reset:'); u.forEach(function (x) { o.l((x.k === 'deleted' ? 'D' : 'M') + '\t' + x.f); }); }
      o.ev.reset = 'files';
      return;
    }
    var untracked = keys(r.work).filter(function (f) { return !(f in r.index); });
    r.merging = null;
    r.moveTo(id, 'reset: moving to ' + target);
    var tree = r.tree(id);
    if (mode !== 'soft') r.index = copy(tree);
    if (mode === 'hard') {
      var W = copy(tree), old = r.work;
      untracked.forEach(function (f) { W[f] = old[f]; });
      r.work = W;
      o.l('HEAD is now at ' + short(id) + ' ' + G.firstLine(r.commits[id].msg));
    } else if (mode === 'mixed') {
      var un = r.status().unstaged;
      if (un.length) { o.l('Unstaged changes after reset:'); un.forEach(function (x) { o.l((x.k === 'deleted' ? 'D' : 'M') + '\t' + x.f); }); }
    }
    o.ev.reset = mode;
  };

  C.revert = function (r, a, o) {
    var ref = plain(a)[0];
    if (!ref) { o.err('usage: git revert [<options>] <commit-ish>...'); return; }
    var id = r.resolve(ref);
    if (!id) { o.err("fatal: bad revision '" + ref + "'"); return; }
    if (!r.isClean()) { o.err('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed'); return; }
    var c = r.commits[id];
    if (c.parents.length > 1) { o.err('error: commit ' + id + ' is a merge but no -m option was given.\nfatal: revert failed'); return; }
    var before = r.headTree(), m = G.mergeTrees(c.tree, before, r.tree(c.parents[0]), 'parent of ' + short(id));
    if (m.conflicts.length) {
      o.err('error: could not revert ' + short(id) + '... ' + G.firstLine(c.msg));
      o.note('Later commits changed the same lines, so the undo conflicts. Real Git would pause for you to fix it; this simulator cancels instead.');
      return;
    }
    var msg = 'Revert "' + G.firstLine(c.msg) + '"\n\nThis reverts commit ' + id + '.';
    var nc = r.makeCommit(msg, [r.headId()], m.tree);
    r.moveTo(nc.id, 'revert: ' + G.firstLine(msg));
    var W = copy(m.tree);
    keys(r.work).forEach(function (f) { if (!(f in before)) W[f] = r.work[f]; });
    r.index = copy(m.tree);
    r.work = W;
    if (!has(a, '--no-edit') && r.once('reverteditor')) o.note('On a real PC your editor opens with this message ready. Save and close to finish, or add --no-edit to skip the editor.');
    o.l('[' + (r.detached ? 'detached HEAD' : r.head) + ' ' + short(nc.id) + '] ' + G.firstLine(msg));
    G.printStats(o, G.stats(before, nc.tree));
    o.ev.commit = nc.id;
    o.ev.revert = id;
  };

  C.stash = function (r, a, o) {
    var sub = a[0] && a[0][0] !== '-' ? a[0] : 'push', rest = a[0] && a[0][0] !== '-' ? a.slice(1) : a, e;
    if (sub === 'save') sub = 'push';
    if (sub === 'push') {
      if (!r.headId()) { o.err('You do not have the initial commit yet'); return; }
      if (r.merging) { o.err('error: cannot stash while a merge is in progress. Finish or abort the merge first.'); return; }
      var incU = has(rest, '-u') || has(rest, '--include-untracked'), msg = optVal(rest, ['-m', '--message']), st = r.status();
      if (!st.staged.length && !st.unstaged.length && !(incU && st.untracked.length)) {
        o.l('No local changes to save');
        if (st.untracked.length) o.note('New files that were never added are "untracked", and a plain stash leaves them alone. git stash -u takes them too.');
        return;
      }
      var H = r.headTree(), hc = r.commits[r.headId()];
      e = { base: r.headId(), work: {}, index: copy(r.index), untracked: {}, id: G.hex(40),
        msg: msg ? 'On ' + r.head + ': ' + msg : 'WIP on ' + (r.detached ? '(no branch)' : r.head) + ': ' + short(hc.id) + ' ' + G.firstLine(hc.msg) };
      keys(r.index).forEach(function (f) { if (f in r.work) e.work[f] = r.work[f]; });
      var W = copy(H);
      st.untracked.forEach(function (f) { if (incU) e.untracked[f] = r.work[f]; else W[f] = r.work[f]; });
      r.index = copy(H);
      r.work = W;
      r.stash.unshift(e);
      o.l('Saved working directory and index state ' + e.msg);
      o.ev.stashed = true;
      return;
    }
    if (sub === 'list') { r.stash.forEach(function (s, i) { o.l('stash@{' + i + '}: ' + s.msg); }); return; }
    if (sub === 'clear') { r.stash = []; return; }
    var ref = plain(rest)[0], idx = 0;
    if (ref) {
      var mm = ref.match(/^stash@\{(\d+)\}$/) || ref.match(/^(\d+)$/);
      if (!mm) { o.err("error: '" + ref + "' is not a stash-like commit"); return; }
      idx = +mm[1];
    }
    e = r.stash[idx];
    if (!e) { o.err(r.stash.length ? 'error: stash@{' + idx + '} is not a valid reference' : 'No stash entries found.'); return; }
    if (sub === 'drop') { r.stash.splice(idx, 1); o.l('Dropped refs/stash@{' + idx + '} (' + e.id + ')'); return; }
    var B = r.tree(e.base);
    if (sub === 'show') { var full = copy(e.work); for (var u in e.untracked) full[u] = e.untracked[u]; G.printStats(o, G.stats(B, full), true); return; }
    if (sub !== 'pop' && sub !== 'apply') { o.err("error: unknown subcommand: '" + sub + "'"); return; }
    var changed = union(B, e.work, e.index).filter(function (f) { return e.work[f] !== B[f] || e.index[f] !== B[f]; });
    var cur = r.status(), dirty = cur.staged.concat(cur.unstaged).map(function (x) { return x.f; }).filter(function (f) { return changed.indexOf(f) >= 0; });
    var clash = keys(e.untracked).filter(function (f) { return f in r.work; });
    if (dirty.length || clash.length) {
      o.err('error: Your local changes to the following files would be overwritten by merge:\n\t' + dirty.concat(clash).join('\n\t') +
        '\nPlease commit your changes or stash them before you merge.\nAborting');
      o.l('The stash entry is kept in case you need it again.');
      return;
    }
    var H2 = r.headTree(), conflicts = [];
    changed.forEach(function (f) {
      var m = G.merge3(B[f], H2[f], e.work[f], 'Stashed changes');
      if (m.conflict) conflicts.push(f);
      if (m.c == null) { delete r.work[f]; if (!(f in e.index)) delete r.index[f]; }
      else {
        r.work[f] = m.c;
        if (!(f in B) && (f in e.index) && !m.conflict) r.index[f] = m.c;
      }
    });
    keys(e.untracked).forEach(function (f) { r.work[f] = e.untracked[f]; });
    conflicts.forEach(function (f) { o.l('CONFLICT (content): Merge conflict in ' + f); });
    G.printStatus(r, o);
    if (sub === 'pop' && !conflicts.length) { r.stash.splice(idx, 1); o.l('Dropped refs/stash@{' + idx + '} (' + e.id + ')'); }
    else if (conflicts.length) o.l('The stash entry is kept in case you need it again.');
    o.ev.unstashed = true;
  };

  C.rebase = function (r, a, o) {
    if (has(a, '--abort') || has(a, '--continue') || has(a, '--skip')) { o.err('fatal: No rebase in progress?'); return; }
    if (has(a, '-i') || has(a, '--interactive')) {
      o.note('Interactive rebase opens your editor with a to-do list of commits to reorder, squash or reword. It is powerful but out of scope here. Try it on a throwaway repo on your PC.');
      return;
    }
    var up = plain(a)[0] || r.upstream[r.head];
    if (!up) { o.err('There is no tracking information for the current branch.\nPlease specify which branch you want to rebase against.'); return; }
    var upId = r.resolve(up);
    if (!upId) { o.err("fatal: invalid upstream '" + up + "'"); return; }
    if (r.detached) { o.note('Switch to a branch first. This simulator only rebases branches.'); return; }
    if (!r.isClean()) { o.err('error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.'); return; }
    var ours = r.headId(), old = r.headTree();
    if (r.isAncestor(upId, ours)) { o.l('Current branch ' + r.head + ' is up to date.'); return; }
    var tip = upId, made = [];
    if (!r.isAncestor(ours, upId)) {
      var theirs = r.ancestors(upId), lane = r.laneFor(r.head);
      var mine = Object.keys(r.ancestors(ours)).filter(function (c) { return !theirs[c] && r.commits[c].parents.length < 2; })
        .sort(function (x, y) { return r.commits[x].n - r.commits[y].n; });
      for (var i = 0; i < mine.length; i++) {
        var c = r.commits[mine[i]], m = G.mergeTrees(r.tree(c.parents[0]), r.tree(tip), c.tree, short(c.id) + ' (' + G.firstLine(c.msg) + ')');
        if (m.conflicts.length) {
          made.forEach(function (id) { delete r.commits[id]; });
          o.err('error: could not apply ' + short(c.id) + '... ' + G.firstLine(c.msg));
          o.l('CONFLICT (content): Merge conflict in ' + m.conflicts[0]);
          o.note('Real Git would pause here so you can fix the file, git add it and run git rebase --continue. This simulator only does conflict-free rebases, so nothing was changed. git merge works fine instead.');
          return;
        }
        var nc = r.makeCommit(c.msg, [tip], m.tree, { lane: lane, author: c.author, email: c.email });
        made.push(nc.id);
        tip = nc.id;
      }
    }
    var W = copy(r.tree(tip));
    keys(r.work).forEach(function (f) { if (!(f in old)) W[f] = r.work[f]; });
    r.index = copy(r.tree(tip));
    r.work = W;
    r.moveTo(tip, 'rebase (finish): refs/heads/' + r.head + ' onto ' + upId);
    o.l('Successfully rebased and updated refs/heads/' + r.head + '.');
    o.ev.rebased = true;
  };
})();

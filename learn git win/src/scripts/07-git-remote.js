/* Git simulator, part 4: remotes. push, pull, fetch and clone against pretend
   GitHub repositories that live inside the page. */
(function () {
  'use strict';
  var LG = window.LG, G = LG.git, C = G.cmds, esc = LG.esc;
  var keys = G.keys, short = G.short, has = G.has, plain = G.plain;

  function web(url) { return String(url).replace(/\.git$/i, ''); }
  function noRepo(o, url) {
    o.err('remote: Repository not found.');
    o.err("fatal: repository '" + web(url) + "/' not found");
    o.note('Check the address for typos. The repository also has to exist on GitHub first: you create it on github.com.');
  }
  function notRemote(o, name) {
    o.err("fatal: '" + name + "' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\n" +
      'Please make sure you have the correct access rights\nand the repository exists.');
  }
  function signIn(r, o) {
    if (r.once('signin')) o.note('First contact with GitHub from a PC: a "Connect to GitHub" window pops up. Choose "Sign in with your browser", approve, done. Windows remembers it after that.');
  }

  C.remote = function (r, a, o) {
    var sub = a[0], p = plain(a.slice(1));
    if (!sub || sub === '-v' || sub === '--verbose') {
      keys(r.remotes).forEach(function (n) {
        if (sub) { o.l(n + '\t' + r.remotes[n] + ' (fetch)'); o.l(n + '\t' + r.remotes[n] + ' (push)'); }
        else o.l(n);
      });
      if (!keys(r.remotes).length) o.note('No output: this repository is not connected to any remote yet.');
      return;
    }
    if (sub === 'add') {
      if (p.length < 2) { o.err('usage: git remote add <name> <url>'); return; }
      if (r.remotes[p[0]]) { o.err('error: remote ' + p[0] + ' already exists.'); o.note('To change its address instead: git remote set-url ' + p[0] + ' <new-url>'); return; }
      r.remotes[p[0]] = p[1];
      o.ev.remoteAdded = p[0];
      if (!/^(https:\/\/|git@)/.test(p[1])) o.note('That does not look like a repository address. GitHub gives you one like https://github.com/you/my-site.git');
      return;
    }
    if (sub === 'remove' || sub === 'rm') {
      if (!r.remotes[p[0]]) { o.err("error: No such remote: '" + p[0] + "'"); return; }
      delete r.remotes[p[0]];
      keys(r.tracking).forEach(function (k) { if (k.indexOf(p[0] + '/') === 0) delete r.tracking[k]; });
      keys(r.upstream).forEach(function (b) { if (r.upstream[b].indexOf(p[0] + '/') === 0) delete r.upstream[b]; });
      return;
    }
    if (sub === 'set-url') {
      if (!r.remotes[p[0]] || !p[1]) { o.err("error: No such remote '" + p[0] + "'"); return; }
      r.remotes[p[0]] = p[1];
      return;
    }
    o.err("error: unknown subcommand: `" + sub + "'");
  };

  G.doFetch = function (r, o, remote) {
    var s = r.server(remote), lines = [];
    if (!s) { noRepo(o, r.remotes[remote]); return false; }
    signIn(r, o);
    keys(s.branches).forEach(function (b) {
      var k = remote + '/' + b, old = r.tracking[k], now = s.branches[b];
      if (old === now) return;
      lines.push(old ? '   ' + short(old) + '..' + short(now) + '  ' + LG.padEnd(b, 10) + ' -> ' + k : ' * [new branch]      ' + LG.padEnd(b, 10) + ' -> ' + k);
      r.tracking[k] = now;
    });
    if (lines.length) {
      var n = lines.length * 3;
      o.l('remote: Enumerating objects: ' + n + ', done.\nremote: Counting objects: 100% (' + n + '/' + n + '), done.\nremote: Total ' + n +
        ' (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)\nUnpacking objects: 100% (' + n + '/' + n + '), done.');
      o.l('From ' + web(r.remotes[remote]));
      lines.forEach(function (l) { o.l(l); });
    }
    return lines.length;
  };
  C.fetch = function (r, a, o) {
    if (!keys(r.remotes).length) { o.err('fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.'); return; }
    var names = has(a, '--all') ? keys(r.remotes) : [plain(a)[0] || 'origin'], got = 0;
    for (var i = 0; i < names.length; i++) {
      if (!r.remotes[names[i]]) { notRemote(o, names[i]); return; }
      var n = G.doFetch(r, o, names[i]);
      if (n === false) return;
      got += n;
    }
    if (!got) o.note('No output means there was nothing new to download.');
    o.ev.fetched = names;
  };

  C.pull = function (r, a, o) {
    if (r.detached) { o.err('You are not currently on a branch.\nPlease specify which branch you want to merge with.'); return; }
    if (r.merging) {
      o.err('error: Pulling is not possible because you have unmerged files.');
      o.html('<span class="y">hint: Fix them up in the work tree, and then use \'git add/rm &lt;file&gt;\'</span>');
      o.err('fatal: Exiting because of an unresolved conflict.');
      return;
    }
    var p = plain(a), remote, branch;
    if (p.length) { remote = p[0]; branch = p[1] || r.head; }
    else {
      var up = r.upstream[r.head];
      if (!up) {
        if (!keys(r.remotes).length) { o.err('fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.'); return; }
        o.err('There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n\n' +
          'If you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=origin/<branch> ' + r.head + '\n');
        return;
      }
      remote = up.split('/')[0];
      branch = up.slice(remote.length + 1);
    }
    if (!r.remotes[remote]) { notRemote(o, remote); return; }
    if (G.doFetch(r, o, remote) === false) return;
    var k = remote + '/' + branch, theirs = r.tracking[k];
    if (!theirs) { o.err("fatal: couldn't find remote ref " + branch); return; }
    if (has(a, '--rebase') || r.config['pull.rebase'] === 'true') { C.rebase(r, [k], o); o.ev.result = 'rebase'; return; }
    if ((has(a, '--ff-only') || r.config['pull.ff'] === 'only') && r.headId() && !r.isAncestor(r.headId(), theirs)) {
      o.html('<span class="y">hint: Diverging branches can\'t be fast-forwarded, you need to either:</span>');
      o.html('<span class="y">hint:   git merge --no-ff    or    git rebase</span>');
      o.err('fatal: Not possible to fast-forward, aborting.');
      return;
    }
    o.ev.result = G.doMerge(r, o, theirs, k, "Merge branch '" + branch + "' of " + web(r.remotes[remote]));
    if (o.ev.result === 'merged' && r.once('pullmerge')) o.note('Git just made a merge commit that ties your work and the downloaded work together. On the map it is the station where two lines meet.');
  };

  C.push = function (r, a, o) {
    var setUp = has(a, '-u') || has(a, '--set-upstream'), force = has(a, '-f') || has(a, '--force') || has(a, '--force-with-lease');
    var p = plain(a), remote = p[0], branch = p[1];
    if (!keys(r.remotes).length) {
      o.err('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\n' +
        'and then push using the remote name\n\n    git push <name>\n');
      return;
    }
    if (remote && !r.remotes[remote]) { notRemote(o, remote); return; }
    if (!branch && !has(a, '--tags')) {
      if (r.detached) { o.err('fatal: You are not currently on a branch.\nTo push the history leading to the current (detached HEAD)\nstate now, use\n\n    git push origin HEAD:<name-of-remote-branch>\n'); return; }
      branch = r.head;
      var up = r.upstream[branch];
      if (!up) {
        o.err('fatal: The current branch ' + branch + ' has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ' + (remote || 'origin') + ' ' + branch +
          "\n\nTo have this happen automatically for branches without a tracking\nupstream, see 'push.autoSetupRemote' in 'git help config'.\n");
        o.ev.noUpstream = true;
        return;
      }
      if (!remote) remote = up.split('/')[0];
    }
    remote = remote || 'origin';
    if (branch === 'HEAD') branch = r.head;
    var s = r.server(remote), url = r.remotes[remote];
    if (!s) { noRepo(o, url); return; }
    signIn(r, o);
    if (s.readonly) {
      o.err('remote: Permission to ' + web(url).replace(/^https:\/\/github\.com\//i, '') + '.git denied to you.');
      o.err("fatal: unable to access '" + web(url) + ".git/': The requested URL returned error: 403");
      o.note('You can only push to repositories you own or were invited to. For someone else\'s project: push to your fork, then open a pull request.');
      o.ev.denied = true;
      return;
    }
    var tagNames = has(a, '--tags') ? keys(r.tags) : (branch && r.tags[branch] && !r.branches[branch] ? [branch] : null);
    if (tagNames) {
      var fresh = tagNames.filter(function (t) { return s.tags[t] !== r.tags[t]; });
      if (!fresh.length) { o.l('Everything up-to-date'); return; }
      o.l('To ' + url);
      fresh.forEach(function (t) { s.tags[t] = r.tags[t]; o.l(' * [new tag]         ' + t + ' -> ' + t); });
      o.ev.pushedTags = fresh;
      return;
    }
    var id = r.branches[branch];
    if (!id) {
      o.err('error: src refspec ' + branch + " does not match any\nerror: failed to push some refs to '" + url + "'");
      o.note(r.headId() ? 'There is no local branch called "' + branch + '". List your branches with: git branch' : 'Nothing to push yet: you need at least one commit first.');
      return;
    }
    var old = s.branches[branch];
    function setUpstream() {
      r.upstream[branch] = remote + '/' + branch;
      o.l("branch '" + branch + "' set up to track '" + remote + '/' + branch + "'.");
    }
    if (old === id) { o.l('Everything up-to-date'); if (setUp) setUpstream(); o.ev.pushed = branch; return; }
    if (old && !r.isAncestor(old, id) && !force) {
      var fetched = r.tracking[remote + '/' + branch] === old;
      o.l('To ' + url);
      o.html('<span class="r"> ! [rejected]        ' + esc(branch) + ' -&gt; ' + esc(branch) + (fetched ? ' (non-fast-forward)' : ' (fetch first)') + '</span>');
      o.err("error: failed to push some refs to '" + url + "'");
      (fetched ? ['Updates were rejected because the tip of your current branch is behind', 'its remote counterpart. If you want to integrate the remote changes,', "use 'git pull' before pushing again."]
        : ['Updates were rejected because the remote contains work that you do not', 'have locally. This is usually caused by another repository pushing to',
          'the same ref. If you want to integrate the remote changes, use', "'git pull' before pushing again."])
        .concat(["See the 'Note about fast-forwards' in 'git push --help' for details."])
        .forEach(function (h) { o.html('<span class="y">hint: ' + esc(h) + '</span>'); });
      o.ev.rejected = true;
      return;
    }
    var n = old ? r.countBetween(old, id) : Object.keys(r.ancestors(id)).length, obj = n * 3;
    o.l('Enumerating objects: ' + obj + ', done.\nCounting objects: 100% (' + obj + '/' + obj + '), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (' +
      (n * 2) + '/' + (n * 2) + '), done.\nWriting objects: 100% (' + obj + '/' + obj + '), ' + (obj * 0.31).toFixed(2) + ' KiB | ' + (obj * 0.31).toFixed(2) +
      ' MiB/s, done.\nTotal ' + obj + ' (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)');
    if (!old && branch !== s.def) {
      o.l("remote: \nremote: Create a pull request for '" + branch + "' on GitHub by visiting:\nremote:      " + web(url) + '/pull/new/' + branch + '\nremote: ');
    }
    o.l('To ' + url);
    o.l(!old ? ' * [new branch]      ' + branch + ' -> ' + branch
      : !r.isAncestor(old, id) ? ' + ' + short(old) + '...' + short(id) + ' ' + branch + ' -> ' + branch + ' (forced update)'
        : '   ' + short(old) + '..' + short(id) + '  ' + branch + ' -> ' + branch);
    s.branches[branch] = id;
    r.tracking[remote + '/' + branch] = id;
    if (setUp) setUpstream();
    o.ev.pushed = branch;
    if (force && old && !r.isAncestor(old, id)) o.note('Force push replaced what was on GitHub. On a shared branch that deletes your teammates\' work. Only do it on branches nobody else uses.');
  };

  C.clone = function (r, a, o) {
    var p = plain(a), url = p[0];
    if (!url) { o.err('fatal: You must specify a repository to clone.\n\nusage: git clone [<options>] [--] <repo> [<dir>]'); return; }
    if (r.inRepo && r.initialized) {
      o.note('You are inside a repository already. You normally clone from a plain folder such as ' + r.base + ', so go up first: cd ..');
      o.failed = true;
      return;
    }
    var name = p[1] || web(url).split('/').pop();
    if (r.exists && name.toLowerCase() === r.name.toLowerCase()) { o.err("fatal: destination path '" + name + "' already exists and is not an empty directory."); return; }
    var s = r.serverByUrl(url);
    o.l("Cloning into '" + name + "'...");
    if (!s) { noRepo(o, url); return; }
    var n = Object.keys(r.ancestors(s.branches[s.def])).length * 3;
    o.l('remote: Enumerating objects: ' + n + ', done.\nremote: Counting objects: 100% (' + n + '/' + n + '), done.\nremote: Compressing objects: 100% (' + n + '/' + n +
      '), done.\nremote: Total ' + n + ' (delta 0), reused ' + n + ' (delta 0), pack-reused 0 (from 0)\nReceiving objects: 100% (' + n + '/' + n + '), done.');
    r.cloneFrom(s, url, name);
    r.inRepo = false;
    o.ev.cloned = name;
    if (r.once('clonecd')) o.note('The project landed in a new folder called ' + name + '. Your terminal is still standing outside it. Next: cd ' + name);
  };
})();

/* Kleiner Python-Tokenizer fuer die Syntaxhervorhebung. */
const Farbe = (() => {
  const SCHL = new Set([
    "False","None","True","and","as","assert","async","await","break","class","continue","def","del",
    "elif","else","except","finally","for","from","global","if","import","in","is","lambda","match",
    "case","nonlocal","not","or","pass","raise","return","try","while","with","yield"
  ]);
  const EING = new Set([
    "abs","aiter","all","anext","any","ascii","bin","bool","breakpoint","bytearray","bytes","callable",
    "chr","classmethod","compile","complex","delattr","dict","dir","divmod","enumerate","eval","exec",
    "filter","float","format","frozenset","getattr","globals","hasattr","hash","help","hex","id","input",
    "int","isinstance","issubclass","iter","len","list","locals","map","max","memoryview","min","next",
    "object","oct","open","ord","pow","print","property","range","repr","reversed","round","set","setattr",
    "slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip",
    "Exception","ValueError","TypeError","KeyError","IndexError","NameError","ZeroDivisionError",
    "AttributeError","FileNotFoundError","StopIteration","RuntimeError","ImportError","OSError",
    "NotImplementedError","AssertionError","KeyboardInterrupt","RecursionError","OverflowError"
  ]);

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sp = (k, t) => `<span class="s-${k}">${esc(t)}</span>`;

  function python(quelle) {
    const s = String(quelle);
    let aus = "";
    let i = 0;
    const n = s.length;

    while (i < n) {
      const c = s[i];

      // Kommentar
      if (c === "#") {
        let j = s.indexOf("\n", i);
        if (j === -1) j = n;
        aus += sp("kom", s.slice(i, j));
        i = j;
        continue;
      }

      // Zeichenkette, auch mit Praefix und dreifachen Anfuehrungszeichen
      const pre = /^(?:[rRbBuUfF]{0,3})(?:"""|'''|"|')/.exec(s.slice(i, i + 6));
      if (pre && /["']/.test(pre[0].slice(-1))) {
        const start = i;
        const pLen = pre[0].length - (pre[0].endsWith('"""') || pre[0].endsWith("'''") ? 3 : 1);
        const praefix = pre[0].slice(0, pLen);
        const zeichen = pre[0].slice(pLen);
        const roh = /r/i.test(praefix);
        i += pre[0].length;
        while (i < n) {
          if (!roh && s[i] === "\\") { i += 2; continue; }
          if (s.startsWith(zeichen, i)) { i += zeichen.length; break; }
          i++;
        }
        aus += sp("txt", s.slice(start, i));
        continue;
      }

      // Dekorator
      if (c === "@" && /[A-Za-z_]/.test(s[i + 1] || "")) {
        const m = /^@[A-Za-z_][\w.]*/.exec(s.slice(i));
        aus += sp("dek", m[0]);
        i += m[0].length;
        continue;
      }

      // Zahl
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] || ""))) {
        const m = /^(?:0[xXbBoO][0-9a-fA-F_]+|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d+)?j?)/.exec(s.slice(i));
        if (m) { aus += sp("zahl", m[0]); i += m[0].length; continue; }
      }

      // Name
      if (/[A-Za-z_]/.test(c)) {
        const m = /^[A-Za-z_]\w*/.exec(s.slice(i));
        const wort = m[0];
        i += wort.length;
        let j = i;
        while (j < n && s[j] === " ") j++;
        const folgtKlammer = s[j] === "(";
        if (SCHL.has(wort)) aus += sp("schl", wort);
        else if (wort === "self" || wort === "cls") aus += sp("selbst", wort);
        else if (EING.has(wort)) aus += sp("eing", wort);
        else if (folgtKlammer) aus += sp("fun", wort);
        else aus += esc(wort);
        continue;
      }

      // Operator
      if (/[+\-*/%=<>!&|^~@:,.;[\](){}]/.test(c)) {
        const m = /^(?:\*\*=?|\/\/=?|<<=?|>>=?|[<>=!]=|[-+*/%&|^@]=|->|[+\-*/%=<>!&|^~@:,.;[\](){}])/.exec(s.slice(i));
        aus += sp("op", m ? m[0] : c);
        i += m ? m[0].length : 1;
        continue;
      }

      aus += esc(c);
      i++;
    }
    return aus;
  }

  function schale(quelle) {
    return String(quelle).split("\n").map((z) => {
      const m = /^(\$|>>>|\.\.\.)(\s?)(.*)$/.exec(z);
      if (m) return sp("schl", m[1]) + esc(m[2]) + (m[1] === "$" ? esc(m[3]) : python(m[3]));
      return sp("kom", z);
    }).join("\n");
  }

  function textAus(quelle) { return esc(String(quelle)); }

  return { python, schale, textAus, esc };
})();

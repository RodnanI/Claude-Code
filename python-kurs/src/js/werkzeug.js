const W = (() => {
  const q = (s, k = document) => k.querySelector(s);
  const qa = (s, k = document) => Array.from(k.querySelectorAll(s));

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const ikon = (name, klasse = "") =>
    `<svg class="${klasse}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  const el = (tag, attr = {}, ...kinder) => {
    const k = document.createElement(tag);
    for (const [n, v] of Object.entries(attr)) {
      if (v == null || v === false) continue;
      if (n === "klasse") k.className = v;
      else if (n === "html") k.innerHTML = v;
      else if (n === "text") k.textContent = v;
      else if (n.startsWith("on") && typeof v === "function") k.addEventListener(n.slice(2), v);
      else k.setAttribute(n, v === true ? "" : v);
    }
    for (const kind of kinder.flat()) {
      if (kind == null || kind === false) continue;
      k.append(kind.nodeType ? kind : document.createTextNode(String(kind)));
    }
    return k;
  };

  const bremse = (fn, ms = 160) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  const melder = () => q("#melder");

  function melde(text, ikone = "check") {
    const box = melder();
    if (!box) return;
    const k = el("div", { klasse: "melde", html: `${ikon(ikone)}<span>${esc(text)}</span>` });
    box.append(k);
    setTimeout(() => {
      k.classList.add("weg");
      setTimeout(() => k.remove(), 300);
    }, 2400);
  }

  async function kopiere(text) {
    try {
      await navigator.clipboard.writeText(text);
      melde("In die Zwischenablage kopiert", "kopie");
      return true;
    } catch (_) {
      const f = el("textarea", { style: "position:fixed;opacity:0;top:0" });
      f.value = text;
      document.body.append(f);
      f.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      f.remove();
      melde(ok ? "In die Zwischenablage kopiert" : "Kopieren nicht moeglich", ok ? "kopie" : "warn");
      return ok;
    }
  }

  const zahl = (n) => new Intl.NumberFormat("de-DE").format(n);

  const dauerText = (min) => min >= 60
    ? `${Math.floor(min / 60)} Std ${min % 60 ? (min % 60) + " Min" : ""}`.trim()
    : `${min} Min`;

  const wenigerBewegung = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rollenZu(ziel = 0, sofort = false) {
    window.scrollTo({ top: ziel, behavior: sofort || wenigerBewegung() ? "auto" : "smooth" });
  }

  return { q, qa, esc, ikon, el, bremse, melde, kopiere, zahl, dauerText, rollenZu, wenigerBewegung };
})();

/* Wandelt die Inhaltsbausteine in HTML. Inline-Auszeichnung:
   **fett**  *kursiv*  `code`  [Text](#/ziel) */
const Markup = (() => {
  const esc = W.esc;

  function inline(roh) {
    const text = String(roh == null ? "" : roh);
    const depot = [];
    // Code-Abschnitte herausloesen, damit darin nichts weiter ersetzt wird
    let s = text.replace(/`([^`]+)`/g, (_, inhalt) => {
      depot.push(inhalt);
      return "@@KD" + (depot.length - 1) + "@@";
    });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\((#[^)\s]+)\)/g, (_, t, z) => `<a href="${z}">${t}</a>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(.,;:])\*([^*\n]+)\*(?=$|[\s).,;:!?])/g, "$1<em>$2</em>");
    s = s.replace(/@@KD(\d+)@@/g, (_, i) => `<code>${esc(depot[+i])}</code>`);
    return s;
  }

  function codeKarte(b) {
    const name = b.name || (b.shell ? "Terminal" : "Python");
    const laufbar = b.lauf !== false && !b.shell && !b.roh;
    const koerper = b.shell ? Farbe.schale(b.x) : (b.roh ? Farbe.textAus(b.x) : Farbe.python(b.x));
    const pakete = (b.pakete || []).join(",");
    const eingaben = b.eingaben ? esc(JSON.stringify(b.eingaben)) : "";

    let ausgabe;
    if (b.aus != null) {
      ausgabe = `<div class="ausgabe sichtbar"><div class="innen">
        <div class="a-kopf"><span class="punkt"></span>Ausgabe</div>
        <pre>${esc(b.aus)}</pre></div></div>`;
    } else {
      ausgabe = `<div class="ausgabe"><div class="innen">
        <div class="a-kopf"><span class="punkt"></span>Ausgabe</div>
        <pre></pre></div></div>`;
    }

    return `<div class="code-karte"${pakete ? ` data-pakete="${pakete}"` : ""}${eingaben ? ` data-eingaben="${eingaben}"` : ""}>
      <div class="code-leiste">
        <span class="code-name">${esc(name)}</span>
        <span class="luecke"></span>
        <button class="ikontaste" data-tat="kopieren" aria-label="Code kopieren" title="Kopieren">${W.ikon("kopie")}</button>
        ${laufbar ? `<button class="taste taste-klein" data-tat="laufen">${W.ikon("play")}<span>Ausfuehren</span></button>` : ""}
      </div>
      <pre class="code"><code>${koerper}</code></pre>
      ${ausgabe}
    </div>`;
  }

  function tabelle(b) {
    const kopf = b.kopf.map((z) => `<th>${inline(z)}</th>`).join("");
    const zeilen = b.zeilen.map((r) => `<tr>${r.map((z) => `<td>${inline(z)}</td>`).join("")}</tr>`).join("");
    return `<div class="tab-huelle"><table><thead><tr>${kopf}</tr></thead><tbody>${zeilen}</tbody></table></div>`;
  }

  const NOTIZ_IKON = { info: "info", warnung: "warn", tipp: "gluehbirne", merke: "stern" };
  const NOTIZ_WORT = { info: "Hinweis", warnung: "Achtung", tipp: "Tipp", merke: "Merke" };

  function notiz(b) {
    const art = b.art || "info";
    const titel = b.titel || NOTIZ_WORT[art];
    const absaetze = (Array.isArray(b.x) ? b.x : [b.x]).map((t) => `<p>${inline(t)}</p>`).join("");
    return `<div class="notiz ${art === "info" ? "" : art}">
      <div class="n-kopf">${W.ikon(NOTIZ_IKON[art])}<span>${esc(titel)}</span></div>
      ${absaetze}</div>`;
  }

  function block(b) {
    if (!b) return "";
    if (typeof b === "string") return `<p>${inline(b)}</p>`;
    switch (b.t) {
      case "p": return `<p>${inline(b.x)}</p>`;
      case "h2": return `<h2>${inline(b.x)}</h2>`;
      case "h": return `<h3>${inline(b.x)}</h3>`;
      case "h4": return `<h4>${inline(b.x)}</h4>`;
      case "code": return codeKarte(b);
      case "liste": return `<ul class="liste-block">${b.x.map((z) => `<li>${inline(z)}</li>`).join("")}</ul>`;
      case "nummern": return `<ol class="liste-block">${b.x.map((z) => `<li>${inline(z)}</li>`).join("")}</ol>`;
      case "notiz": return notiz(b);
      case "tabelle": return tabelle(b);
      case "trenner": return "<hr>";
      case "roh": return b.x;
      default: return "";
    }
  }

  function bloecke(liste) {
    return (liste || []).map(block).join("\n");
  }

  /* Macht Kopier- und Ausfuehrknoepfe lebendig. */
  function belebe(wurzel) {
    W.qa(".code-karte", wurzel).forEach((karte) => {
      if (karte.dataset.belebt) return;
      karte.dataset.belebt = "1";
      const feld = W.q("pre.code code", karte);
      const kopieren = W.q('[data-tat="kopieren"]', karte);
      const laufen = W.q('[data-tat="laufen"]', karte);
      if (kopieren) kopieren.addEventListener("click", () => W.kopiere(feld.textContent));
      if (laufen) laufen.addEventListener("click", () => Laufzeit.fuehreKarteAus(karte, feld.textContent));
    });
  }

  return { inline, bloecke, block, belebe, codeKarte };
})();

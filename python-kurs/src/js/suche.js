/* Volltextsuche ueber alle Lektionen. */
const Suche = (() => {
  const MAX = 8;

  function begriffe(text) {
    return text.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  }

  function finde(anfrage) {
    const worte = begriffe(anfrage);
    if (!worte.length) return [];

    const treffer = [];
    for (const eintrag of Register.suchIndex) {
      let punkte = 0;
      const titel = eintrag.lektion.titel.toLowerCase();
      for (const wort of worte) {
        if (titel.includes(wort)) punkte += 12;
        const stellen = eintrag.text.split(wort).length - 1;
        if (stellen === 0) { punkte = -1; break; }
        punkte += Math.min(stellen, 6);
      }
      if (punkte > 0) treffer.push({ lektion: eintrag.lektion, eintrag, punkte });
    }

    treffer.sort((a, b) => b.punkte - a.punkte || a.lektion.nummer - b.lektion.nummer);
    return treffer.slice(0, MAX);
  }

  /* Sucht einen lesbaren Ausschnitt rund um die erste Fundstelle. */
  function ausschnitt(eintrag, worte) {
    const text = eintrag.roh;
    let stelle = -1;
    for (const wort of worte) {
      const i = text.toLowerCase().indexOf(wort);
      if (i !== -1 && (stelle === -1 || i < stelle)) stelle = i;
    }
    if (stelle === -1) return text.slice(0, 90) + " ...";

    let anfang = Math.max(0, stelle - 40);
    const luecke = text.lastIndexOf(" ", anfang + 10);
    if (luecke > 0 && luecke < stelle) anfang = luecke + 1;
    const ende = Math.min(text.length, stelle + 70);
    return (anfang > 0 ? "... " : "") + text.slice(anfang, ende).trim() + (ende < text.length ? " ..." : "");
  }

  function hervorheben(text, anfrage) {
    const worte = begriffe(anfrage);
    let aus = W.esc(text);
    for (const wort of worte) {
      const muster = new RegExp("(" + wort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      aus = aus.replace(muster, "<mark>$1</mark>");
    }
    return aus;
  }

  function zeige(anfrage) {
    const box = W.q("#trefferListe");
    const baum = W.q("#navBaum");
    const schnell = W.q("#navSchnell");
    if (!box) return;

    if (!anfrage.trim()) {
      box.hidden = true;
      box.innerHTML = "";
      baum.hidden = false;
      schnell.hidden = false;
      return;
    }

    const treffer = finde(anfrage);
    baum.hidden = true;
    schnell.hidden = true;
    box.hidden = false;
    box.innerHTML = "";

    if (!treffer.length) {
      box.append(W.el("div", { klasse: "leer-hinweis",
        html: `Nichts gefunden zu <b>${W.esc(anfrage)}</b>` }));
      return;
    }

    const worte = begriffe(anfrage);
    treffer.forEach(({ lektion, eintrag }) => {
      const k = W.el("button", { klasse: "treffer", type: "button" },
        W.el("div", { klasse: "t-titel", html: hervorheben(lektion.titel, anfrage) }),
        W.el("div", { klasse: "t-weg", html: hervorheben(ausschnitt(eintrag, worte), anfrage) }),
        W.el("div", { klasse: "t-weg", style: "opacity:.75",
          text: `Modul ${lektion.modul.nr} - ${lektion.modul.titel}` })
      );
      k.addEventListener("click", () => {
        W.q("#sucheFeld").value = "";
        zeige("");
        location.hash = "#/lektion/" + lektion.id;
      });
      box.append(k);
    });
  }

  function start() {
    const feld = W.q("#sucheFeld");
    if (!feld) return;
    feld.addEventListener("input", W.bremse(() => zeige(feld.value), 130));
    feld.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { feld.value = ""; zeige(""); feld.blur(); }
      if (e.key === "Enter") {
        const erster = W.q(".treffer", W.q("#trefferListe"));
        if (erster) erster.click();
      }
    });
  }

  return { start, zeige, finde };
})();

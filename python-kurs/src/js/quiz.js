/* Wissensfragen mit sofortiger Rueckmeldung. */
const Quiz = (() => {
  const BUCHSTABEN = ["A", "B", "C", "D", "E", "F"];

  function frageKnoten(frage, nr, beiAntwort) {
    const box = W.el("div", { klasse: "frage" });
    const kopf = W.el("div", { klasse: "frage-kopf" },
      W.el("span", { klasse: "frage-nr", text: String(nr) }),
      W.el("div", { klasse: "frage-text", html: Markup.inline(frage.f) })
    );
    box.append(kopf);

    if (frage.code) {
      box.append(W.el("pre", { klasse: "f-code", html: `<code>${Farbe.python(frage.code)}</code>` }));
    }

    const liste = W.el("div", { klasse: "opt-liste" });
    const knoepfe = frage.o.map((text, i) => {
      const k = W.el("button", { klasse: "opt", type: "button" },
        W.el("span", { klasse: "opt-marke", text: BUCHSTABEN[i] || String(i + 1) }),
        W.el("span", { klasse: "opt-text", html: Markup.inline(text) })
      );
      k.addEventListener("click", () => waehle(i));
      liste.append(k);
      return k;
    });
    box.append(liste);

    let beantwortet = false;

    function waehle(i) {
      if (beantwortet) return;
      beantwortet = true;
      const richtig = i === frage.r;
      box.classList.add("beantwortet", richtig ? "richtig" : "falsch");

      knoepfe.forEach((k, j) => {
        k.disabled = true;
        if (j === frage.r) {
          k.classList.add("ist-richtig");
          W.q(".opt-marke", k).innerHTML = W.ikon("check");
        } else if (j === i) {
          k.classList.add("ist-falsch", "wackelt");
          W.q(".opt-marke", k).innerHTML = W.ikon("kreuz");
        } else {
          k.classList.add("gedimmt");
        }
      });

      if (frage.e) {
        const erk = W.el("div", { klasse: "erklaerung", html:
          `<b>${richtig ? "Richtig." : "Nicht ganz."}</b> ${Markup.inline(frage.e)}` });
        erk.style.animation = "zeile-ein var(--t-mittel) var(--kurve) both";
        box.append(erk);
      }
      beiAntwort(richtig);
    }

    return { knoten: box, gibAuf: () => { if (!beantwortet) waehle(-1); } };
  }

  /* Baut einen kompletten Fragenblock. quelle ist die Kennung fuer den Speicher. */
  function baue(fragen, einstellungen = {}) {
    const wurzel = W.el("div", { klasse: "quiz-block" });
    if (einstellungen.titel !== false) {
      wurzel.append(W.el("div", { klasse: "abschnitt-kopf" },
        W.el("h2", { text: einstellungen.titel || "Verstaendnisfragen" }),
        W.el("span", { klasse: "abschnitt-strich" })
      ));
    }
    if (einstellungen.vorspann) {
      wurzel.append(W.el("p", { klasse: "klein", html: Markup.inline(einstellungen.vorspann),
        style: "margin-bottom:1rem" }));
    }

    let richtig = 0;
    let beantwortet = 0;
    const gesamt = fragen.length;

    const stand = W.el("span", { klasse: "quiz-stand" });
    const balken = W.el("div", { klasse: "balken", style: "flex:1;min-width:7rem" }, W.el("i"));
    const nochmal = W.el("button", { klasse: "taste taste-klein", type: "button",
      html: `${W.ikon("zurueck")}<span>Nochmal</span>` });

    function aktualisiere() {
      stand.innerHTML = `<b>${richtig}</b> von <b>${gesamt}</b> richtig`;
      const anteil = gesamt ? (beantwortet / gesamt) * 100 : 0;
      W.q("i", balken).style.width = anteil + "%";
      balken.classList.toggle("gruen", beantwortet === gesamt && richtig / Math.max(1, gesamt) >= 0.7);
      if (beantwortet === gesamt && einstellungen.beiEnde) einstellungen.beiEnde(richtig, gesamt);
    }

    const behaelter = W.el("div");
    function fuelle() {
      behaelter.innerHTML = "";
      richtig = 0; beantwortet = 0;
      fragen.forEach((f, i) => {
        const k = frageKnoten(f, i + 1, (war) => {
          beantwortet++;
          if (war) richtig++;
          aktualisiere();
          if (einstellungen.quelle) Speicher.setzeQuiz(einstellungen.quelle, richtig, gesamt);
        });
        behaelter.append(k.knoten);
      });
      aktualisiere();
    }

    nochmal.addEventListener("click", () => { fuelle(); });
    wurzel.append(behaelter);
    wurzel.append(W.el("div", { klasse: "quiz-fuss" }, stand, balken, nochmal));
    fuelle();

    return wurzel;
  }

  return { baue };
})();

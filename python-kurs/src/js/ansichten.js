/* Baut die einzelnen Seiten des Kurses auf. */
const Ansichten = (() => {
  const el = W.el;
  const ikon = W.ikon;

  function abschnitt(titel, ...kinder) {
    return el("section", { klasse: "stapel", style: "margin-top:2.6rem" },
      el("div", { klasse: "abschnitt-kopf" },
        el("h2", { text: titel }),
        el("span", { klasse: "abschnitt-strich" })),
      ...kinder);
  }

  function ring(anteil) {
    const wert = Math.round(anteil * 100);
    return el("div", { klasse: "ring", style: `--wert:${wert}` },
      el("span", { text: wert + "%" }));
  }

  function balken(anteil, gruen = false) {
    const b = el("div", { klasse: "balken" + (gruen ? " gruen" : "") }, el("i"));
    requestAnimationFrame(() => { W.q("i", b).style.width = Math.round(anteil * 100) + "%"; });
    return b;
  }

  /* ------------------------------- Start ------------------------------- */
  function start() {
    const wurzel = el("div", { klasse: "bahn-weit seite-ein" });
    const f = Register.gesamtFortschritt();
    const letzte = Speicher.letzte();
    const letzteLektion = letzte ? Register.nachId.get(letzte) : null;
    const naechste = Register.lektionen.find((l) => !Speicher.lektionFertig(l));

    const held = el("header", { klasse: "held stufen" },
      el("span", { klasse: "abzeichen kupfer held-marke",
        html: `${ikon("schlange")}<span>Vollstaendiger Kurs auf Deutsch</span>` }),
      el("h1", { text: "Python von Grund auf lernen" }),
      el("p", { klasse: "held-text",
        text: "Von der ersten Zeile bis zu den Grundlagen der kuenstlichen Intelligenz. "
            + "Jedes Beispiel laeuft direkt im Browser, jede Lektion endet mit Fragen und Aufgaben, "
            + "die deine Loesung wirklich pruefen." }),
      el("div", { klasse: "held-tasten" },
        el("a", { klasse: "taste taste-voll taste-gross",
          href: "#/lektion/" + (naechste ? naechste.id : Register.lektionen[0].id),
          html: `<span>${f.fertig > 0 ? "Weiterlernen" : "Jetzt anfangen"}</span>${ikon("pfeil-r")}` }),
        el("a", { klasse: "taste taste-gross", href: "#/spielplatz",
          html: `${ikon("terminal")}<span>Uebungsplatz</span>` }))
    );
    wurzel.append(held);

    const kennzahlen = el("div", { klasse: "kennzahlen stufen" },
      kennzahl(Register.module.length, "Module"),
      kennzahl(Register.lektionen.length, "Lektionen"),
      kennzahl(Register.anzahlFragen, "Fragen"),
      kennzahl(Register.anzahlAufgaben, "Aufgaben"),
      kennzahl(Math.round(Register.gesamtDauer / 60) + " Std", "Lernzeit")
    );
    wurzel.append(kennzahlen);

    if (f.fertig > 0) {
      const karte = el("div", { klasse: "karte karte-kissen", style: "margin-top:2.6rem" },
        el("div", { klasse: "zeile-weit" },
          el("div", { klasse: "zeile" },
            ring(f.anteil),
            el("div", {},
              el("div", { style: "font-weight:600;font-size:1.05rem",
                text: `${f.fertig} von ${f.gesamt} Lektionen abgeschlossen` }),
              el("div", { klasse: "klein",
                text: letzteLektion ? "Zuletzt: " + letzteLektion.titel : "Weiter geht es" }))),
          naechste
            ? el("a", { klasse: "taste taste-voll", href: "#/lektion/" + naechste.id,
                html: `<span>Weiter</span>${ikon("pfeil-r")}` })
            : el("a", { klasse: "taste taste-voll", href: "#/abschluss",
                html: `${ikon("stern")}<span>Zur Abschlusspruefung</span>` })));
      wurzel.append(karte);
    }

    const gitter = el("div", { klasse: "modul-gitter stufen" });
    Register.module.forEach((m) => gitter.append(modulKarte(m)));
    wurzel.append(abschnitt("Der Lehrplan", gitter));

    const extras = el("div", { klasse: "modul-gitter" },
      extraKarte("terminal", "Uebungsplatz", "Ein freies Feld mit echtem Python. Zum Ausprobieren ohne Aufgabenstellung.", "#/spielplatz"),
      extraKarte("liste", "Spickzettel", "Die gesamte Syntax auf einer Seite, nach Themen geordnet.", "#/spickzettel"),
      extraKarte("buch", "Glossar", `${GLOSSAR.length} Begriffe aus Python und dem maschinellen Lernen, kurz erklaert.`, "#/glossar"),
      extraKarte("stern", "Abschlusspruefung", "Dreissig Fragen quer durch den gesamten Kurs.", "#/abschluss")
    );
    wurzel.append(abschnitt("Nachschlagen und ueben", extras));

    return wurzel;
  }

  function kennzahl(zahl, bezeichnung) {
    return el("div", { klasse: "kennzahl" },
      el("div", { klasse: "zahl", text: String(zahl) }),
      el("div", { klasse: "bez", text: bezeichnung }));
  }

  function extraKarte(sinnbild, titel, text, ziel) {
    return el("a", { klasse: "karte modul-karte", href: ziel },
      el("div", { klasse: "kopfzeile" },
        el("span", { klasse: "abzeichen", html: ikon(sinnbild) }),
        el("span", { klasse: "klein", html: ikon("pfeil-r") })),
      el("h3", { text: titel }),
      el("p", { text }));
  }

  function modulKarte(m) {
    const f = Register.modulFortschritt(m);
    const karte = el("a", { klasse: "karte modul-karte", href: "#/modul/" + m.id },
      el("div", { klasse: "kopfzeile" },
        el("span", { klasse: "abzeichen " + (f.anteil === 1 ? "gruen" : "kupfer"),
          html: `${ikon(m.ikon)}<span>Modul ${m.nr}</span>` }),
        el("span", { klasse: "klein", text: W.dauerText(Register.modulDauer(m)) })),
      el("h3", { text: m.titel }),
      el("p", { text: m.kurz }),
      el("div", { klasse: "fuss" },
        balken(f.anteil, f.anteil === 1),
        el("span", { text: `${f.fertig}/${f.gesamt}` })));
    return karte;
  }

  /* ------------------------------- Modul ------------------------------- */
  function modul(id) {
    const m = Register.modulNachId.get(id);
    if (!m) return fehlend();

    const f = Register.modulFortschritt(m);
    const wurzel = el("div", { klasse: "bahn seite-ein" });

    wurzel.append(el("header", { klasse: "lek-kopf" },
      el("div", { klasse: "weg" },
        el("a", { klasse: "abzeichen", href: "#/", html: `${ikon("pfeil-l")}<span>Uebersicht</span>` }),
        el("span", { klasse: "abzeichen kupfer", html: `${ikon(m.ikon)}<span>Modul ${m.nr}</span>` }),
        el("span", { klasse: "abzeichen", html: `${ikon("uhr")}<span>${W.dauerText(Register.modulDauer(m))}</span>` })),
      el("h1", { text: m.titel }),
      el("p", { klasse: "lek-vorspann", text: m.kurz })));

    wurzel.append(el("div", { klasse: "karte karte-kissen" },
      el("div", { klasse: "zeile-weit" },
        el("div", { klasse: "zeile" }, ring(f.anteil),
          el("div", {},
            el("div", { style: "font-weight:600", text: `${f.fertig} von ${f.gesamt} Lektionen` }),
            el("div", { klasse: "klein", text: f.anteil === 1 ? "Modul abgeschlossen" : "In Arbeit" }))),
        el("a", { klasse: "taste" + (f.anteil === 1 ? " taste-voll" : ""), href: "#/pruefung/" + m.id,
          html: `${ikon("ziel")}<span>Modulpruefung</span>` }))));

    const liste = el("div", { klasse: "stapel stufen", style: "margin-top:1.6rem" });
    m.lektionen.forEach((l) => liste.append(lektionsZeile(l)));
    wurzel.append(liste);

    const nav = el("nav", { klasse: "lauf-nav" });
    const vorheriges = Register.module[m.index - 1];
    const naechstes = Register.module[m.index + 1];
    if (vorheriges) nav.append(laufTaste(vorheriges, "#/modul/" + vorheriges.id, "Modul davor", false));
    if (naechstes) nav.append(laufTaste(naechstes, "#/modul/" + naechstes.id, "Modul danach", true));
    if (nav.childElementCount) wurzel.append(nav);

    return wurzel;
  }

  function lektionsZeile(l) {
    const fertig = Speicher.lektionFertig(l);
    const gesehen = Speicher.gesehen(l.id);
    return el("a", { klasse: "karte karte-kissen", href: "#/lektion/" + l.id,
      style: "display:flex;gap:1rem;align-items:center;text-decoration:none" },
      el("span", { klasse: "modul-nr", style: "width:2rem;height:2rem;font-size:.8rem"
          + (fertig ? ";background:var(--moos-weich);color:var(--moos);border-color:var(--moos)" : ""),
        html: fertig ? ikon("check") : String(l.imModul) }),
      el("div", { style: "flex:1;min-width:0" },
        el("div", { style: "font-weight:600;line-height:1.3", text: l.titel }),
        el("div", { klasse: "klein", style: "margin-top:.15rem",
          text: `${l.dauer} Min  -  ${(l.quiz || []).length} Fragen  -  ${(l.aufgaben || []).length} Aufgaben`
            + (fertig ? "  -  abgeschlossen" : gesehen ? "  -  angefangen" : "") })),
      el("span", { klasse: "klein", html: ikon("pfeil-r") }));
  }

  function laufTaste(ziel, adresse, beschriftung, vorwaerts) {
    return el("a", { klasse: "karte karte-kissen lauf-taste", href: adresse,
      style: "display:flex;gap:.8rem;align-items:center;text-decoration:none"
        + (vorwaerts ? ";text-align:right;flex-direction:row-reverse" : "") },
      el("span", { klasse: "klein", html: ikon(vorwaerts ? "pfeil-r" : "pfeil-l") }),
      el("span", { style: "flex:1;min-width:0" },
        el("span", { klasse: "klein", style: "display:block", text: beschriftung }),
        el("span", { style: "display:block;font-weight:600;line-height:1.3", text: ziel.titel })));
  }

  /* ------------------------------ Lektion ------------------------------ */
  function lektion(id) {
    const l = Register.nachId.get(id);
    if (!l) return fehlend();

    Speicher.markiereGesehen(l.id);
    const wurzel = el("article", { klasse: "bahn seite-ein" });

    wurzel.append(el("header", { klasse: "lek-kopf" },
      el("div", { klasse: "weg" },
        el("a", { klasse: "abzeichen", href: "#/modul/" + l.modul.id,
          html: `${ikon("pfeil-l")}<span>Modul ${l.modul.nr}</span>` }),
        el("span", { klasse: "abzeichen", text: `Lektion ${l.nummer} von ${Register.lektionen.length}` }),
        el("span", { klasse: "abzeichen", html: `${ikon("uhr")}<span>${l.dauer} Min</span>` }),
        Speicher.lektionFertig(l)
          ? el("span", { klasse: "abzeichen gruen", html: `${ikon("check")}<span>Abgeschlossen</span>` })
          : null),
      el("h1", { text: l.titel }),
      el("p", { klasse: "lek-vorspann", text: l.vorspann })));

    if (l.ziele && l.ziele.length) {
      wurzel.append(el("div", { klasse: "ziel-karte" },
        el("h2", { text: "Was du danach kannst" }),
        el("ul", { html: l.ziele.map((z) => `<li>${Markup.inline(z)}</li>`).join("") })));
    }

    const text = el("div", { klasse: "text-block", html: Markup.bloecke(l.inhalt) });
    wurzel.append(text);
    Markup.belebe(text);

    if (l.aufgaben && l.aufgaben.length) {
      const box = el("section", { style: "margin-top:3rem" },
        el("div", { klasse: "abschnitt-kopf" },
          el("h2", { text: l.aufgaben.length === 1 ? "Aufgabe" : "Aufgaben" }),
          el("span", { klasse: "abschnitt-strich" })),
        el("p", { klasse: "klein", style: "margin-bottom:1rem",
          text: "Schreibe deine Loesung und druecke auf Pruefen. Der Code laeuft wirklich, "
              + "und die Pruefschritte sagen dir genau, was noch fehlt." }));
      l.aufgaben.forEach((a) => box.append(Aufgabe.baue(a, l.id)));
      wurzel.append(box);
    }

    if (l.quiz && l.quiz.length) {
      wurzel.append(Quiz.baue(l.quiz, {
        quelle: l.id,
        titel: "Verstaendnisfragen",
        beiEnde: () => Navigation.auffrischen(),
      }));
    }

    const nav = el("nav", { klasse: "lauf-nav" });
    if (l.vorher) nav.append(laufTaste(l.vorher, "#/lektion/" + l.vorher.id, "Zurueck", false));
    if (l.nachher) nav.append(laufTaste(l.nachher, "#/lektion/" + l.nachher.id, "Weiter", true));
    else nav.append(el("a", { klasse: "karte karte-kissen lauf-taste", href: "#/abschluss",
      style: "display:flex;gap:.8rem;align-items:center;text-decoration:none;text-align:right;flex-direction:row-reverse" },
      el("span", { klasse: "klein", html: ikon("stern") }),
      el("span", { style: "flex:1" },
        el("span", { klasse: "klein", style: "display:block", text: "Geschafft" }),
        el("span", { style: "display:block;font-weight:600", text: "Zur Abschlusspruefung" }))));
    wurzel.append(nav);

    return wurzel;
  }

  /* ---------------------------- Uebungsplatz ---------------------------- */
  const SPIEL_SCHLUESSEL = "python-kurs.spielplatz.v1";

  function spielplatz() {
    const wurzel = el("div", { klasse: "bahn seite-ein" });

    wurzel.append(el("header", { klasse: "lek-kopf" },
      el("div", { klasse: "weg" },
        el("a", { klasse: "abzeichen", href: "#/", html: `${ikon("pfeil-l")}<span>Uebersicht</span>` }),
        el("span", { klasse: "abzeichen kupfer", html: `${ikon("terminal")}<span>Frei</span>` })),
      el("h1", { text: "Uebungsplatz" }),
      el("p", { klasse: "lek-vorspann",
        text: "Hier laeuft echtes Python, ohne Aufgabenstellung. Dein Code bleibt beim naechsten "
            + "Besuch erhalten. Mit Strg und Enter fuehrst du ihn aus." })));

    let start = 'name = "Welt"\nprint(f"Hallo {name}")\n\nfor i in range(1, 4):\n    print(i, i ** 2)\n';
    try {
      const gemerkt = window.localStorage.getItem(SPIEL_SCHLUESSEL);
      if (gemerkt) start = gemerkt;
    } catch (_) {}

    const schreiber = Editor.erstelle({ start, beiStart: () => laufen() });
    const leiste = el("div", { klasse: "editor-leiste" });
    const laufTaste = el("button", { klasse: "taste taste-klein taste-voll", type: "button",
      html: `${ikon("play")}<span>Ausfuehren</span>` });
    const leeren = el("button", { klasse: "taste taste-klein taste-still", type: "button",
      html: `${ikon("neu")}<span>Leeren</span>` });
    const kopieren = el("button", { klasse: "ikontaste", type: "button",
      title: "Code kopieren", "aria-label": "Code kopieren", html: ikon("kopie") });
    leiste.append(laufTaste, el("span", { klasse: "luecke" }),
      el("span", { klasse: "editor-stand", text: "Strg + Enter" }), kopieren, leeren);
    schreiber.knoten.append(leiste);

    const ausgabeBox = el("div", { klasse: "ausgabe sichtbar" },
      el("div", { klasse: "innen" },
        el("div", { klasse: "a-kopf" }, el("span", { klasse: "punkt" }), "Ausgabe"),
        el("pre", { html: '<span class="leer">Druecke auf Ausfuehren.</span>' })));
    schreiber.knoten.append(ausgabeBox);
    const feld = W.q("pre", ausgabeBox);

    function sichere() {
      try { window.localStorage.setItem(SPIEL_SCHLUESSEL, schreiber.wert()); } catch (_) {}
    }
    schreiber.feld.addEventListener("input", W.bremse(sichere, 600));

    async function laufen() {
      sichere();
      ausgabeBox.classList.remove("hat-fehler");
      feld.innerHTML = '<span class="laeuft"><span class="spinner"></span>Wird ausgefuehrt</span>';
      laufTaste.disabled = true;
      try {
        const e = await Laufzeit.fuehreAus(schreiber.wert(), { pakete: paketeErkennen(schreiber.wert()) });
        if (e.fehler) {
          ausgabeBox.classList.add("hat-fehler");
          feld.textContent = (e.ausgabe ? e.ausgabe + "\n" : "") + e.fehler;
        } else if (!e.ausgabe.trim()) {
          feld.innerHTML = '<span class="leer">Kein Text ausgegeben. Nutze print(), um etwas anzuzeigen.</span>';
        } else {
          feld.textContent = e.ausgabe;
        }
      } catch (e) {
        ausgabeBox.classList.add("hat-fehler");
        feld.textContent = String(e && e.message ? e.message : e);
      } finally {
        laufTaste.disabled = false;
      }
    }

    laufTaste.addEventListener("click", laufen);
    kopieren.addEventListener("click", () => W.kopiere(schreiber.wert()));
    leeren.addEventListener("click", () => {
      schreiber.setze("");
      sichere();
      feld.innerHTML = '<span class="leer">Druecke auf Ausfuehren.</span>';
      schreiber.fokus();
    });

    wurzel.append(schreiber.knoten);
    wurzel.append(el("div", { klasse: "notiz tipp", style: "margin-top:1.4rem" },
      el("div", { klasse: "n-kopf", html: `${ikon("gluehbirne")}<span>Was hier geht</span>` }),
      el("p", { html: "Die gesamte Standardbibliothek, dazu <code>numpy</code> und <code>pandas</code>, "
        + "wenn du sie einbindest. Dateien liegen in einem Dateisystem im Browser und verschwinden "
        + "beim Neuladen. Threads und <code>asyncio</code> funktionieren hier nicht." })));

    return wurzel;
  }

  function paketeErkennen(code) {
    const bekannt = ["numpy", "pandas", "matplotlib", "scipy", "sympy", "scikit-learn"];
    const gefunden = [];
    for (const p of bekannt) {
      const kurz = p === "scikit-learn" ? "sklearn" : p;
      if (new RegExp("(^|\\n)\\s*(import|from)\\s+" + kurz + "\\b").test(code)) gefunden.push(p);
    }
    return gefunden;
  }

  /* ------------------------- Glossar und Referenz ------------------------ */
  function glossar() {
    const wurzel = el("div", { klasse: "bahn seite-ein" });

    wurzel.append(el("header", { klasse: "lek-kopf" },
      el("div", { klasse: "weg" },
        el("a", { klasse: "abzeichen", href: "#/", html: `${ikon("pfeil-l")}<span>Uebersicht</span>` }),
        el("span", { klasse: "abzeichen kupfer", html: `${ikon("buch")}<span>${GLOSSAR.length} Begriffe</span>` })),
      el("h1", { text: "Glossar" }),
      el("p", { klasse: "lek-vorspann",
        text: "Die Begriffe aus dem Kurs, jeweils in einem oder zwei Saetzen erklaert." })));

    const filter = el("input", { type: "search", placeholder: "Begriff filtern",
      "aria-label": "Glossar filtern", autocomplete: "off",
      style: "width:100%;padding:.65rem .9rem;border-radius:var(--r-s);border:1px solid var(--linie);"
        + "background:var(--flaeche);color:var(--text);margin-bottom:1.2rem" });
    wurzel.append(filter);

    const liste = el("div", { klasse: "stapel" });
    wurzel.append(liste);

    function fuelle(anfrage = "") {
      const suche = anfrage.trim().toLowerCase();
      liste.innerHTML = "";
      const treffer = GLOSSAR.filter((g) =>
        !suche || g.b.toLowerCase().includes(suche) || g.t.toLowerCase().includes(suche));

      if (!treffer.length) {
        liste.append(el("div", { klasse: "leer-hinweis", text: "Kein Begriff gefunden." }));
        return;
      }
      treffer.forEach((g) => {
        liste.append(el("div", { klasse: "karte karte-kissen", style: "padding:.9rem 1.1rem" },
          el("div", { style: "font-weight:650;margin-bottom:.2rem", text: g.b }),
          el("div", { klasse: "klein", style: "color:var(--text-2);line-height:1.6",
            html: Markup.inline(g.t) })));
      });
    }

    filter.addEventListener("input", W.bremse(() => fuelle(filter.value), 120));
    fuelle();
    return wurzel;
  }

  function spickzettel() {
    const wurzel = el("div", { klasse: "bahn-weit seite-ein" });

    wurzel.append(el("header", { klasse: "lek-kopf" },
      el("div", { klasse: "weg" },
        el("a", { klasse: "abzeichen", href: "#/", html: `${ikon("pfeil-l")}<span>Uebersicht</span>` }),
        el("span", { klasse: "abzeichen kupfer", html: `${ikon("liste")}<span>Kurzreferenz</span>` }),
        el("button", { klasse: "abzeichen", type: "button", style: "cursor:pointer",
          html: `${ikon("druck")}<span>Drucken</span>`, onclick: () => window.print() })),
      el("h1", { text: "Spickzettel" }),
      el("p", { klasse: "lek-vorspann",
        text: "Die gesamte Syntax des Kurses, nach Themen geordnet. Zum Nachschlagen und Ausdrucken." })));

    const gitter = el("div", { style: "display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(22rem,1fr))" });

    SPICKZETTEL.forEach((gruppe) => {
      const zeilen = gruppe.zeilen.map(([was, wie]) =>
        `<tr><td style="white-space:nowrap;color:var(--text-3);vertical-align:top">${W.esc(was)}</td>`
        + `<td><code style="white-space:pre-wrap;display:block;line-height:1.7">`
        + `${W.esc(wie).split("\\n").join("\n")}</code></td></tr>`).join("");
      gitter.append(el("div", { klasse: "karte", style: "overflow:hidden" },
        el("div", { style: "padding:.7rem 1rem;background:var(--flaeche-2);border-bottom:1px solid var(--linie);"
          + "font-weight:650;font-size:.9rem", text: gruppe.titel }),
        el("div", { klasse: "tab-huelle", style: "border:0;border-radius:0",
          html: `<table style="font-size:.82rem"><tbody>${zeilen}</tbody></table>` })));
    });

    wurzel.append(gitter);
    return wurzel;
  }

  function fehlend() {
    return el("div", { klasse: "bahn seite-ein", style: "padding-top:4rem;text-align:center" },
      el("h1", { text: "Seite nicht gefunden" }),
      el("p", { klasse: "lek-vorspann", style: "margin:1rem auto 2rem",
        text: "Diese Adresse gehoert zu keiner Lektion des Kurses." }),
      el("a", { klasse: "taste taste-voll", href: "#/",
        html: `${ikon("pfeil-l")}<span>Zur Uebersicht</span>` }));
  }

  return { start, modul, lektion, spielplatz, glossar, spickzettel, fehlend, abschnitt, ring, balken, laufTaste };
})();

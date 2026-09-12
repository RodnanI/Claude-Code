/* Modulpruefungen und Abschlusspruefung. Die Fragen stammen aus den
   Lektionen und werden bei jedem Anlauf neu gemischt. */
const Pruefung = (() => {
  const el = W.el;
  const ikon = W.ikon;
  const BESTANDEN = 0.7;

  function ergebnisKarte(richtig, gesamt, zurueckZiel, nochmal) {
    const anteil = gesamt ? richtig / gesamt : 0;
    const geschafft = anteil >= BESTANDEN;
    const karte = el("div", { klasse: "karte karte-kissen", style: "margin-top:1.4rem" });

    karte.append(el("div", { klasse: "zeile-weit" },
      el("div", { klasse: "zeile" },
        Ansichten.ring(anteil),
        el("div", {},
          el("div", { style: "font-weight:650;font-size:1.05rem",
            text: geschafft ? "Bestanden" : "Noch nicht bestanden" }),
          el("div", { klasse: "klein",
            text: `${richtig} von ${gesamt} richtig, noetig sind ${Math.ceil(gesamt * BESTANDEN)}` }))),
      el("div", { klasse: "werkleiste" },
        el("button", { klasse: "taste", type: "button",
          html: `${ikon("zurueck")}<span>Neuer Anlauf</span>`, onclick: nochmal }),
        el("a", { klasse: "taste taste-voll", href: zurueckZiel,
          html: `<span>Weiter</span>${ikon("pfeil-r")}` }))));

    karte.style.animation = "steig var(--t-ruhig) var(--kurve-weich) both";
    return karte;
  }

  function baue(einstellungen) {
    const { titel, vorspann, marke, fragen, kennung, zurueckZiel, kopfzeile } = einstellungen;
    const wurzel = el("div", { klasse: "bahn seite-ein" });

    const kopf = el("header", { klasse: "lek-kopf" },
      el("div", { klasse: "weg" }, ...kopfzeile),
      el("h1", { text: titel }),
      el("p", { klasse: "lek-vorspann", text: vorspann }));
    wurzel.append(kopf);

    const bestes = Speicher.holePruefung(kennung);
    if (bestes) {
      const anteil = bestes.richtig / bestes.gesamt;
      wurzel.append(el("div", {
        klasse: "notiz " + (anteil >= BESTANDEN ? "tipp" : "warnung"),
        style: "margin-bottom:1.6rem" },
        el("div", { klasse: "n-kopf",
          html: `${ikon(anteil >= BESTANDEN ? "check" : "info")}<span>Bisher bestes Ergebnis</span>` }),
        el("p", { text: `${bestes.richtig} von ${bestes.gesamt} richtig, das sind ${Math.round(anteil * 100)} Prozent.` })));
    }

    wurzel.append(el("div", { klasse: "werkleiste", style: "margin-bottom:1.4rem" },
      el("span", { klasse: "abzeichen kupfer", html: `${ikon("ziel")}<span>${marke}</span>` }),
      el("span", { klasse: "abzeichen",
        text: `${einstellungen.anzahl ? Math.min(einstellungen.anzahl, fragen.length) : fragen.length} Fragen` }),
      el("span", { klasse: "abzeichen", text: `Bestanden ab ${Math.round(BESTANDEN * 100)} Prozent` })));

    const behaelter = el("div");
    wurzel.append(behaelter);

    function starte() {
      behaelter.innerHTML = "";
      const gezogen = Register.mische(fragen, einstellungen.anzahl);

      if (!gezogen.length) {
        behaelter.append(el("div", { klasse: "leer-hinweis", text: "Keine Fragen vorhanden." }));
        return;
      }

      const block = Quiz.baue(gezogen, {
        titel: false,
        beiEnde: (richtig, gesamt) => {
          Speicher.setzePruefung(kennung, richtig, gesamt);
          Navigation.auffrischen();
          const karte = ergebnisKarte(richtig, gesamt, zurueckZiel, starte);
          behaelter.append(karte);
          karte.scrollIntoView({ behavior: W.wenigerBewegung() ? "auto" : "smooth", block: "center" });
        },
      });
      behaelter.append(block);
      W.rollenZu(0);
    }

    starte();
    return wurzel;
  }

  function modul(id) {
    const m = Register.modulNachId.get(id);
    if (!m) return Ansichten.fehlend();

    return baue({
      titel: `Pruefung: ${m.titel}`,
      vorspann: "Die Fragen stammen aus allen Lektionen dieses Moduls und sind bei jedem Anlauf "
              + "neu gemischt. Du siehst sofort, ob deine Antwort stimmt.",
      marke: `Modul ${m.nr}`,
      fragen: Register.fragenSammeln(m),
      anzahl: 12,
      kennung: "modul-" + m.id,
      zurueckZiel: "#/modul/" + m.id,
      kopfzeile: [
        el("a", { klasse: "abzeichen", href: "#/modul/" + m.id,
          html: `${ikon("pfeil-l")}<span>Zurueck zum Modul</span>` }),
        el("span", { klasse: "abzeichen", html: `${ikon(m.ikon)}<span>${m.titel}</span>` }),
      ],
    });
  }

  function abschluss() {
    const f = Register.gesamtFortschritt();
    const wurzel = baue({
      titel: "Abschlusspruefung",
      vorspann: "Dreissig Fragen quer durch den gesamten Kurs, bei jedem Anlauf neu zusammengestellt. "
              + "Nimm dir Zeit und lies jede Frage genau.",
      marke: "Gesamter Kurs",
      fragen: Register.fragenSammeln(null),
      anzahl: 30,
      kennung: "abschluss",
      zurueckZiel: "#/",
      kopfzeile: [
        el("a", { klasse: "abzeichen", href: "#/", html: `${ikon("pfeil-l")}<span>Uebersicht</span>` }),
        el("span", { klasse: "abzeichen gold", html: `${ikon("stern")}<span>Abschluss</span>` }),
      ],
    });

    if (f.anteil < 0.5) {
      const hinweis = el("div", { klasse: "notiz", style: "margin-bottom:1.4rem" },
        el("div", { klasse: "n-kopf", html: `${ikon("info")}<span>Noch frueh</span>` }),
        el("p", { text: `Du hast bisher ${f.fertig} von ${f.gesamt} Lektionen abgeschlossen. `
          + "Die Pruefung deckt den gesamten Kurs ab, du kannst sie aber jederzeit als Standortbestimmung nutzen." }));
      wurzel.insertBefore(hinweis, wurzel.children[1]);
    }

    return wurzel;
  }

  return { modul, abschluss };
})();

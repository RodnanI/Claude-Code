/* Programmieraufgabe mit Schreibfeld, Tipps und automatischer Pruefung. */
const Aufgabe = (() => {

  function testZeile(e) {
    return W.el("div", { klasse: "test-zeile " + (e.ok ? "ok" : "nein") },
      W.el("span", { klasse: "test-marke", html: W.ikon(e.ok ? "check" : "kreuz") }),
      W.el("span", { klasse: "t-name" },
        W.el("span", { text: e.name }),
        !e.ok && e.grund ? W.el("span", { klasse: "t-grund", text: e.grund }) : null
      )
    );
  }

  function baue(aufgabe, lektionId) {
    const wurzel = W.el("div", { klasse: "aufgabe" });
    const schonGeloest = Speicher.aufgabeGeloest(lektionId, aufgabe.id);
    if (schonGeloest) wurzel.classList.add("geloest");

    const marke = W.el("span", {
      klasse: "abzeichen " + (schonGeloest ? "gruen" : "kupfer"),
      html: schonGeloest ? `${W.ikon("check")}<span>Geloest</span>` : `${W.ikon("werkzeug")}<span>Aufgabe</span>`,
    });

    const kopf = W.el("div", { klasse: "auf-kopf" },
      W.el("div", { klasse: "zeile-weit" },
        W.el("h3", { text: aufgabe.titel }),
        marke
      ),
      W.el("div", { klasse: "auf-text", html: Markup.bloecke(aufgabe.text) })
    );

    const koerper = W.el("div", { klasse: "auf-koerper" });

    const schreiber = Editor.erstelle({
      start: aufgabe.start || "",
      beschriftung: "Loesung fuer: " + aufgabe.titel,
      beiStart: () => pruefe(),
    });

    const leiste = W.el("div", { klasse: "editor-leiste" });
    const laufen = W.el("button", { klasse: "taste taste-klein", type: "button",
      html: `${W.ikon("play")}<span>Ausfuehren</span>` });
    const pruefen = W.el("button", { klasse: "taste taste-klein taste-voll", type: "button",
      html: `${W.ikon("check")}<span>Pruefen</span>` });
    const zurueck = W.el("button", { klasse: "ikontaste", type: "button",
      title: "Auf den Anfangszustand zuruecksetzen", "aria-label": "Zuruecksetzen",
      html: W.ikon("zurueck") });
    const zeigen = W.el("button", { klasse: "taste taste-klein taste-still", type: "button",
      html: `${W.ikon("schluessel")}<span>Loesung</span>` });
    leiste.append(pruefen, laufen, W.el("span", { klasse: "luecke" }),
      W.el("span", { klasse: "editor-stand", text: "Strg + Enter prueft" }), zurueck, zeigen);
    schreiber.knoten.append(leiste);

    const ausgabeBox = W.el("div", { klasse: "ausgabe" },
      W.el("div", { klasse: "innen" },
        W.el("div", { klasse: "a-kopf" }, W.el("span", { klasse: "punkt" }), "Ausgabe"),
        W.el("pre")
      )
    );
    schreiber.knoten.append(ausgabeBox);
    const ausgabeFeld = W.q("pre", ausgabeBox);

    koerper.append(schreiber.knoten);

    if (aufgabe.tipps && aufgabe.tipps.length) {
      const tippBox = W.el("div", { klasse: "tipp-block" });
      const schalter = W.el("button", { klasse: "tipp-schalter", type: "button",
        html: `${W.ikon("gluehbirne")}<span>Tipps anzeigen (${aufgabe.tipps.length})</span>${W.ikon("chevron-u", "pfeil")}` });
      const inhalt = W.el("div", { klasse: "tipp-inhalt" },
        W.el("div", {}, W.el("ol", { html: aufgabe.tipps.map((t) => `<li>${Markup.inline(t)}</li>`).join("") }))
      );
      schalter.addEventListener("click", () => tippBox.classList.toggle("offen"));
      tippBox.append(schalter, inhalt);
      koerper.append(tippBox);
    }

    const testBox = W.el("div", { klasse: "test-block", hidden: true });
    koerper.append(testBox);

    const loesungsPlatz = W.el("div");
    koerper.append(loesungsPlatz);

    wurzel.append(kopf, koerper);

    function setzeLaufend(an) {
      laufen.disabled = an;
      pruefen.disabled = an;
    }

    async function laufenLassen() {
      ausgabeBox.classList.add("sichtbar");
      ausgabeBox.classList.remove("hat-fehler");
      ausgabeFeld.innerHTML = '<span class="laeuft"><span class="spinner"></span>Wird ausgefuehrt</span>';
      setzeLaufend(true);
      try {
        const e = await Laufzeit.fuehreAus(schreiber.wert(), {
          eingaben: aufgabe.eingaben || [], pakete: aufgabe.pakete || [],
        });
        if (e.fehler) {
          ausgabeBox.classList.add("hat-fehler");
          ausgabeFeld.textContent = (e.ausgabe ? e.ausgabe + "\n" : "") + e.fehler;
        } else if (!e.ausgabe.trim()) {
          ausgabeFeld.innerHTML = '<span class="leer">Kein Text ausgegeben.</span>';
        } else {
          ausgabeFeld.textContent = e.ausgabe;
        }
      } catch (e) {
        ausgabeBox.classList.add("hat-fehler");
        ausgabeFeld.textContent = String(e && e.message ? e.message : e);
      } finally {
        setzeLaufend(false);
      }
    }

    async function pruefe() {
      testBox.hidden = false;
      testBox.innerHTML = "";
      testBox.append(W.el("div", { klasse: "test-kopf" },
        W.el("span", { klasse: "laeuft" }, W.el("span", { klasse: "spinner" }), "Pruefung laeuft")));
      setzeLaufend(true);

      try {
        const e = await Laufzeit.fuehreAus(schreiber.wert(), {
          eingaben: aufgabe.eingaben || [],
          pakete: aufgabe.pakete || [],
          tests: aufgabe.tests || [],
        });

        ausgabeBox.classList.add("sichtbar");
        ausgabeBox.classList.toggle("hat-fehler", !!e.fehler);
        if (e.fehler) ausgabeFeld.textContent = (e.ausgabe ? e.ausgabe + "\n" : "") + e.fehler;
        else if (!e.ausgabe.trim()) ausgabeFeld.innerHTML = '<span class="leer">Kein Text ausgegeben.</span>';
        else ausgabeFeld.textContent = e.ausgabe;

        testBox.innerHTML = "";
        if (e.fehler) {
          testBox.append(W.el("div", { klasse: "test-kopf" },
            W.el("span", { html: W.ikon("warn"), style: "color:var(--rost);display:flex" }),
            W.el("span", { text: "Der Code laeuft noch nicht durch" })));
          testBox.append(W.el("div", { klasse: "test-zeile nein" },
            W.el("span", { klasse: "test-marke", html: W.ikon("kreuz") }),
            W.el("span", { klasse: "t-name" },
              W.el("span", { text: "Behebe zuerst den Fehler in der Ausgabe" }))));
          wurzel.classList.remove("geloest");
          return;
        }

        const treffer = e.tests.filter((t) => t.ok).length;
        const alle = e.tests.length;
        const bestanden = alle > 0 && treffer === alle;

        testBox.append(W.el("div", { klasse: "test-kopf" },
          W.el("span", { html: W.ikon(bestanden ? "check" : "warn"),
            style: `color:var(--${bestanden ? "moos" : "rost"});display:flex` }),
          W.el("span", { text: bestanden ? "Alle Pruefungen bestanden" : "Noch nicht ganz" }),
          W.el("span", { klasse: "zaehler", text: `${treffer} / ${alle}` })));

        const liste = W.el("div", { klasse: "test-liste" });
        e.tests.forEach((t, i) => {
          const z = testZeile(t);
          z.style.animationDelay = (i * 40) + "ms";
          liste.append(z);
        });
        testBox.append(liste);

        if (bestanden) {
          wurzel.classList.add("geloest");
          marke.className = "abzeichen gruen";
          marke.innerHTML = `${W.ikon("check")}<span>Geloest</span>`;
          if (!Speicher.aufgabeGeloest(lektionId, aufgabe.id)) {
            Speicher.setzeAufgabe(lektionId, aufgabe.id);
            W.melde("Aufgabe geloest", "check");
          }
        } else {
          wurzel.classList.remove("geloest");
        }
      } catch (err) {
        const text = String(err && err.message ? err.message : err);
        testBox.innerHTML = "";
        testBox.append(W.el("div", { klasse: "test-kopf" },
          W.el("span", { html: W.ikon("warn"), style: "color:var(--rost);display:flex" }),
          W.el("span", { text: "Pruefung nicht moeglich" })));
        testBox.append(W.el("div", { klasse: "test-zeile nein" },
          W.el("span", { klasse: "test-marke", html: W.ikon("kreuz") }),
          W.el("span", { klasse: "t-name", style: "white-space:pre-wrap", text })));
      } finally {
        setzeLaufend(false);
      }
    }

    laufen.addEventListener("click", laufenLassen);
    pruefen.addEventListener("click", pruefe);
    zurueck.addEventListener("click", () => {
      schreiber.setze(aufgabe.start || "");
      testBox.hidden = true;
      ausgabeBox.classList.remove("sichtbar");
      W.melde("Zuruckgesetzt", "zurueck");
    });
    zeigen.addEventListener("click", () => {
      if (loesungsPlatz.childElementCount) { loesungsPlatz.innerHTML = ""; zeigen.querySelector("span").textContent = "Loesung"; return; }
      loesungsPlatz.innerHTML = Markup.bloecke([
        { t: "code", x: aufgabe.loesung || "", name: "Ein moeglicher Weg", lauf: false },
        ...(aufgabe.loesungstext ? [{ t: "notiz", art: "tipp", titel: "Zur Loesung", x: aufgabe.loesungstext }] : []),
      ]);
      Markup.belebe(loesungsPlatz);
      zeigen.querySelector("span").textContent = "Ausblenden";
    });

    return wurzel;
  }

  return { baue };
})();

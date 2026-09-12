/* Seitennavigation, Tastenkuerzel und Start. */
const Navigation = (() => {
  const el = W.el;
  const ikon = W.ikon;
  const offeneModule = new Set();

  function schnellLinks() {
    const box = W.q("#navSchnell");
    if (!box) return;
    box.innerHTML = "";
    const eintraege = [
      ["haus", "Uebersicht", "#/", "schlange"],
      ["spiel", "Uebungsplatz", "#/spielplatz", "terminal"],
      ["spick", "Spickzettel", "#/spickzettel", "liste"],
      ["glossar", "Glossar", "#/glossar", "buch"],
      ["abschluss", "Abschlusspruefung", "#/abschluss", "stern"],
      ["technik", "Technikpruefung", "#/technik", "werkzeug"],
    ];
    const aktuell = Router.weg();
    eintraege.forEach(([, beschriftung, ziel, sinnbild]) => {
      box.append(el("a", { klasse: "lek-link" + (aktuell === ziel.slice(1) ? " aktiv" : ""), href: ziel },
        el("span", { klasse: "klein", style: "display:flex", html: ikon(sinnbild) }),
        el("span", { klasse: "lek-titel", text: beschriftung })));
    });
  }

  function baum() {
    const box = W.q("#navBaum");
    if (!box) return;
    const aktuell = Router.weg();
    const aktiveLektion = /^\/lektion\/([\w-]+)$/.exec(aktuell);
    const aktivesModul = /^\/(?:modul|pruefung)\/([\w-]+)$/.exec(aktuell);
    const lektion = aktiveLektion ? Register.nachId.get(aktiveLektion[1]) : null;
    if (lektion) offeneModule.add(lektion.modul.id);
    if (aktivesModul) offeneModule.add(aktivesModul[1]);

    box.innerHTML = "";

    Register.module.forEach((m) => {
      const f = Register.modulFortschritt(m);
      const istAktiv = (lektion && lektion.modul.id === m.id) || (aktivesModul && aktivesModul[1] === m.id);
      const block = el("div", {
        klasse: "modul-block"
          + (offeneModule.has(m.id) ? " offen" : "")
          + (f.anteil === 1 ? " fertig" : "")
          + (istAktiv ? " aktiv" : ""),
      });

      const kopf = el("button", { klasse: "modul-kopf", type: "button",
        "aria-expanded": offeneModule.has(m.id) ? "true" : "false" },
        el("span", { klasse: "modul-nr", html: f.anteil === 1 ? ikon("check") : String(m.nr) }),
        el("span", { klasse: "modul-name", text: m.titel }),
        el("span", { klasse: "klein", style: "font-size:.7rem;font-variant-numeric:tabular-nums",
          text: `${f.fertig}/${f.gesamt}` }),
        el("span", { klasse: "modul-pfeil", html: ikon("chevron") }));

      kopf.addEventListener("click", () => {
        if (offeneModule.has(m.id)) offeneModule.delete(m.id);
        else offeneModule.add(m.id);
        block.classList.toggle("offen");
        kopf.setAttribute("aria-expanded", offeneModule.has(m.id) ? "true" : "false");
      });

      const liste = el("div", { klasse: "modul-liste" });
      const innen = el("div");
      const ul = el("ul");

      m.lektionen.forEach((l) => {
        const fertig = Speicher.lektionFertig(l);
        const ist = lektion && lektion.id === l.id;
        ul.append(el("li", {},
          el("a", { klasse: "lek-link" + (fertig ? " fertig" : "") + (ist ? " aktiv" : ""),
            href: "#/lektion/" + l.id,
            "aria-current": ist ? "page" : null },
            el("span", { klasse: "lek-punkt" }),
            el("span", { klasse: "lek-titel", text: l.titel }))));
      });

      ul.append(el("li", {},
        el("a", { klasse: "lek-link", href: "#/pruefung/" + m.id,
          style: "color:var(--text-3)" },
          el("span", { klasse: "klein", style: "display:flex", html: ikon("ziel") }),
          el("span", { klasse: "lek-titel", text: "Modulpruefung" }))));

      innen.append(ul);
      liste.append(innen);
      block.append(kopf, liste);
      box.append(block);
    });
  }

  function kopfBalken() {
    const b = W.q("#kopfBalken");
    if (!b) return;
    const f = Register.gesamtFortschritt();
    b.style.width = (Math.max(f.anteil, f.feinAnteil || 0) * 100).toFixed(1) + "%";
  }

  function auffrischen() {
    schnellLinks();
    baum();
    kopfBalken();
  }

  return { auffrischen };
})();

const App = (() => {
  function navSchalten(offen) {
    document.body.classList.toggle("nav-offen", offen);
    const schalter = W.q("#navSchalter");
    if (schalter) schalter.setAttribute("aria-expanded", offen ? "true" : "false");
  }

  function tastatur() {
    document.addEventListener("keydown", (e) => {
      const imFeld = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "").toUpperCase());

      if (e.key === "Escape" && document.body.classList.contains("nav-offen")) {
        navSchalten(false);
        return;
      }
      if (imFeld || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        const feld = W.q("#sucheFeld");
        if (feld) { navSchalten(true); feld.focus(); feld.select(); }
        return;
      }

      const treffer = /^\/lektion\/([\w-]+)$/.exec(Router.weg());
      if (!treffer) return;
      const lektion = Register.nachId.get(treffer[1]);
      if (!lektion) return;

      if (e.key === "ArrowRight" && lektion.nachher) {
        location.hash = "#/lektion/" + lektion.nachher.id;
      } else if (e.key === "ArrowLeft" && lektion.vorher) {
        location.hash = "#/lektion/" + lektion.vorher.id;
      }
    });
  }

  function laufzeitMelden() {
    let letzterZustand = "";
    Laufzeit.beobachte((z) => {
      if (z.phase === "laedt" && letzterZustand !== "laedt") {
        W.melde(z.text + " ...", "terminal");
      } else if (z.phase === "bereit" && letzterZustand === "laedt") {
        W.melde("Python ist bereit", "check");
      } else if (z.phase === "fehler") {
        W.melde(z.text, "warn");
      }
      letzterZustand = z.phase;
    });
  }

  function start() {
    Thema.start();
    Suche.start();
    Navigation.auffrischen();
    Router.start();
    tastatur();
    laufzeitMelden();

    const schalter = W.q("#navSchalter");
    if (schalter) schalter.addEventListener("click", () =>
      navSchalten(!document.body.classList.contains("nav-offen")));

    const schliessen = W.q("#navSchliessen");
    if (schliessen) schliessen.addEventListener("click", () => navSchalten(false));

    const schleier = W.q("#navSchleier");
    if (schleier) schleier.addEventListener("click", () => navSchalten(false));

    const spiel = W.q("#spielSchalter");
    if (spiel) spiel.addEventListener("click", () => { location.hash = "#/spielplatz"; });

    document.addEventListener("fortschritt", () => Navigation.auffrischen());

    W.qa(".seiten-nav a").forEach((a) => a.addEventListener("click", () => navSchalten(false)));
    document.addEventListener("click", (e) => {
      const link = e.target.closest && e.target.closest(".seiten-nav a");
      if (link) navSchalten(false);
    });

    if (!Speicher.istDauerhaft()) {
      setTimeout(() => W.melde("Der Fortschritt kann in diesem Browser nicht gespeichert werden", "warn"), 1200);
    }
  }

  return { start };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.start);
} else {
  App.start();
}

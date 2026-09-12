/* Sehr einfacher Router ueber den Adressteil hinter der Raute. */
const Router = (() => {
  const ZIELE = [
    { muster: /^\/?$/, bauen: () => Ansichten.start(), titel: () => "Python von Grund auf" },
    { muster: /^\/modul\/([\w-]+)$/, bauen: (m) => Ansichten.modul(m[1]),
      titel: (m) => (Register.modulNachId.get(m[1]) || {}).titel },
    { muster: /^\/lektion\/([\w-]+)$/, bauen: (m) => Ansichten.lektion(m[1]),
      titel: (m) => (Register.nachId.get(m[1]) || {}).titel },
    { muster: /^\/pruefung\/([\w-]+)$/, bauen: (m) => Pruefung.modul(m[1]),
      titel: () => "Modulpruefung" },
    { muster: /^\/abschluss$/, bauen: () => Pruefung.abschluss(), titel: () => "Abschlusspruefung" },
    { muster: /^\/spielplatz$/, bauen: () => Ansichten.spielplatz(), titel: () => "Uebungsplatz" },
    { muster: /^\/glossar$/, bauen: () => Ansichten.glossar(), titel: () => "Glossar" },
    { muster: /^\/spickzettel$/, bauen: () => Ansichten.spickzettel(), titel: () => "Spickzettel" },
  ];

  let letzterWeg = null;

  function weg() {
    const roh = location.hash.replace(/^#/, "");
    return roh || "/";
  }

  function zeichne(sanft = true) {
    const aktuell = weg();
    const ziel = W.q("#ansicht");
    if (!ziel) return;

    let knoten = null;
    let titel = null;
    for (const eintrag of ZIELE) {
      const treffer = eintrag.muster.exec(aktuell);
      if (treffer) {
        knoten = eintrag.bauen(treffer);
        titel = eintrag.titel(treffer);
        break;
      }
    }
    if (!knoten) {
      knoten = Ansichten.fehlend();
      titel = "Nicht gefunden";
    }

    ziel.innerHTML = "";
    ziel.append(knoten);
    document.title = titel ? titel + " - Python von Grund auf" : "Python von Grund auf";

    const gleicheSeite = letzterWeg === aktuell;
    letzterWeg = aktuell;
    if (!gleicheSeite) W.rollenZu(0, !sanft);

    Navigation.auffrischen();
    document.body.classList.remove("nav-offen");
  }

  function start() {
    window.addEventListener("hashchange", () => zeichne(true));
    zeichne(false);
  }

  return { start, zeichne, weg };
})();

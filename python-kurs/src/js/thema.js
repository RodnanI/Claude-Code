/* Farbschema: folgt standardmaessig dem Betriebssystem,
   laesst sich aber manuell auf hell oder dunkel stellen. */
const Thema = (() => {
  const FOLGE = ["auto", "hell", "dunkel"];
  const IKON = { auto: "auto", hell: "sonne", dunkel: "mond" };
  const WORT = { auto: "Systemvorgabe", hell: "Heller Modus", dunkel: "Dunkler Modus" };
  let aktuell = "auto";

  function anwenden(wert, meldung = false) {
    aktuell = FOLGE.includes(wert) ? wert : "auto";
    const wurzel = document.documentElement;
    if (aktuell === "auto") wurzel.setAttribute("data-thema", "auto");
    else wurzel.setAttribute("data-thema", aktuell);

    const schalter = W.q("#themaSchalter");
    if (schalter) {
      schalter.innerHTML = W.ikon(IKON[aktuell]);
      schalter.title = WORT[aktuell];
      schalter.setAttribute("aria-label", `Farbschema: ${WORT[aktuell]}. Zum Wechseln druecken`);
    }
    Speicher.themaSchreiben(aktuell);
    if (meldung) W.melde(WORT[aktuell], IKON[aktuell]);
  }

  function wechseln() {
    const i = FOLGE.indexOf(aktuell);
    anwenden(FOLGE[(i + 1) % FOLGE.length], true);
  }

  function start() {
    anwenden(Speicher.themaLesen() || "auto");
    const schalter = W.q("#themaSchalter");
    if (schalter) schalter.addEventListener("click", wechseln);
  }

  return { start, wechseln, anwenden, aktuell: () => aktuell };
})();

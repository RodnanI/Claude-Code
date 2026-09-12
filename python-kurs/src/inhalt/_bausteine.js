/* Kurzschreibweisen fuer die Kursinhalte. */
const KURS = { module: [] };

const P  = (x) => ({ t: "p", x });
const H  = (x) => ({ t: "h", x });
const H2 = (x) => ({ t: "h2", x });
const H4 = (x) => ({ t: "h4", x });
const C  = (x, o) => Object.assign({ t: "code", x }, o || {});
const SH = (x, o) => Object.assign({ t: "code", x, shell: true, name: "Terminal" }, o || {});
const ROH = (x, o) => Object.assign({ t: "code", x, roh: true, lauf: false, name: "Ausgabe" }, o || {});
const L  = (...x) => ({ t: "liste", x: x.flat() });
const NR = (...x) => ({ t: "nummern", x: x.flat() });
const HINWEIS = (titel, ...x) => ({ t: "notiz", art: "info", titel, x: x.flat() });
const TIPP    = (titel, ...x) => ({ t: "notiz", art: "tipp", titel, x: x.flat() });
const WARN    = (titel, ...x) => ({ t: "notiz", art: "warnung", titel, x: x.flat() });
const MERKE   = (titel, ...x) => ({ t: "notiz", art: "merke", titel, x: x.flat() });
const TAB = (kopf, ...zeilen) => ({ t: "tabelle", kopf, zeilen });
const TRENN = () => ({ t: "trenner" });

/* Frage: Text, Antworten, Nummer der richtigen Antwort, Erklaerung, optionaler Code */
const Q = (f, o, r, e, code) => ({ f, o, r, e, code });
/* Pruefschritt einer Aufgabe */
const T = (name, code) => ({ name, code });

function modul(m) {
  const lektionen = [];
  m.lektionen = lektionen;
  KURS.module.push(m);
  return lektionen;
}

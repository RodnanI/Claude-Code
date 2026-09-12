/* Laedt die Inhaltsdateien und prueft sie auf Vollstaendigkeit und Konsistenz. */
const fs = require("fs");
const path = require("path");

const INHALT = path.join(__dirname, "src", "inhalt");
const REIHE = ["_bausteine.js", "modul-01.js", "modul-02.js", "modul-03.js", "modul-04.js",
  "modul-05.js", "modul-06.js", "modul-07.js", "modul-08.js", "extras.js"];

let quelle = "";
for (const name of REIHE) {
  const p = path.join(INHALT, name);
  if (fs.existsSync(p)) quelle += fs.readFileSync(p, "utf8") + "\n";
}
quelle += "\nreturn KURS;\n";

let KURS;
try {
  KURS = new Function(quelle)();
} catch (e) {
  console.error("Fehler beim Laden:", e.message);
  process.exit(1);
}

const fehler = [];
const warnungen = [];
const ids = new Set();
let lektionen = 0, fragen = 0, aufgaben = 0, tests = 0, bloecke = 0, codeBloecke = 0, dauer = 0;
let zeichen = 0;

function pruefeText(wo, text) {
  if (typeof text !== "string") return;
  zeichen += text.length;
  if (text.includes("—")) fehler.push(`${wo}: enthaelt einen Gedankenstrich`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) fehler.push(`${wo}: enthaelt ein Bildzeichen`);
}

function gehBloecke(wo, liste) {
  (liste || []).forEach((b, i) => {
    bloecke++;
    if (!b || typeof b !== "object") { fehler.push(`${wo} Block ${i}: kein Objekt`); return; }
    const ort = `${wo} Block ${i} (${b.t})`;
    if (b.t === "code") {
      codeBloecke++;
      pruefeText(ort, b.x);
      if (!b.x || !b.x.trim()) fehler.push(`${ort}: leerer Code`);
      if (b.x && b.x.includes("\t")) warnungen.push(`${ort}: enthaelt einen Tabulator`);
    } else if (b.t === "tabelle") {
      if (!b.kopf || !b.zeilen) fehler.push(`${ort}: Tabelle unvollstaendig`);
      else b.zeilen.forEach((z, j) => {
        if (z.length !== b.kopf.length) fehler.push(`${ort}: Zeile ${j} hat ${z.length} statt ${b.kopf.length} Spalten`);
        z.forEach((c) => pruefeText(ort, c));
      });
    } else if (Array.isArray(b.x)) {
      b.x.forEach((z) => pruefeText(ort, z));
    } else {
      pruefeText(ort, b.x);
    }
  });
}

KURS.module.forEach((m) => {
  if (ids.has(m.id)) fehler.push(`Doppelte Modulkennung: ${m.id}`);
  ids.add(m.id);
  if (!m.titel || !m.kurz || !m.ikon) fehler.push(`Modul ${m.id}: Angaben fehlen`);
  pruefeText(`Modul ${m.id}`, m.titel);
  pruefeText(`Modul ${m.id}`, m.kurz);

  (m.lektionen || []).forEach((l) => {
    lektionen++;
    const wo = `${m.id}/${l.id}`;
    if (ids.has(l.id)) fehler.push(`Doppelte Lektionskennung: ${l.id}`);
    ids.add(l.id);
    if (!l.id.startsWith("l-")) fehler.push(`${wo}: Kennung muss mit l- beginnen`);
    if (!l.titel) fehler.push(`${wo}: Titel fehlt`);
    if (!l.vorspann) fehler.push(`${wo}: Vorspann fehlt`);
    if (!l.ziele || l.ziele.length < 2) fehler.push(`${wo}: zu wenige Lernziele`);
    if (!l.dauer) fehler.push(`${wo}: Dauer fehlt`);
    dauer += l.dauer || 0;
    pruefeText(wo, l.titel);
    pruefeText(wo, l.vorspann);
    (l.ziele || []).forEach((z) => pruefeText(wo + " Ziel", z));
    gehBloecke(wo, l.inhalt);
    if (!l.inhalt || l.inhalt.length < 5) fehler.push(`${wo}: zu wenig Inhalt`);

    (l.quiz || []).forEach((f, i) => {
      fragen++;
      const fo = `${wo} Frage ${i + 1}`;
      if (!f.f) fehler.push(`${fo}: Fragetext fehlt`);
      if (!Array.isArray(f.o) || f.o.length < 2) fehler.push(`${fo}: zu wenige Antworten`);
      if (typeof f.r !== "number" || f.r < 0 || f.r >= (f.o || []).length) fehler.push(`${fo}: Loesungsnummer ungueltig (${f.r})`);
      if (!f.e) warnungen.push(`${fo}: keine Erklaerung`);
      pruefeText(fo, f.f); pruefeText(fo, f.e);
      (f.o || []).forEach((o) => pruefeText(fo, o));
      if (new Set(f.o).size !== (f.o || []).length) fehler.push(`${fo}: doppelte Antwortmoeglichkeit`);
    });
    if ((l.quiz || []).length < 3) warnungen.push(`${wo}: weniger als 3 Fragen`);

    const aufIds = new Set();
    (l.aufgaben || []).forEach((a, i) => {
      aufgaben++;
      const ao = `${wo} Aufgabe ${a.id || i}`;
      if (!a.id) fehler.push(`${ao}: Kennung fehlt`);
      if (aufIds.has(a.id)) fehler.push(`${ao}: doppelte Kennung`);
      aufIds.add(a.id);
      if (!a.titel) fehler.push(`${ao}: Titel fehlt`);
      if (!a.text || !a.text.length) fehler.push(`${ao}: Beschreibung fehlt`);
      if (a.start == null) fehler.push(`${ao}: Startcode fehlt`);
      if (!a.loesung) fehler.push(`${ao}: Loesung fehlt`);
      if (!a.tests || !a.tests.length) fehler.push(`${ao}: keine Pruefschritte`);
      if (!a.tipps || a.tipps.length < 1) warnungen.push(`${ao}: keine Tipps`);
      gehBloecke(ao, a.text);
      pruefeText(ao, a.titel); pruefeText(ao, a.loesung); pruefeText(ao, a.start);
      (a.tipps || []).forEach((t) => pruefeText(ao + " Tipp", t));
      (a.tests || []).forEach((t, j) => {
        tests++;
        if (!t.name) fehler.push(`${ao}: Pruefschritt ${j} ohne Namen`);
        if (!t.code || !t.code.includes("assert")) fehler.push(`${ao}: Pruefschritt "${t.name}" ohne assert`);
        pruefeText(ao, t.name);
      });
    });
  });
});

console.log("--------------------------------------------");
console.log(`Module:        ${KURS.module.length}`);
console.log(`Lektionen:     ${lektionen}`);
console.log(`Inhaltsbloecke:${String(bloecke).padStart(5)}  davon Code: ${codeBloecke}`);
console.log(`Quizfragen:    ${fragen}`);
console.log(`Aufgaben:      ${aufgaben}  mit ${tests} Pruefschritten`);
console.log(`Lernzeit:      ${Math.floor(dauer / 60)} Std ${dauer % 60} Min`);
console.log(`Textumfang:    ${Math.round(zeichen / 1000)}k Zeichen`);
console.log("--------------------------------------------");
if (warnungen.length) {
  console.log(`Warnungen (${warnungen.length}):`);
  warnungen.slice(0, 25).forEach((w) => console.log("  ~ " + w));
  if (warnungen.length > 25) console.log(`  ... und ${warnungen.length - 25} weitere`);
}
if (fehler.length) {
  console.log(`FEHLER (${fehler.length}):`);
  fehler.slice(0, 40).forEach((f) => console.log("  ! " + f));
  process.exit(1);
}
console.log("Alle Pruefungen bestanden.");

if (process.argv.includes("--json")) {
  fs.writeFileSync(path.join(__dirname, "kurs.json"), JSON.stringify(KURS));
  console.log("kurs.json geschrieben");
}

/* Haelt den Lernfortschritt. Faellt auf reinen Arbeitsspeicher zurueck,
   wenn der Browser keinen dauerhaften Speicher erlaubt. */
const Speicher = (() => {
  const SCHLUESSEL = "python-kurs.fortschritt.v1";
  const THEMA_SCHLUESSEL = "python-kurs.thema.v1";
  let daten = { lektionen: {}, pruefungen: {}, letzte: null };
  let dauerhaft = true;

  function lies(schluessel) {
    try { return window.localStorage.getItem(schluessel); }
    catch (_) { dauerhaft = false; return null; }
  }
  function schreib(schluessel, wert) {
    try { window.localStorage.setItem(schluessel, wert); }
    catch (_) { dauerhaft = false; }
  }

  function lade() {
    const roh = lies(SCHLUESSEL);
    if (!roh) return;
    try {
      const d = JSON.parse(roh);
      if (d && typeof d === "object") {
        daten = { lektionen: d.lektionen || {}, pruefungen: d.pruefungen || {}, letzte: d.letzte || null };
      }
    } catch (_) { /* beschaedigte Daten werden verworfen */ }
  }

  let sicherungLaeuft = null;
  function sichere() {
    if (sicherungLaeuft) return;
    sicherungLaeuft = setTimeout(() => {
      sicherungLaeuft = null;
      schreib(SCHLUESSEL, JSON.stringify(daten));
      document.dispatchEvent(new CustomEvent("fortschritt"));
    }, 60);
  }

  function eintrag(id) {
    if (!daten.lektionen[id]) daten.lektionen[id] = { gesehen: false, quiz: null, aufgaben: {} };
    return daten.lektionen[id];
  }

  const gesehen = (id) => !!(daten.lektionen[id] && daten.lektionen[id].gesehen);

  function markiereGesehen(id) {
    const e = eintrag(id);
    if (!e.gesehen) { e.gesehen = true; sichere(); }
    daten.letzte = id;
    schreib(SCHLUESSEL, JSON.stringify(daten));
  }

  function setzeQuiz(id, richtig, gesamt) {
    const e = eintrag(id);
    if (!e.quiz || e.quiz.richtig < richtig) e.quiz = { richtig, gesamt };
    sichere();
  }

  function setzeAufgabe(id, aufgabeId) {
    const e = eintrag(id);
    if (!e.aufgaben[aufgabeId]) { e.aufgaben[aufgabeId] = true; sichere(); }
  }

  const holeQuiz = (id) => (daten.lektionen[id] && daten.lektionen[id].quiz) || null;
  const aufgabeGeloest = (id, aufgabeId) => !!(daten.lektionen[id] && daten.lektionen[id].aufgaben[aufgabeId]);

  function setzePruefung(id, richtig, gesamt) {
    const alt = daten.pruefungen[id];
    if (!alt || alt.richtig < richtig) daten.pruefungen[id] = { richtig, gesamt, am: Date.now() };
    sichere();
  }
  const holePruefung = (id) => daten.pruefungen[id] || null;

  /* Eine Lektion gilt als abgeschlossen, wenn das Quiz zu mindestens
     70 Prozent richtig war und alle Aufgaben geloest sind. */
  function lektionFertig(lek) {
    if (!lek) return false;
    const e = daten.lektionen[lek.id];
    if (!e) return false;
    const fragen = (lek.quiz || []).length;
    if (fragen) {
      if (!e.quiz || e.quiz.gesamt === 0) return false;
      if (e.quiz.richtig / e.quiz.gesamt < 0.7) return false;
    }
    const aufgaben = lek.aufgaben || [];
    for (const a of aufgaben) if (!e.aufgaben[a.id]) return false;
    if (!fragen && !aufgaben.length) return !!e.gesehen;
    return true;
  }

  /* Anteil zwischen 0 und 1, damit der Fortschritt sich schon waehrend
     einer Lektion bewegt und nicht erst am Ende springt. */
  function lektionAnteil(lek) {
    if (!lek) return 0;
    const e = daten.lektionen[lek.id];
    if (!e) return 0;
    const fragen = (lek.quiz || []).length;
    const aufgaben = (lek.aufgaben || []).length;
    const teile = [];

    if (fragen) {
      const q = e.quiz;
      teile.push(q && q.gesamt ? Math.min(1, q.richtig / q.gesamt / 0.7) : 0);
    }
    if (aufgaben) {
      const geloest = (lek.aufgaben || []).filter((a) => e.aufgaben[a.id]).length;
      teile.push(geloest / aufgaben);
    }
    if (!teile.length) return e.gesehen ? 1 : 0;
    return teile.reduce((a, b) => a + b, 0) / teile.length;
  }

  function zuruecksetzen() {
    daten = { lektionen: {}, pruefungen: {}, letzte: null };
    schreib(SCHLUESSEL, JSON.stringify(daten));
    document.dispatchEvent(new CustomEvent("fortschritt"));
  }

  const letzte = () => daten.letzte;
  const istDauerhaft = () => dauerhaft;
  const themaLesen = () => lies(THEMA_SCHLUESSEL);
  const themaSchreiben = (w) => schreib(THEMA_SCHLUESSEL, w);

  lade();

  return {
    gesehen, markiereGesehen, setzeQuiz, holeQuiz, setzeAufgabe, aufgabeGeloest,
    setzePruefung, holePruefung, lektionFertig, lektionAnteil, zuruecksetzen, letzte,
    istDauerhaft, themaLesen, themaSchreiben,
  };
})();

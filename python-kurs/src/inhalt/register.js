/* Baut aus den Moduldaten die Nachschlagestrukturen auf. */
const Register = (() => {
  const lektionen = [];
  const nachId = new Map();
  const modulNachId = new Map();

  KURS.module.forEach((m, mi) => {
    modulNachId.set(m.id, m);
    m.lektionen.forEach((l, li) => {
      l.modul = m;
      l.nummer = lektionen.length + 1;
      l.imModul = li + 1;
      lektionen.push(l);
      nachId.set(l.id, l);
    });
    m.index = mi;
  });

  lektionen.forEach((l, i) => {
    l.vorher = i > 0 ? lektionen[i - 1] : null;
    l.nachher = i < lektionen.length - 1 ? lektionen[i + 1] : null;
  });

  const gesamtDauer = lektionen.reduce((s, l) => s + (l.dauer || 0), 0);
  const anzahlFragen = lektionen.reduce((s, l) => s + (l.quiz || []).length, 0);
  const anzahlAufgaben = lektionen.reduce((s, l) => s + (l.aufgaben || []).length, 0);

  /* Fuer die Volltextsuche: je Lektion ein zusammengefasster Text. */
  const suchIndex = lektionen.map((l) => {
    const teile = [l.titel, l.vorspann, ...(l.ziele || [])];
    (l.inhalt || []).forEach((b) => {
      if (!b || typeof b !== "object") return;
      if (typeof b.x === "string") teile.push(b.x);
      else if (Array.isArray(b.x)) teile.push(b.x.join(" "));
      if (b.titel) teile.push(b.titel);
      if (b.kopf) teile.push(b.kopf.join(" "));
      if (b.zeilen) b.zeilen.forEach((z) => teile.push(z.join(" ")));
    });
    (l.aufgaben || []).forEach((a) => teile.push(a.titel));
    const roh = teile.filter(Boolean).join("  ").replace(/\s+/g, " ");
    return { lektion: l, roh, text: roh.toLowerCase() };
  });

  const modulDauer = (m) => m.lektionen.reduce((s, l) => s + (l.dauer || 0), 0);

  function modulFortschritt(m) {
    const fertig = m.lektionen.filter((l) => Speicher.lektionFertig(l)).length;
    return { fertig, gesamt: m.lektionen.length, anteil: fertig / m.lektionen.length };
  }

  function gesamtFortschritt() {
    const fertig = lektionen.filter((l) => Speicher.lektionFertig(l)).length;
    const summe = lektionen.reduce((s, l) => s + Speicher.lektionAnteil(l), 0);
    return {
      fertig,
      gesamt: lektionen.length,
      anteil: fertig / lektionen.length,
      feinAnteil: summe / lektionen.length,
    };
  }

  /* Alle Fragen eines Moduls oder des gesamten Kurses, gemischt. */
  function fragenSammeln(modul) {
    const quelle = modul ? modul.lektionen : lektionen;
    const alle = [];
    quelle.forEach((l) => (l.quiz || []).forEach((f) => alle.push({ ...f, herkunft: l })));
    return alle;
  }

  function mische(liste, anzahl) {
    const kopie = liste.slice();
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return anzahl ? kopie.slice(0, anzahl) : kopie;
  }

  return {
    module: KURS.module, lektionen, nachId, modulNachId, suchIndex,
    gesamtDauer, anzahlFragen, anzahlAufgaben,
    modulDauer, modulFortschritt, gesamtFortschritt, fragenSammeln, mische,
  };
})();

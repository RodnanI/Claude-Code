const Laufzeit = (() => {
  /* Mehrere Bezugsquellen. Die vollstaendigen Ablagen enthalten auch Pakete
     wie numpy und pandas, die Eintraege ueber npm nur den Interpreter selbst.
     Zwei verschiedene Anbieter, damit eine Sperre nicht alles lahmlegt. */
  function nebenan(pfad) {
    try { return new URL(pfad, location.href).href; } catch (_) { return null; }
  }

  const QUELLEN = [
    // Zuerst direkt neben der Seite. Wer sie selbst betreibt, legt Pyodide
    // einfach in einen Unterordner und braucht dann gar kein Netz.
    { url: nebenan("pyodide/"), pakete: true, name: "Ordner pyodide neben der Seite" },
    { url: nebenan("python-kurs-pyodide/"), pakete: true, name: "Ordner python-kurs-pyodide" },
    { url: "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/", pakete: true, name: "jsDelivr 314.0.6" },
    { url: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/", pakete: true, name: "jsDelivr 0.28.3" },
    { url: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/", pakete: true, name: "jsDelivr 0.27.7" },
    { url: "https://unpkg.com/pyodide@314.0.6/", pakete: false, name: "unpkg 314.0.6" },
    { url: "https://cdn.jsdelivr.net/npm/pyodide@314.0.6/", pakete: false, name: "jsDelivr npm 314.0.6" },
  ].filter((q) => q.url);

  const ZEIT_PROBE = 6000;
  const ZEIT_SKRIPT = 25000;
  const ZEIT_START = 120000;

  const NICHT_ERREICHBAR =
    "Der Python-Interpreter konnte nicht geladen werden.\n\n"
    + "Er wird beim ersten Ausfuehren einmalig aus dem Netz geholt. Haeufige Gruende:\n"
    + "  1. keine Internetverbindung\n"
    + "  2. ein Werbe- oder Inhaltsblocker sperrt cdn.jsdelivr.net und unpkg.com\n"
    + "  3. ein Firmennetz laesst diese Adressen nicht durch\n\n"
    + "Text, Fragen und Pruefungen funktionieren auch ohne ihn, und zu jedem Beispiel "
    + "steht die Ausgabe im Text.";

  const ZUSATZPAKETE = new Set(["numpy", "pandas", "matplotlib", "scipy", "sklearn", "sympy"]);

  let py = null;
  let ladeVersprechen = null;
  let starter = null;
  let quelleMitPaketen = true;
  const geladenePakete = new Set();
  const horcher = new Set();

  const zustand = { phase: "kalt", text: "", gruende: [] };

  function melde(phase, text) {
    zustand.phase = phase;
    zustand.text = text;
    horcher.forEach((f) => { try { f(zustand); } catch (_) {} });
  }

  const beobachte = (f) => { horcher.add(f); return () => horcher.delete(f); };

  /* Ohne Zeitgrenze bliebe die Anzeige bei einer haengenden Verbindung
     fuer immer auf "wird ausgefuehrt" stehen. */
  function mitZeitgrenze(versprechen, ms, was) {
    let uhr;
    const grenze = new Promise((_, ablehnen) => {
      uhr = setTimeout(() => ablehnen(new Error("Zeitgrenze ueberschritten: " + was)), ms);
    });
    return Promise.race([versprechen, grenze]).finally(() => clearTimeout(uhr));
  }

  function skriptLaden(url) {
    return mitZeitgrenze(new Promise((loesen, ablehnen) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.dataset.pykurs = "1";
      s.onload = () => loesen();
      s.onerror = () => ablehnen(new Error("Nicht erreichbar: " + url));
      document.head.append(s);
    }), ZEIT_SKRIPT, url);
  }

  /* Kurzer Vorabgriff: so faellt eine gesperrte oder fehlende Quelle
     in Sekunden auf statt erst nach einer langen Zeitgrenze. */
  async function erreichbar(url) {
    // Neben einer oertlich geoeffneten Datei verbietet der Browser fetch.
    // Dort wird direkt der Ladeversuch unternommen.
    if (url.startsWith("file:")) return true;
    if (typeof fetch !== "function") return true;
    const abbruch = typeof AbortController === "function" ? new AbortController() : null;
    const uhr = setTimeout(() => abbruch && abbruch.abort(), ZEIT_PROBE);
    try {
      const antwort = await fetch(url + "pyodide.js", {
        method: "GET",
        signal: abbruch ? abbruch.signal : undefined,
      });
      return antwort.ok;
    } catch (_) {
      return false;
    } finally {
      clearTimeout(uhr);
    }
  }

  function altesSkriptEntfernen() {
    try { delete window.loadPyodide; } catch (_) { /* nicht loeschbar */ }
    if (typeof window.loadPyodide === "function") {
      try { window.loadPyodide = undefined; } catch (_) { /* schreibgeschuetzt */ }
    }
    document.querySelectorAll('script[data-pykurs="1"]').forEach((s) => s.remove());
  }

  const BOOTSTRAP = `
import sys, io, json, time, builtins, traceback

_KURS_ZEIT = 8.0

class _KursAbbruch(Exception):
    pass

def _kurs_waechter(grenze):
    ende = time.time() + grenze
    zaehler = [0]
    def spur(rahmen, ereignis, arg):
        zaehler[0] += 1
        if zaehler[0] % 1500 == 0 and time.time() > ende:
            raise _KursAbbruch("Das Programm lief laenger als " + str(int(grenze)) + " Sekunden und wurde angehalten. Pruefe, ob eine Schleife nie endet.")
        return spur
    return spur

def _kurs_fehlertext(exc, ueberspringen=1):
    tb = exc.__traceback__
    for _ in range(ueberspringen):
        if tb is not None:
            tb = tb.tb_next
    if isinstance(exc, _KursAbbruch):
        return "Zeitlimit: " + str(exc)
    teile = traceback.format_exception(type(exc), exc, tb)
    text = "".join(teile)
    return text.replace('File "<dein-code>"', 'Datei "dein Code"').replace('File "<test>"', 'Datei "Test"').strip()

def _kurs_starte(quelle, eingaben_json, tests_json):
    eingaben = json.loads(eingaben_json or "[]")
    tests = json.loads(tests_json or "[]")
    puffer = io.StringIO()
    raum = {"__name__": "__main__", "__doc__": None}
    warte = list(eingaben)

    def _eingabe(aufforderung=""):
        if aufforderung:
            puffer.write(str(aufforderung))
        wert = str(warte.pop(0)) if warte else ""
        puffer.write(wert + "\\n")
        return wert

    alt_out, alt_err, alt_in = sys.stdout, sys.stderr, builtins.input
    sys.stdout = puffer
    sys.stderr = puffer
    builtins.input = _eingabe
    fehler = None
    sys.settrace(_kurs_waechter(_KURS_ZEIT))
    try:
        exec(compile(quelle, "<dein-code>", "exec"), raum)
    except SystemExit:
        pass
    except BaseException as e:
        fehler = _kurs_fehlertext(e)
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr, builtins.input = alt_out, alt_err, alt_in

    ausgabe = puffer.getvalue()
    ergebnisse = []
    if tests and fehler is None:
        raum["AUSGABE"] = ausgabe
        raum["QUELLE"] = quelle
        for eintrag in tests:
            name = eintrag.get("name", "Test")
            code = eintrag.get("code", "")
            t_puffer = io.StringIO()
            sys.stdout = t_puffer
            sys.stderr = t_puffer
            builtins.input = _eingabe
            sys.settrace(_kurs_waechter(4.0))
            try:
                exec(compile(code, "<test>", "exec"), raum)
                ergebnisse.append({"name": name, "ok": True, "grund": ""})
            except AssertionError as e:
                grund = str(e) or "Die Bedingung war nicht erfuellt."
                ergebnisse.append({"name": name, "ok": False, "grund": grund})
            except BaseException as e:
                ergebnisse.append({"name": name, "ok": False, "grund": _kurs_fehlertext(e)})
            finally:
                sys.settrace(None)
                sys.stdout, sys.stderr, builtins.input = alt_out, alt_err, alt_in

    return json.dumps({
        "ausgabe": ausgabe,
        "fehler": fehler,
        "tests": ergebnisse,
    })
`;

  async function bereit() {
    if (py) return py;
    if (ladeVersprechen) return ladeVersprechen;

    ladeVersprechen = (async () => {
      const gruende = [];

      /* Alle Quellen gleichzeitig antesten. Nacheinander wuerde jede gesperrte
         Adresse die eigene Zeitgrenze voll ausschoepfen. */
      melde("laedt", "Interpreter wird gesucht");
      const proben = await Promise.all(QUELLEN.map(async (quelle) => {
        try { return { quelle, ok: await erreichbar(quelle.url) }; }
        catch (_) { return { quelle, ok: false }; }
      }));
      proben.forEach((p) => { if (!p.ok) gruende.push(p.quelle.url + ": nicht erreichbar"); });

      const brauchbar = proben.filter((p) => p.ok).map((p) => p.quelle);
      if (!brauchbar.length) {
        zustand.gruende = gruende;
        melde("fehler", NICHT_ERREICHBAR);
        ladeVersprechen = null;
        const fehler = new Error(NICHT_ERREICHBAR);
        fehler.gruende = gruende;
        throw fehler;
      }

      for (let i = 0; i < brauchbar.length; i++) {
        const quelle = brauchbar[i];
        const woher = brauchbar.length > 1 ? ` (Quelle ${i + 1} von ${brauchbar.length})` : "";
        try {
          melde("laedt", "Python wird geladen, beim ersten Mal dauert das etwas" + woher);
          altesSkriptEntfernen();
          await skriptLaden(quelle.url + "pyodide.js");
          if (typeof window.loadPyodide !== "function") {
            gruende.push(quelle.url + ": unerwarteter Inhalt");
            continue;
          }

          melde("laedt", "Python wird gestartet" + woher);
          py = await mitZeitgrenze(
            window.loadPyodide({ indexURL: quelle.url }), ZEIT_START, "Start des Interpreters");
          quelleMitPaketen = quelle.pakete;
          break;
        } catch (e) {
          gruende.push(quelle.url + ": " + (e && e.message ? e.message : e));
          py = null;
        }
      }

      if (!py) {
        zustand.gruende = gruende;
        melde("fehler", NICHT_ERREICHBAR);
        ladeVersprechen = null;
        const fehler = new Error(NICHT_ERREICHBAR);
        fehler.gruende = gruende;
        throw fehler;
      }

      melde("laedt", "Fast fertig");
      await py.runPythonAsync(BOOTSTRAP);
      starter = py.globals.get("_kurs_starte");
      melde("bereit", "Python ist bereit");
      return py;
    })();

    return ladeVersprechen;
  }

  async function ladePakete(namen) {
    if (!namen || !namen.length) return;
    const fehlend = namen.filter((n) => n && !geladenePakete.has(n));
    if (!fehlend.length) return;
    melde("laedt", "Pakete werden geladen: " + fehlend.join(", "));
    try {
      await py.loadPackage(fehlend);
      fehlend.forEach((n) => geladenePakete.add(n));
      melde("bereit", "Python ist bereit");
    } catch (e) {
      melde("bereit", "Python ist bereit");
      throw new Error(
        "Das Paket " + fehlend.join(" und ") + " konnte nicht geladen werden.\n\n"
        + "Dafuer wird eine Internetverbindung gebraucht. Der uebrige Code laeuft weiter, "
        + "und alle Beispiele sind hier auch ohne Ausfuehrung vollstaendig abgedruckt."
      );
    }
  }

  async function fuehreAus(code, einstellungen = {}) {
    await bereit();
    await ladePakete(einstellungen.pakete);
    const roh = starter(code, JSON.stringify(einstellungen.eingaben || []), JSON.stringify(einstellungen.tests || []));
    const ergebnis = JSON.parse(roh);
    if (roh && typeof roh.destroy === "function") roh.destroy();

    // Ein fehlendes Zusatzpaket ist fast immer eine Frage der Verbindung.
    if (ergebnis.fehler && ergebnis.fehler.includes("ModuleNotFoundError")) {
      const treffer = /No module named '([\w.]+)'/.exec(ergebnis.fehler);
      const paket = treffer ? treffer[1].split(".")[0] : "";
      if (ZUSATZPAKETE.has(paket)) {
        ergebnis.fehler += "\n\nDas Paket " + paket + " wird beim ersten Mal aus dem Netz geholt. "
          + "Pruefe deine Internetverbindung und versuche es erneut. "
          + "Das Beispiel und seine Ausgabe stehen hier auch vollstaendig im Text.";
      }
    }
    return ergebnis;
  }

  /* Zeigt das Ergebnis direkt unter einem Beispielblock. */
  async function fuehreKarteAus(karte, code) {
    const knopf = W.q('[data-tat="laufen"]', karte);
    const box = W.q(".ausgabe", karte);
    const feld = W.q(".ausgabe pre", karte);
    const pakete = (karte.dataset.pakete || "").split(",").filter(Boolean);
    let eingaben = [];
    try { eingaben = JSON.parse(karte.dataset.eingaben || "[]"); } catch (_) {}

    box.classList.add("sichtbar");
    box.classList.remove("hat-fehler");
    const anzeigeBeenden = W.laufAnzeige(feld);
    if (knopf) knopf.disabled = true;

    try {
      const e = await fuehreAus(code, { pakete, eingaben });
      if (e.fehler) {
        box.classList.add("hat-fehler");
        feld.textContent = (e.ausgabe ? e.ausgabe + "\n" : "") + e.fehler;
      } else if (e.ausgabe.trim() === "") {
        feld.innerHTML = '<span class="leer">Kein Text ausgegeben. Nutze print(), um etwas anzuzeigen.</span>';
      } else {
        feld.textContent = e.ausgabe;
      }
    } catch (e) {
      box.classList.add("hat-fehler");
      feld.textContent = String(e && e.message ? e.message : e);
      if (String(e && e.message).includes("Interpreter")) {
        feld.append(W.el("div", { style: "margin-top:.6rem" },
          W.el("a", { klasse: "taste taste-klein", href: "#/technik",
            html: `${W.ikon("werkzeug")}<span>Technikpruefung oeffnen</span>` })));
      }
    } finally {
      anzeigeBeenden();
      if (knopf) knopf.disabled = false;
    }
  }

  const istBereit = () => !!py;

  /* Neben einer oertlichen Datei antwortet fetch nicht. Fuer eine ehrliche
     Diagnose wird dort ein echter Ladeversuch unternommen. */
  async function dateiProbe(url) {
    const s = document.createElement("script");
    s.src = url + "pyodide.js";
    s.async = true;
    try {
      await mitZeitgrenze(new Promise((loesen, ablehnen) => {
        s.onload = () => loesen();
        s.onerror = () => ablehnen(new Error("nicht vorhanden"));
        document.head.append(s);
      }), ZEIT_PROBE, url);
      return true;
    } catch (_) {
      return false;
    } finally {
      s.remove();
    }
  }

  /* Fuer die Technikpruefung: jede Quelle einzeln antesten. */
  async function quellenPruefen(beiErgebnis) {
    const ergebnisse = [];
    for (const quelle of QUELLEN) {
      const anfang = Date.now();
      let stand;
      try {
        const da = quelle.url.startsWith("file:")
          ? await dateiProbe(quelle.url)
          : await erreichbar(quelle.url);
        stand = da ? "erreichbar" : "nicht erreichbar";
      } catch (e) {
        stand = "Fehler: " + (e && e.message ? e.message : e);
      }
      const eintrag = { ...quelle, stand, dauer: Date.now() - anfang };
      ergebnisse.push(eintrag);
      if (beiErgebnis) beiErgebnis(eintrag);
    }
    return ergebnisse;
  }

  const quellen = () => QUELLEN.slice();

  return {
    bereit, fuehreAus, fuehreKarteAus, beobachte, zustand, istBereit,
    ladePakete, quellenPruefen, quellen,
  };
})();

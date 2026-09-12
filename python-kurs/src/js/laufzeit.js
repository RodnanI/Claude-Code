/* Fuehrt Python im Browser aus. Der Interpreter wird erst beim ersten
   Klick nachgeladen, damit die Seite sofort nutzbar ist. */
const Laufzeit = (() => {
  /* Mehrere Bezugsquellen, damit ein Ausfall einer Fassung nicht alles lahmlegt.
     Die vollstaendigen Ablagen enthalten auch Pakete wie numpy und pandas,
     der Eintrag ueber npm nur den Interpreter selbst. */
  const QUELLEN = [
    "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/",
    "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
    "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    "https://cdn.jsdelivr.net/npm/pyodide@0.28.3/",
  ];

  const NICHT_ERREICHBAR =
    "Der Python-Interpreter konnte nicht geladen werden.\n\n"
    + "Beim ersten Ausfuehren wird er einmalig aus dem Netz geholt, dafuer braucht es "
    + "eine Internetverbindung. Danach laeuft alles ohne Netz weiter.\n\n"
    + "Text, Fragen und Pruefungen funktionieren auch ohne ihn.";

  const ZUSATZPAKETE = new Set(["numpy", "pandas", "matplotlib", "scipy", "sklearn", "sympy"]);

  let py = null;
  let ladeVersprechen = null;
  let starter = null;
  const geladenePakete = new Set();
  const horcher = new Set();

  const zustand = { phase: "kalt", text: "" };

  function melde(phase, text) {
    zustand.phase = phase;
    zustand.text = text;
    horcher.forEach((f) => { try { f(zustand); } catch (_) {} });
  }

  const beobachte = (f) => { horcher.add(f); return () => horcher.delete(f); };

  function skriptLaden(url) {
    return new Promise((loesen, ablehnen) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => loesen();
      s.onerror = () => ablehnen(new Error("Nicht erreichbar: " + url));
      document.head.append(s);
    });
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
      melde("laedt", "Python-Interpreter wird geladen");
      let letzterFehler = null;
      let geladeneBasis = null;
      for (const basis of QUELLEN) {
        try {
          if (geladeneBasis !== basis) {
            // Eine zuvor geladene Fassung darf nicht mit einem fremden Pfad gemischt werden.
            try { delete window.loadPyodide; } catch (_) { window.loadPyodide = undefined; }
            await skriptLaden(basis + "pyodide.js");
            geladeneBasis = basis;
          }
          if (typeof window.loadPyodide !== "function") throw new Error("loadPyodide fehlt");
          py = await window.loadPyodide({ indexURL: basis });
          break;
        } catch (e) {
          letzterFehler = e;
          py = null;
        }
      }
      if (!py) {
        melde("fehler", NICHT_ERREICHBAR);
        ladeVersprechen = null;
        const fehler = new Error(NICHT_ERREICHBAR);
        fehler.grund = letzterFehler;
        throw fehler;
      }
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
    feld.innerHTML = '<span class="laeuft"><span class="spinner"></span>Wird ausgefuehrt</span>';
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
    } finally {
      if (knopf) knopf.disabled = false;
    }
  }

  const istBereit = () => !!py;

  return { bereit, fuehreAus, fuehreKarteAus, beobachte, zustand, istBereit, ladePakete };
})();

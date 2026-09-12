const M7 = modul({
  id: "m7", nr: 7, ikon: "ziel",
  titel: "Professionelle Praxis",
  kurz: "Testen, Projekte aufsetzen, Nebenlaeufigkeit und Code, den andere lesen koennen.",
});

M7.push({
  id: "l-testen",
  titel: "Testen",
  dauer: 19,
  vorspann: "Tests sind kein Zusatzaufwand, sondern der Grund, warum du deinen Code spaeter noch aendern kannst. Ohne sie wird jede Aenderung ab einer gewissen Groesse zum Risiko.",
  ziele: [
    "Mit assert einfache Pruefungen schreiben",
    "Tests mit pytest strukturieren",
    "Randfaelle systematisch finden",
    "Erwartete Fehler pruefen",
  ],
  inhalt: [
    H2("Der einfachste Test"),
    C(`def durchschnitt(werte):
    return sum(werte) / len(werte)


assert durchschnitt([2, 4]) == 3
assert durchschnitt([5]) == 5
print("Beide Pruefungen bestanden")

assert durchschnitt([]) == 0`),
    P("`assert` prueft eine Bedingung und bricht ab, wenn sie falsch ist. Der letzte Aufruf deckt sofort eine Luecke auf: die leere Liste fuehrt zu einer Division durch null. Genau dafuer sind Tests da."),
    C(`def durchschnitt(werte):
    """Gibt den Mittelwert zurueck, oder 0.0 bei leerer Eingabe."""
    if not werte:
        return 0.0
    return sum(werte) / len(werte)


assert durchschnitt([2, 4]) == 3
assert durchschnitt([]) == 0.0
assert durchschnitt([-1, 1]) == 0.0
print("Alle Pruefungen bestanden")`, { aus: "Alle Pruefungen bestanden" }),

    H2("Tests mit pytest"),
    P("`pytest` ist das uebliche Werkzeug. Es findet Dateien, die mit `test_` beginnen, und darin Funktionen, die ebenfalls so heissen."),
    C(`# datei: rechner.py
def addieren(a, b):
    return a + b

def teilen(a, b):
    if b == 0:
        raise ValueError("Division durch null")
    return a / b`, { lauf: false, name: "rechner.py" }),
    C(`# datei: test_rechner.py
import pytest
from rechner import addieren, teilen


def test_addieren_positiv():
    assert addieren(2, 3) == 5


def test_addieren_negativ():
    assert addieren(-1, -1) == -2


def test_teilen():
    assert teilen(10, 2) == 5


def test_teilen_durch_null():
    with pytest.raises(ValueError):
        teilen(10, 0)`, { lauf: false, name: "test_rechner.py" }),
    SH(`$ pytest -v
test_rechner.py::test_addieren_positiv PASSED
test_rechner.py::test_addieren_negativ PASSED
test_rechner.py::test_teilen PASSED
test_rechner.py::test_teilen_durch_null PASSED

4 passed in 0.02s`),
    P("`pytest.raises` prueft, dass ein erwarteter Fehler auch wirklich auftritt. Ohne den Kontextmanager wuerde der Test am Fehler scheitern, statt ihn als Erfolg zu werten."),

    H2("Der Aufbau eines guten Tests"),
    P("Jeder Test folgt demselben Dreischritt: vorbereiten, ausfuehren, pruefen."),
    C(`def gruppiere(woerter):
    ergebnis = {}
    for wort in woerter:
        ergebnis.setdefault(wort[0], []).append(wort)
    return ergebnis


def test_gruppiere_nach_anfangsbuchstabe():
    # vorbereiten
    woerter = ["Apfel", "Ananas", "Birne"]

    # ausfuehren
    ergebnis = gruppiere(woerter)

    # pruefen
    assert ergebnis == {"A": ["Apfel", "Ananas"], "B": ["Birne"]}


test_gruppiere_nach_anfangsbuchstabe()
print("Test bestanden")`, { aus: "Test bestanden" }),
    TIPP("Ein Test, eine Aussage",
      "Der Name sollte sagen, was geprueft wird. `test_gruppiere_nach_anfangsbuchstabe` ist besser als `test_1`. Wenn ein Test fehlschlaegt, willst du aus dem Namen schon wissen, was kaputt ist.",
    ),

    H2("Randfaelle finden"),
    P("Die meisten Fehler stecken nicht im Normalfall, sondern an den Raendern. Geh diese Liste bei jeder Funktion durch:"),
    TAB(["Randfall", "Beispiel"],
      ["leer", "leere Liste, leerer Text, kein Eintrag"],
      ["genau eins", "ein einziges Element"],
      ["Null und negativ", "`0`, `-1`, negative Mengen"],
      ["sehr gross", "eine Million Eintraege"],
      ["falscher Typ", "`None` statt einer Liste"],
      ["Grenzwert", "genau an der Schwelle, knapp darueber, knapp darunter"],
      ["doppelt", "mehrfach dieselben Werte"],
    ),
    C(`def note(punkte):
    if punkte >= 90:
        return 1
    if punkte >= 80:
        return 2
    return 3


# Grenzen genau pruefen
assert note(90) == 1
assert note(89) == 2
assert note(80) == 2
assert note(79) == 3
assert note(0) == 3
print("Alle Grenzen stimmen")`, { aus: "Alle Grenzen stimmen" }),

    H2("Mehrere Faelle auf einmal"),
    C(`import pytest

def verdoppeln(x):
    return x * 2


@pytest.mark.parametrize("eingabe,erwartet", [
    (1, 2),
    (0, 0),
    (-3, -6),
    (2.5, 5.0),
])
def test_verdoppeln(eingabe, erwartet):
    assert verdoppeln(eingabe) == erwartet`, { lauf: false, name: "test_verdoppeln.py" }),
    P("Damit wird aus einem Test vier eigenstaendige Tests. Faellt einer durch, siehst du genau welcher, statt nur dass irgendetwas nicht stimmt."),

    H2("Gemeinsame Vorbereitung"),
    C(`import pytest

@pytest.fixture
def beispieldaten():
    return [
        {"name": "Ada", "punkte": 95},
        {"name": "Grace", "punkte": 88},
    ]


def test_anzahl(beispieldaten):
    assert len(beispieldaten) == 2


def test_bester(beispieldaten):
    bester = max(beispieldaten, key=lambda d: d["punkte"])
    assert bester["name"] == "Ada"`, { lauf: false, name: "test_daten.py" }),
    P("Eine Fixture stellt Testdaten bereit. Jeder Test, der den Namen als Parameter fuehrt, bekommt frische Daten. So beeinflussen sich Tests nicht gegenseitig."),

    H2("Kommazahlen testen"),
    C(`import math

def anteil(teil, ganzes):
    return teil / ganzes


wert = anteil(1, 3) * 3

print(wert == 1.0)
print(math.isclose(wert, 1.0))
print(abs(wert - 1.0) < 1e-9)`, { aus: "True\nTrue\nTrue" }),
    P("Hier geht es zufaellig auf. Verlass dich nicht darauf: pruefe Kommazahlen immer mit `math.isclose` oder in pytest mit `pytest.approx`."),
    C(`import math

summe = 0.1 + 0.2

print(summe == 0.3)
print(math.isclose(summe, 0.3))`, { aus: "False\nTrue" }),

    H2("Was du testen solltest"),
    NR(
      "**Jede Funktion, die rechnet oder entscheidet.** Der Kern deiner Logik.",
      "**Jeden Fehler, den du gefunden hast.** Schreib zuerst den Test, der ihn zeigt, dann behebe ihn. So kommt er nie zurueck.",
      "**Die Raender.** Leer, eins, null, negativ, Grenzwerte.",
      "**Nicht die Sprache selbst.** Ein Test, ob `sum` funktioniert, ist verlorene Zeit.",
    ),
    MERKE("Der eigentliche Nutzen",
      "Tests fangen nicht nur Fehler. Sie geben dir die Freiheit, Code umzubauen. Wer ohne Tests etwas umschreibt, hofft. Wer Tests hat, weiss nach zehn Sekunden Bescheid.",
    ),
  ],
  quiz: [
    Q("Was macht `assert bedingung`?",
      ["Es gibt die Bedingung aus",
       "Es bricht mit einem AssertionError ab, wenn die Bedingung falsch ist",
       "Es wandelt die Bedingung in einen Wahrheitswert um",
       "Es ueberspringt die naechste Zeile"],
      1,
      "Ist die Bedingung wahr, passiert nichts. Ist sie falsch, bricht das Programm ab."),
    Q("Wie muessen Testdateien und Testfunktionen fuer pytest heissen?",
      ["Sie muessen `pytest_` voranstellen", "Sie muessen mit `test_` beginnen",
       "Der Name ist beliebig", "Sie muessen auf `_test` enden"], 1,
      "pytest sucht Dateien und Funktionen, die mit `test_` beginnen."),
    Q("Wie pruefst du, dass eine Funktion einen Fehler auslost?",
      ["`assert funktion() == Error`",
       "`with pytest.raises(ValueError): funktion()`",
       "`try: funktion() except: pass`",
       "Das laesst sich nicht testen"],
      1,
      "`pytest.raises` erwartet den Fehler. Tritt er nicht auf, faellt der Test durch."),
    Q("Warum solltest du Kommazahlen nicht mit `==` vergleichen?",
      ["Es ist langsamer", "Weil sie im Binaersystem nur genaehert werden",
       "Weil Python das verbietet", "Weil sie immer ungleich sind"], 1,
      "`0.1 + 0.2` ist nicht exakt `0.3`. Nutze `math.isclose` oder `pytest.approx`."),
    Q("Was ist die beste Reaktion auf einen gefundenen Fehler?",
      ["Ihn schnell beheben",
       "Zuerst einen Test schreiben, der ihn zeigt, dann beheben",
       "Ihn dokumentieren",
       "Die Funktion neu schreiben"],
      1,
      "Der Test beweist, dass der Fehler behoben ist, und verhindert, dass er zurueckkommt."),
    Q("Wofuer ist eine Fixture da?",
      ["Um Tests zu ueberspringen", "Um Testdaten bereitzustellen, frisch fuer jeden Test",
       "Um Fehler abzufangen", "Um Tests zu beschleunigen"], 1,
      "Jeder Test, der die Fixture als Parameter fuehrt, bekommt eigene Daten und stoert die anderen nicht."),
  ],
  aufgaben: [
    {
      id: "a35-1",
      titel: "Funktion mit Tests absichern",
      text: [P("Schreibe `spanne(werte)`, die die Differenz zwischen groesstem und kleinstem Wert zurueckgibt. Bei einer leeren Liste kommt `0` zurueck."),
             P("Schreibe danach mindestens vier `assert`-Zeilen, die den Normalfall und die Randfaelle abdecken."),
             P("Erwartete Ausgabe: `Alle Pruefungen bestanden`")],
      start: `def spanne(werte):
    pass

# Pruefungen hier

print("Alle Pruefungen bestanden")`,
      tipps: ["Fange die leere Liste am Anfang mit einem fruehen return ab.",
              "Die Spanne ist `max(werte) - min(werte)`.",
              "Denke an: leer, ein Element, negative Werte, alle gleich."],
      loesung: `def spanne(werte):
    """Differenz zwischen groesstem und kleinstem Wert."""
    if not werte:
        return 0
    return max(werte) - min(werte)


assert spanne([1, 5, 3]) == 4
assert spanne([]) == 0
assert spanne([7]) == 0
assert spanne([-5, 5]) == 10
assert spanne([2, 2, 2]) == 0

print("Alle Pruefungen bestanden")`,
      tests: [
        T("Der Normalfall stimmt", `assert spanne([1, 5, 3]) == 4`),
        T("Die leere Liste gibt null", `assert spanne([]) == 0`),
        T("Ein einzelner Wert gibt null", `assert spanne([7]) == 0`),
        T("Negative Werte funktionieren", `assert spanne([-5, 5]) == 10`),
        T("Gleiche Werte geben null", `assert spanne([2, 2, 2]) == 0`),
        T("Es wurden mindestens vier Pruefungen geschrieben", `assert QUELLE.count("assert") >= 4, f"Gefunden: {QUELLE.count('assert')} Pruefungen"`),
      ],
    },
    {
      id: "a35-2",
      titel: "Einen Fehler finden und absichern",
      text: [P("Die Funktion `rabatt` hat einen Fehler. Ab 100 Euro soll es 10 Prozent geben, ab 500 Euro 20 Prozent."),
             P("Finde den Fehler, behebe ihn und sichere ihn mit Pruefungen ab."),
             P("Erwartete Ausgabe: `Alle Pruefungen bestanden`")],
      start: `def rabatt(betrag):
    if betrag >= 100:
        return betrag * 0.9
    if betrag >= 500:
        return betrag * 0.8
    return betrag

# Pruefungen hier

print("Alle Pruefungen bestanden")`,
      tipps: ["Was passiert bei einem Betrag von 600?",
              "Die erste Bedingung faengt alles ab 100 ab, auch sehr hohe Betraege.",
              "Ordne die Bedingungen von der engsten zur weitesten."],
      loesung: `def rabatt(betrag):
    """Gewaehrt gestaffelten Rabatt."""
    if betrag >= 500:
        return betrag * 0.8
    if betrag >= 100:
        return betrag * 0.9
    return betrag


assert rabatt(50) == 50
assert rabatt(100) == 90.0
assert rabatt(499) == 449.1
assert rabatt(500) == 400.0
assert rabatt(1000) == 800.0

print("Alle Pruefungen bestanden")`,
      loesungstext: "Die Reihenfolge war falsch: die Bedingung ab 100 fing auch alle Betraege ab 500 ab. Die engste Bedingung gehoert nach oben.",
      tests: [
        T("Kleine Betraege bleiben unveraendert", `assert rabatt(50) == 50`),
        T("Ab 100 gibt es zehn Prozent", `assert abs(rabatt(100) - 90.0) < 1e-9, f"Ergebnis: {rabatt(100)}"`),
        T("Knapp unter 500 bleiben es zehn Prozent", `assert abs(rabatt(499) - 449.1) < 1e-9, f"Ergebnis: {rabatt(499)}"`),
        T("Ab 500 gibt es zwanzig Prozent", `assert abs(rabatt(500) - 400.0) < 1e-9, f"Ergebnis: {rabatt(500)}"`),
        T("Auch hohe Betraege bekommen zwanzig Prozent", `assert abs(rabatt(1000) - 800.0) < 1e-9, f"Ergebnis: {rabatt(1000)}"`),
        T("Es wurden Pruefungen geschrieben", `assert QUELLE.count("assert") >= 4, f"Gefunden: {QUELLE.count('assert')} Pruefungen"`),
      ],
    },
  ],
});

M7.push({
  id: "l-projekt",
  titel: "Projekte aufsetzen",
  dauer: 15,
  vorspann: "Ein einzelnes Skript braucht keine Struktur. Sobald mehrere Dateien und fremde Pakete dazukommen, entscheidet der Aufbau darueber, ob das Projekt in einem Jahr noch laeuft.",
  ziele: [
    "Virtuelle Umgebungen anlegen und nutzen",
    "Pakete verwalten und festschreiben",
    "Eine uebliche Projektstruktur kennen",
    "Wissen, was nicht ins Repository gehoert",
  ],
  inhalt: [
    H2("Warum virtuelle Umgebungen"),
    P("Projekt A braucht Version 1.2 einer Bibliothek, Projekt B Version 2.0. Installierst du beides global, gewinnt eines und das andere geht kaputt. Eine virtuelle Umgebung ist ein eigener Ordner mit eigener Python-Installation und eigenen Paketen."),
    SH(`$ python -m venv .venv

$ source .venv/bin/activate        # Linux und macOS
$ .venv\\Scripts\\activate           # Windows

(.venv) $ which python
/pfad/zum/projekt/.venv/bin/python

(.venv) $ deactivate`),
    MERKE("Eine Umgebung pro Projekt",
      "Lege fuer jedes Projekt eine eigene Umgebung an, gleich zu Beginn. Der Ordner heisst per Gewohnheit `.venv` und gehoert **nicht** ins Repository.",
    ),

    H2("Pakete verwalten"),
    SH(`(.venv) $ pip install numpy pandas
(.venv) $ pip install "numpy>=1.24,<2.0"
(.venv) $ pip list
(.venv) $ pip freeze > requirements.txt
(.venv) $ pip install -r requirements.txt
(.venv) $ pip uninstall numpy`),
    P("`pip freeze` schreibt alle installierten Pakete mit genauen Versionen in eine Datei. Wer dein Projekt spaeter aufsetzt, bekommt damit exakt dieselbe Umgebung. Das ist die Voraussetzung dafuer, dass Ergebnisse reproduzierbar bleiben."),
    HINWEIS("Neuere Werkzeuge",
      "`uv` und `poetry` ersetzen venv und pip durch einen einzigen, deutlich schnelleren Befehl und verwalten die Abhaengigkeiten in `pyproject.toml`. Das Grundprinzip bleibt gleich: getrennte Umgebungen, festgeschriebene Versionen.",
    ),

    H2("Eine uebliche Struktur"),
    ROH(`mein-projekt/
  .venv/                  nicht ins Repository
  src/
    mein_projekt/
      __init__.py
      daten.py
      modell.py
      werkzeuge.py
  tests/
    test_daten.py
    test_modell.py
  daten/
    roh/                  grosse Dateien nicht ins Repository
    aufbereitet/
  notebooks/
    erkundung.ipynb
  pyproject.toml
  requirements.txt
  README.md
  .gitignore`),
    P("Die Trennung ist bewusst: Quellcode in `src`, Tests daneben, Daten getrennt davon. Notebooks sind zum Erkunden da, nicht fuer dauerhaften Code. Was du im Notebook gefunden hast, wandert als Funktion nach `src`."),

    H2("Was nicht ins Repository gehoert"),
    ROH(`# .gitignore
.venv/
__pycache__/
*.pyc
.pytest_cache/
.ipynb_checkpoints/

# Daten und Modelle sind meist zu gross
daten/roh/
*.csv
*.pt
*.pkl

# Nie einchecken
.env
*.key`),
    WARN("Zugangsdaten niemals einchecken",
      "Passwoerter und Zugangsschluessel gehoeren in Umgebungsvariablen oder in eine `.env`-Datei, die in `.gitignore` steht. Ein einmal eingecheckter Schluessel bleibt in der Versionsgeschichte, auch nach dem Loeschen.",
    ),
    C(`import os

schluessel = os.environ.get("API_SCHLUESSEL", "nicht gesetzt")
print(f"Schluessel: {schluessel}")

if schluessel == "nicht gesetzt":
    print("Setze die Variable vor dem Start, etwa mit export API_SCHLUESSEL=...")`,
      { aus: "Schluessel: nicht gesetzt\nSetze die Variable vor dem Start, etwa mit export API_SCHLUESSEL=..." }),

    H2("Werkzeuge fuer Codequalitaet"),
    TAB(["Werkzeug", "Aufgabe"],
      ["`ruff`", "prueft Stil und findet Fehler, sehr schnell"],
      ["`black`", "formatiert automatisch nach festen Regeln"],
      ["`mypy`", "prueft Typhinweise"],
      ["`pytest`", "fuehrt Tests aus"],
      ["`pre-commit`", "laesst all das vor jedem Commit laufen"],
    ),
    SH(`(.venv) $ pip install ruff black mypy pytest

(.venv) $ ruff check .
(.venv) $ black .
(.venv) $ mypy src/
(.venv) $ pytest`),
    P("`black` formatiert ohne Rueckfragen nach festen Regeln. Der Vorteil ist nicht die Formatierung selbst, sondern dass Diskussionen darueber aufhoeren. Jedes Team, das `black` einsetzt, spart sich jede Debatte ueber Zeilenumbrueche."),

    H2("Die erste Einrichtung eines Projekts"),
    SH(`$ mkdir mein-projekt && cd mein-projekt
$ git init
$ python -m venv .venv
$ source .venv/bin/activate
$ pip install pytest ruff
$ mkdir -p src/mein_projekt tests
$ touch src/mein_projekt/__init__.py README.md
$ printf '.venv/\\n__pycache__/\\n' > .gitignore
$ pip freeze > requirements.txt
$ git add -A && git commit -m "Grundgeruest"`),
    P("Sechs Minuten Aufwand, die sich immer lohnen. Ein Projekt, das von Anfang an eine Struktur hat, bekommt sie spaeter nicht mehr ohne Schmerzen."),
  ],
  quiz: [
    Q("Wofuer ist eine virtuelle Umgebung da?",
      ["Um Python schneller zu machen",
       "Damit jedes Projekt eigene Paketversionen hat",
       "Um Code zu verschluesseln",
       "Um mehrere Python-Fassungen gleichzeitig zu installieren"],
      1,
      "Ohne getrennte Umgebungen kollidieren die Abhaengigkeiten verschiedener Projekte."),
    Q("Was macht `pip freeze > requirements.txt`?",
      ["Es friert die Umgebung ein",
       "Es schreibt alle installierten Pakete mit Version in eine Datei",
       "Es installiert Pakete aus der Datei",
       "Es loescht nicht benutzte Pakete"],
      1,
      "Damit laesst sich die Umgebung anderswo exakt nachbauen. Zum Installieren nutzt du `pip install -r`."),
    Q("Was gehoert **nicht** ins Repository?",
      ["Der Quellcode", "Die Datei README.md",
       "Der Ordner .venv und Zugangsdaten", "Die Tests"], 2,
      "Umgebungen lassen sich neu erzeugen, und Zugangsdaten haben in der Versionsgeschichte nichts verloren."),
    Q("Wo gehoeren Zugangsschluessel hin?",
      ["In eine Konstante im Code", "In Umgebungsvariablen oder eine ignorierte .env-Datei",
       "In einen Kommentar", "In die README"], 1,
      "Ein einmal eingecheckter Schluessel bleibt in der Versionsgeschichte, auch nach dem Loeschen."),
    Q("Was macht `black`?",
      ["Es prueft auf Fehler", "Es formatiert den Code nach festen Regeln",
       "Es fuehrt Tests aus", "Es prueft Typen"], 1,
      "`black` formatiert ohne Rueckfragen. Der eigentliche Gewinn ist, dass Stildiskussionen aufhoeren."),
  ],
  aufgaben: [
    {
      id: "a36-1",
      titel: "Einstellungen aus der Umgebung lesen",
      text: [P("Schreibe `einstellung(name, vorgabe=None, pflicht=False)`:"),
             L("liest die Umgebungsvariable mit diesem Namen",
               "gibt die Vorgabe zurueck, wenn sie nicht gesetzt ist",
               "loest einen `KeyError` aus, wenn sie fehlt und `pflicht` wahr ist"),
             P("Erwartete Ausgabe:"),
             ROH("standard\nAbgefangen: fehlt")],
      start: `import os

def einstellung(name, vorgabe=None, pflicht=False):
    pass

print(einstellung("GIBT_ES_NICHT_XYZ", "standard"))

try:
    einstellung("GIBT_ES_NICHT_XYZ", pflicht=True)
except KeyError:
    print("Abgefangen: fehlt")`,
      tipps: ["`os.environ.get(name)` liefert None, wenn die Variable fehlt.",
              "Pruefe zuerst auf Pflicht und loese dort den Fehler aus.",
              "Gib sonst den gefundenen Wert oder die Vorgabe zurueck."],
      loesung: `import os

def einstellung(name, vorgabe=None, pflicht=False):
    """Liest eine Umgebungsvariable mit Vorgabe und Pflichtpruefung."""
    wert = os.environ.get(name)
    if wert is None:
        if pflicht:
            raise KeyError(f"Die Umgebungsvariable {name} fehlt")
        return vorgabe
    return wert


print(einstellung("GIBT_ES_NICHT_XYZ", "standard"))

try:
    einstellung("GIBT_ES_NICHT_XYZ", pflicht=True)
except KeyError:
    print("Abgefangen: fehlt")`,
      tests: [
        T("Die Vorgabe greift", `assert einstellung("GIBT_ES_SICHER_NICHT_123", "x") == "x"`),
        T("Ohne Vorgabe kommt None", `assert einstellung("GIBT_ES_SICHER_NICHT_123") is None`),
        T("Eine gesetzte Variable wird gelesen", `import os\nos.environ["TEST_VAR_ABC"] = "gesetzt"\nassert einstellung("TEST_VAR_ABC") == "gesetzt"`),
        T("Pflicht loest einen Fehler aus", `try:\n    einstellung("GIBT_ES_SICHER_NICHT_123", pflicht=True)\n    assert False, "Es kam kein Fehler"\nexcept KeyError:\n    pass`),
        T("Pflicht stoert nicht, wenn die Variable da ist", `import os\nos.environ["TEST_VAR_DEF"] = "da"\nassert einstellung("TEST_VAR_DEF", pflicht=True) == "da"`),
      ],
    },
  ],
});

M7.push({
  id: "l-nebenlaeufig",
  titel: "Nebenlaeufigkeit",
  dauer: 18,
  vorspann: "Mehrere Dinge gleichzeitig tun klingt einfach, ist es in Python aber nicht. Welches der drei Werkzeuge du brauchst, haengt allein davon ab, worauf dein Programm wartet.",
  ziele: [
    "Die Rolle der globalen Sperre verstehen",
    "Threads, Prozesse und asyncio unterscheiden",
    "Das richtige Werkzeug fuer die jeweilige Last waehlen",
    "Typische Fallstricke vermeiden",
  ],
  inhalt: [
    H2("Die globale Sperre"),
    P("In CPython, der ueblichen Python-Fassung, gibt es eine Sperre, die dafuer sorgt, dass immer nur ein Thread gleichzeitig Python-Anweisungen ausfuehrt. Sie heisst *global interpreter lock*, kurz GIL."),
    P("Die Folge ist entscheidend: mehrere Threads beschleunigen **rechenlastige** Arbeit nicht. Bei **wartender** Arbeit dagegen sehr wohl, denn waehrend ein Thread auf das Netzwerk oder die Festplatte wartet, gibt er die Sperre frei."),
    TAB(["Art der Last", "Beispiel", "Das richtige Werkzeug"],
      ["wartend, wenige Aufgaben", "einige Dateien lesen", "`threading`"],
      ["wartend, sehr viele Aufgaben", "tausend Netzwerkabfragen", "`asyncio`"],
      ["rechnend", "Zahlen verarbeiten, Bilder", "`multiprocessing`"],
      ["rechnend mit Bibliothek", "NumPy, PyTorch", "meist nichts, die Bibliothek macht es selbst"],
    ),
    HINWEIS("Der Ausblick",
      "Ab Python 3.13 gibt es eine experimentelle Fassung ohne diese Sperre. Bis sie ueberall verfuegbar ist, gelten die Regeln oben weiter.",
    ),

    H2("Threads"),
    C(`import threading
import time

def lade(name, dauer):
    print(f"  {name} startet")
    time.sleep(dauer)
    print(f"  {name} fertig")

start = time.perf_counter()

faeden = [
    threading.Thread(target=lade, args=("A", 0.3)),
    threading.Thread(target=lade, args=("B", 0.3)),
    threading.Thread(target=lade, args=("C", 0.3)),
]

for f in faeden:
    f.start()

for f in faeden:
    f.join()

print(f"Gesamt: {time.perf_counter() - start:.1f} s statt 0.9 s")`,
      { lauf: false, nichtpruefen: true,
        aus: "  A startet\n  B startet\n  C startet\n  A fertig\n  B fertig\n  C fertig\nGesamt: 0.3 s statt 0.9 s" }),
    P("`start()` beginnt die Ausfuehrung, `join()` wartet auf das Ende. Weil alle drei gleichzeitig warten, dauert es nur so lange wie der laengste einzelne Vorgang."),
    P("Bequemer geht es mit einem Ausfuehrer, der die Faeden selbst verwaltet:"),
    C(`from concurrent.futures import ThreadPoolExecutor
import time

def lade(name):
    time.sleep(0.2)
    return f"{name} geladen"

with ThreadPoolExecutor(max_workers=4) as pool:
    ergebnisse = list(pool.map(lade, ["A", "B", "C", "D"]))

for e in ergebnisse:
    print(e)`,
      { lauf: false, nichtpruefen: true, aus: "A geladen\nB geladen\nC geladen\nD geladen" }),

    H2("Gemeinsame Daten"),
    C(`import threading

zaehler = 0
sperre = threading.Lock()

def erhoehen_unsicher():
    global zaehler
    for _ in range(100_000):
        zaehler += 1

def erhoehen_sicher():
    global zaehler
    for _ in range(100_000):
        with sperre:
            zaehler += 1

zaehler = 0
faeden = [threading.Thread(target=erhoehen_sicher) for _ in range(4)]
for f in faeden: f.start()
for f in faeden: f.join()

print("Mit Sperre:", zaehler)`,
      { lauf: false, nichtpruefen: true, aus: "Mit Sperre: 400000" }),
    WARN("Das Problem heisst Wettlauf",
      "`zaehler += 1` besteht aus Lesen, Addieren und Schreiben. Unterbricht ein anderer Thread dazwischen, gehen Erhoehungen verloren. Ohne Sperre kommt bei dem Beispiel eine unvorhersehbare Zahl unter 400000 heraus.",
    ),
    TIPP("Am besten gar nichts teilen",
      "Jede Sperre ist eine Gelegenheit fuer Fehler. Lass jeden Faden ein Ergebnis zurueckgeben und fuege sie am Ende zusammen, statt gemeinsame Variablen zu veraendern. `ThreadPoolExecutor` mit `map` macht genau das.",
    ),

    H2("Prozesse"),
    C(`from concurrent.futures import ProcessPoolExecutor
import time

def rechnen(n):
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    aufgaben = [2_000_000] * 4

    start = time.perf_counter()
    einzeln = [rechnen(n) for n in aufgaben]
    zeit_einzeln = time.perf_counter() - start

    start = time.perf_counter()
    with ProcessPoolExecutor() as pool:
        parallel = list(pool.map(rechnen, aufgaben))
    zeit_parallel = time.perf_counter() - start

    print(f"Nacheinander: {zeit_einzeln:.2f} s")
    print(f"Parallel:     {zeit_parallel:.2f} s")
    print(f"Gleiches Ergebnis: {einzeln == parallel}")`,
      { lauf: false, nichtpruefen: true,
        aus: "Nacheinander: 0.84 s\nParallel:     0.31 s\nGleiches Ergebnis: True" }),
    P("Jeder Prozess hat seinen eigenen Interpreter und damit seine eigene Sperre. Deshalb rechnen sie wirklich parallel. Der Preis: das Starten kostet Zeit, und alle Daten muessen zwischen den Prozessen kopiert werden."),
    WARN("Der Namensschutz ist Pflicht",
      "Bei `multiprocessing` brauchst du auf Windows und macOS zwingend `if __name__ == \"__main__\":`. Sonst startet jeder neue Prozess die Datei erneut und erzeugt wieder Prozesse, bis nichts mehr geht.",
    ),

    H2("asyncio"),
    C(`import asyncio

async def lade(name, dauer):
    print(f"  {name} startet")
    await asyncio.sleep(dauer)
    print(f"  {name} fertig")
    return f"{name}: {dauer}s"

async def haupt():
    ergebnisse = await asyncio.gather(
        lade("A", 0.3),
        lade("B", 0.1),
        lade("C", 0.2),
    )
    print(ergebnisse)

asyncio.run(haupt())`,
      { lauf: false, nichtpruefen: true,
        aus: "  A startet\n  B startet\n  C startet\n  B fertig\n  C fertig\n  A fertig\n['A: 0.3s', 'B: 0.1s', 'C: 0.2s']" }),
    TAB(["Schluesselwort", "Bedeutung"],
      ["`async def`", "definiert eine Koroutine"],
      ["`await`", "warte hier, lass inzwischen anderes laufen"],
      ["`asyncio.run(...)`", "startet die Ereignisschleife"],
      ["`asyncio.gather(...)`", "fuehrt mehrere Koroutinen nebeneinander aus"],
    ),
    P("Der entscheidende Punkt: das alles laeuft in **einem einzigen Thread**. Bei jedem `await` gibt die Koroutine die Kontrolle ab, und die Schleife arbeitet inzwischen an etwas anderem. Deshalb gibt es keine Wettlaufbedingungen und keine Sperren."),
    WARN("Ein blockierender Aufruf blockiert alles",
      "Steht in einer Koroutine `time.sleep(1)` statt `await asyncio.sleep(1)`, steht die ganze Ereignisschleife eine Sekunde still. Innerhalb von asyncio muss jede wartende Bibliothek asynchron sein.",
    ),

    H2("Die Entscheidungshilfe"),
    NR(
      "**Wartet dein Programm ueberhaupt?** Wenn nein, und es rechnet nur, hilft nur `multiprocessing` oder eine Bibliothek wie NumPy.",
      "**Sind es wenige wartende Aufgaben?** Dann `ThreadPoolExecutor`, das ist am einfachsten.",
      "**Sind es hunderte oder tausende?** Dann `asyncio`, Threads werden dort zu teuer.",
      "**Im Zweifel: gar nichts.** Nebenlaeufigkeit macht Code deutlich schwerer verstaendlich. Miss zuerst, ob es sich lohnt.",
    ),
    MERKE("In der KI",
      "Beim Training rechnet die Bibliothek selbst parallel, auf allen Kernen oder auf der Grafikkarte. Nebenlaeufigkeit brauchst du dort vor allem beim **Laden der Daten**, und dafuer bringen die Werkzeuge bereits eigene Loesungen mit.",
    ),
  ],
  quiz: [
    Q("Was bewirkt die globale Sperre in CPython?",
      ["Sie verhindert alle Threads",
       "Es fuehrt immer nur ein Thread gleichzeitig Python-Anweisungen aus",
       "Sie macht Python langsamer",
       "Sie sperrt Dateien"],
      1,
      "Bei rechnender Arbeit bringen Threads dadurch nichts. Bei wartender Arbeit schon, weil die Sperre dann freigegeben wird."),
    Q("Welches Werkzeug fuer tausend gleichzeitige Netzwerkabfragen?",
      ["threading", "multiprocessing", "asyncio", "Eine einfache Schleife"], 2,
      "Tausend Threads sind zu teuer. asyncio bewaeltigt das in einem einzigen Thread."),
    Q("Welches Werkzeug fuer rechenlastige Arbeit auf mehreren Kernen?",
      ["threading", "multiprocessing", "asyncio", "Alle drei gleich gut"], 1,
      "Nur getrennte Prozesse haben eigene Interpreter und umgehen damit die Sperre."),
    Q("Warum ist `zaehler += 1` in mehreren Threads gefaehrlich?",
      ["Es ist zu langsam",
       "Es besteht aus mehreren Schritten, zwischen denen unterbrochen werden kann",
       "Threads koennen nicht auf globale Variablen zugreifen",
       "Es ist nicht gefaehrlich"],
      1,
      "Lesen, Addieren, Schreiben. Unterbricht ein anderer Thread dazwischen, geht eine Erhoehung verloren."),
    Q("Was passiert bei `time.sleep(1)` innerhalb einer Koroutine?",
      ["Nichts Besonderes", "Die gesamte Ereignisschleife steht eine Sekunde still",
       "Es gibt einen Fehler", "Es wird automatisch in await umgewandelt"], 1,
      "asyncio laeuft in einem Thread. Ein blockierender Aufruf haelt alles an. Nutze `await asyncio.sleep`."),
    Q("Warum braucht multiprocessing den Namensschutz?",
      ["Aus Gewohnheit",
       "Sonst startet jeder neue Prozess die Datei erneut und erzeugt wieder Prozesse",
       "Damit die Sperre greift",
       "Um Speicher zu sparen"],
      1,
      "Auf Windows und macOS wird die Datei beim Start eines Prozesses neu geladen. Ohne den Schutz entsteht eine endlose Kette."),
  ],
  aufgaben: [
    {
      id: "a37-1",
      titel: "Das richtige Werkzeug waehlen",
      text: [P("Schreibe `empfehlung(art, anzahl)`, die einen der Werte `multiprocessing`, `threading`, `asyncio` oder `keine` zurueckgibt."),
             L("`art` ist `\"rechnen\"` oder `\"warten\"`.",
               "Bei `\"rechnen\"` und mehr als einer Aufgabe: `multiprocessing`, sonst `keine`.",
               "Bei `\"warten\"` und bis zu 50 Aufgaben: `threading`, darueber `asyncio`.",
               "Bei nur einer Aufgabe immer `keine`.")],
      start: `def empfehlung(art, anzahl):
    pass

print(empfehlung("rechnen", 8))
print(empfehlung("warten", 10))
print(empfehlung("warten", 500))
print(empfehlung("warten", 1))`,
      tipps: ["Fange den Fall mit einer einzigen Aufgabe zuerst ab.",
              "Danach unterscheidest du nach der Art.",
              "Bei `warten` entscheidet die Anzahl zwischen threading und asyncio."],
      loesung: `def empfehlung(art, anzahl):
    """Empfiehlt das passende Werkzeug fuer Nebenlaeufigkeit."""
    if anzahl <= 1:
        return "keine"
    if art == "rechnen":
        return "multiprocessing"
    if anzahl <= 50:
        return "threading"
    return "asyncio"


print(empfehlung("rechnen", 8))
print(empfehlung("warten", 10))
print(empfehlung("warten", 500))
print(empfehlung("warten", 1))`,
      tests: [
        T("Rechnen mit vielen Aufgaben", `assert empfehlung("rechnen", 8) == "multiprocessing"`),
        T("Wenige wartende Aufgaben", `assert empfehlung("warten", 10) == "threading"`),
        T("Viele wartende Aufgaben", `assert empfehlung("warten", 500) == "asyncio"`),
        T("Eine einzelne Aufgabe", `assert empfehlung("warten", 1) == "keine" and empfehlung("rechnen", 1) == "keine"`),
        T("Die Grenze bei 50 stimmt", `assert empfehlung("warten", 50) == "threading" and empfehlung("warten", 51) == "asyncio"`),
      ],
    },
  ],
});

M7.push({
  id: "l-leistung",
  titel: "Geschwindigkeit und Speicher",
  dauer: 16,
  vorspann: "Bevor du Code schneller machst, musst du wissen, wo er langsam ist. Fast jede Vermutung darueber ist falsch, deshalb wird gemessen statt geraten.",
  ziele: [
    "Laufzeiten richtig messen",
    "Die Aufwandsklassen der Datenstrukturen kennen",
    "Typische Beschleunigungen anwenden",
    "Speicherverbrauch einschaetzen",
  ],
  inhalt: [
    H2("Erst messen"),
    C(`import time

def langsam(n):
    ergebnis = ""
    for i in range(n):
        ergebnis += str(i)
    return ergebnis

def schnell(n):
    return "".join(str(i) for i in range(n))

for funktion in (langsam, schnell):
    start = time.perf_counter()
    funktion(50_000)
    print(f"{funktion.__name__:<8}{time.perf_counter() - start:.4f} s")`,
      { lauf: true }),
    P("Text mit `+=` aufzubauen erzeugt bei jedem Durchlauf eine neue Zeichenkette, weil Zeichenketten unveraenderlich sind. `join` baut das Ergebnis einmal. Der Unterschied waechst mit der Groesse."),
    HINWEIS("Genauer messen",
      "Fuer verlaessliche Messungen kleiner Codestuecke gibt es das Modul `timeit`, das viele Durchlaeufe mittelt. Fuer ganze Programme nutzt du `cProfile`, das zeigt, welche Funktion wie viel Zeit verbraucht.",
    ),
    SH(`$ python -m timeit -s "werte=list(range(1000))" "sum(werte)"
20000 loops, best of 5: 12.4 usec per loop

$ python -m cProfile -s cumtime mein_programm.py`),

    H2("Die Aufwandsklassen"),
    P("Entscheidend ist, wie die Dauer mit der Datenmenge waechst. Das ist wichtiger als jede Mikrooptimierung."),
    TAB(["Aufgabe", "Liste", "Menge oder Dictionary"],
      ["`x in sammlung`", "waechst linear", "praktisch konstant"],
      ["Anhaengen", "konstant", "konstant"],
      ["Am Anfang einfuegen", "waechst linear", "entfaellt"],
      ["Zugriff ueber Position", "konstant", "entfaellt"],
      ["Zugriff ueber Schluessel", "entfaellt", "praktisch konstant"],
    ),
    C(`import time

viele = list(range(100_000))
als_menge = set(viele)
suchen = list(range(0, 100_000, 1000))

start = time.perf_counter()
treffer = sum(1 for s in suchen if s in viele)
zeit_liste = time.perf_counter() - start

start = time.perf_counter()
treffer = sum(1 for s in suchen if s in als_menge)
zeit_menge = time.perf_counter() - start

print(f"Liste: {zeit_liste:.4f} s")
print(f"Menge: {zeit_menge:.6f} s")`, { lauf: true }),
    MERKE("Die wichtigste Regel",
      "Wenn du in einer Schleife pruefst, ob etwas in einer Liste enthalten ist, wandle die Liste vorher in eine Menge um. Das ist die haeufigste und wirkungsvollste Beschleunigung ueberhaupt.",
    ),

    H2("Typische Beschleunigungen"),
    C(`import time

werte = list(range(200_000))

start = time.perf_counter()
ergebnis_a = []
for w in werte:
    ergebnis_a.append(w * 2)
zeit_a = time.perf_counter() - start

start = time.perf_counter()
ergebnis_b = [w * 2 for w in werte]
zeit_b = time.perf_counter() - start

start = time.perf_counter()
ergebnis_c = list(map(lambda w: w * 2, werte))
zeit_c = time.perf_counter() - start

print(f"Schleife:      {zeit_a:.4f} s")
print(f"Comprehension: {zeit_b:.4f} s")
print(f"map:           {zeit_c:.4f} s")
print("Alle gleich:", ergebnis_a == ergebnis_b == ergebnis_c)`, { lauf: true }),
    TAB(["Statt", "Besser", "Grund"],
      ["`text += teil` in Schleife", "`\"\".join(teile)`", "keine Kopie pro Durchlauf"],
      ["`x in liste` in Schleife", "`x in menge`", "kein Durchsuchen"],
      ["Schleife mit `append`", "Comprehension", "weniger Aufrufe"],
      ["`liste.pop(0)`", "`collections.deque`", "kein Nachruecken"],
      ["Eigene Schleife fuer Summen", "`sum`, `max`, `min`", "in C umgesetzt"],
      ["Zahlen in Schleifen", "NumPy-Arrays", "vektorisiert"],
    ),

    H2("Speicher"),
    C(`import sys

liste = [i for i in range(100_000)]
erzeuger = (i for i in range(100_000))
menge = set(range(100_000))
text = "x" * 100_000

print(f"Liste:     {sys.getsizeof(liste):>9} Byte")
print(f"Generator: {sys.getsizeof(erzeuger):>9} Byte")
print(f"Menge:     {sys.getsizeof(menge):>9} Byte")
print(f"Text:      {sys.getsizeof(text):>9} Byte")`, { lauf: true }),
    P("`sys.getsizeof` misst nur das Objekt selbst, nicht seine Inhalte. Eine Liste von hunderttausend Zahlen belegt deutlich mehr, wenn man die Zahlen mitzaehlt. Fuer eine genaue Messung gibt es `tracemalloc`."),
    C(`import tracemalloc

tracemalloc.start()

daten = [list(range(1000)) for _ in range(100)]

aktuell, hoechstwert = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"Aktuell:     {aktuell / 1024:.0f} KB")
print(f"Hoechstwert: {hoechstwert / 1024:.0f} KB")`, { lauf: true }),

    H2("Die Reihenfolge beim Optimieren"),
    NR(
      "**Erst richtig, dann schnell.** Ein falsches Ergebnis in halber Zeit nuetzt nichts.",
      "**Messen, nicht raten.** Die langsame Stelle liegt fast nie dort, wo man sie vermutet.",
      "**Den Algorithmus vor dem Code.** Von linear auf konstant bringt mehr als jede Zeilenoptimierung.",
      "**Die eingebauten Werkzeuge nutzen.** `sum`, `sorted` und `join` sind in C geschrieben.",
      "**Erst dann Feinarbeit.** Und nur an der Stelle, die die Messung gezeigt hat.",
    ),
    WARN("Vorzeitige Optimierung",
      "Code, der auf Geschwindigkeit getrimmt ist, ist schwerer zu lesen und zu aendern. Optimiere nur, wo es nachweislich noetig ist. In den meisten Programmen ist die Geschwindigkeit voellig ausreichend.",
    ),
  ],
  quiz: [
    Q("Warum ist `text += teil` in einer Schleife langsam?",
      ["Weil der Speicher voll laeuft",
       "Weil Zeichenketten unveraenderlich sind und jedes Mal eine neue entsteht",
       "Weil das Pluszeichen langsam ist",
       "Das stimmt nicht, es ist schnell"],
      1,
      "Jede Zuweisung kopiert die gesamte bisherige Zeichenkette. `join` baut das Ergebnis einmal auf."),
    Q("Was ist die wirkungsvollste Beschleunigung bei vielen Enthaltensein-Pruefungen?",
      ["Die Liste sortieren", "Die Liste in eine Menge umwandeln",
       "Eine Comprehension nutzen", "Threads einsetzen"], 1,
      "Die Suche in einer Menge haengt praktisch nicht von der Groesse ab."),
    Q("Was misst `sys.getsizeof(liste)`?",
      ["Die Groesse der Liste samt Inhalt", "Nur das Listenobjekt selbst, ohne die Elemente",
       "Die Anzahl der Elemente", "Den freien Speicher"], 1,
      "Fuer den vollstaendigen Verbrauch brauchst du `tracemalloc` oder musst die Elemente einzeln zaehlen."),
    Q("Was solltest du **zuerst** tun, wenn ein Programm zu langsam ist?",
      ["Schleifen durch Comprehensions ersetzen",
       "Messen, wo die Zeit verbraucht wird",
       "Threads einsetzen",
       "Auf C umsteigen"],
      1,
      "Ohne Messung optimierst du fast immer die falsche Stelle."),
    Q("Welche Aenderung bringt in der Regel am meisten?",
      ["Variablennamen kuerzen", "Den Algorithmus verbessern, etwa von linear auf konstant",
       "Kommentare entfernen", "Weniger Funktionen benutzen"], 1,
      "Die Aufwandsklasse schlaegt jede Feinarbeit an einzelnen Zeilen."),
  ],
  aufgaben: [
    {
      id: "a38-1",
      titel: "Langsamen Code beschleunigen",
      text: [P("Die Funktion sucht fuer jeden Wert, ob er in der Sperrliste steht. Bei grossen Listen dauert das sehr lange."),
             P("Schreibe sie so um, dass sie dasselbe Ergebnis liefert, aber die Sperrliste nur einmal umgewandelt wird."),
             P("Erwartete Ausgabe: `[1, 4]`")],
      start: `def erlaubte(werte, sperrliste):
    ergebnis = []
    for w in werte:
        if w not in sperrliste:
            ergebnis.append(w)
    return ergebnis

print(erlaubte([1, 2, 3, 4], [2, 3]))`,
      tipps: ["Wandle die Sperrliste einmal am Anfang in eine Menge um.",
              "Die Pruefung `w not in menge` ist unabhaengig von der Groesse schnell.",
              "Das Ergebnis laesst sich in einer Comprehension aufbauen."],
      loesung: `def erlaubte(werte, sperrliste):
    """Gibt alle Werte zurueck, die nicht gesperrt sind."""
    gesperrt = set(sperrliste)
    return [w for w in werte if w not in gesperrt]


print(erlaubte([1, 2, 3, 4], [2, 3]))`,
      tests: [
        T("Das Ergebnis stimmt", `assert erlaubte([1, 2, 3, 4], [2, 3]) == [1, 4]`),
        T("Die Reihenfolge bleibt erhalten", `assert erlaubte([5, 1, 9], []) == [5, 1, 9]`),
        T("Eine leere Sperrliste laesst alles durch", `assert erlaubte([1, 2], []) == [1, 2]`),
        T("Doppelte Werte bleiben erhalten", `assert erlaubte([1, 1, 2], [2]) == [1, 1]`),
        T("Die Sperrliste wird in eine Menge umgewandelt", `assert "set(" in QUELLE, "Wandle die Sperrliste einmal in eine Menge um"`),
        T("Sie ist bei grossen Daten schnell", `import time\ngross = list(range(20000))\nsperr = list(range(10000))\nstart = time.perf_counter()\nerlaubte(gross, sperr)\nassert time.perf_counter() - start < 0.5, "Noch zu langsam, die Umwandlung fehlt"`),
      ],
    },
    {
      id: "a38-2",
      titel: "Text effizient aufbauen",
      text: [P("Baue aus den Zeilen einen einzigen Text, in dem jede Zeile nummeriert ist. Nutze keine Verkettung mit `+=`."),
             P("Erwartete Ausgabe:"),
             ROH("1: Alpha\n2: Beta\n3: Gamma")],
      start: `zeilen = ["Alpha", "Beta", "Gamma"]

text = 

print(text)`,
      tipps: ["`enumerate(zeilen, start=1)` liefert Nummer und Zeile.",
              "Baue eine Liste der fertigen Zeilen mit einer Comprehension.",
              "`\"\\n\".join(...)` fuegt sie mit Umbruch zusammen."],
      loesung: `zeilen = ["Alpha", "Beta", "Gamma"]

text = "\\n".join(f"{nr}: {zeile}" for nr, zeile in enumerate(zeilen, start=1))

print(text)`,
      tests: [
        T("Der Text stimmt", `assert text == "1: Alpha\\n2: Beta\\n3: Gamma", f"Ergebnis: {text!r}"`),
        T("Es wurde join benutzt", `assert "join" in QUELLE, "Nutze join statt Verkettung"`),
        T("Es wurde kein += benutzt", `assert "+=" not in QUELLE, "Baue den Text ohne += auf"`),
        T("Es steht kein Umbruch am Ende", `assert not text.endswith("\\n"), "Am Ende gehoert kein Umbruch"`),
      ],
    },
  ],
});

M7.push({
  id: "l-stil",
  titel: "Sauberer Code und Python-Idiome",
  dauer: 17,
  vorspann: "Code wird viel oefter gelesen als geschrieben. Die folgenden Gewohnheiten sind das, was erfahrene Entwickler von Anfaengern unterscheidet, mehr als jedes Sprachwissen.",
  ziele: [
    "Die Kernregeln von PEP 8 anwenden",
    "Typische Python-Idiome erkennen und nutzen",
    "Funktionen richtig schneiden",
    "Code schreiben, den andere in einem Jahr noch verstehen",
  ],
  inhalt: [
    H2("PEP 8 in der Kurzfassung"),
    TAB(["Regel", "Beispiel"],
      ["Vier Leerzeichen einruecken", "nie Tabulatoren, nie zwei"],
      ["Zeilen bis etwa 88 Zeichen", "`black` bricht dort um"],
      ["Funktionen und Variablen klein", "`lade_daten`, `anzahl_epochen`"],
      ["Klassen gross", "`Messstation`, `DatenLader`"],
      ["Konstanten ganz gross", "`MAX_VERSUCHE = 3`"],
      ["Leerzeichen um Operatoren", "`a = b + c`, nicht `a=b+c`"],
      ["Keine Leerzeichen in Klammern", "`f(a, b)`, nicht `f( a, b )`"],
      ["Zwei Leerzeilen zwischen Funktionen", "eine innerhalb von Klassen"],
      ["Importe oben, gruppiert", "Standard, fremd, eigen"],
    ),
    C(`# Standardbibliothek
import json
import math
from pathlib import Path

# fremde Pakete
import numpy as np

# eigene Module
from meinprojekt.daten import laden`, { lauf: false }),
    TIPP("Nicht auswendig lernen",
      "`ruff` und `black` setzen all das automatisch durch. Installiere sie einmal, und du musst ueber Formatierung nie wieder nachdenken.",
    ),

    H2("Die wichtigsten Idiome"),
    H("Leere Sammlungen pruefen"),
    C(`werte = []

# umstaendlich
if len(werte) == 0:
    print("leer")

# so schreibt man es
if not werte:
    print("leer")`, { aus: "leer\nleer" }),
    H("Werte tauschen"),
    C(`a, b = 1, 2
a, b = b, a
print(a, b)`, { aus: "2 1" }),
    H("Ueber Elemente statt ueber Positionen"),
    C(`namen = ["Ada", "Grace"]

# unnoetig
for i in range(len(namen)):
    print(namen[i], end=" ")
print()

# so
for name in namen:
    print(name, end=" ")
print()

# wenn du den Index brauchst
for i, name in enumerate(namen):
    print(f"{i}:{name}", end=" ")
print()`, { aus: "Ada Grace \nAda Grace \n0:Ada 1:Grace " }),
    H("Vorgabewerte aus Dictionaries"),
    C(`einstellungen = {"lernrate": 0.01}

# umstaendlich
if "epochen" in einstellungen:
    epochen = einstellungen["epochen"]
else:
    epochen = 10

# so
epochen = einstellungen.get("epochen", 10)
print(epochen)`, { aus: "10" }),
    H("Bedingungen verketten"),
    C(`alter = 25

print(18 <= alter <= 67)
print("a" in "abc" and 1 < 2 < 3)`, { aus: "True\nTrue" }),
    H("Mehrere Sammlungen gleichzeitig"),
    C(`namen = ["Ada", "Grace"]
jahre = [1815, 1906]

for name, jahr in zip(namen, jahre):
    print(f"{name}: {jahr}")`, { aus: "Ada: 1815\nGrace: 1906" }),

    H2("Funktionen richtig schneiden"),
    P("Diese Funktion ist zu lang und tut zu viel:"),
    C(`def alles_machen(pfad):
    zeilen = []
    with open(pfad, encoding="utf-8") as f:
        for zeile in f:
            zeile = zeile.strip()
            if zeile and not zeile.startswith("#"):
                zeilen.append(zeile)
    zahlen = []
    for z in zeilen:
        try:
            zahlen.append(float(z))
        except ValueError:
            pass
    if not zahlen:
        return None
    schnitt = sum(zahlen) / len(zahlen)
    abweichung = (sum((z - schnitt) ** 2 for z in zahlen) / len(zahlen)) ** 0.5
    print(f"Anzahl: {len(zahlen)}")
    print(f"Schnitt: {schnitt:.2f}")
    print(f"Abweichung: {abweichung:.2f}")
    return schnitt, abweichung`, { lauf: false }),
    P("Sie liest, filtert, wandelt um, rechnet und gibt aus. Jeder dieser Schritte gehoert in eine eigene Funktion:"),
    C(`def zeilen_lesen(pfad):
    """Liest die Datei und entfernt Leerzeilen und Kommentare."""
    with open(pfad, encoding="utf-8") as f:
        return [z.strip() for z in f if z.strip() and not z.startswith("#")]


def als_zahlen(zeilen):
    """Wandelt um, was sich umwandeln laesst."""
    zahlen = []
    for z in zeilen:
        try:
            zahlen.append(float(z))
        except ValueError:
            continue
    return zahlen


def kennzahlen(zahlen):
    """Gibt Mittelwert und Standardabweichung zurueck."""
    if not zahlen:
        return None
    schnitt = sum(zahlen) / len(zahlen)
    abweichung = (sum((z - schnitt) ** 2 for z in zahlen) / len(zahlen)) ** 0.5
    return schnitt, abweichung


def bericht(pfad):
    """Liest eine Datei und gibt ihre Kennzahlen aus."""
    zahlen = als_zahlen(zeilen_lesen(pfad))
    ergebnis = kennzahlen(zahlen)
    if ergebnis is None:
        print("Keine gueltigen Zahlen gefunden")
        return None
    schnitt, abweichung = ergebnis
    print(f"Anzahl: {len(zahlen)}, Schnitt: {schnitt:.2f}, Abweichung: {abweichung:.2f}")
    return ergebnis


with open("werte.txt", "w", encoding="utf-8") as f:
    f.write("# Kommentar\\n12\\n\\nkaputt\\n7\\n23\\n")

bericht("werte.txt")`, { aus: "Anzahl: 3, Schnitt: 14.00, Abweichung: 6.68" }),
    P("Jede Funktion laesst sich jetzt einzeln testen, einzeln verstehen und anderswo wiederverwenden. Und die Berechnung ist von der Ausgabe getrennt."),

    H2("Namen"),
    TAB(["Schlecht", "Besser"],
      ["`d`", "`dauer_sekunden`"],
      ["`process(x)`", "`bereinige_messwerte(rohdaten)`"],
      ["`flag`", "`ist_abgeschlossen`"],
      ["`data2`", "`gefilterte_daten`"],
      ["`tmp`", "`zwischensumme`"],
      ["`check()`", "`ist_gueltig()`"],
    ),
    P("Wahrheitswerte beginnen mit `ist_`, `hat_` oder `kann_`. Funktionen, die etwas tun, sind Verben. Funktionen, die etwas liefern, koennen Substantive sein. Die Laenge eines Namens darf zur Wichtigkeit passen: ein Schleifenzaehler heisst `i`, ein Modulattribut nicht."),

    H2("Kommentare"),
    C(`# schlecht: wiederholt nur den Code
zaehler = zaehler + 1  # erhoehe den Zaehler um eins

# gut: erklaert, warum
zaehler += 1  # zaehlt auch abgelehnte Versuche, das verlangt die Pruefstelle

# gut: warnt vor einer Falle
werte = werte[:]  # Kopie, weil der Aufrufer die Liste weiterbenutzt`, { lauf: false }),
    MERKE("Die Regel fuer Kommentare",
      "Der Code sagt **was** passiert. Der Kommentar sagt **warum**. Wenn du erklaeren musst, was eine Zeile tut, schreib die Zeile um statt sie zu kommentieren.",
    ),

    H2("Die Zen-Regeln"),
    C(`import this`, { lauf: true, name: "Die Grundsaetze von Python" }),
    P("Fuehr das aus. Die wichtigsten dieser neunzehn Saetze in deutscher Fassung:"),
    L(
      "**Schoen ist besser als haesslich.** Wenn es unangenehm aussieht, ist es meist auch falsch aufgebaut.",
      "**Ausdruecklich ist besser als versteckt.** Schreib hin, was passiert, statt es zu verbergen.",
      "**Einfach ist besser als kompliziert.** Und flach ist besser als verschachtelt.",
      "**Lesbarkeit zaehlt.** Der wichtigste Satz von allen.",
      "**Sonderfaelle rechtfertigen keine Ausnahmen von den Regeln.** Ausser wenn die Praxis es verlangt.",
      "**Fehler sollten niemals stillschweigend uebergangen werden.** Ausser wenn ausdruecklich gewollt.",
      "**Es sollte einen, und moeglichst nur einen offensichtlichen Weg geben.**",
    ),
    P("Diese Saetze klingen wie Kalendersprueche, beschreiben aber tatsaechlich, warum Python so aussieht, wie es aussieht. Wenn du zwischen zwei Loesungen schwankst, nimm die, die sich besser liest."),

    H2("Eine Merkliste vor dem Abgeben"),
    NR(
      "Hat jede Funktion einen Namen, der ihre Aufgabe verraet?",
      "Passt jede Funktion auf einen Bildschirm?",
      "Gibt es doppelten Code, der in eine Funktion gehoert?",
      "Sind die Randfaelle behandelt: leer, null, negativ, fehlend?",
      "Werden Fehler gezielt abgefangen, ohne nacktes except?",
      "Erklaeren die Kommentare das Warum statt das Was?",
      "Laeuft `ruff` ohne Beanstandung durch?",
      "Gibt es Tests fuer die wichtigsten Funktionen?",
    ),
  ],
  quiz: [
    Q("Wie prueft man in Python auf eine leere Liste?",
      ["`if len(liste) == 0:`", "`if not liste:`", "`if liste == []:`", "`if liste.is_empty():`"], 1,
      "Eine leere Sammlung gilt als falsch. Die kurze Form ist die uebliche."),
    Q("Wie viele Leerzeichen sind eine Einrueckungsebene?",
      ["Zwei", "Drei", "Vier", "Ein Tabulator"], 2,
      "Vier Leerzeichen, nie Tabulatoren. `black` setzt das automatisch durch."),
    Q("Was soll ein Kommentar erklaeren?",
      ["Was der Code tut", "Warum er es so tut",
       "Wer ihn geschrieben hat", "Wie lange er braucht"], 1,
      "Das Was steht bereits im Code. Musst du es erklaeren, schreib den Code um."),
    Q("Welcher Name ist am besten fuer einen Wahrheitswert?",
      ["`status`", "`check`", "`ist_gueltig`", "`flag`"], 2,
      "Wahrheitswerte beginnen mit `ist_`, `hat_` oder `kann_`. Dann liest sich die Bedingung wie ein Satz."),
    Q("Woran erkennst du, dass eine Funktion zu lang ist?",
      ["Sie hat mehr als zehn Zeilen",
       "Sie passt nicht auf einen Bildschirm oder tut mehrere Dinge",
       "Sie hat mehr als zwei Parameter",
       "Sie enthaelt eine Schleife"],
      1,
      "Die Zeilenzahl allein sagt wenig. Entscheidend ist, ob sie eine einzige Aufgabe hat."),
    Q("Was ist der wichtigste Satz aus den Grundsaetzen von Python?",
      ["Schneller ist besser als langsamer", "Lesbarkeit zaehlt",
       "Kuerzer ist besser als laenger", "Klassen sind besser als Funktionen"], 1,
      "Code wird oefter gelesen als geschrieben. Alles andere ordnet sich dem unter."),
  ],
  aufgaben: [
    {
      id: "a39-1",
      titel: "Code aufraeumen",
      text: [P("Der folgende Code funktioniert, ist aber unsauber. Schreibe ihn um:"),
             L("Nutze sprechende Namen.",
               "Pruefe die leere Liste auf die uebliche Art.",
               "Laufe ueber die Elemente statt ueber Positionen.",
               "Gib das Ergebnis zurueck, statt es auszugeben."),
             P("Die Funktion soll `zaehle_lange(woerter, mindestens=5)` heissen und die Anzahl zurueckgeben.")],
      start: `def f(l):
    c = 0
    if len(l) == 0:
        return 0
    for i in range(len(l)):
        if len(l[i]) >= 5:
            c = c + 1
    print(c)

f(["kurz", "Programmierung", "Python", "ab"])`,
      tipps: ["Die leere Pruefung ist ueberfluessig, die Schleife laeuft dann einfach nicht.",
              "`sum(1 for w in woerter if len(w) >= mindestens)` erledigt alles in einer Zeile.",
              "Vergiss den Parameter mit Vorgabewert nicht."],
      loesung: `def zaehle_lange(woerter, mindestens=5):
    """Zaehlt die Woerter ab einer Mindestlaenge."""
    return sum(1 for wort in woerter if len(wort) >= mindestens)


print(zaehle_lange(["kurz", "Programmierung", "Python", "ab"]))`,
      tests: [
        T("Die Zaehlung stimmt", `assert zaehle_lange(["kurz", "Programmierung", "Python", "ab"]) == 2`),
        T("Die leere Liste ergibt null", `assert zaehle_lange([]) == 0`),
        T("Die Mindestlaenge ist einstellbar", `assert zaehle_lange(["abc", "abcd"], 4) == 1`),
        T("Die Grenze zaehlt mit", `assert zaehle_lange(["abcde"], 5) == 1`),
        T("Das Ergebnis wird zurueckgegeben", `assert zaehle_lange(["abcde"]) is not None, "Nutze return statt print"`),
        T("Es wird nicht ueber Positionen gelaufen", `assert "range(len(" not in QUELLE.replace(" ", ""), "Laufe direkt ueber die Elemente"`),
      ],
    },
    {
      id: "a39-2",
      titel: "Eine lange Funktion zerlegen",
      text: [P("Zerlege die Funktion in drei Teile:"),
             L("`bereinigen(werte)` entfernt alle Werte ausserhalb von 0 bis 100",
               "`kennzahlen(werte)` gibt ein Tupel aus Anzahl, Mittelwert und Spanne zurueck",
               "`bericht(werte)` nutzt beide und gibt eine Zeile aus"),
             P("Erwartete Ausgabe:"),
             ROH("4 Werte, Schnitt 47.5, Spanne 70")],
      start: `def bericht(werte):
    sauber = []
    for w in werte:
        if 0 <= w <= 100:
            sauber.append(w)
    n = len(sauber)
    m = sum(sauber) / n
    s = max(sauber) - min(sauber)
    print(f"{n} Werte, Schnitt {m}, Spanne {s}")

bericht([20, 150, 45, -5, 90, 35])`,
      tipps: ["Jede Teilfunktion bekommt die Werte als Parameter und gibt ein Ergebnis zurueck.",
              "`kennzahlen` gibt drei Werte mit Komma getrennt zurueck.",
              "`bericht` entpackt das Ergebnis und gibt es formatiert aus."],
      loesung: `def bereinigen(werte):
    """Behaelt nur Werte zwischen 0 und 100."""
    return [w for w in werte if 0 <= w <= 100]


def kennzahlen(werte):
    """Gibt Anzahl, Mittelwert und Spanne zurueck."""
    if not werte:
        return 0, 0.0, 0
    return len(werte), sum(werte) / len(werte), max(werte) - min(werte)


def bericht(werte):
    """Gibt die Kennzahlen der bereinigten Werte aus."""
    anzahl, schnitt, spanne = kennzahlen(bereinigen(werte))
    print(f"{anzahl} Werte, Schnitt {schnitt}, Spanne {spanne}")


bericht([20, 150, 45, -5, 90, 35])`,
      tests: [
        T("Die Bereinigung stimmt", `assert bereinigen([20, 150, 45, -5]) == [20, 45]`),
        T("Die Grenzen gehoeren dazu", `assert bereinigen([0, 100, 101]) == [0, 100]`),
        T("Die Kennzahlen stimmen", `assert kennzahlen([10, 20, 30]) == (3, 20.0, 20), f"Ergebnis: {kennzahlen([10, 20, 30])}"`),
        T("Die leere Liste bricht nicht ab", `assert kennzahlen([]) == (0, 0.0, 0), "Fange die leere Liste ab"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "4 Werte, Schnitt 47.5, Spanne 70", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Es sind drei getrennte Funktionen", `assert QUELLE.count("def ") == 3, f"Gefunden: {QUELLE.count('def ')} Funktionen"`),
      ],
    },
  ],
});

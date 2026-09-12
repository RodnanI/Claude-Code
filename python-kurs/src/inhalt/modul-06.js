const M6 = modul({
  id: "m6", nr: 6, ikon: "blitz",
  titel: "Fortgeschrittenes Python",
  kurz: "Generatoren, Dekoratoren, Kontextmanager und alles, was Python von anderen Sprachen unterscheidet.",
});

M6.push({
  id: "l-iteratoren",
  titel: "Iteratoren und Generatoren",
  dauer: 19,
  vorspann: "Hinter jeder for-Schleife steckt ein Mechanismus, den du selbst nutzen kannst. Damit verarbeitest du Datenmengen, die nie vollstaendig in den Speicher passen wuerden.",
  ziele: [
    "Das Iterator-Protokoll verstehen",
    "Generatoren mit yield schreiben",
    "Den Speichervorteil einschaetzen",
    "Endlose Folgen sicher verarbeiten",
  ],
  inhalt: [
    H2("Was eine for-Schleife wirklich tut"),
    C(`werte = [10, 20, 30]

laeufer = iter(werte)
print(next(laeufer))
print(next(laeufer))
print(next(laeufer))
print(next(laeufer))`),
    P("Eine for-Schleife holt sich mit `iter()` einen Iterator und ruft darauf so lange `next()` auf, bis `StopIteration` kommt. Dann endet sie. Mehr passiert nicht."),
    C(`werte = [10, 20, 30]

laeufer = iter(werte)
while True:
    try:
        wert = next(laeufer)
    except StopIteration:
        break
    print(wert)`, { aus: "10\n20\n30" }),
    TAB(["Begriff", "Bedeutung"],
      ["iterierbar", "kann `iter()` liefern, etwa Liste, Text, Dictionary"],
      ["Iterator", "hat `__next__` und merkt sich die Stelle"],
      ["Generator", "ein Iterator, den du mit `yield` schreibst"],
    ),

    H2("Generatoren mit yield"),
    C(`def zaehle_bis(grenze):
    zahl = 1
    while zahl <= grenze:
        yield zahl
        zahl += 1

for z in zaehle_bis(5):
    print(z, end=" ")
print()

g = zaehle_bis(3)
print(type(g))
print(list(g))
print(list(g))`,
      { aus: "1 2 3 4 5 \n<class 'generator'>\n[1, 2, 3]\n[]" }),
    P("`yield` gibt einen Wert heraus und **haelt die Funktion an**. Beim naechsten `next()` laeuft sie genau dort weiter, mit allen lokalen Variablen. Das ist der entscheidende Unterschied zu `return`."),
    WARN("Ein Generator ist verbraucht",
      "Die zweite Liste im Beispiel ist leer. Ein Generator laesst sich nur einmal durchlaufen. Brauchst du die Werte mehrfach, sammle sie in einer Liste oder erzeuge den Generator neu.",
    ),
    C(`def schritte():
    print("  Schritt A")
    yield 1
    print("  Schritt B")
    yield 2
    print("  Schritt C")

g = schritte()
print("Generator angelegt, noch nichts gelaufen")
print("erstes:", next(g))
print("zweites:", next(g))`,
      { aus: "Generator angelegt, noch nichts gelaufen\n  Schritt A\nerstes: 1\n  Schritt B\nzweites: 2" }),
    P("Beachte: beim Anlegen laeuft noch gar nichts. Der Koerper startet erst beim ersten `next()` und haelt bei jedem `yield` wieder an."),

    H2("Der Speichervorteil"),
    C(`import sys

def quadrate_liste(n):
    return [i ** 2 for i in range(n)]

def quadrate_generator(n):
    for i in range(n):
        yield i ** 2

liste = quadrate_liste(1_000_000)
gen = quadrate_generator(1_000_000)

print(f"Liste:     {sys.getsizeof(liste):>9} Byte")
print(f"Generator: {sys.getsizeof(gen):>9} Byte")
print(f"Summe gleich: {sum(quadrate_liste(1000)) == sum(quadrate_generator(1000))}")`,
      { lauf: true }),
    P("Der Generator belegt einige hundert Byte, unabhaengig von der Anzahl der Werte. Er merkt sich nur, wo er stehen geblieben ist. Bei Dateien mit Millionen Zeilen oder bei Datenstroemen ist das der einzige gangbare Weg."),

    H2("Eine Datei zeilenweise verarbeiten"),
    C(`def zeilen_mit(pfad, suchwort):
    """Liefert nur die Zeilen, die das Suchwort enthalten."""
    with open(pfad, encoding="utf-8") as f:
        for nummer, zeile in enumerate(f, start=1):
            if suchwort in zeile:
                yield nummer, zeile.strip()


with open("protokoll.txt", "w", encoding="utf-8") as f:
    f.write("INFO Start\\nFEHLER Datei fehlt\\nINFO Weiter\\nFEHLER Abbruch\\n")

for nummer, zeile in zeilen_mit("protokoll.txt", "FEHLER"):
    print(f"Zeile {nummer}: {zeile}")`,
      { aus: "Zeile 2: FEHLER Datei fehlt\nZeile 4: FEHLER Abbruch" }),
    P("Diese Funktion arbeitet mit einer Datei von einem Gigabyte genauso gut wie mit einer von einem Kilobyte. Es ist immer nur eine Zeile im Speicher."),

    H2("Endlose Folgen"),
    C(`def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b


from itertools import islice

print(list(islice(fibonacci(), 10)))

for zahl in fibonacci():
    if zahl > 1000:
        print("Erste ueber 1000:", zahl)
        break`,
      { aus: "[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\nErste ueber 1000: 1597" }),
    P("Ein endloser Generator ist voellig unproblematisch, solange du ihn begrenzt: mit `break`, mit `islice` oder mit einer Bedingung. Als Liste waere das unmoeglich."),

    H2("Generatorausdruecke"),
    C(`werte = range(1, 11)

quadrate = (w ** 2 for w in werte)
print(type(quadrate))
print(sum(quadrate))

print(sum(w ** 2 for w in range(1, 11)))
print(max(len(wort) for wort in "Python ist gut".split()))
print(any(w % 7 == 0 for w in range(1, 20)))`,
      { aus: "<class 'generator'>\n385\n385\n6\nTrue" }),
    P("Ist der Generatorausdruck das einzige Argument, kannst du die inneren Klammern weglassen. Bei `sum`, `max`, `any` und `all` ist das die uebliche Schreibweise."),

    H2("Generatoren verketten"),
    C(`def lesen(zeilen):
    for z in zeilen:
        yield z.strip()

def ohne_leere(zeilen):
    for z in zeilen:
        if z:
            yield z

def ohne_kommentare(zeilen):
    for z in zeilen:
        if not z.startswith("#"):
            yield z

def als_zahlen(zeilen):
    for z in zeilen:
        yield int(z)


roh = ["  12 ", "", "# Kommentar", " 7", "23  ", ""]

kette = als_zahlen(ohne_kommentare(ohne_leere(lesen(roh))))
print(sum(kette))`, { aus: "42" }),
    P("Jede Stufe verarbeitet einen Wert und gibt ihn weiter, ohne dass irgendwo die komplette Menge entsteht. Das ist eine Verarbeitungskette, wie sie in der Datenverarbeitung staendig gebaut wird."),
    MERKE("Wann Generator, wann Liste",
      "Brauchst du die Werte mehrfach, willst ihre Anzahl wissen oder auf Positionen zugreifen, nimm eine Liste. Laeufst du genau einmal durch, besonders bei grossen oder endlosen Mengen, nimm einen Generator.",
    ),

    H2("Eigene Iteratoren"),
    C(`class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        aktuell = self.start
        while aktuell > 0:
            yield aktuell
            aktuell -= 1


for z in Countdown(5):
    print(z, end=" ")
print()
print(list(Countdown(3)))`, { aus: "5 4 3 2 1 \n[3, 2, 1]" }),
    P("`__iter__` als Generator zu schreiben ist der kuerzeste Weg, eine eigene Klasse durchlaufbar zu machen. Anders als ein Generatorobjekt laesst sich diese Klasse mehrfach durchlaufen, weil bei jedem `for` ein neuer Generator entsteht."),
  ],
  quiz: [
    Q("Was macht `yield` im Unterschied zu `return`?",
      ["Es beendet die Funktion endgueltig",
       "Es gibt einen Wert heraus und haelt die Funktion an, sodass sie spaeter weiterlaeuft",
       "Es gibt eine Liste zurueck",
       "Es ist nur eine andere Schreibweise fuer return"],
      1,
      "Der Zustand bleibt erhalten. Beim naechsten `next()` laeuft die Funktion an derselben Stelle weiter."),
    Q("Was gibt der zweite Aufruf von `list(g)` auf demselben Generator zurueck?",
      ["Dieselben Werte", "Eine leere Liste", "Einen Fehler", "Die Haelfte der Werte"], 1,
      "Ein Generator ist nach dem Durchlaufen verbraucht. Fuer einen erneuten Durchlauf musst du ihn neu erzeugen."),
    Q("Wie viel Speicher braucht ein Generator ueber eine Million Werte?",
      ["Etwa so viel wie die Liste", "Die Haelfte",
       "Einige hundert Byte, unabhaengig von der Anzahl", "Das haengt vom Datentyp ab"], 2,
      "Er speichert keine Werte, sondern nur den aktuellen Zustand der Funktion."),
    Q("Was signalisiert das Ende eines Iterators?",
      ["Der Rueckgabewert None", "Die Ausnahme StopIteration",
       "Ein leeres yield", "Die Zahl -1"], 1,
      "`next()` loest `StopIteration` aus. Die for-Schleife faengt das ab und endet."),
    Q("Wie erzeugst du einen Generatorausdruck?",
      ["Mit eckigen Klammern", "Mit runden Klammern",
       "Mit geschweiften Klammern", "Mit dem Schluesselwort gen"], 1,
      "Runde Klammern statt eckiger. Ist es das einzige Argument einer Funktion, kannst du sie weglassen."),
    Q("Warum ist eine endlose Folge als Generator unproblematisch?",
      ["Python begrenzt sie automatisch",
       "Werte entstehen erst beim Abrufen, du kannst also jederzeit aufhoeren",
       "Generatoren sind grundsaetzlich endlich",
       "Der Speicher wird automatisch geleert"],
      1,
      "Es werden nur so viele Werte berechnet, wie du abrufst."),
  ],
  aufgaben: [
    {
      id: "a29-1",
      titel: "Generator schreiben",
      text: [P("Schreibe einen Generator `gerade_bis(grenze)`, der alle geraden Zahlen von 2 bis einschliesslich `grenze` liefert."),
             P("Erwartete Ausgabe:"),
             ROH("[2, 4, 6, 8, 10]\n<class 'generator'>")],
      start: `def gerade_bis(grenze):
    pass

print(list(gerade_bis(10)))
print(type(gerade_bis(10)))`,
      tipps: ["Nutze `yield` statt `return`.",
              "`range(2, grenze + 1, 2)` liefert direkt die geraden Zahlen.",
              "Die Funktion wird durch `yield` automatisch zum Generator."],
      loesung: `def gerade_bis(grenze):
    """Liefert alle geraden Zahlen von 2 bis grenze."""
    for zahl in range(2, grenze + 1, 2):
        yield zahl


print(list(gerade_bis(10)))
print(type(gerade_bis(10)))`,
      tests: [
        T("Die Werte stimmen", `assert list(gerade_bis(10)) == [2, 4, 6, 8, 10]`),
        T("Die Grenze gehoert dazu", `assert 10 in list(gerade_bis(10)) and 12 not in list(gerade_bis(10))`),
        T("Ungerade Grenzen funktionieren", `assert list(gerade_bis(7)) == [2, 4, 6]`),
        T("Es ist ein echter Generator", `import types\nassert isinstance(gerade_bis(4), types.GeneratorType), "Nutze yield statt return"`),
        T("Kleine Grenzen ergeben nichts", `assert list(gerade_bis(1)) == []`),
      ],
    },
    {
      id: "a29-2",
      titel: "Gleitender Durchschnitt",
      text: [P("Schreibe einen Generator `gleitend(werte, fenster)`, der fortlaufend den Durchschnitt der letzten `fenster` Werte liefert. Erst wenn genug Werte da sind, kommt der erste Wert heraus."),
             P("Fuer `[1, 2, 3, 4, 5]` und Fenster 3 ergibt das `[2.0, 3.0, 4.0]`.")],
      start: `def gleitend(werte, fenster):
    pass

print(list(gleitend([1, 2, 3, 4, 5], 3)))`,
      tipps: ["Sammle die Werte in einer Liste und gib erst aus, wenn sie lang genug ist.",
              "Nach jedem yield entfernst du den aeltesten Wert mit `pop(0)`.",
              "Alternativ nutzt du `collections.deque` mit `maxlen`."],
      loesung: `from collections import deque

def gleitend(werte, fenster):
    """Liefert den gleitenden Durchschnitt ueber die letzten Werte."""
    puffer = deque(maxlen=fenster)
    for wert in werte:
        puffer.append(wert)
        if len(puffer) == fenster:
            yield sum(puffer) / fenster


print(list(gleitend([1, 2, 3, 4, 5], 3)))`,
      tests: [
        T("Das Beispiel stimmt", `assert list(gleitend([1, 2, 3, 4, 5], 3)) == [2.0, 3.0, 4.0], f"Ergebnis: {list(gleitend([1,2,3,4,5], 3))}"`),
        T("Fenster eins gibt alle Werte", `assert list(gleitend([4, 8], 1)) == [4.0, 8.0]`),
        T("Zu wenige Werte ergeben nichts", `assert list(gleitend([1, 2], 5)) == []`),
        T("Es ist ein Generator", `import types\nassert isinstance(gleitend([1], 1), types.GeneratorType), "Nutze yield"`),
        T("Es funktioniert auch mit einem Generator als Eingabe", `assert list(gleitend((x for x in [2, 4, 6]), 2)) == [3.0, 5.0]`),
      ],
    },
  ],
});

M6.push({
  id: "l-funktional",
  titel: "Funktionen als Werte",
  dauer: 16,
  vorspann: "In Python ist eine Funktion ein ganz normales Objekt. Du kannst sie in Variablen legen, weitergeben und zurueckgeben. Darauf bauen Dekoratoren, Sortierschluessel und viele Bibliotheken auf.",
  ziele: [
    "Funktionen weitergeben und zurueckgeben",
    "Lambdas sinnvoll einsetzen",
    "Closures verstehen",
    "map, filter und functools kennen",
  ],
  inhalt: [
    H2("Funktionen sind Objekte"),
    C(`def verdoppeln(x):
    return x * 2

andere = verdoppeln

print(verdoppeln(5), andere(5))
print(verdoppeln.__name__)
print(type(verdoppeln))

werkzeuge = {"doppelt": verdoppeln, "quadrat": lambda x: x ** 2}
print(werkzeuge["quadrat"](5))`,
      { aus: "10 10\nverdoppeln\n<class 'function'>\n25" }),
    P("Beachte den Unterschied: `verdoppeln` ist die Funktion selbst, `verdoppeln(5)` ist ihr Ergebnis. Ohne Klammern gibst du die Funktion weiter, mit Klammern rufst du sie auf."),

    H2("Funktionen als Argumente"),
    C(`def anwenden_auf_alle(funktion, werte):
    return [funktion(w) for w in werte]

def quadrat(x):
    return x ** 2

print(anwenden_auf_alle(quadrat, [1, 2, 3]))
print(anwenden_auf_alle(str.upper, ["a", "b"]))
print(anwenden_auf_alle(len, ["abc", "de"]))`,
      { aus: "[1, 4, 9]\n['A', 'B']\n[3, 2]" }),
    P("Genau das machen `sorted(werte, key=...)`, `max(werte, key=...)` und `map`. Der Parameter `key` ist nichts anderes als eine weitergereichte Funktion."),

    H2("Lambdas"),
    C(`quadrat = lambda x: x ** 2
print(quadrat(4))

paare = [("Ada", 36), ("Grace", 45), ("Alan", 41)]

print(sorted(paare, key=lambda p: p[1]))
print(max(paare, key=lambda p: p[1]))
print(sorted(paare, key=lambda p: (-p[1], p[0])))`,
      { aus: "16\n[('Ada', 36), ('Alan', 41), ('Grace', 45)]\n('Grace', 45)\n[('Grace', 45), ('Alan', 41), ('Ada', 36)]" }),
    P("Ein Lambda ist eine Funktion ohne Namen mit genau einem Ausdruck. Es kann keine Anweisungen enthalten, kein `if` als Block, keine Schleife."),
    WARN("Lambda nicht an einen Namen binden",
      "`quadrat = lambda x: x ** 2` funktioniert, ist aber schlechter Stil. Wenn die Funktion einen Namen bekommt, schreib sie mit `def`: das gibt bessere Fehlermeldungen und erlaubt eine Dokumentation. Lambdas gehoeren dorthin, wo sie sofort verbraucht werden.",
    ),
    P("Das Sortieren nach mehreren Kriterien im letzten Beispiel ist ein haeufiges Muster: das Tupel wird der Reihe nach verglichen, das Minus dreht die Richtung um."),

    H2("map, filter und Alternativen"),
    C(`werte = [1, 2, 3, 4, 5, 6]

print(list(map(lambda x: x ** 2, werte)))
print(list(filter(lambda x: x % 2 == 0, werte)))

print([x ** 2 for x in werte])
print([x for x in werte if x % 2 == 0])`,
      { aus: "[1, 4, 9, 16, 25, 36]\n[2, 4, 6]\n[1, 4, 9, 16, 25, 36]\n[2, 4, 6]" }),
    TIPP("Comprehension vor map und filter",
      "Beide Formen sind gleichwertig, aber die Comprehension gilt in Python als lesbarer. `map` lohnt sich vor allem mit einer bereits benannten Funktion: `map(int, zeilen)` ist kuerzer und klarer als die Comprehension.",
    ),

    H2("Closures"),
    P("Eine Funktion, die eine andere zurueckgibt, merkt sich deren Umgebung."),
    C(`def multiplikator(faktor):
    def malnehmen(x):
        return x * faktor
    return malnehmen


verdreifachen = multiplikator(3)
verzehnfachen = multiplikator(10)

print(verdreifachen(7))
print(verzehnfachen(7))
print(verdreifachen.__closure__[0].cell_contents)`,
      { aus: "21\n70\n3" }),
    P("`faktor` existiert nach dem Ende von `multiplikator` eigentlich nicht mehr, bleibt aber in der zurueckgegebenen Funktion erhalten. Diese eingeschlossene Umgebung heisst **Closure**. Sie ist die Grundlage jedes Dekorators."),
    C(`def zaehler_bauen():
    stand = 0

    def zaehlen():
        nonlocal stand
        stand += 1
        return stand

    return zaehlen


a = zaehler_bauen()
b = zaehler_bauen()

print(a(), a(), a())
print(b())`, { aus: "1 2 3\n1" }),
    P("Jeder Aufruf von `zaehler_bauen` erzeugt eine eigene Umgebung. Die beiden Zaehler stoeren sich nicht."),

    H2("functools"),
    C(`from functools import partial, reduce, lru_cache

def potenz(basis, hoch):
    return basis ** hoch

quadrat = partial(potenz, hoch=2)
kubik = partial(potenz, hoch=3)

print(quadrat(5), kubik(5))

print(reduce(lambda a, b: a * b, [1, 2, 3, 4, 5]))


@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(60))
print(fib.cache_info().hits > 0)`,
      { aus: "25 125\n120\n1548008755920\nTrue" }),
    TAB(["Werkzeug", "Zweck"],
      ["`partial`", "Argumente vorbelegen und eine neue Funktion erhalten"],
      ["`reduce`", "eine Folge auf einen Wert zusammenfalten"],
      ["`lru_cache`", "Ergebnisse merken statt neu zu berechnen"],
    ),
    P("`lru_cache` ist beeindruckend: die rekursive Fibonacci-Funktion waere ohne den Zwischenspeicher bei 60 praktisch nicht berechenbar, weil sie exponentiell viele Aufrufe braucht. Mit dem Speicher dauert sie Mikrosekunden."),
    HINWEIS("Nur fuer reine Funktionen",
      "`lru_cache` merkt sich Ergebnisse anhand der Argumente. Das funktioniert nur, wenn die Funktion bei gleichen Eingaben immer dasselbe liefert und nichts veraendert. Bei Funktionen mit Seiteneffekten ist es falsch.",
    ),
  ],
  quiz: [
    Q("Was ist der Unterschied zwischen `f` und `f()`?",
      ["Keiner", "`f` ist die Funktion selbst, `f()` ihr Ergebnis",
       "`f` ist eine Kopie", "`f()` ist schneller"], 1,
      "Ohne Klammern gibst du die Funktion weiter, mit Klammern rufst du sie auf."),
    Q("Was kann ein Lambda **nicht**?",
      ["Argumente entgegennehmen", "Anweisungen wie Schleifen enthalten",
       "Einen Wert zurueckgeben", "In einer Liste stehen"], 1,
      "Ein Lambda besteht aus genau einem Ausdruck. Anweisungen brauchen `def`."),
    Q("Was ist eine Closure?",
      ["Eine geschlossene Klasse",
       "Eine Funktion, die Variablen aus ihrer Entstehungsumgebung festhaelt",
       "Ein Dekorator ohne Argumente",
       "Eine Funktion ohne Rueckgabewert"],
      1,
      "Die innere Funktion behaelt Zugriff auf die Variablen der aeusseren, auch nachdem diese beendet ist."),
    Q("Was macht `partial(f, hoch=2)`?",
      ["Es fuehrt f zur Haelfte aus",
       "Es gibt eine neue Funktion zurueck, bei der `hoch` schon festgelegt ist",
       "Es kopiert f",
       "Es begrenzt die Argumente auf zwei"],
      1,
      "`partial` belegt Argumente vor. Die neue Funktion braucht nur noch die uebrigen."),
    Q("Wofuer ist `lru_cache` gut?",
      ["Es beschleunigt jede Funktion",
       "Es merkt sich Ergebnisse zu bereits gesehenen Argumenten",
       "Es begrenzt den Speicherverbrauch",
       "Es macht Funktionen nebenlaeufig"],
      1,
      "Der Zwischenspeicher spart Neuberechnungen. Das wirkt nur bei Funktionen ohne Seiteneffekte."),
    Q("Was gibt dieser Code aus?",
      ["`1 1`", "`1 2`", "`2 2`", "Einen Fehler"], 1,
      "Jeder Aufruf von `bauen` erzeugt eine eigene Umgebung, aber `a` wird zweimal aufgerufen und zaehlt weiter.",
      `def bauen():\n    stand = 0\n    def zaehlen():\n        nonlocal stand\n        stand += 1\n        return stand\n    return zaehlen\n\na = bauen()\nprint(a(), a())`),
  ],
  aufgaben: [
    {
      id: "a30-1",
      titel: "Funktionsfabrik",
      text: [P("Schreibe `schwelle_pruefer(grenze)`, die eine Funktion zurueckgibt. Diese prueft, ob ein Wert ueber der Grenze liegt."),
             P("Erwartete Ausgabe:"),
             ROH("False True\n[12, 40]")],
      start: `def schwelle_pruefer(grenze):
    pass

ueber_zehn = schwelle_pruefer(10)

print(ueber_zehn(5), ueber_zehn(15))
print(list(filter(ueber_zehn, [3, 12, 8, 40])))`,
      tipps: ["Definiere innerhalb der Funktion eine zweite Funktion.",
              "Gib die innere Funktion **ohne** Klammern zurueck.",
              "Die innere Funktion greift auf `grenze` zu, das bleibt in der Closure erhalten."],
      loesung: `def schwelle_pruefer(grenze):
    """Gibt eine Funktion zurueck, die auf Ueberschreiten der Grenze prueft."""
    def pruefen(wert):
        return wert > grenze
    return pruefen


ueber_zehn = schwelle_pruefer(10)

print(ueber_zehn(5), ueber_zehn(15))
print(list(filter(ueber_zehn, [3, 12, 8, 40])))`,
      tests: [
        T("Die Pruefung stimmt", `p = schwelle_pruefer(10)\nassert p(5) is False and p(15) is True`),
        T("Die Grenze selbst zaehlt nicht", `assert schwelle_pruefer(10)(10) is False, "Nur echt groesser"`),
        T("Mehrere Pruefer sind unabhaengig", `a, b = schwelle_pruefer(5), schwelle_pruefer(100)\nassert a(50) is True and b(50) is False`),
        T("Es kommt eine Funktion zurueck", `assert callable(schwelle_pruefer(1)), "Gib die innere Funktion zurueck, nicht ihr Ergebnis"`),
        T("Sie funktioniert mit filter", `assert list(filter(schwelle_pruefer(10), [3, 12, 8, 40])) == [12, 40]`),
      ],
    },
    {
      id: "a30-2",
      titel: "Mehrfache Sortierung",
      text: [P("Sortiere die Personen nach Abteilung aufsteigend, und innerhalb jeder Abteilung nach Gehalt absteigend."),
             P("Erwartete Ausgabe:"),
             ROH("IT       Grace  6000\nIT       Ada    5000\nVertrieb Alan   4500\nVertrieb Linus  4000")],
      start: `personen = [
    ("Ada", "IT", 5000),
    ("Alan", "Vertrieb", 4500),
    ("Grace", "IT", 6000),
    ("Linus", "Vertrieb", 4000),
]

sortiert = 

for name, abteilung, gehalt in sortiert:
    print(f"{abteilung:<9}{name:<7}{gehalt}")`,
      tipps: ["Der Schluessel darf ein Tupel zurueckgeben, das wird der Reihe nach verglichen.",
              "Fuer absteigend bei Zahlen setzt du ein Minus davor.",
              "`key=lambda p: (p[1], -p[2])`"],
      loesung: `personen = [
    ("Ada", "IT", 5000),
    ("Alan", "Vertrieb", 4500),
    ("Grace", "IT", 6000),
    ("Linus", "Vertrieb", 4000),
]

sortiert = sorted(personen, key=lambda p: (p[1], -p[2]))

for name, abteilung, gehalt in sortiert:
    print(f"{abteilung:<9}{name:<7}{gehalt}")`,
      tests: [
        T("Die Reihenfolge stimmt", `assert [p[0] for p in sortiert] == ["Grace", "Ada", "Alan", "Linus"], f"Reihenfolge: {[p[0] for p in sortiert]}"`),
        T("Abteilungen stehen alphabetisch", `abt = [p[1] for p in sortiert]\nassert abt == sorted(abt)`),
        T("Innerhalb der Abteilung sinkt das Gehalt", `it = [p[2] for p in sortiert if p[1] == "IT"]\nassert it == sorted(it, reverse=True)`),
        T("Das Original bleibt unveraendert", `assert personen[0][0] == "Ada", "Nutze sorted statt sort"`),
        T("Es wurde ein Tupel als Schluessel benutzt", `assert "lambda" in QUELLE and "," in QUELLE.split("key=")[1].split(")")[0], "Nutze ein Tupel im Schluessel"`),
      ],
    },
  ],
});

M6.push({
  id: "l-dekoratoren",
  titel: "Dekoratoren",
  dauer: 17,
  vorspann: "Ein Dekorator legt sich um eine Funktion und ergaenzt Verhalten, ohne sie zu veraendern. Wer Webframeworks oder Testwerkzeuge benutzt, begegnet ihnen staendig.",
  ziele: [
    "Das Zeichen mit dem At als Kurzform verstehen",
    "Eigene Dekoratoren schreiben",
    "Argumente sauber durchreichen",
    "Dekoratoren mit eigenen Einstellungen bauen",
  ],
  inhalt: [
    H2("Die Idee"),
    P("Angenommen, du willst wissen, wie lange eine Funktion braucht. Der naive Weg:"),
    C(`import time

def arbeiten():
    summe = sum(range(1_000_000))
    return summe

start = time.perf_counter()
ergebnis = arbeiten()
print(f"Dauer: {time.perf_counter() - start:.4f} s")`, { lauf: true }),
    P("Bei zwanzig Funktionen musst du das zwanzigmal schreiben. Ein Dekorator loest das an einer Stelle:"),
    C(`import time

def messen(funktion):
    def huelle(*args, **kwargs):
        start = time.perf_counter()
        ergebnis = funktion(*args, **kwargs)
        dauer = time.perf_counter() - start
        print(f"{funktion.__name__} brauchte {dauer:.4f} s")
        return ergebnis
    return huelle


@messen
def arbeiten(n):
    return sum(range(n))


print(arbeiten(1_000_000))`, { lauf: true }),

    H2("Was das At-Zeichen bedeutet"),
    P("Der Dekorator ist reine Schreiberleichterung. Diese beiden Fassungen sind identisch:"),
    C(`def laut(funktion):
    def huelle(*args, **kwargs):
        return str(funktion(*args, **kwargs)).upper()
    return huelle


@laut
def gruss_a(name):
    return f"hallo {name}"


def gruss_b(name):
    return f"hallo {name}"

gruss_b = laut(gruss_b)

print(gruss_a("ada"))
print(gruss_b("ada"))`, { aus: "HALLO ADA\nHALLO ADA" }),
    MERKE("Die ganze Wahrheit",
      "`@dekorator` ueber einer Definition bedeutet nichts weiter als `funktion = dekorator(funktion)` darunter. Mehr steckt nicht dahinter.",
    ),

    H2("Argumente durchreichen"),
    P("Die Huellfunktion muss beliebige Argumente annehmen und weitergeben koennen. Dafuer sind die Sterne da."),
    C(`def protokollieren(funktion):
    def huelle(*args, **kwargs):
        print(f"  Aufruf: {funktion.__name__}({args}, {kwargs})")
        ergebnis = funktion(*args, **kwargs)
        print(f"  Ergebnis: {ergebnis}")
        return ergebnis
    return huelle


@protokollieren
def addieren(a, b, faktor=1):
    return (a + b) * faktor


print(addieren(2, 3))
print(addieren(2, 3, faktor=10))`,
      { aus: "  Aufruf: addieren((2, 3), {})\n  Ergebnis: 5\n5\n  Aufruf: addieren((2, 3), {'faktor': 10})\n  Ergebnis: 50\n50" }),

    H2("Den Namen erhalten"),
    C(`from functools import wraps

def ohne_wraps(f):
    def huelle(*a, **k):
        return f(*a, **k)
    return huelle

def mit_wraps(f):
    @wraps(f)
    def huelle(*a, **k):
        return f(*a, **k)
    return huelle


@ohne_wraps
def eins():
    """Beschreibung von eins."""

@mit_wraps
def zwei():
    """Beschreibung von zwei."""


print(eins.__name__, eins.__doc__)
print(zwei.__name__, zwei.__doc__)`,
      { aus: "huelle None\nzwei Beschreibung von zwei." }),
    WARN("wraps nie vergessen",
      "Ohne `@wraps` heisst jede dekorierte Funktion `huelle` und verliert ihre Dokumentation. Fehlermeldungen und Hilfewerkzeuge werden dadurch unbrauchbar. Es kostet eine Zeile.",
    ),

    H2("Dekoratoren mit Einstellungen"),
    P("Soll der Dekorator selbst Argumente bekommen, brauchst du eine Ebene mehr."),
    C(`from functools import wraps

def wiederholen(anzahl):
    def dekorator(funktion):
        @wraps(funktion)
        def huelle(*args, **kwargs):
            for durchgang in range(anzahl):
                print(f"  Versuch {durchgang + 1}")
                ergebnis = funktion(*args, **kwargs)
            return ergebnis
        return huelle
    return dekorator


@wiederholen(3)
def gruessen(name):
    return f"Hallo {name}"


print(gruessen("Ada"))`,
      { aus: "  Versuch 1\n  Versuch 2\n  Versuch 3\nHallo Ada" }),
    P("Drei Ebenen: die aeussere nimmt die Einstellung, die mittlere die Funktion, die innere die Aufrufargumente. `@wiederholen(3)` ruft zuerst `wiederholen(3)` auf und wendet das Ergebnis als Dekorator an."),

    H2("Ein praktischer Dekorator"),
    C(`from functools import wraps

def erneut_versuchen(versuche=3, bei=Exception):
    """Wiederholt den Aufruf, wenn ein Fehler auftritt."""
    def dekorator(funktion):
        @wraps(funktion)
        def huelle(*args, **kwargs):
            letzter = None
            for nummer in range(1, versuche + 1):
                try:
                    return funktion(*args, **kwargs)
                except bei as fehler:
                    letzter = fehler
                    print(f"  Versuch {nummer} fehlgeschlagen: {fehler}")
            raise letzter
        return huelle
    return dekorator


zustand = {"aufrufe": 0}

@erneut_versuchen(versuche=4, bei=ValueError)
def wackelig():
    zustand["aufrufe"] += 1
    if zustand["aufrufe"] < 3:
        raise ValueError("noch nicht bereit")
    return "geschafft"


print(wackelig())`,
      { aus: "  Versuch 1 fehlgeschlagen: noch nicht bereit\n  Versuch 2 fehlgeschlagen: noch nicht bereit\ngeschafft" }),

    H2("Mehrere Dekoratoren"),
    C(`def a(f):
    def huelle():
        return "a(" + f() + ")"
    return huelle

def b(f):
    def huelle():
        return "b(" + f() + ")"
    return huelle


@a
@b
def kern():
    return "kern"


print(kern())`, { aus: "a(b(kern))" }),
    P("Gelesen wird von unten nach oben: `b` liegt direkt auf der Funktion, `a` darum herum. Das entspricht `a(b(kern))`."),

    H2("Wo du Dekoratoren triffst"),
    TAB(["Dekorator", "Herkunft", "Wirkung"],
      ["`@property`", "eingebaut", "Methode als Attributzugriff"],
      ["`@staticmethod`", "eingebaut", "Methode ohne Objektbezug"],
      ["`@dataclass`", "dataclasses", "erzeugt Standardmethoden"],
      ["`@lru_cache`", "functools", "merkt sich Ergebnisse"],
      ["`@wraps`", "functools", "erhaelt Namen und Dokumentation"],
      ["`@pytest.fixture`", "pytest", "stellt Testdaten bereit"],
      ["`@app.route(\"/\")`", "Flask", "verknuepft eine Adresse mit einer Funktion"],
    ),
    P("Du wirst deutlich oefter Dekoratoren benutzen als schreiben. Aber wer weiss, wie sie funktionieren, versteht die Fehlermeldungen, wenn etwas schiefgeht."),
  ],
  quiz: [
    Q("Was bedeutet `@dekorator` ueber einer Funktionsdefinition?",
      ["Die Funktion wird kommentiert",
       "`funktion = dekorator(funktion)`",
       "Der Dekorator wird bei jedem Aufruf neu erzeugt",
       "Die Funktion wird nicht ausgefuehrt"],
      1,
      "Es ist reine Schreiberleichterung fuer eine Zuweisung."),
    Q("Wofuer sind `*args` und `**kwargs` in der Huellfunktion da?",
      ["Um die Funktion schneller zu machen",
       "Damit die Huelle beliebige Argumente annehmen und weitergeben kann",
       "Um die Argumente zu pruefen",
       "Sie sind optional"],
      1,
      "Ohne sie funktioniert der Dekorator nur mit Funktionen ohne Argumente."),
    Q("Was passiert ohne `@wraps`?",
      ["Der Dekorator funktioniert nicht",
       "Die dekorierte Funktion verliert Namen und Dokumentation",
       "Die Argumente gehen verloren",
       "Es entsteht eine Endlosschleife"],
      1,
      "`__name__` und `__doc__` zeigen dann auf die Huelle statt auf die ursprungliche Funktion."),
    Q("Wie viele Ebenen braucht ein Dekorator mit eigenen Argumenten?",
      ["Eine", "Zwei", "Drei", "Vier"], 2,
      "Aeussere Ebene fuer die Einstellungen, mittlere fuer die Funktion, innere fuer die Aufrufargumente."),
    Q("Was gibt dieser Code aus?",
      ["`a(b(kern))`", "`b(a(kern))`", "`kern`", "`a(kern)`"], 0,
      "Der untere Dekorator wird zuerst angewendet, der obere legt sich darum.",
      `@a\n@b\ndef kern():\n    return "kern"`),
  ],
  aufgaben: [
    {
      id: "a31-1",
      titel: "Zaehl-Dekorator",
      text: [P("Schreibe einen Dekorator `zaehlen`, der mitzaehlt, wie oft die dekorierte Funktion aufgerufen wurde. Der Stand ist ueber `funktion.aufrufe` erreichbar."),
             P("Der Name der dekorierten Funktion muss erhalten bleiben."),
             P("Erwartete Ausgabe:"),
             ROH("3\ngruessen")],
      start: `from functools import wraps

def zaehlen(funktion):
    pass

@zaehlen
def gruessen(name):
    """Gruesst jemanden."""
    return f"Hallo {name}"

gruessen("Ada")
gruessen("Grace")
gruessen("Alan")

print(gruessen.aufrufe)
print(gruessen.__name__)`,
      tipps: ["Setze vor dem Zurueckgeben `huelle.aufrufe = 0`.",
              "Erhoehe den Zaehler innerhalb der Huelle mit `huelle.aufrufe += 1`.",
              "Vergiss `@wraps(funktion)` nicht, sonst geht der Name verloren."],
      loesung: `from functools import wraps

def zaehlen(funktion):
    """Zaehlt die Aufrufe der dekorierten Funktion."""
    @wraps(funktion)
    def huelle(*args, **kwargs):
        huelle.aufrufe += 1
        return funktion(*args, **kwargs)
    huelle.aufrufe = 0
    return huelle


@zaehlen
def gruessen(name):
    """Gruesst jemanden."""
    return f"Hallo {name}"


gruessen("Ada")
gruessen("Grace")
gruessen("Alan")

print(gruessen.aufrufe)
print(gruessen.__name__)`,
      tests: [
        T("Der Zaehler stimmt", `assert gruessen.aufrufe == 3, f"Stand: {gruessen.aufrufe}"`),
        T("Der Name bleibt erhalten", `assert gruessen.__name__ == "gruessen", f"Name: {gruessen.__name__}"`),
        T("Die Dokumentation bleibt erhalten", `assert gruessen.__doc__ == "Gruesst jemanden.", "Nutze @wraps"`),
        T("Das Ergebnis kommt durch", `assert gruessen("X") == "Hallo X"`),
        T("Argumente werden durchgereicht", `@zaehlen\ndef f(a, b=2):\n    return a + b\nassert f(1) == 3 and f(1, b=10) == 11`),
        T("Jede Funktion zaehlt getrennt", `@zaehlen\ndef g():\n    pass\ng()\nassert g.aufrufe == 1`),
      ],
    },
    {
      id: "a31-2",
      titel: "Dekorator mit Einstellung",
      text: [P("Schreibe `begrenzen(min_wert, max_wert)`, einen Dekorator, der den Rueckgabewert einer Funktion auf den erlaubten Bereich beschneidet."),
             P("Erwartete Ausgabe:"),
             ROH("100\n0\n50")],
      start: `from functools import wraps

def begrenzen(min_wert, max_wert):
    pass

@begrenzen(0, 100)
def berechnen(x):
    return x * 10

print(berechnen(50))
print(berechnen(-5))
print(berechnen(5))`,
      tipps: ["Drei Ebenen: Einstellungen, Funktion, Aufrufargumente.",
              "Das Beschneiden geht mit `max(min_wert, min(max_wert, ergebnis))`.",
              "Die mittlere Ebene gibt die Huelle zurueck, die aeussere den Dekorator."],
      loesung: `from functools import wraps

def begrenzen(min_wert, max_wert):
    """Beschneidet den Rueckgabewert auf den erlaubten Bereich."""
    def dekorator(funktion):
        @wraps(funktion)
        def huelle(*args, **kwargs):
            ergebnis = funktion(*args, **kwargs)
            return max(min_wert, min(max_wert, ergebnis))
        return huelle
    return dekorator


@begrenzen(0, 100)
def berechnen(x):
    return x * 10


print(berechnen(50))
print(berechnen(-5))
print(berechnen(5))`,
      tests: [
        T("Der obere Rand greift", `assert berechnen(50) == 100`),
        T("Der untere Rand greift", `assert berechnen(-5) == 0`),
        T("Werte im Bereich bleiben unveraendert", `assert berechnen(5) == 50`),
        T("Andere Grenzen funktionieren", `@begrenzen(-1, 1)\ndef f(x):\n    return x\nassert f(5) == 1 and f(-5) == -1 and f(0) == 0`),
        T("Der Name bleibt erhalten", `assert berechnen.__name__ == "berechnen", "Nutze @wraps"`),
      ],
    },
  ],
});

M6.push({
  id: "l-kontext",
  titel: "Kontextmanager",
  dauer: 14,
  vorspann: "Der with-Block kennst du vom Oeffnen von Dateien. Dahinter steckt ein allgemeines Muster fuer alles, was zuverlaessig wieder aufgeraeumt werden muss.",
  ziele: [
    "Das Protokoll hinter with verstehen",
    "Eigene Kontextmanager als Klasse schreiben",
    "Die kuerzere Form mit contextmanager nutzen",
    "Typische Anwendungsfaelle erkennen",
  ],
  inhalt: [
    H2("Das Problem"),
    C(`datei = open("test.txt", "w", encoding="utf-8")
datei.write("Etwas")
ergebnis = 1 / 0
datei.close()`),
    P("Die Datei wird nie geschlossen, weil die Zeile mit `close` nach dem Fehler nicht mehr erreicht wird. Bei einem einzelnen Skript faellt das kaum auf, bei einem Server mit tausenden Zugriffen laeuft dir irgendwann das Betriebssystem voll."),
    C(`try:
    datei = open("test.txt", "w", encoding="utf-8")
    datei.write("Etwas")
finally:
    datei.close()
print("Die Datei ist geschlossen")`, { aus: "Die Datei ist geschlossen" }),
    P("Das funktioniert, ist aber umstaendlich. `with` macht genau das, nur kuerzer und ohne Vergessensgefahr."),

    H2("Eigene Kontextmanager als Klasse"),
    C(`class Zeitmessung:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        import time
        self.start = time.perf_counter()
        print(f"  {self.name} beginnt")
        return self

    def __exit__(self, art, wert, spur):
        import time
        self.dauer = time.perf_counter() - self.start
        print(f"  {self.name} endet nach {self.dauer:.4f} s")
        return False


with Zeitmessung("Rechnung") as messung:
    summe = sum(range(500_000))

print("Ergebnis:", summe)`, { lauf: true }),
    P("`__enter__` laeuft beim Betreten, sein Rueckgabewert landet hinter `as`. `__exit__` laeuft beim Verlassen, **immer**, auch bei einem Fehler."),
    TAB(["Parameter von __exit__", "Bedeutung"],
      ["`art`", "die Fehlerklasse oder None"],
      ["`wert`", "das Fehlerobjekt oder None"],
      ["`spur`", "der Traceback oder None"],
      ["Rueckgabe `True`", "der Fehler gilt als behandelt"],
      ["Rueckgabe `False`", "der Fehler laeuft weiter"],
    ),
    C(`class FehlerSchlucken:
    def __enter__(self):
        return self

    def __exit__(self, art, wert, spur):
        if art is not None:
            print(f"  Abgefangen: {art.__name__}: {wert}")
            return True
        return False


with FehlerSchlucken():
    print("  vor dem Fehler")
    raise ValueError("etwas ging schief")

print("Das Programm laeuft weiter")`,
      { aus: "  vor dem Fehler\n  Abgefangen: ValueError: etwas ging schief\nDas Programm laeuft weiter" }),
    WARN("Fehler nur bewusst schlucken",
      "Ein `return True` in `__exit__` verschluckt jeden Fehler im Block. Das ist dasselbe Problem wie ein nacktes except. Nutze es nur, wenn du genau weisst, welche Fehler du erwartest.",
    ),

    H2("Die kuerzere Form"),
    C(`from contextlib import contextmanager
import time

@contextmanager
def zeitmessung(name):
    start = time.perf_counter()
    print(f"  {name} beginnt")
    try:
        yield
    finally:
        print(f"  {name} endet nach {time.perf_counter() - start:.4f} s")


with zeitmessung("Schleife"):
    gesamt = sum(i * i for i in range(300_000))

print("fertig")`, { lauf: true }),
    P("Alles vor dem `yield` ist das Betreten, alles danach das Verlassen. Das `try` mit `finally` sorgt dafuer, dass der Abschluss auch bei einem Fehler laeuft. Fuer die meisten Faelle ist diese Form deutlich kuerzer als eine eigene Klasse."),
    C(`from contextlib import contextmanager

@contextmanager
def vorruebergehend(dictionary, schluessel, wert):
    """Setzt einen Wert nur fuer die Dauer des Blocks."""
    alt = dictionary.get(schluessel)
    dictionary[schluessel] = wert
    try:
        yield dictionary
    finally:
        if alt is None:
            dictionary.pop(schluessel, None)
        else:
            dictionary[schluessel] = alt


einstellungen = {"modus": "normal"}

with vorruebergehend(einstellungen, "modus", "test"):
    print("im Block:", einstellungen)

print("danach:  ", einstellungen)`,
      { aus: "im Block: {'modus': 'test'}\ndanach:   {'modus': 'normal'}" }),

    H2("Mehrere auf einmal"),
    C(`with open("a.txt", "w", encoding="utf-8") as f:
    f.write("Inhalt A")

with open("a.txt", encoding="utf-8") as quelle, open("b.txt", "w", encoding="utf-8") as ziel:
    ziel.write(quelle.read().upper())

with open("b.txt", encoding="utf-8") as f:
    print(f.read())`, { aus: "INHALT A" }),

    H2("Fertige Kontextmanager"),
    C(`from contextlib import suppress, redirect_stdout
import io

with suppress(FileNotFoundError):
    open("gibt-es-nicht.txt").read()
print("Kein Absturz")

puffer = io.StringIO()
with redirect_stdout(puffer):
    print("Das landet im Puffer")

print("Aufgefangen:", puffer.getvalue().strip())`,
      { aus: "Kein Absturz\nAufgefangen: Das landet im Puffer" }),
    TAB(["Kontextmanager", "Zweck"],
      ["`open(...)`", "Datei schliessen"],
      ["`suppress(Fehler)`", "bestimmte Fehler ignorieren"],
      ["`redirect_stdout(ziel)`", "Ausgabe umleiten"],
      ["`sperre` aus threading", "Sperre sicher freigeben"],
      ["`torch.no_grad()`", "Ableitungen abschalten"],
      ["`pytest.raises(Fehler)`", "erwarteten Fehler pruefen"],
    ),
    MERKE("Die Faustregel",
      "Immer wenn etwas ein Vorher und ein zwingendes Nachher hat, ist ein Kontextmanager die richtige Form: oeffnen und schliessen, sperren und freigeben, umschalten und zuruecksetzen, anfangen zu messen und aufhoeren.",
    ),
  ],
  quiz: [
    Q("Welche beiden Methoden braucht ein Kontextmanager als Klasse?",
      ["`__start__` und `__stop__`", "`__enter__` und `__exit__`",
       "`__open__` und `__close__`", "`__with__` allein"], 1,
      "`__enter__` beim Betreten, `__exit__` beim Verlassen."),
    Q("Wann laeuft `__exit__`?",
      ["Nur bei fehlerfreiem Ablauf", "Nur bei einem Fehler",
       "Immer beim Verlassen des Blocks", "Nur wenn ausdruecklich aufgerufen"], 2,
      "Das ist der ganze Sinn: das Aufraeumen laeuft in jedem Fall."),
    Q("Was bedeutet `return True` in `__exit__`?",
      ["Der Block war erfolgreich",
       "Ein aufgetretener Fehler gilt als behandelt und laeuft nicht weiter",
       "Der Block wird wiederholt",
       "Es hat keine Bedeutung"],
      1,
      "Ein wahrer Rueckgabewert unterdrueckt den Fehler. Nutze das nur bewusst."),
    Q("Was trennt bei `@contextmanager` das Betreten vom Verlassen?",
      ["Ein `return`", "Ein `yield`", "Ein `break`", "Eine Leerzeile"], 1,
      "Alles vor dem `yield` laeuft beim Betreten, alles danach beim Verlassen."),
    Q("Warum steht der Abschlussteil bei `@contextmanager` in einem `finally`?",
      ["Aus Gewohnheit",
       "Damit er auch laeuft, wenn im Block ein Fehler auftritt",
       "Weil yield sonst nicht funktioniert",
       "Um die Ausfuehrung zu beschleunigen"],
      1,
      "Ohne `finally` wuerde ein Fehler im Block den Abschluss ueberspringen."),
  ],
  aufgaben: [
    {
      id: "a32-1",
      titel: "Kontextmanager als Klasse",
      text: [P("Schreibe eine Klasse `Einrueckung`, die Ausgaben innerhalb des Blocks mit einer Markierung versieht."),
             P("Erwartete Ausgabe:"),
             ROH("Start\n>> im Block\n>> noch im Block\nEnde")],
      start: `class Einrueckung:
    pass

print("Start")
with Einrueckung() as e:
    e.zeige("im Block")
    e.zeige("noch im Block")
print("Ende")`,
      tipps: ["`__enter__` gibt `self` zurueck, damit `as e` funktioniert.",
              "`zeige` gibt den Text mit der Markierung davor aus.",
              "`__exit__` braucht drei Parameter und darf `False` zurueckgeben."],
      loesung: `class Einrueckung:
    """Markiert Ausgaben innerhalb des Blocks."""

    def __init__(self, zeichen=">> "):
        self.zeichen = zeichen

    def __enter__(self):
        return self

    def zeige(self, text):
        print(f"{self.zeichen}{text}")

    def __exit__(self, art, wert, spur):
        return False


print("Start")
with Einrueckung() as e:
    e.zeige("im Block")
    e.zeige("noch im Block")
print("Ende")`,
      tests: [
        T("Die Ausgabe stimmt", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen == ["Start", ">> im Block", ">> noch im Block", "Ende"], f"Ausgabe: {zeilen}"`),
        T("__enter__ gibt das Objekt zurueck", `with Einrueckung() as x:\n    assert x is not None, "__enter__ muss self zurueckgeben"\n    assert hasattr(x, "zeige")`),
        T("Fehler werden nicht verschluckt", `try:\n    with Einrueckung():\n        raise ValueError("test")\n    assert False, "Der Fehler wurde verschluckt"\nexcept ValueError:\n    pass`),
        T("Beide Sondermethoden sind da", `assert hasattr(Einrueckung, "__enter__") and hasattr(Einrueckung, "__exit__")`),
      ],
    },
    {
      id: "a32-2",
      titel: "Kontextmanager mit contextmanager",
      text: [P("Schreibe `abschnitt(titel)` mit dem Dekorator `@contextmanager`. Er soll eine Ueberschrift ausgeben, danach den Block laufen lassen und am Ende eine Trennlinie ziehen, auch wenn im Block ein Fehler auftritt."),
             P("Erwartete Ausgabe:"),
             ROH("== Auswertung ==\nInhalt\n----------------\nFehler kam durch: ValueError")],
      start: `from contextlib import contextmanager

@contextmanager
def abschnitt(titel):
    pass

with abschnitt("Auswertung"):
    print("Inhalt")

try:
    with abschnitt("Mit Fehler"):
        raise ValueError("etwas ging schief")
except ValueError as f:
    print("Fehler kam durch:", type(f).__name__)`,
      tipps: ["Vor dem `yield` gibst du die Ueberschrift aus.",
              "Der `yield` steht in einem `try`, die Trennlinie in `finally`.",
              "Die Ueberschrift lautet `== {titel} ==`, die Linie besteht aus 16 Bindestrichen."],
      loesung: `from contextlib import contextmanager

@contextmanager
def abschnitt(titel):
    """Rahmt einen Ausgabeblock mit Ueberschrift und Trennlinie."""
    print(f"== {titel} ==")
    try:
        yield
    finally:
        print("-" * 16)


with abschnitt("Auswertung"):
    print("Inhalt")

try:
    with abschnitt("Mit Fehler"):
        raise ValueError("etwas ging schief")
except ValueError as f:
    print("Fehler kam durch:", type(f).__name__)`,
      tests: [
        T("Die Ueberschrift stimmt", `assert "== Auswertung ==" in AUSGABE, f"Ausgabe: {AUSGABE!r}"`),
        T("Die Trennlinie kommt", `assert "-" * 16 in AUSGABE`),
        T("Die Linie kommt auch bei einem Fehler", `assert AUSGABE.count("-" * 16) == 2, "Die Trennlinie fehlt im Fehlerfall, nutze finally"`),
        T("Der Fehler laeuft weiter", `assert "Fehler kam durch: ValueError" in AUSGABE, "Der Fehler darf nicht verschluckt werden"`),
        T("Der Dekorator wurde benutzt", `assert "@contextmanager" in QUELLE`),
      ],
    },
  ],
});

M6.push({
  id: "l-typhinweise",
  titel: "Typhinweise",
  dauer: 15,
  vorspann: "Python prueft Typen nicht. Aber du kannst sie aufschreiben, und dann finden Werkzeuge Fehler, bevor dein Programm ueberhaupt laeuft. In groesseren Projekten ist das inzwischen Standard.",
  ziele: [
    "Typen fuer Parameter und Rueckgaben notieren",
    "Zusammengesetzte Typen schreiben",
    "Optional und Union richtig einsetzen",
    "Die Grenzen kennen",
  ],
  inhalt: [
    H2("Die Grundform"),
    C(`def begruesse(name: str, anzahl: int = 1) -> str:
    return (f"Hallo {name}. " * anzahl).strip()


print(begruesse("Ada"))
print(begruesse("Grace", 2))
print(begruesse(42, 3))`,
      { aus: "Hallo Ada.\nHallo Grace. Hallo Grace.\nHallo 42. Hallo 42. Hallo 42." }),
    P("Der letzte Aufruf uebergibt eine Zahl, obwohl `str` dasteht, und laeuft trotzdem anstandslos durch. Das ist wichtig zu verstehen: **Python erzwingt Typhinweise nicht**. Sie sind Dokumentation, die Werkzeuge lesen koennen."),
    HINWEIS("Wer die Hinweise nutzt",
      "Ein Typpruefer wie `mypy` oder `pyright` meldet solche Aufrufe vor dem Ausfuehren. Editoren nutzen sie fuer Vervollstaendigung und Warnungen. Und Menschen, die deinen Code lesen, verstehen ihn schneller.",
    ),

    H2("Zusammengesetzte Typen"),
    C(`def durchschnitt(werte: list[float]) -> float:
    return sum(werte) / len(werte) if werte else 0.0

def zaehlen(woerter: list[str]) -> dict[str, int]:
    ergebnis: dict[str, int] = {}
    for w in woerter:
        ergebnis[w] = ergebnis.get(w, 0) + 1
    return ergebnis

def grenzen(werte: list[int]) -> tuple[int, int]:
    return min(werte), max(werte)


print(durchschnitt([1.0, 2.0, 4.0]))
print(zaehlen(["a", "b", "a"]))
print(grenzen([3, 9, 1]))`,
      { aus: "2.3333333333333335\n{'a': 2, 'b': 1}\n(1, 9)" }),
    TAB(["Schreibweise", "Bedeutung"],
      ["`list[int]`", "Liste von ganzen Zahlen"],
      ["`dict[str, float]`", "Schluessel Text, Werte Kommazahl"],
      ["`tuple[int, str]`", "Tupel mit genau diesen zwei Typen"],
      ["`tuple[int, ...]`", "Tupel beliebiger Laenge aus ganzen Zahlen"],
      ["`set[str]`", "Menge von Zeichenketten"],
    ),
    HINWEIS("Fuer aeltere Fassungen",
      "Die Kleinschreibung funktioniert ab Python 3.9. Davor brauchte man `from typing import List, Dict` und die Grossschreibung. In neuem Code nutzt du die Kleinschreibung.",
    ),

    H2("Mehrere moegliche Typen"),
    C(`def suche(werte: list[int], ziel: int) -> int | None:
    for i, w in enumerate(werte):
        if w == ziel:
            return i
    return None

def als_zahl(wert: str | int | float) -> float:
    return float(wert)


print(suche([4, 8, 15], 8))
print(suche([4, 8, 15], 99))
print(als_zahl("3.5"), als_zahl(7))`,
      { aus: "1\nNone\n3.5 7.0" }),
    P("Der senkrechte Strich bedeutet *oder*. `int | None` heisst: eine ganze Zahl oder nichts. Das ist so haeufig, dass es dafuer auch die Schreibweise `Optional[int]` gibt, die dasselbe bedeutet."),
    WARN("Die haeufigste Nachlaessigkeit",
      "Eine Funktion, die manchmal `None` zurueckgibt, muss das im Typ sagen. Sonst rechnet der Aufrufer nicht damit, und irgendwann steht ein `AttributeError: 'NoneType' object has no attribute ...` im Protokoll.",
    ),

    H2("Weitere nuetzliche Typen"),
    C(`from typing import Callable, Iterable, Any

def anwenden(funktion: Callable[[int], int], werte: Iterable[int]) -> list[int]:
    return [funktion(w) for w in werte]

def erste(werte: Iterable[Any], vorgabe: Any = None) -> Any:
    for w in werte:
        return w
    return vorgabe


print(anwenden(lambda x: x * 2, [1, 2, 3]))
print(erste([], "leer"))
print(erste(range(5, 10)))`,
      { aus: "[2, 4, 6]\nleer\n5" }),
    TAB(["Typ", "Bedeutung"],
      ["`Callable[[int], str]`", "Funktion, die int nimmt und str liefert"],
      ["`Iterable[int]`", "alles Durchlaufbare mit ganzen Zahlen"],
      ["`Sequence[str]`", "geordnet und mit Positionszugriff"],
      ["`Any`", "jeder Typ, schaltet die Pruefung ab"],
      ["`None`", "als Rueckgabe: gibt nichts zurueck"],
    ),
    TIPP("So allgemein wie moeglich annehmen",
      "Nimm `Iterable[int]` statt `list[int]`, wenn du nur darueber laufen willst. Dann funktioniert deine Funktion auch mit Tupeln, Mengen und Generatoren. Bei Rueckgaben ist es umgekehrt: sei so genau wie moeglich.",
    ),

    H2("Eigene Typen und Aliase"),
    C(`from dataclasses import dataclass

Koordinate = tuple[float, float]
Merkmale = dict[str, float]

@dataclass
class Punkt:
    x: float
    y: float

    def verschoben(self, dx: float, dy: float) -> "Punkt":
        return Punkt(self.x + dx, self.y + dy)


def mittelpunkt(a: Koordinate, b: Koordinate) -> Koordinate:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


print(mittelpunkt((0.0, 0.0), (4.0, 6.0)))
print(Punkt(1, 2).verschoben(3, 4))`,
      { aus: "(2.0, 3.0)\nPunkt(x=4, y=6)" }),
    P("Ein Alias gibt einem zusammengesetzten Typ einen sprechenden Namen. Und die Anfuehrungszeichen bei `\"Punkt\"` braucht es, weil die Klasse an dieser Stelle noch nicht fertig definiert ist."),

    H2("Praktischer Nutzen"),
    C(`def verarbeite(daten: list[dict[str, float]], schwelle: float = 0.5) -> tuple[list[str], float]:
    """Filtert Eintraege ueber der Schwelle.

    Gibt die Namen der Treffer und ihren Durchschnitt zurueck.
    """
    treffer = [d for d in daten if d["wert"] >= schwelle]
    if not treffer:
        return [], 0.0
    namen = [str(d["name"]) for d in treffer]
    schnitt = sum(d["wert"] for d in treffer) / len(treffer)
    return namen, schnitt


daten = [
    {"name": "a", "wert": 0.8},
    {"name": "b", "wert": 0.3},
    {"name": "c", "wert": 0.9},
]

namen, schnitt = verarbeite(daten)
print(namen, f"{schnitt:.2f}")`,
      { aus: "['a', 'c'] 0.85" }),
    P("Ohne die Typangabe muesstest du raten, was diese Funktion nimmt und liefert. Mit ihr ist beides in der ersten Zeile ablesbar."),
    MERKE("Die pragmatische Haltung",
      "Bei kurzen Skripten kannst du Typhinweise weglassen. Sobald andere deinen Code benutzen oder das Projekt ueber ein paar hundert Zeilen waechst, lohnen sie sich deutlich. Fang bei den Schnittstellen an, also bei Funktionen, die andere aufrufen.",
    ),
  ],
  quiz: [
    Q("Was passiert, wenn du eine Funktion mit falschem Typ aufrufst?",
      ["Ein TypeError beim Aufruf",
       "Nichts, Python prueft Typhinweise nicht",
       "Eine Warnung wird ausgegeben",
       "Das Programm startet gar nicht"],
      1,
      "Typhinweise sind reine Dokumentation. Nur Werkzeuge wie mypy pruefen sie."),
    Q("Wie schreibst du den Typ einer Liste von Zeichenketten?",
      ["`List(str)`", "`list[str]`", "`[str]`", "`str[]`"], 1,
      "Seit Python 3.9 nutzt man die eingebauten Typen in eckigen Klammern."),
    Q("Was bedeutet `int | None` als Rueckgabetyp?",
      ["Entweder eine Zahl oder ein Fehler",
       "Eine ganze Zahl oder None",
       "Eine Liste aus int und None",
       "Der Typ ist unbekannt"],
      1,
      "Der senkrechte Strich bedeutet *oder*. Die Funktion kann auch nichts liefern."),
    Q("Warum sollte ein Parameter lieber `Iterable[int]` als `list[int]` sein?",
      ["Es ist schneller",
       "Damit die Funktion auch mit Tupeln, Mengen und Generatoren funktioniert",
       "Weil Listen veraltet sind",
       "Es gibt keinen Unterschied"],
      1,
      "Nimm so allgemein an wie moeglich. Bei Rueckgaben ist es umgekehrt: so genau wie moeglich."),
    Q("Warum stehen bei `-> \"Punkt\"` Anfuehrungszeichen?",
      ["Aus Gewohnheit",
       "Weil die Klasse an dieser Stelle noch nicht fertig definiert ist",
       "Weil Punkt kein echter Typ ist",
       "Um den Typ optional zu machen"],
      1,
      "Innerhalb der eigenen Klassendefinition ist der Name noch nicht gebunden. Die Zeichenkette wird spaeter aufgeloest."),
  ],
  aufgaben: [
    {
      id: "a33-1",
      titel: "Typen ergaenzen",
      text: [P("Ergaenze die Typhinweise fuer alle Parameter und Rueckgabewerte. Die Funktion nimmt eine Liste von Zeichenketten und eine Mindestlaenge und gibt ein Dictionary von Wort zu Laenge zurueck, das nur die langen Woerter enthaelt.")],
      start: `def lange_woerter(woerter, mindestens=4):
    return {w: len(w) for w in woerter if len(w) >= mindestens}

print(lange_woerter(["ab", "Python", "gut", "Sprache"]))`,
      tipps: ["Die Liste enthaelt Zeichenketten: `list[str]`.",
              "Die Mindestlaenge ist eine ganze Zahl mit Vorgabewert.",
              "Der Rueckgabetyp ist `dict[str, int]`."],
      loesung: `def lange_woerter(woerter: list[str], mindestens: int = 4) -> dict[str, int]:
    """Gibt alle Woerter ab einer Mindestlaenge mit ihrer Laenge zurueck."""
    return {w: len(w) for w in woerter if len(w) >= mindestens}


print(lange_woerter(["ab", "Python", "gut", "Sprache"]))`,
      tests: [
        T("Die Funktion arbeitet richtig", `assert lange_woerter(["ab", "Python", "gut", "Sprache"]) == {"Python": 6, "Sprache": 7}`),
        T("Die Mindestlaenge wirkt", `assert lange_woerter(["ab", "abc"], 3) == {"abc": 3}`),
        T("Die Parameter sind angegeben", `h = lange_woerter.__annotations__\nassert "woerter" in h and "mindestens" in h, f"Angegeben: {list(h)}"`),
        T("Der Rueckgabetyp ist angegeben", `assert "return" in lange_woerter.__annotations__, "Ergaenze den Rueckgabetyp mit dem Pfeil"`),
        T("Der Listentyp ist genau", `assert lange_woerter.__annotations__["woerter"] == list[str], f"Angegeben: {lange_woerter.__annotations__['woerter']}"`),
        T("Der Rueckgabetyp ist genau", `assert lange_woerter.__annotations__["return"] == dict[str, int], f"Angegeben: {lange_woerter.__annotations__['return']}"`),
      ],
    },
    {
      id: "a33-2",
      titel: "Suche mit None als Ergebnis",
      text: [P("Schreibe `finde_ersten(werte, bedingung)`, die das erste Element liefert, auf das die Bedingung zutrifft, oder `None`, wenn keines passt."),
             P("Gib vollstaendige Typhinweise an. Die Bedingung ist eine Funktion von `int` nach `bool`.")],
      start: `from typing import Callable

def finde_ersten(werte, bedingung):
    pass

print(finde_ersten([3, 8, 12], lambda x: x > 5))
print(finde_ersten([1, 2], lambda x: x > 5))`,
      tipps: ["Der Typ der Bedingung ist `Callable[[int], bool]`.",
              "Der Rueckgabetyp ist `int | None`.",
              "Laufe durch und gib beim ersten Treffer zurueck, sonst am Ende None."],
      loesung: `from typing import Callable

def finde_ersten(werte: list[int], bedingung: Callable[[int], bool]) -> int | None:
    """Liefert das erste passende Element, sonst None."""
    for wert in werte:
        if bedingung(wert):
            return wert
    return None


print(finde_ersten([3, 8, 12], lambda x: x > 5))
print(finde_ersten([1, 2], lambda x: x > 5))`,
      tests: [
        T("Der erste Treffer kommt zurueck", `assert finde_ersten([3, 8, 12], lambda x: x > 5) == 8`),
        T("Ohne Treffer kommt None", `assert finde_ersten([1, 2], lambda x: x > 5) is None`),
        T("Die leere Liste ergibt None", `assert finde_ersten([], lambda x: True) is None`),
        T("Der Rueckgabetyp erlaubt None", `t = str(finde_ersten.__annotations__.get("return", ""))\nassert "None" in t, f"Angegeben: {t}"`),
        T("Die Bedingung ist als Callable angegeben", `t = str(finde_ersten.__annotations__.get("bedingung", ""))\nassert "Callable" in t or "callable" in t.lower(), f"Angegeben: {t}"`),
      ],
    },
  ],
});

M6.push({
  id: "l-regex",
  titel: "Regulaere Ausdruecke",
  dauer: 18,
  vorspann: "Regulaere Ausdruecke beschreiben Muster in Text. Sie sehen abschreckend aus, aber mit einem Dutzend Zeichen kommst du sehr weit, und in der Textverarbeitung sind sie unverzichtbar.",
  ziele: [
    "Die wichtigsten Musterzeichen kennen",
    "Suchen, pruefen und ersetzen",
    "Gruppen zum Herausloesen nutzen",
    "Einschaetzen, wann ein Muster die falsche Wahl ist",
  ],
  inhalt: [
    H2("Der Einstieg"),
    C(`import re

text = "Bestellung 4711 vom 12.09.2026, Betrag 249,90 Euro"

print(re.search(r"\\d+", text).group())
print(re.findall(r"\\d+", text))
print(bool(re.search(r"Euro", text)))`,
      { aus: "4711\n['4711', '12', '09', '2026', '249', '90']\nTrue" }),
    P("Das `r` vor der Zeichenkette ist wichtig: es verhindert, dass Python die Backslashes selbst deutet. Muster schreibt man in Python **immer** als Rohzeichenkette."),

    H2("Die Zeichenklassen"),
    TAB(["Muster", "Bedeutung"],
      ["`.`", "ein beliebiges Zeichen ausser Zeilenumbruch"],
      ["`\\\\d`", "eine Ziffer"],
      ["`\\\\w`", "Buchstabe, Ziffer oder Unterstrich"],
      ["`\\\\s`", "Leerzeichen, Tabulator, Umbruch"],
      ["`\\\\D` `\\\\W` `\\\\S`", "jeweils das Gegenteil"],
      ["`[abc]`", "eines dieser Zeichen"],
      ["`[a-z]`", "ein Zeichen aus dem Bereich"],
      ["`[^abc]`", "jedes Zeichen ausser diesen"],
    ),
    TAB(["Anzahl", "Bedeutung"],
      ["`*`", "null oder mehr"],
      ["`+`", "eines oder mehr"],
      ["`?`", "null oder eines"],
      ["`{3}`", "genau drei"],
      ["`{2,4}`", "zwei bis vier"],
      ["`{2,}`", "mindestens zwei"],
    ),
    TAB(["Anker", "Bedeutung"],
      ["`^`", "Anfang der Zeichenkette"],
      ["`$`", "Ende der Zeichenkette"],
      ["`\\\\b`", "Wortgrenze"],
      ["`|`", "oder"],
      ["`( )`", "Gruppe"],
    ),

    H2("Die vier wichtigsten Funktionen"),
    C(`import re

text = "Ada: 36, Grace: 45, Alan: 41"

print(re.search(r"\\d+", text).group())
print(re.findall(r"[A-Z]\\w+", text))
print(re.sub(r"\\d+", "XX", text))
print(re.split(r",\\s*", text))`,
      { aus: "36\n['Ada', 'Grace', 'Alan']\nAda: XX, Grace: XX, Alan: XX\n['Ada: 36', 'Grace: 45', 'Alan: 41']" }),
    TAB(["Funktion", "Ergebnis"],
      ["`re.search(muster, text)`", "erstes Vorkommen oder None"],
      ["`re.match(muster, text)`", "nur am Anfang oder None"],
      ["`re.fullmatch(muster, text)`", "muss ganz passen"],
      ["`re.findall(muster, text)`", "Liste aller Treffer"],
      ["`re.finditer(muster, text)`", "Generator ueber alle Treffer"],
      ["`re.sub(muster, ersatz, text)`", "ersetzt alle Treffer"],
      ["`re.split(muster, text)`", "zerlegt am Muster"],
    ),

    H2("Gruppen"),
    C(`import re

datum = "Das Treffen ist am 12.09.2026 um 14:30 Uhr."

treffer = re.search(r"(\\d{2})\\.(\\d{2})\\.(\\d{4})", datum)

print(treffer.group())
print(treffer.group(1), treffer.group(2), treffer.group(3))
print(treffer.groups())
print(treffer.span())`,
      { aus: "12.09.2026\n12 09 2026\n('12', '09', '2026')\n(19, 29)" }),
    P("Benannte Gruppen machen das Ganze lesbarer:"),
    C(`import re

muster = r"(?P<tag>\\d{2})\\.(?P<monat>\\d{2})\\.(?P<jahr>\\d{4})"
treffer = re.search(muster, "Termin am 12.09.2026")

print(treffer.group("jahr"))
print(treffer.groupdict())

print(re.sub(muster, r"\\g<jahr>-\\g<monat>-\\g<tag>", "Termin am 12.09.2026"))`,
      { aus: "2026\n{'tag': '12', 'monat': '09', 'jahr': '2026'}\nTermin am 2026-09-12" }),

    H2("Pruefen statt suchen"),
    C(`import re

def ist_gueltige_email(text: str) -> bool:
    muster = r"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$"
    return re.fullmatch(muster, text) is not None


for e in ["ada@example.org", "keine-email", "a@b.de", "@fehlt.de"]:
    print(f"{e:<20}{ist_gueltige_email(e)}")`,
      { aus: "ada@example.org     True\nkeine-email         False\na@b.de              True\n@fehlt.de           False" }),
    WARN("Keine perfekte Adresspruefung",
      "Die vollstaendig korrekte Pruefung einer E-Mail-Adresse ist mit regulaeren Ausdruecken praktisch nicht machbar, der Standard ist zu komplex. Eine grobe Pruefung wie oben genuegt fuer Tippfehler. Die eigentliche Pruefung ist eine Bestaetigungsmail.",
    ),

    H2("Gierig und genuegsam"),
    C(`import re

text = "<b>fett</b> und <i>kursiv</i>"

print(re.findall(r"<.+>", text))
print(re.findall(r"<.+?>", text))
print(re.findall(r"<[^>]+>", text))`,
      { aus: "['<b>fett</b> und <i>kursiv</i>']\n['<b>', '</b>', '<i>', '</i>']\n['<b>', '</b>', '<i>', '</i>']" }),
    P("Standardmaessig nehmen `+` und `*` so viel wie moeglich. Ein Fragezeichen dahinter macht sie genuegsam. Oft ist die dritte Variante mit der ausschliessenden Zeichenklasse die klarste und schnellste."),

    H2("Vorkompilieren"),
    C(`import re

muster = re.compile(r"^FEHLER\\s+(?P<code>\\d+):\\s*(?P<text>.+)$")

zeilen = [
    "INFO Start",
    "FEHLER 404: Datei nicht gefunden",
    "INFO Weiter",
    "FEHLER 500: Interner Fehler",
]

for zeile in zeilen:
    treffer = muster.match(zeile)
    if treffer:
        print(f"  Code {treffer['code']}: {treffer['text']}")`,
      { aus: "  Code 404: Datei nicht gefunden\n  Code 500: Interner Fehler" }),
    P("Wird ein Muster oft benutzt, lohnt sich `re.compile`. Es uebersetzt das Muster einmal statt bei jedem Aufruf. Ausserdem liest sich `muster.match(zeile)` besser."),

    H2("Wann kein regulaerer Ausdruck"),
    C(`text = "Hallo Welt"

# unnoetig kompliziert
import re
print(bool(re.search(r"Welt", text)))

# einfacher und schneller
print("Welt" in text)
print(text.startswith("Hallo"))
print(text.replace("Welt", "Python"))`,
      { aus: "True\nTrue\nTrue\nHallo Python" }),
    MERKE("Die Entscheidungsregel",
      "Genuegt `in`, `startswith`, `split` oder `replace`, nimm das. Regulaere Ausdruecke lohnen sich erst bei echten Mustern mit variablen Teilen. Und fuer HTML oder verschachtelte Strukturen sind sie grundsaetzlich das falsche Werkzeug, dafuer gibt es Parser.",
    ),
  ],
  quiz: [
    Q("Warum schreibt man Muster als `r\"...\"`?",
      ["Es ist schneller",
       "Damit Python die Backslashes nicht selbst deutet",
       "Es ist Pflicht im re-Modul",
       "Um Umlaute zu erlauben"],
      1,
      "In einer Rohzeichenkette bleibt jeder Backslash stehen. Ohne das muesstest du jeden verdoppeln."),
    Q("Was bedeutet `\\\\d{3}`?",
      ["Drei beliebige Zeichen", "Genau drei Ziffern",
       "Mindestens drei Ziffern", "Die Ziffer 3"], 1,
      "Die geschweiften Klammern geben die genaue Anzahl an."),
    Q("Was ist der Unterschied zwischen `search` und `match`?",
      ["Keiner", "`match` prueft nur am Anfang der Zeichenkette",
       "`search` liefert alle Treffer", "`match` ist schneller"], 1,
      "`match` verankert am Anfang, `search` sucht ueberall. Fuer den ganzen Text gibt es `fullmatch`."),
    Q("Was liefert `re.findall(r\"<.+>\", \"<a> und <b>\")`?",
      ["`['<a>', '<b>']`", "`['<a> und <b>']`", "`['a', 'b']`", "Eine leere Liste"], 1,
      "Der Stern und das Plus sind gierig und nehmen so viel wie moeglich. Mit `<.+?>` waeren es zwei Treffer."),
    Q("Wofuer ist `re.compile` gut?",
      ["Es macht das Muster kuerzer",
       "Es uebersetzt das Muster einmal statt bei jedem Aufruf",
       "Es prueft das Muster auf Fehler",
       "Es ist zwingend noetig"],
      1,
      "Bei wiederholtem Einsatz spart das Zeit, und der Aufruf liest sich besser."),
    Q("Wann solltest du **keinen** regulaeren Ausdruck nehmen?",
      ["Bei sehr langem Text",
       "Wenn eine einfache Zeichenkettenmethode ausreicht",
       "Beim Ersetzen",
       "Bei Zahlen"],
      1,
      "`in`, `startswith` und `replace` sind lesbarer und schneller, wenn kein echtes Muster im Spiel ist."),
  ],
  aufgaben: [
    {
      id: "a34-1",
      titel: "Zahlen aus Text holen",
      text: [P("Schreibe `zahlen_aus(text)`, die alle ganzen Zahlen als Liste von `int` zurueckgibt, auch negative."),
             P("Fuer `\"Temperatur -5 bis 23 Grad, 100 Prozent\"` ergibt das `[-5, 23, 100]`.")],
      start: `import re

def zahlen_aus(text):
    pass

print(zahlen_aus("Temperatur -5 bis 23 Grad, 100 Prozent"))`,
      tipps: ["Das Muster fuer eine ganze Zahl mit optionalem Minus ist `-?\\\\d+`.",
              "`re.findall` liefert eine Liste von Zeichenketten.",
              "Wandle jede davon mit `int` um, etwa mit einer Comprehension."],
      loesung: `import re

def zahlen_aus(text):
    """Holt alle ganzen Zahlen aus einem Text."""
    return [int(t) for t in re.findall(r"-?\\d+", text)]


print(zahlen_aus("Temperatur -5 bis 23 Grad, 100 Prozent"))`,
      tests: [
        T("Das Beispiel stimmt", `assert zahlen_aus("Temperatur -5 bis 23 Grad, 100 Prozent") == [-5, 23, 100]`),
        T("Es sind echte Zahlen", `e = zahlen_aus("1 2")\nassert all(isinstance(z, int) for z in e), f"Typen: {[type(z).__name__ for z in e]}"`),
        T("Ohne Zahlen kommt eine leere Liste", `assert zahlen_aus("nur Text") == []`),
        T("Negative Zahlen werden erkannt", `assert zahlen_aus("-42") == [-42]`),
        T("Es wurde ein regulaerer Ausdruck benutzt", `assert "re." in QUELLE`),
      ],
    },
    {
      id: "a34-2",
      titel: "Protokollzeilen zerlegen",
      text: [P("Schreibe `zerlege(zeile)`, die aus einer Protokollzeile ein Dictionary mit den Schluesseln `stufe`, `code` und `text` macht. Passt die Zeile nicht, kommt `None` zurueck."),
             P("Das Format lautet: Stufe in Grossbuchstaben, Leerzeichen, Zahlencode, Doppelpunkt, Leerzeichen, Text."),
             P("Erwartete Ausgabe:"),
             ROH("{'stufe': 'FEHLER', 'code': '404', 'text': 'Datei nicht gefunden'}\nNone")],
      start: `import re

def zerlege(zeile):
    pass

print(zerlege("FEHLER 404: Datei nicht gefunden"))
print(zerlege("Kaputte Zeile"))`,
      tipps: ["Nutze benannte Gruppen mit `(?P<name>...)`.",
              "Das Muster: `^(?P<stufe>[A-Z]+) (?P<code>\\\\d+): (?P<text>.+)$`",
              "`treffer.groupdict()` liefert direkt das Dictionary."],
      loesung: `import re

MUSTER = re.compile(r"^(?P<stufe>[A-Z]+)\\s+(?P<code>\\d+):\\s*(?P<text>.+)$")

def zerlege(zeile):
    """Zerlegt eine Protokollzeile, oder gibt None zurueck."""
    treffer = MUSTER.match(zeile)
    return treffer.groupdict() if treffer else None


print(zerlege("FEHLER 404: Datei nicht gefunden"))
print(zerlege("Kaputte Zeile"))`,
      tests: [
        T("Die Zerlegung stimmt", `e = zerlege("FEHLER 404: Datei nicht gefunden")\nassert e == {"stufe": "FEHLER", "code": "404", "text": "Datei nicht gefunden"}, f"Ergebnis: {e}"`),
        T("Falsche Zeilen ergeben None", `assert zerlege("Kaputte Zeile") is None`),
        T("Andere Stufen funktionieren", `assert zerlege("WARNUNG 12: Test")["stufe"] == "WARNUNG"`),
        T("Text mit Doppelpunkt bleibt ganz", `assert zerlege("INFO 1: a: b")["text"] == "a: b"`),
        T("Es wurden benannte Gruppen benutzt", `assert "?P<" in QUELLE, "Nutze benannte Gruppen"`),
      ],
    },
  ],
});

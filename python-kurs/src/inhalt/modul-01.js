const M1 = modul({
  id: "m1", nr: 1, ikon: "buch",
  titel: "Erste Schritte",
  kurz: "Was Python ist, wie ein Programm ablaeuft, und deine ersten eigenen Zeilen.",
});

M1.push({
  id: "l-einstieg",
  titel: "Was Python ist und wie Code laeuft",
  dauer: 12,
  vorspann: "Bevor du die erste Zeile schreibst, lohnt es sich zu verstehen, was beim Ausfuehren eines Programms eigentlich passiert. Das erspart dir spaeter sehr viel Raterei.",
  ziele: [
    "Erklaeren, was ein Interpreter tut",
    "Den Unterschied zwischen Quelltext und laufendem Programm kennen",
    "Wissen, warum Python fuer kuenstliche Intelligenz so verbreitet ist",
    "Dein erstes Programm ausfuehren",
  ],
  inhalt: [
    H2("Ein Programm ist ein Rezept"),
    P("Ein Computer tut nichts von selbst. Er fuehrt Anweisungen aus, eine nach der anderen, exakt so wie sie dastehen. Ein Programm ist nichts weiter als eine geordnete Liste solcher Anweisungen. Der schwierige Teil beim Programmieren ist selten die Sprache. Der schwierige Teil ist, ein Problem so klein zu zerlegen, dass jeder Schritt eindeutig wird."),
    P("Python ist eine **Programmiersprache**: eine Menge von Regeln, wie diese Anweisungen aufgeschrieben werden. Sie wurde 1991 von Guido van Rossum veroeffentlicht und hat seitdem eine Eigenschaft behalten, die sie von vielen anderen Sprachen unterscheidet: sie liest sich fast wie strukturiertes Englisch."),
    C(`gesamt = 0
for zahl in [3, 7, 11]:
    gesamt = gesamt + zahl
print(gesamt)`, { aus: "21" }),
    P("Auch ohne Vorkenntnisse kannst du erraten, was hier passiert. Genau das ist der Grund, warum Python in der Lehre, in der Forschung und in der kuenstlichen Intelligenz so stark vertreten ist."),

    H2("Interpreter statt Uebersetzer"),
    P("Dein Python-Code ist reiner Text. Damit kann ein Prozessor nichts anfangen, denn der versteht nur Maschinenbefehle. Zwischen dir und dem Prozessor steht deshalb ein Programm namens **Interpreter**, meist einfach `python` genannt."),
    P("Der Interpreter liest deinen Text, zerlegt ihn in seine Bestandteile, prueft die Struktur und fuehrt ihn dann Schritt fuer Schritt aus. Sprachen wie C oder Rust gehen einen anderen Weg: dort uebersetzt ein Compiler den gesamten Quelltext vorab in eine ausfuehrbare Datei."),
    TAB(["", "Interpretiert (Python)", "Kompiliert (C, Rust)"],
      ["Start", "sofort, kein Bauschritt", "erst uebersetzen, dann starten"],
      ["Fehler", "fallen oft erst beim Ausfuehren auf", "viele fallen schon beim Uebersetzen auf"],
      ["Tempo", "langsamer pro Anweisung", "sehr schnell"],
      ["Verteilung", "Empfaenger braucht Python", "eine fertige Datei genuegt"],
    ),
    P("Der Tempo-Nachteil klingt schlimmer als er ist. In der KI rechnet Python die schweren Teile gar nicht selbst: Bibliotheken wie NumPy und PyTorch schicken die Arbeit an hochoptimierten C- und GPU-Code weiter. Python bleibt die Steuerzentrale, und genau darin ist es hervorragend."),

    H2("Wie Code zu dir kommt"),
    P("Es gibt drei uebliche Wege, Python auszufuehren, und du wirst alle drei brauchen:"),
    NR(
      "**Skript**: Du schreibst deinen Code in eine Datei mit der Endung `.py` und startest sie im Terminal. So laufen echte Programme.",
      "**Interaktive Konsole**: Du startest `python` ohne Datei und tippst einzelne Zeilen ein. Perfekt zum schnellen Ausprobieren.",
      "**Notebook**: Eine Oberflaeche wie Jupyter, in der Code in Zellen steht und Ergebnisse direkt darunter erscheinen. In der Datenanalyse und in der KI der Alltag.",
    ),
    SH(`$ python mein_programm.py
Hallo Welt

$ python
>>> 2 + 3
5
>>> exit()`),
    HINWEIS("In diesem Kurs",
      "Jeder Codeblock hier hat einen Knopf zum Ausfuehren. Dahinter laeuft ein echter Python-Interpreter direkt in deinem Browser. Beim ersten Klick wird er einmalig geladen, das dauert einige Sekunden und braucht Internet. Danach laeuft alles lokal.",
    ),

    H2("Warum gerade Python fuer KI"),
    P("Es ist selten die Sprache selbst, die eine Technologie traegt. Es ist das Oekosystem darum herum. Bei Python sieht das so aus:"),
    L(
      "**NumPy** rechnet mit ganzen Zahlenfeldern statt mit einzelnen Werten, hunderte Male schneller als reines Python.",
      "**pandas** verwaltet Tabellen, so wie eine Tabellenkalkulation, nur programmierbar.",
      "**scikit-learn** buendelt klassische Lernverfahren hinter einer einheitlichen Schnittstelle.",
      "**PyTorch** und **TensorFlow** bauen neuronale Netze und rechnen auf Grafikkarten.",
      "**Matplotlib** zeichnet Diagramme aus Daten.",
    ),
    P("Diese Werkzeuge sind aufeinander abgestimmt und teilen sich Datenformate. Genau diese Verzahnung ist der eigentliche Vorteil, nicht die Syntax."),
    MERKE("Der Kern in einem Satz",
      "Du schreibst Text, der Interpreter liest ihn Zeile fuer Zeile und fuehrt jede Anweisung genau so aus, wie sie dasteht.",
    ),

    H2("Dein erstes Programm"),
    P("Drueck auf **Ausfuehren**. Aendere danach den Text zwischen den Anfuehrungszeichen und fuehre erneut aus."),
    C(`print("Hallo, ich lerne Python.")
print("Und das hier ist die zweite Zeile.")`, { aus: "Hallo, ich lerne Python.\nUnd das hier ist die zweite Zeile." }),
    P("Zwei Zeilen, zwei Anweisungen, in genau dieser Reihenfolge ausgefuehrt. Mehr Magie ist nicht dahinter. Alles, was du in diesem Kurs lernst, baut auf dieser einen Idee auf."),
  ],
  quiz: [
    Q("Was macht ein Interpreter?",
      ["Er uebersetzt den Quelltext vorab in eine ausfuehrbare Datei",
       "Er liest den Quelltext und fuehrt ihn Schritt fuer Schritt aus",
       "Er prueft nur die Rechtschreibung des Codes",
       "Er beschleunigt den Prozessor"],
      1,
      "Der Interpreter arbeitet den Code waehrend der Ausfuehrung ab. Ein Compiler dagegen uebersetzt alles vorab in eine eigene Datei."),
    Q("Warum ist die niedrigere Geschwindigkeit von Python in der KI meist unproblematisch?",
      ["Weil KI-Programme ohnehin selten rechnen",
       "Weil moderne Prozessoren Python besonders gut verstehen",
       "Weil Bibliotheken wie NumPy die Rechenarbeit an schnellen C- und GPU-Code weitergeben",
       "Weil Python den Code vor dem Start automatisch in C uebersetzt"],
      2,
      "Python steuert nur. Die eigentliche Rechenlast liegt in optimierten Bibliotheken, die in C oder direkt auf der Grafikkarte laufen."),
    Q("Welche Dateiendung tragen Python-Skripte?",
      [".pt", ".py", ".pyt", ".python"], 1,
      "Skripte enden auf `.py`. Die Endung `.pt` gehoert zu gespeicherten PyTorch-Modellen."),
    Q("Was gibt dieses Programm aus?",
      ["A\nB", "B\nA", "AB", "Nichts, weil zwei print-Aufrufe nicht erlaubt sind"], 0,
      "Anweisungen laufen von oben nach unten. Jedes `print` beginnt ausserdem eine neue Zeile.",
      `print("A")\nprint("B")`),
  ],
  aufgaben: [
    {
      id: "a1-1",
      titel: "Drei Zeilen ausgeben",
      text: [P("Schreibe ein Programm, das genau drei Zeilen ausgibt, in dieser Reihenfolge:"),
             L("`Name: Ada`", "`Fach: Kuenstliche Intelligenz`", "`Sprache: Python`")],
      start: `# Schreibe hier drei print-Aufrufe\n`,
      tipps: ["Jede Zeile braucht ein eigenes `print(...)`.",
              "Der Text gehoert in Anfuehrungszeichen, zum Beispiel `print(\"Name: Ada\")`.",
              "Achte auf die Doppelpunkte und die genaue Schreibweise."],
      loesung: `print("Name: Ada")
print("Fach: Kuenstliche Intelligenz")
print("Sprache: Python")`,
      tests: [
        T("Die Ausgabe hat drei Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 3, f"Erwartet wurden 3 Zeilen, gefunden: {len(zeilen)}"`),
        T("Erste Zeile stimmt", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[0].strip() == "Name: Ada", f"Erste Zeile war: {zeilen[0]!r}"`),
        T("Zweite Zeile stimmt", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[1].strip() == "Fach: Kuenstliche Intelligenz", f"Zweite Zeile war: {zeilen[1]!r}"`),
        T("Dritte Zeile stimmt", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[2].strip() == "Sprache: Python", f"Dritte Zeile war: {zeilen[2]!r}"`),
      ],
    },
  ],
});

M1.push({
  id: "l-ausgabe",
  titel: "Ausgabe, Kommentare und Fehler lesen",
  dauer: 16,
  vorspann: "print ist dein wichtigstes Werkzeug, um zu sehen, was dein Programm tut. Und Fehlermeldungen sind keine Strafe, sondern die genaueste Hilfe, die du bekommst.",
  ziele: [
    "print mit mehreren Werten, sep und end benutzen",
    "Kommentare sinnvoll einsetzen",
    "Eine Fehlermeldung von unten nach oben lesen",
    "Die drei haeufigsten Anfaengerfehler erkennen",
  ],
  inhalt: [
    H2("print genauer betrachtet"),
    P("`print` nimmt beliebig viele Werte entgegen, trennt sie mit einem Leerzeichen und haengt am Ende einen Zeilenumbruch an."),
    C(`print("Alter:", 21)
print("a", "b", "c")
print()
print("Nach der leeren Zeile")`, { aus: "Alter: 21\na b c\n\nNach der leeren Zeile" }),
    P("Beide Vorgaben lassen sich aendern. `sep` bestimmt das Trennzeichen, `end` das Zeilenende."),
    C(`print("2024", "09", "12", sep="-")
print("Lade", end="")
print(".", end="")
print(".", end="")
print(". fertig")`, { aus: "2024-09-12\nLade... fertig" }),
    HINWEIS("Namen fuer Werte",
      "`sep=\"-\"` ist ein sogenanntes Schluesselwortargument: Du sagst nicht nur *welchen* Wert du uebergibst, sondern auch *wofuer*. Das taucht in Python staendig auf.",
    ),

    H2("Kommentare"),
    P("Alles hinter einem `#` bis zum Zeilenende ignoriert der Interpreter. Kommentare sind fuer Menschen da, nicht fuer den Rechner."),
    C(`# Anzahl der Durchlaeufe beim Training
runden = 10  # bewusst klein, damit es schnell geht
print(runden)`, { aus: "10" }),
    WARN("Schlechte Kommentare sind schlimmer als keine",
      "Ein Kommentar, der nur wiederholt, was ohnehin dasteht, ist Laerm. `runden = 10  # setze runden auf 10` hilft niemandem. Schreibe auf, **warum** etwas so ist, nicht **was** dasteht.",
    ),

    H2("Fehlermeldungen lesen"),
    P("Frueher oder spaeter bricht dein Programm ab. Python zeigt dann einen sogenannten Traceback. Der sieht anfangs einschuechternd aus, folgt aber immer demselben Aufbau."),
    ROH(`Traceback (most recent call last):
  File "programm.py", line 3, in <module>
    print(gesamtpreis)
          ^^^^^^^^^^^^
NameError: name 'gesamtpreis' is not defined`),
    P("Lies das immer **von unten nach oben**:"),
    NR(
      "Die letzte Zeile nennt die Fehlerart und den Grund. `NameError: name 'gesamtpreis' is not defined` heisst: dieser Name existiert nicht.",
      "Die Zeile darueber zeigt den Code, der den Fehler ausgeloest hat.",
      "Darueber steht Datei und Zeilennummer. Hier Zeile 3.",
    ),
    P("Die haeufigsten Fehlerarten am Anfang:"),
    TAB(["Fehlerart", "Bedeutung", "Typische Ursache"],
      ["`SyntaxError`", "Der Satzbau stimmt nicht", "vergessene Klammer oder fehlender Doppelpunkt"],
      ["`NameError`", "Unbekannter Name", "Tippfehler oder Variable nie gesetzt"],
      ["`TypeError`", "Falsche Art von Wert", "Text und Zahl addiert"],
      ["`IndentationError`", "Einrueckung passt nicht", "Leerzeichen uneinheitlich"],
      ["`ZeroDivisionError`", "Teilen durch null", "Nenner war null"],
    ),
    P("Probier es aus. Der folgende Code bricht absichtlich ab. Fuehre ihn aus und lies die Meldung."),
    C(`preis = 10
print(preis + " Euro")`),
    P("`TypeError: can only concatenate str (not \"int\") to str`. Python weigert sich, eine Zahl an Text zu haengen, weil nicht klar waere, was gemeint ist. Der richtige Weg dafuer kommt in der naechsten Lektion."),

    H2("Die drei haeufigsten Stolpersteine"),
    H("1. Fehlender Doppelpunkt"),
    C(`# falsch
if 5 > 3
    print("ja")

# richtig
if 5 > 3:
    print("ja")`, { lauf: false }),
    H("2. Gemischte Einrueckung"),
    P("Python misst Bloecke an der Einrueckung. Mischst du Tabulatoren und Leerzeichen, gibt es einen `IndentationError`, obwohl im Editor alles ausgerichtet aussieht. Verwende immer **vier Leerzeichen**."),
    H("3. Anfuehrungszeichen vergessen"),
    C(`print(Hallo)   # NameError: Python sucht eine Variable namens Hallo
print("Hallo")  # richtig`, { lauf: false }),
    MERKE("Arbeitshaltung",
      "Ein Fehler ist kein Rueckschlag, sondern eine praezise Ortsangabe. Erfahrene Entwickler lesen die letzte Zeile des Tracebacks zuerst und sind damit meist schon fertig.",
    ),
  ],
  quiz: [
    Q("Was gibt dieser Code aus?",
      ["1-2-3", "1 2 3", "123", "1, 2, 3"], 0,
      "`sep` ersetzt das Standardtrennzeichen, also das Leerzeichen, durch den angegebenen Text.",
      `print(1, 2, 3, sep="-")`),
    Q("Welche Zeile eines Tracebacks solltest du zuerst lesen?",
      ["Die erste, weil sie den Anfang beschreibt",
       "Die letzte, weil dort Fehlerart und Grund stehen",
       "Die mittlere mit der Dateiangabe",
       "Es ist egal, alle Zeilen sagen dasselbe"],
      1,
      "Die letzte Zeile nennt die Fehlerart und den Grund. Alles darueber ist der Weg dorthin."),
    Q("Welcher Fehler entsteht bei `print(\"Summe: \" + 5)`?",
      ["NameError", "SyntaxError", "TypeError", "ValueError"], 2,
      "Text und Zahl lassen sich nicht mit `+` verbinden. Python meldet einen `TypeError`."),
    Q("Was bewirkt `end=\"\"` in einem print-Aufruf?",
      ["Das Programm endet danach",
       "Die Ausgabe wird geleert",
       "Es wird kein Zeilenumbruch angehaengt",
       "Der Text wird ans Ende der Datei geschrieben"],
      2,
      "`end` legt fest, was nach der Ausgabe folgt. Standard ist ein Zeilenumbruch, eine leere Zeichenkette unterdrueckt ihn."),
    Q("Wie viele Zeilen erzeugt dieser Code?",
      ["1", "2", "3", "4"], 1,
      "Der erste Aufruf haengt keinen Umbruch an, also landet beides in einer Zeile. Der zweite Aufruf beendet sie. Ergebnis: zwei Zeilen, davon eine leer.",
      `print("a", end="")\nprint("b")\nprint()`),
  ],
  aufgaben: [
    {
      id: "a2-1",
      titel: "Eine Fortschrittszeile bauen",
      text: [P("Gib mit genau **drei** print-Aufrufen diese eine Zeile aus:"),
             ROH("Schritt 1 > Schritt 2 > Schritt 3"),
             P("Die ersten beiden Aufrufe duerfen keinen Zeilenumbruch erzeugen.")],
      start: `print("Schritt 1", end=" > ")\n# weiter geht es\n`,
      tipps: ["Nutze `end=\"\"` oder `end=\" > \"`, damit kein Umbruch entsteht.",
              "Der letzte Aufruf soll den Umbruch behalten, also ohne `end`.",
              "Achte auf die Leerzeichen links und rechts vom Groesserzeichen."],
      loesung: `print("Schritt 1", end=" > ")
print("Schritt 2", end=" > ")
print("Schritt 3")`,
      tests: [
        T("Die Ausgabe stimmt genau", `assert AUSGABE.strip() == "Schritt 1 > Schritt 2 > Schritt 3", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Alles steht in einer Zeile", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 1, f"Es sind {len(zeilen)} Zeilen geworden"`),
        T("Es wurden drei print-Aufrufe benutzt", `assert QUELLE.count("print(") == 3, f"Gefunden: {QUELLE.count('print(')} Aufrufe, erwartet: 3"`),
      ],
    },
    {
      id: "a2-2",
      titel: "Einen Fehler finden und beheben",
      text: [P("Der folgende Code enthaelt zwei Fehler. Repariere ihn, sodass er ohne Abbruch `Ergebnis: 12` ausgibt.")],
      start: `zahl = 4
faktor = 3
print("Ergebnis: " + zahl * faktor`,
      tipps: ["Zaehle die Klammern in der letzten Zeile.",
              "Text und Zahl lassen sich nicht mit `+` verbinden. Uebergib beides als getrennte Werte an `print`.",
              "`print(\"Ergebnis:\", zahl * faktor)` erledigt beides auf einmal."],
      loesung: `zahl = 4
faktor = 3
print("Ergebnis:", zahl * faktor)`,
      loesungstext: "Mit Komma statt Plus uebergibst du zwei getrennte Werte. `print` setzt automatisch ein Leerzeichen dazwischen, deshalb faellt der Doppelpunkt-Abstand weg.",
      tests: [
        T("Das Programm laeuft ohne Fehler", `assert True`),
        T("Die Ausgabe lautet 'Ergebnis: 12'", `assert AUSGABE.strip() == "Ergebnis: 12", f"Ausgabe war: {AUSGABE.strip()!r}"`),
      ],
    },
  ],
});

M1.push({
  id: "l-variablen",
  titel: "Variablen, Namen und Typen",
  dauer: 18,
  vorspann: "Eine Variable ist kein Behaelter, in den etwas hineingelegt wird. Sie ist ein Namensschild, das an einen Wert geheftet wird. Dieser Unterschied erklaert spaeter sehr viel.",
  ziele: [
    "Werte benennen und wiederverwenden",
    "Die Grundtypen int, float, str und bool unterscheiden",
    "Verstehen, dass Namen auf Werte zeigen",
    "Gute Namen nach der ueblichen Schreibweise vergeben",
  ],
  inhalt: [
    H2("Zuweisung"),
    P("Mit dem Gleichheitszeichen bindest du einen Namen an einen Wert. Ab da steht der Name fuer diesen Wert."),
    C(`lernrate = 0.01
epochen = 50
modellname = "Perzeptron"

print(modellname, "laeuft", epochen, "Runden mit Lernrate", lernrate)`,
      { aus: "Perzeptron laeuft 50 Runden mit Lernrate 0.01" }),
    P("Das `=` ist **keine** mathematische Gleichung. Es ist eine Anweisung: *nimm den Wert rechts und hefte den Namen links daran*. Deshalb ergibt die folgende Zeile Sinn, obwohl sie mathematisch Unsinn waere:"),
    C(`zaehler = 0
zaehler = zaehler + 1
zaehler = zaehler + 1
print(zaehler)`, { aus: "2" }),
    P("Rechts wird zuerst ausgewertet, dann wird der Name neu geheftet. Fuer dieses Muster gibt es eine Kurzform:"),
    C(`punkte = 10
punkte += 5     # wie punkte = punkte + 5
punkte -= 3
punkte *= 2
print(punkte)`, { aus: "24" }),

    H2("Namen sind Schilder, keine Kisten"),
    P("Stell dir Werte als Objekte vor, die irgendwo im Speicher liegen. Ein Name ist ein Zettel, der auf so ein Objekt zeigt. Mehrere Zettel koennen auf dasselbe Objekt zeigen."),
    C(`a = 5
b = a      # b zeigt jetzt auf denselben Wert
a = 9      # a wird umgehaengt, b bleibt wo es war
print(a, b)`, { aus: "9 5" }),
    HINWEIS("Warum das wichtig wird",
      "Bei Zahlen und Text faellt der Unterschied nicht auf. Bei Listen und anderen veraenderbaren Objekten sehr wohl. Dann aendert eine Aenderung ueber den einen Namen auch das, was der andere Name sieht. Darauf kommen wir im Kapitel zu Listen zurueck.",
    ),

    H2("Die vier Grundtypen"),
    P("Jeder Wert in Python hat einen Typ. Mit `type()` fragst du ihn ab."),
    C(`print(type(42))
print(type(3.14))
print(type("Hallo"))
print(type(True))`,
      { aus: "<class 'int'>\n<class 'float'>\n<class 'str'>\n<class 'bool'>" }),
    TAB(["Typ", "Name", "Wofuer", "Beispiele"],
      ["`int`", "Ganzzahl", "zaehlbare Dinge", "`0`, `-7`, `1000000`"],
      ["`float`", "Kommazahl", "Messwerte, Anteile", "`3.14`, `-0.5`, `2.0`"],
      ["`str`", "Zeichenkette", "Text", "`\"Hallo\"`, `'x'`, `\"\"`"],
      ["`bool`", "Wahrheitswert", "ja oder nein", "`True`, `False`"],
    ),
    WARN("Gross geschrieben",
      "`True` und `False` beginnen in Python mit einem Grossbuchstaben. `true` gibt es nicht und fuehrt zu einem `NameError`.",
    ),
    P("Der Typ haengt am Wert, nicht am Namen. Derselbe Name kann nacheinander auf Werte verschiedener Typen zeigen. Das ist erlaubt, aber meist ein Zeichen fuer unsauberen Aufbau."),

    H2("Typen umwandeln"),
    P("Die Typnamen sind gleichzeitig Funktionen, die umwandeln."),
    C(`text = "42"
zahl = int(text)
print(zahl + 8)

print(float("2.5") * 2)
print(str(99) + " Luftballons")
print(int(7.9))`,
      { aus: "50\n5.0\n99 Luftballons\n7" }),
    P("Beachte die letzte Zeile: `int()` schneidet die Nachkommastellen ab, es rundet nicht. Zum Runden gibt es `round()`."),
    C(`print(int(7.9), round(7.9))
print(round(2.675, 2))`, { aus: "7 8\n2.67" }),
    HINWEIS("Die letzte Zeile ist kein Fehler",
      "`round(2.675, 2)` liefert `2.67` statt `2.68`, weil `2.675` im Binaersystem nicht exakt darstellbar ist. Kommazahlen sind Naeherungen. Fuer Geldbetraege nimmt man deshalb `decimal.Decimal` statt `float`.",
    ),
    P("Nicht jede Umwandlung geht gut aus:"),
    C(`zahl = int("dreiundzwanzig")`),

    H2("Gute Namen"),
    P("Erlaubt sind Buchstaben, Ziffern und Unterstriche. Der Name darf nicht mit einer Ziffer beginnen und kein Schluesselwort sein."),
    C(`# gueltig
lernrate = 0.01
anzahl_epochen = 50
x2 = 4

# ungueltig
2te_runde = 1
class = "A"
mein-name = "Ada"`, { lauf: false }),
    P("Die uebliche Schreibweise in Python heisst **snake_case**: alles klein, Woerter mit Unterstrich getrennt. Konstanten schreibt man `GROSS_MIT_UNTERSTRICH`. Klassen bekommen `GrossAmAnfang`."),
    TAB(["Schlecht", "Besser", "Warum"],
      ["`x`", "`lernrate`", "sagt, worum es geht"],
      ["`liste1`", "`messwerte`", "beschreibt den Inhalt"],
      ["`tmp`", "`zwischensumme`", "verraet den Zweck"],
      ["`anzahlDerEpochen`", "`anzahl_epochen`", "Python schreibt snake_case"],
      ["`daten`", "`kundendaten_2024`", "so allgemein, dass es nichts sagt"],
    ),
    MERKE("Faustregel fuer Namen",
      "Ein guter Name macht einen Kommentar ueberfluessig. Wenn du erklaeren musst, was eine Variable enthaelt, benenne sie um statt zu kommentieren.",
    ),

    H2("Mehrfachzuweisung"),
    C(`a, b = 1, 2
print(a, b)

a, b = b, a      # tauschen, ohne Hilfsvariable
print(a, b)

x = y = z = 0
print(x, y, z)`, { aus: "1 2\n2 1\n0 0 0" }),
    P("Das Tauschen in einer Zeile ist typisch fuer Python. In vielen anderen Sprachen brauchst du dafuer eine Hilfsvariable."),
  ],
  quiz: [
    Q("Was gibt dieser Code aus?",
      ["3 3", "3 7", "7 3", "7 7"], 1,
      "`b = a` kopiert, worauf `a` gerade zeigt. Die spaetere Zuweisung an `a` haengt nur `a` um, `b` bleibt bei der 3.",
      `a = 3\nb = a\na = 7\nprint(a, b)`),
    Q("Welcher Typ hat der Wert `2.0`?",
      ["int", "float", "str", "bool"], 1,
      "Sobald ein Punkt im Spiel ist, handelt es sich um eine Kommazahl, auch wenn nach dem Punkt nur eine Null steht."),
    Q("Was ergibt `int(9.8)`?",
      ["10", "9", "9.8", "Ein TypeError"], 1,
      "`int()` schneidet den Nachkommateil ab. Zum Runden nimmst du `round()`."),
    Q("Welcher Variablenname ist gueltig?",
      ["`2fach`", "`mein-wert`", "`anzahl_2`", "`class`"], 2,
      "Namen duerfen nicht mit einer Ziffer beginnen, keine Bindestriche enthalten und keine Schluesselwoerter sein."),
    Q("Was steht nach diesem Code in `punkte`?",
      ["5", "10", "15", "50"], 2,
      "`punkte += 5` ist die Kurzform von `punkte = punkte + 5`. Aus 10 wird 15.",
      `punkte = 10\npunkte += 5`),
    Q("Was gibt `print(a, b)` nach diesem Code aus?",
      ["1 2", "2 1", "1 1", "2 2"], 1,
      "Rechts wird zuerst vollstaendig ausgewertet, dann werden beide Namen neu geheftet. Das tauscht die Werte.",
      `a, b = 1, 2\na, b = b, a`),
  ],
  aufgaben: [
    {
      id: "a3-1",
      titel: "Rechnung zusammenstellen",
      text: [P("Lege drei Variablen an und gib eine Zeile aus."),
             L("`stueckpreis` mit dem Wert `4.50`",
               "`menge` mit dem Wert `7`",
               "`gesamt` als Produkt der beiden"),
             P("Gib danach genau diese Zeile aus: `7 Stueck kosten 31.5 Euro`")],
      start: `stueckpreis = \nmenge = \ngesamt = \n\nprint()\n`,
      tipps: ["`gesamt = stueckpreis * menge`",
              "Uebergib die Werte mit Komma an `print`, dann musst du nichts umwandeln.",
              "`print(menge, \"Stueck kosten\", gesamt, \"Euro\")`"],
      loesung: `stueckpreis = 4.50
menge = 7
gesamt = stueckpreis * menge

print(menge, "Stueck kosten", gesamt, "Euro")`,
      tests: [
        T("stueckpreis stimmt", `assert abs(stueckpreis - 4.5) < 1e-9, f"stueckpreis war {stueckpreis}"`),
        T("menge stimmt", `assert menge == 7, f"menge war {menge}"`),
        T("gesamt ist berechnet, nicht fest eingetippt", `assert abs(gesamt - 31.5) < 1e-9, f"gesamt war {gesamt}"\nassert "31.5" not in QUELLE.replace("31.50",""), "Rechne den Wert aus, statt ihn hinzuschreiben"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "7 Stueck kosten 31.5 Euro", f"Ausgabe war: {AUSGABE.strip()!r}"`),
      ],
    },
    {
      id: "a3-2",
      titel: "Werte tauschen",
      text: [P("In `links` und `rechts` stehen zwei Werte. Tausche sie, **ohne** eine dritte Variable anzulegen und ohne die Zahlen direkt hinzuschreiben."),
             P("Erwartete Ausgabe: `rechts links`")],
      start: `links = "links"
rechts = "rechts"

# Tausche hier

print(links, rechts)`,
      tipps: ["Python kann mehrere Namen in einer Zeile zuweisen.",
              "Rechts vom Gleichheitszeichen wird zuerst alles ausgewertet.",
              "`links, rechts = rechts, links`"],
      loesung: `links = "links"
rechts = "rechts"

links, rechts = rechts, links

print(links, rechts)`,
      tests: [
        T("Die Werte sind getauscht", `assert links == "rechts" and rechts == "links", f"links={links!r}, rechts={rechts!r}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "rechts links", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Es wurde keine Hilfsvariable benutzt", `zeilen = [z.strip() for z in QUELLE.split("\\n") if "=" in z and not z.strip().startswith("#")]\nassert len(zeilen) <= 3, "Loese es mit der Mehrfachzuweisung in einer Zeile"`),
      ],
    },
  ],
});

M1.push({
  id: "l-zahlen",
  titel: "Zahlen und Rechnen",
  dauer: 16,
  vorspann: "Python rechnet gern. Ein paar Operatoren verhalten sich aber anders als in der Schulmathematik, und genau die sind es, die im Alltag staendig vorkommen.",
  ziele: [
    "Alle arithmetischen Operatoren sicher anwenden",
    "Ganzzahldivision und Rest verstehen und einsetzen",
    "Die Rangfolge der Operatoren kennen",
    "Die Tuecken von Kommazahlen einschaetzen",
  ],
  inhalt: [
    H2("Die Operatoren"),
    TAB(["Zeichen", "Bedeutung", "Beispiel", "Ergebnis"],
      ["`+`", "Addition", "`7 + 2`", "`9`"],
      ["`-`", "Subtraktion", "`7 - 2`", "`5`"],
      ["`*`", "Multiplikation", "`7 * 2`", "`14`"],
      ["`/`", "Division", "`7 / 2`", "`3.5`"],
      ["`//`", "Ganzzahldivision", "`7 // 2`", "`3`"],
      ["`%`", "Rest", "`7 % 2`", "`1`"],
      ["`**`", "Potenz", "`7 ** 2`", "`49`"],
    ),
    C(`print(7 + 2, 7 - 2, 7 * 2)
print(7 / 2)
print(7 // 2)
print(7 % 2)
print(7 ** 2)`, { aus: "9 5 14\n3.5\n3\n1\n49" }),
    WARN("Division liefert immer eine Kommazahl",
      "`10 / 5` ergibt `2.0`, nicht `2`. Das gilt auch, wenn die Rechnung glatt aufgeht. Brauchst du eine Ganzzahl, nimm `//` oder wandle mit `int()` um.",
    ),

    H2("Ganzzahldivision und Rest"),
    P("Diese beiden Operatoren wirken auf den ersten Blick exotisch, sind aber zwei der nuetzlichsten ueberhaupt. `//` sagt, wie oft etwas hineinpasst. `%` sagt, was uebrig bleibt."),
    C(`sekunden = 3725

stunden = sekunden // 3600
rest = sekunden % 3600
minuten = rest // 60
sek = rest % 60

print(stunden, "Stunden", minuten, "Minuten", sek, "Sekunden")`,
      { aus: "1 Stunden 2 Minuten 5 Sekunden" }),
    P("Der Rest beantwortet ausserdem die Frage nach Teilbarkeit. `zahl % 2 == 0` heisst: die Zahl ist gerade."),
    C(`for n in [10, 11, 12, 13]:
    if n % 2 == 0:
        print(n, "ist gerade")
    else:
        print(n, "ist ungerade")`,
      { aus: "10 ist gerade\n11 ist ungerade\n12 ist gerade\n13 ist ungerade" }),
    TIPP("Wofuer du % staendig brauchst",
      "Jeden n-ten Schritt etwas tun (`if schritt % 100 == 0`), zwischen Werten rotieren (`index = (index + 1) % laenge`), Ziffern zerlegen, oder pruefen ob etwas aufgeht. Merke dir diesen Operator gut.",
    ),

    H2("Rangfolge"),
    P("Python haelt sich an die ueblichen Regeln: Potenz vor Punkt vor Strich. Klammern setzen sich immer durch."),
    C(`print(2 + 3 * 4)
print((2 + 3) * 4)
print(2 ** 3 ** 2)
print(-2 ** 2)`, { aus: "14\n20\n512\n-4" }),
    P("Die letzten beiden Zeilen sind Stolperfallen. `**` wird von rechts nach links gelesen, also `2 ** (3 ** 2)` und damit `2 ** 9`. Und `-2 ** 2` bedeutet `-(2 ** 2)`, nicht `(-2) ** 2`."),
    MERKE("Klammern kosten nichts",
      "Wenn du einen Moment ueberlegen musst, wie ein Ausdruck ausgewertet wird, setze Klammern. Sie machen den Code nicht langsamer, aber lesbarer.",
    ),

    H2("Kommazahlen sind ungenau"),
    P("Das ist keine Schwaeche von Python, sondern eine Eigenschaft des Binaersystems. Zahlen wie `0.1` lassen sich im Zweiersystem nicht exakt darstellen, genauso wenig wie sich ein Drittel im Zehnersystem exakt hinschreiben laesst."),
    C(`print(0.1 + 0.2)
print(0.1 + 0.2 == 0.3)`, { aus: "0.30000000000000004\nFalse" }),
    P("Vergleiche Kommazahlen deshalb nie direkt auf Gleichheit. Pruefe stattdessen, ob der Abstand klein genug ist."),
    C(`a = 0.1 + 0.2
b = 0.3

print(abs(a - b) < 1e-9)

import math
print(math.isclose(a, b))`, { aus: "True\nTrue" }),
    HINWEIS("In der KI ganz normal",
      "Beim Training neuronaler Netze arbeitest du standardmaessig mit 32-Bit-Kommazahlen, manchmal sogar mit 16 Bit. Kleine Ungenauigkeiten gehoeren dort zum Handwerk. Wichtig ist, dass du sie kennst und nicht auf exakte Gleichheit prueft.",
    ),

    H2("Das Modul math"),
    P("Fuer alles jenseits der Grundrechenarten gibt es die Standardbibliothek."),
    C(`import math

print(math.sqrt(144))
print(math.pi)
print(math.floor(3.7), math.ceil(3.2))
print(math.log(math.e))
print(math.exp(1))`,
      { aus: "12.0\n3.141592653589793\n3 4\n1.0\n2.718281828459045" }),
    P("`math.floor` rundet immer ab, `math.ceil` immer auf, unabhaengig von der Nachkommastelle. Die Exponentialfunktion `exp` und der natuerliche Logarithmus `log` begegnen dir spaeter in jeder Aktivierungsfunktion."),

    H2("Grosse Zahlen und Lesbarkeit"),
    C(`einwohner = 8_400_000
print(einwohner)

print(2 ** 100)`,
      { aus: "8400000\n1267650600228229401496703205376" }),
    P("Unterstriche in Zahlen ignoriert Python, sie dienen nur dem Lesen. Und ganze Zahlen haben in Python keine Obergrenze, sie wachsen mit dem verfuegbaren Speicher. In den meisten anderen Sprachen laeuft hier ein Wert ueber."),
  ],
  quiz: [
    Q("Was ergibt `17 // 5`?",
      ["3.4", "3", "4", "2"], 1,
      "`//` teilt und schneidet den Rest ab. 5 passt dreimal in 17."),
    Q("Was ergibt `17 % 5`?",
      ["3", "2", "3.4", "0"], 1,
      "`%` liefert den Rest: 17 minus 15 ergibt 2."),
    Q("Was ergibt `10 / 2`?",
      ["5", "5.0", "5.5", "Ein TypeError"], 1,
      "Der einfache Schraegstrich liefert immer eine Kommazahl, auch bei glatter Teilung."),
    Q("Was gibt dieser Code aus?",
      ["True", "False", "0.3", "Ein Fehler"], 1,
      "`0.1 + 0.2` ergibt wegen der Binaerdarstellung `0.30000000000000004`. Vergleiche Kommazahlen mit `math.isclose` oder ueber den Abstand.",
      `print(0.1 + 0.2 == 0.3)`),
    Q("Was ergibt `2 ** 3 ** 2`?",
      ["64", "512", "36", "12"], 1,
      "Die Potenz wird von rechts gelesen: erst `3 ** 2` gleich 9, dann `2 ** 9` gleich 512."),
    Q("Wie pruefst du, ob eine Zahl `n` durch 7 teilbar ist?",
      ["`n // 7 == 0`", "`n % 7 == 0`", "`n / 7 == 0`", "`n ** 7 == 0`"], 1,
      "Teilbar heisst: es bleibt kein Rest. Genau das liefert `%`."),
  ],
  aufgaben: [
    {
      id: "a4-1",
      titel: "Sekunden aufteilen",
      text: [P("In `gesamt` stehen Sekunden. Berechne daraus `stunden`, `minuten` und `sekunden` und gib sie in dieser Form aus:"),
             ROH("2 h 46 min 40 s"),
             P("Benutze nur `//` und `%`, keine fertigen Zeitfunktionen.")],
      start: `gesamt = 10000

stunden = 
minuten = 
sekunden = 

print(stunden, "h", minuten, "min", sekunden, "s")`,
      tipps: ["Eine Stunde hat 3600 Sekunden.",
              "Nach den Stunden bleibt `gesamt % 3600` uebrig. Damit rechnest du weiter.",
              "`minuten = (gesamt % 3600) // 60` und `sekunden = gesamt % 60`"],
      loesung: `gesamt = 10000

stunden = gesamt // 3600
minuten = (gesamt % 3600) // 60
sekunden = gesamt % 60

print(stunden, "h", minuten, "min", sekunden, "s")`,
      tests: [
        T("stunden stimmt", `assert stunden == 2, f"stunden war {stunden}"`),
        T("minuten stimmt", `assert minuten == 46, f"minuten war {minuten}"`),
        T("sekunden stimmt", `assert sekunden == 40, f"sekunden war {sekunden}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "2 h 46 min 40 s", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Es wurde gerechnet, nicht abgeschrieben", `assert "//" in QUELLE and "%" in QUELLE, "Benutze // und % fuer die Rechnung"`),
      ],
    },
    {
      id: "a4-2",
      titel: "Quersumme einer dreistelligen Zahl",
      text: [P("Zerlege `zahl` in ihre drei Ziffern und gib die Summe aus. Nutze dafuer `//` und `%`, nicht die Umwandlung in Text."),
             P("Fuer `zahl = 481` lautet die Ausgabe `13`.")],
      start: `zahl = 481

hunderter = 
zehner = 
einer = 

print(hunderter + zehner + einer)`,
      tipps: ["`zahl // 100` liefert die Hunderterstelle.",
              "Fuer den Zehner: erst den Rest der Hunderter nehmen, dann durch 10 teilen.",
              "`zehner = (zahl // 10) % 10` ist der kuerzeste Weg."],
      loesung: `zahl = 481

hunderter = zahl // 100
zehner = (zahl // 10) % 10
einer = zahl % 10

print(hunderter + zehner + einer)`,
      tests: [
        T("hunderter stimmt", `assert hunderter == 4, f"hunderter war {hunderter}"`),
        T("zehner stimmt", `assert zehner == 8, f"zehner war {zehner}"`),
        T("einer stimmt", `assert einer == 1, f"einer war {einer}"`),
        T("Die Ausgabe ist 13", `assert AUSGABE.strip() == "13", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Es wurde nicht ueber Text geloest", `assert "str(" not in QUELLE, "Loese es mit // und %, ohne Umwandlung in Text"`),
      ],
    },
  ],
});

M1.push({
  id: "l-strings",
  titel: "Text verarbeiten",
  dauer: 20,
  vorspann: "Text ist der Rohstoff, mit dem du in der KI besonders oft arbeitest. Python bietet dafuer einen eigenen Typ mit erstaunlich vielen Faehigkeiten.",
  ziele: [
    "Zeichenketten anlegen und verbinden",
    "Einzelne Zeichen und Ausschnitte herausgreifen",
    "Die wichtigsten Methoden sicher einsetzen",
    "Verstehen, dass Zeichenketten unveraenderlich sind",
  ],
  inhalt: [
    H2("Zeichenketten anlegen"),
    P("Einfache und doppelte Anfuehrungszeichen sind gleichwertig. Nutze die Variante, die dir das Maskieren erspart."),
    C(`a = "Hallo"
b = 'Welt'
c = "Sie sagte: 'Hallo'"
d = 'Er antwortete: "Hallo"'
print(a, b)
print(c)
print(d)`, { aus: "Hallo Welt\nSie sagte: 'Hallo'\nEr antwortete: \"Hallo\"" }),
    P("Fuer mehrzeiligen Text nimmst du drei Anfuehrungszeichen."),
    C(`text = """Zeile eins
Zeile zwei
Zeile drei"""
print(text)`, { aus: "Zeile eins\nZeile zwei\nZeile drei" }),

    H2("Sonderzeichen"),
    P("Ein Backslash leitet eine Sonderbedeutung ein."),
    TAB(["Folge", "Bedeutung"],
      ["`\\\\n`", "Zeilenumbruch"],
      ["`\\\\t`", "Tabulator"],
      ["`\\\\\"`", "Anfuehrungszeichen im Text"],
      ["`\\\\\\\\`", "ein echter Backslash"],
    ),
    C(`print("Name:\\tAda\\nFach:\\tKI")
print("C:\\\\Nutzer\\\\Daten")
print(r"C:\\Nutzer\\Daten")`,
      { aus: "Name:\tAda\nFach:\tKI\nC:\\Nutzer\\Daten\nC:\\Nutzer\\Daten" }),
    P("Das `r` vor dem Anfuehrungszeichen macht daraus eine Rohzeichenkette: Backslashes bleiben dann einfach stehen. Das brauchst du bei Dateipfaden und besonders bei regulaeren Ausdruecken."),

    H2("Verbinden und vervielfachen"),
    C(`vorname = "Ada"
nachname = "Lovelace"

print(vorname + " " + nachname)
print("-" * 30)
print("ab" * 3)`,
      { aus: "Ada Lovelace\n------------------------------\nababab" }),
    WARN("Kein Plus zwischen Text und Zahl",
      "`\"Alter: \" + 36` gibt einen `TypeError`. Wandle die Zahl um mit `str(36)` oder nutze einen f-String, den du in der naechsten Lektion kennenlernst.",
    ),

    H2("Zeichen herausgreifen"),
    P("Jedes Zeichen hat eine Position. Gezaehlt wird ab **null**. Negative Zahlen zaehlen von hinten."),
    C(`wort = "Python"
#        012345
#       -654321

print(wort[0])
print(wort[3])
print(wort[-1])
print(wort[-2])
print(len(wort))`, { aus: "P\nh\nn\no\n6" }),
    P("Ein ganzer Ausschnitt heisst Slice. Die Schreibweise ist `[start:ende]`, wobei `ende` **nicht** mehr dazugehoert."),
    C(`wort = "Programmieren"

print(wort[0:3])
print(wort[:3])
print(wort[3:])
print(wort[-4:])
print(wort[::2])
print(wort[::-1])`,
      { aus: "Pro\nPro\ngrammieren\neren\nPormirn\nnereimmargorP" }),
    TIPP("Die Slice-Formel",
      "`[start:ende:schritt]`. Laesst du einen Teil weg, nimmt Python den Anfang, das Ende oder die Schrittweite eins. `[::-1]` dreht deshalb die Reihenfolge um.",
    ),

    H2("Unveraenderlich"),
    P("Eine Zeichenkette laesst sich nach dem Anlegen nicht mehr aendern. Jede Methode liefert eine **neue** Zeichenkette zurueck."),
    C(`wort = "Katze"
wort[0] = "M"`),
    P("Stattdessen baust du eine neue zusammen:"),
    C(`wort = "Katze"
neu = "M" + wort[1:]
print(wort, neu)`, { aus: "Katze Matze" }),
    MERKE("Methoden aendern nichts",
      "`text.upper()` veraendert `text` nicht. Es gibt eine grosse Fassung zurueck. Willst du das Ergebnis behalten, musst du es einem Namen zuweisen.",
    ),

    H2("Die wichtigsten Methoden"),
    C(`s = "  Hallo Welt  "

print(s.strip())
print(s.strip().upper())
print(s.strip().lower())
print(s.strip().replace("Welt", "Python"))
print(s.strip().split(" "))
print(len(s), len(s.strip()))`,
      { aus: "Hallo Welt\nHALLO WELT\nhallo welt\nHallo Python\n['Hallo', 'Welt']\n14 10" }),
    TAB(["Methode", "Zweck", "Beispiel"],
      ["`strip()`", "Leerraum aussen entfernen", "`\" a \".strip()` gibt `\"a\"`"],
      ["`upper()` / `lower()`", "Gross- oder Kleinschreibung", "`\"a\".upper()` gibt `\"A\"`"],
      ["`replace(a, b)`", "ersetzen", "`\"aa\".replace(\"a\",\"b\")` gibt `\"bb\"`"],
      ["`split(t)`", "in eine Liste zerlegen", "`\"a,b\".split(\",\")` gibt `['a','b']`"],
      ["`join(liste)`", "Liste zusammenfuegen", "`\"-\".join(['a','b'])` gibt `\"a-b\"`"],
      ["`startswith(t)`", "beginnt mit", "`\"abc\".startswith(\"ab\")` gibt `True`"],
      ["`find(t)`", "Position oder -1", "`\"abc\".find(\"c\")` gibt `2`"],
      ["`count(t)`", "wie oft enthalten", "`\"aaa\".count(\"a\")` gibt `3`"],
    ),
    P("`join` ist die Umkehrung von `split` und begegnet dir staendig:"),
    C(`teile = "Ada,Grace,Alan".split(",")
print(teile)
print(" und ".join(teile))`,
      { aus: "['Ada', 'Grace', 'Alan']\nAda und Grace und Alan" }),

    H2("Enthalten pruefen"),
    C(`satz = "Python ist gut fuer KI"

print("KI" in satz)
print("Java" in satz)
print("ki" in satz.lower())`, { aus: "True\nFalse\nTrue" }),
    P("Das Schluesselwort `in` liefert einen Wahrheitswert und ist der uebliche Weg, Text zu durchsuchen. Achte auf Gross- und Kleinschreibung: vergleiche am besten beide Seiten in Kleinschreibung."),

    H2("Verkettete Aufrufe"),
    P("Weil jede Methode wieder eine Zeichenkette liefert, kannst du sie aneinanderhaengen. Das ist ein typisches Muster bei der Datenbereinigung:"),
    C(`roh = "   ADA LOVELACE ;  1815  "

sauber = roh.strip().lower().replace(";", "").strip()
print(repr(sauber))`, { aus: "'ada lovelace   1815'" }),
    HINWEIS("repr statt print",
      "`repr()` zeigt den Wert so, wie du ihn im Code schreiben wuerdest, mit Anfuehrungszeichen und sichtbaren Sonderzeichen. Beim Suchen nach unsichtbaren Leerzeichen ist das Gold wert.",
    ),
  ],
  quiz: [
    Q("Was gibt `\"Python\"[1:4]` zurueck?",
      ["Pyt", "yth", "ytho", "ythh"], 1,
      "Gezaehlt wird ab null, und das Ende gehoert nicht dazu. Also Position 1, 2 und 3."),
    Q("Was gibt `\"Hallo\"[-2]` zurueck?",
      ["a", "l", "o", "Ein Fehler"], 1,
      "Negative Positionen zaehlen von hinten. Minus eins ist das `o`, minus zwei das zweite `l`."),
    Q("Was gibt dieser Code aus?",
      ["hallo", "HALLO", "Hallo", "Ein Fehler"], 2,
      "`upper()` gibt eine neue Zeichenkette zurueck und aendert das Original nicht. Ohne Zuweisung geht das Ergebnis verloren.",
      `text = "Hallo"\ntext.upper()\nprint(text)`),
    Q("Was ergibt `\"a,b,c\".split(\",\")`?",
      ["`\"abc\"`", "`['a', 'b', 'c']`", "`['a,b,c']`", "`('a','b','c')`"], 1,
      "`split` zerlegt am Trennzeichen und liefert eine Liste von Teilstuecken."),
    Q("Warum schlaegt `wort[0] = \"M\"` fehl?",
      ["Weil Position null nicht existiert",
       "Weil Zeichenketten unveraenderlich sind",
       "Weil man Grossbuchstaben nicht zuweisen darf",
       "Weil die Klammern falsch sind"],
      1,
      "Zeichenketten lassen sich nach dem Anlegen nicht mehr veraendern. Du baust stattdessen eine neue zusammen."),
    Q("Was gibt `\"abcdef\"[::-1]` zurueck?",
      ["abcdef", "fedcba", "acf", "Ein Fehler"], 1,
      "Eine Schrittweite von minus eins laeuft rueckwaerts durch die Zeichenkette."),
  ],
  aufgaben: [
    {
      id: "a5-1",
      titel: "Kuerzel bilden",
      text: [P("Aus `vorname` und `nachname` soll ein Kuerzel entstehen: der erste Buchstabe des Vornamens, ein Punkt, der erste Buchstabe des Nachnamens, ein Punkt. Alles gross."),
             P("Fuer `ada` und `lovelace` lautet die Ausgabe `A.L.`")],
      start: `vorname = "ada"
nachname = "lovelace"

kuerzel = 

print(kuerzel)`,
      tipps: ["`vorname[0]` liefert den ersten Buchstaben.",
              "`.upper()` macht daraus einen Grossbuchstaben.",
              "Setze die Teile mit `+` zusammen: `vorname[0].upper() + \".\" + ...`"],
      loesung: `vorname = "ada"
nachname = "lovelace"

kuerzel = vorname[0].upper() + "." + nachname[0].upper() + "."

print(kuerzel)`,
      tests: [
        T("kuerzel stimmt", `assert kuerzel == "A.L.", f"kuerzel war {kuerzel!r}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "A.L.", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Es wurde aus den Namen gebaut", `assert "vorname[0]" in QUELLE.replace(" ", "") or "vorname [0]" in QUELLE, "Greife auf den ersten Buchstaben zu, statt ihn hinzuschreiben"`),
      ],
    },
    {
      id: "a5-2",
      titel: "Eine Zeile bereinigen",
      text: [P("Die Zeile `roh` kommt aus einer schlecht gepflegten Datei. Bereinige sie so:"),
             L("Leerraum am Anfang und Ende entfernen",
               "alles in Kleinbuchstaben",
               "das Semikolon durch ein Komma ersetzen"),
             P("Speichere das Ergebnis in `sauber` und gib es aus.")],
      start: `roh = "  ADA;LOVELACE  "

sauber = 

print(sauber)`,
      tipps: ["Du kannst die Methoden hintereinander haengen.",
              "`roh.strip()` entfernt den Leerraum.",
              "`.lower().replace(\";\", \",\")` erledigt den Rest."],
      loesung: `roh = "  ADA;LOVELACE  "

sauber = roh.strip().lower().replace(";", ",")

print(sauber)`,
      tests: [
        T("sauber stimmt", `assert sauber == "ada,lovelace", f"sauber war {sauber!r}"`),
        T("Kein Leerraum mehr aussen", `assert sauber == sauber.strip(), "Am Rand steht noch Leerraum"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "ada,lovelace", f"Ausgabe war: {AUSGABE.strip()!r}"`),
      ],
    },
    {
      id: "a5-3",
      titel: "Palindrom pruefen",
      text: [P("Ein Palindrom liest sich vorwaerts wie rueckwaerts. Pruefe `wort` darauf und gib `True` oder `False` aus."),
             P("Gross- und Kleinschreibung soll dabei egal sein.")],
      start: `wort = "Rentner"

ist_palindrom = 

print(ist_palindrom)`,
      tipps: ["Bringe das Wort zuerst in Kleinschreibung.",
              "`[::-1]` dreht eine Zeichenkette um.",
              "Vergleiche beide Fassungen mit `==`."],
      loesung: `wort = "Rentner"

klein = wort.lower()
ist_palindrom = klein == klein[::-1]

print(ist_palindrom)`,
      tests: [
        T("Das Ergebnis ist True", `assert ist_palindrom is True, f"Ergebnis war {ist_palindrom!r}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "True", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Der Vergleich ist allgemein, nicht fest verdrahtet", `assert "[::-1]" in QUELLE, "Nutze das Umdrehen mit [::-1]"`),
        T("Funktioniert auch fuer ein Nicht-Palindrom", `pruef = "Python"\nk = pruef.lower()\nassert (k == k[::-1]) is False`),
      ],
    },
  ],
});

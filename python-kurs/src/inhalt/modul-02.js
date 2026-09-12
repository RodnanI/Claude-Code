const M2 = modul({
  id: "m2", nr: 2, ikon: "fluss",
  titel: "Daten und Entscheidungen",
  kurz: "Text formatieren, Eingaben verarbeiten und dem Programm beibringen, Wege zu waehlen.",
});

M2.push({
  id: "l-fstrings",
  titel: "f-Strings und Formatierung",
  dauer: 15,
  vorspann: "Werte in Text einzubauen ist eine der haeufigsten Aufgaben ueberhaupt. Python hat dafuer eine Loesung, die kuerzer und schneller ist als alles, was es davor gab.",
  ziele: [
    "Werte mit f-Strings in Text einsetzen",
    "Zahlen auf feste Nachkommastellen bringen",
    "Spalten ausrichten und Tausendertrennzeichen setzen",
    "Ausdruecke direkt im Text auswerten",
  ],
  inhalt: [
    H2("Das Grundprinzip"),
    P("Ein `f` vor dem Anfuehrungszeichen macht aus einer Zeichenkette eine Vorlage. Alles in geschweiften Klammern wird ausgewertet und eingesetzt."),
    C(`name = "Ada"
alter = 36

print(f"{name} ist {alter} Jahre alt.")`, { aus: "Ada ist 36 Jahre alt." }),
    P("Vergleiche das mit den aelteren Wegen. Alle drei folgenden Zeilen liefern dasselbe:"),
    C(`name, alter = "Ada", 36

print(name + " ist " + str(alter) + " Jahre alt.")
print("{} ist {} Jahre alt.".format(name, alter))
print(f"{name} ist {alter} Jahre alt.")`,
      { aus: "Ada ist 36 Jahre alt.\nAda ist 36 Jahre alt.\nAda ist 36 Jahre alt." }),
    P("Die erste Fassung braucht `str()` und ist fehleranfaellig. Die dritte ist kuerzer, schneller und liest sich am besten. Nimm im Zweifel immer den f-String."),

    H2("Ausdruecke in den Klammern"),
    P("In den geschweiften Klammern darf beliebiger Python-Code stehen, nicht nur ein Name."),
    C(`a, b = 7, 3

print(f"{a} plus {b} ergibt {a + b}")
print(f"Die Haelfte von {a} ist {a / 2}")
print(f"Gross geschrieben: {'python'.upper()}")
print(f"Laenge: {len('Programmieren')}")`,
      { aus: "7 plus 3 ergibt 10\nDie Haelfte von 7 ist 3.5\nGross geschrieben: PYTHON\nLaenge: 13" }),
    WARN("Anfuehrungszeichen beachten",
      "Steht dein f-String in doppelten Anfuehrungszeichen, nutze innen einfache. Seit Python 3.12 ist die Mischung zwar erlaubt, aber altere Fassungen melden sonst einen Fehler.",
    ),

    H2("Zahlen formatieren"),
    P("Nach einem Doppelpunkt folgt die Formatangabe. Das ist der Teil, den du wirklich lernen solltest, weil er staendig gebraucht wird."),
    C(`wert = 3.14159265

print(f"{wert:.2f}")
print(f"{wert:.0f}")
print(f"{wert:10.3f}")
print(f"{wert:<10.3f}|")
print(f"{1234567:,}")
print(f"{0.8734:.1%}")`,
      { aus: "3.14\n3\n     3.142\n3.142     |\n1,234,567\n87.3%" }),
    TAB(["Angabe", "Wirkung", "Beispiel", "Ergebnis"],
      ["`.2f`", "zwei Nachkommastellen", "`f\"{3.14159:.2f}\"`", "`3.14`"],
      ["`.1%`", "als Prozent", "`f\"{0.873:.1%}\"`", "`87.3%`"],
      ["`,`", "Tausendertrennung", "`f\"{1234567:,}\"`", "`1,234,567`"],
      ["`>8`", "rechtsbuendig auf 8", "`f\"{'a':>8}\"`", "`       a`"],
      ["`<8`", "linksbuendig auf 8", "`f\"{'a':<8}\"`", "`a       `"],
      ["`^8`", "zentriert auf 8", "`f\"{'a':^8}\"`", "`   a    `"],
      ["`08.2f`", "mit Nullen auffuellen", "`f\"{3.1:08.2f}\"`", "`00003.10`"],
      ["`e`", "wissenschaftlich", "`f\"{12345:.2e}\"`", "`1.23e+04`"],
    ),

    H2("Tabellen im Terminal"),
    P("Mit der Ausrichtung baust du saubere Spalten ohne jede Bibliothek."),
    C(`daten = [("Modell A", 0.9234, 120), ("Modell B", 0.8712, 45), ("Langer Name C", 0.9501, 3200)]

print(f"{'Modell':<16}{'Genauigkeit':>13}{'Dauer':>9}")
print("-" * 38)
for name, genauigkeit, dauer in daten:
    print(f"{name:<16}{genauigkeit:>12.2%}{dauer:>8} s")`,
      { aus: "Modell            Genauigkeit    Dauer\n--------------------------------------\nModell A              92.34%     120 s\nModell B              87.12%      45 s\nLanger Name C         95.01%    3200 s" }),
    TIPP("Wofuer du das in der KI brauchst",
      "Trainingsausgaben lesbar halten. Statt `print(epoche, verlust, genauigkeit)` schreibst du `print(f\"Epoche {epoche:3d} | Verlust {verlust:.4f} | Genauigkeit {genauigkeit:.1%}\")`. Der Unterschied beim Lesen von hundert Zeilen ist enorm.",
    ),

    H2("Zwei nuetzliche Kniffe"),
    H("Gleichheitszeichen zum Fehlersuchen"),
    C(`lernrate = 0.01
epochen = 50

print(f"{lernrate=}")
print(f"{epochen=}, {lernrate * 10=}")`,
      { aus: "lernrate=0.01\nepochen=50, lernrate * 10=0.1" }),
    P("Das `=` direkt vor der schliessenden Klammer gibt Name und Wert zusammen aus. Beim Suchen von Fehlern spart das sehr viel Tipparbeit."),
    H("Verschachtelte Formatangabe"),
    C(`breite = 12
wert = 3.14159

print(f"{wert:>{breite}.2f}|")`, { aus: "        3.14|" }),
    P("Die Breite selbst darf aus einer Variablen kommen. So baust du Spalten, deren Breite sich nach den Daten richtet."),

    H2("Mehrzeilige Vorlagen"),
    C(`name = "Perzeptron"
schichten = 3
genauigkeit = 0.9412

bericht = f"""Modell:      {name}
Schichten:   {schichten}
Genauigkeit: {genauigkeit:.2%}"""

print(bericht)`,
      { aus: "Modell:      Perzeptron\nSchichten:   3\nGenauigkeit: 94.12%" }),
    MERKE("Eine Regel",
      "Sobald ein Wert in Text eingebaut wird, nimm einen f-String. Es gibt praktisch keinen Fall, in dem Aneinanderhaengen mit Plus die bessere Wahl waere.",
    ),
  ],
  quiz: [
    Q("Was gibt dieser Code aus?",
      ["x + y", "8", "{x + y}", "Ein SyntaxError"], 1,
      "In den geschweiften Klammern steht ein Ausdruck, der zuerst ausgewertet wird.",
      `x, y = 3, 5\nprint(f"{x + y}")`),
    Q("Wie gibst du `0.5` als `50.0%` aus?",
      ["`f\"{0.5:%}\"`", "`f\"{0.5:.1%}\"`", "`f\"{0.5}%\"`", "`f\"{0.5:.1f}%\"`"], 1,
      "Die Angabe `%` multipliziert mit 100 und haengt das Zeichen an. `.1` bestimmt die Nachkommastelle."),
    Q("Was ergibt `f\"{42:>6}\"`?",
      ["`42    `", "`    42`", "`424242`", "`42`"], 1,
      "Das Groesserzeichen richtet rechtsbuendig aus und fuellt links auf sechs Zeichen auf."),
    Q("Was gibt `f\"{tempo=}\"` bei `tempo = 12` aus?",
      ["`12`", "`tempo`", "`tempo=12`", "Ein Fehler"], 2,
      "Das Gleichheitszeichen vor der Klammer gibt Name und Wert zusammen aus. Sehr praktisch beim Fehlersuchen."),
    Q("Welche Formatangabe liefert `1,000,000`?",
      ["`f\"{1000000:.}\"`", "`f\"{1000000:,}\"`", "`f\"{1000000:_}\"`", "`f\"{1000000:3}\"`"], 1,
      "Das Komma setzt Tausendertrennzeichen. Ein Unterstrich wuerde `1_000_000` ergeben."),
  ],
  aufgaben: [
    {
      id: "a6-1",
      titel: "Trainingszeile formatieren",
      text: [P("Gib eine Statuszeile aus, die genau so aussieht:"),
             ROH("Epoche   7 | Verlust 0.0342 | Genauigkeit  94.1%"),
             L("Die Epoche ist rechtsbuendig auf 3 Zeichen.",
               "Der Verlust hat vier Nachkommastellen.",
               "Die Genauigkeit ist ein Prozentwert mit einer Nachkommastelle, rechtsbuendig auf 6 Zeichen.")],
      start: `epoche = 7
verlust = 0.03421
genauigkeit = 0.9412

print()`,
      tipps: ["Fuer die Epoche: `{epoche:3d}` oder `{epoche:>3}`.",
              "Fuer den Verlust: `{verlust:.4f}`.",
              "Fuer die Genauigkeit: `{genauigkeit:>6.1%}`."],
      loesung: `epoche = 7
verlust = 0.03421
genauigkeit = 0.9412

print(f"Epoche {epoche:3d} | Verlust {verlust:.4f} | Genauigkeit {genauigkeit:>6.1%}")`,
      tests: [
        T("Die Zeile stimmt genau", `erwartet = "Epoche   7 | Verlust 0.0342 | Genauigkeit  94.1%"\nassert AUSGABE.strip() == erwartet, f"Erwartet: {erwartet!r}\\nErhalten: {AUSGABE.strip()!r}"`),
        T("Es wurde ein f-String benutzt", `assert 'f"' in QUELLE or "f'" in QUELLE, "Nutze einen f-String"`),
        T("Die Werte sind nicht fest eingetippt", `assert "0.0342\\"" not in QUELLE and "94.1%" not in QUELLE, "Formatiere die Variablen, statt die Werte hinzuschreiben"`),
      ],
    },
    {
      id: "a6-2",
      titel: "Kassenbon ausrichten",
      text: [P("Gib die drei Posten so aus, dass die Preise rechtsbuendig untereinander stehen. Die Namen belegen 14 Zeichen, die Preise 8 Zeichen mit zwei Nachkommastellen."),
             ROH("Kaffee            3.50\nKuchenstueck      4.20\nWasser            2.00")],
      start: `posten = [("Kaffee", 3.5), ("Kuchenstueck", 4.2), ("Wasser", 2.0)]

for name, preis in posten:
    print()`,
      tipps: ["`{name:<14}` richtet linksbuendig auf 14 Zeichen aus.",
              "`{preis:>8.2f}` richtet rechtsbuendig mit zwei Nachkommastellen aus.",
              "Beides zusammen in einem f-String ohne Leerzeichen dazwischen."],
      loesung: `posten = [("Kaffee", 3.5), ("Kuchenstueck", 4.2), ("Wasser", 2.0)]

for name, preis in posten:
    print(f"{name:<14}{preis:>8.2f}")`,
      tests: [
        T("Es sind drei Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 3, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die erste Zeile stimmt", `zeilen = AUSGABE.split("\\n")\nassert zeilen[0] == "Kaffee            3.50", f"Zeile war: {zeilen[0]!r}"`),
        T("Alle Zeilen sind gleich lang", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(set(len(z) for z in zeilen)) == 1, "Die Spalten sind nicht gleich breit"`),
        T("Die Preise stehen rechtsbuendig", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert all(z.endswith(("3.50", "4.20", "2.00")) for z in zeilen), "Die Preise stehen nicht am Zeilenende"`),
      ],
    },
  ],
});

M2.push({
  id: "l-eingabe",
  titel: "Eingaben entgegennehmen",
  dauer: 12,
  vorspann: "Ein Programm, das immer dasselbe tut, ist selten nuetzlich. Mit input holst du Werte von aussen herein und machst dein Programm beweglich.",
  ziele: [
    "input benutzen und das Ergebnis richtig behandeln",
    "Eingaben zuverlaessig in Zahlen umwandeln",
    "Die typische Fehlerquelle bei input kennen",
    "Mehrere Werte aus einer Zeile lesen",
  ],
  inhalt: [
    H2("input liefert immer Text"),
    P("`input()` zeigt eine Aufforderung an, wartet auf eine Eingabe und gibt sie zurueck. Das Ergebnis ist **immer** eine Zeichenkette, auch wenn eine Zahl eingetippt wurde."),
    C(`name = input("Wie heisst du? ")
print(f"Hallo {name}.")`, { eingaben: ["Ada"] }),
    HINWEIS("Eingaben in diesem Kurs",
      "In den Beispielen hier sind die Antworten bereits hinterlegt, damit du nichts tippen musst. In einem echten Terminal haelt das Programm an dieser Stelle an und wartet auf dich.",
    ),
    P("Der haeufigste Anfaengerfehler folgt sofort:"),
    C(`alter = input("Alter: ")
print(alter + 1)`, { eingaben: ["30"] }),
    P("`TypeError`. Die Eingabe `30` ist der **Text** `\"30\"`, nicht die Zahl 30. Du musst umwandeln."),
    C(`alter = int(input("Alter: "))
print(alter + 1)`, { eingaben: ["30"], aus: "Alter: 30\n31" }),

    H2("Umwandeln und absichern"),
    P("Was passiert, wenn jemand Unsinn eingibt? Das Programm bricht ab."),
    C(`zahl = int(input("Zahl: "))
print(zahl * 2)`, { eingaben: ["vier"] }),
    P("Sauber loest man das mit einer Pruefung. `isdigit()` sagt, ob eine Zeichenkette nur aus Ziffern besteht."),
    C(`roh = input("Zahl: ")

if roh.isdigit():
    print(int(roh) * 2)
else:
    print("Das war keine ganze Zahl.")`, { eingaben: ["vier"], aus: "Zahl: vier\nDas war keine ganze Zahl." }),
    WARN("isdigit hat Grenzen",
      "`\"-5\".isdigit()` ist `False`, und `\"3.5\".isdigit()` ebenfalls. Fuer negative Zahlen und Kommazahlen brauchst du den Weg ueber `try` und `except`, den du im Kapitel zur Fehlerbehandlung kennenlernst.",
    ),

    H2("Mehrere Werte aus einer Zeile"),
    C(`zeile = input("Drei Zahlen, durch Leerzeichen getrennt: ")
teile = zeile.split()

a = int(teile[0])
b = int(teile[1])
c = int(teile[2])

print(f"Summe: {a + b + c}")`, { eingaben: ["4 9 12"], aus: "Drei Zahlen, durch Leerzeichen getrennt: 4 9 12\nSumme: 25" }),
    P("Kuerzer geht es mit Entpacken und `map`:"),
    C(`a, b, c = map(int, input("Drei Zahlen: ").split())
print(f"Summe: {a + b + c}")`, { eingaben: ["4 9 12"], aus: "Drei Zahlen: 4 9 12\nSumme: 25" }),
    P("`map(int, liste)` wendet `int` auf jedes Element an. Das begegnet dir spaeter noch oefter."),

    H2("Ein vollstaendiges kleines Programm"),
    C(`print("Umrechnung Celsius nach Fahrenheit")
print("-" * 38)

celsius = float(input("Grad Celsius: "))
fahrenheit = celsius * 9 / 5 + 32

print(f"{celsius:.1f} Grad Celsius sind {fahrenheit:.1f} Grad Fahrenheit.")`,
      { eingaben: ["21.5"],
        aus: "Umrechnung Celsius nach Fahrenheit\n--------------------------------------\nGrad Celsius: 21.5\n21.5 Grad Celsius sind 70.7 Grad Fahrenheit." }),
    MERKE("Die Regel fuer input",
      "Erst lesen, dann pruefen, dann umwandeln. Wer die Umwandlung direkt um `input` legt, baut sich eine Stelle ein, an der das Programm bei jeder Fehleingabe abstuerzt.",
    ),
  ],
  quiz: [
    Q("Welchen Typ hat das Ergebnis von `input()`?",
      ["int, wenn eine Zahl eingegeben wurde", "str, immer", "Es haengt von der Eingabe ab", "float"], 1,
      "`input` liefert ausnahmslos eine Zeichenkette. Die Umwandlung musst du selbst vornehmen."),
    Q("Was passiert bei diesem Code, wenn der Nutzer `5` eingibt?",
      ["Es wird `6` ausgegeben", "Es wird `51` ausgegeben", "Ein TypeError", "Ein ValueError"], 2,
      "`\"5\" + 1` verbindet Text mit einer Zahl, das ist nicht erlaubt. Mit `int()` um die Eingabe herum waere es `6`.",
      `alter = input("Alter: ")\nprint(alter + 1)`),
    Q("Was macht `map(int, \"1 2 3\".split())`?",
      ["Es gibt die Zeichenkette `123` zurueck",
       "Es wandelt jedes Teilstueck in eine ganze Zahl um",
       "Es addiert alle Zahlen",
       "Es gibt einen Fehler"],
      1,
      "`map` wendet die Funktion auf jedes Element an. Aus den drei Teilstuecken werden drei ganze Zahlen."),
    Q("Was liefert `\"-7\".isdigit()`?",
      ["True", "False", "Einen TypeError", "-7"], 1,
      "Das Minuszeichen ist keine Ziffer, deshalb `False`. Fuer negative Zahlen brauchst du eine andere Pruefung."),
  ],
  aufgaben: [
    {
      id: "a7-1",
      titel: "Durchschnitt aus drei Eingaben",
      text: [P("Lies drei Zahlen nacheinander ein und gib den Durchschnitt mit zwei Nachkommastellen aus."),
             P("Die Aufforderungen lauten `Zahl 1: `, `Zahl 2: ` und `Zahl 3: `. Die Ausgabe lautet `Durchschnitt: 7.33`.")],
      eingaben: ["4", "8", "10"],
      start: `a = \nb = \nc = \n\nprint()\n`,
      tipps: ["`float(input(\"Zahl 1: \"))` liest und wandelt in einem Schritt.",
              "Der Durchschnitt ist die Summe geteilt durch drei.",
              "Formatiere mit `{wert:.2f}`."],
      loesung: `a = float(input("Zahl 1: "))
b = float(input("Zahl 2: "))
c = float(input("Zahl 3: "))

print(f"Durchschnitt: {(a + b + c) / 3:.2f}")`,
      tests: [
        T("Der Durchschnitt stimmt", `assert "Durchschnitt: 7.33" in AUSGABE, f"Ausgabe war: {AUSGABE!r}"`),
        T("Es wurde dreimal eingelesen", `assert QUELLE.count("input(") == 3, f"Gefunden: {QUELLE.count('input(')} Aufrufe"`),
        T("Die Werte wurden umgewandelt", `assert "float(" in QUELLE or "int(" in QUELLE, "Wandle die Eingaben in Zahlen um"`),
      ],
    },
  ],
});

M2.push({
  id: "l-wahrheit",
  titel: "Wahrheitswerte und Vergleiche",
  dauer: 16,
  vorspann: "Jede Entscheidung im Programm laeuft am Ende auf eine einzige Frage hinaus: wahr oder falsch. Python geht dabei grosszuegiger vor, als du vielleicht erwartest.",
  ziele: [
    "Alle Vergleichsoperatoren sicher anwenden",
    "and, or und not kombinieren",
    "Wahrheitswerte anderer Typen einschaetzen",
    "Den Unterschied zwischen == und is verstehen",
  ],
  inhalt: [
    H2("Vergleiche"),
    TAB(["Zeichen", "Bedeutung", "Beispiel", "Ergebnis"],
      ["`==`", "gleich", "`3 == 3`", "`True`"],
      ["`!=`", "ungleich", "`3 != 4`", "`True`"],
      ["`<`", "kleiner", "`3 < 4`", "`True`"],
      ["`>`", "groesser", "`3 > 4`", "`False`"],
      ["`<=`", "kleiner oder gleich", "`3 <= 3`", "`True`"],
      ["`>=`", "groesser oder gleich", "`3 >= 4`", "`False`"],
    ),
    WARN("Ein Gleichheitszeichen oder zwei",
      "`=` weist zu, `==` vergleicht. Das ist der haeufigste Tippfehler ueberhaupt. Python schuetzt dich hier immerhin: `if x = 5:` gibt einen `SyntaxError` statt still etwas Falsches zu tun.",
    ),
    C(`a, b = 7, 3

print(a > b)
print(a == b)
print(a != b)
print("abc" < "abd")`, { aus: "True\nFalse\nTrue\nTrue" }),
    P("Text wird zeichenweise nach Zeichencodes verglichen. Deshalb steht `\"Zebra\"` vor `\"apfel\"`, denn Grossbuchstaben haben kleinere Codes als Kleinbuchstaben."),

    H2("Ketten"),
    P("Python erlaubt eine Schreibweise, die es in den meisten Sprachen nicht gibt:"),
    C(`alter = 25

print(18 <= alter <= 67)
print(0 < alter < 18)`, { aus: "True\nFalse" }),
    P("Das liest sich wie in der Mathematik und ist genau das, was du meinst. Andere Sprachen brauchen dafuer `alter >= 18 && alter <= 67`."),

    H2("Logische Verknuepfungen"),
    TAB(["Operator", "Ergebnis ist wahr, wenn", "Beispiel"],
      ["`and`", "beide Seiten wahr sind", "`True and False` ergibt `False`"],
      ["`or`", "mindestens eine Seite wahr ist", "`True or False` ergibt `True`"],
      ["`not`", "die Seite falsch ist", "`not True` ergibt `False`"],
    ),
    C(`alter = 25
hat_ausweis = True

print(alter >= 18 and hat_ausweis)
print(alter < 18 or hat_ausweis)
print(not hat_ausweis)`, { aus: "True\nTrue\nFalse" }),
    P("Python wertet **faul** aus: bei `and` wird die rechte Seite gar nicht mehr angeschaut, wenn die linke schon falsch ist. Das nutzt man, um Fehler zu vermeiden:"),
    C(`text = ""

# Ohne die faule Auswertung gaebe es hier einen IndexError
if len(text) > 0 and text[0] == "A":
    print("beginnt mit A")
else:
    print("leer oder anderer Anfang")`, { aus: "leer oder anderer Anfang" }),

    H2("Was gilt als wahr"),
    P("Jeder Wert in Python laesst sich als Wahrheitswert lesen. Die Regel ist einfach: **leer oder null ist falsch, alles andere wahr**."),
    TAB(["Falsch", "Wahr"],
      ["`False`", "`True`"],
      ["`0`, `0.0`", "jede andere Zahl"],
      ["`\"\"` (leerer Text)", "jeder nicht leere Text"],
      ["`[]`, `{}`, `()` (leer)", "jede nicht leere Sammlung"],
      ["`None`", "jedes Objekt"],
    ),
    C(`print(bool(0), bool(42))
print(bool(""), bool("nein"))
print(bool([]), bool([0]))
print(bool(None))`, { aus: "False True\nFalse True\nFalse True\nFalse" }),
    P("Beachte `bool(\"nein\")`. Der Inhalt spielt keine Rolle, nur ob der Text leer ist. Und `bool([0])` ist wahr, weil die Liste ein Element enthaelt, auch wenn dieses Element null ist."),
    TIPP("Sauber pruefen",
      "Statt `if len(liste) > 0:` schreibt man in Python `if liste:`. Das ist kuerzer und gilt als die uebliche Form.",
    ),

    H2("None"),
    P("`None` ist ein eigener Wert und bedeutet: hier steht nichts. Es ist nicht null, nicht der leere Text und nicht `False`, auch wenn es sich als falsch verhaelt."),
    C(`ergebnis = None

print(ergebnis is None)
print(ergebnis == None)
print(type(None))`, { aus: "True\nTrue\n<class 'NoneType'>" }),
    P("Beide Pruefungen liefern hier dasselbe, aber `is None` ist die richtige Form und wird von jedem Pruefwerkzeug verlangt."),

    H2("is oder gleich"),
    P("`==` fragt: haben beide denselben **Wert**? `is` fragt: sind beide dasselbe **Objekt**?"),
    C(`a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a == b)
print(a is b)
print(a is c)`, { aus: "True\nFalse\nTrue" }),
    P("`a` und `b` haben denselben Inhalt, sind aber zwei getrennte Listen im Speicher. `c` ist nur ein zweiter Name fuer dieselbe Liste."),
    WARN("is nur fuer None, True und False",
      "Bei Zahlen und Text verhaelt sich `is` unvorhersehbar, weil Python kleine Werte intern wiederverwendet. `256 is 256` kann wahr sein, `257 is 257` falsch. Nutze `is` ausschliesslich fuer `None`, `True` und `False`.",
    ),

    H2("Wahrheitswerte sind Zahlen"),
    C(`print(True + True)
print(sum([True, False, True, True]))

treffer = [True, False, True, True, False]
print(f"Trefferquote: {sum(treffer) / len(treffer):.0%}")`,
      { aus: "2\n3\nTrefferquote: 60%" }),
    P("`True` ist intern die Eins, `False` die Null. Das ist kein Zufall, sondern ein bewusster Entwurf und ein sehr praktischer Weg, Treffer zu zaehlen. In der KI berechnest du die Genauigkeit eines Modells genau so."),
  ],
  quiz: [
    Q("Was ergibt `bool(\"False\")`?",
      ["False", "True", "Ein TypeError", "None"], 1,
      "Entscheidend ist nur, ob der Text leer ist. `\"False\"` enthaelt fuenf Zeichen, also wahr."),
    Q("Was ergibt `18 <= 25 <= 67`?",
      ["True", "False", "Ein SyntaxError", "25"], 0,
      "Python erlaubt verkettete Vergleiche. Beide Bedingungen treffen zu."),
    Q("Wann solltest du `is` statt `==` benutzen?",
      ["Immer, es ist schneller",
       "Bei Zahlen, weil es genauer vergleicht",
       "Nur bei None, True und False",
       "Nie, `is` ist veraltet"],
      2,
      "`is` prueft auf Identitaet, nicht auf Gleichheit. Fuer Werte ist das unzuverlaessig, fuer die drei Sonderwerte die richtige Form."),
    Q("Was gibt dieser Code aus?",
      ["True", "False", "Ein IndexError", "Nichts"], 1,
      "Bei `and` wird die rechte Seite uebersprungen, sobald die linke falsch ist. Deshalb entsteht kein Fehler.",
      `text = ""\nprint(len(text) > 0 and text[0] == "A")`),
    Q("Was ergibt `sum([True, True, False])`?",
      ["0", "1", "2", "Ein TypeError"], 2,
      "`True` zaehlt als 1, `False` als 0. Die Summe ist 2."),
    Q("Welche Pruefung entspricht der ueblichen Python-Schreibweise?",
      ["`if len(werte) > 0:`", "`if werte != []:`", "`if werte:`", "`if bool(werte) == True:`"], 2,
      "Eine leere Sammlung gilt als falsch. Die kurze Form ist die gebraeuchliche."),
  ],
  aufgaben: [
    {
      id: "a8-1",
      titel: "Eintrittspruefung",
      text: [P("Setze `darf_rein` auf einen Wahrheitswert. Eintritt bekommt, wer **mindestens 18** ist **und** entweder einen Ausweis dabei hat **oder** auf der Gaesteliste steht."),
             P("Schreibe die Bedingung als einen einzigen Ausdruck.")],
      start: `alter = 17
hat_ausweis = True
auf_liste = True

darf_rein = 

print(darf_rein)`,
      tipps: ["Die Altersbedingung ist mit `and` verknuepft.",
              "Ausweis oder Liste gehoeren in Klammern zusammen.",
              "`alter >= 18 and (hat_ausweis or auf_liste)`"],
      loesung: `alter = 17
hat_ausweis = True
auf_liste = True

darf_rein = alter >= 18 and (hat_ausweis or auf_liste)

print(darf_rein)`,
      tests: [
        T("Bei 17 Jahren wird abgelehnt", `assert darf_rein is False, f"Ergebnis war {darf_rein!r}"`),
        T("Mit 18 und Ausweis klappt es", `def pruef(a, aus, li):\n    return a >= 18 and (aus or li)\nassert pruef(18, True, False) is True`),
        T("Mit 18 ohne alles nicht", `def pruef(a, aus, li):\n    return a >= 18 and (aus or li)\nassert pruef(18, False, False) is False`),
        T("Die Klammern sitzen richtig", `assert "(" in QUELLE.split("darf_rein =")[1].split("\\n")[0], "Die Oder-Bedingung braucht Klammern"`),
      ],
    },
    {
      id: "a8-2",
      titel: "Trefferquote berechnen",
      text: [P("In `treffer` steht fuer jede Vorhersage, ob sie richtig war. Berechne die Quote und gib sie als Prozentwert mit einer Nachkommastelle aus."),
             P("Erwartete Ausgabe: `Genauigkeit: 62.5%`"),
             P("Nutze aus, dass `True` als Eins zaehlt.")],
      start: `treffer = [True, False, True, True, True, False, True, False]

quote = 

print(f"Genauigkeit: {quote:.1%}")`,
      tipps: ["`sum(treffer)` zaehlt die wahren Werte.",
              "`len(treffer)` gibt die Gesamtzahl.",
              "Die Quote ist der Anteil, also ein Wert zwischen 0 und 1."],
      loesung: `treffer = [True, False, True, True, True, False, True, False]

quote = sum(treffer) / len(treffer)

print(f"Genauigkeit: {quote:.1%}")`,
      tests: [
        T("Die Quote stimmt", `assert abs(quote - 0.625) < 1e-9, f"quote war {quote}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "Genauigkeit: 62.5%", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Es wurde gerechnet, nicht gezaehlt von Hand", `assert "sum(" in QUELLE and "len(" in QUELLE, "Nutze sum und len"`),
      ],
    },
  ],
});

M2.push({
  id: "l-bedingungen",
  titel: "Bedingungen mit if, elif und else",
  dauer: 18,
  vorspann: "Jetzt bekommt dein Programm die Faehigkeit, Wege zu waehlen. Damit ist der Sprung von einer Rechenmaschine zu echter Logik geschafft.",
  ziele: [
    "if, elif und else korrekt aufbauen",
    "Die Bedeutung der Einrueckung verstehen",
    "Bedingungen sinnvoll ordnen",
    "Bedingte Ausdruecke einsetzen",
  ],
  inhalt: [
    H2("Die Grundform"),
    C(`temperatur = 28

if temperatur > 25:
    print("Es ist warm.")
    print("Nimm etwas zu trinken mit.")

print("Diese Zeile laeuft immer.")`,
      { aus: "Es ist warm.\nNimm etwas zu trinken mit.\nDiese Zeile laeuft immer." }),
    P("Der Aufbau ist immer gleich: das Schluesselwort, die Bedingung, ein Doppelpunkt, und darunter der eingerueckte Block. Die Einrueckung bestimmt, was zum Block gehoert."),
    MERKE("Einrueckung ist Syntax",
      "In anderen Sprachen sind geschweifte Klammern entscheidend und Einrueckung nur Kosmetik. In Python ist die Einrueckung selbst die Struktur. Vier Leerzeichen, immer gleich, nie gemischt mit Tabulatoren.",
    ),

    H2("else und elif"),
    C(`punkte = 73

if punkte >= 90:
    note = "sehr gut"
elif punkte >= 75:
    note = "gut"
elif punkte >= 60:
    note = "befriedigend"
elif punkte >= 45:
    note = "ausreichend"
else:
    note = "nicht bestanden"

print(f"{punkte} Punkte: {note}")`, { aus: "73 Punkte: befriedigend" }),
    P("Python prueft von oben nach unten und nimmt den **ersten** zutreffenden Zweig. Danach ist Schluss, die restlichen Bedingungen werden gar nicht mehr angeschaut."),
    WARN("Die Reihenfolge entscheidet",
      "Steht `punkte >= 45` ganz oben, landet auch eine Punktzahl von 95 dort, weil die Bedingung zutrifft. Ordne immer von der engsten zur weitesten Bedingung.",
    ),
    P("So sieht der Fehler aus:"),
    C(`punkte = 95

if punkte >= 45:
    print("ausreichend")
elif punkte >= 90:
    print("sehr gut")`, { aus: "ausreichend" }),

    H2("Verschachtelung"),
    C(`alter = 20
mitglied = True

if alter >= 18:
    if mitglied:
        preis = 8
    else:
        preis = 12
else:
    preis = 5

print(f"Preis: {preis} Euro")`, { aus: "Preis: 8 Euro" }),
    P("Verschachtelung ist erlaubt, wird aber schnell unuebersichtlich. Oft laesst sie sich aufloesen:"),
    C(`alter = 20
mitglied = True

if alter < 18:
    preis = 5
elif mitglied:
    preis = 8
else:
    preis = 12

print(f"Preis: {preis} Euro")`, { aus: "Preis: 8 Euro" }),
    TIPP("Frueh aussteigen",
      "Behandle Sonderfaelle zuerst und beende dort. Der Hauptfall bleibt dann uneingerueckt und gut lesbar. Dieses Muster heisst *guard clause* und macht Funktionen deutlich klarer.",
    ),

    H2("Der bedingte Ausdruck"),
    P("Fuer einfache Faelle gibt es eine einzeilige Form:"),
    C(`alter = 20

status = "erwachsen" if alter >= 18 else "minderjaehrig"
print(status)

zahlen = [4, -7, 12, -3]
betraege = [z if z >= 0 else -z for z in zahlen]
print(betraege)`, { aus: "erwachsen\n[4, 7, 12, 3]" }),
    P("Die Reihenfolge ist ungewohnt: erst das Ergebnis, dann die Bedingung, dann die Alternative. Nutze das nur, wenn die Zeile kurz bleibt."),

    H2("pass"),
    P("Ein Block darf nie leer sein. Wenn du einen Platzhalter brauchst, nimm `pass`."),
    C(`wert = 5

if wert > 10:
    pass  # kommt spaeter
else:
    print("klein genug")`, { aus: "klein genug" }),

    H2("Ein groesseres Beispiel"),
    C(`def bewerte_modell(genauigkeit, dauer_sekunden):
    if genauigkeit < 0.5:
        return "unbrauchbar, kaum besser als raten"
    if genauigkeit >= 0.95 and dauer_sekunden < 60:
        return "ausgezeichnet"
    if genauigkeit >= 0.95:
        return "sehr genau, aber langsam"
    if genauigkeit >= 0.8:
        return "brauchbar"
    return "zu ungenau"

print(bewerte_modell(0.97, 30))
print(bewerte_modell(0.97, 900))
print(bewerte_modell(0.42, 10))`,
      { aus: "ausgezeichnet\nsehr genau, aber langsam\nunbrauchbar, kaum besser als raten" }),
    P("Hier siehst du das Muster mit fruehem Aussteigen in Reinform. Jeder Fall wird abgehandelt und verlassen, es gibt keine Verschachtelung und keine langen elif-Ketten."),
  ],
  quiz: [
    Q("Was gibt dieser Code aus?",
      ["gross", "mittel", "klein", "gross und mittel"], 1,
      "Python nimmt den ersten zutreffenden Zweig. 50 ist nicht groesser als 100, aber groesser als 10.",
      `wert = 50\nif wert > 100:\n    print("gross")\nelif wert > 10:\n    print("mittel")\nelse:\n    print("klein")`),
    Q("Was ist an dieser Reihenfolge falsch?",
      ["Nichts, sie ist richtig",
       "Die erste Bedingung ist zu weit gefasst und faengt alles ab",
       "elif darf nicht nach if stehen",
       "Es fehlt ein else"],
      1,
      "Jede Punktzahl ab 45 landet im ersten Zweig, auch eine sehr hohe. Ordne von der engsten zur weitesten Bedingung.",
      `if punkte >= 45:\n    print("ausreichend")\nelif punkte >= 90:\n    print("sehr gut")`),
    Q("Was schreibst du in einen Block, der noch leer bleiben soll?",
      ["`null`", "`pass`", "`skip`", "nichts, leer ist erlaubt"], 1,
      "`pass` ist die ausdrueckliche Anweisung, nichts zu tun. Ein wirklich leerer Block gibt einen `IndentationError`."),
    Q("Was steht nach diesem Code in `x`?",
      ["`\"a\"`", "`\"b\"`", "`True`", "Ein SyntaxError"], 1,
      "Der bedingte Ausdruck liefert den Wert vor `if`, wenn die Bedingung zutrifft, sonst den nach `else`. 3 ist nicht groesser als 5.",
      `x = "a" if 3 > 5 else "b"`),
    Q("Warum ist die Einrueckung in Python besonders wichtig?",
      ["Sie ist reine Kosmetik",
       "Sie bestimmt, welche Zeilen zu einem Block gehoeren",
       "Sie beschleunigt das Programm",
       "Sie wird nur bei Funktionen gebraucht"],
      1,
      "Python hat keine geschweiften Klammern. Die Einrueckung ist die Struktur des Programms."),
  ],
  aufgaben: [
    {
      id: "a9-1",
      titel: "Schulnote bestimmen",
      text: [P("Setze `note` anhand der Punktzahl:"),
             L("ab 90 Punkte: `1`", "ab 80: `2`", "ab 65: `3`", "ab 50: `4`", "darunter: `5`"),
             P("Gib danach `Punkte: 84 -> Note 2` aus.")],
      start: `punkte = 84

note = 

print(f"Punkte: {punkte} -> Note {note}")`,
      tipps: ["Beginne mit der hoechsten Schwelle.",
              "Nutze `if`, mehrere `elif` und ein abschliessendes `else`.",
              "Die Note ist eine Zahl, keine Zeichenkette."],
      loesung: `punkte = 84

if punkte >= 90:
    note = 1
elif punkte >= 80:
    note = 2
elif punkte >= 65:
    note = 3
elif punkte >= 50:
    note = 4
else:
    note = 5

print(f"Punkte: {punkte} -> Note {note}")`,
      tests: [
        T("Bei 84 Punkten ist es Note 2", `assert note == 2, f"note war {note!r}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "Punkte: 84 -> Note 2", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Die Grenzen stimmen auch sonst", `def f(p):\n    if p >= 90: return 1\n    if p >= 80: return 2\n    if p >= 65: return 3\n    if p >= 50: return 4\n    return 5\nassert [f(x) for x in (95, 90, 89, 80, 65, 50, 49)] == [1,1,2,2,3,4,5]`),
        T("Es wurde elif benutzt", `assert "elif" in QUELLE, "Nutze elif statt mehrerer getrennter if-Bloecke"`),
      ],
    },
    {
      id: "a9-2",
      titel: "Schaltjahr erkennen",
      text: [P("Ein Jahr ist ein Schaltjahr, wenn es durch 4 teilbar ist, **ausser** es ist durch 100 teilbar, **es sei denn** es ist auch durch 400 teilbar."),
             P("Setze `ist_schaltjahr` auf einen Wahrheitswert und gib ihn aus."),
             P("Zur Kontrolle: 2000 ist eines, 1900 nicht, 2024 schon.")],
      start: `jahr = 2000

ist_schaltjahr = 

print(ist_schaltjahr)`,
      tipps: ["Die Regel besteht aus drei Teilen, die du mit `and` und `or` verbindest.",
              "Durch 400 teilbar reicht allein schon aus.",
              "`(jahr % 4 == 0 and jahr % 100 != 0) or jahr % 400 == 0`"],
      loesung: `jahr = 2000

ist_schaltjahr = (jahr % 4 == 0 and jahr % 100 != 0) or jahr % 400 == 0

print(ist_schaltjahr)`,
      tests: [
        T("2000 ist ein Schaltjahr", `assert ist_schaltjahr is True, f"Ergebnis war {ist_schaltjahr!r}"`),
        T("Die Regel gilt allgemein", `def s(j):\n    return (j % 4 == 0 and j % 100 != 0) or j % 400 == 0\nassert [s(j) for j in (2000, 1900, 2024, 2023, 2100)] == [True, False, True, False, False]`),
        T("Alle drei Teile der Regel kommen vor", `assert "400" in QUELLE and "100" in QUELLE and "% 4" in QUELLE, "Die Regel braucht alle drei Teiler"`),
      ],
    },
  ],
});

M2.push({
  id: "l-while",
  titel: "Die while-Schleife",
  dauer: 15,
  vorspann: "Wiederholung ist der zweite grosse Baustein nach der Entscheidung. Die while-Schleife laeuft, solange eine Bedingung wahr bleibt.",
  ziele: [
    "while-Schleifen aufbauen und beenden",
    "Endlosschleifen erkennen und vermeiden",
    "break und continue gezielt einsetzen",
    "Wissen, wann while die richtige Wahl ist",
  ],
  inhalt: [
    H2("Die Grundform"),
    C(`zaehler = 1

while zaehler <= 5:
    print(f"Durchlauf {zaehler}")
    zaehler += 1

print("fertig")`,
      { aus: "Durchlauf 1\nDurchlauf 2\nDurchlauf 3\nDurchlauf 4\nDurchlauf 5\nfertig" }),
    P("Vor jedem Durchlauf wird die Bedingung geprueft. Ist sie falsch, geht es nach der Schleife weiter. Drei Dinge gehoeren immer zusammen:"),
    NR(
      "Eine Startbedingung vor der Schleife",
      "Eine Bedingung, die irgendwann falsch wird",
      "Eine Aenderung im Schleifenkoerper, die darauf hinarbeitet",
    ),
    WARN("Die haeufigste Falle",
      "Fehlt Punkt drei, laeuft die Schleife ewig. Vergisst du `zaehler += 1`, bleibt die Bedingung fuer immer wahr und dein Programm haengt. In diesem Kurs greift nach einigen Sekunden eine Notbremse, im Terminal brichst du mit Strg und C ab.",
    ),

    H2("Eingaben pruefen"),
    P("Der klassische Einsatz: so lange fragen, bis die Antwort passt."),
    C(`versuch = ""

while versuch != "python":
    versuch = input("Passwort: ").lower()

print("Zugang gewaehrt.")`,
      { eingaben: ["hallo", "test", "Python"],
        aus: "Passwort: hallo\nPasswort: test\nPasswort: Python\nZugang gewaehrt." }),

    H2("break und continue"),
    P("`break` verlaesst die Schleife sofort. `continue` springt zum naechsten Durchlauf."),
    C(`zahl = 0

while True:
    zahl += 1
    if zahl > 10:
        break
    if zahl % 2 == 0:
        continue
    print(zahl, end=" ")

print()
print("Schleife beendet")`, { aus: "1 3 5 7 9 \nSchleife beendet" }),
    P("`while True` mit einem `break` im Inneren ist ein voellig uebliches Muster, wenn die Abbruchbedingung erst mitten im Durchlauf feststeht."),
    TIPP("Lesbarkeit",
      "Mehr als ein oder zwei `break` in einer Schleife sind ein Zeichen dafuer, dass die Logik in eine eigene Funktion gehoert. Dort ersetzt `return` das `break` und macht die Absicht klarer.",
    ),

    H2("Der else-Zweig"),
    P("Eine Besonderheit von Python: Schleifen duerfen ein `else` haben. Es laeuft genau dann, wenn die Schleife **nicht** durch `break` beendet wurde."),
    C(`zahl = 29
teiler = 2

while teiler * teiler <= zahl:
    if zahl % teiler == 0:
        print(f"{zahl} ist teilbar durch {teiler}")
        break
    teiler += 1
else:
    print(f"{zahl} ist eine Primzahl")`, { aus: "29 ist eine Primzahl" }),
    P("Das liest sich anfangs merkwuerdig, ist aber genau das richtige Werkzeug fuer Suchschleifen: wurde nichts gefunden, laeuft `else`."),

    H2("Annaeherung statt fester Anzahl"),
    P("Ein Beispiel aus der Numerik, das dem Gradientenabstieg in der KI sehr aehnelt. Wir suchen die Wurzel aus 2, ohne `sqrt` zu benutzen:"),
    C(`ziel = 2
schaetzung = 1.0
schritt = 0

while abs(schaetzung * schaetzung - ziel) > 1e-10:
    schaetzung = (schaetzung + ziel / schaetzung) / 2
    schritt += 1

print(f"Nach {schritt} Schritten: {schaetzung}")
print(f"Zum Vergleich:          {2 ** 0.5}")`,
      { aus: "Nach 4 Schritten: 1.4142135623746899\nZum Vergleich:          1.4142135623730951" }),
    P("Hier kennst du die Anzahl der Durchlaeufe vorher nicht. Genau dafuer ist `while` gemacht. Steht die Anzahl dagegen fest, nimmst du die for-Schleife aus der naechsten Lektion."),
    MERKE("Die Entscheidungshilfe",
      "Weisst du vorher, wie oft es laufen soll oder hast du eine Sammlung zum Durchgehen? Dann `for`. Haengt das Ende von einer Bedingung ab, die sich erst waehrenddessen ergibt? Dann `while`.",
    ),
  ],
  quiz: [
    Q("Wie oft laeuft dieser Schleifenkoerper?",
      ["3 mal", "4 mal", "5 mal", "unendlich oft"], 1,
      "Die Werte 0, 1, 2 und 3 erfuellen die Bedingung. Bei 4 ist Schluss.",
      `i = 0\nwhile i < 4:\n    print(i)\n    i += 1`),
    Q("Was passiert, wenn `i += 1` in dieser Schleife fehlt?",
      ["Die Schleife laeuft genau einmal",
       "Die Schleife laeuft unendlich",
       "Es gibt einen SyntaxError",
       "Die Schleife wird uebersprungen"],
      1,
      "Ohne Veraenderung bleibt die Bedingung fuer immer wahr. Das ist eine Endlosschleife."),
    Q("Was macht `continue`?",
      ["Beendet die Schleife",
       "Springt zum naechsten Durchlauf",
       "Wiederholt den aktuellen Durchlauf",
       "Beendet das Programm"],
      1,
      "`continue` ueberspringt den Rest des Koerpers und geht direkt zur naechsten Pruefung der Bedingung."),
    Q("Wann laeuft der else-Zweig einer while-Schleife?",
      ["Immer nach der Schleife",
       "Nur wenn die Schleife nie lief",
       "Nur wenn die Schleife ohne break endete",
       "Nur bei einem Fehler"],
      2,
      "Der else-Zweig ist der Normalausgang. Ein `break` ueberspringt ihn."),
    Q("Was gibt dieser Code aus?",
      ["1 2 3 4 5", "1 2", "1 2 3", "nichts"], 1,
      "Bei 3 greift das `break`, vorher wurden 1 und 2 ausgegeben.",
      `i = 1\nwhile i <= 5:\n    if i == 3:\n        break\n    print(i, end=" ")\n    i += 1`),
  ],
  aufgaben: [
    {
      id: "a10-1",
      titel: "Countdown",
      text: [P("Gib mit einer while-Schleife die Zahlen von 10 bis 1 aus, jede in einer eigenen Zeile, gefolgt von der Zeile `Start`.")],
      start: `zahl = 10

# Schleife hier

print("Start")`,
      tipps: ["Die Bedingung lautet `zahl >= 1`.",
              "Im Koerper gibst du aus und ziehst eins ab.",
              "`zahl -= 1` ist die Kurzform."],
      loesung: `zahl = 10

while zahl >= 1:
    print(zahl)
    zahl -= 1

print("Start")`,
      tests: [
        T("Es sind elf Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 11, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die Zaehlrichtung stimmt", `zeilen = [z.strip() for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[:10] == [str(n) for n in range(10, 0, -1)], f"Anfang war: {zeilen[:3]}"`),
        T("Am Ende steht Start", `assert AUSGABE.strip().endswith("Start"), "Die letzte Zeile fehlt"`),
        T("Es wurde while benutzt", `assert "while" in QUELLE and "for " not in QUELLE, "Nutze eine while-Schleife"`),
      ],
    },
    {
      id: "a10-2",
      titel: "Collatz-Folge",
      text: [P("Die Collatz-Folge ist eine der beruehmtesten offenen Fragen der Mathematik. Die Regel: ist die Zahl gerade, halbiere sie. Ist sie ungerade, verdreifache sie und addiere eins. Wiederhole, bis du bei 1 bist."),
             P("Zaehle in `schritte`, wie viele Schritte es von 27 aus bis zur 1 sind, und gib die Zahl aus."),
             P("Die Ausgabe lautet `111 Schritte`.")],
      start: `zahl = 27
schritte = 0

# Schleife hier

print(f"{schritte} Schritte")`,
      tipps: ["Die Schleife laeuft, solange `zahl != 1`.",
              "`zahl % 2 == 0` prueft, ob die Zahl gerade ist.",
              "Bei geraden Zahlen nimm `zahl // 2`, damit es eine Ganzzahl bleibt."],
      loesung: `zahl = 27
schritte = 0

while zahl != 1:
    if zahl % 2 == 0:
        zahl = zahl // 2
    else:
        zahl = zahl * 3 + 1
    schritte += 1

print(f"{schritte} Schritte")`,
      tests: [
        T("Die Schrittzahl stimmt", `assert schritte == 111, f"schritte war {schritte}"`),
        T("Die Zahl endet bei 1", `assert zahl == 1, f"zahl war {zahl}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "111 Schritte", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Die Regel ist allgemein umgesetzt", `def c(n):\n    s = 0\n    while n != 1:\n        n = n // 2 if n % 2 == 0 else n * 3 + 1\n        s += 1\n    return s\nassert c(6) == 8 and c(1) == 0`),
      ],
    },
  ],
});

M2.push({
  id: "l-for",
  titel: "Die for-Schleife und range",
  dauer: 18,
  vorspann: "Die for-Schleife ist die meistgenutzte Schleife in Python. Sie geht nicht ueber Zahlen, sondern ueber die Elemente einer Sammlung. Dieser Unterschied ist wichtig.",
  ziele: [
    "for-Schleifen ueber Sammlungen schreiben",
    "range in allen drei Formen nutzen",
    "enumerate und zip einsetzen",
    "Verschachtelte Schleifen aufbauen",
  ],
  inhalt: [
    H2("Ueber Elemente laufen"),
    C(`sprachen = ["Python", "Rust", "Julia"]

for sprache in sprachen:
    print(f"Ich lerne {sprache}.")`,
      { aus: "Ich lerne Python.\nIch lerne Rust.\nIch lerne Julia." }),
    P("In vielen Sprachen musst du einen Zaehler fuehren und ueber Positionen zugreifen. Python gibt dir direkt die Elemente. Das ist kuerzer und kann nicht am Rand danebengreifen."),
    P("Das funktioniert mit allem, was sich durchlaufen laesst, auch mit Text:"),
    C(`for zeichen in "Hallo":
    print(zeichen, end="-")
print()`, { aus: "H-a-l-l-o-" }),

    H2("range"),
    P("Brauchst du doch Zahlen, liefert `range` sie. Es gibt drei Formen:"),
    C(`for i in range(5):
    print(i, end=" ")
print()

for i in range(2, 6):
    print(i, end=" ")
print()

for i in range(0, 20, 5):
    print(i, end=" ")
print()

for i in range(5, 0, -1):
    print(i, end=" ")
print()`, { aus: "0 1 2 3 4 \n2 3 4 5 \n0 5 10 15 \n5 4 3 2 1 " }),
    TAB(["Aufruf", "Ergebnis", "Bedeutung"],
      ["`range(5)`", "0 1 2 3 4", "von 0 bis unter 5"],
      ["`range(2, 6)`", "2 3 4 5", "von 2 bis unter 6"],
      ["`range(0, 20, 5)`", "0 5 10 15", "in Fuenferschritten"],
      ["`range(5, 0, -1)`", "5 4 3 2 1", "rueckwaerts"],
    ),
    WARN("Das Ende gehoert nie dazu",
      "`range(5)` endet bei 4. Das wirkt anfangs stoerend, passt aber genau zu den Positionen einer Sammlung mit fuenf Elementen: 0 bis 4.",
    ),

    H2("Index und Element zugleich"),
    P("Brauchst du beides, nimm `enumerate` statt eines eigenen Zaehlers."),
    C(`modelle = ["Perzeptron", "Entscheidungsbaum", "Neuronales Netz"]

for nummer, name in enumerate(modelle, start=1):
    print(f"{nummer}. {name}")`,
      { aus: "1. Perzeptron\n2. Entscheidungsbaum\n3. Neuronales Netz" }),
    P("Ohne `start` beginnt die Zaehlung bei null. Der Weg ueber `range(len(...))` und `liste[i]` funktioniert zwar auch, gilt in Python aber als unsauber."),

    H2("Zwei Sammlungen parallel"),
    C(`namen = ["Ada", "Grace", "Alan"]
jahre = [1815, 1906, 1912]

for name, jahr in zip(namen, jahre):
    print(f"{name:<8}{jahr}")`,
      { aus: "Ada     1815\nGrace   1906\nAlan    1912" }),
    P("`zip` verzahnt zwei oder mehr Sammlungen. Es hoert auf, sobald die kuerzeste erschoepft ist."),

    H2("Summen und Zaehler"),
    C(`werte = [12, 7, 23, 4, 18]

summe = 0
groesster = werte[0]

for wert in werte:
    summe += wert
    if wert > groesster:
        groesster = wert

print(f"Summe: {summe}, Groesster: {groesster}, Schnitt: {summe / len(werte):.1f}")`,
      { aus: "Summe: 64, Groesster: 23, Schnitt: 12.8" }),
    P("Fuer genau diese drei Faelle gibt es fertige Funktionen. Nutze sie, wenn es passt:"),
    C(`werte = [12, 7, 23, 4, 18]

print(sum(werte), max(werte), min(werte), len(werte))
print(f"{sum(werte) / len(werte):.1f}")`, { aus: "64 23 4 5\n12.8" }),

    H2("Verschachtelte Schleifen"),
    C(`for zeile in range(1, 4):
    for spalte in range(1, 4):
        print(f"{zeile * spalte:4}", end="")
    print()`,
      { aus: "   1   2   3\n   2   4   6\n   3   6   9" }),
    P("Die innere Schleife laeuft fuer jeden Durchlauf der aeusseren komplett durch. Bei drei mal drei sind das neun Durchlaeufe. Achte darauf: bei tausend mal tausend sind es eine Million, das merkst du."),

    H2("break, continue und else"),
    C(`zahlen = [4, 9, 16, 23, 25]

for z in zahlen:
    if z % 2 == 1 and z > 20:
        print(f"Gefunden: {z}")
        break
else:
    print("Nichts gefunden")`, { aus: "Gefunden: 23" }),
    TIPP("Die Sammlung nicht waehrend der Schleife veraendern",
      "Elemente aus einer Liste zu entfernen, waehrend du darueber laeufst, fuehrt zu uebersprungenen Eintraegen. Baue stattdessen eine neue Liste auf oder laufe ueber eine Kopie mit `liste[:]`.",
    ),
    C(`zahlen = [1, 2, 3, 4, 5, 6]

# falsch: Elemente werden uebersprungen
kopie = zahlen[:]
for z in kopie:
    if z % 2 == 0:
        zahlen.remove(z)

print(zahlen)`, { aus: "[1, 3, 5]" }),
  ],
  quiz: [
    Q("Welche Zahlen gibt `range(3)` aus?",
      ["1 2 3", "0 1 2", "0 1 2 3", "3"], 1,
      "`range` beginnt bei null und endet vor der angegebenen Zahl."),
    Q("Was gibt dieser Code aus?",
      ["10 8 6 4 2", "10 8 6 4 2 0", "2 4 6 8 10", "nichts"], 0,
      "Start 10, Ende vor 1, Schrittweite minus zwei. Also 10, 8, 6, 4, 2.",
      `for i in range(10, 1, -2):\n    print(i, end=" ")`),
    Q("Wofuer ist `enumerate` da?",
      ["Es zaehlt die Elemente einer Liste",
       "Es liefert Position und Element zugleich",
       "Es sortiert eine Liste",
       "Es wandelt eine Liste in Zahlen um"],
      1,
      "`enumerate` gibt bei jedem Durchlauf ein Paar aus Position und Element zurueck."),
    Q("Was passiert bei `zip` mit unterschiedlich langen Listen?",
      ["Ein Fehler", "Die fehlenden Werte werden zu None",
       "Es endet, sobald die kuerzeste Liste zu Ende ist", "Die laengere Liste wird abgeschnitten und ein Fehler gemeldet"],
      2,
      "`zip` richtet sich nach der kuerzesten Sammlung. Ueberzaehlige Elemente werden verworfen."),
    Q("Wie oft laeuft der innere Block insgesamt?",
      ["4 mal", "7 mal", "12 mal", "3 mal"], 2,
      "Die aeussere Schleife laeuft dreimal, die innere jeweils viermal. Drei mal vier ergibt zwoelf.",
      `for a in range(3):\n    for b in range(4):\n        print(a, b)`),
    Q("Welche Schreibweise gilt in Python als sauber?",
      ["`for i in range(len(liste)): print(liste[i])`",
       "`for element in liste: print(element)`",
       "`i = 0\\nwhile i < len(liste): ...`",
       "Alle drei sind gleich gut"],
      1,
      "Die for-Schleife ueber die Elemente ist kuerzer, sicherer und die uebliche Form."),
  ],
  aufgaben: [
    {
      id: "a11-1",
      titel: "Einmaleins-Reihe",
      text: [P("Gib die Siebenerreihe von 1 bis 10 aus, eine Zeile pro Produkt, in dieser Form:"),
             ROH("7 x 1 = 7\n7 x 2 = 14\n...\n7 x 10 = 70")],
      start: `faktor = 7

for i in range():
    print()`,
      tipps: ["`range(1, 11)` laeuft von 1 bis 10.",
              "Nutze einen f-String fuer die Zeile.",
              "`f\"{faktor} x {i} = {faktor * i}\"`"],
      loesung: `faktor = 7

for i in range(1, 11):
    print(f"{faktor} x {i} = {faktor * i}")`,
      tests: [
        T("Es sind zehn Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 10, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die erste Zeile stimmt", `zeilen = [z.strip() for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[0] == "7 x 1 = 7", f"Erste Zeile: {zeilen[0]!r}"`),
        T("Die letzte Zeile stimmt", `zeilen = [z.strip() for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[-1] == "7 x 10 = 70", f"Letzte Zeile: {zeilen[-1]!r}"`),
        T("Es wurde gerechnet", `assert "faktor * i" in QUELLE.replace(" ", "").replace("faktor*i", "faktor * i") or "*" in QUELLE, "Berechne das Produkt"`),
      ],
    },
    {
      id: "a11-2",
      titel: "Fizz Buzz",
      text: [P("Der Klassiker aus Bewerbungsgespraechen. Gib die Zahlen von 1 bis 20 aus, aber:"),
             L("Ist die Zahl durch 3 teilbar, gib `Fizz` aus.",
               "Ist sie durch 5 teilbar, gib `Buzz` aus.",
               "Ist sie durch beide teilbar, gib `FizzBuzz` aus.",
               "Sonst die Zahl selbst.")],
      start: `for i in range(1, 21):
    pass
`,
      tipps: ["Pruefe den Fall mit beiden Teilern **zuerst**, sonst wird er nie erreicht.",
              "Durch beide teilbar heisst: durch 15 teilbar.",
              "Nutze `if`, `elif` und `else` in dieser Reihenfolge."],
      loesung: `for i in range(1, 21):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
      loesungstext: "Die Reihenfolge ist der ganze Trick. Steht die Dreierpruefung oben, wird 15 als Fizz ausgegeben und FizzBuzz erscheint nie.",
      tests: [
        T("Es sind zwanzig Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 20, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die Ausgabe stimmt komplett", `erwartet = []\nfor i in range(1, 21):\n    if i % 15 == 0: erwartet.append("FizzBuzz")\n    elif i % 3 == 0: erwartet.append("Fizz")\n    elif i % 5 == 0: erwartet.append("Buzz")\n    else: erwartet.append(str(i))\nist = [z.strip() for z in AUSGABE.split("\\n") if z.strip()]\nassert ist == erwartet, f"Erste Abweichung bei Zeile {next((i+1 for i,(a,b) in enumerate(zip(ist,erwartet)) if a!=b), '?')}"`),
        T("FizzBuzz kommt bei 15 vor", `ist = [z.strip() for z in AUSGABE.split("\\n") if z.strip()]\nassert ist[14] == "FizzBuzz", f"Zeile 15 war: {ist[14]!r}"`),
      ],
    },
    {
      id: "a11-3",
      titel: "Groessten Wert selbst finden",
      text: [P("Finde ohne `max()` den groessten Wert in `werte` und seine Position. Gib aus:"),
             ROH("Groesster Wert: 42 an Position 3")],
      start: `werte = [12, 7, 23, 42, 18, 5]

groesster = werte[0]
position = 0

# Schleife hier

print(f"Groesster Wert: {groesster} an Position {position}")`,
      tipps: ["Nutze `enumerate`, um Position und Wert zugleich zu bekommen.",
              "Vergleiche jeden Wert mit dem bisher groessten.",
              "Merke dir beide Angaben, wenn du einen groesseren findest."],
      loesung: `werte = [12, 7, 23, 42, 18, 5]

groesster = werte[0]
position = 0

for i, wert in enumerate(werte):
    if wert > groesster:
        groesster = wert
        position = i

print(f"Groesster Wert: {groesster} an Position {position}")`,
      tests: [
        T("Der groesste Wert stimmt", `assert groesster == 42, f"groesster war {groesster}"`),
        T("Die Position stimmt", `assert position == 3, f"position war {position}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "Groesster Wert: 42 an Position 3", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("max wurde nicht benutzt", `assert "max(" not in QUELLE, "Finde den groessten Wert mit einer Schleife"`),
      ],
    },
  ],
});

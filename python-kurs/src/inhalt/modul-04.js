const M4 = modul({
  id: "m4", nr: 4, ikon: "werkzeug",
  titel: "Funktionen und Struktur",
  kurz: "Eigene Bausteine schreiben, Fehler abfangen, Code auf Dateien verteilen.",
});

M4.push({
  id: "l-funktionen",
  titel: "Funktionen schreiben",
  dauer: 18,
  vorspann: "Eine Funktion gibt einem Stueck Arbeit einen Namen. Ab hier hoerst du auf, Skripte zu tippen, und faengst an, Programme zu bauen.",
  ziele: [
    "Funktionen definieren und aufrufen",
    "Den Unterschied zwischen return und print verstehen",
    "Aussagekraeftige Dokumentation schreiben",
    "Wissen, wann etwas eine eigene Funktion verdient",
  ],
  inhalt: [
    H2("Definieren und aufrufen"),
    C(`def begruesse(name):
    return f"Hallo {name}."

print(begruesse("Ada"))
print(begruesse("Grace"))

gruss = begruesse("Alan")
print(gruss)`, { aus: "Hallo Ada.\nHallo Grace.\nHallo Alan." }),
    P("Der Aufbau: das Schluesselwort `def`, ein Name, die Parameter in Klammern, ein Doppelpunkt, dann der eingerueckte Koerper. Die Definition allein tut nichts, erst der Aufruf fuehrt sie aus."),
    P("Eine Funktion darf beliebig viele oder gar keine Parameter haben:"),
    C(`import random

def wuerfeln():
    return random.randint(1, 6)

def summe(a, b, c):
    return a + b + c

print(summe(1, 2, 3))
print(1 <= wuerfeln() <= 6)`, { aus: "6\nTrue" }),

    H2("return oder print"),
    P("Das ist der wichtigste Unterschied dieser Lektion. `print` zeigt etwas an. `return` gibt einen Wert an den Aufrufer zurueck. Nur mit `return` laesst sich weiterrechnen."),
    C(`def quadrat_zeigen(x):
    print(x ** 2)

def quadrat_geben(x):
    return x ** 2

a = quadrat_zeigen(4)
b = quadrat_geben(4)

print("a ist", a)
print("b ist", b)
print("weiterrechnen:", b + 10)`,
      { aus: "16\na ist None\nb ist 16\nweiterrechnen: 26" }),
    WARN("Ohne return kommt None",
      "Jede Funktion gibt etwas zurueck. Fehlt `return`, ist es `None`. Der Ausdruck `a + 10` bricht dann mit einem `TypeError` ab, obwohl die Funktion auf den ersten Blick funktioniert hat.",
    ),
    MERKE("Die Regel",
      "Funktionen, die etwas berechnen, geben zurueck. Funktionen, die etwas anzeigen, drucken. Mische beides nicht, sonst kannst du die Berechnung nicht wiederverwenden.",
    ),

    H2("return beendet sofort"),
    C(`def klassifiziere(wert):
    if wert < 0:
        return "negativ"
    if wert == 0:
        return "null"
    return "positiv"

for w in (-5, 0, 7):
    print(w, "ist", klassifiziere(w))`,
      { aus: "-5 ist negativ\n0 ist null\n7 ist positiv" }),
    P("Sobald `return` erreicht wird, endet die Funktion. Alles danach laeuft nicht mehr. Deshalb braucht es hier kein `elif` und kein `else`."),

    H2("Dokumentation"),
    P("Direkt unter der Definition steht ein Text in dreifachen Anfuehrungszeichen. Python speichert ihn und macht ihn abrufbar."),
    C(`def flaeche_kreis(radius):
    """Berechnet die Flaeche eines Kreises.

    radius: Radius in Metern, muss positiv sein.
    Gibt die Flaeche in Quadratmetern zurueck.
    """
    import math
    return math.pi * radius ** 2

print(f"{flaeche_kreis(2):.2f}")
print(flaeche_kreis.__doc__.split("\\n")[0])`,
      { aus: "12.57\nBerechnet die Flaeche eines Kreises." }),
    P("Mit `help(flaeche_kreis)` zeigt Python diese Beschreibung im Terminal an. Jede Funktion der Standardbibliothek hat so einen Text, und deine sollten ihn auch haben, sobald sie nicht mehr selbsterklaerend sind."),

    H2("Wofuer Funktionen gut sind"),
    P("Schau dir diesen Code an. Er funktioniert, aber er ist schwer zu aendern:"),
    C(`werte_a = [12, 7, 23, 4]
summe_a = 0
for w in werte_a:
    summe_a += w
schnitt_a = summe_a / len(werte_a)
print(f"A: {schnitt_a:.1f}")

werte_b = [8, 15, 3]
summe_b = 0
for w in werte_b:
    summe_b += w
schnitt_b = summe_b / len(werte_b)
print(f"B: {schnitt_b:.1f}")`, { aus: "A: 11.5\nB: 8.7" }),
    P("Dieselbe Arbeit mit einer Funktion:"),
    C(`def durchschnitt(werte):
    """Gibt den Mittelwert zurueck, oder 0.0 bei leerer Eingabe."""
    if not werte:
        return 0.0
    return sum(werte) / len(werte)

print(f"A: {durchschnitt([12, 7, 23, 4]):.1f}")
print(f"B: {durchschnitt([8, 15, 3]):.1f}")
print(f"Leer: {durchschnitt([]):.1f}")`, { aus: "A: 11.5\nB: 8.7\nLeer: 0.0" }),
    P("Der Gewinn ist nicht nur weniger Tipparbeit. Der Sonderfall der leeren Liste ist jetzt an **einer** Stelle geloest statt an keiner. Und wenn sich die Berechnung aendert, aenderst du sie einmal."),
    TIPP("Wann eine eigene Funktion",
      "Sobald du denselben Ablauf zum zweiten Mal schreibst. Sobald ein Abschnitt einen Namen verdient. Sobald eine Funktion nicht mehr auf einen Bildschirm passt. Eine gute Funktion tut genau eine Sache und heisst nach dieser Sache.",
    ),

    H2("Funktionen rufen Funktionen"),
    C(`def ist_gerade(n):
    return n % 2 == 0

def gerade_filtern(zahlen):
    return [z for z in zahlen if ist_gerade(z)]

def beschreibe(zahlen):
    gerade = gerade_filtern(zahlen)
    return f"{len(gerade)} von {len(zahlen)} Zahlen sind gerade"

print(beschreibe([1, 2, 3, 4, 5, 6, 7, 8]))`,
      { aus: "4 von 8 Zahlen sind gerade" }),
    P("So sieht gut aufgebauter Code aus: kleine Funktionen mit klaren Namen, die aufeinander aufbauen. Jede laesst sich einzeln pruefen und verstehen."),

    H2("Rekursion"),
    P("Eine Funktion darf sich selbst aufrufen. Das braucht immer zwei Teile: einen Fall, der ohne weiteren Aufruf endet, und einen Schritt, der sich dem naehert."),
    C(`def fakultaet(n):
    if n <= 1:
        return 1
    return n * fakultaet(n - 1)

print(fakultaet(5))
print(fakultaet(10))`, { aus: "120\n3628800" }),
    WARN("Ohne Abbruch kein Ende",
      "Fehlt der Abbruchfall, ruft sich die Funktion endlos auf, bis Python mit einem `RecursionError` abbricht. Die Grenze liegt bei etwa tausend Ebenen.",
    ),
    P("Rekursion ist elegant, aber in Python meist langsamer als eine Schleife. Setze sie ein, wo das Problem selbst rekursiv ist, etwa bei Baumstrukturen oder verschachtelten Verzeichnissen."),
  ],
  quiz: [
    Q("Was gibt eine Funktion ohne `return` zurueck?",
      ["`0`", "`None`", "Eine leere Zeichenkette", "Nichts, der Aufruf schlaegt fehl"], 1,
      "Fehlt `return`, liefert die Funktion `None`. Das ist die haeufigste Ursache fuer unerwartete Fehler beim Weiterrechnen."),
    Q("Was gibt dieser Code aus?",
      ["`16`", "`None`", "`16` und dann `None`", "Ein TypeError"], 2,
      "Die Funktion druckt 16 und gibt None zurueck. Danach wird dieses None ausgegeben.",
      `def f(x):\n    print(x ** 2)\n\nergebnis = f(4)\nprint(ergebnis)`),
    Q("Was passiert nach einem `return` im Funktionskoerper?",
      ["Die naechste Zeile laeuft noch", "Die Funktion endet sofort",
       "Es kommt zu einem Fehler", "Der Rueckgabewert wird ueberschrieben"], 1,
      "`return` beendet die Funktion. Nachfolgende Zeilen werden nicht mehr ausgefuehrt."),
    Q("Was braucht jede rekursive Funktion zwingend?",
      ["Mindestens zwei Parameter", "Einen Abbruchfall ohne weiteren Selbstaufruf",
       "Eine Schleife", "Einen globalen Zaehler"], 1,
      "Ohne Abbruchfall laeuft die Rekursion bis zum `RecursionError`."),
    Q("Wofuer steht der Text in dreifachen Anfuehrungszeichen direkt unter `def`?",
      ["Er ist ein Kommentar und wird ignoriert",
       "Er ist die Dokumentation und ueber `__doc__` und `help()` abrufbar",
       "Er legt den Rueckgabetyp fest",
       "Er wird beim Aufruf ausgegeben"],
      1,
      "Python speichert diesen Text am Funktionsobjekt. Werkzeuge und `help()` lesen ihn aus."),
  ],
  aufgaben: [
    {
      id: "a18-1",
      titel: "Funktion mit Rueckgabe",
      text: [P("Schreibe `celsius_nach_fahrenheit(grad)`, die den umgerechneten Wert **zurueckgibt**, nicht ausgibt."),
             P("Die Formel lautet: Fahrenheit ist Celsius mal 9 geteilt durch 5 plus 32.")],
      start: `def celsius_nach_fahrenheit(grad):
    pass

print(celsius_nach_fahrenheit(0))
print(celsius_nach_fahrenheit(100))
print(celsius_nach_fahrenheit(21.5))`,
      tipps: ["Nutze `return`, nicht `print`.",
              "Achte auf die Rangfolge: erst mal, dann geteilt, dann plus.",
              "`return grad * 9 / 5 + 32`"],
      loesung: `def celsius_nach_fahrenheit(grad):
    """Rechnet Grad Celsius in Grad Fahrenheit um."""
    return grad * 9 / 5 + 32

print(celsius_nach_fahrenheit(0))
print(celsius_nach_fahrenheit(100))
print(celsius_nach_fahrenheit(21.5))`,
      tests: [
        T("Null Grad ergibt 32", `assert celsius_nach_fahrenheit(0) == 32, f"Ergebnis: {celsius_nach_fahrenheit(0)}"`),
        T("Hundert Grad ergibt 212", `assert celsius_nach_fahrenheit(100) == 212, f"Ergebnis: {celsius_nach_fahrenheit(100)}"`),
        T("Minus vierzig ist in beiden gleich", `assert celsius_nach_fahrenheit(-40) == -40`),
        T("Die Funktion gibt zurueck statt auszugeben", `e = celsius_nach_fahrenheit(10)\nassert e is not None, "Nutze return statt print"`),
      ],
    },
    {
      id: "a18-2",
      titel: "Text auswerten",
      text: [P("Schreibe `wort_statistik(text)`, die ein Tupel aus drei Werten zurueckgibt:"),
             L("Anzahl der Woerter", "Anzahl der Zeichen ohne Leerzeichen", "laengstes Wort"),
             P("Bei leerem Text soll `(0, 0, \"\")` zurueckkommen.")],
      start: `def wort_statistik(text):
    pass

print(wort_statistik("Python ist eine gute Sprache"))
print(wort_statistik(""))`,
      tipps: ["`text.split()` zerlegt am Leerraum und liefert bei leerem Text eine leere Liste.",
              "Fange den Fall der leeren Liste am Anfang mit einem fruehen `return` ab.",
              "`max(woerter, key=len)` findet das laengste Wort."],
      loesung: `def wort_statistik(text):
    """Gibt Wortanzahl, Zeichenanzahl ohne Leerraum und laengstes Wort zurueck."""
    woerter = text.split()
    if not woerter:
        return (0, 0, "")
    zeichen = sum(len(w) for w in woerter)
    laengstes = max(woerter, key=len)
    return (len(woerter), zeichen, laengstes)

print(wort_statistik("Python ist eine gute Sprache"))
print(wort_statistik(""))`,
      tests: [
        T("Die Wortanzahl stimmt", `assert wort_statistik("a bb ccc")[0] == 3`),
        T("Die Zeichenanzahl stimmt", `assert wort_statistik("a bb ccc")[1] == 6, f"Ergebnis: {wort_statistik('a bb ccc')[1]}"`),
        T("Das laengste Wort stimmt", `assert wort_statistik("a bb ccc")[2] == "ccc"`),
        T("Leerer Text wird abgefangen", `assert wort_statistik("") == (0, 0, ""), f"Ergebnis: {wort_statistik('')}"`),
        T("Auch reiner Leerraum wird abgefangen", `assert wort_statistik("   ") == (0, 0, "")`),
      ],
    },
    {
      id: "a18-3",
      titel: "Rekursive Summe",
      text: [P("Schreibe `quersumme(n)` rekursiv: die Funktion soll die Ziffernsumme einer nicht negativen ganzen Zahl zurueckgeben."),
             P("Beispiel: `quersumme(481)` ergibt `13`. Nutze keine Schleife und keine Umwandlung in Text.")],
      start: `def quersumme(n):
    pass

print(quersumme(481))
print(quersumme(9))
print(quersumme(0))`,
      tipps: ["Der Abbruchfall: bei einer einstelligen Zahl ist die Quersumme die Zahl selbst.",
              "`n % 10` ist die letzte Ziffer, `n // 10` der Rest.",
              "`return n % 10 + quersumme(n // 10)`"],
      loesung: `def quersumme(n):
    """Summiert die Ziffern einer nicht negativen ganzen Zahl."""
    if n < 10:
        return n
    return n % 10 + quersumme(n // 10)

print(quersumme(481))
print(quersumme(9))
print(quersumme(0))`,
      tests: [
        T("481 ergibt 13", `assert quersumme(481) == 13, f"Ergebnis: {quersumme(481)}"`),
        T("Einstellige Zahlen funktionieren", `assert quersumme(9) == 9 and quersumme(0) == 0`),
        T("Grosse Zahlen funktionieren", `assert quersumme(999999) == 54`),
        T("Es wurde rekursiv geloest", `assert "quersumme(" in QUELLE.split("def quersumme")[1].split("print")[0], "Rufe die Funktion in sich selbst auf"`),
        T("Es wurde keine Schleife benutzt", `koerper = QUELLE.split("def quersumme")[1].split("print(")[0]\nassert "for " not in koerper and "while " not in koerper, "Loese es ohne Schleife"`),
      ],
    },
  ],
});

M4.push({
  id: "l-parameter",
  titel: "Parameter in allen Formen",
  dauer: 17,
  vorspann: "Python bietet bei Parametern mehr Moeglichkeiten als die meisten Sprachen. Das macht Funktionen angenehm zu benutzen, wenn du die Regeln kennst.",
  ziele: [
    "Vorgabewerte richtig setzen",
    "Argumente ueber Namen uebergeben",
    "args und kwargs verstehen",
    "Die Falle mit veraenderlichen Vorgabewerten kennen",
  ],
  inhalt: [
    H2("Vorgabewerte"),
    C(`def begruesse(name, gruss="Hallo", zeichen="."):
    return f"{gruss} {name}{zeichen}"

print(begruesse("Ada"))
print(begruesse("Ada", "Guten Tag"))
print(begruesse("Ada", "Hey", "!"))`,
      { aus: "Hallo Ada.\nGuten Tag Ada.\nHey Ada!" }),
    P("Parameter mit Vorgabewert muessen **hinter** denen ohne stehen. Sonst waere beim Aufruf nicht klar, was gemeint ist."),
    C(`def falsch(gruss="Hallo", name):
    return gruss + name`, { lauf: false }),

    H2("Argumente ueber Namen"),
    C(`def trainiere(modell, lernrate=0.01, epochen=10, mischen=True):
    return f"{modell}: lr={lernrate}, epochen={epochen}, mischen={mischen}"

print(trainiere("Netz A"))
print(trainiere("Netz A", 0.001))
print(trainiere("Netz A", epochen=100))
print(trainiere("Netz A", mischen=False, lernrate=0.5))`,
      { aus: "Netz A: lr=0.01, epochen=10, mischen=True\nNetz A: lr=0.001, epochen=10, mischen=True\nNetz A: lr=0.01, epochen=100, mischen=True\nNetz A: lr=0.5, epochen=10, mischen=False" }),
    P("Mit Namen kannst du einzelne Werte setzen und die Reihenfolge frei waehlen. Das macht Aufrufe lesbar: `trainiere(\"Netz A\", epochen=100)` sagt mehr als `trainiere(\"Netz A\", 0.01, 100)`."),
    TIPP("Eine Regel aus der Praxis",
      "Ab dem dritten Argument oder bei jedem Wahrheitswert gehoert ein Name dazu. `zeichne(daten, True, False)` ist unlesbar, `zeichne(daten, gitter=True, log=False)` nicht.",
    ),

    H2("Die wichtigste Falle"),
    P("Vorgabewerte werden **einmal** beim Definieren ausgewertet, nicht bei jedem Aufruf. Bei veraenderlichen Werten wie Listen fuehrt das zu einem Verhalten, das jeden Anfaenger einmal erwischt."),
    C(`def anhaengen(wert, liste=[]):
    liste.append(wert)
    return liste

print(anhaengen(1))
print(anhaengen(2))
print(anhaengen(3))`, { aus: "[1]\n[1, 2]\n[1, 2, 3]" }),
    P("Die Liste wird von allen Aufrufen geteilt, weil es nur eine einzige gibt. Der richtige Weg nutzt `None` als Vorgabe:"),
    C(`def anhaengen(wert, liste=None):
    if liste is None:
        liste = []
    liste.append(wert)
    return liste

print(anhaengen(1))
print(anhaengen(2))
print(anhaengen(3, [9]))`, { aus: "[1]\n[2]\n[9, 3]" }),
    WARN("Merke dir diese Regel",
      "Als Vorgabewert taugen nur unveraenderliche Werte: Zahlen, Text, Tupel, `None`, `True`, `False`. Niemals Listen, Dictionaries oder Mengen.",
    ),

    H2("Beliebig viele Argumente"),
    C(`def summe(*zahlen):
    gesamt = 0
    for z in zahlen:
        gesamt += z
    return gesamt

print(summe(1, 2))
print(summe(1, 2, 3, 4, 5))
print(summe())

def zeige(**angaben):
    for schluessel, wert in angaben.items():
        print(f"  {schluessel}: {wert}")

zeige(name="Netz A", epochen=50, lernrate=0.01)`,
      { aus: "3\n15\n0\n  name: Netz A\n  epochen: 50\n  lernrate: 0.01" }),
    P("Der einfache Stern sammelt alle uebrigen Positionsargumente in ein **Tupel**. Der doppelte Stern sammelt alle uebrigen Namensargumente in ein **Dictionary**."),
    HINWEIS("Die Namen sind Gewohnheit, keine Regel",
      "Ueblich sind `*args` und `**kwargs`, aber `*zahlen` und `**angaben` funktionieren genauso. Entscheidend sind allein die Sterne.",
    ),

    H2("Auspacken beim Aufruf"),
    P("Dieselben Sterne funktionieren in die andere Richtung: sie zerlegen eine Sammlung in einzelne Argumente."),
    C(`def punkt(x, y, z):
    return f"({x}, {y}, {z})"

koordinaten = [1, 2, 3]
print(punkt(*koordinaten))

angaben = {"x": 4, "y": 5, "z": 6}
print(punkt(**angaben))`, { aus: "(1, 2, 3)\n(4, 5, 6)" }),
    P("Das ist der Grund, warum du in Bibliotheken staendig `funktion(**einstellungen)` siehst: ein Dictionary mit Einstellungen wird als benannte Argumente uebergeben."),

    H2("Die vollstaendige Reihenfolge"),
    C(`def alles(pflicht, mit_vorgabe="x", *weitere, nur_name=None, **rest):
    print(f"pflicht:     {pflicht}")
    print(f"mit_vorgabe: {mit_vorgabe}")
    print(f"weitere:     {weitere}")
    print(f"nur_name:    {nur_name}")
    print(f"rest:        {rest}")

alles(1, "y", 3, 4, nur_name="wichtig", extra=True)`,
      { aus: "pflicht:     1\nmit_vorgabe: y\nweitere:     (3, 4)\nnur_name:    wichtig\nrest:        {'extra': True}" }),
    P("Alles nach dem Stern kann **nur** ueber den Namen uebergeben werden. Das nutzt man bewusst, um Aufrufe lesbar zu erzwingen:"),
    C(`def zeichne(daten, *, gitter=False, logarithmisch=False):
    return f"Gitter: {gitter}, Log: {logarithmisch}"

print(zeichne([1, 2], gitter=True))
print(zeichne([1, 2], True))`),
    P("Der einzelne Stern ohne Namen sagt: ab hier nur noch Namensargumente. Der zweite Aufruf bricht deshalb ab."),
  ],
  quiz: [
    Q("Warum ist `def f(liste=[])` problematisch?",
      ["Es ist ein SyntaxError",
       "Die Liste wird nur einmal angelegt und von allen Aufrufen geteilt",
       "Listen sind als Parameter nicht erlaubt",
       "Es ist zu langsam"],
      1,
      "Vorgabewerte entstehen beim Definieren. Eine veraenderliche Vorgabe behaelt Aenderungen ueber Aufrufe hinweg."),
    Q("Was steht in `args` bei `def f(*args)` und dem Aufruf `f(1, 2, 3)`?",
      ["`[1, 2, 3]`", "`(1, 2, 3)`", "`{1, 2, 3}`", "`3`"], 1,
      "Der einfache Stern sammelt Positionsargumente in ein Tupel."),
    Q("Was macht der Stern in `funktion(*liste)` beim Aufruf?",
      ["Er multipliziert die Werte",
       "Er zerlegt die Liste in einzelne Argumente",
       "Er kopiert die Liste",
       "Er uebergibt die Liste als ein Argument"],
      1,
      "Beim Aufruf packt der Stern aus, bei der Definition packt er ein."),
    Q("Welche Definition ist ungueltig?",
      ["`def f(a, b=1)`", "`def f(a=1, b)`", "`def f(*a, b=1)`", "`def f(a, *b, **c)`"], 1,
      "Parameter mit Vorgabewert muessen hinter denen ohne stehen."),
    Q("Was bewirkt der einzelne Stern in `def f(a, *, b)`?",
      ["`b` wird zu einer Liste",
       "`b` kann nur ueber seinen Namen uebergeben werden",
       "`b` ist optional",
       "`b` wird ignoriert"],
      1,
      "Alles nach dem Stern ist nur ueber den Namen ansprechbar. Das macht Aufrufe eindeutig."),
    Q("Welcher Vorgabewert ist unbedenklich?",
      ["`[]`", "`{}`", "`None`", "`set()`"], 2,
      "`None` ist unveraenderlich und der uebliche Platzhalter fuer eine spaeter angelegte Sammlung."),
  ],
  aufgaben: [
    {
      id: "a19-1",
      titel: "Flexible Statistikfunktion",
      text: [P("Schreibe `zusammenfassung(*werte, nachkommastellen=1, einheit=\"\")`, die einen Text zurueckgibt:"),
             ROH("Anzahl 4, Schnitt 11.5, Max 23"),
             L("Die Zahlen kommen als einzelne Argumente.",
               "`nachkommastellen` bestimmt die Genauigkeit des Durchschnitts.",
               "`einheit` wird, falls gesetzt, hinter jeden Zahlenwert gehaengt.",
               "Ohne Werte soll `Keine Daten` zurueckkommen.")],
      start: `def zusammenfassung(*werte, nachkommastellen=1, einheit=""):
    pass

print(zusammenfassung(12, 7, 23, 4))
print(zusammenfassung(1.5, 2.5, nachkommastellen=2, einheit=" kg"))
print(zusammenfassung())`,
      tipps: ["Fange den leeren Fall zuerst ab: `if not werte: return \"Keine Daten\"`.",
              "Die Nachkommastellen setzt du mit einer verschachtelten Formatangabe ein.",
              "`f\"Schnitt {schnitt:.{nachkommastellen}f}{einheit}\"`"],
      loesung: `def zusammenfassung(*werte, nachkommastellen=1, einheit=""):
    """Fasst beliebig viele Zahlen in einer Zeile zusammen."""
    if not werte:
        return "Keine Daten"
    schnitt = sum(werte) / len(werte)
    return (f"Anzahl {len(werte)}, "
            f"Schnitt {schnitt:.{nachkommastellen}f}{einheit}, "
            f"Max {max(werte)}{einheit}")

print(zusammenfassung(12, 7, 23, 4))
print(zusammenfassung(1.5, 2.5, nachkommastellen=2, einheit=" kg"))
print(zusammenfassung())`,
      tests: [
        T("Der Grundfall stimmt", `assert zusammenfassung(12, 7, 23, 4) == "Anzahl 4, Schnitt 11.5, Max 23", f"Ergebnis: {zusammenfassung(12, 7, 23, 4)!r}"`),
        T("Nachkommastellen wirken", `e = zusammenfassung(1.5, 2.5, nachkommastellen=2)\nassert "2.00" in e, f"Ergebnis: {e!r}"`),
        T("Die Einheit wird angehaengt", `e = zusammenfassung(1.5, 2.5, nachkommastellen=2, einheit=" kg")\nassert "kg" in e, f"Ergebnis: {e!r}"`),
        T("Der leere Fall wird abgefangen", `assert zusammenfassung() == "Keine Daten", f"Ergebnis: {zusammenfassung()!r}"`),
        T("Beliebig viele Werte sind moeglich", `assert "Anzahl 6" in zusammenfassung(1,2,3,4,5,6)`),
      ],
    },
    {
      id: "a19-2",
      titel: "Die Vorgabefalle beheben",
      text: [P("Die Funktion unten soll bei jedem Aufruf mit einem frischen Protokoll beginnen. Sie tut es nicht. Repariere sie."),
             P("Erwartete Ausgabe:"),
             ROH("['Start']\n['Ende']")],
      start: `def protokolliere(eintrag, protokoll=[]):
    protokoll.append(eintrag)
    return protokoll

print(protokolliere("Start"))
print(protokolliere("Ende"))`,
      tipps: ["Der Vorgabewert wird nur einmal beim Definieren angelegt.",
              "Nutze `None` als Vorgabe.",
              "Lege die Liste im Koerper an, wenn nichts uebergeben wurde."],
      loesung: `def protokolliere(eintrag, protokoll=None):
    if protokoll is None:
        protokoll = []
    protokoll.append(eintrag)
    return protokoll

print(protokolliere("Start"))
print(protokolliere("Ende"))`,
      tests: [
        T("Jeder Aufruf startet frisch", `assert protokolliere("A") == ["A"] and protokolliere("B") == ["B"], "Die Liste wird noch geteilt"`),
        T("Ein uebergebenes Protokoll wird weitergefuehrt", `p = ["X"]\nassert protokolliere("Y", p) == ["X", "Y"]`),
        T("None ist der Vorgabewert", `import inspect\nassert inspect.signature(protokolliere).parameters["protokoll"].default is None, "Nutze None als Vorgabe"`),
        T("Die Ausgabe stimmt", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[0] == "['Start']" and zeilen[1] == "['Ende']", f"Ausgabe: {zeilen}"`),
      ],
    },
  ],
});

M4.push({
  id: "l-gueltigkeit",
  titel: "Gueltigkeitsbereich und Referenzen",
  dauer: 15,
  vorspann: "Wo ist ein Name sichtbar, und was passiert, wenn du ein Objekt an eine Funktion uebergibst? Die Antworten darauf erklaeren die meisten unerwarteten Fehler in Python.",
  ziele: [
    "Lokale und globale Namen unterscheiden",
    "Die Suchreihenfolge von Namen kennen",
    "Verstehen, was beim Uebergeben an Funktionen wirklich passiert",
    "Seiteneffekte bewusst vermeiden",
  ],
  inhalt: [
    H2("Lokal und global"),
    C(`nachricht = "aussen"

def zeige():
    nachricht = "innen"
    print("in der Funktion:", nachricht)

zeige()
print("ausserhalb:     ", nachricht)`,
      { aus: "in der Funktion: innen\nausserhalb:      aussen" }),
    P("Eine Zuweisung innerhalb einer Funktion legt einen **neuen, lokalen** Namen an. Der aeussere bleibt unberuehrt. Das ist Absicht: Funktionen sollen nicht versehentlich in fremde Namen schreiben."),
    P("Lesen geht dagegen ohne Weiteres:"),
    C(`grenze = 100

def pruefe(wert):
    return wert > grenze

print(pruefe(150))
print(pruefe(50))`, { aus: "True\nFalse" }),

    H2("Die Suchreihenfolge"),
    P("Trifft Python auf einen Namen, sucht es in vier Ebenen, in dieser Reihenfolge:"),
    NR(
      "**Lokal**: innerhalb der aktuellen Funktion",
      "**Umschliessend**: in einer aeusseren Funktion, falls verschachtelt",
      "**Global**: auf Ebene der Datei",
      "**Eingebaut**: die Funktionen von Python selbst",
    ),
    C(`x = "global"

def aussen():
    x = "umschliessend"

    def innen():
        print("gefunden:", x)

    innen()

aussen()
print("global:", x)`, { aus: "gefunden: umschliessend\nglobal: global" }),
    WARN("Eingebaute Namen ueberschreiben",
      "Nennst du eine Variable `list`, `sum` oder `str`, ist die eingebaute Funktion in diesem Bereich nicht mehr erreichbar. Das gibt spaeter sehr verwirrende Fehler. Nutze `liste`, `summe`, `text`.",
    ),
    C(`summe = sum([1, 2, 3])
print(summe)

sum = 10
print(sum([1, 2]))`),

    H2("global und nonlocal"),
    P("Willst du wirklich in einen aeusseren Namen schreiben, musst du das ausdruecklich sagen."),
    C(`zaehler = 0

def erhoehe():
    global zaehler
    zaehler += 1

erhoehe()
erhoehe()
print(zaehler)`, { aus: "2" }),
    C(`def aussen():
    stand = 0

    def erhoehe():
        nonlocal stand
        stand += 1

    erhoehe()
    erhoehe()
    return stand

print(aussen())`, { aus: "2" }),
    MERKE("global ist fast immer ein Warnzeichen",
      "Eine Funktion, die globale Namen aendert, laesst sich nicht mehr isoliert testen und macht Fehler schwer auffindbar. Nimm stattdessen Parameter und Rueckgabewerte. `nonlocal` hat dagegen seine berechtigten Faelle bei verschachtelten Funktionen.",
    ),

    H2("Was beim Uebergeben passiert"),
    P("Python uebergibt weder eine Kopie des Werts noch die Variable selbst. Es uebergibt den **Verweis auf das Objekt**. Was daraus folgt, haengt davon ab, ob das Objekt veraenderlich ist."),
    C(`def veraendere_zahl(n):
    n = n + 100
    return n

zahl = 5
ergebnis = veraendere_zahl(zahl)
print(zahl, ergebnis)`, { aus: "5 105" }),
    P("Eine Zahl ist unveraenderlich. `n = n + 100` haengt den lokalen Namen an ein neues Objekt, das aeussere bleibt unberuehrt."),
    C(`def veraendere_liste(werte):
    werte.append(99)

meine = [1, 2, 3]
veraendere_liste(meine)
print(meine)`, { aus: "[1, 2, 3, 99]" }),
    P("Eine Liste ist veraenderlich. `append` aendert das Objekt selbst, und das sieht auch der Aufrufer. Das ist ein **Seiteneffekt**."),
    C(`def ersetzen(werte):
    werte = [9, 9, 9]
    return werte

meine = [1, 2, 3]
neu = ersetzen(meine)
print(meine, neu)`, { aus: "[1, 2, 3] [9, 9, 9]" }),
    P("Hier wird nichts veraendert, sondern der lokale Name umgehaengt. Der Unterschied zwischen `werte.append(...)` und `werte = ...` ist entscheidend."),
    TAB(["Was du tust", "Wirkung beim Aufrufer"],
      ["`n = n + 1`", "keine, der lokale Name wird umgehaengt"],
      ["`liste.append(x)`", "sichtbar, das Objekt aendert sich"],
      ["`liste = [...]`", "keine, nur der lokale Name"],
      ["`d[\"k\"] = 1`", "sichtbar"],
      ["`liste += [x]`", "sichtbar, das ist `extend`"],
    ),

    H2("Seiteneffekte bewusst einsetzen"),
    P("Beide Formen sind legitim. Wichtig ist, dass der Name der Funktion verraet, welche es ist."),
    C(`def sortiert_kopie(werte):
    """Gibt eine neue sortierte Liste zurueck, ohne das Original zu aendern."""
    return sorted(werte)

def sortiere_direkt(werte):
    """Sortiert die uebergebene Liste an Ort und Stelle."""
    werte.sort()

original = [3, 1, 2]
kopie = sortiert_kopie(original)
print("nach der Kopie:", original, kopie)

sortiere_direkt(original)
print("nach direkt:  ", original)`,
      { aus: "nach der Kopie: [3, 1, 2] [1, 2, 3]" + "\n" + "nach direkt:   [1, 2, 3]" }),
    TIPP("Die sicherere Voreinstellung",
      "Schreibe Funktionen im Zweifel so, dass sie ihre Eingaben nicht anfassen und ein Ergebnis zurueckgeben. Solche Funktionen sind leicht zu testen, leicht zu kombinieren und ueberraschen niemanden.",
    ),
  ],
  quiz: [
    Q("Was gibt dieser Code aus?",
      ["`innen`", "`aussen`", "`None`", "Ein NameError"], 1,
      "Die Zuweisung in der Funktion legt einen neuen lokalen Namen an. Der globale bleibt unberuehrt.",
      `x = "aussen"\n\ndef f():\n    x = "innen"\n\nf()\nprint(x)`),
    Q("In welcher Reihenfolge sucht Python einen Namen?",
      ["global, lokal, eingebaut",
       "lokal, umschliessend, global, eingebaut",
       "eingebaut, global, lokal",
       "alphabetisch"],
      1,
      "Von innen nach aussen: lokal, umschliessend, global, eingebaut."),
    Q("Was gibt dieser Code aus?",
      ["`[1, 2]`", "`[1, 2, 3]`", "`None`", "Ein Fehler"], 1,
      "`append` veraendert das Objekt selbst. Diese Aenderung sieht auch der Aufrufer.",
      `def f(liste):\n    liste.append(3)\n\nwerte = [1, 2]\nf(werte)\nprint(werte)`),
    Q("Was gibt dieser Code aus?",
      ["`[1, 2]`", "`[9]`", "`None`", "Ein Fehler"], 0,
      "Die Zuweisung haengt nur den lokalen Namen um. Das Objekt des Aufrufers bleibt unangetastet.",
      `def f(liste):\n    liste = [9]\n\nwerte = [1, 2]\nf(werte)\nprint(werte)`),
    Q("Wofuer brauchst du `global`?",
      ["Um eine globale Variable zu lesen",
       "Um innerhalb einer Funktion einer globalen Variable zuzuweisen",
       "Um eine Variable sichtbar zu machen",
       "Um Funktionen zu exportieren"],
      1,
      "Lesen geht ohne. Nur das Zuweisen an einen globalen Namen muss ausdruecklich erklaert werden."),
  ],
  aufgaben: [
    {
      id: "a20-1",
      titel: "Seiteneffekt vermeiden",
      text: [P("Die Funktion `normiere` soll die Werte auf den Bereich zwischen 0 und 1 bringen und eine **neue** Liste zurueckgeben. Das Original darf sich nicht aendern."),
             P("Erwartete Ausgabe:"),
             ROH("[0.0, 0.5, 1.0]\n[10, 20, 30]")],
      start: `def normiere(werte):
    pass

daten = [10, 20, 30]
ergebnis = normiere(daten)

print(ergebnis)
print(daten)`,
      tipps: ["Der kleinste Wert wird zu 0, der groesste zu 1.",
              "Die Formel lautet: Wert minus Minimum, geteilt durch Maximum minus Minimum.",
              "Eine Comprehension baut eine neue Liste, ohne das Original zu beruehren."],
      loesung: `def normiere(werte):
    """Skaliert alle Werte auf den Bereich von 0 bis 1."""
    klein = min(werte)
    gross = max(werte)
    spanne = gross - klein
    if spanne == 0:
        return [0.0 for _ in werte]
    return [(w - klein) / spanne for w in werte]

daten = [10, 20, 30]
ergebnis = normiere(daten)

print(ergebnis)
print(daten)`,
      tests: [
        T("Das Ergebnis stimmt", `assert normiere([10, 20, 30]) == [0.0, 0.5, 1.0], f"Ergebnis: {normiere([10, 20, 30])}"`),
        T("Das Original bleibt unveraendert", `d = [5, 10]\nnormiere(d)\nassert d == [5, 10], f"Original wurde geaendert: {d}"`),
        T("Es kommt eine neue Liste zurueck", `d = [1, 2]\nassert normiere(d) is not d, "Gib eine neue Liste zurueck"`),
        T("Gleiche Werte fuehren nicht zum Absturz", `assert normiere([7, 7, 7]) == [0.0, 0.0, 0.0], "Fange den Fall ab, dass alle Werte gleich sind"`),
      ],
    },
    {
      id: "a20-2",
      titel: "Zaehler ohne global",
      text: [P("Schreibe `zaehle(werte)`, die zurueckgibt, wie viele Werte groesser als 10 sind. Nutze **kein** `global`, sondern eine lokale Variable und einen Rueckgabewert."),
             P("Erwartete Ausgabe: `3`")],
      start: `def zaehle(werte):
    pass

print(zaehle([5, 12, 8, 40, 11, 2]))`,
      tipps: ["Lege einen lokalen Zaehler an und erhoehe ihn in der Schleife.",
              "Gib den Zaehler am Ende zurueck.",
              "Alternativ geht es in einer Zeile mit `sum(1 for w in werte if w > 10)`."],
      loesung: `def zaehle(werte):
    """Zaehlt, wie viele Werte ueber 10 liegen."""
    treffer = 0
    for w in werte:
        if w > 10:
            treffer += 1
    return treffer

print(zaehle([5, 12, 8, 40, 11, 2]))`,
      tests: [
        T("Das Ergebnis stimmt", `assert zaehle([5, 12, 8, 40, 11, 2]) == 3, f"Ergebnis: {zaehle([5, 12, 8, 40, 11, 2])}"`),
        T("Die leere Liste ergibt null", `assert zaehle([]) == 0`),
        T("Genau 10 zaehlt nicht mit", `assert zaehle([10, 10, 11]) == 1, "Nur Werte echt groesser als 10"`),
        T("Es wurde kein global benutzt", `assert "global" not in QUELLE, "Loese es ohne global"`),
      ],
    },
  ],
});

M4.push({
  id: "l-fehler",
  titel: "Fehler abfangen",
  dauer: 18,
  vorspann: "Ein Programm, das bei jeder unerwarteten Eingabe abstuerzt, ist kein fertiges Programm. Fehlerbehandlung ist der Unterschied zwischen einem Skript und einer Anwendung.",
  ziele: [
    "try und except richtig einsetzen",
    "Gezielt einzelne Fehlerarten abfangen",
    "Eigene Fehler auslosen",
    "Die Haltung hinter Pythons Fehlerkultur verstehen",
  ],
  inhalt: [
    H2("Der Grundaufbau"),
    C(`text = "vierzig"

try:
    zahl = int(text)
    print("Umgewandelt:", zahl)
except ValueError:
    print("Das war keine Zahl.")

print("Das Programm laeuft weiter.")`,
      { aus: "Das war keine Zahl.\nDas Programm laeuft weiter." }),
    P("Im `try` steht der Code, der schiefgehen kann. Tritt der genannte Fehler auf, springt Python sofort in den `except`-Block. Ohne Fehler wird `except` uebersprungen."),

    H2("Mehrere Faelle"),
    C(`def teile(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Division durch null"
    except TypeError:
        return "Das waren keine Zahlen"

print(teile(10, 2))
print(teile(10, 0))
print(teile(10, "zwei"))`,
      { aus: "5.0\nDivision durch null\nDas waren keine Zahlen" }),
    P("Mehrere Arten lassen sich auch zusammenfassen:"),
    C(`werte = ["12", "abc", None]

for w in werte:
    try:
        print(int(w) * 2)
    except (ValueError, TypeError) as fehler:
        print(f"Uebersprungen: {type(fehler).__name__}")`,
      { aus: "24\nUebersprungen: ValueError\nUebersprungen: TypeError" }),
    P("Mit `as fehler` bekommst du das Fehlerobjekt selbst. Daraus liest du Art und Meldung aus, was beim Protokollieren wichtig ist."),

    H2("else und finally"),
    C(`def lies_zahl(text):
    try:
        wert = int(text)
    except ValueError:
        print(f"  Fehler bei {text!r}")
        return None
    else:
        print(f"  {text!r} war gueltig")
        return wert
    finally:
        print(f"  fertig mit {text!r}")

print(lies_zahl("42"))
print(lies_zahl("abc"))`,
      { aus: "  '42' war gueltig\n  fertig mit '42'\n42\n  Fehler bei 'abc'\n  fertig mit 'abc'\nNone" }),
    TAB(["Block", "Laeuft wann"],
      ["`try`", "immer, bis ein Fehler auftritt"],
      ["`except`", "nur wenn der passende Fehler auftrat"],
      ["`else`", "nur wenn **kein** Fehler auftrat"],
      ["`finally`", "immer, auch bei `return` oder unbehandeltem Fehler"],
    ),
    P("`finally` ist fuer Aufraeumarbeiten gedacht: Dateien schliessen, Verbindungen beenden. Es laeuft selbst dann, wenn die Funktion mit `return` verlassen wird."),

    H2("Was du nicht tun solltest"),
    C(`# So nicht
try:
    ergebnis = riskante_sache()
except:
    pass`, { lauf: false }),
    WARN("Das nackte except",
      "Ein `except` ohne Angabe faengt **alles** ab, auch Tippfehler in deinem eigenen Code und den Abbruch mit Strg und C. Zusammen mit `pass` verschluckt es Fehler spurlos. Das ist die schlechteste Zeile, die du schreiben kannst.",
    ),
    C(`# So stattdessen
def riskante_sache():
    return int("abc")

try:
    ergebnis = riskante_sache()
except ValueError as fehler:
    print(f"Umwandlung fehlgeschlagen: {fehler}")
    ergebnis = 0

print("Ergebnis:", ergebnis)`,
      { aus: "Umwandlung fehlgeschlagen: invalid literal for int() with base 10: 'abc'\nErgebnis: 0" }),
    MERKE("Zwei Regeln",
      "Fange nur die Fehler ab, mit denen du wirklich rechnest, und fange sie so eng wie moeglich ein. Alles andere soll laut abbrechen, damit du es siehst und behebst.",
    ),

    H2("Fehler selbst auslosen"),
    C(`def wurzel(x):
    if x < 0:
        raise ValueError(f"Wurzel aus negativer Zahl: {x}")
    return x ** 0.5

print(wurzel(16))
print(wurzel(-4))`),
    P("`raise` loest einen Fehler bewusst aus. Das ist richtig so: eine Funktion, die mit ungueltigen Eingaben aufgerufen wird, soll nicht still etwas Falsches zurueckgeben."),
    C(`class ZuWenigDatenFehler(Exception):
    """Wird ausgeloest, wenn zu wenige Messwerte vorliegen."""

def auswerten(werte, mindestens=3):
    if len(werte) < mindestens:
        raise ZuWenigDatenFehler(f"{len(werte)} Werte, mindestens {mindestens} noetig")
    return sum(werte) / len(werte)

try:
    print(auswerten([1, 2]))
except ZuWenigDatenFehler as f:
    print("Abgefangen:", f)`,
      { aus: "Abgefangen: 2 Werte, mindestens 3 noetig" }),
    P("Eigene Fehlerarten sind eine Klasse, die von `Exception` erbt. Mehr braucht es nicht. Der Nutzen: Aufrufer koennen genau deinen Fall abfangen, ohne alles andere mitzunehmen."),

    H2("Die Haltung dahinter"),
    P("In Python gilt eine Redewendung: es ist leichter, um Verzeihung zu bitten als um Erlaubnis. Statt vorher alles zu pruefen, versucht man es und faengt den Fehlerfall ab."),
    C(`daten = {"name": "Ada"}

# Vorher pruefen
if "alter" in daten:
    alter = daten["alter"]
else:
    alter = 0

# Versuchen und abfangen
try:
    alter = daten["alter"]
except KeyError:
    alter = 0

print(alter)`, { aus: "0" }),
    P("Beide Formen sind richtig. Die zweite gilt als typischer fuer Python, besonders wenn der Fehlerfall selten ist. Bei Dictionaries ist `daten.get(\"alter\", 0)` allerdings beiden vorzuziehen."),

    H2("Ein robustes Beispiel"),
    C(`def sichere_zahl(text, vorgabe=0.0):
    """Wandelt Text in eine Kommazahl um, oder gibt die Vorgabe zurueck."""
    try:
        return float(text)
    except (ValueError, TypeError):
        return vorgabe

eingaben = ["3.14", "abc", "", None, "-2.5", "1e3"]

for e in eingaben:
    print(f"{str(e):<8} -> {sichere_zahl(e)}")`,
      { aus: "3.14     -> 3.14\nabc      -> 0.0\n         -> 0.0\nNone     -> 0.0\n-2.5     -> -2.5\n1e3      -> 1000.0" }),
    P("Diese Funktion behandelt jeden Fall, ohne abzustuerzen, und ohne dabei Fehler zu verschlucken, die sie nichts angehen. So sieht saubere Fehlerbehandlung aus."),
  ],
  quiz: [
    Q("Wann laeuft der `else`-Block eines try?",
      ["Immer nach dem try", "Nur wenn ein Fehler auftrat",
       "Nur wenn kein Fehler auftrat", "Nur bei einem return"], 2,
      "`else` ist der Erfolgsfall. Bei einem Fehler wird er uebersprungen."),
    Q("Wann laeuft `finally`?",
      ["Nur bei Erfolg", "Nur bei einem Fehler",
       "Immer, auch bei return oder unbehandeltem Fehler", "Nie, wenn except greift"], 2,
      "`finally` ist fuer Aufraeumarbeiten und laeuft in jedem Fall."),
    Q("Warum ist `except:` ohne Angabe problematisch?",
      ["Es ist ein SyntaxError",
       "Es faengt auch Fehler ab, mit denen du nicht rechnest, und verdeckt sie",
       "Es ist langsamer",
       "Es funktioniert nur bei ValueError"],
      1,
      "Das nackte except faengt alles, auch Tippfehler und den Programmabbruch. Fehler verschwinden spurlos."),
    Q("Was macht `raise ValueError(\"Text\")`?",
      ["Es faengt einen Fehler ab",
       "Es loest einen Fehler bewusst aus",
       "Es gibt eine Warnung aus",
       "Es beendet das Programm ohne Meldung"],
      1,
      "`raise` erzeugt einen Fehler. Das ist richtig, wenn eine Funktion mit ungueltigen Werten aufgerufen wird."),
    Q("Was gibt dieser Code aus?",
      ["`5.0`", "`unendlich`", "Ein ZeroDivisionError", "`None`"], 1,
      "Die Division bricht ab, der passende except-Block faengt sie und liefert den Ersatzwert.",
      `try:\n    print(10 / 0)\nexcept ZeroDivisionError:\n    print("unendlich")`),
    Q("Wie legst du eine eigene Fehlerart an?",
      ["`def MeinFehler(Exception)`",
       "`class MeinFehler(Exception): pass`",
       "`raise MeinFehler`",
       "`error MeinFehler`"],
      1,
      "Eine Klasse, die von `Exception` erbt. Ein Dokumentationstext genuegt als Koerper."),
  ],
  aufgaben: [
    {
      id: "a21-1",
      titel: "Robuste Umwandlung",
      text: [P("Schreibe `zu_zahl(text, vorgabe=0)`, die den Text in eine ganze Zahl umwandelt. Klappt das nicht, soll die Vorgabe zurueckkommen, ohne dass das Programm abbricht."),
             P("Die Funktion muss mit `\"42\"`, `\"abc\"`, `\"\"`, `None` und `\"3.7\"` umgehen koennen.")],
      start: `def zu_zahl(text, vorgabe=0):
    pass

for e in ["42", "abc", "", None, "3.7"]:
    print(zu_zahl(e))`,
      tipps: ["`int(None)` loest einen TypeError aus, `int(\"abc\")` einen ValueError.",
              "Fange beide mit einem Tupel ab: `except (ValueError, TypeError)`.",
              "Gib im Erfolgsfall direkt aus dem try zurueck."],
      loesung: `def zu_zahl(text, vorgabe=0):
    """Wandelt in eine ganze Zahl um, oder liefert die Vorgabe."""
    try:
        return int(text)
    except (ValueError, TypeError):
        return vorgabe

for e in ["42", "abc", "", None, "3.7"]:
    print(zu_zahl(e))`,
      tests: [
        T("Gueltiger Text wird umgewandelt", `assert zu_zahl("42") == 42`),
        T("Ungueltiger Text gibt die Vorgabe", `assert zu_zahl("abc") == 0 and zu_zahl("") == 0`),
        T("None wird abgefangen", `assert zu_zahl(None) == 0, "Auch ein TypeError muss abgefangen werden"`),
        T("Kommazahlen als Text geben die Vorgabe", `assert zu_zahl("3.7") == 0`),
        T("Eine eigene Vorgabe wirkt", `assert zu_zahl("abc", -1) == -1`),
        T("Es wurde kein nacktes except benutzt", `import re\nassert not re.search(r"except\\s*:", QUELLE), "Fange die Fehlerarten gezielt ab"`),
      ],
    },
    {
      id: "a21-2",
      titel: "Eigene Fehlerart",
      text: [P("Lege eine Fehlerart `UngueltigeNote` an, die von `Exception` erbt."),
             P("Schreibe dann `pruefe_note(note)`, die diesen Fehler auslost, wenn die Note nicht zwischen 1 und 6 liegt. Gueltige Noten gibt die Funktion unveraendert zurueck.")],
      start: `class UngueltigeNote(Exception):
    pass

def pruefe_note(note):
    pass

print(pruefe_note(2))

try:
    pruefe_note(7)
except UngueltigeNote as f:
    print("Abgefangen:", f)`,
      tipps: ["Pruefe zuerst den ungueltigen Fall und loese dort den Fehler aus.",
              "`raise UngueltigeNote(f\"...\")` mit einer verstaendlichen Meldung.",
              "Gib danach die Note einfach zurueck."],
      loesung: `class UngueltigeNote(Exception):
    """Wird ausgeloest, wenn eine Note ausserhalb von 1 bis 6 liegt."""

def pruefe_note(note):
    if not 1 <= note <= 6:
        raise UngueltigeNote(f"Note {note} liegt nicht zwischen 1 und 6")
    return note

print(pruefe_note(2))

try:
    pruefe_note(7)
except UngueltigeNote as f:
    print("Abgefangen:", f)`,
      tests: [
        T("Gueltige Noten kommen zurueck", `assert pruefe_note(1) == 1 and pruefe_note(6) == 6`),
        T("Zu hohe Noten loesen den Fehler aus", `try:\n    pruefe_note(7)\n    assert False, "Es wurde kein Fehler ausgeloest"\nexcept UngueltigeNote:\n    pass`),
        T("Zu niedrige Noten loesen den Fehler aus", `try:\n    pruefe_note(0)\n    assert False, "Es wurde kein Fehler ausgeloest"\nexcept UngueltigeNote:\n    pass`),
        T("Die Fehlerart erbt von Exception", `assert issubclass(UngueltigeNote, Exception)`),
        T("Die Meldung enthaelt die Note", `try:\n    pruefe_note(9)\nexcept UngueltigeNote as f:\n    assert "9" in str(f), f"Meldung war: {f}"`),
      ],
    },
  ],
});

M4.push({
  id: "l-module",
  titel: "Module und die Standardbibliothek",
  dauer: 16,
  vorspann: "Python kommt mit einer ungewoehnlich reichen mitgelieferten Bibliothek. Wer sie kennt, schreibt deutlich weniger Code als noetig waere.",
  ziele: [
    "Module auf alle Arten einbinden",
    "Eigenen Code auf mehrere Dateien verteilen",
    "Die wichtigsten Standardmodule kennen",
    "Den Namensschutz mit __main__ verstehen",
  ],
  inhalt: [
    H2("Module einbinden"),
    C(`import math
print(math.sqrt(16))

from math import sqrt, pi
print(sqrt(25), pi)

import math as m
print(m.floor(3.9))

from math import sqrt as wurzel
print(wurzel(9))`, { aus: "4.0\n5.0 3.141592653589793\n3\n3.0" }),
    TAB(["Form", "Wirkung", "Wann"],
      ["`import modul`", "alles unter dem Modulnamen", "Standardfall"],
      ["`from modul import a, b`", "nur a und b, ohne Vorsatz", "wenn du wenige Namen oft brauchst"],
      ["`import modul as m`", "unter kuerzerem Namen", "bei langen Namen, etwa `numpy as np`"],
      ["`from modul import *`", "alles ohne Vorsatz", "praktisch nie"],
    ),
    WARN("Der Stern-Import",
      "`from modul import *` holt alle Namen in deinen Bereich und kann eigene ueberschreiben, ohne dass du es merkst. Beim Lesen ist dann nicht mehr erkennbar, woher ein Name stammt. Vermeide ihn.",
    ),

    H2("Eigene Module"),
    P("Jede `.py`-Datei ist ein Modul. Liegt `werkzeuge.py` neben deinem Skript, kannst du daraus einbinden."),
    C(`# datei: werkzeuge.py
def durchschnitt(werte):
    return sum(werte) / len(werte) if werte else 0.0

MWST = 0.19`, { lauf: false, name: "werkzeuge.py" }),
    C(`# datei: haupt.py
import werkzeuge

print(werkzeuge.durchschnitt([1, 2, 3]))
print(werkzeuge.MWST)

from werkzeuge import durchschnitt
print(durchschnitt([4, 5, 6]))`, { lauf: false, name: "haupt.py" }),
    P("Ein Verzeichnis mit mehreren Moduldateien heisst Paket. Frueher brauchte es dafuer eine Datei `__init__.py`, heute geht es meist auch ohne. Der Zugriff erfolgt mit Punkten: `from paket.modul import funktion`."),

    H2("Der Namensschutz"),
    P("Beim Einbinden fuehrt Python die ganze Datei aus. Steht darin ein Testaufruf, laeuft er ungewollt mit. Dagegen hilft eine Pruefung:"),
    C(`def verdoppeln(x):
    return x * 2

if __name__ == "__main__":
    print("Selbsttest:", verdoppeln(21))

print("Dieser Teil laeuft immer.")`,
      { aus: "Selbsttest: 42\nDieser Teil laeuft immer." }),
    P("`__name__` enthaelt `\"__main__\"`, wenn die Datei direkt gestartet wurde, und sonst den Modulnamen. Fast jedes ernsthafte Python-Skript enthaelt diese Zeile."),

    H2("Die wichtigsten Standardmodule"),
    TAB(["Modul", "Wofuer"],
      ["`math`", "Wurzel, Logarithmus, Winkelfunktionen, Konstanten"],
      ["`random`", "Zufallszahlen, Mischen, Ziehen"],
      ["`datetime`", "Datum, Uhrzeit, Zeitspannen"],
      ["`pathlib`", "Dateipfade, plattformunabhaengig"],
      ["`json`", "Daten lesen und schreiben im JSON-Format"],
      ["`collections`", "Counter, defaultdict, deque"],
      ["`itertools`", "Kombinationen, Gruppen, endlose Folgen"],
      ["`re`", "regulaere Ausdruecke"],
      ["`statistics`", "Mittelwert, Median, Standardabweichung"],
      ["`time`", "Zeitmessung, Pausen"],
      ["`csv`", "Tabellendateien"],
      ["`os` und `sys`", "Betriebssystem und Interpreter"],
    ),

    H2("random"),
    C(`import random

print(random.randint(1, 6) in range(1, 7))
print(0.0 <= random.random() < 1.0)
print(random.choice(["Kopf", "Zahl"]) in ("Kopf", "Zahl"))

karten = [1, 2, 3, 4, 5]
random.shuffle(karten)
print(sorted(karten))

lotto = random.sample(range(1, 50), 6)
print(len(lotto), len(set(lotto)))`,
      { aus: "True\nTrue\nTrue\n[1, 2, 3, 4, 5]\n6 6" }),
    P("Das Mischen veraendert die Liste an Ort und Stelle, `sample` zieht ohne Zuruecklegen. Mit einem festen Startwert wird die Folge wiederholbar:"),
    C(`import random

random.seed(42)
erste = [random.randint(1, 100) for _ in range(5)]

random.seed(42)
zweite = [random.randint(1, 100) for _ in range(5)]

print(erste == zweite)
print("Ohne seed waere das nur zufaellig gleich.")`,
      { aus: "True\nOhne seed waere das nur zufaellig gleich." }),
    TIPP("seed macht Zufall wiederholbar",
      "`random.seed(42)` sorgt dafuer, dass dieselbe Folge herauskommt. In der KI ist das entscheidend: nur so laesst sich ein Experiment reproduzieren.",
    ),

    H2("statistics und collections"),
    C(`import statistics
from collections import Counter, defaultdict

werte = [4, 8, 15, 16, 23, 42]
print(statistics.mean(werte))
print(statistics.median(werte))
print(f"{statistics.stdev(werte):.2f}")

woerter = "a b a c b a".split()
print(Counter(woerter).most_common())

gruppen = defaultdict(list)
for wort in ["Apfel", "Ananas", "Birne", "Banane"]:
    gruppen[wort[0]].append(wort)
print(dict(gruppen))`,
      { aus: "18\n15.5\n13.49\n[('a', 3), ('b', 2), ('c', 1)]\n{'A': ['Apfel', 'Ananas'], 'B': ['Birne', 'Banane']}" }),
    P("`defaultdict(list)` legt fuer jeden neuen Schluessel automatisch eine leere Liste an. Das erspart die staendige Pruefung, ob der Schluessel schon existiert."),

    H2("datetime"),
    C(`from datetime import datetime, timedelta, date

geburtstag = date(1815, 12, 10)
heute = date(2026, 9, 12)

alter_tage = (heute - geburtstag).days
print(f"Tage dazwischen: {alter_tage}")
print(f"Jahre ungefaehr: {alter_tage // 365}")

zeitpunkt = datetime(2026, 9, 12, 14, 30)
print(zeitpunkt.strftime("%d.%m.%Y um %H:%M"))
print((zeitpunkt + timedelta(days=30, hours=2)).strftime("%d.%m.%Y um %H:%M"))`,
      { aus: "Tage dazwischen: 76978\nJahre ungefaehr: 210\n12.09.2026 um 14:30\n12.10.2026 um 16:30" }),

    H2("itertools"),
    C(`from itertools import combinations, permutations, product, groupby

farben = ["rot", "gruen", "blau"]

print(list(combinations(farben, 2)))
print(len(list(permutations(farben))))
print(list(product([0, 1], repeat=2)))

daten = [("a", 1), ("a", 2), ("b", 3)]
for schluessel, gruppe in groupby(daten, key=lambda p: p[0]):
    print(schluessel, [g[1] for g in gruppe])`,
      { aus: "[('rot', 'gruen'), ('rot', 'blau'), ('gruen', 'blau')]\n6\n[(0, 0), (0, 1), (1, 0), (1, 1)]\na [1, 2]\nb [3]" }),
    P("`product` mit `repeat` erzeugt alle Kombinationen, was beim systematischen Durchprobieren von Einstellungen in der KI staendig gebraucht wird."),
    MERKE("Erst suchen, dann schreiben",
      "Bevor du eine Hilfsfunktion schreibst, schau in der Standardbibliothek nach. Die Wahrscheinlichkeit ist hoch, dass es sie schon gibt, getestet und schneller als deine Fassung.",
    ),
  ],
  quiz: [
    Q("Was bewirkt `import numpy as np`?",
      ["Es laedt nur einen Teil von numpy",
       "Es bindet numpy unter dem kuerzeren Namen np ein",
       "Es benennt das Modul dauerhaft um",
       "Es ist gleichbedeutend mit `from numpy import *`"],
      1,
      "`as` vergibt einen Kurznamen fuer diese Datei. Am Modul selbst aendert sich nichts."),
    Q("Warum solltest du `from modul import *` vermeiden?",
      ["Es ist langsamer",
       "Es holt alle Namen herein und kann eigene ueberschreiben, ohne dass es sichtbar wird",
       "Es funktioniert nur bei Standardmodulen",
       "Es ist veraltet und wird entfernt"],
      1,
      "Beim Lesen ist nicht mehr erkennbar, woher ein Name stammt, und Ueberschreibungen fallen nicht auf."),
    Q("Wann enthaelt `__name__` den Wert `\"__main__\"`?",
      ["Immer", "Wenn die Datei eingebunden wurde",
       "Wenn die Datei direkt gestartet wurde", "Nur in der Standardbibliothek"], 2,
      "Beim direkten Start heisst das Modul `__main__`. Beim Einbinden traegt es seinen Dateinamen."),
    Q("Wofuer ist `random.seed(42)` gut?",
      ["Es macht die Zufallszahlen echter",
       "Es sorgt dafuer, dass dieselbe Folge reproduzierbar ist",
       "Es begrenzt die Zahlen auf 42",
       "Es beschleunigt die Erzeugung"],
      1,
      "Der Startwert legt die Folge fest. In Experimenten ist das noetig, um Ergebnisse nachvollziehen zu koennen."),
    Q("Was macht `defaultdict(list)`?",
      ["Es legt eine Liste an", "Es legt fuer jeden neuen Schluessel automatisch eine leere Liste an",
       "Es sortiert das Dictionary", "Es wandelt ein Dictionary in eine Liste um"], 1,
      "Der fehlende Schluessel wird beim Zugriff mit dem Ergebnis der Fabrikfunktion angelegt. Das erspart Pruefungen."),
  ],
  aufgaben: [
    {
      id: "a22-1",
      titel: "Woerter gruppieren",
      text: [P("Gruppiere die Woerter nach ihrem Anfangsbuchstaben. Nutze `defaultdict`."),
             P("Erwartete Ausgabe:"),
             ROH("A: ['Apfel', 'Ananas']\nB: ['Birne', 'Banane']\nK: ['Kirsche']")],
      start: `from collections import defaultdict

woerter = ["Apfel", "Birne", "Ananas", "Kirsche", "Banane"]

gruppen = 

# hier gruppieren

for buchstabe in sorted(gruppen):
    print(f"{buchstabe}: {gruppen[buchstabe]}")`,
      tipps: ["`defaultdict(list)` legt fuer neue Schluessel eine leere Liste an.",
              "Der Anfangsbuchstabe ist `wort[0]`.",
              "`gruppen[wort[0]].append(wort)`"],
      loesung: `from collections import defaultdict

woerter = ["Apfel", "Birne", "Ananas", "Kirsche", "Banane"]

gruppen = defaultdict(list)

for wort in woerter:
    gruppen[wort[0]].append(wort)

for buchstabe in sorted(gruppen):
    print(f"{buchstabe}: {gruppen[buchstabe]}")`,
      tests: [
        T("Die Gruppierung stimmt", `assert dict(gruppen) == {"A": ["Apfel", "Ananas"], "B": ["Birne", "Banane"], "K": ["Kirsche"]}, f"Ergebnis: {dict(gruppen)}"`),
        T("Es sind drei Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 3`),
        T("Die Reihenfolge innerhalb der Gruppen bleibt", `assert gruppen["A"][0] == "Apfel", "Die Reihenfolge der Woerter soll erhalten bleiben"`),
        T("defaultdict wurde benutzt", `assert "defaultdict" in QUELLE`),
      ],
    },
    {
      id: "a22-2",
      titel: "Zufall reproduzierbar machen",
      text: [P("Schreibe `ziehe(anzahl, startwert)`, die mit dem gegebenen Startwert `anzahl` verschiedene Zahlen zwischen 1 und 49 zieht und sortiert zurueckgibt."),
             P("Bei gleichem Startwert muss immer dasselbe Ergebnis herauskommen.")],
      start: `import random

def ziehe(anzahl, startwert):
    pass

print(ziehe(6, 42))
print(ziehe(6, 42))`,
      tipps: ["Setze zuerst den Startwert mit `random.seed(startwert)`.",
              "`random.sample(bereich, anzahl)` zieht ohne Zuruecklegen.",
              "`sorted(...)` bringt das Ergebnis in Reihenfolge."],
      loesung: `import random

def ziehe(anzahl, startwert):
    """Zieht reproduzierbar verschiedene Zahlen zwischen 1 und 49."""
    random.seed(startwert)
    return sorted(random.sample(range(1, 50), anzahl))

print(ziehe(6, 42))
print(ziehe(6, 42))`,
      tests: [
        T("Es kommen genau so viele Zahlen zurueck", `assert len(ziehe(6, 1)) == 6`),
        T("Die Zahlen sind verschieden", `e = ziehe(6, 7)\nassert len(set(e)) == 6, f"Doppelte gefunden: {e}"`),
        T("Alle liegen zwischen 1 und 49", `assert all(1 <= z <= 49 for z in ziehe(10, 3))`),
        T("Das Ergebnis ist sortiert", `e = ziehe(6, 5)\nassert e == sorted(e)`),
        T("Gleicher Startwert gibt gleiches Ergebnis", `assert ziehe(6, 42) == ziehe(6, 42), "Setze den Startwert in der Funktion"`),
        T("Verschiedene Startwerte geben verschiedene Ergebnisse", `assert ziehe(6, 1) != ziehe(6, 2)`),
      ],
    },
  ],
});

M4.push({
  id: "l-dateien",
  titel: "Dateien und Pfade",
  dauer: 17,
  vorspann: "Daten liegen selten im Programm selbst. Sie kommen aus Dateien, und dorthin gehen die Ergebnisse zurueck.",
  ziele: [
    "Dateien sicher lesen und schreiben",
    "Den with-Block verstehen",
    "Mit pathlib plattformunabhaengig arbeiten",
    "CSV- und JSON-Dateien verarbeiten",
  ],
  inhalt: [
    H2("Der with-Block"),
    C(`with open("notiz.txt", "w", encoding="utf-8") as datei:
    datei.write("Erste Zeile\\n")
    datei.write("Zweite Zeile\\n")

with open("notiz.txt", "r", encoding="utf-8") as datei:
    inhalt = datei.read()

print(inhalt)`, { aus: "Erste Zeile\nZweite Zeile\n" }),
    P("`with` sorgt dafuer, dass die Datei am Ende geschlossen wird, auch wenn dazwischen ein Fehler auftritt. Ohne `with` musst du selbst `datei.close()` aufrufen und darauf achten, dass es in jedem Fall passiert. Nutze immer `with`."),
    WARN("Die Kodierung immer angeben",
      "`encoding=\"utf-8\"` gehoert in jeden Aufruf. Ohne die Angabe nimmt Python je nach Betriebssystem etwas anderes an, und Umlaute werden auf einem anderen Rechner zu Fragezeichen.",
    ),

    H2("Die Modi"),
    TAB(["Modus", "Bedeutung", "Wenn die Datei fehlt"],
      ["`\"r\"`", "lesen", "`FileNotFoundError`"],
      ["`\"w\"`", "schreiben, Inhalt wird geloescht", "wird angelegt"],
      ["`\"a\"`", "anhaengen", "wird angelegt"],
      ["`\"x\"`", "neu anlegen", "Fehler, wenn sie existiert"],
      ["`\"rb\"` / `\"wb\"`", "binaer lesen oder schreiben", "wie oben"],
    ),
    WARN("w loescht sofort",
      "Beim Oeffnen im Modus `w` ist der bisherige Inhalt sofort weg, noch bevor du etwas schreibst. Zum Ergaenzen nimmst du `a`.",
    ),

    H2("Zeilenweise lesen"),
    C(`with open("werte.txt", "w", encoding="utf-8") as f:
    f.write("12\\n7\\n23\\n4\\n")

summe = 0
with open("werte.txt", "r", encoding="utf-8") as f:
    for zeile in f:
        summe += int(zeile.strip())

print("Summe:", summe)`, { aus: "Summe: 46" }),
    P("Die Schleife ueber das Dateiobjekt liest Zeile fuer Zeile und haelt immer nur eine im Speicher. Bei einer Datei mit Millionen Zeilen ist das der entscheidende Unterschied zu `read()`, das alles auf einmal laedt."),
    TAB(["Aufruf", "Ergebnis", "Speicher"],
      ["`f.read()`", "alles als eine Zeichenkette", "ganze Datei"],
      ["`f.readlines()`", "Liste aller Zeilen", "ganze Datei"],
      ["`for zeile in f`", "eine Zeile nach der anderen", "eine Zeile"],
    ),

    H2("pathlib"),
    P("Pfade als Zeichenketten zusammenzusetzen fuehrt zu Fehlern, weil Windows und andere Systeme unterschiedliche Trennzeichen nutzen. `pathlib` loest das."),
    C(`from pathlib import Path

pfad = Path("daten") / "messungen" / "januar.txt"
print(pfad)
print(pfad.name)
print(pfad.stem)
print(pfad.suffix)
print(pfad.parent)`,
      { aus: "daten/messungen/januar.txt\njanuar.txt\njanuar\n.txt\ndaten/messungen" }),
    P("Der Schraegstrich verbindet Pfadteile, unabhaengig vom Betriebssystem. `Path` kann ausserdem selbst lesen und schreiben:"),
    C(`from pathlib import Path

datei = Path("kurz.txt")
datei.write_text("Nur eine Zeile\\n", encoding="utf-8")

print(datei.read_text(encoding="utf-8").strip())
print("existiert:", datei.exists())
print("Groesse:", datei.stat().st_size, "Byte")

datei.unlink()
print("nach dem Loeschen:", datei.exists())`,
      { aus: "Nur eine Zeile\nexistiert: True\nGroesse: 15 Byte\nnach dem Loeschen: False" }),

    H2("Fehlende Dateien abfangen"),
    C(`from pathlib import Path

def lies_sicher(pfad, vorgabe=""):
    """Liest eine Datei, oder gibt die Vorgabe zurueck, wenn sie fehlt."""
    try:
        return Path(pfad).read_text(encoding="utf-8")
    except FileNotFoundError:
        return vorgabe

print(repr(lies_sicher("gibt-es-nicht.txt", "leer")))`, { aus: "'leer'" }),

    H2("CSV-Dateien"),
    C(`import csv

zeilen = [
    ["name", "punkte"],
    ["Ada", 95],
    ["Grace", 88],
]

with open("punkte.csv", "w", newline="", encoding="utf-8") as f:
    schreiber = csv.writer(f)
    schreiber.writerows(zeilen)

with open("punkte.csv", "r", newline="", encoding="utf-8") as f:
    leser = csv.DictReader(f)
    for eintrag in leser:
        print(f"{eintrag['name']}: {eintrag['punkte']}")`,
      { aus: "Ada: 95\nGrace: 88" }),
    P("`DictReader` nutzt die erste Zeile als Spaltennamen und liefert jede Zeile als Dictionary. Das ist deutlich lesbarer als der Zugriff ueber Positionen."),
    HINWEIS("newline gehoert dazu",
      "Beim Arbeiten mit dem csv-Modul gehoert `newline=\"\"` in den open-Aufruf. Sonst entstehen auf manchen Systemen leere Zeilen zwischen den Datensaetzen.",
    ),

    H2("JSON-Dateien"),
    C(`import json

einstellungen = {
    "modell": "Netz A",
    "lernrate": 0.001,
    "schichten": [128, 64, 10],
    "mischen": True,
}

with open("einstellungen.json", "w", encoding="utf-8") as f:
    json.dump(einstellungen, f, indent=2, ensure_ascii=False)

with open("einstellungen.json", "r", encoding="utf-8") as f:
    geladen = json.load(f)

print(geladen["schichten"])
print(type(geladen))
print(json.dumps(geladen)[:40])`,
      { aus: "[128, 64, 10]\n<class 'dict'>\n{\"modell\": \"Netz A\", \"lernrate\": 0.001, " }),
    TAB(["Funktion", "Richtung"],
      ["`json.dump(objekt, datei)`", "Objekt in eine Datei"],
      ["`json.load(datei)`", "Datei in ein Objekt"],
      ["`json.dumps(objekt)`", "Objekt in eine Zeichenkette"],
      ["`json.loads(text)`", "Zeichenkette in ein Objekt"],
    ),
    P("Das `s` steht fuer *string*. JSON kennt nur Zahlen, Text, Wahrheitswerte, Listen, Objekte und null. Ein Python-Tupel wird beim Speichern zur Liste, eine Menge laesst sich gar nicht ablegen."),
    MERKE("Die drei Regeln fuer Dateien",
      "Immer mit `with` oeffnen. Immer die Kodierung angeben. Bei grossen Dateien zeilenweise lesen statt alles auf einmal.",
    ),
  ],
  quiz: [
    Q("Warum solltest du Dateien mit `with` oeffnen?",
      ["Es ist schneller",
       "Die Datei wird zuverlaessig geschlossen, auch bei einem Fehler",
       "Nur so lassen sich Dateien schreiben",
       "Es spart Speicher"],
      1,
      "`with` schliesst die Datei automatisch, selbst wenn im Block ein Fehler auftritt."),
    Q("Was passiert beim Oeffnen im Modus `\"w\"` mit einer vorhandenen Datei?",
      ["Der Inhalt wird angehaengt", "Der Inhalt wird sofort geloescht",
       "Es gibt einen Fehler", "Die Datei wird nur gelesen"], 1,
      "Der Modus `w` leert die Datei beim Oeffnen. Zum Ergaenzen nimmst du `a`."),
    Q("Warum ist `for zeile in datei` bei grossen Dateien besser als `datei.read()`?",
      ["Es ist die einzige Moeglichkeit",
       "Es haelt immer nur eine Zeile im Speicher",
       "Es liest schneller",
       "Es entfernt automatisch Leerzeichen"],
      1,
      "`read()` laedt die gesamte Datei. Die Schleife arbeitet Zeile fuer Zeile und braucht dadurch kaum Speicher."),
    Q("Was verbindet der Schraegstrich bei `Path(\"a\") / \"b\"`?",
      ["Er teilt die Pfade", "Er setzt sie plattformgerecht zusammen",
       "Er ist eine Division und gibt einen Fehler", "Er vergleicht die Pfade"], 1,
      "`pathlib` ueberlaedt den Operator zum Zusammensetzen von Pfaden, mit dem richtigen Trennzeichen je System."),
    Q("Was liefert `json.loads(text)`?",
      ["Eine Zeichenkette", "Ein Python-Objekt aus dem JSON-Text",
       "Eine Datei", "Eine Liste von Zeilen"], 1,
      "`loads` liest aus einer Zeichenkette. `load` liest aus einer Datei."),
    Q("Warum gehoert `encoding=\"utf-8\"` in jeden open-Aufruf?",
      ["Es beschleunigt das Lesen",
       "Sonst haengt die Zeichenkodierung vom Betriebssystem ab und Umlaute brechen",
       "Es ist Pflicht seit Python 3",
       "Es verhindert Schreibfehler"],
      1,
      "Ohne Angabe waehlt Python je nach System eine andere Kodierung. Auf einem anderen Rechner sieht die Datei dann kaputt aus."),
  ],
  aufgaben: [
    {
      id: "a23-1",
      titel: "Datei schreiben und auswerten",
      text: [P("Schreibe die Werte in eine Datei, eine Zahl pro Zeile. Lies sie danach zurueck und gib Summe und Durchschnitt aus."),
             P("Erwartete Ausgabe:"),
             ROH("Summe: 46, Schnitt: 11.5")],
      start: `werte = [12, 7, 23, 4]
pfad = "zahlen.txt"

# schreiben

# lesen

print(f"Summe: {summe}, Schnitt: {schnitt}")`,
      tipps: ["Beim Schreiben brauchst du hinter jeder Zahl einen Zeilenumbruch.",
              "`f.write(f\"{w}\\n\")` in einer Schleife.",
              "Beim Lesen entfernst du mit `strip()` den Umbruch und wandelst mit `int()` um."],
      loesung: `werte = [12, 7, 23, 4]
pfad = "zahlen.txt"

with open(pfad, "w", encoding="utf-8") as f:
    for w in werte:
        f.write(f"{w}\\n")

gelesen = []
with open(pfad, "r", encoding="utf-8") as f:
    for zeile in f:
        gelesen.append(int(zeile.strip()))

summe = sum(gelesen)
schnitt = summe / len(gelesen)

print(f"Summe: {summe}, Schnitt: {schnitt}")`,
      tests: [
        T("Die Datei wurde angelegt", `import os\nassert os.path.exists("zahlen.txt"), "Die Datei fehlt"`),
        T("Die Datei hat vier Zeilen", `with open("zahlen.txt", encoding="utf-8") as f:\n    zeilen = [z for z in f.read().split("\\n") if z.strip()]\nassert len(zeilen) == 4, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die Summe stimmt", `assert summe == 46, f"summe war {summe}"`),
        T("Der Durchschnitt stimmt", `assert abs(schnitt - 11.5) < 1e-9, f"schnitt war {schnitt}"`),
        T("Es wurde mit with gearbeitet", `assert QUELLE.count("with open") >= 2, "Nutze with zum Oeffnen"`),
      ],
    },
    {
      id: "a23-2",
      titel: "Einstellungen speichern und laden",
      text: [P("Schreibe zwei Funktionen:"),
             L("`speichern(daten, pfad)` legt die Daten als JSON ab, mit Einrueckung 2.",
               "`laden(pfad, vorgabe=None)` liest sie zurueck. Fehlt die Datei, kommt die Vorgabe zurueck."),
             P("Erwartete Ausgabe:"),
             ROH("{'modell': 'Netz A', 'epochen': 50}\n{'leer': True}")],
      start: `import json

def speichern(daten, pfad):
    pass

def laden(pfad, vorgabe=None):
    pass

speichern({"modell": "Netz A", "epochen": 50}, "konf.json")
print(laden("konf.json"))
print(laden("fehlt.json", {"leer": True}))`,
      tipps: ["`json.dump(daten, f, indent=2)` schreibt formatiert.",
              "Beim Laden faengst du `FileNotFoundError` ab.",
              "Vergiss die Kodierung nicht."],
      loesung: `import json

def speichern(daten, pfad):
    """Legt die Daten als JSON-Datei ab."""
    with open(pfad, "w", encoding="utf-8") as f:
        json.dump(daten, f, indent=2, ensure_ascii=False)

def laden(pfad, vorgabe=None):
    """Liest eine JSON-Datei, oder gibt die Vorgabe zurueck."""
    try:
        with open(pfad, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return vorgabe

speichern({"modell": "Netz A", "epochen": 50}, "konf.json")
print(laden("konf.json"))
print(laden("fehlt.json", {"leer": True}))`,
      tests: [
        T("Gespeichert und geladen ergibt dasselbe", `speichern({"a": 1, "b": [2, 3]}, "t1.json")\nassert laden("t1.json") == {"a": 1, "b": [2, 3]}`),
        T("Eine fehlende Datei gibt die Vorgabe", `assert laden("gibt-es-sicher-nicht.json", "x") == "x"`),
        T("Ohne Vorgabe kommt None", `assert laden("gibt-es-sicher-nicht.json") is None`),
        T("Die Datei ist eingerueckt", `speichern({"a": 1}, "t2.json")\nwith open("t2.json", encoding="utf-8") as f:\n    inhalt = f.read()\nassert "\\n" in inhalt, "Nutze indent=2 beim Schreiben"`),
        T("FileNotFoundError wird gezielt abgefangen", `assert "FileNotFoundError" in QUELLE, "Fange den Fehler gezielt ab"`),
      ],
    },
  ],
});

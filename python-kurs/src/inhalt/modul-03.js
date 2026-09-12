const M3 = modul({
  id: "m3", nr: 3, ikon: "baustein",
  titel: "Datenstrukturen",
  kurz: "Listen, Tupel, Dictionaries und Mengen. Die Behaelter, in denen deine Daten leben.",
});

M3.push({
  id: "l-listen",
  titel: "Listen",
  dauer: 18,
  vorspann: "Eine Liste haelt beliebig viele Werte in fester Reihenfolge und laesst sich jederzeit veraendern. Sie ist die meistgenutzte Datenstruktur in Python.",
  ziele: [
    "Listen anlegen, lesen und veraendern",
    "Elemente hinzufuegen und entfernen",
    "Ausschnitte mit Slicing greifen",
    "Die Falle beim Kopieren verstehen",
  ],
  inhalt: [
    H2("Anlegen und zugreifen"),
    C(`werte = [12, 7, 23, 4]
gemischt = [1, "zwei", 3.0, True]
leer = []

print(werte)
print(werte[0], werte[2], werte[-1])
print(len(werte))`, { aus: "[12, 7, 23, 4]\n12 23 4\n4" }),
    P("Positionen beginnen bei null, negative Zahlen zaehlen von hinten. Greifst du daneben, gibt es einen `IndexError`:"),
    C(`werte = [12, 7, 23, 4]
print(werte[4])`),
    HINWEIS("Gemischte Typen sind erlaubt, aber selten sinnvoll",
      "Python hindert dich nicht daran, Zahlen und Text in eine Liste zu werfen. In der Praxis enthaelt eine Liste aber fast immer gleichartige Dinge. Alles andere macht die Weiterverarbeitung unnoetig kompliziert.",
    ),

    H2("Veraendern"),
    P("Anders als Zeichenketten sind Listen **veraenderlich**. Du kannst einzelne Positionen ueberschreiben."),
    C(`werte = [12, 7, 23, 4]

werte[1] = 99
print(werte)

werte[0] += 8
print(werte)`, { aus: "[12, 99, 23, 4]\n[20, 99, 23, 4]" }),

    H2("Hinzufuegen und entfernen"),
    TAB(["Methode", "Wirkung"],
      ["`append(x)`", "haengt ein Element hinten an"],
      ["`insert(i, x)`", "fuegt an Position i ein"],
      ["`extend(liste)`", "haengt alle Elemente einer anderen Liste an"],
      ["`remove(x)`", "entfernt das erste Vorkommen von x"],
      ["`pop()`", "entfernt das letzte Element und gibt es zurueck"],
      ["`pop(i)`", "entfernt das Element an Position i"],
      ["`clear()`", "leert die Liste"],
    ),
    C(`stapel = [1, 2, 3]

stapel.append(4)
print(stapel)

stapel.insert(0, 0)
print(stapel)

stapel.extend([5, 6])
print(stapel)

letztes = stapel.pop()
print(letztes, stapel)

stapel.remove(0)
print(stapel)`,
      { aus: "[1, 2, 3, 4]\n[0, 1, 2, 3, 4]\n[0, 1, 2, 3, 4, 5, 6]\n6 [0, 1, 2, 3, 4, 5]\n[1, 2, 3, 4, 5]" }),
    WARN("append gibt nichts zurueck",
      "`neu = liste.append(5)` setzt `neu` auf `None`. Die Methode veraendert die Liste an Ort und Stelle und liefert keinen Wert. Dieser Fehler kostet Anfaenger viel Zeit.",
    ),
    C(`liste = [1, 2, 3]
ergebnis = liste.append(4)
print(ergebnis)
print(liste)`, { aus: "None\n[1, 2, 3, 4]" }),

    H2("Slicing"),
    P("Dieselbe Schreibweise wie bei Zeichenketten, nur liefert sie hier eine neue Liste."),
    C(`zahlen = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

print(zahlen[2:5])
print(zahlen[:3])
print(zahlen[7:])
print(zahlen[-3:])
print(zahlen[::2])
print(zahlen[::-1])`,
      { aus: "[2, 3, 4]\n[0, 1, 2]\n[7, 8, 9]\n[7, 8, 9]\n[0, 2, 4, 6, 8]\n[9, 8, 7, 6, 5, 4, 3, 2, 1, 0]" }),
    P("Slices lassen sich auch beschreiben, was in anderen Sprachen ungewoehnlich ist:"),
    C(`zahlen = [0, 1, 2, 3, 4]

zahlen[1:3] = [10, 20, 30]
print(zahlen)

zahlen[:2] = []
print(zahlen)`, { aus: "[0, 10, 20, 30, 3, 4]\n[20, 30, 3, 4]" }),

    H2("Die Kopierfalle"),
    P("Das ist der wichtigste Abschnitt dieser Lektion. Eine Zuweisung kopiert **nicht**. Sie vergibt nur einen zweiten Namen fuer dieselbe Liste."),
    C(`original = [1, 2, 3]
zweitname = original

zweitname.append(4)

print("original: ", original)
print("zweitname:", zweitname)
print("dasselbe Objekt:", original is zweitname)`,
      { aus: "original:  [1, 2, 3, 4]\nzweitname: [1, 2, 3, 4]\ndasselbe Objekt: True" }),
    P("Willst du wirklich kopieren, gibt es drei Wege:"),
    C(`original = [1, 2, 3]

kopie1 = original[:]
kopie2 = list(original)
kopie3 = original.copy()

kopie1.append(99)

print(original)
print(kopie1)`, { aus: "[1, 2, 3]\n[1, 2, 3, 99]" }),
    WARN("Auch das reicht nicht immer",
      "Diese drei Wege erzeugen eine **flache** Kopie. Enthaelt deine Liste selbst wieder Listen, zeigen beide Kopien auf dieselben inneren Listen. Fuer eine echte Tiefenkopie brauchst du `copy.deepcopy`.",
    ),
    C(`import copy

tabelle = [[1, 2], [3, 4]]
flach = tabelle[:]
tief = copy.deepcopy(tabelle)

flach[0].append(99)

print("Original:", tabelle)
print("Tief:    ", tief)`, { aus: "Original: [[1, 2, 99], [3, 4]]\nTief:     [[1, 2], [3, 4]]" }),

    H2("Pruefen und suchen"),
    C(`namen = ["Ada", "Grace", "Alan"]

print("Ada" in namen)
print("Linus" in namen)
print(namen.index("Grace"))
print(namen.count("Ada"))`, { aus: "True\nFalse\n1\n1" }),
    P("`index` gibt einen `ValueError`, wenn das Element fehlt. Pruefe vorher mit `in`, wenn du dir nicht sicher bist."),

    H2("Listen als Stapel und Warteschlange"),
    C(`# Stapel: das Letzte kommt zuerst heraus
stapel = []
stapel.append("A")
stapel.append("B")
stapel.append("C")
print(stapel.pop(), stapel)

# Warteschlange: das Erste kommt zuerst heraus
schlange = ["A", "B", "C"]
print(schlange.pop(0), schlange)`,
      { aus: "C ['A', 'B']\nA ['B', 'C']" }),
    TIPP("Fuer echte Warteschlangen",
      "`pop(0)` muss alle nachfolgenden Elemente verschieben und wird bei langen Listen langsam. Fuer viele Entnahmen vorne nimm `collections.deque`, das beide Enden gleich schnell bedient.",
    ),
  ],
  quiz: [
    Q("Was gibt `[10, 20, 30][-1]` zurueck?",
      ["10", "30", "20", "Ein IndexError"], 1,
      "Minus eins bezeichnet das letzte Element."),
    Q("Was steht nach diesem Code in `a`?",
      ["`[1, 2, 3]`", "`[1, 2, 3, 4]`", "`None`", "Ein Fehler"], 1,
      "`b = a` gibt der Liste nur einen zweiten Namen. Die Aenderung ueber `b` betrifft dieselbe Liste.",
      `a = [1, 2, 3]\nb = a\nb.append(4)`),
    Q("Was liefert `liste.append(5)` zurueck?",
      ["Die veraenderte Liste", "`None`", "Die Laenge der Liste", "Das angehaengte Element"], 1,
      "Die Methode veraendert die Liste direkt und gibt nichts zurueck. `neu = liste.append(5)` setzt `neu` auf None."),
    Q("Wie kopierst du eine Liste, ohne dass Aenderungen das Original treffen?",
      ["`kopie = original`", "`kopie = original[:]`", "`kopie == original`", "`kopie = list`"], 1,
      "Ein vollstaendiger Slice erzeugt eine neue Liste. `list(original)` und `original.copy()` tun dasselbe."),
    Q("Was gibt `[0, 1, 2, 3, 4][1:4]` zurueck?",
      ["`[1, 2, 3, 4]`", "`[1, 2, 3]`", "`[0, 1, 2, 3]`", "`[2, 3]`"], 1,
      "Ab Position 1 bis vor Position 4, also die Elemente 1, 2 und 3."),
    Q("Warum ist `pop(0)` bei langen Listen langsam?",
      ["Weil Python den Wert erst suchen muss",
       "Weil alle folgenden Elemente nachruecken muessen",
       "Weil die Liste neu sortiert wird",
       "Das stimmt nicht, es ist genauso schnell wie pop()"],
      1,
      "Eine Liste liegt zusammenhaengend im Speicher. Faellt das erste Element weg, muessen alle anderen verschoben werden."),
  ],
  aufgaben: [
    {
      id: "a12-1",
      titel: "Liste aufbauen",
      text: [P("Baue in `quadrate` die Quadratzahlen von 1 bis 10 auf, mit einer Schleife und `append`."),
             P("Gib danach die Liste, ihre Laenge und ihre Summe aus, in dieser Form:"),
             ROH("[1, 4, 9, 16, 25, 36, 49, 64, 81, 100]\n10 Werte, Summe 385")],
      start: `quadrate = []

# Schleife hier

print(quadrate)
print(f"{len(quadrate)} Werte, Summe {sum(quadrate)}")`,
      tipps: ["`range(1, 11)` liefert die Zahlen 1 bis 10.",
              "Das Quadrat ist `i ** 2` oder `i * i`.",
              "`quadrate.append(i ** 2)` haengt an."],
      loesung: `quadrate = []

for i in range(1, 11):
    quadrate.append(i ** 2)

print(quadrate)
print(f"{len(quadrate)} Werte, Summe {sum(quadrate)}")`,
      tests: [
        T("Die Liste stimmt", `assert quadrate == [1,4,9,16,25,36,49,64,81,100], f"Liste war: {quadrate}"`),
        T("Die Ausgabe hat zwei Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 2, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die Summenzeile stimmt", `assert "10 Werte, Summe 385" in AUSGABE, f"Ausgabe war: {AUSGABE!r}"`),
        T("Es wurde append benutzt", `assert "append" in QUELLE, "Baue die Liste mit append auf"`),
      ],
    },
    {
      id: "a12-2",
      titel: "Eine echte Kopie anlegen",
      text: [P("Der Code unten soll die Originalliste unangetastet lassen. Repariere ihn."),
             P("Erwartete Ausgabe:"),
             ROH("Original: [1, 2, 3]\nKopie:    [1, 2, 3, 99]")],
      start: `original = [1, 2, 3]
kopie = original

kopie.append(99)

print("Original:", original)
print("Kopie:   ", kopie)`,
      tipps: ["Eine Zuweisung kopiert nicht, sie benennt nur neu.",
              "Ein vollstaendiger Slice erzeugt eine neue Liste.",
              "`kopie = original[:]` oder `original.copy()`"],
      loesung: `original = [1, 2, 3]
kopie = original[:]

kopie.append(99)

print("Original:", original)
print("Kopie:   ", kopie)`,
      tests: [
        T("Das Original ist unveraendert", `assert original == [1, 2, 3], f"original war: {original}"`),
        T("Die Kopie hat die 99", `assert kopie == [1, 2, 3, 99], f"kopie war: {kopie}"`),
        T("Es sind zwei getrennte Objekte", `assert original is not kopie, "Beide Namen zeigen noch auf dieselbe Liste"`),
      ],
    },
    {
      id: "a12-3",
      titel: "Werte filtern und umdrehen",
      text: [P("Aus `messwerte` sollen alle Werte ueber 20 in `hohe` landen, in umgekehrter Reihenfolge."),
             P("Erwartetes Ergebnis: `[42, 31, 23]`")],
      start: `messwerte = [12, 23, 7, 31, 18, 42, 5]

hohe = []

# hier filtern

print(hohe)`,
      tipps: ["Gehe mit einer Schleife durch die Messwerte.",
              "Sammle die passenden Werte mit `append`.",
              "Am Ende drehst du mit `[::-1]` oder `.reverse()` um."],
      loesung: `messwerte = [12, 23, 7, 31, 18, 42, 5]

hohe = []

for wert in messwerte:
    if wert > 20:
        hohe.append(wert)

hohe = hohe[::-1]

print(hohe)`,
      tests: [
        T("Das Ergebnis stimmt", `assert hohe == [42, 31, 23], f"hohe war: {hohe}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "[42, 31, 23]", f"Ausgabe war: {AUSGABE.strip()!r}"`),
        T("Die Originalliste ist unveraendert", `assert messwerte == [12, 23, 7, 31, 18, 42, 5], "messwerte wurde veraendert"`),
      ],
    },
  ],
});

M3.push({
  id: "l-listen-tiefer",
  titel: "Sortieren und Listen verarbeiten",
  dauer: 16,
  vorspann: "Sortieren ist so haeufig, dass Python zwei getrennte Wege dafuer anbietet. Der Unterschied zwischen ihnen ist eine der wichtigsten Unterscheidungen ueberhaupt.",
  ziele: [
    "sort und sorted sicher unterscheiden",
    "Nach eigenen Kriterien sortieren",
    "Listen umdrehen und zusammenfuegen",
    "Die wichtigsten eingebauten Funktionen einsetzen",
  ],
  inhalt: [
    H2("sort veraendert, sorted liefert zurueck"),
    C(`werte = [42, 7, 23, 4]

neu = sorted(werte)
print("nach sorted: ", werte, neu)

werte.sort()
print("nach sort:   ", werte)`,
      { aus: "nach sorted:  [42, 7, 23, 4] [4, 7, 23, 42]\nnach sort:    [4, 7, 23, 42]" }),
    TAB(["", "`liste.sort()`", "`sorted(liste)`"],
      ["Veraendert das Original", "ja", "nein"],
      ["Rueckgabe", "`None`", "neue sortierte Liste"],
      ["Funktioniert mit", "nur Listen", "allem Durchlaufbaren"],
    ),
    MERKE("Die allgemeine Regel",
      "In Python veraendern Methoden wie `sort`, `reverse` und `append` das Objekt und geben `None` zurueck. Funktionen wie `sorted` und `reversed` lassen das Original in Ruhe und liefern ein Ergebnis. Wenn du diese Regel kennst, kennst du das Verhalten fast aller Listenoperationen.",
    ),

    H2("Absteigend und nach Kriterium"),
    C(`werte = [42, 7, 23, 4]
print(sorted(werte, reverse=True))

namen = ["Christoph", "Ada", "Bernhard"]
print(sorted(namen))
print(sorted(namen, key=len))`,
      { aus: "[42, 23, 7, 4]\n['Ada', 'Bernhard', 'Christoph']\n['Ada', 'Bernhard', 'Christoph']" }),
    P("`key` bekommt eine Funktion, die zu jedem Element einen Sortierwert liefert. Sortiert wird dann nach diesem Wert, ausgegeben werden aber die Originalelemente."),
    C(`modelle = [
    ("Perzeptron", 0.72),
    ("Entscheidungsbaum", 0.88),
    ("Neuronales Netz", 0.94),
    ("Zufall", 0.50),
]

nach_guete = sorted(modelle, key=lambda m: m[1], reverse=True)

for name, wert in nach_guete:
    print(f"{name:<20}{wert:.2f}")`,
      { aus: "Neuronales Netz     0.94\nEntscheidungsbaum   0.88\nPerzeptron          0.72\nZufall              0.50" }),
    P("`lambda m: m[1]` ist eine namenlose Funktion, die von jedem Paar den zweiten Wert nimmt. Lambdas lernst du spaeter noch genauer kennen, hier siehst du ihren haeufigsten Einsatz."),
    HINWEIS("Stabil sortiert",
      "Python sortiert stabil: Elemente mit gleichem Sortierwert behalten ihre urspruengliche Reihenfolge. Dadurch kannst du nacheinander nach mehreren Kriterien sortieren, das unwichtigste zuerst.",
    ),

    H2("Umdrehen"),
    C(`werte = [1, 2, 3]

print(werte[::-1])
print(list(reversed(werte)))

werte.reverse()
print(werte)`, { aus: "[3, 2, 1]\n[3, 2, 1]\n[3, 2, 1]" }),

    H2("Nuetzliche eingebaute Funktionen"),
    TAB(["Funktion", "Wirkung", "Beispiel"],
      ["`len(x)`", "Anzahl der Elemente", "`len([1,2,3])` gibt `3`"],
      ["`sum(x)`", "Summe", "`sum([1,2,3])` gibt `6`"],
      ["`min(x)` / `max(x)`", "kleinster, groesster Wert", "`max([1,9,3])` gibt `9`"],
      ["`sorted(x)`", "neue sortierte Liste", "`sorted([3,1])` gibt `[1,3]`"],
      ["`any(x)`", "wahr, wenn mindestens eines wahr", "`any([0,1])` gibt `True`"],
      ["`all(x)`", "wahr, wenn alle wahr", "`all([1,1])` gibt `True`"],
      ["`enumerate(x)`", "Position und Element", "siehe Schleifen"],
      ["`zip(a, b)`", "paarweise verzahnen", "siehe Schleifen"],
    ),
    C(`werte = [12, 7, 23, 4, 18]

print(sum(werte), min(werte), max(werte))
print(any(w > 20 for w in werte))
print(all(w > 20 for w in werte))
print(max(werte, key=lambda w: -w))`,
      { aus: "64 4 23\nTrue\nFalse\n4" }),
    P("`any` und `all` beantworten Fragen wie *gibt es mindestens einen* und *gelten alle*. Auch sie brechen fruehzeitig ab, sobald das Ergebnis feststeht."),

    H2("Listen verbinden"),
    C(`a = [1, 2]
b = [3, 4]

print(a + b)
print(a * 3)

a.extend(b)
print(a)`, { aus: "[1, 2, 3, 4]\n[1, 2, 1, 2, 1, 2]\n[1, 2, 3, 4]" }),
    WARN("Die Falle beim Vervielfachen",
      "`[[0] * 3] * 2` erzeugt **nicht** zwei unabhaengige Zeilen. Beide zeigen auf dieselbe innere Liste. Aenderst du eine, aendert sich auch die andere.",
    ),
    C(`falsch = [[0] * 3] * 2
falsch[0][0] = 9
print("falsch:", falsch)

richtig = [[0] * 3 for _ in range(2)]
richtig[0][0] = 9
print("richtig:", richtig)`,
      { aus: "falsch: [[9, 0, 0], [9, 0, 0]]\nrichtig: [[9, 0, 0], [0, 0, 0]]" }),

    H2("Praktisches Beispiel"),
    C(`ergebnisse = [0.72, 0.88, 0.94, 0.50, 0.81]

bestes = max(ergebnisse)
schlechtestes = min(ergebnisse)
schnitt = sum(ergebnisse) / len(ergebnisse)
sortiert = sorted(ergebnisse, reverse=True)

print(f"Beste Guete:      {bestes:.2f}")
print(f"Schlechteste:     {schlechtestes:.2f}")
print(f"Durchschnitt:     {schnitt:.2f}")
print(f"Top drei:         {sortiert[:3]}")
print(f"Alle ueber 0.7:   {all(e > 0.7 for e in ergebnisse)}")`,
      { aus: "Beste Guete:      0.94\nSchlechteste:     0.50\nDurchschnitt:     0.77\nTop drei:         [0.94, 0.88, 0.81]\nAlle ueber 0.7:   False" }),
  ],
  quiz: [
    Q("Was gibt `liste.sort()` zurueck?",
      ["Die sortierte Liste", "`None`", "Eine Kopie", "Die Anzahl der Elemente"], 1,
      "`sort` sortiert an Ort und Stelle und gibt nichts zurueck. Fuer eine neue Liste nimmst du `sorted`."),
    Q("Was steht nach diesem Code in `a`?",
      ["`[1, 2, 3]`", "`[3, 2, 1]`", "`None`", "`[1, 3, 2]`"], 0,
      "`sorted` laesst das Original unangetastet. Nur `b` enthaelt die sortierte Fassung.",
      `a = [3, 1, 2]\nb = sorted(a)`),
    Q("Wie sortierst du absteigend?",
      ["`sorted(x, desc=True)`", "`sorted(x, reverse=True)`", "`sorted(x).reverse()`", "`sorted(x, -1)`"], 1,
      "Das Schluesselwort heisst `reverse`. Alternativ sortierst du aufsteigend und drehst danach um."),
    Q("Was macht das Argument `key` beim Sortieren?",
      ["Es gibt an, welche Position verglichen wird",
       "Es liefert zu jedem Element den Wert, nach dem sortiert wird",
       "Es waehlt den Sortieralgorithmus",
       "Es entfernt doppelte Werte"],
      1,
      "`key` ist eine Funktion. Sortiert wird nach ihrem Ergebnis, ausgegeben werden die Originalelemente."),
    Q("Was ergibt `all([])`, also all auf einer leeren Liste?",
      ["True", "False", "None", "Ein Fehler"], 0,
      "Es gibt kein Element, das die Bedingung verletzt, also ist die Aussage wahr. `any([])` ist dagegen `False`."),
    Q("Warum ist `[[0] * 3] * 2` problematisch?",
      ["Es ist zu langsam",
       "Beide Zeilen sind dasselbe Objekt",
       "Es gibt einen TypeError",
       "Die Laenge stimmt nicht"],
      1,
      "Das aeussere Vervielfachen kopiert nur den Verweis. Beide Zeilen zeigen auf dieselbe innere Liste."),
  ],
  aufgaben: [
    {
      id: "a13-1",
      titel: "Rangliste erstellen",
      text: [P("Sortiere `laeufer` nach der Zeit, aufsteigend, und gib die Rangliste aus:"),
             ROH("1. Grace   9.58 s\n2. Ada    10.12 s\n3. Alan   11.40 s")],
      start: `laeufer = [("Ada", 10.12), ("Alan", 11.40), ("Grace", 9.58)]

rangliste = 

for platz, (name, zeit) in enumerate(rangliste, start=1):
    print()`,
      tipps: ["`sorted` mit `key=lambda x: x[1]` sortiert nach dem zweiten Wert.",
              "Die Namen belegen 7 Zeichen linksbuendig.",
              "`f\"{platz}. {name:<7}{zeit:>5.2f} s\"`"],
      loesung: `laeufer = [("Ada", 10.12), ("Alan", 11.40), ("Grace", 9.58)]

rangliste = sorted(laeufer, key=lambda x: x[1])

for platz, (name, zeit) in enumerate(rangliste, start=1):
    print(f"{platz}. {name:<7}{zeit:>5.2f} s")`,
      tests: [
        T("Die Reihenfolge stimmt", `assert [n for n, _ in rangliste] == ["Grace", "Ada", "Alan"], f"Reihenfolge: {[n for n,_ in rangliste]}"`),
        T("Es sind drei Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 3`),
        T("Die erste Zeile stimmt", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[0] == "1. Grace   9.58 s", f"Zeile war: {zeilen[0]!r}"`),
        T("Das Original blieb unangetastet", `assert laeufer[0][0] == "Ada", "Nutze sorted statt sort, damit das Original bleibt"`),
      ],
    },
    {
      id: "a13-2",
      titel: "Zwei Listen auswerten",
      text: [P("Zu jedem Namen gehoert eine Punktzahl. Gib aus:"),
             L("wer die meisten Punkte hat",
               "ob alle mehr als 50 Punkte haben",
               "den Durchschnitt mit einer Nachkommastelle"),
             P("Erwartete Ausgabe:"),
             ROH("Bester: Grace\nAlle ueber 50: False\nDurchschnitt: 67.8")],
      start: `namen = ["Ada", "Grace", "Alan", "Linus"]
punkte = [72, 95, 48, 56]

bester = 
alle_ueber = 
schnitt = 

print(f"Bester: {bester}")
print(f"Alle ueber 50: {alle_ueber}")
print(f"Durchschnitt: {schnitt:.1f}")`,
      tipps: ["`zip(namen, punkte)` verzahnt beide Listen.",
              "`max(..., key=lambda p: p[1])` findet das Paar mit der hoechsten Punktzahl.",
              "`all(p > 50 for p in punkte)` prueft alle auf einmal."],
      loesung: `namen = ["Ada", "Grace", "Alan", "Linus"]
punkte = [72, 95, 48, 56]

bester = max(zip(namen, punkte), key=lambda p: p[1])[0]
alle_ueber = all(p > 50 for p in punkte)
schnitt = sum(punkte) / len(punkte)

print(f"Bester: {bester}")
print(f"Alle ueber 50: {alle_ueber}")
print(f"Durchschnitt: {schnitt:.1f}")`,
      tests: [
        T("Der Beste stimmt", `assert bester == "Grace", f"bester war {bester!r}"`),
        T("Die Pruefung stimmt", `assert alle_ueber is False, f"alle_ueber war {alle_ueber!r}"`),
        T("Der Durchschnitt stimmt", `assert abs(schnitt - 67.75) < 1e-9, f"schnitt war {schnitt}"`),
        T("Die Ausgabe stimmt", `assert "Bester: Grace" in AUSGABE and "Durchschnitt: 67.8" in AUSGABE, f"Ausgabe war: {AUSGABE!r}"`),
      ],
    },
  ],
});

M3.push({
  id: "l-tupel",
  titel: "Tupel und Entpacken",
  dauer: 13,
  vorspann: "Ein Tupel ist eine Liste, die sich nicht mehr aendern laesst. Das klingt nach einer Einschraenkung, ist aber in vielen Faellen genau richtig.",
  ziele: [
    "Tupel anlegen und von Listen unterscheiden",
    "Werte entpacken, auch mit Stern",
    "Verstehen, warum Unveraenderlichkeit nuetzlich ist",
    "Mehrere Rueckgabewerte aus Funktionen lesen",
  ],
  inhalt: [
    H2("Anlegen"),
    C(`punkt = (3, 7)
farbe = (255, 128, 0)
einzeln = (42,)
ohne_klammern = 3, 7

print(punkt, type(punkt))
print(einzeln, type(einzeln))
print(ohne_klammern)`,
      { aus: "(3, 7) <class 'tuple'>\n(42,) <class 'tuple'>\n(3, 7)" }),
    WARN("Das Komma macht das Tupel",
      "`(42)` ist einfach die Zahl 42 in Klammern. Erst `(42,)` mit Komma ist ein Tupel mit einem Element. Dieser Stolperstein kostet regelmaessig Zeit.",
    ),
    C(`print(type((42)))
print(type((42,)))`, { aus: "<class 'int'>\n<class 'tuple'>" }),

    H2("Unveraenderlich"),
    C(`punkt = (3, 7)
punkt[0] = 99`),
    P("Genau darin liegt der Nutzen: ein Tupel kann sich nicht hinter deinem Ruecken aendern. Wo Daten zusammengehoeren und fest bleiben sollen, ist es die bessere Wahl."),
    TAB(["", "Liste", "Tupel"],
      ["Schreibweise", "`[1, 2, 3]`", "`(1, 2, 3)`"],
      ["Veraenderbar", "ja", "nein"],
      ["Als Schluessel im Dictionary", "nein", "ja"],
      ["Speicherbedarf", "groesser", "kleiner"],
      ["Typischer Einsatz", "Sammlung gleichartiger Dinge", "feste Zusammengehoerigkeit"],
    ),
    P("Faustregel: Eine Liste enthaelt *viele Dinge derselben Art*. Ein Tupel enthaelt *ein Ding mit mehreren Bestandteilen*. Eine Liste von Messwerten, aber ein Tupel aus Breitengrad und Laengengrad."),

    H2("Entpacken"),
    C(`punkt = (3, 7)
x, y = punkt
print(x, y)

rot, gruen, blau = (255, 128, 0)
print(f"Rot: {rot}, Gruen: {gruen}, Blau: {blau}")`,
      { aus: "3 7\nRot: 255, Gruen: 128, Blau: 0" }),
    P("Passt die Anzahl nicht, gibt es einen Fehler. Fuer den Rest gibt es den Stern:"),
    C(`werte = (1, 2, 3, 4, 5)

erster, *rest = werte
print(erster, rest)

erster, *mitte, letzter = werte
print(erster, mitte, letzter)

*anfang, letzter = werte
print(anfang, letzter)`,
      { aus: "1 [2, 3, 4, 5]\n1 [2, 3, 4] 5\n[1, 2, 3, 4] 5" }),
    P("Der Teil mit dem Stern wird immer eine **Liste**, auch wenn das Original ein Tupel war."),
    TIPP("Der Unterstrich",
      "Brauchst du einen Wert nicht, nimm einen Unterstrich als Namen: `_, jahr = eintrag`. Das ist keine Sprachregel, sondern eine Vereinbarung unter Entwicklern, die jeder versteht.",
    ),

    H2("Mehrere Rueckgabewerte"),
    P("Funktionen in Python geben streng genommen immer nur einen Wert zurueck. Ist dieser Wert ein Tupel, wirkt es wie mehrere."),
    C(`def teile_mit_rest(a, b):
    return a // b, a % b

ganz, rest = teile_mit_rest(17, 5)
print(f"17 geteilt durch 5 ist {ganz} Rest {rest}")

ergebnis = teile_mit_rest(17, 5)
print(ergebnis, type(ergebnis))`,
      { aus: "17 geteilt durch 5 ist 3 Rest 2\n(3, 2) <class 'tuple'>" }),
    P("Die eingebaute Funktion `divmod` macht genau dasselbe. Und `enumerate` liefert in jedem Durchlauf ein Tupel aus Position und Element, das du beim Schreiben von `for i, wert in ...` entpackst."),

    H2("Tupel in Sammlungen"),
    C(`messungen = [
    ("2024-01", 21.4, 62),
    ("2024-02", 19.8, 71),
    ("2024-03", 24.1, 55),
]

for monat, temperatur, feuchte in messungen:
    print(f"{monat}: {temperatur:>5.1f} Grad, {feuchte:>3} Prozent")`,
      { aus: "2024-01:  21.4 Grad,  62 Prozent\n2024-02:  19.8 Grad,  71 Prozent\n2024-03:  24.1 Grad,  55 Prozent" }),
    P("Dieses Muster begegnet dir staendig: eine Liste von Tupeln als einfache Tabelle. Sobald die Zeilen aber mehr als drei oder vier Felder haben, ist eine Klasse oder ein `dataclass` die bessere Wahl, weil Namen dann klarer sind als Positionen."),
  ],
  quiz: [
    Q("Wie legst du ein Tupel mit einem einzigen Element an?",
      ["`(42)`", "`(42,)`", "`[42]`", "`tuple(42)`"], 1,
      "Das Komma macht das Tupel. Ohne Komma sind die Klammern nur eine Gruppierung."),
    Q("Was passiert bei `punkt[0] = 5` fuer ein Tupel `punkt`?",
      ["Der Wert wird gesetzt", "Ein TypeError", "Ein IndexError", "Nichts passiert"], 1,
      "Tupel sind unveraenderlich. Python meldet, dass die Zuweisung nicht unterstuetzt wird."),
    Q("Was steht nach `a, *b = (1, 2, 3)` in `b`?",
      ["`2`", "`(2, 3)`", "`[2, 3]`", "`3`"], 2,
      "Der Teil mit dem Stern wird immer eine Liste, unabhaengig vom Typ der Quelle."),
    Q("Warum kann ein Tupel als Schluessel in einem Dictionary dienen, eine Liste aber nicht?",
      ["Weil Tupel kuerzer sind",
       "Weil Tupel unveraenderlich sind und damit einen festen Hashwert haben",
       "Weil Listen zu langsam sind",
       "Das stimmt nicht, beides geht"],
      1,
      "Schluessel muessen hashbar sein. Das setzt voraus, dass sich der Wert nicht mehr aendert."),
    Q("Was gibt eine Funktion mit `return a, b` zurueck?",
      ["Zwei getrennte Werte", "Ein Tupel mit beiden Werten", "Eine Liste", "Nur a"], 1,
      "Python packt beide Werte in ein Tupel. Beim Empfangen kannst du es direkt entpacken."),
  ],
  aufgaben: [
    {
      id: "a14-1",
      titel: "Mit Tupeln arbeiten",
      text: [P("Schreibe eine Funktion `zerlege(punkte)`, die aus einer Liste von Zahlen ein Tupel aus drei Werten zurueckgibt: kleinster Wert, groesster Wert und Durchschnitt."),
             P("Entpacke das Ergebnis danach in drei Variablen und gib es aus:"),
             ROH("Min 4, Max 42, Schnitt 19.4")],
      start: `def zerlege(punkte):
    return 

werte = [12, 23, 4, 42, 16]

klein, gross, schnitt = zerlege(werte)
print(f"Min {klein}, Max {gross}, Schnitt {schnitt:.1f}")`,
      tipps: ["`min`, `max` und die Summe geteilt durch die Laenge.",
              "Gib alle drei mit Komma getrennt zurueck.",
              "`return min(punkte), max(punkte), sum(punkte) / len(punkte)`"],
      loesung: `def zerlege(punkte):
    return min(punkte), max(punkte), sum(punkte) / len(punkte)

werte = [12, 23, 4, 42, 16]

klein, gross, schnitt = zerlege(werte)
print(f"Min {klein}, Max {gross}, Schnitt {schnitt:.1f}")`,
      tests: [
        T("Die Funktion gibt ein Tupel zurueck", `e = zerlege([1, 2, 3])\nassert isinstance(e, tuple), f"Zurueck kam: {type(e).__name__}"`),
        T("Das Tupel hat drei Werte", `assert len(zerlege([1, 2, 3])) == 3`),
        T("Die Werte stimmen", `assert zerlege([1, 2, 3]) == (1, 3, 2.0), f"Ergebnis: {zerlege([1,2,3])}"`),
        T("Die Ausgabe stimmt", `assert AUSGABE.strip() == "Min 4, Max 42, Schnitt 19.4", f"Ausgabe war: {AUSGABE.strip()!r}"`),
      ],
    },
    {
      id: "a14-2",
      titel: "Erstes und letztes trennen",
      text: [P("Trenne aus `zeile` den ersten und den letzten Wert ab. Alles dazwischen soll in `mitte` landen."),
             P("Erwartete Ausgabe:"),
             ROH("Erster: Datum\nMitte: ['Temperatur', 'Feuchte', 'Druck']\nLetzter: Notiz")],
      start: `zeile = ("Datum", "Temperatur", "Feuchte", "Druck", "Notiz")

erster, mitte, letzter = 

print(f"Erster: {erster}")
print(f"Mitte: {mitte}")
print(f"Letzter: {letzter}")`,
      tipps: ["Der Stern faengt beliebig viele Werte ein.",
              "Er darf nur einmal auf der linken Seite stehen.",
              "`erster, *mitte, letzter = zeile`"],
      loesung: `zeile = ("Datum", "Temperatur", "Feuchte", "Druck", "Notiz")

erster, *mitte, letzter = zeile

print(f"Erster: {erster}")
print(f"Mitte: {mitte}")
print(f"Letzter: {letzter}")`,
      tests: [
        T("Der erste Wert stimmt", `assert erster == "Datum", f"erster war {erster!r}"`),
        T("Der letzte Wert stimmt", `assert letzter == "Notiz", f"letzter war {letzter!r}"`),
        T("Die Mitte ist eine Liste mit drei Werten", `assert mitte == ["Temperatur", "Feuchte", "Druck"], f"mitte war {mitte!r}"`),
        T("Es wurde mit dem Stern entpackt", `assert "*" in QUELLE, "Nutze die Entpackung mit Stern"`),
      ],
    },
  ],
});

M3.push({
  id: "l-dicts",
  titel: "Dictionaries",
  dauer: 20,
  vorspann: "Ein Dictionary ordnet Schluessel Werten zu. Es ist nach der Liste die wichtigste Datenstruktur in Python und liegt intern fast allem zugrunde, was die Sprache tut.",
  ziele: [
    "Dictionaries anlegen, lesen und veraendern",
    "Fehlende Schluessel sicher behandeln",
    "Ueber Schluessel, Werte und Paare laufen",
    "Verschachtelte Strukturen verarbeiten",
  ],
  inhalt: [
    H2("Anlegen und zugreifen"),
    C(`person = {
    "name": "Ada Lovelace",
    "geboren": 1815,
    "fach": "Mathematik",
}

print(person["name"])
print(person["geboren"])
print(len(person))`, { aus: "Ada Lovelace\n1815\n3" }),
    P("Der Zugriff erfolgt ueber den Schluessel, nicht ueber eine Position. Das ist der entscheidende Unterschied zur Liste: du fragst nach einem Namen, nicht nach einer Stelle."),
    P("Schluessel muessen unveraenderlich sein. Zeichenketten, Zahlen und Tupel sind erlaubt, Listen nicht."),

    H2("Fehlende Schluessel"),
    C(`person = {"name": "Ada", "geboren": 1815}
print(person["beruf"])`),
    P("Das ist der haeufigste Fehler im Umgang mit Dictionaries. Es gibt drei saubere Wege, ihn zu vermeiden:"),
    C(`person = {"name": "Ada", "geboren": 1815}

print(person.get("beruf"))
print(person.get("beruf", "unbekannt"))
print("beruf" in person)

if "geboren" in person:
    print(person["geboren"])`,
      { aus: "None\nunbekannt\nFalse\n1815" }),
    TAB(["Weg", "Bei fehlendem Schluessel", "Wann nutzen"],
      ["`d[\"k\"]`", "`KeyError`", "wenn der Schluessel da sein **muss**"],
      ["`d.get(\"k\")`", "`None`", "wenn ein Fehlen normal ist"],
      ["`d.get(\"k\", vorgabe)`", "die Vorgabe", "wenn du einen Ersatzwert hast"],
      ["`\"k\" in d`", "`False`", "wenn du nur pruefen willst"],
    ),
    MERKE("Bewusst entscheiden",
      "Ein `KeyError` ist nicht immer schlecht. Wenn ein Schluessel zwingend da sein muss, ist ein lauter Fehler besser als ein stilles `None`, das sich erst zehn Zeilen spaeter als Problem zeigt.",
    ),

    H2("Veraendern"),
    C(`bestand = {"Aepfel": 12, "Birnen": 5}

bestand["Kirschen"] = 30
bestand["Aepfel"] = 15
bestand["Birnen"] += 3

print(bestand)

entfernt = bestand.pop("Birnen")
print(entfernt, bestand)

del bestand["Kirschen"]
print(bestand)`,
      { aus: "{'Aepfel': 15, 'Birnen': 8, 'Kirschen': 30}\n8 {'Aepfel': 15, 'Kirschen': 30}\n{'Aepfel': 15}" }),
    P("Eine Zuweisung an einen neuen Schluessel legt ihn an, eine an einen vorhandenen ueberschreibt ihn. Es gibt keinen Unterschied in der Schreibweise."),

    H2("Durchlaufen"),
    C(`noten = {"Ada": 1.3, "Grace": 1.0, "Alan": 1.7}

for name in noten:
    print(name, end=" ")
print()

for note in noten.values():
    print(note, end=" ")
print()

for name, note in noten.items():
    print(f"{name}: {note}")`,
      { aus: "Ada Grace Alan \n1.3 1.0 1.7 \nAda: 1.3\nGrace: 1.0\nAlan: 1.7" }),
    P("Laeufst du direkt ueber ein Dictionary, bekommst du die **Schluessel**. Fuer beides zugleich nimmst du `items()`. Das ist der haeufigste Fall."),
    HINWEIS("Reihenfolge",
      "Seit Python 3.7 behalten Dictionaries die Reihenfolge, in der Schluessel eingefuegt wurden. Frueher war das nicht garantiert. Verlasse dich trotzdem nur darauf, wenn du es wirklich brauchst.",
    ),

    H2("Zaehlen und gruppieren"),
    P("Der haeufigste Einsatz eines Dictionaries ueberhaupt:"),
    C(`text = "das ist ein test und das ist gut"
haeufigkeit = {}

for wort in text.split():
    haeufigkeit[wort] = haeufigkeit.get(wort, 0) + 1

for wort, anzahl in sorted(haeufigkeit.items(), key=lambda p: -p[1]):
    print(f"{wort:<6}{anzahl}")`,
      { aus: "das   2\nist   2\nein   1\ntest  1\nund   1\ngut   1" }),
    P("`get(wort, 0) + 1` ist das Standardmuster: nimm den bisherigen Zaehler oder null, und erhoehe ihn. Fuer genau diesen Fall gibt es auch eine fertige Loesung:"),
    C(`from collections import Counter

text = "das ist ein test und das ist gut"
zaehler = Counter(text.split())

print(zaehler.most_common(3))
print(zaehler["das"])`,
      { aus: "[('das', 2), ('ist', 2), ('ein', 1)]\n2" }),

    H2("Zusammenfuegen und aufbauen"),
    C(`vorgaben = {"lernrate": 0.01, "epochen": 10, "stapelgroesse": 32}
eigene = {"epochen": 50}

zusammen = {**vorgaben, **eigene}
print(zusammen)

vorgaben.update(eigene)
print(vorgaben)`,
      { aus: "{'lernrate': 0.01, 'epochen': 50, 'stapelgroesse': 32}\n{'lernrate': 0.01, 'epochen': 50, 'stapelgroesse': 32}" }),
    P("Bei Ueberschneidungen gewinnt das zuletzt genannte. Dieses Muster nutzt du staendig, um Vorgabewerte mit eigenen Einstellungen zu ueberschreiben."),

    H2("Verschachtelte Strukturen"),
    P("Dictionaries und Listen lassen sich beliebig ineinander stecken. So sieht praktisch jede Konfigurationsdatei und jede Antwort einer Programmierschnittstelle aus."),
    C(`modell = {
    "name": "Netz A",
    "schichten": [
        {"art": "dicht", "groesse": 128, "aktivierung": "relu"},
        {"art": "dicht", "groesse": 64, "aktivierung": "relu"},
        {"art": "dicht", "groesse": 10, "aktivierung": "softmax"},
    ],
    "training": {"lernrate": 0.001, "epochen": 20},
}

print(modell["name"])
print(modell["training"]["lernrate"])
print(modell["schichten"][0]["groesse"])
print(f"Anzahl Schichten: {len(modell['schichten'])}")

for i, schicht in enumerate(modell["schichten"], 1):
    print(f"  {i}. {schicht['groesse']:>4} Knoten, {schicht['aktivierung']}")`,
      { aus: "Netz A\n0.001\n128\nAnzahl Schichten: 3\n  1.  128 Knoten, relu\n  2.   64 Knoten, relu\n  3.   10 Knoten, softmax" }),
    TIPP("Achte auf die Anfuehrungszeichen",
      "Im f-String steht der Zugriff in einfachen Anfuehrungszeichen, wenn der String selbst in doppelten steht. Sonst bricht Python die Zeichenkette an der falschen Stelle ab.",
    ),
  ],
  quiz: [
    Q("Was passiert bei `d[\"fehlt\"]`, wenn der Schluessel nicht existiert?",
      ["Es wird None zurueckgegeben", "Ein KeyError", "Der Schluessel wird angelegt", "Ein IndexError"], 1,
      "Der direkte Zugriff verlangt den Schluessel. Fuer einen sanften Zugriff nimmst du `get`."),
    Q("Was gibt `d.get(\"fehlt\", 0)` zurueck?",
      ["None", "0", "Einen KeyError", "False"], 1,
      "Der zweite Wert ist die Vorgabe fuer den Fall, dass der Schluessel fehlt."),
    Q("Was liefert eine for-Schleife direkt ueber ein Dictionary?",
      ["Die Werte", "Die Schluessel", "Paare aus beidem", "Einen Fehler"], 1,
      "Direktes Durchlaufen gibt die Schluessel. Fuer Paare nimmst du `items()`."),
    Q("Welcher Typ kann **nicht** als Schluessel dienen?",
      ["str", "int", "tuple", "list"], 3,
      "Schluessel muessen unveraenderlich sein. Eine Liste kann sich aendern und ist deshalb nicht hashbar."),
    Q("Was gibt dieser Code aus?",
      ["`{'a': 1, 'b': 2}`", "`{'a': 1, 'b': 3}`", "`{'a': 1, 'b': 2, 'b': 3}`", "Ein Fehler"], 1,
      "Bei doppelten Schluesseln gewinnt der zuletzt genannte. Ein Schluessel kommt nur einmal vor.",
      `d = {**{"a": 1, "b": 2}, **{"b": 3}}\nprint(d)`),
    Q("Wie zaehlst du Vorkommen in einem Dictionary am kuerzesten?",
      ["`d[x] = d[x] + 1`", "`d[x] = d.get(x, 0) + 1`", "`d.append(x)`", "`d[x] += 1`"], 1,
      "Nur `get` mit Vorgabe funktioniert auch beim ersten Vorkommen, wenn der Schluessel noch fehlt."),
  ],
  aufgaben: [
    {
      id: "a15-1",
      titel: "Buchstaben zaehlen",
      text: [P("Zaehle, wie oft jeder Buchstabe in `wort` vorkommt, und gib die Zaehlung sortiert nach Buchstabe aus:"),
             ROH("a: 5\nb: 2\nd: 1\nk: 1\nr: 2")],
      start: `wort = "abrakadabra"

zaehler = {}

# hier zaehlen

for buchstabe in sorted(zaehler):
    print(f"{buchstabe}: {zaehler[buchstabe]}")`,
      tipps: ["Laufe mit einer Schleife ueber die Zeichen des Wortes.",
              "`zaehler.get(b, 0)` liefert den bisherigen Stand oder null.",
              "`zaehler[b] = zaehler.get(b, 0) + 1`"],
      loesung: `wort = "abrakadabra"

zaehler = {}

for buchstabe in wort:
    zaehler[buchstabe] = zaehler.get(buchstabe, 0) + 1

for buchstabe in sorted(zaehler):
    print(f"{buchstabe}: {zaehler[buchstabe]}")`,
      tests: [
        T("Die Zaehlung stimmt", `assert zaehler == {"a": 5, "b": 2, "r": 2, "k": 1, "d": 1}, f"zaehler war: {zaehler}"`),
        T("Es sind fuenf Zeilen", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert len(zeilen) == 5, f"Gefunden: {len(zeilen)} Zeilen"`),
        T("Die erste Zeile stimmt", `zeilen = [z.strip() for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[0] == "a: 5", f"Zeile war: {zeilen[0]!r}"`),
      ],
    },
    {
      id: "a15-2",
      titel: "Einstellungen zusammenfuehren",
      text: [P("Schreibe eine Funktion `verschmelze(vorgaben, eigene)`, die beide Dictionaries zusammenfuehrt. Werte aus `eigene` sollen gewinnen. Beide Ausgangsdictionaries duerfen sich dabei **nicht** aendern.")],
      start: `def verschmelze(vorgaben, eigene):
    return 

standard = {"lernrate": 0.01, "epochen": 10, "stapel": 32}
meine = {"epochen": 100, "abbruch": True}

ergebnis = verschmelze(standard, meine)
print(ergebnis)
print(standard)`,
      tipps: ["Die Stern-Stern-Schreibweise entpackt ein Dictionary in ein neues.",
              "`{**a, **b}` legt ein neues Dictionary an, in dem b gewinnt.",
              "`update` wuerde das erste Dictionary veraendern, das willst du hier nicht."],
      loesung: `def verschmelze(vorgaben, eigene):
    return {**vorgaben, **eigene}

standard = {"lernrate": 0.01, "epochen": 10, "stapel": 32}
meine = {"epochen": 100, "abbruch": True}

ergebnis = verschmelze(standard, meine)
print(ergebnis)
print(standard)`,
      tests: [
        T("Die eigenen Werte gewinnen", `e = verschmelze({"a": 1, "b": 2}, {"b": 9})\nassert e["b"] == 9, f"b war {e['b']}"`),
        T("Neue Schluessel kommen dazu", `e = verschmelze({"a": 1}, {"c": 3})\nassert e == {"a": 1, "c": 3}, f"Ergebnis: {e}"`),
        T("Die Vorgaben bleiben unveraendert", `v = {"a": 1}\nverschmelze(v, {"a": 9})\nassert v == {"a": 1}, f"vorgaben wurde veraendert: {v}"`),
        T("Die eigenen bleiben unveraendert", `m = {"a": 9}\nverschmelze({"a": 1}, m)\nassert m == {"a": 9}, "eigene wurde veraendert"`),
      ],
    },
    {
      id: "a15-3",
      titel: "Verschachtelte Daten auslesen",
      text: [P("Aus `bericht` sollen drei Angaben ausgelesen und ausgegeben werden:"),
             ROH("Modell: Netz B\nEpochen: 40\nGroesste Schicht: 256")],
      start: `bericht = {
    "name": "Netz B",
    "schichten": [
        {"groesse": 64},
        {"groesse": 256},
        {"groesse": 32},
    ],
    "training": {"lernrate": 0.005, "epochen": 40},
}

name = 
epochen = 
groesste = 

print(f"Modell: {name}")
print(f"Epochen: {epochen}")
print(f"Groesste Schicht: {groesste}")`,
      tipps: ["Fuer die Epochen gehst du zwei Ebenen tief.",
              "Fuer die groesste Schicht brauchst du `max` mit einem Ausdruck ueber alle Schichten.",
              "`max(s[\"groesse\"] for s in bericht[\"schichten\"])`"],
      loesung: `bericht = {
    "name": "Netz B",
    "schichten": [
        {"groesse": 64},
        {"groesse": 256},
        {"groesse": 32},
    ],
    "training": {"lernrate": 0.005, "epochen": 40},
}

name = bericht["name"]
epochen = bericht["training"]["epochen"]
groesste = max(s["groesse"] for s in bericht["schichten"])

print(f"Modell: {name}")
print(f"Epochen: {epochen}")
print(f"Groesste Schicht: {groesste}")`,
      tests: [
        T("Der Name stimmt", `assert name == "Netz B", f"name war {name!r}"`),
        T("Die Epochen stimmen", `assert epochen == 40, f"epochen war {epochen}"`),
        T("Die groesste Schicht stimmt", `assert groesste == 256, f"groesste war {groesste}"`),
        T("Es wurde nicht abgeschrieben", `assert "= 256" not in QUELLE.replace("\\"groesse\\": 256", ""), "Lies den Wert aus den Daten aus"`),
      ],
    },
  ],
});

M3.push({
  id: "l-mengen",
  titel: "Mengen",
  dauer: 13,
  vorspann: "Eine Menge kennt jeden Wert nur einmal und hat keine Reihenfolge. Das klingt nach wenig, loest aber eine ganze Klasse von Aufgaben in einer einzigen Zeile.",
  ziele: [
    "Mengen anlegen und von Listen abgrenzen",
    "Doppelte Werte entfernen",
    "Schnittmenge, Vereinigung und Differenz bilden",
    "Wissen, wann eine Menge schneller ist als eine Liste",
  ],
  inhalt: [
    H2("Anlegen"),
    C(`zahlen = {3, 1, 4, 1, 5, 9, 2, 6, 5}
print(zahlen)
print(len(zahlen))

leer = set()
print(type(leer))
print(type({}))`,
      { aus: "{1, 2, 3, 4, 5, 6, 9}\n7\n<class 'set'>\n<class 'dict'>" }),
    WARN("Die leere Menge",
      "`{}` ist ein leeres **Dictionary**, keine leere Menge. Fuer eine leere Menge brauchst du `set()`.",
    ),
    P("Doppelte Werte verschwinden beim Anlegen. Genau das ist der haeufigste Einsatz:"),
    C(`namen = ["Ada", "Grace", "Ada", "Alan", "Grace", "Ada"]

eindeutig = set(namen)
print(len(eindeutig), "verschiedene Namen")

zurueck = sorted(eindeutig)
print(zurueck)`,
      { aus: "3 verschiedene Namen\n['Ada', 'Alan', 'Grace']" }),
    HINWEIS("Die Reihenfolge ist nicht festgelegt",
      "Eine Menge hat keine Ordnung. Die Anzeige kann sich zwischen Programmlaeufen unterscheiden. Brauchst du eine feste Reihenfolge, gib `sorted(menge)` aus.",
    ),

    H2("Mengenoperationen"),
    C(`a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

print(a | b)
print(a & b)
print(a - b)
print(a ^ b)`,
      { aus: "{1, 2, 3, 4, 5, 6}\n{3, 4}\n{1, 2}\n{1, 2, 5, 6}" }),
    TAB(["Zeichen", "Name", "Bedeutung", "Methode"],
      ["`|`", "Vereinigung", "alles aus beiden", "`a.union(b)`"],
      ["`&`", "Schnittmenge", "was in beiden ist", "`a.intersection(b)`"],
      ["`-`", "Differenz", "was nur in a ist", "`a.difference(b)`"],
      ["`^`", "symmetrische Differenz", "was nur in einem ist", "`a.symmetric_difference(b)`"],
    ),
    P("Ein Beispiel aus der Praxis: welche Merkmale fehlen in meinen Daten?"),
    C(`erwartet = {"alter", "einkommen", "plz", "beruf", "kinder"}
vorhanden = {"alter", "plz", "beruf", "geschlecht"}

print("Fehlt:      ", sorted(erwartet - vorhanden))
print("Unerwartet: ", sorted(vorhanden - erwartet))
print("Nutzbar:    ", sorted(erwartet & vorhanden))`,
      { aus: "Fehlt:       ['einkommen', 'kinder']\nUnerwartet:  ['geschlecht']\nNutzbar:     ['alter', 'beruf', 'plz']" }),

    H2("Veraendern und pruefen"),
    C(`menge = {1, 2, 3}

menge.add(4)
menge.add(2)
print(menge)

menge.discard(1)
menge.discard(99)
print(menge)

print(3 in menge)
print({2, 3} <= menge)`,
      { aus: "{1, 2, 3, 4}\n{2, 3, 4}\nTrue\nTrue" }),
    P("`discard` entfernt ohne Fehler, auch wenn der Wert gar nicht da ist. `remove` wuerde bei einem fehlenden Wert einen `KeyError` werfen. Das Kleinergleich prueft, ob eine Menge Teilmenge einer anderen ist."),

    H2("Warum Mengen schnell sind"),
    P("Das ist der eigentliche Grund, warum es Mengen gibt. Um zu pruefen, ob ein Wert in einer **Liste** steckt, muss Python im schlimmsten Fall jedes Element anschauen. Bei einer **Menge** berechnet es aus dem Wert direkt die Stelle, an der er liegen muesste."),
    TAB(["Aufgabe", "Liste", "Menge"],
      ["`x in sammlung`", "waechst mit der Groesse", "gleich schnell, egal wie gross"],
      ["Reihenfolge", "bleibt erhalten", "keine"],
      ["Doppelte Werte", "erlaubt", "unmoeglich"],
      ["Zugriff ueber Position", "ja", "nein"],
    ),
    C(`import time

viele = list(range(200_000))
als_menge = set(viele)
gesucht = 199_999

start = time.perf_counter()
for _ in range(200):
    gesucht in viele
zeit_liste = time.perf_counter() - start

start = time.perf_counter()
for _ in range(200):
    gesucht in als_menge
zeit_menge = time.perf_counter() - start

print(f"Liste: {zeit_liste:.4f} s")
print(f"Menge: {zeit_menge:.6f} s")
print(f"Faktor: rund {int(zeit_liste / max(zeit_menge, 1e-9))}")`,
      { lauf: true, name: "Geschwindigkeitsvergleich" }),
    P("Fuehre das aus. Der Unterschied liegt meist beim Tausendfachen oder mehr. Wenn du in einer Schleife oft pruefst, ob ein Wert enthalten ist, wandle die Sammlung vorher in eine Menge um."),
    MERKE("Die Faustregel",
      "Brauchst du Reihenfolge oder Doppelte, nimm eine Liste. Brauchst du Eindeutigkeit oder viele Enthaltensein-Pruefungen, nimm eine Menge.",
    ),

    H2("Was hineinpasst"),
    C(`erlaubt = {1, "text", (2, 3), True}
print(erlaubt)

nicht_erlaubt = {[1, 2]}`),
    P("Wie bei Dictionary-Schluesseln muessen die Elemente unveraenderlich sein. Listen gehen deshalb nicht, Tupel schon."),
  ],
  quiz: [
    Q("Was gibt `len({1, 2, 2, 3, 3, 3})` zurueck?",
      ["6", "3", "1", "Einen Fehler"], 1,
      "Eine Menge kennt jeden Wert nur einmal. Uebrig bleiben 1, 2 und 3."),
    Q("Wie legst du eine leere Menge an?",
      ["`{}`", "`set()`", "`[]`", "`()`"], 1,
      "`{}` ist ein leeres Dictionary. Fuer die leere Menge gibt es nur `set()`."),
    Q("Was ergibt `{1, 2, 3} & {2, 3, 4}`?",
      ["`{1, 2, 3, 4}`", "`{2, 3}`", "`{1, 4}`", "`{1}`"], 1,
      "Das Und-Zeichen bildet die Schnittmenge, also die Werte in beiden Mengen."),
    Q("Warum ist `x in menge` schneller als `x in liste`?",
      ["Weil Mengen sortiert sind",
       "Weil die Stelle direkt aus dem Wert berechnet wird",
       "Weil Mengen kleiner sind",
       "Das stimmt nicht, beide sind gleich schnell"],
      1,
      "Eine Menge nutzt Hashwerte. Die Suchdauer haengt praktisch nicht von der Groesse ab, waehrend eine Liste durchlaufen werden muss."),
    Q("Was kann **nicht** in einer Menge liegen?",
      ["Eine Zahl", "Ein Tupel", "Eine Liste", "Eine Zeichenkette"], 2,
      "Elemente muessen unveraenderlich sein. Eine Liste kann sich aendern, ein Tupel nicht."),
  ],
  aufgaben: [
    {
      id: "a16-1",
      titel: "Doppelte entfernen und ordnen",
      text: [P("Entferne aus `roh` alle doppelten Werte und gib die verbleibenden aufsteigend sortiert als Liste aus."),
             P("Erwartete Ausgabe: `[1, 2, 3, 4, 5, 9]`")],
      start: `roh = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 9]

eindeutig = 

print(eindeutig)`,
      tipps: ["`set(roh)` entfernt die Doppelten.",
              "`sorted(...)` macht daraus eine sortierte Liste.",
              "Beides laesst sich in einer Zeile verbinden."],
      loesung: `roh = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 9]

eindeutig = sorted(set(roh))

print(eindeutig)`,
      tests: [
        T("Das Ergebnis stimmt", `assert eindeutig == [1, 2, 3, 4, 5, 6, 9], f"eindeutig war: {eindeutig}"`),
        T("Es ist eine Liste", `assert isinstance(eindeutig, list), f"Typ war: {type(eindeutig).__name__}"`),
        T("Es wurde eine Menge benutzt", `assert "set(" in QUELLE, "Nutze set zum Entfernen der Doppelten"`),
      ],
    },
    {
      id: "a16-2",
      titel: "Merkmale abgleichen",
      text: [P("Vergleiche die erwarteten mit den vorhandenen Merkmalen und gib drei Zeilen aus:"),
             ROH("Fehlend: ['einkommen', 'kinder']\nZusaetzlich: ['geschlecht']\nGemeinsam: 3")],
      start: `erwartet = {"alter", "einkommen", "plz", "beruf", "kinder"}
vorhanden = {"alter", "plz", "beruf", "geschlecht"}

fehlend = 
zusaetzlich = 
gemeinsam = 

print(f"Fehlend: {fehlend}")
print(f"Zusaetzlich: {zusaetzlich}")
print(f"Gemeinsam: {gemeinsam}")`,
      tipps: ["Fehlend sind die, die erwartet, aber nicht vorhanden sind.",
              "Nutze das Minuszeichen fuer die Differenz und das Und-Zeichen fuer die Schnittmenge.",
              "Fuer die Listenausgabe nimm `sorted(...)`, fuer die Anzahl `len(...)`."],
      loesung: `erwartet = {"alter", "einkommen", "plz", "beruf", "kinder"}
vorhanden = {"alter", "plz", "beruf", "geschlecht"}

fehlend = sorted(erwartet - vorhanden)
zusaetzlich = sorted(vorhanden - erwartet)
gemeinsam = len(erwartet & vorhanden)

print(f"Fehlend: {fehlend}")
print(f"Zusaetzlich: {zusaetzlich}")
print(f"Gemeinsam: {gemeinsam}")`,
      tests: [
        T("Die fehlenden Merkmale stimmen", `assert list(fehlend) == ["einkommen", "kinder"], f"fehlend war: {fehlend}"`),
        T("Die zusaetzlichen stimmen", `assert list(zusaetzlich) == ["geschlecht"], f"zusaetzlich war: {zusaetzlich}"`),
        T("Die Anzahl gemeinsamer stimmt", `assert gemeinsam == 3, f"gemeinsam war: {gemeinsam}"`),
        T("Die Ausgabe stimmt", `assert "Gemeinsam: 3" in AUSGABE, f"Ausgabe war: {AUSGABE!r}"`),
      ],
    },
  ],
});

M3.push({
  id: "l-comprehensions",
  titel: "Comprehensions",
  dauer: 17,
  vorspann: "Eine Comprehension baut eine neue Sammlung aus einer bestehenden, in einer einzigen Zeile. Wer Python liest, sieht sie ueberall. Wer sie schreibt, spart sehr viel Platz.",
  ziele: [
    "Listen-Comprehensions schreiben und lesen",
    "Mit Bedingung filtern",
    "Dictionary- und Mengen-Comprehensions einsetzen",
    "Erkennen, wann eine normale Schleife besser ist",
  ],
  inhalt: [
    H2("Von der Schleife zur Comprehension"),
    P("Dieses Muster kennst du bereits: leere Liste anlegen, durchlaufen, anhaengen."),
    C(`quadrate = []
for i in range(1, 6):
    quadrate.append(i ** 2)

print(quadrate)`, { aus: "[1, 4, 9, 16, 25]" }),
    P("Dieselbe Sache als Comprehension:"),
    C(`quadrate = [i ** 2 for i in range(1, 6)]
print(quadrate)`, { aus: "[1, 4, 9, 16, 25]" }),
    P("Der Aufbau ist immer gleich: **was** soll herauskommen, dann **woher** kommen die Werte."),
    ROH(`[  ausdruck   for  element  in  quelle  ]
   was heraus     woher die Werte kommen`),

    H2("Mit Bedingung"),
    C(`zahlen = range(1, 21)

gerade = [z for z in zahlen if z % 2 == 0]
print(gerade)

durch_drei = [z for z in zahlen if z % 3 == 0 and z > 10]
print(durch_drei)`,
      { aus: "[2, 4, 6, 8, 10, 12, 14, 16, 18, 20]\n[12, 15, 18]" }),
    P("Die Bedingung steht **hinter** der Quelle und filtert. Es kommen also weniger Elemente heraus, als hineingehen."),
    P("Eine Bedingung **vor** dem `for` ist etwas ganz anderes: das ist ein bedingter Ausdruck, der jeden Wert umwandelt."),
    C(`zahlen = [-3, 7, -1, 4]

nur_positive = [z for z in zahlen if z > 0]
print(nur_positive)

auf_null = [z if z > 0 else 0 for z in zahlen]
print(auf_null)`, { aus: "[7, 4]\n[0, 7, 0, 4]" }),
    MERKE("Die Faustregel",
      "Steht `if` hinten, filtert es. Steht `if ... else` vorne, waehlt es fuer jedes Element einen Wert. Vorne ohne `else` geht nicht.",
    ),

    H2("Auf Text angewendet"),
    C(`woerter = ["Python", "ist", "eine", "gute", "Sprache"]

laengen = [len(w) for w in woerter]
print(laengen)

gross = [w.upper() for w in woerter if len(w) > 3]
print(gross)

anfangsbuchstaben = "".join(w[0] for w in woerter)
print(anfangsbuchstaben)`,
      { aus: "[6, 3, 4, 4, 7]\n['PYTHON', 'EINE', 'GUTE', 'SPRACHE']\nPiegS" }),

    H2("Dictionary und Menge"),
    C(`woerter = ["Python", "Rust", "Go"]

laengen = {w: len(w) for w in woerter}
print(laengen)

quadrate = {i: i ** 2 for i in range(1, 6)}
print(quadrate)

buchstaben = {z for w in woerter for z in w.lower()}
print(sorted(buchstaben))`,
      { aus: "{'Python': 6, 'Rust': 4, 'Go': 2}\n{1: 1, 2: 4, 3: 9, 4: 16, 5: 25}\n['g', 'h', 'n', 'o', 'p', 'r', 's', 't', 'u', 'y']" }),
    P("Ein haeufiger Anwendungsfall: ein Dictionary umdrehen."),
    C(`nach_name = {"Ada": 1815, "Grace": 1906, "Alan": 1912}
nach_jahr = {jahr: name for name, jahr in nach_name.items()}
print(nach_jahr)`,
      { aus: "{1815: 'Ada', 1906: 'Grace', 1912: 'Alan'}" }),

    H2("Verschachtelt"),
    C(`tabelle = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

flach = [wert for zeile in tabelle for wert in zeile]
print(flach)

verdoppelt = [[wert * 2 for wert in zeile] for zeile in tabelle]
print(verdoppelt)`,
      { aus: "[1, 2, 3, 4, 5, 6, 7, 8, 9]\n[[2, 4, 6], [8, 10, 12], [14, 16, 18]]" }),
    P("Bei zwei `for` gilt: sie stehen in derselben Reihenfolge wie bei verschachtelten Schleifen, also aussen zuerst. Das ist die einzige Stelle, an der Comprehensions wirklich unuebersichtlich werden koennen."),
    WARN("Die Grenze der Lesbarkeit",
      "Eine Comprehension mit zwei Schleifen und zwei Bedingungen ist niemandem zuzumuten. Wenn du beim Lesen stockst, schreib eine normale Schleife. Kuerzer ist nicht dasselbe wie besser.",
    ),

    H2("Generatoren als sparsame Variante"),
    P("Ersetzt du die eckigen Klammern durch runde, entsteht kein fertiges Ergebnis, sondern eine Vorschrift, die Werte einzeln liefert."),
    C(`import sys

liste = [i ** 2 for i in range(100_000)]
erzeuger = (i ** 2 for i in range(100_000))

print(f"Liste:     {sys.getsizeof(liste):>8} Byte")
print(f"Erzeuger:  {sys.getsizeof(erzeuger):>8} Byte")

print(sum(i ** 2 for i in range(1, 5)))`,
      { lauf: true }),
    P("Der Erzeuger belegt konstant wenig Speicher, egal wie viele Werte er liefert. Bei `sum`, `max`, `any` und `all` kannst du die inneren Klammern sogar weglassen. Mehr dazu im Kapitel ueber Generatoren."),

    H2("Ein praktisches Beispiel"),
    C(`messungen = [
    {"station": "Nord", "wert": 21.4, "gueltig": True},
    {"station": "Sued", "wert": -99.0, "gueltig": False},
    {"station": "Ost", "wert": 19.8, "gueltig": True},
    {"station": "West", "wert": 24.1, "gueltig": True},
]

gueltige = [m["wert"] for m in messungen if m["gueltig"]]
namen = [m["station"] for m in messungen if m["wert"] > 20 and m["gueltig"]]

print(f"Gueltige Werte: {gueltige}")
print(f"Ueber 20 Grad:  {namen}")
print(f"Durchschnitt:   {sum(gueltige) / len(gueltige):.1f}")`,
      { aus: "Gueltige Werte: [21.4, 19.8, 24.1]\nUeber 20 Grad:  ['Nord', 'West']\nDurchschnitt:   21.8" }),
    P("Drei Zeilen, die ohne Comprehensions gut fuenfzehn waeren. Genau dafuer sind sie gemacht: filtern und umformen in einem Schritt."),
  ],
  quiz: [
    Q("Was ergibt `[i * 2 for i in range(4)]`?",
      ["`[0, 2, 4, 6]`", "`[2, 4, 6, 8]`", "`[0, 1, 2, 3]`", "`[1, 2, 3, 4]`"], 0,
      "`range(4)` liefert 0 bis 3, jeder Wert wird verdoppelt."),
    Q("Wo steht die Bedingung, die filtert?",
      ["Vor dem Ausdruck", "Hinter der Quelle", "In den Klammern der Quelle", "Beides ist gleich"], 1,
      "Ein `if` am Ende filtert. Ein `if ... else` vorne waehlt dagegen fuer jedes Element einen Wert."),
    Q("Was ergibt dieser Ausdruck?",
      ["`[1, 3]`", "`[0, 1, 0, 3]`", "`[1, 0, 3, 0]`", "Ein SyntaxError"], 1,
      "Das ist ein bedingter Ausdruck vor dem `for`. Es kommen genauso viele Werte heraus wie hinein, nur veraendert.",
      `[z if z % 2 == 1 else 0 for z in [0, 1, 2, 3]]`),
    Q("Was entsteht bei `{w: len(w) for w in [\"a\", \"bb\"]}`?",
      ["Eine Menge", "Eine Liste", "Ein Dictionary", "Ein Tupel"], 2,
      "Der Doppelpunkt zwischen Schluessel und Wert macht daraus eine Dictionary-Comprehension."),
    Q("Was ist der Unterschied zwischen eckigen und runden Klammern?",
      ["Keiner, beide erzeugen eine Liste",
       "Runde Klammern erzeugen einen Generator, der Werte einzeln liefert",
       "Runde Klammern erzeugen ein Tupel",
       "Runde Klammern sind schneller, aber sonst gleich"],
      1,
      "Ein Generator baut nichts vollstaendig auf, sondern liefert die Werte bei Bedarf. Das spart Speicher."),
    Q("Wann solltest du **keine** Comprehension nehmen?",
      ["Wenn die Liste laenger als zehn Elemente ist",
       "Wenn die Zeile unuebersichtlich wird oder mehrere Schritte noetig sind",
       "Wenn du filtern willst",
       "Wenn du ein Dictionary bauen willst"],
      1,
      "Comprehensions sind fuer einfache Umformungen gedacht. Sobald du mehrere Anweisungen brauchst, ist eine Schleife klarer."),
  ],
  aufgaben: [
    {
      id: "a17-1",
      titel: "Filtern und umformen",
      text: [P("Baue aus `werte` eine Liste `ergebnis` mit den Quadraten aller **negativen** Zahlen, in der Reihenfolge des Originals. Nutze eine Comprehension."),
             P("Erwartetes Ergebnis: `[9, 1, 49]`")],
      start: `werte = [-3, 4, -1, 8, -7, 2]

ergebnis = 

print(ergebnis)`,
      tipps: ["Der Ausdruck vorne ist `z ** 2`.",
              "Die Bedingung `if z < 0` gehoert ans Ende.",
              "`[z ** 2 for z in werte if z < 0]`"],
      loesung: `werte = [-3, 4, -1, 8, -7, 2]

ergebnis = [z ** 2 for z in werte if z < 0]

print(ergebnis)`,
      tests: [
        T("Das Ergebnis stimmt", `assert ergebnis == [9, 1, 49], f"ergebnis war: {ergebnis}"`),
        T("Es wurde eine Comprehension benutzt", `assert "for" in QUELLE.split("ergebnis =")[1].split("print")[0], "Loese es mit einer Comprehension in einer Zeile"`),
        T("Es funktioniert auch fuer andere Werte", `assert [z ** 2 for z in [-2, 5, -4] if z < 0] == [4, 16]`),
      ],
    },
    {
      id: "a17-2",
      titel: "Dictionary umdrehen",
      text: [P("Drehe `nach_name` um, sodass die Jahre zu Schluesseln werden. Nutze eine Dictionary-Comprehension."),
             P("Erwartetes Ergebnis: `{1815: 'Ada', 1906: 'Grace', 1912: 'Alan'}`")],
      start: `nach_name = {"Ada": 1815, "Grace": 1906, "Alan": 1912}

nach_jahr = 

print(nach_jahr)`,
      tipps: ["`.items()` liefert Paare aus Schluessel und Wert.",
              "Beim Aufbau schreibst du `jahr: name` statt `name: jahr`.",
              "`{jahr: name for name, jahr in nach_name.items()}`"],
      loesung: `nach_name = {"Ada": 1815, "Grace": 1906, "Alan": 1912}

nach_jahr = {jahr: name for name, jahr in nach_name.items()}

print(nach_jahr)`,
      tests: [
        T("Das Ergebnis stimmt", `assert nach_jahr == {1815: "Ada", 1906: "Grace", 1912: "Alan"}, f"Ergebnis: {nach_jahr}"`),
        T("Die Schluessel sind Zahlen", `assert all(isinstance(k, int) for k in nach_jahr), "Die Jahre muessen Schluessel sein"`),
        T("Es wurde eine Comprehension benutzt", `assert "items()" in QUELLE, "Nutze .items() in einer Comprehension"`),
      ],
    },
    {
      id: "a17-3",
      titel: "Tabelle glaetten",
      text: [P("Mache aus der verschachtelten Liste eine flache Liste, aber nur mit den Werten ueber 4."),
             P("Erwartetes Ergebnis: `[5, 6, 7, 9]`")],
      start: `tabelle = [[1, 5, 2], [6, 3, 7], [4, 9, 1]]

flach = 

print(flach)`,
      tipps: ["Du brauchst zwei `for` in einer Comprehension.",
              "Die aeussere Schleife kommt zuerst, genau wie bei verschachtelten Schleifen.",
              "`[w for zeile in tabelle for w in zeile if w > 4]`"],
      loesung: `tabelle = [[1, 5, 2], [6, 3, 7], [4, 9, 1]]

flach = [w for zeile in tabelle for w in zeile if w > 4]

print(flach)`,
      tests: [
        T("Das Ergebnis stimmt", `assert flach == [5, 6, 7, 9], f"flach war: {flach}"`),
        T("Es ist eine flache Liste", `assert all(not isinstance(w, list) for w in flach), "Es sind noch Listen enthalten"`),
        T("Es wurde in einer Comprehension geloest", `teil = QUELLE.split("flach =")[1].split("print")[0]\nassert teil.count("for") == 2, "Nutze zwei for in einer Comprehension"`),
      ],
    },
  ],
});

const M8 = modul({
  id: "m8", nr: 8, ikon: "gehirn",
  titel: "Python fuer kuenstliche Intelligenz",
  kurz: "NumPy, Tabellen, die noetige Mathematik und ein lernendes Modell von Hand gebaut.",
});

M8.push({
  id: "l-numpy",
  titel: "NumPy: Rechnen mit ganzen Feldern",
  dauer: 20,
  vorspann: "NumPy ist die Grundlage praktisch jeder Bibliothek fuer maschinelles Lernen. Der Kerngedanke: rechne nicht mit einzelnen Zahlen in Schleifen, sondern mit ganzen Feldern auf einmal.",
  ziele: [
    "Arrays anlegen und ihre Form verstehen",
    "Vektorisiert statt in Schleifen rechnen",
    "Mit Masken filtern",
    "Achsen und Kennzahlen beherrschen",
  ],
  inhalt: [
    H2("Warum nicht einfach Listen"),
    C(`import numpy as np

liste = [1, 2, 3, 4]
feld = np.array([1, 2, 3, 4])

print([x * 2 for x in liste])
print(feld * 2)

print(feld + feld)
print(feld ** 2)`,
      { pakete: ["numpy"], aus: "[2, 4, 6, 8]\n[2 4 6 8]\n[2 4 6 8]\n[ 1  4  9 16]" }),
    P("Bei der Liste brauchst du eine Schleife. Beim Array wirkt die Rechnung auf alle Elemente auf einmal. Das nennt man **Vektorisierung**, und es ist nicht nur kuerzer, sondern hundert- bis tausendmal schneller, weil die Schleife in C laeuft statt in Python."),
    C(`import numpy as np
import time

n = 1_000_000
liste = list(range(n))
feld = np.arange(n)

start = time.perf_counter()
ergebnis_a = [x * 2 for x in liste]
zeit_liste = time.perf_counter() - start

start = time.perf_counter()
ergebnis_b = feld * 2
zeit_feld = time.perf_counter() - start

print(f"Liste: {zeit_liste:.4f} s")
print(f"NumPy: {zeit_feld:.4f} s")
print(f"Faktor: rund {int(zeit_liste / max(zeit_feld, 1e-9))}")`,
      { pakete: ["numpy"], lauf: true, nichtpruefen: true }),

    H2("Arrays anlegen"),
    C(`import numpy as np

print(np.array([1, 2, 3]))
print(np.zeros(4))
print(np.ones((2, 3)))
print(np.arange(0, 10, 2))
print(np.linspace(0, 1, 5))
print(np.full((2, 2), 7))`,
      { pakete: ["numpy"],
        aus: "[1 2 3]\n[0. 0. 0. 0.]\n[[1. 1. 1.]\n [1. 1. 1.]]\n[0 2 4 6 8]\n[0.   0.25 0.5  0.75 1.  ]\n[[7 7]\n [7 7]]" }),
    TAB(["Funktion", "Ergebnis"],
      ["`np.array(liste)`", "aus einer Liste"],
      ["`np.zeros(n)`", "n Nullen"],
      ["`np.ones((z, s))`", "Einsen in dieser Form"],
      ["`np.arange(a, b, s)`", "wie range, aber als Array"],
      ["`np.linspace(a, b, n)`", "n gleichmaessige Werte von a bis b"],
      ["`np.random.rand(n)`", "n Zufallszahlen zwischen 0 und 1"],
    ),

    H2("Form und Achsen"),
    C(`import numpy as np

matrix = np.array([[1, 2, 3],
                   [4, 5, 6]])

print(matrix.shape)
print(matrix.ndim)
print(matrix.size)
print(matrix.dtype)
print()
print(matrix.reshape(3, 2))
print()
print(matrix.T)`,
      { pakete: ["numpy"],
        aus: "(2, 3)\n2\n6\nint64\n\n[[1 2]\n [3 4]\n [5 6]]\n\n[[1 4]\n [2 5]\n [3 6]]" }),
    P("`shape` ist die wichtigste Eigenschaft ueberhaupt. In der KI sind gefuehlte neunzig Prozent aller Fehler Formfehler: eine Matrix von 32 mal 10 passt nicht zu einer von 64 mal 10. Gib im Zweifel immer erst die Form aus."),
    HINWEIS("Die Achsen",
      "Bei einer Matrix ist Achse 0 die Richtung ueber die Zeilen, Achse 1 die ueber die Spalten. `sum(axis=0)` summiert also spaltenweise nach unten, `sum(axis=1)` zeilenweise nach rechts.",
    ),
    C(`import numpy as np

noten = np.array([[2.0, 1.7, 3.0],
                  [1.3, 2.3, 2.0],
                  [3.7, 3.0, 2.7]])

print("Alle:            ", noten.mean().round(2))
print("Pro Fach:        ", noten.mean(axis=0).round(2))
print("Pro Person:      ", noten.mean(axis=1).round(2))
print("Beste pro Fach:  ", noten.min(axis=0))
print("Form nach axis=0:", noten.mean(axis=0).shape)`,
      { pakete: ["numpy"],
        aus: "Alle:             2.41\nPro Fach:         [2.33 2.33 2.57]\nPro Person:       [2.23 1.87 3.13]\nBeste pro Fach:   [1.3 1.7 2. ]\nForm nach axis=0: (3,)" }),

    H2("Zugriff und Slicing"),
    C(`import numpy as np

m = np.arange(12).reshape(3, 4)
print(m)
print()
print(m[0, 0], m[1, 2], m[-1, -1])
print(m[0])
print(m[:, 1])
print(m[1:, 2:])`,
      { pakete: ["numpy"],
        aus: "[[ 0  1  2  3]\n [ 4  5  6  7]\n [ 8  9 10 11]]\n\n0 6 11\n[0 1 2 3]\n[1 5 9]\n[[ 6  7]\n [10 11]]" }),
    P("Die Schreibweise `m[zeile, spalte]` ist der grosse Vorteil gegenueber verschachtelten Listen. `m[:, 1]` liefert die gesamte zweite Spalte, was mit Listen eine Comprehension braeuchte."),

    H2("Masken: filtern ohne Schleife"),
    C(`import numpy as np

werte = np.array([12, -3, 45, 0, -8, 23])

maske = werte > 10
print(maske)
print(werte[maske])
print(werte[werte > 10])

print(np.where(werte < 0, 0, werte))
print((werte > 10).sum())
print(werte[(werte > 0) & (werte < 20)])`,
      { pakete: ["numpy"],
        aus: "[ True False  True False False  True]\n[12 45 23]\n[12 45 23]\n[12  0 45  0  0 23]\n3\n[12]" }),
    WARN("Und statt and",
      "Bei Masken nutzt du `&` und `|`, nicht `and` und `or`. Die Schluesselwoerter funktionieren nur mit einzelnen Wahrheitswerten, nicht mit ganzen Feldern. Und setze immer Klammern um die Teilbedingungen.",
    ),
    P("`np.where(bedingung, dann, sonst)` ist das vektorisierte `if`. Es ist der uebliche Weg, Ausreisser zu begrenzen oder fehlende Werte zu ersetzen."),

    H2("Rundfunk"),
    P("Arrays unterschiedlicher Form lassen sich oft trotzdem verrechnen. NumPy dehnt die kleinere automatisch aus."),
    C(`import numpy as np

m = np.array([[1, 2, 3],
              [4, 5, 6]])

print(m + 10)
print()
print(m * np.array([1, 10, 100]))
print()
spaltenmittel = m.mean(axis=0)
print(m - spaltenmittel)`,
      { pakete: ["numpy"],
        aus: "[[11 12 13]\n [14 15 16]]\n\n[[  1  20 300]\n [  4  50 600]]\n\n[[-1.5 -1.5 -1.5]\n [ 1.5  1.5  1.5]]" }),
    P("Das letzte Beispiel ist die **Zentrierung** von Daten, ein Standardschritt vor jedem Training: von jeder Spalte wird ihr Mittelwert abgezogen. Ohne Rundfunk braeuchte das eine doppelte Schleife."),

    H2("Die wichtigsten Rechenfunktionen"),
    C(`import numpy as np

a = np.array([4.0, 9.0, 16.0])

print(np.sqrt(a))
print(np.exp(np.array([0.0, 1.0])).round(4))
print(np.log(np.array([1.0, np.e])).round(4))
print(np.abs(np.array([-2, 3])))
print(a.sum(), a.mean(), a.std().round(4), a.max())
print(np.dot(np.array([1, 2, 3]), np.array([4, 5, 6])))`,
      { pakete: ["numpy"],
        aus: "[2. 3. 4.]\n[1.     2.7183]\n[0. 1.]\n[2 3]\n29.0 9.666666666666666 4.9216 16.0\n32" }),
    P("`np.dot` ist das Skalarprodukt: Paare multiplizieren und alles addieren. Es ist die zentrale Rechnung in jedem neuronalen Netz und begegnet dir in der naechsten Lektion wieder."),
    MERKE("Die Grundregel von NumPy",
      "Wenn du in Python eine Schleife ueber Zahlen schreibst, gibt es dafuer fast immer eine NumPy-Funktion. Suche danach, bevor du die Schleife schreibst. Das ist nicht nur schneller, sondern meist auch kuerzer und klarer.",
    ),
  ],
  quiz: [
    Q("Was ergibt `np.array([1, 2, 3]) * 2`?",
      ["`[1, 2, 3, 1, 2, 3]`", "`[2 4 6]`", "Einen Fehler", "`[1, 2, 3, 2]`"], 1,
      "Anders als bei Listen wirkt die Multiplikation auf jedes Element. Bei einer Liste wuerde sie vervielfachen."),
    Q("Was liefert `matrix.shape` bei zwei Zeilen und drei Spalten?",
      ["`(3, 2)`", "`(2, 3)`", "`6`", "`[2, 3]`"], 1,
      "Zuerst die Zeilen, dann die Spalten."),
    Q("Was macht `werte.mean(axis=0)` bei einer Matrix?",
      ["Den Mittelwert aller Werte", "Den Mittelwert je Spalte",
       "Den Mittelwert je Zeile", "Den Mittelwert der ersten Zeile"], 1,
      "Achse 0 laeuft ueber die Zeilen nach unten, das Ergebnis ist ein Wert pro Spalte."),
    Q("Warum darf man bei Masken kein `and` benutzen?",
      ["Es ist langsamer",
       "`and` funktioniert nur mit einzelnen Wahrheitswerten, nicht mit ganzen Feldern",
       "`and` ist in NumPy nicht definiert",
       "Man darf, beides geht"],
      1,
      "Fuer elementweise Verknuepfungen brauchst du `&` und `|`, mit Klammern um die Teilbedingungen."),
    Q("Was macht `np.where(werte < 0, 0, werte)`?",
      ["Es loescht negative Werte",
       "Es ersetzt jeden negativen Wert durch null",
       "Es gibt die Positionen der negativen Werte zurueck",
       "Es sortiert die Werte"],
      1,
      "Das ist das vektorisierte `if`: wo die Bedingung zutrifft der zweite Wert, sonst der dritte."),
    Q("Was ist Rundfunk bei NumPy?",
      ["Das Verteilen auf mehrere Kerne",
       "Das automatische Ausdehnen kleinerer Arrays, damit Formen zusammenpassen",
       "Das Umformen mit reshape",
       "Das Kopieren von Arrays"],
      1,
      "Ein Wert oder eine Zeile wird auf die passende Form ausgedehnt, ohne dass Speicher vervielfacht wird."),
  ],
  aufgaben: [
    {
      id: "a40-1",
      titel: "Daten normieren",
      text: [P("Normiere die Messwerte spaltenweise: ziehe von jeder Spalte ihren Mittelwert ab und teile durch ihre Standardabweichung."),
             P("Das ist der Standardschritt vor jedem Training. Nutze Rundfunk, keine Schleife."),
             P("Erwartete Ausgabe:"),
             ROH("Mittel danach: [0. 0.]\nStreuung danach: [1. 1.]")],
      pakete: ["numpy"],
      start: `import numpy as np

daten = np.array([[10.0, 200.0],
                  [20.0, 400.0],
                  [30.0, 600.0],
                  [40.0, 800.0]])

normiert = 

print("Mittel danach:", normiert.mean(axis=0).round(6))
print("Streuung danach:", normiert.std(axis=0).round(6))`,
      tipps: ["`daten.mean(axis=0)` liefert einen Mittelwert pro Spalte.",
              "`daten.std(axis=0)` liefert eine Streuung pro Spalte.",
              "Die Formel lautet: Werte minus Mittel, geteilt durch Streuung."],
      loesung: `import numpy as np

daten = np.array([[10.0, 200.0],
                  [20.0, 400.0],
                  [30.0, 600.0],
                  [40.0, 800.0]])

normiert = (daten - daten.mean(axis=0)) / daten.std(axis=0)

print("Mittel danach:", normiert.mean(axis=0).round(6))
print("Streuung danach:", normiert.std(axis=0).round(6))`,
      tests: [
        T("Die Form bleibt gleich", `assert normiert.shape == (4, 2), f"Form: {normiert.shape}"`),
        T("Der Mittelwert ist null", `import numpy as np\nassert np.allclose(normiert.mean(axis=0), 0), f"Mittel: {normiert.mean(axis=0)}"`),
        T("Die Streuung ist eins", `import numpy as np\nassert np.allclose(normiert.std(axis=0), 1), f"Streuung: {normiert.std(axis=0)}"`),
        T("Beide Spalten sind gleich normiert", `import numpy as np\nassert np.allclose(normiert[:, 0], normiert[:, 1]), "Beide Spalten sind linear, sie muessen gleich herauskommen"`),
        T("Es wurde ohne Schleife geloest", `assert "for " not in QUELLE, "Nutze Rundfunk statt einer Schleife"`),
      ],
    },
    {
      id: "a40-2",
      titel: "Ausreisser behandeln",
      text: [P("Schreibe `begrenzen(werte, unten, oben)`, die alle Werte auf den Bereich beschneidet, ohne Schleife."),
             P("Gib danach aus, wie viele Werte veraendert wurden."),
             P("Erwartete Ausgabe:"),
             ROH("[ 0 12  5 20  7]\n2 Werte veraendert")],
      pakete: ["numpy"],
      start: `import numpy as np

def begrenzen(werte, unten, oben):
    pass

messwerte = np.array([-5, 12, 5, 99, 7])
sauber = begrenzen(messwerte, 0, 20)

print(sauber)
print(f"{(sauber != messwerte).sum()} Werte veraendert")`,
      tipps: ["`np.where` laesst sich verschachteln, oder du nutzt `np.clip`.",
              "`np.clip(werte, unten, oben)` erledigt genau das.",
              "Die Anzahl der Aenderungen ist die Summe der Maske `sauber != messwerte`."],
      loesung: `import numpy as np

def begrenzen(werte, unten, oben):
    """Beschneidet alle Werte auf den erlaubten Bereich."""
    return np.clip(werte, unten, oben)


messwerte = np.array([-5, 12, 5, 99, 7])
sauber = begrenzen(messwerte, 0, 20)

print(sauber)
print(f"{(sauber != messwerte).sum()} Werte veraendert")`,
      tests: [
        T("Die Werte sind beschnitten", `import numpy as np\nassert np.array_equal(sauber, np.array([0, 12, 5, 20, 7])), f"Ergebnis: {sauber}"`),
        T("Die Anzahl stimmt", `assert "2 Werte veraendert" in AUSGABE, f"Ausgabe: {AUSGABE!r}"`),
        T("Andere Grenzen funktionieren", `import numpy as np\nassert np.array_equal(begrenzen(np.array([1, 5, 9]), 2, 8), np.array([2, 5, 8]))`),
        T("Das Original bleibt unveraendert", `import numpy as np\nassert messwerte[0] == -5, "Die Ausgangsdaten duerfen sich nicht aendern"`),
        T("Es wurde ohne Schleife geloest", `assert "for " not in QUELLE, "Nutze eine vektorisierte Loesung"`),
      ],
    },
  ],
});

M8.push({
  id: "l-pandas",
  titel: "pandas: Tabellen auswerten",
  dauer: 19,
  vorspann: "Echte Daten kommen als Tabelle. pandas ist das Werkzeug, um sie zu laden, zu bereinigen und auszuwerten, bevor ein Modell sie ueberhaupt zu sehen bekommt.",
  ziele: [
    "DataFrames anlegen und ueberblicken",
    "Zeilen und Spalten gezielt auswaehlen",
    "Fehlende Werte behandeln",
    "Gruppieren und zusammenfassen",
  ],
  inhalt: [
    H2("Die beiden Grundtypen"),
    P("Eine `Series` ist eine Spalte mit Beschriftung. Ein `DataFrame` ist eine ganze Tabelle aus mehreren solchen Spalten."),
    C(`import pandas as pd

reihe = pd.Series([21.4, 19.8, 24.1], name="temperatur")
print(reihe)
print()
print(reihe.mean().round(2), reihe.max())`,
      { pakete: ["pandas"],
        aus: "0    21.4\n1    19.8\n2    24.1\nName: temperatur, dtype: float64\n\n21.77 24.1" }),
    C(`import pandas as pd

tabelle = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost", "West"],
    "temperatur": [21.4, 28.0, 19.8, 24.1],
    "feuchte": [62, 45, 71, 55],
})

print(tabelle)
print()
print(tabelle.shape)
print(list(tabelle.columns))`,
      { pakete: ["pandas"],
        aus: "  station  temperatur  feuchte\n0    Nord        21.4       62\n1    Sued        28.0       45\n2     Ost        19.8       71\n3    West        24.1       55\n\n(4, 3)\n['station', 'temperatur', 'feuchte']" }),

    H2("Den Ueberblick gewinnen"),
    P("Das sind die ersten Befehle bei jedem neuen Datensatz, immer in dieser Reihenfolge:"),
    C(`import pandas as pd

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost", "West"],
    "temperatur": [21.4, 28.0, 19.8, 24.1],
    "feuchte": [62, 45, 71, 55],
})

print(t.head(2))
print()
print(t.describe().round(2))`,
      { pakete: ["pandas"],
        aus: "  station  temperatur  feuchte\n0    Nord        21.4       62\n1    Sued        28.0       45\n\n       temperatur  feuchte\ncount        4.00     4.00\nmean        23.33    58.25\nstd          3.59    11.00\nmin         19.80    45.00\n25%         21.00    52.50\n50%         22.75    58.50\n75%         25.08    64.25\nmax         28.00    71.00" }),
    TAB(["Befehl", "Zeigt"],
      ["`t.head(n)`", "die ersten n Zeilen"],
      ["`t.tail(n)`", "die letzten n Zeilen"],
      ["`t.shape`", "Zeilen und Spalten"],
      ["`t.info()`", "Typen und fehlende Werte"],
      ["`t.describe()`", "Kennzahlen der Zahlenspalten"],
      ["`t.dtypes`", "die Typen je Spalte"],
      ["`t[\"spalte\"].value_counts()`", "Haeufigkeiten"],
    ),

    H2("Auswaehlen"),
    C(`import pandas as pd

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost", "West"],
    "temperatur": [21.4, 28.0, 19.8, 24.1],
    "feuchte": [62, 45, 71, 55],
})

print(t["temperatur"].tolist())
print(t[["station", "feuchte"]].shape)
print()
print(t[t["temperatur"] > 22])
print()
print(t.loc[t["feuchte"] > 60, "station"].tolist())`,
      { pakete: ["pandas"],
        aus: "[21.4, 28.0, 19.8, 24.1]\n(4, 2)\n\n  station  temperatur  feuchte\n1    Sued        28.0       45\n3    West        24.1       55\n\n['Nord', 'Ost']" }),
    TAB(["Zugriff", "Bedeutung"],
      ["`t[\"spalte\"]`", "eine Spalte als Series"],
      ["`t[[\"a\", \"b\"]]`", "mehrere Spalten als DataFrame"],
      ["`t[bedingung]`", "gefilterte Zeilen"],
      ["`t.loc[zeile, spalte]`", "ueber Beschriftungen"],
      ["`t.iloc[0, 1]`", "ueber Positionen"],
    ),
    WARN("Und statt and, wieder",
      "Wie bei NumPy gilt auch hier: `&` und `|` statt `and` und `or`, und Klammern um jede Teilbedingung. `t[(t[\"a\"] > 1) & (t[\"b\"] < 5)]`.",
    ),

    H2("Spalten berechnen"),
    C(`import pandas as pd

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost"],
    "temperatur": [21.4, 28.0, 19.8],
})

t["fahrenheit"] = t["temperatur"] * 9 / 5 + 32
t["warm"] = t["temperatur"] > 22
t["kuerzel"] = t["station"].str[0]

print(t)`,
      { pakete: ["pandas"],
        aus: "  station  temperatur  fahrenheit   warm kuerzel\n0    Nord        21.4       70.52  False       N\n1    Sued        28.0       82.40   True       S\n2     Ost        19.8       67.64  False       O" }),
    P("Die Rechnung wirkt auf die ganze Spalte, genau wie bei NumPy. `.str` gibt dir die Zeichenkettenmethoden fuer alle Werte einer Spalte auf einmal."),

    H2("Fehlende Werte"),
    C(`import pandas as pd
import numpy as np

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost", "West"],
    "temperatur": [21.4, np.nan, 19.8, np.nan],
    "feuchte": [62, 45, np.nan, 55],
})

print(t.isna().sum())
print()
print(t.dropna().shape)
print(t["temperatur"].fillna(t["temperatur"].mean()).round(2).tolist())`,
      { pakete: ["pandas", "numpy"],
        aus: "station       0\ntemperatur    2\nfeuchte       1\ndtype: int64\n\n(1, 3)\nist: [21.4, 20.6, 19.8, 20.6]" , nichtpruefen: true }),
    TAB(["Vorgehen", "Wann sinnvoll"],
      ["`dropna()`", "wenige fehlende Werte, viele Daten"],
      ["`fillna(mittelwert)`", "Zahlen, bei denen der Mittelwert plausibel ist"],
      ["`fillna(0)`", "wenn null die richtige Bedeutung hat"],
      ["`fillna(method=\"ffill\")`", "Zeitreihen, letzter bekannter Wert"],
      ["Eine eigene Spalte `war_leer`", "wenn das Fehlen selbst eine Information ist"],
    ),
    MERKE("Nie ungeprueft auffuellen",
      "Fehlende Werte einfach durch den Mittelwert zu ersetzen verfaelscht die Streuung. Schau dir erst an, **warum** sie fehlen. Ein Sensor, der bei Frost ausfaellt, erzeugt keine zufaelligen Luecken, und der Mittelwert waere dort genau der falsche Ersatz.",
    ),

    H2("Gruppieren"),
    C(`import pandas as pd

verkauf = pd.DataFrame({
    "region": ["Nord", "Sued", "Nord", "Sued", "Nord"],
    "produkt": ["A", "A", "B", "B", "A"],
    "menge": [10, 20, 15, 25, 5],
})

print(verkauf.groupby("region")["menge"].sum())
print()
print(verkauf.groupby(["region", "produkt"])["menge"].sum())
print()
print(verkauf.groupby("region")["menge"].agg(["sum", "mean", "count"]))`,
      { pakete: ["pandas"],
        aus: "region\nNord    30\nSued    45\nName: menge, dtype: int64\n\nregion  produkt\nNord    A          15\n        B          15\nSued    A          20\n        B          25\nName: menge, dtype: int64\n\n        sum  mean  count\nregion                  \nNord     30  10.0      3\nSued     45  22.5      2" }),
    P("Gruppieren folgt immer demselben Muster: **aufteilen, anwenden, zusammenfuegen**. Du teilst nach einer Spalte auf, rechnest je Gruppe und bekommst das Ergebnis als neue Tabelle."),

    H2("Sortieren und Ein- und Ausgabe"),
    C(`import pandas as pd

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost"],
    "temperatur": [21.4, 28.0, 19.8],
})

print(t.sort_values("temperatur", ascending=False))

t.to_csv("messung.csv", index=False)
geladen = pd.read_csv("messung.csv")
print()
print(geladen.shape, list(geladen.columns))`,
      { pakete: ["pandas"],
        aus: "  station  temperatur\n1    Sued        28.0\n0    Nord        21.4\n2     Ost        19.8\n\n(3, 2) ['station', 'temperatur']" }),
    TAB(["Funktion", "Zweck"],
      ["`pd.read_csv(pfad)`", "Tabellendatei laden"],
      ["`pd.read_excel(pfad)`", "Tabellenkalkulation laden"],
      ["`pd.read_json(pfad)`", "JSON laden"],
      ["`t.to_csv(pfad, index=False)`", "speichern ohne Indexspalte"],
      ["`t.to_numpy()`", "als NumPy-Array fuer das Modell"],
    ),
    P("Der letzte Punkt ist die uebliche Uebergabe an das maschinelle Lernen: pandas fuer Laden und Bereinigen, dann `to_numpy()`, und ab da rechnen NumPy und die Modellbibliothek weiter."),
  ],
  quiz: [
    Q("Was ist der Unterschied zwischen Series und DataFrame?",
      ["Keiner", "Series ist eine Spalte, DataFrame eine ganze Tabelle",
       "Series ist schneller", "DataFrame kann nur Zahlen enthalten"], 1,
      "Ein DataFrame besteht aus mehreren Series mit gemeinsamem Index."),
    Q("Welchen Befehl nutzt du zuerst bei einem neuen Datensatz?",
      ["`t.sort_values()`", "`t.head()` und `t.info()`",
       "`t.groupby()`", "`t.to_csv()`"], 1,
      "Erst anschauen, welche Spalten es gibt, welche Typen und wie viele Werte fehlen."),
    Q("Wie filterst du Zeilen mit Temperatur ueber 22?",
      ["`t.filter(temperatur > 22)`", "`t[t[\"temperatur\"] > 22]`",
       "`t.where(22)`", "`t.select(\"temperatur > 22\")`"], 1,
      "Die Bedingung erzeugt eine Maske, mit der du die Tabelle indizierst."),
    Q("Was macht `t.isna().sum()`?",
      ["Es entfernt fehlende Werte",
       "Es zaehlt die fehlenden Werte je Spalte",
       "Es fuellt fehlende Werte auf",
       "Es gibt True zurueck, wenn Werte fehlen"],
      1,
      "`isna()` liefert eine Maske, `sum()` zaehlt die wahren Werte je Spalte."),
    Q("Was ist beim Auffuellen fehlender Werte mit dem Mittelwert zu bedenken?",
      ["Nichts, es ist immer richtig",
       "Es verfaelscht die Streuung und ignoriert, warum die Werte fehlen",
       "Es funktioniert nur bei ganzen Zahlen",
       "Es ist zu langsam"],
      1,
      "Systematisch fehlende Werte brauchen eine andere Behandlung als zufaellig fehlende."),
    Q("Wie uebergibst du eine Tabelle an ein Modell?",
      ["`t.to_list()`", "`t.to_numpy()`", "`t.to_csv()`", "Direkt, ohne Umwandlung"], 1,
      "Die meisten Modellbibliotheken erwarten NumPy-Arrays."),
  ],
  aufgaben: [
    {
      id: "a41-1",
      titel: "Tabelle auswerten",
      text: [P("Werte die Verkaufstabelle aus und gib drei Zeilen aus:"),
             ROH("Gesamtmenge: 75\nBeste Region: Sued\nDurchschnitt je Region: {'Nord': 10.0, 'Sued': 22.5}")],
      pakete: ["pandas"],
      start: `import pandas as pd

verkauf = pd.DataFrame({
    "region": ["Nord", "Sued", "Nord", "Sued", "Nord"],
    "menge": [10, 20, 15, 25, 5],
})

gesamt = 
beste = 
schnitt = 

print(f"Gesamtmenge: {gesamt}")
print(f"Beste Region: {beste}")
print(f"Durchschnitt je Region: {schnitt}")`,
      tipps: ["`verkauf[\"menge\"].sum()` liefert die Gesamtmenge.",
              "`groupby(\"region\")[\"menge\"].sum().idxmax()` gibt die Region mit der hoechsten Summe.",
              "`.to_dict()` macht aus einer Series ein Dictionary."],
      loesung: `import pandas as pd

verkauf = pd.DataFrame({
    "region": ["Nord", "Sued", "Nord", "Sued", "Nord"],
    "menge": [10, 20, 15, 25, 5],
})

gesamt = verkauf["menge"].sum()
beste = verkauf.groupby("region")["menge"].sum().idxmax()
schnitt = verkauf.groupby("region")["menge"].mean().to_dict()

print(f"Gesamtmenge: {gesamt}")
print(f"Beste Region: {beste}")
print(f"Durchschnitt je Region: {schnitt}")`,
      tests: [
        T("Die Gesamtmenge stimmt", `assert int(gesamt) == 75, f"Ergebnis: {gesamt}"`),
        T("Die beste Region stimmt", `assert beste == "Sued", f"Ergebnis: {beste!r}"`),
        T("Der Durchschnitt je Region stimmt", `assert abs(schnitt["Nord"] - 10.0) < 1e-9 and abs(schnitt["Sued"] - 22.5) < 1e-9, f"Ergebnis: {schnitt}"`),
        T("Es wurde gruppiert", `assert "groupby" in QUELLE, "Nutze groupby fuer die Auswertung je Region"`),
      ],
    },
    {
      id: "a41-2",
      titel: "Daten bereinigen",
      text: [P("Bereinige die Tabelle in drei Schritten:"),
             L("Entferne Zeilen, bei denen die Temperatur fehlt.",
               "Fuelle fehlende Feuchtewerte mit dem Mittelwert der Spalte.",
               "Ergaenze eine Spalte `warm`, die wahr ist ab 22 Grad."),
             P("Erwartete Ausgabe: `2 Zeilen, 1 warm`")],
      pakete: ["pandas", "numpy"],
      start: `import pandas as pd
import numpy as np

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost"],
    "temperatur": [21.4, np.nan, 24.1],
    "feuchte": [62.0, 45.0, np.nan],
})

sauber = 

print(f"{len(sauber)} Zeilen, {int(sauber['warm'].sum())} warm")`,
      tipps: ["`dropna(subset=[\"temperatur\"])` entfernt nur Zeilen mit fehlender Temperatur.",
              "`fillna(wert)` wirkt auf eine einzelne Spalte.",
              "Arbeite auf einer Kopie, damit pandas nicht warnt: `.copy()`."],
      loesung: `import pandas as pd
import numpy as np

t = pd.DataFrame({
    "station": ["Nord", "Sued", "Ost"],
    "temperatur": [21.4, np.nan, 24.1],
    "feuchte": [62.0, 45.0, np.nan],
})

sauber = t.dropna(subset=["temperatur"]).copy()
sauber["feuchte"] = sauber["feuchte"].fillna(sauber["feuchte"].mean())
sauber["warm"] = sauber["temperatur"] >= 22

print(f"{len(sauber)} Zeilen, {int(sauber['warm'].sum())} warm")`,
      tests: [
        T("Es bleiben zwei Zeilen", `assert len(sauber) == 2, f"Zeilen: {len(sauber)}"`),
        T("Keine fehlenden Werte mehr", `assert sauber.isna().sum().sum() == 0, "Es fehlen noch Werte"`),
        T("Die Spalte warm existiert", `assert "warm" in sauber.columns`),
        T("Die Einstufung stimmt", `assert int(sauber["warm"].sum()) == 1, f"Warm: {int(sauber['warm'].sum())}"`),
        T("Die Ausgangstabelle bleibt unveraendert", `assert len(t) == 3, "Die Ausgangstabelle darf sich nicht aendern"`),
      ],
    },
  ],
});

M8.push({
  id: "l-mathe",
  titel: "Die Mathematik hinter KI, in Python",
  dauer: 20,
  vorspann: "Fuer den Einstieg in die KI brauchst du ueberraschend wenig Mathematik, aber die wenige solltest du wirklich verstehen. Hier ist sie, jeweils als Formel und als Python-Code.",
  ziele: [
    "Vektoren und ihr Skalarprodukt verstehen",
    "Matrixmultiplikation nachvollziehen",
    "Die Ableitung als Steigung begreifen",
    "Aktivierungs- und Verlustfunktionen selbst umsetzen",
  ],
  inhalt: [
    H2("Vektoren"),
    P("Ein Vektor ist eine Liste von Zahlen. In der KI beschreibt er zum Beispiel ein Datenobjekt: Groesse, Gewicht, Alter einer Person werden zum Vektor mit drei Eintraegen."),
    C(`import numpy as np

person = np.array([172.0, 68.0, 34.0])
gewichte = np.array([0.3, -0.2, 0.5])

print("Vektor:", person)
print("Laenge des Vektors:", len(person))
print("Betrag:", round(float(np.linalg.norm(person)), 2))
print("Summe:", person.sum())`,
      { pakete: ["numpy"], aus: "Vektor: [172.  68.  34.]\nLaenge des Vektors: 3\nBetrag: 188.05\nSumme: 274.0" }),

    H2("Das Skalarprodukt"),
    P("Das Skalarprodukt multipliziert die Vektoren elementweise und addiert alles. Es ist **die** zentrale Rechnung im maschinellen Lernen: es gewichtet Merkmale und fasst sie zu einer Zahl zusammen."),
    ROH(`Formel:   a . b  =  a1*b1 + a2*b2 + ... + an*bn`),
    C(`import numpy as np

merkmale = np.array([172.0, 68.0, 34.0])
gewichte = np.array([0.3, -0.2, 0.5])

von_hand = sum(m * g for m, g in zip(merkmale, gewichte))
mit_numpy = np.dot(merkmale, gewichte)
mit_operator = merkmale @ gewichte

print(round(von_hand, 2))
print(round(float(mit_numpy), 2))
print(round(float(mit_operator), 2))`,
      { pakete: ["numpy"], aus: "55.0\n55.0\n55.0" }),
    P("Das At-Zeichen ist in Python der Operator fuer Matrixmultiplikation und das Skalarprodukt. Genau diese Rechnung fuehrt ein einzelnes Neuron aus: Eingaben mal Gewichte, aufsummiert."),

    H2("Matrizen"),
    P("Eine Matrix ist eine Tabelle von Zahlen. In der KI ist eine Zeile meist ein Datenobjekt und eine Spalte ein Merkmal."),
    C(`import numpy as np

daten = np.array([
    [172.0, 68.0],
    [165.0, 55.0],
    [180.0, 80.0],
])

gewichte = np.array([0.3, -0.2])

ergebnis = daten @ gewichte

print("Form der Daten:   ", daten.shape)
print("Form der Gewichte:", gewichte.shape)
print("Ergebnis:         ", ergebnis)
print("Form des Ergebnis:", ergebnis.shape)`,
      { pakete: ["numpy"],
        aus: "Form der Daten:    (3, 2)\nForm der Gewichte: (2,)\nErgebnis:          [38.  38.5 38. ]\nForm des Ergebnis: (3,)" }),
    MERKE("Die Formregel",
      "Bei `A @ B` muss die **Spaltenzahl von A** gleich der **Zeilenzahl von B** sein. Das Ergebnis hat die Zeilen von A und die Spalten von B. Aus `(3, 2) @ (2,)` wird `(3,)`. Diese eine Regel erklaert die meisten Fehlermeldungen beim Bauen von Netzen.",
    ),
    C(`import numpy as np

a = np.array([[1, 2, 3],
              [4, 5, 6]])
b = np.array([[1, 0],
              [0, 1],
              [1, 1]])

print(a.shape, "@", b.shape, "->", (a @ b).shape)
print(a @ b)
print()
try:
    b @ b
except ValueError as f:
    print("Fehler:", f)`,
      { pakete: ["numpy"],
        aus: "(2, 3) @ (3, 2) -> (2, 2)\n[[ 4  5]\n [10 11]]\n\nFehler: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 3 is different from 2)" }),

    H2("Die Ableitung als Steigung"),
    P("Die Ableitung sagt, wie stark sich ein Ergebnis aendert, wenn man die Eingabe ein winziges Stueck veraendert. Das ist die gesamte Grundlage des Lernens: sie zeigt, in welche Richtung du ein Gewicht verschieben musst."),
    C(`def f(x):
    return x ** 2

def ableitung_numerisch(funktion, x, h=1e-6):
    """Naehert die Steigung ueber zwei sehr nahe Punkte."""
    return (funktion(x + h) - funktion(x - h)) / (2 * h)

for x in (-2.0, 0.0, 1.0, 3.0):
    print(f"x = {x:>4}: Steigung {ableitung_numerisch(f, x):>6.2f}  (genau: {2 * x:>5.1f})")`,
      { aus: "x = -2.0: Steigung  -4.00  (genau:  -4.0)\nx =  0.0: Steigung   0.00  (genau:   0.0)\nx =  1.0: Steigung   2.00  (genau:   2.0)\nx =  3.0: Steigung   6.00  (genau:   6.0)" }),
    P("Die Ableitung von `x hoch 2` ist `2 mal x`. Die numerische Naeherung bestaetigt das. Wichtig ist die Bedeutung: bei `x = 3` steigt die Funktion mit Steigung 6. Um kleiner zu werden, musst du `x` **verringern**, also entgegen der Steigung gehen."),
    HINWEIS("Der Gradient",
      "Bei mehreren Eingaben wird aus der Ableitung ein Vektor von Ableitungen, einer je Eingabe. Dieser Vektor heisst **Gradient** und zeigt in die Richtung des staerksten Anstiegs. Beim Lernen geht man genau dagegen, deshalb heisst das Verfahren Gradientenabstieg.",
    ),

    H2("Aktivierungsfunktionen"),
    P("Ein Neuron rechnet nicht nur das Skalarprodukt, sondern schickt das Ergebnis durch eine Funktion, die den Wert begrenzt oder abschneidet. Ohne sie waere jedes noch so tiefe Netz nur eine einzige lineare Rechnung."),
    C(`import numpy as np

def sigmoid(x):
    """Quetscht jeden Wert in den Bereich zwischen 0 und 1."""
    return 1 / (1 + np.exp(-x))

def relu(x):
    """Laesst positive Werte durch, setzt negative auf null."""
    return np.maximum(0, x)

def tanh(x):
    return np.tanh(x)

werte = np.array([-3.0, -1.0, 0.0, 1.0, 3.0])

print("Eingabe: ", werte)
print("Sigmoid: ", sigmoid(werte).round(3))
print("ReLU:    ", relu(werte))
print("Tanh:    ", tanh(werte).round(3))`,
      { pakete: ["numpy"],
        aus: "Eingabe:  [-3. -1.  0.  1.  3.]\nSigmoid:  [0.047 0.269 0.5   0.731 0.953]\nReLU:     [0. 0. 0. 1. 3.]\nTanh:     [-0.995 -0.762  0.     0.762  0.995]" }),
    TAB(["Funktion", "Bereich", "Wofuer"],
      ["Sigmoid", "0 bis 1", "Wahrscheinlichkeit bei zwei Klassen"],
      ["ReLU", "0 bis unendlich", "Standard in tiefen Netzen"],
      ["Tanh", "-1 bis 1", "wenn negative Werte sinnvoll sind"],
      ["Softmax", "Summe ergibt 1", "Wahrscheinlichkeiten bei mehreren Klassen"],
    ),
    C(`import numpy as np

def softmax(werte):
    """Wandelt beliebige Zahlen in Wahrscheinlichkeiten um."""
    stabil = werte - werte.max()
    e = np.exp(stabil)
    return e / e.sum()

roh = np.array([2.0, 1.0, 0.1])
w = softmax(roh)

print("Rohwerte:         ", roh)
print("Wahrscheinlichkeit:", w.round(3))
print("Summe:            ", round(float(w.sum()), 6))
print("Vorhersage:        Klasse", int(w.argmax()))`,
      { pakete: ["numpy"],
        aus: "Rohwerte:          [2.  1.  0.1]\nWahrscheinlichkeit: [0.659 0.242 0.099]\nSumme:             1.0\nVorhersage:        Klasse 0" }),
    WARN("Der Abzug des Maximums",
      "`werte - werte.max()` aendert das Ergebnis nicht, verhindert aber, dass `exp` bei grossen Zahlen ueberlaeuft. Jede ernsthafte Umsetzung von Softmax macht das so.",
    ),

    H2("Verlustfunktionen"),
    P("Der Verlust misst, wie falsch eine Vorhersage war. Das Training besteht darin, ihn zu verkleinern."),
    C(`import numpy as np

def mittlerer_quadratischer_fehler(wahr, vorhersage):
    """Fuer Zahlenvorhersagen: mittlere quadrierte Abweichung."""
    return float(np.mean((wahr - vorhersage) ** 2))

def kreuzentropie(wahr, vorhersage, eps=1e-12):
    """Fuer Wahrscheinlichkeiten bei zwei Klassen."""
    p = np.clip(vorhersage, eps, 1 - eps)
    return float(-np.mean(wahr * np.log(p) + (1 - wahr) * np.log(1 - p)))


wahr = np.array([3.0, 5.0, 7.0])
gut = np.array([3.1, 4.9, 7.2])
schlecht = np.array([1.0, 9.0, 2.0])

print(f"Guter Schaetzer:     {mittlerer_quadratischer_fehler(wahr, gut):.4f}")
print(f"Schlechter Schaetzer:{mittlerer_quadratischer_fehler(wahr, schlecht):.4f}")

klassen = np.array([1.0, 0.0, 1.0])
sicher = np.array([0.9, 0.1, 0.95])
unsicher = np.array([0.5, 0.5, 0.5])

print(f"Sichere Vorhersage:  {kreuzentropie(klassen, sicher):.4f}")
print(f"Unsichere:           {kreuzentropie(klassen, unsicher):.4f}")`,
      { pakete: ["numpy"],
        aus: "Guter Schaetzer:     0.0200\nSchlechter Schaetzer:15.0000\nSichere Vorhersage:  0.0873\nUnsichere:           0.6931\n" }),
    P("Beachte den Wert 0.6931 bei der unsicheren Vorhersage. Das ist der natuerliche Logarithmus von 2 und genau der Verlust, den ein Modell hat, das bei zwei Klassen nur raet. Liegt dein Training dauerhaft bei diesem Wert, lernt das Modell gar nichts."),
  ],
  quiz: [
    Q("Was berechnet das Skalarprodukt zweier Vektoren?",
      ["Einen neuen Vektor", "Elementweise Produkte, aufsummiert zu einer Zahl",
       "Die Laenge der Vektoren", "Den Winkel zwischen ihnen"], 1,
      "Es ist die Grundrechnung eines Neurons: Eingaben mal Gewichte, alles addiert."),
    Q("Welche Form hat das Ergebnis von `(4, 3) @ (3, 2)`?",
      ["`(4, 2)`", "`(3, 3)`", "`(4, 3)`", "Es gibt einen Fehler"], 0,
      "Die inneren Zahlen muessen passen und fallen weg. Es bleiben die Zeilen des ersten und die Spalten des zweiten."),
    Q("Was sagt die Ableitung an einer Stelle?",
      ["Den Funktionswert", "Wie stark sich das Ergebnis bei kleiner Aenderung der Eingabe aendert",
       "Das Maximum der Funktion", "Die Anzahl der Nullstellen"], 1,
      "Sie ist die Steigung. Daraus folgt, in welche Richtung ein Gewicht verschoben werden muss."),
    Q("Wofuer ist eine Aktivierungsfunktion da?",
      ["Um das Netz schneller zu machen",
       "Um Nichtlinearitaet einzubringen, ohne die jedes Netz nur eine lineare Rechnung waere",
       "Um Werte zu runden",
       "Um Fehler abzufangen"],
      1,
      "Ohne sie liesse sich jedes noch so tiefe Netz zu einer einzigen Matrixmultiplikation zusammenfassen."),
    Q("In welchen Bereich bildet Sigmoid ab?",
      ["-1 bis 1", "0 bis 1", "0 bis unendlich", "Der Bereich bleibt gleich"], 1,
      "Deshalb eignet es sich, um Wahrscheinlichkeiten bei zwei Klassen auszudruecken."),
    Q("Warum zieht man bei Softmax das Maximum ab?",
      ["Um das Ergebnis zu normieren",
       "Damit `exp` bei grossen Zahlen nicht ueberlaeuft",
       "Um negative Werte zu vermeiden",
       "Es ist eine Konvention ohne Wirkung"],
      1,
      "Das Ergebnis bleibt gleich, aber die Rechnung wird numerisch stabil."),
  ],
  aufgaben: [
    {
      id: "a42-1",
      titel: "Ein Neuron von Hand",
      text: [P("Schreibe `neuron(eingaben, gewichte, schwelle)`, das zuerst das Skalarprodukt bildet, die Schwelle addiert und das Ergebnis durch Sigmoid schickt."),
             P("Erwartete Ausgabe:"),
             ROH("0.9309\n0.5")],
      pakete: ["numpy"],
      start: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def neuron(eingaben, gewichte, schwelle):
    pass

print(round(neuron(np.array([1.0, 2.0]), np.array([0.5, 1.0]), 0.1), 4))
print(round(neuron(np.array([1.0, 1.0]), np.array([1.0, -1.0]), 0.0), 4))`,
      tipps: ["Das Skalarprodukt bekommst du mit `eingaben @ gewichte` oder `np.dot`.",
              "Addiere die Schwelle auf das Ergebnis, bevor du Sigmoid anwendest.",
              "Wandle das Ergebnis mit `float(...)` um, damit `round` sauber arbeitet."],
      loesung: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def neuron(eingaben, gewichte, schwelle):
    """Berechnet die Ausgabe eines einzelnen Neurons."""
    summe = float(eingaben @ gewichte) + schwelle
    return float(sigmoid(summe))


print(round(neuron(np.array([1.0, 2.0]), np.array([0.5, 1.0]), 0.1), 4))
print(round(neuron(np.array([1.0, 1.0]), np.array([1.0, -1.0]), 0.0), 4))`,
      tests: [
        T("Das erste Beispiel stimmt", `import numpy as np\ne = neuron(np.array([1.0, 2.0]), np.array([0.5, 1.0]), 0.1)\nassert abs(e - 0.9308615796566533) < 1e-6, f"Ergebnis: {e}"`),
        T("Bei Summe null kommt 0.5", `import numpy as np\ne = neuron(np.array([1.0, 1.0]), np.array([1.0, -1.0]), 0.0)\nassert abs(e - 0.5) < 1e-9, f"Ergebnis: {e}"`),
        T("Die Schwelle wirkt", `import numpy as np\na = neuron(np.array([0.0]), np.array([0.0]), 0.0)\nb = neuron(np.array([0.0]), np.array([0.0]), 2.0)\nassert b > a, "Die Schwelle muss das Ergebnis verschieben"`),
        T("Das Ergebnis liegt zwischen null und eins", `import numpy as np\nfor s in (-50.0, 0.0, 50.0):\n    e = neuron(np.array([1.0]), np.array([1.0]), s)\n    assert 0.0 <= e <= 1.0, f"Ausserhalb: {e}"`),
      ],
    },
    {
      id: "a42-2",
      titel: "Softmax und Verlust",
      text: [P("Setze `softmax(werte)` numerisch stabil um und `verlust(wahrscheinlichkeiten, richtige_klasse)` als negativen Logarithmus der Wahrscheinlichkeit der richtigen Klasse."),
             P("Erwartete Ausgabe:"),
             ROH("[0.659 0.242 0.099]\n0.4170\n2.3170")],
      pakete: ["numpy"],
      start: `import numpy as np

def softmax(werte):
    pass

def verlust(wahrscheinlichkeiten, richtige_klasse):
    pass

roh = np.array([2.0, 1.0, 0.1])
w = softmax(roh)

print(w.round(3))
print(f"{verlust(w, 0):.4f}")
print(f"{verlust(w, 2):.4f}")`,
      tipps: ["Ziehe vor `np.exp` das Maximum ab, sonst laeuft die Rechnung bei grossen Werten ueber.",
              "Teile danach durch die Summe, damit alles zusammen eins ergibt.",
              "Der Verlust ist `-np.log(wahrscheinlichkeiten[richtige_klasse])`."],
      loesung: `import numpy as np

def softmax(werte):
    """Wandelt Rohwerte in Wahrscheinlichkeiten um."""
    e = np.exp(werte - werte.max())
    return e / e.sum()


def verlust(wahrscheinlichkeiten, richtige_klasse):
    """Negativer Logarithmus der Wahrscheinlichkeit der richtigen Klasse."""
    return float(-np.log(wahrscheinlichkeiten[richtige_klasse]))


roh = np.array([2.0, 1.0, 0.1])
w = softmax(roh)

print(w.round(3))
print(f"{verlust(w, 0):.4f}")
print(f"{verlust(w, 2):.4f}")`,
      tests: [
        T("Die Summe ergibt eins", `import numpy as np\nassert abs(float(softmax(np.array([2.0, 1.0, 0.1])).sum()) - 1.0) < 1e-9`),
        T("Die Werte stimmen", `import numpy as np\nassert np.allclose(softmax(np.array([2.0, 1.0, 0.1])), [0.65900114, 0.24243297, 0.09856589]), "Werte weichen ab"`),
        T("Sie ist numerisch stabil", `import numpy as np\ne = softmax(np.array([1000.0, 999.0]))\nassert np.isfinite(e).all(), "Bei grossen Zahlen laeuft exp ueber, ziehe das Maximum ab"`),
        T("Der Verlust bei richtiger Vorhersage ist klein", `import numpy as np\nw = softmax(np.array([2.0, 1.0, 0.1]))\nassert verlust(w, 0) < verlust(w, 2), "Die wahrscheinlichere Klasse muss weniger Verlust haben"`),
        T("Der Verlust stimmt genau", `import numpy as np\nw = softmax(np.array([2.0, 1.0, 0.1]))\nassert abs(verlust(w, 0) - 0.41703) < 1e-4, f"Ergebnis: {verlust(w, 0)}"`),
        T("Die Reihenfolge bleibt erhalten", `import numpy as np\ne = softmax(np.array([3.0, 1.0, 2.0]))\nassert int(e.argmax()) == 0, "Der groesste Rohwert muss die hoechste Wahrscheinlichkeit bekommen"`),
      ],
    },
  ],
});

M8.push({
  id: "l-perzeptron",
  titel: "Ein lernendes Modell von Hand",
  dauer: 22,
  vorspann: "Jetzt setzt sich alles zusammen. Du baust ein Perzeptron, das kleinste lernende Modell, komplett selbst. Ohne Bibliothek, in etwa dreissig Zeilen.",
  ziele: [
    "Den Aufbau eines Perzeptrons verstehen",
    "Die Lernregel selbst umsetzen",
    "Training und Auswertung trennen",
    "Die Grenzen des Modells kennen",
  ],
  inhalt: [
    H2("Was ein Perzeptron tut"),
    P("Ein Perzeptron bekommt Zahlen als Eingabe, gewichtet sie, addiert eine Schwelle und entscheidet: null oder eins. Das Lernen besteht darin, die Gewichte so lange anzupassen, bis die Entscheidungen stimmen."),
    ROH(`Eingaben ---> gewichtete Summe ---> Schwellenfunktion ---> 0 oder 1
   x1 ----w1--\\
   x2 ----w2---+--> summe + b --> 1 wenn summe > 0, sonst 0
   x3 ----w3--/`),

    H2("Die Vorhersage"),
    C(`import numpy as np

def vorhersage(x, gewichte, schwelle):
    """Gibt 1 zurueck, wenn die gewichtete Summe positiv ist."""
    return 1 if float(x @ gewichte) + schwelle > 0 else 0


gewichte = np.array([1.0, 1.0])
schwelle = -1.5

for eingabe in [[0, 0], [0, 1], [1, 0], [1, 1]]:
    x = np.array(eingabe, dtype=float)
    print(f"{eingabe} -> {vorhersage(x, gewichte, schwelle)}")`,
      { pakete: ["numpy"], aus: "[0, 0] -> 0\n[0, 1] -> 0\n[1, 0] -> 0\n[1, 1] -> 1" }),
    P("Diese von Hand gesetzten Gewichte bilden bereits das logische Und ab: nur wenn beide Eingaben eins sind, uebersteigt die Summe die Schwelle von 1.5. Jetzt soll das Modell solche Gewichte **selbst finden**."),

    H2("Die Lernregel"),
    P("Die Regel ist verblueffend einfach. Fuer jedes Beispiel:"),
    NR(
      "Sage etwas vorher.",
      "Berechne den Fehler: wahr minus vorhergesagt. Er ist 0, 1 oder -1.",
      "Verschiebe jedes Gewicht um `lernrate * fehler * eingabe`.",
      "Verschiebe die Schwelle um `lernrate * fehler`.",
    ),
    P("Die Logik dahinter: war die Vorhersage zu niedrig, ist der Fehler positiv, und die Gewichte wachsen dort, wo die Eingabe gross war. War sie zu hoch, schrumpfen sie."),
    C(`import numpy as np

def vorhersage(x, gewichte, schwelle):
    return 1 if float(x @ gewichte) + schwelle > 0 else 0


def trainiere(X, y, lernrate=0.1, epochen=20):
    """Lernt Gewichte und Schwelle aus Beispieldaten."""
    gewichte = np.zeros(X.shape[1])
    schwelle = 0.0

    for epoche in range(epochen):
        fehler_gesamt = 0
        for x, wahr in zip(X, y):
            geschaetzt = vorhersage(x, gewichte, schwelle)
            fehler = wahr - geschaetzt
            if fehler != 0:
                gewichte += lernrate * fehler * x
                schwelle += lernrate * fehler
                fehler_gesamt += 1
        if fehler_gesamt == 0:
            print(f"Nach {epoche + 1} Epochen fehlerfrei")
            break

    return gewichte, schwelle


X = np.array([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
y = np.array([0, 0, 0, 1])

g, s = trainiere(X, y)

print("Gewichte:", g.round(2))
print("Schwelle:", round(s, 2))
print()
for x, wahr in zip(X, y):
    print(f"{x} -> {vorhersage(x, g, s)}  (erwartet {wahr})")`,
      { pakete: ["numpy"],
        aus: "Nach 6 Epochen fehlerfrei\nGewichte: [0.2 0.1]\nSchwelle: -0.2\n\n[0. 0.] -> 0  (erwartet 0)\n[0. 1.] -> 0  (erwartet 0)\n[1. 0.] -> 0  (erwartet 0)\n[1. 1.] -> 1  (erwartet 1)" }),
    P("Das Modell hat die Gewichte selbst gefunden. Es sind andere als die, die wir von Hand gesetzt haben, und sie funktionieren genauso gut. Es gibt nicht die eine richtige Loesung, sondern viele gleichwertige."),

    H2("Mit echten Daten"),
    C(`import numpy as np

def vorhersage(x, gewichte, schwelle):
    return 1 if float(x @ gewichte) + schwelle > 0 else 0


def trainiere(X, y, lernrate=0.01, epochen=50):
    gewichte = np.zeros(X.shape[1])
    schwelle = 0.0
    verlauf = []

    for _ in range(epochen):
        falsch = 0
        for x, wahr in zip(X, y):
            fehler = wahr - vorhersage(x, gewichte, schwelle)
            if fehler != 0:
                gewichte += lernrate * fehler * x
                schwelle += lernrate * fehler
                falsch += 1
        verlauf.append(falsch)

    return gewichte, schwelle, verlauf


# Merkmale: Groesse in cm, Gewicht in kg. Ziel: 1 fuer Gruppe B
X = np.array([
    [150.0, 50.0], [155.0, 55.0], [160.0, 52.0], [158.0, 58.0],
    [180.0, 85.0], [185.0, 90.0], [178.0, 82.0], [190.0, 95.0],
])
y = np.array([0, 0, 0, 0, 1, 1, 1, 1])

# Normieren, sonst dominiert die Groesse allein durch ihren Zahlenbereich
mittel = X.mean(axis=0)
streuung = X.std(axis=0)
X_norm = (X - mittel) / streuung

g, s, verlauf = trainiere(X_norm, y)

richtig = sum(vorhersage(x, g, s) == wahr for x, wahr in zip(X_norm, y))
print(f"Treffer: {richtig} von {len(y)}")
print(f"Fehler je Epoche (erste zehn): {verlauf[:10]}")
print(f"Gewichte: {g.round(3)}")`,
      { pakete: ["numpy"],
        aus: "Treffer: 8 von 8\nFehler je Epoche (erste zehn): [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]\nGewichte: [0.007 0.008]" }),
    WARN("Normieren ist keine Kosmetik",
      "Ohne die Normierung liegt die Groesse bei 150 bis 190, das Gewicht bei 50 bis 95. Das Modell wuerde die Groesse allein deshalb staerker gewichten, weil ihre Zahlen groesser sind, nicht weil sie aussagekraeftiger ist. Normieren gehoert vor praktisch jedes Training.",
    ),

    H2("Trainieren und pruefen trennen"),
    P("Ein Modell an denselben Daten zu messen, mit denen es gelernt hat, sagt nichts aus. Es koennte sie einfach auswendig gelernt haben. Deshalb teilt man auf."),
    C(`import numpy as np

def vorhersage(x, g, s):
    return 1 if float(x @ g) + s > 0 else 0

def trainiere(X, y, lernrate=0.05, epochen=60):
    g = np.zeros(X.shape[1])
    s = 0.0
    for _ in range(epochen):
        for x, wahr in zip(X, y):
            fehler = wahr - vorhersage(x, g, s)
            g += lernrate * fehler * x
            s += lernrate * fehler
    return g, s

def genauigkeit(X, y, g, s):
    treffer = sum(vorhersage(x, g, s) == w for x, w in zip(X, y))
    return treffer / len(y)


rng = np.random.default_rng(42)
n = 200
gruppe_a = rng.normal(loc=[-2.0, -2.0], scale=1.0, size=(n // 2, 2))
gruppe_b = rng.normal(loc=[2.0, 2.0], scale=1.0, size=(n // 2, 2))

X = np.vstack([gruppe_a, gruppe_b])
y = np.array([0] * (n // 2) + [1] * (n // 2))

mischung = rng.permutation(n)
X, y = X[mischung], y[mischung]

grenze = int(n * 0.7)
X_train, X_test = X[:grenze], X[grenze:]
y_train, y_test = y[:grenze], y[grenze:]

g, s = trainiere(X_train, y_train)

print(f"Trainingsdaten: {len(y_train)}, Testdaten: {len(y_test)}")
print(f"Genauigkeit im Training: {genauigkeit(X_train, y_train, g, s):.1%}")
print(f"Genauigkeit im Test:     {genauigkeit(X_test, y_test, g, s):.1%}")`,
      { pakete: ["numpy"], lauf: true, nichtpruefen: true }),
    P("Fuehre das aus. Beide Werte sollten nahe beieinander liegen. Faellt der Testwert deutlich ab, hat das Modell **ueberangepasst**: es hat die Trainingsdaten auswendig gelernt statt das Muster zu erfassen."),
    TAB(["Beobachtung", "Bedeutung", "Gegenmittel"],
      ["Beide Werte niedrig", "Unteranpassung, Modell zu einfach", "mehr Merkmale, komplexeres Modell"],
      ["Training hoch, Test niedrig", "Ueberanpassung", "mehr Daten, einfacheres Modell, Regularisierung"],
      ["Beide hoch und nah", "gut", "nichts"],
    ),

    H2("Die Grenze des Perzeptrons"),
    P("Ein Perzeptron kann nur Daten trennen, zwischen denen sich eine gerade Linie ziehen laesst. Das beruehmteste Gegenbeispiel ist das ausschliessende Oder:"),
    C(`import numpy as np

def vorhersage(x, g, s):
    return 1 if float(x @ g) + s > 0 else 0

def trainiere(X, y, lernrate=0.1, epochen=200):
    g = np.zeros(X.shape[1])
    s = 0.0
    for _ in range(epochen):
        for x, wahr in zip(X, y):
            fehler = wahr - vorhersage(x, g, s)
            g += lernrate * fehler * x
            s += lernrate * fehler
    return g, s


X = np.array([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
y_und = np.array([0, 0, 0, 1])
y_xor = np.array([0, 1, 1, 0])

for name, y in (("UND", y_und), ("XOR", y_xor)):
    g, s = trainiere(X, y)
    treffer = sum(vorhersage(x, g, s) == w for x, w in zip(X, y))
    print(f"{name}: {treffer} von 4 richtig")`,
      { pakete: ["numpy"], aus: "UND: 4 von 4 richtig\nXOR: 2 von 4 richtig" }),
    P("Beim ausschliessenden Oder scheitert das Modell, egal wie lange es trainiert. Keine Gerade trennt die Punkte. Genau diese Erkenntnis fuehrte 1969 zu einem Stillstand der KI-Forschung, der erst endete, als man Neuronen in **mehreren Schichten** anordnete."),
    MERKE("Der Schritt zum tiefen Netz",
      "Ein mehrschichtiges Netz mit nichtlinearer Aktivierung kann das ausschliessende Oder loesen. Genau das ist der Unterschied zwischen einem Perzeptron und einem neuronalen Netz: mehrere Schichten und eine Aktivierungsfunktion dazwischen.",
    ),
  ],
  quiz: [
    Q("Was berechnet ein Perzeptron zuerst?",
      ["Den Mittelwert der Eingaben", "Die gewichtete Summe der Eingaben plus Schwelle",
       "Die Ableitung", "Den Verlust"], 1,
      "Skalarprodukt aus Eingaben und Gewichten, dann die Schwelle dazu, dann die Entscheidung."),
    Q("Was passiert bei der Lernregel, wenn die Vorhersage stimmt?",
      ["Die Gewichte werden verdoppelt", "Der Fehler ist null, also aendert sich nichts",
       "Die Lernrate wird verkleinert", "Das Training bricht ab"], 1,
      "Die Aenderung ist proportional zum Fehler. Bei Fehler null bleibt alles wie es ist."),
    Q("Warum muss man Merkmale vor dem Training normieren?",
      ["Damit die Rechnung schneller ist",
       "Damit Merkmale mit groesseren Zahlenbereichen nicht allein dadurch staerker wiegen",
       "Weil NumPy es verlangt",
       "Um fehlende Werte zu ersetzen"],
      1,
      "Ohne Normierung dominiert das Merkmal mit dem groessten Zahlenbereich, unabhaengig von seiner Aussagekraft."),
    Q("Was bedeutet es, wenn die Genauigkeit im Training hoch und im Test niedrig ist?",
      ["Das Modell ist zu einfach", "Das Modell hat ueberangepasst",
       "Die Lernrate ist zu klein", "Die Testdaten sind falsch"], 1,
      "Es hat die Trainingsdaten auswendig gelernt, statt das dahinterliegende Muster zu erfassen."),
    Q("Warum scheitert ein Perzeptron am ausschliessenden Oder?",
      ["Es braucht mehr Epochen",
       "Die Punkte lassen sich nicht durch eine Gerade trennen",
       "Die Lernrate ist zu gross",
       "Es fehlt die Normierung"],
      1,
      "Ein einzelnes Perzeptron kann nur linear trennen. Dafuer braucht es mehrere Schichten."),
    Q("Wofuer teilt man Daten in Training und Test?",
      ["Um Speicher zu sparen",
       "Um zu pruefen, ob das Modell auf ungesehenen Daten funktioniert",
       "Um schneller zu trainieren",
       "Weil die Bibliothek es verlangt"],
      1,
      "An den Trainingsdaten gemessen sieht jedes Modell gut aus, auch eines, das nur auswendig gelernt hat."),
  ],
  aufgaben: [
    {
      id: "a43-1",
      titel: "Die Lernregel umsetzen",
      text: [P("Vervollstaendige `lernschritt(x, wahr, gewichte, schwelle, lernrate)`. Die Funktion soll die neuen Gewichte und die neue Schwelle als Tupel zurueckgeben."),
             P("Erwartete Ausgabe:"),
             ROH("[0.1 0.2] 0.1\n[0. 0.] 0.0")],
      pakete: ["numpy"],
      start: `import numpy as np

def vorhersage(x, gewichte, schwelle):
    return 1 if float(x @ gewichte) + schwelle > 0 else 0

def lernschritt(x, wahr, gewichte, schwelle, lernrate=0.1):
    pass

g = np.zeros(2)
s = 0.0

# Ein Beispiel, das falsch vorhergesagt wird
g2, s2 = lernschritt(np.array([1.0, 2.0]), 1, g, s, 0.1)
print(g2.round(4), round(s2, 4))

# Ein Beispiel, das richtig vorhergesagt wird
g3, s3 = lernschritt(np.array([1.0, 2.0]), 0, g, s, 0.1)
print(g3.round(4), round(s3, 4))`,
      tipps: ["Der Fehler ist `wahr - vorhersage(...)`.",
              "Die neuen Gewichte sind `gewichte + lernrate * fehler * x`.",
              "Arbeite mit einer Kopie, damit die uebergebenen Gewichte unveraendert bleiben."],
      loesung: `import numpy as np

def vorhersage(x, gewichte, schwelle):
    return 1 if float(x @ gewichte) + schwelle > 0 else 0


def lernschritt(x, wahr, gewichte, schwelle, lernrate=0.1):
    """Fuehrt einen einzelnen Lernschritt aus."""
    fehler = wahr - vorhersage(x, gewichte, schwelle)
    neue_gewichte = gewichte + lernrate * fehler * x
    neue_schwelle = schwelle + lernrate * fehler
    return neue_gewichte, neue_schwelle


g = np.zeros(2)
s = 0.0

g2, s2 = lernschritt(np.array([1.0, 2.0]), 1, g, s, 0.1)
print(g2.round(4), round(s2, 4))

g3, s3 = lernschritt(np.array([1.0, 2.0]), 0, g, s, 0.1)
print(g3.round(4), round(s3, 4))`,
      tests: [
        T("Bei einem Fehler wachsen die Gewichte", `import numpy as np\ng, s = lernschritt(np.array([1.0, 2.0]), 1, np.zeros(2), 0.0, 0.1)\nassert np.allclose(g, [0.1, 0.2]), f"Gewichte: {g}"\nassert abs(s - 0.1) < 1e-9, f"Schwelle: {s}"`),
        T("Ohne Fehler aendert sich nichts", `import numpy as np\ng, s = lernschritt(np.array([1.0, 2.0]), 0, np.zeros(2), 0.0, 0.1)\nassert np.allclose(g, [0.0, 0.0]) and s == 0.0, f"Gewichte: {g}, Schwelle: {s}"`),
        T("Zu hohe Vorhersagen verkleinern die Gewichte", `import numpy as np\ng, s = lernschritt(np.array([1.0, 1.0]), 0, np.array([1.0, 1.0]), 0.0, 0.1)\nassert g[0] < 1.0, f"Gewichte: {g}"`),
        T("Die uebergebenen Gewichte bleiben unveraendert", `import numpy as np\nstart = np.zeros(2)\nlernschritt(np.array([1.0, 2.0]), 1, start, 0.0, 0.1)\nassert np.allclose(start, [0.0, 0.0]), "Die Ausgangsgewichte duerfen sich nicht aendern"`),
        T("Die Lernrate wirkt", `import numpy as np\ng1, _ = lernschritt(np.array([1.0]), 1, np.zeros(1), 0.0, 0.1)\ng2, _ = lernschritt(np.array([1.0]), 1, np.zeros(1), 0.0, 0.5)\nassert g2[0] > g1[0], "Eine groessere Lernrate muss staerker verschieben"`),
      ],
    },
    {
      id: "a43-2",
      titel: "Genauigkeit messen",
      text: [P("Schreibe `genauigkeit(X, y, gewichte, schwelle)`, die den Anteil richtiger Vorhersagen zurueckgibt, und `aufteilen(X, y, anteil)`, die Trainings- und Testdaten trennt."),
             P("`aufteilen` gibt vier Werte zurueck: `X_train, X_test, y_train, y_test`."),
             P("Erwartete Ausgabe:"),
             ROH("0.75\n7 3")],
      pakete: ["numpy"],
      start: `import numpy as np

def vorhersage(x, gewichte, schwelle):
    return 1 if float(x @ gewichte) + schwelle > 0 else 0

def genauigkeit(X, y, gewichte, schwelle):
    pass

def aufteilen(X, y, anteil=0.7):
    pass

X = np.array([[1.0], [2.0], [3.0], [4.0]])
y = np.array([0, 0, 1, 1])
print(genauigkeit(X, y, np.array([1.0]), -3.5))

X10 = np.arange(10.0).reshape(10, 1)
y10 = np.array([0] * 10)
a, b, c, d = aufteilen(X10, y10, 0.7)
print(len(a), len(b))`,
      tipps: ["Zaehle die Treffer mit einer Summe ueber einen Generatorausdruck.",
              "Teile durch die Anzahl der Beispiele.",
              "Fuer das Aufteilen berechnest du die Grenze mit `int(len(y) * anteil)` und schneidest beide Arrays."],
      loesung: `import numpy as np

def vorhersage(x, gewichte, schwelle):
    return 1 if float(x @ gewichte) + schwelle > 0 else 0


def genauigkeit(X, y, gewichte, schwelle):
    """Anteil richtiger Vorhersagen."""
    treffer = sum(vorhersage(x, gewichte, schwelle) == wahr for x, wahr in zip(X, y))
    return treffer / len(y)


def aufteilen(X, y, anteil=0.7):
    """Trennt die Daten in Trainings- und Testteil."""
    grenze = int(len(y) * anteil)
    return X[:grenze], X[grenze:], y[:grenze], y[grenze:]


X = np.array([[1.0], [2.0], [3.0], [4.0]])
y = np.array([0, 0, 1, 1])
print(genauigkeit(X, y, np.array([1.0]), -3.5))

X10 = np.arange(10.0).reshape(10, 1)
y10 = np.array([0] * 10)
a, b, c, d = aufteilen(X10, y10, 0.7)
print(len(a), len(b))`,
      tests: [
        T("Die Genauigkeit stimmt", `import numpy as np\nX = np.array([[1.0], [2.0], [3.0], [4.0]])\ny = np.array([0, 0, 1, 1])\nassert abs(genauigkeit(X, y, np.array([1.0]), -3.5) - 0.75) < 1e-9, f"Ergebnis: {genauigkeit(X, y, np.array([1.0]), -3.5)}"`),
        T("Perfekte Vorhersagen ergeben eins", `import numpy as np\nX = np.array([[1.0], [2.0]])\ny = np.array([0, 1])\nassert abs(genauigkeit(X, y, np.array([1.0]), -1.5) - 1.0) < 1e-9`),
        T("Die Aufteilung stimmt", `import numpy as np\nX = np.arange(10.0).reshape(10, 1)\ny = np.zeros(10)\na, b, c, d = aufteilen(X, y, 0.7)\nassert len(a) == 7 and len(b) == 3, f"Groessen: {len(a)}, {len(b)}"`),
        T("Auch die Zielwerte werden geteilt", `import numpy as np\nX = np.arange(10.0).reshape(10, 1)\ny = np.arange(10)\na, b, c, d = aufteilen(X, y, 0.7)\nassert len(c) == 7 and len(d) == 3, f"Groessen: {len(c)}, {len(d)}"`),
        T("Die Reihenfolge bleibt erhalten", `import numpy as np\nX = np.arange(10.0).reshape(10, 1)\ny = np.arange(10)\na, b, c, d = aufteilen(X, y, 0.5)\nassert c[0] == 0 and d[0] == 5, "Die Aufteilung soll die Reihenfolge beibehalten"`),
      ],
    },
  ],
});

M8.push({
  id: "l-gradientenabstieg",
  titel: "Gradientenabstieg und der Weg weiter",
  dauer: 20,
  vorspann: "Der Gradientenabstieg ist das Verfahren, mit dem praktisch jedes moderne Modell lernt, vom kleinen Netz bis zum Sprachmodell. Hier baust du ihn selbst und siehst, wie es weitergeht.",
  ziele: [
    "Den Gradientenabstieg Schritt fuer Schritt nachvollziehen",
    "Die Rolle der Lernrate verstehen",
    "Eine lineare Regression selbst trainieren",
    "Das Oekosystem einordnen und wissen, was als Naechstes kommt",
  ],
  inhalt: [
    H2("Die Idee"),
    P("Stell dir eine Landschaft aus Huegeln und Taelern vor. Die Hoehe ist der Fehler deines Modells, die Position sind die Gewichte. Du suchst den tiefsten Punkt, siehst aber nur den Boden direkt unter dir."),
    P("Das Verfahren: schau nach, in welche Richtung es am staerksten bergab geht, und mach einen kleinen Schritt dorthin. Wiederhole das. Die Richtung liefert der Gradient, die Schrittgroesse die Lernrate."),
    C(`def f(x):
    """Die Funktion, deren Minimum wir suchen."""
    return (x - 3) ** 2 + 1

def ableitung(x):
    return 2 * (x - 3)


x = 10.0
lernrate = 0.1

print(f"Start:  x = {x:.4f}, f(x) = {f(x):.4f}")

for schritt in range(1, 31):
    x = x - lernrate * ableitung(x)
    if schritt in (1, 2, 5, 10, 20, 30):
        print(f"Schritt {schritt:>2}: x = {x:.4f}, f(x) = {f(x):.4f}")`,
      { aus: "Start:  x = 10.0000, f(x) = 50.0000\nSchritt  1: x = 8.6000, f(x) = 32.3600\nSchritt  2: x = 7.4800, f(x) = 21.0704\nSchritt  5: x = 5.2938, f(x) = 6.2613\nSchritt 10: x = 3.7516, f(x) = 1.5649\nSchritt 20: x = 3.0807, f(x) = 1.0065\nSchritt 30: x = 3.0087, f(x) = 1.0001" }),
    P("Das Minimum liegt bei `x = 3`. Das Verfahren naehert sich ihm, ohne die Loesung zu kennen. Es folgt nur der lokalen Steigung. Genau so lernt ein neuronales Netz, nur mit Millionen von `x` gleichzeitig."),
    ROH(`neues_gewicht = altes_gewicht - lernrate * gradient`),

    H2("Die Lernrate"),
    C(`def f(x):
    return (x - 3) ** 2 + 1

def ableitung(x):
    return 2 * (x - 3)


for lernrate in (0.01, 0.1, 0.9, 1.5):
    x = 10.0
    for _ in range(50):
        x = x - lernrate * ableitung(x)
        if abs(x) > 1e10:
            break
    zustand = "laeuft weg" if abs(x) > 1e10 else f"x = {x:.4f}"
    print(f"Lernrate {lernrate:>5}: {zustand}")`,
      { aus: "Lernrate  0.01: x = 5.5492\nLernrate   0.1: x = 3.0001\nLernrate   0.9: x = 3.0001\nLernrate   1.5: laeuft weg" }),
    TAB(["Lernrate", "Verhalten"],
      ["zu klein", "kommt an, braucht aber sehr lange"],
      ["passend", "naehert sich zuegig und stabil"],
      ["etwas zu gross", "springt hin und her, kommt trotzdem an"],
      ["zu gross", "schaukelt sich auf und laeuft weg"],
    ),
    MERKE("Die wichtigste Stellschraube",
      "Die Lernrate ist der Wert, an dem du beim Training zuerst drehst. Uebliche Startwerte liegen zwischen 0.001 und 0.1. Explodiert der Verlust oder wird er zu `nan`, ist sie fast immer zu gross.",
    ),

    H2("Eine lineare Regression selbst trainieren"),
    P("Jetzt der echte Fall: aus Daten eine Gerade lernen, die den Zusammenhang beschreibt."),
    C(`import numpy as np

# Daten mit bekanntem Zusammenhang: y = 2x + 5, mit etwas Rauschen
rng = np.random.default_rng(7)
X = np.linspace(0, 10, 50)
y = 2.0 * X + 5.0 + rng.normal(0, 1.0, 50)

steigung = 0.0
achsenabschnitt = 0.0
lernrate = 0.01
n = len(X)

for epoche in range(1, 1001):
    vorhersage = steigung * X + achsenabschnitt
    fehler = vorhersage - y

    # Ableitungen des mittleren quadratischen Fehlers
    grad_steigung = (2 / n) * np.sum(fehler * X)
    grad_abschnitt = (2 / n) * np.sum(fehler)

    steigung -= lernrate * grad_steigung
    achsenabschnitt -= lernrate * grad_abschnitt

    if epoche in (1, 10, 100, 1000):
        verlust = np.mean(fehler ** 2)
        print(f"Epoche {epoche:>4}: Verlust {verlust:>8.4f}, "
              f"Steigung {steigung:.3f}, Abschnitt {achsenabschnitt:.3f}")

print()
print(f"Gelernt:  y = {steigung:.2f} * x + {achsenabschnitt:.2f}")
print("Gesucht:  y = 2.00 * x + 5.00")`,
      { pakete: ["numpy"], lauf: true, nichtpruefen: true }),
    P("Fuehre das aus. Der Verlust faellt, und die gelernten Werte naehern sich den wahren an. Das ist maschinelles Lernen in seiner reinsten Form: kein Auswendiglernen, sondern das Anpassen weniger Zahlen, bis der Fehler klein ist."),
    HINWEIS("Die Ableitungen",
      "Der Verlust ist der Mittelwert der quadrierten Fehler. Seine Ableitung nach der Steigung ist der Mittelwert von `2 * fehler * x`, nach dem Abschnitt der Mittelwert von `2 * fehler`. Diese beiden Formeln musst du im echten Einsatz nie selbst herleiten, das erledigt die Bibliothek.",
    ),

    H2("Automatische Ableitung"),
    P("Genau das ist die eigentliche Leistung von PyTorch und TensorFlow: sie merken sich jede Rechenoperation und koennen die Ableitung danach automatisch bestimmen, egal wie kompliziert das Modell ist."),
    C(`# So saehe dasselbe Training in PyTorch aus
import torch

X = torch.linspace(0, 10, 50)
y = 2.0 * X + 5.0

steigung = torch.zeros(1, requires_grad=True)
abschnitt = torch.zeros(1, requires_grad=True)
optimierer = torch.optim.SGD([steigung, abschnitt], lr=0.01)

for epoche in range(1000):
    vorhersage = steigung * X + abschnitt
    verlust = ((vorhersage - y) ** 2).mean()

    optimierer.zero_grad()
    verlust.backward()          # hier entstehen die Ableitungen von selbst
    optimierer.step()

print(f"y = {steigung.item():.2f} * x + {abschnitt.item():.2f}")`,
      { lauf: false, name: "so sieht es mit PyTorch aus" }),
    P("Der Kern ist derselbe: Vorhersage, Verlust, Ableitung, Schritt. Nur muss niemand mehr die Ableitungen selbst hinschreiben. `verlust.backward()` erledigt das fuer beliebig verschachtelte Modelle."),

    H2("Das Oekosystem"),
    TAB(["Bibliothek", "Wofuer", "Wann du sie brauchst"],
      ["**NumPy**", "Zahlenfelder, Grundrechnen", "immer, sie liegt allem zugrunde"],
      ["**pandas**", "Tabellen laden und bereinigen", "bei jedem echten Datensatz"],
      ["**Matplotlib**", "Diagramme", "um Daten und Verlauf anzuschauen"],
      ["**scikit-learn**", "klassische Verfahren, Aufteilen, Kennzahlen", "fuer alles ausser tiefen Netzen"],
      ["**PyTorch**", "neuronale Netze, Grafikkarte", "fuer tiefe Netze, in der Forschung Standard"],
      ["**TensorFlow**", "dasselbe, anderer Ansatz", "in manchen Unternehmen gesetzt"],
      ["**Hugging Face**", "fertige Sprach- und Bildmodelle", "wenn du nicht bei null anfangen willst"],
    ),
    C(`# So sieht ein vollstaendiger Durchlauf mit scikit-learn aus
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)

skalierer = StandardScaler()
X_train = skalierer.fit_transform(X_train)
X_test = skalierer.transform(X_test)

modell = LogisticRegression()
modell.fit(X_train, y_train)

vorhersagen = modell.predict(X_test)
print(f"Genauigkeit: {accuracy_score(y_test, vorhersagen):.1%}")
print(classification_report(y_test, vorhersagen))`,
      { lauf: false, name: "typischer Ablauf mit scikit-learn" }),
    P("Erkennst du die Schritte wieder? Aufteilen, normieren, trainieren, vorhersagen, messen. Genau das hast du in den letzten beiden Lektionen von Hand gebaut. Der Unterschied ist nur, dass hier jeder Schritt eine Zeile ist."),
    WARN("Der Skalierer wird nur am Training angepasst",
      "`fit_transform` beim Training, aber nur `transform` beim Test. Wuerdest du den Skalierer auch an den Testdaten anpassen, fliesst Wissen ueber die Testdaten ins Training ein. Das nennt man Datenleck und macht jede Messung wertlos.",
    ),

    H2("Wie es weitergeht"),
    NR(
      "**Uebe an echten Daten.** Such dir einen Datensatz, der dich interessiert. Lade ihn mit pandas, schau ihn dir an, stelle eine Frage und beantworte sie.",
      "**Lerne scikit-learn.** Die einheitliche Schnittstelle aus `fit`, `predict` und `score` gilt fuer Dutzende Verfahren. Wer eines kann, kann alle.",
      "**Verstehe die Kennzahlen.** Genauigkeit allein taeuscht. Bei neunundneunzig Prozent gesunden Patienten erreicht ein Modell, das immer *gesund* sagt, neunundneunzig Prozent Genauigkeit und ist trotzdem wertlos. Lies dich in Praezision, Trefferquote und die Wahrheitsmatrix ein.",
      "**Dann erst tiefe Netze.** PyTorch lohnt sich, wenn du Bilder, Text oder Ton verarbeitest. Fuer Tabellendaten sind klassische Verfahren oft besser und immer schneller.",
      "**Schreib alles auf.** Welche Daten, welche Aufbereitung, welche Einstellungen, welches Ergebnis. Ein Experiment, das du nicht wiederholen kannst, ist kein Ergebnis.",
    ),
    MERKE("Der wichtigste Rat",
      "In der KI liegt der Erfolg selten am Modell. Er liegt an den Daten: ihrer Qualitaet, ihrer Aufbereitung und daran, ob die gestellte Frage ueberhaupt beantwortbar ist. Wer Daten sauber verarbeiten kann, und genau das hast du in diesem Kurs gelernt, hat den groesseren Teil des Wegs hinter sich.",
    ),
    P("Du kannst jetzt Python. Nicht nur die Schreibweise, sondern die Denkweise dahinter: Probleme zerlegen, Daten strukturieren, Fehler lesen, Code schreiben, den andere verstehen. Das traegt weit ueber diesen Kurs hinaus."),
  ],
  quiz: [
    Q("Was macht ein Schritt des Gradientenabstiegs?",
      ["Er probiert zufaellige Gewichte aus",
       "Er verschiebt die Gewichte entgegen der Steigung des Fehlers",
       "Er berechnet den Fehler neu",
       "Er teilt die Daten auf"],
      1,
      "`neues_gewicht = altes_gewicht - lernrate * gradient`. Entgegen der Steigung geht es bergab."),
    Q("Was passiert bei einer zu grossen Lernrate?",
      ["Das Training dauert laenger", "Das Verfahren schaukelt sich auf und laeuft weg",
       "Die Gewichte werden null", "Nichts Besonderes"], 1,
      "Die Schritte ueberspringen das Minimum und werden immer groesser. Der Verlust wird dann oft `nan`."),
    Q("Was leistet die automatische Ableitung in PyTorch?",
      ["Sie beschleunigt die Rechnung",
       "Sie bestimmt die Ableitungen beliebig verschachtelter Modelle von selbst",
       "Sie waehlt die Lernrate",
       "Sie normiert die Daten"],
      1,
      "Jede Operation wird mitgeschrieben, und `backward()` rechnet die Ableitungen rueckwaerts durch."),
    Q("Warum darf der Skalierer nur am Training angepasst werden?",
      ["Aus Geschwindigkeitsgruenden",
       "Sonst fliesst Wissen ueber die Testdaten ins Training und die Messung wird wertlos",
       "Weil scikit-learn es so verlangt",
       "Damit die Formen zusammenpassen"],
      1,
      "Das nennt man Datenleck. Der Testteil muss dem Modell vollstaendig unbekannt bleiben."),
    Q("Warum ist Genauigkeit allein als Kennzahl oft irrefuehrend?",
      ["Sie ist ungenau berechnet",
       "Bei sehr ungleich verteilten Klassen erreicht auch ein nutzloses Modell hohe Werte",
       "Sie funktioniert nur bei zwei Klassen",
       "Sie beruecksichtigt die Lernrate nicht"],
      1,
      "Bei neunundneunzig Prozent einer Klasse genuegt es, immer diese zu raten. Deshalb braucht es Praezision und Trefferquote."),
    Q("Woran liegt der Erfolg eines KI-Projekts meistens?",
      ["Am gewaehlten Modell", "An den Daten und ihrer Aufbereitung",
       "An der Rechenleistung", "An der Programmiersprache"], 1,
      "Saubere, gut verstandene Daten schlagen fast immer ein aufwendigeres Modell."),
  ],
  aufgaben: [
    {
      id: "a44-1",
      titel: "Gradientenabstieg umsetzen",
      text: [P("Schreibe `minimiere(ableitung, start, lernrate, schritte)`, die den Gradientenabstieg ausfuehrt und die Endposition zurueckgibt."),
             P("Teste sie an der Funktion mit dem Minimum bei 4."),
             P("Erwartete Ausgabe:"),
             ROH("4.0\n4.0")],
      start: `def minimiere(ableitung, start, lernrate=0.1, schritte=200):
    pass

# f(x) = (x - 4) ** 2, Ableitung: 2 * (x - 4)
print(round(minimiere(lambda x: 2 * (x - 4), 0.0), 4))
print(round(minimiere(lambda x: 2 * (x - 4), 100.0), 4))`,
      tipps: ["Beginne bei `start` und wiederhole die Aktualisierung.",
              "Die Regel lautet `x = x - lernrate * ableitung(x)`.",
              "Gib am Ende den erreichten Wert zurueck."],
      loesung: `def minimiere(ableitung, start, lernrate=0.1, schritte=200):
    """Sucht das Minimum ueber den Gradientenabstieg."""
    x = start
    for _ in range(schritte):
        x = x - lernrate * ableitung(x)
    return x


print(round(minimiere(lambda x: 2 * (x - 4), 0.0), 4))
print(round(minimiere(lambda x: 2 * (x - 4), 100.0), 4))`,
      tests: [
        T("Von unten wird das Minimum gefunden", `e = minimiere(lambda x: 2 * (x - 4), 0.0)\nassert abs(e - 4.0) < 1e-4, f"Ergebnis: {e}"`),
        T("Von oben wird es auch gefunden", `e = minimiere(lambda x: 2 * (x - 4), 100.0)\nassert abs(e - 4.0) < 1e-4, f"Ergebnis: {e}"`),
        T("Eine andere Funktion funktioniert ebenso", `e = minimiere(lambda x: 2 * x, 5.0, 0.1, 300)\nassert abs(e) < 1e-4, f"Ergebnis: {e}"`),
        T("Die Schrittzahl wirkt", `a = minimiere(lambda x: 2 * (x - 4), 0.0, 0.1, 2)\nb = minimiere(lambda x: 2 * (x - 4), 0.0, 0.1, 200)\nassert abs(b - 4) < abs(a - 4), "Mehr Schritte muessen naeher ans Minimum fuehren"`),
        T("Am Minimum aendert sich nichts mehr", `e = minimiere(lambda x: 2 * (x - 4), 4.0, 0.1, 10)\nassert abs(e - 4.0) < 1e-9, f"Ergebnis: {e}"`),
      ],
    },
    {
      id: "a44-2",
      titel: "Lineare Regression trainieren",
      text: [P("Vervollstaendige `trainiere(X, y, lernrate, epochen)`, die Steigung und Achsenabschnitt per Gradientenabstieg lernt und beide als Tupel zurueckgibt."),
             P("Die Ableitungen des mittleren quadratischen Fehlers lauten:"),
             L("nach der Steigung: Mittelwert von `2 * fehler * X`",
               "nach dem Abschnitt: Mittelwert von `2 * fehler`"),
             P("Erwartete Ausgabe: `y = 2.00 * x + 5.00`")],
      pakete: ["numpy"],
      start: `import numpy as np

def trainiere(X, y, lernrate=0.01, epochen=2000):
    pass

X = np.linspace(0, 10, 50)
y = 2.0 * X + 5.0

steigung, abschnitt = trainiere(X, y)
print(f"y = {steigung:.2f} * x + {abschnitt:.2f}")`,
      tipps: ["Beginne mit beiden Werten bei null.",
              "Der Fehler ist `steigung * X + abschnitt - y`.",
              "Ziehe in jeder Epoche `lernrate * gradient` von beiden Werten ab."],
      loesung: `import numpy as np

def trainiere(X, y, lernrate=0.01, epochen=2000):
    """Lernt Steigung und Achsenabschnitt per Gradientenabstieg."""
    steigung = 0.0
    abschnitt = 0.0

    for _ in range(epochen):
        fehler = steigung * X + abschnitt - y
        grad_steigung = np.mean(2 * fehler * X)
        grad_abschnitt = np.mean(2 * fehler)
        steigung -= lernrate * grad_steigung
        abschnitt -= lernrate * grad_abschnitt

    return steigung, abschnitt


X = np.linspace(0, 10, 50)
y = 2.0 * X + 5.0

steigung, abschnitt = trainiere(X, y)
print(f"y = {steigung:.2f} * x + {abschnitt:.2f}")`,
      tests: [
        T("Die Steigung wird gelernt", `import numpy as np\nX = np.linspace(0, 10, 50)\ns, a = trainiere(X, 2.0 * X + 5.0)\nassert abs(s - 2.0) < 0.05, f"Steigung: {s}"`),
        T("Der Achsenabschnitt wird gelernt", `import numpy as np\nX = np.linspace(0, 10, 50)\ns, a = trainiere(X, 2.0 * X + 5.0)\nassert abs(a - 5.0) < 0.1, f"Abschnitt: {a}"`),
        T("Ein anderer Zusammenhang wird auch gelernt", `import numpy as np\nX = np.linspace(0, 5, 40)\ns, a = trainiere(X, -1.5 * X + 2.0, 0.02, 4000)\nassert abs(s + 1.5) < 0.05 and abs(a - 2.0) < 0.1, f"Ergebnis: {s}, {a}"`),
        T("Es kommt ein Tupel zurueck", `import numpy as np\nX = np.linspace(0, 1, 5)\ne = trainiere(X, X)\nassert isinstance(e, tuple) and len(e) == 2, f"Zurueck kam: {type(e).__name__}"`),
        T("Der Verlust sinkt waehrend des Trainings", `import numpy as np\nX = np.linspace(0, 10, 50)\ny = 2.0 * X + 5.0\ns1, a1 = trainiere(X, y, 0.01, 10)\ns2, a2 = trainiere(X, y, 0.01, 2000)\nv1 = np.mean((s1 * X + a1 - y) ** 2)\nv2 = np.mean((s2 * X + a2 - y) ** 2)\nassert v2 < v1, "Mehr Epochen muessen den Fehler verkleinern"`),
      ],
    },
  ],
});

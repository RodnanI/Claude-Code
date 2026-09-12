const M5 = modul({
  id: "m5", nr: 5, ikon: "karte",
  titel: "Objektorientierung",
  kurz: "Eigene Datentypen bauen, Verhalten buendeln und Code sauber strukturieren.",
});

M5.push({
  id: "l-klassen",
  titel: "Klassen und Objekte",
  dauer: 20,
  vorspann: "Eine Klasse ist ein Bauplan fuer Objekte, die Daten und die dazugehoerigen Faehigkeiten an einem Ort buendeln. Das ist der Schritt vom Verwalten von Werten zum Modellieren von Dingen.",
  ziele: [
    "Klassen definieren und Objekte erzeugen",
    "Die Rolle von self und __init__ verstehen",
    "Methoden und Attribute unterscheiden",
    "Klassenattribute von Objektattributen trennen",
  ],
  inhalt: [
    H2("Warum Klassen"),
    P("Stell dir vor, du verwaltest Messstationen. Ohne Klassen sieht das so aus:"),
    C(`station_name = "Nord"
station_werte = [21.4, 19.8, 24.1]

def station_schnitt(werte):
    return sum(werte) / len(werte)

print(f"{station_name}: {station_schnitt(station_werte):.1f}")`, { aus: "Nord: 21.8" }),
    P("Bei einer Station geht das. Bei zwanzig wird es unhaltbar: Name und Werte gehoeren zusammen, liegen aber in getrennten Variablen, und die Funktion weiss nichts davon."),
    C(`class Messstation:
    def __init__(self, name):
        self.name = name
        self.werte = []

    def erfassen(self, wert):
        self.werte.append(wert)

    def schnitt(self):
        if not self.werte:
            return 0.0
        return sum(self.werte) / len(self.werte)


nord = Messstation("Nord")
nord.erfassen(21.4)
nord.erfassen(19.8)
nord.erfassen(24.1)

sued = Messstation("Sued")
sued.erfassen(28.0)

print(f"{nord.name}: {nord.schnitt():.1f} aus {len(nord.werte)} Werten")
print(f"{sued.name}: {sued.schnitt():.1f} aus {len(sued.werte)} Werten")`,
      { aus: "Nord: 21.8 aus 3 Werten\nSued: 28.0 aus 1 Werten" }),
    P("Jedes Objekt hat seine eigenen Daten. Die Methoden arbeiten immer auf dem Objekt, an dem sie aufgerufen werden. Daten und Verhalten sind an einem Ort."),

    H2("self und __init__"),
    P("`__init__` laeuft automatisch, wenn ein Objekt erzeugt wird. Es ist kein Konstruktor im engen Sinn, sondern richtet das bereits erzeugte Objekt ein."),
    C(`class Punkt:
    def __init__(self, x, y):
        print("  __init__ laeuft gerade")
        self.x = x
        self.y = y

    def abstand_zum_ursprung(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5


print("vor der Erzeugung")
p = Punkt(3, 4)
print("nach der Erzeugung")
print(p.x, p.y, p.abstand_zum_ursprung())`,
      { aus: "vor der Erzeugung\n  __init__ laeuft gerade\nnach der Erzeugung\n3 4 5.0" }),
    P("`self` ist das Objekt selbst. Python uebergibt es bei jedem Methodenaufruf automatisch als erstes Argument. `p.abstand_zum_ursprung()` ist in Wahrheit `Punkt.abstand_zum_ursprung(p)`."),
    C(`class Punkt:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def abstand_zum_ursprung(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5


p = Punkt(3, 4)

print(p.abstand_zum_ursprung())
print(Punkt.abstand_zum_ursprung(p))`, { aus: "5.0\n5.0" }),
    WARN("self nie vergessen",
      "Jede Methode braucht `self` als ersten Parameter, und jeder Zugriff auf ein Attribut innerhalb der Klasse braucht das Praefix `self.`. Ohne `self.` legst du eine lokale Variable an, die beim Verlassen der Methode verschwindet.",
    ),
    P("`self` ist uebrigens kein Schluesselwort, sondern nur eine sehr feste Gewohnheit. Technisch koenntest du den Parameter anders nennen. Tu es nicht."),

    H2("Klassenattribute"),
    P("Attribute, die direkt in der Klasse stehen, gehoeren allen Objekten gemeinsam."),
    C(`class Konto:
    zinssatz = 0.02        # geteilt von allen
    anzahl = 0

    def __init__(self, inhaber, stand=0):
        self.inhaber = inhaber   # eigen fuer jedes Objekt
        self.stand = stand
        Konto.anzahl += 1

    def zinsen(self):
        return self.stand * Konto.zinssatz


a = Konto("Ada", 1000)
b = Konto("Grace", 5000)

print(a.zinsen(), b.zinsen())
print("Konten insgesamt:", Konto.anzahl)

Konto.zinssatz = 0.03
print("nach der Aenderung:", a.zinsen(), b.zinsen())`,
      { aus: "20.0 100.0\nKonten insgesamt: 2\nnach der Aenderung: 30.0 150.0" }),
    TAB(["", "Klassenattribut", "Objektattribut"],
      ["Steht", "direkt in der Klasse", "in `__init__` mit `self.`"],
      ["Gehoert", "allen Objekten gemeinsam", "jedem Objekt einzeln"],
      ["Typisch fuer", "Konstanten, Zaehler, Vorgaben", "Zustand des einzelnen Objekts"],
    ),
    WARN("Keine veraenderlichen Klassenattribute",
      "`class A: liste = []` teilen sich alle Objekte dieselbe Liste. Das ist derselbe Fehler wie ein veraenderlicher Vorgabewert bei Parametern. Veraenderliche Attribute gehoeren in `__init__`.",
    ),

    H2("Sichtbarkeit"),
    P("Python kennt kein echtes Verstecken von Attributen. Stattdessen gibt es eine Vereinbarung: ein Unterstrich am Anfang heisst *bitte von aussen nicht anfassen*."),
    C(`class Temperaturmesser:
    def __init__(self):
        self._rohwert = 0        # intern
        self.__geheim = 42       # Namensverschleierung

    def setze(self, wert):
        if not -80 <= wert <= 80:
            raise ValueError(f"Unplausibel: {wert}")
        self._rohwert = wert

    def lies(self):
        return self._rohwert


m = Temperaturmesser()
m.setze(21.5)
print(m.lies())
print(m._rohwert)        # geht, gilt aber als unhoeflich
print(m._Temperaturmesser__geheim)
print(m.__geheim)`),
    P("Zwei Unterstriche loesen eine Namensumschreibung aus: `__geheim` wird intern zu `_Klassenname__geheim`. Das schuetzt vor versehentlichen Namenskollisionen in Unterklassen, nicht vor absichtlichem Zugriff."),

    H2("Eigenschaften"),
    P("Statt `setze` und `lies` schreibt man in Python meist eine Eigenschaft. Der Zugriff sieht dann aus wie ein normales Attribut, laeuft aber durch eine Funktion."),
    C(`class Kreis:
    def __init__(self, radius):
        self.radius = radius

    @property
    def flaeche(self):
        import math
        return math.pi * self.radius ** 2

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, wert):
        if wert <= 0:
            raise ValueError("Der Radius muss positiv sein")
        self._radius = wert


k = Kreis(2)
print(f"{k.flaeche:.2f}")

k.radius = 3
print(f"{k.flaeche:.2f}")

k.radius = -1`),
    MERKE("Der Python-Weg",
      "Fang mit einfachen Attributen an. Brauchst du spaeter eine Pruefung oder eine Berechnung, machst du eine Eigenschaft daraus. Der Zugriff von aussen bleibt dabei gleich, du musst also nichts umschreiben.",
    ),

    H2("Alles ist ein Objekt"),
    C(`class Leer:
    pass

x = Leer()
print(type(x))
print(isinstance(x, Leer))

print(type(42), type("a"), type([1]), type(print))
print(isinstance(42, int), isinstance(42, object))

x.spontan = "geht auch"
print(x.spontan)`,
      { aus: "<class '__main__.Leer'>\nTrue\n<class 'int'> <class 'str'> <class 'list'> <class 'builtin_function_or_method'>\nTrue True\ngeht auch" }),
    P("In Python ist wirklich alles ein Objekt: Zahlen, Funktionen, Klassen selbst. Und Attribute lassen sich jederzeit hinzufuegen. Das ist maechtig, aber nutze es sparsam, sonst weiss niemand mehr, welche Attribute ein Objekt hat."),
  ],
  quiz: [
    Q("Was ist `self` in einer Methode?",
      ["Ein Schluesselwort von Python", "Das Objekt, an dem die Methode aufgerufen wurde",
       "Die Klasse selbst", "Ein Platzhalter fuer den Rueckgabewert"], 1,
      "`self` ist das Objekt selbst und wird automatisch als erstes Argument uebergeben."),
    Q("Wann laeuft `__init__`?",
      ["Beim Definieren der Klasse", "Bei jedem Methodenaufruf",
       "Beim Erzeugen eines Objekts", "Beim Loeschen eines Objekts"], 2,
      "`__init__` richtet das frisch erzeugte Objekt ein."),
    Q("Was gibt dieser Code aus?",
      ["`[1]` und `[2]`", "`[1]` und `[1, 2]`", "Einen Fehler", "`[]` und `[]`"], 1,
      "Das Klassenattribut ist eine einzige Liste, die sich alle Objekte teilen. Veraenderliche Attribute gehoeren in `__init__`.",
      `class A:\n    werte = []\n\na, b = A(), A()\na.werte.append(1)\nb.werte.append(2)\nprint(a.werte, b.werte)`),
    Q("Was bedeutet ein einzelner Unterstrich am Anfang eines Attributnamens?",
      ["Python verhindert den Zugriff von aussen",
       "Es ist eine Vereinbarung: bitte nicht von aussen benutzen",
       "Das Attribut ist konstant",
       "Es wird automatisch geloescht"],
      1,
      "Python erzwingt nichts. Der Unterstrich ist ein Hinweis an andere Entwickler."),
    Q("Wofuer ist `@property` da?",
      ["Um ein Attribut schreibgeschuetzt zu machen",
       "Damit ein Methodenaufruf wie ein einfacher Attributzugriff aussieht",
       "Um Attribute zu zaehlen",
       "Um Klassenattribute anzulegen"],
      1,
      "Die Eigenschaft laesst den Zugriff wie ein Attribut aussehen, fuehrt aber Code aus. So kannst du spaeter Pruefungen ergaenzen, ohne den Aufruf zu aendern."),
    Q("Wie ruft Python `p.methode()` intern auf?",
      ["`methode(p)`", "`Klasse.methode(p)`", "`p.methode(self)`", "`methode()`"], 1,
      "Der Punktzugriff sucht die Methode in der Klasse und uebergibt das Objekt als erstes Argument."),
  ],
  aufgaben: [
    {
      id: "a24-1",
      titel: "Eine Klasse Rechteck",
      text: [P("Schreibe eine Klasse `Rechteck` mit:"),
             L("`__init__(self, breite, hoehe)`",
               "einer Methode `flaeche()`",
               "einer Methode `umfang()`",
               "einer Methode `ist_quadrat()`, die einen Wahrheitswert liefert")],
      start: `class Rechteck:
    pass

r = Rechteck(4, 6)
print(r.flaeche(), r.umfang(), r.ist_quadrat())

q = Rechteck(5, 5)
print(q.flaeche(), q.umfang(), q.ist_quadrat())`,
      tipps: ["Speichere beide Werte in `__init__` mit `self.breite = breite`.",
              "Der Umfang ist zweimal Breite plus zweimal Hoehe.",
              "`ist_quadrat` vergleicht einfach beide Seiten mit `==`."],
      loesung: `class Rechteck:
    """Ein achsenparalleles Rechteck."""

    def __init__(self, breite, hoehe):
        self.breite = breite
        self.hoehe = hoehe

    def flaeche(self):
        return self.breite * self.hoehe

    def umfang(self):
        return 2 * (self.breite + self.hoehe)

    def ist_quadrat(self):
        return self.breite == self.hoehe


r = Rechteck(4, 6)
print(r.flaeche(), r.umfang(), r.ist_quadrat())

q = Rechteck(5, 5)
print(q.flaeche(), q.umfang(), q.ist_quadrat())`,
      tests: [
        T("Die Flaeche stimmt", `assert Rechteck(4, 6).flaeche() == 24`),
        T("Der Umfang stimmt", `assert Rechteck(4, 6).umfang() == 20, f"Ergebnis: {Rechteck(4, 6).umfang()}"`),
        T("Ein Quadrat wird erkannt", `assert Rechteck(5, 5).ist_quadrat() is True`),
        T("Ein Rechteck ist kein Quadrat", `assert Rechteck(4, 6).ist_quadrat() is False`),
        T("Die Werte liegen als Attribute vor", `r = Rechteck(2, 3)\nassert r.breite == 2 and r.hoehe == 3, "Speichere die Werte als self.breite und self.hoehe"`),
        T("Objekte sind unabhaengig", `a, b = Rechteck(1, 1), Rechteck(9, 9)\nassert a.flaeche() == 1 and b.flaeche() == 81`),
      ],
    },
    {
      id: "a24-2",
      titel: "Konto mit Pruefung",
      text: [P("Schreibe eine Klasse `Konto`:"),
             L("`__init__(self, inhaber, stand=0)`",
               "`einzahlen(betrag)` erhoeht den Stand, lehnt aber Betraege ab, die nicht positiv sind, mit einem `ValueError`",
               "`abheben(betrag)` verringert den Stand, lehnt aber ab, wenn nicht genug Geld da ist",
               "`__str__(self)`, das `Ada: 100 Euro` liefert")],
      start: `class Konto:
    pass

k = Konto("Ada", 50)
k.einzahlen(100)
k.abheben(30)
print(k)

try:
    k.abheben(1000)
except ValueError as f:
    print("Abgelehnt:", f)`,
      tipps: ["Loese den Fehler mit `raise ValueError(\"...\")` aus, bevor du den Stand aenderst.",
              "`__str__` muss eine Zeichenkette **zurueckgeben**, nicht ausgeben.",
              "`return f\"{self.inhaber}: {self.stand} Euro\"`"],
      loesung: `class Konto:
    """Ein einfaches Konto mit Pruefung der Betraege."""

    def __init__(self, inhaber, stand=0):
        self.inhaber = inhaber
        self.stand = stand

    def einzahlen(self, betrag):
        if betrag <= 0:
            raise ValueError("Der Betrag muss positiv sein")
        self.stand += betrag

    def abheben(self, betrag):
        if betrag <= 0:
            raise ValueError("Der Betrag muss positiv sein")
        if betrag > self.stand:
            raise ValueError(f"Nur {self.stand} Euro verfuegbar")
        self.stand -= betrag

    def __str__(self):
        return f"{self.inhaber}: {self.stand} Euro"


k = Konto("Ada", 50)
k.einzahlen(100)
k.abheben(30)
print(k)

try:
    k.abheben(1000)
except ValueError as f:
    print("Abgelehnt:", f)`,
      tests: [
        T("Einzahlen erhoeht den Stand", `k = Konto("X", 0)\nk.einzahlen(50)\nassert k.stand == 50`),
        T("Abheben verringert den Stand", `k = Konto("X", 100)\nk.abheben(40)\nassert k.stand == 60`),
        T("Zu hohe Abhebungen werden abgelehnt", `k = Konto("X", 10)\ntry:\n    k.abheben(50)\n    assert False, "Es kam kein Fehler"\nexcept ValueError:\n    pass\nassert k.stand == 10, "Der Stand darf sich bei Ablehnung nicht aendern"`),
        T("Negative Einzahlungen werden abgelehnt", `k = Konto("X", 0)\ntry:\n    k.einzahlen(-5)\n    assert False, "Es kam kein Fehler"\nexcept ValueError:\n    pass`),
        T("Die Textform stimmt", `assert str(Konto("Ada", 100)) == "Ada: 100 Euro", f"Ergebnis: {str(Konto('Ada', 100))!r}"`),
        T("Der Vorgabestand ist null", `assert Konto("X").stand == 0`),
      ],
    },
  ],
});

M5.push({
  id: "l-vererbung",
  titel: "Vererbung und Polymorphie",
  dauer: 18,
  vorspann: "Vererbung laesst eine Klasse auf einer anderen aufbauen. Richtig eingesetzt spart sie viel Wiederholung. Falsch eingesetzt baut sie Abhaengigkeiten, die spaeter niemand mehr aufloest.",
  ziele: [
    "Klassen von anderen ableiten",
    "Methoden ueberschreiben und mit super erweitern",
    "Polymorphie verstehen und nutzen",
    "Erkennen, wann Komposition besser ist",
  ],
  inhalt: [
    H2("Ableiten"),
    C(`class Tier:
    def __init__(self, name):
        self.name = name

    def laut(self):
        return "..."

    def vorstellen(self):
        return f"{self.name} macht {self.laut()}"


class Hund(Tier):
    def laut(self):
        return "Wau"


class Katze(Tier):
    def laut(self):
        return "Miau"


for tier in [Tier("Wesen"), Hund("Rex"), Katze("Minka")]:
    print(tier.vorstellen())`,
      { aus: "Wesen macht ...\nRex macht Wau\nMinka macht Miau" }),
    P("Die Unterklassen erben `__init__` und `vorstellen`, ersetzen aber `laut`. Beachte: `vorstellen` steht nur einmal in der Basisklasse und ruft trotzdem die jeweils passende Fassung von `laut` auf. Das ist **Polymorphie**."),

    H2("super"),
    P("Willst du eine geerbte Methode nicht ersetzen, sondern erweitern, rufst du die Fassung der Basisklasse mit `super()` auf."),
    C(`class Fahrzeug:
    def __init__(self, marke, raeder):
        self.marke = marke
        self.raeder = raeder

    def beschreibung(self):
        return f"{self.marke} mit {self.raeder} Raedern"


class Elektroauto(Fahrzeug):
    def __init__(self, marke, reichweite):
        super().__init__(marke, raeder=4)
        self.reichweite = reichweite

    def beschreibung(self):
        return super().beschreibung() + f", {self.reichweite} km Reichweite"


e = Elektroauto("Marke X", 480)
print(e.beschreibung())
print(e.raeder)`,
      { aus: "Marke X mit 4 Raedern, 480 km Reichweite\n4" }),
    WARN("super nicht vergessen",
      "Ueberschreibst du `__init__` ohne `super().__init__(...)` aufzurufen, laeuft die Einrichtung der Basisklasse nicht. Die dort gesetzten Attribute fehlen dann, und du bekommst spaeter einen `AttributeError`.",
    ),

    H2("Polymorphie in der Praxis"),
    P("Der eigentliche Gewinn: Code, der mit der Basisklasse arbeitet, funktioniert automatisch mit jeder Unterklasse."),
    C(`class Form:
    def flaeche(self):
        raise NotImplementedError("Unterklassen muessen das umsetzen")

    def bericht(self):
        return f"{type(self).__name__}: {self.flaeche():.2f}"


class Rechteck(Form):
    def __init__(self, b, h):
        self.b, self.h = b, h

    def flaeche(self):
        return self.b * self.h


class Kreis(Form):
    def __init__(self, r):
        self.r = r

    def flaeche(self):
        import math
        return math.pi * self.r ** 2


formen = [Rechteck(3, 4), Kreis(2), Rechteck(5, 5)]

for f in formen:
    print(f.bericht())

print(f"Gesamt: {sum(f.flaeche() for f in formen):.2f}")`,
      { aus: "Rechteck: 12.00\nKreis: 12.57\nRechteck: 25.00\nGesamt: 49.57" }),
    P("Die Summenzeile weiss nichts von Rechtecken oder Kreisen. Kommt morgen ein Dreieck dazu, funktioniert sie unveraendert weiter. `NotImplementedError` in der Basisklasse macht deutlich, dass jede Unterklasse diese Methode liefern muss."),

    H2("isinstance und die Typhierarchie"),
    C(`class A: pass
class B(A): pass

b = B()
print(isinstance(b, B), isinstance(b, A))
print(issubclass(B, A), issubclass(A, B))
print(type(b) is B, type(b) is A)
print(B.__mro__)`,
      { aus: "True True\nTrue False\nTrue False\n(<class '__main__.B'>, <class '__main__.A'>, <class 'object'>)" }),
    P("`__mro__` zeigt die Suchreihenfolge fuer Methoden. Python geht sie von links nach rechts durch und nimmt die erste passende Fassung."),

    H2("Enten zaehlen nicht die Federn"),
    P("Python verlangt keine gemeinsame Basisklasse. Es genuegt, dass ein Objekt die passenden Methoden hat. Das nennt man *duck typing*."),
    C(`class Hund:
    def laut(self):
        return "Wau"

class Roboter:
    def laut(self):
        return "Piep"

class Auto:
    def hupen(self):
        return "Tuut"


def laut_geben(dinge):
    for d in dinge:
        if hasattr(d, "laut"):
            print(d.laut())
        else:
            print(f"{type(d).__name__} kann nicht sprechen")


laut_geben([Hund(), Roboter(), Auto()])`,
      { aus: "Wau\nPiep\nAuto kann nicht sprechen" }),
    P("Hund und Roboter haben keine gemeinsame Basisklasse und funktionieren trotzdem in derselben Funktion. In Java oder C-Sharp braeuchtest du dafuer eine Schnittstelle."),

    H2("Wann keine Vererbung"),
    P("Vererbung heisst *ist ein*. Ein Hund **ist ein** Tier. Ein Elektroauto **ist ein** Fahrzeug. Alles andere gehoert nicht in eine Vererbungsbeziehung."),
    C(`# Falsch: ein Motor ist kein Auto
class Motor:
    def starten(self):
        return "brumm"

class AutoFalsch(Motor):
    pass

# Richtig: ein Auto hat einen Motor
class AutoRichtig:
    def __init__(self):
        self.motor = Motor()

    def starten(self):
        return self.motor.starten()


print(AutoRichtig().starten())`, { aus: "brumm" }),
    MERKE("Die Faustregel",
      "Frage dich: *ist ein* oder *hat ein*? Bei *ist ein* passt Vererbung. Bei *hat ein* nimmst du Komposition, also ein Objekt als Attribut. Komposition ist in Zweifelsfaellen fast immer die bessere Wahl, weil sie sich leichter aendern laesst.",
    ),
    P("Mehrfachvererbung, also das Ableiten von mehreren Klassen gleichzeitig, ist in Python moeglich. Sie fuehrt aber schnell zu schwer nachvollziehbaren Suchreihenfolgen. Nutze sie hoechstens fuer schmale Zusatzklassen, die nur eine Faehigkeit beisteuern."),
  ],
  quiz: [
    Q("Wofuer ist `super()` da?",
      ["Um eine Klasse zu kopieren",
       "Um die Fassung der Basisklasse aufzurufen",
       "Um eine Methode zu ueberspringen",
       "Um eine Klasse als abstrakt zu markieren"],
      1,
      "`super()` greift auf die naechste Klasse in der Suchreihenfolge zu, meist die Basisklasse."),
    Q("Was passiert, wenn du `__init__` ueberschreibst und `super().__init__()` weglaesst?",
      ["Python ruft es automatisch auf",
       "Die Einrichtung der Basisklasse laeuft nicht und ihre Attribute fehlen",
       "Es gibt einen SyntaxError",
       "Das Objekt wird nicht erzeugt"],
      1,
      "Python ruft nichts automatisch nach. Die in der Basisklasse gesetzten Attribute existieren dann nicht."),
    Q("Was gibt dieser Code aus?",
      ["`...`", "`Wau`", "`Rex`", "Einen Fehler"], 1,
      "`vorstellen` steht in der Basisklasse, ruft aber `self.laut()` auf. Python nimmt die Fassung der tatsaechlichen Klasse.",
      `class Tier:\n    def laut(self): return "..."\n    def sprich(self): return self.laut()\n\nclass Hund(Tier):\n    def laut(self): return "Wau"\n\nprint(Hund().sprich())`),
    Q("Wann passt Vererbung, wann Komposition?",
      ["Vererbung bei *hat ein*, Komposition bei *ist ein*",
       "Vererbung bei *ist ein*, Komposition bei *hat ein*",
       "Beides ist gleichwertig",
       "Vererbung ist immer besser"],
      1,
      "Ein Hund *ist ein* Tier, also Vererbung. Ein Auto *hat einen* Motor, also Komposition."),
    Q("Was bedeutet duck typing?",
      ["Objekte muessen von derselben Klasse erben",
       "Entscheidend ist, welche Methoden ein Objekt hat, nicht von welcher Klasse es stammt",
       "Typen werden zur Laufzeit geprueft und erzwungen",
       "Eine Sonderform der Mehrfachvererbung"],
      1,
      "Wenn ein Objekt die gebrauchten Methoden anbietet, funktioniert es, unabhaengig von seiner Herkunft."),
  ],
  aufgaben: [
    {
      id: "a25-1",
      titel: "Mitarbeitende mit Zulage",
      text: [P("Schreibe eine Basisklasse `Mitarbeit` mit `__init__(self, name, grundgehalt)` und einer Methode `gehalt()`, die das Grundgehalt zurueckgibt."),
             P("Leite davon `Fuehrungskraft` ab, die zusaetzlich `zulage` bekommt. Ihr `gehalt()` soll Grundgehalt plus Zulage liefern und dabei `super()` nutzen."),
             P("Beide Klassen brauchen `__str__`, das `Ada: 5000 Euro` liefert.")],
      start: `class Mitarbeit:
    pass

class Fuehrungskraft(Mitarbeit):
    pass

a = Mitarbeit("Ada", 4000)
b = Fuehrungskraft("Grace", 4000, 1500)

print(a)
print(b)`,
      tipps: ["In `Fuehrungskraft.__init__` rufst du zuerst `super().__init__(name, grundgehalt)` auf.",
              "`gehalt` der Unterklasse gibt `super().gehalt() + self.zulage` zurueck.",
              "`__str__` kann in der Basisklasse stehen und `self.gehalt()` nutzen, dann erbt es die Unterklasse."],
      loesung: `class Mitarbeit:
    """Eine Person mit Grundgehalt."""

    def __init__(self, name, grundgehalt):
        self.name = name
        self.grundgehalt = grundgehalt

    def gehalt(self):
        return self.grundgehalt

    def __str__(self):
        return f"{self.name}: {self.gehalt()} Euro"


class Fuehrungskraft(Mitarbeit):
    """Eine Person mit zusaetzlicher Zulage."""

    def __init__(self, name, grundgehalt, zulage):
        super().__init__(name, grundgehalt)
        self.zulage = zulage

    def gehalt(self):
        return super().gehalt() + self.zulage


a = Mitarbeit("Ada", 4000)
b = Fuehrungskraft("Grace", 4000, 1500)

print(a)
print(b)`,
      tests: [
        T("Das Grundgehalt stimmt", `assert Mitarbeit("X", 3000).gehalt() == 3000`),
        T("Die Zulage wird addiert", `assert Fuehrungskraft("Y", 3000, 500).gehalt() == 3500`),
        T("Die Textform stimmt", `assert str(Mitarbeit("Ada", 4000)) == "Ada: 4000 Euro", f"Ergebnis: {str(Mitarbeit('Ada', 4000))!r}"`),
        T("Auch die Unterklasse hat eine Textform", `assert str(Fuehrungskraft("Grace", 4000, 1500)) == "Grace: 5500 Euro", f"Ergebnis: {str(Fuehrungskraft('Grace', 4000, 1500))!r}"`),
        T("Die Vererbung ist eingerichtet", `assert issubclass(Fuehrungskraft, Mitarbeit)`),
        T("super wurde benutzt", `assert "super()" in QUELLE, "Nutze super() statt die Werte erneut zu setzen"`),
      ],
    },
    {
      id: "a25-2",
      titel: "Formen mit gemeinsamer Schnittstelle",
      text: [P("Schreibe eine Basisklasse `Form` mit einer Methode `flaeche()`, die `NotImplementedError` auslost."),
             P("Leite `Quadrat` und `Dreieck` ab. Das Dreieck bekommt Grundseite und Hoehe, seine Flaeche ist die Haelfte des Produkts."),
             P("Die Funktion `gesamtflaeche(formen)` soll die Summe aller Flaechen zurueckgeben, ohne die einzelnen Typen zu kennen.")],
      start: `class Form:
    pass

class Quadrat(Form):
    pass

class Dreieck(Form):
    pass

def gesamtflaeche(formen):
    pass

print(gesamtflaeche([Quadrat(3), Dreieck(4, 5)]))`,
      tipps: ["Die Basisklasse braucht nur `def flaeche(self): raise NotImplementedError`.",
              "Beim Dreieck ist die Flaeche `self.grundseite * self.hoehe / 2`.",
              "`gesamtflaeche` braucht nur `sum(f.flaeche() for f in formen)`."],
      loesung: `class Form:
    """Gemeinsame Grundlage aller Formen."""

    def flaeche(self):
        raise NotImplementedError("Unterklassen muessen flaeche umsetzen")


class Quadrat(Form):
    def __init__(self, seite):
        self.seite = seite

    def flaeche(self):
        return self.seite ** 2


class Dreieck(Form):
    def __init__(self, grundseite, hoehe):
        self.grundseite = grundseite
        self.hoehe = hoehe

    def flaeche(self):
        return self.grundseite * self.hoehe / 2


def gesamtflaeche(formen):
    return sum(f.flaeche() for f in formen)


print(gesamtflaeche([Quadrat(3), Dreieck(4, 5)]))`,
      tests: [
        T("Die Quadratflaeche stimmt", `assert Quadrat(3).flaeche() == 9`),
        T("Die Dreiecksflaeche stimmt", `assert Dreieck(4, 5).flaeche() == 10, f"Ergebnis: {Dreieck(4, 5).flaeche()}"`),
        T("Die Summe stimmt", `assert gesamtflaeche([Quadrat(3), Dreieck(4, 5)]) == 19`),
        T("Die Basisklasse verweigert den Aufruf", `try:\n    Form().flaeche()\n    assert False, "Es kam kein Fehler"\nexcept NotImplementedError:\n    pass`),
        T("Beide erben von Form", `assert issubclass(Quadrat, Form) and issubclass(Dreieck, Form)`),
        T("Die Summenfunktion kennt keine Typen", `assert "Quadrat" not in QUELLE.split("def gesamtflaeche")[1].split("print")[0], "Die Funktion darf die einzelnen Klassen nicht kennen"`),
      ],
    },
  ],
});

M5.push({
  id: "l-dunder",
  titel: "Sondermethoden",
  dauer: 17,
  vorspann: "Methoden mit zwei Unterstrichen an beiden Seiten sind die Schnittstelle zu Python selbst. Ueber sie entscheidest du, wie sich deine Objekte bei print, bei plus und in Schleifen verhalten.",
  ziele: [
    "__str__ und __repr__ unterscheiden",
    "Rechenoperatoren fuer eigene Klassen umsetzen",
    "Objekte vergleichbar und sortierbar machen",
    "Eigene Klassen durchlaufbar machen",
  ],
  inhalt: [
    H2("Textdarstellung"),
    C(`class Punkt:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):
        return f"Punkt({self.x}, {self.y})"

    def __str__(self):
        return f"({self.x} | {self.y})"


p = Punkt(3, 4)

print(p)
print(str(p))
print(repr(p))
print([p, p])`,
      { aus: "(3 | 4)\n(3 | 4)\nPunkt(3, 4)\n[Punkt(3, 4), Punkt(3, 4)]" }),
    TAB(["Methode", "Zielgruppe", "Aufgerufen von"],
      ["`__str__`", "Menschen", "`print()`, `str()`, f-Strings"],
      ["`__repr__`", "Entwickler", "`repr()`, die Konsole, Listen"],
    ),
    TIPP("Wenn du nur eine schreibst, schreib __repr__",
      "Fehlt `__str__`, greift Python auf `__repr__` zurueck. Umgekehrt nicht. Und `__repr__` sollte im Idealfall so aussehen, dass sich das Objekt damit wiederherstellen liesse.",
    ),
    C(`class Ohne:
    pass

class NurRepr:
    def __repr__(self):
        return "NurRepr()"

print(NurRepr())
o = Ohne()
print(str(o)[:20])`, { aus: "NurRepr()\n<__main__.Ohne objec" }),

    H2("Rechnen mit eigenen Objekten"),
    C(`class Vektor:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):
        return f"Vektor({self.x}, {self.y})"

    def __add__(self, andere):
        return Vektor(self.x + andere.x, self.y + andere.y)

    def __sub__(self, andere):
        return Vektor(self.x - andere.x, self.y - andere.y)

    def __mul__(self, faktor):
        return Vektor(self.x * faktor, self.y * faktor)

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5


a = Vektor(1, 2)
b = Vektor(3, 4)

print(a + b)
print(b - a)
print(a * 3)
print(abs(b))`,
      { aus: "Vektor(4, 6)\nVektor(2, 2)\nVektor(3, 6)\n5.0" }),
    TAB(["Methode", "Wird ausgeloest von"],
      ["`__add__`", "`a + b`"],
      ["`__sub__`", "`a - b`"],
      ["`__mul__`", "`a * b`"],
      ["`__truediv__`", "`a / b`"],
      ["`__neg__`", "`-a`"],
      ["`__abs__`", "`abs(a)`"],
      ["`__pow__`", "`a ** b`"],
    ),
    P("Genau so funktionieren NumPy-Arrays und PyTorch-Tensoren. Wenn du dort `a + b` schreibst, laeuft eine dieser Methoden."),

    H2("Vergleichen und sortieren"),
    C(`from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, haupt, neben):
        self.haupt, self.neben = haupt, neben

    def __repr__(self):
        return f"{self.haupt}.{self.neben}"

    def __eq__(self, andere):
        return (self.haupt, self.neben) == (andere.haupt, andere.neben)

    def __lt__(self, andere):
        return (self.haupt, self.neben) < (andere.haupt, andere.neben)


versionen = [Version(1, 10), Version(1, 2), Version(2, 0)]

print(sorted(versionen))
print(Version(1, 2) == Version(1, 2))
print(Version(2, 0) > Version(1, 9))
print(max(versionen))`,
      { aus: "[1.2, 1.10, 2.0]\nTrue\nTrue\n2.0" }),
    P("`@total_ordering` ergaenzt aus `__eq__` und `__lt__` automatisch die uebrigen vier Vergleiche. Ohne den Dekorator muesstest du alle sechs selbst schreiben."),
    WARN("__eq__ schaltet __hash__ ab",
      "Definierst du `__eq__`, wird dein Objekt unhashbar und passt nicht mehr in eine Menge oder als Dictionary-Schluessel. Brauchst du das, ergaenze `__hash__`, etwa mit `return hash((self.haupt, self.neben))`.",
    ),

    H2("Laenge, Enthaltensein, Zugriff"),
    C(`class Regal:
    def __init__(self, buecher=None):
        self.buecher = list(buecher or [])

    def __len__(self):
        return len(self.buecher)

    def __contains__(self, titel):
        return titel in self.buecher

    def __getitem__(self, i):
        return self.buecher[i]

    def __iter__(self):
        return iter(self.buecher)


r = Regal(["Faust", "Werther", "Ulysses"])

print(len(r))
print("Faust" in r)
print(r[0], r[-1])
print(r[:2])

for buch in r:
    print(" -", buch)

if r:
    print("Das Regal ist nicht leer")`,
      { aus: "3\nTrue\nFaust Ulysses\n['Faust', 'Werther']\n - Faust\n - Werther\n - Ulysses\nDas Regal ist nicht leer" }),
    P("Mit diesen vier Methoden verhaelt sich deine Klasse wie eine eingebaute Sammlung. Das ist der Sinn der Sondermethoden: du gibst deinem Objekt die Sprache, die Python ohnehin schon spricht."),
    HINWEIS("Wahrheitswert",
      "`if r:` nutzt `__bool__`, falls vorhanden, sonst `__len__`. Da hier `__len__` definiert ist, gilt ein leeres Regal als falsch. Das entspricht genau dem Verhalten von Listen.",
    ),

    H2("Ein vollstaendiges Beispiel"),
    C(`class Geldbetrag:
    def __init__(self, euro, cent=0):
        self.gesamt_cent = round(euro * 100 + cent)

    @property
    def euro(self):
        return self.gesamt_cent / 100

    def __repr__(self):
        return f"Geldbetrag({self.euro:.2f})"

    def __str__(self):
        return f"{self.euro:.2f} Euro"

    def __add__(self, andere):
        return Geldbetrag(0, self.gesamt_cent + andere.gesamt_cent)

    def __mul__(self, faktor):
        return Geldbetrag(0, self.gesamt_cent * faktor)

    def __eq__(self, andere):
        return self.gesamt_cent == andere.gesamt_cent

    def __lt__(self, andere):
        return self.gesamt_cent < andere.gesamt_cent

    def __hash__(self):
        return hash(self.gesamt_cent)


a = Geldbetrag(19, 99)
b = Geldbetrag(5, 1)

print(a)
print(a + b)
print(a * 3)
print(a > b)
print(sorted([a, b, Geldbetrag(0, 50)]))`,
      { aus: "19.99 Euro\n25.00 Euro\n59.97 Euro\nTrue\n[Geldbetrag(0.50), Geldbetrag(5.01), Geldbetrag(19.99)]" }),
    P("Beachte, dass intern in Cent gerechnet wird. Genau so vermeidet man die Ungenauigkeit von Kommazahlen bei Geldbetraegen."),
    MERKE("Nicht uebertreiben",
      "Setze nur die Sondermethoden um, die fuer dein Objekt wirklich Sinn ergeben. Eine Klasse `Kunde` braucht kein `__add__`. Die Frage ist immer: wuerde ein Leser dieses Verhalten erwarten?",
    ),
  ],
  quiz: [
    Q("Welche Methode ruft `print(objekt)` auf?",
      ["`__repr__`", "`__str__`, sonst ersatzweise `__repr__`", "`__print__`", "`__format__`"], 1,
      "`print` nutzt `__str__`. Fehlt diese, greift Python auf `__repr__` zurueck."),
    Q("Welche Methode wird bei `a + b` aufgerufen?",
      ["`__plus__`", "`__add__`", "`__sum__`", "`__concat__`"], 1,
      "Der Plus-Operator loest `__add__` auf dem linken Objekt aus."),
    Q("Was bewirkt `@total_ordering`?",
      ["Es sortiert die Klasse automatisch",
       "Es ergaenzt aus `__eq__` und `__lt__` die uebrigen Vergleichsmethoden",
       "Es macht die Klasse unveraenderlich",
       "Es erzwingt eine feste Reihenfolge der Attribute"],
      1,
      "Der Dekorator leitet die restlichen Vergleiche ab. Das spart vier Methoden."),
    Q("Was passiert, wenn du `__eq__` definierst, aber kein `__hash__`?",
      ["Nichts Besonderes", "Das Objekt laesst sich nicht mehr in einer Menge verwenden",
       "Die Klasse laesst sich nicht mehr erzeugen", "Vergleiche schlagen fehl"], 1,
      "Python setzt `__hash__` auf None. Das Objekt ist dann unhashbar und passt weder in eine Menge noch als Dictionary-Schluessel."),
    Q("Welche Methode macht ein Objekt in einer for-Schleife nutzbar?",
      ["`__loop__`", "`__iter__`", "`__next__` allein", "`__len__`"], 1,
      "`__iter__` liefert einen Iterator. Damit funktioniert das Objekt in jeder Schleife."),
    Q("Warum rechnet die Geldklasse intern in Cent?",
      ["Weil Cent kleiner sind",
       "Weil Kommazahlen ungenau sind und ganze Zahlen exakt",
       "Weil Python keine Kommazahlen addieren kann",
       "Aus historischen Gruenden"],
      1,
      "Ganze Zahlen sind exakt. Bei Geldbetraegen fuehren Kommazahlen sonst zu Rundungsfehlern."),
  ],
  aufgaben: [
    {
      id: "a26-1",
      titel: "Bruchklasse",
      text: [P("Schreibe eine Klasse `Bruch` mit Zaehler und Nenner:"),
             L("`__init__(self, zaehler, nenner)`, die mit `math.gcd` kuerzt",
               "`__repr__`, das `3/4` liefert",
               "`__add__`, das zwei Brueche addiert",
               "`__eq__`, das gekuerzte Brueche vergleicht")],
      start: `import math

class Bruch:
    pass

a = Bruch(1, 2)
b = Bruch(1, 3)

print(a + b)
print(Bruch(2, 4) == Bruch(1, 2))`,
      tipps: ["`math.gcd(z, n)` liefert den groessten gemeinsamen Teiler. Teile beide Werte dadurch.",
              "Die Summe zweier Brueche: Zaehler mal fremder Nenner, addiert, ueber dem Produkt der Nenner.",
              "Da du im `__init__` kuerzt, genuegt fuer `__eq__` der Vergleich der gekuerzten Werte."],
      loesung: `import math

class Bruch:
    """Ein gekuerzter Bruch."""

    def __init__(self, zaehler, nenner):
        if nenner == 0:
            raise ValueError("Der Nenner darf nicht null sein")
        teiler = math.gcd(zaehler, nenner)
        self.zaehler = zaehler // teiler
        self.nenner = nenner // teiler

    def __repr__(self):
        return f"{self.zaehler}/{self.nenner}"

    def __add__(self, andere):
        return Bruch(
            self.zaehler * andere.nenner + andere.zaehler * self.nenner,
            self.nenner * andere.nenner,
        )

    def __eq__(self, andere):
        return (self.zaehler, self.nenner) == (andere.zaehler, andere.nenner)


a = Bruch(1, 2)
b = Bruch(1, 3)

print(a + b)
print(Bruch(2, 4) == Bruch(1, 2))`,
      tests: [
        T("Der Bruch wird gekuerzt", `assert repr(Bruch(4, 8)) == "1/2", f"Ergebnis: {repr(Bruch(4, 8))}"`),
        T("Die Addition stimmt", `assert repr(Bruch(1, 2) + Bruch(1, 3)) == "5/6", f"Ergebnis: {repr(Bruch(1, 2) + Bruch(1, 3))}"`),
        T("Das Ergebnis der Addition ist gekuerzt", `assert repr(Bruch(1, 4) + Bruch(1, 4)) == "1/2", f"Ergebnis: {repr(Bruch(1, 4) + Bruch(1, 4))}"`),
        T("Gleiche Brueche sind gleich", `assert Bruch(2, 4) == Bruch(1, 2) and Bruch(1, 3) != Bruch(1, 2)`),
        T("Die Textform stimmt", `assert repr(Bruch(3, 4)) == "3/4"`),
      ],
    },
    {
      id: "a26-2",
      titel: "Eine eigene Sammlung",
      text: [P("Schreibe `Stapel`, der sich wie eine Sammlung verhaelt:"),
             L("`ablegen(wert)` legt oben auf, `nehmen()` nimmt oben weg und gibt den Wert zurueck",
               "`__len__` liefert die Anzahl",
               "`__contains__` ermoeglicht `wert in stapel`",
               "`__iter__` laeuft von oben nach unten, also in umgekehrter Ablagereihenfolge")],
      start: `class Stapel:
    pass

s = Stapel()
s.ablegen("A")
s.ablegen("B")
s.ablegen("C")

print(len(s), "B" in s)
print(list(s))
print(s.nehmen(), len(s))`,
      tipps: ["Nutze intern eine Liste und `append` beziehungsweise `pop`.",
              "`__iter__` kann `return iter(reversed(self._werte))` zurueckgeben.",
              "`__contains__` gibt `wert in self._werte` zurueck."],
      loesung: `class Stapel:
    """Ein Stapel: was zuletzt abgelegt wurde, kommt zuerst wieder heraus."""

    def __init__(self):
        self._werte = []

    def ablegen(self, wert):
        self._werte.append(wert)

    def nehmen(self):
        if not self._werte:
            raise IndexError("Der Stapel ist leer")
        return self._werte.pop()

    def __len__(self):
        return len(self._werte)

    def __contains__(self, wert):
        return wert in self._werte

    def __iter__(self):
        return iter(reversed(self._werte))


s = Stapel()
s.ablegen("A")
s.ablegen("B")
s.ablegen("C")

print(len(s), "B" in s)
print(list(s))
print(s.nehmen(), len(s))`,
      tests: [
        T("Die Laenge stimmt", `s = Stapel()\ns.ablegen(1)\ns.ablegen(2)\nassert len(s) == 2`),
        T("Zuletzt abgelegt kommt zuerst heraus", `s = Stapel()\ns.ablegen("A")\ns.ablegen("B")\nassert s.nehmen() == "B"`),
        T("Enthaltensein funktioniert", `s = Stapel()\ns.ablegen("X")\nassert "X" in s and "Y" not in s`),
        T("Das Durchlaufen geht von oben nach unten", `s = Stapel()\nfor w in "ABC":\n    s.ablegen(w)\nassert list(s) == ["C", "B", "A"], f"Ergebnis: {list(s)}"`),
        T("Ein leerer Stapel gilt als falsch", `s = Stapel()\nassert not s, "Ein leerer Stapel soll als falsch gelten"`),
        T("Der leere Stapel meldet einen Fehler", `s = Stapel()\ntry:\n    s.nehmen()\n    assert False, "Es kam kein Fehler"\nexcept IndexError:\n    pass`),
      ],
    },
  ],
});

M5.push({
  id: "l-dataclasses",
  titel: "Dataclasses und Enums",
  dauer: 15,
  vorspann: "Fuer Klassen, die vor allem Daten halten, gibt es eine Abkuerzung, die dir zwanzig Zeilen Standardcode erspart. Und fuer feste Auswahlmengen gibt es eine eigene Struktur.",
  ziele: [
    "Dataclasses anlegen und einsetzen",
    "Unveraenderliche Datenobjekte bauen",
    "Enums fuer feste Auswahlmengen nutzen",
    "Erkennen, wann welche Form passt",
  ],
  inhalt: [
    H2("Das Problem"),
    P("Eine reine Datenklasse von Hand sieht so aus:"),
    C(`class MessungAlt:
    def __init__(self, station, wert, einheit="C"):
        self.station = station
        self.wert = wert
        self.einheit = einheit

    def __repr__(self):
        return f"MessungAlt(station={self.station!r}, wert={self.wert!r}, einheit={self.einheit!r})"

    def __eq__(self, andere):
        if not isinstance(andere, MessungAlt):
            return NotImplemented
        return (self.station, self.wert, self.einheit) == (andere.station, andere.wert, andere.einheit)


m = MessungAlt("Nord", 21.4)
print(m)
print(m == MessungAlt("Nord", 21.4))`,
      { aus: "MessungAlt(station='Nord', wert=21.4, einheit='C')\nTrue" }),
    P("Viel Text fuer wenig Inhalt. Genau dafuer gibt es `dataclass`:"),
    C(`from dataclasses import dataclass

@dataclass
class Messung:
    station: str
    wert: float
    einheit: str = "C"


m = Messung("Nord", 21.4)
print(m)
print(m == Messung("Nord", 21.4))
print(m.station, m.wert)

m.wert = 22.0
print(m)`,
      { aus: "Messung(station='Nord', wert=21.4, einheit='C')\nTrue\nNord 21.4\nMessung(station='Nord', wert=22.0, einheit='C')" }),
    P("Der Dekorator erzeugt `__init__`, `__repr__` und `__eq__` automatisch aus den Feldern. Die Angaben hinter dem Doppelpunkt sind Typhinweise, die Python nicht erzwingt, aber Werkzeuge und Leser sehr wohl nutzen."),

    H2("Nuetzliche Einstellungen"),
    C(`from dataclasses import dataclass, field

@dataclass(frozen=True, order=True)
class Punkt:
    x: float
    y: float


@dataclass
class Kurs:
    titel: str
    teilnehmende: list = field(default_factory=list)


p = Punkt(1, 2)
print(p, sorted([Punkt(3, 1), Punkt(1, 5)]))

k = Kurs("Python")
k.teilnehmende.append("Ada")
print(k)
print(Kurs("Leer"))

p.x = 99`),
    TAB(["Einstellung", "Wirkung"],
      ["`frozen=True`", "Objekt ist unveraenderlich und hashbar"],
      ["`order=True`", "Vergleichsmethoden werden ergaenzt"],
      ["`slots=True`", "spart Speicher, verbietet neue Attribute"],
      ["`field(default_factory=list)`", "fuer veraenderliche Vorgaben"],
    ),
    WARN("Veraenderliche Vorgaben brauchen field",
      "`teilnehmende: list = []` gibt sofort einen Fehler. Das ist die gleiche Falle wie bei Funktionsparametern, und `dataclass` verbietet sie ausdruecklich. Nutze `field(default_factory=list)`.",
    ),

    H2("Nachtraegliche Pruefung"),
    C(`from dataclasses import dataclass

@dataclass
class Einstellungen:
    lernrate: float
    epochen: int

    def __post_init__(self):
        if not 0 < self.lernrate < 1:
            raise ValueError(f"Lernrate ausserhalb des Bereichs: {self.lernrate}")
        if self.epochen < 1:
            raise ValueError("Mindestens eine Epoche noetig")

    @property
    def schrittweite(self):
        return self.lernrate / self.epochen


e = Einstellungen(0.01, 50)
print(e)
print(f"{e.schrittweite:.6f}")

Einstellungen(5.0, 10)`),
    P("`__post_init__` laeuft direkt nach dem erzeugten `__init__`. Dort gehoert jede Pruefung hin. Eigenschaften und normale Methoden funktionieren wie in jeder anderen Klasse."),

    H2("Enums"),
    P("Wenn ein Wert nur aus einer festen Menge kommen darf, sind Zeichenketten eine schlechte Wahl: Tippfehler fallen erst zur Laufzeit auf."),
    C(`from enum import Enum, auto

class Zustand(Enum):
    WARTET = auto()
    LAEUFT = auto()
    FERTIG = auto()
    FEHLER = auto()


z = Zustand.LAEUFT

print(z)
print(z.name, z.value)
print(z is Zustand.LAEUFT)
print(list(Zustand))

for zustand in Zustand:
    print(f"  {zustand.name:<8} {zustand.value}")`,
      { aus: "Zustand.LAEUFT\nLAEUFT 2\nTrue\n[<Zustand.WARTET: 1>, <Zustand.LAEUFT: 2>, <Zustand.FERTIG: 3>, <Zustand.FEHLER: 4>]\n  WARTET   1\n  LAEUFT   2\n  FERTIG   3\n  FEHLER   4" }),
    P("Ein Tippfehler wie `Zustand.LAUEFT` gibt sofort einen `AttributeError`, waehrend `\"laueft\"` still durchginge. Enums sind ausserdem durchlaufbar und vergleichbar."),
    C(`from enum import Enum

class Farbe(str, Enum):
    ROT = "rot"
    GRUEN = "gruen"

print(Farbe.ROT.value)
print(Farbe.ROT == "rot")
print(Farbe("rot"))`, { aus: "rot\nTrue\nFarbe.ROT" }),
    P("Erbt ein Enum zusaetzlich von `str`, laesst es sich wie eine Zeichenkette verwenden und trotzdem sicher vergleichen. Das ist praktisch beim Einlesen aus Dateien."),

    H2("Beides zusammen"),
    C(`from dataclasses import dataclass, field
from enum import Enum, auto

class Aufgabenart(Enum):
    KLASSIFIKATION = auto()
    REGRESSION = auto()


@dataclass
class Experiment:
    name: str
    art: Aufgabenart
    lernrate: float = 0.01
    ergebnisse: list = field(default_factory=list)

    def erfassen(self, guete):
        self.ergebnisse.append(guete)

    @property
    def beste(self):
        return max(self.ergebnisse) if self.ergebnisse else None


e = Experiment("Versuch 1", Aufgabenart.KLASSIFIKATION)
e.erfassen(0.81)
e.erfassen(0.94)

print(e.name, e.art.name)
print(f"Bestes Ergebnis: {e.beste:.2f}")
print(e)`,
      { aus: "Versuch 1 KLASSIFIKATION\nBestes Ergebnis: 0.94\nExperiment(name='Versuch 1', art=<Aufgabenart.KLASSIFIKATION: 1>, lernrate=0.01, ergebnisse=[0.81, 0.94])" }),
    MERKE("Wann was",
      "Haelt die Klasse vor allem Daten, nimm `dataclass`. Gibt es eine feste Auswahl moeglicher Werte, nimm `Enum`. Steht das Verhalten im Vordergrund, schreib eine normale Klasse.",
    ),
  ],
  quiz: [
    Q("Was erzeugt der Dekorator `@dataclass` automatisch?",
      ["Nur `__init__`", "`__init__`, `__repr__` und `__eq__`",
       "Alle Sondermethoden", "Nur `__repr__`"], 1,
      "Standardmaessig entstehen diese drei. Weitere lassen sich ueber Einstellungen hinzufuegen."),
    Q("Was bewirkt `frozen=True`?",
      ["Die Klasse laesst sich nicht mehr ableiten",
       "Die Objekte sind unveraenderlich und hashbar",
       "Die Felder bekommen feste Typen",
       "Die Klasse wird schneller"],
      1,
      "Zuweisungen an Felder loesen dann einen Fehler aus, und das Objekt laesst sich in einer Menge verwenden."),
    Q("Wie gibst du einer Dataclass eine leere Liste als Vorgabe?",
      ["`werte: list = []`", "`werte: list = field(default_factory=list)`",
       "`werte: list = None`", "`werte = list()`"], 1,
      "Eine veraenderliche Vorgabe direkt anzugeben ist verboten. `default_factory` legt bei jeder Erzeugung eine neue Liste an."),
    Q("Wann laeuft `__post_init__`?",
      ["Vor `__init__`", "Direkt nach dem erzeugten `__init__`",
       "Beim Loeschen des Objekts", "Nur bei frozen=True"], 1,
      "Es ist der Platz fuer Pruefungen und abgeleitete Werte nach dem Setzen der Felder."),
    Q("Warum ist ein Enum besser als Zeichenketten fuer feste Zustaende?",
      ["Es ist schneller",
       "Tippfehler fallen sofort als AttributeError auf",
       "Es braucht weniger Speicher",
       "Zeichenketten sind in Python nicht erlaubt"],
      1,
      "Ein falsch geschriebener Enum-Name bricht sofort ab. Eine falsch geschriebene Zeichenkette laeuft still durch."),
  ],
  aufgaben: [
    {
      id: "a27-1",
      titel: "Dataclass fuer Messwerte",
      text: [P("Baue eine Dataclass `Messreihe` mit:"),
             L("`station: str`",
               "`werte: list` mit leerer Liste als Vorgabe",
               "einer Methode `erfassen(wert)`",
               "einer Eigenschaft `schnitt`, die bei leerer Liste `0.0` liefert"),
             P("Zwei Reihen duerfen sich die Liste nicht teilen.")],
      start: `from dataclasses import dataclass, field

@dataclass
class Messreihe:
    pass

a = Messreihe("Nord")
a.erfassen(20.0)
a.erfassen(24.0)

b = Messreihe("Sued")

print(a.schnitt, b.schnitt)
print(a)`,
      tipps: ["Die Vorgabe fuer die Liste braucht `field(default_factory=list)`.",
              "`@property` macht aus `schnitt` einen Attributzugriff.",
              "Fange die leere Liste ab, sonst teilst du durch null."],
      loesung: `from dataclasses import dataclass, field

@dataclass
class Messreihe:
    """Sammelt Messwerte einer Station."""

    station: str
    werte: list = field(default_factory=list)

    def erfassen(self, wert):
        self.werte.append(wert)

    @property
    def schnitt(self):
        if not self.werte:
            return 0.0
        return sum(self.werte) / len(self.werte)


a = Messreihe("Nord")
a.erfassen(20.0)
a.erfassen(24.0)

b = Messreihe("Sued")

print(a.schnitt, b.schnitt)
print(a)`,
      tests: [
        T("Der Durchschnitt stimmt", `m = Messreihe("X")\nm.erfassen(10)\nm.erfassen(20)\nassert m.schnitt == 15.0`),
        T("Die leere Reihe gibt 0.0", `assert Messreihe("X").schnitt == 0.0`),
        T("Zwei Reihen teilen sich die Liste nicht", `a = Messreihe("A")\nb = Messreihe("B")\na.erfassen(1)\nassert b.werte == [], f"b.werte war {b.werte}, die Liste wird geteilt"`),
        T("Es ist eine Dataclass", `import dataclasses\nassert dataclasses.is_dataclass(Messreihe)`),
        T("schnitt ist eine Eigenschaft", `assert isinstance(type(Messreihe("X")).schnitt, property), "Nutze @property"`),
      ],
    },
    {
      id: "a27-2",
      titel: "Enum fuer Prioritaeten",
      text: [P("Lege ein Enum `Prioritaet` mit `NIEDRIG = 1`, `MITTEL = 2` und `HOCH = 3` an."),
             P("Schreibe dann eine Dataclass `Aufgabe` mit `titel: str` und `prio: Prioritaet`. Die Funktion `sortiere(aufgaben)` soll nach Prioritaet absteigend sortieren.")],
      start: `from dataclasses import dataclass
from enum import Enum

class Prioritaet(Enum):
    pass

@dataclass
class Aufgabe:
    pass

def sortiere(aufgaben):
    pass

liste = [
    Aufgabe("Putzen", Prioritaet.NIEDRIG),
    Aufgabe("Abgabe", Prioritaet.HOCH),
    Aufgabe("Einkauf", Prioritaet.MITTEL),
]

for a in sortiere(liste):
    print(f"{a.prio.name:<8}{a.titel}")`,
      tipps: ["Im Enum weist du die Zahlen direkt zu, `auto()` brauchst du hier nicht.",
              "Beim Sortieren greifst du auf `a.prio.value` zu.",
              "`sorted(aufgaben, key=lambda a: a.prio.value, reverse=True)`"],
      loesung: `from dataclasses import dataclass
from enum import Enum

class Prioritaet(Enum):
    NIEDRIG = 1
    MITTEL = 2
    HOCH = 3


@dataclass
class Aufgabe:
    titel: str
    prio: Prioritaet


def sortiere(aufgaben):
    """Sortiert nach Prioritaet, die wichtigste zuerst."""
    return sorted(aufgaben, key=lambda a: a.prio.value, reverse=True)


liste = [
    Aufgabe("Putzen", Prioritaet.NIEDRIG),
    Aufgabe("Abgabe", Prioritaet.HOCH),
    Aufgabe("Einkauf", Prioritaet.MITTEL),
]

for a in sortiere(liste):
    print(f"{a.prio.name:<8}{a.titel}")`,
      tests: [
        T("Das Enum hat drei Stufen", `assert len(list(Prioritaet)) == 3`),
        T("Die Werte stimmen", `assert Prioritaet.HOCH.value == 3 and Prioritaet.NIEDRIG.value == 1`),
        T("Die Sortierung stimmt", `l = [Aufgabe("a", Prioritaet.NIEDRIG), Aufgabe("b", Prioritaet.HOCH)]\nassert [x.titel for x in sortiere(l)] == ["b", "a"]`),
        T("Das Original bleibt unveraendert", `l = [Aufgabe("a", Prioritaet.NIEDRIG), Aufgabe("b", Prioritaet.HOCH)]\nsortiere(l)\nassert l[0].titel == "a", "Nutze sorted statt sort"`),
        T("Aufgabe ist eine Dataclass", `import dataclasses\nassert dataclasses.is_dataclass(Aufgabe)`),
        T("Die Ausgabe beginnt mit der hoechsten Prioritaet", `zeilen = [z for z in AUSGABE.split("\\n") if z.strip()]\nassert zeilen[0].startswith("HOCH"), f"Erste Zeile: {zeilen[0]!r}"`),
      ],
    },
  ],
});

M5.push({
  id: "l-entwurf",
  titel: "Entwurf: Klassen richtig schneiden",
  dauer: 16,
  vorspann: "Klassen zu schreiben ist einfach. Sie so zu schneiden, dass der Code in einem halben Jahr noch aenderbar ist, ist die eigentliche Kunst. Hier die Regeln, die dabei am meisten tragen.",
  ziele: [
    "Eine Verantwortung pro Klasse erkennen",
    "Komposition der Vererbung vorziehen",
    "Abhaengigkeiten von aussen hereingeben",
    "Statische Methoden und Klassenmethoden einordnen",
  ],
  inhalt: [
    H2("Eine Klasse, eine Verantwortung"),
    P("Diese Klasse macht zu viel:"),
    C(`class BenutzerSchlecht:
    def __init__(self, name, email):
        self.name = name
        self.email = email

    def speichern_in_datenbank(self):
        pass

    def email_senden(self, text):
        pass

    def als_pdf_ausgeben(self):
        pass

    def passwort_pruefen(self, eingabe):
        pass`, { lauf: false }),
    P("Datenhaltung, Datenbank, Versand, Ausgabe und Sicherheit in einem Objekt. Aendert sich die Datenbank, musst du die Benutzerklasse anfassen. Willst du den Versand testen, brauchst du eine Datenbank. Besser ist die Trennung:"),
    C(`from dataclasses import dataclass

@dataclass
class Benutzer:
    name: str
    email: str


class BenutzerSpeicher:
    def __init__(self, verbindung):
        self.verbindung = verbindung

    def sichern(self, benutzer):
        return f"{benutzer.name} gesichert ueber {self.verbindung}"


class Postversand:
    def senden(self, benutzer, text):
        return f"An {benutzer.email}: {text}"


b = Benutzer("Ada", "ada@example.org")
print(BenutzerSpeicher("Testverbindung").sichern(b))
print(Postversand().senden(b, "Willkommen"))`,
      { aus: "Ada gesichert ueber Testverbindung\nAn ada@example.org: Willkommen" }),
    MERKE("Der Pruefsatz",
      "Beschreibe die Klasse in einem Satz ohne *und*. Geht das nicht, macht sie zu viel.",
    ),

    H2("Abhaengigkeiten hereingeben"),
    P("Schau dir an, was beim Testen passiert, wenn eine Klasse ihre Abhaengigkeiten selbst erzeugt:"),
    C(`class WetterdienstEcht:
    def temperatur(self, ort):
        return 21.5


class AnzeigeSchlecht:
    def __init__(self):
        self.dienst = WetterdienstEcht()

    def text(self, ort):
        return f"{ort}: {self.dienst.temperatur(ort)} Grad"


class AnzeigeGut:
    def __init__(self, dienst):
        self.dienst = dienst

    def text(self, ort):
        return f"{ort}: {self.dienst.temperatur(ort)} Grad"


class WetterdienstTest:
    def temperatur(self, ort):
        return -40.0


print(AnzeigeGut(WetterdienstEcht()).text("Berlin"))
print(AnzeigeGut(WetterdienstTest()).text("Berlin"))`,
      { aus: "Berlin: 21.5 Grad\nBerlin: -40.0 Grad" }),
    P("Die gute Fassung laesst sich ohne Netzwerk testen, weil du den Dienst von aussen hereingibst. Das heisst **Abhaengigkeitsinjektion** und klingt komplizierter als es ist: gib Dinge als Parameter herein, statt sie im Inneren zu erzeugen."),

    H2("Komposition statt tiefer Hierarchien"),
    P("Ein haeufiger Anfaengerfehler sind Vererbungsbaeume, die die Wirklichkeit nachbilden sollen. Sobald ein Fall nicht mehr passt, bricht das Modell."),
    C(`# Wird schnell unhaltbar
class Vogel:
    def fliegen(self): return "fliegt"

class Pinguin(Vogel):
    def fliegen(self):
        raise NotImplementedError("Pinguine fliegen nicht")`, { lauf: false }),
    P("Die Unterklasse kann die Zusage der Basisklasse nicht einhalten. Mit Komposition loest sich das Problem auf:"),
    C(`class Fliegen:
    def bewegen(self):
        return "fliegt"

class Schwimmen:
    def bewegen(self):
        return "schwimmt"


class Tier:
    def __init__(self, name, fortbewegung):
        self.name = name
        self.fortbewegung = fortbewegung

    def beschreiben(self):
        return f"{self.name} {self.fortbewegung.bewegen()}"


print(Tier("Adler", Fliegen()).beschreiben())
print(Tier("Pinguin", Schwimmen()).beschreiben())`,
      { aus: "Adler fliegt\nPinguin schwimmt" }),
    P("Das Verhalten ist jetzt austauschbar, sogar zur Laufzeit. Neue Fortbewegungsarten kommen dazu, ohne dass eine bestehende Klasse angefasst wird."),

    H2("Statische Methoden und Klassenmethoden"),
    C(`class Temperatur:
    def __init__(self, celsius):
        self.celsius = celsius

    def __repr__(self):
        return f"Temperatur({self.celsius:.1f})"

    @classmethod
    def aus_fahrenheit(cls, grad):
        return cls((grad - 32) * 5 / 9)

    @classmethod
    def gefrierpunkt(cls):
        return cls(0)

    @staticmethod
    def ist_plausibel(wert):
        return -90 <= wert <= 60

    def nach_fahrenheit(self):
        return self.celsius * 9 / 5 + 32


print(Temperatur(21.5))
print(Temperatur.aus_fahrenheit(70.7))
print(Temperatur.gefrierpunkt())
print(Temperatur.ist_plausibel(1000))
print(Temperatur(100).nach_fahrenheit())`,
      { aus: "Temperatur(21.5)\nTemperatur(21.5)\nTemperatur(0.0)\nFalse\n212.0" }),
    TAB(["Art", "Erstes Argument", "Wofuer"],
      ["normale Methode", "`self`", "arbeitet mit dem Objekt"],
      ["`@classmethod`", "`cls`", "erzeugt Objekte auf anderem Weg"],
      ["`@staticmethod`", "keines", "gehoert thematisch dazu, braucht nichts"],
    ),
    P("Klassenmethoden werden vor allem fuer alternative Konstruktoren genutzt. `dict.fromkeys` und `datetime.now` sind genau das. Der Vorteil gegenueber einer freien Funktion: durch `cls` funktionieren sie auch in Unterklassen richtig."),

    H2("Die wichtigsten Regeln auf einen Blick"),
    NR(
      "**Eine Verantwortung pro Klasse.** Beschreibe sie in einem Satz ohne *und*.",
      "**Komposition vor Vererbung.** Frage *hat ein* vor *ist ein*.",
      "**Abhaengigkeiten hereingeben** statt im Inneren zu erzeugen.",
      "**Keine tiefen Hierarchien.** Ab drei Ebenen wird es unuebersichtlich.",
      "**Nicht alles muss eine Klasse sein.** Braucht etwas keinen Zustand, nimm eine Funktion.",
    ),
    HINWEIS("Die letzte Regel ist die wichtigste",
      "In Python ist es voellig in Ordnung, ein Modul mit Funktionen zu schreiben. Eine Klasse mit nur einer Methode und ohne Zustand ist eine Funktion in Verkleidung. Andere Sprachen zwingen zu Klassen, Python nicht.",
    ),

    H2("Ein durchdachtes Beispiel"),
    C(`from dataclasses import dataclass, field

@dataclass(frozen=True)
class Datensatz:
    merkmale: tuple
    zielwert: float


class Standardisierer:
    """Verschiebt Werte auf Mittelwert null."""

    def __init__(self):
        self.mittel = None

    def anpassen(self, saetze):
        anzahl = len(saetze[0].merkmale)
        self.mittel = [
            sum(s.merkmale[i] for s in saetze) / len(saetze)
            for i in range(anzahl)
        ]
        return self

    def anwenden(self, satz):
        return tuple(w - m for w, m in zip(satz.merkmale, self.mittel))


daten = [
    Datensatz((10.0, 100.0), 1.0),
    Datensatz((20.0, 300.0), 0.0),
]

vorbereiter = Standardisierer().anpassen(daten)

for satz in daten:
    print(vorbereiter.anwenden(satz))`,
      { aus: "(-5.0, -100.0)\n(5.0, 100.0)" }),
    P("Der Datensatz haelt nur Daten und ist unveraenderlich. Der Standardisierer hat genau eine Aufgabe. `anpassen` gibt `self` zurueck, sodass sich Aufrufe verketten lassen. Genau dieses Muster findest du in scikit-learn wieder, wo jede Vorverarbeitung `fit` und `transform` anbietet."),
  ],
  quiz: [
    Q("Woran erkennst du, dass eine Klasse zu viel tut?",
      ["Sie hat mehr als drei Methoden",
       "Ihre Beschreibung braucht ein *und*",
       "Sie hat keine Vererbung",
       "Sie ist laenger als zehn Zeilen"],
      1,
      "Der Satztest ist die praktischste Pruefung: geht es nicht ohne *und*, sind es mehrere Verantwortungen."),
    Q("Was ist Abhaengigkeitsinjektion?",
      ["Eine Klasse erzeugt ihre Abhaengigkeiten selbst",
       "Abhaengigkeiten werden von aussen als Parameter uebergeben",
       "Ein Muster der Mehrfachvererbung",
       "Eine Art, Module einzubinden"],
      1,
      "Die Klasse bekommt, was sie braucht, statt es zu erzeugen. Dadurch laesst sie sich mit Ersatzobjekten testen."),
    Q("Was ist das Problem an `class Pinguin(Vogel)` mit einer fliegenden Basisklasse?",
      ["Pinguine sind keine Voegel",
       "Die Unterklasse kann die Zusage der Basisklasse nicht einhalten",
       "Vererbung ist grundsaetzlich schlecht",
       "Es fehlt eine Zwischenklasse"],
      1,
      "Wenn eine Unterklasse eine geerbte Methode nur mit einem Fehler beantworten kann, war die Hierarchie falsch geschnitten."),
    Q("Wofuer nutzt man `@classmethod` am haeufigsten?",
      ["Fuer Hilfsfunktionen ohne Objektbezug",
       "Fuer alternative Konstruktoren",
       "Um Attribute zu schuetzen",
       "Um Vererbung zu verhindern"],
      1,
      "`cls` erlaubt es, ein Objekt der jeweiligen Klasse zu erzeugen, was auch in Unterklassen richtig funktioniert."),
    Q("Wann braucht etwas in Python **keine** Klasse?",
      ["Wenn es weniger als fuenf Zeilen hat",
       "Wenn es keinen Zustand haelt und nur eine Aufgabe erledigt",
       "Wenn es keine Vererbung nutzt",
       "Nie, alles sollte eine Klasse sein"],
      1,
      "Eine Klasse ohne Zustand mit einer einzigen Methode ist eine Funktion mit Umweg. Python erlaubt freie Funktionen ausdruecklich."),
  ],
  aufgaben: [
    {
      id: "a28-1",
      titel: "Verhalten austauschbar machen",
      text: [P("Baue drei Klassen mit einer Methode `anwenden(werte)`:"),
             L("`OhneAenderung` gibt die Werte unveraendert zurueck",
               "`Verdoppeln` verdoppelt jeden Wert",
               "`AufNullSetzen` macht aus negativen Werten eine Null"),
             P("Die Funktion `verarbeite(werte, schritte)` soll alle Schritte nacheinander anwenden, ohne die einzelnen Klassen zu kennen."),
             P("Erwartete Ausgabe: `[0, 4, 0, 10]`")],
      start: `class OhneAenderung:
    pass

class Verdoppeln:
    pass

class AufNullSetzen:
    pass

def verarbeite(werte, schritte):
    pass

print(verarbeite([-3, 2, -1, 5], [AufNullSetzen(), Verdoppeln()]))`,
      tipps: ["Jede Klasse braucht nur die Methode `anwenden(self, werte)`.",
              "In `verarbeite` laeufst du ueber die Schritte und ersetzt die Werte jedes Mal.",
              "`for s in schritte: werte = s.anwenden(werte)`"],
      loesung: `class OhneAenderung:
    def anwenden(self, werte):
        return list(werte)


class Verdoppeln:
    def anwenden(self, werte):
        return [w * 2 for w in werte]


class AufNullSetzen:
    def anwenden(self, werte):
        return [w if w > 0 else 0 for w in werte]


def verarbeite(werte, schritte):
    """Wendet alle Schritte der Reihe nach an."""
    for schritt in schritte:
        werte = schritt.anwenden(werte)
    return werte


print(verarbeite([-3, 2, -1, 5], [AufNullSetzen(), Verdoppeln()]))`,
      tests: [
        T("Die Kette stimmt", `assert verarbeite([-3, 2, -1, 5], [AufNullSetzen(), Verdoppeln()]) == [0, 4, 0, 10]`),
        T("Die Reihenfolge der Schritte wirkt", `assert verarbeite([-3], [Verdoppeln(), AufNullSetzen()]) == [0]`),
        T("Ohne Schritte bleibt alles gleich", `assert verarbeite([1, 2], []) == [1, 2]`),
        T("OhneAenderung aendert nichts", `assert OhneAenderung().anwenden([1, -2]) == [1, -2]`),
        T("Die Funktion kennt die Klassen nicht", `k = QUELLE.split("def verarbeite")[1].split("print(")[0]\nassert "Verdoppeln" not in k and "AufNullSetzen" not in k, "Die Funktion darf die einzelnen Klassen nicht nennen"`),
      ],
    },
    {
      id: "a28-2",
      titel: "Alternative Konstruktoren",
      text: [P("Schreibe eine Klasse `Zeitspanne`, die intern Sekunden haelt:"),
             L("`__init__(self, sekunden)`",
               "`@classmethod aus_minuten(cls, minuten)`",
               "`@classmethod aus_stunden(cls, stunden)`",
               "`@staticmethod ist_gueltig(sekunden)`, wahr bei nicht negativen Werten",
               "`__repr__`, das `Zeitspanne(90)` liefert")],
      start: `class Zeitspanne:
    pass

print(Zeitspanne(90))
print(Zeitspanne.aus_minuten(1.5))
print(Zeitspanne.aus_stunden(2))
print(Zeitspanne.ist_gueltig(-5))`,
      tipps: ["Klassenmethoden bekommen `cls` als erstes Argument und geben `cls(...)` zurueck.",
              "Statische Methoden bekommen weder `self` noch `cls`.",
              "Rechne die Sekunden in eine ganze Zahl um, damit die Ausgabe sauber bleibt."],
      loesung: `class Zeitspanne:
    """Eine Zeitspanne, intern in Sekunden."""

    def __init__(self, sekunden):
        self.sekunden = int(sekunden)

    def __repr__(self):
        return f"Zeitspanne({self.sekunden})"

    @classmethod
    def aus_minuten(cls, minuten):
        return cls(minuten * 60)

    @classmethod
    def aus_stunden(cls, stunden):
        return cls(stunden * 3600)

    @staticmethod
    def ist_gueltig(sekunden):
        return sekunden >= 0


print(Zeitspanne(90))
print(Zeitspanne.aus_minuten(1.5))
print(Zeitspanne.aus_stunden(2))
print(Zeitspanne.ist_gueltig(-5))`,
      tests: [
        T("Die Grundform stimmt", `assert repr(Zeitspanne(90)) == "Zeitspanne(90)"`),
        T("Minuten werden umgerechnet", `assert Zeitspanne.aus_minuten(1.5).sekunden == 90`),
        T("Stunden werden umgerechnet", `assert Zeitspanne.aus_stunden(2).sekunden == 7200`),
        T("Die Pruefung arbeitet ohne Objekt", `assert Zeitspanne.ist_gueltig(-5) is False and Zeitspanne.ist_gueltig(0) is True`),
        T("Es sind echte Klassenmethoden", `assert isinstance(Zeitspanne.__dict__["aus_minuten"], classmethod), "Nutze @classmethod"`),
        T("Es ist eine echte statische Methode", `assert isinstance(Zeitspanne.__dict__["ist_gueltig"], staticmethod), "Nutze @staticmethod"`),
      ],
    },
  ],
});

/* Deutsches Übungsmaterial. Wörter grob nach Häufigkeit sortiert, Substantive großgeschrieben. */

const DATA_DE = {
  words: `der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch es an werden aus er hat dass sie
nach wird bei einer um am sind noch wie einem über einen so zum war haben nur oder aber vor zur bis mehr durch man sein wurde sei
hatte kann gegen vom können schon wenn habe seine ihre dann unter wir soll ich eines Jahr zwei Jahren diese dieser wieder keine
seiner worden will zwischen immer was sagte gibt alle diesem seit muss wurden beim doch jetzt waren drei Jahre neue damit bereits
da ihr seinen müssen ab ihrer Menschen ohne sollen hier Zeit sehr Frau dabei Stadt wo heute weil viele Land sagt geht kommt macht
steht weiß sieht Tag Tage Mann Kind Kinder Hand Haus Welt Leben Arbeit Weg Auge Frage Wasser Schule Geld Name Familie Kopf Freund
Woche Monat Nacht Abend Morgen Stunde Minute Teil Seite Wort Buch Bild Ende Anfang Beispiel Problem Recht Grund Platz Raum Tür
gut groß neu erste lang klein alt hoch ganz weit richtig spät schnell langsam kurz einfach schwer leicht schön wichtig möglich
frei stark jung früh voll leer warm kalt heiß hell dunkel laut leise ruhig klar sicher bekannt genau gleich letzte nächste bald
halb rot blau grün gelb weiß schwarz grau braun müde froh glücklich traurig lieb nett freundlich klug reich arm teuer billig süß
sauer frisch sauber weich hart dick dünn breit tief nah offen fertig bereit besser beste viel wenig oft selten nie manchmal gestern
gerade sofort später zusammen allein gern lieber ziemlich fast genug etwa vielleicht wirklich natürlich leider morgen dort hinten
vorne oben unten links rechts draußen drinnen überall nichts etwas alles jemand niemand jeder jede jedes welche welcher welches
dieses jener mein meine dein deine unser unsere euer ihm ihn ihnen uns euch mich dich mir dir wer wen wem wessen warum wann wieso
weshalb woher wohin wie denn also sondern sowie obwohl während wegen trotz statt außer ob falls sobald seitdem bevor nachdem
sagen machen geben kommen wollen gehen wissen sehen lassen stehen finden bleiben liegen heißen denken nehmen tun dürfen glauben
halten nennen mögen zeigen führen sprechen bringen leben fahren meinen fragen kennen stellen spielen arbeiten brauchen folgen
lernen verstehen setzen bekommen beginnen erzählen versuchen schreiben laufen erklären sitzen ziehen scheinen fallen gehören
erhalten treffen suchen legen tragen schaffen lesen verlieren erkennen reden aussehen erscheinen anfangen erwarten wohnen warten
helfen gewinnen schließen fühlen bieten erinnern studieren ansehen fehlen bedeuten essen trinken schlafen kaufen zahlen öffnen
lachen weinen singen tanzen springen schwimmen fliegen rufen hören kochen backen putzen waschen malen reisen wandern üben tippen
drücken werfen fangen wählen zählen lächeln genießen gießen fließen stoßen grüßen freuen ändern planen packen schicken schenken
ist sind hat haben wird werden kann können muss müssen soll will war waren hatte hatten wurde würde möchte könnte sollte müsste
gibt geht kommt macht sagt steht liegt heißt bleibt nimmt findet denkt glaubt zeigt spricht fährt läuft trägt hält lässt weißt
bist habe hast seid wäre gab ging kam sah stand fand blieb lag nahm dachte wusste sagte machte fragte spielte lernte arbeitete
Mensch Menschen Frauen Männer Mutter Vater Eltern Bruder Schwester Sohn Tochter Oma Opa Onkel Tante Leute Gast Gäste Nachbar
Freundin Kollege Chef Lehrer Lehrerin Schüler Student Arzt Ärztin Bauer Fahrer Koch König Königin Polizei Mädchen Junge Baby
Zimmer Küche Garten Straße Auto Zug Bus Rad Bahn Schiff Flugzeug Reise Urlaub Wetter Sonne Regen Schnee Wind Himmel Baum Blume
Wald Berg Meer See Fluss Insel Tier Hund Katze Vogel Pferd Fisch Kuh Maus Löwe Bär Essen Brot Kaffee Tee Milch Apfel Käse Wein
Bier Suppe Kuchen Zucker Salz Obst Gemüse Fleisch Ei Eier Butter Honig Saft Nudeln Reis Kartoffel Tomate Brötchen Frühstück
Mittag Musik Lied Film Spiel Sport Ball Farbe Brief Karte Zeitung Geschichte Stimme Herz Körper Firma Büro Computer Telefon
Handy Nachricht Idee Meinung Antwort Gefühl Glück Liebe Angst Freude Hilfe Kraft Ruhe Sprache Schrift Taste Tasten Finger
Tastatur Übung Fehler Erfolg Ziel Plan Regel Ordnung Frühling Sommer Herbst Winter Montag Dienstag Mittwoch Donnerstag Freitag
Samstag Sonntag Januar Februar März April Mai Juni Juli August September Oktober November Dezember Größe Höhe Länge Brücke Dorf
Markt Laden Kirche Bahnhof Hotel Museum Park Strand Ufer Feld Wiese Stein Feuer Licht Luft Erde Glas Tasse Teller Messer Gabel
Löffel Flasche Schlüssel Tasche Kiste Jacke Hose Hemd Schuh Schuhe Hut Mantel Uhr Brille Stift Papier Heft Tisch Stuhl Bett
Fenster Wand Boden Dach Treppe Keller Lampe Bild Spiegel Schrank Regal Sofa Teppich Ecke Mitte Rand Kreis Linie Punkt Zahl
Nummer Preis Euro Rechnung Kasse Bank Post Paket Geschenk Party Feier Fest Geburtstag Hochzeit Ferien Pause Termin Beruf Job
Aufgabe Thema Text Satz Seite Kapitel Roman Gedicht Wörter Bücher Schüler Klasse Unterricht Prüfung Note Frieden Krieg Staat
Gesellschaft Politik Wirtschaft Unternehmen Markt Kunde Kunden Produkt Qualität Entwicklung Bereich Gruppe Beispiel Möglichkeit
Grund Ergebnis Zukunft Vergangenheit Gegenwart Natur Umwelt Energie Wärme Kälte Nähe Ferne Stärke Mühe Spaß Fuß Füße Gruß
Straßen Städte Länder Hände Bäume Blätter Äpfel Vögel Söhne Töchter Züge Stühle Brüder Mütter Väter Wände Türen Fenster
Bäckerei Geschäft Gerät Gespräch Getränk Fläche Traum Träume Märchen Zwerg Riese Schatz Kerze Decke Kissen Zaun Tor Hof Weg
bequem quer Quelle Quadrat Quark Quiz Frequenz Typ typisch System Physik Hobby Yoga Rhythmus Symbol Analyse Pyramide Gymnasium
Mythos Bayern Sylt Taxi Text Hexe Axt boxen Boxer fix Mixer Examen extra exakt Experte Luxus Praxis Max Nixe Export Index
ja nein doch bitte danke hallo tschüss okay gar schon eben halt mal wohl eher sogar kaum außen innen dazu davon darauf daran
dafür dagegen darum deshalb trotzdem sonst zwar nämlich endlich plötzlich schließlich zuerst danach dann meistens häufig
täglich wöchentlich ähnlich während fröhlich möglich natürlich ehrlich herrlich gemütlich pünktlich höflich zwölf dreißig
fleißig mäßig regelmäßig außerdem draußen bloß heißen Fußball Soße Maß Strauß Schloss Kuss Fluss Schluss dass muss
da das als lag lass glas gas hals fall falls kahl saal jagd hass fass flasche fad
die sie dies des leise seife eile fliege sieg sieh heil held feld lied lief ließ kiel kies fies`.split(/\s+/),

  names: `Anna Bernd Clara David Emma Felix Greta Hans Ida Jonas Klara Lukas Mia Nina Otto Paul Rosa Sophie Tim Ute Volker Wilma
Yvonne Zoe Jürgen Jörg Björn Özlem Lena Leon Marie Moritz Hannah Julia Karl Lisa Max Berlin Hamburg München Köln Frankfurt Stuttgart
Düsseldorf Leipzig Dresden Hannover Nürnberg Bremen Wien Zürich Bern Graz Salzburg Kiel Ulm Jena Rhein Elbe Alpen Ostsee Nordsee
Deutschland Österreich Schweiz Italien Frankreich Spanien Europa`.split(/\s+/),

  contractions: `geht's gibt's wie's hab' mach's klappt's`.split(/\s+/),

  qwords: ['wer', 'was', 'wie', 'wo', 'wann', 'warum', 'woher', 'wohin', 'welche', 'kannst du', 'hast du', 'ist das', 'gibt es'],

  bigrams: 'en er ch de ei te in nd ie ge st ne be es un re an he au ng se it di ic sc le da ns is ra'.split(' '),
  trigrams: 'ein ich nde die und der che end gen sch cht den ine nge ung das hen ind ens ies ste ten ere lic ach ndi sse aus ers ebe ner eit'.split(' '),

  sentences: String.raw`Franz jagt im komplett verwahrlosten Taxi quer durch Bayern.
Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.
Falsches Üben von Xylophonmusik quält jeden größeren Zwerg.
Jeder wackere Bayer vertilgt bequem zwo Pfund Kalbshaxen.
Die Sonne geht langsam über den stillen Hügeln auf.
Sie legt ihre Schlüssel immer in die kleine Schale an der Tür.
Wir sind am Fluss entlanggelaufen, bis es dunkel wurde.
Eine gute Tasse Tee hilft fast immer.
Der Zug hatte Verspätung, deshalb haben wir den Anfang des Films verpasst.
Mein Bruder spielt jeden Abend nach dem Essen Gitarre.
Es hat die ganze Nacht geregnet, und der Garten riecht ganz frisch.
Übung macht nicht perfekt, sondern dauerhaft.
Kannst du bitte das Fenster schließen? Es wird kalt hier drin.
Die alte Bibliothek riecht nach Staub, Papier und Holz.
Jeder kleine Schritt zählt, wenn man etwas Neues lernt.
Sie haben die Küche in einem warmen Gelb gestrichen.
Ich habe meinen Regenschirm schon wieder im Bus vergessen.
Die Kinder bauen eine Burg aus Sand und Muscheln.
Unser Nachbar pflanzt Tomaten, Bohnen und süße Paprika.
Er las den Brief zweimal, bevor er ihn verstand.
Der Markt öffnet um sieben und schließt am Mittag.
Frisches Brot schmeckt am besten, solange es noch warm ist.
Sie fragte: "Wo hast du so gut kochen gelernt?"
Niemand wusste, warum die Uhr am Turm stehen geblieben war.
Wir brauchen Milch, Eier, Mehl und etwas Zucker.
Die Katze schlief den ganzen Nachmittag in der Sonne.
Halte die Handgelenke locker und lass die Finger arbeiten.
Ein langer Spaziergang macht den Kopf frei.
Das Museum ist an jedem ersten Sonntag im Monat kostenlos.
Bitte schick mir den Bericht bis Freitagnachmittag.
Der Sturm hat zwei Bäume in unserer Straße umgeworfen.
Er hat den ganzen Sommer an einem alten Boot gearbeitet.
Gut tippen zu lernen braucht Geduld, kein Talent.
Mach dir keine Sorgen um das Tempo; triff die richtigen Tasten.
Die Bäckerei an der Ecke hat die besten Brötchen der Stadt.
Es ist nie zu spät, etwas Neues zu lernen.
Wir haben bis Mitternacht vom Dach aus die Sterne beobachtet.
Ihr Garten ist voller Rosen, Tulpen und wilder Kräuter.
Die Besprechung wurde von Dienstag auf Donnerstag verschoben.
Biege an der Brücke links ab und folge der Straße bis zum See.
Sie planen im nächsten Frühling eine Reise in die Berge.
Wann fährt heute Abend der letzte Bus?
Meine Großmutter schreibt ihre Briefe noch immer mit der Hand.
Die Suppe braucht eine Prise Salz und etwas Pfeffer.
In einem ruhigen Raum kann man sich besser konzentrieren.
Die Mannschaft hat hart trainiert und das Finale gewonnen.
Hörst du die Vögel draußen singen?
Der Kaffee ist in diesem Jahr schon wieder teurer geworden.
Er hat seine Schlüssel, sein Handy und seine Geldbörse vergessen.
Die Straße schlängelt sich durch Felder voller Weizen und Mais.
Sie spricht drei Sprachen und lernt gerade eine vierte.
Wir waren früh da und hatten noch Zeit für ein Frühstück.
Im langen, kalten Winter ist der Fluss zugefroren.
Genau als der Film begann, ging das Licht aus.
Ich gehe lieber zu Fuß, als eine Stunde auf ein Taxi zu warten.
Die Arbeiter haben die neue Brücke früher als geplant fertiggestellt.
Die Zeit vergeht wie im Flug, wenn man Spaß hat.
Fehler sind der Beweis dafür, dass du es versuchst.
Der Himmel wurde erst orange, dann rosa und schließlich tiefrot.
Wir teilten uns eine Pizza und redeten bis spät in die Nacht.
Im neuen Park gibt es einen Spielplatz, einen Teich und einen Kiosk.
Seine Handschrift ist so klein, dass niemand sie lesen kann.
Gute Gewohnheiten entstehen Tag für Tag.
Der Busfahrer winkte, als wir über die Straße gingen.
In einem alten Buch fanden sie eine versteckte Karte.
Der Wind trug den Geruch des Meeres weit ins Land.
Räum deinen Schreibtisch auf, bevor du mit der Arbeit beginnst.
Der Wasserkessel pfiff, und das Haus füllte sich mit Dampf.
Bitte sprich im Lesesaal leise.
Meine Schwester sammelt Briefmarken aus der ganzen Welt.
Der Kellner brachte uns Wasser, Brot und Oliven.
Schwimmen lernt man nicht, indem man darüber liest.
Wir treffen uns um halb elf am Bahnhof.
Das Bild zeigt ein kleines Schiff auf stürmischer See.
Der Trainer sagte uns, wir sollten ruhig atmen und gelassen bleiben.
Schnee bedeckte die Felder wie eine dicke weiße Decke.
Die Lampe auf meinem Schreibtisch ist älter als ich.
Alle lachten, als der Papagei Hallo sagte.
Der Weg war steil, aber die Aussicht hat sich gelohnt.
Die Schüler hörten still zu, während die Lehrerin sprach.
Unter dem Blumentopf liegt ein Ersatzschlüssel.
Der Motor machte ein seltsames Geräusch und ging dann aus.
Unsere Stadt feiert jeden Juli ein Musikfest.
Sie wickelte das Geschenk in braunes Papier und Schnur.
Die Fähre überquert die Bucht alle zwanzig Minuten.
Warum setzen sich Katzen immer genau auf das, was man gerade braucht?
Die Blätter raschelten unter unseren Stiefeln im Park.
Er trinkt seinen Kaffee schwarz und mag sein Brot knusprig.
Am Freitagnachmittag ist es im Büro ganz ruhig.
Kaum etwas fühlt sich so gut an wie eine Nacht voller Schlaf.
Die Kinder zählten die Tage bis zu den Ferien.
Bleib ruhig, atme und lass die Finger die Tasten finden.
Ist heute wirklich schon wieder Montag?
Was für ein herrlicher Morgen!
Vorsicht, die Stufen sind glatt!
Die bekannte Autorin signierte Exemplare ihres neuen Buches.
Unser langfristiges Ziel ist es, ohne Nachdenken zu schreiben.
Manche tippen mit zwei Fingern; andere benutzen alle zehn.
Der Hund bellte, das Baby wachte auf, und der Tag begann.
Merke dir: Langsam ist sauber, und sauber ist schnell.
Es gibt drei Regeln: freundlich sein, neugierig sein, geduldig sein.
"Na ja", sagte er, "das lief besser als erwartet."
"Bereit?", fragte sie. "Bereit!", riefen alle zurück.
Der Bauer prüfte nach dem Sturm den Zaun.
Eine einzige Kerze erhellte den ganzen Raum.
Wer rastet, der rostet.
Morgenstund hat Gold im Mund.
Übung macht den Meister.
Die Straßenbahn hält direkt vor dem Rathaus.
Im Sommer fahren wir mit dem Rad an die Ostsee.
Österreich und die Schweiz grenzen an Deutschland.
Das Wörterbuch liegt ganz unten im Regal.
Der Löwe ist müde und döst im Schatten eines Baumes.
Zwölf Äpfel, drei Birnen und ein Kürbis liegen im Korb.
Die Größe des Raumes überraschte alle Gäste.
Heißer Tee mit Honig hilft bei Halsschmerzen.
In der Küche duftet es nach frisch gebackenem Kuchen.
Der Typ an der Kasse hatte ein sehr altes Handy.
Beim Yoga lernt man, ruhig und gleichmäßig zu atmen.
Das System speichert jede Änderung automatisch.
Max boxt jeden Mittwoch im Verein.
Die Qualität der Quelle ist entscheidend.
Viele Obstsorten, z. B. Äpfel und Birnen, wachsen auch bei uns.
Unser Flug geht morgen früh um 6:45 Uhr.
Für das Rezept braucht man 3 Eier und 250 Gramm Mehl.
Im Jahr 1969 betraten zum ersten Mal Menschen den Mond.
Das Hotel hat 120 Zimmer und einen kleinen Pool auf dem Dach.
Er ist 5 Kilometer in knapp 24 Minuten gelaufen.
Auf Seite 42 wird die ganze Idee in einem kurzen Absatz erklärt.
Der Laden hat montags bis samstags von 9 bis 18 Uhr geöffnet.
Nur 7 von 30 Schülern hatten das Buch gelesen.
Eine Karte kostet 15 Euro, für Familien 40 Euro.
Das Paket wog 2,5 Kilogramm und kam am 03.05. an.
Ruf mich unter 0171 4455667 an, falls sich etwas ändert.
Sie wurde am 12.03.1994 in einer kleinen Stadt an der Küste geboren.
Zimmer 404 liegt am Ende des Flurs, direkt neben der Treppe.
Um 15:15 Uhr klingelte es, und der Flur füllte sich mit Lärm.
Bei der Umfrage wurden 1.200 Menschen zu ihren Gewohnheiten befragt.
In der Nacht fielen die Temperaturen auf minus 12 Grad.
Der Leuchtturm weist den Schiffen seit 1887 den Weg nach Hause.
Unser Ergebnis stieg in nur zwei Wochen von 45 auf 78!
Die E-Mail kam um 11:30 Uhr, kurz vor Ablauf der Frist.
Das Konzert beginnt pünktlich um 20 Uhr; bitte seid rechtzeitig da.
Das Rezept (von meiner Mutter) ist seit Jahren in der Familie.
Etwa 70 % der Erdoberfläche sind mit Wasser bedeckt.
Die Formel war einfach: x = 4 * (y + 2).
Schick deine Fragen bis Juni an info@beispiel.de.
Auf dem Schild stand: "Parken verboten, 8 bis 18 Uhr."
Die Datei liegt unter C:\Daten\Notizen\liste.txt auf ihrem Laptop.
Mit #übung kannst du deinen Fortschritt teilen.
Auf alle Bücher & Zeitschriften gibt es 25 % Rabatt.
Ganz oben auf jeder unfertigen Seite steht [Entwurf].
Setze den Wert auf {x: 10, y: 20} und versuche es erneut.
Im Ordner ~/texte/notizen liegen alle meine Entwürfe.
Wenn a < b und b < c ist, dann ist auch a < c.
Das Zeichen | nennt man auch senkrechten Strich.
Der Preis beträgt 1.234,56 € inklusive Mehrwertsteuer.
Nach § 3 Abs. 2 gilt die Regel für alle Mitglieder.
Der Kurs kostet 49 € pro Monat bzw. 490 € im Jahr.
Auch der längste Weg beginnt mit dem ersten Schritt.`.split('\n'),

  /* Kontextvorlagen für Satz- und Sonderzeichen. */
  tpl: {
    ',': [T => `${T.w()}, ${T.w()} ${T.w()}`, T => `${T.w()}, ${T.w()}, ${T.w()} und ${T.w()}`, T => `ja, ${T.w()}`],
    '.': [T => `${T.W()} ${T.w()} ${T.w()}.`, T => `${T.W()} ${T.w()}.`, () => 'z. B.', () => 'usw.'],
    '-': [T => `${T.W()}-${T.W()}`, () => 'E-Mail', () => 'U-Bahn', T => `${T.n()}-${T.n()}`],
    ':': [T => `${T.W()}: ${T.w()}, ${T.w()}`, T => `${T.h()}:${T.m()} Uhr`, T => `Hinweis: ${T.w()}`],
    ';': [T => `${T.w()} ${T.w()}; ${T.w()} ${T.w()}`],
    '?': [T => `${cap(T.q())} ${T.w()} ${T.w()}?`, T => `${T.W()} ${T.w()}?`, T => `${T.q()}?`],
    '!': [T => `${T.W()}!`, T => `${T.W()} ${T.w()}!`, () => 'Halt!', () => 'Los!'],
    '"': [T => `"${T.w()}"`, T => `"${T.W()} ${T.w()}", sagte sie.`, T => `das "${T.w()}"`],
    "'": [T => T.c(), T => `${T.c()} ${T.w()}`],
    '#': [T => `#${T.w()}`, T => `Nr. #${T.n()}`, T => `#${T.n()}`],
    '+': [T => `${T.n()} + ${T.n()}`, () => 'C++', T => `${T.w()}+${T.w()}`],
    '*': [T => `${T.n()} * ${T.n()}`, T => `*${T.w()}*`, T => `${T.W()}*`],
    '§': [T => `§ ${T.n()}`, T => `§§ ${T.n()}-${T.n()}`, T => `nach § ${T.n()}`],
    '$': [T => `${T.n()} $`, T => `$${T.n()}`],
    '%': [T => `${T.n()} %`, T => `${T.n()},${T.d()} %`, () => '100 %'],
    '&': [T => `${T.W()} & ${T.W()}`, () => 'B&B', T => `${T.w()} & ${T.w()}`],
    '/': [() => 'und/oder', () => 'km/h', T => `${T.n()}/${T.n()}`, T => `${T.w()}/${T.w()}`],
    '(': [T => `(${T.w()})`, T => `(siehe Seite ${T.n()})`, T => `(${T.n()})`],
    ')': [T => `(${T.w()} ${T.w()})`, T => `(${T.n()})`],
    '=': [T => `${T.w()} = ${T.n()}`, T => `${T.n()} + ${T.n()} = ${T.n()}`],
    '@': [T => `${T.w()}@${T.w()}.de`, T => `@${T.w()}`, T => `${T.w()}.${T.w()}@post.de`],
    '€': [T => `${T.n()} €`, T => `${T.n()},${T.d()}${T.d()} €`, T => `${T.n()} € pro ${T.W()}`],
    '<': [T => `${T.n()} < ${T.n()}`, T => `<${T.w()}>`],
    '>': [T => `${T.n()} > ${T.n()}`, T => `<${T.w()}>`, () => 'a -> b'],
    '|': [T => `${T.w()} | ${T.w()}`, () => 'a || b'],
    '{': [T => `{ ${T.w()} }`, T => `{${T.w()}: ${T.n()}}`],
    '}': [T => `{ ${T.w()} }`, T => `{${T.w()}: ${T.n()}}`],
    '[': [T => `[${T.w()}]`, T => `${T.w()}[${T.d()}]`],
    ']': [T => `[${T.W()}]`, T => `[${T.n()}, ${T.n()}]`],
    '\\': [T => `C:\\${T.W()}\\${T.w()}`, T => `${T.w()}\\${T.w()}`],
    '~': [T => `~${T.n()} km`, T => `~/${T.w()}`]
  }
};

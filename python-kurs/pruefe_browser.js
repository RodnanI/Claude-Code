/* Oeffnet die gebaute Datei in einem echten Browser und prueft die Oberflaeche. */
const { chromium } = require("/tmp/node_modules/playwright");
const path = require("path");
const fs = require("fs");

const DATEI = "file://" + path.join(__dirname, "dist", "python-kurs.html");
const BILDER = path.join(__dirname, "bilder");

const fehler = [];
const meldungen = [];

function pruefe(bedingung, text) {
  if (bedingung) console.log("  ok   " + text);
  else { console.log("  FEHL " + text); fehler.push(text); }
}

(async () => {
  fs.mkdirSync(BILDER, { recursive: true });
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const kontext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const seite = await kontext.newPage();

  seite.on("console", (m) => {
    if (m.type() === "error" && !/pyodide|cdn\.jsdelivr|net::ERR|Failed to load/i.test(m.text())) {
      meldungen.push("Konsole: " + m.text());
    }
  });
  seite.on("pageerror", (e) => meldungen.push("Seitenfehler: " + e.message));

  console.log("\n1. Startseite");
  await seite.goto(DATEI, { waitUntil: "load" });
  await seite.waitForTimeout(400);
  pruefe(await seite.locator("h1").first().isVisible(), "Ueberschrift sichtbar");
  pruefe((await seite.title()).includes("Python"), "Seitentitel gesetzt");
  pruefe(await seite.locator(".modul-karte").count() >= 8, "Alle Module auf der Startseite");
  pruefe(await seite.locator(".kennzahl").count() === 5, "Kennzahlen vorhanden");
  const kennzahlen = await seite.locator(".kennzahl .zahl").allTextContents();
  pruefe(kennzahlen.includes("44"), "44 Lektionen ausgewiesen, gefunden: " + kennzahlen.join(", "));

  console.log("\n1b. Bemassung der Sinnbilder");
  const zuGross = await seite.locator(".huelle svg").evaluateAll((liste) =>
    liste.filter((s) => s.getBoundingClientRect().width > 48)
         .map((s) => (s.querySelector("use") || {}).getAttribute
              ? s.querySelector("use").getAttribute("href") : "?"));
  pruefe(zuGross.length === 0, "Kein Sinnbild ist uebergross" + (zuGross.length ? ": " + zuGross.join(", ") : ""));
  const navBreite = await seite.locator(".nav-schnell .lek-link").first()
    .evaluate((e) => e.getBoundingClientRect().height);
  pruefe(navBreite < 48, `Schnelllinks sind einzeilig: ${Math.round(navBreite)}px hoch`);

  const unterstrichen = await seite.locator(".seiten-nav a, .modul-karte, .taste").evaluateAll((liste) =>
    liste.filter((a) => getComputedStyle(a).textDecorationLine.includes("underline")).length);
  pruefe(unterstrichen === 0, `Navigation und Karten ohne Unterstreichung, gefunden: ${unterstrichen}`);

  console.log("\n2. Seitennavigation");
  pruefe(await seite.locator(".modul-block").count() === 8, "Acht Module im Baum");
  await seite.locator(".modul-kopf").first().click();
  await seite.waitForTimeout(350);
  pruefe(await seite.locator(".modul-block.offen .lek-link").first().isVisible(), "Modul klappt auf");

  console.log("\n3. Lektion oeffnen");
  await seite.goto(DATEI + "#/lektion/l-variablen", { waitUntil: "load" });
  await seite.waitForTimeout(400);
  pruefe((await seite.locator("h1").first().textContent()).includes("Variablen"), "Lektionstitel stimmt");
  pruefe(await seite.locator(".ziel-karte li").count() >= 3, "Lernziele werden angezeigt");
  pruefe(await seite.locator(".code-karte").count() >= 4, "Codebloecke vorhanden");
  pruefe(await seite.locator(".s-schl").count() > 0, "Syntaxfarben angewendet");
  pruefe(await seite.locator(".tab-huelle table").count() >= 1, "Tabelle gerendert");
  pruefe(await seite.locator(".aufgabe").count() >= 1, "Aufgaben vorhanden");
  pruefe(await seite.locator(".frage").count() >= 4, "Quizfragen vorhanden");
  pruefe(await seite.locator(".editor-karte textarea").count() >= 1, "Editor vorhanden");

  console.log("\n4. Quiz beantworten");
  const ersteFrage = seite.locator(".frage").first();
  await ersteFrage.locator(".opt").nth(1).click();
  await seite.waitForTimeout(250);
  pruefe(await ersteFrage.locator(".erklaerung").isVisible(), "Erklaerung erscheint nach der Antwort");
  pruefe(await ersteFrage.locator(".opt.ist-richtig").count() === 1, "Richtige Antwort markiert");
  const stand = await seite.locator(".quiz-stand").first().textContent();
  pruefe(/\d+\s*von\s*\d+/.test(stand), "Punktestand wird gefuehrt: " + stand.trim());

  console.log("\n5. Editor bedienen");
  const feld = seite.locator(".aufgabe textarea").first();
  await feld.click();
  await feld.press("Control+a");
  await feld.type("def test():\n    return 42");
  await seite.waitForTimeout(200);
  const inhalt = await feld.inputValue();
  pruefe(inhalt.includes("return 42"), "Eingabe kommt an");
  pruefe(inhalt.split("\n")[1].startsWith("    "), "Automatische Einrueckung nach dem Doppelpunkt");
  const nummern = await seite.locator(".aufgabe .zeilen-nr").first().evaluate((e) => ({
    text: e.textContent.trim(), hoehe: e.getBoundingClientRect().height }));
  const zeilenzahl = nummern.text.split("\n").length;
  pruefe(zeilenzahl >= 2, `Zeilennummern gesetzt: ${zeilenzahl} Zeilen`);
  pruefe(nummern.hoehe > zeilenzahl * 14,
    `Zeilennummern stehen untereinander: ${Math.round(nummern.hoehe)}px fuer ${zeilenzahl} Zeilen`);

  console.log("\n6. Suche");
  await seite.locator("#sucheFeld").fill("dictionary");
  await seite.waitForTimeout(350);
  const treffer = await seite.locator(".treffer").count();
  pruefe(treffer > 0, `Suche liefert ${treffer} Treffer`);
  pruefe(await seite.locator(".treffer mark").count() > 0, "Suchbegriff hervorgehoben");
  await seite.locator(".treffer").first().click();
  await seite.waitForTimeout(400);
  pruefe(seite.url().includes("#/lektion/"), "Treffer fuehrt zur Lektion");

  console.log("\n7. Weitere Seiten");
  for (const [weg, erwartet] of [
    ["#/modul/m3", "Datenstrukturen"],
    ["#/spickzettel", "Spickzettel"],
    ["#/glossar", "Glossar"],
    ["#/spielplatz", "Uebungsplatz"],
    ["#/pruefung/m1", "Pruefung"],
    ["#/abschluss", "Abschlusspruefung"],
    ["#/gibt-es-nicht", "nicht gefunden"],
  ]) {
    await seite.goto(DATEI + weg, { waitUntil: "load" });
    await seite.waitForTimeout(300);
    const h1 = await seite.locator("h1").first().textContent();
    pruefe(h1.toLowerCase().includes(erwartet.toLowerCase()), `${weg} zeigt "${h1.trim()}"`);
  }

  console.log("\n8. Pruefung ziehen");
  await seite.goto(DATEI + "#/abschluss", { waitUntil: "load" });
  await seite.waitForTimeout(400);
  const pruefungsFragen = await seite.locator(".frage").count();
  pruefe(pruefungsFragen === 30, `Abschlusspruefung zieht 30 Fragen, gefunden: ${pruefungsFragen}`);

  console.log("\n9. Fortschritt");
  await seite.goto(DATEI + "#/lektion/l-einstieg", { waitUntil: "load" });
  await seite.waitForTimeout(300);
  for (let i = 0; i < await seite.locator(".frage").count(); i++) {
    const frage = seite.locator(".frage").nth(i);
    const richtige = await frage.locator(".opt").count();
    for (let j = 0; j < richtige; j++) {
      await frage.locator(".opt").nth(j).click();
      if (await frage.locator(".opt.ist-richtig.gedimmt").count() === 0) break;
    }
  }
  await seite.waitForTimeout(400);
  const balken = await seite.locator("#kopfBalken").evaluate((e) => e.style.width);
  pruefe(balken !== "" && balken !== "0%", "Fortschrittsbalken bewegt sich: " + balken);

  console.log("\n10. Farbschema");
  await seite.goto(DATEI, { waitUntil: "load" });
  await seite.waitForTimeout(300);
  const hellFarbe = await seite.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await seite.locator("#themaSchalter").click();
  await seite.waitForTimeout(300);
  await seite.locator("#themaSchalter").click();
  await seite.waitForTimeout(400);
  const dunkelFarbe = await seite.evaluate(() => getComputedStyle(document.body).backgroundColor);
  pruefe(hellFarbe !== dunkelFarbe, `Umschalten aendert die Farbe: ${hellFarbe} -> ${dunkelFarbe}`);
  const thema = await seite.evaluate(() => document.documentElement.dataset.thema);
  pruefe(thema === "dunkel", "Dunkelmodus aktiv, Zustand: " + thema);
  await seite.screenshot({ path: path.join(BILDER, "start-dunkel.png"), fullPage: false });

  await seite.locator("#themaSchalter").click();
  await seite.waitForTimeout(3000);
  await seite.screenshot({ path: path.join(BILDER, "start-hell.png"), fullPage: false });
  await seite.goto(DATEI + "#/lektion/l-listen", { waitUntil: "load" });
  await seite.waitForTimeout(500);
  await seite.screenshot({ path: path.join(BILDER, "lektion-hell.png"), fullPage: false });

  console.log("\n11. Systemvorgabe dunkel");
  const dunkelKontext = await browser.newContext({ colorScheme: "dark", viewport: { width: 1280, height: 900 } });
  const dunkelSeite = await dunkelKontext.newPage();
  await dunkelSeite.goto(DATEI, { waitUntil: "load" });
  await dunkelSeite.waitForTimeout(400);
  const autoFarbe = await dunkelSeite.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const zahlen = autoFarbe.match(/\d+/g).map(Number);
  pruefe(zahlen[0] < 60 && zahlen[1] < 60, "Folgt automatisch dem dunklen Systemschema: " + autoFarbe);
  await dunkelSeite.goto(DATEI + "#/lektion/l-listen", { waitUntil: "load" });
  await dunkelSeite.waitForTimeout(500);
  await dunkelSeite.screenshot({ path: path.join(BILDER, "lektion-dunkel.png"), fullPage: false });
  await dunkelKontext.close();

  console.log("\n12. Mobil");
  const mobil = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mSeite = await mobil.newPage();
  await mSeite.goto(DATEI, { waitUntil: "load" });
  await mSeite.waitForTimeout(400);

  const breite = await mSeite.evaluate(() =>
    ({ doc: document.documentElement.scrollWidth, fenster: window.innerWidth }));
  pruefe(breite.doc <= breite.fenster + 1, `Kein waagerechtes Scrollen: ${breite.doc} zu ${breite.fenster}`);
  pruefe(await mSeite.locator("#navSchalter").isVisible(), "Menueknopf sichtbar");
  pruefe(!(await mSeite.locator(".seiten-nav").isVisible()), "Navigation zunaechst verborgen");

  await mSeite.locator("#navSchalter").click();
  await mSeite.waitForTimeout(450);
  pruefe(await mSeite.locator(".seiten-nav").isVisible(), "Navigation oeffnet sich");
  pruefe(await mSeite.locator("#navSchleier").isVisible(), "Hintergrund abgedunkelt");
  await mSeite.screenshot({ path: path.join(BILDER, "mobil-navigation.png") });

  await mSeite.mouse.click(375, 700);
  await mSeite.waitForTimeout(450);
  pruefe(!(await mSeite.locator(".seiten-nav").isVisible()), "Navigation schliesst wieder");

  await mSeite.goto(DATEI + "#/lektion/l-zahlen", { waitUntil: "load" });
  await mSeite.waitForTimeout(500);
  const mobilBreite = await mSeite.evaluate(() => document.documentElement.scrollWidth);
  pruefe(mobilBreite <= 391, `Lektion ohne waagerechtes Scrollen: ${mobilBreite}`);
  const tastenGross = await mSeite.locator(".taste, .ikontaste").evaluateAll((ks) =>
    ks.filter((k) => k.offsetParent !== null).every((k) => k.getBoundingClientRect().height >= 28));
  pruefe(tastenGross, "Bedienelemente gross genug zum Antippen");
  await mSeite.screenshot({ path: path.join(BILDER, "mobil-lektion.png") });
  await mobil.close();

  await browser.close();

  console.log("\n--------------------------------------------");
  if (meldungen.length) {
    console.log(`Meldungen aus dem Browser (${meldungen.length}):`);
    [...new Set(meldungen)].slice(0, 12).forEach((m) => console.log("  ~ " + m));
  }
  if (fehler.length) {
    console.log(`FEHLGESCHLAGEN: ${fehler.length}`);
    process.exit(1);
  }
  console.log("Alle Oberflaechenpruefungen bestanden.");
  console.log("Bilder in: " + path.relative(process.cwd(), BILDER));
})().catch((e) => { console.error("Abbruch:", e.message); process.exit(1); });

/* Prueft die Python-Ausfuehrung im Browser. Der Interpreter wird dabei aus
   einer oertlichen Ablage geliefert statt aus dem Netz. */
const { chromium } = require("/tmp/node_modules/playwright");
const path = require("path");
const fs = require("fs");

const DATEI = "file://" + path.join(__dirname, "dist", "python-kurs.html");
const PYODIDE = "/tmp/pyo/node_modules/pyodide";
const fehler = [];

function pruefe(bedingung, text) {
  if (bedingung) console.log("  ok   " + text);
  else { console.log("  FEHL " + text); fehler.push(text); }
}

const TYPEN = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm",
  ".json": "application/json", ".zip": "application/zip", ".whl": "application/zip",
  ".map": "application/json", ".ts": "text/plain",
};

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const kontext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });

  let geliefert = 0;
  let fehlend = [];
  await kontext.route("**/cdn.jsdelivr.net/**", async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split("/").pop();
    const pfad = path.join(PYODIDE, name);
    if (fs.existsSync(pfad)) {
      geliefert++;
      await route.fulfill({
        status: 200,
        contentType: TYPEN[path.extname(name)] || "application/octet-stream",
        body: fs.readFileSync(pfad),
      });
    } else {
      fehlend.push(name);
      await route.fulfill({ status: 404, body: "" });
    }
  });

  const seite = await kontext.newPage();
  const seitenfehler = [];
  seite.on("pageerror", (e) => seitenfehler.push(e.message));

  console.log("\n1. Interpreter laden und ein Beispiel ausfuehren");
  await seite.goto(DATEI + "#/lektion/l-ausgabe", { waitUntil: "load" });
  await seite.waitForTimeout(400);

  const ersteKarte = seite.locator(".code-karte").first();
  await ersteKarte.locator('[data-tat="laufen"]').click();
  await seite.waitForFunction(
    () => {
      const t = document.querySelector(".code-karte .ausgabe pre");
      return t && !t.querySelector(".laeuft") && t.textContent.trim().length > 0;
    },
    { timeout: 180000 }
  );
  const ausgabe = await ersteKarte.locator(".ausgabe pre").textContent();
  console.log("  Ausgabe:", JSON.stringify(ausgabe.slice(0, 70)));
  pruefe(ausgabe.includes("Alter: 21"), "Beispiel liefert die erwartete Ausgabe");
  pruefe(geliefert > 0, `Interpreter oertlich geliefert (${geliefert} Dateien)`);

  console.log("\n2. Eine Aufgabe wirklich pruefen");
  await seite.goto(DATEI + "#/lektion/l-zahlen", { waitUntil: "load" });
  await seite.waitForTimeout(400);
  const aufgabe = seite.locator(".aufgabe").first();
  const feld = aufgabe.locator("textarea");

  // Falsche Loesung
  await feld.click();
  await feld.press("Control+a");
  await feld.type("gesamt = 10000\nstunden = 0\nminuten = 0\nsekunden = 0\nprint(stunden, 'h', minuten, 'min', sekunden, 's')");
  await aufgabe.locator(".taste-voll").click();
  await seite.waitForFunction(
    () => { const t = document.querySelector(".aufgabe .test-block .zaehler"); return t && t.textContent.includes("/"); },
    { timeout: 90000 });
  const schlecht = await aufgabe.locator(".test-block .zaehler").textContent();
  console.log("  Falsche Loesung:", schlecht.trim());
  pruefe(!schlecht.startsWith("5 /"), "Falsche Loesung wird erkannt");
  pruefe(await aufgabe.locator(".test-zeile.nein").count() > 0, "Fehlgeschlagene Schritte werden benannt");
  const grund = await aufgabe.locator(".test-zeile.nein .t-grund").first().textContent().catch(() => "");
  console.log("  Begruendung:", grund.trim().slice(0, 60));
  pruefe(grund.length > 0, "Begruendung wird angezeigt");

  // Musterloesung
  const loesung = "gesamt = 10000\n\nstunden = gesamt // 3600\nminuten = (gesamt % 3600) // 60\nsekunden = gesamt % 60\n\nprint(stunden, 'h', minuten, 'min', sekunden, 's')";
  await feld.click();
  await feld.press("Control+a");
  await feld.press("Delete");
  await seite.evaluate((text) => {
    const t = document.querySelector(".aufgabe textarea");
    t.value = text;
    t.dispatchEvent(new Event("input", { bubbles: true }));
  }, loesung);
  await aufgabe.locator(".taste-voll").click();
  await seite.waitForFunction(
    () => {
      const k = document.querySelector(".aufgabe .test-kopf");
      return k && (k.textContent.includes("bestanden") || k.textContent.includes("Noch nicht"));
    }, { timeout: 90000 });
  const gut = await aufgabe.locator(".test-kopf").textContent();
  console.log("  Musterloesung:", gut.replace(/\s+/g, " ").trim());
  pruefe(gut.includes("Alle Pruefungen bestanden"), "Richtige Loesung wird angenommen");
  pruefe(await aufgabe.evaluate((e) => e.classList.contains("geloest")), "Aufgabe wird als geloest markiert");
  pruefe(await seite.locator(".melde").count() > 0, "Rueckmeldung erscheint");

  console.log("\n3. Fehlerbehandlung im Nutzercode");
  await seite.goto(DATEI + "#/spielplatz", { waitUntil: "load" });
  await seite.waitForTimeout(400);
  await seite.evaluate(() => {
    const t = document.querySelector(".editor-karte textarea");
    t.value = "zahl = 5\nprint(zahl + 'text')";
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await seite.locator(".editor-leiste .taste-voll").click();
  await seite.waitForFunction(
    () => { const p = document.querySelector(".ausgabe.hat-fehler pre"); return p && p.textContent.includes("Error"); },
    { timeout: 90000 });
  const fehlertext = await seite.locator(".ausgabe pre").first().textContent();
  console.log("  Fehlertext:", fehlertext.replace(/\s+/g, " ").slice(0, 90));
  pruefe(fehlertext.includes("TypeError"), "Fehlerart wird genannt");
  pruefe(fehlertext.includes("dein Code"), "Der Dateiname zeigt auf den eigenen Code");
  pruefe(!fehlertext.includes("_kurs_starte"), "Interne Zeilen sind ausgeblendet");

  console.log("\n4. Eingaben und Zeitgrenze");
  await seite.evaluate(() => {
    const t = document.querySelector(".editor-karte textarea");
    t.value = "while True:\n    pass";
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await seite.locator(".editor-leiste .taste-voll").click();
  await seite.waitForFunction(
    () => { const p = document.querySelector(".ausgabe pre"); return p && p.textContent.includes("Zeitlimit"); },
    { timeout: 90000 });
  const zeit = await seite.locator(".ausgabe pre").first().textContent();
  console.log("  Abbruch:", zeit.replace(/\s+/g, " ").slice(0, 90));
  pruefe(zeit.includes("Zeitlimit"), "Endlosschleife wird abgebrochen");
  pruefe(await seite.locator(".editor-leiste .taste-voll").isEnabled(), "Seite bleibt danach bedienbar");

  console.log("\n5. Eingelesene Werte");
  await seite.goto(DATEI + "#/lektion/l-eingabe", { waitUntil: "load" });
  await seite.waitForTimeout(400);
  const eingabeKarte = seite.locator(".code-karte[data-eingaben]").first();
  await eingabeKarte.locator('[data-tat="laufen"]').click();
  await seite.waitForFunction(
    () => {
      const t = document.querySelector(".code-karte[data-eingaben] .ausgabe pre");
      return t && !t.querySelector(".laeuft") && t.textContent.trim().length > 0;
    }, { timeout: 90000 });
  const eingabeAusgabe = await eingabeKarte.locator(".ausgabe pre").textContent();
  console.log("  Ausgabe:", JSON.stringify(eingabeAusgabe.replace(/\s+/g, " ").slice(0, 60)));
  pruefe(eingabeAusgabe.includes("Ada"), "Hinterlegte Eingabe wird verwendet");

  await browser.close();

  console.log("\n--------------------------------------------");
  if (fehlend.length) console.log("Nicht gefunden:", [...new Set(fehlend)].slice(0, 6).join(", "));
  if (seitenfehler.length) {
    console.log("Seitenfehler:");
    [...new Set(seitenfehler)].slice(0, 5).forEach((m) => console.log("  ~ " + m));
  }
  if (fehler.length) { console.log(`FEHLGESCHLAGEN: ${fehler.length}`); process.exit(1); }
  console.log("Die Python-Ausfuehrung arbeitet vollstaendig.");
})().catch((e) => { console.error("Abbruch:", e.message); process.exit(1); });

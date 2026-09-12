/* Schreibfeld fuer Python mit Zeilennummern, Einrueckhilfe und
   farbiger Darstellung. Der Text liegt in einem durchsichtigen Feld
   ueber der eingefaerbten Fassung. */
const Editor = (() => {
  const PAARE = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
  const ZU = new Set([")", "]", "}", '"', "'"]);

  function erstelle(einstellungen = {}) {
    const start = einstellungen.start != null ? einstellungen.start : "";
    const name = einstellungen.name || "loesung.py";

    const wurzel = W.el("div", { klasse: "editor-karte" });
    const feld = W.el("div", { klasse: "editor-feld" });
    const nummern = W.el("div", { klasse: "zeilen-nr", "aria-hidden": "true" });
    const innen = W.el("div", { klasse: "editor-innen" });
    const male = W.el("pre", { "aria-hidden": "true" });
    const male_code = W.el("code");
    male.append(male_code);
    const schreib = W.el("textarea", {
      spellcheck: "false", autocapitalize: "off", autocorrect: "off",
      autocomplete: "off", wrap: "off",
      "aria-label": einstellungen.beschriftung || "Python-Code schreiben",
      placeholder: einstellungen.platzhalter || "",
    });
    schreib.value = start;

    innen.append(male, schreib);
    feld.append(nummern, innen);
    wurzel.append(feld);

    function zeichne() {
      const text = schreib.value;
      male_code.innerHTML = Farbe.python(text) + "\n";
      const zeilen = text.split("\n").length;
      let n = "";
      for (let i = 1; i <= zeilen; i++) n += i + "\n";
      nummern.textContent = n;
      schreib.style.height = "auto";
      schreib.style.height = (schreib.scrollHeight + 2) + "px";
      male.scrollTop = schreib.scrollTop;
      male.scrollLeft = schreib.scrollLeft;
    }

    function ersetze(vorher, text, nachher) {
      schreib.value = vorher + text + nachher;
    }

    function setzeCursor(pos, bis) {
      schreib.selectionStart = pos;
      schreib.selectionEnd = bis == null ? pos : bis;
    }

    function einrueckungVon(zeile) {
      const m = /^[ \t]*/.exec(zeile);
      return m ? m[0] : "";
    }

    schreib.addEventListener("input", zeichne);
    schreib.addEventListener("scroll", () => {
      male.scrollTop = schreib.scrollTop;
      male.scrollLeft = schreib.scrollLeft;
    });

    schreib.addEventListener("keydown", (e) => {
      const s = schreib.selectionStart;
      const t = schreib.selectionEnd;
      const wert = schreib.value;

      if (e.key === "Tab") {
        e.preventDefault();
        if (s !== t) {
          const anfang = wert.lastIndexOf("\n", s - 1) + 1;
          const teil = wert.slice(anfang, t);
          const zeilen = teil.split("\n");
          const neu = e.shiftKey
            ? zeilen.map((z) => z.replace(/^ {1,4}/, ""))
            : zeilen.map((z) => "    " + z);
          const text = neu.join("\n");
          ersetze(wert.slice(0, anfang), text, wert.slice(t));
          setzeCursor(anfang, anfang + text.length);
        } else if (e.shiftKey) {
          const anfang = wert.lastIndexOf("\n", s - 1) + 1;
          const zeile = wert.slice(anfang, s);
          const weg = /^ {1,4}/.exec(zeile);
          if (weg) {
            ersetze(wert.slice(0, anfang), zeile.slice(weg[0].length), wert.slice(s));
            setzeCursor(s - weg[0].length);
          }
        } else {
          ersetze(wert.slice(0, s), "    ", wert.slice(t));
          setzeCursor(s + 4);
        }
        zeichne();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const anfang = wert.lastIndexOf("\n", s - 1) + 1;
        const zeile = wert.slice(anfang, s);
        let ein = einrueckungVon(zeile);
        if (/:\s*(#.*)?$/.test(zeile.trimEnd())) ein += "    ";
        if (/^\s*(return|pass|break|continue|raise)\b/.test(zeile) && ein.length >= 4) {
          ein = ein.slice(0, ein.length - 4);
        }
        const text = "\n" + ein;
        ersetze(wert.slice(0, s), text, wert.slice(t));
        setzeCursor(s + text.length);
        zeichne();
        return;
      }

      if (e.key === "Backspace" && s === t) {
        const davor = wert.slice(Math.max(0, s - 4), s);
        if (davor === "    " && /^[ ]*$/.test(wert.slice(wert.lastIndexOf("\n", s - 1) + 1, s))) {
          e.preventDefault();
          ersetze(wert.slice(0, s - 4), "", wert.slice(s));
          setzeCursor(s - 4);
          zeichne();
          return;
        }
        const paar = PAARE[wert[s - 1]];
        if (paar && wert[s] === paar) {
          e.preventDefault();
          ersetze(wert.slice(0, s - 1), "", wert.slice(s + 1));
          setzeCursor(s - 1);
          zeichne();
          return;
        }
      }

      if (PAARE[e.key] && !e.ctrlKey && !e.metaKey) {
        const danach = wert[t] || "";
        if (s === t && (danach === "" || /[\s)\]},:.]/.test(danach))) {
          e.preventDefault();
          ersetze(wert.slice(0, s), e.key + PAARE[e.key], wert.slice(t));
          setzeCursor(s + 1);
          zeichne();
          return;
        }
        if (s !== t) {
          e.preventDefault();
          const mitte = wert.slice(s, t);
          ersetze(wert.slice(0, s), e.key + mitte + PAARE[e.key], wert.slice(t));
          setzeCursor(s + 1, t + 1);
          zeichne();
          return;
        }
      }

      if (ZU.has(e.key) && wert[s] === e.key && s === t) {
        e.preventDefault();
        setzeCursor(s + 1);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && einstellungen.beiStart) {
        e.preventDefault();
        einstellungen.beiStart();
      }
    });

    requestAnimationFrame(zeichne);
    zeichne();

    return {
      knoten: wurzel,
      name,
      wert: () => schreib.value,
      setze: (text) => { schreib.value = text; zeichne(); },
      fokus: () => schreib.focus(),
      zeichne,
      feld: schreib,
    };
  }

  return { erstelle };
})();

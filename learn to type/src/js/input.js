/* Keyboard input. Printable characters come from keydown (this covers Shift and AltGr).
   Dead keys and IME compositions are left to a hidden textarea and read from its input events,
   so layouts like US-International still work. Screens implement onKey(e) -> handled? and onChar(ch, e). */

const Input = {
  sink: null, dead: false, composing: false,

  init() {
    const s = this.sink = $('#sink');
    document.addEventListener('keydown', e => this.down(e), true);
    s.addEventListener('compositionstart', () => { this.composing = true; });
    s.addEventListener('compositionend', () => { this.composing = false; this.flush(); });
    s.addEventListener('input', e => { if (!this.composing && !e.isComposing) this.flush(); });
    const refocus = () => { if (document.activeElement !== s) s.focus({ preventScroll: true }); };
    document.addEventListener('mouseup', () => setTimeout(refocus, 0));
    window.addEventListener('focus', refocus);
    refocus();
  },

  down(e) {
    const s = this.sink, scr = App.screen;
    if (document.activeElement !== s) s.focus({ preventScroll: true });
    if (!scr) return;
    if (e.isComposing || e.keyCode === 229 || this.composing) return;
    if (e.key === 'Dead') { this.dead = true; return; }
    // Ctrl or Cmd shortcuts stay with the browser; AltGr (Ctrl+Alt on Windows) and Mac Option produce characters.
    const shortcut = (e.ctrlKey && !e.altKey) || e.metaKey;
    const printable = [...e.key].length === 1;
    if (!printable || shortcut) {
      if (e.key === 'Tab' || e.key === 'Backspace' || e.key === ' ') e.preventDefault();
      if (!shortcut && scr.onKey && scr.onKey(e)) e.preventDefault();
      return;
    }
    if (this.dead) { this.dead = false; return; }
    if (scr.onKey && scr.onKey(e)) { e.preventDefault(); return; }
    e.preventDefault();
    if (scr.onChar) scr.onChar(e.key, e);
  },

  flush() {
    const v = this.sink.value;
    this.sink.value = '';
    this.dead = false;
    if (!v || !App.screen || !App.screen.onChar) return;
    for (const ch of v) App.screen.onChar(ch, null);
  }
};

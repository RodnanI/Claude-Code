// ---------------------------------------------------------------------------
// Debug views, reachable with URL parameters. ?sheet=<costume>&page=n&zoom=z
// renders every animation of a costume as a contact sheet.
// ---------------------------------------------------------------------------
const Debug = {
  params: new URLSearchParams(location.search),
  sheet(ctx, id, page = 0, zoom = 1) {
    const C = COSTUME[id];
    const set = ANIMS[C.anims];
    const names = Object.keys(set);
    const cw = 60, ch = 66;
    const cols = Math.floor(VW / (cw * zoom)), rows = Math.floor(VH / (ch * zoom));
    const tmp = mkCanvas(cw, ch), tx = ctxOf(tmp);
    ctx.fillStyle = '#6d7a6c';
    ctx.fillRect(0, 0, VW, VH);
    for (let r = 0; r < rows; r++) {
      const name = names[page * rows + r];
      if (!name) break;
      const A = set[name];
      for (let c = 0; c < cols; c++) {
        const t = (A.total * c) / cols;
        const fr = frameFor(C, name, t);
        tx.clearRect(0, 0, cw, ch);
        tx.fillStyle = (r + c) % 2 ? '#7c8a7a' : '#738170';
        tx.fillRect(0, 0, cw, ch);
        tx.fillStyle = '#3a3f36';
        tx.fillRect(0, ch - 8, cw, 1);
        blitFrame(tx, fr, cw / 2, ch - 8, 1);
        ctx.drawImage(tmp, c * cw * zoom, r * ch * zoom, cw * zoom, ch * zoom);
      }
      Font.draw(ctx, name, 2, r * ch * zoom + 2, '#fff', { shadow: '#000' });
    }
  },
};

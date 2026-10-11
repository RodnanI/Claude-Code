"""Render sprite blocks from a JS art file to a zoomed PNG sheet.

Art blocks look like:
    // @pal hero
    const HERO_PAL = { k: '#1c120d', t: '#f4ead2' };
    // @art hero idle0
    `
    ..kk..
    `,
Usage: python3 tools/preview_art.py src/04_art_hero.js out.png [zoom] [filter]
"""
import re
import sys
from PIL import Image, ImageDraw

src = open(sys.argv[1], encoding="utf8").read()
out = sys.argv[2]
zoom = int(sys.argv[3]) if len(sys.argv) > 3 else 6
flt = sys.argv[4] if len(sys.argv) > 4 else None

pals = {}
for m in re.finditer(r"//\s*@pal\s+(\w+)\s*\n[^{]*\{([^}]*)\}", src):
    pals[m.group(1)] = {k: v for k, v in re.findall(r"['\"]?(\S)['\"]?\s*:\s*'(#[0-9a-fA-F]{6})'", m.group(2))}

arts = []
for m in re.finditer(r"//\s*@art\s+(\w+)\s+(\w+)[^\n]*\n[^`]*`([^`]*)`", src):
    pal, name, body = m.group(1), m.group(2), m.group(3)
    rows = [r.strip() for r in body.strip("\n").split("\n")]
    rows = [r for r in rows if r]
    if flt and flt not in name:
        continue
    arts.append((pal, name, rows))

if not arts:
    print("no art found")
    sys.exit(1)

cell_w = max(max(len(r) for r in rows) for _, _, rows in arts) * zoom + 12
cell_h = max(len(rows) for _, _, rows in arts) * zoom + 22
cols = max(1, min(len(arts), 1800 // cell_w))
nrows = (len(arts) + cols - 1) // cols
img = Image.new("RGB", (cols * cell_w, nrows * cell_h), (40, 34, 30))
d = ImageDraw.Draw(img)
for i, (pal, name, rows) in enumerate(arts):
    ox = (i % cols) * cell_w + 6
    oy = (i // cols) * cell_h + 16
    d.text((ox, oy - 13), name, fill=(230, 210, 170))
    w = max(len(r) for r in rows)
    for y in range(len(rows)):
        for x in range(w):
            c = (52, 46, 40) if (x + y) % 2 == 0 else (60, 53, 46)
            d.rectangle([ox + x * zoom, oy + y * zoom, ox + x * zoom + zoom - 1, oy + y * zoom + zoom - 1], fill=c)
    p = pals.get(pal, {})
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in ". ":
                continue
            col = p.get(ch)
            if not col:
                col = "#ff00ff"
            rgb = tuple(int(col[j:j + 2], 16) for j in (1, 3, 5))
            d.rectangle([ox + x * zoom, oy + y * zoom, ox + x * zoom + zoom - 1, oy + y * zoom + zoom - 1], fill=rgb)
img.save(out)
print(f"{len(arts)} sprites -> {out} ({img.size[0]}x{img.size[1]})")

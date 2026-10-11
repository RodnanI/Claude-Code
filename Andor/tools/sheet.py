"""Tile several screenshots into one contact sheet: sheet.py out.png scale img1 img2 ..."""
import sys
from PIL import Image
out, scale, files = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f) for f in files]
ims = [im.resize((int(im.width * scale), int(im.height * scale)), Image.NEAREST) for im in ims]
cols = 2 if len(ims) > 1 else 1
rows = (len(ims) + cols - 1) // cols
w, h = ims[0].size
sheet = Image.new('RGB', (w * cols + 4 * (cols - 1), h * rows + 4 * (rows - 1)), (255, 0, 255))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 4), (i // cols) * (h + 4)))
sheet.save(out)
print(sheet.size)

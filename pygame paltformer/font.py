"""Tiny 5x7 bitmap font so text stays crisp at the low internal resolution."""
import pygame

GW, GH = 5, 7
GLYPHS = {
    'A': "01110100011000111111100011000110001", 'B': "11110100011000111110100011000111110",
    'C': "01110100011000010000100001000101110", 'D': "11110100011000110001100011000111110",
    'E': "11111100001000011110100001000011111", 'F': "11111100001000011110100001000010000",
    'G': "01110100011000010111100011000101111", 'H': "10001100011000111111100011000110001",
    'I': "01110001000010000100001000010001110", 'J': "00111000100001000010000101001001100",
    'K': "10001100101010011000101001001010001", 'L': "10000100001000010000100001000011111",
    'M': "10001110111010110101100011000110001", 'N': "10001100011100110101100111000110001",
    'O': "01110100011000110001100011000101110", 'P': "11110100011000111110100001000010000",
    'Q': "01110100011000110001101011001001101", 'R': "11110100011000111110101001001010001",
    'S': "01111100001000001110000010000111110", 'T': "11111001000010000100001000010000100",
    'U': "10001100011000110001100011000101110", 'V': "10001100011000110001100010101000100",
    'W': "10001100011000110101101011010101010", 'X': "10001100010101000100010101000110001",
    'Y': "10001100010101000100001000010000100", 'Z': "11111000010001000100010001000011111",
    '0': "01110100011001110101110011000101110", '1': "00100011000010000100001000010001110",
    '2': "01110100010000100010001000100011111", '3': "11111000100010000010000011000101110",
    '4': "00010001100101010010111110001000010", '5': "11111100001111000001000011000101110",
    '6': "00110010001000011110100011000101110", '7': "11111000010001000100010000100001000",
    '8': "01110100011000101110100011000101110", '9': "01110100011000101111000010001001100",
    '.': "00000000000000000000000000110001100", ',': "00000000000000000000011000010001000",
    ':': "00000011000110000000011000110000000", '!': "00100001000010000100001000000000100",
    '?': "01110100010000100010001000000000100", '-': "00000000000000011111000000000000000",
    '+': "00000001000010011111001000010000000", '/': "00001000100001000100010000100010000",
    "'": "00100001000100000000000000000000000", '(': "00010001000100001000010000010000010",
    ')': "01000001000001000010000100010001000", '%': "11001110100001000100010000101110011",
    '>': "01000001000001000001000100010001000", '<': "00010001000100010000010000010000010",
    '*': "00000101010111011111011101010100000", '=': "00000000001111100000111110000000000",
    '_': "00000000000000000000000000000011111", '#': "01010111110101001010111110101000000",
    '"': "01010010100101000000000000000000000", '^': "00100010101000100000000000000000000",
}

_glyph_cache = {}
_text_cache = {}


def _glyph(ch, color):
    key = (ch, color)
    surf = _glyph_cache.get(key)
    if surf is None:
        surf = pygame.Surface((GW, GH), pygame.SRCALPHA)
        bits = GLYPHS.get(ch)
        if bits:
            for i, b in enumerate(bits):
                if b == '1':
                    surf.set_at((i % GW, i // GW), color)
        _glyph_cache[key] = surf
    return surf


def render(text, color, scale=1, spacing=1):
    key = (text, color, scale, spacing)
    surf = _text_cache.get(key)
    if surf is not None:
        return surf
    lines = text.upper().split('\n')
    adv = GW + spacing
    w = max(1, max(len(l) for l in lines) * adv - spacing)
    h = len(lines) * (GH + 3) - 3
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    for li, line in enumerate(lines):
        off = (w - (len(line) * adv - spacing)) // 2
        for i, ch in enumerate(line):
            if ch != ' ':
                surf.blit(_glyph(ch, color), (off + i * adv, li * (GH + 3)))
    if scale != 1:
        surf = pygame.transform.scale(surf, (w * scale, h * scale))
    if len(_text_cache) > 600:
        _text_cache.clear()
    _text_cache[key] = surf
    return surf


def width(text, scale=1, spacing=1):
    longest = max(len(l) for l in text.split('\n'))
    return max(0, longest * (GW + spacing) - spacing) * scale


def draw(surf, text, x, y, color, scale=1, align='left', shadow=None, spacing=1):
    img = render(text, color, scale, spacing)
    if align == 'center':
        x -= img.get_width() // 2
    elif align == 'right':
        x -= img.get_width()
    x, y = int(x), int(y)
    if shadow is not None:
        surf.blit(render(text, shadow, scale, spacing), (x + scale, y + scale))
    surf.blit(img, (x, y))
    return img.get_width()


def draw_outlined(surf, text, x, y, color, outline, scale=1, align='left', spacing=1):
    img = render(text, color, scale, spacing)
    ol = render(text, outline, scale, spacing)
    if align == 'center':
        x -= img.get_width() // 2
    elif align == 'right':
        x -= img.get_width()
    x, y = int(x), int(y)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (1, 1)):
        surf.blit(ol, (x + dx * scale, y + dy * scale))
    surf.blit(img, (x, y))

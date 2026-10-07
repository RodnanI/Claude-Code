"""Bundle SQUAWK into one self-contained HTML file: python3 build_standalone.py"""
import base64, re, pathlib
R = pathlib.Path(__file__).parent
html = (R / 'index.html').read_text(encoding='utf-8')

def b64(p, mime):
    return f"data:{mime};base64," + base64.b64encode((R / p).read_bytes()).decode()

css = (R / 'css/app.css').read_text(encoding='utf-8')
css = re.sub(r"url\(\.\./fonts/([^)]+)\)", lambda m: f"url({b64('fonts/' + m.group(1), 'font/woff2')})", css)
ml_css = (R / 'vendor/maplibre-gl.css').read_text(encoding='utf-8')

def script(path):
    src = (R / path).read_text(encoding='utf-8')
    if path == 'js/app.js':
        src = src.replace("['data/airports.js', 'data/types.js', 'data/operators.js'].map(loadScript)", "[]")
        src = re.sub(r"\n\s*if \('serviceWorker' in navigator.*?\n\s*\}\n", "\n", src, flags=re.S)
    return '<script>\n' + src.replace('</script', '<\\/script') + '\n</script>'

head_drop = [r'<link rel="manifest"[^>]*>\n', r'<link rel="apple-touch-icon"[^>]*>\n', r'<link rel="preload"[^>]*>\n']
for p in head_drop: html = re.sub(p, '', html)
html = html.replace('<link rel="icon" href="icons/icon.svg" type="image/svg+xml">', f'<link rel="icon" href="{b64("icons/icon.svg", "image/svg+xml")}" type="image/svg+xml">')
html = html.replace('<link rel="stylesheet" href="vendor/maplibre-gl.css">', '<style>\n' + ml_css + '\n</style>')
html = html.replace('<link rel="stylesheet" href="css/app.css">', '<style>\n' + css + '\n</style>')

srcs = re.findall(r'<script src="([^"]+)" defer></script>', html)
order = srcs[:]
i = order.index('data/ranges.js') + 1
order[i:i] = ['data/airports.js', 'data/types.js', 'data/operators.js']
bundle = '\n'.join(script(s) for s in order)
html = re.sub(r'(<script src="[^"]+" defer></script>\n?)+', lambda m: bundle + '\n', html, count=1)
assert '<script src=' not in html
out = R / 'squawk-standalone.html'
out.write_text(html, encoding='utf-8')
print(out.name, round(out.stat().st_size / 1e6, 2), 'MB')

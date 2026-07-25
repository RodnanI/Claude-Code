#!/usr/bin/env python3
"""
make_colab.py -- build themepark_colab.ipynb.

The notebook has to be a single file the operator can drop into Colab and run,
so the four sources are packed into it: a tar, gzipped, base64'd, and pasted
into one cell. Run this whenever the sources change.

    ./make_colab.py [themepark_colab.ipynb]
"""
import base64
import gzip
import hashlib
import io
import json
import os
import sys
import tarfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = ["pk_core.h", "pk_shade.h", "pk_main.c", "pk_audio.py", "README.md"]

# ------------------------------------------------------------------ payload


def pack():
    """tar -> gzip -> base64 of the sources, deterministic across runs."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tf:
        for name in SOURCES:
            data = open(os.path.join(HERE, name), "rb").read()
            ti = tarfile.TarInfo(name)
            ti.size = len(data)
            ti.mtime = 0
            ti.mode = 0o644
            ti.uid = ti.gid = 0
            ti.uname = ti.gname = ""
            tf.addfile(ti, io.BytesIO(data))
    raw = buf.getvalue()
    gz = gzip.compress(raw, 9, mtime=0)
    return base64.b64encode(gz).decode(), hashlib.sha256(raw).hexdigest()


def wrap(b64, width=96):
    return "\n".join(b64[i:i + width] for i in range(0, len(b64), width))


# -------------------------------------------------------------------- cells

def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(True)}


def code(text):
    return {"cell_type": "code", "execution_count": None, "metadata": {},
            "outputs": [], "source": text.strip("\n").splitlines(True)}


C_INTRO = """
# Backrooms theme park — VHS found footage

Renders the five minute tape from scratch (no assets: every frame is raymarched
from signed distance fields, every sound is synthesised) and uploads the
finished `.mp4` to a Devved Drive.

**Runtime → Run all**, and answer the one prompt for the Drive token.

Everything the render needs is packed into this notebook, so there is nothing
else to upload.

### What to expect

| | |
|---|---|
| output | 640x480, 24 fps, 5:00, H.264 + AAC |
| render time | ~1–3 h on a free Colab CPU runtime (~7200 frames, four threads) |
| file size | ~400 MB at the default CRF 18 |
| GPU | not used — the renderer is CPU/OpenMP, so a GPU runtime buys nothing |

The render is done in chunks and every finished chunk is kept, so if a cell is
interrupted just run it again and it picks up where it stopped. Chunks only
survive as long as the runtime does; set `USE_GDRIVE = True` in **2 · Settings**
to keep the workspace on your Google Drive and survive a full disconnect.

### The Drive token

The token is *not* stored in this notebook. Cell **2 · Settings** looks for it
in this order:

1. the Colab secret `DEVVED_DRIVE_TOKEN` (key icon in the left sidebar, then
   toggle *Notebook access*) — best, survives restarts and never appears in the
   notebook,
2. the environment variable `DEVVED_DRIVE_TOKEN`,
3. a hidden prompt.
"""

C_SETUP = """
#@title 1 · Setup — dependencies and toolchain
import os, subprocess, sys, shutil, multiprocessing

def sh(cmd, **kw):
    return subprocess.run(cmd, shell=isinstance(cmd, str), check=True,
                          text=True, capture_output=True, **kw).stdout.strip()

print("installing python packages ...")
subprocess.run([sys.executable, "-m", "pip", "install", "-q",
                "numpy", "scipy", "imageio-ffmpeg", "requests"], check=True)

import imageio_ffmpeg
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

if shutil.which("gcc") is None:
    print("installing gcc ...")
    subprocess.run("apt-get -qq update && apt-get -qq install -y gcc",
                   shell=True, check=True)

NCPU = multiprocessing.cpu_count()
print()
print("gcc     ", sh("gcc --version").splitlines()[0])
print("ffmpeg  ", FFMPEG)
print("cpus    ", NCPU)
print("python  ", sys.version.split()[0])
"""

C_SETTINGS = """
#@title 2 · Settings — where it renders, where it lands

OUTPUT_NAME   = "themepark_vhs.mp4"  #@param {type:"string"}
#@markdown Keep the workspace on Google Drive so a disconnect does not lose
#@markdown finished chunks (asks for permission to mount):
USE_GDRIVE    = False  #@param {type:"boolean"}
#@markdown Folder inside your Devved Drive scope the tape is uploaded to:
DRIVE_PATH    = "Claude/themepark"  #@param {type:"string"}
#@markdown Quality. 18 is the intended master (~400 MB); 22 is ~half that.
CRF           = 18  #@param {type:"slider", min:14, max:30, step:1}
X264_PRESET   = "medium"  #@param ["veryfast", "faster", "fast", "medium", "slow"]
#@markdown Seconds of tape per render chunk. Smaller chunks lose less work when
#@markdown a run is interrupted; 25 puts every chunk boundary away from the
#@markdown shots where the monitor is feeding back on itself.
CHUNK_SECONDS = 25  #@param {type:"slider", min:5, max:300, step:5}
#@markdown Frames burned before each continuation chunk to recharge the
#@markdown feedback loop. Lower is faster, higher matches a single pass more
#@markdown closely.
CHUNK_WARMUP  = 32  #@param {type:"slider", min:0, max:64, step:8}

DRIVE_BASE = "https://drive.devved.app/api/agent/drive/v1"

# ---- workspace ----------------------------------------------------------
if USE_GDRIVE:
    from google.colab import drive as _gdrive
    _gdrive.mount("/content/drive")
    WORKDIR = "/content/drive/MyDrive/themepark_render"
else:
    WORKDIR = "/content/themepark"
os.makedirs(WORKDIR, exist_ok=True)
os.chdir(WORKDIR)
print("workspace:", WORKDIR)

# ---- the token, from the least leaky source that has it ------------------
TOKEN = os.environ.get("DEVVED_DRIVE_TOKEN", "").strip()
_src = "environment"
if not TOKEN:
    try:
        from google.colab import userdata
        TOKEN = (userdata.get("DEVVED_DRIVE_TOKEN") or "").strip()
        _src = "colab secret"
    except Exception:
        TOKEN = ""
if not TOKEN:
    from getpass import getpass
    TOKEN = getpass("Devved Drive token (input hidden): ").strip()
    _src = "prompt"
os.environ["DEVVED_DRIVE_TOKEN"] = TOKEN

import requests
AUTH = {"Authorization": "Bearer " + TOKEN}

try:
    r = requests.get(DRIVE_BASE + "/whoami", headers=AUTH, timeout=30)
    if r.status_code == 200:
        print("token   ", "ok, from " + _src)
        for k, v in r.json().items():
            print("  %-10s %s" % (k, v))
    else:
        print("token    REJECTED: HTTP %d %s" % (r.status_code, r.text[:200]))
except requests.RequestException as e:
    print("token    UNVERIFIED: cannot reach the Drive right now (%s)" % e.__class__.__name__)

# A bad token is not worth losing the render over: it is only needed at the end,
# and cell 2 can be re-run with a good one while the segments stay put.
print("\\nnote: the render does not need the Drive. Fix the token before cell 8 if"
      " the line above is not 'ok'.")
"""

C_UNPACK = """
#@title 3 · Unpack the renderer
import base64, gzip, io, tarfile, hashlib

raw = gzip.decompress(base64.b64decode(SOURCES_B64))
print("payload sha256", hashlib.sha256(raw).hexdigest())
assert hashlib.sha256(raw).hexdigest() == SOURCES_SHA256, "payload is corrupt"
tarfile.open(fileobj=io.BytesIO(raw)).extractall(WORKDIR)

for f in sorted(os.listdir(WORKDIR)):
    p = os.path.join(WORKDIR, f)
    if os.path.isfile(p):
        print("  %-14s %8d" % (f, os.path.getsize(p)))
"""

C_COMPILE = """
#@title 4 · Compile and audit the camera path
import time

t0 = time.time()
subprocess.run("gcc -O3 -ffast-math -fopenmp pk_main.c -o pk_render -lm",
               shell=True, check=True)
print("compiled in %.1fs" % (time.time() - t0))

# -dump walks all 7200 camera frames without rendering anything and prints the
# clearance to the nearest solid. Nothing should ever be inside the scenery.
dump = subprocess.run("./pk_render -dump -e /dev/null", shell=True,
                      text=True, capture_output=True).stdout
clips = [l for l in dump.splitlines() if "CLIP" in l]
print("camera path: %d frames checked, %d clipping" % (len(dump.splitlines()), len(clips)))
for l in clips[:5]:
    print("  " + l)
"""

C_RENDER = """
#@title 5 · Render the picture — the long one
import glob, re, threading, time

FPS, NFRAMES = 24, 7200
SEGDIR = "segments"
os.makedirs(SEGDIR, exist_ok=True)

chunk = int(CHUNK_SECONDS * FPS)
plan = [(i, s, min(chunk, NFRAMES - s))
        for i, s in enumerate(range(0, NFRAMES, chunk))]

def seg_paths(i):
    return ("%s/seg_%03d.mp4" % (SEGDIR, i), "%s/ev_%03d.txt" % (SEGDIR, i))

done = [i for i, _, _ in plan if all(os.path.exists(p) for p in seg_paths(i))]
print("%d chunks of %d frames; %d already rendered" % (len(plan), chunk, len(done)))

def render_chunk(idx, start, n):
    seg, ev = seg_paths(idx)
    tmp_seg, tmp_ev, log = seg + ".part", ev + ".part", "%s/r_%03d.log" % (SEGDIR, idx)
    warm = 64 if start == 0 else CHUNK_WARMUP

    with open(log, "wb") as lf:
        p1 = subprocess.Popen(
            ["./pk_render", "-o", str(start), "-r", "0", str(n),
             "-w", str(warm), "-e", tmp_ev],
            stdout=subprocess.PIPE, stderr=lf)
        p2 = subprocess.Popen(
            [FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", "640x480", "-r", "24", "-i", "-",
             "-c:v", "libx264", "-preset", X264_PRESET, "-crf", str(CRF),
             "-pix_fmt", "yuv420p",
             "-f", "mp4", tmp_seg,          # the .part name hides the extension
             "-loglevel", "error"],
            stdin=p1.stdout)
        p1.stdout.close()
        rc2 = p2.wait()
        rc1 = p1.wait()

    if rc1 or rc2 or not os.path.getsize(tmp_seg):
        raise RuntimeError("chunk %d failed (render rc=%s, ffmpeg rc=%s); see %s"
                           % (idx, rc1, rc2, log))
    os.replace(tmp_seg, seg)          # only a whole chunk gets the real name,
    os.replace(tmp_ev, ev)            # so a resume never trusts half a file

def tail_of(log):
    \"\"\"The renderer redraws one progress line with \\r; take whatever is on it.\"\"\"
    try:
        lines = [l for l in open(log, "rb").read().replace(b"\\r", b"\\n").split(b"\\n")
                 if l.strip()]
        return lines[-1].decode().strip()
    except Exception:
        return ""

t_start = time.time()
frames_pre = sum(n for i, s, n in plan if i in done)   # frames that cost nothing now
frames_done = frames_pre
for idx, start, n in plan:
    if idx in done:
        continue
    print("chunk %2d/%d  %5.1f-%5.1fs  rendering ..."
          % (idx + 1, len(plan), start / FPS, (start + n) / FPS), flush=True)

    err, log = [], "%s/r_%03d.log" % (SEGDIR, idx)
    def run():
        try:
            render_chunk(idx, start, n)
        except Exception as e:
            err.append(e)
    th = threading.Thread(target=run)
    th.start()
    cur = frames_done
    while th.is_alive():
        th.join(60)
        tail = tail_of(log)
        m = re.search(r"frame\\s+(\\d+)", tail)      # absent on the last line
        if m:
            cur = frames_done + int(m.group(1))
        el = time.time() - t_start
        rate = el / max(cur - frames_pre, 1)
        print("    %s   elapsed %5.1f min, tape eta ~%.0f min"
              % (tail, el / 60.0, (NFRAMES - cur) * rate / 60.0), flush=True)
    if err:
        raise err[0]
    frames_done += n

print("\\npicture done in %.1f min" % ((time.time() - t_start) / 60.0))
print("segments:", len(glob.glob(SEGDIR + "/seg_*.mp4")), "of", len(plan))
"""

C_ASSEMBLE = """
#@title 6 · Sound, and the mux
import glob, time

segs = sorted(glob.glob(SEGDIR + "/seg_*.mp4"))
assert len(segs) == len(plan), "missing chunks -- run the render cell again"

# ---- picture: the chunks are all the same encode, so this is a stream copy --
with open("concat.txt", "w") as f:
    for s in segs:
        f.write("file '%s'\\n" % os.path.abspath(s))
subprocess.run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", "concat.txt",
                "-c", "copy", "-movflags", "+faststart", "video.mp4",
                "-loglevel", "error"], check=True)

# ---- the footfall times the sound pass places steps on ----------------------
with open("events.txt", "w") as out:
    for ev in sorted(glob.glob(SEGDIR + "/ev_*.txt")):
        out.write(open(ev).read())
print("events:", sum(1 for _ in open("events.txt")), "lines")

print("synthesising 5:00 of sound (~2 min) ...", flush=True)
t0 = time.time()
subprocess.run([sys.executable, "pk_audio.py", "events.txt", "audio.wav"], check=True)
print("sound done in %.1f min" % ((time.time() - t0) / 60.0))

subprocess.run([FFMPEG, "-y", "-i", "video.mp4", "-i", "audio.wav",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ac", "2",
                "-shortest", "-movflags", "+faststart", OUTPUT_NAME,
                "-loglevel", "error"], check=True)

MASTER = os.path.abspath(OUTPUT_NAME)
info = subprocess.run([FFMPEG, "-hide_banner", "-i", MASTER],
                      text=True, capture_output=True).stderr
print()
print(MASTER, "%.1f MB" % (os.path.getsize(MASTER) / 1e6))
for line in info.splitlines():
    if "Duration" in line or "Stream" in line:
        print(" ", line.strip())
"""

C_PREVIEW = """
#@title 7 · Look at it — stills, and a short preview
from IPython.display import HTML, display
import base64

#@markdown A 640x480 five minute master is far too big to embed in a notebook,
#@markdown so the clip below is a small throwaway copy of one stretch of it.
PREVIEW_FROM    = 168  #@param {type:"slider", min:0, max:270, step:1}
PREVIEW_SECONDS = 30  #@param {type:"slider", min:5, max:60, step:5}

STILLS = [1, 15, 45, 100, 175, 190, 250, 295]
tiles = []
for s in STILLS:
    subprocess.run([FFMPEG, "-y", "-ss", str(s), "-i", MASTER, "-frames:v", "1",
                    "-q:v", "3", "still_%03d.jpg" % s, "-loglevel", "error"], check=True)
    b = base64.b64encode(open("still_%03d.jpg" % s, "rb").read()).decode()
    tiles.append("<figure style='margin:0'>"
                 "<img src='data:image/jpeg;base64,%s' style='width:100%%;display:block'>"
                 "<figcaption style='font:11px monospace;color:#888;padding-top:2px'>"
                 "%d:%02d</figcaption></figure>" % (b, s // 60, s % 60))
display(HTML("<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:6px;"
             "background:#111;padding:6px'>" + "".join(tiles) + "</div>"))

print("building a %ds preview from %d:%02d ..."
      % (PREVIEW_SECONDS, PREVIEW_FROM // 60, PREVIEW_FROM % 60), flush=True)
subprocess.run([FFMPEG, "-y", "-ss", str(PREVIEW_FROM), "-t", str(PREVIEW_SECONDS),
                "-i", MASTER, "-vf", "scale=320:240", "-c:v", "libx264",
                "-crf", "32", "-preset", "veryfast", "-c:a", "aac", "-b:a", "64k",
                "-movflags", "+faststart", "preview.mp4", "-loglevel", "error"], check=True)
b = base64.b64encode(open("preview.mp4", "rb").read()).decode()
print("preview %.1f MB" % (os.path.getsize("preview.mp4") / 1e6))
display(HTML("<video width=480 controls src='data:video/mp4;base64,%s'></video>" % b))
"""

C_UPLOAD = """
#@title 8 · Upload the tape to your Drive
import requests, time

#@markdown Replace a file of the same name instead of landing beside it as
#@markdown `name (2).mp4`:
REPLACE_EXISTING = False  #@param {type:"boolean"}

UPLOAD_PATH = os.environ.get("UPLOAD_PATH", MASTER)   # cell 9 repoints this

class Progress:
    \"\"\"A body requests will stream, that says how far it has got.

    requests needs __iter__ to treat this as a stream and __len__ to set
    Content-Length; without the length the upload goes out chunked.\"\"\"
    def __init__(self, path, chunk=1 << 20):
        self.path, self.chunk = path, chunk
        self.size = os.path.getsize(path)
    def __len__(self):
        return self.size
    def __iter__(self):
        sent, t0, last = 0, time.time(), 0.0
        with open(self.path, "rb") as f:
            while True:
                b = f.read(self.chunk)
                if not b:
                    break
                sent += len(b)
                now = time.time()
                if now - last > 2 or sent == self.size:
                    last = now
                    print("\\r  %6.1f/%6.1f MB  %4.1f%%  %5.1f MB/s" %
                          (sent / 1e6, self.size / 1e6, 100.0 * sent / self.size,
                           sent / 1e6 / max(now - t0, 1e-6)), end="", flush=True)
                yield b
        print()

name = os.path.basename(UPLOAD_PATH)
params = {"name": name, "path": DRIVE_PATH}
if REPLACE_EXISTING:
    params["conflict"] = "replace"

print("uploading %s (%.1f MB) to %s/" % (name, os.path.getsize(UPLOAD_PATH) / 1e6, DRIVE_PATH))

item, last_err = None, None
for attempt in range(5):
    if attempt:
        wait = 2 ** attempt
        print("  retrying in %ds (%s)" % (wait, last_err))
        time.sleep(wait)
    try:
        r = requests.post(DRIVE_BASE + "/files", params=params,
                          headers={**AUTH, "Content-Type": "video/mp4"},
                          data=Progress(UPLOAD_PATH), timeout=(30, 600))
    except requests.RequestException as e:
        last_err = "connection: %s" % str(e)[:120]
        continue
    if r.status_code in (200, 201):
        item = r.json()
        break
    if r.status_code == 413:
        print("\\nREJECTED: the file is over this Drive's size cap.")
        print("Run cell 9 to make a smaller copy, then run this cell again.")
        break
    if r.status_code in (429, 500, 502, 503, 504):
        last_err = "HTTP %d" % r.status_code
        continue
    print("\\nFAILED: HTTP %d %s" % (r.status_code, r.text[:300]))
    break

if item:
    fid = item.get("id") or item.get("file", {}).get("id")
    v = requests.get("%s/files/%s" % (DRIVE_BASE, fid), headers=AUTH, timeout=30)
    print("\\nuploaded.")
    print("  id     ", fid)
    print("  server ", v.json() if v.status_code == 200 else "verify HTTP %d" % v.status_code)
elif last_err:
    print("\\ngave up after 5 attempts:", last_err)
"""

C_SHRINK = """
#@title 9 · Only if the upload was rejected as too large
#@markdown Re-encodes the finished tape smaller and points cell 8 at the copy.
#@markdown Re-run cell 8 afterwards. The picture is grain-heavy by design, so
#@markdown expect it to soften.
TARGET_MB = 120  #@param {type:"slider", min:25, max:400, step:5}

kbps = int(TARGET_MB * 8000 / 300 - 128)
small = OUTPUT_NAME.replace(".mp4", "_small.mp4")
print("two-pass at %d kbps ..." % kbps, flush=True)
for p in (1, 2):
    subprocess.run([FFMPEG, "-y", "-i", MASTER, "-c:v", "libx264", "-preset", "slow",
                    "-b:v", "%dk" % kbps, "-pass", str(p), "-passlogfile", "pk2pass",
                    *(["-an", "-f", "mp4", "/dev/null"] if p == 1 else
                      ["-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", small]),
                    "-loglevel", "error"], check=True)

os.environ["UPLOAD_PATH"] = os.path.abspath(small)
print("%s  %.1f MB -> now run cell 8 again" % (small, os.path.getsize(small) / 1e6))
"""

C_NOTES = """
## Notes

**It stopped halfway.** Run cell 5 again. Finished chunks live in
`segments/` and are skipped; only the chunk that was in flight is redone. A
chunk is renamed into place only when it has fully rendered, so a resume never
picks up a truncated file.

**It stopped and the runtime died too.** Colab wipes `/content` when the VM
goes. Set `USE_GDRIVE = True` in cell 2 and the workspace — segments included —
lives on your Google Drive instead, so the next runtime carries on from
wherever it got to.

**It is slow.** The renderer is OpenMP across every core it can see and Colab's
free CPU runtime is a small one. A GPU runtime will not help: nothing here
touches the GPU. `X264_PRESET = "veryfast"` saves encode time but not render
time, which is where the hours are; `CHUNK_WARMUP = 0` saves a few percent at
the cost of a slightly different monitor feedback at each chunk boundary.

**A seam at a chunk boundary.** The monitor in the ticket booth screens the
previous finished frame, so its picture depends on the whole history of the
tape. A chunk that starts cold rebuilds that in `CHUNK_WARMUP` frames rather
than inheriting it. The default boundaries fall well away from the shots where
the monitor is on camera; if you want the guarantee anyway, set
`CHUNK_SECONDS = 300` for a single continuous pass and give up the resume.

**The upload 413'd.** The default CRF 18 master is around 400 MB. Cell 9
re-encodes it to fit, or drop the quality up front with `CRF = 22` in cell 2 and
render at about half the size.

**The token.** It never gets written into this notebook or into any file in the
workspace. Only cell 2 reads it, and only cells 2 and 8 send it — to
`drive.devved.app` and nowhere else. If it leaks anyway, revoke it in the Drive
and the notebook simply asks for the new one.
"""


def build():
    b64, sha = pack()
    payload = code(
        'SOURCES_SHA256 = "%s"\n'
        "SOURCES_B64 = \"\"\"\\\n%s\n\"\"\"\n" % (sha, wrap(b64)) + C_UNPACK
    )
    nb = {
        "nbformat": 4,
        "nbformat_minor": 0,
        "metadata": {
            "colab": {"provenance": [], "name": "themepark_colab.ipynb",
                      "toc_visible": True},
            "kernelspec": {"name": "python3", "display_name": "Python 3"},
            "language_info": {"name": "python"},
        },
        "cells": [
            md(C_INTRO),
            code(C_SETUP),
            code(C_SETTINGS),
            payload,
            code(C_COMPILE),
            code(C_RENDER),
            code(C_ASSEMBLE),
            code(C_PREVIEW),
            code(C_UPLOAD),
            code(C_SHRINK),
            md(C_NOTES),
        ],
    }
    return nb, sha, len(b64)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "themepark_colab.ipynb")
    nb, sha, n = build()
    with open(out, "w") as f:
        json.dump(nb, f, indent=1)
        f.write("\n")
    print("%s  %d cells, payload %d B (sha256 %s)"
          % (out, len(nb["cells"]), n, sha[:16]))

#!/usr/bin/env python3
"""
pk_audio.py -- sound for the tape.

Everything is synthesised: oscillators, noise and filters. Nothing is sampled.

The calliope is a real band organ, written out as notes and voiced as pipes
with three detuned ranks and a breath of steam on every attack. At 2:26 the
transport carrying it slurs down an octave and stops, and what is left is
twenty seconds of tape hiss with somebody breathing over it.

    python3 pk_audio.py events.txt audio.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR   = 44100
DUR  = 300.0
N    = int(SR * DUR)
rng  = np.random.default_rng(0x0FF3A17)

# the timeline, matching pk_main.c
T_BOOTH  =  20.0
T_WANDER = 144.0
T_FREEZE = 146.0
T_STOP   = 151.0
T_STARE  = 171.0
T_DIST   = 181.5
T_LUNGE  = 185.5
T_C1     = 208.0
T_C2     = 233.0
T_C3     = 253.0
T_CHASE  = 283.0
T_VOID   = 291.0
T_END    = 300.0

T_WARP0  = 145.35      # the calliope starts going over
T_WARP1  = 146.70      # an octave down
T_STOPPED= 147.35      # and stopped
T_SNAP   = 181.55      # the posture goes
T_IMPACT = 292.30      # it lands on the asphalt

t = np.arange(N, dtype=np.float32) / SR


# ----------------------------------------------------------------- utilities
def lp(x, f, order=4):
    return sosfilt(butter(order, min(f, SR*0.49), 'low', fs=SR, output='sos'), x).astype(np.float32)

def hp(x, f, order=4):
    return sosfilt(butter(order, max(f, 5.0), 'high', fs=SR, output='sos'), x).astype(np.float32)

def bp(x, f0, f1, order=4):
    f1 = min(f1, SR*0.49)
    f0 = max(f0, 5.0)
    if f0 >= f1:
        f0 = f1*0.5
    return sosfilt(butter(order, [f0, f1], 'band', fs=SR, output='sos'), x).astype(np.float32)

def noise(n=None):
    return rng.standard_normal(N if n is None else n).astype(np.float32)

def set_rms(x, target=1.0):
    r = float(np.sqrt((x.astype(np.float64)**2).mean()))
    return (x * (target/(r + 1e-12))).astype(np.float32)

def env(points, smooth=0.0):
    xs = np.array([p[0] for p in points], dtype=np.float64)
    ys = np.array([p[1] for p in points], dtype=np.float64)
    e = np.interp(t, xs, ys).astype(np.float32)
    if smooth > 0:
        k = int(SR*smooth) | 1
        e = np.convolve(e, np.ones(k, np.float32)/k, mode='same').astype(np.float32)
    return e

def place(dst, src, at):
    i = int(at*SR)
    if i < 0:
        src = src[-i:]; i = 0
    if i >= N or len(src) == 0:
        return
    n = min(len(src), N - i)
    dst[i:i+n] += src[:n]

def ir_reverb(seconds, predelay=0.0, damp=4000.0, density=1.0):
    n = int(seconds*SR)
    x = rng.standard_normal(n).astype(np.float32)
    x *= np.exp(-np.arange(n, dtype=np.float32)/(seconds*SR/5.5))
    sparse = (rng.random(n) < (0.02 + 0.98*np.linspace(0, 1, n)**0.4) * density)
    x *= sparse
    x = lp(x, damp)
    x[:int(SR*0.002)] = 0.0
    if predelay > 0:
        x = np.concatenate([np.zeros(int(predelay*SR), np.float32), x])
    return (x / (np.sqrt((x.astype(np.float64)**2).sum()) + 1e-9)).astype(np.float32)

def convolve_seg(x, ir, t0, t1, wet):
    i0, i1 = int(t0*SR), min(int(t1*SR) + len(ir), N)
    if i1 <= i0:
        return np.zeros(N, np.float32)
    seg = np.zeros(i1 - i0, np.float32)
    hi = min(int(t1*SR), N)
    seg[:hi - i0] = x[i0:hi]
    wet_sig = fftconvolve(seg, ir)[:len(seg)].astype(np.float32)
    out = np.zeros(N, np.float32)
    out[i0:i0+len(wet_sig)] += wet_sig[:N-i0] * wet
    return out

def midi_hz(m):
    return 440.0 * 2.0**((m - 69)/12.0)


def dbg(name, x, a, b):
    seg = x[int(a*SR):int(b*SR)]
    print(f'  layer {name:12s} {a:6.1f}-{b:6.1f}s  rms={seg.std():.4f}', file=sys.stderr)


mix = np.zeros(N, np.float32)


# ============================================================== the calliope
# A band organ: steam whistles, so the odd harmonics carry, every pipe has a
# breath of air in front of the note, and no two ranks are quite in tune.
BPM   = 96.0
BEAT  = 60.0/BPM
PHRASE_BEATS = 48                     # sixteen bars of three

PARTIALS = [(1, 1.00), (2, 0.34), (3, 0.52), (4, 0.16),
            (5, 0.30), (6, 0.09), (7, 0.17), (9, 0.08), (11, 0.05)]
RANKS    = (0.9965, 1.0, 1.0043)      # three pipes to a note, near enough

def pipe(f, dur, level, bright=1.0, seed=0):
    n = max(8, int(dur*SR))
    tt = np.arange(n, dtype=np.float32)/SR
    r = np.random.default_rng(0x51E0 + seed)
    # the tremulant, and a slow drift because the pressure is not steady
    vib = 1.0 + 0.0055*np.sin(2*np.pi*5.7*tt + r.random()*6.28) \
              + 0.0022*np.sin(2*np.pi*0.7*tt + r.random()*6.28)
    out = np.zeros(n, np.float32)
    for h, a in PARTIALS:
        if f*h > 9000.0:
            continue
        amp = a * (bright ** (0.5*(h-1)))
        for d in RANKS:
            ph = r.random()*6.28
            out += (amp/len(RANKS))*np.sin(2*np.pi*f*h*d*vib*tt + ph).astype(np.float32)
    # the chiff: air before it speaks
    ch = int(min(n, 0.035*SR))
    if ch > 8:
        air = bp(r.standard_normal(ch).astype(np.float32), max(f*1.4, 300), min(f*7.0, 11000))
        out[:ch] += air*np.exp(-np.linspace(0, 5, ch))*0.55*np.mean([a for _, a in PARTIALS])
    # and it never stops leaking
    out += bp(r.standard_normal(n).astype(np.float32), max(f*0.8, 120), min(f*4.5, 9000))*0.035
    e = np.ones(n, np.float32)
    at = int(0.028*SR); rl = int(min(n*0.4, 0.09*SR))
    e[:at] *= np.linspace(0, 1, at)**0.6
    if rl > 4:
        e[-rl:] *= np.linspace(1, 0, rl)**1.4
    e *= 1.0 - 0.05*np.sin(2*np.pi*3.1*tt)
    return (out*e*level).astype(np.float32)

# --- the tune. A waltz, in A minor, going nowhere. -------------------------
MEL = [                                   # (beat, beats, midi)
    (0, 2, 69), (2, 1, 72),
    (3, 2, 76), (5, 1, 74),
    (6, 2, 72), (8, 1, 69),
    (9, 3, 71),
    (12, 2, 69), (14, 1, 71),
    (15, 2, 72), (17, 1, 76),
    (18, 2, 74), (20, 1, 71),
    (21, 3, 69),
    (24, 2, 76), (26, 1, 77),
    (27, 2, 79), (29, 1, 77),
    (30, 2, 76), (32, 1, 74),
    (33, 3, 72),
    (36, 2, 74), (38, 1, 72),
    (39, 2, 71), (41, 1, 68),          # the leading note of a minor key
    (42, 2, 69), (44, 1, 71),
    (45, 3, 69),
]
AM, DM, E7, FF = (45, [57, 60, 64]), (50, [57, 62, 65]), (52, [56, 59, 64]), (53, [57, 60, 65])
BARS = [AM, AM, DM, DM, AM, AM, E7, AM, AM, DM, AM, AM, DM, E7, AM, AM]

def render_calliope():
    buf = np.zeros(N, np.float32)
    phrase = PHRASE_BEATS*BEAT
    # it has been going round since before the tape started
    start = -phrase
    rep = 0
    while start < DUR + phrase:
        for (b, d, m) in MEL:
            # the pitch of the whole machine wanders a few cents a lap
            det = 1.0 + (rng.random() - 0.5)*0.004
            s = pipe(midi_hz(m)*det, d*BEAT*0.94, 0.062, 1.0, seed=int(m + rep*17 + b))
            place(buf, s, start + b*BEAT)
        for bar in range(16):
            root, triad = BARS[bar]
            b0 = bar*3
            place(buf, pipe(midi_hz(root), BEAT*0.88, 0.070, 0.72,
                            seed=int(root + rep*31 + bar)), start + b0*BEAT)
            for k in (1, 2):
                for nn in triad:
                    place(buf, pipe(midi_hz(nn), BEAT*0.52, 0.026, 0.80,
                                    seed=int(nn + rep*7 + bar*3 + k)),
                          start + (b0+k)*BEAT + 0.012*k)
        start += phrase
        rep += 1
    return buf

cal = render_calliope()
# it is somewhere else in the park, always
cal = lp(cal, 3400, order=3)
_cal_ir = ir_reverb(2.4, 0.035, 2600)
cal += convolve_seg(cal, _cal_ir, 0.0, T_FREEZE + 6.0, 1.35)
cal += convolve_seg(cal, _cal_ir, 288.0, DUR, 1.35)
dbg('calliope', cal, 60.0, 90.0)

# --- the transport gives up: down an octave, then nothing ------------------
rate = np.ones(N, np.float32)
seg = (t >= T_WARP0) & (t < T_WARP1)
rate[seg] = 1.0 - 0.5*((t[seg] - T_WARP0)/(T_WARP1 - T_WARP0))**0.75
seg = (t >= T_WARP1) & (t < T_STOPPED)
rate[seg] = 0.5*(1.0 - ((t[seg] - T_WARP1)/(T_STOPPED - T_WARP1))**1.6)
rate[t >= T_STOPPED] = 0.0
idx = np.clip(np.cumsum(rate.astype(np.float64)), 0, N-1)
cal_w = np.interp(idx, np.arange(N), cal).astype(np.float32)

cal_env = env([(0.0, 0.62), (T_BOOTH, 0.66), (60.0, 0.72), (T_WANDER, 0.80),
               (T_WARP0, 0.86), (T_WARP1, 0.80), (T_STOPPED, 0.46),
               (T_STOPPED + 0.45, 0.0), (T_END, 0.0)], smooth=0.05)
mix += cal_w * cal_env
# The park starts again. It was always going to.
ret_env = env([(0.0, 0.0), (292.6, 0.0), (294.4, 0.10), (297.0, 0.40),
               (T_END, 0.62)], smooth=0.10)
mix += cal * ret_env
dbg('cal+ret', cal_w*cal_env + cal*ret_env, 60.0, 90.0)

# the note it stops on, hanging there an octave down
fn = int(4.2*SR); ft = np.arange(fn)/SR
frz = np.zeros(fn, np.float32)
for m, a in [(33, 1.0), (45, 0.55), (48, 0.40), (52, 0.30), (57, 0.22)]:
    f = midi_hz(m) * (1.0 - 0.012*ft/4.2)          # and still sagging
    ph = 2*np.pi*np.cumsum(f)/SR
    frz += a*np.sin(ph).astype(np.float32)
frz *= np.exp(-ft*0.62) * np.minimum(1, ft*90)
frz *= 1.0 + 0.20*np.sin(2*np.pi*4.3*ft)           # the wow is audible now
place(frz_buf := np.zeros(N, np.float32), (frz*0.048).astype(np.float32), T_WARP1 + 0.15)
frz_buf += convolve_seg(frz_buf, ir_reverb(3.4, 0.03, 2200), T_WARP1, T_STOPPED + 5.0, 1.20)
mix += frz_buf

# --- and later, it comes back the wrong way round -------------------------
# The same music, reversed and dragged down, arriving with the distortion.
rev_src = cal[int(100.0*SR):int(T_WARP0*SR)][::-1].copy()
rvn = len(rev_src)
ridx = np.clip((np.arange(rvn)*0.72), 0, rvn-1)        # a fifth or so down
rev = np.interp(ridx, np.arange(rvn), rev_src).astype(np.float32)
rev = np.tanh(rev*3.2)*0.5                            # violently
rev = bp(rev, 90, 5200)
backw = np.zeros(N, np.float32)
place(backw, rev, T_STARE + 0.2)
backw += convolve_seg(backw, ir_reverb(3.0, 0.02, 2400), T_STARE, T_LUNGE + 6.0, 0.95)
back_env = env([(T_STARE, 0.0), (T_STARE + 1.2, 0.16), (T_DIST - 1.0, 0.55),
                (T_DIST, 0.92), (T_LUNGE, 0.92), (T_LUNGE + 2.5, 0.30),
                (T_LUNGE + 7.0, 0.0), (T_END, 0.0)], smooth=0.08)
mix += backw * back_env * 0.42


# ======================================================== the neon, humming
# Not a fluorescent tube in an office: a hundred metres of cold cathode and a
# row of iron transformers, all of them buzzing at twice the mains and none of
# them agreeing. Every frequency is an integer so the bed loops cleanly.
buzz  = 0.50*np.sin(2*np.pi*120*t)
buzz += 0.40*np.sin(2*np.pi*240*t + 1.1)
buzz += 0.30*np.sin(2*np.pi*360*t + 2.3)
buzz += 0.20*np.sin(2*np.pi*480*t + 0.4)
buzz += 0.15*np.sin(2*np.pi*600*t + 1.7)
buzz += 0.10*np.sin(2*np.pi*840*t + 2.9)
buzz += 0.07*np.sin(2*np.pi*1080*t + 0.8)
# the transformer's own edge: a hard-clipped 60 Hz driving the iron
buzz += 0.28*np.tanh(6.0*np.sin(2*np.pi*60*t + 0.5))
# and the whine off the starters
buzz += 0.10*np.sin(2*np.pi*1560*t)*(0.5 + 0.5*np.sin(2*np.pi*4*t))
buzz *= (1.0 + 0.16*np.sin(2*np.pi*3*t) + 0.09*np.sin(2*np.pi*7*t))
# gas crackle in the tubes that are on their way out
crackle = bp(noise(), 2200, 8000)
gate = (np.sin(2*np.pi*120*t) > 0.55).astype(np.float32)
gate *= (lp(noise(), 2.5)*45.0).clip(0, 1)
buzz += 0.34*crackle*gate
buzz = set_rms(buzz.astype(np.float32))

buzz_env = env([
    (0.0, 0.030), (T_BOOTH, 0.032), (40.0, 0.036), (T_WANDER, 0.034),
    (T_FREEZE, 0.026), (T_STOP, 0.012), (T_STARE - 0.05, 0.0085),
    (T_STARE, 0.020), (T_DIST, 0.050), (T_LUNGE, 0.022),
    (T_C1, 0.026), (T_C1 + 0.4, 0.009), (T_C3, 0.009), (T_C3 + 0.5, 0.032),
    (T_CHASE - 1.0, 0.038), (T_CHASE, 0.0), (T_VOID, 0.0),
    (T_VOID + 1.8, 0.030), (T_END, 0.030),
], smooth=0.05)
mix += buzz * buzz_env

# park tone: air, and the pressure of somewhere with no edge to it
tone = lp(noise(), 210)*1.0 + lp(noise(), 48)*1.7
tone = set_rms(hp(tone, 30))
tone_env = env([
    (0.0, 0.014), (T_WANDER, 0.016), (T_FREEZE, 0.014), (T_STOP, 0.006),
    (T_STARE - 0.05, 0.0040), (T_STARE, 0.012), (T_DIST, 0.026),
    (T_LUNGE, 0.022), (T_CHASE, 0.022), (T_CHASE + 0.2, 0.0),
    (T_VOID, 0.0), (T_VOID + 1.5, 0.018), (T_END, 0.018),
], smooth=0.08)
mix += tone * tone_env

# the monitor in the counter: flyback, and the hiss of a tube with a tape on it
crt = 0.030*np.sin(2*np.pi*7875*t) + 0.013*np.sin(2*np.pi*15750*t)
crt += 0.020*bp(noise(), 2400, 9000)
crt = set_rms(crt.astype(np.float32), 0.030)
crt_prox = env([(0.0, 0.62), (5.4, 0.62), (7.2, 0.9), (13.0, 1.25), (17.6, 1.35),
                (19.0, 0.7), (21.5, 0.20), (26.0, 0.0), (288.0, 0.0),
                (T_IMPACT, 0.55), (295.0, 0.62), (T_END, 0.62)], smooth=0.12)
mix += crt * crt_prox


# ================================================== handling the camera itself
def rustle(dur, level, bright=2500):
    n = int(dur*SR)
    x = bp(rng.standard_normal(n).astype(np.float32), 300, bright)
    e = np.exp(-np.linspace(0, 6, n))*np.minimum(1, np.linspace(0, 12, n))
    return (x*e*level).astype(np.float32)

def thump(dur, f, level, click=0.0):
    n = int(dur*SR)
    tt = np.arange(n)/SR
    e = np.exp(-tt*(3.5/dur))
    x = np.sin(2*np.pi*f*tt*np.exp(-tt*3.0))*e
    if click > 0:
        cn = int(0.006*SR)
        x[:cn] += rng.standard_normal(cn)*click*np.exp(-np.linspace(0, 6, cn))
    return (x*level).astype(np.float32)

handling = np.zeros(N, np.float32)
place(handling, rustle(0.60, 0.22, 3600), 5.36)       # picked up off the asphalt
place(handling, thump(0.10, 125, 0.14, 0.06), 5.40)
place(handling, rustle(0.95, 0.12, 2100), 5.95)
place(handling, thump(0.08, 185, 0.07, 0.04), 6.40)
for tt_ in [7.4, 8.7, 10.2, 11.6, 13.6, 15.1, 16.8]:
    place(handling, rustle(0.35, 0.045 + 0.02*rng.random(), 2600), tt_)
# the zoom rocker, jabbed at
for a, b in [(13.0, 13.8), (13.8, 14.4), (14.4, 15.0), (15.0, 15.5),
             (16.1, 16.7), (16.7, 17.6)]:
    n = int((b-a)*SR)
    tt_ = np.arange(n)/SR
    f = 2300 + 850*np.sin(2*np.pi*0.8*tt_) + 300*rng.random()
    servo = 0.010*np.sin(2*np.pi*f*tt_) \
          + 0.006*bp(rng.standard_normal(n).astype(np.float32), 1500, 5000)
    servo *= np.minimum(1, np.linspace(0, 20, n))*np.minimum(1, np.linspace(20, 0, n))
    place(handling, servo.astype(np.float32), a)
mix += handling


# =============================================================== the footsteps
def step_asphalt(level):
    n = int(0.18*SR)
    tt_ = np.arange(n)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 260, 5200)
    e = np.exp(-tt_*26.0)
    e[:int(0.003*SR)] *= np.linspace(0, 1, int(0.003*SR))
    grit = bp(rng.standard_normal(n).astype(np.float32), 3000, 9000)*np.exp(-tt_*45)
    body = np.sin(2*np.pi*76*tt_)*np.exp(-tt_*22)*0.5
    return ((x*e + grit*0.5 + body)*level).astype(np.float32)

def step_board(level):
    n = int(0.26*SR)
    tt_ = np.arange(n)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 180, 4200)*np.exp(-tt_*24)
    for f, a in [(118, 0.6), (196, 0.34), (327, 0.18), (515, 0.10)]:
        x += a*np.sin(2*np.pi*f*(1+0.01*rng.random())*tt_)*np.exp(-tt_*17)
    return (x*level*0.55).astype(np.float32)

def step_steel(level):
    n = int(0.30*SR)
    tt_ = np.arange(n)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 900, 9000)*np.exp(-tt_*22)
    for f, a in [(740, 0.5), (1230, 0.34), (2170, 0.22), (3310, 0.12)]:
        x += a*np.sin(2*np.pi*f*(1+0.01*rng.random())*tt_)*np.exp(-tt_*11)
    return (x*level*0.5).astype(np.float32)

steps = np.zeros(N, np.float32)
ev_path = sys.argv[1] if len(sys.argv) > 1 else 'events.txt'
step_times = []
try:
    for line in open(ev_path):
        p = line.split()
        if len(p) == 4 and p[0] == 'STEP':
            step_times.append((float(p[1]), int(p[2]), int(p[3])))
except FileNotFoundError:
    print('no event file; footsteps will be missing', file=sys.stderr)

# they are not walking while they stand and look at it
step_times = [s for s in step_times if not (T_STOP + 1.0 < s[0] < T_LUNGE - 1.2)]

for i, (ts, surf, run) in enumerate(step_times):
    lvl = (0.36 if run else 0.155) * (0.82 + 0.36*rng.random())
    if surf == 2:
        s = step_steel(lvl*1.05)
    elif surf == 1:
        s = step_board(lvl*1.10)
    else:
        s = step_asphalt(lvl)
    place(steps, s, ts - 0.02)
mix += steps
# the midway is wide and hard, and the funhouse is a box
mix += convolve_seg(steps, ir_reverb(1.15, 0.010, 2800), T_BOOTH, T_CHASE, 0.42)
mix += convolve_seg(steps, ir_reverb(0.55, 0.006, 3400), T_C1, T_C3, 0.55)


# ============================================== the thing that is behind them
def stomp(level, seed=0):
    """Too heavy for the size of it, and it lands on more than two feet."""
    r = np.random.default_rng(0xB00 + seed)
    n = int(0.42*SR)
    tt_ = np.arange(n)/SR
    # the impact
    x = np.sin(2*np.pi*46*tt_*np.exp(-tt_*2.2))*np.exp(-tt_*11)
    x += 0.6*np.sin(2*np.pi*31*tt_)*np.exp(-tt_*7)
    # the crack of something in it
    cn = int(0.02*SR)
    x[:cn] += r.standard_normal(cn)*0.9*np.exp(-np.linspace(0, 7, cn))
    x += 0.55*bp(r.standard_normal(n).astype(np.float32), 120, 2600)*np.exp(-tt_*30)
    # and the drag afterwards
    scr = bp(r.standard_normal(n).astype(np.float32), 1400, 7000)
    scr *= np.exp(-np.maximum(0, tt_-0.06)*9)*np.minimum(1, np.maximum(0, tt_-0.05)*30)
    x += 0.30*scr
    return (x*level).astype(np.float32)

chase = np.zeros(N, np.float32)
run_times = [s for s in step_times if s[2] == 1 and T_LUNGE - 1.0 < s[0] < T_CHASE]
for k, (ts, surf, run) in enumerate(run_times):
    prog = min(1.0, (ts - T_LUNGE)/88.0)
    lag = 0.40 - 0.26*prog                      # it is closing the whole time
    lvl = 0.16 + 0.30*prog
    if k % 2 == 0:                              # its cadence is not theirs
        place(chase, stomp(lvl, k), ts + lag)
    if k % 5 == 2:
        place(chase, stomp(lvl*0.72, k + 900), ts + lag + 0.135)
chase += convolve_seg(chase, ir_reverb(0.85, 0.010, 2400), T_LUNGE, T_CHASE, 1.05)
mix += chase


# ==================================================================== breathing
breath = np.zeros(N, np.float32)
def breath_one(dur, level, inhale=True, bright=1500):
    n = int(dur*SR)
    x = bp(rng.standard_normal(n).astype(np.float32), 180, bright)
    e = np.sin(np.linspace(0, np.pi, n))**(1.4 if inhale else 0.8)
    return (x*e*level).astype(np.float32)

tb = 21.0
while tb < T_FREEZE:
    place(breath, breath_one(1.10, 0.016, True, 1200), tb)
    place(breath, breath_one(1.30, 0.013, False, 900), tb + 1.5)
    tb += 4.6 + rng.random()*1.2
# through the stare they are barely breathing at all, and then not at all
tb = T_FREEZE
while tb < T_STARE:
    place(breath, breath_one(0.85, 0.020, True, 1500), tb)
    place(breath, breath_one(1.05, 0.016, False, 1100), tb + 1.15)
    tb += 5.4 + rng.random()*1.6
place(breath, breath_one(0.55, 0.038, True, 2100), T_STARE - 0.35)    # held
tb = T_STARE + 1.0
while tb < T_DIST:
    place(breath, breath_one(0.34, 0.030, True, 2300), tb)
    place(breath, breath_one(0.40, 0.024, False, 1700), tb + 0.42)
    tb += 1.5 + rng.random()*0.3
tb = T_DIST
while tb < T_VOID:
    hard = min(1.0, (tb - T_DIST)/45.0)
    place(breath, breath_one(0.28, 0.080 + 0.055*hard, True, 2700), tb)
    place(breath, breath_one(0.32, 0.062 + 0.050*hard, False, 1900), tb + 0.34)
    tb += 0.78 - 0.12*hard + rng.random()*0.06
mix += breath

# heartbeat, from the moment it twitches
heart = np.zeros(N, np.float32)
tb = T_STARE - 2.0
while tb < T_VOID:
    bpmt = 92 + 68*min(1.0, max(0.0, (tb - T_STARE)/26.0))
    per = 60.0/bpmt
    place(heart, thump(0.22, 50, 0.090), tb)
    place(heart, thump(0.26, 42, 0.062), tb + per*0.34)
    tb += per
mix += lp(heart, 175)


# ======================================================= the park's own noises
# The popcorn cart never stopped. You hear it before you see it.
pop = np.zeros(N, np.float32)
def kernel(level, f):
    n = int(0.045*SR)
    tt_ = np.arange(n)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), f*0.6, f*2.2)*np.exp(-tt_*180)
    x += 0.5*np.sin(2*np.pi*f*tt_)*np.exp(-tt_*220)
    return (x*level).astype(np.float32)

tp = 96.0
while tp < 134.0:
    near = np.exp(-abs(tp - 115.0)/9.0)
    if rng.random() < 0.55 + 0.4*near:
        place(pop, kernel(0.020 + 0.075*near, 1600 + 2400*rng.random()), tp)
    tp += 0.035 + rng.random()*0.075
# the kettle underneath it
kt = bp(noise(), 300, 2600)*0.5 + lp(noise(), 140)
kt = set_rms(kt.astype(np.float32))
pop += kt * env([(96.0, 0.0), (108.0, 0.011), (116.0, 0.020), (124.0, 0.010),
                 (134.0, 0.0), (T_END, 0.0)], smooth=0.2)
mix += pop
mix += convolve_seg(pop, ir_reverb(1.0, 0.008, 3200), 96.0, 136.0, 0.5)

# a loose flap of awning canvas somewhere, and nothing moving it
flap = np.zeros(N, np.float32)
for tf in [37.0, 58.5, 88.0, 121.0, 139.0, 262.0]:
    n = int(0.9*SR); tt_ = np.arange(n)/SR
    f = bp(rng.standard_normal(n).astype(np.float32), 200, 2400)
    f *= (np.exp(-tt_*7)*(0.5 + 0.5*np.sin(2*np.pi*9*tt_)))
    place(flap, (f*0.030).astype(np.float32), tf)
flap += convolve_seg(flap, ir_reverb(1.6, 0.02, 2600), 30.0, 270.0, 0.9)
mix += flap

# somewhere a long way off, steel under load. There is nothing riding on it.
groans = np.zeros(N, np.float32)
for tg in [44.0, 71.0, 99.0, 128.0, 158.5, 166.0]:
    n = int(3.4*SR); tt_ = np.arange(n)/SR
    f0 = 48 + 70*rng.random()
    g = np.sin(2*np.pi*f0*(1 - 0.10*tt_/3.4)*tt_)*np.exp(-tt_*0.85)
    g += 0.45*np.sin(2*np.pi*f0*2.03*(1 - 0.08*tt_/3.4)*tt_ + 0.6)*np.exp(-tt_*1.25)
    g *= (0.6 + 0.4*np.sin(2*np.pi*(2 + 4*rng.random())*tt_))
    place(groans, (g*0.026).astype(np.float32), tg)
groans += convolve_seg(groans, ir_reverb(4.0, 0.05, 1700), 40.0, 175.0, 1.45)
mix += groans


# ============================================ the whispers, which are not real
# Formant-shaped noise with syllables in it. Dry and close, because they are
# not in the park -- they are between the operator's ears.
def whisper(dur, level, rate=5.5, seed=0, back=False):
    r = np.random.default_rng(0x9F0 + seed)
    n = int(dur*SR)
    tt_ = np.arange(n)/SR
    src = r.standard_normal(n).astype(np.float32)
    x = bp(src, 600, 4600)*0.5
    for f, g in [(560, 1.0), (1180, 0.72), (2450, 0.45), (3400, 0.22)]:
        fj = f*(1.0 + 0.10*np.sin(2*np.pi*0.7*tt_ + r.random()*6.28))
        x += g*bp(src, fj.mean()*0.90, fj.mean()*1.10)
    # syllables: a ragged gate, never quite periodic
    syl = 0.5 + 0.5*np.sin(2*np.pi*rate*tt_ + 2.0*np.sin(2*np.pi*0.9*tt_))
    syl = syl**2.6
    syl *= (lp(r.standard_normal(n).astype(np.float32), 9.0)*7.0).clip(0.15, 1.0)
    e = np.sin(np.linspace(0, np.pi, n))**0.7
    x = x/(x.std() + 1e-9)
    out = (x*syl*e*level).astype(np.float32)
    return out[::-1].copy() if back else out

whis = np.zeros(N, np.float32)
whis_w = np.zeros(N, np.float32)      # a decorrelated pair, for width
tw = T_STARE + 1.4
k = 0
while tw < T_LUNGE + 2.0:
    prog = min(1.0, (tw - T_STARE)/12.0)
    dur = 0.8 + 1.9*rng.random()
    lvl = (0.030 + 0.075*prog) * (0.6 + 0.7*rng.random())
    back = rng.random() < 0.42
    place(whis,   whisper(dur, lvl, 4.2 + 3.4*rng.random(), k, back), tw)
    place(whis_w, whisper(dur, lvl*0.9, 4.0 + 3.6*rng.random(), k + 500, not back), tw + 0.06)
    tw += 0.30 + 0.85*rng.random()*(1.2 - prog)
    k += 1
# they arrive again, quieter, while they are running
tw = T_LUNGE + 6.0
while tw < T_CHASE - 4.0:
    place(whis,   whisper(0.9 + rng.random(), 0.026, 5.0 + 3*rng.random(), k), tw)
    place(whis_w, whisper(0.9 + rng.random(), 0.023, 5.0 + 3*rng.random(), k + 700), tw + 0.05)
    tw += 5.5 + 6.0*rng.random()
    k += 1
mix += whis


# ========================================================= it stops being still
# The posture goes first: a rack of small dry cracks, close.
snap = np.zeros(N, np.float32)
for i in range(11):
    at = T_SNAP + i*0.032 + rng.random()*0.020
    n = int(0.09*SR); tt_ = np.arange(n)/SR
    cr = rng.standard_normal(n).astype(np.float32)
    cr = bp(cr, 900 + 2600*rng.random(), 9000)*np.exp(-tt_*(70 + 60*rng.random()))
    cr += 0.5*np.sin(2*np.pi*(240 + 500*rng.random())*tt_)*np.exp(-tt_*90)
    place(snap, (cr*(0.16 + 0.14*rng.random())).astype(np.float32), at)
# a bell on the costume, once, which is worse than the cracks
for at, lv in [(T_SNAP + 0.06, 0.055), (T_SNAP + 0.41, 0.032), (T_SNAP + 1.15, 0.020)]:
    n = int(1.3*SR); tt_ = np.arange(n)/SR
    b = np.zeros(n, np.float32)
    for f, a in [(2340, 1.0), (3510, 0.6), (5180, 0.35), (6870, 0.2)]:
        b += a*np.sin(2*np.pi*f*tt_)*np.exp(-tt_*(5.0 + f/2600.0))
    b *= np.minimum(1, tt_*900)
    place(snap, (b*lv).astype(np.float32), at)
snap += convolve_seg(snap, ir_reverb(2.2, 0.012, 5000), T_SNAP - 0.1, T_SNAP + 4.0, 0.85)
mix += snap

# and then it makes a noise. Inharmonic FM, and something torn underneath it.
scr_len = 4.4
n = int(scr_len*SR); tt_ = np.arange(n)/SR
mod = np.sin(2*np.pi*211*tt_) + 0.6*np.sin(2*np.pi*533*tt_)
ix = 13.0*np.exp(-tt_*0.9) + 3.2
carr = 1380 * (1 + 0.65*np.exp(-tt_*2.6)) * (1 - 0.52*tt_/scr_len)
scream = np.sin(2*np.pi*carr*tt_ + ix*mod)
scream += 0.72*np.sin(2*np.pi*carr*1.497*tt_ + ix*0.7*mod)*np.sin(2*np.pi*57*tt_)
scream += 1.15*bp(rng.standard_normal(n).astype(np.float32), 850, 11000)*np.exp(-tt_*1.5)
scream += 0.85*bp(rng.standard_normal(n).astype(np.float32), 110, 680)*np.exp(-tt_*0.75)
se = np.exp(-tt_*0.72)
se[:int(0.010*SR)] *= np.linspace(0, 1, int(0.010*SR))
scream = np.tanh(scream*se*2.5)*0.215
screech = np.zeros(N, np.float32)
place(screech, scream.astype(np.float32), T_SNAP + 0.30)
# a sub drop under it, so it is felt as much as heard
n2 = int(2.6*SR); t2 = np.arange(n2)/SR
drop = np.sin(2*np.pi*(140*np.exp(-t2*1.7) + 23)*t2)*np.exp(-t2*1.05)
place(screech, (drop*0.17).astype(np.float32), T_SNAP + 0.28)
screech += convolve_seg(screech, ir_reverb(3.4, 0.02, 5200), T_SNAP, T_SNAP + 6.0, 0.95)
mix += screech

# the running pulse: pressure, never music
pulse = np.zeros(N, np.float32)
tp = T_LUNGE
while tp < T_CHASE:
    rate_ = 0.60 - 0.20*min(1.0, (tp - T_LUNGE)/95.0)
    n = int(rate_*SR); tt_ = np.arange(n)/SR
    pl = np.sin(2*np.pi*(37 + 8*np.sin(tp))*tt_)*np.exp(-tt_*4.6)
    place(pulse, (pl*0.078).astype(np.float32), tp)
    tp += rate_
mix += lp(pulse, 210)

# the cuts between the funhouse, the mirrors and the midway are on the tape
for tc in [T_C1, T_C2, T_C3]:
    place(mix, thump(0.10, 300, 0.10, 0.20), tc - 0.06)


# ============================================================ no floor, no room
void = np.zeros(N, np.float32)
vn = int(9.6*SR); vt = np.arange(vn)/SR
roar = bp(rng.standard_normal(vn).astype(np.float32), 28, 9500)
roar *= (np.minimum(1, vt*3.2) * np.exp(-np.maximum(0, vt - 6.6)*1.5)).astype(np.float32)
falling = np.sin(2*np.pi*(92*np.exp(-vt*0.40) + 16)*vt)
falling *= np.minimum(1, vt*1.2)*np.exp(-vt*0.15)
whoosh = bp(rng.standard_normal(vn).astype(np.float32), 190, 2700)
whoosh *= (np.sin(np.linspace(0, np.pi, vn))**1.6)
place(void, (roar*0.31 + falling*0.30 + whoosh*0.21).astype(np.float32), T_CHASE - 0.20)
mix += void

# the landing
land = np.zeros(N, np.float32)
place(land, thump(0.95, 44, 0.82, 0.45), T_IMPACT)
place(land, step_asphalt(1.6), T_IMPACT)                     # it hits the asphalt
place(land, thump(0.30, 205, 0.24, 0.32), T_IMPACT + 0.02)   # the body of the camera
place(land, thump(0.22, 315, 0.10, 0.15), T_IMPACT + 0.27)   # and it bounces
place(land, rustle(0.45, 0.11, 1500), T_IMPACT + 0.30)
place(land, thump(0.18, 255, 0.055, 0.09), T_IMPACT + 0.63)
place(land, rustle(0.75, 0.05, 900), T_IMPACT + 0.70)
mix += land
for tc, lv in [(295.4, 0.018), (297.6, 0.013)]:
    place(mix, rustle(0.5, lv, 1100), tc)


# ================================================================== the tape
# --- wow and flutter ------------------------------------------------------
warp = (0.0022*np.sin(2*np.pi*0.55*t) + 0.0011*np.sin(2*np.pi*1.7*t + 1.0)
        + 0.0007*np.sin(2*np.pi*7.3*t + 2.0) + 0.0004*np.sin(2*np.pi*11.1*t))
warp += 0.012*np.exp(-((t - T_WARP1)/1.4)**2)*np.sin(2*np.pi*6*t)
warp += 0.011*np.exp(-((t - T_SNAP - 0.7)/1.2)**2)*np.sin(2*np.pi*9*t)
warp += 0.014*np.exp(-((t - 286.5)/3.0)**2)*np.sin(2*np.pi*5*t)
idx = np.arange(N, dtype=np.float64) + np.cumsum(warp.astype(np.float64))*3.0
idx = np.clip(idx, 0, N-1)
mix = np.interp(idx, np.arange(N), mix).astype(np.float32)

# --- band limiting: a camcorder microphone on a linear track --------------
mix = hp(mix, 58, order=2)
mix = lp(mix, 9200, order=6)

# --- saturation -----------------------------------------------------------
mix = np.tanh(mix*1.9).astype(np.float32)/1.9

# --- dropouts, on the same frames the picture tears ----------------------
drop_env = np.ones(N, np.float32)
def tear(at, dur, depth=0.85):
    i0, i1 = int(at*SR), int((at+dur)*SR)
    if i0 >= N:
        return
    drop_env[i0:min(i1, N)] *= (1.0 - depth)
for a in [17.6, 19.6, 145.5, 147.2, 170.9, 207.7, 232.7, 252.7, 290.9]:
    tear(a, 0.05 + 0.06*rng.random())
for a in [176.5, 179.0, 181.4, 183.1, 185.3]:
    tear(a, 0.035, 0.7)
_tears = np.arange(T_LUNGE, T_CHASE, 7.0)
for a in _tears + rng.random(len(_tears))*5.0:
    tear(float(a), 0.018, 0.6)
mix *= lp(drop_env, 5000)

# --- hiss, and the head noise that never goes away -----------------------
hiss = bp(noise(), 900, 9000) * 0.0128
hiss += lp(noise(), 200) * 0.0036
hiss_env = env([(0.0, 1.0), (T_STOP, 1.0), (T_STOP + 0.5, 1.40),
                (T_STARE, 1.40), (T_DIST, 1.15), (T_LUNGE, 1.0),
                (T_CHASE, 1.0), (T_CHASE + 0.3, 2.7), (T_VOID, 2.7),
                (T_VOID + 1.4, 1.0), (T_END, 1.0)], smooth=0.05)
mix += hiss*hiss_env
# mains creeping into the audio head
mix += (0.0022*np.sin(2*np.pi*60*t) + 0.0011*np.sin(2*np.pi*180*t)).astype(np.float32)

# --- level ---------------------------------------------------------------
peak = float(np.abs(mix).max())
mix = (mix/peak*0.86).astype(np.float32)

# --- out: near mono, the way a camcorder recorded it, except for the things
#         that were never in the room -----------------------------------------
dbg('whisper', whis, T_STARE, T_LUNGE)
dbg('buzz', buzz*buzz_env, 60.0, 90.0)
dbg('mix', mix, 60.0, 90.0)
side = lp(noise(), 6000)*0.0016
side = side + (whis_w - whis)*1.15          # the whispers are the only wide thing
side *= 0.86/peak                           # they went through the same fader
L = np.clip(mix + side, -1, 1)
R = np.clip(mix - side, -1, 1)
stereo = np.stack([L, R], axis=1)

out_path = sys.argv[2] if len(sys.argv) > 2 else 'audio.wav'
pcm = (stereo*32767.0).astype(np.int16)
import wave
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'wrote {out_path}: {N/SR:.2f}s, {len(step_times)} footsteps, peak {peak:.3f}')

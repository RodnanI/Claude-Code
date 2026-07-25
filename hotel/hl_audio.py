#!/usr/bin/env python3
"""
hl_audio.py -- sound for the tape.

Everything is synthesised: oscillators, noise and filters. Nothing is sampled.

The bed is a lounge arrangement on a house PA -- electric piano, a string pad,
a bass and a brush -- written out as notes. Its phrase is exactly thirty
seconds long, so ten of them fit the tape and the music at 5:00 is the music
at 0:00: the sound loops with the picture. At 2:58 it stops dead, and what is
left is twenty seconds of tape hiss with somebody breathing over it.

    python3 hl_audio.py events.txt audio.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR   = 44100
DUR  = 300.0
N    = int(SR * DUR)
rng  = np.random.default_rng(0x8E11A55)

# the timeline, matching hl_main.c
T_PICKUP =   5.0
T_ZOOM   =  13.0
T_BREAK  =  16.6
T_STAND  =  20.0
T_MALL   =  72.0
T_ARCADE = 106.0
T_PIANO  = 126.0
T_ESC    = 148.0
T_SILENT = 178.0     # the music and the ticking stop, together, dead
T_STARE  = 180.5
T_WARP   = 198.0     # twenty seconds in which nothing holds still
T_LUNGE  = 218.0
T_RUN    = 219.4
T_STAIR  = 248.0
T_SERV   = 272.0
T_VOID   = 289.5
T_LAND   = 292.5
T_END    = 300.0

t = np.arange(N, dtype=np.float32) / SR

# ----------------------------------------------------------------- utilities
def lp(x, f, order=4):
    return sosfilt(butter(order, min(f, SR*0.49), 'low', fs=SR, output='sos'), x).astype(np.float32)

def hp(x, f, order=4):
    return sosfilt(butter(order, max(f, 5.0), 'high', fs=SR, output='sos'), x).astype(np.float32)

def bp(x, f0, f1, order=4):
    f1 = min(f1, SR*0.49); f0 = max(f0, 5.0)
    if f0 >= f1:
        f0 = f1*0.5
    return sosfilt(butter(order, [f0, f1], 'band', fs=SR, output='sos'), x).astype(np.float32)

def noise(n=None):
    return rng.standard_normal(N if n is None else n).astype(np.float32)

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

mix  = np.zeros(N, np.float32)
side = np.zeros(N, np.float32)      # the things that are not in the building

# ========================================================== the house music
# Eight bars of four at 64, which is exactly thirty seconds, which is exactly a
# tenth of the tape. Nothing in the arrangement is allowed to be interesting.
BPM   = 64.0
BEAT  = 60.0/BPM                    # 0.9375 s
BAR   = 4*BEAT                      # 3.75 s
PHRASE = 8*BAR                      # 30.0 s
PN    = int(round(PHRASE*SR))

CHORDS = [
    [53, 57, 60, 64],   # Fmaj7
    [50, 53, 57, 60],   # Dm7
    [55, 58, 62, 65],   # Gm7
    [48, 52, 55, 58],   # C7
    [53, 57, 60, 64],   # Fmaj7
    [45, 48, 52, 55],   # Am7
    [46, 50, 53, 57],   # Bbmaj7
    [48, 52, 55, 58],   # C7
]
BASS = [(41, 45), (38, 45), (43, 50), (36, 43),
        (41, 45), (33, 40), (34, 41), (36, 43)]
# (bar, beat, beats, midi) -- a tune that goes nowhere and comes back
MEL = [
    (0, 0, 2, 72), (0, 2, 1, 69), (0, 3, 1, 72),
    (1, 0, 2, 74), (1, 2, 1, 72), (1, 3, 1, 69),
    (2, 0, 3, 70), (2, 3, 1, 74),
    (3, 0, 4, 72),
    (4, 0, 2, 76), (4, 2, 2, 72),
    (5, 0, 2, 69), (5, 2, 1, 72), (5, 3, 1, 76),
    (6, 0, 3, 74), (6, 3, 1, 77),
    (7, 0, 4, 72),
]

def rhodes(f, dur, level, seed=0):
    """A tine under a pickup: a sine, a bark an octave up that dies first, and
    a knock of the hammer. It is the sound of a hotel with a piano nobody
    plays, played back through a ceiling."""
    n = int(dur*SR)
    if n <= 0:
        return np.zeros(0, np.float32)
    tt = np.arange(n, dtype=np.float32)/SR
    body = np.exp(-tt/(0.42 + 0.30*np.exp(-f/220.0))).astype(np.float32)
    bark = np.exp(-tt/0.055).astype(np.float32)
    ph = 2*np.pi*f*tt
    x  = np.sin(ph)*body
    x += 0.44*np.sin(2*ph + 1.4*bark)*bark          # the tine, and its bell
    x += 0.16*np.sin(3*ph)*np.exp(-tt/0.10)
    x += 0.05*np.sin(4.02*ph)*np.exp(-tt/0.06)
    k = bp(np.concatenate([rng.standard_normal(int(SR*0.006)).astype(np.float32),
                           np.zeros(max(n - int(SR*0.006), 0), np.float32)])[:n], 900, 5200)
    x += 0.20*k*np.exp(-tt/0.020)
    trem = 1.0 + 0.10*np.sin(2*np.pi*4.6*tt + seed)  # the amp had one built in
    return (x*trem*level).astype(np.float32)

def strings(f, dur, level, seed=0):
    """Three ranks of a divided section, none of them quite in tune, behind a
    lowpass that has been in a ceiling since 1979."""
    n = int(dur*SR)
    if n <= 0:
        return np.zeros(0, np.float32)
    tt = np.arange(n, dtype=np.float32)/SR
    x = np.zeros(n, np.float32)
    for r, det in enumerate((0.9965, 1.0, 1.0041)):
        drift = 1.0 + 0.0016*np.sin(2*np.pi*(0.21 + 0.07*r)*tt + seed + r)
        ph = 2*np.pi*f*det*tt*drift
        for h in range(1, 9):
            x += (0.9/h)*np.sin(h*ph + 0.7*r)/3.0
    a = np.minimum(tt/0.55, 1.0)*np.minimum((dur - tt)/0.75, 1.0)
    a = np.clip(a, 0.0, 1.0)
    x = lp(x, 2300.0)
    return (x*a*level).astype(np.float32)

def flute(f, dur, level, seed=0):
    n = int(dur*SR)
    if n <= 0:
        return np.zeros(0, np.float32)
    tt = np.arange(n, dtype=np.float32)/SR
    vib = 1.0 + 0.0038*np.sin(2*np.pi*5.1*tt + seed)
    ph = 2*np.pi*f*tt*vib
    x = np.sin(ph) + 0.10*np.sin(2*ph) + 0.045*np.sin(3*ph)
    breath = lp(rng.standard_normal(n).astype(np.float32), 4200.0)
    x = x + 0.10*breath
    a = np.minimum(tt/0.11, 1.0)*np.minimum((dur - tt)/0.22, 1.0)
    a = np.clip(a, 0.0, 1.0)**1.2
    return (x*a*level).astype(np.float32)

def upbass(f, dur, level):
    n = int(dur*SR)
    if n <= 0:
        return np.zeros(0, np.float32)
    tt = np.arange(n, dtype=np.float32)/SR
    d = np.exp(-tt/0.55).astype(np.float32)
    ph = 2*np.pi*f*tt
    x = np.sin(ph)*d + 0.22*np.sin(2*ph)*np.exp(-tt/0.14)
    x += 0.16*lp(rng.standard_normal(n).astype(np.float32), 260.0)*np.exp(-tt/0.03)
    return (x*level).astype(np.float32)

def brush(dur, level, bright=6000.0):
    n = int(dur*SR)
    x = rng.standard_normal(n).astype(np.float32)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(x, 1800.0, bright)*np.exp(-tt/0.075)
    return (x*level).astype(np.float32)

def render_muzak():
    """One phrase, rendered long enough to ring over its own end, then wrapped
    so the loop is seamless in the tail as well as the head."""
    pad = int(SR*3.0)
    buf = np.zeros(PN + pad, np.float32)
    def put(dst, src, at):
        i = int(at*SR)
        if i >= len(dst):
            return
        m = min(len(src), len(dst) - i)
        dst[i:i+m] += src[:m]
    for bar in range(8):
        b0 = bar*BAR
        ch = CHORDS[bar]
        # the pad, under everything, one chord to a bar
        for j, m in enumerate(ch):
            put(buf, strings(midi_hz(m), BAR*1.04, 0.052, seed=bar*3+j), b0)
        # the electric piano: a spread voicing on one, and again on three
        for beat, lv in ((0, 1.0), (2, 0.74)):
            for j, m in enumerate(ch):
                mm = m + (12 if j == 3 else 0)
                put(buf, rhodes(midi_hz(mm), 2.6, 0.115*lv, seed=bar+j),
                    b0 + beat*BEAT + j*0.032)
        # bass on one and three
        r1, r2 = BASS[bar]
        put(buf, upbass(midi_hz(r1), 1.4, 0.30), b0)
        put(buf, upbass(midi_hz(r2), 1.1, 0.21), b0 + 2*BEAT)
        # and a brush on two and four
        put(buf, brush(0.30, 0.030), b0 + 1*BEAT)
        put(buf, brush(0.30, 0.024, 5200.0), b0 + 3*BEAT)
    for (bar, beat, beats, m) in MEL:
        put(buf, flute(midi_hz(m), beats*BEAT*0.94, 0.088, seed=bar*7+beat),
            bar*BAR + beat*BEAT)
    # wrap the ring-out of the last bar onto the head of the phrase
    loop = buf[:PN].copy()
    loop[:pad] += buf[PN:PN+pad]
    return loop

print('  muzak...', file=sys.stderr)
phrase = render_muzak()
muzak = np.tile(phrase, int(np.ceil(N/PN)) + 1)[:N].astype(np.float32)

# through a ceiling, in a very large room
hall = ir_reverb(2.9, predelay=0.028, damp=3200.0, density=0.9)
muzak = lp(muzak, 4600.0)
muzak = muzak + fftconvolve(muzak, hall)[:N].astype(np.float32)*1.5
# the amplifier is old and the mains is not clean
muzak *= 1.0 + 0.035*np.sin(2*np.pi*0.27*t) + 0.02*np.sin(2*np.pi*1.7*t)

# a fixed level, so the arrangement cannot decide on its own how loud the tape is
_mr = float(np.sqrt((muzak.astype(np.float64)**2).mean()))
muzak = (muzak*(0.108/(_mr + 1e-12))).astype(np.float32)

# it plays until it stops, and it is back by the time the tape comes round
mus_gate = env([(0.0, 1.0), (T_SILENT - 0.45, 1.0), (T_SILENT - 0.02, 1.0),
                (T_SILENT, 0.0), (T_LAND + 1.6, 0.0), (T_LAND + 2.4, 0.16),
                (297.6, 0.62), (300.0, 1.0)])
# and it is quieter out in the corridors than it is in the lobby
mus_room = env([(0.0, 1.00), (T_STAND, 1.00), (T_STAND + 3.0, 0.62),
                (T_MALL - 1.0, 0.62), (T_MALL + 2.0, 0.88), (T_SILENT, 0.88)])
mix += muzak*mus_gate*mus_room*0.92
dbg('muzak', muzak*mus_gate*mus_room, 0, 30)

# ============================================================== the building
# Plant, mains, and the air in a place this size. The 60 Hz and its octave both
# divide 300 seconds exactly, so the hum at 5:00 is the hum at 0:00.
print('  room tone...', file=sys.stderr)
tone  = 0.0150*np.sin(2*np.pi*60.0*t).astype(np.float32)
tone += 0.0092*np.sin(2*np.pi*120.0*t + 0.7).astype(np.float32)
tone += 0.0031*np.sin(2*np.pi*180.0*t + 1.9).astype(np.float32)
# the iron in the ballast clips on the fundamental
tone += 0.0026*np.tanh(6.0*np.sin(2*np.pi*60.0*t)).astype(np.float32)
air = lp(noise(), 220.0)*3.6 + bp(noise(), 240.0, 1500.0)*0.30
air = air*env([(0.0, 0.030), (T_MALL, 0.030), (T_MALL + 3.0, 0.052),
               (T_SILENT, 0.052), (T_SILENT + 0.5, 0.016), (T_SERV, 0.016),
               (T_SERV + 2.0, 0.060), (T_VOID, 0.060), (T_LAND, 0.020),
               (T_END, 0.030)])
plant = (tone + air).astype(np.float32)
plant *= env([(0.0, 1.0), (T_SILENT - 0.02, 1.0), (T_SILENT + 0.35, 0.34),
              (T_LUNGE, 0.34), (T_RUN, 1.0), (T_END, 1.0)])
mix += plant
dbg('plant', plant, 0, 20)

# the flyback on the monitor: 15.7 kHz, and it is the loudest thing in the room
# if you put your ear near the glass, which is where the lens spends 0:00-0:20
fly = (0.020*np.sin(2*np.pi*15734.0*t) + 0.008*np.sin(2*np.pi*31468.0*t)).astype(np.float32)
fly *= env([(0.0, 1.0), (T_ZOOM, 1.30), (T_BREAK, 1.55), (T_STAND, 0.55),
            (T_STAND + 2.0, 0.0), (T_LAND, 0.0), (T_LAND + 1.0, 0.9), (T_END, 1.0)])
mix += fly*0.55

# the deck itself: the transport is running the whole time
capstan = (0.0026*np.sin(2*np.pi*22.0*t + 0.3)
           + 0.0018*np.sin(2*np.pi*44.0*t)).astype(np.float32)
mix += capstan + bp(noise(), 3000.0, 9000.0)*0.0022

# ================================================================ the clocks
# Longcase movements, and no two of them agree. They stop when the music stops.
print('  clocks...', file=sys.stderr)
def tick(dur, f0, f1, level, seed=0):
    n = int(dur*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), f0, f1)
    x *= np.exp(-tt/0.0075)
    x += 0.35*np.sin(2*np.pi*f0*1.6*tt)*np.exp(-tt/0.0045)
    # the case rings, a little, at its own pitch
    x += 0.16*np.sin(2*np.pi*(190.0 + 60.0*seed % 90)*tt)*np.exp(-tt/0.035)
    return (x*level).astype(np.float32)

clocks = np.zeros(N, np.float32)
CLK = [(0.503, 2400, 5600, 0.052), (0.478, 1900, 4400, 0.044),
       (0.556, 3000, 7000, 0.038), (0.611, 1500, 3600, 0.046),
       (0.441, 2700, 6200, 0.033)]
for ci, (per, f0, f1, lv) in enumerate(CLK):
    ph = rng.random()*per
    k = 0
    while ph < T_SILENT:
        if ph > T_MALL - 8.0:
            # tick and tock are not the same sound
            lvl = lv*(1.0 if (k & 1) else 0.86)
            place(clocks, tick(0.10, f0, f1, lvl, seed=ci), ph)
        ph += per*(1.0 + 0.004*np.sin(k*0.7 + ci))
        k += 1
# one in the lobby, on the second, so it is in phase when the tape comes round
for sec in range(0, 21):
    place(clocks, tick(0.12, 1700, 4000, 0.030, seed=9), float(sec))
for sec in range(293, 300):
    place(clocks, tick(0.12, 1700, 4000, 0.030, seed=9), float(sec))
place(clocks, tick(0.12, 1700, 4000, 0.030, seed=9), 300.0 - 1e-6)
clk_gate = env([(0.0, 1.0), (T_STAND, 0.55), (T_MALL - 2.0, 0.55),
                (T_MALL + 2.0, 1.0), (T_SILENT - 0.02, 1.0), (T_SILENT, 0.0),
                (T_LAND + 2.0, 0.0), (T_LAND + 3.0, 1.0), (T_END, 1.0)])
clocks *= clk_gate
mix += clocks + convolve_seg(clocks, hall, T_MALL - 8.0, T_SILENT, 1.5)
dbg('clocks', clocks, 100, 130)

# ============================================================== the fountains
print('  water...', file=sys.stderr)
water = bp(noise(), 700.0, 6500.0)*0.55 + bp(noise(), 180.0, 700.0)*0.30
# it is thick, so it does not splash: it turns over
water *= (0.55 + 0.45*lp(noise(), 3.0)*3.0).astype(np.float32)
bubbles = np.zeros(N, np.float32)
for _ in range(420):
    at = T_MALL + rng.random()*(T_SILENT - T_MALL)
    d = 0.05 + 0.10*rng.random()
    n = int(d*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    f = 110.0 + 500.0*rng.random()
    b = np.sin(2*np.pi*f*(1.0 + 5.5*tt)*tt)*np.exp(-tt/(d*0.30))
    place(bubbles, (b*0.030*rng.random()).astype(np.float32), at)
wat_env = env([(T_MALL, 0.0), (82.0, 0.20), (86.5, 1.00), (91.0, 0.85),
               (96.0, 0.16), (130.0, 0.10), (135.0, 0.55), (140.0, 0.85),
               (145.0, 0.22), (T_SILENT - 0.02, 0.18), (T_SILENT, 0.0)])
mix += (water*0.085 + bubbles)*wat_env
dbg('water', (water*0.085 + bubbles)*wat_env, 85, 92)

# ================================================================ the arcade
# Every cabinet is in attract mode and none of them are in step.
print('  arcade...', file=sys.stderr)
def sq(f, dur, level, duty=0.5):
    n = int(dur*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = np.where((f*tt) % 1.0 < duty, 1.0, -1.0).astype(np.float32)
    a = np.minimum(tt/0.004, 1.0)*np.minimum((dur - tt)/0.010, 1.0)
    return (x*np.clip(a, 0, 1)*level).astype(np.float32)

def chip_noise(dur, level, f0=900, f1=6000):
    n = int(dur*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), f0, f1)
    return (x*np.exp(-tt/(dur*0.35))*level).astype(np.float32)

arcade = np.zeros(N, np.float32)
A0, A1 = 96.0, 124.0
for cab in range(7):
    base = 48 + int(rng.random()*18)
    tempo = 0.115 + 0.075*rng.random()
    kind = cab % 3
    ph = A0 + rng.random()*2.0
    step = 0
    while ph < A1:
        if kind == 0:      # an arpeggio going up, forever
            m = base + [0, 4, 7, 12, 7, 4][step % 6]
            place(arcade, sq(midi_hz(m)*2, tempo*0.85, 0.030, 0.5), ph)
        elif kind == 1:    # a two-note siren and the odd explosion
            m = base + (0 if (step % 2) else 5)
            place(arcade, sq(midi_hz(m)*2, tempo*1.6, 0.024, 0.25), ph)
            if step % 11 == 0:
                place(arcade, chip_noise(0.28, 0.055, 300, 4000), ph)
        else:              # a coin-up jingle nobody paid for
            seq = [0, 7, 12, 16, 19]
            m = base + 12 + seq[step % 5]
            place(arcade, sq(midi_hz(m)*2, tempo*0.5, 0.022, 0.125), ph)
            if step % 17 == 0:
                for j, mm in enumerate(seq):
                    place(arcade, sq(midi_hz(base+12+mm)*2, 0.07, 0.030, 0.5),
                          ph + j*0.075)
        ph += tempo*(1.0 + 0.02*np.sin(step*0.9 + cab))
        step += 1
arc_env = env([(A0, 0.0), (100.0, 0.10), (T_ARCADE, 0.55), (109.0, 1.00),
               (115.0, 0.95), (119.0, 0.45), (A1, 0.10), (T_SILENT - 0.02, 0.06),
               (T_SILENT, 0.0)])
arcade = lp(arcade, 7000.0)*arc_env
mix += arcade + convolve_seg(arcade, hall, A0, A1, 0.9)
dbg('arcade', arcade, 106, 118)

# ================================================================= the piano
# A concert grand, playing something it half remembers, with the pedal down.
print('  piano...', file=sys.stderr)
def grand(f, dur, level, seed=0):
    n = int(dur*SR)
    if n <= 0:
        return np.zeros(0, np.float32)
    tt = np.arange(n, dtype=np.float32)/SR
    x = np.zeros(n, np.float32)
    B = 0.00028                                  # string inharmonicity
    for h in range(1, 15):
        fh = f*h*np.sqrt(1.0 + B*h*h)
        if fh > 12000.0:
            break
        amp = (1.0/h**1.35)*(1.0 + 0.30*np.sin(h*2.1 + seed))
        dec = 2.6/(1.0 + 0.30*h)                 # the top dies first
        x += amp*np.sin(2*np.pi*fh*tt + seed*0.3)*np.exp(-tt/dec)
    # two strings a hair apart, so it beats
    x *= 1.0 + 0.06*np.sin(2*np.pi*0.9*tt + seed)
    thud = lp(rng.standard_normal(n).astype(np.float32), 1400.0)*np.exp(-tt/0.012)
    x = x + 0.55*thud
    a = np.minimum(tt/0.0025, 1.0)
    return (x*a*level*0.30).astype(np.float32)

piano = np.zeros(N, np.float32)
SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79]
ph = 118.0
prev = 5
while ph < 152.0:
    # it does not play in time and it does not resolve
    jump = int(rng.integers(-3, 4))
    prev = max(0, min(len(SCALE)-1, prev + jump))
    m = SCALE[prev] + (12 if rng.random() < 0.18 else 0)
    place(piano, grand(midi_hz(m), 4.2, 0.40 + 0.45*rng.random(), seed=prev), ph)
    if rng.random() < 0.28:      # sometimes two, and they do not agree
        place(piano, grand(midi_hz(m + int(rng.choice([1, 6, 11]))), 3.4, 0.26,
                           seed=prev+3), ph + 0.04 + 0.10*rng.random())
    ph += 0.55 + 1.85*rng.random()**1.6
pia_env = env([(118.0, 0.0), (122.0, 0.22), (T_PIANO, 0.85), (130.0, 1.00),
               (136.0, 0.80), (142.0, 0.30), (150.0, 0.10),
               (T_SILENT - 0.02, 0.08), (T_SILENT, 0.0)])
piano *= pia_env
mix += piano*0.42 + convolve_seg(piano, hall, 118.0, 152.0, 1.4)
dbg('piano', piano, 126, 136)

# ============================================================= the escalator
print('  escalator...', file=sys.stderr)
esc = lp(noise(), 130.0)*2.4 + bp(noise(), 300.0, 2400.0)*0.22
esc *= (0.75 + 0.25*np.sin(2*np.pi*1.35*t)).astype(np.float32)
clank = np.zeros(N, np.float32)
ph = T_ESC
while ph < T_SILENT:
    n = int(0.05*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    c = bp(rng.standard_normal(n).astype(np.float32), 900, 5000)*np.exp(-tt/0.010)
    c += 0.4*np.sin(2*np.pi*320*tt)*np.exp(-tt/0.02)
    place(clank, (c*0.035).astype(np.float32), ph)
    ph += 0.539                        # one step, every step, for thirty seconds
esc_env = env([(T_ESC - 6.0, 0.0), (T_ESC - 2.0, 0.35), (T_ESC, 1.0),
               (T_SILENT - 0.02, 1.0), (T_SILENT, 0.0)])
mix += (esc*0.055 + clank)*esc_env
dbg('escalator', (esc*0.055+clank)*esc_env, 150, 170)

# ============================================================== the operator
# Footfalls come from the renderer's sidecar file, so a foot lands on exactly
# the frame the camera bobbed on.
print('  footsteps...', file=sys.stderr)
def step_carpet(level, seed=0):
    n = int(0.24*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = lp(rng.standard_normal(n).astype(np.float32), 420.0)*np.exp(-tt/0.030)
    x += 0.45*np.sin(2*np.pi*74.0*tt)*np.exp(-tt/0.026)
    x += 0.10*bp(rng.standard_normal(n).astype(np.float32), 1800, 7000)*np.exp(-tt/0.012)
    return (x*level*0.9).astype(np.float32)

def step_marble(level, seed=0):
    n = int(0.40*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 900, 9000)*np.exp(-tt/0.009)
    x += 0.55*bp(rng.standard_normal(n).astype(np.float32), 180, 900)*np.exp(-tt/0.024)
    x += 0.30*np.sin(2*np.pi*128.0*tt)*np.exp(-tt/0.030)
    return (x*level*0.85).astype(np.float32)

def step_wood(level, seed=0):
    n = int(0.32*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 400, 4200)*np.exp(-tt/0.014)
    for f in (168.0, 296.0, 512.0):
        x += 0.24*np.sin(2*np.pi*f*tt)*np.exp(-tt/0.045)
    return (x*level*0.8).astype(np.float32)

def step_stone(level, seed=0):
    n = int(0.34*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 700, 7000)*np.exp(-tt/0.011)
    x += 0.40*bp(rng.standard_normal(n).astype(np.float32), 150, 700)*np.exp(-tt/0.028)
    grit = bp(rng.standard_normal(n).astype(np.float32), 3000, 11000)*np.exp(-tt/0.055)
    return ((x + 0.22*grit)*level*0.85).astype(np.float32)

STEPFN = {0: step_carpet, 1: step_marble, 2: step_wood, 3: step_stone, 4: step_carpet}
steps = np.zeros(N, np.float32)
nstep = 0
try:
    with open(sys.argv[1]) as f:
        for line in f:
            p = line.split()
            if not p or p[0] != 'STEP':
                continue
            at, surf, run = float(p[1]), int(p[2]), int(p[3])
            lv = (0.55 if run else 0.26)*(0.80 + 0.40*rng.random())
            place(steps, STEPFN.get(surf, step_carpet)(lv, seed=nstep), at)
            nstep += 1
except (IndexError, FileNotFoundError):
    print('  (no events file: no footsteps)', file=sys.stderr)
print(f'  {nstep} footfalls', file=sys.stderr)
mix += steps*0.55
mix += convolve_seg(steps, hall, T_MALL, T_SILENT, 1.1)
mix += convolve_seg(steps, ir_reverb(1.5, damp=2400.0), T_STAND, T_MALL, 0.55)
mix += convolve_seg(steps, ir_reverb(2.2, damp=2000.0), T_STAIR, T_VOID, 0.85)
dbg('steps', steps, 40, 60)

# breathing: nothing until they see it, and then everything
print('  breath...', file=sys.stderr)
def breath_one(dur, level, inhale=True, bright=1500.0):
    n = int(dur*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 220.0, bright)
    sh = np.sin(np.pi*np.clip(tt/dur, 0, 1))**(1.4 if inhale else 0.8)
    if inhale:
        x *= np.linspace(0.5, 1.4, n).astype(np.float32)
    else:
        x *= np.linspace(1.4, 0.5, n).astype(np.float32)
    x += 0.20*np.sin(2*np.pi*95.0*tt)*sh*(0.4 if inhale else 1.0)
    return (x*sh*level).astype(np.float32)

breath = np.zeros(N, np.float32)
ph = T_SILENT + 1.0
while ph < T_LUNGE:
    rate = 3.6 - 1.5*min(1.0, max(0.0, (ph - T_WARP)/(T_LUNGE - T_WARP)))
    lv = 0.075 + 0.130*min(1.0, max(0.0, (ph - T_STARE)/(T_LUNGE - T_STARE)))
    place(breath, breath_one(rate*0.34, lv, True, 1700.0), ph)
    place(breath, breath_one(rate*0.40, lv*0.8, False, 1300.0), ph + rate*0.42)
    ph += rate
ph = T_RUN
while ph < T_VOID:
    place(breath, breath_one(0.16, 0.20, True, 2400.0), ph)
    place(breath, breath_one(0.19, 0.16, False, 1800.0), ph + 0.20)
    ph += 0.46
mix += breath
dbg('breath', breath, 200, 218)

# ================================================== twenty seconds of nothing
# and then twenty seconds of something. Whispers are the only wide thing in an
# otherwise mono mix, because they are not in the building.
print('  whispers...', file=sys.stderr)
def whisper(dur, level, seed=0, back=False):
    n = int(dur*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    src = bp(rng.standard_normal(n).astype(np.float32), 120.0, 5200.0)
    # syllables: a ragged gate that is never quite periodic
    g = np.zeros(n, np.float32)
    p = 0.0
    while p < dur:
        d = 0.055 + 0.11*rng.random()
        i0, i1 = int(p*SR), int(min(p+d, dur)*SR)
        if i1 > i0:
            k = np.arange(i1-i0, dtype=np.float32)/max(i1-i0, 1)
            g[i0:i1] = np.sin(np.pi*k)**0.7
        p += d + 0.02 + 0.09*rng.random()
    out = np.zeros(n, np.float32)
    for (fc, bw, a) in ((520.0, 190.0, 1.0), (1350.0, 300.0, 0.62),
                        (2600.0, 520.0, 0.34), (3600.0, 700.0, 0.16)):
        wob = 1.0 + 0.05*np.sin(2*np.pi*(0.7 + seed*0.3)*tt)
        out += a*bp(src, fc*0.8, fc*1.25)*wob
    out *= g
    if back:
        out = out[::-1].copy()
    return (out*level).astype(np.float32)

wsp_mid = np.zeros(N, np.float32)
wsp_sid = np.zeros(N, np.float32)
for k in range(16):
    at = T_WARP - 1.0 + rng.random()*(T_LUNGE + 3.0 - T_WARP)
    d = 0.7 + 1.9*rng.random()
    w = whisper(d, 0.055 + 0.075*rng.random(), seed=k, back=(rng.random() < 0.4))
    pan = (rng.random()*2.0 - 1.0)*0.95
    place(wsp_mid, w*float(np.sqrt(1.0 - abs(pan)*0.5)), at)
    place(wsp_sid, w*pan, at)
wenv = env([(T_WARP - 1.5, 0.0), (T_WARP + 1.0, 0.7), (T_LUNGE, 1.0),
            (T_RUN + 4.0, 0.55), (T_STAIR, 0.20), (T_VOID, 0.10), (T_LAND, 0.0)])
mix  += wsp_mid*wenv
side += wsp_sid*wenv*1.20
dbg('whisper', wsp_mid*wenv, 198, 218)

# the music comes back the wrong way round, slurred, underneath the whispers
print('  the music, backwards...', file=sys.stderr)
rev = np.zeros(N, np.float32)
i0, i1 = int((T_WARP - 2.0)*SR), int((T_LUNGE + 1.2)*SR)
srcseg = muzak[i0:i1][::-1].copy()
# resampled at a falling rate, so it sags as it goes
m = i1 - i0
rate = np.linspace(1.0, 0.62, m).astype(np.float64)
pos = np.cumsum(rate)
pos = pos*( (m-1)/pos[-1] )
rev[i0:i1] = np.interp(pos, np.arange(m), srcseg).astype(np.float32)
rev = lp(rev, 2600.0)
mix += rev*env([(T_WARP - 2.0, 0.0), (T_WARP + 2.0, 0.30), (T_LUNGE, 0.55),
                (T_LUNGE + 1.4, 0.0)])*0.9

# the crystal on every chandelier in the place, moving
print('  crystal...', file=sys.stderr)
cryst = np.zeros(N, np.float32)
for _ in range(900):
    at = T_WARP + rng.random()*(T_STAIR - T_WARP)
    n = int(0.09*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    f = 3200.0 + 5200.0*rng.random()
    c = (np.sin(2*np.pi*f*tt) + 0.5*np.sin(2*np.pi*f*2.7*tt))*np.exp(-tt/0.022)
    place(cryst, (c*0.016*rng.random()).astype(np.float32), at)
mix += cryst*env([(T_WARP, 0.0), (T_WARP + 2.0, 0.8), (T_LUNGE, 1.0),
                  (T_RUN + 2.0, 1.0), (T_STAIR, 0.25), (T_STAIR + 2.0, 0.0)])

# ============================================== and then it comes for the lens
print('  the drone...', file=sys.stderr)
drone = np.zeros(N, np.float32)
d0, d1 = T_LUNGE - 0.35, T_VOID
i0, i1 = int(d0*SR), int(d1*SR)
tt = np.arange(i1-i0, dtype=np.float32)/SR
f = 27.0 + 16.0*np.clip(tt/6.0, 0, 1) + 3.0*np.sin(2*np.pi*0.31*tt)
phz = 2*np.pi*np.cumsum(f)/SR
d = np.sin(phz) + 0.42*np.sin(2*phz) + 0.16*np.sin(3*phz + 1.1)
d = np.tanh(d*1.8).astype(np.float32)
# it tears, rather than sounds
d *= (1.0 + 0.28*bp(rng.standard_normal(len(d)).astype(np.float32), 30, 400))
drone[i0:i1] = d
mix += drone*env([(d0, 0.0), (T_LUNGE, 0.42), (T_LUNGE + 0.6, 0.30),
                  (T_RUN, 0.20), (T_STAIR, 0.22), (T_SERV, 0.26),
                  (T_VOID - 1.0, 0.34), (T_VOID, 0.0)])

# what is behind them: too heavy, lands too often, and never stops
print('  the thing behind...', file=sys.stderr)
def stomp(level, seed=0):
    n = int(0.75*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    x = 1.10*np.sin(2*np.pi*46.0*np.exp(-tt*2.2)*tt)*np.exp(-tt/0.075)
    x += 0.70*np.sin(2*np.pi*31.0*tt)*np.exp(-tt/0.110)
    # the crack of something structural in it
    for f in (215.0, 397.0, 703.0, 1180.0):
        x += 0.20*np.sin(2*np.pi*f*tt + seed)*np.exp(-tt/0.030)
    x += 0.55*lp(rng.standard_normal(n).astype(np.float32), 900.0)*np.exp(-tt/0.020)
    # and the drag afterwards
    x += 0.14*bp(rng.standard_normal(n).astype(np.float32), 700, 5000)*np.exp(-(tt-0.09)**2/0.004)
    return (x*level).astype(np.float32)

behind = np.zeros(N, np.float32)
ph = T_LUNGE + 0.55
k = 0
while ph < T_LAND:
    close = np.clip((ph - T_LUNGE)/58.0, 0.0, 1.0)
    lv = 0.30 + 0.55*close
    if ph > T_VOID:
        lv *= 0.4
    place(behind, stomp(lv, seed=k), ph)
    ph += 0.395 - 0.075*close        # too often, and getting worse
    k += 1
mix += behind*0.47
mix += convolve_seg(behind, ir_reverb(1.8, damp=1800.0), T_LUNGE, T_VOID, 0.7)
dbg('behind', behind, 230, 250)

# glass coming down out of the fittings
print('  glass...', file=sys.stderr)
glass = np.zeros(N, np.float32)
for _ in range(150):
    at = T_RUN + 1.0 + rng.random()*(T_STAIR - T_RUN - 2.0)
    n = int(0.55*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    g = np.zeros(n, np.float32)
    for _j in range(int(6 + 14*rng.random())):
        o = int(rng.random()*0.30*SR)
        f = 2600.0 + 6500.0*rng.random()
        m = int(0.10*SR)
        u = np.arange(m, dtype=np.float32)/SR
        s = (np.sin(2*np.pi*f*u) + 0.4*np.sin(2*np.pi*f*1.9*u))*np.exp(-u/0.018)
        if o + m <= n:
            g[o:o+m] += s*(0.4 + 0.6*rng.random())
    place(glass, (g*0.055*(0.4 + rng.random())).astype(np.float32), at)
mix += glass*env([(T_RUN, 0.0), (T_RUN + 1.5, 1.0), (T_STAIR - 1.0, 1.0),
                  (T_STAIR, 0.0)])

# lift doors, opening onto nothing, whenever the lens goes past one
print('  lifts...', file=sys.stderr)
lifts = np.zeros(N, np.float32)
ph = T_RUN + 1.4
while ph < T_STAIR:
    n = int(1.30*SR)
    tt = np.arange(n, dtype=np.float32)/SR
    # the motor, and the leaves parting
    mo = bp(rng.standard_normal(n).astype(np.float32), 300, 2600)
    mo *= np.clip(np.sin(np.pi*np.clip(tt/0.85, 0, 1)), 0, 1)**1.3
    mo += 0.30*np.sin(2*np.pi*112.0*tt)*np.clip(np.sin(np.pi*np.clip(tt/0.85,0,1)),0,1)
    # and the clunk at the end of the track
    cl = np.zeros(n, np.float32)
    j = int(0.86*SR)
    u = np.arange(n-j, dtype=np.float32)/SR
    cl[j:] = (lp(rng.standard_normal(n-j).astype(np.float32), 1200.0)
              + 0.5*np.sin(2*np.pi*88.0*u))*np.exp(-u/0.055)
    place(lifts, ((mo*0.055 + cl*0.10)).astype(np.float32), ph)
    ph += 2.1 + 2.6*rng.random()
mix += lifts

# ============================================================== and no floor
print('  the fall...', file=sys.stderr)
fall = np.zeros(N, np.float32)
i0, i1 = int(T_VOID*SR), int(T_LAND*SR)
n = i1 - i0
tt = np.arange(n, dtype=np.float32)/SR
w = bp(rng.standard_normal(n).astype(np.float32), 60.0, 9000.0)
w *= (0.25 + 1.5*np.clip(tt/1.8, 0, 1)**1.4)
w += 0.6*lp(rng.standard_normal(n).astype(np.float32), 140.0)*3.0*np.clip(tt/1.2, 0, 1)
fall[i0:i1] = w*0.10
# the tape has nothing to read off the surface either
fall[i0:i1] += bp(rng.standard_normal(n).astype(np.float32), 2000, 12000)*0.055
mix += fall

# it lands on the carpet
imp = np.zeros(N, np.float32)
n = int(1.4*SR)
tt = np.arange(n, dtype=np.float32)/SR
x = 1.4*np.sin(2*np.pi*58.0*np.exp(-tt*3.0)*tt)*np.exp(-tt/0.055)
x += 0.9*lp(rng.standard_normal(n).astype(np.float32), 700.0)*np.exp(-tt/0.030)
x += 0.35*bp(rng.standard_normal(n).astype(np.float32), 900, 6000)*np.exp(-tt/0.012)
place(imp, (x*0.55).astype(np.float32), T_LAND)
# and once more, softer, as it settles
place(imp, (x*0.20).astype(np.float32), T_LAND + 0.62)
# the deck complains about it
place(imp, (bp(rng.standard_normal(int(0.5*SR)).astype(np.float32), 1500, 8000)
            * np.exp(-np.arange(int(0.5*SR), dtype=np.float32)/SR/0.09)*0.09), T_LAND + 0.02)
mix += imp

# ==================================================================== the tape
# --- wow and flutter: the transport is not steady, and it is worse when the
#     building is not either
print('  tape...', file=sys.stderr)
warp = (0.0021*np.sin(2*np.pi*0.55*t) + 0.0011*np.sin(2*np.pi*1.7*t + 1.0)
        + 0.0007*np.sin(2*np.pi*7.3*t + 2.0) + 0.0004*np.sin(2*np.pi*11.1*t))
warp += 0.012*np.exp(-((t - (T_SILENT + 0.4))/1.3)**2)*np.sin(2*np.pi*6*t)
warp += 0.013*np.exp(-((t - (T_LUNGE + 0.7))/1.2)**2)*np.sin(2*np.pi*9*t)
warp += 0.015*np.exp(-((t - (T_VOID - 2.5))/3.0)**2)*np.sin(2*np.pi*5*t)
idx = np.arange(N, dtype=np.float64) + np.cumsum(warp.astype(np.float64))*3.0
idx = np.clip(idx, 0, N-1)
mix = np.interp(idx, np.arange(N), mix).astype(np.float32)

# --- band limiting: a camcorder microphone on a linear track
mix = hp(mix, 56, order=2)
mix = lp(mix, 9200, order=6)

# --- saturation
mix = np.tanh(mix*1.9).astype(np.float32)/1.9

# --- dropouts, on the same frames the picture tears
drop_env = np.ones(N, np.float32)
def tear(at, dur, depth=0.85):
    i0, i1 = int(at*SR), int((at+dur)*SR)
    if i0 >= N:
        return
    drop_env[i0:min(i1, N)] *= (1.0 - depth)
for a in [17.0, 19.7, 72.1, 178.1, 198.4, 219.6, 248.3, 272.3, 289.9, 292.6]:
    tear(a, 0.05 + 0.06*rng.random())
for a in [202.6, 207.1, 211.5, 215.1, 218.4]:
    tear(a, 0.035, 0.7)
_tears = np.arange(T_RUN, T_VOID, 7.0)
for a in _tears + rng.random(len(_tears))*5.0:
    tear(float(a), 0.018, 0.6)
mix *= lp(drop_env, 5000)

# --- hiss. Between 2:58 and 3:18 it is the whole track, which is the point:
#     silence on a tape is not silence, it is this.
hiss = bp(noise(), 900, 9000)*0.0126
hiss += lp(noise(), 200)*0.0034
hiss_env = env([(0.0, 1.0), (T_SILENT - 0.02, 1.0), (T_SILENT + 0.4, 1.75),
                (T_WARP, 1.60), (T_LUNGE, 1.15), (T_RUN, 1.0),
                (T_VOID - 0.5, 1.0), (T_VOID + 0.2, 2.9), (T_LAND, 2.9),
                (T_LAND + 1.6, 1.0), (T_END, 1.0)], smooth=0.05)
mix += hiss*hiss_env
# mains creeping into the audio head
mix += (0.0021*np.sin(2*np.pi*60*t) + 0.0011*np.sin(2*np.pi*180*t)).astype(np.float32)

# --- level
peak = float(np.abs(mix).max())
mix = (mix/peak*0.86).astype(np.float32)

# --- out: near mono, the way a camcorder recorded it, except for the things
#          that were never in the building
dbg('mix', mix, 60.0, 90.0)
dbg('mix', mix, 182.0, 196.0)
dbg('mix', mix, 230.0, 246.0)
sd = lp(noise(), 6000)*0.0016 + side*1.15
sd *= 0.86/peak
L = np.clip(mix + sd, -1, 1)
R = np.clip(mix - sd, -1, 1)
stereo = np.stack([L, R], axis=1)

out_path = sys.argv[2] if len(sys.argv) > 2 else 'audio.wav'
pcm = (stereo*32767.0).astype(np.int16)
import wave
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'wrote {out_path}: {N/SR:.2f}s, {nstep} footfalls, peak {peak:.3f}')

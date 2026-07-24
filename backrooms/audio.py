#!/usr/bin/env python3
"""
audio.py -- sound design for the found-footage tape.

Everything is synthesised from noise and oscillators; footsteps are placed from
the event times the renderer wrote out, so the feet land on the frames the
camera bobs on. The whole thing then goes through a tape chain: wow, flutter,
band limiting, saturation and dropouts.

    python3 audio.py events.txt audio.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR   = 44100
DUR  = 300.0
N    = int(SR * DUR)
rng  = np.random.default_rng(0xBAC4200D)

# the timeline, matching bk_main.c
T_CRT, T_WANDER, T_TRANS, T_DOOR = 20.0, 92.0, 112.0, 128.0
T_PAN, T_ENT, T_TURN             = 158.0, 172.0, 176.0
T_SPR1, T_SPR0, T_VOID, T_END    = 228.0, 284.0, 292.0, 300.0
T_SILENCE = 150.0        # the room noise stops
T_SCREECH = 172.05
T_IMPACT  = 293.15

t = np.arange(N, dtype=np.float32) / SR


# ----------------------------------------------------------------- utilities
def lp(x, f, order=4):
    return sosfilt(butter(order, min(f, SR*0.49), 'low', fs=SR, output='sos'), x).astype(np.float32)

def hp(x, f, order=4):
    return sosfilt(butter(order, max(f, 5.0), 'high', fs=SR, output='sos'), x).astype(np.float32)

def bp(x, f0, f1, order=4):
    f1 = min(f1, SR*0.49)
    return sosfilt(butter(order, [max(f0, 5.0), f1], 'band', fs=SR, output='sos'), x).astype(np.float32)

def noise(n=None):
    return rng.standard_normal(N if n is None else n).astype(np.float32)

def set_rms(x, target=1.0):
    """normalise a bed layer so its envelope can be read as a level in dB"""
    r = float(np.sqrt((x.astype(np.float64)**2).mean()))
    return (x * (target/(r + 1e-12))).astype(np.float32)

def env(points, smooth=0.0):
    """piecewise-linear envelope from (time, value) breakpoints"""
    xs = np.array([p[0] for p in points], dtype=np.float64)
    ys = np.array([p[1] for p in points], dtype=np.float64)
    e = np.interp(t, xs, ys).astype(np.float32)
    if smooth > 0:
        k = int(SR*smooth) | 1
        e = np.convolve(e, np.ones(k, np.float32)/k, mode='same').astype(np.float32)
    return e

def place(dst, src, at):
    """mix a one-shot into the timeline at a given time"""
    i = int(at*SR)
    if i < 0:
        src = src[-i:]; i = 0
    if i >= N or len(src) == 0:
        return
    n = min(len(src), N - i)
    dst[i:i+n] += src[:n]

def ir_reverb(seconds, predelay=0.0, damp=4000.0, density=1.0):
    """synthetic impulse response: decaying, filtered noise"""
    n = int(seconds*SR)
    x = rng.standard_normal(n).astype(np.float32)
    d = np.exp(-np.arange(n, dtype=np.float32)/(seconds*SR/5.5))
    x *= d
    # thin it out early so it does not sound like a noise burst
    sparse = (rng.random(n) < (0.02 + 0.98*np.linspace(0, 1, n)**0.4) * density)
    x *= sparse
    x = lp(x, damp)
    x[:int(SR*0.002)] = 0.0
    if predelay > 0:
        x = np.concatenate([np.zeros(int(predelay*SR), np.float32), x])
    return (x / (np.sqrt((x.astype(np.float64)**2).sum()) + 1e-9)).astype(np.float32)

def convolve_seg(x, ir, t0, t1, wet):
    """apply reverb to one stretch of the timeline only"""
    i0, i1 = int(t0*SR), min(int(t1*SR) + len(ir), N)
    seg = np.zeros(i1 - i0, np.float32)
    seg[:min(int(t1*SR), N) - i0] = x[i0:min(int(t1*SR), N)]
    wetsig = fftconvolve(seg, ir)[:len(seg)].astype(np.float32)
    out = np.zeros(N, np.float32)
    out[i0:i0+len(wetsig)] += wetsig[:N-i0] * wet
    return out


mix = np.zeros(N, np.float32)


# =========================================================== the room is loud
# Fluorescent ballasts: mains hum at twice line frequency, its harmonics, and
# the gassy crackle of tubes that should have been changed years ago.
# Every frequency is an integer, so the bed is phase-continuous across the loop.
buzz  = 0.50*np.sin(2*np.pi*120*t)
buzz += 0.34*np.sin(2*np.pi*240*t + 1.1)
buzz += 0.22*np.sin(2*np.pi*360*t + 2.3)
buzz += 0.13*np.sin(2*np.pi*600*t + 0.4)
buzz += 0.08*np.sin(2*np.pi*840*t + 1.7)
buzz += 0.05*np.sin(2*np.pi*1080*t + 2.9)
buzz *= (1.0 + 0.14*np.sin(2*np.pi*3*t) + 0.07*np.sin(2*np.pi*7*t))
# the dying tube: gated hiss bursts riding on the hum
crackle = bp(noise(), 1800, 7000)
gate = (np.sin(2*np.pi*120*t) > 0.62).astype(np.float32)
gate *= (lp(noise(), 3.0)*40.0).clip(0, 1)
buzz += 0.30*crackle*gate
buzz = set_rms(buzz.astype(np.float32))

buzz_env = env([
    (0.0, 0.048), (T_CRT, 0.048), (T_WANDER, 0.052), (100.0, 0.040),
    (112.0, 0.008), (T_DOOR, 0.004), (T_SILENCE - 0.05, 0.004),
    (T_SILENCE, 0.0), (T_TURN, 0.0), (T_TURN + 1.0, 0.010),
    (T_SPR1, 0.016), (T_SPR1 + 3.0, 0.046), (T_SPR0 - 1.0, 0.052),
    (T_SPR0, 0.0), (T_VOID, 0.0), (T_VOID + 1.6, 0.048), (T_END, 0.048),
], smooth=0.05)
mix += buzz * buzz_env

# room tone: air, carpet, the pressure of a building with no outside
# brown-ish, but bounded: a running sum wanders off and takes the mix with it
tone = lp(noise(), 240)*1.0 + lp(noise(), 55)*1.6
tone = set_rms(hp(tone, 34))
tone_env = env([
    (0.0, 0.016), (T_WANDER, 0.016), (T_TRANS, 0.020), (T_DOOR, 0.026),
    (T_SILENCE - 0.05, 0.026), (T_SILENCE, 0.0), (T_TURN, 0.0),
    (T_TURN + 0.8, 0.024), (T_SPR0, 0.024), (T_SPR0 + 0.2, 0.0),
    (T_VOID, 0.0), (T_VOID + 1.4, 0.016), (T_END, 0.016),
], smooth=0.08)
mix += tone * tone_env

# CRT: flyback whine plus the soft static of a tube with nothing tuned in
crt = 0.030*np.sin(2*np.pi*7875*t) + 0.014*np.sin(2*np.pi*15750*t)
crt += 0.020*bp(noise(), 2000, 9000)
crt = set_rms(crt.astype(np.float32), 0.030)
crt_env = env([(0.0, 1.0), (8.0, 0.85), (16.0, 0.75), (20.0, 0.35), (24.0, 0.0),
               (T_VOID + 2.2, 0.0), (T_VOID + 3.0, 0.9), (T_END, 1.0)], smooth=0.1)
# louder the closer the lens gets to the glass
crt_prox = env([(0.0, 0.55), (5.5, 0.55), (7.4, 0.8), (12.6, 1.15), (16.6, 1.3),
                (18.0, 0.7), (20.0, 0.35), (24.0, 0.0), (T_END, 0.0)], smooth=0.1)
mix += crt * crt_env * crt_prox


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
# picked up off the carpet at 5.6 s
place(handling, rustle(0.55, 0.20, 3500), 5.58)
place(handling, thump(0.10, 130, 0.13, 0.05), 5.62)
place(handling, rustle(0.9, 0.11, 2200), 6.1)
place(handling, thump(0.08, 190, 0.07, 0.04), 6.55)
for tt in [7.6, 8.9, 10.4, 11.8, 13.9, 15.2]:
    place(handling, rustle(0.35, 0.045 + 0.02*rng.random(), 2600), tt)
# the zoom rocker: a little servo, jabbed at
for a, b in [(12.6, 13.3), (13.3, 13.9), (13.9, 14.5), (14.5, 15.0),
             (15.5, 16.0), (16.0, 16.6)]:
    n = int((b-a)*SR)
    tt = np.arange(n)/SR
    f = 2400 + 900*np.sin(2*np.pi*0.8*tt) + 300*rng.random()
    servo = 0.010*np.sin(2*np.pi*f*tt) + 0.006*bp(rng.standard_normal(n).astype(np.float32), 1500, 5000)
    servo *= np.minimum(1, np.linspace(0, 20, n))*np.minimum(1, np.linspace(20, 0, n))
    place(handling, servo.astype(np.float32), a)
mix += handling


# =============================================================== the footsteps
def step_carpet(level, seed):
    n = int(0.16*SR)
    x = rng.standard_normal(n).astype(np.float32)
    x = lp(x, 700 + 200*rng.random())
    e = np.exp(-np.linspace(0, 9, n))
    body = np.sin(2*np.pi*68*np.arange(n)/SR)*np.exp(-np.linspace(0, 14, n))*0.55
    return ((x*e + body)*level).astype(np.float32)

def step_concrete(level, seed):
    n = int(0.22*SR)
    x = rng.standard_normal(n).astype(np.float32)
    x = bp(x, 220, 5200)
    e = np.exp(-np.linspace(0, 13, n))
    e[:int(0.004*SR)] *= np.linspace(0, 1, int(0.004*SR))
    body = np.sin(2*np.pi*92*np.arange(n)/SR)*np.exp(-np.linspace(0, 18, n))*0.45
    return ((x*e + body)*level).astype(np.float32)

def step_grate(level, seed):
    n = int(0.30*SR)
    tt = np.arange(n)/SR
    x = bp(rng.standard_normal(n).astype(np.float32), 900, 9000)*np.exp(-tt*22)
    for f, a in [(740, 0.5), (1230, 0.34), (2170, 0.22), (3310, 0.12)]:
        x += a*np.sin(2*np.pi*f*(1 + 0.01*rng.random())*tt)*np.exp(-tt*11)
    return (x*level*0.5).astype(np.float32)

steps = np.zeros(N, np.float32)
chase = np.zeros(N, np.float32)
ev_path = sys.argv[1] if len(sys.argv) > 1 else 'events.txt'
step_times = []
try:
    for line in open(ev_path):
        p = line.split()
        if len(p) == 4 and p[0] == 'STEP':
            step_times.append((float(p[1]), int(p[2]), int(p[3])))
except FileNotFoundError:
    print('no event file; footsteps will be missing', file=sys.stderr)

# Between walking out onto the catwalk and turning to run, they do not move.
# Idle drift in the camera path must not put feet on the floor.
step_times = [s for s in step_times if not (129.0 < s[0] < T_SCREECH)]

for i, (ts, surf, run) in enumerate(step_times):
    lvl = (0.34 if run else 0.15) * (0.82 + 0.36*rng.random())
    if surf == 2:
        s = step_grate(lvl*1.1, i)
    elif surf == 1:
        s = step_concrete(lvl*1.15, i)
    else:
        s = step_carpet(lvl, i)
    place(steps, s, ts - 0.02)

# Something is keeping pace. Its steps land between the operator's own, close
# enough to be inside the same corridor.
for ts, surf, run in step_times:
    if not run or ts < T_TURN + 5.0 or ts > T_SPR0 - 0.5:
        continue
    lag = 0.34 - 0.16*min(1.0, (ts - T_TURN)/95.0)     # it gains on them
    lvl = 0.13 + 0.15*min(1.0, (ts - T_TURN)/95.0)
    s = step_concrete(lvl, 0) if surf == 1 else step_carpet(lvl*1.5, 0)
    place(chase, s, ts + lag)
chase += convolve_seg(chase, ir_reverb(0.55, 0.012, 2600), T_TURN, T_SPR0, 1.10)
mix += steps + chase*0.9


# ==================================================================== breathing
breath = np.zeros(N, np.float32)
def breath_one(dur, level, inhale=True, bright=1500):
    n = int(dur*SR)
    x = bp(rng.standard_normal(n).astype(np.float32), 180, bright)
    e = np.sin(np.linspace(0, np.pi, n))**(1.4 if inhale else 0.8)
    return (x*e*level).astype(np.float32)

# calm while walking
tb = 21.0
while tb < T_SILENCE:
    place(breath, breath_one(1.1, 0.016, True, 1200), tb)
    place(breath, breath_one(1.3, 0.013, False, 900), tb + 1.5)
    tb += 4.6 + rng.random()*1.2
# held breath through the silence, then nothing but breathing
tb = T_TURN + 0.4
while tb < T_VOID:
    hard = min(1.0, (tb - T_TURN)/40.0)
    place(breath, breath_one(0.30, 0.075 + 0.05*hard, True, 2600), tb)
    place(breath, breath_one(0.34, 0.060 + 0.05*hard, False, 1900), tb + 0.36)
    tb += 0.80 - 0.12*hard + rng.random()*0.06
mix += breath

# heartbeat, once the running starts
heart = np.zeros(N, np.float32)
tb = T_ENT
while tb < T_VOID:
    bpmt = 96 + 62*min(1.0, max(0.0, (tb - T_ENT)/30.0))
    per = 60.0/bpmt
    place(heart, thump(0.22, 52, 0.085), tb)
    place(heart, thump(0.26, 44, 0.060), tb + per*0.34)
    tb += per
mix += lp(heart, 180)


# ========================================================= water, pipes, doors
drips = np.zeros(N, np.float32)
def drip(level, f):
    n = int(0.30*SR)
    tt = np.arange(n)/SR
    x = np.sin(2*np.pi*f*(1 + 6.0*np.exp(-tt*90))*tt)*np.exp(-tt*26)
    x += 0.4*bp(rng.standard_normal(n).astype(np.float32), 1500, 8000)*np.exp(-tt*90)
    return (x*level).astype(np.float32)

td = 93.0
while td < T_DOOR:
    place(drips, drip(0.055 + 0.04*rng.random(), 900 + 700*rng.random()), td)
    td += 0.9 + rng.random()*2.2
td = T_TURN + 2.0
while td < T_SPR1:
    place(drips, drip(0.035, 800 + 900*rng.random()), td)
    td += 2.5 + rng.random()*3.5
drips += convolve_seg(drips, ir_reverb(1.4, 0.02, 3200), 92.0, T_SPR1, 1.10)
mix += drips

# the fire door: hinge, then the weight of it
door = np.zeros(N, np.float32)
n = int(1.5*SR); tt = np.arange(n)/SR
groan = np.sin(2*np.pi*(140 - 55*tt/1.5)*tt)*np.exp(-tt*1.4)
groan += 0.5*np.sin(2*np.pi*(213 - 70*tt/1.5)*tt + 1.0)*np.exp(-tt*1.9)
groan *= (0.5 + 0.5*np.sin(2*np.pi*17*tt))          # it drags
groan += 0.30*bp(rng.standard_normal(n).astype(np.float32), 600, 4000)*np.exp(-tt*2.4)
place(door, (groan*0.115).astype(np.float32), 112.35)
place(door, thump(0.5, 74, 0.180, 0.110), 112.30)
place(door, thump(0.9, 58, 0.150, 0.070), 114.30)     # it swings back against the wall
# and again, shoved through from the other side, running
place(door, (groan*0.100).astype(np.float32), 175.85)
place(door, thump(0.55, 70, 0.190, 0.140), 175.95)
door += convolve_seg(door, ir_reverb(3.0, 0.03, 2600), 112.0, 118.0, 1.10)
mix += door


# ====================================================== the shaft, and its size
# A volume this big has no sound of its own. It has pressure, and it has
# whatever is moving in the far end of it.
air = bp(noise(), 40, 900)
air = set_rms(air*(0.6 + 0.4*lp(noise(), 0.4)*12).clip(0.2, 1.6))
sub = 0.6*np.sin(2*np.pi*31*t) + 0.4*np.sin(2*np.pi*47*t + 0.7) + 0.25*np.sin(2*np.pi*22*t)
sub = set_rms((sub*(1.0 + 0.35*np.sin(2*np.pi*0.13*t))).astype(np.float32))
atrium_env = env([
    (T_TRANS - 2.0, 0.0), (113.0, 0.35), (T_DOOR, 1.0), (T_SILENCE - 0.05, 1.0),
    (T_SILENCE, 0.0), (T_END, 0.0),
], smooth=0.12)
mix += (air*0.038 + sub*0.030) * atrium_env

# distant structural groans, arriving with a lot of reverb in front of them
groans = np.zeros(N, np.float32)
for tg in [117.5, 124.0, 131.5, 139.0, 143.5]:
    n = int(3.2*SR); tt = np.arange(n)/SR
    f0 = 55 + 90*rng.random()
    g = np.sin(2*np.pi*f0*(1 - 0.12*tt/3.2)*tt)*np.exp(-tt*0.9)
    g += 0.45*np.sin(2*np.pi*f0*2.03*(1 - 0.1*tt/3.2)*tt + 0.6)*np.exp(-tt*1.3)
    g *= (0.6 + 0.4*np.sin(2*np.pi*(2 + 4*rng.random())*tt))
    place(groans, (g*0.030).astype(np.float32), tg)
groans += convolve_seg(groans, ir_reverb(4.5, 0.05, 1800), 115.0, T_SILENCE, 1.60)
mix += groans


# ================================================ the silence, and what ends it
# Between 150 and 172 there is nothing but the tape. The floor of the mix drops
# out entirely, which is far more frightening than any sound would be.
dread = np.sin(2*np.pi*27*t)*0.5 + np.sin(2*np.pi*41*t + 2.0)*0.3
dread_env = env([(T_SILENCE, 0.0), (158.0, 0.0), (166.0, 0.012),
                 (T_SCREECH - 0.4, 0.05), (T_SCREECH, 0.0), (T_END, 0.0)], smooth=0.2)
mix += dread * dread_env

# --- the screech -----------------------------------------------------------
scr_len = 4.6
n = int(scr_len*SR); tt = np.arange(n)/SR
# inharmonic FM with a modulation index that never settles
mod = np.sin(2*np.pi*233*tt) + 0.6*np.sin(2*np.pi*517*tt)
idx = 12.0*np.exp(-tt*0.9) + 3.0
carr = 1470 * (1 + 0.6*np.exp(-tt*2.5)) * (1 - 0.55*tt/scr_len)
scream = np.sin(2*np.pi*carr*tt + idx*mod)
# a second voice, ring-modulated against it
scream += 0.7*np.sin(2*np.pi*carr*1.503*tt + idx*0.7*mod)*np.sin(2*np.pi*61*tt)
# torn noise on top
scream += 1.1*bp(rng.standard_normal(n).astype(np.float32), 900, 11000) * np.exp(-tt*1.6)
scream += 0.8*bp(rng.standard_normal(n).astype(np.float32), 120, 700) * np.exp(-tt*0.8)
sc_env = np.exp(-tt*0.75)
sc_env[:int(0.012*SR)] *= np.linspace(0, 1, int(0.012*SR))
scream = np.tanh(scream*sc_env*2.4)*0.34
screech = np.zeros(N, np.float32)
place(screech, scream.astype(np.float32), T_SCREECH)
# and a sub-drop underneath it, so it is felt as much as heard
n2 = int(2.4*SR); t2 = np.arange(n2)/SR
drop = np.sin(2*np.pi*(150*np.exp(-t2*1.7) + 24)*t2)*np.exp(-t2*1.1)
place(screech, (drop*0.26).astype(np.float32), T_SCREECH)
screech += convolve_seg(screech, ir_reverb(3.6, 0.02, 5000), T_SCREECH - 0.1, T_SCREECH + 5.0, 1.00)
mix += screech


# ================================================== running, and the pressure
# A low pulse that tracks the panic without ever becoming music.
pulse = np.zeros(N, np.float32)
tp = T_TURN
while tp < T_SPR0:
    rate = 0.62 - 0.20*min(1.0, (tp - T_TURN)/100.0)
    n = int(rate*SR); tt = np.arange(n)/SR
    p = np.sin(2*np.pi*(38 + 8*np.sin(tp))*tt)*np.exp(-tt*4.5)
    place(pulse, (p*0.075).astype(np.float32), tp)
    tp += rate
mix += lp(pulse, 220)

# corridor reverb on the running footsteps
mix += convolve_seg(steps, ir_reverb(0.8, 0.008, 3000), T_TURN, T_SPR0, 0.75)


# ============================================================ no floor, no room
# Everything the tape was carrying gets pulled down and replaced with the
# sound of the signal itself.
void = np.zeros(N, np.float32)
vn = int(9.0*SR); vt = np.arange(vn)/SR
roar = rng.standard_normal(vn).astype(np.float32)
roar = bp(roar, 30, 9000)
# the noise floor swallows everything, then thins out just before the landing
roar *= (np.minimum(1, vt*3.5) * np.exp(-np.maximum(0, vt - 6.2)*1.6)).astype(np.float32)
falling = np.sin(2*np.pi*(90*np.exp(-vt*0.42) + 17)*vt)
falling *= np.minimum(1, vt*1.2)*np.exp(-vt*0.16)
whoosh = bp(rng.standard_normal(vn).astype(np.float32), 200, 2600)
whoosh *= (np.sin(np.linspace(0, np.pi, vn))**1.6)
place(void, (roar*0.30 + falling*0.30 + whoosh*0.20).astype(np.float32), T_SPR0 - 0.15)
mix += void

# the landing
land = np.zeros(N, np.float32)
place(land, thump(0.9, 46, 0.80, 0.42), T_IMPACT)
place(land, rustle(0.35, 0.40, 1800), T_IMPACT)                 # carpet
place(land, thump(0.30, 210, 0.22, 0.30), T_IMPACT + 0.02)      # the body of the camera
place(land, thump(0.22, 320, 0.09, 0.14), T_IMPACT + 0.26)      # it bounces
place(land, rustle(0.5, 0.13, 1400), T_IMPACT + 0.30)
place(land, thump(0.18, 260, 0.05, 0.08), T_IMPACT + 0.62)
place(land, rustle(0.8, 0.06, 900), T_IMPACT + 0.70)
mix += land

# a few settling creaks so the last seconds are not dead
for tc, lv in [(296.2, 0.020), (297.9, 0.014)]:
    place(mix, rustle(0.5, lv, 1100), tc)


# ================================================================== the tape
# --- wow and flutter: the transport was never that good --------------------
warp = (0.0022*np.sin(2*np.pi*0.55*t) + 0.0011*np.sin(2*np.pi*1.7*t + 1.0)
        + 0.0007*np.sin(2*np.pi*7.3*t + 2.0) + 0.0004*np.sin(2*np.pi*11.1*t))
# extra scrape where the tape is damaged
warp += 0.010*np.exp(-((t - T_SCREECH - 0.6)/1.1)**2)*np.sin(2*np.pi*9*t)
warp += 0.014*np.exp(-((t - 287.0)/3.0)**2)*np.sin(2*np.pi*5*t)
idx = np.arange(N, dtype=np.float64) + np.cumsum(warp.astype(np.float64))*3.0
idx = np.clip(idx, 0, N-1)
mix = np.interp(idx, np.arange(N), mix).astype(np.float32)

# --- band limiting: this is a camcorder microphone on a linear track -------
mix = hp(mix, 62, order=2)
mix = lp(mix, 9200, order=6)

# --- saturation ------------------------------------------------------------
mix = np.tanh(mix*1.9).astype(np.float32)/1.9

# --- dropouts, keyed to the same moments the picture tears -----------------
drop_env = np.ones(N, np.float32)
def tear(at, dur, depth=0.85):
    i0, i1 = int(at*SR), int((at+dur)*SR)
    if i0 >= N: return
    i1 = min(i1, N)
    drop_env[i0:i1] *= (1.0 - depth)
for a in [19.9, 111.9, 149.95, 157.9, 227.7, 291.9]:
    tear(a, 0.05 + 0.06*rng.random())
_tears = np.arange(T_TURN, T_SPR0, 7.0)
for a in _tears + rng.random(len(_tears))*5.0:
    tear(float(a), 0.018, 0.6)
for a in np.arange(T_SCREECH, T_SCREECH+6.0, 0.42):
    tear(float(a), 0.03, 0.5)
mix *= lp(drop_env, 5000)

# --- tape hiss, and the head noise that never goes away --------------------
hiss = bp(noise(), 900, 9000) * 0.0125
hiss += lp(noise(), 200) * 0.0035
# the hiss survives the silence; that is what makes the silence read as tape
hiss_env = env([(0.0, 1.0), (T_SILENCE, 1.0), (T_SILENCE+0.02, 1.35),
                (T_TURN, 1.35), (T_TURN+0.5, 1.0), (T_SPR0, 1.0),
                (T_SPR0+0.3, 2.6), (T_VOID, 2.6), (T_VOID+1.2, 1.0), (T_END, 1.0)],
               smooth=0.05)
mix += hiss*hiss_env
# 60 Hz mains creeping into the audio head
mix += (0.0022*np.sin(2*np.pi*60*t) + 0.0011*np.sin(2*np.pi*180*t)).astype(np.float32)

# --- level -----------------------------------------------------------------
peak = float(np.abs(mix).max())
mix = (mix/peak*0.90).astype(np.float32)

# --- out: near-mono, the way a camcorder recorded it -----------------------
side = lp(noise(), 6000)*0.0016
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

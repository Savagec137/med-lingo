#!/usr/bin/env python3
"""Génère tous les sons de Blackwood par synthèse (aucun échantillon externe).

Usage : python3 tools/gen_audio.py [dossier_sortie]   (défaut : audio/)
Dépendances : numpy, scipy, soundfile (pip install numpy scipy soundfile)

Chaque son est une fonction ; les variantes s'appellent nom_1, nom_2...
Les boucles (ambiances, musiques…) sont rendues sans couture.
"""
import math
import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "audio")
rng = np.random.default_rng(1337)


# --------------------------------------------------------------------------
# Outils
# --------------------------------------------------------------------------

def n(dur):
    return int(round(dur * SR))


def t_axis(dur):
    return np.arange(n(dur)) / SR


def white(dur):
    return rng.standard_normal(n(dur))


def pink(dur):
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    x = signal.lfilter(b, a, white(dur))
    return x / (np.max(np.abs(x)) + 1e-9)


def brown(dur):
    x = np.cumsum(white(dur))
    x = hp(x, 15, 2)
    return x / (np.max(np.abs(x)) + 1e-9)


def _sos(kind, f, order):
    return signal.butter(order, f, kind, fs=SR, output="sos")


def lp(x, fc, order=4):
    return signal.sosfilt(_sos("low", min(fc, SR / 2 - 100), order), x)


def hp(x, fc, order=4):
    return signal.sosfilt(_sos("high", fc, order), x)


def bp(x, lo, hi, order=3):
    return signal.sosfilt(_sos("band", [lo, min(hi, SR / 2 - 100)], order), x)


def reson(x, f, q):
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x)


def env_exp(length, decay):
    return np.exp(-np.arange(length) / SR / max(decay, 1e-4))


def env_ad(dur, attack, decay):
    t = t_axis(dur)
    e = np.where(t < attack, t / max(attack, 1e-5), np.exp(-(t - attack) / max(decay, 1e-5)))
    return e


def phase_of(freq, dur):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n(dur),)) if np.ndim(freq) == 0 else np.asarray(freq, dtype=float)
    return 2 * np.pi * np.cumsum(f) / SR


def sine(freq, dur):
    return np.sin(phase_of(freq, dur))


def saw(freq, dur):
    return signal.sawtooth(phase_of(freq, dur))


def square(freq, dur, duty=0.5):
    return signal.square(phase_of(freq, dur), duty)


def sweep(f0, f1, dur, curve=1.0):
    t = np.linspace(0, 1, n(dur)) ** curve
    return f0 + (f1 - f0) * t


def fm(fc, fmod, index, dur):
    t = t_axis(dur)
    return np.sin(2 * np.pi * fc * t + index * np.sin(2 * np.pi * fmod * t))


def dist(x, drive=2.0):
    return np.tanh(x * drive) / np.tanh(drive)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def fade(x, fin=0.003, fout=0.02):
    x = x.copy()
    a = min(n(fin), len(x))
    b = min(n(fout), len(x))
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)
    if b > 0:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def pad(x, length):
    if len(x) >= length:
        return x[:length]
    return np.concatenate([x, np.zeros(length - len(x))])


def mix(*tracks):
    length = max(len(t) for t in tracks)
    out = np.zeros(length)
    for t in tracks:
        out[: len(t)] += t
    return out


def at(x, t0, total):
    out = np.zeros(n(total))
    s = n(t0)
    e = min(len(out), s + len(x))
    if s < len(out):
        out[s:e] += x[: e - s]
    return out


def reverb(x, size=1.2, mix_amt=0.3, bright=4000):
    ir_len = n(size)
    ir = white(size) * np.exp(-np.linspace(0, 6, ir_len))
    ir = lp(ir, bright, 2)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = signal.fftconvolve(x, ir)[: len(x) + ir_len]
    dry = pad(x, len(wet))
    return dry * (1 - mix_amt) + norm(wet, np.max(np.abs(x)) + 1e-9) * mix_amt


def seamless(x, xfade=0.6):
    m = n(xfade)
    body = x[: len(x) - m].copy()
    tail = x[len(x) - m:]
    ramp = np.linspace(0, 1, m)
    body[:m] = body[:m] * ramp + tail * (1 - ramp)
    return body


def lfo_noise(dur, rate, smooth=4):
    """Modulation aléatoire lente (0..1)."""
    k = max(2, int(dur * rate) + 2)
    pts = rng.random(k)
    x = np.interp(np.linspace(0, k - 1, n(dur)), np.arange(k), pts)
    return lp(x, rate * smooth, 2) if rate * smooth < SR / 2 else x


VOWELS = {
    "a": [(730, 80, 1.0), (1090, 90, 0.5), (2440, 120, 0.25)],
    "o": [(570, 70, 1.0), (840, 80, 0.45), (2410, 120, 0.15)],
    "u": [(300, 60, 1.0), (870, 80, 0.3), (2240, 110, 0.12)],
    "uh": [(640, 80, 1.0), (1190, 90, 0.45), (2390, 120, 0.2)],
    "e": [(530, 70, 1.0), (1840, 100, 0.4), (2480, 120, 0.25)],
    "m": [(250, 60, 1.0), (1000, 100, 0.1), (2200, 120, 0.05)],
}


def vowel(x, v, shift=1.0):
    out = np.zeros_like(x)
    for f, bw, g in VOWELS[v]:
        fs = f * shift
        out += reson(x, fs, fs / bw) * g
    return out


def voice(f0, dur, v1="uh", v2="o", shift=1.0, breath=0.15, jitter=0.03, drive=1.5, gurgle=0.0, sub=0.0):
    """Voix de créature : source glottale bruitée + formants qui glissent de v1 à v2."""
    length = n(dur)
    f = np.asarray(f0, dtype=float) if np.ndim(f0) else np.full(length, float(f0))
    f = f * (1 + jitter * (lfo_noise(dur, 18) - 0.5) * 2)
    src = saw(f, dur) + 0.4 * np.sin(phase_of(f, dur))
    if sub > 0:
        src += sub * saw(f * 0.5, dur)
    src = lp(src, 3500, 2) + breath * hp(white(dur), 800, 2)
    morph = np.linspace(0, 1, length)
    y = vowel(src, v1, shift) * (1 - morph) + vowel(src, v2, shift) * morph
    if gurgle > 0:
        y *= 1 - gurgle * lfo_noise(dur, 14)
    return dist(norm(y), drive)


def write(name, x, loop=False, peak=0.89):
    x = np.asarray(x, dtype=float)
    x = np.nan_to_num(x)
    x = norm(x, peak)
    if not loop:
        x = fade(x, 0.002, 0.03)
    path = os.path.join(OUT, name + ".ogg")
    sf.write(path, x.astype(np.float32), SR, format="OGG", subtype="VORBIS", compression_level=0.35)
    return path


# --------------------------------------------------------------------------
# Joueur, armes
# --------------------------------------------------------------------------

def click(freq=4000, dur=0.012, q=6):
    x = white(dur) * env_exp(n(dur), dur / 4)
    return reson(x, freq, q)


def s_flashlight_click():
    return mix(click(3500, 0.015), at(click(2600, 0.02), 0.035, 0.08))


def s_gunshot():
    d = 1.6
    crack = bp(white(0.02), 1500, 9000) * env_exp(n(0.02), 0.004)
    body = lp(white(0.25), 2500) * env_exp(n(0.25), 0.05)
    thump = sine(sweep(110, 40, 0.18, 0.5), 0.18) * env_exp(n(0.18), 0.05)
    tail = lp(pink(d), 1200) * env_exp(n(d), 0.35) * 0.35
    mech = at(click(5200, 0.01, 8), 0.004, 0.05) * 0.5
    x = mix(crack * 1.6, body * 0.9, thump * 1.3, tail, mech)
    return reverb(dist(x, 2.5), 1.4, 0.25)


def s_gun_empty():
    return mix(click(2800, 0.02, 10), at(click(1900, 0.03, 12) * 0.5, 0.01, 0.1))


def s_shell_casing():
    total = 0.7
    out = np.zeros(n(total))
    t0, amp = 0.0, 1.0
    for i in range(5):
        ping = fm(3800 + rng.random() * 1500, 1300, 2.0, 0.12) * env_exp(n(0.12), 0.03)
        out += at(ping * amp, t0, total)
        t0 += 0.16 * (0.62 ** i)
        amp *= 0.6
    return out


def s_reload():
    total = 1.5
    release = click(2200, 0.03, 5)
    slide_out = bp(white(0.15), 800, 3000) * env_ad(0.15, 0.02, 0.05) * 0.4
    mag_in = mix(click(1500, 0.04, 4), lp(white(0.05), 1500) * env_exp(n(0.05), 0.01))
    rack1 = mix(click(3000, 0.03, 6), bp(white(0.08), 1000, 5000) * env_exp(n(0.08), 0.02) * 0.5)
    rack2 = click(4200, 0.03, 7)
    return mix(at(release, 0.0, total), at(slide_out, 0.12, total), at(mag_in, 0.75, total),
               at(rack1, 1.15, total), at(rack2, 1.3, total))


def s_impact_wall():
    x = lp(white(0.12), 2500) * env_exp(n(0.12), 0.02)
    debris = bp(white(0.3), 2000, 7000) * (rng.random(n(0.3)) > 0.985) * env_exp(n(0.3), 0.1)
    return mix(x, at(debris * 0.8, 0.02, 0.35))


def s_impact_metal():
    ping = fm(1800 + rng.random() * 600, 700, 3.0, 0.5) * env_exp(n(0.5), 0.1)
    return mix(ping * 0.7, lp(white(0.05), 4000) * env_exp(n(0.05), 0.008))


def s_impact_flesh():
    thud = lp(white(0.18), 700) * env_exp(n(0.18), 0.04)
    squelch = bp(white(0.25), 400, 1800) * env_exp(n(0.25), 0.06) * (0.5 + 0.5 * sine(28, 0.25))
    return mix(thud * 1.2, squelch * 0.6)


def s_hit_flesh():
    punch = mix(sine(sweep(120, 50, 0.15), 0.15) * env_exp(n(0.15), 0.04), lp(white(0.1), 1200) * env_exp(n(0.1), 0.02))
    return mix(punch, at(s_impact_flesh() * 0.7, 0.01, 0.3))


def s_swing(low=False):
    d = 0.55 if low else 0.35
    f = np.concatenate([np.linspace(300, 1400, n(d * 0.4)), np.linspace(1400, 350, n(d) - n(d * 0.4))])
    x = white(d)
    y = np.zeros_like(x)
    block = 256
    for i in range(0, len(x), block):
        fc = f[min(i, len(f) - 1)] * (0.6 if low else 1.0)
        seg = x[i:i + block]
        y[i:i + block] = reson(seg, fc, 2.0)
    y *= env_ad(d, d * 0.35, d * 0.25)
    if low:
        y = mix(y, fm(420, 95, 2.0, 0.6) * env_exp(n(0.6), 0.2) * 0.25)
    return y


def step(kind):
    if kind == "tile":
        x = mix(bp(white(0.03), 1200, 4000) * env_exp(n(0.03), 0.006), sine(95, 0.06) * env_exp(n(0.06), 0.015) * 0.8)
    elif kind == "lino":
        x = mix(lp(white(0.06), 1400) * env_exp(n(0.06), 0.012), sine(80, 0.05) * env_exp(n(0.05), 0.012) * 0.6)
    elif kind == "concrete":
        grit = bp(white(0.08), 800, 3500) * env_exp(n(0.08), 0.02)
        x = mix(grit, sine(70, 0.06) * env_exp(n(0.06), 0.02) * 0.7, at(bp(white(0.05), 2000, 6000) * env_exp(n(0.05), 0.02) * 0.2, 0.03, 0.1))
    elif kind == "metal":
        x = mix(lp(white(0.04), 3000) * env_exp(n(0.04), 0.008), fm(520 + rng.random() * 200, 190, 2.5, 0.25) * env_exp(n(0.25), 0.05) * 0.5)
    else:  # extérieur : asphalte détrempé
        x = mix(lp(white(0.06), 2000) * env_exp(n(0.06), 0.015), bp(white(0.16), 1800, 6000) * env_exp(n(0.16), 0.05) * 0.6 * (rng.random(n(0.16)) > 0.6))
    return reverb(x, 0.3, 0.12)


def s_step_shuffle():
    d = 0.45
    x = lp(white(d), 1400) * env_ad(d, 0.12, 0.12)
    return mix(x * 0.6, step("concrete") * 0.5)


def s_step_heavy():
    thud = sine(sweep(60, 32, 0.4), 0.4) * env_exp(n(0.4), 0.12)
    body = lp(white(0.3), 500) * env_exp(n(0.3), 0.06)
    debris = bp(white(0.4), 1500, 5000) * (rng.random(n(0.4)) > 0.97) * env_exp(n(0.4), 0.15) * 0.4
    return reverb(mix(thud * 1.4, body, at(debris, 0.03, 0.5)), 1.0, 0.25)


def s_dodge():
    return mix(s_swing() * 0.5, at(step("concrete") * 0.8, 0.2, 0.45))


def s_spray():
    d = 0.7
    return hp(white(d), 3000) * env_ad(d, 0.03, 0.3) * 0.7


def s_heartbeat():
    d = 1.0
    lub = sine(sweep(62, 42, 0.14), 0.14) * env_exp(n(0.14), 0.04)
    dub = sine(sweep(55, 38, 0.12), 0.12) * env_exp(n(0.12), 0.035) * 0.65
    x = mix(at(lub, 0.02, d), at(dub, 0.3, d))
    return lp(x, 180)


def s_grunt(f0=120, dur=0.35, v1="uh", v2="uh", drive=2.0):
    f = sweep(f0 * 1.25, f0 * 0.85, dur)
    x = voice(f, dur, v1, v2, 1.0, 0.25, 0.04, drive)
    return x * env_ad(dur, 0.02, dur * 0.35)


def s_player_hurt():
    return mix(s_grunt(125 + rng.random() * 20, 0.32), s_impact_flesh() * 0.4)


def s_player_death():
    d = 1.6
    g = voice(sweep(140, 70, d, 0.7), d, "a", "uh", 1.0, 0.3, 0.06, 2.0) * env_ad(d, 0.05, 0.6)
    return mix(g, at(s_body_fall(), 0.9, 2.2))


def s_body_fall():
    thud = sine(sweep(80, 35, 0.35), 0.35) * env_exp(n(0.35), 0.08)
    cloth = lp(white(0.4), 2000) * env_ad(0.4, 0.01, 0.1) * 0.4
    return reverb(mix(thud * 1.3, cloth, lp(white(0.2), 600) * env_exp(n(0.2), 0.04)), 0.8, 0.2)


# --------------------------------------------------------------------------
# Portes, mécanismes
# --------------------------------------------------------------------------

def creak(dur=1.0, base=110, rough=0.5):
    f = base * (1 + 0.35 * np.sin(2 * np.pi * 0.7 * t_axis(dur)) + 0.2 * (lfo_noise(dur, 6) - 0.5))
    x = saw(f, dur)
    x = bp(x, 400, 2500) * (0.4 + 0.6 * lfo_noise(dur, 9))
    squeak = sine(f * 6, dur) * (lfo_noise(dur, 4) > 0.7) * 0.2
    return mix(x, squeak) * env_ad(dur, 0.08, dur * 0.4) * rough


def latch():
    return mix(click(2500, 0.02, 5), at(click(1600, 0.03, 4) * 0.7, 0.03, 0.1))


def thud(dur=0.4, f=70, bright=900):
    return mix(sine(sweep(f * 1.5, f * 0.6, dur), dur) * env_exp(n(dur), dur / 5), lp(white(dur), bright) * env_exp(n(dur), dur / 8))


def s_door_open():
    return reverb(mix(latch(), at(creak(0.9, 120, 0.6), 0.05, 1.0)), 0.6, 0.2)


def s_door_close():
    return reverb(mix(thud(0.35, 65), at(latch() * 0.8, 0.02, 0.2)), 0.6, 0.2)


def s_door_open_metal():
    groan = fm(90, 23, 3.0, 1.2) * env_ad(1.2, 0.1, 0.5) * 0.5
    return reverb(mix(at(click(1200, 0.05, 3), 0.0, 1.4), at(bp(mix(groan, creak(1.1, 80, 0.4)), 150, 2500), 0.08, 1.4)), 1.0, 0.25)


def s_door_close_metal():
    clang = fm(310, 77, 4.0, 0.8) * env_exp(n(0.8), 0.18) * 0.5
    return reverb(mix(thud(0.4, 55, 700), clang), 1.2, 0.25)


def s_door_open_glass():
    rattle = mix(*[at(fm(2400 + rng.random() * 2500, 900, 1.5, 0.06) * env_exp(n(0.06), 0.015), rng.random() * 0.25, 0.4) for _ in range(6)])
    return reverb(mix(rattle * 0.5, at(lp(white(0.3), 900) * env_ad(0.3, 0.05, 0.1) * 0.5, 0.05, 0.4)), 0.8, 0.2)


def s_door_close_glass():
    rattle = mix(*[at(fm(2200 + rng.random() * 2500, 800, 1.5, 0.08) * env_exp(n(0.08), 0.02), 0.02 + rng.random() * 0.1, 0.3) for _ in range(6)])
    return reverb(mix(thud(0.25, 90, 1500) * 0.7, rattle * 0.6), 0.8, 0.2)


def s_door_unlock():
    total = 0.5
    return mix(at(click(2000, 0.03, 6), 0.0, total), at(click(2800, 0.03, 7), 0.12, total), at(mix(click(1500, 0.05, 4), thud(0.1, 200, 2000) * 0.3), 0.25, total))


def s_door_locked():
    total = 0.5
    out = np.zeros(n(total))
    for i in range(4):
        out += at(mix(click(1800 + i * 150, 0.03, 4), thud(0.06, 180, 2500) * 0.4), i * 0.1 + rng.random() * 0.02, total)
    return out


def s_door_slam():
    boom = thud(0.7, 50, 1100) * 1.4
    rattle = bp(white(0.4), 1500, 5000) * env_exp(n(0.4), 0.08) * 0.3
    return reverb(dist(mix(boom, rattle), 1.8), 2.0, 0.35)


def s_door_bang():
    hit = thud(0.45, 60, 1000) * 1.2
    wood = bp(white(0.3), 300, 1800) * env_exp(n(0.3), 0.05) * 0.6
    return reverb(dist(mix(hit, wood), 2.0), 1.4, 0.3)


def s_door_burst():
    total = 1.8
    bang = s_door_bang()
    splinter = mix(*[at(bp(white(0.05), 1500, 6000) * env_exp(n(0.05), 0.012), rng.random() * 0.5, 0.7) for _ in range(30)])
    debris = mix(*[at(thud(0.15, 120 + rng.random() * 100, 2000) * 0.3, 0.15 + rng.random() * 0.8, 1.2) for _ in range(8)])
    return reverb(mix(bang * 1.3, at(splinter * 0.7, 0.02, total), at(debris, 0.0, total)), 1.8, 0.3)


def s_door_creak():
    return reverb(creak(2.2, 90, 0.8), 1.2, 0.3)


def s_pickup():
    rustle = bp(white(0.2), 1500, 6000) * env_ad(0.2, 0.02, 0.06) * 0.3
    tink = mix(sine(1320, 0.4) * env_exp(n(0.4), 0.12), at(sine(1760, 0.5) * env_exp(n(0.5), 0.15), 0.08, 0.6)) * 0.35
    return mix(rustle, at(tink, 0.05, 0.7))


def s_pickup_key():
    total = 0.7
    out = np.zeros(n(total))
    for i in range(6):
        out += at(fm(3000 + rng.random() * 2500, 1100, 2.0, 0.2) * env_exp(n(0.2), 0.05), rng.random() * 0.35, total)
    return mix(out * 0.5, s_pickup() * 0.5)


def s_paper():
    d = 0.5
    crinkle = bp(white(d), 1500, 8000) * (0.3 + 0.7 * (lfo_noise(d, 40) > 0.55)) * env_ad(d, 0.05, 0.2)
    return crinkle * 0.6


def s_tape_click():
    return mix(click(1500, 0.05, 3), at(thud(0.1, 150, 2500) * 0.4, 0.0, 0.2))


def s_tape_save():
    total = 1.4
    motor = (sine(180, 0.9) * 0.3 + bp(white(0.9), 2000, 5000) * 0.1) * env_ad(0.9, 0.1, 0.5)
    return mix(at(s_tape_click(), 0.0, total), at(motor, 0.15, total), at(s_tape_click() * 0.8, 1.1, total))


def beep(f, d, vol=1.0):
    return sine(f, d) * env_ad(d, 0.005, d * 0.8) * vol


def s_keypad_beep():
    return beep(1250, 0.09)


def s_keypad_error():
    x = mix(square(210, 0.18) * 0.4, at(square(180, 0.25) * 0.4, 0.22, 0.5))
    return lp(x, 2500)


def s_keypad_success():
    return mix(beep(880, 0.1), at(beep(1175, 0.1), 0.11, 0.4), at(beep(1568, 0.18), 0.22, 0.45))


def s_safe_open():
    total = 2.0
    bolt = mix(click(900, 0.08, 3), thud(0.2, 140, 1500) * 0.6)
    slide = bp(white(0.5), 500, 2500) * env_ad(0.5, 0.05, 0.2) * 0.4
    return reverb(mix(at(bolt, 0.0, total), at(slide, 0.2, total), at(bolt * 0.8, 0.7, total), at(creak(1.0, 70, 0.5), 0.8, total)), 1.0, 0.2)


def s_metal_rattle():
    total = 0.5
    out = np.zeros(n(total))
    for i in range(5):
        out += at(fm(900 + rng.random() * 800, 300, 2.5, 0.08) * env_exp(n(0.08), 0.02), i * 0.07, total)
    return out


def s_fuse_insert():
    total = 1.8
    zap = bp(white(0.3), 1000, 8000) * (rng.random(n(0.3)) > 0.9) * env_exp(n(0.3), 0.1)
    hum = mix(sine(100, 1.2), sine(200, 1.2) * 0.5) * env_ad(1.2, 0.5, 0.4) * 0.4
    return mix(at(click(1400, 0.06, 3), 0.0, total), at(zap, 0.1, total), at(hum, 0.3, total))


def s_breaker():
    total = 1.4
    clunk = mix(thud(0.3, 90, 1500) * 1.2, click(700, 0.08, 2))
    buzz = dist(square(100, 0.9) * 0.4 + bp(white(0.9), 2000, 8000) * 0.5, 2.0) * env_ad(0.9, 0.02, 0.4)
    return reverb(mix(at(clunk, 0.0, total), at(buzz, 0.05, total)), 1.0, 0.25)


def s_relay_click():
    return mix(click(1100, 0.04, 3), thud(0.08, 160, 2000) * 0.3)


def s_electrocution():
    d = 1.8
    buzz = dist(square(sweep(95, 70, d), d) * 0.6 + saw(50, d) * 0.4, 3.0)
    crackle = bp(white(d), 1500, 10000) * (rng.random(n(d)) > 0.93)
    zaps = mix(*[at(bp(white(0.06), 2000, 9000) * env_exp(n(0.06), 0.015) * 1.5, rng.random() * 1.3, d) for _ in range(14)])
    return reverb(mix(buzz * env_ad(d, 0.01, 0.8), crackle * 0.5 * env_ad(d, 0.01, 0.9), zaps), 1.4, 0.25)


# --------------------------------------------------------------------------
# Téléphone, voix
# --------------------------------------------------------------------------

def s_phone_ring():
    total = 4.8
    ring = mix(sine(820, 1.8), sine(1030, 1.8)) * (0.5 + 0.5 * square(22, 1.8))
    ring = lp(ring, 3500) * env_ad(1.8, 0.01, 2.0)
    return mix(at(ring, 0.0, total), at(np.zeros(1), total - 0.01, total))


def s_phone_static():
    d = 4.0
    x = bp(white(d), 300, 3400) * (0.4 + 0.6 * lfo_noise(d, 3))
    crackles = bp(white(d), 800, 3000) * (rng.random(n(d)) > 0.995) * 3.0
    return seamless(mix(x * 0.5, crackles), 0.5)


def s_phone_pickup():
    return mix(thud(0.15, 140, 2500), at(click(1800, 0.03, 4), 0.05, 0.2))


def s_phone_hangup():
    total = 2.2
    tone = beep(425, 0.25, 0.6)
    return mix(at(click(1500, 0.04, 3), 0.0, total), at(tone, 0.4, total), at(tone, 0.9, total), at(tone, 1.4, total))


def s_phone_vibrate():
    total = 2.2
    buzz = lp(square(150, 0.4) * (0.6 + 0.4 * sine(30, 0.4)), 900) * env_ad(0.4, 0.02, 0.2)
    return mix(at(buzz, 0.0, total), at(buzz, 0.6, total), at(buzz, 1.5, total))


def breath(d, bright=1400, wet=0.3):
    x = bp(white(d), 300, bright) * env_ad(d, d * 0.45, d * 0.25)
    rattle = lp(white(d), 300) * (0.5 + 0.5 * sine(24, d)) * wet
    return mix(x, rattle * env_ad(d, d * 0.3, d * 0.3))


def s_breath_phone():
    total = 3.2
    x = mix(at(breath(1.2), 0.1, total), at(breath(1.4, 1100) * 0.8, 1.5, total))
    return bp(x, 300, 3200)


def s_breath_close():
    total = 2.5
    return mix(at(breath(0.9, 2200, 0.5), 0.0, total), at(breath(1.1, 1800, 0.6) * 0.9, 1.1, total))


# --------------------------------------------------------------------------
# Créatures
# --------------------------------------------------------------------------

def s_hollow_groan(i):
    d = 1.3 + rng.random() * 0.8
    f0 = 72 + rng.random() * 25
    f = f0 * (1 + 0.12 * np.sin(2 * np.pi * (0.4 + rng.random() * 0.4) * t_axis(d)))
    v = [("uh", "o"), ("o", "u"), ("a", "uh")][i % 3]
    x = voice(f, d, v[0], v[1], 0.95, 0.35, 0.08, 2.5, gurgle=0.5)
    return reverb(x * env_ad(d, 0.25, d * 0.4), 0.9, 0.2)


def s_hollow_alert():
    d = 1.0
    f = sweep(260, 420, d * 0.3)
    rest = n(d) - len(f)
    f = np.concatenate([f, 420.0 * (1 + 0.05 * np.sin(2 * np.pi * 7 * np.arange(rest) / SR))])
    x = voice(f, d, "a", "e", 1.0, 0.5, 0.1, 4.0, gurgle=0.3)
    return reverb(x * env_ad(d, 0.05, 0.45), 1.2, 0.25)


def s_hollow_sniff():
    total = 0.9
    sn = hp(bp(white(0.12), 1500, 6000), 1200) * env_ad(0.12, 0.04, 0.04)
    return mix(at(sn, 0.0, total), at(sn * 0.8, 0.18, total), at(sn, 0.34, total), at(s_hollow_groan(0) * 0.25, 0.4, total))


def s_hollow_hurt():
    d = 0.45
    x = voice(sweep(300, 180, d), d, "a", "uh", 1.0, 0.4, 0.1, 3.5)
    return x * env_ad(d, 0.01, 0.15)


def s_hollow_attack():
    d = 0.7
    x = voice(sweep(180, 260, d), d, "uh", "a", 0.95, 0.5, 0.12, 4.0, gurgle=0.4)
    return x * env_ad(d, 0.06, 0.3)


def s_hollow_death():
    d = 1.8
    x = voice(sweep(190, 60, d, 0.6), d, "a", "u", 0.95, 0.35, 0.1, 2.5, gurgle=0.7)
    return reverb(mix(x * env_ad(d, 0.03, 0.7), at(s_body_fall() * 0.8, 1.2, 2.4)), 1.0, 0.2)


def s_hollow_wake():
    total = 1.8
    cracks = mix(*[at(bp(white(0.03), 800, 4000) * env_exp(n(0.03), 0.006), rng.random() * 1.2, 1.4) for _ in range(12)])
    moan = voice(sweep(60, 90, 1.4), 1.4, "u", "uh", 0.95, 0.3, 0.08, 2.0, gurgle=0.5) * env_ad(1.4, 0.4, 0.5)
    return mix(cracks * 0.7, at(moan, 0.3, total))


def s_surgeon_breath():
    d = 4.0
    inhale = breath(1.6, 900, 0.8) * 1.0
    exhale = mix(breath(1.9, 700, 1.0), voice(48, 1.9, "u", "o", 0.8, 0.6, 0.1, 1.5, sub=0.5) * env_ad(1.9, 0.3, 0.7) * 0.4)
    x = mix(at(inhale, 0.0, d), at(exhale, 1.8, d))
    return seamless(lp(x, 2500), 0.3)


def s_metal_scrape():
    d = 3.0
    grind = bp(white(d), 900, 5000) * (0.5 + 0.5 * lfo_noise(d, 12))
    ring = mix(*[fm(f, f * 0.37, 1.5, d) * 0.15 for f in (1210, 1830, 2640)]) * (0.4 + 0.6 * lfo_noise(d, 6))
    return seamless(mix(grind * 0.6, ring), 0.4)


def s_surgeon_mutter():
    d = 2.8
    melody = [196, 185, 165, 147, 165]
    f = np.concatenate([np.full(n(d / len(melody)), m) for m in melody])
    f = pad(f, n(d))
    f[f == 0] = 147
    x = voice(f * 0.5, d, "m", "u", 0.8, 0.2, 0.03, 1.2, sub=0.3)
    return reverb(x * env_ad(d, 0.3, 1.2), 1.4, 0.3)


def s_surgeon_roar():
    d = 1.8
    head = sweep(70, 120, 0.3)
    rest = n(d) - len(head)
    f = np.concatenate([head, 120.0 * (1 + 0.06 * np.sin(2 * np.pi * 5 * np.arange(rest) / SR))])
    x = voice(f, d, "a", "o", 0.75, 0.6, 0.12, 4.5, gurgle=0.3, sub=0.8)
    noise_l = lp(white(d), 900) * 0.4
    return reverb(mix(x, noise_l) * env_ad(d, 0.08, 0.8), 1.8, 0.3)


def s_surgeon_hurt():
    d = 0.9
    x = voice(sweep(110, 70, d), d, "a", "uh", 0.75, 0.5, 0.1, 3.5, sub=0.6)
    return reverb(x * env_ad(d, 0.02, 0.35), 1.2, 0.25)


def s_surgeon_death():
    d = 3.4
    x = voice(sweep(130, 38, d, 0.5), d, "a", "u", 0.75, 0.5, 0.12, 3.0, gurgle=0.7, sub=0.8)
    return reverb(mix(x * env_ad(d, 0.05, 1.4), at(s_impact_heavy() * 0.8, 2.0, 3.6)), 1.8, 0.3)


def s_impact_heavy():
    boom = sine(sweep(70, 28, 0.7), 0.7) * env_exp(n(0.7), 0.2)
    crash = lp(white(0.6), 1500) * env_exp(n(0.6), 0.1)
    debris = mix(*[at(thud(0.12, 150 + rng.random() * 200, 2500) * 0.25, rng.random() * 0.6, 1.0) for _ in range(10)])
    return reverb(dist(mix(boom * 1.5, crash, debris), 1.8), 1.8, 0.3)


def s_surgeon_distant():
    d = 4.0
    roar = s_surgeon_roar()
    scrape = s_metal_scrape()[: n(2.0)] * env_ad(2.0, 0.5, 0.8)
    x = mix(at(scrape * 0.5, 0.0, d), at(roar, 1.2, d))
    return reverb(lp(x, 500, 2), 2.5, 0.5)


# --------------------------------------------------------------------------
# Événements
# --------------------------------------------------------------------------

def s_whoosh():
    d = 0.6
    return mix(s_swing() * 0.8, lp(white(d), 600) * env_ad(d, 0.2, 0.15) * 0.6)


def s_glass_crash():
    total = 1.4
    shards = mix(*[at(fm(3000 + rng.random() * 5000, 1500 + rng.random() * 1000, 2.0, 0.25) * env_exp(n(0.25), 0.05), rng.random() * 0.4, total) for _ in range(24)])
    burst = hp(white(0.3), 2500) * env_exp(n(0.3), 0.06)
    return reverb(mix(shards * 0.5, burst, thud(0.2, 120, 2000) * 0.5), 1.0, 0.25)


def s_power_down():
    d = 1.4
    whine = sine(sweep(420, 35, d, 0.6), d) * env_ad(d, 0.01, 0.8) * 0.5
    return mix(at(s_relay_click() * 1.2, 0.0, d), whine, lp(white(d), 200) * env_ad(d, 0.01, 0.5) * 0.3)


def s_power_up():
    d = 1.8
    whine = sine(sweep(40, 380, d * 0.7, 1.5), d * 0.7) * env_ad(d * 0.7, 0.5, 0.6) * 0.5
    hum = mix(sine(100, d), sine(200, d) * 0.4) * env_ad(d, 1.0, 0.8) * 0.3
    return mix(at(s_relay_click(), 0.0, d), at(s_relay_click(), 0.4, d), whine, hum)


def s_object_fall():
    total = 1.2
    return reverb(mix(thud(0.3, 110, 1500), at(s_paper() * 0.6, 0.05, total), at(thud(0.15, 160, 2000) * 0.4, 0.25, total)), 1.0, 0.25)


def s_stinger():
    d = 2.4
    t = t_axis(d)
    freqs = [880, 932, 988, 1397, 1480]
    strings = mix(*[saw(f * (1 + 0.006 * np.sin(2 * np.pi * (5 + i) * t)), d) for i, f in enumerate(freqs)])
    strings = bp(strings, 500, 6000) * env_ad(d, 0.02, 0.9)
    boom = sine(sweep(90, 30, 1.2), 1.2) * env_exp(n(1.2), 0.3)
    return reverb(mix(strings * 0.6, boom * 1.2, lp(white(0.4), 3000) * env_exp(n(0.4), 0.08) * 0.5), 2.2, 0.35)


def s_shutter():
    d = 3.2
    clacks = mix(*[at(mix(click(1200 + rng.random() * 600, 0.03, 4), thud(0.06, 200, 2500) * 0.4), i * 0.12 + rng.random() * 0.02, d) for i in range(26)])
    motor = (sine(120, d) * 0.3 + bp(white(d), 200, 800) * 0.2) * env_ad(d, 0.2, 2.5)
    return reverb(mix(clacks * 0.7, motor, at(s_door_slam() * 0.8, 3.0, 4.6)), 1.5, 0.3)


def s_alarm():
    d = 2.0
    a = square(620, 1.0)
    b = square(470, 1.0)
    x = np.concatenate([a, b])
    return bp(x, 300, 3000) * 0.7


def s_death_sting():
    d = 4.0
    t = t_axis(d)
    drone = mix(saw(55, d), saw(58.3, d), saw(82.4, d) * 0.5)
    drone = lp(drone, 700) * env_ad(d, 1.2, 2.0)
    high = mix(sine(1760 * (1 + 0.01 * np.sin(2 * np.pi * 6 * t)), d), sine(1865, d)) * env_ad(d, 1.8, 1.5) * 0.15
    return reverb(mix(drone, high), 2.5, 0.4)


def s_distant_thump():
    return reverb(lp(thud(0.5, 60, 700), 500), 2.0, 0.55)


def s_metal_creak():
    d = 2.2
    x = fm(sweep(140, 90, d), 31, 3.0, d) * env_ad(d, 0.5, 1.0)
    return reverb(bp(x + creak(d, 60, 0.4), 100, 1500), 2.0, 0.45)


def s_pipe_groan():
    d = 2.8
    x = mix(sine(sweep(55, 48, d), d), sine(sweep(110, 96, d), d) * 0.3, lp(white(d), 200) * 0.3) * env_ad(d, 0.8, 1.2)
    knocks = mix(*[at(thud(0.1, 180, 1500) * 0.4, 0.8 + i * 0.35, d) for i in range(4)])
    return reverb(mix(x, knocks), 2.2, 0.45)


def s_thunder():
    d = 6.0
    crack = hp(white(0.4), 400) * env_exp(n(0.4), 0.08)
    rumble = brown(d) * (0.3 + 0.7 * lfo_noise(d, 3)) * env_ad(d, 0.3, 2.2)
    return reverb(mix(crack * 0.6, lp(rumble, 400) * 1.2), 2.5, 0.35)


# --------------------------------------------------------------------------
# Interface
# --------------------------------------------------------------------------

def s_ui_move():
    return click(3200, 0.02, 8) * 0.6


def s_ui_select():
    return mix(click(1800, 0.03, 5), beep(660, 0.08, 0.3))


def s_ui_error():
    return lp(square(160, 0.2), 1500) * env_ad(0.2, 0.01, 0.1)


def s_inventory_open():
    return mix(s_paper() * 0.4, bp(white(0.25), 1000, 4000) * env_ad(0.25, 0.05, 0.08) * 0.4)


def s_inventory_close():
    return s_inventory_open()[::-1] * 0.8


# --------------------------------------------------------------------------
# Ambiances (boucles)
# --------------------------------------------------------------------------

def s_amb_rain():
    d = 10.0
    body = bp(pink(d), 400, 9000) * 0.6
    drops = hp(white(d), 3000) * (rng.random(n(d)) > 0.992) * 0.8
    patter = bp(white(d), 1500, 6000) * (0.3 + 0.3 * lfo_noise(d, 0.5)) * 0.25
    return seamless(mix(body, lp(drops, 8000), patter), 1.0)


def s_amb_wind():
    d = 12.0
    gust = lfo_noise(d, 0.25)
    base = lp(pink(d), 500) * (0.4 + 0.8 * gust)
    whistle_f = 600 + 400 * lfo_noise(d, 0.2)
    wh = np.zeros(n(d))
    x = white(d)
    block = 1024
    for i in range(0, len(x), block):
        wh[i:i + block] = reson(x[i:i + block], whistle_f[i], 25)
    return seamless(mix(base, wh * 0.08 * gust), 1.5)


def s_amb_rain_inside():
    d = 10.0
    body = lp(pink(d), 1200) * 0.6
    ticks = bp(white(d), 2000, 6000) * (rng.random(n(d)) > 0.9985) * 1.2
    return seamless(mix(body, ticks), 1.0)


def s_amb_room():
    d = 12.0
    tone = lp(pink(d), 300) * 0.4 + sine(50, d) * 0.03
    creaks = mix(*[at(s_metal_creak() * 0.05, rng.random() * 8.0, d) for _ in range(2)])
    return seamless(mix(tone, creaks), 1.0)


def s_amb_hum():
    d = 4.0
    t = t_axis(d)
    x = sine(50, d) + 0.6 * sine(100, d) + 0.35 * sine(150, d) + 0.2 * sine(200.5, d)
    x *= 1 + 0.1 * np.sin(2 * np.pi * 0.5 * t)
    return seamless(dist(x * 0.5, 1.5) + bp(white(d), 3000, 8000) * 0.01, 0.5)


def s_amb_vent():
    d = 10.0
    air = bp(pink(d), 150, 2500) * (0.6 + 0.4 * lfo_noise(d, 0.3))
    rattle = mix(*[at(s_metal_rattle() * 0.08, rng.random() * 9.0, d) for _ in range(3)])
    rumble = sine(38, d) * 0.15
    return seamless(mix(air * 0.6, rattle, rumble), 1.0)


def s_amb_lab():
    d = 10.0
    comp = mix(sine(60, d) * 0.3, sine(120, d) * 0.15, lp(white(d), 400) * 0.2)
    bubbles = mix(*[at(sine(sweep(400 + rng.random() * 800, 900 + rng.random() * 900, 0.05), 0.05) * env_ad(0.05, 0.005, 0.02) * 0.15, rng.random() * 9.5, d) for _ in range(60)])
    beeps = mix(*[at(beep(1760, 0.07, 0.08), 1.0 + i * 2.5, d) for i in range(4)])
    return seamless(mix(comp, bubbles, beeps), 1.0)


def s_amb_basement():
    d = 14.0
    rumble = lp(brown(d), 120) * 0.5
    flow = bp(pink(d), 200, 1200) * (0.3 + 0.4 * lfo_noise(d, 0.2)) * 0.3
    drips = np.zeros(n(d))
    for _ in range(16):
        f = 900 + rng.random() * 1400
        drip = sine(sweep(f, f * 1.6, 0.06), 0.06) * env_exp(n(0.06), 0.015)
        drips += at(drip * (0.2 + rng.random() * 0.3), rng.random() * (d - 1.0), d)
    drips = reverb(drips, 1.5, 0.5)[: n(d)]
    return seamless(mix(rumble, flow, drips), 1.2)


def s_amb_generator():
    d = 4.0
    t = t_axis(d)
    pulse = (0.5 + 0.5 * np.sin(2 * np.pi * 25 * t)) ** 2
    x = mix(sine(50, d) * 0.6, sine(100, d) * 0.3, saw(25, d) * 0.2) * (0.7 + 0.3 * pulse)
    x = lp(x, 700) + bp(white(d), 200, 1500) * 0.1 * pulse
    return seamless(dist(x, 1.5), 0.5)


def s_amb_tunnel():
    d = 12.0
    howl_f = 220 + 120 * lfo_noise(d, 0.15)
    x = white(d)
    howl = np.zeros(n(d))
    block = 1024
    for i in range(0, len(x), block):
        howl[i:i + block] = reson(x[i:i + block], howl_f[i], 18)
    air = lp(pink(d), 600) * (0.4 + 0.6 * lfo_noise(d, 0.2))
    return seamless(mix(air * 0.5, howl * 0.12), 1.2)


def s_amb_birds():
    d = 14.0
    out = np.zeros(n(d))
    for _ in range(18):
        f0 = 2500 + rng.random() * 2500
        chirp = sine(sweep(f0, f0 * (1.3 + rng.random() * 0.5), 0.09), 0.09) * env_ad(0.09, 0.01, 0.04)
        t0 = rng.random() * (d - 1.0)
        for k in range(1 + int(rng.random() * 3)):
            out += at(chirp * 0.3, t0 + k * 0.13, d)
    return seamless(mix(reverb(out, 1.5, 0.3)[: n(d)], lp(pink(d), 800) * 0.1), 1.0)


# --------------------------------------------------------------------------
# Musique (très rare)
# --------------------------------------------------------------------------

def pluck(f, d=2.5):
    t = t_axis(d)
    x = sum(np.sin(2 * np.pi * f * k * t) * (0.6 ** (k - 1)) for k in range(1, 6))
    return x * np.exp(-t / 0.6) * (1 - np.exp(-t / 0.004))


def pad_chord(freqs, d, cutoff=900):
    x = mix(*[saw(f * (1 + 0.003 * i), d) + saw(f * (1 - 0.004 * i), d) for i, f in enumerate(freqs)])
    return lp(x, cutoff) * 0.3


def s_music_menu():
    d = 32.0
    padx = mix(pad_chord([73.4, 110.0, 174.6], d, 650)) * (0.6 + 0.4 * lfo_noise(d, 0.1))
    notes = [(0.5, 587.3), (3.5, 698.5), (6.0, 659.3), (9.5, 440.0), (14.0, 587.3), (17.0, 523.3), (20.5, 466.2), (25.0, 440.0), (28.0, 392.0)]
    melody = mix(*[at(pluck(f) * 0.35, t0, d) for t0, f in notes])
    x = mix(padx, reverb(melody, 3.0, 0.5)[: n(d)])
    return seamless(x, 2.0)


def s_music_boss():
    bpm = 104
    beat = 60.0 / bpm
    d = beat * 32
    out = np.zeros(n(d))
    drum = mix(sine(sweep(110, 45, 0.35), 0.35) * env_exp(n(0.35), 0.1), lp(white(0.15), 800) * env_exp(n(0.15), 0.03) * 0.5)
    for i in range(32):
        if i % 4 in (0, 3) or (i % 8 == 6):
            out += at(drum * (1.0 if i % 4 == 0 else 0.6), i * beat, d)
    ost = np.zeros(n(d))
    seq = [146.8, 155.6, 146.8, 138.6]
    for i in range(64):
        f = seq[(i // 4) % 4]
        note = saw(f, beat * 0.45) * env_ad(beat * 0.45, 0.01, 0.12)
        ost += at(note, i * beat * 0.5, d)
    ost = bp(ost, 150, 2500) * 0.3
    clang = mix(*[at(fm(620, 157, 3.5, 0.9) * env_exp(n(0.9), 0.25) * 0.25, (i * 8 + 7) * beat, d) for i in range(4)])
    rise = hp(white(d), 3000) * np.linspace(0.0, 0.08, n(d)) ** 1.5
    x = mix(out * 0.9, ost, clang, rise, pad_chord([36.7, 55.0], d, 300) * 0.8)
    return seamless(reverb(x, 1.2, 0.2)[: n(d)], 0.3)


def s_music_end():
    d = 30.0
    padx = pad_chord([55.0, 82.4, 130.8], d, 500) * (0.5 + 0.5 * lfo_noise(d, 0.08))
    notes = [(0.5, 440.0), (2.8, 523.3), (5.0, 493.9), (7.5, 392.0), (11.0, 440.0), (13.5, 329.6), (17.0, 349.2), (20.0, 329.6), (23.5, 293.7), (26.5, 261.6)]
    melody = mix(*[at(pluck(f, 3.0) * 0.4, t0, d) for t0, f in notes])
    return seamless(mix(padx, reverb(melody, 3.5, 0.55)[: n(d)]), 2.0)


# --------------------------------------------------------------------------
# Liste des sons
# --------------------------------------------------------------------------

SOUNDS = {
    "flashlight_click": s_flashlight_click, "gunshot": s_gunshot, "gun_empty": s_gun_empty,
    "shell_casing": s_shell_casing, "reload": s_reload, "impact_wall": s_impact_wall,
    "impact_metal": s_impact_metal, "impact_flesh": s_impact_flesh, "hit_flesh": s_hit_flesh,
    "swing": s_swing, "swing_heavy": lambda: s_swing(True), "step_shuffle": s_step_shuffle,
    "step_heavy": s_step_heavy, "dodge": s_dodge, "spray": s_spray, "player_death": s_player_death,
    "body_fall": s_body_fall, "door_open": s_door_open, "door_close": s_door_close,
    "door_open_metal": s_door_open_metal, "door_close_metal": s_door_close_metal,
    "door_open_glass": s_door_open_glass, "door_close_glass": s_door_close_glass,
    "door_unlock": s_door_unlock, "door_locked": s_door_locked, "door_slam": s_door_slam,
    "door_bang": s_door_bang, "door_burst": s_door_burst, "door_creak": s_door_creak,
    "pickup": s_pickup, "pickup_key": s_pickup_key, "paper": s_paper, "tape_click": s_tape_click,
    "tape_save": s_tape_save, "keypad_beep": s_keypad_beep, "keypad_error": s_keypad_error,
    "keypad_success": s_keypad_success, "safe_open": s_safe_open, "metal_rattle": s_metal_rattle,
    "fuse_insert": s_fuse_insert, "breaker": s_breaker, "relay_click": s_relay_click,
    "electrocution": s_electrocution, "phone_pickup": s_phone_pickup, "phone_hangup": s_phone_hangup,
    "phone_vibrate": s_phone_vibrate, "breath_phone": s_breath_phone, "breath_close": s_breath_close,
    "hollow_alert": s_hollow_alert, "hollow_sniff": s_hollow_sniff, "hollow_hurt": s_hollow_hurt,
    "hollow_attack": s_hollow_attack, "hollow_death": s_hollow_death, "hollow_wake": s_hollow_wake,
    "surgeon_mutter": s_surgeon_mutter, "surgeon_roar": s_surgeon_roar, "surgeon_hurt": s_surgeon_hurt,
    "surgeon_death": s_surgeon_death, "impact_heavy": s_impact_heavy, "surgeon_distant": s_surgeon_distant,
    "whoosh": s_whoosh, "glass_crash": s_glass_crash, "power_down": s_power_down, "power_up": s_power_up,
    "object_fall": s_object_fall, "stinger": s_stinger, "shutter": s_shutter, "death_sting": s_death_sting,
    "distant_thump": s_distant_thump, "metal_creak": s_metal_creak, "pipe_groan": s_pipe_groan,
    "thunder": s_thunder, "ui_move": s_ui_move, "ui_select": s_ui_select, "ui_error": s_ui_error,
    "inventory_open": s_inventory_open, "inventory_close": s_inventory_close,
    "light_flicker": lambda: mix(bp(white(0.3), 1000, 8000) * (rng.random(n(0.3)) > 0.93), square(120, 0.3) * 0.3 * env_ad(0.3, 0.01, 0.1)),
}

VARIANTS = {
    "step_tile": (4, lambda i: step("tile")), "step_lino": (4, lambda i: step("lino")),
    "step_concrete": (4, lambda i: step("concrete")), "step_metal": (4, lambda i: step("metal")),
    "step_outdoor": (4, lambda i: step("outdoor")), "player_hurt": (3, lambda i: s_player_hurt()),
    "hollow_groan": (3, s_hollow_groan),
}

LOOPS = {
    "light_buzz": lambda: seamless(dist(mix(sine(120, 2.5), sine(240, 2.5) * 0.5, sine(360, 2.5) * 0.25) * 0.5, 2.0) + bp(white(2.5), 4000, 9000) * 0.02, 0.5),
    "heartbeat": s_heartbeat, "alarm": s_alarm, "phone_static": s_phone_static, "phone_ring": s_phone_ring,
    "surgeon_breath": s_surgeon_breath, "metal_scrape": s_metal_scrape,
    "amb_rain": s_amb_rain, "amb_wind": s_amb_wind, "amb_rain_inside": s_amb_rain_inside, "amb_room": s_amb_room,
    "amb_hum": s_amb_hum, "amb_vent": s_amb_vent, "amb_lab": s_amb_lab, "amb_basement": s_amb_basement,
    "amb_generator": s_amb_generator, "amb_tunnel": s_amb_tunnel, "amb_birds": s_amb_birds,
    "music_menu": s_music_menu, "music_boss": s_music_boss, "music_end": s_music_end,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[2:])
    count = 0
    for name, fn in SOUNDS.items():
        if only and name not in only:
            continue
        write(name, fn())
        count += 1
    for name, (k, fn) in VARIANTS.items():
        if only and name not in only:
            continue
        for i in range(k):
            write("%s_%d" % (name, i + 1), fn(i))
            count += 1
    for name, fn in LOOPS.items():
        if only and name not in only:
            continue
        write(name, fn(), loop=True, peak=0.8)
        count += 1
    print("%d sons générés dans %s" % (count, os.path.abspath(OUT)))


if __name__ == "__main__":
    main()

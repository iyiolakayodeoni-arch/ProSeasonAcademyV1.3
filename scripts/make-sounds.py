#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────
# ProSeasonAcademy — SOUND PACK GENERATOR
# Synthesises every UI sound effect + the home ambient loop as
# tiny mono WAVs in assets/sounds/. Pure stdlib (no numpy), so
# anyone can regenerate:  python3 scripts/make-sounds.py
#
# Design language: dark, electronic, "stadium tunnel at night".
# Short, quiet, slightly detuned — they should feel like the
# neon-green UI sounds, not like a cartoon.
# ─────────────────────────────────────────────────────────────
import math
import os
import random
import struct
import wave

SR = 22050  # sample rate — small files, plenty for UI sounds
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
os.makedirs(OUT, exist_ok=True)
random.seed(7)  # deterministic noise so re-runs sound identical


def write_wav(name, samples):
    # gentle master limiter so nothing ever clips harshly
    peak = max(1e-9, max(abs(s) for s in samples))
    if peak > 0.89:
        samples = [s * 0.89 / peak for s in samples]
    pcm = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in samples)
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)
    print(f"  {name:22s} {len(samples)/SR:5.2f}s  {len(pcm)//1024} KB")


def env_exp(n, attack=0.004, decay=0.08):
    """click-proof percussive envelope"""
    a = max(1, int(attack * SR))
    out = []
    for i in range(n):
        v = i / a if i < a else math.exp(-(i - a) / (decay * SR))
        out.append(min(1.0, v))
    return out


def seconds(d):
    return int(d * SR)


def sine(f, t):
    return math.sin(2 * math.pi * f * t)


# ── 1 · TAP — the every-press tick (soft digital blip) ──────────────
def tap():
    n = seconds(0.09)
    e = env_exp(n, decay=0.05)
    return [e[i] * (0.55 * sine(1450, i / SR) + 0.25 * sine(2900, i / SR)) * 0.5 for i in range(n)]


# ── 2 · TAB — a touch deeper, for switching rooms ───────────────────
def tab():
    n = seconds(0.12)
    e = env_exp(n, decay=0.07)
    return [e[i] * (0.6 * sine(880, i / SR) + 0.2 * sine(1760, i / SR)) * 0.5 for i in range(n)]


# ── 3 · TOGGLE — two-pitch tick that reads as a switch flick ────────
def toggle():
    n = seconds(0.14)
    e = env_exp(n, decay=0.06)
    return [e[i] * sine(980 if i < n * 0.45 else 1240, i / SR) * 0.45 for i in range(n)]


# ── 4 · POP — chat bubble landing ───────────────────────────────────
def pop():
    n = seconds(0.11)
    e = env_exp(n, decay=0.05)
    return [e[i] * (0.7 * sine(620 + 900 * (i / n), i / SR)) * 0.45 for i in range(n)]


# ── 5 · WHOOSH — sheets + the stage zoom opening ────────────────────
def whoosh():
    n = seconds(0.28)
    out = []
    for i in range(n):
        t = i / n
        e = math.sin(math.pi * t)  # smooth in-out
        # band-ish noise: noise through a swept cheap resonator
        out.append(e * (random.uniform(-1, 1) * (0.35 + 0.65 * t)) * sine(300 + 2200 * t, i / SR) * 0.9)
    return out


# ── 6 · WHISTLE — the referee whistle: lock-in + stage pass ─────────
def whistle():
    n = seconds(0.7)
    out = []
    for i in range(n):
        t = i / SR
        vib = 1 + 0.06 * sine(46, t)          # pea-rattle vibrato
        breath = 0.22 * random.uniform(-1, 1)
        e = min(1.0, i / seconds(0.012)) * (1 - max(0.0, (i - seconds(0.58)) / seconds(0.12)))
        s = 0.8 * sine(2350 * vib, t) + 0.35 * sine(3530 * vib, t) + breath * sine(1200, t)
        out.append(s * e * 0.42)
    return out


# ── 7 · SUCCESS — rising two-note chime (scan passed, purchase) ─────
def success():
    n = seconds(0.75)
    out = [0.0] * n
    for k, (f, start) in enumerate([(1046.5, 0.0), (1568.0, 0.14)]):  # C6 → G6
        st = seconds(start)
        for i in range(n - st):
            e = math.exp(-(i) / (0.35 * SR))
            out[st + i] += e * (0.6 * sine(f, i / SR) + 0.2 * sine(f * 2, i / SR)) * (0.4 if k else 0.5)
    return out


# ── 8 · FAIL — short descending buzz, no drama ──────────────────────
def fail():
    n = seconds(0.4)
    e = env_exp(n, decay=0.22)
    return [e[i] * (0.6 * sine(220 - 110 * (i / n), i / SR) + 0.3 * sine(110, i / SR)) * 0.5 for i in range(n)]


# ── 9 · COIN — the academy till ─────────────────────────────────────
def coin():
    n = seconds(0.45)
    out = [0.0] * n
    for f, start in [(1760, 0.0), (2637, 0.07)]:
        st = seconds(start)
        for i in range(n - st):
            e = math.exp(-(i) / (0.2 * SR))
            out[st + i] += e * sine(f, i / SR) * 0.42
    return out


# ── 10 · LIKE — tiny warm heart-blip ────────────────────────────────
def like():
    n = seconds(0.13)
    e = env_exp(n, decay=0.07)
    return [e[i] * sine(520 + 1400 * (i / n) ** 2, i / SR) * 0.4 for i in range(n)]


# ── 11 · HOME AMBIENCE — 24s seamless loop ──────────────────────────
# Slow neon pad (Dm9 colour) over a 62 BPM pulse — meant to sit at
# ~25% volume under the feed. End is crossfaded into the start.
def music_home():
    dur = 24.0
    n = seconds(dur)
    bpm = 62.0
    beat = 60.0 / bpm
    # chord plan (Hz) — Dm9 → Bbmaj7 → F(add9) → C, 6s each
    chords = [
        [146.83, 220.0, 261.63, 349.23],   # D3 A3 C4 F4
        [116.54, 220.0, 293.66, 349.23],   # Bb2 A3 D4 F4
        [174.61, 261.63, 392.0, 523.25],   # F3 C4 G4 C5
        [130.81, 261.63, 329.63, 392.0],   # C3 C4 E4 G4
    ]
    seg = n // 4
    out = [0.0] * n
    for c, freqs in enumerate(chords):
        start = c * seg
        for i in range(min(seg * 2, n - start)):  # 2-bar overlap for glue
            t_local = i / seg
            swell = math.sin(math.pi * min(1.0, t_local / 2.0))  # slow swell per chord
            for f in freqs:
                # soft saw-ish pad: fundamental + two quiet harmonics, slow LFO
                lfo = 0.85 + 0.15 * sine(0.11 + f * 0.001, (start + i) / SR)
                v = (1.0 * sine(f, (start + i) / SR)
                     + 0.18 * sine(f * 2.003, (start + i) / SR)
                     + 0.07 * sine(f * 3.01, (start + i) / SR))
                if start + i < n:
                    out[start + i] += v * swell * lfo * 0.11
    # heartbeat pulse on the beat + soft air noise
    for i in range(n):
        t = i / SR
        ph = (t % beat) / beat
        out[i] += 0.22 * math.exp(-ph * 14) * sine(58, t)          # deep pulse
        out[i] += 0.015 * random.uniform(-1, 1)                    # tape air
    # seamless loop: crossfade last 2s into first 2s
    xf = seconds(2.0)
    tail = out[:]
    for i in range(xf):
        g = i / xf
        out[n - xf + i] = out[n - xf + i] * (1 - g) + tail[i] * g * 0.985
        if i < n - xf:
            out[i] = out[i] * (1 - (1 - g) * 0.0)
    return [s * 0.8 for s in out]


if __name__ == "__main__":
    print("generating the academy's sound pack →")
    write_wav("sfx-tap.wav", tap())
    write_wav("sfx-tab.wav", tab())
    write_wav("sfx-toggle.wav", toggle())
    write_wav("sfx-pop.wav", pop())
    write_wav("sfx-whoosh.wav", whoosh())
    write_wav("sfx-whistle.wav", whistle())
    write_wav("sfx-success.wav", success())
    write_wav("sfx-fail.wav", fail())
    write_wav("sfx-coin.wav", coin())
    write_wav("sfx-like.wav", like())
    write_wav("music-home.wav", music_home())
    print("done.")

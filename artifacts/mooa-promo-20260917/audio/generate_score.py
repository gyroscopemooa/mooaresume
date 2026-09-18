"""Original MOOA Resume score, composed and synthesized for this advertisement.

No external recordings, melodies, samples, or services are used.
Python + NumPy only. Seeded rendering makes the source reproducible.
Render: python generate_score.py
The emitted premaster is subsequently mastered using FFmpeg loudnorm.
"""
from pathlib import Path
import json
import math
import wave

import numpy as np

SR = 48000
DURATION = 60.0
BPM = 100
BEAT = 60.0 / BPM
BAR = 4 * BEAT
N = round(SR * DURATION)
OUT = Path(__file__).resolve().parent
RNG = np.random.default_rng(20260917)
dry = np.zeros((N, 2), dtype=np.float64)
send = np.zeros_like(dry)


def hz(midi):
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def add(audio, start, gain=1.0, pan=0.0, wet=0.0):
    offset = round(start * SR)
    if offset >= N:
        return
    skip = max(0, -offset)
    offset = max(0, offset)
    audio = audio[skip:skip + N - offset]
    if not len(audio):
        return
    if audio.ndim == 1:
        p = (np.clip(pan, -1, 1) + 1) * math.pi / 4
        signal = np.stack((audio * np.cos(p), audio * np.sin(p)), axis=1)
    else:
        signal = audio
    signal = signal * gain
    dry[offset:offset + len(signal)] += signal
    if wet:
        send[offset:offset + len(signal)] += signal * wet


def keys(midi, length=2.8, velocity=0.6):
    """Soft, slightly detuned felt/electric-key hybrid with a quiet hammer."""
    t = np.arange(round(SR * length)) / SR
    f = hz(midi)
    attack = smooth(t / 0.008)
    result = np.zeros_like(t)
    # Felt dampens the upper partials very quickly; fifth partial adds body.
    for harmonic, amp, tau in [(1, 1, 1.65), (2, .30, .95), (3, .12, .53),
                              (4, .055, .30), (5, .02, .19)]:
        inharmonic = math.sqrt(1 + .000018 * harmonic * harmonic)
        fundamental = np.sin(2 * np.pi * f * harmonic * inharmonic * t)
        if harmonic == 1:
            fundamental = .82 * fundamental + .18 * np.sin(2 * np.pi * f * 1.0008 * t)
        result += amp * fundamental * np.exp(-t / (tau * (0.86 + .24 * velocity)))
    hammer = RNG.normal(0, 1, len(t))
    hammer = np.convolve(hammer, np.ones(18) / 18, mode='same')
    result += .055 * hammer * np.exp(-t / .012)
    result *= attack * smooth((length - t) / .18)
    return result * .15 * velocity


def pad(notes, length):
    t = np.arange(round(SR * length)) / SR
    envelope = smooth(t / 1.1) * smooth((length - t) / 1.9)
    stereo = np.zeros((len(t), 2))
    for i, midi in enumerate(notes):
        f = hz(midi)
        for channel in range(2):
            phase = RNG.uniform(0, 2*np.pi)
            detune = (1 if channel else -1) * (.0009 + i*.00012)
            drift = .014 * np.sin(2*np.pi*(.19 + i*.012)*t + phase)
            voice = np.sin(2*np.pi*f*(1+detune)*t + phase + drift)
            voice += .115 * np.sin(2*np.pi*2*f*(1-detune*.4)*t + phase)
            voice += .024 * np.sin(2*np.pi*3*f*t + phase)
            stereo[:, channel] += voice / len(notes)
    return stereo * envelope[:, None] * .065


def bass(midi, length=.8, strength=1):
    t = np.arange(round(length * SR)) / SR
    f = hz(midi)
    env = smooth(t / .015) * np.exp(-t / .53) * smooth((length-t) / .10)
    voice = np.sin(2*np.pi*f*t) + .15*np.sin(2*np.pi*f*2*t) + .032*np.sin(2*np.pi*f*3*t)
    return voice * env * .15 * strength


def kick(strength=1):
    t = np.arange(round(.42 * SR)) / SR
    # Integrate a smooth descending pitch instead of phase-discontinuous sweeps.
    phase = 2*np.pi*(46*t + 35*.027*(1-np.exp(-t/.027)))
    env = smooth(t/.0015) * np.exp(-t/.083) * smooth((.42-t)/.06)
    body = np.sin(phase) * env
    tap = RNG.normal(0, 1, len(t))
    tap = np.convolve(tap, np.ones(12)/12, mode='same')
    return (body + tap * np.exp(-t/.005)*.035) * .18 * strength


def brushed_hat(length=.10, strength=1):
    size = round(length * SR)
    t = np.arange(size)/SR
    noise = RNG.normal(0, 1, size)
    bins = np.fft.rfftfreq(size, 1/SR)
    color = np.exp(-((bins-6400)/4200)**2) * (1-np.exp(-(bins/2200)**4))
    noise = np.fft.irfft(np.fft.rfft(noise)*color, n=size)
    return noise * smooth(t/.002) * np.exp(-t/.021) * smooth((length-t)/.012) * .018 * strength


def soft_clap(strength=1):
    length = .25
    size = round(length*SR)
    t = np.arange(size)/SR
    noise = RNG.normal(0, 1, size)
    bins = np.fft.rfftfreq(size, 1/SR)
    color = np.exp(-((bins-1800)/1900)**2) * (1-np.exp(-(bins/400)**4))
    noise = np.fft.irfft(np.fft.rfft(noise)*color, n=size)
    env = smooth(t/.001)*np.exp(-t/.030)
    env += .30*smooth((t-.012)/.002)*np.exp(-np.maximum(t-.012, 0)/.045)
    env *= smooth((length-t)/.05)
    wooden = np.sin(2*np.pi*211*t)*np.exp(-t/.018)*.07
    return (noise*env + wooden)*.044*strength


def transition(end, duration=1.15, strength=1):
    """Very quiet broad-band air swell with a gentle reverse-key undertone."""
    size = round(duration*SR)
    t = np.arange(size)/SR
    noise = RNG.normal(0, 1, size)
    bins = np.fft.rfftfreq(size, 1/SR)
    color = np.exp(-((bins-2700)/2500)**2) * (1-np.exp(-(bins/450)**4))
    air = np.fft.irfft(np.fft.rfft(noise)*color, n=size)
    env = smooth(t/duration)**2 * smooth((duration-t)/.045)
    add(air*env*.018, end-duration, strength, -.10, .25)
    reverse = keys(78, duration, .30)[::-1].copy()
    reverse *= smooth(t/.20) * smooth((duration-t)/.035)
    add(reverse, end-duration, .24*strength, .25, .7)


# D major / B minor: original voicings, all ninths and sevenths kept spacious.
chords = {
    'D': {'pad':[50, 57, 61, 66, 76], 'key':[62, 69, 73, 78], 'root':38},
    'A': {'pad':[45, 52, 59, 64, 73], 'key':[61, 64, 71, 76], 'root':33},
    'B': {'pad':[47, 54, 57, 62, 69], 'key':[62, 66, 69, 73], 'root':35},
    'G': {'pad':[43, 54, 57, 62, 69], 'key':[59, 62, 69, 74], 'root':31},
}
# Intro spans four bars, then five four-bar phrases, then the final brand bar.
progression = [
    ('D', 0, 4.8), ('G', 4.8, 4.8),
    ('D', 9.6, 4.8), ('A', 14.4, 4.8),
    ('B', 19.2, 4.8), ('G', 24.0, 4.8),
    ('D', 28.8, 4.8), ('A', 33.6, 4.8),
    ('B', 38.4, 4.8), ('G', 43.2, 4.8),
    ('A', 48.0, 2.4), ('G', 50.4, 4.8),
    ('D', 55.2, 4.8),
]

for symbol, start, length in progression:
    c = chords[symbol]
    add(pad(c['pad'], length+1.9), start-.25 if start else 0, 1.0, wet=.32)
    # Human-spread chords. End card lands on a complete, soft major resolution.
    for k, note in enumerate(c['key']):
        add(keys(note, 4.2, .52 if start < 9.6 else .64), start+.024*k,
            .64 if start < 55.2 else .94, pan=(k-1.5)*.19, wet=.62)

# Delicate two-note opening gesture introduces the melodic identity.
for start, midi, velocity in [(1.8, 78, .40), (3.0, 76, .35),
                              (6.0, 74, .43), (7.2, 73, .36), (8.4, 69, .34)]:
    add(keys(midi, 3.2, velocity), start, .72, .22, .72)

# Original four-phrase motif: space is intentional for the on-screen message.
motifs = [
    [(0,78), (1.5,76), (3.0,73), (4.5,76), (6.5,81)],
    [(0,78), (1.5,76), (3,74), (4.5,73), (6.5,69)],
    [(0,78), (1.5,81), (3,78), (4.5,76), (6.5,73)],
    [(0,78), (2,76), (3.5,74), (5,73), (6.5,74)],
]
for idx, start in enumerate([9.6, 19.2, 28.8, 38.4]):
    for beat, note in motifs[idx]:
        when = start + beat*BEAT
        add(keys(note, 2.6, .46 if idx < 2 else .54), when, .72,
            .24*math.sin(beat), .72)

# Offbeat mid-register pulse keeps movement restrained and modern.
for symbol, start, length in progression:
    if not (9.6 <= start < 48):
        continue
    for beat in np.arange(.5, length/BEAT, 1):
        note = chords[symbol]['key'][int(beat) % 3]
        add(keys(note, .9, .25), start+beat*BEAT, .36,
            -.34 if int(beat)%2 else .34, .32)

# Rounded bass and minimal electronic pocket, gently increasing in energy.
for bar_index in range(4, 23):
    start = bar_index*BAR
    active = next(c for c in reversed(progression) if c[1] <= start+.0001)
    root = chords[active[0]]['root']
    energy = .77 if start < 19.2 else .93 if start < 38.4 else 1.0
    if start >= 48:
        energy = .76
    for beat, velocity in [(0,1), (2,.90)]:
        add(kick(velocity*energy), start+beat*BEAT)
    if 28.8 <= start < 48:
        add(kick(.42), start+3.5*BEAT)
    for beat, length, velocity in [(0,.88,1), (1.5,.43,.56), (2,.80,.75), (3.5,.36,.43)]:
        if start >= 48 and beat in (1.5,3.5):
            continue
        add(bass(root, length, velocity), start+beat*BEAT+.010, .80*energy)
    for beat in [1,3]:
        add(soft_clap(.72*energy), start+beat*BEAT+.009, pan=.10, wet=.14)
    for beat in np.arange(.5, 4, .5):
        if start >= 48 and beat % 1 == 0:
            continue
        weight = .72 if beat % 1 else .40
        add(brushed_hat(.10, weight*energy), start+beat*BEAT,
            pan=.26 if int(beat*2)%2 else -.24, wet=.05)

for end, strength in [(9.6,.75), (19.2,.8), (28.8,1), (38.4,.92), (48,.82), (55.2,.9)]:
    transition(end, 1.2, strength)

# Breath before the mark, then D / F# / A / E in a calm upward brand signature.
for start, midi, vel in [(49.2,76,.42), (50.4,74,.40), (51.6,73,.36),
                        (53.4,69,.36), (55.2,74,.68), (55.5,78,.57),
                        (55.8,81,.48), (56.4,88,.30)]:
    add(keys(midi, 3.8, vel), start, .77, .1 if midi%2 else -.1, .75)
add(bass(38, 2.0, .70), 55.2, .70)
add(kick(.38), 55.2)

# Small, dense stereo room/plate. Unequal taps diffuse the keys without a wash.
reverb = np.zeros_like(dry)
for delay, weight, cross in [(.041,.22,False), (.073,.18,True), (.113,.15,False),
                            (.167,.12,True), (.229,.105,False), (.307,.088,True),
                            (.419,.070,False), (.563,.052,True), (.743,.038,False),
                            (.947,.028,True), (1.213,.019,False), (1.541,.012,True)]:
    offset = round(delay*SR)
    source = send[:-offset, ::-1] if cross else send[:-offset]
    reverb[offset:] += source*weight

mix = dry + reverb
# Very gentle static saturation catches coincident voices, preserving transients.
mix = np.tanh(mix*1.15)/1.15
t = np.arange(N)/SR
mix *= (smooth(t/.060)*smooth((DURATION-t)/1.75))[:,None]
mix -= np.mean(mix, axis=0)
mix *= smooth((DURATION-t)/.05)[:,None]
peak = float(np.max(np.abs(mix)))
mix *= .82/max(peak,.00001)
pcm = np.round(np.clip(mix,-1,1)*32767).astype('<i2')
with wave.open(str(OUT/'premaster.wav'), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(SR)
    stream.writeframes(pcm.tobytes())

manifest = {
    'title': 'MOOA — A Clearer Next Step',
    'duration_seconds': DURATION,
    'sample_rate': SR,
    'channels': 2,
    'bpm': BPM,
    'key': 'D major / relative B minor',
    'scene_anchors_seconds': [0,4.8,9.6,19.2,28.8,38.4,48,55.2,60],
    'provenance': 'Original procedural composition and synthesis created for MOOA Resume. No external samples, recordings, existing melodies, or paid services.',
    'seed': 20260917,
}
(OUT/'score-metadata.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'premaster':str(OUT/'premaster.wav'),'seconds':len(mix)/SR,'samples':len(mix),'peak_before_master':float(np.max(np.abs(mix)))},indent=2))

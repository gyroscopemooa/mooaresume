# MOOA — A Clearer Next Step

Original 60-second instrumental score composed and synthesized for the MOOA Resume advertisement. No external recordings, sample libraries, existing melodies, paid services, or narration are used.

- Delivery: `original-score.wav` — 60.000000 seconds; 48 kHz stereo; 24-bit PCM.
- Tempo and key: 100 BPM; D major / relative B minor.
- Sound: warm felt/electric keys, spacious ninth/seventh pads, rounded bass, brushed electronic percussion, discreet transition swells.
- Structure: sparse opening; rhythm enters at 9.6 s; cut accents at 19.2 / 28.8 / 38.4 / 48 s; D-major brand signature at 55.2 s; smooth fade through 60 s.
- Independent final-file measurement: -16.08 LUFS integrated, -1.29 dBTP true peak, 4.20 LU loudness range. No digital clipping.
- Duration verification: exactly 2,880,000 frames at 48,000 Hz.

`generate_score.py` is the reproducible composition and synthesis source (Python + NumPy, random seed 20260917). It writes `premaster.wav` and `score-metadata.json`.

Mastering used FFmpeg two-pass loudnorm with:

```text
loudnorm=I=-16:TP=-1:LRA=9:measured_I=-17.26:measured_TP=-1.72:measured_LRA=5.10:measured_thresh=-27.37:offset=-0.73:linear=true:print_format=json,aresample=48000,atrim=duration=60
```

Output encoding: `-ar 48000 -c:a pcm_s24le`. As required by the measured headroom, FFmpeg selected dynamic normalization. Loudness numbers above come from an independent analysis of the resulting delivery file.

Scene anchor grid (seconds): `0, 4.8, 9.6, 19.2, 28.8, 38.4, 48, 55.2, 60`.

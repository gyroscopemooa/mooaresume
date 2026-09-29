import { describe, expect, it } from "vitest";
import { AUDIO_ANALYSIS_LIMITS, analyzeInterviewAudio } from "@/domain/interview-audio-analysis";

const RATE = 16_000;

function sine(frequency: number, seconds = 1, amplitude = 0.5, sampleRate = RATE): Float32Array {
  return Float32Array.from({ length: Math.round(seconds * sampleRate) }, (_, index) => amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate));
}

function noise(length: number): Float32Array {
  let state = 12345;
  return Float32Array.from({ length }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 0x100000000 - 0.5) * 0.8;
  });
}

describe("interview audio deterministic PCM measurements", () => {
  it("reports silence as floor-level signal, never fabricated pitch or volume", () => {
    const result = analyzeInterviewAudio(new Float32Array(RATE), RATE);
    expect(result.durationSeconds).toBe(1);
    expect(result.frames).toHaveLength(10);
    expect(result.summary.rmsDbfs).toBe(-100);
    expect(result.summary.peakDbfs).toBe(-100);
    expect(result.summary.pitchMedianHz).toBeNull();
    expect(result.summary.pitchCoverageFraction).toBe(0);
    expect(result.lowSignalIntervals).toEqual([{ startSeconds: 0, endSeconds: 1 }]);
    expect(result.spectrogram.frames.every((frame) => frame.dbfs.every((value) => value === -100))).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("matches known sine peak and RMS without treating dBFS as SPL or loudness", () => {
    const result = analyzeInterviewAudio(sine(200), RATE);
    expect(result.summary.peakDbfs).toBeCloseTo(20 * Math.log10(0.5), 3);
    expect(result.summary.rmsDbfs).toBeCloseTo(20 * Math.log10(0.5 / Math.SQRT2), 3);
    expect(result.frames[0].min).toBeCloseTo(-0.5, 5);
    expect(result.frames[0].max).toBeCloseTo(0.5, 5);
    expect(result.summary.pitchMedianHz).toBeCloseTo(200, 0);
    expect(result.summary.pitchCoverageFraction).toBeCloseTo(1, 5);
    expect(result.summary.nearFullScaleFraction).toBe(0);
    expect(result.lowSignalIntervals).toEqual([]);
  });

  it.each([65, 80, 123, 220, 330, 450, 500])("estimates a %i Hz periodic input conservatively", (frequency) => {
    const result = analyzeInterviewAudio(sine(frequency), RATE);
    expect(result.summary.pitchMedianHz).not.toBeNull();
    expect(Math.abs((result.summary.pitchMedianHz ?? 0) - frequency)).toBeLessThan(2);
    expect(result.frames.every((frame) => frame.pitchHz === null || frame.pitchConfidence >= result.thresholds.pitchConfidence)).toBe(true);
  });

  it("does not label broadband noise or a constant offset as pitched speech", () => {
    const random = analyzeInterviewAudio(noise(RATE), RATE);
    expect(random.summary.pitchCoverageFraction).toBe(0);
    const dc = analyzeInterviewAudio(new Float32Array(RATE).fill(0.4), RATE);
    expect(dc.summary.pitchCoverageFraction).toBe(0);
    expect(dc.summary.rmsDbfs).toBeCloseTo(20 * Math.log10(0.4), 4);
  });

  it("does not turn a filtered high-frequency tone into an aliased vocal-range pitch", () => {
    const result = analyzeInterviewAudio(sine(7_800), RATE);
    expect(result.summary.pitchCoverageFraction).toBe(0);
  });

  it.each([600, 1000, 1800])("does not fold a %i Hz tone into an in-range subharmonic", (frequency) => {
    const result = analyzeInterviewAudio(sine(frequency), RATE);
    expect(result.summary.pitchCoverageFraction).toBe(0);
  });

  it("counts near-full-scale samples exactly without calling it confirmed clipping", () => {
    const samples = Float32Array.from([1, -1, 0.999, -0.999, 0.99, -0.99, 0.5, -0.5]);
    const result = analyzeInterviewAudio(samples, RATE);
    expect(result.summary.nearFullScaleFraction).toBe(0.5);
    expect(result.summary.peakDbfs).toBe(0);
    expect(result.summary.pitchMedianHz).toBeNull();
  });

  it("preserves floating-point decoder overshoot above full scale", () => {
    const result = analyzeInterviewAudio(Float32Array.from([1.1, -1.1]), RATE);
    expect(result.summary.peakDbfs).toBeCloseTo(20 * Math.log10(1.1), 5);
    expect(result.summary.nearFullScaleFraction).toBe(1);
  });

  it("merges adjacent low-signal bins and handles a partial final bin", () => {
    const samples = new Float32Array(Math.round(RATE * 0.35));
    samples.set(sine(200, 0.1), Math.round(RATE * 0.2));
    const result = analyzeInterviewAudio(samples, RATE);
    expect(result.frames).toHaveLength(4);
    expect(result.frames[3].endSeconds).toBe(0.35);
    expect(result.lowSignalIntervals).toEqual([{ startSeconds: 0, endSeconds: 0.2 }, { startSeconds: 0.3, endSeconds: 0.35 }]);
    expect(result.summary.lowSignalSeconds).toBeCloseTo(0.25, 8);
  });

  it("applies the explicit -45 dBFS RMS threshold without saying silence or speech", () => {
    const below = analyzeInterviewAudio(new Float32Array(1600).fill(10 ** (-45.1 / 20)), RATE);
    const above = analyzeInterviewAudio(new Float32Array(1600).fill(10 ** (-44.9 / 20)), RATE);
    expect(below.summary.lowSignalSeconds).toBe(0.1);
    expect(above.summary.lowSignalSeconds).toBe(0);
    expect(below.thresholds.lowSignalDbfs).toBe(-45);
  });

  it("locates an FFT-bin-aligned signal in the matching real spectrum band", () => {
    const result = analyzeInterviewAudio(sine(1000), RATE);
    const frame = result.spectrogram.frames[4];
    const index = frame.dbfs.indexOf(Math.max(...frame.dbfs));
    expect(Math.abs(result.spectrogram.frequenciesHz[index] - 1000)).toBeLessThan(40);
    expect(Math.max(...frame.dbfs)).toBeCloseTo(-6.02, 0);
    expect(result.spectrogram.frames).toHaveLength(result.frames.length);
    expect(result.spectrogram.frequenciesHz).toHaveLength(64);
  });

  it.each([8_000, 44_100, 48_000, 96_000])("accepts %i Hz PCM and preserves timing and pitch", (sampleRate) => {
    const result = analyzeInterviewAudio(sine(180, 0.25, 0.5, sampleRate), sampleRate);
    expect(result.durationSeconds).toBe(0.25);
    expect(result.frames.at(-1)?.endSeconds).toBe(0.25);
    expect(Math.abs((result.summary.pitchMedianHz ?? 0) - 180)).toBeLessThan(2);
  });

  it("does not mutate PCM and is deterministic", () => {
    const samples = sine(200, 0.2);
    const preserved = samples.slice();
    const first = analyzeInterviewAudio(samples, RATE);
    expect(analyzeInterviewAudio(samples, RATE)).toEqual(first);
    expect(samples).toEqual(preserved);
  });

  it("accepts the exact duration cap with bounded frame and spectral output", () => {
    const result = analyzeInterviewAudio(new Float32Array(RATE * AUDIO_ANALYSIS_LIMITS.maxDurationSeconds), RATE);
    expect(result.durationSeconds).toBe(180);
    expect(result.frames).toHaveLength(1800);
    expect(result.spectrogram.frames).toHaveLength(1800);
    expect(result.spectrogram.frames[0].dbfs).toHaveLength(64);
  });

  it("rejects unsupported, nonfinite and oversized inputs before expensive analysis", () => {
    expect(() => analyzeInterviewAudio(new Float32Array(), RATE)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array([NaN]), RATE)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array([Infinity]), RATE)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array([17]), RATE)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array([0]), 7_999)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array([0]), 96_001)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array([0]), 16_000.5)).toThrow();
    expect(() => analyzeInterviewAudio(new Float32Array(AUDIO_ANALYSIS_LIMITS.maxDurationSeconds * 8_000 + 1), 8_000)).toThrow();
  });
});

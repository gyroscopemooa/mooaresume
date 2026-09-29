/**
 * Local signal measurements, not speech recognition, emotion or interview scoring.
 * dBFS here means 20 log10(amplitude relative to PCM full scale = 1).
 * RMS is unweighted PCM RMS, not LUFS, SPL or perceived loudness. The UI must
 * retain these distinctions, including AGC / microphone-distance limitations.
 */
export const AUDIO_ANALYSIS_VERSION = "pcm-observations-v1";

export const AUDIO_ANALYSIS_LIMITS = {
  maxDurationSeconds: 180,
  minSampleRate: 8_000,
  maxSampleRate: 96_000,
  maxSamples: 17_280_000,
  // Float decoders may overshoot +/-1; preserve those peaks instead of clipping.
  // Bound pathological input while supporting up to +24 dBFS headroom.
  maxAbsoluteSample: 16,
} as const;

const FRAME_SECONDS = 0.1;
const ANALYSIS_SAMPLE_RATE = 8_000;
const PITCH_WINDOW_SECONDS = 0.06;
const SPECTRUM_FFT_SIZE = 512;
const SPECTRUM_BANDS = 64;
const THRESHOLDS = {
  lowSignalDbfs: -45,
  nearFullScaleAmplitude: 0.995,
  pitchConfidence: 0.85,
  minPitchHz: 65,
  maxPitchHz: 500,
  dbfsFloor: -100,
} as const;

export type AudioAnalysisFrame = {
  startSeconds: number;
  endSeconds: number;
  min: number;
  max: number;
  rmsDbfs: number;
  peakDbfs: number;
  /** Fraction of samples with abs(sample) >= 0.995; not proven clipping. */
  nearFullScaleFraction: number;
  pitchHz: number | null;
  /** Normalized autocorrelation, NOT a calibrated probability of correct pitch. */
  pitchConfidence: number;
};

export type AudioSignalInterval = { startSeconds: number; endSeconds: number };

export type InterviewAudioAnalysis = {
  version: string;
  durationSeconds: number;
  sampleRate: number;
  frameSeconds: number;
  frames: AudioAnalysisFrame[];
  summary: {
    rmsDbfs: number;
    peakDbfs: number;
    nearFullScaleFraction: number;
    lowSignalSeconds: number;
    pitchMedianHz: number | null;
    pitchP10Hz: number | null;
    pitchP90Hz: number | null;
    pitchCoverageFraction: number;
  };
  lowSignalIntervals: AudioSignalInterval[];
  spectrogram: {
    sampleRate: number;
    fftSize: number;
    window: "hann";
    bandAggregation: "peak_magnitude";
    frequenciesHz: number[];
    frames: { timeSeconds: number; dbfs: number[] }[];
  };
  thresholds: {
    lowSignalDbfs: number;
    nearFullScaleAmplitude: number;
    pitchConfidence: number;
    minPitchHz: number;
    maxPitchHz: number;
    dbfsFloor: number;
  };
};

function toDbfs(amplitude: number): number {
  return Math.max(THRESHOLDS.dbfsFloor, 20 * Math.log10(Math.max(amplitude, 1e-10)));
}

function validateInput(samples: Float32Array, sampleRate: number): void {
  if (!(samples instanceof Float32Array) || samples.length === 0) {
    throw new Error("분석할 PCM 오디오가 없습니다.");
  }
  if (!Number.isInteger(sampleRate) || sampleRate < AUDIO_ANALYSIS_LIMITS.minSampleRate || sampleRate > AUDIO_ANALYSIS_LIMITS.maxSampleRate) {
    throw new Error("지원하지 않는 오디오 샘플레이트입니다 (8–96 kHz).");
  }
  if (samples.length > AUDIO_ANALYSIS_LIMITS.maxSamples || samples.length / sampleRate > AUDIO_ANALYSIS_LIMITS.maxDurationSeconds) {
    throw new Error("오디오 분석은 한 번에 180초까지 가능합니다.");
  }
  for (let index = 0; index < samples.length; index += 1) {
    if (!Number.isFinite(samples[index]) || Math.abs(samples[index]) > AUDIO_ANALYSIS_LIMITS.maxAbsoluteSample) {
      throw new Error("오디오 PCM 값이 유한하지 않거나 지원 범위를 벗어났습니다.");
    }
  }
}

/**
 * 63-tap Hann-windowed sinc low-pass resampler. 3.2 kHz cutoff leaves a
 * transition band below 8 kHz Nyquist; no unfiltered sample skipping.
 * Only pitch and the spectrogram use this signal. RMS / peak use original PCM.
 * Edges are clamped. Per-output coefficient normalization preserves DC gain.
 */
function resampleForPeriodicity(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === ANALYSIS_SAMPLE_RATE) return samples;
  const output = new Float32Array(Math.max(1, Math.floor(samples.length * ANALYSIS_SAMPLE_RATE / sampleRate)));
  const halfWidth = 31;
  const cutoff = 3_200 / sampleRate;
  const ratio = sampleRate / ANALYSIS_SAMPLE_RATE;
  // Common decoded sample rates have a small repeating set of fractional phases.
  const phases = new Map<string, { weights: Float64Array; weightSum: number }>();
  for (let index = 0; index < output.length; index += 1) {
    const position = index * ratio;
    const center = Math.floor(position);
    const fraction = position - center;
    const phaseKey = fraction.toFixed(8);
    let phase = phases.get(phaseKey);
    if (!phase) {
      const weights = new Float64Array(2 * halfWidth + 1);
      let weightSum = 0;
      for (let tap = -halfWidth; tap <= halfWidth; tap += 1) {
        const distance = tap - fraction;
        const sinc = Math.abs(distance) < 1e-10 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * distance) / (Math.PI * distance);
        const window = 0.5 + 0.5 * Math.cos(Math.PI * distance / (halfWidth + 1));
        const weight = sinc * window;
        weights[tap + halfWidth] = weight;
        weightSum += weight;
      }
      phase = { weights, weightSum };
      phases.set(phaseKey, phase);
    }
    let sum = 0;
    for (let tap = -halfWidth; tap <= halfWidth; tap += 1) {
      const sourceIndex = Math.max(0, Math.min(samples.length - 1, center + tap));
      sum += samples[sourceIndex] * phase.weights[tap + halfWidth];
    }
    output[index] = sum / phase.weightSum;
  }
  return output;
}

function centeredWindow(samples: Float32Array, center: number, size: number): Float64Array {
  const length = Math.min(size, samples.length);
  const start = Math.max(0, Math.min(samples.length - length, Math.round(center - length / 2)));
  const result = new Float64Array(length);
  let mean = 0;
  for (let index = 0; index < length; index += 1) mean += samples[start + index];
  mean /= length;
  for (let index = 0; index < length; index += 1) result[index] = samples[start + index] - mean;
  return result;
}

/**
 * Conservative periodicity estimate from a 60 ms, DC-removed centered window.
 * Overlap-normalized correlation prevents finite-window energy decay bias.
 * Select the first local peak within 95% of the strongest correlation peak to
 * prefer a fundamental period over its integer multiples. Parabolic peak
 * interpolation reduces sample-grid quantization. Harmonic/noise ambiguity
 * remains: this is NOT a speech detector and music can also yield a pitch.
 */
function estimatePitch(samples: Float32Array, center: number, rmsDbfs: number): { pitchHz: number | null; pitchConfidence: number } {
  const noPitch = { pitchHz: null, pitchConfidence: 0 };
  if (rmsDbfs < THRESHOLDS.lowSignalDbfs) return noPitch;
  const window = centeredWindow(samples, center, Math.round(PITCH_WINDOW_SECONDS * ANALYSIS_SAMPLE_RATE));
  // Search above the display pitch range too: an actual 1 kHz tone must not
  // become a falsely accepted 500 Hz integer-multiple period.
  const minLag = 3;
  const maxLag = Math.ceil(ANALYSIS_SAMPLE_RATE / THRESHOLDS.minPitchHz);
  if (window.length < maxLag * 3) return noPitch;
  let energy = 0;
  for (const value of window) energy += value * value;
  if (toDbfs(Math.sqrt(energy / window.length)) < THRESHOLDS.lowSignalDbfs) return noPitch;
  const correlations = new Float64Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag += 1) {
    let sum = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = 0; index < window.length - lag; index += 1) {
      const left = window[index];
      const right = window[index + lag];
      sum += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    correlations[lag] = denominator > 1e-10 ? sum / denominator : 0;
  }
  const peaks: number[] = [];
  let bestCorrelation = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (correlations[lag] > correlations[lag - 1] && correlations[lag] >= correlations[lag + 1]) {
      peaks.push(lag);
      bestCorrelation = Math.max(bestCorrelation, correlations[lag]);
    }
  }
  if (bestCorrelation < THRESHOLDS.pitchConfidence) return noPitch;
  const lag = peaks.find((peak) => correlations[peak] >= Math.max(THRESHOLDS.pitchConfidence, bestCorrelation * 0.95));
  if (lag === undefined) return noPitch;
  const left = correlations[lag - 1];
  const middle = correlations[lag];
  const right = correlations[lag + 1];
  const denominator = left - 2 * middle + right;
  const offset = Math.abs(denominator) > 1e-10 ? Math.max(-0.5, Math.min(0.5, 0.5 * (left - right) / denominator)) : 0;
  const pitchHz = ANALYSIS_SAMPLE_RATE / (lag + offset);
  if (pitchHz < THRESHOLDS.minPitchHz || pitchHz > THRESHOLDS.maxPitchHz) return noPitch;
  return { pitchHz, pitchConfidence: Math.max(0, Math.min(1, middle)) };
}

/** In-place radix-2 FFT; fixed 512-point input keeps memory and CPU bounded. */
function fft(real: Float64Array, imaginary: Float64Array): void {
  const length = real.length;
  for (let index = 1, reverse = 0; index < length; index += 1) {
    let bit = length >> 1;
    for (; reverse & bit; bit >>= 1) reverse ^= bit;
    reverse ^= bit;
    if (index < reverse) {
      [real[index], real[reverse]] = [real[reverse], real[index]];
      [imaginary[index], imaginary[reverse]] = [imaginary[reverse], imaginary[index]];
    }
  }
  for (let size = 2; size <= length; size *= 2) {
    const angle = -2 * Math.PI / size;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let start = 0; start < length; start += size) {
      let twiddleReal = 1;
      let twiddleImaginary = 0;
      for (let offset = 0; offset < size / 2; offset += 1) {
        const even = start + offset;
        const odd = even + size / 2;
        const oddReal = real[odd] * twiddleReal - imaginary[odd] * twiddleImaginary;
        const oddImaginary = real[odd] * twiddleImaginary + imaginary[odd] * twiddleReal;
        real[odd] = real[even] - oddReal;
        imaginary[odd] = imaginary[even] - oddImaginary;
        real[even] += oddReal;
        imaginary[even] += oddImaginary;
        const nextReal = twiddleReal * stepReal - twiddleImaginary * stepImaginary;
        twiddleImaginary = twiddleReal * stepImaginary + twiddleImaginary * stepReal;
        twiddleReal = nextReal;
      }
    }
  }
}

function spectrumFrame(samples: Float32Array, center: number): number[] {
  const window = centeredWindow(samples, center, SPECTRUM_FFT_SIZE);
  const real = new Float64Array(SPECTRUM_FFT_SIZE);
  const imaginary = new Float64Array(SPECTRUM_FFT_SIZE);
  let windowSum = 0;
  for (let index = 0; index < window.length; index += 1) {
    const weight = window.length === 1 ? 1 : 0.5 * (1 - Math.cos(2 * Math.PI * index / (window.length - 1)));
    real[index] = window[index] * weight;
    windowSum += weight;
  }
  fft(real, imaginary);
  const dbfs: number[] = [];
  for (let band = 0; band < SPECTRUM_BANDS; band += 1) {
    let peakAmplitude = 0;
    // Four positive-frequency bins per band; DC omitted after mean removal.
    for (let bin = band * 4 + 1; bin <= band * 4 + 4; bin += 1) {
      const factor = bin === SPECTRUM_FFT_SIZE / 2 ? 1 : 2;
      peakAmplitude = Math.max(peakAmplitude, factor * Math.hypot(real[bin], imaginary[bin]) / Math.max(windowSum, 1));
    }
    dbfs.push(toDbfs(peakAmplitude));
  }
  return dbfs;
}

function quantile(sorted: number[], probability: number): number | null {
  if (sorted.length === 0) return null;
  const location = (sorted.length - 1) * probability;
  const lower = Math.floor(location);
  const upper = Math.ceil(location);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (location - lower);
}

/** Run in a worker for browser use; never uploads, mutates or retains input PCM. */
export function analyzeInterviewAudio(samples: Float32Array, sampleRate: number): InterviewAudioAnalysis {
  validateInput(samples, sampleRate);
  const durationSeconds = samples.length / sampleRate;
  const filtered = resampleForPeriodicity(samples, sampleRate);
  const frameSize = Math.round(FRAME_SECONDS * sampleRate);
  const frames: AudioAnalysisFrame[] = [];
  const lowSignalIntervals: AudioSignalInterval[] = [];
  const spectrumFrames: InterviewAudioAnalysis["spectrogram"]["frames"] = [];
  const pitches: number[] = [];
  let totalSquareSum = 0;
  let totalNearFullScale = 0;
  let totalPeak = 0;
  let periodicSeconds = 0;
  for (let start = 0; start < samples.length; start += frameSize) {
    const end = Math.min(samples.length, start + frameSize);
    let min = Infinity;
    let max = -Infinity;
    let squareSum = 0;
    let nearFullScale = 0;
    for (let index = start; index < end; index += 1) {
      const value = samples[index];
      min = Math.min(min, value);
      max = Math.max(max, value);
      squareSum += value * value;
      if (Math.abs(value) >= THRESHOLDS.nearFullScaleAmplitude) nearFullScale += 1;
    }
    const startSeconds = start / sampleRate;
    const endSeconds = end / sampleRate;
    const rmsDbfs = toDbfs(Math.sqrt(squareSum / (end - start)));
    const peak = Math.max(Math.abs(min), Math.abs(max));
    const timeSeconds = (startSeconds + endSeconds) / 2;
    const pitch = estimatePitch(filtered, timeSeconds * ANALYSIS_SAMPLE_RATE, rmsDbfs);
    frames.push({ startSeconds, endSeconds, min, max, rmsDbfs, peakDbfs: toDbfs(peak), nearFullScaleFraction: nearFullScale / (end - start), ...pitch });
    spectrumFrames.push({ timeSeconds, dbfs: spectrumFrame(filtered, timeSeconds * ANALYSIS_SAMPLE_RATE) });
    totalSquareSum += squareSum;
    totalNearFullScale += nearFullScale;
    totalPeak = Math.max(totalPeak, peak);
    if (pitch.pitchHz !== null) {
      pitches.push(pitch.pitchHz);
      periodicSeconds += endSeconds - startSeconds;
    }
    if (rmsDbfs < THRESHOLDS.lowSignalDbfs) {
      const previous = lowSignalIntervals.at(-1);
      if (previous && Math.abs(previous.endSeconds - startSeconds) < 1e-8) previous.endSeconds = endSeconds;
      else lowSignalIntervals.push({ startSeconds, endSeconds });
    }
  }
  pitches.sort((left, right) => left - right);
  return {
    version: AUDIO_ANALYSIS_VERSION,
    durationSeconds,
    sampleRate,
    frameSeconds: FRAME_SECONDS,
    frames,
    summary: {
      rmsDbfs: toDbfs(Math.sqrt(totalSquareSum / samples.length)),
      peakDbfs: toDbfs(totalPeak),
      nearFullScaleFraction: totalNearFullScale / samples.length,
      lowSignalSeconds: lowSignalIntervals.reduce((sum, interval) => sum + interval.endSeconds - interval.startSeconds, 0),
      pitchMedianHz: quantile(pitches, 0.5),
      pitchP10Hz: quantile(pitches, 0.1),
      pitchP90Hz: quantile(pitches, 0.9),
      pitchCoverageFraction: Math.max(0, Math.min(1, periodicSeconds / durationSeconds)),
    },
    lowSignalIntervals,
    spectrogram: {
      sampleRate: ANALYSIS_SAMPLE_RATE,
      fftSize: SPECTRUM_FFT_SIZE,
      window: "hann",
      bandAggregation: "peak_magnitude",
      frequenciesHz: Array.from({ length: SPECTRUM_BANDS }, (_, index) => (index * 4 + 2.5) * ANALYSIS_SAMPLE_RATE / SPECTRUM_FFT_SIZE),
      frames: spectrumFrames,
    },
    thresholds: { ...THRESHOLDS },
  };
}

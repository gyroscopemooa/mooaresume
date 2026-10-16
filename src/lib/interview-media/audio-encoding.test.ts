import { describe, expect, it } from "vitest";
import { encodeMonoPcm16Wav } from "./audio-encoding";

describe("audio-only STT encoding", () => {
  it("writes a mono16kHz WAV with clamped16bit samples and no source metadata", () => {
    const bytes = encodeMonoPcm16Wav(new Float32Array([-2, -1, 0, .5, 1, 2]), 16000);
    const view = new DataView(bytes);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(40, true)).toBe(12);
    expect(bytes.byteLength).toBe(56);
    expect([0,1,2,3,4,5].map(index => view.getInt16(44 + index * 2, true))).toEqual([-32768,-32768,0,16384,32767,32767]);
  });
  it("rejects unsupported rate, empty, nonfinite or long PCM", () => {
    expect(() => encodeMonoPcm16Wav(new Float32Array([0]),48000)).toThrow();
    expect(() => encodeMonoPcm16Wav(new Float32Array(),16000)).toThrow();
    expect(() => encodeMonoPcm16Wav(new Float32Array([NaN]),16000)).toThrow();
    expect(() => encodeMonoPcm16Wav(new Float32Array(16000*180+1),16000)).toThrow();
  });
});

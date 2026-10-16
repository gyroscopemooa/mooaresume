# MOOA Interview PRO current pipeline audit

## Conclusion

The current prototype has real browser-local recording, transcription, audio observation, Face/Pose, visible hand/lower-body geometry, iris-coordinate experiments, and a development-only local VLM call path. Korean pronunciation scoring and calibrated lens eye contact remain unavailable. The connected VLM produced poor outputs on the first real recording and is therefore held from production coaching. See `docs/interview-coaching-validation-status-2026-10-17.md` for evidence by feature.

## Recording and source integrity

- `src/components/interview-prototype/local-interview-prototype.tsx` creates one `MediaRecorder` per answer, appends every non-empty `dataavailable` Blob, and assembles all chunks only after `stop`.
- Elapsed duration comes from `performance.now()`, not chunk count multiplied by `timeslice`. The duration is a recorder hint for WebM files whose metadata is not finalized.
- The assembled Blob and object URL stay in browser memory. Replacing an attempt and leaving the page revoke the old URL.
- `src/lib/interview-media/audio-client.ts` compares decoded PCM duration with the recorder duration. A materially shorter decode blocks delivery coaching instead of treating a partial clip as the full answer.
- MediaStream track device IDs are read through `getSettings`. The prototype does not yet persist the full applied echo cancellation, noise suppression, auto-gain, channel, and sample-rate settings in an analysis record.

## Transcription versions

- `src/lib/interview-media/streaming-transcription.ts` is a low-latency progress path and de-duplicates overlapping chunks. It is not treated as final ground truth.
- `src/lib/interview-media/local-transcription.ts` decodes the complete recorded answer and runs the selected browser worker after recording.
- The result UI now distinguishes `raw_final`, `recognition_correction`, and `practice_rewrite`. A recognition correction is the user-confirmed content-analysis text. A practice rewrite is clearly separated and must not be counted as something spoken in the original interview.
- Editing invalidates the current content-analysis result and confirmation. Original audio and video observations remain tied to the recorded media. Segment links are shown only when the edited text still has a unique valid match.
- Current local STT returns no word or segment timestamps. Speed and filler observations that require timestamps are therefore held unless a timestamped transcript is available.

## Local STT

- Browser worker: `public/interview-analysis/local-stt-worker.js`.
- Runtime: Transformers.js 4.3.1 downloaded from jsDelivr at runtime.
- Candidate order: Cohere Transcribe ONNX on WebGPU, Whisper Large v3 Turbo on WebGPU, Whisper Base q8 on WASM fallback.
- Decoded PCM is transferred to the browser Worker, not uploaded by application code. Runtime and model weights are downloaded and browser-cached.
- Model revisions and weight hashes are not pinned in the current worker. This is a release blocker recorded in `MODEL_MANIFEST.json`, not a completed supply-chain guarantee.

## Audio observation

- `src/lib/interview-media/audio-client.ts` decodes the complete source and runs signal analysis and Silero VAD.
- `src/lib/interview-media/speech-activity-client.ts` runs the packaged Silero legacy ONNX model locally with ONNX Runtime Web.
- `src/domain/interview-delivery-report.ts` uses real speech intervals for mid-answer pauses, relative ending level, and pitch distribution. Raw dBFS, peak, and other device-oriented measurements stay in the detailed development section.
- These observations do not prove Korean pronunciation accuracy, end-syllable intelligibility, personality, emotion, or true confidence. No audio-understanding API currently receives the original recording.

## Video observation

- `src/lib/interview-media/vision-analysis.ts` loads same-origin MediaPipe Face and Pose model files and samples recorded video at 0.5-second intervals.
- It records face visibility, coarse face direction, head roll, shoulder and torso tilt, screen movement, wrists near the face, and visible knee/ankle movement. Coaching requires minimum duration and valid-sample guards.
- Iris projection is connected only as a development measurement. It is not calibrated lens eye contact. Clothing/hair VLM inference is connected to three real frames but failed its first purpose-specific quality check, so it remains development-only and cannot create production coaching.
- The current batch Face/Pose calls execute from the UI-side analysis path. Moving synchronous MediaPipe inference to a dedicated Worker and measuring low-end device performance remains release work.

## APIs and data transmission

- `/api/dev/interview-pro/feedback` sends the question, user-confirmed answer text, context, and text-analysis settings to the configured OpenAI Responses API. API keys stay server-side.
- Original audio, original video, video frames, Face/Pose landmarks, and the local delivery report are not included in the content-feedback request.
- The optional non-session transcription endpoint can send an exported WAV to the configured server transcription route after explicit consent. The default interview session uses local transcription.
- There is no remote audio-review or visual-review implementation. UI copy must not say an AI listened to or watched the answer through an external model.

## Result UI and consent

- The answer video and audio replay appear before coaching.
- Delivery coaching separates voice and visual observations from content coaching and links measured events to replay timestamps.
- Recording setup consent controls browser-local Face/Pose batch analysis. No consent, unsupported media, processing failure, and insufficient evidence are distinct states.
- Technical graphs, model-oriented metrics, and sample counts are progressively disclosed in the development detail section.

## Installed assets, licensing, and cost

- Packaged model identifiers, file sizes, SHA-256 values, runtimes, and known limits are recorded in `public/interview-analysis/MODEL_MANIFEST.json`.
- Browser-local Face/Pose and VAD have no per-request API fee. They have download, CPU/WASM, memory, and latency costs.
- Content coaching uses the configured OpenAI text model and can incur API charges per explicit analysis action.
- No paid media API, production deployment, user-media upload, or model-training use was added by this audit.

## Release blockers and next verification

1. Pin the runtime STT model revisions and hashes or serve audited same-origin weights.
2. Benchmark recording continuity, model load, memory, and analysis latency on target Windows browsers without WebGPU.
3. Build consented Korean speech and webcam fixtures with independent human labels; report precision, recall, interval error, and hold rate by feature.
4. Move batch MediaPipe inference off the UI thread before enabling longer sessions broadly.
5. Add a separately consented and cost-limited audio or visual understanding adapter only after provider retention, price, Korean quality, and employment-use constraints are verified.
6. Do not enable clothing, hair, pronunciation, exact gaze, confidence, emotion, or lower-body claims until their evidence paths pass release tests.

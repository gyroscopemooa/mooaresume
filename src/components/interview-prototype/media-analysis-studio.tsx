"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronRight, SlidersHorizontal, Upload, X } from "lucide-react";
import type { InterviewAudioAnalysis } from "@/domain/interview-audio-analysis";
import { analyzeAudioBlob, createCalibrationWav, MAX_MEDIA_BYTES } from "@/lib/interview-media/audio-client";
import { analyzeLocalVideo, FACE_OVERLAY_CONNECTIONS, getVisionFrameAtTime, type VisionAnalysisResult } from "@/lib/interview-media/vision-analysis";
import { analyzeAppearanceWithLocalVlm, type AppearanceVlmResult } from "@/lib/interview-media/appearance-vlm";
import styles from "./media-analysis-studio.module.css";
import { InterviewFeedbackPanel } from "./interview-feedback-panel";
import { TrainingReport } from "./training-insights";
import { summarizeCamera, type TrainingAttempt, type TrainingContext } from "@/domain/interview-training";
import { buildInterviewDeliveryReport, type DeliveryTranscriptEvidence } from "@/domain/interview-delivery-report";

export type StudioRecording = { questionId: string; question: string; objectUrl: string; mimeType: string; durationSeconds: number; answerText?: string; transcriptText?: string };
type Source = { blob: Blob; url: string; title: string; question?: string; answer?: string; video: boolean; calibration: boolean; durationHint?: number };
type PlotMode = "waveform" | "level" | "pitch";
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const selectKeyFrames = <T,>(items: readonly T[], count = 5): T[] => {
  if (items.length <= count) return [...items];
  return Array.from({ length: count }, (_, index) => items[Math.round(index * (items.length - 1) / (count - 1))]);
};

export function MediaAnalysisStudio({ recordings = [], embedded = false, company = "", role = "", attempts: externalAttempts, onAttempt, onPractice, onAdaptiveRound, trainingContext, selectedQuestionId, sessionMode = false, videoAnalysisConsent = false }: { recordings?: StudioRecording[]; embedded?: boolean; company?: string; role?: string; attempts?: TrainingAttempt[]; onAttempt?: (attempt: TrainingAttempt) => void; onPractice?: (question: string) => void; onAdaptiveRound?: (questions: string[]) => void; trainingContext?: TrainingContext; selectedQuestionId?: string | null; sessionMode?: boolean; videoAnalysisConsent?: boolean }) {
  const [localAttempts, setLocalAttempts] = useState<TrainingAttempt[]>([]);
  const [replayHost, setReplayHost] = useState<HTMLDivElement | null>(null);
  const [manual, setManual] = useState({ key: "manual", question: "", answer: "" });
  const attempts = externalAttempts ?? localAttempts;
  const saveAttempt = (attempt: TrainingAttempt) => { if (onAttempt) onAttempt(attempt); else setLocalAttempts(previous => [...previous.filter(item => item.id !== attempt.id), attempt].slice(-20)); };
  const [source, setSource] = useState<Source | null>(null);
  const [audio, setAudio] = useState<InterviewAudioAnalysis | null>(null);
  const [vision, setVision] = useState<VisionAnalysisResult | null>(null);
  const [transcriptEvidence, setTranscriptEvidence] = useState<DeliveryTranscriptEvidence | null>(null);
  const [busy, setBusy] = useState(false);
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionConsent, setVisionConsent] = useState(videoAnalysisConsent);
  const [appearanceConsent, setAppearanceConsent] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceVlmResult | null>(null);
  const [appearanceBusy, setAppearanceBusy] = useState(false);
  const [appearanceProgress, setAppearanceProgress] = useState("");
  const [appearanceError, setAppearanceError] = useState("");
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [visionError, setVisionError] = useState("");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<PlotMode>("waveform");
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(0.7);
  const [playing, setPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 16, height: 9 });
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const sourceRef = useRef<Source | null>(null);
  const audioJob = useRef<AbortController | null>(null);
  const visionJob = useRef<AbortController | null>(null);
  const autoAnalyzedSource = useRef<string | null>(null);
  const autoVisionAnalyzedSource = useRef<string | null>(null);
  const selection = useRef(0);
  const autoSelectedQuestion = useRef<string | null>(null);
  const abortAll = useCallback(() => { audioJob.current?.abort(); visionJob.current?.abort(); }, []);
  useEffect(() => () => {
    selection.current++;
    audioJob.current?.abort(); visionJob.current?.abort();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
  }, []);
  const choose = useCallback((blob: Blob, title: string, video: boolean, calibration = false, durationHint?: number, question?: string, answer?: string) => {
    if (!blob.size || blob.size > MAX_MEDIA_BYTES) { setError("80MB 이하의 비어 있지 않은 영상·음성 파일을 선택하세요."); return; }
    selection.current++;
    abortAll();
    mediaRef.current?.pause();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    const next = { blob, title, question, answer, video, calibration, durationHint, url: URL.createObjectURL(blob) };
    sourceRef.current = next; setSource(next); setAudio(null); setVision(null); setAppearance(null); setTranscriptEvidence(null); setPosition(0); setDuration(durationHint ?? 0); setSeeking(false); setDimensions({ width: 16, height: 9 });
    setError(""); setVisionError(""); setBusy(false); setVisionBusy(false); setVisionConsent(videoAnalysisConsent); setPlaying(false); setProgress(0);
    setAppearanceConsent(false); setAppearanceBusy(false); setAppearanceProgress(""); setAppearanceError("");
  }, [abortAll, videoAnalysisConsent]);
  const clear = useCallback(() => {
    selection.current++; abortAll(); mediaRef.current?.pause();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    sourceRef.current = null; setSource(null); setAudio(null); setVision(null); setAppearance(null); setTranscriptEvidence(null); setBusy(false); setVisionBusy(false); setAppearanceBusy(false); setPosition(0); setDuration(0); setPlaying(false); setError(""); setVisionError(""); setAppearanceError(""); setAppearanceProgress("");
    setVisionConsent(videoAnalysisConsent); setAppearanceConsent(false);
    setManual({ key: `manual-${crypto.randomUUID()}`, question: "", answer: "" });
  }, [abortAll, videoAnalysisConsent]);
  const openRecording = useCallback(async (recording: StudioRecording) => {
    if (recording.answerText !== undefined) { clear(); setManual({ key: `${recording.questionId}-${crypto.randomUUID()}`, question: recording.question, answer: recording.answerText }); setDuration(recording.durationSeconds); return; }
    const id = ++selection.current;
    try {
      const response = await fetch(recording.objectUrl);
      const blob = await response.blob();
      if (id === selection.current) choose(blob, recording.question, recording.mimeType.startsWith("video/"), false, recording.durationSeconds, recording.question, recording.transcriptText);
    } catch { if (id === selection.current) setError("녹화가 메모리에서 해제됐습니다. 다시 녹화해 주세요."); }
  }, [choose, clear]);
  useEffect(() => {
    if (!selectedQuestionId || autoSelectedQuestion.current === selectedQuestionId) return;
    const recording = recordings.find((item) => item.questionId === selectedQuestionId);
    if (!recording) return;
    let active = true;
    queueMicrotask(() => {
      if (!active || autoSelectedQuestion.current === selectedQuestionId) return;
      autoSelectedQuestion.current = selectedQuestionId;
      void openRecording(recording);
    });
    return () => { active = false; };
  }, [openRecording, recordings, selectedQuestionId]);
  const runAudio = useCallback(async () => {
    if (!source || busy) return;
    const controller = new AbortController(); audioJob.current?.abort(); audioJob.current = controller;
    setBusy(true); setError("");
    try {
      const result = await analyzeAudioBlob(source.blob, controller.signal, duration);
      if (!controller.signal.aborted) setAudio(result);
    } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "음성 분석 오류"); }
    finally { if (audioJob.current === controller) setBusy(false); }
  }, [busy, duration, source]);
  useEffect(() => {
    if (!sessionMode || !source || source.calibration || duration <= 0 || duration > 180 || autoAnalyzedSource.current === source.url) return;
    autoAnalyzedSource.current = source.url;
    void runAudio();
  }, [duration, runAudio, sessionMode, source]);
  const runVision = useCallback(async () => {
    if (!source?.video || !visionConsent || visionBusy) return;
    const controller = new AbortController(); visionJob.current?.abort(); visionJob.current = controller;
    setVisionBusy(true); setVisionError(""); setProgress(0);
    try {
      const result = await analyzeLocalVideo(source.blob, { signal: controller.signal, durationHintSeconds: duration || undefined, onProgress: (done, total) => { if (!controller.signal.aborted) setProgress(total ? done / total : 0); } });
      if (!controller.signal.aborted) setVision(result);
    } catch (err) { if (!controller.signal.aborted) setVisionError(err instanceof Error ? err.message : "영상 분석 오류"); }
    finally { if (visionJob.current === controller) setVisionBusy(false); }
  }, [duration, source, visionBusy, visionConsent]);
  useEffect(() => {
    if (!sessionMode || !source?.video || !visionConsent || duration <= 0 || duration > 180 || autoVisionAnalyzedSource.current === source.url) return;
    autoVisionAnalyzedSource.current = source.url;
    void runVision();
  }, [duration, runVision, sessionMode, source, visionConsent]);
  const seek = (seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const target = clamp(seconds, 0, duration || 0);
    if (Math.abs(media.currentTime - target) > .001) { setSeeking(true); media.currentTime = target; }
    setPosition(target);
  };
  const runAppearance = async () => {
    if (!source?.video || !appearanceConsent || appearanceBusy) return;
    setAppearanceBusy(true); setAppearanceError(""); setAppearanceProgress("대표 프레임 준비 중");
    try {
      setAppearance(await analyzeAppearanceWithLocalVlm(source.blob, duration, setAppearanceProgress));
    } catch (err) {
      setAppearanceError(err instanceof Error ? err.message : "로컬 VLM 추론에 실패했습니다.");
    } finally {
      setAppearanceBusy(false);
    }
  };
  const practice = (question: string) => { if (onPractice) onPractice(question); else { clear(); setManual({ key: `practice-${crypto.randomUUID()}`, question, answer: "" }); } };
  const cameraSummary = summarizeCamera(vision);
  const deliveryReport = buildInterviewDeliveryReport(audio, vision, duration || null, transcriptEvidence);
  const frame = audio?.frames.find((item) => position >= item.startSeconds && position < item.endSeconds);
  const visionFrame = vision && !playing && !seeking ? getVisionFrameAtTime(vision, position, .01) : null;
  const validVision = visionFrame?.status === "single_face" ? visionFrame : null;
  const keyFrames = selectKeyFrames(vision?.frames ?? []);
  return <section className={`${styles.studio} ${embedded ? styles.embedded : ""}`}>
    {!embedded && <header className={styles.heading}><div><h1>면접 결과</h1><p>답변에서 보완할 점을 확인하고, 내 경험으로 다시 연습하세요.</p></div></header>}
    {!sessionMode && <div className={styles.sourceBar}><label className={styles.upload}><Upload size={18} /><span>영상·음성 불러오기</span><input type="file" accept="video/webm,video/mp4,video/quicktime,audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) choose(file, file.name, file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name)); event.target.value = ""; }} /></label><span>{source ? source.title : "파일 없이 답변을 직접 입력해도 됩니다."}<br />최대 3분 · 80MB · 새로고침 시 초기화</span>{source && <button type="button" className={styles.quietButton} onClick={clear}><X size={16} />파일 해제</button>}</div>}
    {recordings.length > 0 && <div className={styles.recordings} aria-label="녹화 답변 선택">{recordings.map((recording, index) => <button key={recording.questionId} type="button" onClick={() => void openRecording(recording)}>답변 {index + 1}<ChevronRight size={14} /></button>)}</div>}
    {source?.calibration && <div className={styles.calibration}>검증용 합성 신호입니다. 0–2초 160Hz → 2–3초 무음 → 3–5초 240Hz → 5–6초 무음 → 6–8초 200Hz 포화 신호. 사람의 평가 결과가 아닙니다.</div>}
    <div ref={setReplayHost} className={styles.topReplay} aria-label="내 답변 영상·음성 재생" />
    <TrainingReport attempts={attempts} onPractice={practice} onAdaptiveRound={onAdaptiveRound} />
    {source && <DeliveryCoaching report={deliveryReport} audioBusy={busy} visionBusy={visionBusy} visionAvailable={source.video} visionComplete={Boolean(vision)} onEnableVision={() => setVisionConsent(true)} onOpenTechnical={() => setTechnicalOpen(true)} onSeek={(seconds) => { setTechnicalOpen(true); seek(seconds); }} />}
    <details className={styles.evidenceDetails} open={technicalOpen} onToggle={(event) => { const open = event.currentTarget.open; setTechnicalOpen(open); if (!open) mediaRef.current?.pause(); }}>
    <summary><span>상세 분석 도구</span><small>원본 신호와 영상 관찰 근거가 필요할 때만 열어보세요.</small></summary>
    {(audio || cameraSummary) && <section className={styles.analysisCard}><h2>선택 답변의 관찰 요약</h2>{audio && <p>실측 저신호 {audio.summary.lowSignalSeconds.toFixed(1)}초 · 최대 진폭 {audio.summary.peakDbfs.toFixed(1)}dBFS. 작은 신호는 실제 침묵이나 발음 불량을 뜻하지 않습니다.</p>}{cameraSummary && <><p>단일 얼굴 검출 {cameraSummary.validSamples}/{cameraSummary.samples}샘플 · 검출된 얼굴의 화면 중앙 위치 {cameraSummary.centeredPercent === null ? "표본 부족" : `${cameraSummary.centeredPercent}%`} · 미검출 {cameraSummary.missingSamples}샘플 · 연속 샘플의 큰 화면상 이동 {cameraSummary.largeMoves}회</p><p>{cameraSummary.caveat}</p></>}</section>}
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        {replayHost && createPortal(<div className={styles.playerCard}>
          <div className={styles.playerTitle}><span>답변 재생</span><span>{source ? source.video ? "영상·음성" : "음성 전용" : "파일 선택 대기"}</span></div>
          <div className={styles.playerStage}>
            {!source ? <div className={styles.empty}><h2>분석할 답변을 불러오세요</h2><p>촬영한 면접 영상 또는 음성 파일로 시작하세요.<br />장비 없이도 검증 신호로 실제 계산을 확인할 수 있어요.</p></div> : <>
              <div className={styles.mediaPlane} style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}`, maxWidth: 520 * dimensions.width / dimensions.height }}>
                <video key={source.url} ref={mediaRef} src={source.url} playsInline preload="metadata" controls onLoadedMetadata={(event) => { const el = event.currentTarget; setDuration(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : source.durationHint ?? 0); setDimensions({ width: el.videoWidth || 16, height: el.videoHeight || 9 }); el.volume = volume; el.playbackRate = rate; }} onDurationChange={(event) => { const seconds = event.currentTarget.duration; if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds); }} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onSeeking={() => setSeeking(true)} onSeeked={(event) => { setPosition(event.currentTarget.currentTime); setSeeking(false); }} onPlay={() => setPlaying(true)} onPause={(event) => { setPlaying(false); setPosition(event.currentTarget.currentTime); }} onEnded={() => setPlaying(false)} onError={() => setError("이 파일을 재생할 수 없습니다. 지원되는 미디어 형식인지 확인하세요.")} />
                {!source.video && <div className={styles.audioBackdrop}><span>음성 재생</span><b>{time(position)}</b></div>}
                {overlay && validVision && <svg className={styles.faceOverlay} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="xMidYMid meet" aria-label="샘플 프레임의 실제 얼굴 기준점">{FACE_OVERLAY_CONNECTIONS.map((pair, index) => { const a = validVision.landmarks[pair[0]]; const b = validVision.landmarks[pair[1]]; return a && b ? <line key={index} x1={a.x * dimensions.width} y1={a.y * dimensions.height} x2={b.x * dimensions.width} y2={b.y * dimensions.height} /> : null; })}{validVision.landmarks.filter((_, index) => index % 8 === 0).map((point, index) => <circle key={index} cx={point.x * dimensions.width} cy={point.y * dimensions.height} r={dimensions.width * .0018} />)}</svg>}
              </div>
            </>}
          </div>
          <div className={styles.transport}><span className={styles.filename}>{source?.title ?? "선택한 파일은 이 기기에서 재생합니다"}</span><span className={styles.time}>{time(position)} / {time(duration)}</span></div>
          {source && <details className={styles.playSettings}><summary>재생 설정</summary><div className={styles.playOptions}><label>재생 속도<select value={rate} onChange={(event) => { const next = Number(event.target.value); setRate(next); if (mediaRef.current) mediaRef.current.playbackRate = next; }}><option value={.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label><label>듣기 음량<input type="range" min={0} max={1} step={.05} value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (mediaRef.current) mediaRef.current.volume = next; }} /></label></div></details>}
        </div>, replayHost)}
        <section className={styles.signalCard}>
          <div className={styles.sectionTitle}><div><h2>소리의 흐름</h2></div><span>{audio ? `${audio.sampleRate / 1000} kHz · ${audio.frameSeconds * 1000} ms` : "측정 전"}</span></div>
          <div className={styles.tabs} role="group" aria-label="신호 그래프 선택">{([['waveform', '파형'], ['level', '음량'], ['pitch', '음높이']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
          {audio ? <><SignalPlot data={audio} mode={mode} position={position} onSeek={seek} /><label className={styles.scrubber}>재생 위치<input type="range" min={0} max={audio.durationSeconds} step={.01} value={clamp(position, 0, audio.durationSeconds)} onChange={(event) => seek(Number(event.target.value))} /></label><div className={styles.plotLegend}><span>{mode === "waveform" ? "실제 신호의 최소·최대 진폭" : mode === "level" ? "RMS dBFS · 점선은 저신호 기준 −45 dBFS" : "주기성 기반 추정 Hz · 불확실한 구간은 비움"}</span><b>{mode === "pitch" ? frame?.pitchHz ? `${Math.round(frame.pitchHz)} Hz` : "추정 없음" : frame ? `${frame.rmsDbfs.toFixed(1)} dBFS` : "—"}</b></div><Spectrogram data={audio} position={position} onSeek={seek} /></> : <div className={styles.chartEmpty}><p>음성 분석 후 실제 파형과 주파수 분포가 표시됩니다.</p></div>}
        </section>
      </div>
      <aside className={styles.sideColumn}>
        <section className={styles.analysisCard}><div className={styles.sectionTitle}><h2>음성 신호 분석</h2><span className={styles.tag}>기기 내 분석</span></div><p>선택한 파일을 16kHz로 디코딩해 계산합니다. 소음도 신호에 포함되며 발음·내용 점수는 아닙니다.</p><button type="button" className={styles.primary} disabled={!source || busy || visionBusy || duration <= 0 || duration > 180} onClick={() => void runAudio()}>{busy ? "신호 계산 중…" : audio ? "음성 다시 분석" : "음성 분석 시작"}</button>{busy && <button type="button" className={styles.quietButton} onClick={() => { audioJob.current?.abort(); setBusy(false); }}>분석 취소</button>}{source && duration <= 0 && <p role="status">파일 길이를 확인 중입니다. 계속 확인되지 않으면 길이 정보가 포함된 MP4/WAV 등으로 다시 선택하세요.</p>}{duration > 180 && <p role="alert">3분 이하 파일로 잘라서 선택하세요.</p>}{error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.metrics}><Metric label="평균 신호" value={audio ? audio.summary.rmsDbfs.toFixed(1) : "—"} unit="dBFS" /><Metric label="최대 진폭" value={audio ? audio.summary.peakDbfs.toFixed(1) : "—"} unit="dBFS" /><Metric label="저신호 구간" value={audio ? audio.summary.lowSignalSeconds.toFixed(1) : "—"} unit="초" /><Metric label="주기 추정 중앙값" value={audio?.summary.pitchMedianHz ? String(Math.round(audio.summary.pitchMedianHz)) : "—"} unit="Hz" /></div>
          {audio && <p className={styles.method}>최대치 근접 샘플 {(audio.summary.nearFullScaleFraction * 100).toFixed(2)}% · 피치 추정 구간 {(audio.summary.pitchCoverageFraction * 100).toFixed(0)}%. 낮은 값이 우수하다는 뜻이 아닙니다.</p>}
        </section>
        <section className={styles.analysisCard}><div className={styles.sectionTitle}><h2>영상 기준점</h2><span className={styles.tag}>선택 분석</span></div><p>0.5초 간격으로 얼굴과 상체 기준점을 관찰합니다. 정확한 눈 시선·감정·태도 평가는 하지 않습니다.</p><label className={styles.consent}><input type="checkbox" checked={visionConsent} onChange={(event) => { const checked = event.target.checked; setVisionConsent(checked); if (!checked) { visionJob.current?.abort(); setVisionBusy(false); setVision(null); setProgress(0); setVisionError(""); } }} disabled={visionBusy} /><span>선택한 영상을 기기 내 얼굴·자세 분석에 사용하는 데 동의합니다.</span></label><button type="button" className={styles.secondary} disabled={!source?.video || !visionConsent || visionBusy || busy || duration > 180} onClick={() => { mediaRef.current?.pause(); void runVision(); }}>{visionBusy ? `영상 분석 ${Math.round(progress * 100)}%` : vision ? "영상 다시 분석" : "영상 분석 시작"}</button>{visionBusy && <><progress value={progress} max={1} /><button type="button" className={styles.quietButton} onClick={() => { visionJob.current?.abort(); setVisionBusy(false); }}>영상 분석 취소</button></>}{visionError && <p role="alert" className={styles.error}>{visionError}</p>}
          {vision && <><label className={styles.consent}><input type="checkbox" checked={overlay} onChange={(event) => setOverlay(event.target.checked)} /><span>검출 기준점 표시</span></label><p className={styles.method}>1인 검출 {vision.summary.singleFaceSamples}/{vision.summary.sampleCount} 프레임 · 미검출 {vision.summary.missingFaceSamples} · 다중 얼굴 {vision.summary.multipleFaceSamples} · 좌표 확인 불가 {vision.summary.invalidGeometrySamples}</p>{source?.video && <div className={styles.keyFrames} aria-label="답변 주요 장면"><b>주요 장면</b><div>{keyFrames.map((item) => <button type="button" key={item.timeSeconds} aria-label={`${time(item.timeSeconds)} 주요 장면 보기`} onClick={() => { mediaRef.current?.pause(); seek(item.timeSeconds); }}><video src={`${source.url}#t=${item.timeSeconds.toFixed(2)}`} muted playsInline preload="metadata" /><span>{time(item.timeSeconds)}</span></button>)}</div><small>영상에서 일정 간격으로 고른 실제 장면입니다. 표정·감정·외모 점수가 아닙니다.</small></div>}<div className={styles.frameStrip}>{vision.frames.map((item, index) => <button type="button" key={index} title={`${time(item.timeSeconds)} ${item.status}`} aria-label={`${time(item.timeSeconds)} 프레임 보기`} data-valid={item.status === "single_face"} onClick={() => { mediaRef.current?.pause(); seek(item.timeSeconds); }}>{index + 1}</button>)}</div><p className={styles.method}>{validVision ? `현재 프레임 기울기 ${validVision.rollDegrees?.toFixed(1) ?? "—"}° · 홍채 좌우 투영 ${validVision.irisHorizontalRatio === null || validVision.irisHorizontalRatio === undefined ? "미측정" : validVision.irisHorizontalRatio.toFixed(2)} · 렌즈 눈맞춤 점수 아님` : "분석한 샘플에 정지했을 때만 기준점이 표시됩니다. 프레임 번호를 눌러 확인하세요."}{playing ? " 재생 중에는 기준점을 숨깁니다." : ""}</p></>}
        </section>
        <section className={styles.analysisCard}><div className={styles.sectionTitle}><h2>복장·헤어 확인</h2><span className={styles.tag}>선택 기능</span></div><p>영상의 대표 장면에서 머리카락의 눈 가림, 얼굴 가림, 옷깃 상태와 판단 가능한 화질인지 확인합니다. 최초 실행에는 분석 파일을 내려받아 시간이 걸릴 수 있습니다.</p><label className={styles.consent}><input type="checkbox" checked={appearanceConsent} onChange={(event) => { setAppearanceConsent(event.target.checked); if (!event.target.checked) { setAppearance(null); setAppearanceError(""); } }} disabled={appearanceBusy} /><span>현재 영상의 대표 장면을 이 기기에서 확인하는 데 동의합니다. 장면은 외부 분석 서비스로 보내지 않습니다.</span></label><button type="button" className={styles.secondary} disabled={!source?.video || !appearanceConsent || appearanceBusy} onClick={() => void runAppearance()}>{appearanceBusy ? "대표 장면 확인 중…" : appearance ? "다시 확인" : "대표 장면 확인"}</button>{appearanceBusy && <p role="status" className={styles.method}>{appearanceProgress}</p>}{appearanceError && <p role="alert" className={styles.error}>{appearanceError}</p>}
          {appearance && <AppearanceResults result={appearance} onSeek={seek} />}
        </section>
      </aside>
    </div>
    <details className={styles.methodology}><summary><SlidersHorizontal size={18} />측정 방법과 한계</summary><p>파형은 100ms 단위 최소·최대 진폭, 음량은 RMS dBFS입니다. 실제 공간의 dB SPL 또는 청취 명료도 측정이 아닙니다. 다채널은 에너지가 가장 큰 한 채널을 선택합니다. 재표본화·자동 이득·마이크 거리로 값이 달라질 수 있습니다.</p><p>저신호는 −45 dBFS 이하 기준에 따른 구간이며 발화 감지기가 아닙니다. 피치는 65–500Hz 중 주기성이 확인된 구간만 표시하며 음악·잡음·배음에서 틀릴 수 있습니다. 발음·말투의 좋고 나쁨을 판정하지 않습니다.</p><p>주파수 지도는 8kHz 재표본화·3.2kHz 저역통과 후 Hann 창 FFT의 대역별 최대 진폭입니다. 3.2–4kHz는 처리 과정에서 감쇠되므로 발성 특성으로 해석하지 마세요. 색이 밝을수록 해당 대역 신호가 큽니다. 얼굴·신체 기준점은 모델 추정이며 가림·조명·촬영 범위에 영향을 받습니다. 사람 식별이나 외모 평가에 쓰지 않습니다.</p><p>이 영역의 기술 계측은 기기 안에서 처리합니다. 위 AI 전사·피드백은 별도 동의한 음성 또는 텍스트만 서버를 거쳐 OpenAI로 전송합니다. 영상 자체는 전송하지 않습니다.</p><button type="button" className={styles.quietButton} onClick={() => choose(createCalibrationWav(), "측정 검증 신호 · 실제 면접 아님", false, true)}>측정 검증 신호</button></details>
    </details>
    <InterviewFeedbackPanel key={source?.url ?? manual.key} sourceBlob={source?.blob ?? null} sourceKey={source?.url ?? (manual.key === "manual" ? null : manual.key)} durationSeconds={duration} initialQuestion={source?.question ?? manual.question} initialAnswer={source ? source.answer ?? "" : manual.answer} initialCompany={company} initialRole={role} trainingContext={trainingContext} deliveryReport={deliveryReport} onTranscriptEvidence={setTranscriptEvidence} onAttempt={saveAttempt} onPractice={practice} sessionMode={sessionMode} autoTranscribe={sessionMode && Boolean(source) && !source?.calibration && !source?.answer} disabledReason={source?.calibration ? "검증 신호는 실제 면접 답변이 아니므로 AI 평가에 전송하지 않습니다." : undefined} onSeek={(seconds) => { setTechnicalOpen(true); seek(seconds); }} />
    <footer className={styles.footer}>AI 피드백은 확인한 답변을 근거로 제안하며, 확인되지 않은 경험이나 성과를 만들지 않습니다.</footer>
  </section>;
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}

const koreanAppearanceValue = {
  hairEyes: { yes: "눈을 가릴 수 있음", no: "눈 가림 없음", uncertain: "판단 보류" },
  collar: { orderly: "정돈되어 보임", disordered: "정돈 확인 필요", uncertain: "판단 보류" },
  faceOcclusion: { yes: "얼굴 가림 가능성", no: "얼굴 가림 없음", uncertain: "판단 보류" },
  imageQuality: { usable: "확인 가능한 화질", poor: "화질이 부족함", uncertain: "판단 보류" },
} as const;

function AppearanceResults({ result, onSeek }: { result: AppearanceVlmResult; onSeek: (seconds: number) => void }) {
  return <div className={styles.vlmResults}>{result.frames.map((item) => {
    const held = item.hairEyes === "uncertain" && item.collar === "uncertain" && item.faceOcclusion === "uncertain" && item.imageQuality === "uncertain";
    return <article key={item.timeSeconds}><button type="button" onClick={() => onSeek(item.timeSeconds)}><Image src={item.imageDataUrl} width={768} height={432} unoptimized alt={`${time(item.timeSeconds)} 대표 장면`} /><span>{time(item.timeSeconds)} 원본 보기</span></button>{held ? <p className={styles.vlmHeld}>이 장면은 분석 결과가 불안정해 판정을 보류했습니다.</p> : <><dl><div><dt>머리카락 눈 가림</dt><dd>{koreanAppearanceValue.hairEyes[item.hairEyes]}</dd></div><div><dt>옷깃 정돈</dt><dd>{koreanAppearanceValue.collar[item.collar]}</dd></div><div><dt>얼굴 가림</dt><dd>{koreanAppearanceValue.faceOcclusion[item.faceOcclusion]}</dd></div><div><dt>판단 화질</dt><dd>{koreanAppearanceValue.imageQuality[item.imageQuality]}</dd></div></dl><p>자동 관찰 결과이므로 원본 장면과 함께 확인해 주세요.</p></>}</article>;
  })}</div>;
}

function DeliveryCoaching({ report, audioBusy, visionBusy, visionAvailable, visionComplete, onEnableVision, onOpenTechnical, onSeek }: { report: ReturnType<typeof buildInterviewDeliveryReport>; audioBusy: boolean; visionBusy: boolean; visionAvailable: boolean; visionComplete: boolean; onEnableVision: () => void; onOpenTechnical: () => void; onSeek: (seconds: number) => void }) {
  return <section className={styles.deliverySummary} aria-labelledby="delivery-summary-title">
    <div className={styles.sectionTitle}><div><span className={styles.eyebrow}>면접 코칭</span><h2 id="delivery-summary-title">말투·목소리·자세</h2></div><button type="button" className={styles.quietButton} onClick={onOpenTechnical}>원본과 근거 보기</button></div>
    <div className={styles.deliveryGrid}>
      <article><h3>목소리</h3>{audioBusy ? <p>실제 음성 신호를 확인하고 있습니다…</p> : report?.voice.length ? <ul>{report.voice.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>음성 관찰 결과를 준비하고 있습니다.</p>}</article>
      <article><h3>외관·자세</h3>{report?.visual.length ? <ul>{report.visual.map((item, index) => <li key={index}>{item}</li>)}</ul> : visionBusy ? <p>영상에서 구도와 움직임을 확인하고 있습니다…</p> : visionAvailable && !visionComplete ? <div className={styles.visionOptIn}><p>영상 코칭이 꺼져 있어 아직 분석하지 않았습니다.</p><button type="button" onClick={onEnableVision}>이 영상 코칭 시작</button><small>이 기기에서만 처리하며 영상은 외부로 보내지 않습니다.</small></div> : <p>이번 영상에서는 두드러진 자세·화면 이탈 문제가 확인되지 않았습니다.</p>}</article>
      <article><h3>다음 연습</h3>{report?.actions.length ? <ul>{report.actions.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>측정된 문제 구간이 생기면 원본 시점과 함께 안내합니다.</p>}</article>
    </div>
    {report?.strengths.length ? <section className={styles.observedStrengths}><h3>이번 녹화에서 유지할 점</h3><ul>{report.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null}
    {report?.evidenceEvents.length ? <section className={styles.evidenceEvents}><h3>우선 확인할 구간</h3>{report.evidenceEvents.map((event, index) => <article key={`${event.source}-${event.startSeconds}-${index}`}><div><span>{time(event.startSeconds)}–{time(event.endSeconds)}</span><b>{event.title}</b></div><p>{event.observation}</p><strong>다음 연습</strong><p>{event.practice}</p><button type="button" onClick={() => onSeek(event.startSeconds)}>해당 구간 재생</button></article>)}</section> : null}
    {report && (report.holds.length || report.caveats.length) ? <details><summary>분석하지 않은 항목과 판단 범위</summary>{report.holds.map((item, index) => <p key={`hold-${index}`}>{item}</p>)}{report.caveats.map((item, index) => <p key={`caveat-${index}`}>{item}</p>)}</details> : null}
  </section>;
}
function SignalPlot({ data, mode, position, onSeek }: { data: InterviewAudioAnalysis; mode: PlotMode; position: number; onSeek: (seconds: number) => void }) {
  const width = 1000, height = 180;
  const x = (seconds: number) => seconds / data.durationSeconds * width;
  const yLevel = (db: number) => height - clamp((db + 80) / 80, 0, 1) * height;
  return <div className={styles.plot}><div className={styles.axis}>{mode === "waveform" ? "+1 / −1 (범위 밖 진폭은 잘림)" : mode === "level" ? "0 / −80 dBFS" : `${data.thresholds.maxPitchHz} / ${data.thresholds.minPitchHz} Hz`}</div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${mode} 실제 측정 그래프`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); onSeek(clamp((event.clientX - rect.left) / rect.width, 0, 1) * data.durationSeconds); }}>{[.25, .5, .75].map((value) => <line className={styles.gridLine} key={value} x1={0} x2={width} y1={value * height} y2={value * height} />)}{data.lowSignalIntervals.map((item, index) => <rect className={styles.lowRegion} key={index} x={x(item.startSeconds)} y={0} width={x(item.endSeconds - item.startSeconds)} height={height} />)}
    {mode === "waveform" && <path className={styles.wave} d={data.frames.map((item) => `M${x(item.startSeconds).toFixed(2)},${(90 - item.max * 82).toFixed(2)}v${((item.max - item.min) * 82).toFixed(2)}`).join(" ")} />}
    {mode === "level" && <><polyline className={styles.levelLine} points={data.frames.map((item) => `${x(item.startSeconds)},${yLevel(item.rmsDbfs)}`).join(" ")} /><line className={styles.threshold} x1={0} x2={width} y1={yLevel(-45)} y2={yLevel(-45)} /></>}
    {mode === "pitch" && data.frames.map((item, index) => item.pitchHz !== null ? <circle className={styles.pitchDot} key={index} cx={x(item.startSeconds)} cy={height - clamp((item.pitchHz - data.thresholds.minPitchHz) / (data.thresholds.maxPitchHz - data.thresholds.minPitchHz), 0, 1) * height} r={2.4} /> : null)}
    <line className={styles.playhead} x1={x(position)} x2={x(position)} y1={0} y2={height} />
    </svg><div className={styles.timeAxis}><span>00:00</span><span>{time(data.durationSeconds / 2)}</span><span>{time(data.durationSeconds)}</span></div></div>;
}
function Spectrogram({ data, position, onSeek }: { data: InterviewAudioAnalysis; position: number; onSeek: (seconds: number) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const frames = data.spectrogram.frames, bands = data.spectrogram.frequenciesHz.length;
    canvas.width = frames.length; canvas.height = bands;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pixels = ctx.createImageData(frames.length, bands);
    for (let x = 0; x < frames.length; x++) for (let band = 0; band < bands; band++) {
      const value = clamp((frames[x].dbfs[band] + 90) / 80, 0, 1);
      const i = ((bands - 1 - band) * frames.length + x) * 4;
      pixels.data[i] = Math.round(9 + 90 * value ** 2); pixels.data[i + 1] = Math.round(20 + 210 * value); pixels.data[i + 2] = Math.round(35 + 160 * value); pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  }, [data]);
  return <div className={styles.spectrum}><div><span>주파수 지도</span><small>0–4 kHz · 색상 범위 −90~−10 dBFS</small></div><div className={styles.spectrumImage}><canvas ref={ref} aria-label="실측 음성 주파수 분포" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); onSeek(clamp((event.clientX - rect.left) / rect.width, 0, 1) * data.durationSeconds); }} /><i style={{ left: `${clamp(position / data.durationSeconds, 0, 1) * 100}%` }} /></div></div>;
}

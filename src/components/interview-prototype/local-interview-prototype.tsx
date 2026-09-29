"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileSearch,
  Info,
  Laptop,
  Mic,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Upload,
  Video,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INTERVIEW_EVIDENCE_LABELS,
  LOCAL_INTERVIEW_PRESETS,
  calculateTimeUsagePercent,
  formatInterviewSeconds,
  selectSupportedRecorderMimeType,
  type InterviewEvidenceStatus,
  type InterviewPresetPrototype,
} from "@/domain/interview-prototype";
import styles from "./local-interview-prototype.module.css";
import { MicrophoneCheck } from "./microphone-check";
import { MediaAnalysisStudio } from "./media-analysis-studio";
import { DEFAULT_TRAINING_CONTEXT, type TrainingAttempt, type TrainingContext } from "@/domain/interview-training";
import { TrainingSetup } from "./training-setup";
import { CameraSetupGuide } from "./camera-setup-guide";

type Screen = "overview" | "setup" | "practice" | "report";
type PracticePhase = "ready" | "preparing" | "recording" | "review";

type LocalRecording = {
  questionId: string;
  question: string;
  durationSeconds: number;
  objectUrl: string;
  mimeType: string;
  answerText?: string;
};

const evidenceTone: Record<InterviewEvidenceStatus, string> = {
  official: styles.verified,
  corroborated_reports: styles.confirmed,
  user_document: styles.userSource,
  role_based_estimate: styles.estimated,
};

function supportsMediaCapture(): boolean {
  return typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== "undefined";
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function EvidenceBadge({ status }: { status: InterviewEvidenceStatus }) {
  return <span className={`${styles.evidenceBadge} ${evidenceTone[status]}`}>{INTERVIEW_EVIDENCE_LABELS[status]}</span>;
}

export function LocalInterviewProPrototype() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [selectedPresetId, setSelectedPresetId] = useState(LOCAL_INTERVIEW_PRESETS[0].id);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [deviceMessage, setDeviceMessage] = useState("아직 카메라와 마이크를 확인하지 않았습니다.");
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<PracticePhase>("ready");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [practiceMessage, setPracticeMessage] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [inputMode, setInputMode] = useState<"video" | "audio" | "text">("video");
  const [typedAnswer, setTypedAnswer] = useState("");
  const typedAnswerRef = useRef("");
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const [trainingContext, setTrainingContext] = useState<TrainingContext>(DEFAULT_TRAINING_CONTEXT);
  const [customPreset, setCustomPreset] = useState<InterviewPresetPrototype | null>(null);
  const [cameraGuide, setCameraGuide] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserIntervalRef = useRef<number | null>(null);
  const recordingsRef = useRef<LocalRecording[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const preset = useMemo(
    () => customPreset ?? LOCAL_INTERVIEW_PRESETS.find((item) => item.id === selectedPresetId) ?? LOCAL_INTERVIEW_PRESETS[0],
    [selectedPresetId, customPreset],
  );
  const currentQuestion = preset.questions[questionIndex];
  const cameraDevices = devices.filter((device) => device.kind === "videoinput");
  const microphoneDevices = devices.filter((device) => device.kind === "audioinput");
  const currentRecording = recordings.find((item) => item.questionId === currentQuestion?.id);
  const completedCount = recordings.length;

  const releaseWakeLock = useCallback(() => {
    const activeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (activeLock) void activeLock.release().catch(() => undefined);
  }, []);

  useEffect(() => {
    const shouldKeepScreenAwake = screen === "practice" && (phase === "preparing" || phase === "recording");
    if (!shouldKeepScreenAwake || !("wakeLock" in navigator)) {
      releaseWakeLock();
      return;
    }

    let disposed = false;
    const requestWakeLock = async () => {
      if (document.visibilityState !== "visible" || wakeLockRef.current) return;
      try {
        const nextLock = await navigator.wakeLock.request("screen");
        if (disposed) await nextLock.release();
        else wakeLockRef.current = nextLock;
      } catch {
        // Wake Lock is an enhancement. Recording continues if the browser denies it.
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [phase, releaseWakeLock, screen]);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [screen]);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => undefined);
  }, [screen, stream, phase]);

  useEffect(() => () => {
    stopStream(streamRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (analyserIntervalRef.current !== null) window.clearInterval(analyserIntervalRef.current);
    void audioContextRef.current?.close();
    recordingsRef.current.forEach((recording) => URL.revokeObjectURL(recording.objectUrl));
    window.speechSynthesis?.cancel();
  }, []);

  const startAudioMeter = useCallback((activeStream: MediaStream) => {
    if (analyserIntervalRef.current !== null) window.clearInterval(analyserIntervalRef.current);
    void audioContextRef.current?.close();
    const AudioContextConstructor = window.AudioContext;
    const context = new AudioContextConstructor();
    void context.resume().catch(() => undefined);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaStreamSource(activeStream);
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = context;
    analyserIntervalRef.current = window.setInterval(() => {
      analyser.getByteFrequencyData(samples);
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
    }, 120);
  }, []);

  const openDevices = useCallback(async (requestedVideoId?: string, requestedAudioId?: string) => {
    if (!supportsMediaCapture()) {
      setDeviceMessage("이 브라우저는 카메라 녹화를 지원하지 않습니다. 최신 Chrome 또는 Edge에서 확인해 주세요.");
      return;
    }
    setDeviceBusy(true);
    setDeviceMessage("카메라와 마이크 권한을 확인하고 있습니다...");
    try {
      stopStream(streamRef.current);
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: inputMode === "video" ? {
          ...(requestedVideoId ? { deviceId: { exact: requestedVideoId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: "user",
        } : false,
        audio: {
          ...(requestedAudioId ? { deviceId: { exact: requestedAudioId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = nextStream;
      setStream(nextStream);
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(availableDevices);
      const videoTrack = nextStream.getVideoTracks()[0];
      const audioTrack = nextStream.getAudioTracks()[0];
      setVideoDeviceId(videoTrack?.getSettings().deviceId ?? requestedVideoId ?? "");
      setAudioDeviceId(audioTrack?.getSettings().deviceId ?? requestedAudioId ?? "");
      setDeviceMessage(inputMode === "audio" ? "마이크가 연결됐습니다. 카메라 없이 음성만 녹음합니다." : "카메라와 마이크가 연결됐습니다. 목소리를 내어 입력 막대를 확인해 주세요.");
      startAudioMeter(nextStream);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "UnknownError";
      const messages: Record<string, string> = {
        NotAllowedError: "카메라 또는 마이크 권한이 차단됐습니다. 브라우저 주소창의 권한 설정을 확인해 주세요.",
        NotFoundError: "사용 가능한 카메라 또는 마이크를 찾지 못했습니다.",
        NotReadableError: "다른 프로그램이 카메라 또는 마이크를 사용 중입니다.",
        OverconstrainedError: "선택한 장치를 현재 설정으로 열 수 없습니다. 다른 장치를 선택해 주세요.",
      };
      setDeviceMessage(messages[name] ?? "장치를 열지 못했습니다. 브라우저와 연결 상태를 확인해 주세요.");
      streamRef.current = null;
      setStream(null);
      setMicLevel(0);
    } finally {
      setDeviceBusy(false);
    }
  }, [startAudioMeter, inputMode]);

  const speakQuestion = useCallback((text: string) => {
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const stopRecording = useCallback(() => {
    if (inputMode === "text" && currentQuestion) {
      const answerText = typedAnswerRef.current.trim();
      if (!answerText) { setAutoRunning(false); setPhase("ready"); setPracticeMessage("빈 답변은 저장하지 않습니다. 다시 시작해 답변을 입력해 주세요."); return; }
      const durationSeconds = Math.max(1, Math.round((performance.now() - recordingStartedAtRef.current) / 1000));
      const previousRecording = recordingsRef.current.find(item => item.questionId === currentQuestion.id);
      if (previousRecording?.objectUrl) URL.revokeObjectURL(previousRecording.objectUrl);
      setRecordings(previous => [...previous.filter(item => item.questionId !== currentQuestion.id), { questionId: currentQuestion.id, question: currentQuestion.text, answerText, durationSeconds, objectUrl: "", mimeType: "text/plain" }]);
      setPhase("review"); setRemainingSeconds(0); return;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, [inputMode, currentQuestion]);

  const startRecording = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (inputMode === "text" && currentQuestion) { typedAnswerRef.current = ""; setTypedAnswer(""); recordingStartedAtRef.current = performance.now(); setRemainingSeconds(preset.config.answerSeconds); setPhase("recording"); setPracticeMessage("타자로 답변하세요. 음성·영상 항목은 미평가입니다."); return; }
    if (!stream || !currentQuestion) {
      setPracticeMessage("카메라와 마이크 연결이 끊겼습니다. 장비 확인으로 돌아가 주세요.");
      setPhase("ready");
      return;
    }
    try {
      const mimeType = inputMode === "audio" ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(candidate => MediaRecorder.isTypeSupported(candidate)) : selectSupportedRecorderMimeType((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      let recordingFailed = false;
      chunksRef.current = [];
      recordingStartedAtRef.current = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recordingFailed = true;
        setAutoRunning(false);
        setPracticeMessage("녹화 중 오류가 발생했습니다. 이 답변은 저장되지 않았습니다.");
        setPhase("ready");
      };
      recorder.onstop = () => {
        if (recordingFailed || chunksRef.current.length === 0) {
          setAutoRunning(false);
          setPhase("ready");
          setPracticeMessage("녹화 데이터를 확인하지 못했습니다. 장비를 점검한 뒤 다시 시작하세요.");
          return;
        }
        const durationSeconds = Math.max(1, Math.round((performance.now() - recordingStartedAtRef.current) / 1000));
        const resolvedType = recorder.mimeType || mimeType || (inputMode === "audio" ? "audio/webm" : "video/webm");
        const blob = new Blob(chunksRef.current, { type: resolvedType });
        const objectUrl = URL.createObjectURL(blob);
        setRecordings((previous) => {
          const replaced = previous.find((item) => item.questionId === currentQuestion.id);
          if (replaced) URL.revokeObjectURL(replaced.objectUrl);
          return [
            ...previous.filter((item) => item.questionId !== currentQuestion.id),
            {
              questionId: currentQuestion.id,
              question: currentQuestion.text,
              durationSeconds,
              objectUrl,
              mimeType: resolvedType,
            },
          ];
        });
        setPhase("review");
        setRemainingSeconds(0);
        setPracticeMessage("답변은 이 브라우저 메모리에만 보관됩니다. 새로고침하면 사라집니다.");
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1_000);
      setRemainingSeconds(preset.config.answerSeconds);
      setPhase("recording");
      setPracticeMessage("");
    } catch {
      setAutoRunning(false);
      setPracticeMessage("이 장치 조합으로 녹화를 시작하지 못했습니다. 장비 확인에서 다시 연결해 주세요.");
      setPhase("ready");
    }
  }, [currentQuestion, preset.config.answerSeconds, stream, inputMode]);

  useEffect(() => {
    if (phase !== "preparing" && phase !== "recording") return;
    if (remainingSeconds <= 0) return;
    const timeoutId = window.setTimeout(() => {
      if (remainingSeconds <= 1) {
        if (phase === "preparing") startRecording();
        else stopRecording();
        return;
      }
      setRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1_000);
    return () => window.clearTimeout(timeoutId);
  }, [phase, remainingSeconds, startRecording, stopRecording]);

  const beginQuestion = useCallback(() => {
    if (!currentQuestion) return;
    setPracticeMessage("");
    setRemainingSeconds(preset.config.prepSeconds);
    setPhase(preset.config.prepSeconds > 0 ? "preparing" : "ready");
    speakQuestion(currentQuestion.text);
    if (preset.config.prepSeconds === 0) startRecording();
  }, [currentQuestion, preset.config.prepSeconds, speakQuestion, startRecording]);

  useEffect(() => {
    if (!autoRunning || screen !== "practice") return;
    const timer = window.setTimeout(() => {
      if (phase === "ready") beginQuestion();
      if (phase === "review") {
        if (questionIndex >= preset.questions.length - 1) {
          setAutoRunning(false);
          setScreen("report");
        } else {
          setQuestionIndex((index) => index + 1);
          setPhase("ready");
        }
      }
    }, phase === "review" ? 2000 : 3000);
    return () => window.clearTimeout(timer);
  }, [autoRunning, screen, phase, questionIndex, preset.questions.length, beginQuestion]);

  const resetPrototype = () => {
    setAutoRunning(false); setAttempts([]);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    recordings.forEach((recording) => URL.revokeObjectURL(recording.objectUrl));
    setRecordings([]);
    setQuestionIndex(0);
    setPhase("ready");
    setRemainingSeconds(0);
    setPracticeMessage("");
    setScreen("overview");
  };

  const moveToNextQuestion = () => {
    if (questionIndex >= preset.questions.length - 1) {
      setScreen("report");
      setPhase("ready");
      return;
    }
    setQuestionIndex((index) => index + 1);
    setPhase("ready");
    setRemainingSeconds(0);
    setPracticeMessage("");
  };

  const selectPreset = (nextPreset: InterviewPresetPrototype) => {
    if ((recordings.length || attempts.length) && !window.confirm("다른 전형을 선택하면 현재 탭의 녹화와 분석 기록을 초기화합니다. 계속할까요?")) return;
    setCustomPreset(null); setAttempts([]); setAutoRunning(false);
    if (recordings.length > 0) recordings.forEach((recording) => URL.revokeObjectURL(recording.objectUrl));
    setSelectedPresetId(nextPreset.id);
    setQuestionIndex(0);
    setRecordings([]);
    setPhase("ready");
  };

  const averageUsage = recordings.length > 0
    ? Math.round(recordings.reduce((sum, recording) => sum + calculateTimeUsagePercent(recording.durationSeconds, preset.config.answerSeconds), 0) / recordings.length)
    : 0;
  const sessionLocked = screen === "practice" && (phase === "preparing" || phase === "recording");
  const readyForPractice = inputMode === "text" || Boolean(stream);
  const practiceQuestion = (text: string) => {
    let index = preset.questions.findIndex(item => item.text === text);
    if (index < 0) {
      if (preset.questions.length >= 20) { setPracticeMessage("한 세션의 질문은 최대 20개입니다. 새 세션에서 이어서 연습해 주세요."); return; }
      index = preset.questions.length;
      setCustomPreset({ ...preset, questions: [...preset.questions, { id: `followup-${crypto.randomUUID()}`, text, intent: "이전 답변에 기반한 추가 확인 연습", competency: "근거 확인", evidenceStatus: "role_based_estimate", evidenceNote: "AI가 생성한 연습 질문이며 실제 기출이 아닙니다." }] });
    }
    setQuestionIndex(index); setPhase("ready"); setAutoRunning(false); setPracticeMessage(""); setScreen(readyForPractice ? "practice" : "setup");
  };

  return (
    <main className={styles.page} data-screen={screen} data-phase={phase}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>M</span><b>MOOA Resume</b><em>Interview PRO V2</em></div>
        <div className={styles.localOnly}><ShieldCheck />LOCAL DEV ONLY</div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <p className={styles.navTitle}>면접 준비</p>
          <button type="button" aria-current={screen === "overview" ? "page" : undefined} className={screen === "overview" ? styles.navActive : ""} disabled={sessionLocked} onClick={() => setScreen("overview")}><Building2 /><span>전형 선택</span></button>
          <button type="button" aria-current={screen === "setup" ? "page" : undefined} className={screen === "setup" ? styles.navActive : ""} disabled={sessionLocked} onClick={() => setScreen("setup")}><Camera /><span>장비 확인</span></button>
          <button type="button" aria-current={screen === "practice" ? "page" : undefined} className={screen === "practice" ? styles.navActive : ""} disabled={!readyForPractice} onClick={() => setScreen("practice")}><Video /><span>실전 면접</span></button>
          <button type="button" aria-current={screen === "report" ? "page" : undefined} className={screen === "report" ? styles.navActive : ""} disabled={recordings.length === 0 || sessionLocked} onClick={() => setScreen("report")}><FileSearch /><span>결과 복기</span></button>

          <div className={styles.caseCard}>
            <span>MY APPLICATION</span>
            <b>{preset.companyName}</b>
            <p>{preset.positionName}</p>
            <dl><div><dt>답변 완료</dt><dd>{completedCount}/{preset.questions.length}</dd></div><div><dt>저장 위치</dt><dd>브라우저 메모리</dd></div></dl>
          </div>
        </aside>

        <section className={styles.workspace}>
          <div className={styles.breadcrumb}><span>면접 PRO</span><ChevronRight /><b>{screen === "overview" ? "전형 선택" : screen === "setup" ? "장비 확인" : screen === "practice" ? "실전 시뮬레이터" : "결과 복기"}</b></div>

          {screen === "overview" && (
            <><TrainingSetup preset={preset} context={trainingContext} onApply={(next, context) => { if ((recordings.length || attempts.length) && !window.confirm("설정을 바꾸면 현재 녹화와 분석 기록을 초기화합니다. 계속할까요?")) return false; recordings.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); }); setRecordings([]); setAttempts([]); setCustomPreset(next); setTrainingContext(context); setQuestionIndex(0); setAutoRunning(false); setPhase("ready"); return true; }} /><OverviewScreen preset={preset} onSelectPreset={selectPreset} onContinue={() => setScreen("setup")} /></>
          )}

          {screen === "setup" && (
            <section>
              <PageHeading eyebrow="STEP 02 · 사전 점검" title={inputMode === "text" ? "타자로 편하게 답변하세요" : inputMode === "audio" ? "마이크를 확인하세요" : "카메라와 마이크를 확인하세요"} description="녹화 파일은 서버에 전송하지 않고 현재 브라우저 메모리에만 임시 보관합니다." />
              <fieldset className={styles.practiceModes}><legend>답변 입력 방식</legend>{([["video", "카메라 + 마이크"], ["audio", "마이크만"], ["text", "키보드·모바일 타자"]] as const).map(([value, label]) => <label key={value}><input type="radio" name="input-mode" checked={inputMode === value} disabled={deviceBusy} onChange={() => { stopStream(streamRef.current); streamRef.current = null; setStream(null); if (analyserIntervalRef.current !== null) window.clearInterval(analyserIntervalRef.current); void audioContextRef.current?.close(); setMicLevel(0); setInputMode(value); setAutoRunning(false); setDeviceMessage(value === "text" ? "장비 없이 타자로 답변합니다. 음성·영상은 미평가입니다." : "선택한 방식의 장치를 연결해 주세요."); }} /><span>{label}</span></label>)}<p>카메라를 끄면 영상 관찰을 하지 않습니다. 타자 모드는 답변 내용만 분석하며 장비가 없다는 이유로 감점하지 않습니다.</p></fieldset>
              <label className={styles.ttsToggle}><input type="checkbox" checked={ttsEnabled} onChange={(event) => setTtsEnabled(event.target.checked)} /><span><Volume2 />질문을 음성으로 읽어주기</span></label>
              <fieldset className={styles.practiceModes}><legend>연습 방식</legend><label><input type="radio" name="practice-mode" checked={!autoMode} onChange={() => setAutoMode(false)} /><span><b>문항 집중 연습</b><small>한 질문씩 답변하고 다시 들어보세요</small></span></label><label><input type="radio" name="practice-mode" checked={autoMode} onChange={() => setAutoMode(true)} /><span><b>실전 연속 연습</b><small>제한시간에 맞춰 고정 질문을 자동 진행해요</small></span></label><p>준비 중 · AI 라이브 면접 / 입퇴장 리허설</p></fieldset>
              {autoMode && <p>자동 진행 시험 모드: 입장 3초 후 질문 → 준비시간 → 제한시간 녹화 → 다음 질문. 진행 중 AI 대화·침묵 감지·자동 끼어들기는 미연결입니다. 답변 분석 후 꼬리질문을 연습할 수 있습니다.</p>}
              <div className={styles.setupGrid}>
                <div className={styles.previewPanel}>
                  <div className={styles.panelHeader}><span><Camera />카메라 미리보기</span><i className={stream ? styles.live : ""}>{stream ? "연결됨" : "대기"}</i></div>
                  <div className={styles.videoFrame}>
                    {stream && inputMode === "video" ? <video ref={videoRef} muted playsInline autoPlay /> : <div className={styles.videoEmpty}>{inputMode === "video" ? <Camera /> : <Mic />}<b>{inputMode === "text" ? "장비 없이 답변할 수 있어요" : inputMode === "audio" ? "카메라 없이 음성으로 연습" : "장비 확인을 시작해 주세요"}</b><span>{inputMode === "text" ? "휴대폰 키보드도 사용할 수 있습니다." : "장비 확인 버튼을 누르면 권한을 요청합니다."}</span></div>}
                    {inputMode === "video" && <span className={styles.safeGuide}>얼굴과 어깨가 중앙에 오도록 맞춰 주세요</span>}
                  </div>
                  <div className={styles.micMeter}><Mic /><span>마이크 입력</span><div><i style={{ width: `${micLevel}%` }} /></div><b>{micLevel > 8 ? "입력 중" : "대기"}</b></div>
                  {inputMode === "video" && stream && <><label className={styles.ttsToggle}><input type="checkbox" checked={cameraGuide} onChange={event => setCameraGuide(event.target.checked)} />기기 안에서 얼굴 위치·화면 밝기 확인에 동의합니다</label><CameraSetupGuide videoRef={videoRef} enabled={cameraGuide && screen === "setup"} /></>}
                </div>

                <div className={styles.settingsPanel}>
                  <div className={styles.panelHeader}><span><Laptop />입력 장치</span></div>
                  <label>카메라<select value={videoDeviceId} disabled={!stream || deviceBusy} onChange={(event) => { const id = event.target.value; setVideoDeviceId(id); void openDevices(id, audioDeviceId); }}>{cameraDevices.length === 0 && <option value="">기본 카메라</option>}{cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `카메라 ${index + 1}`}</option>)}</select></label>
                  <label>마이크<select value={audioDeviceId} disabled={!stream || deviceBusy} onChange={(event) => { const id = event.target.value; setAudioDeviceId(id); void openDevices(videoDeviceId, id); }}>{microphoneDevices.length === 0 && <option value="">기본 마이크</option>}{microphoneDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `마이크 ${index + 1}`}</option>)}</select></label>
                  <div className={`${styles.deviceMessage} ${stream ? styles.deviceSuccess : ""}`}>{stream ? <CheckCircle2 /> : <CircleAlert />}<p>{deviceMessage}</p></div>
                  <div className={styles.checkRows}><span><Check />1280×720 권장 화질</span><span><Check />소음 억제·에코 제거 요청</span><span><Check />현재 세션 종료 시 녹화 폐기</span></div>
                  <button type="button" className={styles.secondaryButton} disabled={deviceBusy || inputMode === "text"} onClick={() => void openDevices(videoDeviceId, audioDeviceId)}>{inputMode === "text" ? "타자 모드는 권한 요청이 필요 없어요" : deviceBusy ? "연결 확인 중..." : stream ? "장치 다시 확인" : inputMode === "audio" ? "마이크 확인 시작" : "카메라·마이크 확인 시작"}</button>
                  <MicrophoneCheck key={`${videoDeviceId}-${audioDeviceId}`} stream={stream} />
                </div>
              </div>

              <div className={styles.bottomActions}><button type="button" className={styles.textButton} onClick={() => setScreen("overview")}><ArrowLeft />전형 선택으로</button><button type="button" className={styles.primaryButton} disabled={!readyForPractice || deviceBusy} onClick={() => { setPhase("ready"); setAutoRunning(autoMode); setScreen("practice"); }}>실전 연습 시작<ArrowRight /></button></div>
            </section>
          )}

          {screen === "practice" && currentQuestion && (
            <section>
              <div className={styles.practiceHeader}>
                <button type="button" className={styles.textButton} disabled={sessionLocked} onClick={() => { window.speechSynthesis?.cancel(); setScreen("setup"); }}><ArrowLeft />준비 화면</button>
                <div><span>{preset.companyName}</span><b>{preset.positionName}</b></div>
                <div className={styles.progressText}>문항 <b>{questionIndex + 1}</b> / {preset.questions.length}</div>
              </div>

              <div className={styles.practiceGrid}>
                <section className={styles.questionPanel}>
                  <p className={styles.questionNumber}>QUESTION {String(questionIndex + 1).padStart(2, "0")}</p>
                  <h1>{currentQuestion.text}</h1>
                  {!sessionLocked && <details className={styles.practiceHelp} key={`${currentQuestion.id}-${phase}`}><summary>질문 의도와 출처 보기</summary><div className={styles.intentBox}><Info /><div><EvidenceBadge status={currentQuestion.evidenceStatus} /><p>{currentQuestion.intent}</p><small>{currentQuestion.evidenceNote}</small></div></div></details>}
                  <div className={styles.phaseBox}>
                    <span>{phase === "ready" ? "시작 대기" : phase === "preparing" ? "준비 시간" : phase === "recording" ? "답변 시간" : "답변 확인"}</span>
                    <strong>{phase === "ready" || phase === "review" ? formatInterviewSeconds(phase === "ready" ? preset.config.prepSeconds : currentRecording?.durationSeconds ?? 0) : formatInterviewSeconds(remainingSeconds)}</strong>
                    <div className={styles.phaseTrack}><i style={{ width: phase === "preparing" ? `${100 - (remainingSeconds / Math.max(1, preset.config.prepSeconds)) * 100}%` : phase === "recording" ? `${100 - (remainingSeconds / preset.config.answerSeconds) * 100}%` : phase === "review" ? "100%" : "0%" }} /></div>
                  </div>
                  <div className={styles.practiceActions}>
                    {autoRunning && <button type="button" className={styles.stopButton} onClick={() => { setAutoRunning(false); window.speechSynthesis?.cancel(); if (phase === "recording") stopRecording(); else setPhase("ready"); }}>자동 진행 중단</button>}
                    {!autoRunning && <>
                    {phase === "ready" && <button type="button" className={styles.primaryButton} onClick={beginQuestion}><Play />이 질문 시작</button>}
                    {phase === "preparing" && <button type="button" className={styles.primaryButton} onClick={startRecording}><Video />바로 답변 시작</button>}
                    {phase === "recording" && <button type="button" className={styles.stopButton} onClick={stopRecording}><Square />답변 종료</button>}
                    {phase === "review" && <><button type="button" className={styles.secondaryButton} onClick={() => { setPhase("ready"); setPracticeMessage(""); }}><RotateCcw />다시 답변</button><button type="button" className={styles.primaryButton} onClick={moveToNextQuestion}>{questionIndex === preset.questions.length - 1 ? "결과 보기" : "다음 문항"}<ArrowRight /></button></>}
                    </>}
                  </div>
                  {practiceMessage && <p className={styles.practiceMessage}>{practiceMessage}</p>}
                  {phase === "review" && !autoRunning && <button type="button" className={styles.secondaryButton} onClick={() => setScreen("report")}>답변 피드백·꼬리질문 보기</button>}
                </section>

                <section className={styles.recordPanel}>
                  <div className={styles.recordStatus}><span className={phase === "recording" ? styles.recordingDot : ""} />{phase === "recording" ? (inputMode === "text" ? "답변 입력 중" : "REC") : phase === "review" ? "답변 확인" : "답변 대기"}</div>
                  {inputMode === "text" ? <label className={styles.typedAnswer}>내 답변<textarea value={phase === "review" ? currentRecording?.answerText ?? typedAnswer : typedAnswer} disabled={phase !== "recording"} onChange={(event) => { typedAnswerRef.current = event.target.value; setTypedAnswer(event.target.value); }} maxLength={12000} placeholder="답변 시간이 시작되면 여기에 입력하세요." /><small>자동 저장하지 않습니다. 답변 종료 후 이 탭에서만 보관합니다.</small></label> : phase === "review" && currentRecording ? currentRecording.mimeType.startsWith("audio/") ? <audio className={styles.audioReview} src={currentRecording.objectUrl} controls /> : <video className={styles.reviewVideo} src={currentRecording.objectUrl} controls playsInline /> : inputMode === "audio" ? <div className={styles.audioOnly}><Mic /><p>음성으로 답변하고 있습니다.</p><progress value={micLevel} max={100} aria-label="실제 마이크 입력 수준" /></div> : <video ref={videoRef} className={styles.liveVideo} muted playsInline autoPlay />}
                  <div className={styles.cameraFooter}><span>{inputMode === "video" ? "카메라·마이크" : inputMode === "audio" ? "음성 전용 · 영상 미평가" : "타자 전용 · 내용 평가"}</span><span><Clock3 />{preset.config.answerSeconds}초 제한</span></div>
                </section>
              </div>
            </section>
          )}

          {screen === "report" && (
            <section>
              <header className={styles.reportHeading}><h1>면접 결과</h1><p>답변에서 보완할 점을 확인하고, 내 경험으로 다시 연습하세요.</p></header>
              <MediaAnalysisStudio recordings={recordings} embedded company={preset.companyName} role={preset.positionName} attempts={attempts} onAttempt={attempt => setAttempts(previous => [...previous.filter(item => item.id !== attempt.id), attempt].slice(-20))} onPractice={practiceQuestion} trainingContext={trainingContext} />
              <details className={styles.reportHistory}><summary>연습 기록·녹화 파일</summary>
              <div className={styles.reportSummary}>
                <div><span>완료 문항</span><strong>{recordings.length}<small> / {preset.questions.length}</small></strong></div>
                <div><span>평균 답변시간 사용</span><strong>{averageUsage}<small>%</small></strong></div>
                <div><span>저장 상태</span><strong className={styles.localValue}>로컬 임시</strong></div>
              </div>
              <div className={styles.answerTable}>
                <div className={styles.tableHead}><span>문항</span><span>사용 시간</span><span>근거 상태</span><span>녹화</span></div>
                {preset.questions.map((question, index) => {
                  const recording = recordings.find((item) => item.questionId === question.id);
                  return <div className={styles.tableRow} key={question.id}><span><b>{index + 1}</b><em>{question.text}</em></span><span>{recording ? `${recording.durationSeconds}초 / ${preset.config.answerSeconds}초` : "미응답"}</span><span><EvidenceBadge status={question.evidenceStatus} /></span><span>{recording?.answerText !== undefined ? "타자 답변" : recording ? <a href={recording.objectUrl} download={`mooa-interview-${index + 1}.${recording.mimeType.includes("mp4") ? "mp4" : "webm"}`}><Download />저장</a> : "-"}</span></div>;
                })}
              </div>
              </details>
              <div className={styles.bottomActions}><button type="button" className={styles.textButton} onClick={resetPrototype}><RotateCcw />처음부터 다시</button><button type="button" className={styles.primaryButton} disabled={recordings.length === 0} onClick={() => { setQuestionIndex(0); setPhase("ready"); setScreen("practice"); }}>다시 연습하기<ArrowRight /></button></div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className={styles.pageHeading}><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>;
}

function OverviewScreen({ preset, onSelectPreset, onContinue }: { preset: InterviewPresetPrototype; onSelectPreset: (preset: InterviewPresetPrototype) => void; onContinue: () => void }) {
  return <section>
    <PageHeading eyebrow="면접 PRO · 전형 선택" title="내 면접에 맞게, 실전처럼 연습하세요" description="지원 기업과 직무에 맞는 연습 전형을 선택하세요. 질문별 출처와 확인 상태도 함께 보여드려요." />
    <div className={styles.modeTabs} aria-label="면접 전형 선택"><button type="button" aria-pressed={preset.route === "recorded_ai"} className={preset.route === "recorded_ai" ? styles.modeActive : ""} onClick={() => onSelectPreset(LOCAL_INTERVIEW_PRESETS[1])}><Video />AI 영상면접</button><button type="button" aria-pressed={preset.route === "human_interview"} className={preset.route === "human_interview" ? styles.modeActive : ""} onClick={() => onSelectPreset(LOCAL_INTERVIEW_PRESETS[0])}><Building2 />일반·대면 면접</button><button type="button" disabled><Upload />전형 찾기 <small>준비 중</small></button></div>

    <div className={styles.overviewGrid}>
      <section className={styles.presetList}>
        <div className={styles.sectionBar}><div><b>전형 프리셋</b><span>로컬 시안 2개</span></div><button type="button" disabled><Upload />안내문 분석</button></div>
        {LOCAL_INTERVIEW_PRESETS.map((item) => <button type="button" key={item.id} className={`${styles.presetRow} ${item.id === preset.id ? styles.presetSelected : ""}`} onClick={() => onSelectPreset(item)}><span className={styles.companyMark}>{item.companyName.slice(0, 1)}</span><span className={styles.presetCopy}><b>{item.displayName}</b><small>{item.companyName} · {item.positionName}</small><em>{item.description}</em></span><span className={styles.presetMeta}><EvidenceBadge status={item.evidenceStatus} /><ChevronRight /></span></button>)}
      </section>

      <aside className={styles.presetDetail}>
        <div className={styles.detailTitle}><span className={styles.companyMark}>{preset.companyName.slice(0, 1)}</span><div><small>선택한 전형</small><h2>{preset.displayName}</h2><p>{preset.companyName} · {preset.positionName}</p></div></div>
        <div className={styles.sourceWarning}><CircleAlert /><p><b>{INTERVIEW_EVIDENCE_LABELS[preset.evidenceStatus]}</b>{preset.sourceSummary}</p></div>
        <dl className={styles.configTable}><div><dt>준비 시간</dt><dd>{preset.config.prepSeconds}초</dd></div><div><dt>답변 시간</dt><dd>{preset.config.answerSeconds}초</dd></div><div><dt>재녹화</dt><dd>{preset.config.retryCount === 0 ? "불가" : `${preset.config.retryCount}회`}</dd></div><div><dt>질문 제시</dt><dd>{preset.config.questionPresentation === "text_and_tts" ? "화면 + 음성" : preset.config.questionPresentation}</dd></div><div><dt>카메라</dt><dd>{preset.config.cameraRequired ? "필수" : "선택"}</dd></div><div><dt>꼬리질문</dt><dd>{preset.config.followUpsEnabled ? "사용" : "미사용"}</dd></div></dl>
        <div className={styles.sourceLinks}><b>확인 출처</b>{preset.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">출처 {index + 1}<ArrowRight /></a>)}</div>
      </aside>
    </div>

    <section className={styles.questionPreview}>
      <div className={styles.sectionBar}><div><b>연습 문항</b><span>문항마다 근거 상태를 분리합니다</span></div></div>
      {preset.questions.map((question, index) => <div className={styles.questionRow} key={question.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{question.text}</b><small>{question.intent}</small></div><div><EvidenceBadge status={question.evidenceStatus} /><em>{question.competency}</em></div></div>)}
    </section>

    <div className={styles.bottomActions}><div className={styles.privacyNote}><ShieldCheck /><span><b>로컬 개발 전용</b>프로덕션에서는 이 주소가 404로 닫힙니다.</span></div><button type="button" className={styles.primaryButton} onClick={onContinue}>장비 확인으로<ArrowRight /></button></div>
  </section>;
}

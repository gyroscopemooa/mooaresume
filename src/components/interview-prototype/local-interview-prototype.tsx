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
  Gauge,
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

type Screen = "overview" | "setup" | "practice" | "report";
type PracticePhase = "ready" | "preparing" | "recording" | "review";

type LocalRecording = {
  questionId: string;
  question: string;
  durationSeconds: number;
  objectUrl: string;
  mimeType: string;
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserIntervalRef = useRef<number | null>(null);
  const recordingsRef = useRef<LocalRecording[]>([]);

  const preset = useMemo(
    () => LOCAL_INTERVIEW_PRESETS.find((item) => item.id === selectedPresetId) ?? LOCAL_INTERVIEW_PRESETS[0],
    [selectedPresetId],
  );
  const currentQuestion = preset.questions[questionIndex];
  const cameraDevices = devices.filter((device) => device.kind === "videoinput");
  const microphoneDevices = devices.filter((device) => device.kind === "audioinput");
  const currentRecording = recordings.find((item) => item.questionId === currentQuestion?.id);
  const completedCount = recordings.length;

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

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
        video: {
          ...(requestedVideoId ? { deviceId: { exact: requestedVideoId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: "user",
        },
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
      setDeviceMessage("카메라와 마이크가 정상적으로 연결됐습니다. 목소리를 내어 입력 막대를 확인해 주세요.");
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
  }, [startAudioMeter]);

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
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    if (!stream || !currentQuestion) {
      setPracticeMessage("카메라와 마이크 연결이 끊겼습니다. 장비 확인으로 돌아가 주세요.");
      setPhase("ready");
      return;
    }
    try {
      const mimeType = selectSupportedRecorderMimeType((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recordingStartedAtRef.current = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setPracticeMessage("녹화 중 오류가 발생했습니다. 이 답변은 저장되지 않았습니다.");
        setPhase("ready");
      };
      recorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((performance.now() - recordingStartedAtRef.current) / 1000));
        const resolvedType = recorder.mimeType || mimeType || "video/webm";
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
      setPracticeMessage("이 장치 조합으로 녹화를 시작하지 못했습니다. 장비 확인에서 다시 연결해 주세요.");
      setPhase("ready");
    }
  }, [currentQuestion, preset.config.answerSeconds, stream]);

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

  const beginQuestion = () => {
    if (!currentQuestion) return;
    setPracticeMessage("");
    setRemainingSeconds(preset.config.prepSeconds);
    setPhase(preset.config.prepSeconds > 0 ? "preparing" : "ready");
    speakQuestion(currentQuestion.text);
    if (preset.config.prepSeconds === 0) startRecording();
  };

  const resetPrototype = () => {
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
    if (recordings.length > 0) recordings.forEach((recording) => URL.revokeObjectURL(recording.objectUrl));
    setSelectedPresetId(nextPreset.id);
    setQuestionIndex(0);
    setRecordings([]);
    setPhase("ready");
  };

  const averageUsage = recordings.length > 0
    ? Math.round(recordings.reduce((sum, recording) => sum + calculateTimeUsagePercent(recording.durationSeconds, preset.config.answerSeconds), 0) / recordings.length)
    : 0;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>M</span><b>MOOA Resume</b><em>Interview PRO V2</em></div>
        <div className={styles.localOnly}><ShieldCheck />LOCAL DEV ONLY</div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <p className={styles.navTitle}>면접 준비</p>
          <button type="button" className={screen === "overview" ? styles.navActive : ""} onClick={() => setScreen("overview")}><Building2 />전형 선택</button>
          <button type="button" className={screen === "setup" ? styles.navActive : ""} onClick={() => setScreen("setup")}><Camera />장비 확인</button>
          <button type="button" className={screen === "practice" ? styles.navActive : ""} disabled={!stream} onClick={() => setScreen("practice")}><Video />실전 시뮬레이터</button>
          <button type="button" className={screen === "report" ? styles.navActive : ""} disabled={recordings.length === 0} onClick={() => setScreen("report")}><FileSearch />결과 복기</button>

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
            <OverviewScreen preset={preset} onSelectPreset={selectPreset} onContinue={() => setScreen("setup")} />
          )}

          {screen === "setup" && (
            <section>
              <PageHeading eyebrow="STEP 02 · 사전 점검" title="카메라와 마이크를 확인하세요" description="녹화 파일은 서버에 전송하지 않고 현재 브라우저 메모리에만 임시 보관합니다." />
              <div className={styles.setupGrid}>
                <div className={styles.previewPanel}>
                  <div className={styles.panelHeader}><span><Camera />카메라 미리보기</span><i className={stream ? styles.live : ""}>{stream ? "연결됨" : "대기"}</i></div>
                  <div className={styles.videoFrame}>
                    {stream ? <video ref={videoRef} muted playsInline autoPlay /> : <div className={styles.videoEmpty}><Camera /><b>장비 확인을 시작해 주세요</b><span>브라우저에서 권한을 요청합니다.</span></div>}
                    <span className={styles.safeGuide}>얼굴과 어깨가 중앙에 오도록 맞춰 주세요</span>
                  </div>
                  <div className={styles.micMeter}><Mic /><span>마이크 입력</span><div><i style={{ width: `${micLevel}%` }} /></div><b>{micLevel > 8 ? "입력 중" : "대기"}</b></div>
                </div>

                <div className={styles.settingsPanel}>
                  <div className={styles.panelHeader}><span><Laptop />입력 장치</span></div>
                  <label>카메라<select value={videoDeviceId} disabled={!stream || deviceBusy} onChange={(event) => { const id = event.target.value; setVideoDeviceId(id); void openDevices(id, audioDeviceId); }}>{cameraDevices.length === 0 && <option value="">기본 카메라</option>}{cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `카메라 ${index + 1}`}</option>)}</select></label>
                  <label>마이크<select value={audioDeviceId} disabled={!stream || deviceBusy} onChange={(event) => { const id = event.target.value; setAudioDeviceId(id); void openDevices(videoDeviceId, id); }}>{microphoneDevices.length === 0 && <option value="">기본 마이크</option>}{microphoneDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `마이크 ${index + 1}`}</option>)}</select></label>
                  <div className={`${styles.deviceMessage} ${stream ? styles.deviceSuccess : ""}`}>{stream ? <CheckCircle2 /> : <CircleAlert />}<p>{deviceMessage}</p></div>
                  <div className={styles.checkRows}><span><Check />1280×720 권장 화질</span><span><Check />소음 억제·에코 제거 요청</span><span><Check />현재 세션 종료 시 녹화 폐기</span></div>
                  <button type="button" className={styles.secondaryButton} disabled={deviceBusy} onClick={() => void openDevices(videoDeviceId, audioDeviceId)}>{deviceBusy ? "연결 확인 중..." : stream ? "장치 다시 확인" : "카메라·마이크 확인 시작"}</button>
                </div>
              </div>

              <div className={styles.bottomActions}><button type="button" className={styles.textButton} onClick={() => setScreen("overview")}><ArrowLeft />전형 선택으로</button><button type="button" className={styles.primaryButton} disabled={!stream} onClick={() => { setQuestionIndex(0); setPhase("ready"); setScreen("practice"); }}>실전 연습 시작<ArrowRight /></button></div>
            </section>
          )}

          {screen === "practice" && currentQuestion && (
            <section>
              <div className={styles.practiceHeader}>
                <div><span>{preset.companyName}</span><b>{preset.positionName}</b></div>
                <div className={styles.progressText}>문항 <b>{questionIndex + 1}</b> / {preset.questions.length}</div>
              </div>

              <div className={styles.practiceGrid}>
                <section className={styles.questionPanel}>
                  <div className={styles.questionMeta}><EvidenceBadge status={currentQuestion.evidenceStatus} /><span>{currentQuestion.competency}</span></div>
                  <p className={styles.questionNumber}>QUESTION {String(questionIndex + 1).padStart(2, "0")}</p>
                  <h1>{currentQuestion.text}</h1>
                  <div className={styles.intentBox}><Info /><div><b>질문 의도 · 연습모드에서만 표시</b><p>{currentQuestion.intent}</p><small>{currentQuestion.evidenceNote}</small></div></div>
                  <label className={styles.ttsToggle}><input type="checkbox" checked={ttsEnabled} onChange={(event) => setTtsEnabled(event.target.checked)} /><span><Volume2 />질문 음성 읽기</span></label>
                  <div className={styles.phaseBox}>
                    <span>{phase === "ready" ? "시작 대기" : phase === "preparing" ? "준비 시간" : phase === "recording" ? "답변 시간" : "답변 확인"}</span>
                    <strong>{phase === "ready" || phase === "review" ? formatInterviewSeconds(phase === "ready" ? preset.config.prepSeconds : currentRecording?.durationSeconds ?? 0) : formatInterviewSeconds(remainingSeconds)}</strong>
                    <div className={styles.phaseTrack}><i style={{ width: phase === "preparing" ? `${100 - (remainingSeconds / Math.max(1, preset.config.prepSeconds)) * 100}%` : phase === "recording" ? `${100 - (remainingSeconds / preset.config.answerSeconds) * 100}%` : phase === "review" ? "100%" : "0%" }} /></div>
                  </div>
                  <div className={styles.practiceActions}>
                    {phase === "ready" && <button type="button" className={styles.primaryButton} onClick={beginQuestion}><Play />이 질문 시작</button>}
                    {phase === "preparing" && <button type="button" className={styles.primaryButton} onClick={startRecording}><Video />바로 답변 시작</button>}
                    {phase === "recording" && <button type="button" className={styles.stopButton} onClick={stopRecording}><Square />답변 종료</button>}
                    {phase === "review" && <><button type="button" className={styles.secondaryButton} onClick={() => { setPhase("ready"); setPracticeMessage(""); }}><RotateCcw />다시 녹화</button><button type="button" className={styles.primaryButton} onClick={moveToNextQuestion}>{questionIndex === preset.questions.length - 1 ? "결과 보기" : "다음 문항"}<ArrowRight /></button></>}
                  </div>
                  {practiceMessage && <p className={styles.practiceMessage}>{practiceMessage}</p>}
                </section>

                <section className={styles.recordPanel}>
                  <div className={styles.recordStatus}><span className={phase === "recording" ? styles.recordingDot : ""} />{phase === "recording" ? "REC" : phase === "review" ? "REVIEW" : "CAMERA READY"}</div>
                  {phase === "review" && currentRecording ? <video className={styles.reviewVideo} src={currentRecording.objectUrl} controls playsInline /> : <video ref={videoRef} className={styles.liveVideo} muted playsInline autoPlay />}
                  <div className={styles.cameraFooter}><span><Camera />카메라</span><span><Mic />마이크</span><span><Clock3 />{preset.config.answerSeconds}초 제한</span></div>
                </section>
              </div>
            </section>
          )}

          {screen === "report" && (
            <section>
              <PageHeading eyebrow="LOCAL SESSION REPORT" title="이번 연습을 복기하세요" description="지금은 녹화·시간 관리 기본 틀만 동작합니다. STT와 AI 내용 평가는 다음 연결 단계입니다." />
              <div className={styles.reportSummary}>
                <div><span>완료 문항</span><strong>{recordings.length}<small> / {preset.questions.length}</small></strong></div>
                <div><span>평균 답변시간 사용</span><strong>{averageUsage}<small>%</small></strong></div>
                <div><span>저장 상태</span><strong className={styles.localValue}>로컬 임시</strong></div>
              </div>
              <div className={styles.reportNotice}><Info /><div><b>가짜 AI 점수를 만들지 않았습니다</b><p>STT와 평가 엔진을 연결하기 전까지 질문 적합성·직무 연관성·말하기 품질은 표시하지 않습니다.</p></div></div>
              <div className={styles.answerTable}>
                <div className={styles.tableHead}><span>문항</span><span>사용 시간</span><span>근거 상태</span><span>녹화</span></div>
                {preset.questions.map((question, index) => {
                  const recording = recordings.find((item) => item.questionId === question.id);
                  return <div className={styles.tableRow} key={question.id}><span><b>{index + 1}</b><em>{question.text}</em></span><span>{recording ? `${recording.durationSeconds}초 / ${preset.config.answerSeconds}초` : "미응답"}</span><span><EvidenceBadge status={question.evidenceStatus} /></span><span>{recording ? <a href={recording.objectUrl} download={`mooa-interview-${index + 1}.${recording.mimeType.includes("mp4") ? "mp4" : "webm"}`}><Download />저장</a> : "-"}</span></div>;
                })}
              </div>
              <div className={styles.nextEngine}><Gauge /><div><b>다음 연결: STT → 근거형 평가 → 꼬리질문</b><p>현재 OpenAI 기반 질문·평가 구조를 재사용하고 음성 전사만 서버 어댑터로 추가하면 됩니다.</p></div><span>NOT CONNECTED</span></div>
              <div className={styles.bottomActions}><button type="button" className={styles.textButton} onClick={resetPrototype}><RotateCcw />처음부터 다시</button><button type="button" className={styles.primaryButton} disabled={recordings.length === 0} onClick={() => { setQuestionIndex(0); setPhase("ready"); setScreen("practice"); }}>약점 재연습 UI 보기<ArrowRight /></button></div>
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
    <PageHeading eyebrow="STEP 01 · 전형 선택" title="지원 기업의 실제 면접 흐름에 맞춰 연습합니다" description="기업 이름만 붙인 범용 질문이 아니라 전형·직무·출처가 확인된 프리셋을 사용합니다." />
    <div className={styles.modeTabs}><button type="button" className={styles.modeActive}><Video />기업 AI 채용전형</button><button type="button"><Building2 />일반·대면 면접</button><button type="button"><Upload />어떤 유형인지 모르겠어요</button></div>

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

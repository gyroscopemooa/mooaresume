"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./microphone-check.module.css";

/** Uses the already-authorized stream; never uploads microphone data. */
export function MicrophoneCheck({ stream, onVerifiedChange }: { stream: MediaStream | null; onVerifiedChange?: (verified: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("5초 동안 말한 뒤 재생해서 실제 목소리를 확인하세요.");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const urlRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);
  const record = () => {
    if (!stream || busy) return;
    onVerifiedChange?.(false);
    try {
      const audio = new MediaStream(stream.getAudioTracks());
      const recorder = new MediaRecorder(audio);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      let failed = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { failed = true; setBusy(false); setMessage("시험 녹음에 실패했습니다. 장치를 다시 확인하세요."); };
      recorder.onstop = () => {
        setBusy(false);
        if (failed || !chunks.length) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        setUrl(urlRef.current);
        setMessage("재생 버튼으로 들어보세요. 소리가 없으면 입력 장치·음소거를 확인하세요.");
      };
      recorder.start();
      setBusy(true);
      setMessage("녹음 중입니다. 평소 면접 답변처럼 말해 주세요.");
      timerRef.current = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 5000);
    } catch { setBusy(false); setMessage("이 브라우저에서 시험 녹음을 시작하지 못했습니다."); }
  };
  return <section className={styles.check} aria-label="마이크 시험 녹음"><button type="button" disabled={!stream || busy} onClick={record}>{busy ? "5초 시험 녹음 중…" : "마이크 5초 시험 녹음"}</button><p role="status">{message}</p>{url && <><audio src={url} controls /><label><input type="checkbox" onChange={(event) => onVerifiedChange?.(event.target.checked)} />재생해서 목소리 크기와 끊김이 없는지 확인했습니다</label><p>작거나 끊기거나 소음이 크면 STT와 음성 계측 결과도 불안정할 수 있습니다. 마이크 위치·입력 장치를 조정하고 다시 시험하세요.</p></>}</section>;
}

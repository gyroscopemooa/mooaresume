"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FACE_OVERLAY_CONNECTIONS } from "@/lib/interview-media/vision-geometry";
import { REPLAY_POSE_CONNECTIONS, type ReplayObservation } from "@/lib/interview-media/replay-observation-geometry";
import { startReplayObservations, type ReplayStatus } from "@/lib/interview-media/replay-observations";
import styles from "./replay-observation-overlay.module.css";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceKey: string;
  /** Must be false until the user explicitly opts in for this selected video. */
  enabled: boolean;
  includePose?: boolean;
  onObservation?: (observation: ReplayObservation | null) => void;
};

const MOUTH = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
const mouthLines = MOUTH.slice(1).map((end, index) => [MOUTH[index], end] as const);

export function drawReplayObservation(canvas: HTMLCanvasElement, observation: ReplayObservation | null) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!observation) return;
  canvas.width = observation.width;
  canvas.height = observation.height;
  context.lineWidth = Math.max(1.4, observation.width / 700);
  context.strokeStyle = "#6dd9ff";
  context.fillStyle = "#d8f5ff";
  const line = (ax: number, ay: number, bx: number, by: number) => {
    context.beginPath();
    context.moveTo(ax * canvas.width, ay * canvas.height);
    context.lineTo(bx * canvas.width, by * canvas.height);
    context.stroke();
  };
  if (observation.face.status === "single_face") {
    const points = observation.face.landmarks;
    for (const [start, end] of [...FACE_OVERLAY_CONNECTIONS, ...mouthLines]) {
      const a = points[start], b = points[end];
      if (a && b) line(a.x, a.y, b.x, b.y);
    }
    if (observation.faceMeasurements.irisHorizontalRatio !== null) for (const index of [468, 473]) {
      const point = points[index];
      if (!point) continue;
      context.beginPath(); context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(2, canvas.width / 300), 0, Math.PI * 2); context.fill();
    }
  }
  context.strokeStyle = "#d9e8ff";
  context.fillStyle = "#d9e8ff";
  if (observation.pose.status === "single_person") {
    for (const [start, end] of REPLAY_POSE_CONNECTIONS) {
      const a = observation.pose.landmarks[start], b = observation.pose.landmarks[end];
      if (a && b) line(a.x, a.y, b.x, b.y);
    }
    for (const point of observation.pose.landmarks.slice(11)) if (point) {
      context.beginPath(); context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(2, canvas.width / 400), 0, Math.PI * 2); context.fill();
    }
  }
}

function observationLabel(frame: ReplayObservation | null) {
  if (!frame) return "현재 프레임 확인 중";
  const face = frame.face.status === "single_face" ? "얼굴 기준점" : frame.face.status === "multiple_faces" ? "여러 얼굴 · 분석 제외" : "얼굴 확인 불가";
  const pose = frame.pose.status === "single_person" && frame.pose.shoulderTiltDegrees !== null ? `어깨선 ${frame.pose.shoulderTiltDegrees.toFixed(1)}°`
    : frame.pose.status === "multiple_people" ? "여러 사람 · 신체 분석 제외" : frame.pose.status === "unavailable" ? "신체 모델 미연결" : "신체 기준점 확인 불가";
  return `${face} · ${pose}`;
}

/** Place as a sibling of video inside a position:relative container with its exact aspect ratio. */
export function ReplayObservationOverlay({ videoRef, sourceKey, enabled, includePose = true, onObservation }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbackRef = useRef(onObservation);
  const [status, setStatus] = useState<ReplayStatus>({ state: "loading", message: "영상 추적 준비", poseAvailable: false });
  const [label, setLabel] = useState("");
  useEffect(() => { callbackRef.current = onObservation; }, [onObservation]);
  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    if (canvasRef.current) drawReplayObservation(canvasRef.current, null);
    let active = true;
    let stop: (() => void) | undefined;
    let lastLabelAt = -Infinity;
    const controller = new AbortController();
    void startReplayObservations(video, {
      signal: controller.signal,
      includePose,
      onFrame: (frame) => {
        if (!active) return;
        if (canvasRef.current) drawReplayObservation(canvasRef.current, frame);
        callbackRef.current?.(frame);
        if (!frame || performance.now() - lastLabelAt >= 400) { setLabel(observationLabel(frame)); lastLabelAt = performance.now(); }
      },
      onStatus: (next) => { if (active) setStatus(next); },
    }).then((cleanup) => { if (active) stop = cleanup; else cleanup(); }).catch((error: unknown) => {
      if (active && !controller.signal.aborted) setStatus({ state: "error", message: error instanceof Error ? error.message : "영상 추적을 시작하지 못했습니다.", poseAvailable: false });
    });
    return () => { active = false; controller.abort(); stop?.(); callbackRef.current?.(null); };
  }, [videoRef, sourceKey, enabled, includePose]);

  if (!enabled) return null;
  return <div className={styles.layer}>
    <canvas ref={canvasRef} className={styles.canvas} aria-label="재생 프레임에서 검출한 얼굴·신체 기준점" />
    <div className={styles.caption} title={status.message}>
      <span>{status.state === "ready" ? label || status.message : status.message}</span>
      {status.state === "ready" && <small>화면상 좌표 추정 · 시선·감정·태도 점수 아님</small>}
    </div>
  </div>;
}

"use client";
import { useEffect, useState, type RefObject } from "react";
import { startReplayObservations } from "@/lib/interview-media/replay-observations";

/** Setup-only local quality hints; never an interview performance or gaze score. */
export function CameraSetupGuide({ videoRef, enabled }: { videoRef: RefObject<HTMLVideoElement | null>; enabled: boolean }) {
  const [message, setMessage] = useState("카메라 분석을 선택하면 화면 구도와 밝기를 확인합니다.");
  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    let active = true, last = 0;
    const controller = new AbortController();
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 36;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let stop: (() => void) | undefined;
    void startReplayObservations(video, { signal: controller.signal, includePose: false, onStatus: status => { if (active && status.state !== "ready") setMessage(status.message); }, onFrame: observation => {
      if (!active || !observation || performance.now() - last < 700) return;
      last = performance.now();
      const hints: string[] = [];
      if (observation.face.status !== "single_face" || !observation.face.bounds) hints.push("한 사람의 얼굴이 화면에 충분히 보이는지 확인해 주세요.");
      else { const bounds = observation.face.bounds, x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2; if (x < .3 || x > .7 || y < .2 || y > .8) hints.push("얼굴을 화면 중앙에 맞춰 보세요."); if (bounds.height < .2) hints.push("화면에서 얼굴이 작게 보입니다. 카메라와 거리를 확인해 주세요."); if (bounds.height > .8) hints.push("얼굴이 화면을 크게 채우고 있습니다. 촬영 범위를 넓혀 보세요."); }
      if (context && video.readyState >= 2) { try { context.drawImage(video, 0, 0, 64, 36); const pixels = context.getImageData(0, 0, 64, 36).data; let sum = 0; for (let index = 0; index < pixels.length; index += 4) sum += .2126 * pixels[index] + .7152 * pixels[index + 1] + .0722 * pixels[index + 2]; if (sum / (64 * 36) < 45) hints.push("화면 평균 밝기가 낮습니다. 얼굴 앞쪽 조명을 확인해 주세요."); } catch { hints.push("밝기 정보를 읽지 못했습니다."); } }
      setMessage(hints.join(" ") || "현재 프레임에서 얼굴 위치와 밝기에 큰 경고가 없습니다. 실제 화면을 직접 확인해 주세요.");
    } }).then(cleanup => { if (active) stop = cleanup; else cleanup(); }).catch(error => { if (active && !controller.signal.aborted) setMessage(error instanceof Error ? error.message : "구도 확인을 시작하지 못했습니다."); });
    return () => { active = false; controller.abort(); stop?.(); };
  }, [enabled, videoRef]);
  return enabled ? <p role="status" style={{ fontSize:14, lineHeight:1.7, padding:"12px 16px", color:"#46596c", background:"#f5f8fc" }}>{message}<small style={{ display:"block" }}>기기 내 추정 안내입니다. 카메라 응시·감정·태도 평가가 아닙니다.</small></p> : null;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import styles from "./home-promo-video.module.css";

const DISMISSED_KEY = "mooa:home-promo:20260917:dismissed";
const MEDIA_PATH = "/videos/mooa-intro-vertical-20260917";
type Playback = "closed" | "autoplay" | "paused";

export function HomePromoVideo() {
  const [playback, setPlayback] = useState<Playback>("closed");
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = playback !== "closed";

  const showVideo = useCallback(() => {
    setFailed(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPlayback(reduceMotion ? "paused" : "autoplay");
  }, []);

  useEffect(() => {
    // The server renders the normal homepage first, without loading a video.
    // Storage may be unavailable in privacy modes; the close action must still work.
    const frame = window.requestAnimationFrame(() => {
      try {
        if (window.sessionStorage.getItem(DISMISSED_KEY) === "1") return;
      } catch { /* Show normally when tab storage is unavailable. */ }
      showVideo();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showVideo]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    // Fold the already-open career drawer using its existing coordination event.
    // This dialog stays inside .home-page to retain its body-zoom correction.
    window.dispatchEvent(new CustomEvent("mooa:drawer-open", { detail: "home-promo-video" }));
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const video = videoRef.current;

    return () => {
      video?.pause();
      document.documentElement.style.overflow = overflow;
    };
  }, [isOpen, failed]);

  function dismiss() {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* Dismiss even if storage is blocked or full. */ }
    setPlayback("closed");
  }

  return <>
    <button type="button" className={styles.trigger} onClick={showVideo} aria-haspopup="dialog">
      <Play size={17} aria-hidden="true" />60초 소개 영상 보기
    </button>
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="home-promo-title"
      aria-describedby="home-promo-description"
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
      }}
    >
      <div className={styles.header}>
        <div><span className={styles.eyebrow}>MOOA RESUME</span><h2 id="home-promo-title" className={styles.title}>무아레쥬메, 60초 소개</h2></div>
        <button ref={closeRef} type="button" className={styles.close} onClick={dismiss} aria-label="소개 영상 닫기"><X size={23} aria-hidden="true" /></button>
      </div>
      <p id="home-promo-description" className="visually-hidden">처음 작성하는 분부터 QUICK 첨삭, PRO 지원서 작성, FINAL 면접 준비까지 소개합니다. 창은 닫기 버튼이나 ESC 키로 닫을 수 있습니다.</p>
      {isOpen && <div className={styles.stage}>
        {failed ? <div className={styles.error} role="status"><p>영상을 불러오지 못했어요.</p><button type="button" onClick={showVideo}>다시 재생하기</button><button type="button" onClick={dismiss}>닫고 홈페이지 보기</button></div> : <video
          ref={videoRef}
          className={styles.video}
          width={720}
          height={1280}
          poster={`${MEDIA_PATH}.webp`}
          src={`${MEDIA_PATH}.mp4`}
          controls
          playsInline
          muted
          autoPlay={playback === "autoplay"}
          preload="metadata"
          aria-label="무아레쥬메 60초 세로 소개 영상"
          onError={() => setFailed(true)}
        >
          <track kind="captions" src={`${MEDIA_PATH}.vtt`} srcLang="ko" label="한국어" />
          브라우저에서 동영상을 재생할 수 없습니다.
        </video>}
      </div>}
      <div className={styles.hint}>소리는 영상 재생바에서 켤 수 있어요.</div>
    </dialog>
  </>;
}

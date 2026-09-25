"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { isInstalledAppContext } from "@/lib/app-context";
import styles from "./app-first-run-onboarding.module.css";

const COMPLETED_KEY = "mooa:app-intro:20260923:completed";
const MEDIA_PATH = "/videos/mooa-intro-vertical-20260917";

type Playback = "closed" | "autoplay" | "paused";

function hasCompletedIntro(): boolean {
  try {
    return window.localStorage.getItem(COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

function markCompletedIntro() {
  try {
    window.localStorage.setItem(COMPLETED_KEY, "1");
  } catch {
    // Storage can be unavailable in private mode. Closing must still work.
  }
}

function IntroDialog({ autoOpen, trigger }: { autoOpen: boolean; trigger?: boolean }) {
  const [playback, setPlayback] = useState<Playback>("closed");
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = playback !== "closed";

  const open = useCallback(() => {
    setFailed(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPlayback(reduceMotion ? "paused" : "autoplay");
  }, []);

  useEffect(() => {
    if (!autoOpen) return;
    const timer = window.setTimeout(() => {
      if (!isInstalledAppContext() || hasCompletedIntro()) return;
      open();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [autoOpen, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    window.dispatchEvent(new CustomEvent("mooa:drawer-open", { detail: "app-first-run-onboarding" }));
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
    markCompletedIntro();
    setPlayback("closed");
  }

  return <>
    {trigger && <button type="button" className={styles.replay} onClick={open}><Play size={16} aria-hidden="true" />앱 소개 영상 다시 보기</button>}
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="app-intro-title"
      aria-describedby="app-intro-description"
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
      }}
    >
      <div className={styles.header}>
        <div><span className={styles.eyebrow}>MOOA RESUME</span><h2 id="app-intro-title">무아레쥬메 시작하기</h2></div>
        <button ref={closeRef} type="button" className={styles.close} onClick={dismiss} aria-label="앱 소개 건너뛰기"><X size={22} aria-hidden="true" /></button>
      </div>
      <p id="app-intro-description" className="visually-hidden">무아레쥬메의 첨삭 서비스를 소개하는 60초 영상입니다. 끝까지 보지 않아도 아래 건너뛰기 버튼으로 닫을 수 있습니다.</p>
      {isOpen && <div className={styles.stage}>
        {failed ? <div className={styles.error} role="status"><p>영상을 불러오지 못했어요.</p><button type="button" onClick={open}>다시 재생하기</button></div> : <video
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
          aria-label="무아레쥬메 앱 소개 영상"
          onEnded={dismiss}
          onError={() => setFailed(true)}
        >
          <track kind="captions" src={`${MEDIA_PATH}.vtt`} srcLang="ko" label="한국어" />
          브라우저에서 동영상을 재생할 수 없습니다.
        </video>}
      </div>}
      <div className={styles.footer}>
        <span>소리는 영상 재생바에서 켤 수 있어요.</span>
        <button type="button" onClick={dismiss}>건너뛰기</button>
      </div>
    </dialog>
  </>;
}

/** Installed TWA에서만, 기기당 첫 실행에 한 번 소개 영상을 보여 줍니다. */
export function AppFirstRunOnboarding() {
  return <IntroDialog autoOpen />;
}

/** 내 정보에서 사용자가 원할 때 같은 영상을 다시 열 수 있는 버튼입니다. */
export function AppIntroReplayButton() {
  return <IntroDialog autoOpen={false} trigger />;
}

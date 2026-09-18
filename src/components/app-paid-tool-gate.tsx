"use client";

import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { isInstalledAppContext } from "@/lib/app-context";
import styles from "./app-paid-tool-gate.module.css";

/**
 * Play 앱 안에서 외부 결제(Polar) 진입점을 가리는 자리.
 *
 * 자소서 첨삭과 모의면접 재시도에는 Google Play 결제 경로가 있습니다. 이력서
 * AI 제작·경력기술서·포트폴리오·AI 심층해설·법률 문서는 아직 Polar 전용이고,
 * **앱 안에서 그 버튼을 누르면 외부 결제창이 열립니다** — Play 정책이 금지하는
 * 동작이라 심사에서 걸립니다.
 *
 * 그래서 앱에서는 결제 버튼 자리에 이 안내를 둡니다. 무료로 쓰는 부분(수동
 * 이력서 작성·PDF 저장, 커리어 검사, 예시 보기)은 그대로 둡니다.
 *
 * 안내 문구는 웹으로 유도하지 않습니다. "웹에서 결제하세요"가 바로 정책이
 * 막는 그 유도이고, 조용히 링크만 거는 것도 같습니다.
 *
 * 웹에서는 아무것도 바뀌지 않습니다 — `useInstalledApp()`은 브라우저에서 늘
 * false입니다.
 */

/**
 * Play에서 설치한 앱(TWA) 안인지.
 *
 * 마운트 뒤에 정합니다. 서버 렌더와 첫 그리기는 웹과 같아야 hydration이
 * 어긋나지 않습니다.
 */
export function useInstalledApp(): boolean {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setInApp(isInstalledAppContext()), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  return inApp;
}

export function AppPaidToolNotice({ tool }: { tool: string }) {
  return <p className={styles.notice}>
    <LockKeyhole/>
    <span><b>{tool}는 앱에서 준비 중입니다.</b> 지금 앱에서는 자기소개서 첨삭만 결제할 수 있습니다. 무료로 쓰는 기능은 그대로 사용하실 수 있어요.</span>
  </p>;
}

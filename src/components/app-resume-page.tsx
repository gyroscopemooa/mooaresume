"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ResumeBuildPanel } from "@/components/resume-build-panel";
import styles from "./app-resume-page.module.css";

/**
 * 앱의 이력서 탭 — 입력창 하나와 AI 유료 칸만 둔 심플 화면.
 *
 * 웹의 `/resume`은 무료 메이커(칸 전부 + 종이 미리보기)가 먼저 나와서 좁은
 * 화면에서 난잡합니다. 앱에서는 자료를 던지는 칸만 먼저 보여 주고, 무료
 * 메이커는 내 정보의 "문서 만들기"와 여기 아래 링크로 옮겼습니다.
 *
 * 결제·로그인 뒤에는 `/resume`으로 돌아옵니다(ResumeBuildPanel이 결과를 그
 * 화면의 메이커 칸에 채웁니다). 그 경로는 건드리지 않았습니다.
 */
export function AppResumePage() {
  return <div className={styles.page}>
    <ResumeBuildPanel/>
    <Link className={styles.free} href="/resume">
      <span><b>직접 칸을 채워서 만들기</b>무료 · 로그인 없이 바로 인쇄·PDF 저장</span>
      <ArrowRight/>
    </Link>
  </div>;
}

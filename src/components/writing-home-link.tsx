"use client";

import { useEffect, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isInstalledAppContext } from "@/lib/app-context";
import { saveAppSelection, type AppSelection } from "@/lib/app-intake-draft";

/**
 * "작성 유형 다시 고르기 / 작성 화면으로" 같은 링크의 도착지.
 *
 * 웹은 유형 카드를 먼저 고르는 `/onboarding`으로 갑니다. 설치된 앱은 상품·작성 유형·입력창이
 * 한 화면에 있는 `/app`(첨삭 홈)으로 갑니다 — 앱 안에서 웹 화면이 열리지 않게 하려는 것입니다.
 * 앱의 입력 내용은 이 탭에 저장돼 있어 돌아가도 그대로 남습니다(`app-intake-draft`).
 */
export const WEB_WRITING_HOME = "/onboarding";
export const APP_WRITING_HOME = "/app";

export function writingHomeHref(installedApp: boolean, webHref: string = WEB_WRITING_HOME): string {
  return installedApp ? APP_WRITING_HOME : webHref;
}

type WritingHomeLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** 웹에서 가는 곳. 기본은 유형 선택(`/onboarding`). */
  webHref?: string;
  /** 앱에서 도착했을 때 미리 골라 둘 상품·작성 유형(안내가 권한 유형). */
  preselect?: AppSelection;
};

export function WritingHomeLink({ webHref = WEB_WRITING_HOME, preselect, onClick, ...rest }: WritingHomeLinkProps) {
  // 서버 렌더와 같은 값으로 시작하고, 마운트 뒤에 앱이면 바꿉니다(하이드레이션 불일치 방지).
  const [installedApp, setInstalledApp] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setInstalledApp(isInstalledAppContext()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return <Link
    {...rest}
    href={writingHomeHref(installedApp, webHref)}
    onClick={(event) => {
      if (installedApp && preselect) saveAppSelection(preselect);
      onClick?.(event);
    }}
  />;
}

/**
 * 안전장치: 설치된 앱에서 웹의 유형 선택 화면(`/onboarding`)이 열리면 앱의 첨삭 홈으로 보냅니다.
 * 링크를 놓치거나 예전 주소로 들어와도 앱이 웹 화면으로 새지 않습니다. 웹은 영향이 없습니다.
 */
export function AppOnboardingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (isInstalledAppContext()) router.replace(APP_WRITING_HOME);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [router]);

  return null;
}

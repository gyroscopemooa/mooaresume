"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, Compass, FilePenLine, FileText, ListOrdered } from "lucide-react";
import { syncAppContext } from "@/lib/app-context";
import styles from "./app-tab-bar.module.css";

/**
 * 앱의 하단 메뉴바.
 *
 * 홈이 첨삭입니다 — 앱을 켜면 바로 입력 화면이고, 이 바는 거기서 이력서·
 * 커리어·내 정보로 옮겨 가는 길입니다. 옮겨 간 화면은 웹에서 이미 팔고 있는
 * 그 화면이라, 앱용으로 다시 만든 것이 아닙니다.
 *
 * 루트 레이아웃에 놓여 있지만 **앱 셸에서만 보입니다**(`/app`을 거친 탭이거나
 * Play에서 설치한 앱). 일반 웹 방문자에게는 아무것도 렌더링하지 않으므로
 * 기존 웹 화면은 그대로입니다.
 *
 * 입력에 초점이 가면 숨습니다. 안드로이드는 키보드가 올라올 때 화면을 줄이는데,
 * 화면 아래에 고정된 바가 그대로 있으면 지금 치고 있는 칸을 가립니다.
 */

/**
 * 첨삭이 가운데입니다 — 앱을 켜면 열리는 홈이고, 엄지가 가장 편한 자리입니다.
 * 맨 왼쪽 "시작"은 무엇을 골라야 할지 모르는 사람이 언제든 다시 들어올 수 있는
 * 단계 안내(`/app/start`)입니다.
 */
const TABS = [
  { href: "/app/start", label: "시작", Icon: ListOrdered, match: ["/app/start", "/onboarding"] },
  { href: "/resume", label: "이력서", Icon: FileText, match: ["/resume"] },
  { href: "/app", label: "첨삭", Icon: FilePenLine, match: ["/app", "/analysis", "/result", "/quick", "/pro", "/final", "/analyze"] },
  // 커리어 탭의 홈은 검사 목록입니다. `/career`의 종합 대시보드는 좁은 화면에서
  // 워터마크·잠긴 패널이 겹쳐 읽히지 않고, 앱에서 커리어를 누르는 사람이 찾는
  // 것은 "무슨 검사를 할 수 있나"입니다. 대시보드로 들어와도 이 탭이 켜지도록
  // `match`에는 `/career` 전체를 둡니다.
  { href: "/career/assessments", label: "커리어", Icon: Compass, match: ["/career"] },
  { href: "/app/my", label: "내 정보", Icon: CircleUser, match: ["/app/my", "/refer", "/redeem"] },
] as const;

/** 앱 셸에서도 하단 바를 띄우지 않는 곳: 관리자 화면. */
const HIDDEN_PREFIXES = ["/meensoo"];

/**
 * 가장 길게 맞는 경로가 이깁니다.
 *
 * `/app/start`와 `/app/my`가 첨삭 탭의 `/app`에도 걸리므로, 먼저 찾은 것을
 * 쓰면 세 탭이 같은 화면에서 켜집니다. 어느 탭이 더 구체적으로 맞는지로
 * 정합니다.
 */
function activeHref(pathname: string): string | null {
  let best: { href: string; length: number } | null = null;
  for (const tab of TABS) {
    for (const prefix of tab.match) {
      const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (matches && (!best || prefix.length > best.length)) best = { href: tab.href, length: prefix.length };
    }
  }
  return best?.href ?? null;
}

export function AppTabBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    // 한 틱 뒤에 정합니다. 효과 본문에서 바로 setState를 부르면 렌더가 연쇄로
    // 돌고, 이 저장소의 lint 규칙도 그것을 막습니다.
    const timeout = window.setTimeout(() => {
      const { shell } = syncAppContext({
        pathname,
        search: window.location.search,
        referrer: document.referrer,
        hasDigitalGoods: "getDigitalGoodsService" in window,
      });
      setVisible(shell);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    const editable = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || element.isContentEditable;
    };
    const onFocusIn = (event: FocusEvent) => { if (editable(event.target)) setTyping(true); };
    const onFocusOut = () => setTyping(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [visible]);

  if (!visible || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const active = activeHref(pathname);

  return <>
    {/* 화면 맨 아래 내용이 바에 가리지 않도록 자리만 차지합니다. */}
    <div className={styles.spacer} aria-hidden="true"/>
    {/* `nav`이 아니라 `role="navigation"`입니다. 전역 스타일(globals.css)에
        1000px 아래에서 `nav > a`를 감추는 규칙이 있어(사이트 헤더 메뉴용)
        `nav`로 두면 휴대폰에서 탭이 전부 사라집니다. */}
    <div role="navigation" className={typing ? styles.hidden : styles.bar} aria-label="앱 메뉴">
      {TABS.map(({ href, label, Icon }) => <Link
        key={href}
        href={href}
        className={active === href ? styles.tabOn : styles.tab}
        aria-current={active === href ? "page" : undefined}
      >
        <Icon aria-hidden="true"/>
        <span>{label}</span>
      </Link>)}
    </div>
  </>;
}

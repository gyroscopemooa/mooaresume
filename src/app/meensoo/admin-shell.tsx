"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  Database,
  ExternalLink,
  FileText,
  Gift,
  Menu,
  Moon,
  Sun,
  Ticket,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import styles from "./admin.module.css";

const NAV = [
  { href: "/meensoo", label: "대시보드", Icon: LayoutDashboard, exact: true },
  { href: "/meensoo/purchases", label: "구매 내역", Icon: CreditCard },
  { href: "/meensoo/analyses", label: "첨삭 결과", Icon: FileText },
  { href: "/meensoo/mail", label: "메일 보내기", Icon: Send, exact: true },
  { href: "/meensoo/mail/history", label: "메일 발송 기록", Icon: History },
  { href: "/meensoo/rewards", label: "무료 이용권", Icon: Gift },
  { href: "/meensoo/coupons", label: "협업 쿠폰", Icon: Ticket },
  { href: "/meensoo/research", label: "축적 데이터", Icon: Database },
  { href: "/meensoo/feedback", label: "분석 후기", Icon: Star, badgeKey: "feedback" as const },
  { href: "/meensoo/inquiries", label: "문의", Icon: MessageSquare, badgeKey: "inquiries" as const },
  { href: "/meensoo/waitlist", label: "사전 신청", Icon: Users },
];

type Props = { children: React.ReactNode; newInquiries?: number; newFeedback?: number };

const THEME_KEY = "mooa:admin-theme";
const THEME_EVENT = "mooa:admin-theme-change";

/**
 * 테마는 상태가 아니라 저장된 값입니다.
 *
 * 효과 안에서 setState로 맞추면 첫 그림을 그린 뒤 한 번 더 그리게 되고, 린트도
 * 그것을 막습니다. 저장소를 직접 읽고 바뀔 때만 다시 읽습니다 — 서버에는
 * 저장소가 없으므로 서버 쪽은 어두운 쪽으로 고정합니다.
 */
const subscribeTheme = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

const readTheme = (): "dark" | "light" => {
  try {
    return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    // 저장소를 막아 둔 브라우저. 기본값으로 두면 그만입니다.
    return "dark";
  }
};

const readServerTheme = (): "dark" | "light" => "dark";

export function AdminShell({ children, newInquiries = 0, newFeedback = 0 }: Props) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    try { window.localStorage.setItem(THEME_KEY, next); } catch { /* 위와 같음 */ }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  const pathname = usePathname();
  const router = useRouter();

  // The rail expands on hover/focus, which touch screens never trigger — on
  // mobile it was permanently stuck collapsed to icons with no way to open
  // it. This gives mobile an explicit button and a slide-in drawer instead.
  const [navOpen, setNavOpen] = useState(false);

  // Adjusting state during render (React's documented pattern for this,
  // rather than an effect) so the close on navigation doesn't cost an extra
  // render pass.
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (pathname !== drawerPathname) {
    setDrawerPathname(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!navOpen) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  async function signOut() {
    await fetch("/api/meensoo/logout", { method: "POST" });
    // The gate lives in the server layout, so re-fetching the tree is what
    // swaps the console back to the login screen.
    router.refresh();
  }

  return (
    <div className={styles.shell} data-theme={theme}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={() => setNavOpen(true)}
        aria-label="메뉴 열기"
      >
        <Menu />
      </button>

      {navOpen && (
        <div className={styles.overlay} onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      <nav className={styles.sidebar} data-open={navOpen} aria-label="관리자 메뉴">
        <button
          type="button"
          className={styles.closeNav}
          onClick={() => setNavOpen(false)}
          aria-label="메뉴 닫기"
        >
          <X />
        </button>

        <Link href="/meensoo" className={styles.brand}>
          <ClipboardList />
          <b className={styles.label}>MOOA 관리자</b>
        </Link>

        {NAV.map(({ href, label, Icon, exact, badgeKey }) => {
          // The mail composer sits at /meensoo/mail and its log one level
          // deeper, so a prefix match would light both up at once.
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={styles.link} data-active={active}>
              <Icon />
              <span className={styles.label}>{label}</span>
              {badgeKey === "inquiries" && newInquiries > 0 && (
                <span className={`${styles.badge} ${styles.label}`}>{newInquiries}</span>
              )}
              {badgeKey === "feedback" && newFeedback > 0 && (
                <span className={`${styles.badge} ${styles.label}`}>{newFeedback}</span>
              )}
            </Link>
          );
        })}

        <div className={styles.spacer} />
        {/* 밝게/어둡게. 브라우저에 남겨 두어 다음에 열 때도 고른 대로 뜹니다 —
            매번 다시 고르게 하면 그건 설정이 아니라 재주입니다. */}
        <button type="button" className={styles.themeToggle} onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
          <span className={styles.label}>{theme === "dark" ? "밝게" : "어둡게"}</span>
        </button>

        <div className={styles.railFoot}>
          <Link href="/" className={styles.link} target="_blank">
            <ExternalLink />
            <span className={styles.label}>사이트 열기</span>
          </Link>
          <button type="button" className={styles.link} onClick={() => void signOut()} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>
            <LogOut />
            <span className={styles.label}>로그아웃</span>
          </button>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

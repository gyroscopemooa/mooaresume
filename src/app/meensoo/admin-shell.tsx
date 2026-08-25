"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  CreditCard,
  Database,
  ExternalLink,
  FileText,
  Gift,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import styles from "./admin.module.css";

const NAV = [
  { href: "/meensoo", label: "대시보드", Icon: LayoutDashboard, exact: true },
  { href: "/meensoo/purchases", label: "구매 내역", Icon: CreditCard },
  { href: "/meensoo/analyses", label: "첨삭 결과", Icon: FileText },
  { href: "/meensoo/mail", label: "메일 보내기", Icon: Send, exact: true },
  { href: "/meensoo/mail/history", label: "메일 발송 기록", Icon: History },
  { href: "/meensoo/rewards", label: "무료 이용권", Icon: Gift },
  { href: "/meensoo/research", label: "축적 데이터", Icon: Database },
  { href: "/meensoo/inquiries", label: "문의", Icon: MessageSquare, badgeKey: "inquiries" as const },
  { href: "/meensoo/waitlist", label: "사전 신청", Icon: Users },
];

type Props = { children: React.ReactNode; newInquiries?: number };

export function AdminShell({ children, newInquiries = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/meensoo/logout", { method: "POST" });
    // The gate lives in the server layout, so re-fetching the tree is what
    // swaps the console back to the login screen.
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="관리자 메뉴">
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
            </Link>
          );
        })}

        <div className={styles.spacer} />
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

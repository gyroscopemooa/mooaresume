"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import styles from "@/components/work-style-assessment.module.css";

export function CareerLayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  if (pathname === "/career/login") {
    return children;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>M</span> MOOA <b>Resume</b></Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/career" style={{ color: "#65746a", fontSize: 11 }}>커리어 검사 홈</Link>
          <Link href="/career/assessments" style={{ color: "#65746a", fontSize: 11 }}>검사 목록</Link>
          <Link href="/career/login?next=/career/profile" style={{ display: "flex", alignItems: "center", gap: 4, color: "#65746a", fontSize: 11 }}><UserRound size={14} />로그인 · 내 프로필</Link>
          <Link href="/" className={styles.back}><ArrowLeft /> 자소서 첨삭</Link>
        </nav>
      </header>
      <div className={styles.container}>{children}</div>
    </div>
  );
}
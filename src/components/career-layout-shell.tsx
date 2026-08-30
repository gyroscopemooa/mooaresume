"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/work-style-assessment.module.css";

export function CareerLayoutShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void createClient().auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user))).catch(() => setSignedIn(false));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    setSignedIn(false);
    router.push("/career");
    router.refresh();
  }

  // AI 심층해설은 별도 제품 화면으로 구성해 공통 밝은 헤더를 렌더링하지 않는다.
  if (pathname === "/career/login" || pathname.startsWith("/career/ai")) return children;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>M</span> MOOA <b>Resume</b></Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/career" style={{ color: "#65746a", fontSize: 11 }}>커리어 검사 홈</Link>
          <Link href="/career/assessments" style={{ color: "#65746a", fontSize: 11 }}>검사 목록</Link>
          {signedIn ? <>
            <Link href="/career/profile" style={{ display: "flex", alignItems: "center", gap: 4, color: "#65746a", fontSize: 11 }}><UserRound size={14} />내 프로필</Link>
            <button type="button" onClick={() => void signOut()} style={{ display: "flex", alignItems: "center", gap: 4, border: 0, background: "transparent", color: "#65746a", fontSize: 11, cursor: "pointer" }}><LogOut size={14} />로그아웃</button>
          </> : <Link href="/career/login?next=/career/profile" style={{ display: "flex", alignItems: "center", gap: 4, color: "#65746a", fontSize: 11 }}><UserRound size={14} />로그인 · 내 프로필</Link>}
          <Link href="/" className={styles.back}><ArrowLeft /> 자소서 첨삭</Link>
        </nav>
      </header>
      <div className={styles.container}>{children}</div>
    </div>
  );
}
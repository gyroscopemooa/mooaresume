"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleUser, Gift, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AccountDeleteForm } from "./account-delete-form";
import styles from "./app-my-page.module.css";

/**
 * 앱의 "내 정보" 탭 — 계정, 지난 분석, 이용권, 안내 문서.
 *
 * 웹에는 이 목록 화면이 없었습니다(계정 메뉴에 로그아웃과 추천 링크만 있었음).
 * 앱은 하단 탭 하나가 "내 기록"을 가리키므로 그 자리가 필요합니다. 새 API는
 * 만들지 않았습니다 — 브라우저에서 기존 RLS로 본인 것만 읽습니다.
 *
 * 여기서 분석을 시작하지도, 결제하지도 않습니다. 보는 자리입니다.
 */

type RunRow = {
  id: string;
  product: string;
  status: string;
  created_at: string;
  application_case_id: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제·시작 전",
  RUNNING: "분석 중",
  COMPLETED: "완료",
  FAILED: "실패",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function AppMyPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [caseTitles, setCaseTitles] = useState<Record<string, string>>({});
  const [credits, setCredits] = useState<string[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled) return;
        setEmail(auth.user?.email ?? null);
        setReady(true);
        if (!auth.user) return;
        // RLS가 본인 것만 돌려줍니다. 새 서버 경로를 만들지 않은 이유입니다.
        const [runResult, caseResult, creditResult] = await Promise.all([
          supabase.from("analysis_runs").select("id, product, status, created_at, application_case_id").order("created_at", { ascending: false }).limit(20),
          supabase.from("application_cases").select("id, title, company_name, role_name").order("updated_at", { ascending: false }).limit(40),
          supabase.from("reward_credits").select("product").eq("status", "AVAILABLE").limit(20),
        ]);
        if (cancelled) return;
        if (runResult.error || caseResult.error || creditResult.error) setLoadFailed(true);
        setRuns((runResult.data ?? []) as RunRow[]);
        setCaseTitles(Object.fromEntries(((caseResult.data ?? []) as Array<{ id: string; title: string; company_name: string | null; role_name: string | null }>)
          .map((row) => [row.id, [row.company_name, row.role_name].filter(Boolean).join(" · ") || row.title])));
        setCredits(((creditResult.data ?? []) as Array<{ product: string | null }>).map((row) => row.product).filter((product): product is string => Boolean(product)));
      } catch {
        if (!cancelled) { setReady(true); setLoadFailed(true); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/app/my` },
    });
    if (error) setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      setEmail(null);
      setRuns([]);
      setCredits([]);
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.page}>
    <header className={styles.top}><h1>내 정보</h1></header>

    <section className={styles.card}>
      <div className={styles.account}>
        <CircleUser/>
        <div>
          <b>{!ready ? "확인 중..." : email ?? "로그인하지 않았습니다"}</b>
          <small>{email ? "지원 건과 결과는 이 계정에만 보입니다." : "로그인하면 지난 분석과 이용권을 볼 수 있습니다."}</small>
        </div>
      </div>
      {ready && (email
        ? <button type="button" className={styles.secondary} disabled={busy} onClick={() => void signOut()}>{busy ? "처리 중..." : "로그아웃"}</button>
        : <button type="button" className={styles.primary} disabled={busy} onClick={() => void signIn()}>{busy ? "이동 중..." : "Google로 로그인"} <ArrowRight/></button>)}
    </section>

    {email && <section className={styles.card}>
      <h2>지난 분석</h2>
      {loadFailed && <p className={styles.notice}>목록을 모두 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
      {runs.length === 0 && !loadFailed && <p className={styles.empty}>아직 분석 기록이 없습니다. 첨삭 탭에서 자기소개서를 넣어 보세요.</p>}
      <ul className={styles.runs}>
        {runs.map((run) => <li key={run.id}>
          <Link href={`/result?analysisRunId=${encodeURIComponent(run.id)}`}>
            <div>
              <b>{caseTitles[run.application_case_id] ?? "지원 건"}</b>
              <small>{run.product} · {STATUS_LABEL[run.status] ?? run.status} · {formatDate(run.created_at)}</small>
            </div>
            <ArrowRight/>
          </Link>
        </li>)}
      </ul>
    </section>}

    {email && credits.length > 0 && <p className={styles.credit}>
      <Gift/> <span><b>사용하지 않은 이용권 {credits.length}개</b> · {[...new Set(credits)].join(", ")}</span>
    </p>}

    <section className={styles.card}>
      <h2>안내</h2>
      <ul className={styles.links}>
        <li><Link href="/refer">친구 추천 · 무료 이용권 <ArrowRight/></Link></li>
        <li><Link href="/guide">이용 방법 · 자주 묻는 질문 <ArrowRight/></Link></li>
        <li><Link href="/privacy">개인정보 처리방침 <ArrowRight/></Link></li>
      </ul>
    </section>

    <AccountDeleteForm/>

    <p className={styles.privacy}><ShieldCheck/> <span>입력한 지원서는 비공개이며, 결제와 분석은 확인 화면을 거쳐서만 진행됩니다.</span></p>
  </div>;
}

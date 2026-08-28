"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, BarChart3, CheckCircle2, Compass, FileText, LayoutDashboard, LockKeyhole, Sparkles } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { scoreWorkStyle, type WorkStyleAnswer } from "@/domain/career-assessment";
import { scoreCareerInterest, type InterestAnswer } from "@/domain/career-interest";
import { scoreWorkValues, type WorkValueAnswer } from "@/domain/career-work-values";
import styles from "./career-public-home.module.css";

const assessments = [
  { id: "01", name: "직업흥미 탐색", method: "RIASEC · BETA", meta: "30문항 · 약 5분", description: "선호하는 활동과 문제 해결 방식", href: "/career/interest", icon: Compass },
  { id: "02", name: "업무성향 분석", method: "IPIP BIG FIVE", meta: "50문항 · 약 7분", description: "업무 방식과 선호 환경", href: "/career/work-style", icon: BarChart3 },
  { id: "03", name: "직업가치 탐색", method: "WORK VALUES · BETA", meta: "18문항 · 약 4분", description: "일에서 중요하게 보는 조건", href: "/career/values", icon: Sparkles },
] as const;

const storageKeys = { workStyle: "mooa-work-style-answers-v1", interest: "mooa-career-interest-answers-v1", values: "mooa-career-work-values-v1" } as const;
const subscribe = () => () => undefined;
type AuthState = "loading" | "guest" | "signed-in";

function parse<T, R>(raw: string | null, score: (answers: T) => R) {
  try { return raw ? score(JSON.parse(raw) as T) : null; } catch { return null; }
}

export function CareerPublicHome() {
  const [auth, setAuth] = useState<AuthState>("loading");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try { const { data } = await createClient().auth.getUser(); setAuth(data.user ? "signed-in" : "guest"); }
        catch { setAuth("guest"); }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const workRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(storageKeys.workStyle), () => null);
  const interestRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(storageKeys.interest), () => null);
  const valuesRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(storageKeys.values), () => null);
  const workStyle = useMemo(() => parse<Record<string, WorkStyleAnswer>, ReturnType<typeof scoreWorkStyle>>(workRaw, scoreWorkStyle), [workRaw]);
  const interest = useMemo(() => parse<Record<string, InterestAnswer>, ReturnType<typeof scoreCareerInterest>>(interestRaw, scoreCareerInterest), [interestRaw]);
  const values = useMemo(() => parse<Record<string, WorkValueAnswer>, ReturnType<typeof scoreWorkValues>>(valuesRaw, scoreWorkValues), [valuesRaw]);
  const charts = [
    workStyle && { label: "업무성향", method: "IPIP BIG FIVE", data: workStyle.map((item) => ({ label: item.label, score: item.score })) },
    interest && { label: "직업흥미", method: "RIASEC · BETA", data: interest.map((item) => ({ label: item.label, score: item.score })) },
    values && { label: "직업가치", method: "WORK VALUES · BETA", data: values.map((item) => ({ label: item.label, score: item.score })) },
  ].filter(Boolean) as { label: string; method: string; data: { label: string; score: number }[] }[];
  const isGuest = auth !== "signed-in";

  return <main className={styles.workspace}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}>MOOA<span>.</span></Link><p>CAREER<br />INTELLIGENCE</p>
      <nav><span className={styles.active}><LayoutDashboard />커리어 탐색</span><Link href="/career/profile"><BarChart3 />커리어 프로필</Link><Link href="/onboarding"><FileText />지원서 분석</Link></nav>
      <div className={styles.sideAssessments}><small>ASSESSMENTS</small>{assessments.map((assessment) => { const Icon = assessment.icon; return <Link key={assessment.id} href={assessment.href}><Icon /><span>{assessment.name}</span><i>{assessment.id}</i></Link>; })}</div>
      <small className={styles.sideNote}>PRIVATE DATA<br />LOGIN TO UNLOCK</small>
    </aside>
    <section className={styles.main}>
      <header className={styles.topbar}><div><b>MOOA / CAREER</b><span>Career intelligence workspace</span></div><Link href={isGuest ? "/entry" : "/career/profile"}>{isGuest ? "로그인" : "내 프로필"}</Link></header>
      <div className={styles.mobileBrand}><Link href="/">MOOA<span>.</span></Link><Link href={isGuest ? "/entry" : "/career/profile"}>{isGuest ? "로그인" : "내 프로필"}</Link></div>
      <section className={styles.overview}><div><small>CAREER EXPLORATION / 01—03</small><h1>커리어 탐색</h1><p>활동 선호, 업무 방식, 근무 조건을 따로 확인하고 실제 경험과 지원 공고를 검토하는 기준으로 사용합니다.</p></div><div className={styles.status}><i className={isGuest ? styles.lockedDot : styles.liveDot} />{isGuest ? "PRIVATE RESULTS LOCKED" : `${charts.length} / 3 RESULTS LOADED`}</div></section>
      <section className={`${styles.dashboard} ${isGuest ? styles.dashboardLocked : ""}`} aria-label="커리어 결과 대시보드">
        <article className={styles.radarPanel}><PanelHead label={charts[0]?.method ?? "RESULT VISUALIZATION"} title={charts[0]?.label ?? "나의 응답 그래프"} meta={charts[0] ? "LIVE" : "WAITING"} />
          <div className={styles.radar}>{charts[0] ? <ResponsiveContainer width="100%" height="100%"><RadarChart data={charts[0].data}><PolarGrid stroke="#405047" /><PolarAngleAxis dataKey="label" tick={{ fill: "#c5cec7", fontSize: 9 }} /><Radar dataKey="score" stroke="#6cf0b5" fill="#21c77a" fillOpacity={0.3} /></RadarChart></ResponsiveContainer> : <RadarPlaceholder />}</div>
          <p>{charts[0] ? "현재 기기에서 완료한 응답을 기준으로 계산했습니다." : "검사를 완료하면 내 응답을 바탕으로 레이더 그래프가 표시됩니다."}</p>
        </article>
        <article className={styles.statusPanel}><PanelHead label="PROFILE STATUS" title="검사 기록" meta={`${charts.length} / 3`} />
          <div className={styles.recordList}>{assessments.map((assessment, index) => <div key={assessment.id}><i>{String(index + 1).padStart(2, "0")}</i><span>{assessment.name}</span><b className={charts[index] ? styles.done : ""}>{charts[index] ? "COMPLETED" : "NOT STARTED"}</b></div>)}</div>
          <Link href={charts.length ? "/career/profile" : "/career/interest"}>{charts.length ? "종합 프로필 보기" : "첫 검사 시작"}<ArrowRight /></Link>
        </article>
        {isGuest && <div className={styles.loginOverlay}><LockKeyhole /><small>PRIVATE CAREER DATA</small><h2>로그인하면 내 결과를<br />계속 확인할 수 있어요.</h2><p>완료한 검사 기록과 실제 레이더 그래프는 로그인 후 표시됩니다.</p><Link href="/entry">로그인하기 <ArrowRight /></Link></div>}
      </section>
      <section className={styles.primaryGrid}><article className={styles.assessmentPanel}><PanelHead label="AVAILABLE ASSESSMENTS" title="이용 가능한 검사" meta="03" /><div className={styles.assessmentList}>{assessments.map((assessment) => { const Icon = assessment.icon; return <Link key={assessment.id} href={assessment.href}><i>{assessment.id}</i><Icon /><div><small>{assessment.method}</small><b>{assessment.name}</b><span>{assessment.description}</span></div><em>{assessment.meta}</em><ArrowRight /></Link>; })}</div></article><article className={styles.profilePanel}><div className={styles.panelHead}><div><small>CAREER PROFILE</small><h2>종합 커리어 프로필</h2></div><CheckCircle2 /></div><p>완료한 검사 결과를 비교하고, 실제 경험과 지원 공고를 검토할 질문으로 연결합니다.</p><ul><li>응답 축별 레이더 그래프</li><li>완료 기록과 결과 비교</li><li>지원서 경험 검토 기준</li></ul><Link href={isGuest ? "/entry" : "/career/profile"}>{isGuest ? "로그인 후 프로필 보기" : "프로필 열기"}<ArrowRight /></Link></article></section>
      <section className={styles.bottomGrid}><article><small>APPLICATION CONNECTION</small><h2>검사 결과는 경험을 고르는 단서입니다.</h2><p>점수로 적합성이나 채용 결과를 판단하지 않습니다. 내가 실제로 했던 업무와 지원 공고 조건을 비교하는 데 사용합니다.</p><Link href="/onboarding">지원서 분석으로 이동 <ArrowRight /></Link></article><article><small>INTERPRETATION BOUNDARY</small><h2>결과 해석 기준</h2><p>개인의 능력, 직업 적합성, 채용 결과를 판단하거나 예측하는 지표가 아닙니다.</p></article></section>
    </section>
  </main>;
}

function PanelHead({ label, title, meta }: { label: string; title: string; meta: string }) { return <div className={styles.panelHead}><div><small>{label}</small><h2>{title}</h2></div><span>{meta}</span></div>; }

function RadarPlaceholder() { return <div className={styles.radarPlaceholder}><i /><i /><i /><i /><i /><b>RESULT<br />AREA</b></div>; }

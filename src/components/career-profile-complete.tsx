"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ArrowRight, BriefcaseBusiness, FileText, LockKeyhole, Sparkles } from "lucide-react";
import { getCareerProfileHeadline, scoreWorkStyle, type WorkStyleAnswer } from "@/domain/career-assessment";
import { getInterestHeadline, scoreCareerInterest, type InterestAnswer } from "@/domain/career-interest";
import { scoreWorkValues, type WorkValueAnswer } from "@/domain/career-work-values";
import styles from "./work-style-assessment.module.css";

const subscribe = () => () => undefined;
const workStyleKey = "mooa-work-style-answers-v1";
const interestKey = "mooa-career-interest-answers-v1";
const valuesKey = "mooa-career-work-values-v1";

function parse<T, TResult>(raw: string | null, score: (answers: T) => TResult): TResult | null {
  if (!raw) return null;
  try { return score(JSON.parse(raw) as T); } catch { return null; }
}

export function CareerProfileComplete() {
  const workStyleRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(workStyleKey), () => null);
  const interestRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(interestKey), () => null);
  const valuesRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(valuesKey), () => null);
  const workStyle = useMemo(() => parse<Record<string, WorkStyleAnswer>, ReturnType<typeof scoreWorkStyle>>(workStyleRaw, scoreWorkStyle), [workStyleRaw]);
  const interest = useMemo(() => parse<Record<string, InterestAnswer>, ReturnType<typeof scoreCareerInterest>>(interestRaw, scoreCareerInterest), [interestRaw]);
  const values = useMemo(() => parse<Record<string, WorkValueAnswer>, ReturnType<typeof scoreWorkValues>>(valuesRaw, scoreWorkValues), [valuesRaw]);
  const completed = [workStyle, interest, values].filter(Boolean).length;
  const topValues = values ? [...values].sort((a, b) => b.score - a.score).slice(0, 2) : [];

  return <main className={styles.result}>
    <div className={styles.resultHero}><span><Sparkles />MOOA CAREER PROFILE</span><h1>나의 커리어 탐색 요약</h1><p>{completed === 3 ? "세 가지 관점을 함께 보며, 다음 지원에서 확인할 기준을 정리했어요." : `현재 ${completed} / 3개 탐색 결과가 있어요.`}</p><small>이 프로필은 자기이해와 직무 탐색을 위한 자료입니다. 직업 적합성·채용 결과·능력을 판정하지 않습니다.</small></div>
    <section className={styles.scoreGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
      <article><div><span>업무성향</span><b>{workStyle ? "완료" : "미완료"}</b></div><strong>{workStyle ? "01" : "—"}</strong><p>{workStyle ? getCareerProfileHeadline(workStyle) : "일할 때의 선호 방식과 업무환경 단서를 확인합니다."}</p><Link href={workStyle ? "/career/work-style/result" : "/career/work-style"}>{workStyle ? "결과 보기" : "시작하기"} <ArrowRight /></Link></article>
      <article><div><span>직업흥미</span><b>{interest ? "완료" : "미완료"}</b></div><strong>{interest ? "02" : "—"}</strong><p>{interest ? getInterestHeadline(interest) : "어떤 활동과 문제 해결 방식에 끌리는지 탐색합니다."}</p><Link href={interest ? "/career/interest/result" : "/career/interest"}>{interest ? "결과 보기" : "시작하기"} <ArrowRight /></Link></article>
      <article><div><span>직업가치</span><b>{values ? "완료" : "미완료"}</b></div><strong>{values ? "03" : "—"}</strong><p>{values ? `중요한 조건: ${topValues.map((value) => value.label).join(" · ")}` : "일에서 포기하기 어려운 근무 조건을 정리합니다."}</p><Link href="/career/values">{values ? "다시 보기" : "시작하기"} <ArrowRight /></Link></article>
    </section>
    {completed > 0 && <section className={styles.useCard}><div><span className={styles.sectionKicker}>NEXT STEP</span><h2>결과를 지원서의<br />실제 경험과 연결하세요.</h2><p>검사 결과는 답을 대신하지 않습니다. 지금까지 했던 경험 중 어떤 환경에서 동기가 생겼는지, 어떤 문제를 해결하고 싶었는지 확인하는 질문으로 사용하세요.</p><ul><li><b>업무환경</b><span>내가 몰입하기 쉬운 협업 방식·자율성·구조는 무엇인가요?</span></li><li><b>직무 활동</b><span>흥미가 높은 활동을 실제로 해 본 경험과 배운 점은 무엇인가요?</span></li><li><b>지원 기준</b><span>지원할 공고에서 반드시 확인할 근무 조건과 역할은 무엇인가요?</span></li></ul></div><div className={styles.actionStack}><Link href="/onboarding"><FileText />이 결과로 자소서 분석하기 <ArrowRight /></Link><Link href="/career/login?next=/career/profile"><LockKeyhole />로그인하고 결과 저장 준비 <ArrowRight /></Link></div></section>}
    <section className={styles.disclaimer}><BriefcaseBusiness /><p><b>저장과 AI 해설은 다음 단계입니다.</b> 현재 결과는 이 브라우저에만 임시 보관됩니다. 로그인 저장은 데이터베이스 적용 뒤 제공하며, AI 해설은 사용자가 이력서·자소서·지원공고를 선택하고 직접 실행할 때만 요청됩니다.</p></section>
  </main>;
}

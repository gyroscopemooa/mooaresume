"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar as RadarGraph, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { scoreWorkValues, type WorkValueAnswer } from "@/domain/career-work-values";
import { CareerAssessmentStorageNotice } from "./career-assessment-storage-notice";
import styles from "./work-style-assessment.module.css";

const storageKey = "mooa-career-work-values-v1";

export function CareerValuesResult() {
  const router = useRouter();
  const raw = useSyncExternalStore(() => () => undefined, () => window.sessionStorage.getItem(storageKey), () => null);
  const scores = useMemo(() => { try { return raw ? scoreWorkValues(JSON.parse(raw) as Record<string, WorkValueAnswer>) : null; } catch { return null; } }, [raw]);
  if (!scores) return <section className={styles.empty}><Info /><h1>확인할 탐색 결과가 없어요.</h1><p>현재 브라우저에서 직업가치 탐색을 완료해 주세요.</p><Link href="/career/values">직업가치 탐색 시작하기 <ArrowRight /></Link><Link href="/career/saved">저장된 결과 확인하기 <ArrowRight /></Link></section>;
  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
  const data = scores.map((score) => ({ subject: score.label, score: score.score, fullMark: 100 }));
  return <main className={styles.result}>
    <div className={styles.resultHero}><span><CheckCircle2 />탐색 완료</span><h1>나의 직업가치 우선순위</h1><p>가장 포기하기 어려운 일의 조건을 확인했어요.</p><small>점수는 이 베타 문항에 대한 중요도 응답을 환산한 값이며, 직업 적합성·능력·채용 결과를 판정하지 않습니다.</small></div>
    <CareerAssessmentStorageNotice assessmentCode="work_values" assessmentVersion="mooa-work-values-exploration-kr-beta-v1" answersRaw={raw} resultPath="/career/values/result" />
    <section className={styles.chartCard}><div><span className={styles.sectionKicker}>WORK VALUES EXPLORATION</span><h2>일에서 중요하게 보는 기준</h2><p>여섯 기준을 비교해, 지원할 조직과 역할에서 무엇을 확인할지 정리하는 출발점으로 사용하세요.</p></div><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="72%"><PolarGrid stroke="#d7e1da"/><PolarAngleAxis dataKey="subject" tick={{ fill: "#53655b", fontSize: 10 }}/><RadarGraph dataKey="score" stroke="#176b4a" fill="#43a574" fillOpacity={.32}/><Tooltip formatter={(value) => [`${value} / 100`, "중요도 응답 환산"]}/></RadarChart></ResponsiveContainer></div></section>
    <section className={styles.scoreGrid}>{scores.map((score) => <article key={score.id}><div><span>{score.label}</span><b>{score.score >= 67 ? "높음" : score.score >= 34 ? "보통" : "낮음"}</b></div><strong>{score.score}<small>/100</small></strong><div className={styles.scoreLine}><i style={{ width: `${score.score}%` }} /></div><p>{score.score >= 67 ? "지원할 환경에서 이 기준을 구체적으로 확인해 보세요." : "다른 기준과 함께 균형 있게 살펴보세요."}</p></article>)}</section>
    <section className={styles.useCard}><div><span className={styles.sectionKicker}>NEXT EXPLORATION</span><h2>중요한 조건을<br />지원 기준으로 바꾸세요.</h2><p>상위 기준을 단서로 공고, 조직 문화, 실제 경험에서 확인할 질문을 정리해 보세요.</p><ul>{top.map((score) => <li key={score.id}><b>{score.label}</b><span>이 기준이 실제 업무와 조직 환경에서 충족되는지 확인해 보세요.</span></li>)}</ul></div><div className={styles.actionStack}><Link href="/career/profile">종합 커리어 프로필 보기 <ArrowRight /></Link><button type="button" onClick={() => { window.sessionStorage.removeItem(storageKey); router.push("/career/values"); }}><RotateCcw />다시 탐색하기</button></div></section>
    <Link className={styles.deepInterpretation} href="/career/ai?scope=work_values">심층해설 확인하기 <ArrowRight /></Link>
    <section className={styles.disclaimer}><ShieldCheck /><p><b>모델과 범위</b> 직업가치 여섯 영역을 참고한 무아 자체 탐색 문항입니다. 표준화 검사나 채용 판정이 아니며, 결과는 현재 브라우저에서 무료로 확인할 수 있습니다.</p></section>
  </main>;
}
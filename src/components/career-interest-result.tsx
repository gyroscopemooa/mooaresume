"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip } from "recharts";
import { getInterestHeadline, scoreCareerInterest, type InterestAnswer, type InterestScore } from "@/domain/career-interest";
import styles from "./work-style-assessment.module.css";

const storageKey = "mooa-career-interest-answers-v1";

export function CareerInterestResult() {
  const router = useRouter();
  const raw = useSyncExternalStore(() => () => undefined, () => window.sessionStorage.getItem(storageKey), () => null);
  const scores = useMemo<InterestScore[] | null>(() => { if (!raw) return null; try { return scoreCareerInterest(JSON.parse(raw) as Record<string, InterestAnswer>); } catch { return null; } }, [raw]);
  if (!scores) return <section className={styles.empty}><Info /><h1>확인할 탐색 결과가 없어요.</h1><p>현재 브라우저에서 직업흥미 탐색을 완료해 주세요.</p><Link href="/career/interest">직업흥미 탐색 시작하기 <ArrowRight /></Link></section>;
  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
  const data = scores.map((score) => ({ subject: `${score.code} · ${score.label}`, score: score.score, fullMark: 100 }));
  return <main className={styles.result}><div className={styles.resultHero}><span><CheckCircle2 />탐색 완료</span><h1>나의 직업흥미 지도</h1><p>{getInterestHeadline(scores)}</p><small>점수는 이 베타 문항에 대한 흥미 응답을 환산한 값이며, 직업 적합성·능력·채용 결과를 판정하지 않습니다.</small></div><section className={styles.chartCard}><div><span className={styles.sectionKicker}>RIASEC EXPLORATION</span><h2>활동 흥미를 한눈에</h2><p>여섯 영역의 활동 선호를 비교해, 직무를 탐색하거나 실제 경험을 되돌아볼 출발점으로 사용하세요.</p></div><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="72%"><PolarGrid stroke="#d7e1da"/><PolarAngleAxis dataKey="subject" tick={{ fill: "#53655b", fontSize: 10 }}/><Radar dataKey="score" stroke="#176b4a" fill="#43a574" fillOpacity={0.32}/><Tooltip formatter={(value) => [`${value} / 100`, "흥미 응답 환산"]}/></RadarChart></ResponsiveContainer></div></section><section className={styles.scoreGrid}>{scores.map((score) => <article key={score.dimension}><div><span>{score.code} · {score.label}</span><b>{score.level}</b></div><strong>{score.score}<small>/100</small></strong><div className={styles.scoreLine}><i style={{ width: `${score.score}%` }} /></div><p>{score.subtitle}</p></article>)}</section><section className={styles.useCard}><div><span className={styles.sectionKicker}>NEXT EXPLORATION</span><h2>상위 흥미는<br />직무 정답이 아닙니다.</h2><p>상위 영역을 단서로 공고의 업무, 내가 해 본 경험, 원하는 업무환경을 함께 비교해 보세요.</p><ul>{top.map((score) => <li key={score.dimension}><b>{score.label}({score.code})</b><span>{score.description}</span></li>)}</ul></div><div className={styles.actionStack}><Link href="/career/profile">종합 커리어 프로필 보기 <ArrowRight /></Link><button type="button" onClick={() => { window.sessionStorage.removeItem(storageKey); router.push("/career/interest"); }}><RotateCcw />다시 탐색하기</button></div></section><section className={styles.disclaimer}><ShieldCheck /><p><b>모델과 범위</b> RIASEC/Holland의 여섯 활동 영역을 참고한 무아 자체 탐색 문항입니다. O*NET Interest Profiler 원문을 복제·번역한 검사가 아니며, 한국어 표준화·타당화 전의 베타 도구입니다.</p></section></main>;
}

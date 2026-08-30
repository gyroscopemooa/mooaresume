"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowRight, CheckCircle2, FileText, Info, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { getCareerProfileHeadline, scoreWorkStyle, type WorkStyleAnswer, type WorkStyleScore } from "@/domain/career-assessment";
import { interpretWorkStyle } from "@/domain/career-interpretation";
import styles from "./work-style-assessment.module.css";

const storageKey = "mooa-work-style-answers-v1";

export function WorkStyleResult() {
  const router = useRouter();
  const serializedAnswers = useSyncExternalStore(() => () => undefined, () => window.sessionStorage.getItem(storageKey), () => null);
  const scores = useMemo<WorkStyleScore[] | null>(() => {
    if (!serializedAnswers) return null;
    try { return scoreWorkStyle(JSON.parse(serializedAnswers) as Record<string, WorkStyleAnswer>); } catch { return null; }
  }, [serializedAnswers]);
  const topScores = useMemo(() => scores ? [...scores].sort((a, b) => b.score - a.score).slice(0, 3) : [], [scores]);
  if (!scores) return <section className={styles.empty}><Info /><h1>확인할 검사 결과가 없어요.</h1><p>결과는 안전을 위해 현재 브라우저 세션에서만 보여드려요.</p><Link href="/career/work-style">업무성향 분석 시작하기 <ArrowRight /></Link></section>;
  const interpretation = interpretWorkStyle(scores);
  const chartData = scores.map((score) => ({ subject: score.label, score: score.score, fullMark: 100 }));

  return <main className={styles.result}>
    <div className={styles.resultHero}><span><CheckCircle2 />분석 완료</span><h1>나의 업무성향 프로필</h1><p>{getCareerProfileHeadline(scores)}</p><small>이 결과는 응답에 따른 자기이해 자료이며, 능력·적합성·채용 결과를 판정하지 않습니다.</small></div>
    <section className={styles.chartCard}><div><span className={styles.sectionKicker}>5 DIMENSIONS</span><h2>한눈에 보는 응답 경향</h2><p>각 특성은 10문항 응답을 역채점 포함해 0–100으로 환산했습니다. 한국어 규준이 없는 초기 버전이라 퍼센타일은 표시하지 않습니다.</p></div><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><RadarChart data={chartData} outerRadius="72%"><PolarGrid stroke="#d7e1da"/><PolarAngleAxis dataKey="subject" tick={{ fill: "#53655b", fontSize: 11 }}/><Radar dataKey="score" stroke="#176b4a" fill="#43a574" fillOpacity={0.32}/><Tooltip formatter={(value) => [`${value} / 100`, "환산 점수"]}/></RadarChart></ResponsiveContainer></div></section>
    <section className={styles.scoreGrid}>{scores.map((score) => <article key={score.dimension}><div><span>{score.label}</span><b>{score.level}</b></div><strong>{score.score}<small>/100</small></strong><div className={styles.scoreLine}><i style={{ width: `${score.score}%` }} /></div><p>{score.summary}</p></article>)}</section>
    <section className={styles.chartCard}><div><span className={styles.sectionKicker}>CAREER INTERPRETATION</span><h2>그래서, 어떤 방식으로 일할 수 있을까요?</h2><p>{interpretation.conclusion}</p></div><div>{interpretation.workEnvironmentHints.map((hint) => <p key={hint.title} style={{ margin: "0 0 13px", color: "#607067", fontSize: 11, lineHeight: 1.7 }}><b>{hint.title}</b><br />{hint.description}<br /><small>{hint.evidence.join(" · ")}</small></p>)}</div></section>
    <section className={styles.useCard}><div><span className={styles.sectionKicker}>USE IT FOR YOUR APPLICATION</span><h2>자기소개서에는<br />실제 경험만 연결하세요.</h2><p>검사 결과가 성과나 역량을 대신 증명하지는 않습니다. 아래 단서를 참고해, 실제로 확인할 수 있는 경험을 고르는 데 활용해 보세요.</p><ul>{topScores.map((score) => <li key={score.dimension}><b>{score.label} · {score.level}</b><span>{score.careerPrompt}</span></li>)}</ul></div><div className={styles.actionStack}><Link href="/career/ai?scope=work_style"><Sparkles />AI 심층 해설 보기 <ArrowRight /></Link><Link href="/onboarding"><FileText />내 자기소개서 분석하기 <ArrowRight /></Link><button type="button" onClick={() => { window.sessionStorage.removeItem(storageKey); router.push("/career/work-style"); }}><RotateCcw />다시 검사하기</button></div></section>
    <section className={styles.disclaimer}><ShieldCheck /><p><b>평가 출처와 해석 범위</b> IPIP 50문항 Big-Five factor markers의 한국어 번안을 사용합니다. 문항·척도는 공개 영역이지만, 무아레쥬메의 결과 문구는 커리어 자기이해를 위한 안내이며 임상·의료·정신건강 진단 또는 표준화된 직업적성 판정이 아닙니다.</p></section>
  </main>;
}

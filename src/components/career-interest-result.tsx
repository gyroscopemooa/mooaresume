"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Cloud, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip } from "recharts";
import { INTEREST_DIMENSIONS, getInterestProfile, scoreCareerInterest, type InterestAnswer, type InterestScore } from "@/domain/career-interest";
import { CareerAssessmentStorageNotice } from "./career-assessment-storage-notice";
import styles from "./work-style-assessment.module.css";

const storageKey = "mooa-career-interest-answers-v1";
type StoredAssessment = { sessionId: string; assessmentCode: "interest"; completedAt: string; scores: { code: string; score: number }[] };

function restoreInterestScores(saved: StoredAssessment | null): InterestScore[] | null {
  if (!saved || saved.scores.length !== INTEREST_DIMENSIONS.length) return null;
  const scores = INTEREST_DIMENSIONS.map((dimension) => {
    const stored = saved.scores.find((score) => score.code === dimension.id);
    if (!stored || !Number.isFinite(stored.score)) return null;
    const score = Math.round(stored.score);
    return { ...dimension, dimension: dimension.id, score, level: score >= 67 ? "높음" as const : score <= 33 ? "낮음" as const : "보통" as const };
  });
  return scores.some((score) => score === null) ? null : scores as InterestScore[];
}

export function CareerInterestResult() {
  const router = useRouter();
  const raw = useSyncExternalStore(() => () => undefined, () => window.sessionStorage.getItem(storageKey), () => null);
  const localScores = useMemo<InterestScore[] | null>(() => { if (!raw) return null; try { return scoreCareerInterest(JSON.parse(raw) as Record<string, InterestAnswer>); } catch { return null; } }, [raw]);
  const [saved, setSaved] = useState<StoredAssessment | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(!localScores);

  useEffect(() => {
    if (localScores) return;
    let active = true;
    void fetch("/api/career-assessments/latest?assessmentCode=interest", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json() as { assessments?: StoredAssessment[] };
        return body.assessments?.[0] ?? null;
      })
      .then((item) => { if (active) setSaved(item); })
      .catch(() => { if (active) setSaved(null); })
      .finally(() => { if (active) setLoadingSaved(false); });
    return () => { active = false; };
  }, [localScores]);

  const savedScores = useMemo(() => restoreInterestScores(saved), [saved]);
  const scores = localScores ?? savedScores;
  if (!scores && loadingSaved) return <section className={styles.empty}><Cloud /><h1>저장된 결과를 확인하고 있어요.</h1><p>이 브라우저의 임시 기록이 없으면 내 계정에 보관한 가장 최근 결과를 불러옵니다.</p></section>;
  if (!scores) return <section className={styles.empty}><Info /><h1>확인할 탐색 결과가 없어요.</h1><p>이 브라우저의 임시 결과 또는 내 계정에 저장한 결과가 아직 없습니다.</p><Link href="/career/interest">직업흥미 탐색 시작하기 <ArrowRight /></Link><Link href="/career/saved">저장된 결과 확인하기 <ArrowRight /></Link></section>;

  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
  const profile = getInterestProfile(scores);
  const data = scores.map((score) => ({ subject: `${score.code} · ${score.label}`, score: score.score, fullMark: 100 }));
  const isSavedResult = !localScores && Boolean(savedScores);
  const savedDate = saved?.completedAt ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(saved.completedAt)) : null;

  return <main className={styles.result}>
    <div className={styles.resultHero}><span><CheckCircle2 />{isSavedResult ? "저장 기록 불러옴" : "탐색 완료"}</span><h1>{profile.code} · {profile.typeName}</h1><p>{profile.headline}</p><small>상위 3개 RIASEC 영역을 순서대로 적은 탐색 코드입니다. {isSavedResult ? `${savedDate ? `${savedDate}에 ` : ""}계정에 저장한 결과입니다.` : "직업 적합성·능력·채용 결과를 판정하지 않습니다."}</small></div>
    <CareerAssessmentStorageNotice assessmentCode="interest" assessmentVersion="mooa-riasec-exploration-kr-beta-v1" answersRaw={raw} resultPath="/career/interest/result" restored={isSavedResult} />
    <section className={styles.chartCard}><div><span className={styles.sectionKicker}>RIASEC 6 AREAS · MOOA BETA</span><h2>RIASEC 6영역을 참고한<br />활동 흥미</h2><p>현실형·탐구형·예술형·사회형·진취형·관습형의 활동 선호를 무아 자체 베타 문항으로 살펴봅니다. 공식 O*NET 원문 검사는 아닙니다.</p></div><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="72%"><PolarGrid stroke="#d7e1da"/><PolarAngleAxis dataKey="subject" tick={{ fill: "#53655b", fontSize: 10 }}/><Radar dataKey="score" stroke="#176b4a" fill="#43a574" fillOpacity={0.32}/><Tooltip formatter={(value) => [`${value} / 100`, "흥미 응답 환산"]}/></RadarChart></ResponsiveContainer></div></section>
    <section className={styles.scoreGrid}>{scores.map((score) => <article key={score.dimension}><div><span>{score.code} · {score.label}</span><b>{score.level}</b></div><strong>{score.score}<small>/100</small></strong><div className={styles.scoreLine}><i style={{ width: `${score.score}%` }} /></div><p>{score.subtitle}</p></article>)}</section>
    <section className={styles.useCard}><div><span className={styles.sectionKicker}>NEXT EXPLORATION</span><h2>상위 흥미는<br />직무 정답이 아닙니다.</h2><p>상위 영역을 단서로 공고의 업무, 내가 해 본 경험, 원하는 업무환경을 함께 비교해 보세요.</p><ul>{top.map((score) => <li key={score.dimension}><b>{score.label}({score.code})</b><span>{score.description}</span></li>)}</ul></div><div className={styles.actionStack}><Link href="/career/profile">종합 커리어 프로필 보기 <ArrowRight /></Link><button type="button" onClick={() => { window.sessionStorage.removeItem(storageKey); router.push("/career/interest"); }}><RotateCcw />다시 탐색하기</button></div></section>
    <Link className={styles.deepInterpretation} href="/career/ai?scope=interest">심층해설 확인하기 <ArrowRight /></Link>
    <section className={styles.disclaimer}><ShieldCheck /><p><b>모델과 범위</b> RIASEC/Holland의 여섯 활동 영역을 참고한 무아 자체 탐색 문항입니다. O*NET Interest Profiler 원문을 복제·번역한 검사가 아니며, 한국어 표준화·타당화 전의 베타 도구입니다.</p></section>
  </main>;
}
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { type WorkStyleAnswer, workStyleItems } from "@/domain/career-assessment";
import styles from "./work-style-assessment.module.css";

const ANSWERS: { value: WorkStyleAnswer; label: string }[] = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "그렇지 않은 편이다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그런 편이다" },
  { value: 5, label: "매우 그렇다" },
];

export function WorkStyleAssessment() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, WorkStyleAnswer>>({});
  const item = workStyleItems[index];
  const progress = Math.round((Object.keys(answers).length / workStyleItems.length) * 100);
  const isLast = index === workStyleItems.length - 1;
  const answer = answers[item.id];
  const nextLabel = isLast ? "결과 확인하기" : "다음 문항";
  const completed = Object.keys(answers).length === workStyleItems.length;

  const encouragement = useMemo(() => {
    if (progress < 30) return "첫인상보다 평소의 모습을 떠올려 답해보세요.";
    if (progress < 70) return "잘하고 있어요. 정답은 없으니 편하게 답해보세요.";
    return "거의 끝났어요. 현재의 나를 기준으로 답해보세요.";
  }, [progress]);

  function choose(value: WorkStyleAnswer) {
    setAnswers((current) => ({ ...current, [item.id]: value }));
  }

  function goNext() {
    if (!answer) return;
    if (isLast) {
      window.sessionStorage.setItem("mooa-work-style-answers-v1", JSON.stringify(answers));
      router.push("/career/work-style/result");
      return;
    }
    setIndex((current) => current + 1);
  }

  if (!started) {
    return <section className={styles.intro}>
      <div className={styles.introBadge}>FREE CAREER ASSESSMENT</div>
      <h1>나에게 맞는 업무방식을<br /><em>먼저 알아보세요.</em></h1>
      <p>이 검사는 어떻게 일하는가를 살펴봅니다. 성격 5요인에 대한 응답을 바탕으로 업무방식과 강점에 관한 단서를 정리합니다. 결과는 진단이나 채용 판정이 아니라, 자기이해와 취업 준비를 돕기 위한 자료예요.</p>
      <div className={styles.introMeta}><span><Clock3 />약 7분</span><span>50문항</span><span>무료</span></div>
      <button className={styles.startButton} type="button" onClick={() => setStarted(true)}>업무성향 분석 시작하기 <ArrowRight /></button>
      <div className={styles.introNotes}>
        <span><ShieldCheck />결과는 이 브라우저 세션에서만 임시로 보관돼요.</span>
        <span><LockKeyhole />의료·정신건강 진단을 제공하지 않아요.</span>
      </div>
      <div className={styles.method}><b>어떤 평가인가요?</b><p>IPIP의 공개 문항을 토대로 한 50문항 성격 5요인 평가입니다. 결과는 한국어 규준 퍼센타일이 아닌 0–100 환산 점수와 응답 경향으로 제공합니다.</p></div>
    </section>;
  }

  return <section className={styles.test}>
    <div className={styles.progressHead}><button type="button" aria-label="이전 문항" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}><ArrowLeft /></button><div><div className={styles.progressLabel}><span>{index + 1} / {workStyleItems.length}</span><span>{progress}% 완료</span></div><div className={styles.progress}><i style={{ width: `${progress}%` }} /></div></div></div>
    <p className={styles.guidance}>{encouragement}</p>
    <fieldset className={styles.question}>
      <legend>{item.text}</legend>
      <p>평소의 나를 가장 잘 나타내는 정도를 선택해 주세요.</p>
      <div className={styles.answerList}>{ANSWERS.map(({ value, label }) => <label className={answer === value ? styles.selected : ""} key={value}><input type="radio" name={item.id} value={value} checked={answer === value} onChange={() => choose(value)} /><span className={styles.answerNumber}>{value}</span><span>{label}</span><Check /></label>)}</div>
    </fieldset>
    <div className={styles.testFooter}><span>{completed ? "모든 문항에 답했어요." : "답변은 언제든 이전 문항에서 바꿀 수 있어요."}</span><button type="button" onClick={goNext} disabled={!answer}>{nextLabel} <ChevronRight /></button></div>
  </section>;
}

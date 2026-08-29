"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock3, ShieldCheck } from "lucide-react";
import { INTEREST_ITEMS, type InterestAnswer } from "@/domain/career-interest";
import styles from "./work-style-assessment.module.css";

const storageKey = "mooa-career-interest-answers-v1";
const options: { value: InterestAnswer; label: string }[] = [{ value: 1, label: "전혀 흥미 없음" }, { value: 2, label: "흥미 적음" }, { value: 3, label: "보통" }, { value: 4, label: "흥미 있음" }, { value: 5, label: "매우 흥미 있음" }];

export function CareerInterestAssessment() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, InterestAnswer>>({});
  const item = INTEREST_ITEMS[index];
  const answer = answers[item?.id];
  const complete = Object.keys(answers).length === INTEREST_ITEMS.length;
  const finish = () => { window.sessionStorage.setItem(storageKey, JSON.stringify(answers)); router.push("/career/interest/result"); };

  if (!started) return <main className={styles.intro}><span className={styles.introBadge}>MOOA CAREER INTEREST · BETA</span><h1>어떤 활동에<br /><em>에너지가 생기나요?</em></h1><p>RIASEC(Holland) 직업흥미 모델의 여섯 활동 영역을 참고해 만든 무아 자체 문항입니다. 이 검사는 무엇을 해 보고 싶은가를 살펴봅니다. 좋아하는 활동의 방향을 탐색하는 베타 도구이며, 표준화 검사·직업 추천·채용 판정이 아닙니다.</p><div className={styles.introMeta}><span><Clock3 />약 5분</span><span>30문항</span><span>무료 베타</span></div><button type="button" className={styles.startButton} onClick={() => setStarted(true)}>탐색 시작하기 <ArrowRight /></button><div className={styles.introNotes}><span><ShieldCheck />응답은 현재 브라우저에만 임시 저장</span></div><section className={styles.method}><b>무엇을 알 수 있나요?</b><p>현실형(R)·탐구형(I)·예술형(A)·사회형(S)·진취형(E)·관습형(C) 활동 중 어떤 활동에 상대적으로 흥미가 높은지 확인하고, 직무·경험을 탐색할 단서를 얻습니다.</p></section></main>;
  return <main className={styles.test}><div className={styles.progressHead}><button type="button" disabled={index === 0} onClick={() => setIndex((current) => current - 1)} aria-label="이전 문항"><ArrowLeft /></button><div><div className={styles.progressLabel}><span>직업흥미 탐색</span><span>{index + 1} / {INTEREST_ITEMS.length}</span></div><div className={styles.progress}><i style={{ width: `${((index + 1) / INTEREST_ITEMS.length) * 100}%` }} /></div></div></div><p className={styles.guidance}>“잘할 수 있는가”가 아니라, 이 활동을 해 보고 싶은 마음을 기준으로 답해 주세요.</p><fieldset className={styles.question}><legend>{item.text}</legend><p>나에게 이 활동은 얼마나 흥미로운가요?</p><div className={styles.answerList}>{options.map((option) => <label key={option.value} className={answer === option.value ? styles.selected : ""}><input type="radio" name={item.id} checked={answer === option.value} onChange={() => setAnswers((current) => ({ ...current, [item.id]: option.value }))} /><span className={styles.answerNumber}>{option.value}</span><span>{option.label}</span><Check /></label>)}</div></fieldset><div className={styles.testFooter}><span>{complete ? "모든 응답이 완료됐어요." : "건너뛴 문항은 결과를 볼 수 없어요."}</span>{index === INTEREST_ITEMS.length - 1 ? <button type="button" disabled={!complete} onClick={finish}>결과 보기 <ArrowRight /></button> : <button type="button" disabled={!answer} onClick={() => setIndex((current) => current + 1)}>다음 <ArrowRight /></button>}</div></main>;
}

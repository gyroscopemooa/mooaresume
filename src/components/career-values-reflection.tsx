"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock3 } from "lucide-react";
import { WORK_VALUE_ITEMS, type WorkValueAnswer } from "@/domain/career-work-values";
import styles from "./work-style-assessment.module.css";

const storageKey = "mooa-career-work-values-v1";
const options: { value: WorkValueAnswer; label: string }[] = [{ value: 1, label: "전혀 중요하지 않음" }, { value: 2, label: "중요하지 않은 편" }, { value: 3, label: "보통" }, { value: 4, label: "중요한 편" }, { value: 5, label: "매우 중요함" }];

export function CareerValuesReflection() {
  const router = useRouter();
  const savedRaw = useSyncExternalStore(() => () => undefined, () => window.sessionStorage.getItem(storageKey), () => null);
  const hasCompletedResult = useMemo(() => { try { return Object.keys(JSON.parse(savedRaw ?? "{}") as Record<string, unknown>).length === WORK_VALUE_ITEMS.length; } catch { return false; } }, [savedRaw]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, WorkValueAnswer>>({});
  const item = WORK_VALUE_ITEMS[index];
  const answer = answers[item?.id];
  const complete = Object.keys(answers).length === WORK_VALUE_ITEMS.length;

  if (!started) return <main className={styles.intro}><span className={styles.introBadge}>MOOA WORK VALUES · BETA</span><h1>일에서 무엇을<br /><em>포기하기 어려운가요?</em></h1><p>O*NET Work Importance Locator의 여섯 직업가치 틀을 참고한 무아 자체 문항입니다. 이 검사는 어떤 조건을 중요하게 보는가를 살펴봅니다. 직업가치를 탐색하는 베타 도구이며 표준화 검사나 채용 판정이 아닙니다.</p><div className={styles.introMeta}><span><Clock3 />약 4분</span><span>18문항</span></div>{hasCompletedResult ? <div className={styles.actionStack}><Link href="/career/values/result">이전 결과 다시 보기 <ArrowRight /></Link><button className={styles.startButton} type="button" onClick={() => { window.sessionStorage.removeItem(storageKey); setStarted(true); }}>새로 탐색하기 <ArrowRight /></button></div> : <button className={styles.startButton} type="button" onClick={() => setStarted(true)}>탐색 시작하기 <ArrowRight /></button>}</main>;
  return <main className={styles.test}><div className={styles.progressHead}><button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft /></button><div><div className={styles.progressLabel}><span>직업가치 탐색</span><span>{index + 1} / {WORK_VALUE_ITEMS.length}</span></div><div className={styles.progress}><i style={{ width: `${((index + 1) / WORK_VALUE_ITEMS.length) * 100}%` }} /></div></div></div><p className={styles.guidance}>나에게 실제로 중요한 근무 기준을 기준으로 답해 주세요.</p><fieldset className={styles.question}><legend>{item.text}</legend><p>이 기준은 나에게 얼마나 중요한가요?</p><div className={styles.answerList}>{options.map((option) => <label key={option.value} className={answer === option.value ? styles.selected : ""}><input type="radio" checked={answer === option.value} onChange={() => setAnswers({ ...answers, [item.id]: option.value })} /><span className={styles.answerNumber}>{option.value}</span><span>{option.label}</span><Check /></label>)}</div></fieldset><div className={styles.testFooter}>{index === WORK_VALUE_ITEMS.length - 1 ? <button disabled={!complete} onClick={() => { sessionStorage.setItem(storageKey, JSON.stringify(answers)); router.push("/career/values/result"); }}>결과 보기 <ArrowRight /></button> : <button disabled={!answer} onClick={() => setIndex(index + 1)}>다음 <ArrowRight /></button>}</div></main>;
}
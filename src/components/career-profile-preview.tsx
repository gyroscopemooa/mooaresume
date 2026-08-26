"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import styles from "./work-style-assessment.module.css";

const subscribe = () => () => undefined;
export function CareerProfilePreview() {
  const workStyle = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem("mooa-work-style-answers-v1"), () => null);
  const interest = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem("mooa-career-interest-answers-v1"), () => null);
  const values = useSyncExternalStore(subscribe, () => null, () => null);
  const completed = [workStyle, interest, values].filter(Boolean).length;
  return <main className={styles.intro}><span className={styles.introBadge}>MOOA CAREER PROFILE</span><h1>흩어진 답을<br /><em>한 장의 커리어 프로필로</em></h1><p>업무성향·직업흥미·직업가치와 실제 이력서·자기소개서를 나란히 보며 지원 방향을 정리하는 개인 프로필입니다.</p><section className={styles.method} style={{ marginTop: 28 }}><b>현재 브라우저의 검사 진행</b><p>{completed}개 항목의 응답이 이 브라우저에 있습니다. 로그인하면 향후 결과를 계정에 저장하고, 본인이 제공한 이력서·자소서에 한해 AI 해설을 요청할 수 있게 됩니다.</p></section><div className={styles.introMeta}><span><LockKeyhole />지금은 브라우저 임시 보관</span><span><UserRound />로그인 후 저장 예정</span></div><Link href="/entry" className={styles.startButton}>로그인하고 프로필 저장 준비하기 <ArrowRight /></Link><p style={{ marginTop: 18, fontSize: 11 }}>AI 해설은 자동으로 실행하지 않습니다. 로그인, 문서 선택, 명시적 실행 이후에만 API를 호출하도록 설계합니다.</p></main>;
}

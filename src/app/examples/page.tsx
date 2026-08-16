"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, MessageCircleQuestion } from "lucide-react";
import { productExamples } from "@/fixtures/product-examples";
import type { WritingMode } from "@/domain/writing-mode";
import styles from "./examples.module.css";

const modeLabels: Record<WritingMode | "PRO", string> = { CREATE: "처음부터 작성", BUILD: "내용 보완", POLISH: "최종 첨삭", PRO: "PRO 교차분석" };

export default function ExamplesPage() {
  const [selectedId, setSelectedId] = useState(productExamples[1].id);
  const example = productExamples.find((item) => item.id === selectedId) ?? productExamples[1];

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link><nav><Link href="/">서비스 소개</Link><Link href="/examples">첨삭 예시</Link><Link href="/analyze" className={styles.headerButton}>AI 첨삭 시작</Link></nav></header>
    <div className={styles.container}>
      <Link href="/" className={styles.back}><ArrowLeft/> 홈으로</Link>
      <section className={styles.hero}><span>직접 살펴보는 샘플 결과</span><h1>어디까지 작성했든,<br/>지금 필요한 도움부터 시작합니다.</h1><p>아래 내용은 제품을 설명하기 위한 가상 지원자의 고정 샘플입니다. 실제 사용자 분석 결과가 아닙니다.</p></section>
      <div className={styles.tabs} role="tablist" aria-label="첨삭 예시 유형">{productExamples.map((item)=><button key={item.id} role="tab" aria-selected={selectedId===item.id} onClick={()=>setSelectedId(item.id)}>{item.tier === "PRO" ? modeLabels.PRO : modeLabels[item.mode]}<small>{item.tier}</small></button>)}</div>
      <section className={styles.dashboard}>
        <div className={styles.summary}><div><span className={styles.sampleLabel}>가상 사례 · 샘플 결과</span><h2>{example.title}</h2><p>{example.context}</p></div>{example.readiness===null?<div className={styles.noScore}><CircleHelp/><b>아직 평가할 글이 없어요</b><span>경험 확인과 소재 선택을 먼저 진행합니다.</span></div>:<div className={styles.score}><small>지원서 준비도</small><strong>{example.readiness}<span>/100</span></strong><em>합격확률이 아닌 제출 준비 상태</em></div>}</div>
        <div className={styles.issueArea}><div className={styles.sectionTitle}><span>가장 먼저 확인하세요</span><h2>{example.issues.length === 1 ? "지금 필요한 첫 단계" : `핵심 개선 ${example.issues.length}가지`}</h2></div><div className={styles.issues}>{example.issues.map((issue,index)=><article key={issue.tag}><span>0{index+1}</span><div><h3>{issue.title}</h3><p>{issue.reason}</p><blockquote>“{issue.evidence}”</blockquote><div><Check/><b>다음 행동</b> {issue.nextAction}</div></div></article>)}</div></div>
      </section>
      <section className={styles.comparisonSection}><div className={styles.sectionTitle}><span>Before → After</span><h2>{example.mode === "CREATE" ? "사실 확인 후에만 작성을 시작해요." : "사실은 유지하고 전달력을 높여요."}</h2></div><div className={styles.comparison}><div><small>첨삭 전</small><p>{example.before || "작성된 내용 없음"}</p></div><ArrowRight/><div><small>첨삭 후</small><p>{example.after}</p></div></div><div className={styles.reason}><b>왜 이렇게 진행했나요?</b><p>{example.changeReason}</p></div></section>
      {example.verificationQuestions.length>0&&<section className={styles.questions}><CircleHelp/><div><span>AI가 임의로 채우지 않고 물어보는 내용</span><h2>정확한 개선을 위해 확인이 필요해요.</h2><ol>{example.verificationQuestions.map(question=><li key={question}>{question}</li>)}</ol></div></section>}
      {example.interviewQuestions.length>0&&<section className={styles.interview}><MessageCircleQuestion/><div><span>면접 연결 미리보기</span><h2>제출한 문장은 면접 질문으로 이어집니다.</h2>{example.interviewQuestions.map(question=><p key={question}>“{question}”</p>)}</div></section>}
      <section className={styles.cta}><div><span>내 지원서는 어느 단계일까요?</span><h2>작성한 만큼만 넣어도 괜찮아요.</h2></div><Link href="/start">내 작성 단계 확인하기 <ArrowRight/></Link></section>
    </div>
  </main>;
}

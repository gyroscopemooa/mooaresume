"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileCheck2, FilePenLine, Sparkles } from "lucide-react";
import type { WritingMode } from "@/domain/writing-mode";
import styles from "./entry.module.css";

const options=[
  {id:"CREATE" as const,icon:Sparkles,label:"처음부터 작성",title:"아직 아무것도 못 썼어요",description:"경험을 찾고 소재와 개요부터 함께 만들어요."},
  {id:"BUILD" as const,icon:FilePenLine,label:"내용 보완",title:"써보긴 했는데 내용이 부족해요",description:"부족한 행동과 결과를 확인해 초안을 발전시켜요."},
  {id:"POLISH" as const,icon:FileCheck2,label:"최종 첨삭",title:"거의 완성했고 제출 전 확인이 필요해요",description:"문장, 글자 수, 논리와 적합성을 최종 점검해요."},
];

export default function EntryPage(){
  const [mode,setMode]=useState<WritingMode|null>(null); const quickEnabled=mode!==null&&mode!=="CREATE"; const quickRecommended=mode==="POLISH"; const proRecommended=mode==="CREATE"||mode==="BUILD";
  return <main className={styles.page}><header><Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link><Link href="/examples">첨삭 예시</Link></header><div className={styles.container}><Link href="/" className={styles.back}><ArrowLeft/> 홈으로</Link><section className={styles.hero}><span>내 작성 단계 확인</span><h1>지금 어디까지 작성하셨나요?</h1><p>실제 자기소개서는 다음 화면에서 입력합니다. 여기서는 현재 상태만 골라주세요.</p></section><div className={styles.options}>{options.map(({id,icon:Icon,label,title,description})=><button key={id} className={mode===id?styles.selected:""} onClick={()=>setMode(id)}><span className={styles.radio}>{mode===id&&<Check/>}</span><Icon/><small>{label}</small><b>{title}</b><p>{description}</p></button>)}</div>{mode&&<section className={styles.products}><div className={styles.title}><span>이용 가능한 상품</span><h2>{mode==="CREATE"?"처음 작성은 PRO로 시작합니다.":"원하는 검토 범위를 선택하세요."}</h2></div><div className={styles.grid}>{quickEnabled?<Link href="/quick" className={quickRecommended?styles.recommended:""}>{quickRecommended&&<em>추천</em>}<small>QUICK · 4,900원</small><b>작성한 글을 빠르게 첨삭</b><p>자소서 입력·파일 업로드 후 문장, 논리, 글자 수와 최종 수정본을 확인해요.</p><span>QUICK 시작 <ArrowRight/></span></Link>:<div className={styles.disabled}><small>QUICK · 이용 불가</small><b>첨삭할 작성본이 필요해요</b><p>아직 작성된 글이 없으므로 QUICK에서는 진행할 수 없습니다.</p></div>}<Link href="/pro/create" className={proRecommended?styles.recommended:""}>{proRecommended&&<em>추천</em>}<small>PRO · 9,900원</small><b>{mode==="CREATE"?"무엇을 쓸지부터 함께 찾기":"공고와 지원자료 전체 분석"}</b><p>공고와 경험을 연결해 소재 선정부터 최종검수까지 진행해요.</p><span>PRO 시작 <ArrowRight/></span></Link></div></section>}</div></main>
}

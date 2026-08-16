"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { decideWritingMode, type WritingMode } from "@/domain/writing-mode";
import styles from "./start.module.css";

const labels: Record<WritingMode,string> = { CREATE:"처음부터 작성", BUILD:"내용 보완", POLISH:"최종 첨삭" };
const descriptions: Record<WritingMode,string> = { CREATE:"경험을 확인하고 소재 선정과 개요부터 시작해요.", BUILD:"부족한 행동과 결과를 질문해 초안을 발전시켜요.", POLISH:"원래 표현을 살리며 제출 전 오류와 적합성을 점검해요." };

export default function StartPage(){
  const [draft,setDraft]=useState(""); const [targetLength,setTargetLength]=useState(700); const [hasPosting,setHasPosting]=useState(true); const [override,setOverride]=useState<WritingMode|null>(null);
  const decision=useMemo(()=>decideWritingMode({draft,targetLength,hasJobPosting:hasPosting}),[draft,targetLength,hasPosting]);
  const mode=override??decision.mode;
  return <main className={styles.page}><div className={styles.container}><Link href="/" className={styles.back}><ArrowLeft/> 홈으로</Link><div className={styles.heading}><span>작성 단계 자동 확인</span><h1>작성한 만큼만 넣어도 괜찮아요.</h1><p>아직 작성하지 않았다면 빈칸으로 두세요. 현재 상태에 맞는 진행 방식을 추천합니다.</p></div><div className={styles.layout}><section className={styles.form}><label><span>채용공고가 있나요?</span><div className={styles.toggle}><button className={hasPosting?styles.active:""} onClick={()=>setHasPosting(true)}>있어요</button><button className={!hasPosting?styles.active:""} onClick={()=>setHasPosting(false)}>아직 없어요</button></div></label><label><span>목표 글자 수</span><input type="number" min="100" max="3000" value={targetLength} onChange={e=>setTargetLength(Number(e.target.value)||700)}/></label><label><span>현재 작성한 내용</span><textarea rows={13} value={draft} onChange={e=>{setDraft(e.target.value);setOverride(null)}} placeholder="작성한 글을 그대로 붙여넣으세요. 아직 없다면 비워두셔도 됩니다."/><small>공백 제외 {draft.replace(/\s/g,"").length}자 / 목표 {targetLength}자</small></label></section><aside className={styles.result}><span className={styles.badge}>추천 진행 방식</span><h2>{labels[mode]}</h2><p>{descriptions[mode]}</p><div className={styles.reason}><b>이렇게 판단했어요</b>{override?<span>사용자가 직접 진행 방식을 변경했습니다.</span>:decision.reasons.map(reason=><span key={reason}><Check/> {reason}</span>)}</div><details><summary>다른 방식으로 진행</summary><div>{(["CREATE","BUILD","POLISH"] as WritingMode[]).map(item=><button key={item} className={mode===item?styles.selected:""} onClick={()=>setOverride(item)}>{labels[item]}</button>)}</div>{override&&<button className={styles.reset} onClick={()=>setOverride(null)}><RotateCcw/> 자동 추천으로 돌아가기</button>}</details><Link href={`/examples?mode=${mode}`}>이 유형의 결과 예시 <ArrowRight/></Link></aside></div></div></main>
}

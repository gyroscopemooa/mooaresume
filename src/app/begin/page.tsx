"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileCheck2, FilePenLine, Sparkles } from "lucide-react";
import { decideWritingMode, type WritingMode } from "@/domain/writing-mode";
import { getProductEligibility } from "@/domain/product-tier";
import styles from "./begin.module.css";

const modes: Array<{id:WritingMode;icon:typeof Sparkles;title:string;question:string;description:string}>=[
  {id:"CREATE",icon:Sparkles,title:"처음부터 작성",question:"아직 아무것도 못 썼어요",description:"경험을 찾고 소재와 개요부터 함께 만들어요."},
  {id:"BUILD",icon:FilePenLine,title:"내용 보완",question:"써보긴 했는데 내용이 부족해요",description:"부족한 행동과 결과를 확인해 초안을 발전시켜요."},
  {id:"POLISH",icon:FileCheck2,title:"최종 첨삭",question:"거의 완성했고 제출 전 확인이 필요해요",description:"문장, 글자 수, 논리와 적합성을 최종 점검해요."},
];

export default function BeginPage(){
  const [selected,setSelected]=useState<WritingMode|null>(null); const [draft,setDraft]=useState(""); const [targetLength,setTargetLength]=useState(700);
  const automatic=useMemo(()=>decideWritingMode({draft,targetLength,hasJobPosting:true}),[draft,targetLength]);
  const mode=selected??(draft.trim()?automatic.mode:null); const eligibility=mode?getProductEligibility(mode,draft):null;
  return <main className={styles.page}><header><Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link><Link href="/examples">첨삭 예시</Link></header><div className={styles.container}><Link href="/" className={styles.back}><ArrowLeft/> 홈으로</Link><section className={styles.hero}><span>내 작성 단계 확인</span><h1>지금 어디까지 작성하셨나요?</h1><p>상품명보다 현재 상황을 먼저 알려주세요. 필요한 범위만 추천해 드릴게요.</p></section><section className={styles.modeGrid}>{modes.map(({id,icon:Icon,title,question,description})=><button key={id} className={mode===id?styles.selected:""} onClick={()=>setSelected(id)}><span className={styles.radio}>{mode===id&&<Check/>}</span><Icon/><small>{title}</small><b>{question}</b><p>{description}</p></button>)}</section><details className={styles.auto} open={!selected}><summary>어떤 단계인지 잘 모르겠어요 <span>작성한 내용을 넣으면 자동으로 확인해요</span></summary><div><label><span>현재 작성한 내용</span><textarea rows={7} value={draft} onChange={e=>{setDraft(e.target.value);setSelected(null)}} placeholder="아직 작성하지 않았다면 비워두세요."/><small>공백 제외 {draft.replace(/\s/g,"").length}자</small></label><label className={styles.length}><span>목표 글자 수</span><input type="number" min="100" max="3000" value={targetLength} onChange={e=>setTargetLength(Number(e.target.value)||700)}/></label>{draft.trim()&&<div className={styles.autoResult}><Sparkles/><span><b>{modes.find(item=>item.id===automatic.mode)?.title} 단계로 보여요.</b><small>{automatic.userMessage}</small></span></div>}</div></details>{mode&&eligibility&&<section className={styles.recommend}><div className={styles.recommendTitle}><span>추천 상품</span><h2>{mode==="CREATE"?"처음 작성은 PRO로 진행합니다.":"원하는 분석 범위를 선택하세요."}</h2><p>{mode==="CREATE"?"첨삭할 원문이 없어 QUICK은 이용할 수 없습니다. PRO에서 경험 확인부터 시작해요.":"현재 글만 빠르게 고치거나, 공고와 전체 자료까지 함께 볼 수 있어요."}</p></div><div className={styles.products}>{eligibility.quick.eligible?<Link href="/quick"><small>QUICK · 5,900원</small><b>작성한 글을 빠르게 첨삭</b><p>문장·논리·구체성·맞춤법·Before/After</p><span>QUICK 시작 <ArrowRight/></span></Link>:<div className={styles.disabled}><small>QUICK · 이용 불가</small><b>첨삭할 작성본이 필요해요</b><p>{eligibility.quick.reason}</p></div>}<Link href="/pro/create" className={styles.pro}><em>추천</em><small>PRO · 12,900원</small><b>{mode==="CREATE"?"무엇을 쓸지부터 함께 찾기":"공고와 지원자료 전체 분석"}</b><p>공고·경험·소재 배치·교차검증·최종검수</p><span>PRO 시작 <ArrowRight/></span></Link></div></section>}</div></main>
}

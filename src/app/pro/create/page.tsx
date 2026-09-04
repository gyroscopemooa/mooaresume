"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, FileText, MessagesSquare } from "lucide-react";
import type { CreateStage } from "@/domain/create-workflow";
import styles from "./create.module.css";
import { ProCreateWizard } from "@/components/pro-create-wizard";

const stages: Array<{id:CreateStage;label:string}>=[{id:"JOB_ANALYSIS",label:"공고 분석"},{id:"EXPERIENCE_DISCOVERY",label:"경험 찾기"},{id:"EXPERIENCE_SELECTION",label:"소재 선택"},{id:"FOLLOW_UP",label:"정보 확인"},{id:"OUTLINE",label:"개요"},{id:"DRAFT",label:"초안"},{id:"REVISION",label:"수정"},{id:"FINAL_REVIEW",label:"최종검수"},{id:"INTERVIEW_PREP",label:"면접 준비"}];
const candidates=[{id:"production",title:"자동차 생산라인 경험",summary:"현장 이해 · 생산공정 · 협업",fit:"직무 연결 높음"},{id:"quality",title:"시험팀 품질업무",summary:"품질 · 시험 · 문제해결 · 데이터",fit:"문제해결 근거 충분"},{id:"counsel",title:"취업지원 상담 경험",summary:"고객응대 · 조율 · 목표관리",fit:"협업 문항에 적합"}];

function LegacyProCreatePrototype(){
  const [stage,setStage]=useState<CreateStage>("JOB_ANALYSIS"); const [posting,setPosting]=useState(""); const [selected,setSelected]=useState<string|null>(null); const [problem,setProblem]=useState(""); const [action,setAction]=useState(""); const [result,setResult]=useState("");
  const index=stages.findIndex(item=>item.id===stage); const advance=()=>setStage(stages[Math.min(index+1,stages.length-1)].id);
  return <main className={styles.page}><header><Link href="/" className={styles.brand}><span>M</span>MOOA <b>Resume</b></Link><span>PRO · 기업 지원서 1건</span></header><div className={styles.shell}><aside><Link href="/start"><ArrowLeft/> 나가기</Link><div className={styles.progress}><b>작성 진행 단계</b>{stages.map((item,itemIndex)=><div key={item.id} className={itemIndex===index?styles.active:itemIndex<index?styles.done:""}><span>{itemIndex<index?<Check/>:itemIndex+1}</span>{item.label}</div>)}</div><p>채팅 기록이 아니라 선택한 경험과 확인된 사실을 구조화해 저장합니다.</p></aside><section className={styles.main}><div className={styles.coach}><MessagesSquare/><div><small>AI 취업 코치</small><h1>{stage==="JOB_ANALYSIS"?"먼저 지원할 공고를 알려주세요.":stage==="EXPERIENCE_DISCOVERY"?"공고와 연결할 경험을 찾았어요.":stage==="EXPERIENCE_SELECTION"?"이번 문항에 사용할 경험을 선택해 주세요.":"선택한 경험에서 세 가지만 확인할게요."}</h1><p>이미 확인 가능한 내용은 다시 묻지 않고, 초안에 꼭 필요한 사실만 확인합니다.</p></div></div>{stage==="JOB_ANALYSIS"&&<div className={styles.card}><label><b>채용공고 또는 직무·문항 정보</b><textarea rows={12} value={posting} onChange={e=>setPosting(e.target.value)} placeholder="채용공고와 자기소개서 문항을 붙여넣어 주세요."/></label><button disabled={!posting.trim()} onClick={advance}>공고 분석하기 <ArrowRight/></button></div>}{stage==="EXPERIENCE_DISCOVERY"&&<div className={styles.card}><div className={styles.source}><BriefcaseBusiness/><div><b>공고에서 찾은 핵심 요구</b><span>생산공정 이해 · 데이터 기반 개선 · 유관부서 협업</span></div></div><div className={styles.source}><FileText/><div><b>자료에서 확인한 경험 후보</b><span>생산라인, 품질 시험, 상담 및 조율 경험</span></div></div><button onClick={advance}>경험 후보 확인 <ArrowRight/></button></div>}{stage==="EXPERIENCE_SELECTION"&&<div className={styles.candidates}>{candidates.map(item=><button key={item.id} className={selected===item.id?styles.selected:""} onClick={()=>setSelected(item.id)}><span className={styles.radio}/><b>{item.title}</b><p>{item.summary}</p><small>{item.fit}</small></button>)}<button className={styles.next} disabled={!selected} onClick={advance}>이 경험으로 진행 <ArrowRight/></button></div>}{!(["JOB_ANALYSIS","EXPERIENCE_DISCOVERY","EXPERIENCE_SELECTION"] as CreateStage[]).includes(stage)&&<div className={styles.card}><div className={styles.questionIntro}><span>추가 정보 3개</span><b>한 번에 답변해 주세요.</b><p>모르는 정보는 비워두셔도 됩니다. 임의의 수치나 성과를 만들지 않아요.</p></div><label><b>어떤 문제나 상황이었나요?</b><textarea rows={3} value={problem} onChange={e=>setProblem(e.target.value)}/></label><label><b>본인이 직접 한 행동은 무엇인가요?</b><textarea rows={3} value={action} onChange={e=>setAction(e.target.value)}/></label><label><b>확인 가능한 결과나 변화가 있나요?</b><textarea rows={3} value={result} onChange={e=>setResult(e.target.value)} placeholder="수치가 없다면 작업 방식이나 팀의 반응도 괜찮아요."/></label><button disabled={!problem.trim()||!action.trim()} onClick={advance}>답변 저장하고 사실 요약 확인 <ArrowRight/></button></div>}</section></div></main>
}

/**
 * "무엇을 쓸지 모르겠어요"(CREATE)는 상세 입력도 간편 입력도 아닌 별도 유형입니다.
 * 문답식 마법사를 비교용 라우트에서 확인하는 동안에는 상세 입력 폼 안에 문답식
 * 폼을 함께 얹어 두 흐름이 겹쳐 보였습니다. 확인이 끝났으므로 이 진입점은
 * 문답식 마법사만 보여줍니다. `ProInputPage mode="CREATE"` 분기는 되돌릴 수
 * 있도록 남겨 두었습니다.
 */
export default function ProCreatePage() {
  void LegacyProCreatePrototype;
  return <ProCreateWizard/>;
}

"use client";
import { useState } from "react";
import { ArrowRight, Check, Circle, Sparkles } from "lucide-react";
import styles from "./career-assessment-style-lab.module.css";
const stylesToChoose = [
  { id:"a", label:"01", name:"Editorial", note:"Harvey 계열 · 큰 제목과 여백", theme:"editorial" },
  { id:"b", label:"02", name:"Software", note:"앱형 · 정보 밀도와 진행 상태", theme:"software" },
  { id:"c", label:"03", name:"Calm", note:"밝은 검사실 · 설명 중심", theme:"calm" },
  { id:"d", label:"04", name:"Dark Desk", note:"어두운 대시보드 · 집중형", theme:"dark" },
  { id:"e", label:"05", name:"Warm Card", note:"따뜻한 카드 · 초보 친화형", theme:"warm" },
  { id:"f", label:"06", name:"Mobile First", note:"모바일 한 화면 · 원클릭형", theme:"mobile" },
] as const;
export function CareerAssessmentStyleLab() {
 const [selected,setSelected]=useState("a");
 return <main className={styles.lab}><header><span>INTERNAL DESIGN STUDY · NOT PUBLIC</span><h1>검사 시작 화면<br /><em>6가지 방향.</em></h1><p>문항과 결과 로직은 바꾸지 않고, 첫 화면의 톤·여백·버튼·정보 밀도만 비교합니다.</p></header><section className={styles.grid}>{stylesToChoose.map((item)=><article key={item.id} className={`${styles.card} ${styles[item.theme]} ${selected===item.id?styles.selected:""}`}><div className={styles.label}><span>{item.label}</span><b>{item.name}</b><button type="button" onClick={()=>setSelected(item.id)}>{selected===item.id?<Check/>:"선택"}</button></div><div className={styles.preview}><small>FREE CAREER ASSESSMENT</small><h2>나에게 맞는<br/>업무방식을 <i>찾아보세요.</i></h2><p>성격 5요인 응답으로 평소 업무 방식을 살펴봅니다.</p><div className={styles.pills}><span>50문항</span><span>약 7분</span><span>무료</span></div><button type="button">검사 시작 <ArrowRight/></button><div className={styles.mini}><Circle/><span>현재 브라우저에만 임시 저장</span></div></div><p className={styles.note}>{item.note}</p></article>)}</section><section className={styles.selection}><Sparkles/><div><b>{stylesToChoose.find((item)=>item.id===selected)?.name} 방향 선택됨</b><p>선택하면 이 시안을 업무성향·직업흥미·직업가치의 실제 시작 화면에 통일 적용합니다.</p></div></section></main>;
}
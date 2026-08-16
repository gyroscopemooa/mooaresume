"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, FileText, ShieldCheck, Sparkles, Upload } from "lucide-react";

export default function AnalyzePage() {
  const [plan, setPlan] = useState<"quick" | "pro">("pro");
  const [resume, setResume] = useState("");

  return <main className="app-shell">
    <header className="app-header"><Link href="/" className="brand"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link><span className="secure"><ShieldCheck/> 입력 자료는 안전하게 보호돼요</span></header>
    <div className="analyze-layout container">
      <aside><Link href="/" className="back"><ArrowLeft/> 홈으로</Link><div className="step active"><span>1</span><div><b>분석 방식 선택</b><small>QUICK 또는 PRO</small></div></div><div className="step"><span>2</span><div><b>자료 입력</b><small>공고와 지원서</small></div></div><div className="step"><span>3</span><div><b>분석 결과</b><small>개선 우선순위 확인</small></div></div></aside>
      <section className="analyze-main">
        <div className="eyebrow">지원서 분석</div><h1>어떤 분석이 필요한가요?</h1><p className="lead">지금 가진 자료에 맞는 방식을 선택하세요. 나중에 언제든 더 정밀한 분석으로 이어갈 수 있어요.</p>
        <div className="plan-grid">
          <button className={plan==="quick"?"plan-card selected":"plan-card"} onClick={()=>setPlan("quick")}><span className="radio"/><FileText/><b>QUICK 진단</b><p>지원서만 빠르게 점검해요.</p><small>문항 충족 · 구체성 · 논리 · 표현</small></button>
          <button className={plan==="pro"?"plan-card selected":"plan-card"} onClick={()=>setPlan("pro")}><span className="recommended">추천</span><span className="radio"/><BriefcaseBusiness/><b>PRO 맞춤 분석</b><p>공고와 지원서를 함께 분석해요.</p><small>QUICK 전체 + 직무 적합 · 경험 매칭 · 면접 질문</small></button>
        </div>
        <div className="form-section">
          {plan==="pro"&&<label><span><b>채용공고</b><small>필수</small></span><textarea placeholder="채용공고 내용을 붙여넣어 주세요. URL 입력 기능은 다음 단계에서 제공됩니다." rows={5}/></label>}
          <label><span><b>지원서 내용</b><small>필수</small></span><textarea value={resume} onChange={e=>setResume(e.target.value)} placeholder="자기소개서 또는 지원서 내용을 붙여넣어 주세요." rows={9}/><div className="field-meta"><span>{resume.length.toLocaleString()}자</span><button type="button"><Upload/> 파일로 올리기 <small>PDF · DOCX</small></button></div></label>
          <details><summary>상세 설정 <span>말투와 첨삭 강도 조정</span></summary><div className="details-content"><label>첨삭 강도<select defaultValue="natural"><option value="minimal">최소 수정</option><option value="natural">자연스럽게 개선</option><option value="rewrite">적극 리라이팅</option></select></label><label className="check"><input type="checkbox" defaultChecked/> 내 원래 말투를 최대한 유지해 주세요</label></div></details>
        </div>
        <div className="form-action"><div><Sparkles/><span><b>사실에 없는 내용은 만들지 않아요.</b><small>부족한 정보는 확인 질문으로 알려드려요.</small></span></div><Link href="/result" className="button">분석 시작하기 <ArrowRight/></Link></div>
      </section>
    </div>
  </main>;
}

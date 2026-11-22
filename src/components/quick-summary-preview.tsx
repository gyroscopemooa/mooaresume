"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Lightbulb, RotateCcw, ShieldCheck } from "lucide-react";
import { createQuickSummaryFeedback } from "@/domain/quick-summary";
import styles from "./quick-summary-preview.module.css";

const SAMPLE = "학과 행사 준비 과정에서 반복되는 문의가 많아 신청 절차와 자주 묻는 질문을 정리했습니다. 담당자별 확인 항목을 표로 만들어 공유하고, 접수 전 안내 문구를 수정했습니다. 이후 문의 내용을 다시 분류해 다음 행사 준비 자료로 남겼습니다.";

export function QuickSummaryPreview() {
  const [draft, setDraft] = useState("");
  const feedback = useMemo(() => createQuickSummaryFeedback(draft), [draft]);

  return <main className={styles.page}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>QUICK 실험실 · 저장하지 않는 즉시 확인</span>
      <h1>자소서 한 문단,<br/><em>핵심만 먼저 정리해 보세요.</em></h1>
      <p>문장을 서버나 AI에 보내지 않고, 현재 초안에서 보이는 흐름만 간단히 확인합니다. 정식 QUICK·PRO 첨삭을 대신하지 않는 테스트 기능입니다.</p>
    </section>

    <section className={styles.workspace} aria-label="간단 요약 입력과 결과">
      <div className={styles.editor}>
        <div className={styles.editorHead}><div><FileText/><span>자기소개서 초안</span></div><button type="button" onClick={() => setDraft(SAMPLE)}>샘플 불러오기</button></div>
        <label className="visually-hidden" htmlFor="quick-summary-draft">자기소개서 초안</label>
        <textarea id="quick-summary-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="경험 한 가지를 편하게 붙여 넣어 보세요. 아직 다듬지 않은 초안이어도 괜찮습니다." rows={13}/>
        <div className={styles.editorFoot}><span>공백 제외 {draft.replace(/\s/g, "").length}자</span>{draft && <button type="button" onClick={() => setDraft("")}><RotateCcw/> 비우기</button>}</div>
      </div>

      <div className={styles.feedback} aria-live="polite">
        {!feedback ? <div className={styles.empty}><Lightbulb/><h2>초안을 넣으면 바로 정리해 드려요.</h2><p>지원 동기, 경험, 활동 중 하나만 넣어도 됩니다.</p></div> : <>
          <div className={styles.resultHead}><span>간단 요약</span><small>로컬 테스트 결과</small></div>
          <blockquote>{feedback.summary}</blockquote>
          <div className={styles.counts}><span><b>{feedback.characterCount}</b>자</span><span><b>{feedback.sentenceCount}</b>문장</span><span><b>{feedback.paragraphs}</b>문단</span></div>
          <div className={styles.group}><h2><CheckCircle2/> 지금 보이는 점</h2><ul>{feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className={styles.group}><h2><ShieldCheck/> 확인해 볼 점</h2><ul>{feedback.checks.length ? feedback.checks.map((item) => <li key={item}>{item}</li>) : <li>현재 초안에서는 상황·행동·결과의 단서를 모두 확인할 수 있습니다.</li>}</ul></div>
          <div className={styles.next}><small>다음 한 가지</small><b>{feedback.nextAction}</b></div>
        </>}
      </div>
    </section>
    <p className={styles.notice}>이 화면은 입력 내용을 저장·전송하지 않습니다. 표현의 적합성, 사실성, 지원 직무와의 연결은 정식 첨삭에서 함께 확인하세요.</p>
  </main>;
}

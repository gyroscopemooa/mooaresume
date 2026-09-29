"use client";

import { useState } from "react";
import { EvaluatorSeedPanel } from "./evaluator-seed-panel";
import { PERFORMANCE_PROMPT, PERFORMANCE_RUBRIC, PERFORMANCE_RUBRIC_VERSION } from "@/domain/interview-performance-rubric";

const initialPrompt = `면접 답변을 질문과 지원자료 근거에 비추어 평가한다.
경험 질문은 STAR(상황·과제·행동·결과)를 참고하되 모든 질문에 강제하지 않는다.
질문 적합성, 핵심 메시지, 본인 기여, 구체적 근거, 직무 관련성, 성찰, 일관성을 구분한다.
판단마다 답변 인용과 이유를 제시하고 없는 경력·성과를 만들지 않는다.
전사 오류가 의심되면 평가를 보류하고 확인을 요청한다.
전사문만으로 발음, 억양, 표정, 자신감, 인성 또는 합격확률을 판정하지 않는다.`;

export function InterviewAnalysisWorkbench() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saved, setSaved] = useState(false);
  return <main style={{ maxWidth: 900, margin: "auto", padding: 24, lineHeight: 1.8 }}>
    <a href="/dev/interview-pro-v2">← 면접 시안</a>
    <h1>면접 분석 워크벤치</h1>
    <p>개발 환경 + 관리자 인증 전용. 음성 전사와 Astra 답변 피드백은 서버에 연결됐습니다. 아래 편집은 별도 브라우저 초안이며 실행 중인 서버 프롬프트를 바꾸지 않습니다.</p>
    <p><a href="/dev/interview-pro-v2/studio">답변 피드백 테스트 열기</a> · 실제 호출 전 전송 동의와 답변 확인이 필요합니다.</p>
    <h2>분석 연결 현황</h2>
    <ul>
      <li>동작: 녹화, 답변시간, 시간 사용률, 마이크 입력 확인·시험 녹음</li>
      <li>연결: 음성 전사·구간 시각, 확인한 답변의 STAR·원문 근거·개선안·예상 꼬리질문. 실제 유료 응답 품질 검증은 별도입니다.</li>
      <li>관찰 도구: 실제 음성 계측과 재생 영상의 얼굴·신체 기준점. 정확한 시선·감정·태도 점수가 아닙니다.</li>
      <li>미연결: 지원자료 대조, 동적 꼬리질문·끼어들기, 10관점 독립 종합 평가, 입퇴장 행동 판정</li>
      <li>미연결: 말하기 속도·침묵·습관어·결론 도달시간</li>
      <li>발음: 음성 기반 별도 검증 필요. STT 오류를 발음 점수로 바꾸지 않음</li>
      <li>제외: 얼굴·시선·인성 추정, 비공개 기업 알고리즘 점수, 합격확률</li>
    </ul>
    <h2>전체 수행 평가 기준 · {PERFORMANCE_RUBRIC_VERSION}</h2>
    <EvaluatorSeedPanel />
    <p>회사 공식 심사표가 아닌 코칭용 내부 초안. 긍정·개선 검토·중립·미평가를 구분하며 자동 감점 수치는 사용하지 않습니다.</p>
    {PERFORMANCE_RUBRIC.map((item) => <details key={item.id}><summary>{item.title}</summary><p>긍정: {item.positive}</p><p>개선 검토: {item.concern}</p><p>예외·감점 금지: {item.exception}</p></details>)}
    <h2>평가 프롬프트 초안</h2>
    <button type="button" onClick={() => { setPrompt(PERFORMANCE_PROMPT); setSaved(false); }}>전체 수행 v2 초안 불러오기</button>{" "}
    <button type="button" onClick={() => { setPrompt(initialPrompt); setSaved(false); }}>기존 답변 평가 v1 불러오기</button>
    <label htmlFor="evaluation-prompt">평가 기준 편집 (실서비스 미반영)</label>
    <textarea id="evaluation-prompt" value={prompt} onChange={(event) => { setPrompt(event.target.value); setSaved(false); }} style={{ width: "100%", minHeight: 320, font: "inherit", padding: 12, boxSizing: "border-box" }} />
    <button type="button" onClick={() => { try { localStorage.setItem("mooa-interview-rubric-draft-v1", prompt); setSaved(true); } catch { setSaved(false); } }}>이 브라우저에 초안 저장</button>{" "}
    <button type="button" onClick={() => { try { const draft = localStorage.getItem("mooa-interview-rubric-draft-v1"); if (draft) setPrompt(draft); } catch { /* Storage may be disabled. */ } }}>저장한 초안 불러오기</button>
    <p role="status">{saved ? "초안 저장됨. AI 실행 설정은 변경되지 않았습니다." : "운영 적용·모델 호출·사용자 데이터 조회는 하지 않습니다."}</p>
    <h2>결과 대시보드 연결 계약</h2>
    <p>문항별 전사문·인용 근거·판단 이유·개선 3개·재연습 질문을 연결합니다. 모델/프롬프트/루브릭/스키마 버전, 호출 지연·실제 원가를 실행 단위로 추적해야 합니다. 데이터가 없으면 0점 대신 미분석으로 표시합니다.</p>
  </main>;
}

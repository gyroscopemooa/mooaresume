"use client";

import { useState } from "react";
import { EVALUATOR_SEED, evaluatorDraftSchema, type EvaluatorDraft } from "@/domain/interview-evaluator-seed";

const storageKey = "mooa-evaluator-seed-history-v1";
export function EvaluatorSeedPanel() {
  const [weights, setWeights] = useState<number[]>(EVALUATOR_SEED.dimensions.map((item) => item.weight));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<EvaluatorDraft[]>([]);
  const readHistory = () => {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    const parsed = evaluatorDraftSchema.array().max(20).safeParse(raw);
    if (!parsed.success) throw new Error("invalid history");
    return parsed.data;
  };
  const save = () => {
    const result = evaluatorDraftSchema.safeParse({ seedId: EVALUATOR_SEED.id, weights, reason, savedAt: new Date().toISOString() });
    if (!result.success) { setMessage("배점은 0~100 정수, 합계 100이며 변경 이유는 3자 이상이어야 합니다."); return; }
    try {
      const next = [result.data, ...readHistory()].slice(0, 20);
      localStorage.setItem(storageKey, JSON.stringify(next)); setHistory(next);
      setMessage("이 브라우저에 초안을 저장했습니다. 운영 점수와 AI 프롬프트에는 적용되지 않습니다.");
    } catch { setMessage("저장 공간 또는 기존 기록을 확인하지 못했습니다. 기존 기록은 덮어쓰지 않았습니다."); }
  };
  return <section aria-label="면접관 관점 참고 모듈">
    <h2>면접관 관점 · 초기 참고 모듈</h2>
    <p>{EVALUATOR_SEED.source}</p>
    <p>전체 엔진의 일부인 미검증 초안입니다. 파일명의 FINAL은 엔진 최종 확정을 의미하지 않습니다. 기존 v1/v2 기준과 별도로 관리합니다.</p>
    <fieldset><legend>내부 배점 실험 · 운영 비활성</legend>
      {EVALUATOR_SEED.dimensions.map((item, index) => <label key={item.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "12px 0" }}><span style={{ flex: "1 1 220px" }}>{item.id}. {item.title}</span><input type="number" min={0} max={100} step={1} value={Number.isNaN(weights[index]) ? "" : weights[index]} onChange={(event) => setWeights((previous) => previous.map((value, position) => position === index ? event.target.valueAsNumber : value))} style={{ width: 80, minHeight: 44, fontSize: 16 }} /></label>)}
      <p>합계: {weights.every(Number.isFinite) ? weights.reduce((sum, value) => sum + value, 0) : "입력 확인"} / 100 · 사용자 성적이 아닌 배점 설정</p>
      <label>변경 이유<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} style={{ display: "block", width: "100%", minHeight: 88, fontSize: 16 }} /></label>
      <button type="button" onClick={save}>초안 이력 저장</button>{" "}
      <button type="button" onClick={() => { try { setHistory(readHistory()); setMessage("저장 이력을 불러왔습니다."); } catch { setMessage("저장 이력을 읽지 못했습니다."); } }}>저장 이력 조회</button>
    </fieldset>
    <p role="status">{message}</p>
    {history.map((draft, index) => <details key={`${draft.savedAt}-${index}`}><summary>{draft.savedAt} · {draft.reason}</summary><p>{draft.weights.join(" / ")}</p><button type="button" onClick={() => { setWeights([...draft.weights]); setReason(draft.reason); setMessage("이전 초안을 편집기에 불러왔습니다. 운영 설정은 변경되지 않았습니다."); }}>이 초안 불러오기</button></details>)}
    <details><summary>판정 규칙과 확장 프로필</summary><ul>{EVALUATOR_SEED.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul><p>프로필 후보: {EVALUATOR_SEED.profiles.join(" · ")}. 프로필별 배점은 아직 미검증입니다.</p></details>
    <p>‘호감/비호감’은 심사관의 주관적 해석 후보로만 기록하고, 지원자의 성격·인성 점수로 바꾸지 않습니다. 미평가를 0점 처리하지 않으며 자동 합산 엔진은 연결하지 않았습니다.</p>
    <p>확장 순서: 기준 제안 → 근거·예외 작성 → 테스트 사례 비교 → 사람 검토 → 승인된 버전 적용 → 회귀 검증·롤백. 서버 저장·승인·운영 적용은 후속 개발입니다.</p>
  </section>;
}

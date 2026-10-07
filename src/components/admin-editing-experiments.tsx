"use client";
import { useState } from "react";
import type { EditingExperiment } from "@/domain/admin-editing-experiment";
import styles from "./admin-editing-experiments.module.css";

const errors: Record<string, string> = {
  EXPERIMENT_DISABLED: "운영 활성화 전입니다. 동의 범위·DB 적용 확인 후 관리자 설정으로 켜야 합니다.",
  EXPERIMENT_NO_CONSENT: "현재 버전의 품질 개선 동의와 보관 사본이 모두 있는 건만 시험할 수 있습니다.",
  EXPERIMENT_UNSUPPORTED_SOURCE: "완료된 QUICK·POLISH의 신규 입력만 지원합니다. 재분석·다른 상품은 제외합니다.",
  EXPERIMENT_EVIDENCE_UNAVAILABLE: "원래 작성안·검토 응답이 없거나 만료됐습니다. 새 분석으로 대체하지 않습니다.",
  EXPERIMENT_NO_ELIGIBLE_QUESTIONS: "사실 손실·새 오류로 거절되어 원문을 유지한 대상 문항이 없습니다.",
  EXPERIMENT_STORAGE_UNAVAILABLE: "시험 저장소가 준비되지 않았거나 조회할 수 없습니다.",
  EXPERIMENT_NOT_FOUND: "시험이 없거나 동의 철회로 삭제됐습니다.",
  EXPERIMENT_START_UNCERTAIN: "AI 접수 여부가 불확실합니다. 추가 비용 방지를 위해 자동 재시도하지 않습니다.",
};
const labels: Record<string, string> = { PREPARED: "자료 준비 완료", STARTING: "생성 접수 중", GENERATING: "후보 생성 중", PROPOSED: "후보 생성 완료", REVIEW_STARTING: "검토 접수 중", REVIEWING: "수정별 검토 중", REVIEWED: "수정별 검토 완료", FINAL_STARTING: "전체 검토 접수 중", FINAL_REVIEWING: "전체 검토 중", COMPLETED: "시험 완료", FAILED: "실패", UNCERTAIN: "접수 확인 필요" };
export function AdminEditingExperiments({ runId }: { runId: string }) {
  const [experiments, setExperiments] = useState<EditingExperiment[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  async function refresh() {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/meensoo/editing-experiments?runId=${encodeURIComponent(runId)}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setExperiments(data.experiments); setEnabled(data.enabled); setLoaded(true);
    } catch (e) { setError(errors[e instanceof Error ? e.message : ""] ?? "조회하지 못했습니다. 고객 결과는 변경되지 않았습니다."); }
    finally { setBusy(false); }
  }
  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/meensoo/editing-experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const experiment: EditingExperiment = data.experiment;
      setExperiments(old => [experiment, ...old.filter(x => x.id !== experiment.id)]);
    } catch (e) { setError(errors[e instanceof Error ? e.message : ""] ?? "처리하지 못했습니다. 상태를 다시 조회해 주세요. 자동 재시도하지 않습니다."); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel}>
    <h2>관리자 수동 첨삭 시험</h2>
    <p>고객이 받은 결과·결제·이용권은 바뀌지 않습니다. 두 방식 모두 별도 실험 버전이며, 운영 재작성 기능을 그대로 재현하는 것은 아닙니다.</p>
    <p>동의한 자료의 비식별 사본만 사용합니다. 개인정보가 남아 있으면 실행하지 마세요. 자료가 부족하거나 만료된 건은 새 분석으로 대체하지 않습니다.</p>
    <button type="button" disabled={busy} onClick={refresh}>시험 기록 조회</button>
    {loaded && <>
      {!enabled && <p>기능 꺼짐 · 정책 확인 및 저장소 준비 후 활성화가 필요합니다.</p>}
      <div className={styles.actions}>
        <button type="button" disabled={busy || !enabled} onClick={() => act({ action: "prepare", runId, mode: "REWRITE" })}>재작성 시험 자료 준비</button>
        <button type="button" disabled={busy || !enabled} onClick={() => act({ action: "prepare", runId, mode: "SENTENCE" })}>문장 단위 시험 자료 준비</button>
      </div>
      <small>자료 준비는 저장된 응답 조회만 합니다. 같은 건·방식은 기존 시험을 다시 열며, 실패해도 자동으로 새 유료 시험을 만들지 않습니다.</small>
    </>}
    {error && <p role="alert">{error}</p>}
    {experiments.map(e => {
      const next = e.state === "PREPARED" ? "후보 생성" : e.state === "PROPOSED" ? "수정별 검토" : e.state === "REVIEWED" ? "합친 글 전체 검토" : null;
      const costKnown = e.usage.length > 0 && e.usage.every(u => u.totalTokens !== null);
      return <article className={styles.experiment} key={e.id}>
        <h3>{e.mode === "REWRITE" ? "재작성" : "문장 단위 채택"} · {labels[e.state]}</h3>
        <p>모델 {e.model} · 원본 프롬프트 {e.input.sourcePromptVersion} · 시험 ID {e.id}</p>
        <p>조회된 추가 사용량: {costKnown ? `${e.usage.reduce((sum, u) => sum + (u.totalTokens ?? 0), 0).toLocaleString()} 토큰` : "미확인"}. {e.usage.length}회 응답 확인. 금액은 API 청구 기준이며 미확인 사용량은 0원이라는 뜻이 아닙니다.</p>
        <details><summary>실제로 AI에 보낼 비식별 자료 확인</summary><pre>{JSON.stringify(e.input, null, 2)}</pre></details>
        {next && <>
          <label><input type="checkbox" checked={confirmed[e.id] ?? false} onChange={event => setConfirmed(old => ({ ...old, [e.id]: event.target.checked }))}/>자료의 남은 개인정보를 확인했고 추가 AI 비용에 동의합니다.</label>
          <p>버튼 한 번당 AI 호출 1회, 단계별 최대 출력 12,000토큰입니다. 전체 완료까지 최대 3회이며 각 단계를 별도로 실행합니다.</p>
          <button type="button" disabled={busy || !enabled || !confirmed[e.id]} onClick={() => act({ action: "start", id: e.id, expectedState: e.state, confirmPaid: true, confirmRedaction: true })}>{next} 실행 · 추가 비용</button>
        </>}
        {!next && !["COMPLETED", "FAILED", "UNCERTAIN"].includes(e.state) && <button type="button" disabled={busy || !enabled} onClick={() => act({ action: "poll", id: e.id })}>진행 상태 확인 · 새 생성 없음</button>}
        {e.errorCode && <p role="alert">{errors[e.errorCode] ?? "출력 검증에 실패했습니다. 고객에게는 적용하지 않았습니다."}</p>}
        {e.finalReview && <p><strong>{e.finalReview.safe && e.finalReview.meaningfulImprovement ? "검토 AI가 개선 후보로 판단" : "최종 개선 채택 안 함"}</strong> — {e.finalReview.reason}<br/>AI 검토 판단이며 사실 검증·품질 보장은 아닙니다.</p>}
        {e.input.questions.filter(q => q.eligible).map(q => <div className={styles.question} key={q.order}>
          <h4>{q.order}. {q.prompt}</h4>
          <div className={styles.columns}><div><h5>고객에게 제공한 결과</h5><p>{q.delivered}</p></div><div><h5>시험 조합 · 고객 미적용</h5><p>{e.combined?.find(c => c.order === q.order)?.text ?? "검토 전"}</p></div></div>
          {e.proposal?.edits.filter(edit => edit.order === q.order).map(edit => <details key={edit.id}><summary>{e.review?.decisions.find(d => d.id === edit.id)?.accept ? "부분 채택 후보" : "미채택/검토 전"} · {edit.reason}</summary><p>{edit.source}</p><p>→ {edit.replacement}</p><p>{e.review?.decisions.find(d => d.id === edit.id)?.reason}</p></details>)}
        </div>)}
      </article>;
    })}
  </section>;
}

import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickGatewayResult } from "./openai-responses-gateway";
import { getAnalysisQuestions } from "./questions";
import { normalizeRevisionText, type RevisionReview } from "./revision-quality";

/**
 * 검토에서 탈락한 문항을 "검토 의견을 반영해 한 번 더" 쓰게 하는 규칙.
 *
 * 왜 있나: 같은 글을 여러 번 돌려 보면 탈락의 대부분이 한 가지 이유였다 — 작성 AI가 단정을 고치다가 지원자의
 * 구체적 제안·기관 이름·말투까지 지워서 검토 AI가 "사실·말투 손실"로 거절하는 것(docs/quick-revision-stability-2026-10-06.md).
 * 검토 AI는 그때 무엇을 남겨야 하는지까지 적어 두는데, 그 설명은 지금까지 화면의 "현재 문장 유지" 이유로만 쓰이고
 * 버려졌다. 이 모듈은 그 설명을 작성 AI에게 되돌려 그 문항만 다시 쓰게 하고, 다시 검토를 받게 한다.
 *
 * 지키는 선:
 *  - 다시 쓴 글도 반드시 별도 검토 AI를 거친다. 작성 AI가 스스로 통과시키지 않는다.
 *  - 한 분석에서 한 번만, 최대 3문항만. 두 번째 탈락은 원문 유지다(핑퐁 금지).
 *  - 어느 단계에서 실패해도 첫 검토 결과로 끝낸다. 재작성은 덤이지 필수가 아니다.
 *  - 취향 판정·재등장·단순 "이득 없음"은 다시 써도 같은 판정이 나므로 대상이 아니다.
 */

/** 이 환경변수가 "on"일 때만 켜진다. 기본은 꺼짐(배포와 켜기를 따로 하려는 것). */
export const REPAIR_ENV = "QUICK_REVISION_REPAIR";
export function isRepairEnabled(env: Record<string, string | undefined> = process.env) {
  return env[REPAIR_ENV]?.trim().toLowerCase() === "on";
}

export const MAX_REPAIR_QUESTIONS = 3;

export type RepairNote = { order: number; reason: string; previousAnswer: string };
export type RepairPlan = { orders: number[]; notes: RepairNote[] };

/**
 * 첫 검토 결과에서 다시 쓸 문항을 고른다. 없으면 null.
 *
 * 대상: 작성 AI가 실제로 바꿨고, 검토 AI가 "지원자의 사실·말투를 잃었다" 또는 "근거 없는 내용을 새로 넣었다"고 한 문항.
 * 둘 다 "무엇을 되살리고 무엇을 빼라"는 구체적 이유가 따라오는 거절이다.
 */
export function planRepair(request: AnalysisRequest, candidate: QuickGatewayResult, review: RevisionReview): RepairPlan | null {
  // 이전 결과와 비교하는 재분석은 점수·진단 일관성 규칙이 따로 걸려 있어 여기서 손대지 않는다.
  if (request.previousRevision) return null;
  // 문서 전체 충돌 판정은 한 문항을 다시 쓴다고 풀리지 않는다.
  if (review.crossQuestionRegression) return null;
  const proposed = candidate.output.revisions ?? [{ ...candidate.output.revision, questionOrder: 1 }];
  const notes: RepairNote[] = [];
  for (const question of getAnalysisQuestions(request)) {
    const verdict = review.questions.find((item) => item.order === question.order);
    const draft = proposed.find((item) => item.questionOrder === question.order);
    if (!verdict || !draft || !question.answer.trim()) continue;
    if (normalizeRevisionText(question.answer) === normalizeRevisionText(draft.revisedAnswer)) continue;
    const fixable = (verdict.lostFactOrVoice || verdict.newError) && !verdict.preferenceOnly && !verdict.reintroducedIssue;
    if (!fixable || !verdict.reason.trim()) continue;
    notes.push({ order: question.order, reason: verdict.reason.trim(), previousAnswer: draft.revisedAnswer });
  }
  const picked = notes.slice(0, MAX_REPAIR_QUESTIONS);
  return picked.length === 0 ? null : { orders: picked.map((note) => note.order), notes: picked };
}

/** 재작성 호출용 요청. 서버가 붙이는 칸이라 공개 요청에는 들어올 수 없다. */
export function withRepair(request: AnalysisRequest, plan: RepairPlan): AnalysisRequest {
  return { ...request, repair: { notes: plan.notes } };
}

/**
 * 첫 수정안에서 대상 문항만 다시 쓴 것으로 바꾼 후보. 바꿀 수 없으면 null.
 * 다시 쓴 글이 지난번과 같으면(= 검토 의견을 하나도 반영하지 못했으면) 다시 검토받을 이유가 없어 null이다.
 */
export function mergeRepair(candidate: QuickGatewayResult, repaired: QuickGatewayResult, plan: RepairPlan): QuickGatewayResult | null {
  const base = candidate.output.revisions ?? [{ ...candidate.output.revision, questionOrder: 1 }];
  const again = repaired.output.revisions ?? [{ ...repaired.output.revision, questionOrder: 1 }];
  let changedAny = false;
  const revisions = base.map((revision) => {
    const note = plan.notes.find((item) => item.order === revision.questionOrder);
    if (!note) return revision;
    const next = again.find((item) => item.questionOrder === revision.questionOrder);
    if (!next || !next.revisedAnswer.trim()) return null;
    if (normalizeRevisionText(next.revisedAnswer) !== normalizeRevisionText(note.previousAnswer)) changedAny = true;
    return next;
  });
  if (!changedAny || revisions.some((revision) => revision === null)) return null;
  const merged = revisions as typeof base;
  return { ...candidate, output: { ...candidate.output, revisions: merged, revision: merged[0] } };
}

/**
 * 첫 검토와 두 번째 검토를 하나로 합친다. 다시 쓴 문항은 두 번째 검토의 판정을, 나머지는 첫 검토의 판정을 쓴다.
 * 나머지 문항을 두 번째 검토가 다시 판정하게 두면 이미 통과한 문항이 검토 AI의 잡음으로 뒤집힐 수 있다.
 * 진단(우선순위·확인 질문)과 조언 선별은 원문 기준인 첫 검토 것을 그대로 쓰고, 문서 전체 충돌 판정은
 * 합친 결과를 본 두 번째 검토 것을 쓴다.
 */
export function combineReviews(first: RevisionReview, second: RevisionReview, plan: RepairPlan): RevisionReview | null {
  const questions = first.questions.map((verdict) => plan.orders.includes(verdict.order) ? second.questions.find((item) => item.order === verdict.order) : verdict);
  if (questions.some((verdict) => !verdict)) return null;
  return {
    ...first,
    questions: questions as RevisionReview["questions"],
    crossQuestionRegression: second.crossQuestionRegression,
    crossQuestionOrders: second.crossQuestionOrders,
  };
}

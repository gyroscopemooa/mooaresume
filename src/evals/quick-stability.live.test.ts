import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, it } from "vitest";
import { buildStabilityRequest } from "@/fixtures/quick-stability-case";
import { OpenAIResponsesGateway, type QuickGatewayResult } from "@/server/ai/quick/openai-responses-gateway";
import { createQuickAnalysisResult } from "@/server/ai/quick/provider";
import { QUICK_PROMPT_VERSION, QUICK_RUBRIC_VERSION, QUICK_SCHEMA_VERSION } from "@/server/ai/quick/prompt";
import { getAnalysisQuestions } from "@/server/ai/quick/questions";
import { normalizeRevisionText, revisionReviewSchema, type RevisionReview } from "@/server/ai/quick/revision-quality";
import { parseQuickAnalysisOutput } from "@/server/ai/quick/schema";

/**
 * 같은 입력을 N번 돌려 "어느 문항이 고쳐지는가"가 얼마나 흔들리는지 잰다.
 *
 * 실행: RUN_LIVE_EVAL=1 STABILITY_OUT=<파일> vitest run --config vitest.live.config.ts src/evals/quick-stability.live.test.ts
 * 유료 호출이다(1회 약 3.5만 토큰). 합성 입력이라 고객 글은 나가지 않는다.
 *
 * 두 가지를 따로 본다.
 *  - 전체 반복: 작성 AI와 검토 AI가 매번 새로 돌 때의 흔들림(실제 손님이 다시 돌릴 때와 같다).
 *  - 검토 반복: 첫 번째 작성 AI 수정안 하나를 검토 AI에게만 여러 번 보여줄 때의 흔들림.
 *    전체 흔들림 중 검토 AI의 몫을 분리한다.
 */

type Recorded = { name: string; response: unknown };

function recordingFetch(calls: Recorded[]): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init);
    let name = "other";
    try {
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as { text?: { format?: { name?: string } } }) : null;
      name = body?.text?.format?.name ?? "other";
    } catch { /* 본문이 JSON이 아니면 기록 이름만 other */ }
    const json: unknown = await response.clone().json().catch(() => null);
    calls.push({ name, response: json });
    return response;
  };
}

function outputText(response: unknown): string {
  const envelope = response as { output_text?: string; output?: { content?: { type: string; text?: string }[] }[] } | null;
  if (envelope?.output_text) return envelope.output_text;
  for (const item of envelope?.output ?? []) {
    for (const content of item.content ?? []) if (content.type === "output_text" && content.text) return content.text;
  }
  throw new Error("응답에서 구조화 결과 텍스트를 찾지 못했습니다.");
}

const bigrams = (text: string) => {
  const compact = text.replace(/\s+/g, "");
  const set = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i += 1) set.set(compact.slice(i, i + 2), (set.get(compact.slice(i, i + 2)) ?? 0) + 1);
  return set;
};
/** 글자 2개 단위 Dice 유사도(0~1). 표현이 얼마나 비슷한지만 본다. */
function similarity(a: string, b: string) {
  const left = bigrams(a); const right = bigrams(b);
  let overlap = 0; let total = 0;
  for (const [key, count] of left) overlap += Math.min(count, right.get(key) ?? 0);
  for (const count of left.values()) total += count;
  for (const count of right.values()) total += count;
  return total === 0 ? 1 : (2 * overlap) / total;
}

type QuestionRow = {
  order: number;
  writerChanged: boolean;
  accepted: boolean;
  meaningfulImprovement: boolean;
  newError: boolean;
  lostFactOrVoice: boolean;
  reintroducedIssue: boolean;
  preferenceOnly: boolean;
  beforeSum: number;
  afterSum: number;
  /** 검토 AI가 댄 원문·수정안 인용이 실제 글에 글자 그대로 있는가(채택 조건 중 하나). */
  quoted: boolean;
  /** 5개 항목 점수 중 하나라도 떨어졌으면 false(채택 조건 중 하나). */
  noRegression: boolean;
  droppedScores: string[];
  revisedAnswer: string;
};
type RunRow = {
  kind: "full" | "reviewer-only";
  index: number;
  decision: string;
  crossQuestionRegression: boolean;
  beforeScore: number;
  priorities: string;
  tokens: number | null;
  questions: QuestionRow[];
  error?: string;
};

const sum = (scores: Record<string, number>) => Object.values(scores).reduce((total, value) => total + value, 0);

function rowsFor(
  originals: { order: number; answer: string }[],
  proposed: { questionOrder: number; revisedAnswer: string }[],
  finalRevisions: { questionOrder: number; revisedAnswer: string }[],
  review: RevisionReview,
): QuestionRow[] {
  return originals.map((question) => {
    const draft = proposed.find((item) => item.questionOrder === question.order);
    const final = finalRevisions.find((item) => item.questionOrder === question.order);
    const verdict = review.questions.find((item) => item.order === question.order);
    const writerChanged = Boolean(draft) && normalizeRevisionText(draft!.revisedAnswer) !== normalizeRevisionText(question.answer);
    const accepted = writerChanged && Boolean(final) && normalizeRevisionText(final!.revisedAnswer) === normalizeRevisionText(draft!.revisedAnswer);
    // applyRevisionReview가 채택 여부를 정할 때 보는 두 조건을 같은 식으로 다시 잰다.
    const quoted = Boolean(verdict && draft)
      && verdict!.sourceQuote.trim().length > 0 && normalizeRevisionText(question.answer).includes(normalizeRevisionText(verdict!.sourceQuote))
      && verdict!.candidateQuote.trim().length > 0 && normalizeRevisionText(draft!.revisedAnswer).includes(normalizeRevisionText(verdict!.candidateQuote));
    const droppedScores = verdict ? (Object.keys(verdict.before) as (keyof typeof verdict.before)[]).filter((key) => verdict.after[key] < verdict.before[key]) : [];
    return {
      order: question.order,
      writerChanged,
      accepted,
      meaningfulImprovement: verdict?.meaningfulImprovement ?? false,
      newError: verdict?.newError ?? false,
      lostFactOrVoice: verdict?.lostFactOrVoice ?? false,
      reintroducedIssue: verdict?.reintroducedIssue ?? false,
      preferenceOnly: verdict?.preferenceOnly ?? false,
      beforeSum: verdict ? sum(verdict.before) : 0,
      afterSum: verdict ? sum(verdict.after) : 0,
      quoted,
      noRegression: droppedScores.length === 0,
      droppedScores,
      revisedAnswer: final?.revisedAnswer ?? "",
    };
  });
}

const signature = (items: { category: string; severity: string }[]) => items.map((item) => `${item.category}:${item.severity}`).sort().join("|");

describe("QUICK revision stability (live)", () => {
  it("measures the spread of identical-input reruns", async () => {
    if (process.env.RUN_LIVE_EVAL !== "1") throw new Error("유료 live Eval을 실행하려면 RUN_LIVE_EVAL=1을 설정해야 합니다.");
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL이 필요합니다.");
    const fullRuns = Number(process.env.STABILITY_RUNS ?? 5);
    const reviewRepeats = Number(process.env.STABILITY_REVIEW_REPEATS ?? 4);
    const outFile = process.env.STABILITY_OUT ?? "tmp/quick-stability.json";

    const request = buildStabilityRequest();
    const originals = getAnalysisQuestions(request).map((question) => ({ order: question.order, answer: question.answer }));
    const rows: RunRow[] = [];
    let firstCandidate: QuickGatewayResult | null = null;

    const save = () => {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, JSON.stringify({ model, promptVersion: QUICK_PROMPT_VERSION, questionCount: originals.length, rows }, null, 2));
    };

    // 순차 실행: 호출 속도와 비용을 예측 가능하게 둔다(기존 eval과 같은 방침).
    for (let index = 1; index <= fullRuns; index += 1) {
      const calls: Recorded[] = [];
      const gateway = new OpenAIResponsesGateway({ apiKey, model, fetchImplementation: recordingFetch(calls) });
      try {
        const result = await gateway.analyze(request);
        const writer = calls.find((call) => call.name === "quick_resume_analysis");
        const reviewer = calls.find((call) => call.name === "revision_quality_review");
        if (!writer || !reviewer) throw new Error("작성 또는 검토 호출 기록이 없습니다.");
        const candidate = parseQuickAnalysisOutput(JSON.parse(outputText(writer.response)) as unknown);
        const review = revisionReviewSchema.parse(JSON.parse(outputText(reviewer.response)) as unknown);
        const proposed = candidate.revisions ?? [{ ...candidate.revision, questionOrder: 1 }];
        const document = createQuickAnalysisResult(request, result);
        const finalRevisions = result.output.revisions ?? [{ ...result.output.revision, questionOrder: 1 }];
        rows.push({
          kind: "full", index,
          decision: document.revisionQuality?.decision ?? "unknown",
          crossQuestionRegression: review.crossQuestionRegression,
          beforeScore: document.revisionQuality?.beforeScore ?? document.readiness.score,
          priorities: signature(document.priorities),
          tokens: result.execution.totalTokens,
          questions: rowsFor(originals, proposed, finalRevisions, review),
        });
        if (index === 1) {
          const envelope = writer.response as { id: string; model: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
          firstCandidate = {
            output: candidate,
            execution: {
              responseId: envelope.id, model: envelope.model, promptVersion: QUICK_PROMPT_VERSION, rubricVersion: QUICK_RUBRIC_VERSION,
              schemaVersion: QUICK_SCHEMA_VERSION, inputTokens: envelope.usage?.input_tokens ?? null,
              outputTokens: envelope.usage?.output_tokens ?? null, totalTokens: envelope.usage?.total_tokens ?? null,
            },
          };
        }
      } catch (error) {
        rows.push({ kind: "full", index, decision: "error", crossQuestionRegression: false, beforeScore: 0, priorities: "", tokens: null, questions: [], error: error instanceof Error ? error.message : String(error) });
      }
      save();
      console.info(`[stability] full run ${index}/${fullRuns} done`);
    }

    // 같은 수정안 하나를 검토 AI에게만 다시 보여준다.
    if (firstCandidate) {
      const proposed = firstCandidate.output.revisions ?? [{ ...firstCandidate.output.revision, questionOrder: 1 }];
      for (let index = 1; index <= reviewRepeats; index += 1) {
        const calls: Recorded[] = [];
        const gateway = new OpenAIResponsesGateway({ apiKey, model, fetchImplementation: recordingFetch(calls) });
        try {
          const reviewed = await gateway.startReview(request, firstCandidate, false);
          if (typeof reviewed === "string") throw new Error("검토가 끝나지 않았습니다.");
          const reviewer = calls.find((call) => call.name === "revision_quality_review");
          if (!reviewer) throw new Error("검토 호출 기록이 없습니다.");
          const review = revisionReviewSchema.parse(JSON.parse(outputText(reviewer.response)) as unknown);
          const finalRevisions = reviewed.output.revisions ?? [{ ...reviewed.output.revision, questionOrder: 1 }];
          rows.push({
            kind: "reviewer-only", index,
            decision: reviewed.revisionQuality?.decision ?? "unknown",
            crossQuestionRegression: review.crossQuestionRegression,
            beforeScore: reviewed.revisionQuality?.beforeScore ?? 0,
            priorities: signature(reviewed.output.priorities),
            tokens: null,
            questions: rowsFor(originals, proposed, finalRevisions, review),
          });
        } catch (error) {
          rows.push({ kind: "reviewer-only", index, decision: "error", crossQuestionRegression: false, beforeScore: 0, priorities: "", tokens: null, questions: [], error: error instanceof Error ? error.message : String(error) });
        }
        save();
        console.info(`[stability] reviewer-only ${index}/${reviewRepeats} done`);
      }
    }

    // 요약
    for (const kind of ["full", "reviewer-only"] as const) {
      const ok = rows.filter((row) => row.kind === kind && row.decision !== "error");
      const sets = ok.map((row) => row.questions.filter((question) => question.accepted).map((question) => question.order).join(",") || "-");
      const wordings: string[] = [];
      for (const order of originals.map((item) => item.order)) {
        const texts = ok.map((row) => row.questions.find((question) => question.order === order)).filter((question) => question?.accepted).map((question) => question!.revisedAnswer);
        for (let i = 0; i < texts.length; i += 1) for (let j = i + 1; j < texts.length; j += 1) wordings.push(similarity(texts[i], texts[j]).toFixed(2));
      }
      console.info(JSON.stringify({ kind, runs: ok.length, acceptedSets: sets, scores: ok.map((row) => row.beforeScore), decisions: ok.map((row) => row.decision), wordingSimilarity: wordings }));
    }
    save();
  }, 3_600_000);
});

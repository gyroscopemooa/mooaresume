import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, it } from "vitest";
import { buildStabilityRequest } from "@/fixtures/quick-stability-case";
import { OpenAIResponsesGateway, type QuickGatewayResult } from "@/server/ai/quick/openai-responses-gateway";
import { createQuickAnalysisResult } from "@/server/ai/quick/provider";
import { QUICK_PROMPT_VERSION, QUICK_RUBRIC_VERSION, QUICK_SCHEMA_VERSION } from "@/server/ai/quick/prompt";
import { getAnalysisQuestions } from "@/server/ai/quick/questions";
import { normalizeRevisionText, quoteAppearsIn, revisionReviewSchema, type RevisionReview } from "@/server/ai/quick/revision-quality";
import { parseQuickAnalysisOutput } from "@/server/ai/quick/schema";

/**
 * 같은 입력을 N번 돌려 "어느 문항이 고쳐지는가"가 얼마나 흔들리는지 잰다.
 *
 * 실행: RUN_LIVE_EVAL=1 STABILITY_OUT=<파일> vitest run --config vitest.live.config.ts src/evals/quick-stability.live.test.ts
 * 유료 호출이다(1회 약 3.0만~3.2만 토큰, 검토만 1회 약 1만 토큰). 합성 입력이라 고객 글은 나가지 않는다.
 *
 * 두 가지를 따로 본다.
 *  - 전체 반복: 작성 AI와 검토 AI가 매번 새로 돌 때의 흔들림(실제 손님이 다시 돌릴 때와 같다).
 *  - 검토 반복: 각 작성 AI 수정안을 검토 AI에게만 여러 번 보여줄 때의 흔들림.
 *    전체 흔들림 중 검토 AI의 몫을 분리한다.
 *
 * 검토 규칙을 고칠 때 유료 호출을 다시 하지 않도록 `STABILITY_RAW_OUT`에 수정안과 검토 응답 원본을
 * 저장한다. `quick-stability-replay.test.ts`가 그 파일을 읽어 현재 코드로 채택 여부를 다시 계산한다.
 * (입력이 합성 글이라 원본을 저장해도 고객 정보는 없다.)
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
  /** 검토 AI가 댄 원문·수정안 인용이 실제 글에 있는가(띄어쓰기·따옴표 차이는 봐준다. 채택 조건 중 하나). */
  quoted: boolean;
  /** 5개 항목 점수 중 하나라도 떨어졌으면 false(채택 조건 중 하나). */
  noRegression: boolean;
  droppedScores: string[];
  revisedAnswer: string;
};
type RunRow = {
  kind: "full" | "reviewer-only";
  index: number;
  /** 어느 작성 AI 수정안에 대한 행인가(전체 반복은 자기 회차, 검토 반복은 그 수정안의 회차). */
  candidate: number;
  decision: string;
  crossQuestionRegression: boolean;
  beforeScore: number;
  priorities: string;
  tokens: number | null;
  questions: QuestionRow[];
  error?: string;
};

type RawEntry = { candidate: number; kind: "full" | "reviewer-only"; repeat: number; candidateOutput?: unknown; review: unknown };

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
    const quoted = Boolean(verdict && draft) && quoteAppearsIn(question.answer, verdict!.sourceQuote) && quoteAppearsIn(draft!.revisedAnswer, verdict!.candidateQuote);
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
    // 수정안 하나당 검토 AI만 다시 돌리는 횟수.
    const reviewRepeats = Number(process.env.STABILITY_REVIEW_REPEATS ?? 2);
    const outFile = process.env.STABILITY_OUT ?? "tmp/quick-stability.json";
    const rawFile = process.env.STABILITY_RAW_OUT ?? `${outFile.replace(/\.json$/, "")}.raw.json`;

    const request = buildStabilityRequest();
    const originals = getAnalysisQuestions(request).map((question) => ({ order: question.order, answer: question.answer }));
    const rows: RunRow[] = [];
    const raws: RawEntry[] = [];
    const candidates = new Map<number, QuickGatewayResult>();

    const save = () => {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, JSON.stringify({ model, promptVersion: QUICK_PROMPT_VERSION, questionCount: originals.length, rows }, null, 2));
      writeFileSync(rawFile, JSON.stringify({ model, promptVersion: QUICK_PROMPT_VERSION, request, raws }, null, 2));
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
          kind: "full", index, candidate: index,
          decision: document.revisionQuality?.decision ?? "unknown",
          crossQuestionRegression: review.crossQuestionRegression,
          beforeScore: document.revisionQuality?.beforeScore ?? document.readiness.score,
          priorities: signature(document.priorities),
          tokens: result.execution.totalTokens,
          questions: rowsFor(originals, proposed, finalRevisions, review),
        });
        raws.push({ candidate: index, kind: "full", repeat: 0, candidateOutput: candidate, review });
        const envelope = writer.response as { id: string; model: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
        candidates.set(index, {
          output: candidate,
          execution: {
            responseId: envelope.id, model: envelope.model, promptVersion: QUICK_PROMPT_VERSION, rubricVersion: QUICK_RUBRIC_VERSION,
            schemaVersion: QUICK_SCHEMA_VERSION, inputTokens: envelope.usage?.input_tokens ?? null,
            outputTokens: envelope.usage?.output_tokens ?? null, totalTokens: envelope.usage?.total_tokens ?? null,
          },
        });
      } catch (error) {
        rows.push({ kind: "full", index, candidate: index, decision: "error", crossQuestionRegression: false, beforeScore: 0, priorities: "", tokens: null, questions: [], error: error instanceof Error ? error.message : String(error) });
      }
      save();
      console.info(`[stability] full run ${index}/${fullRuns} done`);
    }

    // 같은 수정안을 검토 AI에게만 다시 보여준다.
    for (const [candidateIndex, candidate] of candidates) {
      const proposed = candidate.output.revisions ?? [{ ...candidate.output.revision, questionOrder: 1 }];
      for (let repeat = 1; repeat <= reviewRepeats; repeat += 1) {
        const calls: Recorded[] = [];
        const gateway = new OpenAIResponsesGateway({ apiKey, model, fetchImplementation: recordingFetch(calls) });
        try {
          const reviewed = await gateway.startReview(request, candidate, false);
          if (typeof reviewed === "string") throw new Error("검토가 끝나지 않았습니다.");
          const reviewer = calls.find((call) => call.name === "revision_quality_review");
          if (!reviewer) throw new Error("검토 호출 기록이 없습니다.");
          const review = revisionReviewSchema.parse(JSON.parse(outputText(reviewer.response)) as unknown);
          const finalRevisions = reviewed.output.revisions ?? [{ ...reviewed.output.revision, questionOrder: 1 }];
          rows.push({
            kind: "reviewer-only", index: repeat, candidate: candidateIndex,
            decision: reviewed.revisionQuality?.decision ?? "unknown",
            crossQuestionRegression: review.crossQuestionRegression,
            beforeScore: reviewed.revisionQuality?.beforeScore ?? 0,
            priorities: signature(reviewed.output.priorities),
            tokens: null,
            questions: rowsFor(originals, proposed, finalRevisions, review),
          });
          raws.push({ candidate: candidateIndex, kind: "reviewer-only", repeat, review });
        } catch (error) {
          rows.push({ kind: "reviewer-only", index: repeat, candidate: candidateIndex, decision: "error", crossQuestionRegression: false, beforeScore: 0, priorities: "", tokens: null, questions: [], error: error instanceof Error ? error.message : String(error) });
        }
        save();
        console.info(`[stability] reviewer-only candidate ${candidateIndex} repeat ${repeat}/${reviewRepeats} done`);
      }
    }

    // 요약
    for (const kind of ["full", "reviewer-only"] as const) {
      const ok = rows.filter((row) => row.kind === kind && row.decision !== "error");
      const sets = ok.map((row) => row.questions.filter((question) => question.accepted).map((question) => question.order).join(",") || "-");
      console.info(JSON.stringify({ kind, runs: ok.length, acceptedSets: sets, scores: ok.map((row) => row.beforeScore), decisions: ok.map((row) => row.decision) }));
    }
    save();
  }, 3_600_000);
});

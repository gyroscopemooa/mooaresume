import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import type { QuickGatewayResult } from "@/server/ai/quick/openai-responses-gateway";
import { getAnalysisQuestions } from "@/server/ai/quick/questions";
import { applyRevisionReview, normalizeRevisionText, revisionReviewSchema } from "@/server/ai/quick/revision-quality";
import { parseQuickAnalysisOutput } from "@/server/ai/quick/schema";

/**
 * 저장해 둔 작성 AI 수정안과 검토 AI 응답을 **현재 코드의 채택 규칙으로 다시 계산**한다. 유료 호출이 없다.
 *
 * 채택 규칙을 고친 뒤 "같은 입력에서 고쳐지는 문항이 어떻게 달라지는가"를 같은 원본 위에서 비교하려는 도구다.
 * 원본은 `quick-stability.live.test.ts`가 `STABILITY_RAW_OUT`으로 저장한다.
 *
 * 실행: STABILITY_RAW_IN=<raw 파일> [STABILITY_ROWS_IN=<그때의 요약 파일>] vitest run src/evals/quick-stability-replay.test.ts
 * 환경변수가 없으면 건너뛴다.
 */
const rawPath = process.env.STABILITY_RAW_IN;
const rowsPath = process.env.STABILITY_ROWS_IN;

type Raw = { candidate: number; kind: "full" | "reviewer-only"; repeat: number; candidateOutput?: unknown; review: unknown };
type Row = { kind: string; index: number; candidate: number; decision: string; questions: { order: number; accepted: boolean }[] };

describe.skipIf(!rawPath)("QUICK stability replay (offline)", () => {
  it("re-applies the current acceptance rules to saved reviews", () => {
    const saved = JSON.parse(readFileSync(rawPath as string, "utf-8")) as { request: AnalysisRequest; raws: Raw[] };
    const before = rowsPath ? (JSON.parse(readFileSync(rowsPath, "utf-8")) as { rows: Row[] }).rows : [];
    const originals = getAnalysisQuestions(saved.request);
    const candidates = new Map<number, QuickGatewayResult>();
    for (const raw of saved.raws) {
      if (raw.candidateOutput === undefined) continue;
      candidates.set(raw.candidate, {
        output: parseQuickAnalysisOutput(raw.candidateOutput),
        execution: { responseId: "replay", model: "replay", promptVersion: "replay", rubricVersion: "replay", schemaVersion: "1.0", inputTokens: null, outputTokens: null, totalTokens: null },
      });
    }

    const lines: string[] = [];
    let flippedToAccepted = 0;
    let flippedToRejected = 0;
    let compared = 0;
    for (const raw of saved.raws) {
      const candidate = candidates.get(raw.candidate);
      if (!candidate) continue;
      try {
        // 이 칸이 생기기 전에 저장한 응답에는 없으므로 비운 채로 읽는다(= 예전처럼 전부 되돌림).
        const review = revisionReviewSchema.parse({ crossQuestionOrders: [], ...(raw.review as Record<string, unknown>) });
        const result = applyRevisionReview(saved.request, candidate, review, { responseId: "replay", model: "replay" });
        const proposed = candidate.output.revisions ?? [{ ...candidate.output.revision, questionOrder: 1 }];
        const final = result.output.revisions ?? [{ ...result.output.revision, questionOrder: 1 }];
        const acceptedNow = originals.filter((question) => {
          const draft = proposed.find((item) => item.questionOrder === question.order);
          const out = final.find((item) => item.questionOrder === question.order);
          return Boolean(draft && out)
            && normalizeRevisionText(draft!.revisedAnswer) !== normalizeRevisionText(question.answer)
            && normalizeRevisionText(out!.revisedAnswer) === normalizeRevisionText(draft!.revisedAnswer);
        }).map((question) => question.order);
        const index = raw.kind === "full" ? raw.candidate : raw.repeat;
        const old = before.find((row) => row.kind === raw.kind && row.candidate === raw.candidate && row.index === index);
        const oldSet = old?.questions.filter((question) => question.accepted).map((question) => question.order);
        if (oldSet) {
          compared += 1;
          flippedToAccepted += acceptedNow.filter((order) => !oldSet.includes(order)).length;
          flippedToRejected += oldSet.filter((order) => !acceptedNow.includes(order)).length;
        }
        lines.push(`${raw.kind} 수정안#${raw.candidate}${raw.kind === "reviewer-only" ? `-${raw.repeat}` : ""}: 이전 ${oldSet ? `{${oldSet.join(",") || "-"}}` : "?"} → 지금 {${acceptedNow.join(",") || "-"}} (${result.revisionQuality?.decision})`);
      } catch (error) {
        lines.push(`${raw.kind} 수정안#${raw.candidate}: 계산 실패 ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.info(`[replay]\n${lines.join("\n")}\n비교 ${compared}건: 새로 채택된 문항 ${flippedToAccepted}개, 더는 채택되지 않은 문항 ${flippedToRejected}개`);
    expect(lines.length).toBeGreaterThan(0);
  });
});

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "vitest";
import { buildStabilityRequest } from "@/fixtures/quick-stability-case";
import { OpenAIResponsesGateway, type QuickGatewayResult } from "@/server/ai/quick/openai-responses-gateway";
import { QUICK_PROMPT_VERSION } from "@/server/ai/quick/prompt";
import { getAnalysisQuestions } from "@/server/ai/quick/questions";
import { normalizeRevisionText } from "@/server/ai/quick/revision-quality";
import { isRepairEnabled, REPAIR_ENV, type RepairPlan } from "@/server/ai/quick/revision-repair";
import { advanceQuickBackgroundAnalysis } from "@/server/analysis/quick-background-execution";

/**
 * 탈락 문항 재작성(revision-repair.ts)을 진짜 진행 코드와 진짜 OpenAI로 돌려, 같은 입력에서
 *  - 첫 검토만으로 끝났을 때(첫 결과)와 재작성까지 마쳤을 때(최종)의 "고쳐진 문항 수"를 비교하고
 *  - 재작성에 든 토큰과 시간을 잰다.
 *
 * 실행: RUN_LIVE_EVAL=1 QUICK_REVISION_REPAIR=on REPAIR_RUNS=3 REPAIR_OUT=<파일> vitest run --config vitest.live.config.ts src/evals/quick-repair.live.test.ts
 * 유료 호출이다(작성 1회 + 검토 1회, 재작성할 문항이 있으면 작성 1회 + 검토 1회가 더 든다). 합성 입력이라 고객 글은 나가지 않는다.
 *
 * 운영과 같은 길(advanceQuickBackgroundAnalysis → OpenAIResponsesGateway)을 그대로 타고, 저장소만 메모리로 갈음한다.
 * 첫 결과는 첫 검토를 읽는 순간 게이트웨이에서 가로채 기록한다(재작성 없이 끝났다면 나왔을 결과).
 */

const POLL_MS = 5_000;
const DEADLINE_MS = 25 * 60_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Row = {
  index: number;
  seconds: number;
  /** 저장된 자리가 바뀐 시각(시작 후 초)과 단계 이름. 어느 단계에 시간이 걸리는지 본다. */
  stages: { at: number; stage: string }[];
  firstPassEdited: number[];
  plan: number[];
  finalEdited: number[];
  repairedOrders: number[];
  decision: string;
  firstTokens: number | null;
  finalTokens: number | null;
  repairs: { order: number; reason: string; rejectedDraft: string; finalAnswer: string; adopted: boolean }[];
  error?: string;
};

const stageOf = (cursor: string | null) => {
  if (!cursor) return "start";
  const parts = cursor.split("|");
  if (parts[0] !== "quality-v1") return "writer";
  if (parts[2] === "starting") return "review-claim";
  if (parts[3] !== "repair") return "review";
  if (parts[4] === "starting") return "repair-claim";
  if (parts[6] !== "review") return "repair";
  return parts[7] === "starting" ? "repair-review-claim" : "repair-review";
};

describe("QUICK rejected-question rewrite (live)", () => {
  it("compares the first review's result with the rewritten result on identical input", async () => {
    if (process.env.RUN_LIVE_EVAL !== "1") throw new Error("유료 live Eval을 실행하려면 RUN_LIVE_EVAL=1을 설정해야 합니다.");
    if (!isRepairEnabled()) throw new Error(`${REPAIR_ENV}=on 이어야 재작성이 켜집니다.`);
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) throw new Error("OPENAI_API_KEY와 OPENAI_MODEL이 필요합니다.");
    const runs = Number(process.env.REPAIR_RUNS ?? 3);
    const outFile = process.env.REPAIR_OUT ?? join(tmpdir(), "quick-repair.json");

    const request = buildStabilityRequest();
    const originals = getAnalysisQuestions(request);
    const editedOrders = (result: QuickGatewayResult) => originals
      .filter((question) => {
        const revision = (result.output.revisions ?? []).find((item) => item.questionOrder === question.order);
        return Boolean(revision) && normalizeRevisionText(revision!.revisedAnswer) !== normalizeRevisionText(question.answer);
      })
      .map((question) => question.order);
    const rows: Row[] = [];
    const save = () => {
      mkdirSync(dirname(outFile), { recursive: true });
      writeFileSync(outFile, JSON.stringify({ model, promptVersion: QUICK_PROMPT_VERSION, questionCount: originals.length, rows }, null, 2));
    };

    for (let index = 1; index <= runs; index += 1) {
      const real = new OpenAIResponsesGateway({ apiKey, model });
      const seen: { firstPass?: QuickGatewayResult; plan?: RepairPlan } = {};
      const gateway = {
        startBackground: real.startBackground.bind(real),
        getBackground: real.getBackground.bind(real),
        startReview: real.startReview.bind(real),
        getReview: async (...args: Parameters<OpenAIResponsesGateway["getReview"]>) => {
          const response = await real.getReview(...args);
          if (response.status === "completed" && !seen.firstPass) { seen.firstPass = response.result; seen.plan = response.repair; }
          return response;
        },
        startRepair: real.startRepair.bind(real),
        startRepairReview: real.startRepairReview.bind(real),
        getRepairReview: real.getRepairReview.bind(real),
      };
      const begin = Date.now();
      const state: { cursor: string | null } = { cursor: null };
      const repository = {
        getRunningContext: async () => ({ analysisRunId: "live", responseId: state.cursor, request, attemptCount: 1, startedAt: new Date(begin).toISOString() }),
        saveBackgroundResponse: async (_id: string, responseId: string) => { state.cursor = responseId; },
        compareAndSwapResponse: async (_id: string, expected: string, next: string) => {
          if (state.cursor !== expected) return false;
          state.cursor = next;
          return true;
        },
      };
      const stages: Row["stages"] = [];
      let lastStage = "";
      try {
        let final: QuickGatewayResult | null = null;
        while (!final) {
          const step = await advanceQuickBackgroundAnalysis({ analysisRunId: "live", repository, gateway });
          const stage = stageOf(state.cursor);
          if (stage !== lastStage) { stages.push({ at: Math.round((Date.now() - begin) / 1000), stage }); lastStage = stage; }
          if (step.status === "polled" && step.response.status === "completed") final = step.response.result;
          else if (step.status === "polled" && step.response.status === "failed") throw new Error(`분석 실패: ${step.response.reason}`);
          else if (Date.now() - begin > DEADLINE_MS) throw new Error("제한 시간 안에 끝나지 않았습니다.");
          else await wait(POLL_MS);
        }
        const first = seen.firstPass;
        if (!first) throw new Error("첫 검토 결과를 가로채지 못했습니다.");
        const repairedOrders = final.revisionQuality?.repairedOrders ?? [];
        rows.push({
          index, seconds: Math.round((Date.now() - begin) / 1000), stages,
          firstPassEdited: editedOrders(first), plan: seen.plan?.orders ?? [], finalEdited: editedOrders(final), repairedOrders,
          decision: final.revisionQuality?.decision ?? "unknown",
          firstTokens: first.execution.totalTokens, finalTokens: final.execution.totalTokens,
          repairs: (seen.plan?.notes ?? []).map((note) => {
            const finalAnswer = (final.output.revisions ?? []).find((item) => item.questionOrder === note.order)?.revisedAnswer ?? "";
            const original = originals.find((question) => question.order === note.order)?.answer ?? "";
            return { order: note.order, reason: note.reason, rejectedDraft: note.previousAnswer, finalAnswer, adopted: normalizeRevisionText(finalAnswer) !== normalizeRevisionText(original) };
          }),
        });
      } catch (error) {
        rows.push({ index, seconds: Math.round((Date.now() - begin) / 1000), stages, firstPassEdited: [], plan: [], finalEdited: [], repairedOrders: [], decision: "error", firstTokens: null, finalTokens: null, repairs: [], error: error instanceof Error ? error.message : String(error) });
      }
      save();
      const row = rows[rows.length - 1];
      console.info(`[repair] run ${index}/${runs}: ${row.error ? `error ${row.error}` : `첫 결과 ${row.firstPassEdited.length}문항 → 최종 ${row.finalEdited.length}문항, 재작성 대상 [${row.plan.join(",")}], ${row.seconds}초, 토큰 ${row.firstTokens} → ${row.finalTokens}`}`);
    }
  }, 60 * 60_000);
});

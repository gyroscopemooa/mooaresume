import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stabilityQuestions } from "@/fixtures/quick-stability-case";
import { loadSimilarEarlierAnalysis } from "./similar-earlier-analysis";

const answers = stabilityQuestions.map((question) => question.answer);
const row = (id: string, createdAt: string, originals: string[]) => ({
  analysis_run_id: id, created_at: createdAt, questions: originals.map((originalAnswer) => ({ originalAnswer, revisedAnswer: originalAnswer, id: "q" })),
});
const input = { ownerId: "owner-1", analysisRunId: "run-now", createdAt: "2026-10-06T00:00:00Z", originals: answers };

/** `from → select → eq → neq → lt → order → limit`를 그대로 따라 하고, 마지막 `limit`이 결과를 돌려주는 가짜 클라이언트. */
function stubClient(response: { data: unknown; error: { code: string } | null } | Error) {
  const calls: Record<string, unknown[][]> = {};
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "neq", "lt", "order", "limit"]) {
    chain[name] = vi.fn((...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      if (name !== "limit") return chain;
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    });
  }
  const from = vi.fn(() => chain);
  return { client: { from } as unknown as SupabaseClient, calls, from };
}

afterEach(() => { vi.restoreAllMocks(); });

describe("loadSimilarEarlierAnalysis", () => {
  it("returns the most recent similar analysis of the same account", async () => {
    const { client } = stubClient({ data: [row("run-unrelated", "2026-10-05T00:00:00Z", ["전혀 다른 글입니다. ".repeat(12)]), row("run-similar", "2026-10-04T00:00:00Z", answers), row("run-older", "2026-09-01T00:00:00Z", answers)], error: null });
    expect(await loadSimilarEarlierAnalysis(client, input)).toEqual({ analysisRunId: "run-similar", analyzedAt: "2026-10-04T00:00:00Z" });
  });

  it("asks only for this account's earlier, other analyses and only a few of them", async () => {
    const { client, calls, from } = stubClient({ data: [], error: null });
    await loadSimilarEarlierAnalysis(client, input);
    expect(from).toHaveBeenCalledWith("analysis_results");
    expect(calls.eq).toEqual([["owner_user_id", "owner-1"]]);
    expect(calls.neq).toEqual([["analysis_run_id", "run-now"]]);
    expect(calls.lt).toEqual([["created_at", "2026-10-06T00:00:00Z"]]);
    expect(calls.order).toEqual([["created_at", { ascending: false }]]);
    expect(calls.limit).toEqual([[10]]);
    // 문항 본문만 읽는다(결과 전체가 아니라).
    expect(String(calls.select?.[0]?.[0])).toContain("result_data->questions");
    expect(String(calls.select?.[0]?.[0])).not.toMatch(/result_data\s*(,|$)/);
  });

  it("returns null when there is nothing similar", async () => {
    const { client } = stubClient({ data: [row("run-unrelated", "2026-10-05T00:00:00Z", ["전혀 다른 글입니다. ".repeat(12)])], error: null });
    expect(await loadSimilarEarlierAnalysis(client, input)).toBeNull();
  });

  it("never breaks the result page: a failed lookup is just no notice", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loadSimilarEarlierAnalysis(stubClient({ data: null, error: { code: "42501" } }).client, input)).toBeNull();
    expect(await loadSimilarEarlierAnalysis(stubClient(new Error("network down")).client, input)).toBeNull();
    const broken = { from: () => { throw new Error("client exploded"); } } as unknown as SupabaseClient;
    expect(await loadSimilarEarlierAnalysis(broken, input)).toBeNull();
    expect(log).toHaveBeenCalledTimes(3);
    // 로그에는 글 내용이 들어가지 않는다.
    expect(JSON.stringify(log.mock.calls)).not.toContain("한빛지역개발공사");
  });

  it("skips rows that are not shaped like stored results", async () => {
    const { client } = stubClient({ data: [{ analysis_run_id: "run-bad", created_at: "2026-10-05T00:00:00Z", questions: "not-an-array" }, null, row("run-similar", "2026-10-04T00:00:00Z", answers)], error: null });
    expect(await loadSimilarEarlierAnalysis(client, input)).toMatchObject({ analysisRunId: "run-similar" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RESEARCH_CONSENT_VERSION } from "@/domain/deidentify";
const mocks = vi.hoisted(() => ({ client: vi.fn(), start: vi.fn(), poll: vi.fn() }));
vi.mock("./admin-repository", () => ({ serviceClient: mocks.client, getAnalysis: vi.fn() }));
vi.mock("@/server/ai/quick/editing-experiment-gateway", () => ({ EditingExperimentGateway: class { start = mocks.start; poll = mocks.poll; } }));
import { advanceEditingExperiment, resolveExperimentEvidence } from "./editing-experiments";
const id = "11111111-1111-4111-8111-111111111111";
let row: Record<string, unknown>;
let consent: boolean;
let denyClaim: boolean;
let failReceiptSave: boolean;
const writes: string[] = [];

/** Tiny deterministic PostgREST fake, including compare-and-swap semantics. */
function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let patch: Record<string, unknown> | undefined;
  const execute = () => {
    if (table === "research_consents") return { data: { granted: consent, consent_version: RESEARCH_CONSENT_VERSION, revoked_at: consent ? null : "now" }, error: null };
    if (table === "research_snapshots") return { data: consent ? { id } : null, error: null };
    if (table !== "admin_editing_experiments") throw new Error(`Unexpected table ${table}`);
    if (patch) {
      if (denyClaim && patch.state === "STARTING") return { data: null, error: null };
      if (failReceiptSave && patch.response_id) return { data: null, error: { code: "network" } };
      if (!filters.every(([key, value]) => row[key] === value)) return { data: null, error: null };
      writes.push(table); row = { ...row, ...patch, updated_at: new Date().toISOString() };
    }
    return { data: { ...row }, error: null };
  };
  const chain = {
    select: () => chain,
    eq: (key: string, value: unknown) => { filters.push([key, value]); return chain; },
    update: (value: Record<string, unknown>) => { patch = value; return chain; },
    maybeSingle: async () => execute(),
    then: (resolve: (value: ReturnType<typeof execute>) => unknown) => Promise.resolve(execute()).then(resolve),
  };
  return chain;
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("ADMIN_EDITING_EXPERIMENTS_ENABLED", "on"); vi.stubEnv("OPENAI_API_KEY", "mock");
  consent = true; denyClaim = false; failReceiptSave = false; writes.length = 0;
  row = { id, snapshot_id: id, analysis_run_id: id, owner_user_id: id, consent_version: RESEARCH_CONSENT_VERSION, mode: "SENTENCE", model: "test",
    state: "PREPARED", redacted_input: { company: "회사", role: "업무", sourcePromptVersion: "quick-4.5", questions: [{ order: 1, prompt: "경험", targetLength: 500, original: "보고햇습니다.", delivered: "보고햇습니다.", rejected: "총괄했습니다.", rejectionReason: "직책 날조", eligible: true }] },
    proposal: null, review: null, final_review: null, combined: null, response_id: null, usage: [], error_code: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  mocks.client.mockReturnValue({ from: query }); mocks.start.mockResolvedValue("resp_new");
});
describe("관리자 시험 유료 호출과 저장 분리", () => {
  it("완료 시 writer ID만 남은 분석도 저장된 reviewer ID로 원래 증거를 찾는다", () => {
    expect(resolveExperimentEvidence("resp_writer", "resp_review")).toEqual({ writerId: "resp_writer", reviewId: "resp_review" });
    expect(resolveExperimentEvidence("quality-v1|resp_writer|resp_review", "resp_review")).toEqual({ writerId: "resp_writer", reviewId: "resp_review" });
    expect(() => resolveExperimentEvidence("quality-v1|resp_writer|resp_other", "resp_review")).toThrow();
    expect(() => resolveExperimentEvidence("resp_writer", "")).toThrow();
  });
  it("꺼짐/동의 철회는 유료 호출 전 차단", async () => {
    vi.stubEnv("ADMIN_EDITING_EXPERIMENTS_ENABLED", "off");
    await expect(advanceEditingExperiment(id, "start", "PREPARED")).rejects.toThrow("DISABLED");
    vi.stubEnv("ADMIN_EDITING_EXPERIMENTS_ENABLED", "on"); consent = false;
    await expect(advanceEditingExperiment(id, "start", "PREPARED")).rejects.toThrow("NO_CONSENT");
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("중복 클릭/오래된 단계 요청은 다음 유료 단계를 시작하지 않는다", async () => {
    await advanceEditingExperiment(id, "start", "PREPARED");
    await advanceEditingExperiment(id, "start", "PREPARED");
    row.state = "PROPOSED";
    await advanceEditingExperiment(id, "start", "PREPARED");
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(writes.every(table => table === "admin_editing_experiments")).toBe(true);
  });
  it("다른 요청이 선점한 경우 호출하지 않는다", async () => {
    denyClaim = true; await advanceEditingExperiment(id, "start", "PREPARED");
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("응답 ID 저장이 실패해도 재구매하지 않는다", async () => {
    failReceiptSave = true;
    expect((await advanceEditingExperiment(id, "start", "PREPARED")).state).toBe("UNCERTAIN");
    await advanceEditingExperiment(id, "start", "PREPARED");
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });
  it("틀린 출력에도 이미 소비한 토큰을 기록한다", async () => {
    row.state = "GENERATING"; row.response_id = "resp_new";
    mocks.poll.mockResolvedValue({ envelope: { status: "completed", usage: { input_tokens: 50, output_tokens: 20, total_tokens: 70 } }, text: "not json" });
    const result = await advanceEditingExperiment(id, "poll");
    expect(result.state).toBe("FAILED"); expect(result.usage[0].totalTokens).toBe(70);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("조회가 끝나도 다음 검토를 자동 구매하지 않는다", async () => {
    row.state = "GENERATING"; row.response_id = "resp_new";
    mocks.poll.mockResolvedValue({ envelope: { status: "completed", usage: null }, text: JSON.stringify({ edits: [{ id: 1, order: 1, source: "보고햇습니다.", replacement: "보고했습니다.", reason: "오탈자" }] }) });
    expect((await advanceEditingExperiment(id, "poll")).state).toBe("PROPOSED");
    expect(mocks.start).not.toHaveBeenCalled();
  });
});

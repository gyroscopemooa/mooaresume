import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { data: unknown; error: unknown };

/**
 * Keyed by table plus the status being asked for, because analysis_runs is
 * queried twice with opposite intents: RUNNING for the finishing batch,
 * PENDING for the paid-but-never-started recovery.
 */
const responses = new Map<string, QueryResult>();
const queries: Array<{ table: string; filters: Record<string, unknown> }> = [];

function queryBuilder(table: string) {
  const filters: Record<string, unknown> = {};
  const chain = {
    select: () => chain,
    eq: (column: string, value: unknown) => { filters[`eq:${column}`] = value; return chain; },
    in: (column: string, values: unknown[]) => { filters[`in:${column}`] = values; return chain; },
    order: (column: string) => { filters.order = column; return chain; },
    limit: (value: number) => { filters.limit = value; return chain; },
    then: (resolve: (result: QueryResult) => unknown) => {
      queries.push({ table, filters });
      const key = `${table}#${String(filters["eq:status"] ?? "")}`;
      return Promise.resolve(responses.get(key) ?? { data: [], error: null }).then(resolve);
    },
  };
  return chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => queryBuilder(table),
    auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
  }),
}));

const begun: string[] = [];
const savedResponses: Array<{ analysisRunId: string; responseId: string }> = [];
const repositoryOwners: string[] = [];

vi.mock("@/server/analysis/supabase-quick-analysis-run-repository", () => ({
  SupabaseQuickAnalysisRunRepository: class {
    constructor(ownerUserId: string) { repositoryOwners.push(ownerUserId); }
    async begin(analysisRunId: string) {
      begun.push(analysisRunId);
      return { analysisRunId, request: { requestId: analysisRunId } };
    }
    async saveBackgroundResponse(analysisRunId: string, responseId: string) {
      savedResponses.push({ analysisRunId, responseId });
    }
  },
}));

vi.mock("@/server/ai/quick/openai-responses-gateway", () => ({
  OpenAIResponsesGateway: class {
    async startBackground() { return "resp_recovered"; }
  },
}));

const { POST } = await import("./route");

function request(headers: Record<string, string> = {}) {
  return new NextRequest("https://mooaresume.com/api/analysis-runs/advance", { method: "POST", headers });
}

describe("예약 진행 엔드포인트 접근 제어", () => {
  it("비밀이 설정되지 않으면 아무도 통과시키지 않는다", async () => {
    // A missing setting must be a refusal, never an open endpoint.
    delete process.env.ANALYSIS_CRON_SECRET;

    const response = await POST(request({ authorization: "Bearer anything" }));
    expect(response.status).toBe(503);
  });

  it("비밀이 틀리면 거부한다", async () => {
    process.env.ANALYSIS_CRON_SECRET = "correct-secret";

    expect((await POST(request())).status).toBe(401);
    expect((await POST(request({ authorization: "Bearer wrong" }))).status).toBe(401);
  });
});

describe("결제됐지만 시작되지 않은 분석 되살리기", () => {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

  beforeEach(() => {
    responses.clear();
    queries.length = 0;
    begun.length = 0;
    savedResponses.length = 0;
    repositoryOwners.length = 0;
    process.env.ANALYSIS_CRON_SECRET = "correct-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "secret";
    process.env.OPENAI_API_KEY = "key";
    process.env.OPENAI_MODEL = "gpt-test";
    responses.set("analysis_runs#RUNNING", { data: [], error: null });
    responses.set("analysis_entitlements#ACTIVE", {
      data: [{ application_case_id: "case-1", owner_user_id: "owner-1", product: "QUICK", created_at: hourAgo }],
      error: null,
    });
  });

  function authorized() {
    return POST(request({ authorization: "Bearer correct-secret" }));
  }

  it("결제된 PENDING 실행을 시작하고 방치된 실행은 건너뛴다", async () => {
    // The stranded 19:34 order: entitlement ACTIVE, checkout SUCCEEDED, run
    // still PENDING because the customer had already closed the tab.
    responses.set("analysis_runs#PENDING", {
      data: [
        { id: "abandoned", application_case_id: "case-1", owner_user_id: "owner-1", product: "QUICK", created_at: hourAgo },
        { id: "paid", application_case_id: "case-1", owner_user_id: "owner-1", product: "QUICK", created_at: hourAgo },
      ],
      error: null,
    });
    responses.set("checkout_intents#SUCCEEDED", { data: [{ analysis_run_id: "paid" }], error: null });

    const body = await (await authorized()).json();

    expect(begun).toEqual(["paid"]);
    expect(savedResponses).toEqual([{ analysisRunId: "paid", responseId: "resp_recovered" }]);
    expect(repositoryOwners).toEqual(["owner-1"]);
    expect(body.started).toEqual([{ analysisRunId: "paid", outcome: "START_RECOVERED" }]);
  });

  it("결제 흔적이 없으면 아무 실행도 시작하지 않는다", async () => {
    responses.set("analysis_runs#PENDING", {
      data: [{ id: "abandoned", application_case_id: "case-1", owner_user_id: "owner-1", product: "QUICK", created_at: hourAgo }],
      error: null,
    });
    responses.set("checkout_intents#SUCCEEDED", { data: [], error: null });

    const body = await (await authorized()).json();

    expect(begun).toEqual([]);
    expect(body.started).toEqual([]);
  });

  it("미소비 이용권이 없으면 PENDING 실행을 조회조차 하지 않는다", async () => {
    // Abandoned checkouts pile up forever; nothing should walk that table when
    // there is no unspent payment to explain a stranded run.
    responses.set("analysis_entitlements#ACTIVE", { data: [], error: null });

    await authorized();

    expect(queries.filter((query) => query.filters["eq:status"] === "PENDING")).toEqual([]);
  });

  it("되살리기가 실패해도 진행 중 분석 처리는 200으로 끝난다", async () => {
    // The RUNNING batch is counting down to a refund deadline; a fault in the
    // newer half must not take the backstop down with it.
    responses.set("analysis_entitlements#ACTIVE", { data: null, error: { code: "PGRST301" } });

    const response = await authorized();

    expect(response.status).toBe(200);
    expect((await response.json()).started).toEqual([]);
  });
});

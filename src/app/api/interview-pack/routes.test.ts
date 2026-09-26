import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import { MemoryPackRepository, makeRun } from "@/server/interview-pack/memory-repository";

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string | null } | null,
  admin: false,
  repo: null as unknown,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }),
}));
vi.mock("@/server/admin/admin-session", () => ({ isAdminRequest: () => state.admin, isAdmin: async () => state.admin }));
vi.mock("@/server/interview-pack/supabase-repository", () => ({ SupabasePackRepository: class { constructor() { return state.repo as object; } } }));

import { GET as getRoot, POST as postRoot } from "./route";
import { GET as getPack } from "./[packId]/route";
import { POST as postMaterials } from "./[packId]/materials/route";
import { POST as postCheck } from "./[packId]/check/route";
import { POST as postGenerate } from "./[packId]/generate/route";
import { GET as getAnswers, POST as postAnswers } from "./[packId]/answers/route";

const OWNER = { id: "11111111-1111-4111-8111-111111111111", email: "owner@example.com" };
const STRANGER = { id: "22222222-2222-4222-8222-222222222222", email: "stranger@example.com" };
const TESTER = { id: "33333333-3333-4333-8333-333333333333", email: "tester@example.com" };
const RUN = "44444444-4444-4444-8444-444444444444";
const TEST_RUN = "55555555-5555-4555-8555-555555555555";
const QUICK_RUN = "66666666-6666-4666-8666-666666666666";

let repo: MemoryPackRepository;
let realPackId: string;
let testPackId: string;
let snapshotPackId: string;

function req(path: string, init: { method?: string; body?: unknown; origin?: string } = {}) {
  return new NextRequest(`https://mooaresume.test${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...(init.origin ? { origin: init.origin } : {}) },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
}
const ctx = (packId: string) => ({ params: Promise.resolve({ packId }) });

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_INTERVIEW_PACK", "1");
  vi.stubEnv("INTERVIEW_PACK_ELIGIBLE_FROM", "all");
  vi.stubEnv("FINAL_TEST_ACCOUNT_EMAILS", "tester@example.com");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  repo = new MemoryPackRepository();
  state.repo = repo;
  state.user = OWNER;
  state.admin = false;
  const docs = getPackSample("complete")!.docs;
  repo.addRun(RUN, makeRun({ ownerUserId: OWNER.id, docs, company: "C", role: "R" }));
  repo.addRun(TEST_RUN, makeRun({ ownerUserId: TESTER.id, docs, accessSource: "admin_test", company: "C", role: "R" }));
  repo.addRun(QUICK_RUN, makeRun({ ownerUserId: OWNER.id, docs, product: "QUICK" }));
  realPackId = (await repo.createPack({ ownerUserId: OWNER.id, analysisRunId: RUN, materials: { schema: 1, baseVersion: null, documents: docs, base: { company: "C", role: "R" }, supplements: {}, slotAnswers: [], confirmations: [] }, limits: { initial: 1, edit: 3, check: 5, complete: 6 } })).packId;
  testPackId = (await repo.createPack({ ownerUserId: TESTER.id, analysisRunId: TEST_RUN, materials: { schema: 1, baseVersion: null, documents: docs, base: { company: "C", role: "R" }, supplements: {}, slotAnswers: [], confirmations: [] }, limits: { initial: 1, edit: 3, check: 5, complete: 6 } })).packId;
  snapshotPackId = (await repo.createAdminSnapshotPack({ ownerUserId: TESTER.id, materials: { schema: 1, baseVersion: null, documents: docs, base: { company: "C", role: "R" }, supplements: {}, slotAnswers: [], confirmations: [] }, limits: { initial: 1, edit: 3, check: 5, complete: 6 }, label: "A", clonedFromRunId: null })).packId;
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("로그인·출처", () => {
  it("로그인하지 않으면 모든 팩 API 가 401 이다", async () => {
    state.user = null;
    expect((await getRoot(req(`/api/interview-pack?analysisRunId=${RUN}`))).status).toBe(401);
    expect((await postRoot(req("/api/interview-pack", { method: "POST", body: { analysisRunId: RUN } }))).status).toBe(401);
    expect((await getPack(req(`/api/interview-pack/${realPackId}`), ctx(realPackId))).status).toBe(401);
    expect((await postCheck(req(`/api/interview-pack/${realPackId}/check`, { method: "POST", body: { requestKey: "abcdefgh1" } }), ctx(realPackId))).status).toBe(401);
    expect((await postGenerate(req(`/api/interview-pack/${realPackId}/generate`, { method: "POST", body: { requestKey: "abcdefgh1", mode: "initial" } }), ctx(realPackId))).status).toBe(401);
    expect((await postAnswers(req(`/api/interview-pack/${realPackId}/answers`, { method: "POST", body: { action: "edit", slot: "intro_30", baseRevision: 1, answer: "가나다라마바사아자차" } }), ctx(realPackId))).status).toBe(401);
    expect((await postMaterials(req(`/api/interview-pack/${realPackId}/materials`, { method: "POST", body: {} }), ctx(realPackId))).status).toBe(401);
  });

  it("다른 출처에서 온 요청은 403 이다", async () => {
    const response = await postCheck(req(`/api/interview-pack/${realPackId}/check`, { method: "POST", body: { requestKey: "abcdefgh1" }, origin: "https://evil.example" }), ctx(realPackId));
    expect(response.status).toBe(403);
  });

  it("모든 응답은 캐시하지 않는다(사용자·팩별 데이터가 섞이지 않게)", async () => {
    const response = await getPack(req(`/api/interview-pack/${realPackId}`), ctx(realPackId));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const missing = await getPack(req("/api/interview-pack/not-a-uuid"), ctx("not-a-uuid"));
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toContain("no-store");
  });
});

describe("공개 플래그와 소유권", () => {
  it("플래그가 꺼져 있으면 소유자에게도 404 로 감춘다", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_INTERVIEW_PACK", "");
    expect((await getPack(req(`/api/interview-pack/${realPackId}`), ctx(realPackId))).status).toBe(404);
    expect((await getRoot(req(`/api/interview-pack?analysisRunId=${RUN}`))).status).toBe(404);
    expect((await postRoot(req("/api/interview-pack", { method: "POST", body: { analysisRunId: RUN } }))).status).toBe(404);
  });

  it("플래그가 켜져 있으면 소유자는 자기 팩을 읽는다", async () => {
    const response = await getPack(req(`/api/interview-pack/${realPackId}`), ctx(realPackId));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state.pack.id).toBe(realPackId);
    expect(body.state.pack.isTest).toBe(false);
  });

  it("다른 사용자는 남의 팩을 읽거나 바꿀 수 없고 존재 자체를 알 수 없다", async () => {
    state.user = STRANGER;
    const ownerResponse = await getPack(req(`/api/interview-pack/${realPackId}`), ctx(realPackId));
    expect(ownerResponse.status).toBe(404);
    expect(await ownerResponse.json()).toEqual({ error: "찾을 수 없습니다." });
    expect((await postCheck(req(`/api/interview-pack/${realPackId}/check`, { method: "POST", body: { requestKey: "abcdefgh1" } }), ctx(realPackId))).status).toBe(404);
    expect((await postAnswers(req(`/api/interview-pack/${realPackId}/answers`, { method: "POST", body: { action: "restore", slot: "intro_30", revisionNo: 1, baseRevision: 2 } }), ctx(realPackId))).status).toBe(404);
    expect((await getAnswers(req(`/api/interview-pack/${realPackId}/answers?slot=intro_30`), ctx(realPackId))).status).toBe(404);
    // 남의 FINAL 실행으로 팩을 열려는 시도도 막힌다.
    expect((await postRoot(req("/api/interview-pack", { method: "POST", body: { analysisRunId: RUN } }))).status).toBe(404);
  });

  it("QUICK 실행으로는 새 팩을 만들 수 없다", async () => {
    const response = await postRoot(req("/api/interview-pack", { method: "POST", body: { analysisRunId: QUICK_RUN } }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("NOT_FINAL");
  });

  it("조회는 팩을 만들지 않고, 열기만 만든다", async () => {
    repo.packs.delete(realPackId);
    const peek = await getRoot(req(`/api/interview-pack?analysisRunId=${RUN}`));
    expect(peek.status).toBe(200);
    expect((await peek.json()).state).toBeNull();
    expect(repo.packs.size).toBe(2);
    const opened = await postRoot(req("/api/interview-pack", { method: "POST", body: { analysisRunId: RUN } }));
    expect(opened.status).toBe(200);
    expect(repo.packs.size).toBe(3);
  });
});

describe("테스트 팩 접근", () => {
  it("승인된 테스트 계정은 플래그가 꺼져 있어도 자기 테스트 이용권 팩을 쓴다", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_INTERVIEW_PACK", "");
    state.user = TESTER;
    const response = await getPack(req(`/api/interview-pack/${testPackId}`), ctx(testPackId));
    expect(response.status).toBe(200);
    expect((await response.json()).state.pack.accessSource).toBe("admin_test");
  });

  it("승인 목록에 없는 계정은 이용권 팩이 자기 것이어도 열 수 없다(이메일 문자열만으로는 통과하지 못한다)", async () => {
    state.user = { id: TESTER.id, email: "someone-else@example.com" };
    expect((await getPack(req(`/api/interview-pack/${testPackId}`), ctx(testPackId))).status).toBe(404);
    state.user = { id: TESTER.id, email: null };
    expect((await getPack(req(`/api/interview-pack/${testPackId}`), ctx(testPackId))).status).toBe(404);
  });

  it("허용 목록 환경변수가 비어 있으면 테스트 팩은 아무도 열 수 없다", async () => {
    vi.stubEnv("FINAL_TEST_ACCOUNT_EMAILS", "");
    state.user = TESTER;
    expect((await getPack(req(`/api/interview-pack/${testPackId}`), ctx(testPackId))).status).toBe(404);
  });

  it("관리자 스냅샷 팩은 관리자 쿠키가 없으면 승인된 계정도 열 수 없다", async () => {
    state.user = TESTER;
    state.admin = false;
    expect((await getPack(req(`/api/interview-pack/${snapshotPackId}`), ctx(snapshotPackId))).status).toBe(404);
    state.admin = true;
    expect((await getPack(req(`/api/interview-pack/${snapshotPackId}`), ctx(snapshotPackId))).status).toBe(200);
  });

  it("관리자 쿠키만 있고 승인된 계정이 아니면 열 수 없다", async () => {
    state.user = { id: TESTER.id, email: "not-approved@example.com" };
    state.admin = true;
    expect((await getPack(req(`/api/interview-pack/${snapshotPackId}`), ctx(snapshotPackId))).status).toBe(404);
  });

  it("테스트 팩은 공개 플래그를 켜도 일반 사용자에게 열리지 않는다", async () => {
    state.user = STRANGER;
    expect((await getPack(req(`/api/interview-pack/${testPackId}`), ctx(testPackId))).status).toBe(404);
  });
});

describe("요청 검증과 AI 미설정", () => {
  it("잘못된 본문은 400 이고 AI 나 저장소를 건드리지 않는다", async () => {
    const before = repo.ledger.length;
    expect((await postCheck(req(`/api/interview-pack/${realPackId}/check`, { method: "POST", body: {} }), ctx(realPackId))).status).toBe(400);
    expect((await postGenerate(req(`/api/interview-pack/${realPackId}/generate`, { method: "POST", body: { requestKey: "abcdefgh1", mode: "everything" } }), ctx(realPackId))).status).toBe(400);
    expect((await postAnswers(req(`/api/interview-pack/${realPackId}/answers`, { method: "POST", body: { action: "delete" } }), ctx(realPackId))).status).toBe(400);
    expect(repo.ledger.length).toBe(before);
  });

  it("AI 설정이 없으면 점검은 503 으로 안내하고 읽기는 계속 된다", async () => {
    const check = await postCheck(req(`/api/interview-pack/${realPackId}/check`, { method: "POST", body: { requestKey: "abcdefgh1" } }), ctx(realPackId));
    expect(check.status).toBe(503);
    expect((await check.json()).code).toBe("AI_UNAVAILABLE");
    expect((await getPack(req(`/api/interview-pack/${realPackId}`), ctx(realPackId))).status).toBe(200);
  });

  it("오류 응답에는 자료 원문이 들어 있지 않다", async () => {
    const check = await postCheck(req(`/api/interview-pack/${realPackId}/check`, { method: "POST", body: { requestKey: "abcdefgh1" } }), ctx(realPackId));
    const text = JSON.stringify(await check.json());
    expect(text).not.toContain("검사보조");
    expect(text).not.toContain("샘플파트");
  });

  it("사용량이 없는 상태에서 생성 요청은 자료 점검이 먼저라는 안내를 받는다", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const generate = await postGenerate(req(`/api/interview-pack/${realPackId}/generate`, { method: "POST", body: { requestKey: "abcdefgh1", mode: "initial" } }), ctx(realPackId));
    expect(generate.status).toBe(409);
    expect((await generate.json()).code).toBe("NEEDS_CHECK");
  });
});

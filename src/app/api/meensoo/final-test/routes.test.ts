import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { MemoryPackRepository } from "@/server/interview-pack/memory-repository";

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string | null } | null,
  admin: false,
  repo: null as unknown,
  store: null as unknown,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }),
}));
vi.mock("@/server/admin/admin-session", () => ({ isAdminRequest: () => state.admin, isAdmin: async () => state.admin }));
vi.mock("@/server/interview-pack/supabase-repository", () => ({ SupabasePackRepository: class { constructor() { return state.repo as object; } } }));
vi.mock("@/server/interview-pack/supabase-admin-test-store", () => ({ SupabaseAdminTestStore: class { constructor() { return state.store as object; } } }));

import { POST as postPacks } from "./packs/route";
import { POST as postReset } from "./packs/reset/route";
import { GET as getSets, POST as postSets, DELETE as deleteSets } from "./material-sets/route";
import { GET as getGrants, POST as postGrant } from "./grants/route";
import { POST as postRevoke } from "./grants/revoke/route";
import { GET as getSample } from "./sample-file/route";

const ADMIN_TESTER = { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.com" };
const STRANGER = { id: "22222222-2222-4222-8222-222222222222", email: "stranger@example.com" };

const issueCalls: unknown[] = [];
const store = {
  listSets: async () => [],
  getSet: async () => null,
  saveSet: async () => ({ id: "99999999-9999-4999-8999-999999999999" }),
  deleteSet: async () => true,
  findUserIdByEmail: async (email: string) => (email === "admin@example.com" ? ADMIN_TESTER.id : null),
  issueGrant: async (input: unknown) => { issueCalls.push(input); return { grantId: "88888888-8888-4888-8888-888888888888", expiresAt: "2026-09-27T00:00:00Z", maxUses: 2 }; },
  revokeGrant: async () => ({ entitlementsRevoked: 0 }),
  listGrants: async () => [],
};

function req(path: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(`https://mooaresume.test${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json" },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
}

/** 관리자 문을 통과하지 못하면 이유를 알리지 않는 404 여야 하는 모든 진입점. */
const entrances: Array<[string, () => Promise<Response>]> = [
  ["POST packs", () => postPacks(req("/api/meensoo/final-test/packs", { method: "POST", body: { source: "sample", sampleId: "complete" } }))],
  ["POST packs/reset", () => postReset(req("/api/meensoo/final-test/packs/reset", { method: "POST", body: { packIds: ["44444444-4444-4444-8444-444444444444"] } }))],
  ["GET material-sets", () => getSets(req("/api/meensoo/final-test/material-sets"))],
  ["POST material-sets", () => postSets(req("/api/meensoo/final-test/material-sets", { method: "POST", body: { name: "x", docs: [{ kind: "note", title: "t", text: "내용" }] } }))],
  ["DELETE material-sets", () => deleteSets(req("/api/meensoo/final-test/material-sets", { method: "DELETE", body: { setId: "44444444-4444-4444-8444-444444444444" } }))],
  ["GET grants", () => getGrants(req("/api/meensoo/final-test/grants"))],
  ["POST grants", () => postGrant(req("/api/meensoo/final-test/grants", { method: "POST", body: { targetEmail: "admin@example.com" } }))],
  ["POST grants/revoke", () => postRevoke(req("/api/meensoo/final-test/grants/revoke", { method: "POST", body: { grantId: "88888888-8888-4888-8888-888888888888" } }))],
  ["GET sample-file", () => getSample(req("/api/meensoo/final-test/sample-file?id=complete"))],
];

beforeEach(() => {
  vi.stubEnv("FINAL_TEST_ACCOUNT_EMAILS", "admin@example.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.repo = new MemoryPackRepository();
  state.store = store;
  state.user = ADMIN_TESTER;
  state.admin = true;
  issueCalls.length = 0;
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("관리자 테스트 API 는 일반 사용자에게 존재하지 않는다", () => {
  it.each(entrances)("%s — 관리자 쿠키가 없으면 로그인한 승인 계정이어도 404", async (_name, call) => {
    state.admin = false;
    const response = await call();
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it.each(entrances)("%s — 관리자여도 로그인하지 않았으면 404", async (_name, call) => {
    state.user = null;
    expect((await call()).status).toBe(404);
  });

  it.each(entrances)("%s — 관리자여도 승인된 테스트 계정이 아니면 404", async (_name, call) => {
    state.user = STRANGER;
    expect((await call()).status).toBe(404);
  });

  it.each(entrances)("%s — 승인 목록 환경변수가 비어 있으면 404", async (_name, call) => {
    vi.stubEnv("FINAL_TEST_ACCOUNT_EMAILS", "");
    expect((await call()).status).toBe(404);
  });

  it("URL 파라미터·헤더로 관리자인 척해도 통하지 않는다(서버가 쿠키 검증 결과만 본다)", async () => {
    state.admin = false;
    const response = await postGrant(new NextRequest("https://mooaresume.test/api/meensoo/final-test/grants?isAdmin=1&admin=true", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin": "true", "x-is-admin": "1" },
      body: JSON.stringify({ targetEmail: "admin@example.com", isAdmin: true }),
    }));
    expect(response.status).toBe(404);
    expect(issueCalls).toHaveLength(0);
  });
});

describe("관리자 + 승인된 테스트 계정이면 동작한다", () => {
  it("샘플로 테스트 팩을 만들고 주인은 로그인한 계정이다", async () => {
    const response = await postPacks(req("/api/meensoo/final-test/packs", { method: "POST", body: { source: "sample", sampleId: "conflicting" } }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toBe(`/meensoo/final-test/pack/${body.packId}`);
    const pack = await (state.repo as MemoryPackRepository).getPack(ADMIN_TESTER.id, body.packId);
    expect(pack?.isTest).toBe(true);
  });

  it("요청 본문으로 다른 계정을 지정해도 무시된다(승인 목록 밖 발급은 거절)", async () => {
    const denied = await postGrant(req("/api/meensoo/final-test/grants", { method: "POST", body: { targetEmail: "stranger@example.com" } }));
    expect(denied.status).toBe(403);
    expect((await denied.json()).code).toBe("NOT_APPROVED");
    expect(issueCalls).toHaveLength(0);
    const allowed = await postGrant(req("/api/meensoo/final-test/grants", { method: "POST", body: { targetEmail: "admin@example.com", maxUses: 1 } }));
    expect(allowed.status).toBe(201);
    expect(issueCalls).toHaveLength(1);
    expect(issueCalls[0]).toMatchObject({ targetUserId: ADMIN_TESTER.id, issuedByUserId: ADMIN_TESTER.id, maxUses: 1 });
  });

  it("샘플 TXT 는 UTF-8 첨부 파일로 내려오고 세 개만 있다", async () => {
    const response = await getSample(req("/api/meensoo/final-test/sample-file?id=complete"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("01_complete_materials.txt");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const text = await response.text();
    expect(text).toContain("가상");
    expect(text).not.toContain("기대 동작");
    expect((await getSample(req("/api/meensoo/final-test/sample-file?id=../../etc/passwd"))).status).toBe(404);
    expect((await getSample(req("/api/meensoo/final-test/sample-file"))).status).toBe(404);
  });

  it("잘못된 입력은 400 이다", async () => {
    expect((await postPacks(req("/api/meensoo/final-test/packs", { method: "POST", body: { source: "everything" } }))).status).toBe(400);
    expect((await postReset(req("/api/meensoo/final-test/packs/reset", { method: "POST", body: { packIds: [] } }))).status).toBe(400);
    expect((await postRevoke(req("/api/meensoo/final-test/grants/revoke", { method: "POST", body: { grantId: "x" } }))).status).toBe(400);
  });
});

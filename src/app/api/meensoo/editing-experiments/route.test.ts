import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), list: vi.fn(), prepare: vi.fn(), advance: vi.fn() }));
vi.mock("@/server/admin/admin-session", () => ({ isAdminRequest: mocks.admin }));
vi.mock("@/server/admin/editing-experiments", () => ({ editingExperimentsEnabled: () => true, listEditingExperiments: mocks.list, prepareEditingExperiment: mocks.prepare, advanceEditingExperiment: mocks.advance }));
import { GET, POST } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
const url = "https://mooaresume.com/api/meensoo/editing-experiments";
function req(body: unknown, origin = "https://mooaresume.com") { return new Request(url, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.clearAllMocks(); mocks.admin.mockReturnValue(true); mocks.list.mockResolvedValue([]); mocks.prepare.mockResolvedValue({ id }); mocks.advance.mockResolvedValue({ id }); });
describe("관리자 시험 권한/비용 경계", () => {
  it("비관리자는 조회·준비·실행 모두 차단", async () => {
    mocks.admin.mockReturnValue(false);
    expect((await GET(new Request(`${url}?runId=${id}`))).status).toBe(401);
    expect((await POST(req({ action: "prepare", runId: id, mode: "REWRITE" }))).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("외부/누락 Origin은 차단", async () => {
    for (const origin of ["", "https://other.example", "http://mooaresume.com"]) expect((await POST(req({ action: "prepare", runId: id, mode: "SENTENCE" }, origin))).status).toBe(403);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("비용·비식별 확인 및 기대 단계가 없으면 호출하지 않음", async () => {
    expect((await POST(req({ action: "start", id }))).status).toBe(400);
    expect(mocks.advance).not.toHaveBeenCalled();
    await POST(req({ action: "start", id, expectedState: "PREPARED", confirmPaid: true, confirmRedaction: true }));
    expect(mocks.advance).toHaveBeenCalledWith(id, "start", "PREPARED");
  });
  it("일반 조회는 유료 진행 함수를 부르지 않고 캐시 금지", async () => {
    const r = await GET(new Request(`${url}?runId=${id}`));
    expect(r.status).toBe(200); expect(r.headers.get("cache-control")).toBe("no-store");
    expect(mocks.advance).not.toHaveBeenCalled();
  });
  it("내부 오류/문서 내용은 노출하지 않음", async () => {
    mocks.prepare.mockRejectedValue(new Error("private document secret"));
    const r = await POST(req({ action: "prepare", runId: id, mode: "REWRITE" }));
    expect(await r.text()).not.toContain("private document");
  });
});

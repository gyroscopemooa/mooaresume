import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), list: vi.fn(), create: vi.fn() }));
vi.mock("@/server/admin/admin-session", () => ({ isAdminRequest: mocks.admin }));
vi.mock("@/server/admin/admin-analysis-previews", () => ({
  listAdminAnalysisPreviews: mocks.list,
  createAdminAnalysisPreview: mocks.create,
}));
import { GET, POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const url = "https://mooaresume.com/api/meensoo/analysis-previews";
const body = { analysisRunId: id, title: "개선본", revisedAnswers: [{ questionOrder: 1, revisedAnswer: "개선한 답변" }], notes: "고객 미적용" };
const request = (value = body, origin = "https://mooaresume.com") => new Request(url, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(value) });

beforeEach(() => {
  vi.clearAllMocks(); mocks.admin.mockReturnValue(true); mocks.list.mockResolvedValue([]); mocks.create.mockResolvedValue({ id, ...body });
});

describe("관리자 개선본 권한 경계", () => {
  it("비관리자는 조회와 저장을 모두 차단한다", async () => {
    mocks.admin.mockReturnValue(false);
    expect((await GET(new Request(`${url}?runId=${id}`))).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });

  it("외부 Origin 저장을 차단한다", async () => {
    expect((await POST(request(body, "https://other.example"))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("관리자만 별도 개선본을 저장하며 고객 결과 갱신 함수는 호출하지 않는다", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(body);
  });

  it("빈 답변과 중복 문항 번호를 거부한다", async () => {
    expect((await POST(request({ ...body, revisedAnswers: [{ questionOrder: 1, revisedAnswer: "" }] }))).status).toBe(400);
    expect((await POST(request({ ...body, revisedAnswers: [{ questionOrder: 1, revisedAnswer: "가" }, { questionOrder: 1, revisedAnswer: "나" }] }))).status).toBe(400);
  });
});

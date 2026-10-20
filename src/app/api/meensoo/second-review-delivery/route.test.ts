import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), preview: vi.fn(), send: vi.fn(), record: vi.fn() }));
vi.mock("@/server/admin/admin-session", () => ({ isAdminRequest: mocks.admin }));
vi.mock("@/server/admin/admin-analysis-previews", () => ({ getAdminAnalysisPreview: mocks.preview }));
vi.mock("@/server/admin/admin-repository", () => ({ recordMailSends: mocks.record }));
vi.mock("@/server/notifications/manual-email", () => ({ sendManualEmail: mocks.send }));
import { POST } from "./route";
const body = { runId: "11111111-1111-4111-8111-111111111111", previewId: "22222222-2222-4222-8222-222222222222", requestId: "33333333-3333-4333-8333-333333333333", to: "test@example.com", expires: Date.now() + 86400_000, send: false };
const request = (value = body, origin = "https://mooaresume.com") => new Request("https://mooaresume.com/api/meensoo/second-review-delivery", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(value) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SECOND_REVIEW_SIGNING_SECRET", "test-only-secret-for-delivery");
  mocks.admin.mockReturnValue(true);
  mocks.preview.mockResolvedValue({ revisedAnswers: [{ questionOrder: 1, revisedAnswer: "개선본", section: { title: "경험" } }] });
  mocks.send.mockResolvedValue({ sent: ["test@example.com"], failed: [], messageIds: { "test@example.com": "message-1" } });
});
describe("review delivery authorization and mail", () => {
  it("rejects unauthorized and cross-origin operations before any read or send", async () => {
    mocks.admin.mockReturnValue(false);
    expect((await POST(request())).status).toBe(401);
    mocks.admin.mockReturnValue(true);
    expect((await POST(request(body, "https://other.example"))).status).toBe(403);
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("prepares without sending", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).url).toMatch(/^https:\/\/mooaresume.com\/result\/second-review\//);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("sends only to the specified recipient with free-service wording and retry key", async () => {
    const response = await POST(request({ ...body, send: true }));
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: ["test@example.com"], subject: "[무아레쥬메] 추가 비용 없는 무료 2차 첨삭본을 전달드립니다", idempotencyKey: body.requestId,
      body: expect.stringContaining("무아레쥬메 AI 취업 컨설턴트의 검토 과정에서 기존 첨삭 결과의 일부 보완 사항이 확인되어 개선 작업을 진행하였습니다."),
    }));
    expect(mocks.record).toHaveBeenCalledOnce();
    const mailBody = mocks.send.mock.calls[0][0].body;
    expect(mailBody).toContain(`https://mooaresume.com/feedback/${body.runId}`);
    expect(mailBody).toContain("더 나은 첨삭을 위한 안내");
    expect(mailBody).toContain("지원서의 요구사항과 본인의 경험이 더욱 효과적으로 반영될 수 있도록 참고 사항을 정리했습니다. 다음 첨삭 요청 시 활용해 주세요.");
    expect(mailBody).toContain("지원서의 실제 질문을 문항별로");
    expect(mailBody).toContain("문항별 글자 제한");
    expect(mailBody).toContain("경험은 근무처별로");
    expect(mailBody).toContain("‘확인 필요’");
    expect(mailBody).toContain("채용공고와 지원서 양식");
    expect(mailBody).toContain("이미 후기를 남기셨다면");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/mentor-pool/repository", () => ({ saveMentorApplication: vi.fn(), takeMentorPoolLimit: vi.fn() }));
import { saveMentorApplication, takeMentorPoolLimit } from "@/server/mentor-pool/repository";
import { POST } from "./route";

const input = { submissionId: "10000000-0000-4000-8000-000000000001", kind: "mentee", name: "신청자", email: "person@example.com", headline: "일상을 나눌 사람", story: "누군가의 다양한 경험을 들어보고 싶습니다.", fields: [], mode: "online", region: "", availability: "", consent: true, website: "" };
function request(body: unknown = input, origin = "https://example.com") { return new Request("https://example.com/api/mentor-pool", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(takeMentorPoolLimit).mockResolvedValue(true); vi.mocked(saveMentorApplication).mockResolvedValue(); });
describe("모집 접수 API", () => {
  it.each(["https://attacker.example", "", "http://example.com"])("다른 출처/출처 누락을 거부한다 %s", async (origin) => { expect((await POST(request(input, origin))).status).toBe(403); expect(saveMentorApplication).not.toHaveBeenCalled(); });
  it("동의 없이는 저장하지 않는다", async () => { expect((await POST(request({ ...input, consent: false }))).status).toBe(400); expect(saveMentorApplication).not.toHaveBeenCalled(); });
  it("한도를 넘으면 저장하지 않는다", async () => { vi.mocked(takeMentorPoolLimit).mockResolvedValue(false); expect((await POST(request())).status).toBe(429); expect(saveMentorApplication).not.toHaveBeenCalled(); });
  it("크기 헤더가 없어도 큰 본문을 제한한다", async () => { expect((await POST(request({ ...input, story: "가".repeat(6000) }))).status).toBe(413); expect(saveMentorApplication).not.toHaveBeenCalled(); });
  it("저장 실패를 성공으로 표시하거나 내부 오류·개인정보를 반환하지 않는다", async () => { vi.mocked(saveMentorApplication).mockRejectedValue(new Error("secret person@example.com")); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("person@example.com"); });
  it("접수 결과만 반환하고 신청내용/이메일을 돌려주지 않는다", async () => { const response = await POST(request()); expect(response.status).toBe(201); expect(await response.json()).toEqual({ ok: true }); expect(saveMentorApplication).toHaveBeenCalledWith(input); });
});

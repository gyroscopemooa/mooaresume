import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/admin/admin-session", () => ({ isAdmin: vi.fn() }));
vi.mock("@/server/mentor-pool/repository", () => ({ updateMentorApplication: vi.fn(), deleteMentorApplication: vi.fn() }));
import { isAdmin } from "@/server/admin/admin-session";
import { updateMentorApplication, deleteMentorApplication } from "@/server/mentor-pool/repository";
import { PATCH, DELETE } from "./route";
const input = { id: "10000000-0000-4000-8000-000000000001", status: "waiting", note: "확인 중", updatedAt: "2026-10-28T00:00:00Z" };
function request(body: unknown = input, origin = "https://example.com", method = "PATCH") { return new Request("https://example.com/api/meensoo/mentor-pool", { method, headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(isAdmin).mockResolvedValue(true); vi.mocked(updateMentorApplication).mockResolvedValue(true); });
describe("모집 관리자 권한", () => {
  it("비관리자의 변경·삭제를 차단한다", async () => { vi.mocked(isAdmin).mockResolvedValue(false); expect((await PATCH(request())).status).toBe(401); expect((await DELETE(request())).status).toBe(401); expect(updateMentorApplication).not.toHaveBeenCalled(); expect(deleteMentorApplication).not.toHaveBeenCalled(); });
  it("관리자 쿠키가 있어도 교차 출처 변경을 차단한다", async () => { expect((await PATCH(request(input, "https://evil.example"))).status).toBe(403); expect((await DELETE(request(input, ""))).status).toBe(403); });
  it("낡은 편집이 다른 운영자의 메모를 덮어쓰지 않는다", async () => { vi.mocked(updateMentorApplication).mockResolvedValue(false); expect((await PATCH(request())).status).toBe(409); });
  it("상태와 메모만 변경한다", async () => { expect((await PATCH(request())).status).toBe(200); expect(updateMentorApplication).toHaveBeenCalledWith(input); expect((await PATCH(request({ ...input, email: "overwritten@example.com" }))).status).toBe(400); });
  it("정확한 삭제 확인 문구가 있어야 삭제한다", async () => { expect((await DELETE(request({ id: input.id, confirmation: "삭제" }))).status).toBe(400); expect(deleteMentorApplication).not.toHaveBeenCalled(); expect((await DELETE(request({ id: input.id, confirmation: "본인 확인 후 삭제" }))).status).toBe(200); });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/admin/admin-session", () => ({ isAdmin: vi.fn() }));
vi.mock("@/server/admin/admin-repository", () => ({ serviceClient: vi.fn() }));
import { isAdmin } from "@/server/admin/admin-session";
import { serviceClient } from "@/server/admin/admin-repository";
import { listMentorApplications, deleteMentorApplication, updateMentorApplication } from "./repository";
beforeEach(() => { vi.resetAllMocks(); vi.mocked(isAdmin).mockResolvedValue(false); });
describe("모집 데이터 경계", () => {
  it("페이지를 직접 호출해도 비관리자는 DB 조회 전에 차단한다", async () => {
    await expect(listMentorApplications()).rejects.toThrow("UNAUTHORIZED");
    expect(serviceClient).not.toHaveBeenCalled();
  });
  it("직접 호출한 변경·삭제도 관리자 확인을 요구한다", async () => {
    await expect(deleteMentorApplication("10000000-0000-4000-8000-000000000001")).rejects.toThrow("UNAUTHORIZED");
    await expect(updateMentorApplication({ id: "10000000-0000-4000-8000-000000000001", status: "closed", note: "", updatedAt: "2026-10-28T00:00:00Z" })).rejects.toThrow("UNAUTHORIZED");
    expect(serviceClient).not.toHaveBeenCalled();
  });
});

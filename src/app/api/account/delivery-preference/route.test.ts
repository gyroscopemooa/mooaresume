import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const { getUser, getUserById, updateUserById, service } = vi.hoisted(() => ({ getUser: vi.fn(), getUserById: vi.fn(), updateUserById: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: service }));
const id = "3b6a0483-61ba-4783-b6b9-458e2630cad1";
let user: { id: string; email?: string; email_confirmed_at?: string; app_metadata: Record<string, unknown> };
function request(body: unknown = { userId: id, dashboardOnly: true }, origin: string | null = "https://mooaresume.com") {
  return new Request("https://mooaresume.com/api/account/delivery-preference", { method: "POST", headers: { ...(origin ? { origin } : {}), "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "mock-secret");
  user = { id, app_metadata: { provider: "kakao", providers: ["kakao"], unrelated: "preserve" } };
  getUser.mockImplementation(async () => ({ data: { user }, error: null }));
  getUserById.mockImplementation(async () => ({ data: { user }, error: null }));
  updateUserById.mockImplementation(async (_id, attributes) => { user = { ...user, app_metadata: { ...user.app_metadata, ...attributes.app_metadata } }; return { data: { user }, error: null }; });
  service.mockReturnValue({ auth: { admin: { getUserById, updateUserById } } });
});
afterEach(() => vi.unstubAllEnvs());
describe("delivery preference API", () => {
  it("returns fresh authenticated state with no caching", async () => {
    const result = await GET();
    expect(await result.json()).toEqual({ userId: id, eligible: true, dashboardOnly: false, ready: false });
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(service).not.toHaveBeenCalled();
  });
  it("writes only server preference key and verifies persisted result", async () => {
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ userId: id, eligible: true, dashboardOnly: true, ready: true });
    expect(updateUserById).toHaveBeenCalledWith(id, { app_metadata: { mooa_delivery_preference: { version: 1, mode: "dashboard_only", user_id: id, updated_at: expect.any(String) } } });
    expect(getUserById).toHaveBeenCalledTimes(2);
    expect(user.app_metadata.unrelated).toBe("preserve");
  });
  it.each([null, "https://evil.example", "http://mooaresume.com", "https://mooaresume.com.evil", "https://mooaresume.com/path"])("rejects origin %s before auth/mutation", async (origin) => {
    expect((await POST(request(undefined, origin))).status).toBe(403);
    expect(getUser).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });
  it.each([{ userId: id, dashboardOnly: "true" }, { userId: "bad", dashboardOnly: true }, { userId: id, dashboardOnly: true, email: "invented@example.com" }])("rejects malformed payload", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(updateUserById).not.toHaveBeenCalled();
  });
  it("rejects switched identity", async () => {
    expect((await POST(request({ userId: "a5779a5b-cded-4dd4-a418-bf07300a0a74", dashboardOnly: true }))).status).toBe(409);
    expect(updateUserById).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated state", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET()).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
  });
  it.each(["google", "email"])("rejects noneligible %s", async (provider) => {
    user.app_metadata = { provider };
    expect((await POST(request())).status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });
  it("requires confirmed current email to re-enable email delivery", async () => {
    user.email = "unverified@example.com";
    expect((await POST(request({ userId: id, dashboardOnly: false }))).status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
    user.email_confirmed_at = "2026-11-11T00:00:00Z";
    expect((await POST(request({ userId: id, dashboardOnly: false }))).status).toBe(200);
    expect(user.app_metadata.mooa_delivery_preference).toMatchObject({ mode: "email" });
  });
  it("fails closed when admin lookup fails or persisted preference is not returned", async () => {
    getUserById.mockResolvedValueOnce({ data: { user: null }, error: new Error("private") });
    expect((await POST(request())).status).toBe(503);
    expect(updateUserById).not.toHaveBeenCalled();
    updateUserById.mockResolvedValue({ data: { user }, error: null });
    const result = await POST(request());
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("private");
  });
  it("does not use stale session verification for email mode", async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email: "old@example.com", email_confirmed_at: "2026-11-11" } }, error: null });
    expect((await POST(request({ userId: id, dashboardOnly: false }))).status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ client: vi.fn(), generate: vi.fn() }));
vi.mock("@/server/admin/admin-repository", () => ({ serviceClient: mocks.client }));
vi.mock("@/server/community/community-seed-content", () => ({ generateCommunitySeedContent: mocks.generate }));
import { POST } from "./route";

function request(token = "test-secret") {
  return new NextRequest("https://example.test/api/community/seed", { method: "POST", headers: { authorization: `Bearer ${token}` } });
}

function database(count: number | null, error: { message: string } | null = null) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ count, error }),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [] }),
  };
  const from = vi.fn().mockReturnValue(query);
  mocks.client.mockReturnValue({ from });
  return { from, query };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("COMMUNITY_SEED_CRON_SECRET", "test-secret");
  vi.stubEnv("COMMUNITY_SEED_ENABLED", "1");
  vi.stubEnv("COMMUNITY_SEED_USER_ID", "test-editor");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("COMMUNITY_SEED_MODEL", "test-model");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("daily community publication limit", () => {
  it.each([1, 2, 3])("skips AI generation when %i editorial posts already exist today", async (count) => {
    const { from } = database(count);
    const response = await POST(request());
    expect(await response.json()).toEqual({ skipped: "already_seeded_today", postsToday: count });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("allows generation when no post exists yet", async () => {
    const { query } = database(0);
    query.limit.mockResolvedValueOnce({ data: [{ title: "면접 복기", topic: "application" }] });
    // Stop before inserts: this verifies eligibility without making a paid call.
    mocks.generate.mockRejectedValueOnce(new Error("test generation stopped"));
    const response = await POST(request());
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith({
      apiKey: "test-key", model: "test-model", recentTitles: ["면접 복기"], recentTopics: ["application"],
    });
    expect(query.select).toHaveBeenCalledWith("title, topic");
    expect(response.status).toBe(502);
  });

  it("does not generate if today's count cannot be verified", async () => {
    database(null, { message: "count unavailable" });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects unauthorized requests before accessing the database", async () => {
    expect((await POST(request("invalid"))).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
});

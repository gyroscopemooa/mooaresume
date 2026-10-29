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
    insert: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

describe("three-day community publication limit", () => {
  it.each([1, 2, 3])("skips AI generation when %i editorial posts already exist in the three-day window", async (count) => {
    const { from } = database(count);
    const response = await POST(request());
    expect(await response.json()).toEqual({ skipped: "already_seeded_recently", postsInWindow: count });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("counts posts from the last three publication days, not just today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T00:00:05.000Z"));
    try {
      const { query } = database(1);
      await POST(request());
      expect(query.gte).toHaveBeenCalledWith("created_at", "2026-10-31T00:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a three-day cadence across month boundaries without making paid calls", async () => {
    vi.useFakeTimers();
    const published: string[] = [];
    try {
      for (let day = 0; day < 10; day++) {
        const now = new Date(Date.UTC(2026, 9, 29 + day, 0, 0, 5));
        vi.setSystemTime(now);
        const { query } = database(0);
        query.gte.mockImplementation(async (_column: string, since: string) => ({ count: published.filter((time) => time >= since).length, error: null }));
        mocks.generate.mockResolvedValue({ topic: "job-search", title: "공고 확인 질문", body: "공고를 비교할 때 확인할 항목" });
        query.single.mockResolvedValue({ data: { id: "post" }, error: null });
        const result = await (await POST(request())).json();
        if (result.ok) published.push(now.toISOString());
      }
      expect(published.map((time) => time.slice(0, 10))).toEqual(["2026-10-29", "2026-11-01", "2026-11-04", "2026-11-07"]);
    } finally { vi.useRealTimers(); }
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

  it("publishes only the generated post and never creates an automatic comment", async () => {
    const { from, query } = database(0);
    mocks.generate.mockResolvedValueOnce({ topic: "job-search", title: "첫 취업 준비", body: "공고를 비교할 때 확인할 항목" });
    query.single.mockResolvedValueOnce({ data: { id: "seed-post" }, error: null });

    const response = await POST(request());

    expect(await response.json()).toEqual({ ok: true, postId: "seed-post", postsInWindow: 1 });
    expect(from).toHaveBeenCalledWith("community_posts");
    expect(from).not.toHaveBeenCalledWith("community_comments");
  });

  it("does not generate if in the three-day window's count cannot be verified", async () => {
    database(null, { message: "count unavailable" });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("does not spend on generation when recent history cannot be read", async () => {
    const { query } = database(0);
    query.limit.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("does not publish a title repeated with different spacing or punctuation", async () => {
    const { query } = database(0);
    query.limit.mockResolvedValueOnce({ data: [{ title: "첫 취업 준비", topic: "job-search" }] });
    mocks.generate.mockResolvedValueOnce({ topic: "job-search", title: "첫 취업: 준비!", body: "공고를 비교할 때 확인할 항목" });
    expect(await (await POST(request())).json()).toEqual({ skipped: "duplicate_title" });
    expect(query.insert).not.toHaveBeenCalled();
  });

  it("rejects unauthorized requests before accessing the database", async () => {
    expect((await POST(request("invalid"))).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
});

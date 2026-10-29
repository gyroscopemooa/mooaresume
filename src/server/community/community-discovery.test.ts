import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
import { getInitialCommunityFeed, getRelatedCommunityPosts } from "./community-publication";
function database(rows: Record<string, unknown>[], error: object | null = null) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: rows, error }),
    limit: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query), auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } });
  return query;
}
beforeEach(() => vi.clearAllMocks());
describe("public community discovery", () => {
  it("loads published first-page content under RLS and never serializes owner identity", async () => {
    const query = database(Array.from({ length: 21 }, (_, i) => ({ id: String(i), title: "공개 글", body: "본문", owner_user_id: "private-owner", topic: "career" })));
    const feed = await getInitialCommunityFeed();
    expect(feed.posts).toHaveLength(20);
    expect(feed.hasMore).toBe(true);
    expect(JSON.stringify(feed)).not.toContain("private-owner");
    expect(query.eq).toHaveBeenCalledWith("status", "PUBLISHED");
    expect(query.range).toHaveBeenCalledWith(0, 20);
  });
  it("links only published posts in the same topic, excluding itself", async () => {
    const query = database([{ id: "other", title: "관련 질문" }]);
    expect(await getRelatedCommunityPosts("current", "career")).toEqual([{ id: "other", title: "관련 질문" }]);
    expect(query.eq).toHaveBeenCalledWith("status", "PUBLISHED");
    expect(query.eq).toHaveBeenCalledWith("topic", "career");
    expect(query.neq).toHaveBeenCalledWith("id", "current");
    expect(query.limit).toHaveBeenCalledWith(3);
  });
  it("does not expose failed lookups as related posts", async () => {
    database([], { message: "unavailable" });
    expect(await getRelatedCommunityPosts("current", "career")).toEqual([]);
    await expect(getInitialCommunityFeed()).rejects.toEqual({ message: "unavailable" });
  });
});

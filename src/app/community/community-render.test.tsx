import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ post: vi.fn(), comments: vi.fn(), related: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/site-nav", () => ({ SiteNav: () => null }));
vi.mock("./[postId]/post-comments", () => ({ PostComments: () => null }));
vi.mock("@/server/community/community-publication", () => ({ getPublishedCommunityPost: mocks.post, getPublishedCommunityComments: mocks.comments, getRelatedCommunityPosts: mocks.related }));
import CommunityPostPage from "./[postId]/page";
import { CommunityLounge } from "@/components/community-lounge";
import type { CommunityPost } from "@/domain/community";
const post: CommunityPost = { id: "old-post", topic: "application", title: "경험 정리 질문", body: "이전 본문 그대로", anonymousAlias: "익명", isEditorial: true, isMine: false, recommendationCount: 0, commentCount: 0, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", attachments: [] };
describe("community first-response HTML", () => {
  it("renders initial public titles, bodies and crawlable links without effects", () => {
    const html = renderToStaticMarkup(<CommunityLounge initialFeed={{ posts: [post], hasMore: false }} />);
    expect(html).toContain('href="/community/old-post"');
    expect(html).toContain("이전 본문 그대로");
    expect(html).toContain("MOOA Resume 운영팀");
  });
  it("adds new related links to old post pages without rewriting the body", async () => {
    mocks.post.mockResolvedValue(post);
    mocks.comments.mockResolvedValue([]);
    mocks.related.mockResolvedValue([{ id: "new-post", title: "새로운 경험 정리 질문" }]);
    const html = renderToStaticMarkup(await CommunityPostPage({ params: Promise.resolve({ postId: post.id }) }));
    expect(html).toContain("이전 본문 그대로");
    expect(html).toContain('href="/community/new-post"');
    expect(html).toContain('href="/guide"');
    expect(html).toContain("MOOA Resume 운영팀");
  });
});

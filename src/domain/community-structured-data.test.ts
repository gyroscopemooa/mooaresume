import { describe, expect, it } from "vitest";
import type { CommunityComment, CommunityPost } from "./community";
import { communityAuthorName, communityStructuredData, serializeCommunityStructuredData } from "./community-structured-data";
const post: CommunityPost = {
  id: "public-post", topic: "career", title: "직무 선택 질문", body: "원문 그대로",
  anonymousAlias: "익명 준비자", isEditorial: false, isMine: false,
  recommendationCount: 2, commentCount: 1, createdAt: "2026-10-25T00:00:07Z", updatedAt: "", attachments: [],
};
const comment: CommunityComment = { id: "comment", body: "답변 원문", anonymousAlias: "익명 동료", isEditorial: false, isMine: false, createdAt: "2026-10-26T00:00:07Z" };
describe("Google community structured data", () => {
  it("uses BlogPosting and an organization author for publisher content", () => {
    const data = communityStructuredData({ ...post, isEditorial: true }, [], "https://mooaresume.com/");
    expect(data["@type"]).toBe("BlogPosting");
    expect(data.author).toEqual({ "@type": "Organization", name: "MOOA Resume 운영팀" });
    expect(data).toHaveProperty("articleBody", post.body);
    expect(data).not.toHaveProperty("text");
    expect(data.url).toBe("https://mooaresume.com/community/public-post");
    expect(data.dateModified).toBe(post.createdAt);
  });
  it("includes forum required fields and public pseudonymous authors on comments", () => {
    const data = communityStructuredData(post, [comment], "https://mooaresume.com");
    expect(data["@type"]).toBe("DiscussionForumPosting");
    expect(data.author).toEqual({ "@type": "Person", name: "익명 준비자" });
    expect(data).toHaveProperty("text", post.body);
    expect(data.datePublished).toBe(post.createdAt);
    expect(data.comment[0]).toEqual({ "@type": "Comment", text: comment.body, author: { "@type": "Person", name: "익명 동료" }, datePublished: comment.createdAt });
    expect(data.commentCount).toBe(1);
  });
  it("uses the same safe display fallback and organization label in UI and markup", () => {
    expect(communityAuthorName({ isEditorial: false, anonymousAlias: " " })).toBe("익명");
    const data = communityStructuredData(post, [{ ...comment, isEditorial: true }], "https://mooaresume.com");
    expect(data.comment[0].author).toEqual({ "@type": "Organization", name: "MOOA Resume 운영팀" });
  });
  it("never serializes extra owner identity or attachment fields", () => {
    const privateRow = { ...post, owner_user_id: "private-owner", email: "private@example.test", attachments: [{ id: "attachment", storagePath: "private-storage", filename: "private-file", mimeType: "application/pdf" as const, byteSize: 1 }] };
    const data = communityStructuredData(privateRow, [], "https://mooaresume.com");
    const json = serializeCommunityStructuredData(data);
    for (const secret of ["private-owner", "private@example.test", "private-storage", "private-file"]) expect(json).not.toContain(secret);
  });
  it("escapes script-closing content without changing decoded article text", () => {
    const body = '</script><script>alert("test")</script>';
    const data = communityStructuredData({ ...post, body }, [], "https://mooaresume.com");
    const json = serializeCommunityStructuredData(data);
    expect(json).not.toContain("<");
    expect(JSON.parse(json).text).toBe(body);
  });
});

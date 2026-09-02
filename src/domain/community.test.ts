import { describe, expect, it } from "vitest";
import { communityPostPath, communitySearchDescription, createCommunityPostSchema } from "./community";

describe("community post input", () => {
  const attachment = { storagePath: "user/file.png", filename: "file.png", mimeType: "image/png", byteSize: 1024 };
  it("accepts a bounded post with supported attachments", () => {
    expect(createCommunityPostSchema.safeParse({ topic: "career", title: "직무 고민", body: "어디부터 지원해야 할지 고민이에요.", attachments: [attachment] }).success).toBe(true);
  });
  it("rejects more than three attachments and unsupported mime types", () => {
    expect(createCommunityPostSchema.safeParse({ topic: "career", title: "직무 고민", body: "어디부터 지원해야 할지 고민이에요.", attachments: [attachment, attachment, attachment, attachment] }).success).toBe(false);
    expect(createCommunityPostSchema.safeParse({ topic: "career", title: "직무 고민", body: "어디부터 지원해야 할지 고민이에요.", attachments: [{ ...attachment, mimeType: "text/plain" }] }).success).toBe(false);
  });
});
describe("community search helpers", () => {
  it("uses a stable detail URL and trims descriptions without breaking words apart", () => {
    expect(communityPostPath("post-id")).toBe("/community/post-id");
    expect(communitySearchDescription("  첫 줄\n\n두 번째 줄  ")).toBe("첫 줄 두 번째 줄");
    expect(communitySearchDescription("가나다라마바사", 5)).toBe("가나다라…");
  });
});
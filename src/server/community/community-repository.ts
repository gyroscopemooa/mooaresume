import { communityTopics, type CommunityAttachment, type CommunityComment, type CommunityPost, type CommunityTopicId } from "@/domain/community";

// 도메인의 communityTopics를 그대로 씁니다 — 여기 따로 목록을 적어 두면
// 나중에 주제를 늘렸을 때 이 표시 로직만 옛 목록으로 남아 새 주제 글이
// 조용히 "career"로 잘못 표시됩니다.
const topics = new Set<CommunityTopicId>(communityTopics);
type Row = Record<string, unknown>;

function stringValue(row: Row, key: string) { return typeof row[key] === "string" ? row[key] : ""; }
function numberValue(row: Row, key: string) { return typeof row[key] === "number" ? row[key] : 0; }

export function toCommunityPost(row: Row): CommunityPost {
  const rawAttachments = Array.isArray(row.community_attachments) ? row.community_attachments : [];
  const attachments: CommunityAttachment[] = rawAttachments.filter((item): item is Row => Boolean(item) && typeof item === "object").map((item) => ({
    id: stringValue(item, "id"), storagePath: stringValue(item, "storage_path"), filename: stringValue(item, "filename"), mimeType: stringValue(item, "mime_type") as CommunityAttachment["mimeType"], byteSize: numberValue(item, "byte_size"),
  }));
  const topic = stringValue(row, "topic");
  return { id: stringValue(row, "id"), topic: topics.has(topic as CommunityTopicId) ? topic as CommunityTopicId : "career", title: stringValue(row, "title"), body: stringValue(row, "body"), anonymousAlias: stringValue(row, "anonymous_alias"), recommendationCount: numberValue(row, "recommendation_count"), commentCount: numberValue(row, "comment_count"), createdAt: stringValue(row, "created_at"), updatedAt: stringValue(row, "updated_at"), attachments };
}

export function toCommunityComment(row: Row): CommunityComment {
  return { id: stringValue(row, "id"), body: stringValue(row, "body"), anonymousAlias: stringValue(row, "anonymous_alias"), createdAt: stringValue(row, "created_at") };
}
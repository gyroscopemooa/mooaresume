import type { CommunityAttachment, CommunityComment, CommunityPost, CommunityTopicId } from "@/domain/community";

const topics = new Set<CommunityTopicId>(["job-search", "career", "application", "work-life"]);
type Row = Record<string, unknown>;

function stringValue(row: Row, key: string) { return typeof row[key] === "string" ? row[key] : ""; }
function numberValue(row: Row, key: string) { return typeof row[key] === "number" ? row[key] : 0; }

export function toCommunityPost(row: Row): CommunityPost {
  const rawAttachments = Array.isArray(row.community_attachments) ? row.community_attachments : [];
  const attachments: CommunityAttachment[] = rawAttachments.filter((item): item is Row => Boolean(item) && typeof item === "object").map((item) => ({
    id: stringValue(item, "id"), storagePath: stringValue(item, "storage_path"), filename: stringValue(item, "filename"), mimeType: stringValue(item, "mime_type") as CommunityAttachment["mimeType"], byteSize: numberValue(item, "byte_size"),
  }));
  const topic = stringValue(row, "topic");
  return { id: stringValue(row, "id"), topic: topics.has(topic as CommunityTopicId) ? topic as CommunityTopicId : "career", title: stringValue(row, "title"), body: stringValue(row, "body"), anonymousAlias: stringValue(row, "anonymous_alias"), recommendationCount: numberValue(row, "recommendation_count"), commentCount: numberValue(row, "comment_count"), createdAt: stringValue(row, "created_at"), attachments };
}

export function toCommunityComment(row: Row): CommunityComment {
  return { id: stringValue(row, "id"), body: stringValue(row, "body"), anonymousAlias: stringValue(row, "anonymous_alias"), createdAt: stringValue(row, "created_at") };
}
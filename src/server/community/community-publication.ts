import { cache } from "react";
import type { CommunityComment, CommunityPost } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { toCommunityComment, toCommunityPost } from "./community-repository";

// is_editorial은 20260904030000_community_daily_seed.sql이 추가하는
// 컬럼입니다. 그 마이그레이션이 실제 DB에 적용되기 전까지는 이 select
// 문자열에 넣으면 PostgREST가 "없는 컬럼"으로 거부해 커뮤니티 전체가
// 먹통이 됩니다(2026-09-04 실제 장애). 마이그레이션 적용을 확인한 뒤에만
// 다시 추가하세요.
export const communityPostSelect = "id, topic, title, body, anonymous_alias, recommendation_count, comment_count, created_at, updated_at, community_attachments(id, storage_path, filename, mime_type, byte_size)";
const communityCommentSelect = "id, body, anonymous_alias, created_at";

export const getPublishedCommunityPost = cache(async (postId: string): Promise<CommunityPost | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_posts").select(communityPostSelect).eq("id", postId).eq("status", "PUBLISHED").maybeSingle();
  if (error || !data) return null;
  return toCommunityPost(data as Record<string, unknown>);
});

export const getPublishedCommunityComments = cache(async (postId: string): Promise<CommunityComment[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_comments").select(communityCommentSelect).eq("post_id", postId).eq("status", "PUBLISHED").order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => toCommunityComment(row as Record<string, unknown>));
});

export async function listPublishedCommunityPostsForSitemap() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_posts").select("id, updated_at").eq("status", "PUBLISHED").order("updated_at", { ascending: false }).limit(1000);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    const updatedAt = typeof row.updated_at === "string" ? row.updated_at : "";
    return id ? [{ id, updatedAt }] : [];
  });
}
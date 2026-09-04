import { cache } from "react";
import type { CommunityComment, CommunityPost } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { toCommunityComment, toCommunityPost } from "./community-repository";

export const communityPostSelect = "id, topic, title, body, anonymous_alias, is_editorial, recommendation_count, comment_count, created_at, updated_at, community_attachments(id, storage_path, filename, mime_type, byte_size)";
const communityCommentSelect = "id, body, anonymous_alias, is_editorial, created_at";

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
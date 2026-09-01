import { NextRequest, NextResponse } from "next/server";
import { createCommunityPostSchema, isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { toCommunityPost } from "@/server/community/community-repository";

const postSelect = "id, topic, title, body, anonymous_alias, recommendation_count, comment_count, created_at, community_attachments(id, storage_path, filename, mime_type, byte_size)";

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get("sort") === "popular" ? "popular" : "latest";
  const topic = request.nextUrl.searchParams.get("topic");
  const supabase = await createClient();
  let query = supabase.from("community_posts").select(postSelect).eq("status", "PUBLISHED").limit(40);
  if (topic && ["job-search", "career", "application", "work-life"].includes(topic)) query = query.eq("topic", topic);
  query = sort === "popular" ? query.order("recommendation_count", { ascending: false }).order("comment_count", { ascending: false }).order("created_at", { ascending: false }) : query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "라운지를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ posts: (data ?? []).map((row) => toCommunityPost(row as Record<string, unknown>)) });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "글쓰기는 로그인 후 이용할 수 있어요." }, { status: 401 });
  const parsed = createCommunityPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요." }, { status: 400 });
  if (parsed.data.attachments.some((file) => !file.storagePath.startsWith(`${auth.user.id}/`))) return NextResponse.json({ error: "내가 올린 첨부파일만 사용할 수 있어요." }, { status: 403 });
  const { data: post, error: postError } = await supabase.from("community_posts").insert({ topic: parsed.data.topic, title: parsed.data.title, body: parsed.data.body }).select(postSelect).single();
  if (postError || !post) return NextResponse.json({ error: "글을 저장하지 못했습니다. 데이터베이스 적용 상태를 확인해 주세요." }, { status: 500 });
  if (parsed.data.attachments.length) {
    const { error: attachmentError } = await supabase.from("community_attachments").insert(parsed.data.attachments.map((file) => ({ post_id: post.id, storage_path: file.storagePath, filename: file.filename, mime_type: file.mimeType, byte_size: file.byteSize })));
    if (attachmentError) { await supabase.from("community_posts").delete().eq("id", post.id); return NextResponse.json({ error: "첨부파일 정보를 저장하지 못했습니다." }, { status: 500 }); }
  }
  const { data: saved, error: savedError } = await supabase.from("community_posts").select(postSelect).eq("id", post.id).single();
  if (savedError || !saved) return NextResponse.json({ error: "글은 저장됐지만 다시 읽지 못했습니다." }, { status: 500 });
  return NextResponse.json({ post: toCommunityPost(saved as Record<string, unknown>) }, { status: 201 });
}
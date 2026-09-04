import { NextRequest, NextResponse } from "next/server";
import { createCommunityPostSchema, isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { takeCommunityRateLimit } from "@/server/community/community-rate-limit";
import { toCommunityPost } from "@/server/community/community-repository";
import { communityPostSelect } from "@/server/community/community-publication";

// 화면(community-lounge.tsx)의 "더 보기"도 같은 크기로 한 페이지씩 요청합니다.
const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get("sort") === "popular" ? "popular" : "latest";
  const topic = request.nextUrl.searchParams.get("topic");
  const rawOffset = Number(request.nextUrl.searchParams.get("offset"));
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  // 사이드바의 "이번 주 많이 읽은 글"처럼, 지금 로드된 페이지가 아니라
  // 전체에서 뽑아야 하는 작은 목록을 위한 것입니다. 예: ?limit=3.
  const rawLimit = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= PAGE_SIZE ? rawLimit : PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase.from("community_posts").select(communityPostSelect).eq("status", "PUBLISHED");
  if (topic && ["job-search", "career", "application", "work-life"].includes(topic)) query = query.eq("topic", topic);
  // ?window=7d 같은 형식만 받습니다. "이번 주 인기글"이 사실은 "지금 로드된
  // 20개 중 인기순"이었던 문제 — 기간을 두지 않으면 몇 달 전 인기글이
  // 계속 상단을 차지해 "이번 주"라는 이름과도 맞지 않습니다.
  const windowDays = /^(\d{1,3})d$/.exec(request.nextUrl.searchParams.get("window") ?? "")?.[1];
  if (windowDays) query = query.gte("created_at", new Date(Date.now() - Number(windowDays) * 86_400_000).toISOString());
  query = sort === "popular" ? query.order("recommendation_count", { ascending: false }).order("comment_count", { ascending: false }).order("created_at", { ascending: false }) : query.order("created_at", { ascending: false });
  // limit보다 하나 더 가져와, 그 다음 하나가 있으면 다음 페이지가 있다는
  // 뜻입니다. count 전용 질의를 따로 안 해도 됩니다.
  const { data, error } = await query.range(offset, offset + limit);
  if (error) return NextResponse.json({ error: "라운지를 불러오지 못했습니다." }, { status: 500 });
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map((row) => toCommunityPost(row as Record<string, unknown>));
  return NextResponse.json({ posts, hasMore, nextOffset: offset + posts.length });
}

/**
 * `byteSize`는 이 요청의 JSON 본문에 브라우저가 직접 적어 보내는 값입니다.
 * 업로드 라우트(`/api/community/uploads`)가 실제 파일 크기를 이미 한 번
 * 확인했지만, 그 확인이 여기까지 강제로 이어지지는 않아 클라이언트가 두
 * 요청 사이에 값을 바꿔 보낼 수 있습니다. 방금 올라간 실제 객체의 크기를
 * 스토리지에서 다시 확인해 그 값으로 저장합니다.
 *
 * 확인이 안 되면(네트워크 등) 신고값을 그대로 씁니다 — 업로드 라우트가
 * 이미 실제 파일을 8MB 아래로 막아 두었으므로, 이 확인은 침입을 막는
 * 것이 아니라 표시·기록용 숫자를 사실과 맞추는 것입니다. 실패했다고
 * 첨부를 통째로 거절할 이유는 아닙니다.
 */
async function verifiedByteSize(supabase: Awaited<ReturnType<typeof createClient>>, storagePath: string): Promise<number | null> {
  const slash = storagePath.lastIndexOf("/");
  if (slash < 0) return null;
  const { data, error } = await supabase.storage.from("community-attachments").list(storagePath.slice(0, slash), { search: storagePath.slice(slash + 1), limit: 1 });
  if (error || !data?.length) return null;
  const size = (data[0] as { metadata?: { size?: number } }).metadata?.size;
  return typeof size === "number" ? size : null;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "글쓰기는 로그인 후 이용할 수 있어요." }, { status: 401 });
  if (!(await takeCommunityRateLimit(supabase, "POST_CREATE"))) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const parsed = createCommunityPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요." }, { status: 400 });
  // 첨부가 있는 글은 하루 한 번. 첨부 없는 글은 위의 일반 POST_CREATE 한도만 받습니다.
  if (parsed.data.attachments.length && !(await takeCommunityRateLimit(supabase, "ATTACHMENT_POST"))) {
    return NextResponse.json({ error: "첨부가 있는 글은 하루 한 번만 올릴 수 있어요." }, { status: 429 });
  }
  if (parsed.data.attachments.some((file) => !file.storagePath.startsWith(`${auth.user.id}/`))) return NextResponse.json({ error: "내가 올린 첨부파일만 사용할 수 있어요." }, { status: 403 });
  const { data: post, error: postError } = await supabase.from("community_posts").insert({ topic: parsed.data.topic, title: parsed.data.title, body: parsed.data.body }).select(communityPostSelect).single();
  if (postError || !post) return NextResponse.json({ error: "글을 저장하지 못했습니다. 데이터베이스 적용 상태를 확인해 주세요." }, { status: 500 });
  if (parsed.data.attachments.length) {
    const rows = await Promise.all(parsed.data.attachments.map(async (file) => ({
      post_id: post.id,
      storage_path: file.storagePath,
      filename: file.filename,
      mime_type: file.mimeType,
      byte_size: (await verifiedByteSize(supabase, file.storagePath)) ?? file.byteSize,
    })));
    const { error: attachmentError } = await supabase.from("community_attachments").insert(rows);
    if (attachmentError) { await supabase.from("community_posts").delete().eq("id", post.id); return NextResponse.json({ error: "첨부파일 정보를 저장하지 못했습니다." }, { status: 500 }); }
  }
  const { data: saved, error: savedError } = await supabase.from("community_posts").select(communityPostSelect).eq("id", post.id).single();
  if (savedError || !saved) return NextResponse.json({ error: "글은 저장됐지만 다시 읽지 못했습니다." }, { status: 500 });
  return NextResponse.json({ post: toCommunityPost(saved as Record<string, unknown>) }, { status: 201 });
}
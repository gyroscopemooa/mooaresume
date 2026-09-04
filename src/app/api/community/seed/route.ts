import { NextRequest, NextResponse } from "next/server";
import { createCommunityCommentSchema, createCommunityPostSchema } from "@/domain/community";
import { serviceClient } from "@/server/admin/admin-repository";
import { generateCommunitySeedContent } from "@/server/community/community-seed-content";

// docs/handoff-community-mobile.md 118행 이하: 매일 자동 글 3 · 댓글 3.
// Supabase pg_cron이 하루 한 번 이 라우트를 부릅니다(마이그레이션
// 20260904030000_community_daily_seed.sql). 사람이 직접 배포·수동 호출할
// 일이 없으므로 GET은 두지 않습니다.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const secret = process.env.COMMUNITY_SEED_CRON_SECRET?.trim();
  // 비어 있으면 항상 거부 — ANALYSIS_CRON_SECRET/analysis-runs/advance와 같은 규칙.
  if (!secret) return NextResponse.json({ error: "스케줄러가 설정되지 않았습니다." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 401 });
  }

  // 배포 없이 대시보드에서 끄기 위한 스위치. 자동 글이 이상하게 나올 때
  // 크론이 계속 도는데 배포를 기다리며 이상한 글이 쌓이면 안 됩니다.
  if (process.env.COMMUNITY_SEED_ENABLED?.trim() !== "1") {
    return NextResponse.json({ skipped: "disabled" });
  }
  const seedUserId = process.env.COMMUNITY_SEED_USER_ID?.trim();
  if (!seedUserId) return NextResponse.json({ skipped: "no_seed_user" });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.COMMUNITY_SEED_MODEL?.trim() || process.env.OPENAI_MODEL;
  if (!apiKey || !model) return NextResponse.json({ skipped: "no_model_config" });

  const supabase = serviceClient();

  // 하루 한 번만. 크론이 두 번 불려도 그날 이미 쓴 운영팀 글이 있으면
  // 아무 것도 하지 않습니다(문서 143행). 날짜 경계는 UTC 자정 — 중복 실행을
  // 막는 용도일 뿐이라 한국 시간과 맞출 필요가 없습니다.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", seedUserId)
    .eq("is_editorial", true)
    .gte("created_at", todayStart.toISOString());
  if (countError) {
    console.error("community_seed_count_failed", countError.message);
    return NextResponse.json({ error: "오늘 작성 여부를 확인하지 못했습니다." }, { status: 500 });
  }
  if ((count ?? 0) > 0) return NextResponse.json({ skipped: "already_seeded_today" });

  // 최근 제목과 겹치는 질문을 피하도록 프롬프트에 같이 넣습니다 — 주제
  // 후보가 한정돼 있어 이 목록 없이는 며칠 안에 같은 질문이 반복될
  // 위험이 있습니다.
  const { data: recentRows } = await supabase
    .from("community_posts")
    .select("title")
    .eq("is_editorial", true)
    .order("created_at", { ascending: false })
    .limit(30);
  const recentTitles = (recentRows ?? [])
    .map((row) => (typeof row.title === "string" ? row.title : ""))
    .filter(Boolean);

  let items;
  try {
    items = await generateCommunitySeedContent({ apiKey, model, recentTitles });
  } catch (error) {
    console.error("community_seed_generation_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "글 생성에 실패했습니다." }, { status: 502 });
  }

  const results: { title: string; postId?: string; error?: string }[] = [];
  for (const item of items) {
    const parsedPost = createCommunityPostSchema.safeParse({ topic: item.topic, title: item.title, body: item.body, attachments: [] });
    if (!parsedPost.success) {
      console.error("community_seed_post_invalid", parsedPost.error.issues[0]?.message);
      results.push({ title: item.title, error: parsedPost.error.issues[0]?.message ?? "invalid" });
      continue;
    }

    // 서비스 키 클라이언트라 RLS를 우회하므로 owner_user_id를 직접 지정합니다.
    // set_community_alias 트리거가 이 값의 해시로 anonymous_alias를 채우고,
    // is_editorial=true가 화면에 "운영팀" 배지를 띄우는 유일한 근거입니다.
    const { data: post, error: postError } = await supabase
      .from("community_posts")
      .insert({ owner_user_id: seedUserId, topic: parsedPost.data.topic, title: parsedPost.data.title, body: parsedPost.data.body, is_editorial: true })
      .select("id")
      .single();
    if (postError || !post) {
      console.error("community_seed_post_insert_failed", postError?.message);
      results.push({ title: item.title, error: "insert_failed" });
      continue;
    }
    results.push({ title: item.title, postId: post.id as string });

    // 댓글은 그날 쓴 운영팀 글에만 답니다 — 다른 사용자 글에 AI가 답을
    // 다는 것은 이 기능의 범위가 아닙니다(문서 145행).
    const parsedComment = createCommunityCommentSchema.safeParse({ body: item.comment });
    if (!parsedComment.success) {
      console.error("community_seed_comment_invalid", parsedComment.error.issues[0]?.message);
      continue;
    }
    const { error: commentError } = await supabase
      .from("community_comments")
      .insert({ post_id: post.id, owner_user_id: seedUserId, body: parsedComment.data.body, is_editorial: true });
    if (commentError) console.error("community_seed_comment_insert_failed", commentError.message);
  }

  return NextResponse.json({ ok: true, created: results.filter((row) => row.postId).length, results });
}

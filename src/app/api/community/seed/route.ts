import { NextRequest, NextResponse } from "next/server";
import { createCommunityCommentSchema, createCommunityPostSchema } from "@/domain/community";
import { serviceClient } from "@/server/admin/admin-repository";
import { generateCommunitySeedContent } from "@/server/community/community-seed-content";

// 매일 자동 글 1개와 해당 글의 운영팀 댓글 1개를 발행합니다.
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

  // 하루 최대 1개. 오전 9시(KST)에 한 번 호출하며, 같은 발행일에 이미
  // 작성했다면 재호출에도 AI 생성 없이 종료합니다. 기존 UTC 자정 경계는
  // 한국시간 오전 9시이므로 예약 발행 시각과 일치합니다.
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
  if ((count ?? 0) >= 1) return NextResponse.json({ skipped: "already_seeded_today", postsToday: count });

  // 최근 제목과 겹치는 질문을 피하도록 프롬프트에 같이 넣습니다(오늘 이미
  // 쓴 것도 포함) — 주제 후보가 한정돼 있어 이 목록 없이는 하루 안에도
  // 같은 질문이 반복될 위험이 있습니다.
  const { data: recentRows } = await supabase
    .from("community_posts")
    .select("title")
    .eq("is_editorial", true)
    .order("created_at", { ascending: false })
    .limit(30);
  const recentTitles = (recentRows ?? [])
    .map((row) => (typeof row.title === "string" ? row.title : ""))
    .filter(Boolean);

  let item;
  try {
    item = await generateCommunitySeedContent({ apiKey, model, recentTitles });
  } catch (error) {
    console.error("community_seed_generation_failed", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    return NextResponse.json({ error: "글 생성에 실패했습니다." }, { status: 502 });
  }

  const parsedPost = createCommunityPostSchema.safeParse({ topic: item.topic, title: item.title, body: item.body, attachments: [] });
  if (!parsedPost.success) {
    console.error("community_seed_post_invalid", parsedPost.error.issues[0]?.message);
    return NextResponse.json({ error: "생성된 글이 검증을 통과하지 못했습니다." }, { status: 502 });
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
    return NextResponse.json({ error: "글을 저장하지 못했습니다." }, { status: 500 });
  }

  // 댓글은 방금 쓴 그 운영팀 글에만 답니다 — 다른 사용자 글에 AI가 답을
  // 다는 것은 이 기능의 범위가 아닙니다(문서 145행).
  const parsedComment = createCommunityCommentSchema.safeParse({ body: item.comment });
  if (!parsedComment.success) {
    console.error("community_seed_comment_invalid", parsedComment.error.issues[0]?.message);
    return NextResponse.json({ ok: true, postId: post.id, commentSkipped: true });
  }
  const { error: commentError } = await supabase
    .from("community_comments")
    .insert({ post_id: post.id, owner_user_id: seedUserId, body: parsedComment.data.body, is_editorial: true });
  if (commentError) console.error("community_seed_comment_insert_failed", commentError.message);

  return NextResponse.json({ ok: true, postId: post.id, postsToday: (count ?? 0) + 1 });
}

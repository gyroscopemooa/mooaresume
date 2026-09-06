import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { takeCommunityRateLimit } from "@/server/community/community-rate-limit";

const accepted = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "첨부는 로그인 후 이용할 수 있어요." }, { status: 401 });
  if (!(await takeCommunityRateLimit(supabase, "UPLOAD"))) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !accepted.has(file.type) || file.size <= 0 || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "JPG·PNG·WEBP·PDF만, 파일당 8MB까지 올릴 수 있어요." }, { status: 400 });
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "attachment";
  const storagePath = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("community-attachments").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "첨부파일을 올리지 못했습니다." }, { status: 500 });
  return NextResponse.json({ storagePath, filename: file.name.slice(0, 160), mimeType: file.type, byteSize: file.size }, { status: 201 });
}

/**
 * 첨부를 먼저 올리고 그 다음 글을 저장하는 순서라, 글 저장이 실패하면
 * 이미 올라간 파일이 주인 없이 남습니다(고아 파일). 그걸 지우는 자리입니다.
 *
 * 서버 라우트로 둔 이유: 브라우저에서 곧바로 Supabase Storage를 지우는
 * 방법도 있지만(같은 RLS 정책이 이미 본인 파일 삭제를 허용합니다), 이
 * 프로젝트는 브라우저-Supabase 직접 호출에서 겪은 문제(서명키 회전 때
 * 여러 화면이 한꺼번에 조용히 실패한 사고) 이후로 중요한 쓰기는 서버
 * 라우트를 거치는 쪽으로 옮겨 왔습니다. 여기도 같은 방향을 따릅니다.
 *
 * 최선을 다하는 정리입니다 — 실패해도 예외를 던지지 않고 `ok: true`를
 * 돌려줍니다. 정리 실패로 원래 오류(글 저장 실패)가 가려지면 안 됩니다.
 */
export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null) as { storagePaths?: unknown } | null;
  const requested = Array.isArray(body?.storagePaths) ? body.storagePaths.filter((path): path is string => typeof path === "string") : [];
  // 본인 계정 아래 경로만 지웁니다 — 남의 경로를 섞어 보내도 그 부분은 무시됩니다.
  const owned = requested.filter((path) => path.startsWith(`${auth.user.id}/`)).slice(0, 3);
  if (owned.length) await supabase.storage.from("community-attachments").remove(owned);
  return NextResponse.json({ ok: true });
}
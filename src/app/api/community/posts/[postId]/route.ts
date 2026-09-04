import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/domain/community";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/server/admin/admin-repository";

/**
 * 삭제 권한이 있는 이메일 목록. 쉼표로 여러 개를 받을 수 있게 했지만
 * 지금은 관리자 한 명(`COMMUNITY_ADMIN_EMAILS=jeonmeensoo@gmail.com`)만
 * 씁니다. 비어 있으면 아무도 지울 수 없습니다 — 설정을 깜빡한 것이
 * "아무나 지울 수 있음"이 되면 안 됩니다.
 */
function isCommunityAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.COMMUNITY_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/**
 * 글 삭제.
 *
 * `community_posts.status`는 이미 스키마에 `'REMOVED'`를 예비해 뒀지만
 * (`check (status in ('PUBLISHED','HIDDEN','REMOVED'))`) 실제로 그 값을
 * 쓰는 곳이 없었습니다. `/meensoo` 신고 처리(`HIDDEN`)와 성격이 다릅니다 —
 * `HIDDEN`은 신고를 받아 검토 후 감추는 것이고, 이건 관리자가 직접, 신고
 * 없이도 지우는 것입니다. 행을 실제로 지우지 않고 상태만 바꾸는 이유는
 * 이 코드베이스의 다른 커뮤니티 조정(모더레이션) 기능과 같습니다 —
 * 되돌릴 수 있고, 삭제 자체가 하드 삭제의 위험(연쇄 삭제, 되돌릴 수 없는
 * 실수)을 지지 않습니다.
 *
 * `owner_user_id = auth.uid()`인 일반 사용자 클라이언트로는 남의 글을 절대
 * 지울 수 없습니다(RLS의 update 정책이 그렇게 막아 둠). 그래서 이메일로
 * 관리자를 확인한 뒤에는 서비스 키 클라이언트로 전환합니다 — `/meensoo`
 * 콘솔이 신고 처리에 쓰는 것과 같은 클라이언트입니다.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isCommunityAdmin(auth.user.email)) return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
  const { postId } = await context.params;
  const { error } = await serviceClient().from("community_posts").update({ status: "REMOVED" }).eq("id", postId);
  if (error) return NextResponse.json({ error: "글을 삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

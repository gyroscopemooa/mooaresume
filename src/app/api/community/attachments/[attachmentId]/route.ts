import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, context: { params: Promise<{ attachmentId: string }> }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  // 첨부 링크는 target="_blank"로 새 탭에서 엽니다. 새 탭에 벌거벗은 JSON
  // 오류만 뜨면 로그인이 왜 필요한지, 뭘 하면 되는지 알 방법이 없습니다.
  // 라운지로 돌려보내고 그 화면이 안내와 로그인 버튼을 보여주게 합니다.
  if (authError || !auth.user) return NextResponse.redirect(new URL("/community?attachment=login-required", request.url));
  const { attachmentId } = await context.params;
  const { data: attachment, error } = await supabase.from("community_attachments").select("storage_path").eq("id", attachmentId).single();
  if (error || !attachment) return NextResponse.json({ error: "첨부파일을 찾지 못했습니다." }, { status: 404 });
  const { data: signed, error: signedError } = await supabase.storage.from("community-attachments").createSignedUrl(attachment.storage_path, 60);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "첨부파일을 열지 못했습니다." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
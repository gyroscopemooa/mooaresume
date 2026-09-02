import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ attachmentId: string }> }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "첨부파일은 로그인 후 열 수 있어요." }, { status: 401 });
  const { attachmentId } = await context.params;
  const { data: attachment, error } = await supabase.from("community_attachments").select("storage_path").eq("id", attachmentId).single();
  if (error || !attachment) return NextResponse.json({ error: "첨부파일을 찾지 못했습니다." }, { status: 404 });
  const { data: signed, error: signedError } = await supabase.storage.from("community-attachments").createSignedUrl(attachment.storage_path, 60);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "첨부파일을 열지 못했습니다." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
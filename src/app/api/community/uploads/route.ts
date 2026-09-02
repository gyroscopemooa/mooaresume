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
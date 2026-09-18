import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAccountDeletionEnabled, parseAccountDeletionRequest } from "@/lib/account-deletion";
import { AccountDeletionError, deleteAccount } from "@/server/account/delete-account";

// 되돌릴 수 없는 요청이라 Origin 헤더가 없는 요청도 받지 않습니다.
function isStrictSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAccountDeletionEnabled()) return NextResponse.json({ error: "아직 사용할 수 없습니다." }, { status: 404 });
  if (!isStrictSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = parseAccountDeletionRequest(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: "확인 문구가 올바르지 않습니다." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 503 });
  const service = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    await deleteAccount(service, auth.user.id);
  } catch (error) {
    const code = error instanceof AccountDeletionError ? error.code : "UNKNOWN";
    console.error("account deletion failed", { code, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요. 계속되면 support@mooaresume.com으로 알려 주세요.", code }, { status: 500 });
  }

  // 계정이 이미 없어서 실패할 수 있지만, 쿠키를 비우는 것이 목적이라 무시합니다.
  await supabase.auth.signOut().catch(() => undefined);
  return NextResponse.json({ ok: true });
}

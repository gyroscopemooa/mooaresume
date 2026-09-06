/**
 * seed 라우트만 쓰는 서비스 키 클라이언트입니다. 무아레주메에서는
 * `@/server/admin/admin-repository`의 serviceClient()를 그대로 썼지만, 그
 * 파일에는 커뮤니티와 무관한 관리자 기능이 잔뜩 들어 있어 이식할 때 딸려오면
 * 곤란합니다. 그래서 필요한 부분만 떼어 여기에 다시 뒀습니다.
 *
 * 이식 후 src/app/api/community/seed/route.ts의 import 한 줄을
 *   import { serviceClient } from "@/server/admin/admin-repository";
 * 에서
 *   import { serviceClient } from "@/server/community/community-service-client";
 * 로 바꾸면 됩니다.
 *
 * SUPABASE_SECRET_KEY는 service_role 키입니다 — RLS를 통째로 우회하므로
 * 서버에서만 읽어야 하고, NEXT_PUBLIC_ 접두사를 절대 붙이면 안 됩니다.
 */
import { createClient } from "@supabase/supabase-js";

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY 설정이 없습니다.");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

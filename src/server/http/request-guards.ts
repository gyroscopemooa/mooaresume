import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 라우트마다 되풀이되던 두 관문 — 출처 확인과 로그인 확인.
 *
 * 사건 기능이 라우트를 다섯 개 더 만들면서, 같은 열 줄을 다섯 번 더 적게
 * 됐습니다. 이런 검사는 복사할수록 위험합니다 — 한 곳에서 빠뜨려도 나머지가
 * 멀쩡해 보여서 눈에 띄지 않습니다.
 *
 * 이미 있는 라우트들은 그대로 뒀습니다. 돌고 있는 결제 경로를 정리 목적만으로
 * 건드리지 않습니다.
 */

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host || new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export type GuardFailure = { ok: false; response: NextResponse };
export type GuardSuccess = { ok: true; userId: string; email?: string };

/**
 * 통과하면 사용자 id를, 막히면 그대로 돌려줄 응답을 줍니다.
 *
 * 응답을 여기서 만들어 돌려주는 이유는, 부르는 쪽이 `if (!guard.ok) return
 * guard.response;` 한 줄로 끝나게 하기 위해서입니다. 불리언만 돌려주면 상태
 * 코드와 문구를 라우트마다 다시 적게 되고, 그러면 또 갈라집니다.
 */
export async function guardMemberRequest(request: NextRequest): Promise<GuardFailure | GuardSuccess> {
  if (!isSameOrigin(request)) {
    return { ok: false, response: NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 }) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 }) };
  }
  return { ok: true, userId: data.user.id, email: data.user.email };
}

/** 본문이 JSON이 아닐 때의 응답도 한 곳에 둡니다. */
export async function readJsonBody(request: NextRequest): Promise<{ ok: true; body: unknown } | GuardFailure> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 }) };
  }
}

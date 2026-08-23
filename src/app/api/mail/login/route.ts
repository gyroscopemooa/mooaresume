import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as { secret?: unknown } | null;
  const expected = process.env.MAIL_ADMIN_SECRET?.trim();
  if (!expected || typeof input?.secret !== "string" || input.secret !== expected) return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("mooa_mail_admin", expected, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60 * 8, path: "/" });
  return response;
}

import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/server/admin/admin-session";

export const runtime = "nodejs";

/**
 * Clears the admin cookie. Shared with `/MAIL`, which has no sign-out of its
 * own — signing out here signs out of both, which is the safer direction.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}

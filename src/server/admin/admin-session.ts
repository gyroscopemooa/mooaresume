import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The admin gate.
 *
 * Reuses the cookie `/MAIL` already issues (`/api/mail/login`, path "/"), so
 * one password opens both screens and the existing mail login keeps working
 * untouched. Everything behind this gate reads other people's cover letters
 * and addresses, so the check is server-side only — never trust a client flag.
 */
export const ADMIN_COOKIE = "mooa_mail_admin";

function matches(candidate: string | undefined, expected: string) {
  if (!candidate || !expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so compare lengths first and still run the constant-time compare.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminSecret() {
  return process.env.MAIL_ADMIN_SECRET?.trim() ?? "";
}

/** For server components and route handlers that can read the cookie jar. */
export async function isAdmin() {
  const expected = adminSecret();
  if (!expected) return false;
  const jar = await cookies();
  return matches(jar.get(ADMIN_COOKIE)?.value, expected);
}

/** For route handlers holding the raw Request. */
export function isAdminRequest(request: Request) {
  const expected = adminSecret();
  if (!expected) return false;
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)mooa_mail_admin=([^;]+)/)?.[1];
  return matches(cookie, expected);
}

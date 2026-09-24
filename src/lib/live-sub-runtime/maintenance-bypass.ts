import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * 우회 토큰 확인(서버 전용). 토큰이 설정되지 않았으면 어떤 값도 통과시키지 않는다.
 * 양쪽을 sha256 으로 길이를 맞춘 뒤 상수시간으로 비교한다.
 */
export function isValidMaintenanceBypassToken(candidate: unknown, expected: string | undefined): boolean {
  if (!expected || expected.length < 16 || typeof candidate !== "string" || candidate.length === 0 || candidate.length > 200) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

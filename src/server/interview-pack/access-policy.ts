import { isApprovedTestAccount } from "@/domain/interview-pack";

/**
 * 누가 어떤 면접 준비팩에 접근할 수 있는가 — 순수 판정 함수.
 *
 * 판단 재료는 전부 서버가 확인한 값이다(관리자 쿠키 검증 결과, 로그인 세션의 이메일, 서버 환경변수의
 * 허용 목록, 서버 플래그). 클라이언트가 보낸 isAdmin·isTest·이메일 문자열·URL 파라미터·localStorage 는
 * 어디에도 들어오지 않는다. user_metadata 도 쓰지 않는다.
 *
 *  - 실제 구매 팩: 공개 플래그가 켜져 있어야 한다.
 *  - 관리자 스냅샷 팩(가상·복제 자료): 관리자 + 승인된 테스트 계정 둘 다여야 한다.
 *  - 테스트 이용권으로 만든 FINAL 팩: 승인된 테스트 계정이면 된다(일반 사용자 경로 확인용, 관리자 쿠키 불필요).
 *
 * 거절 사유는 응답에 드러내지 않고 404 로 감춘다(기능·테스트 팩의 존재를 알려 주지 않으려고).
 */

export type PackAccessSubject = { isTest: boolean; origin: "final_run" | "admin_snapshot" };

export type AccessInput = {
  publicEnabled: boolean;
  isAdmin: boolean;
  email: string | null | undefined;
  approvedEmails: readonly string[];
};

export type AccessDecision = { allowed: true } | { allowed: false; reason: "FEATURE_OFF" | "ADMIN_REQUIRED" | "TEST_ACCOUNT_REQUIRED" };

export function decidePackAccess(pack: PackAccessSubject, input: AccessInput): AccessDecision {
  if (!pack.isTest) return input.publicEnabled ? { allowed: true } : { allowed: false, reason: "FEATURE_OFF" };
  if (!isApprovedTestAccount(input.email, input.approvedEmails)) return { allowed: false, reason: "TEST_ACCOUNT_REQUIRED" };
  if (pack.origin === "admin_snapshot" && !input.isAdmin) return { allowed: false, reason: "ADMIN_REQUIRED" };
  return { allowed: true };
}

/** 팩이 아직 없을 때(처음 여는 순간) — 이 FINAL 실행의 권한 출처만으로 판정한다. */
export function decideRunAccess(accessSource: string, input: AccessInput): AccessDecision {
  return decidePackAccess({ isTest: accessSource === "admin_test", origin: "final_run" }, input);
}

/**
 * 관리자 테스트 콘솔 전체의 문. 관리자 쿠키 + 로그인 세션 + 승인된 테스트 계정, 셋 다 서버에서 확인한다.
 * 관리자 쿠키는 특정 사용자에 묶여 있지 않으므로, "누구의 이름으로" 만들지는 로그인 세션이 정한다.
 */
export function decideAdminTestAccess(input: { isAdmin: boolean; email: string | null | undefined; approvedEmails: readonly string[] }):
  | { allowed: true }
  | { allowed: false; reason: "ADMIN_REQUIRED" | "LOGIN_REQUIRED" | "TEST_ACCOUNT_REQUIRED" | "NOT_CONFIGURED" } {
  if (!input.isAdmin) return { allowed: false, reason: "ADMIN_REQUIRED" };
  if (input.approvedEmails.length === 0) return { allowed: false, reason: "NOT_CONFIGURED" };
  if (!input.email) return { allowed: false, reason: "LOGIN_REQUIRED" };
  if (!isApprovedTestAccount(input.email, input.approvedEmails)) return { allowed: false, reason: "TEST_ACCOUNT_REQUIRED" };
  return { allowed: true };
}

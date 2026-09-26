import { describe, expect, it } from "vitest";
import { decideAdminTestAccess, decidePackAccess, decideRunAccess } from "./access-policy";

const APPROVED = ["tester@example.com", "admin@example.com"];
const base = { publicEnabled: false, isAdmin: false, email: null as string | null, approvedEmails: APPROVED };

describe("팩 접근 판정", () => {
  const realPack = { isTest: false, origin: "final_run" as const };
  const testRunPack = { isTest: true, origin: "final_run" as const };
  const snapshotPack = { isTest: true, origin: "admin_snapshot" as const };

  it("실제 구매 팩은 공개 플래그가 꺼져 있으면 관리자도 열 수 없고, 켜져 있으면 열린다", () => {
    expect(decidePackAccess(realPack, { ...base, publicEnabled: false })).toEqual({ allowed: false, reason: "FEATURE_OFF" });
    expect(decidePackAccess(realPack, { ...base, publicEnabled: false, isAdmin: true, email: "admin@example.com" })).toEqual({ allowed: false, reason: "FEATURE_OFF" });
    expect(decidePackAccess(realPack, { ...base, publicEnabled: true, email: "anyone@example.com" })).toEqual({ allowed: true });
  });

  it("테스트 이용권 팩은 승인된 테스트 계정이면 열리고, 관리자 쿠키는 필요 없다", () => {
    expect(decidePackAccess(testRunPack, { ...base, email: "tester@example.com" })).toEqual({ allowed: true });
    expect(decidePackAccess(testRunPack, { ...base, email: "stranger@example.com" })).toEqual({ allowed: false, reason: "TEST_ACCOUNT_REQUIRED" });
    expect(decidePackAccess(testRunPack, { ...base, email: null })).toEqual({ allowed: false, reason: "TEST_ACCOUNT_REQUIRED" });
  });

  it("공개 플래그가 켜져 있어도 테스트 팩은 일반 사용자에게 열리지 않는다", () => {
    expect(decidePackAccess(testRunPack, { ...base, publicEnabled: true, email: "stranger@example.com" }).allowed).toBe(false);
    expect(decidePackAccess(snapshotPack, { ...base, publicEnabled: true, email: "stranger@example.com", isAdmin: true }).allowed).toBe(false);
  });

  it("관리자 스냅샷 팩은 관리자 쿠키와 승인된 계정이 모두 필요하다", () => {
    expect(decidePackAccess(snapshotPack, { ...base, isAdmin: true, email: "tester@example.com" })).toEqual({ allowed: true });
    expect(decidePackAccess(snapshotPack, { ...base, isAdmin: false, email: "tester@example.com" })).toEqual({ allowed: false, reason: "ADMIN_REQUIRED" });
    expect(decidePackAccess(snapshotPack, { ...base, isAdmin: true, email: "stranger@example.com" })).toEqual({ allowed: false, reason: "TEST_ACCOUNT_REQUIRED" });
  });

  it("이메일 대소문자·공백이 달라도 같은 계정으로 본다", () => {
    expect(decidePackAccess(testRunPack, { ...base, email: "  TESTER@Example.com " })).toEqual({ allowed: true });
  });

  it("허용 목록이 비어 있으면 어떤 테스트 팩도 열리지 않는다", () => {
    expect(decidePackAccess(testRunPack, { ...base, approvedEmails: [], email: "tester@example.com" }).allowed).toBe(false);
  });

  it("아직 없는 팩은 FINAL 실행의 권한 출처로 판정한다", () => {
    expect(decideRunAccess("polar", { ...base, publicEnabled: true, email: "x@example.com" })).toEqual({ allowed: true });
    expect(decideRunAccess("polar", { ...base, publicEnabled: false, email: "tester@example.com" }).allowed).toBe(false);
    expect(decideRunAccess("admin_test", { ...base, email: "tester@example.com" })).toEqual({ allowed: true });
    expect(decideRunAccess("admin_test", { ...base, publicEnabled: true, email: "x@example.com" }).allowed).toBe(false);
  });
});

describe("관리자 테스트 콘솔 접근", () => {
  it("관리자 쿠키·허용 목록 설정·로그인·승인된 계정 순서로 모두 통과해야 한다", () => {
    expect(decideAdminTestAccess({ isAdmin: false, email: "tester@example.com", approvedEmails: APPROVED })).toEqual({ allowed: false, reason: "ADMIN_REQUIRED" });
    expect(decideAdminTestAccess({ isAdmin: true, email: "tester@example.com", approvedEmails: [] })).toEqual({ allowed: false, reason: "NOT_CONFIGURED" });
    expect(decideAdminTestAccess({ isAdmin: true, email: null, approvedEmails: APPROVED })).toEqual({ allowed: false, reason: "LOGIN_REQUIRED" });
    expect(decideAdminTestAccess({ isAdmin: true, email: "stranger@example.com", approvedEmails: APPROVED })).toEqual({ allowed: false, reason: "TEST_ACCOUNT_REQUIRED" });
    expect(decideAdminTestAccess({ isAdmin: true, email: "tester@example.com", approvedEmails: APPROVED })).toEqual({ allowed: true });
  });
});

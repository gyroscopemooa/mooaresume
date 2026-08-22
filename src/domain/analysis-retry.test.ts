import { describe, expect, it } from "vitest";
import { canRetryAnalysis, MAX_ANALYSIS_ATTEMPTS } from "./analysis-retry";

const failedValidation = {
  analysisStatus: "FAILED",
  entitlementStatus: "ACTIVE",
  failureCode: "AI_OUTPUT_VALIDATION_FAILED",
  attemptCount: 1,
};

describe("재시도 가능 여부", () => {
  it("검증 실패는 시도가 남아 있으면 재시도할 수 있다", () => {
    expect(canRetryAnalysis(failedValidation)).toBe(true);
  });

  it("시도 횟수를 다 쓰면 재시도할 수 없다", () => {
    expect(canRetryAnalysis({ ...failedValidation, attemptCount: MAX_ANALYSIS_ATTEMPTS })).toBe(false);
  });

  it("작업이 유실된 실행은 실패 코드로 판단한다", () => {
    // 이 경로는 시도 횟수가 아니라 실패 코드를 보므로 횟수와 무관하게 통과한다.
    expect(canRetryAnalysis({ ...failedValidation, failureCode: "ANALYSIS_ORPHANED", attemptCount: 9 })).toBe(true);
  });

  it("그 밖의 실패 코드는 재시도 대상이 아니다", () => {
    // 이게 이번 버그의 원인: 화면은 재시도 버튼을 띄웠지만 DB 함수가 거절했고,
    // 거절이 500으로 노출됐다.
    for (const failureCode of ["AI_PROVIDER_FAILED", "ANALYSIS_FAILED", "PRIMARY_DOCUMENT_REQUIRED", null]) {
      expect(canRetryAnalysis({ ...failedValidation, failureCode })).toBe(false);
    }
  });

  it("실패하지 않은 실행은 재시도 대상이 아니다", () => {
    for (const analysisStatus of ["PENDING", "RUNNING", "COMPLETED", null]) {
      expect(canRetryAnalysis({ ...failedValidation, analysisStatus })).toBe(false);
    }
  });

  it("권한이 살아 있지 않으면 재시도할 수 없다", () => {
    // 환불되었거나 이미 소진된 결제로 다시 분석을 돌려서는 안 된다.
    for (const entitlementStatus of ["REVOKED", "CONSUMED", null]) {
      expect(canRetryAnalysis({ ...failedValidation, entitlementStatus })).toBe(false);
    }
  });

  it("시도 횟수를 모르면 0으로 본다", () => {
    expect(canRetryAnalysis({ ...failedValidation, attemptCount: null })).toBe(true);
  });
});

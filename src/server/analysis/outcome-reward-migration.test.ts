import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824120000_outcome_report_reward.sql", "utf8");

describe("결과 보고 보상 마이그레이션", () => {
  it("합격과 불합격에 똑같이 지급한다", () => {
    // The rule the whole feature rests on. If FAIL were missing here, the pass
    // rate we publish would be a number we paid people to produce.
    for (const settled of ["DOCUMENT_PASS", "DOCUMENT_FAIL", "INTERVIEW_1_PASS", "INTERVIEW_1_FAIL", "FINAL_PASS", "FINAL_FAIL"]) {
      expect(migration).toContain(`'${settled}'`);
    }
  });

  it("결과 대기 상태에는 지급하지 않는다", () => {
    expect(migration).toContain("'NOT_SETTLED'");
  });

  it("한 지원 건에 한 장만 지급한다", () => {
    expect(migration).toContain("reward_credit_id uuid unique");
    expect(migration).toContain("'ALREADY_REWARDED'");
    expect(migration).toContain("for update");
  });

  it("분석하지 않은 지원 건은 공짜 이용권이 아니다", () => {
    // Without this an empty case is a free credit in two clicks, forever.
    expect(migration).toContain("'NO_COMPLETED_ANALYSIS'");
    expect(migration).toContain("status = 'COMPLETED'");
  });

  it("남의 지원 건에 지급할 수 없다", () => {
    expect(migration).toContain("case_owner_id <> current_user_id");
    expect(migration).toContain("AUTHENTICATION_REQUIRED");
  });

  it("QUICK 한 장이다", () => {
    expect(migration).toContain("'QUICK', 'OUTCOME_REPORT'");
  });

  it("새 지급 사유가 제약에 들어가 있다", () => {
    expect(migration).toContain("'OUTCOME_REPORT'");
    expect(migration).toContain("reward_credits_reason_check");
    // The other reasons must survive the constraint swap.
    for (const kept of ["LAUNCH_EVENT", "REFERRAL", "SNS", "CS", "MANUAL"]) {
      expect(migration).toContain(`'${kept}'`);
    }
  });

  it("브라우저가 부르는 함수라 본인 인증을 함수 안에서 한다", () => {
    expect(migration).toContain("grant execute on function public.record_application_outcome(uuid, text) to authenticated");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
  });
});

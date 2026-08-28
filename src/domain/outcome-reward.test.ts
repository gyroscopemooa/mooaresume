import { describe, expect, it } from "vitest";
import {
  OUTCOME_REWARD_PRODUCT,
  OUTCOME_REWARD_PROMISE,
  SETTLED_OUTCOMES,
  describeOutcomeReward,
  isSettledOutcome,
  parseOutcomeReward,
} from "./outcome-reward";

describe("결과 보고 보상", () => {
  it("합격과 불합격을 똑같이 대우한다", () => {
    // The one rule this feature cannot bend. Paying only for good news makes
    // the pass rate a number we wrote ourselves.
    for (const stage of ["DOCUMENT", "INTERVIEW_1", "FINAL"]) {
      expect(isSettledOutcome(`${stage}_PASS`)).toBe(true);
      expect(isSettledOutcome(`${stage}_FAIL`)).toBe(true);
    }
    const passes = SETTLED_OUTCOMES.filter((s) => s.endsWith("PASS")).length;
    expect(passes).toBe(SETTLED_OUTCOMES.filter((s) => s.endsWith("FAIL")).length);
  });

  it("결과가 아직 안 나온 상태에는 지급하지 않는다", () => {
    for (const waiting of ["RESULT_PENDING", "SUBMITTED", "NOT_SUBMITTED", "INTERVIEW_1_PENDING", "FINAL_INTERVIEW_PENDING", "UNKNOWN", "WITHDRAWN"]) {
      expect(isSettledOutcome(waiting)).toBe(false);
    }
  });

  it("보상은 QUICK 한 장이다", () => {
    // Matching the purchased tier would hand a FINAL buyer another FINAL for
    // one button press.
    expect(OUTCOME_REWARD_PRODUCT).toBe("QUICK");
  });

  it("약속 문구가 동등 지급을 밝힌다", () => {
    expect(OUTCOME_REWARD_PROMISE).toContain("합격이든 불합격이든");
  });

  it("지급되면 지급됐다고 말한다", () => {
    const granted = parseOutcomeReward({ status: "DOCUMENT_FAIL", rewardGranted: true, product: "QUICK" });
    expect(describeOutcomeReward(granted)).toContain("이용권");
  });

  it("이미 받은 지원 건은 중복 지급이 아니라고 알린다", () => {
    const again = parseOutcomeReward({ status: "FINAL_PASS", rewardGranted: false, reason: "ALREADY_REWARDED" });
    expect(describeOutcomeReward(again)).toContain("이미");
  });

  it("나머지 경우엔 아무 말도 하지 않는다", () => {
    // A notice explaining why they did not get a credit reads as a refusal for
    // having pressed the wrong button.
    for (const reason of ["NOT_SETTLED", "NO_COMPLETED_ANALYSIS"]) {
      expect(describeOutcomeReward(parseOutcomeReward({ status: "X", rewardGranted: false, reason }))).toBeNull();
    }
    expect(describeOutcomeReward(null)).toBeNull();
  });

  it("모르는 응답은 조용히 무시한다", () => {
    expect(parseOutcomeReward(null)).toBeNull();
    expect(parseOutcomeReward({ nope: 1 })).toBeNull();
  });
});

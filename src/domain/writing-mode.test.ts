import { describe, expect, it } from "vitest";
import { decideWritingMode, issueTagSchema, writingModeDecisionSchema } from "./writing-mode";

describe("decideWritingMode", () => {
  it("chooses CREATE when there is no draft", () => {
    const result = decideWritingMode({ draft: "", hasJobPosting: true, targetLength: 700 });
    expect(result.mode).toBe("CREATE");
    expect(writingModeDecisionSchema.safeParse(result).success).toBe(true);
  });

  it("chooses BUILD for a short incomplete draft", () => {
    const result = decideWritingMode({ draft: "자동차 산업에 관심이 많아 지원했습니다.", hasJobPosting: true, targetLength: 700 });
    expect(result.mode).toBe("BUILD");
    expect(result.reasons[0]).toContain("목표 분량");
  });

  it("chooses POLISH when the target length is mostly filled", () => {
    const result = decideWritingMode({ draft: "가".repeat(650), hasJobPosting: true, targetLength: 700 });
    expect(result.mode).toBe("POLISH");
    expect(result.canOverride).toBe(true);
  });

  it("chooses BUILD for a long draft with an unfinished numbered question", () => {
    const draft = `1. 지원 동기\n${"안전관리 경험을 작성했습니다. ".repeat(30)}\n\n2. 회사에 필요한 사람\n배관 부식 지점을 찾았습니다.\n\n3. 장단점\n꼼꼼함이 장점입니다.\n\n4. 경력사항\n주특기 업무작성`;
    const result = decideWritingMode({ draft, hasJobPosting: true, targetLength: 700 });
    expect(result.mode).toBe("BUILD");
    expect(result.reasons.join(" ")).toContain("4번 문항");
  });

  it("chooses BUILD when an editing memo remains in a substantial draft", () => {
    const draft = `${"완성된 문장입니다. ".repeat(60)} (사고내용 작성 가능할 경우 작성 필요)`;
    const result = decideWritingMode({ draft, hasJobPosting: true, targetLength: 700 });
    expect(result.mode).toBe("BUILD");
    expect(result.reasons.join(" ")).toContain("메모");
  });

  it("rejects issue tags outside the contract", () => {
    expect(issueTagSchema.safeParse("personality_score").success).toBe(false);
  });
});

describe("분량 판단은 문항 단위로", () => {
  // 사용자가 PRO POLISH 결과에서 409/700, 389/700, 487/700을 받았다. 원인은
  // 첨삭이 아니라 그 앞의 단계 판단이었다 — 전체 초안 길이를 한 문항의 목표
  // 글자 수로 나눠서, 문항이 많을수록 무조건 "충분히 썼다"가 됐다.
  const threeThinAnswers = [
    "1. 지원 동기를 서술하세요.",
    "가".repeat(450),
    "2. 강점을 서술하세요.",
    "나".repeat(450),
    "3. 입사 후 포부를 서술하세요.",
    "다".repeat(450),
  ].join("\n");

  it("문항마다 목표에 못 미치면 문항이 많아도 BUILD로 판단한다", () => {
    const decision = decideWritingMode({ draft: threeThinAnswers, targetLength: 700, hasJobPosting: true });

    // 합계는 1350자로 700자를 훌쩍 넘지만, 문항당으로 보면 목표의 3분의 2다.
    expect(decision.mode).toBe("BUILD");
    expect(decision.reasons[0]).toMatch(/목표 분량의 6\d%/);
  });

  it("문항마다 목표를 채웠으면 POLISH로 판단한다", () => {
    const filled = [
      "1. 지원 동기를 서술하세요.",
      "가".repeat(640),
      "2. 강점을 서술하세요.",
      "나".repeat(640),
    ].join("\n");

    expect(decideWritingMode({ draft: filled, targetLength: 700, hasJobPosting: true }).mode).toBe("POLISH");
  });

  it("한 문항짜리 초안의 판단은 예전과 같다", () => {
    const single = "가".repeat(600);

    expect(decideWritingMode({ draft: single, targetLength: 700, hasJobPosting: true }).mode).toBe("POLISH");
    expect(decideWritingMode({ draft: "가".repeat(300), targetLength: 700, hasJobPosting: true }).mode).toBe("BUILD");
  });
});

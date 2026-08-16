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

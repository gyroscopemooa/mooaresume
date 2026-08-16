import { describe, expect, it } from "vitest";
import { splitCoverLetterDraft } from "./cover-letter-parser";

describe("splitCoverLetterDraft", () => {
  it("splits numbered questions without an AI call", () => {
    const result = splitCoverLetterDraft("1. 지원동기\n첫 번째 답변\n\n2. 직무 역량을 작성해 주세요.\n두 번째 답변");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ title: "지원동기", answer: "첫 번째 답변", targetLength: null });
    expect(result[1]).toMatchObject({ prompt: "직무 역량을 작성해 주세요.", answer: "두 번째 답변" });
  });

  it("keeps an unstructured draft as one question", () => {
    expect(splitCoverLetterDraft("번호가 없는 전체 자기소개서")[0].answer).toBe("번호가 없는 전체 자기소개서");
  });

  it("ignores resume GPA and a sentence beginning with 2번의", () => {
    const text = `이 력 서\n3.35/4.5\n자  기  소  개  서\n1. 지원동기를 작성해 주세요\n첫 답변\n2. 필요한 사람임을 작성해 주세요\n2번의 안전진단 아르바이트를 경험했습니다.\n3. 장단점을 작성해 주세요\n세 번째 답변\n4. 경력사항을 작성해 주세요\n주특기 업무작성\n경 력 기 술 서\n회사명`;
    const result = splitCoverLetterDraft(text);
    expect(result).toHaveLength(4);
    expect(result[1].answer).toBe("2번의 안전진단 아르바이트를 경험했습니다.");
    expect(result[2].answer).toBe("세 번째 답변");
    expect(result[3].answer).toBe("");
  });
});

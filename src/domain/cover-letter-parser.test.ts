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

  it("자소서 안쪽 소제목으로 쓰인 경력기술서에서는 자르지 않는다", () => {
    // `이력서`·`경력기술서`에서 자르는 것은 한 파일에 자소서와 이력서를 이어
    // 붙인 사람 때문입니다. 그런데 같은 말을 자소서 안에서 소제목으로 쓰면
    // 뒤쪽 문항이 통째로 사라졌고, 화면은 남은 문항만 보여 주므로 손님은
    // 자기가 올린 문항이 없어진 줄도 몰랐습니다.
    const text = [
      "1. 지원동기", "첫 답변",
      "2. 직무 강점", "둘째 답변",
      "경력기술서",
      "3. 입사 후 포부", "셋째 답변",
      "4. 마지막 각오", "넷째 답변",
    ].join("\n");
    const result = splitCoverLetterDraft(text);
    expect(result).toHaveLength(4);
    expect(result[3]).toMatchObject({ title: "마지막 각오", answer: "넷째 답변" });
  });

  it("번호가 1부터 다시 시작하면 진짜 경계로 보고 자른다", () => {
    // 이력서 항목은 대개 1부터 다시 셉니다. 이어지는 번호가 아니라는 것이
    // 소제목과 경계를 가르는 신호입니다.
    const text = [
      "1. 지원동기", "첫 답변",
      "2. 직무 강점", "둘째 답변",
      "이력서",
      "1. 첫 회사", "2. 다음 회사",
    ].join("\n");
    const result = splitCoverLetterDraft(text);
    expect(result).toHaveLength(2);
    expect(result[1].answer).toBe("둘째 답변");
  });
});

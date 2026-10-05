import { describe, expect, it } from "vitest";
import { applyMechanicalFixes } from "./mechanical-fixes";

describe("applyMechanicalFixes", () => {
  it("띄어쓰기 한 칸을 옮긴다 (무학등 → 무학 등)", () => {
    const original = "70대 이상 무학등 표집이 어려운 정상군만 남았습니다.";
    const candidate = "70대 이상 무학 등 표집이 어려운 정상군만 남았습니다.";
    const result = applyMechanicalFixes(original, candidate);
    expect(result.text).toBe(candidate);
    expect(result.fixes).toHaveLength(1);
    expect(original).toContain(result.fixes[0].snippet);
  });

  it("겹쳐 쓴 글자 하나를 지운다 (도도로 → 도로)", () => {
    const result = applyMechanicalFixes("제7회 도도로경관디자인대전에서 입상했습니다.", "제7회 도로경관디자인대전에서 입상했습니다.");
    expect(result.text).toBe("제7회 도로경관디자인대전에서 입상했습니다.");
    expect(result.fixes[0].kind).toBe("duplicate");
  });

  it("단어 교체와 문장 재작성은 옮기지 않고, 따로 떨어진 오탈자만 옮긴다", () => {
    const original = "저는 꼼꼼한 성격입니다. 검사결과를 정리했습니다. 이에 관련 저서를 찾아보았습니다.";
    const candidate = "저는 세심한 사람입니다. 검사 결과를 정리했습니다. 그래서 관련 책을 살펴봤습니다.";
    const result = applyMechanicalFixes(original, candidate);
    expect(result.text).toBe("저는 꼼꼼한 성격입니다. 검사 결과를 정리했습니다. 이에 관련 저서를 찾아보았습니다.");
  });

  it("차이가 없거나 재작성뿐이면 원문을 그대로 돌려준다", () => {
    expect(applyMechanicalFixes("같은 글입니다.", "같은 글입니다.")).toEqual({ text: "같은 글입니다.", fixes: [] });
    const rewritten = applyMechanicalFixes("문제를 해결했습니다.", "어려움을 끝까지 풀어냈습니다.");
    expect(rewritten.text).toBe("문제를 해결했습니다.");
  });

  it("줄바꿈은 건드리지 않는다", () => {
    const result = applyMechanicalFixes("첫 문단입니다.\n둘째 문단입니다.", "첫 문단입니다. 둘째 문단입니다.");
    expect(result.text).toBe("첫 문단입니다.\n둘째 문단입니다.");
  });
});

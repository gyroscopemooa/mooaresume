import { describe, expect, it } from "vitest";
import { describeOverLongAnswer } from "./cover-letter-question";

const answer = (chars: number) => "가".repeat(chars);

describe("describeOverLongAnswer", () => {
  it("목표를 정하지 않았으면 아무 말도 하지 않는다", () => {
    expect(describeOverLongAnswer({ answer: answer(8000), targetLength: null })).toBeNull();
  });

  it("조금 넘는 것은 정상이라 경고하지 않는다", () => {
    // Trimming to fit is half of what editing is.
    expect(describeOverLongAnswer({ answer: answer(1000), targetLength: 700 })).toBeNull();
    expect(describeOverLongAnswer({ answer: answer(1120), targetLength: 700 })).toBeNull();
  });

  it("대부분이 사라질 만큼 길면 그 사실을 말한다", () => {
    // The case that lost 94% of a paid result: an unsplit upload.
    const message = describeOverLongAnswer({ answer: answer(8251), targetLength: 700 });
    expect(message).toContain("8,251자");
    expect(message).toContain("700자");
    expect(message).toContain("여러 문항이 한 칸에");
  });

  it("공백은 세지 않는다", () => {
    expect(describeOverLongAnswer({ answer: `${answer(1000)}${" ".repeat(5000)}`, targetLength: 700 })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { stabilityQuestions } from "@/fixtures/quick-stability-case";
import { findSimilarEarlierAnalysis, MIN_COMPARABLE_CHARACTERS, type EarlierAnalysis } from "./similar-earlier-analysis";

const answers = stabilityQuestions.map((question) => question.answer);
const earlier = (analysisRunId: string, analyzedAt: string, originals: string[], revised: string[] = originals): EarlierAnalysis => ({
  analysisRunId, analyzedAt, questions: originals.map((originalAnswer, index) => ({ originalAnswer, revisedAnswer: revised[index] ?? originalAnswer })),
});
const lightlyEdited = (text: string) => text.replace(/\.\s*$/, ". 이 경험을 인턴 업무에서도 이어 가고 싶습니다.");

describe("findSimilarEarlierAnalysis", () => {
  it("finds the earlier analysis of the same letter, even when a sentence was added", () => {
    const found = findSimilarEarlierAnalysis(answers.map(lightlyEdited), [earlier("run-old", "2026-10-04T03:00:00Z", answers)]);
    expect(found).toEqual({ analysisRunId: "run-old", analyzedAt: "2026-10-04T03:00:00Z" });
  });

  it("also finds it when the applicant pasted back the revision they were given", () => {
    // 지난번 첨삭본(= 지금 붙여 넣은 글)과 그때의 원문(지금 글과 전혀 다름)을 따로 둔다. 첨삭본 쪽과 견줘서 찾아야 한다.
    const revised = answers.map((text) => `${text} 이 점을 앞으로도 살리겠습니다.`);
    const thenOriginals = answers.map((_, index) => `${index + 1}번 문항의 그때 원문은 지금 글과 전혀 다른 내용으로 쓰여 있었습니다. `.repeat(6));
    const found = findSimilarEarlierAnalysis(revised, [earlier("run-old", "2026-10-04T03:00:00Z", thenOriginals, revised)]);
    expect(found?.analysisRunId).toBe("run-old");
    // 첨삭본까지 견주지 않았다면 이 글은 어느 쪽과도 비슷하지 않아 못 찾는다(그래서 위 결과는 첨삭본 비교 덕이다).
    expect(findSimilarEarlierAnalysis(revised, [earlier("run-old", "2026-10-04T03:00:00Z", thenOriginals, thenOriginals)])).toBeNull();
  });

  it("says nothing about a different letter", () => {
    const other = [
      "저는 어린 시절부터 사람들 앞에서 이야기하는 것을 좋아했고, 방송반 활동을 하며 친구들의 사연을 소개하는 일을 맡았습니다. 마이크 앞에서 떨리는 마음을 다스리는 법을 배웠고, 듣는 사람의 표정을 살피며 속도를 조절하는 습관이 생겼습니다.",
      "아르바이트로 일한 카페에서는 단골 손님의 취향을 기억해 두었다가 먼저 권해 드렸습니다. 작은 메모를 적어 두는 습관이 쌓이면서 손님이 다시 찾아 주는 일이 늘었고, 사장님께서 신메뉴 시식을 저에게 맡기셨습니다.",
    ];
    expect(findSimilarEarlierAnalysis(other, [earlier("run-old", "2026-10-04T03:00:00Z", answers)])).toBeNull();
  });

  it("needs most of the questions to match, not just one", () => {
    const mostlyNew = [answers[0], "완전히 새로 쓴 두 번째 답변입니다. 지역 상권을 살리는 일을 하고 싶어 이 직무에 지원했고, 데이터를 읽는 힘을 길러 왔습니다.", "완전히 새로 쓴 세 번째 답변입니다. 팀 프로젝트에서 일정이 밀렸을 때 역할을 다시 나누어 마감을 지켰던 경험이 있습니다.", "완전히 새로 쓴 네 번째 답변입니다. 서로 다른 의견을 정리해 하나의 결론으로 모았던 경험을 이야기하겠습니다.", "완전히 새로 쓴 다섯 번째 답변입니다. 지역 소멸 문제를 청년 일자리의 관점에서 바라보고 싶습니다."];
    expect(findSimilarEarlierAnalysis(mostlyNew, [earlier("run-old", "2026-10-04T03:00:00Z", answers)])).toBeNull();
    // 다섯 중 셋이 같으면(60%) 비슷한 글이다.
    const threeSame = [answers[0], answers[1], answers[2], mostlyNew[3], mostlyNew[4]];
    expect(findSimilarEarlierAnalysis(threeSame, [earlier("run-old", "2026-10-04T03:00:00Z", answers)])).not.toBeNull();
  });

  it("does not need the same number or order of questions", () => {
    const reordered = [answers[3], answers[1], answers[0]];
    expect(findSimilarEarlierAnalysis(reordered, [earlier("run-old", "2026-10-04T03:00:00Z", answers)])).not.toBeNull();
    expect(findSimilarEarlierAnalysis([answers[2]], [earlier("run-old", "2026-10-04T03:00:00Z", answers)])).not.toBeNull();
  });

  it("returns the most recent qualifying analysis (the list is newest first)", () => {
    const found = findSimilarEarlierAnalysis(answers, [
      earlier("run-unrelated", "2026-10-05T03:00:00Z", ["다른 글입니다. ".repeat(12)]),
      earlier("run-newer", "2026-10-03T03:00:00Z", answers),
      earlier("run-older", "2026-09-01T03:00:00Z", answers),
    ]);
    expect(found?.analysisRunId).toBe("run-newer");
  });

  it("does not compare answers too short to compare", () => {
    expect(MIN_COMPARABLE_CHARACTERS).toBeGreaterThanOrEqual(30);
    expect(findSimilarEarlierAnalysis(["열심히 하겠습니다."], [earlier("run-old", "2026-10-04T03:00:00Z", ["열심히 하겠습니다."])])).toBeNull();
    expect(findSimilarEarlierAnalysis(["", "  "], [earlier("run-old", "2026-10-04T03:00:00Z", answers)])).toBeNull();
  });

  it("has nothing to say when there is no earlier analysis", () => {
    expect(findSimilarEarlierAnalysis(answers, [])).toBeNull();
    expect(findSimilarEarlierAnalysis(answers, [earlier("run-empty", "2026-10-04T03:00:00Z", [])])).toBeNull();
  });
});

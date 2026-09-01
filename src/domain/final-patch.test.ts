import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import { buildFinalWrapUp } from "./final-wrap-up";
import { applyPatches, buildPatchQuestions, countAppliedPatches, locateQuote } from "./final-patch";
import type { ResultDocument, ResultQuestion } from "./result-document";

/**
 * 제출 전 보완.
 *
 * 여기서 지켜야 할 것은 하나입니다 — **지목한 문장만 바뀔 것.** 나머지가 함께
 * 흔들리면 손님은 고칠수록 나빠졌다고 느낍니다.
 */

const SK = "담당 학생 9명 중 7명이 합격한 경험이 있습니다.";

function question(over: Partial<ResultQuestion> = {}): ResultQuestion {
  return {
    id: "q1", order: 1, title: "지원동기", prompt: "왜 지원했습니까?", targetLength: 1600,
    originalAnswer: "원문입니다.",
    revisedAnswer: `대학일자리센터에서 상담을 맡았습니다. ${SK} 앞으로도 이어가고 싶습니다.`,
    highlightedPhrases: [], revisionReasons: ["근거를 붙였습니다."],
    ...over,
  } as ResultQuestion;
}

describe("locateQuote", () => {
  it("첨삭본에서 그 문장을 찾는다", () => {
    const found = locateQuote([question()], "담당 학생 9명 중 7명이 합격한 경험");
    expect(found?.questionId).toBe("q1");
    expect(found?.sentence).toBe(SK);
  });

  it("띄어쓰기와 문장부호가 달라도 찾는다", () => {
    // 인용은 원문에서 뽑은 것이라 첨삭본과 글자가 조금 다릅니다.
    expect(locateQuote([question()], "담당학생 9명중 7명이 합격한 경험,")?.questionId).toBe("q1");
  });

  it("없으면 비슷한 문장을 고르지 않고 못 찾았다고 답한다", () => {
    // 닮은 자리를 골라 고치면 엉뚱한 문장이 바뀝니다.
    expect(locateQuote([question()], "SK하이닉스 서류 전형을 세 번 준비했습니다")).toBeNull();
  });

  it("너무 짧은 인용으로는 찾지 않는다", () => {
    expect(locateQuote([question()], "합격")).toBeNull();
  });
});

describe("applyPatches", () => {
  const patch = { itemId: "i1", questionId: "q1", before: SK, after: "담당 학생 7명 중 5명이 합격했습니다." };

  it("지목한 문장만 바꾼다", () => {
    const [patched] = applyPatches([question()], [patch]);
    expect(patched.revisedAnswer).toContain("7명 중 5명이 합격했습니다.");
    expect(patched.revisedAnswer).toContain("대학일자리센터에서 상담을 맡았습니다.");
    expect(patched.revisedAnswer).toContain("앞으로도 이어가고 싶습니다.");
  });

  it("그 문장이 없으면 문항을 건드리지 않는다", () => {
    // 첨삭본이 조용히 달라지는 것보다 하나 못 고치는 편이 낫습니다.
    const original = question();
    const [untouched] = applyPatches([original], [{ ...patch, before: "여기 없는 문장입니다." }]);
    expect(untouched).toBe(original);
  });

  it("다른 문항은 그대로 둔다", () => {
    const other = question({ id: "q2", revisedAnswer: "두 번째 문항입니다." });
    const [, second] = applyPatches([question(), other], [patch]);
    expect(second).toBe(other);
  });
});

describe("countAppliedPatches", () => {
  it("실제로 바뀐 것만 센다", () => {
    // 못 찾아 넘어간 것을 성과로 세면, 화면은 고쳤다고 하는데 문서는 그대로입니다.
    const count = countAppliedPatches([question()], [
      { itemId: "a", questionId: "q1", before: SK, after: "고침" },
      { itemId: "b", questionId: "q1", before: "없는 문장", after: "고침" },
    ]);
    expect(count).toBe(1);
  });
});

describe("buildPatchQuestions", () => {
  const result = {
    ...sampleResultDocument, product: "FINAL",
    questions: [question()],
    rejectionRisks: [], interviewerFlags: [], claimEvidence: [],
    documentConflicts: [{
      id: "c1", field: "achievement", resumeStatement: "7명중 5명합격",
      coverLetterQuote: "담당 학생 9명 중 7명이 합격한 경험",
      conflict: "합격 인원이 다릅니다.", severity: "high",
      resolution: "집계 기준을 확인해 수치를 통일하세요.",
    }],
  } as ResultDocument;

  it("확인이 필요한 것만 묻고, 고를 답을 함께 준다", () => {
    const questions = buildPatchQuestions(result, buildFinalWrapUp(result));
    expect(questions).toHaveLength(1);
    expect(questions[0].choices).toEqual(["담당 학생 9명 중 7명이 합격한 경험", "7명중 5명합격"]);
    expect(questions[0].questionId).toBe("q1");
  });

  it("첨삭본에서 문장을 못 찾으면 그렇다고 표시한다", () => {
    // 고칠 자리를 모르면서 고쳐 주겠다고 하면 안 됩니다.
    const elsewhere = { ...result, questions: [question({ revisedAnswer: "전혀 다른 내용입니다." })] } as ResultDocument;
    expect(buildPatchQuestions(elsewhere, buildFinalWrapUp(elsewhere))[0].questionId).toBeNull();
  });
});

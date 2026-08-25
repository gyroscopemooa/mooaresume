import { describe, expect, it } from "vitest";
import { createCoverLetterQuestion, resolveDraftTargetLength, serializeQuestionAnswers } from "./cover-letter-question";
import { splitCoverLetterDraft } from "./cover-letter-parser";
import { buildApplicationCasePlan } from "@/application/application-case-handoff";

function question(title: string, answer: string, targetLength: number | null) {
  return { ...createCoverLetterQuestion(answer), title, targetLength };
}

describe("문항별 글자 수 제한이 분석까지 살아남는다", () => {
  it("직접 적은 제한을 요청 글자 수로 쓴다", () => {
    // The bug: every entry screen passed a hardcoded 700 while the form beside
    // it collected 1,500, so the result came back 800 characters short.
    expect(resolveDraftTargetLength([question("지원동기", "내용", 1500)], 700)).toBe(1500);
  });

  it("아무 문항도 제한을 안 적었을 때만 기본값을 쓴다", () => {
    expect(resolveDraftTargetLength([question("지원동기", "내용", null)], 700)).toBe(700);
    expect(resolveDraftTargetLength([], 700)).toBe(700);
  });

  it("문항마다 다르면 가장 큰 값을 기준으로 잡는다", () => {
    // It is only the ceiling a question without its own limit falls back to;
    // picking the smallest would clip the long question.
    expect(resolveDraftTargetLength([question("A", "내용", 700), question("B", "내용", 1500)], 700)).toBe(1500);
  });

  it("아직 안 쓴 문항의 제한 때문에 쓴 문항이 밀리지 않는다", () => {
    expect(resolveDraftTargetLength([question("A", "내용", 800), question("B", "", 3000)], 700)).toBe(800);
  });

  it("직렬화했다가 다시 나눠도 문항별 제한이 그대로다", () => {
    const questions = [question("지원동기", "첫 번째 답변", 1500), question("입사 후 포부", "두 번째 답변", 800)];
    const text = serializeQuestionAnswers(questions, { includeEmptyAnswers: true, includeTargetLength: true });
    const parsed = splitCoverLetterDraft(text);

    expect(parsed.map((item) => item.targetLength)).toEqual([1500, 800]);
    // The marker must not stay glued to the title the applicant sees.
    expect(parsed.map((item) => item.title)).toEqual(["지원동기", "입사 후 포부"]);
  });

  it("표시용 직렬화에는 표시가 붙지 않는다", () => {
    // This is the text shown back to the applicant on later screens.
    const text = serializeQuestionAnswers([question("지원동기", "답변", 1500)]);
    expect(text).not.toContain("[1500자]");
  });

  it("실제 계획에도 적은 제한이 그대로 실린다", () => {
    const plan = buildApplicationCasePlan({
      title: "새 지원서",
      product: "QUICK",
      writingMode: "POLISH",
      writingStyle: "BALANCED",
      editingStance: "BALANCED",
      targetLength: 700,
      questions: [question("지원동기", "첫 번째 답변", 1500)],
      jobPosting: { text: "", url: "", filenames: [] },
      candidateMaterials: { schemaVersion: "1.0", freeformNotes: "", experiences: [], freeformAttachments: [], profileEntries: [], materialAttachments: [] },
    });

    expect(plan.targetLength).toBe(1500);
    const coverLetter = plan.documents.find((document) => document.kind === "COVER_LETTER");
    expect(splitCoverLetterDraft(coverLetter!.normalizedText)[0].targetLength).toBe(1500);
  });
});

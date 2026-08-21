import { describe, expect, it } from "vitest";
import {
  applyGuidedAnswers,
  availableGuidedBlocks,
  composeGuidedAnswer,
  createGuidedCreateDraft,
  createGuidedExperience,
  createGuidedQuestion,
  buildGuidedSteps,
  experienceBlockId,
  MAX_GUIDED_EXPERIENCES,
} from "./guided-create";

function filledDraft() {
  return {
    ...createGuidedCreateDraft(),
    motivation: "현장실습에서 안전관리자를 처음 봤습니다.",
    experiences: [{
      category: "경력·인턴",
      where: "롯데테크 현장실습 · 2025.03~2025.08 · 안전관리 보조",
      situation: "같은 공정에서 불량이 반복됐습니다.",
      action: "검사 기준서와 작업 순서를 직접 대조했습니다.",
      result: "점검 순서를 통일해 시험했습니다.",
    }],
  };
}

describe("buildGuidedSteps", () => {
  it("문항을 먼저 묻고 마지막에 배정한다", () => {
    // What to ask depends on what the questions ask, so the questions come first.
    const steps = buildGuidedSteps(createGuidedCreateDraft());

    expect(steps[0].id).toBe("questions");
    expect(steps.at(-1)?.id).toBe("assign");
  });

  it("경험 상황 질문이 문제 해결형을 전제하지 않는다", () => {
    const situation = buildGuidedSteps(createGuidedCreateDraft()).find((step) => step.id === "experience-0-situation");

    expect(situation?.title).toContain("어려웠거나");
    expect(situation?.title).not.toContain("문제나 과제가 있었나요");
  });

  it("경험을 추가하면 네 단계가 함께 늘어난다", () => {
    const one = buildGuidedSteps(createGuidedCreateDraft());
    const two = buildGuidedSteps({ ...createGuidedCreateDraft(), experiences: [createGuidedExperience(), createGuidedExperience()] });

    expect(two.length - one.length).toBe(4);
  });

  it("모든 경험을 같은 방식으로 묻는다", () => {
    const steps = buildGuidedSteps({ ...createGuidedCreateDraft(), experiences: [createGuidedExperience(), createGuidedExperience()] });
    const fieldsOf = (index: number) => steps.filter((step) => step.experienceIndex === index).flatMap((step) => step.fields.map((field) => field.kind === "experience" ? field.field : field.path));

    // The second experience used to be squeezed onto one screen.
    expect(fieldsOf(1)).toEqual(fieldsOf(0));
  });

  it("마지막 경험 끝에서만 추가를 제안하고 상한에서 멈춘다", () => {
    const steps = buildGuidedSteps(createGuidedCreateDraft());
    expect(steps.filter((step) => step.offersAnotherExperience)).toHaveLength(1);

    const full = buildGuidedSteps({
      ...createGuidedCreateDraft(),
      experiences: Array.from({ length: MAX_GUIDED_EXPERIENCES }, createGuidedExperience),
    });
    expect(full.some((step) => step.offersAnotherExperience)).toBe(false);
  });
});

describe("availableGuidedBlocks", () => {
  it("입력한 소재만 고를 수 있게 한다", () => {
    expect(availableGuidedBlocks(createGuidedCreateDraft())).toEqual([]);
    expect(availableGuidedBlocks(filledDraft())).toEqual(["motivation", experienceBlockId(0)]);
  });
});

describe("composeGuidedAnswer", () => {
  it("고른 소재를 머리말과 함께 사실 메모로 묶는다", () => {
    const text = composeGuidedAnswer(filledDraft(), ["motivation", experienceBlockId(0)]);

    expect(text).toContain("[지원 계기]");
    expect(text).toContain("[경험 ①]");
    expect(text).toContain("경험 종류: 경력·인턴");
    expect(text).toContain("소속·기간·역할: 롯데테크 현장실습");
    expect(text).toContain("내가 한 행동: 검사 기준서와 작업 순서를 직접 대조했습니다.");
  });

  it("비어 있는 소재는 넣지 않는다", () => {
    expect(composeGuidedAnswer(filledDraft(), ["goal", experienceBlockId(1)])).toBe("");
  });
});

describe("applyGuidedAnswers", () => {
  it("배정한 문항에만 답변을 채운다", () => {
    const first = createGuidedQuestion("지원 동기를 작성해 주세요.");
    const second = createGuidedQuestion("협업 경험을 작성해 주세요.");
    const draft = { ...filledDraft(), assignments: { [first.id]: ["motivation"] } };

    const [one, two] = applyGuidedAnswers(draft, [first, second]);

    expect(one.answer).toContain("현장실습에서 안전관리자를 처음 봤습니다.");
    expect(two.answer).toBe("");
  });

  it("문항 질문은 그대로 둔다", () => {
    const question = createGuidedQuestion("지원 동기를 작성해 주세요.");
    const [applied] = applyGuidedAnswers({ ...filledDraft(), assignments: { [question.id]: ["motivation"] } }, [question]);

    expect(applied.prompt).toBe("지원 동기를 작성해 주세요.");
    expect(applied.id).toBe(question.id);
  });
});

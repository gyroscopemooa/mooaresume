// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { buildGuidedSteps, createGuidedCreateDraft, createGuidedExperience, createGuidedQuestion, type GuidedCreateDraft, type GuidedStep } from "@/domain/guided-create";
import { GuidedCreateForm } from "./guided-create-form";

afterEach(cleanup);

function setup(draft: GuidedCreateDraft, questions = [createGuidedQuestion("지원 동기를 작성해 주세요.")]) {
  const onDraftChange = vi.fn();
  const onQuestionsChange = vi.fn();
  render(<GuidedCreateForm draft={draft} onDraftChange={onDraftChange} questions={questions} onQuestionsChange={onQuestionsChange} />);
  return { onDraftChange, onQuestionsChange, questions };
}

const defaultSteps: GuidedStep[] = buildGuidedSteps(createGuidedCreateDraft());

function goToLastStep() {
  for (let step = 1; step < defaultSteps.length; step += 1) {
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
  }
}

describe("GuidedCreateForm", () => {
  it("자기소개서 문항을 가장 먼저 묻는다", () => {
    setup(createGuidedCreateDraft());

    expect(screen.getByText(`처음부터 작성 · 1 / ${defaultSteps.length}`)).toBeTruthy();
    expect(screen.getByText(defaultSteps[0].title)).toBeTruthy();
    expect(defaultSteps[0].id).toBe("questions");
    expect(screen.getByRole("button", { name: /이전/ }).hasAttribute("disabled")).toBe(true);
  });

  it("입력한 내용을 초안에 올린다", () => {
    const { onDraftChange } = setup(createGuidedCreateDraft());

    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "계기" }), { target: { value: "현장실습에서 처음 봤습니다." } });

    expect(onDraftChange).toHaveBeenCalledWith(expect.objectContaining({ motivation: "현장실습에서 처음 봤습니다." }));
  });

  it("마지막 단계에서 문항에 소재를 붙이면 그 사실로 답변을 채운다", () => {
    const draft = { ...createGuidedCreateDraft(), motivation: "현장실습에서 안전관리자를 처음 봤습니다." };
    const { onQuestionsChange, questions } = setup(draft);

    goToLastStep();
    fireEvent.click(screen.getByRole("button", { name: /^지원 계기/ }));

    const [updated] = onQuestionsChange.mock.calls.at(-1)![0] as ReturnType<typeof createGuidedQuestion>[];
    expect(updated.id).toBe(questions[0].id);
    expect(updated.answer).toContain("[지원 계기]");
    expect(updated.answer).toContain("현장실습에서 안전관리자를 처음 봤습니다.");
  });

  it("앞 단계를 비워두면 붙일 소재가 없다고 알려준다", () => {
    setup(createGuidedCreateDraft());

    goToLastStep();

    expect(screen.getByText(/앞 단계에서 내용을 입력하면/)).toBeTruthy();
  });

  it("문항을 추가하고 지울 수 있다", () => {
    const { onQuestionsChange, questions } = setup(createGuidedCreateDraft());

    fireEvent.click(screen.getByRole("button", { name: /문항 추가/ }));
    expect((onQuestionsChange.mock.calls.at(-1)![0] as unknown[]).length).toBe(questions.length + 1);

    fireEvent.click(screen.getByRole("button", { name: "문항 1 삭제" }));
    expect((onQuestionsChange.mock.calls.at(-1)![0] as unknown[]).length).toBe(0);
  });

  it("경험을 물을 때 종류를 먼저 고르게 한다", () => {
    // Naming your best experience from nothing is the blank page again.
    const { onDraftChange } = setup(createGuidedCreateDraft());

    const whereStep = defaultSteps.findIndex((item) => item.id === "experience-0-where");
    for (let step = 0; step < whereStep; step += 1) fireEvent.click(screen.getByRole("button", { name: /다음/ }));

    fireEvent.click(screen.getByRole("button", { name: "아르바이트" }));

    expect(onDraftChange).toHaveBeenCalledWith(expect.objectContaining({
      experiences: [expect.objectContaining({ category: "아르바이트" })],
    }));
  });
});

describe("소재 배정 단계의 안내", () => {
  // The default walker counts the steps of an empty draft; a draft with more
  // experiences has more steps, so it needs its own count.
  function goToAssign(draft: GuidedCreateDraft) {
    for (let step = 1; step < buildGuidedSteps(draft).length; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    }
  }

  it("경험 칩에 무엇을 적었는지 함께 보여준다", () => {
    // 열 단계 전에 적은 내용이라 "경험 ①"만으로는 서로 구분되지 않는다.
    const draft: GuidedCreateDraft = {
      ...createGuidedCreateDraft(),
      experiences: [
        { ...createGuidedExperience(), category: "현장실습", where: "롯데테크 현장실습 · 안전관리 보조" },
        { ...createGuidedExperience(), category: "아르바이트", where: "편의점 야간 · 매장 관리" },
      ],
    };
    setup(draft);
    goToAssign(draft);

    expect(screen.getByRole("button", { name: /^경험 ①/ }).textContent).toContain("롯데테크");
    expect(screen.getByRole("button", { name: /^경험 ②/ }).textContent).toContain("편의점");
  });

  it("추천 버튼을 누르면 문항에 맞는 소재가 담긴다", () => {
    const draft: GuidedCreateDraft = {
      ...createGuidedCreateDraft(),
      motivation: "현장실습에서 안전관리자를 처음 봤습니다.",
      aspiration: "점검 기준을 정리하고 싶습니다.",
    };
    const { onDraftChange, questions } = setup(draft, [createGuidedQuestion("본 직무에 지원하신 동기는 어떻게 되십니까?")]);
    goToAssign(draft);

    fireEvent.click(screen.getByRole("button", { name: /추천대로 담기/ }));

    const next = onDraftChange.mock.calls.at(-1)![0] as GuidedCreateDraft;
    expect(next.assignments[questions[0].id]).toEqual(["motivation", "aspiration"]);
  });

  it("이미 고른 문항에는 추천 버튼을 띄우지 않는다", () => {
    const questions = [createGuidedQuestion("지원 동기를 작성해 주세요.")];
    const draft: GuidedCreateDraft = {
      ...createGuidedCreateDraft(),
      motivation: "현장실습에서 안전관리자를 처음 봤습니다.",
      assignments: { [questions[0].id]: ["motivation"] },
    };
    setup(draft, questions);
    goToAssign(draft);

    expect(screen.queryByRole("button", { name: /추천대로 담기/ })).toBeNull();
  });
});

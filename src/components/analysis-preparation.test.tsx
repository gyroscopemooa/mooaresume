// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CoverLetterQuestion } from "@/domain/cover-letter-question";
import { AnalysisPreparation } from "./analysis-preparation";

// The screen's children reach for Supabase and Polar on mount, neither of
// which this test is about.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/application-case-handoff", () => ({ ApplicationCaseHandoff: () => null }));
vi.mock("@/components/quick-checkout-return", () => ({ QuickCheckoutReturn: () => null }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function seedDraft(answerLength: number, overrides: Record<string, unknown> = {}) {
  const question = (id: string, prompt: string): CoverLetterQuestion => ({
    id, title: "", prompt, targetLength: 700, answer: "가".repeat(answerLength),
  });
  sessionStorage.setItem("mooa:guest-draft:v1", JSON.stringify({
    draftText: "",
    questions: [question("a", "지원 동기를 서술하세요."), question("b", "강점을 서술하세요.")],
    targetLength: 700,
    temporaryWritingMode: "POLISH",
    selectedProduct: "PRO",
    writingStyle: "BALANCED",
    savedAt: new Date().toISOString(),
    ...overrides,
  }));
}

const findNotice = () => screen.queryByText(/문항당 목표 분량의/);

describe("분량이 부족한 채로 최종 첨삭을 고른 경우", () => {
  it("결제 전에 문항당 채움 비율과 더 맞는 유형을 알린다", async () => {
    // 두 문항 합계는 860자로 700자를 넘지만, 문항당으로는 61%다. 합계로만
    // 보면 "다 썼다"로 보이는 것이 이 안내가 필요한 이유다.
    seedDraft(430);
    render(<AnalysisPreparation />);

    const notice = await screen.findByText(/문항당 목표 분량의/);
    expect(notice.textContent).toContain("61%");
    expect(notice.textContent).toContain("내용 보완");
    expect(screen.getByRole("link", { name: /유형 다시 고르기/ })).toBeTruthy();
  });

  it("진행을 막지는 않는다", async () => {
    // 짧게 쓰고 다듬기만 원하는 선택도 정당하다. 알리되 세우지 않는다.
    seedDraft(430);
    render(<AnalysisPreparation />);
    await screen.findByText(/문항당 목표 분량의/);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("문항당 목표를 채웠으면 알리지 않는다", async () => {
    seedDraft(640);
    render(<AnalysisPreparation />);
    await screen.findByText("분석 시작 전 확인");

    expect(findNotice()).toBeNull();
  });

  it("채우는 유형을 골랐으면 알리지 않는다", async () => {
    // 내용 보완은 이 상태를 해결하러 가는 길이므로 경고할 일이 아니다.
    seedDraft(430, { temporaryWritingMode: "BUILD" });
    render(<AnalysisPreparation />);
    await screen.findByText("분석 시작 전 확인");

    expect(findNotice()).toBeNull();
  });
});

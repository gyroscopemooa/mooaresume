// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResultWorkspaceCodexRestored } from "./result-workspace-codex-restored";
import { sampleResultDocument } from "@/fixtures/result-document-codex-restored";

afterEach(cleanup);

describe("ResultWorkspaceCodexRestored 제출본 탭", () => {
  it("원문 위 마킹과 피드백 카드를 문항별로 보여준다", () => {
    render(<ResultWorkspaceCodexRestored result={sampleResultDocument} />);

    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("제출본 피드백")).toBeTruthy();

    expect(screen.getAllByText("좋은 표현").length).toBeGreaterThan(0);
    expect(screen.getAllByText("구체성 부족").length).toBeGreaterThan(0);
    expect(screen.getAllByText("삭제 추천").length).toBeGreaterThan(0);
    expect(screen.getAllByText("수정 추천").length).toBeGreaterThan(0);

    // 각 annotation의 comment도 카드에 표시된다.
    expect(screen.getByText("구체적인 문제 해결 경험을 앞세운 좋은 시작입니다.")).toBeTruthy();

    // 마킹된 문구는 <mark data-type> 요소로 렌더링된다(원문 텍스트 자체는 변형 없이 slice만 됨).
    const marks = document.querySelectorAll("mark[data-type]");
    expect(marks.length).toBeGreaterThan(0);
    expect(Array.from(marks).some((mark) => mark.textContent === "생산 과정에서 발생한 문제를 해결한 경험")).toBe(true);
  });

  it("originalAnnotations가 없는 예전 데이터도 화면이 깨지지 않는다", () => {
    const legacyResult = {
      ...sampleResultDocument,
      questions: sampleResultDocument.questions.map((question) => {
        const rest = { ...question };
        delete rest.originalAnnotations;
        return rest;
      }),
    };

    render(<ResultWorkspaceCodexRestored result={legacyResult} />);
    fireEvent.click(screen.getByRole("button", { name: "제출본" }));

    expect(screen.getByText("제출본 피드백")).toBeTruthy();
    expect(screen.getAllByText("표시할 원문 피드백이 없습니다.").length).toBe(sampleResultDocument.questions.length);
  });
});

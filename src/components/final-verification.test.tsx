// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FinalVerification } from "./final-verification";
import { sampleResultDocument } from "@/fixtures/result-document";
import type { ResultDocument } from "@/domain/result-document";

afterEach(cleanup);

function show(overrides: Partial<ResultDocument> = {}, hasResume = true) {
  render(<FinalVerification result={{ ...sampleResultDocument, product: "FINAL", ...overrides }} hasResume={hasResume} />);
}

describe("FINAL 검증 화면", () => {
  it("찾은 것이 없으면 0곳이라고 말하고 점수를 만들지 않는다", () => {
    show();
    expect(screen.getByText("확인된 주요 서류 위험요소가 없습니다.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\d+\s*\/\s*100/);
  });

  it("이력서가 없으면 '못 찾았다'가 아니라 '대조하지 못했다'고 말한다", () => {
    // The two answers are different, and only one of them is true.
    show({}, false);
    const notices = screen.getAllByText(/이력서\(입사지원서\)를 올리지 않아 대조하지 못했습니다/);
    expect(notices.length).toBeGreaterThan(0);
  });

  it("이력서가 있는데 비어 있으면 '찾지 못했다'고 말한다", () => {
    show({}, true);
    expect(screen.getByText(/두 자료 사이에서 어긋나는 곳을 찾지 못했습니다/)).toBeTruthy();
  });

  it("위험요소를 심각도와 출처와 함께 센다", () => {
    show({
      documentConflicts: [{ id: "c1", field: "period", resumeStatement: "5개월", coverLetterQuote: "장기간 주도했습니다", conflict: "기간이 어긋납니다", severity: "high", resolution: "기간을 밝히세요" }],
      claimEvidence: [{ id: "cl1", claim: "데이터 분석 능력", evidenceQuote: null, verdict: "unsupported", note: "근거 없음" }],
    });
    expect(screen.getByText("FINAL에서 확인된 주요 서류 위험요소 2곳")).toBeTruthy();
    expect(screen.getByText("이력서 대조")).toBeTruthy();
    expect(screen.getByText("주장·근거")).toBeTruthy();
  });

  it("근거가 없는 주장은 빈칸이 아니라 그 사실을 적는다", () => {
    show({ claimEvidence: [{ id: "cl1", claim: "데이터 분석 능력", evidenceQuote: null, verdict: "unsupported", note: "관련 경험이 지원서에 없습니다" }] });
    expect(screen.getByText("지원서에서 찾지 못했습니다")).toBeTruthy();
    expect(screen.getByText("관련 경험이 지원서에 없습니다")).toBeTruthy();
    expect(screen.getByText("근거 없음")).toBeTruthy();
  });

  it("일부러 남긴 위험은 미해결로 세지 않는다", () => {
    show({
      rejectionRisks: [{ id: "r1", headline: "소신 표현", reason: "호불호가 갈립니다", evidenceQuote: "그대로 따르지 않았습니다", severity: "high", fix: "완화 가능", handling: "kept_by_choice" }],
    });
    expect(screen.getByText("확인된 주요 서류 위험요소가 없습니다.")).toBeTruthy();
    // Still shown in its own section — hidden would be worse than uncounted.
    expect(screen.getByText("소신 표현")).toBeTruthy();
    expect(screen.getByText("선택에 따라 유지")).toBeTruthy();
  });

  it("네 명이 아니라 네 관점이라고 쓴다", () => {
    show();
    expect(screen.getByText("네 가지 관점에서 점검했습니다")).toBeTruthy();
    expect(document.body.textContent).not.toContain("네 명이 검토");
  });

  it("X-Ray 숫자는 문장에서 직접 계산한다", () => {
    show({
      answerStructures: [{
        questionOrder: 1,
        situation: ["가".repeat(30) + "."],
        action: ["나".repeat(10) + "."],
        result: [],
        jobLink: [],
        reading: "행동이 적습니다",
      }],
    });
    expect(screen.getByText(/상황 1문장 · 31자/)).toBeTruthy();
    expect(screen.getByText(/본인 행동 1문장 · 11자/)).toBeTruthy();
    // The imbalance is stated by this screen, not taken from the model.
    expect(screen.getByText(/상황 설명이 본인 행동보다 깁니다/)).toBeTruthy();
  });

  it("몇 초 안에 읽는다는 말을 쓰지 않는다", () => {
    show();
    expect(document.body.textContent).not.toMatch(/\d+\s*초/);
  });
});

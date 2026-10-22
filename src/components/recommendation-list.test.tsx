// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RecommendationList } from "./recommendation-list";

afterEach(cleanup);
const item = { id: "r1", kind: "add" as const, anchorQuote: "원문 문장입니다.", sentence: "다른 시각의 문장입니다.", why: "문항이 묻는 역량을 직접 말합니다.", needsConfirmation: "실제로 그랬는지 확인하세요." };

describe("RecommendationList", () => {
  it("presents choices from another angle, never as an improvement", () => {
    render(<RecommendationList items={[item]} kept/>);
    expect(screen.getByText(/다른 시각 추천안/)).toBeTruthy();
    expect(screen.getByText(/지금 문장 그대로도 충분합니다/)).toBeTruthy();
    expect(screen.getByText("확인 후 사용")).toBeTruthy();
    expect(screen.getByText("실제로 그랬는지 확인하세요.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/개선안|더 좋/);
    expect(document.querySelector("header span[aria-hidden]")?.textContent).toBe("M");
  });
  it("renders nothing when every recommendation was filtered out", () => {
    const { container } = render(<RecommendationList items={[]} kept/>);
    expect(container.innerHTML).toBe("");
  });
});

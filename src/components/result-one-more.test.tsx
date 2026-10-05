// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultOneMore } from "./result-one-more";
import { nextOneMoreIndex, oneMoreLines } from "@/domain/one-more-lines";

afterEach(cleanup);

describe("한 장 더", () => {
  it("문장이 100개 가까이 있고 서로 겹치지 않는다", () => {
    expect(oneMoreLines.length).toBeGreaterThanOrEqual(100);
    expect(new Set(oneMoreLines).size).toBe(oneMoreLines.length);
  });

  it("다음 문장은 항상 다른 문장이다", () => {
    for (let current = 0; current < oneMoreLines.length; current++) for (const random of [0, 0.5, 1]) {
      const next = nextOneMoreIndex(current, random);
      expect(next).not.toBe(current);
      expect(next).toBeLessThan(oneMoreLines.length);
    }
  });

  it("문장을 바꾸고, 결과 화면 이동과 준비 중 안내를 제공한다", () => {
    const review = vi.fn(), final = vi.fn();
    const { container } = render(<ResultOneMore onReview={review} onFinal={final} />);
    const before = container.querySelector("blockquote")!.textContent;
    fireEvent.click(screen.getByRole("button", { name: "다른 문장" }));
    expect(container.querySelector("blockquote")!.textContent).not.toBe(before);
    fireEvent.click(screen.getByRole("button", { name: /왜 고쳤는지/ }));
    fireEvent.click(screen.getByRole("button", { name: /제출 전에 한 번 더/ }));
    expect(review).toHaveBeenCalledOnce();
    expect(final).toHaveBeenCalledOnce();
    expect(screen.getByText("준비 중")).toBeTruthy();
    expect(screen.getByText(/신청이나 결제를 받지 않습니다/)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ResultOneMore } from "./result-one-more";

afterEach(cleanup);

it("한 문장 인사와 결과 화면 이동, 준비 중 안내를 제공한다", () => {
  const review = vi.fn(), final = vi.fn();
  render(<ResultOneMore onReview={review} onFinal={final} />);
  expect(screen.getByText("합격을 기원합니다.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "다른 문장" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /왜 고쳤는지/ }));
  fireEvent.click(screen.getByRole("button", { name: /제출 전에 한 번 더/ }));
  expect(review).toHaveBeenCalledOnce();
  expect(final).toHaveBeenCalledOnce();
  expect(screen.getByText("준비 중")).toBeTruthy();
  expect(screen.getByText(/신청이나 결제를 받지 않습니다/)).toBeTruthy();
});

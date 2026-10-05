// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ResultEncouragement } from "./result-encouragement";
afterEach(cleanup);
it("offers real result actions and clearly labels the future service", () => {
  const review=vi.fn(), final=vi.fn();
  render(<ResultEncouragement onReview={review} onFinal={final}/>);
  expect(screen.getByText("준비 중")).toBeTruthy();
  expect(screen.getByText(/현재 신청이나 결제는 받지 않습니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:/문항별 첨삭 보기/}));
  fireEvent.click(screen.getByRole("button",{name:/최종 첨삭본 보기/}));
  expect(review).toHaveBeenCalledTimes(1);
  expect(final).toHaveBeenCalledTimes(1);
  const old=screen.getByRole("heading",{level:3,name:"지금 보이는 만큼부터"}).textContent!;
  fireEvent.click(screen.getByRole("button",{name:"다른 응원 읽기"}));
  expect(screen.queryByText(old)).toBeNull();
});

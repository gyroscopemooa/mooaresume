// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HomepageReviews } from "./homepage-reviews";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("5초마다 다음 후기로 이동하고 일시정지하면 멈춘다", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const view = render(<HomepageReviews />);
  const list = view.getByRole("list");
  Object.defineProperties(list, { clientWidth: { value: 400 }, scrollWidth: { value: 3000 } });
  Object.defineProperty(list.children[1], "offsetLeft", { value: 320 });
  list.scrollTo = vi.fn();
  act(() => vi.advanceTimersByTime(5000));
  expect(list.scrollTo).toHaveBeenCalledWith({ left: 320, behavior: "smooth" });
  fireEvent.click(view.getByRole("button", { name: "자동 넘김 일시정지" }));
  act(() => vi.advanceTimersByTime(5000));
  expect(list.scrollTo).toHaveBeenCalledTimes(1);
});

it("첨부 후기 15개에 각각 별점을 표시한다", () => {
  const view = render(<HomepageReviews />);
  const cards = view.getAllByRole("listitem");
  expect(cards).toHaveLength(15);
  for (const card of cards) {
    expect(within(card).getByRole("img", { name: "별점 5점 만점에 5점" }).textContent).toBe("★★★★★");
  }
});

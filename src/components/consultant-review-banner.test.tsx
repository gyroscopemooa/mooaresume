// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ConsultantReviewBanner } from "./consultant-review-banner";

afterEach(cleanup);

it("AI 추가 검수와 조건부 무료 보완을 함께 안내한다", () => {
  render(<ConsultantReviewBanner />);
  const banner = screen.getByRole("region", { name: "24시간, 첨삭 이후까지 살피는 AI 취업 컨설턴트" });
  expect(banner.textContent).toContain("추가 비용 없이 더 나은 첨삭본");
  expect(banner.textContent).toContain("추가 첨삭은 검토 결과에 따라 필요한 경우 제공됩니다.");
  expect(banner.textContent).not.toMatch(/3차|24시간 이내|사람이 직접|자동 발송/);
});

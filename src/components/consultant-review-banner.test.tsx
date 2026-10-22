// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ConsultantReviewBanner } from "./consultant-review-banner";

afterEach(cleanup);

it("다른 시각의 추가 첨삭을 개선 약속 없이 안내한다", () => {
  render(<ConsultantReviewBanner />);
  const banner = screen.getByRole("region", { name: "24시간 안에, 다른 시각의 추가 첨삭" });
  expect(banner.textContent).toContain("추가 비용 없이 추가 첨삭본");
  expect(banner.textContent).not.toMatch(/더 나은 첨삭본|보완이 필요한/);
  expect(banner.textContent).toContain("1차보다 개선되었다는 의미가 아니며");
  expect(banner.textContent).not.toMatch(/3차|24시간 이내|사람이 직접|자동 발송/);
});

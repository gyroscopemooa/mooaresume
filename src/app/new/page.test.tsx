// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import GuidePage from "./page";

vi.mock("@/components/header-account", () => ({ HeaderAccount: () => null }));

test("repeat-edit guidance stays concise and collapsed in the lower FAQ", () => {
  render(<GuidePage />);
  const summary = screen.getByText("같은 글을 다시 첨삭하면 표현이 달라질 수 있나요?");
  const details = summary.closest("details");
  expect(details).not.toBeNull();
  expect(details?.hasAttribute("open")).toBe(false);
  expect(details?.closest("section")?.id).toBe("faq");
  const answer = details?.querySelector("p")?.textContent ?? "";
  expect(answer).toContain("같은 자료와 설정에서는");
  expect(answer).toContain("첨삭 기준과 핵심 개선 방향");
  expect(answer.length).toBeLessThan(160);
});

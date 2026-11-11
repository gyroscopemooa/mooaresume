// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PrivacyPage from "./page";
vi.mock("@/components/analytics-tracker", () => ({ AnalyticsConsentSettings: () => null }));
afterEach(cleanup);
it("discloses the observed Kakao account fields without expanding other policies", () => {
  render(<PrivacyPage />);
  const row = screen.getByRole("row", { name: /^계정 / });
  expect(row.textContent).toContain("카카오 계정 식별자, 이메일 주소, 닉네임과 프로필 이미지");
  expect(row.textContent).toContain("Google");
  expect(row.textContent).toContain("비밀번호는 저장하지 않습니다");
  expect(row.textContent).not.toContain("전화번호");
  expect(row.textContent).not.toContain("채널");
});

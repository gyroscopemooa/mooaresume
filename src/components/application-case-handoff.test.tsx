// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ApplicationCaseHandoff } from "./application-case-handoff";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser }, from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) }));
vi.mock("./account-email-panel", () => ({ AccountEmailPanel: ({ locked }: { locked: boolean }) => <section aria-label="분석 완료 알림 이메일" data-locked={String(locked)} /> }));
vi.mock("./research-consent-gate", () => ({ ResearchConsentGate: () => <section aria-label="데이터 활용 선택" /> }));
beforeEach(() => { getUser.mockResolvedValue({ data: { user: { id: "account-a", email: "current@example.test" } } }); });
afterEach(cleanup);
it("places account email above data consent without changing checkout prerequisites", async () => {
  render(<ApplicationCaseHandoff guest={null} />);
  const email = await screen.findByRole("region", { name: "분석 완료 알림 이메일" });
  const consent = screen.getByRole("region", { name: "데이터 활용 선택" });
  expect(email.compareDocumentPosition(consent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(email.getAttribute("data-locked")).toBe("false");
  expect((screen.getByRole("button", { name: /결제하고 분석 시작/ }) as HTMLButtonElement).disabled).toBe(true);
});
it("locks account changes when analysis is already active", async () => {
  render(<ApplicationCaseHandoff guest={null} runActive />);
  expect((await screen.findByRole("region", { name: "분석 완료 알림 이메일" })).getAttribute("data-locked")).toBe("true");
});

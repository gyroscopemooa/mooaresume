// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import OnboardingPage from "@/app/onboarding/page";
import { QuickInputPage } from "./quick-input-page";
import { loadGuestDraft, saveGuestDraft } from "@/lib/guest-draft";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/writing-home-link", () => ({ AppOnboardingRedirect: () => null }));
vi.mock("@/components/resume-intake", () => ({ ResumeIntake: () => <div>입력 영역</div> }));
afterEach(() => { cleanup(); sessionStorage.clear(); });

it("persists BUILD without any draft and restores it on QUICK", async () => {
  const page = render(<OnboardingPage/>);
  fireEvent.click(screen.getByRole("button", { name: /내용 보완.*써보긴/ }));
  expect(loadGuestDraft()?.temporaryWritingMode).toBe("BUILD");
  page.unmount();
  render(<QuickInputPage/>);
  await waitFor(() => expect(screen.getByText("QUICK · 5,900원 · 내용 보완")).toBeTruthy());
  expect(screen.queryByRole("combobox", { name: "작성 유형" })).toBeNull();
});

it("keeps the original QUICK layout and restores POLISH without changing the draft", async () => {
  saveGuestDraft({ draftText: "내 실제 원문", targetLength: 700, temporaryWritingMode: "POLISH" });
  render(<QuickInputPage/>);
  await waitFor(() => expect(screen.getByText("QUICK · 5,900원 · 최종 첨삭")).toBeTruthy());
  expect(screen.queryByRole("combobox", { name: "작성 유형" })).toBeNull();
  expect(loadGuestDraft()).toMatchObject({ draftText: "내 실제 원문", temporaryWritingMode: "POLISH" });
  expect(screen.getByText("QUICK · 5,900원 · 최종 첨삭")).toBeTruthy();
});

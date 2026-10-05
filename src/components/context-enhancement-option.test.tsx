// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ContextEnhancementOption } from "./context-enhancement-option";
import { ContextResearchNotice } from "./context-research-notice";
afterEach(() => { cleanup(); sessionStorage.clear(); });
it("restores opt-in for the same draft but not another draft", async () => {
  sessionStorage.setItem("mooa:context-enhancement:v1", JSON.stringify({ draftKey: "draft-a", enabled: true, company: "도화엔지니어링", role: "토목 설계" }));
  const onChange = vi.fn();
  const view = render(<ContextEnhancementOption disabled={false} draftKey="draft-a" onChange={onChange}/>);
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ company: "도화엔지니어링", role: "토목 설계" }, false));
  expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  view.unmount();
  render(<ContextEnhancementOption disabled={false} draftKey="draft-b" onChange={vi.fn()}/>);
  expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false);
});
it("starts OFF and emits only validated opt-in, then clears on OFF", () => {
  const onChange = vi.fn(); render(<ContextEnhancementOption disabled={false} onChange={onChange}/>);
  const toggle = screen.getByRole("switch") as HTMLInputElement;
  expect(toggle.checked).toBe(false);
  fireEvent.click(toggle); expect(onChange).toHaveBeenLastCalledWith(undefined, true);
  fireEvent.change(screen.getByLabelText("지원 회사"), { target: { value: "도화엔지니어링" } });
  fireEvent.change(screen.getByLabelText("지원 직무"), { target: { value: "토목 설계" } });
  expect(onChange).toHaveBeenLastCalledWith({ company: "도화엔지니어링", role: "토목 설계" }, false);
  fireEvent.click(toggle); expect(onChange).toHaveBeenLastCalledWith(undefined, false);
});
it("shows failure honestly and sourced research as references, not verification", () => {
  const base = { version: "context-1" as const, checkedAt: "2026-10-05T00:00:00Z", summary: "", sources: [] };
  const view = render(<ContextResearchNotice research={{ ...base, status: "unavailable" }}/>);
  expect(screen.getByText(/제출한 자료만으로 첨삭했습니다/)).toBeTruthy();
  view.rerender(<ContextResearchNotice research={{ ...base, status: "available", sources: [{ title: "공식 자료", url: "https://company.example.com" }] }}/>);
  expect(screen.getByRole("link").getAttribute("href")).toBe("https://company.example.com");
  expect(screen.getByText(/사실 검증 완료를 뜻하지는/)).toBeTruthy();
});
it("uses the company and role already entered so ON is a single click", () => {
  const onChange = vi.fn();
  render(<ContextEnhancementOption disabled={false} defaultCompany="도화엔지니어링" defaultRole="조경레저부" onChange={onChange}/>);
  fireEvent.click(screen.getByRole("switch"));
  expect(onChange).toHaveBeenLastCalledWith({ company: "도화엔지니어링", role: "조경레저부" }, false);
  expect(screen.getByText(/분석 대상/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  expect((screen.getByLabelText("지원 회사") as HTMLInputElement).value).toBe("도화엔지니어링");
});

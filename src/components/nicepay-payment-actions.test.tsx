// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NicepayPaymentActions, NicepayPaymentButtons } from "./nicepay-payment-actions";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); window.history.replaceState(null, "", "/analysis/prepare"); });
it("names each pay action and places the NICE card action last", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay}/>);
  const labels = ["카카오페이로 결제하고 분석 시작", "네이버페이로 결제하고 분석 시작", "토스페이로 결제하고 분석 시작", "삼성페이로 결제하고 분석 시작", "Apple Pay로 결제하고 분석 시작", "PAYCO로 결제하고 분석 시작", "카드로 결제하고 분석 시작"];
  expect(screen.getAllByRole("button").filter(button => button.textContent?.includes("결제하고")).map(button => button.getAttribute("aria-label") ?? button.textContent)).toEqual(labels);
  fireEvent.click(screen.getByRole("checkbox", { name: "필수 결제 약관 전체 동의" }));
  fireEvent.click(screen.getByRole("button", { name: "보기 ∨" }));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "CARD" } });
  for (const label of labels) fireEvent.click(screen.getByRole("button", { name: label }));
  expect(onPay.mock.calls.map(call => call[0])).toEqual(["KAKAO", "NAVER", "TOSS", "SAMSUNG", "APPLE", "PAYCO", "CARD"]);
  expect(screen.getByRole("group", { name: "다른 간편결제" })).toBeTruthy();
});
it("locks all payment actions while a request is pending", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay} disabled/>);
  for (const button of screen.getAllByRole("button").filter(button => button.textContent?.includes("결제하고"))) { expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button); }
  expect(onPay).not.toHaveBeenCalled();
});
it("nudges and focuses the unchecked consent bar without starting checkout", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay}/>);
  const pay = screen.getByRole("button", { name: "카카오페이로 결제하고 분석 시작" });
  fireEvent.click(pay);
  expect(onPay).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("필수 결제 약관");
  expect(document.activeElement).toBe(screen.getByRole("checkbox", { name: "필수 결제 약관 전체 동의" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "필수 결제 약관 전체 동의" }));
  fireEvent.click(pay);
  expect(onPay).toHaveBeenCalledWith("KAKAO", expect.objectContaining({ financial: true, collection: true, sharing: true }));
});
it("does not flash the old guidance while availability is loading", () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  render(<NicepayPaymentActions onPay={vi.fn()}/>);
  expect(screen.getByRole("status").textContent).toContain("결제수단을 확인");
  expect(screen.queryByRole("region", { name: "간편결제 안내" })).toBeNull();
});
it("keeps all web payment actions out of the installed Play app", () => {
  window.history.replaceState(null, "", "/analysis/prepare?source=twa");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<NicepayPaymentActions onPay={vi.fn()}/>);
  expect(screen.queryByRole("region")).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
});

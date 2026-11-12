// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NicepayPaymentActions, NicepayPaymentButtons } from "./nicepay-payment-actions";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); window.history.replaceState(null, "", "/analysis/prepare"); });
it("names each pay action and places the NICE card action last", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay}/>);
  const labels = ["카카오페이로 결제하고 분석 시작", "네이버페이로 결제하고 분석 시작", "삼성페이로 결제하고 분석 시작", "카드로 결제하고 분석 시작"];
  expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual(labels);
  for (const label of labels) fireEvent.click(screen.getByRole("button", { name: label }));
  expect(onPay.mock.calls.map(call => call[0])).toEqual(["KAKAO", "NAVER", "SAMSUNG", "CARD"]);
  expect(document.body.textContent).not.toMatch(/토스/);
});
it("locks all payment actions while a request is pending", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay} disabled/>);
  for (const button of screen.getAllByRole("button")) { expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button); }
  expect(onPay).not.toHaveBeenCalled();
});
it("keeps all web payment actions out of the installed Play app", () => {
  window.history.replaceState(null, "", "/analysis/prepare?source=twa");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<NicepayPaymentActions onPay={vi.fn()}/>);
  expect(screen.queryByRole("region")).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
});

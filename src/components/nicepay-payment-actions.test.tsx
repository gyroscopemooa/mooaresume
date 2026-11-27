// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NicepayPaymentActions, NicepayPaymentButtons } from "./nicepay-payment-actions";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); window.history.replaceState(null, "", "/analysis/prepare"); });
it("names each pay action and places the NICE card action above all wallets", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay}/>);
  const labels = ["카드로 결제하고 분석 시작", "카카오페이로 결제하고 분석 시작", "네이버페이로 결제하고 분석 시작", "토스페이로 결제하고 분석 시작", "삼성페이로 결제하고 분석 시작", "Apple Pay로 결제하고 분석 시작", "PAYCO로 결제하고 분석 시작"];
  expect(screen.getAllByRole("button").filter(button => (button.getAttribute("aria-label") ?? button.textContent)?.includes("결제하고")).map(button => button.getAttribute("aria-label") ?? button.textContent)).toEqual(labels);
  fireEvent.click(screen.getByRole("checkbox", { name: "필수 결제 약관 전체 동의" }));
  fireEvent.click(screen.getByRole("button", { name: "보기 ∨" }));
  for (const label of labels) { fireEvent.click(screen.getByRole("button", { name: label })); if (label.startsWith("네이버")) fireEvent.click(screen.getByRole("button", { name: "네이버페이 카드로 결제" })); }
  expect(onPay.mock.calls.map(call => call[0])).toEqual(["CARD", "KAKAO", "NAVER", "TOSS", "SAMSUNG", "APPLE", "PAYCO"]);
  expect(screen.getByRole("group", { name: "다른 간편결제" })).toBeTruthy();
});
it("locks all payment actions while a request is pending", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay} disabled/>);
  for (const button of screen.getAllByRole("button").filter(button => (button.getAttribute("aria-label") ?? button.textContent)?.includes("결제하고"))) { expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button); }
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
it("shows Naver methods only after its button and does not mark completed consent as missing", () => {
  const onPay = vi.fn(); render(<NicepayPaymentButtons onPay={onPay}/>);
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("group", { name: "네이버페이 결제수단" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "필수 결제 약관 전체 동의" }));
  fireEvent.click(screen.getByRole("button", { name: "네이버페이로 결제하고 분석 시작" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(onPay).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "네이버페이 포인트로 결제" }));
  expect(onPay).toHaveBeenCalledWith("NAVER", expect.objectContaining({ naverMethod: "POINT", financial: true }));
});
it("keeps all web payment actions out of the installed Play app", () => {
  window.history.replaceState(null, "", "/analysis/prepare?source=twa");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<NicepayPaymentActions onPay={vi.fn()}/>);
  expect(screen.queryByRole("region")).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
});


it("keeps the current brand layout disabled when NICE is unavailable instead of showing old Polar boxes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nicepay: false }) }));
  const onPay = vi.fn();
  render(<NicepayPaymentActions onPay={onPay}/>);
  await screen.findByText(/현재 계정에서 NICE/);
  const card = screen.getByRole("button", { name: "카드로 결제하고 분석 시작" }) as HTMLButtonElement;
  expect(card.disabled).toBe(true);
  fireEvent.click(card);
  expect(onPay).not.toHaveBeenCalled();
  expect(screen.queryByRole("region", { name: "간편결제 안내" })).toBeNull();
  expect(screen.queryByText(/Polar 결제창에서 선택/)).toBeNull();
});

it("distinguishes a failed lookup and recovers the same buttons on explicit retry", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ nicepay: false }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ nicepay: true }) });
  vi.stubGlobal("fetch", fetcher);
  const onPay = vi.fn();
  render(<NicepayPaymentActions onPay={onPay}/>);
  await screen.findByText(/결제수단을 불러오지 못했습니다/);
  expect(screen.queryByText(/현재 계정에서 NICE/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "결제수단 다시 확인" }));
  const card = screen.getByRole("button", { name: "카드로 결제하고 분석 시작" }) as HTMLButtonElement;
  await waitFor(() => expect(card.disabled).toBe(false));
  fireEvent.click(card);
  expect(onPay).toHaveBeenCalledWith("CARD");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("does not retain permission from a different availability endpoint", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ nicepay: true }) })
    .mockImplementationOnce(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetcher);
  const view = render(<NicepayPaymentActions onPay={vi.fn()}/>);
  await waitFor(() => expect((screen.getByRole("button", { name: "카드로 결제하고 분석 시작" }) as HTMLButtonElement).disabled).toBe(false));
  view.rerender(<NicepayPaymentActions availabilityUrl="/api/other/payment-methods" onPay={vi.fn()}/>);
  expect((screen.getByRole("button", { name: "카드로 결제하고 분석 시작" }) as HTMLButtonElement).disabled).toBe(true);
});

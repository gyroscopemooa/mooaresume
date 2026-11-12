// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheckoutPaymentChoice } from "./checkout-payment-choice";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); window.history.replaceState(null, "", "/analysis/prepare"); });

it("offers NICE card/easy pay only after the authenticated capability response", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nicepay: true }) });
  vi.stubGlobal("fetch", fetcher);
  const onChange = vi.fn();
  render(<CheckoutPaymentChoice value="POLAR" onChange={onChange}/>);
  const easy = await screen.findByRole("radio", { name: /카카오페이/ });
  fireEvent.click(easy);
  expect(onChange).toHaveBeenCalledWith("NICE_EASYPAY");
  fireEvent.click(screen.getByRole("radio", { name: /국내 카드결제/ }));
  expect(onChange).toHaveBeenCalledWith("NICE_CARD");
  expect(fetcher).toHaveBeenCalledWith("/api/billing/payment-methods", { cache: "no-store" });
  expect(document.body.textContent).not.toMatch(/토스/);
});

it("falls back to the existing provider when NICE is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const onChange = vi.fn();
  render(<CheckoutPaymentChoice value="NICE_CARD" onChange={onChange}/>);
  await waitFor(() => expect(onChange).toHaveBeenCalledWith("POLAR"));
  expect(screen.queryByRole("radio", { name: /국내 카드결제/ })).toBeNull();
});

it("preserves the installed Play payment boundary without requesting web choices", () => {
  window.history.replaceState(null, "", "/analysis/prepare?source=twa");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<CheckoutPaymentChoice value="POLAR" onChange={vi.fn()}/>);
  expect(screen.queryByRole("group")).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
});

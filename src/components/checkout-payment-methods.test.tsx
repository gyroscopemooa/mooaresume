// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { CheckoutPaymentMethods } from "./checkout-payment-methods";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/analysis/prepare");
});

it("explains Polar selection without promising direct payment or Toss support", () => {
  render(<CheckoutPaymentMethods />);
  expect(screen.getByText("카카오페이")).toBeTruthy();
  expect(screen.getByText("네이버페이")).toBeTruthy();
  expect(screen.getByText("삼성페이")).toBeTruthy();
  expect(screen.getByText(/Polar 결제창에서 선택/)).toBeTruthy();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(document.body.textContent).not.toMatch(/토스|NICE|나이스/);
});

it("does not advertise external payment inside an installed Play app", () => {
  window.history.replaceState(null, "", "/analysis/prepare?source=twa");
  render(<CheckoutPaymentMethods />);
  expect(screen.queryByRole("region", { name: "간편결제 안내" })).toBeNull();
});

it("keeps external payment messaging out of server rendering before app detection", () => {
  expect(renderToString(<CheckoutPaymentMethods />)).toBe("");
});

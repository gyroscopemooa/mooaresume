// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createCheckoutQuote } from "@/domain/usage-entitlement";
import type { NicepayOrder } from "./nicepay-order-repository";
import { renderNicepayPurchaseWindow } from "./nicepay-checkout";

afterEach(() => { vi.unstubAllEnvs(); document.body.innerHTML = ""; });
function order(): NicepayOrder {
  vi.stubEnv("NICEPAY_MID", "test00001m");
  vi.stubEnv("NICEPAY_MERCHANT_KEY", Buffer.alloc(64, 9).toString("base64"));
  return { id: "10000000-0000-4000-8000-000000000001", moid: "mooa" + "a".repeat(32),
    owner_user_id: "10000000-0000-4000-8000-000000000002", application_case_id: "10000000-0000-4000-8000-000000000003",
    analysis_run_id: "10000000-0000-4000-8000-000000000004", product: "QUICK", method: "EASYPAY", merchant_mid: "test00001m",
    amount: 9900, currency: "krw", pricing_version: "test", quote_snapshot: createCheckoutQuote("QUICK", 1), test_purchase: true,
    status: "OPEN", tid: null, billing_order_id: null, expires_at: new Date(Date.now() + 60_000).toISOString() };
}
function page(brand: "KAKAO" | "NAVER" | "SAMSUNG") {
  const html = renderNicepayPurchaseWindow(order(), "https://mooaresume.com", brand);
  document.body.innerHTML = html;
  const goPay = vi.fn();
  // Execute only our inline controller with a stubbed SDK; external scripts stay inert.
  const close: () => void = new Function("goPay", document.querySelectorAll("script")[1].textContent! + ";return nicepayClose;")(goPay);
  return { html, document, goPay, close, button: document.getElementById("openNice") as HTMLButtonElement,
    change: () => document.forms[0].dispatchEvent(new Event("change", { bubbles: true })) };
}
it.each([["KAKAO", "E016"], ["NAVER", "E020"], ["SAMSUNG", "E021"]] as const)("uses actual %s direct fields without exposing the key or auto-opening", (brand, code) => {
  const p = page(brand);
  expect((p.document.querySelector('[name="DirectEasyPay"]') as HTMLInputElement).value).toBe(code);
  expect((p.document.querySelector('[name="DirectShowOpt"]') as HTMLInputElement).value).toBe("CARD");
  expect(p.html).not.toContain(process.env.NICEPAY_MERCHANT_KEY);
  expect(p.goPay).not.toHaveBeenCalled();
  expect(p.button.disabled).toBe(true);
  expect(p.document.querySelectorAll('input[name="agreement"]:checked').length).toBe(0);
});
it("requires every agreement, locks repeated openings, and permits retry after close", () => {
  const p = page("KAKAO");
  const checks = [...p.document.querySelectorAll<HTMLInputElement>('[name="agreement"]')];
  checks[0].checked = true; p.change(); p.button.click();
  expect(p.goPay).not.toHaveBeenCalled();
  (p.document.getElementById("agreeAll") as HTMLInputElement).click();
  expect(p.button.disabled).toBe(false);
  p.button.click(); p.button.click(); expect(p.goPay).toHaveBeenCalledTimes(1);
  p.close();
  checks[1].checked = false; p.change();
  expect(p.button.disabled).toBe(true);
  checks[1].checked = true; p.change(); p.button.click();
  expect(p.goPay).toHaveBeenCalledTimes(2);
});
it("requires Naver card or point and passes the selected value into the SDK form", () => {
  const p = page("NAVER");
  (p.document.getElementById("agreeAll") as HTMLInputElement).click();
  expect(p.button.disabled).toBe(true);
  const point = p.document.querySelector<HTMLInputElement>('[value="E020=POINT"]')!;
  point.checked = true; p.change(); p.button.click();
  expect(p.goPay).toHaveBeenCalledTimes(1);
  expect(new FormData(p.goPay.mock.calls[0][0]).get("EasyPayMethod")).toBe("E020=POINT");
});
it("retains provider agreements/common selection for the NICE card action", () => {
  const value = order(); value.method = "CARD";
  const html = renderNicepayPurchaseWindow(value, "https://mooaresume.com", "KAKAO");
  expect(html).not.toContain('name="DirectEasyPay"');
  expect(html).toContain("window.addEventListener('load',openNice)");
});
it.each(["PAID", "EXPIRED"] as const)("cannot open a %s order directly", status => {
  const value = order(); value.status = status;
  expect(() => renderNicepayPurchaseWindow(value, "https://mooaresume.com", "KAKAO")).toThrow("NICEPAY_WINDOW_NOT_OPEN");
});
it("opens the selected wallet immediately after server-verified inline consent without a second consent page", () => {
  const html = renderNicepayPurchaseWindow(order(), "https://mooaresume.com", "NAVER", { version: "2026-11-13", financial: true, collection: true, sharing: true, naverMethod: "POINT" });
  expect(html).toContain('name="EasyPayMethod" value="E020=POINT"');
  expect(html).toContain("window.addEventListener('load',openNice)");
  expect(html).not.toContain('type="checkbox"');
});

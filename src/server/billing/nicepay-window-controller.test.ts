// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { nicepayWindowController } from "./nicepay-window-controller";
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ""; });
function controller(goPay = vi.fn(), auto = false) {
  document.body.innerHTML = '<p id="status"></p><form name="payForm"><input name="AuthResultCode"><input name="AuthResultMsg"><button type="button" id="retry">열기</button></form>';
  const controls: { close: () => void; submit: () => void } = new Function("goPay", nicepayWindowController("토스페이", auto) + ";return {close:nicepayClose,submit:nicepaySubmit};")(goPay);
  return { ...controls, goPay, button: document.getElementById("retry") as HTMLButtonElement, status: document.getElementById("status")!, form: document.forms[0] };
}
it("waits for a user click for popup wallets and does not auto-open on load", () => {
  const c = controller(); window.dispatchEvent(new Event("load"));
  expect(c.goPay).not.toHaveBeenCalled(); expect(c.button.hidden).toBe(false); expect(c.button.disabled).toBe(false);
  c.button.click(); c.button.click(); expect(c.goPay).toHaveBeenCalledTimes(1);
  c.close(); expect(c.button.disabled).toBe(false);
});
it("recovers a silently blocked SDK invocation after a bounded wait", () => {
  vi.useFakeTimers(); const c = controller(); c.button.click(); vi.advanceTimersByTime(12000);
  expect(c.button.disabled).toBe(false); expect(c.status.textContent).toContain("팝업 차단");
});
it.each(["false", "throw"])("keeps retry available when SDK returns %s", mode => {
  const c = controller(vi.fn(() => { if (mode === "throw") throw new Error("fixture"); return false; }));
  c.button.click(); expect(c.button.disabled).toBe(false); expect(c.status.textContent).toContain("열지 못했습니다");
});
it("shows provider failure as text and never submits it for approval", () => {
  const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
  const c = controller();
  (c.form.elements.namedItem("AuthResultCode") as HTMLInputElement).value = "NP-ERROR";
  (c.form.elements.namedItem("AuthResultMsg") as HTMLInputElement).value = '<img src=x onerror=alert(1)>';
  c.submit(); expect(submit).not.toHaveBeenCalled(); expect(c.status.textContent).toContain("NP-ERROR");
  expect(c.status.querySelector("img")).toBeNull(); expect(c.button.disabled).toBe(false);
});
it("submits authentication success once and ignores later close callbacks", () => {
  const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
  const c = controller(); (c.form.elements.namedItem("AuthResultCode") as HTMLInputElement).value = "0000";
  c.submit(); c.submit(); c.close(); expect(submit).toHaveBeenCalledTimes(1); expect(c.button.disabled).toBe(true);
});

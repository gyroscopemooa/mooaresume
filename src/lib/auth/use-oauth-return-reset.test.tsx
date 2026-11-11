// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useOAuthReturnReset } from "./use-oauth-return-reset";
afterEach(cleanup);
it("resets only restored pages and removes the listener on unmount", () => {
  const reset = vi.fn();
  function Subject() { useOAuthReturnReset(reset); return null; }
  const view = render(<Subject />);
  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: false }));
  expect(reset).not.toHaveBeenCalled();
  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
  expect(reset).toHaveBeenCalledTimes(1);
  view.unmount();
  fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
  expect(reset).toHaveBeenCalledTimes(1);
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { parseRuntimeConfig } from "@/lib/live-sub-runtime/schema";
import { selectRuntimeEventCampaign, type SelectedEventCampaign } from "@/lib/live-sub-runtime/selectors";
import { RuntimeEventSlot } from "./runtime-event-slot";

const state = vi.hoisted(() => ({ selected: null as SelectedEventCampaign | null }));
vi.mock("@/lib/live-sub-runtime", async (original) => ({
  ...await original<typeof import("@/lib/live-sub-runtime")>(),
  useRuntimeEventCampaign: () => state.selected,
}));
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("uses HQ content, waits for scroll and delay, and honours hideDaysAfterClose across sessions", () => {
  const config = parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [{
    id: "hq", status: "active", placements: ["home_banner"],
    placementConfigs: { home_banner: { enabled: true, delayMs: 1000, scrollTriggerPercent: 30, showCloseButton: false, triggerEvent: "page_load" } },
    frequency: { mode: "per_session", hideDaysAfterClose: 7 },
    defaultLocale: "ko", linkType: "external",
    defaultContent: { title: "이벤트", body: "본문", buttonText: "참여", secondaryButtonText: "나중에", badgeText: "혜택", linkUrl: "https://example.com/event" },
  }] });
  state.selected = selectRuntimeEventCampaign(config!.eventCampaigns, "home_banner");
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  const view = render(<RuntimeEventSlot slot="home_banner" />);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText("본문")).toBeNull();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
  fireEvent.scroll(window);
  expect(screen.getByText("본문")).toBeTruthy();
  expect(screen.getByText("혜택")).toBeTruthy();
  expect(screen.getByRole("link").getAttribute("href")).toBe("https://example.com/event");
  expect(screen.queryByLabelText("이벤트 닫기")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "나중에" }));
  view.unmount();
  sessionStorage.clear();
  render(<RuntimeEventSlot slot="home_banner" />);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText("본문")).toBeNull();
});

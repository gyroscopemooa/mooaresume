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

const HASH = "6f1714d4d4311f61e4f71967fbc3fd7d448167efd7be24d6873039fef706a4d8";
const imageUrl = `https://runtime.live-sub.com/api/runtime/media/events/${HASH}.png`;
function selectWithImage(slot: "home_modal" | "home_banner" | "announcement_bar") {
  const config = parseRuntimeConfig({ schemaVersion: 1, eventCampaigns: [{
    id: "img", status: "active", placements: [slot],
    placementConfigs: { [slot]: { enabled: true, delayMs: 0, triggerEvent: "page_load" } },
    frequency: { mode: "per_session" },
    defaultLocale: "ko", linkType: "external",
    defaultContent: { title: "SNS 후기 이벤트", buttonText: "참여하기", secondaryButtonText: "나중에", imageUrl, linkUrl: "https://admin.live-sub.com/apply/mooaresume/img?env=staging" },
  }] });
  state.selected = selectRuntimeEventCampaign(config!.eventCampaigns, slot);
}

it("이미지를 눌러도 참여 버튼과 같은 신청 페이지(새 탭)로 가고, 팝업에는 이미지 저장 버튼이 있다", () => {
  selectWithImage("home_modal");
  render(<RuntimeEventSlot slot="home_modal" />);
  act(() => vi.advanceTimersByTime(0));
  const applyHref = "https://admin.live-sub.com/apply/mooaresume/img?env=staging";
  const links = screen.getAllByRole("link");
  const apply = links.filter((link) => link.getAttribute("href") === applyHref);
  expect(apply).toHaveLength(2); // 이미지 + 참여 버튼
  apply.forEach((link) => { expect(link.getAttribute("target")).toBe("_blank"); expect(link.getAttribute("rel")).toBe("noopener"); });
  expect(apply[0].querySelector("img")).toBeTruthy();
  const save = screen.getByRole("link", { name: /이미지 저장/ });
  expect(save.getAttribute("href")).toBe(`/api/event-image?src=${encodeURIComponent(imageUrl)}`);
  expect(save.hasAttribute("download")).toBe(true);
  // 보조 버튼은 닫기 동작
  fireEvent.click(screen.getByRole("button", { name: "나중에" }));
  expect(screen.queryByText("SNS 후기 이벤트")).toBeNull();
});

it("배너 카드는 이미지 클릭 링크만 있고 저장 버튼은 없다", () => {
  selectWithImage("home_banner");
  render(<RuntimeEventSlot slot="home_banner" />);
  act(() => vi.advanceTimersByTime(0));
  expect(screen.queryByRole("link", { name: /이미지 저장/ })).toBeNull();
  expect(screen.getAllByRole("link").filter((link) => link.querySelector("img"))).toHaveLength(1);
});

it("상단 공지바 자리는 기본으로 가로 compact 카드로 그려지고 이미지 저장 버튼은 없다", () => {
  selectWithImage("announcement_bar");
  const { container } = render(<RuntimeEventSlot slot="announcement_bar" />);
  act(() => vi.advanceTimersByTime(0));
  expect(screen.getByText("SNS 후기 이벤트")).toBeTruthy();
  expect(container.querySelector("article")?.getAttribute("data-layout")).toBe("compact");
  expect(screen.queryByRole("link", { name: /이미지 저장/ })).toBeNull();
});

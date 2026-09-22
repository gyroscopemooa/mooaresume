// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ServiceShowcase } from "./service-showcase";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("service showcase", () => {
  it("automatically advances, wraps, and pauses for readers and reduced motion", () => {
    vi.useFakeTimers();
    let reduced = false;
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
    render(<ServiceShowcase />);
    const track = screen.getByRole("list", { name: /서비스 목록/ });
    const section = screen.getByRole("region", { name: /당신의 다음 단계도/ });
    const scrollBy = vi.fn(), scrollTo = vi.fn();
    Object.defineProperties(track, { scrollBy: { value: scrollBy }, scrollTo: { value: scrollTo }, scrollWidth: { value: 1200 }, clientWidth: { value: 400 } });
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({ top: 10, bottom: 300 } as DOMRect);
    vi.spyOn(track.firstElementChild!, "getBoundingClientRect").mockReturnValue({ width: 264 } as DOMRect);
    const tick = () => act(() => { vi.advanceTimersByTime(4000); });
    tick();
    expect(scrollBy).toHaveBeenCalledWith({ left: 288, behavior: "smooth" });
    fireEvent.mouseEnter(section); tick();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    fireEvent.mouseLeave(section);
    fireEvent.touchStart(track); tick();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    fireEvent.touchEnd(track); tick();
    expect(scrollBy).toHaveBeenCalledTimes(1);
    tick(); expect(scrollBy).toHaveBeenCalledTimes(2);
    track.scrollLeft = 800; tick();
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
    fireEvent.click(screen.getByRole("button", { name: "자동 넘김 일시정지" })); tick();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "자동 넘김 재생" }));
    reduced = true; tick();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("links available services and keeps preview and upcoming cards informational", () => {
    render(<ServiceShowcase />);
    expect(screen.getByRole("heading", { name: "이력서" }).closest("a")?.getAttribute("href")).toBe("/resume");
    const legal = screen.getByRole("heading", { name: "나홀로소송" }).closest("article")!;
    expect(within(legal).getByText("베타 준비 중")).toBeTruthy();
    expect(within(legal).queryByRole("link")).toBeNull();
    const interview = screen.getByRole("heading", { name: "면접 PRO" }).closest("article")!;
    expect(within(interview).getByText("준비 중")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /면접 PRO/ })).toBeNull();
  });

  it.each([false, true])("moves in both directions and respects reduced motion: %s", (reduced) => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced })));
    render(<ServiceShowcase />);
    const track = screen.getByRole("list", { name: /서비스 목록/ });
    const scrollBy = vi.fn();
    Object.defineProperty(track, "scrollBy", { value: scrollBy });
    vi.spyOn(track.firstElementChild!, "getBoundingClientRect").mockReturnValue({ width: 264 } as DOMRect);
    fireEvent.click(screen.getByRole("button", { name: "다음 서비스 보기" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 288, behavior: reduced ? "auto" : "smooth" });
    fireEvent.click(screen.getByRole("button", { name: "이전 서비스 보기" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -288, behavior: reduced ? "auto" : "smooth" });
  });
});

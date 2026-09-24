// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MaintenanceGate } from "./maintenance-gate";
import { MAINTENANCE_BYPASS_STORAGE_KEY } from "@/lib/live-sub-runtime/maintenance";

let pathname = "/";
let maintenance: { enabled: boolean; message: string; scope: string } = { enabled: false, message: "", scope: "all" };

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/lib/live-sub-runtime/hooks", () => ({ useRuntimeMaintenance: () => maintenance }));

const page = () => render(<MaintenanceGate><p>실제 페이지</p></MaintenanceGate>);

beforeEach(() => {
  pathname = "/";
  maintenance = { enabled: false, message: "", scope: "all" };
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MaintenanceGate", () => {
  it("점검이 없으면 페이지를 그대로 보여 준다", async () => {
    page();
    expect(await screen.findByText("실제 페이지")).toBeTruthy();
  });

  it('scope "all" → 자식은 렌더되지 않고 점검 화면만 보인다 (딥링크 경로도 동일)', async () => {
    maintenance = { enabled: true, message: "전체 점검 중", scope: "all" };
    pathname = "/result/complete";
    page();
    expect(await screen.findByText("전체 점검 중")).toBeTruthy();
    expect(screen.queryByText("실제 페이지")).toBeNull();
  });

  it("기능 key → 그 기능 화면만 점검 안내, 다른 화면은 정상", async () => {
    maintenance = { enabled: true, message: "분석 점검", scope: "resume_analysis" };
    pathname = "/quick";
    const blocked = page();
    expect(await screen.findByText("분석 점검")).toBeTruthy();
    expect(screen.queryByText("실제 페이지")).toBeNull();
    blocked.unmount();

    pathname = "/community";
    page();
    expect(await screen.findByText("실제 페이지")).toBeTruthy();
    expect(screen.queryByText("분석 점검")).toBeNull();
  });

  it("기억된 우회가 있으면 전체 점검이어도 정상 접근", async () => {
    maintenance = { enabled: true, message: "전체 점검 중", scope: "all" };
    window.localStorage.setItem(MAINTENANCE_BYPASS_STORAGE_KEY, String(Date.now() + 60_000));
    page();
    expect(await screen.findByText("실제 페이지")).toBeTruthy();
    expect(screen.queryByText("전체 점검 중")).toBeNull();
  });

  it("?bypass=토큰 이 서버 확인에 통과하면 우회하고 주소에서 토큰을 지운다", async () => {
    maintenance = { enabled: true, message: "전체 점검 중", scope: "all" };
    window.history.replaceState(null, "", "/?bypass=secret-token-value&x=1");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    page();
    await waitFor(() => expect(screen.getByText("실제 페이지")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/maintenance/bypass", expect.objectContaining({ method: "POST" }));
    expect(window.location.search).toBe("?x=1");
    expect(window.localStorage.getItem(MAINTENANCE_BYPASS_STORAGE_KEY)).not.toBeNull();
  });

  it("틀린 토큰이면 우회되지 않고 점검 화면", async () => {
    maintenance = { enabled: true, message: "전체 점검 중", scope: "all" };
    window.history.replaceState(null, "", "/?bypass=wrong");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    page();
    expect(await screen.findByText("전체 점검 중")).toBeTruthy();
    expect(window.localStorage.getItem(MAINTENANCE_BYPASS_STORAGE_KEY)).toBeNull();
  });
});

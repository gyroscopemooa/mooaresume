// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MaintenanceGate } from "./maintenance-gate";
import { MAINTENANCE_BYPASS_STORAGE_KEY } from "@/lib/live-sub-runtime/maintenance";

let pathname = "/";
let maintenance: { enabled: boolean; message: string; scope: string; imageUrl?: string; mobileImageUrl?: string; imageBackground?: string } = { enabled: false, message: "", scope: "all" };

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

  it("개발 모드(StrictMode)처럼 effect 가 두 번 실행돼도 토큰 우회가 유지된다", async () => {
    maintenance = { enabled: true, message: "전체 점검 중", scope: "all" };
    window.history.replaceState(null, "", "/?bypass=secret-token-value");
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 30))));
    render(<StrictMode><MaintenanceGate><p>실제 페이지</p></MaintenanceGate></StrictMode>);
    // 우회 확인 중(null)에도 페이지는 보이므로, 확인이 끝난 뒤(토큰 제거·기억 저장)의 최종 상태를 본다.
    await waitFor(() => expect(window.localStorage.getItem(MAINTENANCE_BYPASS_STORAGE_KEY)).not.toBeNull());
    await waitFor(() => expect(window.location.search).toBe(""));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(screen.getByText("실제 페이지")).toBeTruthy();
    expect(screen.queryByText("전체 점검 중")).toBeNull();
  });

  it("틀린 토큰이면 우회되지 않고 점검 화면", async () => {
    maintenance = { enabled: true, message: "전체 점검 중", scope: "all" };
    window.history.replaceState(null, "", "/?bypass=wrong");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    page();
    expect(await screen.findByText("전체 점검 중")).toBeTruthy();
    expect(window.localStorage.getItem(MAINTENANCE_BYPASS_STORAGE_KEY)).toBeNull();
  });

  describe("전체 차단 이미지", () => {
    const desktop = "https://runtime.live-sub.com/desktop.png";
    const mobile = "https://runtime.live-sub.com/mobile.png";
    const fullWith = (extra: Partial<typeof maintenance>) => {
      maintenance = { enabled: true, message: "전체 점검 중", scope: "all", ...extra };
    };

    it("이미지가 없으면 문구 카드", async () => {
      fullWith({});
      const { container } = page();
      expect(await screen.findByText("전체 점검 중")).toBeTruthy();
      expect(container.querySelector("img")).toBeNull();
    });

    it("imageUrl 만 있으면 그 이미지를 쓰고, 모든 폭에서 같은 이미지(source 없음)", async () => {
      fullWith({ imageUrl: desktop });
      const { container } = page();
      const image = await screen.findByAltText("전체 점검 중");
      expect(image.getAttribute("src")).toBe(desktop);
      expect(container.querySelector("source")).toBeNull();
      expect(screen.queryByText("실제 페이지")).toBeNull();
      expect(container.querySelector("main")?.getAttribute("role")).toBe("alert");
    });

    it("이미지가 뜨기 전에는 문구 카드가 보이고(빈 화면 없음), 로드되면 카드가 사라진다", async () => {
      fullWith({ imageUrl: desktop });
      page();
      const image = await screen.findByAltText("전체 점검 중");
      expect(screen.getByRole("heading", { name: "전체 점검 중" })).toBeTruthy();
      fireEvent.load(image);
      await waitFor(() => expect(screen.queryByRole("heading", { name: "전체 점검 중" })).toBeNull());
      expect(screen.getByAltText("전체 점검 중")).toBeTruthy();
    });

    it("좁은 화면(760px 이하)에서는 mobileImageUrl 을, 넓은 화면은 imageUrl 을 쓴다", async () => {
      fullWith({ imageUrl: desktop, mobileImageUrl: mobile });
      const { container } = page();
      const image = await screen.findByAltText("전체 점검 중");
      const source = container.querySelector("source");
      expect(source?.getAttribute("media")).toBe("(max-width: 760px)");
      expect(source?.getAttribute("srcset")).toBe(mobile);
      expect(image.getAttribute("src")).toBe(desktop);
    });

    it("mobileImageUrl 만 있으면 넓은 화면에서도 그 이미지", async () => {
      fullWith({ mobileImageUrl: mobile });
      const { container } = page();
      expect((await screen.findByAltText("전체 점검 중")).getAttribute("src")).toBe(mobile);
      expect(container.querySelector("source")).toBeNull();
    });

    it("이미지 로드 실패(onError) 시 문구 카드로 폴백", async () => {
      fullWith({ imageUrl: desktop });
      const { container } = page();
      fireEvent.error(await screen.findByAltText("전체 점검 중"));
      await waitFor(() => expect(container.querySelector("img")).toBeNull());
      expect(screen.getByRole("heading", { name: "전체 점검 중" })).toBeTruthy();
      expect(screen.queryByText("실제 페이지")).toBeNull();
    });

    it("imageBackground 가 배경색이 되고, 없으면 검정", async () => {
      fullWith({ imageUrl: desktop, imageBackground: "#ffcc00" });
      const first = page();
      await screen.findByAltText("전체 점검 중");
      expect(first.container.querySelector("main")?.style.background).toBe("rgb(255, 204, 0)");
      first.unmount();

      fullWith({ imageUrl: desktop });
      const second = page();
      await screen.findByAltText("전체 점검 중");
      expect(second.container.querySelector("main")?.style.background).toBe("rgb(0, 0, 0)");
    });

    it("기능(feature) 점검에서는 이미지를 무시하고 기존 카드", async () => {
      fullWith({ scope: "community", message: "커뮤니티 점검", imageUrl: desktop });
      pathname = "/community";
      const { container } = page();
      expect(await screen.findByText("커뮤니티 점검")).toBeTruthy();
      expect(container.querySelector("img")).toBeNull();
    });

    it("우회 중이면 이미지 점검이어도 정상 접근", async () => {
      fullWith({ imageUrl: desktop });
      window.localStorage.setItem(MAINTENANCE_BYPASS_STORAGE_KEY, String(Date.now() + 60_000));
      const { container } = page();
      expect(await screen.findByText("실제 페이지")).toBeTruthy();
      expect(container.querySelector("img")).toBeNull();
    });
  });
});

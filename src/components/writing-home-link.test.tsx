// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { loadAppSelection } from "@/lib/app-intake-draft";
import { AppOnboardingRedirect, WritingHomeLink, writingHomeHref } from "./writing-home-link";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

function enterInstalledApp() {
  window.history.replaceState(null, "", "/analysis/prepare?source=twa");
}

beforeEach(() => {
  sessionStorage.clear();
  replace.mockClear();
  window.history.replaceState(null, "", "/analysis/prepare");
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("작성 화면 링크(앱은 첨삭 홈, 웹은 유형 선택)", () => {
  it("도착지 함수: 앱이면 /app, 웹이면 기본 /onboarding 또는 지정한 웹 주소", () => {
    expect(writingHomeHref(true)).toBe("/app");
    expect(writingHomeHref(false)).toBe("/onboarding");
    expect(writingHomeHref(false, "/pro/polish")).toBe("/pro/polish");
    expect(writingHomeHref(true, "/pro/polish")).toBe("/app");
  });

  it("일반 웹에서는 /onboarding으로 간다", async () => {
    render(<WritingHomeLink>유형 다시 고르기</WritingHomeLink>);
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 5)); });
    expect(screen.getByRole("link", { name: "유형 다시 고르기" }).getAttribute("href")).toBe("/onboarding");
  });

  it("일반 웹에서 webHref를 주면 그곳으로 간다", async () => {
    render(<WritingHomeLink webHref="/pro/polish">PRO로 진행하기</WritingHomeLink>);
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 5)); });
    expect(screen.getByRole("link", { name: "PRO로 진행하기" }).getAttribute("href")).toBe("/pro/polish");
  });

  it("설치된 앱에서는 /app(첨삭 홈)으로 간다", async () => {
    enterInstalledApp();
    render(<WritingHomeLink>유형 다시 고르기</WritingHomeLink>);
    await waitFor(() => expect(screen.getByRole("link", { name: "유형 다시 고르기" }).getAttribute("href")).toBe("/app"));
  });

  it("앱에서 누르면 안내가 권한 상품·유형을 미리 골라 둔다", async () => {
    enterInstalledApp();
    render(<WritingHomeLink preselect={{ product: "PRO", mode: "BUILD" }}>유형 다시 고르기</WritingHomeLink>);
    const link = await screen.findByRole("link", { name: "유형 다시 고르기" });
    await waitFor(() => expect(link.getAttribute("href")).toBe("/app"));
    fireEvent.click(link);
    expect(loadAppSelection()).toEqual({ product: "PRO", mode: "BUILD" });
  });

  it("웹에서 누르면 앱 선택값을 건드리지 않는다", async () => {
    render(<WritingHomeLink preselect={{ product: "PRO", mode: "BUILD" }}>유형 다시 고르기</WritingHomeLink>);
    const link = await screen.findByRole("link", { name: "유형 다시 고르기" });
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 5)); });
    fireEvent.click(link);
    expect(loadAppSelection()).toBeNull();
  });
});

describe("앱에서 웹의 유형 선택 화면이 열렸을 때의 안전장치", () => {
  it("설치된 앱이면 /app으로 보낸다", async () => {
    enterInstalledApp();
    render(<AppOnboardingRedirect />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
  });

  it("일반 웹이면 아무것도 하지 않는다", async () => {
    render(<AppOnboardingRedirect />);
    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 10)); });
    expect(replace).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppStartWizard } from "./app-start-wizard";
import { loadAppIntakeDraft, loadAppSelection } from "@/lib/app-intake-draft";

/**
 * 앱 "시작" 메뉴가 하는 약속: 단계를 고르면 그 단계에 맞는 상품만 권하고,
 * 고른 값을 첨삭 홈이 그대로 이어받는다.
 *
 * 홈 위쪽의 선택과 따로 두는 자리이므로, 두 곳이 어긋나면 "시작"으로 고른 것이
 * 홈에서 다시 물어보는 화면이 됩니다 — 그래서 저장까지 확인합니다.
 */

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  push.mockReset();
});

const stage = (text: string) => screen.getByRole("button", { name: new RegExp(text) });

describe("앱 시작 메뉴", () => {
  it("단계를 고르기 전에는 다음으로 넘기지 않는다", () => {
    render(<AppStartWizard/>);
    const next = screen.getByRole("button", { name: /단계를 골라/ });
    expect(next).toHaveProperty("disabled", true);
  });

  it("거의 완성한 사람에게는 QUICK을 추천하고, 고른 값을 홈으로 넘긴다", async () => {
    render(<AppStartWizard/>);
    fireEvent.click(stage("거의 완성했고"));
    fireEvent.click(screen.getByRole("button", { name: /다음 · 상품 고르기/ }));

    const quick = await screen.findByRole("button", { name: /QUICK/ });
    expect(quick.textContent).toContain("추천");
    fireEvent.click(quick);

    // 홈(`/app`)의 상단 선택이 이 값을 이어받습니다.
    expect(loadAppSelection()).toEqual({ product: "QUICK", mode: "POLISH" });
    expect(push).toHaveBeenCalledWith("/app");
  });

  it("아직 아무것도 쓰지 않았으면 QUICK을 팔지 않는다", async () => {
    render(<AppStartWizard/>);
    fireEvent.click(stage("아직 아무것도 못 썼어요"));
    fireEvent.click(screen.getByRole("button", { name: /다음 · 상품 고르기/ }));

    // QUICK은 지금 쓴 글만 봅니다 — 첨삭할 글이 없으면 결제로 보내지 않습니다.
    await waitFor(() => expect(screen.getByText(/첨삭할 작성본이 필요해요/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /QUICK/ })).toBeNull();
    expect(screen.getByRole("button", { name: /PRO/ }).textContent).toContain("추천");
  });

  it("단계를 모르겠다면 붙여넣은 분량으로 임시 추천하고, 그 글을 입력칸으로 넘긴다", async () => {
    render(<AppStartWizard/>);
    fireEvent.click(screen.getByRole("button", { name: /어떤 단계인지 모르겠어요/ }));
    // 700자 목표에 한참 못 미치는 분량 → 내용 보완 단계.
    fireEvent.change(screen.getByPlaceholderText(/붙여넣거나/), { target: { value: "가".repeat(120) } });

    await waitFor(() => expect(screen.getByText(/내용 보완 단계로 임시 추천/)).toBeTruthy());
    expect(stage("써보긴 했는데").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /다음 · 상품 고르기/ }));
    fireEvent.click(await screen.findByRole("button", { name: /PRO/ }));

    expect(loadAppSelection()).toEqual({ product: "PRO", mode: "BUILD" });
    // 같은 글을 두 번 치게 하지 않습니다.
    expect(loadAppIntakeDraft()?.simpleDraft).toContain("가가가");
  });

  it("FINAL이 닫혀 있으면 결제로 보내지 않는다", async () => {
    render(<AppStartWizard/>);
    fireEvent.click(stage("거의 완성했고"));
    fireEvent.click(screen.getByRole("button", { name: /다음 · 상품 고르기/ }));

    await waitFor(() => expect(screen.getByText(/아직 열리지 않았습니다/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /FINAL/ })).toBeNull();
  });
});

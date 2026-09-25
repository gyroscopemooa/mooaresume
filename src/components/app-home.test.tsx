// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppHome } from "./app-home";
import { loadAppIntakeDraft } from "@/lib/app-intake-draft";

/**
 * 앱 셸에서 가장 쉽게 깨지는 약속: **탭을 옮겼다 돌아와도 입력이 그대로다.**
 *
 * 웹에서는 입력 화면이 다음 화면으로 넘어갈 때만 저장하므로, 하단 탭으로
 * 이력서를 한 번 보고 온 사람은 붙여넣은 자소서를 잃습니다. 여기서는 화면을
 * 실제로 떼었다 다시 붙여(unmount → render) 복원되는지 봅니다.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

// 간편 입력과 상세 입력이 함께 마운트되어 있고(서로 오가며 비교하는 화면),
// 둘 다 같은 안내 문구를 씁니다. 첫 번째가 간편 입력의 큰 칸입니다.
const draftBox = () => screen.getAllByPlaceholderText(/자기소개서 전체를 그대로 붙여넣어/)[0] as HTMLTextAreaElement;

describe("앱 첨삭 화면", () => {
  it("상품과 작성 유형을 고르는 자리를 먼저 보여준다", () => {
    render(<AppHome/>);
    expect(screen.getByRole("tab", { name: /^QUICK/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^PRO/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^FINAL/ })).toBeTruthy();
    // 기본은 PRO · 최종 첨삭이고, 입력창이 첫 화면에 바로 있습니다.
    expect(screen.getByRole("tab", { name: /^PRO/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "최종 첨삭" }).getAttribute("aria-selected")).toBe("true");
    expect(draftBox()).toBeTruthy();
  });

  it("설치 앱 시작 신호에서는 넓은 앱 캔버스를 사용한다", async () => {
    window.history.replaceState(null, "", "/app?source=twa");
    const { container } = render(<AppHome/>);

    await waitFor(() => expect(container.firstElementChild?.className).toContain("shellInstalled"));
    // 앱의 로고는 웹 홈으로 가되 TWA 표시를 이어 붙입니다.
    expect(screen.getByRole("link", { name: "MOOA Resume 홈으로" }).getAttribute("href")).toBe("/?source=twa");
    window.history.replaceState(null, "", "/");
  });

  it("일반 웹의 /app 로고는 TWA 표시 없이 홈으로 간다(웹 손님이 앱으로 오인돼 결제가 막히지 않도록)", async () => {
    window.history.replaceState(null, "", "/app");
    render(<AppHome/>);

    await waitFor(() => expect(screen.getByRole("link", { name: "MOOA Resume 홈으로" })).toBeTruthy());
    expect(screen.getByRole("link", { name: "MOOA Resume 홈으로" }).getAttribute("href")).toBe("/");
  });

  it("탭을 옮겼다 돌아와도 붙여넣은 자기소개서가 남아 있다", async () => {
    const { unmount } = render(<AppHome/>);
    fireEvent.change(draftBox(), { target: { value: "저는 생산라인에서 3년간 일했습니다." } });

    await waitFor(() => expect(loadAppIntakeDraft()?.simpleDraft).toContain("생산라인"));

    // 이력서 탭으로 갔다가 돌아온 것과 같은 상태.
    unmount();
    render(<AppHome/>);

    await waitFor(() => expect(draftBox().value).toContain("생산라인에서 3년간"));
  });

  it("상품을 QUICK으로 바꾸면 QUICK 입력과 유형만 남는다", async () => {
    render(<AppHome/>);
    fireEvent.click(screen.getByRole("tab", { name: /^QUICK/ }));

    await waitFor(() => expect(screen.getByRole("tab", { name: /^QUICK/ }).getAttribute("aria-selected")).toBe("true"));
    // QUICK은 공고·자료를 보지 않으므로 '처음부터'가 없습니다 — 기존 웹의
    // 상품 범위와 같습니다.
    expect(screen.queryByRole("tab", { name: "처음부터" })).toBeNull();
  });

  it("FINAL이 닫혀 있으면 고를 수 없다고 말한다", () => {
    render(<AppHome/>);
    const final = screen.getByRole("tab", { name: /^FINAL/ });
    // NEXT_PUBLIC_ENABLE_FINAL이 없는 환경(테스트·실서버)에서는 준비 중입니다.
    expect(final.getAttribute("aria-disabled")).toBe("true");
    expect(final.textContent).toContain("준비 중");
    fireEvent.click(final);
    expect(screen.getByRole("tab", { name: /^PRO/ }).getAttribute("aria-selected")).toBe("true");
  });
});

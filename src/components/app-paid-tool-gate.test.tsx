// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ResumeBuildPanel } from "./resume-build-panel";
import { TWA_SOURCE_PARAM } from "@/lib/app-context";

/**
 * Play 앱 안에서 외부 결제(Polar) 버튼이 보이면 심사에서 걸립니다.
 *
 * 자소서 첨삭에는 Play 결제 경로가 있지만 이력서 AI 제작·경력기술서·포트폴리오·
 * AI 심층해설·법률 문서는 아직 Polar 전용이라, 앱에서는 결제 자리를 안내로
 * 바꿉니다. 웹에서는 그대로 팔려야 하므로 두 경우를 같이 봅니다.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/resume");
});

const payButton = () => screen.queryByRole("button", { name: /AI로 이력서 만들기/ });

describe("앱에서의 외부 결제 진입점", () => {
  it("웹에서는 결제 버튼을 그대로 보여준다", async () => {
    render(<ResumeBuildPanel/>);
    await waitFor(() => expect(payButton()).toBeTruthy());
    expect(screen.queryByText(/앱에서 준비 중입니다/)).toBeNull();
  });

  it("Play 앱으로 실행됐으면 결제 버튼 대신 안내를 둔다", async () => {
    // TWA 시작 주소에 붙는 표시. 앱으로 열렸다는 뜻입니다.
    window.history.replaceState(null, "", `/resume?source=${TWA_SOURCE_PARAM}`);

    render(<ResumeBuildPanel/>);

    await waitFor(() => expect(screen.getByText(/앱에서 준비 중입니다/)).toBeTruthy());
    expect(payButton()).toBeNull();
    // 웹으로 유도하지 않습니다 — 그 유도가 정확히 Play가 금지하는 것입니다.
    expect(document.body.textContent).not.toMatch(/웹에서 결제|웹사이트에서 결제|브라우저에서 결제/);
  });
});

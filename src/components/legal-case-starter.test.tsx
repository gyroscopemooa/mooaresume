// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LegalCaseStarter } from "./legal-case-starter";
import { LEGAL_CAUTIONS } from "@/domain/legal-case";

const { push, refresh, signInWithOtp } = vi.hoisted(() => ({
  push: vi.fn(), refresh: vi.fn(), signInWithOtp: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOtp } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  signInWithOtp.mockResolvedValue({ error: null });
  window.history.replaceState(null, "", "/legal");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("법률 시작 화면", () => {
  it("로그인 전에는 사건 생성이 잠겨 있고 중요한 고지와 입력 레이블이 보인다", () => {
    render(<LegalCaseStarter initialCases={[]} signedIn={false} />);
    expect((screen.getByRole("button", { name: "사건 만들기" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("로그인 코드를 받을 이메일")).toBeTruthy();
    expect(screen.getByRole("list", { name: "서비스 이용 순서" })).toBeTruthy();
    for (const caution of LEGAL_CAUTIONS) expect(screen.getByText(caution)).toBeTruthy();
  });

  it("빈 사건 이름은 저장 요청 전에 안내한다", () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    render(<LegalCaseStarter initialCases={[]} signedIn />);
    fireEvent.click(screen.getByRole("button", { name: "사건 만들기" }));
    expect(screen.getByRole("status").textContent).toContain("사건 이름을 적어 주세요");
    expect(request).not.toHaveBeenCalled();
  });

  it("사건 생성 후 선택했던 문서로 이어진다 (API 모의 응답)", async () => {
    window.history.replaceState(null, "", "/legal?doc=ANSWER");
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ case: { id: "fixture-case" } }) });
    vi.stubGlobal("fetch", request);
    render(<LegalCaseStarter initialCases={[]} signedIn />);
    await waitFor(() => expect(screen.getByText(/을\(를\) 고르고 들어오셨습니다/)).toBeTruthy());
    fireEvent.change(screen.getByLabelText("사건 이름"), { target: { value: "  가상 사건 테스트  " } });
    fireEvent.click(screen.getByRole("button", { name: "사건 만들기" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/legal/fixture-case?doc=ANSWER"));
    expect(request).toHaveBeenCalledWith("/api/legal-cases", expect.objectContaining({
      method: "POST", body: JSON.stringify({ title: "가상 사건 테스트", caseType: "CIVIL", myRole: "UNDECIDED", summary: "" }),
    }));
  });

  it("코드 발송 후 인증 입력과 상태 메시지를 보여 준다 (인증 모의 응답)", async () => {
    render(<LegalCaseStarter initialCases={[]} signedIn={false} />);
    fireEvent.change(screen.getByLabelText("로그인 코드를 받을 이메일"), { target: { value: "fixture@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "코드 받기" }));
    await waitFor(() => expect(screen.getByLabelText("이메일 인증 코드")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("6자리 코드를 보냈습니다");
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CouponCodeEntry } from "./coupon-code-entry";
import { PENDING_COUPON_CODE } from "@/lib/pending-code";

/**
 * 이 화면이 막히면 사람이 돈을 냅니다.
 *
 * 쿠폰은 그 분석을 공짜로 만드는 물건이라, 결제 직전에 등록하지 못하면 무료
 * 이용권을 손에 쥔 채로 결제하게 됩니다. 그래서 "로그아웃이어도 입력은 받고,
 * 로그인 왕복을 코드가 살아남는다"를 테스트로 붙잡아 둡니다.
 */

const rpc = vi.fn();
const getUser = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc, auth: { getUser, signInWithOAuth } }),
}));

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: { product: "QUICK" }, error: null });
  getUser.mockReset().mockResolvedValue({ data: { user: null } });
  signInWithOAuth.mockReset().mockResolvedValue({ error: null });
  sessionStorage.clear();
});

afterEach(cleanup);

const field = () => screen.getByLabelText("쿠폰 코드");
const button = () => screen.getByRole("button");

describe("로그아웃 상태", () => {
  it("입력칸을 잠그지 않는다", async () => {
    render(<CouponCodeEntry requireSignIn returnTo="/analysis/prepare" />);
    await waitFor(() => expect(getUser).toHaveBeenCalled());

    expect((field() as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByText(/로그인 후 자동으로 적용/)).toBeTruthy();
  });

  it("등록을 누르면 코드를 맡겨 두고 로그인으로 보낸다", async () => {
    render(<CouponCodeEntry requireSignIn returnTo="/analysis/prepare" />);
    await waitFor(() => expect(getUser).toHaveBeenCalled());

    fireEvent.change(field(), { target: { value: "youth-mua-2026" } });
    fireEvent.click(button());

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    // 대문자로 맞춰 둡니다. 돌아와서 등록할 때 다시 손볼 사람이 없습니다.
    expect(sessionStorage.getItem(PENDING_COUPON_CODE)).toBe("YOUTH-MUA-2026");
    // 로그인 전에는 등록을 시도하지 않습니다 — 어차피 거절당합니다.
    expect(rpc).not.toHaveBeenCalled();
  });

  it("빈 칸으로 누르면 로그인부터 보내지 않는다", async () => {
    render(<CouponCodeEntry requireSignIn returnTo="/analysis/prepare" />);
    await waitFor(() => expect(getUser).toHaveBeenCalled());

    fireEvent.click(button());

    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(screen.getByText("쿠폰 코드를 넣어 주세요.")).toBeTruthy();
  });
});

describe("로그인하고 돌아왔을 때", () => {
  it("맡겨 둔 코드를 대신 등록한다", async () => {
    sessionStorage.setItem(PENDING_COUPON_CODE, "YOUTH-MUA-2026");
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    render(<CouponCodeEntry requireSignIn returnTo="/analysis/prepare" />);

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("claim_coupon_code", { p_code: "YOUTH-MUA-2026" }));
    expect(await screen.findByText(/무료 이용권이 계정에 들어왔습니다/)).toBeTruthy();
    // 한 번 쓰고 지웁니다. 남겨 두면 다음에 이 화면을 열 때마다 다시 등록을
    // 시도하고, 두 번째부터는 "이미 사용하신 쿠폰"이 됩니다.
    expect(sessionStorage.getItem(PENDING_COUPON_CODE)).toBeNull();
  });

  it("맡겨 둔 코드가 없으면 아무 일도 하지 않는다", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    render(<CouponCodeEntry requireSignIn returnTo="/analysis/prepare" />);
    await waitFor(() => expect(getUser).toHaveBeenCalled());

    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("로그인한 상태", () => {
  it("바로 등록한다", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(<CouponCodeEntry requireSignIn returnTo="/analysis/prepare" />);
    await waitFor(() => expect(getUser).toHaveBeenCalled());

    fireEvent.change(field(), { target: { value: "YOUTH-MUA-2026" } });
    fireEvent.click(button());

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("claim_coupon_code", { p_code: "YOUTH-MUA-2026" }));
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("실패하면 이유를 각각 다르게 말한다", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    rpc.mockResolvedValue({ data: null, error: { message: "COUPON_EXHAUSTED" } });
    render(<CouponCodeEntry requireSignIn />);
    await waitFor(() => expect(getUser).toHaveBeenCalled());

    fireEvent.change(field(), { target: { value: "YOUTH-MUA-2026" } });
    fireEvent.click(button());

    expect(await screen.findByText("준비된 수량이 모두 사용되었습니다.")).toBeTruthy();
  });
});

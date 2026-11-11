// @vitest-environment jsdom
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApplicationCaseHandoff } from "./application-case-handoff";
import type { GuestDraft } from "@/lib/guest-draft";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), fetch: vi.fn(), oauth: vi.fn(), credits: [] as { product: string }[], play: false, recovered: [] as { purchaseToken: string; analysisRunId: string }[], panelReady: true, testGrant: false }));
const user = { id: "2b97f3dc-377b-4d89-8b9b-cb15be001100", app_metadata: { provider: "kakao", mooa_delivery_preference: { version: 1, mode: "dashboard_only", user_id: "2b97f3dc-377b-4d89-8b9b-cb15be001100", updated_at: "2026-11-11T00:00:00Z" } } };
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser, signInWithOAuth: mocks.oauth }, rpc: mocks.rpc, from: (table: string) => {
  const chain = { select: () => chain, eq: () => chain, is: () => chain, gt: () => chain, in: async () => ({ data: [] }), limit: async () => ({ data: table === "reward_credits" ? mocks.credits : mocks.testGrant ? [{ id: "grant", max_uses: 1 }] : [], error: null }) }; return chain;
} }) }));
vi.mock("./account-email-panel", () => ({ AccountEmailPanel: function Panel({ onReadinessChange }: { onReadinessChange: (state: { userId: string; ready: boolean }) => void }) {
  useEffect(() => { onReadinessChange({ userId: user.id, ready: mocks.panelReady }); }, [onReadinessChange]);
  return <section id="account-delivery" tabIndex={-1} aria-label="이용 방식"><button onClick={() => onReadinessChange({ userId: user.id, ready: true })}>이용 방식 선택</button></section>;
} }));
vi.mock("./research-consent-gate", () => ({ ResearchConsentGate: ({ onDecided }: { onDecided: (value: boolean) => void }) => <button onClick={() => onDecided(true)}>데이터 선택</button> }));
vi.mock("@/lib/google-play/purchase", () => ({ describeDigitalGoodsFailure: () => "", isGooglePlayBillingAvailable: () => mocks.play, openDigitalGoodsService: async () => ({}), requestGooglePlayPayment: vi.fn(), resolveGooglePlayProductId: () => "quick" }));
vi.mock("@/lib/google-play/app-checkout", () => ({ completeGooglePlayPurchase: vi.fn(), readPendingPurchases: () => mocks.recovered, recoverGooglePlayPurchases: async () => ({ entitled: mocks.recovered, pending: [] }) }));
vi.mock("@/lib/analytics/web", () => ({ trackWeb: vi.fn() }));
const draft: GuestDraft = { draftText: "그대로 남아야 하는 자소서", questionDrafts: ["첫째 답변", "둘째 답변"], targetLength: 700, writingStyle: "BALANCED", editingStance: "BALANCED", selectedProduct: "PRO", savedAt: "2026-11-11T00:00:00Z" };
const runId = "cd6a613d-f614-4ef5-812e-a53b604838cb";
const caseId = "89190611-72f8-4447-8676-a6e20c29006f";
beforeEach(() => {
  vi.resetAllMocks(); mocks.credits = []; mocks.play = false; mocks.recovered = []; mocks.panelReady = true; mocks.testGrant = false;
  mocks.getUser.mockResolvedValue({ data: { user }, error: null }); mocks.rpc.mockResolvedValue({ error: null }); mocks.oauth.mockResolvedValue({ error: null });
  mocks.fetch.mockImplementation(async (url: string) => url === "/api/application-cases" ? { ok: true, json: async () => ({ applicationCaseId: caseId, analysisRunId: runId }) } : url.includes("/execute") ? { ok: true, status: 202, json: async () => ({}) } : { ok: false, json: async () => ({ error: "결제 준비 실패" }) });
  vi.stubGlobal("fetch", mocks.fetch); Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.setItem("mooa:guest-draft:v1", JSON.stringify(draft));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); sessionStorage.clear(); });
async function ready() { await screen.findByRole("button", { name: "데이터 선택" }); fireEvent.click(screen.getByRole("button", { name: "데이터 선택" })); }
const pay = () => screen.getByRole("button", { name: /결제하고 분석 시작/ });

describe("checkout delivery prerequisites", () => {
  it("keeps first-time users inline until a choice is saved", async () => {
    mocks.panelReady = false; mocks.getUser.mockResolvedValue({ data: { user: { id: user.id, app_metadata: { provider: "kakao" } } }, error: null });
    render(<ApplicationCaseHandoff guest={draft} />); await ready(); fireEvent.click(pay());
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(screen.getByText(/위에서 이메일을 확인하거나/)).toBeTruthy();
    expect(sessionStorage.getItem("mooa:guest-draft:v1")).toBe(JSON.stringify(draft));
  });
  it("rechecks readiness and UUID before saving any case even if UI is stale", async () => {
    render(<ApplicationCaseHandoff guest={draft} />); await ready();
    mocks.getUser.mockResolvedValue({ data: { user: { ...user, id: "different-account" } }, error: null });
    fireEvent.click(pay()); await screen.findByText(/로그인 계정이 바뀌었거나/); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["QUICK", "PRO", "FINAL"] as const)("keeps %s and question data, prevents repeated save, and protects saved retry", async (product) => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_FINAL", "true");
    render(<ApplicationCaseHandoff guest={{ ...draft, selectedProduct: product }} />); await ready();
    const initialPay = pay(); fireEvent.click(initialPay); fireEvent.click(initialPay); await screen.findByText("결제 준비 실패");
    expect(mocks.fetch.mock.calls.filter(([url]) => url === "/api/application-cases")).toHaveLength(1);
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body.product).toBe(product); expect(body.questions.map((q: { answer: string }) => q.answer)).toEqual(draft.questionDrafts);
    expect(mocks.fetch).toHaveBeenCalledWith("/api/checkouts/" + product.toLowerCase(), expect.anything());
    const before = mocks.fetch.mock.calls.length;
    mocks.getUser.mockResolvedValue({ data: { user: { id: user.id, app_metadata: { provider: "kakao" } } }, error: null });
    fireEvent.click(pay()); await screen.findByText("이메일 확인 또는 대시보드 전용 이용을 먼저 선택해 주세요.");
    expect(mocks.fetch).toHaveBeenCalledTimes(before);
    vi.unstubAllEnvs();
  });
  it.each([false, true])("preflights before consuming free/test credit (test=%s)", async (testGrant) => {
    mocks.testGrant = testGrant; if (!testGrant) mocks.credits = [{ product: "PRO" }];
    const started = vi.fn(); render(<ApplicationCaseHandoff guest={{ ...draft, selectedProduct: testGrant ? "FINAL" : "PRO" }} onCreditRunStarted={started} />); await ready();
    const button = await screen.findByRole("button", { name: testGrant ? /테스트 이용권으로 분석 시작/ : /무료 이용권으로 분석 시작/ });
    fireEvent.click(button); fireEvent.click(button); await waitFor(() => expect(started).toHaveBeenCalledWith(runId));
    expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(mocks.rpc).toHaveBeenCalledWith(testGrant ? "consume_admin_test_grant" : "consume_reward_credit", expect.anything());
    expect(mocks.fetch.mock.calls.some(([url]) => String(url).includes("checkouts"))).toBe(false);
  });
  it("blocks recovered purchases until delivery choice and on stale account", async () => {
    mocks.play = true; mocks.panelReady = false; mocks.recovered = [{ purchaseToken: "private-mock", analysisRunId: runId }];
    render(<ApplicationCaseHandoff guest={draft} />); const recovered = await screen.findByRole("button", { name: "이 결제로 분석 시작" });
    fireEvent.click(recovered); expect(mocks.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이용 방식 선택" }));
    mocks.getUser.mockResolvedValue({ data: { user: { ...user, id: "other" } }, error: null });
    fireEvent.click(recovered); await screen.findByText(/로그인 계정이 바뀌었거나/); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("locks saved retry when a run becomes active", async () => {
    const view = render(<ApplicationCaseHandoff guest={draft} />); await ready(); fireEvent.click(pay()); await screen.findByText("결제 준비 실패");
    view.rerender(<ApplicationCaseHandoff guest={draft} runActive />); expect((pay() as HTMLButtonElement).disabled).toBe(true);
  });
});

it("rechecks the account after saving before consuming a credit", async () => {
  mocks.credits = [{ product: "PRO" }];
  mocks.fetch.mockImplementation(async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { ...user, id: "different-after-save" } }, error: null });
    return { ok: true, json: async () => ({ applicationCaseId: caseId, analysisRunId: runId }) };
  });
  render(<ApplicationCaseHandoff guest={draft} />); await ready(); fireEvent.click(await screen.findByRole("button", { name: /무료 이용권으로 분석 시작/ }));
  await screen.findByText(/로그인 계정이 바뀌었거나/); expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each(["google", "email"])("preserves existing %s checkout without a new social choice", async (provider) => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: user.id, email: "verified@example.test", email_confirmed_at: "2026-11-11", app_metadata: { provider } } }, error: null });
  render(<ApplicationCaseHandoff guest={draft} />); await ready(); fireEvent.click(pay()); await screen.findByText("결제 준비 실패");
  expect(mocks.fetch).toHaveBeenCalledWith("/api/checkouts/pro", expect.anything());
});

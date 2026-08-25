import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824080000_referrals.sql", "utf8");

describe("추천 마이그레이션", () => {
  it("입력만으로는 아무것도 지급하지 않는다", () => {
    // apply_referral_code writes an intention. The only place a credit is
    // minted is the settle function, which needs a paid order.
    const applyBody = migration.slice(migration.indexOf("function public.apply_referral_code"), migration.indexOf("function public.settle_referral_for_order"));
    expect(applyBody).not.toContain("insert into public.reward_credits");
    expect(applyBody).toContain("'status', 'PENDING'");
  });

  it("실제로 돈이 오간 주문에만 지급한다", () => {
    expect(migration).toContain("paid_order.status <> 'PAID'");
    // A free run is the same loophole in a different coat.
    expect(migration).toContain("paid_order.amount <= 0 or paid_order.provider <> 'POLAR'");
  });

  it("본인 코드를 쓸 수 없다", () => {
    expect(migration).toContain("REFERRAL_SELF");
    expect(migration).toContain("check (referred_user_id <> referrer_user_id)");
  });

  it("한 사람은 평생 한 번만 추천받는다", () => {
    expect(migration).toContain("referred_user_id uuid primary key");
    expect(migration).toContain("on conflict (referred_user_id) do nothing");
    expect(migration).toContain("REFERRAL_ALREADY_USED");
  });

  it("첫 결제에만 적용된다", () => {
    expect(migration).toContain("REFERRAL_NOT_FIRST_PURCHASE");
    expect(migration).toContain("from public.billing_orders where owner_user_id = current_user_id and status = 'PAID'");
  });

  it("웹훅이 두 번 와도 이용권은 한 장이다", () => {
    expect(migration).toContain("reward_credit_id uuid unique");
    expect(migration).toContain("status = 'PENDING'");
    expect(migration).toContain("for update");
  });

  it("코드는 서버가 만든다", () => {
    // A client-supplied code is a client-chosen code, and someone would pick
    // their friend's.
    expect(migration).toContain("function public.get_or_create_referral_code()");
    expect(migration).not.toContain("get_or_create_referral_code(p_code");
    expect(migration).toContain("exception when unique_violation then");
  });

  it("정산은 브라우저에서 부를 수 없다", () => {
    expect(migration).toContain("revoke all on function public.settle_referral_for_order(uuid) from public");
    expect(migration).toContain("grant execute on function public.settle_referral_for_order(uuid) to service_role");
    expect(migration).not.toContain("settle_referral_for_order(uuid) to authenticated");
  });

  it("남이 추천한 내역을 훔쳐볼 수 없다", () => {
    expect(migration).toContain('using ((select auth.uid()) = referrer_user_id)');
    expect(migration).not.toContain("= referred_user_id)");
  });
});

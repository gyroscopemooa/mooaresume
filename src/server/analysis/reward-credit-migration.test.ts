import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824040000_reward_credits.sql", "utf8");
const billing = readFileSync("supabase/migrations/20260817010000_polar_orders_and_entitlements.sql", "utf8");

describe("보상 이용권 마이그레이션", () => {
  it("무료 지급을 결제 주문과 구분해 기록한다", () => {
    // The entitlement table requires a billing order, and writing a free grant
    // as a POLAR order would put an invented order id beside real ones.
    expect(billing).toContain("check (provider = 'POLAR')");
    expect(migration).toContain("check (provider in ('POLAR', 'MOOA_CREDIT'))");
    expect(migration).toContain("'MOOA_CREDIT', 'credit:' || credit.id::text");
  });

  it("쿠폰번호가 아니라 1회용 링크로만 전달된다", () => {
    expect(migration).toContain("claim_token text not null unique");
    expect(migration).toContain("char_length(claim_token) between 20 and 64");
  });

  it("받는 메일 주소와 로그인 계정이 달라도 된다", () => {
    // The signup arrives from naver, the sign-in is Google. Matching on the
    // address alone would strand exactly those people.
    expect(migration).toContain("recipient_email text not null");
    expect(migration).toContain("owner_user_id uuid references auth.users(id)");
    expect(migration).toContain("set status = 'AVAILABLE', owner_user_id = current_user_id");
  });

  it("상태마다 무엇이 있어야 하는지 DB가 강제한다", () => {
    expect(migration).toContain("status = 'UNCLAIMED' and owner_user_id is null");
    expect(migration).toContain("status = 'AVAILABLE' and owner_user_id is not null");
    expect(migration).toContain("status = 'CONSUMED' and owner_user_id is not null and billing_order_id is not null");
  });

  it("같은 사람이 두 번 열어도 오류가 아니다", () => {
    // Mail clients prefetch links and people reopen tabs; treating that as an
    // error would tell them their credit is gone when it is not.
    expect(migration).toContain("elsif credit.owner_user_id is distinct from current_user_id then");
    expect(migration).toContain("'alreadyClaimed', credit.status <> 'UNCLAIMED'");
  });

  it("한 이용권으로 두 번 분석하지 못한다", () => {
    expect(migration).toContain("ACTIVE_ENTITLEMENT_EXISTS");
    expect(migration).toContain("for update skip locked limit 1");
    expect(migration).toContain("set status = 'CONSUMED', billing_order_id = order_id");
    expect(migration).toContain("billing_order_id uuid unique references public.billing_orders(id)");
  });

  it("기간이 지난 이용권은 열리는 순간 막힌다", () => {
    expect(migration).toContain("REWARD_CREDIT_EXPIRED");
    expect(migration).toContain("expires_at <= timezone('utc', now())");
    expect(migration).toContain("(expires_at is null or expires_at > timezone('utc', now()))");
  });

  it("무료 실행도 유료와 같은 분량 상한을 받는다", () => {
    // Without this a free credit would analyse more text than a paid run.
    expect(migration).toContain("allowed_characters integer not null check (allowed_characters > 0)");
    expect(migration).toContain("p_product, credit.allowed_characters");
  });

  it("상태 변경은 전부 함수를 거친다", () => {
    expect(migration).toContain('create policy "reward credit owner read" on public.reward_credits for select');
    expect(migration).not.toContain("for insert to authenticated");
    expect(migration).not.toContain("for update to authenticated");
    for (const fn of ["claim_reward_credit(text)", "consume_reward_credit(uuid, text)"]) {
      expect(migration).toContain(`revoke all on function public.${fn} from public`);
      expect(migration).toContain(`grant execute on function public.${fn} to authenticated`);
    }
  });

  it("남의 지원서에 이용권을 쓸 수 없다", () => {
    expect(migration).toContain("if case_owner_id is null or case_owner_id <> current_user_id then");
  });
});

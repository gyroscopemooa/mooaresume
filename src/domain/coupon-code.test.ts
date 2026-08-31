import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260901010000_partner_coupon_codes.sql", "utf8");
const entry = readFileSync("src/components/coupon-code-entry.tsx", "utf8");
const pamphlet = readFileSync("src/app/meensoo/coupons/coupon-pamphlet.tsx", "utf8");

describe("협업 쿠폰 코드", () => {
  it("기존 이용권 테이블을 바꾸지 않는다", () => {
    // The credit table carries money states and a check constraint over them.
    // The coupon is a layer in front: claiming writes one ordinary row and every
    // later path — spend, refund, expiry — stays exactly as it was.
    expect(migration).not.toContain("alter table public.reward_credits");
    expect(migration).toContain("insert into public.reward_credits");
  });

  it("1인 1회를 문구가 아니라 규칙으로 막는다", () => {
    expect(migration).toContain("primary key (coupon_code_id, owner_user_id)");
    expect(migration).toContain("COUPON_ALREADY_CLAIMED");
  });

  it("수량과 기간을 각각 막는다", () => {
    for (const guard of ["COUPON_EXHAUSTED", "COUPON_EXPIRED", "COUPON_NOT_STARTED", "COUPON_REVOKED"]) {
      expect(migration, guard).toContain(guard);
    }
    expect(migration).toContain("claimed_count >= coupon.total_count");
  });

  it("동시에 눌러도 수량을 넘기지 않는다", () => {
    // Without the row lock two claims read the same count and both pass.
    expect(migration).toContain("for update");
    expect(migration).toContain("check (claimed_count <= total_count)");
  });

  it("코드 목록은 아무에게도 열지 않는다", () => {
    // A readable list is a list of working codes.
    expect(migration).toContain("alter table public.coupon_codes enable row level security");
    expect(migration).not.toContain('create policy "coupon codes');
  });

  it("왜 안 되는지를 각각 다르게 말한다", () => {
    // One "사용할 수 없는 코드" cannot tell a typo from an expired batch, and the
    // next step is different for each.
    for (const reason of ["없는 코드입니다", "사용 기간이 지난", "모두 사용되었습니다", "이미 사용하신"]) {
      expect(entry, reason).toContain(reason);
    }
  });

  it("추천코드와 섞이지 않는다", () => {
    // They read alike and do the opposite: a referral pays the referrer after a
    // purchase, a coupon pays the person typing it immediately.
    expect(entry).toContain("claim_coupon_code");
    expect(entry).not.toContain("apply_referral_code");
  });

  it("팜플렛은 생성 AI를 쓰지 않는다", () => {
    // A leaflet is a template, not a picture: image models garble Korean, and a
    // coupon code that is one character off is unusable.
    expect(pamphlet).toContain("<svg");
    expect(pamphlet).not.toContain("api.openai.com");
    expect(pamphlet).toContain("canvas.toDataURL");
  });
});

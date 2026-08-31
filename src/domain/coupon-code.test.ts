import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCouponCsv, generateCouponCodes } from "./coupon-code";

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

describe("코드 생성", () => {
  it("헷갈리는 글자를 쓰지 않는다", () => {
    // 0/O and 1/I/L are where "코드가 안 먹혀요" comes from: on paper, in most
    // fonts, they are the same shape.
    const codes = generateCouponCodes(200, "YOUTH");
    for (const code of codes) {
      expect(code.replace(/^YOUTH-/, ""), code).not.toMatch(/[OIL01]/);
    }
  });

  it("겹치지 않는다", () => {
    // A duplicate fails the unique constraint and takes the whole batch with it.
    const codes = generateCouponCodes(500, "");
    expect(new Set(codes).size).toBe(500);
  });

  it("접두어를 붙여 어느 캠페인인지 보이게 한다", () => {
    expect(generateCouponCodes(3, "youth 재단!")[0]).toMatch(/^YOUTH-/);
  });

  it("만들 수 없으면 만들었다고 하지 않는다", () => {
    // Silently returning fewer than asked would hand a partner a short list.
    expect(() => generateCouponCodes(3, "", () => 0)).toThrow();
  });

  it("CSV는 엑셀에서 한글이 깨지지 않는다", () => {
    // Without the BOM the recipient opens the file and sees mojibake, which is
    // the most common way this feature fails.
    const csv = buildCouponCsv([{ code: "A-B", status: "미사용", claimedAt: null }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"쿠폰코드","상태","사용일시"');
    expect(csv).toContain('"A-B","미사용",""');
  });
});

describe("메일 발송 기록", () => {
  const sender = readFileSync("src/server/notifications/manual-email.ts", "utf8");
  const repo = readFileSync("src/server/admin/admin-repository.ts", "utf8");
  const history = readFileSync("src/app/meensoo/mail/history/page.tsx", "utf8");

  it("보낸 메일을 실패로 기록하지 않는다", () => {
    // The id lives in the response body. If reading it throws, the outer catch
    // files an already-delivered mail under 실패 — which is worse than having no
    // id at all.
    expect(sender).toContain("sent.push(to);");
    const success = sender.slice(sender.indexOf("sent.push(to);"), sender.indexOf("} else {"));
    expect(success).toContain("try {");
    expect(success).toContain("} catch {");
  });

  it("제공자 식별자와 캠페인을 함께 남긴다", () => {
    // Our log ends at "handed it over". Delivery lives in Resend, and this id is
    // the only thing joining the two.
    expect(repo).toContain("provider_message_id: input.providerMessageIds?.[recipient] ?? null");
    expect(repo).toContain("campaign_id: input.campaignId ?? null");
    expect(history).toContain("entry.providerMessageId");
  });

  it("실패한 줄에는 식별자를 붙이지 않는다", () => {
    expect(repo).toContain('status: "FAILED", error_message: item.error.slice(0, 500), provider_message_id: null');
  });
});

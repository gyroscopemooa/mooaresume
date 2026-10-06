import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261007010000_admin_account_deletion_requests.sql", "utf8");

describe("admin account deletion migration", () => {
  it("요청 표를 클라이언트에서 읽지 못하게 하고 서비스 역할만 허용한다", () => {
    expect(sql).toContain("alter table public.account_deletion_requests enable row level security");
    expect(sql).toContain("revoke all on public.account_deletion_requests from public, anon, authenticated");
    expect(sql).toContain("grant all on public.account_deletion_requests to service_role");
  });

  it("Auth 밖의 이메일 기록과 LIVE-SUB 연락처도 정리한다", () => {
    expect(sql).toContain("update public.livesub_reward_grants");
    expect(sql).toContain("delete from public.waitlist_signups");
    expect(sql).toContain("delete from public.contact_inquiries");
    expect(sql).toContain("delete from public.mail_send_log");
  });

  it("결제 원장을 먼저 분리 보관한 뒤 Auth 사용자를 삭제한다", () => {
    expect(sql.indexOf("insert into public.billing_records_retained")).toBeLessThan(sql.indexOf("delete from auth.users"));
    expect(sql).toContain("retain_until");
  });
});

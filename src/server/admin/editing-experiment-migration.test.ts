import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync("supabase/migrations/20261007020000_admin_editing_experiments.sql", "utf8");
describe("관리자 실험 저장소 보호", () => {
  it("일반 사용자 접근과 같은 사본 중복 시험을 막는다", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.admin_editing_experiments from anon, authenticated");
    expect(sql).toContain("unique (snapshot_id, mode, protocol_version)");
  });
  it("동의·사본의 소유자와 버전을 쓰기 시점에 재확인한다", () => {
    expect(sql).toContain("c.consent_version = new.consent_version for share");
    expect(sql).toContain("s.owner_user_id = new.owner_user_id and s.analysis_run_id = new.analysis_run_id");
  });
  it("철회·동의 삭제·버전 변경과 사본 삭제에 실험도 삭제", () => {
    expect(sql).toContain("references public.research_snapshots(id) on delete cascade");
    expect(sql).toContain("after update or delete on public.research_consents");
    expect(sql).toContain("new.consent_version is distinct from old.consent_version");
  });
  it("고객 결과·결제 테이블을 수정하지 않는다", () => {
    expect(sql).not.toMatch(/(?:update|insert into|delete from) public\.(?:analysis_results|billing_orders|entitlements)/i);
  });
});

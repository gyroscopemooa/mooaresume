import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824060000_research_snapshots.sql", "utf8");
const consent = readFileSync("supabase/migrations/20260824050000_research_consent.sql", "utf8");

describe("연구용 사본 마이그레이션", () => {
  it("동의 확인이 SQL 안에 있다", () => {
    // The check cannot live in application code: a caller can be wrong, and
    // collection has to have exactly one door with the lock on this side.
    expect(migration).toContain("if not public.has_research_consent(p_owner_user_id, p_consent_version) then");
    expect(migration).toContain("return 'NO_CONSENT';");
  });

  it("한 실행에 사본 하나 — 재시도해도 쌓이지 않는다", () => {
    expect(migration).toContain("analysis_run_id uuid not null unique");
    expect(migration).toContain("on conflict (analysis_run_id) do update");
  });

  it("철회하면 보관 중이던 것도 지운다", () => {
    // "이후로는 활용하지 않습니다"는 약한 약속입니다. 그때까지 모은 것이
    // 그대로 남아 있다면 권한을 되찾은 것이 아닙니다.
    expect(consent).not.toContain("delete from public.research_snapshots");
    expect(migration).toContain("delete from public.research_snapshots where owner_user_id = current_user_id");
    expect(migration).toContain("'deletedSnapshots', removed");
  });

  it("브라우저에서는 아무도 못 읽는다", () => {
    expect(migration).toContain("alter table public.research_snapshots enable row level security");
    expect(migration).not.toContain("create policy \"research snapshot");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke all on function public.capture_research_snapshot");
  });

  it("보관하는 것이 가려진 사본임을 컬럼 이름이 말한다", () => {
    expect(migration).toContain("redacted_original text not null");
    expect(migration).toContain("redacted_revised text not null");
    expect(migration).toContain("redaction_summary jsonb not null");
  });

  it("계정이 지워지면 사본도 따라 지워진다", () => {
    expect(migration).toContain("owner_user_id uuid not null references auth.users(id) on delete cascade");
    expect(migration).toContain("analysis_run_id uuid not null unique references public.analysis_runs(id) on delete cascade");
  });
});

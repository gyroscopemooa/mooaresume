import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260824050000_research_consent.sql", "utf8");

describe("연구 활용 동의 마이그레이션", () => {
  it("동의는 옵트인이다 — 행이 없으면 동의하지 않은 것", () => {
    // No default row and no default true anywhere: absence has to mean no.
    expect(migration).toContain("granted boolean not null");
    expect(migration).not.toContain("granted boolean not null default true");
  });

  it("철회가 동의만큼 쉽다", () => {
    // One function for both directions. Granting by button and withdrawing by
    // support ticket is not offering a choice.
    expect(migration).toContain("set_research_consent(p_granted boolean");
    expect(migration).toContain("grant execute on function public.set_research_consent(boolean, text) to authenticated");
  });

  it("동의한 문구의 버전을 함께 남긴다", () => {
    expect(migration).toContain("consent_version text not null");
  });

  it("문구가 바뀌면 예전 동의는 자동으로 통과하지 않는다", () => {
    // has_research_consent takes the current wording rather than reading the
    // stored one, so a copy change fails closed.
    expect(migration).toContain("has_research_consent(p_owner_user_id uuid, p_consent_version text)");
    expect(migration).toContain("and rc.consent_version = p_consent_version");
  });

  it("상태와 시각이 어긋나지 않게 DB가 막는다", () => {
    expect(migration).toContain("(granted and granted_at is not null and revoked_at is null)");
    expect(migration).toContain("(not granted and revoked_at is not null)");
  });

  it("본인 것만 읽을 수 있고 쓰기는 함수를 거친다", () => {
    expect(migration).toContain('create policy "research consent owner read" on public.research_consents for select');
    expect(migration).not.toContain("for insert to authenticated");
    expect(migration).not.toContain("for update to authenticated");
  });

  it("동의 여부 조회는 서버만 할 수 있다", () => {
    expect(migration).toContain("revoke all on function public.has_research_consent(uuid, text) from public");
    expect(migration).toContain("grant execute on function public.has_research_consent(uuid, text) to service_role");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260901050000_community_lounge.sql", "utf8");
const rateLimitMigration = readFileSync("supabase/migrations/20260903090000_community_rate_limits.sql", "utf8");
const lockedRateLimitMigration = readFileSync("supabase/migrations/20260903110000_lock_community_rate_limit_rules.sql", "utf8");

describe("community lounge migration", () => {
  it("keeps attachments private and readable only to signed-in members", () => {
    expect(migration).toContain("'community-attachments','community-attachments',false");
    expect(migration).toContain('signed in members read published community attachments');
    expect(migration).not.toContain('on storage.objects for select to anon');
  });
  it("enables RLS and keeps one recommendation per member per post", () => {
    expect(migration).toContain("alter table public.community_posts enable row level security");
    expect(migration).toContain("alter table public.community_comments enable row level security");
    expect(migration).toContain("primary key (post_id, owner_user_id)");
    expect(migration).toContain("community_reports");
  });
});
describe("community rate limits", () => {
  it("uses an authenticated, atomic database counter", () => {
    expect(rateLimitMigration).toContain("community_rate_limit_windows");
    expect(rateLimitMigration).toContain("take_community_rate_limit");
    expect(rateLimitMigration).toContain("grant execute on function public.take_community_rate_limit(text, integer, integer) to authenticated");
    expect(lockedRateLimitMigration).toContain("drop function public.take_community_rate_limit(text, integer, integer)");
    expect(lockedRateLimitMigration).toContain("when 'POST_CREATE' then v_limit := 5");
    expect(lockedRateLimitMigration).toContain("grant execute on function public.take_community_rate_limit(text) to authenticated");
  });
});
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260901050000_community_lounge.sql", "utf8");
const rateLimitMigration = readFileSync("supabase/migrations/20260903090000_community_rate_limits.sql", "utf8");
const lockedRateLimitMigration = readFileSync("supabase/migrations/20260903110000_lock_community_rate_limit_rules.sql", "utf8");
const relaxedPostRateLimitMigration = readFileSync("supabase/migrations/20260903120000_relax_community_post_rate_limit.sql", "utf8");
const attachmentPostRateLimitMigration = readFileSync("supabase/migrations/20260904020000_attachment_post_rate_limit.sql", "utf8");

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
    expect(relaxedPostRateLimitMigration).toContain("when 'POST_CREATE' then v_limit := 20; v_window_seconds := 3600");
  });

  it("adds a once-a-day limit for posts with attachments, without a second RPC", () => {
    // 이전에는 존재하지 않는 take_community_attachment_post_limit RPC를 불러
    // 첨부 있는 글이 첫 시도부터 항상 실패했습니다. 새 함수를 만드는 대신
    // 기존 take_community_rate_limit(p_action)에 case 하나만 더합니다.
    expect(attachmentPostRateLimitMigration).toContain("when 'ATTACHMENT_POST' then v_limit := 1; v_window_seconds := 86400");
    // 기존 액션의 한도는 그대로 유지됩니다 — 재정의가 실수로 다른 값을
    // 덮어쓰지 않았는지 확인합니다.
    expect(attachmentPostRateLimitMigration).toContain("when 'POST_CREATE' then v_limit := 20; v_window_seconds := 3600");
    expect(attachmentPostRateLimitMigration).toContain("when 'COMMENT_CREATE' then v_limit := 20; v_window_seconds := 3600");
    expect(attachmentPostRateLimitMigration).toContain("when 'REPORT_CREATE' then v_limit := 10; v_window_seconds := 86400");
    expect(attachmentPostRateLimitMigration).toContain("when 'UPLOAD' then v_limit := 12; v_window_seconds := 3600");
    expect(attachmentPostRateLimitMigration).toContain("when 'RECOMMEND' then v_limit := 60; v_window_seconds := 60");
    expect(attachmentPostRateLimitMigration).not.toContain("take_community_attachment_post_limit");
    expect(attachmentPostRateLimitMigration).toContain("grant execute on function public.take_community_rate_limit(text) to authenticated");
  });
});
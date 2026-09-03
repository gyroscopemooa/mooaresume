import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const enumMigration = readFileSync("supabase/migrations/20260903100000_document_kind_certificate.sql", "utf8");
const fnMigration = readFileSync("supabase/migrations/20260903100100_certificate_evidence.sql", "utf8");

describe("자격·증명서 마이그레이션", () => {
  it("타입 추가는 트랜잭션 밖에서 하고 여러 번 실행해도 안전하다", () => {
    // 같은 트랜잭션 안에서는 방금 더한 값을 쓸 수 없습니다.
    expect(enumMigration).toContain("add value if not exists 'CERTIFICATE'");
    expect(enumMigration).not.toContain("begin;");
  });

  it("증빙은 이력서 바로 다음에 선다", () => {
    // 맨 뒤에 서면 자료를 많이 넣을수록 먼저 잘립니다.
    expect(fnMigration).toContain("when 'RESUME' then 2");
    expect(fnMigration).toContain("when 'CERTIFICATE' then 3");
  });

  it("모델에게 제 이름으로 전달한다", () => {
    // 예전에는 'portfolio'였습니다. 증빙이 작품집으로 소개되고 있었습니다.
    expect(fnMigration).toContain("when 'CERTIFICATE' then 'certificate'");
  });

  it("기존 갈래의 이름은 그대로다", () => {
    for (const line of [
      "when 'COVER_LETTER' then 'cover_letter'",
      "when 'JOB_POSTING' then 'job_posting'",
      "when 'RESUME' then 'resume'",
      "when 'CAREER_DOCUMENT' then 'career_description'",
      "when 'PORTFOLIO' then 'portfolio'",
    ]) expect(fnMigration).toContain(line);
  });

  it("OTHER가 PRO·FINAL에서 계속 보인다", () => {
    // 이 줄을 잃으면 기타 증빙이 통째로 사라집니다.
    expect(fnMigration).toContain("d.kind not in ('OTHER', 'REVISION_REQUEST') or target_run.product in ('PRO', 'FINAL')");
  });
});

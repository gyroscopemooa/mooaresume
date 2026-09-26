import { describe, expect, it } from "vitest";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import { MemoryPackRepository, makeRun } from "./memory-repository";
import { shouldShowInterviewPackTab } from "./visibility";

const OWNER = "11111111-1111-4111-8111-111111111111";
const RUN = "22222222-2222-4222-8222-222222222222";
const docs = getPackSample("complete")!.docs;

function repoWith(accessSource: "polar" | "admin_test", completedAt = "2026-09-27T00:00:00.000Z") {
  const repo = new MemoryPackRepository();
  repo.addRun(RUN, makeRun({ ownerUserId: OWNER, docs, accessSource, completedAt }));
  return repo;
}

const base = { product: "FINAL", analysisRunId: RUN, isSample: false, userId: OWNER, email: "user@example.com", isAdmin: false };

describe("면접 준비팩 탭 노출(서버 판정)", () => {
  it("플래그도 승인 계정도 없으면 어떤 조회도 하지 않고 숨긴다", async () => {
    const repo = repoWith("polar");
    expect(await shouldShowInterviewPackTab({ ...base, repo, env: {} })).toBe(false);
  });

  it("FINAL 이 아니거나 샘플이거나 로그인하지 않았으면 숨긴다", async () => {
    const env = { NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1", INTERVIEW_PACK_ELIGIBLE_FROM: "all" };
    const repo = repoWith("polar");
    expect(await shouldShowInterviewPackTab({ ...base, product: "PRO", repo, env })).toBe(false);
    expect(await shouldShowInterviewPackTab({ ...base, isSample: true, repo, env })).toBe(false);
    expect(await shouldShowInterviewPackTab({ ...base, userId: null, repo, env })).toBe(false);
    expect(await shouldShowInterviewPackTab({ ...base, analysisRunId: null, repo, env })).toBe(false);
  });

  it("공개 플래그가 켜져 있어도 정책이 닫혀 있으면 실제 구매 건에는 보이지 않는다(소급 금지)", async () => {
    const repo = repoWith("polar");
    expect(await shouldShowInterviewPackTab({ ...base, repo, env: { NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1" } })).toBe(false);
    expect(await shouldShowInterviewPackTab({ ...base, repo, env: { NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1", INTERVIEW_PACK_ELIGIBLE_FROM: "all" } })).toBe(true);
    expect(await shouldShowInterviewPackTab({ ...base, repo, env: { NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1", INTERVIEW_PACK_ELIGIBLE_FROM: "2026-10-01T00:00:00Z" } })).toBe(false);
  });

  it("플래그가 꺼져 있으면 실제 구매 건에는 승인된 테스트 계정이라도 보이지 않는다", async () => {
    const repo = repoWith("polar");
    expect(await shouldShowInterviewPackTab({ ...base, email: "tester@example.com", repo, env: { FINAL_TEST_ACCOUNT_EMAILS: "tester@example.com", INTERVIEW_PACK_ELIGIBLE_FROM: "all" } })).toBe(false);
  });

  it("테스트 이용권 결과는 승인된 테스트 계정에게만 보이고, 플래그·정책과 무관하다", async () => {
    const repo = repoWith("admin_test");
    const env = { FINAL_TEST_ACCOUNT_EMAILS: "tester@example.com" };
    expect(await shouldShowInterviewPackTab({ ...base, email: "tester@example.com", repo, env })).toBe(true);
    expect(await shouldShowInterviewPackTab({ ...base, email: "other@example.com", repo, env })).toBe(false);
    expect(await shouldShowInterviewPackTab({ ...base, email: "tester@example.com", repo, env: { ...env, NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1" } })).toBe(true);
    expect(await shouldShowInterviewPackTab({ ...base, email: "other@example.com", repo, env: { ...env, NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1" } })).toBe(false);
  });

  it("남의 결과나 DB 오류에도 화면이 깨지지 않고 숨긴다", async () => {
    const repo = repoWith("polar");
    const env = { NEXT_PUBLIC_ENABLE_INTERVIEW_PACK: "1", INTERVIEW_PACK_ELIGIBLE_FROM: "all" };
    expect(await shouldShowInterviewPackTab({ ...base, userId: "99999999-9999-4999-8999-999999999999", repo, env })).toBe(false);
    repo.getRunAccess = async () => { throw new Error("db down"); };
    expect(await shouldShowInterviewPackTab({ ...base, repo, env })).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  processGrantReward,
  resolveDeployEnvironment,
  signGrantRequest,
  type GrantOutcome,
  type RewardGrantInput,
  type RewardGrantRepository,
} from "./grant-reward";

const SECRET = "test-secret-not-real";
const NOW = 1_800_000_000;

const baseBody = {
  submissionId: "sub-1",
  appKey: "mooaresume",
  campaignId: "sns-review",
  environment: "production",
  contact: "abc@gmail.com",
  rewardCode: "QUICK",
};

/** DB 함수의 동작(멱등·가입자 없음)을 흉내 낸다. 실제 SQL은 아래 마이그레이션 테스트가 지킨다. */
function fakeRepository(users: string[]) {
  const processed = new Set<string>();
  const credits: RewardGrantInput[] = [];
  const repository: RewardGrantRepository = {
    async grant(input): Promise<GrantOutcome> {
      if (processed.has(input.submissionId)) return "DUPLICATE";
      if (!users.includes(input.contact.toLowerCase())) return "NO_USER";
      processed.add(input.submissionId);
      credits.push(input);
      return "GRANTED";
    },
  };
  return { repository, credits };
}

function run(overrides: {
  body?: Record<string, unknown>;
  rawBody?: string;
  timestamp?: number;
  signWith?: string;
  signature?: string | null;
  repository?: RewardGrantRepository;
  secret?: string | undefined;
  deployEnvironment?: "development" | "staging" | "production";
}) {
  const rawBody = overrides.rawBody ?? JSON.stringify({ ...baseBody, ...overrides.body });
  const timestamp = String(overrides.timestamp ?? NOW);
  const signature = overrides.signature === undefined ? signGrantRequest(overrides.signWith ?? SECRET, timestamp, rawBody) : overrides.signature;
  return processGrantReward({
    rawBody,
    timestampHeader: timestamp,
    signatureHeader: signature,
    secret: "secret" in overrides ? overrides.secret : SECRET,
    nowSeconds: NOW,
    deployEnvironment: overrides.deployEnvironment ?? "production",
    repository: overrides.repository ?? fakeRepository(["abc@gmail.com"]).repository,
  });
}

describe("grant-reward", () => {
  it("올바른 서명이면 지급하고 ok:true", async () => {
    const { repository, credits } = fakeRepository(["abc@gmail.com"]);
    const result = await run({ repository });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(credits).toEqual([{ submissionId: "sub-1", campaignId: "sns-review", environment: "production", contact: "abc@gmail.com", rewardCode: "QUICK" }]);
  });

  it("서명이 다르면 401이고 DB를 건드리지 않는다", async () => {
    const grant = vi.fn();
    const result = await run({ signWith: "other-secret", repository: { grant } });
    expect(result.status).toBe(401);
    expect(grant).not.toHaveBeenCalled();
  });

  it("서명 헤더가 없거나 본문이 서명 뒤에 바뀌어도 거절한다", async () => {
    const grant = vi.fn();
    expect((await run({ signature: null, repository: { grant } })).status).toBe(401);
    const signed = JSON.stringify(baseBody);
    const tampered = signed.replace("QUICK", "PRO");
    const timestamp = String(NOW);
    const result = await processGrantReward({
      rawBody: tampered,
      timestampHeader: timestamp,
      signatureHeader: signGrantRequest(SECRET, timestamp, signed),
      secret: SECRET,
      nowSeconds: NOW,
      deployEnvironment: "production",
      repository: { grant },
    });
    expect(result.status).toBe(401);
    expect(grant).not.toHaveBeenCalled();
  });

  it("서명이 맞아도 5분보다 오래된(또는 먼 미래의) timestamp는 401", async () => {
    const grant = vi.fn();
    expect((await run({ timestamp: NOW - 301, repository: { grant } })).status).toBe(401);
    expect((await run({ timestamp: NOW + 301, repository: { grant } })).status).toBe(401);
    expect(grant).not.toHaveBeenCalled();
    expect((await run({ timestamp: NOW - 299 })).status).toBe(200);
  });

  it("모르는 rewardCode는 400", async () => {
    const grant = vi.fn();
    const result = await run({ body: { rewardCode: "FINAL" }, repository: { grant } });
    expect(result.status).toBe(400);
    expect(grant).not.toHaveBeenCalled();
  });

  it("staging 요청이 production 배포에 지급되지 않는다", async () => {
    const grant = vi.fn();
    const result = await run({ body: { environment: "staging" }, deployEnvironment: "production", repository: { grant } });
    expect(result.status).toBe(400);
    expect(grant).not.toHaveBeenCalled();
  });

  it("appKey가 다르면 400", async () => {
    const grant = vi.fn();
    expect((await run({ body: { appKey: "other" }, repository: { grant } })).status).toBe(400);
    expect(grant).not.toHaveBeenCalled();
  });

  it("같은 submissionId는 한 번만 지급하고 두 번째도 ok:true", async () => {
    const { repository, credits } = fakeRepository(["abc@gmail.com"]);
    expect((await run({ repository })).body).toEqual({ ok: true });
    expect((await run({ repository })).body).toEqual({ ok: true });
    expect(credits).toHaveLength(1);
  });

  it("가입자가 없으면 404와 사유, 지급 없음", async () => {
    const { repository, credits } = fakeRepository([]);
    const result = await run({ repository });
    expect(result).toEqual({ status: 404, body: { ok: false, message: "가입자 없음: abc@gmail.com" } });
    expect(credits).toHaveLength(0);
  });

  it("비밀값이 설정되지 않으면 어떤 요청도 받지 않는다", async () => {
    const grant = vi.fn();
    expect((await run({ secret: undefined, repository: { grant } })).status).toBe(503);
    expect(grant).not.toHaveBeenCalled();
  });

  it("DB 오류는 500이지만 비밀값·내부 사유를 응답에 싣지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await run({ repository: { grant: async () => { throw new Error("secret-leak-check"); } } });
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain("secret-leak-check");
    expect(JSON.stringify(result.body)).not.toContain(SECRET);
  });
});

describe("배포 환경 판별", () => {
  it("HQ_GRANT_ENVIRONMENT가 우선이고 없으면 POLAR_SERVER를 따른다", () => {
    expect(resolveDeployEnvironment({ HQ_GRANT_ENVIRONMENT: "staging", POLAR_SERVER: "production" })).toBe("staging");
    expect(resolveDeployEnvironment({ POLAR_SERVER: "production" })).toBe("production");
    expect(resolveDeployEnvironment({ POLAR_SERVER: "sandbox" })).toBe("staging");
    expect(resolveDeployEnvironment({})).toBe("staging");
  });
});

describe("livesub_reward_grants 마이그레이션", () => {
  const sql = readFileSync("supabase/migrations/20260925010000_livesub_reward_grants.sql", "utf8");

  it("submission_id가 기본키이고 충돌 시 아무것도 하지 않는다", () => {
    expect(sql).toContain("submission_id text primary key");
    expect(sql).toContain("on conflict (submission_id) do nothing");
  });

  it("기존 reward_credits 경로를 재사용하고 이미 계정에 붙은 상태로 넣는다", () => {
    expect(sql).toContain("insert into public.reward_credits");
    expect(sql).toContain("'AVAILABLE'");
    expect(sql).not.toContain("insert into public.billing_orders");
  });

  it("가입자 조회가 멱등성 기록보다 먼저라 가입자 없음은 기록되지 않는다", () => {
    expect(sql.indexOf("from auth.users")).toBeLessThan(sql.indexOf("insert into public.livesub_reward_grants"));
  });

  it("서버(service_role)만 실행할 수 있고 브라우저 권한은 없다", () => {
    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("enable row level security");
  });
});

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const GRANT_REWARD_CODES = ["QUICK", "PRO"] as const;
export const GRANT_MAX_CLOCK_SKEW_SECONDS = 300;
const APP_KEY = "mooaresume";

export type GrantEnvironment = "development" | "staging" | "production";
export type GrantOutcome = "GRANTED" | "DUPLICATE" | "NO_USER";

export interface RewardGrantInput {
  submissionId: string;
  campaignId: string;
  environment: GrantEnvironment;
  contact: string;
  rewardCode: (typeof GRANT_REWARD_CODES)[number];
}

export interface RewardGrantRepository {
  grant(input: RewardGrantInput): Promise<GrantOutcome>;
}

export interface GrantRewardResult {
  status: number;
  body: { ok: true } | { ok: false; message: string };
}

const bodySchema = z.object({
  submissionId: z.string().trim().min(1).max(200),
  appKey: z.string(),
  campaignId: z.string().trim().min(1).max(200),
  environment: z.enum(["development", "staging", "production"]),
  contact: z.string().trim().min(3).max(254),
  rewardCode: z.string(),
});

const reject = (status: number, message: string): GrantRewardResult => ({ status, body: { ok: false, message } });

/** 서명은 본문 문자열 그대로(파싱 전) 계산한다. 이 값이 HQ와 같아야 한다. */
export function signGrantRequest(secret: string, timestamp: string, rawBody: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

function signatureMatches(expectedHex: string, receivedHex: string) {
  const expected = Buffer.from(expectedHex, "utf8");
  const received = Buffer.from(receivedHex.trim().toLowerCase(), "utf8");
  // timingSafeEqual 은 길이가 다르면 던진다. 길이 자체는 비밀이 아니다.
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * 이 배포가 어느 환경인지. HQ의 staging 요청이 production 에 지급되면 안 되므로
 * 요청이 주장하는 값이 아니라 배포 쪽 값과 비교한다.
 * HQ_GRANT_ENVIRONMENT 가 우선이고, 없으면 결제 서버 설정(POLAR_SERVER)을 따른다.
 */
export function resolveDeployEnvironment(env: Record<string, string | undefined> = process.env): GrantEnvironment {
  const explicit = env.HQ_GRANT_ENVIRONMENT?.trim().toLowerCase();
  if (explicit === "development" || explicit === "staging" || explicit === "production") return explicit;
  return env.POLAR_SERVER?.trim().toLowerCase() === "production" ? "production" : "staging";
}

export async function processGrantReward(input: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  secret: string | undefined;
  nowSeconds: number;
  deployEnvironment: GrantEnvironment;
  repository: RewardGrantRepository;
}): Promise<GrantRewardResult> {
  // 0) 비밀값이 없으면 어떤 요청도 받을 수 없다. 사유는 로그로만.
  if (!input.secret) return reject(503, "지급 기능이 설정되지 않았습니다.");

  // 1) 서명: 본문을 파싱하기 전에 rawBody 로 검증. DB·JSON 어느 것도 아직 건드리지 않는다.
  if (!input.timestampHeader || !input.signatureHeader) return reject(401, "인증 실패");
  const expected = signGrantRequest(input.secret, input.timestampHeader, input.rawBody);
  if (!signatureMatches(expected, input.signatureHeader)) return reject(401, "인증 실패");

  // 2) 신선도: 서명이 맞아도 오래된 요청은 재전송으로 본다.
  const timestamp = Number(input.timestampHeader);
  if (!/^\d+$/.test(input.timestampHeader) || !Number.isSafeInteger(timestamp)) return reject(401, "인증 실패");
  if (Math.abs(input.nowSeconds - timestamp) > GRANT_MAX_CLOCK_SKEW_SECONDS) return reject(401, "요청 시간이 만료되었습니다.");

  // 3) 본문 형식
  let json: unknown;
  try {
    json = JSON.parse(input.rawBody);
  } catch {
    return reject(400, "본문이 올바른 JSON이 아닙니다.");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return reject(400, "요청 형식이 올바르지 않습니다.");
  const body = parsed.data;

  if (body.appKey !== APP_KEY) return reject(400, "appKey가 일치하지 않습니다.");
  if (body.environment !== input.deployEnvironment) {
    return reject(400, `환경이 일치하지 않습니다. 이 서버는 ${input.deployEnvironment} 입니다.`);
  }

  // 4) 화이트리스트
  const rewardCode = GRANT_REWARD_CODES.find((code) => code === body.rewardCode);
  if (!rewardCode) return reject(400, `허용되지 않는 rewardCode: ${body.rewardCode}`);

  // 5~6) 멱등성 + 가입자 조회 + 지급은 DB 함수 한 번(한 트랜잭션)으로 처리한다.
  let outcome: GrantOutcome;
  try {
    outcome = await input.repository.grant({
      submissionId: body.submissionId,
      campaignId: body.campaignId,
      environment: body.environment,
      contact: body.contact,
      rewardCode,
    });
  } catch (caught) {
    console.error("livesub_grant_reward_failed", caught instanceof Error ? caught.message : "UNKNOWN_ERROR");
    return reject(500, "지급 처리 중 오류가 발생했습니다.");
  }

  if (outcome === "NO_USER") return reject(404, `가입자 없음: ${body.contact}`);
  return { status: 200, body: { ok: true } };
}

import { z } from "zod";

/**
 * A free analysis, held by an account rather than printed on a coupon.
 *
 * The coupon version leaks. A code that reaches one applicant reaches a forum
 * an hour later, and afterwards nobody can say who was given what or whether it
 * was used. A credit sits on an account: it cannot be forwarded, and every
 * question about it has an answer.
 *
 * What travels by mail is a one-time claim link, never a number. The person who
 * opens it chooses which account receives the credit — which is the point. An
 * event signup arrives from abc@naver.com and the same person signs in with
 * Google as abc@gmail.com; matching on the address would strand them.
 */

export const rewardCreditProductSchema = z.enum(["QUICK", "PRO", "FINAL"]);
export type RewardCreditProduct = z.infer<typeof rewardCreditProductSchema>;

export const rewardCreditReasonSchema = z.enum(["LAUNCH_EVENT", "REFERRAL", "SNS", "CS", "MANUAL"]);
export type RewardCreditReason = z.infer<typeof rewardCreditReasonSchema>;

export const rewardCreditStatusSchema = z.enum(["UNCLAIMED", "AVAILABLE", "CONSUMED", "EXPIRED", "REVOKED"]);
export type RewardCreditStatus = z.infer<typeof rewardCreditStatusSchema>;

export const REWARD_REASON_LABEL: Record<RewardCreditReason, string> = {
  LAUNCH_EVENT: "런칭 이벤트",
  REFERRAL: "친구 추천",
  SNS: "SNS 인증",
  CS: "불편 보상",
  MANUAL: "직접 지급",
};

export const REWARD_STATUS_LABEL: Record<RewardCreditStatus, string> = {
  UNCLAIMED: "미수령",
  AVAILABLE: "사용 가능",
  CONSUMED: "사용 완료",
  EXPIRED: "기간 만료",
  REVOKED: "회수됨",
};

/**
 * Long enough that guessing is not a strategy.
 *
 * This token is the entire authorisation to take a credit — anyone holding it
 * can attach it to their own account — so it is sized like a password, not like
 * an id. 32 bytes of base64url is 43 characters and ~192 bits.
 */
export const CLAIM_TOKEN_BYTES = 32;

export function createClaimToken(randomBytes: (size: number) => Uint8Array): string {
  const bytes = randomBytes(CLAIM_TOKEN_BYTES);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // base64url: the token goes in a URL path, where + / = would need escaping.
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/** Rejects anything that could not have come out of createClaimToken. */
export function isClaimToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(value);
}

export function buildClaimUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/redeem/${token}`;
}

/**
 * What a claim attempt turned into, in the applicant's words.
 *
 * The SQL raises distinct error codes for these; the screen has to say
 * something different for each. "Already claimed by you" is a success the
 * second time round — mail clients prefetch links, and people reopen the tab.
 */
export type ClaimOutcome =
  | { ok: true; product: RewardCreditProduct; alreadyClaimed: boolean; consumed: boolean }
  | { ok: false; reason: "not_found" | "expired" | "taken" | "unavailable" | "unknown" };

const CLAIM_ERROR_REASON: Record<string, Extract<ClaimOutcome, { ok: false }>["reason"]> = {
  REWARD_CREDIT_NOT_FOUND: "not_found",
  REWARD_CREDIT_EXPIRED: "expired",
  REWARD_CREDIT_ALREADY_CLAIMED: "taken",
  REWARD_CREDIT_NOT_CLAIMABLE: "unavailable",
};

export function readClaimError(message: string | undefined): Extract<ClaimOutcome, { ok: false }>["reason"] {
  for (const [code, reason] of Object.entries(CLAIM_ERROR_REASON)) {
    if (message?.includes(code)) return reason;
  }
  return "unknown";
}

export function describeClaimFailure(reason: Extract<ClaimOutcome, { ok: false }>["reason"]): { title: string; detail: string } {
  switch (reason) {
    case "not_found":
      return { title: "이용권을 찾지 못했어요.", detail: "링크가 잘못되었거나 이미 삭제된 이용권입니다. 받으신 메일의 버튼을 다시 눌러 주세요." };
    case "expired":
      return { title: "사용 기간이 지났어요.", detail: "이 이용권은 유효기간이 끝났습니다. 이벤트 기간이 남아 있다면 문의해 주세요." };
    case "taken":
      // Said plainly rather than vaguely: the usual cause is signing in with a
      // different account than the one that already took it.
      return { title: "다른 계정이 이미 받아 갔어요.", detail: "이 이용권은 다른 계정에 등록되어 있습니다. 그 계정으로 로그인하시면 확인할 수 있어요." };
    case "unavailable":
      return { title: "지금은 받을 수 없는 이용권이에요.", detail: "만료되었거나 회수된 이용권입니다." };
    default:
      return { title: "이용권을 받지 못했어요.", detail: "잠시 후 다시 시도해 주세요. 계속 안 되면 문의해 주세요." };
  }
}

import { z } from "zod";

/**
 * Friend referral, paid out in reward credits.
 *
 * One rule decides whether this survives contact with the internet: **entering
 * a code is worth nothing; a completed payment is worth something.** Reward on
 * entry and the first person to notice writes a loop that types their own code
 * on a hundred throwaway accounts. Reward on `order.paid` and the attack costs
 * more than the prize.
 *
 * The code itself is short and shoutable because it gets read aloud and typed
 * from a phone screen. That means it must not be guessable in a way that
 * matters — and it is not, because guessing someone's code only lets you credit
 * *them*, never yourself.
 */

/**
 * No 0/O/1/I/L. A referral code is dictated over a table and retyped on a
 * phone; those four pairs are where that goes wrong, and a code that fails to
 * match costs a referral nobody can see was lost.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 6;
const CODE_PREFIX = "MOOA";

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^${CODE_PREFIX}[${CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`), "코드 형식이 올바르지 않습니다.");

export function createReferralCode(randomBytes: (size: number) => Uint8Array): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${CODE_PREFIX}${code}`;
}

/**
 * Accepts what people actually type.
 *
 * Spaces, hyphens and lowercase all arrive from someone copying a code out of a
 * KakaoTalk message. Rejecting those is refusing a referral over punctuation.
 */
export function normalizeReferralCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export type ReferralCheck =
  | { ok: true; code: string }
  | { ok: false; reason: "empty" | "malformed" };

export function parseReferralCode(input: string): ReferralCheck {
  const normalized = normalizeReferralCode(input);
  if (!normalized) return { ok: false, reason: "empty" };
  const parsed = referralCodeSchema.safeParse(normalized);
  return parsed.success ? { ok: true, code: parsed.data } : { ok: false, reason: "malformed" };
}

// PRO, not QUICK. A referral costs the friend a real purchase, so the cheaper
// tier was the weaker half of the trade — and PRO is the tier where the product
// is worth talking about, which is what a referral programme is buying.
export const REFERRAL_REWARD_PRODUCT = "PRO" as const;

/**
 * What the referrer gets, and when.
 *
 * Stated here rather than only in SQL so the screen and the payout cannot
 * describe different things — a promise on the page that the webhook does not
 * keep is worse than no referral programme.
 */
export const REFERRAL_TERMS = [
  "친구가 코드를 입력하고 실제로 결제해야 지급됩니다.",
  "코드 입력만으로는 지급되지 않습니다.",
  "한 사람당 한 번만 인정됩니다. 이전에 결제한 적이 있어도 괜찮습니다.",
  "본인 코드는 본인이 쓸 수 없습니다.",
];

export type ReferralStatus = "PENDING" | "CONVERTED" | "REJECTED";

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  PENDING: "결제 대기",
  CONVERTED: "지급 완료",
  REJECTED: "무효",
};

export function describeReferralError(message: string | undefined): string {
  if (message?.includes("REFERRAL_CODE_NOT_FOUND")) return "그런 코드가 없습니다. 다시 확인해 주세요.";
  // Named plainly rather than hidden behind "사용할 수 없는 코드": the person
  // typing their own code is testing whether it works, and telling them why is
  // faster than letting them wonder.
  if (message?.includes("REFERRAL_SELF")) return "본인 코드는 사용하실 수 없습니다.";
  if (message?.includes("REFERRAL_ALREADY_USED")) return "이미 추천코드를 사용하셨습니다. 한 번만 적용됩니다.";
  // No longer raised — the first-purchase restriction was removed. Kept so a
  // deployment still running the old function does not fall through to the
  // generic message.
  // No longer raised: the first-purchase restriction was removed. Kept so a
  // deployment still running the old function does not fall through to the
  // generic sentence.
  if (message?.includes("REFERRAL_NOT_FIRST_PURCHASE")) return "추천코드는 첫 결제에만 적용됩니다.";
  return "추천코드를 적용하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

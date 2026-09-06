import "server-only";

import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";
import { RESUME_BUILD_PRICE_KRW } from "@/domain/resume-build";

/**
 * `resume_builds` 표 하나를 다루는 곳.
 *
 * 서비스 키로 씁니다. 상태를 바꾸는 일(결제 확인·실행 표시)은 전부 서버가
 * 해야 하고, 그래서 마이그레이션에도 사용자용 update 정책이 없습니다 —
 * 브라우저가 status를 'CHECKOUT'으로 적을 수 있으면 이 상품은 0원이 됩니다.
 * 대신 모든 함수가 `ownerUserId`를 조건에 함께 넣습니다.
 */

/** 모델이 실패하면 되돌려 주되, 무한히는 아닙니다. 한 번 결제로 계속 부를 수 있으면 안 됩니다. */
export const MAX_RESUME_BUILD_ATTEMPTS = 3;

const resumeBuildSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  status: z.enum(["PENDING", "CHECKOUT", "RUNNING", "USED", "FAILED"]),
  price_krw: z.number().int(),
  provider_checkout_id: z.string().nullable(),
  checkout_url: z.string().nullable(),
  attempt_count: z.number().int(),
});
export type ResumeBuildRow = z.infer<typeof resumeBuildSchema>;

const COLUMNS = "id, owner_user_id, status, price_krw, provider_checkout_id, checkout_url, attempt_count";

export class ResumeBuildStoreError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "ResumeBuildStoreError";
  }
}

export async function createResumeBuild(ownerUserId: string): Promise<ResumeBuildRow> {
  const { data, error } = await serviceClient()
    .from("resume_builds")
    .insert({ owner_user_id: ownerUserId, price_krw: RESUME_BUILD_PRICE_KRW })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new ResumeBuildStoreError(error?.message ?? "이력서 제작 건을 만들지 못했습니다.", "CREATE_FAILED");
  return resumeBuildSchema.parse(data);
}

export async function loadResumeBuild(buildId: string, ownerUserId: string): Promise<ResumeBuildRow | null> {
  const { data, error } = await serviceClient()
    .from("resume_builds")
    .select(COLUMNS)
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new ResumeBuildStoreError(error.message, "LOAD_FAILED");
  return data ? resumeBuildSchema.parse(data) : null;
}

/**
 * 결제 창을 만든 뒤 그 번호를 붙입니다.
 *
 * 아직 결제되지 않은 건에만 붙입니다. 이미 쓴 건(USED)에 새 결제 번호를 덮으면
 * 한 번 산 것을 또 쓸 수 있습니다.
 */
export async function attachResumeBuildCheckout(input: {
  buildId: string;
  ownerUserId: string;
  checkoutId: string;
  checkoutUrl: string;
}): Promise<void> {
  const { data, error } = await serviceClient()
    .from("resume_builds")
    .update({ status: "CHECKOUT", provider_checkout_id: input.checkoutId, checkout_url: input.checkoutUrl })
    .eq("id", input.buildId)
    .eq("owner_user_id", input.ownerUserId)
    .in("status", ["PENDING", "CHECKOUT"])
    .select("id");
  if (error) throw new ResumeBuildStoreError(error.message, "ATTACH_FAILED");
  if (!data?.length) throw new ResumeBuildStoreError("이미 사용했거나 결제를 붙일 수 없는 건입니다.", "NOT_ATTACHABLE");
}

/**
 * 실행 권한을 한 사람만 갖게 합니다.
 *
 * 조건이 붙은 update 한 번입니다. 창을 두 개 열어 동시에 눌러도 한쪽만
 * 'RUNNING'을 얻습니다 — 읽고 나서 쓰면 그 사이에 둘 다 통과합니다.
 */
export async function claimResumeBuildRun(buildId: string, ownerUserId: string): Promise<ResumeBuildRow | null> {
  const { data, error } = await serviceClient()
    .from("resume_builds")
    .update({ status: "RUNNING" })
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .eq("status", "CHECKOUT")
    .lt("attempt_count", MAX_RESUME_BUILD_ATTEMPTS)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new ResumeBuildStoreError(error.message, "CLAIM_FAILED");
  return data ? resumeBuildSchema.parse(data) : null;
}

export async function finishResumeBuildRun(buildId: string): Promise<void> {
  const { error } = await serviceClient()
    .from("resume_builds")
    .update({ status: "USED", used_at: new Date().toISOString() })
    .eq("id", buildId);
  if (error) throw new ResumeBuildStoreError(error.message, "FINISH_FAILED");
}

/**
 * 실패했으니 되돌려 줍니다.
 *
 * 결제한 사람이 모델 오류 한 번으로 빈손이 되면 안 됩니다. 세 번까지 되돌리고,
 * 그 다음에는 FAILED로 두고 화면이 문의를 안내합니다 — 계속 되돌리면 한 번
 * 결제로 모델을 무한히 부를 수 있습니다.
 */
export async function releaseResumeBuildRun(buildId: string, attemptCount: number): Promise<void> {
  const nextAttempt = attemptCount + 1;
  const { error } = await serviceClient()
    .from("resume_builds")
    .update({ status: nextAttempt >= MAX_RESUME_BUILD_ATTEMPTS ? "FAILED" : "CHECKOUT", attempt_count: nextAttempt })
    .eq("id", buildId);
  if (error) throw new ResumeBuildStoreError(error.message, "RELEASE_FAILED");
}

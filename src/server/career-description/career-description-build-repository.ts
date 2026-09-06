import "server-only";

import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";
import { CAREER_DESCRIPTION_BUILD_PRICE_KRW } from "@/domain/career-description-build";

/**
 * `career_description_builds` 표 하나를 다루는 곳.
 *
 * 이력서 제작(`resume-build-repository.ts`)과 같은 이유로 서비스 키를 씁니다.
 * 상태를 바꾸는 일은 전부 서버가 해야 하므로 마이그레이션에도 사용자용 update
 * 정책이 없습니다 — 모든 함수가 `ownerUserId`를 조건에 함께 넣습니다.
 */

export const MAX_CAREER_DESCRIPTION_BUILD_ATTEMPTS = 3;

const careerDescriptionBuildSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  status: z.enum(["PENDING", "CHECKOUT", "RUNNING", "USED", "FAILED"]),
  price_krw: z.number().int(),
  provider_checkout_id: z.string().nullable(),
  checkout_url: z.string().nullable(),
  attempt_count: z.number().int(),
});
export type CareerDescriptionBuildRow = z.infer<typeof careerDescriptionBuildSchema>;

const COLUMNS = "id, owner_user_id, status, price_krw, provider_checkout_id, checkout_url, attempt_count";

export class CareerDescriptionBuildStoreError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "CareerDescriptionBuildStoreError";
  }
}

export async function createCareerDescriptionBuild(ownerUserId: string): Promise<CareerDescriptionBuildRow> {
  const { data, error } = await serviceClient()
    .from("career_description_builds")
    .insert({ owner_user_id: ownerUserId, price_krw: CAREER_DESCRIPTION_BUILD_PRICE_KRW })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new CareerDescriptionBuildStoreError(error?.message ?? "경력기술서 제작 건을 만들지 못했습니다.", "CREATE_FAILED");
  return careerDescriptionBuildSchema.parse(data);
}

export async function loadCareerDescriptionBuild(buildId: string, ownerUserId: string): Promise<CareerDescriptionBuildRow | null> {
  const { data, error } = await serviceClient()
    .from("career_description_builds")
    .select(COLUMNS)
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new CareerDescriptionBuildStoreError(error.message, "LOAD_FAILED");
  return data ? careerDescriptionBuildSchema.parse(data) : null;
}

export async function attachCareerDescriptionBuildCheckout(input: {
  buildId: string;
  ownerUserId: string;
  checkoutId: string;
  checkoutUrl: string;
}): Promise<void> {
  const { data, error } = await serviceClient()
    .from("career_description_builds")
    .update({ status: "CHECKOUT", provider_checkout_id: input.checkoutId, checkout_url: input.checkoutUrl })
    .eq("id", input.buildId)
    .eq("owner_user_id", input.ownerUserId)
    .in("status", ["PENDING", "CHECKOUT"])
    .select("id");
  if (error) throw new CareerDescriptionBuildStoreError(error.message, "ATTACH_FAILED");
  if (!data?.length) throw new CareerDescriptionBuildStoreError("이미 사용했거나 결제를 붙일 수 없는 건입니다.", "NOT_ATTACHABLE");
}

export async function claimCareerDescriptionBuildRun(buildId: string, ownerUserId: string): Promise<CareerDescriptionBuildRow | null> {
  const { data, error } = await serviceClient()
    .from("career_description_builds")
    .update({ status: "RUNNING" })
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .eq("status", "CHECKOUT")
    .lt("attempt_count", MAX_CAREER_DESCRIPTION_BUILD_ATTEMPTS)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new CareerDescriptionBuildStoreError(error.message, "CLAIM_FAILED");
  return data ? careerDescriptionBuildSchema.parse(data) : null;
}

export async function finishCareerDescriptionBuildRun(buildId: string): Promise<void> {
  const { error } = await serviceClient()
    .from("career_description_builds")
    .update({ status: "USED", used_at: new Date().toISOString() })
    .eq("id", buildId);
  if (error) throw new CareerDescriptionBuildStoreError(error.message, "FINISH_FAILED");
}

export async function releaseCareerDescriptionBuildRun(buildId: string, attemptCount: number): Promise<void> {
  const nextAttempt = attemptCount + 1;
  const { error } = await serviceClient()
    .from("career_description_builds")
    .update({ status: nextAttempt >= MAX_CAREER_DESCRIPTION_BUILD_ATTEMPTS ? "FAILED" : "CHECKOUT", attempt_count: nextAttempt })
    .eq("id", buildId);
  if (error) throw new CareerDescriptionBuildStoreError(error.message, "RELEASE_FAILED");
}

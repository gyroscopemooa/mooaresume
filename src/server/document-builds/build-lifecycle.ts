import "server-only";

import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";

/**
 * "1건 사서 1건 만든다" 상품의 공통 수명주기.
 *
 * 이력서 제작이 처음 이 모양을 만들었고, 경력기술서·포트폴리오·법률 문서가
 * 같은 모양을 요구했습니다. 네 번째 복사본을 만들 차례가 되어서야 이것을
 * 함수로 뺍니다 — 두 번째까지는 우연이고 네 번째는 패턴입니다.
 *
 * 표 이름만 다르고 상태 전이는 같습니다.
 *   PENDING → CHECKOUT → RUNNING → USED
 *                  ↑         ↓(실패)
 *                  └─────────┴→ FAILED(횟수 소진)
 *
 * **이력서 제작(`resume-build-repository.ts`)은 여기로 옮기지 않았습니다.**
 * 이미 팔고 있는 경로라, 돈이 오가는 코드를 리팩터링 이득만으로 건드리지
 * 않습니다. 옮길지는 사용자가 정합니다.
 *
 * 서비스 키로 씁니다. 상태를 바꾸는 일은 전부 서버가 해야 하므로 각 표의
 * 마이그레이션에도 사용자용 update 정책이 없습니다 — 브라우저가 status를
 * 'CHECKOUT'으로 적을 수 있으면 그 상품은 0원이 됩니다. 대신 모든 함수가
 * `ownerUserId`를 조건에 함께 넣습니다.
 */

/** 모델이 실패하면 되돌려 주되, 무한히는 아닙니다. 한 번 결제로 계속 부를 수 있으면 안 됩니다. */
export const MAX_BUILD_ATTEMPTS = 3;

const buildRowSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  status: z.enum(["PENDING", "CHECKOUT", "RUNNING", "USED", "FAILED"]),
  price_krw: z.number().int(),
  provider_checkout_id: z.string().nullable(),
  checkout_url: z.string().nullable(),
  attempt_count: z.number().int(),
});
export type BuildRow = z.infer<typeof buildRowSchema>;

const COLUMNS = "id, owner_user_id, status, price_krw, provider_checkout_id, checkout_url, attempt_count";

export class BuildStoreError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "BuildStoreError";
  }
}

/** 어느 표를 쓰는지와, 사람에게 보일 이름. 오류 문구가 "건"이라고만 말하면 무엇이 실패했는지 모릅니다. */
export type BuildTable = { table: string; label: string };

export async function createBuild(target: BuildTable, ownerUserId: string, priceKrw: number, extra: Record<string, unknown> = {}): Promise<BuildRow> {
  const { data, error } = await serviceClient()
    .from(target.table)
    .insert({ owner_user_id: ownerUserId, price_krw: priceKrw, ...extra })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new BuildStoreError(error?.message ?? `${target.label} 건을 만들지 못했습니다.`, "CREATE_FAILED");
  return buildRowSchema.parse(data);
}

export async function loadBuild(target: BuildTable, buildId: string, ownerUserId: string): Promise<BuildRow | null> {
  const { data, error } = await serviceClient()
    .from(target.table)
    .select(COLUMNS)
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new BuildStoreError(error.message, "LOAD_FAILED");
  return data ? buildRowSchema.parse(data) : null;
}

/**
 * 결제 창을 만든 뒤 그 번호를 붙입니다. 아직 쓰지 않은 건에만 붙입니다 —
 * 이미 쓴 건(USED)에 새 결제 번호를 덮으면 한 번 산 것을 또 쓸 수 있습니다.
 */
export async function attachBuildCheckout(target: BuildTable, input: {
  buildId: string;
  ownerUserId: string;
  checkoutId: string;
  checkoutUrl: string;
}): Promise<void> {
  const { data, error } = await serviceClient()
    .from(target.table)
    .update({ status: "CHECKOUT", provider_checkout_id: input.checkoutId, checkout_url: input.checkoutUrl })
    .eq("id", input.buildId)
    .eq("owner_user_id", input.ownerUserId)
    .in("status", ["PENDING", "CHECKOUT"])
    .select("id");
  if (error) throw new BuildStoreError(error.message, "ATTACH_FAILED");
  if (!data?.length) throw new BuildStoreError("이미 사용했거나 결제를 붙일 수 없는 건입니다.", "NOT_ATTACHABLE");
}

/**
 * 실행 권한을 한 사람만 갖게 합니다. 조건이 붙은 update 한 번입니다 — 창을
 * 두 개 열어 동시에 눌러도 한쪽만 'RUNNING'을 얻습니다. 읽고 나서 쓰면 그
 * 사이에 둘 다 통과합니다.
 */
export async function claimBuildRun(target: BuildTable, buildId: string, ownerUserId: string): Promise<BuildRow | null> {
  const { data, error } = await serviceClient()
    .from(target.table)
    .update({ status: "RUNNING" })
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .eq("status", "CHECKOUT")
    .lt("attempt_count", MAX_BUILD_ATTEMPTS)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new BuildStoreError(error.message, "CLAIM_FAILED");
  return data ? buildRowSchema.parse(data) : null;
}

export async function finishBuildRun(target: BuildTable, buildId: string): Promise<void> {
  const { error } = await serviceClient()
    .from(target.table)
    .update({ status: "USED", used_at: new Date().toISOString() })
    .eq("id", buildId);
  if (error) throw new BuildStoreError(error.message, "FINISH_FAILED");
}

/**
 * 실패했으니 되돌려 줍니다. 결제한 사람이 모델 오류 한 번으로 빈손이 되면 안
 * 됩니다. 세 번까지 되돌리고 그다음에는 FAILED로 둡니다 — 계속 되돌리면 한 번
 * 결제로 모델을 무한히 부를 수 있습니다.
 */
export async function releaseBuildRun(target: BuildTable, buildId: string, attemptCount: number): Promise<void> {
  const nextAttempt = attemptCount + 1;
  const { error } = await serviceClient()
    .from(target.table)
    .update({ status: nextAttempt >= MAX_BUILD_ATTEMPTS ? "FAILED" : "CHECKOUT", attempt_count: nextAttempt })
    .eq("id", buildId);
  if (error) throw new BuildStoreError(error.message, "RELEASE_FAILED");
}

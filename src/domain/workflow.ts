import type { ProductTier } from "./product-tier";
import type { WritingMode } from "./writing-mode";

export type WritingWorkflow =
  | "QUICK_EDIT"
  | "GUIDED_CREATE"
  | "PRO_ENHANCE"
  | "PRO_FINAL_REVIEW";

export type WorkflowLayer = "INTERVIEW_LAYER";
export type Entitlement = "QUICK_ANALYSIS" | "PRO_ANALYSIS" | "AI_INTERVIEW";

export type WorkflowResolution =
  | { eligible: false; reason: string }
  | {
      eligible: true;
      workflow: WritingWorkflow;
      layers: WorkflowLayer[];
      entitlements: Entitlement[];
    };

export function resolveWorkflow(
  writingMode: WritingMode,
  productTier: ProductTier,
): WorkflowResolution {
  if (writingMode === "CREATE" && productTier === "QUICK") {
    return { eligible: false, reason: "작성된 원문이 없어 QUICK 첨삭을 이용할 수 없습니다." };
  }

  const workflow: WritingWorkflow = productTier === "QUICK"
    ? "QUICK_EDIT"
    : writingMode === "CREATE"
      ? "GUIDED_CREATE"
      : writingMode === "BUILD"
        ? "PRO_ENHANCE"
        : "PRO_FINAL_REVIEW";

  return {
    eligible: true,
    workflow,
    layers: productTier === "FINAL" ? ["INTERVIEW_LAYER"] : [],
    entitlements: productTier === "QUICK"
      ? ["QUICK_ANALYSIS"]
      : productTier === "FINAL"
        ? ["PRO_ANALYSIS", "AI_INTERVIEW"]
        : ["PRO_ANALYSIS"],
  };
}

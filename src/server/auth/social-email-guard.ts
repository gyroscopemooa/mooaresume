import "server-only";

import { NextResponse } from "next/server";
import { deliveryCompletionPath } from "@/lib/auth/redirect";
import { canStartWithDelivery, type DeliveryUser } from "@/lib/auth/delivery-preference";

/** A verified email or an explicit server-saved dashboard choice is required for new social accounts. */
export function socialEmailGuard(user: DeliveryUser, nextPath: string): NextResponse | null {
  if (canStartWithDelivery(user)) return null;
  return NextResponse.json({
    code: "EMAIL_CONFIRMATION_REQUIRED",
    error: "내 계정 → 이메일 확인에서 이메일을 확인하거나 내부 대시보드로만 보기를 선택해 주세요.",
    confirmationPath: deliveryCompletionPath(nextPath),
  }, { status: 403 });
}

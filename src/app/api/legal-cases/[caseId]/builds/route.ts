import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { legalDocumentPriceKrw, legalDocumentTypeSchema } from "@/domain/legal-case";
import { getCheckoutReturnOrigin } from "@/server/billing/checkout-return-origin";
import { createDocumentBuildCheckout } from "@/server/billing/document-build-checkout";
import { attachBuildCheckout, BuildStoreError, createBuild } from "@/server/document-builds/build-lifecycle";
import { legalDocumentBuild } from "@/server/document-builds/products";
import { loadLegalCase } from "@/server/legal/legal-case-repository";
import { guardMemberRequest, readJsonBody } from "@/server/http/request-guards";

export const runtime = "nodejs";

const bodySchema = z.object({ docType: legalDocumentTypeSchema });

/**
 * 사건의 문서 1건을 사는 자리.
 *
 * 사건과 자료는 무료로 쌓이고, 값은 문서를 만들 때 받습니다. 어느 사건의 어느
 * 문서인지를 결제 건에 함께 적어 둡니다 — 환불 문의가 오면 그 두 값으로 찾습니다.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  const { caseId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  let parsed;
  try {
    parsed = bodySchema.parse(body.body);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "만들 문서를 고르지 못했습니다." }, { status: 400 });
    throw error;
  }

  const legalCase = await loadLegalCase(caseId, guard.userId);
  if (!legalCase) return NextResponse.json({ error: "사건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });

  // 값은 고른 문서에서 나옵니다. 화면이 보낸 금액을 쓰지 않습니다.
  const priceKrw = legalDocumentPriceKrw(parsed.docType);

  const siteUrl = getCheckoutReturnOrigin(request.nextUrl);
  let buildId: string | null = null;
  try {
    const build = await createBuild(legalDocumentBuild.table, guard.userId, priceKrw, {
      case_id: caseId,
      doc_type: parsed.docType,
    });
    buildId = build.id;
    const session = await createDocumentBuildCheckout(legalDocumentBuild.product, {
      buildId: build.id,
      userId: guard.userId,
      priceKrw,
      customerEmail: guard.email,
      successUrl: `${siteUrl}/legal/${caseId}?legal_build=${build.id}&doc=${parsed.docType}&checkout=success`,
      returnUrl: `${siteUrl}/legal/${caseId}?legal_build=${build.id}&doc=${parsed.docType}`,
    });
    await attachBuildCheckout(legalDocumentBuild.table, {
      buildId: build.id,
      ownerUserId: guard.userId,
      checkoutId: session.checkoutId,
      checkoutUrl: session.checkoutUrl,
    });
    return NextResponse.json({ buildId: build.id, checkoutUrl: session.checkoutUrl, priceKrw }, { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const configMissing = /POLAR_|SUPABASE_SECRET_KEY|NEXT_PUBLIC_SUPABASE_URL/.test(detail);
    console.error("legal_build_checkout_failed", JSON.stringify({ buildId, code: error instanceof BuildStoreError ? error.code : configMissing ? "CONFIG_MISSING" : "POLAR", detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: configMissing
        ? "결제 설정이 아직 준비되지 않았습니다. 아무것도 청구되지 않았습니다."
        : "결제 페이지를 만들지 못했습니다. 아무것도 청구되지 않았습니다.",
      code: configMissing ? "CONFIG_MISSING" : "CHECKOUT_FAILED",
    }, { status: 502 });
  }
}

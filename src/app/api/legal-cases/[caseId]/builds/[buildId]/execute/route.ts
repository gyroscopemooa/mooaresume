import { NextRequest, NextResponse } from "next/server";
import { findLegalDocumentDefinition, hasEnoughLegalCaseSource } from "@/domain/legal-case";
import { checkDocumentBuildPayment } from "@/server/billing/document-build-checkout";
import { createLegalDocumentGatewayFromEnv } from "@/server/ai/legal/legal-document-gateway";
import { claimBuildRun, finishBuildRun, loadBuild, releaseBuildRun, MAX_BUILD_ATTEMPTS } from "@/server/document-builds/build-lifecycle";
import { legalDocumentBuild } from "@/server/document-builds/products";
import { listLegalCaseMaterials, loadLegalBuildTarget, loadLegalCase, saveLegalCaseDocument } from "@/server/legal/legal-case-repository";
import { guardMemberRequest, readJsonBody } from "@/server/http/request-guards";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 결제한 1건으로 사건 문서를 만듭니다.
 *
 * 다른 제작 기능과 두 가지가 다릅니다.
 *
 * ① 자료가 요청에 실려 오지 않습니다. 이미 사건에 저장돼 있으므로 서버가
 *    직접 읽습니다 — 브라우저가 보낸 자료를 믿고 만들면, 결제만 이 사건 것이고
 *    내용은 다른 사건 것인 문서를 만들 수 있습니다.
 * ② 결과를 저장합니다. 사건의 연속성이 이 기능의 값이라, 준비서면 2차를 쓸 때
 *    1차에서 뭐라고 했는지 볼 수 있어야 합니다.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string; buildId: string }> }) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  const { caseId, buildId } = await context.params;
  // 본문은 없어도 됩니다. 결제 뒤 돌아온 화면이 빈 본문으로 부르는 길이 있어,
  // 파싱 실패를 이유로 막지 않습니다.
  const body = await readJsonBody(request).catch(() => null);
  void body;

  const build = await loadBuild(legalDocumentBuild.table, buildId, guard.userId);
  if (!build) return NextResponse.json({ error: "문서 제작 건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
  if (build.status === "USED") {
    return NextResponse.json({ error: "이미 사용한 건입니다. 다시 만들려면 새로 결제해 주세요.", code: "ALREADY_USED" }, { status: 409 });
  }
  if (build.status === "FAILED") {
    return NextResponse.json({ error: `${MAX_BUILD_ATTEMPTS}번 모두 실패했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.`, code: "RUN_FAILED" }, { status: 409 });
  }
  if (!build.provider_checkout_id) {
    return NextResponse.json({ error: "결제가 확인되지 않았습니다.", code: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const legalCase = await loadLegalCase(caseId, guard.userId);
  if (!legalCase) return NextResponse.json({ error: "사건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });

  // 문서 종류는 결제할 때 적어 둔 값을 그대로 씁니다. 화면이 보낸 값을 믿으면
  // 싼 문서를 사서 비싼 문서를 만들 수 있습니다(지금은 값이 같지만, 종류별로
  // 값을 나누는 순간 그 구멍이 열립니다). 결제 건이 가리키는 사건도 주소의
  // 사건과 같아야 합니다 — 다르면 결제만 이 사건 것인 문서가 만들어집니다.
  const target = await loadLegalBuildTarget(buildId, guard.userId);
  if (!target) return NextResponse.json({ error: "이 건에 어떤 문서를 만들지가 기록되어 있지 않습니다.", code: "DOC_TYPE_MISSING" }, { status: 409 });
  if (target.caseId && target.caseId !== caseId) {
    return NextResponse.json({ error: "이 결제는 다른 사건의 것입니다.", code: "CASE_MISMATCH" }, { status: 409 });
  }
  const docType = target.docType;

  const materials = await listLegalCaseMaterials(caseId, guard.userId);
  if (!hasEnoughLegalCaseSource({ summary: legalCase.summary, materials })) {
    return NextResponse.json({ error: "사건 자료가 너무 적습니다. 사건 경위를 조금 더 적거나 자료를 올려 주세요.", code: "NOT_ENOUGH_SOURCE" }, { status: 400 });
  }

  const payment = await checkDocumentBuildPayment(legalDocumentBuild.product, {
    checkoutId: build.provider_checkout_id,
    buildId: build.id,
    userId: guard.userId,
  });
  if (!payment.paid) {
    return NextResponse.json({
      error: payment.reason === "NOT_PAID" ? "결제가 아직 확인되지 않았습니다. 결제를 마치면 이어서 만들어 드립니다." : "이 결제로는 이 문서를 만들 수 없습니다.",
      code: payment.reason,
    }, { status: 402 });
  }

  const claimed = await claimBuildRun(legalDocumentBuild.table, build.id, guard.userId);
  if (!claimed) {
    return NextResponse.json({ error: "이미 실행 중입니다. 잠시 후 다시 확인해 주세요.", code: "ALREADY_RUNNING" }, { status: 409 });
  }

  try {
    const result = await createLegalDocumentGatewayFromEnv().build({
      docType,
      legalCase,
      materials,
    });
    const saved = await saveLegalCaseDocument({
      caseId,
      ownerUserId: guard.userId,
      docType,
      title: result.output.title || findLegalDocumentDefinition(docType).label,
      output: result.output,
    });
    await finishBuildRun(legalDocumentBuild.table, build.id);
    return NextResponse.json({ document: saved, truncated: result.truncated }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseBuildRun(legalDocumentBuild.table, build.id, claimed.attempt_count);
    const remaining = MAX_BUILD_ATTEMPTS - (claimed.attempt_count + 1);
    // 사건 내용은 로그에 남기지 않습니다. 남는 것은 어느 건이 몇 번째로 실패했는지뿐입니다.
    console.error("legal_build_run_failed", JSON.stringify({ buildId: build.id, docType, attempt: claimed.attempt_count + 1, detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: remaining > 0
        ? "문서를 만들지 못했습니다. 결제는 그대로 남아 있으니 잠시 후 다시 시도해 주세요."
        : "문서를 만들지 못했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.",
      code: "RUN_FAILED",
    }, { status: 502 });
  }
}

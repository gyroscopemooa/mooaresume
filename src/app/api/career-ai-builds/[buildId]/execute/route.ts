import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CAREER_AI_MATERIAL_MAX_CHARS } from "@/domain/career-ai-contract";
import { checkDocumentBuildPayment } from "@/server/billing/document-build-checkout";
import { createCareerInterpretationGatewayFromEnv } from "@/server/ai/career-interpretation/career-interpretation-gateway";
import { buildCareerInterpretationRequest, type CareerAiScope } from "@/server/career/career-ai-request-builder";
import { selectLatestAssessments, type AssessmentSessionRow } from "@/server/career/assessment-history";
import { claimBuildRun, finishBuildRun, saveBuildOutput, loadBuild, releaseBuildRun, MAX_BUILD_ATTEMPTS } from "@/server/document-builds/build-lifecycle";
import { careerAiBuildTable, getCareerAiBuildDefinition } from "@/server/document-builds/products";

export const runtime = "nodejs";
export const maxDuration = 120;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host || new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

const materialBodySchema = z.object({
  resumeText: z.string().min(1).max(CAREER_AI_MATERIAL_MAX_CHARS).optional(),
  coverLetterText: z.string().min(1).max(CAREER_AI_MATERIAL_MAX_CHARS).optional(),
  jobPostingText: z.string().min(1).max(CAREER_AI_MATERIAL_MAX_CHARS).optional(),
});

/**
 * 결제한 1건으로 AI 심층해설을 만듭니다.
 *
 * 검사 점수는 사용자가 다시 보내지 않습니다 — 이미 저장돼 있으므로 서버가
 * 본인 소유 결과를 RLS로 직접 읽습니다. 이력서·자소서·공고 텍스트는 선택
 * 사항이라 이 요청 본문에만 실려 오고(경력기술서 제작과 같은 이유로 저장하지
 * 않습니다), 비어 있으면 점수만으로 해설을 만듭니다.
 *
 * 순서: ① 이 건의 범위(scope)를 확인 ② 결제를 Polar에 직접 확인 ③ 실행 권한을
 * 한 사람에게만 준다(RUNNING) ④ 필요한 검사 결과가 있는지 확인(없으면 결제·
 * 시도 소모 없이 안내) ⑤ 모델을 부른다. 모델이 실패하면 권한을 돌려줍니다.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ buildId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });

  const { buildId } = await context.params;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const material = materialBodySchema.safeParse(rawBody);
  if (!material.success) return NextResponse.json({ error: "보낸 자료의 형식이 올바르지 않습니다." }, { status: 400 });

  const { data: scopeRow } = await supabase
    .from("career_ai_builds")
    .select("scope")
    .eq("id", buildId)
    .eq("owner_user_id", authData.user.id)
    .maybeSingle();
  if (!scopeRow) return NextResponse.json({ error: "AI 심층해설 건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
  const scope = scopeRow.scope as CareerAiScope;
  const definition = getCareerAiBuildDefinition(scope);

  const build = await loadBuild(careerAiBuildTable, buildId, authData.user.id);
  if (!build) return NextResponse.json({ error: "AI 심층해설 건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
  if (build.status === "USED") {
    return NextResponse.json({ error: "이미 사용한 건입니다. 다시 받으려면 새로 결제해 주세요.", code: "ALREADY_USED" }, { status: 409 });
  }
  if (build.status === "FAILED") {
    return NextResponse.json({ error: `${MAX_BUILD_ATTEMPTS}번 모두 실패했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.`, code: "RUN_FAILED" }, { status: 409 });
  }
  if (!build.provider_checkout_id) {
    return NextResponse.json({ error: "결제가 확인되지 않았습니다.", code: "PAYMENT_REQUIRED" }, { status: 402 });
  }

  const payment = await checkDocumentBuildPayment(definition.product, {
    checkoutId: build.provider_checkout_id,
    buildId: build.id,
    userId: authData.user.id,
  });
  if (!payment.paid) {
    return NextResponse.json({
      error: payment.reason === "NOT_PAID" ? "결제가 아직 확인되지 않았습니다. 결제를 마치면 이어서 만들어 드립니다." : "이 결제로는 심층해설을 만들 수 없습니다.",
      code: payment.reason,
    }, { status: 402 });
  }

  const { data: sessionRows, error: sessionError } = await supabase
    .from("career_assessment_sessions")
    .select("id, assessment_code, assessment_version, completed_at, career_assessment_results(scale_code, raw_score, normalized_score, interpretation_version)")
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false });
  if (sessionError) return NextResponse.json({ error: "검사 결과를 불러오지 못했습니다.", code: "ASSESSMENTS_UNAVAILABLE" }, { status: 500 });

  const assessments = selectLatestAssessments((sessionRows ?? []) as AssessmentSessionRow[]);
  const scoredRequest = buildCareerInterpretationRequest(scope, assessments);
  if (!scoredRequest) {
    return NextResponse.json({ error: "이 해설에 필요한 검사 결과를 찾지 못했습니다. 검사를 먼저 완료해 주세요.", code: "ASSESSMENTS_MISSING" }, { status: 409 });
  }
  const interpretationRequest = { ...scoredRequest, ...material.data };

  const claimed = await claimBuildRun(careerAiBuildTable, build.id, authData.user.id);
  if (!claimed) {
    return NextResponse.json({ error: "이미 만드는 중입니다. 잠시 후 다시 확인해 주세요.", code: "ALREADY_RUNNING" }, { status: 409 });
  }

  try {
    const result = await createCareerInterpretationGatewayFromEnv().interpret(interpretationRequest);
    try { await saveBuildOutput(careerAiBuildTable, build.id, result.output); }
    catch (saveError) { console.error("career_ai_build_output_save_failed", JSON.stringify({ buildId: build.id, detail: saveError instanceof Error ? saveError.message.slice(0, 200) : "UNKNOWN" })); }
    await finishBuildRun(careerAiBuildTable, build.id);
    return NextResponse.json({ output: result.output }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseBuildRun(careerAiBuildTable, build.id, claimed.attempt_count);
    const remaining = MAX_BUILD_ATTEMPTS - (claimed.attempt_count + 1);
    console.error("career_ai_build_run_failed", JSON.stringify({ buildId: build.id, scope, attempt: claimed.attempt_count + 1, detail: detail.slice(0, 300) }));
    return NextResponse.json({
      error: remaining > 0
        ? "심층해설을 만들지 못했습니다. 결제는 그대로 남아 있으니 잠시 후 다시 시도해 주세요."
        : "심층해설을 만들지 못했습니다. 결제 내역과 함께 문의해 주시면 환불해 드립니다.",
      code: "RUN_FAILED",
    }, { status: 502 });
  }
}

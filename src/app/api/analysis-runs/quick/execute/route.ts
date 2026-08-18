import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { sendAnalysisCompleteEmail } from "@/server/notifications/analysis-complete-email";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { QuickAnalysisProvider } from "@/server/ai/quick/provider";
import { QuickAnalysisOrchestrator } from "@/server/analysis/quick-analysis-orchestrator";
import { SupabaseQuickAnalysisRunRepository } from "@/server/analysis/supabase-quick-analysis-run-repository";

export const runtime = "nodejs";
export const maxDuration = 600;

const bodySchema = z.object({ analysisRunId: z.string().uuid(), retry: z.boolean().optional() });

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await request.json());
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) throw new Error("OPENAI_CONFIGURATION_MISSING");

    const repository = new SupabaseQuickAnalysisRunRepository(data.user.id);
    if (body.retry) await repository.prepareRetry(body.analysisRunId);
    const orchestrator = new QuickAnalysisOrchestrator(
      repository,
      new QuickAnalysisProvider(new OpenAIResponsesGateway({ apiKey, model }), 1),
    );
    const result = await orchestrator.execute(body.analysisRunId);
    if (data.user.email) {
      try {
        await sendAnalysisCompleteEmail({ to: data.user.email, resultUrl: `${getSiteUrl()}/result?analysisRunId=${body.analysisRunId}` });
      } catch (emailError) {
        console.error("analysis_complete_email_failed", { error: emailError instanceof Error ? emailError.message : "UNKNOWN_ERROR" });
      }
    }
    return NextResponse.json({
      analysisRunId: body.analysisRunId,
      status: "COMPLETED",
      resultUrl: `/result?analysisRunId=${body.analysisRunId}`,
      result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "분석 요청 값이 올바르지 않습니다." }, { status: 400 });
    }
    console.error("quick_analysis_execution_failed", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });
    const detail = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({
      error: "분석을 완료하지 못했습니다.",
      ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { OpenAIResponsesGateway } from "@/server/ai/quick/openai-responses-gateway";
import { QuickAnalysisProvider } from "@/server/ai/quick/provider";
import { QuickAnalysisOrchestrator } from "@/server/analysis/quick-analysis-orchestrator";
import { SupabaseQuickAnalysisRunRepository } from "@/server/analysis/supabase-quick-analysis-run-repository";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({ analysisRunId: z.string().uuid() });

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

    const orchestrator = new QuickAnalysisOrchestrator(
      new SupabaseQuickAnalysisRunRepository(data.user.id),
      new QuickAnalysisProvider(new OpenAIResponsesGateway({ apiKey, model })),
    );
    const result = await orchestrator.execute(body.analysisRunId);
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
    return NextResponse.json({ error: "분석을 완료하지 못했습니다." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { RESEARCH_CONSENT_VERSION } from "@/domain/deidentify";
import { createClient } from "@/lib/supabase/server";
import { readResearchConsent, writeResearchConsent } from "@/server/research/research-consent-repository";

const bodySchema = z.object({ granted: z.boolean() });

/** 지금 저장된 답. 아직 답한 적이 없거나 문구가 바뀌었으면 null입니다. */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ granted: null });
  try {
    return NextResponse.json({ granted: await readResearchConsent(data.user.id, RESEARCH_CONSENT_VERSION) });
  } catch {
    // Not knowing the previous answer is not a reason to stand between someone
    // and the run they are paying for. Ask again instead.
    return NextResponse.json({ granted: null });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    await writeResearchConsent(auth.user.id, parsed.data.granted, RESEARCH_CONSENT_VERSION);
    return NextResponse.json({ granted: parsed.data.granted });
  } catch (error) {
    // The reason travels to the screen. A consent write that fails silently is
    // how this went unnoticed long enough to matter.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 },
    );
  }
}

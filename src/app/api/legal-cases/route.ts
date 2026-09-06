import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { legalCaseInputSchema } from "@/domain/legal-case";
import { createLegalCase, LegalCaseStoreError } from "@/server/legal/legal-case-repository";
import { guardMemberRequest, readJsonBody } from "@/server/http/request-guards";

export const runtime = "nodejs";

/**
 * 사건을 만드는 자리. 사건을 만드는 것 자체는 무료입니다 — 자료를 넣어 보고
 * 무엇을 만들지 정하는 단계까지는 값을 받지 않습니다. 값은 문서를 만들 때 받습니다.
 */
export async function POST(request: NextRequest) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  let parsed;
  try {
    parsed = legalCaseInputSchema.parse(body.body);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "사건 정보를 확인해 주세요. 사건 이름은 꼭 필요합니다." }, { status: 400 });
    throw error;
  }

  try {
    const created = await createLegalCase(guard.userId, parsed);
    return NextResponse.json({ case: created }, { status: 201 });
  } catch (error) {
    console.error("legal_case_create_failed", JSON.stringify({ code: error instanceof LegalCaseStoreError ? error.code : "UNKNOWN" }));
    return NextResponse.json({ error: "사건을 만들지 못했습니다." }, { status: 502 });
  }
}

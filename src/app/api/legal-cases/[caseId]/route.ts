import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { legalCaseInputSchema } from "@/domain/legal-case";
import { deleteLegalCase, LegalCaseStoreError, updateLegalCase } from "@/server/legal/legal-case-repository";
import { guardMemberRequest, readJsonBody } from "@/server/http/request-guards";

export const runtime = "nodejs";

/** 사건 정보를 고칩니다(이름·종류·내 지위·사건 경위). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  const { caseId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  let parsed;
  try {
    parsed = legalCaseInputSchema.parse(body.body);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "사건 정보를 확인해 주세요." }, { status: 400 });
    throw error;
  }

  try {
    const updated = await updateLegalCase(caseId, guard.userId, parsed);
    return NextResponse.json({ case: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof LegalCaseStoreError && error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "사건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "사건을 고치지 못했습니다." }, { status: 502 });
  }
}

/**
 * 사건을 지웁니다. 자료·문서도 함께 사라집니다(표의 on delete cascade).
 *
 * 사건 자료는 이 서비스에서 가장 민감한 자료라, 지우는 길이 반드시 있어야
 * 합니다. 되돌릴 수 없으므로 화면에서 한 번 더 묻습니다.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  const { caseId } = await context.params;
  try {
    await deleteLegalCase(caseId, guard.userId);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "사건을 지우지 못했습니다." }, { status: 502 });
  }
}

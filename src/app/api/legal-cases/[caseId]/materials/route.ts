import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { legalMaterialInputSchema, LEGAL_CASE_MAX_MATERIALS } from "@/domain/legal-case";
import { addLegalCaseMaterials, deleteLegalCaseMaterial, LegalCaseStoreError, loadLegalCase } from "@/server/legal/legal-case-repository";
import { guardMemberRequest, readJsonBody } from "@/server/http/request-guards";

export const runtime = "nodejs";

const addSchema = z.object({ materials: z.array(legalMaterialInputSchema).min(1).max(LEGAL_CASE_MAX_MATERIALS) });
const removeSchema = z.object({ materialId: z.string().uuid() });

/**
 * 사건에 자료를 붙입니다.
 *
 * 다른 제작 기능과 달리 여기서는 **자료가 서버에 저장됩니다**. 사건은 몇 달에
 * 걸쳐 이어지고, 문서를 만들 때마다 계약서를 다시 올리게 하면 세 번째쯤에서
 * 사람이 떠납니다. 대신 본인만 열 수 있고(RLS + owner 조건), 사건을 지우면
 * 함께 지워집니다.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  const { caseId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  let parsed;
  try {
    parsed = addSchema.parse(body.body);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "보낸 자료의 형식이 올바르지 않습니다." }, { status: 400 });
    throw error;
  }

  // 사건이 내 것인지 먼저 봅니다. 자료 삽입만 막아도 되지만, 남의 사건 id로
  // 넣으려 한 요청에는 "찾지 못했다"고 답하는 편이 정확합니다.
  const legalCase = await loadLegalCase(caseId, guard.userId);
  if (!legalCase) return NextResponse.json({ error: "사건을 찾지 못했습니다.", code: "NOT_FOUND" }, { status: 404 });

  try {
    const created = await addLegalCaseMaterials(caseId, guard.userId, parsed.materials);
    return NextResponse.json({ materials: created }, { status: 201 });
  } catch (error) {
    if (error instanceof LegalCaseStoreError && error.code === "TOO_MANY_MATERIALS") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    return NextResponse.json({ error: "자료를 저장하지 못했습니다." }, { status: 502 });
  }
}

/** 자료 한 개를 지웁니다. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const guard = await guardMemberRequest(request);
  if (!guard.ok) return guard.response;

  await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  let parsed;
  try {
    parsed = removeSchema.parse(body.body);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "지울 자료를 찾지 못했습니다." }, { status: 400 });
    throw error;
  }

  try {
    await deleteLegalCaseMaterial(parsed.materialId, guard.userId);
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "자료를 지우지 못했습니다." }, { status: 502 });
  }
}

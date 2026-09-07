import "server-only";

import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";
import {
  legalCaseTypeSchema, legalDocumentOutputSchema, legalDocumentTypeSchema, legalMaterialKindSchema, legalPartyRoleSchema,
  LEGAL_CASE_MAX_MATERIALS,
  type LegalCase, type LegalCaseDocument, type LegalCaseMaterial, type LegalCaseInput, type LegalDocumentOutput, type LegalDocumentType, type LegalMaterialInput,
} from "@/domain/legal-case";

/**
 * 사건·자료·문서 세 표를 다루는 곳.
 *
 * 서비스 키로 씁니다. 사건과 자료는 RLS로도 본인만 만질 수 있지만, 읽고 쓰는
 * 길을 하나로 두면 "누구 것인지"를 확인하는 자리도 하나입니다. 모든 함수가
 * `ownerUserId`를 조건에 함께 넣습니다 — 사건 id만으로 여는 함수는 여기에
 * 하나도 없습니다.
 */

export class LegalCaseStoreError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "LegalCaseStoreError";
  }
}

const caseRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  case_type: legalCaseTypeSchema,
  my_role: legalPartyRoleSchema,
  summary: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const materialRowSchema = z.object({
  id: z.string().uuid(),
  kind: legalMaterialKindSchema,
  filename: z.string(),
  text: z.string(),
  size_bytes: z.number().int(),
  created_at: z.string(),
});

const documentRowSchema = z.object({
  id: z.string().uuid(),
  doc_type: legalDocumentTypeSchema,
  title: z.string(),
  output: z.unknown(),
  created_at: z.string(),
});

const CASE_COLUMNS = "id, title, case_type, my_role, summary, created_at, updated_at";
const MATERIAL_COLUMNS = "id, kind, filename, text, size_bytes, created_at";
const DOCUMENT_COLUMNS = "id, doc_type, title, output, created_at";

function toCase(row: z.infer<typeof caseRowSchema>): LegalCase {
  return {
    id: row.id,
    title: row.title,
    caseType: row.case_type,
    myRole: row.my_role,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMaterial(row: z.infer<typeof materialRowSchema>): LegalCaseMaterial {
  return { id: row.id, kind: row.kind, filename: row.filename, text: row.text, sizeBytes: row.size_bytes, createdAt: row.created_at };
}

export async function createLegalCase(ownerUserId: string, input: LegalCaseInput): Promise<LegalCase> {
  const { data, error } = await serviceClient()
    .from("legal_cases")
    .insert({ owner_user_id: ownerUserId, title: input.title, case_type: input.caseType, my_role: input.myRole, summary: input.summary })
    .select(CASE_COLUMNS)
    .single();
  if (error || !data) throw new LegalCaseStoreError(error?.message ?? "사건을 만들지 못했습니다.", "CREATE_FAILED");
  return toCase(caseRowSchema.parse(data));
}

export async function listLegalCases(ownerUserId: string): Promise<LegalCase[]> {
  const { data, error } = await serviceClient()
    .from("legal_cases")
    .select(CASE_COLUMNS)
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new LegalCaseStoreError(error.message, "LIST_FAILED");
  return (data ?? []).map((row) => toCase(caseRowSchema.parse(row)));
}

export async function loadLegalCase(caseId: string, ownerUserId: string): Promise<LegalCase | null> {
  const { data, error } = await serviceClient()
    .from("legal_cases")
    .select(CASE_COLUMNS)
    .eq("id", caseId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new LegalCaseStoreError(error.message, "LOAD_FAILED");
  return data ? toCase(caseRowSchema.parse(data)) : null;
}

export async function updateLegalCase(caseId: string, ownerUserId: string, input: LegalCaseInput): Promise<LegalCase> {
  const { data, error } = await serviceClient()
    .from("legal_cases")
    .update({ title: input.title, case_type: input.caseType, my_role: input.myRole, summary: input.summary })
    .eq("id", caseId)
    .eq("owner_user_id", ownerUserId)
    .select(CASE_COLUMNS)
    .maybeSingle();
  if (error) throw new LegalCaseStoreError(error.message, "UPDATE_FAILED");
  if (!data) throw new LegalCaseStoreError("사건을 찾지 못했습니다.", "NOT_FOUND");
  return toCase(caseRowSchema.parse(data));
}

export async function deleteLegalCase(caseId: string, ownerUserId: string): Promise<void> {
  const { error } = await serviceClient()
    .from("legal_cases")
    .delete()
    .eq("id", caseId)
    .eq("owner_user_id", ownerUserId);
  if (error) throw new LegalCaseStoreError(error.message, "DELETE_FAILED");
}

export async function listLegalCaseMaterials(caseId: string, ownerUserId: string): Promise<LegalCaseMaterial[]> {
  const { data, error } = await serviceClient()
    .from("legal_case_materials")
    .select(MATERIAL_COLUMNS)
    .eq("case_id", caseId)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: true });
  if (error) throw new LegalCaseStoreError(error.message, "MATERIALS_FAILED");
  return (data ?? []).map((row) => toMaterial(materialRowSchema.parse(row)));
}

export async function addLegalCaseMaterials(caseId: string, ownerUserId: string, inputs: readonly LegalMaterialInput[]): Promise<LegalCaseMaterial[]> {
  if (!inputs.length) return [];
  const existing = await listLegalCaseMaterials(caseId, ownerUserId);
  // 상한을 넘기면 넣지 않고 그렇다고 말합니다. 조용히 잘라 넣으면 사용자는
  // 올린 자료가 근거에 들어간 줄 압니다.
  if (existing.length + inputs.length > LEGAL_CASE_MAX_MATERIALS) {
    throw new LegalCaseStoreError(`자료는 사건당 ${LEGAL_CASE_MAX_MATERIALS}개까지 넣을 수 있습니다.`, "TOO_MANY_MATERIALS");
  }

  const { data, error } = await serviceClient()
    .from("legal_case_materials")
    .insert(inputs.map((input) => ({
      case_id: caseId,
      owner_user_id: ownerUserId,
      kind: input.kind,
      filename: input.filename,
      text: input.text,
      size_bytes: input.sizeBytes,
    })))
    .select(MATERIAL_COLUMNS);
  if (error) throw new LegalCaseStoreError(error.message, "MATERIAL_CREATE_FAILED");
  return (data ?? []).map((row) => toMaterial(materialRowSchema.parse(row)));
}

export async function deleteLegalCaseMaterial(materialId: string, ownerUserId: string): Promise<void> {
  const { error } = await serviceClient()
    .from("legal_case_materials")
    .delete()
    .eq("id", materialId)
    .eq("owner_user_id", ownerUserId);
  if (error) throw new LegalCaseStoreError(error.message, "MATERIAL_DELETE_FAILED");
}

/**
 * 결제 건에 적어 둔 "어느 사건의 어느 문서인가".
 *
 * 공통 수명주기(`build-lifecycle.ts`)는 표마다 다른 열을 모릅니다 — 그쪽 스키마는
 * 상태와 결제 정보만 읽고 나머지는 버립니다. 그래서 이 두 값만 따로 읽습니다.
 * 화면이 보낸 문서 종류를 믿지 않기 위해 필요한 값이라, 없으면 만들지 않습니다.
 */
export async function loadLegalBuildTarget(buildId: string, ownerUserId: string): Promise<{ caseId: string | null; docType: LegalDocumentType } | null> {
  const { data, error } = await serviceClient()
    .from("legal_document_builds")
    .select("case_id, doc_type")
    .eq("id", buildId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new LegalCaseStoreError(error.message, "BUILD_TARGET_FAILED");
  if (!data) return null;
  const parsed = z.object({ case_id: z.string().uuid().nullable(), doc_type: legalDocumentTypeSchema }).parse(data);
  return { caseId: parsed.case_id, docType: parsed.doc_type };
}

export async function listLegalCaseDocuments(caseId: string, ownerUserId: string): Promise<LegalCaseDocument[]> {
  const { data, error } = await serviceClient()
    .from("legal_case_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("case_id", caseId)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  if (error) throw new LegalCaseStoreError(error.message, "DOCUMENTS_FAILED");

  const rows = (data ?? []).map((row) => documentRowSchema.parse(row));
  return rows.flatMap((row) => {
    // 예전 형식으로 저장된 문서가 있으면 목록 전체를 죽이지 않고 그것만
    // 건너뜁니다. 사건 화면이 문서 하나 때문에 안 열리면 나머지 문서도 못 봅니다.
    const parsed = legalDocumentOutputSchema.safeParse(row.output);
    if (!parsed.success) return [];
    return [{ id: row.id, docType: row.doc_type, title: row.title, output: parsed.data, createdAt: row.created_at }];
  });
}

export async function saveLegalCaseDocument(input: {
  caseId: string;
  ownerUserId: string;
  docType: LegalDocumentType;
  title: string;
  output: LegalDocumentOutput;
}): Promise<LegalCaseDocument> {
  const { data, error } = await serviceClient()
    .from("legal_case_documents")
    .insert({
      case_id: input.caseId,
      owner_user_id: input.ownerUserId,
      doc_type: input.docType,
      title: input.title,
      output: input.output,
    })
    .select(DOCUMENT_COLUMNS)
    .single();
  if (error || !data) throw new LegalCaseStoreError(error?.message ?? "문서를 저장하지 못했습니다.", "DOCUMENT_SAVE_FAILED");
  const row = documentRowSchema.parse(data);
  return { id: row.id, docType: row.doc_type, title: row.title, output: input.output, createdAt: row.created_at };
}

export async function deleteLegalCaseDocument(documentId: string, ownerUserId: string): Promise<void> {
  const { error } = await serviceClient()
    .from("legal_case_documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_user_id", ownerUserId);
  if (error) throw new LegalCaseStoreError(error.message, "DOCUMENT_DELETE_FAILED");
}

/**
 * 이 건에 실제로 든 원가를 결제 건에 적어 둡니다.
 *
 * 실패해도 문서 생성을 되돌리지 않습니다 — 손님은 이미 결과를 받았고,
 * 원가 기록은 우리 쪽 장부입니다. 장부를 못 적었다고 결과를 물리면 안 됩니다.
 */
export async function recordLegalBuildCost(input: {
  buildId: string;
  ownerUserId: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costKrw: number | null;
  modelTier: string | null;
  model: string | null;
  pages: number | null;
}): Promise<void> {
  const { error } = await serviceClient()
    .from("legal_document_builds")
    .update({
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      cost_krw: input.costKrw,
      model_tier: input.modelTier,
      model: input.model,
      pages: input.pages,
    })
    .eq("id", input.buildId)
    .eq("owner_user_id", input.ownerUserId);
  if (error) console.error("legal_build_cost_record_failed", JSON.stringify({ buildId: input.buildId, detail: error.message.slice(0, 200) }));
}

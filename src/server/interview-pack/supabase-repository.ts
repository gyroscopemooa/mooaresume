import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  finalHintsSchema,
  materialsPayloadSchema,
  packAssessmentSchema,
  packCardSchema,
  packSlotIdSchema,
  USAGE_KINDS,
  type FinalHints,
  type MaterialDoc,
  type PackLimits,
  type PackSlotId,
  type StoredAnswer,
  type UsageKind,
} from "@/domain/interview-pack";
import { mapDocumentKind } from "@/domain/interview-pack-text";
import { resultDocumentSchema } from "@/domain/result-document";
import type {
  AiCallRecord,
  FinalRunSource,
  PackAccessSource,
  PackRecord,
  PackRepository,
  RunAccess,
  ReserveOutcome,
  SavedAnswerInput,
  StoredMaterials,
  UsageCounts,
} from "./types";

/**
 * 면접 준비팩 저장소의 Supabase 구현.
 *
 * 서비스 키(SUPABASE_SECRET_KEY)를 쓰므로 서버에서만 만들 수 있다. RLS 를 우회하는 대신
 *  1) 읽기는 언제나 `owner_user_id` 로 직접 거르고,
 *  2) 쓰기는 DB 함수로만 하며 각 함수가 소유자·권한을 다시 확인한다.
 * 라우트가 검증한 사용자 id 외의 값이 여기까지 오는 길은 없다.
 */

function serviceClient(): SupabaseClient {
  const url = z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const PACK_COLUMNS = [
  "id", "owner_user_id", "origin", "analysis_run_id", "access_source", "is_test", "test_grant_id", "label",
  "materials_version", "assessment", "assessment_materials_version", "limit_initial", "limit_edit", "limit_check",
  "limit_complete", "initial_generated_at", "busy_kind", "busy_until", "created_at",
].join(", ");

const packRowSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  origin: z.enum(["final_run", "admin_snapshot"]),
  analysis_run_id: z.string().uuid().nullable(),
  access_source: z.enum(["polar", "google_play", "mooa_credit", "admin_test", "unknown"]),
  is_test: z.boolean(),
  test_grant_id: z.string().uuid().nullable(),
  label: z.string().nullable(),
  materials_version: z.number().int(),
  assessment: z.unknown().nullable(),
  assessment_materials_version: z.number().int().nullable(),
  limit_initial: z.number().int(),
  limit_edit: z.number().int(),
  limit_check: z.number().int(),
  limit_complete: z.number().int(),
  initial_generated_at: z.string().nullable(),
  busy_kind: z.enum(USAGE_KINDS).nullable(),
  busy_until: z.string().nullable(),
  created_at: z.string(),
});

function toPackRecord(row: z.infer<typeof packRowSchema>): PackRecord {
  const assessment = row.assessment ? packAssessmentSchema.safeParse(row.assessment) : null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    origin: row.origin,
    analysisRunId: row.analysis_run_id,
    accessSource: row.access_source as PackAccessSource,
    isTest: row.is_test,
    testGrantId: row.test_grant_id,
    label: row.label,
    materialsVersion: row.materials_version,
    assessment: assessment?.success ? assessment.data : null,
    assessmentMaterialsVersion: row.assessment_materials_version,
    limits: { initial: row.limit_initial, edit: row.limit_edit, check: row.limit_check, complete: row.limit_complete },
    initialGeneratedAt: row.initial_generated_at,
    busyKind: row.busy_kind,
    busyUntil: row.busy_until,
    createdAt: row.created_at,
  };
}

const answerRowSchema = z.object({
  id: z.string().uuid(),
  slot: packSlotIdSchema,
  revision_no: z.number().int(),
  origin: z.enum(["ai", "ai_revised", "user_edited", "restored"]),
  materials_version: z.number().int(),
  card: z.unknown(),
  created_at: z.string(),
});

function toStoredAnswer(row: unknown): StoredAnswer | null {
  const parsed = answerRowSchema.safeParse(row);
  if (!parsed.success) return null;
  const card = packCardSchema.safeParse(parsed.data.card);
  // 형식이 바뀐 옛 행은 건너뛴다. 화면 전체가 깨지는 것보다 그 카드만 안 보이는 편이 낫다.
  if (!card.success) return null;
  return {
    id: parsed.data.id,
    slot: parsed.data.slot,
    revisionNo: parsed.data.revision_no,
    origin: parsed.data.origin,
    materialsVersion: parsed.data.materials_version,
    card: card.data,
    createdAt: parsed.data.created_at,
  };
}

const reserveSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("RESERVED"), usageId: z.string().uuid(), used: z.number().int(), limit: z.number().int() }),
  z.object({ outcome: z.literal("DUPLICATE"), usageId: z.string().uuid(), state: z.enum(["reserved", "confirmed", "released"]), kind: z.enum(USAGE_KINDS) }),
  z.object({ outcome: z.literal("BUSY"), kind: z.enum(USAGE_KINDS).nullable().optional() }),
  z.object({ outcome: z.literal("LIMIT_REACHED"), used: z.number().int(), limit: z.number().int() }),
  z.object({ outcome: z.literal("INITIAL_REQUIRED") }),
  z.object({ outcome: z.literal("DENIED"), reason: z.string() }),
]);

/** DB 함수가 던진 오류의 코드(메시지 앞부분)를 뽑는다. 자료 내용은 메시지에 없다. */
export class PackDbError extends Error {
  constructor(readonly code: string, readonly sqlState: string | null) {
    super(code);
    this.name = "PackDbError";
  }
}

function dbError(error: { message: string; code?: string | null }): PackDbError {
  const code = error.message.split(":")[0].trim().split(/\s+/)[0] || "DATABASE_ERROR";
  return new PackDbError(code, error.code ?? null);
}

const PRIORITY: Record<string, number> = { job_posting: 0, resume: 1, cover_letter: 2, experience: 3, note: 4, certificate: 5, other: 6 };

export class SupabasePackRepository implements PackRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = serviceClient()) {
    this.client = client;
  }

  async getPack(ownerUserId: string, packId: string): Promise<PackRecord | null> {
    const { data, error } = await this.client.from("interview_packs").select(PACK_COLUMNS).eq("id", packId).eq("owner_user_id", ownerUserId).maybeSingle();
    if (error) throw dbError(error);
    const parsed = packRowSchema.safeParse(data);
    return parsed.success ? toPackRecord(parsed.data) : null;
  }

  async getPackByRun(ownerUserId: string, analysisRunId: string): Promise<PackRecord | null> {
    const { data, error } = await this.client.from("interview_packs").select(PACK_COLUMNS).eq("analysis_run_id", analysisRunId).eq("owner_user_id", ownerUserId).maybeSingle();
    if (error) throw dbError(error);
    const parsed = packRowSchema.safeParse(data);
    return parsed.success ? toPackRecord(parsed.data) : null;
  }

  async getMaterials(packId: string, version: number): Promise<StoredMaterials | null> {
    const { data, error } = await this.client.from("interview_pack_materials").select("version_no, payload").eq("pack_id", packId).eq("version_no", version).maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const payload = materialsPayloadSchema.safeParse(data.payload);
    return payload.success ? { version: Number(data.version_no), payload: payload.data } : null;
  }

  async listCurrentAnswers(packId: string): Promise<StoredAnswer[]> {
    const { data, error } = await this.client
      .from("interview_pack_answers")
      .select("id, slot, revision_no, origin, materials_version, card, created_at")
      .eq("pack_id", packId)
      .order("revision_no", { ascending: false });
    if (error) throw dbError(error);
    const latest = new Map<PackSlotId, StoredAnswer>();
    for (const row of data ?? []) {
      const answer = toStoredAnswer(row);
      // 최신 판부터 읽으므로 슬롯마다 처음 만난 것이 현재 판이다.
      if (answer && !latest.has(answer.slot)) latest.set(answer.slot, answer);
    }
    return [...latest.values()];
  }

  async listAnswerRevisions(packId: string, slot: PackSlotId): Promise<StoredAnswer[]> {
    const { data, error } = await this.client
      .from("interview_pack_answers")
      .select("id, slot, revision_no, origin, materials_version, card, created_at")
      .eq("pack_id", packId)
      .eq("slot", slot)
      .order("revision_no", { ascending: false })
      .limit(30);
    if (error) throw dbError(error);
    return (data ?? []).map(toStoredAnswer).filter((answer): answer is StoredAnswer => answer !== null);
  }

  async countUsage(packId: string): Promise<UsageCounts> {
    const { data, error } = await this.client.from("interview_pack_usage").select("kind, state, reserved_at").eq("pack_id", packId);
    if (error) throw dbError(error);
    const counts: UsageCounts = { check: 0, initial: 0, complete: 0, edit: 0 };
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const row of data ?? []) {
      const kind = row.kind as UsageKind;
      if (!(kind in counts)) continue;
      // DB 함수와 같은 규칙: 확정된 것 + 5분 안의 진행 중 예약만 센다.
      if (row.state === "confirmed" || (row.state === "reserved" && new Date(String(row.reserved_at)).getTime() > cutoff)) counts[kind] += 1;
    }
    return counts;
  }

  async getFinalRunSummary(ownerUserId: string, analysisRunId: string) {
    const { data, error } = await this.client.from("analysis_runs").select("product, status, completed_at").eq("id", analysisRunId).eq("owner_user_id", ownerUserId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    return { product: String(data.product), status: String(data.status), completedAt: (data.completed_at as string | null) ?? null };
  }

  async getRunAccess(ownerUserId: string, analysisRunId: string): Promise<RunAccess> {
    const { data, error } = await this.client.rpc("interview_pack_run_access", { p_run_id: analysisRunId, p_owner_user_id: ownerUserId });
    if (error) throw dbError(error);
    const parsed = z.object({
      allowed: z.boolean(),
      reason: z.string().nullable().optional(),
      accessSource: z.enum(["polar", "google_play", "mooa_credit", "admin_test", "unknown"]).optional(),
      testGrantId: z.string().uuid().nullable().optional(),
      completedAt: z.string().nullable().optional(),
    }).parse(data);
    if (!parsed.allowed || !parsed.accessSource) return { allowed: false, reason: parsed.reason ?? "NOT_ALLOWED" };
    return { allowed: true, accessSource: parsed.accessSource, testGrantId: parsed.testGrantId ?? null, completedAt: parsed.completedAt ?? null };
  }

  async loadFinalRunSource(ownerUserId: string, analysisRunId: string): Promise<FinalRunSource | null> {
    const { data: run, error: runError } = await this.client
      .from("analysis_runs")
      .select("id, submission_snapshot_id, completed_at")
      .eq("id", analysisRunId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (runError) throw dbError(runError);
    if (!run) return null;

    const { data: items, error: itemError } = await this.client
      .from("submission_snapshot_items")
      .select("document_version_id")
      .eq("snapshot_id", run.submission_snapshot_id)
      .eq("owner_user_id", ownerUserId);
    if (itemError) throw dbError(itemError);
    const versionIds = (items ?? []).map((item) => String(item.document_version_id));

    const docs: MaterialDoc[] = [];
    if (versionIds.length > 0) {
      const { data: versions, error: versionError } = await this.client
        .from("document_versions")
        .select("id, document_id, original_filename, normalized_text, documents(kind, title)")
        .in("id", versionIds)
        .eq("owner_user_id", ownerUserId);
      if (versionError) throw dbError(versionError);
      for (const version of versions ?? []) {
        const embedded = version.documents as unknown as { kind?: string; title?: string } | Array<{ kind?: string; title?: string }> | null;
        const doc = Array.isArray(embedded) ? embedded[0] : embedded;
        const kind = mapDocumentKind(String(doc?.kind ?? ""));
        const text = typeof version.normalized_text === "string" ? version.normalized_text : "";
        // 수정 요청 메모는 답변 자료가 아니라 첨삭 지시다. 텍스트가 없는 문서(파일만 있는 것)도 읽을 수 없다.
        if (!kind || !text.trim()) continue;
        docs.push({
          id: "pending",
          kind,
          title: (doc?.title || version.original_filename || "제출 자료").toString().slice(0, 160),
          text,
          documentId: String(version.document_id),
          documentVersionId: String(version.id),
          filename: version.original_filename ? String(version.original_filename) : null,
        });
      }
      docs.sort((a, b) => (PRIORITY[a.kind] ?? 9) - (PRIORITY[b.kind] ?? 9));
    }

    const { data: result, error: resultError } = await this.client
      .from("analysis_results")
      .select("result_data")
      .eq("analysis_run_id", analysisRunId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (resultError) throw dbError(resultError);
    const parsedResult = resultDocumentSchema.safeParse(result?.result_data);

    let hints: FinalHints = { careerTimeline: [], documentConflicts: [] };
    let company = "";
    let role = "";
    if (parsedResult.success) {
      company = parsedResult.data.company;
      role = parsedResult.data.role;
      hints = finalHintsSchema.parse({
        careerTimeline: parsedResult.data.careerTimeline.slice(0, 20).map((entry) => `${entry.period} · ${entry.title} (${entry.source})`.slice(0, 300)),
        documentConflicts: parsedResult.data.documentConflicts.slice(0, 10).map((entry) => `[${entry.field}] 이력서: ${entry.resumeStatement} / 자소서: ${entry.coverLetterQuote}`.slice(0, 400)),
      });
    }

    return { docs, company, role, hints, completedAt: (run.completed_at as string | null) ?? null };
  }

  async createPack(input: { ownerUserId: string; analysisRunId: string; materials: unknown; limits: PackLimits }) {
    const { data, error } = await this.client.rpc("create_interview_pack", {
      p_owner_user_id: input.ownerUserId,
      p_analysis_run_id: input.analysisRunId,
      p_materials: input.materials,
      p_limits: input.limits,
    });
    if (error) throw dbError(error);
    const parsed = z.object({ packId: z.string().uuid(), created: z.boolean() }).parse(data);
    return parsed;
  }

  async createAdminSnapshotPack(input: { ownerUserId: string; materials: unknown; limits: PackLimits; label: string | null; clonedFromRunId: string | null }) {
    const { data, error } = await this.client.rpc("create_admin_snapshot_pack", {
      p_owner_user_id: input.ownerUserId,
      p_materials: input.materials,
      p_limits: input.limits,
      p_label: input.label,
      p_cloned_from_run_id: input.clonedFromRunId,
    });
    if (error) throw dbError(error);
    return { packId: z.object({ packId: z.string().uuid() }).parse(data).packId };
  }

  async saveMaterials(ownerUserId: string, packId: string, payload: unknown): Promise<number> {
    const { data, error } = await this.client.rpc("save_interview_pack_materials", { p_owner_user_id: ownerUserId, p_pack_id: packId, p_payload: payload });
    if (error) throw dbError(error);
    return z.number().int().parse(data);
  }

  async reserveUsage(input: { ownerUserId: string; packId: string; kind: UsageKind; requestKey: string; slot: PackSlotId | null }): Promise<ReserveOutcome> {
    const { data, error } = await this.client.rpc("reserve_interview_pack_usage", {
      p_owner_user_id: input.ownerUserId,
      p_pack_id: input.packId,
      p_kind: input.kind,
      p_request_key: input.requestKey,
      p_slot: input.slot,
    });
    if (error) throw dbError(error);
    const parsed = reserveSchema.parse(data);
    return parsed.outcome === "BUSY" ? { outcome: "BUSY", kind: parsed.kind ?? null } : parsed;
  }

  async settleUsage(ownerUserId: string, usageId: string, state: "released" | "confirmed", failureCode: string | null): Promise<boolean> {
    const { data, error } = await this.client.rpc("settle_interview_pack_usage", {
      p_owner_user_id: ownerUserId,
      p_usage_id: usageId,
      p_state: state,
      p_failure_code: failureCode,
    });
    if (error) throw dbError(error);
    return data === true;
  }

  async saveAssessment(input: { ownerUserId: string; usageId: string; materialsVersion: number; assessment: unknown }): Promise<void> {
    const { error } = await this.client.rpc("save_interview_pack_assessment", {
      p_owner_user_id: input.ownerUserId,
      p_usage_id: input.usageId,
      p_materials_version: input.materialsVersion,
      p_assessment: input.assessment,
    });
    if (error) throw dbError(error);
  }

  async refreshAssessment(input: { ownerUserId: string; packId: string; materialsVersion: number; assessment: unknown }): Promise<boolean> {
    const { data, error } = await this.client.rpc("refresh_interview_pack_assessment", {
      p_owner_user_id: input.ownerUserId,
      p_pack_id: input.packId,
      p_materials_version: input.materialsVersion,
      p_assessment: input.assessment,
    });
    if (error) throw dbError(error);
    return data === true;
  }

  async saveAnswers(input: { ownerUserId: string; usageId: string; materialsVersion: number; cards: SavedAnswerInput[] }): Promise<number> {
    const { data, error } = await this.client.rpc("save_interview_pack_answers", {
      p_owner_user_id: input.ownerUserId,
      p_usage_id: input.usageId,
      p_materials_version: input.materialsVersion,
      p_cards: input.cards.map((entry) => ({ slot: entry.slot, card: entry.card, model: entry.model, promptVersion: entry.promptVersion })),
    });
    if (error) throw dbError(error);
    return z.object({ saved: z.number().int() }).parse(data).saved;
  }

  async saveUserAnswer(input: { ownerUserId: string; packId: string; slot: PackSlotId; origin: "user_edited" | "restored"; baseRevision: number; materialsVersion: number; card: unknown }): Promise<number> {
    const { data, error } = await this.client.rpc("save_interview_pack_user_answer", {
      p_owner_user_id: input.ownerUserId,
      p_pack_id: input.packId,
      p_slot: input.slot,
      p_origin: input.origin,
      p_base_revision: input.baseRevision,
      p_materials_version: input.materialsVersion,
      p_card: input.card,
    });
    if (error) throw dbError(error);
    return z.number().int().parse(data);
  }

  async recordAiCall(record: AiCallRecord): Promise<void> {
    // 원장 기록이 실패해도 사용자 요청을 막지 않는다(interview-attempt-ledger 와 같은 원칙). 다만 흔적은 남긴다.
    const { error } = await this.client.from("interview_pack_ai_calls").insert({
      owner_user_id: record.ownerUserId,
      pack_id: record.packId,
      is_test: record.isTest,
      purpose: record.purpose,
      outcome: record.outcome,
      model: record.model ?? null,
      response_id: record.responseId ?? null,
      input_tokens: record.inputTokens ?? null,
      output_tokens: record.outputTokens ?? null,
      total_tokens: record.totalTokens ?? null,
      failure_code: record.failureCode ?? null,
    });
    if (error) console.error("interview_pack_ai_call_not_recorded", error.code ?? "UNKNOWN");
  }

  async countTestAiCallsSince(sinceIso: string): Promise<number> {
    // head 요청 대신 일반 조회 + count 헤더. 표가 없거나 읽지 못하면 0 으로 얼버무리지 않고 실패시킨다
    // (하루 한도라는 안전장치가 조용히 꺼지면 안 된다).
    const { count, error } = await this.client
      .from("interview_pack_ai_calls")
      .select("id", { count: "exact" })
      .eq("is_test", true)
      .gte("created_at", sinceIso)
      .limit(1);
    if (error) throw dbError(error);
    if (count === null) throw new PackDbError("COUNT_UNAVAILABLE", null);
    return count;
  }

  async deleteTestPacks(ownerUserId: string, packIds: string[]): Promise<number> {
    if (packIds.length === 0) return 0;
    const { data, error } = await this.client.rpc("delete_admin_test_packs", { p_owner_user_id: ownerUserId, p_pack_ids: packIds });
    if (error) throw dbError(error);
    return z.number().int().parse(data);
  }

  /** 관리자 콘솔용: 내 완료된 FINAL 결과(복제 후보). */
  async listOwnCompletedFinalRuns(ownerUserId: string): Promise<Array<{ id: string; completedAt: string | null; company: string; role: string }>> {
    const { data, error } = await this.client
      .from("analysis_runs")
      .select("id, completed_at, application_cases(company_name, role_name, title)")
      .eq("owner_user_id", ownerUserId)
      .eq("product", "FINAL")
      .eq("status", "COMPLETED")
      .order("completed_at", { ascending: false })
      .limit(10);
    if (error) throw dbError(error);
    return (data ?? []).map((row) => {
      const embedded = row.application_cases as unknown as { company_name?: string | null; role_name?: string | null; title?: string | null } | Array<{ company_name?: string | null; role_name?: string | null; title?: string | null }> | null;
      const applicationCase = Array.isArray(embedded) ? embedded[0] : embedded;
      return {
        id: String(row.id),
        completedAt: (row.completed_at as string | null) ?? null,
        company: applicationCase?.company_name ?? applicationCase?.title ?? "",
        role: applicationCase?.role_name ?? "",
      };
    });
  }

  /** 마이그레이션이 적용됐는지 확인한다(없는 표를 읽으면 콘솔이 오류로 죽는 대신 안내를 띄우기 위해). */
  async checkSchema(): Promise<{ ready: boolean; missing: string[] }> {
    const missing: string[] = [];
    for (const table of ["admin_test_grants", "admin_test_material_sets", "interview_packs", "interview_pack_ai_calls"]) {
      // head 요청은 쓰지 않는다: 없는 표에 대한 HEAD 404 는 본문이 비어 supabase-js 가 오류 없이 "성공"으로 돌려준다.
      const { error } = await this.client.from(table).select("id").limit(1);
      if (error) missing.push(table);
    }
    return { ready: missing.length === 0, missing };
  }

  async listTestPacks(ownerUserId: string) {
    const { data, error } = await this.client
      .from("interview_packs")
      .select("id, label, origin, analysis_run_id, created_at, initial_generated_at, materials_version")
      .eq("owner_user_id", ownerUserId)
      .eq("access_source", "admin_test")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw dbError(error);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      label: (row.label as string | null) ?? null,
      origin: row.origin as "final_run" | "admin_snapshot",
      analysisRunId: (row.analysis_run_id as string | null) ?? null,
      createdAt: String(row.created_at),
      initialGeneratedAt: (row.initial_generated_at as string | null) ?? null,
      materialsVersion: Number(row.materials_version),
    }));
  }
}

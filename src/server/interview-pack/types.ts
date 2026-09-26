import type {
  FinalHints,
  MaterialDoc,
  MaterialsPayload,
  PackAssessment,
  PackCard,
  PackLimits,
  PackSlotId,
  StoredAnswer,
  UsageKind,
} from "@/domain/interview-pack";

/**
 * 면접 준비팩 서버 계층의 공용 타입.
 *
 * 서비스는 이 저장소 인터페이스에만 의존한다. 운영에서는 Supabase 구현을,
 * 테스트에서는 메모리 구현을 넣는다(DB 함수 자체는 별도로 실제 Postgres 에서 검증했다).
 */

export type PackAccessSource = "polar" | "google_play" | "mooa_credit" | "admin_test" | "unknown";

export type PackRecord = {
  id: string;
  ownerUserId: string;
  origin: "final_run" | "admin_snapshot";
  analysisRunId: string | null;
  accessSource: PackAccessSource;
  isTest: boolean;
  testGrantId: string | null;
  label: string | null;
  materialsVersion: number;
  assessment: PackAssessment | null;
  assessmentMaterialsVersion: number | null;
  limits: PackLimits;
  initialGeneratedAt: string | null;
  busyKind: UsageKind | null;
  busyUntil: string | null;
  createdAt: string;
};

export type UsageCounts = Record<UsageKind, number>;

export type RunAccess =
  | { allowed: true; accessSource: PackAccessSource; testGrantId: string | null; completedAt: string | null }
  | { allowed: false; reason: string };

export type ReserveOutcome =
  | { outcome: "RESERVED"; usageId: string; used: number; limit: number }
  | { outcome: "DUPLICATE"; usageId: string; state: "reserved" | "confirmed" | "released"; kind: UsageKind }
  | { outcome: "BUSY"; kind: UsageKind | null }
  | { outcome: "LIMIT_REACHED"; used: number; limit: number }
  | { outcome: "INITIAL_REQUIRED" }
  | { outcome: "DENIED"; reason: string };

/** FINAL 실행에서 읽어 온 원본 자료. 팩의 1번 자료 버전이 된다. */
export type FinalRunSource = {
  docs: MaterialDoc[];
  company: string;
  role: string;
  hints: FinalHints;
  completedAt: string | null;
};

export type StoredMaterials = { version: number; payload: MaterialsPayload };

export type AiCallPurpose = "check" | "generate" | "complete" | "revise";
export type AiCallOutcome = "COMPLETED" | "PROVIDER_FAILED" | "INVALID_OUTPUT" | "ERROR";

export type AiCallRecord = {
  ownerUserId: string;
  packId: string | null;
  isTest: boolean;
  purpose: AiCallPurpose;
  outcome: AiCallOutcome;
  model?: string | null;
  responseId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  failureCode?: string | null;
};

export type SavedAnswerInput = { slot: PackSlotId; card: PackCard; model: string | null; promptVersion: string };

export interface PackRepository {
  // 읽기(항상 소유자로 거른다)
  getPack(ownerUserId: string, packId: string): Promise<PackRecord | null>;
  getPackByRun(ownerUserId: string, analysisRunId: string): Promise<PackRecord | null>;
  getMaterials(packId: string, version: number): Promise<StoredMaterials | null>;
  listCurrentAnswers(packId: string): Promise<StoredAnswer[]>;
  listAnswerRevisions(packId: string, slot: PackSlotId): Promise<StoredAnswer[]>;
  countUsage(packId: string): Promise<UsageCounts>;
  loadFinalRunSource(ownerUserId: string, analysisRunId: string): Promise<FinalRunSource | null>;
  /** 실제 FINAL 실행 여부·완료 시각(정책 확인용). 남의 실행이면 null. */
  getFinalRunSummary(ownerUserId: string, analysisRunId: string): Promise<{ product: string; status: string; completedAt: string | null } | null>;
  /** 이 FINAL 실행으로 팩을 만들어도 되는지(DB 판정). 권한 출처(테스트 여부)도 함께 알려 준다. */
  getRunAccess(ownerUserId: string, analysisRunId: string): Promise<RunAccess>;

  // 쓰기(DB 함수가 소유자·권한을 다시 확인한다)
  createPack(input: { ownerUserId: string; analysisRunId: string; materials: MaterialsPayload; limits: PackLimits }): Promise<{ packId: string; created: boolean }>;
  createAdminSnapshotPack(input: { ownerUserId: string; materials: MaterialsPayload; limits: PackLimits; label: string | null; clonedFromRunId: string | null }): Promise<{ packId: string }>;
  saveMaterials(ownerUserId: string, packId: string, payload: MaterialsPayload): Promise<number>;
  reserveUsage(input: { ownerUserId: string; packId: string; kind: UsageKind; requestKey: string; slot: PackSlotId | null }): Promise<ReserveOutcome>;
  settleUsage(ownerUserId: string, usageId: string, state: "released" | "confirmed", failureCode: string | null): Promise<boolean>;
  saveAssessment(input: { ownerUserId: string; usageId: string; materialsVersion: number; assessment: PackAssessment }): Promise<void>;
  /** 충돌 확인 뒤 상태만 다시 계산한 점검 결과를 저장(AI·사용량 없음). 점검 결과가 없으면 false. */
  refreshAssessment(input: { ownerUserId: string; packId: string; materialsVersion: number; assessment: PackAssessment }): Promise<boolean>;
  saveAnswers(input: { ownerUserId: string; usageId: string; materialsVersion: number; cards: SavedAnswerInput[] }): Promise<number>;
  saveUserAnswer(input: { ownerUserId: string; packId: string; slot: PackSlotId; origin: "user_edited" | "restored"; baseRevision: number; materialsVersion: number; card: PackCard }): Promise<number>;

  // 원장·테스트
  recordAiCall(record: AiCallRecord): Promise<void>;
  countTestAiCallsSince(sinceIso: string): Promise<number>;
  deleteTestPacks(ownerUserId: string, packIds: string[]): Promise<number>;
  listTestPacks(ownerUserId: string): Promise<Array<Pick<PackRecord, "id" | "label" | "origin" | "analysisRunId" | "createdAt" | "initialGeneratedAt" | "materialsVersion">>>;
}

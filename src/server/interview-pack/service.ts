import { z } from "zod";
import {
  PACK_SLOTS,
  isEligibleByPolicy,
  packSlotIdSchema,
  startOfSeoulDayIso,
  type InterviewPackConfig,
  type PackAssessment,
  type PackCard,
  type PackSlotId,
  type StoredAnswer,
  type UsageKind,
} from "@/domain/interview-pack";
import {
  buildBaseMaterials,
  buildNextMaterialsPayload,
  resolveConfirmations,
  supplementInputSchema,
} from "@/domain/interview-pack-materials";
import {
  compactLength,
  resolveEffectiveMaterials,
  sanitizeUserText,
  type EffectiveMaterials,
} from "@/domain/interview-pack-text";
import {
  buildVerifiedAssessment,
  listUnresolvedConflicts,
  recheckEditedCard,
  refreshAssessmentAfterConfirmations,
  verifyGeneratedCard,
} from "@/domain/interview-pack-verify";
import {
  PACK_CALL_TOKEN_LIMITS,
  PackAiInvalidOutputError,
  PackAiProviderError,
  type PackAiGateway,
  type PackAiResult,
} from "@/server/ai/interview-pack/gateway";
import {
  INTERVIEW_PACK_PROMPT_VERSION,
  REVISE_KIND_LABEL,
  type RetryNote,
  type ReviseKind,
} from "@/server/ai/interview-pack/prompt";
import type {
  AiCallOutcome,
  AiCallPurpose,
  PackRecord,
  PackRepository,
  ReserveOutcome,
} from "./types";

/**
 * 면접 준비팩 서비스 — 자료 확인 → 점검 → 생성 → 수정·연습까지의 규칙을 한 곳에 둔다.
 *
 * 지키는 원칙
 *  - 화면에 들어가거나 새로고침하거나 탭을 옮기는 것만으로 AI 를 부르지 않는다(모든 AI 호출은 명시적 요청).
 *  - 호출 전에 소유권·FINAL 권한·남은 횟수를 확인하고, 사용량은 DB 에서 원자적으로 예약한다.
 *  - 실패·잘못된 형식·자료와 맞지 않는 수정본은 예약을 되돌려 사용자 횟수를 깎지 않는다(서버 재시도는 1회로 제한).
 *  - 원문·생성 내용·키워드·근거·자료 버전·프롬프트 버전·모델·토큰을 구분해 저장한다.
 *  - 오류 메시지·로그에는 자료 원문이나 키를 싣지 않는다.
 */

export type PackErrorCode =
  | "NOT_FOUND"
  | "NOT_FINAL"
  | "NOT_COMPLETED"
  | "NOT_ELIGIBLE"
  | "ACCESS_DENIED"
  | "NO_MATERIALS"
  | "NEEDS_CHECK"
  | "NOTHING_TO_GENERATE"
  | "BUSY"
  | "IN_PROGRESS"
  | "LIMIT_REACHED"
  | "INITIAL_REQUIRED"
  | "AI_UNAVAILABLE"
  | "AI_FAILED"
  | "AI_INVALID"
  | "VERIFICATION_FAILED"
  | "TEST_DAILY_LIMIT"
  | "STALE_REVISION"
  | "VALIDATION"
  | "PREVIOUS_ATTEMPT_FAILED"
  | "VERSION_LIMIT";

const STATUS_BY_CODE: Record<PackErrorCode, number> = {
  NOT_FOUND: 404,
  NOT_FINAL: 400,
  NOT_COMPLETED: 409,
  NOT_ELIGIBLE: 403,
  ACCESS_DENIED: 403,
  NO_MATERIALS: 422,
  NEEDS_CHECK: 409,
  NOTHING_TO_GENERATE: 409,
  BUSY: 409,
  IN_PROGRESS: 409,
  LIMIT_REACHED: 402,
  INITIAL_REQUIRED: 409,
  AI_UNAVAILABLE: 503,
  AI_FAILED: 502,
  AI_INVALID: 502,
  VERIFICATION_FAILED: 422,
  TEST_DAILY_LIMIT: 429,
  STALE_REVISION: 409,
  VALIDATION: 400,
  PREVIOUS_ATTEMPT_FAILED: 409,
  VERSION_LIMIT: 409,
};

export class PackServiceError extends Error {
  readonly status: number;
  constructor(readonly code: PackErrorCode, message: string, readonly detail?: Record<string, unknown>) {
    super(message);
    this.name = "PackServiceError";
    this.status = STATUS_BY_CODE[code];
  }
}

export type ModelInfo = { model: string };

export type PackServiceDeps = {
  repo: PackRepository;
  /** OpenAI 설정이 없으면 null. 읽기·직접 수정·연습은 AI 없이 계속 된다. */
  ai: PackAiGateway | null;
  model: ModelInfo | null;
  config: InterviewPackConfig;
  now?: () => Date;
};

// ───────────────────────────── 화면에 내려 주는 상태 ─────────────────────────────

export type UsageView = { used: number; limit: number; remaining: number };

export type PackState = {
  pack: {
    id: string;
    origin: PackRecord["origin"];
    accessSource: PackRecord["accessSource"];
    isTest: boolean;
    label: string | null;
    materialsVersion: number;
    initialGenerated: boolean;
    busy: { kind: UsageKind } | null;
    createdAt: string;
  };
  usage: Record<UsageKind, UsageView>;
  materials: {
    version: number;
    company: string;
    role: string;
    docs: Array<{ id: string; kind: string; title: string; filename: string | null; chars: number; truncated: boolean; preview: string }>;
    supplements: EffectiveMaterials["supplements"];
    slotAnswers: EffectiveMaterials["slotAnswers"];
    confirmations: Array<{ conflictId: string; choice: "left" | "right" | "custom"; customText?: string }>;
    hasJobPosting: boolean;
  };
  assessment: null | {
    materialsVersion: number;
    stale: boolean;
    slots: PackAssessment["slots"];
    conflicts: Array<PackAssessment["conflicts"][number] & { resolved: boolean }>;
    unresolvedConflictCount: number;
  };
  answers: Array<{
    slot: PackSlotId;
    revisionNo: number;
    revisionCount: number;
    origin: StoredAnswer["origin"];
    materialsVersion: number;
    stale: boolean;
    complete: boolean;
    card: PackCard;
    createdAt: string;
  }>;
  /** 관리자 테스트 팩에만 있다. 오늘 남은 실제-AI 호출과 호출별 토큰 상한. */
  testBudget: null | { dailyLimit: number; usedToday: number; remaining: number; tokenLimits: typeof PACK_CALL_TOKEN_LIMITS };
  aiAvailable: boolean;
  promptVersion: string;
};

export type ActionResult = { state: PackState; notice?: string; replayed?: boolean };

const REQUEST_KEY = z.string().trim().min(8).max(80);
const REVISE_KINDS = ["shorten", "direction_strength", "direction_motivation", "direction_aspiration", "replace_material", "custom"] as const;

const ERROR_MESSAGES: Record<string, string> = {
  RUN_NOT_FOUND: "이 결과를 찾지 못했습니다.",
  NOT_FINAL: "면접 준비팩은 FINAL 결과에서만 사용할 수 있습니다.",
  NOT_COMPLETED: "분석이 끝난 뒤에 사용할 수 있습니다.",
  ENTITLEMENT_NOT_FOUND: "이 결과에 연결된 이용권을 확인하지 못했습니다.",
  ORDER_NOT_PAID: "결제가 취소·환불된 결과라 새로 만들 수 없습니다. 이미 만든 답변은 그대로 볼 수 있습니다.",
  TEST_GRANT_REVOKED: "테스트 이용권이 회수되어 새로 만들 수 없습니다.",
  TEST_GRANT_EXPIRED: "테스트 이용권이 만료되어 새로 만들 수 없습니다.",
};

export function describeDenial(reason: string): string {
  return ERROR_MESSAGES[reason] ?? "지금은 이 기능을 사용할 수 없습니다.";
}

// ───────────────────────────── 서비스 ─────────────────────────────

export class InterviewPackService {
  private readonly repo: PackRepository;
  private readonly ai: PackAiGateway | null;
  private readonly model: ModelInfo | null;
  private readonly config: InterviewPackConfig;
  private readonly now: () => Date;

  constructor(deps: PackServiceDeps) {
    this.repo = deps.repo;
    this.ai = deps.ai;
    this.model = deps.model;
    this.config = deps.config;
    this.now = deps.now ?? (() => new Date());
  }

  // ─────────── 열기 ───────────

  /**
   * FINAL 실행에 팩을 연다(없으면 원본 자료 스냅샷으로 새로 만든다). AI 는 부르지 않는다.
   * 권한은 DB 함수가 판정하고, 여기서는 "기존 구매자 적용 정책"만 더한다.
   */
  async openForRun(userId: string, analysisRunId: string): Promise<PackState> {
    const existing = await this.repo.getPackByRun(userId, analysisRunId);
    if (existing) return this.buildState(existing);

    const access = await this.repo.getRunAccess(userId, analysisRunId);
    if (!access.allowed) {
      if (access.reason === "RUN_NOT_FOUND") throw new PackServiceError("NOT_FOUND", describeDenial(access.reason));
      if (access.reason === "NOT_FINAL") throw new PackServiceError("NOT_FINAL", describeDenial(access.reason));
      if (access.reason === "NOT_COMPLETED") throw new PackServiceError("NOT_COMPLETED", describeDenial(access.reason));
      throw new PackServiceError("ACCESS_DENIED", describeDenial(access.reason), { reason: access.reason });
    }
    // 소급 발급 금지: 테스트 이용권이 아니면 명시적 정책값이 열어 둔 범위의 실제 구매 건만 받는다.
    if (access.accessSource !== "admin_test" && !isEligibleByPolicy(this.config, access.completedAt)) {
      throw new PackServiceError("NOT_ELIGIBLE", "이 결과는 면접 준비팩 제공 대상이 아닙니다.");
    }

    const source = await this.repo.loadFinalRunSource(userId, analysisRunId);
    if (!source) throw new PackServiceError("NOT_FOUND", describeDenial("RUN_NOT_FOUND"));
    const materials = buildBaseMaterials({ docs: source.docs, company: source.company, role: source.role, hints: source.hints });
    const created = await this.repo.createPack({ ownerUserId: userId, analysisRunId, materials, limits: this.config.limits });
    const pack = await this.repo.getPack(userId, created.packId);
    if (!pack) throw new PackServiceError("NOT_FOUND", "팩을 만들지 못했습니다.");
    return this.buildState(pack);
  }

  async getState(userId: string, packId: string): Promise<PackState> {
    return this.buildState(await this.requirePack(userId, packId));
  }

  // ─────────── 자료 보완(AI 없음) ───────────

  /**
   * 사용자가 보완한 내용을 "새 자료 버전"으로 저장한다. 원본 스냅샷은 그대로다.
   * 충돌 확인만 바뀐 경우에는 점검 결과의 상태를 코드로 다시 계산해 바로 이어서 생성할 수 있게 한다.
   */
  async saveSupplements(userId: string, packId: string, rawInput: unknown): Promise<ActionResult> {
    const parsed = supplementInputSchema.safeParse(rawInput);
    if (!parsed.success) throw new PackServiceError("VALIDATION", "입력 내용을 확인해 주세요.");
    const pack = await this.requirePack(userId, packId);
    if (pack.busyKind && pack.busyUntil && new Date(pack.busyUntil) > this.now()) {
      throw new PackServiceError("BUSY", "다른 작업이 진행 중입니다. 끝난 뒤 다시 저장해 주세요.");
    }

    const { base, latest } = await this.loadMaterialVersions(pack);
    const confirmationResult = resolveConfirmations(parsed.data.confirmations, pack.assessment);
    if (!confirmationResult.ok) {
      throw new PackServiceError("VALIDATION", confirmationResult.reason === "CUSTOM_TEXT_REQUIRED" ? "직접 입력을 고르셨다면 내용을 적어 주세요." : "확인할 항목을 찾지 못했습니다. 화면을 새로고침해 주세요.");
    }

    const onlyConfirmations = hasOnlyConfirmations(parsed.data);
    const nextPayload = buildNextMaterialsPayload({
      previous: latest.payload,
      supplements: parsed.data.supplements,
      slotAnswers: parsed.data.slotAnswers,
      confirmations: confirmationResult.confirmations,
    });
    // 바뀐 것이 하나도 없으면 새 버전을 만들지 않는다(같은 내용을 저장할 때마다 "이전 자료 기준"이 늘지 않게).
    if (JSON.stringify(stripForCompare(nextPayload)) === JSON.stringify(stripForCompare(latest.payload))) {
      return { state: await this.buildState(pack), notice: "바뀐 내용이 없어 그대로 두었습니다." };
    }

    let version: number;
    try {
      version = await this.repo.saveMaterials(userId, packId, nextPayload);
    } catch (error) {
      if (dbCode(error) === "MATERIAL_VERSION_LIMIT") throw new PackServiceError("VERSION_LIMIT", "자료를 너무 많이 바꿨습니다. 지금 내용으로 점검·생성해 주세요.");
      throw error;
    }

    if (onlyConfirmations && pack.assessment && pack.assessment.materialsVersion === latest.version) {
      const materials = resolveEffectiveMaterials(base, { version, payload: nextPayload });
      const refreshed = refreshAssessmentAfterConfirmations({ ...pack.assessment, materialsVersion: version }, materials.confirmations);
      try {
        await this.repo.refreshAssessment({ ownerUserId: userId, packId, materialsVersion: version, assessment: refreshed });
      } catch (error) {
        // 진행 중인 작업과 겹쳤다면 새 점검이 필요한 것으로 둔다(자료 버전은 이미 저장됨).
        if (dbCode(error) !== "PACK_BUSY") throw error;
      }
    }
    return { state: await this.buildState(await this.requirePack(userId, packId)), notice: "보완한 내용을 새 버전으로 저장했습니다. 원본 자료는 그대로입니다." };
  }

  // ─────────── 점검(AI) ───────────

  /** 자료 점검. 사용자의 "생성권"을 차감하지 않고, 점검 횟수(안전 상한)만 센다. */
  async check(userId: string, packId: string, requestKey: string): Promise<ActionResult> {
    const key = parseRequestKey(requestKey);
    const pack = await this.requirePack(userId, packId);
    const { base, latest } = await this.loadMaterialVersions(pack);
    const materials = resolveEffectiveMaterials(base, latest);
    if (!materials.docs.some((doc) => doc.kind !== "supplement" && doc.text.trim().length >= 20)) {
      throw new PackServiceError("NO_MATERIALS", "점검할 자료가 없습니다. 원본 자료나 채용공고 본문을 붙여 넣어 주세요.");
    }
    const ai = this.requireAi();
    await this.enforceTestDailyCap(pack);

    const reservation = await this.reserve(userId, pack, "check", key, null);
    if (reservation.replay) return { state: await this.buildState(await this.requirePack(userId, packId)), replayed: true };

    let assessmentResult: PackAiResult<ReturnType<typeof buildVerifiedAssessment>> | null = null;
    try {
      const aiResult = await this.callWithRetry(pack, "check", () => ai.assess(materials));
      const assessment = buildVerifiedAssessment(aiResult.output, materials);
      assessmentResult = { ...aiResult, output: assessment };
    } catch (error) {
      await this.release(userId, reservation.usageId, error);
      throw this.toAiError(error);
    }

    try {
      await this.repo.saveAssessment({ ownerUserId: userId, usageId: reservation.usageId, materialsVersion: materials.version, assessment: assessmentResult.output });
    } catch (error) {
      // 예약이 이미 정리됐다면(초기화·만료) 저장하지 않는다. 호출 비용은 원장에 이미 남았다.
      throw this.toSaveError(error);
    }
    return { state: await this.buildState(await this.requirePack(userId, packId)) };
  }

  // ─────────── 생성(AI) ───────────

  /**
   * 답변 생성.
   *  - initial: 팩 최초 생성. 자료가 충분한 항목(만들 수 있음)만 한 번에 만든다.
   *  - complete: 최초 팩에서 보류된 항목을 자료 보완 뒤 이어서 만든다(최초 완성 범위라 사용자 횟수를 깎지 않는다).
   */
  async generate(userId: string, packId: string, requestKey: string, mode: "initial" | "complete"): Promise<ActionResult> {
    const key = parseRequestKey(requestKey);
    const pack = await this.requirePack(userId, packId);
    const { base, latest } = await this.loadMaterialVersions(pack);
    const materials = resolveEffectiveMaterials(base, latest);
    const assessment = pack.assessment;
    if (!assessment || assessment.materialsVersion !== latest.version) {
      throw new PackServiceError("NEEDS_CHECK", assessment ? "자료가 바뀌었습니다. 먼저 다시 점검해 주세요." : "먼저 자료를 점검해 주세요.");
    }

    const current = await this.repo.listCurrentAnswers(packId);
    const haveSlots = new Set(current.map((answer) => answer.slot));
    const readySlots = assessment.slots.filter((slot) => slot.status === "ready").map((slot) => slot.slot);
    const targets = mode === "initial" ? readySlots : readySlots.filter((slot) => !haveSlots.has(slot));
    if (targets.length === 0) {
      throw new PackServiceError("NOTHING_TO_GENERATE", mode === "initial" ? "지금 만들 수 있는 항목이 없습니다. 부족한 자료를 보완한 뒤 다시 점검해 주세요." : "이어서 만들 항목이 없습니다.");
    }
    if (mode === "complete" && !pack.initialGeneratedAt) throw new PackServiceError("INITIAL_REQUIRED", "먼저 답변을 처음 만들어 주세요.");

    const ai = this.requireAi();
    await this.enforceTestDailyCap(pack);
    const reservation = await this.reserve(userId, pack, mode, key, null);
    if (reservation.replay) return { state: await this.buildState(await this.requirePack(userId, packId)), replayed: true };

    const model = this.model?.model ?? null;
    let cards: PackCard[];
    try {
      cards = await this.generateVerifiedCards({ pack, ai, materials, assessment, slots: targets, existing: current, purpose: mode === "initial" ? "generate" : "complete" });
    } catch (error) {
      await this.release(userId, reservation.usageId, error);
      throw this.toAiError(error);
    }

    try {
      await this.repo.saveAnswers({
        ownerUserId: userId,
        usageId: reservation.usageId,
        materialsVersion: materials.version,
        cards: cards.map((card) => ({ slot: card.slot, card, model, promptVersion: INTERVIEW_PACK_PROMPT_VERSION })),
      });
    } catch (error) {
      throw this.toSaveError(error);
    }
    const state = await this.buildState(await this.requirePack(userId, packId));
    const deferred = assessment.slots.filter((slot) => slot.status !== "ready").length;
    return { state, notice: deferred > 0 ? `자료가 충분한 항목을 만들었습니다. 보완이 필요한 ${deferred}개 항목은 자료를 채운 뒤 이어서 만들 수 있습니다.` : undefined };
  }

  // ─────────── 선택 답변 AI 수정 ───────────

  async revise(userId: string, packId: string, input: { slot: string; kind: string; customText?: string; requestKey: string }): Promise<ActionResult> {
    const slot = parseSlot(input.slot);
    const kind = z.enum(REVISE_KINDS).safeParse(input.kind);
    if (!kind.success) throw new PackServiceError("VALIDATION", "수정 방식을 확인해 주세요.");
    const customText = kind.data === "custom" ? sanitizeUserText(input.customText ?? "", 200) : "";
    if (kind.data === "custom" && customText.length < 2) throw new PackServiceError("VALIDATION", "어떻게 고치고 싶은지 한 줄로 적어 주세요.");
    if ((kind.data === "direction_strength" || kind.data === "direction_motivation" || kind.data === "direction_aspiration") && slot !== "intro_30" && slot !== "intro_60") {
      throw new PackServiceError("VALIDATION", "자기소개에서만 방향을 바꿀 수 있습니다.");
    }
    const key = parseRequestKey(input.requestKey);

    const pack = await this.requirePack(userId, packId);
    const answers = await this.repo.listCurrentAnswers(packId);
    const currentAnswer = answers.find((answer) => answer.slot === slot);
    if (!currentAnswer) throw new PackServiceError("NOT_FOUND", "아직 만들어진 답변이 없는 항목입니다.");

    const { base, latest } = await this.loadMaterialVersions(pack);
    const materials = resolveEffectiveMaterials(base, latest);
    // 자료가 바뀌었다면 점검 결과의 사실 목록은 낡았다. 그때는 모델이 자료 원문을 직접 읽게 한다.
    const assessment = pack.assessment && pack.assessment.materialsVersion === latest.version ? pack.assessment : null;
    const ai = this.requireAi();
    await this.enforceTestDailyCap(pack);
    const reservation = await this.reserve(userId, pack, "edit", key, slot);
    if (reservation.replay) return { state: await this.buildState(await this.requirePack(userId, packId)), replayed: true };

    const others = answers.filter((answer) => answer.slot !== slot).map((answer) => ({ slot: answer.slot, answer: answer.card.answer }));
    let revised: PackCard;
    try {
      revised = await this.reviseVerifiedCard({ pack, ai, materials, assessment, slot, current: currentAnswer.card, kind: kind.data, customText, others, answers });
    } catch (error) {
      await this.release(userId, reservation.usageId, error);
      throw this.toAiError(error);
    }

    try {
      await this.repo.saveAnswers({
        ownerUserId: userId,
        usageId: reservation.usageId,
        materialsVersion: materials.version,
        cards: [{ slot, card: revised, model: this.model?.model ?? null, promptVersion: INTERVIEW_PACK_PROMPT_VERSION }],
      });
    } catch (error) {
      throw this.toSaveError(error);
    }
    return { state: await this.buildState(await this.requirePack(userId, packId)), notice: `‘${REVISE_KIND_LABEL[kind.data]}’로 고쳤습니다. 이전 버전은 복원할 수 있습니다.` };
  }

  // ─────────── 직접 수정·복원(AI 없음, 사용량 없음) ───────────

  async editAnswer(userId: string, packId: string, input: { slot: string; baseRevision: number; answer: string }): Promise<ActionResult> {
    const slot = parseSlot(input.slot);
    const answer = sanitizeUserText(input.answer, 1_400);
    if (compactLength(answer) < 10) throw new PackServiceError("VALIDATION", "답변이 너무 짧습니다.");

    const pack = await this.requirePack(userId, packId);
    const current = (await this.repo.listCurrentAnswers(packId)).find((entry) => entry.slot === slot);
    if (!current) throw new PackServiceError("NOT_FOUND", "아직 만들어진 답변이 없는 항목입니다.");
    if (current.revisionNo !== input.baseRevision) throw new PackServiceError("STALE_REVISION", "다른 곳에서 이 답변을 먼저 고쳤습니다. 새로고침한 뒤 다시 수정해 주세요.");

    const { base, latest } = await this.loadMaterialVersions(pack);
    const materials = resolveEffectiveMaterials(base, latest);
    const card = recheckEditedCard(current.card, answer, materials);
    try {
      await this.repo.saveUserAnswer({
        ownerUserId: userId, packId, slot, origin: "user_edited", baseRevision: input.baseRevision,
        // 직접 고쳐도 근거가 새 자료로 바뀌는 것은 아니므로 원래 자료 버전을 이어 간다("이전 자료 기준" 표시 유지).
        materialsVersion: current.materialsVersion, card,
      });
    } catch (error) {
      if (dbCode(error) === "STALE_REVISION") throw new PackServiceError("STALE_REVISION", "다른 곳에서 이 답변을 먼저 고쳤습니다. 새로고침한 뒤 다시 수정해 주세요.");
      throw error;
    }
    return { state: await this.buildState(await this.requirePack(userId, packId)), notice: "수정본을 저장했습니다. AI 재검토 전인 사용자 수정본으로 표시됩니다." };
  }

  async listRevisions(userId: string, packId: string, slotRaw: string): Promise<StoredAnswer[]> {
    const slot = parseSlot(slotRaw);
    await this.requirePack(userId, packId);
    return this.repo.listAnswerRevisions(packId, slot);
  }

  async restoreAnswer(userId: string, packId: string, input: { slot: string; revisionNo: number; baseRevision: number }): Promise<ActionResult> {
    const slot = parseSlot(input.slot);
    await this.requirePack(userId, packId);
    const revisions = await this.repo.listAnswerRevisions(packId, slot);
    const current = revisions[0];
    const target = revisions.find((revision) => revision.revisionNo === input.revisionNo);
    if (!current || !target) throw new PackServiceError("NOT_FOUND", "복원할 버전을 찾지 못했습니다.");
    if (current.revisionNo !== input.baseRevision) throw new PackServiceError("STALE_REVISION", "다른 곳에서 이 답변을 먼저 고쳤습니다. 새로고침해 주세요.");
    if (target.revisionNo === current.revisionNo) throw new PackServiceError("VALIDATION", "이미 이 버전입니다.");
    try {
      await this.repo.saveUserAnswer({ ownerUserId: userId, packId, slot, origin: "restored", baseRevision: input.baseRevision, materialsVersion: target.materialsVersion, card: target.card });
    } catch (error) {
      if (dbCode(error) === "STALE_REVISION") throw new PackServiceError("STALE_REVISION", "다른 곳에서 이 답변을 먼저 고쳤습니다. 새로고침해 주세요.");
      throw error;
    }
    return { state: await this.buildState(await this.requirePack(userId, packId)), notice: "이전 버전을 복원했습니다." };
  }

  // ─────────── 내부: 생성·수정 파이프라인 ───────────

  /**
   * 카드를 만들고 서버 확인을 한다. 오류급 문제가 있는 항목만 한 번 다시 쓰게 하고(서버 재시도 1회),
   * 그래도 남으면 그 항목은 "확인 필요 초안"으로 저장된다(완성 답변으로 표시하지 않는다).
   * 모델이 요청하지 않은 항목이나 형식이 맞지 않는 항목은 버린다. 하나도 남지 않으면 실패로 본다.
   */
  private async generateVerifiedCards(input: {
    pack: PackRecord;
    ai: PackAiGateway;
    materials: EffectiveMaterials;
    assessment: PackAssessment;
    slots: PackSlotId[];
    existing: StoredAnswer[];
    purpose: AiCallPurpose;
  }): Promise<PackCard[]> {
    const wanted = new Set(input.slots);
    const first = await this.callWithRetry(input.pack, input.purpose, () => input.ai.generate({ materials: input.materials, assessment: input.assessment, slots: input.slots }));
    let cards = this.verifyBatch(first.output.cards, wanted, input);
    if (cards.length === 0) throw new PackAiInvalidOutputError("NO_USABLE_CARDS");

    const failing = cards.filter((card) => card.issues.some((issue) => issue.severity === "error"));
    if (failing.length > 0) {
      const notes: RetryNote[] = failing.map((card) => ({ slot: card.slot, issues: card.issues.filter((issue) => issue.severity === "error").map((issue) => issue.detail) }));
      try {
        const retry = await this.callWithRetry(input.pack, input.purpose, () =>
          input.ai.generate({ materials: input.materials, assessment: input.assessment, slots: failing.map((card) => card.slot), retryNotes: notes }),
        );
        const retried = this.verifyBatch(retry.output.cards, new Set(failing.map((card) => card.slot)), input);
        const bySlot = new Map(cards.map((card) => [card.slot, card]));
        for (const card of retried) {
          const previous = bySlot.get(card.slot);
          // 다시 쓴 것이 오류 수가 더 적을 때만 바꾼다.
          if (!previous || errorCount(card) < errorCount(previous)) bySlot.set(card.slot, card);
        }
        cards = [...bySlot.values()];
      } catch (error) {
        // 재시도 자체가 실패해도 첫 결과(오류가 표시된 초안)는 그대로 쓴다. 사용자 횟수는 최초 1건뿐이다.
        if (error instanceof PackAiProviderError || error instanceof PackAiInvalidOutputError) {
          // 원장에는 이미 기록됐다.
        } else {
          throw error;
        }
      }
    }
    return cards;
  }

  private verifyBatch(
    aiCards: ReadonlyArray<Parameters<typeof verifyGeneratedCard>[0]>,
    wanted: ReadonlySet<PackSlotId>,
    input: { materials: EffectiveMaterials; assessment: PackAssessment | null; existing: StoredAnswer[] },
  ): PackCard[] {
    const seen = new Set<PackSlotId>();
    const accepted = aiCards.filter((card) => {
      if (!wanted.has(card.slot) || seen.has(card.slot)) return false;
      seen.add(card.slot);
      return true;
    });
    const existingIntro = (slot: PackSlotId) => input.existing.find((answer) => answer.slot === slot)?.card.answer;
    const generatedIntro = (slot: PackSlotId) => accepted.find((card) => card.slot === slot)?.answer;
    const siblingIntros = {
      intro30: generatedIntro("intro_30") ?? existingIntro("intro_30"),
      intro60: generatedIntro("intro_60") ?? existingIntro("intro_60"),
    };
    return accepted.map((card) => verifyGeneratedCard(card, { materials: input.materials, assessment: input.assessment, siblingIntros }));
  }

  private async reviseVerifiedCard(input: {
    pack: PackRecord;
    ai: PackAiGateway;
    materials: EffectiveMaterials;
    assessment: PackAssessment | null;
    slot: PackSlotId;
    current: PackCard;
    kind: ReviseKind;
    customText: string;
    others: Array<{ slot: PackSlotId; answer: string }>;
    answers: StoredAnswer[];
  }): Promise<PackCard> {
    const attempt = async (retryNotes?: RetryNote[]) => {
      const result = await this.callWithRetry(input.pack, "revise", () =>
        input.ai.revise({
          materials: input.materials, assessment: input.assessment, slot: input.slot, current: input.current,
          kind: input.kind, customText: input.customText, otherCards: input.others, retryNotes,
        }),
      );
      const batch = this.verifyBatch(result.output.cards, new Set([input.slot]), { materials: input.materials, assessment: input.assessment, existing: input.answers.filter((answer) => answer.slot !== input.slot) });
      return batch[0] ?? null;
    };

    let card = await attempt();
    if (card && card.issues.some((issue) => issue.severity === "error")) {
      const notes: RetryNote[] = [{ slot: input.slot, issues: card.issues.filter((issue) => issue.severity === "error").map((issue) => issue.detail) }];
      try {
        const retried = await attempt(notes);
        if (retried && errorCount(retried) < errorCount(card)) card = retried;
      } catch (error) {
        if (!(error instanceof PackAiProviderError) && !(error instanceof PackAiInvalidOutputError)) throw error;
      }
    }
    if (!card) throw new PackAiInvalidOutputError("NO_USABLE_CARD");
    // 수정본이 자료와 맞지 않으면 좋은 기존 답변을 갈아 끼우지 않는다. 예약은 되돌아가 횟수도 깎이지 않는다.
    if (card.issues.some((issue) => issue.severity === "error")) throw new PackVerificationError(card.issues.filter((issue) => issue.severity === "error").map((issue) => issue.detail));
    return card;
  }

  // ─────────── 내부: 예약·호출·오류 ───────────

  private async reserve(userId: string, pack: PackRecord, kind: UsageKind, requestKey: string, slot: PackSlotId | null): Promise<{ usageId: string; replay: false } | { replay: true; usageId: string }> {
    let outcome: ReserveOutcome;
    try {
      outcome = await this.repo.reserveUsage({ ownerUserId: userId, packId: pack.id, kind, requestKey, slot });
    } catch (error) {
      if (dbCode(error) === "PACK_NOT_FOUND") throw new PackServiceError("NOT_FOUND", "팩을 찾지 못했습니다.");
      throw error;
    }
    switch (outcome.outcome) {
      case "RESERVED":
        return { usageId: outcome.usageId, replay: false };
      case "DUPLICATE":
        if (outcome.state === "confirmed") return { usageId: outcome.usageId, replay: true };
        if (outcome.state === "reserved") throw new PackServiceError("IN_PROGRESS", "이미 같은 요청을 처리하고 있습니다. 잠시 뒤 결과가 표시됩니다.");
        throw new PackServiceError("PREVIOUS_ATTEMPT_FAILED", "이전 시도가 완료되지 않았습니다. 다시 눌러 주세요(횟수는 차감되지 않았습니다).");
      case "BUSY":
        throw new PackServiceError("BUSY", "다른 작업이 진행 중입니다. 끝난 뒤 다시 시도해 주세요.");
      case "LIMIT_REACHED":
        throw new PackServiceError("LIMIT_REACHED", limitMessage(kind), { used: outcome.used, limit: outcome.limit });
      case "INITIAL_REQUIRED":
        throw new PackServiceError("INITIAL_REQUIRED", "먼저 답변을 처음 만들어 주세요.");
      case "DENIED":
        throw new PackServiceError("ACCESS_DENIED", describeDenial(outcome.reason), { reason: outcome.reason });
    }
  }

  private async release(userId: string, usageId: string, error: unknown) {
    try {
      await this.repo.settleUsage(userId, usageId, "released", failureCodeOf(error));
    } catch (settleError) {
      // 정리에 실패해도 5분 뒤 예약이 스스로 만료된다. 원래 오류를 가리지 않는다.
      console.error("interview_pack_release_failed", dbCode(settleError));
    }
  }

  /** AI 호출 + 원장 기록. 형식이 틀린 응답은 서버가 한 번만 다시 시도한다(사용자 횟수는 그대로). */
  private async callWithRetry<T>(pack: PackRecord, purpose: AiCallPurpose, call: () => Promise<PackAiResult<T>>): Promise<PackAiResult<T>> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await call();
        await this.recordCall(pack, purpose, "COMPLETED", { model: result.model, responseId: result.responseId, usage: result.usage });
        return result;
      } catch (error) {
        lastError = error;
        const outcome: AiCallOutcome = error instanceof PackAiProviderError ? "PROVIDER_FAILED" : error instanceof PackAiInvalidOutputError ? "INVALID_OUTPUT" : "ERROR";
        await this.recordCall(pack, purpose, outcome, { failureCode: failureCodeOf(error) });
        // 호출 자체 실패(시간 초과·HTTP 오류)는 바로 돌려준다. 형식 오류만 한 번 더.
        if (!(error instanceof PackAiInvalidOutputError)) throw error;
      }
    }
    throw lastError;
  }

  private async recordCall(pack: PackRecord, purpose: AiCallPurpose, outcome: AiCallOutcome, extra: { model?: string | null; responseId?: string | null; usage?: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null }; failureCode?: string | null }) {
    await this.repo.recordAiCall({
      ownerUserId: pack.ownerUserId,
      packId: pack.id,
      isTest: pack.isTest,
      purpose,
      outcome,
      model: extra.model ?? this.model?.model ?? null,
      responseId: extra.responseId ?? null,
      inputTokens: extra.usage?.inputTokens ?? null,
      outputTokens: extra.usage?.outputTokens ?? null,
      totalTokens: extra.usage?.totalTokens ?? null,
      failureCode: extra.failureCode ?? null,
    });
  }

  private requireAi(): PackAiGateway {
    if (!this.ai) throw new PackServiceError("AI_UNAVAILABLE", "지금은 AI 기능을 사용할 수 없습니다. 이미 만든 답변은 그대로 볼 수 있습니다.");
    return this.ai;
  }

  /** 관리자 실제-AI 테스트의 하루 호출 상한. 원장을 세므로 테스트 자료를 초기화해도 리셋되지 않는다. */
  private async enforceTestDailyCap(pack: PackRecord) {
    if (!pack.isTest) return;
    const used = await this.repo.countTestAiCallsSince(startOfSeoulDayIso(this.now()));
    if (used >= this.config.testDailyAiCalls) {
      throw new PackServiceError("TEST_DAILY_LIMIT", `오늘 실제 AI 테스트 한도(${this.config.testDailyAiCalls}회)에 도달했습니다. 내일 다시 시도해 주세요.`);
    }
  }

  private toAiError(error: unknown): PackServiceError {
    if (error instanceof PackServiceError) return error;
    if (error instanceof PackVerificationError) {
      return new PackServiceError("VERIFICATION_FAILED", "수정본이 제출한 자료와 맞지 않아 반영하지 않았습니다. 횟수는 차감되지 않았습니다.", { issues: error.issues });
    }
    if (error instanceof PackAiProviderError) return new PackServiceError("AI_FAILED", "AI가 응답하지 못했습니다. 잠시 뒤 다시 시도해 주세요(횟수는 차감되지 않았습니다).");
    if (error instanceof PackAiInvalidOutputError) return new PackServiceError("AI_INVALID", "AI 답변을 사용할 수 있는 형태로 받지 못했습니다. 다시 시도해 주세요(횟수는 차감되지 않았습니다).");
    console.error("interview_pack_unexpected_error", error instanceof Error ? error.name : "UNKNOWN");
    return new PackServiceError("AI_FAILED", "처리 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요(횟수는 차감되지 않았습니다).");
  }

  private toSaveError(error: unknown): PackServiceError {
    if (error instanceof PackServiceError) return error;
    if (dbCode(error) === "USAGE_NOT_ACTIVE") return new PackServiceError("NOT_FOUND", "작업이 진행되는 동안 팩이 초기화되었거나 시간이 지나 결과를 저장하지 못했습니다. 다시 시도해 주세요.");
    console.error("interview_pack_save_failed", dbCode(error));
    return new PackServiceError("AI_FAILED", "결과를 저장하지 못했습니다. 다시 시도해 주세요.");
  }

  // ─────────── 내부: 읽기 ───────────

  private async requirePack(userId: string, packId: string): Promise<PackRecord> {
    const pack = await this.repo.getPack(userId, packId);
    if (!pack) throw new PackServiceError("NOT_FOUND", "팩을 찾지 못했습니다.");
    return pack;
  }

  private async loadMaterialVersions(pack: PackRecord) {
    const base = await this.repo.getMaterials(pack.id, 1);
    const latest = pack.materialsVersion === 1 ? base : await this.repo.getMaterials(pack.id, pack.materialsVersion);
    if (!base || !latest) throw new PackServiceError("NOT_FOUND", "자료를 찾지 못했습니다.");
    return { base, latest };
  }

  private async buildState(pack: PackRecord): Promise<PackState> {
    const { base, latest } = await this.loadMaterialVersions(pack);
    const materials = resolveEffectiveMaterials(base, latest);
    const [counts, answers] = await Promise.all([this.repo.countUsage(pack.id), this.repo.listCurrentAnswers(pack.id)]);

    const usageView = (kind: UsageKind): UsageView => {
      const limit = pack.limits[kind];
      const used = Math.min(counts[kind], limit);
      return { used, limit, remaining: Math.max(0, limit - counts[kind]) };
    };

    const confirmedIds = new Set(materials.confirmations.map((entry) => entry.conflictId));
    const assessment = pack.assessment
      ? {
          materialsVersion: pack.assessment.materialsVersion,
          stale: pack.assessment.materialsVersion !== latest.version,
          slots: pack.assessment.slots,
          conflicts: pack.assessment.conflicts.map((conflict) => ({ ...conflict, resolved: confirmedIds.has(conflict.id) })),
          unresolvedConflictCount: listUnresolvedConflicts(pack.assessment, materials.confirmations).length,
        }
      : null;

    let testBudget: PackState["testBudget"] = null;
    if (pack.isTest) {
      const usedToday = await this.repo.countTestAiCallsSince(startOfSeoulDayIso(this.now()));
      testBudget = {
        dailyLimit: this.config.testDailyAiCalls,
        usedToday,
        remaining: Math.max(0, this.config.testDailyAiCalls - usedToday),
        tokenLimits: PACK_CALL_TOKEN_LIMITS,
      };
    }

    const revisionCounts = new Map<PackSlotId, number>();
    for (const answer of answers) revisionCounts.set(answer.slot, answer.revisionNo);

    return {
      pack: {
        id: pack.id,
        origin: pack.origin,
        accessSource: pack.accessSource,
        isTest: pack.isTest,
        label: pack.label,
        materialsVersion: pack.materialsVersion,
        initialGenerated: pack.initialGeneratedAt !== null,
        busy: pack.busyKind && pack.busyUntil && new Date(pack.busyUntil) > this.now() ? { kind: pack.busyKind } : null,
        createdAt: pack.createdAt,
      },
      usage: { check: usageView("check"), initial: usageView("initial"), complete: usageView("complete"), edit: usageView("edit") },
      materials: {
        version: latest.version,
        company: materials.company,
        role: materials.role,
        docs: materials.docs.map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          title: doc.title,
          filename: doc.filename,
          chars: compactLength(doc.text),
          truncated: doc.truncated === true,
          preview: doc.text.replace(/\s+/g, " ").trim().slice(0, 140),
        })),
        supplements: materials.supplements,
        slotAnswers: materials.slotAnswers,
        confirmations: materials.confirmations.map((entry) => ({ conflictId: entry.conflictId, choice: entry.choice, ...(entry.customText ? { customText: entry.customText } : {}) })),
        hasJobPosting: materials.hasJobPosting,
      },
      assessment,
      answers: answers
        .map((answer) => ({
          slot: answer.slot,
          revisionNo: answer.revisionNo,
          revisionCount: revisionCounts.get(answer.slot) ?? answer.revisionNo,
          origin: answer.origin,
          materialsVersion: answer.materialsVersion,
          stale: answer.materialsVersion < latest.version,
          complete: !answer.card.issues.some((issue) => issue.severity === "error") || answer.origin === "user_edited" || answer.origin === "restored",
          card: answer.card,
          createdAt: answer.createdAt,
        }))
        .sort((a, b) => PACK_SLOTS.findIndex((slot) => slot.id === a.slot) - PACK_SLOTS.findIndex((slot) => slot.id === b.slot)),
      testBudget,
      aiAvailable: this.ai !== null,
      promptVersion: INTERVIEW_PACK_PROMPT_VERSION,
    };
  }
}

// ───────────────────────────── 작은 도우미 ─────────────────────────────

class PackVerificationError extends Error {
  constructor(readonly issues: string[]) {
    super("VERIFICATION_FAILED");
    this.name = "PackVerificationError";
  }
}

function parseRequestKey(value: string): string {
  const parsed = REQUEST_KEY.safeParse(value);
  if (!parsed.success) throw new PackServiceError("VALIDATION", "요청 정보를 확인해 주세요. 화면을 새로고침해 주세요.");
  return parsed.data;
}

function parseSlot(value: string): PackSlotId {
  const parsed = packSlotIdSchema.safeParse(value);
  if (!parsed.success) throw new PackServiceError("VALIDATION", "항목을 확인해 주세요.");
  return parsed.data;
}

function errorCount(card: PackCard): number {
  return card.issues.filter((issue) => issue.severity === "error").length;
}

function limitMessage(kind: UsageKind): string {
  switch (kind) {
    case "initial":
      return "면접 준비팩은 처음 만들기가 이미 사용되었습니다. 부족했던 항목은 ‘이어서 만들기’로 채울 수 있습니다.";
    case "edit":
      return "AI 수정 횟수를 모두 사용했습니다. 직접 수정과 이전 버전 복원은 계속 할 수 있습니다.";
    case "check":
      return "자료 점검 횟수를 모두 사용했습니다.";
    case "complete":
      return "이어서 만들기 횟수를 모두 사용했습니다.";
  }
}

export function dbCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof (error as { code: unknown }).code === "string") {
    const code = (error as { code: string }).code;
    if (code && !/^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return error instanceof Error ? error.message.split(":")[0].trim().split(/\s+/)[0] : "UNKNOWN";
}

function failureCodeOf(error: unknown): string {
  if (error instanceof PackAiProviderError) return error.message;
  if (error instanceof PackAiInvalidOutputError) return error.message;
  if (error instanceof PackVerificationError) return "VERIFICATION_FAILED";
  return "ERROR";
}

/** 보완 입력이 충돌 확인뿐인가(문항 답변·자료 텍스트가 바뀌지 않는가). */
function hasOnlyConfirmations(input: z.infer<typeof supplementInputSchema>): boolean {
  const hasSupplements = Object.values(input.supplements).some((value) => typeof value === "string" && value.trim().length > 0);
  return input.confirmations.length > 0 && !hasSupplements && input.slotAnswers.length === 0;
}

/** 저장 여부 비교용: 생성 시각처럼 매번 달라지는 값은 없지만, 키 순서 차이로 다르게 보이지 않게 정렬한다. */
function stripForCompare(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map(stripForCompare);
  if (payload && typeof payload === "object") {
    return Object.fromEntries(
      Object.entries(payload as Record<string, unknown>)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, stripForCompare(value)]),
    );
  }
  return payload;
}

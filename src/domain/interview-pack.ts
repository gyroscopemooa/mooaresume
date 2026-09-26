import { z } from "zod";

/**
 * FINAL 면접 준비팩의 공유 타입·상수·설정.
 *
 * 서버 라우트·DB 저장·화면·관리자 테스트가 전부 이 스키마를 기준으로 삼는다.
 * 기존 모의면접(`interview.ts`)과는 일부러 분리했다 — 저쪽은 "답하고 평가받는"
 * 대화이고 이쪽은 "제출한 자료로 답변을 만들어 외우는" 텍스트 준비물이다.
 *
 * 숫자 점수·합격확률·"준비도 87%" 같은 값은 어디에도 없다(AGENTS.md).
 * 상태는 문항별로 세 가지뿐이다: 만들 수 있음 / 자료 보완 필요 / 내용 확인 필요.
 */

// ───────────────────────────── 문항(슬롯) ─────────────────────────────

export const PACK_SLOT_IDS = [
  "intro_30",
  "intro_60",
  "motivation_company",
  "aspiration",
  "motivation_role",
  "strength",
  "weakness",
  "role_experience",
  "problem_solving",
  "collaboration",
  "closing",
] as const;
export type PackSlotId = (typeof PACK_SLOT_IDS)[number];
export const packSlotIdSchema = z.enum(PACK_SLOT_IDS);

export type PackSlotDef = {
  id: PackSlotId;
  label: string;
  /** 화면 상단에 기본으로 보이는 4개(core)와 펼쳐 보는 나머지(extra). */
  group: "core" | "extra";
  /** 연습 목표 시간(초). "정확히 이 시간"이 아니라 연습의 기준선이다. */
  targetSeconds: number;
  /** 카드에 그대로 쓰는 목표 표기. */
  targetLabel: string;
  /** 이 문항을 정직하게 만들려면 자료에 무엇이 있어야 하는지(점검 기준). */
  requirement: string;
  /** 자료가 모자랄 때 사용자에게 물을 기본 질문(AI 점검이 더 구체적으로 대체한다). */
  defaultQuestions: string[];
};

export const PACK_SLOTS: readonly PackSlotDef[] = [
  {
    id: "intro_30",
    label: "30초 자기소개",
    group: "core",
    targetSeconds: 30,
    targetLabel: "목표 30초",
    requirement: "지원 직무, 실제 강점, 그 강점을 뒷받침하는 경험과 본인이 한 행동",
    defaultQuestions: ["지원하려는 직무에서 내세울 강점 한 가지와, 그것을 보여 준 실제 경험을 한 줄로 적어 주세요."],
  },
  {
    id: "intro_60",
    label: "1분 자기소개",
    group: "core",
    targetSeconds: 60,
    targetLabel: "목표 1분",
    requirement: "지원 직무, 실제 강점, 뒷받침하는 경험과 본인의 행동·결과",
    defaultQuestions: ["대표 경험에서 본인이 직접 한 행동과, 그 뒤에 달라진 점(숫자가 없어도 됩니다)을 적어 주세요."],
  },
  {
    id: "motivation_company",
    label: "지원동기",
    group: "core",
    targetSeconds: 60,
    targetLabel: "목표 1분",
    requirement: "회사·공고에 관해 입력된 근거와, 사용자가 직접 밝힌 실제 지원 이유",
    defaultQuestions: [
      "지원하는 회사(또는 채용공고 본문)를 알려 주세요.",
      "이 회사에 지원하려는 실제 이유를 본인의 말로 한두 줄 적어 주세요.",
    ],
  },
  {
    id: "aspiration",
    label: "입사 후 포부",
    group: "core",
    targetSeconds: 45,
    targetLabel: "목표 45초",
    requirement: "직무가 하는 일과, 사용자가 밝힌 기여하고 싶은 방향",
    defaultQuestions: ["입사 후 처음 익히고 싶은 것과, 이후 기여하고 싶은 방향을 한두 줄로 적어 주세요."],
  },
  {
    id: "motivation_role",
    label: "직무 지원동기",
    group: "extra",
    targetSeconds: 45,
    targetLabel: "목표 45초",
    requirement: "이 직무를 선택한 이유와 관련 경험",
    defaultQuestions: ["이 직무를 선택한 이유와, 그와 관련된 경험을 적어 주세요."],
  },
  {
    id: "strength",
    label: "강점",
    group: "extra",
    targetSeconds: 45,
    targetLabel: "목표 45초",
    requirement: "실제 강점과 그것을 보여 준 경험",
    defaultQuestions: ["본인의 강점 한 가지와 그것이 드러난 경험을 적어 주세요."],
  },
  {
    id: "weakness",
    label: "약점과 보완 노력",
    group: "extra",
    targetSeconds: 45,
    targetLabel: "목표 45초",
    requirement: "사용자가 직접 밝힌 실제 약점과 보완하려는 노력",
    defaultQuestions: ["스스로 부족하다고 느낀 점과, 그것을 보완하려고 실제로 하고 있는 일을 적어 주세요."],
  },
  {
    id: "role_experience",
    label: "직무 관련 경험",
    group: "extra",
    targetSeconds: 60,
    targetLabel: "목표 1분",
    requirement: "직무와 관련된 경험, 본인의 역할과 행동",
    defaultQuestions: ["직무와 관련된 경험 한 가지에서 본인의 역할과 행동을 적어 주세요."],
  },
  {
    id: "problem_solving",
    label: "어려움 해결 경험",
    group: "extra",
    targetSeconds: 60,
    targetLabel: "목표 1분",
    requirement: "어려웠던 상황, 본인이 한 행동, 그 결과",
    defaultQuestions: ["어려웠던 상황에서 본인이 한 행동과 그 결과를 적어 주세요."],
  },
  {
    id: "collaboration",
    label: "협업·갈등 경험",
    group: "extra",
    targetSeconds: 60,
    targetLabel: "목표 1분",
    requirement: "함께 일하거나 의견이 달랐던 상황, 본인이 조율하려고 한 행동, 결과",
    defaultQuestions: ["다른 사람과 협업하거나 의견이 달랐던 경험에서 본인이 한 행동을 적어 주세요."],
  },
  {
    id: "closing",
    label: "마지막 한마디",
    group: "extra",
    targetSeconds: 20,
    targetLabel: "목표 20초",
    requirement: "지원동기 또는 입사 후 포부 중 하나 이상",
    defaultQuestions: ["면접 마지막에 꼭 전하고 싶은 말이 있다면 적어 주세요."],
  },
];

const SLOT_BY_ID = new Map(PACK_SLOTS.map((slot) => [slot.id, slot]));
export function getPackSlot(id: PackSlotId): PackSlotDef {
  const slot = SLOT_BY_ID.get(id);
  if (!slot) throw new Error(`UNKNOWN_PACK_SLOT:${id}`);
  return slot;
}

/** 경력·성과 사실이 그대로 쓰이는 문항. 서류 사이 충돌이 풀리기 전에는 확정하지 않는다. */
export const EXPERIENCE_SLOT_IDS: readonly PackSlotId[] = [
  "intro_30",
  "intro_60",
  "strength",
  "role_experience",
  "problem_solving",
  "collaboration",
];

// ───────────────────────────── 상태 ─────────────────────────────

export const READINESS_VALUES = ["ready", "needs_material", "needs_confirmation"] as const;
export type SlotReadiness = (typeof READINESS_VALUES)[number];
export const readinessSchema = z.enum(READINESS_VALUES);

export const READINESS_LABEL: Record<SlotReadiness, string> = {
  ready: "만들 수 있음",
  needs_material: "자료 보완 필요",
  needs_confirmation: "내용 확인 필요",
};

/** 카드의 작성·수정 출처. 화면 배지에 그대로 쓴다. */
export const CARD_ORIGINS = ["ai", "ai_revised", "user_edited", "restored"] as const;
export type CardOrigin = (typeof CARD_ORIGINS)[number];
export const CARD_ORIGIN_LABEL: Record<CardOrigin, string> = {
  ai: "AI가 자료로 작성",
  ai_revised: "AI가 선택 답변만 수정",
  user_edited: "사용자 수정본 · AI 재검토 전",
  restored: "이전 버전 복원",
};

// ───────────────────────────── 자료 ─────────────────────────────

export const PACK_DOC_KINDS = ["resume", "cover_letter", "job_posting", "experience", "certificate", "note", "other", "supplement"] as const;
export type PackDocKind = (typeof PACK_DOC_KINDS)[number];
export const PACK_DOC_KIND_LABEL: Record<PackDocKind, string> = {
  resume: "이력서",
  cover_letter: "자기소개서",
  job_posting: "채용공고",
  experience: "경력·경험",
  certificate: "자격·증빙",
  note: "지원자 메모",
  other: "기타 자료",
  supplement: "지원자가 직접 보완한 내용",
};

export const materialDocSchema = z.object({
  id: z.string().min(1).max(20),
  kind: z.enum(PACK_DOC_KINDS),
  title: z.string().min(1).max(160),
  text: z.string().max(60_000),
  /** 실제 FINAL 건에서 가져온 문서라면 원본 문서·버전 id. 샘플·직접 입력은 null. */
  documentId: z.string().nullable().default(null),
  documentVersionId: z.string().nullable().default(null),
  filename: z.string().nullable().default(null),
  /** 너무 길어 앞부분만 쓴 문서. 화면에서 그렇다고 알려 준다. */
  truncated: z.boolean().optional(),
});
export type MaterialDoc = z.infer<typeof materialDocSchema>;

/** 사용자가 이 팩을 위해 더 적어 넣을 수 있는 값. 이미 있는 값은 다시 묻지 않는다. */
export const supplementsSchema = z.object({
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(120).optional(),
  jobPostingText: z.string().trim().max(8_000).optional(),
  emphasis: z.string().trim().max(1_500).optional(),
  applyReason: z.string().trim().max(1_500).optional(),
  contribution: z.string().trim().max(1_500).optional(),
  exclude: z.string().trim().max(1_000).optional(),
});
export type PackSupplements = z.infer<typeof supplementsSchema>;

export const slotAnswerSchema = z.object({
  slot: packSlotIdSchema,
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(1_200),
});
export type PackSlotAnswer = z.infer<typeof slotAnswerSchema>;

export const confirmationSchema = z.object({
  conflictId: z.string().min(1).max(40),
  choice: z.enum(["left", "right", "custom"]),
  customText: z.string().trim().max(600).optional(),
  // 아래 셋은 사용자가 보내지 않는다. 저장할 때 서버가 점검 결과의 충돌에서 채운다 —
  // 화면이 "이 값이 맞다"고 주장하는 문구를 그대로 믿지 않기 위해서다.
  topic: z.enum(["period", "role", "metric", "other"]).optional(),
  chosenText: z.string().max(700).optional(),
  rejectedText: z.string().max(1_400).optional(),
});
export type ConflictConfirmation = z.infer<typeof confirmationSchema>;

export const finalHintsSchema = z.object({
  careerTimeline: z.array(z.string().max(300)).max(20).default([]),
  documentConflicts: z.array(z.string().max(400)).max(10).default([]),
});
export type FinalHints = z.infer<typeof finalHintsSchema>;

/** DB에 저장되는 자료 한 버전. 1번이 원본 스냅샷, 이후는 사용자가 보완한 별도 버전이다. */
export const materialsPayloadSchema = z.object({
  schema: z.literal(1),
  /** 2번 이후 버전은 문서를 다시 담지 않고 1번 버전의 문서를 이어 쓴다. */
  baseVersion: z.number().int().positive().nullable(),
  documents: z.array(materialDocSchema).max(24).optional(),
  hints: finalHintsSchema.optional(),
  base: z.object({ company: z.string().max(120), role: z.string().max(120) }).optional(),
  supplements: supplementsSchema.default({}),
  slotAnswers: z.array(slotAnswerSchema).max(40).default([]),
  confirmations: z.array(confirmationSchema).max(20).default([]),
});
export type MaterialsPayload = z.infer<typeof materialsPayloadSchema>;

// ───────────────────────────── 근거·사실·충돌 ─────────────────────────────

/** 모델이 돌려주는 근거 참조. 서버가 원문 존재를 확인한 뒤에만 `EvidenceRef`가 된다. */
export const aiSourceRefSchema = z.object({
  docId: z.string().min(1).max(20),
  paragraph: z.number().int().min(0).max(5_000),
  quote: z.string().min(1).max(400),
});
export type AiSourceRef = z.infer<typeof aiSourceRefSchema>;

export const evidenceRefSchema = aiSourceRefSchema.extend({
  docTitle: z.string(),
  docKind: z.enum(PACK_DOC_KINDS),
  documentId: z.string().nullable(),
  documentVersionId: z.string().nullable(),
  materialsVersion: z.number().int().positive(),
  /** 인용이 들어 있는 문단 전체. "근거 보기"가 원문을 그대로 보여 주기 위해 저장한다. */
  paragraphText: z.string(),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

export const FACT_KINDS = ["role", "period", "action", "result", "metric", "skill", "motive", "aspiration", "trait", "collaboration", "company", "other"] as const;
export const aiFactSchema = z.object({
  id: z.string().min(1).max(12),
  kind: z.enum(FACT_KINDS),
  statement: z.string().min(1).max(240),
  source: aiSourceRefSchema,
});
export type AiFact = z.infer<typeof aiFactSchema>;

export type VerifiedFact = {
  id: string;
  kind: (typeof FACT_KINDS)[number];
  statement: string;
  source: EvidenceRef;
};

export const CONFLICT_TOPICS = ["period", "role", "metric", "other"] as const;
export const CONFLICT_TOPIC_LABEL: Record<(typeof CONFLICT_TOPICS)[number], string> = {
  period: "재직·활동 기간",
  role: "직책·역할",
  metric: "성과 수치",
  other: "기타 내용",
};
export const aiConflictSchema = z.object({
  topic: z.enum(CONFLICT_TOPICS),
  summary: z.string().min(1).max(240),
  left: aiSourceRefSchema,
  right: aiSourceRefSchema,
});
export type AiConflict = z.infer<typeof aiConflictSchema>;

export type VerifiedConflict = {
  /** 서버가 두 원문에서 계산한 안정적인 id. 다시 점검해도 같은 충돌이면 같은 id다. */
  id: string;
  topic: (typeof CONFLICT_TOPICS)[number];
  summary: string;
  left: EvidenceRef;
  right: EvidenceRef;
};

export const aiSlotAssessmentSchema = z.object({
  slot: packSlotIdSchema,
  status: readinessSchema,
  reason: z.string().min(1).max(280),
  questions: z.array(z.string().min(1).max(200)).max(3),
  factIds: z.array(z.string().max(12)).max(20),
});
export type AiSlotAssessment = z.infer<typeof aiSlotAssessmentSchema>;

export const aiAssessmentSchema = z.object({
  facts: z.array(aiFactSchema).max(60),
  conflicts: z.array(aiConflictSchema).max(10),
  slots: z.array(aiSlotAssessmentSchema).max(PACK_SLOT_IDS.length),
});
export type AiAssessment = z.infer<typeof aiAssessmentSchema>;

export type SlotAssessment = {
  slot: PackSlotId;
  status: SlotReadiness;
  reason: string;
  questions: string[];
  factIds: string[];
  /** 이 판정이 자료의 빈자리가 아니라 미해결 충돌 때문이라면 그 충돌 id들. */
  blockedByConflictIds: string[];
};

/** 저장되는 점검 결과. `materialsVersion`이 최신 자료 버전과 다르면 "이전 자료 기준"이다. */
export type PackAssessment = {
  materialsVersion: number;
  facts: VerifiedFact[];
  conflicts: VerifiedConflict[];
  slots: SlotAssessment[];
  /** 모델이 돌려줬지만 원문에서 확인하지 못해 버린 사실·충돌 수(진단용, 화면에는 안 보인다). */
  droppedFacts: number;
  droppedConflicts: number;
};

// ───────────────────────────── 답변 카드 ─────────────────────────────

export const aiCardSchema = z.object({
  slot: packSlotIdSchema,
  answer: z.string().min(20).max(1_400),
  keywords: z.array(z.string().min(1).max(30)).min(3).max(5),
  steps: z.array(z.object({ label: z.string().min(1).max(30), sentence: z.string().min(1).max(400) })).min(2).max(5),
  memoryLine: z.string().min(1).max(120),
  followUps: z.array(z.string().min(1).max(160)).min(2).max(3),
  evidence: z.array(aiSourceRefSchema).min(1).max(8),
  usedFactIds: z.array(z.string().max(12)).max(30),
});
export type AiCard = z.infer<typeof aiCardSchema>;

export const aiGenerateSchema = z.object({ cards: z.array(aiCardSchema).max(PACK_SLOT_IDS.length) });
export type AiGenerate = z.infer<typeof aiGenerateSchema>;

export const PACK_ISSUE_TYPES = [
  "quote_missing",
  "unsupported_number",
  "unsupported_term",
  "role_inflation",
  "rejected_value",
  "excluded_content",
  "keyword_missing",
  "step_missing",
  "structure",
] as const;
export type PackIssueType = (typeof PACK_ISSUE_TYPES)[number];

export type PackIssue = {
  type: PackIssueType;
  /** error 는 "완성 답변"으로 표시하지 않게 하는 문제, warn 은 알려 주기만 하는 문제. */
  severity: "error" | "warn";
  detail: string;
};

export type PackKeyword = {
  text: string;
  /** 답변 안에서 이 키워드가 들어 있는 문장 번호. 없으면 null(사용자 수정으로 사라진 경우). */
  sentenceIndex: number | null;
};

export type PackCard = {
  slot: PackSlotId;
  answer: string;
  keywords: PackKeyword[];
  steps: Array<{ label: string; sentence: string }>;
  memoryLine: string;
  /** 서류 내용에서 뽑은 "예상" 질문. 출제 빈도나 적중률을 뜻하지 않는다. */
  followUps: string[];
  evidence: EvidenceRef[];
  usedFactIds: string[];
  issues: PackIssue[];
};

export type StoredAnswer = {
  id: string;
  slot: PackSlotId;
  revisionNo: number;
  origin: CardOrigin;
  materialsVersion: number;
  card: PackCard;
  createdAt: string;
};

/** 카드가 "완성 답변"으로 보일 자격이 있는가. 오류급 문제가 하나라도 있으면 아니다. */
export function cardIsComplete(card: Pick<PackCard, "issues">): boolean {
  return !card.issues.some((issue) => issue.severity === "error");
}

// ───────────────────────────── 저장된 JSON 읽기용 스키마 ─────────────────────────────
// DB 에 들어 있는 카드·점검 결과를 읽을 때 형식을 다시 확인한다(스키마가 바뀐 옛 행이 화면을 깨지 않게).

export const packIssueSchema = z.object({
  type: z.enum(PACK_ISSUE_TYPES),
  severity: z.enum(["error", "warn"]),
  detail: z.string(),
});

export const packCardSchema = z.object({
  slot: packSlotIdSchema,
  answer: z.string(),
  keywords: z.array(z.object({ text: z.string(), sentenceIndex: z.number().int().nullable() })),
  steps: z.array(z.object({ label: z.string(), sentence: z.string() })),
  memoryLine: z.string(),
  followUps: z.array(z.string()),
  evidence: z.array(evidenceRefSchema),
  usedFactIds: z.array(z.string()),
  issues: z.array(packIssueSchema),
});

export const packAssessmentSchema = z.object({
  materialsVersion: z.number().int().positive(),
  facts: z.array(z.object({ id: z.string(), kind: z.enum(FACT_KINDS), statement: z.string(), source: evidenceRefSchema })),
  conflicts: z.array(z.object({
    id: z.string(),
    topic: z.enum(CONFLICT_TOPICS),
    summary: z.string(),
    left: evidenceRefSchema,
    right: evidenceRefSchema,
  })),
  slots: z.array(z.object({
    slot: packSlotIdSchema,
    status: readinessSchema,
    reason: z.string(),
    questions: z.array(z.string()),
    factIds: z.array(z.string()),
    blockedByConflictIds: z.array(z.string()),
  })),
  droppedFacts: z.number().int().nonnegative(),
  droppedConflicts: z.number().int().nonnegative(),
});

// ───────────────────────────── 사용량·설정 ─────────────────────────────

export const USAGE_KINDS = ["check", "initial", "complete", "edit"] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export type PackLimits = {
  /** 팩 최초 생성 횟수. 기본 1. */
  initial: number;
  /** 이미 완성된 답변의 자료 교체·방향 변경 등 AI 수정 횟수. 기본 3. */
  edit: number;
  /** 자료 점검(AI) 횟수. 사용자에게 "생성권"으로 보이지 않는 안전 상한. 기본 5. */
  check: number;
  /** 보류 문항을 최초 완성 범위에서 이어 만드는 횟수의 안전 상한. 기본 6. */
  complete: number;
};

export type InterviewPackConfig = {
  limits: PackLimits;
  /**
   * 기존 FINAL 구매자 적용 정책.
   *  - "none": 실제 구매 건에는 아직 열지 않는다(기본).
   *  - "all": 완료된 모든 FINAL 건에 연다.
   *  - Date: 이 시각 이후에 완료된 FINAL 건에만 연다.
   */
  eligibleFrom: "none" | "all" | Date;
  /** 관리자 실제-AI 테스트의 하루 호출 상한(전체 계정 합산, 초기화해도 유지). */
  testDailyAiCalls: number;
  /** 테스트 이용권이 덮는 글자 수. 실제 FINAL 이용권이 덮는 범위와 같은 자리다. */
  testGrantAllowedCharacters: number;
};

export const DEFAULT_PACK_LIMITS: PackLimits = { initial: 1, edit: 3, check: 5, complete: 6 };
export const DEFAULT_TEST_DAILY_AI_CALLS = 30;
export const DEFAULT_TEST_GRANT_CHARACTERS = 60_000;

function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw.trim());
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * 환경변수에서 팩 설정을 읽는다. 잘못된 값은 조용히 기본값으로 돌아간다 —
 * 오타 하나로 한도가 0이나 무한대가 되는 것보다 낫다.
 *
 *  INTERVIEW_PACK_INITIAL_LIMIT   최초 생성 횟수 (기본 1, 1~3)
 *  INTERVIEW_PACK_EDIT_LIMIT      선택 답변 수정 횟수 (기본 3, 0~20)
 *  INTERVIEW_PACK_CHECK_LIMIT     자료 점검 안전 상한 (기본 5, 1~20)
 *  INTERVIEW_PACK_ELIGIBLE_FROM   none | all | ISO 날짜 (기본 none)
 *  INTERVIEW_PACK_TEST_DAILY_AI_CALLS  관리자 실제-AI 테스트 하루 상한 (기본 30, 1~500)
 */
export function resolveInterviewPackConfig(env: Record<string, string | undefined> = process.env): InterviewPackConfig {
  const rawEligible = env.INTERVIEW_PACK_ELIGIBLE_FROM?.trim().toLowerCase();
  let eligibleFrom: InterviewPackConfig["eligibleFrom"] = "none";
  if (rawEligible === "all") eligibleFrom = "all";
  else if (rawEligible && rawEligible !== "none") {
    const date = new Date(env.INTERVIEW_PACK_ELIGIBLE_FROM!.trim());
    // 읽을 수 없는 날짜는 "열지 않음"으로 둔다. 잘못 열리는 쪽이 더 나쁘다.
    if (!Number.isNaN(date.getTime())) eligibleFrom = date;
  }

  return {
    limits: {
      initial: readInt(env.INTERVIEW_PACK_INITIAL_LIMIT, DEFAULT_PACK_LIMITS.initial, 1, 3),
      edit: readInt(env.INTERVIEW_PACK_EDIT_LIMIT, DEFAULT_PACK_LIMITS.edit, 0, 20),
      check: readInt(env.INTERVIEW_PACK_CHECK_LIMIT, DEFAULT_PACK_LIMITS.check, 1, 20),
      complete: DEFAULT_PACK_LIMITS.complete,
    },
    eligibleFrom,
    testDailyAiCalls: readInt(env.INTERVIEW_PACK_TEST_DAILY_AI_CALLS, DEFAULT_TEST_DAILY_AI_CALLS, 1, 500),
    testGrantAllowedCharacters: DEFAULT_TEST_GRANT_CHARACTERS,
  };
}

/** 이 완료 시각의 실제 FINAL 건이 면접팩 대상인가. 소급 발급을 막는 명시적 정책이다. */
export function isEligibleByPolicy(config: Pick<InterviewPackConfig, "eligibleFrom">, completedAt: string | Date | null): boolean {
  if (config.eligibleFrom === "all") return true;
  if (config.eligibleFrom === "none") return false;
  if (!completedAt) return false;
  const completed = completedAt instanceof Date ? completedAt : new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return false;
  return completed.getTime() >= config.eligibleFrom.getTime();
}

/** 공개 노출 플래그. 클라이언트 컴포넌트도 읽으므로 NEXT_PUBLIC_ 이다(`isFinalEnabled`와 같은 규칙). */
export function isInterviewPackPublic(value: string | undefined = process.env.NEXT_PUBLIC_ENABLE_INTERVIEW_PACK): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

/** 관리자 테스트를 받을 수 있는 계정 목록(서버 환경변수, 쉼표 구분, 소문자 비교). */
export function parseTestAccountEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[,\s;]+/).map((entry) => entry.trim().toLowerCase()).filter((entry) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry)))];
}

export function isApprovedTestAccount(email: string | null | undefined, approved: readonly string[]): boolean {
  if (!email) return false;
  return approved.includes(email.trim().toLowerCase());
}

/** 서울 기준 하루의 시작(UTC ISO). 테스트 하루 한도의 "오늘"을 어디서 자를지 한 곳에서 정한다. */
export function startOfSeoulDayIso(now: Date): string {
  const seoulOffsetMs = 9 * 60 * 60 * 1_000;
  const seoul = new Date(now.getTime() + seoulOffsetMs);
  const startSeoulUtcMs = Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), seoul.getUTCDate());
  return new Date(startSeoulUtcMs - seoulOffsetMs).toISOString();
}

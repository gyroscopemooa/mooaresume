import { z } from "zod";

/**
 * 법률 서면 — 문서 열 개가 아니라 **사건 하나**입니다.
 *
 * 취업 쪽은 한 사람의 취업자료가 쌓이는 구조입니다. 법률 쪽도 같은 철학으로
 * 가되 쌓이는 단위가 사건입니다. 소장을 쓸 때 넣은 계약서와 카톡은 석 달 뒤
 * 준비서면에도, 다시 항소이유서에도 그대로 필요합니다. 문서마다 자료를 새로
 * 올리게 만들면 세 번째쯤에서 사람이 떠납니다.
 *
 * ```
 * 내 사건
 * ├ 자료(계약서·문자·녹취·판결문·상대 서면)
 * ├ 사건 분석 · 주요쟁점
 * ├ 내용증명
 * ├ 소장 / 답변서
 * ├ 준비서면 1차, 2차
 * └ 판결문 분석 → 항소이유서
 * ```
 *
 * **취업 쪽과 결정적으로 다른 점: 여기서는 자료를 저장합니다.** 이력서·경력
 * 기술서 도구는 "서버에 저장하지 않는다"가 약속이었지만, 사건은 저장이 곧
 * 기능입니다. 그래서 저장하되 본인만 열 수 있게 RLS로 막고, 화면에서 그렇게
 * 저장된다는 사실과 지우는 방법을 분명히 말합니다.
 *
 * 그리고 이 기능은 **법률 자문이 아닙니다.** 기간을 놓치면 되돌릴 수 없는
 * 영역이라, 결과물마다 그 문장이 함께 나가야 합니다(`LEGAL_DISCLAIMER`).
 */

/** 값은 아직 정해지지 않았습니다. 미정값은 `builder-pricing.ts` 한 곳에 모아 둡니다. */
export { LEGAL_DOCUMENT_BUILD_PRICE_KRW } from "./builder-pricing";

export const LEGAL_DISCLAIMER = "이 문서는 제출용 초안입니다. 법률 자문이 아니며, 제출 전에 변호사 등 전문가의 검토를 받으시길 권합니다. 제소기간·항소기간처럼 놓치면 되돌릴 수 없는 기한은 반드시 직접 확인해 주세요.";

export const legalCaseTypeSchema = z.enum(["CIVIL", "LABOR", "ADMIN", "CRIMINAL", "OTHER"]);
export type LegalCaseType = z.infer<typeof legalCaseTypeSchema>;

export const LEGAL_CASE_TYPE_LABEL: Record<LegalCaseType, string> = {
  CIVIL: "민사 (대여금·손해배상·계약 등)",
  LABOR: "노동 (임금·해고·산재 등)",
  ADMIN: "행정 (처분 취소·이의신청 등)",
  CRIMINAL: "형사 (고소·진정 등)",
  OTHER: "그 밖의 사건",
};

/**
 * 내가 어느 쪽인지. 이 값 하나로 화면이 갈립니다 — 소송을 걸려는 사람에게는
 * 소장을, 소장을 받은 사람에게는 답변서를 먼저 보여 줘야 합니다.
 */
export const legalPartyRoleSchema = z.enum(["PLAINTIFF", "DEFENDANT", "UNDECIDED"]);
export type LegalPartyRole = z.infer<typeof legalPartyRoleSchema>;

export const LEGAL_PARTY_ROLE_LABEL: Record<LegalPartyRole, string> = {
  PLAINTIFF: "내가 청구하는 쪽입니다 (원고·신청인)",
  DEFENDANT: "내가 청구받은 쪽입니다 (피고·피신청인)",
  UNDECIDED: "아직 소송 전입니다",
};

export const legalMaterialKindSchema = z.enum([
  "CASE_NARRATIVE",
  "OPPONENT_CLAIM",
  "CONTRACT",
  "MESSAGE",
  "RECORDING",
  "JUDGMENT",
  "EXISTING_BRIEF",
  "OTHER",
]);
export type LegalMaterialKind = z.infer<typeof legalMaterialKindSchema>;

export const LEGAL_MATERIAL_KIND_LABEL: Record<LegalMaterialKind, string> = {
  CASE_NARRATIVE: "사건 경위",
  OPPONENT_CLAIM: "상대방 주장",
  CONTRACT: "계약서 · 각서",
  MESSAGE: "문자 · 카톡 · 메일",
  RECORDING: "녹취록",
  JUDGMENT: "판결문 · 결정문",
  EXISTING_BRIEF: "기존 서면",
  OTHER: "그 밖의 자료",
};

export const LEGAL_MATERIAL_KIND_ORDER: readonly LegalMaterialKind[] = [
  "CASE_NARRATIVE", "OPPONENT_CLAIM", "CONTRACT", "MESSAGE", "RECORDING", "JUDGMENT", "EXISTING_BRIEF", "OTHER",
];

/**
 * 만들 수 있는 문서.
 *
 * 순서가 곧 소송의 흐름입니다. 1차(분석·소송 시작), 2차(공방), 3차(불복).
 * 이 순서대로 화면에 놓으면 사용자가 지금 자기가 어디쯤인지 알 수 있습니다.
 */
export const legalDocumentTypeSchema = z.enum([
  "CASE_ANALYSIS",
  "DEMAND_LETTER",
  "COMPLAINT",
  "ANSWER",
  "BRIEF",
  "EVIDENCE_INDEX",
  "REBUTTAL",
  "JUDGMENT_ANALYSIS",
  "APPEAL_NOTICE",
  "APPEAL_REASONS",
]);
export type LegalDocumentType = z.infer<typeof legalDocumentTypeSchema>;

export type LegalDocumentStage = "ANALYZE" | "START" | "FIGHT" | "APPEAL";

export const LEGAL_DOCUMENT_STAGE_LABEL: Record<LegalDocumentStage, string> = {
  ANALYZE: "1. 사건 정리",
  START: "2. 소송 전 · 소송 시작",
  FIGHT: "3. 공방",
  APPEAL: "4. 판결 뒤",
};

export type LegalDocumentDefinition = {
  type: LegalDocumentType;
  label: string;
  /** 목록에서 한 줄 설명. 무엇을 하는 문서인지 고르기 전에 알 수 있어야 합니다. */
  summary: string;
  stage: LegalDocumentStage;
  /** 이 문서를 쓰는 때. 사용자는 문서 이름보다 자기 상황으로 고릅니다. */
  whenToUse: string;
  /** 모델에게 주는, 이 문서 고유의 지시. 공통 규칙은 게이트웨이가 붙입니다. */
  guide: readonly string[];
  /** 이 문서가 특히 기대는 자료. 없으면 화면이 먼저 알려 줍니다. */
  wants: readonly LegalMaterialKind[];
};

export const legalDocumentDefinitions: readonly LegalDocumentDefinition[] = [
  {
    type: "CASE_ANALYSIS",
    label: "사건 분석 · 주요쟁점 정리",
    summary: "사실관계와 쟁점, 유리한 증거와 불리한 부분을 먼저 정리합니다.",
    stage: "ANALYZE",
    whenToUse: "무엇부터 해야 할지 모를 때. 다른 문서를 만들기 전에 이것부터 하시길 권합니다.",
    wants: ["CASE_NARRATIVE", "OPPONENT_CLAIM", "CONTRACT", "MESSAGE"],
    guide: [
      "이 문서는 제출용 서면이 아니라 당사자가 자기 사건을 파악하기 위한 정리표입니다.",
      "sections에는 '사실관계', '내 주장', '상대 주장', '다툼 없는 사실', '불리한 부분', '추가로 필요한 증거'를 각각 하나씩 만듭니다.",
      "issues에는 다투는 쟁점을 하나씩 넣습니다. 각 쟁점마다 내 입장(myPosition), 상대 입장(theirPosition), 그 쟁점을 입증할 증거(evidence), 아직 없어서 더 모아야 하는 것(needed)을 적습니다.",
      "자료에서 상대방 주장이 확인되지 않으면 theirPosition을 비우고 추측해서 채우지 마세요.",
      "법적 평가(승소 가능성, 확률)를 적지 마세요. 이 서비스는 그것을 말하지 않습니다.",
    ],
  },
  {
    type: "DEMAND_LETTER",
    label: "내용증명",
    summary: "소송 전에 무엇을 언제까지 요구하는지 빠짐없이 적습니다.",
    stage: "START",
    whenToUse: "아직 소송 전이고, 돈을 받아야 하거나 계약 해지·환불·손해배상을 요구할 때.",
    wants: ["CASE_NARRATIVE", "CONTRACT", "MESSAGE"],
    guide: [
      "내용증명 형식으로 씁니다. sections는 '수신인·발신인', '사실관계', '요구사항', '이행기한', '불이행 시 조치' 순으로 만듭니다.",
      "요구사항은 금액·행위·기한이 분명해야 합니다. 금액은 자료에 있는 숫자만 씁니다.",
      "이행기한은 자료에 적힌 것이 없으면 비워 두고 notes에 '기한을 직접 정해 넣으세요'라고 적습니다. 임의로 날짜를 만들지 마세요.",
      "협박으로 읽힐 표현은 쓰지 않습니다. 법적 절차를 밟겠다는 사실만 담담하게 적습니다.",
    ],
  },
  {
    type: "COMPLAINT",
    label: "소장",
    summary: "청구취지와 청구원인을 갖춘 소장 초안을 만듭니다.",
    stage: "START",
    whenToUse: "내가 소송을 제기하려고 할 때. (소송장이 아니라 '소장'이 맞는 이름입니다.)",
    wants: ["CASE_NARRATIVE", "CONTRACT", "MESSAGE"],
    guide: [
      "민사 소장 형식으로 씁니다. sections는 '당사자', '청구취지', '청구원인', '입증방법', '첨부서류' 순으로 만듭니다.",
      "청구취지는 법원이 그대로 주문으로 옮길 수 있게 적습니다. 금액·이자·기산일은 자료에 있는 것만 씁니다.",
      "청구원인은 시간 순서대로, 사실 하나에 문단 하나로 적고 각 사실에 대응하는 증거를 함께 적습니다.",
      "관할 법원과 인지대·송달료는 임의로 적지 말고 notes에서 직접 확인하도록 안내합니다.",
    ],
  },
  {
    type: "ANSWER",
    label: "답변서",
    summary: "소장을 받았을 때 청구원인 각 사실을 인정·부인으로 정리합니다.",
    stage: "START",
    whenToUse: "소장을 받았을 때. 다투려면 정해진 기간 안에 답변서를 내야 합니다.",
    wants: ["OPPONENT_CLAIM", "CASE_NARRATIVE", "CONTRACT"],
    guide: [
      "답변서 형식으로 씁니다. sections는 '청구취지에 대한 답변', '청구원인에 대한 답변', '피고의 주장', '입증방법' 순으로 만듭니다.",
      "'청구원인에 대한 답변'은 상대가 주장한 사실을 하나씩 나열하고 각각 인정·부인·부지(모름) 중 무엇인지 분명히 적습니다. 뭉뚱그리지 마세요.",
      "자료에서 상대 주장이 확인되지 않는 부분은 임의로 만들지 말고, notes에 '소장의 해당 항목을 올려 주시면 이 부분을 채울 수 있습니다'라고 적습니다.",
      "답변서 제출기한은 사건마다 다르므로 notes에서 직접 확인하도록 안내합니다.",
    ],
  },
  {
    type: "BRIEF",
    label: "준비서면",
    summary: "내 주장과 증거를 정리해 재판부에 내는 서면입니다.",
    stage: "FIGHT",
    whenToUse: "재판이 진행되는 동안 내 주장을 보태거나 정리해 낼 때.",
    wants: ["CASE_NARRATIVE", "EXISTING_BRIEF", "CONTRACT", "MESSAGE"],
    guide: [
      "준비서면 형식으로 씁니다. sections는 '이 서면의 요지', 쟁점별 주장, '입증방법' 순으로 만듭니다.",
      "쟁점마다 주장 → 근거 → 증거 순서로 적습니다. 증거가 없는 주장은 그렇다고 표시하고 notes에 무엇이 필요한지 적습니다.",
      "이미 낸 서면이 자료에 있으면 같은 주장을 반복하지 말고 '앞서 밝힌 바와 같이'로 줄이고 새로운 부분만 씁니다.",
    ],
  },
  {
    type: "EVIDENCE_INDEX",
    label: "증거 · 입증취지 정리",
    summary: "올린 자료를 갑 제1호증 식으로 번호와 입증취지를 붙여 정리합니다.",
    stage: "FIGHT",
    whenToUse: "증거를 제출할 때. 무엇을 무엇 때문에 내는지 정리해야 할 때.",
    wants: ["CONTRACT", "MESSAGE", "RECORDING", "OTHER"],
    guide: [
      "evidenceItems를 채우는 것이 이 문서의 본체입니다. sections는 '증거 목록 개요' 하나만 짧게 만듭니다.",
      "내가 원고 쪽이면 '갑 제1호증', 피고 쪽이면 '을 제1호증'처럼 marker를 붙입니다. 사건에서 내 지위가 정해지지 않았으면 marker를 비우고 notes에 이유를 적습니다.",
      "name은 자료 이름 그대로, purpose(입증취지)는 '무엇을 입증하기 위함'으로 한 줄로 적습니다.",
      "자료에 없는 증거를 목록에 만들지 마세요.",
    ],
  },
  {
    type: "REBUTTAL",
    label: "상대방 서면 반박",
    summary: "상대가 낸 서면을 읽고 항목별로 반박 논리를 만듭니다.",
    stage: "FIGHT",
    whenToUse: "상대방이 준비서면이나 답변서를 냈을 때.",
    wants: ["OPPONENT_CLAIM", "EXISTING_BRIEF", "CONTRACT", "MESSAGE"],
    guide: [
      "sections에는 상대 주장 하나당 하나씩 만듭니다. heading에 상대 주장을 요약하고, body에 인정/부인과 반박 논리를 적습니다.",
      "bullets에는 그 반박을 뒷받침하는 증거를 적습니다. 증거가 없으면 비우고 notes에 무엇이 필요한지 적습니다.",
      "상대가 하지 않은 주장을 만들어 반박하지 마세요. 상대 서면이 자료에 없으면 notes에 그렇게 적고 sections를 비웁니다.",
      "마지막 section은 '상대가 답하지 않은 부분'으로, 내가 주장했는데 상대가 다루지 않은 것을 정리합니다.",
    ],
  },
  {
    type: "JUDGMENT_ANALYSIS",
    label: "판결문 분석",
    summary: "이긴 부분·진 부분과 법원이 인정한 사실을 갈라 봅니다.",
    stage: "APPEAL",
    whenToUse: "판결문을 받았을 때. 항소할지 정하기 전에.",
    wants: ["JUDGMENT", "EXISTING_BRIEF"],
    guide: [
      "sections는 '결론 요약', '인정된 사실', '인정되지 않은 사실', '법원이 판단한 쟁점', '내가 주장했으나 판단되지 않은 부분', '항소에서 다툴 후보' 순으로 만듭니다.",
      "'항소에서 다툴 후보'는 사실오인·법리오해·절차 문제 중 어디에 해당하는지 함께 적습니다.",
      "판결문이 자료에 없으면 sections를 비우고 notes에 '판결문을 올려 주세요'라고만 적습니다. 판결 내용을 추측하지 마세요.",
      "승소 가능성이나 확률을 적지 마세요.",
      "deadlines에 항소 기간이 있다는 사실을 안내하되, 구체적 날짜는 계산하지 말고 판결문 송달일을 기준으로 직접 확인하도록 적습니다.",
    ],
  },
  {
    type: "APPEAL_NOTICE",
    label: "항소장",
    summary: "항소한다는 의사와 범위를 밝히는 짧은 서면입니다.",
    stage: "APPEAL",
    whenToUse: "판결에 불복해 항소할 때. 기간이 짧으니 먼저 내는 문서입니다.",
    wants: ["JUDGMENT"],
    guide: [
      "짧게 씁니다. sections는 '당사자', '원판결의 표시', '항소취지', '항소의 범위' 정도면 충분합니다.",
      "항소이유는 여기에 길게 적지 않습니다 — 그것은 항소이유서가 할 일입니다. 그 사실을 notes에 적어 안내합니다.",
      "deadlines에 '항소는 판결문을 송달받은 날부터 정해진 기간 안에 제출해야 한다'는 안내를 넣되, 날짜를 직접 계산하지는 마세요. 송달일과 기간은 반드시 본인이 확인해야 합니다.",
    ],
  },
  {
    type: "APPEAL_REASONS",
    label: "항소이유서",
    summary: "1심 판단 중 무엇을 왜 다투는지 유형별로 정리합니다.",
    stage: "APPEAL",
    whenToUse: "항소장을 낸 뒤. 실제로 다투는 내용은 이 문서에 담깁니다.",
    wants: ["JUDGMENT", "EXISTING_BRIEF", "CONTRACT", "MESSAGE"],
    guide: [
      "sections는 '항소이유의 요지'로 시작해, 다투는 지점마다 하나씩 만듭니다.",
      "각 지점은 사실오인 / 법리오해 / 절차상 문제 / 판결 이유의 불비 중 무엇인지 heading에 밝히고, 1심 판결의 어느 판단을 다투는지 구체적으로 지목합니다.",
      "1심에서 이미 낸 주장과 새로 하는 주장을 구분해 적습니다.",
      "판결문이 자료에 없으면 sections를 비우고 notes에 판결문을 올려 달라고 적습니다.",
      "deadlines에 항소이유서에도 제출 기한이 있다는 안내를 넣되, 날짜를 계산하지 말고 항소기록 접수통지를 받은 날을 기준으로 직접 확인하도록 적습니다.",
    ],
  },
];

export function findLegalDocumentDefinition(type: LegalDocumentType): LegalDocumentDefinition {
  const found = legalDocumentDefinitions.find((definition) => definition.type === type);
  // 스키마로 걸러진 값만 들어오므로 실제로는 일어나지 않습니다. 그래도 조용히
  // undefined를 흘리면 프롬프트가 빈 채로 모델에 갑니다.
  if (!found) throw new Error(`알 수 없는 문서 종류입니다: ${type}`);
  return found;
}

export const LEGAL_DOCUMENT_STAGE_ORDER: readonly LegalDocumentStage[] = ["ANALYZE", "START", "FIGHT", "APPEAL"];

/**
 * 내 지위에 맞는 문서를 먼저 보여 줍니다.
 *
 * "소송을 걸려고 합니다 → 소장", "소장을 받았습니다 → 답변서". 사용자는
 * 문서 이름으로 고르지 않고 자기 상황으로 고릅니다. 그래서 목록에서 아예
 * 빼지는 않고(나중에 반대편 문서가 필요해질 수 있습니다) 순서만 바꿉니다.
 */
export function orderLegalDocuments(role: LegalPartyRole): LegalDocumentDefinition[] {
  const weight = (definition: LegalDocumentDefinition) => {
    if (role === "PLAINTIFF" && definition.type === "ANSWER") return 1;
    if (role === "DEFENDANT" && definition.type === "COMPLAINT") return 1;
    if (role === "DEFENDANT" && definition.type === "DEMAND_LETTER") return 1;
    return 0;
  };
  return [...legalDocumentDefinitions].sort((left, right) => weight(left) - weight(right));
}

export const LEGAL_CASE_MAX_MATERIALS = 30;
export const LEGAL_CASE_MAX_MATERIAL_CHARS = 60_000;
export const LEGAL_CASE_MAX_PROMPT_CHARS = 60_000;
export const LEGAL_CASE_MIN_SOURCE_CHARS = 120;

export const legalCaseInputSchema = z.object({
  title: z.string().min(1).max(120),
  caseType: legalCaseTypeSchema,
  myRole: legalPartyRoleSchema,
  summary: z.string().max(4_000),
});
export type LegalCaseInput = z.infer<typeof legalCaseInputSchema>;

export const legalMaterialInputSchema = z.object({
  kind: legalMaterialKindSchema,
  filename: z.string().min(1).max(260),
  text: z.string().min(1).max(LEGAL_CASE_MAX_MATERIAL_CHARS),
  sizeBytes: z.number().int().nonnegative(),
});
export type LegalMaterialInput = z.infer<typeof legalMaterialInputSchema>;

export type LegalCaseMaterial = LegalMaterialInput & { id: string; createdAt: string };

export type LegalCase = LegalCaseInput & { id: string; createdAt: string; updatedAt: string };

/**
 * 모델이 돌려주는 모양 — 문서 열 종류가 **한 스키마**를 같이 씁니다.
 *
 * 종류마다 스키마를 따로 두면 게이트웨이가 열 갈래로 갈라지고, 새 문서를
 * 더할 때마다 그 갈래가 하나씩 늡니다. 대신 종류별 차이는 지시문
 * (`LegalDocumentDefinition.guide`)이 만듭니다 — 쓰지 않는 배열은 빈 채로
 * 돌아옵니다.
 */
export const legalDocumentSectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
  bullets: z.array(z.string()),
  evidence: z.string(),
});

export const legalIssueSchema = z.object({
  label: z.string(),
  myPosition: z.string(),
  theirPosition: z.string(),
  evidence: z.string(),
  needed: z.string(),
});

export const legalEvidenceItemSchema = z.object({
  marker: z.string(),
  name: z.string(),
  purpose: z.string(),
});

export const legalDeadlineSchema = z.object({
  label: z.string(),
  detail: z.string(),
});

export const legalDocumentOutputSchema = z.object({
  title: z.string(),
  headline: z.string(),
  sections: z.array(legalDocumentSectionSchema),
  issues: z.array(legalIssueSchema),
  evidenceItems: z.array(legalEvidenceItemSchema),
  deadlines: z.array(legalDeadlineSchema),
  notes: z.array(z.string()),
});
export type LegalDocumentOutput = z.infer<typeof legalDocumentOutputSchema>;

const MAX_SECTIONS = 20;
const MAX_ROWS = 30;
const MAX_BULLETS = 10;
const MAX_NOTES = 10;

export function normalizeLegalDocumentOutput(output: LegalDocumentOutput): LegalDocumentOutput {
  return {
    title: output.title.trim(),
    headline: output.headline.trim(),
    sections: output.sections
      .map((section) => ({
        heading: section.heading.trim(),
        body: section.body.trim(),
        bullets: section.bullets.map((line) => line.trim()).filter(Boolean).slice(0, MAX_BULLETS),
        evidence: section.evidence.trim(),
      }))
      .filter((section) => section.heading || section.body || section.bullets.length)
      .slice(0, MAX_SECTIONS),
    issues: output.issues
      .map((issue) => ({
        label: issue.label.trim(),
        myPosition: issue.myPosition.trim(),
        theirPosition: issue.theirPosition.trim(),
        evidence: issue.evidence.trim(),
        needed: issue.needed.trim(),
      }))
      .filter((issue) => issue.label)
      .slice(0, MAX_ROWS),
    evidenceItems: output.evidenceItems
      .map((item) => ({ marker: item.marker.trim(), name: item.name.trim(), purpose: item.purpose.trim() }))
      .filter((item) => item.name)
      .slice(0, MAX_ROWS),
    deadlines: output.deadlines
      .map((deadline) => ({ label: deadline.label.trim(), detail: deadline.detail.trim() }))
      .filter((deadline) => deadline.label || deadline.detail)
      .slice(0, MAX_ROWS),
    notes: output.notes.map((note) => note.trim()).filter(Boolean).slice(0, MAX_NOTES),
  };
}

export type LegalCaseDocument = {
  id: string;
  docType: LegalDocumentType;
  title: string;
  output: LegalDocumentOutput;
  createdAt: string;
};

/** 사건 자료를 모델이 읽을 한 덩이로 만듭니다. 자료마다 무엇인지 이름표를 답니다. */
export function buildLegalCasePrompt(input: {
  legalCase: Pick<LegalCase, "title" | "caseType" | "myRole" | "summary">;
  materials: readonly Pick<LegalCaseMaterial, "kind" | "filename" | "text">[];
}): { text: string; truncated: string[] } {
  const blocks: string[] = [];
  const truncated: string[] = [];
  let remaining = LEGAL_CASE_MAX_PROMPT_CHARS;

  blocks.push([
    "[사건 정보]",
    `사건 이름: ${input.legalCase.title}`,
    `사건 종류: ${LEGAL_CASE_TYPE_LABEL[input.legalCase.caseType]}`,
    `내 지위: ${LEGAL_PARTY_ROLE_LABEL[input.legalCase.myRole]}`,
  ].join("\n"));

  const summary = input.legalCase.summary.trim();
  if (summary) {
    const used = summary.slice(0, remaining);
    if (used.length < summary.length) truncated.push("사건 경위");
    remaining -= used.length;
    blocks.push(`[본인이 적은 사건 경위]\n${used}`);
  }

  let index = 0;
  for (const material of input.materials) {
    const text = material.text.trim();
    if (!text) continue;
    index += 1;
    const label = `[자료 ${index} · ${LEGAL_MATERIAL_KIND_LABEL[material.kind]} · ${material.filename}]`;
    if (remaining <= 0) { truncated.push(material.filename); continue; }
    const used = text.slice(0, remaining);
    if (used.length < text.length) truncated.push(material.filename);
    remaining -= used.length;
    blocks.push(`${label}\n${used}`);
  }

  return { text: blocks.join("\n\n"), truncated };
}

export function countLegalCaseSourceCharacters(input: {
  summary: string;
  materials: readonly Pick<LegalCaseMaterial, "text">[];
}): number {
  return input.summary.trim().length + input.materials.reduce((total, material) => total + material.text.trim().length, 0);
}

export function hasEnoughLegalCaseSource(input: {
  summary: string;
  materials: readonly Pick<LegalCaseMaterial, "text">[];
}): boolean {
  return countLegalCaseSourceCharacters(input) >= LEGAL_CASE_MIN_SOURCE_CHARS;
}

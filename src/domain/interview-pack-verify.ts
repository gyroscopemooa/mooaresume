import {
  CONFLICT_TOPIC_LABEL,
  EXPERIENCE_SLOT_IDS,
  PACK_SLOT_IDS,
  cardIsComplete,
  getPackSlot,
  type AiAssessment,
  type AiCard,
  type AiSourceRef,
  type ConflictConfirmation,
  type EvidenceRef,
  type PackAssessment,
  type PackCard,
  type PackIssue,
  type PackSlotId,
  type SlotAssessment,
  type VerifiedConflict,
  type VerifiedFact,
} from "@/domain/interview-pack";
import {
  buildKeywords,
  locateQuote,
  normalizeForMatch,
  sentenceExistsInAnswer,
  splitParagraphs,
  splitSentences,
  type EffectiveMaterials,
} from "@/domain/interview-pack-text";

/**
 * 모델이 돌려준 점검 결과·답변 카드를 서버가 다시 확인하는 자리.
 *
 * 구조화 출력(strict JSON schema)은 "형식"만 보장한다. 인용이 실제 원문에 있는지,
 * 숫자와 역할이 자료의 범위를 넘지 않았는지는 여기서 따로 확인한다.
 * 이 확인도 완전하지 않다 — 원문 링크가 있다고 내용이 사실이라는 보증은 아니고,
 * 어휘 목록으로 잡는 것은 자료가 부정한 표현과 숫자 파생 같은 알려진 함정뿐이다.
 * 그래서 화면은 이 결과를 "자동 점검"이라고 부르고 "검증 완료"라고 부르지 않는다.
 */

// ───────────────────────────── 근거 확인 ─────────────────────────────

/** 인용이 실제 자료에 있으면 화면·저장용 근거로 바꾼다. 없으면 null. */
export function resolveEvidence(ref: AiSourceRef, materials: EffectiveMaterials): EvidenceRef | null {
  const located = locateQuote(materials.docs, ref);
  if (!located) return null;
  const doc = materials.docs.find((candidate) => candidate.id === located.docId);
  if (!doc) return null;
  return {
    docId: doc.id,
    paragraph: located.paragraph,
    quote: ref.quote.trim(),
    docTitle: doc.title,
    docKind: doc.kind,
    documentId: doc.documentId,
    documentVersionId: doc.documentVersionId,
    materialsVersion: materials.version,
    paragraphText: located.paragraphText,
  };
}

/** FNV-1a 32비트. 암호용이 아니라 같은 충돌에 같은 id를 주기 위한 것이다(클라이언트에서도 돈다). */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** 두 원문의 위치·내용만으로 만든 id. 모델이 매번 다른 id를 줘도 사용자의 확인 기록이 이어진다. */
export function stableConflictId(topic: string, left: EvidenceRef, right: EvidenceRef): string {
  const sides = [
    `${left.docId}:${normalizeForMatch(left.quote)}`,
    `${right.docId}:${normalizeForMatch(right.quote)}`,
  ].sort();
  return `C-${fnv1a(`${topic}|${sides[0]}|${sides[1]}`)}`;
}

// ───────────────────────────── 점검 결과 확인·합치기 ─────────────────────────────

const MAX_QUESTIONS = 3;

/** 지원자가 "부족한 내용 보완"의 회사·직무 칸에 직접 적은 문단인가. */
function isUserFieldOverride(evidence: EvidenceRef): boolean {
  return evidence.docKind === "supplement" && /^\s*\[(지원회사|지원직무)\]/.test(evidence.paragraphText);
}

function unresolvedConflicts(conflicts: readonly VerifiedConflict[], confirmations: readonly ConflictConfirmation[]): VerifiedConflict[] {
  const confirmed = new Set(confirmations.map((entry) => entry.conflictId));
  return conflicts.filter((conflict) => !confirmed.has(conflict.id));
}

export function listUnresolvedConflicts(assessment: PackAssessment, confirmations: readonly ConflictConfirmation[]): VerifiedConflict[] {
  return unresolvedConflicts(assessment.conflicts, confirmations);
}

/** 자료의 빈자리를 코드로 확정할 수 있는 항목. 모델이 "만들 수 있다"고 해도 여기서 막는다. */
function deterministicGate(slot: PackSlotId, materials: EffectiveMaterials): { reason: string; questions: string[] } | null {
  if (!materials.docs.some((doc) => doc.text.trim().length >= 20)) {
    return { reason: "제출된 자료에서 읽을 내용이 없습니다.", questions: getPackSlot(slot).defaultQuestions };
  }
  if (!materials.role) {
    return { reason: "지원 직무가 입력되지 않았습니다.", questions: ["지원하려는 직무를 알려 주세요."] };
  }
  if (slot === "motivation_company" && !materials.company && !materials.hasJobPosting) {
    return {
      reason: "지원 회사도 채용공고도 입력되지 않아, 회사에 대한 지원동기의 근거가 없습니다.",
      questions: ["지원하는 회사 이름을 알려 주세요.", "채용공고 본문이 있다면 붙여 넣어 주세요."],
    };
  }
  return null;
}

/**
 * 모델의 점검 결과를 원문과 대조해 저장할 형태로 만든다.
 *  - 원문에서 인용을 찾지 못한 사실·충돌은 버린다.
 *  - 근거가 남지 않은 "만들 수 있음"은 자료 보완 필요로 내린다.
 *  - 코드로 확정되는 빈자리(직무·회사·공고 없음)와 풀리지 않은 충돌을 덧씌운다.
 */
export function buildVerifiedAssessment(ai: AiAssessment, materials: EffectiveMaterials): PackAssessment {
  const facts: VerifiedFact[] = [];
  const seenFactIds = new Set<string>();
  let droppedFacts = 0;
  for (const fact of ai.facts) {
    const evidence = resolveEvidence(fact.source, materials);
    if (!evidence || seenFactIds.has(fact.id)) {
      droppedFacts += 1;
      continue;
    }
    seenFactIds.add(fact.id);
    facts.push({ id: fact.id, kind: fact.kind, statement: fact.statement, source: evidence });
  }

  const conflicts: VerifiedConflict[] = [];
  const seenConflictIds = new Set<string>();
  let droppedConflicts = 0;
  for (const conflict of ai.conflicts) {
    const left = resolveEvidence(conflict.left, materials);
    const right = resolveEvidence(conflict.right, materials);
    // 양쪽 원문을 나란히 보여 주려면 둘 다 실제로 있어야 한다. 같은 문장끼리는 충돌이 아니다.
    if (!left || !right || (left.docId === right.docId && left.paragraph === right.paragraph && normalizeForMatch(left.quote) === normalizeForMatch(right.quote))) {
      droppedConflicts += 1;
      continue;
    }
    // 지원자가 보완 칸에 적은 회사·직무는 원본의 "미정"·빈 값을 채우는 것이지, 서류끼리의 충돌이 아니다.
    if (isUserFieldOverride(left) || isUserFieldOverride(right)) {
      droppedConflicts += 1;
      continue;
    }
    const id = stableConflictId(conflict.topic, left, right);
    if (seenConflictIds.has(id)) continue;
    seenConflictIds.add(id);
    conflicts.push({ id, topic: conflict.topic, summary: conflict.summary, left, right });
  }

  const aiBySlot = new Map(ai.slots.map((entry) => [entry.slot, entry]));
  const blocking = unresolvedConflicts(conflicts, materials.confirmations);

  const slots: SlotAssessment[] = PACK_SLOT_IDS.map((slot) => {
    const def = getPackSlot(slot);
    const fromAi = aiBySlot.get(slot);
    let status = fromAi?.status ?? "needs_material";
    let reason = fromAi?.reason ?? "점검 결과에 이 항목이 없어 자료가 부족한 것으로 봅니다.";
    let questions = (fromAi?.questions ?? []).slice(0, MAX_QUESTIONS);
    const factIds = (fromAi?.factIds ?? []).filter((id) => seenFactIds.has(id));
    let blockedByConflictIds: string[] = [];

    // 모델이 만들 수 있다고 했어도 원문으로 확인된 사실이 하나도 없으면 완성 답변의 근거가 없다.
    if (status === "ready" && factIds.length === 0) {
      status = "needs_material";
      reason = "이 항목을 뒷받침할 사실을 자료 원문에서 확인하지 못했습니다.";
    }

    const gate = deterministicGate(slot, materials);
    if (gate) {
      status = "needs_material";
      reason = gate.reason;
      questions = gate.questions.slice(0, MAX_QUESTIONS);
    }

    if (EXPERIENCE_SLOT_IDS.includes(slot) && blocking.length > 0 && status !== "needs_material") {
      blockedByConflictIds = blocking.map((conflict) => conflict.id);
      status = "needs_confirmation";
      const topics = [...new Set(blocking.map((conflict) => CONFLICT_TOPIC_LABEL[conflict.topic]))].join("·");
      reason = `서류마다 다른 내용이 있어 확정하지 않았습니다(${topics}). 어느 쪽이 맞는지 확인해 주세요.`;
      questions = ["아래 '서류 사이 다른 내용'에서 맞는 쪽을 골라 주세요."];
    }

    if (status === "needs_material" && questions.length === 0) questions = def.defaultQuestions.slice(0, MAX_QUESTIONS);
    if (status === "ready") questions = [];
    return { slot, status, reason, questions, factIds, blockedByConflictIds };
  });

  // 마지막 한마디는 지원동기나 포부가 하나라도 만들어질 때만 의미가 있다.
  const closing = slots.find((entry) => entry.slot === "closing");
  const closingBase = slots.filter((entry) => entry.slot === "motivation_company" || entry.slot === "aspiration" || entry.slot === "motivation_role");
  if (closing && closing.status === "ready" && !closingBase.some((entry) => entry.status === "ready")) {
    closing.status = "needs_material";
    closing.reason = "지원동기나 입사 후 포부가 정해져야 마지막 한마디를 만들 수 있습니다.";
    closing.questions = getPackSlot("closing").defaultQuestions;
  }

  return { materialsVersion: materials.version, facts, conflicts, slots, droppedFacts, droppedConflicts };
}

/**
 * 사용자가 충돌을 확인한 뒤, 같은 점검 결과에서 상태만 다시 계산한다(AI 호출 없음).
 * 확인으로 풀린 충돌이 걸고 있던 항목은 확인 상태에서 풀려 "만들 수 있음"으로 돌아온다.
 */
export function refreshAssessmentAfterConfirmations(assessment: PackAssessment, confirmations: readonly ConflictConfirmation[]): PackAssessment {
  const blocking = unresolvedConflicts(assessment.conflicts, confirmations);
  const blockingIds = new Set(blocking.map((conflict) => conflict.id));
  const slots = assessment.slots.map((slot) => {
    if (slot.status !== "needs_confirmation") return slot;
    const stillBlocked = slot.blockedByConflictIds.filter((id) => blockingIds.has(id));
    if (stillBlocked.length > 0) return { ...slot, blockedByConflictIds: stillBlocked };
    // 풀렸다. 이 항목을 뒷받침할 사실이 남아 있으면 만들 수 있다.
    return slot.factIds.length > 0
      ? { ...slot, status: "ready" as const, reason: "서류 사이 다른 내용을 확인하셨습니다. 확인하신 내용 기준으로 만들 수 있습니다.", questions: [], blockedByConflictIds: [] }
      : { ...slot, status: "needs_material" as const, blockedByConflictIds: [] };
  });
  return { ...assessment, slots };
}

// ───────────────────────────── 답변 속 주장 점검 ─────────────────────────────

const NEGATION_CUES = /(아니|아닙|아닌|않|못|없|아님)/;

/**
 * 사실 주장에 쓰이는 숫자 토큰: "8건", "2년", "30%", "200", "2024".
 * 단위가 없는 한 자리 숫자("3가지", "1순위")는 사실 주장이 아니라 말버릇이라 잡지 않는다.
 */
export function extractNumberTokens(text: string): string[] {
  const tokens = new Set<string>();
  const pattern = /(\d[\d,]*(?:\.\d+)?)\s*(건|명|%|퍼센트|배|개월|개|회|원|년|월|달|주|일|시간|분|초|점)?/g;
  for (const match of text.matchAll(pattern)) {
    const digits = match[1].replace(/,/g, "");
    const unit = match[2] ?? "";
    if (!unit && digits.replace(/\./g, "").length < 2) continue;
    tokens.add(`${digits}${unit}`);
  }
  return [...tokens];
}

/** 이 토큰이 자료 어딘가에 같은 형태로 있는가. 단위 없는 숫자는 어떤 단위로든 자료에 있으면 인정한다. */
function tokenInSources(token: string, sourceTokens: ReadonlySet<string>): boolean {
  if (sourceTokens.has(token)) return true;
  if (/^[\d.]+$/.test(token)) {
    for (const candidate of sourceTokens) if (candidate.replace(/[^\d.]/g, "") === token) return true;
  }
  return false;
}

/** 자료가 "측정하지 않았다"고 밝힌 성과·회사 사실을 답변이 새로 만들어 내는지 보는 어휘. */
const METRIC_TERMS = ["불량률", "개선율", "시장점유율", "점유율", "매출", "영업이익", "비용 절감", "비용절감", "시간 단축", "시간단축", "시간 절감", "시간절감", "생산성", "납기 준수", "수율"];
const COMPANY_FACT_TERMS = ["사내 문화", "기업 문화", "기업문화", "조직문화", "복지", "연봉", "최근 투자", "투자 유치", "업계 1위", "글로벌 1위", "핵심 가치", "신사업"];

/** 지원자 본인이 "이끌었다·승인했다"고 말하는 문장 패턴. 자료가 범위를 한정했다면 부풀린 것이다. */
const FIRST_PERSON_LEADERSHIP: Array<{ label: string; lexeme: string; pattern: RegExp }> = [
  { label: "팀장·책임자 직책", lexeme: "팀장", pattern: /(저는|제가|저의)[^.!?\n]{0,30}?(팀장|리더|책임자|총괄|관리자)(으로|이었|였|입니다|이라)/ },
  { label: "최종 승인·결정 권한", lexeme: "최종 승인", pattern: /(제가|저는)[^.!?\n]{0,30}?(최종\s*(승인|결정|결재))[^.!?\n]{0,8}?(했|하였|해|맡|담당)/ },
  { label: "팀을 이끈 역할", lexeme: "이끌", pattern: /(제가|저는)[^.!?\n]{0,30}?(지휘|총괄|이끌|리드)[^.!?\n]{0,8}?(했|하였|해|맡)/ },
];

type SourceIndex = { normalized: string; sentences: string[]; tokens: Set<string> };

function indexSources(sourceTexts: readonly string[]): SourceIndex {
  const joined = sourceTexts.join("\n");
  return {
    normalized: normalizeForMatch(joined),
    sentences: splitSentences(joined),
    tokens: new Set(extractNumberTokens(joined)),
  };
}

/**
 * 자료가 이 어휘를 "그렇다"는 뜻으로 쓰는가.
 * 어휘가 든 문장 중 부정 표현이 없는 문장이 있고, 부정하는 문장이 하나도 없어야 한다.
 * ("제품 불량률을 측정한 것은 아니다"는 그 어휘가 성과가 아니라는 부정이므로 근거가 아니다.)
 */
function sourcesAffirm(lexeme: string, index: SourceIndex): boolean {
  const needle = normalizeForMatch(lexeme);
  const mentioning = index.sentences.filter((sentence) => normalizeForMatch(sentence).includes(needle));
  if (mentioning.length === 0) return false;
  if (mentioning.some((sentence) => NEGATION_CUES.test(sentence))) return false;
  return true;
}

/** 이 답변 문장에 부정 표현이 있으면, 그 어휘는 "주장"이 아니라 "아니라는 말"이다. */
function affirmativeAnswerSentences(answer: string): string[] {
  return splitSentences(answer).filter((sentence) => !NEGATION_CUES.test(sentence));
}

/** 자료 밖의 숫자·성과 어휘·역할 부풀림을 잡는다. 반환은 모두 답변 카드에 붙는 이슈다. */
export function scanClaims(answer: string, sourceTexts: readonly string[]): PackIssue[] {
  const issues: PackIssue[] = [];
  const index = indexSources(sourceTexts);

  const unsupportedNumbers = extractNumberTokens(answer).filter((token) => !tokenInSources(token, index.tokens));
  if (unsupportedNumbers.length > 0) {
    issues.push({
      type: "unsupported_number",
      severity: "error",
      detail: `자료에서 확인되지 않은 숫자: ${unsupportedNumbers.join(", ")}`,
    });
  }

  const claimSentences = affirmativeAnswerSentences(answer);
  const claimText = claimSentences.join(" ");
  const claimNormalized = normalizeForMatch(claimText);
  for (const term of [...METRIC_TERMS, ...COMPANY_FACT_TERMS]) {
    if (!claimNormalized.includes(normalizeForMatch(term))) continue;
    if (sourcesAffirm(term, index)) continue;
    issues.push({ type: "unsupported_term", severity: "error", detail: `자료가 뒷받침하지 않는 표현: ‘${term}’` });
  }

  for (const rule of FIRST_PERSON_LEADERSHIP) {
    if (!claimSentences.some((sentence) => rule.pattern.test(sentence))) continue;
    // 자료가 본인의 그 역할을 부정하거나 아예 말하지 않으면 부풀린 것이다.
    // (역할 어휘를 자료가 그대로 긍정한 경우에만 통과)
    if (sourcesAffirm(rule.lexeme, index)) continue;
    issues.push({ type: "role_inflation", severity: "error", detail: `자료에 없는 역할·권한 표현(${rule.label})` });
  }
  return issues;
}

/** 확인으로 물리친 역할 서술에만 있는 동사(팀 배정·지휘 등). 자료가 승인 주체를 다른 사람으로 밝힌 경우의 부풀림을 잡는다. */
const REJECTED_ROLE_LEXEMES = ["배정", "지휘", "총괄", "이끌", "리드"];

/**
 * 사용자가 확인으로 물리친 쪽에만 있는 숫자·역할 표현이 답변에 남아 있는지.
 * "물리친 쪽에만"이란 그 문단을 뺀 나머지 자료 어디에도 없는 값이다 — 같은 날짜가 이력서의 다른 줄에
 * 있다면 그것은 물리친 값이 아니라 원래 있는 사실이다.
 */
export function scanRejectedValues(answer: string, confirmations: readonly ConflictConfirmation[], sourceTexts: readonly string[] = []): PackIssue[] {
  const answerTokens = new Set(extractNumberTokens(answer));
  const answerNormalized = normalizeForMatch(affirmativeAnswerSentences(answer).join(" "));
  const found = new Set<string>();
  for (const confirmation of confirmations) {
    if (!confirmation.rejectedText) continue;
    const rejectedLines = new Set(confirmation.rejectedText.split("\n").map((line) => line.trim()).filter(Boolean));
    const elsewhere = sourceTexts.map((text) => splitParagraphs(text).filter((line) => !rejectedLines.has(line)).join("\n")).join("\n");
    const elsewhereTokens = new Set(extractNumberTokens(elsewhere));
    const chosen = new Set(extractNumberTokens(confirmation.chosenText ?? ""));
    for (const token of extractNumberTokens(confirmation.rejectedText)) {
      if (!chosen.has(token) && !elsewhereTokens.has(token) && answerTokens.has(token)) found.add(token);
    }
    if (confirmation.topic === "role") {
      const chosenNormalized = normalizeForMatch(confirmation.chosenText ?? "");
      const elsewhereNormalized = normalizeForMatch(elsewhere);
      const rejectedNormalized = normalizeForMatch(confirmation.rejectedText);
      for (const lexeme of REJECTED_ROLE_LEXEMES) {
        const needle = normalizeForMatch(lexeme);
        if (rejectedNormalized.includes(needle) && !chosenNormalized.includes(needle) && !elsewhereNormalized.includes(needle) && answerNormalized.includes(needle)) found.add(lexeme);
      }
    }
  }
  if (found.size === 0) return [];
  return [{ type: "rejected_value", severity: "error", detail: `확인 과정에서 제외하신 내용이 답변에 남아 있습니다: ${[...found].join(", ")}` }];
}

function excludePhrases(exclude: string): string[] {
  return exclude
    .split(/[\n,;/·、]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 3 && entry.length <= 40);
}

// ───────────────────────────── 카드 확인 ─────────────────────────────

function sourceTexts(materials: EffectiveMaterials): string[] {
  return materials.docs.map((doc) => doc.text);
}

/** 서로 다른 구조여야 하는 두 자기소개가 사실상 같은 글인가(1분을 반으로 자른 30초). */
export function introsLookTruncated(intro30: string, intro60: string): boolean {
  const short = splitSentences(intro30).map(normalizeForMatch).filter(Boolean);
  const long = splitSentences(intro60).map(normalizeForMatch).filter(Boolean);
  if (short.length === 0 || long.length === 0) return false;
  const normalizedShort = normalizeForMatch(intro30);
  const normalizedLong = normalizeForMatch(intro60);
  if (normalizedLong.startsWith(normalizedShort) || normalizedShort.startsWith(normalizedLong)) return true;
  const shared = short.filter((sentence) => long.includes(sentence)).length;
  return short.length >= 2 && shared / short.length >= 0.6;
}

function fallbackSteps(answer: string): Array<{ label: string; sentence: string }> {
  const sentences = splitSentences(answer);
  if (sentences.length === 0) return [];
  const picks = sentences.length <= 4
    ? sentences
    : [sentences[0], sentences[Math.floor(sentences.length / 3)], sentences[Math.floor((sentences.length * 2) / 3)], sentences[sentences.length - 1]];
  return picks.map((sentence, index) => ({ label: `${index + 1}단계`, sentence }));
}

export type CardVerificationInput = {
  materials: EffectiveMaterials;
  assessment: PackAssessment | null;
  /** 이번에 함께 만든(또는 이미 저장된) 자기소개. 30초/1분 구조 비교에 쓴다. */
  siblingIntros?: { intro30?: string; intro60?: string };
};

/**
 * 모델이 만든 카드 하나를 확인해 저장·표시용 카드로 바꾼다.
 * 문제는 `issues`에 남기고 카드를 버리지 않는다 — 어디가 왜 걸렸는지 사용자가 볼 수 있어야 한다.
 */
export function verifyGeneratedCard(ai: AiCard, input: CardVerificationInput): PackCard {
  const { materials } = input;
  const issues: PackIssue[] = [];

  const evidence: EvidenceRef[] = [];
  let missingEvidence = 0;
  for (const ref of ai.evidence) {
    const resolved = resolveEvidence(ref, materials);
    if (resolved) evidence.push(resolved);
    else missingEvidence += 1;
  }
  if (evidence.length === 0) {
    issues.push({ type: "quote_missing", severity: "error", detail: "답변의 근거로 든 원문을 자료에서 찾지 못했습니다." });
  } else if (missingEvidence > 0) {
    issues.push({ type: "quote_missing", severity: "warn", detail: `근거 ${missingEvidence}건은 원문에서 찾지 못해 뺐습니다.` });
  }

  const keywords = buildKeywords(ai.answer, ai.keywords).filter((keyword) => keyword.sentenceIndex !== null);
  if (keywords.length < ai.keywords.length) {
    issues.push({
      type: "keyword_missing",
      severity: keywords.length >= 3 ? "warn" : "error",
      detail: `답변 안에 없는 키워드 ${ai.keywords.length - keywords.length}개를 뺐습니다.`,
    });
  }

  let steps = ai.steps.filter((step) => sentenceExistsInAnswer(ai.answer, step.sentence));
  if (steps.length < 2) {
    steps = fallbackSteps(ai.answer);
    issues.push({ type: "step_missing", severity: "warn", detail: "말하는 순서를 답변 문장에서 자동으로 나눴습니다." });
  }

  issues.push(...scanClaims(ai.answer, sourceTexts(materials)));
  issues.push(...scanRejectedValues(ai.answer, materials.confirmations, sourceTexts(materials)));

  for (const phrase of excludePhrases(materials.exclude)) {
    if (normalizeForMatch(ai.answer).includes(normalizeForMatch(phrase))) {
      issues.push({ type: "excluded_content", severity: "warn", detail: `제외해 달라고 하신 내용(‘${phrase}’)이 답변에 들어 있습니다.` });
    }
  }

  if (ai.slot === "intro_30" && input.siblingIntros?.intro60 && introsLookTruncated(ai.answer, input.siblingIntros.intro60)) {
    issues.push({ type: "structure", severity: "error", detail: "30초 자기소개가 1분 자기소개를 줄여 붙인 것처럼 같은 문장으로 이루어져 있습니다." });
  }
  if (ai.slot === "intro_60" && input.siblingIntros?.intro30 && introsLookTruncated(input.siblingIntros.intro30, ai.answer)) {
    issues.push({ type: "structure", severity: "error", detail: "1분 자기소개가 30초 자기소개를 늘여 붙인 것처럼 같은 문장으로 이루어져 있습니다." });
  }

  const factIds = new Set(input.assessment?.facts.map((fact) => fact.id) ?? []);
  const usedFactIds = ai.usedFactIds.filter((id) => factIds.has(id));

  return {
    slot: ai.slot,
    answer: ai.answer.trim(),
    keywords,
    steps,
    memoryLine: ai.memoryLine.trim(),
    followUps: ai.followUps.map((question) => question.trim()).filter(Boolean),
    evidence,
    usedFactIds,
    issues,
  };
}

/**
 * 사용자가 직접 고친 답변을 다시 점검한다(AI 호출 없음).
 * 키워드·근거 상태를 새 본문에 맞춰 갱신하고, 문제는 모두 안내(warn)로만 남긴다 —
 * 본인 글을 쓴 사람의 판단을 시스템이 오류로 막지 않는다.
 */
export function recheckEditedCard(previous: PackCard, newAnswer: string, materials: EffectiveMaterials): PackCard {
  const answer = newAnswer.trim();
  const issues: PackIssue[] = [];

  // 근거: 저장된 원문 문단에 인용이 여전히 있는지만 본다(자료는 바뀌지 않았다).
  const evidence = previous.evidence.filter((ref) => normalizeForMatch(ref.paragraphText).includes(normalizeForMatch(ref.quote)));

  const keywords = buildKeywords(answer, previous.keywords.map((keyword) => keyword.text));
  const missing = keywords.filter((keyword) => keyword.sentenceIndex === null);
  if (missing.length > 0) {
    issues.push({ type: "keyword_missing", severity: "warn", detail: `수정한 답변에 없는 키워드: ${missing.map((keyword) => keyword.text).join(", ")}` });
  }

  const steps = previous.steps.filter((step) => sentenceExistsInAnswer(answer, step.sentence));
  if (steps.length < previous.steps.length) {
    issues.push({ type: "step_missing", severity: "warn", detail: "수정으로 문장이 바뀌어 일부 ‘말하는 순서’를 다시 나눴습니다." });
  }

  for (const issue of [...scanClaims(answer, sourceTexts(materials)), ...scanRejectedValues(answer, materials.confirmations, sourceTexts(materials))]) {
    issues.push({ ...issue, severity: "warn" });
  }

  return {
    ...previous,
    answer,
    keywords,
    steps: steps.length >= 2 ? steps : fallbackSteps(answer),
    evidence,
    issues,
  };
}

/** 카드가 "완성 답변"으로 표시되는지 한 곳에서 정한다. */
export function isCompleteAnswer(card: PackCard): boolean {
  return cardIsComplete(card);
}

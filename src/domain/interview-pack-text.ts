import {
  PACK_DOC_KIND_LABEL,
  PACK_SLOTS,
  type AiSourceRef,
  type ConflictConfirmation,
  type FinalHints,
  type MaterialDoc,
  type MaterialsPayload,
  type PackDocKind,
  type PackKeyword,
  type PackSlotAnswer,
  type PackSlotId,
  type PackSupplements,
} from "@/domain/interview-pack";

/**
 * 면접 준비팩의 텍스트 도구들 — 문단 나누기, 원문 인용 찾기, 문장 나누기,
 * 자료 버전 합치기, 연습 시간 어림.
 *
 * 전부 순수 함수다. 서버 검증과 화면(키워드 → 문장, 근거 보기)이 같은
 * 함수를 쓰므로 "서버는 있다고 했는데 화면은 못 찾는" 어긋남이 생기지 않는다.
 */

// ───────────────────────────── 문단·인용 ─────────────────────────────

/**
 * 자료를 문단으로 나눈다. 줄 단위이고 빈 줄은 버린다.
 * 모델에게 보여 주는 [문서id¶번호]와 저장된 근거의 paragraph 는 이 결과의 인덱스다.
 * 규칙을 바꾸면 저장된 근거가 엉뚱한 문단을 가리키므로 함부로 바꾸지 않는다.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** 인용 비교용 정규화: 공백·따옴표를 없애고 줄임표·대시 표기를 한 가지로 맞춘다. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\s​-‍﻿]+/g, "")
    .replace(/["'“”‘’「」『』]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/[〜∼～]/g, "~");
}

export type LocatedQuote = { docId: string; paragraph: number; paragraphText: string };

/**
 * 인용이 실제로 그 문서에 있는지 찾는다.
 * 모델이 준 문단 번호를 먼저 보고, 어긋나 있으면 같은 문서의 다른 문단에서 찾는다
 * (번호만 한 칸 틀리는 경우가 흔하다). 어디에도 없으면 null — 근거로 인정하지 않는다.
 */
export function locateQuote(docs: readonly MaterialDoc[], ref: AiSourceRef): LocatedQuote | null {
  const doc = docs.find((candidate) => candidate.id === ref.docId);
  if (!doc) return null;
  const needle = normalizeForMatch(ref.quote);
  // 너무 짧은 인용("네", "2년")은 어디에나 들어맞는다. 근거로 삼지 않는다.
  if (needle.length < 4) return null;

  const paragraphs = splitParagraphs(doc.text);
  const hinted = paragraphs[ref.paragraph];
  if (hinted !== undefined && normalizeForMatch(hinted).includes(needle)) {
    return { docId: doc.id, paragraph: ref.paragraph, paragraphText: hinted };
  }
  for (let index = 0; index < paragraphs.length; index += 1) {
    if (normalizeForMatch(paragraphs[index]).includes(needle)) {
      return { docId: doc.id, paragraph: index, paragraphText: paragraphs[index] };
    }
  }
  return null;
}

/** 모델에게 보여 줄 자료 블록. 문단마다 [문서id¶번호] 표식이 붙는다. */
export function renderDocsForPrompt(docs: readonly MaterialDoc[]): string {
  return docs
    .map((doc) => {
      const lines = splitParagraphs(doc.text).map((paragraph, index) => `[${doc.id}¶${index}] ${paragraph}`);
      return [`<자료 id="${doc.id}" 종류="${PACK_DOC_KIND_LABEL[doc.kind]}" 이름="${doc.title.replace(/"/g, "'")}">`, ...lines, "</자료>"].join("\n");
    })
    .join("\n\n");
}

// ───────────────────────────── 문장·키워드 ─────────────────────────────

/** 문장 단위로 나눈다. 소수점("3.5")은 문장 끝으로 보지 않는다. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) sentences.push(trimmed);
  };
  for (const line of text.split(/\r?\n/)) {
    let current = "";
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      current += char;
      const decimalPoint = char === "." && /\d/.test(line[index + 1] ?? "");
      if (!decimalPoint && /[.!?。！？]/.test(char)) {
        while (index + 1 < line.length && /[.!?。！？"'”’)\]]/.test(line[index + 1])) {
          index += 1;
          current += line[index];
        }
        push(current);
        current = "";
      }
    }
    push(current);
  }
  return sentences;
}

/** 키워드가 들어 있는 첫 문장의 번호. 답변이 수정되어 키워드가 사라졌으면 null. */
export function findKeywordSentence(answer: string, keyword: string): number | null {
  const needle = normalizeForMatch(keyword);
  if (!needle) return null;
  const sentences = splitSentences(answer);
  for (let index = 0; index < sentences.length; index += 1) {
    if (normalizeForMatch(sentences[index]).includes(needle)) return index;
  }
  return null;
}

export function buildKeywords(answer: string, keywords: readonly string[]): PackKeyword[] {
  return keywords.map((text) => ({ text, sentenceIndex: findKeywordSentence(answer, text) }));
}

/** "말하는 순서"의 문장이 답변에 실제로 있는 문장인지(공백 차이는 무시). */
export function sentenceExistsInAnswer(answer: string, sentence: string): boolean {
  const needle = normalizeForMatch(sentence);
  if (!needle) return false;
  return splitSentences(answer).some((candidate) => normalizeForMatch(candidate) === needle)
    || normalizeForMatch(answer).includes(needle);
}

// ───────────────────────────── 길이·연습 시간 ─────────────────────────────

/** 공백을 뺀 글자 수. 우리 서비스의 글자 수 표기와 같은 기준이다. */
export function compactLength(text: string): number {
  return [...text.replace(/\s+/g, "")].length;
}

/**
 * 한국어를 또박또박 읽을 때의 대략적인 초당 글자 수(공백 제외).
 * 사람마다 다르므로 "정확한 시간"이 아니라 길이를 가늠하는 어림 기준으로만 쓴다.
 */
export const REFERENCE_CHARS_PER_SECOND = 5;

export type LengthGuide = { state: "short" | "fit" | "long"; minChars: number; maxChars: number; chars: number };

/** 목표 시간에 비해 답변이 짧은지·긴지 대략 알려 준다. 시간을 단정하지 않는다. */
export function lengthGuide(slot: PackSlotId, text: string): LengthGuide {
  const target = PACK_SLOTS.find((entry) => entry.id === slot)?.targetSeconds ?? 60;
  const center = target * REFERENCE_CHARS_PER_SECOND;
  const minChars = Math.round(center * 0.7);
  const maxChars = Math.round(center * 1.2);
  const chars = compactLength(text);
  return { state: chars < minChars ? "short" : chars > maxChars ? "long" : "fit", minChars, maxChars, chars };
}

export type PracticeMeasurement = { chars: number; seconds: number };

/**
 * 사용자가 직접 잰 연습 기록으로 만든 "내 속도"(글자당 초). 기록이 없거나 너무 짧으면 null.
 * 여러 번 쟀다면 중앙값을 쓴다 — 한 번 더듬은 기록 하나에 끌려가지 않도록.
 */
export function personalSecondsPerChar(measurements: readonly PracticeMeasurement[]): number | null {
  const usable = measurements
    .filter((entry) => entry.chars >= 30 && entry.seconds >= 5 && Number.isFinite(entry.seconds))
    .map((entry) => entry.seconds / entry.chars)
    .sort((a, b) => a - b);
  if (usable.length === 0) return null;
  const middle = Math.floor(usable.length / 2);
  return usable.length % 2 === 1 ? usable[middle] : (usable[middle - 1] + usable[middle]) / 2;
}

/** 내 속도로 이 답변을 읽으면 대략 몇 초인지. 어디까지나 참고용 어림이다. */
export function estimateSeconds(chars: number, secondsPerChar: number | null): number {
  return Math.round(chars * (secondsPerChar ?? 1 / REFERENCE_CHARS_PER_SECOND));
}

export function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${String(rest).padStart(2, "0")}초` : `${rest}초`;
}

// ───────────────────────────── 자료 버전 합치기 ─────────────────────────────

const DOC_KIND_BY_DB: Record<string, PackDocKind> = {
  RESUME: "resume",
  COVER_LETTER: "cover_letter",
  JOB_POSTING: "job_posting",
  CAREER_DOCUMENT: "experience",
  PORTFOLIO: "experience",
  CERTIFICATE: "certificate",
  APPLICANT_NOTE: "note",
  OTHER: "other",
};

/** DB의 문서 종류를 팩 자료 종류로 바꾼다. 알 수 없는 종류·수정 요청 메모는 null(자료로 쓰지 않는다). */
export function mapDocumentKind(dbKind: string): PackDocKind | null {
  return DOC_KIND_BY_DB[dbKind] ?? null;
}

const CONFLICT_TOPIC_KO: Record<string, string> = { period: "재직·활동 기간", role: "직책·역할", metric: "성과 수치", other: "기타 내용" };

/** 사용자가 이 팩을 위해 직접 적은 내용을 하나의 "자료"로 만든다. 근거는 여기서도 찾을 수 있다. */
export function buildUserSupplementDoc(input: {
  supplements: PackSupplements;
  slotAnswers: readonly PackSlotAnswer[];
  confirmations: readonly ConflictConfirmation[];
}): MaterialDoc | null {
  const lines: string[] = [];
  const { supplements } = input;
  if (supplements.company) lines.push(`[지원회사] ${supplements.company}`);
  if (supplements.role) lines.push(`[지원직무] ${supplements.role}`);
  if (supplements.emphasis) lines.push(`[강조하고 싶은 경험] ${collapse(supplements.emphasis)}`);
  if (supplements.applyReason) lines.push(`[실제 지원 이유] ${collapse(supplements.applyReason)}`);
  if (supplements.contribution) lines.push(`[희망하는 기여 방향] ${collapse(supplements.contribution)}`);
  for (const answer of input.slotAnswers) {
    const label = PACK_SLOTS.find((slot) => slot.id === answer.slot)?.label ?? answer.slot;
    lines.push(`[문항 보완 · ${label}] 질문: ${collapse(answer.question)} / 답: ${collapse(answer.answer)}`);
  }
  for (const confirmation of input.confirmations) {
    if (!confirmation.chosenText) continue;
    const topic = CONFLICT_TOPIC_KO[confirmation.topic ?? "other"] ?? "확인";
    lines.push(`[지원자가 확인한 내용 · ${topic}] ${collapse(confirmation.chosenText)}`);
  }
  if (lines.length === 0) return null;
  return {
    id: "U",
    kind: "supplement",
    title: PACK_DOC_KIND_LABEL.supplement,
    text: lines.join("\n"),
    documentId: null,
    documentVersionId: null,
    filename: null,
  };
}

function collapse(value: string): string {
  return value.replace(/\s*\n+\s*/g, " ").trim();
}

export type EffectiveMaterials = {
  version: number;
  company: string;
  role: string;
  docs: MaterialDoc[];
  hints: FinalHints;
  supplements: PackSupplements;
  slotAnswers: PackSlotAnswer[];
  confirmations: ConflictConfirmation[];
  /** 사용자가 "제외해 달라"고 적은 내용. 모델에게 지시로 전하고, 자료로는 취급하지 않는다. */
  exclude: string;
  hasJobPosting: boolean;
};

const EMPTY_HINTS: FinalHints = { careerTimeline: [], documentConflicts: [] };

/**
 * 1번(원본 스냅샷)과 선택한 버전을 합쳐, 모델과 화면이 실제로 쓰는 자료를 만든다.
 * 원본 문서는 절대 바뀌지 않고, 사용자가 보완한 내용만 별도 문서(U, J)로 얹힌다.
 */
export function resolveEffectiveMaterials(base: { version: number; payload: MaterialsPayload }, selected: { version: number; payload: MaterialsPayload }): EffectiveMaterials {
  const baseDocs = base.payload.documents ?? [];
  const supplements = selected.payload.supplements ?? {};
  const docs: MaterialDoc[] = baseDocs.map((doc) => ({ ...doc }));

  if (supplements.jobPostingText && supplements.jobPostingText.trim().length > 0) {
    docs.push({
      id: "J",
      kind: "job_posting",
      title: "지원자가 붙여 넣은 채용공고 본문",
      text: supplements.jobPostingText,
      documentId: null,
      documentVersionId: null,
      filename: null,
    });
  }
  const userDoc = buildUserSupplementDoc({
    supplements,
    slotAnswers: selected.payload.slotAnswers ?? [],
    confirmations: selected.payload.confirmations ?? [],
  });
  if (userDoc) docs.push(userDoc);

  const company = (supplements.company ?? "").trim() || (base.payload.base?.company ?? "").trim();
  const role = (supplements.role ?? "").trim() || (base.payload.base?.role ?? "").trim();
  return {
    version: selected.version,
    company,
    role,
    docs,
    hints: base.payload.hints ?? EMPTY_HINTS,
    supplements,
    slotAnswers: selected.payload.slotAnswers ?? [],
    confirmations: selected.payload.confirmations ?? [],
    exclude: (supplements.exclude ?? "").trim(),
    hasJobPosting: docs.some((doc) => doc.kind === "job_posting" && doc.text.trim().length >= 30),
  };
}

/** 자료 원문이 한 줄도 없으면 점검할 수 없다. */
export function hasAnyMaterialText(materials: Pick<EffectiveMaterials, "docs">): boolean {
  return materials.docs.some((doc) => doc.kind !== "supplement" && doc.text.trim().length >= 20);
}

/** 제어 문자를 지우고 길이를 자른다. 모델에게 보내기 전·저장 전 공통 정리. */
export function sanitizeUserText(value: string, max: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

import type { ResultDocument } from "./result-document";

/**
 * 답변 맨 앞에 붙은 "질문: …" 한 줄.
 *
 * 입력 칸은 문항을 서버로 보낼 때 질문을 답변 앞에 이 한 줄로 붙입니다
 * (serializeQuestionAnswers). 서버는 이 줄을 질문 칸으로 되돌리지 않아서 결과의
 * 원문(originalAnswer)에 그대로 남습니다. 작성 AI는 이 줄을 지원자의 글이 아닌
 * 형식 표시로 보고 수정본에서 빼는데, 원문을 그대로 두기로 한 문항은 원문이 통째로
 * 나가서 한 화면에 질문 줄이 있는 문항과 없는 문항이 섞이고, 글자 수에도 질문이
 * 들어가며, "이 문항 복사"에 질문까지 딸려 갔습니다.
 *
 * 저장된 실제 질문과 일치하면 여러 줄도 함께 옮깁니다. 질문 칸이 없는 과거 결과는
 * 명백한 작성 지시로 이어지는 줄만 합치며, 경계가 애매하면 원문을 보존합니다.
 */
const LEADING_QUESTION_MARKER = /^\s*질문[ \t]*[:：][ \t]*(\S[^\r\n]*?)[ \t]*(?:\r?\n|$)\s*/;
const MAX_QUESTION_LENGTH = 1000;

export type SplitQuestionMarker = {
  /** "질문:" 뒤의 문장. */
  question: string;
  /** 질문 줄을 뗀 나머지. 비어 있지 않습니다. */
  body: string;
  /** 원문 맨 앞에서 잘려 나간 글자 수. 원문 기준 위치(start/end)를 옮길 때 씁니다. */
  removed: number;
};

const normalizedQuestion = (text: string) => text.replace(/\s+/g, " ").trim();
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const instructionEnd = /(?:[?？]|(?:주세요|주십시오|하시오|하십시오|바랍니다|쓰세요|기술하세요|설명하세요|서술하세요)[.!。]?)\s*$/;

export function splitLeadingQuestionMarker(text: string, knownQuestion?: string): SplitQuestionMarker | null {
  // 질문이 별도 저장된 경우 그 전체와 일치하는 접두사만 제거한다. 본문을 추측하지 않는다.
  if (knownQuestion?.trim() && knownQuestion.length <= MAX_QUESTION_LENGTH) {
    const pattern = knownQuestion.trim().split(/\s+/).map(escapeRegex).join("\\s+");
    const known = new RegExp(`^\\s*질문[ \\t]*[:：][ \\t]*${pattern}[ \\t]*\\r?\\n\\s*`).exec(text);
    if (known && text.slice(known[0].length).trim()) {
      return { question: normalizedQuestion(knownQuestion), body: text.slice(known[0].length), removed: known[0].length };
    }
  }
  const match = LEADING_QUESTION_MARKER.exec(text);
  if (!match) return null;
  let question = normalizedQuestion(match[1]);
  let removed = match[0].length;
  let body = text.slice(removed);
  // "설명하고\n해결 과정을 기술하세요."를 첫 줄만 잘라서는 안 된다.
  if (/(?:하고|하며|으며|그리고|또는|및|대해|관해|경험을|과정을|이유를)\s*$/.test(question)) {
    const continuation = /^([^\r\n]+)(?:\r?\n)\s*/.exec(body);
    if (!continuation || !instructionEnd.test(continuation[1]) || question.length + continuation[1].length > MAX_QUESTION_LENGTH) return null;
    question = `${question} ${continuation[1].trim()}`;
    removed += continuation[0].length;
    body = text.slice(removed);
  }
  if (!question || question.length > MAX_QUESTION_LENGTH || !body.trim()) return null;
  return { question, body, removed };
}

/** 로컬 직접 수정은 그대로 보존하고, 원문과 동일한 질문 접두사만 제거한다. */
export function normalizeSavedQuestionAnswer(answer: string, originalAnswer: string, prompt: string): string {
  const original = splitLeadingQuestionMarker(originalAnswer, prompt);
  if (!original) return answer;
  const saved = splitLeadingQuestionMarker(answer, original.question);
  return saved && normalizedQuestion(saved.question) === normalizedQuestion(original.question) ? saved.body : answer;
}

/**
 * 결과 화면용 사본. 저장된 분석 결과는 건드리지 않고 화면·복사·내보내기가 읽는
 * 문서에서만 질문 줄을 질문 칸으로 옮깁니다(wrapped-question-boundary와 같은 방식).
 *
 * 원문에 질문 줄이 있을 때만 움직입니다. 원문과 수정본에서 같이 떼기 때문에
 * "원문 그대로 유지"한 문항은 떼고 나서도 여전히 원문과 같고, 수정한 문항은
 * 질문 줄 하나가 지워진 것으로 보이지 않고 본문끼리 비교됩니다.
 * 바뀐 것이 없으면 받은 문서를 그대로 돌려줍니다.
 */
export function normalizeQuestionMarkers(result: ResultDocument): ResultDocument {
  let changed = false;
  const questions = result.questions.map((question) => {
    const original = splitLeadingQuestionMarker(question.originalAnswer, question.prompt !== question.title ? question.prompt : undefined);
    if (!original) return question;
    changed = true;

    const revised = splitLeadingQuestionMarker(question.revisedAnswer, original.question);
    // 질문 칸이 제목과 같은 한 줄(또는 비어 있음)이면 실제 질문으로 채웁니다.
    // 이미 따로 저장된 질문이 있으면 그것을 존중합니다.
    const prompt = !question.prompt.trim() || question.prompt.trim() === question.title.trim() ? original.question : question.prompt;
    // 질문 줄에 걸쳐 있던 주석은 지원자의 글이 아니라 버립니다. 나머지는 위치만 옮깁니다.
    const originalAnnotations = question.originalAnnotations?.flatMap((annotation) => {
      if (annotation.start < original.removed) return [];
      const start = annotation.start - original.removed;
      const end = annotation.end - original.removed;
      return original.body.slice(start, end) === annotation.phrase ? [{ ...annotation, start, end }] : [];
    });

    return {
      ...question,
      prompt,
      originalAnswer: original.body,
      revisedAnswer: revised && normalizedQuestion(revised.question) === normalizedQuestion(original.question) ? revised.body : question.revisedAnswer,
      ...(originalAnnotations ? { originalAnnotations } : {}),
    };
  });
  return changed ? { ...result, questions } : result;
}

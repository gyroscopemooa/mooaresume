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
 * 줄이 하나이고 그 뒤에 본문이 남을 때만 질문으로 읽습니다. 그렇지 않은 모양은
 * 건드리지 않습니다(두 줄에 걸친 질문은 첫 줄만 떼면 조각이 남아 더 어색합니다).
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

export function splitLeadingQuestionMarker(text: string): SplitQuestionMarker | null {
  const match = LEADING_QUESTION_MARKER.exec(text);
  if (!match) return null;
  const question = match[1].replace(/\s+/g, " ").trim();
  const body = text.slice(match[0].length);
  if (!question || question.length > MAX_QUESTION_LENGTH || !body.trim()) return null;
  return { question, body, removed: match[0].length };
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
    const original = splitLeadingQuestionMarker(question.originalAnswer);
    if (!original) return question;
    changed = true;

    const revised = splitLeadingQuestionMarker(question.revisedAnswer);
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
      revisedAnswer: revised ? revised.body : question.revisedAnswer,
      ...(originalAnnotations ? { originalAnnotations } : {}),
    };
  });
  return changed ? { ...result, questions } : result;
}

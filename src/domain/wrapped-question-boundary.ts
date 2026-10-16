import type { ResultDocument } from "./result-document";

/** Fail closed: only repair an unclosed question bracket followed by a complete
 * question instruction AND its min/max character-limit footer. */
export function restoreWrappedQuestion(heading: string, answer: string) {
  const unchanged = { heading, answer, prefix: "" };
  const opening = (heading.match(/\(/g) ?? []).length - (heading.match(/\)/g) ?? []).length;
  if (opening < 1 || heading.length > 1000) return unchanged;
  const match = answer.match(/^\s*([^\[\]]{1,800}?\(\s*최소\s*\d+\s*자\s*[,，]\s*최대\s*\d+\s*자\s*입력\s*가능\s*\))/);
  if (!match || !/(?:작성|서술|기술|설명)[\s\S]*(?:바랍니다|주십시오|주세요|하시오)/.test(match[1])) return unchanged;
  const tail = match[1].replace(/\s+/g, " ").trim();
  const combined = heading + tail;
  if ((combined.match(/\(/g) ?? []).length !== (combined.match(/\)/g) ?? []).length) return unchanged;
  // "업무분담문\n제," is a split word, not a space between words.
  const separator = /[가-힣]$/.test(heading) && /^[가-힣][,，)]/.test(tail) ? "" : " ";
  return { heading: `${heading.trimEnd()}${separator}${tail}`, answer: answer.slice(match[0].length).trimStart(), prefix: match[0] };
}

/** Read-only view model; never persists repairs back to an analysis snapshot. */
export function restoreLocalResultQuestionBoundaries(result: ResultDocument): ResultDocument {
  let changed = false;
  const questions = result.questions.map((question) => {
    const heading = question.title && !/^Question \d+$/.test(question.title) ? question.title : question.prompt;
    const original = restoreWrappedQuestion(heading, question.originalAnswer);
    const revised = restoreWrappedQuestion(heading, question.revisedAnswer);
    // Both versions must corroborate the same misplaced question text.
    if (!original.prefix || !revised.prefix || original.heading !== revised.heading) return question;
    changed = true;
    return { ...question, title: original.heading, prompt: original.heading, originalAnswer: original.answer, revisedAnswer: revised.answer };
  });
  return changed ? { ...result, questions } : result;
}

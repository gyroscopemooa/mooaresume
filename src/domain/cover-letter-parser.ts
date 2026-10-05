import { createCoverLetterQuestion, readTargetLengthMarker, type CoverLetterQuestion } from "@/domain/cover-letter-question";
import { restoreWrappedQuestion } from "./wrapped-question-boundary";

const QUESTION_LINE = /^\s*(?:\*\s*)?(?:\[\s*문항\s*|문항\s*)?(\d{1,2})(?:\s*[.)\]:：-]\s*|\s*번(?:\s*[:.)\]-]\s*|\s+))(.+?)\s*$/;
const SECTION_TITLE = /^(?:이력서|경력기술서|직무기술서)$/;

function compactHeading(line: string) {
  return line.replace(/\s/g, "");
}

function isQuestionLine(line: string) {
  const match = line.match(QUESTION_LINE);
  return Boolean(match && /[가-힣A-Za-z]{2}/.test(match[2]));
}

function questionNumber(line: string): number | null {
  const match = line.match(QUESTION_LINE);
  if (!match || !/[가-힣A-Za-z]{2}/.test(match[2])) return null;
  return Number(match[1]);
}

/**
 * 자기소개서가 끝나는 줄.
 *
 * `이력서`·`경력기술서`·`직무기술서`라고만 적힌 줄에서 자릅니다. 한 파일에
 * 자소서와 이력서를 이어 붙여 낸 사람의 이력서 부분까지 문항으로 읽지 않기
 * 위해서입니다.
 *
 * 그런데 그 말들은 자기소개서 **안쪽 소제목**으로도 쓰입니다. 그때는 자르는
 * 순간 뒤쪽 문항이 통째로 사라지는데, 화면은 남은 문항만 보여 주므로 손님은
 * 자기가 올린 문항이 없어진 줄도 모릅니다.
 *
 * 그래서 자르기 전에 번호가 이어지는지 봅니다. 뒤에 나오는 첫 문항이 앞의
 * 마지막 번호 **바로 다음 번호**라면 그 줄은 소제목이지 경계가 아닙니다.
 * 이력서 항목은 대개 1부터 다시 세므로 이 조건에 걸리지 않습니다.
 */
function findLetterEnd(allLines: readonly string[], sectionStart: number): number {
  const relative = allLines.slice(sectionStart).findIndex((line) => SECTION_TITLE.test(compactHeading(line)));
  if (relative < 0) return allLines.length;
  const cut = sectionStart + relative;

  const before = allLines.slice(sectionStart, cut).map(questionNumber).filter((value): value is number => value !== null);
  if (before.length === 0) return cut;
  const lastBefore = before[before.length - 1];

  const firstAfter = allLines.slice(cut + 1).map(questionNumber).find((value): value is number => value !== null);
  return firstAfter === lastBefore + 1 ? allLines.length : cut;
}

/**
 * 자기소개서 본문이 시작하는 줄과 문항 제목 줄들의 **본문 안 위치**.
 *
 * 나누는 규칙을 두 군데 두면 화면이 센 문항과 분석이 센 문항이 어긋납니다.
 * 그래서 자르는 자리를 한 함수에서만 정하고, 아래 두 곳이 같이 씁니다.
 */
function readQuestionStarts(text: string): { lines: string[]; offset: number; starts: number[] } | null {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return null;

  const allLines = normalized.split("\n");
  const coverLetterHeading = allLines.findIndex((line) => compactHeading(line) === "자기소개서");
  const offset = coverLetterHeading >= 0 ? coverLetterHeading + 1 : 0;
  const lines = allLines.slice(offset, findLetterEnd(allLines, offset));
  return { lines, offset, starts: lines.flatMap((line, index) => isQuestionLine(line) ? [index] : []) };
}

export function splitCoverLetterDraft(text: string): CoverLetterQuestion[] {
  const parsed = readQuestionStarts(text);
  if (!parsed) return [createCoverLetterQuestion()];

  const { lines, starts } = parsed;
  if (starts.length === 0) return [{ ...createCoverLetterQuestion(), answer: lines.join("\n").trim() }];

  return starts.map((start, index) => {
    const match = lines[start].match(QUESTION_LINE);
    const end = starts[index + 1] ?? lines.length;
    // The plan writes each question's own limit into its heading, because the
    // analysis request carries one number for the whole draft and there is
    // nowhere else for a per-question limit to survive the round trip.
    const restored = restoreWrappedQuestion(match?.[2]?.trim() ?? "", lines.slice(start + 1, end).join("\n"), true);
    const { heading, targetLength } = readTargetLengthMarker(restored.heading);
    const bodyLines = restored.answer.split("\n");
    const counter = bodyLines.find((line) => /^\s*현재\s*\d+\s*자\s*\/\s*\d+\s*[~～-]\s*\d+\s*자\s*이내\s*$/.test(line));
    const counterLimit = counter?.match(/[~～-]\s*(\d+)\s*자/);
    const extractedBody = bodyLines.filter((line) => line !== counter).join("\n").trim();
    const body = /^(?:주특기\s*)?업무\s*작성$/i.test(extractedBody.replace(/\s+/g, " ")) ? "" : extractedBody;
    // 질문으로 읽히는 줄은 제목이 아니라 질문 칸에 넣습니다. 낱말 목록에
    // "말씀"과 "바랍니다"가 빠져 있어, "본인 성격의 장단점을 **말씀해**
    // 주십시오"가 소제목으로 분류돼 모델에게 그렇게 전달됐습니다.
    const looksLikePrompt = /(?:작성|기술|서술|설명|대해|주세요|하시오|말씀|바랍)/.test(heading);
    return {
      ...createCoverLetterQuestion(body, index),
      title: looksLikePrompt ? "" : heading.slice(0, 120),
      prompt: looksLikePrompt ? heading.slice(0, 1000) : "",
      targetLength: targetLength ?? (counterLimit && Number(counterLimit[1]) >= 100 && Number(counterLimit[1]) <= 3000 ? Number(counterLimit[1]) : null),
    };
  });
}

export type QuestionBoundaryReview = { index: number; number: string; question: string; answer: string; start: number; end: number };

/** Advisory only. Never move ambiguous answer text just because a bracket is open. */
export function inspectQuestionBoundaries(text: string): QuestionBoundaryReview[] {
  const parsed = readQuestionStarts(text);
  if (!parsed) return [];
  return parsed.starts.flatMap((start, index) => {
    const end = parsed.starts[index + 1] ?? parsed.lines.length;
    const match = parsed.lines[start].match(QUESTION_LINE);
    const restored = restoreWrappedQuestion(match?.[2]?.trim() ?? "", parsed.lines.slice(start + 1, end).join("\n").trim(), true);
    const unbalanced = (restored.heading.match(/\(/g)?.length ?? 0) !== (restored.heading.match(/\)/g)?.length ?? 0);
    if (!unbalanced || restored.prefix) return [];
    return [{ index, number: match?.[1] ?? String(index + 1), question: restored.heading, answer: restored.answer, start: parsed.offset + start, end: parsed.offset + end }];
  });
}

/** Replace only this letter section; keep neighbouring questions and other materials. */
export function applyQuestionBoundaryReview(text: string, issue: QuestionBoundaryReview, question: string, answer: string): string {
  if (!question.trim() || !answer.trim() || question.length > 1000 || answer.length > 30_000) throw new Error("BOUNDARY_FIELDS_INVALID");
  const current = inspectQuestionBoundaries(text).find(item => item.start === issue.start && item.end === issue.end && item.question === issue.question && item.answer === issue.answer);
  if (!current) throw new Error("BOUNDARY_INPUT_CHANGED");
  const lines = text.replace(/\r\n?/g, "\n").trim().split("\n");
  return [...lines.slice(0, issue.start), `${issue.number}. ${question.trim().replace(/\s*\n\s*/g, " ")}`, answer.trim(), "", ...lines.slice(issue.end)].join("\n");
}

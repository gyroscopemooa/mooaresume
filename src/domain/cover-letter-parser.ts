import { createCoverLetterQuestion, readTargetLengthMarker, type CoverLetterQuestion } from "@/domain/cover-letter-question";

const QUESTION_LINE = /^\s*(?:문항\s*)?(\d{1,2})(?:\s*[.)\]:：-]\s*|\s*번(?:\s*[:.)\]-]\s*|\s+))(.+?)\s*$/;
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

export function splitCoverLetterDraft(text: string): CoverLetterQuestion[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [createCoverLetterQuestion()];

  const allLines = normalized.split("\n");
  const coverLetterHeading = allLines.findIndex((line) => compactHeading(line) === "자기소개서");
  const sectionStart = coverLetterHeading >= 0 ? coverLetterHeading + 1 : 0;
  const lines = allLines.slice(sectionStart, findLetterEnd(allLines, sectionStart));
  const starts = lines.flatMap((line, index) => isQuestionLine(line) ? [index] : []);
  if (starts.length === 0) return [{ ...createCoverLetterQuestion(), answer: lines.join("\n").trim() }];

  return starts.map((start, index) => {
    const match = lines[start].match(QUESTION_LINE);
    const end = starts[index + 1] ?? lines.length;
    // The plan writes each question's own limit into its heading, because the
    // analysis request carries one number for the whole draft and there is
    // nowhere else for a per-question limit to survive the round trip.
    const { heading, targetLength } = readTargetLengthMarker(match?.[2]?.trim() ?? "");
    const extractedBody = lines.slice(start + 1, end).join("\n").trim();
    const body = /^(?:주특기\s*)?업무\s*작성$/i.test(extractedBody.replace(/\s+/g, " ")) ? "" : extractedBody;
    const looksLikePrompt = /(?:작성|기술|서술|설명|대해|주세요|하시오)/.test(heading);
    return {
      ...createCoverLetterQuestion(body, index),
      title: looksLikePrompt ? "" : heading.slice(0, 120),
      prompt: looksLikePrompt ? heading.slice(0, 1000) : "",
      targetLength,
    };
  });
}

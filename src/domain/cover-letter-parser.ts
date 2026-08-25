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

export function splitCoverLetterDraft(text: string): CoverLetterQuestion[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [createCoverLetterQuestion()];

  const allLines = normalized.split("\n");
  const coverLetterHeading = allLines.findIndex((line) => compactHeading(line) === "자기소개서");
  const sectionStart = coverLetterHeading >= 0 ? coverLetterHeading + 1 : 0;
  const relativeEnd = allLines.slice(sectionStart).findIndex((line) => SECTION_TITLE.test(compactHeading(line)));
  const sectionEnd = relativeEnd >= 0 ? sectionStart + relativeEnd : allLines.length;
  const lines = allLines.slice(sectionStart, sectionEnd);
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

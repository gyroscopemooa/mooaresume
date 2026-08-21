import type { ResultDocument, ResultQuestion } from "@/domain/result-document";

/**
 * QUICK never asks for a company or a role — the analysis request has no field
 * for either — so the assembler filled those required columns with English
 * placeholders ("Applicant company", "Question 1") that then rendered as the
 * applicant's own headings on a paid result screen.
 *
 * The assembler now stores Korean, truthful values, but results saved before
 * that cannot be rewritten. So the placeholders are also recognised and
 * replaced here, at display time, for every result already in the database.
 */
const PLACEHOLDER_NAMES = new Set(["Applicant company", "Applicant role", "Cover-letter question"]);
const PLACEHOLDER_QUESTION_TITLE = /^Question \d+$/;
const PLACEHOLDER_APPLICATION_LABEL = /^(QUICK|PRO) cover-letter revision$/;

/** Generic descriptions that are true but add nothing beside the subject name. */
const GENERIC_ROLES = new Set(["Applicant role", "자기소개서 첨삭"]);

function meaningful(value: string) {
  const trimmed = value.trim();
  return trimmed && !PLACEHOLDER_NAMES.has(trimmed) ? trimmed : "";
}

/**
 * The heading a question should carry. Falls back to the question prompt —
 * which the parser fills whenever the heading read as a sentence rather than a
 * topic — and only then to a plain Korean number.
 */
export function resolveQuestionTitle(question: Pick<ResultQuestion, "title" | "prompt" | "order">): string {
  const title = meaningful(question.title);
  if (title && !PLACEHOLDER_QUESTION_TITLE.test(title)) return title;

  const prompt = meaningful(question.prompt);
  if (prompt) return prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt;

  return `문항 ${question.order}`;
}

export type ResultSubject = { name: string; qualifier: string | null };

/**
 * What the result is *about*. With no company or role collected, the honest
 * subject is the document that was analysed, named by its own filename.
 */
export function resolveResultSubject(
  result: Pick<ResultDocument, "company" | "role" | "attachments">,
): ResultSubject {
  const company = meaningful(result.company);
  const role = meaningful(result.role);
  if (company) return { name: company, qualifier: role && !GENERIC_ROLES.has(role) ? role : null };

  const filename = result.attachments[0]?.filename?.trim();
  return { name: filename ? filename.replace(/\.[^.]+$/, "") : "내 자기소개서", qualifier: null };
}

export function resolveApplicationLabel(result: Pick<ResultDocument, "applicationLabel">): string {
  const label = result.applicationLabel.trim();
  return !label || PLACEHOLDER_APPLICATION_LABEL.test(label) ? "자기소개서 첨삭" : label;
}

/** Safe for a filename on every platform. */
export function toFilenameToken(value: string) {
  return value.replace(/[\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || "자기소개서";
}

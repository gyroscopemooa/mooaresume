/**
 * A URL cannot contain Hangul — a real one percent-encodes it. Matching
 * `[^\s]+` after `https://` therefore swallowed anything typed straight after
 * a pasted link, so "…&t_ref=search안전관리자" was read as one giant URL and
 * the typed words were thrown away. Restricting the match to URL-legal
 * characters makes the link end where the link ends.
 */
const URL_PATTERN = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/i;

export type JobPostingSource = { url: string; text: string };

export function findJobPostingUrl(value: string): string {
  return value.match(URL_PATTERN)?.[0] ?? "";
}

/**
 * Splits what the applicant typed into the link we recognised and the text we
 * will actually send for analysis. Text is only dropped when the whole entry
 * is nothing but the link.
 */
export function parseJobPostingInput(value: string): JobPostingSource {
  const url = findJobPostingUrl(value);
  const isUrlOnly = Boolean(url) && value.trim() === url;
  return { url, text: isUrlOnly ? "" : value };
}

/**
 * A supplied URL is not evidence until automatic reading or manual entry
 * supplies the actual body. Filenames alone are not extracted text.
 */
export function isLinkOnlyPosting(source: { url: string; text: string; filenames?: readonly string[] }) {
  return Boolean(source.url.trim() || findJobPostingUrl(source.text)) && !hasJobPostingText(source.text);
}

/** A filename or a URL is not extracted content. Never count either as ready. */
export function hasJobPostingText(text: string) {
  return text.replace(new RegExp(URL_PATTERN.source, "gi"), "").trim().length > 0;
}

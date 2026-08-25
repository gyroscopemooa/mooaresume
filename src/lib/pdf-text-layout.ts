/**
 * Turning pdf.js text items back into lines.
 *
 * pdf.js hands back positioned glyph runs, not text. The extractor used to do
 * `items.map((item) => item.str).join(" ")`, which is wrong in both directions
 * at once:
 *
 * - It puts a space between every run, so a word split across two runs comes
 *   back cut in half ("지원동기 AI 와 창업 경험 ,") — punctuation included.
 * - It never emits a newline, so a whole page arrives as one line.
 *
 * The second one is the expensive half. `splitCoverLetterDraft` finds questions
 * by scanning lines for "1.", "2.", "3." at the start of a line. With the page
 * on a single line it finds none, so a three-question 자기소개서 is analyzed as
 * one 8,000-character question against a 700-character target — and the paid
 * result comes back as a summary with most of the applicant's writing gone.
 *
 * Kept apart from local-document.ts, which can only run in a browser, so the
 * joining rules can be tested directly.
 */

/** The fields this needs from a pdf.js `TextItem`; the real type carries more. */
export type PdfTextItem = {
  str: string;
  /** [scaleX, skewX, skewY, scaleY, x, y] — 4 and 5 are the run's origin. */
  transform?: number[];
  width?: number;
  height?: number;
  /** pdf.js sets this on the last run of a line. */
  hasEOL?: boolean;
};

/**
 * How wide a gap has to be, relative to the glyph height, before it counts as
 * a space rather than ordinary letter spacing.
 *
 * Korean text is set in full-width glyphs with tight tracking, so the gap
 * between two runs of one word is a small fraction of the height while a real
 * space is roughly a quarter of it or more.
 */
const SPACE_GAP_RATIO = 0.22;

/**
 * A drop this large means a new line even when `hasEOL` is missing, which some
 * generators never set. Relative to the glyph height so it survives any font
 * size.
 */
const LINE_BREAK_RATIO = 0.55;

function glyphHeight(item: PdfTextItem): number {
  const fromTransform = item.transform ? Math.abs(item.transform[3]) : 0;
  return fromTransform || item.height || 10;
}

export function joinPdfTextItems(items: PdfTextItem[]): string {
  const lines: string[] = [];
  let line = "";
  let previousEndX: number | null = null;
  let previousY: number | null = null;

  const pushLine = () => {
    lines.push(line.trimEnd());
    line = "";
    previousEndX = null;
    previousY = null;
  };

  for (const item of items) {
    if (typeof item?.str !== "string") continue;
    // Runs with no glyphs carry only their EOL flag; dropping them silently
    // would join two lines together. An empty run arriving when nothing is
    // buffered is a blank line in the PDF, which is where a paragraph break
    // lives — worth keeping, and collapsed to one at the end.
    if (item.str === "") {
      if (item.hasEOL) {
        if (line) pushLine();
        else lines.push("");
      }
      continue;
    }

    const height = glyphHeight(item);
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;

    if (line) {
      const movedToNewLine = previousY !== null && Math.abs(y - previousY) > height * LINE_BREAK_RATIO;
      if (movedToNewLine) {
        pushLine();
      } else if (previousEndX !== null) {
        const gap = x - previousEndX;
        // Never doubled: a run that already ends or begins with whitespace has
        // the space the PDF itself encoded.
        const alreadySpaced = /\s$/.test(line) || /^\s/.test(item.str);
        if (gap > height * SPACE_GAP_RATIO && !alreadySpaced) line += " ";
      }
    }

    line += item.str;
    previousEndX = x + (item.width ?? 0);
    previousY = y;

    if (item.hasEOL) pushLine();
  }

  if (line.trim()) lines.push(line.trimEnd());

  // Blank lines from empty runs are dropped, but a run of them meant a real
  // paragraph break, so one is kept.
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

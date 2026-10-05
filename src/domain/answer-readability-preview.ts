/** Local readability variant; the result formatter enables it in development only. */
export type ReadableAnswerPreview = {
  heading: string | null;
  paragraphs: string[];
  text: string;
  suggestedBreaks: boolean;
};

const TOPIC_START = /^(?:입사 후|앞으로|이 경험을 통해|이를 바탕으로|이러한 경험을|반면|첫째|둘째)/;

export function buildReadableAnswerPreview(answer: string): ReadableAnswerPreview {
  const source = answer.replace(/\r\n?/g, "\n").trim();
  // Only a complete, short opening bracket is a heading. Never repair a missing
  // bracket by guessing where the customer's title ends.
  const match = source.match(/^\[([^\[\]\n]{2,60})\][ \t]*(?:\n\s*)?/);
  const heading = match ? `[${match[1]}]` : null;
  const body = match ? source.slice(match[0].length).trim() : source;
  const explicitParagraphs = body.split(/\n[ \t]*\n+/).filter(Boolean);
  let paragraphs = explicitParagraphs;
  let suggestedBreaks = false;

  // Explicit author breaks take priority. A display fallback cannot infer the
  // author's intended argument; do not silently reframe or reorder sentences.
  if (body.length >= 320 && !body.includes("\n")) {
    const sentences = body.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((s) => s.trim()) ?? [];
    // Decimal points, initials and nonstandard punctuation must not disappear.
    const preserved = sentences.join("").replace(/\s/g, "") === body.replace(/\s/g, "");
    if (preserved && sentences.length >= 4) {
      const groups: string[] = [];
      let current = "";
      for (let index = 0; index < sentences.length; index += 1) {
        const sentence = sentences[index];
        const remaining = sentences.slice(index).join(" ").length;
        const topicBoundary = current.length >= 100 && TOPIC_START.test(sentence);
        const longGroup = current.length >= 150 && current.length + sentence.length > 280;
        if (current && remaining >= 60 && (topicBoundary || longGroup)) {
          groups.push(current);
          current = sentence;
        } else {
          current = current ? `${current} ${sentence}` : sentence;
        }
      }
      if (current) groups.push(current);
      paragraphs = groups;
      suggestedBreaks = groups.length > 1;
    }
  }
  return {
    heading,
    paragraphs,
    text: [...(heading ? [heading] : []), ...paragraphs].join("\n\n"),
    suggestedBreaks,
  };
}

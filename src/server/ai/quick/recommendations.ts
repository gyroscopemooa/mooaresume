import type { ResultRecommendation } from "@/domain/result-document";
import type { QuickAnalysisOutput } from "./schema";
import { normalizeRevisionText, quoteAppearsIn } from "./revision-quality";

type DraftRecommendation = NonNullable<NonNullable<QuickAnalysisOutput["revisions"]>[number]["recommendations"]>[number];

// Numbers and Latin-script terms are the applicant's facts or posting keywords
// ("1.5배", "Concept", "R&D"); a suggestion that loses one is weaker, not an alternative.
const KEY_TERM = /[A-Za-z][A-Za-z0-9&+#-]*|\d+(?:[.,/]\d+)*(?:\s*[~-]\s*\d+(?:[.,]\d+)*)?(?:\s*(?:%|배|점|개|명|년|개월|주|일|시간|분|회|위|등|만|천|억|원))?/g;
const compact = (text: string) => text.normalize("NFC").replace(/\s+/g, "");
const keyTerms = (text: string) => [...new Set((text.normalize("NFC").match(KEY_TERM) ?? []).map(compact))];
const CONFIRM_MARK = /\[확인 필요[^\]]*\]/g;

/**
 * Code-side floor under the reviewer: what a reviewer could miss but a string
 * check cannot. Kept recommendations are the ones that point at a real
 * sentence, change something, keep the anchor's numbers and terms, and mark
 * any new number or term as needing confirmation.
 */
export function selectRecommendations(answer: string, drafts: DraftRecommendation[], idPrefix: string): ResultRecommendation[] {
  const original = compact(answer);
  const seen = new Set<string>();
  const kept: ResultRecommendation[] = [];
  for (const draft of drafts) {
    const sentence = draft.sentence.trim();
    const key = normalizeRevisionText(sentence);
    if (!quoteAppearsIn(answer, draft.anchorQuote)) continue;
    if (key === normalizeRevisionText(draft.anchorQuote) || original.includes(compact(sentence)) || seen.has(key)) continue;
    // Only a rewrite replaces its anchor; an added sentence sits beside it, so the anchor's terms stay in the answer.
    if (draft.kind === "improve" && keyTerms(draft.anchorQuote).some(term => !compact(sentence).includes(term))) continue;
    const confirmation = draft.needsConfirmation?.trim() || undefined;
    const newTerms = keyTerms(sentence.replace(CONFIRM_MARK, "")).filter(term => !original.includes(term));
    if (newTerms.length && !confirmation) continue;
    if (draft.kind === "add" && !confirmation) continue;
    seen.add(key);
    kept.push({
      id: `${idPrefix}-${kept.length + 1}`, kind: draft.kind, anchorQuote: draft.anchorQuote.trim(),
      sentence, why: draft.why.trim(), ...(confirmation ? { needsConfirmation: confirmation } : {}),
    });
    if (kept.length === 3) break;
  }
  return kept;
}

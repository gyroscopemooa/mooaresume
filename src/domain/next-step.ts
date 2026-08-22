/**
 * What to suggest after a finished analysis.
 *
 * The result screen was an endpoint: the applicant read it and left, with no
 * indication that the product had anything further to offer them. The stages
 * do have a natural order — write from nothing, fill what is thin, polish what
 * is complete — and the applicant is the only one who cannot see it.
 *
 * The framing matters more than the suggestion. Read one way, a "next step"
 * says the thing they just paid for is unfinished and needs another purchase
 * to be whole. That is both untrue and the reason cards like this get
 * resented. Every suggestion therefore carries a `reassurance` — the result in
 * hand is finished and submittable — before the `reason` describes what more
 * ambition would buy. The two fields are separate so the affirmation cannot
 * quietly get dropped while someone edits the pitch.
 *
 * It also stays silent rather than reaching: a polished PRO result has had
 * everything the product currently does.
 */

export type NextStep = {
  /** Where the suggestion sends them. */
  product: "QUICK" | "PRO";
  writingMode: "CREATE" | "BUILD" | "POLISH";
  label: string;
  /** That what they already have is complete. Always shown before the reason. */
  reassurance: string;
  /** What more ambition would add, given the draft they now have. */
  reason: string;
};

export type NextStepInput = {
  product: "QUICK" | "PRO";
  writingMode: "CREATE" | "BUILD" | "POLISH";
  /** Questions whose answer is meaningfully under the length the company asked for. */
  shortQuestionCount: number;
  /** Whether the applicant supplied a job posting for this run. */
  hasJobPosting: boolean;
};

export function recommendNextStep(input: NextStepInput): NextStep | null {
  // A draft written from notes has never been read as finished prose. Polishing
  // it is the next thing that helps, and it is the same tier they already paid
  // for rather than an upgrade.
  if (input.writingMode === "CREATE") {
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "최종 첨삭으로 더 다듬어 보기",
      reassurance: "지금 초안은 이대로 제출하셔도 됩니다.",
      reason: "더 욕심내신다면, 최종 첨삭은 같은 내용을 제출 직전 기준으로 다시 읽어 표현과 흐름을 한 번 더 조입니다.",
    };
  }

  if (input.writingMode === "BUILD") {
    // Still thin after a fill means the material ran out, not that the mode
    // failed — polishing a short answer does not make it longer.
    if (input.shortQuestionCount > 0) return null;
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "최종 첨삭으로 더 다듬어 보기",
      reassurance: "채운 결과는 이대로 제출하셔도 됩니다.",
      reason: "한 번 더 손보고 싶다면, 최종 첨삭은 문항 사이의 톤과 겹치는 이야기를 함께 봅니다.",
    };
  }

  // POLISH from here down.
  if (input.product === "QUICK") {
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "PRO로 공고와 대조해 보기",
      reassurance: "이 첨삭본은 이대로 제출하셔도 됩니다.",
      reason: input.hasJobPosting
        ? "지원할 회사가 정해져 있다면, PRO는 같은 글을 채용공고의 요구역량·이력서와 나란히 놓고 무엇이 비는지까지 봅니다."
        : "지원할 회사가 정해져 있다면, 채용공고와 이력서를 함께 넣어 이 글이 그 회사가 요구한 것에 답하는지까지 확인할 수 있습니다.",
    };
  }

  // A polished PRO result has had everything this product currently does. The
  // honest answer is to suggest nothing rather than invent a reason to sell.
  return null;
}

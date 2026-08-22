/**
 * What to suggest after a finished analysis.
 *
 * The result screen was an endpoint: the applicant read it and left, with no
 * indication that the product had anything further to offer them. The stages
 * do have a natural order — write from nothing, fill what is thin, polish what
 * is complete — and the applicant is the only one who cannot see it.
 *
 * Two rules keep this from becoming an upsell banner. It never suggests a
 * stage the applicant has effectively already had (a polished PRO result has
 * nowhere left to go inside the product), and every suggestion names what the
 * next stage would actually do with the draft they now have, rather than
 * naming a tier and a price.
 */

export type NextStep = {
  /** Where the suggestion sends them. */
  product: "QUICK" | "PRO";
  writingMode: "CREATE" | "BUILD" | "POLISH";
  label: string;
  /** Why this specific applicant would want it, given what they just got. */
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
      label: "최종 첨삭으로 다듬기",
      reason: "지금 초안은 입력한 사실을 문장으로 만든 첫 버전입니다. 최종 첨삭은 이 글을 제출 기준으로 다시 읽고 표현과 흐름을 정리합니다.",
    };
  }

  if (input.writingMode === "BUILD") {
    // Still thin after a fill means the material ran out, not that the mode
    // failed — polishing a short answer does not make it longer.
    if (input.shortQuestionCount > 0) return null;
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "최종 첨삭으로 다듬기",
      reason: "빈 곳을 채웠으니 이제 전체를 하나의 글로 읽을 차례입니다. 최종 첨삭은 문항 간 톤과 중복을 함께 봅니다.",
    };
  }

  // POLISH from here down.
  if (input.product === "QUICK") {
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "PRO로 공고와 대조하기",
      reason: input.hasJobPosting
        ? "QUICK은 글 자체만 봅니다. PRO는 같은 글을 채용공고의 요구역량, 이력서와 나란히 놓고 무엇이 비는지 짚습니다."
        : "채용공고와 이력서를 함께 넣으면, 이 글이 그 회사가 요구한 것에 답하고 있는지까지 확인할 수 있습니다.",
    };
  }

  // A polished PRO result has had everything this product currently does. The
  // honest answer is to suggest nothing rather than invent a reason to sell.
  return null;
}

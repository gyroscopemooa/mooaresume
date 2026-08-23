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
  /**
   * Where the button goes. The finished draft is carried into sessionStorage
   * either way, so nothing is retyped — but a stage needing new material (a
   * posting, a résumé) has to land on the input screen that collects it,
   * while a stage working on the same text can go straight to confirmation.
   */
  href: string;
};

export type NextStepInput = {
  product: "QUICK" | "PRO";
  writingMode: "CREATE" | "BUILD" | "POLISH";
  /** Questions whose answer is meaningfully under the length the company asked for. */
  shortQuestionCount: number;
  /**
   * The length those questions were measured against, when they all share one.
   * Null when they differ.
   *
   * Named in the suggestion rather than kept behind it, because the target
   * defaults to 700 and most applicants never change it. Someone told "3
   * questions are short" has no way to know whether that is their company's
   * requirement or our placeholder; told "short of 700 characters", they can
   * see the yardstick and disagree with it.
   */
  shortTargetLength: number | null;
};

/** The stage that fills a thin answer, offered whenever one is still thin. */
function fillSuggestion(input: NextStepInput): NextStep {
  const against = input.shortTargetLength ? `목표 ${input.shortTargetLength.toLocaleString("ko-KR")}자 기준으로 ` : "목표 분량 기준으로 ";
  return {
    product: "PRO",
    writingMode: "BUILD",
    label: "아직 분량이 모자란 문항이 있어요",
    reassurance: "현재 첨삭은 성공적으로 완료되었습니다.",
    reason: `${against}${input.shortQuestionCount}개 문항이 짧습니다. 첨삭은 쓰신 내용을 다듬는 단계라 없는 경험을 새로 만들지 않습니다. 내용 보완은 이력서·경력기술서에서 아직 쓰지 않은 경험을 찾아 그 문항을 채웁니다. 목표 분량이 실제 요구 분량과 다르면 그대로 두셔도 됩니다.`,
    // Needs the résumé the fill will draw from, so it lands on the screen that
    // collects it rather than at confirmation.
    href: "/pro/build",
  };
}

export function recommendNextStep(input: NextStepInput): NextStep | null {
  // A draft written from notes has never been read as finished prose. Polishing
  // it is the next thing that helps, and it is the same tier they already paid
  // for rather than an upgrade.
  if (input.writingMode === "CREATE") {
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "완성본 이후의 다음 단계도 이어갈 수 있어요",
      reassurance: "현재 첨삭은 성공적으로 완료되었습니다.",
      reason: "완성된 지원서를 바탕으로 최종 점검을 이어갈 수 있습니다. 제출 직전의 눈으로 다시 읽어 어색한 표현과 문단 흐름을 정리하는 단계입니다.",
      href: "/analysis/prepare",
    };
  }

  if (input.writingMode === "BUILD") {
    // Still thin after a fill means the material ran out, not that the mode
    // failed — polishing a short answer does not make it longer.
    if (input.shortQuestionCount > 0) return null;
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "완성본 이후의 다음 단계도 이어갈 수 있어요",
      reassurance: "현재 첨삭은 성공적으로 완료되었습니다.",
      reason: "완성된 지원서를 바탕으로 최종 점검을 이어갈 수 있습니다. 문항 하나씩이 아니라 지원서 전체를 놓고 말투가 고른지, 같은 이야기가 겹치지는 않는지 보는 단계입니다.",
      href: "/analysis/prepare",
    };
  }

  // POLISH from here down.

  // Polishing cannot lengthen an answer that ran out of material — it works
  // from the applicant's own words and is forbidden from importing an
  // experience the letter never mentioned. Staying silent here left someone
  // holding a short draft with no idea which stage fixes that.
  if (input.shortQuestionCount > 0) return fillSuggestion(input);

  if (input.product === "QUICK") {
    return {
      product: "PRO",
      writingMode: "POLISH",
      label: "완성본 이후의 다음 단계도 이어갈 수 있어요",
      reassurance: "현재 첨삭은 성공적으로 완료되었습니다.",
      // Named individually because these are what PRO actually adds. "면접
      // 준비" belongs to FINAL, which does not exist yet — listing it here
      // would sell something that cannot be delivered.
      reason: "완성된 지원서를 바탕으로 공고 적합도 분석, 누락 역량 점검, 면접 예상질문까지 이어갈 수 있습니다. 지금 글은 그대로 옮겨 담기니 다시 쓰지 않으셔도 됩니다.",
      // Needs a posting and a résumé that this run did not have, so it lands
      // on the screen that collects them rather than at confirmation.
      href: "/pro/polish",
    };
  }

  // A polished PRO result has had everything this product currently does. The
  // honest answer is to suggest nothing rather than invent a reason to sell.
  return null;
}

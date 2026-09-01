import type { ResultDocument } from "./result-document";

/**
 * 제출 전 마무리.
 *
 * FINAL은 같은 문제를 여러 관점에서 잡아냅니다 — 수치 하나가 어긋나면 탈락요인,
 * 이력서 대조, 면접관 시선에 각각 한 번씩 나타납니다. 읽는 사람에게는 그것이
 * 일곱 개의 숙제로 보이고, 다 읽고 나면 남는 질문이 "그래서 뭘 하지"입니다.
 *
 * 여기서는 분석을 다시 하지 않습니다. **이미 나온 결과를 손이 가는 순서로
 * 다시 세울 뿐입니다.** AI를 한 번도 더 부르지 않고, 첨삭본을 한 글자도 바꾸지
 * 않습니다.
 *
 * 네 갈래로 나눕니다. 갈래를 정하는 것은 "얼마나 심각한가"가 아니라
 * **"누가 할 수 있는 일인가"**입니다:
 *
 * - `DONE`            이미 첨삭본에 반영됨. 손님이 할 일이 없습니다.
 * - `NEEDS_APPLICANT` 손님만 답을 압니다. AI가 채우면 지어내는 것이 됩니다.
 * - `INTERVIEW`       서류를 고치는 것보다 면접에서 답하는 편이 낫습니다.
 * - `KEPT`            고를 수 있었고, 고른 대로 남긴 것입니다.
 */

export type WrapUpAction = "DONE" | "NEEDS_APPLICANT" | "INTERVIEW" | "KEPT";

export type WrapUpItem = {
  id: string;
  action: WrapUpAction;
  headline: string;
  /** 이 항목에 대해 지금 무엇을 하면 되는지. 문제 설명이 아니라 할 일입니다. */
  todo: string;
  /** 지원서에서 실제로 뽑은 문장. 없을 수 있습니다. */
  quote: string | null;
  severity: "high" | "medium" | "low";
  /** 어느 분석에서 나왔는지. 같은 문제가 여러 곳에서 잡히면 여럿입니다. */
  sources: string[];
};

export type FinalWrapUp = {
  items: WrapUpItem[];
  counts: Record<WrapUpAction, number>;
  /** 합쳐지기 전 원래 지적 수. "일곱 곳"이라고 말한 그 숫자입니다. */
  rawFindingCount: number;
};

const ACTION_ORDER: WrapUpAction[] = ["NEEDS_APPLICANT", "INTERVIEW", "DONE", "KEPT"];
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/**
 * 같은 문장을 가리키는 지적인지 봅니다.
 *
 * 공백과 문장부호를 걷어내고 비교합니다. 한쪽이 다른 쪽을 품고 있어도 같은
 * 것으로 봅니다 — 한 분석은 문장 전체를, 다른 분석은 그 안의 구절만 인용하는
 * 일이 잦기 때문입니다.
 *
 * 짧은 조각은 합치지 않습니다. 열 글자짜리 인용은 우연히 겹칠 수 있고, 그렇게
 * 합치면 서로 다른 문제가 한 줄로 뭉개집니다.
 */
const MIN_MERGE_LENGTH = 12;

function normalizeQuote(quote: string | null): string | null {
  if (!quote) return null;
  const compact = quote.replace(/[\s"'`“”‘’.,!?·…]/g, "");
  return compact.length > 0 ? compact : null;
}

function sameSubject(left: string | null, right: string | null): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < MIN_MERGE_LENGTH || right.length < MIN_MERGE_LENGTH) return false;
  return left.includes(right) || right.includes(left);
}

type Draft = WrapUpItem & { normalized: string | null };

function merge(drafts: Draft[]): WrapUpItem[] {
  const merged: Draft[] = [];
  for (const draft of drafts) {
    // 갈래가 다르면 합치지 않습니다. 같은 문장이라도 "이미 고쳤다"와 "면접에서
    // 답하라"는 손님이 할 일이 서로 다릅니다.
    const found = merged.find((item) => item.action === draft.action && sameSubject(item.normalized, draft.normalized));
    if (!found) {
      merged.push(draft);
      continue;
    }
    for (const source of draft.sources) {
      if (!found.sources.includes(source)) found.sources.push(source);
    }
    // 더 심각하게 본 쪽을 남깁니다. 낮춰 잡으면 손님이 넘기게 됩니다.
    if (SEVERITY_ORDER[draft.severity] < SEVERITY_ORDER[found.severity]) found.severity = draft.severity;
  }
  // `normalized`는 합치기 위해서만 들고 있던 값입니다. 화면으로 내보내지
  // 않습니다 — 안 쓰는 필드가 타입에 남으면 다음 사람이 뜻이 있는 줄 압니다.
  return merged.map((item) => ({
    id: item.id, action: item.action, headline: item.headline,
    todo: item.todo, quote: item.quote, severity: item.severity, sources: item.sources,
  }));
}

export function buildFinalWrapUp(result: ResultDocument): FinalWrapUp {
  const drafts: Draft[] = [];
  const add = (item: WrapUpItem) => drafts.push({ ...item, normalized: normalizeQuote(item.quote) });

  for (const risk of result.rejectionRisks) {
    const action: WrapUpAction =
      risk.handling === "needs_applicant" ? "NEEDS_APPLICANT"
      : risk.handling === "kept_by_choice" ? "KEPT"
      : "DONE";
    add({
      id: `risk-${risk.id}`,
      action,
      headline: risk.headline,
      todo: action === "DONE"
        // 이미 끝난 일에 "이렇게 하세요"를 붙이면 손님은 아직 할 일이 남은
        // 줄로 읽습니다.
        ? risk.handling === "removed" ? "첨삭본에서 이미 뺐습니다." : "첨삭본에서 이미 완화했습니다."
        : risk.fix,
      quote: risk.evidenceQuote,
      severity: risk.severity,
      sources: ["탈락요인"],
    });
  }

  for (const conflict of result.documentConflicts) {
    // 두 문서의 수치가 다를 때 어느 쪽이 맞는지는 손님만 압니다. 우리가 고르면
    // 그것은 첨삭이 아니라 지어내기입니다.
    add({
      id: `conflict-${conflict.id}`,
      action: "NEEDS_APPLICANT",
      headline: conflict.conflict,
      todo: conflict.resolution,
      quote: conflict.coverLetterQuote,
      severity: conflict.severity,
      sources: ["이력서 대조"],
    });
  }

  for (const claim of result.claimEvidence) {
    if (claim.verdict !== "unsupported") continue;
    add({
      id: `claim-${claim.id}`,
      action: "NEEDS_APPLICANT",
      headline: `근거가 확인되지 않은 주장: ${claim.claim}`,
      todo: claim.note,
      quote: claim.evidenceQuote,
      severity: "high",
      sources: ["주장·근거"],
    });
  }

  for (const flag of result.interviewerFlags) {
    add({
      id: `flag-${flag.id}`,
      action: "INTERVIEW",
      headline: flag.headline,
      todo: flag.preparation,
      quote: flag.evidenceQuote,
      severity: flag.likelihood,
      sources: ["면접관 시선"],
    });
  }

  const items = merge(drafts).sort((left, right) =>
    ACTION_ORDER.indexOf(left.action) - ACTION_ORDER.indexOf(right.action)
    || SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);

  return {
    items,
    counts: {
      NEEDS_APPLICANT: items.filter((item) => item.action === "NEEDS_APPLICANT").length,
      INTERVIEW: items.filter((item) => item.action === "INTERVIEW").length,
      DONE: items.filter((item) => item.action === "DONE").length,
      KEPT: items.filter((item) => item.action === "KEPT").length,
    },
    rawFindingCount: drafts.length,
  };
}

export const WRAP_UP_LABEL: Record<WrapUpAction, string> = {
  NEEDS_APPLICANT: "확인이 필요합니다",
  INTERVIEW: "면접에서 답하세요",
  DONE: "이미 반영했습니다",
  KEPT: "선택에 따라 유지",
};

export const WRAP_UP_NOTE: Record<WrapUpAction, string> = {
  NEEDS_APPLICANT: "저희가 답을 모르는 것들입니다. 잘못 채우면 지어낸 것이 되므로 그대로 두었습니다.",
  INTERVIEW: "서류에 문장을 더 넣기보다, 물어보면 답할 수 있게 준비해 두는 편이 낫습니다.",
  DONE: "첨삭본에 이미 들어가 있습니다. 지금 하실 일은 없습니다.",
  KEPT: "위험을 알고도 고르신 방향대로 남긴 것입니다. 문제가 남았다는 뜻이 아닙니다.",
};

/**
 * 맨 위 한 줄.
 *
 * "제출 권장"처럼 합불에 가까운 말은 쓰지 않습니다. 붙었는지 떨어졌는지는 우리가
 * 알 수 없고, 권했다가 떨어지면 그 문장이 책임을 집니다. 대신 **남은 일이
 * 있는지**만 사실대로 말합니다.
 */
export type WrapUpVerdict = { label: string; tone: "check" | "ready"; note: string };

/**
 * 제출해도 되는 상태인가.
 *
 * 여기서 말하는 것은 **서류의 상태**이지 결과가 아닙니다. 붙을지 떨어질지는
 * 우리가 알 수 없고, 그것을 점치는 순간 손님은 우리 말을 믿고 낸 뒤에 배신당한
 * 기분이 됩니다. 그래서 "합격 가능성"은 한 글자도 말하지 않습니다.
 *
 * 대신 말할 수 있는 것이 하나 있습니다 — **사실이 어긋난 채로 나가는지**.
 * 이력서와 자소서의 수치가 다르면 그건 확인 전에는 내면 안 되는 서류이고,
 * 그건 우리가 실제로 확인한 것이라 말해도 되는 범위입니다.
 */
export function describeWrapUpVerdict(wrapUp: FinalWrapUp): WrapUpVerdict {
  if (wrapUp.counts.NEEDS_APPLICANT > 0) {
    return {
      label: "확인 후 제출",
      tone: "check",
      note: "사실이 어긋난 곳이 남아 있습니다. 아래를 확인하고 나면 서류 쪽은 낼 수 있는 상태입니다.",
    };
  }
  if (wrapUp.counts.INTERVIEW > 0) {
    return {
      label: "서류는 제출 가능",
      tone: "ready",
      note: "서류에서 고칠 곳은 남지 않았습니다. 아래는 면접에서 답할 것들입니다.",
    };
  }
  return {
    label: "제출 가능",
    tone: "ready",
    note: "이번 분석에서 확인이 필요한 곳은 남지 않았습니다.",
  };
}

export function describeWrapUpStatus(wrapUp: FinalWrapUp): string {
  if (wrapUp.items.length === 0) return "따로 정리할 것이 남지 않았습니다.";
  if (wrapUp.counts.NEEDS_APPLICANT > 0) {
    return `제출 전에 확인하실 것이 ${wrapUp.counts.NEEDS_APPLICANT}가지 남았습니다.`;
  }
  if (wrapUp.counts.INTERVIEW > 0) {
    return "서류에서 고칠 것은 없습니다. 면접에서 답할 것만 남았습니다.";
  }
  return "지적된 곳은 모두 첨삭본에 반영했습니다.";
}

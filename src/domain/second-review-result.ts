import type { AdminAnalysisPreview } from "./admin-analysis-preview";
import type { ResultDocument } from "./result-document";

const same = (a: string, b: string) => a.normalize("NFC").replace(/\s+/g, " ").trim() === b.normalize("NFC").replace(/\s+/g, " ").trim();

type PreviewAnswer = AdminAnalysisPreview["revisedAnswers"][number];

/** 항목을 붙일 1차 문항 순번(0부터). 저장된 문항 번호가 없던 예전 미리보기는 항목 순서 = 문항 순서. */
function groupByQuestion(source: ResultDocument, preview: AdminAnalysisPreview) {
  const groups = source.questions.map(() => [] as PreviewAnswer[]);
  const tagged = preview.revisedAnswers.every(answer => answer.section?.sourceQuestionOrder);
  if (!tagged && preview.revisedAnswers.length !== source.questions.length) return null;
  for (const [index, answer] of preview.revisedAnswers.entries()) {
    const at = tagged ? source.questions.findIndex(q => q.order === answer.section!.sourceQuestionOrder) : index;
    if (at < 0 || !answer.section) return null;
    groups[at].push(answer);
  }
  return groups;
}

/**
 * 추가 첨삭 항목을 1차 문항 위에 다시 모을 수 있는가. 각 항목의 비교 원문이 그 문항 1차 첨삭본(또는 그 한 부분)이면
 * 추가 첨삭은 1차 결과를 그대로 두고 다른 시각의 문장·추천안만 더한 것으로 보여 준다.
 */
export function keepsFirstResult(source: ResultDocument, preview: AdminAnalysisPreview) {
  const groups = groupByQuestion(source, preview);
  return Boolean(groups) && groups!.every((items, index) => items.length > 0
    && items.every(item => items.length === 1 ? same(item.section!.originalAnswer, source.questions[index].revisedAnswer) : compact(source.questions[index].revisedAnswer).includes(compact(item.section!.originalAnswer))));
}
const compact = (text: string) => text.normalize("NFC").replace(/\s+/g, "");

/**
 * 1차 결과(좋은 표현·확인 필요·개선점·조언·면접)를 하나도 빼지 않고, 문항마다 추가 첨삭의
 * 다른 시각 문장·추천안·소제목을 붙인다. 1차 판단을 뒤집지 않는 것이 추가 첨삭의 약속이라 1차 표시를 그대로 쓴다.
 * 한 문항이 여러 작성 항목으로 나뉘었으면, 바뀐 항목만 1차 문장 안에서 그 부분을 바꿔 끼운다.
 */
export function buildExtraReviewResult(source: ResultDocument, preview: AdminAnalysisPreview): ResultDocument {
  const groups = groupByQuestion(source, preview)!;
  return {
    ...source,
    analyzedAt: preview.createdAt,
    questions: source.questions.map((question, index) => {
      const items = groups[index];
      const single = items.length === 1 ? items[0] : null;
      const revisedAnswer = single ? single.revisedAnswer : items.reduce((text, item) =>
        same(item.section!.originalAnswer, item.revisedAnswer) ? text : text.replace(item.section!.originalAnswer.trim(), item.revisedAnswer.trim()), question.revisedAnswer);
      const changed = !same(revisedAnswer, question.revisedAnswer);
      return {
        ...question,
        revisedAnswer,
        revisionReasons: changed ? items.filter(item => !same(item.section!.originalAnswer, item.revisedAnswer)).flatMap(item => item.section!.revisionReasons) : question.revisionReasons,
        recommendations: items.flatMap(item => item.section!.recommendations ?? []),
        // 1차 소제목이 있으면 그대로 두고, 없을 때만 추가 첨삭의 다른 시각 소제목을 보여 준다(문항 하나에 항목 하나일 때만).
        subheading: question.subheading ?? (single && !/^\s*\[/.test(single.revisedAnswer) ? single.section!.subheading : undefined),
      };
    }),
  };
}

/**
 * 예전(2026-10-22 이전) 항목별 2차 화면. 새 추가 첨삭은 모두 위 방식으로 보이며, 이 함수는 이미 발송된 옛 링크와
 * 관리자 기록 열람용으로만 남겨 둔다(그 링크들은 2026-10-27께 만료).
 */
/** Saved sections are independently reviewed items, not inferred official questions. */
export function buildSecondReviewResult(source: ResultDocument, preview: AdminAnalysisPreview): ResultDocument {
  const sectioned = preview.revisedAnswers.every(answer => answer.section);
  const maintained = preview.revisedAnswers.filter(answer => answer.section?.disposition === "maintained").length;
  const questions = sectioned
    ? preview.revisedAnswers.map(answer => ({
      id: `review-${preview.id}-${answer.questionOrder}`,
      order: answer.questionOrder,
      title: answer.section!.title,
      prompt: `${answer.section!.title} — 제공해 주신 내용을 바탕으로 정리한 작성 항목입니다. 제출 전 채용공고의 문항과 글자 제한을 확인해 주세요.`,
      // Legacy result schema requires a length. UI must not present it as a verified limit.
      targetLength: source.questions[0].targetLength,
      originalAnswer: answer.section!.originalAnswer,
      revisedAnswer: answer.revisedAnswer,
      originalAnnotations: [],
      highlightedPhrases: [],
      revisionReasons: answer.section!.revisionReasons,
      verificationNote: answer.section!.verificationNote,
      recommendations: answer.section!.recommendations,
    }))
    : source.questions.map(question => {
      const answer = preview.revisedAnswers.find(item => item.questionOrder === question.order);
      return answer ? {
        ...question, originalAnswer: question.revisedAnswer, revisedAnswer: answer.revisedAnswer,
        originalAnnotations: [], highlightedPhrases: [],
        // Internal operator notes are not customer-facing revision explanations.
        revisionReasons: ["기존 결과와 이번 첨삭본의 변경 내용을 비교해 주세요."],
        lengthNote: undefined,
      } : question;
    });
  return {
    ...source,
    analyzedAt: preview.createdAt,
    revisionQuality: undefined,
    questions,
    priorities: [{
      id: `review-${preview.id}`, title: "추가 첨삭 안내",
      description: "기존 결과와 이번 첨삭본을 비교하고, 제출 전 확인 사항을 살펴봐 주세요.",
      category: "clarity", severity: "medium",
    }],
    ...(sectioned ? {
      priorities: questions.filter(q => q.verificationNote).slice(0, 3).map(q => ({
        id: `review-check-${q.id}`, title: `${q.title}: 제출 전 확인`,
        description: q.verificationNote!, category: "verification" as const, severity: "medium" as const,
      })),
      verificationQuestions: [...new Set(questions.flatMap(q => q.verificationNote ? [q.verificationNote] : []))],
      // Old suggestions must not masquerade as findings on the revised text.
      consultingAdvice: [],
      coverageNotes: [
        `제공해 주신 ${questions.length}개 작성 항목을 검토했습니다.${maintained ? ` ${maintained}개 항목은 유지 근거를 확인해 원문을 유지했습니다.` : " 다른 시각에서 표현과 구성을 달리 제안했습니다."}`,
        "제출 전 채용공고의 실제 문항·글자 제한과 근무기간 등 확인 사항을 점검해 주세요.",
      ],
    } : {}),
    editSummary: sectioned
      ? [`${questions.map(q => q.title).join(" · ")} 항목을 각각 보존했습니다.`, "항목별 수정 이유에서 실제 변경 내용을 확인할 수 있습니다.", "확인되지 않은 사실 및 제출 조건은 각 항목의 확인 사항으로 남겼습니다."]
      : ["기존 결과와 이번 첨삭본의 변경 내용을 비교할 수 있습니다."],
  };
}

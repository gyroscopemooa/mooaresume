import type { AdminAnalysisPreview } from "./admin-analysis-preview";
import type { ResultDocument } from "./result-document";

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

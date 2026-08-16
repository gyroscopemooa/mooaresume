import type { ResumeAnalysisProvider, AnalysisRequest } from "./analysis-contract";
import type { ResultDocument } from "@/domain/result-document";
import { sampleResultDocument } from "@/fixtures/result-document";

export class MockAnalysisProvider implements ResumeAnalysisProvider {
  async analyze(request: AnalysisRequest): Promise<ResultDocument> {
    const coverLetter = request.documents.find((document) => document.kind === "cover_letter");
    if (!coverLetter) throw new Error("분석할 자기소개서가 필요합니다.");

    return {
      ...sampleResultDocument,
      caseId: request.requestId,
      product: request.product,
      isSample: true,
      readiness: {
        ...sampleResultDocument.readiness,
        label: "개발용 Mock 결과",
        summary: "실제 AI 호출 전 화면과 데이터 연결을 검증하기 위한 결과입니다.",
      },
      questions: sampleResultDocument.questions.map((question, index) =>
        index === 0 ? { ...question, originalAnswer: coverLetter.text } : question,
      ),
      requirementMatches: request.product === "PRO" ? sampleResultDocument.requirementMatches : [],
      interviewQuestions: request.product === "PRO" ? sampleResultDocument.interviewQuestions : [],
    };
  }
}

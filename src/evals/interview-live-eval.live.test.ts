import { describe, expect, it } from "vitest";
import { runInterviewTurn } from "@/server/ai/interview/interview-turn-gateway";
import { runInterviewReport } from "@/server/ai/interview/interview-report-gateway";
import { resolveModelConfig } from "@/server/ai/model-config";

/**
 * 실제 OpenAI 호출로 모의면접 턴+리포트가 끝까지 도는지 확인하는 live eval.
 *
 * quick-live-eval.live.test.ts와 같은 관례: RUN_LIVE_EVAL=1일 때만 돈다.
 * 코드가 컴파일되고 유닛 테스트가 통과하는 것과, 실제 모델이 이 프롬프트로
 * 이 스키마에 맞는 응답을 정말로 만들어 내는 것은 다른 질문이다 —
 * 2026-09-06 FINAL 환불 사고가 "고쳤지만 실결제로 재검증 안 함"으로 재발
 * 위험이 남았던 전례가 있어, 배포 전에 최소 한 번은 실제로 돌려본다.
 */
describe("모의면접 live eval", () => {
  it("실제 OpenAI 호출로 턴 평가와 최종 리포트가 끝까지 동작한다", async () => {
    if (process.env.RUN_LIVE_EVAL !== "1") {
      throw new Error("유료 live eval을 실행하려면 RUN_LIVE_EVAL=1을 설정해야 합니다.");
    }
    const apiKey = process.env.OPENAI_API_KEY;
    const baseModel = process.env.OPENAI_MODEL;
    if (!apiKey || !baseModel) throw new Error("OPENAI_API_KEY/OPENAI_MODEL이 필요합니다.");
    const { model, reasoningEffort } = resolveModelConfig("FINAL", baseModel);

    const turn1 = await runInterviewTurn({
      company: "현대자동차",
      role: "생산관리",
      interviewRisks: [{
        topic: "성과 수치",
        risk: "생산성 개선 수치의 근거가 불명확함",
        evidenceQuote: "생산 공정 개선으로 효율을 크게 높였습니다.",
      }],
      remainingSeedQuestions: ["팀 프로젝트에서 갈등을 어떻게 해결했나요?"],
      history: [],
      question: "생산 공정 개선에서 본인이 직접 수행한 역할은 무엇입니까?",
      answer: "저는 공정 데이터를 분석해 병목 구간을 찾아내고, 설비 배치를 다시 제안해 처리 시간을 줄였습니다.",
      isFinalTurn: false,
    }, { apiKey, model, reasoningEffort });

    console.info(JSON.stringify({ step: "turn1", output: turn1.output, usage: turn1.usage }));
    expect(turn1.output.evaluation.note.length).toBeGreaterThan(0);
    expect(turn1.output.nextQuestion.length).toBeGreaterThan(0);
    expect(typeof turn1.output.isReadyToFinish).toBe("boolean");

    const turn2 = await runInterviewTurn({
      company: "현대자동차",
      role: "생산관리",
      interviewRisks: [],
      remainingSeedQuestions: [],
      history: [{ question: "생산 공정 개선에서 본인이 직접 수행한 역할은 무엇입니까?", answer: "저는 공정 데이터를 분석해 병목 구간을 찾아내고, 설비 배치를 다시 제안해 처리 시간을 줄였습니다." }],
      question: turn1.output.nextQuestion,
      answer: "처리 시간을 약 12% 줄였고, 그 결과를 팀 회의에서 공유해 다른 라인에도 적용했습니다.",
      isFinalTurn: true,
    }, { apiKey, model, reasoningEffort });

    console.info(JSON.stringify({ step: "turn2", output: turn2.output, usage: turn2.usage }));
    expect(turn2.output.isReadyToFinish).toBe(true);

    const report = await runInterviewReport({
      company: "현대자동차",
      role: "생산관리",
      turns: [
        {
          questionId: "q1",
          question: "생산 공정 개선에서 본인이 직접 수행한 역할은 무엇입니까?",
          answer: "저는 공정 데이터를 분석해 병목 구간을 찾아내고, 설비 배치를 다시 제안해 처리 시간을 줄였습니다.",
          evaluation: turn1.output.evaluation,
        },
        {
          questionId: null,
          question: turn1.output.nextQuestion,
          answer: "처리 시간을 약 12% 줄였고, 그 결과를 팀 회의에서 공유해 다른 라인에도 적용했습니다.",
          evaluation: turn2.output.evaluation,
        },
      ],
    }, { apiKey, model, reasoningEffort });

    console.info(JSON.stringify({ step: "report", output: report.output, usage: report.usage }));
    expect(report.output.summary.length).toBeGreaterThan(0);
    expect(report.output.recommendedNextSteps.length).toBeGreaterThan(0);
  }, 120_000);
});

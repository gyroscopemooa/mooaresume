import { describe, expect, it } from "vitest";
import { sampleResultDocument } from "@/fixtures/result-document";
import { buildFinalWrapUp, describeWrapUpStatus, describeWrapUpVerdict } from "./final-wrap-up";
import type { ResultDocument } from "./result-document";

/**
 * 제출 전 마무리.
 *
 * 여기서 지켜야 할 것은 두 가지입니다. 같은 문장을 가리키는 지적이 여러 갈래로
 * 잡혔을 때 하나로 보일 것, 그리고 손님이 할 수 있는 일과 이미 끝난 일이 섞이지
 * 않을 것.
 */

const SK = "SK하이닉스를 준비하던 담당 학생 9명 중 7명이 합격한 경험";

function make(overrides: Partial<ResultDocument>): ResultDocument {
  return { ...sampleResultDocument, product: "FINAL", ...overrides } as ResultDocument;
}

const risk = (over: Partial<ResultDocument["rejectionRisks"][number]>) => ({
  id: "r1", headline: "합격 성과 수치 불일치", reason: "이력서와 다릅니다.",
  evidenceQuote: SK, severity: "high" as const, fix: "집계 기준을 통일하세요.",
  handling: "needs_applicant" as const, ...over,
});

describe("buildFinalWrapUp", () => {
  it("같은 문장을 가리키는 지적을 하나로 묶는다", () => {
    // 수치 하나가 어긋나면 탈락요인·이력서 대조·면접관 시선에 각각 잡힙니다.
    // 손님에게는 그것이 세 개의 숙제로 보이지만 할 일은 하나입니다.
    const wrapUp = buildFinalWrapUp(make({
      rejectionRisks: [risk({})],
      documentConflicts: [{
        id: "c1", field: "achievement", resumeStatement: "7명중 5명합격",
        coverLetterQuote: SK, conflict: "합격 인원이 다릅니다.",
        severity: "high", resolution: "집계 기준을 확인해 수치를 통일하세요.",
      }],
      claimEvidence: [], interviewerFlags: [],
    }));

    expect(wrapUp.items).toHaveLength(1);
    expect(wrapUp.rawFindingCount).toBe(2);
    expect(wrapUp.items[0].sources).toEqual(["탈락요인", "이력서 대조"]);
  });

  it("갈래가 다르면 같은 문장이라도 묶지 않는다", () => {
    // "이미 고쳤다"와 "면접에서 답하라"는 손님이 할 일이 서로 다릅니다.
    const wrapUp = buildFinalWrapUp(make({
      rejectionRisks: [risk({ handling: "removed" })],
      documentConflicts: [], claimEvidence: [],
      interviewerFlags: [{
        id: "f1", headline: "수치 불일치", observation: "다릅니다.",
        evidenceQuote: SK, resumeReference: null,
        likelyQuestion: "정확한 실적은?", followUps: [], preparation: "집계 기준을 준비하세요.",
        likelihood: "high",
      }],
    }));

    expect(wrapUp.items).toHaveLength(2);
    expect(wrapUp.counts.DONE).toBe(1);
    expect(wrapUp.counts.INTERVIEW).toBe(1);
  });

  it("이미 반영된 것에는 할 일을 적지 않는다", () => {
    // 끝난 일에 "이렇게 하세요"를 붙이면 아직 남은 줄로 읽힙니다.
    const wrapUp = buildFinalWrapUp(make({
      rejectionRisks: [risk({ handling: "removed", fix: "이 표현을 지우세요." })],
      documentConflicts: [], claimEvidence: [], interviewerFlags: [],
    }));

    expect(wrapUp.items[0].todo).toBe("첨삭본에서 이미 뺐습니다.");
    expect(wrapUp.items[0].todo).not.toContain("지우세요");
  });

  it("근거 없는 주장은 손님이 답할 것으로 둔다", () => {
    // 서비스가 실제로 있는지는 우리가 모릅니다. 채우면 지어내는 것이 됩니다.
    const wrapUp = buildFinalWrapUp(make({
      rejectionRisks: [], documentConflicts: [], interviewerFlags: [],
      claimEvidence: [
        { id: "e1", claim: "널리 사용된다", evidenceQuote: null, verdict: "unsupported", note: "링크를 준비하세요." },
        { id: "e2", claim: "상담을 수행했다", evidenceQuote: "직접 학과를 방문", verdict: "supported", note: "확인됨" },
      ],
    }));

    expect(wrapUp.counts.NEEDS_APPLICANT).toBe(1);
    expect(wrapUp.items[0].headline).toContain("널리 사용된다");
  });

  it("확인할 것을 맨 앞에 세운다", () => {
    const wrapUp = buildFinalWrapUp(make({
      rejectionRisks: [risk({ id: "a", handling: "removed", evidenceQuote: "지운 표현입니다 여기는 충분히 깁니다" })],
      documentConflicts: [], claimEvidence: [], interviewerFlags: [],
    }));
    const withBoth = buildFinalWrapUp(make({
      rejectionRisks: [
        risk({ id: "a", handling: "removed", evidenceQuote: "지운 표현입니다 여기는 충분히 깁니다" }),
        risk({ id: "b", handling: "needs_applicant", evidenceQuote: SK }),
      ],
      documentConflicts: [], claimEvidence: [], interviewerFlags: [],
    }));

    expect(wrapUp.items[0].action).toBe("DONE");
    expect(withBoth.items[0].action).toBe("NEEDS_APPLICANT");
  });

  it("짧은 인용은 우연히 겹쳐도 묶지 않는다", () => {
    const wrapUp = buildFinalWrapUp(make({
      rejectionRisks: [
        risk({ id: "a", evidenceQuote: "AI 활용" }),
        risk({ id: "b", evidenceQuote: "AI 활용 계획" }),
      ],
      documentConflicts: [], claimEvidence: [], interviewerFlags: [],
    }));

    expect(wrapUp.items).toHaveLength(2);
  });
});

describe("describeWrapUpStatus", () => {
  const status = (over: Partial<ResultDocument>) => describeWrapUpStatus(buildFinalWrapUp(make({
    rejectionRisks: [], documentConflicts: [], claimEvidence: [], interviewerFlags: [], ...over,
  })));

  it("합불에 가까운 말을 쓰지 않는다", () => {
    // 붙을지 떨어질지는 우리가 알 수 없습니다. 권했다가 떨어지면 그 한 줄이
    // 책임을 집니다.
    const lines = [
      status({}),
      status({ rejectionRisks: [risk({})] }),
      status({ rejectionRisks: [risk({ handling: "removed" })] }),
    ];
    for (const line of lines) {
      expect(line).not.toContain("권장");
      expect(line).not.toContain("합격");
      expect(line).not.toContain("불합격");
    }
  });

  it("확인할 것이 남았으면 몇 개인지 말한다", () => {
    expect(status({ rejectionRisks: [risk({})] })).toContain("1가지");
  });

  it("서류에서 고칠 것이 없으면 그렇게 말한다", () => {
    expect(status({
      interviewerFlags: [{
        id: "f1", headline: "전환 이유", observation: "확인할 수 있습니다.",
        evidenceQuote: "직업상담사 자격과 취업지원사업에 대한 관심", resumeReference: null,
        likelyQuestion: "왜 지원했습니까?", followUps: [], preparation: "이유를 정리하세요.",
        likelihood: "high",
      }],
    })).toContain("면접에서 답할 것만");
  });
});

describe("describeWrapUpVerdict", () => {
  const verdict = (over: Partial<ResultDocument>) => describeWrapUpVerdict(buildFinalWrapUp(make({
    rejectionRisks: [], documentConflicts: [], claimEvidence: [], interviewerFlags: [], ...over,
  })));

  it("사실이 어긋난 곳이 남으면 확인 후 제출이라고 말한다", () => {
    const result = verdict({ rejectionRisks: [risk({})] });
    expect(result.label).toBe("확인 후 제출");
    expect(result.tone).toBe("check");
  });

  it("면접 항목만 남으면 서류는 낼 수 있다고 말한다", () => {
    const result = verdict({
      interviewerFlags: [{
        id: "f1", headline: "전환 이유", observation: "확인할 수 있습니다.",
        evidenceQuote: "직업상담사 자격과 취업지원사업에 대한 관심", resumeReference: null,
        likelyQuestion: "왜 지원했습니까?", followUps: [], preparation: "이유를 정리하세요.",
        likelihood: "high",
      }],
    });
    expect(result.label).toBe("서류는 제출 가능");
    expect(result.tone).toBe("ready");
  });

  it("이미 반영된 것만 남으면 제출 가능이다", () => {
    expect(verdict({ rejectionRisks: [risk({ handling: "removed" })] }).label).toBe("제출 가능");
  });

  it("결과를 점치는 말은 쓰지 않는다", () => {
    // 서류의 상태는 우리가 확인한 것이라 말해도 되지만, 붙고 떨어짐은 아닙니다.
    // 점쳤다가 틀리면 손님은 우리 말을 믿고 낸 뒤에 배신당합니다.
    const lines = [
      verdict({}), verdict({ rejectionRisks: [risk({})] }),
      verdict({ rejectionRisks: [risk({ handling: "removed" })] }),
    ].flatMap((item) => [item.label, item.note]);
    for (const line of lines) {
      expect(line).not.toContain("합격");
      expect(line).not.toContain("불합격");
      expect(line).not.toContain("가능성");
    }
  });
});

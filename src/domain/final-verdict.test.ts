import { describe, expect, it } from "vitest";
import { computeFinalVerdict, countAnswerStructure } from "./final-verdict";

const empty = { documentConflicts: [], rejectionRisks: [], interviewerFlags: [], claimEvidence: [] };

const conflict = (severity: "high" | "medium" | "low") => ({
  id: "c1", field: "period" as const, resumeStatement: "5개월", coverLetterQuote: "장기간 주도했습니다",
  conflict: "기간이 어긋납니다", severity, resolution: "기간을 밝히세요",
});
const risk = (severity: "high" | "medium" | "low", handling: "removed" | "softened" | "kept_by_choice" | "needs_applicant") => ({
  id: "r1", headline: "지원동기가 어느 회사에나 맞습니다", reason: "기업 고유 근거 없음",
  evidenceQuote: "귀사의 성장에 기여하고 싶습니다", severity, fix: "공고 문구를 근거로 쓰세요", handling,
});
const flag = (likelihood: "high" | "medium" | "low") => ({
  id: "f1", headline: "재직기간과 서술이 어긋납니다", observation: "5개월", evidenceQuote: "장기간 주도",
  resumeReference: "2023.03~2023.08", likelyQuestion: "담당 범위는?", followUps: [], preparation: "구분해서 답하세요", likelihood,
});
const claim = (verdict: "supported" | "weak" | "unsupported") => ({
  id: "cl1", claim: "데이터 분석 능력이 있습니다", evidenceQuote: verdict === "unsupported" ? null : "엑셀로 집계했습니다",
  verdict, note: "근거 확인 필요",
});

describe("computeFinalVerdict", () => {
  it("아무것도 없으면 0곳이라고 분명히 말한다", () => {
    const verdict = computeFinalVerdict(empty);
    expect(verdict.count).toBe(0);
    expect(verdict.label).toContain("없습니다");
  });

  it("문구가 '모든 탈락 사유'를 안다고 주장하지 않는다", () => {
    // We know what this run found, not why an application actually gets rejected.
    const verdict = computeFinalVerdict({ ...empty, documentConflicts: [conflict("high")] });
    expect(verdict.label).toBe("FINAL에서 확인된 주요 서류 위험요소 1곳");
  });

  it("낮은 심각도는 세지 않는다", () => {
    expect(computeFinalVerdict({ ...empty, documentConflicts: [conflict("low")] }).count).toBe(0);
    expect(computeFinalVerdict({ ...empty, interviewerFlags: [flag("low")] }).count).toBe(0);
  });

  it("이미 없앤 위험은 세지 않는다", () => {
    expect(computeFinalVerdict({ ...empty, rejectionRisks: [risk("high", "removed")] }).count).toBe(0);
  });

  it("지원자가 알고 남긴 것은 세지 않는다", () => {
    // 소신 강조형으로 일부러 남긴 표현을 위험요소로 세면, 이미 내린 결정을
    // 계속 재촉하는 화면이 됩니다.
    expect(computeFinalVerdict({ ...empty, rejectionRisks: [risk("high", "kept_by_choice")] }).count).toBe(0);
    expect(computeFinalVerdict({ ...empty, rejectionRisks: [risk("high", "needs_applicant")] }).count).toBe(1);
  });

  it("근거가 아예 없는 주장만 센다", () => {
    expect(computeFinalVerdict({ ...empty, claimEvidence: [claim("unsupported")] }).count).toBe(1);
    expect(computeFinalVerdict({ ...empty, claimEvidence: [claim("weak")] }).count).toBe(0);
    expect(computeFinalVerdict({ ...empty, claimEvidence: [claim("supported")] }).count).toBe(0);
  });

  it("네 곳에서 모아 심각한 것부터 보여준다", () => {
    const verdict = computeFinalVerdict({
      documentConflicts: [conflict("medium")],
      rejectionRisks: [risk("high", "needs_applicant")],
      interviewerFlags: [flag("high")],
      claimEvidence: [claim("unsupported")],
    });
    expect(verdict.count).toBe(4);
    expect(verdict.items.map((item) => item.severity)).toEqual(["high", "high", "high", "medium"]);
    expect(new Set(verdict.items.map((item) => item.source))).toEqual(new Set(["conflict", "rejection", "interviewer", "claim"]));
  });

  it("점수를 만들지 않는다", () => {
    const verdict = computeFinalVerdict({ ...empty, documentConflicts: [conflict("high")] });
    expect(verdict.label).not.toMatch(/\d+\s*점|\/\s*100|%/);
  });
});

describe("countAnswerStructure", () => {
  const structure = {
    questionOrder: 1,
    situation: ["회사는 불량률이 높았습니다.", "공정이 다섯 단계였습니다."],
    action: ["제가 검사 기준을 다시 정리했습니다."],
    result: ["불량이 줄었습니다."],
    jobLink: [],
    reading: "상황 설명에 비해 본인 행동이 적습니다.",
  };

  it("모델이 아니라 코드가 센다", () => {
    const counted = countAnswerStructure(structure);
    expect(counted.situation.sentences).toBe(2);
    expect(counted.action.sentences).toBe(1);
    expect(counted.totalSentences).toBe(4);
    // Characters exclude whitespace, same as everywhere else in this product.
    expect(counted.situation.characters).toBe(structure.situation.join("").replace(/\s/g, "").length);
  });

  it("문장 수가 아니라 글자 수로 균형을 본다", () => {
    // One long background paragraph against one short "제가 했습니다" reads as
    // even by sentence count, which is exactly the imbalance being looked for.
    const lopsided = { ...structure, situation: ["가".repeat(200)], action: ["제가 했습니다."] };
    expect(countAnswerStructure(lopsided).actionThin).toBe(true);
    const even = { ...structure, situation: ["가".repeat(20)], action: ["나".repeat(40)] };
    expect(countAnswerStructure(even).actionThin).toBe(false);
  });

  it("본인 행동이 아예 없으면 균형을 논하지 않는다", () => {
    // Nothing to compare against; the missing action is reported elsewhere.
    expect(countAnswerStructure({ ...structure, action: [] }).actionThin).toBe(false);
  });

  it("모델의 판단은 그대로 옮긴다", () => {
    expect(countAnswerStructure(structure).reading).toBe(structure.reading);
  });
});

import { describe, expect, it } from "vitest";
import { buildResearchSnapshot } from "./research-capture";
import { sampleResultDocument } from "@/fixtures/result-document";
import type { ResultDocument } from "@/domain/result-document";

function snapshotOf(overrides: Partial<ResultDocument> = {}, options?: { knownNames?: string[] }) {
  return buildResearchSnapshot({ ...sampleResultDocument, ...overrides }, options);
}

const withAnswers = (original: string, revised: string): Partial<ResultDocument> => ({
  questions: [{
    ...sampleResultDocument.questions[0],
    originalAnswer: original,
    revisedAnswer: revised,
  }],
});

describe("연구용 사본", () => {
  it("원문과 첨삭본 양쪽에서 개인정보를 지운다", () => {
    const snapshot = snapshotOf(withAnswers("연락처는 010-1234-5678입니다.", "메일은 hong@naver.com입니다."));
    expect(snapshot.redactedOriginal).toBe("연락처는 [전화번호]입니다.");
    expect(snapshot.redactedRevised).toBe("메일은 [이메일]입니다.");
  });

  it("무엇을 몇 건 지웠는지 양쪽을 합쳐 센다", () => {
    // The number that matters is how much was in this application, not which
    // half of it the redactor found it in.
    const snapshot = snapshotOf(withAnswers("010-1111-2222", "010-3333-4444 / a@b.com"));
    expect(snapshot.redactionSummary).toEqual({ phone: 2, email: 1 });
  });

  it("알려준 이름을 지운다", () => {
    const snapshot = snapshotOf(withAnswers("저는 전민수입니다.", "전민수 드림"), { knownNames: ["전민수"] });
    expect(snapshot.redactedOriginal).not.toContain("전민수");
    expect(snapshot.redactedRevised).not.toContain("전민수");
  });

  it("기간과 성과 수치는 남긴다", () => {
    // Redacting these would leave a corpus that cannot answer anything.
    const line = "2023.03~2024.07 동안 불량률을 12% 낮췄습니다.";
    expect(snapshotOf(withAnswers(line, line)).redactedOriginal).toBe(line);
  });

  it("지원한 회사와 직무는 담는다 — 이것이 분석의 축이다", () => {
    // Where someone applied is not where they work. Thousands apply to the
    // same company, so it identifies nobody, and without it the corpus cannot
    // answer "이 회사는 무엇을 보나".
    const snapshot = snapshotOf();
    expect(snapshot.targetCompany).toBe(sampleResultDocument.company);
    expect(snapshot.targetRole).toBe(sampleResultDocument.role);
  });

  it("파일명과 caseId는 담지 않는다", () => {
    // A filename is very often 이름_회사_직무.pdf.
    const snapshot = snapshotOf();
    expect(Object.keys(snapshot)).not.toContain("filename");
    expect(Object.keys(snapshot)).not.toContain("caseId");
  });

  it("지적 내용은 그대로 담는다 — 배울 것이 여기 있다", () => {
    const snapshot = snapshotOf();
    expect(snapshot.findings.length).toBeGreaterThan(0);
    expect(snapshot.findings.every((finding) => typeof finding.note === "string" && finding.note.length > 0)).toBe(true);
    expect(snapshot.readinessScore).toBe(sampleResultDocument.readiness.score);
  });

  it("FINAL의 지적도 함께 모은다", () => {
    const snapshot = snapshotOf({
      rejectionRisks: [{ id: "r1", headline: "지원동기가 일반적입니다", reason: "이유", evidenceQuote: "인용", severity: "high", fix: "고치기", handling: "softened" }],
      claimEvidence: [{ id: "c1", claim: "문제해결 능력", evidenceQuote: null, verdict: "unsupported", note: "메모" }],
    });
    expect(snapshot.findings.map((finding) => finding.kind)).toEqual(expect.arrayContaining(["rejection", "claim"]));
  });
});

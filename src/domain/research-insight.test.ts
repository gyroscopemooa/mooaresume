import { describe, expect, it } from "vitest";
import {
  MIN_GROUP_SIZE,
  describeConfidence,
  documentPassRate,
  findingPatterns,
  groupBy,
  splitOutcomes,
  type CorpusEntry,
} from "./research-insight";

function entry(overrides: Partial<CorpusEntry> = {}): CorpusEntry {
  return {
    product: "PRO",
    targetCompany: "현대모비스",
    targetRole: "생산관리",
    readinessScore: 70,
    findings: [{ kind: "priority", note: "본인 기여가 드러나지 않습니다" }],
    outcomeStatus: null,
    ...overrides,
  };
}

const many = (count: number, overrides: Partial<CorpusEntry> = {}) =>
  Array.from({ length: count }, () => entry(overrides));

describe("결과 집계", () => {
  it("모르는 것을 실패로 세지 않는다", () => {
    // Folding "결과를 안 알려준 사람" into either side is the difference
    // between a number and a guess.
    const split = splitOutcomes([
      entry({ outcomeStatus: "DOCUMENT_PASS" }),
      entry({ outcomeStatus: "DOCUMENT_FAIL" }),
      entry({ outcomeStatus: null }),
      entry({ outcomeStatus: "SUBMITTED" }),
    ]);
    expect(split).toEqual({ passed: 1, failed: 1, unknown: 2 });
  });

  it("면접까지 간 것도 서류는 통과한 것이다", () => {
    expect(splitOutcomes([entry({ outcomeStatus: "FINAL_FAIL" })]).passed).toBe(1);
  });

  it("표본이 적으면 비율을 내지 않는다", () => {
    expect(documentPassRate({ passed: 2, failed: 1, unknown: 0 })).toBeNull();
    expect(documentPassRate({ passed: 3, failed: 2, unknown: 99 })).toBe(60);
  });
});

describe("반복되는 지적 찾기", () => {
  it("한 지원서에서 같은 지적이 여러 번 나와도 한 번으로 센다", () => {
    const repeated = entry({
      findings: [
        { kind: "priority", note: "본인 기여가 드러나지 않습니다" },
        { kind: "priority", note: "본인 기여가 드러나지 않습니다" },
      ],
    });
    expect(findingPatterns([repeated])[0].total).toBe(1);
  });

  it("합격·불합격 쪽 각각에서 몇 번 나왔는지 나눈다", () => {
    const patterns = findingPatterns([
      entry({ outcomeStatus: "DOCUMENT_PASS" }),
      entry({ outcomeStatus: "DOCUMENT_FAIL" }),
      entry({ outcomeStatus: "DOCUMENT_FAIL" }),
      entry({ outcomeStatus: null }),
    ]);
    expect(patterns[0]).toMatchObject({ total: 4, amongPassed: 1, amongFailed: 2 });
  });

  it("많이 나온 것부터 보여준다", () => {
    const patterns = findingPatterns([
      ...many(3),
      entry({ findings: [{ kind: "advice", note: "드문 지적" }] }),
    ]);
    expect(patterns[0].note).toBe("본인 기여가 드러나지 않습니다");
    expect(patterns[0].total).toBe(3);
  });
});

describe("회사·직무별 묶기", () => {
  it("표본이 바닥 미만인 묶음은 내보내지 않는다", () => {
    // Three applications to one company is three people, not a pattern about
    // that company — and a rule made from it reaches everyone.
    const result = groupBy(many(MIN_GROUP_SIZE - 1), "targetCompany");
    expect(result.groups).toHaveLength(0);
    expect(result.belowFloor).toBe(MIN_GROUP_SIZE - 1);
  });

  it("바닥을 넘으면 묶음으로 보여준다", () => {
    const result = groupBy(many(MIN_GROUP_SIZE, { outcomeStatus: "DOCUMENT_PASS" }), "targetCompany");
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ label: "현대모비스", count: MIN_GROUP_SIZE, passRate: 100 });
  });

  it("빠진 건수를 숨기지 않는다", () => {
    // "회사별 표에 2개뿐"은 그 자체로 알아야 할 사실입니다.
    const result = groupBy([...many(MIN_GROUP_SIZE), ...many(2, { targetCompany: "다른회사" }), entry({ targetCompany: null })], "targetCompany");
    expect(result.groups).toHaveLength(1);
    expect(result.belowFloor).toBe(2);
    expect(result.unlabelled).toBe(1);
  });

  it("직무로도 묶인다", () => {
    const result = groupBy(many(MIN_GROUP_SIZE, { targetRole: "품질관리" }), "targetRole");
    expect(result.groups[0].label).toBe("품질관리");
  });
});

describe("얼마나 믿을 수 있는지 함께 말한다", () => {
  it("결과가 하나도 없으면 경향으로 읽지 말라고 한다", () => {
    const [group] = groupBy(many(MIN_GROUP_SIZE), "targetCompany").groups;
    expect(describeConfidence(group)).toContain("경향으로 읽지 마세요");
  });

  it("결과가 있어도 자발적 응답임을 밝힌다", () => {
    const [group] = groupBy(many(MIN_GROUP_SIZE, { outcomeStatus: "DOCUMENT_PASS" }), "targetCompany").groups;
    expect(describeConfidence(group)).toContain("검증되지 않았습니다");
  });
});

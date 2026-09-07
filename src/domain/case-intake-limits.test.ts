import { describe, expect, it } from "vitest";
import {
  BASIC_CASE_PLAN,
  CASE_UPLOAD_HARD_LIMITS,
  describeCasePlanDecision,
  estimatePagesFromChars,
  fitsCasePlan,
  resolveCasePlan,
  type CaseVolume,
} from "./case-intake-limits";

const GB = 1024 * 1024 * 1024;

function volume(overrides: Partial<CaseVolume> = {}): CaseVolume {
  return { pages: 200, files: 40, unzippedBytes: 0.4 * GB, ...overrides };
}

describe("플랜 판정은 AND — 하나라도 넘으면 초과", () => {
  it("셋 다 만족하면 기본", () => {
    expect(resolveCasePlan(volume({ pages: 280, files: 70, unzippedBytes: 0.7 * GB })).plan?.tier).toBe("BASIC");
  });

  it("쪽수만 넘어도 기본을 벗어난다", () => {
    expect(resolveCasePlan(volume({ pages: 320, files: 50 })).plan?.tier).toBe("LARGE");
  });

  it("파일 수만 넘어도 기본을 벗어난다", () => {
    expect(resolveCasePlan(volume({ pages: 150, files: 110 })).plan?.tier).toBe("LARGE");
  });

  it("해제 후 용량만 넘어도 기본을 벗어난다", () => {
    expect(resolveCasePlan(volume({ pages: 200, files: 80, unzippedBytes: 1.2 * GB })).plan?.tier).toBe("LARGE");
  });

  it("가장 작은 플랜을 고른다 — 손님에게 비싼 값을 먼저 보이지 않는다", () => {
    expect(resolveCasePlan(volume({ pages: 10, files: 1, unzippedBytes: 1024 })).plan?.tier).toBe("BASIC");
  });
});

describe("가장 큰 플랜도 못 담을 때", () => {
  it("담을 수 없다고 말하고 무엇이 걸렸는지 돌려준다", () => {
    const decision = resolveCasePlan(volume({ pages: 4_000, files: 900, unzippedBytes: 9 * GB }));
    expect(decision.fits).toBe(false);
    expect(decision.plan).toBeNull();
    expect(decision.breaches.map((breach) => breach.kind).sort()).toEqual(["bytes", "files", "pages"]);
  });

  it("안내 문구에 쪽수와 이유가 함께 들어간다", () => {
    const over = volume({ pages: 4_000 });
    const text = describeCasePlanDecision(over, resolveCasePlan(over));
    expect(text).toContain("4,000페이지");
    expect(text).toContain("문의");
  });
});

describe("쪽수 어림", () => {
  it("1,400쪽 분량의 글자는 1,400쪽으로 센다", () => {
    expect(estimatePagesFromChars(1_400 * 1_500)).toBe(1_400);
  });

  it("한 글자도 한 쪽으로 센다 — 0쪽짜리 자료는 없다", () => {
    expect(estimatePagesFromChars(1)).toBe(1);
    expect(estimatePagesFromChars(0)).toBe(0);
  });
});

describe("압축 폭탄 방어", () => {
  it("압축파일 자체의 상한과 해제 깊이가 플랜과 별개로 정해져 있다", () => {
    expect(CASE_UPLOAD_HARD_LIMITS.zipUploadBytes).toBe(200 * 1024 * 1024);
    expect(CASE_UPLOAD_HARD_LIMITS.maxUnzipDepth).toBe(1);
  });

  it("작은 ZIP이라도 풀어서 큰 자료면 기본을 벗어난다 — 압축 크기로 판정하지 않는다", () => {
    // 18MB ZIP이 풀리니 2,800쪽이었던 사고가 이 검사입니다.
    expect(fitsCasePlan(volume({ pages: 2_800, files: 503 }), BASIC_CASE_PLAN)).toBe(false);
  });
});
